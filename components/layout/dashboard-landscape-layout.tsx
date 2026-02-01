import React, { useMemo, useState } from "react";
import { View, StyleSheet } from "react-native";
import { useRouter } from "expo-router";
import { useThemeColor } from "@/hooks/use-theme-color";
import { useDataContext } from "@/state";
import { useAuth } from "@/hooks/useAuth";

// Layout components
import { LayoutContainer } from "@/components/layout/layout-container";
import { LayoutRow } from "@/components/layout/layout-row";
import { LayoutColumn } from "@/components/layout/layout-column";
import { SimpleCommandBar } from "@/components/layout/simple-command-bar";

// UI components
import GlassButton from "@/components/ui/glass-button";
import AccountPicker from "@/components/ui/account-picker";

// Card components
import BalanceCard from "@/components/cards/balance-card";
import FinancialSummaryCard from "@/components/cards/financial-summary-card";
import MovementsCard from "@/components/cards/movements-card";
import PendingRecurrencesCard from "@/components/cards/pending-recurrences-card";
import UnconfirmedMovementsCard from "@/components/cards/unconfirmed-movements-card";
import ForecastCard from "@/components/cards/forecast-card";

/**
 * Dashboard Landscape Layout
 * Layout completo per la modalità landscape con tutte le card disposte in griglia flessibile
 */
export function DashboardLandscapeLayout() {
  const backgroundColor = useThemeColor({}, "background");
  const router = useRouter();
  const { user } = useAuth();

  // Get data from centralized context
  const {
    accounts,
    movements,
    categories,
    pendingRecurrences,
    unconfirmedMovements,
    isLoading,
    reloadData,
    getTotalIncome,
    getTotalExpense,
    calculateForecast,
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

  const handleAddPress = () => {
    router.push("/add");
  };

  // Filter movements by selected account (no filtering for 'All')
  const filteredMovements = useMemo(() => {
    if (selectedAccount === "All") {
      return movements;
    }
    // Filter movements that have at least one transaction for the selected account
    return movements.filter((m) =>
      m.transactions.some((t) => t.account === selectedAccount),
    );
  }, [movements, selectedAccount]);

  // Get the selected account object
  const currentAccount = useMemo(() => {
    if (selectedAccount === "All") {
      return availableAccounts[0];
    }
    return availableAccounts.find((a) => a.accountId === selectedAccount);
  }, [availableAccounts, selectedAccount]);

  // Calculate forecast for current month
  const forecast = useMemo(() => {
    const now = new Date();
    const startDate = `01-${String(now.getMonth() + 1).padStart(2, "0")}-${now.getFullYear()}`;
    const lastDay = new Date(
      now.getFullYear(),
      now.getMonth() + 1,
      0,
    ).getDate();
    const endDate = `${lastDay}-${String(now.getMonth() + 1).padStart(2, "0")}-${now.getFullYear()}`;
    return calculateForecast(startDate, endDate);
  }, [calculateForecast]);

  return (
    <View style={[styles.container, { backgroundColor }]}>
      {/* Command bar */}
      <SimpleCommandBar
        centerContent={
          <AccountPicker
            accounts={availableAccounts}
            selectedAccount={selectedAccount}
            setSelectedAccount={setSelectedAccount}
          />
        }
        rightContent={<GlassButton onPress={handleAddPress} />}
      />

      {/* Main dashboard grid */}
      <LayoutContainer padding={12} gap={12}>
        {/* Row 1: Balance cards and Financial Summary */}
        <LayoutRow flex={1} gap={12}>
          {/* Left column: Multiple balance cards */}
          <LayoutColumn flex={1} gap={12}>
            <BalanceCard account={currentAccount as any} />
            <FinancialSummaryCard
              income={getTotalIncome(filteredMovements)}
              expense={getTotalExpense(filteredMovements)}
            />
          </LayoutColumn>

          {/* Right column: Forecast card */}
          <LayoutColumn flex={1}>
            <ForecastCard forecast={forecast} />
          </LayoutColumn>
        </LayoutRow>

        {/* Row 2: Movements and Action cards */}
        <LayoutRow flex={2} gap={12}>
          {/* Left column: Recent movements (2x width) */}
          <LayoutColumn flex={2}>
            <MovementsCard movements={filteredMovements.slice(0, 10)} />
          </LayoutColumn>

          {/* Right column: Pending and Unconfirmed */}
          <LayoutColumn flex={1} gap={12}>
            <PendingRecurrencesCard pendingRecurrences={pendingRecurrences} />
            <UnconfirmedMovementsCard />
          </LayoutColumn>
        </LayoutRow>
      </LayoutContainer>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    flexDirection: "column",
  },
});

export default DashboardLandscapeLayout;
