import React, { useEffect } from "react";
import {
  DarkTheme,
  DefaultTheme,
  ThemeProvider,
} from "@react-navigation/native";
import { Stack } from "expo-router";
import { StatusBar } from "expo-status-bar";
import "react-native-reanimated";

import { useColorScheme } from "@/hooks/use-color-scheme";
import { View, Text, StyleSheet, ActivityIndicator, Alert, BackHandler } from "react-native";
import { SafeAreaProvider, SafeAreaView } from "react-native-safe-area-context";
import { AuthProvider, useAuthContext } from "@/state/AuthProvider";
import { DataProvider } from "@/state/DataProvider";
import { PlatformProvider } from "@/state/PlatformProvider";
import { QueryProvider } from "@/providers/QueryProvider";
import LoginScreen from "@/views/login-view";
import Onboarding from "./onboarding";

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
            name="onboarding"
            options={{
              presentation: "card",
              title: "Onboarding",
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
  const { isAuthenticated, isLoading, error, mode, executeMigration } = useAuthContext();

  // Show migration alert when migration mode is detected.
  // Also re-show when isLoading transitions to false while still in migration mode
  // (e.g. after a failed migration attempt, so the user can retry).
  useEffect(() => {
    if (mode === "migration" && !isLoading) {
      Alert.alert(
        "Update Available",
        error
          ? "The upgrade could not be completed. Would you like to try again?"
          : "A data format update is available. Would you like to upgrade now? Your existing data will be preserved.",
        [
          {
            text: "Esci",
            style: "cancel",
            onPress: () => BackHandler.exitApp(),
          },
          {
            text: error ? "Retry" : "Upgrade Now",
            onPress: () => executeMigration(),
          },
        ],
        { cancelable: false },
      );
    }
  }, [mode, isLoading, error, executeMigration]);

  if (isLoading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#2F4F3F" />
        <Text style={styles.loadingText}>
          {mode === "migration" ? "Upgrading your data..." : "Loading..."}
        </Text>
      </View>
    );
  }

  if (!isAuthenticated) {
    console.log("📱 Showing LoginScreen");
    return <LoginScreen />;
  }

  if (mode === "quickstart") {
    console.log("📱 Showing onboarding");
    return <Onboarding />;
  }

  if (mode === "migration") {
    // Show loading while Alert is visible (before user taps)
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#2F4F3F" />
        <Text style={styles.loadingText}>Checking for updates...</Text>
      </View>
    );
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
    <PlatformProvider>
      <QueryProvider>
        <AuthProvider>
          <AppRouter />
        </AuthProvider>
      </QueryProvider>
    </PlatformProvider>
  );
}
