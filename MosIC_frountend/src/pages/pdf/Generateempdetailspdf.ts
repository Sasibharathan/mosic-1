/**
 * Generateempdetailspdf.ts
 *
 * Generates a professional Employee Details PDF.
 * Standard format: logo from /images/logo/logo.jpg, multi-page overflow support.
 *
 * Sections: Personal Information / Contact & Address / Tax & Compliance /
 *           Bank Details / Current Salary Details
 */

import jsPDF from "jspdf";
import {
  loadImage, makePdfCtx, drawHeader, drawFooter, ensureSpace,
  drawSectionBar, drawKvRow, drawSignatureBlock,
  fmt, fmtDate, cur,
} from "./Pdfheader";

// ─── Types ────────────────────────────────────────────────────────────────────

export interface EmpDetailForPDF {
  id: number | null;
  empName: string;
  empLastName: string;
  empDob?: string;
  empDoj?: string;
  empPh?: string;
  empMail?: string;
  empEmail?: string;
  empPan?: string;
  empAdhar?: string;
  empAccNo?: string;
  empBankName?: string;
  empAccName?: string;
  empIfscCode?: string;
  empAddress1?: string;
  empAddress2?: string;
  empAddress3?: string;
  status?: string;
}

export interface EmpPositionDetailForPDF {
  position?: string;
  department?: string;
  role?: string;
  empBasic?: string;
  empHra?: string;
  empAllowance?: string;
  empMonthGross?: string;
  epDate?: string;
  epEfficientDate?: string;
}

// ─── Main export ──────────────────────────────────────────────────────────────

