import React from "react";
import { View, Text, StyleSheet } from "react-native";
import Card from "../card";
import ChartSkeleton from "../charts/ChartSkeleton";
import { useThemeColor } from "@/hooks/use-theme-color";
import { useDataContext } from "@/state/DataProvider";
import type { MonthlyForecast } from "@/hooks/useMyBalanceData";

type Props = {
  forecast: MonthlyForecast;
  isTransitioning?: boolean;
};

const ForecastCard: React.FC<Props> = ({
  forecast,
  isTransitioning = false,
}) => {
  const { isLoading } = useDataContext();

  const textColor = useThemeColor({}, "text");
  const subtleTextColor = useThemeColor({}, "tabIconDefault");
  const cardBackground = useThemeColor({}, "cardBackground");

  const formatAmount = (amount: number) => {
    return `€${Math.abs(amount).toLocaleString("it-IT", {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    })}`;
  };

  const formatCompact = (amount: number) => {
    const abs = Math.abs(amount);
    if (abs >= 1000) {
      return `${(amount / 1000).toFixed(1)}k`;
    }
    return amount.toFixed(0);
  };

  const {
    periodType,
    currentBalance,
    currentMonthIncome,
    currentMonthExpense,
    pendingRecurringIncome,
    pendingRecurringExpense,
    avgMonthlyIncome,
    avgMonthlyExpense,
  } = forecast;

  const isYearlyForecast = periodType === "year";

  // Get current date info
  const now = new Date();
  const currentDay = now.getDate();
  const daysInMonth = new Date(
    now.getFullYear(),
    now.getMonth() + 1,
    0
  ).getDate();

  // Calculate the expected end date
  const getExpectedEndDate = () => {
    const months = [
      "January",
      "February",
      "March",
      "April",
      "May",
      "June",
      "July",
      "August",
      "September",
      "October",
      "November",
      "December",
    ];

    if (isYearlyForecast) {
      return "31 December";
    } else {
      return `${daysInMonth} ${months[now.getMonth()]}`;
    }
  };

  const expectedEndDate = getExpectedEndDate();

  // Calculate expected remaining (from historical average)
  // Subtract both current and pending from the average to avoid double counting
  const expectedRemainingIncome = Math.max(
    0,
    avgMonthlyIncome - currentMonthIncome - pendingRecurringIncome
  );
  const expectedRemainingExpense = Math.max(
    0,
    avgMonthlyExpense - currentMonthExpense - pendingRecurringExpense
  );

  // Total expected income/expense at end of month
  const forecastedMonthlyIncome =
    currentMonthIncome + pendingRecurringIncome + expectedRemainingIncome;
  const forecastedMonthlyExpense =
    currentMonthExpense + pendingRecurringExpense + expectedRemainingExpense;

  // The displayed delta should match the displayed income/expense totals
  const displayedDelta = forecastedMonthlyIncome - forecastedMonthlyExpense;
  const isPositiveDelta = displayedDelta >= 0;

  // For the forecast: balance at end of month
  const displayForecastBalance = currentBalance + displayedDelta;

  // Calculate daily progression for remaining days (from today to end of month)
  const remainingDays = daysInMonth - currentDay + 1; // Including today
  
  // Distribute pending recurring and expected remaining across future days
  const futureIncome = pendingRecurringIncome + expectedRemainingIncome;
  const futureExpense = pendingRecurringExpense + expectedRemainingExpense;
  const futureNetChange = futureIncome - futureExpense;
  const dailyFutureChange = remainingDays > 1 ? futureNetChange / (remainingDays - 1) : 0;

  // Calculate what happened in the past
  const pastDays = currentDay - 1;
  const pastNetChange = currentMonthIncome - currentMonthExpense;
  
  // Starting balance at beginning of month (work backwards from current balance)
  const monthStartBalance = currentBalance - pastNetChange;
  
  // For past days, distribute the change linearly (we don't have daily details)
  const dailyPastChange = pastDays > 0 ? pastNetChange / pastDays : 0;

  // Create array of daily data points for the ENTIRE month
  const dailyData = Array.from({ length: daysInMonth }, (_, i) => {
    const day = i + 1;
    const isToday = day === currentDay;
    const isPast = day < currentDay;
    const isFuture = day > currentDay;
    
    let balance: number;
    
    if (isPast) {
      // Past days: linear progression from start to yesterday
      balance = monthStartBalance + (dailyPastChange * day);
    } else if (isToday) {
      balance = currentBalance;
    } else {
      // Future days: linear progression from today to end of month
      const daysFromToday = day - currentDay;
      balance = currentBalance + (dailyFutureChange * daysFromToday);
    }
    
    return { day, balance, isToday, isPast, isFuture };
  });

  // Calculate scale for the chart
  const allBalances = dailyData.map((d) => d.balance);
  const minBalance = Math.min(...allBalances);
  const maxBalance = Math.max(...allBalances);
  const balanceRange = maxBalance - minBalance;
  const padding = Math.max(balanceRange * 0.2, 100);
  const scaleMin = minBalance - padding;
  const scaleMax = maxBalance + padding;
  const scaleRange = scaleMax - scaleMin;

  const showSkeleton = (isLoading && currentBalance === 0) || isTransitioning;

  // Determine bar width based on number of days in month (more space without Y-axis)
  const barWidth = Math.max(4, Math.min(12, 320 / daysInMonth - 1));
  const barGap = 0.5;

  if (showSkeleton) {
    return (
      <Card backgroundColor={cardBackground} color={textColor}>
        <ChartSkeleton variant="forecast" height={200} />
      </Card>
    );
  }

  return (
    <Card backgroundColor={cardBackground} color={textColor}>
      <View style={{ height: 200 }}>
        {/* Header with Forecast label and change value */}
        <View style={styles.headerRow}>
          <View style={{ flexDirection: "row", alignItems: "baseline" }}>
            <Text style={[styles.forecastLabel, { color: textColor }]}>
              Forecast
            </Text>
            <Text
              style={{ color: "lightgray", fontSize: 10, marginLeft: 6 }}
            >
              {expectedEndDate}
            </Text>
          </View>

          <View style={styles.headerRight}>
            <Text
              style={[
                styles.changeAmount,
                { color: isPositiveDelta ? "#4CAF50" : "#F44336" },
              ]}
            >
              {isPositiveDelta ? "+" : ""}
              {formatAmount(displayedDelta)}
            </Text>
          </View>
        </View>

        {/* Daily Bar Chart */}
        <View style={styles.chartSection}>
          {/* Chart area - no Y-axis labels for more width */}
          <View style={styles.chartArea}>
            {/* Bars container */}
            <View style={styles.barsContainer}>
              {dailyData.map((data, index) => {
                const heightPercent =
                  ((data.balance - scaleMin) / scaleRange) * 100;
                
                // Color logic:
                // - Past days: Green (completed/actual data)
                // - Today: Dark green (current position)
                // - Future days: Light gray/green if positive, light red if negative
                let barColor: string;
                let opacity: number;
                
                if (data.isPast) {
                  barColor = "#66BB6A"; // Green for past days
                  opacity = 0.85;
                } else if (data.isToday) {
                  barColor = "#2E7D32"; // Dark green for today
                  opacity = 1;
                } else {
                  // Future days - light colors based on forecast
                  barColor = isPositiveDelta ? "#A5D6A7" : "#EF9A9A";
                  opacity = 0.7;
                }

                return (
                  <View
                    key={data.day}
                    style={[
                      styles.barWrapper,
                      { width: barWidth, marginHorizontal: barGap / 2 },
                    ]}
                  >
                    <View
                      style={[
                        styles.bar,
                        {
                          height: `${Math.max(heightPercent, 2)}%`,
                          backgroundColor: barColor,
                          opacity: opacity,
                        },
                      ]}
                    />
                  </View>
                );
              })}
            </View>
          </View>
        </View>

        {/* Month Timeline Labels */}
        <View style={styles.timelineLabels}>
          <Text style={[styles.timelineLabel, { color: subtleTextColor }]}>
            1 {now.toLocaleDateString("en-US", { month: "short" })}: {formatCompact(monthStartBalance)}
          </Text>
          <Text style={[styles.timelineLabel, { color: textColor, fontWeight: "600" }]}>
            Today: {formatCompact(currentBalance)}
          </Text>
          <Text style={[styles.timelineLabel, { color: subtleTextColor }]}>
            {daysInMonth} {now.toLocaleDateString("en-US", { month: "short" })}: {formatCompact(displayForecastBalance)}
          </Text>
        </View>

        {/* Details Section - Expected Incomes and Outcomes */}
        <View style={styles.detailsSection}>
          <View style={styles.detailRow}>
            <View style={styles.detailLabel}>
              <View
                style={[styles.colorIndicator, { backgroundColor: "#4CAF50" }]}
              />
              <Text style={[styles.detailText, { color: textColor }]}>
                Expected Incomes
              </Text>
            </View>
            <View style={styles.detailValue}>
              <Text style={[styles.detailAmount, { color: textColor }]}>
                {formatAmount(forecastedMonthlyIncome)}
              </Text>
            </View>
          </View>

          <View style={styles.detailRow}>
            <View style={styles.detailLabel}>
              <View
                style={[styles.colorIndicator, { backgroundColor: "#F44336" }]}
              />
              <Text style={[styles.detailText, { color: textColor }]}>
                Expected Outcomes
              </Text>
            </View>
            <View style={styles.detailValue}>
              <Text style={[styles.detailAmount, { color: textColor }]}>
                {formatAmount(forecastedMonthlyExpense)}
              </Text>
            </View>
          </View>
        </View>
      </View>
    </Card>
  );
};

