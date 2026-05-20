import { type FormEvent, useCallback, useEffect, useState } from "react";
import PageMeta from "../../components/common/PageMeta";
import PageBreadcrumb from "../../components/common/PageBreadCrumb";
import ComponentCard from "../../components/common/ComponentCard";
import Label from "../../components/form/Label";
import Input from "../../components/form/input/InputField";
import {
  Table,
  TableBody,
  TableCell,
  TableHeader,
  TableRow,
} from "../../components/ui/table";
import { Modal } from "../../components/ui/modal";
import axiosInstance from "../../utils/axiosInstance";
import { generatePayslipPDF } from "../pdf/Generatepayslippdf";

// ─────────────────────────────────────────────────────────────────────────────
// CONSTANTS & STYLES
// ─────────────────────────────────────────────────────────────────────────────

const PAYSLIP_URL = "/api/payslips";
const EMP_URL     = "/api/employees";
const EMP_POS_URL = "/api/emp-position";

const selectClass =
  "h-10 w-full rounded-lg border border-gray-300 bg-white px-3 text-sm text-gray-800 outline-none transition-colors focus:border-brand-500 focus:ring-2 focus:ring-brand-500/20 dark:border-gray-700 dark:bg-gray-900 dark:text-white";

// ─────────────────────────────────────────────────────────────────────────────
// TYPES
// ─────────────────────────────────────────────────────────────────────────────

type EmpPayslipDTO = {
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
};

type EmpDTO = {
  id: number | null;
  empName: string;
  empLastName: string;
  empMail?: string;
  empPan?: string;
  empAccNo?: string;
  empBankName?: string;
  empIfscCode?: string;
  empAccName?: string;
};

type EmpPositionDTO = {
  id: number | null;
  empId: number | null;
  position?: string;
  department?: string;
};

type Props = {
  empIdProp?: number;
  empNameProp?: string;
  isModal?: boolean;
};

// ─────────────────────────────────────────────────────────────────────────────
// VALIDATION
// ─────────────────────────────────────────────────────────────────────────────

type FieldErrors = Partial<Record<keyof EmpPayslipDTO, string>>;

const YEAR_RE = /^\d{4}$/;

function validateForm(form: EmpPayslipDTO): FieldErrors {
  const errs: FieldErrors = {};

  if (!form.empId) errs.empId = "Employee ID is required.";

  if (!form.empMonth.trim()) errs.empMonth = "Pay month is required.";

  if (!form.empYear.trim())
    errs.empYear = "Pay year is required.";
  else if (!YEAR_RE.test(form.empYear.trim()))
    errs.empYear = "Enter a valid 4-digit year (e.g. 2025).";
  else {
    const y = parseInt(form.empYear, 10);
    if (y < 2000 || y > 2100) errs.empYear = "Year must be between 2000 and 2100.";
  }

  if (!form.basic.trim())
    errs.basic = "Basic salary is required.";
  else if (isNaN(Number(form.basic)) || Number(form.basic) < 0)
    errs.basic = "Basic salary must be a valid non-negative number.";

  if (form.hra.trim() && (isNaN(Number(form.hra)) || Number(form.hra) < 0))
    errs.hra = "HRA must be a valid non-negative number.";

  if (form.allowancess.trim() && (isNaN(Number(form.allowancess)) || Number(form.allowancess) < 0))
    errs.allowancess = "Other Allowances must be a valid non-negative number.";

  if (form.totalGross.trim() && (isNaN(Number(form.totalGross)) || Number(form.totalGross) < 0))
    errs.totalGross = "Total Gross must be a valid non-negative number.";

  if (form.tds.trim() && (isNaN(Number(form.tds)) || Number(form.tds) < 0))
    errs.tds = "TDS must be a valid non-negative number.";

  if (form.pt.trim() && (isNaN(Number(form.pt)) || Number(form.pt) < 0))
    errs.pt = "Professional Tax must be a valid non-negative number.";

  if (form.loan.trim() && (isNaN(Number(form.loan)) || Number(form.loan) < 0))
    errs.loan = "Loan deduction must be a valid non-negative number.";

  if (form.totalDeduction.trim() && (isNaN(Number(form.totalDeduction)) || Number(form.totalDeduction) < 0))
    errs.totalDeduction = "Total Deduction must be a valid non-negative number.";

  return errs;
}

