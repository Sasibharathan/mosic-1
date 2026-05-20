import { type FormEvent, useCallback, useEffect, useState } from "react";
import PageMeta from "../../components/common/PageMeta";
import PageBreadcrumb from "../../components/common/PageBreadCrumb";
import ComponentCard from "../../components/common/ComponentCard";
import Label from "../../components/form/Label";
import Input from "../../components/form/input/InputField";
import { usePermissions } from "../../hooks/usePermissions";
import {
  Table,
  TableBody,
  TableCell,
  TableHeader,
  TableRow,
} from "../../components/ui/table";
import { Modal } from "../../components/ui/modal";
import axiosInstance from "../../utils/axiosInstance";
import EmpPositionDetailPage from "../HR/Emppositiondetailpage";
import React from "react";

// ─── Constants ────────────────────────────────────────────────────────────────

const POSITION_URL = "/api/emp-position";
const EMP_URL      = "/api/employees";

const selectClass =
  "h-10 w-full rounded-lg border border-gray-300 bg-white px-3 text-sm text-gray-800 outline-none transition-colors focus:border-brand-500 focus:ring-2 focus:ring-brand-500/20 dark:border-gray-700 dark:bg-gray-900 dark:text-white";

const DEPARTMENTS = [
  "Engineering", "Human Resources", "Finance", "Sales",
  "Marketing", "Operations", "Legal", "Product", "Design", "Support",
];

const ROLES = [
  "Intern", "Junior", "Mid-level", "Senior", "Lead", "Manager",
  "Senior Manager", "Director", "VP", "C-Level",
];

// ─── Types ────────────────────────────────────────────────────────────────────

export type EmpPositionDTO = {
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
};

export type EmpDTO = {
  id: number;
  empName: string;
  empLastName: string;
  empEmail?: string;
  empPhone?: string;
  empMail?: string;
  empPh?: string;
  empAddress1?: string;
  empAddress2?: string;
  empAddress3?: string;
  empDoj?: string;
  status?: string;
};

type ReportingEmp = {
  id: number;
  fullName: string;
};

type EmpPositionGroup = {
  empId: number;
  latest: EmpPositionDTO;
  history: EmpPositionDTO[];
};

// ─── Helpers ──────────────────────────────────────────────────────────────────

const createEmptyForm = (): EmpPositionDTO => ({
  id: null, empId: null, epDate: "", epEfficientDate: "",
  position: "", department: "", role: "", reportingTo: "",
  empBasic: "", empHra: "", empAllowance: "", empMonthGross: "",
  empCtc: "", empTds: "", empPt: "", empLoans: "",
  activeStatus: "1", status: "1",
});

const toNum = (v: string) => parseFloat(v) || 0;

export const fmt = (v: string | number | null | undefined) =>
  v && Number(v) > 0 ? `₹ ${Number(v).toLocaleString("en-IN")}` : "—";

export const fmtDate = (d: string | undefined | null) => {
  if (!d) return "—";
  const parts = d.includes("-") ? d.split("-") : d.split("/");
  if (parts.length !== 3) return d;
  if (parts[0].length === 2) return d;
  const [y, m, day] = parts;
  return `${day}-${m}-${y}`;
};

const getAxiosErrorMessage = (err: unknown): string => {
  if (err && typeof err === "object" && "response" in err) {
    const res = (err as any).response;
    return res?.data?.message ?? res?.data?.error ?? "An error occurred";
  }
  return "Network error — please try again";
};

const groupByEmployee = (rows: EmpPositionDTO[]): EmpPositionGroup[] => {
  const map: Record<number, EmpPositionDTO[]> = {};
  rows.forEach((r) => {
    if (r.empId === null) return;
    if (!map[r.empId]) map[r.empId] = [];
    map[r.empId].push(r);
  });
  return Object.values(map).map((list) => {
    const sorted = [...list].sort((a, b) => (b.id ?? 0) - (a.id ?? 0));
    return { empId: sorted[0].empId as number, latest: sorted[0], history: sorted.slice(1) };
  });
};

// ─── Status Badge ─────────────────────────────────────────────────────────────

