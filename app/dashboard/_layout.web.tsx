import React, { Suspense } from 'react';
import { View, Text, StyleSheet, Pressable } from 'react-native';
import { useRouter, usePathname, Slot } from 'expo-router';
import MaterialIcons from '@expo/vector-icons/MaterialIcons';

import { LandscapeLayout } from '@/src/layout/landscape-layout.web';
import { useThemeColor } from '@/src/hooks/use-theme-color';
import { useAuthContext, usePlatformContext } from '@/src/state';
import PortraitLayout from '@/src/layout/portrait-layout.web';

// // Lazy import: prevents Metro from resolving web-only dependencies on iOS
// const DashboardLandscapeLayout = React.lazy(
//   () => import("@/components/layout/dashboard-landscape-layout")
// );

interface NavItem {
  name: string;
  route: string;
  icon: keyof typeof MaterialIcons.glyphMap;
  label: string;
}

const BASE_NAV_ITEMS: NavItem[] = [
  {
    name: 'charts',
    route: '/dashboard/charts',
    icon: 'bar-chart',
    label: 'Charts',
  },
  { name: 'home', route: '/dashboard/home', icon: 'home', label: 'Home' },
  {
    name: 'settings',
    route: '/dashboard/settings',
    icon: 'person',
    label: 'Profile',
  },
];

/**
 * Bottom tab navigation for mobile web or portrait mode.
 */
function BottomTabs() {
  const router = useRouter();
  const pathname = usePathname();
  const backgroundColor = useThemeColor({}, 'menuBackground');
  const textColor = useThemeColor({}, 'text');
  const accentColor = '#2F4F3F';
  const { user } = useAuthContext();
  const firstName = user?.name?.split(' ')[0] || 'Profile';

  const navItems = BASE_NAV_ITEMS.map((item) =>
    item.name === 'settings' ? { ...item, label: firstName } : item,
  );

  return (
    <View style={[styles.bottomTabs, { backgroundColor }]}>
      {navItems.map((item) => {
        const isActive = pathname.includes(item.name);
        return (
          <Pressable
            key={item.name}
            style={styles.bottomTabItem}
            onPress={() => router.push(item.route as any)}
          >
            <MaterialIcons name={item.icon} size={24} color={isActive ? accentColor : textColor} />
            <Text style={[styles.bottomTabLabel, { color: isActive ? accentColor : textColor }]}>
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
 * - Portrait: bottom tabs with page navigation
 * - Landscape: unified dashboard with all components visible
 */
export function TabLayout() {
  const { orientation } = usePlatformContext();

  // Landscape mode: unified dashboard
  if (orientation === 'landscape') {
    return (
      <Suspense fallback={<View style={{ flex: 1 }} />}>
        <LandscapeLayout />
      </Suspense>
    );
  }

  // Portrait mode: standard tab navigation
  return <PortraitLayout />;
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  content: {
    flex: 1,
  },
  // Bottom tabs styles
  bottomTabs: {
    flexDirection: 'row',
    borderTopWidth: 1,
    borderTopColor: '#e0e0e0',
    paddingBottom: 20,
    paddingTop: 8,
  },
  bottomTabItem: {
    flex: 1,
    alignItems: 'center',
    paddingVertical: 8,
  },
  bottomTabLabel: {
    fontSize: 12,
    marginTop: 4,
  },
  // Landscape layout styles
  landscapeContainer: {
    flex: 1,
    flexDirection: 'column',
  },
});

export default TabLayout;
