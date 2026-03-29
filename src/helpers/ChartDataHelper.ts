import type { Transaction, Movement, Account } from '../types/models';
import type {
  MonthlyData,
  MonthlyAccountBalance,
  IncomeExpenseData,
  BreakdownItem,
  PeriodBreakdownData,
} from '../types/charts';
import { EXCLUDED_CATEGORIES } from '../constants/categories';
import { parseDateFromDDMMYYYY } from '../utils/dateUtils';

// Default colors for categories
const CATEGORY_COLORS: Record<string, string> = {
  Alimentari: '#4CAF50',
  Trasporti: '#2196F3',
  Salute: '#F44336',
  Intrattenimento: '#9C27B0',
  Shopping: '#FF9800',
  Bollette: '#607D8B',
  Affitto: '#795548',
  Stipendio: '#4CAF50',
  Investimenti: '#3F51B5',
  Regalo: '#E91E63',
  Altro: '#9E9E9E',
};

/**
 * Get a color for a category, falling back to a generated hue.
 */
export function getColorForCategory(category: string, index: number): string {
  if (CATEGORY_COLORS[category]) {
    return CATEGORY_COLORS[category];
  }
  const hue = (index * 137) % 360;
  return `hsl(${hue}, 60%, 50%)`;
}

/**
 * Get short month label (e.g., "Gen", "Feb").
 */
export function getShortMonthLabel(monthIndex: number): string {
  const months = [
    'Gen',
    'Feb',
    'Mar',
    'Apr',
    'Mag',
    'Giu',
    'Lug',
    'Ago',
    'Set',
    'Ott',
    'Nov',
    'Dic',
  ];
  return months[monthIndex] || '';
}

/**
 * Pure helper functions for chart data computation.
 * Extracted from useMonthlyBalances, useIncomeExpenses, useCategoryAccountBreakdown hooks.
 */
export class ChartDataHelper {
  /**
   * Calculate cumulative monthly account balances.
   * Extracted from useMonthlyBalances hook.
   */
  static computeMonthlyBalances(
    transactions: Transaction[],
    accounts: Account[],
    monthsToShow: number = 12,
    monthOffset: number = 0,
  ): MonthlyData[] {
    if (!transactions.length || !accounts.length) {
      return [];
    }

    const now = new Date();
    const currentYear = now.getFullYear();
    const currentMonth = now.getMonth();

    const months: { year: number; month: number; endDate: Date }[] = [];
    for (let i = monthsToShow - 1; i >= 0; i--) {
      const date = new Date(currentYear, currentMonth - i - monthOffset, 1);
      const year = date.getFullYear();
      const month = date.getMonth();
      const endDate = new Date(year, month + 1, 0, 23, 59, 59);
      months.push({ year, month, endDate });
    }

    const accountMap = new Map<string, Account>();
    accounts.forEach((acc) => {
      accountMap.set(acc.name, acc);
    });

    return months.map(({ year, month, endDate }) => {
      const transactionsUpToMonth = transactions.filter((t) => {
        const txDate = parseDateFromDDMMYYYY(t.date);
        if (!txDate) return false;
        return txDate <= endDate;
      });

      const accountBalances = new Map<string, number>();
      accounts.forEach((acc) => {
        accountBalances.set(acc.name, 0);
      });

      transactionsUpToMonth.forEach((t) => {
        const currentBalance = accountBalances.get(t.account) || 0;
        const signedAmount = t.type === 'income' ? t.amount : -t.amount;
        accountBalances.set(t.account, currentBalance + signedAmount);
      });

      const accountsData: MonthlyAccountBalance[] = accounts.map((acc) => ({
        accountId: acc.accountId,
        accountName: acc.name,
        balance: accountBalances.get(acc.name) || 0,
        color: acc.color || '#2F4F3F',
      }));

      const totalBalance = accountsData.reduce((sum, acc) => sum + acc.balance, 0);

      const monthLabel = `${String(month + 1).padStart(2, '0')}/${year}`;

      return {
        month: monthLabel,
        year,
        monthIndex: month,
        date: endDate,
        accounts: accountsData,
        totalBalance,
      };
    });
  }

  /**
   * Calculate monthly income and expenses from movements (client-side fallback).
   * Extracted from useIncomeExpenses hook.
   */
  static computeIncomeExpenses(
    movements: Movement[],
    monthsToShow: number = 12,
    monthOffset: number = 0,
  ): IncomeExpenseData[] {
    if (!movements.length) {
      return [];
    }

    const now = new Date();
    const currentYear = now.getFullYear();
    const currentMonth = now.getMonth();

    const months: {
      year: number;
      month: number;
      startDate: Date;
      endDate: Date;
    }[] = [];
    for (let i = monthsToShow - 1; i >= 0; i--) {
      const date = new Date(currentYear, currentMonth - i - monthOffset, 1);
      const year = date.getFullYear();
      const month = date.getMonth();
      const startDate = new Date(year, month, 1, 0, 0, 0);
      const endDate = new Date(year, month + 1, 0, 23, 59, 59);
      months.push({ year, month, startDate, endDate });
    }

    return months.map(({ year, month, startDate, endDate }) => {
      const monthMovements = movements.filter((m) => {
        const movementDate = parseDateFromDDMMYYYY(m.date);
        if (!movementDate) return false;
        return movementDate >= startDate && movementDate <= endDate;
      });

      let income = 0;
      let expenses = 0;

      monthMovements
        .filter((m) => !EXCLUDED_CATEGORIES.includes(m.category))
        .forEach((m) => {
          if (m.totalAmount >= 0) {
            income += m.totalAmount;
          } else {
            expenses += Math.abs(m.totalAmount);
          }
        });

      const monthLabel = `${String(month + 1).padStart(2, '0')}/${year}`;

      return {
        month: monthLabel,
        year,
        monthIndex: month,
        date: endDate,
        income,
        expenses,
      };
    });
  }

