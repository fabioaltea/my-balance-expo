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

const HomeView: React.FC<{accounts: IAccount[], selectedAccount: string, setSelectedAccount: (account: string) => void}> = ({accounts, selectedAccount, setSelectedAccount}) => {
  const [movementFilter, setMovementFilter] = useState<
    "all" | "income" | "expense"
  >("all");

  return (
    <View style={styles.container}>
      <Pager selectedPage={accounts.findIndex((a)=>{return a.name===selectedAccount})} onPageSelected={(index)=>setSelectedAccount(accounts[index]?.name)}>
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
        {/* Aggiungo spacer per consentire visualizzazione completa */}
        <View style={{ height: 150 }}></View>
      </ScrollView>
    </View>
  );
};

export default HomeView;

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  chipsWrapper: {
    display: "flex",
    flexDirection: "row",
    justifyContent: "space-between",
    gap: 10,
    marginBottom: 20,
  },
  scrollContainer: {
    paddingHorizontal:16,
    paddingBottom: 100,
    flexGrow: 1,
  },
});
