import { type FormEvent, useCallback, useEffect, useState } from "react";
import PageMeta from "../../components/common/PageMeta";
import PageBreadcrumb from "../../components/common/PageBreadCrumb";
import ComponentCard from "../../components/common/ComponentCard";
import Label from "../../components/form/Label";
import Input from "../../components/form/input/InputField";
import TextArea from "../../components/form/input/TextArea";
import {
  Table,
  TableBody,
  TableCell,
  TableHeader,
  TableRow,
} from "../../components/ui/table";
import { Modal } from "../../components/ui/modal";
import axiosInstance from "../../utils/axiosInstance";
import SalesDetailsItems from "./SalesDetailsItems";
import DatePicker from "../../components/form/input/DatePicker";

// ─── Constants ────────────────────────────────────────────────────────────────

const SALES_URL    = "/api/sales";
const ACTIVITY_URL = "/api/activities";

const selectClass =
  "h-10 w-full rounded-lg border border-gray-300 bg-white px-3 text-sm text-gray-800 outline-none transition-colors focus:border-brand-500 focus:ring-2 focus:ring-brand-500/20 dark:border-gray-700 dark:bg-gray-900 dark:text-white";

// ─── Types ────────────────────────────────────────────────────────────────────

type SalesDTO = {
  id: number | null;
  salesDate: string;
  salesValidity: string;
  salesFromParty: string;
  salesToParty: string;
  salesEnquireDate: string;
  salesDeliveryTerms: string;
  salesPaymentTerms: string;
  salesCurrency: string;
  salesDoctype: string;
  salesTxType: string;
  salesDescription: string;
  salesAddressedTo: string;
  salesFileRef: string;
  salesStatus: string;
};

// ─── Reference data types ─────────────────────────────────────────────────────

type CustomerOption = { id: number; name: string; status?: number };
type FileOption     = { id: number; fileSubject: string; fileActivity?: string; fileStatus?: string | number };
type PartyOption    = { id: number; partyName: string; partyEmail: string };

// ─── Searchable Select Component ──────────────────────────────────────────────

type SearchableSelectProps = {
  id: string;
  value: string;                    // stored as "id-label"
  options: { value: string; label: string }[];
  onChange: (value: string) => void;
  placeholder?: string;
  isLoading?: boolean;
  hasError?: boolean;
};

function SearchableSelect({
  id,
  value,
  options,
  onChange,
  placeholder = "Search...",
  isLoading = false,
  hasError = false,
}: SearchableSelectProps) {
  const [query, setQuery]   = useState("");
  const [open, setOpen]     = useState(false);

  // Derive display label from current stored value
  const currentLabel = options.find((o) => o.value === value)?.label ?? value ?? "";

  const filtered = query.trim()
    ? options.filter((o) => o.label.toLowerCase().includes(query.toLowerCase()))
    : options;

  const handleSelect = (opt: { value: string; label: string }) => {
    onChange(opt.value);
    setQuery("");
    setOpen(false);
  };

  const handleBlur = () => {
    // Small delay so click on option registers first
    setTimeout(() => setOpen(false), 150);
  };

  return (
    <div className="relative">
      <div
        className={`flex h-10 w-full items-center justify-between rounded-lg border px-3 text-sm cursor-pointer
          ${open
            ? "border-brand-500 ring-2 ring-brand-500/20"
            : hasError
              ? "border-red-500 ring-2 ring-red-500/20"
              : "border-gray-300 dark:border-gray-700"}
          bg-white dark:bg-gray-900 text-gray-800 dark:text-white`}
        onClick={() => { setOpen((p) => !p); setQuery(""); }}
      >
        <span className={currentLabel ? "text-gray-800 dark:text-white" : "text-gray-400"}>
          {isLoading ? "Loading…" : currentLabel || placeholder}
        </span>
        <svg
          className={`h-4 w-4 text-gray-400 transition-transform ${open ? "rotate-180" : ""}`}
          fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}
        >
          <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
        </svg>
      </div>

      {open && (
        <div className="absolute z-50 mt-1 w-full rounded-lg border border-gray-200 bg-white shadow-lg dark:border-gray-700 dark:bg-gray-900">
          {/* Search box */}
          <div className="border-b border-gray-100 p-2 dark:border-gray-800">
            <input
              id={`${id}-search`}
              autoFocus
              className="h-8 w-full rounded-md border border-gray-200 bg-gray-50 px-3 text-sm outline-none focus:border-brand-500 dark:border-gray-700 dark:bg-gray-800 dark:text-white"
              placeholder="Type to search…"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              onBlur={handleBlur}
            />
          </div>
          {/* Option list */}
          <ul className="max-h-48 overflow-y-auto py-1">
            {filtered.length === 0 ? (
              <li className="px-3 py-2 text-sm text-gray-400 dark:text-gray-500">No results</li>
            ) : (
              filtered.map((opt) => (
                <li
                  key={opt.value}
                  onMouseDown={() => handleSelect(opt)}
                  className={`cursor-pointer px-3 py-2 text-sm transition-colors hover:bg-brand-50 dark:hover:bg-brand-500/10
                    ${opt.value === value
                      ? "bg-brand-50 font-medium text-brand-700 dark:bg-brand-500/10 dark:text-brand-300"
                      : "text-gray-700 dark:text-gray-300"}`}
                >
                  {opt.label}
                </li>
              ))
            )}
          </ul>
        </div>
      )}
    </div>
  );
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

