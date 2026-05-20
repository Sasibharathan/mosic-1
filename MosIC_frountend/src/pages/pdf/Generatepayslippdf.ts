/**
 * Generatepayslippdf.ts
 *
 * Generates a Payslip PDF.
 * Standard format: logo from /images/logo/logo.jpg, multi-page overflow support.
 *
 * Layout:
 *   • Company header (logo + address) — repeated on every page
 *   • "PAYSLIP FOR MONTH OF - <MONTH>-<YEAR>" banner
 *   • Left meta: EMPLOYEE ID / PAN CARD NO / PAYSLIP REF / EMPLOYEE NAME
 *   • Right meta: DATE / DESIGNATION / EMAIL
 *   • Three-column table: PAYMENTS | DEDUCTIONS | BANK DETAILS
 *   • Footer row: GROSS RS. | DEDUCTIONS RS. | NET SALARY RS.
 */

import jsPDF from "jspdf";
import {
  loadImage, makePdfCtx, drawHeader, drawFooter, ensureSpace,
  drawSignatureBlock, num, fmt, BRAND_BLUE, MONTH_NAMES,
} from "./Pdfheader";

// ─── Types ────────────────────────────────────────────────────────────────────

export interface PayslipForPDF {
  id: number | null;
  empId: number | null;
  empMonth: string;
  empYear: string;
  basic: string;
  hra: string;
  allowancess: string;
  totalGross: string;
  tds: string;
  pt: string;
  loan: string;
  totalDeduction: string;
  status: number;
}

export interface EmpForPDF {
  id: number | null;
  empName: string;
  empLastName: string;
  empMail?: string;
  empEmail?: string;
  empPan?: string;
  empAccNo?: string;
  empBankName?: string;
  empIfscCode?: string;
  empAccName?: string;
}

export interface PositionForPDF {
  position?: string;
  department?: string;
}

// ─── Main export ──────────────────────────────────────────────────────────────

