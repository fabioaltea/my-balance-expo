import { SafeAreaView } from 'react-native-safe-area-context';
import { StyleSheet } from 'react-native';
import { useThemeColor } from '@/src/hooks/use-theme-color';
import React from 'react';
interface ScreenViewProps extends React.PropsWithChildren {
  backgroundColor?: string;
}

const ScreenView: React.FC<ScreenViewProps> = ({ children, backgroundColor }) => {
  const background = useThemeColor({}, 'background');
  return (
    <SafeAreaView
      style={[styles.container, { backgroundColor: backgroundColor ?? background }]}
      edges={['top', 'left', 'right']}
    >
      {children}
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
});

export default ScreenView;
