import React, { useState } from "react";
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
import { useSpreadsheetMutation } from "@/src/hooks/useSpreadsheetMutation";
import { TransactionsApiHelper } from "@/src/helpers/TransactionsApiHelper";
import { TransactionsMutationHelpers, type UpdateMovementData, type OptimisticSnapshot } from "@/src/helpers/TransactionsMutationHelpers";
import ModalPanel from "@/src/components/ui/modal-panel";
import Ionicons from "@expo/vector-icons/Ionicons";

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
  const updateMovement = useSpreadsheetMutation<UpdateMovementData, OptimisticSnapshot>({
    mutationFn: (spreadsheetId, data) => {
      const { movementId, ...updates } = data;
      return TransactionsApiHelper.updateMovement(spreadsheetId, movementId, updates);
    },
    onMutate: (qc, data) => TransactionsMutationHelpers.optimisticUpdateMovement(qc, data),
    onError: (qc, ctx) => TransactionsMutationHelpers.rollback(qc, ctx),
    onSuccess: (qc) => TransactionsMutationHelpers.invalidateMovementCaches(qc),
  });

  // Bottom sheet state for long press menu (portrait only)
  const [selectedMovement, setSelectedMovement] = useState<Movement | null>(null);

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
            <TouchableOpacity
              key={movement.id}
              onPress={() => handleMovementPress(movement)}
              onLongPress={
                !isLandscape
                  ? () => {
                      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
                      setSelectedMovement(movement);
                    }
                  : undefined
              }
              delayLongPress={300}
              activeOpacity={0.6}
              // @ts-ignore — web-only prop for CSS hover
              dataSet={{ movementRow: "" }}
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
          );
        })}
      </ScrollView>

      {/* Bottom sheet for long press actions (portrait only) */}
      <ModalPanel
        isVisible={selectedMovement !== null}
        onClose={() => setSelectedMovement(null)}
        showConfirmButton={false}
        showCancelButton={false}
        maxHeight={280}
      >
        {selectedMovement && (
          <>
            <View style={styles.sheetHeader}>
              <View style={styles.sheetHeaderLeft}>
                <ThemedText style={styles.sheetTitle} numberOfLines={1}>
                  {selectedMovement.description}
                </ThemedText>
                <ThemedText style={[styles.sheetSubtitle, { color: subtextColor }]}>
                  {formatDateForDisplay(selectedMovement.date, "it-IT")} • {selectedMovement.category}
                </ThemedText>
              </View>
              <ThemedText
                style={[
                  styles.sheetAmount,
                  selectedMovement.totalAmount > 0 && { color: positiveAmountColor },
                ]}
              >
                {selectedMovement.totalAmount > 0 ? "+" : ""}
                {selectedMovement.totalAmount.toFixed(2).replace(".", ",")}€
              </ThemedText>
            </View>
            <View style={[styles.sheetDivider, { backgroundColor: borderColor }]} />
            <View style={styles.menuOptions}>
              <TouchableOpacity
                style={styles.menuOption}
                onPress={() => {
                  const mov = selectedMovement;
                  setSelectedMovement(null);
                  handleMovementPress(mov);
                }}
              >
                <Ionicons name="checkmark-circle-outline" size={22} color={subtextColor} />
                <ThemedText style={styles.menuOptionText}>Confirm Movement</ThemedText>
              </TouchableOpacity>
              <TouchableOpacity
                style={styles.menuOption}
                onPress={() => {
                  const mov = selectedMovement;
                  setSelectedMovement(null);
                  handleDismissMovement(mov);
                }}
              >
                <Ionicons name="close-circle-outline" size={22} color="#DC3545" />
                <ThemedText style={[styles.menuOptionText, { color: "#DC3545" }]}>
                  Dismiss Movement
                </ThemedText>
              </TouchableOpacity>
            </View>
          </>
        )}
      </ModalPanel>
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
  sheetHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-start",
    marginBottom: 12,
  },
  sheetHeaderLeft: {
    flex: 1,
    marginRight: 16,
  },
  sheetTitle: {
    fontSize: 18,
    fontWeight: "600",
    textTransform: "capitalize",
  },
  sheetSubtitle: {
    fontSize: 13,
    marginTop: 2,
    textTransform: "capitalize",
  },
  sheetAmount: {
    fontSize: 18,
    fontWeight: "700",
  },
  sheetDivider: {
    height: 1,
    marginBottom: 8,
  },
  menuOptions: {
    gap: 4,
  },
  menuOption: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: 14,
    paddingHorizontal: 8,
    gap: 12,
  },
  menuOptionText: {
    fontSize: 17,
    fontWeight: "500",
  },
});

export default UnconfirmedMovementsCard;
