import {
  Alert,
  Platform,
  Pressable,
  StyleSheet,
  View,
  Text,
  TouchableOpacity,
} from "react-native";

import { ThemedText } from "@/components/themed-text";
import ScreenView from "@/layout/screen-view";
import React from "react";
import { useAuthContext } from "@/state";
import { useThemeColor } from "@/hooks/use-theme-color";
import Card from "@/components/card";
import { router } from "expo-router";
import * as Haptics from "expo-haptics";
import InputGroup from "@/components/ui/input-group";
import IconSymbol from "@/components/ui/icon-symbol";

export default function Settings() {
  const { user, logout } = useAuthContext();

  const handleLogout = () => {
    Alert.alert("Logout", "Are you sure you want to logout?", [
      {
        text: "Cancel",
        style: "cancel",
      },
      {
        text: "Logout",
        style: "destructive",
        onPress: logout,
      },
    ]);
  };

  const handleNavigation = (route: string) => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    router.push(route as any);
  };

  // Theme colors
  const backgroundColor = useThemeColor(
    { light: "#f2f2f7", dark: "#000000" },
    "background"
  );
  const cardBackground = useThemeColor(
    { light: "#ffffff", dark: "#1c1c1e" },
    "cardBackground"
  );
  const textColor = useThemeColor({ light: "#000", dark: "#fff" }, "text");
  const secondaryTextColor = useThemeColor(
    { light: "#8e8e93", dark: "#8e8e93" },
    "tabIconDefault"
  );
  const separatorColor = useThemeColor(
    { light: "#c6c6c8", dark: "#38383a" },
    "tabIconDefault"
  );
  const destructiveColor = "#ff3b30";

  const SettingsItem = ({
    icon,
    title,
    onPress,
    showChevron = true,
    isDestructive = false,
  }: {
    icon: string;
    title: string;
    onPress: () => void;
    showChevron?: boolean;
    isDestructive?: boolean;
  }) => (
    <TouchableOpacity
      style={[
        styles.settingsItem,
        { backgroundColor: "transparent", borderBottomColor: separatorColor },
      ]}
      onPress={onPress}
      activeOpacity={0.6}
    >
      <View style={styles.settingsItemLeft}>
        <View
          style={[
            styles.iconContainer,
            isDestructive && styles.destructiveIcon,
          ]}
        >
          <IconSymbol
            name={icon as keyof typeof IconSymbol}
            size={20}
            color={isDestructive ? destructiveColor : "#2F4F3F"}
          />
        </View>
        <ThemedText
          style={[
            styles.settingsItemText,
            { color: isDestructive ? destructiveColor : textColor },
          ]}
        >
          {title}
        </ThemedText>
      </View>
      {showChevron && (
        <IconSymbol 
        
        name="chevron-right" size={16} color={secondaryTextColor}
         />
      )}
    </TouchableOpacity>
  );

  const SettingsSection = ({
    title,
    children,
  }: {
    title?: string;
    children: React.ReactNode;
  }) => (
    <View style={styles.section}>
      {title && (
        <ThemedText
          style={[styles.sectionTitle, { color: secondaryTextColor }]}
        >
          {title}
        </ThemedText>
      )}
      <View
        style={[styles.sectionContent, { backgroundColor: "transparent" }]}
      >
        {children}
      </View>
    </View>
  );

  return (
    <ScreenView>
      <View style={styles.container}>
        <View style={styles.header}>
          <ThemedText type="title">Settings</ThemedText>
        </View>

        {/* User Profile Card */}
        <SettingsSection>
                    <InputGroup>

          <View style={styles.profileCard}>
            <View style={styles.profileAvatar}>
              <ThemedText style={styles.profileInitial}>
                {user?.email?.charAt(0).toUpperCase() || "U"}
              </ThemedText>
            </View>
            <View style={styles.profileInfo}>
              <ThemedText style={[styles.profileName, { color: textColor }]}>
                {user?.email || "User"}
              </ThemedText>
              <ThemedText
                style={[styles.profileEmail, { color: secondaryTextColor }]}
              >
                {user?.email || "No email"}
              </ThemedText>
            </View>
          </View>
                    </InputGroup>

        </SettingsSection>

        {/* Data Management */}
        <SettingsSection title="DATA">
          <InputGroup>
            <SettingsItem
              icon="credit-card"
              title="Accounts"
              onPress={() => handleNavigation("/accounts")}
            />
            <SettingsItem
              icon="folder"
              title="Categories"
              onPress={() => handleNavigation("/categories")}
            />
          </InputGroup>
        </SettingsSection>

        {/* Account Actions */}
        <SettingsSection>
          <InputGroup>
            <SettingsItem
              icon="logout"
              title="Logout"
              onPress={handleLogout}
              showChevron={false}
              isDestructive={true}
            />
          </InputGroup>
        </SettingsSection>
      </View>
    </ScreenView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  header: {
    paddingHorizontal: 16,
    paddingVertical:12,
    marginBottom: 16,
  },
  section: {
    marginBottom: 12,
  },
  sectionTitle: {
    fontSize: 13,
    fontWeight: "600",
    textTransform: "uppercase",
    marginBottom: 8,
    marginLeft: 16,
    letterSpacing: 0.5,
  },
  sectionContent: {
    borderRadius: 10,
    marginHorizontal: 16,
    overflow: "hidden",
  },
  profileCard: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: 8,
    paddingHorizontal: 4,
  },
  profileAvatar: {
    width: 64,
    height: 64,
    borderRadius: 24,
    backgroundColor: "#007AFF",
    justifyContent: "center",
    alignItems: "center",
    marginRight: 12,
  },
  profileInitial: {
    fontSize: 28,
    fontWeight: "700",
    color: "#ffffff",
  },
  profileInfo: {
    flex: 1,
  },
  profileName: {
    fontSize: 20,
    fontWeight: "600",
    marginBottom: 2,
  },
  profileEmail: {
    fontSize: 14,
  },
  settingsItem: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingVertical: 4,
    paddingHorizontal: 2,
  },
  settingsItemLeft: {
    flexDirection: "row",
    alignItems: "center",
    flex: 1,
  },
  iconContainer: {
    width: 40,
    height: 40,
    borderRadius: 12,
    backgroundColor: "#00ffbf08",
    justifyContent: "center",
    alignItems: "center",
    marginRight: 12,
  },
  destructiveIcon: {
    backgroundColor: "#ff3b3020",
  },
  settingsItemText: {
    fontSize: 17,
  },
});
