import React, { useState } from "react";
import { ThemedText } from "../themed-text";
import { TouchableOpacity, StyleSheet, View, Text } from "react-native";
import { IconSymbol } from "../ui/icon-symbol.ios";
import Card from "../card";
import GlassButton from "../ui/glass-button";
import { Account } from "../../state/AppState.types";

interface IBalanceCardProps {
  account?: Account;
}

const BalanceCard: React.FC<IBalanceCardProps> = ({ account }) => {
  const [isBalanceVisible, setIsBalanceVisible] = useState(true);

  return (
    <Card
      backgroundColor={account?.color || "#2F4F3F"}
      color={account?.textColor || "#FFFFFF"}
    >
      <View style={styles.balanceContent}>
        <Text style={styles.balanceAmount}>
          {isBalanceVisible ? `€ ${account?.balance ?? ""}` : "€ ****,**"}
        </Text>
        <TouchableOpacity
          onPress={() => setIsBalanceVisible(!isBalanceVisible)}
        >
          <IconSymbol
            name={isBalanceVisible ? "eye.fill" : "eye.slash.fill"}
            size={24}
            color="#FFFFFF"
          />
        </TouchableOpacity>
      </View>
    </Card>
  );
};

const styles = StyleSheet.create({
  balanceContent: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    flex: 1,
  },
  balanceAmount: {
    color: "#FFFFFF",
    fontSize: 36,
    fontWeight: "bold",
    flex: 1,
    flexShrink: 1,
    flexGrow: 1,
    minWidth: 0,
    marginRight: 16,
  },
});

export default BalanceCard;
