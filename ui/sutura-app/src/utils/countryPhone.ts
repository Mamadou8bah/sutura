import { getCountryCallingCode, parsePhoneNumberFromString, type CountryCode } from "libphonenumber-js/min";
import countries from "../data/phoneCountries.json";

export type PhoneCountry = typeof countries[number];
export const phoneCountries = countries;
export function countryForPhone(value: string, fallback = "GM"): PhoneCountry {
  const international = value.trim().replace(/^00/, "+");
  const parsed = international.startsWith("+") ? parsePhoneNumberFromString(international, { extract: false }) : undefined;
  const matched = countries.find(c => c.iso === parsed?.country);
  if (matched) return matched;
  const callingCode = countries.filter(c => international.startsWith(`+${c.dial}`)).sort((a,b) => b.dial.length-a.dial.length);
  return callingCode.find(c => c.iso === fallback) ?? callingCode.find(c => ["US", "GB", "RU"].includes(c.iso)) ?? callingCode[0] ?? countries.find(c => c.iso === fallback) ?? countries.find(c => c.iso === "GM")!;
}

/** Parsing handles national trunk prefixes; extensions and embedded prose are refused. */
export function internationalPhoneDraft(value: string, iso: string): string {
  if (!value.trim()) return "";
  const input = value.trim().replace(/^00/, "+");
  const parsed = parsePhoneNumberFromString(input, { defaultCountry: iso as CountryCode, extract: false });
  return parsed && !parsed.ext ? parsed.number : input.startsWith("+") ? input : `+${getCountryCallingCode(iso as CountryCode)}${input.replace(/\D/g, "")}`;
}

export function normalizeCountryPhone(value: string): string | null {
  if (!/^\+[\d\s().-]+$/.test(value)) return null;
  const parsed = parsePhoneNumberFromString(value, { extract: false });
  return parsed && !parsed.ext && parsed.isPossible() ? parsed.number : null;
}

export function nationalPhoneDraft(value: string, country: PhoneCountry): string {
  const international = value.trim().replace(/^00/, "+");
  return international.startsWith(`+${country.dial}`) ? international.slice(country.dial.length + 1).trim() : value;
}

export function searchPhoneCountries(query: string, allowed?: readonly string[]) {
  const text = query.trim().toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "");
  return countries.filter(c => (!allowed || allowed.includes(c.iso)) &&
    `${c.name} ${c.iso} +${c.dial}`.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "").includes(text));
}
