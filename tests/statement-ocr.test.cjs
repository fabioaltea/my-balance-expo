const { test } = require('node:test');
const assert = require('node:assert/strict');
const { spawnSync } = require('node:child_process');
const { readFileSync } = require('node:fs');
const path = require('node:path');
const { load } = require('./load-ts.cjs');

test('il motore italiano reale inizializza senza cercare il dizionario esterno', () => {
  const result = spawnSync(process.execPath, ['-e', `
    const { load } = require('./tests/load-ts.cjs');
    const tesseract = require('tesseract.js');
    const reader = load('src/helpers/StatementReader.web.ts', {
      'tesseract.js': { createWorker: (langs, oem, options, config) =>
        tesseract.createWorker(langs, oem, {
          langPath: require('node:path').resolve('public/ocr'),
          cacheMethod: options.cacheMethod,
        }, config) },
    });
    (async () => {
      const worker = await reader.createLocalOcrWorker();
      await worker.terminate();
      process.stdout.write('initialized');
    })().catch(error => { console.error(error); process.exitCode = 1; });
  `], { cwd: path.resolve(__dirname, '..'), encoding: 'utf8', timeout: 20000 });
  assert.ifError(result.error);
  assert.equal(result.status, 0, result.stderr);
  assert.equal(result.stdout, 'initialized');
  assert.doesNotMatch(result.stderr, /failed to load|special-words/i);
});

test('PDF.js riceve il percorso del profilo CMYK distribuito localmente', async () => {
  let options;
  const lib = {
    GlobalWorkerOptions: {},
    getDocument: config => {
      options = config;
      return {
        promise: Promise.resolve({ numPages: 1, getPage: async () => ({
          getTextContent: async () => ({ items: [{
            str: '01/01/24 Negozio -12,34', transform: [1, 0, 0, 1, 0, 100],
          }] }),
          cleanup() {},
        }) }),
        destroy: async () => {},
      };
    },
  };
  const reader = load('src/helpers/StatementReader.web.ts', {
    'tesseract.js': { createWorker: () => { throw new Error('OCR inatteso per PDF digitale'); } },
  }, {
    globalThis: { pdfjsLib: lib },
    document: {
      createElement: () => ({ remove() {} }),
      head: { appendChild: script => queueMicrotask(() => script.onload()) },
    },
    fetch: async () => ({ arrayBuffer: async () => new ArrayBuffer(4) }),
  });
  const data = await reader.readStatement('blob:synthetic-statement', true);
  assert.equal(data.transactions.length, 1);
  const profile = 'CGATS001Compat-v2-micro.icc';
  const deployedProfile = readFileSync(path.join('public', options.iccUrl, profile));
  const packageProfile = readFileSync(path.join(path.dirname(require.resolve('pdfjs-dist/package.json')), 'iccs', profile));
  assert.deepEqual(deployedProfile, packageProfile);
});
