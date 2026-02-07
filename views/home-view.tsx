import BalanceCard from "@/components/cards/balance-card";
import MovementsCard from "@/components/cards/movements-card";
import RecurringMovementsCard from "@/components/cards/recurring-movements-card";
import UnconfirmedMovementsCard from "@/components/cards/unconfirmed-movements-card";
// import FinancialSummaryCard from "@/components/cards/financial-summary-card";
import ForecastCard from "@/components/cards/forecast-card";
import PeriodPicker from "@/components/ui/period-chips-picker";
import {
  View,
  StyleSheet,
  ScrollView,
  RefreshControl,
  Text,
} from "react-native";
import React, { useState, useMemo } from "react";
import Pager from "@/components/ui/pager";
import { DATE_RANGES } from "@/state";
import { isDateInRange, detectPeriodType, parseDateFromDDMMYYYY } from "@/utils/dateUtils";
import type { Account, Movement, IDateRange, PendingRecurrence } from "@/state";
import type { MonthlyForecast } from "@/hooks/useMyBalanceData";
import ViewModePicker from "@/components/ui/view-mode-picker";
import FinancialSummaryCard from "@/components/cards/financial-summary-card";
import { useQueryClient } from '@tanstack/react-query';
import { QUERY_KEYS } from '@/hooks/queries/queryKeys';

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
  // React Query client for invalidating queries
  const queryClient = useQueryClient();

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
  const onRefresh = React.useCallback(async () => {
    try {
      // Invalidate all main data queries to trigger fresh data fetch
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: QUERY_KEYS.transactions.all }),
        queryClient.invalidateQueries({ queryKey: QUERY_KEYS.accounts.all }),
        queryClient.invalidateQueries({ queryKey: QUERY_KEYS.aggregations.all }),
      ]);
    } catch (error) {
      console.error("Error refreshing data:", error);
    }
  }, [queryClient]);


  return (
    <View style={{ flex: 1 }}>
      {accounts.length > 0 ? (
        <Pager
          selectedPage={selectedAccountIndex}
          onPageSelected={handleAccountSwitch}
          style={{ height: 110, marginBottom: 12 }}
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
      {/* <BlurView intensity={100} tint="default" style={styles.blurOverlay} /> */}
      <ScrollView
        contentContainerStyle={styles.scrollContainer}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl
            refreshing={isLoading}
            onRefresh={onRefresh}
            tintColor="#2F4F3F"
            colors={["#2F4F3F"]}
          />
        }
      >
        <PeriodPicker
          setDateRange={handleDateRangeChange}
          isLoading={isLoading}
        />
        <Pager
          style={{ height: 230, marginHorizontal: -16, marginBottom: 16 }}
          selectedPage={summaryPagerIndex}
          onPageSelected={setSummaryPagerIndex}
          scrollEnabled={isCurrentPeriod}
        >
          <FinancialSummaryCard
            income={getTotalIncome(dateFilteredMovements, selectedAccount)}
            expense={getTotalExpense(dateFilteredMovements, selectedAccount)}
            isTransitioning={isPeriodTransitioning}
          />
          <ForecastCard
            forecast={currentForecast}
            isTransitioning={isPeriodTransitioning}
          />
        </Pager>

        <ViewModePicker
          selectedMode={viewMode}
          onModeChange={setViewMode}
          pendingCount={pendingCount}
          unconfirmedCount={unconfirmedCount}
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
      </ScrollView>
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
