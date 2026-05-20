import { useState } from "react";
import PageMeta from "../../components/common/PageMeta";
import PageBreadcrumb from "../../components/common/PageBreadCrumb";
import ComponentCard from "../../components/common/ComponentCard";
import { generateAppointmentPDF } from "../pdf/Generateappointmentpdf";
import { generateHikeLetterPDF }  from "../pdf/Generatehikeletterpdf";
import { generateResignationPDF } from "../pdf/Generateresignationpdf";
import { generatePromotionLetterPDF } from "../pdf/Generatepromotionletterpdf";

// ─── Re-use exported types from main page ─────────────────────────────────────
import type { EmpPositionDTO, EmpDTO } from "./EmpPositionPage";

// ─── Props ────────────────────────────────────────────────────────────────────

type Props = {
  empId: number;
  employees: EmpDTO[];
  rows: EmpPositionDTO[];   // all position rows for all employees
  onBack: () => void;
};

// ─── Helpers ──────────────────────────────────────────────────────────────────

const fmt = (v: string | number | null | undefined) =>
  v && Number(v) > 0 ? `₹ ${Number(v).toLocaleString("en-IN")}` : "—";

const fmtDate = (d: string | null | undefined) => {
  if (!d) return "—";
  const parts = d.includes("-") ? d.split("-") : d.split("/");
  if (parts.length !== 3) return d;
  if (parts[0].length === 2) return d;
  const [y, m, day] = parts;
  return `${day}-${m}-${y}`;
};

const todayISO = () => new Date().toISOString().slice(0, 10);

// ─── PDF Preview / Download ───────────────────────────────────────────────────

type PdfMode = "preview" | "download";

const runWithPdfPreview = (fn: () => void, mode: PdfMode) => {
  if (mode === "download") { fn(); return; }
  const jsPDFClass = (window as any).jspdf?.jsPDF ?? (window as any).jsPDF ?? null;
  if (jsPDFClass) {
    const orig = jsPDFClass.prototype.save;
    jsPDFClass.prototype.save = function (filename: string) {
      const blob = this.output("blob");
      const url  = URL.createObjectURL(blob);
      const tab  = window.open(url, "_blank");
      setTimeout(() => URL.revokeObjectURL(url), 60_000);
      if (!tab) orig.call(this, filename);  // popup blocked → fallback
      jsPDFClass.prototype.save = orig;
    };
    fn();
  } else {
    fn();
  }
};

// ─── Status Badge ─────────────────────────────────────────────────────────────