export async function generateEmpDetailsPDF(
  emp: EmpDetailForPDF,
  position?: EmpPositionDetailForPDF,
): Promise<void> {
  let logoImg: HTMLImageElement | null = null;
  try {
    logoImg = await loadImage("/images/logo/logo.jpg");
  } catch {
    // logo missing — will leave space blank
  }
  const doc = new jsPDF({ orientation: "portrait", unit: "mm", format: "a4" });
  const ctx = makePdfCtx(doc, logoImg);

  // ── Page 1 header ─────────────────────────────────────────────────────────
  drawHeader(ctx);

  // ── Document title bar ────────────────────────────────────────────────────
  const { pw, ml, cw } = ctx;
  doc.setFillColor(30, 80, 160);
  doc.rect(ml, ctx.y, cw, 9, "F");
  doc.setFont("helvetica", "bold");
  doc.setFontSize(11);
  doc.setTextColor(255, 255, 255);
  doc.text("EMPLOYEE DETAILS", pw / 2, ctx.y + 6.2, { align: "center" });
  ctx.y += 13;

  // ── Employee banner row ───────────────────────────────────────────────────
  ensureSpace(ctx, 12);
  doc.setFillColor(245, 247, 252);
  doc.rect(ml, ctx.y, cw, 9, "F");
  doc.setFont("helvetica", "normal");
  doc.setFontSize(8.5);
  doc.setTextColor(30, 30, 30);
  doc.text(
    `Employee ID: ${emp.id ?? "—"}   |   Name: ${emp.empName} ${emp.empLastName}   |   Status: ${emp.status === "1" ? "Active" : "Inactive"}`,
    pw / 2, ctx.y + 6, { align: "center" },
  );
  ctx.y += 13;

  // ─────────────────────────────────────────────────────────────────────────
  // SECTION 1 — Personal Information
  // ─────────────────────────────────────────────────────────────────────────
  drawSectionBar(ctx, "Personal Information");

  const personalRows: [string, string][] = [
    ["First Name",      fmt(emp.empName)],
    ["Last Name",       fmt(emp.empLastName)],
    ["Date of Birth",   fmtDate(emp.empDob)],
    ["Date of Joining", fmtDate(emp.empDoj)],
    ["Designation",     fmt(position?.position)],
    ["Department",      fmt(position?.department)],
    ["Role",            fmt(position?.role)],
  ];
  personalRows.forEach(([label, value], i) => drawKvRow(ctx, label, value, i % 2 === 1));

  ctx.y += 4;

  // ─────────────────────────────────────────────────────────────────────────
  // SECTION 2 — Contact & Address
  // ─────────────────────────────────────────────────────────────────────────
  drawSectionBar(ctx, "Contact & Address");

  const contactRows: [string, string][] = [
    ["Phone",     fmt(emp.empPh)],
    ["Email",     fmt(emp.empMail ?? emp.empEmail)],
    ["Address 1", fmt(emp.empAddress1)],
    ["Address 2", fmt(emp.empAddress2)],
    ["Address 3", fmt(emp.empAddress3)],
  ];
  contactRows.forEach(([label, value], i) => drawKvRow(ctx, label, value, i % 2 === 1));

  ctx.y += 4;

  // ─────────────────────────────────────────────────────────────────────────
  // SECTION 3 — Tax & Compliance
  // ─────────────────────────────────────────────────────────────────────────
  drawSectionBar(ctx, "Tax & Compliance");

  const aadhaar = emp.empAdhar?.trim()
    ? `XXXX-XXXX-${emp.empAdhar.slice(-4)}`
    : "—";

  const taxRows: [string, string][] = [
    ["PAN Number", fmt(emp.empPan)],
    ["Aadhaar",    aadhaar],
  ];
  taxRows.forEach(([label, value], i) => drawKvRow(ctx, label, value, i % 2 === 1));

  ctx.y += 4;

  // ─────────────────────────────────────────────────────────────────────────
  // SECTION 4 — Bank Details
  // ─────────────────────────────────────────────────────────────────────────
  drawSectionBar(ctx, "Bank Details");

  const accNo = emp.empAccNo?.trim()
    ? `${"X".repeat(Math.max(0, emp.empAccNo.length - 4))}${emp.empAccNo.slice(-4)}`
    : "—";

  const bankRows: [string, string][] = [
    ["Account Holder Name", fmt(emp.empAccName)],
    ["Bank Name",           fmt(emp.empBankName)],
    ["Account Number",      accNo],
    ["IFSC Code",           fmt(emp.empIfscCode)],
  ];
  bankRows.forEach(([label, value], i) => drawKvRow(ctx, label, value, i % 2 === 1));

  // ─────────────────────────────────────────────────────────────────────────
  // SECTION 5 — Salary Details (optional)
  // ─────────────────────────────────────────────────────────────────────────
  if (position) {
    ctx.y += 4;
    drawSectionBar(ctx, "Current Salary Details");

    const salaryRows: [string, string][] = [
      ["Basic / Fixed Pay",  `₹ ${cur(position.empBasic)}`],
      ["HRA",                `₹ ${cur(position.empHra)}`],
      ["Other Allowances",   `₹ ${cur(position.empAllowance)}`],
      ["Monthly Gross",      `₹ ${cur(position.empMonthGross)}`],
      ["Effective From",     fmtDate(position.epEfficientDate ?? position.epDate)],
    ];
    salaryRows.forEach(([label, value], i) => drawKvRow(ctx, label, value, i % 2 === 1));
  }

  // ── Signature block ───────────────────────────────────────────────────────
  drawSignatureBlock(ctx);

  // ── Generated timestamp ───────────────────────────────────────────────────
  ensureSpace(ctx, 10);
  doc.setFont("helvetica", "italic");
  doc.setFontSize(7.5);
  doc.setTextColor(130, 130, 130);
  doc.text(
    `Generated on ${new Date().toLocaleDateString("en-IN", { day: "2-digit", month: "long", year: "numeric" })} at ${new Date().toLocaleTimeString("en-IN")}`,
    ml, ctx.y,
  );

  // ── Final footer ──────────────────────────────────────────────────────────
  drawFooter(ctx);

  doc.save(`EMP_DETAILS_${emp.id}_${emp.empName}_${emp.empLastName}.pdf`);
}