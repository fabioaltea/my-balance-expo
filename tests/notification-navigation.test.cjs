const { test } = require('node:test');
const assert = require('node:assert/strict');
const crypto = require('node:crypto');
const path = require('node:path');
const { load } = require('./load-ts.cjs');
const flush = async () => { for (let i = 0; i < 8; i++) await new Promise(resolve => setImmediate(resolve)); };
function harness() {
  let auth = { isAuthenticated: false, isLoading: false, dashboardReady: false, selectedSpreadsheetId: null, user: null };
  const slots = [], effectSlots = [], effects = [], routes = [], alerts = [], queries = []; let cursor = 0, effectCursor = 0, handlers, missing = false, transactions = [{ movementId: 'movement' }];
  const React = {
    createContext: () => ({ Provider: 'Provider' }), createElement: () => null,
    useContext: () => null, useRef: value => { const index = cursor++; return slots[index] || (slots[index] = { current: value }); },
    useState: value => { cursor++; return [value, () => {}]; }, useCallback: fn => fn,
    useEffect: (effect, deps) => { const index = effectCursor++; const previous = effectSlots[index];
      if (!previous || deps.some((value, i) => value !== previous.deps[i])) {
        effects.push(() => { previous?.cleanup?.(); effectSlots[index] = { deps, cleanup: effect() }; });
      }
    },
  };
  const hash = email => crypto.createHash('sha256').update(email).digest('hex');
  const { NotificationsProvider } = load(path.join(__dirname, '../src/state/NotificationsProvider.tsx'), {
    react: React, 'react-native': { Alert: { alert: (...args) => alerts.push(args) }, AppState: { currentState: 'background', addEventListener: () => ({ remove() {} }) } },
    '@react-native-async-storage/async-storage': { getItem: async () => null, setItem: async () => {} },
    'expo-router': { router: { push: value => routes.push(value) } },
    'expo-crypto': { CryptoDigestAlgorithm: { SHA256: 'sha256' }, digestStringAsync: async (_, value) => hash(value) },
    './AuthProvider': { useAuthContext: () => auth },
    '../providers/QueryProvider': { queryClient: { invalidateQueries: async () => {}, fetchQuery: async options => { queries.push(options.queryKey); return options.queryFn(); } } },
    '../helpers/NotificationsHelpers': { NotificationsHelpers: { supported: true, appVariant: 'production', clearLastResponse: async () => {},
      permission: async () => 'granted', token: async () => 'ExpoPushToken[token]',
      listen: (received,tapped,rotated,allowed) => { handlers = { received,tapped,rotated,allowed }; return () => {}; } } },
    '../helpers/PushApiHelper': { PushApiHelper: { get: async () => ({ enabled: false, registered: false, updatedAt: 'now' }) } },
    '../helpers/AuthStorageHelper': { AuthStorageHelper: { getOrCreateDeviceId: async () => 'phone' } },
    '../helpers/LogoutQueueHelper': { LogoutQueueHelper: { retry: async () => {} } },
    '../helpers/NotificationSessionHelper': { NotificationSessionHelper: { subscribe: () => () => {} } },
    '../helpers/HttpHelper': { HttpHelper: { get: async () => { if (missing) throw new Error('not found'); return { success: true, data: { status: 'unconfirmed' } }; } } },
    '../helpers/TransactionsApiHelper': { TransactionsApiHelper: { getTransactions: async () => transactions, rawToTransactionData: x => x } },
  }, { setInterval: () => 1, clearInterval: () => {} });
  function render(next) { if (next) auth = next; cursor = 0; effectCursor = 0; NotificationsProvider({ children: null }); while (effects.length) effects.shift()(); }
  const signedIn = email => ({ isAuthenticated: true, isLoading: false, dashboardReady: true, selectedSpreadsheetId: 'sheet', user: { email } });
  const event = email => ({ version: 1, type: 'movement.unconfirmed', movementId: 'movement', spreadsheetId: 'sheet', recipientHash: hash(email) });
  render();
  return { render, signedIn, event, routes, alerts, queries, tapped: (data,id = 'notification') => handlers.tapped(data,id), allowed: data => handlers.allowed(data), missing: () => { missing = true; }, empty: () => { transactions = []; } };
}
test('cold start tap waits for authentication and populated movement cache; duplicate tap is ignored', async () => {
  const h = harness(); h.tapped(h.event('alice')); await flush(); assert.equal(h.routes.length, 0);
  h.render(h.signedIn('alice')); await flush(); assert.equal(h.routes.length, 1); assert.equal(h.routes[0].params.movementId, 'movement'); assert.equal(h.queries.length, 1);
  h.tapped(h.event('alice')); await flush(); assert.equal(h.routes.length, 1);
});
test('old-account notification cannot display or navigate even for the same sheet', async () => {
  const h = harness(); h.render(h.signedIn('bob')); await flush();
  assert.equal(await h.allowed(h.event('alice')), false); h.tapped(h.event('alice')); await flush(); assert.equal(h.routes.length, 0);
});
test('missing movement gives fallback instead of an empty creation form', async () => {
  const h = harness(); h.render(h.signedIn('alice')); await flush(); h.missing(); h.tapped(h.event('alice')); await flush();
  assert.equal(h.routes.length, 0); assert.equal(h.alerts.length, 1);
});
test('failed transaction reload never opens a blank edit form', async () => {
  const h = harness(); h.render(h.signedIn('alice')); await flush(); h.empty(); h.tapped(h.event('alice')); await flush();
  assert.equal(h.routes.length, 0); assert.equal(h.alerts.length, 1);
});
