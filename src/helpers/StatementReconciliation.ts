import type { Transaction } from '../types/models';
import { statementDate, statementDay, type StatementRow } from './StatementParser';

export type RowDecision = 'auto' | 'create' | 'skip' | `link:${string}`;
export interface ReviewRow extends StatementRow {
  decision: RowDecision;
}
export interface ReconciledRow {
  row: ReviewRow;
  status: 'matched' | 'missing' | 'review' | 'skipped';
  candidates: Transaction[];
  match?: Transaction;
}

export function validStatementRow(row: StatementRow): boolean {
  return !!statementDate(row.date) && !!row.description.trim() &&
    row.description.length <= 500 && Number.isFinite(row.amount) && row.amount > 0 &&
    Number.isSafeInteger(Math.round(row.amount * 100)) &&
    Math.abs(row.amount * 100 - Math.round(row.amount * 100)) < 0.00001 &&
    (row.type === 'income' || row.type === 'expense');
}

export function reconcileStatement(
  rows: ReviewRow[],
  transactions: Transaction[],
  account: string,
): ReconciledRow[] {
  const actual = transactions.filter(t => t.account === account &&
    ['confirmed', 'unconfirmed'].includes((t.status || 'Confirmed').toLowerCase()));
  const candidates = rows.map(row => actual.filter(t => validStatementRow(row) &&
    t.type === row.type && Math.round(t.amount * 100) === Math.round(row.amount * 100) &&
    Math.abs(statementDay(t.date) - statementDay(row.date)) <= 3));
  const claimed = new Map<string, number>();
  rows.forEach(row => {
    if (row.decision.startsWith('link:')) {
      const id = row.decision.slice(5);
      claimed.set(id, (claimed.get(id) || 0) + 1);
    }
  });
  return rows.map((row, index) => {
    const base = { row, candidates: candidates[index] };
    if (row.decision === 'skip') return { ...base, status: 'skipped' };
    if (!account || !validStatementRow(row)) return { ...base, status: 'review' };
    if (row.decision.startsWith('link:')) {
      const match = candidates[index].find(t => t.transactionId === row.decision.slice(5));
      return match && claimed.get(match.transactionId) === 1
        ? { ...base, status: 'matched', match } : { ...base, status: 'review' };
    }
    if (row.decision === 'create') return { ...base, status: 'missing' };
    const available = candidates[index].filter(t => !claimed.has(t.transactionId));
    if (!available.length) return { ...base, status: 'missing' };
    const exact = available.filter(t => statementDay(t.date) === statementDay(row.date));
    // A candidate shared by two statement rows must never be consumed twice.
    const match = exact.length === 1 && !rows.some((other, otherIndex) =>
      otherIndex !== index && other.decision === 'auto' &&
      candidates[otherIndex].some(t => t.transactionId === exact[0].transactionId))
      ? exact[0] : undefined;
    return match ? { ...base, status: 'matched', match } : { ...base, status: 'review' };
  });
}

export function reconciliationSignature(rows: ReconciledRow[]): string {
  return JSON.stringify(rows.map(r => [r.row.id, r.status, r.match?.transactionId,
    r.candidates.map(t => [t.transactionId, t.date, t.amount, t.type, t.account, t.status]).sort()]));
}