const styles = StyleSheet.create({
  headerRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    height: 28,
    marginBottom: 8,
  },
  forecastLabel: {
    fontSize: 22,
    fontWeight: "500",
  },
  headerRight: {
    alignItems: "flex-end",
  },
  changeAmount: {
    fontSize: 24,
    fontWeight: "bold",
  },
  chartSection: {
    flexDirection: "row",
    height: 70,
    marginBottom: 4,
  },
  yAxisLabels: {
    width: 35,
    justifyContent: "space-between",
    alignItems: "flex-end",
    paddingRight: 4,
  },
  axisLabel: {
    fontSize: 9,
  },
  chartArea: {
    flex: 1,
  },
  barsContainer: {
    flex: 1,
    flexDirection: "row",
    alignItems: "flex-end",
    justifyContent: "center",
  },
  barWrapper: {
    height: "100%",
    justifyContent: "flex-end",
  },
  bar: {
    width: "100%",
    borderTopLeftRadius: 2,
    borderTopRightRadius: 2,
  },
  timelineLabels: {
    flexDirection: "row",
    justifyContent: "space-between",
    paddingHorizontal: 8,
    marginTop: 6,
    marginBottom: 4,
  },
  timelineLabel: {
    fontSize: 10,
  },
  balanceLabels: {
    flexDirection: "row",
    justifyContent: "space-around",
    marginBottom: 8,
  },
  balanceLabelItem: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
  },
  balanceDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  balanceLabelText: {
    fontSize: 11,
  },
  detailsSection: {
    gap: 8,
    paddingHorizontal: 4,
  },
  detailRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingHorizontal: 8,
    height: 24,
  },
  detailLabel: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  colorIndicator: {
    width: 12,
    height: 12,
    borderRadius: 6,
  },
  detailText: {
    fontSize: 14,
    fontWeight: "500",
  },
  detailValue: {
    alignItems: "flex-end",
  },
  detailAmount: {
    fontSize: 14,
    fontWeight: "600",
  },
});

export default ForecastCard;