// ─────────────────────────────────────────────────────────────────────────────
// HELPERS
// ─────────────────────────────────────────────────────────────────────────────

const createEmptyForm = (empId?: number): EmpPayslipDTO => ({
  id: null,
  empId: empId ?? null,
  empMonth: "",
  empYear: "",
  basic: "",
  hra: "",
  allowancess: "",
  totalGross: "",
  tds: "",
  pt: "",
  loan: "",
  totalDeduction: "",
  status: 1,
});

const getAxiosErrorMessage = (err: unknown): string => {
  if (err && typeof err === "object" && "response" in err) {
    const res = (err as any).response;
    return res?.data?.message ?? res?.data?.error ?? "An error occurred.";
  }
  return "Network error — please check your connection and try again.";
};

const MONTHS = [
  { value: "01", label: "January" }, { value: "02", label: "February" },
  { value: "03", label: "March" },   { value: "04", label: "April" },
  { value: "05", label: "May" },     { value: "06", label: "June" },
  { value: "07", label: "July" },    { value: "08", label: "August" },
  { value: "09", label: "September" },{ value: "10", label: "October" },
  { value: "11", label: "November" },{ value: "12", label: "December" },
];

const monthLabel = (val: string) => MONTHS.find((m) => m.value === val)?.label ?? val;

// ─────────────────────────────────────────────────────────────────────────────
// SUB-COMPONENTS
// ─────────────────────────────────────────────────────────────────────────────

