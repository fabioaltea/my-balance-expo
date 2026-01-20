import React from "react";
import { View, Text, StyleSheet } from "react-native";
import Card from "../card";
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

  const formatCompact = (amount: number) => {
    const abs = Math.abs(amount);
    if (abs >= 1000) {
      return `${(amount / 1000).toFixed(1)}k`;
    }
    return amount.toFixed(0);
  };

  const formatBalance = (amount: number) => {
    return amount.toLocaleString("it-IT", {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    });
  };

  const {
    currentBalance,
    currentMonthIncome,
    currentMonthExpense,
    pendingRecurringIncome,
    pendingRecurringExpense,
    avgMonthlyIncome,
    avgMonthlyExpense,
  } = forecast;

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
  // This represents: current balance + (monthly income - monthly expense)
  const displayForecastBalance = currentBalance + displayedDelta;

  // Calculate the range for the bar (add padding around min/max)
  const minValue = Math.min(currentBalance, displayForecastBalance);
  const maxValue = Math.max(currentBalance, displayForecastBalance);
  const range = maxValue - minValue;

  // Add 20% padding on each side, minimum padding of 500
  const padding = Math.max(range * 0.3, Math.abs(minValue) * 0.05, 500);
  const scaleMin = minValue - padding;
  const scaleMax = maxValue + padding;
  const scaleRange = scaleMax - scaleMin;

  // Calculate positions as percentages
  const currentPos = ((currentBalance - scaleMin) / scaleRange) * 100;
  const forecastPos = ((displayForecastBalance - scaleMin) / scaleRange) * 100;

  const leftPos = Math.min(currentPos, forecastPos);
  const rightPos = Math.max(currentPos, forecastPos);

  // Check if pills would overlap (they're ~50px wide, need ~15% minimum distance)
  const pillDistance = Math.abs(currentPos - forecastPos);
  const pillsOverlap = pillDistance < 18;

  // If overlapping, offset both pills equally in opposite directions
  // Actual goes left, Forecast goes right (or vice versa based on position)
  const pillOffset = pillsOverlap ? 20 : 0;
  const actualPillOffset = isPositiveDelta ? -pillOffset : pillOffset;
  const forecastPillOffset = isPositiveDelta ? pillOffset : -pillOffset;

  // Colors
  const solidColor = "#4CAF50"; // Current balance (green)
  const deltaColor = isPositiveDelta ? "#81C784" : "#E57373"; // Forecast delta

  const showSkeleton = (isLoading && currentBalance === 0) || isTransitioning;

  if (showSkeleton) {
    return (
      <Card backgroundColor={cardBackground} color={textColor}>
        <View style={styles.header}>
          <Text style={[styles.title, { color: subtleTextColor }]}>
            Loading...
          </Text>
        </View>
      </Card>
    );
  }

  // Generate stripes for the dashed effect
  const stripeCount = 12;
  const stripes = Array.from({ length: stripeCount }, (_, i) => i);

  return (
    <Card backgroundColor={cardBackground} color={textColor}>
      <View style={{ height: 200 }}>
        {/* Main balance bar */}
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
                  // Bordi stondati solo a sinistra, dritti dove tocca il delta
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
                    // Se positivo: bordi stondati a destra (si estende oltre il solido)
                    // Se negativo: nessun bordo stondato (si sovrappone al solido)
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

        {/* Delta summary */}
        <View style={styles.deltaSummary}>
          <Text style={[styles.deltaLabel, { color: textColor }]}>
            Expected change
          </Text>
          <Text
            style={[
              styles.deltaValue,
              { color: isPositiveDelta ? "#4CAF50" : "#F44336" },
            ]}
          >
            {isPositiveDelta ? "+" : ""}
            {formatBalance(displayedDelta)}
          </Text>
        </View>

        {/* Forecasted monthly income/expense */}
        <View style={styles.forecastDetails}>
          <View style={styles.forecastRow}>
            <Text style={[styles.forecastLabel, { color: textColor }]}>
              Expected incomes
            </Text>
            <Text style={[styles.forecastValue, { color: "#4CAF50" }]}>
              +{formatBalance(forecastedMonthlyIncome)}
            </Text>
          </View>
          <View style={styles.forecastRow}>
            <Text style={[styles.forecastLabel, { color: textColor }]}>
              Expected outcomes
            </Text>
            <Text style={[styles.forecastValue, { color: "#F44336" }]}>
              -{formatBalance(forecastedMonthlyExpense)}
            </Text>
          </View>
        </View>

        {/* Legend */}
        {/* <View style={styles.legend}>
        <View style={styles.legendItem}>
          <View style={[styles.legendBox, { backgroundColor: solidColor }]} />
          <Text style={[styles.legendText, { color: subtleTextColor }]}>
            Saldo attuale
          </Text>
        </View>
        <View style={styles.legendItem}>
          <View style={styles.legendBoxStriped}>
            {[0, 1, 2, 3].map((i) => (
              <View
                key={i}
                style={[
                  styles.legendStripe,
                  { backgroundColor: i % 2 === 0 ? deltaColor : "transparent" },
                ]}
              />
            ))}
          </View>
          <Text style={[styles.legendText, { color: subtleTextColor }]}>
            Delta previsto
          </Text>
        </View>
      </View> */}
      </View>
    </Card>
  );
};

const styles = StyleSheet.create({
  header: {
    marginBottom: 16,
  },
  title: {
    fontSize: 14,
    fontWeight: "600",
    textTransform: "uppercase",
    letterSpacing: 1,
  },
  barSection: {
    marginBottom: 12,
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
  deltaSummary: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingVertical: 4,
    marginBottom: 8,
  },
  deltaLabel: {
    fontSize: 13,
    fontWeight: "500",
  },
  deltaValue: {
    fontSize: 16,
    fontWeight: "bold",
  },
  forecastDetails: {
    marginBottom: 0,
    gap: 6,
  },
  forecastRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  forecastLabel: {
    fontSize: 13,
  },
  forecastValue: {
    fontSize: 13,
    fontWeight: "600",
  },
  legend: {
    flexDirection: "row",
    justifyContent: "center",
    gap: 24,
  },
  legendItem: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
  },
  legendBox: {
    width: 16,
    height: 12,
    borderRadius: 3,
  },
  legendBoxStriped: {
    width: 16,
    height: 12,
    borderRadius: 3,
    flexDirection: "row",
    overflow: "hidden",
  },
  legendStripe: {
    flex: 1,
    height: "100%",
  },
  legendText: {
    fontSize: 11,
  },
});

export default ForecastCard;
