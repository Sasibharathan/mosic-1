/**
 * pdfHeader.ts
 *
 * Shared utilities for all MosIC PDF generators.
 * Every PDF uses:
 *   • loadImage()     – loads /images/logo/logo.jpg once (graceful fallback)
 *   • drawHeader()    – company logo + name + address block (repeated on every page)
 *   • drawFooter()    – generated date + page number + confidential tag
 *   • ensureSpace()   – automatic page-break with header/footer
 *
 * Usage:
 *   import { loadImage, makePdfCtx, drawHeader, drawFooter, ensureSpace } from "./pdfHeader";
 */

import jsPDF from "jspdf";

// ─── Company constants (single source of truth) ───────────────────────────────

export const COMPANY = {
  name:    "MosIC Solutions Pvt Ltd",
  address: "No 5 Second A Cross Rajashree Layout, Munnekolala, Marathahalli,",
  city:    "Bangalore 560037  Karnataka",
  gst:     "GST No: 29AAICM6836G1Z3",
  pan:     "PAN No: AAICM6836G",
  cin:     "CIN No: U72200KA2013PTC069886",
  website: "Website: www.mosics.com",
  phone:   "Phone: +91-9980914698",
  email:   "Email: salesandsupport@mosics.com",
} as const;


// ─── Logo loader ─────────────────────────────────────────────────────────────
// Matches your codebase pattern exactly:
//   let logoImg: HTMLImageElement | null = null;
//   try { logoImg = await loadImage("/images/logo/logo.jpg"); } catch { }

export const loadImage = (src: string): Promise<HTMLImageElement> =>
  new Promise((resolve, reject) => {
    const img = new Image();
    img.onload  = () => resolve(img);
    img.onerror = () => reject(new Error(`Failed to load image: ${src}`));
    img.src = src;
  });

// ─── PDF page context ─────────────────────────────────────────────────────────

export interface PdfCtx {
  doc:     jsPDF;
  pw:      number;   // page width  (mm)
  ph:      number;   // page height (mm)
  ml:      number;   // left  margin
  mr:      number;   // right margin (mirror of ml)
  cw:      number;   // content width = pw - ml - mr
  y:       number;   // current y cursor
  pageNum: number;
  logoImg: HTMLImageElement | null;
  /** set to true while a table header should be redrawn on new pages */
  redrawTableHeader?: () => void;
}

export const makePdfCtx = (
  doc: jsPDF,
  logoImg: HTMLImageElement | null,
  ml = 14,
): PdfCtx => {
  const pw = doc.internal.pageSize.getWidth();
  const ph = doc.internal.pageSize.getHeight();
  return { doc, pw, ph, ml, mr: ml, cw: pw - ml * 2, y: 0, pageNum: 1, logoImg };
};

// ─── Header (logo + company block) ───────────────────────────────────────────
// Height consumed: ~34 mm  (y ends at ~44 after the separator line)

export const HEADER_H = 34;   // mm used by header block

export function drawHeader(ctx: PdfCtx): void {
  const { doc, pw, ml, mr, logoImg } = ctx;
  const rx = pw - mr;
  ctx.y = 10;

  // ── Logo ──────────────────────────────────────────────────────────────────
  if (logoImg) {
    doc.addImage(logoImg, "JPEG", ml, ctx.y, 22, 22);
  } else {
    doc.setDrawColor(180, 180, 180);
    doc.setLineWidth(0.4);
    doc.rect(ml, ctx.y, 22, 22);
    doc.setFont("helvetica", "italic");
    doc.setFontSize(7);
    doc.setTextColor(180, 180, 180);
    doc.text("LOGO", ml + 5, ctx.y + 12);
  }

  // ── Company name ──────────────────────────────────────────────────────────
  doc.setFont("helvetica", "bold");
  doc.setFontSize(16);
  doc.setTextColor(30, 30, 30);
  doc.text(COMPANY.name, ml + 26, ctx.y + 7);

  // ── Address / contact ─────────────────────────────────────────────────────
  doc.setFont("helvetica", "normal");
  doc.setFontSize(8);
  doc.setTextColor(60, 60, 60);
  doc.text(COMPANY.address, ml + 26, ctx.y + 12);
  doc.text(COMPANY.city,    ml + 26, ctx.y + 16);
  doc.text(COMPANY.gst,     rx,      ctx.y + 12, { align: "right" });
  doc.text(COMPANY.pan,     rx,      ctx.y + 16, { align: "right" });
  doc.text(COMPANY.cin,     ml + 26, ctx.y + 20);
  doc.text(COMPANY.website, rx,      ctx.y + 20, { align: "right" });
  doc.text(`${COMPANY.phone}   ${COMPANY.email}`, ml + 26, ctx.y + 24);

  // ── Thin separator ────────────────────────────────────────────────────────
  doc.setDrawColor(180, 180, 180);
  doc.setLineWidth(0.4);
  doc.line(ml, ctx.y + 26, rx, ctx.y + 26);

  ctx.y += HEADER_H;
}

// ─── Footer (generated date + page number + confidential) ────────────────────

