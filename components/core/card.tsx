import { useThemeColor } from "@/hooks/use-theme-color";
import { StyleSheet, View, Text, Platform } from "react-native";
import React from "react";

interface ICardProps {
  backgroundColor?: string;
  color?: string;
  label?: string;
  children: React.ReactNode;
  style?: import("react-native").ViewStyle;
}

const Card: React.FC<ICardProps> = ({
  backgroundColor,
  color,
  label,
  children,
  style,
}) => {
  const themeBackground = useThemeColor({}, "cardBackground");
  const themeColor = useThemeColor({}, "cardColor");
  const styles = StyleSheet.create({
    //Card
    card: {
      backgroundColor: backgroundColor ?? themeBackground,
      color: color ?? themeColor,
      borderRadius: 30,
      paddingHorizontal: 24,
      paddingVertical: 15,
      flexShrink: 1,
      ...(Platform.OS === "web"
        ? {
            boxShadow:
              "0 2px 8px rgba(0, 0, 0, 0.08), 0 4px 16px rgba(0, 0, 0, 0.06)",
          }
        : {
          minHeight:100,
            shadowColor: "#000",
            shadowOffset: { width: 0, height: 2 },
            shadowOpacity: 0.08,
            shadowRadius: 8,
            elevation: 4,
          }),
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
    <View style={style}>
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
