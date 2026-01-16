import React, { useEffect, useState } from "react";
import { ThemedText } from "../themed-text";
import { TouchableOpacity, StyleSheet, View } from "react-native";
import { IconSymbol } from "../ui/icon-symbol.ios";
import Card from "../card";
import Skeleton from "../ui/skeleton";
import { useThemeColor } from "@/hooks/use-theme-color";
import { useDataContext } from "@/state/DataProvider";
import { formatDateForDisplay, compareDates } from "@/utils/dateUtils";
import { router } from "expo-router";
import * as Haptics from "expo-haptics";
import type { Movement } from "@/state";

// Helper function to get icon based on category/description
const getMovementIcon = (category?: string, description?: string): string => {
  const desc = description?.toLowerCase() || "";
  const cat = category?.toLowerCase() || "";

  if (
    cat.includes("salary") ||
    cat.includes("stipendio") ||
    desc.includes("tredicesima")
  ) {
    return "building.2.fill";
  }
  if (
    cat.includes("groceries") ||
    cat.includes("spesa") ||
    desc.includes("conad") ||
    desc.includes("supermercato")
  ) {
    return "cart.fill";
  }
  if (
    cat.includes("home") ||
    cat.includes("casa") ||
    desc.includes("pellet") ||
    desc.includes("bolletta")
  ) {
    return "house.fill";
  }
  if (
    cat.includes("transport") ||
    cat.includes("trasporti") ||
    desc.includes("benzina") ||
    desc.includes("auto")
  ) {
    return "car.fill";
  }
  if (cat.includes("entertainment") || cat.includes("svago")) {
    return "gamecontroller.fill";
  }

  // Default icons based on type
  return desc.includes("expense") ? "minus.circle.fill" : "plus.circle.fill";
};

// Helper function to get color based on category/type
const getMovementColor = (
  type: "income" | "expense",
  category?: string
): string => {
  if (type === "income") {
    return "#34C759";
  }

  const cat = category?.toLowerCase() || "";
  if (cat.includes("groceries") || cat.includes("spesa")) {
    return "#FFD60A";
  }
  if (cat.includes("home") || cat.includes("casa")) {
    return "#FF9500";
  }
  if (cat.includes("transport") || cat.includes("trasporti")) {
    return "#5856D6";
  }

  return "#FF3B30"; // Default expense color
};

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

  emptyState: {
    paddingVertical: 40,
    alignItems: "center",
    justifyContent: "center",
  },
  emptyText: {
    fontSize: 16,
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
}

const MovementsCard: React.FC<MovementsCardProps> = ({
  movements,
  isTransitioning = false,
}) => {
  const { isLoading } = useDataContext();
  const [recentMovements, setRecentMovements] = useState(
    sortMovements(movements)
  );

  const handleMovementPress = (movement: Movement) => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    router.push({
      pathname: "/add",
      params: {
        movementId: movement.id,
      },
    });
  };

  useEffect(() => {
    console.log(
      "💳 MovementsCard: Updating with",
      movements?.length,
      "movements"
    );
    const sorted = sortMovements(movements);

    // Log detailed info about movements being displayed
    console.log(
      "📋 Movements to display:",
      sorted?.map((m, idx) => ({
        index: idx,
        date: m.date,
        description: m.description,
        amount: m.totalAmount,
      }))
    );

    setRecentMovements(sorted);
  }, [movements]);

  // Colori del tema per la movements card
  const borderColor = useThemeColor(
    { light: "#F0F0F0", dark: "#333333" },
    "tabIconDefault"
  );
  const positiveAmountColor = useThemeColor(
    { light: "#107c2bff", dark: "#34C759" },
    "tint"
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
        {[...Array(5)].map((_, index) => (
          <View
            key={index}
            style={[
              styles.movementItem,
              { borderBottomColor: borderColor },
              index === 4 && styles.lastMovementItem,
            ]}
          >
            <Skeleton
              width={50}
              height={50}
              borderRadius={30}
              style={{ marginRight: 16 }}
            />
            <View style={styles.movementInfo}>
              <Skeleton
                width={80}
                height={12}
                borderRadius={4}
                style={{ marginBottom: 4 }}
              />
              <Skeleton width={140} height={16} borderRadius={4} />
            </View>
            <Skeleton width={70} height={16} borderRadius={4} />
          </View>
        ))}
      </Card>
    );
  }

  // Empty state when not loading and no movements
  if (recentMovements?.length === 0) {
    return (
      <Card label="">
        <View style={styles.emptyState}>
          <ThemedText style={styles.emptyText}>
            No movements found for the selected period
          </ThemedText>
        </View>
      </Card>
    );
  }

  return (
    <Card label="">
      {recentMovements?.map((movement, index) => {
        const icon = getMovementIcon(movement.category, movement.description);
        const color = getMovementColor(movement.type, movement.category);
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
              <IconSymbol
                name={icon as keyof typeof IconSymbol}
                size={20}
                color="#FFFFFF"
              />
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
    </Card>
  );
};

export default MovementsCard;
