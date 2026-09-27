import React, { useMemo, useState, useCallback, useEffect } from 'react';
import { Alert, View, StyleSheet, Pressable, Text as RNText } from 'react-native';
import MaterialIcons from '@expo/vector-icons/MaterialIcons';
import { useThemeColor } from '@/src/hooks/use-theme-color';
import { useDataContext, useAuthContext } from '@/src/state';
import type { Account } from '@/src/state';
import * as DocumentPicker from 'expo-document-picker';
import * as Crypto from 'expo-crypto';
import { OCRHelper } from '@/src/helpers/OCRHelper.web';
import { useSpreadsheetMutation } from '@/src/hooks/useSpreadsheetMutation';
import { TransactionsApiHelper } from '@/src/helpers/TransactionsApiHelper';
import {
  TransactionsMutationHelpers,
  type CreateMovementData,
  type OptimisticSnapshot,
} from '@/src/helpers/TransactionsMutationHelpers';

// Layout components
import { LayoutContainer } from '@/src/components/layout/layout-container';
import { LayoutRow } from '@/src/components/layout/layout-row';
import { LayoutColumn } from '@/src/components/layout/layout-column';

// UI components
import CompactAccountPicker from '@/src/components/ui/compact-account-picker';
import SideDrawer from '@/src/components/ui/side-drawer';

// Card components
import BalanceCard from '@/src/components/cards/balance-card';
import MovementsCard from '@/src/components/cards/movements/recent-movements-card';
import RecurringMovementsCard from '@/src/components/cards/movements/recurring-movements-card';
import UnconfirmedMovementsCard from '@/src/components/cards/movements/unconfirmed-movements-card';

// Chart components
import {
  BreakdownStackedChart,
  IncomeExpenseChart,
  StackedBarChart,
} from '@/src/components/charts';
import ChartFocusPanel from '@/src/components/charts/chart-focus-panel.web';
import Card from '@/src/components/core/card';
import { ChartDataHelper } from '@/src/helpers/ChartDataHelper';
import { EXCLUDED_CATEGORIES } from '@/src/constants/categories';
import type { MonthlyData, IncomeExpenseData, PeriodBreakdownData } from '@/src/types/charts';

// View components for drawer content
import AddView from '@/src/views/add-view';
import Toast from '@/src/components/ui/toast';
import SettingsView from '@/src/views/settings-view';
import CommandBar from './command-bar';
import PeriodPicker from '@/src/components/ui/period-chips-picker';
import SummaryCard from '@/src/components/cards/summary-card.web';
import { buildCashFlowSeries } from '@/src/components/cards/cash-flow-series';
import ManageView from '@/src/views/manage-view.web';
import MapView from '@/src/views/map-view.web';

type ToastStatus = 'loading' | 'success' | 'error';

// Drawer content types
type DrawerContentType = 'add' | 'edit' | 'settings' | null;

interface DrawerState {
  type: DrawerContentType;
  props?: {
    movementId?: string;
    recurrenceId?: string;
  };
}

/**
 * Dashboard Landscape Layout
 * Layout completo per la modalità landscape con tutte le card disposte in griglia flessibile
 */
