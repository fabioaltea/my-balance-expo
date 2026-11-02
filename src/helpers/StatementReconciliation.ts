import type { Transaction } from '../types/models';
import { statementDate, statementDay, type StatementRow } from './StatementParser';

export type RowDecision = 'auto' | 'create' | 'skip' | `link:${string}`;
export interface ReviewRow extends StatementRow {
  decision: RowDecision;
}
export interface StatementTransaction extends Transaction {
  /** Local identity for distinct API rows that share a legacy transactionId. */
  reconciliationKey?: string;
  directionConflict?: boolean;
}

export function statementTransactionKey(transaction: StatementTransaction): string {
  return transaction.reconciliationKey || transaction.transactionId;
}

export function statementDirectionConflict(transaction: StatementTransaction): boolean {
  return transaction.directionConflict === true;
}
export interface ReconciledRow {
  row: ReviewRow;
  status: 'matched' | 'missing' | 'review' | 'skipped';
  candidates: Transaction[];
  match?: Transaction;
}

export function isStatementCandidateStatus(status?: string): boolean {
  return ['confirmed', 'unconfirmed', 'active'].includes(
    (status || 'confirmed').trim().toLowerCase(),
  );
}

export function validStatementRow(row: StatementRow): boolean {
  return (
    !!statementDate(row.date) &&
    !!row.description.trim() &&
    row.description.length <= 500 &&
    Number.isFinite(row.amount) &&
    row.amount > 0 &&
    Number.isSafeInteger(Math.round(row.amount * 100)) &&
    Math.abs(row.amount * 100 - Math.round(row.amount * 100)) < 0.00001 &&
    (row.type === 'income' || row.type === 'expense')
  );
}

export function reconcileStatement(
  rows: ReviewRow[],
  transactions: Transaction[],
  account: string,
): ReconciledRow[] {
  const actual = transactions.filter(
    (t) => t.account === account && isStatementCandidateStatus(t.status),
  );
  const candidates = rows.map((row) =>
    actual.filter(
      (t) =>
        validStatementRow(row) &&
        (t.type === row.type || statementDirectionConflict(t)) &&
        Math.round(t.amount * 100) === Math.round(row.amount * 100) &&
        Math.abs(statementDay(t.date) - statementDay(row.date)) <= 3,
    ),
  );
  const claimed = new Map<string, number>();
  rows.forEach((row) => {
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
      const matching = candidates[index].filter(
        (t) => statementTransactionKey(t) === row.decision.slice(5),
      );
      const match = matching.length === 1 ? matching[0] : undefined;
      return match && claimed.get(statementTransactionKey(match)) === 1
        ? { ...base, status: 'matched', match }
        : { ...base, status: 'review' };
    }
    if (row.decision === 'create') return { ...base, status: 'missing' };
    // Auto matching ignores manual links: confirming one row must never change another row's outcome.
    const options = candidates[index];
    if (!options.length) return { ...base, status: 'missing' };
    // The booking date may trail the entered date by a few days: pick the closest candidate.
    const distance = (t: Transaction, r: StatementRow) =>
      Math.abs(statementDay(t.date) - statementDay(r.date));
    const best = Math.min(...options.map((t) => distance(t, row)));
    const closest = options.filter((t) => distance(t, row) === best);
    // A candidate wanted by another statement row at an equal or shorter distance is ambiguous.
    const match =
      closest.length === 1 &&
      !claimed.has(statementTransactionKey(closest[0])) &&
      !statementDirectionConflict(closest[0]) &&
      !rows.some(
        (other, otherIndex) =>
          otherIndex !== index &&
          other.decision === 'auto' &&
          candidates[otherIndex].some(
            (t) =>
              statementTransactionKey(t) === statementTransactionKey(closest[0]) &&
              distance(t, other) <= best,
          ),
      )
        ? closest[0]
        : undefined;
    return match ? { ...base, status: 'matched', match } : { ...base, status: 'review' };
  });
}

export function reconciliationSignature(rows: ReconciledRow[]): string {
  return JSON.stringify(
    rows.map((r) => [
      r.row.id,
      r.status,
      r.match && statementTransactionKey(r.match),
      r.candidates
        .map((t) => [
          statementTransactionKey(t),
          t.movementId,
          t.transactionId,
          t.date,
          t.amount,
          t.type,
          t.account,
          t.status,
          statementDirectionConflict(t),
        ])
        .sort(),
    ]),
  );
}
