import { useThemeColor } from "@/hooks/use-theme-color";
import { useTheme } from "@react-navigation/native";
import { use } from "react";
import { StyleSheet, View, Text } from "react-native";
import List from "./list";
import React from "react";

interface ICardProps {
  backgroundColor?: string;
  color?: string;
  label?: string;
  children: React.ReactNode;
}

const InputGroup: React.FC<ICardProps> = ({
  backgroundColor,
  color,
  label,
  children,
}) => {
  const themeBackground = useThemeColor({}, "cardBackground");
  const themeColor= useThemeColor({}, "cardColor");
  const styles = StyleSheet.create({
    //Card
    card: {
      backgroundColor: backgroundColor ?? themeBackground,
      color: color ?? themeColor,
      borderRadius: 30,
      marginBottom: 20,
      flexGrow:2,
      paddingHorizontal:5,
      paddingVertical:5,
    },

    cardLabel: {
      fontSize: 18,
      fontWeight: "600",
      color: "#848484ff",
      marginBottom: 10,
      marginLeft: 10,
    },
  });

  return (
    <View>
      {label && (
        <View>
          <Text style={styles.cardLabel}>{label}</Text>
        </View>
      )}
      <View style={styles.card}>
                    <List>
{children}</List>
      </View>
    </View>
  );
};

export default InputGroup;
