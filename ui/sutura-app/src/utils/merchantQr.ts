export function parseMerchantQr(value: string): string {
  const input = value.trim();
  if (input.length > 2048) throw new Error("This QR code is too long.");
  let reference = input;
  if (/^https?:\/\//i.test(input)) {
    const url = new URL(input);
    reference = url.pathname.match(/^\/pay\/([^/]+)\/?$/)?.[1] ?? "";
  } else if (input.startsWith("/pay/")) reference = input.slice(5);
  else if (input.startsWith("suturaapp://pay/")) reference = input.slice(16);
  if (!/^plink-[a-zA-Z0-9]{12}$/.test(reference)) {
    throw new Error("Scan a Sutura merchant payment QR code or enter its payment reference.");
  }
  return reference;
}
