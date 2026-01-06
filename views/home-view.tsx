import BalanceCard from "@/components/cards/balance-card";
import MovementsCard from "@/components/cards/movements-card";
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
import { useMyBalanceData, useAuthContext, DATE_RANGES } from "@/state";
import { isDateInRange } from "@/utils/dateUtils";
import type { Account, IDateRange } from "@/state";
import { BlurView } from "expo-blur";

interface HomeViewProps {
  accounts: Account[];
  selectedAccount: string;
  setSelectedAccount: (account: string) => void;
}

const HomeView: React.FC<HomeViewProps> = ({accounts, selectedAccount, setSelectedAccount}) => {
  // Get spreadsheetId from auth context
  const { selectedSpreadsheetId } = useAuthContext();

  // Load all data using new unified hook
  const {
    movements,
    isLoading,
    reloadData,
    getTotalIncome,
    getTotalExpense,
  } = useMyBalanceData(selectedSpreadsheetId);

  // Local state for filters
  const [dateRange, setDateRange] = useState<IDateRange>(DATE_RANGES.THIS_MONTH);
  const [movementFilter, setMovementFilter] = useState<"all" | "income" | "expense">("all");

  

  // Calculate current selected account index
  const selectedAccountIndex = accounts.findIndex((a) => a.name === selectedAccount);

  // Debug logging
  React.useEffect(() => {
    console.log("📊 HomeView Debug:");
    console.log("  - Accounts:", accounts.length);
    console.log("  - Available Accounts:", accounts.length);
    console.log("  - Movements:", movements.length);
    console.log("  - Selected Account:", selectedAccount);
    console.log("  - Selected Account Index:", selectedAccountIndex);
  }, [accounts, movements, selectedAccount, selectedAccountIndex, accounts]);

  // Filter movements based on date range and movement type
  // Note: Account filtering happens at transaction level, not movement level
  // since a movement can contain transactions from multiple accounts
  const filteredMovements = useMemo(() => {
    return movements
      .filter((m) => {
        const dateMatches = isDateInRange(m.date, dateRange.startDate, dateRange.endDate);
        const typeMatches = movementFilter === "all" || m.type === movementFilter;

        // If a specific account is selected, only show movements that have at least one transaction for that account
        const accountMatches = selectedAccount === "All" ||
          m.transactions.some(t => t.account === selectedAccount);

        return dateMatches && typeMatches && accountMatches;
      });
  }, [movements, selectedAccount, dateRange, movementFilter]);

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
            dateRange={dateRange}
            setDateRange={setDateRange}
            movementFilter={movementFilter}
            setMovementFilter={setMovementFilter}
          />
          <FinancialSummaryCard
            income={getTotalIncome(filteredMovements)}
            expense={getTotalExpense(filteredMovements)}
          />
          <MovementsCard movements={filteredMovements} />
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
  }
});
