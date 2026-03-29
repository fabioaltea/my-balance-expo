import type Tesseract from 'tesseract.js';

export interface OCRTransactionData {
  amount?: number;
  description?: string;
  date?: string; // dd-MM-yyyy
  type?: 'income' | 'expense';
}

export interface OCRStatementLine {
  date: string; // dd-MM-yyyy
  description: string;
  amount: number;
  type: 'income' | 'expense';
}

export interface OCRStatementData {
  accountName?: string;
  transactions: OCRStatementLine[];
}

interface StatementMovementGroup {
  header: string;
  details: string[];
}

export class OCRHelper {
  /**
   * Extracts text from an image URI using Tesseract.js (web).
   */
  static async recognizeText(imageUri: string): Promise<Tesseract.RecognizeResult> {
    const { recognize } = await import('tesseract.js');
    return recognize(imageUri, 'ita+eng');
  }

  /**
   * Extracts transaction data from an image (receipt/invoice).
   * Returns parsed fields: amount, description, date, type.
   */
  static async extractTransactionData(imageUri: string): Promise<OCRTransactionData> {
    const result = await this.recognizeText(imageUri);
    const text = result.data.text;
    const lines = text
      .split('\n')
      .map((l: string) => l.trim())
      .filter(Boolean);

    return {
      amount: this.extractAmount(lines),
      description: this.extractDescription(lines),
      date: this.extractDate(text),
      type: 'expense', // receipts are typically expenses
    };
  }

  /**
   * Finds the most likely total amount from OCR lines.
   * Looks for keywords like "totale", "total", "importo", then falls back to the largest number.
   */
  private static extractAmount(lines: string[]): number | undefined {
    const amountRegex = /(\d{1,3}(?:[.,]\d{3})*[.,]\d{2}|\d+[.,]\d{2})/;

    const totalKeywords = [
      'totale',
      'total',
      'importo',
      'amount',
      'da pagare',
      'dovuto',
      'saldo',
      'netto',
    ];

    // First pass: look for a line with a total keyword + amount
    for (const line of lines) {
      const lower = line.toLowerCase();
      if (totalKeywords.some((kw) => lower.includes(kw))) {
        const match = line.match(amountRegex);
        if (match) {
          return this.parseAmount(match[1]);
        }
      }
    }

    // Second pass: find the largest amount (likely the total)
    let maxAmount = 0;
    for (const line of lines) {
      const match = line.match(amountRegex);
      if (match) {
        const val = this.parseAmount(match[1]);
        if (val > maxAmount) {
          maxAmount = val;
        }
      }
    }

    return maxAmount > 0 ? maxAmount : undefined;
  }

  /**
   * Parses an amount string like "1.234,56" or "1234.56" into a number.
   */
  private static parseAmount(raw: string): number {
    const normalized = raw
      .replace(/[\u00A0\u2000-\u200B\u202F\u205F\u3000]/g, ' ')
      .replace(/\s+/g, '')
      .replace(/(\d)[.,](\d{3})(?=[.,]\d{2}$)/g, '$1$2');

    if (normalized.includes(',')) {
      return parseFloat(normalized.replace(/\./g, '').replace(',', '.'));
    }

    return parseFloat(normalized);
  }

  private static normalizeWhitespace(input: string): string {
    return input
      .replace(/[\u00A0\u2000-\u200B\u202F\u205F\u3000]/g, ' ')
      .replace(/\s+/g, ' ')
      .trim();
  }

  private static normalizeStatementLine(input: string): string {
    return this.normalizeWhitespace(input)
      .replace(/(\d)\s*([.,])\s*(\d{2})(?=\b)/g, '$1$2$3')
      .replace(/([+-])\s+(\d)/g, '$1$2')
      .trim();
  }

  private static mergeBrokenAmountLines(lines: string[]): string[] {
    const merged: string[] = [];

    for (let i = 0; i < lines.length; i++) {
      const current = this.normalizeStatementLine(lines[i]);
      const next = lines[i + 1] ? this.normalizeStatementLine(lines[i + 1]) : '';

      if (/(\d{1,3}(?:[ .]\d{3})*[.,])$/.test(current) && /^\d{2}\b/.test(next)) {
        merged.push(this.normalizeStatementLine(`${current}${next.slice(0, 2)}`));
        lines[i + 1] = next.slice(2).trim();
        continue;
      }

      if (current) {
        merged.push(current);
      }
    }

    return merged;
  }

