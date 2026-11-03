/* global __dirname */
const { copyFileSync, cpSync, mkdirSync } = require('node:fs');
const path = require('node:path');
const root = path.resolve(__dirname, '..');
const dest = path.join(root, 'public/ocr');
mkdirSync(dest, { recursive: true });
const packageDir = (name) => path.dirname(require.resolve(`${name}/package.json`));
for (const name of ['pdf.mjs', 'pdf.worker.mjs']) {
  copyFileSync(path.join(packageDir('pdfjs-dist'), 'build', name), path.join(dest, name));
}
for (const name of ['cmaps', 'standard_fonts', 'wasm', 'iccs']) {
  cpSync(path.join(packageDir('pdfjs-dist'), name), path.join(dest, name), { recursive: true });
}
copyFileSync(path.join(packageDir('tesseract.js'), 'dist/worker.min.js'), path.join(dest, 'worker.min.js'));
// Include all SIMD/LSTM variants selected by Tesseract at runtime.
const core = path.dirname(require.resolve('tesseract.js-core/package.json', { paths: [packageDir('tesseract.js')] }));
cpSync(core, path.join(dest, 'core'), { recursive: true });
for (const lang of ['ita', 'eng']) {
  copyFileSync(path.join(packageDir(`@tesseract.js-data/${lang}`), '4.0.0_best_int', `${lang}.traineddata.gz`),
    path.join(dest, `${lang}.traineddata.gz`));
}
