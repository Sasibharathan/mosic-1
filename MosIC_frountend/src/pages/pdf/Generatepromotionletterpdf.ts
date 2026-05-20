/**
 * Generatepromotionletterpdf.ts
 *
 * Generates a Promotion Letter PDF (multi-page, A4).
 *
 * Justification: jsPDF has no native full-justify. We implement it by
 * computing extra word-spacing for every line except the last line of each
 * paragraph (last line stays left-aligned — standard typographic rule).
 *
 * Fix: "Rs." used instead of "₹" — Helvetica built-in does not support U+20B9.
 */

import jsPDF from "jspdf";
import {
  loadImage, makePdfCtx, drawHeader, drawFooter, ensureSpace,
  fmtDate, todayDMY, BRAND_BLUE, num,
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

export async function generatePromotionLetterPDF(
  row: EmpPositionDTO,
  emp: EmpDTO,
  prevRow?: EmpPositionDTO,
  letterDate?: string,
): Promise<void> {
  // ── Load logo ────────────────────────────────────────────────────────────
  let logoImg: HTMLImageElement | null = null;
  try {
    logoImg = await loadImage("/images/logo/logo.jpg");
  } catch {
    // logo missing — header renders without image
  }

  const doc = new jsPDF({ orientation: "portrait", unit: "mm", format: "a4" });
  const ctx = makePdfCtx(doc, logoImg);

  // ── Computed values ───────────────────────────────────────────────────────
  const date      = fmtDate(letterDate) || todayDMY();
  const effDate   = fmtDate(row.epEfficientDate || row.epDate) || date;
  const refNo     = `PRO/LTR/${effDate}/${row.empId ?? emp.id}`;
  const empName   = `${emp.empName} ${emp.empLastName}`;
  const ctcAnnual = num(row.empCtc).toLocaleString("en-IN", { minimumFractionDigits: 2 });
  const gross     = num(row.empMonthGross).toLocaleString("en-IN", { minimumFractionDigits: 2 });
  const addr      = [emp.empAddress1, emp.empAddress2, emp.empAddress3].filter(Boolean) as string[];

  const { doc: d, pw, ml, cw, mr } = ctx;

  // ── Line height formula (consistent across all helpers) ───────────────────
  const lh = (fs: number) => fs * 0.36 + 1.4;

  // ─────────────────────────────────────────────────────────────────────────
  // JUSTIFIED TEXT RENDERER
  // Splits text into wrapped lines, then for every line except the last,
  // distributes extra space evenly between words so the line reaches cw-indent.
  // The last line of each paragraph is left-aligned (typographic standard).
  // ─────────────────────────────────────────────────────────────────────────
  const bodyJustify = (text: string, indent = 0, fs = 9.5): void => {
    ensureSpace(ctx, 10);
    d.setFont("helvetica", "normal");
    d.setFontSize(fs);
    d.setTextColor(20, 20, 20);

    const maxW  = cw - indent;
    const x0    = ml + indent;
    const lines = d.splitTextToSize(text, maxW) as string[];

    lines.forEach((line: string, idx: number) => {
      ensureSpace(ctx, lh(fs) + 1);
      const isLast = idx === lines.length - 1;

      if (isLast || lines.length === 1) {
        // Last (or only) line: plain left-align
        d.text(line, x0, ctx.y);
      } else {
        // Full justify: spread words across maxW
        const words = line.trimEnd().split(" ");
        if (words.length <= 1) {
          d.text(line, x0, ctx.y);
        } else {
          const totalWordW = words.reduce(
            (sum, w) => sum + (d.getStringUnitWidth(w) * fs) / d.internal.scaleFactor,
            0,
          );
          const gap = (maxW - totalWordW) / (words.length - 1);
          let xCur = x0;
          words.forEach((word) => {
            d.text(word, xCur, ctx.y);
            xCur += (d.getStringUnitWidth(word) * fs) / d.internal.scaleFactor + gap;
          });
        }
      }
      ctx.y += lh(fs);
    });
    ctx.y += 1; // paragraph bottom margin
  };

  // ─────────────────────────────────────────────────────────────────────────
  // SECTION HEADING
  // Bold 11 pt, left-aligned (headings are never justified).
  // ─────────────────────────────────────────────────────────────────────────
  const secHead = (text: string): void => {
    ensureSpace(ctx, 14);
    ctx.y += 4;
    d.setFont("helvetica", "bold");
    d.setFontSize(11);
    d.setTextColor(20, 20, 20);
    d.text(text, ml, ctx.y);
    ctx.y += 6;
  };

  // ═══════════════════════════════════════════════════════════════════════════
  // PAGE CONTENT
  // ═══════════════════════════════════════════════════════════════════════════

  // ── Company header ────────────────────────────────────────────────────────
  drawHeader(ctx);

  // ── Title bar ─────────────────────────────────────────────────────────────
  d.setFillColor(...BRAND_BLUE);
  d.rect(ml, ctx.y, cw, 9, "F");
  d.setFont("helvetica", "bold");
  d.setFontSize(11);
  d.setTextColor(255, 255, 255);
  d.text("PROMOTION LETTER", pw / 2, ctx.y + 6.2, { align: "center" });
  ctx.y += 13;

  // ── Ref No + Date ─────────────────────────────────────────────────────────
  ensureSpace(ctx, 10);
  d.setFont("helvetica", "italic");
  d.setFontSize(9);
  d.setTextColor(20, 20, 20);
  d.text(`Ref No: ${refNo}`, ml, ctx.y);
  d.setFont("helvetica", "normal");
  d.text(`Date : ${date}`, pw - mr, ctx.y, { align: "right" });
  ctx.y += 8;

  // ── TO block (left-aligned — address is never justified) ──────────────────
  ensureSpace(ctx, 30);
  d.setFont("helvetica", "normal");
  d.setFontSize(9.5);
  d.setTextColor(20, 20, 20);
  d.text("To,", ml, ctx.y);         ctx.y += 5;
  d.text(`${empName},`, ml, ctx.y); ctx.y += 5;
  addr.forEach((line) => { d.text(line, ml, ctx.y); ctx.y += 5; });
  ctx.y += 4;

  // ── Salutation (left-aligned) ─────────────────────────────────────────────
  ensureSpace(ctx, 8);
  d.setFont("helvetica", "normal");
  d.setFontSize(9.5);
  d.setTextColor(20, 20, 20);
  d.text(`Dear ${empName},`, ml, ctx.y);
  ctx.y += lh(9.5) + 2;

  // ── Subject line (centred, bold) ──────────────────────────────────────────
  ensureSpace(ctx, 12);
  d.setFont("helvetica", "bold");
  d.setFontSize(14);
  d.setTextColor(20, 20, 20);
  d.text("Sub: Letter of Promotion", pw / 2, ctx.y, { align: "center" });
  ctx.y += 10;

  // ── Opening paragraph (justified) ────────────────────────────────────────
  const prevPos = prevRow?.position ? ` from the position of ${prevRow.position}` : "";
  bodyJustify(
    `It is our pleasure to inform you that based on your consistent performance and valued contributions ` +
    `to MosIC Solutions Pvt Ltd, you have been promoted${prevPos} to the position of ` +
    `${row.position ?? ""} in the ${row.department ?? ""} department, effective from ${effDate}. ` +
    `Please note that the employment terms contained in this letter are subject to the company policy.`
  );

  // ═══════════════════════════════════════════════════════════════════════════
  // 1. PROMOTION DETAILS
  // ═══════════════════════════════════════════════════════════════════════════
  secHead("1. PROMOTION DETAILS");
  bodyJustify(`1. Your new designation is ${row.position ?? ""}, effective from ${effDate}.`);
  if (prevRow?.position) {
    bodyJustify(`2. Your previous designation was ${prevRow.position}.`);
  }
  const n = prevRow?.position ? 3 : 2;
  bodyJustify(
    `${n}. You will be liable to be transferred in such capacity as the company may from time to time ` +
    `determine to any other location, department, function, establishment, or branch of the company or ` +
    `its subsidiary, associate or affiliate company. In such case you will be governed by the terms and ` +
    `conditions of service applicable to the new assignment.`
  );
  bodyJustify(`${n + 1}. The age of retirement is 58 years.`);

  // ═══════════════════════════════════════════════════════════════════════════
  // 2. REVISED COMPENSATION
  // ═══════════════════════════════════════════════════════════════════════════
  secHead("2. REVISED COMPENSATION");
  bodyJustify("You will be eligible to receive the following revised compensation:");
  bodyJustify(`a. Annual pay (CTC) of Rs. ${ctcAnnual} per annum.`, 8);
  bodyJustify(`b. Monthly gross salary of Rs. ${gross}.`, 8);
  bodyJustify(
    "c. You are entitled to other compensation and benefits in accordance with the company policy " +
    "as modified and intimated to you from time to time.", 8
  );
  bodyJustify("d. Your salary will be reviewed periodically as per company policy.", 8);
  bodyJustify(
    "e. Changes in your compensation are subject to the discretion of the company and will be on " +
    "the basis of your effective performance and results during your employment and other relevant criteria.", 8
  );
  if (prevRow?.empCtc && num(prevRow.empCtc) > 0) {
    const prevCtc = num(prevRow.empCtc).toLocaleString("en-IN", { minimumFractionDigits: 2 });
    bodyJustify(`f. Your previous annual CTC was Rs. ${prevCtc} per annum.`, 8);
  }

  // ═══════════════════════════════════════════════════════════════════════════
  // 3. OTHER BENEFITS
  // ═══════════════════════════════════════════════════════════════════════════
  secHead("3. OTHER BENEFITS");
  bodyJustify("You will continue to be entitled to the following:");
  bodyJustify(
    "a. Leave, holidays and working hours as applicable to your category of employees and location of posting.", 8
  );

  // ═══════════════════════════════════════════════════════════════════════════
  // 4. RESPONSIBILITIES
  // ═══════════════════════════════════════════════════════════════════════════
  secHead("4. RESPONSIBILITIES");
  bodyJustify(
    "a. In view of your new position and office, you must effectively, diligently and to the best of " +
    "your ability perform all responsibilities and ensure results. There may be times when you will be " +
    "expected to work extra hours to achieve the above when the job so requires."
  );
  bodyJustify(
    "b. You will be required to undertake travel on company work for which you will be reimbursed for " +
    "travel expenses as per the company policy applicable to you."
  );
  bodyJustify(
    "c. We at MosIC Solutions are committed to ensuring 'Integrity' in all aspects of its functioning. " +
    "You are expected to comply with the policies of the company including the Code of Business Conduct " +
    "and other policies as they form an integral part of the terms of employment."
  );
  bodyJustify(
    "d. Any matter or situation or incident that could potentially result in a violation of the policies " +
    "or the terms of your employment shall immediately be brought to the notice of your Business Unit Head or manager."
  );

  // ═══════════════════════════════════════════════════════════════════════════
  // 5. CONFLICTS OF INTEREST
  // ═══════════════════════════════════════════════════════════════════════════
  secHead("5. CONFLICTS OF INTEREST");
  bodyJustify(
    "a. You are required to engage yourself exclusively in the work assigned by MosIC Solutions and shall " +
    "not take up any independent or individual assignments without the express written consent of your Business Unit Head."
  );
  bodyJustify(
    "b. You shall ensure that you shall not, directly or indirectly, engage in any activity or have any " +
    "interest that is in conflict with the interests of MosIC Solutions."
  );
  bodyJustify(
    "c. The Conflict of Interest Policy also refers to the need on your part, during your employment and " +
    "for a period of one year from the cessation of your employment with MosIC Solutions (irrespective of " +
    "the circumstances of, or the reasons for, the cessation) not to solicit, induce or encourage:"
  );
  bodyJustify(
    "i.   Any employee of MosIC Solutions to terminate their employment with MosIC Solutions or to accept " +
    "employment with any competitor, supplier or any customer with whom you have a connection.", 16
  );
  bodyJustify(
    "ii.  Any customer or vendor of MosIC Solutions to move his existing business with MosIC Solutions " +
    "to a third party or to terminate his business relationship with MosIC Solutions.", 16
  );
  bodyJustify(
    "iii. Any existing employee to become associated with, or perform services of any type for, any third party.", 16
  );
  bodyJustify(
    "d. In case of any conflict or doubt, please discuss the matter with your Business Unit Head to " +
    "understand the position of MosIC Solutions and resolve the conflict."
  );

  // ═══════════════════════════════════════════════════════════════════════════
  // 6. CONFIDENTIALITY
  // ═══════════════════════════════════════════════════════════════════════════
  secHead("6. CONFIDENTIALITY");
  bodyJustify(
    "a. In consideration of the opportunities, training and access to new techniques and know-how that " +
    "will be made available to you, you will be required to comply with the confidentiality policy of the " +
    "company. Therefore, please ensure that you keep secret and confidential all Confidential Information " +
    "(as defined from time to time in the Confidentiality Policy of the company) and shall not use or " +
    "disclose any such information except as may be required under obligation of law or as may be required " +
    "in the course of your employment. This covenant shall endure during your employment irrespective of " +
    "the circumstances of, or the reasons for, the cessation."
  );
  bodyJustify(
    "b. In your work for MosIC Solutions, you will be expected not to use or disclose any confidential " +
    "information, including trade secrets, of any former employer or other person with whom you have an " +
    "obligation of confidentiality. By signing below you affirm that you have no conflicting obligations " +
    "or non-compete agreements that would prevent you from working without limitation for MosIC Solutions."
  );

  // ═══════════════════════════════════════════════════════════════════════════
  // 7. ASSIGNMENT OF INTELLECTUAL PROPERTY
  // ═══════════════════════════════════════════════════════════════════════════
  secHead("7. ASSIGNMENT OF INTELLECTUAL PROPERTY");
  bodyJustify(
    "During your tenure with the company you shall disclose and assign to MosIC Solutions as its exclusive " +
    "property all developments developed or conceived by you solely or jointly with others that are related " +
    "to the company's business or that result from work that you perform for the company or using the " +
    "company's equipment, supplies or facilities, and shall comply with company policy."
  );

  // ═══════════════════════════════════════════════════════════════════════════
  // 8. NON-COMPETE
  // ═══════════════════════════════════════════════════════════════════════════
  secHead("8. NON-COMPETE");
  bodyJustify(
    "In the course of your employment with the company you will be providing services to customers or " +
    "clients of the company during which process you would be handling sensitive information including but " +
    "not limited to key customers of the company, competitor information, customer sensitive information " +
    "('Confidential Information'). You acknowledge and recognise that confidential information available " +
    "to you, if leaked, would cause irreparable harm to the company and its protection is of utmost importance."
  );
  bodyJustify(
    "You confirm that for a period of six (6) months after separation of your employment from the company " +
    "(irrespective of the circumstances of or the reason for the separation), you will not accept any offer " +
    "of employment from a customer or client with whom you have interacted or worked in a professional " +
    "capacity representing the company during the six (6) months preceding the date of separation."
  );

  // ═══════════════════════════════════════════════════════════════════════════
  // 9. GENERAL
  // ═══════════════════════════════════════════════════════════════════════════
  secHead("9. GENERAL");
  bodyJustify(
    "a. We trust that you have not provided us with any false declaration or wilfully suppressed any " +
    "material information. If you have, you will be liable to be removed from service without any prior " +
    "notice. Please note that you are required to inform us if there are any agreements, oral or written, " +
    "which you have entered into and which may relate to or affect your commitments under this agreement."
  );
  bodyJustify(
    "b. Your employment terms may be specifically enforced legally if required. In this connection, if " +
    "any of the provisions of this Agreement are declared or found to be void or unenforceable due to any " +
    "reason whatsoever, the remaining provisions of this Agreement shall continue in full force and effect."
  );
  bodyJustify(
    "c. These employment terms supersede and replace any existing agreement or understanding between " +
    "MosIC Solutions and you relating to the same subject matter."
  );
  bodyJustify(
    "d. You warrant that you are not prevented by a court or by any other administrative or judicial order " +
    "from providing the service required under this agreement. In the event that you are not a citizen of " +
    "the country of posting, you should have a valid work permit to work in the country of posting."
  );

  // ═══════════════════════════════════════════════════════════════════════════
  // 10. NOTICE PERIOD
  // ═══════════════════════════════════════════════════════════════════════════
  secHead("10. NOTICE PERIOD");
  bodyJustify(
    "This contract of employment is terminable, without reasons, by either party giving two months prior " +
    "written notice. MosIC Solutions reserves the right to pay or recover salary in lieu of notice period. " +
    "Further, the company may at its discretion relieve you from such date as it may deem fit even prior " +
    "to the expiry of the notice period. However, if the management desires the employee to continue the " +
    "employment during the notice period, the employee shall do so."
  );

  ctx.y += 6;
  bodyJustify(
    "Please confirm that the above terms are acceptable to you and that you accept this promotion by " +
    "signing a copy of this letter."
  );
  ctx.y += 8;

  // ── Closing / signature block (left-aligned — never justified) ────────────
  ensureSpace(ctx, 60);
  d.setFont("helvetica", "normal");
  d.setFontSize(9.5);
  d.setTextColor(20, 20, 20);
  d.text("Sincerely,",                  ml, ctx.y); ctx.y += 5;
  d.text("for MosIC Solutions Pvt Ltd", ml, ctx.y); ctx.y += 22;
  d.text("Managing Director",           ml, ctx.y); ctx.y += 16;

  // ── Declaration & Acknowledgment (left-aligned) ───────────────────────────
  ensureSpace(ctx, 60);
  d.setFont("helvetica", "bold");
  d.setFontSize(12);
  d.text("Declaration & Acknowledgment from Employee:", ml, ctx.y); ctx.y += 8;
  d.setFont("helvetica", "normal");
  d.setFontSize(9.5);
  d.text(
    "I have read, understood and agree to accept this promotion on the terms and conditions herein.",
    ml, ctx.y
  ); ctx.y += 8;
  d.text("I shall be reporting to duty on  ___________________________", ml, ctx.y); ctx.y += 10;
  d.text("Name      :  ___________________________", ml, ctx.y); ctx.y += 9;
  d.text("Signature :  ___________________________", ml, ctx.y); ctx.y += 9;
  d.text("Date      :  ___________________________", ml, ctx.y); ctx.y += 9;
  d.text("Place     :  ___________________________", ml, ctx.y);

  // ── Footer ────────────────────────────────────────────────────────────────
  drawFooter(ctx);

  doc.save(`${Date.now()}-PROMOTION_${emp.id}_${emp.empName}_${emp.empLastName}.pdf`);
}