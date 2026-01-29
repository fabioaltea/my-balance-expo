import React from "react";
import { View, Text, StyleSheet } from "react-native";
import Card from "../core/card";
import ChartSkeleton from "../charts/chart-skeleton";
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
  const currentMonth = now.getMonth(); // 0-11
  const daysInMonth = new Date(
    now.getFullYear(),
    now.getMonth() + 1,
    0,
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
    avgMonthlyIncome - currentMonthIncome - pendingRecurringIncome,
  );
  const expectedRemainingExpense = Math.max(
    0,
    avgMonthlyExpense - currentMonthExpense - pendingRecurringExpense,
  );

  // Total expected income/expense at end of month
  const forecastedMonthlyIncome =
    currentMonthIncome + pendingRecurringIncome + expectedRemainingIncome;
  const forecastedMonthlyExpense =
    currentMonthExpense + pendingRecurringExpense + expectedRemainingExpense;

  // The displayed delta should match the displayed income/expense totals
  const displayedDelta = forecastedMonthlyIncome - forecastedMonthlyExpense;
  const isPositiveDelta = displayedDelta >= 0;

  // For the forecast: balance at end of month/year
  const displayForecastBalance = isYearlyForecast
    ? currentBalance + displayedDelta * (12 - currentMonth)
    : currentBalance + displayedDelta;

  let chartData: Array<{
    period: number;
    balance: number;
    isCurrent: boolean;
    isPast: boolean;
    isFuture: boolean;
  }>;
  let scaleMin: number;
  let scaleMax: number;
  let scaleRange: number;
  let barWidth: number;
  let barGap: number;
  let startLabel: string;
  let currentLabel: string;
  let endLabel: string;

  if (isYearlyForecast) {
    // YEARLY VIEW - 12 bars (one per month)
    const monthlyDelta = displayedDelta; // Expected monthly change
    
    // Calculate how much of the current month has passed
    const progressInCurrentMonth = currentDay / daysInMonth;
    const currentMonthAccrued = monthlyDelta * progressInCurrentMonth;
    
    // Year start balance (1 January) - subtract what's already happened this month
    const yearStartBalance = currentBalance - currentMonthAccrued;
    
    // End of year balance (31 December)
    const yearEndBalance = yearStartBalance + (monthlyDelta * 12);
    
    // Create 12 monthly data points
    chartData = Array.from({ length: 12 }, (_, i) => {
      const month = i;
      const isCurrent = month === currentMonth;
      const isPast = month < currentMonth;
      const isFuture = month > currentMonth;
      
      let balance: number;
      
      if (isPast) {
        // Past months: end-of-month balance (linear progression)
        balance = yearStartBalance + (monthlyDelta * (month + 1));
      } else if (isCurrent) {
        // Current month: use actual current balance
        balance = currentBalance;
      } else {
        // Future months: end-of-month balance (linear progression from current)
        balance = currentBalance + (monthlyDelta * (month - currentMonth));
      }
      
      return { period: month, balance, isCurrent, isPast, isFuture };
    });

    barWidth = Math.max(10, Math.min(24, 320 / 12 - 2));
    barGap = 2;
    
    const monthNames = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
    startLabel = `${monthNames[0]}: ${formatCompact(yearStartBalance + monthlyDelta)}`;
    currentLabel = `${monthNames[currentMonth]}: ${formatCompact(currentBalance)}`;
    endLabel = `${monthNames[11]}: ${formatCompact(yearEndBalance)}`;
  } else {
    // MONTHLY VIEW - bars for each day
    const remainingDays = daysInMonth - currentDay + 1;
    const futureIncome = pendingRecurringIncome + expectedRemainingIncome;
    const futureExpense = pendingRecurringExpense + expectedRemainingExpense;
    const futureNetChange = futureIncome - futureExpense;
    const dailyFutureChange = remainingDays > 1 ? futureNetChange / (remainingDays - 1) : 0;
    
    const pastDays = currentDay - 1;
    const pastNetChange = currentMonthIncome - currentMonthExpense;
    const monthStartBalance = currentBalance - pastNetChange;
    const dailyPastChange = pastDays > 0 ? pastNetChange / pastDays : 0;

    chartData = Array.from({ length: daysInMonth }, (_, i) => {
      const day = i + 1;
      const isCurrent = day === currentDay;
      const isPast = day < currentDay;
      const isFuture = day > currentDay;

      let balance: number;

      if (isPast) {
        balance = monthStartBalance + dailyPastChange * day;
      } else if (isCurrent) {
        balance = currentBalance;
      } else {
        const daysFromToday = day - currentDay;
        balance = currentBalance + dailyFutureChange * daysFromToday;
      }

      return { period: day, balance, isCurrent, isPast, isFuture };
    });

    barWidth = Math.max(4, Math.min(12, 320 / daysInMonth - 1));
    barGap = 0.5;
    
    startLabel = `1 ${now.toLocaleDateString("en-US", { month: "short" })}: ${formatCompact(monthStartBalance)}`;
    currentLabel = `Today: ${formatCompact(currentBalance)}`;
    endLabel = `${daysInMonth} ${now.toLocaleDateString("en-US", { month: "short" })}: ${formatCompact(displayForecastBalance)}`;
  }

  // Calculate scale for the chart
  const allBalances = chartData.map((d) => d.balance);
  scaleMin = Math.min(...allBalances);
  scaleMax = Math.max(...allBalances);
  const balanceRange = scaleMax - scaleMin;
  const padding = Math.max(balanceRange * 0.2, 100);
  scaleMin = scaleMin - padding;
  scaleMax = scaleMax + padding;
  scaleRange = scaleMax - scaleMin;

  const showSkeleton = (isLoading && currentBalance === 0) || isTransitioning;

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
            <Text style={{ color: "lightgray", fontSize: 10, marginLeft: 6 }}>
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
              {chartData.map((data, index) => {
                const heightPercent =
                  ((data.balance - scaleMin) / scaleRange) * 100;

                // Color logic:
                // - Past periods: Green (completed/actual data)
                // - Current period: Dark green (current position)
                // - Future periods: Light gray/green if positive, light red if negative
                let barColor: string;
                let opacity: number;

                if (data.isPast) {
                  barColor = "#66BB6A"; // Green for past
                  opacity = 0.85;
                } else if (data.isCurrent) {
                  barColor = "#2E7D32"; // Dark green for current
                  opacity = 1;
                } else {
                  // Future - light colors based on forecast
                  barColor = isPositiveDelta ? "#A5D6A7" : "#EF9A9A";
                  opacity = 0.7;
                }

                return (
                  <View
                    key={data.period}
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

        {/* Timeline Labels */}
        <View style={styles.timelineLabels}>
          <Text style={[styles.timelineLabel, { color: subtleTextColor }]}>
            {startLabel}
          </Text>
          <Text
            style={[
              styles.timelineLabel,
              { color: textColor, fontWeight: "600" },
            ]}
          >
            {currentLabel}
          </Text>
          <Text style={[styles.timelineLabel, { color: subtleTextColor }]}>
            {endLabel}
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
