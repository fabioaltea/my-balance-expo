import React from "react";
import { View, Text, StyleSheet } from "react-native";
import Card from "../card";
import Skeleton from "../ui/skeleton";
import { useThemeColor } from "@/hooks/use-theme-color";
import { useDataContext } from "@/state/DataProvider";

type Props = {
  income: number;
  expense: number;
  isTransitioning?: boolean;
};

const FinancialSummaryCard: React.FC<Props> = ({
  income,
  expense,
  isTransitioning = false,
}) => {
  const { isLoading } = useDataContext();
  const balance = income - expense;
  const total = income + expense;
  const incomePercentage = balance > 0 ? (income / balance) * 100 : 0;
  const expensePercentage = balance > 0 ? (expense / balance) * 100 : 0;

  // Colori del tema
  const textColor = useThemeColor({}, "text");
  const subtleTextColor = useThemeColor({}, "tabIconDefault");
  const cardBackground = useThemeColor({}, "cardBackground");

  // Calcola le proporzioni basate sul valore maggiore
  const baseValue = Math.max(income, expense);
  const incomeRatio = baseValue > 0 ? income / baseValue : 0;
  const expenseRatio = income > 0 ? expense / income : 0; // Uscite proporzionate alle entrate
  const balanceRatio = baseValue > 0 ? Math.abs(balance) / baseValue : 0;

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
        <View style={styles.balanceRow}>
          <Skeleton width={80} height={24} borderRadius={6} />
          <Skeleton width={120} height={28} borderRadius={6} />
        </View>
        <View style={styles.progressBarContainer}>
          <Skeleton width="100%" height={15} borderRadius={6} />
        </View>
        <View style={styles.detailsSection}>
          <View style={styles.detailRow}>
            <View style={styles.detailLabel}>
              <Skeleton width={15} height={15} borderRadius={6} />
              <Skeleton
                width={70}
                height={18}
                borderRadius={4}
                style={{ marginLeft: 8 }}
              />
            </View>
            <View style={styles.detailValue}>
              <Skeleton width={90} height={18} borderRadius={4} />
            </View>
          </View>
          <View style={styles.detailRow}>
            <View style={styles.detailLabel}>
              <Skeleton width={15} height={15} borderRadius={6} />
              <Skeleton
                width={80}
                height={18}
                borderRadius={4}
                style={{ marginLeft: 8 }}
              />
            </View>
            <View style={styles.detailValue}>
              <Skeleton width={90} height={18} borderRadius={4} />
            </View>
          </View>
        </View>
      </Card>
    );
  }

  return (
    <Card backgroundColor={cardBackground} color={textColor}>
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

      {/* Progress Bar */}
      <View style={styles.progressBarContainer}>
        <View style={styles.progressBar}>
          {/* Entrate - sempre 50% della barra */}
          <View
            style={[
              styles.progressSegment,
              styles.incomeSegment,
              { flex: 0.5 * incomeRatio },
            ]}
          />

          {/* Risparmi/Perdite - il resto del 50% */}
          <View
            style={[
              styles.progressSegment,
              balance >= 0 ? styles.savingsSegment : styles.lossSegment,
              {
                flex:
                  0.5 *
                  (1 -
                    (expenseRatio < incomeRatio ? expenseRatio : incomeRatio)),
              },
            ]}
          />

          {/* Uscite - proporzionate alle entrate nel restante 50% */}
          <View
            style={[
              styles.progressSegment,
              styles.expenseSegment,
              { flex: 0.5 * expenseRatio },
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
            <Text style={[styles.detailPercentage, { color: subtleTextColor }]}>
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
            <Text style={[styles.detailPercentage, { color: subtleTextColor }]}>
              {expensePercentage.toFixed(1)}%
            </Text>
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
