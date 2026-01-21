import React, { useRef, useEffect } from "react";
import { View, StyleSheet } from "react-native";
import PagerView from "react-native-pager-view";

export interface IPagerProps {
  children: React.ReactNode;
  onPageSelected?: (e: any) => void;
  selectedPage?: number;
  style?: any;
  scrollEnabled?: boolean;
}

const Pager: React.FC<IPagerProps> = ({
  children,
  onPageSelected,
  selectedPage,
  style,
  scrollEnabled = true,
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

  // Filter out falsy children (null, undefined, false)
  const validChildren = Array.isArray(children)
    ? children.filter(Boolean)
    : children
      ? [children]
      : [];

  return (
    <PagerView
      ref={pagerRef}
      style={[styles.container, style]}
      initialPage={selectedPage || 0}
      onPageSelected={handlePageSelected}
      scrollEnabled={scrollEnabled}
    >
      {validChildren.map((child, index) => (
        <View key={index} style={styles.page}>
          {child}
        </View>
      ))}
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
