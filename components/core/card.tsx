import { useThemeColor } from "@/hooks/use-theme-color";
import { useTheme } from "@react-navigation/native";
import { use } from "react";
import { StyleSheet, View, Text } from "react-native";
import React from "react";

interface ICardProps {
  backgroundColor?: string;
  color?: string;
  label?: string;
  children: React.ReactNode;
}

const Card: React.FC<ICardProps> = ({
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
      paddingHorizontal: 24,
      paddingVertical: 15,
      marginBottom: 20,
      flexGrow:2,
      minHeight:100,
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
      <View style={styles.card}>{children}</View>
    </View>
  );
};

export default Card;
