import { StyleSheet, View } from "react-native";
import { ThemedText } from "@/src/components/core/themed-text";
import React from "react";
import { useAuthContext } from "@/src/state";
import SettingsView from "@/src/views/settings-view";
import { ScreenView } from "@/src/components/core";

export default function Settings() {
  const { user, logout } = useAuthContext();

  return (
    <ScreenView>
      <View style={styles.header}>
        <ThemedText type="title">Settings</ThemedText>
      </View>
      <SettingsView user={user} logout={logout} />
    </ScreenView>
  );
}

const styles = StyleSheet.create({
  header: {
    paddingHorizontal: 16,
    paddingVertical: 12,
    marginBottom: 16,
  },
});
