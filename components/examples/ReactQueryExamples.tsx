/**
 * Example component demonstrating React Query usage
 * 
 * This file serves as a reference for developers on how to use
 * the new React Query hooks in components.
 * 
 * DO NOT USE IN PRODUCTION - This is a reference example only
 */

import React, { useState } from 'react';
import { View, Text, Button, ActivityIndicator, FlatList, StyleSheet } from 'react-native';

// Import query hooks
import { useTransactions, useAccounts, useCategories } from '@/hooks/queries';
import { useMonthlyAggregations } from '@/hooks/queries/useAggregations';

// Import mutation hooks
import { useAddTransaction, useUpdateTransaction, useDeleteTransaction } from '@/hooks/mutations';

/**
 * Example 1: Basic data fetching with React Query
 */
export function TransactionsListExample() {
  // Fetch transactions - React Query handles loading, error, and data states
  const { data: transactions, isLoading, error, refetch } = useTransactions();

  if (isLoading) {
    return (
      <View style={styles.center}>
        <ActivityIndicator size="large" color="#2F4F3F" />
        <Text>Loading transactions...</Text>
      </View>
    );
  }

  if (error) {
    return (
      <View style={styles.center}>
        <Text style={styles.error}>Error: {error.message}</Text>
        <Button title="Retry" onPress={() => refetch()} />
      </View>
    );
  }

  return (
    <FlatList
      data={transactions}
      keyExtractor={(item) => item.transactionId}
      renderItem={({ item }) => (
        <View style={styles.item}>
          <Text>{item.description}</Text>
          <Text>{item.amount} €</Text>
        </View>
      )}
    />
  );
}

/**
 * Example 2: Optimistic mutation with instant UI update
 */
export function AddTransactionExample() {
  const [description, setDescription] = useState('');
  const [amount, setAmount] = useState('');

  // Mutation hook with optimistic updates
  const { mutate: addTransaction, isPending, isError } = useAddTransaction();

  const handleSubmit = () => {
    addTransaction({
      movementId: `mov-${Date.now()}`,
      date: new Date().toLocaleDateString('en-GB'), // dd-MM-yyyy
      description,
      amount: parseFloat(amount),
      type: 'expense',
      account: 'Main Account',
      category: 'General',
    }, {
      onSuccess: () => {
        // Clear form on success
        setDescription('');
        setAmount('');
        console.log('Transaction added successfully!');
      },
      onError: (error) => {
        console.error('Failed to add transaction:', error);
      }
    });
  };

  return (
    <View style={styles.form}>
      <Text style={styles.title}>Add Transaction</Text>
      
      {/* Form inputs would go here */}
      
      <Button 
        title={isPending ? "Adding..." : "Add Transaction"}
        onPress={handleSubmit}
        disabled={isPending || !description || !amount}
      />
      
      {isError && (
        <Text style={styles.error}>Failed to add transaction. Please try again.</Text>
      )}
    </View>
  );
}

/**
 * Example 3: Combining multiple queries
 */
export function DashboardExample() {
  // Fetch multiple resources in parallel
  const { data: transactions, isLoading: transactionsLoading } = useTransactions();
  const { data: accounts, isLoading: accountsLoading } = useAccounts();
  const { data: categories, isLoading: categoriesLoading } = useCategories();

  const isLoading = transactionsLoading || accountsLoading || categoriesLoading;

  if (isLoading) {
    return <ActivityIndicator size="large" />;
  }

  return (
    <View style={styles.dashboard}>
      <Text style={styles.stat}>Transactions: {transactions?.length || 0}</Text>
      <Text style={styles.stat}>Accounts: {accounts?.length || 0}</Text>
      <Text style={styles.stat}>Categories: {categories?.length || 0}</Text>
    </View>
  );
}

/**
 * Example 4: Update and Delete operations
 */
export function TransactionActionsExample({ transactionId }: { transactionId: string }) {
  const { mutate: updateTransaction, isPending: isUpdating } = useUpdateTransaction();
  const { mutate: deleteTransaction, isPending: isDeleting } = useDeleteTransaction();

  const handleUpdate = () => {
    updateTransaction({
      transactionId,
      description: 'Updated description',
      amount: 150,
    }, {
      onSuccess: () => console.log('Transaction updated'),
    });
  };

  const handleDelete = () => {
    if (confirm('Are you sure you want to delete this transaction?')) {
      deleteTransaction({ transactionId }, {
        onSuccess: () => console.log('Transaction deleted'),
      });
    }
  };

  return (
    <View style={styles.actions}>
      <Button 
        title={isUpdating ? "Updating..." : "Update"} 
        onPress={handleUpdate}
        disabled={isUpdating || isDeleting}
      />
      <Button 
        title={isDeleting ? "Deleting..." : "Delete"} 
        onPress={handleDelete}
        disabled={isUpdating || isDeleting}
        color="red"
      />
    </View>
  );
}

/**
 * Example 5: Using aggregations for charts
 */
export function IncomeExpenseChartExample() {
  const { data: aggregations, isLoading } = useMonthlyAggregations(
    '2024-01-01',
    '2024-12-31'
  );

  if (isLoading) {
    return <ActivityIndicator />;
  }

  return (
    <View style={styles.chart}>
      <Text style={styles.title}>Monthly Income vs Expenses</Text>
      {aggregations?.map((agg) => (
        <View key={agg.month} style={styles.chartRow}>
          <Text>{agg.month}</Text>
          <Text style={styles.income}>+{agg.income}€</Text>
          <Text style={styles.expense}>-{agg.expense}€</Text>
        </View>
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  center: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  error: {
    color: 'red',
    marginBottom: 10,
  },
  item: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    padding: 15,
    borderBottomWidth: 1,
    borderBottomColor: '#eee',
  },
  form: {
    padding: 20,
  },
  title: {
    fontSize: 20,
    fontWeight: 'bold',
    marginBottom: 15,
  },
  dashboard: {
    padding: 20,
  },
  stat: {
    fontSize: 16,
    marginBottom: 10,
  },
  actions: {
    flexDirection: 'row',
    gap: 10,
    padding: 10,
  },
  chart: {
    padding: 20,
  },
  chartRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: 8,
  },
  income: {
    color: 'green',
  },
  expense: {
    color: 'red',
  },
});
