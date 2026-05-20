/**
 * Generateemppositionpdf.ts
 *
 * Generates employee HR letters as professional PDFs.
 * Standard format: logo from /images/logo/logo.jpg, multi-page overflow support.
 *
 * Three document types:
 *   1. generateAppointmentPDF  — Appointment / Offer Letter
 *   2. generatePayHikePDF      — Pay Hike Letter
 *   3. generateRelievingPDF    — Relieving / Resignation Letter
 *
 * All functions are async and load /images/logo/logo.jpg automatically.
 *
 * Usage:
 *   import { generateAppointmentPDF, generatePayHikePDF, generateRelievingPDF }
 *     from "./pdf/Generateemppositionpdf";
 */

import jsPDF from "jspdf";
import {
  loadImage, makePdfCtx, drawHeader, drawFooter, ensureSpace,
  fmt, fmtDate, num, todayDMY, BRAND_BLUE, MONTH_NAMES,
} from "./Pdfheader";

// ─── Shared types ─────────────────────────────────────────────────────────────

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

// ─── Brand colours ────────────────────────────────────────────────────────────

const BLUE:  [number, number, number] = [30,  80, 162];
const BLACK: [number, number, number] = [20,  20,  20];
const GREY:  [number, number, number] = [90,  90,  90];
const LIGHT: [number, number, number] = [245, 247, 252];

// ─── Shared internal helpers ──────────────────────────────────────────────────

const cur = (v: unknown) =>
  num(v).toLocaleString("en-IN", { minimumFractionDigits: 2 });

// ─────────────────────────────────────────────────────────────────────────────
// 1.  APPOINTMENT / OFFER LETTER
// ─────────────────────────────────────────────────────────────────────────────

