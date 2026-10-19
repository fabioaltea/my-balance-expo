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
}

const TransactionRow: React.FC<TransactionRowProps> = ({ transaction, onPress, onDelete }) => {
  const incomeColor = useThemeColor({ light: '#25633F', dark: '#7FCF9D' }, 'tint');
  const expenseColor = useThemeColor({ light: '#A33A3A', dark: '#F09292' }, 'tint');
  const amountColor = transaction.type === 'income' ? incomeColor : expenseColor;
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
        <Pressable
          accessibilityRole="button"
          accessibilityLabel={`Delete ${transaction.accountName} transaction`}
          onPress={handleDelete}
          style={styles.deleteContent}
        >
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
          accessibilityRole="button"
          accessibilityLabel={`Edit ${transaction.accountName} transaction`}
          style={({ pressed }) => [styles.transactionRow, pressed && styles.pressed]}
        >
          <View style={[styles.transactionIcon, { backgroundColor: amountColor + '14' }]}>
            <IconSymbol
              name={transaction.type === 'income' ? 'add' : 'remove'}
              size={18}
              color={amountColor}
            />
          </View>
          <View style={styles.transactionContent}>
            <ThemedText style={styles.accountName} numberOfLines={1}>
              {transaction.accountName}
            </ThemedText>
            <ThemedText
              style={[
                styles.amount,
                {
                  color: amountColor,
                },
              ]}
            >
              {formatAmount(transaction.amount, transaction.type)}
            </ThemedText>
          </View>
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
  const accentColor = useThemeColor({ light: '#244437', dark: '#D6E8DE' }, 'tint');
  const borderColor = useThemeColor({ light: '#DFE6E1', dark: '#343C37' }, 'cardBorder');

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
        />
      ))}

      {/* Add Button */}
      <Pressable
        accessibilityRole="button"
        accessibilityLabel="Add transaction"
        onPress={handleAddPress}
        style={({ pressed }) => [styles.addButton, { borderColor }, pressed && styles.pressed]}
      >
        <IconSymbol name="add" size={20} color={accentColor} />
        <ThemedText style={[styles.addLabel, { color: accentColor }]}>Add transaction</ThemedText>
      </Pressable>
    </GestureHandlerRootView>
  );
};

const styles = StyleSheet.create({
  container: {
    marginVertical: 0,
    paddingVertical: 4,
  },
  title: {
    fontSize: 18,
    marginBottom: 16,
  },
  transactionRow: {
    flexDirection: 'row',
    alignItems: 'center',
    minHeight: 52,
    paddingVertical: 8,
    paddingHorizontal: 8,
    borderRadius: 12,
    gap: 10,
    backgroundColor: 'transparent',
    marginBottom: 6,
  },
  transactionIcon: {
    width: 32,
    height: 32,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
  },
  transactionContent: {
    flex: 1,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    gap: 10,
    minWidth: 0,
  },
  accountName: {
    fontSize: 16,
    flex: 1,
    minWidth: 0,
    fontWeight: '500',
  },
  amount: {
    fontSize: 16,
    fontWeight: '600',
    fontVariant: ['tabular-nums'],
  },
  chevron: {
    opacity: 0.6,
  },
  addButton: {
    borderWidth: 1,
    borderRadius: 14,
    minHeight: 48,
    paddingHorizontal: 12,
    flexDirection: 'row',
    gap: 8,
    justifyContent: 'center',
    alignItems: 'center',
  },
  addLabel: { fontSize: 15, fontWeight: '600' },
  pressed: { opacity: 0.65 },
  deleteAction: {
    backgroundColor: '#A33A3A',
    justifyContent: 'center',
    alignItems: 'center',
    borderRadius: 12,
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
