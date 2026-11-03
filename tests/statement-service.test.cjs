const { test } = require('node:test');
const assert = require('node:assert/strict');
const crypto = require('node:crypto');
const { load } = require('./load-ts.cjs');
function setup() {
  const store = new Map();
  let posts = 0;
  let records = [];
  let fail = false;
  let getFails = false;
  const HttpHelper = {
    get: async () => (getFails ? { success: false, data: null } : { success: true, data: records }),
    post: async (_url, body) => {
      posts++;
      if (fail) throw new Error('response lost');
      return { success: true, data: { movementId: body.movementId } };
    },
  };
  const service = load('src/helpers/StatementImportService.ts', {
    '@react-native-async-storage/async-storage': {
      default: {
        getItem: async (key) => store.get(key),
        setItem: async (key, value) => store.set(key, value),
      },
      __esModule: true,
    },
    'expo-crypto': {
      CryptoDigestAlgorithm: { SHA256: 'sha256' },
      digestStringAsync: async (_, s) => crypto.createHash('sha256').update(s).digest('hex'),
      randomUUID: crypto.randomUUID,
    },
    './HttpHelper': { HttpHelper },
    './TransactionsApiHelper': {
      TransactionsApiHelper: {
        rawToTransactionData: (raw) => ({ ...raw, transactionId: raw.transactionId || raw.id }),
      },
    },
  });
  return {
    service,
    store,
    get posts() {
      return posts;
    },
    set records(v) {
      records = v;
    },
    set fail(v) {
      fail = v;
    },
    set getFails(v) {
      getFails = v;
    },
  };
}
const row = {
  id: '1',
  date: '01-01-2024',
  description: 'Negozio',
  amount: 12.34,
  type: 'expense',
  decision: 'auto',
};
const reviewed = [{ row, status: 'missing', candidates: [] }];
test('importa solo dopo chiamata esplicita e blocca reimport', async () => {
  const s = setup();
  assert.equal(s.posts, 0);
  const result = await s.service.saveStatementImport('sheet', 'A', reviewed, () => {});
  assert.equal(result.saved, 1);
  assert.equal(s.posts, 1);
  await assert.rejects(s.service.saveStatementImport('sheet', 'A', reviewed, () => {}));
  assert.equal(s.posts, 1);
});
test('risposta persa non provoca un secondo POST', async () => {
  const s = setup();
  s.fail = true;
  await assert.rejects(s.service.saveStatementImport('sheet', 'A', reviewed, () => {}));
  s.fail = false;
  await assert.rejects(s.service.saveStatementImport('sheet', 'A', reviewed, () => {}));
  assert.equal(s.posts, 1);
});
test('lettura importi numerici e stringhe e arresto su dati non validi', async () => {
  const s = setup();
  s.records = [
    { movementId: 'm', transactionId: 't', date: '01-01-2024', account: 'A', amount: -12.34 },
  ];
  const result = await s.service.fetchStatementTransactions('sheet');
  assert.equal(result[0].amount, 12.34);
  assert.equal(result[0].type, 'expense');
  s.records = [
    { movementId: 'm', transactionId: 't', date: '01-01-2024', account: 'A', amount: '-1.234,56' },
  ];
  assert.equal((await s.service.fetchStatementTransactions('sheet'))[0].amount, 1234.56);
  s.records = [
    { movementId: 'm', transactionId: 't', date: '01-01-2024', account: 'A', amount: 'bad' },
  ];
  await assert.rejects(s.service.fetchStatementTransactions('sheet'));
});
test('dati cambiati dopo la revisione fermano il salvataggio', async () => {
  const s = setup();
  s.records = [
    {
      movementId: 'm',
      transactionId: 't',
      date: '01-01-2024',
      account: 'A',
      amount: '-12,34',
      status: 'Confirmed',
    },
  ];
  await assert.rejects(
    s.service.saveStatementImport('sheet', 'A', reviewed, () => {}),
    /cambiate/,
  );
  assert.equal(s.posts, 0);
});
test('diario corrotto impedisce nuove scritture', async () => {
  const s = setup();
  await s.service.saveStatementImport('sheet', 'A', reviewed, () => {});
  for (const key of s.store.keys()) s.store.set(key, '{bad json');
  await assert.rejects(s.service.saveStatementImport('sheet', 'A', reviewed, () => {}));
  assert.equal(s.posts, 1);
});

