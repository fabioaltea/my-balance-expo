import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import Card from '@/src/components/core/card';
import ChartSkeleton from '@/src/components/charts/chart-skeleton';
import { useThemeColor } from '@/src/hooks/use-theme-color';
import { useDataContext } from '@/src/state/DataProvider';

type Props = {
  income: number;
  expense: number;
  isTransitioning?: boolean;
  flexible?: boolean;
  /** Used by the web card to filter recent movements. */
  movementFilter?: 'income' | 'expense' | null;
  onMovementFilterChange?: (filter: 'income' | 'expense' | null) => void;
};

const formatAmount = (amount: number) =>
  Math.abs(amount).toLocaleString('it-IT', {
    style: 'currency',
    currency: 'EUR',
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });

const SummaryCard: React.FC<Props> = ({
  income,
  expense,
  isTransitioning = false,
  flexible = false,
}) => {
  const { isLoading } = useDataContext();
  const balance = income - expense;
  const isProfit = balance >= 0;
  const total = income + expense;
  const incomePercentage = total > 0 ? (income / total) * 100 : 0;
  const expensePercentage = total > 0 ? (expense / total) * 100 : 0;
  const mutedColor = useThemeColor({ light: '#68756E', dark: '#AEB8B2' }, 'tabIconDefault');
  const metricBorder = useThemeColor(
    { light: 'rgba(47, 79, 63, 0.16)', dark: 'rgba(214, 232, 222, 0.20)' },
    'cardBorder',
  );
  const positiveColor = useThemeColor({ light: '#25633F', dark: '#7FCF9D' }, 'tint');
  const negativeColor = useThemeColor({ light: '#A33A3A', dark: '#F09292' }, 'tint');
  const balanceColor = useThemeColor({ light: '#688DB2', dark: '#8BB2D5' }, 'tint');
  const lossColor = useThemeColor({ light: '#C7A353', dark: '#D9BC75' }, 'tint');

  // Keep the existing three-segment visualization and its proportions.
  let incomeFlex: number;
  let expenseFlex: number;
  let balanceFlex: number;
  if (isProfit) {
    incomeFlex = 0.5;
    expenseFlex = income > 0 ? (expense / income) * 0.5 : 0;
    balanceFlex = income > 0 ? (balance / income) * 0.5 : 0;
  } else {
    expenseFlex = 0.5;
    incomeFlex = expense > 0 ? (income / expense) * 0.5 : 0;
    balanceFlex = expense > 0 ? (Math.abs(balance) / expense) * 0.5 : 0;
  }

  const showSkeleton = (isLoading && income === 0 && expense === 0) || isTransitioning;
  return (
    <Card label="Cash flow" style={flexible ? { flex: 1 } : undefined} compact>
      <View style={flexible ? styles.flexibleContent : styles.content}>
        {showSkeleton ? (
          <ChartSkeleton variant="summary" height={164} />
        ) : (
          <>
            <Text
              style={[styles.balanceAmount, { color: isProfit ? positiveColor : negativeColor }]}
              numberOfLines={1}
              adjustsFontSizeToFit
            >
              {isProfit ? '+' : '-'}
              {formatAmount(balance)}
            </Text>
            <View style={styles.progressBar}>
              <View
                style={[styles.segment, { flex: incomeFlex, backgroundColor: positiveColor }]}
              />
              <View
                style={[
                  styles.segment,
                  { flex: balanceFlex, backgroundColor: isProfit ? balanceColor : lossColor },
                ]}
              />
              <View
                style={[styles.segment, { flex: expenseFlex, backgroundColor: negativeColor }]}
              />
            </View>
            <View style={styles.metrics}>
              <View style={[styles.metric, { borderColor: metricBorder }]}>
                <Text style={[styles.metricLabel, { color: mutedColor }]}>Income</Text>
                <Text
                  style={[styles.metricValue, { color: positiveColor }]}
                  numberOfLines={1}
                  adjustsFontSizeToFit
                >
                  {formatAmount(income)}
                </Text>
                <Text style={[styles.metricPercentage, { color: mutedColor }]}>
                  {incomePercentage.toFixed(1)}%
                </Text>
              </View>
              <View style={[styles.metric, { borderColor: metricBorder }]}>
                <Text style={[styles.metricLabel, { color: mutedColor }]}>Expenses</Text>
                <Text
                  style={[styles.metricValue, { color: negativeColor }]}
                  numberOfLines={1}
                  adjustsFontSizeToFit
                >
                  {formatAmount(expense)}
                </Text>
                <Text style={[styles.metricPercentage, { color: mutedColor }]}>
                  {expensePercentage.toFixed(1)}%
                </Text>
              </View>
            </View>
          </>
        )}
      </View>
    </Card>
  );
};

const styles = StyleSheet.create({
  content: { height: 164, justifyContent: 'flex-end' },
  flexibleContent: { flex: 1, justifyContent: 'flex-end' },
  balanceAmount: {
    fontSize: 32,
    lineHeight: 38,
    fontWeight: '800',
    letterSpacing: -0.8,
  },
  progressBar: {
    height: 9,
    borderRadius: 5,
    flexDirection: 'row',
    overflow: 'hidden',
    marginTop: 14,
    backgroundColor: '#E4EAE5',
  },
  segment: { height: '100%' },
  metrics: { flexDirection: 'row', gap: 8, marginTop: 14 },
  metric: {
    flex: 1,
    minWidth: 0,
    minHeight: 70,
    paddingHorizontal: 10,
    paddingVertical: 8,
    borderWidth: 1,
    borderRadius: 16,
    justifyContent: 'center',
  },
  metricLabel: { fontSize: 12, fontWeight: '700' },
  metricValue: { fontSize: 16, lineHeight: 20, fontWeight: '700', marginTop: 2 },
  metricPercentage: { fontSize: 11, lineHeight: 14 },
});

export default SummaryCard;
