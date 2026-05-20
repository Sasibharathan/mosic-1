/**
 * Generatepurchasepdf.ts
 *
 * Generates a Purchase PDF for a single PURCHASE_REGISTER record +
 * its PURCHASE_DOCUMENT_ITEM_LIST line items.
 *
 * Standard format: logo from /images/logo/logo.jpg, multi-page overflow support.
 *
 * API endpoints:
 *   GET /api/purchases/{id}              → PurchaseDTO
 *   GET /api/purchase-items/by-ref/{id}  → PurchaseItemDTO[]
 *   GET /api/customers/{id}              → CustomerDTO
 */

import jsPDF from "jspdf";
import axiosInstance from "../../utils/axiosInstance";
import {
  loadImage, makePdfCtx, drawHeader, drawFooter, ensureSpace,
  drawSignatureBlock, fmt, num,
} from "./Pdfheader";

// ─── Types ────────────────────────────────────────────────────────────────────

export interface PurchaseRow {
  id:                     string | number;
  purchaseDate:           string;
  purchaseValidity?:      string;
  purchaseFromParty?:     string;
  purchaseToParty?:       string;
  purchaseEnquireDate?:   string;
  purchaseDeliveryTerms?: string;
  purchasePaymentTerms?:  string;
  purchaseCurrency?:      string;
  purchaseDoctype?:       string | number;
  purchaseTxType?:        string;
  purchaseDescription?:   string;
  purchaseAddressedTo?:   string;
  purchaseFileRef?:       string;
  purchaseStatus?:        string | number;
}

