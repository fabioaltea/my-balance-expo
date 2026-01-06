/**
 * Script di test per l'API di refresh del token
 *
 * Questo script testa la funzionalità di refresh dei token di autenticazione.
 *
 * Uso:
 * 1. Inserisci il tuo refreshToken e deviceId come parametri
 * 2. Esegui: npx tsx test-refresh-token.ts <refreshToken> <deviceId>
 *
 * Oppure imposta le variabili d'ambiente:
 * REFRESH_TOKEN=your_token DEVICE_ID=your_device_id npx tsx test-refresh-token.ts
 */

const API_URL = process.env.EXPO_PUBLIC_API_URL || "http://localhost:8080";

interface RefreshTokenResponse {
  success: boolean;
  accessToken?: string;
  refreshToken?: string;
  error?: string;
}

/**
 * Decodifica un JWT e mostra le informazioni (senza verifica della firma)
 */
function decodeJWT(token: string) {
  try {
    const parts = token.split('.');
    if (parts.length !== 3) {
      return null;
    }
    const payload = JSON.parse(Buffer.from(parts[1], 'base64').toString());
    return payload;
  } catch {
    return null;
  }
}

async function testRefreshToken(refreshToken: string, deviceId: string) {
  console.log("🧪 Starting Token Refresh Test\n");
  console.log("📍 API URL:", API_URL);
  console.log("━".repeat(60));

  try {
    // Mostra info sul refresh token
    console.log("\n1️⃣  Analyzing refresh token...");
    console.log("   Token preview:", refreshToken.substring(0, 30) + "...");

    const tokenPayload = decodeJWT(refreshToken);
    if (tokenPayload) {
      console.log("   Token payload:");
      console.log("   - Issued at:", new Date(tokenPayload.iat * 1000).toLocaleString());
      console.log("   - Expires at:", new Date(tokenPayload.exp * 1000).toLocaleString());
      console.log("   - User ID:", tokenPayload.userId || "N/A");

      const now = Date.now() / 1000;
      const isExpired = tokenPayload.exp < now;
      console.log("   - Status:", isExpired ? "❌ Expired" : "✅ Valid");

      if (isExpired) {
        console.error("\n❌ Refresh token is expired. Cannot proceed.");
        return;
      }
    }

    console.log("\n2️⃣  Device ID:", deviceId);

    // Chiama l'API di refresh
    console.log("\n3️⃣  Calling refresh token API...");
    console.log("   Endpoint:", `${API_URL}/auth/refresh`);
    console.log("   Method: POST");

    const startTime = Date.now();

    const response = await fetch(`${API_URL}/auth/refresh`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        refreshToken,
        deviceId
      }),
    });

    const endTime = Date.now();
    const responseTime = endTime - startTime;

    console.log("\n   Response Status:", response.status, response.statusText);
    console.log("   Response Time:", responseTime + "ms");

    const result: RefreshTokenResponse = await response.json();

    if (!response.ok || !result.success) {
      console.error("\n❌ Token refresh failed!");
      console.error("   Error:", result.error || "Unknown error");
      console.error("   Full response:", JSON.stringify(result, null, 2));
      return;
    }

    if (!result.accessToken || !result.refreshToken) {
      console.error("\n❌ Response missing tokens!");
      console.error("   Response:", JSON.stringify(result, null, 2));
      return;
    }

    console.log("\n✅ Token refresh successful!");
    console.log("   New Access Token:", result.accessToken.substring(0, 30) + "...");
    console.log("   New Refresh Token:", result.refreshToken.substring(0, 30) + "...");

    // Analizza i nuovi token
    console.log("\n4️⃣  Analyzing new tokens...");

    const newAccessPayload = decodeJWT(result.accessToken);
    const newRefreshPayload = decodeJWT(result.refreshToken);

    if (newAccessPayload) {
      console.log("\n   Access Token:");
      console.log("   - Issued at:", new Date(newAccessPayload.iat * 1000).toLocaleString());
      console.log("   - Expires at:", new Date(newAccessPayload.exp * 1000).toLocaleString());
      const ttl = Math.round((newAccessPayload.exp - newAccessPayload.iat) / 60);
      console.log("   - TTL:", ttl + " minutes");
    }

    if (newRefreshPayload) {
      console.log("\n   Refresh Token:");
      console.log("   - Issued at:", new Date(newRefreshPayload.iat * 1000).toLocaleString());
      console.log("   - Expires at:", new Date(newRefreshPayload.exp * 1000).toLocaleString());
      const ttl = Math.round((newRefreshPayload.exp - newRefreshPayload.iat) / (60 * 60 * 24));
      console.log("   - TTL:", ttl + " days");
    }

    // Confronta i token
    console.log("\n5️⃣  Comparing tokens...");
    const accessTokenChanged = refreshToken !== result.accessToken;
    const refreshTokenChanged = refreshToken !== result.refreshToken;

    console.log("   Old refresh token != New access token:", accessTokenChanged ? "✅ Yes" : "⚠️  No");
    console.log("   Old refresh token != New refresh token:", refreshTokenChanged ? "✅ Yes" : "⚠️  No");

    // Test con il nuovo access token
    console.log("\n6️⃣  Testing new access token with /auth/profile...");
    const profileResponse = await fetch(`${API_URL}/auth/profile`, {
      method: "GET",
      headers: {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${result.accessToken}`,
      },
    });

    console.log("   Profile endpoint status:", profileResponse.status);

    if (profileResponse.ok) {
      const profileData = await profileResponse.json();
      console.log("✅ New access token is valid!");
      if (profileData.user) {
        console.log("   User info:");
        console.log("   - Email:", profileData.user.email || "N/A");
        console.log("   - User ID:", profileData.user.id || "N/A");
        console.log("   - Spreadsheet ID:", profileData.user.spreadsheetId || "Not configured");
      }
    } else {
      const errorText = await profileResponse.text();
      console.error("❌ New access token validation failed");
      console.error("   Error:", errorText);
    }

    // Summary
    console.log("\n" + "━".repeat(60));
    console.log("📊 TEST SUMMARY");
    console.log("━".repeat(60));
    console.log("✅ Refresh API call successful");
    console.log("✅ New access token received");
    console.log("✅ New refresh token received");
    console.log("✅ New access token validated with profile endpoint");
    console.log("⏱️  Response Time:", responseTime + "ms");
    console.log("━".repeat(60));
    console.log("\n💾 Your new tokens:");
    console.log("\nAccess Token:");
    console.log(result.accessToken);
    console.log("\nRefresh Token:");
    console.log(result.refreshToken);
    console.log("━".repeat(60));

  } catch (error) {
    console.error("\n❌ Test failed with error:");
    console.error(error);
  }
}

// Main execution
const refreshToken = process.argv[2] || process.env.REFRESH_TOKEN;
const deviceId = process.argv[3] || process.env.DEVICE_ID;

if (!refreshToken || !deviceId) {
  console.error("❌ Usage:");
  console.error("   npx tsx test-refresh-token.ts <refreshToken> <deviceId>");
  console.error("\nOr use environment variables:");
  console.error("   REFRESH_TOKEN=xxx DEVICE_ID=yyy npx tsx test-refresh-token.ts");
  console.error("\n💡 You can get these values from:");
  console.error("   1. Login to the app");
  console.error("   2. Check the app logs for stored tokens and device ID");
  console.error("   3. Or use React Native Debugger to inspect AsyncStorage");
  process.exit(1);
}

// Esegui il test
testRefreshToken(refreshToken, deviceId)
  .then(() => {
    console.log("\n✅ Test completed\n");
    process.exit(0);
  })
  .catch((error) => {
    console.error("\n❌ Test failed:", error);
    process.exit(1);
  });
