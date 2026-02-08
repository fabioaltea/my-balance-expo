import { StyleSheet, View } from "react-native";
import { router } from "expo-router";
import ScreenView from "@/layout/screen-view";
import HomeView from "@/views/home-view";
import React, { useMemo, useState } from "react";
import GlassButton from "@/components/ui/glass-button";
import AccountPicker from "@/components/ui/account-picker";
import { useDataContext } from "@/state";

export default function Home() {
  const handleButtonPress = () => {
    router.push("/add");
  };

  // Get data from centralized context
  const {
    accounts,
    movements,
    pendingRecurrences,
    unconfirmedMovements,
    isLoading,
    getTotalIncome,
    getTotalExpense,
    calculateForecast,
  } = useDataContext();

  const availableAccounts = useMemo(() => {
    const totalBalance = accounts.reduce((sum, acc) => sum + acc.balance, 0);
    const sortedAccounts = [...accounts].sort((a, b) => b.balance - a.balance);
    return [
      {
        accountId: "all",
        name: "All",
        balance: totalBalance,
        color: "#2F4F3F",
        textColor: "#FFFFFF",
      },
      ...sortedAccounts,
    ];
  }, [accounts]);

  const [selectedAccount, setSelectedAccount] = useState<string>("All");

  return (
    <ScreenView>
      <View style={styles.header}>
        <AccountPicker
          accounts={availableAccounts}
          selectedAccount={selectedAccount}
          setSelectedAccount={setSelectedAccount}
        ></AccountPicker>
        <GlassButton onPress={handleButtonPress}></GlassButton>
      </View>
      <HomeView
        accounts={availableAccounts}
        selectedAccount={selectedAccount}
        setSelectedAccount={setSelectedAccount}
        movements={movements}
        pendingRecurrences={pendingRecurrences}
        unconfirmedCount={unconfirmedMovements?.length || 0}
        isLoading={isLoading}
        getTotalIncome={getTotalIncome}
        getTotalExpense={getTotalExpense}
        calculateForecast={calculateForecast}
      />
    </ScreenView>
  );
}

const styles = StyleSheet.create({
  header: {
    paddingHorizontal: 16,
    marginBottom: 20,
    display: "flex",
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
});
