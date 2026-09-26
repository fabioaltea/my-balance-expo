import React, { useEffect, useRef } from 'react';
import { Animated, Dimensions, Pressable, StyleSheet, View } from 'react-native';

import { useThemeColor } from '@/src/hooks/use-theme-color';

interface SideDrawerProps {
  isOpen: boolean;
  onClose: () => void;
  children?: React.ReactNode;
  width?: number | string;
  side?: 'right' | 'left';
}

const SideDrawer: React.FC<SideDrawerProps> = ({
  isOpen,
  onClose,
  children,
  width = '40%',
  side = 'right',
}) => {
  const backgroundColor = useThemeColor({ light: '#FFFFFF', dark: '#1D211F' }, 'menuBackground');
  const borderColor = useThemeColor(
    { light: 'rgba(23, 38, 31, 0.12)', dark: 'rgba(255, 255, 255, 0.12)' },
    'cardBorder',
  );
  const screenWidth = Dimensions.get('window').width;
  const requestedWidth =
    typeof width === 'string' && width.endsWith('%')
      ? (parseFloat(width) / 100) * screenWidth
      : typeof width === 'number'
        ? width
        : screenWidth * 0.4;
  const drawerWidth = Math.min(Math.max(requestedWidth, 520), screenWidth - 24);
  const hiddenValue = side === 'left' ? -drawerWidth : drawerWidth;
  const overlayOpacity = useRef(new Animated.Value(0)).current;
  const translateX = useRef(new Animated.Value(hiddenValue)).current;

  useEffect(() => {
    const animation = Animated.parallel([
      Animated.timing(overlayOpacity, {
        toValue: isOpen ? 1 : 0,
        duration: isOpen ? 220 : 180,
        useNativeDriver: true,
      }),
      Animated.timing(translateX, {
        toValue: isOpen ? 0 : hiddenValue,
        duration: isOpen ? 220 : 180,
        useNativeDriver: true,
      }),
    ]);
    animation.start();
    return () => animation.stop();
  }, [hiddenValue, isOpen, overlayOpacity, translateX]);

  return (
    <View style={styles.overlay} pointerEvents={isOpen ? 'auto' : 'none'}>
      <Animated.View style={[styles.backdrop, { opacity: overlayOpacity }]}>
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="Close panel"
          style={styles.backdropPressable}
          onPress={onClose}
        />
      </Animated.View>
      <Animated.View
        style={[
          styles.drawer,
          side === 'left' ? styles.drawerLeft : styles.drawerRight,
          { width: drawerWidth, transform: [{ translateX }] },
        ]}
      >
        <View style={[styles.content, { backgroundColor, borderColor }]}>{children}</View>
      </Animated.View>
    </View>
  );
};

const styles = StyleSheet.create({
  overlay: {
    ...StyleSheet.absoluteFillObject,
    zIndex: 20,
  },
  backdrop: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(8, 14, 11, 0.44)',
  },
  backdropPressable: {
    flex: 1,
  },
  drawer: {
    position: 'absolute',
    top: 0,
    bottom: 0,
    padding: 15,
  },
  drawerRight: {
    right: 0,
  },
  drawerLeft: {
    left: 0,
  },
  content: {
    flex: 1,
    padding: 14,
    borderWidth: 1,
    borderRadius: 24,
    overflow: 'hidden',
    boxShadow: '0 24px 80px rgba(8, 14, 11, 0.28)',
  },
});

export default SideDrawer;
