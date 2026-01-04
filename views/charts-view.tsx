import AccountsList from "@/components/cards/accounts-list";
import ScreenView from "@/layout/screen-view";
import { View, StyleSheet } from "react-native";
import React from "react";

const ChartsView: React.FC = () => {
  return (
    <ScreenView>
      {/* <AccountsList showTotal={true} /> */}
    </ScreenView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
});

export default ChartsView;
