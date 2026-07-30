const formatter = new Intl.NumberFormat("en-NG", {
  style: "currency",
  currency: "NGN",
  currencyDisplay: "narrowSymbol",
  minimumFractionDigits: 0,
  maximumFractionDigits: 2,
});

// Prices arrive as decimal strings (Prisma Decimal serialized over JSON) —
// this is the one place that turns one into a display string.
export function formatNaira(value: string | number): string {
  return formatter.format(Number(value));
}
