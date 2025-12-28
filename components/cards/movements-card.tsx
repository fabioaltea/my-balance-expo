import { ThemedText } from "../themed-text";
import { TouchableOpacity, StyleSheet, View } from "react-native";
import { IconSymbol } from "../ui/icon-symbol.ios";
import { useState } from "react";
import Card from "../card";
import { useThemeColor } from "@/hooks/use-theme-color";

const RECENT_MOVEMENTS = [
  {
    id: 1,
    date: "15/12/2025",
    description: "Tredicesima",
    amount: 1391.44,
    icon: "building.2.fill",
    color: "#34C759",
  },
  {
    id: 2,
    date: "13/12/2025",
    description: "pellet",
    amount: -22.96,
    icon: "calendar",
    color: "#FF9500",
  },
  {
    id: 3,
    date: "13/12/2025",
    description: "spesa conad",
    amount: -40.62,
    icon: "cart.fill",
    color: "#FFD60A",
  },
  {
    id: 4,
    date: "13/12/2025",
    description: "pellet",
    amount: -22.96,
    icon: "calendar",
    color: "#FF9500",
  },
  {
    id: 5,
    date: "13/12/2025",
    description: "spesa conad",
    amount: -40.62,
    icon: "cart.fill",
    color: "#FFD60A",
  },
  {
    id: 6,
    date: "13/12/2025",
    description: "pellet",
    amount: -22.96,
    icon: "calendar",
    color: "#FF9500",
  },
  {
    id: 7,
    date: "13/12/2025",
    description: "spesa conad",
    amount: -40.62,
    icon: "cart.fill",
    color: "#FFD60A",
  },
  {
    id: 8,
    date: "13/12/2025",
    description: "pellet",
    amount: -22.96,
    icon: "calendar",
    color: "#FF9500",
  },
  {
    id: 9,
    date: "13/12/2025",
    description: "spesa conad",
    amount: -40.62,
    icon: "cart.fill",
    color: "#FFD60A",
  },
  {
    id: 10,
    date: "13/12/2025",
    description: "pellet",
    amount: -22.96,
    icon: "calendar",
    color: "#FF9500",
  },
  {
    id: 11,
    date: "13/12/2025",
    description: "spesa conad",
    amount: -40.62,
    icon: "cart.fill",
    color: "#FFD60A",
  },
  {
    id: 12,
    date: "13/12/2025",
    description: "pellet",
    amount: -22.96,
    icon: "calendar",
    color: "#FF9500",
  },
  {
    id: 13,
    date: "13/12/2025",
    description: "spesa conad",
    amount: -40.62,
    icon: "cart.fill",
    color: "#FFD60A",
  },
];

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
    color: "inherit",
  },
  movementDate: {
    fontSize: 12,
    color: "inherit",
    marginBottom: 0,
  },
  movementDescription: {
    fontSize: 16,
    color: "inherit",
    fontWeight: "500",
    textTransform: "capitalize",
  },
  movementAmount: {
    fontSize: 16,
    fontWeight: "700",
  },
  positiveAmount: {
    // Color will be set dynamically
  },
  negativeAmount: {
    color: "inherit",
  },
});

const MovementsCard: React.FC = () => {
  // Colori del tema per la movements card
  const borderColor = useThemeColor(
    { light: "#F0F0F0", dark: "#333333" },
    "border"
  );
  const positiveAmountColor = useThemeColor(
    { light: "#107c2bff", dark: "#34C759" },
    "tint"
  );

  const dynamicStyles = StyleSheet.create({
    movementItem: {
      ...styles.movementItem,
      borderBottomColor: borderColor,
    },
    positiveAmount: {
      ...styles.positiveAmount,
      color: positiveAmountColor,
    },
  });

  return (
    <Card label="">
      {RECENT_MOVEMENTS.map((movement, index) => (
        <TouchableOpacity
          key={movement.id}
          style={[
            dynamicStyles.movementItem,
            index === RECENT_MOVEMENTS.length - 1 && styles.lastMovementItem,
          ]}
        >
          <View
            style={[styles.movementIcon, { backgroundColor: movement.color }]}
          >
            <IconSymbol
              name={movement.icon as keyof typeof IconSymbol}
              size={20}
              color="#FFFFFF"
            />
          </View>
          <View style={styles.movementInfo}>
            <ThemedText style={styles.movementDate}>{movement.date}</ThemedText>
            <ThemedText style={styles.movementDescription}>
              {movement.description}
            </ThemedText>
          </View>
          <ThemedText
            style={[
              styles.movementAmount,
              movement.amount > 0
                ? dynamicStyles.positiveAmount
                : styles.negativeAmount,
            ]}
          >
            {movement.amount > 0 ? "+" : ""}
            {movement.amount.toFixed(2)}€
          </ThemedText>
        </TouchableOpacity>
      ))}
    </Card>
  );
};

export default MovementsCard;
