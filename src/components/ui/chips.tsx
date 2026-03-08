import { View, StyleSheet } from "react-native";
import GlassButton from "./glass-button.native";
import React from "react";

const CHIPS = ["All", "Income", "Expenses", "Transfers"];

const Chips: React.FC = () => {
  return (
    <View style={styles.wrapper}>
      {CHIPS.map((chip) => (
        <GlassButton text={chip} key={chip} onPress={() => {}} />
      ))}
    </View>
  );
};

const styles = StyleSheet.create({
  wrapper: {
    display: "flex",
    flexDirection: "row",
    justifyContent: "space-between",
  },
  chip: {},
});

export default Chips;
