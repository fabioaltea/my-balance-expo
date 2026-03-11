import React from "react";
import { View, StyleSheet } from "react-native";
import { useThemeColor } from "@/src/hooks/use-theme-color";

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

  const validChildren = Array.isArray(children)
    ? children.filter(Boolean)
    : children
      ? [children]
      : [];

  return (
    <View style={{ overflow: "visible" }}>
      {validChildren.map((child, index) => (
        <View
          key={index}
          style={[
            dynamicStyles.item,
            index === validChildren.length - 1 && dynamicStyles.lastItem,
            { overflow: "visible" },
          ]}
        >
          {child}
        </View>
      ))}
    </View>
  );
};

export default List;
