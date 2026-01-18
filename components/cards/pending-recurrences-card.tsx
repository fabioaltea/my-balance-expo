import React from "react";
import { ThemedText } from "../themed-text";
import { TouchableOpacity, StyleSheet, View } from "react-native";
import { IconSymbol } from "../ui/icon-symbol.ios";
import Card from "../card";
import { useThemeColor } from "@/hooks/use-theme-color";
import { router } from "expo-router";
import * as Haptics from "expo-haptics";
import type { PendingRecurrence } from "@/state";

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

  return desc.includes("expense") ? "minus.circle.fill" : "plus.circle.fill";
};

// Helper function to get color based on category/type
const getMovementColor = (
  type: "income" | "expense",
  category?: string,
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

interface PendingRecurrencesCardProps {
  pendingRecurrences: PendingRecurrence[];
}

const PendingRecurrencesCard: React.FC<PendingRecurrencesCardProps> = ({
  pendingRecurrences,
}) => {
  const handleQuickAdd = (pending: PendingRecurrence) => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);

    // Navigate to add screen with recurrenceId to load template
    router.push({
      pathname: "/add",
      params: {
        recurrenceId: pending.template.recurrenceId || "",
      },
    });
  };

  // Theme colors
  const borderColor = useThemeColor(
    { light: "#F0F0F0", dark: "#333333" },
    "tabIconDefault",
  );
  const subtextColor = useThemeColor(
    { light: "#888", dark: "#999" },
    "tabIconDefault",
  );

  const dynamicStyles = StyleSheet.create({
    itemBorder: {
      borderBottomColor: borderColor,
    },
  });

  // Don't show if no pending recurrences
  if (!pendingRecurrences || pendingRecurrences.length === 0) {
    return null;
  }

  // Format amount for display
  const formatAmount = (amount: number) => {
    const sign = amount > 0 ? "+" : "";
    return `${sign}${amount.toFixed(2).replace(".", ",")}€`;
  };

  return (
    <Card>
      {pendingRecurrences.map((pending, index) => {
        const { template, periodLabel } = pending;
        const icon = getMovementIcon(template.category, template.description);
        const color = getMovementColor(template.type, template.category);
        const amount = template.totalAmount;

        return (
          <TouchableOpacity
            key={`${template.recurrenceId}-${periodLabel}`}
            onPress={() => handleQuickAdd(pending)}
            activeOpacity={0.6}
            style={[
              styles.pendingItem,
              dynamicStyles.itemBorder,
              index === pendingRecurrences.length - 1 && styles.lastItem,
            ]}
          >
            <View style={[styles.iconContainer, { backgroundColor: color }]}>
              <IconSymbol
                name={icon as keyof typeof IconSymbol}
                size={20}
                color="#FFFFFF"
              />
            </View>
            <View style={styles.itemInfo}>
              <ThemedText
                style={[styles.itemSubtitle, { color: subtextColor }]}
              >
                {formatAmount(amount)} • {periodLabel}
              </ThemedText>
              <ThemedText style={styles.itemDescription}>
                {template.description}
              </ThemedText>
            </View>
            <TouchableOpacity
              onPress={() => handleQuickAdd(pending)}
              style={styles.addButton}
              activeOpacity={0.7}
            >
              <IconSymbol name="plus.circle.fill" size={28} color="#2F4F3F" />
            </TouchableOpacity>
          </TouchableOpacity>
        );
      })}
    </Card>
  );
};

const styles = StyleSheet.create({
  pendingItem: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: 12,
    borderBottomWidth: 1,
  },
  lastItem: {
    borderBottomWidth: 0,
  },
  iconContainer: {
    width: 44,
    height: 44,
    borderRadius: 22,
    justifyContent: "center",
    alignItems: "center",
    marginRight: 12,
  },
  itemInfo: {
    flex: 1,
  },
  itemSubtitle: {
    fontSize: 12,
    marginBottom: 2,
  },
  itemDescription: {
    fontSize: 16,
    fontWeight: "500",
    textTransform: "capitalize",
  },
  addButton: {
    marginLeft: 8,
    padding: 4,
  },
});

export default PendingRecurrencesCard;
