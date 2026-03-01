import React, { useState, useRef, useMemo } from "react";
import { ThemedText } from "../core/themed-text";
import { TouchableOpacity, StyleSheet, View, Alert, ScrollView } from "react-native";
import Card from "../core/card";
import { useThemeColor } from "@/hooks/use-theme-color";
import { useAuthContext, useDataContext, type PendingRecurrence, type IDateRange } from "@/state";
import { usePlatformContext } from "@/state/PlatformProvider";
import { router } from "expo-router";
import * as Haptics from "expo-haptics";
import type { Movement } from "@/state";
import ContextMenu, { IContextMenuOption } from "../ui/context-menu";
import IconSymbol from "../ui/icon-symbol";
import { MovementHelper } from "@/helpers/MovementHelper";
import { isDateInRange, parseDateFromDDMMYYYY } from "@/utils/dateUtils";
import { useDeleteMovement } from "@/hooks/mutations";

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
  onMovementLongPress?: (movement: Movement) => void;
}





const RecurringMovementsCard: React.FC<RecurringMovementsCardProps> = ({ dateRange, onRecurrencePress, onMovementLongPress }) => {
  const { recurringMovements, categories, pendingRecurrences, movements } = useDataContext();
  const { orientation } = usePlatformContext();
  const isLandscape = orientation === "landscape";
  const { selectedSpreadsheetId } = useAuthContext();

  // React Query mutation
  const deleteMovement = useDeleteMovement();

  const [menuVisible, setMenuVisible] = useState(false);
  const [buttonPosition, setButtonPosition] = useState<{
    x: number;
    y: number;
    width: number;
    height: number;
  } | null>(null);
  const [selectedMovement, setSelectedMovement] = useState<Movement | null>(null);
  const itemRefs = useRef<Map<string, View>>(new Map());

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

    if (periodStart && periodEnd && today >= periodStart && today <= periodEnd) {
      return "soon"; // Current period but future date - green
    }

    return "upcoming"; // Future period
  };

  // Calculate occurrences in the selected period for a recurring movement
  const getOccurrencesInPeriod = (recurrenceId: string): number => {
    return movements.filter(
      (m) =>
        m.recurrenceId === recurrenceId &&
        m.status?.toLowerCase() !== "recurrent" &&
        isDateInRange(m.date, dateRange.startDate, dateRange.endDate)
    ).length;
  };

  // Combine recurring movements with their pending status
  // Sort: items with pending occurrences first (overdue, then today, then upcoming), then others at bottom
  const sortedMovements = useMemo((): RecurringMovementWithPending[] => {
    const movementsWithPending = recurringMovements.map((movement) => {
      // Find pending recurrence for this movement (check overdue first, then current)
      const overduePending = pendingRecurrences?.find(
        (p) => p.template.recurrenceId === movement.recurrenceId && p.isOverdue
      );
      const currentPending = pendingRecurrences?.find(
        (p) => p.template.recurrenceId === movement.recurrenceId && !p.isOverdue
      );

      // Prioritize overdue, then current
      const pending = overduePending || currentPending || null;
      const badgeStatus = getBadgeStatus(pending);
      const occurrencesInPeriod = getOccurrencesInPeriod(movement.recurrenceId || "");

      return {
        movement,
        pending,
        nextOccurrenceDate: pending ? pending.periodLabel : null,
        badgeStatus,
        occurrencesInPeriod,
      };
    });

    // Sort by: items with pending first, then by expected date (closest/passed first)
    return movementsWithPending.sort((a, b) => {
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
              // Use React Query mutation
              await deleteMovement.mutateAsync({
                movementId: selectedMovement.id,
              });

              // Success - mutation handles cache invalidation automatically
              Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
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

  // Empty state when no recurring movements
  if (!recurringMovements || recurringMovements.length === 0) {
    return (
      <Card label={isLandscape ? "Recurring Movements" : ""} style={isLandscape ? { flex: 1 } : undefined}>
        <View style={styles.emptyState}>
          <IconSymbol name="repeat" size={48} color="#999" />
          <ThemedText style={[styles.emptyTitle, { color: "#999" }]}>No recurring movements</ThemedText>
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
  const getBadgeLabel = (status: BadgeStatus, pending: PendingRecurrence | null): string => {
    if (!pending) return "";

    switch (status) {
      case "overdue":
        return pending.missingCount > 1 ? `${pending.missingCount} Overdue` : "Overdue";
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
  const getSubtitleText = (status: BadgeStatus, pending: PendingRecurrence | null, amount: number): string => {
    const amountStr = formatAmount(amount);
    if ((status === "overdue" || status === "today" || status === "soon") && pending) {
      return `${amountStr} • ${getExpectedDate(pending)}`;
    }
    return amountStr;
  };

  return (
    <Card label={isLandscape ? "Recurring Movements" : ""} style={isLandscape ? { flex: 1 } : undefined}>
      <ScrollView showsVerticalScrollIndicator={isLandscape} nestedScrollEnabled={true}>
      {sortedMovements.map(({ movement, pending, badgeStatus, occurrencesInPeriod }, index) => {
        const icon = MovementHelper.getMovementIcon(movement.category, categories);
        const color = MovementHelper.getMovementColor(
          movement.type,
          movement.category,
          categories
        );
        const amount = movement.totalAmount;
        const hasPending = badgeStatus !== null;

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
                index === sortedMovements.length - 1 && styles.lastItem,
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
                <ThemedText style={styles.itemDescription} numberOfLines={1}>
                  {movement.description}
                </ThemedText>
                <ThemedText
                  style={[styles.itemSubtitle, { color: subtextColor }]}
                >
                  {hasPending
                    ? getSubtitleText(badgeStatus, pending, amount)
                    : `${formatAmount(amount)} • ${occurrencesInPeriod} occurrence${occurrencesInPeriod !== 1 ? "s" : ""} this period`
                  }
                </ThemedText>
              </View>
              {hasPending && (
                <View style={[styles.statusBadge, { backgroundColor: getBadgeColor(badgeStatus) }]}>
                  <ThemedText style={[styles.statusBadgeText, { color: getBadgeTextColor(badgeStatus) }]}>
                    {getBadgeLabel(badgeStatus, pending)}
                  </ThemedText>
                </View>
              )}
              <IconSymbol name="chevron-right" size={20} color={subtextColor} />
            </TouchableOpacity>
          </View>
        );
      })}
      </ScrollView>

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
});

export default RecurringMovementsCard;
