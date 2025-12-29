import Home from "@/app/dashboard/home";
import BalanceCard from "@/components/cards/balance-card";
import MovementsCard from "@/components/cards/movements-card";
import FinancialSummaryCard from "@/components/cards/financial-summary-card";
import ChipButton from "@/components/ui/chip-button";
import PeriodPicker from "@/components/ui/period-chips-picker";
import ScreenView from "@/layout/screen-view";
import { View, StyleSheet, ScrollView } from "react-native";
import React, { useState } from "react";
import { ThemedText } from "@/components/themed-text";
import Pager from "@/components/ui/pager";
import { IAccount } from "@/models/Account";

const HomeView: React.FC<{
  accounts: IAccount[];
  selectedAccount: string;
  setSelectedAccount: (account: string) => void;
}> = ({ accounts, selectedAccount, setSelectedAccount }) => {
  const [movementFilter, setMovementFilter] = useState<
    "all" | "income" | "expense"
  >("all");

  return (
    <View>
      <Pager
        selectedPage={accounts.findIndex((a) => {
          return a.name === selectedAccount;
        })}
        onPageSelected={(index) => setSelectedAccount(accounts[index]?.name)}
      >
        {accounts.map((account) => (
          <BalanceCard key={account.name} account={account} />
        ))}
      </Pager>

      <ScrollView
        contentContainerStyle={styles.scrollContainer}
        showsVerticalScrollIndicator={false}
      >
        <PeriodPicker></PeriodPicker>
        <FinancialSummaryCard
          income={4084.41}
          expense={1369.57}
          selectedFilter={movementFilter}
          onFilterChange={setMovementFilter}
        />
        <MovementsCard />
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
    paddingBottom: 100, // Match movements-view padding
    flexGrow: 1, // Allow content to grow and scroll properly
  },
});
