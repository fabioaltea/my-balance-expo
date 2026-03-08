import React, { ReactNode, useState, useRef } from "react";
import { View, Text, StyleSheet, Image, Pressable } from "react-native";
import { useThemeColor } from "@/src/hooks/use-theme-color";
import { useAuthContext } from "@/src/state";
import ContextMenu from "@/src/components/ui/context-menu";

interface LandscapeCommandBarProps {
  accountSelector: ReactNode;
  periodSelector: ReactNode;
  rightContent?: ReactNode;
}

/**
 * Compact iOS 26 style command bar for landscape mode (Web version)
 * Low height, glass morphism effect, with logo + account + period selectors
 */
export function CommandBar({
  accountSelector,
  periodSelector,
  rightContent,
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
  const [menuVisible, setMenuVisible] = useState(false);
  const [buttonPosition, setButtonPosition] = useState<{
    x: number;
    y: number;
    width: number;
    height: number;
  } | null>(null);
  const logoRef = useRef<View>(null);

  const handleLogoPress = () => {
    if (logoRef.current) {
      logoRef.current.measureInWindow((x, y, width, height) => {
        setButtonPosition({ x, y, width, height });
        setMenuVisible(true);
      });
    }
  };

  const handleLogout = () => {
    logout();
  };

  const handleMenuOption = (option: string) => {
    setMenuVisible(false);
    if (option.toLowerCase() === "logout") {
      handleLogout();
    }
  };

  return (
    <View style={[styles.container]}>
      <View style={[styles.content, { backgroundColor, borderColor }]}>
        {/* Logo section */}

        <Pressable
          ref={logoRef}
          style={styles.logoSection}
          onPress={handleLogoPress}
        >
          <Image
            source={require("@/assets/images/icon.png")}
            style={styles.logo}
            resizeMode="contain"
          />
          <Text style={[styles.brandText, { color: "#2F4F3F" }]}>
            MyBalance
          </Text>
        </Pressable>

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

      {/* Context Menu */}
      {menuVisible && buttonPosition && (
        <ContextMenu
          options={[
            {
              label: "Logout",
              icon: "log-out-outline",
              destructive: true,
            },
          ]}
          selectedOption=""
          onSelectOption={handleMenuOption}
          onDismiss={() => setMenuVisible(false)}
          buttonPosition={buttonPosition}
        />
      )}
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
