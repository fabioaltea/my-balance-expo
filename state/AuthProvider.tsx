import React, { createContext, useContext, ReactNode } from "react";
import { useAuth, AuthState } from "../hooks/useAuth";

interface AuthContextType extends AuthState {
  // Auth actions
  loginWithGoogle: () => Promise<void>;
  logout: () => Promise<void>;
  refreshTokens: () => Promise<boolean>;
  initializeAuth: () => Promise<void>;
  clearError: () => void;
  // App data exposed by useAuth
  allTransactions: any;
  accountsList: any;
  personalCategories: any;
  totalBalance: any;
  userProfile: any;
  // Data reload helper
  reloadAllData: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

interface AuthProviderProps {
  children: ReactNode;
}

export const AuthProvider: React.FC<AuthProviderProps> = ({ children }) => {
  const auth = useAuth();

  return <AuthContext.Provider value={auth}>{children}</AuthContext.Provider>;
};

export const useAuthContext = (): AuthContextType => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error("useAuthContext must be used within an AuthProvider");
  }
  return context;
};
