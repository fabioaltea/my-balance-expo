import type { Account } from '../types/models';

const banks = [
  {
    name: 'Intesa Sanpaolo',
    aliases: ['intesa sanpaolo', 'intesa san paolo', 'intesa', 'sanpaolo', 'san paolo', 'xme'],
  },
  { name: 'UniCredit', aliases: ['unicredit', 'uni credit'] },
  { name: 'Fineco', aliases: ['fineco', 'finecobank'] },
  { name: 'Revolut', aliases: ['revolut'] },
  { name: 'N26', aliases: ['n26'] },
  { name: 'BPER', aliases: ['bper'] },
  { name: 'Banco BPM', aliases: ['banco bpm', 'bpm'] },
  { name: 'BBVA', aliases: ['bbva'] },
  { name: 'ING', aliases: ['ing', 'conto arancio'] },
  { name: 'Poste Italiane', aliases: ['poste italiane', 'bancoposta', 'postepay'] },
];
const normalize = (text: string) =>
  ` ${text
    .toLocaleLowerCase()
    .replace(/[^\p{L}\p{N}]+/gu, ' ')
    .trim()} `;
const includes = (source: string, token: string) => source.includes(normalize(token));

function validIban(iban: string): boolean {
  const rearranged = iban.slice(4) + iban.slice(0, 4);
  let remainder = 0;
  for (const char of rearranged) {
    const digits = /\d/.test(char) ? char : String(char.charCodeAt(0) - 55);
    for (const digit of digits) remainder = (remainder * 10 + Number(digit)) % 97;
  }
  return remainder === 1;
}

export function detectStatementAccount(header: string | undefined): {
  bankName?: string;
  iban?: string;
  label: string;
} {
  const text = header || '';
  const normalized = normalize(text);
  const bankMatches = banks.filter((bank) =>
    bank.aliases.some((alias) => includes(normalized, alias)),
  );
  const bankName = bankMatches.length === 1 ? bankMatches[0].name : undefined;
  // Only the statement header is searched, never beneficiary IBANs in movements.
  const lengths: Record<string, number> = {
    IT: 27,
    DE: 22,
    FR: 27,
    ES: 24,
    GB: 22,
    CH: 21,
    NL: 18,
    BE: 16,
    LT: 20,
    IE: 22,
  };
  const candidates = new Set<string>();
  for (const [country, length] of Object.entries(lengths)) {
    const regex = new RegExp(`\\b${country}\\s*\\d{2}(?:\\s*[A-Z0-9]){${length - 4}}`, 'gi');
    for (const match of text.matchAll(regex)) {
      const iban = match[0].replace(/\s/g, '').toUpperCase();
      if (validIban(iban)) candidates.add(iban);
    }
  }
  const iban = candidates.size === 1 ? [...candidates][0] : undefined;
  return {
    bankName,
    iban,
    label: [bankName, iban ? `IBAN …${iban.slice(-4)}` : ''].filter(Boolean).join(' · '),
  };
}

export function suggestAccountFromHeader(header: string | undefined, accounts: Account[]): string {
  const normalized = normalize(header || '');
  const direct = accounts.filter((account) => {
    const name = account.name.trim();
    return name.length >= 3 && includes(normalized, name);
  });
  if (direct.length) return direct.length === 1 ? direct[0].name : '';
  const bankName = detectStatementAccount(header).bankName;
  const bank = banks.find((bank) => bank.name === bankName);
  if (!bank) return '';
  const matches = accounts.filter((account) =>
    bank.aliases.some((alias) => includes(normalize(account.name), alias)),
  );
  return matches.length === 1 ? matches[0].name : '';
}
