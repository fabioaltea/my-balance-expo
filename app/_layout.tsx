import {
  DarkTheme,
  DefaultTheme,
  ThemeProvider,
} from "@react-navigation/native";
import { Stack } from "expo-router";
import { StatusBar } from "expo-status-bar";
import "react-native-reanimated";

import { useColorScheme } from "@/hooks/use-color-scheme";
import { View, Text, StyleSheet } from "react-native";
import { SafeAreaProvider, SafeAreaView } from "react-native-safe-area-context";
import { AppStateProvider } from "@/state";

export const unstable_settings = {
  anchor: "dashboard",
};

export default function RootLayout() {
  const colorScheme = useColorScheme();

  const dashboardHeader = () => (
    <SafeAreaView>
      <View style={{ padding: 16, height: 566, justifyContent: "center" }}>
        <Text>Account</Text>
      </View>
    </SafeAreaView>
  );

  const styles = StyleSheet.create({
    container: {
      flex: 1,
      alignItems: "center",
      justifyContent: "center",
      padding: 20,
    },
    link: {
      marginTop: 15,
      paddingVertical: 15,
    },
  });

  return (
    <ThemeProvider value={colorScheme === "dark" ? DarkTheme : DefaultTheme}>
      <SafeAreaProvider>
        <AppStateProvider>
          <Stack>
            <Stack.Screen
              name="dashboard"
              options={{ headerShown: false, header: dashboardHeader }}
            />
            <Stack.Screen
              name="add"
              options={{
                presentation: "card",
                title: "Add",
                headerShown: false,
              }}
            />

            <Stack.Screen
              name="modal"
              options={{ presentation: "modal", title: "Modal" }}
            />
          </Stack>
        </AppStateProvider>
        <StatusBar style="auto" />
      </SafeAreaProvider>
    </ThemeProvider>
  );
}
