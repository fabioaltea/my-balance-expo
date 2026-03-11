/**
 * ChartSkeleton - Reusable skeleton component for charts and cards
 *
 * Supports multiple variants:
 * - "summary": For financial summary cards (balance row + progress bar + details rows)
 * - "forecast": For forecast cards (bar + delta + details)
 * - "bars": For bar charts (vertical bars with x-axis labels)
 * - "list": For movement/transaction lists (repeating item rows)
 *
 * Usage:
 *   <ChartSkeleton variant="summary" height={200} />
 *   <ChartSkeleton variant="list" itemCount={5} />
 *   <ChartSkeleton variant="bars" barCount={6} height={220} />
 */

import React from "react";
import { View, StyleSheet } from "react-native";
import Skeleton from "@/src/components/ui/skeleton";
import { useThemeColor } from "@/src/hooks/use-theme-color";

type SkeletonVariant = "summary" | "forecast" | "bars" | "list";

interface ChartSkeletonProps {
  variant: SkeletonVariant;
  height?: number;
  itemCount?: number; // For "list" variant
  barCount?: number; // For "bars" variant
}

const ChartSkeleton: React.FC<ChartSkeletonProps> = ({
  variant,
  height = 200,
  itemCount = 5,
  barCount = 6,
}) => {
  const borderColor = useThemeColor(
    { light: "#F0F0F0", dark: "#333333" },
    "tabIconDefault",
  );

  // Summary variant: balance row + progress bar + 2 detail rows
  if (variant === "summary") {
    return (
      <View style={{ height }}>
        {/* Balance Row */}
        <View style={styles.row}>
          <Skeleton width={80} height={24} borderRadius={6} />
          <Skeleton width={120} height={28} borderRadius={6} />
        </View>

        {/* Progress Bar */}
        <View style={styles.progressBarContainer}>
          <Skeleton width="100%" height={15} borderRadius={6} />
        </View>

        {/* Details Section */}
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
              <Skeleton
                width={40}
                height={12}
                borderRadius={4}
                style={{ marginTop: 2 }}
              />
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
    );
  }

  // Forecast variant: bar visualization + delta + details
  if (variant === "forecast") {
    return (
      <View style={{ height }}>
        {/* Scale labels */}
        <View style={styles.row}>
          <Skeleton width={30} height={10} borderRadius={4} />
          <Skeleton width={30} height={10} borderRadius={4} />
        </View>

        {/* Bar */}
        <Skeleton
          width="100%"
          height={20}
          borderRadius={10}
          style={{ marginVertical: 6 }}
        />

        {/* Value labels */}
        <View style={[styles.row, { marginTop: 8 }]}>
          <View style={{ alignItems: "center" }}>
            <Skeleton width={45} height={22} borderRadius={8} />
            <Skeleton
              width={35}
              height={10}
              borderRadius={4}
              style={{ marginTop: 2 }}
            />
          </View>
          <View style={{ alignItems: "center" }}>
            <Skeleton width={45} height={22} borderRadius={8} />
            <Skeleton
              width={45}
              height={10}
              borderRadius={4}
              style={{ marginTop: 2 }}
            />
          </View>
        </View>

        {/* Delta summary */}
        <View style={[styles.row, { marginTop: 16 }]}>
          <Skeleton width={110} height={16} borderRadius={4} />
          <Skeleton width={80} height={20} borderRadius={4} />
        </View>

        {/* Forecast details */}
        <View style={{ marginTop: 12, gap: 8 }}>
          <View style={styles.row}>
            <Skeleton width={120} height={14} borderRadius={4} />
            <Skeleton width={90} height={14} borderRadius={4} />
          </View>
          <View style={styles.row}>
            <Skeleton width={130} height={14} borderRadius={4} />
            <Skeleton width={90} height={14} borderRadius={4} />
          </View>
        </View>
      </View>
    );
  }

  // Bars variant: vertical bar chart skeleton
  if (variant === "bars") {
    const chartHeight = height - 30; // Leave space for labels
    const bars = Array.from({ length: barCount }, (_, i) => ({
      height: 30 + Math.random() * 50, // Random heights for visual interest
    }));

    return (
      <View style={{ height }}>
        <View style={[styles.barsContainer, { height: chartHeight }]}>
          {/* Y-axis skeleton */}
          <View style={styles.yAxisSkeleton}>
            <Skeleton width={20} height={10} borderRadius={4} />
            <Skeleton width={16} height={10} borderRadius={4} />
            <Skeleton width={18} height={10} borderRadius={4} />
            <Skeleton width={12} height={10} borderRadius={4} />
          </View>

          {/* Bars */}
          <View style={styles.barsRow}>
            {bars.map((bar, index) => (
              <View key={index} style={styles.barColumn}>
                <Skeleton width={24} height={bar.height} borderRadius={4} />
                <Skeleton
                  width={20}
                  height={10}
                  borderRadius={4}
                  style={{ marginTop: 4 }}
                />
              </View>
            ))}
          </View>
        </View>
      </View>
    );
  }

  // List variant: repeating item rows
  if (variant === "list") {
    return (
      <View>
        {Array.from({ length: itemCount }).map((_, index) => (
          <View
            key={index}
            style={[
              styles.listItem,
              { borderBottomColor: borderColor },
              index === itemCount - 1 && styles.lastListItem,
            ]}
          >
            {/* Icon placeholder */}
            <Skeleton
              width={50}
              height={50}
              borderRadius={25}
              style={{ marginRight: 16 }}
            />

            {/* Info placeholder */}
            <View style={styles.listItemInfo}>
              <Skeleton width={80} height={14} borderRadius={4} />
              <Skeleton
                width={140}
                height={18}
                borderRadius={4}
                style={{ marginTop: 4 }}
              />
            </View>

            {/* Amount placeholder */}
            <Skeleton width={70} height={18} borderRadius={4} />
          </View>
        ))}
      </View>
    );
  }

  return null;
};

const styles = StyleSheet.create({
  row: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
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
  barsContainer: {
    flexDirection: "row",
  },
  yAxisSkeleton: {
    width: 24,
    justifyContent: "space-between",
    alignItems: "flex-end",
    paddingRight: 4,
    paddingVertical: 8,
  },
  barsRow: {
    flex: 1,
    flexDirection: "row",
    alignItems: "flex-end",
    justifyContent: "space-around",
    paddingBottom: 0,
  },
  barColumn: {
    alignItems: "center",
  },
  listItem: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: 10,
    borderBottomWidth: 1,
  },
  lastListItem: {
    borderBottomWidth: 0,
  },
  listItemInfo: {
    flex: 1,
  },
});

export default ChartSkeleton;
