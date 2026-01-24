import React, { useState, useRef } from "react";
import { ThemedText } from "../themed-text";
import { TouchableOpacity, StyleSheet, View, Alert } from "react-native";
import IconSymbol from "../ui/icon-symbol";
import Card from "../card";
import { useThemeColor } from "@/hooks/use-theme-color";
import { useDataContext } from "@/state/DataProvider";
import { useAuthContext } from "@/state/AuthProvider";
import { formatDateForDisplay, compareDates } from "@/utils/dateUtils";
import { router } from "expo-router";
import * as Haptics from "expo-haptics";
import type { Movement } from "@/state";
import { MovementHelper } from "@/helpers/MovementHelper";
import { TransactionsApiHelper } from "@/helpers/TransactionsApiHelper";
import ContextMenu, { IContextMenuOption } from "../ui/context-menu";

const sortMovements = (movements: Movement[]) => {
  return movements?.sort((a, b) => {
    return compareDates(b.date, a.date);
  });
};

const UnconfirmedMovementsCard: React.FC = () => {
  const { unconfirmedMovements, categories, reloadData } = useDataContext();
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

  const handleMovementPress = (movement: Movement) => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    router.push({
      pathname: "/add",
      params: {
        movementId: movement.id,
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

    if (option === "Dismiss") {
      handleDismissMovement();
    }
  };

  const handleDismissMovement = () => {
    if (!selectedMovement || !selectedSpreadsheetId) return;

    Alert.alert(
      "Dismiss movement?",
      undefined,
      [
        {
          text: "Cancel",
          style: "cancel",
        },
        {
          text: "Dismiss",
          style: "destructive",
          onPress: async () => {
            try {
              const result = await TransactionsApiHelper.updateMovement(
                selectedSpreadsheetId,
                selectedMovement.id,
                {
                  status: "DELETED",
                }
              );

              if (result) {
                Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
                await reloadData();
              } else {
                Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
                Alert.alert("Error", "Failed to dismiss movement");
              }
            } catch (error) {
              console.error("Error dismissing movement:", error);
              Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
              Alert.alert("Error", "Something went wrong");
            }
          },
        },
      ]
    );
  };

  const getMenuOptions = (): IContextMenuOption[] => {
    return [
      {
        label: "Dismiss",
        icon: "close-circle-outline",
        destructive: true,
      },
    ];
  };

  const borderColor = useThemeColor(
    { light: "#F0F0F0", dark: "#333333" },
    "tabIconDefault"
  );
  const positiveAmountColor = useThemeColor(
    { light: "#107c2bff", dark: "#34C759" },
    "tint"
  );
  const subtextColor = useThemeColor(
    { light: "#888", dark: "#999" },
    "tabIconDefault"
  );

  const dynamicStyles = StyleSheet.create({
    movementItem: {
      ...styles.movementItem,
      borderBottomColor: borderColor,
    },
    positiveAmount: {
      color: positiveAmountColor,
    },
  });

  const sortedMovements = sortMovements(unconfirmedMovements || []);

  // Empty state when no unconfirmed movements
  if (!sortedMovements || sortedMovements.length === 0) {
    return (
      <Card>
        <View style={styles.emptyState}>
          <IconSymbol name="check-circle" size={48} color="#2F4F3F" />
          <ThemedText style={styles.emptyTitle}>You're all set!</ThemedText>
          <ThemedText style={[styles.emptyText, { color: subtextColor }]}>
            No unconfirmed movements to review
          </ThemedText>
        </View>
      </Card>
    );
  }

  return (
    <Card>
      {sortedMovements.map((movement, index) => {
        const icon = MovementHelper.getMovementIcon(movement.category, categories);
        const color = MovementHelper.getMovementColor(movement.type, movement.category, categories);
        const amount = movement.totalAmount;

        return (
          <View
            key={movement.id}
            ref={(ref) => {
              if (ref) {
                itemRefs.current.set(movement.id, ref);
              }
            }}
            collapsable={false}
          >
            <TouchableOpacity
              onPress={() => handleMovementPress(movement)}
              onLongPress={() => handleLongPress(movement)}
              activeOpacity={0.6}
              style={[
                dynamicStyles.movementItem,
                index === sortedMovements.length - 1 && styles.lastMovementItem,
              ]}
            >
              <View style={[styles.movementIcon, { backgroundColor: color }]}>
                <IconSymbol
                  name={icon}
                  size={20}
                  color="#FFFFFF"
                />
              </View>
              <View style={styles.movementInfo}>
                <ThemedText style={styles.movementDate}>
                  {formatDateForDisplay(movement.date, "it-IT")}
                </ThemedText>
                <ThemedText style={styles.movementDescription}>
                  {movement.description}
                </ThemedText>
              </View>
              <View style={styles.rightSection}>
                <ThemedText
                  style={[
                    styles.movementAmount,
                    amount > 0 ? dynamicStyles.positiveAmount : undefined,
                  ]}
                >
                  {amount > 0 ? "+" : ""}
                  {amount.toFixed(2).replace(".", ",")}€
                </ThemedText>
                <IconSymbol name="chevron-right" size={20} color={subtextColor} />
              </View>
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
  movementItem: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: 10,
    borderBottomWidth: 1,
  },
  lastMovementItem: {
    borderBottomWidth: 0,
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
  rightSection: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  movementAmount: {
    fontSize: 16,
    fontWeight: "700",
  },
  emptyState: {
    paddingVertical: 40,
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
  },
});

export default UnconfirmedMovementsCard;
