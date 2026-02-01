import React from "react";
import {
  View,
  Text,
  StyleSheet,
  Pressable,
  ScrollView,
} from "react-native";
import { useRouter, usePathname, Slot } from "expo-router";
import MaterialIcons from "@expo/vector-icons/MaterialIcons";
import { usePlatformContext } from "@/state/PlatformProvider";
import { useThemeColor } from "@/hooks/use-theme-color";

interface NavItem {
  name: string;
  route: string;
  icon: keyof typeof MaterialIcons.glyphMap;
  label: string;
}

const NAV_ITEMS: NavItem[] = [
  { name: "charts", route: "/dashboard/charts", icon: "bar-chart", label: "Charts" },
  { name: "home", route: "/dashboard/home", icon: "home", label: "Home" },
  { name: "settings", route: "/dashboard/settings", icon: "person", label: "Profile" },
];



/**
 * Bottom tab navigation for mobile web or portrait mode.
 */
function BottomTabs() {
  const router = useRouter();
  const pathname = usePathname();
  const backgroundColor = useThemeColor({}, "menuBackground");
  const textColor = useThemeColor({}, "text");
  const accentColor = "#2F4F3F";

  return (
    <View style={[styles.bottomTabs, { backgroundColor }]}>
      {NAV_ITEMS.map((item) => {
        const isActive = pathname.includes(item.name);
        return (
          <Pressable
            key={item.name}
            style={styles.bottomTabItem}
            onPress={() => router.push(item.route as any)}
          >
            <MaterialIcons
              name={item.icon}
              size={24}
              color={isActive ? accentColor : textColor}
            />
            <Text
              style={[
                styles.bottomTabLabel,
                { color: isActive ? accentColor : textColor },
              ]}
            >
              {item.label}
            </Text>
          </Pressable>
        );
      })}
    </View>
  );
}

/**
 * Web-safe dashboard layout that adapts to screen size and orientation.
 * - Desktop landscape: sidebar navigation
 * - Mobile/tablet or portrait: bottom tabs
 */
export function WebDashboardLayout() {
  const { showSidebar, showBottomTabs } = usePlatformContext();
  const backgroundColor = useThemeColor({}, "background");

  return (
    <View style={[styles.container, { backgroundColor }]}>
      <View style={styles.layoutContainer}>
        {/* {showSidebar && <Sidebar />} */}
        <View style={styles.content}>
          <Slot />
        </View>
      </View>
      {showBottomTabs && <BottomTabs />}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  layoutContainer: {
    flex: 1,
    flexDirection: "row",
  },
  content: {
    flex: 1,
  },
  // Sidebar styles
  sidebar: {
    width: 240,
    borderRightWidth: 1,
    borderRightColor: "#e0e0e0",
  },
  sidebarHeader: {
    padding: 20,
    borderBottomWidth: 1,
    borderBottomColor: "#e0e0e0",
  },
  sidebarTitle: {
    fontSize: 24,
    fontWeight: "700",
  },
  sidebarNav: {
    flex: 1,
    paddingTop: 8,
  },
  sidebarItem: {
    flexDirection: "row",
    alignItems: "center",
    padding: 16,
    marginHorizontal: 8,
    marginVertical: 2,
    borderRadius: 8,
  },
  sidebarLabel: {
    marginLeft: 12,
    fontSize: 16,
  },
  sidebarLabelActive: {
    fontWeight: "600",
  },
  // Bottom tabs styles
  bottomTabs: {
    flexDirection: "row",
    borderTopWidth: 1,
    borderTopColor: "#e0e0e0",
    paddingBottom: 20, // Extra padding for web safe area
    paddingTop: 8,
  },
  bottomTabItem: {
    flex: 1,
    alignItems: "center",
    paddingVertical: 8,
  },
  bottomTabLabel: {
    fontSize: 12,
    marginTop: 4,
  },
});

export default WebDashboardLayout;
