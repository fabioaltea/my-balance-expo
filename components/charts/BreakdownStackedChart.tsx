/**
 * Breakdown Stacked Bar Chart component
 *
 * Renders stacked bars showing category or account breakdown per period.
 */

import React, { useMemo } from "react";
import { View, Text, StyleSheet, TouchableOpacity, Dimensions } from "react-native";
import * as Haptics from "expo-haptics";
import { useThemeColor } from "@/hooks/use-theme-color";
import { PeriodBreakdownData } from "@/hooks/useCategoryAccountBreakdown";
import { getShortMonthLabel } from "@/hooks/useMonthlyBalances";

interface BreakdownStackedChartProps {
  data: PeriodBreakdownData[];
  height?: number;
  showLabels?: boolean;
  showYAxis?: boolean;
  onBarPress?: (data: PeriodBreakdownData) => void;
  viewMode?: "months" | "years";
}

const BreakdownStackedChart: React.FC<BreakdownStackedChartProps> = ({
  data,
  height = 220,
  showLabels = true,
  showYAxis = true,
  onBarPress,
  viewMode = "months",
}) => {
  const subtleTextColor = useThemeColor({}, "tabIconDefault");

  const chartHeight = height - (showLabels ? 20 : 0);
  const yAxisWidth = showYAxis ? 24 : 0;

  const barWidth = 26;
  const barMargin = 8;
  const barTotalWidth = barWidth + barMargin;

  // Calculate how many bars can fit
  const visibleData = useMemo(() => {
    const screenWidth = Dimensions.get("window").width;
    const containerPadding = 32;
    const cardPadding = 48;
    const availableWidth = screenWidth - containerPadding - cardPadding - yAxisWidth;
    const maxBars = Math.floor(availableWidth / barTotalWidth);
    return data.slice(-maxBars);
  }, [data, yAxisWidth, barTotalWidth]);

  // Find max value and Y-axis labels
  const { maxValue, yAxisLabels } = useMemo(() => {
    if (visibleData.length === 0) return { maxValue: 0, yAxisLabels: [] };

    const maxTotal = Math.max(...visibleData.map((d) => d.total));
    const roundedMax = Math.ceil(maxTotal / 1000) * 1000;
    const step = roundedMax / 4;
    const labels = [0, step, step * 2, step * 3, roundedMax].map((v) =>
      v >= 1000 ? `${(v / 1000).toFixed(0)}k` : v.toString()
    );

    return { maxValue: roundedMax || 1000, yAxisLabels: labels };
  }, [visibleData]);

  if (data.length === 0) {
    return (
      <View style={[styles.emptyContainer, { height }]}>
        <Text style={[styles.emptyText, { color: subtleTextColor }]}>
          No data available
        </Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <View style={[styles.chartContainer, { height: chartHeight }]}>
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
          {/* Grid lines */}
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

          {/* Bars */}
          <View style={styles.barsRow}>
            {visibleData.map((periodData, periodIndex) => {
              const barHeightPercent = (periodData.total / maxValue) * 100;

              const handlePress = () => {
                if (onBarPress) {
                  Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                  onBarPress(periodData);
                }
              };

              return (
                <TouchableOpacity
                  key={periodIndex}
                  style={styles.barColumn}
                  onPress={handlePress}
                  activeOpacity={onBarPress ? 0.7 : 1}
                >
                  {/* Stacked bar */}
                  <View
                    style={[
                      styles.bar,
                      {
                        width: barWidth,
                        height: `${Math.min(barHeightPercent, 100)}%`,
                      },
                    ]}
                  >
                    {periodData.items.map((item, itemIndex) => {
                      const segmentHeight = periodData.total > 0
                        ? (item.amount / periodData.total) * 100
                        : 0;
                      return (
                        <View
                          key={itemIndex}
                          style={[
                            styles.barSegment,
                            {
                              backgroundColor: item.color,
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
                            {getShortMonthLabel(periodData.monthIndex)}
                          </Text>
                          <Text
                            style={[styles.xAxisLabelYear, { color: subtleTextColor }]}
                          >
                            {String(periodData.year).slice(-2)}
                          </Text>
                        </>
                      ) : (
                        <>
                          <Text
                            style={[styles.xAxisLabel, { color: subtleTextColor }]}
                          >
                            {String(periodData.year).slice(0, 2)}
                          </Text>
                          <Text
                            style={[styles.xAxisLabelYear, { color: subtleTextColor }]}
                          >
                            {String(periodData.year).slice(-2)}
                          </Text>
                        </>
                      )}
                    </View>
                  )}
                </TouchableOpacity>
              );
            })}
          </View>
        </View>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    width: "100%",
    alignItems: "center",
  },
  emptyContainer: {
    justifyContent: "center",
    alignItems: "center",
  },
  emptyText: {
    fontSize: 14,
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
  barsRow: {
    flex: 1,
    flexDirection: "row",
    alignItems: "flex-end",
    justifyContent: "flex-end",
    paddingBottom: 0,
  },
  barColumn: {
    alignItems: "center",
    justifyContent: "flex-end",
    marginHorizontal: 4,
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
});

export default BreakdownStackedChart;
