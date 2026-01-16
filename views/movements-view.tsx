import BalanceCard from "@/components/cards/balance-card";
import MovementsCard from "@/components/cards/movements-card";
import PeriodPicker from "@/components/ui/period-chips-picker";
import ScreenView from "@/layout/screen-view";
import { View, Text, ScrollView, StyleSheet } from "react-native";
import { useState, useEffect } from "react";
import { DATE_RANGES, type IDateRange } from "@/state";
import { useDataContext } from "@/state/DataProvider";

const HomeView: React.FC = () => {
  const [dateRange, setDateRange] = useState<IDateRange>(DATE_RANGES.THIS_MONTH);
  const [isPeriodTransitioning, setIsPeriodTransitioning] = useState<boolean>(false);
  const { isLoading } = useDataContext();

  // Handle date range change with transitioning state
  const handleDateRangeChange = (range: IDateRange & { isTransitioning?: boolean }) => {
    setDateRange(range);
    if (range.isTransitioning) {
      setIsPeriodTransitioning(true);
    }
  };

  // Reset transitioning state when data finishes loading
  useEffect(() => {
    if (!isLoading && isPeriodTransitioning) {
      setIsPeriodTransitioning(false);
    }
  }, [isLoading, isPeriodTransitioning]);

  return (
    <View>
      <ScrollView contentContainerStyle={styles.scrollContainer}>
        <PeriodPicker 
          setDateRange={handleDateRangeChange}
          isLoading={isLoading}
        />
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

