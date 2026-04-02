import { View, StyleSheet, Pressable, Animated } from 'react-native';
import { useThemeColor } from '@/src/hooks/use-theme-color';
import { useRef, useEffect, ReactNode } from 'react';
import { ThemedText } from '../core/themed-text.native';
import GlassButton from './glass-button';
import React from 'react';

interface IModalPanelProps {
  isVisible: boolean;
  onClose: () => void;
  onConfirm?: () => void;
  title?: string;
  showConfirmButton?: boolean;
  showCancelButton?: boolean;
  confirmText?: string;
  cancelText?: string;
  children: ReactNode;
  maxHeight?: number;
}

const ModalPanel: React.FC<IModalPanelProps> = ({
  isVisible,
  onClose,
  onConfirm,
  title,
  showConfirmButton = true,
  showCancelButton = true,
  confirmText = 'Conferma',
  cancelText = 'Annulla',
  children,
  maxHeight,
}) => {
  const opacityAnimation = useRef(new Animated.Value(0)).current;

  const backgroundColor = useThemeColor({ light: '#fff', dark: '#1a1a1a' }, 'background');
  const borderColor = useThemeColor({ light: '#e0e0e0', dark: '#333' }, 'tabIconDefault');
  const overlayColor = 'transparent';

  useEffect(() => {
    if (isVisible) {
      Animated.timing(opacityAnimation, {
        toValue: 1,
        duration: 200,
        useNativeDriver: true,
      }).start();
    } else {
      opacityAnimation.setValue(0);
    }
  }, [isVisible]);

  const handleClose = () => {
    Animated.timing(opacityAnimation, {
      toValue: 0,
      duration: 150,
      useNativeDriver: true,
    }).start(() => {
      onClose();
    });
  };

  const handleConfirm = () => {
    if (onConfirm) {
      onConfirm();
    }
    handleClose();
  };

  if (!isVisible) return null;

  return (
    <View style={styles.overlay}>
      <Pressable
        style={[styles.backdrop, { backgroundColor: overlayColor }]}
        onPress={handleClose}
      />
      <Animated.View
        style={[
          styles.panel,
          {
            backgroundColor,
            borderColor,
            opacity: opacityAnimation,
            maxHeight: maxHeight || 400,
          },
        ]}
      >
        {(title || showCancelButton || showConfirmButton) && (
          <View style={styles.header}>
            {showCancelButton ? (
              <GlassButton onPress={handleClose} type="dismiss" />
            ) : (
              <View style={styles.spacer} />
            )}

            {title && (
              <ThemedText type="defaultSemiBold" style={styles.title}>
                {title}
              </ThemedText>
            )}

            {showConfirmButton ? (
              <GlassButton onPress={handleConfirm} type="confirm" />
            ) : (
              <View style={styles.spacer} />
            )}
          </View>
        )}

        <View style={styles.content}>{children}</View>
      </Animated.View>
    </View>
  );
};

const styles = StyleSheet.create({
  overlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 1000,
  },
  backdrop: {
    ...StyleSheet.absoluteFillObject,
  },
  panel: {
    borderRadius: 30,
    borderWidth: 0,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 12,
    elevation: 8,
    width: '90%',
    maxWidth: 500,
    paddingTop: 16,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 16,
    marginBottom: 16,
  },
  title: {
    fontSize: 18,
    fontWeight: '600',
    flex: 1,
    textAlign: 'center',
  },
  spacer: {
    width: 48,
    height: 48,
  },
  content: {
    paddingBottom: 20,
    paddingHorizontal: 20,
    flexShrink: 1,
  },
});

export default ModalPanel;
