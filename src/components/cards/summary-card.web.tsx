import React from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';

import Card from '@/src/components/core/card';
import Skeleton from '@/src/components/ui/skeleton';
import { useThemeColor } from '@/src/hooks/use-theme-color';
import { useDataContext } from '@/src/state/DataProvider';

interface SummaryCardProps {
  income: number;
  expense: number;
  isTransitioning?: boolean;
  flexible?: boolean;
  movementFilter?: 'income' | 'expense' | null;
  onMovementFilterChange?: (filter: 'income' | 'expense' | null) => void;
}

const formatAmount = (amount: number) =>
  Math.abs(amount).toLocaleString('it-IT', {
    style: 'currency',
    currency: 'EUR',
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });

const SummaryCard: React.FC<SummaryCardProps> = ({
  income,
  expense,
  isTransitioning = false,
  flexible = false,
  movementFilter = null,
  onMovementFilterChange,
}) => {
  const { isLoading } = useDataContext();
  const mutedColor = useThemeColor({ light: '#68756E', dark: '#AEB8B2' }, 'tabIconDefault');
  const metricBorder = useThemeColor(
    { light: 'rgba(47, 79, 63, 0.16)', dark: 'rgba(214, 232, 222, 0.20)' },
    'cardBorder',
  );
  const positiveColor = useThemeColor({ light: '#25633F', dark: '#7FCF9D' }, 'tint');
  const negativeColor = useThemeColor({ light: '#A33A3A', dark: '#F09292' }, 'tint');
  const incomeSelectedBackground = useThemeColor(
    { light: 'rgba(37, 99, 63, 0.055)', dark: 'rgba(127, 207, 157, 0.075)' },
    'menuBackground',
  );
  const expenseSelectedBackground = useThemeColor(
    { light: 'rgba(163, 58, 58, 0.055)', dark: 'rgba(240, 146, 146, 0.075)' },
    'menuBackground',
  );
  const balance = income - expense;
  const showSkeleton = (isLoading && income === 0 && expense === 0) || isTransitioning;

  if (showSkeleton) {
    return (
      <Card label="Cash flow" style={flexible ? { flex: 1 } : undefined} compact>
        <View style={styles.skeleton}>
          <Skeleton width="72%" height={38} borderRadius={6} />
          <View style={styles.metrics}>
            <Skeleton width="46%" height={48} borderRadius={10} />
            <Skeleton width="46%" height={48} borderRadius={10} />
          </View>
        </View>
      </Card>
    );
  }

  return (
    <Card label="Cash flow" style={flexible ? { flex: 1 } : undefined} compact>
      <View style={styles.content}>
        <Text
          style={[styles.balance, { color: balance >= 0 ? positiveColor : negativeColor }]}
          numberOfLines={1}
          adjustsFontSizeToFit
          accessibilityLabel={`Net cash flow: ${balance >= 0 ? '+' : '-'}${formatAmount(balance)}`}
        >
          {balance >= 0 ? '+' : '-'}
          {formatAmount(balance)}
        </Text>

        <View style={styles.metrics}>
          <Pressable
            accessibilityRole="button"
            accessibilityLabel={
              movementFilter === 'income'
                ? 'Show all recent movements'
                : 'Filter recent movements by income'
            }
            accessibilityState={{ selected: movementFilter === 'income' }}
            disabled={!onMovementFilterChange}
            onPress={() => onMovementFilterChange?.(movementFilter === 'income' ? null : 'income')}
            style={({ hovered, pressed }) => [
              styles.metric,
              { borderColor: metricBorder },
              hovered && onMovementFilterChange && { borderColor: positiveColor },
              movementFilter === 'income' && {
                backgroundColor: incomeSelectedBackground,
                borderColor: positiveColor,
              },
              pressed && styles.metricPressed,
            ]}
          >
            <Text
              style={[
                styles.metricLabel,
                { color: movementFilter === 'income' ? positiveColor : mutedColor },
              ]}
            >
              Income
            </Text>
            <Text style={[styles.metricValue, { color: positiveColor }]} numberOfLines={1}>
              {formatAmount(income)}
            </Text>
          </Pressable>
          <Pressable
            accessibilityRole="button"
            accessibilityLabel={
              movementFilter === 'expense'
                ? 'Show all recent movements'
                : 'Filter recent movements by expenses'
            }
            accessibilityState={{ selected: movementFilter === 'expense' }}
            disabled={!onMovementFilterChange}
            onPress={() =>
              onMovementFilterChange?.(movementFilter === 'expense' ? null : 'expense')
            }
            style={({ hovered, pressed }) => [
              styles.metric,
              { borderColor: metricBorder },
              hovered && onMovementFilterChange && { borderColor: negativeColor },
              movementFilter === 'expense' && {
                backgroundColor: expenseSelectedBackground,
                borderColor: negativeColor,
              },
              pressed && styles.metricPressed,
            ]}
          >
            <Text
              style={[
                styles.metricLabel,
                { color: movementFilter === 'expense' ? negativeColor : mutedColor },
              ]}
            >
              Expenses
            </Text>
            <Text style={[styles.metricValue, { color: negativeColor }]} numberOfLines={1}>
              {formatAmount(expense)}
            </Text>
          </Pressable>
        </View>
      </View>
    </Card>
  );
};

const styles = StyleSheet.create({
  content: {
    flex: 1,
    justifyContent: 'flex-end',
  },
  skeleton: {
    flex: 1,
    justifyContent: 'flex-end',
  },
  balance: {
    fontSize: 32,
    lineHeight: 38,
    fontWeight: '800',
    letterSpacing: -0.8,
  },
  metrics: {
    flexDirection: 'row',
    alignItems: 'stretch',
    gap: 8,
    marginTop: 12,
  },
  metric: {
    flex: 1,
    minWidth: 0,
    minHeight: 48,
    justifyContent: 'center',
    borderRadius: 10,
    borderWidth: 1,
    paddingHorizontal: 9,
    paddingVertical: 6,
  },
  metricPressed: {
    opacity: 0.72,
  },
  metricLabel: {
    fontSize: 10,
    lineHeight: 13,
    fontWeight: '500',
  },
  metricValue: {
    marginTop: 1,
    fontSize: 14,
    lineHeight: 18,
    fontWeight: '700',
  },
});

export default SummaryCard;
