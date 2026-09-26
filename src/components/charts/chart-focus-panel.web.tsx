import React from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import MaterialIcons from '@expo/vector-icons/MaterialIcons';
import { useThemeColor } from '@/src/hooks/use-theme-color';
import type { IncomeExpenseData, MonthlyData, PeriodBreakdownData } from '@/src/types/charts';
import { breakdownSeries, periodKey } from './chart-series';
import StackedBarChart from './stacked-bar-chart';
import IncomeExpenseChart from './income-expense-chart';
import BreakdownStackedChart from './breakdown-stacked-chart';

type ChartKind = 'balance' | 'cashflow' | 'breakdown';

interface ChartFocusPanelProps {
  kind: ChartKind;
  viewMode: 'months' | 'years';
  selectedKey: string;
  onHoverKeyChange: (key: string | null) => void;
  onSelectKey: (key: string) => void;
  onClose: () => void;
  balanceData: MonthlyData[];
  incomeExpenseData: IncomeExpenseData[];
  breakdownData: PeriodBreakdownData[];
  breakdownType: 'income' | 'expense';
  breakdownGroupBy: 'category' | 'account';
  accountName: string;
}

const amount = (value: number) =>
  `${value < 0 ? '−' : ''}€${Math.abs(value).toLocaleString('it-IT', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })}`;

export default function ChartFocusPanel({
  kind,
  viewMode,
  selectedKey,
  onHoverKeyChange,
  onSelectKey,
  onClose,
  balanceData,
  incomeExpenseData,
  breakdownData,
  breakdownType,
  breakdownGroupBy,
  accountName,
}: ChartFocusPanelProps) {
  const background = useThemeColor({}, 'cardBackground');
  const text = useThemeColor({}, 'text');
  const muted = useThemeColor({ light: '#667A6D', dark: '#ABB9AF' }, 'tabIconDefault');
  const border = useThemeColor({ light: '#E0E9E2', dark: '#34423A' }, 'cardBorder');
  const data =
    kind === 'balance' ? balanceData : kind === 'cashflow' ? incomeExpenseData : breakdownData;
  const selected = data.find((entry) => periodKey(entry, viewMode) === selectedKey) ?? data.at(-1);
  const title =
    kind === 'balance'
      ? 'Balance history'
      : kind === 'cashflow'
        ? 'Income and expenses'
        : `${breakdownType === 'expense' ? 'Expenses' : 'Income'} by ${breakdownGroupBy === 'category' ? 'category' : 'account'}`;
  const rows =
    kind === 'balance'
      ? ((selected as MonthlyData | undefined)?.accounts.map((account) => ({
          name: account.accountName,
          value: account.balance,
          color: account.color,
        })) ?? [])
      : kind === 'breakdown'
        ? ((selected as PeriodBreakdownData | undefined)?.items.map((item) => ({
            name: item.name,
            value: item.amount,
            color: item.color,
          })) ?? [])
        : [];
  const sortedRows = [...rows].sort((a, b) => b.value - a.value);
  const cashflow = kind === 'cashflow' ? (selected as IncomeExpenseData | undefined) : undefined;
  const breakdownColors = new Map(
    breakdownSeries(breakdownData, breakdownGroupBy).map((entry) => [entry.id, entry.color]),
  );
  if (kind === 'breakdown') {
    sortedRows.forEach((row) => {
      row.color = breakdownColors.get(row.name) ?? breakdownColors.get('__other__') ?? row.color;
    });
  }

  return (
    <View style={styles.overlay}>
      <Pressable
        style={styles.backdrop}
        onPress={onClose}
        accessibilityLabel="Close expanded chart"
        accessibilityRole="button"
      />
      <View style={[styles.panel, { backgroundColor: background, borderColor: border }]}>
        <View style={styles.header}>
          <View>
            <Text style={[styles.eyebrow, { color: muted }]}>
              {accountName === 'All' ? 'ALL ACCOUNTS' : accountName.toUpperCase()}
            </Text>
            <Text style={[styles.title, { color: text }]}>{title}</Text>
          </View>
          <Pressable
            onPress={onClose}
            accessibilityRole="button"
            accessibilityLabel="Close"
            style={[styles.close, { borderColor: border }]}
          >
            <MaterialIcons name="close" size={19} color={text} />
          </Pressable>
        </View>
        <View style={styles.content}>
          <View style={styles.chart}>
            {kind === 'balance' && (
              <StackedBarChart
                data={balanceData}
                height={345}
                viewMode={viewMode}
                selectedKey={selectedKey}
                onHoverKeyChange={onHoverKeyChange}
                onSelectKey={onSelectKey}
              />
            )}
            {kind === 'cashflow' && (
              <IncomeExpenseChart
                data={incomeExpenseData}
                height={345}
                viewMode={viewMode}
                selectedKey={selectedKey}
                onHoverKeyChange={onHoverKeyChange}
                onSelectKey={onSelectKey}
              />
            )}
            {kind === 'breakdown' && (
              <BreakdownStackedChart
                data={breakdownData}
                height={345}
                viewMode={viewMode}
                showLegend
                groupBy={breakdownGroupBy}
                selectedKey={selectedKey}
                onHoverKeyChange={onHoverKeyChange}
                onSelectKey={onSelectKey}
              />
            )}
          </View>
          <View style={[styles.details, { borderColor: border }]}>
            <Text style={[styles.detailTitle, { color: text }]}>
              {selected
                ? viewMode === 'years'
                  ? String(selected.year)
                  : `${String(selected.monthIndex + 1).padStart(2, '0')}/${selected.year}`
                : 'Details'}
            </Text>
            <Text style={[styles.hint, { color: muted }]}>
              Hover over the chart or select a period.
            </Text>
            {cashflow && (
              <View style={styles.rows}>
                <DetailRow label="Income" value={cashflow.income} color="#298965" text={text} />
                <DetailRow label="Expenses" value={cashflow.expenses} color="#D07862" text={text} />
                <View style={[styles.totalRow, { borderColor: border }]}>
                  <Text style={[styles.totalLabel, { color: text }]}>Net</Text>
                  <Text style={[styles.totalLabel, { color: text }]}>
                    {amount(cashflow.income - cashflow.expenses)}
                  </Text>
                </View>
              </View>
            )}
            {rows.length > 0 && (
              <ScrollView style={styles.list}>
                {sortedRows.map((row) => (
                  <DetailRow
                    key={row.name}
                    label={row.name}
                    value={row.value}
                    color={row.color}
                    text={text}
                  />
                ))}
              </ScrollView>
            )}
            {kind === 'balance' && selected && (
              <View style={[styles.totalRow, { borderColor: border }]}>
                <Text style={[styles.totalLabel, { color: text }]}>Total</Text>
                <Text style={[styles.totalLabel, { color: text }]}>
                  {amount((selected as MonthlyData).totalBalance)}
                </Text>
              </View>
            )}
            {kind === 'breakdown' && selected && (
              <View style={[styles.totalRow, { borderColor: border }]}>
                <Text style={[styles.totalLabel, { color: text }]}>Total</Text>
                <Text style={[styles.totalLabel, { color: text }]}>
                  {amount((selected as PeriodBreakdownData).total)}
                </Text>
              </View>
            )}
          </View>
        </View>
      </View>
    </View>
  );
}

