import React from "react";
import { View, Text, StyleSheet } from "react-native";
import Card from "../core/card";
import ChartSkeleton from "../charts/chart-skeleton";
import { useThemeColor } from "@/hooks/use-theme-color";
import { useDataContext } from "@/state/DataProvider";

type Props = {
  income: number;
  expense: number;
  isTransitioning?: boolean;
};

/**
 * FinancialSummaryCard - Displays monthly income/expense summary with a proportional bar
 *
 * BAR VISUALIZATION LOGIC:
 * Visual order is always: [Income (green)][Balance (blue/yellow)][Expense (red)]
 * - Income on the far LEFT
 * - Savings/Loss in the CENTER
 * - Expense on the far RIGHT
 *
 * The bar is conceptually divided into two halves (50% each). The "dominant" value
 * (larger between income and expense) takes its full 50%, while the other half is
 * divided proportionally between the smaller value and the balance (savings/loss).
 *
 * SAVINGS CASE (income >= expense):
 * - Income (green) fills 50%
 * - Expense + Savings share the other 50%
 * - Example: income=1000, expense=500, savings=500
 *   → [50% green][25% blue][25% red]
 *
 * LOSS CASE (expense > income):
 * - Expense (red) fills 50%
 * - Income + Loss share the other 50%
 * - Example: income=500, expense=1000, loss=500
 *   → [25% green][25% yellow][50% red]
 *
 * FLEX CALCULATION:
 * - Dominant value: flex = 0.5
 * - Smaller value: flex = (smallerValue / dominantValue) * 0.5
 * - Balance: flex = (|balance| / dominantValue) * 0.5
 * - Total always equals 1.0
 */
const FinancialSummaryCard: React.FC<Props> = ({
  income,
  expense,
  isTransitioning = false,
}) => {
  const { isLoading } = useDataContext();
  const balance = income - expense;
  const isProfit = balance >= 0;

  // Percentages relative to total money flow (for display below the bar)
  const total = income + expense;
  const incomePercentage = total > 0 ? (income / total) * 100 : 0;
  const expensePercentage = total > 0 ? (expense / total) * 100 : 0;

  // Theme colors
  const textColor = useThemeColor({}, "text");
  const subtleTextColor = useThemeColor({}, "tabIconDefault");
  const cardBackground = useThemeColor({}, "cardBackground");

  // Calculate flex values for progress bar segments
  let incomeFlex: number, expenseFlex: number, balanceFlex: number;

  if (isProfit) {
    // Savings case: Income fills left 50%, right half divided between expense and savings
    incomeFlex = 0.5;
    if (income > 0) {
      expenseFlex = (expense / income) * 0.5;
      balanceFlex = (balance / income) * 0.5;
    } else {
      expenseFlex = 0;
      balanceFlex = 0;
    }
  } else {
    // Loss case: Expense fills right 50%, left half divided between income and loss
    expenseFlex = 0.5;
    if (expense > 0) {
      incomeFlex = (income / expense) * 0.5;
      balanceFlex = (Math.abs(balance) / expense) * 0.5;
    } else {
      incomeFlex = 0;
      balanceFlex = 0;
    }
  }

  const formatAmount = (amount: number) => {
    return `€${Math.abs(amount).toLocaleString("it-IT", {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    })}`;
  };

  // Show skeleton if loading AND no data yet (both income and expense are 0)
  // OR if period is transitioning (changing month/year)
  const showSkeleton =
    (isLoading && income === 0 && expense === 0) || isTransitioning;

  if (showSkeleton) {
    return (
      <Card backgroundColor={cardBackground} color={textColor}>
        <ChartSkeleton variant="summary" height={200} />
      </Card>
    );
  }

  return (
    <Card backgroundColor={cardBackground} color={textColor}>
      <View style={{ height: 200 }}>
        {/* Balance Display */}
        <View style={styles.balanceRow}>
          <Text style={[styles.balanceLabel, { color: textColor }]}>
            {balance >= 0 ? "Savings" : "Loss"}
          </Text>
          <Text
            style={[
              styles.balanceAmount,
              { color: balance >= 0 ? "#4CAF50" : "#F44336" },
            ]}
          >
            {balance >= 0 ? "+" : ""}
            {formatAmount(balance)}
          </Text>
        </View>

        {/* Progress Bar - Always: [Income][Balance][Expense] */}
        <View style={styles.progressBarContainer}>
          <View style={styles.progressBar}>
            {/* Income (green) - always on the left */}
            <View
              style={[
                styles.progressSegment,
                styles.incomeSegment,
                { flex: incomeFlex },
              ]}
            />
            {/* Balance (blue for savings, yellow for loss) - always in the center */}
            <View
              style={[
                styles.progressSegment,
                isProfit ? styles.savingsSegment : styles.lossSegment,
                { flex: balanceFlex },
              ]}
            />
            {/* Expense (red) - always on the right */}
            <View
              style={[
                styles.progressSegment,
                styles.expenseSegment,
                { flex: expenseFlex },
              ]}
            />
          </View>
        </View>

        {/* Details Section */}
        <View style={styles.detailsSection}>
          <View style={styles.detailRow}>
            <View style={styles.detailLabel}>
              <View
                style={[styles.colorIndicator, { backgroundColor: "#4CAF50" }]}
              />
              <Text style={[styles.detailText, { color: textColor }]}>
                Incomes
              </Text>
            </View>
            <View style={styles.detailValue}>
              <Text style={[styles.detailAmount, { color: textColor }]}>
                {formatAmount(income)}
              </Text>
              <Text
                style={[styles.detailPercentage, { color: subtleTextColor }]}
              >
                {incomePercentage.toFixed(1)}%
              </Text>
            </View>
          </View>

          <View style={styles.detailRow}>
            <View style={styles.detailLabel}>
              <View
                style={[styles.colorIndicator, { backgroundColor: "#F44336" }]}
              />
              <Text style={[styles.detailText, { color: textColor }]}>
                Outcomes
              </Text>
            </View>
            <View style={styles.detailValue}>
              <Text style={[styles.detailAmount, { color: textColor }]}>
                {formatAmount(expense)}
              </Text>
              <Text
                style={[styles.detailPercentage, { color: subtleTextColor }]}
              >
                {expensePercentage.toFixed(1)}%
              </Text>
            </View>
          </View>
        </View>
      </View>
    </Card>
  );
};

