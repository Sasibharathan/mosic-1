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
import EmpPagePayslip from "./EmpPagePayslip";
import DatePicker from "../../components/form/input/DatePicker";
import { generateEmpDetailsPDF } from "../pdf/Generateempdetailspdf";

// ─────────────────────────────────────────────────────────────────────────────
// CONSTANTS & STYLES
// ─────────────────────────────────────────────────────────────────────────────

const EMP_URL      = "/api/employees";
const EMP_POS_URL  = "/api/emp-position";

const selectClass =
  "h-10 w-full rounded-lg border border-gray-300 bg-white px-3 text-sm text-gray-800 outline-none transition-colors focus:border-brand-500 focus:ring-2 focus:ring-brand-500/20 dark:border-gray-700 dark:bg-gray-900 dark:text-white";

// ─────────────────────────────────────────────────────────────────────────────
// TYPES
// ─────────────────────────────────────────────────────────────────────────────

type EmpDTO = {
  id: number | null;
  empName: string;
  empLastName: string;
  empDob: string;
  empPh: string;
  empMail: string;
  empPan: string;
  empAdhar: string;
  empAccNo: string;
  empBankName: string;
  empAccName: string;
  empIfscCode: string;
  empAddress1: string;
  empAddress2: string;
  empAddress3: string;
  empDoj: string;
  status: string;
};

type EmpPositionDTO = {
  id: number | null;
  empId: number | null;
  position?: string;
  department?: string;
  role?: string;
  empBasic?: string;
  empHra?: string;
  empAllowance?: string;
  empMonthGross?: string;
  epDate?: string;
  epEfficientDate?: string;
  activeStatus: string;
  status: string;
};

// ─────────────────────────────────────────────────────────────────────────────
// VALIDATION
// ─────────────────────────────────────────────────────────────────────────────

type FieldErrors = Partial<Record<keyof EmpDTO, string>>;

const EMAIL_RE    = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const PHONE_RE    = /^[6-9]\d{9}$/;               // Indian mobile standard
const PAN_RE      = /^[A-Z]{5}[0-9]{4}[A-Z]{1}$/;
const AADHAAR_RE  = /^\d{12}$/;
const IFSC_RE     = /^[A-Z]{4}0[A-Z0-9]{6}$/;

function validateForm(form: EmpDTO): FieldErrors {
  const errs: FieldErrors = {};

  // ── Personal ──────────────────────────────────────────────────────────────
  if (!form.empName.trim())
    errs.empName = "First name is required.";
  else if (form.empName.trim().length < 2)
    errs.empName = "First name must be at least 2 characters.";

  if (!form.empLastName.trim())
    errs.empLastName = "Last name is required.";

  if (!form.empDob.trim())
    errs.empDob = "Date of Birth is required.";

  if (!form.empDoj.trim())
    errs.empDoj = "Date of Joining is required.";

  if (!form.empMail.trim())
    errs.empMail = "Email address is required.";
  else if (!EMAIL_RE.test(form.empMail.trim()))
    errs.empMail = "Enter a valid email address (e.g. john@company.com).";

  if (!form.empPh.trim())
    errs.empPh = "Phone number is required.";
  else if (!PHONE_RE.test(form.empPh.trim()))
    errs.empPh = "Enter a valid 10-digit Indian mobile number starting with 6–9.";

  // ── Address ───────────────────────────────────────────────────────────────
  if (!form.empAddress1.trim())
    errs.empAddress1 = "Address Line 1 is required.";

  if (!form.empAddress2.trim())
    errs.empAddress2 = "Address Line 2 is required.";

  if (!form.empAddress3.trim())
    errs.empAddress3 = "City / State / PIN is required.";

  // ── Tax & Compliance ──────────────────────────────────────────────────────
  if (!form.empPan.trim())
    errs.empPan = "PAN is required.";
  else if (!PAN_RE.test(form.empPan.trim()))
    errs.empPan = "PAN must be in the format AAAAA9999A (5 letters, 4 digits, 1 letter).";

  if (!form.empAdhar.trim())
    errs.empAdhar = "Aadhaar number is required.";
  else if (!AADHAAR_RE.test(form.empAdhar.trim()))
    errs.empAdhar = "Aadhaar must be exactly 12 digits.";

  // ── Bank Details ──────────────────────────────────────────────────────────
  if (!form.empAccName.trim())
    errs.empAccName = "Account Holder Name is required.";

  if (!form.empBankName.trim())
    errs.empBankName = "Bank Name is required.";

  if (!form.empAccNo.trim())
    errs.empAccNo = "Account Number is required.";

  if (!form.empIfscCode.trim())
    errs.empIfscCode = "IFSC Code is required.";
  else if (!IFSC_RE.test(form.empIfscCode.trim()))
    errs.empIfscCode = "IFSC must be 11 characters (4 letters + 0 + 6 alphanumeric), e.g. HDFC0000089.";

  return errs;
}

// ─────────────────────────────────────────────────────────────────────────────
// HELPERS
// ─────────────────────────────────────────────────────────────────────────────

const createEmptyForm = (): EmpDTO => ({
  id: null,
  empName: "",
  empLastName: "",
  empDob: "",
  empPh: "",
  empMail: "",
  empPan: "",
  empAdhar: "",
  empAccNo: "",
  empBankName: "",
  empAccName: "",
  empIfscCode: "",
  empAddress1: "",
  empAddress2: "",
  empAddress3: "",
  empDoj: "",
  status: "1",
});

