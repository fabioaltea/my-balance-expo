# Test API Refresh Token

Questo documento spiega come testare l'API di refresh del token.

## Panoramica

L'API di refresh del token si trova in [HttpHelper.ts:23-58](helpers/HttpHelper.ts#L23-L58) e viene utilizzata automaticamente dal sistema quando l'access token è scaduto.

## Come testare

### Metodo 1: Script di test diretto

1. **Ottieni i tuoi token e device ID dall'app**

   - Esegui l'app e fai login
   - Controlla i log per vedere i token salvati
   - Oppure usa React Native Debugger per ispezionare AsyncStorage

2. **Esegui lo script di test**

   ```bash
   npx tsx test-refresh-token.ts <REFRESH_TOKEN> <DEVICE_ID>
   ```

   Oppure usando variabili d'ambiente:

   ```bash
   REFRESH_TOKEN="eyJhbG..." DEVICE_ID="abc123" npx tsx test-refresh-token.ts
   ```

### Metodo 2: Modificare temporaneamente l'access token per forzare il refresh

1. **Crea un access token scaduto artificialmente**

   - Modifica temporaneamente [HttpHelper.ts:73](helpers/HttpHelper.ts#L73)
   - Cambia la condizione per forzare sempre il refresh:
     ```typescript
     if (true) { // Forza sempre il refresh per il test
       console.log("⚠️ Access token expired, attempting refresh...");
     ```

2. **Esegui l'app normalmente**

   - Fai login
   - Ogni richiesta API forzerà un refresh del token
   - Controlla i log per vedere il processo di refresh

3. **Ripristina il codice originale dopo il test**

### Metodo 3: Usare curl per testare direttamente l'endpoint

```bash
curl -X POST http://localhost:8080/auth/refresh \
  -H "Content-Type: application/json" \
  -d '{
    "refreshToken": "YOUR_REFRESH_TOKEN",
    "deviceId": "YOUR_DEVICE_ID"
  }'
```

## Cosa controlla lo script di test

Lo script [test-refresh-token.ts](test-refresh-token.ts) esegue i seguenti controlli:

1. Analizza il refresh token fornito (decodifica JWT)
2. Verifica che non sia scaduto
3. Chiama l'endpoint `/auth/refresh` con il refresh token e device ID
4. Verifica la risposta dell'API
5. Analizza i nuovi token ricevuti (access token e refresh token)
6. Confronta i token vecchi e nuovi
7. Valida il nuovo access token chiamando `/auth/profile`
8. Mostra un riepilogo dettagliato dei risultati

## Output atteso

Un test di successo mostra:

```
🧪 Starting Token Refresh Test

📍 API URL: http://localhost:8080
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

1️⃣  Analyzing refresh token...
   Token preview: eyJhbGciOiJIUzI1NiIsInR5cCI6...
   Token payload:
   - Issued at: 1/5/2026, 10:30:00 AM
   - Expires at: 2/4/2026, 10:30:00 AM
   - User ID: 123
   - Status: ✅ Valid

2️⃣  Device ID: abc123

3️⃣  Calling refresh token API...
   Endpoint: http://localhost:8080/auth/refresh
   Method: POST

   Response Status: 200 OK
   Response Time: 150ms

✅ Token refresh successful!
   New Access Token: eyJhbGciOiJIUzI1NiIsInR5cCI6...
   New Refresh Token: eyJhbGciOiJIUzI1NiIsInR5cCI6...

4️⃣  Analyzing new tokens...

   Access Token:
   - Issued at: 1/5/2026, 11:00:00 AM
   - Expires at: 1/5/2026, 11:15:00 AM
   - TTL: 15 minutes

   Refresh Token:
   - Issued at: 1/5/2026, 11:00:00 AM
   - Expires at: 2/4/2026, 11:00:00 AM
   - TTL: 30 days

5️⃣  Comparing tokens...
   Old refresh token != New access token: ✅ Yes
   Old refresh token != New refresh token: ✅ Yes

6️⃣  Testing new access token with /auth/profile...
   Profile endpoint status: 200
✅ New access token is valid!
   User info:
   - Email: user@example.com
   - User ID: 123
   - Spreadsheet ID: 1A2B3C...

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
📊 TEST SUMMARY
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
✅ Refresh API call successful
✅ New access token received
✅ New refresh token received
✅ New access token validated with profile endpoint
⏱️  Response Time: 150ms
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

💾 Your new tokens:

Access Token:
eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...

Refresh Token:
eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
```

## Risoluzione problemi

### "Refresh token is expired"

Il refresh token che hai fornito è scaduto. Devi fare login di nuovo nell'app per ottenere nuovi token.

### "No valid authentication token available"

Il refresh token non è valido o l'API ha rifiutato la richiesta. Verifica:
- Che il refresh token sia corretto
- Che il device ID corrisponda a quello usato durante il login
- Che l'API sia in esecuzione

### "New access token validation failed"

Il nuovo access token è stato ricevuto ma non funziona con l'endpoint `/auth/profile`. Questo potrebbe indicare un problema con la generazione dei token nel backend.

## Implementazione automatica

Il sistema di refresh automatico è implementato in [HttpHelper.ts:63-107](helpers/HttpHelper.ts#L63-L107) e viene utilizzato automaticamente da tutti i metodi HTTP (GET, POST, PUT, DELETE).

Il flusso è il seguente:

1. Prima di ogni richiesta, `getValidAccessToken()` controlla se l'access token è scaduto
2. Se è scaduto, chiama automaticamente `refreshTokensViaApi()`
3. I nuovi token vengono salvati nello storage
4. La richiesta originale viene eseguita con il nuovo access token

Questo significa che l'app non dovrebbe mai ricevere errori 401 dovuti a token scaduti, finché il refresh token è valido.
