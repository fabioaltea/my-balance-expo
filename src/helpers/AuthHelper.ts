import * as Crypto from 'expo-crypto';

/**
 * PKCE utility functions for OAuth2 security — RFC 7636 compliant.
 * Extracted from useAuth hook.
 */
export class AuthHelper {
  /**
   * Generate a 64-character code verifier using RFC 7636 compliant characters.
   */
  static generateCodeVerifier(): string {
    const charset = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789-._~';
    let result = '';
    for (let i = 0; i < 64; i++) {
      result += charset.charAt(Math.floor(Math.random() * charset.length));
    }
    return result;
  }

  /**
   * Generate a SHA256 code challenge from a code verifier (base64url encoded).
   */
  static async generateCodeChallenge(verifier: string): Promise<string> {
    const hashBase64 = await Crypto.digestStringAsync(
      Crypto.CryptoDigestAlgorithm.SHA256,
      verifier,
      { encoding: Crypto.CryptoEncoding.BASE64 },
    );

    return hashBase64.replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
  }
}
