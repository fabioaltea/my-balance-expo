# MyBalance — Expo App

Cross-platform mobile app (iOS, Android, Web) for MyBalance, built with React Native and Expo.

## Tech Stack

- **Framework**: Expo 54 + React Native 0.81 + React 19
- **Navigation**: Expo Router v6 (file-based)
- **State**: React Context + React Query v5 (TanStack)
- **Language**: TypeScript 5.9
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
   pnpm install
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