export async function generatePayslipPDF(
  payslip: PayslipForPDF,
  emp: EmpForPDF,
  position?: PositionForPDF,
): Promise<void> {
  let logoImg: HTMLImageElement | null = null;
  try {
    logoImg = await loadImage("/images/logo/logo.jpg");
  } catch {
    // logo missing — will leave space blank
  }
  const doc = new jsPDF({ orientation: "portrait", unit: "mm", format: "a4" });
  const ctx = makePdfCtx(doc, logoImg);

  // ── Derived values ─────────────────────────────────────────────────────────
  const monthNum   = parseInt(payslip.empMonth, 10);
  const monthName  = MONTH_NAMES[monthNum] ?? payslip.empMonth;
  const monthLabel = `${monthName}-${payslip.empYear}`;

  const basic      = num(payslip.basic);
  const hra        = num(payslip.hra);
  const allowances = num(payslip.allowancess);
  const tds        = num(payslip.tds);
  const pt         = num(payslip.pt);
  const loan       = num(payslip.loan);
  const gross      = num(payslip.totalGross)     || (basic + hra + allowances);
  const deductions = num(payslip.totalDeduction) || (tds + pt + loan);
  const net        = gross - deductions;

  const email    = emp.empMail ?? emp.empEmail ?? "";
  const fullName = `${emp.empName} ${emp.empLastName}`.trim();
  const now      = new Date();
  const dateStr  = now.toLocaleString("en-IN");

  const fmtMoney = (n: number) =>
    n.toLocaleString("en-IN", { minimumFractionDigits: 2 });

  // ── Header ─────────────────────────────────────────────────────────────────
  drawHeader(ctx);
  const { pw, ml, cw } = ctx;
  const mr = ctx.mr;

  // ── Title bar ─────────────────────────────────────────────────────────────
  doc.setFillColor(...BRAND_BLUE);
  doc.rect(ml, ctx.y, cw, 9, "F");
  doc.setFont("helvetica", "bold");
  doc.setFontSize(11);
  doc.setTextColor(255, 255, 255);
  doc.text("PAYSLIP", pw / 2, ctx.y + 6.2, { align: "center" });
  ctx.y += 13;

  // ── Month banner ──────────────────────────────────────────────────────────
  ensureSpace(ctx, 12);
  doc.setFillColor(245, 247, 252);
  doc.rect(ml, ctx.y, cw, 9, "F");
  doc.setFont("helvetica", "bold");
  doc.setFontSize(10);
  doc.setTextColor(30, 30, 30);
  doc.text(`PAYSLIP FOR MONTH OF  —  ${monthLabel}`, pw / 2, ctx.y + 6, { align: "center" });
  ctx.y += 13;

  // ── Meta block (left + right) ─────────────────────────────────────────────
  ensureSpace(ctx, 30);
  const lx = ml + 2;
  const rx = pw - mr;

  doc.setFont("helvetica", "normal");
  doc.setFontSize(8.5);
  doc.setTextColor(20, 20, 20);
  doc.text(`EMPLOYEE ID    :  ${emp.id ?? ""}`,    lx, ctx.y + 6);
  doc.text(`PAN CARD NO    :  ${emp.empPan ?? ""}`, lx, ctx.y + 12);
  doc.text(`PAYSLIP REF    :  ${payslip.id ?? ""}`, lx, ctx.y + 18);
  doc.text(`EMPLOYEE NAME  :  ${fullName}`,         lx, ctx.y + 24);

  doc.text(`DATE         :  ${dateStr}`,                       rx, ctx.y + 6,  { align: "right" });
  doc.text(`DESIGNATION  :  ${position?.position ?? ""}`,     rx, ctx.y + 12, { align: "right" });
  doc.text(`EMAIL        :  ${email}`,                        rx, ctx.y + 18, { align: "right" });
  ctx.y += 30;

  // ── Three-column table ─────────────────────────────────────────────────────
  ensureSpace(ctx, 70);
  const colW   = [cw * 0.32, cw * 0.32, cw * 0.36];
  const tableY = ctx.y;
  const rowH   = 7;

  // Header row
  const hdrColors: [number, number, number][] = [
    [30, 80, 160], [160, 40, 40], [40, 120, 60],
  ];
  const hdrLabels = ["PAYMENTS", "DEDUCTIONS", "BANK DETAILS"];
  let hx = ml;
  hdrLabels.forEach((h, i) => {
    doc.setFillColor(...hdrColors[i]);
    doc.rect(hx, tableY, colW[i], rowH, "F");
    doc.setFont("helvetica", "bold");
    doc.setFontSize(8.5);
    doc.setTextColor(255, 255, 255);
    doc.text(h, hx + colW[i] / 2, tableY + 5, { align: "center" });
    hx += colW[i];
  });

  // Data rows
  const payRows = [
    [`FIXED PAY     ${fmtMoney(basic)}`,      `PROFESSIONAL TAX   ${fmtMoney(pt)}`,   fmt(emp.empAccNo)],
    [`HRA           ${fmtMoney(hra)}`,         `TDS DEDUCTIONS     ${fmtMoney(tds)}`,  "BANK ACCOUNT NO"],
    [`ALLOWANCES    ${fmtMoney(allowances)}`,  `OTHER DEDUCTIONS   ${fmtMoney(loan)}`, fmt(emp.empIfscCode)],
    ["", "", "BANK BRANCH IFSC CODE"],
    ["", "", fmt(emp.empBankName)],
  ];

  doc.setFont("helvetica", "normal");
  doc.setFontSize(8);
  doc.setTextColor(20, 20, 20);

  payRows.forEach((row, ri) => {
    let rx2 = ml;
    row.forEach((cell, ci) => {
      const ry = tableY + rowH + ri * rowH;
      doc.setDrawColor(200, 200, 200);
      doc.setLineWidth(0.3);
      doc.rect(rx2, ry, colW[ci], rowH);
      doc.text(cell, rx2 + 2, ry + 5);
      rx2 += colW[ci];
    });
  });

  // Footer row
  const footerY = tableY + rowH + payRows.length * rowH;
  const footerColors: [number, number, number][] = [
    [30, 80, 160], [160, 40, 40], [40, 120, 60],
  ];
  const footerData = [
    `GROSS RS.      ${fmtMoney(gross)}`,
    `DEDUCTIONS RS. ${fmtMoney(deductions)}`,
    `NET SALARY RS. ${fmtMoney(net)}`,
  ];

  doc.setFont("helvetica", "bold");
  doc.setFontSize(8.5);
  let fx = ml;
  footerData.forEach((cell, i) => {
    doc.setFillColor(...footerColors[i]);
    doc.rect(fx, footerY, colW[i], rowH, "F");
    doc.setTextColor(255, 255, 255);
    doc.text(cell, fx + 2, footerY + 5);
    fx += colW[i];
  });

  ctx.y = footerY + rowH + 4;

  // ── Signature + footer ────────────────────────────────────────────────────
  drawSignatureBlock(ctx);
  drawFooter(ctx);

  doc.save(`PAYSLIP_${emp.id}_${emp.empName}_${emp.empLastName}_${monthLabel}.pdf`);
}