const createEmptyForm = (): SalesDTO => ({
  id: null,
  salesDate: "",
  salesValidity: "",
  salesFromParty: "",
  salesToParty: "",
  salesEnquireDate: "",
  salesDeliveryTerms: "",
  salesPaymentTerms: "",
  salesCurrency: "",
  salesDoctype: "1",
  salesTxType: "",
  salesDescription: "",
  salesAddressedTo: "",
  salesFileRef: "",
  salesStatus: "1",
});

const getAxiosErrorMessage = (err: unknown): string => {
  if (err && typeof err === "object" && "response" in err) {
    const res = (err as any).response;
    return res?.data?.message ?? res?.data?.error ?? "An error occurred";
  }
  return "Network error — please try again";
};

// ─── Doctype label map ────────────────────────────────────────────────────────

const DOCTYPE_LABELS: Record<string, string> = {
  "1": "RFQ",
  "2": "Quotation",
  "3": "Supply Order",
  "4": "Invoice",
  "5": "Payment",
  "6": "Payment Receipt",
};

const DOCTYPE_COLORS: Record<string, string> = {
  "1": "bg-blue-50 text-blue-700 dark:bg-blue-500/10 dark:text-blue-400",
  "2": "bg-purple-50 text-purple-700 dark:bg-purple-500/10 dark:text-purple-400",
  "3": "bg-amber-50 text-amber-700 dark:bg-amber-500/10 dark:text-amber-400",
  "4": "bg-green-50 text-green-700 dark:bg-green-500/10 dark:text-green-400",
  "5": "bg-teal-50 text-teal-700 dark:bg-teal-500/10 dark:text-teal-400",
  "6": "bg-emerald-50 text-emerald-700 dark:bg-emerald-500/10 dark:text-emerald-400",
};

const DoctypeBadge = ({ doctype }: { doctype: string }) => (
  <span
    className={`inline-flex items-center rounded px-2 py-0.5 text-xs font-medium ${
      DOCTYPE_COLORS[doctype] ?? "bg-gray-100 text-gray-600 dark:bg-gray-800 dark:text-gray-400"
    }`}
  >
    {DOCTYPE_LABELS[doctype] ?? doctype}
  </span>
);