  private static inferTransactionType(line: string, amountToken: string): 'income' | 'expense' {
    if (/^\s*-/.test(amountToken)) return 'expense';
    if (/^\s*\+/.test(amountToken)) return 'income';

    const lower = line.toLowerCase();
    const incomeKeywords = [
      'accredito',
      'accrediti',
      'stipendio',
      'rimborso',
      'versamento',
      'bonifico a vostro favore',
      'incasso',
      'interessi creditori',
      'giroconto in entrata',
    ];

    if (incomeKeywords.some((keyword) => lower.includes(keyword))) {
      return 'income';
    }

    return 'expense';
  }

  private static findLastAmountToken(line: string): string | null {
    const amountTokenRegex = /[+-]?\s*\d{1,3}(?:[ .]\d{3})*[.,]\s*\d{2}|[+-]?\s*\d+[.,]\s*\d{2}/g;
    const matches = line.match(amountTokenRegex);
    if (!matches || matches.length === 0) return null;
    return matches[matches.length - 1];
  }

  private static isMovementHeaderLine(line: string): boolean {
    const normalized = this.normalizeStatementLine(line);
    const headerRegex =
      /^(\d{1,2}[\/\-.]\d{1,2}[\/\-.]\d{2,4})\s+(\d{1,2}[\/\-.]\d{1,2}[\/\-.]\d{2,4})\s+.+\s+([+-]?\s*\d{1,3}(?:[ .]\d{3})*[.,]\s*\d{2}|[+-]?\s*\d+[.,]\s*\d{2})\s*€?\s*$/;
    return headerRegex.test(normalized);
  }

  private static groupLinesByMovementPattern(lines: string[]): StatementMovementGroup[] {
    const groups: StatementMovementGroup[] = [];
    let current: StatementMovementGroup | null = null;

    for (const rawLine of lines) {
      const line = this.normalizeStatementLine(rawLine);
      if (!line) continue;

      if (this.isMovementHeaderLine(line)) {
        if (current) groups.push(current);
        current = { header: line, details: [] };
        continue;
      }

      if (current) {
        current.details.push(line);
      }
    }

    if (current) groups.push(current);

    return groups;
  }

  private static parseDateToken(token: string): string | null {
    const match = token.match(/^(\d{1,2})[\/\-.](\d{1,2})[\/\-.](\d{2,4})$/);
    if (!match) return null;
    const day = match[1].padStart(2, '0');
    const month = match[2].padStart(2, '0');
    let year = match[3];
    if (year.length === 2) year = `20${year}`;
    return `${day}-${month}-${year}`;
  }

  private static buildDescriptionFromMovementGroup(group: StatementMovementGroup): string {
    const parts: string[] = [];

    const headerWithoutDates = group.header
      .replace(/^\d{1,2}[\/\-.]\d{1,2}[\/\-.]\d{2,4}\s+/, '')
      .replace(/^\d{1,2}[\/\-.]\d{1,2}[\/\-.]\d{2,4}\s+/, '');
    const headerAmount = this.findLastAmountToken(headerWithoutDates);
    const baseDescription = headerAmount
      ? headerWithoutDates.replace(
          new RegExp(`${headerAmount.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}$`),
          '',
        )
      : headerWithoutDates;
    const cleanBase = this.normalizeStatementLine(baseDescription).trim();
    if (cleanBase) parts.push(cleanBase);

    const skipPrefixes = [
      'mediante la carta',
      'carta n',
      'cod.',
      'abi',
      'effettuato il',
      'alle ore',
      'via -',
      'data incasso',
      'numero avviso',
      'codice azienda',
      'nome azienda',
      'iuv',
    ];

    for (const detail of group.details) {
      const lower = detail.toLowerCase();
      if (skipPrefixes.some((prefix) => lower.startsWith(prefix))) continue;
      if (/^pagina\s+\d+/i.test(detail)) continue;
      if (/^saldo\s+/i.test(detail)) continue;
      if (/^data\s+operazione/i.test(detail)) continue;
      if (detail.length < 3) continue;
      parts.push(detail);
      if (parts.length >= 3) break;
    }

    return this.normalizeStatementLine(parts.join(' ')) || 'Transazione';
  }

  private static parseMovementGroups(groups: StatementMovementGroup[]): OCRStatementLine[] {
    const transactions: OCRStatementLine[] = [];
    const seen = new Set<string>();

    for (const group of groups) {
      const tokens = group.header.split(' ').filter(Boolean);
      if (tokens.length < 3) continue;

      const operationDate = this.parseDateToken(tokens[0]);
      if (!operationDate) continue;

      const amountToken = this.findLastAmountToken(group.header);
      if (!amountToken) continue;

      const amount = this.parseAmount(amountToken.replace(/^[+-]/, ''));
      if (amount === 0 || isNaN(amount)) continue;

      const description = this.buildDescriptionFromMovementGroup(group);
      const type = this.inferTransactionType(group.header, amountToken);

      const signature = `${operationDate}|${description}|${amount.toFixed(2)}`;
      if (seen.has(signature)) continue;
      seen.add(signature);

      transactions.push({
        date: operationDate,
        description,
        amount,
        type,
      });
    }

    return transactions;
  }

