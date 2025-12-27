import { ThemedText } from "../themed-text";
import { TouchableOpacity, StyleSheet, View } from "react-native";
import { IconSymbol } from "../ui/icon-symbol.ios";
import { useState } from "react";
import Card from "../card";

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
];

const styles = StyleSheet.create({
  // Movements
  movementItem: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: "#F0F0F0",
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
    color: "#107c2bff",
  },
  negativeAmount: {
    color: "inherit",
  },
});

const MovementsCard: React.FC = () => {

  return (
    <Card label="Recent Movements">
      {RECENT_MOVEMENTS.map((movement, index) => (
        <TouchableOpacity
          key={movement.id}
          style={[
            styles.movementItem,
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
                ? styles.positiveAmount
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
