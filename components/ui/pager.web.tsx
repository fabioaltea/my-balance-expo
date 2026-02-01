import React, { useRef, useEffect, useState } from "react";
import { View, ScrollView, StyleSheet, Dimensions } from "react-native";

export interface IPagerProps {
  children: React.ReactNode;
  onPageSelected?: (page: number) => void;
  selectedPage?: number;
  style?: any;
  scrollEnabled?: boolean;
}

/**
 * Web version of Pager using horizontal ScrollView.
 */
const Pager: React.FC<IPagerProps> = ({
  children,
  onPageSelected,
  selectedPage = 0,
  style,
  scrollEnabled = true,
}) => {
  const scrollRef = useRef<ScrollView>(null);
  const [pageWidth, setPageWidth] = useState(Dimensions.get("window").width);
  const [currentPage, setCurrentPage] = useState(selectedPage);

  // Filter out falsy children
  const validChildren = Array.isArray(children)
    ? children.filter(Boolean)
    : children
      ? [children]
      : [];

  // Scroll to selected page when prop changes
  useEffect(() => {
    if (selectedPage !== undefined && scrollRef.current) {
      scrollRef.current.scrollTo({
        x: selectedPage * pageWidth,
        animated: true,
      });
      setCurrentPage(selectedPage);
    }
  }, [selectedPage, pageWidth]);

  const handleLayout = (e: any) => {
    const { width } = e.nativeEvent.layout;
    setPageWidth(width);
  };

  const handleScroll = (e: any) => {
    const offsetX = e.nativeEvent.contentOffset.x;
    const page = Math.round(offsetX / pageWidth);
    if (page !== currentPage && page >= 0 && page < validChildren.length) {
      setCurrentPage(page);
      onPageSelected?.(page);
    }
  };

  return (
    <View style={[styles.container, style]} onLayout={handleLayout}>
      <ScrollView
        ref={scrollRef}
        horizontal
        pagingEnabled
        showsHorizontalScrollIndicator={false}
        scrollEnabled={scrollEnabled}
        onScroll={handleScroll}
        scrollEventThrottle={16}
        contentContainerStyle={{ width: pageWidth * validChildren.length }}
      >
        {validChildren.map((child, index) => (
          <View key={index} style={[styles.page, { width: pageWidth }]}>
            {child}
          </View>
        ))}
      </ScrollView>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    height: 120,
    overflow: "hidden",
  },
  page: {
    flex: 1,
    paddingHorizontal: 16,
  },
});

export default Pager;
