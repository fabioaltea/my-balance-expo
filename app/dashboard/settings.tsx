import { StyleSheet, View } from "react-native";
import { ThemedText } from "@/components/themed-text";
import ScreenView from "@/layout/screen-view";
import React from "react";
import { useAuthContext } from "@/state";
import SettingsView from "@/views/settings-view";

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
