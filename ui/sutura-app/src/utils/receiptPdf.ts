import * as FileSystem from "expo-file-system/legacy";
import { Asset } from "expo-asset";
import * as Sharing from "expo-sharing";
import { Platform } from "react-native";
import { SUTURA_LOGO } from "../constants/brand";
import type { CustomerTransaction } from "../types";
import { formatMoney, formatTimestamp } from "./format";
import {
  isCreditTransaction,
  transactionStatusLabel,
  transactionTypeLabel,
} from "./transactionDetails";

type ReceiptCustomer = {
  name: string;
  phone: string;
};

type PdfLib = typeof import("pdf-lib");
type PDFPage = import("pdf-lib").PDFPage;
type PDFFont = import("pdf-lib").PDFFont;
type RgbColor = ReturnType<PdfLib["rgb"]>;

const PAGE_WIDTH = 340;
const PAGE_HEIGHT = 660;
const MARGIN = 22;

let pdfLibPromise: Promise<PdfLib> | null = null;
let logoBytesPromise: Promise<ArrayBuffer> | null = null;

async function loadPdfLib(): Promise<PdfLib> {
  if (!pdfLibPromise) {
    pdfLibPromise = import("pdf-lib");
  }
  return pdfLibPromise;
}

/** pdf-lib standard fonts only support WinAnsi — strip/replace unsupported characters. */
function sanitizePdfText(value: string): string {
  return value
    .replace(/\u2212/g, "-")
    .replace(/\u2013/g, "-")
    .replace(/\u2014/g, "-")
    .replace(/\u2022/g, "-")
    .replace(/[^\x09\x0A\x0D\x20-\x7E\xA0-\xFF]/g, "");
}

async function getLogoBytes(): Promise<ArrayBuffer> {
  if (!logoBytesPromise) {
    logoBytesPromise = (async () => {
      const asset = Asset.fromModule(SUTURA_LOGO);
      if (Platform.OS === "web") {
        const response = await fetch(asset.uri);
        if (!response.ok) throw new Error("Logo could not be loaded");
        return response.arrayBuffer();
      }
      await asset.downloadAsync();
      if (!asset.localUri) throw new Error("Logo asset is unavailable");
      const base64 = await FileSystem.readAsStringAsync(asset.localUri, {
        encoding: FileSystem.EncodingType.Base64,
      });
      return base64ToArrayBuffer(base64);
    })().catch((error) => {
      logoBytesPromise = null;
      throw error;
    });
  }
  return logoBytesPromise;
}
function base64ToArrayBuffer(base64: string): ArrayBuffer {
  const binary = atob(base64);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i += 1) {
    bytes[i] = binary.charCodeAt(i);
  }
  return bytes.buffer;
}

function uint8ArrayToBase64(bytes: Uint8Array): string {
  let binary = "";
  for (let i = 0; i < bytes.length; i += 1) {
    binary += String.fromCharCode(bytes[i]);
  }
  return btoa(binary);
}

function textWidth(text: string, font: PDFFont, size: number): number {
  return font.widthOfTextAtSize(sanitizePdfText(text), size);
}

function drawCentered(
  page: PDFPage,
  text: string,
  y: number,
  size: number,
  font: PDFFont,
  color: RgbColor,
) {
  const safe = sanitizePdfText(text);
  const width = textWidth(safe, font, size);
  page.drawText(safe, {
    x: (PAGE_WIDTH - width) / 2,
    y,
    size,
    font,
    color,
  });
}

function drawDashedLine(page: PDFPage, y: number, color: RgbColor) {
  const startX = MARGIN;
  const endX = PAGE_WIDTH - MARGIN;
  const dash = 4;
  const gap = 4;
  let x = startX;
  while (x < endX) {
    const segmentEnd = Math.min(x + dash, endX);
    page.drawLine({
      start: { x, y },
      end: { x: segmentEnd, y },
      thickness: 0.75,
      color,
    });
    x += dash + gap;
  }
}

