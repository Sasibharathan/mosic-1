/**
 * generateFileIndexPDF.ts
 *
 * Generates a PDF for a single File Index record + all its activities.
 * Standard format: logo from /images/logo/logo.jpg, multi-page overflow support.
 */

import jsPDF from "jspdf";
import {
  loadImage, makePdfCtx, drawHeader, drawFooter, ensureSpace,
  drawSectionBar, drawSignatureBlock, fmt, BRAND_BLUE,
} from "./Pdfheader";

import type { FileIndexRow, ActivityRow } from "../FileIndex/FileIndex.shared";

// ─── Helpers ──────────────────────────────────────────────────────────────────

const statusLabel = (v: string): string => {
  if (v === "1" || v === "ACTIVE")    return "Active";
  if (v === "0" || v === "INACTIVE")  return "Inactive";
  if (v === "PENDING")                return "Pending";
  if (v === "COMPLETED")              return "Completed";
  return v || "—";
};

// ─── Main export ──────────────────────────────────────────────────────────────

export async function generateFileIndexPDF(
  file: FileIndexRow,
  activities: ActivityRow[],
): Promise<void> {
  let logoImg: HTMLImageElement | null = null;
  try {
    logoImg = await loadImage("/images/logo/logo.jpg");
  } catch {
    // logo missing — will leave space blank
  }
  const doc = new jsPDF({ orientation: "portrait", unit: "mm", format: "a4" });
  const ctx = makePdfCtx(doc, logoImg);

  // ── Header ─────────────────────────────────────────────────────────────────
  drawHeader(ctx);
  const { doc: d, pw, ml, cw } = ctx;

  // ── Title bar ─────────────────────────────────────────────────────────────
  d.setFillColor(...BRAND_BLUE);
  d.rect(ml, ctx.y, cw, 9, "F");
  d.setFont("helvetica", "bold");
  d.setFontSize(11);
  d.setTextColor(255, 255, 255);
  d.text("FILE INDEX RECORD", pw / 2, ctx.y + 6.2, { align: "center" });
  ctx.y += 13;

  // ── File details section ───────────────────────────────────────────────────
  drawSectionBar(ctx, "File Details");

  const col1x = ml;
  const col2x = ml + cw / 2 + 2;

  const infoRows: [string, string, string, string][] = [
    ["File ID:",    fmt(file.id),          "File Date:", fmt(file.f_date)],
    ["Activity:",   fmt(file.f_activity),  "Status:",    statusLabel(file.status)],
  ];

  infoRows.forEach(([lbl1, val1, lbl2, val2]) => {
    ensureSpace(ctx, 8);
    d.setFont("helvetica", "bold");
    d.setFontSize(8.5);
    d.setTextColor(100, 100, 100);
    d.text(`${lbl1}`, col1x + 2, ctx.y + 4.5);
    d.setFont("helvetica", "normal");
    d.setTextColor(30, 30, 30);
    d.text(val1, col1x + 30, ctx.y + 4.5);
    d.setFont("helvetica", "bold");
    d.setTextColor(100, 100, 100);
    d.text(`${lbl2}`, col2x + 2, ctx.y + 4.5);
    d.setFont("helvetica", "normal");
    d.setTextColor(30, 30, 30);
    d.text(val2, col2x + 30, ctx.y + 4.5);
    ctx.y += 7;
  });

  // Subject
  ensureSpace(ctx, 10);
  d.setFont("helvetica", "bold");
  d.setFontSize(8.5);
  d.setTextColor(100, 100, 100);
  d.text("Subject:", col1x + 2, ctx.y + 4.5);
  d.setFont("helvetica", "normal");
  d.setTextColor(30, 30, 30);
  const subjectLines = d.splitTextToSize(fmt(file.f_subject), cw - 32);
  d.text(subjectLines, col1x + 28, ctx.y + 4.5);
  ctx.y += Math.max(7, subjectLines.length * 5);

  // Description
  ensureSpace(ctx, 10);
  d.setFont("helvetica", "bold");
  d.setTextColor(100, 100, 100);
  d.text("Description:", col1x + 2, ctx.y + 4.5);
  d.setFont("helvetica", "normal");
  d.setTextColor(30, 30, 30);
  const descLines = d.splitTextToSize(fmt(file.f_description), cw - 32);
  d.text(descLines, col1x + 28, ctx.y + 4.5);
  ctx.y += Math.max(7, descLines.length * 5);

  if (file.datecreated) {
    ensureSpace(ctx, 8);
    d.setFont("helvetica", "bold");
    d.setTextColor(100, 100, 100);
    d.text("Date Created:", col1x + 2, ctx.y + 4.5);
    d.setFont("helvetica", "normal");
    d.setTextColor(30, 30, 30);
    d.text(fmt(file.datecreated), col1x + 34, ctx.y + 4.5);
    ctx.y += 7;
  }

  // Thin separator
  d.setDrawColor(220, 220, 220);
  d.setLineWidth(0.3);
  d.line(ml, ctx.y, pw - ctx.mr, ctx.y);
  ctx.y += 6;

  // ── Activities section ─────────────────────────────────────────────────────
  drawSectionBar(ctx, `Activities  (${activities.length} record${activities.length !== 1 ? "s" : ""})`);

  if (activities.length === 0) {
    ensureSpace(ctx, 12);
    d.setFont("helvetica", "italic");
    d.setFontSize(9);
    d.setTextColor(140, 140, 140);
    d.text("No activities recorded for this file.", ml + 3, ctx.y + 5);
    ctx.y += 12;
  } else {
    const cols = [
      { label: "#",          w: 10 },
      { label: "ID",         w: 16 },
      { label: "Date",       w: 28 },
      { label: "Remarks",    w: 72 },
      { label: "Attachment", w: 36 },
      { label: "Status",     w: 20 },
    ];

    const drawTableHeader = () => {
      ensureSpace(ctx, 10);
      d.setFillColor(...BRAND_BLUE);
      d.rect(ml, ctx.y, cw, 8, "F");
      d.setFont("helvetica", "bold");
      d.setFontSize(8);
      d.setTextColor(255, 255, 255);
      let colX = ml;
      cols.forEach((col) => { d.text(col.label, colX + 2, ctx.y + 5.5); colX += col.w; });
      ctx.y += 8;
    };

    ctx.redrawTableHeader = drawTableHeader;
    drawTableHeader();

    activities.forEach((act, idx) => {
      const remarkLines = d.splitTextToSize(fmt(act.activityRemarks), cols[3].w - 4);
      const rowH = Math.max(8, remarkLines.length * 5 + 3);

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
      d.text(String(idx + 1), colX + 2, ctx.y + 5); colX += cols[0].w;
      d.text(fmt(act.id),       colX + 2, ctx.y + 5); colX += cols[1].w;
      d.text(fmt(act.activityDate), colX + 2, ctx.y + 5); colX += cols[2].w;
      d.text(remarkLines,        colX + 2, ctx.y + 5); colX += cols[3].w;

      const hasBlob = /^\d+$/.test((act.activityDocId || "").trim());
      d.setTextColor(hasBlob ? 30 : 140, hasBlob ? 80 : 140, hasBlob ? 160 : 140);
      d.text(hasBlob ? `Blob #${act.activityDocId}` : "—", colX + 2, ctx.y + 5);
      d.setTextColor(40, 40, 40);
      colX += cols[4].w;

      const sl = statusLabel(act.activityStatus);
      d.setTextColor(
        sl === "Active" || sl === "Completed" ? 22 : sl === "Pending" ? 160 : 120,
        sl === "Active" || sl === "Completed" ? 120 : sl === "Pending" ? 100 : 120,
        sl === "Active" || sl === "Completed" ? 46  : sl === "Pending" ? 20  : 120,
      );
      d.text(sl, colX + 2, ctx.y + 5);
      d.setTextColor(40, 40, 40);

      ctx.y += rowH;
    });

    ctx.redrawTableHeader = undefined;
    ctx.y += 4;
  }

  // ── Signature + footer ────────────────────────────────────────────────────
  drawSignatureBlock(ctx);
  drawFooter(ctx);

  const filename = `File_${file.id}_${(file.f_subject || "record").replace(/[^a-zA-Z0-9]/g, "_").slice(0, 30)}.pdf`;
  doc.save(filename);
}