import React from 'react';
import { Pressable, ScrollView, View, StyleSheet, Text, Dimensions, Animated } from 'react-native';
import { useState, useEffect, useRef, useCallback } from 'react';
import { useThemeColor } from '@/src/hooks/use-theme-color';
import { Ionicons } from '@expo/vector-icons';

export interface IContextMenuOption {
  label: string;
  icon?: keyof typeof Ionicons.glyphMap;
  color?: string;
  destructive?: boolean;
  disabled?: boolean;
}

export interface IContextMenuProps {
  options: (string | IContextMenuOption)[];
  selectedOption?: string;
  onSelectOption: (option: string) => void;
  children: React.ReactNode;
}

const ITEM_HEIGHT = 44;
const MENU_PADDING = 8;
const MAX_HEIGHT = 250;
const MENU_WIDTH = 200;

function normalizeOption(option: string | IContextMenuOption): IContextMenuOption {
  if (typeof option === 'string') {
    return { label: option };
  }
  return option;
}

const ContextMenu: React.FC<IContextMenuProps> = ({
  options,
  selectedOption = '',
  onSelectOption,
  children,
}) => {
  const [menuVisible, setMenuVisible] = useState(false);
  const [buttonPosition, setButtonPosition] = useState<{
    x: number;
    y: number;
    width: number;
    height: number;
  } | null>(null);
  const triggerRef = useRef<View>(null);

  const scaleAnim = useRef(new Animated.Value(0.3)).current;
  const opacityAnim = useRef(new Animated.Value(0)).current;
  const translateYAnim = useRef(new Animated.Value(-10)).current;

  const menuBackground = useThemeColor({ light: '#f2f2f7', dark: '#1c1c1e' }, 'cardBackground');
  const borderColor = useThemeColor(
    { light: 'rgba(0,0,0,0.1)', dark: 'rgba(255,255,255,0.1)' },
    'cardBorder',
  );
  const textColor = useThemeColor({}, 'text');
  const separatorColor = useThemeColor(
    { light: 'rgba(0,0,0,0.1)', dark: 'rgba(255,255,255,0.1)' },
    'tabIconDefault',
  );
  const pressedBackground = useThemeColor(
    { light: 'rgba(0,0,0,0.08)', dark: 'rgba(255,255,255,0.08)' },
    'tabIconDefault',
  );

  const openMenu = useCallback(() => {
    triggerRef.current?.measureInWindow((x, y, width, height) => {
      setButtonPosition({ x, y, width, height });
      setMenuVisible(true);
    });
  }, []);

  useEffect(() => {
    if (menuVisible) {
      scaleAnim.setValue(0.3);
      opacityAnim.setValue(0);
      translateYAnim.setValue(-10);
      Animated.parallel([
        Animated.spring(scaleAnim, {
          toValue: 1,
          useNativeDriver: true,
          tension: 300,
          friction: 20,
        }),
        Animated.timing(opacityAnim, {
          toValue: 1,
          duration: 200,
          useNativeDriver: true,
        }),
        Animated.spring(translateYAnim, {
          toValue: 0,
          useNativeDriver: true,
          tension: 300,
          friction: 20,
        }),
      ]).start();
    }
  }, [menuVisible]);

  const closeMenu = useCallback(() => {
    Animated.parallel([
      Animated.spring(scaleAnim, {
        toValue: 0.3,
        useNativeDriver: true,
        tension: 400,
        friction: 10,
      }),
      Animated.timing(opacityAnim, {
        toValue: 0,
        duration: 20,
        useNativeDriver: true,
      }),
      Animated.spring(translateYAnim, {
        toValue: -10,
        useNativeDriver: true,
        tension: 400,
        friction: 10,
      }),
    ]).start(() => {
      setMenuVisible(false);
    });
  }, []);

  const handleSelect = useCallback(
    (optionLabel: string) => {
      onSelectOption(optionLabel);
      Animated.parallel([
        Animated.spring(scaleAnim, {
          toValue: 0.95,
          useNativeDriver: true,
          tension: 500,
          friction: 8,
        }),
      ]).start(() => {
        setMenuVisible(false);
      });
    },
    [onSelectOption],
  );

  const calculatedHeight = Math.min(options.length * ITEM_HEIGHT + MENU_PADDING * 2, MAX_HEIGHT);

  const menuStyle = buttonPosition
    ? {
        backgroundColor: menuBackground,
        borderColor: borderColor,
        height: calculatedHeight,
        width: MENU_WIDTH,
        left: (() => {
          const screenWidth = Dimensions.get('window').width;
          const buttonCenter = buttonPosition.x + buttonPosition.width / 2;
          let proposedLeft = buttonCenter - MENU_WIDTH / 2;
          if (proposedLeft + MENU_WIDTH > screenWidth - 8) {
            proposedLeft = screenWidth - MENU_WIDTH - 8;
          }
          if (proposedLeft < 8) {
            proposedLeft = 8;
          }
          return proposedLeft;
        })(),
        top: buttonPosition.y + buttonPosition.height + 8,
      }
    : {};

  return (
    <>
      <Pressable ref={triggerRef} onPress={openMenu}>
        {children}
      </Pressable>

      {menuVisible && buttonPosition && (
        <>
          <Animated.View style={[styles.overlay, { opacity: opacityAnim }]}>
            <Pressable style={StyleSheet.absoluteFill} onPress={closeMenu} />
          </Animated.View>
          <Animated.View
            style={[
              styles.menu,
              menuStyle,
              {
                transform: [{ scale: scaleAnim }, { translateY: translateYAnim }],
                opacity: opacityAnim,
              },
            ]}
          >
            <ScrollView
              showsVerticalScrollIndicator={false}
              contentContainerStyle={styles.scrollContent}
            >
              {options.map((option, index) => {
                const normalized = normalizeOption(option);
                const isDestructive = normalized.destructive;
                const isDisabled = normalized.disabled;
                const itemColor = isDisabled
                  ? 'rgba(128,128,128,0.4)'
                  : isDestructive
                    ? '#ff3b30'
                    : normalized.color || textColor;
                const isSelected = selectedOption === normalized.label;
                const isLast = index === options.length - 1;

                return (
                  <React.Fragment key={index}>
                    <Pressable
                      style={({ pressed }) => [
                        styles.menuItemContainer,
                        pressed &&
                          !isDisabled && {
                            backgroundColor: pressedBackground,
                          },
                      ]}
                      onPress={() => !isDisabled && handleSelect(normalized.label)}
                      disabled={isDisabled}
                    >
                      <Text
                        style={[
                          styles.menuItemText,
                          { color: itemColor },
                          isSelected && styles.menuItemTextSelected,
                        ]}
                      >
                        {normalized.label}
                      </Text>
                      {normalized.icon && (
                        <Ionicons
                          name={normalized.icon}
                          size={20}
                          color={itemColor}
                          style={styles.menuItemIcon}
                        />
                      )}
                    </Pressable>
                    {!isLast && (
                      <View style={[styles.separator, { backgroundColor: separatorColor }]} />
                    )}
                  </React.Fragment>
                );
              })}
            </ScrollView>
          </Animated.View>
        </>
      )}
    </>
  );
};

const styles = StyleSheet.create({
  overlay: {
    position: 'fixed' as any,
    top: 0,
    left: 0,
    width: '100%' as any,
    height: '100%' as any,
    zIndex: 399,
    backgroundColor: 'transparent',
  },
  menu: {
    position: 'fixed' as any,
    zIndex: 400,
    borderWidth: 0.5,
    borderRadius: 20,
    shadowColor: '#000000',
    shadowOffset: { width: 0, height: 12 },
    shadowOpacity: 0.25,
    shadowRadius: 24,
    elevation: 16,
    overflow: 'hidden',
  },
  scrollContent: {
    paddingVertical: MENU_PADDING,
  },
  menuItemContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    height: ITEM_HEIGHT,
  },
  menuItemText: {
    fontSize: 17,
    fontWeight: '400',
    flex: 1,
  },
  menuItemTextSelected: {
    fontWeight: '600',
  },
  menuItemIcon: {
    marginLeft: 12,
  },
  separator: {
    height: 0.5,
    marginLeft: 16,
  },
});

export default ContextMenu;
