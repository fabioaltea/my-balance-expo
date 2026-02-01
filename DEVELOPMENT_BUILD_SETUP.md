# MyBalance Expo - Development Build Setup

Questa guida ti aiuterà a creare una development build per abilitare l'autenticazione Google che non è supportata su Expo Go.

## Prerequisiti

1. **EAS CLI installato**:

   ```bash
   npm install -g @expo/eas-cli
   ```

2. **Account Expo**: Esegui il login con EAS CLI

   ```bash
   eas login
   ```

3. **Google OAuth Client configurato**: Avrai bisogno di un OAuth 2.0 client ID da Google Cloud Console

## Configurazione

### 1. Variabili d'ambiente

Modifica il file `.env` con i tuoi valori:

```env
EXPO_PUBLIC_GOOGLE_IOS_CLIENT_ID=your_ios_google_oauth_client_id_here
EXPO_PUBLIC_GOOGLE_WEB_CLIENT_ID=your_web_google_oauth_client_id_here
EXPO_PUBLIC_API_URL=your_api_url_here
```

### 2. Google Cloud Console Setup

1. Vai su [Google Cloud Console](https://console.cloud.google.com/)
2. Crea un nuovo progetto o seleziona uno esistente
3. Abilita l'API Google+ (o Google People API)
4. Vai su "Credentials" e crea un "OAuth 2.0 client ID"
5. Per **iOS**:
   - Tipo: iOS application
   - Bundle ID: `com.fabioaltea.mybalance`
6. Per **Android**:
   - Tipo: Android application
   - Package name: `com.fabioaltea.mybalance`
   - SHA-1 certificate fingerprint (vedi sezione sottostante)

### 3. Ottenere SHA-1 fingerprint per Android

Per development build:

```bash
keytool -keystore ~/.android/debug.keystore -list -v -alias androiddebugkey -storepass android
```

Per production build, userai la chiave di signing di EAS.

## Creazione della Development Build

### Per iOS (richiede macOS)

```bash
# Build per simulatore iOS
npm run build:dev:ios

# Oppure direttamente con EAS
eas build --profile development --platform ios
```

### Per Android

```bash
# Build APK per dispositivi Android
npm run build:dev:android

# Oppure direttamente con EAS
eas build --profile development --platform android
```

### Per entrambe le piattaforme

```bash
npm run build:dev
# oppure
eas build --profile development
```

## Installazione della Development Build

### iOS

1. **Su dispositivo fisico**:

   - Aggiungi il tuo dispositivo con: `eas device:create`
   - Scarica e installa il file `.ipa` generato dalla build

2. **Su simulatore**:
   - Scarica il file `.app` e trascinalo nel simulatore

### Android

1. **Su dispositivo fisico**:

   - Abilita l'installazione da fonti sconosciute
   - Scarica e installa l'APK generato dalla build

2. **Su emulatore**:
   - Trascina e rilascia l'APK nell'emulatore

## Avvio dell'app in Development Mode

Dopo aver installato la development build:

1. Avvia il server di sviluppo:

   ```bash
   npm start
   ```

2. Scansiona il QR code con la development build (non Expo Go)

3. L'app si caricherà e potrai usare l'autenticazione Google

## Verifica della configurazione

Per verificare che tutto sia configurato correttamente:

1. L'app dovrebbe avviarsi senza errori
2. Il pulsante di login con Google dovrebbe essere visibile
3. Premendo il pulsante, dovrebbe aprirsi la pagina di login Google
4. Dopo il login, l'app dovrebbe ricevere correttamente i token di autenticazione

## Troubleshooting

### Errore "Invalid client" durante il login Google

- Verifica che il `GOOGLE_CLIENT_ID` in `.env` sia corretto
- Assicurati che il bundle ID/package name corrisponda a quello configurato in Google Cloud Console

### L'app non si carica dopo aver installato la development build

- Verifica che il server di sviluppo sia in esecuzione (`npm start`)
- Controlla che dispositivo e computer di sviluppo siano sulla stessa rete WiFi

### Build fallita

- Verifica che tutte le dipendenze siano installate: `npm install`
- Controlla che l'account EAS sia configurato correttamente: `eas whoami`

## Script disponibili

- `npm run build:dev` - Build development per tutte le piattaforme
- `npm run build:dev:ios` - Build development solo per iOS
- `npm run build:dev:android` - Build development solo per Android
- `npm run build:preview` - Build per preview/testing
- `npm run build:production` - Build per produzione

## Prossimi passi

Una volta configurata correttamente la development build, potrai:

1. Testare l'autenticazione Google su dispositivi reali
2. Debug dell'app con tutti i log nativi
3. Utilizzare tutte le API native che non sono supportate in Expo Go
4. Preparare l'app per il rilascio in produzione
