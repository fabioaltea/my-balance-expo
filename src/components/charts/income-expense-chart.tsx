/**
 * Income/Expense Bar Chart component
 *
 * Renders side-by-side bars for income (green) and expenses (red) per period.
 */

import React, { useMemo, useRef, useEffect } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Dimensions, ScrollView } from 'react-native';
import * as Haptics from 'expo-haptics';
import { useThemeColor } from '@/src/hooks/use-theme-color';
import type { IncomeExpenseData } from '@/src/types/charts';
import { getShortMonthLabel } from '@/src/helpers/ChartDataHelper';

interface IncomeExpenseChartProps {
  data: IncomeExpenseData[];
  height?: number;
  showLabels?: boolean;
  showYAxis?: boolean;
  onBarPress?: (data: IncomeExpenseData) => void;
  viewMode?: 'months' | 'years';
  scrollable?: boolean;
}

const INCOME_COLOR = '#4CAF50';
const EXPENSE_COLOR = '#F44336';

const BAR_WIDTH = 12;
const BAR_GAP = 2;
const PAIR_GAP = 12;

const IncomeExpenseChart: React.FC<IncomeExpenseChartProps> = ({
  data,
  height = 220,
  showLabels = true,
  showYAxis = true,
  onBarPress,
  viewMode = 'months',
  scrollable = false,
}) => {
  const subtleTextColor = useThemeColor({}, 'tabIconDefault');
  const scrollRef = useRef<ScrollView>(null);

  // Calculate chart dimensions
  const chartHeight = height - (showLabels ? 20 : 0);
  const yAxisWidth = showYAxis ? 24 : 0;

  // Fixed bar dimensions
  const singleBarWidth = BAR_WIDTH;
  const barGap = BAR_GAP;
  const pairWidth = singleBarWidth * 2 + barGap;
  const pairMargin = PAIR_GAP;
  const totalPairWidth = pairWidth + pairMargin;

  // Calculate visible data
  const visibleData = useMemo(() => {
    if (scrollable) return data;
    const screenWidth = Dimensions.get('window').width;
    const containerPadding = 32;
    const cardPadding = 48;
    const availableWidth = screenWidth - containerPadding - cardPadding - yAxisWidth;
    const maxPairs = Math.floor(availableWidth / totalPairWidth);
    return data.slice(-maxPairs);
  }, [data, yAxisWidth, totalPairWidth, scrollable]);

  // Find the max value for scaling
  const { maxValue, yAxisLabels } = useMemo(() => {
    if (visibleData.length === 0) return { maxValue: 0, yAxisLabels: [] };

    const maxTotal = Math.max(...visibleData.map((d) => Math.max(d.income, d.expenses)));

    const roundedMax = Math.ceil(maxTotal / 1000) * 1000;
    const step = roundedMax / 4;
    const labels = [0, step, step * 2, step * 3, roundedMax].map((v) =>
      v >= 1000 ? `${(v / 1000).toFixed(0)}k` : v.toString(),
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
        <Text style={[styles.emptyText, { color: subtleTextColor }]}>No data available</Text>
      </View>
    );
  }

  const barsContent = (
    <View
      style={[
        scrollable ? styles.barsRowScrollable : styles.barsRow,
        scrollable && { width: visibleData.length * (pairWidth + PAIR_GAP) + PAIR_GAP },
      ]}
    >
      {visibleData.map((periodData, index) => {
        const incomeHeight = (periodData.income / maxValue) * 100;
        const expenseHeight = (periodData.expenses / maxValue) * 100;

        const handlePress = () => {
          if (onBarPress) {
            Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
            onBarPress(periodData);
          }
        };

        return (
          <TouchableOpacity
            key={index}
            style={
              scrollable
                ? [styles.barPairColumnFixed, { width: pairWidth, marginHorizontal: PAIR_GAP / 2 }]
                : styles.barPairColumn
            }
            onPress={handlePress}
            activeOpacity={onBarPress ? 0.7 : 1}
          >
            {/* Bar pair container */}
            <View style={styles.barPair}>
              {/* Income column */}
              <View style={{ flex: 1, marginRight: barGap }}>
                <View style={{ flex: 100 - Math.min(incomeHeight, 100) }} />
                <View
                  style={[
                    styles.bar,
                    {
                      width: singleBarWidth,
                      flex: Math.max(Math.min(incomeHeight, 100), 0.1),
                      backgroundColor: INCOME_COLOR,
                    },
                  ]}
                />
              </View>
              {/* Expense column */}
              <View style={{ flex: 1 }}>
                <View style={{ flex: 100 - Math.min(expenseHeight, 100) }} />
                <View
                  style={[
                    styles.bar,
                    {
                      width: singleBarWidth,
                      flex: Math.max(Math.min(expenseHeight, 100), 0.1),
                      backgroundColor: EXPENSE_COLOR,
                    },
                  ]}
                />
              </View>
            </View>

            {/* Label */}
            {showLabels && (
              <View style={styles.xAxisLabelContainer}>
                {viewMode === 'months' ? (
                  <>
                    <Text style={[styles.xAxisLabel, { color: subtleTextColor }]}>
                      {getShortMonthLabel(periodData.monthIndex)}
                    </Text>
                    <Text style={[styles.xAxisLabelYear, { color: subtleTextColor }]}>
                      {String(periodData.year).slice(-2)}
                    </Text>
                  </>
                ) : (
                  <>
                    <Text style={[styles.xAxisLabel, { color: subtleTextColor }]}>
                      {String(periodData.year).slice(0, 2)}
                    </Text>
                    <Text style={[styles.xAxisLabelYear, { color: subtleTextColor }]}>
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
      {/* Chart area */}
      <View style={[styles.chartContainer, scrollable ? { flex: 1 } : { height: chartHeight }]}>
        {/* Y-Axis */}
        {showYAxis && (
          <View style={[styles.yAxis, { width: yAxisWidth }]}>
            {yAxisLabels
              .slice()
              .reverse()
              .map((label, index) => (
                <Text key={index} style={[styles.yAxisLabel, { color: subtleTextColor }]}>
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
                style={[styles.gridLine, { borderColor: subtleTextColor, opacity: 0.2 }]}
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
    width: '100%',
    justifyContent: 'center',
  },
  emptyContainer: {
    justifyContent: 'center',
    alignItems: 'center',
  },
  emptyText: {
    fontSize: 14,
  },
  chartContainer: {
    flexDirection: 'row',
    alignSelf: 'stretch',
    padding: 0,
    paddingVertical: 4,
  },
  yAxis: {
    justifyContent: 'space-between',
    alignItems: 'flex-end',
    paddingRight: 2,
    paddingVertical: 10,
    paddingBottom: 25,
  },
  yAxisLabel: {
    fontSize: 9,
  },
  barsContainer: {
    flex: 1,
    position: 'relative',
    paddingTop: 20,
  },
  gridContainer: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    justifyContent: 'space-between',
  },
  gridLine: {
    height: 1,
    borderStyle: 'dashed',
  },
  scrollContainer: {
    flex: 1,
  },
  scrollContent: {
    flexGrow: 1,
    alignItems: 'stretch',
  },
  barsRow: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'stretch',
    justifyContent: 'space-evenly',
    paddingBottom: 0,
  },
  barsRowScrollable: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'stretch',
  },
  barPairColumn: {
    flex: 1,
    alignItems: 'center',
  },
  barPairColumnFixed: {
    alignItems: 'center',
  },
  barPair: {
    flexDirection: 'row',
    alignItems: 'stretch',
    flex: 1,
  },
  bar: {
    borderRadius: 4,
    minHeight: 2,
  },
  xAxisLabelContainer: {
    alignItems: 'center',
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

export default IncomeExpenseChart;
