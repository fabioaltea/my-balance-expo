export default class FunctionHelper {
  public static ConvertCurrencyToNumber(value: string | number): number {
    if (value === null || value === undefined) return 0;
    if (typeof value === "number") return value;

    let raw = value.toString().replace("€", "").replace(/\s/g, "").trim();

    const lastComma = raw.lastIndexOf(",");
    const lastDot = raw.lastIndexOf(".");

    if (lastComma > -1 && lastDot > -1) {
      if (lastDot < lastComma) {
        raw = raw.replace(/\./g, "").replace(",", ".");
      } else {
        raw = raw.replace(/,/g, "");
      }
    } else if (lastComma > -1) {
      raw = raw.replace(",", ".");
    }

    const num = parseFloat(raw);
    return isNaN(num) ? 0 : num;
  }

  public static ConvertNumberToCurrency(value: number): string {
    const fixed = (value || 0).toFixed(2);
    // Match Ionic formatting: "€ 1.234,56"
    const formatted = fixed.toString().replace(".", ",");
    return `€ ${formatted}`;
  }
}
