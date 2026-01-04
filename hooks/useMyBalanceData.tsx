import { useCallback } from "react";
import { useAuthContext } from "../state/AuthProvider";

export interface Movement {
  id: string;
  description: string;
  amount: number;
  type: "income" | "expense";
  date: Date;
  accountName: string;
  category: string;
  confirmed?: boolean;
}

export interface Account {
  id: string;
  name: string;
  type: string;
  balance: number;
  color?: string;
  textColor?: string;
  transactions?: number;
}

export interface Category {
  id: string;
  name: string;
  type: "income" | "expense";
  color?: string;
}

export const useMyBalanceData = () => {
  // Pull data and helpers from the auth context
  const {
    allTransactions,
    accountsList,
    personalCategories,
    reloadAllData,
    dashboardReady,
    error: authError,
  } = useAuthContext();

  // Convert the data from useAuth to the expected format
  const movements: Movement[] = allTransactions?.map((t: any) => ({
    id: t.transactionId || t.id || Math.random().toString(),
    description: t.description || "",
    amount: parseFloat(
      t.amount?.replace?.(/[€\s]/g, "")?.replace?.(",", ".") || "0"
    ),
    type:
      parseFloat(
        t.amount?.replace?.(/[€\s]/g, "")?.replace?.(",", ".") || "0"
      ) >= 0
        ? "income"
        : "expense",
    date: new Date(t.date || Date.now()),
    accountName: t.account || "",
    category: t.category || "",
    confirmed: true,
  }));

  const accounts: Account[] = (accountsList || []).map((a: any) => ({
    id: a.accountId || a.id || Math.random().toString(),
    name: a.name || "",
    type: "bank", // Default type
    balance: parseFloat(
      a.balance?.replace?.(/[€\s]/g, "")?.replace?.(",", ".") || "0"
    ),
    color: a.color || "#2F4F3F",
    textColor: a.textColor || "#FFFFFF",
    transactions: movements.filter((m) => m.accountName === a.name).length,
  }));

  const categories: Category[] = (personalCategories || []).map((c: any) => ({
    id: c.id || Math.random().toString(),
    name: c.name || "",
    type: "expense", // Default type
    color: c.color || "#2F4F3F",
  }));

  const refreshData = useCallback(async () => {
    console.log("🔄 Refresh data requested - delegating to auth context");
    if (reloadAllData) {
      await reloadAllData();
    }
  }, [reloadAllData]);

  return {
    movements,
    accounts,
    categories,
    isLoading: !dashboardReady, // Loading until dashboard is ready
    error: authError,
    refreshData,
  };
};
