const { test } = require('node:test');
const assert = require('node:assert/strict');
const { load } = require('./load-ts.cjs');
const boxes = [
  ['Data Operazione', 20, 10],
  ['Data Valuta', 100, 10],
  ['Descrizione', 180, 10],
  ['Addebiti', 400, 10],
  ['Accrediti', 500, 10],
  ['02.11.2026', 20, 30],
  ['02.11.2026', 100, 30],
  ['Acquisto sintetico', 180, 30],
  ['12,34', 410, 30],
  ['03.11.2026', 20, 50],
  ['03.11.2026', 100, 50],
  ['Rimborso sintetico', 180, 50],
  ['56,78', 510, 50],
].map(([text, x, y]) => ({ text, x, y, width: 40, height: 10 }));

test('OCR web richiede le coordinate e ricava entrambe le direzioni', async () => {
  let terminated = false;
  const reader = load('src/helpers/StatementReader.web.ts', {
    'tesseract.js': {
      createWorker: async () => ({
        recognize: async (_uri, _options, output) => {
          assert.equal(output.blocks, true);
          return {
            data: {
              text: '',
              blocks: [
                {
                  paragraphs: [
                    {
                      lines: [
                        {
                          words: boxes.map((b) => ({
                            text: b.text,
                            bbox: { x0: b.x, x1: b.x + b.width, y0: b.y - 5, y1: b.y + 5 },
                          })),
                        },
                      ],
                    },
                  ],
                },
              ],
            },
          };
        },
        terminate: async () => {
          terminated = true;
        },
      }),
    },
  });
  const result = await reader.readStatement('blob:synthetic-image', false);
  assert.deepEqual(
    Array.from(result.transactions, (row) => row.type),
    ['expense', 'income'],
  );
  assert.equal(terminated, true);
});

test('PDF nativo usa il layout digitale quando il modulo lo fornisce', async () => {
  const reader = load('src/helpers/StatementReader.native.ts', {
    '@infinitered/react-native-mlkit-text-recognition': {},
    'expo-pdf-text-extract': {
      getPageCount: async () => 1,
      extractTextFromPage: async () => 'Data Operazione Data Valuta Descrizione Addebiti Accrediti',
    },
    expo: { requireOptionalNativeModule: () => ({ extractPageLayout: async () => boxes }) },
  });
  const result = await reader.readStatement('file:///synthetic.pdf', true);
  assert.deepEqual(
    Array.from(result.transactions, (row) => row.type),
    ['expense', 'income'],
  );
});

test('immagini native mantengono le coordinate degli elementi ML Kit', async () => {
  const reader = load('src/helpers/StatementReader.native.ts', {
    '@infinitered/react-native-mlkit-text-recognition': {
      recognizeText: async () => ({
        text: '',
        blocks: [
          {
            lines: [
              {
                elements: boxes.map((b) => ({
                  text: b.text,
                  frame: { left: b.x, right: b.x + b.width, top: b.y - 5, bottom: b.y + 5 },
                })),
              },
            ],
          },
        ],
      }),
    },
    'expo-pdf-text-extract': {},
    expo: {},
  });
  const result = await reader.readStatement('file:///synthetic.jpg', false);
  assert.deepEqual(
    Array.from(result.transactions, (row) => row.type),
    ['expense', 'income'],
  );
});
