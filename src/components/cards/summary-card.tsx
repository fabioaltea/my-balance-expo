import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import Card from '@/src/components/core/card';
import Skeleton from '@/src/components/ui/skeleton';
import { useThemeColor } from '@/src/hooks/use-theme-color';
import { useDataContext } from '@/src/state/DataProvider';
import CashFlowMiniChart from './cash-flow-mini-chart';
import type { CashFlowPoint } from './cash-flow-series';

type Props = {
  income: number;
  expense: number;
  points: CashFlowPoint[];
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

const SummaryCard: React.FC<Props> = ({ income, expense, points, isTransitioning = false }) => {
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

  const showSkeleton = (isLoading && income === 0 && expense === 0) || isTransitioning;
  return (
    <Card label="Cash flow" style={styles.card} compact>
      <View style={styles.content}>
        {showSkeleton ? (
          <View style={styles.loading}>
            <Skeleton width="70%" height={38} borderRadius={6} />
            <Skeleton width="100%" height={46} borderRadius={8} style={styles.loadingChart} />
            <View style={styles.metrics}>
              <Skeleton width="48%" height={70} borderRadius={16} />
              <Skeleton width="48%" height={70} borderRadius={16} />
            </View>
          </View>
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
            <CashFlowMiniChart
              points={points}
              incomeColor={positiveColor}
              expenseColor={negativeColor}
              height={66}
              style={styles.chart}
            />
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
  card: { flex: 1 },
  content: { flex: 1, justifyContent: 'flex-end' },
  loading: { flex: 1, justifyContent: 'flex-end' },
  balanceAmount: {
    fontSize: 32,
    lineHeight: 38,
    fontWeight: '800',
    letterSpacing: -0.8,
    zIndex: 1,
  },
  chart: { marginTop: -18 },
  loadingChart: { marginTop: 2 },
  metrics: { flexDirection: 'row', gap: 8, marginTop: 10 },
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
