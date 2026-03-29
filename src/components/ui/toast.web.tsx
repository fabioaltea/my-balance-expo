import React, { useEffect, useRef, useState } from 'react';
import { View, StyleSheet, Animated, Text } from 'react-native';
import { useThemeColor } from '@/src/hooks/use-theme-color';
import MaterialIcons from '@expo/vector-icons/MaterialIcons';

type ToastStatus = 'loading' | 'success' | 'error';

interface IToastProps {
  isVisible: boolean;
  status: ToastStatus;
  message?: string;
  onDismiss?: () => void;
  autoDismissMs?: number;
}

const Toast: React.FC<IToastProps> = ({
  isVisible,
  status,
  message,
  onDismiss,
  autoDismissMs = 2500,
}) => {
  const translateY = useRef(new Animated.Value(100)).current;
  const opacity = useRef(new Animated.Value(0)).current;
  const [isRendered, setIsRendered] = useState(false);

  const backgroundColor = useThemeColor({ light: '#fff', dark: '#2a2a2a' }, 'cardBackground');
  const textColor = useThemeColor({ light: '#000', dark: '#fff' }, 'text');

  const dismiss = () => {
    Animated.parallel([
      Animated.timing(translateY, {
        toValue: 100,
        duration: 200,
        useNativeDriver: true,
      }),
      Animated.timing(opacity, {
        toValue: 0,
        duration: 200,
        useNativeDriver: true,
      }),
    ]).start(() => {
      setIsRendered(false);
      onDismiss?.();
    });
  };

  useEffect(() => {
    if (isVisible) {
      setIsRendered(true);
      Animated.parallel([
        Animated.spring(translateY, {
          toValue: 0,
          useNativeDriver: true,
          tension: 200,
          friction: 20,
        }),
        Animated.timing(opacity, {
          toValue: 1,
          duration: 200,
          useNativeDriver: true,
        }),
      ]).start();

      if (status !== 'loading' && autoDismissMs > 0) {
        const timer = setTimeout(() => {
          dismiss();
        }, autoDismissMs);
        return () => clearTimeout(timer);
      }
    } else if (isRendered) {
      dismiss();
    }
  }, [isVisible, status]);

  if (!isRendered) return null;

  const getIcon = () => {
    switch (status) {
      case 'loading':
        return <MaterialIcons name="sync" size={18} color="#2F4F3F" />;
      case 'success':
        return <MaterialIcons name="check-circle" size={18} color="#22c55e" />;
      case 'error':
        return <MaterialIcons name="error" size={18} color="#ef4444" />;
    }
  };

  const getDefaultMessage = () => {
    switch (status) {
      case 'loading':
        return 'Saving...';
      case 'success':
        return 'Saved successfully';
      case 'error':
        return 'Error saving';
    }
  };

  return (
    <Animated.View
      style={[
        styles.container,
        {
          backgroundColor,
          transform: [{ translateY }],
          opacity,
        },
      ]}
    >
      {getIcon()}
      <Text style={[styles.message, { color: textColor }]}>{message || getDefaultMessage()}</Text>
    </Animated.View>
  );
};

const styles = StyleSheet.create({
  container: {
    position: 'absolute',
    bottom: 20,
    right: 20,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    paddingVertical: 12,
    paddingHorizontal: 20,
    borderRadius: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.15,
    shadowRadius: 8,
    elevation: 5,
    zIndex: 2000,
  },
  message: {
    fontSize: 14,
    fontWeight: '500',
  },
});

export default Toast;
