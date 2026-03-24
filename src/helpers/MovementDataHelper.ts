import type {
  Transaction,
  Movement,
  Account,
  PendingRecurrence,
  MonthlyForecast,
  AccountForecast,
} from "../types/models";
import { EXCLUDED_CATEGORIES } from "../constants/categories";
import {
  calculateExpectedOccurrences,
  getMonthPeriodsFromStartDate,
  isDateInRange,
  getCurrentMonthPeriod,
  getLast12MonthsPeriods,
  detectPeriodType,
  getDayOfYear,
  getDaysInYear,
  getPastYearsPeriods,
  getYearRangeUpToDay,
  getMonthStart,
  getMonthEnd,
} from "../utils/dateUtils";

/**
 * Pure helper functions for movement data processing.
 * Extracted from useMyBalanceData hook — no React dependencies.
 */
export class MovementDataHelper {
  /**
   * Group transactions into movements by movementId.
   * Returns ALL movements including templates and unconfirmed.
   */
  static groupTransactionsIntoMovements(
    transactions: Transaction[],
  ): Movement[] {
    return Object.values(
      transactions.reduce(
        (acc, transaction) => {
          const movementId = transaction.movementId;

          if (!acc[movementId]) {
            acc[movementId] = {
              id: movementId,
              date: transaction.date,
              description: transaction.description,
              category: transaction.category,
              location: transaction.location,
              recurrenceId: transaction.recurrenceId,
              recurrencePattern: transaction.recurrencePattern,
              status: transaction.status,
              transactions: [],
              totalAmount: 0,
              type: "expense" as const,
            };
          }

          acc[movementId].transactions.push(transaction);

          const signedAmount =
            transaction.type === "income"
              ? transaction.amount
              : -transaction.amount;
          acc[movementId].totalAmount += signedAmount;

          acc[movementId].type =
            acc[movementId].totalAmount >= 0 ? "income" : "expense";

          return acc;
        },
        {} as Record<string, Movement>,
      ),
    );
  }

  /**
   * Filter out recurring templates and unconfirmed — returns "actual" movements.
   */
  static filterActualMovements(allMovements: Movement[]): Movement[] {
    return allMovements.filter(
      (m) =>
        m.status?.toLowerCase() !== "recurrent" &&
        m.status?.toLowerCase() !== "unconfirmed" &&
        m.status?.toLowerCase() !== "dismissed" &&
        !m.recurrencePattern,
    );
  }

  /**
   * Get unconfirmed movements (from third party imports).
   */
  static filterUnconfirmedMovements(allMovements: Movement[]): Movement[] {
    return allMovements.filter(
      (m) => m.status?.toLowerCase() === "unconfirmed",
    );
  }

  /**
   * Get unique recurring movement templates, keeping only the most recent per recurrenceId.
   */
  static filterRecurringMovements(allMovements: Movement[]): Movement[] {
    return Object.values(
      allMovements
        .filter(
          (m) =>
            m.recurrenceId &&
            (m.status?.toLowerCase() === "recurrent" || m.recurrencePattern),
        )
        .reduce(
          (acc, movement) => {
            const recurrenceId = movement.recurrenceId!;
            if (!acc[recurrenceId] || movement.date > acc[recurrenceId].date) {
              acc[recurrenceId] = movement;
            }
            return acc;
          },
          {} as Record<string, Movement>,
        ),
    );
  }

  /**
   * Calculate total income from movements.
   * When accountFilter is provided (and not "All"), sums only transactions for that account.
   */
  static getTotalIncome(
    filteredMovements: Movement[],
    accountFilter?: string,
  ): number {
    return filteredMovements
      .filter((m) => !EXCLUDED_CATEGORIES.includes(m.category))
      .reduce((sum, m) => {
        if (accountFilter && accountFilter !== "All") {
          const accountIncome = m.transactions
            .filter((t) => t.account === accountFilter && t.type === "income")
            .reduce((s, t) => s + t.amount, 0);
          return sum + accountIncome;
        } else {
          return sum + (m.totalAmount > 0 ? m.totalAmount : 0);
        }
      }, 0);
  }

