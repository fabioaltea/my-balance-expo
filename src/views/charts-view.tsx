import React, { useState, useMemo, useRef } from 'react';
import { View, StyleSheet, ScrollView, Animated, TouchableOpacity, Text } from 'react-native';
import { useDataContext } from '@/src/state/DataProvider';
import { ChartDataHelper } from '@/src/helpers/ChartDataHelper';
import { useIncomeExpenses } from '@/src/hooks/useIncomeExpenses';
import type { MonthlyData } from '@/src/types/charts';
import type { IncomeExpenseData } from '@/src/types/charts';
import type { PeriodBreakdownData } from '@/src/types/charts';
import {
  StackedBarChart,
  IncomeExpenseChart,
  BreakdownStackedChart,
  ChartSkeleton,
} from '@/src/components/charts';
import Card from '@/src/components/core/card';
import { useThemeColor } from '@/src/hooks/use-theme-color';
import { LinearGradient } from 'expo-linear-gradient';
import ModalPanel from '@/src/components/ui/modal-panel';
import { ThemedText } from '@/src/components/core/themed-text';

const MONTHS_TO_SHOW = 12;
const YEARS_TO_SHOW = 6;

type ViewMode = 'months' | 'years';

// Full month names for modal title
const FULL_MONTH_NAMES = [
  'January',
  'February',
  'March',
  'April',
  'May',
  'June',
  'July',
  'August',
  'September',
  'October',
  'November',
  'December',
];

