import React, { useMemo, useState } from "react";
import { ThemedText } from "../../core/themed-text.native";
import {
  TouchableOpacity,
  StyleSheet,
  View,
  ScrollView,
  Platform,
} from "react-native";
import Card from "@/src/components/core/card";
import { useThemeColor } from "@/src/hooks/use-theme-color";
import {
  useAuthContext,
  useDataContext,
  type PendingRecurrence,
  type IDateRange,
} from "@/src/state";
import { usePlatformContext } from "@/src/state/PlatformProvider";
import { router } from "expo-router";
import * as Haptics from "expo-haptics";
import type { Movement } from "@/src/state";
import IconSymbol from "@/src/components/ui/icon-symbol";
import { MovementHelper } from "@/src/helpers/MovementHelper";
import { isDateInRange, parseDateFromDDMMYYYY } from "@/src/utils/dateUtils";
import MaterialIcons from "@expo/vector-icons/MaterialIcons";
import { useSpreadsheetMutation } from "@/src/hooks/useSpreadsheetMutation";
import { TransactionsApiHelper } from "@/src/helpers/TransactionsApiHelper";
import { TransactionsMutationHelpers, type DeleteMovementData, type OptimisticSnapshot } from "@/src/helpers/TransactionsMutationHelpers";
import ModalPanel from "@/src/components/ui/modal-panel";
import Ionicons from "@expo/vector-icons/Ionicons";

type BadgeStatus = "upcoming" | "soon" | "today" | "overdue" | null;

interface RecurringMovementWithPending {
  movement: Movement;
  pending: PendingRecurrence | null;
  nextOccurrenceDate: string | null;
  badgeStatus: BadgeStatus;
  occurrencesInPeriod: number;
}

interface RecurringMovementsCardProps {
  dateRange: IDateRange;
  onRecurrencePress?: (movement: Movement) => void;
  onEditPress?: (movement: Movement) => void;
}

