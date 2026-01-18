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
import { AuthProvider, useAuthContext } from "@/state/AuthProvider";
import { DataProvider } from "@/state/DataProvider";
import LoginScreen from "@/components/LoginScreen";

export const unstable_settings = {
  anchor: "dashboard",
};

// Main app content that requires authentication
const AuthenticatedApp: React.FC = () => {
  const { dashboardReady } = useAuthContext();
  const colorScheme = useColorScheme();

  console.log("🎨 AuthenticatedApp render - dashboardReady:", dashboardReady);

  // Show loading screen until dashboard is ready
  if (!dashboardReady) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#2F4F3F" />
        <Text style={styles.loadingText}>Loading dashboard...</Text>
      </View>
    );
  }

  return (
    <ThemeProvider value={colorScheme === "dark" ? DarkTheme : DefaultTheme}>
      <SafeAreaProvider>
        <Stack screenOptions={{ headerShown: false }}>
          <Stack.Screen
            name="index"
            options={{
              headerShown: false,
            }}
          />
          <Stack.Screen
            name="dashboard"
            options={{
              headerShown: false,
              gestureEnabled: false,
              headerBackVisible: false,
            }}
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
            name="accounts"
            options={{
              presentation: "card",
              title: "Accounts",
              headerShown: false,
            }}
          />
          <Stack.Screen
            name="categories"
            options={{
              presentation: "card",
              title: "Categories",
              headerShown: false,
            }}
          />
          <Stack.Screen
            name="modal"
            options={{ presentation: "modal", title: "Modal" }}
          />
        </Stack>
        <StatusBar style="auto" />
      </SafeAreaProvider>
    </ThemeProvider>
  );
};

// App router component that handles authentication state
const AppRouter: React.FC = () => {
  const { isAuthenticated, isLoading, user, error } = useAuthContext();

  console.log("🔀 AppRouter render:", {
    isAuthenticated,
    isLoading,
    hasUser: !!user,
    error,
  });

  if (isLoading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#2F4F3F" />
        <Text style={styles.loadingText}>Loading...</Text>
      </View>
    );
  }

  if (!isAuthenticated) {
    console.log("📱 Showing LoginScreen");
    return <LoginScreen />;
  }

  console.log("✅ Showing AuthenticatedApp");
  return (
    <DataProvider>
      <AuthenticatedApp />
    </DataProvider>
  );
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
    color: "#2F4F3F",
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
