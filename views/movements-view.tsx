import Home from "@/app/dashboard/home";
import BalanceCard from "@/components/cards/balance-card";
import MovementsCard from "@/components/cards/movements-card";
import PeriodPicker from "@/components/ui/period-chips-picker";
import ScreenView from "@/layout/screen-view";
import { View, Text, ScrollView } from "react-native";

const HomeView: React.FC = () => {
  return (
    <View>
      <ScrollView>
        <PeriodPicker></PeriodPicker>
        <MovementsCard />
        {/* Aggiungo spacer per consentire visualizzazione completa */}
        <View style={{ height: 75 }}></View>
      </ScrollView>
    </View>
  );
};

export default HomeView;