export interface PurchaseItemRow {
  id?:                   string | number;
  nameOfProductService:  string;
  hsnAcs?:               string;
  quantity:              number | string;
  unit?:                 string;
  unitRate:              number | string;
  taxableValue:          number | string;
  cgstRate?:             number | string;
  cgstAmount?:           number | string;
  sgstRate?:             number | string;
  sgstAmount?:           number | string;
  igstRate?:             number | string;
  igstAmount?:           number | string;
  total:                 number | string;
  refFileNo?:            number | string;
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

// ─── Helpers ──────────────────────────────────────────────────────────────────

const docTypeLabel = (v: string | number | undefined): string => {
  const map: Record<string, string> = {
    "1": "RFQ", "2": "QUOTATION", "3": "SUPPLY ORDER",
    "4": "INVOICE", "5": "PAYMENT", "6": "PAYMENT RECEIPT",
  };
  return map[String(v ?? "")] ?? "PURCHASE DOCUMENT";
};

const cur = (v: unknown) =>
  num(v).toLocaleString("en-IN", { minimumFractionDigits: 2 });

const toWords = (amount: number): string => {
  if (amount === 0) return "Zero Rupees";
  const ones = ["","One","Two","Three","Four","Five","Six","Seven","Eight","Nine",
    "Ten","Eleven","Twelve","Thirteen","Fourteen","Fifteen","Sixteen","Seventeen","Eighteen","Nineteen"];
  const tens = ["","","Twenty","Thirty","Forty","Fifty","Sixty","Seventy","Eighty","Ninety"];
  const chunk = (n: number): string => {
    if (n === 0) return "";
    if (n < 20)  return ones[n] + " ";
    if (n < 100) return tens[Math.floor(n / 10)] + (n % 10 ? " " + ones[n % 10] : "") + " ";
    return ones[Math.floor(n / 100)] + " Hundred " + chunk(n % 100);
  };
  const r = Math.round(amount);
  let result = "";
  if (r >= 10000000) result += chunk(Math.floor(r / 10000000)) + "Crore ";
  if (r >= 100000)   result += chunk(Math.floor((r % 10000000) / 100000)) + "Lakh ";
  if (r >= 1000)     result += chunk(Math.floor((r % 100000) / 1000)) + "Thousand ";
  result += chunk(r % 1000);
  return result.trim() + " Rupees Only";
};

// ─── Main export ──────────────────────────────────────────────────────────────

export async function generatePurchasePDF(
  docId: string | number,
  prefetchedRow?: PurchaseRow,
  prefetchedItems?: PurchaseItemRow[],
  prefetchedCustomer?: CustomerRow,
): Promise<void> {
  let row:      PurchaseRow;
  let items:    PurchaseItemRow[];
  let customer: CustomerRow = {};

  if (prefetchedRow && prefetchedItems) {
    row      = prefetchedRow;
    items    = prefetchedItems;
    customer = prefetchedCustomer ?? {};
  } else {
    let rowRes, itemsRes;
    try {
      [rowRes, itemsRes] = await Promise.all([
        axiosInstance.get(`/api/purchases/${docId}`),
        axiosInstance.get(`/api/purchase-items/by-ref/${docId}`),
      ]);
    } catch (err: unknown) {
      const status = (err as { response?: { status?: number } })?.response?.status;
      if (status === 403) throw new Error(`Access denied fetching Purchase #${docId}.`);
      if (status === 401) throw new Error("Session expired. Please log in again.");
      if (status === 404) throw new Error(`Purchase #${docId} was not found.`);
      throw err;
    }
    row = rowRes.data as PurchaseRow;
    const rawItems = Array.isArray(itemsRes.data)
      ? itemsRes.data
      : (itemsRes.data?.items ?? itemsRes.data?.data ?? []);
    items = rawItems as PurchaseItemRow[];

    if (row.purchaseToParty) {
      try {
        const customerId = parseInt(String(row.purchaseToParty).split("-")[0], 10);
        if (!isNaN(customerId)) {
          const custRes = await axiosInstance.get(`/api/customers/${customerId}`);
          customer = custRes.data as CustomerRow;
        }
      } catch { /* best-effort */ }
    }
  }

  // ── Compute totals ─────────────────────────────────────────────────────────
  let totalTaxable = 0, totalCgst = 0, totalSgst = 0, totalIgst = 0, grandTotal = 0;
  items.forEach((it) => {
    totalTaxable += num(it.taxableValue);
    totalCgst    += num(it.cgstAmount);
    totalSgst    += num(it.sgstAmount);
    totalIgst    += num(it.igstAmount);
    grandTotal   += num(it.total);
  });
  const roundedTotal = Math.round(grandTotal);

  // ── PDF setup ──────────────────────────────────────────────────────────────
  let logoImg: HTMLImageElement | null = null;
  try {
    logoImg = await loadImage("/images/logo/logo.jpg");
  } catch {
    // logo missing — will leave space blank
  }
  const doc = new jsPDF({ orientation: "portrait", unit: "mm", format: "a4" });
  const ctx = makePdfCtx(doc, logoImg);

  // Purchase uses a green accent to differentiate from Sales (blue)
  const titleColor: [number, number, number] = [15, 110, 86];

  const { doc: d, pw, ml, cw } = ctx;

  // ── Items table columns ────────────────────────────────────────────────────
  const cols = [
    { label: "S.NO",     w: 10 },
    { label: "NAME",     w: 42 },
    { label: "HSN&ACS",  w: 18 },
    { label: "QUANTITY", w: 16 },
    { label: "UNIT",     w: 12 },
    { label: "U RATE",   w: 16 },
    { label: "CGST",     w: 14 },
    { label: "SGST",     w: 14 },
    { label: "IGST",     w: 14 },
    { label: "TOTAL",    w: 16 },
  ];
  const usedW = cols.reduce((s, c) => s + c.w, 0);
  cols[cols.length - 1].w += cw - usedW;

  const drawItemsHeader = () => {
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
  d.text(docTypeLabel(row.purchaseDoctype), pw / 2, ctx.y + 6.2, { align: "center" });
  ctx.y += 13;

  // ── Party + date block ─────────────────────────────────────────────────────
  const partyBoxH = 34;
  d.setDrawColor(200, 200, 200);
  d.setLineWidth(0.3);
  d.rect(ml, ctx.y, cw * 0.55, partyBoxH);
  d.rect(ml + cw * 0.55, ctx.y, cw * 0.45, partyBoxH);

  const lx = ml + 2;
  const partyFields: [string, string][] = [
    ["TO PARTY  :", fmt(row.purchaseToParty)],
    ["GST NO    :", fmt(customer.gst)],
    ["CIN NO    :", fmt(customer.cin)],
    ["PAN NO    :", fmt(customer.pan)],
  ];
  partyFields.forEach(([label, value], i) => {
    d.setFont("helvetica", "bold");
    d.setFontSize(8);
    d.setTextColor(80, 80, 80);
    d.text(label, lx, ctx.y + 6 + i * 6);
    d.setFont("helvetica", "normal");
    d.setTextColor(20, 20, 20);
    d.text(value, lx + 24, ctx.y + 6 + i * 6);
  });

  const rx2 = ml + cw * 0.55 + 2;
  const rxv  = ml + cw - 2;
  const dateFields: [string, string][] = [
    ["DATE     :", fmt(row.purchaseDate)],
    ["VALIDITY :", fmt(row.purchaseValidity)],
    ["CURRENCY :", fmt(row.purchaseCurrency || "INR")],
  ];
  dateFields.forEach(([label, value], i) => {
    d.setFont("helvetica", "bold");
    d.setFontSize(8);
    d.setTextColor(80, 80, 80);
    d.text(label, rx2, ctx.y + 6 + i * 6);
    d.setFont("helvetica", "normal");
    d.setTextColor(20, 20, 20);
    d.text(value, rxv, ctx.y + 6 + i * 6, { align: "right" });
  });
  ctx.y += partyBoxH + 2;

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
  ctx.y += addrBoxH;

  // ── Kind Attention ─────────────────────────────────────────────────────────
  if (row.purchaseAddressedTo) {
    d.setDrawColor(200, 200, 200);
    d.setLineWidth(0.3);
    d.rect(ml, ctx.y, cw, 8);
    d.setFont("helvetica", "bold");
    d.setFontSize(8);
    d.setTextColor(80, 80, 80);
    d.text("Kind Attention :", ml + 2, ctx.y + 5.5);
    d.setFont("helvetica", "normal");
    d.setTextColor(20, 20, 20);
    d.text(fmt(row.purchaseAddressedTo), ml + 36, ctx.y + 5.5);
    ctx.y += 8;
  }
  ctx.y += 4;

  // ── Line items table ───────────────────────────────────────────────────────
  ctx.redrawTableHeader = drawItemsHeader;
  drawItemsHeader();

  if (items.length === 0) {
    d.setFont("helvetica", "italic");
    d.setFontSize(9);
    d.setTextColor(140, 140, 140);
    d.text("No line items found for this document.", ml + 3, ctx.y + 6);
    ctx.y += 10;
  } else {
    items.forEach((item, idx) => {
      const nameLines = d.splitTextToSize(fmt(item.nameOfProductService), cols[1].w - 3);
      const rowH = Math.max(8, nameLines.length * 4.5 + 3);
      ensureSpace(ctx, rowH + 2);

      if (idx % 2 === 0) {
        d.setFillColor(249, 252, 250);
        d.rect(ml, ctx.y, cw, rowH, "F");
      }
      d.setDrawColor(220, 220, 220);
      d.setLineWidth(0.2);
      d.rect(ml, ctx.y, cw, rowH);

      let colX = ml;
      d.setFont("helvetica", "bold");
      d.setFontSize(8);
      d.setTextColor(30, 30, 30);
      d.text(String(idx + 1),    colX + 1.5, ctx.y + 5); colX += cols[0].w;
      d.setFont("helvetica", "normal");
      d.text(nameLines,          colX + 1.5, ctx.y + 5); colX += cols[1].w;
      d.text(fmt(item.hsnAcs),   colX + 1.5, ctx.y + 5); colX += cols[2].w;
      d.text(fmt(item.quantity), colX + 1.5, ctx.y + 5); colX += cols[3].w;
      d.text(fmt(item.unit),     colX + 1.5, ctx.y + 5); colX += cols[4].w;
      d.text(cur(item.unitRate), colX + 1.5, ctx.y + 5); colX += cols[5].w;
      d.text(cur(item.cgstAmount), colX + 1.5, ctx.y + 5); colX += cols[6].w;
      d.text(cur(item.sgstAmount), colX + 1.5, ctx.y + 5); colX += cols[7].w;
      d.text(cur(item.igstAmount), colX + 1.5, ctx.y + 5); colX += cols[8].w;
      d.setFont("helvetica", "bold");
      d.text(cur(item.total),    colX + 1.5, ctx.y + 5);
      ctx.y += rowH;
    });
  }

  ctx.redrawTableHeader = undefined;
  ctx.y += 6;

  // ── Totals block ───────────────────────────────────────────────────────────
  ensureSpace(ctx, 52);
  const totalsW = 76;
  const wordsW  = cw - totalsW - 2;

  d.setDrawColor(200, 200, 200);
  d.setLineWidth(0.3);
  d.rect(ml, ctx.y, wordsW, 36);
  d.rect(ml + wordsW + 2, ctx.y, totalsW, 36);

  d.setFont("helvetica", "bold");
  d.setFontSize(8);
  d.setTextColor(40, 40, 40);
  d.text("TOTAL AMOUNT IN WORDS", ml + 2, ctx.y + 5.5);
  d.setFont("helvetica", "normal");
  d.setFontSize(7.5);
  const wordLines = d.splitTextToSize(toWords(roundedTotal).toLowerCase(), wordsW - 4);
  d.text(wordLines, ml + 2, ctx.y + 11);

  const tx = ml + wordsW + 4;
  const tv = ml + wordsW + 2 + totalsW - 2;
  const totRows: [string, string][] = [
    ["TOTAL TAXABLE AMOUNT :", cur(totalTaxable)],
    ["TOTAL CGST :",           cur(totalCgst)],
    ["TOTAL SGST :",           cur(totalSgst)],
    ["TOTAL IGST :",           cur(totalIgst)],
    ["TOTAL :",                cur(grandTotal)],
    ["ROUND OFF :",            String(roundedTotal)],
  ];
  totRows.forEach(([label, value], i) => {
    const ty = ctx.y + 6 + i * 5.5;
    d.setFont("helvetica", "bold");
    d.setFontSize(8);
    d.setTextColor(60, 60, 60);
    d.text(label, tx, ty);
    d.setTextColor(20, 20, 20);
    d.text(value, tv, ty, { align: "right" });
  });
  ctx.y += 38;

  // ── Terms & Conditions ─────────────────────────────────────────────────────
  ensureSpace(ctx, 32);
  const termsH = 28;
  d.setDrawColor(200, 200, 200);
  d.setLineWidth(0.3);
  d.rect(ml, ctx.y, cw, termsH);
  d.setFont("helvetica", "bold");
  d.setFontSize(8);
  d.setTextColor(40, 40, 40);
  d.text("Terms and Conditions :", ml + 2, ctx.y + 5.5);
  d.setFont("helvetica", "normal");
  d.setFontSize(7.5);
  d.setTextColor(60, 60, 60);
  if (row.purchasePaymentTerms)  d.text(`Payment Terms  : ${row.purchasePaymentTerms}`,  ml + 2, ctx.y + 11);
  if (row.purchaseDeliveryTerms) d.text(`Delivery Terms : ${row.purchaseDeliveryTerms}`, ml + 2, ctx.y + 16);
  if (row.purchaseDescription)   d.text(`Description    : ${row.purchaseDescription}`,   ml + 2, ctx.y + 21);
  ctx.y += termsH + 4;

  // ── Signature + footer ────────────────────────────────────────────────────
  drawSignatureBlock(ctx);
  drawFooter(ctx);

  const typeLabel = docTypeLabel(row.purchaseDoctype).replace(/\s+/g, "_");
  doc.save(`${typeLabel}_${row.id}_${(row.purchaseToParty || "party").replace(/[^a-zA-Z0-9]/g, "_").slice(0, 20)}.pdf`);
}