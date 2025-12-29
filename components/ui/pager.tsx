import React from "react";
import { View, StyleSheet } from "react-native";
import PagerView from "react-native-pager-view";

export interface IPagerProps {
  children: React.ReactNode;
  onPageSelected?: (e: any) => void;
  selectedPage?: number; 
}

const Pager: React.FC<IPagerProps> = ({ children, onPageSelected, selectedPage }) => {
    const handlePageSelected = (e: any) => {
        console.log("Page selected:", e.nativeEvent.position);
        if (onPageSelected) {
            onPageSelected(e.nativeEvent.position);
        }
    }

  return (
    <PagerView style={[styles.container, { height:150 }]} initialPage={selectedPage || 0} onPageSelected={handlePageSelected}>
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
