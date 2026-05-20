/**
 * Generatematpasspdf.ts
 *
 * Generates a Material Pass PDF for a single MATERIAL_PASS record
 * + all its STOCK_INOUT_LIST entries.
 *
 * Standard format: logo from /images/logo/logo.jpg, multi-page overflow support.
 *
 * API endpoints:
 *   GET /api/matpass/{id}        → MatpassRow
 *   GET /api/stocks/matpass/{id} → StockMovementRow[]
 *   GET /api/customers/{id}      → CustomerDTO
 */

import jsPDF from "jspdf";
import axiosInstance from "../../utils/axiosInstance";
import {
  loadImage, makePdfCtx, drawHeader, drawFooter, ensureSpace,
  drawSignatureBlock, fmt,
} from "./Pdfheader";

// ─── Types ────────────────────────────────────────────────────────────────────

export interface MatpassRow {
  id:              string | number;
  inOrOut:         string;
  party:           string;
  date:            string;
  contactPerson?:  string;
  discription?:    string;
  fileRef?:        string;
  status?:         string | number;
}

export interface StockMovementRow {
  id?:                     string | number;
  stockItemId?:            string | number;
  stockItemName?:          string;
  stockDate?:              string;
  stockDescription?:       string;
  stockInOut:              string;
  stockQuantity:           string | number;
  stockReturnOrNonReturn?: string;
  stockParty?:             string;
  matPassId?:              string | number;
  status?:                 string | number;
}

export interface CustomerRow {
  id?:               string | number;
  name?:             string;
  gst?:              string;
  cin?:              string;
  pan?:              string;
  buyerAddress1?:    string;
  buyerAddress2?:    string;
  buyerAddress3?:    string;
  shippingAddress1?: string;
  shippingAddress2?: string;
  shippingAddress3?: string;
}

// ─── Main export ──────────────────────────────────────────────────────────────

