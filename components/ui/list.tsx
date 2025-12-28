import React from "react";
import { View, StyleSheet } from "react-native";
import { useThemeColor } from "@/hooks/use-theme-color";

interface IListProps {
  children: React.ReactNode;
}

const List: React.FC<IListProps> = ({ children }) => {
  // Theme colors
  const borderBottomColor = useThemeColor(
    { light: "#e0e0e0", dark: "#333" },
    "tabIconDefault"
  );

  const dynamicStyles = StyleSheet.create({
    item: {
      borderBottomWidth: 1,
      borderBottomColor: borderBottomColor,
      paddingVertical: 6,
      paddingHorizontal: 12,
    },
    lastItem: {
      borderBottomWidth: 0,
    },
  });

  return (
    <View>
      {children &&
        Array.isArray(children) ?
        children.map((child, index) => (
          <View
            key={index}
            style={[
              dynamicStyles.item,
              index == children.length - 1 && dynamicStyles.lastItem,
            ]}
          >
            {child}
          </View>
        )): <View style={[dynamicStyles.item, dynamicStyles.lastItem]}>{children}</View>
      }
    </View>
  );
};

export default List;
