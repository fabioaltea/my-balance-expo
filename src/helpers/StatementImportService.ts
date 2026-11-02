import AsyncStorage from '@react-native-async-storage/async-storage';
import * as Crypto from 'expo-crypto';
import { HttpHelper } from './HttpHelper';
import { TransactionsApiHelper } from './TransactionsApiHelper';
import { statementDate } from './StatementParser';
import type { Transaction } from '../types/models';
import {
  reconcileStatement,
  reconciliationSignature,
  isStatementCandidateStatus,
  statementTransactionKey,
  statementDirectionConflict,
  type ReviewRow,
  type ReconciledRow,
  type StatementTransaction,
} from './StatementReconciliation';

interface JournalEntry {
  state: 'pending' | 'created' | 'linked';
  movementId: string;
  transactionId?: string;
  candidateKey?: string;
  directionConfirmed?: boolean;
}
const activeImports = new Set<string>();

async function digest(value: string): Promise<string> {
  return Crypto.digestStringAsync(Crypto.CryptoDigestAlgorithm.SHA256, value);
}

async function journalKeys(scope: string, account: string, rows: ReviewRow[]): Promise<string[]> {
  const occurrences = new Map<string, number>();
  return Promise.all(
    rows.map(async (row) => {
      const signature = JSON.stringify([
        scope,
        account,
        row.date,
        row.description.trim(),
        Math.round(row.amount * 100),
        row.type,
      ]);
      const occurrence = occurrences.get(signature) || 0;
      occurrences.set(signature, occurrence + 1);
      return `statement:v1:${await digest(`${signature}:${occurrence}`)}`;
    }),
  );
}

async function readEntry(key: string): Promise<JournalEntry | undefined> {
  const raw = await AsyncStorage.getItem(key);
  if (!raw) return undefined;
  const entry: unknown = JSON.parse(raw);
  if (
    !entry ||
    typeof entry !== 'object' ||
    !('state' in entry) ||
    !['pending', 'created', 'linked'].includes(String(entry.state)) ||
    !('movementId' in entry) ||
    typeof entry.movementId !== 'string' ||
    ('transactionId' in entry && typeof entry.transactionId !== 'string') ||
    ('candidateKey' in entry && typeof entry.candidateKey !== 'string') ||
    ('directionConfirmed' in entry && typeof entry.directionConfirmed !== 'boolean')
  ) {
    throw new Error('Diario importazione non leggibile: non procedere per evitare duplicati.');
  }
  return entry as JournalEntry;
}

function parseExistingAmount(raw: unknown): number | undefined {
  if (typeof raw === 'number') return Number.isFinite(raw) ? raw : undefined;
  if (typeof raw !== 'string') return undefined;
  let value = raw
    .trim()
    .replace(/[€\s]/g, '')
    .replace(/\u2212/g, '-');
  let sign = 1;
  if (value.startsWith('(') && value.endsWith(')')) {
    sign = -1;
    value = value.slice(1, -1);
  } else if (value.startsWith('-') || value.startsWith('+')) {
    sign = value.startsWith('-') ? -1 : 1;
    value = value.slice(1);
  } else if (value.endsWith('-')) {
    sign = -1;
    value = value.slice(0, -1);
  }
  let normalized: string;
  if (/^\d{1,3}(?:\.\d{3})+,\d+$/.test(value))
    normalized = value.replace(/\./g, '').replace(',', '.');
  else if (/^\d{1,3}(?:,\d{3})+\.\d+$/.test(value)) normalized = value.replace(/,/g, '');
  else if (/^\d{1,3}(?:\.\d{3})+$/.test(value)) normalized = value.replace(/\./g, '');
  else if (/^\d+(?:,\d+)?$/.test(value)) normalized = value.replace(',', '.');
  else if (/^\d+(?:\.\d+)?$/.test(value)) normalized = value;
  else return undefined;
  const amount = sign * Number(normalized);
  return Number.isFinite(amount) && Number.isSafeInteger(Math.round(Math.abs(amount) * 100))
    ? amount
    : undefined;
}

