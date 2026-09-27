import { MovementDataHelper } from '@/src/helpers/MovementDataHelper';
import type { Movement, IDateRange } from '@/src/state';
import { parseDateFromDDMMYYYY } from '@/src/utils/dateUtils';

export type CashFlowPoint = { income: number; expense: number };

export type CashFlowSeries = {
  points: CashFlowPoint[];
  income: number;
  expense: number;
};

const dayKey = (date: Date) => `${date.getFullYear()}-${date.getMonth() + 1}-${date.getDate()}`;

/** Cumulative daily totals, using the same rules as the Cash flow figures. */
export function buildCashFlowSeries(
  movements: Movement[],
  range: IDateRange,
  accountFilter: string,
  today = new Date(),
): CashFlowSeries {
  const start = parseDateFromDDMMYYYY(range.startDate);
  const end = parseDateFromDDMMYYYY(range.endDate);
  if (!start || !end) return { points: [{ income: 0, expense: 0 }], income: 0, expense: 0 };

  const currentDay = new Date(today.getFullYear(), today.getMonth(), today.getDate());
  const lastDay = end < currentDay ? end : currentDay;
  if (start > lastDay) return { points: [{ income: 0, expense: 0 }], income: 0, expense: 0 };

  const movementsByDay = new Map<string, Movement[]>();
  for (const movement of movements) {
    const date = parseDateFromDDMMYYYY(movement.date);
    if (!date || date < start || date > lastDay) continue;
    const key = dayKey(date);
    const bucket = movementsByDay.get(key) ?? [];
    bucket.push(movement);
    movementsByDay.set(key, bucket);
  }

  let income = 0;
  let expense = 0;
  const points: CashFlowPoint[] = [{ income: 0, expense: 0 }];
  for (const date = new Date(start); date <= lastDay; date.setDate(date.getDate() + 1)) {
    const bucket = movementsByDay.get(dayKey(date)) ?? [];
    income += MovementDataHelper.getTotalIncome(bucket, accountFilter);
    expense += MovementDataHelper.getTotalExpense(bucket, accountFilter);
    points.push({ income, expense });
  }

  return { points, income, expense };
}
