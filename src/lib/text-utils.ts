/**
 * Normalize payee name to title case.
 * "S-MARKET VAAJALA" → "S-Market Vaajala"
 * "k-market jyväskylä" → "K-Market Jyväskylä"
 * Preserves known abbreviations and short words.
 */
export function titleCasePayee(name: string): string {
  if (!name) return name;
  return name
    .toLowerCase()
    .split(/(\s+|-)/g)
    .map((part) => {
      if (part.match(/^\s+$/) || part === "-") return part;
      return part.charAt(0).toUpperCase() + part.slice(1);
    })
    .join("");
}
