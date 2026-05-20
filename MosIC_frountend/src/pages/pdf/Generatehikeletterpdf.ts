/**
 * Generatehikeletterpdf.ts
 *
 * Generates a Pay Hike Letter PDF.
 * Standard format: logo from /images/logo/logo.jpg, multi-page overflow support.
 */

import jsPDF from "jspdf";
import {
  loadImage, makePdfCtx, drawHeader, drawFooter, ensureSpace,
  fmt, fmtDate, num, todayDMY, MONTH_NAMES, BRAND_BLUE,
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

export async function generateHikeLetterPDF(
  row: EmpPositionDTO,
  emp: EmpDTO,
  payMonth?: string,
  payYear?: string,
  letterDate?: string,
): Promise<void> {
  let logoImg: HTMLImageElement | null = null;
  try {
    logoImg = await loadImage("/images/logo/logo.jpg");
  } catch {
    // logo missing — will leave space blank
  }
  const doc = new jsPDF({ orientation: "portrait", unit: "mm", format: "a4" });
  const ctx = makePdfCtx(doc, logoImg);

  const date    = fmtDate(letterDate) || todayDMY();
  const effDate = fmtDate(row.epEfficientDate || row.epDate) || date;
  const refNo   = `PYHK/LTR/${effDate}/${row.empId ?? emp.id}`;

  const monthLabel = payMonth
    ? `${MONTH_NAMES[parseInt(payMonth, 10)] ?? payMonth}-${payYear ?? ""}`
    : "";

  const fmtMoney = (v: unknown) =>
    num(v).toLocaleString("en-IN", { minimumFractionDigits: 2 });

  const basic     = fmtMoney(row.empBasic);
  const hra       = fmtMoney(row.empHra);
  const allowance = fmtMoney(row.empAllowance);
  const gross     = fmtMoney(row.empMonthGross);
  const netSalary = num(row.empMonthGross) - (num(row.empTds) + num(row.empPt) + num(row.empLoans));

  const addr  = [emp.empAddress1, emp.empAddress2, emp.empAddress3].filter(Boolean) as string[];
  const email = emp.empMail ?? emp.empEmail ?? "";

  // ── Header ─────────────────────────────────────────────────────────────────
  drawHeader(ctx);
  const { doc: d, pw, ml, cw, mr } = ctx;

  // ── Title bar ─────────────────────────────────────────────────────────────
  d.setFillColor(...BRAND_BLUE);
  d.rect(ml, ctx.y, cw, 9, "F");
  d.setFont("helvetica", "bold");
  d.setFontSize(11);
  d.setTextColor(255, 255, 255);
  const bannerText = monthLabel ? `PAY HIKE FOR MONTH OF — ${monthLabel}` : "PAY HIKE LETTER";
  d.text(bannerText, pw / 2, ctx.y + 6.2, { align: "center" });
  ctx.y += 13;

  // ── Ref No ────────────────────────────────────────────────────────────────
  ensureSpace(ctx, 10);
  d.setFont("helvetica", "normal");
  d.setFontSize(9);
  d.setTextColor(20, 20, 20);
  d.text(`REF NO: ${refNo}`, ml, ctx.y);
  ctx.y += 8;

  // ── TO block (left) + meta block (right) ──────────────────────────────────
  ensureSpace(ctx, 40);
  const toStartY = ctx.y;

  d.setFontSize(9);
  d.text("TO", ml, ctx.y); ctx.y += 6;
  d.text(`${emp.empName} ${emp.empLastName},`, ml, ctx.y); ctx.y += 6;
  addr.forEach((line) => { d.text(`${line},`, ml, ctx.y); ctx.y += 6; });

  // Right meta column at fixed offsets from toStartY
  const metaRows: [string, string][] = [
    ["DATE :",        date],
    ["DESIGNATION :", fmt(row.position)],
    ["EMAIL :",       email],
    ["CURRENCY :",    "INR"],
  ];
  const rx = pw - mr;
  metaRows.forEach(([label, value], i) => {
    const ry = toStartY + i * 6;
    d.setFont("helvetica", "bold");
    d.setTextColor(60, 60, 60);
    d.text(label, rx - 60, ry);
    d.setFont("helvetica", "normal");
    d.setTextColor(20, 20, 20);
    d.text(value, rx, ry, { align: "right" });
  });

  ctx.y = Math.max(ctx.y, toStartY + metaRows.length * 6) + 8;

  // ── Dear paragraph ────────────────────────────────────────────────────────
  ensureSpace(ctx, 35);
  d.setFont("helvetica", "normal");
  d.setFontSize(9);
  d.setTextColor(20, 20, 20);
  d.text(`DEAR ${emp.empName},`, ml, ctx.y);
  ctx.y += 7;
  const para = d.splitTextToSize(
    `We are pleased to communicate to you that based on the Performance appraisal your salary is ${netSalary.toFixed(2)} revised and the new monthly salary is as follows.`,
    cw,
  );
  d.text(para, ml, ctx.y);
  ctx.y += para.length * 5 + 4;

  // ── Salary table ──────────────────────────────────────────────────────────
  ensureSpace(ctx, 70);
  d.setFont("helvetica", "bold");
  d.setFontSize(9);
  d.text("Payment", ml + 12, ctx.y);
  ctx.y += 8;

  interface SalRow { label: string; value: string; isBlue: boolean; }
  const salaryRows: SalRow[] = [
    { label: "FIXED PAY",           value: basic,     isBlue: true  },
    { label: "HRA",                 value: hra,       isBlue: true  },
    { label: "OTHER ALLOWANCE",     value: allowance, isBlue: true  },
    { label: "",                    value: "",        isBlue: true  },
    { label: "Gross Monthly Salary",value: gross,     isBlue: false },
  ];

  const tableX    = ml + 12;
  const tableValX = pw - mr - 12;

  salaryRows.forEach(({ label, value, isBlue }) => {
    if (label) {
      d.setFont("helvetica", "normal");
      d.setFontSize(9);
      d.setTextColor(isBlue ? 0 : 20, isBlue ? 0 : 20, isBlue ? 200 : 20);
      d.text(label, tableX + 8, ctx.y);
      d.text(value, tableValX, ctx.y, { align: "right" });
    }
    d.setDrawColor(0, 0, 200);
    d.setLineWidth(0.4);
    d.line(tableX, ctx.y + 3, tableValX + 12, ctx.y + 3);
    ctx.y += 12;
  });

  // ── Implementation note ───────────────────────────────────────────────────
  ensureSpace(ctx, 25);
  ctx.y += 4;
  d.setFont("helvetica", "normal");
  d.setFontSize(9);
  d.setTextColor(20, 20, 20);
  const noteLines = d.splitTextToSize(
    `New salary will be implemented from ${effDate} till further communication on salary revision.`,
    cw - 16,
  );
  d.text(noteLines, ml + 8, ctx.y);
  ctx.y += noteLines.length * 5 + 8;

  d.text("With Regards", ml + 8, ctx.y);
  ctx.y += 40;
  d.text("(Authorised Signatory)", ml + 8, ctx.y);

  drawFooter(ctx);

  doc.save(`${Date.now()}-HIKELETTER_${emp.id}_${emp.empName}_${emp.empLastName}.pdf`);
}