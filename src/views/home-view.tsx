import BalanceCard from "@/src/components/cards/balance-card";
import MovementsCard from "@/src/components/cards/movements/recent-movements-card";
import RecurringMovementsCard from "@/src/components/cards/movements/recurring-movements-card";
import UnconfirmedMovementsCard from "@/src/components/cards/movements/unconfirmed-movements-card";
import ForecastCard from "@/src/components/cards/forecast-card";
import PeriodPicker from "@/src/components/ui/period-chips-picker";
import {
  View,
  StyleSheet,
  Animated,
  RefreshControl,
  Text,
} from "react-native";
import React, { useState, useMemo, useRef } from "react";
import Pager from "@/src/components/ui/pager";
import { DATE_RANGES } from "@/src/state";
import { isDateInRange, detectPeriodType, parseDateFromDDMMYYYY } from "@/src/utils/dateUtils";
import type { Account, Movement, IDateRange, PendingRecurrence } from "@/src/state";
import type { MonthlyForecast } from "@/src/hooks/useMyBalanceData";
import ViewModePicker from "@/src/components/ui/view-mode-picker";
import SummaryCard from "@/src/components/cards/summary-card";
import { useDataContext } from '@/src/state';
import { LinearGradient } from 'expo-linear-gradient';
import { useThemeColor } from '@/src/hooks/use-theme-color';

interface HomeViewProps {
  accounts: Account[];
  selectedAccount: string;
  setSelectedAccount: (account: string) => void;
  movements: Movement[];
  pendingRecurrences: PendingRecurrence[];
  unconfirmedCount: number;
  isLoading: boolean;
  getTotalIncome: (filteredMovements: Movement[], accountFilter?: string) => number;
  getTotalExpense: (filteredMovements: Movement[], accountFilter?: string) => number;
  calculateForecast: (startDate: string, endDate: string) => MonthlyForecast;
}

