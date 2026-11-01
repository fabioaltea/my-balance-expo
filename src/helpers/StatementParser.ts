import type { Account } from '../types/models';

export interface StatementRow {
  id: string;
  date: string;
  description: string;
  amount: number;
  type?: 'income' | 'expense';
}

export interface StatementData {
  accountName?: string;
  transactions: StatementRow[];
  warnings: string[];
}

const dateSource = '\\d{1,2}[/.\\-]\\d{1,2}[/.\\-](?:\\d{4}|\\d{2})(?!\\d)';
const moneySource = '[+-]?\\s*(?:\\d{1,3}(?:[., ]\\d{3})+|\\d+)[.,]\\d{2}(?!\\d)';

export function statementDate(raw: string): string | undefined {
  const match = raw.trim().match(/^(\d{1,2})[/.\-](\d{1,2})[/.\-](\d{4}|\d{2})$/);
  if (!match) return undefined;
  const day = Number(match[1]);
  const month = Number(match[2]);
  const year = Number(match[3]) + (match[3].length === 2 ? 2000 : 0);
  const date = new Date(Date.UTC(year, month - 1, day));
  if (
    year < 1900 ||
    year > 2199 ||
    date.getUTCFullYear() !== year ||
    date.getUTCMonth() !== month - 1 ||
    date.getUTCDate() !== day
  ) return undefined;
  return `${String(day).padStart(2, '0')}-${String(month).padStart(2, '0')}-${year}`;
}

export function statementDay(date: string): number {
  const valid = statementDate(date);
  if (!valid) return NaN;
  const [d, m, y] = valid.split('-').map(Number);
  return Date.UTC(y, m - 1, d) / 86400000;
}

export function statementAmount(raw: string): number | undefined {
  const compact = raw.replace(/\s/g, '').replace(/^[+-]/, '');
  if (!/^(?:\d{1,3}(?:[.,]\d{3})+|\d+)[.,]\d{2}$/.test(compact)) return undefined;
  const value = Number(compact.slice(0, -3).replace(/[.,]/g, '') + '.' + compact.slice(-2));
  return value > 0 && Number.isSafeInteger(Math.round(value * 100)) ? value : undefined;
}

export function parseStatement(text: string): StatementData {
  const transactions: StatementRow[] = [];
  const warnings: string[] = [];
  const header: string[] = [];
  let current: StatementRow | undefined;
  let pending: { date: string; body: string; line: number } | undefined;
  const lines = text.replace(/\r/g, '').split('\n');
  for (let i = 0; i < lines.length; i++) {
    const line = lines[i].replace(/\u2212/g, '-').replace(/\s+/g, ' ').trim();
    if (!line) continue;
    const dateMatch = line.match(new RegExp(`^(${dateSource})\\s+`));
    if (/^(?:pagina|page|data operazione|data contabile|data valuta|saldo|totale|periodo|estratto conto)\b/i.test(line)) {
      current = undefined;
      continue;
    }
    if (dateMatch) {
      if (pending) warnings.push(`Riga ${pending.line}: importo non riconosciuto.`);
      current = undefined;
      const date = statementDate(dateMatch[1]);
      pending = undefined;
      if (!date) {
        warnings.push(`Riga ${i + 1}: data non valida.`);
        continue;
      }
      const body = line.slice(dateMatch[0].length).replace(new RegExp(`^${dateSource}\\s+`), '');
      if (/^(?:saldo|totale|balance)\b/i.test(body)) continue;
      pending = { date, body, line: i + 1 };
    } else if (pending) {
      pending.body += ` ${line}`;
    } else {
      if (current && !/\b(?:iban|conto|account|banca|bank|saldo|totale)\b/i.test(line)) {
        current.description = `${current.description} ${line}`.slice(0, 500);
      } else if (!transactions.length) {
        header.push(line);
      }
      continue;
    }
    if (!pending) continue;
    const amounts = [...pending.body.matchAll(new RegExp(moneySource, 'g'))];
    if (!amounts.length) continue;
    if (amounts.length !== 1 || /\b(?:USD|GBP|CHF)\b|[$£]/.test(pending.body)) {
      warnings.push(`Riga ${pending.line}: colonne importo multiple o valuta non supportata; verificare sul documento.`);
      pending = undefined;
      continue;
    }
    const token = amounts[0];
    const trailing = pending.body.slice((token.index ?? 0) + token[0].length).trim();
    const amount = statementAmount(token[0]);
    const description = pending.body.slice(0, token.index).replace(/[|€\s]+$/g, '').trim();
    if (!amount || !description || !/^(?:€|EUR)?\s*(?:D|A|DR|CR)?$/i.test(trailing)) {
      warnings.push(`Riga ${pending.line}: importo o descrizione da verificare.`);
      pending = undefined;
      continue;
    }
    const raw = token[0].trim();
    const type = raw.startsWith('-') || /\b(?:D|DR)\b/i.test(trailing) ? 'expense'
      : raw.startsWith('+') || /\b(?:A|CR)\b/i.test(trailing) ? 'income' : undefined;
    current = { id: String(pending.line), date: pending.date, description, amount, type };
    transactions.push(current);
    if (!type) warnings.push(`Riga ${pending.line}: scegliere entrata o uscita (segno assente).`);
    pending = undefined;
  }
  if (pending) warnings.push(`Riga ${pending.line}: importo non riconosciuto.`);
  if (!transactions.length) warnings.push('Nessun movimento leggibile: provare una foto nitida o correggere il documento.');
  return { accountName: header.join('\n'), transactions, warnings };
}

export function suggestStatementAccount(header: string | undefined, accounts: Account[]): string {
  const normalized = ` ${header?.toLocaleLowerCase().replace(/[^\p{L}\p{N}]+/gu, ' ') ?? ''} `;
  const matches = accounts.filter(({ name }) => {
    const token = name.trim().toLocaleLowerCase().replace(/[^\p{L}\p{N}]+/gu, ' ');
    return token.length >= 3 && normalized.includes(` ${token} `);
  });
  return matches.length === 1 ? matches[0].name : '';
}