function wrapText(text: string, font: PDFFont, size: number, maxWidth: number): string[] {
  const safe = sanitizePdfText(text);
  const words = safe.split(/\s+/);
  const lines: string[] = [];
  let current = "";

  for (const word of words) {
    const candidate = current ? `${current} ${word}` : word;
    if (textWidth(candidate, font, size) <= maxWidth) {
      current = candidate;
    } else {
      if (current) lines.push(current);
      current = word;
    }
  }
  if (current) lines.push(current);
  return lines.length ? lines : [safe];
}

function drawLabelValue(
  page: PDFPage,
  label: string,
  value: string,
  y: number,
  regular: PDFFont,
  bold: PDFFont,
  colors: { slate500: RgbColor; slate900: RgbColor },
): number {
  const labelSize = 10;
  const valueSize = 10;
  const valueMaxWidth = PAGE_WIDTH - MARGIN * 2 - 110;
  const valueLines = wrapText(value, bold, valueSize, valueMaxWidth);
  const blockHeight = Math.max(14, valueLines.length * 13);

  page.drawText(sanitizePdfText(label), {
    x: MARGIN,
    y,
    size: labelSize,
    font: regular,
    color: colors.slate500,
  });

  valueLines.forEach((line, index) => {
    const safeLine = sanitizePdfText(line);
    const lineWidth = textWidth(safeLine, bold, valueSize);
    page.drawText(safeLine, {
      x: PAGE_WIDTH - MARGIN - lineWidth,
      y: y - index * 13,
      size: valueSize,
      font: bold,
      color: colors.slate900,
    });
  });

  return y - blockHeight;
}

async function buildReceiptPdfBytes(
  txn: CustomerTransaction,
  customer: ReceiptCustomer,
): Promise<Uint8Array> {
  const { PDFDocument, StandardFonts, rgb } = await loadPdfLib();

  const navy = rgb(0.071, 0.235, 0.569);
  const slate900 = rgb(0.059, 0.09, 0.165);
  const slate700 = rgb(0.2, 0.255, 0.333);
  const slate500 = rgb(0.392, 0.455, 0.545);
  const slate300 = rgb(0.796, 0.835, 0.882);

  const pdfDoc = await PDFDocument.create();
  const page = pdfDoc.addPage([PAGE_WIDTH, PAGE_HEIGHT]);
  const regular = await pdfDoc.embedFont(StandardFonts.Helvetica);
  const bold = await pdfDoc.embedFont(StandardFonts.HelveticaBold);

  const credit = isCreditTransaction(txn);
  const sign = credit ? "+" : "-";
  let y = PAGE_HEIGHT - MARGIN;

  try {
    const logoBytes = await getLogoBytes();
    const logo = await pdfDoc.embedPng(logoBytes);
    const logoWidth = 72;
    const logoHeight = (logo.height / logo.width) * logoWidth;
    page.drawImage(logo, {
      x: (PAGE_WIDTH - logoWidth) / 2,
      y: y - logoHeight,
      width: logoWidth,
      height: logoHeight,
    });
    y -= logoHeight + 12;
  } catch {
    // Logo optional — receipt still valid without it
  }

  drawCentered(page, "Sutura", y, 20, bold, navy);
  y -= 16;
  drawCentered(page, "OFFICIAL TRANSACTION RECEIPT", y, 7.5, regular, slate500);
  y -= 22;

  drawDashedLine(page, y, slate300);
  y -= 18;

  drawCentered(page, "RECEIPT", y, 11, bold, slate700);
  y -= 14;
  drawCentered(page, txn.id, y, 9, regular, slate500);
  y -= 20;

  y = drawLabelValue(page, "Date & time", formatTimestamp(txn.time), y, regular, bold, {
    slate500,
    slate900,
  });
  y = drawLabelValue(page, "Status", transactionStatusLabel(txn.status), y, regular, bold, {
    slate500,
    slate900,
  });
  y -= 6;

  drawDashedLine(page, y, slate300);
  y -= 16;

  y = drawLabelValue(page, "Transaction", transactionTypeLabel(txn.type), y, regular, bold, {
    slate500,
    slate900,
  });
  y = drawLabelValue(page, credit ? "From" : "To", txn.counterparty, y, regular, bold, {
    slate500,
    slate900,
  });
  y = drawLabelValue(page, "Method", txn.method, y, regular, bold, { slate500, slate900 });
  if (txn.category) {
    y = drawLabelValue(page, "Category", txn.category, y, regular, bold, { slate500, slate900 });
  }
  y = drawLabelValue(page, "Direction", credit ? "Money in" : "Money out", y, regular, bold, {
    slate500,
    slate900,
  });
  y = drawLabelValue(page, "Customer", customer.name, y, regular, bold, { slate500, slate900 });
  y = drawLabelValue(page, "Phone", customer.phone, y, regular, bold, { slate500, slate900 });
  y -= 6;

  drawDashedLine(page, y, slate300);
  y -= 28;

  drawCentered(page, "TOTAL AMOUNT", y, 8, bold, slate500);
  y -= 26;
  drawCentered(page, `${sign}${formatMoney(txn.amount, txn.currency)}`, y, 24, bold, slate900);
  y -= 28;

  drawDashedLine(page, y, slate300);
  y -= 18;

  drawCentered(page, "Thank you for using Sutura", y, 11, bold, navy);
  y -= 14;

  const footerLines = wrapText(
    "This is an electronically generated receipt. Keep this document for your records.",
    regular,
    8,
    PAGE_WIDTH - MARGIN * 2,
  );
  footerLines.forEach((line) => {
    drawCentered(page, line, y, 8, regular, slate500);
    y -= 11;
  });

  return pdfDoc.save();
}

