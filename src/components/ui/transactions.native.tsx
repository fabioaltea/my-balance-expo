import {
  View,
  StyleSheet,
  Pressable,
  Animated,
  LayoutAnimation,
  Platform,
  UIManager,
} from 'react-native';
import { useThemeColor } from '@/src/hooks/use-theme-color';
import * as Haptics from 'expo-haptics';
import React, { useRef } from 'react';
import { Swipeable, GestureHandlerRootView } from 'react-native-gesture-handler';
import IconSymbol from './icon-symbol';
import { ThemedText } from '../core/themed-text.native';

export interface ITransaction {
  id: number;
  accountName: string;
  amount: number;
  type: 'income' | 'expense';
  // Original IDs from backend (for update operations)
  transactionID?: string;
  movementID?: string;
}

interface ITransactionsProps {
  transactions: ITransaction[];
  onTransactionPress: (transaction: ITransaction) => void;
  onAddPress: () => void;
  onDeletePress?: (transaction: ITransaction) => void;
}

interface TransactionRowProps {
  transaction: ITransaction;
  onPress: () => void;
  onDelete: () => void;
  borderColor: string;
  textColor: string;
}

const TransactionRow: React.FC<TransactionRowProps> = ({
  transaction,
  onPress,
  onDelete,
  borderColor,
  textColor,
}) => {
  const swipeableRef = useRef<Swipeable>(null);
  const translateX = useRef(new Animated.Value(0)).current;

  // Enable native LayoutAnimation on Android
  if (Platform.OS === 'android' && UIManager.setLayoutAnimationEnabledExperimental) {
    UIManager.setLayoutAnimationEnabledExperimental(true);
  }

  const formatAmount = (amount: number, type: 'income' | 'expense') => {
    const formattedAmount = amount.toFixed(2).replace('.', ',');
    const prefix = type === 'income' ? '+ ' : '- ';
    return `${prefix}${formattedAmount}€`;
  };

  const handleDelete = () => {
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning);
    // Complete the left scroll, then collapse upwards and remove
    // Finish left swipe natively (transform) then collapse using LayoutAnimation
    Animated.timing(translateX, {
      toValue: -240,
      duration: 220,
      useNativeDriver: true,
    }).start(() => {
      LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
      onDelete();
    });
  };

  const renderRightActions = (
    progress: Animated.AnimatedInterpolation<number>,
    dragX: Animated.AnimatedInterpolation<number>,
  ) => {
    // Show the trash only after a sufficient left swipe
    const showThreshold = -60; // reveal after amount/content has slid left

    // Container (red button) visibility: hidden until threshold is crossed
    const containerOpacity = dragX.interpolate({
      inputRange: [-120, showThreshold, showThreshold + 0.001, 0],
      outputRange: [1, 1, 0, 0],
      extrapolate: 'clamp',
    });

    const scale = dragX.interpolate({
      inputRange: [-120, showThreshold, 0],
      outputRange: [1, 1, 0.5],
      extrapolate: 'clamp',
    });

    const opacity = dragX.interpolate({
      // Keep hidden until the threshold is crossed
      inputRange: [-120, -80, showThreshold, 0],
      outputRange: [1, 1, 0, 0],
      extrapolate: 'clamp',
    });

    return (
      <Animated.View style={[styles.deleteAction, { opacity: containerOpacity }]}>
        <Pressable onPress={handleDelete} style={styles.deleteContent}>
          <Animated.View style={[styles.deleteContent, { transform: [{ scale }], opacity }]}>
            <IconSymbol name="delete" size={22} color="#fff" />
          </Animated.View>
        </Pressable>
      </Animated.View>
    );
  };

  return (
    <Swipeable
      ref={swipeableRef}
      renderRightActions={renderRightActions}
      rightThreshold={40}
      overshootRight={false}
      onSwipeableOpen={(direction) => {
        if (direction === 'right') {
          handleDelete();
        }
      }}
    >
      <Animated.View style={[styles.animatedContainer, { transform: [{ translateX }] }]}>
        <Pressable
          onPress={onPress}
          style={[styles.transactionRow, { borderBottomColor: borderColor }]}
        >
          <View style={styles.transactionContent}>
            <ThemedText style={styles.accountName}>{transaction.accountName}</ThemedText>
            <ThemedText
              style={[
                styles.amount,
                {
                  color: transaction.type === 'income' ? '#22c55e' : '#ef4444',
                },
              ]}
            >
              {formatAmount(transaction.amount, transaction.type)}
            </ThemedText>
          </View>
          {/* <IconSymbol
            name="chevron.right"
            size={16}
            color={textColor}
            style={styles.chevron}
          /> */}
        </Pressable>
      </Animated.View>
    </Swipeable>
  );
};

const Transactions: React.FC<ITransactionsProps> = ({
  transactions,
  onTransactionPress,
  onAddPress,
  onDeletePress,
}) => {
  // Theme colors
  const textColor = useThemeColor({ light: '#000', dark: '#fff' }, 'text');
  const borderColor = useThemeColor({ light: '#e0e0e0', dark: '#333' }, 'tabIconDefault');

  const handleTransactionPress = (transaction: ITransaction) => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    onTransactionPress(transaction);
  };

  const handleAddPress = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    onAddPress();
  };

  const handleDelete = (transaction: ITransaction) => {
    onDeletePress?.(transaction);
  };

  return (
    <GestureHandlerRootView style={styles.container}>
      {/* Transaction List */}
      {transactions.map((transaction) => (
        <TransactionRow
          key={transaction.id}
          transaction={transaction}
          onPress={() => handleTransactionPress(transaction)}
          onDelete={() => handleDelete(transaction)}
          borderColor={borderColor}
          textColor={textColor}
        />
      ))}

      {/* Add Button */}
      <Pressable onPress={handleAddPress} style={styles.addButton}>
        <IconSymbol name="add" size={24} color="#fff" />
      </Pressable>
    </GestureHandlerRootView>
  );
};

const styles = StyleSheet.create({
  container: {
    marginVertical: 0,
    paddingVertical: 5,
  },
  title: {
    fontSize: 18,
    marginBottom: 16,
  },
  transactionRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
    paddingHorizontal: 0,
    borderBottomWidth: StyleSheet.hairlineWidth,
    backgroundColor: 'transparent',
    marginBottom: 8,
  },
  transactionContent: {
    flex: 1,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  accountName: {
    fontSize: 16,
    flex: 1,
  },
  amount: {
    fontSize: 16,
    fontWeight: '600',
    marginRight: 8,
  },
  chevron: {
    opacity: 0.6,
  },
  addButton: {
    backgroundColor: '#2F4F3F',
    borderRadius: 20,
    height: 50,
    justifyContent: 'center',
    alignItems: 'center',
  },
  deleteAction: {
    backgroundColor: '#ef4444ff',
    justifyContent: 'center',
    alignItems: 'center',
    borderRadius: 20,
    marginVertical: 2,
    width: 70,
    height: 40,
  },
  deleteContent: {
    justifyContent: 'center',
    alignItems: 'center',
  },
  animatedContainer: {
    overflow: 'hidden',
  },
});

export default Transactions;