export async function generateAppointmentPDF(
  row: EmpPositionDTO,
  emp: EmpDTO,
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
  const { doc: d, pw, ml, cw } = ctx;

  const date      = fmtDate(letterDate) || todayDMY();
  const effDate   = fmtDate(row.epEfficientDate || row.epDate) || date;
  const refNo     = `APP/LTR/${effDate}/${row.empId ?? emp.id}`;
  const empName   = `${emp.empName} ${emp.empLastName}`;
  const ctcAnnual = cur(row.empCtc);
  const addr      = [emp.empAddress1, emp.empAddress2, emp.empAddress3].filter(Boolean) as string[];

  // ── Helpers ────────────────────────────────────────────────────────────────
  const body = (text: string, indent = 0, fs = 9) => {
    ensureSpace(ctx, 10);
    d.setFont("helvetica", "normal");
    d.setFontSize(fs);
    d.setTextColor(...BLACK);
    const lines = d.splitTextToSize(text, cw - indent) as string[];
    d.text(lines, ml + indent, ctx.y);
    ctx.y += lines.length * (fs * 0.36 + 1.2) + 1;
  };

  const secHead = (text: string) => {
    ensureSpace(ctx, 12);
    ctx.y += 3;
    d.setFillColor(...LIGHT);
    d.rect(ml, ctx.y, cw, 7, "F");
    d.setFont("helvetica", "bold");
    d.setFontSize(9);
    d.setTextColor(...BLUE);
    d.text(text, ml + 2, ctx.y + 5);
    ctx.y += 9;
  };

  // ── Header + title bar ────────────────────────────────────────────────────
  drawHeader(ctx);

  d.setFillColor(...BRAND_BLUE);
  d.rect(ml, ctx.y, cw, 9, "F");
  d.setFont("helvetica", "bold");
  d.setFontSize(11);
  d.setTextColor(255, 255, 255);
  d.text("LETTER OF APPOINTMENT", pw / 2, ctx.y + 6.2, { align: "center" });
  ctx.y += 13;

  // ── Ref + Date ────────────────────────────────────────────────────────────
  ensureSpace(ctx, 10);
  d.setFont("helvetica", "italic");
  d.setFontSize(8.5);
  d.setTextColor(...GREY);
  d.text(`Ref No: ${refNo}`, ml, ctx.y);
  d.setFont("helvetica", "normal");
  d.text(`Date : ${date}`, pw - ml, ctx.y, { align: "right" });
  ctx.y += 8;

  // ── TO block ──────────────────────────────────────────────────────────────
  ensureSpace(ctx, 30);
  d.setFont("helvetica", "normal");
  d.setFontSize(9);
  d.setTextColor(...BLACK);
  d.text("To,", ml, ctx.y); ctx.y += 5;
  d.text(`${empName},`, ml, ctx.y); ctx.y += 5;
  addr.forEach((line) => { d.text(line, ml, ctx.y); ctx.y += 5; });
  ctx.y += 4;

  body(`Dear ${empName},`);
  ctx.y += 2;
  body(`It is our pleasure in appointing you in MosIC Solutions Pvt Ltd as ${fmt(row.position)} in ${fmt(row.department)} or in such other capacity the management shall from time to time determine. Please note that the employment terms contained in this letter are subject to the company policy.`);

  // ── 1. APPOINTMENT ────────────────────────────────────────────────────────
  secHead("1.  APPOINTMENT");
  body(`1.  Your date of appointment is effective from ${effDate}.`, 4);
  body("2.  You will be liable to be transferred in such capacity as the company may from time to time determine to any other location, department, function, establishment, or branch of the company or its subsidiary, associate or affiliate company. In such case you will be governed by the terms and conditions of service applicable to the new assignment.", 4);
  body("3.  The age of retirement is 58 years.", 4);

  // ── 2. COMPENSATION ───────────────────────────────────────────────────────
  secHead("2.  COMPENSATION");
  body("You will be eligible to receive the following:");
  ctx.y += 2;

  // Salary table
  ensureSpace(ctx, 50);
  const tl = ml + 6, tr = ml + cw - 6;
  const salRows: [string, string][] = [
    ["Basic Pay",       cur(row.empBasic)],
    ["HRA",             cur(row.empHra)],
    ["Other Allowance", cur(row.empAllowance)],
    ["Monthly Gross",   cur(row.empMonthGross)],
    ["Annual CTC",      `${ctcAnnual}  Per Annum`],
  ];

  d.setFillColor(...BLUE);
  d.rect(ml, ctx.y, cw, 7, "F");
  d.setFont("helvetica", "bold");
  d.setFontSize(8);
  d.setTextColor(255, 255, 255);
  d.text("Component", tl, ctx.y + 5);
  d.text("Amount (₹)", tr, ctx.y + 5, { align: "right" });
  ctx.y += 7;

  salRows.forEach(([label, val], i) => {
    const rh = 7;
    if (i % 2 === 0) { d.setFillColor(...LIGHT); d.rect(ml, ctx.y, cw, rh, "F"); }
    d.setDrawColor(220, 220, 220); d.setLineWidth(0.2); d.rect(ml, ctx.y, cw, rh);
    const isBold = label === "Annual CTC" || label === "Monthly Gross";
    d.setFont("helvetica", "normal"); d.setFontSize(8.5); d.setTextColor(...BLACK);
    d.text(label, tl, ctx.y + 5);
    d.setFont("helvetica", isBold ? "bold" : "normal");
    d.setTextColor(...(isBold ? BLUE : BLACK));
    d.text(val, tr, ctx.y + 5, { align: "right" });
    ctx.y += rh;
  });
  ctx.y += 4;

  body("b.  You are entitled to other compensation and benefits in accordance with the company policy as modified and intimated to you from time to time.", 4);
  body("c.  Your salary will be reviewed periodically as per company policy.", 4);
  body("d.  Changes in your compensation are subject to the discretion of the company and will be based on your effective performance and results during your employment.", 4);

  // ── 3. OTHER BENEFITS ────────────────────────────────────────────────────
  secHead("3.  OTHER BENEFITS");
  body("a.  Leave, holidays and working hours as applicable to your category of employees and location of posting.", 4);

  // ── 4. RESPONSIBILITIES ──────────────────────────────────────────────────
  secHead("4.  RESPONSIBILITIES");
  body("a.  In view of your position and office, you must effectively, diligently and to the best of your ability perform all responsibilities and ensure results. There may be times when you will be expected to work extra hours when the job so requires.", 4);
  body("b.  You will be required to undertake travel on company work for which you will be reimbursed for travel expenses as per the company policy applicable to you.", 4);
  body("c.  We at MosIC Solutions are committed to ensuring 'Integrity' in all aspects of its functioning. You are expected to comply with the policies of the company including the Code of Business Conduct and other policies as they form an integral part of the terms of employment.", 4);
  body("d.  Any matter or situation that could potentially result in a violation of the policies or the terms of your employment shall immediately be brought to the notice of your Business Unit Head or manager.", 4);

  // ── 5. CONFLICTS OF INTEREST ─────────────────────────────────────────────
  secHead("5.  CONFLICTS OF INTEREST");
  body("a.  You are required to engage yourself exclusively in the work assigned by MosIC Solutions and shall not take up any independent or individual assignments directly or indirectly without the express written consent of your Business Unit Head.", 4);
  body("b.  You shall ensure that you do not, directly or indirectly, engage in any activity or have any interest that is in conflict with the interests of MosIC Solutions.", 4);
  body("c.  The Conflict of Interest Policy also refers to the need on your part, during and for one year after your employment, not to solicit or encourage any employee, customer, or vendor to terminate or diminish their relationship with MosIC Solutions.", 4);

  // ── 6. CONFIDENTIALITY ───────────────────────────────────────────────────
  secHead("6.  CONFIDENTIALITY");
  body("a.  You will be required to comply with the confidentiality policy of the company and shall not use or disclose any Confidential Information except as required by law or in the course of your employment. This covenant shall endure during and after your employment.", 4);
  body("b.  In your work for MosIC Solutions, you will be expected not to use or disclose any confidential information, including trade secrets, of any former employer or other person to whom you have an obligation of confidentiality.", 4);

  // ── 7. INTELLECTUAL PROPERTY ─────────────────────────────────────────────
  secHead("7.  ASSIGNMENT OF INTELLECTUAL PROPERTY");
  body("During your tenure with the company you shall disclose and assign to MosIC Solutions as its exclusive property all developments conceived by you solely or jointly with others that are related to the company's business or that result from work you perform for the company using its equipment, supplies or facilities.", 0);

  // ── 8. NON-COMPETE ───────────────────────────────────────────────────────
  secHead("8.  NON-COMPETE");
  body("You confirm that for a period of six (6) months after separation of your employment from the company, irrespective of the circumstances of or the reason for the separation, you will not accept any offer of employment from a customer or client with whom you have interacted or worked in a professional capacity representing the company during the six (6) months preceding the date of separation.", 0);

  // ── 9. GENERAL ────────────────────────────────────────────────────────────
  secHead("9.  GENERAL");
  body("a.  We trust that you have not provided us with any false declaration or wilfully suppressed any material information. If you have, you will be liable to be removed from service without any prior notice.", 4);
  body("b.  Your employment terms may be specifically enforced legally if required. If any provisions of this Agreement are declared void or unenforceable, the remaining provisions shall continue in full force and effect.", 4);
  body("c.  These employment terms supersede and replace any existing agreement between MosIC Solutions and you relating to the same subject matter.", 4);
  body("d.  You warrant that you are not prevented by any court or administrative order from providing the service required under this agreement.", 4);

  // ── 10. NOTICE PERIOD ────────────────────────────────────────────────────
  secHead("10.  NOTICE PERIOD");
  body("This contract of employment is terminable, without reasons, by either party giving two months prior written notice. MosIC Solutions reserves the right to pay or recover salary in lieu of the notice period. The company may at its discretion relieve you from such date as it may deem fit even prior to the expiry of the notice period.");
  ctx.y += 5;
  body("Please confirm that the above terms are acceptable to you and that you accept the appointment by signing a copy of this letter of appointment.");
  ctx.y += 8;

  // ── Closing ───────────────────────────────────────────────────────────────
  ensureSpace(ctx, 70);
  d.setFont("helvetica", "normal"); d.setFontSize(9); d.setTextColor(...BLACK);
  d.text("Sincerely,",                  ml, ctx.y); ctx.y += 5;
  d.text("for MosIC Solutions Pvt Ltd", ml, ctx.y); ctx.y += 20;
  d.setFont("helvetica", "bold");
  d.text("Managing Director",           ml, ctx.y); ctx.y += 12;

  // ── Declaration box ───────────────────────────────────────────────────────
  ensureSpace(ctx, 46);
  d.setFillColor(...LIGHT);
  d.rect(ml, ctx.y, cw, 44, "F");
  d.setDrawColor(...BLUE); d.setLineWidth(0.4); d.rect(ml, ctx.y, cw, 44);
  d.setFont("helvetica", "bold"); d.setFontSize(9.5); d.setTextColor(...BLUE);
  d.text("Declaration & Acknowledgment from Employee:", ml + 3, ctx.y + 7);
  d.setFont("helvetica", "normal"); d.setFontSize(8.5); d.setTextColor(...BLACK);
  d.text("I have read, understood and agree to accept employment on the terms and conditions herein.", ml + 3, ctx.y + 14);
  d.text("I shall be reporting to duty on  :", ml + 3, ctx.y + 21);
  d.text("Name       :", ml + 3, ctx.y + 28);
  d.text("Signature  :", ml + 60, ctx.y + 28);
  d.text("Date       :", ml + 3, ctx.y + 36);
  d.text("Place      :", ml + 60, ctx.y + 36);
  ctx.y += 48;

  drawFooter(ctx);
  doc.save(`APPOINTMENT_${emp.id}_${emp.empName}_${emp.empLastName}.pdf`);
}