const ChartsView: React.FC = () => {
  const { transactions, movements, accounts, isLoading } = useDataContext();
  const cardBackground = useThemeColor({}, 'cardBackground');
  const textColor = useThemeColor({}, 'text');
  const subtleTextColor = useThemeColor({}, 'tabIconDefault');
  const menuBackground = useThemeColor({}, 'menuBackground');
  const scrollY = useRef(new Animated.Value(0)).current;
  const fadeOpacity = scrollY.interpolate({
    inputRange: [0, 30],
    outputRange: [0, 1],
    extrapolate: 'clamp',
  });

  // State for view mode (months or years)
  const [viewMode, setViewMode] = useState<ViewMode>('months');

  // State for navigation offset (0 = current period, 1 = 1 month ago, etc.)
  const [monthOffset, setMonthOffset] = useState(0);
  const [yearOffset, setYearOffset] = useState(0);

  // State for balance modal
  const [isModalVisible, setIsModalVisible] = useState(false);
  const [selectedMonth, setSelectedMonth] = useState<MonthlyData | null>(null);

  // State for income/expense modal
  const [isIncomeExpenseModalVisible, setIsIncomeExpenseModalVisible] = useState(false);
  const [selectedIncomeExpense, setSelectedIncomeExpense] = useState<IncomeExpenseData | null>(
    null,
  );

  // State for breakdown charts (category vs account)
  type GroupBy = 'category' | 'account';
  const [expenseGroupBy, setExpenseGroupBy] = useState<GroupBy>('category');
  const [incomeGroupBy, setIncomeGroupBy] = useState<GroupBy>('category');

  // State for breakdown modals
  const [isExpenseBreakdownModalVisible, setIsExpenseBreakdownModalVisible] = useState(false);
  const [selectedExpenseBreakdown, setSelectedExpenseBreakdown] =
    useState<PeriodBreakdownData | null>(null);
  const [isIncomeBreakdownModalVisible, setIsIncomeBreakdownModalVisible] = useState(false);
  const [selectedIncomeBreakdown, setSelectedIncomeBreakdown] =
    useState<PeriodBreakdownData | null>(null);

  // Calculate monthly balances with offset
  const monthlyData = useMemo(
    () =>
      ChartDataHelper.computeMonthlyBalances(transactions, accounts, MONTHS_TO_SHOW, monthOffset),
    [transactions, accounts, monthOffset],
  );

  // Calculate yearly data (fetch more months to aggregate into years)
  const yearlyRawData = useMemo(
    () =>
      ChartDataHelper.computeMonthlyBalances(
        transactions,
        accounts,
        YEARS_TO_SHOW * 12,
        yearOffset * 12,
      ),
    [transactions, accounts, yearOffset],
  );

  // Aggregate monthly data into yearly data
  const yearlyData = useMemo((): MonthlyData[] => {
    if (yearlyRawData.length === 0) return [];

    // Group by year
    const yearMap = new Map<number, MonthlyData>();

    yearlyRawData.forEach((monthData) => {
      // Always take the latest month for each year (since data is sorted oldest to newest)
      // This gives us end-of-year balance for past years and current balance for current year
      yearMap.set(monthData.year, {
        ...monthData,
        month: String(monthData.year),
        monthIndex: monthData.year, // Store year as monthIndex for label purposes
      });
    });

    // Convert to array and sort by year
    return Array.from(yearMap.values())
      .sort((a, b) => a.year - b.year)
      .slice(-YEARS_TO_SHOW);
  }, [yearlyRawData]);

  // Get the data to display based on view mode
  const chartData = viewMode === 'months' ? monthlyData : yearlyData;

  // Calculate income/expenses data
  const incomeExpenseMonthly = useIncomeExpenses({
    movements,
    monthsToShow: MONTHS_TO_SHOW,
    monthOffset,
  });

  const incomeExpenseYearlyRaw = useIncomeExpenses({
    movements,
    monthsToShow: YEARS_TO_SHOW * 12,
    monthOffset: yearOffset * 12,
  });

  // Aggregate income/expense data into yearly
  const incomeExpenseYearly = useMemo((): IncomeExpenseData[] => {
    if (incomeExpenseYearlyRaw.length === 0) return [];

    const yearMap = new Map<number, IncomeExpenseData>();

    incomeExpenseYearlyRaw.forEach((monthData) => {
      const existing = yearMap.get(monthData.year);
      if (existing) {
        existing.income += monthData.income;
        existing.expenses += monthData.expenses;
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
      .slice(-YEARS_TO_SHOW);
  }, [incomeExpenseYearlyRaw]);

  const incomeExpenseData = viewMode === 'months' ? incomeExpenseMonthly : incomeExpenseYearly;

  // Calculate expense breakdown data
  const expenseBreakdownMonthly = useMemo(
    () =>
      ChartDataHelper.computeCategoryAccountBreakdown(
        movements,
        transactions,
        accounts,
        'expense',
        expenseGroupBy,
        MONTHS_TO_SHOW,
        monthOffset,
      ),
    [movements, transactions, accounts, expenseGroupBy, monthOffset],
  );

  const expenseBreakdownYearlyRaw = useMemo(
    () =>
      ChartDataHelper.computeCategoryAccountBreakdown(
        movements,
        transactions,
        accounts,
        'expense',
        expenseGroupBy,
        YEARS_TO_SHOW * 12,
        yearOffset * 12,
      ),
    [movements, transactions, accounts, expenseGroupBy, yearOffset],
  );

  // Aggregate expense breakdown into yearly
  const expenseBreakdownYearly = useMemo((): PeriodBreakdownData[] => {
    if (expenseBreakdownYearlyRaw.length === 0) return [];

    const yearMap = new Map<number, PeriodBreakdownData>();

    expenseBreakdownYearlyRaw.forEach((monthData) => {
      const existing = yearMap.get(monthData.year);
      if (existing) {
        // Merge items
        monthData.items.forEach((item) => {
          const existingItem = existing.items.find((i) => i.id === item.id);
          if (existingItem) {
            existingItem.amount += item.amount;
          } else {
            existing.items.push({ ...item });
          }
        });
        existing.total += monthData.total;
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
      .slice(-YEARS_TO_SHOW);
  }, [expenseBreakdownYearlyRaw]);

  const expenseBreakdownData =
    viewMode === 'months' ? expenseBreakdownMonthly : expenseBreakdownYearly;

  // Calculate income breakdown data
  const incomeBreakdownMonthly = useMemo(
    () =>
      ChartDataHelper.computeCategoryAccountBreakdown(
        movements,
        transactions,
        accounts,
        'income',
        incomeGroupBy,
        MONTHS_TO_SHOW,
        monthOffset,
      ),
    [movements, transactions, accounts, incomeGroupBy, monthOffset],
  );

  const incomeBreakdownYearlyRaw = useMemo(
    () =>
      ChartDataHelper.computeCategoryAccountBreakdown(
        movements,
        transactions,
        accounts,
        'income',
        incomeGroupBy,
        YEARS_TO_SHOW * 12,
        yearOffset * 12,
      ),
    [movements, transactions, accounts, incomeGroupBy, yearOffset],
  );

  // Aggregate income breakdown into yearly
  const incomeBreakdownYearly = useMemo((): PeriodBreakdownData[] => {
    if (incomeBreakdownYearlyRaw.length === 0) return [];

    const yearMap = new Map<number, PeriodBreakdownData>();

    incomeBreakdownYearlyRaw.forEach((monthData) => {
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
      } else {
        yearMap.set(monthData.year, {
          ...monthData,
          month: String(monthData.year),
          monthIndex: monthData.year,
          items: monthData.items.map((i) => ({ ...i })),
        });
      }
    });

    yearMap.forEach((data) => {
      data.items.sort((a, b) => b.amount - a.amount);
    });

    return Array.from(yearMap.values())
      .sort((a, b) => a.year - b.year)
      .slice(-YEARS_TO_SHOW);
  }, [incomeBreakdownYearlyRaw]);

  const incomeBreakdownData =
    viewMode === 'months' ? incomeBreakdownMonthly : incomeBreakdownYearly;

  // Navigation handlers - scroll by 1 month or 1 year depending on mode
  const canGoNext = viewMode === 'months' ? monthOffset > 0 : yearOffset > 0;

  // Check if leftmost bar has any data (non-zero balance)
  const leftmostHasData = useMemo(() => {
    if (chartData.length === 0) return false;
    const leftmost = chartData[0];
    return leftmost.accounts.some((acc) => acc.balance !== 0);
  }, [chartData]);

  const canGoPrevious = leftmostHasData;

  const goToPrevious = () => {
    if (!canGoPrevious) return;
    if (viewMode === 'months') {
      setMonthOffset((prev) => prev + 1);
    } else {
      setYearOffset((prev) => prev + 1);
    }
  };

  const goToNext = () => {
    if (canGoNext) {
      if (viewMode === 'months') {
        setMonthOffset((prev) => Math.max(0, prev - 1));
      } else {
        setYearOffset((prev) => Math.max(0, prev - 1));
      }
    }
  };

  // Toggle view mode handler
  const toggleViewMode = () => {
    setViewMode((prev) => (prev === 'months' ? 'years' : 'months'));
  };

  // Handle bar press - open modal
  const handleBarPress = (monthData: MonthlyData) => {
    setSelectedMonth(monthData);
    setIsModalVisible(true);
  };

  // Handle income/expense bar press
  const handleIncomeExpensePress = (data: IncomeExpenseData) => {
    setSelectedIncomeExpense(data);
    setIsIncomeExpenseModalVisible(true);
  };

  // Handle expense breakdown bar press
  const handleExpenseBreakdownPress = (data: PeriodBreakdownData) => {
    setSelectedExpenseBreakdown(data);
    setIsExpenseBreakdownModalVisible(true);
  };

  // Handle income breakdown bar press
  const handleIncomeBreakdownPress = (data: PeriodBreakdownData) => {
    setSelectedIncomeBreakdown(data);
    setIsIncomeBreakdownModalVisible(true);
  };

  // Format amount
  const formatAmount = (amount: number) => {
    return `€${amount.toLocaleString('it-IT', {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    })}`;
  };

  // Show skeleton while loading
  if (isLoading && transactions.length === 0) {
    return (
      <View style={styles.wrapper}>
        {/* Page header visible during loading */}
        <View style={styles.pageHeader}>
          <ThemedText type="title">Charts</ThemedText>
        </View>

        <ScrollView style={styles.container} showsVerticalScrollIndicator={false}>
          {/* Balance History Skeleton */}
          <Text style={[styles.chartLabel, { color: textColor, marginTop: 0 }]}>
            Balance History
          </Text>
          <Card backgroundColor={cardBackground} color={textColor}>
            <ChartSkeleton variant="bars" height={200} barCount={6} />
          </Card>

          {/* Income & Expenses Skeleton */}
          <Text style={[styles.chartLabel, { color: textColor }]}>Income & Expenses</Text>
          <Card backgroundColor={cardBackground} color={textColor}>
            <ChartSkeleton variant="bars" height={200} barCount={6} />
          </Card>

          {/* Expenses Breakdown Skeleton */}
          <Text style={[styles.chartLabel, { color: textColor }]}>Expenses Breakdown</Text>
          <Card backgroundColor={cardBackground} color={textColor}>
            <ChartSkeleton variant="bars" height={200} barCount={6} />
          </Card>

          {/* Income Breakdown Skeleton */}
          <Text style={[styles.chartLabel, { color: textColor }]}>Income Breakdown</Text>
          <Card backgroundColor={cardBackground} color={textColor}>
            <ChartSkeleton variant="bars" height={200} barCount={6} />
          </Card>

          <View style={styles.bottomSpacer} />
        </ScrollView>
      </View>
    );
  }

  return (
    <View style={styles.wrapper}>
      {/* Fixed header with title and navigation controls */}
      <View style={styles.pageHeader}>
        <ThemedText type="title">Charts</ThemedText>
        <View style={styles.navigationContainer}>
          {/* View mode toggle */}
          <TouchableOpacity
            style={[styles.viewModeChip, viewMode === 'years' && styles.viewModeChipActive]}
            onPress={toggleViewMode}
          >
            <Text style={[styles.viewModeText, viewMode === 'years' && styles.viewModeTextActive]}>
              {viewMode === 'months' ? 'Months' : 'Years'}
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.arrowButton, !canGoPrevious && styles.arrowButtonDisabled]}
            onPress={goToPrevious}
            disabled={!canGoPrevious}
          >
            <Text style={[styles.arrowText, !canGoPrevious && styles.arrowTextDisabled]}>←</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.arrowButton, !canGoNext && styles.arrowButtonDisabled]}
            onPress={goToNext}
            disabled={!canGoNext}
          >
            <Text style={[styles.arrowText, !canGoNext && styles.arrowTextDisabled]}>→</Text>
          </TouchableOpacity>
        </View>
      </View>

      <Animated.View
        style={{ height: 20, marginBottom: -20, zIndex: 1, opacity: fadeOpacity }}
        pointerEvents="none"
      >
        <LinearGradient colors={[menuBackground, menuBackground + '00']} style={{ flex: 1 }} />
      </Animated.View>
      <Animated.ScrollView
        style={styles.container}
        showsVerticalScrollIndicator={false}
        onScroll={Animated.event([{ nativeEvent: { contentOffset: { y: scrollY } } }], {
          useNativeDriver: true,
        })}
        scrollEventThrottle={16}
      >
        {/* Balance History Chart */}
        <Text style={[styles.chartLabel, { color: textColor, marginTop: 0 }]}>Balance History</Text>
        <Card backgroundColor={cardBackground} color={textColor}>
          <StackedBarChart
            data={chartData}
            height={200}
            showLabels={true}
            showYAxis={true}
            showLegend={false}
            showTotal={false}
            onBarPress={handleBarPress}
            viewMode={viewMode}
          />
        </Card>

        {/* Income/Expense Chart */}
        <Text style={[styles.chartLabel, { color: textColor }]}>Income & Expenses</Text>
        <Card backgroundColor={cardBackground} color={textColor}>
          <IncomeExpenseChart
            data={incomeExpenseData}
            height={200}
            showLabels={true}
            showYAxis={true}
            onBarPress={handleIncomeExpensePress}
            viewMode={viewMode}
          />
        </Card>

        {/* Expense Breakdown Chart */}
        <View style={styles.chartHeaderRow}>
          <Text style={[styles.chartLabel, { color: textColor }]}>Expenses Breakdown</Text>
          <TouchableOpacity
            style={styles.groupByChip}
            onPress={() =>
              setExpenseGroupBy((prev) => (prev === 'category' ? 'account' : 'category'))
            }
          >
            <Text style={styles.groupByText}>
              {expenseGroupBy === 'category' ? 'Category' : 'Account'}
            </Text>
          </TouchableOpacity>
        </View>
        <Card backgroundColor={cardBackground} color={textColor}>
          <BreakdownStackedChart
            data={expenseBreakdownData}
            height={200}
            showLabels={true}
            showYAxis={true}
            onBarPress={handleExpenseBreakdownPress}
            viewMode={viewMode}
          />
        </Card>

        {/* Income Breakdown Chart */}
        <View style={styles.chartHeaderRow}>
          <Text style={[styles.chartLabel, { color: textColor }]}>Income Breakdown</Text>
          <TouchableOpacity
            style={styles.groupByChip}
            onPress={() =>
              setIncomeGroupBy((prev) => (prev === 'category' ? 'account' : 'category'))
            }
          >
            <Text style={styles.groupByText}>
              {incomeGroupBy === 'category' ? 'Category' : 'Account'}
            </Text>
          </TouchableOpacity>
        </View>
        <Card backgroundColor={cardBackground} color={textColor}>
          <BreakdownStackedChart
            data={incomeBreakdownData}
            height={200}
            showLabels={true}
            showYAxis={true}
            onBarPress={handleIncomeBreakdownPress}
            viewMode={viewMode}
          />
        </Card>

        {/* Month/Year Detail Modal */}
        <ModalPanel
          isVisible={isModalVisible}
          onClose={() => setIsModalVisible(false)}
          title={
            selectedMonth
              ? viewMode === 'months'
                ? `${FULL_MONTH_NAMES[selectedMonth.monthIndex]} ${selectedMonth.year}`
                : `Year ${selectedMonth.year}`
              : ''
          }
          showConfirmButton={false}
          showCancelButton={true}
        >
          {selectedMonth && (
            <View style={styles.modalContent}>
              {/* Total Balance */}
              <View style={styles.totalSection}>
                <Text style={[styles.totalLabel, { color: subtleTextColor }]}>Total Balance</Text>
                <Text style={[styles.totalAmount, { color: textColor }]}>
                  {formatAmount(selectedMonth.totalBalance)}
                </Text>
              </View>

              {/* Accounts List */}
              <View style={styles.accountsSection}>
                <Text style={[styles.sectionTitle, { color: subtleTextColor }]}>Accounts</Text>
              </View>
              <ScrollView
                style={styles.accountsList}
                contentContainerStyle={styles.accountsListContent}
                showsVerticalScrollIndicator={true}
                bounces={true}
                nestedScrollEnabled={true}
              >
                {[...selectedMonth.accounts]
                  .sort((a, b) => b.balance - a.balance)
                  .map((account, index) => (
                    <View key={index} style={styles.accountRow}>
                      <View style={styles.accountInfo}>
                        <View
                          style={[styles.accountColorDot, { backgroundColor: account.color }]}
                        />
                        <Text style={[styles.accountName, { color: textColor }]}>
                          {account.accountName}
                        </Text>
                      </View>
                      <Text
                        style={[
                          styles.accountBalance,
                          {
                            color: account.balance >= 0 ? '#4CAF50' : '#F44336',
                          },
                        ]}
                      >
                        {formatAmount(account.balance)}
                      </Text>
                    </View>
                  ))}
              </ScrollView>
            </View>
          )}
        </ModalPanel>

        {/* Income/Expense Detail Modal */}
        <ModalPanel
          isVisible={isIncomeExpenseModalVisible}
          onClose={() => setIsIncomeExpenseModalVisible(false)}
          title={
            selectedIncomeExpense
              ? viewMode === 'months'
                ? `${FULL_MONTH_NAMES[selectedIncomeExpense.monthIndex]} ${selectedIncomeExpense.year}`
                : `Year ${selectedIncomeExpense.year}`
              : ''
          }
          showConfirmButton={false}
          showCancelButton={true}
        >
          {selectedIncomeExpense && (
            <View style={styles.modalContent}>
              {/* Income */}
              <View style={styles.incomeExpenseRow}>
                <View style={styles.incomeExpenseItem}>
                  <Text style={[styles.incomeExpenseLabel, { color: subtleTextColor }]}>
                    Entrate
                  </Text>
                  <Text style={[styles.incomeExpenseAmount, { color: '#4CAF50' }]}>
                    {formatAmount(selectedIncomeExpense.income)}
                  </Text>
                </View>
                <View style={styles.incomeExpenseItem}>
                  <Text style={[styles.incomeExpenseLabel, { color: subtleTextColor }]}>
                    Uscite
                  </Text>
                  <Text style={[styles.incomeExpenseAmount, { color: '#F44336' }]}>
                    {formatAmount(selectedIncomeExpense.expenses)}
                  </Text>
                </View>
              </View>

              {/* Balance */}
              <View style={styles.balanceSection}>
                <Text style={[styles.balanceLabel, { color: subtleTextColor }]}>Bilancio</Text>
                <Text
                  style={[
                    styles.balanceAmount,
                    {
                      color:
                        selectedIncomeExpense.income - selectedIncomeExpense.expenses >= 0
                          ? '#4CAF50'
                          : '#F44336',
                    },
                  ]}
                >
                  {formatAmount(selectedIncomeExpense.income - selectedIncomeExpense.expenses)}
                </Text>
              </View>
            </View>
          )}
        </ModalPanel>

        {/* Expense Breakdown Detail Modal */}
        <ModalPanel
          isVisible={isExpenseBreakdownModalVisible}
          onClose={() => setIsExpenseBreakdownModalVisible(false)}
          title={
            selectedExpenseBreakdown
              ? viewMode === 'months'
                ? `Expenses - ${FULL_MONTH_NAMES[selectedExpenseBreakdown.monthIndex]} ${selectedExpenseBreakdown.year}`
                : `Expenses - Year ${selectedExpenseBreakdown.year}`
              : ''
          }
          showConfirmButton={false}
          showCancelButton={true}
        >
          {selectedExpenseBreakdown && (
            <View style={styles.modalContent}>
              {/* Total */}
              <View style={styles.totalSection}>
                <Text style={[styles.totalLabel, { color: subtleTextColor }]}>Total Expenses</Text>
                <Text style={[styles.totalAmount, { color: '#F44336' }]}>
                  {formatAmount(selectedExpenseBreakdown.total)}
                </Text>
              </View>

              {/* Breakdown List */}
              <View style={styles.accountsSection}>
                <Text style={[styles.sectionTitle, { color: subtleTextColor }]}>
                  {expenseGroupBy === 'category' ? 'Categories' : 'Accounts'}
                </Text>
              </View>
              <ScrollView
                style={styles.accountsList}
                contentContainerStyle={styles.accountsListContent}
                showsVerticalScrollIndicator={true}
                bounces={true}
                nestedScrollEnabled={true}
              >
                {[...selectedExpenseBreakdown.items]
                  .sort((a, b) => b.amount - a.amount)
                  .map((item, index) => (
                    <View key={index} style={styles.accountRow}>
                      <View style={styles.accountInfo}>
                        <View style={[styles.accountColorDot, { backgroundColor: item.color }]} />
                        <Text style={[styles.accountName, { color: textColor }]}>{item.name}</Text>
                      </View>
                      <Text style={[styles.accountBalance, { color: '#F44336' }]}>
                        {formatAmount(item.amount)}
                      </Text>
                    </View>
                  ))}
              </ScrollView>
            </View>
          )}
        </ModalPanel>

        {/* Income Breakdown Detail Modal */}
        <ModalPanel
          isVisible={isIncomeBreakdownModalVisible}
          onClose={() => setIsIncomeBreakdownModalVisible(false)}
          title={
            selectedIncomeBreakdown
              ? viewMode === 'months'
                ? `Income - ${FULL_MONTH_NAMES[selectedIncomeBreakdown.monthIndex]} ${selectedIncomeBreakdown.year}`
                : `Income - Year ${selectedIncomeBreakdown.year}`
              : ''
          }
          showConfirmButton={false}
          showCancelButton={true}
        >
          {selectedIncomeBreakdown && (
            <View style={styles.modalContent}>
              {/* Total */}
              <View style={styles.totalSection}>
                <Text style={[styles.totalLabel, { color: subtleTextColor }]}>Total Income</Text>
                <Text style={[styles.totalAmount, { color: '#4CAF50' }]}>
                  {formatAmount(selectedIncomeBreakdown.total)}
                </Text>
              </View>

              {/* Breakdown List */}
              <View style={styles.accountsSection}>
                <Text style={[styles.sectionTitle, { color: subtleTextColor }]}>
                  {incomeGroupBy === 'category' ? 'Categories' : 'Accounts'}
                </Text>
              </View>
              <ScrollView
                style={styles.accountsList}
                contentContainerStyle={styles.accountsListContent}
                showsVerticalScrollIndicator={true}
                bounces={true}
                nestedScrollEnabled={true}
              >
                {[...selectedIncomeBreakdown.items]
                  .sort((a, b) => b.amount - a.amount)
                  .map((item, index) => (
                    <View key={index} style={styles.accountRow}>
                      <View style={styles.accountInfo}>
                        <View style={[styles.accountColorDot, { backgroundColor: item.color }]} />
                        <Text style={[styles.accountName, { color: textColor }]}>{item.name}</Text>
                      </View>
                      <Text style={[styles.accountBalance, { color: '#4CAF50' }]}>
                        {formatAmount(item.amount)}
                      </Text>
                    </View>
                  ))}
              </ScrollView>
            </View>
          )}
        </ModalPanel>

        {/* Bottom spacer for scroll */}
        <View style={styles.bottomSpacer} />
      </Animated.ScrollView>
    </View>
  );
};

const styles = StyleSheet.create({
  wrapper: {
    flex: 1,
  },
  pageHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 12,
    marginBottom: 8,
  },
  container: {
    flex: 1,
    paddingHorizontal: 16,
  },
  navigationContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  arrowButton: {
    padding: 8,
    paddingHorizontal: 12,
    borderRadius: 20,
    backgroundColor: '#f0f0f0',
  },
  arrowButtonDisabled: {
    opacity: 0.3,
  },
  arrowText: {
    fontSize: 18,
    fontWeight: 'bold',
  },
  arrowTextDisabled: {
    color: '#999',
  },
  viewModeChip: {
    paddingVertical: 8,
    paddingHorizontal: 14,
    borderRadius: 20,
    backgroundColor: '#f0f0f0',
  },
  viewModeChipActive: {
    backgroundColor: '#2F4F3F',
  },
  viewModeText: {
    fontSize: 13,
    fontWeight: '600',
    color: '#333',
  },
  viewModeTextActive: {
    color: '#fff',
  },
  chartLabel: {
    fontSize: 18,
    fontWeight: '600',
    marginBottom: 10,
    marginTop: 10,
    paddingHorizontal: 10,
  },
  chartHeaderRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: 10,
    marginBottom: 10,
    paddingHorizontal: 10,
  },
  groupByChip: {
    paddingVertical: 6,
    paddingHorizontal: 12,
    borderRadius: 16,
    backgroundColor: '#f0f0f0',
  },
  groupByText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#333',
  },
  // Modal styles
  modalContent: {
    gap: 24,
  },
  totalSection: {
    alignItems: 'center',
    paddingVertical: 16,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(128, 128, 128, 0.2)',
  },
  totalLabel: {
    fontSize: 14,
    marginBottom: 4,
  },
  totalAmount: {
    fontSize: 32,
    fontWeight: '700',
  },
  accountsSection: {
    gap: 12,
  },
  accountsList: {
    maxHeight: 250,
    flexGrow: 0,
  },
  accountsListContent: {
    paddingBottom: 8,
  },
  sectionTitle: {
    fontSize: 14,
    fontWeight: '600',
    marginBottom: 4,
  },
  accountRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 12,
    paddingHorizontal: 8,
    backgroundColor: 'rgba(128, 128, 128, 0.05)',
    borderRadius: 18,
    marginBottom: 8,
  },
  accountInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  accountColorDot: {
    width: 16,
    height: 16,
    borderRadius: 6,
  },
  accountName: {
    fontSize: 16,
    fontWeight: '500',
  },
  accountBalance: {
    fontSize: 16,
    fontWeight: '600',
  },
  // Income/Expense modal styles
  incomeExpenseRow: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    paddingVertical: 16,
  },
  incomeExpenseItem: {
    alignItems: 'center',
    gap: 8,
  },
  incomeExpenseLabel: {
    fontSize: 14,
  },
  incomeExpenseAmount: {
    fontSize: 24,
    fontWeight: '700',
  },
  balanceSection: {
    alignItems: 'center',
    paddingVertical: 16,
    borderTopWidth: 1,
    borderTopColor: 'rgba(128, 128, 128, 0.2)',
    gap: 8,
  },
  balanceLabel: {
    fontSize: 14,
  },
  balanceAmount: {
    fontSize: 28,
    fontWeight: '700',
  },
  bottomSpacer: {
    height: 100,
  },
});

export default ChartsView;
