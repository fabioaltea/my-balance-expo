import React, { useEffect, useMemo, useState } from 'react';
import { ThemedText } from '../../core/themed-text';
import { TouchableOpacity, StyleSheet, View, ScrollView, Platform } from 'react-native';
import Card from '@/src/components/core/card';
import { useThemeColor } from '@/src/hooks/use-theme-color';
import {
  useAuthContext,
  useDataContext,
  type PendingRecurrence,
  type IDateRange,
} from '@/src/state';
import { usePlatformContext } from '@/src/state/PlatformProvider';
import { router } from 'expo-router';
import * as Haptics from 'expo-haptics';
import type { Movement } from '@/src/state';
import IconSymbol from '@/src/components/ui/icon-symbol';
import { MovementHelper } from '@/src/helpers/MovementHelper';
import { isDateInRange, parseDateFromDDMMYYYY } from '@/src/utils/dateUtils';
import MaterialIcons from '@expo/vector-icons/MaterialIcons';
import { useSpreadsheetMutation } from '@/src/hooks/useSpreadsheetMutation';
import { TransactionsApiHelper } from '@/src/helpers/TransactionsApiHelper';
import {
  TransactionsMutationHelpers,
  type DeleteMovementData,
  type DismissMovementData,
  type OptimisticSnapshot,
} from '@/src/helpers/TransactionsMutationHelpers';
import ModalPanel from '@/src/components/ui/modal-panel';
import Ionicons from '@expo/vector-icons/Ionicons';
import { MovementSelectionIcon, MovementSelectionToolbar } from './movement-selection-controls';

type BadgeStatus = 'upcoming' | 'soon' | 'today' | 'overdue' | null;

const isWeb = Platform.OS === 'web';

interface RecurringMovementWithPending {
  movement: Movement;
  pending: PendingRecurrence | null;
  nextOccurrenceDate: string | null;
  badgeStatus: BadgeStatus;
  occurrencesInPeriod: number;
  periodTotal: number;
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
  const { recurringMovements, categories, pendingRecurrences, movements } = useDataContext();
  const { orientation } = usePlatformContext();
  const isLandscape = orientation === 'landscape';
  const { selectedSpreadsheetId } = useAuthContext();

  // React Query mutations
  const deleteMovement = useSpreadsheetMutation<DeleteMovementData, OptimisticSnapshot>({
    mutationFn: (spreadsheetId, data) =>
      TransactionsApiHelper.deleteMovement(spreadsheetId, data.movementId),
    onMutate: (qc, data) => TransactionsMutationHelpers.optimisticDeleteMovement(qc, data),
    onError: (qc, ctx) => TransactionsMutationHelpers.rollback(qc, ctx),
    onSuccess: (qc) => TransactionsMutationHelpers.invalidateMovementCaches(qc),
  });

  const dismissMovement = useSpreadsheetMutation<DismissMovementData, OptimisticSnapshot>({
    mutationFn: (spreadsheetId, data) =>
      TransactionsApiHelper.createMovement(spreadsheetId, {
        description: data.description,
        category: data.category,
        date: data.date,
        status: 'dismissed',
        recurrenceId: data.recurrenceId,
        transactions: [{ amount: '0', account: '', type: 'out' }],
      }),
    onMutate: (qc, data) => TransactionsMutationHelpers.optimisticDismissMovement(qc, data),
    onError: (qc, ctx) => TransactionsMutationHelpers.rollback(qc, ctx),
    onSuccess: (qc) => TransactionsMutationHelpers.invalidateMovementCaches(qc),
  });

