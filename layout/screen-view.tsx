import { SafeAreaView } from "react-native-safe-area-context";
import { StyleSheet } from "react-native";
import { useThemeColor } from "@/hooks/use-theme-color";

const ScreenView: React.FC<React.PropsWithChildren<{}>> = ({ children }) => {
  const background = useThemeColor({}, "menuBackground");
  return (
    <SafeAreaView style={[styles.container, { backgroundColor: background }]}>
      {children}
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    paddingHorizontal: 16,
    // backgroundColor is provided via theme at runtime
  },
});

export default ScreenView;
