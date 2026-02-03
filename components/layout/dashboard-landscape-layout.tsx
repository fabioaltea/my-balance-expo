import React, { useMemo, useState } from "react";
import { View, StyleSheet } from "react-native";
import { useThemeColor } from "@/hooks/use-theme-color";
import { useDataContext } from "@/state";
import type { Account } from "@/state";

// Layout components
import { LayoutContainer } from "@/components/layout/layout-container";
import { LayoutRow } from "@/components/layout/layout-row";
import { LayoutColumn } from "@/components/layout/layout-column";
import { LandscapeCommandBar } from "@/components/layout/landscape-command-bar";

// UI components
import GlassButton from "@/components/ui/glass-button";
import CompactAccountPicker from "@/components/ui/compact-account-picker";
import CompactPeriodPicker from "@/components/ui/compact-period-picker";
import SideDrawer from "@/components/ui/side-drawer";

// Card components
import BalanceCard from "@/components/cards/balance-card";
import FinancialSummaryCard from "@/components/cards/financial-summary-card";
import MovementsCard from "@/components/cards/movements-card";
import PendingRecurrencesCard from "@/components/cards/pending-recurrences-card";
import UnconfirmedMovementsCard from "@/components/cards/unconfirmed-movements-card";
import ForecastCard from "@/components/cards/forecast-card";
import PeriodPicker from "../ui/period-chips-picker";
import ChipButton from "../ui/chip-button";

/**
 * Dashboard Landscape Layout
 * Layout completo per la modalità landscape con tutte le card disposte in griglia flessibile
 */
export function DashboardLandscapeLayout() {
  const backgroundColor = useThemeColor({}, "background");

  // Get data from centralized context
  const {
    accounts,
    movements,
    pendingRecurrences,
    getTotalIncome,
    getTotalExpense,
    calculateForecast,
    isLoading,
  } = useDataContext();

  const availableAccounts = useMemo(() => {
    const totalBalance = accounts.reduce((sum, acc) => sum + acc.balance, 0);
    const sortedAccounts = [...accounts].sort((a, b) => b.balance - a.balance);
    return [
      {
        accountId: "all",
        name: "All",
        balance: totalBalance,
        color: "#2F4F3F",
        textColor: "#FFFFFF",
      },
      ...sortedAccounts,
    ];
  }, [accounts]);

  const [selectedAccount, setSelectedAccount] = useState<string>("All");
  const [isDrawerOpen, setIsDrawerOpen] = useState<boolean>(false);

  // Date range state for period filtering
  const [dateRange, setDateRange] = useState(() => {
    const now = new Date();
    const startDate = `01-${String(now.getMonth() + 1).padStart(2, "0")}-${now.getFullYear()}`;
    const lastDay = new Date(
      now.getFullYear(),
      now.getMonth() + 1,
      0,
    ).getDate();
    const endDate = `${lastDay}-${String(now.getMonth() + 1).padStart(2, "0")}-${now.getFullYear()}`;
    return { startDate, endDate, label: "" };
  });

  const handleAddPress = () => {
    setIsDrawerOpen(true);
  };

  // Helper to check if a date is within the range
  const isDateInRange = (
    dateStr: string,
    start: string,
    end: string,
  ): boolean => {
    const parseDate = (str: string) => {
      const [day, month, year] = str.split("-").map(Number);
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
    if (selectedAccount !== "All") {
      filtered = filtered.filter((m) =>
        m.transactions.some((t) => t.account === selectedAccount),
      );
    }

    return filtered;
  }, [movements, selectedAccount, dateRange]);

  // Get the selected account object
  const currentAccount: Account | undefined = useMemo(() => {
    if (selectedAccount === "All") {
      return availableAccounts[0];
    }
    return availableAccounts.find((a) => a.name === selectedAccount);
  }, [availableAccounts, selectedAccount]);

  // Calculate forecast for selected date range
  const forecast = useMemo(() => {
    return calculateForecast(dateRange.startDate, dateRange.endDate);
  }, [calculateForecast, dateRange]);

  return (
    <View style={[styles.container, { backgroundColor }]}>
      {/* Command bar */}
      <LandscapeCommandBar
        accountSelector={
          <CompactAccountPicker
            accounts={availableAccounts}
            selectedAccount={selectedAccount}
            setSelectedAccount={setSelectedAccount}
          />
        }
        periodSelector={
          <PeriodPicker setDateRange={setDateRange} isLoading={isLoading} />
        }
        rightContent={<ChipButton text="+" onPress={handleAddPress} />}
      />

      {/* Main dashboard grid */}
      <LayoutContainer padding={12} gap={12}>
        {/* Row 1: Balance cards and Financial Summary */}
        <LayoutRow gap={12}>
          {/* Left column: Multiple balance cards */}
          <LayoutColumn flex={1} gap={12}>
            <BalanceCard account={currentAccount} />
            <FinancialSummaryCard
              income={getTotalIncome(filteredMovements, selectedAccount)}
              expense={getTotalExpense(filteredMovements, selectedAccount)}
            />
          </LayoutColumn>

          {/* Right column: Forecast card */}
          <LayoutColumn flex={1}>
            <ForecastCard forecast={forecast} />
          </LayoutColumn>
        </LayoutRow>

        {/* Row 2: Movements and Action cards */}
        <LayoutRow flex={1} gap={12}>
          {/* Left column: Recent movements (2x width) */}
          <LayoutColumn flex={1}>
            <MovementsCard movements={filteredMovements.slice(0, 10)} />
          </LayoutColumn>

          {/* Right column: Pending and Unconfirmed */}
          <LayoutColumn flex={1} gap={12}>
            <PendingRecurrencesCard pendingRecurrences={pendingRecurrences} />
            <UnconfirmedMovementsCard />
          </LayoutColumn>
        </LayoutRow>
      </LayoutContainer>

      {/* Side Drawer */}
      <SideDrawer
        isOpen={isDrawerOpen}
        onClose={() => setIsDrawerOpen(false)}
        width="40%"
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    flexDirection: "column",
    overflow: "visible",
  },
});

export default DashboardLandscapeLayout;
