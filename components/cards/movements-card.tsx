import React, { useEffect, useState } from "react";
import { ThemedText } from "../core/themed-text";
import { TouchableOpacity, StyleSheet, View, ScrollView } from "react-native";
import IconSymbol from "../ui/icon-symbol";
import Card from "../core/card";
import ChartSkeleton from "../charts/chart-skeleton";
import { useThemeColor } from "@/hooks/use-theme-color";
import { useDataContext } from "@/state/DataProvider";
import { usePlatformContext } from "@/state/PlatformProvider";
import { formatDateForDisplay, compareDates } from "@/utils/dateUtils";
import { router } from "expo-router";
import * as Haptics from "expo-haptics";
import type { Movement } from "@/state";
import type { Category } from "@/hooks/useMyBalanceData";
import { MovementHelper } from "@/helpers/MovementHelper";

const styles = StyleSheet.create({
  // Movements
  movementItem: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: 10,
    borderBottomWidth: 1,
    color: "inherit",
  },
  lastMovementItem: {
    borderBottomWidth: 0,
    color: "inherit",
  },
  movementIcon: {
    width: 50,
    height: 50,
    borderRadius: 30,
    justifyContent: "center",
    alignItems: "center",
    marginRight: 16,
  },
  movementInfo: {
    flex: 1,
  },
  movementDate: {
    fontSize: 12,
    marginBottom: 0,
  },
  movementDescription: {
    fontSize: 16,
    fontWeight: "500",
    textTransform: "capitalize",
  },
  movementAmount: {
    fontSize: 16,
    fontWeight: "700",
  },
  scrollView: {},
  emptyState: {
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
  },
  emptyTitle: {
    fontSize: 18,
    fontWeight: "600",
    marginTop: 8,
  },
  emptyText: {
    fontSize: 14,
    textAlign: "center",
    color: "inherit",
    opacity: 0.6,
  },
});

const sortMovements = (movements: Movement[]) => {
  return movements?.sort((a, b) => {
    // Use compareDates from dateUtils for string date comparison
    // compareDates returns -1 if a < b, 0 if equal, 1 if a > b
    // We want newest first, so we compare b to a (reverse order)
    return compareDates(b.date, a.date);
  });
};

interface MovementsCardProps {
  movements: Movement[];
  isTransitioning?: boolean;
  /** Optional callback to override default navigation behavior */
  onMovementPress?: (movement: Movement) => void;
}

const MovementsCard: React.FC<MovementsCardProps> = ({
  movements,
  isTransitioning = false,
  onMovementPress,
}) => {
  const { isLoading, categories } = useDataContext();
  const [recentMovements, setRecentMovements] = useState(
    sortMovements(movements),
  );
  const { orientation } = usePlatformContext();

  const isLandscape = orientation === "landscape";

  const handleMovementPress = (movement: Movement) => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    if (onMovementPress) {
      onMovementPress(movement);
    } else {
      router.push({
        pathname: "/add",
        params: {
          movementId: movement.id,
        },
      });
    }
  };

  useEffect(() => {
    console.log(
      "💳 MovementsCard: Updating with",
      movements?.length,
      "movements",
    );
    const sorted = sortMovements(movements);

    setRecentMovements(sorted);
  }, [movements]);

  // Colori del tema per la movements card
  const borderColor = useThemeColor(
    { light: "#F0F0F0", dark: "#333333" },
    "tabIconDefault",
  );
  const positiveAmountColor = useThemeColor(
    { light: "#107c2bff", dark: "#34C759" },
    "tint",
  );

  const dynamicStyles = StyleSheet.create({
    movementItem: {
      ...styles.movementItem,
      borderBottomColor: borderColor,
      color: borderColor,
    },
    positiveAmount: {
      color: positiveAmountColor,
    },
  });

  // Show only recent movements (limit to 13 like before)
  // const recentMovements = sortMovements(movements);

  // Show skeleton if loading AND no movements yet OR if period is transitioning
  const showSkeleton =
    (isLoading && recentMovements?.length === 0) || isTransitioning;

  if (showSkeleton) {
    return (
      <Card label="">
        <ChartSkeleton variant="list" itemCount={5} />
      </Card>
    );
  }

  // Empty state when not loading and no movements
  if (recentMovements?.length === 0) {
    return (
      <Card
        label={isLandscape ? "Recent Movements" : ""}
        style={isLandscape ? { flex: 1 } : undefined}
      >
        <View style={styles.emptyState}>
          <IconSymbol name="search-off" size={48} color="#999" />
          <View style={styles.emptyState}>
            <ThemedText style={[styles.emptyTitle, { color: "#999" }]}>
              No movements
            </ThemedText>
            <ThemedText style={styles.emptyText}>
              No movements found for the selected period
            </ThemedText>
          </View>
        </View>
      </Card>
    );
  }

  return (
    <Card
      label={isLandscape ? "Recent Movements" : ""}
      style={isLandscape ? { flex: 1 } : undefined}
    >
      <ScrollView
        showsVerticalScrollIndicator={isLandscape}
        nestedScrollEnabled={true}
      >
        {recentMovements?.map((movement, index) => {
          const icon = MovementHelper.getMovementIcon(
            movement.category,
            categories,
          );
          const color = MovementHelper.getMovementColor(
            movement.type,
            movement.category,
            categories,
          );
          // totalAmount is already signed (positive for income, negative for expense)
          const amount = movement.totalAmount;

          return (
            <TouchableOpacity
              key={movement.id}
              onPress={() => handleMovementPress(movement)}
              style={[
                dynamicStyles.movementItem,
                index === recentMovements.length - 1 && styles.lastMovementItem,
              ]}
            >
              <View style={[styles.movementIcon, { backgroundColor: color }]}>
                <IconSymbol name={icon} size={20} color="#FFFFFF" />
              </View>
              <View style={styles.movementInfo}>
                <ThemedText style={[styles.movementDate]}>
                  {formatDateForDisplay(movement.date, "it-IT")}
                </ThemedText>
                <ThemedText style={[styles.movementDescription]}>
                  {movement.description}
                </ThemedText>
              </View>
              <ThemedText
                style={[
                  styles.movementAmount,
                  amount > 0 ? dynamicStyles.positiveAmount : "",
                ]}
              >
                {amount > 0 ? "+" : ""}
                {amount.toFixed(2).replace(".", ",")}€
              </ThemedText>
            </TouchableOpacity>
          );
        })}
      </ScrollView>
    </Card>
  );
};

export default MovementsCard;
