import React from "react";
import { View, StyleSheet } from "react-native";
import Card from "../card";
import Skeleton from "../ui/skeleton";
import { useThemeColor } from "@/hooks/use-theme-color";

const FinancialSummaryCardSkeleton: React.FC = () => {
  const cardBackground = useThemeColor({}, "cardBackground");
  const textColor = useThemeColor({}, "text");

  return (
    <Card backgroundColor={cardBackground} color={textColor}>
      <View style={{ height: 200 }}>
      {/* Balance Row */}
      <View style={styles.balanceRow}>
        <Skeleton width={80} height={24} borderRadius={6} />
        <Skeleton width={120} height={28} borderRadius={6} />
      </View>

      {/* Progress Bar */}
      <View style={styles.progressBarContainer}>
        <Skeleton width="100%" height={15} borderRadius={6} />
      </View>

      {/* Details Section */}
      <View style={styles.detailsSection}>
        {/* Income Row */}
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
            <Skeleton
              width={40}
              height={12}
              borderRadius={4}
              style={{ marginTop: 2 }}
            />
          </View>
        </View>

        {/* Expense Row */}
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
            <Skeleton
              width={40}
              height={12}
              borderRadius={4}
              style={{ marginTop: 2 }}
            />
          </View>
        </View>
      </View>
      </View>
    </Card>
  );
};

const styles = StyleSheet.create({
  balanceRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    height: 28,
    marginBottom: 0,
  },
  progressBarContainer: {
    marginVertical: 16,
    height: 15,
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
  detailLabel: {
    flexDirection: "row",
    alignItems: "center",
  },
  detailValue: {
    alignItems: "flex-end",
  },
});

export default FinancialSummaryCardSkeleton;