export function drawFooter(ctx: PdfCtx): void {
  const { doc, pw, ph, ml, mr } = ctx;
  const fy = ph - 10;
  const today = new Date().toLocaleDateString("en-IN", {
    day: "2-digit", month: "short", year: "numeric",
  });

  doc.setFont("helvetica", "normal");
  doc.setFontSize(7.5);
  doc.setTextColor(140, 140, 140);
  doc.text(`Generated: ${today}`, ml, fy);
  doc.text(`Page ${ctx.pageNum}`, pw / 2, fy, { align: "center" });
  doc.text("MosIC Solutions Pvt Ltd — Confidential", pw - mr, fy, { align: "right" });

  doc.setDrawColor(200, 200, 200);
  doc.setLineWidth(0.3);
  doc.line(ml, fy - 3, pw - mr, fy - 3);
}

// ─── ensureSpace: adds new page if < `needed` mm remain ──────────────────────

export function ensureSpace(ctx: PdfCtx, needed: number): void {
  if (ctx.y + needed > ctx.ph - 18) {
    drawFooter(ctx);
    ctx.doc.addPage();
    ctx.pageNum++;
    drawHeader(ctx);
    ctx.redrawTableHeader?.();
  }
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

export const fmt = (v: unknown): string =>
  v != null && String(v).trim() ? String(v).trim() : "—";

export const num = (v: unknown): number => parseFloat(String(v ?? 0)) || 0;

export const cur = (v: unknown): string =>
  num(v).toLocaleString("en-IN", { minimumFractionDigits: 2, maximumFractionDigits: 2 });

export const fmtDate = (d: string | undefined | null): string => {
  if (!d) return "—";
  const parts = d.includes("-") ? d.split("-") : d.split("/");
  if (parts.length !== 3) return d;
  if (parts[0].length === 2) return d;       // already DD-MM-YYYY
  const [y, m, day] = parts;
  return `${day}-${m}-${y}`;
};

export const todayDMY = (): string => {
  const n = new Date();
  return `${String(n.getDate()).padStart(2, "0")}-${String(n.getMonth() + 1).padStart(2, "0")}-${n.getFullYear()}`;
};

export const MONTH_NAMES = [
  "", "JANUARY", "FEBRUARY", "MARCH", "APRIL", "MAY", "JUNE",
  "JULY", "AUGUST", "SEPTEMBER", "OCTOBER", "NOVEMBER", "DECEMBER",
];

/** Shared blue brand color used across all document title bars */
export const BRAND_BLUE: [number, number, number] = [30, 80, 160];

/**
 * Draw a blue section-title bar (used in EmpDetails, FileIndex, etc.)
 * Returns the new y after the bar.
 */
export function drawSectionBar(
  ctx: PdfCtx,
  title: string,
  color: [number, number, number] = BRAND_BLUE,
): number {
  ensureSpace(ctx, 12);
  const { doc, ml, cw } = ctx;
  doc.setFillColor(...color);
  doc.rect(ml, ctx.y, cw, 7, "F");
  doc.setFont("helvetica", "bold");
  doc.setFontSize(8.5);
  doc.setTextColor(255, 255, 255);
  doc.text(title.toUpperCase(), ml + 3, ctx.y + 5);
  ctx.y += 9;
  return ctx.y;
}

/**
 * Draw a key-value row inside a section table.
 * Returns the new y.
 */
export function drawKvRow(
  ctx: PdfCtx,
  label: string,
  value: string,
  shade: boolean,
  rowH = 8,
): number {
  ensureSpace(ctx, rowH + 2);
  const { doc, ml, cw } = ctx;
  const colW = cw / 2;

  if (shade) {
    doc.setFillColor(248, 250, 252);
    doc.rect(ml, ctx.y, cw, rowH, "F");
  }
  doc.setDrawColor(220, 220, 220);
  doc.setLineWidth(0.2);
  doc.rect(ml, ctx.y, cw, rowH);
  doc.line(ml + colW, ctx.y, ml + colW, ctx.y + rowH);

  doc.setFont("helvetica", "bold");
  doc.setFontSize(8);
  doc.setTextColor(80, 80, 80);
  doc.text(label, ml + 2, ctx.y + rowH / 2 + 1.5);

  doc.setFont("helvetica", "normal");
  doc.setFontSize(8);
  doc.setTextColor(20, 20, 20);
  doc.text(value, ml + colW + 2, ctx.y + rowH / 2 + 1.5);

  ctx.y += rowH;
  return ctx.y;
}

/**
 * Draw the standard authorised-signatory footer block.
 */
export function drawSignatureBlock(ctx: PdfCtx): void {
  ensureSpace(ctx, 30);
  const { doc, ml, cw } = ctx;
  ctx.y += 6;
  doc.setDrawColor(180, 180, 180);
  doc.setLineWidth(0.3);
  doc.rect(ml, ctx.y, cw, 22);
  doc.setFont("helvetica", "bold");
  doc.setFontSize(8.5);
  doc.setTextColor(40, 40, 40);
  doc.text("FOR MOSIC SOLUTIONS PVT LTD", ml + 4, ctx.y + 6);
  doc.setFont("helvetica", "normal");
  doc.setFontSize(8);
  doc.setTextColor(120, 120, 120);
  doc.text("AUTHORISED SIGNATURE", ml + 4, ctx.y + 18);
  ctx.y += 26;
}