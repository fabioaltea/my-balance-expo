import { View, StyleSheet } from "react-native";
import ScreenView from "@/layout/screen-view";
import AccountsList from "@/components/cards/accounts-list";
import { MOCK_ACCOUNTS } from "@/models/Account";

const AccountsView: React.FC = () => {
  return (
    <ScreenView>
      <AccountsList 
        accounts={MOCK_ACCOUNTS} 
        showTotal={true}
      />
    </ScreenView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
});

export default AccountsView;