import React from 'react';
import { Platform, StyleSheet, View } from 'react-native';
import { ThemedText } from '@/src/components/core/themed-text';
import IconSymbol from '@/src/components/ui/icon-symbol';
import { useThemeColor } from '@/src/hooks/use-theme-color';

const isWeb = Platform.OS === 'web';

interface MovementEmptyStateProps {
  icon: React.ComponentProps<typeof IconSymbol>['name'];
  title: string;
  description: string;
}

/** Shared empty state for the movement cards, centered in the remaining card space. */
export default function MovementEmptyState({ icon, title, description }: MovementEmptyStateProps) {
  const subtextColor = useThemeColor({ light: '#888', dark: '#999' }, 'tabIconDefault');

  return (
    <View style={[styles.container, { gap: isWeb ? 6 : 8 }]}>
      <IconSymbol name={icon} size={isWeb ? 32 : 40} color="#999" />
      <ThemedText style={[styles.title, { color: '#999', fontSize: isWeb ? 15 : 16 }]}>
        {title}
      </ThemedText>
      <ThemedText style={[styles.description, { color: subtextColor, fontSize: isWeb ? 12 : 13 }]}>
        {description}
      </ThemedText>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flexGrow: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  title: {
    fontWeight: '600',
    marginTop: 8,
  },
  description: {
    textAlign: 'center',
  },
});
