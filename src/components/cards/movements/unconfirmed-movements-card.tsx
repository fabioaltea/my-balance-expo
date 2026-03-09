import React from "react";
import { ThemedText } from "@/src/components/core/themed-text";
import {
  TouchableOpacity,
  StyleSheet,
  View,
  Alert,
  ScrollView,
} from "react-native";
import IconSymbol from "@/src/components/ui/icon-symbol";
import Card from "@/src/components/core/card";
import { usePlatformContext } from "@/src/state/PlatformProvider";
import { useThemeColor } from "@/src/hooks/use-theme-color";
import { useDataContext } from "@/src/state/DataProvider";
import { useAuthContext } from "@/src/state/AuthProvider";
import { formatDateForDisplay, compareDates } from "@/src/utils/dateUtils";
import { router } from "expo-router";
import * as Haptics from "expo-haptics";
import type { Movement } from "@/src/state";
import { MovementHelper } from "@/src/helpers/MovementHelper";
import ContextMenu, {
  IContextMenuOption,
} from "@/src/components/ui/context-menu";
import { useUpdateMovement } from "@/src/hooks/mutations/useUpdateMovement";

const sortMovements = (movements: Movement[]) => {
  return movements?.sort((a, b) => {
    return compareDates(b.date, a.date);
  });
};

interface UnconfirmedMovementsCardProps {
  /** Optional callback to override default navigation behavior */
  onMovementPress?: (movement: Movement) => void;
}

const UnconfirmedMovementsCard: React.FC<UnconfirmedMovementsCardProps> = ({
  onMovementPress,
}) => {
  const { unconfirmedMovements, categories } = useDataContext();
  const { selectedSpreadsheetId } = useAuthContext();
  const { orientation } = usePlatformContext();
  const isLandscape = orientation === "landscape";

  // React Query mutation
  const updateMovement = useUpdateMovement();

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

  const handleMenuOption = async (option: string, movement: Movement) => {
    if (option === "Dismiss") {
      handleDismissMovement(movement);
    }
  };

  const handleDismissMovement = (movement: Movement) => {
    if (!selectedSpreadsheetId) return;

    Alert.alert("Dismiss movement?", undefined, [
      {
        text: "Cancel",
        style: "cancel",
      },
      {
        text: "Dismiss",
        style: "destructive",
        onPress: async () => {
          console.log(
            "🗑️ Dismissing movement:",
            movement.id,
            "spreadsheetId:",
            selectedSpreadsheetId,
          );
          try {
            // Use React Query mutation to update movement status
            await updateMovement.mutateAsync({
              movementId: movement.id,
              status: "DELETED",
            });

            // Success - mutation handles cache invalidation automatically
            console.log("🗑️ Dismiss successful");
            Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
          } catch (error) {
            console.error("Error dismissing movement:", error);
            Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
            Alert.alert("Error", "Failed to dismiss movement");
          }
        },
      },
    ]);
  };

  const menuOptions: IContextMenuOption[] = [
    {
      label: "Dismiss",
      icon: "close-circle-outline",
      destructive: true,
    },
  ];

  const borderColor = useThemeColor(
    { light: "#F0F0F0", dark: "#333333" },
    "tabIconDefault",
  );
  const positiveAmountColor = useThemeColor(
    { light: "#107c2bff", dark: "#34C759" },
    "tint",
  );
  const subtextColor = useThemeColor(
    { light: "#888", dark: "#999" },
    "tabIconDefault",
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
      <Card
        label={isLandscape ? "Unconfirmed Movements" : ""}
        style={isLandscape ? { flex: 1 } : undefined}
      >
        <View style={styles.emptyState}>
          <IconSymbol name="check-circle" size={48} color="#999" />
          <View style={styles.emptyState}>
            <ThemedText style={[styles.emptyTitle, { color: "#999" }]}>
              You're all set!
            </ThemedText>
            <ThemedText style={[styles.emptyText, { color: subtextColor }]}>
              No unconfirmed movements to review
            </ThemedText>
          </View>
        </View>
      </Card>
    );
  }

  return (
    <Card
      label={isLandscape ? "Unconfirmed Movements" : ""}
      style={isLandscape ? { flex: 1 } : undefined}
    >
      <ScrollView
        showsVerticalScrollIndicator={isLandscape}
        nestedScrollEnabled={true}
      >
        {sortedMovements.map((movement, index) => {
          const icon = MovementHelper.getMovementIcon(
            movement.category,
            categories,
          );
          const color = MovementHelper.getMovementColor(
            movement.type,
            movement.category,
            categories,
          );
          const amount = movement.totalAmount;

          return (
            <ContextMenu
              key={movement.id}
              options={menuOptions}
              selectedOption=""
              onSelectOption={(option) => handleMenuOption(option, movement)}
            >
              <TouchableOpacity
                onPress={() => handleMovementPress(movement)}
                activeOpacity={0.6}
                style={[
                  dynamicStyles.movementItem,
                  index === sortedMovements.length - 1 &&
                    styles.lastMovementItem,
                ]}
              >
                <View style={[styles.movementIcon, { backgroundColor: color }]}>
                  <IconSymbol name={icon} size={20} color="#FFFFFF" />
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
                  <IconSymbol
                    name="chevron-right"
                    size={20}
                    color={subtextColor}
                  />
                </View>
              </TouchableOpacity>
            </ContextMenu>
          );
        })}
      </ScrollView>
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
