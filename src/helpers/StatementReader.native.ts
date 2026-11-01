import { recognizeText } from '@infinitered/react-native-mlkit-text-recognition';
import { extractTextFromPage, getPageCount } from 'expo-pdf-text-extract';
import { requireOptionalNativeModule } from 'expo';
import { parseStatement, type StatementData } from './StatementParser';

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
    return parseStatement(result.text);
  }
  const count = await getPageCount(uri);
  if (count > MAX_STATEMENT_PAGES) throw new Error('Massimo 150 pagine per documento.');
  const texts: string[] = [];
  for (let page = 1; page <= count; page++) {
    signal?.throwIfAborted();
    progress(`Lettura locale pagina ${page}/${count}...`);
    let text = await extractTextFromPage(uri, page);
    if (!parseStatement(text).transactions.length) {
      const scanner = requireOptionalNativeModule<{ recognizePage(uri: string, page: number): Promise<string> }>('StatementPdf');
      if (!scanner) throw new Error('OCR PDF richiede una nuova development build. In alternativa importa le pagine come foto.');
      progress(`OCR locale pagina ${page}/${count}...`);
      text = await scanner.recognizePage(uri, page);
    }
    texts.push(text);
  }
  signal?.throwIfAborted();
  return parseStatement(texts.join('\n\n'));
}