export async function generateMatpassPDF(
  docId: string | number,
  prefetchedRow?: MatpassRow,
  prefetchedMovements?: StockMovementRow[],
  prefetchedCustomer?: CustomerRow,
): Promise<void> {
  let row:       MatpassRow;
  let movements: StockMovementRow[];
  let customer:  CustomerRow = {};

  if (prefetchedRow && prefetchedMovements) {
    row       = prefetchedRow;
    movements = prefetchedMovements;
    customer  = prefetchedCustomer ?? {};
  } else {
    let rowRes, movRes;
    try {
      [rowRes, movRes] = await Promise.all([
        axiosInstance.get(`/api/matpass/${docId}`),
        axiosInstance.get(`/api/stocks/matpass/${docId}`),
      ]);
    } catch (err: unknown) {
      const status = (err as { response?: { status?: number } })?.response?.status;
      if (status === 403) throw new Error(`Access denied fetching MatPass #${docId}.`);
      if (status === 401) throw new Error("Session expired. Please log in again.");
      if (status === 404) throw new Error(`MatPass #${docId} was not found.`);
      throw err;
    }
    row = rowRes.data as MatpassRow;
    const rawMov = Array.isArray(movRes.data) ? movRes.data : (movRes.data?.data ?? []);
    movements = rawMov as StockMovementRow[];

    if (row.party) {
      try {
        const customerId = parseInt(String(row.party).split("-")[0], 10);
        if (!isNaN(customerId)) {
          const custRes = await axiosInstance.get(`/api/customers/${customerId}`);
          customer = custRes.data as CustomerRow;
        }
      } catch { /* best-effort */ }
    }
  }

  // ── PDF setup ──────────────────────────────────────────────────────────────
  let logoImg: HTMLImageElement | null = null;
  try {
    logoImg = await loadImage("/images/logo/logo.jpg");
  } catch {
    // logo missing — will leave space blank
  }
  const doc = new jsPDF({ orientation: "portrait", unit: "mm", format: "a4" });
  const ctx = makePdfCtx(doc, logoImg);

  const { doc: d, pw, ml, cw } = ctx;
  const inOut       = String(movements[0]?.stockInOut || row.inOrOut || "").toUpperCase();
  // Use a colour variation per direction while keeping brand consistency
  const titleColor: [number, number, number] = inOut === "IN" ? [140, 60, 0] : [80, 0, 100];

  // ── Stock table columns ────────────────────────────────────────────────────
  const cols = [
    { label: "#",           w: 8  },
    { label: "ITEM",        w: 38 },
    { label: "DATE",        w: 24 },
    { label: "IN/OUT",      w: 16 },
    { label: "QTY",         w: 16 },
    { label: "RETURN TYPE", w: 28 },
    { label: "PARTY",       w: 26 },
    { label: "DESCRIPTION", w: 26 },
  ];
  const usedW = cols.reduce((s, c) => s + c.w, 0);
  cols[cols.length - 1].w += cw - usedW;

  const drawMovHeader = () => {
    ensureSpace(ctx, 10);
    d.setFillColor(...titleColor);
    d.rect(ml, ctx.y, cw, 8, "F");
    d.setFont("helvetica", "bold");
    d.setFontSize(7.5);
    d.setTextColor(255, 255, 255);
    let colX = ml;
    cols.forEach((col) => { d.text(col.label, colX + 1.5, ctx.y + 5.5); colX += col.w; });
    ctx.y += 8;
  };

  // ── Header ─────────────────────────────────────────────────────────────────
  drawHeader(ctx);

  // ── Title bar ─────────────────────────────────────────────────────────────
  d.setFillColor(...titleColor);
  d.rect(ml, ctx.y, cw, 9, "F");
  d.setFont("helvetica", "bold");
  d.setFontSize(11);
  d.setTextColor(255, 255, 255);
  d.text(`MATERIAL PASS — ${inOut || "RECORD"}`, pw / 2, ctx.y + 6.2, { align: "center" });
  ctx.y += 13;

  // ── Pass Details section heading ───────────────────────────────────────────
  d.setFillColor(245, 247, 250);
  d.rect(ml, ctx.y, cw, 7, "F");
  d.setFont("helvetica", "bold");
  d.setFontSize(9);
  d.setTextColor(40, 40, 40);
  d.text("MATERIAL PASS DETAILS", ml + 3, ctx.y + 5);
  ctx.y += 9;

  // ── Two-column detail block ────────────────────────────────────────────────
  const detailBoxH = 48;
  d.setDrawColor(220, 220, 220);
  d.setLineWidth(0.3);
  d.rect(ml, ctx.y, cw, detailBoxH);
  d.line(ml + cw / 2, ctx.y, ml + cw / 2, ctx.y + detailBoxH);

  const col1x  = ml + 2;
  const col2x  = ml + cw / 2 + 2;
  const valOff = 32;
  const blockY = ctx.y;

  const detailRow = (cx: number, label: string, value: string, dy: number) => {
    d.setFont("helvetica", "bold");
    d.setFontSize(8);
    d.setTextColor(90, 90, 90);
    d.text(`${label}:`, cx, blockY + dy);
    d.setFont("helvetica", "normal");
    d.setTextColor(20, 20, 20);
    const maxW = cw / 2 - valOff - 4;
    const lines = d.splitTextToSize(fmt(value), maxW);
    d.text(lines[0] ?? "—", cx + valOff, blockY + dy);
  };

  detailRow(col1x, "Pass ID",       String(row.id),          6);
  detailRow(col1x, "Direction",     inOut || "—",            12);
  detailRow(col1x, "Party",         fmt(row.party),          18);
  detailRow(col1x, "Date",          fmt(row.date),           24);
  detailRow(col1x, "Description",   fmt(row.discription),    30);

  detailRow(col2x, "Contact Person", fmt(row.contactPerson), 6);
  detailRow(col2x, "File Reference", fmt(row.fileRef),       12);
  detailRow(col2x, "GST No",         fmt(customer.gst),      18);
  detailRow(col2x, "CIN No",         fmt(customer.cin),      24);
  detailRow(col2x, "PAN No",         fmt(customer.pan),      30);

  // IN/OUT badge
  d.setFillColor(
    inOut === "IN" ? 220 : 200,
    inOut === "IN" ? 240 : 200,
    inOut === "IN" ? 220 : 240,
  );
  d.rect(col1x, blockY + 38, 18, 6, "F");
  d.setFont("helvetica", "bold");
  d.setFontSize(9);
  d.setTextColor(inOut === "IN" ? 0 : 80, inOut === "IN" ? 80 : 0, inOut === "IN" ? 0 : 80);
  d.text(inOut || "—", col1x + 3, blockY + 43);

  ctx.y += detailBoxH + 4;

  // ── Billing / Shipping addresses ───────────────────────────────────────────
  const addrBoxH = 28;
  d.setDrawColor(200, 200, 200);
  d.setLineWidth(0.3);
  d.rect(ml, ctx.y, cw / 2, addrBoxH);
  d.rect(ml + cw / 2, ctx.y, cw / 2, addrBoxH);

  d.setFont("helvetica", "bold");
  d.setFontSize(8);
  d.setTextColor(80, 80, 80);
  d.text("BILLING ADDRESS :", ml + 2, ctx.y + 5);
  d.setFont("helvetica", "normal");
  d.setTextColor(20, 20, 20);
  d.text(fmt(customer.buyerAddress1), ml + 4, ctx.y + 11);
  d.text(fmt(customer.buyerAddress2), ml + 4, ctx.y + 16);
  d.text(fmt(customer.buyerAddress3), ml + 4, ctx.y + 21);

  const sx = ml + cw / 2 + 2;
  d.setFont("helvetica", "bold");
  d.setTextColor(80, 80, 80);
  d.text("SHIPPING ADDRESS :", sx, ctx.y + 5);
  d.setFont("helvetica", "normal");
  d.setTextColor(20, 20, 20);
  d.text(fmt(customer.shippingAddress1), sx + 2, ctx.y + 11);
  d.text(fmt(customer.shippingAddress2), sx + 2, ctx.y + 16);
  d.text(fmt(customer.shippingAddress3), sx + 2, ctx.y + 21);
  ctx.y += addrBoxH + 4;

  // ── Stock Movements section heading ────────────────────────────────────────
  d.setFillColor(245, 247, 250);
  d.rect(ml, ctx.y, cw, 7, "F");
  d.setFont("helvetica", "bold");
  d.setFontSize(9);
  d.setTextColor(40, 40, 40);
  d.text(`STOCK MOVEMENTS  (${movements.length} record${movements.length !== 1 ? "s" : ""})`, ml + 3, ctx.y + 5);
  ctx.y += 9;

  // ── Stock movements table ──────────────────────────────────────────────────
  if (movements.length === 0) {
    d.setFont("helvetica", "italic");
    d.setFontSize(9);
    d.setTextColor(140, 140, 140);
    d.text("No stock movements linked to this material pass.", ml + 3, ctx.y + 5);
    ctx.y += 10;
  } else {
    ctx.redrawTableHeader = drawMovHeader;
    drawMovHeader();

    movements.forEach((mov, idx) => {
      const itemLines  = d.splitTextToSize(fmt(mov.stockItemName ?? mov.stockItemId), cols[1].w - 3);
      const descLines2 = d.splitTextToSize(fmt(mov.stockDescription), cols[7].w - 3);
      const rowH = Math.max(8, Math.max(itemLines.length, descLines2.length) * 4.5 + 3);

      ensureSpace(ctx, rowH + 2);

      if (idx % 2 === 0) {
        d.setFillColor(249, 250, 252);
        d.rect(ml, ctx.y, cw, rowH, "F");
      }
      d.setDrawColor(220, 220, 220);
      d.setLineWidth(0.2);
      d.rect(ml, ctx.y, cw, rowH);

      d.setFont("helvetica", "normal");
      d.setFontSize(8);
      d.setTextColor(40, 40, 40);

      let colX = ml;
      d.text(String(idx + 1),          colX + 1.5, ctx.y + 5); colX += cols[0].w;
      d.text(itemLines,                 colX + 1.5, ctx.y + 5); colX += cols[1].w;
      d.text(fmt(mov.stockDate),        colX + 1.5, ctx.y + 5); colX += cols[2].w;

      const movDir = String(mov.stockInOut || "").toUpperCase();
      d.setTextColor(movDir === "IN" ? 0 : 150, movDir === "IN" ? 120 : 0, movDir === "IN" ? 0 : 120);
      d.setFont("helvetica", "bold");
      d.text(movDir || "—", colX + 1.5, ctx.y + 5);
      d.setFont("helvetica", "normal");
      d.setTextColor(40, 40, 40);
      colX += cols[3].w;

      d.text(fmt(mov.stockQuantity),           colX + 1.5, ctx.y + 5); colX += cols[4].w;
      d.text(fmt(mov.stockReturnOrNonReturn),  colX + 1.5, ctx.y + 5); colX += cols[5].w;
      d.text(fmt(mov.stockParty),              colX + 1.5, ctx.y + 5); colX += cols[6].w;
      d.text(descLines2,                       colX + 1.5, ctx.y + 5);

      ctx.y += rowH;
    });

    ctx.redrawTableHeader = undefined;
    ctx.y += 4;
  }

  // ── Signature + footer ────────────────────────────────────────────────────
  drawSignatureBlock(ctx);
  drawFooter(ctx);

  const filename = `MatPass_${row.id}_${inOut}_${(row.party || "party").replace(/[^a-zA-Z0-9]/g, "_").slice(0, 20)}.pdf`;
  doc.save(filename);
}