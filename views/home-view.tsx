import BalanceCard from "@/components/cards/balance-card";
import MovementsCard from "@/components/cards/movements-card";
import RecurringMovementsCard from "@/components/cards/recurring-movements-card";
import FinancialSummaryCard from "@/components/cards/financial-summary-card";
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
import { isDateInRange } from "@/utils/dateUtils";
import type { Account, Movement, IDateRange, PendingRecurrence } from "@/state";
import ViewModePicker from "@/components/ui/view-mode-picker";
import PendingRecurrencesCard from "@/components/cards/pending-recurrences-card";

interface HomeViewProps {
  accounts: Account[];
  selectedAccount: string;
  setSelectedAccount: (account: string) => void;
  movements: Movement[];
  pendingRecurrences: PendingRecurrence[];
  isLoading: boolean;
  reloadData: () => Promise<void>;
  getTotalIncome: (filteredMovements: Movement[]) => number;
  getTotalExpense: (filteredMovements: Movement[]) => number;
}

const HomeView: React.FC<HomeViewProps> = ({
  accounts,
  selectedAccount,
  setSelectedAccount,
  movements,
  pendingRecurrences,
  isLoading,
  reloadData,
  getTotalIncome,
  getTotalExpense,
}) => {
  // Local state for date range
  const [dateRange, setDateRange] = useState<IDateRange>(
    DATE_RANGES.THIS_MONTH,
  );
  const [viewMode, setViewMode] = useState<"recent" | "next" | "recurring">(
    "recent",
  );
  const [isPeriodTransitioning, setIsPeriodTransitioning] =
    useState<boolean>(false);

  // Handle date range change with transitioning state
  const handleDateRangeChange = (
    range: IDateRange & { isTransitioning?: boolean },
  ) => {
    setDateRange(range);
    if (range.isTransitioning) {
      setIsPeriodTransitioning(true);
    }
  };

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

  // Debug logging
  React.useEffect(() => {
    console.log("📊 HomeView Debug:");
    console.log("  - Accounts:", accounts.length);
    console.log("  - Available Accounts:", accounts.length);
    console.log("  - Movements:", movements.length);
    console.log("  - Pending Recurrences:", pendingRecurrences?.length || 0);
    console.log(
      "  - Pending Recurrences Data:",
      JSON.stringify(pendingRecurrences, null, 2),
    );
    console.log("  - Selected Account:", selectedAccount);
    console.log("  - Selected Account Index:", selectedAccountIndex);
  }, [
    accounts,
    movements,
    pendingRecurrences,
    selectedAccount,
    selectedAccountIndex,
    accounts,
  ]);

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

  // Filter movements based on viewMode (only for recent and next)
  const filteredMovements = useMemo(() => {
    switch (viewMode) {
      case "next":
        // Show upcoming/future movements
        const today = new Date();
        today.setHours(0, 0, 0, 0);
        return dateFilteredMovements.filter((m) => {
          const [day, month, year] = m.date.split("-").map(Number);
          const movementDate = new Date(year, month - 1, day);
          return movementDate >= today;
        });

      case "recent":
      default:
        // Show all movements in the selected period (default behavior)
        return dateFilteredMovements;
    }
  }, [dateFilteredMovements, viewMode]);

  // Filter pending recurrences to only show future (not overdue)
  const futurePendingRecurrences = useMemo(() => {
    return (pendingRecurrences || []).filter((p) => !p.isOverdue);
  }, [pendingRecurrences]);

  // Count of pending items for badge
  const pendingCount = futurePendingRecurrences.reduce(
    (sum, p) => sum + p.missingCount,
    0,
  );

  // Handle account switch
  const handleAccountSwitch = (index: number) => {
    const account = accounts[index];
    if (account) {
      setSelectedAccount(account.name);
    }
  };

  // Handle refresh
  const onRefresh = React.useCallback(async () => {
    try {
      await reloadData();
    } catch (error) {
      console.error("Error refreshing data:", error);
    }
  }, [reloadData]);

  console.log("🔍 Rendering Pager with", accounts.length, "accounts");

  return (
    <View style={{ flex: 1 }}>
      {accounts.length > 0 ? (
        <Pager
          selectedPage={selectedAccountIndex}
          onPageSelected={handleAccountSwitch}
        >
          {accounts.map((account) => (
            <BalanceCard
              key={account.accountId}
              account={{
                id: account.accountId,
                name: account.name,
                type: "bank",
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
        <FinancialSummaryCard
          income={getTotalIncome(dateFilteredMovements)}
          expense={getTotalExpense(dateFilteredMovements)}
          isTransitioning={isPeriodTransitioning}
        />
        <ViewModePicker
          selectedMode={viewMode}
          onModeChange={setViewMode}
          pendingCount={pendingCount}
        />
        {viewMode === "recurring" && <RecurringMovementsCard />}
        {viewMode === "recent" && (
          <MovementsCard
            movements={filteredMovements}
            isTransitioning={isPeriodTransitioning}
          />
        )}
        {viewMode === "next" && (
          <PendingRecurrencesCard
            pendingRecurrences={futurePendingRecurrences}
          />
        )}
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
