import React, { ReactNode } from "react";
import { View, Text, StyleSheet, Image, Pressable } from "react-native";
import { useThemeColor } from "@/hooks/use-theme-color";
import { BlurView } from "expo-blur";

interface LandscapeCommandBarProps {
  accountSelector: ReactNode;
  periodSelector: ReactNode;
  rightContent?: ReactNode;
}

/**
 * Compact iOS 26 style command bar for landscape mode
 * Low height, glass morphism effect, with logo + account + period selectors
 */
export function LandscapeCommandBar({
  accountSelector,
  periodSelector,
  rightContent,
}: LandscapeCommandBarProps) {
  const textColor = useThemeColor({}, "text");
  const borderColor = useThemeColor(
    { light: "rgba(0,0,0,0.08)", dark: "rgba(255,255,255,0.1)" },
    "cardBorder"
  );

  return (
    <View style={[styles.container]}>
      <View style={styles.content}>
        {/* Logo section */}

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

        {/* Divider */}
        <View style={[styles.divider, { backgroundColor: borderColor }]} />

        {/* Account selector */}
        <View style={styles.selectorSection}>{accountSelector}</View>

        {/* Divider */}
        <View style={[styles.divider, { backgroundColor: borderColor }]} />

        {/* Period selector */}
        <View style={styles.periodSection}>{periodSelector}</View>

        {/* Divider */}
        <View style={[styles.divider, { backgroundColor: borderColor }]} />

        {/* Right content (optional) */}
        {rightContent && (
          <>
            <View style={styles.spacer} />
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

export default LandscapeCommandBar;
