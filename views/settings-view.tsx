import {
  Alert,
  StyleSheet,
  View,
  TouchableOpacity,
  ActivityIndicator,
} from "react-native";
import { ThemedText } from "@/components/themed-text";
import React, { useState, useEffect } from "react";
import { useThemeColor } from "@/hooks/use-theme-color";
import { router } from "expo-router";
import * as Haptics from "expo-haptics";
import * as Linking from "expo-linking";
// import * as Clipboard from "expo-clipboard";
import InputGroup from "@/components/ui/input-group";
import IconSymbol from "@/components/ui/icon-symbol";
import { ShortcutApiHelper } from "@/helpers/ShortcutApiHelper";

const ICLOUD_SHORTCUT_URL = process.env.EXPO_PUBLIC_ICLOUD_SHORTCUT_URL || "";

interface SettingsViewProps {
  user: { email?: string } | null;
  logout: () => void;
}

interface SettingsItemProps {
  icon: string;
  title: string;
  onPress: () => void;
  showChevron?: boolean;
  isDestructive?: boolean;
  textColor: string;
  secondaryTextColor: string;
  separatorColor: string;
  destructiveColor: string;
}

const SettingsItem: React.FC<SettingsItemProps> = ({
  icon,
  title,
  onPress,
  showChevron = true,
  isDestructive = false,
  textColor,
  secondaryTextColor,
  separatorColor,
  destructiveColor,
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
        style={[styles.iconContainer, isDestructive && styles.destructiveIcon]}
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
      <IconSymbol name="chevron-right" size={16} color={secondaryTextColor} />
    )}
  </TouchableOpacity>
);

interface SettingsSectionProps {
  title?: string;
  children: React.ReactNode;
  secondaryTextColor: string;
}

const SettingsSection: React.FC<SettingsSectionProps> = ({
  title,
  children,
  secondaryTextColor,
}) => (
  <View style={styles.section}>
    {title && (
      <ThemedText style={[styles.sectionTitle, { color: secondaryTextColor }]}>
        {title}
      </ThemedText>
    )}
    <View style={[styles.sectionContent, { backgroundColor: "transparent" }]}>
      {children}
    </View>
  </View>
);

