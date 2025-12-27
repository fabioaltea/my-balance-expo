import Home from "@/app/dashboard/home";
import BalanceCard from "@/components/cards/balance-card";
import MovementsCard from "@/components/cards/movements-card";
import ChipButton from "@/components/ui/chip-button";
import PeriodPicker from "@/components/ui/period-chips-picker";
import ScreenView from "@/layout/screen-view";
import { View, StyleSheet } from "react-native";

const HomeView: React.FC = () => {
  return (
    <View>
      <BalanceCard />
      <PeriodPicker></PeriodPicker>
      <MovementsCard />
    </View>
  );
}

export default HomeView;

const styles = StyleSheet.create({
    chipsWrapper:{
        display:'flex',
        flexDirection:'row',
        justifyContent:"space-between",
        gap:10,
        marginBottom:20,
    }
});