  /**
   * Extracts a date from OCR text.
   * Supports formats: dd/MM/yyyy, dd-MM-yyyy, dd.MM.yyyy
   */
  private static extractDate(text: string): string | undefined {
    const dateRegex = /(\d{1,2})[\/\-.](\d{1,2})[\/\-.](\d{2,4})/;
    const match = text.match(dateRegex);
    if (!match) return undefined;

    const day = match[1].padStart(2, '0');
    const month = match[2].padStart(2, '0');
    let year = match[3];
    if (year.length === 2) {
      year = '20' + year;
    }

    return `${day}-${month}-${year}`;
  }

  /**
   * Tries to extract a meaningful description (merchant name, first line, etc.).
   * Uses the first non-numeric, non-date line as description.
   */
  private static extractDescription(lines: string[]): string | undefined {
    const skipRegex = /^[\d\/\-.,:\s€$£%]+$/;
    const dateRegex = /^\d{1,2}[\/\-.]?\d{1,2}[\/\-.]?\d{2,4}$/;

    for (const line of lines) {
      if (line.length < 3) continue;
      if (skipRegex.test(line)) continue;
      if (dateRegex.test(line)) continue;
      return line;
    }

    return undefined;
  }

  // ── Bank Statement Parsing ──

  /**
   * Extracts multiple transactions from a bank statement image.
   */
  static async extractStatementData(imageUri: string): Promise<OCRStatementData> {
    const result = await this.recognizeText(imageUri);
    const text = result.data.text;
    const lines = text
      .split('\n')
      .map((l: string) => l.trim())
      .filter(Boolean);

    return {
      accountName: this.extractAccountName(lines),
      transactions: this.extractStatementLines(lines),
    };
  }

  /**
   * Identifies the account name/IBAN from statement header lines.
   */
  private static extractAccountName(lines: string[]): string | undefined {
    const accountKeywords = ['conto', 'account', 'iban', 'carta', 'card', 'c/c'];

    for (const line of lines) {
      const lower = line.toLowerCase();
      if (accountKeywords.some((kw) => lower.includes(kw))) {
        return line;
      }
    }
    return undefined;
  }

  /**
   * Parses bank statement lines.
   */
  private static extractStatementLines(lines: string[]): OCRStatementLine[] {
    const transactions: OCRStatementLine[] = [];
    const dateRegex = /(\d{1,2})[\/\-.](\d{1,2})[\/\-.](\d{2,4})/;
    const optionalValueDateRegex =
      /^(\d{1,2}[\/\-.]\d{1,2}[\/\-.]\d{2,4})\s+(\d{1,2}[\/\-.]\d{1,2}[\/\-.]\d{2,4})\b/;
    const candidateLines = this.mergeBrokenAmountLines(lines);

    const groups = this.groupLinesByMovementPattern(candidateLines);
    if (groups.length >= 3) {
      console.log('[OCRHelper.web] Statement parser strategy', {
        strategy: 'grouped-by-movement',
        groups: groups.length,
      });
      return this.parseMovementGroups(groups);
    }

    console.log('[OCRHelper.web] Statement parser strategy', {
      strategy: 'line-fallback',
      groups: groups.length,
    });

    const seen = new Set<string>();

    for (const rawLine of candidateLines) {
      const line = this.normalizeStatementLine(rawLine);
      const dateMatch = line.match(dateRegex);
      if (!dateMatch) continue;

      const amountToken = this.findLastAmountToken(line);
      if (!amountToken) continue;

      const dateStartIndex = dateMatch.index ?? 0;
      const lineFromDate = line.substring(dateStartIndex).trim();
      const anchoredDateMatch = lineFromDate.match(/^(\d{1,2})[\/\-.](\d{1,2})[\/\-.](\d{2,4})/);
      if (!anchoredDateMatch) continue;

      const day = anchoredDateMatch[1].padStart(2, '0');
      const month = anchoredDateMatch[2].padStart(2, '0');
      let year = anchoredDateMatch[3];
      if (year.length === 2) year = '20' + year;
      const date = `${day}-${month}-${year}`;

      const rawAmount = this.normalizeStatementLine(amountToken);
      const amount = this.parseAmount(rawAmount.replace(/^[+-]/, ''));
      if (amount === 0 || isNaN(amount)) continue;

      let afterDate = lineFromDate.substring(anchoredDateMatch[0].length).trim();
      const valueDateMatch = afterDate.match(/^(\d{1,2}[\/\-.]\d{1,2}[\/\-.]\d{2,4})\b/);
      if (valueDateMatch) {
        afterDate = afterDate.substring(valueDateMatch[0].length).trim();
      }
      const twoDatePrefix = lineFromDate.match(optionalValueDateRegex);
      if (twoDatePrefix) {
        afterDate = lineFromDate.substring(twoDatePrefix[0].length).trim();
      }

      const amountTokenIndex = afterDate.lastIndexOf(rawAmount);
      if (amountTokenIndex >= 0) {
        afterDate = afterDate.substring(0, amountTokenIndex).trim();
      }

      const descriptionPart = afterDate.trim().replace(/^[\s|]+|[\s|]+$/g, '');

      const signature = `${date}|${descriptionPart}|${amount.toFixed(2)}`;
      if (seen.has(signature)) continue;
      seen.add(signature);

      transactions.push({
        date,
        description: descriptionPart || 'Transazione',
        amount,
        type: this.inferTransactionType(line, rawAmount),
      });
    }

    return transactions;
  }