test('i dati di altri conti e i template esclusi non bloccano il conto scelto', async () => {
  const s = setup();
  s.records = [
    { status: 'recurrent', amount: '', date: 'non valida' },
    { status: 'dismissed', amount: null },
    { status: 'ignored', amount: '' },
    {
      movementId: 'other',
      transactionId: 'other',
      account: 'B',
      date: 'non valida',
      amount: 'non valido',
    },
    {
      movementId: 'm',
      transactionId: 't',
      account: 'A',
      date: '2024-01-01',
      amount: '1,234.56',
      type: 'out',
      status: ' ACTIVE ',
    },
  ];
  const result = await s.service.fetchStatementTransactions('sheet', 'A');
  assert.equal(result.length, 1);
  assert.equal(result[0].date, '01-01-2024');
  assert.equal(result[0].amount, 1234.56);
  assert.equal(result[0].type, 'expense');
  const { reconcileStatement } = load('src/helpers/StatementReconciliation.ts');
  assert.equal(reconcileStatement([{ ...row, amount: 1234.56 }], result, 'A')[0].status, 'matched');
});

test('interpreta importi formattati e il tipo esplicito restituito dall’API', async () => {
  const s = setup();
  const amounts = [
    ['€ 1.234,56', 'out', 1234.56, 'expense'],
    ['(1.234,56 €)', 'out', 1234.56, 'expense'],
    ['1.234,56-', 'out', 1234.56, 'expense'],
    ['1.234.567', 'in', 1234567, 'income'],
    ['12.50', 'in', 12.5, 'income'],
  ];
  s.records = amounts.map(([amount, type], i) => ({
    movementId: `m${i}`,
    transactionId: `t${i}`,
    date: '01-01-2024',
    account: 'A',
    amount,
    type,
  }));
  const result = await s.service.fetchStatementTransactions('sheet', 'A');
  assert.deepEqual(
    Array.from(result, (t) => [t.amount, t.type]),
    amounts.map(([, , amount, type]) => [amount, type]),
  );
});

test('un dato dubbio del conto selezionato ferma il salvataggio senza esporre valori', async () => {
  const s = setup();
  const secret = 'descrizione privata non valida';
  s.records = [
    { movementId: 'm', transactionId: 't', account: 'A', date: '01-01-2024', amount: secret },
  ];
  await assert.rejects(
    s.service.saveStatementImport('sheet', 'A', reviewed, () => {}),
    (error) => {
      assert.match(error.message, /transazione 1.*formato dell’importo/);
      assert.doesNotMatch(error.message, /descrizione privata/);
      return true;
    },
  );
  assert.equal(s.posts, 0);
});

test('identificativi riutilizzati e tipologie incoerenti non bloccano il caricamento del conto', async () => {
  const s = setup();
  const base = {
    movementId: 'm',
    transactionId: 'duplicato',
    account: 'A',
    date: '01-01-2024',
    amount: '12,34',
  };
  s.records = [base, { ...base, account: 'B', movementId: 'm2' }];
  const transactions = await s.service.fetchStatementTransactions('sheet', 'A');
  assert.equal(transactions.length, 1);
  assert.equal(transactions[0].transactionId, 'duplicato');
  s.records = [{ ...base, transactionId: 't', amount: '-12,34', type: 'in' }];
  const conflicting = await s.service.fetchStatementTransactions('sheet', 'A');
  assert.equal(conflicting[0].type, 'expense');
  assert.equal(conflicting[0].directionConflict, true);
});

test('un conflitto di direzione richiede revisione per entrambe le direzioni e non modifica i movimenti esistenti', async () => {
  const s = setup();
  const { reconcileStatement, statementTransactionKey } = load(
    'src/helpers/StatementReconciliation.ts',
  );
  s.records = [
    {
      movementId: 'm',
      transactionId: 't',
      account: 'A',
      date: '01-01-2024',
      amount: '-12,34',
      type: 'in',
    },
  ];
  const transactions = await s.service.fetchStatementTransactions('sheet', 'A');
  const { TransactionsApiHelper } = load('src/helpers/TransactionsApiHelper.ts', {
    './HttpHelper': {},
  });
  assert.equal(
    transactions[0].type,
    TransactionsApiHelper.rawToTransactionData({ amount: '-12,34' }).type,
  );
  for (const type of ['expense', 'income']) {
    const result = reconcileStatement([{ ...row, type }], transactions, 'A')[0];
    assert.equal(result.status, 'review');
    assert.equal(result.candidates.length, 1);
  }
  const manual = [{ ...row, decision: `link:${statementTransactionKey(transactions[0])}` }];
  const reviewed = reconcileStatement(manual, transactions, 'A');
  const result = await s.service.saveStatementImport('sheet', 'A', reviewed, () => {});
  assert.equal(result.linked, 1);
  assert.equal(result.saved, 0);
  assert.equal(s.posts, 0);
});

