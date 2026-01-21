import React, { useState, useRef } from "react";
import { ThemedText } from "../themed-text";
import { TouchableOpacity, StyleSheet, View, Alert } from "react-native";
import { IconSymbol, IconName } from "../ui/icon-symbol";
import Card from "../card";
import { useThemeColor } from "@/hooks/use-theme-color";
import { useAuthContext, useDataContext } from "@/state";
import { router } from "expo-router";
import * as Haptics from "expo-haptics";
import type { Movement } from "@/state";
import ContextMenu, { IContextMenuOption } from "../ui/context-menu";
import { TransactionsApiHelper } from "@/helpers/TransactionsApiHelper";

// Helper function to get icon based on category/description
const getMovementIcon = (category?: string, description?: string): IconName => {
  const desc = description?.toLowerCase() || "";
  const cat = category?.toLowerCase() || "";

  if (
    cat.includes("salary") ||
    cat.includes("stipendio") ||
    desc.includes("tredicesima")
  ) {
    return "office-building";
  }
  if (
    cat.includes("groceries") ||
    cat.includes("spesa") ||
    desc.includes("conad") ||
    desc.includes("supermercato")
  ) {
    return "cart";
  }
  if (
    cat.includes("home") ||
    cat.includes("casa") ||
    desc.includes("pellet") ||
    desc.includes("bolletta")
  ) {
    return "home";
  }
  if (
    cat.includes("transport") ||
    cat.includes("trasporti") ||
    desc.includes("benzina") ||
    desc.includes("auto")
  ) {
    return "car";
  }
  if (cat.includes("entertainment") || cat.includes("svago")) {
    return "gamepad-variant";
  }

  return "cash";
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

const RecurringMovementsCard: React.FC = () => {
  const { recurringMovements, reloadData } = useDataContext();
  const { selectedSpreadsheetId } = useAuthContext();

  const [menuVisible, setMenuVisible] = useState(false);
  const [buttonPosition, setButtonPosition] = useState<{
    x: number;
    y: number;
    width: number;
    height: number;
  } | null>(null);
  const [selectedMovement, setSelectedMovement] = useState<Movement | null>(null);
  const itemRefs = useRef<Map<string, View>>(new Map());

  const handleQuickAdd = (movement: Movement) => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);

    // Navigate to add screen with recurrenceId to load template
    router.push({
      pathname: "/add",
      params: {
        recurrenceId: movement.recurrenceId || "",
      },
    });
  };

  const handleLongPress = (movement: Movement) => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Heavy);
    setSelectedMovement(movement);

    const itemRef = itemRefs.current.get(movement.id);
    if (itemRef) {
      itemRef.measure((_x, _y, width, height, pageX, pageY) => {
        setButtonPosition({ x: pageX, y: pageY, width, height });
        setMenuVisible(true);
      });
    }
  };

  const handleMenuOption = async (option: string) => {
    setMenuVisible(false);

    if (!selectedMovement) return;

    if (option === "Edit") {
      // Navigate to add screen with movementId to edit
      router.push({
        pathname: "/add",
        params: {
          movementId: selectedMovement.id,
        },
      });
    } else if (option === "Delete") {
      handleDeleteMovement();
    }
  };

  const handleDeleteMovement = () => {
    if (!selectedMovement || !selectedSpreadsheetId) return;

    Alert.alert(
      "Delete Recurring Movement",
      "Are you sure you want to delete this recurring movement? This action cannot be undone.",
      [
        {
          text: "Cancel",
          style: "cancel",
        },
        {
          text: "Delete",
          style: "destructive",
          onPress: async () => {
            try {
              const result = await TransactionsApiHelper.deleteMovement(
                selectedSpreadsheetId,
                selectedMovement.id
              );

              if (result) {
                Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
                await reloadData();
              } else {
                Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
                Alert.alert("Error", "Failed to delete movement");
              }
            } catch (error) {
              console.error("Error deleting movement:", error);
              Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
              Alert.alert("Error", "Failed to delete movement");
            }
          },
        },
      ]
    );
  };

  const getMenuOptions = (): IContextMenuOption[] => {
    return [
      {
        label: "Edit",
        icon: "pencil-outline",
      },
      {
        label: "Delete",
        icon: "trash-outline",
        destructive: true,
      },
    ];
  };

  // Theme colors
  const borderColor = useThemeColor(
    { light: "#F0F0F0", dark: "#333333" },
    "tabIconDefault"
  );
  const subtextColor = useThemeColor(
    { light: "#888", dark: "#999" },
    "tabIconDefault"
  );

  const dynamicStyles = StyleSheet.create({
    itemBorder: {
      borderBottomColor: borderColor,
    },
  });

  // Don't show if no recurring movements
  if (!recurringMovements || recurringMovements.length === 0) {
    return null;
  }

  // Format amount for display
  const formatAmount = (amount: number) => {
    const sign = amount > 0 ? "+" : "";
    return `${sign}${amount.toFixed(2).replace(".", ",")}€`;
  };

  return (
    <Card>
      {recurringMovements.map((movement, index) => {
        const icon = getMovementIcon(movement.category, movement.description);
        const color = getMovementColor(movement.type, movement.category);
        const amount = movement.totalAmount;
        const transactionCount = movement.transactions.length;
        const recurrencePattern = movement.recurrencePattern

        return (
          <View
            key={movement.recurrenceId || movement.id}
            ref={(ref) => {
              if (ref) {
                itemRefs.current.set(movement.id, ref);
              }
            }}
            collapsable={false}
          >
            <TouchableOpacity
              onPress={() => handleQuickAdd(movement)}
              onLongPress={() => handleLongPress(movement)}
              delayLongPress={400}
              activeOpacity={0.6}
              style={[
                styles.recurringItem,
                dynamicStyles.itemBorder,
                index === recurringMovements.length - 1 && styles.lastItem,
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
                  {formatAmount(amount)} • {transactionCount} transaction
                  {transactionCount > 1 ? "s" : ""} •{recurrencePattern}
                </ThemedText>
                <ThemedText style={styles.itemDescription}>
                  {movement.description}
                </ThemedText>
              </View>
              <TouchableOpacity
                onPress={() => handleQuickAdd(movement)}
                style={styles.addButton}
                activeOpacity={0.7}
              >
                <IconSymbol name="plus-circle" size={28} color="#2F4F3F" />
              </TouchableOpacity>
            </TouchableOpacity>
          </View>
        );
      })}

      {/* Context Menu */}
      {menuVisible && buttonPosition && (
        <ContextMenu
          options={getMenuOptions()}
          selectedOption=""
          onSelectOption={handleMenuOption}
          onDismiss={() => setMenuVisible(false)}
          buttonPosition={buttonPosition}
        />
      )}
    </Card>
  );
};

const styles = StyleSheet.create({
  recurringItem: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: 10,
    borderBottomWidth: 1,
  },
  lastItem: {
    borderBottomWidth: 0,
  },
  iconContainer: {
    width: 50,
    height: 50,
    borderRadius: 30,
    justifyContent: "center",
    alignItems: "center",
    marginRight: 16,
  },
  itemInfo: {
    flex: 1,
  },
  itemSubtitle: {
    fontSize: 12,
    marginBottom: 0,
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

export default RecurringMovementsCard;
