import type { ChartPeriod, ChartSeries } from './time-series-chart';
import type { MonthlyData, IncomeExpenseData, PeriodBreakdownData } from '@/src/types/charts';

const MONTH_LABELS = [
  'Jan',
  'Feb',
  'Mar',
  'Apr',
  'May',
  'Jun',
  'Jul',
  'Aug',
  'Sep',
  'Oct',
  'Nov',
  'Dec',
];

type PeriodDatum = { year: number; monthIndex: number; date: Date; partial?: boolean };

export const periodKey = (datum: PeriodDatum, viewMode: 'months' | 'years') =>
  viewMode === 'years'
    ? String(datum.year)
    : `${datum.year}-${String(datum.monthIndex + 1).padStart(2, '0')}`;

export const chartPeriods = (data: PeriodDatum[], viewMode: 'months' | 'years'): ChartPeriod[] => {
  const now = new Date();
  return data.map((datum) => {
    const isYear = viewMode === 'years';
    const partial = isYear
      ? datum.partial || datum.date.getMonth() !== 11 || datum.year === now.getFullYear()
      : datum.year === now.getFullYear() && datum.monthIndex === now.getMonth();
    return {
      key: periodKey(datum, viewMode),
      label: isYear ? String(datum.year) : MONTH_LABELS[datum.monthIndex],
      detail: isYear ? String(datum.year) : `${MONTH_LABELS[datum.monthIndex]} ${datum.year}`,
      partial,
    };
  });
};

export const balanceSeries = (data: MonthlyData[]): ChartSeries[] => [
  {
    id: 'balance',
    name: 'Balance',
    color: '#28765B',
    values: data.map((datum) => datum.totalBalance),
  },
];

export const incomeExpenseSeries = (data: IncomeExpenseData[]): ChartSeries[] => [
  { id: 'income', name: 'Income', color: '#298965', values: data.map((datum) => datum.income) },
  {
    id: 'expenses',
    name: 'Expenses',
    color: '#D07862',
    values: data.map((datum) => datum.expenses),
  },
];

const CATEGORY_PALETTE = [
  '#32866A',
  '#D79766',
  '#627EAA',
  '#AA729C',
  '#7D9361',
  '#7F76A8',
  '#B47A6F',
];

const stableColor = (key: string) => {
  let hash = 0;
  for (const char of key) hash = (hash * 31 + char.charCodeAt(0)) >>> 0;
  return CATEGORY_PALETTE[hash % CATEGORY_PALETTE.length];
};

export const breakdownSeries = (
  data: PeriodBreakdownData[],
  groupBy: 'category' | 'account' = 'category',
): ChartSeries[] => {
  const totals = new Map<string, { name: string; amount: number }>();
  data.forEach((period) =>
    period.items.forEach((item) => {
      const current = totals.get(item.id);
      totals.set(item.id, { name: item.name, amount: (current?.amount ?? 0) + item.amount });
    }),
  );
  const top = [...totals.entries()].sort((a, b) => b[1].amount - a[1].amount).slice(0, 4);
  const ids = new Set(top.map(([id]) => id));
  const result = top.map(([id, details]) => ({
    id,
    name: details.name,
    color:
      groupBy === 'account'
        ? (data.flatMap((period) => period.items).find((item) => item.id === id)?.color ??
          stableColor(id))
        : stableColor(id),
    values: data.map((period) => period.items.find((item) => item.id === id)?.amount ?? 0),
  }));
  if (totals.size > top.length) {
    result.push({
      id: '__other__',
      name: 'Other',
      color: '#8C9A92',
      values: data.map((period) =>
        period.items.reduce((sum, item) => sum + (ids.has(item.id) ? 0 : item.amount), 0),
      ),
    });
  }
  return result;
};
