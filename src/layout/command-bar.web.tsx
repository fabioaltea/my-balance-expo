import React, { ReactNode } from "react";
import { View, Text, StyleSheet, Image } from "react-native";
import { useThemeColor } from "@/src/hooks/use-theme-color";
import { useAuthContext } from "@/src/state";
import ContextMenu from "@/src/components/ui/context-menu";

const LANDING_BASE_URL =
  process.env.EXPO_PUBLIC_LANDING_URL || "https://mybalance.tech";

interface LandscapeCommandBarProps {
  accountSelector: ReactNode;
  periodSelector: ReactNode;
  rightContent?: ReactNode;
  onManage?: () => void;
}

/**
 * Compact iOS 26 style command bar for landscape mode (Web version)
 * Low height, glass morphism effect, with logo + account + period selectors
 */
export function CommandBar({
  accountSelector,
  periodSelector,
  rightContent,
  onManage,
}: LandscapeCommandBarProps) {
  const textColor = useThemeColor({}, "text");
  const borderColor = useThemeColor(
    { light: "rgba(0,0,0,0.08)", dark: "rgba(255,255,255,0.1)" },
    "cardBorder",
  );
  const backgroundColor = useThemeColor(
    { light: "rgba(255, 255, 255, 0.6)", dark: "rgba(255, 255, 255, 0.1)" },
    "cardBackground",
  );

  const { logout } = useAuthContext();

  const handleMenuOption = (option: string) => {
    if (option.toLowerCase() === "logout") {
      logout();
    } else if (option === "Manage") {
      onManage?.();
    } else if (option === "Privacy Policy") {
      window.open(`${LANDING_BASE_URL}/#/privacy-policy`, "_blank");
    } else if (option === "Terms of Service") {
      window.open(`${LANDING_BASE_URL}/#/terms-of-service`, "_blank");
    }
  };

  return (
    <View style={[styles.container]}>
      <View style={[styles.content, { backgroundColor, borderColor }]}>
        {/* Logo section */}
        <ContextMenu
          options={[
            {
              label: "Manage",
              icon: "settings-outline",
            },
            {
              label: "Privacy Policy",
              icon: "shield-checkmark-outline",
            },
            {
              label: "Terms of Service",
              icon: "document-text-outline",
            },
            {
              label: "Logout",
              icon: "log-out-outline",
              destructive: true,
            },
          ]}
          selectedOption=""
          onSelectOption={handleMenuOption}
        >
          <View style={styles.logoSection}>
            <Image
              source={require("@/assets/images/icon.png")}
              style={styles.logo}
              resizeMode="contain"
            />
            <Text style={[styles.brandText, { color: "#2F4F3F" }]}>
              MyBalance
            </Text>
          </View>
        </ContextMenu>

        {/* Divider */}
        <View style={[styles.divider, { backgroundColor: borderColor }]} />

        {/* Account selector */}
        <View style={styles.selectorSection}>{accountSelector}</View>

        {/* Divider */}
        <View style={[styles.divider, { backgroundColor: borderColor }]} />

        {/* Period selector */}
        <View style={styles.periodSection}>{periodSelector}</View>

        {/* Right content (optional) */}
        {rightContent && (
          <>
            <View style={styles.spacer} />
            <View style={[styles.divider, { backgroundColor: borderColor }]} />
            <View style={styles.rightSection}>{rightContent}</View>
          </>
        )}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    padding: 10,
    height: 60,
    zIndex: 100,
  },
  content: {
    boxShadow: "0 4px 30px rgba(0, 0, 0, 0.1)",
    borderRadius: 20,
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 12,
    paddingVertical: 6,
    height: 48,
    overflow: "visible",
  },
  logoSection: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
  },
  logo: {
    width: 24,
    height: 24,
    borderRadius: 6,
  },
  brandText: {
    fontSize: 15,
    fontWeight: "600",
    letterSpacing: -0.3,
  },
  divider: {
    width: 1,
    height: 20,
    marginHorizontal: 12,
    opacity: 0.5,
  },
  selectorSection: {
    flexDirection: "row",
    alignItems: "center",
    overflow: "visible",
    zIndex: 101,
  },
  periodSection: {
    flexDirection: "row",
    alignItems: "center",
    flex: 1,
    overflow: "visible",
    zIndex: 101,
  },
  spacer: {
    flex: 1,
  },
  rightSection: {
    flexDirection: "row",
    alignItems: "center",
  },
});

export default CommandBar;
