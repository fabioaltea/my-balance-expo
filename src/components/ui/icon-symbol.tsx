import React from 'react';
import { MaterialIcons } from '@expo/vector-icons';
import { ComponentProps } from 'react';
import { OpaqueColorValue, type StyleProp, type TextStyle } from 'react-native';
import { Icon } from 'expo-router/unstable-native-tabs';

export type IconName = ComponentProps<typeof MaterialIcons>['name'];

/**
 * Icon component using Expo Vector Icons (MaterialIcons)
 * Consistent across all platforms (iOS, Android, Web)
 *
 * All MaterialIcons are available - see https://icons.expo.fyi for the full list
 * MaterialIcons automatically handles invalid icon names gracefully
 */

export interface IconSymbolProps {
  name: string;
  color?: string;
  size?: number;
  style?: object;
}

const IconSymbol: React.FC<IconSymbolProps> = ({ name, color, size, style }: IconSymbolProps) => {
  return <MaterialIcons name={name as IconName} color={color} size={size} style={style} />;
};

export default IconSymbol;
