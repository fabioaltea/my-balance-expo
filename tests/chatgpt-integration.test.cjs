const { test } = require('node:test');
const assert = require('node:assert/strict');
const path = require('node:path');
const { load } = require('./load-ts.cjs');
const id = '171e47da-bf8d-423b-a728-c9c4eec6ab86';
const unavailable = {
  provider: 'chatgpt',
  available: false,
  reason: 'setup_required',
  activeConnectionId: null,
  connections: [],
};
const connected = {
  provider: 'chatgpt',
  available: true,
  reason: null,
  activeConnectionId: id,
  connections: [
    {
      id,
      email: 'test@example.test',
      label: 'Test',
      status: 'connected',
      planUsageEnabled: true,
      expiresAt: null,
      welcomeAcknowledged: false,
    },
  ],
};
function setup(fetcher) {
  let current = 'application-session',
    refreshes = [],
    logout = 0;
  class AuthenticationError extends Error {}
  const { ChatGptIntegrationApiHelper: api } = load(
    path.join(__dirname, '../src/helpers/ChatGptIntegrationApiHelper.ts'),
    {
      './HttpHelper': {
        AuthenticationError,
        HttpHelper: {
          authUri: 'https://auth.test',
          endpointUri: 'https://api.test',
          getValidAccessToken: async (force, session) => {
            refreshes.push([force, session]);
            return current;
          },
          handleUnauthorized: () => {
            logout++;
          },
        },
      },
      './AuthStorageHelper': {
        AuthStorageHelper: { getTokens: async () => ({ accessToken: current }) },
      },
    },
    { fetch: fetcher },
  );
  return {
    api,
    refreshes,
    logout: () => logout,
    switch: (value) => {
      current = value;
    },
  };
}
const response = (data, status = 200) => ({
  ok: status >= 200 && status < 300,
  status,
  json: async () => ({ success: status === 200, data }),
});

test('OAuth status uses AuthService and returns only public account fields', async () => {
  const h = setup(async (url, options) => {
    assert.equal(url, 'https://auth.test/integrations/chatgpt/status');
    assert.equal(options.credentials, 'include');
    assert.equal(options.headers.Authorization, 'Bearer application-session');
    return response({
      ...connected,
      access_token: 'secret',
      connections: [{ ...connected.connections[0], refresh_token: 'secret' }],
    });
  });
  assert.deepEqual(JSON.parse(JSON.stringify(await h.api.getStatus())), connected);
  assert.deepEqual(h.refreshes, [[false, true]]);
});
test('unavailable or incompatible contracts cannot enable a connection', async () => {
  assert.deepEqual(
    JSON.parse(JSON.stringify(await setup(async () => response(unavailable)).api.getStatus())),
    unavailable,
  );
  for (const data of [
    undefined,
    { ...connected, activeConnectionId: 'another-account' },
    { ...connected, available: false },
    { ...connected, provider: 'google' },
    { ...connected, connections: [{ ...connected.connections[0], status: 'disconnected' }] },
  ]) {
    await assert.rejects(
      setup(async () => response(data)).api.getStatus(),
      (error) => error.code === 'CHATGPT_INVALID_STATUS' || error.code === 'CHATGPT_REQUEST_FAILED',
    );
  }
});
test('application 401 refreshes once before retrying', async () => {
  let count = 0;
  const h = setup(async () => (++count === 1 ? response(null, 401) : response(unavailable)));
  await h.api.getStatus();
  assert.deepEqual(h.refreshes, [
    [false, true],
    [true, true],
  ]);
  assert.equal(h.logout(), 0);
});
test('provider reauthorization never logs out the MyBalance session', async () => {
  const h = setup(async () => ({
    ok: false,
    status: 409,
    json: async () => ({ success: false, code: 'CHATGPT_REAUTH_REQUIRED' }),
  }));
  await assert.rejects(h.api.models(id), (error) => error.code === 'CHATGPT_REAUTH_REQUIRED');
  assert.equal(h.logout(), 0);
});
test('late previous-account response is ignored without logging out the next account', async () => {
  let h;
  h = setup(async () => {
    h.switch('next-session');
    return response(null, 401);
  });
  await assert.rejects(h.api.getStatus(), /sessione è cambiata/);
  assert.equal(h.logout(), 0);
});
test('authorization redirects only to the trusted OpenAI authorize endpoint', async () => {
  for (const authorizationUrl of ['https://attacker.test/', 'https://auth.openai.com/other']) {
    await assert.rejects(
      setup(async () => response({ authorizationUrl })).api.authorize(),
      (error) => error.code === 'CHATGPT_INVALID_AUTHORIZATION',
    );
  }
  const url = 'https://auth.openai.com/api/accounts/authorize?state=example';
  assert.equal(await setup(async () => response({ authorizationUrl: url })).api.authorize(), url);
});
test('inference uses MyBalance API with an explicit connection and a fixed test prompt', async () => {
  const h = setup(async (url, options) => {
    assert.equal(url, 'https://api.test/integrations/chatgpt/responses');
    const body = JSON.parse(options.body);
    assert.equal(body.connectionId, id);
    assert.equal(body.model, 'eligible-model');
    assert.match(body.prompt, /Collegamento ChatGPT riuscito/);
    return response({ connectionId: id, model: body.model, outputText: 'OK' });
  });
  assert.equal(await h.api.test(id, 'eligible-model'), 'OK');
});
test('aborted and offline requests preserve application authentication', async () => {
  const controller = new AbortController();
  controller.abort();
  const h = setup(async (_url, options) => {
    assert.equal(options.signal.aborted, true);
    throw new Error('aborted');
  });
  await assert.rejects(h.api.getStatus(controller.signal), /aborted/);
  assert.equal(h.logout(), 0);
});
