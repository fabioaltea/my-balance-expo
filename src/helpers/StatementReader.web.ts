import { createWorker, type Worker } from 'tesseract.js';
import type * as PdfJs from 'pdfjs-dist';
import { parseStatement, type StatementData } from './StatementParser';
import {
  mergeStatementPages,
  parsePositionedStatement,
  statementPageText,
} from './StatementLayout';

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
  // The Italian model references an optional external ita.special-words file.
  // Clear only that suffix before initialization; retain the bundled dictionaries.
  return createWorker(
    'ita+eng',
    1,
    {
      workerPath: '/ocr/worker.min.js',
      corePath: '/ocr/core',
      langPath: '/ocr',
      workerBlobURL: false,
      cacheMethod: 'none',
    },
    'user_words_suffix ',
  );
}

export async function recognizeLocalImage(uri: string): Promise<string> {
  const worker = await createLocalOcrWorker();
  try {
    return (await worker.recognize(uri)).data.text;
  } finally {
    await worker.terminate();
  }
}

async function recognizeStatementPage(
  source: string | HTMLCanvasElement,
  worker: Worker,
): Promise<StatementData> {
  const { data } = await worker.recognize(source, {}, { text: true, blocks: true });
  const words = data.blocks?.flatMap((block) =>
    block.paragraphs.flatMap((paragraph) => paragraph.lines.flatMap((line) => line.words)),
  );
  return words?.length
    ? parsePositionedStatement(
        words.map((word) => ({
          text: word.text,
          x: word.bbox.x0,
          y: (word.bbox.y0 + word.bbox.y1) / 2,
          width: word.bbox.x1 - word.bbox.x0,
          height: word.bbox.y1 - word.bbox.y0,
        })),
      )
    : parseStatement(data.text);
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
    const worker = await createLocalOcrWorker();
    try {
      const data = await recognizeStatementPage(uri, worker);
      signal?.throwIfAborted();
      return data;
    } finally {
      await worker.terminate();
    }
  }
  const lib = await loadPdf();
  const response = await fetch(uri, { signal });
  const data = new Uint8Array(await response.arrayBuffer());
  if (data.length > MAX_STATEMENT_BYTES) throw new Error('Documento troppo grande: massimo 25 MB.');
  const loading = lib.getDocument({
    data,
    isEvalSupported: false,
    useSystemFonts: false,
    cMapUrl: '/ocr/cmaps/',
    cMapPacked: true,
    standardFontDataUrl: '/ocr/standard_fonts/',
    wasmUrl: '/ocr/wasm/',
    iccUrl: '/ocr/iccs/',
  });
  loading.onPassword = () => {
    void loading.destroy();
  };
  let worker: Worker | undefined;
  try {
    const doc = await loading.promise;
    if (doc.numPages > MAX_STATEMENT_PAGES) throw new Error('Massimo 150 pagine per documento.');
    const pages: StatementData[] = [];
    for (let n = 1; n <= doc.numPages; n++) {
      signal?.throwIfAborted();
      progress(`Lettura locale pagina ${n}/${doc.numPages}...`);
      const page = await doc.getPage(n);
      try {
        const content = await page.getTextContent();
        const boxes = content.items.flatMap((item) =>
          'str' in item
            ? [
                {
                  text: item.str,
                  x: item.transform[4],
                  y: -item.transform[5],
                  width: item.width,
                  height: item.height || 10,
                },
              ]
            : [],
        );
        const text = statementPageText(boxes);
        let data: StatementData = parsePositionedStatement(boxes);
        // A digital cover/summary page needs no OCR. A table with unreadable rows does.
        const tableDetected = 'tableDetected' in data && data.tableDetected;
        if (
          !data.transactions.length &&
          (tableDetected ||
            text.trim().length < 80 ||
            /^\s*\d{1,2}[/.\-]\d{1,2}[/.\-]\d{2,4}\s/m.test(text))
        ) {
          progress(`OCR locale pagina ${n}/${doc.numPages}...`);
          worker ??= await createLocalOcrWorker();
          const size = page.getViewport({ scale: 1 });
          const viewport = page.getViewport({
            scale: Math.min(3, 2400 / Math.max(size.width, size.height)),
          });
          const canvas = document.createElement('canvas');
          canvas.width = Math.ceil(viewport.width);
          canvas.height = Math.ceil(viewport.height);
          const context = canvas.getContext('2d');
          if (!context) throw new Error('Rendering PDF non disponibile.');
          try {
            await page.render({ canvasContext: context, canvas, viewport }).promise;
            const scanned = await recognizeStatementPage(canvas, worker);
            if (scanned.transactions.length || !text.trim())
              data = { ...scanned, accountName: data.accountName || scanned.accountName };
          } finally {
            canvas.width = canvas.height = 0;
          }
        }
        pages.push(data);
      } finally {
        page.cleanup();
      }
    }
    signal?.throwIfAborted();
    return mergeStatementPages(pages);
  } finally {
    try {
      await worker?.terminate();
    } finally {
      await loading.destroy();
    }
  }
}
