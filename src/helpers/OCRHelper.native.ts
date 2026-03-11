import {
  recognizeText,
  type Text as TextRecognitionResult,
} from "@infinitered/react-native-mlkit-text-recognition";
import { extractText as extractPdfText } from "expo-pdf-text-extract";

export interface OCRTransactionData {
  amount?: number;
  description?: string;
  date?: string; // dd-MM-yyyy
  type?: "income" | "expense";
}

export interface OCRStatementLine {
  date: string; // dd-MM-yyyy
  description: string;
  amount: number;
  type: "income" | "expense";
}

export interface OCRStatementData {
  accountName?: string;
  transactions: OCRStatementLine[];
}

export class OCRHelper {
  /**
   * Extracts text from an image URI using Google ML Kit on-device OCR.
   */
  static async recognizeText(imageUri: string): Promise<TextRecognitionResult> {
    return recognizeText(imageUri);
  }

  /**
   * Extracts transaction data from an image (receipt/invoice).
   * Returns parsed fields: amount, description, date, type.
   */
  static async extractTransactionData(
    imageUri: string
  ): Promise<OCRTransactionData> {
    const result = await this.recognizeText(imageUri);
    const text = result.text;
    const lines = text
      .split("\n")
      .map((l) => l.trim())
      .filter(Boolean);

    return {
      amount: this.extractAmount(lines),
      description: this.extractDescription(lines),
      date: this.extractDate(text),
      type: "expense", // receipts are typically expenses
    };
  }

  /**
   * Finds the most likely total amount from OCR lines.
   * Looks for keywords like "totale", "total", "importo", then falls back to the largest number.
   */
  private static extractAmount(lines: string[]): number | undefined {
    // Pattern: numbers with optional decimals (comma or dot as separator)
    const amountRegex = /(\d{1,3}(?:[.,]\d{3})*[.,]\d{2}|\d+[.,]\d{2})/;

    // Priority keywords for total amount
    const totalKeywords = [
      "totale",
      "total",
      "importo",
      "amount",
      "da pagare",
      "dovuto",
      "saldo",
      "netto",
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
    // Italian format: 1.234,56 → remove dots, replace comma with dot
    if (raw.includes(",") && raw.includes(".")) {
      return parseFloat(raw.replace(/\./g, "").replace(",", "."));
    }
    // Comma as decimal separator: 12,50
    if (raw.includes(",")) {
      return parseFloat(raw.replace(",", "."));
    }
    return parseFloat(raw);
  }

  /**
   * Extracts a date from OCR text.
   * Supports formats: dd/MM/yyyy, dd-MM-yyyy, dd.MM.yyyy
   */
  private static extractDate(text: string): string | undefined {
    const dateRegex = /(\d{1,2})[\/\-.](\d{1,2})[\/\-.](\d{2,4})/;
    const match = text.match(dateRegex);
    if (!match) return undefined;

    const day = match[1].padStart(2, "0");
    const month = match[2].padStart(2, "0");
    let year = match[3];
    if (year.length === 2) {
      year = "20" + year;
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
      // Return the first meaningful line (likely the merchant/store name)
      return line;
    }

    return undefined;
  }

  // ── Bank Statement Parsing ──

  /**
   * Extracts multiple transactions from a bank statement image.
   * Tries to identify the account name and parse each statement line.
   */
  static async extractStatementData(
    imageUri: string
  ): Promise<OCRStatementData> {
    const result = await this.recognizeText(imageUri);
    const text = result.text;
    const lines = text
      .split("\n")
      .map((l) => l.trim())
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
    const accountKeywords = [
      "conto",
      "account",
      "iban",
      "carta",
      "card",
      "c/c",
    ];

    for (const line of lines) {
      const lower = line.toLowerCase();
      if (accountKeywords.some((kw) => lower.includes(kw))) {
        return line;
      }
    }
    return undefined;
  }

  /**
   * Parses bank statement lines. Each line typically has:
   * date | description | amount (with sign or in separate dare/avere columns)
   */
  private static extractStatementLines(lines: string[]): OCRStatementLine[] {
    const transactions: OCRStatementLine[] = [];
    const dateRegex = /^(\d{1,2})[\/\-.](\d{1,2})[\/\-.](\d{2,4})/;
    const amountRegex =
      /([+-]?\s*\d{1,3}(?:[.,]\d{3})*[.,]\d{2}|[+-]?\s*\d+[.,]\d{2})\s*€?$/;

    for (const line of lines) {
      const dateMatch = line.match(dateRegex);
      if (!dateMatch) continue;

      const amountMatch = line.match(amountRegex);
      if (!amountMatch) continue;

      const day = dateMatch[1].padStart(2, "0");
      const month = dateMatch[2].padStart(2, "0");
      let year = dateMatch[3];
      if (year.length === 2) year = "20" + year;
      const date = `${day}-${month}-${year}`;

      const rawAmount = amountMatch[1].replace(/\s/g, "");
      const isNegative = rawAmount.startsWith("-");
      const amount = this.parseAmount(rawAmount.replace(/^[+-]/, ""));
      if (amount === 0 || isNaN(amount)) continue;

      // Extract description: text between the date and the amount
      const afterDate = line.substring(dateMatch[0].length);
      const descriptionPart = afterDate
        .replace(amountRegex, "")
        .trim()
        .replace(/^[\s|]+|[\s|]+$/g, "");

      transactions.push({
        date,
        description: descriptionPart || "Transazione",
        amount,
        type: isNegative ? "expense" : "income",
      });
    }

    return transactions;
  }

  // ── PDF Statement Import ──

  /**
   * Extracts multiple transactions from a PDF bank statement.
   * Uses native PDF text extraction (no OCR needed for text-based PDFs).
   */
  static async extractStatementDataFromPDF(
    pdfUri: string
  ): Promise<OCRStatementData> {
    const text = await extractPdfText(pdfUri);
    const lines = text
      .split("\n")
      .map((l) => l.trim())
      .filter(Boolean);

    return {
      accountName: this.extractAccountName(lines),
      transactions: this.extractStatementLines(lines),
    };
  }
}
