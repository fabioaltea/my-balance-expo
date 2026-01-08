import React, { useRef, useEffect } from "react";
import { View, StyleSheet } from "react-native";
import PagerView from "react-native-pager-view";

export interface IPagerProps {
  children: React.ReactNode;
  onPageSelected?: (e: any) => void;
  selectedPage?: number;
}

const Pager: React.FC<IPagerProps> = ({
  children,
  onPageSelected,
  selectedPage,
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
      style={[styles.container, { height: 120 }]}
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
    // flex removed, height will be set dynamically
  },
  page: {
    flex: 1,
    paddingHorizontal: 16,
  },
});

export default Pager;
