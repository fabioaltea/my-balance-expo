import Home from "@/app/dashboard/home";
import BalanceCard from "@/components/cards/balance-card";
import MovementsCard from "@/components/cards/movements-card";
import PeriodPicker from "@/components/ui/period-chips-picker";
import ScreenView from "@/layout/screen-view";
import { View, Text, ScrollView, StyleSheet } from "react-native";

const HomeView: React.FC = () => {
  return (
    <View>
      <ScrollView contentContainerStyle={styles.scrollContainer}>
        <PeriodPicker></PeriodPicker>
        <MovementsCard />
        {/* Aggiungo spacer per consentire visualizzazione completa */}
      </ScrollView>
    </View>
  );
};

const styles = StyleSheet.create({
  scrollContainer: {
    paddingHorizontal: 16,
    paddingBottom: 100,
    flexGrow: 1,
  },
});

export default HomeView;

