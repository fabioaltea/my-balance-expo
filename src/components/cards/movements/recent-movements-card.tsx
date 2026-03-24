import React, { useEffect, useState } from "react";
import { ThemedText } from "@/src/components/core/themed-text";
import { TouchableOpacity, StyleSheet, View, ScrollView, Alert } from "react-native";
import IconSymbol from "@/src/components/ui/icon-symbol";
import Card from "@/src/components/core/card";
import ChartSkeleton from "@/src/components/charts/chart-skeleton";
import { useThemeColor } from "@/src/hooks/use-theme-color";
import { useDataContext } from "@/src/state/DataProvider";
import { useAuthContext } from "@/src/state/AuthProvider";
import { usePlatformContext } from "@//src/state/PlatformProvider";
import { formatDateForDisplay, compareDates } from "@/src/utils/dateUtils";
import { router } from "expo-router";
import * as Haptics from "expo-haptics";
import type { Movement } from "@/src/state";
import { MovementHelper } from "@/src/helpers/MovementHelper";
import { useSpreadsheetMutation } from "@/src/hooks/useSpreadsheetMutation";
import { TransactionsApiHelper } from "@/src/helpers/TransactionsApiHelper";
import { TransactionsMutationHelpers, type DeleteMovementData, type OptimisticSnapshot } from "@/src/helpers/TransactionsMutationHelpers";
import ModalPanel from "@/src/components/ui/modal-panel";
import Ionicons from "@expo/vector-icons/Ionicons";

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
  const { selectedSpreadsheetId } = useAuthContext();
  const [recentMovements, setRecentMovements] = useState(
    sortMovements(movements),
  );
  const { orientation } = usePlatformContext();
  const isLandscape = orientation === "landscape";

  // Bottom sheet state for long press menu (portrait only)
  const [selectedMovement, setSelectedMovement] = useState<Movement | null>(null);

  // React Query mutation
  const deleteMovement = useSpreadsheetMutation<DeleteMovementData, OptimisticSnapshot>({
    mutationFn: (spreadsheetId, data) => TransactionsApiHelper.deleteMovement(spreadsheetId, data.movementId),
    onMutate: (qc, data) => TransactionsMutationHelpers.optimisticDeleteMovement(qc, data),
    onError: (qc, ctx) => TransactionsMutationHelpers.rollback(qc, ctx),
    onSuccess: (qc) => TransactionsMutationHelpers.invalidateMovementCaches(qc),
  });

  const handleDeleteMovement = async (movement: Movement) => {
    if (!selectedSpreadsheetId) return;
    Alert.alert(
      "Delete movement?",
      "This action cannot be undone.",
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Delete",
          style: "destructive",
          onPress: async () => {
            try {
              await deleteMovement.mutateAsync({ movementId: movement.id });
              Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
            } catch (error) {
              console.error("Error deleting movement:", error);
              Alert.alert("Error", "Failed to delete movement");
            }
          },
        },
      ],
    );
  };

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
  const subtextColor = useThemeColor(
    { light: "#888", dark: "#999" },
    "tabIconDefault",
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
      <Card label={isLandscape ? "Recent Movements" : ""} style={isLandscape ? { flex: 1 } : undefined}>
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
        style={{ paddingRight: 10 }}
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
              onLongPress={
                !isLandscape
                  ? () => {
                      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
                      setSelectedMovement(movement);
                    }
                  : undefined
              }
              delayLongPress={300}
              // @ts-ignore — web-only prop for CSS hover
              dataSet={{ movementRow: "" }}
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

      {/* Bottom sheet for long press actions (portrait only) */}
      <ModalPanel
        isVisible={selectedMovement !== null}
        onClose={() => setSelectedMovement(null)}
        showConfirmButton={false}
        showCancelButton={false}
        maxHeight={260}
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
                <Ionicons name="create-outline" size={22} color={subtextColor} />
                <ThemedText style={styles.menuOptionText}>Edit</ThemedText>
              </TouchableOpacity>
              <TouchableOpacity
                style={styles.menuOption}
                onPress={() => {
                  const mov = selectedMovement;
                  setSelectedMovement(null);
                  handleDeleteMovement(mov);
                }}
              >
                <Ionicons name="trash-outline" size={22} color="#DC3545" />
                <ThemedText style={[styles.menuOptionText, { color: "#DC3545" }]}>
                  Delete
                </ThemedText>
              </TouchableOpacity>
            </View>
          </>
        )}
      </ModalPanel>
    </Card>
  );
};

export default MovementsCard;
