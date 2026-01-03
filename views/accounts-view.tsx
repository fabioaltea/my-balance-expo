import { View, StyleSheet } from "react-native";
import ScreenView from "@/layout/screen-view";
import AccountsList from "@/components/cards/accounts-list";
import { useAccountSelection } from "@/state";

const AccountsView: React.FC = () => {
  const { allAccounts } = useAccountSelection();

  // Convert Account to IAccount for compatibility
  const adaptedAccounts = allAccounts.map((account) => ({
    id: account.id,
    name: account.name,
    balance: account.balance,
    color: account.color || "#2F4F3F",
    textColor: account.textColor || "#FFFFFF",
    transactions: account.transactions || 0,
  }));

  return (
    <ScreenView>
      <AccountsList accounts={adaptedAccounts} showTotal={true} />
    </ScreenView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
});

export default AccountsView;
