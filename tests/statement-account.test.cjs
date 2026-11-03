const { test } = require('node:test');
const assert = require('node:assert/strict');
const crypto = require('node:crypto');
const { load } = require('./load-ts.cjs');
const { detectStatementAccount, suggestAccountFromHeader } = load(
  'src/helpers/StatementAccount.ts',
);
// Public, synthetic IBAN example; no user document is stored in fixtures.
const header = 'Intesa Sanpaolo\nIBAN IT60 X054 2811 1010 0000 0123 456';

test('banca, IBAN validato e proposta conto univoca', () => {
  const identity = detectStatementAccount(header);
  assert.equal(identity.bankName, 'Intesa Sanpaolo');
  assert.equal(identity.iban, 'IT60X0542811101000000123456');
  assert.equal(identity.label, 'Intesa Sanpaolo · IBAN …3456');
  assert.equal(detectStatementAccount(header.replace('IT60', 'IT61')).iban, undefined);
  assert.equal(
    suggestAccountFromHeader(header, [{ name: 'Intesa personale' }, { name: 'Risparmi' }]),
    'Intesa personale',
  );
  assert.equal(
    suggestAccountFromHeader(header, [{ name: 'Intesa personale' }, { name: 'Intesa famiglia' }]),
    '',
  );
});
test('associazione locale esplicita, isolata per utente e foglio, senza IBAN in storage', async () => {
  const store = new Map();
  const memory = load('src/helpers/StatementAccountMemory.ts', {
    '@react-native-async-storage/async-storage': {
      getItem: async (key) => store.get(key),
      setItem: async (key, value) => store.set(key, value),
    },
    'expo-crypto': {
      CryptoDigestAlgorithm: { SHA256: 'sha256' },
      digestStringAsync: async (_, text) => crypto.createHash('sha256').update(text).digest('hex'),
    },
  });
  const accounts = [
    { accountId: 'a', name: 'Personale' },
    { accountId: 'b', name: 'Famiglia' },
  ];
  assert.equal(
    await memory.suggestRememberedStatementAccount('user1', 'sheet1', header, accounts),
    '',
  );
  await memory.rememberStatementAccount('user1', 'sheet1', header, 'b');
  assert.equal(
    await memory.suggestRememberedStatementAccount('user1', 'sheet1', header, accounts),
    'Famiglia',
  );
  assert.equal(
    await memory.suggestRememberedStatementAccount('user2', 'sheet1', header, accounts),
    '',
  );
  assert.equal(
    await memory.suggestRememberedStatementAccount('user1', 'sheet2', header, accounts),
    '',
  );
  assert.equal(
    await memory.suggestRememberedStatementAccount('user1', 'sheet1', header, [accounts[0]]),
    '',
  );
  for (const [key, value] of store) {
    assert.doesNotMatch(key, /IT60|Intesa|user1|sheet1/);
    assert.equal(value, 'b');
  }
});
