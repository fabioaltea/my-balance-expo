import React from "react";
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ActivityIndicator,
  Alert,
} from "react-native";
import { LinearGradient } from "expo-linear-gradient";
import { Ionicons } from "@expo/vector-icons";
import { useAuth } from "../hooks/useAuth";

const LoginScreen: React.FC = () => {
  const { loginWithGoogle, isLoading, error } = useAuth();

  const handleGoogleLogin = async () => {
    try {
      await loginWithGoogle();
    } catch (error) {
      Alert.alert(
        "Login Error",
        error instanceof Error
          ? error.message
          : "An error occurred during login"
      );
    }
  };

  return (
    <LinearGradient colors={["#667eea", "#764ba2"]} style={styles.container}>
      <View style={styles.content}>
        {/* Logo/Title */}
        <View style={styles.header}>
          <Ionicons name="wallet-outline" size={64} color="white" />
          <Text style={styles.title}>MyBalance</Text>
          <Text style={styles.subtitle}>Your personal finance tracker</Text>
        </View>

        {/* Login Button */}
        <View style={styles.loginSection}>
          {error && (
            <View style={styles.errorContainer}>
              <Text style={styles.errorText}>{error}</Text>
            </View>
          )}

          <TouchableOpacity
            style={[
              styles.loginButton,
              isLoading && styles.loginButtonDisabled,
            ]}
            onPress={handleGoogleLogin}
            disabled={isLoading}
          >
            {isLoading ? (
              <ActivityIndicator color="white" size="small" />
            ) : (
              <>
                <Ionicons name="logo-google" size={24} color="white" />
                <Text style={styles.loginButtonText}>Sign in with Google</Text>
              </>
            )}
          </TouchableOpacity>

          <Text style={styles.description}>
            Sign in to access your Google Sheets-based financial data securely.
          </Text>
        </View>

        {/* Features */}
        <View style={styles.features}>
          <View style={styles.feature}>
            <Ionicons
              name="shield-checkmark"
              size={24}
              color="rgba(255,255,255,0.8)"
            />
            <Text style={styles.featureText}>
              Your data stays in Google Sheets
            </Text>
          </View>
          <View style={styles.feature}>
            <Ionicons name="sync" size={24} color="rgba(255,255,255,0.8)" />
            <Text style={styles.featureText}>Real-time synchronization</Text>
          </View>
          <View style={styles.feature}>
            <Ionicons
              name="analytics"
              size={24}
              color="rgba(255,255,255,0.8)"
            />
            <Text style={styles.featureText}>Comprehensive analytics</Text>
          </View>
        </View>
      </View>
    </LinearGradient>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  content: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    paddingHorizontal: 32,
  },
  header: {
    alignItems: "center",
    marginBottom: 60,
  },
  title: {
    fontSize: 32,
    fontWeight: "bold",
    color: "white",
    marginTop: 16,
    marginBottom: 8,
  },
  subtitle: {
    fontSize: 16,
    color: "rgba(255,255,255,0.8)",
    textAlign: "center",
  },
  loginSection: {
    width: "100%",
    alignItems: "center",
    marginBottom: 40,
  },
  errorContainer: {
    backgroundColor: "rgba(255, 0, 0, 0.1)",
    borderColor: "rgba(255, 0, 0, 0.3)",
    borderWidth: 1,
    borderRadius: 8,
    padding: 12,
    marginBottom: 16,
    width: "100%",
  },
  errorText: {
    color: "white",
    fontSize: 14,
    textAlign: "center",
  },
  loginButton: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "rgba(255,255,255,0.2)",
    paddingHorizontal: 24,
    paddingVertical: 16,
    borderRadius: 12,
    marginBottom: 16,
    minWidth: 200,
    justifyContent: "center",
  },
  loginButtonDisabled: {
    opacity: 0.6,
  },
  loginButtonText: {
    color: "white",
    fontSize: 16,
    fontWeight: "600",
    marginLeft: 12,
  },
  description: {
    color: "rgba(255,255,255,0.7)",
    fontSize: 14,
    textAlign: "center",
    maxWidth: 280,
  },
  features: {
    width: "100%",
    maxWidth: 300,
  },
  feature: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 16,
  },
  featureText: {
    color: "rgba(255,255,255,0.8)",
    fontSize: 14,
    marginLeft: 12,
  },
});

export default LoginScreen;