async function writeReceiptFile(txn: CustomerTransaction, bytes: Uint8Array): Promise<string> {
  const filename = `Sutura-Receipt-${txn.id}.pdf`;
  const fileUri = `${FileSystem.cacheDirectory}${filename}`;
  const base64 = uint8ArrayToBase64(bytes);
  await FileSystem.writeAsStringAsync(fileUri, base64, {
    encoding: FileSystem.EncodingType.Base64,
  });
  return fileUri;
}

function downloadPdfOnWeb(bytes: Uint8Array, filename: string) {
  const blob = new Blob([Uint8Array.from(bytes)], { type: "application/pdf" });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = filename;
  link.rel = "noopener";
  document.body.appendChild(link);
  link.click();
  link.remove();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}

async function sharePdfOnWeb(bytes: Uint8Array, filename: string): Promise<void> {
  const blob = new Blob([Uint8Array.from(bytes)], { type: "application/pdf" });

  if (typeof navigator !== "undefined" && "share" in navigator) {
    try {
      const file = new File([blob], filename, { type: "application/pdf" });
      if (navigator.canShare?.({ files: [file] })) {
        await navigator.share({ files: [file], title: "Sutura receipt" });
        return;
      }
    } catch (err) {
      if (err instanceof Error && err.name === "AbortError") return;
    }
  }

  downloadPdfOnWeb(bytes, filename);
}

export async function shareTransactionReceiptPdf(
  txn: CustomerTransaction,
  customer: ReceiptCustomer,
): Promise<void> {
  const bytes = await buildReceiptPdfBytes(txn, customer);
  const filename = `Sutura-Receipt-${txn.id}.pdf`;

  if (Platform.OS === "web") {
    await sharePdfOnWeb(bytes, filename);
    return;
  }

  const uri = await writeReceiptFile(txn, bytes);

  if (await Sharing.isAvailableAsync()) {
    await Sharing.shareAsync(uri, {
      mimeType: "application/pdf",
      dialogTitle: "Share Sutura receipt",
      UTI: "com.adobe.pdf",
    });
    return;
  }

  throw new Error("Sharing is not available on this device.");
}