function transactionId(raw: Record<string, unknown>): string | undefined {
  const id =
    typeof raw.transactionId === 'string' && raw.transactionId.trim() ? raw.transactionId : raw.id;
  return typeof id === 'string' && id.trim() ? id : undefined;
}

function isExcludedStatus(status: unknown): boolean {
  return (
    typeof status === 'string' &&
    ['recurrent', 'deleted', 'dismissed', 'ignored'].includes(status.trim().toLowerCase())
  );
}

export async function fetchStatementTransactions(
  scope: string,
  account?: string,
): Promise<StatementTransaction[]> {
  const response = await HttpHelper.get(
    `/transactions?spreadsheet_id=${encodeURIComponent(scope)}`,
    { sensitive: true },
  );
  if (!response.success || !Array.isArray(response.data)) {
    throw new Error('Impossibile verificare le transazioni esistenti. Nessun movimento importato.');
  }
  // Preserve every API row; legacy sheets can reuse transactionId values.
  const idCounts = new Map<string, number>();
  for (const raw of response.data) {
    if (!raw || typeof raw !== 'object' || Array.isArray(raw) || isExcludedStatus(raw.status))
      continue;
    const id = transactionId(raw);
    if (id) idCounts.set(id, (idCounts.get(id) || 0) + 1);
  }
  const transactions: StatementTransaction[] = [];
  const occurrences = new Map<string, number>();
  for (let index = 0; index < response.data.length; index++) {
    const raw: unknown = response.data[index];
    const fail = (reason: string): never => {
      throw new Error(
        `Impossibile verificare la transazione ${index + 1} ricevuta: ${reason}. Nessun movimento importato.`,
      );
    };
    if (!raw || typeof raw !== 'object' || Array.isArray(raw)) fail('dati incompleti');
    const item = raw as Record<string, unknown>;
    if (isExcludedStatus(item.status)) continue;
    if (account && typeof item.account === 'string' && item.account !== account) continue;
    if (typeof item.account !== 'string') fail('conto non riconosciuto');
    if (item.status != null && typeof item.status !== 'string') fail('stato non riconosciuto');
    const status = typeof item.status === 'string' ? item.status.trim() : '';
    if (!isStatementCandidateStatus(status)) fail('stato non riconosciuto');
    const id = transactionId(item);
    if (!id || typeof item.movementId !== 'string') return fail('identificativo mancante');
    if (typeof item.date !== 'string') return fail('data non riconosciuta');
    const rawDate = item.date;
    const iso = rawDate.match(/^(\d{4})-(\d{2})-(\d{2})$/);
    const date = statementDate(iso ? `${iso[3]}-${iso[2]}-${iso[1]}` : rawDate);
    if (!date) return fail('data non riconosciuta');
    const amount = parseExistingAmount(item.amount);
    if (amount === undefined) return fail('formato dell’importo non riconosciuto');
    const rawType = typeof item.type === 'string' ? item.type.trim().toLowerCase() : item.type;
    const direction = ['in', 'income', 'entrata', 'deposit'].includes(String(rawType))
      ? 'income'
      : ['out', 'expense', 'uscita', 'withdraw'].includes(String(rawType))
        ? 'expense'
        : undefined;
    const explicitPlus =
      typeof item.amount === 'string' && item.amount.replace(/[€\s]/g, '').startsWith('+');
    const signedDirection = amount < 0 ? 'expense' : explicitPlus ? 'income' : undefined;
    const transaction: StatementTransaction = TransactionsApiHelper.rawToTransactionData({
      ...item,
      transactionId: id,
      amount: '0',
    });
    transaction.date = date;
    transaction.amount = Math.abs(amount);
    transaction.type = signedDirection || direction || (amount < 0 ? 'expense' : 'income');
    if (
      (signedDirection && direction && signedDirection !== direction) ||
      (rawType && !direction)
    ) {
      transaction.directionConflict = true;
    }
    transaction.status = status || 'Confirmed';
    if ((idCounts.get(id) || 0) > 1) {
      const signature = JSON.stringify([
        scope,
        transaction.movementId,
        id,
        transaction.account,
        transaction.date,
        transaction.amount,
        transaction.type,
        transaction.description,
      ]);
      const occurrence = occurrences.get(signature) || 0;
      occurrences.set(signature, occurrence + 1);
      transaction.reconciliationKey = `duplicate:${await digest(signature)}:${occurrence}`;
    }
    transactions.push(transaction);
  }
  return transactions;
}