// ─────────────────────────────────────────────────────────────────────────────
// 2.  PAY HIKE LETTER
// ─────────────────────────────────────────────────────────────────────────────

export async function generatePayHikePDF(
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
  const { doc: d, pw, ml, cw } = ctx;

  const date    = fmtDate(letterDate) || todayDMY();
  const effDate = fmtDate(row.epEfficientDate || row.epDate) || date;
  const refNo   = `PYHK/LTR/${effDate}/${row.empId ?? emp.id}`;
  const empName = `${emp.empName} ${emp.empLastName}`;
  const addr    = [emp.empAddress1, emp.empAddress2, emp.empAddress3].filter(Boolean) as string[];

  const tds        = num(row.empTds);
  const pt         = num(row.empPt);
  const loans      = num(row.empLoans);
  const netSalary  = num(row.empMonthGross) - tds - pt - loans;

  const monthLabel = payMonth
    ? `${MONTH_NAMES[parseInt(payMonth, 10)] ?? payMonth}-${payYear ?? ""}`
    : "";

  const body = (text: string) => {
    ensureSpace(ctx, 10);
    d.setFont("helvetica", "normal"); d.setFontSize(9); d.setTextColor(...BLACK);
    const lines = d.splitTextToSize(text, cw) as string[];
    d.text(lines, ml, ctx.y);
    ctx.y += lines.length * 5 + 1;
  };

  // ── Header + title bar ────────────────────────────────────────────────────
  drawHeader(ctx);
  d.setFillColor(...BRAND_BLUE);
  d.rect(ml, ctx.y, cw, 9, "F");
  d.setFont("helvetica", "bold"); d.setFontSize(11); d.setTextColor(255, 255, 255);
  d.text(`PAY HIKE LETTER${monthLabel ? "  —  " + monthLabel : ""}`, pw / 2, ctx.y + 6.2, { align: "center" });
  ctx.y += 13;

  // ── Ref + TO + meta ───────────────────────────────────────────────────────
  ensureSpace(ctx, 50);
  d.setFont("helvetica", "normal"); d.setFontSize(8.5); d.setTextColor(...BLACK);
  d.text(`REF NO: ${refNo}`, ml, ctx.y); ctx.y += 6;

  const addrStartY = ctx.y;
  d.setFont("helvetica", "bold"); d.text("TO", ml, ctx.y); ctx.y += 5;
  d.setFont("helvetica", "normal");
  d.text(`${empName},`, ml, ctx.y); ctx.y += 5;
  addr.forEach((line) => { d.text(`${line},`, ml, ctx.y); ctx.y += 5; });

  // Right meta column
  const rx1 = pw - ml - 60, rx2 = pw - ml;
  const email = emp.empMail ?? emp.empEmail ?? "";
  const metaRows: [string, string][] = [
    ["DATE :",        date],
    ["DESIGNATION :", fmt(row.position)],
    ["EMAIL :",       email],
    ["CURRENCY :",    "INR"],
  ];
  metaRows.forEach(([label, val], i) => {
    const ry = addrStartY + i * 6;
    d.setFont("helvetica", "bold"); d.setFontSize(8); d.setTextColor(...GREY);
    d.text(label, rx1, ry);
    d.setFont("helvetica", "normal"); d.setTextColor(...BLACK);
    d.text(val, rx2, ry, { align: "right" });
  });
  ctx.y += 6;

  // ── Body paragraph ────────────────────────────────────────────────────────
  body(`DEAR ${emp.empName},`);
  ctx.y += 2;
  body("We are pleased to communicate to you that based on the Performance appraisal your salary is revised and the new monthly salary is as follows:");
  ctx.y += 4;

  // ── Payment table ─────────────────────────────────────────────────────────
  ensureSpace(ctx, 65);
  const tl = ml + 6, tr = ml + cw - 6;

  d.setFont("helvetica", "bold"); d.setFontSize(9); d.setTextColor(...BLACK);
  d.text("Payment", ml, ctx.y); ctx.y += 4;

  // Table header
  d.setFillColor(...BLUE); d.rect(ml, ctx.y, cw, 7, "F");
  d.setFont("helvetica", "bold"); d.setFontSize(8); d.setTextColor(255, 255, 255);
  d.text("Component", tl, ctx.y + 5);
  d.text("Amount (₹)", tr, ctx.y + 5, { align: "right" });
  ctx.y += 7;

  const salaryRows: [string, string, boolean][] = [
    ["FIXED PAY",            cur(row.empBasic),      false],
    ["HRA",                  cur(row.empHra),        false],
    ["OTHER ALLOWANCE",      cur(row.empAllowance),  false],
    ["Gross Monthly Salary", cur(row.empMonthGross), true ],
  ];

  salaryRows.forEach(([label, val, isBold], i) => {
    const rh = 7;
    if (i % 2 === 0) { d.setFillColor(...LIGHT); d.rect(ml, ctx.y, cw, rh, "F"); }
    d.setDrawColor(220, 220, 220); d.setLineWidth(0.2); d.rect(ml, ctx.y, cw, rh);
    d.setFont("helvetica", isBold ? "bold" : "normal");
    d.setFontSize(8.5);
    d.setTextColor(...(isBold ? BLACK : BLUE));
    d.text(label, tl, ctx.y + 5);
    d.text(val, tr, ctx.y + 5, { align: "right" });
    ctx.y += rh;
  });

  // Net salary highlighted row
  d.setFillColor(...BLUE); d.rect(ml, ctx.y, cw, 8, "F");
  d.setFont("helvetica", "bold"); d.setFontSize(9); d.setTextColor(255, 255, 255);
  d.text("Net Salary (after deductions)", tl, ctx.y + 5.5);
  d.text(cur(netSalary), tr, ctx.y + 5.5, { align: "right" });
  ctx.y += 12;

  // ── Implementation note + signing ─────────────────────────────────────────
  body(`New salary will be implemented from ${effDate} till further communication on salary revision.`);
  ctx.y += 8;
  body("With Regards,");
  ctx.y += 3;
  body("(Authorised Signatory)");
  ctx.y += 20;

  ensureSpace(ctx, 18);
  d.setDrawColor(180, 180, 180); d.setLineWidth(0.3);
  d.line(ml, ctx.y, ml + 60, ctx.y);
  ctx.y += 4;
  d.setFont("helvetica", "normal"); d.setFontSize(8); d.setTextColor(...GREY);
  d.text("Authorised Signatory", ml, ctx.y);

  drawFooter(ctx);
  doc.save(`HIKELETTER_${emp.id}_${emp.empName}_${emp.empLastName}.pdf`);
}

