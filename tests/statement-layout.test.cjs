const { test } = require('node:test');
const assert = require('node:assert/strict');
const { load } = require('./load-ts.cjs');
const { parsePositionedStatement, mergeStatementPages } = load('src/helpers/StatementLayout.ts');
const box = (text, x, y, width = text.length * 5) => ({ text, x, y, width, height: 10 });
const header = (debit = 'Addebiti', credit = 'Accrediti') => [
  box('Data Operazione', 20, 50),
  box('Data Valuta', 100, 50),
  box('Descrizione', 180, 50),
  box(debit, 400, 50, 40),
  box(credit, 500, 50, 40),
];
const movement = (y, amount, x, description = 'Pagamento sintetico') => [
  box('02.11.2026', 20, y),
  box('03.11.2026', 100, y),
  box(description, 180, y),
  box(amount, x, y, 30),
];

test('usa le colonne e conserva date, importi spezzati e descrizioni multilinea', () => {
  const result = parsePositionedStatement([
    ...header(),
    ...movement(70, '12, 34', 410),
    box('Seconda riga', 180, 84),
    ...movement(100, '1\u0019 234, 56', 500, 'Bonifico sintetico'),
    box('Totali', 180, 120),
    box('12,34', 410, 120),
    box('1.234,56', 500, 120),
  ]);
  assert.equal(result.transactions.length, 2);
  assert.equal(result.transactions[0].type, 'expense');
  assert.equal(result.transactions[0].amount, 12.34);
  assert.equal(result.transactions[0].date, '02-11-2026');
  assert.equal(result.transactions[0].description, 'Pagamento sintetico Seconda riga');
  assert.equal(result.transactions[1].type, 'income');
  assert.equal(result.transactions[1].amount, 1234.56);
  assert.equal(result.warnings.length, 0);
});
test('riconosce colonne invertite e intestazioni dare/avere', () => {
  const result = parsePositionedStatement([
    ...header('Avere', 'Dare'),
    ...movement(70, '20,00', 410),
  ]);
  assert.equal(result.transactions[0].type, 'income');
});
test('non interpreta il saldo come movimento o importo della riga', () => {
  const result = parsePositionedStatement([
    ...header(),
    box('Saldo', 580, 50),
    ...movement(70, '15,00', 410),
    box('2.900,00', 580, 70),
    ...movement(90, '2.900,00', 500, 'Saldo finale'),
  ]);
  assert.equal(result.transactions.length, 1);
  assert.equal(result.transactions[0].amount, 15);
});
test('colonne entrambe valorizzate e date invalide non producono righe arbitrarie', () => {
  const result = parsePositionedStatement([
    ...header(),
    ...movement(70, '15,00', 410),
    box('10,00', 510, 70),
    box('31.02.2026', 20, 100),
    box('Errore', 180, 100),
    box('20,00', 410, 100),
  ]);
  assert.equal(result.transactions.length, 0);
  assert.equal(result.warnings.length, 2);
});
test('senza geometria sufficiente non inventa la direzione', () => {
  const result = parsePositionedStatement([box('02.11.2026 Pagamento 15,00', 20, 70)]);
  assert.equal(result.tableDetected, false);
  assert.equal(result.transactions[0].type, undefined);
});
test('una data nei dettagli non diventa una nuova operazione', () => {
  const result = parsePositionedStatement([
    ...header(),
    ...movement(70, '15,00', 410),
    box('Riferimento', 180, 85),
    box('01.11.2026', 240, 85),
  ]);
  assert.equal(result.transactions.length, 1);
  assert.match(result.transactions[0].description, /01.11.2026$/);
});
test('continua una descrizione alla pagina successiva senza mescolare conti e date', () => {
  const first = parsePositionedStatement([...header(), ...movement(70, '15,00', 410)]);
  const second = parsePositionedStatement([
    ...header(),
    box('Dettaglio sulla seconda pagina', 180, 65),
    ...movement(90, '25,00', 510),
  ]);
  const result = mergeStatementPages([first, second]);
  assert.equal(result.transactions.length, 2);
  assert.match(result.transactions[0].description, /Dettaglio sulla seconda pagina$/);
  assert.notEqual(result.transactions[0].id, result.transactions[1].id);
});