const getAxiosErrorMessage = (err: unknown): string => {
  if (err && typeof err === "object" && "response" in err) {
    const res = (err as any).response;
    return res?.data?.message ?? res?.data?.error ?? "An error occurred.";
  }
  return "Network error — please check your connection and try again.";
};

// ─────────────────────────────────────────────────────────────────────────────
// SUB-COMPONENTS
// ─────────────────────────────────────────────────────────────────────────────

const StatusBadge = ({ status }: { status: string }) => {
  const isActive = status === "1" || (status as any) === 1;
  return (
    <span
      className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-xs font-medium ${
        isActive
          ? "bg-green-50 text-green-700 dark:bg-green-500/10 dark:text-green-400"
          : "bg-gray-100 text-gray-500 dark:bg-gray-700 dark:text-gray-400"
      }`}
    >
      <span className={`size-1.5 rounded-full ${isActive ? "bg-green-500" : "bg-gray-400"}`} />
      {isActive ? "Active" : "Inactive"}
    </span>
  );
};

const NoPositionBadge = () => (
  <span className="inline-flex items-center gap-1 rounded-full bg-amber-50 px-2 py-0.5 text-xs font-medium text-amber-700 dark:bg-amber-500/10 dark:text-amber-400">
    <span className="size-1.5 rounded-full bg-amber-400" />
    No Position
  </span>
);

const SectionHeading = ({ title }: { title: string }) => (
  <div className="col-span-full mb-2 mt-4 border-b border-gray-200 pb-2 dark:border-gray-700">
    <p className="text-xs font-semibold uppercase tracking-widest text-gray-500 dark:text-gray-400">
      {title}
    </p>
  </div>
);

// ── Inline field-level error hint ─────────────────────────────────────────────
const FieldError = ({ msg }: { msg?: string }) =>
  msg ? (
    <p className="mt-1 flex items-center gap-1 text-xs text-red-600 dark:text-red-400">
      <svg className="size-3 shrink-0" viewBox="0 0 20 20" fill="currentColor">
        <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7 4a1 1 0 11-2 0 1 1 0 012 0zm-1-9a1 1 0 00-1 1v4a1 1 0 102 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
      </svg>
      {msg}
    </p>
  ) : null;

// ── Validation error summary popup (shown INSIDE the form modal) ──────────────
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
        {/* Icon */}
        <div className="mt-0.5 flex size-8 shrink-0 items-center justify-center rounded-full bg-red-100 dark:bg-red-500/20">
          <svg className="size-4 text-red-600 dark:text-red-400" viewBox="0 0 20 20" fill="currentColor">
            <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7 4a1 1 0 11-2 0 1 1 0 012 0zm-1-9a1 1 0 00-1 1v4a1 1 0 102 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
          </svg>
        </div>
        <div className="flex-1">
          <p className="font-semibold text-red-700 dark:text-red-400">
            Please fix the following before saving:
          </p>
          <ul className="mt-2 space-y-1">
            {messages.map((m, i) => (
              <li key={i} className="flex items-start gap-1.5 text-sm text-red-600 dark:text-red-400">
                <span className="mt-1 size-1.5 shrink-0 rounded-full bg-red-500" />
                {m}
              </li>
            ))}
          </ul>
        </div>
        <button
          type="button"
          onClick={onClose}
          aria-label="Dismiss errors"
          className="ml-2 text-red-400 hover:text-red-600"
        >
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

export default function EmpPage() {
  const [rows, setRows]                     = useState<EmpDTO[]>([]);
  const [formState, setFormState]           = useState<EmpDTO>(createEmptyForm());
  const [editingId, setEditingId]           = useState<number | null>(null);
  const [showForm, setShowForm]             = useState(false);
  const [isLoading, setIsLoading]           = useState(false);
  const [isSubmitting, setIsSubmitting]     = useState(false);

  // Inline field-level errors (shown inside form modal)
  const [fieldErrors, setFieldErrors]       = useState<FieldErrors>({});
  // Whether to show the compact summary popup at top of form
  const [showErrorPopup, setShowErrorPopup] = useState(false);

  // Page-level success / server error (shown on main page)
  const [serverError, setServerError]       = useState("");
  const [successMessage, setSuccessMessage] = useState("");

  // Position map  { empId -> EmpPositionDTO | undefined }
  const [positionMap, setPositionMap]       = useState<Record<number, EmpPositionDTO | null>>({});

  // Payslip modal
  const [payslipModal, setPayslipModal]     = useState<{ open: boolean; empId: number | null; empName: string }>({ open: false, empId: null, empName: "" });

  // No-position warning modal
  const [noPositionModal, setNoPositionModal] = useState<{ open: boolean; empName: string }>({ open: false, empName: "" });

  const isEditing = editingId !== null;

  // ─── Search / Filter / Pagination ──────────────────────────────────────────
  const [searchQuery, setSearchQuery]     = useState("");
  const [filterStatus, setFilterStatus]   = useState<"all" | "1" | "0">("all");
  const [filterPosition, setFilterPosition] = useState<"all" | "assigned" | "none">("all");
  const [currentPage, setCurrentPage]     = useState(1);
  const PAGE_SIZE = 10;

  // Reset to page 1 when filters change
  const handleSearch = (v: string) => { setSearchQuery(v); setCurrentPage(1); };
  const handleFilterStatus = (v: "all" | "1" | "0") => { setFilterStatus(v); setCurrentPage(1); };
  const handleFilterPosition = (v: "all" | "assigned" | "none") => { setFilterPosition(v); setCurrentPage(1); };

  // ─── Quick status toggle ────────────────────────────────────────────────────
  const handleToggleStatus = async (row: EmpDTO) => {
    if (!window.confirm(`${row.status === "1" ? "Deactivate" : "Activate"} ${row.empName} ${row.empLastName}?`)) return;
    setIsSubmitting(true);
    try {
      const updated = { ...row, status: row.status === "1" ? "0" : "1" };
      await axiosInstance.put(`${EMP_URL}/${row.id}`, updated);
      setSuccessMessage(`${row.empName} ${row.status === "1" ? "deactivated" : "activated"} successfully.`);
      await fetchEmployees();
    } catch (err) {
      setServerError(getAxiosErrorMessage(err));
    } finally {
      setIsSubmitting(false);
    }
  };

  const setField = <K extends keyof EmpDTO>(f: K, v: EmpDTO[K]) => {
    setFormState((p) => ({ ...p, [f]: v }));
    // Clear the error for that field as the user types
    if (fieldErrors[f]) {
      setFieldErrors((prev) => ({ ...prev, [f]: undefined }));
    }
  };

  // ─── FETCH ─────────────────────────────────────────────────────────────────

  const fetchEmployees = useCallback(async () => {
    setIsLoading(true);
    setServerError("");
    setSuccessMessage("");
    try {
      const { data } = await axiosInstance.get<EmpDTO[]>(EMP_URL);
      setRows(Array.isArray(data) ? data : []);
    } catch (err) {
      setServerError(getAxiosErrorMessage(err));
    } finally {
      setIsLoading(false);
    }
  }, []);

  const fetchPositionMap = useCallback(async () => {
    try {
      const { data } = await axiosInstance.get<EmpPositionDTO[]>(EMP_POS_URL);
      const map: Record<number, EmpPositionDTO | null> = {};
      if (Array.isArray(data)) {
        data.forEach((pos) => {
          if (pos.empId !== null) {
            const isActive =
              (pos.activeStatus === "1" || pos.activeStatus === "ACTIVE") &&
              (pos.status === "1" || pos.status === "ACTIVE");
            if (isActive) map[pos.empId] = pos;
            else if (map[pos.empId] === undefined) map[pos.empId] = null;
          }
        });
      }
      setPositionMap(map);
    } catch {
      // non-critical
    }
  }, []);

  useEffect(() => {
    void fetchEmployees();
    void fetchPositionMap();
  }, [fetchEmployees, fetchPositionMap]);

  const hasActivePosition = (empId: number | null): boolean => {
    if (!empId) return false;
    return positionMap[empId] !== undefined && positionMap[empId] !== null;
  };

  // ─── Filtered / Paged rows (must be after hasActivePosition) ───────────────
  const filteredRows = rows.filter((r) => {
    const q = searchQuery.toLowerCase();
    const matchesSearch =
      !q ||
      `${r.empName} ${r.empLastName}`.toLowerCase().includes(q) ||
      (r.empMail ?? "").toLowerCase().includes(q) ||
      (r.empPh ?? "").includes(q) ||
      (r.empPan ?? "").toLowerCase().includes(q) ||
      String(r.id ?? "").includes(q);
    const matchesStatus   = filterStatus === "all" || r.status === filterStatus;
    const matchesPosition =
      filterPosition === "all"     ? true
      : filterPosition === "assigned" ? hasActivePosition(r.id)
      : !hasActivePosition(r.id);
    return matchesSearch && matchesStatus && matchesPosition;
  });

  const totalPages = Math.max(1, Math.ceil(filteredRows.length / PAGE_SIZE));
  const pagedRows  = filteredRows.slice((currentPage - 1) * PAGE_SIZE, currentPage * PAGE_SIZE);

  // ─── FORM HANDLERS ─────────────────────────────────────────────────────────

  const openNewForm = () => {
    setFormState(createEmptyForm());
    setEditingId(null);
    setFieldErrors({});
    setShowErrorPopup(false);
    setShowForm(true);
    setServerError("");
    setSuccessMessage("");
  };

  const openEditForm = (row: EmpDTO) => {
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
    setFormState(createEmptyForm());
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
      // Scroll the modal content to top so the user sees the error summary
      document.getElementById("emp-form-scroll-top")?.scrollIntoView({ behavior: "smooth" });
      return;
    }

    setFieldErrors({});
    setShowErrorPopup(false);
    setIsSubmitting(true);
    const payload: Partial<EmpDTO> = { ...formState };

    try {
      if (isEditing && editingId !== null) {
        await axiosInstance.put(`${EMP_URL}/${editingId}`, payload);
        setSuccessMessage("Employee updated successfully.");
      } else {
        delete payload.id;
        await axiosInstance.post(EMP_URL, payload);
        setSuccessMessage("Employee created successfully.");
      }
      await fetchEmployees();
      setShowForm(false);
      setFormState(createEmptyForm());
      setEditingId(null);
    } catch (err) {
      console.error("Backend Error:", err);
      // Show server error INSIDE the modal (not just on the page)
      setFieldErrors({ empName: getAxiosErrorMessage(err) });
      setShowErrorPopup(true);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDelete = async (id: number) => {
    if (!window.confirm("Are you sure you want to delete this employee? This action cannot be undone.")) return;
    setIsSubmitting(true);
    setServerError("");
    setSuccessMessage("");
    try {
      await axiosInstance.delete(`${EMP_URL}/${id}`);
      setSuccessMessage("Employee deleted successfully.");
      await fetchEmployees();
    } catch (err) {
      setServerError(getAxiosErrorMessage(err));
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleOpenPayslips = (emp: EmpDTO) => {
    const empName = `${emp.empName} ${emp.empLastName}`;
    if (!hasActivePosition(emp.id)) {
      setNoPositionModal({ open: true, empName });
      return;
    }
    setPayslipModal({ open: true, empId: emp.id!, empName });
  };

  // ─── Download Employee Details PDF ─────────────────────────────────────────
  const handleDownloadEmpPDF = (row: EmpDTO) => {
    const pos = row.id ? positionMap[row.id] : null;
    generateEmpDetailsPDF(
      {
        id: row.id,
        empName: row.empName,
        empLastName: row.empLastName,
        empDob: row.empDob,
        empDoj: row.empDoj,
        empPh: row.empPh,
        empMail: row.empMail,
        empPan: row.empPan,
        empAdhar: row.empAdhar,
        empAccNo: row.empAccNo,
        empBankName: row.empBankName,
        empAccName: row.empAccName,
        empIfscCode: row.empIfscCode,
        empAddress1: row.empAddress1,
        empAddress2: row.empAddress2,
        empAddress3: row.empAddress3,
        status: row.status,
      },
      pos
        ? {
            position: pos.position,
            department: pos.department,
            role: pos.role,
            empBasic: pos.empBasic,
            empHra: pos.empHra,
            empAllowance: pos.empAllowance,
            empMonthGross: pos.empMonthGross,
            epDate: pos.epDate,
            epEfficientDate: pos.epEfficientDate,
          }
        : undefined,
    );
  };

  // ─────────────────────────────────────────────────────────────────────────────
  // RENDER
  // ─────────────────────────────────────────────────────────────────────────────

  return (
    <>
      <PageMeta title="Employees" description="Manage employee details and payroll" />
      <PageBreadcrumb items={[{ label: "Dashboard" }, { label: "Employees" }]} />

      <ComponentCard>

        {/* ── Page Header ──────────────────────────────────────────────────── */}
        <div className="mb-6 flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Employees</h1>
            <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
              Manage employee information, designations, and bank details
            </p>
          </div>
          <button
            onClick={openNewForm}
            disabled={isSubmitting}
            className="inline-flex items-center gap-2 rounded-lg bg-brand-500 px-4 py-2.5 text-sm font-medium text-white hover:bg-brand-600 disabled:opacity-50 dark:bg-brand-600 dark:hover:bg-brand-700"
          >
            <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
            </svg>
            Add Employee
          </button>
        </div>

        {/* ── Page-level messages ───────────────────────────────────────────── */}
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

        {/* ── No Position Warning Modal ─────────────────────────────────────── */}
        <Modal
          isOpen={noPositionModal.open}
          onClose={() => setNoPositionModal({ open: false, empName: "" })}
          className="mx-4 w-full max-w-md p-6 sm:p-8"
        >
          <div className="flex flex-col items-center gap-4 text-center">
            <div className="flex size-14 items-center justify-center rounded-full bg-amber-50 dark:bg-amber-500/10">
              <svg className="size-7 text-amber-500" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v3.75m-9.303 3.376c-.866 1.5.217 3.374 1.948 3.374h14.71c1.73 0 2.813-1.874 1.948-3.374L13.949 3.378c-.866-1.5-3.032-1.5-3.898 0L2.697 16.126zM12 15.75h.007v.008H12v-.008z" />
              </svg>
            </div>
            <div>
              <h3 className="text-lg font-semibold text-gray-800 dark:text-white">No Position Assigned</h3>
              <p className="mt-2 text-sm text-gray-500 dark:text-gray-400">
                <span className="font-medium text-gray-700 dark:text-gray-200">{noPositionModal.empName}</span> does not have an active position assigned yet.
              </p>
              <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
                HR must assign a position before a payslip can be created.
              </p>
            </div>
            <button
              type="button"
              onClick={() => setNoPositionModal({ open: false, empName: "" })}
              className="mt-2 inline-flex items-center justify-center rounded-lg bg-brand-500 px-6 py-2.5 text-sm font-medium text-white hover:bg-brand-600"
            >
              Got it
            </button>
          </div>
        </Modal>

        {/* ── Payslip Modal ─────────────────────────────────────────────────── */}
        <Modal
          isOpen={payslipModal.open}
          onClose={() => setPayslipModal({ open: false, empId: null, empName: "" })}
          className="mx-4 w-full max-w-5xl p-6 sm:p-8"
        >
          {payslipModal.empId !== null && (
            <EmpPagePayslip
              empIdProp={payslipModal.empId}
              empNameProp={payslipModal.empName}
              isModal
            />
          )}
        </Modal>

        {/* ── Employee Form Modal ───────────────────────────────────────────── */}
        <Modal
          isOpen={showForm}
          onClose={handleCancelForm}
          className="mx-4 w-full max-w-4xl p-6 sm:p-8"
        >
          {/* Scroll anchor */}
          <div id="emp-form-scroll-top" />

          <h3 className="pr-12 text-xl font-semibold text-gray-800 dark:text-white/90">
            {isEditing ? "Edit Employee" : "Add New Employee"}
          </h3>
          <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
            {isEditing
              ? "Update employee information and bank details"
              : "Fill in all required fields (marked *) to create a new employee profile."}
          </p>

          {/* ── Validation error summary — inside the modal so it's always visible ── */}
          <div className="mt-4">
            <ValidationSummaryPopup
              errors={showErrorPopup ? fieldErrors : {}}
              onClose={() => setShowErrorPopup(false)}
            />
          </div>

          <form onSubmit={(e) => void handleSubmitForm(e)} noValidate className="mt-2">
            <div className="grid grid-cols-1 gap-x-4 gap-y-3 md:grid-cols-2">

              {/* ── Personal Information ────────────────────────────────────── */}
              <SectionHeading title="Personal Information" />

              <div>
                <Label htmlFor="empName">First Name <span className="text-red-500">*</span></Label>
                <Input
                  id="empName"
                  value={formState.empName}
                  onChange={(e) => setField("empName", e.target.value)}
                  placeholder="First name"
                  disabled={isSubmitting}
                  className={fieldErrors.empName ? "border-red-400 focus:border-red-500 focus:ring-red-500/20" : ""}
                />
                <FieldError msg={fieldErrors.empName} />
              </div>

              <div>
                <Label htmlFor="empLastName">Last Name <span className="text-red-500">*</span></Label>
                <Input
                  id="empLastName"
                  value={formState.empLastName}
                  onChange={(e) => setField("empLastName", e.target.value)}
                  placeholder="Last name"
                  disabled={isSubmitting}
                  className={fieldErrors.empLastName ? "border-red-400 focus:border-red-500 focus:ring-red-500/20" : ""}
                />
                <FieldError msg={fieldErrors.empLastName} />
              </div>

              <div>
                <Label htmlFor="empDob">Date of Birth <span className="text-red-500">*</span></Label>
                <DatePicker value={formState.empDob} onChange={(val) => setField("empDob", val)} />
                <FieldError msg={fieldErrors.empDob} />
              </div>

              <div>
                <Label htmlFor="empDoj">Date of Joining <span className="text-red-500">*</span></Label>
                <DatePicker value={formState.empDoj} onChange={(val) => setField("empDoj", val)} />
                <FieldError msg={fieldErrors.empDoj} />
              </div>

              <div>
                <Label htmlFor="empMail">Email <span className="text-red-500">*</span></Label>
                <Input
                  id="empMail"
                  type="email"
                  value={formState.empMail}
                  onChange={(e) => setField("empMail", e.target.value)}
                  placeholder="employee@company.com"
                  disabled={isSubmitting}
                  className={fieldErrors.empMail ? "border-red-400 focus:border-red-500 focus:ring-red-500/20" : ""}
                />
                <FieldError msg={fieldErrors.empMail} />
              </div>

              <div>
                <Label htmlFor="empPh">Phone Number <span className="text-red-500">*</span></Label>
                <Input
                  id="empPh"
                  value={formState.empPh}
                  onChange={(e) => setField("empPh", e.target.value.replace(/\D/g, "").slice(0, 10))}
                  placeholder="10-digit mobile number"
                  maxLength={10}
                  disabled={isSubmitting}
                  className={fieldErrors.empPh ? "border-red-400 focus:border-red-500 focus:ring-red-500/20" : ""}
                />
                <FieldError msg={fieldErrors.empPh} />
              </div>

              <div>
                <Label htmlFor="status">Status</Label>
                {isEditing ? (
                  <select
                    id="status"
                    value={formState.status}
                    onChange={(e) => setField("status", e.target.value)}
                    disabled={isSubmitting}
                    className={selectClass}
                  >
                    <option value="1">Active</option>
                    <option value="0">Inactive</option>
                  </select>
                ) : (
                  <div className="flex h-10 items-center">
                    <StatusBadge status="1" />
                  </div>
                )}
              </div>

              {/* ── Address ─────────────────────────────────────────────────── */}
              <SectionHeading title="Address" />

              <div>
                <Label htmlFor="empAddress1">Address Line 1 <span className="text-red-500">*</span></Label>
                <Input id="empAddress1" value={formState.empAddress1} onChange={(e) => setField("empAddress1", e.target.value)} placeholder="Street address" disabled={isSubmitting}
                  className={fieldErrors.empAddress1 ? "border-red-400 focus:border-red-500 focus:ring-red-500/20" : ""} />
                <FieldError msg={fieldErrors.empAddress1} />
              </div>

              <div>
                <Label htmlFor="empAddress2">Address Line 2 <span className="text-red-500">*</span></Label>
                <Input id="empAddress2" value={formState.empAddress2} onChange={(e) => setField("empAddress2", e.target.value)} placeholder="Apartment, suite, etc." disabled={isSubmitting}
                  className={fieldErrors.empAddress2 ? "border-red-400 focus:border-red-500 focus:ring-red-500/20" : ""} />
                <FieldError msg={fieldErrors.empAddress2} />
              </div>

              <div className="md:col-span-2">
                <Label htmlFor="empAddress3">City / State / PIN <span className="text-red-500">*</span></Label>
                <Input id="empAddress3" value={formState.empAddress3} onChange={(e) => setField("empAddress3", e.target.value)} placeholder="City, state, PIN code" disabled={isSubmitting}
                  className={fieldErrors.empAddress3 ? "border-red-400 focus:border-red-500 focus:ring-red-500/20" : ""} />
                <FieldError msg={fieldErrors.empAddress3} />
              </div>

              {/* ── Tax & Compliance ──────────────────────────────────────────── */}
              <SectionHeading title="Tax & Compliance" />

              <div>
                <Label htmlFor="empPan">PAN <span className="text-red-500">*</span></Label>
                <Input
                  id="empPan"
                  value={formState.empPan}
                  onChange={(e) => setField("empPan", e.target.value.toUpperCase())}
                  placeholder="AAAAA9999A"
                  maxLength={10}
                  disabled={isSubmitting}
                  className={fieldErrors.empPan ? "border-red-400 focus:border-red-500 focus:ring-red-500/20" : ""}
                />
                <FieldError msg={fieldErrors.empPan} />
              </div>

              <div>
                <Label htmlFor="empAdhar">Aadhaar Number <span className="text-red-500">*</span></Label>
                <Input
                  id="empAdhar"
                  value={formState.empAdhar}
                  onChange={(e) => setField("empAdhar", e.target.value.replace(/\D/g, "").slice(0, 12))}
                  placeholder="12-digit Aadhaar number"
                  maxLength={12}
                  disabled={isSubmitting}
                  className={fieldErrors.empAdhar ? "border-red-400 focus:border-red-500 focus:ring-red-500/20" : ""}
                />
                <FieldError msg={fieldErrors.empAdhar} />
              </div>

              {/* ── Bank Details ──────────────────────────────────────────────── */}
              <SectionHeading title="Bank Details" />

              <div>
                <Label htmlFor="empAccName">Account Holder Name <span className="text-red-500">*</span></Label>
                <Input id="empAccName" value={formState.empAccName} onChange={(e) => setField("empAccName", e.target.value)} placeholder="Full name on bank account" disabled={isSubmitting}
                  className={fieldErrors.empAccName ? "border-red-400 focus:border-red-500 focus:ring-red-500/20" : ""} />
                <FieldError msg={fieldErrors.empAccName} />
              </div>

              <div>
                <Label htmlFor="empBankName">Bank Name <span className="text-red-500">*</span></Label>
                <Input id="empBankName" value={formState.empBankName} onChange={(e) => setField("empBankName", e.target.value)} placeholder="e.g., HDFC Bank, ICICI Bank" disabled={isSubmitting}
                  className={fieldErrors.empBankName ? "border-red-400 focus:border-red-500 focus:ring-red-500/20" : ""} />
                <FieldError msg={fieldErrors.empBankName} />
              </div>

              <div>
                <Label htmlFor="empAccNo">Account Number <span className="text-red-500">*</span></Label>
                <Input id="empAccNo" value={formState.empAccNo} onChange={(e) => setField("empAccNo", e.target.value)} placeholder="Bank account number" disabled={isSubmitting}
                  className={fieldErrors.empAccNo ? "border-red-400 focus:border-red-500 focus:ring-red-500/20" : ""} />
                <FieldError msg={fieldErrors.empAccNo} />
              </div>

              <div>
                <Label htmlFor="empIfscCode">IFSC Code <span className="text-red-500">*</span></Label>
                <Input
                  id="empIfscCode"
                  value={formState.empIfscCode}
                  onChange={(e) => setField("empIfscCode", e.target.value.toUpperCase())}
                  placeholder="e.g., HDFC0000089"
                  maxLength={11}
                  disabled={isSubmitting}
                  className={fieldErrors.empIfscCode ? "border-red-400 focus:border-red-500 focus:ring-red-500/20" : ""}
                />
                <FieldError msg={fieldErrors.empIfscCode} />
                <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">11 characters: Bank code (4) + 0 + Branch code (6)</p>
              </div>

            </div>

            {/* ── Form Actions ─────────────────────────────────────────────── */}
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
                {isSubmitting ? "Saving..." : isEditing ? "Update Employee" : "Create Employee"}
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

        {/* ── Search & Filter Bar ──────────────────────────────────────────── */}
        <div className="mb-4 flex flex-wrap items-center gap-3">
          <div className="relative flex-1 min-w-[200px]">
            <svg className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 size-4 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <circle cx="11" cy="11" r="8" /><path d="M21 21l-4.35-4.35" strokeLinecap="round" />
            </svg>
            <input type="text" value={searchQuery} onChange={(e) => handleSearch(e.target.value)}
              placeholder="Search by name, email, phone, PAN or ID…"
              className="h-10 w-full rounded-lg border border-gray-200 bg-white pl-9 pr-4 text-sm text-gray-700 outline-none focus:border-brand-500 dark:border-gray-700 dark:bg-gray-900 dark:text-gray-200 dark:placeholder:text-gray-500"
            />
          </div>
          <select value={filterStatus} onChange={(e) => handleFilterStatus(e.target.value as "all" | "1" | "0")}
            className="h-10 rounded-lg border border-gray-200 bg-white px-3 text-sm text-gray-700 outline-none dark:border-gray-700 dark:bg-gray-900 dark:text-gray-200">
            <option value="all">All Status</option>
            <option value="1">Active</option>
            <option value="0">Inactive</option>
          </select>
          <select value={filterPosition} onChange={(e) => handleFilterPosition(e.target.value as "all" | "assigned" | "none")}
            className="h-10 rounded-lg border border-gray-200 bg-white px-3 text-sm text-gray-700 outline-none dark:border-gray-700 dark:bg-gray-900 dark:text-gray-200">
            <option value="all">All Positions</option>
            <option value="assigned">Assigned</option>
            <option value="none">No Position</option>
          </select>
          <span className="text-xs text-gray-400 whitespace-nowrap">
            {filteredRows.length} of {rows.length} employee{rows.length !== 1 ? "s" : ""}
          </span>
        </div>

        {/* ── Employee Table ────────────────────────────────────────────────── */}
        <div className="overflow-x-auto rounded-xl border border-gray-200 dark:border-gray-800">
          <Table>
            <TableHeader className="bg-gray-50 dark:bg-white/[0.03]">
              <TableRow>
                {["ID", "Name", "Email", "Phone", "PAN", "Bank", "Position", "Status", "Actions"].map((h) => (
                  <TableCell
                    key={h}
                    isHeader
                    className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-gray-600 dark:text-gray-300"
                  >
                    {h}
                  </TableCell>
                ))}
              </TableRow>
            </TableHeader>

            <TableBody className="divide-y divide-gray-100 dark:divide-gray-800">
              {isLoading && (
                <TableRow>
                  <TableCell colSpan={9} className="px-4 py-8 text-center text-sm text-gray-500">
                    <div className="flex items-center justify-center gap-2">
                      <svg className="h-4 w-4 animate-spin text-brand-500" fill="none" viewBox="0 0 24 24">
                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8H4z" />
                      </svg>
                      Loading employees…
                    </div>
                  </TableCell>
                </TableRow>
              )}

              {!isLoading && rows.length === 0 && (
                <TableRow>
                  <TableCell colSpan={9} className="px-4 py-8 text-center text-sm text-gray-500 dark:text-gray-400">
                    No employees found. Click "Add Employee" to create your first one.
                  </TableCell>
                </TableRow>
              )}

              {!isLoading && rows.length > 0 && filteredRows.length === 0 && (
                <TableRow>
                  <TableCell colSpan={9} className="px-4 py-10 text-center text-sm text-gray-400 dark:text-gray-500">
                    No employees match your search or filters.
                    <button type="button" onClick={() => { setSearchQuery(""); setFilterStatus("all"); setFilterPosition("all"); }}
                      className="ml-2 text-brand-500 underline underline-offset-2 hover:no-underline">Clear filters</button>
                  </TableCell>
                </TableRow>
              )}

              {!isLoading &&
                pagedRows.map((row) => {
                  const hasPosition = hasActivePosition(row.id);
                  return (
                    <TableRow
                      key={row.id}
                      className="transition-colors hover:bg-brand-50/60 dark:hover:bg-brand-500/5"
                    >
                      <TableCell className="px-4 py-3 text-sm font-medium text-brand-600 dark:text-brand-400">{row.id}</TableCell>
                      <TableCell className="px-4 py-3 text-sm font-medium text-gray-800 dark:text-white">
                        {`${row.empName ?? ""} ${row.empLastName ?? ""}`.trim() || "—"}
                      </TableCell>
                      <TableCell className="max-w-[180px] truncate px-4 py-3 text-sm text-gray-600 dark:text-gray-300">{row.empMail || "—"}</TableCell>
                      <TableCell className="px-4 py-3 text-sm text-gray-600 dark:text-gray-300">{row.empPh || "—"}</TableCell>
                      <TableCell className="px-4 py-3 text-sm font-mono text-gray-600 dark:text-gray-300">{row.empPan || "—"}</TableCell>
                      <TableCell className="px-4 py-3 text-sm text-gray-600 dark:text-gray-300">{row.empBankName || "—"}</TableCell>

                      <TableCell className="px-4 py-3">
                        {hasPosition ? (
                          <span className="inline-flex items-center gap-1 rounded-full bg-green-50 px-2 py-0.5 text-xs font-medium text-green-700 dark:bg-green-500/10 dark:text-green-400">
                            <span className="size-1.5 rounded-full bg-green-500" /> Assigned
                          </span>
                        ) : (
                          <NoPositionBadge />
                        )}
                      </TableCell>

                      <TableCell className="px-4 py-3">
                        <StatusBadge status={row.status} />
                      </TableCell>

                      <TableCell className="px-4 py-3 text-sm" onClick={(e) => e.stopPropagation()}>
                        <div className="flex flex-wrap items-center gap-1.5">

                          {/* Payslip */}
                          <button
                            type="button"
                            onClick={() => handleOpenPayslips(row)}
                            title={hasPosition ? "View payslips" : "No position assigned — payslip unavailable"}
                            className={`inline-flex items-center justify-center gap-1 rounded-md border px-2.5 py-1.5 text-xs font-medium transition-colors ${
                              hasPosition
                                ? "border-teal-300 text-teal-600 hover:bg-teal-50 dark:border-teal-700 dark:text-teal-400 dark:hover:bg-teal-500/10"
                                : "cursor-not-allowed border-gray-200 text-gray-400 dark:border-gray-700 dark:text-gray-600"
                            }`}
                          >
                            {!hasPosition && (
                              <svg className="size-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                                <path strokeLinecap="round" strokeLinejoin="round" d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
                              </svg>
                            )}
                            Payslips
                          </button>

                          {/* Download Employee PDF */}
                          <button
                            type="button"
                            onClick={() => handleDownloadEmpPDF(row)}
                            title="Download employee details as PDF"
                            className="inline-flex items-center justify-center gap-1 rounded-md border border-indigo-300 px-2.5 py-1.5 text-xs font-medium text-indigo-600 hover:bg-indigo-50 dark:border-indigo-700 dark:text-indigo-400 dark:hover:bg-indigo-500/10"
                          >
                            <svg className="size-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                              <path strokeLinecap="round" strokeLinejoin="round" d="M12 10v6m0 0l-3-3m3 3l3-3M3 17V7a2 2 0 012-2h6l2 2h4a2 2 0 012 2v8a2 2 0 01-2 2H5a2 2 0 01-2-2z" />
                            </svg>
                            PDF
                          </button>

                          {/* Toggle Status */}
                          <button
                            type="button"
                            onClick={() => void handleToggleStatus(row)}
                            disabled={isSubmitting}
                            title={row.status === "1" ? "Deactivate employee" : "Activate employee"}
                            className={`inline-flex items-center justify-center rounded-md border px-2.5 py-1.5 text-xs font-medium disabled:opacity-50 transition-colors ${
                              row.status === "1"
                                ? "border-amber-300 text-amber-600 hover:bg-amber-50 dark:border-amber-700 dark:text-amber-400 dark:hover:bg-amber-500/10"
                                : "border-green-300 text-green-600 hover:bg-green-50 dark:border-green-700 dark:text-green-400 dark:hover:bg-green-500/10"
                            }`}
                          >
                            {row.status === "1" ? "Deactivate" : "Activate"}
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

                          {/* Delete */}
                          <button
                            type="button"
                            onClick={() => void handleDelete(row.id!)}
                            disabled={isSubmitting}
                            className="inline-flex items-center justify-center rounded-md border border-error-300 px-2.5 py-1.5 text-xs font-medium text-error-600 hover:bg-error-50 disabled:opacity-50 dark:border-error-800 dark:text-error-400 dark:hover:bg-error-500/10"
                          >
                            Delete
                          </button>
                        </div>
                      </TableCell>
                    </TableRow>
                  );
                })}
            </TableBody>
          </Table>
        </div>

        {/* ── Pagination ───────────────────────────────────────────────────── */}
        {!isLoading && filteredRows.length > PAGE_SIZE && (
          <div className="mt-4 flex items-center justify-between gap-4">
            <p className="text-xs text-gray-400 dark:text-gray-500">
              Showing {(currentPage - 1) * PAGE_SIZE + 1}–{Math.min(currentPage * PAGE_SIZE, filteredRows.length)} of {filteredRows.length}
            </p>
            <div className="flex items-center gap-1">
              <button type="button" onClick={() => setCurrentPage((p) => Math.max(1, p - 1))} disabled={currentPage === 1}
                className="inline-flex h-8 w-8 items-center justify-center rounded border border-gray-200 text-gray-500 hover:bg-gray-50 disabled:opacity-40 dark:border-gray-700 dark:text-gray-400">
                <svg className="size-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path d="M15 18l-6-6 6-6" strokeLinecap="round" strokeLinejoin="round" /></svg>
              </button>
              {Array.from({ length: totalPages }, (_, i) => i + 1)
                .filter((p) => p === 1 || p === totalPages || Math.abs(p - currentPage) <= 1)
                .reduce<(number | "...")[]>((acc, p, idx, arr) => {
                  if (idx > 0 && p - (arr[idx - 1] as number) > 1) acc.push("...");
                  acc.push(p); return acc;
                }, [])
                .map((p, i) =>
                  p === "..." ? <span key={`e${i}`} className="px-1 text-xs text-gray-400">…</span> : (
                    <button key={p} type="button" onClick={() => setCurrentPage(p as number)}
                      className={`inline-flex h-8 w-8 items-center justify-center rounded border text-xs font-medium transition-colors ${
                        currentPage === p
                          ? "border-brand-500 bg-brand-500 text-white"
                          : "border-gray-200 text-gray-600 hover:bg-gray-50 dark:border-gray-700 dark:text-gray-400"
                      }`}>{p}</button>
                  )
                )}
              <button type="button" onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))} disabled={currentPage === totalPages}
                className="inline-flex h-8 w-8 items-center justify-center rounded border border-gray-200 text-gray-500 hover:bg-gray-50 disabled:opacity-40 dark:border-gray-700 dark:text-gray-400">
                <svg className="size-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path d="M9 18l6-6-6-6" strokeLinecap="round" strokeLinejoin="round" /></svg>
              </button>
            </div>
          </div>
        )}
        {!isLoading && rows.length > 0 && (
          <p className="mt-2 text-xs text-gray-400 dark:text-gray-500">
            {rows.length} total employee{rows.length !== 1 ? "s" : ""}
          </p>
        )}

      </ComponentCard>
    </>
  );
}