function DetailRow({
  label,
  value,
  color,
  text,
}: {
  label: string;
  value: number;
  color: string;
  text: string;
}) {
  return (
    <View style={styles.row}>
      <View style={styles.name}>
        <View style={[styles.dot, { backgroundColor: color }]} />
        <Text numberOfLines={1} style={[styles.rowText, { color: text }]}>
          {label}
        </Text>
      </View>
      <Text style={[styles.rowValue, { color: text }]}>{amount(value)}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  overlay: {
    ...StyleSheet.absoluteFillObject,
    zIndex: 30,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 24,
  },
  backdrop: { ...StyleSheet.absoluteFillObject, backgroundColor: 'rgba(12, 22, 16, 0.58)' },
  panel: {
    width: '100%',
    maxWidth: 1100,
    maxHeight: '90%',
    minHeight: 460,
    borderWidth: 1,
    borderRadius: 26,
    padding: 26,
    boxShadow: '0 24px 70px rgba(6, 20, 11, 0.27)',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 24,
  },
  eyebrow: { fontSize: 10, fontWeight: '700', letterSpacing: 1.3, marginBottom: 6 },
  title: { fontSize: 25, fontWeight: '700', letterSpacing: -0.6 },
  close: {
    width: 34,
    height: 34,
    borderWidth: 1,
    borderRadius: 11,
    alignItems: 'center',
    justifyContent: 'center',
  },
  content: { flexDirection: 'row', flex: 1, gap: 22, minHeight: 340 },
  chart: { flex: 1, minWidth: 0 },
  details: { width: 240, borderLeftWidth: 1, paddingLeft: 20 },
  detailTitle: { fontSize: 18, fontWeight: '700', marginBottom: 4 },
  hint: { fontSize: 11, marginBottom: 17 },
  rows: { gap: 5 },
  list: { flex: 1 },
  row: {
    minHeight: 35,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 8,
  },
  name: { flex: 1, flexDirection: 'row', alignItems: 'center', gap: 7 },
  dot: { width: 8, height: 8, borderRadius: 4 },
  rowText: { fontSize: 12, flex: 1 },
  rowValue: { fontSize: 12, fontWeight: '600' },
  totalRow: {
    borderTopWidth: 1,
    marginTop: 12,
    paddingTop: 13,
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  totalLabel: { fontSize: 13, fontWeight: '700' },
});
