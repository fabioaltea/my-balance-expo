const { test } = require('node:test');
const assert = require('node:assert/strict');
const { load } = require('./load-ts.cjs');
const parser = load('src/helpers/StatementParser.ts');
const { reconcileStatement } = load('src/helpers/StatementReconciliation.ts');
const row = (id, overrides = {}) => ({ id, date: '01-01-2024', description: 'Acquisto', amount: 12.34, type: 'expense', decision: 'auto', ...overrides });
const tx = (id, overrides = {}) => ({ transactionId: id, movementId: id, date: '01-01-2024', amount: 12.34, type: 'expense', account: 'A', status: 'Confirmed', ...overrides });

test('date e importi vengono validati', () => {
  assert.equal(parser.statementDate('29/02/24'), '29-02-2024');
  assert.equal(parser.statementDate('29/02/23'), undefined);
  assert.equal(parser.statementAmount('1.234,56'), 1234.56);
  assert.equal(parser.statementAmount('1,234.56'), 1234.56);
});
test('parser mantiene duplicati, segnala segni mancanti e colonne ambigue', () => {
  const data = parser.parseStatement('31/12/23 Negozio -12,34\n01/01/24 Negozio -12,34\n01/01/24 Negozio -12,34\n02/01/24 Pagamento 15,00\n03/01/24 Righe -10,00 20,00\n04/01/24 Saldo 100,00');
  assert.equal(data.transactions.length, 4);
  assert.equal(data.transactions[0].type, 'expense');
  assert.equal(data.transactions[3].type, undefined);
  assert.ok(data.warnings.length >= 2);
});
test('corrispondenze univoche, date vicine, filtri e duplicati', () => {
  assert.equal(reconcileStatement([row('1')], [tx('x')], 'A')[0].status, 'matched');
  assert.equal(reconcileStatement([row('1')], [tx('x', { date: '03-01-2024' })], 'A')[0].status, 'matched');
  assert.equal(reconcileStatement([row('1')], [tx('x', { date: '04-01-2024' })], 'A')[0].status, 'matched');
  assert.equal(reconcileStatement([row('1')], [tx('x', { date: '05-01-2024' })], 'A')[0].status, 'missing');
  assert.equal(reconcileStatement([row('1')], [tx('x', { date: '02-01-2024' }), tx('y', { date: '03-01-2024' })], 'A')[0].status, 'matched');
  assert.equal(reconcileStatement([row('1')], [tx('x', { date: '02-01-2024' }), tx('y', { date: '31-12-2023' })], 'A')[0].status, 'review');
  const near = reconcileStatement([row('1'), row('2', { date: '03-01-2024' })], [tx('x', { date: '01-01-2024' }), tx('y', { date: '04-01-2024' })], 'A');
  assert.deepEqual(near.map((r) => r.status), ['matched', 'matched']);
  assert.equal(reconcileStatement([row('1')], [tx('x', { status: 'DELETED' })], 'A')[0].status, 'missing');
  assert.equal(reconcileStatement([row('1'), row('2')], [tx('x')], 'A')[0].status, 'review');
  const shared = reconcileStatement([row('1', { decision: 'link:x' }), row('2')], [tx('x')], 'A');
  assert.equal(shared[1].status, 'review');
  const ambiguous = [row('2', { date: '02-01-2024' })];
  const pool = [tx('x', { date: '01-01-2024' }), tx('y', { date: '03-01-2024' })];
  assert.equal(reconcileStatement(ambiguous, pool, 'A')[0].status, 'review');
  const afterLink = reconcileStatement([row('1', { decision: 'link:x' }), ...ambiguous], pool, 'A');
  assert.deepEqual(afterLink.map((r) => r.status), ['matched', 'review']);
  assert.equal(reconcileStatement([row('1', { decision: 'link:x' }), row('2', { decision: 'link:x' })], [tx('x')], 'A')[0].status, 'review');
  assert.equal(reconcileStatement([row('1', { decision: 'create' })], [tx('x')], 'A')[0].status, 'missing');
});
test('valute diverse da EUR non vengono importate', () => {
  const data = parser.parseStatement('Conto USD\n01/01/24 Negozio -12,34');
  assert.equal(data.transactions.length, 0);
  assert.ok(data.warnings.length);
});