  /**
   * Calculate total expense from movements.
   * When accountFilter is provided (and not "All"), sums only transactions for that account.
   */
  static getTotalExpense(
    filteredMovements: Movement[],
    accountFilter?: string,
  ): number {
    return filteredMovements
      .filter((m) => !EXCLUDED_CATEGORIES.includes(m.category))
      .reduce((sum, m) => {
        if (accountFilter && accountFilter !== "All") {
          const accountExpense = m.transactions
            .filter((t) => t.account === accountFilter && t.type === "expense")
            .reduce((s, t) => s + t.amount, 0);
          return sum + accountExpense;
        } else {
          return sum + (m.totalAmount < 0 ? Math.abs(m.totalAmount) : 0);
        }
      }, 0);
  }

  /**
   * Calculate net balance from movements.
   */
  static getBalance(filteredMovements: Movement[]): number {
    return (
      MovementDataHelper.getTotalIncome(filteredMovements) -
      MovementDataHelper.getTotalExpense(filteredMovements)
    );
  }

  /**
   * Calculate pending recurring movements.
   * For each recurring template, check each period from start date to now
   * and calculate how many occurrences are missing.
   */
  static calculatePendingRecurrences(
    recurringMovements: Movement[],
    movements: Movement[],
  ): PendingRecurrence[] {
    const result: PendingRecurrence[] = [];

    for (const template of recurringMovements) {
      const {
        recurrenceId,
        recurrencePattern,
        date: templateStartDate,
      } = template;
      if (!recurrenceId || !recurrencePattern) {
        continue;
      }

      const periods = getMonthPeriodsFromStartDate(
        templateStartDate,
        Infinity,
      );

      for (const period of periods) {
        const expectedCount = calculateExpectedOccurrences(
          recurrencePattern,
          period.startDate,
          period.endDate,
          templateStartDate,
        );

        const matchingMovements = movements.filter(
          (m) =>
            m.recurrenceId === recurrenceId &&
            m.status?.toLowerCase() !== "recurrent" &&
            isDateInRange(m.date, period.startDate, period.endDate),
        );
        const actualCount = matchingMovements.length;
        const missingCount = expectedCount - actualCount;

        if (expectedCount === 0) {
          continue;
        }

        if (missingCount > 0) {
          result.push({
            template,
            periodLabel: period.label,
            periodStart: period.startDate,
            periodEnd: period.endDate,
            expectedCount,
            actualCount,
            missingCount,
            isOverdue: period.isOverdue,
          });
        }
      }
    }

    return result.sort((a, b) => {
      if (a.isOverdue !== b.isOverdue) {
        return a.isOverdue ? -1 : 1;
      }
      return b.periodStart.localeCompare(a.periodStart);
    });
  }

