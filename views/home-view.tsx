import BalanceCard from "@/components/cards/balance-card";
import MovementsCard from "@/components/cards/movements-card";
import FinancialSummaryCard from "@/components/cards/financial-summary-card";
import PeriodPicker from "@/components/ui/period-chips-picker";
import { View, StyleSheet, ScrollView } from "react-native";
import React, { useState } from "react";
import Pager from "@/components/ui/pager";
import { useAccountSelection, useMovements } from "@/state";

const HomeView: React.FC = () => {
  const { selectedAccount, allAccounts, switchToAccount } = useAccountSelection();
  const { getTotalIncome, getTotalExpense } = useMovements();
  const [movementFilter, setMovementFilter] = useState<
    "all" | "income" | "expense"
  >("all");

  return (
    <View>
      <Pager
        selectedPage={allAccounts.findIndex((a) => {
          return a.name === selectedAccount;
        })}
        onPageSelected={(index) => switchToAccount(allAccounts[index]?.name)}
      >
        {allAccounts.map((account) => (
          <BalanceCard key={account.name} account={account} />
        ))}
      </Pager>

      <ScrollView
        contentContainerStyle={styles.scrollContainer}
        showsVerticalScrollIndicator={false}
      >
        <PeriodPicker></PeriodPicker>
        <FinancialSummaryCard
          income={getTotalIncome()}
          expense={getTotalExpense()}
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
