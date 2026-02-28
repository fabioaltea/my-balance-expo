/**
 * Custom Stacked Bar Chart component
 *
 * Renders a stacked bar chart using React Native Views.
 * Each bar represents a month, with segments stacked for each account.
 */

import React, { useMemo, useRef, useEffect } from "react";
import { View, Text, StyleSheet, TouchableOpacity, Dimensions, ScrollView } from "react-native";
import * as Haptics from "expo-haptics";
import { useThemeColor } from "@/hooks/use-theme-color";
import { MonthlyData, getShortMonthLabel } from "@/hooks/useMonthlyBalances";

interface StackedBarChartProps {
  data: MonthlyData[];
  height?: number;
  showLabels?: boolean;
  showYAxis?: boolean;
  showLegend?: boolean;
  showTotal?: boolean;
  onBarPress?: (monthData: MonthlyData) => void;
  viewMode?: "months" | "years";
  scrollable?: boolean;
}

const BAR_WIDTH = 26;
const BAR_GAP = 12;

const StackedBarChart: React.FC<StackedBarChartProps> = ({
  data,
  height = 220,
  showLabels = true,
  showYAxis = true,
  showLegend = true,
  showTotal = true,
  onBarPress,
  viewMode = "months",
  scrollable = false,
}) => {
  const textColor = useThemeColor({}, "text");
  const subtleTextColor = useThemeColor({}, "tabIconDefault");
  const cardBackground = useThemeColor({}, "cardBackground");
  const scrollRef = useRef<ScrollView>(null);

  // Calculate chart dimensions
  const chartHeight = height - (showLabels ? 20 : 0);
  const yAxisWidth = showYAxis ? 24 : 0;

  // Find the max value for scaling
  const { maxValue, yAxisLabels } = useMemo(() => {
    if (data.length === 0) return { maxValue: 0, yAxisLabels: [] };

    // For stacked bars, we need to sum positive balances only
    const maxTotal = Math.max(
      ...data.map((d) =>
        d.accounts.reduce((sum, acc) => sum + Math.max(0, acc.balance), 0)
      )
    );

    // Calculate nice Y-axis labels
    const roundedMax = Math.ceil(maxTotal / 1000) * 1000;
    const step = roundedMax / 4;
    const labels = [0, step, step * 2, step * 3, roundedMax].map((v) =>
      v >= 1000 ? `${(v / 1000).toFixed(0)}k` : v.toString()
    );

    return { maxValue: roundedMax || 1000, yAxisLabels: labels };
  }, [data]);

  // Get unique accounts for legend
  const uniqueAccounts = useMemo(() => {
    if (data.length === 0) return [];
    const accountMap = new Map<string, { name: string; color: string }>();
    data.forEach((d) => {
      d.accounts.forEach((acc) => {
        if (!accountMap.has(acc.accountId)) {
          accountMap.set(acc.accountId, {
            name: acc.accountName,
            color: acc.color,
          });
        }
      });
    });
    return Array.from(accountMap.values());
  }, [data]);

  if (data.length === 0) {
    return (
      <View style={[styles.emptyContainer, { height }]}>
        <Text style={[styles.emptyText, { color: subtleTextColor }]}>
          No data available
        </Text>
      </View>
    );
  }

  // Fixed bar width - doesn't grow if fewer bars
  const barWidth = BAR_WIDTH;
  const barMargin = BAR_GAP;
  const barTotalWidth = barWidth + barMargin;

  // Calculate visible data
  const visibleData = useMemo(() => {
    if (scrollable) return data;
    const screenWidth = Dimensions.get("window").width;
    const containerPadding = 32;
    const cardPadding = 48;
    const availableWidth = screenWidth - containerPadding - cardPadding - yAxisWidth;
    const maxBars = Math.floor(availableWidth / barTotalWidth);
    return data.slice(-maxBars);
  }, [data, yAxisWidth, barTotalWidth, scrollable]);

  // Scroll to end when scrollable
  useEffect(() => {
    if (scrollable && scrollRef.current) {
      setTimeout(() => scrollRef.current?.scrollToEnd({ animated: false }), 50);
    }
  }, [scrollable, visibleData.length]);

  const barsContent = (
    <View style={[
      scrollable ? styles.barsRowScrollable : styles.barsRow,
      scrollable && { width: visibleData.length * barTotalWidth + BAR_GAP },
    ]}>
      {visibleData.map((monthData, monthIndex) => {
        // Calculate total height for positive balances
        const positiveTotal = monthData.accounts.reduce(
          (sum, acc) => sum + Math.max(0, acc.balance),
          0
        );
        const barHeightPercent = (positiveTotal / maxValue) * 100;

        const handleBarPress = () => {
          if (onBarPress) {
            Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
            onBarPress(monthData);
          }
        };

        return (
          <TouchableOpacity
            key={monthIndex}
            style={scrollable ? [styles.barColumnFixed, { width: barWidth, marginHorizontal: BAR_GAP / 2 }] : styles.barColumn}
            onPress={handleBarPress}
            activeOpacity={onBarPress ? 0.7 : 1}
          >
            {/* Spacer to push bar down */}
            <View style={{ flex: 100 - Math.min(barHeightPercent, 100) }} />
            {/* Stacked bar */}
            <View
              style={[
                styles.bar,
                {
                  width: Math.max(barWidth, 20),
                  flex: Math.max(Math.min(barHeightPercent, 100), 0.1),
                },
              ]}
            >
              {monthData.accounts
                .filter((acc) => acc.balance > 0)
                .map((account, accIndex) => {
                  const segmentHeight =
                    (account.balance / positiveTotal) * 100;
                  return (
                    <View
                      key={accIndex}
                      style={[
                        styles.barSegment,
                        {
                          backgroundColor: account.color,
                          height: `${segmentHeight}%`,
                        },
                      ]}
                    />
                  );
                })}
            </View>

            {/* Label */}
            {showLabels && (
              <View style={styles.xAxisLabelContainer}>
                {viewMode === "months" ? (
                  <>
                    <Text
                      style={[styles.xAxisLabel, { color: subtleTextColor }]}
                    >
                      {getShortMonthLabel(monthData.monthIndex)}
                    </Text>
                    <Text
                      style={[styles.xAxisLabelYear, { color: subtleTextColor }]}
                    >
                      {String(monthData.year).slice(-2)}
                    </Text>
                  </>
                ) : (
                  <>
                    <Text
                      style={[styles.xAxisLabel, { color: subtleTextColor }]}
                    >
                      {String(monthData.year).slice(0, 2)}
                    </Text>
                    <Text
                      style={[styles.xAxisLabelYear, { color: subtleTextColor }]}
                    >
                      {String(monthData.year).slice(-2)}
                    </Text>
                  </>
                )}
              </View>
            )}
          </TouchableOpacity>
        );
      })}
    </View>
  );

  return (
    <View style={styles.container}>
      {/* Legend */}
      {showLegend && (
        <View style={styles.legendContainer}>
          {uniqueAccounts.map((account, index) => (
            <View key={index} style={styles.legendItem}>
              <View
                style={[
                  styles.legendColor,
                  { backgroundColor: account.color },
                ]}
              />
              <Text
                style={[styles.legendText, { color: subtleTextColor }]}
                numberOfLines={1}
              >
                {account.name}
              </Text>
            </View>
          ))}
        </View>
      )}

      {/* Chart area */}
      <View style={[styles.chartContainer, scrollable ? { flex: 1 } : { height: chartHeight }]}>
        {/* Y-Axis */}
        {showYAxis && (
          <View style={[styles.yAxis, { width: yAxisWidth }]}>
            {yAxisLabels
              .slice()
              .reverse()
              .map((label, index) => (
                <Text
                  key={index}
                  style={[styles.yAxisLabel, { color: subtleTextColor }]}
                >
                  {label}
                </Text>
              ))}
          </View>
        )}

        {/* Bars area */}
        <View style={styles.barsContainer}>
          {/* Grid lines - skip the bottom line (0) */}
          <View style={styles.gridContainer}>
            {yAxisLabels.slice(1).map((_, index) => (
              <View
                key={index}
                style={[
                  styles.gridLine,
                  { borderColor: subtleTextColor, opacity: 0.2 },
                ]}
              />
            ))}
          </View>

          {scrollable ? (
            <ScrollView
              ref={scrollRef}
              horizontal
              showsHorizontalScrollIndicator={false}
              style={styles.scrollContainer}
              contentContainerStyle={styles.scrollContent}
            >
              {barsContent}
            </ScrollView>
          ) : (
            barsContent
          )}
        </View>
      </View>

      {/* Total value display */}
      {showTotal && data.length > 0 && (
        <View style={styles.totalContainer}>
          <Text style={[styles.totalLabel, { color: subtleTextColor }]}>
            Current Total:
          </Text>
          <Text style={[styles.totalValue, { color: textColor }]}>
            €
            {data[data.length - 1].totalBalance.toLocaleString("it-IT", {
              minimumFractionDigits: 2,
              maximumFractionDigits: 2,
            })}
          </Text>
        </View>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    width: "100%",
    justifyContent: "center",
  },
  emptyContainer: {
    justifyContent: "center",
    alignItems: "center",
  },
  emptyText: {
    fontSize: 14,
  },
  legendContainer: {
    flexDirection: "row",
    flexWrap: "wrap",
    marginBottom: 12,
    gap: 12,
  },
  legendItem: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
  },
  legendColor: {
    width: 12,
    height: 12,
    borderRadius: 3,
  },
  legendText: {
    fontSize: 12,
    maxWidth: 80,
  },
  chartContainer: {
    flexDirection: "row",
    alignSelf: "stretch",
    padding: 0,
    paddingVertical: 4,
  },
  yAxis: {
    justifyContent: "space-between",
    alignItems: "flex-end",
    paddingRight: 2,
    paddingVertical: 10,
    paddingBottom: 25,
  },
  yAxisLabel: {
    fontSize: 9,
  },
  barsContainer: {
    flex: 1,
    position: "relative",
    paddingTop: 20,
  },
  gridContainer: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    justifyContent: "space-between",
  },
  gridLine: {
    height: 1,
    borderStyle: "dashed",
  },
  scrollContainer: {
    flex: 1,
  },
  scrollContent: {
    flexGrow: 1,
    alignItems: "stretch",
  },
  barsRow: {
    flex: 1,
    flexDirection: "row",
    alignItems: "stretch",
    justifyContent: "space-evenly",
    paddingBottom: 0,
  },
  barsRowScrollable: {
    flex: 1,
    flexDirection: "row",
    alignItems: "stretch",
  },
  barColumn: {
    flex: 1,
    alignItems: "center",
  },
  barColumnFixed: {
    alignItems: "center",
  },
  bar: {
    borderRadius: 8,
    overflow: "hidden",
    flexDirection: "column-reverse",
    minHeight: 2,
  },
  barSegment: {
    width: "100%",
  },
  xAxisLabelContainer: {
    alignItems: "center",
    marginTop: 4,
  },
  xAxisLabel: {
    fontSize: 10,
    lineHeight: 12,
  },
  xAxisLabelYear: {
    fontSize: 9,
    lineHeight: 11,
    opacity: 0.7,
  },
  totalContainer: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    alignSelf: "stretch",
    marginTop: 16,
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: "rgba(128, 128, 128, 0.2)",
  },
  totalLabel: {
    fontSize: 14,
  },
  totalValue: {
    fontSize: 18,
    fontWeight: "600",
  },
});

export default StackedBarChart;
