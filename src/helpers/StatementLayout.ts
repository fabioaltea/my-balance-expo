import {
  parseStatement,
  statementAmount,
  statementDate,
  type StatementData,
  type StatementRow,
} from './StatementParser';

export interface StatementTextBox {
  text: string;
  x: number;
  y: number;
  width: number;
  height: number;
}
interface TextLine {
  y: number;
  items: StatementTextBox[];
}
interface StatementPageData extends StatementData {
  tableDetected?: boolean;
  leadingDescription?: string;
}

export function statementTextLines(boxes: StatementTextBox[]): TextLine[] {
  const lines: TextLine[] = [];
  for (const box of [...boxes]
    .filter((b) => b.text.trim())
    .sort((a, b) => a.y - b.y || a.x - b.x)) {
    const line = lines.find(
      (l) => Math.abs(l.y - box.y) <= Math.max(2, Math.min(5, box.height * 0.4)),
    );
    if (line) line.items.push(box);
    else lines.push({ y: box.y, items: [box] });
  }
  return lines
    .sort((a, b) => a.y - b.y)
    .map((line) => ({ ...line, items: line.items.sort((a, b) => a.x - b.x) }));
}

export function statementPageText(boxes: StatementTextBox[]): string {
  return statementTextLines(boxes)
    .map((line) => line.items.map((box) => box.text).join(' '))
    .join('\n');
}

const debitLabel = /^(?:addebiti|uscite|dare|debiti|debits?)$/i;
const creditLabel = /^(?:accrediti|entrate|avere|crediti|credits?)$/i;
const descriptionLabel = /^(?:descrizion[ei](?: operazion[ei])?|description|causale)$/i;
const dateToken = /^\d{1,2}[/.\-]\d{1,2}[/.\-](?:\d{4}|\d{2})$/;

