import React from "react";
import { ThemedText } from "../themed-text";
import { TouchableOpacity, StyleSheet, View } from "react-native";
import Card from "../card";
import { useThemeColor } from "@/hooks/use-theme-color";
import { router } from "expo-router";
import * as Haptics from "expo-haptics";
import { useDataContext, type PendingRecurrence } from "@/state";
import IconSymbol, { IconName } from "../ui/icon-symbol";
import { MovementHelper } from "@/helpers/MovementHelper";

interface PendingRecurrencesCardProps {
  pendingRecurrences: PendingRecurrence[];
}

const PendingRecurrencesCard: React.FC<PendingRecurrencesCardProps> = ({
  pendingRecurrences,
}) => {
  const {categories}=useDataContext();
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
        const icon = MovementHelper.getMovementIcon(
          template.category,
          categories,
        );
        const color = MovementHelper.getMovementColor(
          template.type,
          template.category,
          categories,
        );
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
                name={icon}
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
              <IconSymbol name="add-circle" size={28} color="#2F4F3F" />
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
