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
import PurchaseDetailsItems from "./PurchaseDetailsItems";
import DatePicker from "../../components/form/input/DatePicker";

// ─── Constants ────────────────────────────────────────────────────────────────

const PURCHASE_URL = "/api/purchases";

const selectClass =
  "h-10 w-full rounded-lg border border-gray-300 bg-white px-3 text-sm text-gray-800 outline-none transition-colors focus:border-brand-500 focus:ring-2 focus:ring-brand-500/20 dark:border-gray-700 dark:bg-gray-900 dark:text-white";

// ─── Types ────────────────────────────────────────────────────────────────────

type PurchaseDTO = {
  id: number | null;
  purchaseDate: string;
  purchaseValidity: string;
  purchaseFromParty: string;
  purchaseToParty: string;
  purchaseEnquireDate: string;
  purchaseDeliveryTerms: string;
  purchasePaymentTerms: string;
  purchaseCurrency: string;
  purchaseDoctype: string;
  purchaseTxType: string;
  purchaseDescription: string;
  purchaseAddressedTo: string;
  purchaseFileRef: string;
  purchaseStatus: string;
};

// ─── Reference data types ─────────────────────────────────────────────────────

type CustomerOption = { id: number; name: string; status?: number };
type FileOption     = { id: number; fileSubject: string; fileActivity?: string; fileStatus?: string | number };
type PartyOption    = { id: number; partyName: string; partyEmail: string };

// ─── Helpers ──────────────────────────────────────────────────────────────────

const createEmptyForm = (): PurchaseDTO => ({
  id: null,
  purchaseDate: "",
  purchaseValidity: "",
  purchaseFromParty: "",
  purchaseToParty: "",
  purchaseEnquireDate: "",
  purchaseDeliveryTerms: "",
  purchasePaymentTerms: "",
  purchaseCurrency: "",
  purchaseDoctype: "1",
  purchaseTxType: "",
  purchaseDescription: "",
  purchaseAddressedTo: "",
  purchaseFileRef: "",
  purchaseStatus: "1",
});

const getAxiosErrorMessage = (err: unknown): string => {
  if (err && typeof err === "object" && "response" in err) {
    const res = (err as { response?: { data?: { message?: string; error?: string } } }).response;
    return res?.data?.message ?? res?.data?.error ?? "An error occurred";
  }
  return "Network error — please try again";
};

// ─── Doctype maps ─────────────────────────────────────────────────────────────

const DOCTYPE_LABELS: Record<string, string> = {
  "1": "RFQ",
  "2": "Quotation",
  "3": "Purchase Order",
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
  <span className={`inline-flex items-center rounded px-2 py-0.5 text-xs font-medium ${
    DOCTYPE_COLORS[doctype] ?? "bg-gray-100 text-gray-600 dark:bg-gray-800 dark:text-gray-400"
  }`}>
    {DOCTYPE_LABELS[doctype] ?? doctype}
  </span>
);

