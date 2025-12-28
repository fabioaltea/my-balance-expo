import Home from "@/app/dashboard/home";
import BalanceCard from "@/components/cards/balance-card";
import MovementsCard from "@/components/cards/movements-card";
import FinancialSummaryCard from "@/components/cards/financial-summary-card";
import ChipButton from "@/components/ui/chip-button";
import PeriodPicker from "@/components/ui/period-chips-picker";
import ScreenView from "@/layout/screen-view";
import { View, StyleSheet, ScrollView } from "react-native";
import { useState } from "react";
import { ThemedText } from "@/components/themed-text";

const HomeView: React.FC = () => {
  const [movementFilter, setMovementFilter] = useState<
    "all" | "income" | "expense"
  >("all");

  return (
    <View>
        
      <BalanceCard />
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
  chipsWrapper: {
    display: "flex",
    flexDirection: "row",
    justifyContent: "space-between",
    gap: 10,
    marginBottom: 20,
  },
  scrollContainer: {
    paddingBottom: 100,
    flexGrow: 1,
  },
});