export function LandscapeLayout() {
  const backgroundColor = useThemeColor({ light: '#F2F5F3', dark: '#171A18' }, 'background');

  // Get data from centralized context
  const { accounts, movements, transactions, calculateForecast, isLoading, reloadData } =
    useDataContext();

  const { user, logout } = useAuthContext();
  const [showManage, setShowManage] = useState(false);
  const [showMap, setShowMap] = useState(false);
  const addMovement = useSpreadsheetMutation<CreateMovementData, OptimisticSnapshot>({
    mutationFn: (spreadsheetId, data) =>
      TransactionsApiHelper.createTransaction(spreadsheetId, data),
    onMutate: (qc, data) => TransactionsMutationHelpers.optimisticAddMovement(qc, data),
    onError: (qc, ctx) => TransactionsMutationHelpers.rollback(qc, ctx),
    onSuccess: (qc) => TransactionsMutationHelpers.invalidateMovementCaches(qc),
  });

  const availableAccounts = useMemo(() => {
    const totalBalance = accounts.reduce((sum, acc) => sum + acc.balance, 0);
    const sortedAccounts = [...accounts].sort((a, b) => b.balance - a.balance);
    return [
      {
        accountId: 'all',
        name: 'All',
        balance: totalBalance,
        color: '#2F4F3F',
        textColor: '#FFFFFF',
      },
      ...sortedAccounts,
    ];
  }, [accounts]);

  const [selectedAccount, setSelectedAccount] = useState<string>('All');
  const [movementFilter, setMovementFilter] = useState<'income' | 'expense' | null>(null);

  // Chart view mode state (months or years)
  const [chartViewMode, setChartViewMode] = useState<'months' | 'years'>('months');
  const [hoveredChartPeriod, setHoveredChartPeriod] = useState<string | null>(null);
  const [pinnedChartPeriod, setPinnedChartPeriod] = useState<string | null>(null);
  const [expandedChart, setExpandedChart] = useState<'balance' | 'cashflow' | 'breakdown' | null>(
    null,
  );

  // Keep the content mounted while the drawer close animation finishes.
  const [drawerContent, setDrawerContent] = useState<DrawerState | null>(null);
  const [isDrawerOpen, setIsDrawerOpen] = useState(false);

  // Drawer actions
  const openDrawer = useCallback((type: DrawerContentType, props?: DrawerState['props']) => {
    setDrawerContent({ type, props });
    setIsDrawerOpen(true);
  }, []);

  const closeDrawer = useCallback(() => {
    setIsDrawerOpen(false);
    // Clear content after the SideDrawer close animation (250ms)
    setTimeout(() => setDrawerContent(null), 300);
  }, []);

  // Toast state
  const [toastVisible, setToastVisible] = useState(false);
  const [toastStatus, setToastStatus] = useState<ToastStatus>('loading');
  const [toastMessage, setToastMessage] = useState<string | undefined>(undefined);

  const handleToast = useCallback((status: ToastStatus, message?: string) => {
    setToastStatus(status);
    setToastMessage(message);
    setToastVisible(true);
  }, []);

  // Date range state for period filtering
  const [dateRange, setDateRange] = useState(() => {
    const now = new Date();
    const startDate = `01-${String(now.getMonth() + 1).padStart(2, '0')}-${now.getFullYear()}`;
    const lastDay = new Date(now.getFullYear(), now.getMonth() + 1, 0).getDate();
    const endDate = `${lastDay}-${String(now.getMonth() + 1).padStart(2, '0')}-${now.getFullYear()}`;
    return { startDate, endDate, label: '' };
  });

  const selectedChartDate = useMemo(() => {
    const [day, month, year] = dateRange.endDate.split('-').map(Number);
    return new Date(year, month - 1, day);
  }, [dateRange.endDate]);

  useEffect(() => {
    setHoveredChartPeriod(null);
    setPinnedChartPeriod(null);
  }, [chartViewMode, dateRange.endDate, selectedAccount]);

  const selectedChartPeriod =
    hoveredChartPeriod ??
    pinnedChartPeriod ??
    (chartViewMode === 'years'
      ? String(selectedChartDate.getFullYear())
      : `${selectedChartDate.getFullYear()}-${String(selectedChartDate.getMonth() + 1).padStart(2, '0')}`);

  // Calculate total months span from oldest movement to now
  const chartMonthsToShow = useMemo(() => {
    if (movements.length === 0) return 12;
    const now = new Date();
    let oldestMonth = now.getFullYear() * 12 + now.getMonth();
    for (const m of movements) {
      const [d, mo, y] = m.date.split('-').map(Number);
      if (!d || !mo || !y) continue;
      oldestMonth = Math.min(oldestMonth, y * 12 + mo - 1);
    }
    const months = now.getFullYear() * 12 + now.getMonth() - oldestMonth + 1;
    return Math.max(months, 12);
  }, [movements]);

  const chartAccounts = useMemo(
    () =>
      selectedAccount === 'All'
        ? accounts
        : accounts.filter((account) => account.name === selectedAccount),
    [accounts, selectedAccount],
  );
  const chartTransactions = useMemo(
    () =>
      selectedAccount === 'All'
        ? transactions
        : transactions.filter((transaction) => transaction.account === selectedAccount),
    [transactions, selectedAccount],
  );
  const chartMovements = useMemo(() => {
    if (selectedAccount === 'All') return movements;
    return chartTransactions.map((transaction) => ({
      id: transaction.transactionId,
      date: transaction.date,
      description: transaction.description,
      category: transaction.category,
      transactions: [transaction],
      totalAmount: transaction.type === 'income' ? transaction.amount : -transaction.amount,
      type: transaction.type,
    }));
  }, [movements, chartTransactions, selectedAccount]);

  // Chart data hooks - load all available periods for scrollable charts
  // Monthly data
  const balanceHistoryMonthly = useMemo(
    () =>
      ChartDataHelper.computeMonthlyBalances(
        chartTransactions,
        chartAccounts,
        chartMonthsToShow,
        0,
      ),
    [chartTransactions, chartAccounts, chartMonthsToShow],
  );

  const incomeExpenseMonthly = useMemo(
    () => ChartDataHelper.computeIncomeExpenses(chartMovements, chartMonthsToShow, 0),
    [chartMovements, chartMonthsToShow],
  );

  const [breakdownType, setBreakdownType] = useState<'expense' | 'income'>('expense');
  const [breakdownGroupBy, setBreakdownGroupBy] = useState<'category' | 'account'>('category');

  useEffect(() => {
    if (selectedAccount !== 'All') setBreakdownGroupBy('category');
  }, [selectedAccount]);

  const breakdownMonthly = useMemo(
    () =>
      ChartDataHelper.computeCategoryAccountBreakdown(
        chartMovements,
        chartTransactions,
        chartAccounts,
        breakdownType,
        breakdownGroupBy,
        chartMonthsToShow,
        0,
      ),
    [
      chartMovements,
      chartTransactions,
      chartAccounts,
      breakdownType,
      breakdownGroupBy,
      chartMonthsToShow,
    ],
  );

  // Aggregate monthly data into yearly for "years" view mode
  const balanceHistoryYearly = useMemo((): MonthlyData[] => {
    if (balanceHistoryMonthly.length === 0) return [];

    const yearMap = new Map<number, MonthlyData>();

    balanceHistoryMonthly.forEach((monthData) => {
      // Take the latest month for each year (end-of-year balance)
      yearMap.set(monthData.year, {
        ...monthData,
        month: String(monthData.year),
        monthIndex: monthData.year,
      });
    });

    return Array.from(yearMap.values())
      .sort((a, b) => a.year - b.year)
      .map((year) => ({
        ...year,
        partial:
          year.year === balanceHistoryMonthly[0].year && balanceHistoryMonthly[0].monthIndex !== 0,
      }));
  }, [balanceHistoryMonthly]);

  const incomeExpenseYearly = useMemo((): IncomeExpenseData[] => {
    if (incomeExpenseMonthly.length === 0) return [];

    const yearMap = new Map<number, IncomeExpenseData>();

    incomeExpenseMonthly.forEach((monthData) => {
      const existing = yearMap.get(monthData.year);
      if (existing) {
        existing.income += monthData.income;
        existing.expenses += monthData.expenses;
        existing.date = monthData.date;
      } else {
        yearMap.set(monthData.year, {
          ...monthData,
          month: String(monthData.year),
          monthIndex: monthData.year,
        });
      }
    });

    return Array.from(yearMap.values())
      .sort((a, b) => a.year - b.year)
      .map((year) => ({
        ...year,
        partial:
          year.year === incomeExpenseMonthly[0].year && incomeExpenseMonthly[0].monthIndex !== 0,
      }));
  }, [incomeExpenseMonthly]);

  const breakdownYearly = useMemo((): PeriodBreakdownData[] => {
    if (breakdownMonthly.length === 0) return [];

    const yearMap = new Map<number, PeriodBreakdownData>();

    breakdownMonthly.forEach((monthData) => {
      const existing = yearMap.get(monthData.year);
      if (existing) {
        monthData.items.forEach((item) => {
          const existingItem = existing.items.find((i) => i.id === item.id);
          if (existingItem) {
            existingItem.amount += item.amount;
          } else {
            existing.items.push({ ...item });
          }
        });
        existing.total += monthData.total;
        existing.date = monthData.date;
      } else {
        yearMap.set(monthData.year, {
          ...monthData,
          month: String(monthData.year),
          monthIndex: monthData.year,
          items: monthData.items.map((i) => ({ ...i })),
        });
      }
    });

    // Sort items in each year by amount
    yearMap.forEach((data) => {
      data.items.sort((a, b) => b.amount - a.amount);
    });

    return Array.from(yearMap.values())
      .sort((a, b) => a.year - b.year)
      .map((year) => ({
        ...year,
        partial: year.year === breakdownMonthly[0].year && breakdownMonthly[0].monthIndex !== 0,
      }));
  }, [breakdownMonthly]);

  // Select data based on chart view mode
  const inSelectedWindow = useCallback(
    (period: { year: number; monthIndex: number }) => {
      if (chartViewMode === 'years') {
        return (
          period.year <= selectedChartDate.getFullYear() &&
          period.year > selectedChartDate.getFullYear() - 6
        );
      }
      const selectedMonthNumber =
        selectedChartDate.getFullYear() * 12 + selectedChartDate.getMonth();
      const periodMonthNumber = period.year * 12 + period.monthIndex;
      return (
        periodMonthNumber <= selectedMonthNumber && periodMonthNumber > selectedMonthNumber - 12
      );
    },
    [chartViewMode, selectedChartDate],
  );

  const balanceHistoryData = useMemo(
    () =>
      (chartViewMode === 'months' ? balanceHistoryMonthly : balanceHistoryYearly).filter(
        inSelectedWindow,
      ),
    [chartViewMode, balanceHistoryMonthly, balanceHistoryYearly, inSelectedWindow],
  );
  const incomeExpenseData = useMemo(
    () =>
      (chartViewMode === 'months' ? incomeExpenseMonthly : incomeExpenseYearly).filter(
        inSelectedWindow,
      ),
    [chartViewMode, incomeExpenseMonthly, incomeExpenseYearly, inSelectedWindow],
  );
  const breakdownData = useMemo(
    () =>
      (chartViewMode === 'months' ? breakdownMonthly : breakdownYearly).filter(inSelectedWindow),
    [chartViewMode, breakdownMonthly, breakdownYearly, inSelectedWindow],
  );

  const textColor = useThemeColor({}, 'text');
  const mutedTextColor = useThemeColor({ light: '#58665F', dark: '#B3BCB7' }, 'tabIconDefault');
  const controlBackground = useThemeColor({ light: '#EEF2EF', dark: '#2A302D' }, 'menuBackground');
  const controlBorder = useThemeColor(
    { light: 'rgba(36, 68, 55, 0.10)', dark: 'rgba(255, 255, 255, 0.10)' },
    'cardBorder',
  );
  const accentColor = useThemeColor({ light: '#244437', dark: '#D6E8DE' }, 'tint');

  const handleAddPress = () => {
    openDrawer('add');
  };

  const handleReloadPress = async () => {
    handleToast('loading', 'Loading');
    try {
      await reloadData();
      setToastVisible(false);
    } catch (error) {
      handleToast('error');
    }
  };

  const handleImportPress = useCallback(async () => {
    console.log('Import statement pressed');
    const result = await DocumentPicker.getDocumentAsync({
      type: ['image/*', 'application/pdf'],
      copyToCacheDirectory: true,
    });
    if (result.canceled || result.assets.length === 0) return;
    console.log('Selected document:', result.assets[0]);
    const asset = result.assets[0];
    const isPdf = asset.mimeType === 'application/pdf' || asset.uri.toLowerCase().endsWith('.pdf');

    handleToast('loading', 'Analisi documento...');

    try {
      const statementData = isPdf
        ? await OCRHelper.extractStatementDataFromPDF(asset.uri)
        : await OCRHelper.extractStatementData(asset.uri);

      if (statementData.transactions.length === 0) {
        setToastVisible(false);
        Alert.alert('Nessuna transazione', 'Non sono state trovate transazioni nel documento.');
        return;
      }

      // Resolve account name
      let accountName = '';
      if (statementData.accountName) {
        const match = accounts.find((a) =>
          statementData.accountName!.toLowerCase().includes(a.name.toLowerCase()),
        );
        if (match) accountName = match.name;
      }

      // Save each transaction as unconfirmed
      let saved = 0;
      for (const tx of statementData.transactions) {
        try {
          const movementId = Crypto.randomUUID();
          await addMovement.mutateAsync({
            movementId,
            description: tx.description,
            category: '',
            date: tx.date,
            status: 'unconfirmed',
            transactions: [
              {
                amount: (tx.type === 'income' ? '' : '-') + String(tx.amount).replace('.', ','),
                account: accountName,
                type: tx.type === 'income' ? 'in' : 'out',
              },
            ],
          });
          saved++;
        } catch (error) {
          console.error('Error saving statement transaction:', error);
        }
      }

      handleToast('success', `${saved} transazioni importate`);
    } catch (error) {
      console.error('Statement import error:', error);
      handleToast('error', 'Impossibile analizzare il documento');
    }
  }, [accounts, addMovement, handleToast]);

  // Helper to check if a date is within the range
  const isDateInRange = (dateStr: string, start: string, end: string): boolean => {
    const parseDate = (str: string) => {
      const [day, month, year] = str.split('-').map(Number);
      return new Date(year, month - 1, day);
    };
    const date = parseDate(dateStr);
    const startDate = parseDate(start);
    const endDate = parseDate(end);
    return date >= startDate && date <= endDate;
  };

  // Filter movements by selected account AND date range
  const filteredMovements = useMemo(() => {
    let filtered = movements;

    // Filter by date range
    if (dateRange.startDate && dateRange.endDate) {
      filtered = filtered.filter((m) =>
        isDateInRange(m.date, dateRange.startDate, dateRange.endDate),
      );
    }

    // Filter by account (no filtering for 'All')
    if (selectedAccount !== 'All') {
      filtered = filtered.filter((m) => m.transactions.some((t) => t.account === selectedAccount));
    }

    // Sort by date descending (most recent first)
    filtered = [...filtered].sort((a, b) => {
      const parseDate = (str: string) => {
        const [day, month, year] = str.split('-').map(Number);
        return new Date(year, month - 1, day).getTime();
      };
      return parseDate(b.date) - parseDate(a.date);
    });

    return filtered;
  }, [movements, selectedAccount, dateRange]);

  const cashFlow = useMemo(
    () => buildCashFlowSeries(filteredMovements, dateRange, selectedAccount),
    [filteredMovements, dateRange, selectedAccount],
  );

  const visibleRecentMovements = useMemo(() => {
    if (!movementFilter) return filteredMovements;

    return filteredMovements.filter((movement) => {
      if (EXCLUDED_CATEGORIES.includes(movement.category)) return false;

      if (selectedAccount === 'All') {
        return movementFilter === 'income' ? movement.totalAmount > 0 : movement.totalAmount < 0;
      }

      return movement.transactions.some(
        (transaction) =>
          transaction.account === selectedAccount &&
          transaction.type === movementFilter &&
          transaction.amount > 0,
      );
    });
  }, [filteredMovements, movementFilter, selectedAccount]);

  // Get the selected account object
  const currentAccount: Account | undefined = useMemo(() => {
    if (selectedAccount === 'All') {
      return availableAccounts[0];
    }
    return availableAccounts.find((a) => a.name === selectedAccount);
  }, [availableAccounts, selectedAccount]);

  // Calculate forecast for selected date range
  const forecast = useMemo(() => {
    return calculateForecast(dateRange.startDate, dateRange.endDate);
  }, [calculateForecast, dateRange]);

  if (showMap) {
    return (
      <View style={[styles.container, { backgroundColor }]}>
        <MapView onBack={() => setShowMap(false)} />
      </View>
    );
  }

  if (showManage) {
    return (
      <View style={[styles.container, { backgroundColor }]}>
        <ManageView onBack={() => setShowManage(false)} />
      </View>
    );
  }

  return (
    <View
      style={[styles.container, { backgroundColor }]}
      // @ts-ignore: web-only prop
      dataSet={{ landscapeDashboard: '' }}
    >
      {/* Transparent scrollbar with left margin for all cards */}
      <style
        dangerouslySetInnerHTML={{
          __html: `
            [data-landscape-dashboard] ::-webkit-scrollbar {
              width: 12px;
            }
            [data-landscape-dashboard] ::-webkit-scrollbar-track {
              background: transparent;
            }
            [data-landscape-dashboard] ::-webkit-scrollbar-thumb {
              background: rgba(128, 128, 128, 0.25);
              border-radius: 3px;
              border-left: 6px solid transparent;
              background-clip: padding-box;
            }
            [data-landscape-dashboard] ::-webkit-scrollbar-thumb:hover {
              background: rgba(128, 128, 128, 0.4);
              border-left: 6px solid transparent;
              margin-left: 20px;
              background-clip: padding-box;
            }
            [data-landscape-dashboard] {
              scrollbar-width: thin;
              scrollbar-color: rgba(128,128,128,0.25) transparent;
            }
            [data-landscape-dashboard] * {
              box-sizing: border-box;
            }
            [data-landscape-dashboard] [data-dashboard-card] {
              transition: border-color 180ms ease, box-shadow 180ms ease, transform 180ms ease;
            }
            [data-landscape-dashboard] [data-dashboard-card]:focus-within {
              border-color: rgba(47, 79, 63, 0.38) !important;
              box-shadow: 0 0 0 3px rgba(47, 79, 63, 0.10), 0 12px 30px rgba(17, 31, 24, 0.07) !important;
            }
            [data-movement-row] {
              transition: background-color 180ms ease, box-shadow 180ms ease, transform 150ms ease;
              border-radius: 12px;
              padding-left: 10px !important;
              padding-right: 10px !important;
            }
            [data-movement-row][data-movement-selected="true"] {
              border-radius: 0;
            }
            [data-movement-row][data-movement-selected-start="true"] {
              border-top-left-radius: 12px;
              border-top-right-radius: 12px;
            }
            [data-movement-row][data-movement-selected-end="true"] {
              border-bottom-left-radius: 12px;
              border-bottom-right-radius: 12px;
            }
            [data-movement-row]:not([data-movement-selected="true"]):hover {
              background-color: rgba(47, 79, 63, 0.07);
            }
            [data-movement-row][data-movement-selected="true"]:hover {
              background-color: rgba(47, 79, 63, 0.055);
            }
            [data-movement-row]:active {
              transform: translateY(1px);
            }
            @media (prefers-reduced-motion: reduce) {
              [data-landscape-dashboard] *,
              [data-landscape-dashboard] *::before,
              [data-landscape-dashboard] *::after {
                scroll-behavior: auto !important;
                transition-duration: 0.01ms !important;
                animation-duration: 0.01ms !important;
                animation-iteration-count: 1 !important;
              }
            }
          `,
        }}
      />

      {/* Command bar */}
      <CommandBar
        onManage={() => setShowManage(true)}
        onMap={() => setShowMap(true)}
        accountSelector={
          <CompactAccountPicker
            accounts={availableAccounts}
            selectedAccount={selectedAccount}
            setSelectedAccount={setSelectedAccount}
          />
        }
        periodSelector={
          <PeriodPicker
            setDateRange={setDateRange}
            isLoading={isLoading}
            onModeChange={(mode) => setChartViewMode(mode === 'month' ? 'months' : 'years')}
          />
        }
        rightContent={
          <>
            <Pressable
              accessibilityRole="button"
              accessibilityLabel="Refresh dashboard"
              onPress={handleReloadPress}
              style={({ pressed, hovered }) => [
                styles.iconButton,
                { backgroundColor: controlBackground, borderColor: controlBorder },
                hovered && styles.iconButtonHovered,
                pressed && styles.iconButtonPressed,
              ]}
            >
              <MaterialIcons name="refresh" size={19} color={mutedTextColor} />
            </Pressable>
            <Pressable
              accessibilityRole="button"
              accessibilityLabel="Add movement"
              onPress={handleAddPress}
              style={({ pressed, hovered }) => [
                styles.iconButton,
                styles.primaryIconButton,
                { backgroundColor: accentColor, borderColor: accentColor },
                hovered && styles.iconButtonHovered,
                pressed && styles.iconButtonPressed,
              ]}
            >
              <MaterialIcons name="add" size={20} color={backgroundColor} />
            </Pressable>
          </>
        }
      />

      {/* Main dashboard grid */}
      <LayoutContainer padding={16} gap={16}>
        {/* Compact charts share the selected period; each can be opened for inspection. */}
        <LayoutRow gap={16} height="42%" minHeight={274}>
          {/* Balance and Financial Summary */}
          <LayoutColumn flex={0.86} gap={16}>
            <BalanceCard account={currentAccount} />
            <SummaryCard
              income={cashFlow.income}
              expense={cashFlow.expense}
              points={cashFlow.points}
              movementFilter={movementFilter}
              onMovementFilterChange={setMovementFilter}
            />
          </LayoutColumn>

          {/* Balance History chart */}
          <LayoutColumn flex={1.08}>
            <Card color={textColor} style={{ flex: 1 }} compact>
              <View style={styles.chartHeader}>
                <RNText style={[styles.chartTitle, { color: mutedTextColor }]}>
                  Balance history
                </RNText>
                <Pressable
                  onPress={() => setExpandedChart('balance')}
                  accessibilityRole="button"
                  accessibilityLabel="Expand balance history"
                  style={styles.expandButton}
                >
                  <MaterialIcons name="open-in-full" size={15} color={mutedTextColor} />
                </Pressable>
              </View>
              <StackedBarChart
                data={balanceHistoryData}
                showLabels={true}
                showYAxis={true}
                showLegend={false}
                showTotal={false}
                viewMode={chartViewMode}
                scrollable
                selectedKey={selectedChartPeriod}
                onHoverKeyChange={setHoveredChartPeriod}
                onSelectKey={setPinnedChartPeriod}
              />
            </Card>
          </LayoutColumn>

          {/* Income/Expense chart */}
          <LayoutColumn flex={1.08}>
            <Card color={textColor} style={{ flex: 1 }} compact>
              <View style={styles.chartHeader}>
                <RNText style={[styles.chartTitle, { color: mutedTextColor }]}>
                  Income and expenses
                </RNText>
                <Pressable
                  onPress={() => setExpandedChart('cashflow')}
                  accessibilityRole="button"
                  accessibilityLabel="Expand income and expenses"
                  style={styles.expandButton}
                >
                  <MaterialIcons name="open-in-full" size={15} color={mutedTextColor} />
                </Pressable>
              </View>
              <IncomeExpenseChart
                data={incomeExpenseData}
                showLabels={true}
                showYAxis={true}
                viewMode={chartViewMode}
                scrollable
                selectedKey={selectedChartPeriod}
                onHoverKeyChange={setHoveredChartPeriod}
                onSelectKey={setPinnedChartPeriod}
              />
            </Card>
          </LayoutColumn>

          {/* Breakdown chart */}
          <LayoutColumn flex={1.08}>
            <Card color={textColor} style={{ flex: 1 }} compact>
              <View style={styles.chartHeader}>
                <RNText style={[styles.chartTitle, { color: mutedTextColor }]}>Breakdown</RNText>
                <View style={chartControlStyles.controlsRow}>
                  <Pressable
                    style={[
                      chartControlStyles.pill,
                      { backgroundColor: controlBackground, borderColor: controlBorder },
                    ]}
                    onPress={() =>
                      setBreakdownType(breakdownType === 'expense' ? 'income' : 'expense')
                    }
                  >
                    <RNText style={[chartControlStyles.pillText, { color: textColor }]}>
                      {breakdownType === 'expense' ? 'Expenses' : 'Income'}
                    </RNText>
                  </Pressable>
                  <Pressable
                    style={[
                      chartControlStyles.pill,
                      { backgroundColor: controlBackground, borderColor: controlBorder },
                    ]}
                    onPress={() =>
                      setBreakdownGroupBy(breakdownGroupBy === 'category' ? 'account' : 'category')
                    }
                    disabled={selectedAccount !== 'All'}
                    accessibilityLabel={
                      selectedAccount === 'All'
                        ? 'Change grouping'
                        : 'Grouped by category when an account is selected'
                    }
                  >
                    <RNText style={[chartControlStyles.pillText, { color: textColor }]}>
                      {breakdownGroupBy === 'category' ? 'Categories' : 'Accounts'}
                    </RNText>
                  </Pressable>
                  <Pressable
                    onPress={() => setExpandedChart('breakdown')}
                    accessibilityRole="button"
                    accessibilityLabel="Expand breakdown"
                    style={styles.expandButton}
                  >
                    <MaterialIcons name="open-in-full" size={15} color={mutedTextColor} />
                  </Pressable>
                </View>
              </View>
              <BreakdownStackedChart
                data={breakdownData}
                groupBy={breakdownGroupBy}
                showLabels={true}
                showYAxis={true}
                viewMode={chartViewMode}
                scrollable
                selectedKey={selectedChartPeriod}
                onHoverKeyChange={setHoveredChartPeriod}
                onSelectKey={setPinnedChartPeriod}
              />
            </Card>
          </LayoutColumn>
        </LayoutRow>

        {/* Row 2: Movements, Recurrent, and Unconfirmed side by side */}
        <LayoutRow flex={1} gap={16}>
          <LayoutColumn flex={1.2}>
            <MovementsCard
              key={movementFilter ?? 'all'}
              movements={visibleRecentMovements}
              filter={movementFilter}
              onMovementPress={(movement) => openDrawer('edit', { movementId: movement.id })}
            />
          </LayoutColumn>

          <LayoutColumn flex={0.9}>
            <RecurringMovementsCard
              dateRange={dateRange}
              onRecurrencePress={(movement) =>
                openDrawer('add', {
                  recurrenceId: movement.recurrenceId || '',
                })
              }
              onEditPress={(movement) => openDrawer('edit', { movementId: movement.id })}
            />
          </LayoutColumn>

          <LayoutColumn flex={0.9}>
            <UnconfirmedMovementsCard
              onMovementPress={(movement) => openDrawer('edit', { movementId: movement.id })}
            />
          </LayoutColumn>
        </LayoutRow>
      </LayoutContainer>

      {/* Side Drawer */}
      <SideDrawer isOpen={isDrawerOpen} onClose={closeDrawer} width="40%">
        {drawerContent?.type === 'add' && (
          <AddView
            editingMovementId={drawerContent.props?.movementId}
            recurrenceId={drawerContent.props?.recurrenceId}
            onClose={closeDrawer}
            onToast={handleToast}
          />
        )}
        {drawerContent?.type === 'edit' && (
          <AddView
            editingMovementId={drawerContent.props?.movementId}
            recurrenceId={drawerContent.props?.recurrenceId}
            onClose={closeDrawer}
            onToast={handleToast}
          />
        )}
        {drawerContent?.type === 'settings' && <SettingsView user={user} logout={logout} />}
      </SideDrawer>

      {expandedChart && (
        <ChartFocusPanel
          kind={expandedChart}
          viewMode={chartViewMode}
          selectedKey={selectedChartPeriod}
          onHoverKeyChange={setHoveredChartPeriod}
          onSelectKey={setPinnedChartPeriod}
          onClose={() => setExpandedChart(null)}
          balanceData={balanceHistoryData}
          incomeExpenseData={incomeExpenseData}
          breakdownData={breakdownData}
          breakdownType={breakdownType}
          breakdownGroupBy={breakdownGroupBy}
          accountName={selectedAccount}
        />
      )}

      {/* Toast notification */}
      <Toast
        isVisible={toastVisible}
        status={toastStatus}
        message={toastMessage}
        onDismiss={() => setToastVisible(false)}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    flexDirection: 'column',
    overflow: 'visible',
  },
  iconButton: {
    width: 36,
    height: 36,
    borderRadius: 12,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  primaryIconButton: {
    boxShadow: '0 4px 12px rgba(36, 68, 55, 0.18)',
  },
  iconButtonHovered: {
    opacity: 0.88,
  },
  iconButtonPressed: {
    opacity: 0.78,
    transform: [{ translateY: 1 }],
  },
  chartHeader: {
    minHeight: 30,
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
    gap: 8,
  },
  expandButton: {
    width: 27,
    height: 27,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
  },
  chartTitle: {
    minHeight: 30,
    fontSize: 13,
    lineHeight: 18,
    fontWeight: '700',
    letterSpacing: -0.1,
    paddingHorizontal: 4,
    paddingTop: 2,
  },
});

const chartControlStyles = StyleSheet.create({
  controlsRow: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    gap: 6,
    marginBottom: 4,
  },
  pill: {
    minHeight: 28,
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 12,
    borderWidth: 1,
    justifyContent: 'center',
  },
  pillText: {
    fontSize: 11,
    fontWeight: '600',
  },
});

export default LandscapeLayout;
