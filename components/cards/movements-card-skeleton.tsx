import React from "react";
import { View, StyleSheet } from "react-native";
import Card from "../card";
import Skeleton from "../ui/skeleton";
import { useThemeColor } from "@/hooks/use-theme-color";

interface MovementsCardSkeletonProps {
  itemCount?: number;
}

const MovementsCardSkeleton: React.FC<MovementsCardSkeletonProps> = ({
  itemCount = 5
}) => {
  const borderColor = useThemeColor(
    { light: "#F0F0F0", dark: "#333333" },
    "tabIconDefault"
  );

  return (
    <Card label="">
      {Array.from({ length: itemCount }).map((_, index) => (
        <View
          key={index}
          style={[
            styles.movementItem,
            { borderBottomColor: borderColor },
            index === itemCount - 1 && styles.lastMovementItem,
          ]}
        >
          {/* Icon placeholder */}
          <Skeleton
            width={50}
            height={50}
            borderRadius={25}
            style={styles.iconSkeleton}
          />

          {/* Info placeholder */}
          <View style={styles.movementInfo}>
            <Skeleton width={80} height={14} borderRadius={4} />
            <Skeleton
              width={140}
              height={18}
              borderRadius={4}
              style={{ marginTop: 4 }}
            />
          </View>

          {/* Amount placeholder */}
          <Skeleton width={70} height={18} borderRadius={4} />
        </View>
      ))}
    </Card>
  );
};

const styles = StyleSheet.create({
  movementItem: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: 10,
    borderBottomWidth: 1,
  },
  lastMovementItem: {
    borderBottomWidth: 0,
  },
  iconSkeleton: {
    marginRight: 16,
  },
  movementInfo: {
    flex: 1,
  },
});

export default MovementsCardSkeleton;
