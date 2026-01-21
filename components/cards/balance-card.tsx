import React, { useState } from "react";
import { TouchableOpacity, StyleSheet, View, Text } from "react-native";
import { IconSymbol } from "../ui/icon-symbol";
import Card from "../card";
import Skeleton from "../ui/skeleton";
import { Account } from "../../state/AppState.types";
import { useDataContext } from "../../state/DataProvider";

interface IBalanceCardProps {
  account?: Account;
}

const BalanceCard: React.FC<IBalanceCardProps> = ({ account }) => {
  const { isLoading } = useDataContext();
  const [isBalanceVisible, setIsBalanceVisible] = useState(true);

  // Show skeleton only if loading AND no account data yet
  const showSkeleton = isLoading && !account;

  const renderBalanceContent = () => {
    if (showSkeleton) {
      return (
        <Skeleton
          width={180}
          height={36}
          borderRadius={8}
          style={{ backgroundColor: "rgba(255, 255, 255, 0.3)" }}
        />
      );
    }

    return (
      <Text style={styles.balanceAmount}>
        {isBalanceVisible
          ? `€ ${account?.balance.toFixed(2).replace(".", ",") ?? ""}`
          : "€ ****,**"}
      </Text>
    );
  };

  return (
    <Card
      backgroundColor={account?.color || "#2F4F3F"}
      color={account?.textColor || "#FFFFFF"}
    >
      <View style={styles.balanceContent}>
        {renderBalanceContent()}
        <TouchableOpacity
          onPress={() => setIsBalanceVisible(!isBalanceVisible)}
          disabled={showSkeleton}
        >
          <IconSymbol
            name={isBalanceVisible ? "eye" : "eye-off"}
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
