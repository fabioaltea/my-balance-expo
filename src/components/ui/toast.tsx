import React from 'react';
import { View } from 'react-native';

type ToastStatus = 'loading' | 'success' | 'error';

interface IToastProps {
  isVisible: boolean;
  status: ToastStatus;
  message?: string;
  onDismiss?: () => void;
  autoDismissMs?: number;
}

/** Native stub – Toast is only rendered in the web landscape layout */
const Toast: React.FC<IToastProps> = () => {
  return null;
};

export default Toast;
