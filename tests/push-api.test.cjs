const { test } = require('node:test');
const assert = require('node:assert/strict');
const path = require('node:path');
const { load } = require('./load-ts.cjs');
const file = name => path.join(__dirname, '../src/helpers', name + '.ts');
test('push API refreshes once on 401 and preserves auth on network failures', async () => {
  let attempts = 0, refreshFlags = [], loggedOut = 0;
  class AuthenticationError extends Error {}
  const { PushApiHelper } = load(file('PushApiHelper'), {
    './HttpHelper': { HttpHelper: { authUri: 'https://mock.test', getValidAccessToken: async force => { refreshFlags.push(force); return 'current'; }, handleUnauthorized: async () => { loggedOut++; } }, AuthenticationError },
    './AuthStorageHelper': { AuthStorageHelper: { getTokens: async () => ({ accessToken: 'current' }) } },
  }, { fetch: async () => ({ status: ++attempts === 1 ? 401 : 200, ok: attempts > 1,
    json: async () => attempts === 1 ? { code: 'TOKEN_EXPIRED' } : { success: true, data: { enabled: true } } }) });
  assert.equal((await PushApiHelper.get()).enabled, true); assert.deepEqual(refreshFlags, [false, true]); assert.equal(loggedOut, 0);
});
test('late 401 for a previous session never logs out the new account', async () => {
  let loggedOut = false; class AuthenticationError extends Error {}
  const { PushApiHelper } = load(file('PushApiHelper'), {
    './HttpHelper': { HttpHelper: { authUri: 'https://mock.test', getValidAccessToken: async () => 'old', handleUnauthorized: async () => { loggedOut = true; } }, AuthenticationError },
    './AuthStorageHelper': { AuthStorageHelper: { getTokens: async () => ({ accessToken: 'new' }) } },
  }, { fetch: async () => ({ status: 401, json: async () => ({}) }) });
  await assert.rejects(PushApiHelper.get(), /sessione è cambiata/); assert.equal(loggedOut, false);
});
function jwt(claims) { return `header.${Buffer.from(JSON.stringify({ exp: Math.floor(Date.now() / 1000) + 3600, ...claims })).toString('base64url')}.signature`; }
function httpSetup(fetcher) {
  let tokens = { accessToken: jwt({ exp: 0 }), refreshToken: jwt({ type: 'refresh' }) }, unauthorized = 0;
  const storage = { getTokens: async () => tokens, getOrCreateDeviceId: async () => 'phone',
    isTokenExpired: token => JSON.parse(Buffer.from(token.split('.')[1], 'base64url')).exp < Date.now() / 1000,
    storeTokens: async value => { tokens = value; } };
  const exports = load(file('HttpHelper'), { './AuthStorageHelper': { AuthStorageHelper: storage }, 'expo-constants': {} }, { fetch: fetcher });
  exports.HttpHelper.setUnauthorizedHandler(async () => { unauthorized++; });
  return { ...exports, tokens: () => tokens, switch: value => { tokens = value; }, unauthorized: () => unauthorized };
}
test('network refresh failure does not clear authentication', async () => {
  const h = httpSetup(async () => { throw new Error('offline'); });
  await assert.rejects(h.HttpHelper.getValidAccessToken(), /offline/); assert.equal(h.unauthorized(), 0);
});
test('expired access token refreshes once for concurrent callers', async () => {
  let count = 0; const accessToken = jwt({ sessionId: 'session' });
  const h = httpSetup(async () => { count++; await new Promise(r => setTimeout(r, 5)); return { status: 200, ok: true,
    json: async () => ({ success: true, accessToken, refreshToken: h.tokens().refreshToken }) }; });
  const result = await Promise.all([h.HttpHelper.getValidAccessToken(), h.HttpHelper.getValidAccessToken()]);
  assert.equal(count, 1); assert.deepEqual(result, [accessToken, accessToken]);
});
test('refresh completion after account switch cannot overwrite new credentials', async () => {
  let release; const wait = new Promise(resolve => { release = resolve; });
  const h = httpSetup(async () => { await wait; return { status: 200, ok: true,
    json: async () => ({ success: true, accessToken: jwt({ sessionId: 'old' }), refreshToken: jwt({ userId: 'old' }) }) }; });
  const task = h.HttpHelper.getValidAccessToken(); await new Promise(resolve => setImmediate(resolve));
  const next = { accessToken: jwt({ userId: 'new', sessionId: 'new' }), refreshToken: jwt({ userId: 'new' }) }; h.switch(next); release();
  await assert.rejects(task, /Session changed/); assert.equal(h.tokens(), next); assert.equal(h.unauthorized(), 0);
});
test('native offline logout retains encrypted revocation and retries exact credentials', async () => {
  const secure = new Map(), local = new Map(); let offline = true, bearer;
  const { LogoutQueueHelper } = load(path.join(__dirname, '../src/helpers/LogoutQueueHelper.native.ts'), {
    'expo-secure-store': { AFTER_FIRST_UNLOCK_THIS_DEVICE_ONLY: 'device', setItemAsync: async (k,v) => secure.set(k,v), getItemAsync: async k => secure.get(k), deleteItemAsync: async k => secure.delete(k) },
    '@react-native-async-storage/async-storage': { getItem: async k => local.get(k), setItem: async (k,v) => local.set(k,v) },
    './HttpHelper': { HttpHelper: { authUri: 'https://mock.test' } },
    './AuthStorageHelper': { AuthStorageHelper: { isTokenExpired: () => false } },
  }, { fetch: async (url, options) => { bearer = options.headers.Authorization; if (offline) throw new Error('offline'); return { ok: true, status: 200 }; } });
  const token = jwt({ sessionId: 'old-session' }); await LogoutQueueHelper.logout('phone', token);
  assert.equal(secure.size, 1); assert.equal([...local.values()].some(x => x.includes(token)), false);
  offline = false; await LogoutQueueHelper.retry(); assert.equal(bearer, `Bearer ${token}`); assert.equal(secure.size, 0);
});