export async function restoreStatementLinks(
  scope: string,
  account: string,
  rows: ReviewRow[],
  transactions: Transaction[],
): Promise<ReviewRow[]> {
  const keys = await journalKeys(scope, account, rows);
  return Promise.all(
    rows.map(async (row, index) => {
      if (row.decision !== 'auto') return row;
      const entry = await readEntry(keys[index]);
      const matches = entry
        ? transactions.filter(
            (t) =>
              t.movementId === entry.movementId &&
              (!entry.transactionId || t.transactionId === entry.transactionId),
          )
        : [];
      const match =
        (entry?.candidateKey &&
          matches.find((t) => statementTransactionKey(t) === entry.candidateKey)) ||
        (matches.length === 1 ? matches[0] : undefined);
      if (!match || (statementDirectionConflict(match) && !entry?.directionConfirmed)) return row;
      return { ...row, decision: `link:${statementTransactionKey(match)}` as const };
    }),
  );
}

export async function saveStatementImport(
  scope: string,
  account: string,
  reviewed: ReconciledRow[],
  progress: (saved: number, linked: number) => void,
  signal?: AbortSignal,
): Promise<{ saved: number; linked: number }> {
  if (activeImports.has(scope)) throw new Error('Importazione gia in corso.');
  if (!scope || !account || !reviewed.length || reviewed.some((r) => r.status === 'review')) {
    throw new Error('Completare conto e revisione prima di salvare.');
  }
  activeImports.add(scope);
  try {
    signal?.throwIfAborted();
    const fresh = await fetchStatementTransactions(scope, account);
    signal?.throwIfAborted();
    const rows = reviewed.map((r) => r.row);
    const checked = reconcileStatement(rows, fresh, account);
    if (reconciliationSignature(checked) !== reconciliationSignature(reviewed)) {
      throw new Error(
        'Le transazioni sono cambiate. Aggiornare la riconciliazione prima di confermare.',
      );
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
        await AsyncStorage.setItem(
          keys[index],
          JSON.stringify({
            state: 'linked',
            movementId: result.match.movementId,
            transactionId: result.match.transactionId,
            candidateKey: statementTransactionKey(result.match),
            directionConfirmed: statementDirectionConflict(result.match),
          } satisfies JournalEntry),
        );
        linked++;
      } else {
        // Persist the ID before the POST. A lost response is never automatically retried.
        if (previous) {
          const exists = fresh.some(
            (t) => t.movementId === previous.movementId && isStatementCandidateStatus(t.status),
          );
          if (exists) throw new Error('Movimento gia salvato: aggiornare la riconciliazione.');
          throw new Error(
            'Esito precedente da verificare nei movimenti. Questa riga non viene reinviata: escluderla per proseguire con le altre.',
          );
        }
        const movementId = Crypto.randomUUID();
        await AsyncStorage.setItem(
          keys[index],
          JSON.stringify({ state: 'pending', movementId } satisfies JournalEntry),
        );
        signal?.throwIfAborted();
        const row = result.row;
        const response = await HttpHelper.post(
          `/transactions?spreadsheet_id=${encodeURIComponent(scope)}`,
          {
            movementId,
            description: row.description.trim(),
            date: row.date,
            category: '',
            status: 'Confirmed',
            transactions: [
              {
                amount: `${row.type === 'expense' ? '-' : ''}${row.amount.toFixed(2).replace('.', ',')}`,
                account,
                type: row.type === 'income' ? 'in' : 'out',
              },
            ],
          },
          { sensitive: true },
        );
        if (!response.success || !response.data || response.data.movementId !== movementId) {
          throw new Error(
            'Salvataggio non confermato. Aggiornare e verificare i movimenti prima di riprovare.',
          );
        }
        await AsyncStorage.setItem(
          keys[index],
          JSON.stringify({ state: 'created', movementId } satisfies JournalEntry),
        );
        saved++;
      }
      progress(saved, linked);
    }
    return { saved, linked };
  } finally {
    activeImports.delete(scope);
  }
}