  /**
   * Calculate forecast for end-of-period balance prediction.
   */
  static calculateForecast(
    accounts: Account[],
    movements: Movement[],
    pendingRecurrences: PendingRecurrence[],
    periodStartDate: string,
    periodEndDate: string,
  ): MonthlyForecast {
    const periodType = detectPeriodType(periodStartDate, periodEndDate);
    const now = new Date();

    // 1. Current balance
    const currentBalance = accounts.reduce(
      (sum, acc) => sum + acc.balance,
      0,
    );

    // 2. Current period income and expenses
    const currentPeriodMovements = movements.filter(
      (m) =>
        isDateInRange(m.date, periodStartDate, periodEndDate) &&
        !EXCLUDED_CATEGORIES.includes(m.category),
    );
    const currentPeriodIncome = currentPeriodMovements
      .filter((m) => m.type === "income")
      .reduce((sum, m) => sum + m.totalAmount, 0);
    const currentPeriodExpense = currentPeriodMovements
      .filter((m) => m.type === "expense")
      .reduce((sum, m) => sum + Math.abs(m.totalAmount), 0);

    // 3. Pending recurring for this period
    const currentPeriodPending = pendingRecurrences.filter(
      (pr) => !pr.isOverdue,
    );
    const pendingRecurringIncome = currentPeriodPending
      .filter((pr) => pr.template.type === "income")
      .reduce(
        (sum, pr) =>
          sum + Math.abs(pr.template.totalAmount) * pr.missingCount,
        0,
      );
    const pendingRecurringExpense = currentPeriodPending
      .filter((pr) => pr.template.type === "expense")
      .reduce(
        (sum, pr) =>
          sum + Math.abs(pr.template.totalAmount) * pr.missingCount,
        0,
      );

    let avgIncome = 0;
    let avgExpense = 0;
    let periodProgress = 0;
    let historicalProgressAtThisPoint = 0;

    if (periodType === "year") {
      const currentYear = now.getFullYear();
      const dayOfYear = getDayOfYear(now);
      const totalDaysInYear = getDaysInYear(currentYear);
      periodProgress = dayOfYear / totalDaysInYear;

      const pastYears = getPastYearsPeriods(5);
      let totalYearlyIncome = 0;
      let totalYearlyExpense = 0;
      let totalProgressIncome = 0;
      let totalProgressExpense = 0;
      let yearsWithData = 0;

      for (const yearPeriod of pastYears) {
        const yearMovements = movements.filter(
          (m) =>
            isDateInRange(m.date, yearPeriod.startDate, yearPeriod.endDate) &&
            !EXCLUDED_CATEGORIES.includes(m.category),
        );

        if (yearMovements.length > 0) {
          yearsWithData++;
          const yearIncome = yearMovements
            .filter((m) => m.type === "income")
            .reduce((sum, m) => sum + m.totalAmount, 0);
          const yearExpense = yearMovements
            .filter((m) => m.type === "expense")
            .reduce((sum, m) => sum + Math.abs(m.totalAmount), 0);

          totalYearlyIncome += yearIncome;
          totalYearlyExpense += yearExpense;

          const upToDay = getYearRangeUpToDay(yearPeriod.year, dayOfYear);
          const upToDayMovements = movements.filter(
            (m) =>
              isDateInRange(m.date, upToDay.startDate, upToDay.endDate) &&
              !EXCLUDED_CATEGORIES.includes(m.category),
          );
          const upToDayIncome = upToDayMovements
            .filter((m) => m.type === "income")
            .reduce((sum, m) => sum + m.totalAmount, 0);
          const upToDayExpense = upToDayMovements
            .filter((m) => m.type === "expense")
            .reduce((sum, m) => sum + Math.abs(m.totalAmount), 0);

          if (yearIncome > 0) {
            totalProgressIncome += upToDayIncome / yearIncome;
          }
          if (yearExpense > 0) {
            totalProgressExpense += upToDayExpense / yearExpense;
          }
        }
      }

      if (yearsWithData > 0) {
        avgIncome = totalYearlyIncome / yearsWithData;
        avgExpense = totalYearlyExpense / yearsWithData;
        historicalProgressAtThisPoint =
          (totalProgressIncome + totalProgressExpense) / yearsWithData / 2;
      }
    } else {
      const currentMonth = now.getMonth();
      const currentDay = now.getDate();
      const daysInMonth = new Date(
        now.getFullYear(),
        currentMonth + 1,
        0,
      ).getDate();
      periodProgress = currentDay / daysInMonth;

      const pastYears = getPastYearsPeriods(5);
      const sameMonthTotalsIncome: number[] = [];
      const sameMonthTotalsExpense: number[] = [];

      for (const yearPeriod of pastYears) {
        const sameMonthStart = getMonthStart(yearPeriod.year, currentMonth);
        const sameMonthEnd = getMonthEnd(yearPeriod.year, currentMonth);

        const monthMovements = movements.filter(
          (m) =>
            isDateInRange(m.date, sameMonthStart, sameMonthEnd) &&
            !EXCLUDED_CATEGORIES.includes(m.category),
        );

        const yearMovements = movements.filter(
          (m) =>
            isDateInRange(m.date, yearPeriod.startDate, yearPeriod.endDate) &&
            !EXCLUDED_CATEGORIES.includes(m.category),
        );

        if (monthMovements.length > 0 && yearMovements.length > 0) {
          const monthIncome = monthMovements
            .filter((m) => m.type === "income")
            .reduce((sum, m) => sum + m.totalAmount, 0);
          const monthExpense = monthMovements
            .filter((m) => m.type === "expense")
            .reduce((sum, m) => sum + Math.abs(m.totalAmount), 0);

          sameMonthTotalsIncome.push(monthIncome);
          sameMonthTotalsExpense.push(monthExpense);
        }
      }

      if (sameMonthTotalsIncome.length > 0) {
        avgIncome =
          sameMonthTotalsIncome.reduce((a, b) => a + b, 0) /
          sameMonthTotalsIncome.length;
      }
      if (sameMonthTotalsExpense.length > 0) {
        avgExpense =
          sameMonthTotalsExpense.reduce((a, b) => a + b, 0) /
          sameMonthTotalsExpense.length;
      }

      historicalProgressAtThisPoint = periodProgress;
    }

    // 6. Calculate forecast
    const expectedRemainingIncome = Math.max(
      0,
      avgIncome - currentPeriodIncome,
    );
    const expectedRemainingExpense = Math.max(
      0,
      avgExpense - currentPeriodExpense,
    );

    const forecastBalance =
      currentBalance +
      pendingRecurringIncome -
      pendingRecurringExpense +
      expectedRemainingIncome -
      expectedRemainingExpense;

    const forecastDelta = forecastBalance - currentBalance;

    // Check if there's enough data: at least 2 distinct months with movements
    const distinctMonths = new Set(
      movements
        .filter((m) => !EXCLUDED_CATEGORIES.includes(m.category))
        .map((m) => {
          const parts = m.date.split("-");
          return parts.length === 3 ? `${parts[2]}-${parts[1]}` : null;
        })
        .filter(Boolean),
    );
    const hasEnoughData = distinctMonths.size >= 2;

    return {
      periodType,
      currentBalance,
      currentMonthIncome: currentPeriodIncome,
      currentMonthExpense: currentPeriodExpense,
      pendingRecurringIncome,
      pendingRecurringExpense,
      avgMonthlyIncome: avgIncome,
      avgMonthlyExpense: avgExpense,
      forecastBalance,
      forecastDelta,
      periodProgress,
      historicalProgressAtThisPoint,
      hasEnoughData,
    };
  }

