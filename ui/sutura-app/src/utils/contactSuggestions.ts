import { normalizePhone } from "./inputValidation";

export type PhoneContact = { name: string; phone: string };
export function phoneContacts(rows: { fullName?: string | null; phones?: { number?: string }[] }[]): PhoneContact[] {
  const numbers = new Map<string, PhoneContact>();
  for (const row of rows) for (const entry of row.phones ?? []) {
    const phone = normalizePhone(entry.number ?? "");
    if (phone && !numbers.has(phone)) numbers.set(phone, { name: row.fullName?.trim() || phone, phone });
  }
  return [...numbers.values()].sort((a, b) => a.name.localeCompare(b.name));
}
export function suggestContacts(contacts: PhoneContact[], query: string): PhoneContact[] {
  const digits = query.replace(/\D/g, "");
  if (digits.length < 2) return [];
  const exact = normalizePhone(query);
  return contacts.filter(contact => contact.phone !== exact && contact.phone.replace(/\D/g, "").includes(digits)).slice(0, 5);
}