export const StatusBadge = ({ status }: { status: string }) => {
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

// ─── Section Heading ──────────────────────────────────────────────────────────

const SectionHeading = ({ title, subtitle }: { title: string; subtitle?: string }) => (
  <div className="mb-3 border-b border-gray-200 pb-2 dark:border-gray-700">
    <p className="text-xs font-semibold uppercase tracking-widest text-gray-500 dark:text-gray-400">{title}</p>
    {subtitle && <p className="mt-0.5 text-xs text-gray-400 dark:text-gray-500">{subtitle}</p>}
  </div>
);

// ─── Employee Confirm Card ────────────────────────────────────────────────────

const EmpConfirmCard = ({
  emp, onConfirm, onClear,
}: { emp: EmpDTO; onConfirm: () => void; onClear: () => void }) => {
  const initials = `${emp.empName?.[0] ?? ""}${emp.empLastName?.[0] ?? ""}`.toUpperCase();
  return (
    <div className="mt-3 rounded-lg border border-brand-200 bg-brand-50 p-4 dark:border-brand-800 dark:bg-brand-500/10">
      <p className="mb-3 text-xs font-semibold uppercase tracking-widest text-brand-600 dark:text-brand-400">
        Confirm Employee
      </p>
      <div className="flex items-center gap-4">
        <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-full bg-brand-500 text-sm font-bold text-white">
          {initials}
        </div>
        <div className="flex-1 min-w-0">
          <p className="truncate font-semibold text-gray-800 dark:text-white">{emp.empName} {emp.empLastName}</p>
          <p className="text-xs text-gray-500 dark:text-gray-400">
            ID: <span className="font-medium text-brand-600 dark:text-brand-400">#{emp.id}</span>
          </p>
          {(emp.empEmail || emp.empMail) && (
            <p className="truncate text-xs text-gray-500">{emp.empEmail ?? emp.empMail}</p>
          )}
        </div>
        <div className="flex flex-col gap-2 shrink-0">
          <button type="button" onClick={onConfirm}
            className="inline-flex items-center gap-1.5 rounded-lg bg-brand-500 px-3 py-1.5 text-xs font-semibold text-white hover:bg-brand-600">
            <svg className="size-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2.5}>
              <polyline points="20 6 9 17 4 12" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
            Yes, correct
          </button>
          <button type="button" onClick={onClear}
            className="inline-flex items-center gap-1.5 rounded-lg border border-gray-300 px-3 py-1.5 text-xs font-medium text-gray-600 hover:bg-gray-100 dark:border-gray-700 dark:text-gray-400">
            <svg className="size-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2.5}>
              <path d="M18 6L6 18M6 6l12 12" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
            Wrong employee
          </button>
        </div>
      </div>
    </div>
  );
};

// ─── Field Error ──────────────────────────────────────────────────────────────

const FieldError = ({ msg }: { msg?: string }) =>
  msg ? <p className="mt-1 text-xs text-red-500 dark:text-red-400">{msg}</p> : null;

// ─── Main Page ────────────────────────────────────────────────────────────────

export default function EmpPositionPage() {
  const { canCreate, canEdit, canDelete } = usePermissions();

  const [rows, setRows]                     = useState<EmpPositionDTO[]>([]);
  const [employees, setEmployees]           = useState<EmpDTO[]>([]);
  const [reportingEmps, setReportingEmps]   = useState<ReportingEmp[]>([]);
  const [formState, setFormState]           = useState<EmpPositionDTO>(createEmptyForm());
  const [editingId, setEditingId]           = useState<number | null>(null);
  const [showForm, setShowForm]             = useState(false);
  const [isLoading, setIsLoading]           = useState(false);
  const [isSubmitting, setIsSubmitting]     = useState(false);
  const [errorMessage, setErrorMessage]     = useState("");
  const [successMessage, setSuccessMessage] = useState("");
  const [expandedEmpIds, setExpandedEmpIds] = useState<Set<number>>(new Set());
  const [empPickState, setEmpPickState]     = useState<EmpDTO | "confirmed" | null>(null);
  const [promotionForEmpId, setPromotionForEmpId] = useState<number | null>(null);

  // null = main list, number = show detail sub-page for that empId
  const [detailEmpId, setDetailEmpId] = useState<number | null>(null);

  // Field-level validation errors
  const [fieldErrors, setFieldErrors] = useState<Partial<Record<keyof EmpPositionDTO | "empConfirm", string>>>({});

  const isEditing    = editingId !== null;
  const isPromotion  = promotionForEmpId !== null;
  const empConfirmed = empPickState === "confirmed";

  // ─── Search / Filter ────────────────────────────────────────────────────────
  const [searchQuery, setSearchQuery]       = useState("");
  const [filterDept, setFilterDept]         = useState("all");
  const [filterRole, setFilterRole]         = useState("all");
  const [filterStatus, setFilterStatus]     = useState("all");
  const [posCurrentPage, setPosCurrentPage] = useState(1);
  const POS_PAGE_SIZE = 10;

  const clearMessages     = () => { setErrorMessage(""); setSuccessMessage(""); };
  const clearFieldErrors  = () => setFieldErrors({});

  const setField = <K extends keyof EmpPositionDTO>(field: K, value: EmpPositionDTO[K]) => {
    setFormState((prev) => ({ ...prev, [field]: value }));
    setFieldErrors((prev) => { const n = { ...prev }; delete n[field]; return n; });
  };

  const recalc = (patch: Partial<EmpPositionDTO>) => {
    setFormState((prev) => {
      const next   = { ...prev, ...patch };
      const gross  = toNum(next.empBasic) + toNum(next.empHra) + toNum(next.empAllowance);
      const deduct = toNum(next.empTds) + toNum(next.empPt) + toNum(next.empLoans);
      return {
        ...next,
        empMonthGross: gross > 0 ? String(gross) : "",
        empCtc: gross > 0 ? String(gross * 12 - deduct * 12) : "",
      };
    });
    if ("empBasic" in patch) {
      setFieldErrors((prev) => { const n = { ...prev }; delete n.empBasic; return n; });
    }
  };

  const buildReportingEmps = useCallback(
    (allEmployees: EmpDTO[], positions: EmpPositionDTO[]) => {
      const activeIds = new Set<number>();
      positions.forEach((pos) => {
        if (pos.empId !== null &&
            (pos.activeStatus === "1" || pos.activeStatus === "ACTIVE") &&
            (pos.status === "1" || pos.status === "ACTIVE")) {
          activeIds.add(pos.empId);
        }
      });
      setReportingEmps(
        allEmployees
          .filter((e) => activeIds.has(e.id))
          .map((e) => ({ id: e.id, fullName: `${e.empName} ${e.empLastName}` })),
      );
    }, [],
  );

  const employeesWithoutPosition = (() => {
    const assignedIds = new Set(
      rows.filter((r) => r.activeStatus === "1" || r.activeStatus === "ACTIVE")
          .map((r) => r.empId).filter(Boolean),
    );
    return employees.filter((e) =>
      !assignedIds.has(e.id) && (e.status === "1" || e.status === "ACTIVE")
    );
  })();

  const availableEmpIds = new Set(
    employees.filter((e) => e.status === "1" || e.status === "ACTIVE").map((e) => e.id)
  );

  const allGroups: EmpPositionGroup[] = groupByEmployee(
    rows.filter((r) => r.empId !== null && availableEmpIds.has(r.empId as number))
  );

  // ─── Search / Filter / Pagination ──────────────────────────────────────────
  const filteredGroups = allGroups.filter((g) => {
    const e = employees.find((emp) => emp.id === g.empId);
    const empName = e ? `${e.empName} ${e.empLastName}`.toLowerCase() : "";
    const q = searchQuery.toLowerCase();
    const matchSearch  = !q || empName.includes(q) || (g.latest.position ?? "").toLowerCase().includes(q) || String(g.empId).includes(q);
    const matchDept    = filterDept   === "all" || g.latest.department === filterDept;
    const matchRole    = filterRole   === "all" || g.latest.role       === filterRole;
    const matchStatus  = filterStatus === "all"
      || (filterStatus === "active"   && (g.latest.activeStatus === "1" || g.latest.activeStatus === "ACTIVE"))
      || (filterStatus === "inactive" && g.latest.activeStatus !== "1" && g.latest.activeStatus !== "ACTIVE");
    return matchSearch && matchDept && matchRole && matchStatus;
  });

  const posTotalPages = Math.max(1, Math.ceil(filteredGroups.length / POS_PAGE_SIZE));
  const pagedGroups   = filteredGroups.slice((posCurrentPage - 1) * POS_PAGE_SIZE, posCurrentPage * POS_PAGE_SIZE);
  const allDepts      = Array.from(new Set(allGroups.map((g) => g.latest.department).filter(Boolean)));
  const allRoles      = Array.from(new Set(allGroups.map((g) => g.latest.role).filter(Boolean)));

  // ─── CSV Export ────────────────────────────────────────────────────────────
  const handleExportCSV = () => {
    const headers = ["ID", "Employee", "Position", "Department", "Role", "Eff. Date", "Status"];
    const csvRows = filteredGroups.map((g) => {
      const e = employees.find((emp) => emp.id === g.empId);
      const name = e ? `${e.empName} ${e.empLastName}` : `Emp #${g.empId}`;
      return [
        g.latest.id, name, g.latest.position || "", g.latest.department || "",
        g.latest.role || "", g.latest.epEfficientDate || "",
        g.latest.activeStatus === "1" || g.latest.activeStatus === "ACTIVE" ? "Active" : "Inactive",
      ].map((v) => `"${String(v).replace(/"/g, '""')}"`).join(",");
    });
    const csv  = [headers.join(","), ...csvRows].join("\n");
    const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
    const url  = URL.createObjectURL(blob);
    const a    = document.createElement("a");
    a.href = url; a.download = "employee_positions.csv"; a.click();
    URL.revokeObjectURL(url);
  };

  const fetchRows = useCallback(async () => {
    setIsLoading(true);
    try {
      const res = await axiosInstance.get<EmpPositionDTO[]>(POSITION_URL);
      setRows(res.data);
      buildReportingEmps(employees, res.data);
    } catch (err) {
      setErrorMessage(getAxiosErrorMessage(err));
    } finally {
      setIsLoading(false);
    }
  }, [employees, buildReportingEmps]);

  useEffect(() => {
    const init = async () => {
      try {
        const [posRes, empRes] = await Promise.allSettled([
          axiosInstance.get<EmpPositionDTO[]>(POSITION_URL),
          axiosInstance.get<EmpDTO[]>(EMP_URL),
        ]);
        const positions = posRes.status === "fulfilled" ? posRes.value.data : [];
        const emps      = empRes.status === "fulfilled" ? empRes.value.data : [];
        if (posRes.status === "fulfilled") setRows(positions);
        else setErrorMessage("Failed to load positions.");
        if (empRes.status === "fulfilled") setEmployees(emps);
        buildReportingEmps(emps, positions);
      } finally {
        setIsLoading(false);
      }
    };
    setIsLoading(true);
    void init();
  }, [buildReportingEmps]);

  const getEmpName = (empId: number | null) => {
    if (!empId) return "—";
    const e = employees.find((e) => e.id === empId);
    return e ? `${e.empName} ${e.empLastName}` : `Emp #${empId}`;
  };

  const toggleHistory = (empId: number) => {
    setExpandedEmpIds((prev) => {
      const next = new Set(prev);
      if (next.has(empId)) next.delete(empId); else next.add(empId);
      return next;
    });
  };

  // ── Form helpers ────────────────────────────────────────────────────────────

  const openCreateForm = () => {
    setEditingId(null); setPromotionForEmpId(null);
    setFormState(createEmptyForm()); setEmpPickState(null);
    clearFieldErrors(); clearMessages(); setShowForm(true);
  };

  const openEditForm = (row: EmpPositionDTO) => {
    setEditingId(row.id); setPromotionForEmpId(null);
    setFormState({ ...row }); setEmpPickState("confirmed");
    clearFieldErrors(); clearMessages(); setShowForm(true);
  };

  const openPromotionForm = (row: EmpPositionDTO) => {
    setEditingId(null); setPromotionForEmpId(row.empId);
    setFormState({ ...createEmptyForm(), empId: row.empId, department: row.department, reportingTo: row.reportingTo });
    setEmpPickState("confirmed");
    clearFieldErrors(); clearMessages(); setShowForm(true);
  };

  const handleCancelForm = () => {
    setEditingId(null); setPromotionForEmpId(null);
    setFormState(createEmptyForm()); setEmpPickState(null);
    clearFieldErrors(); setShowForm(false);
  };

  const handleEmpSelect = (empId: number | null) => {
    if (!empId) { setEmpPickState(null); setField("empId", null); return; }
    setField("empId", empId);
    setEmpPickState(employees.find((e) => e.id === empId) ?? null);
  };

  const handleEmpConfirm = () => {
    setEmpPickState("confirmed");
    setFieldErrors((prev) => { const n = { ...prev }; delete n.empConfirm; return n; });
  };

  const handleEmpClear = () => { setField("empId", null); setEmpPickState(null); };

  // ── Validation ──────────────────────────────────────────────────────────────

  const validate = (): boolean => {
    const errs: typeof fieldErrors = {};

    if (!formState.empId || empPickState !== "confirmed")
      errs.empConfirm = "Please select and confirm an employee.";

    if (!formState.position.trim())
      errs.position = "Position / Designation is required.";

    if (!formState.epEfficientDate)
      errs.epEfficientDate = "Effective date is required.";

    // Basic salary is mandatory; must be > 0
    const basicNum = toNum(formState.empBasic);
    if (!formState.empBasic || String(formState.empBasic).trim() === "" || basicNum <= 0)
      errs.empBasic = "Basic salary is required and must be greater than 0.";

    // Other salary fields: if entered must be ≥ 0
    if (formState.empHra       && toNum(formState.empHra)       < 0) errs.empHra       = "Cannot be negative.";
    if (formState.empAllowance && toNum(formState.empAllowance) < 0) errs.empAllowance = "Cannot be negative.";
    if (formState.empTds       && toNum(formState.empTds)       < 0) errs.empTds       = "Cannot be negative.";
    if (formState.empPt        && toNum(formState.empPt)        < 0) errs.empPt        = "Cannot be negative.";
    if (formState.empLoans     && toNum(formState.empLoans)     < 0) errs.empLoans     = "Cannot be negative.";

    setFieldErrors(errs);
    return Object.keys(errs).length === 0;
  };

  const handleSubmit = async (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    clearMessages();
    if (!validate()) return;

    setIsSubmitting(true);

    // Sanitise: empty salary strings → "0" (never null/empty to backend)
    const payload = { ...formState };
    (["empBasic","empHra","empAllowance","empMonthGross","empCtc","empTds","empPt","empLoans"] as const)
      .forEach((f) => { if (!payload[f] || String(payload[f]).trim() === "") (payload as any)[f] = "0"; });
    if (!isEditing) delete (payload as any).id;

    try {
      if (isEditing && editingId !== null) {
        await axiosInstance.put(`${POSITION_URL}/${editingId}`, payload);
        setSuccessMessage("Position updated successfully.");
      } else {
        await axiosInstance.post(POSITION_URL, payload);
        setSuccessMessage(isPromotion
          ? `Promotion recorded for ${getEmpName(formState.empId)}.`
          : "Position assigned successfully.",
        );
      }
      handleCancelForm();
      await fetchRows();
    } catch (err) {
      setErrorMessage(getAxiosErrorMessage(err));
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDeactivate = async (id: number) => {
    if (!window.confirm(`Deactivate position record #${id}?`)) return;
    clearMessages();
    setIsSubmitting(true);
    try {
      await axiosInstance.patch(`${POSITION_URL}/${id}/deactivate`);
      if (editingId === id) handleCancelForm();
      setSuccessMessage("Position deactivated.");
      await fetchRows();
    } catch (err) {
      setErrorMessage(getAxiosErrorMessage(err));
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleReactivate = async (id: number) => {
    if (!window.confirm(`Reactivate position record #${id}?`)) return;
    clearMessages();
    setIsSubmitting(true);
    try {
      await axiosInstance.patch(`${POSITION_URL}/${id}/reactivate`);
      setSuccessMessage("Position reactivated.");
      await fetchRows();
    } catch (err) {
      setErrorMessage(getAxiosErrorMessage(err));
    } finally {
      setIsSubmitting(false);
    }
  };

  const modalTitle    = isEditing ? "Edit Position" : isPromotion ? `Promote — ${getEmpName(promotionForEmpId)}` : "Assign Position";
  const modalSubtitle = isEditing ? `Editing record #${editingId}` : isPromotion ? "Fill all fields including salary — none will be stored as null." : "Select an employee and fill in position + salary details.";

  // ── Detail sub-page ─────────────────────────────────────────────────────────
  if (detailEmpId !== null) {
    return (
      <EmpPositionDetailPage
        empId={detailEmpId}
        employees={employees}
        rows={rows}
        onBack={() => setDetailEmpId(null)}
      />
    );
  }

  // ── Main render ─────────────────────────────────────────────────────────────
  return (
    <>
      <PageMeta title="Employee Positions" description="Manage employee positions, departments and roles" />
      <PageBreadcrumb items={[{ label: "Employees", path: "/employees" }, { label: "Positions" }]} />

      <ComponentCard
        title="Employee Positions"
        desc="Assign positions and record promotions. Click View on any row to see full details, salary, and generate letters."
        headerRight={
          canCreate ? (
            <button type="button" onClick={openCreateForm}
              className="inline-flex items-center gap-1.5 rounded-md bg-brand-500 px-3 py-1.5 text-sm font-medium text-white hover:bg-brand-600">
              <svg className="size-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2.5}>
                <path d="M12 5v14M5 12h14" strokeLinecap="round" strokeLinejoin="round" />
              </svg>
              Assign Position
            </button>
          ) : null
        }
      >
        {/* Messages */}
        {successMessage && (
          <div className="mb-4 flex items-center gap-2 rounded-lg border border-green-200 bg-green-50 px-3 py-2 text-sm text-green-700 dark:border-green-800 dark:bg-green-500/10 dark:text-green-400">
            <svg className="size-4 shrink-0" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2.5}>
              <polyline points="20 6 9 17 4 12" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
            {successMessage}
          </div>
        )}
        {errorMessage && (
          <div className="mb-4 flex items-center gap-2 rounded border border-red-200 bg-red-50 px-3 py-2 text-xs text-red-700 dark:border-red-800 dark:bg-red-500/10 dark:text-red-400">
            <svg className="size-4 shrink-0" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}>
              <circle cx="12" cy="12" r="10" /><path d="M12 8v4M12 16h.01" strokeLinecap="round" />
            </svg>
            {errorMessage}
          </div>
        )}

        {/* No-position banner */}
        {employeesWithoutPosition.length > 0 && !isLoading && (
          <div className="mb-4 flex items-start gap-3 rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 dark:border-amber-800 dark:bg-amber-500/10">
            <svg className="mt-0.5 size-4 shrink-0 text-amber-500" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}>
              <circle cx="12" cy="12" r="10" /><path d="M12 8v4M12 16h.01" strokeLinecap="round" />
            </svg>
            <div className="flex-1 text-sm text-amber-700 dark:text-amber-400">
              <span className="font-semibold">{employeesWithoutPosition.length} employee{employeesWithoutPosition.length !== 1 ? "s" : ""}</span>{" "}
              {employeesWithoutPosition.length === 1 ? "has" : "have"} no position —{" "}
              <span className="font-medium">{employeesWithoutPosition.map((e) => `${e.empName} ${e.empLastName}`).join(", ")}</span>.
              {canCreate && (
                <button type="button" onClick={openCreateForm} className="ml-2 underline underline-offset-2 hover:no-underline">
                  Assign now →
                </button>
              )}
            </div>
          </div>
        )}

        {/* ── Modal ── */}
        <Modal isOpen={showForm} onClose={handleCancelForm} className="mx-4 w-full max-w-3xl p-4 sm:p-6">
          <div className="flex items-start gap-3 pr-10">
            <div className={`mt-0.5 flex h-9 w-9 shrink-0 items-center justify-center rounded-lg ${isPromotion ? "bg-amber-100 dark:bg-amber-500/20" : "bg-brand-100 dark:bg-brand-500/20"}`}>
              <svg className={`size-5 ${isPromotion ? "text-amber-600 dark:text-amber-400" : "text-brand-600 dark:text-brand-400"}`} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}>
                {isPromotion
                  ? <path d="M5 15l7-7 7 7" strokeLinecap="round" strokeLinejoin="round" />
                  : <><rect x="3" y="7" width="18" height="14" rx="2" /><path d="M8 7V5a4 4 0 018 0v2" strokeLinecap="round" /></>
                }
              </svg>
            </div>
            <div>
              <h3 className="text-xl font-semibold text-gray-800 dark:text-white/90">{modalTitle}</h3>
              <p className="mt-0.5 text-sm text-gray-500 dark:text-gray-400">{modalSubtitle}</p>
            </div>
          </div>

          <form onSubmit={(e) => void handleSubmit(e)} className="mt-6 space-y-6">

            {/* Step 1 — Select Employee */}
            {!isEditing && !isPromotion && (
              <div>
                <SectionHeading title="Step 1 — Select Employee" subtitle="Only employees without an active position are listed." />
                {employeesWithoutPosition.length === 0 ? (
                  <div className="rounded-lg border border-dashed border-gray-300 py-6 text-center text-sm text-gray-400 dark:border-gray-700">
                    All employees already have an active position.
                    <br />Use <span className="font-medium">Promote</span> on a row to add a new record.
                  </div>
                ) : (
                  <>
                    <select
                      className={`${selectClass} ${fieldErrors.empConfirm ? "!border-red-400" : ""}`}
                      value={formState.empId ?? ""}
                      onChange={(e) => handleEmpSelect(e.target.value ? Number(e.target.value) : null)}
                      disabled={isSubmitting || empConfirmed}
                    >
                      <option value="">— Select an employee —</option>
                      {employeesWithoutPosition.map((emp) => (
                        <option key={emp.id} value={emp.id}>{emp.empName} {emp.empLastName} (#{emp.id})</option>
                      ))}
                    </select>
                    <FieldError msg={fieldErrors.empConfirm} />

                    {empPickState && empPickState !== "confirmed" && (
                      <EmpConfirmCard emp={empPickState} onConfirm={handleEmpConfirm} onClear={handleEmpClear} />
                    )}
                    {empConfirmed && formState.empId && (
                      <div className="mt-3 flex items-center gap-3 rounded-lg border border-green-200 bg-green-50 px-3 py-2 dark:border-green-800 dark:bg-green-500/10">
                        <svg className="size-4 shrink-0 text-green-500" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2.5}>
                          <polyline points="20 6 9 17 4 12" strokeLinecap="round" strokeLinejoin="round" />
                        </svg>
                        <p className="text-sm font-medium text-green-700 dark:text-green-400">
                          {getEmpName(formState.empId)} confirmed.
                        </p>
                        <button type="button" onClick={handleEmpClear} className="ml-auto text-xs text-green-600 underline underline-offset-2">
                          Change
                        </button>
                      </div>
                    )}
                  </>
                )}
              </div>
            )}

            {/* Promotion banner */}
            {isPromotion && (
              <div className="rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 dark:border-amber-800 dark:bg-amber-500/10">
                <p className="text-xs font-semibold uppercase tracking-widest text-amber-600 dark:text-amber-400">Recording Promotion</p>
                <p className="mt-0.5 text-xs text-amber-700 dark:text-amber-300">
                  New position record for <span className="font-semibold">{getEmpName(promotionForEmpId)}</span>. Previous record stays as history.
                </p>
              </div>
            )}

            {/* Position + Salary — shown once employee confirmed */}
            {(empConfirmed || isEditing) && (
              <>
                {/* Position details */}
                <div>
                  <SectionHeading title={isPromotion ? "Step 2 — New Position" : isEditing ? "Position Details" : "Step 2 — Position Details"} />
                  <div className="grid grid-cols-1 gap-3 md:grid-cols-3">
                    <div>
                      <Label htmlFor="pos_epDate">Position Date</Label>
                      <Input id="pos_epDate" type="date" value={formState.epDate} onChange={(e) => setField("epDate", e.target.value)} disabled={isSubmitting} />
                    </div>
                    <div>
                      <Label htmlFor="pos_effDate">Effective Date <span className="text-red-500">*</span></Label>
                      <Input id="pos_effDate" type="date" value={formState.epEfficientDate}
                        onChange={(e) => setField("epEfficientDate", e.target.value)} disabled={isSubmitting}
                        className={fieldErrors.epEfficientDate ? "!border-red-400" : ""}
                      />
                      <FieldError msg={fieldErrors.epEfficientDate} />
                    </div>
                    <div>
                      <Label htmlFor="pos_reportTo">Reporting To</Label>
                      <select id="pos_reportTo" className={selectClass} value={formState.reportingTo} onChange={(e) => setField("reportingTo", e.target.value)} disabled={isSubmitting}>
                        <option value="">— None / Top Level —</option>
                        {reportingEmps.filter((r) => r.id !== formState.empId).map((r) => (
                          <option key={r.id} value={`${r.fullName} (#${r.id})`}>{r.fullName} (#{r.id})</option>
                        ))}
                      </select>
                    </div>
                    <div>
                      <Label htmlFor="pos_position">Position / Designation <span className="text-red-500">*</span></Label>
                      <Input id="pos_position" value={formState.position}
                        onChange={(e) => setField("position", e.target.value)}
                        placeholder="e.g. Software Engineer" disabled={isSubmitting}
                        className={fieldErrors.position ? "!border-red-400" : ""}
                      />
                      <FieldError msg={fieldErrors.position} />
                    </div>
                    <div>
                      <Label htmlFor="pos_dept">Department</Label>
                      <select id="pos_dept" className={selectClass} value={formState.department} onChange={(e) => setField("department", e.target.value)} disabled={isSubmitting}>
                        <option value="">— Select —</option>
                        {DEPARTMENTS.map((d) => <option key={d} value={d}>{d}</option>)}
                      </select>
                    </div>
                    <div>
                      <Label htmlFor="pos_role">Role Level</Label>
                      <select id="pos_role" className={selectClass} value={formState.role} onChange={(e) => setField("role", e.target.value)} disabled={isSubmitting}>
                        <option value="">— Select —</option>
                        {ROLES.map((r) => <option key={r} value={r}>{r}</option>)}
                      </select>
                    </div>
                  </div>
                </div>

                {/* Salary structure */}
                <div>
                  <SectionHeading
                    title={isPromotion ? "Step 3 — Salary Structure" : "Salary Structure"}
                    subtitle="Basic is required. Monthly Gross and Annual CTC are auto-calculated."
                  />

                  {/* Earnings row */}
                  <p className="mb-2 text-[11px] font-semibold uppercase tracking-wider text-gray-400">Earnings</p>
                  <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 md:grid-cols-4 mb-5">
                    <div>
                      <Label htmlFor="pos_basic">Basic <span className="text-red-500">*</span></Label>
                      <Input id="pos_basic" type="number" min="0" placeholder="0"
                        value={formState.empBasic} disabled={isSubmitting}
                        onChange={(e) => recalc({ empBasic: e.target.value })}
                        className={fieldErrors.empBasic ? "!border-red-400" : ""}
                      />
                      <FieldError msg={fieldErrors.empBasic} />
                    </div>
                    <div>
                      <Label htmlFor="pos_hra">HRA</Label>
                      <Input id="pos_hra" type="number" min="0" placeholder="0"
                        value={formState.empHra} disabled={isSubmitting}
                        onChange={(e) => recalc({ empHra: e.target.value })}
                        className={fieldErrors.empHra ? "!border-red-400" : ""}
                      />
                      <FieldError msg={fieldErrors.empHra} />
                    </div>
                    <div>
                      <Label htmlFor="pos_allow">Allowance</Label>
                      <Input id="pos_allow" type="number" min="0" placeholder="0"
                        value={formState.empAllowance} disabled={isSubmitting}
                        onChange={(e) => recalc({ empAllowance: e.target.value })}
                        className={fieldErrors.empAllowance ? "!border-red-400" : ""}
                      />
                      <FieldError msg={fieldErrors.empAllowance} />
                    </div>
                    <div>
                      <Label>Monthly Gross</Label>
                      <div className="flex h-10 items-center rounded-lg bg-brand-50 px-3 text-sm font-semibold text-brand-700 dark:bg-brand-500/10 dark:text-brand-300">
                        {formState.empMonthGross
                          ? `₹ ${Number(formState.empMonthGross).toLocaleString("en-IN")}`
                          : <span className="text-xs font-normal text-gray-400">Auto-calculated</span>}
                      </div>
                    </div>
                  </div>

                  {/* Deductions row */}
                  <p className="mb-2 text-[11px] font-semibold uppercase tracking-wider text-gray-400">Deductions</p>
                  <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 md:grid-cols-4">
                    <div>
                      <Label htmlFor="pos_tds">TDS</Label>
                      <Input id="pos_tds" type="number" min="0" placeholder="0"
                        value={formState.empTds} disabled={isSubmitting}
                        onChange={(e) => recalc({ empTds: e.target.value })}
                        className={fieldErrors.empTds ? "!border-red-400" : ""}
                      />
                      <FieldError msg={fieldErrors.empTds} />
                    </div>
                    <div>
                      <Label htmlFor="pos_pt">PT</Label>
                      <Input id="pos_pt" type="number" min="0" placeholder="0"
                        value={formState.empPt} disabled={isSubmitting}
                        onChange={(e) => recalc({ empPt: e.target.value })}
                        className={fieldErrors.empPt ? "!border-red-400" : ""}
                      />
                      <FieldError msg={fieldErrors.empPt} />
                    </div>
                    <div>
                      <Label htmlFor="pos_loan">Loans</Label>
                      <Input id="pos_loan" type="number" min="0" placeholder="0"
                        value={formState.empLoans} disabled={isSubmitting}
                        onChange={(e) => recalc({ empLoans: e.target.value })}
                        className={fieldErrors.empLoans ? "!border-red-400" : ""}
                      />
                      <FieldError msg={fieldErrors.empLoans} />
                    </div>
                    <div>
                      <Label>Annual CTC (Est.)</Label>
                      <div className="flex h-10 items-center rounded-lg bg-success-50 px-3 text-sm font-semibold text-success-700 dark:bg-success-500/10 dark:text-success-300">
                        {formState.empCtc
                          ? `₹ ${Number(formState.empCtc).toLocaleString("en-IN")}`
                          : <span className="text-xs font-normal text-gray-400">Auto-calculated</span>}
                      </div>
                    </div>
                  </div>
                </div>

                {/* Status selects */}
                <div className="flex gap-6">
                  <div className="w-36">
                    <Label htmlFor="pos_status">Status</Label>
                    <select id="pos_status" className={selectClass} value={formState.status} disabled={isSubmitting} onChange={(e) => setField("status", e.target.value)}>
                      <option value="1">Active</option>
                      <option value="0">Inactive</option>
                    </select>
                  </div>
                  <div className="w-36">
                    <Label htmlFor="pos_active">Active Status</Label>
                    <select id="pos_active" className={selectClass} value={formState.activeStatus} disabled={isSubmitting} onChange={(e) => setField("activeStatus", e.target.value)}>
                      <option value="1">Active</option>
                      <option value="0">Deactivated</option>
                    </select>
                  </div>
                </div>
              </>
            )}

            <div className="flex gap-2 pt-1">
              <button type="submit"
                disabled={isSubmitting || (!isEditing && !isPromotion && !empConfirmed)}
                className="inline-flex items-center justify-center rounded-lg bg-brand-500 px-5 py-1.5 text-xs font-medium text-white hover:bg-brand-600 disabled:opacity-50">
                {isSubmitting ? "Saving…" : isEditing ? "Update Position" : isPromotion ? "Record Promotion" : "Assign Position"}
              </button>
              <button type="button" onClick={handleCancelForm} disabled={isSubmitting}
                className="inline-flex items-center justify-center rounded-lg border border-gray-300 px-5 py-1.5 text-xs font-medium text-gray-700 hover:bg-gray-50 disabled:opacity-50 dark:border-gray-700 dark:text-gray-300">
                Cancel
              </button>
            </div>
          </form>
        </Modal>

        {/* ── Search & Filter Bar ── */}
        <div className="mb-4 flex flex-wrap items-center gap-3">
          <div className="relative flex-1 min-w-[180px]">
            <svg className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 size-4 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <circle cx="11" cy="11" r="8" /><path d="M21 21l-4.35-4.35" strokeLinecap="round" />
            </svg>
            <input type="text" value={searchQuery} onChange={(e) => { setSearchQuery(e.target.value); setPosCurrentPage(1); }}
              placeholder="Search employee, position…"
              className="h-10 w-full rounded-lg border border-gray-200 bg-white pl-9 pr-4 text-sm text-gray-700 outline-none focus:border-brand-500 dark:border-gray-700 dark:bg-gray-900 dark:text-gray-200 dark:placeholder:text-gray-500"
            />
          </div>
          <select value={filterDept} onChange={(e) => { setFilterDept(e.target.value); setPosCurrentPage(1); }}
            className="h-10 rounded-lg border border-gray-200 bg-white px-3 text-sm text-gray-700 outline-none dark:border-gray-700 dark:bg-gray-900 dark:text-gray-200">
            <option value="all">All Departments</option>
            {allDepts.map((d) => <option key={d} value={d}>{d}</option>)}
          </select>
          <select value={filterRole} onChange={(e) => { setFilterRole(e.target.value); setPosCurrentPage(1); }}
            className="h-10 rounded-lg border border-gray-200 bg-white px-3 text-sm text-gray-700 outline-none dark:border-gray-700 dark:bg-gray-900 dark:text-gray-200">
            <option value="all">All Roles</option>
            {allRoles.map((r) => <option key={r} value={r}>{r}</option>)}
          </select>
          <select value={filterStatus} onChange={(e) => { setFilterStatus(e.target.value); setPosCurrentPage(1); }}
            className="h-10 rounded-lg border border-gray-200 bg-white px-3 text-sm text-gray-700 outline-none dark:border-gray-700 dark:bg-gray-900 dark:text-gray-200">
            <option value="all">All Status</option>
            <option value="active">Active</option>
            <option value="inactive">Inactive</option>
          </select>
          <button type="button" onClick={handleExportCSV}
            className="inline-flex items-center gap-1.5 rounded-lg border border-green-300 px-3 py-2 text-xs font-medium text-green-600 hover:bg-green-50 dark:border-green-700 dark:text-green-400 dark:hover:bg-green-500/10">
            <svg className="size-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path d="M12 10v6m0 0l-3-3m3 3l3-3M3 17V7a2 2 0 012-2h6l2 2h4a2 2 0 012 2v8a2 2 0 01-2 2H5a2 2 0 01-2-2z" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
            Export CSV
          </button>
          <span className="text-xs text-gray-400 whitespace-nowrap">
            {filteredGroups.length} of {allGroups.length} record{allGroups.length !== 1 ? "s" : ""}
          </span>
        </div>

        {/* ── Position Table ── */}
        <div className="overflow-x-auto rounded-lg border border-gray-200 dark:border-gray-800">
          <Table>
            <TableHeader className="bg-gray-50 dark:bg-white/[0.03]">
              <TableRow>
                {["#", "Employee", "Position", "Department", "Role", "Eff. Date", "Status", "Actions"].map((h) => (
                  <TableCell key={h} isHeader
                    className="px-3 py-2 text-left text-xs font-semibold uppercase tracking-wide text-gray-500 dark:text-gray-400">
                    {h}
                  </TableCell>
                ))}
              </TableRow>
            </TableHeader>

            <TableBody className="divide-y divide-gray-100 dark:divide-gray-800">
              {isLoading && (
                <TableRow>
                  <TableCell className="px-3 py-5 text-center text-xs text-gray-500" colSpan={8}>
                    <div className="flex items-center justify-center gap-2">
                      <svg className="h-4 w-4 animate-spin text-brand-500" fill="none" viewBox="0 0 24 24">
                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8H4z" />
                      </svg>
                      Loading…
                    </div>
                  </TableCell>
                </TableRow>
              )}

              {!isLoading && allGroups.length === 0 && (
                <TableRow>
                  <TableCell className="px-4 py-10 text-center text-sm text-gray-400" colSpan={8}>
                    No position records found.{canCreate ? ' Click "Assign Position" to get started.' : ""}
                  </TableCell>
                </TableRow>
              )}

              {!isLoading && allGroups.length > 0 && filteredGroups.length === 0 && (
                <TableRow>
                  <TableCell className="px-4 py-10 text-center text-sm text-gray-400" colSpan={8}>
                    No records match your search or filters.
                    <button type="button" onClick={() => { setSearchQuery(""); setFilterDept("all"); setFilterRole("all"); setFilterStatus("all"); }}
                      className="ml-2 text-brand-500 underline underline-offset-2 hover:no-underline">Clear filters</button>
                  </TableCell>
                </TableRow>
              )}

              {!isLoading && pagedGroups.map((group) => {
                const { empId, latest, history } = group;
                const hasHistory = history.length > 0;
                const isExpanded = expandedEmpIds.has(empId);

               // return (
                //  <>
                 //   {/* Current / latest row */}
                  //  <TableRow key={`latest-${latest.id}`}///adding the key as latest.id to avoid duplicate keys when an employee has multiple position records
                return (
                  <React.Fragment key={`group-${empId}`}>
                    {/* Current / latest row */}
                    <TableRow

                      className="transition-colors hover:bg-gray-50 dark:hover:bg-white/[0.02]">

                      <TableCell className="px-3 py-2 text-xs font-medium text-brand-600 dark:text-brand-400">
                        {latest.id}
                      </TableCell>

                      <TableCell className="px-3 py-2 text-xs font-medium text-gray-800 dark:text-white">
                        <div className="flex items-center gap-1.5">
                          {hasHistory && (
                            <button type="button" onClick={() => toggleHistory(empId)}
                              title={isExpanded ? "Collapse history" : `${history.length} earlier record(s)`}
                              className="flex h-5 w-5 shrink-0 items-center justify-center rounded border border-amber-300 bg-amber-50 text-amber-600 hover:bg-amber-100 dark:border-amber-700 dark:bg-amber-500/10 dark:text-amber-400">
                              <svg className={`size-3 transition-transform ${isExpanded ? "rotate-90" : ""}`} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2.5}>
                                <polyline points="9 18 15 12 9 6" strokeLinecap="round" strokeLinejoin="round" />
                              </svg>
                            </button>
                          )}
                          <span>{getEmpName(empId)}</span>
                          {hasHistory && (
                            <span className="rounded-full bg-amber-100 px-1.5 py-0.5 text-[10px] font-semibold text-amber-700 dark:bg-amber-500/20 dark:text-amber-400">
                              +{history.length}
                            </span>
                          )}
                        </div>
                      </TableCell>

                      <TableCell className="px-3 py-2 text-xs text-gray-700 dark:text-gray-200">
                        {latest.position || "—"}
                      </TableCell>
                      <TableCell className="px-3 py-2 text-xs text-gray-600 dark:text-gray-300">
                        {latest.department || "—"}
                      </TableCell>
                      <TableCell className="px-3 py-2 text-xs text-gray-600 dark:text-gray-300">
                        {latest.role || "—"}
                      </TableCell>
                      <TableCell className="px-3 py-2 text-xs text-gray-600 dark:text-gray-300">
                        {fmtDate(latest.epEfficientDate)}
                      </TableCell>
                      <TableCell className="px-3 py-2">
                        <StatusBadge status={latest.activeStatus} />
                      </TableCell>

                      <TableCell className="px-3 py-2">
                        <div className="flex items-center gap-1.5 flex-wrap">
                          {/* View — primary CTA, opens detail sub-page */}
                          <button type="button" onClick={() => setDetailEmpId(empId)}
                            className="inline-flex items-center gap-1 rounded border border-brand-300 bg-brand-50 px-2.5 py-1.5 text-xs font-semibold text-brand-600 hover:bg-brand-100 dark:border-brand-700 dark:bg-brand-500/10 dark:text-brand-300">
                            <svg className="size-3" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}>
                              <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z" />
                              <circle cx="12" cy="12" r="3" />
                            </svg>
                            View
                          </button>

                          {canCreate && (latest.activeStatus === "1" || latest.activeStatus === "ACTIVE") && (
                            <button type="button" onClick={() => openPromotionForm(latest)} disabled={isSubmitting}
                              className="inline-flex items-center gap-1 rounded border border-amber-300 px-2.5 py-1.5 text-xs font-medium text-amber-600 hover:bg-amber-50 disabled:opacity-50 dark:border-amber-800 dark:text-amber-400 dark:hover:bg-amber-500/10">
                              <svg className="size-3" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2.5}>
                                <path d="M5 15l7-7 7 7" strokeLinecap="round" strokeLinejoin="round" />
                              </svg>
                              Promote
                            </button>
                          )}

                          {canEdit && (
                            <button type="button" onClick={() => openEditForm(latest)} disabled={isSubmitting}
                              className="inline-flex items-center rounded border border-gray-300 px-2.5 py-1.5 text-xs font-medium text-gray-600 hover:bg-gray-50 disabled:opacity-50 dark:border-gray-700 dark:text-gray-300 dark:hover:bg-gray-800">
                              Edit
                            </button>
                          )}

                          {canDelete && (latest.activeStatus === "1" || latest.activeStatus === "ACTIVE") && (
                            <button type="button" onClick={() => void handleDeactivate(latest.id!)} disabled={isSubmitting}
                              className="inline-flex items-center rounded border border-red-300 px-2.5 py-1.5 text-xs font-medium text-red-600 hover:bg-red-50 disabled:opacity-50 dark:border-red-800 dark:text-red-400 dark:hover:bg-red-500/10">
                              Deactivate
                            </button>
                          )}

                          {canEdit && latest.activeStatus !== "1" && latest.activeStatus !== "ACTIVE" && (
                            <button type="button" onClick={() => void handleReactivate(latest.id!)} disabled={isSubmitting}
                              className="inline-flex items-center rounded border border-green-300 px-2.5 py-1.5 text-xs font-medium text-green-600 hover:bg-green-50 disabled:opacity-50 dark:border-green-800 dark:text-green-400 dark:hover:bg-green-500/10">
                              Reactivate
                            </button>
                          )}
                        </div>
                      </TableCell>
                    </TableRow>

                    {/* History rows (collapsed by default) */}
                    {isExpanded && history.map((histRow, idx) => (
                      <TableRow key={`hist-${histRow.id}`} className="bg-amber-50/30 dark:bg-amber-500/[0.04]">
                        <TableCell className="px-4 py-2 text-xs text-amber-500 pl-8">
                          <span className="flex items-center gap-1">
                            <svg className="size-3" viewBox="0 0 12 12" fill="none" stroke="currentColor" strokeWidth={1.5}>
                              <path d="M2 2v6h8" strokeLinecap="round" />
                            </svg>
                            #{histRow.id}
                          </span>
                        </TableCell>
                        <TableCell className="px-4 py-2 text-xs italic text-gray-400 dark:text-gray-500">
                          Previous {history.length - idx}
                        </TableCell>
                        <TableCell className="px-4 py-2 text-xs text-gray-500">{histRow.position || "—"}</TableCell>
                        <TableCell className="px-4 py-2 text-xs text-gray-400">{histRow.department || "—"}</TableCell>
                        <TableCell className="px-4 py-2 text-xs text-gray-400">{histRow.role || "—"}</TableCell>
                        <TableCell className="px-4 py-2 text-xs text-gray-400">{fmtDate(histRow.epEfficientDate)}</TableCell>
                        <TableCell className="px-4 py-2"><StatusBadge status={histRow.activeStatus} /></TableCell>
                        <TableCell className="px-4 py-2">
                          <button type="button" onClick={() => setDetailEmpId(empId)}
                            className="inline-flex items-center gap-1 rounded border border-gray-300 px-2 py-1 text-xs text-gray-500 hover:bg-gray-50 dark:border-gray-700 dark:text-gray-400">
                            <svg className="size-3" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}>
                              <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z" />
                              <circle cx="12" cy="12" r="3" />
                            </svg>
                            View
                          </button>
                        </TableCell>
                      </TableRow>
                    ))}
                 </React.Fragment>
                );
              })}
            </TableBody>
          </Table>
        </div>

        {/* ── Pagination ── */}
        {!isLoading && filteredGroups.length > POS_PAGE_SIZE && (
          <div className="mt-4 flex items-center justify-between gap-4">
            <p className="text-xs text-gray-400 dark:text-gray-500">
              Showing {(posCurrentPage - 1) * POS_PAGE_SIZE + 1}–{Math.min(posCurrentPage * POS_PAGE_SIZE, filteredGroups.length)} of {filteredGroups.length}
            </p>
            <div className="flex items-center gap-1">
              <button type="button" onClick={() => setPosCurrentPage((p) => Math.max(1, p - 1))} disabled={posCurrentPage === 1}
                className="inline-flex h-8 w-8 items-center justify-center rounded border border-gray-200 text-gray-500 hover:bg-gray-50 disabled:opacity-40 dark:border-gray-700 dark:text-gray-400">
                <svg className="size-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path d="M15 18l-6-6 6-6" strokeLinecap="round" strokeLinejoin="round" /></svg>
              </button>
              {Array.from({ length: posTotalPages }, (_, i) => i + 1).map((p) => (
                <button key={p} type="button" onClick={() => setPosCurrentPage(p)}
                  className={`inline-flex h-8 w-8 items-center justify-center rounded border text-xs font-medium transition-colors ${
                    posCurrentPage === p
                      ? "border-brand-500 bg-brand-500 text-white"
                      : "border-gray-200 text-gray-600 hover:bg-gray-50 dark:border-gray-700 dark:text-gray-400"
                  }`}>{p}</button>
              ))}
              <button type="button" onClick={() => setPosCurrentPage((p) => Math.min(posTotalPages, p + 1))} disabled={posCurrentPage === posTotalPages}
                className="inline-flex h-8 w-8 items-center justify-center rounded border border-gray-200 text-gray-500 hover:bg-gray-50 disabled:opacity-40 dark:border-gray-700 dark:text-gray-400">
                <svg className="size-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path d="M9 18l6-6-6-6" strokeLinecap="round" strokeLinejoin="round" /></svg>
              </button>
            </div>
          </div>
        )}
        {!isLoading && allGroups.length > 0 && (
          <p className="mt-2 text-xs text-gray-400 dark:text-gray-500">
            {allGroups.length} employee{allGroups.length !== 1 ? "s" : ""} · {rows.length} total record{rows.length !== 1 ? "s" : ""}
          </p>
        )}
      </ComponentCard>
    </>
  );
}