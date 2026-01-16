import BalanceCard from "@/components/cards/balance-card";
import MovementsCard from "@/components/cards/movements-card";
import RecurringMovementsCard from "@/components/cards/recurring-movements-card";
import PeriodPicker from "@/components/ui/period-chips-picker";
import ViewModePicker, { ViewMode } from "@/components/ui/view-mode-picker";
import ScreenView from "@/layout/screen-view";
import { View, Text, ScrollView, StyleSheet } from "react-native";
import { useState, useEffect, useMemo } from "react";
import { DATE_RANGES, type IDateRange } from "@/state";
import { useDataContext } from "@/state/DataProvider";
import { isDateInRange } from "@/utils/dateUtils";
import React from "react";

const HomeView: React.FC = () => {
  const [dateRange, setDateRange] = useState<IDateRange>(
    DATE_RANGES.THIS_MONTH
  );
  const [viewMode, setViewMode] = useState<ViewMode>("recent");
  const [isPeriodTransitioning, setIsPeriodTransitioning] =
    useState<boolean>(false);
  const { isLoading, movements } = useDataContext();

  // Handle date range change with transitioning state
  const handleDateRangeChange = (
    range: IDateRange & { isTransitioning?: boolean }
  ) => {
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

  // Filter movements based on date range (only for recent view)
  const filteredMovements = useMemo(() => {
    if (viewMode !== "recent") return [];

    return movements.filter((m) => {
      return isDateInRange(m.date, dateRange.startDate, dateRange.endDate);
    });
  }, [movements, dateRange, viewMode]);

  return (
    <View>
      <ScrollView contentContainerStyle={styles.scrollContainer}>
        <ViewModePicker selectedMode={viewMode} onModeChange={setViewMode} />

        {viewMode === "recent" && (
          <>
            <PeriodPicker
              setDateRange={handleDateRangeChange}
              isLoading={isLoading}
            />
            <MovementsCard
              movements={filteredMovements}
              isTransitioning={isPeriodTransitioning}
            />
          </>
        )}

        {viewMode === "recurring" && <RecurringMovementsCard />}
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
