# MyBalance — Expo App

Cross-platform mobile app (iOS, Android, Web) for MyBalance, built with React Native and Expo.

## Tech Stack

- **Framework**: Expo 58 + React Native 0.88 + React 19.3
- **Navigation**: Expo Router 58 (file-based)
- **State**: React Context + React Query v5 (TanStack)
- **Language**: TypeScript 6
- **Toolchain**: Node 26.13.0 (`.nvmrc`) + pnpm 9.4.0
- **Maps**: Mapbox (native) / Google Maps (web)
- **OCR**: MLKit (native) / Tesseract.js (web)
- **Build**: EAS Build

## Features

- Multi-account financial tracking with real-time balances
- Transaction management with split payments
- Recurring transactions with status tracking
- Monthly charts and category breakdowns
- Map view with transaction locations
- OCR receipt scanning
- iOS Shortcuts integration
- Dark/Light theme
- Offline caching via AsyncStorage
- Pull-to-refresh, haptic feedback, gestures

## Screens

| Screen          | Route                 | Description                         |
| --------------- | --------------------- | ----------------------------------- |
| Home/Dashboard  | `/dashboard/home`     | Balance cards, movements, forecasts |
| Charts          | `/dashboard/charts`   | Monthly trends, category breakdown  |
| Map             | `/dashboard/map`      | Transaction locations on map        |
| Settings        | `/dashboard/settings` | Profile, theme, notifications       |
| Add Transaction | `/add`                | Create/edit movements (modal)       |
| Accounts        | `/accounts`           | Manage accounts                     |
| Categories      | `/categories`         | Manage categories                   |
| Onboarding      | `/onboarding`         | First-time spreadsheet setup        |

## Setup

1. Create `.env.local`:

   ```env
   EXPO_PUBLIC_API_URL=http://localhost:8080
   EXPO_PUBLIC_AUTH_URL=http://localhost:8082
   EXPO_PUBLIC_GOOGLE_CLIENT_ID=<your-client-id>.apps.googleusercontent.com
   EXPO_PUBLIC_GOOGLE_REDIRECT_SCHEME=com.fabioaltea.mybalance
   EXPO_PUBLIC_GOOGLE_MAPS_API_KEY=<your-key>
   APP_VARIANT=development
   ```

2. Install and run:
   ```bash
    nvm install
    nvm use
    npm install --global pnpm@9.4.0
    pnpm install --frozen-lockfile
   npx expo start           # Start dev server
   pnpm run ios             # iOS simulator
   pnpm run android         # Android emulator
   pnpm run web             # Web browser
   ```

## Build

```bash
pnpm run build:dev              # Development build (all platforms)
pnpm run build:dev:ios          # iOS only
pnpm run build:dev:android      # Android only
pnpm run build:preview          # Internal QA
pnpm run build:production       # Store submission
```

The `ios/` project is tracked in Git, so EAS builds it without syncing values from
`app.config.js`. Keep the Xcode `Debug` bundle identifier and display name aligned
with the development variant, and `Release` aligned with production. The
`development` EAS profile explicitly selects `Debug`.

iOS now requires 16.4 or later. `AppDelegate` initializes the React Native factory;
`SceneDelegate` and the scene manifest handle window creation and lifecycle events
through Expo. The former Expo Router 55 patch for iOS 15 is no longer needed.

EAS profiles pin Node 26.13.0. Xcode Cloud installs the version in `.nvmrc`, verifies
the archive checksum, and installs the package manager pinned in `package.json`.
Node 26 does not bundle Corepack. Select a compatible Xcode image explicitly in
the Cloud workflow; the local Xcode version does not configure Cloud.

This migration goes directly from SDK 55 to 58, including the cumulative SDK 56
and 57 changes: Router-owned navigation providers, readonly React Native style
types, component refs, Reanimated Swipeable, and explicit Expo config plugins.
Web output remains static. Android is not tracked and must be generated with the
new SDK; do not reuse an old local native directory for release validation.

Since SDK 57, prebuild cleans native projects by default. Do not run a clean
prebuild over the tracked iOS project without reviewing the loss of native
customizations, including Mapbox hooks and Xcode Cloud scripts.

When upgrading an existing hoisted pnpm installation, use a clean dependency
installation if codegen resolves an older nested version. React Native and its
resolved `@react-native/codegen` must both be 0.88.1. The CocoaPods lock must also
resolve `React-Core-prebuilt` to 0.88.1 before compiling.

Mapbox requires `@rnmapbox/maps` 10.3.16 or later in the 10.x series. The local
simulator build exposed an incompatible positional `LayoutMetrics` initializer
in 10.3.5 after React Native added `fontSizeMultiplier`. Version 10.3.16 copies
the layout metrics instead, preserving the new field. The package and pod locks
include this upstream fix; the complete archive still needs Cloud validation.

The OCR package `@infinitered/react-native-mlkit-text-recognition` 5.0.1 uses a
pnpm patch to qualify `MLKitTextRecognitionCommon.Text`, avoiding ambiguous Swift
type lookup with the Expo 58 imports. Commit the patch in `patches/` together
with `package.json` and `pnpm-lock.yaml`; Cloud applies it during installation.
Review and remove the patch when upgrading to an upstream release with the fix.

Before release, validate cold start, OAuth callback, token refresh, notification
deep links, Mapbox, receipt OCR, and swipe deletion on a development build, then
on TestFlight. Use a test account and spreadsheet for financial writes. A passing
JavaScript export does not establish native build or device compatibility.

Xcode Cloud and EAS Build maintain separate build-number counters. For a TestFlight
upload of an existing app version, set Xcode Cloud's **Next Build Number** in App
Store Connect above the latest uploaded build for that bundle identifier and app
version. The iOS `Info.plist` reads `CURRENT_PROJECT_VERSION` for `CFBundleVersion`.

## Architecture

```
app/                          # Expo Router (file-based routes)
├── _layout.tsx               # Root: providers + auth gate
├── index.tsx                 # Redirect → /dashboard/home
├── add.tsx                   # Add transaction modal
├── accounts.tsx              # Account management
├── categories.tsx            # Category management
├── onboarding.tsx            # First-time setup
└── dashboard/
    ├── home.tsx              # Main dashboard
    ├── charts.tsx            # Financial charts
    ├── map.tsx               # Map view
    └── settings.tsx          # Settings

src/
├── state/                    # React Context providers
│   ├── AuthProvider.tsx      # Auth state + Google OAuth
│   ├── DataProvider.tsx      # Financial data + derived state
│   └── PlatformProvider.tsx  # Platform detection
├── hooks/                    # Custom hooks
│   ├── useAuth.tsx           # Auth operations
│   └── useMyBalanceData.tsx  # Data queries
├── helpers/                  # API clients
│   ├── HttpHelper.ts         # Auto token refresh HTTP client
│   ├── ApiHelper.ts          # Auth API calls
│   ├── TransactionsApiHelper.ts
│   ├── AccountsApiHelper.ts
│   ├── CategoriesApiHelper.ts
│   └── AggregationsApiHelper.ts
├── components/               # UI components
│   ├── balance-card/
│   ├── movements/
│   ├── forecast-card/
│   └── ui/
└── views/                    # Screen implementations
    ├── home-view.tsx
    ├── add-view.native.tsx / add-view.web.tsx
    ├── map-view.native.tsx / map-view.web.tsx
    └── ...
```

## Bundle IDs

- Production: `com.fabioaltea.mybalance`
- Development: `com.fabioaltea.mybalance.dev`
