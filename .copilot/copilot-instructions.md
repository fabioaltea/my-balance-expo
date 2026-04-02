# MyBalance Expo — Copilot Instructions

## Security Rules

- **NEVER read, open, display, or access `.env`, `.env.*`, or any file containing secrets/API keys.**
- Do not log, output, or reference the content of environment variable files.
- If a user asks to read a `.env` file, remind them that this is blocked by project policy.

## Project Context

This is the **MyBalance Expo App** — a cross-platform mobile app (iOS, Android, Web) for personal finance tracking. Part of the **MySuite** platform. Uses Google Sheets as data store via the MyBalance API.

## Tech Stack

- **Framework**: Expo 54 + React Native 0.81 + React 19 + TypeScript 5.9
- **Navigation**: Expo Router v6 (file-based routing in `app/` directory)
- **State**: React Context (Auth, Data, Platform) + React Query v5 (TanStack)
- **Maps**: Mapbox native (@rnmapbox/maps) / Google Maps web (@react-google-maps/api)
- **OCR**: MLKit native / Tesseract.js web
- **Build**: EAS Build
- **Bundle ID**: `com.fabioaltea.mybalance` (`.dev` for development)

## Architecture

```
app/                          # Expo Router file-based routes
├── _layout.tsx               # Root: providers chain + auth gate
├── dashboard/home|charts|map|settings.tsx  # Tab screens
├── add.tsx, accounts.tsx, categories.tsx    # Modal screens
└── onboarding.tsx            # First-time setup

src/
├── state/                    # React Context providers
│   ├── AuthProvider.tsx      # Auth state, Google OAuth, mode (dashboard/quickstart/migration)
│   ├── DataProvider.tsx      # Financial data, derived state (movements, forecasts)
│   └── PlatformProvider.tsx  # Platform/device/orientation detection
├── hooks/                    # useAuth, useMyBalanceData, useSpreadsheetQuery
├── helpers/                  # API clients
│   ├── HttpHelper.ts         # Auto JWT refresh on 401, token injection
│   ├── TransactionsApiHelper.ts, AccountsApiHelper.ts, etc.
│   └── OCRHelper.native.ts / OCRHelper.web.ts
├── components/               # UI components (balance-card, movements, forecast-card, ui/)
└── views/                    # Screen implementations (*.native.tsx / *.web.tsx variants)
```

## Key Patterns

- **Auth flow**: Google OAuth with PKCE → code exchange via AuthService → JWT tokens stored in AsyncStorage
- **HttpHelper**: Intercepts 401 → refreshes JWT via `POST /auth/refresh` → retries request
- **React Query**: 5min stale for transactions, 60min for accounts/categories, AsyncStorage persistence
- **Platform variants**: `.native.tsx` / `.web.tsx` / `.ios.tsx` / `.android.tsx` for platform-specific code
- **Optimistic updates**: Mutations update cache immediately, rollback on error
- **Provider chain**: PlatformProvider → QueryProvider → AuthProvider → DataProvider

## Build Commands

```bash
pnpm install
npx expo start              # Dev server
pnpm run ios|android|web    # Platform-specific
pnpm run build:dev          # EAS development build
pnpm run build:production   # Store submission
```
