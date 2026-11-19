/** One money format across the merchant app: en-GB grouping, 2 decimals, currency code first. */
export function formatMoney(amount: number, currency: string, maximumFractionDigits = 2): string {
  const value = Number(amount);
  return `${currency} ${(Number.isFinite(value) ? value : 0).toLocaleString("en-GB", {
    minimumFractionDigits: 2,
    maximumFractionDigits: Math.max(2, maximumFractionDigits),
  })}`;
}

export function formatBalance(amount: number, currency: string, hidden: boolean): string {
  return hidden ? `${currency} ••••••` : formatMoney(amount, currency);
}

/** en-GB date and time, independent of the device locale. */
export function formatTimestamp(value: string | number | Date | null | undefined): string {
  if (value == null || value === "") return "";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "";
  return new Intl.DateTimeFormat("en-GB", { dateStyle: "medium", timeStyle: "short" }).format(date);
}
