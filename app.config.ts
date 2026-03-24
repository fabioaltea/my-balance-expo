import { ExpoConfig, ConfigContext } from "expo/config";

const IS_DEV = process.env.APP_VARIANT === "development";

const getAppName = () => {
  if (IS_DEV) return "My Balance (Dev)";
  return "My Balance";
};

const getBundleIdentifier = () => {
  if (IS_DEV) return "com.fabioaltea.mybalance.dev";
  return "com.fabioaltea.mybalance";
};

const getGoogleOAuthScheme = () => {
  // The redirect scheme is based on the reversed client ID from Google Cloud Console
  // Dev and prod have different client IDs, so different schemes
  return process.env.EXPO_PUBLIC_GOOGLE_REDIRECT_SCHEME || "com.fabioaltea.mybalance";
};

const getIcon = () => {
  if (IS_DEV) return "./assets/images/icon-dev.png";
  return "./assets/images/icon.png";
};

export default ({ config }: ConfigContext): ExpoConfig => ({
  ...config,
  name: getAppName(),
  slug: "mybalance",
  owner: "fabioaltea",
  version: "0.0.3",
  orientation: "portrait",
  icon: getIcon(),
  scheme: "mybalance",
  userInterfaceStyle: "automatic",
  newArchEnabled: true,
  ios: {
    supportsTablet: true,
    bundleIdentifier: getBundleIdentifier(),
    config: {
      googleMapsApiKey: process.env.EXPO_PUBLIC_GOOGLE_MAPS_API_KEY,
    },
    infoPlist: {
      CFBundleURLTypes: [
        {
          CFBundleURLName: "google-oauth",
          CFBundleURLSchemes: [getGoogleOAuthScheme()],
        },
      ],
      ITSAppUsesNonExemptEncryption: false,
    },
  },
  android: {
    adaptiveIcon: {
      backgroundColor: "#E6F4FE",
      foregroundImage: "./assets/images/android-icon-foreground.png",
      backgroundImage: "./assets/images/android-icon-background.png",
      monochromeImage: "./assets/images/android-icon-monochrome.png",
    },
    edgeToEdgeEnabled: true,
    package: getBundleIdentifier(),
  },
  web: {
    output: "static",
    favicon: "./assets/images/favicon.png",
    title: "My Balance",
  },
  plugins: [
    [
      "expo-router",
      {
        origin: IS_DEV ? "http://localhost:8081" : "https://app.mybalance.tech",
      },
    ],
    [
      "expo-splash-screen",
      {
        image: "./assets/images/splash-icon.png",
        imageWidth: 200,
        resizeMode: "contain",
        backgroundColor: "#ffffff",
        dark: {
          backgroundColor: "#000000",
        },
      },
    ],
    "@react-native-community/datetimepicker",
    [
      "@rnmapbox/maps",
      {
        RNMapboxMapsVersion: "11.15.2",
        RNMapboxMapsDownloadToken: process.env.MAPBOX_SECRET_TOKEN,
      },
    ],
  ],
  experiments: {
    typedRoutes: true,
    reactCompiler: true,
  },
  extra: {
    router: {},
    eas: {
      projectId: "2d2413da-2b7d-4cab-8be2-dc832515bde8",
    },
    mapboxToken: process.env.MAPBOX_SECRET_TOKEN,
  },
});
