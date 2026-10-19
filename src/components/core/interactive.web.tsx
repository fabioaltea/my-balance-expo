import React, { forwardRef } from 'react';
import {
  Pressable as NativePressable,
  TouchableOpacity as NativeTouchableOpacity,
} from 'react-native';

interface WebInteractionProps {
  /** Opt out for full-screen backdrops or controls with their own hover feedback. */
  hoverFeedback?: boolean;
  title?: string;
  dataSet?: Record<string, string | number | boolean | undefined>;
}

type PressableProps = React.ComponentProps<typeof NativePressable> & WebInteractionProps;
type TouchableProps = React.ComponentProps<typeof NativeTouchableOpacity> & WebInteractionProps;

export const Pressable = forwardRef<React.ComponentRef<typeof NativePressable>, PressableProps>(
  function Pressable({ hoverFeedback = true, dataSet, ...props }, ref) {
    const enabled =
      hoverFeedback &&
      !!(props.onPress || props.onLongPress) &&
      !props.disabled &&
      !props.accessibilityState?.disabled &&
      !props['aria-disabled'] &&
      !props.onHoverIn &&
      !(dataSet && ('movementRow' in dataSet || 'movement-row' in dataSet));
    const webProps = {
      ...props,
      dataSet: { ...dataSet, 'web-hover': enabled ? 'true' : 'false' },
    };
    return <NativePressable {...webProps} ref={ref} />;
  },
);

export const TouchableOpacity = forwardRef<
  React.ComponentRef<typeof NativeTouchableOpacity>,
  TouchableProps
>(function TouchableOpacity({ hoverFeedback = true, dataSet, ...props }, ref) {
  const enabled =
    hoverFeedback &&
    !!(props.onPress || props.onLongPress) &&
    !props.disabled &&
    !props.accessibilityState?.disabled &&
    !props['aria-disabled'] &&
    !(dataSet && ('movementRow' in dataSet || 'movement-row' in dataSet));
  const webProps = {
    ...props,
    dataSet: { ...dataSet, 'web-hover': enabled ? 'true' : 'false' },
  };
  return <NativeTouchableOpacity {...webProps} ref={ref} />;
});