const StatusBadge = ({ status }: { status: number }) => {
  const isActive = status === 1;
  return (
    <span className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-xs font-medium ${isActive ? "bg-green-50 text-green-700 dark:bg-green-500/10 dark:text-green-400" : "bg-gray-100 text-gray-500 dark:bg-gray-700 dark:text-gray-400"}`}>
      <span className={`size-1.5 rounded-full ${isActive ? "bg-green-500" : "bg-gray-400"}`} />
      {isActive ? "Active" : "Deactivated"}
    </span>
  );
};

const SectionHeading = ({ title }: { title: string }) => (
  <div className="col-span-full mb-2 mt-4 border-b border-gray-200 pb-2 dark:border-gray-700">
    <p className="text-xs font-semibold uppercase tracking-widest text-gray-500 dark:text-gray-400">{title}</p>
  </div>
);

const FieldError = ({ msg }: { msg?: string }) =>
  msg ? (
    <p className="mt-1 flex items-center gap-1 text-xs text-red-600 dark:text-red-400">
      <svg className="size-3 shrink-0" viewBox="0 0 20 20" fill="currentColor">
        <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7 4a1 1 0 11-2 0 1 1 0 012 0zm-1-9a1 1 0 00-1 1v4a1 1 0 102 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
      </svg>
      {msg}
    </p>
  ) : null;

// ── Validation summary popup rendered INSIDE the form modal ───────────────────
const ValidationSummaryPopup = ({
  errors,
  onClose,
}: {
  errors: FieldErrors;
  onClose: () => void;
}) => {
  const messages = Object.values(errors).filter(Boolean) as string[];
  if (messages.length === 0) return null;
  return (
    <div
      role="alert"
      aria-live="assertive"
      className="mb-4 rounded-xl border border-red-200 bg-red-50 p-4 dark:border-red-500/20 dark:bg-red-500/10"
    >
      <div className="flex items-start gap-3">
        <div className="mt-0.5 flex size-8 shrink-0 items-center justify-center rounded-full bg-red-100 dark:bg-red-500/20">
          <svg className="size-4 text-red-600 dark:text-red-400" viewBox="0 0 20 20" fill="currentColor">
            <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7 4a1 1 0 11-2 0 1 1 0 012 0zm-1-9a1 1 0 00-1 1v4a1 1 0 102 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
          </svg>
        </div>
        <div className="flex-1">
          <p className="font-semibold text-red-700 dark:text-red-400">Please fix the following before saving:</p>
          <ul className="mt-2 space-y-1">
            {messages.map((m, i) => (
              <li key={i} className="flex items-start gap-1.5 text-sm text-red-600 dark:text-red-400">
                <span className="mt-1 size-1.5 shrink-0 rounded-full bg-red-500" />
                {m}
              </li>
            ))}
          </ul>
        </div>
        <button type="button" onClick={onClose} aria-label="Dismiss" className="ml-2 text-red-400 hover:text-red-600">
          <svg className="size-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
          </svg>
        </button>
      </div>
    </div>
  );
};

// ─────────────────────────────────────────────────────────────────────────────
// MAIN COMPONENT
// ─────────────────────────────────────────────────────────────────────────────

export default function EmpPagePayslip({ empIdProp, empNameProp, isModal = false }: Props) {
  const [rows, setRows]             = useState<EmpPayslipDTO[]>([]);
  const [formState, setFormState]   = useState<EmpPayslipDTO>(createEmptyForm(empIdProp));
  const [editingId, setEditingId]   = useState<number | null>(null);
  const [showForm, setShowForm]     = useState(false);
  const [isLoading, setIsLoading]   = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const [fieldErrors, setFieldErrors]     = useState<FieldErrors>({});
  const [showErrorPopup, setShowErrorPopup] = useState(false);

  const [serverError, setServerError]       = useState("");
  const [successMessage, setSuccessMessage] = useState("");

  // Employee & position cache (for PDF generation)
  const [empCache, setEmpCache]     = useState<EmpDTO | null>(null);
  const [posCache, setPosCache]     = useState<EmpPositionDTO | null>(null);

  const isEditing = editingId !== null;

  const setField = <K extends keyof EmpPayslipDTO>(f: K, v: EmpPayslipDTO[K]) => {
    setFormState((p) => ({ ...p, [f]: v }));
    if (fieldErrors[f]) setFieldErrors((prev) => ({ ...prev, [f]: undefined }));
  };

  // ─── Helper: recalculate gross & deduction from current form state ──────────

  const recalcTotals = (state: EmpPayslipDTO): EmpPayslipDTO => {
    const b = parseFloat(state.basic)       || 0;
    const h = parseFloat(state.hra)         || 0;
    const a = parseFloat(state.allowancess) || 0;
    const t = parseFloat(state.tds)         || 0;
    const p = parseFloat(state.pt)          || 0;
    const l = parseFloat(state.loan)        || 0;
    return {
      ...state,
      totalGross:     (b + h + a).toFixed(2),
      totalDeduction: (t + p + l).toFixed(2),
    };
  };

  // ─── Auto-calculate Total Gross when any earnings field changes ────────────

  const handleEarningsChange = (
    field: "basic" | "hra" | "allowancess",
    raw: string,
  ) => {
    // Single setState call — no race condition
    setFormState((prev) => {
      const updated = { ...prev, [field]: raw };
      const b = parseFloat(updated.basic)       || 0;
      const h = parseFloat(updated.hra)         || 0;
      const a = parseFloat(updated.allowancess) || 0;
      return { ...updated, totalGross: (b + h + a).toFixed(2) };
    });
    if (fieldErrors[field as keyof EmpPayslipDTO])
      setFieldErrors((prev) => ({ ...prev, [field]: undefined }));
  };

  // ─── Auto-calculate Total Deduction when any deduction field changes ────────

  const handleDeductionChange = (
    field: "tds" | "pt" | "loan",
    raw: string,
  ) => {
    setFormState((prev) => {
      const updated = { ...prev, [field]: raw };
      const t = parseFloat(updated.tds)  || 0;
      const p = parseFloat(updated.pt)   || 0;
      const l = parseFloat(updated.loan) || 0;
      return { ...updated, totalDeduction: (t + p + l).toFixed(2) };
    });
    if (fieldErrors[field as keyof EmpPayslipDTO])
      setFieldErrors((prev) => ({ ...prev, [field]: undefined }));
  };

  // ─── FETCH payslips ────────────────────────────────────────────────────────

  const fetchPayslips = useCallback(async () => {
    setIsLoading(true);
    setServerError("");
    setSuccessMessage("");
    try {
      const url = empIdProp !== undefined ? `${PAYSLIP_URL}/employee/${empIdProp}` : PAYSLIP_URL;
      const { data } = await axiosInstance.get<EmpPayslipDTO[]>(url);
      setRows(Array.isArray(data) ? data : []);
    } catch (err) {
      setServerError(getAxiosErrorMessage(err));
    } finally {
      setIsLoading(false);
    }
  }, [empIdProp]);

  // Fetch employee + position data for PDF (only in modal mode)
  const fetchEmpAndPosition = useCallback(async () => {
    if (!empIdProp) return;
    try {
      const [{ data: empData }, { data: posData }] = await Promise.all([
        axiosInstance.get<EmpDTO>(`${EMP_URL}/${empIdProp}`),
        axiosInstance.get<EmpPositionDTO[]>(`${EMP_POS_URL}?empId=${empIdProp}`),
      ]);
      setEmpCache(empData);
      if (Array.isArray(posData)) {
        const active = posData.find(
          (p) =>
            (p as any).activeStatus === "1" ||
            (p as any).activeStatus === "ACTIVE",
        );
        setPosCache(active ?? posData[0] ?? null);
      }
    } catch {
      // non-critical — PDF will just have partial data
    }
  }, [empIdProp]);

  useEffect(() => {
    void fetchPayslips();
    void fetchEmpAndPosition();
  }, [fetchPayslips, fetchEmpAndPosition]);

  // ─── FORM HANDLERS ─────────────────────────────────────────────────────────

  const openNewForm = () => {
    setFormState(createEmptyForm(empIdProp));
    setEditingId(null);
    setFieldErrors({});
    setShowErrorPopup(false);
    setShowForm(true);
    setServerError("");
    setSuccessMessage("");
  };

  const openEditForm = (row: EmpPayslipDTO) => {
    setFormState(row);
    setEditingId(row.id);
    setFieldErrors({});
    setShowErrorPopup(false);
    setShowForm(true);
    setServerError("");
    setSuccessMessage("");
  };

  const handleCancelForm = () => {
    setShowForm(false);
    setFormState(createEmptyForm(empIdProp));
    setEditingId(null);
    setFieldErrors({});
    setShowErrorPopup(false);
  };

  const handleSubmitForm = async (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();

    const errs = validateForm(formState);
    if (Object.keys(errs).length > 0) {
      setFieldErrors(errs);
      setShowErrorPopup(true);
      document.getElementById("payslip-form-scroll-top")?.scrollIntoView({ behavior: "smooth" });
      return;
    }

    setFieldErrors({});
    setShowErrorPopup(false);
    setIsSubmitting(true);

    // Recalculate gross/deduction from individual fields so the payload always
    // has correct totals — even if loaded from DB with stale/missing values.
    const finalState = recalcTotals(formState);
    setFormState(finalState);
    const payload: Partial<EmpPayslipDTO> = { ...finalState };

    try {
      if (isEditing && editingId !== null) {
        await axiosInstance.put(`${PAYSLIP_URL}/${editingId}`, payload);
        setSuccessMessage("Payslip updated successfully.");
      } else {
        delete payload.id;
        await axiosInstance.post(PAYSLIP_URL, payload);
        setSuccessMessage("Payslip created successfully.");
      }
      await fetchPayslips();
      setShowForm(false);
      setFormState(createEmptyForm(empIdProp));
      setEditingId(null);
    } catch (err) {
      console.error("Backend Error:", err);
      setFieldErrors({ basic: getAxiosErrorMessage(err) });
      setShowErrorPopup(true);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDelete = async (id: number) => {
    if (!window.confirm("Are you sure you want to deactivate this payslip?")) return;
    setIsSubmitting(true);
    setServerError("");
    setSuccessMessage("");
    try {
      await axiosInstance.delete(`${PAYSLIP_URL}/${id}`);
      setSuccessMessage("Payslip deactivated successfully.");
      await fetchPayslips();
    } catch (err) {
      setServerError(getAxiosErrorMessage(err));
    } finally {
      setIsSubmitting(false);
    }
  };

  // ─── Download Payslip PDF ──────────────────────────────────────────────────

  const handleDownloadPayslipPDF = (row: EmpPayslipDTO) => {
    // Build a minimal EmpForPDF from cache or from row.empId
    const emp = empCache ?? {
      id: row.empId,
      empName: empNameProp?.split(" ")[0] ?? "",
      empLastName: empNameProp?.split(" ").slice(1).join(" ") ?? "",
    };
    const pos = posCache ?? undefined;

    generatePayslipPDF(
      {
        id: row.id,
        empId: row.empId,
        empMonth: row.empMonth,
        empYear: row.empYear,
        basic: row.basic,
        hra: row.hra,
        allowancess: row.allowancess,
        totalGross: row.totalGross,
        tds: row.tds,
        pt: row.pt,
        loan: row.loan,
        totalDeduction: row.totalDeduction,
        status: row.status,
      },
      {
        id: emp.id,
        empName: emp.empName,
        empLastName: emp.empLastName,
        empMail: (emp as any).empMail,
        empPan: (emp as any).empPan,
        empAccNo: (emp as any).empAccNo,
        empBankName: (emp as any).empBankName,
        empIfscCode: (emp as any).empIfscCode,
        empAccName: (emp as any).empAccName,
      },
      pos ? { position: (pos as any).position, department: (pos as any).department } : undefined,
    );
  };

  // ─────────────────────────────────────────────────────────────────────────────
  // INNER CONTENT (shared between standalone page and modal embedding)
  // ─────────────────────────────────────────────────────────────────────────────

  const content = (
    <>
      {/* Header */}
      <div className="mb-6 flex items-center justify-between">
        <div>
          {!isModal && (
            <>
              <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Payslips</h1>
              <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">Manage monthly salary slips and payment records</p>
            </>
          )}
          {isModal && empNameProp && (
            <p className="text-sm text-gray-500 dark:text-gray-400">
              Showing payslips for{" "}
              <span className="font-semibold text-gray-700 dark:text-gray-200">{empNameProp}</span>
            </p>
          )}
        </div>
        <button
          onClick={openNewForm}
          disabled={isSubmitting}
          className="inline-flex items-center gap-2 rounded-lg bg-brand-500 px-4 py-2.5 text-sm font-medium text-white hover:bg-brand-600 disabled:opacity-50 dark:bg-brand-600 dark:hover:bg-brand-700"
        >
          <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
          </svg>
          Add Payslip
        </button>
      </div>

      {/* Page-level messages */}
      {serverError && (
        <div role="alert" className="mb-4 rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700 dark:border-red-500/20 dark:bg-red-500/10 dark:text-red-400">
          {serverError}
        </div>
      )}
      {successMessage && (
        <div role="status" className="mb-4 rounded-lg border border-green-200 bg-green-50 px-4 py-3 text-sm text-green-700 dark:border-green-500/20 dark:bg-green-500/10 dark:text-green-400">
          {successMessage}
        </div>
      )}

      {/* ── Payslip Form Modal ─────────────────────────────────────────────── */}
      <Modal
        isOpen={showForm}
        onClose={handleCancelForm}
        className="mx-4 w-full max-w-3xl p-6 sm:p-8"
      >
        {/* Scroll anchor */}
        <div id="payslip-form-scroll-top" />

        <h3 className="pr-12 text-xl font-semibold text-gray-800 dark:text-white/90">
          {isEditing ? "Edit Payslip" : "Add New Payslip"}
        </h3>
        <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
          {isEditing ? "Update payslip and salary breakdown" : "Generate a new monthly payslip"}
        </p>

        {/* Validation error summary — rendered INSIDE modal so it's always visible */}
        <div className="mt-4">
          <ValidationSummaryPopup
            errors={showErrorPopup ? fieldErrors : {}}
            onClose={() => setShowErrorPopup(false)}
          />
        </div>

        <form onSubmit={(e) => void handleSubmitForm(e)} noValidate className="mt-2">
          <div className="grid grid-cols-1 gap-x-4 gap-y-3 md:grid-cols-2">

            <SectionHeading title="Payslip Period" />

            <div>
              <Label htmlFor="empId">Employee ID <span className="text-red-500">*</span></Label>
              <Input
                id="empId"
                type="number"
                value={formState.empId ?? ""}
                onChange={(e) => setField("empId", e.target.value ? Number(e.target.value) : null)}
                placeholder="Employee ID"
                disabled={isSubmitting || (isModal && empIdProp !== undefined)}
                className={fieldErrors.empId ? "border-red-400" : ""}
              />
              {isModal && empNameProp && (
                <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">{empNameProp}</p>
              )}
              <FieldError msg={fieldErrors.empId} />
            </div>

            <div>
              <Label htmlFor="empYear">Year <span className="text-red-500">*</span></Label>
              <Input
                id="empYear"
                value={formState.empYear}
                onChange={(e) => setField("empYear", e.target.value.replace(/\D/g, "").slice(0, 4))}
                placeholder="e.g., 2025"
                maxLength={4}
                disabled={isSubmitting}
                className={fieldErrors.empYear ? "border-red-400" : ""}
              />
              <FieldError msg={fieldErrors.empYear} />
            </div>

            <div>
              <Label htmlFor="empMonth">Month <span className="text-red-500">*</span></Label>
              <select
                id="empMonth"
                value={formState.empMonth}
                onChange={(e) => setField("empMonth", e.target.value)}
                disabled={isSubmitting}
                className={`${selectClass} ${fieldErrors.empMonth ? "border-red-400" : ""}`}
              >
                <option value="">— Select Month —</option>
                {MONTHS.map((m) => (
                  <option key={m.value} value={m.value}>{m.label}</option>
                ))}
              </select>
              <FieldError msg={fieldErrors.empMonth} />
            </div>

            <div>
              <Label htmlFor="status">Status</Label>
              <select
                id="status"
                value={formState.status}
                onChange={(e) => setField("status", Number(e.target.value))}
                disabled={isSubmitting}
                className={selectClass}
              >
                <option value={1}>Active</option>
                <option value={0}>Deactivated</option>
              </select>
            </div>

            <SectionHeading title="Earnings  (values auto-sum into Total Gross)" />

            <div>
              <Label htmlFor="basic">Basic Salary (₹) <span className="text-red-500">*</span></Label>
              <Input
                id="basic"
                value={formState.basic}
                onChange={(e) => handleEarningsChange("basic", e.target.value)}
                placeholder="Basic monthly salary"
                disabled={isSubmitting}
                className={fieldErrors.basic ? "border-red-400" : ""}
              />
              <FieldError msg={fieldErrors.basic} />
            </div>

            <div>
              <Label htmlFor="hra">HRA (₹)</Label>
              <Input
                id="hra"
                value={formState.hra}
                onChange={(e) => handleEarningsChange("hra", e.target.value)}
                placeholder="House Rent Allowance"
                disabled={isSubmitting}
                className={fieldErrors.hra ? "border-red-400" : ""}
              />
              <FieldError msg={fieldErrors.hra} />
            </div>

            <div>
              <Label htmlFor="allowancess">Other Allowances (₹)</Label>
              <Input
                id="allowancess"
                value={formState.allowancess}
                onChange={(e) => handleEarningsChange("allowancess", e.target.value)}
                placeholder="Conveyance, medical, etc."
                disabled={isSubmitting}
                className={fieldErrors.allowancess ? "border-red-400" : ""}
              />
              <FieldError msg={fieldErrors.allowancess} />
            </div>

            <div>
              <Label htmlFor="totalGross">Total Gross (₹)</Label>
              <Input
                id="totalGross"
                value={formState.totalGross}
                onChange={(e) => setField("totalGross", e.target.value)}
                placeholder="Auto-calculated from Basic + HRA + Allowances"
                disabled={isSubmitting}
                className={`bg-gray-50 dark:bg-gray-800 ${fieldErrors.totalGross ? "border-red-400" : ""}`}
              />
              <p className="mt-1 text-xs text-gray-400">Auto-calculated — you may override.</p>
              <FieldError msg={fieldErrors.totalGross} />
            </div>

            <SectionHeading title="Deductions  (values auto-sum into Total Deduction)" />

            <div>
              <Label htmlFor="tds">TDS (₹)</Label>
              <Input id="tds" value={formState.tds} onChange={(e) => handleDeductionChange("tds", e.target.value)} placeholder="Tax Deducted at Source" disabled={isSubmitting} className={fieldErrors.tds ? "border-red-400" : ""} />
              <FieldError msg={fieldErrors.tds} />
            </div>

            <div>
              <Label htmlFor="pt">Professional Tax (₹)</Label>
              <Input id="pt" value={formState.pt} onChange={(e) => handleDeductionChange("pt", e.target.value)} placeholder="Professional tax" disabled={isSubmitting} className={fieldErrors.pt ? "border-red-400" : ""} />
              <FieldError msg={fieldErrors.pt} />
            </div>

            <div>
              <Label htmlFor="loan">Loan Deduction (₹)</Label>
              <Input id="loan" value={formState.loan} onChange={(e) => handleDeductionChange("loan", e.target.value)} placeholder="Loan EMI deduction" disabled={isSubmitting} className={fieldErrors.loan ? "border-red-400" : ""} />
              <FieldError msg={fieldErrors.loan} />
            </div>

            <div>
              <Label htmlFor="totalDeduction">Total Deduction (₹)</Label>
              <Input
                id="totalDeduction"
                value={formState.totalDeduction}
                onChange={(e) => setField("totalDeduction", e.target.value)}
                placeholder="Auto-calculated from TDS + PT + Loan"
                disabled={isSubmitting}
                className={`bg-gray-50 dark:bg-gray-800 ${fieldErrors.totalDeduction ? "border-red-400" : ""}`}
              />
              <p className="mt-1 text-xs text-gray-400">Auto-calculated — you may override.</p>
              <FieldError msg={fieldErrors.totalDeduction} />
            </div>

          </div>

          {/* Form Actions */}
          <div className="mt-6 flex gap-2 border-t border-gray-100 pt-4 dark:border-gray-800">
            <button
              type="submit"
              disabled={isSubmitting}
              className="inline-flex items-center justify-center gap-2 rounded-lg bg-brand-500 px-5 py-2.5 text-sm font-medium text-white hover:bg-brand-600 disabled:opacity-50"
            >
              {isSubmitting && (
                <svg className="h-4 w-4 animate-spin" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8H4z" />
                </svg>
              )}
              {isSubmitting ? "Saving..." : isEditing ? "Update Payslip" : "Create Payslip"}
            </button>
            <button
              type="button"
              onClick={handleCancelForm}
              disabled={isSubmitting}
              className="inline-flex items-center justify-center rounded-lg border border-gray-300 px-5 py-2.5 text-sm font-medium text-gray-700 hover:bg-gray-50 disabled:opacity-50 dark:border-gray-700 dark:text-gray-300"
            >
              Cancel
            </button>
          </div>
        </form>
      </Modal>

      {/* ── Payslip Table ──────────────────────────────────────────────────── */}
      <div className="overflow-x-auto rounded-xl border border-gray-200 dark:border-gray-800">
        <Table>
          <TableHeader className="bg-gray-50 dark:bg-white/[0.03]">
            <TableRow>
              {["ID", "Month / Year", "Basic (₹)", "Gross (₹)", "Deductions (₹)", "Net Pay (₹)", "Status", "Actions"].map((h) => (
                <TableCell key={h} isHeader className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-gray-600 dark:text-gray-300">{h}</TableCell>
              ))}
            </TableRow>
          </TableHeader>

          <TableBody className="divide-y divide-gray-100 dark:divide-gray-800">
            {isLoading && (
              <TableRow>
                <TableCell colSpan={8} className="px-4 py-8 text-center text-sm text-gray-500">
                  <div className="flex items-center justify-center gap-2">
                    <svg className="h-4 w-4 animate-spin text-brand-500" fill="none" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8H4z" />
                    </svg>
                    Loading payslips…
                  </div>
                </TableCell>
              </TableRow>
            )}

            {!isLoading && rows.length === 0 && (
              <TableRow>
                <TableCell colSpan={8} className="px-4 py-8 text-center text-sm text-gray-500 dark:text-gray-400">
                  No payslips found. Click "Add Payslip" to create the first one.
                </TableCell>
              </TableRow>
            )}

            {!isLoading && rows.map((row) => {
              // Recalculate from components — stored totals may be stale
              const b = parseFloat(row.basic       || "0");
              const h = parseFloat(row.hra         || "0");
              const a = parseFloat(row.allowancess || "0");
              const t = parseFloat(row.tds         || "0");
              const p = parseFloat(row.pt          || "0");
              const l = parseFloat(row.loan        || "0");
              const gross     = parseFloat(row.totalGross      || "0") || (b + h + a);
              const deduction = parseFloat(row.totalDeduction  || "0") || (t + p + l);
              const net       = gross - deduction;
              return (
                <TableRow key={row.id} className="transition-colors hover:bg-brand-50/60 dark:hover:bg-brand-500/5">
                  <TableCell className="px-4 py-3 text-sm font-medium text-brand-600 dark:text-brand-400">{row.id}</TableCell>
                  <TableCell className="px-4 py-3 text-sm font-medium text-gray-800 dark:text-white">
                    {monthLabel(row.empMonth)} {row.empYear}
                  </TableCell>
                  <TableCell className="px-4 py-3 text-sm font-mono text-gray-600 dark:text-gray-300">
                    {row.basic ? `₹${parseFloat(row.basic).toLocaleString("en-IN")}` : "—"}
                  </TableCell>
                  <TableCell className="px-4 py-3 text-sm font-mono text-gray-600 dark:text-gray-300">
                    {row.totalGross ? `₹${gross.toLocaleString("en-IN")}` : "—"}
                  </TableCell>
                  <TableCell className="px-4 py-3 text-sm font-mono text-red-600 dark:text-red-400">
                    {row.totalDeduction ? `₹${deduction.toLocaleString("en-IN")}` : "—"}
                  </TableCell>
                  <TableCell className="px-4 py-3 text-sm font-mono font-semibold text-green-700 dark:text-green-400">
                    {row.totalGross ? `₹${net.toLocaleString("en-IN")}` : "—"}
                  </TableCell>
                  <TableCell className="px-4 py-3"><StatusBadge status={row.status} /></TableCell>
                  <TableCell className="px-4 py-3 text-sm" onClick={(e) => e.stopPropagation()}>
                    <div className="flex flex-wrap items-center gap-1.5">

                      {/* Download Payslip PDF */}
                      <button
                        type="button"
                        onClick={() => handleDownloadPayslipPDF(row)}
                        title="Download payslip as PDF"
                        className="inline-flex items-center justify-center gap-1 rounded-md border border-teal-300 px-2.5 py-1.5 text-xs font-medium text-teal-600 hover:bg-teal-50 dark:border-teal-700 dark:text-teal-400 dark:hover:bg-teal-500/10"
                      >
                        <svg className="size-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                          <path strokeLinecap="round" strokeLinejoin="round" d="M12 10v6m0 0l-3-3m3 3l3-3M3 17V7a2 2 0 012-2h6l2 2h4a2 2 0 012 2v8a2 2 0 01-2 2H5a2 2 0 01-2-2z" />
                        </svg>
                        PDF
                      </button>

                      {/* Edit */}
                      <button
                        type="button"
                        onClick={() => openEditForm(row)}
                        disabled={isSubmitting}
                        className="inline-flex items-center justify-center rounded-md border border-brand-300 px-2.5 py-1.5 text-xs font-medium text-brand-600 hover:bg-brand-50 disabled:opacity-50 dark:border-brand-800 dark:text-brand-300 dark:hover:bg-brand-500/10"
                      >
                        Edit
                      </button>

                      {/* Deactivate */}
                      <button
                        type="button"
                        onClick={() => void handleDelete(row.id!)}
                        disabled={isSubmitting}
                        className="inline-flex items-center justify-center rounded-md border border-error-300 px-2.5 py-1.5 text-xs font-medium text-error-600 hover:bg-error-50 disabled:opacity-50 dark:border-error-800 dark:text-error-400 dark:hover:bg-error-500/10"
                      >
                        Deactivate
                      </button>
                    </div>
                  </TableCell>
                </TableRow>
              );
            })}
          </TableBody>
        </Table>
      </div>

      {!isLoading && rows.length > 0 && (
        <p className="mt-4 text-xs text-gray-400 dark:text-gray-500">
          {rows.length} payslip{rows.length !== 1 ? "s" : ""}
        </p>
      )}
    </>
  );

  // ─── Render mode ─────────────────────────────────────────────────────────────
  if (isModal) return <div>{content}</div>;

  return (
    <>
      <PageMeta title="Payslips" description="Manage employee payslips and salary records" />
      <PageBreadcrumb items={[{ label: "Dashboard" }, { label: "Employees" }, { label: "Payslips" }]} />
      <ComponentCard>{content}</ComponentCard>
    </>
  );
}