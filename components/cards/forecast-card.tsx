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

  // Calculate the expected end date
  const getExpectedEndDate = () => {
    const now = new Date();
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
      // Last day of current month
      const lastDay = new Date(
        now.getFullYear(),
        now.getMonth() + 1,
        0,
      ).getDate();
      return `${lastDay} ${months[now.getMonth()]}`;
    }
  };

  const expectedEndDate = getExpectedEndDate();

  // Calculate expected remaining (from historical average)
  const expectedRemainingIncome = Math.max(
    0,
    avgMonthlyIncome - currentMonthIncome,
  );
  const expectedRemainingExpense = Math.max(
    0,
    avgMonthlyExpense - currentMonthExpense,
  );

  // Total expected income/expense at end of month
  const forecastedMonthlyIncome =
    currentMonthIncome + pendingRecurringIncome + expectedRemainingIncome;
  const forecastedMonthlyExpense =
    currentMonthExpense + pendingRecurringExpense + expectedRemainingExpense;

  // The displayed delta should match the displayed income/expense totals
  const displayedDelta = forecastedMonthlyIncome - forecastedMonthlyExpense;
  const isPositiveDelta = displayedDelta >= 0;

  // For the bar: show a "display forecast" that's consistent with displayedDelta
  const displayForecastBalance = currentBalance + displayedDelta;

  // Calculate the range for the bar (add padding around min/max)
  const minValue = Math.min(currentBalance, displayForecastBalance);
  const maxValue = Math.max(currentBalance, displayForecastBalance);
  const delta = Math.abs(displayedDelta);

  // Make padding proportional to the delta so the change is visually prominent
  const padding = Math.max(delta * 0.6, 100);
  const scaleMin = minValue - padding;
  const scaleMax = maxValue + padding;
  const scaleRange = scaleMax - scaleMin;

  // Calculate positions as percentages
  const currentPos = ((currentBalance - scaleMin) / scaleRange) * 100;
  const forecastPos = ((displayForecastBalance - scaleMin) / scaleRange) * 100;

  const leftPos = Math.min(currentPos, forecastPos);
  const rightPos = Math.max(currentPos, forecastPos);

  // Check if pills would overlap
  const pillDistance = Math.abs(currentPos - forecastPos);
  const pillsOverlap = pillDistance < 18;

  // If overlapping, offset both pills equally in opposite directions
  const pillOffset = pillsOverlap ? 20 : 0;
  const actualPillOffset = isPositiveDelta ? -pillOffset : pillOffset;
  const forecastPillOffset = isPositiveDelta ? pillOffset : -pillOffset;

  // Colors
  const solidColor = "#4CAF50"; // Current balance (green)
  const deltaColor = isPositiveDelta ? "#81C784" : "#E57373"; // Forecast delta

  const showSkeleton = (isLoading && currentBalance === 0) || isTransitioning;

  // Generate stripes for the dashed effect
  const stripeCount = 12;
  const stripes = Array.from({ length: stripeCount }, (_, i) => i);

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
            <Text style={{color: "lightgray", fontSize: 10, marginLeft: 6}}>{expectedEndDate}</Text>
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
            {/* <Text style={[styles.expectedDate, { color: subtleTextColor }]}>
              {expectedEndDate}
            </Text> */}
          </View>
        </View>

        {/* Balance Bar Section */}
        <View style={styles.barSection}>
          {/* Scale labels */}
          <View style={styles.scaleLabels}>
            <Text style={[styles.scaleLabel, { color: subtleTextColor }]}>
              {formatCompact(scaleMin)}
            </Text>
            <Text style={[styles.scaleLabel, { color: subtleTextColor }]}>
              {formatCompact(scaleMax)}
            </Text>
          </View>

          {/* The bar */}
          <View style={styles.barContainer}>
            {/* Neutral background */}
            <View style={styles.barBackground} />

            {/* Solid part: from left edge to current balance */}
            <View
              style={[
                styles.barSegmentSolid,
                {
                  left: 0,
                  width: `${currentPos}%`,
                  backgroundColor: solidColor,
                  borderTopLeftRadius: 12,
                  borderBottomLeftRadius: 12,
                  borderTopRightRadius: 0,
                  borderBottomRightRadius: 0,
                },
              ]}
            />

            {/* Dashed/striped part: delta between current and forecast */}
            {displayedDelta !== 0 && (
              <View
                style={[
                  styles.barSegmentDashed,
                  {
                    left: `${isPositiveDelta ? currentPos : forecastPos}%`,
                    width: `${rightPos - leftPos}%`,
                    borderTopLeftRadius: 0,
                    borderBottomLeftRadius: 0,
                    borderTopRightRadius: isPositiveDelta ? 12 : 0,
                    borderBottomRightRadius: isPositiveDelta ? 12 : 0,
                  },
                ]}
              >
                {stripes.map((i) => (
                  <View
                    key={i}
                    style={[
                      styles.stripe,
                      {
                        backgroundColor:
                          i % 2 === 0 ? deltaColor : "transparent",
                      },
                    ]}
                  />
                ))}
              </View>
            )}

            {/* Current balance marker */}
            <View
              style={[
                styles.marker,
                styles.currentMarker,
                { left: `${currentPos}%` },
              ]}
            />

            {/* Forecast marker */}
            <View
              style={[
                styles.marker,
                styles.forecastMarker,
                {
                  left: `${forecastPos}%`,
                  borderColor: isPositiveDelta ? "#4CAF50" : "#F44336",
                },
              ]}
            />
          </View>

          {/* Value labels below bar */}
          <View style={styles.valueLabels}>
            {/* Current balance label */}
            <View
              style={[
                styles.valueLabelContainer,
                {
                  left: `${currentPos}%`,
                  transform: [{ translateX: -25 + actualPillOffset }],
                },
              ]}
            >
              <View
                style={[
                  styles.valueLabelBubble,
                  { backgroundColor: solidColor },
                ]}
              >
                <Text style={styles.valueLabelText}>
                  {formatCompact(currentBalance)}
                </Text>
              </View>
              <Text
                style={[styles.valueLabelCaption, { color: subtleTextColor }]}
              >
                Actual
              </Text>
            </View>

            {/* Forecast label */}
            <View
              style={[
                styles.valueLabelContainer,
                {
                  left: `${forecastPos}%`,
                  transform: [{ translateX: -25 + forecastPillOffset }],
                },
              ]}
            >
              <View
                style={[
                  styles.valueLabelBubble,
                  {
                    backgroundColor: isPositiveDelta ? "#4CAF50" : "#F44336",
                  },
                ]}
              >
                <Text style={styles.valueLabelText}>
                  {formatCompact(displayForecastBalance)}
                </Text>
              </View>
              <Text
                style={[styles.valueLabelCaption, { color: subtleTextColor }]}
              >
                Forecast
              </Text>
            </View>
          </View>
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
    marginBottom: 10,
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
  expectedDate: {
    fontSize: 12,
    marginTop: 2,
  },
  barSection: {
    marginBottom: 0,
  },
  scaleLabels: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginBottom: 4,
  },
  scaleLabel: {
    fontSize: 10,
  },
  barContainer: {
    height: 20,
    borderRadius: 10,
    overflow: "hidden",
    position: "relative",
  },
  barBackground: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: "#E8E8E8",
    borderRadius: 12,
  },
  barSegmentSolid: {
    position: "absolute",
    top: 0,
    bottom: 0,
  },
  barSegmentDashed: {
    position: "absolute",
    top: 0,
    bottom: 0,
    flexDirection: "row",
    overflow: "hidden",
  },
  stripe: {
    flex: 1,
    height: "100%",
  },
  marker: {
    position: "absolute",
    top: -2,
    width: 3,
    height: 24,
    borderRadius: 1.5,
    marginLeft: -1.5,
  },
  currentMarker: {
    backgroundColor: "#2E7D32",
  },
  forecastMarker: {
    backgroundColor: "#fff",
    borderWidth: 2,
  },
  valueLabels: {
    position: "relative",
    height: 44,
    marginTop: 6,
  },
  valueLabelContainer: {
    position: "absolute",
    alignItems: "center",
    transform: [{ translateX: -25 }],
  },
  valueLabelBubble: {
    paddingHorizontal: 6,
    paddingVertical: 3,
    borderRadius: 8,
    minWidth: 45,
    alignItems: "center",
  },
  valueLabelText: {
    color: "#fff",
    fontSize: 11,
    fontWeight: "bold",
  },
  valueLabelCaption: {
    fontSize: 9,
    marginTop: 1,
  },
  detailsSection: {
    gap: 12,
    paddingHorizontal: 4,
    paddingVertical: 0,
  },
  detailRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingHorizontal: 8,
    paddingVertical: 0,
    height: 30,
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
});

export default ForecastCard;