test('un conflitto estraneo alle righe importate non impedisce il salvataggio', async () => {
  const s = setup();
  s.records = [
    {
      movementId: 'm',
      transactionId: 't',
      account: 'A',
      date: '01-01-2023',
      amount: '-12,34',
      type: 'in',
    },
  ];
  const result = await s.service.saveStatementImport('sheet', 'A', reviewed, () => {});
  assert.equal(result.saved, 1);
  assert.equal(s.posts, 1);
});

test('un conflitto apparso dopo la revisione ferma la conferma e invalida un vecchio collegamento automatico', async () => {
  const s = setup();
  const { reconcileStatement, statementTransactionKey } = load(
    'src/helpers/StatementReconciliation.ts',
  );
  const record = {
    movementId: 'm',
    transactionId: 't',
    account: 'A',
    date: '01-01-2024',
    amount: '-12,34',
    type: 'out',
  };
  s.records = [record];
  const before = await s.service.fetchStatementTransactions('sheet', 'A');
  const checked = reconcileStatement([row], before, 'A');
  await s.service.saveStatementImport('sheet', 'A', checked, () => {});
  s.records = [{ ...record, type: 'in' }];
  await assert.rejects(
    s.service.saveStatementImport('sheet', 'A', checked, () => {}),
    /cambiate/,
  );
  const fresh = await s.service.fetchStatementTransactions('sheet', 'A');
  const restored = await s.service.restoreStatementLinks('sheet', 'A', [row], fresh);
  assert.equal(restored[0].decision, 'auto');
  assert.equal(reconcileStatement(restored, fresh, 'A')[0].status, 'review');
  const manual = [{ ...row, decision: `link:${statementTransactionKey(fresh[0])}` }];
  await s.service.saveStatementImport(
    'sheet',
    'A',
    reconcileStatement(manual, fresh, 'A'),
    () => {},
  );
  const confirmed = await s.service.restoreStatementLinks('sheet', 'A', [row], fresh);
  assert.equal(confirmed[0].decision, manual[0].decision);
  assert.equal(s.posts, 0);
});

test('segni espliciti e tipi legacy sconosciuti restano disponibili per la revisione', async () => {
  const s = setup();
  s.records = [
    {
      movementId: 'm1',
      transactionId: 't1',
      account: 'A',
      date: '01-01-2024',
      amount: '+12,34',
      type: 'out',
    },
    {
      movementId: 'm2',
      transactionId: 't2',
      account: 'A',
      date: '01-01-2024',
      amount: '-12,34',
      type: 'legacy',
    },
    {
      movementId: 'm3',
      transactionId: 't3',
      account: 'A',
      date: '01-01-2024',
      amount: '12,34',
      type: 'out',
    },
  ];
  const result = await s.service.fetchStatementTransactions('sheet', 'A');
  assert.equal(result[0].type, 'income');
  assert.equal(result[0].directionConflict, true);
  assert.equal(result[1].directionConflict, true);
  assert.equal(result[2].type, 'expense');
  assert.notEqual(result[2].directionConflict, true);
});

