import AsyncStorage from '@react-native-async-storage/async-storage';
import * as Crypto from 'expo-crypto';
import type { Account } from '../types/models';
import { detectStatementAccount, suggestAccountFromHeader } from './StatementAccount';

async function associationKey(
  userId: string,
  scope: string,
  header: string | undefined,
): Promise<string | undefined> {
  const { iban } = detectStatementAccount(header);
  if (!userId || !scope || !iban) return undefined;
  const hash = await Crypto.digestStringAsync(
    Crypto.CryptoDigestAlgorithm.SHA256,
    JSON.stringify([userId, scope, iban]),
  );
  return `statement-account:v1:${hash}`;
}

export async function suggestRememberedStatementAccount(
  userId: string,
  scope: string,
  header: string | undefined,
  accounts: Account[],
): Promise<string> {
  try {
    const key = await associationKey(userId, scope, header);
    const id = key ? await AsyncStorage.getItem(key) : null;
    const remembered = accounts.find((account) => account.accountId === id);
    if (remembered) return remembered.name;
  } catch {
    /* Recognition still works without optional device preferences. */
  }
  return suggestAccountFromHeader(header, accounts);
}

export async function rememberStatementAccount(
  userId: string,
  scope: string,
  header: string | undefined,
  accountId: string,
): Promise<void> {
  try {
    const key = await associationKey(userId, scope, header);
    // Store only the chosen account ID under a hash, never the IBAN or OCR text.
    if (key && accountId) await AsyncStorage.setItem(key, accountId);
  } catch {
    /* A failed preference write must not block statement review. */
  }
}
