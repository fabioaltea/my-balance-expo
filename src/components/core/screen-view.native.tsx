import { SafeAreaView } from "react-native-safe-area-context";
import { StyleSheet } from "react-native";
import { useThemeColor } from "@/src/hooks/use-theme-color";
import React from "react";
const ScreenView: React.FC<React.PropsWithChildren<{}>> = ({ children }) => {
  const background = useThemeColor({}, "menuBackground");
  return (
    <SafeAreaView
      style={[styles.container, { backgroundColor: background }]}
      edges={["top", "left", "right"]}
    >
      {children}
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    // backgroundColor is provided via theme at runtime
  },
});

export default ScreenView;