const StatusBadge = ({ status }: { status: string }) => {
  const isActive = status === "1";
  return (
    <span
      className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-xs font-medium ${
        isActive
          ? "bg-green-50 text-green-700 dark:bg-green-500/10 dark:text-green-400"
          : "bg-gray-100 text-gray-500 dark:bg-gray-700 dark:text-gray-400"
      }`}
    >
      <span
        className={`size-1.5 rounded-full ${isActive ? "bg-green-500" : "bg-gray-400"}`}
      />
      {isActive ? "Active" : "Inactive"}
    </span>
  );
};

// ─── Main Page ────────────────────────────────────────────────────────────────

export default function SalesDetails() {
  const [rows, setRows]                     = useState<SalesDTO[]>([]);
  const [formState, setFormState]           = useState<SalesDTO>(createEmptyForm());
  const [editingId, setEditingId]           = useState<number | null>(null);
  const [showForm, setShowForm]             = useState(false);
  const [isLoading, setIsLoading]           = useState(false);
  const [isSubmitting, setIsSubmitting]     = useState(false);
  const [errorMessage, setErrorMessage]     = useState("");
  const [successMessage, setSuccessMessage] = useState("");
  const [viewingItemsFor, setViewingItemsFor] = useState<SalesDTO | null>(null);
  const [formError, setFormError]             = useState("");
  const [fieldErrors, setFieldErrors]         = useState<Partial<Record<keyof SalesDTO, string>>>({});

  // ── Reference data ────────────────────────────────────────────────────────
  const [customers, setCustomers]           = useState<CustomerOption[]>([]);
  const [files, setFiles]                   = useState<FileOption[]>([]);
  const [refLoading, setRefLoading]         = useState(false);

  // Parties — loaded dynamically based on selected To Party
  const [parties, setParties]               = useState<PartyOption[]>([]);
  const [partiesLoading, setPartiesLoading] = useState(false);

  const customerOptions = customers
    .filter((c) => c.status === 1)
    .map((c) => ({ value: `${c.id}-${c.name}`, label: c.name }));

  // Only show active files (fileStatus === "1" or 1) in File Reference dropdown
  const fileOptions = files
    .filter((f) => f.fileStatus === "1" || f.fileStatus === 1)
    .map((f) => ({
      value: `${f.id}-${f.fileSubject}`,
      label: f.fileActivity ? `${f.fileActivity} - ${f.fileSubject}` : f.fileSubject,
    }));

  const partyOptions = parties.map((p) => ({
    value: `${p.id}-${p.partyName}`,
    label: p.partyName,
    sub:   p.partyEmail,
  }));

  const fetchRefData = useCallback(async () => {
    setRefLoading(true);
    try {
      const [custRes, fileRes] = await Promise.all([
        axiosInstance.get<CustomerOption[]>("/api/customers"),
        axiosInstance.get<FileOption[]>("/api/files"),
      ]);
      setCustomers(Array.isArray(custRes.data) ? custRes.data : []);
      setFiles(Array.isArray(fileRes.data) ? fileRes.data : []);
    } catch {
      // non-critical — form still works, just won't have dropdown options
    } finally {
      setRefLoading(false);
    }
  }, []);

  // ── Fetch parties whenever To Party selection changes ─────────────────────
  useEffect(() => {
    if (!showForm) return;                     // only run when form is open
    const toParty = formState.salesToParty;
    if (!toParty) { setParties([]); return; }

    // Extract the customer ID from the stored "id-name" string
    const customerId = toParty.split("-")[0];
    if (!customerId || isNaN(Number(customerId))) { setParties([]); return; }

    setPartiesLoading(true);
    setParties([]);                            // clear stale parties immediately

    axiosInstance
      .get<PartyOption[]>(`/api/customers/${customerId}/parties`)
      .then((res) => setParties(res.data ?? []))
      .catch(() => setParties([]))
      .finally(() => setPartiesLoading(false));
  }, [formState.salesToParty, showForm]);

  const isEditing = editingId !== null;
  const clearMessages = () => { setErrorMessage(""); setSuccessMessage(""); setFormError(""); setFieldErrors({}); };

  const setField = <K extends keyof SalesDTO>(field: K, value: SalesDTO[K]) => {
    setFormState((prev) => {
      const next = { ...prev, [field]: value };
      // When To Party changes, clear Addressed To — parties belong to a different company
      if (field === "salesToParty") next.salesAddressedTo = "";
      return next;
    });
  };

  // ── Fetch ─────────────────────────────────────────────────────────────────
  const fetchRows = useCallback(async () => {
    setIsLoading(true);
    setErrorMessage("");
    try {
      const res = await axiosInstance.get<SalesDTO[]>(SALES_URL);
      setRows(Array.isArray(res.data) ? res.data : []);
    } catch (err) {
      setErrorMessage(getAxiosErrorMessage(err));
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    void fetchRows();
    void fetchRefData();
  }, [fetchRows, fetchRefData]);

  // ── Form helpers ──────────────────────────────────────────────────────────
  const openCreateForm = () => {
    setEditingId(null);
    setFormState(createEmptyForm());
    setShowForm(true);
    clearMessages();
  };

  const openEditForm = (row: SalesDTO) => {
    setEditingId(row.id);
    setFormState({ ...row });
    setShowForm(true);
    clearMessages();
  };

  const handleCancelForm = () => {
    setEditingId(null);
    setFormState(createEmptyForm());
    setShowForm(false);
  };

  // ── Submit ────────────────────────────────────────────────────────────────
  const handleSubmit = async (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setFormError("");
    setFieldErrors({});
    setSuccessMessage("");

    // ✅ FULL FIELD VALIDATION
    const errs: Partial<Record<keyof SalesDTO, string>> = {};
    if (!formState.salesDate.trim())        errs.salesDate        = "Sales date is required";
    if (!formState.salesFromParty.trim())   errs.salesFromParty   = "From Party is required";
    if (!formState.salesToParty.trim())     errs.salesToParty     = "To Party is required";
    if (!formState.salesDoctype.trim())     errs.salesDoctype     = "Document type is required";
    if (!formState.salesCurrency.trim())    errs.salesCurrency    = "Currency is required";
    if (!formState.salesTxType.trim())      errs.salesTxType      = "Transaction type is required";
    if (!formState.salesDeliveryTerms.trim()) errs.salesDeliveryTerms = "Delivery terms are required";
    if (!formState.salesPaymentTerms.trim())  errs.salesPaymentTerms  = "Payment terms are required";
    if (!formState.salesFileRef.trim())       errs.salesFileRef       = "File reference is required";
    if (!formState.salesValidity.trim())      errs.salesValidity      = "Validity date is required";
    if (!formState.salesEnquireDate.trim())   errs.salesEnquireDate   = "Enquiry date is required";
    if (!formState.salesAddressedTo.trim())   errs.salesAddressedTo   = "Addressed To is required";
    if (!formState.salesDescription.trim())   errs.salesDescription   = "Description is required";

    if (Object.keys(errs).length > 0) {
      setFieldErrors(errs);
      setFormError("Please fill in all required fields before submitting.");
      return;
    }

    setIsSubmitting(true);

    // Strip id from payload on create so backend uses IDENTITY
    const payload: Partial<SalesDTO> = { ...formState };
    if (!isEditing) delete payload.id;

    try {
      if (isEditing && editingId !== null) {
        // ── UPDATE: just save, no activity needed ──────────────────────────
        await axiosInstance.put(`${SALES_URL}/${editingId}`, payload);
        setSuccessMessage("Sales record updated.");

      } else {
        // ── CREATE: save and get back the new record with its generated ID ─
        const createRes = await axiosInstance.post<SalesDTO>(SALES_URL, payload);
        const newSales  = createRes.data;          // ← has the new DB-generated id
        const newId     = newSales.id;

        // ── Auto-create activity if a file reference was selected ──────────
        const rawFileRef = formState.salesFileRef ?? "";
        if (rawFileRef) {
          // salesFileRef is stored as "fileId-fileSubject" (e.g. "3-ADMIN")
          // ActivityEntity.activityReferenceNo expects the plain subject string
          const dashIdx  = rawFileRef.indexOf("-");
          const fileRefNo = dashIdx !== -1 ? rawFileRef.slice(dashIdx + 1) : rawFileRef;

          const docLabel = DOCTYPE_LABELS[formState.salesDoctype] ?? "Sales";

          const activityPayload = {
            activityReferenceNo: fileRefNo,
            activityDate:        formState.salesDate || new Date().toISOString().slice(0, 10),
            activityRemarks:
              `Sales #${newId} — ${docLabel}` +
              ` | From: ${formState.salesFromParty}` +
              ` → To: ${formState.salesToParty}` +
              (formState.salesDescription ? ` | ${formState.salesDescription}` : ""),
            activityDocId:    null,
            activityDocTable: null,
            activityStatus:   "1",
          };

          try {
            await axiosInstance.post(ACTIVITY_URL, activityPayload);
            setSuccessMessage(
              `Sales record #${newId} created and activity logged under file "${fileRefNo}".`
            );
          } catch {
            // Sales was saved successfully — don't block the user for an activity failure
            setSuccessMessage(
              `Sales record #${newId} created. ⚠ Activity could not be logged (file ref: "${fileRefNo}") — check the File Index manually.`
            );
          }
        } else {
          setSuccessMessage(`Sales record #${newId} created.`);
        }
      }

      handleCancelForm();
      await fetchRows();
    } catch (err) {
      setFormError(getAxiosErrorMessage(err));
    } finally {
      setIsSubmitting(false);
    }
  };

  // ── Delete ────────────────────────────────────────────────────────────────
  const handleDelete = async (id: number) => {
    if (!window.confirm(`Delete sales record #${id}?`)) return;
    clearMessages();
    setIsSubmitting(true);
    try {
      await axiosInstance.delete(`${SALES_URL}/${id}`);
      if (editingId === id) handleCancelForm();
      setSuccessMessage("Sales record deleted.");
      await fetchRows();
    } catch (err) {
      setErrorMessage(getAxiosErrorMessage(err));
    } finally {
      setIsSubmitting(false);
    }
  };

  // ── Render ────────────────────────────────────────────────────────────────
  return (
    <>
      <PageMeta title="MosIC_frontend | Sales" description="Sales register CRUD table" />
      <PageBreadcrumb pageTitle="Sales Register" />

      {/*<ComponentCard title="Sales" desc={`API endpoint: ${SALES_URL}`}>*/}
      <ComponentCard title="Sales" desc="Manage RFQs, Quotations, Orders, Invoices and Payments in the sales_register table.">

        {/* ── Toolbar ─────────────────────────────────────────────────────── */}
        <div className="flex flex-wrap items-center justify-between gap-2">
          <p className="text-xs text-gray-500 dark:text-gray-400">
            Manage RFQs, Quotations, Orders, Invoices and Payments
          </p>
          <div className="flex items-center gap-1.5">
            <button
              type="button"
              onClick={() => void fetchRows()}
              disabled={isLoading || isSubmitting}
              className="inline-flex items-center justify-center rounded-md border border-gray-300 px-3 py-1.5 text-xs font-medium text-gray-700 hover:bg-gray-50 disabled:opacity-50 dark:border-gray-700 dark:text-gray-300 dark:hover:bg-white/[0.03]"
            >
              {isLoading && (
                <svg className="mr-2 h-4 w-4 animate-spin" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8H4z" />
                </svg>
              )}
              Refresh
            </button>
            <button
              type="button"
              onClick={openCreateForm}
              disabled={isSubmitting}
              className="inline-flex items-center justify-center rounded-md bg-brand-500 px-3 py-1.5 text-xs font-medium text-white hover:bg-brand-600 disabled:opacity-50"
            >
              + Add Sales Record
            </button>
          </div>
        </div>

        {/* ── Banners ──────────────────────────────────────────────────────── */}
        {errorMessage && (
          <div className="rounded border border-error-500/40 bg-error-50 px-3 py-2 text-xs text-error-700 dark:bg-error-500/10 dark:text-error-400">
            {errorMessage}
          </div>
        )}
        {successMessage && (
          <div className="rounded border border-success-500/40 bg-success-50 px-3 py-2 text-xs text-success-700 dark:bg-success-500/10 dark:text-success-400">
            {successMessage}
          </div>
        )}

        {/* ── Create / Edit Modal ──────────────────────────────────────────── */}
        <Modal
          isOpen={showForm}
          onClose={handleCancelForm}
          className="mx-4 w-full max-w-4xl p-4 sm:p-6"
        >
          <h3 className="pr-12 text-xl font-semibold text-gray-800 dark:text-white/90">
            {isEditing ? "Edit Sales Record" : "Add Sales Record"}
          </h3>
          <p className="mt-0.5 text-xs text-gray-500 dark:text-gray-400">
            Fill in the details and submit to update the sales_register table.
          </p>

          {/* ── In-modal validation / API error toast ── */}
          {formError && (
            <div className="mt-4 flex items-start gap-3 rounded border border-red-200 bg-red-50 px-3 py-2 text-xs text-red-700 dark:border-red-500/30 dark:bg-red-500/10 dark:text-red-400">
              <svg className="mt-0.5 h-4 w-4 shrink-0 text-red-500" viewBox="0 0 20 20" fill="currentColor">
                <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm-.75-11.25a.75.75 0 011.5 0v4.5a.75.75 0 01-1.5 0v-4.5zm.75 7.5a.75.75 0 100-1.5.75.75 0 000 1.5z" clipRule="evenodd" />
              </svg>
              <span>{formError}</span>
              <button
                type="button"
                onClick={() => setFormError("")}
                className="ml-auto shrink-0 text-red-400 hover:text-red-600"
                aria-label="Dismiss"
              >
                <svg className="h-4 w-4" viewBox="0 0 20 20" fill="currentColor">
                  <path d="M6.28 5.22a.75.75 0 00-1.06 1.06L8.94 10l-3.72 3.72a.75.75 0 101.06 1.06L10 11.06l3.72 3.72a.75.75 0 101.06-1.06L11.06 10l3.72-3.72a.75.75 0 00-1.06-1.06L10 8.94 6.28 5.22z" />
                </svg>
              </button>
            </div>
          )}

          <form onSubmit={(e) => void handleSubmit(e)} className="mt-4">
            <div className="grid grid-cols-1 gap-3 md:grid-cols-2">

              {/* Sales Date */}
              <div>
                <Label htmlFor="salesDate">
                  Sales Date <span className="text-red-500">*</span>
                </Label>
                {/*
                <Input
                  id="salesDate"
                  type="date"
                  value={formState.salesDate}
                  onChange={(e) => setField("salesDate", e.target.value)}
                />
                */}
                <DatePicker
                  value={formState.salesDate}
                  onChange={(val) => {
                    setField("salesDate", val);
                    if (val.trim()) setFieldErrors((p) => ({ ...p, salesDate: undefined }));
                  }}
                  className={fieldErrors.salesDate ? "border-red-500 ring-2 ring-red-500/20" : ""}
                />
                {fieldErrors.salesDate && <p className="mt-1 text-xs text-red-500">{fieldErrors.salesDate}</p>}
              </div>

              {/* Validity */}
              <div>
                <Label htmlFor="salesValidity">
                  Validity <span className="text-red-500">*</span>
                </Label>
                <DatePicker
                  value={formState.salesValidity}
                  onChange={(val) => {
                    setField("salesValidity", val);
                    if (val.trim()) setFieldErrors((p) => ({ ...p, salesValidity: undefined }));
                  }}
                  className={fieldErrors.salesValidity ? "border-red-500 ring-2 ring-red-500/20" : ""}
                />
                {fieldErrors.salesValidity && <p className="mt-1 text-xs text-red-500">{fieldErrors.salesValidity}</p>}
              </div>

              {/* From Party */}
              <div>
                <Label htmlFor="salesFromParty">
                  From Party <span className="text-red-500">*</span>
                </Label>
                <SearchableSelect
                  id="salesFromParty"
                  value={formState.salesFromParty}
                  options={customerOptions}
                  onChange={(v) => {
                    setField("salesFromParty", v);
                    if (v.trim()) setFieldErrors((p) => ({ ...p, salesFromParty: undefined }));
                  }}
                  placeholder="Select customer…"
                  isLoading={refLoading}
                  hasError={!!fieldErrors.salesFromParty}
                />
                {fieldErrors.salesFromParty && <p className="mt-1 text-xs text-red-500">{fieldErrors.salesFromParty}</p>}
              </div>

              {/* To Party */}
              <div>
                <Label htmlFor="salesToParty">
                  To Party <span className="text-red-500">*</span>
                </Label>
                <SearchableSelect
                  id="salesToParty"
                  value={formState.salesToParty}
                  options={customerOptions}
                  onChange={(v) => {
                    setField("salesToParty", v);
                    if (v.trim()) setFieldErrors((p) => ({ ...p, salesToParty: undefined }));
                  }}
                  placeholder="Select customer…"
                  isLoading={refLoading}
                  hasError={!!fieldErrors.salesToParty}
                />
                {fieldErrors.salesToParty && <p className="mt-1 text-xs text-red-500">{fieldErrors.salesToParty}</p>}
              </div>

              {/* Enquiry Date */}
              <div>
                <Label htmlFor="salesEnquireDate">
                  Enquiry Date <span className="text-red-500">*</span>
                </Label>
                <DatePicker
                  value={formState.salesEnquireDate}
                  onChange={(val) => {
                    setField("salesEnquireDate", val);
                    if (val.trim()) setFieldErrors((p) => ({ ...p, salesEnquireDate: undefined }));
                  }}
                  className={fieldErrors.salesEnquireDate ? "border-red-500 ring-2 ring-red-500/20" : ""}
                />
                {fieldErrors.salesEnquireDate && <p className="mt-1 text-xs text-red-500">{fieldErrors.salesEnquireDate}</p>}
              </div>

              {/* Delivery Terms */}
              <div>
                <Label htmlFor="salesDeliveryTerms">
                  Delivery Terms <span className="text-red-500">*</span>
                </Label>
                <Input
                  id="salesDeliveryTerms"
                  value={formState.salesDeliveryTerms}
                  onChange={(e) => {
                    setField("salesDeliveryTerms", e.target.value);
                    if (e.target.value.trim()) setFieldErrors((p) => ({ ...p, salesDeliveryTerms: undefined }));
                  }}
                  placeholder="e.g. FOB, CIF, DDP"
                  className={fieldErrors.salesDeliveryTerms ? "border-red-500 ring-2 ring-red-500/20" : ""}
                />
                {fieldErrors.salesDeliveryTerms && <p className="mt-1 text-xs text-red-500">{fieldErrors.salesDeliveryTerms}</p>}
              </div>

              {/* Payment Terms */}
              <div>
                <Label htmlFor="salesPaymentTerms">
                  Payment Terms <span className="text-red-500">*</span>
                </Label>
                <Input
                  id="salesPaymentTerms"
                  value={formState.salesPaymentTerms}
                  onChange={(e) => {
                    setField("salesPaymentTerms", e.target.value);
                    if (e.target.value.trim()) setFieldErrors((p) => ({ ...p, salesPaymentTerms: undefined }));
                  }}
                  placeholder="e.g. 30% advance, 70% on delivery"
                  className={fieldErrors.salesPaymentTerms ? "border-red-500 ring-2 ring-red-500/20" : ""}
                />
                {fieldErrors.salesPaymentTerms && <p className="mt-1 text-xs text-red-500">{fieldErrors.salesPaymentTerms}</p>}
              </div>

              {/* Currency */}

              <div>
                <Label htmlFor="salesCurrency">
                  Currency <span className="text-red-500">*</span>
                </Label>
                <Input
                  id="salesCurrency"
                  value={formState.salesCurrency}
                  onChange={(e) => {
                    setField("salesCurrency", e.target.value);
                    if (e.target.value.trim()) setFieldErrors((p) => ({ ...p, salesCurrency: undefined }));
                  }}
                  placeholder="e.g. USD, INR, EUR"
                  className={fieldErrors.salesCurrency ? "border-red-500 ring-2 ring-red-500/20" : ""}
                />
                {fieldErrors.salesCurrency && <p className="mt-1 text-xs text-red-500">{fieldErrors.salesCurrency}</p>}
              </div>

              {/* Doc Type */}
              <div>
                <Label htmlFor="salesDoctype">
                  Document Type <span className="text-red-500">*</span>
                </Label>
                <select
                  id="salesDoctype"
                  className={`${selectClass}${fieldErrors.salesDoctype ? " border-red-500 ring-2 ring-red-500/20" : ""}`}
                  value={formState.salesDoctype}
                  onChange={(e) => {
                    setField("salesDoctype", e.target.value);
                    if (e.target.value) setFieldErrors((p) => ({ ...p, salesDoctype: undefined }));
                  }}
                >
                  <option value="1">RFQ</option>
                  <option value="2">Quotation</option>
                  <option value="3">Supply Order</option>
                  <option value="4">Invoice</option>
                  <option value="5">Payment</option>
                  <option value="6">Payment Receipt</option>
                </select>
                {fieldErrors.salesDoctype && <p className="mt-1 text-xs text-red-500">{fieldErrors.salesDoctype}</p>}
              </div>

              {/* TX Type */}
              <div>
                <Label htmlFor="salesTxType">
                  Transaction Type <span className="text-red-500">*</span>
                </Label>
                <Input
                  id="salesTxType"
                  value={formState.salesTxType}
                  onChange={(e) => {
                    setField("salesTxType", e.target.value);
                    if (e.target.value.trim()) setFieldErrors((p) => ({ ...p, salesTxType: undefined }));
                  }}
                  placeholder="e.g. Import, Export, Local"
                  className={fieldErrors.salesTxType ? "border-red-500 ring-2 ring-red-500/20" : ""}
                />
                {fieldErrors.salesTxType && <p className="mt-1 text-xs text-red-500">{fieldErrors.salesTxType}</p>}
              </div>

              {/* Addressed To */}
              <div>
                <Label htmlFor="salesAddressedTo">
                  Addressed To <span className="text-red-500">*</span>
                </Label>
                {formState.salesToParty ? (
                  <>
                    <SearchableSelect
                      id="salesAddressedTo"
                      value={formState.salesAddressedTo}
                      options={partyOptions}
                      onChange={(v) => {
                        setField("salesAddressedTo", v);
                        if (v.trim()) setFieldErrors((p) => ({ ...p, salesAddressedTo: undefined }));
                      }}
                      placeholder={partiesLoading ? "Loading contacts…" : parties.length === 0 ? "No contacts found" : "Select contact…"}
                      isLoading={partiesLoading}
                      hasError={!!fieldErrors.salesAddressedTo}
                    />
                    {fieldErrors.salesAddressedTo && <p className="mt-1 text-xs text-red-500">{fieldErrors.salesAddressedTo}</p>}
                  </>
                ) : (
                  <div className="flex h-10 w-full items-center rounded-lg border border-dashed border-gray-300 bg-gray-50 px-3 text-sm text-gray-400 dark:border-gray-700 dark:bg-gray-800/40 dark:text-gray-500">
                    Select a To Party first
                  </div>
                )}
              </div>

              {/* File Ref */}
              <div>
                <Label htmlFor="salesFileRef">
                  File Reference <span className="text-red-500">*</span>
                </Label>
                <SearchableSelect
                  id="salesFileRef"
                  value={formState.salesFileRef}
                  options={fileOptions}
                  onChange={(v) => {
                    setField("salesFileRef", v);
                    if (v.trim()) setFieldErrors((p) => ({ ...p, salesFileRef: undefined }));
                  }}
                  placeholder="Select file…"
                  isLoading={refLoading}
                  hasError={!!fieldErrors.salesFileRef}
                />
                {fieldErrors.salesFileRef && <p className="mt-1 text-xs text-red-500">{fieldErrors.salesFileRef}</p>}
              </div>

              {/* Status */}
              <div>
                <Label htmlFor="salesStatus">
                  Status <span className="text-red-500">*</span>
                </Label>
                {isEditing ? (
                  <select
                    id="salesStatus"
                    className={selectClass}
                    value={formState.salesStatus}
                    onChange={(e) => setField("salesStatus", e.target.value)}
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

              {/* Description — full width */}
              <div className="md:col-span-2">
                <Label htmlFor="salesDescription">
                  Description <span className="text-red-500">*</span>
                </Label>
                <TextArea
                  value={formState.salesDescription}
                  onChange={(v) => {
                    setField("salesDescription", v);
                    if (v.trim()) setFieldErrors((p) => ({ ...p, salesDescription: undefined }));
                  }}
                  placeholder="Enter sales description"
                  className={fieldErrors.salesDescription ? "border-red-500 ring-2 ring-red-500/20" : ""}
                />
                {fieldErrors.salesDescription && <p className="mt-1 text-xs text-red-500">{fieldErrors.salesDescription}</p>}
              </div>

            </div>

            <div className="mt-4 flex gap-2">
              <button
                type="submit"
                disabled={isSubmitting}
                className="inline-flex items-center justify-center rounded-md bg-brand-500 px-3 py-1.5 text-xs font-medium text-white hover:bg-brand-600 disabled:opacity-50"
              >
                {isSubmitting ? "Saving..." : isEditing ? "Update Record" : "Create Record"}
              </button>
              <button
                type="button"
                onClick={handleCancelForm}
                disabled={isSubmitting}
                className="inline-flex items-center justify-center rounded-md border border-gray-300 px-3 py-1.5 text-xs font-medium text-gray-700 hover:bg-gray-50 disabled:opacity-50 dark:border-gray-700 dark:text-gray-300"
              >
                Cancel
              </button>
            </div>
          </form>
        </Modal>

        {/* ── Sales Table ──────────────────────────────────────────────────── */}
        <div className="overflow-x-auto rounded-lg border border-gray-200 dark:border-gray-800">
          <Table>
            <TableHeader className="bg-gray-50 dark:bg-white/[0.03]">
              <TableRow>
                {[
                  "ID",
                  "Date",
                  "Doc Type",
                  "From Party",
                  "To Party",
                  "Currency",
                  "TX Type",
                  "File Ref",
                  "Status",
                  "Actions",
                ].map((h) => (
                  <TableCell
                    key={h}
                    isHeader
                    className="px-3 py-2 text-left text-xs font-semibold uppercase tracking-wide text-gray-600 dark:text-gray-300"
                  >
                    {h}
                  </TableCell>
                ))}
              </TableRow>
            </TableHeader>

            <TableBody className="divide-y divide-gray-100 dark:divide-gray-800">
              {isLoading && (
                <TableRow>
                  <TableCell
                    className="px-3 py-5 text-center text-xs text-gray-500 dark:text-gray-400"
                    colSpan={10}
                  >
                    <div className="flex items-center justify-center gap-2">
                      <svg className="h-4 w-4 animate-spin text-brand-500" fill="none" viewBox="0 0 24 24">
                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8H4z" />
                      </svg>
                      Loading sales records…
                    </div>
                  </TableCell>
                </TableRow>
              )}

              {!isLoading && rows.length === 0 && (
                <TableRow>
                  <TableCell
                    className="px-3 py-5 text-center text-xs text-gray-500 dark:text-gray-400"
                    colSpan={10}
                  >
                    No records found. Click &ldquo;Add Sales Record&rdquo; to create your first entry.
                  </TableCell>
                </TableRow>
              )}

              {!isLoading &&
                rows.map((row) => (
                  <TableRow
                    key={row.id}
                    onClick={() => setViewingItemsFor(row)}
                    className="cursor-pointer transition-colors hover:bg-brand-50/60 dark:hover:bg-brand-500/5"
                  >
                    {/* ID */}
                    <TableCell className="px-3 py-2 text-xs font-medium text-brand-600 dark:text-brand-400">
                      {row.id}
                    </TableCell>

                    {/* Date */}
                    <TableCell className="px-3 py-2 text-xs text-gray-600 dark:text-gray-300">
                      {row.salesDate || "—"}
                    </TableCell>

                    {/* Doc Type */}
                    <TableCell className="px-3 py-2">
                      <DoctypeBadge doctype={row.salesDoctype} />
                    </TableCell>

                    {/* From Party */}
                    <TableCell className="max-w-[160px] truncate px-3 py-2 text-xs text-gray-600 dark:text-gray-300">
                      {row.salesFromParty ? (row.salesFromParty.includes("-") ? row.salesFromParty.slice(row.salesFromParty.indexOf("-") + 1) : row.salesFromParty) : "—"}
                    </TableCell>

                    {/* To Party */}
                    <TableCell className="max-w-[160px] truncate px-3 py-2 text-xs text-gray-600 dark:text-gray-300">
                      {row.salesToParty ? (row.salesToParty.includes("-") ? row.salesToParty.slice(row.salesToParty.indexOf("-") + 1) : row.salesToParty) : "—"}
                    </TableCell>

                    {/* Currency */}
                    <TableCell className="px-3 py-2 text-xs text-gray-600 dark:text-gray-300">
                      {row.salesCurrency || "—"}
                    </TableCell>

                    {/* TX Type */}
                    <TableCell className="px-3 py-2 text-xs text-gray-600 dark:text-gray-300">
                      {row.salesTxType || "—"}
                    </TableCell>

                    {/* File Ref */}
                    <TableCell className="px-3 py-2 text-xs text-gray-600 dark:text-gray-300">
                      {row.salesFileRef || "—"}
                    </TableCell>

                    {/* Status */}
                    <TableCell className="px-3 py-2">
                      <StatusBadge status={row.salesStatus} />
                    </TableCell>

                    {/* Actions */}
                    <TableCell className="px-3 py-2 text-xs" onClick={(e) => e.stopPropagation()}>
                      <div className="flex items-center gap-1.5">
                        <button
                          type="button"
                          onClick={() => openEditForm(row)}
                          disabled={isSubmitting}
                          className="inline-flex items-center justify-center rounded-md border border-brand-300 px-2 py-1 text-xs font-medium text-brand-600 hover:bg-brand-50 disabled:opacity-50 dark:border-brand-800 dark:text-brand-300 dark:hover:bg-brand-500/10"
                        >
                          Edit
                        </button>
                        <button
                          type="button"
                          onClick={() => void handleDelete(row.id!)}
                          disabled={isSubmitting}
                          className="inline-flex items-center justify-center rounded-md border border-error-300 px-2 py-1 text-xs font-medium text-error-600 hover:bg-error-50 disabled:opacity-50 dark:border-error-800 dark:text-error-400 dark:hover:bg-error-500/10"
                        >
                          Delete
                        </button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
            </TableBody>
          </Table>
        </div>

        {!isLoading && rows.length > 0 && (
          <p className="text-xs text-gray-400 dark:text-gray-500">
            {rows.length} record{rows.length !== 1 ? "s" : ""}
          </p>
        )}

      </ComponentCard>

      {/* ── Sales Items Modal ─────────────────────────────────────────────────── */}
      <Modal
        isOpen={viewingItemsFor !== null}
        onClose={() => setViewingItemsFor(null)}
        className="mx-4 w-full max-w-6xl p-4 sm:p-6"
      >
        {viewingItemsFor && (
          <SalesDetailsItems
            salesRecord={{
              id:               viewingItemsFor.id!,
              salesFromParty:   viewingItemsFor.salesFromParty,
              salesToParty:     viewingItemsFor.salesToParty,
              salesDoctype:     viewingItemsFor.salesDoctype,
              salesDate:        viewingItemsFor.salesDate,
              salesCurrency:    viewingItemsFor.salesCurrency,
              salesFileRef:     viewingItemsFor.salesFileRef,
              salesDescription: viewingItemsFor.salesDescription,
            }}
            onClose={() => setViewingItemsFor(null)}
          />
        )}
      </Modal>
    </>
  );
}