const StatusBadge = ({ status }: { status: string }) => {
  const isActive = status === "1";
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

// ─── Searchable Select Component ──────────────────────────────────────────────

type SearchableSelectProps = {
  id: string;
  value: string;
  options: { value: string; label: string }[];
  onChange: (value: string) => void;
  placeholder?: string;
  isLoading?: boolean;
  hasError?: boolean;
};

function SearchableSelect({
  id: _id, value, options, onChange, placeholder = "Search...", isLoading = false, hasError = false,
}: SearchableSelectProps) {
  const [query, setQuery] = useState("");
  const [open, setOpen]   = useState(false);

  const currentLabel = options.find((o) => o.value === value)?.label ?? value ?? "";

  const filtered = query.trim()
    ? options.filter((o) => o.label.toLowerCase().includes(query.toLowerCase()))
    : options;

  const handleSelect = (opt: { value: string; label: string }) => {
    onChange(opt.value);
    setQuery("");
    setOpen(false);
  };

  return (
    <div className="relative">
      <div
        className={`flex h-10 w-full cursor-pointer items-center justify-between rounded-lg border px-3 text-sm
          ${open
            ? "border-brand-500 ring-2 ring-brand-500/20"
            : hasError
            ? "border-red-400 ring-2 ring-red-400/20 dark:border-red-500"
            : "border-gray-300 dark:border-gray-700"}
          bg-white dark:bg-gray-900 text-gray-800 dark:text-white`}
        onClick={() => { setOpen((p) => !p); setQuery(""); }}
      >
        <span className={currentLabel ? "text-gray-800 dark:text-white" : "text-gray-400"}>
          {isLoading ? "Loading…" : currentLabel || placeholder}
        </span>
        <svg className={`h-4 w-4 text-gray-400 transition-transform ${open ? "rotate-180" : ""}`}
          fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
        </svg>
      </div>

      {open && (
        <div className="absolute z-50 mt-1 w-full rounded-lg border border-gray-200 bg-white shadow-lg dark:border-gray-700 dark:bg-gray-900">
          <div className="border-b border-gray-100 p-2 dark:border-gray-800">
            <input
              autoFocus
              className="h-8 w-full rounded-md border border-gray-200 bg-gray-50 px-3 text-sm outline-none focus:border-brand-500 dark:border-gray-700 dark:bg-gray-800 dark:text-white"
              placeholder="Type to search…"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              onBlur={() => setTimeout(() => setOpen(false), 150)}
            />
          </div>
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

// ─── Main Page ────────────────────────────────────────────────────────────────

export default function PurchaseDetails() {
  const [rows, setRows]                       = useState<PurchaseDTO[]>([]);
  const [formState, setFormState]             = useState<PurchaseDTO>(createEmptyForm());
  const [editingId, setEditingId]             = useState<number | null>(null);
  const [showForm, setShowForm]               = useState(false);
  const [isLoading, setIsLoading]             = useState(false);
  const [isSubmitting, setIsSubmitting]       = useState(false);
  const [errorMessage, setErrorMessage]       = useState("");
  const [successMessage, setSuccessMessage]   = useState("");
  const [viewingItemsFor, setViewingItemsFor] = useState<PurchaseDTO | null>(null);
  const [formError, setFormError]             = useState("");
  const [fieldErrors, setFieldErrors]         = useState<Partial<Record<keyof PurchaseDTO, string>>>({});

  // ── Reference data ─────────────────────────────────────────────────────────
  const [customers, setCustomers]             = useState<CustomerOption[]>([]);
  const [files, setFiles]                     = useState<FileOption[]>([]);
  const [refLoading, setRefLoading]           = useState(false);
  const [parties, setParties]                 = useState<PartyOption[]>([]);
  const [partiesLoading, setPartiesLoading]   = useState(false);

  const customerOptions = customers
    .filter((c) => c.status === 1)
    .map((c) => ({ value: `${c.id}-${c.name}`, label: c.name }));
  // Only show active files in the File Reference dropdown
  const fileOptions     = files
    .filter((f) => f.fileStatus === "1" || f.fileStatus === 1 || f.fileStatus === undefined)
    .map((f) => ({ value: `${f.id}-${f.fileSubject}`, label: f.fileActivity ? `${f.fileActivity} - ${f.fileSubject}` : f.fileSubject }));
  const partyOptions    = parties.map((p) => ({ value: `${p.id}-${p.partyName}`, label: p.partyName }));

  const isEditing   = editingId !== null;
  const clearMessages = () => { setErrorMessage(""); setSuccessMessage(""); setFormError(""); setFieldErrors({}); };

  const setField = <K extends keyof PurchaseDTO>(field: K, value: PurchaseDTO[K]) => {
    setFormState((prev) => {
      const next = { ...prev, [field]: value };
      // Reset Addressed To whenever To Party changes
      if (field === "purchaseToParty") next.purchaseAddressedTo = "";
      return next;
    });
  };

  // ── Fetch reference data ───────────────────────────────────────────────────
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
      // non-critical
    } finally {
      setRefLoading(false);
    }
  }, []);

  // ── Fetch parties when To Party changes ────────────────────────────────────
  useEffect(() => {
    if (!showForm) return;
    const toParty = formState.purchaseToParty;
    if (!toParty) { setParties([]); return; }

    const customerId = toParty.split("-")[0];
    if (!customerId || isNaN(Number(customerId))) { setParties([]); return; }

    setPartiesLoading(true);
    setParties([]);

    axiosInstance
      .get<PartyOption[]>(`/api/customers/${customerId}/parties`)
      .then((res) => setParties(res.data ?? []))
      .catch(() => setParties([]))
      .finally(() => setPartiesLoading(false));
  }, [formState.purchaseToParty, showForm]);

  // ── Fetch purchases ────────────────────────────────────────────────────────
  const fetchRows = useCallback(async () => {
    setIsLoading(true);
    setErrorMessage("");
    try {
      const res = await axiosInstance.get<PurchaseDTO[]>(PURCHASE_URL);
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

  // ── Form helpers ───────────────────────────────────────────────────────────
  const openCreateForm = () => {
    setEditingId(null);
    setFormState(createEmptyForm());
    setShowForm(true);
    clearMessages();
  };

  const openEditForm = (row: PurchaseDTO) => {
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

  // ── Submit ─────────────────────────────────────────────────────────────────
  const handleSubmit = async (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    clearMessages();

    // ── Validate every required field ────────────────────────────────────────
    const errors: Partial<Record<keyof PurchaseDTO, string>> = {};

    if (!formState.purchaseDate.trim())
      errors.purchaseDate = "Purchase Date is required.";
    if (!formState.purchaseValidity.trim())
      errors.purchaseValidity = "Validity date is required.";
    if (!formState.purchaseFromParty.trim())
      errors.purchaseFromParty = "From Party is required.";
    if (!formState.purchaseToParty.trim())
      errors.purchaseToParty = "To Party is required.";
    if (!formState.purchaseEnquireDate.trim())
      errors.purchaseEnquireDate = "Enquiry Date is required.";
    if (!formState.purchaseDeliveryTerms.trim())
      errors.purchaseDeliveryTerms = "Delivery Terms is required.";
    if (!formState.purchasePaymentTerms.trim())
      errors.purchasePaymentTerms = "Payment Terms is required.";
    if (!formState.purchaseCurrency.trim())
      errors.purchaseCurrency = "Currency is required.";
    if (!formState.purchaseTxType.trim())
      errors.purchaseTxType = "Transaction Type is required.";
    if (!formState.purchaseAddressedTo.trim())
      errors.purchaseAddressedTo = "Addressed To is required.";
    if (!formState.purchaseFileRef.trim())
      errors.purchaseFileRef = "File Reference is required.";
    if (!formState.purchaseDescription.trim())
      errors.purchaseDescription = "Description is required.";

    if (Object.keys(errors).length > 0) {
      setFieldErrors(errors);
      setFormError("Please fill in all required fields before submitting.");
      return;
    }

    setIsSubmitting(true);
    const payload: Partial<PurchaseDTO> = { ...formState };
    if (!isEditing) delete payload.id;

    try {
      if (isEditing && editingId !== null) {
        await axiosInstance.put(`${PURCHASE_URL}/${editingId}`, payload);
        setSuccessMessage("Purchase record updated.");
      } else {
        await axiosInstance.post(PURCHASE_URL, payload);
        setSuccessMessage("Purchase record created.");
      }
      handleCancelForm();
      await fetchRows();
    } catch (err) {
      setFormError(getAxiosErrorMessage(err));
    } finally {
      setIsSubmitting(false);
    }
  };

  // ── Delete ─────────────────────────────────────────────────────────────────
  const handleDelete = async (id: number) => {
    if (!window.confirm(`Delete purchase record #${id}?`)) return;
    clearMessages();
    setIsSubmitting(true);
    try {
      await axiosInstance.delete(`${PURCHASE_URL}/${id}`);
      if (editingId === id) handleCancelForm();
      setSuccessMessage("Purchase record deleted.");
      await fetchRows();
    } catch (err) {
      setErrorMessage(getAxiosErrorMessage(err));
    } finally {
      setIsSubmitting(false);
    }
  };

  // ── Render ─────────────────────────────────────────────────────────────────
  return (
    <>
      <PageMeta title="MosIC | Purchase" description="Purchase register CRUD table" />
      <PageBreadcrumb pageTitle="Purchase Register" />

      <ComponentCard title="Purchase" desc="Manage your purchase records here. Click on any record to view details or edit.">

        {/* ── Toolbar ────────────────────────────────────────────────────── */}
        <div className="flex flex-wrap items-center justify-between gap-2">
          <p className="text-xs text-gray-500 dark:text-gray-400">
            Manage RFQs, Quotations, Purchase Orders, Invoices and Payments
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
              + Add Purchase Record
            </button>
          </div>
        </div>

        {/* ── Banners ────────────────────────────────────────────────────── */}
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
            {isEditing ? "Edit Purchase Record" : "Add Purchase Record"}
          </h3>
          <p className="mt-0.5 text-xs text-gray-500 dark:text-gray-400">
            All fields marked <span className="text-red-500 font-medium">*</span> are required.
          </p>

          {/* ── In-modal validation / API error toast ── */}
          {formError && (
            <div className="mt-4 flex items-start gap-3 rounded border border-red-200 bg-red-50 px-3 py-2 text-xs text-red-700 dark:border-red-500/30 dark:bg-red-500/10 dark:text-red-400">
              <svg className="mt-0.5 h-4 w-4 shrink-0 text-red-500" viewBox="0 0 20 20" fill="currentColor">
                <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm-.75-11.25a.75.75 0 011.5 0v4.5a.75.75 0 01-1.5 0v-4.5zm.75 7.5a.75.75 0 100-1.5.75.75 0 000 1.5z" clipRule="evenodd" />
              </svg>
              <span>{formError}</span>
              <button type="button" onClick={() => setFormError("")} className="ml-auto shrink-0 text-red-400 hover:text-red-600" aria-label="Dismiss">
                <svg className="h-4 w-4" viewBox="0 0 20 20" fill="currentColor">
                  <path d="M6.28 5.22a.75.75 0 00-1.06 1.06L8.94 10l-3.72 3.72a.75.75 0 101.06 1.06L10 11.06l3.72 3.72a.75.75 0 101.06-1.06L11.06 10l3.72-3.72a.75.75 0 00-1.06-1.06L10 8.94 6.28 5.22z" />
                </svg>
              </button>
            </div>
          )}

          <form onSubmit={(e) => void handleSubmit(e)} className="mt-4">
            <div className="grid grid-cols-1 gap-3 md:grid-cols-2">

              {/* Purchase Date */}
              <div>
                <Label htmlFor="purchaseDate">Purchase Date <span className="text-red-500">*</span></Label>
                <DatePicker
                  value={formState.purchaseDate}
                  onChange={(val) => { setField("purchaseDate", val); setFieldErrors((p) => ({ ...p, purchaseDate: "" })); }}
                />
                {fieldErrors.purchaseDate && <p className="mt-1 text-xs text-red-500">{fieldErrors.purchaseDate}</p>}
              </div>

              {/* Validity */}
              <div>
                <Label htmlFor="purchaseValidity">Validity <span className="text-red-500">*</span></Label>
                <DatePicker
                  value={formState.purchaseValidity}
                  onChange={(val) => { setField("purchaseValidity", val); setFieldErrors((p) => ({ ...p, purchaseValidity: "" })); }}
                />
                {fieldErrors.purchaseValidity && <p className="mt-1 text-xs text-red-500">{fieldErrors.purchaseValidity}</p>}
              </div>

              {/* From Party */}
              <div>
                <Label htmlFor="purchaseFromParty">From Party <span className="text-red-500">*</span></Label>
                <SearchableSelect
                  id="purchaseFromParty"
                  value={formState.purchaseFromParty}
                  options={customerOptions}
                  onChange={(v) => { setField("purchaseFromParty", v); setFieldErrors((p) => ({ ...p, purchaseFromParty: "" })); }}
                  placeholder="Select customer…"
                  isLoading={refLoading}
                  hasError={!!fieldErrors.purchaseFromParty}
                />
                {fieldErrors.purchaseFromParty && <p className="mt-1 text-xs text-red-500">{fieldErrors.purchaseFromParty}</p>}
              </div>

              {/* To Party */}
              <div>
                <Label htmlFor="purchaseToParty">To Party <span className="text-red-500">*</span></Label>
                <SearchableSelect
                  id="purchaseToParty"
                  value={formState.purchaseToParty}
                  options={customerOptions}
                  onChange={(v) => { setField("purchaseToParty", v); setFieldErrors((p) => ({ ...p, purchaseToParty: "" })); }}
                  placeholder="Select customer…"
                  isLoading={refLoading}
                  hasError={!!fieldErrors.purchaseToParty}
                />
                {fieldErrors.purchaseToParty && <p className="mt-1 text-xs text-red-500">{fieldErrors.purchaseToParty}</p>}
              </div>

              {/* Enquiry Date */}
              <div>
                <Label htmlFor="purchaseEnquireDate">Enquiry Date <span className="text-red-500">*</span></Label>
                <DatePicker
                  value={formState.purchaseEnquireDate}
                  onChange={(val) => { setField("purchaseEnquireDate", val); setFieldErrors((p) => ({ ...p, purchaseEnquireDate: "" })); }}
                />
                {fieldErrors.purchaseEnquireDate && <p className="mt-1 text-xs text-red-500">{fieldErrors.purchaseEnquireDate}</p>}
              </div>

              {/* Delivery Terms */}
              <div>
                <Label htmlFor="purchaseDeliveryTerms">Delivery Terms <span className="text-red-500">*</span></Label>
                <Input
                  id="purchaseDeliveryTerms"
                  value={formState.purchaseDeliveryTerms}
                  onChange={(e) => { setField("purchaseDeliveryTerms", e.target.value); setFieldErrors((p) => ({ ...p, purchaseDeliveryTerms: "" })); }}
                  placeholder="e.g. FOB, CIF, DDP"
                  className={fieldErrors.purchaseDeliveryTerms ? "border-red-400 focus:border-red-400 ring-red-400/20" : ""}
                />
                {fieldErrors.purchaseDeliveryTerms && <p className="mt-1 text-xs text-red-500">{fieldErrors.purchaseDeliveryTerms}</p>}
              </div>

              {/* Payment Terms */}
              <div>
                <Label htmlFor="purchasePaymentTerms">Payment Terms <span className="text-red-500">*</span></Label>
                <Input
                  id="purchasePaymentTerms"
                  value={formState.purchasePaymentTerms}
                  onChange={(e) => { setField("purchasePaymentTerms", e.target.value); setFieldErrors((p) => ({ ...p, purchasePaymentTerms: "" })); }}
                  placeholder="e.g. 30% advance, 70% on delivery"
                  className={fieldErrors.purchasePaymentTerms ? "border-red-400 focus:border-red-400 ring-red-400/20" : ""}
                />
                {fieldErrors.purchasePaymentTerms && <p className="mt-1 text-xs text-red-500">{fieldErrors.purchasePaymentTerms}</p>}
              </div>

              {/* Currency */}
              <div>
                <Label htmlFor="purchaseCurrency">Currency <span className="text-red-500">*</span></Label>
                <Input
                  id="purchaseCurrency"
                  value={formState.purchaseCurrency}
                  onChange={(e) => { setField("purchaseCurrency", e.target.value); setFieldErrors((p) => ({ ...p, purchaseCurrency: "" })); }}
                  placeholder="e.g. USD, INR, EUR"
                  className={fieldErrors.purchaseCurrency ? "border-red-400 focus:border-red-400 ring-red-400/20" : ""}
                />
                {fieldErrors.purchaseCurrency && <p className="mt-1 text-xs text-red-500">{fieldErrors.purchaseCurrency}</p>}
              </div>

              {/* Doc Type */}
              <div>
                <Label htmlFor="purchaseDoctype">Document Type <span className="text-red-500">*</span></Label>
                <select
                  id="purchaseDoctype"
                  className={selectClass}
                  value={formState.purchaseDoctype}
                  onChange={(e) => setField("purchaseDoctype", e.target.value)}
                >
                  <option value="1">RFQ</option>
                  <option value="2">Quotation</option>
                  <option value="3">Purchase Order</option>
                  <option value="4">Invoice</option>
                  <option value="5">Payment</option>
                  <option value="6">Payment Receipt</option>
                </select>
              </div>

              {/* TX Type */}
              <div>
                <Label htmlFor="purchaseTxType">Transaction Type <span className="text-red-500">*</span></Label>
                <Input
                  id="purchaseTxType"
                  value={formState.purchaseTxType}
                  onChange={(e) => { setField("purchaseTxType", e.target.value); setFieldErrors((p) => ({ ...p, purchaseTxType: "" })); }}
                  placeholder="e.g. Import, Export, Local"
                  className={fieldErrors.purchaseTxType ? "border-red-400 focus:border-red-400 ring-red-400/20" : ""}
                />
                {fieldErrors.purchaseTxType && <p className="mt-1 text-xs text-red-500">{fieldErrors.purchaseTxType}</p>}
              </div>

              {/* Addressed To — depends on To Party */}
              <div>
                <Label htmlFor="purchaseAddressedTo">Addressed To <span className="text-red-500">*</span></Label>
                {formState.purchaseToParty ? (
                  <SearchableSelect
                    id="purchaseAddressedTo"
                    value={formState.purchaseAddressedTo}
                    options={partyOptions}
                    onChange={(v) => { setField("purchaseAddressedTo", v); setFieldErrors((p) => ({ ...p, purchaseAddressedTo: "" })); }}
                    placeholder={
                      partiesLoading ? "Loading contacts…"
                      : parties.length === 0 ? "No contacts found"
                      : "Select contact…"
                    }
                    isLoading={partiesLoading}
                    hasError={!!fieldErrors.purchaseAddressedTo}
                  />
                ) : (
                  <div className={`flex h-10 w-full items-center rounded-lg border border-dashed px-3 text-sm
                    ${fieldErrors.purchaseAddressedTo ? "border-red-400 bg-red-50 text-red-400 dark:bg-red-500/5" : "border-gray-300 bg-gray-50 text-gray-400 dark:border-gray-700 dark:bg-gray-800/40 dark:text-gray-500"}`}>
                    Select a To Party first
                  </div>
                )}
                {fieldErrors.purchaseAddressedTo && <p className="mt-1 text-xs text-red-500">{fieldErrors.purchaseAddressedTo}</p>}
              </div>

              {/* File Ref */}
              <div>
                <Label htmlFor="purchaseFileRef">File Reference <span className="text-red-500">*</span></Label>
                <SearchableSelect
                  id="purchaseFileRef"
                  value={formState.purchaseFileRef}
                  options={fileOptions}
                  onChange={(v) => { setField("purchaseFileRef", v); setFieldErrors((p) => ({ ...p, purchaseFileRef: "" })); }}
                  placeholder="Select file…"
                  isLoading={refLoading}
                  hasError={!!fieldErrors.purchaseFileRef}
                />
                {fieldErrors.purchaseFileRef && <p className="mt-1 text-xs text-red-500">{fieldErrors.purchaseFileRef}</p>}
              </div>

              {/* Status */}
              <div>
                <Label htmlFor="purchaseStatus">Status</Label>
                {isEditing ? (
                  <select
                    id="purchaseStatus"
                    className={selectClass}
                    value={formState.purchaseStatus}
                    onChange={(e) => setField("purchaseStatus", e.target.value)}
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
                <Label htmlFor="purchaseDescription">Description <span className="text-red-500">*</span></Label>
                <TextArea
                  value={formState.purchaseDescription}
                  onChange={(v) => { setField("purchaseDescription", v); setFieldErrors((p) => ({ ...p, purchaseDescription: "" })); }}
                  placeholder="Enter purchase description"
                  className={fieldErrors.purchaseDescription ? "border-red-400" : ""}
                />
                {fieldErrors.purchaseDescription && <p className="mt-1 text-xs text-red-500">{fieldErrors.purchaseDescription}</p>}
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

        {/* ── Purchase Table ───────────────────────────────────────────────── */}
        <div className="overflow-x-auto rounded-lg border border-gray-200 dark:border-gray-800">
          <Table>
            <TableHeader className="bg-gray-50 dark:bg-white/[0.03]">
              <TableRow>
                {["ID", "Date", "Doc Type", "From Party", "To Party", "Currency", "TX Type", "File Ref", "Status", "Actions"].map((h) => (
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
              {/* Loading */}
              {isLoading && (
                <TableRow>
                  <TableCell className="px-3 py-5 text-center text-xs text-gray-500 dark:text-gray-400" colSpan={10}>
                    <div className="flex items-center justify-center gap-2">
                      <svg className="h-4 w-4 animate-spin text-brand-500" fill="none" viewBox="0 0 24 24">
                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8H4z" />
                      </svg>
                      Loading purchase records…
                    </div>
                  </TableCell>
                </TableRow>
              )}

              {/* Empty */}
              {!isLoading && rows.length === 0 && (
                <TableRow>
                  <TableCell className="px-3 py-5 text-center text-xs text-gray-500 dark:text-gray-400" colSpan={10}>
                    No records found. Click &ldquo;Add Purchase Record&rdquo; to create your first entry.
                  </TableCell>
                </TableRow>
              )}

              {/* Data rows — click row to open items */}
              {!isLoading && rows.map((row) => (
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
                    {row.purchaseDate || "—"}
                  </TableCell>

                  {/* Doc Type */}
                  <TableCell className="px-3 py-2">
                    <DoctypeBadge doctype={row.purchaseDoctype} />
                  </TableCell>

                  {/* From Party */}
                  <TableCell className="max-w-[160px] truncate px-3 py-2 text-xs text-gray-600 dark:text-gray-300">
                    {row.purchaseFromParty ? (row.purchaseFromParty.includes("-") ? row.purchaseFromParty.slice(row.purchaseFromParty.indexOf("-") + 1) : row.purchaseFromParty) : "—"}
                  </TableCell>

                  {/* To Party */}
                  <TableCell className="max-w-[160px] truncate px-3 py-2 text-xs text-gray-600 dark:text-gray-300">
                    {row.purchaseToParty ? (row.purchaseToParty.includes("-") ? row.purchaseToParty.slice(row.purchaseToParty.indexOf("-") + 1) : row.purchaseToParty) : "—"}
                  </TableCell>

                  {/* Currency */}
                  <TableCell className="px-3 py-2 text-xs text-gray-600 dark:text-gray-300">
                    {row.purchaseCurrency || "—"}
                  </TableCell>

                  {/* TX Type */}
                  <TableCell className="px-3 py-2 text-xs text-gray-600 dark:text-gray-300">
                    {row.purchaseTxType || "—"}
                  </TableCell>

                  {/* File Ref */}
                  <TableCell className="px-3 py-2 text-xs text-gray-600 dark:text-gray-300">
                    {row.purchaseFileRef || "—"}
                  </TableCell>

                  {/* Status */}
                  <TableCell className="px-3 py-2">
                    <StatusBadge status={row.purchaseStatus} />
                  </TableCell>

                  {/* Actions — stopPropagation so row click doesn't fire */}
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

      {/* ── Purchase Items Modal ─────────────────────────────────────────────── */}
      <Modal
        isOpen={viewingItemsFor !== null}
        onClose={() => setViewingItemsFor(null)}
        className="mx-4 w-full max-w-6xl p-4 sm:p-6"
      >
        {viewingItemsFor && (
          <PurchaseDetailsItems
            purchaseRecord={{
              id:                     viewingItemsFor.id!,
              purchaseFromParty:      viewingItemsFor.purchaseFromParty,
              purchaseToParty:        viewingItemsFor.purchaseToParty,
              purchaseDoctype:        viewingItemsFor.purchaseDoctype,
              purchaseDate:           viewingItemsFor.purchaseDate,
              purchaseCurrency:       viewingItemsFor.purchaseCurrency,
              purchaseFileRef:        viewingItemsFor.purchaseFileRef,
              purchaseDescription:    viewingItemsFor.purchaseDescription,
            }}
            onClose={() => setViewingItemsFor(null)}
          />
        )}
      </Modal>
    </>
  );
}