import { ThemedText } from "../themed-text";
import { TouchableOpacity, StyleSheet, View } from "react-native";
import { IconSymbol } from "../ui/icon-symbol.ios";
import { useState } from "react";
import Card from "../card";
import GlassButton from "../ui/glass-button";

const styles = StyleSheet.create({
  balanceHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 8,
  },
  balanceLabel: {
    color: "#FFFFFF",
    fontSize: 14,
    fontWeight: "500",
    opacity: 0.8,
  },
  balanceContent: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    flex: 1,
    paddingVertical:10,
    flexGrow:1
  },
  balanceAmount: {
    color: "#FFFFFF",
    fontSize: 36,
    paddingVertical:20,
    fontWeight: "bold",
    flex: 1,
    marginRight: 16,
  },
});

const BalanceCard: React.FC = () => {
  const [isBalanceVisible, setIsBalanceVisible] = useState(true);

  return (
    <Card backgroundColor="#2F4F3F" color="#FFFFFF">
      <View style={styles.balanceContent}>
        <ThemedText style={styles.balanceAmount}>
          {isBalanceVisible ? "€ 27024,27" : "€ ****,**"}
        </ThemedText>
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

export default BalanceCard;