  // ── PDF Statement Import ──

  /**
   * Extracts multiple transactions from a PDF bank statement.
   */
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  private static pdfjsPromise: Promise<any> | null = null;

  private static loadPdfjs(): Promise<any> {
    if (this.pdfjsPromise) return this.pdfjsPromise;

    const PDFJS_VERSION = '4.8.69';
    const CDN = `https://cdnjs.cloudflare.com/ajax/libs/pdf.js/${PDFJS_VERSION}`;

    this.pdfjsPromise = new Promise((resolve, reject) => {
      // Load worker first
      const workerScript = document.createElement('script');
      workerScript.src = `${CDN}/pdf.worker.min.mjs`;
      workerScript.type = 'module';

      // Load main library
      const mainScript = document.createElement('script');
      mainScript.src = `${CDN}/pdf.min.mjs`;
      mainScript.type = 'module';

      mainScript.onload = () => {
        const pdfjsLib = (window as any).pdfjsLib;
        if (!pdfjsLib) {
          reject(new Error('pdf.js failed to load'));
          return;
        }
        pdfjsLib.GlobalWorkerOptions.workerSrc = `${CDN}/pdf.worker.min.mjs`;
        resolve(pdfjsLib);
      };
      mainScript.onerror = () => reject(new Error('Failed to load pdf.js'));

      document.head.appendChild(workerScript);
      document.head.appendChild(mainScript);
    });

    return this.pdfjsPromise;
  }

  static async extractStatementDataFromPDF(pdfUri: string): Promise<OCRStatementData> {
    const pdfjsLib = await this.loadPdfjs();
    const pdf = await pdfjsLib.getDocument(pdfUri).promise;
    const pageLines: string[] = [];

    for (let i = 1; i <= pdf.numPages; i++) {
      const page = await pdf.getPage(i);
      const content = await page.getTextContent();
      const lines = this.buildPdfPageLines(content.items || []);
      pageLines.push(...lines);
    }

    const lines = this.mergeBrokenAmountLines(pageLines)
      .map((line) => this.normalizeStatementLine(line))
      .filter(Boolean);

    const transactions = this.extractStatementLines(lines);
    console.log('[OCRHelper.web] PDF parse diagnostics', {
      pages: pdf.numPages,
      lineCount: lines.length,
      transactionCount: transactions.length,
      sampleLines: lines.slice(0, 12),
    });

    return {
      accountName: this.extractAccountName(lines),
      transactions,
    };
  }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  private static buildPdfPageLines(items: any[]): string[] {
    if (!items.length) return [];

    const positionedItems = items
      .map((item) => {
        const text = this.normalizeWhitespace(String(item?.str ?? ''));
        const x = Number(item?.transform?.[4] ?? 0);
        const y = Number(item?.transform?.[5] ?? 0);
        return { text, x, y };
      })
      .filter((item) => item.text.length > 0);

    if (positionedItems.length === 0) return [];

    const rows: Array<{ y: number; items: Array<{ text: string; x: number }> }> = [];
    const rowTolerance = 2;

    for (const item of positionedItems) {
      let row = rows.find((r) => Math.abs(r.y - item.y) <= rowTolerance);
      if (!row) {
        row = { y: item.y, items: [] };
        rows.push(row);
      }
      row.items.push({ text: item.text, x: item.x });
    }

    rows.sort((a, b) => b.y - a.y);

    return rows
      .map((row) => {
        row.items.sort((a, b) => a.x - b.x);
        return this.normalizeStatementLine(row.items.map((item) => item.text).join(' '));
      })
      .filter(Boolean);
  }
}