const styles = StyleSheet.create({
  chipsRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 16,
    gap: 8,
  },
  chip: {
    flex: 1,
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderRadius: 25,
    alignItems: "center",
    justifyContent: "center",
    minHeight: 48,
  },
  incomeChip: {
    backgroundColor: "#4CAF50",
  },
  balanceChip: {
    backgroundColor: "#2196F3",
  },
  expenseChip: {
    backgroundColor: "#F44336",
  },
  selectedChip: {
    transform: [{ scale: 1.05 }],
    shadowColor: "#000000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 4,
    elevation: 4,
  },
  chipText: {
    color: "#FFFFFF",
    fontSize: 14,
    fontWeight: "600",
  },
  balanceRow: {
    display: "flex",
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    height: 28,
    marginBottom: 0,
  },
  balanceLabel: {
    fontSize: 22,
    fontWeight: "500",
  },
  balanceAmount: {
    fontSize: 24,
    fontWeight: "bold",
  },
  detailsSection: {
    gap: 12,
    paddingHorizontal: 4,
    paddingVertical: 8,
  },
  detailRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingHorizontal: 8,
    paddingVertical: 4,
    height: 42,
  },
  detailRowSelected: {
    backgroundColor: "#e0e0e05a",
    padding: 8,
    borderRadius: 12,
    marginHorizontal: -4,
  },
  detailLabel: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  colorIndicator: {
    width: 15,
    height: 15,
    borderRadius: 6,
  },
  detailText: {
    fontSize: 16,
    fontWeight: "500",
  },
  detailValue: {
    alignItems: "flex-end",
  },
  detailAmount: {
    fontSize: 16,
    fontWeight: "600",
  },
  detailPercentage: {
    fontSize: 12,
    opacity: 0.7,
  },
  progressBarContainer: {
    marginVertical: 16,
    height: 15,
  },
  progressBar: {
    height: 15,
    backgroundColor: "#E0E0E0",
    borderRadius: 6,
    flexDirection: "row",
    overflow: "hidden",
  },
  progressSegment: {
    height: "100%",
  },
  incomeSegment: {
    backgroundColor: "#4CAF50", // Verde per entrate
  },
  expenseSegment: {
    backgroundColor: "#F44336", // Rosso per uscite
  },
  savingsSegment: {
    backgroundColor: "#2196F3", // Azzurro per risparmi
  },
  lossSegment: {
    backgroundColor: "#FFC107", // Giallo per perdite
  },
});

export default FinancialSummaryCard;