const RecurringMovementsCard: React.FC<RecurringMovementsCardProps> = ({
  dateRange,
  onRecurrencePress,
  onEditPress,
}) => {
  const { recurringMovements, categories, pendingRecurrences, movements } =
    useDataContext();
  const { orientation } = usePlatformContext();
  const isLandscape = orientation === "landscape";
  const { selectedSpreadsheetId } = useAuthContext();

  // React Query mutation
  const deleteMovement = useSpreadsheetMutation<DeleteMovementData, OptimisticSnapshot>({
    mutationFn: (spreadsheetId, data) => TransactionsApiHelper.deleteMovement(spreadsheetId, data.movementId),
    onMutate: (qc, data) => TransactionsMutationHelpers.optimisticDeleteMovement(qc, data),
    onError: (qc, ctx) => TransactionsMutationHelpers.rollback(qc, ctx),
    onSuccess: (qc) => TransactionsMutationHelpers.invalidateMovementCaches(qc),
  });

  // Bottom sheet state for long press menu (portrait only)
  const [selectedMovement, setSelectedMovement] = useState<Movement | null>(null);

  // Calculate the expected date object for a pending recurrence
  const getExpectedDateObj = (pending: PendingRecurrence): Date | null => {
    const templateDate = parseDateFromDDMMYYYY(pending.template.date);
    const periodStart = parseDateFromDDMMYYYY(pending.periodStart);

    if (!templateDate || !periodStart) return null;

    const day = templateDate.getDate();
    const month = periodStart.getMonth();
    const year = periodStart.getFullYear();
    const lastDayOfMonth = new Date(year, month + 1, 0).getDate();
    const actualDay = Math.min(day, lastDayOfMonth);

    return new Date(year, month, actualDay);
  };

  // Helper to determine badge status based on date
  const getBadgeStatus = (pending: PendingRecurrence | null): BadgeStatus => {
    if (!pending) return null;

    const today = new Date();
    today.setHours(0, 0, 0, 0);

    // If marked as overdue from the period calculation
    if (pending.isOverdue) {
      return "overdue";
    }

    // Calculate the expected date for this occurrence
    const expectedDate = getExpectedDateObj(pending);
    if (!expectedDate) return "soon";

    // Compare expected date with today
    if (expectedDate < today) {
      return "overdue"; // Expected date has passed
    } else if (expectedDate.getTime() === today.getTime()) {
      return "today"; // Expected date is today - yellow
    }

    // Check if it's in the current period
    const periodStart = parseDateFromDDMMYYYY(pending.periodStart);
    const periodEnd = parseDateFromDDMMYYYY(pending.periodEnd);

    if (
      periodStart &&
      periodEnd &&
      today >= periodStart &&
      today <= periodEnd
    ) {
      return "soon"; // Current period but future date - green
    }

    return "upcoming"; // Future period
  };

  // Calculate occurrences in the selected period for a recurring movement
  const getOccurrencesInPeriod = (recurrenceId: string): number => {
    return movements.filter(
      (m:Movement) =>
        m.recurrenceId === recurrenceId &&
        m.status?.toLowerCase() !== "recurrent" &&
        isDateInRange(m.date, dateRange.startDate, dateRange.endDate),
    ).length;
  };

  // Combine recurring movements with their pending status
  // Sort: items with pending occurrences first (overdue, then today, then upcoming), then others at bottom
  const sortedMovements = useMemo((): RecurringMovementWithPending[] => {
    const movementsWithPending = recurringMovements.map((movement:Movement) => {
      // Find pending recurrence for this movement (check overdue first, then current)
      const overduePending = pendingRecurrences?.find(
        (p:PendingRecurrence) => p.template.recurrenceId === movement.recurrenceId && p.isOverdue,
      );
      const currentPending = pendingRecurrences?.find(
        (p:PendingRecurrence) =>
          p.template.recurrenceId === movement.recurrenceId && !p.isOverdue,
      );

      // Prioritize overdue, then current
      const pending = overduePending || currentPending || null;
      const badgeStatus = getBadgeStatus(pending);
      const occurrencesInPeriod = getOccurrencesInPeriod(
        movement.recurrenceId || "",
      );

      return {
        movement,
        pending,
        nextOccurrenceDate: pending ? pending.periodLabel : null,
        badgeStatus,
        occurrencesInPeriod,
      };
    });

    // Sort by: items with pending first, then by expected date (closest/passed first)
    return movementsWithPending.sort((a: RecurringMovementWithPending, b: RecurringMovementWithPending) => {
      // Items with pending first
      if (a.badgeStatus && !b.badgeStatus) return -1;
      if (!a.badgeStatus && b.badgeStatus) return 1;

      // Both have pending - sort by expected date
      if (a.pending && b.pending) {
        const dateA = getExpectedDateObj(a.pending);
        const dateB = getExpectedDateObj(b.pending);

        if (dateA && dateB) {
          // Sort by date (earliest first - overdue and closest dates at top)
          return dateA.getTime() - dateB.getTime();
        }
      }

      // Neither has pending - keep original order
      return 0;
    });
  }, [recurringMovements, pendingRecurrences, movements, dateRange]);

  const handleQuickAdd = (movement: Movement) => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);

    if (onRecurrencePress) {
      onRecurrencePress(movement);
    } else {
      router.push({
        pathname: "/add",
        params: {
          recurrenceId: movement.recurrenceId || "",
        },
      });
    }
  };

  const handleMenuAction = async (movement: Movement, action: string) => {
    if (action === "edit") {
      if (onEditPress) {
        onEditPress(movement);
      } else {
        router.push({
          pathname: "/add",
          params: { movementId: movement.id },
        });
      }
    } else if (action === "delete") {
      if (!selectedSpreadsheetId) return;
      if (
        !confirm(
          "Are you sure you want to delete this recurring movement? This action cannot be undone.",
        )
      )
        return;
      try {
        await deleteMovement.mutateAsync({ movementId: movement.id });
      } catch (error) {
        console.error("Error deleting movement:", error);
        alert("Failed to delete movement");
      }
    }
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

  // Empty state when no recurring movements
  if (!recurringMovements || recurringMovements.length === 0) {
    return (
      <Card
        label={isLandscape ? "Recurring Movements" : ""}
        style={isLandscape ? { flex: 1 } : undefined}
      >
        <View style={styles.emptyState}>
          <IconSymbol name="repeat" size={48} color="#999" />
          <ThemedText style={[styles.emptyTitle, { color: "#999" }]}>
            No recurring movements
          </ThemedText>
          <ThemedText style={[styles.emptyText, { color: subtextColor }]}>
            Add a recurring movement to track it here
          </ThemedText>
        </View>
      </Card>
    );
  }

  // Format amount for display
  const formatAmount = (amount: number) => {
    const sign = amount > 0 ? "+" : "";
    return `${sign}${amount.toFixed(2).replace(".", ",")}€`;
  };

  // Get badge color based on status (semi-transparent)
  const getBadgeColor = (status: BadgeStatus): string => {
    switch (status) {
      case "overdue":
        return "rgba(220, 53, 69, 0.15)"; // Red semi-transparent
      case "today":
        return "rgba(245, 158, 11, 0.15)"; // Orange/Yellow semi-transparent
      case "soon":
      case "upcoming":
        return "rgba(47, 79, 63, 0.15)"; // Green semi-transparent
      default:
        return "rgba(47, 79, 63, 0.15)";
    }
  };

  // Get badge text color based on status
  const getBadgeTextColor = (status: BadgeStatus): string => {
    switch (status) {
      case "overdue":
        return "#DC3545"; // Red
      case "today":
        return "#D97706"; // Orange/Yellow - only for actual today
      case "soon":
      case "upcoming":
        return "#2F4F3F"; // Green
      default:
        return "#2F4F3F";
    }
  };

  // Calculate the expected date for a pending recurrence
  const getExpectedDate = (pending: PendingRecurrence): string => {
    const templateDate = parseDateFromDDMMYYYY(pending.template.date);
    const periodStart = parseDateFromDDMMYYYY(pending.periodStart);

    if (!templateDate || !periodStart) return pending.periodLabel;

    // Get the day from the template and apply it to the period's month/year
    const day = templateDate.getDate();
    const month = periodStart.getMonth();
    const year = periodStart.getFullYear();

    // Handle cases where day doesn't exist in month (e.g., 31 in February)
    const lastDayOfMonth = new Date(year, month + 1, 0).getDate();
    const actualDay = Math.min(day, lastDayOfMonth);

    const expectedDate = new Date(year, month, actualDay);

    // Format as "Jan 15, 2025"
    return expectedDate.toLocaleDateString("en-US", {
      month: "short",
      day: "numeric",
      year: "numeric",
    });
  };

  // Get badge label based on status
  const getBadgeLabel = (
    status: BadgeStatus,
    pending: PendingRecurrence | null,
  ): string => {
    if (!pending) return "";

    switch (status) {
      case "overdue":
        return pending.missingCount > 1
          ? `${pending.missingCount} Overdue`
          : "Overdue";
      case "today":
        return "Today";
      case "soon":
        return "Soon";
      case "upcoming":
        return getExpectedDate(pending);
      default:
        return "";
    }
  };

  // Get the subtitle text (amount + date for overdue, today, and soon)
  const getSubtitleText = (
    status: BadgeStatus,
    pending: PendingRecurrence | null,
    amount: number,
  ): string => {
    const amountStr = formatAmount(amount);
    if (
      (status === "overdue" || status === "today" || status === "soon") &&
      pending
    ) {
      return `${amountStr} • ${getExpectedDate(pending)}`;
    }
    return amountStr;
  };

  return (
    <Card
      label={isLandscape ? "Recurring Movements" : ""}
      style={isLandscape ? { flex: 1 } : undefined}
    >
      <ScrollView
        showsVerticalScrollIndicator={isLandscape}
        nestedScrollEnabled={true}
      >
        {sortedMovements.map(
          ({ movement, pending, badgeStatus, occurrencesInPeriod }, index) => {
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
            const hasPending = badgeStatus !== null;

            return (
              <TouchableOpacity
                key={movement.recurrenceId || movement.id}
                onPress={() => handleQuickAdd(movement)}
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
                style={[
                  styles.recurringItem,
                  dynamicStyles.itemBorder,
                  index === sortedMovements.length - 1 && styles.lastItem,
                ]}
              >
                <View
                  style={[styles.iconContainer, { backgroundColor: color }]}
                >
                  <IconSymbol name={icon} size={20} color="#FFFFFF" />
                </View>
                <View style={styles.itemInfo}>
                  <ThemedText
                    style={styles.itemDescription}
                    numberOfLines={1}
                  >
                    {movement.description}
                  </ThemedText>
                  <ThemedText
                    style={[styles.itemSubtitle, { color: subtextColor }]}
                  >
                    {hasPending
                      ? getSubtitleText(badgeStatus, pending, amount)
                      : `${formatAmount(amount)} • ${occurrencesInPeriod} occurrence${occurrencesInPeriod !== 1 ? "s" : ""} this period`}
                  </ThemedText>
                </View>
                {hasPending && (
                  <View
                    style={[
                      styles.statusBadge,
                      { backgroundColor: getBadgeColor(badgeStatus) },
                    ]}
                  >
                    <ThemedText
                      style={[
                        styles.statusBadgeText,
                        { color: getBadgeTextColor(badgeStatus) },
                      ]}
                    >
                      {getBadgeLabel(badgeStatus, pending)}
                    </ThemedText>
                  </View>
                )}
                {isLandscape && (
                  <View style={styles.menuButton}>
                    <MaterialIcons
                      name="more-vert"
                      size={20}
                      color={subtextColor}
                    />
                    {Platform.OS === "web" && (
                      // @ts-ignore — HTML select for web
                      <select
                        value=""
                        onChange={(e: any) => {
                          e.stopPropagation();
                          handleMenuAction(movement, e.target.value);
                          e.target.value = "";
                        }}
                        onClick={(e: any) => e.stopPropagation()}
                        style={{
                          position: "absolute",
                          top: 0,
                          left: 0,
                          width: "100%",
                          height: "100%",
                          opacity: 0,
                          cursor: "pointer",
                        }}
                      >
                        <option value="" disabled />
                        <option value="edit">Edit</option>
                        <option value="delete">Delete</option>
                      </select>
                    )}
                  </View>
                )}
              </TouchableOpacity>
            );

          },
        )}
      </ScrollView>

      {/* Bottom sheet for long press actions (portrait only) */}
      <ModalPanel
        isVisible={selectedMovement !== null}
        onClose={() => setSelectedMovement(null)}
        showConfirmButton={false}
        showCancelButton={false}
        maxHeight={320}
      >
        {selectedMovement && (
          <>
            <View style={styles.sheetHeader}>
              <View style={styles.sheetHeaderLeft}>
                <ThemedText style={styles.sheetTitle} numberOfLines={1}>
                  {selectedMovement.description}
                </ThemedText>
                <ThemedText style={[styles.sheetSubtitle, { color: subtextColor }]}>
                  Recurring • {selectedMovement.category}
                </ThemedText>
              </View>
              <ThemedText
                style={[
                  styles.sheetAmount,
                  selectedMovement.totalAmount > 0 && { color: "#107c2b" },
                ]}
              >
                {formatAmount(selectedMovement.totalAmount)}
              </ThemedText>
            </View>
            <View style={[styles.sheetDivider, { backgroundColor: borderColor }]} />
            <View style={styles.menuOptions}>
              <TouchableOpacity
                style={styles.menuOption}
                onPress={() => {
                  const mov = selectedMovement;
                  setSelectedMovement(null);
                  handleQuickAdd(mov);
                }}
              >
                <Ionicons name="add-circle-outline" size={22} color={subtextColor} />
                <ThemedText style={styles.menuOptionText}>Insert Movement</ThemedText>
              </TouchableOpacity>
              <TouchableOpacity
                style={styles.menuOption}
                onPress={() => {
                  const mov = selectedMovement;
                  setSelectedMovement(null);
                  handleMenuAction(mov, "edit");
                }}
              >
                <Ionicons name="create-outline" size={22} color={subtextColor} />
                <ThemedText style={styles.menuOptionText}>Edit Recurrence</ThemedText>
              </TouchableOpacity>
              <TouchableOpacity
                style={styles.menuOption}
                onPress={() => {
                  const mov = selectedMovement;
                  setSelectedMovement(null);
                  handleMenuAction(mov, "delete");
                }}
              >
                <Ionicons name="trash-outline" size={22} color="#DC3545" />
                <ThemedText style={[styles.menuOptionText, { color: "#DC3545" }]}>
                  Delete Recurrence
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
    marginRight: 8,
  },
  itemDescription: {
    fontSize: 16,
    fontWeight: "500",
    textTransform: "capitalize",
  },
  itemSubtitle: {
    fontSize: 12,
    marginTop: 2,
  },
  statusBadge: {
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 12,
    marginRight: 8,
  },
  statusBadgeText: {
    fontSize: 10,
    fontWeight: "600",
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
  menuButton: {
    padding: 6,
    borderRadius: 20,
    marginLeft: 4,
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

export default RecurringMovementsCard;
