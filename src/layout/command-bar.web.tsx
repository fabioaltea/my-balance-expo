import React, { ReactNode } from 'react';
import { View, Text, StyleSheet, Image } from 'react-native';
import { useThemeColor } from '@/src/hooks/use-theme-color';
import { useAuthContext } from '@/src/state';
import ContextMenu from '@/src/components/ui/context-menu';
import { webPanelBackground } from '@/src/constants/theme';

const LANDING_BASE_URL = process.env.EXPO_PUBLIC_LANDING_URL || 'https://mybalance.tech';

interface LandscapeCommandBarProps {
  accountSelector: ReactNode;
  periodSelector: ReactNode;
  rightContent?: ReactNode;
  onManage?: () => void;
  onMap?: () => void;
}

/** Desktop command bar. The native navigation remains unchanged. */
export function CommandBar({
  accountSelector,
  periodSelector,
  rightContent,
  onManage,
  onMap,
}: LandscapeCommandBarProps) {
  const mutedTextColor = useThemeColor({ light: '#66736C', dark: '#AEB8B2' }, 'tabIconDefault');
  const brandColor = useThemeColor({ light: '#244437', dark: '#D6E8DE' }, 'tint');
  const borderColor = useThemeColor(
    { light: 'rgba(23, 38, 31, 0.10)', dark: 'rgba(255,255,255,0.10)' },
    'cardBorder',
  );
  const backgroundColor = useThemeColor(webPanelBackground, 'cardBackground');

  const { logout } = useAuthContext();

  const handleMenuOption = (option: string) => {
    if (option.toLowerCase() === 'logout') {
      logout();
    } else if (option === 'Manage') {
      onManage?.();
    } else if (option === 'Map') {
      onMap?.();
    } else if (option === 'Privacy Policy') {
      window.open(`${LANDING_BASE_URL}/#/privacy-policy`, '_blank');
    } else if (option === 'Terms of Service') {
      window.open(`${LANDING_BASE_URL}/#/terms-of-service`, '_blank');
    }
  };

  return (
    <View style={styles.container}>
      <View style={[styles.content, { backgroundColor, borderColor }]}>
        <ContextMenu
          options={[
            {
              label: 'Manage',
              icon: 'settings-outline',
            },
            {
              label: 'Map',
              icon: 'map-outline',
            },
            {
              label: 'Privacy Policy',
              icon: 'shield-checkmark-outline',
            },
            {
              label: 'Terms of Service',
              icon: 'document-text-outline',
            },
            {
              label: 'Logout',
              icon: 'log-out-outline',
              destructive: true,
            },
          ]}
          selectedOption=""
          onSelectOption={handleMenuOption}
          activationMethod="singlePress"
        >
          <View style={styles.logoSection}>
            <Image
              source={require('@/assets/images/icon.png')}
              style={styles.logo}
              resizeMode="contain"
            />
            <View>
              <Text style={[styles.brandText, { color: brandColor }]}>MyBalance</Text>
              <Text style={[styles.workspaceText, { color: mutedTextColor }]}>Overview</Text>
            </View>
          </View>
        </ContextMenu>

        <View style={[styles.divider, { backgroundColor: borderColor }]} />

        <View style={styles.selectorSection}>{accountSelector}</View>

        <View style={[styles.divider, { backgroundColor: borderColor }]} />

        <View style={styles.periodSection}>{periodSelector}</View>

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
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingTop: 14,
    paddingBottom: 4,
    minHeight: 68,
    zIndex: 10,
  },
  content: {
    flex: 1,
    boxShadow: '0 1px 2px rgba(17, 31, 24, 0.03), 0 8px 24px rgba(17, 31, 24, 0.05)',
    borderRadius: 20,
    borderWidth: 1,
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 14,
    paddingVertical: 8,
    minHeight: 52,
    overflow: 'visible',
  },
  logoSection: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 9,
    paddingRight: 2,
  },
  logo: {
    width: 30,
    height: 30,
    borderRadius: 8,
  },
  brandText: {
    fontSize: 14,
    lineHeight: 16,
    fontWeight: '700',
    letterSpacing: -0.2,
  },
  workspaceText: {
    fontSize: 10,
    lineHeight: 12,
    fontWeight: '500',
  },
  divider: {
    width: 1,
    height: 24,
    marginHorizontal: 14,
  },
  selectorSection: {
    flexDirection: 'row',
    alignItems: 'center',
    overflow: 'visible',
    zIndex: 2,
  },
  periodSection: {
    flexDirection: 'row',
    alignItems: 'center',
    overflow: 'visible',
    zIndex: 2,
  },
  spacer: {
    flex: 1,
  },
  rightSection: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
});

export default CommandBar;
