import AsyncStorage from '@react-native-async-storage/async-storage';
import * as Crypto from 'expo-crypto';
import { HttpHelper } from './HttpHelper';
import { TransactionsApiHelper } from './TransactionsApiHelper';
import type { Transaction } from '../types/models';
import {
  reconcileStatement, reconciliationSignature, type ReviewRow, type ReconciledRow,
} from './StatementReconciliation';

interface JournalEntry {
  state: 'pending' | 'created' | 'linked';
  movementId: string;
  transactionId?: string;
}
const activeImports = new Set<string>();

async function digest(value: string): Promise<string> {
  return Crypto.digestStringAsync(Crypto.CryptoDigestAlgorithm.SHA256, value);
}

async function journalKeys(scope: string, account: string, rows: ReviewRow[]): Promise<string[]> {
  const occurrences = new Map<string, number>();
  return Promise.all(rows.map(async row => {
    const signature = JSON.stringify([scope, account, row.date, row.description.trim(),
      Math.round(row.amount * 100), row.type]);
    const occurrence = occurrences.get(signature) || 0;
    occurrences.set(signature, occurrence + 1);
    return `statement:v1:${await digest(`${signature}:${occurrence}`)}`;
  }));
}

async function readEntry(key: string): Promise<JournalEntry | undefined> {
  const raw = await AsyncStorage.getItem(key);
  if (!raw) return undefined;
  const entry: unknown = JSON.parse(raw);
  if (!entry || typeof entry !== 'object' ||
    !('state' in entry) || !['pending', 'created', 'linked'].includes(String(entry.state)) ||
    !('movementId' in entry) || typeof entry.movementId !== 'string' ||
    ('transactionId' in entry && typeof entry.transactionId !== 'string')) {
    throw new Error('Diario importazione non leggibile: non procedere per evitare duplicati.');
  }
  return entry as JournalEntry;
}

export async function fetchStatementTransactions(scope: string): Promise<Transaction[]> {
  const response = await HttpHelper.get(`/transactions?spreadsheet_id=${encodeURIComponent(scope)}`);
  if (!response.success || !Array.isArray(response.data)) {
    throw new Error('Impossibile verificare le transazioni esistenti. Nessun movimento importato.');
  }
  const ids = new Set<string>();
  return response.data.map((raw: unknown) => {
    if (!raw || typeof raw !== 'object' || !('movementId' in raw) ||
      typeof raw.movementId !== 'string' ||
      !(('transactionId' in raw && typeof raw.transactionId === 'string') ||
        ('id' in raw && typeof raw.id === 'string'))) {
      throw new Error('Elenco transazioni incompleto: riconciliazione interrotta.');
    }
    const transaction = TransactionsApiHelper.rawToTransactionData(raw);
    if (!transaction.transactionId || ids.has(transaction.transactionId) ||
      !Number.isFinite(transaction.amount)) {
      throw new Error('Elenco transazioni non valido: riconciliazione interrotta.');
    }
    ids.add(transaction.transactionId);
    return transaction;
  });
}

export async function restoreStatementLinks(
  scope: string, account: string, rows: ReviewRow[], transactions: Transaction[],
): Promise<ReviewRow[]> {
  const keys = await journalKeys(scope, account, rows);
  return Promise.all(rows.map(async (row, index) => {
    if (row.decision !== 'auto') return row;
    const entry = await readEntry(keys[index]);
    const match = entry && transactions.find(t => t.movementId === entry.movementId &&
      (!entry.transactionId || t.transactionId === entry.transactionId));
    return match ? { ...row, decision: `link:${match.transactionId}` as const } : row;
  }));
}

export async function saveStatementImport(
  scope: string,
  account: string,
  reviewed: ReconciledRow[],
  progress: (saved: number, linked: number) => void,
  signal?: AbortSignal,
): Promise<{ saved: number; linked: number }> {
  if (activeImports.has(scope)) throw new Error('Importazione gia in corso.');
  if (!scope || !account || !reviewed.length || reviewed.some(r => r.status === 'review')) {
    throw new Error('Completare conto e revisione prima di salvare.');
  }
  activeImports.add(scope);
  try {
    signal?.throwIfAborted();
    const fresh = await fetchStatementTransactions(scope);
    signal?.throwIfAborted();
    const rows = reviewed.map(r => r.row);
    const checked = reconcileStatement(rows, fresh, account);
    if (reconciliationSignature(checked) !== reconciliationSignature(reviewed)) {
      throw new Error('Le transazioni sono cambiate. Aggiornare la riconciliazione prima di confermare.');
    }
    const keys = await journalKeys(scope, account, rows);
    let saved = 0;
    let linked = 0;
    for (let index = 0; index < checked.length; index++) {
      signal?.throwIfAborted();
      const result = checked[index];
      if (result.status === 'skipped') continue;
      const previous = await readEntry(keys[index]);
      if (result.status === 'matched' && result.match) {
        await AsyncStorage.setItem(keys[index], JSON.stringify({
          state: 'linked', movementId: result.match.movementId,
          transactionId: result.match.transactionId,
        } satisfies JournalEntry));
        linked++;
      } else {
        // Persist the ID before the POST. A lost response is never automatically retried.
        if (previous) {
          const exists = fresh.some(t => t.movementId === previous.movementId &&
            ['confirmed', 'unconfirmed'].includes((t.status || 'Confirmed').toLowerCase()));
          if (exists) throw new Error('Movimento gia salvato: aggiornare la riconciliazione.');
          throw new Error('Esito precedente da verificare nei movimenti. Questa riga non viene reinviata: escluderla per proseguire con le altre.');
        }
        const movementId = Crypto.randomUUID();
        await AsyncStorage.setItem(keys[index], JSON.stringify({ state: 'pending', movementId } satisfies JournalEntry));
        signal?.throwIfAborted();
        const row = result.row;
        const response = await HttpHelper.post(
          `/transactions?spreadsheet_id=${encodeURIComponent(scope)}`,
          {
            movementId, description: row.description.trim(), date: row.date,
            category: '', status: 'Confirmed',
            transactions: [{
              amount: `${row.type === 'expense' ? '-' : ''}${row.amount.toFixed(2).replace('.', ',')}`,
              account, type: row.type === 'income' ? 'in' : 'out',
            }],
          },
          { sensitive: true },
        );
        if (!response.success || response.data == null) {
          throw new Error('Salvataggio non confermato. Aggiornare e verificare i movimenti prima di riprovare.');
        }
        await AsyncStorage.setItem(keys[index], JSON.stringify({ state: 'created', movementId } satisfies JournalEntry));
        saved++;
      }
      progress(saved, linked);
    }
    return { saved, linked };
  } finally {
    activeImports.delete(scope);
  }
}
