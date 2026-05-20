/**
 * Generateresignationpdf.ts
 *
 * Generates a Relieving / Resignation Letter PDF.
 * Standard format: logo from /images/logo/logo.jpg, multi-page overflow support.
 */

import jsPDF from "jspdf";
import {
  loadImage, makePdfCtx, drawHeader, drawFooter, ensureSpace,
  fmt, fmtDate, todayDMY, BRAND_BLUE,
} from "./Pdfheader";

// ─── Types ────────────────────────────────────────────────────────────────────

export interface EmpPositionDTO {
  id: number | null;
  empId: number | null;
  epDate: string;
  epEfficientDate: string;
  position: string;
  department: string;
  role: string;
  reportingTo: string;
  empBasic: string;
  empHra: string;
  empAllowance: string;
  empMonthGross: string;
  empCtc: string;
  empTds: string;
  empPt: string;
  empLoans: string;
  activeStatus: string;
  status: string;
}

export interface EmpDTO {
  id: number;
  empName: string;
  empLastName: string;
  empEmail?: string;
  empMail?: string;
  empAddress1?: string;
  empAddress2?: string;
  empAddress3?: string;
  empDoj?: string;
}

// ─── Main export ──────────────────────────────────────────────────────────────

export async function generateResignationPDF(
  row: EmpPositionDTO,
  emp: EmpDTO,
  joiningDate: string,
  relievingDate?: string,
): Promise<void> {
  let logoImg: HTMLImageElement | null = null;
  try {
    logoImg = await loadImage("/images/logo/logo.jpg");
  } catch {
    // logo missing — will leave space blank
  }
  const doc = new jsPDF({ orientation: "portrait", unit: "mm", format: "a4" });
  const ctx = makePdfCtx(doc, logoImg);

  const joining   = fmtDate(joiningDate) || fmtDate(emp.empDoj) || "";
  const relieving = fmtDate(relievingDate) || todayDMY();
  const printDate = todayDMY();
  const dept      = fmt(row.department || row.position);

  // ── Header ─────────────────────────────────────────────────────────────────
  drawHeader(ctx);
  const { doc: d, pw, ml, cw, mr } = ctx;

  // ── Title bar ─────────────────────────────────────────────────────────────
  d.setFillColor(...BRAND_BLUE);
  d.rect(ml, ctx.y, cw, 9, "F");
  d.setFont("helvetica", "bold");
  d.setFontSize(11);
  d.setTextColor(255, 255, 255);
  d.text("RESIGNATION LETTER", pw / 2, ctx.y + 6.2, { align: "center" });
  ctx.y += 13;

  // ── DATE top-right ────────────────────────────────────────────────────────
  ensureSpace(ctx, 10);
  d.setFont("helvetica", "normal");
  d.setFontSize(8.5);
  d.setTextColor(40, 40, 40);
  d.text(`DATE : ${printDate}`, pw - mr, ctx.y, { align: "right" });
  ctx.y += 14;

  // ── "TO WHOMSOEVER IT MAY CONCERN" ────────────────────────────────────────
  ensureSpace(ctx, 20);
  d.setFont("helvetica", "bold");
  d.setFontSize(14);
  d.setTextColor(20, 20, 20);
  d.text("TO WHOMSOEVER IT MAY CONCERN", pw / 2, ctx.y, { align: "center" });
  ctx.y += 14;

  // ── Certification lines ───────────────────────────────────────────────────
  ensureSpace(ctx, 40);
  d.setFont("helvetica", "normal");
  d.setFontSize(11);
  d.setTextColor(20, 20, 20);

  // Line 1
  const line1 = `Hereby it is certified that ${emp.empName} ${emp.empLastName} has been working as`;
  const l1Lines = d.splitTextToSize(line1, cw);
  d.text(l1Lines, ml, ctx.y);
  ctx.y += l1Lines.length * 6 + 4;

  // Line 2
  const line2 = `${dept}  from  ${joining}  to  ${relieving}`;
  const l2Lines = d.splitTextToSize(line2, cw);
  d.text(l2Lines, ml, ctx.y);
  ctx.y += l2Lines.length * 6 + 10;

  // Performance sentence
  ensureSpace(ctx, 30);
  const perf = d.splitTextToSize(
    "During this period, his/her performance is very good and we wish him/her success for all future endeavours.",
    cw,
  );
  d.text(perf, ml, ctx.y);
  ctx.y += perf.length * 6 + 20;

  // ── Signatory ─────────────────────────────────────────────────────────────
  ensureSpace(ctx, 30);
  d.setFont("helvetica", "normal");
  d.setFontSize(11);
  d.text("Authorised Signatory", ml + 12, ctx.y);
  ctx.y += 40;

  ensureSpace(ctx, 20);
  d.text("Director", ml + 12, ctx.y);

  // ── Footer ────────────────────────────────────────────────────────────────
  drawFooter(ctx);

  doc.save(`${Date.now()}-RESIGNATION_${emp.id}_${emp.empName}_${emp.empLastName}.pdf`);
}