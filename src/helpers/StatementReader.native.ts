import { recognizeText } from '@infinitered/react-native-mlkit-text-recognition';
import { extractTextFromPage, getPageCount } from 'expo-pdf-text-extract';
import { requireOptionalNativeModule } from 'expo';
import { parseStatement, type StatementData } from './StatementParser';
import {
  mergeStatementPages,
  parsePositionedStatement,
  type StatementTextBox,
} from './StatementLayout';

export const MAX_STATEMENT_BYTES = 25 * 1024 * 1024;
export const MAX_STATEMENT_PAGES = 150;

export async function readStatement(
  uri: string,
  pdf: boolean,
  progress: (message: string) => void = () => {},
  signal?: AbortSignal,
): Promise<StatementData> {
  if (!uri.startsWith('file://')) throw new Error('Selezionare un documento locale.');
  signal?.throwIfAborted();
  if (!pdf) {
    progress('Riconoscimento immagine sul dispositivo...');
    const result = await recognizeText(uri);
    signal?.throwIfAborted();
    const boxes = result.blocks
      .flatMap((block) =>
        block.lines.flatMap((line) => (line.elements.length ? line.elements : [line])),
      )
      .map((item) => ({
        text: item.text,
        x: item.frame.left,
        y: (item.frame.top + item.frame.bottom) / 2,
        width: item.frame.right - item.frame.left,
        height: item.frame.bottom - item.frame.top,
      }));
    return boxes.length ? parsePositionedStatement(boxes) : parseStatement(result.text);
  }
  const count = await getPageCount(uri);
  if (count > MAX_STATEMENT_PAGES) throw new Error('Massimo 150 pagine per documento.');
  const pages: StatementData[] = [];
  const scanner = requireOptionalNativeModule<{
    extractPageLayout?: (uri: string, page: number) => Promise<StatementTextBox[]>;
    recognizePageLayout?: (uri: string, page: number) => Promise<StatementTextBox[]>;
    recognizePage(uri: string, page: number): Promise<string>;
  }>('StatementPdf');
  for (let page = 1; page <= count; page++) {
    signal?.throwIfAborted();
    progress(`Lettura locale pagina ${page}/${count}...`);
    let text = await extractTextFromPage(uri, page);
    const boxes = await scanner?.extractPageLayout?.(uri, page);
    let data: StatementData = boxes?.length
      ? parsePositionedStatement(boxes)
      : parseStatement(text);
    const columnsNeedPositions =
      /\b(?:addebiti|dare|uscite)\b/i.test(text) &&
      /\b(?:accrediti|avere|entrate)\b/i.test(text) &&
      data.transactions.some((row) => !row.type);
    if (
      columnsNeedPositions ||
      (!data.transactions.length &&
        (text.trim().length < 80 || /^\s*\d{1,2}[/.\-]\d{1,2}[/.\-]\d{2,4}\s/m.test(text)))
    ) {
      if (!scanner)
        throw new Error(
          'OCR PDF richiede una nuova development build. In alternativa importa le pagine come foto.',
        );
      progress(`OCR locale pagina ${page}/${count}...`);
      if (scanner.recognizePageLayout) {
        const scanned = parsePositionedStatement(await scanner.recognizePageLayout(uri, page));
        data = { ...scanned, accountName: data.accountName || scanned.accountName };
      } else {
        text = await scanner.recognizePage(uri, page);
        data = parseStatement(text);
      }
    }
    pages.push(data);
  }
  signal?.throwIfAborted();
  return mergeStatementPages(pages);
}