  /**
   * Calculate forecast for each individual account.
   */
  static calculateAccountForecasts(
    accounts: Account[],
    transactions: Transaction[],
    pendingRecurrences: PendingRecurrence[],
  ): AccountForecast[] {
    const currentMonth = getCurrentMonthPeriod();
    const last12Months = getLast12MonthsPeriods();

    return accounts.map((account) => {
      const accountTransactions = transactions.filter(
        (t) => t.account === account.name,
      );

      const currentMonthTx = accountTransactions.filter((t) =>
        isDateInRange(t.date, currentMonth.startDate, currentMonth.endDate),
      );
      const currentMonthIncome = currentMonthTx
        .filter((t) => t.type === "income")
        .reduce((sum, t) => sum + t.amount, 0);
      const currentMonthExpense = currentMonthTx
        .filter((t) => t.type === "expense")
        .reduce((sum, t) => sum + t.amount, 0);

      const accountPending = pendingRecurrences.filter(
        (pr) =>
          !pr.isOverdue &&
          pr.template.transactions.some((t) => t.account === account.name),
      );
      const pendingIncome = accountPending
        .filter((pr) => pr.template.type === "income")
        .reduce((sum, pr) => {
          const accountTx = pr.template.transactions.filter(
            (t) => t.account === account.name,
          );
          const accountAmount = accountTx.reduce((s, t) => s + t.amount, 0);
          return sum + accountAmount * pr.missingCount;
        }, 0);
      const pendingExpense = accountPending
        .filter((pr) => pr.template.type === "expense")
        .reduce((sum, pr) => {
          const accountTx = pr.template.transactions.filter(
            (t) => t.account === account.name,
          );
          const accountAmount = accountTx.reduce((s, t) => s + t.amount, 0);
          return sum + accountAmount * pr.missingCount;
        }, 0);

      let totalIncome = 0;
      let totalExpense = 0;
      let monthsWithData = 0;

      for (const period of last12Months) {
        const periodTx = accountTransactions.filter((t) =>
          isDateInRange(t.date, period.startDate, period.endDate),
        );
        if (periodTx.length > 0) {
          monthsWithData++;
          totalIncome += periodTx
            .filter((t) => t.type === "income")
            .reduce((sum, t) => sum + t.amount, 0);
          totalExpense += periodTx
            .filter((t) => t.type === "expense")
            .reduce((sum, t) => sum + t.amount, 0);
        }
      }

      const avgIncome = monthsWithData > 0 ? totalIncome / monthsWithData : 0;
      const avgExpense =
        monthsWithData > 0 ? totalExpense / monthsWithData : 0;

      const expectedRemainingIncome = Math.max(
        0,
        avgIncome - currentMonthIncome,
      );
      const expectedRemainingExpense = Math.max(
        0,
        avgExpense - currentMonthExpense,
      );

      const forecastBalance =
        account.balance +
        pendingIncome -
        pendingExpense +
        expectedRemainingIncome -
        expectedRemainingExpense;

      return {
        accountId: account.accountId,
        accountName: account.name,
        currentBalance: account.balance,
        forecastBalance,
        forecastDelta: forecastBalance - account.balance,
      };
    });
  }
}