  // Bottom sheet state for long press menu (portrait only)
  const [selectedMovement, setSelectedMovement] = useState<Movement | null>(null);
  const [selectedPending, setSelectedPending] = useState<PendingRecurrence | null>(null);
  const [selectedMovementIds, setSelectedMovementIds] = useState<Set<string>>(new Set());

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
      return 'overdue';
    }

    // Calculate the expected date for this occurrence
    const expectedDate = getExpectedDateObj(pending);
    if (!expectedDate) return 'soon';

    // Compare expected date with today
    if (expectedDate < today) {
      return 'overdue'; // Expected date has passed
    } else if (expectedDate.getTime() === today.getTime()) {
      return 'today'; // Expected date is today - yellow
    }

    // Check if it's in the current period
    const periodStart = parseDateFromDDMMYYYY(pending.periodStart);
    const periodEnd = parseDateFromDDMMYYYY(pending.periodEnd);

    if (periodStart && periodEnd && today >= periodStart && today <= periodEnd) {
      return 'soon'; // Current period but future date - green
    }

    return 'upcoming'; // Future period
  };

  // Combine recurring movements with their pending status
  // Sort: items with pending occurrences first (overdue, then today, then upcoming), then others at bottom
  const sortedMovements = useMemo((): RecurringMovementWithPending[] => {
    const periodStats = new Map<string, { count: number; total: number }>();
    for (const movement of movements) {
      if (
        !movement.recurrenceId ||
        movement.status?.toLowerCase() === 'recurrent' ||
        !isDateInRange(movement.date, dateRange.startDate, dateRange.endDate)
      ) {
        continue;
      }

      const stats = periodStats.get(movement.recurrenceId) ?? { count: 0, total: 0 };
      stats.count += 1;
      stats.total += movement.totalAmount;
      periodStats.set(movement.recurrenceId, stats);
    }

    const movementsWithPending = recurringMovements.map((movement: Movement) => {
      // Find pending recurrence for this movement (check overdue first, then current)
      const overduePending = pendingRecurrences?.find(
        (p: PendingRecurrence) => p.template.recurrenceId === movement.recurrenceId && p.isOverdue,
      );
      const currentPending = pendingRecurrences?.find(
        (p: PendingRecurrence) => p.template.recurrenceId === movement.recurrenceId && !p.isOverdue,
      );

      // Prioritize overdue, then current
      const pending = overduePending || currentPending || null;
      const badgeStatus = getBadgeStatus(pending);
      const stats = periodStats.get(movement.recurrenceId || '');

      return {
        movement,
        pending,
        nextOccurrenceDate: pending ? pending.periodLabel : null,
        badgeStatus,
        occurrencesInPeriod: stats?.count ?? 0,
        periodTotal: stats?.total ?? 0,
      };
    });

    // Sort by: items with pending first, then by expected date (closest/passed first)
    return movementsWithPending.sort(
      (a: RecurringMovementWithPending, b: RecurringMovementWithPending) => {
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
      },
    );
  }, [recurringMovements, pendingRecurrences, movements, dateRange]);

  useEffect(() => {
    const availableIds = new Set(sortedMovements.map(({ movement }) => movement.id));
    setSelectedMovementIds((current) => {
      const next = new Set([...current].filter((id) => availableIds.has(id)));
      return next.size === current.size ? current : next;
    });
  }, [sortedMovements]);

  const toggleMovementSelection = (movementId: string) => {
    setSelectedMovementIds((current) => {
      const next = new Set(current);
      if (next.has(movementId)) next.delete(movementId);
      else next.add(movementId);
      return next;
    });
  };

  const selectedRecurringMovements = sortedMovements.filter(({ movement }) =>
    selectedMovementIds.has(movement.id),
  );
  const dismissableRecurringMovements = selectedRecurringMovements.filter(({ pending }) => pending);

  const handleSelectedEdit = () => {
    if (selectedRecurringMovements.length === 1) {
      setSelectedMovementIds(new Set());
      handleMenuAction(selectedRecurringMovements[0].movement, 'edit');
    }
  };

  const handleSelectedDismiss = async () => {
    if (!dismissableRecurringMovements.length) return;
    for (const { movement, pending } of dismissableRecurringMovements) {
      await handleMenuAction(movement, 'dismiss', pending);
    }
    setSelectedMovementIds(new Set());
  };

  const handleSelectedDelete = async () => {
    if (!selectedSpreadsheetId || !selectedRecurringMovements.length) return;
    const message =
      selectedRecurringMovements.length === 1
        ? 'Delete this recurring movement? This action cannot be undone.'
        : `Delete ${selectedRecurringMovements.length} recurring movements? This action cannot be undone.`;
    if (!confirm(message)) return;

    try {
      await Promise.all(
        selectedRecurringMovements.map(({ movement }) =>
          deleteMovement.mutateAsync({ movementId: movement.id }),
        ),
      );
      setSelectedMovementIds(new Set());
    } catch (error) {
      console.error('Error deleting selected recurring movements:', error);
      alert('Failed to delete selected recurring movements');
    }
  };

  const handleQuickAdd = (movement: Movement) => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);

    if (onRecurrencePress) {
      onRecurrencePress(movement);
    } else {
      router.push({
        pathname: '/add',
        params: {
          recurrenceId: movement.recurrenceId || '',
        },
      });
    }
  };

  const handleMenuAction = async (
    movement: Movement,
    action: string,
    pending?: PendingRecurrence | null,
  ) => {
    if (action === 'edit') {
      if (onEditPress) {
        onEditPress(movement);
      } else {
        router.push({
          pathname: '/add',
          params: { movementId: movement.id },
        });
      }
    } else if (action === 'dismiss') {
      if (!selectedSpreadsheetId || !movement.recurrenceId) return;
      const activePending = pending || null;
      if (!activePending) return;

      // Calculate the expected date for the dismissed movement
      const expectedDate = getExpectedDateObj(activePending);
      let dateStr: string;
      if (expectedDate) {
        const dd = String(expectedDate.getDate()).padStart(2, '0');
        const mm = String(expectedDate.getMonth() + 1).padStart(2, '0');
        const yyyy = expectedDate.getFullYear();
        dateStr = `${dd}-${mm}-${yyyy}`;
      } else {
        dateStr = activePending.periodStart;
      }

      try {
        await dismissMovement.mutateAsync({
          description: movement.description,
          category: movement.category,
          date: dateStr,
          recurrenceId: movement.recurrenceId,
        });
      } catch (error) {
        console.error('Error dismissing movement:', error);
        alert('Failed to dismiss movement');
      }
    } else if (action === 'delete') {
      if (!selectedSpreadsheetId) return;
      if (
        !confirm(
          'Are you sure you want to delete this recurring movement? This action cannot be undone.',
        )
      )
        return;
      try {
        await deleteMovement.mutateAsync({ movementId: movement.id });
      } catch (error) {
        console.error('Error deleting movement:', error);
        alert('Failed to delete movement');
      }
    }
  };

  // Theme colors
  const borderColor = useThemeColor({ light: '#F0F0F0', dark: '#333333' }, 'tabIconDefault');
  const subtextColor = useThemeColor({ light: '#888', dark: '#999' }, 'tabIconDefault');
  const selectedRowColor = useThemeColor(
    { light: 'rgba(47, 79, 63, 0.055)', dark: 'rgba(214, 232, 222, 0.055)' },
    'menuBackground',
  );
  const countBadgeBackground = useThemeColor(
    { light: 'rgba(47, 79, 63, 0.10)', dark: 'rgba(214, 232, 222, 0.13)' },
    'menuBackground',
  );
  const countBadgeTextColor = useThemeColor({ light: '#2F4F3F', dark: '#D6E8DE' }, 'text');

  const dynamicStyles = StyleSheet.create({
    itemBorder: {
      borderBottomColor: borderColor,
    },
  });

  // Empty state when no recurring movements
  if (!recurringMovements || recurringMovements.length === 0) {
    return (
      <Card
        label={isWeb || isLandscape ? 'Recurring movements' : ''}
        style={isLandscape ? { flex: 1 } : undefined}
      >
        <View style={styles.emptyState}>
          <IconSymbol name="repeat" size={isWeb ? 32 : 40} color="#999" />
          <ThemedText style={[styles.emptyTitle, { color: '#999' }]}>
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
    const sign = amount > 0 ? '+' : '';
    return `${sign}${amount.toFixed(2).replace('.', ',')}€`;
  };

  // Get badge color based on status (semi-transparent)
  const getBadgeColor = (status: BadgeStatus): string => {
    switch (status) {
      case 'overdue':
        return 'rgba(220, 53, 69, 0.15)'; // Red semi-transparent
      case 'today':
        return 'rgba(245, 158, 11, 0.15)'; // Orange/Yellow semi-transparent
      case 'soon':
      case 'upcoming':
        return 'rgba(47, 79, 63, 0.15)'; // Green semi-transparent
      default:
        return 'rgba(47, 79, 63, 0.15)';
    }
  };

  // Get badge text color based on status
  const getBadgeTextColor = (status: BadgeStatus): string => {
    switch (status) {
      case 'overdue':
        return '#DC3545'; // Red
      case 'today':
        return '#D97706'; // Orange/Yellow - only for actual today
      case 'soon':
      case 'upcoming':
        return '#2F4F3F'; // Green
      default:
        return '#2F4F3F';
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
    return expectedDate.toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
    });
  };

  // Get badge label based on status
  const getBadgeLabel = (status: BadgeStatus, pending: PendingRecurrence | null): string => {
    if (!pending) return '';

    switch (status) {
      case 'overdue':
        return pending.missingCount > 1 ? `${pending.missingCount} Overdue` : 'Overdue';
      case 'today':
        return 'Today';
      case 'soon':
        return 'Soon';
      case 'upcoming':
        return getExpectedDate(pending);
      default:
        return '';
    }
  };

  // Show the total for occurrences in the selected period and any pending date.
  const getSubtitleText = (
    status: BadgeStatus,
    pending: PendingRecurrence | null,
    periodTotal: number,
  ): string => {
    const amountStr = `${formatAmount(periodTotal)}${isWeb ? ' in current period' : ''}`;
    if ((status === 'overdue' || status === 'today' || status === 'soon') && pending) {
      return `${amountStr} • ${getExpectedDate(pending)}`;
    }
    return amountStr;
  };

  return (
    <Card
      label={isWeb || isLandscape ? 'Recurring movements' : ''}
      headerAction={
        isWeb && selectedRecurringMovements.length ? (
          <MovementSelectionToolbar
            actions={[
              ...(selectedRecurringMovements.length === 1
                ? [{ label: 'Edit recurrence', icon: 'edit' as const, onPress: handleSelectedEdit }]
                : []),
              {
                label: 'Dismiss selected recurrences',
                icon: 'visibility-off',
                onPress: handleSelectedDismiss,
                disabled: !dismissableRecurringMovements.length,
              },
              {
                label: 'Delete selected recurrences',
                icon: 'delete-outline',
                onPress: handleSelectedDelete,
                destructive: true,
              },
            ]}
          />
        ) : undefined
      }
      style={isLandscape ? { flex: 1 } : undefined}
      compact={isWeb}
    >
      <ScrollView
        showsVerticalScrollIndicator={isLandscape}
        nestedScrollEnabled={true}
        style={isWeb ? styles.scrollViewWeb : undefined}
      >
        {sortedMovements.map((entry, index) => {
          const { movement, pending, badgeStatus, occurrencesInPeriod, periodTotal } = entry;
          const icon = MovementHelper.getMovementIcon(movement.category, categories);
          const color = MovementHelper.getMovementColor(
            movement.type,
            movement.category,
            categories,
          );
          const hasPending = badgeStatus !== null;
          const isSelected = selectedMovementIds.has(movement.id);
          const previousSelected =
            index > 0 && selectedMovementIds.has(sortedMovements[index - 1].movement.id);
          const nextSelected =
            index < sortedMovements.length - 1 &&
            selectedMovementIds.has(sortedMovements[index + 1].movement.id);

          return (
            <TouchableOpacity
              key={movement.recurrenceId || movement.id}
              onPress={() => handleQuickAdd(movement)}
              onLongPress={
                !isLandscape
                  ? () => {
                      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
                      setSelectedMovement(movement);
                      setSelectedPending(pending);
                    }
                  : undefined
              }
              delayLongPress={300}
              activeOpacity={0.6}
              // @ts-ignore — web-only prop for CSS hover
              dataSet={{
                movementRow: '',
                movementSelected: isSelected ? 'true' : undefined,
                movementSelectedStart: isSelected && !previousSelected ? 'true' : undefined,
                movementSelectedEnd: isSelected && !nextSelected ? 'true' : undefined,
              }}
              style={[
                styles.recurringItem,
                dynamicStyles.itemBorder,
                isWeb && isSelected && { backgroundColor: selectedRowColor },
                index === sortedMovements.length - 1 && styles.lastItem,
              ]}
            >
              {isWeb ? (
                <MovementSelectionIcon
                  selected={isSelected}
                  onToggle={() => toggleMovementSelection(movement.id)}
                  label={`Select ${movement.description}`}
                  icon={icon}
                  color={color}
                />
              ) : (
                <View style={[styles.iconContainer, { backgroundColor: color }]}>
                  <IconSymbol name={icon} size={20} color="#FFFFFF" />
                </View>
              )}
              <View style={styles.itemInfo}>
                <ThemedText style={styles.itemDescription} numberOfLines={1}>
                  {movement.description}
                </ThemedText>
                <ThemedText style={[styles.itemSubtitle, { color: subtextColor }]}>
                  {hasPending
                    ? getSubtitleText(badgeStatus, pending, periodTotal)
                    : `${formatAmount(periodTotal)}${isWeb ? ' in current period' : ''}`}
                </ThemedText>
              </View>
              <View style={styles.badgeRow}>
                {hasPending && (
                  <View
                    style={[styles.statusBadge, { backgroundColor: getBadgeColor(badgeStatus) }]}
                  >
                    <ThemedText
                      style={[styles.statusBadgeText, { color: getBadgeTextColor(badgeStatus) }]}
                    >
                      {getBadgeLabel(badgeStatus, pending)}
                    </ThemedText>
                  </View>
                )}
                <View style={[styles.countBadge, { backgroundColor: countBadgeBackground }]}>
                  <ThemedText
                    accessibilityLabel={`${occurrencesInPeriod} ${occurrencesInPeriod === 1 ? 'occurrence' : 'occurrences'} this period`}
                    style={[styles.countBadgeText, { color: countBadgeTextColor }]}
                    numberOfLines={1}
                  >
                    {occurrencesInPeriod}
                  </ThemedText>
                </View>
              </View>
              {isLandscape && !isWeb && (
                <View style={styles.menuButton}>
                  <MaterialIcons name="more-vert" size={20} color={subtextColor} />
                </View>
              )}
            </TouchableOpacity>
          );
        })}
      </ScrollView>

      {/* Bottom sheet for long press actions (portrait only) */}
      <ModalPanel
        isVisible={selectedMovement !== null}
        onClose={() => {
          setSelectedMovement(null);
          setSelectedPending(null);
        }}
        showConfirmButton={false}
        showCancelButton={false}
        maxHeight={370}
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
                  selectedMovement.totalAmount > 0 && { color: '#107c2b' },
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
                  setSelectedPending(null);
                  handleQuickAdd(mov);
                }}
              >
                <Ionicons name="add-circle-outline" size={22} color={subtextColor} />
                <ThemedText style={styles.menuOptionText}>Insert Movement</ThemedText>
              </TouchableOpacity>
              {selectedPending && (
                <TouchableOpacity
                  style={styles.menuOption}
                  onPress={() => {
                    const mov = selectedMovement;
                    const pend = selectedPending;
                    setSelectedMovement(null);
                    setSelectedPending(null);
                    handleMenuAction(mov, 'dismiss', pend);
                  }}
                >
                  <Ionicons name="eye-off-outline" size={22} color={subtextColor} />
                  <ThemedText style={styles.menuOptionText}>Dismiss</ThemedText>
                </TouchableOpacity>
              )}
              <TouchableOpacity
                style={styles.menuOption}
                onPress={() => {
                  const mov = selectedMovement;
                  setSelectedMovement(null);
                  setSelectedPending(null);
                  handleMenuAction(mov, 'edit');
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
                  setSelectedPending(null);
                  handleMenuAction(mov, 'delete');
                }}
              >
                <Ionicons name="trash-outline" size={22} color="#DC3545" />
                <ThemedText style={[styles.menuOptionText, { color: '#DC3545' }]}>
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
  scrollViewWeb: {
    paddingRight: 12,
  },
  recurringItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: isWeb ? 8 : 9,
    borderBottomWidth: 1,
  },
  lastItem: {
    borderBottomWidth: 0,
  },
  iconContainer: {
    width: isWeb ? 36 : 42,
    height: isWeb ? 36 : 42,
    borderRadius: isWeb ? 12 : 14,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: isWeb ? 11 : 12,
  },
  itemInfo: {
    flex: 1,
    minWidth: 0,
    marginRight: 8,
  },
  itemDescription: {
    fontSize: isWeb ? 14 : 15,
    fontWeight: '600',
    textTransform: 'capitalize',
  },
  itemSubtitle: {
    fontSize: isWeb ? 11 : 12,
    marginTop: 2,
  },
  statusBadge: {
    paddingHorizontal: isWeb ? 6 : 8,
    paddingVertical: 2,
    borderRadius: isWeb ? 8 : 10,
  },
  statusBadgeText: {
    fontSize: 10,
    fontWeight: '600',
  },
  badgeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    flexShrink: 0,
    gap: isWeb ? 5 : 7,
  },
  countBadge: {
    minWidth: isWeb ? 24 : 28,
    paddingHorizontal: isWeb ? 7 : 8,
    paddingVertical: 2,
    borderRadius: isWeb ? 8 : 10,
    alignItems: 'center',
  },
  countBadgeText: {
    fontSize: 10,
    fontWeight: '700',
  },
  emptyState: {
    alignItems: 'center',
    justifyContent: 'center',
    gap: isWeb ? 6 : 8,
  },
  emptyTitle: {
    fontSize: isWeb ? 15 : 16,
    fontWeight: '600',
    marginTop: 8,
  },
  emptyText: {
    fontSize: isWeb ? 12 : 13,
    textAlign: 'center',
  },
  menuButton: {
    padding: 6,
    borderRadius: isWeb ? 12 : 14,
    marginLeft: 4,
  },
  sheetHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 12,
  },
  sheetHeaderLeft: {
    flex: 1,
    marginRight: 16,
  },
  sheetTitle: {
    fontSize: 18,
    fontWeight: '600',
    textTransform: 'capitalize',
  },
  sheetSubtitle: {
    fontSize: 13,
    marginTop: 2,
    textTransform: 'capitalize',
  },
  sheetAmount: {
    fontSize: 18,
    fontWeight: '700',
  },
  sheetDivider: {
    height: 1,
    marginBottom: 8,
  },
  menuOptions: {
    gap: 4,
  },
  menuOption: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 14,
    paddingHorizontal: 8,
    gap: 12,
  },
  menuOptionText: {
    fontSize: 17,
    fontWeight: '500',
  },
});

export default RecurringMovementsCard;