  /**
   * Calculate income/expenses breakdown by category or account per period.
   * Extracted from useCategoryAccountBreakdown hook.
   */
  static computeCategoryAccountBreakdown(
    movements: Movement[],
    transactions: Transaction[],
    accounts: Account[],
    type: 'income' | 'expense',
    groupBy: 'category' | 'account',
    monthsToShow: number = 12,
    monthOffset: number = 0,
  ): PeriodBreakdownData[] {
    const hasData = groupBy === 'category' ? movements.length > 0 : transactions.length > 0;
    if (!hasData) {
      return [];
    }

    const now = new Date();
    const currentYear = now.getFullYear();
    const currentMonth = now.getMonth();

    const months: {
      year: number;
      month: number;
      startDate: Date;
      endDate: Date;
    }[] = [];
    for (let i = monthsToShow - 1; i >= 0; i--) {
      const date = new Date(currentYear, currentMonth - i - monthOffset, 1);
      const year = date.getFullYear();
      const month = date.getMonth();
      const startDate = new Date(year, month, 1, 0, 0, 0);
      const endDate = new Date(year, month + 1, 0, 23, 59, 59);
      months.push({ year, month, startDate, endDate });
    }

    const accountMap = new Map<string, Account>();
    accounts.forEach((acc) => {
      accountMap.set(acc.name, acc);
    });

    // Track all unique categories/accounts for consistent coloring
    const allGroupKeys = new Set<string>();
    if (groupBy === 'category') {
      movements
        .filter((m) => !EXCLUDED_CATEGORIES.includes(m.category))
        .forEach((m) => {
          const isIncome = m.totalAmount >= 0;
          if ((type === 'expense' && !isIncome) || (type === 'income' && isIncome)) {
            allGroupKeys.add(m.category || 'Altro');
          }
        });
    } else {
      transactions
        .filter((t) => !EXCLUDED_CATEGORIES.includes(t.category))
        .forEach((t) => {
          if (
            (type === 'expense' && t.type === 'expense') ||
            (type === 'income' && t.type === 'income')
          ) {
            allGroupKeys.add(t.account);
          }
        });
    }
    const groupKeyArray = Array.from(allGroupKeys);

    return months.map(({ year, month, startDate, endDate }) => {
      const groupedAmounts = new Map<string, number>();

      if (groupBy === 'category') {
        const monthMovements = movements.filter((m) => {
          if (EXCLUDED_CATEGORIES.includes(m.category)) return false;
          const movementDate = parseDateFromDDMMYYYY(m.date);
          if (!movementDate) return false;
          if (movementDate < startDate || movementDate > endDate) return false;
          const isIncome = m.totalAmount >= 0;
          return type === 'income' ? isIncome : !isIncome;
        });

        monthMovements.forEach((m) => {
          const key = m.category || 'Altro';
          const current = groupedAmounts.get(key) || 0;
          groupedAmounts.set(key, current + Math.abs(m.totalAmount));
        });
      } else {
        const monthTransactions = transactions.filter((t) => {
          if (EXCLUDED_CATEGORIES.includes(t.category)) return false;
          const txDate = parseDateFromDDMMYYYY(t.date);
          if (!txDate) return false;
          if (txDate < startDate || txDate > endDate) return false;
          return t.type === type;
        });

        monthTransactions.forEach((t) => {
          const key = t.account;
          const current = groupedAmounts.get(key) || 0;
          groupedAmounts.set(key, current + t.amount);
        });
      }

      const items: BreakdownItem[] = [];
      groupedAmounts.forEach((amount, key) => {
        const index = groupKeyArray.indexOf(key);
        let color: string;

        if (groupBy === 'account') {
          const account = accountMap.get(key);
          color = account?.color || getColorForCategory(key, index);
        } else {
          color = getColorForCategory(key, index);
        }

        items.push({
          id: key,
          name: key,
          amount,
          color,
        });
      });

      items.sort((a, b) => b.amount - a.amount);

      const total = items.reduce((sum, item) => sum + item.amount, 0);

      return {
        month: `${String(month + 1).padStart(2, '0')}/${year}`,
        year,
        monthIndex: month,
        date: endDate,
        items,
        total,
      };
    });
  }
}