// ─────────────────────────────────────────────────────────────────────────────
// 3.  RELIEVING / RESIGNATION LETTER
// ─────────────────────────────────────────────────────────────────────────────

export async function generateRelievingPDF(
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
  const { doc: d, pw, ml, cw } = ctx;

  const joining   = fmtDate(joiningDate) || fmtDate(emp.empDoj) || "";
  const relieving = fmtDate(relievingDate) || todayDMY();
  const printDate = todayDMY();
  const empName   = `${emp.empName} ${emp.empLastName}`;

  // ── Header + title bar ────────────────────────────────────────────────────
  drawHeader(ctx);
  d.setFillColor(...BRAND_BLUE);
  d.rect(ml, ctx.y, cw, 9, "F");
  d.setFont("helvetica", "bold"); d.setFontSize(11); d.setTextColor(255, 255, 255);
  d.text("RELIEVING / EXPERIENCE LETTER", pw / 2, ctx.y + 6.2, { align: "center" });
  ctx.y += 13;

  // ── Date top-right ────────────────────────────────────────────────────────
  ensureSpace(ctx, 10);
  d.setFont("helvetica", "normal"); d.setFontSize(8.5); d.setTextColor(...GREY);
  d.text(`DATE : ${printDate}`, pw - ml, ctx.y, { align: "right" });
  ctx.y += 12;

  // ── "To Whomsoever" heading ───────────────────────────────────────────────
  ensureSpace(ctx, 18);
  d.setFont("helvetica", "bold"); d.setFontSize(16); d.setTextColor(...BLUE);
  d.text("TO WHOMSOEVER IT MAY CONCERN", pw / 2, ctx.y, { align: "center" });
  ctx.y += 12;

  // Decorative rule
  d.setDrawColor(...BLUE); d.setLineWidth(0.6);
  d.line(ml, ctx.y, ml + cw, ctx.y);
  ctx.y += 8;

  // ── Certification paragraph ───────────────────────────────────────────────
  ensureSpace(ctx, 30);
  d.setFont("helvetica", "normal"); d.setFontSize(11); d.setTextColor(...BLACK);

  const line1Lines = d.splitTextToSize(
    `Hereby it is certified that ${empName} has been working as`,
    cw,
  );
  d.text(line1Lines, ml, ctx.y);
  ctx.y += line1Lines.length * 7 + 4;

  const line2Lines = d.splitTextToSize(
    `${fmt(row.position) || fmt(row.department)}  from  ${joining}  to  ${relieving}.`,
    cw,
  );
  d.text(line2Lines, ml, ctx.y);
  ctx.y += line2Lines.length * 7 + 10;

  ensureSpace(ctx, 20);
  const perfLines = d.splitTextToSize(
    "During this period, his/her performance is very good and we wish him/her success for all future endeavours.",
    cw,
  );
  d.text(perfLines, ml, ctx.y);
  ctx.y += perfLines.length * 7 + 24;

  // ── Signature block ───────────────────────────────────────────────────────
  ensureSpace(ctx, 60);
  d.setFont("helvetica", "bold"); d.setFontSize(9.5); d.setTextColor(...BLACK);
  d.text("Authorised Signatory", ml, ctx.y); ctx.y += 24;
  d.setDrawColor(180, 180, 180); d.setLineWidth(0.4);
  d.line(ml, ctx.y - 18, ml + 60, ctx.y - 18);

  d.text("Director", ml, ctx.y); ctx.y += 24;
  d.line(ml, ctx.y - 18, ml + 60, ctx.y - 18);

  drawFooter(ctx);
  doc.save(`RESIGNATION_${emp.id}_${emp.empName}_${emp.empLastName}.pdf`);
}