const StatusBadge = ({ status }: { status: string }) => {
  const isActive = status === "1" || status === "ACTIVE";
  return (
    <span className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-xs font-medium ${
      isActive
        ? "bg-green-50 text-green-700 dark:bg-green-500/10 dark:text-green-400"
        : "bg-gray-100 text-gray-500 dark:bg-gray-700 dark:text-gray-400"
    }`}>
      <span className={`size-1.5 rounded-full ${isActive ? "bg-green-500" : "bg-gray-400"}`} />
      {isActive ? "Active" : "Inactive"}
    </span>
  );
};

// ─── Info Row (label + value) ─────────────────────────────────────────────────

const InfoRow = ({ label, value }: { label: string; value: string }) => (
  <div className="flex flex-col gap-0.5">
    <span className="text-[10px] font-semibold uppercase tracking-wider text-gray-400 dark:text-gray-500">
      {label}
    </span>
    <span className="text-sm font-medium text-gray-700 dark:text-gray-200">{value || "—"}</span>
  </div>
);

// ─── Salary Card ──────────────────────────────────────────────────────────────

const SalaryCard = ({ label, value, highlight = false, accent = false }: {
  label: string; value: string; highlight?: boolean; accent?: boolean;
}) => (
  <div className={`rounded-lg border px-3 py-2.5 ${
    highlight && accent
      ? "border-brand-200 bg-brand-50 dark:border-brand-800 dark:bg-brand-500/10"
      : highlight
      ? "border-gray-200 bg-gray-100 dark:border-gray-600 dark:bg-gray-700/50"
      : "border-gray-100 bg-white dark:border-gray-700 dark:bg-gray-800/50"
  }`}>
    <p className="mb-0.5 text-[10px] font-semibold uppercase tracking-wider text-gray-400">{label}</p>
    <p className={`text-sm font-semibold ${
      highlight && accent
        ? "text-brand-700 dark:text-brand-300"
        : highlight
        ? "text-gray-700 dark:text-gray-100"
        : "text-gray-600 dark:text-gray-300"
    }`}>
      {value}
    </p>
  </div>
);

// ─── Letter Bar ───────────────────────────────────────────────────────────────

const LetterBar = ({
  row, emp, allPositions,
}: {
  row: EmpPositionDTO;
  emp: EmpDTO;
  allPositions: EmpPositionDTO[];
}) => {
  const [letterDate, setLetterDate] = useState(todayISO());

  const joiningDate = () => {
    const first = [...allPositions]
      .filter((p) => p.empId === emp.id)
      .sort((a, b) => (a.id ?? 0) - (b.id ?? 0))[0];
    return first?.epEfficientDate ?? first?.epDate ?? emp.empDoj ?? "";
  };

  // Sort all positions for this employee oldest→newest to determine if this row is the first
  const sortedPositions = [...allPositions]
    .filter((p) => p.empId === emp.id)
    .sort((a, b) => (a.id ?? 0) - (b.id ?? 0));
  const isFirstPosition = sortedPositions.length === 0 || sortedPositions[0].id === row.id;

  // Previous position (for promotion letter hike comparison)
  const prevPosition = !isFirstPosition
    ? sortedPositions[sortedPositions.indexOf(sortedPositions.find((p) => p.id === row.id)!) - 1]
    : undefined;

  const letters = [
    // First position → Offer Letter; any subsequent position → Promotion Letter
    isFirstPosition
      ? {
          key: "offer",
          label: "Offer Letter",
          icon: (
            <svg className="size-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}>
              <path d="M14 2H6a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V8z" />
              <polyline points="14 2 14 8 20 8" />
            </svg>
          ),
          generate: () => generateAppointmentPDF(row, emp, letterDate),
        }
      : {
          key: "promotion",
          label: "Promotion Letter",
          icon: (
            <svg className="size-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}>
              <path d="M5 15l7-7 7 7" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
          ),
          generate: () => generatePromotionLetterPDF(row, emp, prevPosition, letterDate),
        },
    {
      key: "hike",
      label: "Pay Hike",
      icon: (
        <svg className="size-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}>
          <polyline points="23 6 13.5 15.5 8.5 10.5 1 18" />
          <polyline points="17 6 23 6 23 12" />
        </svg>
      ),
      generate: () => generateHikeLetterPDF(row, emp, undefined, undefined, letterDate),
    },
    {
      key: "relieving",
      label: "Relieving",
      icon: (
        <svg className="size-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}>
          <path d="M9 21H5a2 2 0 01-2-2V5a2 2 0 012-2h4" />
          <polyline points="16 17 21 12 16 7" />
          <line x1="21" y1="12" x2="9" y2="12" />
        </svg>
      ),
      generate: () => generateResignationPDF(row, emp, joiningDate(), letterDate),
    },
  ];

  return (
    <div className="flex flex-wrap items-center gap-2">
      {/* Date picker — first, clearly labelled */}
      <div className="flex items-center gap-1.5 rounded border border-gray-300 bg-white px-2 py-1.5 shadow-sm dark:border-gray-600 dark:bg-gray-800">
        <svg className="size-3.5 shrink-0 text-gray-400" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.8}>
          <rect x="3" y="4" width="18" height="18" rx="2" ry="2" />
          <line x1="16" y1="2" x2="16" y2="6" />
          <line x1="8" y1="2" x2="8" y2="6" />
          <line x1="3" y1="10" x2="21" y2="10" />
        </svg>
        <span className="text-[10px] font-medium text-gray-400 pr-1">Letter Date</span>
        <input
          type="date"
          value={letterDate}
          onChange={(e) => setLetterDate(e.target.value)}
          className="h-6 w-32 bg-transparent text-xs text-gray-700 outline-none dark:text-gray-200"
        />
      </div>

      <span className="h-5 w-px bg-gray-200 dark:bg-gray-700" />

      {/* Each letter: [icon + label + eye] | [↓] */}
      {letters.map(({ key, label, icon, generate }) => (
        <div key={key} className="flex overflow-hidden rounded border border-gray-200 shadow-sm dark:border-gray-700">
          {/* Preview in browser tab */}
          <button
            type="button"
            onClick={() => runWithPdfPreview(generate, "preview")}
            title={`Preview ${label} in browser`}
            className="inline-flex items-center gap-1.5 bg-white px-3 py-1.5 text-xs font-medium text-gray-700 hover:bg-gray-50 dark:bg-gray-800 dark:text-gray-200 dark:hover:bg-gray-700"
          >
            {icon}
            {label}
            <svg className="size-3 text-gray-400" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}>
              <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z" />
              <circle cx="12" cy="12" r="3" />
            </svg>
          </button>
          {/* Divider */}
          <span className="w-px bg-gray-200 dark:bg-gray-700" />
          {/* Download to disk */}
          <button
            type="button"
            onClick={() => runWithPdfPreview(generate, "download")}
            title={`Download ${label}`}
            className="flex items-center justify-center bg-white px-2 py-1.5 text-gray-400 hover:bg-gray-50 hover:text-gray-600 dark:bg-gray-800 dark:hover:bg-gray-700 dark:hover:text-gray-200"
          >
            <svg className="size-3" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}>
              <path d="M21 15v4a2 2 0 01-2 2H5a2 2 0 01-2-2v-4" strokeLinecap="round" />
              <polyline points="7 10 12 15 17 10" strokeLinecap="round" strokeLinejoin="round" />
              <line x1="12" y1="15" x2="12" y2="3" strokeLinecap="round" />
            </svg>
          </button>
        </div>
      ))}
    </div>
  );
};

// ─── Position Record Card (expandable) ───────────────────────────────────────

const PositionCard = ({
  row, emp, allPositions, label, isCurrent,
}: {
  row: EmpPositionDTO;
  emp: EmpDTO;
  allPositions: EmpPositionDTO[];
  label: string;
  isCurrent: boolean;
}) => {
  const [open, setOpen] = useState(isCurrent);

  return (
    <div className={`rounded-xl border overflow-hidden ${
      isCurrent
        ? "border-brand-200 dark:border-brand-800"
        : "border-gray-200 dark:border-gray-700"
    }`}>
      {/* Header — always visible */}
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className={`flex w-full items-center gap-3 px-4 py-3 text-left transition-colors ${
          isCurrent
            ? "bg-brand-50/60 hover:bg-brand-50 dark:bg-brand-500/5 dark:hover:bg-brand-500/10"
            : "bg-white hover:bg-gray-50 dark:bg-transparent dark:hover:bg-gray-800/30"
        }`}
      >
        {/* Step dot */}
        <span className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-xs font-bold ${
          isCurrent
            ? "bg-brand-500 text-white"
            : "bg-gray-100 text-gray-400 dark:bg-gray-700 dark:text-gray-500"
        }`}>
          {isCurrent ? (
            <svg className="size-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2.5}>
              <polyline points="20 6 9 17 4 12" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
          ) : (
            <svg className="size-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}>
              <circle cx="12" cy="12" r="9" />
              <polyline points="12 8 12 12 14 14" strokeLinecap="round" />
            </svg>
          )}
        </span>

        <div className="flex-1 min-w-0">
          <div className="flex flex-wrap items-center gap-2">
            <span className={`text-sm font-semibold ${isCurrent ? "text-brand-700 dark:text-brand-300" : "text-gray-500 dark:text-gray-400"}`}>
              {label}
            </span>
            {isCurrent && <StatusBadge status={row.activeStatus} />}
            <span className="text-sm text-gray-600 dark:text-gray-300">{row.position || "—"}</span>
            {row.department && (
              <span className="rounded bg-gray-100 px-1.5 py-0.5 text-[10px] text-gray-500 dark:bg-gray-700 dark:text-gray-400">
                {row.department}
              </span>
            )}
            {row.role && (
              <span className="rounded bg-gray-100 px-1.5 py-0.5 text-[10px] text-gray-500 dark:bg-gray-700 dark:text-gray-400">
                {row.role}
              </span>
            )}
          </div>
          <p className="mt-0.5 text-xs text-gray-400 dark:text-gray-500">
            Eff: {fmtDate(row.epEfficientDate)}
            {row.reportingTo && <> · Reports to: {row.reportingTo}</>}
          </p>
        </div>

        <svg className={`size-4 shrink-0 text-gray-400 transition-transform ${open ? "rotate-180" : ""}`}
          viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}>
          <polyline points="6 9 12 15 18 9" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
      </button>

      {/* Expanded body */}
      {open && (
        <div className={`border-t px-4 pb-5 pt-4 space-y-5 ${
          isCurrent
            ? "border-brand-100 bg-white dark:border-brand-900 dark:bg-transparent"
            : "border-gray-100 bg-gray-50/40 dark:border-gray-700 dark:bg-gray-800/10"
        }`}>
          {/* Position meta grid */}
          <div>
            <p className="mb-3 text-[10px] font-semibold uppercase tracking-widest text-gray-400">Position Details</p>
            <div className="grid grid-cols-2 gap-x-6 gap-y-3 sm:grid-cols-3 lg:grid-cols-4">
              <InfoRow label="Position Date"  value={fmtDate(row.epDate)} />
              <InfoRow label="Effective Date" value={fmtDate(row.epEfficientDate)} />
              <InfoRow label="Department"     value={row.department} />
              <InfoRow label="Role Level"     value={row.role} />
              <InfoRow label="Reporting To"   value={row.reportingTo} />
              <InfoRow label="Record ID"      value={String(row.id ?? "—")} />
            </div>
          </div>

          {/* Salary */}
          <div>
            <p className="mb-2 text-[10px] font-semibold uppercase tracking-widest text-gray-400">Earnings</p>
            <div className="grid grid-cols-2 gap-2 sm:grid-cols-4 mb-3">
              <SalaryCard label="Basic"         value={fmt(row.empBasic)} />
              <SalaryCard label="HRA"           value={fmt(row.empHra)} />
              <SalaryCard label="Allowance"     value={fmt(row.empAllowance)} />
              <SalaryCard label="Monthly Gross" value={fmt(row.empMonthGross)} highlight accent={isCurrent} />
            </div>
            <p className="mb-2 text-[10px] font-semibold uppercase tracking-widest text-gray-400">Deductions & CTC</p>
            <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
              <SalaryCard label="TDS"        value={fmt(row.empTds)} />
              <SalaryCard label="PT"         value={fmt(row.empPt)} />
              <SalaryCard label="Loans"      value={fmt(row.empLoans)} />
              <SalaryCard label="Annual CTC" value={fmt(row.empCtc)} highlight accent={isCurrent} />
            </div>
          </div>

          {/* Letter generation */}
          <div>
            <p className="mb-2 text-[10px] font-semibold uppercase tracking-widest text-gray-400">
              Generate Letters
            </p>
            <LetterBar row={row} emp={emp} allPositions={allPositions} />
          </div>
        </div>
      )}
    </div>
  );
};

