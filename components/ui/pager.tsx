import React, { useRef, useEffect } from "react";
import { View, StyleSheet } from "react-native";
import PagerView from "react-native-pager-view";

export interface IPagerProps {
  children: React.ReactNode;
  onPageSelected?: (e: any) => void;
  selectedPage?: number;
  style?: any;
}

const Pager: React.FC<IPagerProps> = ({
  children,
  onPageSelected,
  selectedPage,
  style,
}) => {
  const pagerRef = useRef<PagerView>(null);

  const handlePageSelected = (e: any) => {
    if (onPageSelected) {
      onPageSelected(e.nativeEvent.position);
    }
  };

  // Move to selected page when selectedPage prop changes
  useEffect(() => {
    if (selectedPage !== undefined && pagerRef.current) {
      pagerRef.current.setPage(selectedPage);
    }
  }, [selectedPage]);

  return (
    <PagerView
      ref={pagerRef}
      style={[styles.container, style]}
      initialPage={selectedPage || 0}
      onPageSelected={handlePageSelected}
    >
      {Array.isArray(children) ? (
        children.map((child, index) => (
          <View key={index} style={styles.page}>
            {child}
          </View>
        ))
      ) : (
        <View style={styles.page}>{children}</View>
      )}
    </PagerView>
  );
};

const styles = StyleSheet.create({
  container: {
    height: 120, // Default height, can be overridden by style prop
  },
  page: {
    flex: 1,
    paddingHorizontal: 16,
  },
});

export default Pager;
