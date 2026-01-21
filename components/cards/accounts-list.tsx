import { View, StyleSheet, ScrollView, Alert } from "react-native";
import { ThemedText } from "../themed-text";
import { useThemeColor } from "@/hooks/use-theme-color";
import { IconSymbol } from "../ui/icon-symbol";
import { IAccount } from "@/models/Account";
import AccountCard from "./account-card";
import { useState } from "react";
import React from "react";

interface IAccountsListProps {
  accounts: IAccount[];
  showTotal?: boolean;
}

const AccountsList: React.FC<IAccountsListProps> = ({
  accounts,
  showTotal = true,
}) => {
  const [selectedAccount, setSelectedAccount] = useState<IAccount | null>(null);

  const backgroundColor = useThemeColor(
    { light: "#f5f5f5", dark: "#1a1a1a" },
    "background"
  );
  const textColor = useThemeColor({ light: "#000", dark: "#fff" }, "text");

  const totalBalance = accounts.reduce(
    (sum, account) => sum + account.balance,
    0
  );
  const activeAccountsCount = accounts.filter(
    (account) => account.balance > 0
  ).length;

  const handleAccountPress = (account: IAccount) => {
    setSelectedAccount(account);
    Alert.alert(
      account.name,
      `Balance: €${account.balance.toFixed(2)}\\nTransactions: ${
        account.transactions || 0
      }`,
      [
        {
          text: "View Details",
          onPress: () =>
            console.log("Navigate to account details:", account.id),
        },
        { text: "Cancel", style: "cancel" },
      ]
    );
  };

  const formatTotalBalance = (amount: number) => {
    return `€ ${amount.toFixed(2).replace(".", ",")}`;
  };

  return (
    <View style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <View style={styles.headerContent}>
          <ThemedText style={styles.title}>My Accounts</ThemedText>
          <ThemedText style={styles.subtitle}>
            {activeAccountsCount} active • {accounts.length} total
          </ThemedText>
        </View>
        <IconSymbol name="plus-circle" size={28} color="#2F4F3F" />
      </View>

      {/* Total Balance Card */}
      {showTotal && (
        <View style={[styles.totalCard, { backgroundColor: "#2F4F3F" }]}>
          <View style={styles.totalHeader}>
            <IconSymbol
              name="chart-line"
              size={24}
              color="#fff"
            />
            <ThemedText style={styles.totalLabel}>Total Balance</ThemedText>
          </View>
          <ThemedText style={styles.totalAmount}>
            {formatTotalBalance(totalBalance)}
          </ThemedText>
          <View style={styles.totalStats}>
            <View style={styles.totalStat}>
              <ThemedText style={styles.totalStatLabel}>Assets</ThemedText>
              <ThemedText style={styles.totalStatValue}>
                {accounts.length}
              </ThemedText>
            </View>
            <View style={styles.totalStat}>
              <ThemedText style={styles.totalStatLabel}>Active</ThemedText>
              <ThemedText style={styles.totalStatValue}>
                {activeAccountsCount}
              </ThemedText>
            </View>
          </View>
        </View>
      )}

      {/* Accounts List */}
      <ScrollView
        showsVerticalScrollIndicator={false}
        style={styles.accountsList}
      >
        {accounts
          .sort((a, b) => b.balance - a.balance) // Sort by balance descending
          .map((account) => (
            <AccountCard
              key={account.id}
              account={account}
              onPress={handleAccountPress}
            />
          ))}

        {/* Spacer for bottom navigation */}
        <View style={styles.bottomSpacer} />
      </ScrollView>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    paddingHorizontal: 20,
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 24,
    paddingTop: 20,
  },
  headerContent: {
    flex: 1,
  },
  title: {
    fontSize: 28,
    fontWeight: "800",
    marginBottom: 4,
  },
  subtitle: {
    fontSize: 16,
    opacity: 0.7,
  },
  totalCard: {
    borderRadius: 20,
    padding: 24,
    marginBottom: 24,
  },
  totalHeader: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 12,
  },
  totalLabel: {
    fontSize: 16,
    fontWeight: "600",
    color: "#fff",
    marginLeft: 12,
  },
  totalAmount: {
    fontSize: 36,
    fontWeight: "900",
    color: "#fff",
    marginBottom: 20,
  },
  totalStats: {
    flexDirection: "row",
    gap: 32,
  },
  totalStat: {
    alignItems: "center",
  },
  totalStatLabel: {
    fontSize: 12,
    color: "#rgba(255,255,255,0.7)",
    marginBottom: 4,
  },
  totalStatValue: {
    fontSize: 18,
    fontWeight: "700",
    color: "#fff",
  },
  accountsList: {
    flex: 1,
  },
  bottomSpacer: {
    height: 100,
  },
});

export default AccountsList;
