import Home from "@/app/dashboard/home";
import BalanceCard from "@/components/cards/balance-card";
import MovementsCard from "@/components/cards/movements-card";
import ScreenView from "@/layout/screen-view";
import { View } from "react-native";

const HomeView: React.FC = () => {
  return (
    <View>
      <BalanceCard />
      <MovementsCard />
    </View>
  );
}

export default HomeView;