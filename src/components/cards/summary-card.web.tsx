import React from 'react';
import { StyleSheet, Text, View } from 'react-native';

import Card from '@/src/components/core/card';
import Skeleton from '@/src/components/ui/skeleton';
import { useThemeColor } from '@/src/hooks/use-theme-color';
import { useDataContext } from '@/src/state/DataProvider';

interface SummaryCardProps {
  income: number;
  expense: number;
  isTransitioning?: boolean;
  flexible?: boolean;
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
}) => {
  const { isLoading } = useDataContext();
  const mutedColor = useThemeColor({ light: '#68756E', dark: '#AEB8B2' }, 'tabIconDefault');
  const borderColor = useThemeColor(
    { light: 'rgba(23, 38, 31, 0.10)', dark: 'rgba(255, 255, 255, 0.10)' },
    'cardBorder',
  );
  const positiveColor = useThemeColor({ light: '#25633F', dark: '#7FCF9D' }, 'tint');
  const negativeColor = useThemeColor({ light: '#A33A3A', dark: '#F09292' }, 'tint');
  const balance = income - expense;
  const showSkeleton = (isLoading && income === 0 && expense === 0) || isTransitioning;

  if (showSkeleton) {
    return (
      <Card label="Cash flow" style={flexible ? { flex: 1 } : undefined} compact>
        <View style={styles.skeleton}>
          <Skeleton width={92} height={12} borderRadius={4} />
          <Skeleton width={132} height={26} borderRadius={5} />
          <View style={[styles.divider, { backgroundColor: borderColor }]} />
          <View style={styles.metrics}>
            <Skeleton width="38%" height={30} borderRadius={5} />
            <Skeleton width="38%" height={30} borderRadius={5} />
          </View>
        </View>
      </Card>
    );
  }

  return (
    <Card label="Cash flow" style={flexible ? { flex: 1 } : undefined} compact>
      <View style={styles.content}>
        <Text style={[styles.label, { color: mutedColor }]}>Net cash flow</Text>
        <Text
          style={[styles.balance, { color: balance >= 0 ? positiveColor : negativeColor }]}
          numberOfLines={1}
          adjustsFontSizeToFit
        >
          {balance >= 0 ? '+' : '-'}
          {formatAmount(balance)}
        </Text>

        <View style={[styles.divider, { backgroundColor: borderColor }]} />

        <View style={styles.metrics}>
          <View style={styles.metric}>
            <Text style={[styles.metricLabel, { color: mutedColor }]}>Income</Text>
            <Text style={[styles.metricValue, { color: positiveColor }]} numberOfLines={1}>
              {formatAmount(income)}
            </Text>
          </View>
          <View style={[styles.metricDivider, { backgroundColor: borderColor }]} />
          <View style={styles.metric}>
            <Text style={[styles.metricLabel, { color: mutedColor }]}>Expenses</Text>
            <Text style={[styles.metricValue, { color: negativeColor }]} numberOfLines={1}>
              {formatAmount(expense)}
            </Text>
          </View>
        </View>
      </View>
    </Card>
  );
};

const styles = StyleSheet.create({
  content: {
    flex: 1,
    justifyContent: 'center',
  },
  skeleton: {
    flex: 1,
    justifyContent: 'center',
    gap: 10,
  },
  label: {
    fontSize: 11,
    lineHeight: 15,
    fontWeight: '600',
  },
  balance: {
    marginTop: 2,
    fontSize: 25,
    lineHeight: 31,
    fontWeight: '700',
    letterSpacing: -0.5,
  },
  divider: {
    height: 1,
    marginVertical: 12,
  },
  metrics: {
    flexDirection: 'row',
    alignItems: 'stretch',
  },
  metric: {
    flex: 1,
    minWidth: 0,
    minHeight: 34,
    justifyContent: 'center',
  },
  metricDivider: {
    width: 1,
    marginHorizontal: 12,
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