test('stesso transactionId su movimenti diversi: identita locali stabili e nessuna riscrittura', async () => {
  const s = setup();
  const { reconcileStatement, statementTransactionKey } = load(
    'src/helpers/StatementReconciliation.ts',
  );
  const records = [
    {
      movementId: 'm1',
      transactionId: 'duplicato',
      account: 'A',
      date: '01-01-2024',
      amount: '-12,34',
      description: 'Primo',
    },
    {
      movementId: 'm2',
      transactionId: 'duplicato',
      account: 'A',
      date: '01-01-2024',
      amount: '-56,78',
      description: 'Secondo',
    },
  ];
  s.records = records;
  const rows = [row, { ...row, id: '2', amount: 56.78, description: 'Secondo' }];
  const transactions = await s.service.fetchStatementTransactions('sheet', 'A');
  assert.equal(transactions.length, 2);
  assert.equal(transactions[0].transactionId, transactions[1].transactionId);
  assert.notEqual(
    statementTransactionKey(transactions[0]),
    statementTransactionKey(transactions[1]),
  );
  const reconciled = reconcileStatement(rows, transactions, 'A');
  assert.deepEqual(
    Array.from(reconciled, (r) => r.status),
    ['matched', 'matched'],
  );
  const result = await s.service.saveStatementImport('sheet', 'A', reconciled, () => {});
  assert.equal(result.linked, 2);
  assert.equal(result.saved, 0);
  assert.equal(s.posts, 0);
  s.records = [...records].reverse();
  const fresh = await s.service.fetchStatementTransactions('sheet', 'A');
  const restored = await s.service.restoreStatementLinks('sheet', 'A', rows, fresh);
  const matches = reconcileStatement(restored, fresh, 'A');
  assert.deepEqual(
    Array.from(matches, (r) => r.match.movementId),
    ['m1', 'm2'],
  );
});

test('righe identiche con ID duplicato restano distinte e richiedono una scelta manuale', async () => {
  const s = setup();
  const { reconcileStatement, statementTransactionKey } = load(
    'src/helpers/StatementReconciliation.ts',
  );
  const record = {
    movementId: 'm',
    transactionId: 'duplicato',
    account: 'A',
    date: '01-01-2024',
    amount: '-12,34',
    description: 'Identico',
  };
  s.records = [record, { ...record }];
  const transactions = await s.service.fetchStatementTransactions('sheet', 'A');
  const keys = Array.from(transactions, statementTransactionKey);
  assert.equal(new Set(keys).size, 2);
  const automatic = reconcileStatement([row], transactions, 'A')[0];
  assert.equal(automatic.candidates.length, 2);
  assert.equal(automatic.status, 'review');
  const rows = [row, { ...row, id: '2' }];
  const manual = rows.map((r, index) => ({ ...r, decision: `link:${keys[index]}` }));
  const checked = reconcileStatement(manual, transactions, 'A');
  assert.deepEqual(
    Array.from(checked, (r) => r.status),
    ['matched', 'matched'],
  );
  const reused = reconcileStatement(
    manual.map((r) => ({ ...r, decision: `link:${keys[0]}` })),
    transactions,
    'A',
  );
  assert.deepEqual(
    Array.from(reused, (r) => r.status),
    ['review', 'review'],
  );
  await s.service.saveStatementImport('sheet', 'A', checked, () => {});
  assert.equal(s.posts, 0);
  const fresh = await s.service.fetchStatementTransactions('sheet', 'A');
  const restored = await s.service.restoreStatementLinks('sheet', 'A', rows, fresh);
  assert.deepEqual(
    Array.from(restored, (r) => r.decision),
    manual.map((r) => r.decision),
  );
  // Legacy journal records without a local key must not select the first duplicate.
  for (const [key, value] of s.store) {
    const entry = JSON.parse(value);
    delete entry.candidateKey;
    s.store.set(key, JSON.stringify(entry));
  }
  const legacy = await s.service.restoreStatementLinks('sheet', 'A', rows, fresh);
  assert.deepEqual(
    Array.from(legacy, (r) => r.decision),
    ['auto', 'auto'],
  );
});

test('un duplicato comparso dopo la revisione ferma il salvataggio', async () => {
  const s = setup();
  const { reconcileStatement } = load('src/helpers/StatementReconciliation.ts');
  const record = {
    movementId: 'm',
    transactionId: 't',
    account: 'A',
    date: '01-01-2024',
    amount: '-12,34',
  };
  s.records = [record];
  const transactions = await s.service.fetchStatementTransactions('sheet', 'A');
  const reviewed = reconcileStatement([row], transactions, 'A');
  s.records = [record, { ...record }];
  await assert.rejects(
    s.service.saveStatementImport('sheet', 'A', reviewed, () => {}),
    /cambiate/,
  );
  assert.equal(s.posts, 0);
});

test('un errore di lettura API non viene trattato come elenco vuoto', async () => {
  const s = setup();
  s.getFails = true;
  await assert.rejects(
    s.service.saveStatementImport('sheet', 'A', reviewed, () => {}),
    /Impossibile verificare/,
  );
  assert.equal(s.posts, 0);
});
