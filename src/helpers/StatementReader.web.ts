import { createWorker, type Worker } from 'tesseract.js';
import type * as PdfJs from 'pdfjs-dist';
import { parseStatement, type StatementData } from './StatementParser';

export const MAX_STATEMENT_BYTES = 25 * 1024 * 1024;
export const MAX_STATEMENT_PAGES = 150;
type Progress = (message: string) => void;
let pdfLibrary: Promise<typeof PdfJs> | undefined;

async function loadPdf(): Promise<typeof PdfJs> {
  if (!pdfLibrary) {
    pdfLibrary = new Promise((resolve, reject) => {
      const script = document.createElement('script');
      script.type = 'module';
      script.src = '/ocr/pdf.mjs';
      script.onload = () => {
        const lib = (globalThis as typeof globalThis & { pdfjsLib?: typeof PdfJs }).pdfjsLib;
        script.remove();
        if (!lib) {
          pdfLibrary = undefined;
          reject(new Error('Motore PDF locale non disponibile.'));
        } else {
          lib.GlobalWorkerOptions.workerSrc = '/ocr/pdf.worker.mjs';
          resolve(lib);
        }
      };
      script.onerror = () => {
        script.remove();
        pdfLibrary = undefined;
        reject(new Error('Asset PDF locali mancanti. Ricostruire il sito.'));
      };
      document.head.appendChild(script);
    });
  }
  return pdfLibrary;
}

export async function createLocalOcrWorker(): Promise<Worker> {
  return createWorker('ita+eng', 1, {
    workerPath: '/ocr/worker.min.js',
    corePath: '/ocr/core',
    langPath: '/ocr',
    workerBlobURL: false,
    cacheMethod: 'none',
  });
}

export async function recognizeLocalImage(uri: string): Promise<string> {
  const worker = await createLocalOcrWorker();
  try {
    return (await worker.recognize(uri)).data.text;
  } finally {
    await worker.terminate();
  }
}

export async function readStatement(
  uri: string,
  pdf: boolean,
  progress: Progress = () => {},
  signal?: AbortSignal,
): Promise<StatementData> {
  if (!/^(?:blob:|data:)/.test(uri)) throw new Error('Selezionare un documento locale.');
  signal?.throwIfAborted();
  if (!pdf) {
    progress('Riconoscimento immagine sul dispositivo...');
    const text = await recognizeLocalImage(uri);
    signal?.throwIfAborted();
    return parseStatement(text);
  }
  const lib = await loadPdf();
  const response = await fetch(uri, { signal });
  const data = new Uint8Array(await response.arrayBuffer());
  if (data.length > MAX_STATEMENT_BYTES) throw new Error('Documento troppo grande: massimo 25 MB.');
  const loading = lib.getDocument({
    data, isEvalSupported: false, useSystemFonts: false,
    cMapUrl: '/ocr/cmaps/', cMapPacked: true,
    standardFontDataUrl: '/ocr/standard_fonts/', wasmUrl: '/ocr/wasm/',
  });
  loading.onPassword = () => { void loading.destroy(); };
  let worker: Worker | undefined;
  try {
    const doc = await loading.promise;
    if (doc.numPages > MAX_STATEMENT_PAGES) throw new Error('Massimo 150 pagine per documento.');
    const texts: string[] = [];
    for (let n = 1; n <= doc.numPages; n++) {
      signal?.throwIfAborted();
      progress(`Lettura locale pagina ${n}/${doc.numPages}...`);
      const page = await doc.getPage(n);
      try {
        const content = await page.getTextContent();
        const rows: { y: number; items: { x: number; str: string }[] }[] = [];
        for (const item of content.items) {
          if (!('str' in item)) continue;
          let row = rows.find(r => Math.abs(r.y - item.transform[5]) <= 2);
          if (!row) { row = { y: item.transform[5], items: [] }; rows.push(row); }
          row.items.push({ x: item.transform[4], str: item.str });
        }
        let text = rows.sort((a, b) => b.y - a.y)
          .map(r => r.items.sort((a, b) => a.x - b.x).map(i => i.str).join(' ')).join('\n');
        // A scanned page may still contain a digital header or footer.
        if (!parseStatement(text).transactions.length) {
          progress(`OCR locale pagina ${n}/${doc.numPages}...`);
          worker ??= await createLocalOcrWorker();
          const size = page.getViewport({ scale: 1 });
          const viewport = page.getViewport({ scale: Math.min(3, 2400 / Math.max(size.width, size.height)) });
          const canvas = document.createElement('canvas');
          canvas.width = Math.ceil(viewport.width);
          canvas.height = Math.ceil(viewport.height);
          const context = canvas.getContext('2d');
          if (!context) throw new Error('Rendering PDF non disponibile.');
          try {
            await page.render({ canvasContext: context, canvas, viewport }).promise;
            text = (await worker.recognize(canvas)).data.text;
          } finally {
            canvas.width = canvas.height = 0;
          }
        }
        texts.push(text);
      } finally {
        page.cleanup();
      }
    }
    signal?.throwIfAborted();
    return parseStatement(texts.join('\n\n'));
  } finally {
    try { await worker?.terminate(); } finally { await loading.destroy(); }
  }
}
