import React from "react";
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ActivityIndicator,
  Alert,
  Image
} from "react-native";
import { LinearGradient } from "expo-linear-gradient";
import { Ionicons } from "@expo/vector-icons";
import { useAuthContext } from "../state/AuthProvider";

const LoginScreen: React.FC = () => {
  const { loginWithGoogle, isLoading, error, clearError } = useAuthContext();

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

  const handleDismissError = () => {
    clearError();
  };

  return (
    <LinearGradient colors={["#2F4F3F", "#0c2d1cff"]} style={styles.container}>
      <View style={styles.content}>
        {/* Logo/Title */}
        <View style={styles.header}>
          <Image
            source={require("../assets/images/icon.png")}
            style={styles.logo}
          />
          <Text style={styles.title}>MyBalance</Text>
          <Text style={styles.subtitle}>Your personal finance tracker</Text>
        </View>

        {/* Login Button */}
        <View style={styles.loginSection}>
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
          {error && (
            <View style={styles.errorContainer}>
              <View style={[styles.errorContent]}>
                <View style={styles.errorHeader}>
                  <Text style={styles.errorText}>{error}</Text>
                  <TouchableOpacity
                    onPress={handleDismissError}
                    style={styles.errorCloseButton}
                  >
                    <Ionicons name="close" size={20} color="white" />
                  </TouchableOpacity>
                </View>
              </View>
            </View>
          )}
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
  logo: {
    width: 100,
    height: 100,
    marginBottom: 16,
    borderRadius: 20,
  },
  loginSection: {
    width: "100%",
    alignItems: "center",
    marginBottom: 40,
  },
  errorContainer: {
    marginBottom: 16,
    display: "flex",
    justifyContent: "center",
    minWidth:400
  },
  errorContent: {
    backgroundColor: "rgba(255, 0, 0, 0.1)",
    borderColor: "rgba(255, 0, 0, 0.3)",
    borderWidth: 1,
    borderRadius: 12,
    paddingVertical: 12,
    paddingHorizontal: 16,
    display: "flex",
    alignItems: "center",
    width: "auto",
  },
  errorHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  errorText: {
    color: "white",
    fontSize: 14,
    flex: 1,
    paddingRight: 8,
    textOverflow: "wrap",
  },
  errorCloseButton: {
    padding: 4,
  },
  loginButton: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "rgba(255,255,255,0.2)",
    paddingHorizontal: 24,
    borderRadius: 12,
    paddingVertical: 16,
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
  features: {},
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