const HomeView: React.FC<HomeViewProps> = ({
  accounts,
  selectedAccount,
  setSelectedAccount,
  movements,
  pendingRecurrences,
  unconfirmedCount,
  isLoading,
  getTotalIncome,
  getTotalExpense,
  calculateForecast,
}) => {
  const { reloadData } = useDataContext();
  const menuBackground = useThemeColor({}, 'menuBackground');
  const scrollY = useRef(new Animated.Value(0)).current;
  const [stickyOffset, setStickyOffset] = useState(300);

  const balanceFadeOpacity = scrollY.interpolate({
    inputRange: [0, 30, Math.max(31, stickyOffset - 20), Math.max(32, stickyOffset)],
    outputRange: [0, 1, 1, 0],
    extrapolate: 'clamp',
  });

  const vpFadeOpacity = scrollY.interpolate({
    inputRange: [Math.max(0, stickyOffset - 20), Math.max(1, stickyOffset)],
    outputRange: [0, 1],
    extrapolate: 'clamp',
  });

  // Local state for date range
  const [dateRange, setDateRange] = useState<IDateRange>(
    DATE_RANGES.THIS_MONTH,
  );
  const [viewMode, setViewMode] = useState<"recent" | "recurring" | "unconfirmed">(
    "recent",
  );
  const [isPeriodTransitioning, setIsPeriodTransitioning] =
    useState<boolean>(false);
  const [summaryPagerIndex, setSummaryPagerIndex] = useState<number>(0);

  // Handle date range change with transitioning state
  const handleDateRangeChange = (
    range: IDateRange & { isTransitioning?: boolean },
  ) => {
    setDateRange(range);
    if (range.isTransitioning) {
      setIsPeriodTransitioning(true);
    }

    // Check if the new range is a current period (current month or current year)
    const now = new Date();
    const currentMonth = now.getMonth();
    const currentYear = now.getFullYear();
    const startDate = new Date(range.startDate.split("-").reverse().join("-"));
    const periodType = detectPeriodType(range.startDate, range.endDate);

    const isNewPeriodCurrent =
      periodType === "year"
        ? startDate.getFullYear() === currentYear
        : startDate.getMonth() === currentMonth && startDate.getFullYear() === currentYear;

    // Only reset pager to first page when going to a non-current period
    if (!isNewPeriodCurrent) {
      setSummaryPagerIndex(0);
    }
  };

  // Check if we're viewing the current month or current year (forecast is available)
  const isCurrentPeriod = useMemo(() => {
    const now = new Date();
    const currentMonth = now.getMonth();
    const currentYear = now.getFullYear();

    // Parse the dateRange start date
    const startDate = new Date(dateRange.startDate.split("-").reverse().join("-"));
    const periodType = detectPeriodType(dateRange.startDate, dateRange.endDate);

    if (periodType === "year") {
      // For year view, check if it's the current year
      return startDate.getFullYear() === currentYear;
    } else {
      // For month view, check if it's the current month
      return startDate.getMonth() === currentMonth && startDate.getFullYear() === currentYear;
    }
  }, [dateRange]);

  // Calculate forecast for the current period
  const currentForecast = useMemo(() => {
    return calculateForecast(dateRange.startDate, dateRange.endDate);
  }, [dateRange, calculateForecast]);

  // Reset transitioning state when data finishes loading
  React.useEffect(() => {
    if (!isLoading && isPeriodTransitioning) {
      setIsPeriodTransitioning(false);
    }
  }, [isLoading, isPeriodTransitioning]);

  // Calculate current selected account index
  const selectedAccountIndex = accounts.findIndex(
    (a) => a.name === selectedAccount,
  );

  

  // Filter movements based on date range and account
  const dateFilteredMovements = useMemo(() => {
    return movements.filter((m) => {
      const dateMatches = isDateInRange(
        m.date,
        dateRange.startDate,
        dateRange.endDate,
      );

      // If a specific account is selected, only show movements that have at least one transaction for that account
      const accountMatches =
        selectedAccount === "All" ||
        m.transactions.some((t) => t.account === selectedAccount);

      return dateMatches && accountMatches;
    });
  }, [movements, selectedAccount, dateRange]);

  // Filter movements based on viewMode
  const filteredMovements = useMemo(() => {
    // Show all movements in the selected period
    return dateFilteredMovements;
  }, [dateFilteredMovements]);

  // Count of pending items for badge (only today and overdue)
  const pendingCount = useMemo(() => {
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    return (pendingRecurrences || []).filter((p) => {
      // If already marked as overdue from period, count it
      if (p.isOverdue) return true;

      // Calculate expected date
      const templateDate = parseDateFromDDMMYYYY(p.template.date);
      const periodStart = parseDateFromDDMMYYYY(p.periodStart);
      if (!templateDate || !periodStart) return false;

      const day = templateDate.getDate();
      const month = periodStart.getMonth();
      const year = periodStart.getFullYear();
      const lastDayOfMonth = new Date(year, month + 1, 0).getDate();
      const actualDay = Math.min(day, lastDayOfMonth);
      const expectedDate = new Date(year, month, actualDay);

      // Count if expected date is today or has passed
      return expectedDate <= today;
    }).reduce((sum, p) => sum + p.missingCount, 0);
  }, [pendingRecurrences]);

  // Handle account switch
  const handleAccountSwitch = (index: number) => {
    const account = accounts[index];
    if (account) {
      setSelectedAccount(account.name);
    }
  };

  // Handle refresh - invalidate all queries to trigger refetch
  const onRefresh = async () => {
    try {
      await reloadData();
    } catch (error) {
      console.error("Error refreshing data:", error);
    }
  };


  return (
    <View style={{ flex: 1 }}>
      {accounts.length > 0 ? (
        <Pager
          selectedPage={selectedAccountIndex}
          onPageSelected={handleAccountSwitch}
          style={{ height: 110, marginBottom: 5 }}
        >
          {accounts.map((account) => (
            <BalanceCard
              key={account.accountId}
              account={{
                accountId: account.accountId,
                name: account.name,
                balance: account.balance,
                color: account.color,
                textColor: account.textColor,
              }}
            />
          ))}
        </Pager>
      ) : (
        <View
          style={{
            height: 150,
            justifyContent: "center",
            alignItems: "center",
          }}
        >
          <Text>Loading accounts...</Text>
        </View>
      )}
      <Animated.View
        style={{ height: 20, marginBottom: -20, zIndex: 1, opacity: balanceFadeOpacity }}
        pointerEvents="none"
      >
        <LinearGradient
          colors={[menuBackground, menuBackground + '00']}
          style={{ flex: 1 }}
        />
      </Animated.View>
      <Animated.ScrollView
        contentContainerStyle={styles.scrollContainer}
        showsVerticalScrollIndicator={false}
        stickyHeaderIndices={[1]}
        onScroll={Animated.event(
          [{ nativeEvent: { contentOffset: { y: scrollY } } }],
          { useNativeDriver: true },
        )}
        scrollEventThrottle={16}
        refreshControl={
          <RefreshControl
            refreshing={isLoading}
            onRefresh={onRefresh}
            tintColor="#2F4F3F"
            colors={["#2F4F3F"]}
          />
        }
      >
        <View onLayout={(e) => setStickyOffset(e.nativeEvent.layout.height)}>
          <PeriodPicker
            setDateRange={handleDateRangeChange}
            isLoading={isLoading}
          />
          <Pager
            style={{ height: 230, marginHorizontal: -16, marginBottom: 16 }}
            selectedPage={summaryPagerIndex}
            onPageSelected={setSummaryPagerIndex}
            scrollEnabled={isCurrentPeriod && currentForecast.hasEnoughData}
          >
            <SummaryCard
              income={getTotalIncome(dateFilteredMovements, selectedAccount)}
              expense={getTotalExpense(dateFilteredMovements, selectedAccount)}
              isTransitioning={isPeriodTransitioning}
            />
            {currentForecast.hasEnoughData && (
              <ForecastCard
                forecast={currentForecast}
                isTransitioning={isPeriodTransitioning}
              />
            )}
          </Pager>
        </View>

        <ViewModePicker
          selectedMode={viewMode}
          onModeChange={setViewMode}
          pendingCount={pendingCount}
          unconfirmedCount={unconfirmedCount}
          fadeOpacity={vpFadeOpacity}
        />
        {viewMode === "recurring" && <RecurringMovementsCard dateRange={dateRange} />}
        {viewMode === "recent" && (
          <MovementsCard
            movements={filteredMovements}
            isTransitioning={isPeriodTransitioning}
          />
        )}
        {viewMode === "unconfirmed" && <UnconfirmedMovementsCard />}
        <View style={{ height: 100 }}></View>
      </Animated.ScrollView>
    </View>
  );
};

export default HomeView;

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  scrollContainer: {
    paddingHorizontal: 16,
    flexGrow: 1,
  },
});