/** Infer directions only from labelled, positioned columns, never from word order. */
export function parsePositionedStatement(
  boxes: StatementTextBox[],
): StatementPageData & { tableDetected: boolean } {
  const lines = statementTextLines(boxes);
  const text = lines.map((line) => line.items.map((box) => box.text).join(' ')).join('\n');
  const headerIndex = lines.findIndex(
    (line) =>
      line.items.some((b) => debitLabel.test(b.text.trim())) &&
      line.items.some((b) => creditLabel.test(b.text.trim())) &&
      line.items.some((b) => descriptionLabel.test(b.text.trim())),
  );
  if (headerIndex < 0) return { ...parseStatement(text), tableDetected: false };
  if (/\b(?:USD|GBP|CHF|JPY)\b|[$£¥]/i.test(text)) {
    return {
      transactions: [],
      warnings: ['Valuta diversa da EUR rilevata: verificare il documento.'],
      tableDetected: true,
    };
  }

  const header = lines[headerIndex].items;
  const debit = header.find((b) => debitLabel.test(b.text.trim()))!;
  const credit = header.find((b) => creditLabel.test(b.text.trim()))!;
  const description = header.find((b) => descriptionLabel.test(b.text.trim()))!;
  const dateAnchor = header.find((b) =>
    /^data(?:\s+(?:operazione|contabile|registrazione))?$/i.test(b.text.trim()),
  );
  const center = (b: StatementTextBox) => b.x + b.width / 2;
  const distance = Math.abs(center(debit) - center(credit));
  if (distance < 10) return { ...parseStatement(text), tableDetected: false };
  const amountBoxes = [debit, credit];
  const descriptionEnd = Math.min(
    ...header.filter((b) => b.x > description.x && b !== description).map((b) => b.x - 4),
    Infinity,
  );
  const descriptionStart = description.x - 3;
  const warnings: string[] = [];
  const transactions: StatementRow[] = [];
  const leadingDescription: string[] = [];
  let pending:
    | { date: string; description: string[]; debit: string[]; credit: string[]; line: number }
    | undefined;

  function finish() {
    if (!pending) return;
    const debitRaw = pending.debit.join(' ').replace(/€/g, '').trim();
    const creditRaw = pending.credit.join(' ').replace(/€/g, '').trim();
    const expense = statementAmount(debitRaw);
    const income = statementAmount(creditRaw);
    const empty = (value: string) => !value || /^(?:[-–—]|0[.,]\s?00)$/.test(value);
    const invalid = (!expense && !empty(debitRaw)) || (!income && !empty(creditRaw));
    const label = pending.description.join(' ').replace(/\s+/g, ' ').trim();
    if (/^(?:saldo|totale|balance)\b/i.test(label)) {
      pending = undefined;
      return;
    }
    if (invalid || !!expense === !!income || !label) {
      warnings.push(
        `Riga ${pending.line}: colonne addebiti/accrediti o descrizione non univoche; verificare sul documento.`,
      );
    } else {
      transactions.push({
        id: String(pending.line),
        date: pending.date,
        description: label.slice(0, 500),
        amount: expense || income!,
        type: expense ? 'expense' : 'income',
      });
    }
    pending = undefined;
  }

  for (let index = headerIndex + 1; index < lines.length; index++) {
    const line = lines[index];
    const raw = line.items
      .map((b) => b.text)
      .join(' ')
      .trim();
    if (
      /^(?:saldo finale|total[ei]|pag(?:ina)?\.?\s+\d|page\s+\d)\b/i.test(raw) ||
      /\b(?:intesa sanpaolo|banca)\b.*\bS\.?p\.?A\b/i.test(raw)
    ) {
      finish();
      break;
    }
    if (
      line.items.some((b) => debitLabel.test(b.text.trim())) &&
      line.items.some((b) => creditLabel.test(b.text.trim()))
    ) {
      finish();
      continue;
    }
    const dates = line.items.filter((b) => dateToken.test(b.text.trim())).sort((a, b) => a.x - b.x);
    const operation = dates.find((box) =>
      dateAnchor
        ? Math.abs(box.x - dateAnchor.x) <= Math.max(6, dateAnchor.height * 2)
        : box.x < descriptionStart,
    );
    if (operation) {
      finish();
      const date = statementDate(operation.text);
      if (!date) {
        warnings.push(`Riga ${index + 1}: data non valida.`);
        continue;
      }
      pending = { date, description: [], debit: [], credit: [], line: index + 1 };
    }
    if (!pending) {
      if (!transactions.length && !operation)
        leadingDescription.push(
          ...line.items
            .filter((box) => box.x >= descriptionStart && box.x < descriptionEnd)
            .map((box) => box.text),
        );
      continue;
    }
    for (const box of line.items) {
      const value = box.text.trim();
      if (dateToken.test(value) && box.x < descriptionStart) continue;
      // Currency cells may be split into several words by OCR or PDF extraction.
      const numeric = /^[+\-–—\d.,\s€'’\u0019]+$/.test(value);
      const column = numeric
        ? amountBoxes.find((label) => Math.abs(center(box) - center(label)) < distance * 0.48)
        : undefined;
      if (column === debit) pending.debit.push(value);
      else if (column === credit) pending.credit.push(value);
      else if (box.x >= descriptionStart && box.x < descriptionEnd) pending.description.push(value);
    }
  }
  finish();
  return {
    accountName: lines
      .slice(0, headerIndex)
      .map((l) => l.items.map((b) => b.text).join(' '))
      .join('\n'),
    transactions,
    warnings,
    tableDetected: true,
    leadingDescription: leadingDescription.join(' '),
  };
}

export function mergeStatementPages(pages: StatementPageData[]): StatementData {
  const transactions: StatementRow[] = [];
  pages.forEach((page, index) => {
    const previous = transactions.at(-1);
    if (previous && page.leadingDescription && pages[index - 1]?.tableDetected) {
      previous.description = `${previous.description} ${page.leadingDescription}`
        .replace(/\s+/g, ' ')
        .slice(0, 500);
    }
    transactions.push(
      ...page.transactions.map((row) => ({ ...row, id: `${index + 1}:${row.id}` })),
    );
  });
  return {
    accountName: pages[0]?.accountName,
    transactions,
    warnings: pages
      .flatMap((page, index) => page.warnings.map((warning) => `Pagina ${index + 1}: ${warning}`))
      .filter((warning) => !warning.includes('Nessun movimento leggibile')),
  };
}
