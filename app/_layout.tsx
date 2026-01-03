import React from "react";
import {
  DarkTheme,
  DefaultTheme,
  ThemeProvider,
} from "@react-navigation/native";
import { Stack } from "expo-router";
import { StatusBar } from "expo-status-bar";
import "react-native-reanimated";

import { useColorScheme } from "@/hooks/use-color-scheme";
import { View, Text, StyleSheet, ActivityIndicator } from "react-native";
import { SafeAreaProvider, SafeAreaView } from "react-native-safe-area-context";
import { AppStateProvider } from "@/state";
import { AuthProvider, useAuthContext } from "@/state/AuthProvider";
import LoginScreen from "@/components/LoginScreen";

export const unstable_settings = {
  anchor: "dashboard",
};

// Main app content that requires authentication
const AuthenticatedApp: React.FC = () => {
  const colorScheme = useColorScheme();

  const dashboardHeader = () => (
    <SafeAreaView>
      <View style={{ padding: 16, height: 566, justifyContent: "center" }}>
        <Text>Account</Text>
      </View>
    </SafeAreaView>
  );

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
};

// App router component that handles authentication state
const AppRouter: React.FC = () => {
  const { isAuthenticated, isLoading, user, error } = useAuthContext();

  console.log("🔍 AppRouter state:", {
    isAuthenticated,
    isLoading,
    hasUser: !!user,
    error
  });
 
  if (isLoading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#667eea" />
        <Text style={styles.loadingText}>Loading...</Text>
      </View>
    );
  }

  if (!isAuthenticated) {
    console.log("📱 Showing LoginScreen");
    return <LoginScreen />;
  }

  console.log("✅ Showing AuthenticatedApp");
  return <AuthenticatedApp />;
};

const styles = StyleSheet.create({
  loadingContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: "#f5f5f5",
  },
  loadingText: {
    marginTop: 16,
    fontSize: 16,
    color: "#666",
  },
});

// Root layout with authentication provider
export default function RootLayout() {
  return (
    <AuthProvider>
      <AppRouter />
    </AuthProvider>
  );
}