const SettingsView: React.FC<SettingsViewProps> = ({ user, logout }) => {
  const [shortcutKey, setShortcutKey] = useState<string | null>(null);
  const [isLoadingShortcut, setIsLoadingShortcut] = useState(false);

  const textColor = useThemeColor({ light: "#000", dark: "#fff" }, "text");
  const secondaryTextColor = useThemeColor(
    { light: "#8e8e93", dark: "#8e8e93" },
    "tabIconDefault",
  );
  const separatorColor = useThemeColor(
    { light: "#c6c6c8", dark: "#38383a" },
    "tabIconDefault",
  );
  const destructiveColor = "#ff3b30";

  // Load existing shortcut key on mount
  useEffect(() => {
    loadShortcutKey();
  }, []);

  const loadShortcutKey = async () => {
    try {
      const key = await ShortcutApiHelper.getShortcutKey();
      setShortcutKey(key);
    } catch (error) {
      console.error("Failed to load shortcut key:", error);
    }
  };

  const handleGenerateShortcut = async () => {
    try {
      setIsLoadingShortcut(true);
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);

      // Get existing key or generate new one
      let key = shortcutKey;
      if (!key) {
        key = await ShortcutApiHelper.generateShortcutKey();
        setShortcutKey(key);
      }

      // Copy key to clipboard
      // await Clipboard.setStringAsync(key);

      // Open iCloud shortcut URL for setup
      if (ICLOUD_SHORTCUT_URL) {
        const canOpen = await Linking.canOpenURL(ICLOUD_SHORTCUT_URL);
        if (canOpen) {
          Alert.alert(
            "Shortcut Key Copied",
            "Your shortcut key has been copied to clipboard. The Shortcuts app will now open for setup.\n\nPaste the key when prompted.",
            [
              {
                text: "Open Shortcuts",
                onPress: () => Linking.openURL(ICLOUD_SHORTCUT_URL),
              },
            ],
          );
        } else {
          Alert.alert(
            "Key Copied",
            `Your shortcut key has been copied to clipboard.\n\nOpen Safari and go to:\n${ICLOUD_SHORTCUT_URL}`,
            [{ text: "OK" }],
          );
        }
      } else {
        Alert.alert(
          "Key Copied",
          "Your shortcut key has been copied to clipboard.",
          [{ text: "OK" }],
        );
      }
    } catch (error: any) {
      console.error("Failed to generate shortcut:", error);
      Alert.alert("Error", error.message || "Failed to generate shortcut key", [
        { text: "OK" },
      ]);
    } finally {
      setIsLoadingShortcut(false);
    }
  };

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

  return (
    <View style={styles.container}>
      {/* User Profile Card */}
      <SettingsSection secondaryTextColor={secondaryTextColor}>
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
      <SettingsSection title="DATA" secondaryTextColor={secondaryTextColor}>
        <InputGroup>
          <SettingsItem
            icon="credit-card"
            title="Accounts"
            onPress={() => handleNavigation("/accounts")}
            textColor={textColor}
            secondaryTextColor={secondaryTextColor}
            separatorColor={separatorColor}
            destructiveColor={destructiveColor}
          />
          <SettingsItem
            icon="folder"
            title="Categories"
            onPress={() => handleNavigation("/categories")}
            textColor={textColor}
            secondaryTextColor={secondaryTextColor}
            separatorColor={separatorColor}
            destructiveColor={destructiveColor}
          />
        </InputGroup>
      </SettingsSection>

      {/* Shortcuts */}
      <SettingsSection
        title="SHORTCUTS"
        secondaryTextColor={secondaryTextColor}
      >
        <InputGroup>
          <TouchableOpacity
            style={[
              styles.settingsItem,
              {
                backgroundColor: "transparent",
                borderBottomColor: separatorColor,
              },
            ]}
            onPress={handleGenerateShortcut}
            activeOpacity={0.6}
            disabled={isLoadingShortcut}
          >
            <View style={styles.settingsItemLeft}>
              <View style={styles.iconContainer}>
                <IconSymbol name="app-shortcut" size={20} color="#2F4F3F" />
              </View>
              <View style={{ flex: 1 }}>
                <ThemedText
                  style={[styles.settingsItemText, { color: textColor }]}
                >
                  {shortcutKey ? "Update iOS Shortcut" : "Setup iOS Shortcut"}
                </ThemedText>
                {shortcutKey && (
                  <ThemedText
                    style={[
                      styles.shortcutKeyText,
                      { color: secondaryTextColor },
                    ]}
                    numberOfLines={1}
                  >
                    Key: {shortcutKey.substring(0, 16)}...
                  </ThemedText>
                )}
              </View>
            </View>
            {isLoadingShortcut ? (
              <ActivityIndicator size="small" color="#2F4F3F" />
            ) : (
              <IconSymbol
                name="chevron-right"
                size={16}
                color={secondaryTextColor}
              />
            )}
          </TouchableOpacity>
        </InputGroup>
      </SettingsSection>

      {/* Account Actions */}
      <SettingsSection secondaryTextColor={secondaryTextColor}>
        <InputGroup>
          <SettingsItem
            icon="logout"
            title="Logout"
            onPress={handleLogout}
            showChevron={false}
            isDestructive={true}
            textColor={textColor}
            secondaryTextColor={secondaryTextColor}
            separatorColor={separatorColor}
            destructiveColor={destructiveColor}
          />
        </InputGroup>
      </SettingsSection>
    </View>
  );
};

export default SettingsView;

const styles = StyleSheet.create({
  container: {
    flex: 1,
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
  shortcutKeyText: {
    fontSize: 12,
    marginTop: 2,
    fontFamily: "monospace",
  },
});
