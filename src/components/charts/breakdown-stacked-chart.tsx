/**
 * Breakdown Stacked Bar Chart component
 *
 * Renders stacked bars showing category or account breakdown per period.
 */

import React, { useMemo, useRef, useEffect } from "react";
import { View, Text, StyleSheet, TouchableOpacity, Dimensions, ScrollView } from "react-native";
import * as Haptics from "expo-haptics";
import { useThemeColor } from "@/src/hooks/use-theme-color";
import { PeriodBreakdownData } from "@/src/hooks/useCategoryAccountBreakdown";
import { getShortMonthLabel } from "@/src/hooks/useMonthlyBalances";

interface BreakdownStackedChartProps {
  data: PeriodBreakdownData[];
  height?: number;
  showLabels?: boolean;
  showYAxis?: boolean;
  onBarPress?: (data: PeriodBreakdownData) => void;
  viewMode?: "months" | "years";
  scrollable?: boolean;
}

const BAR_WIDTH = 26;
const BAR_GAP = 12;

const BreakdownStackedChart: React.FC<BreakdownStackedChartProps> = ({
  data,
  height = 220,
  showLabels = true,
  showYAxis = true,
  onBarPress,
  viewMode = "months",
  scrollable = false,
}) => {
  const subtleTextColor = useThemeColor({}, "tabIconDefault");
  const scrollRef = useRef<ScrollView>(null);

  const chartHeight = height - (showLabels ? 20 : 0);
  const yAxisWidth = showYAxis ? 24 : 0;

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

  // Scroll to end when scrollable
  useEffect(() => {
    if (scrollable && scrollRef.current) {
      setTimeout(() => scrollRef.current?.scrollToEnd({ animated: false }), 50);
    }
  }, [scrollable, visibleData.length]);

  if (data.length === 0) {
    return (
      <View style={[styles.emptyContainer, { height }]}>
        <Text style={[styles.emptyText, { color: subtleTextColor }]}>
          No data available
        </Text>
      </View>
    );
  }

  const barsContent = (
    <View style={[
      scrollable ? styles.barsRowScrollable : styles.barsRow,
      scrollable && { width: visibleData.length * barTotalWidth + BAR_GAP },
    ]}>
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
            style={scrollable ? [styles.barColumnFixed, { width: barWidth, marginHorizontal: BAR_GAP / 2 }] : styles.barColumn}
            onPress={handlePress}
            activeOpacity={onBarPress ? 0.7 : 1}
          >
            {/* Spacer to push bar down */}
            <View style={{ flex: 100 - Math.min(barHeightPercent, 100) }} />
            {/* Stacked bar */}
            <View
              style={[
                styles.bar,
                {
                  width: barWidth,
                  flex: Math.max(Math.min(barHeightPercent, 100), 0.1),
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
  );

  return (
    <View style={styles.container}>
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
});

export default BreakdownStackedChart;
