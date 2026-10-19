const { test } = require('node:test');
const assert = require('node:assert/strict');
const path = require('node:path');
const { load } = require('./load-ts.cjs');
const { NotificationsCoordinator } = load(path.join(__dirname, '../src/helpers/NotificationsCoordinator.ts'));
function setup(options = {}) {
  let saved = options.preference || null, requests = [], permissions = [];
  let server = { enabled: false, registered: false, updatedAt: 'now', ...options.server };
  const coordinator = new NotificationsCoordinator({
    read: async () => saved, save: async value => { saved = value; }, changed: () => {},
    permission: async request => { permissions.push(request); return options.permission || 'granted'; },
    token: async () => 'ExpoPushToken[current]',
    get: async () => { if (options.getError) throw new Error('offline'); return server; },
    register: async (token, permission, intent) => { requests.push({ token, permission, intent });
      if (options.registerError) throw new Error('save failed');
      if (intent === 'restoreLegacy' && !options.legacyMatch) { const e = new Error('not matched'); e.code = 'LEGACY_TOKEN_NOT_MATCHED'; throw e; }
      server = { ...server, enabled: intent !== 'claim', registered: intent !== 'claim' && !!token }; return server;
    },
    disable: async () => { requests.push('disable'); if (options.disableError) throw new Error('offline'); return { ...server, enabled: false, registered: false }; },
  });
  return { coordinator, requests, permissions, saved: () => saved };
}
test('enable requires successful backend save', async () => {
  const c = setup({ registerError: true }); await c.coordinator.toggle(true);
  assert.equal(c.coordinator.state.registered, false); assert.equal(c.coordinator.state.enabled, false);
  assert.equal(c.coordinator.state.syncStatus, 'error'); assert.equal(c.saved().pending, true);
});
test('enable registers, persists confirmed preference and requests permission explicitly', async () => {
  const c = setup(); await c.coordinator.toggle(true);
  assert.equal(c.coordinator.state.registered, true); assert.equal(c.saved().pending, false); assert.deepEqual(c.permissions, [true]);
});
test('denied opt-in does not register', async () => {
  const c = setup({ permission: 'denied' }); await c.coordinator.toggle(true);
  assert.equal(c.requests.length, 0); assert.equal(c.saved().enabled, false);
});
test('offline OFF stays pending and is retried before GET', async () => {
  const c = setup({ disableError: true, server: { enabled: true, registered: true } }); await c.coordinator.toggle(false);
  assert.equal(c.coordinator.state.enabled, false); assert.equal(c.saved().pending, true);
  const next = setup({ preference: c.saved(), getError: true }); await next.coordinator.reconcile();
  assert.deepEqual(next.requests, ['disable']); assert.equal(next.saved().pending, false);
});
test('OS permission alone never enables a new device', async () => {
  const c = setup({ server: { updatedAt: null } }); await c.coordinator.reconcile();
  assert.equal(c.coordinator.state.enabled, false); assert.equal(c.requests[0].intent, 'restoreLegacy'); assert.deepEqual(c.permissions, [false]);
});
test('legacy matching token restores registration without requesting OS permission', async () => {
  const c = setup({ server: { updatedAt: null }, legacyMatch: true }); await c.coordinator.reconcile();
  assert.equal(c.coordinator.state.registered, true); assert.deepEqual(c.permissions, [false]);
});
test('server OFF takes precedence over stale local enabled preference', async () => {
  const c = setup({ preference: { enabled: true, pending: false } }); await c.coordinator.reconcile();
  assert.equal(c.coordinator.state.enabled, false); assert.equal(c.requests.length, 0);
});
test('revoked OS permission clears token without changing preference', async () => {
  const c = setup({ permission: 'denied', server: { enabled: true, registered: true } }); await c.coordinator.reconcile();
  assert.equal(c.requests[0].token, null); assert.equal(c.requests[0].intent, 'reconcile'); assert.equal(c.saved().enabled, true); assert.equal(c.coordinator.state.registered, false);
});
test('failed GET is unknown/error and never creates registration from cache', async () => {
  const c = setup({ getError: true, preference: { enabled: true, pending: false } }); await c.coordinator.reconcile();
  assert.equal(c.requests.length, 0); assert.equal(c.coordinator.state.syncStatus, 'error');
});
test('stopped session cannot initiate registration after awaited token acquisition', async () => {
  let release; const waiting = new Promise(resolve => { release = resolve; }); let registered = false;
  const coordinator = new NotificationsCoordinator({ read: async () => null, save: async () => {}, changed: () => {},
    permission: async () => 'granted', token: async () => { await waiting; return 'token'; }, get: async () => ({}),
    register: async () => { registered = true; return {}; }, disable: async () => ({}) });
  const task = coordinator.toggle(true); await new Promise(resolve => setImmediate(resolve)); coordinator.stop(); release(); await task;
  assert.equal(registered, false);
});
test('Android channel precedes permission prompt and token', async () => {
  const events = [];
  const { NotificationsHelpers } = load(path.join(__dirname, '../src/helpers/NotificationsHelpers.native.ts'), {
    'expo-notifications': { AndroidImportance: { MAX: 5 }, IosAuthorizationStatus: { PROVISIONAL: 3 },
      setNotificationChannelAsync: async () => { events.push('channel'); },
      getPermissionsAsync: async () => { events.push('permissions'); return { status: 'undetermined', canAskAgain: true }; },
      requestPermissionsAsync: async () => { events.push('prompt'); return { status: 'granted' }; },
      getExpoPushTokenAsync: async options => { events.push('token'); assert.equal(options.projectId, 'project'); return { data: 'ExpoPushToken[current]' }; } },
    'expo-device': { isDevice: true }, 'expo-constants': { expoConfig: { extra: { eas: { projectId: 'project' } } } },
    'react-native': { Platform: { OS: 'android' } }, './PushApiHelper': { PushApiHelper: { register: async () => { events.push('save'); } } },
  });
  await NotificationsHelpers.registerForPushNotificationsAsync(); assert.deepEqual(events, ['channel', 'permissions', 'prompt', 'token', 'save']);
});