// ─── Main Export ──────────────────────────────────────────────────────────────

export default function EmpPositionDetailPage({ empId, employees, rows, onBack }: Props) {
  const emp = employees.find((e) => e.id === empId);

  // Employee not found fallback
  if (!emp) {
    return (
      <div className="flex flex-col items-center justify-center gap-4 py-24 text-gray-400">
        <svg className="size-10 text-gray-300" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.5}>
          <circle cx="12" cy="8" r="4" />
          <path d="M4 20c0-4 3.6-7 8-7s8 3 8 7" strokeLinecap="round" />
        </svg>
        <p className="text-sm">Employee not found.</p>
        <button type="button" onClick={onBack}
          className="inline-flex items-center gap-1.5 rounded-lg border border-gray-300 px-4 py-2 text-sm text-gray-600 hover:bg-gray-50">
          <svg className="size-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}>
            <path d="M19 12H5M12 19l-7-7 7-7" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
          Back to Positions
        </button>
      </div>
    );
  }

  // All position records for this employee, newest first
  const empRows = [...rows]
    .filter((r) => r.empId === empId)
    .sort((a, b) => (b.id ?? 0) - (a.id ?? 0));

  const initials = `${emp.empName?.[0] ?? ""}${emp.empLastName?.[0] ?? ""}`.toUpperCase();
  const currentRow = empRows[0];

  return (
    <>
      <PageMeta
        title={`${emp.empName} ${emp.empLastName} — Position Details`}
        description="Employee full position, salary history and letter generation"
      />
      <PageBreadcrumb
        items={[
          { label: "Employees", path: "/employees" },
          { label: "Positions", path: "/employees/positions" },
          { label: `${emp.empName} ${emp.empLastName}` },
        ]}
      />

      <ComponentCard
        title={`${emp.empName} ${emp.empLastName}`}
        desc="Full employee details, position history, salary breakdown and letter generation"
        headerRight={
          /* ── BACK BUTTON — always visible top-right ── */
          <button
            type="button"
            onClick={onBack}
            className="inline-flex items-center gap-1.5 rounded-lg border border-gray-300 px-3 py-2 text-sm font-medium text-gray-600 hover:bg-gray-100 dark:border-gray-700 dark:text-gray-300 dark:hover:bg-gray-800"
          >
            <svg className="size-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}>
              <path d="M19 12H5M12 19l-7-7 7-7" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
            Back to Positions
          </button>
        }
      >

        {/* ── Top Back Button ── */}
        <div className="mb-4">
          <button
            type="button"
            onClick={onBack}
            className="inline-flex items-center gap-1.5 rounded-lg border border-gray-300 px-4 py-2 text-sm font-medium text-gray-600 hover:bg-gray-100 dark:border-gray-700 dark:text-gray-300 dark:hover:bg-gray-800"
          >
            <svg className="size-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}>
              <path d="M19 12H5M12 19l-7-7 7-7" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
            Back to Positions
          </button>
        </div>

        {/* ── A — Employee Identity Card ── */}
        <div className="mb-6 rounded-xl border border-gray-200 bg-gray-50 dark:border-gray-700 dark:bg-gray-800/40">
          <div className="flex items-start gap-4 p-5">
            <div className="flex h-14 w-14 shrink-0 items-center justify-center rounded-full bg-brand-500 text-base font-bold text-white">
              {initials}
            </div>
            <div className="flex-1 min-w-0">
              <div className="flex flex-wrap items-center gap-2 mb-1">
                <h2 className="text-lg font-semibold text-gray-800 dark:text-white">
                  {emp.empName} {emp.empLastName}
                </h2>
                {currentRow && <StatusBadge status={currentRow.activeStatus} />}
                <span className="rounded bg-brand-100 px-2 py-0.5 text-xs font-semibold text-brand-700 dark:bg-brand-500/20 dark:text-brand-300">
                  #{emp.id}
                </span>
              </div>

              <div className="grid grid-cols-1 gap-x-8 gap-y-2 sm:grid-cols-2 lg:grid-cols-3 mt-3">
                {[
                  { label: "Email",          value: emp.empEmail ?? emp.empMail ?? "" },
                  { label: "Phone",          value: emp.empPhone ?? emp.empPh ?? "" },
                  { label: "Date of Joining",value: fmtDate(emp.empDoj) },
                  { label: "Address Line 1", value: emp.empAddress1 ?? "" },
                  { label: "Address Line 2", value: emp.empAddress2 ?? "" },
                  { label: "Address Line 3", value: emp.empAddress3 ?? "" },
                ].map(({ label, value }) =>
                  value ? <InfoRow key={label} label={label} value={value} /> : null
                )}
              </div>
            </div>
            <div className="shrink-0 text-right text-xs text-gray-400">
              <p className="font-medium">{empRows.length} position record{empRows.length !== 1 ? "s" : ""}</p>
            </div>
          </div>
        </div>

        {/* ── B — No records ── */}
        {empRows.length === 0 && (
          <div className="rounded-xl border border-dashed border-gray-300 py-14 text-center text-sm text-gray-400 dark:border-gray-700">
            No position records found for this employee.
          </div>
        )}

        {/* ── C — Timeline: Current → Previous 1 → Previous 2 … ── */}
        {empRows.length > 0 && (
          <div className="relative">
            {/* Vertical timeline connector */}
            {empRows.length > 1 && (
              <div className="absolute left-[19px] top-8 bottom-8 w-px bg-gray-200 dark:bg-gray-700 pointer-events-none" />
            )}

            <div className="space-y-3">
              {empRows.map((row, idx) => (
                <PositionCard
                  key={row.id ?? idx}
                  row={row}
                  emp={emp}
                  allPositions={rows}
                  label={idx === 0 ? "Current" : `Previous ${idx}`}
                  isCurrent={idx === 0}
                />
              ))}
            </div>
          </div>
        )}

        {/* ── D — Back button repeated at bottom for all pages ── */}
        <div className="mt-6 pt-4 border-t border-gray-100 dark:border-gray-800">
          <button
            type="button"
            onClick={onBack}
            className="inline-flex items-center gap-1.5 rounded-lg border border-gray-300 px-4 py-2 text-sm font-medium text-gray-600 hover:bg-gray-100 dark:border-gray-700 dark:text-gray-300 dark:hover:bg-gray-800"
          >
            <svg className="size-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}>
              <path d="M19 12H5M12 19l-7-7 7-7" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
            Back to Positions
          </button>
        </div>
      </ComponentCard>
    </>
  );
}