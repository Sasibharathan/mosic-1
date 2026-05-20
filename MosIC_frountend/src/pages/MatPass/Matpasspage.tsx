import { type FormEvent, useCallback, useEffect, useState } from "react";
import PageMeta from "../../components/common/PageMeta";
import PageBreadcrumb from "../../components/common/PageBreadCrumb";
import ComponentCard from "../../components/common/ComponentCard";
import Label from "../../components/form/Label";
import TextArea from "../../components/form/input/TextArea";
import DatePicker from "../../components/form/input/DatePicker";
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
import MatpassStocksItems from "./Matpassstocksitems";

// ─── Constants ────────────────────────────────────────────────────────────────

const MATPASS_URL = "/api/matpass";

const selectClass =
  "h-10 w-full rounded-lg border border-gray-300 bg-white px-3 text-sm text-gray-800 outline-none transition-colors focus:border-brand-500 focus:ring-2 focus:ring-brand-500/20 dark:border-gray-700 dark:bg-gray-900 dark:text-white";

// ─── Types ────────────────────────────────────────────────────────────────────

export type MatpassDTO = {
  id: number | null;
  inOrOut: string;
  party: string;
  date: string;
  contactPerson: string;
  discription: string;
  fileRef: string;
  status: number;
};

// ─── Reference data types ─────────────────────────────────────────────────────

type CustomerOption = { id: number; name: string; status?: number };
type FileOption     = { id: number; fileSubject: string; fileActivity?: string; fileStatus?: string | number };
type PartyOption    = { id: number; partyName: string; partyEmail: string };

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
  id,
  value,
  options,
  onChange,
  placeholder = "Search...",
  isLoading = false,
  hasError = false,
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

  const handleBlur = () => {
    setTimeout(() => setOpen(false), 150);
  };

  return (
    <div className="relative">
      <div
        className={`flex h-10 w-full items-center justify-between rounded-lg border px-3 text-sm cursor-pointer
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
        <svg
          className={`h-4 w-4 text-gray-400 transition-transform ${open ? "rotate-180" : ""}`}
          fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}
        >
          <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
        </svg>
      </div>

      {open && (
        <div className="absolute z-50 mt-1 w-full rounded-lg border border-gray-200 bg-white shadow-lg dark:border-gray-700 dark:bg-gray-900">
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

const createEmptyForm = (): MatpassDTO => ({
  id: null,
  inOrOut: "IN",
  party: "",
  date: "",
  contactPerson: "",
  discription: "",
  fileRef: "",
  status: 1,
});

const getAxiosErrorMessage = (err: unknown): string => {
  if (err && typeof err === "object" && "response" in err) {
    const res = (err as any).response;
    return res?.data?.message ?? res?.data?.error ?? "An error occurred";
  }
  return "Network error — please try again";
};

// ─── Sub-components ───────────────────────────────────────────────────────────

const DirectionBadge = ({ direction }: { direction: string }) => {
  const raw = String(direction || "").toUpperCase();
  const label = raw === "1" ? "IN" : raw === "2" ? "OUT" : raw;
  const isIn = label === "IN";
  return (
    <span
      className={`inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-xs font-semibold ${
        isIn
          ? "bg-blue-50 text-blue-700 dark:bg-blue-500/10 dark:text-blue-400"
          : "bg-orange-50 text-orange-700 dark:bg-orange-500/10 dark:text-orange-400"
      }`}
    >
      <span className={`size-1.5 rounded-full ${isIn ? "bg-blue-500" : "bg-orange-500"}`} />
      {label || "—"}
    </span>
  );
};

const StatusBadge = ({ status }: { status: number }) => {
  const isActive = status === 1;
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

// ─── Main Page ────────────────────────────────────────────────────────────────

export default function MatpassPage() {
  const { canCreate, canEdit, canDelete } = usePermissions();

  const [rows, setRows]                           = useState<MatpassDTO[]>([]);
  const [formState, setFormState]                 = useState<MatpassDTO>(createEmptyForm());
  const [editingId, setEditingId]                 = useState<number | null>(null);
  const [showForm, setShowForm]                   = useState(false);
  const [isLoading, setIsLoading]                 = useState(false);
  const [isSubmitting, setIsSubmitting]           = useState(false);
  const [errorMessage, setErrorMessage]           = useState("");
  const [successMessage, setSuccessMessage]       = useState("");
  const [viewingStocksFor, setViewingStocksFor]   = useState<MatpassDTO | null>(null);
  const [formError, setFormError]                 = useState("");
  const [fieldErrors, setFieldErrors]             = useState<Partial<Record<keyof MatpassDTO, string>>>({});

  // ── Reference data ────────────────────────────────────────────────────────
  const [customers, setCustomers]   = useState<CustomerOption[]>([]);
  const [files, setFiles]           = useState<FileOption[]>([]);
  const [refLoading, setRefLoading] = useState(false);

  // Parties — loaded dynamically based on selected Party
  const [parties, setParties]               = useState<PartyOption[]>([]);
  const [partiesLoading, setPartiesLoading] = useState(false);

  const customerOptions = customers
    .filter((c) => c.status === 1)
    .map((c) => ({
      value: `${c.id}-${c.name}`,
      label: c.name,
    }));

  // Only show active files in the File Reference dropdown
  const fileOptions = files
    .filter((f) => f.fileStatus === "1" || f.fileStatus === 1 || f.fileStatus === undefined)
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
      // non-critical
    } finally {
      setRefLoading(false);
    }
  }, []);

  // ── Fetch contact persons whenever Party selection changes ────────────────
  useEffect(() => {
    if (!showForm) return;
    const party = formState.party;
    if (!party) { setParties([]); return; }

    const customerId = party.split("-")[0];
    if (!customerId || isNaN(Number(customerId))) { setParties([]); return; }

    setPartiesLoading(true);
    setParties([]);

    axiosInstance
      .get<PartyOption[]>(`/api/customers/${customerId}/parties`)
      .then((res) => setParties(res.data ?? []))
      .catch(() => setParties([]))
      .finally(() => setPartiesLoading(false));
  }, [formState.party, showForm]);

  const isEditing = editingId !== null;
  const clearMessages = () => { setErrorMessage(""); setSuccessMessage(""); setFormError(""); setFieldErrors({}); };

  const setField = <K extends keyof MatpassDTO>(field: K, value: MatpassDTO[K]) => {
    setFormState((prev) => {
      const next = { ...prev, [field]: value };
      // When Party changes, clear Contact Person — contacts belong to that company
      if (field === "party") next.contactPerson = "";
      return next;
    });
  };

  // ─── Fetch ────────────────────────────────────────────────────────────────

  const fetchRows = useCallback(async () => {
    setIsLoading(true);
    setErrorMessage("");
    try {
      const res = await axiosInstance.get<MatpassDTO[]>(MATPASS_URL);
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

  // ─── Form helpers ─────────────────────────────────────────────────────────

  const openCreateForm = () => {
    setEditingId(null);
    setFormState(createEmptyForm());
    setShowForm(true);
    clearMessages();
  };

  const openEditForm = (row: MatpassDTO) => {
    setEditingId(row.id);
    const raw = String(row.inOrOut || "").toUpperCase();
    const normalized = raw === "1" ? "IN" : raw === "2" ? "OUT" : raw;
    setFormState({ ...row, inOrOut: normalized });
    setShowForm(true);
    clearMessages();
  };

  const handleCancelForm = () => {
    setEditingId(null);
    setFormState(createEmptyForm());
    setShowForm(false);
  };

  // ─── CRUD ─────────────────────────────────────────────────────────────────

  const handleSubmit = async (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    clearMessages();

    // ── Validate every required field ──────────────────────────────────────
    const errors: Partial<Record<keyof MatpassDTO, string>> = {};

    if (!formState.date.trim())
      errors.date = "Date is required.";
    if (!formState.party.trim())
      errors.party = "Party is required.";
    if (!formState.contactPerson.trim())
      errors.contactPerson = "Contact Person is required.";
    if (!formState.fileRef.trim())
      errors.fileRef = "File Reference is required.";
    if (!formState.discription.trim())
      errors.discription = "Description is required.";

    if (Object.keys(errors).length > 0) {
      setFieldErrors(errors);
      setFormError("Please fill in all required fields before submitting.");
      return;
    }

    setIsSubmitting(true);
    const payload: Partial<MatpassDTO> = { ...formState };
    if (!isEditing) delete payload.id;

    try {
      if (isEditing && editingId !== null) {
        await axiosInstance.put(`${MATPASS_URL}/${editingId}`, payload);
        setSuccessMessage("Material pass updated.");
      } else {
        const res = await axiosInstance.post<MatpassDTO>(MATPASS_URL, payload);
        setSuccessMessage(`Material pass #${res.data.id} created.`);
      }
      handleCancelForm();
      await fetchRows();
    } catch (err) {
      setFormError(getAxiosErrorMessage(err));
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDelete = async (id: number) => {
    if (!window.confirm(`Delete material pass #${id}?`)) return;
    clearMessages();
    setIsSubmitting(true);
    try {
      await axiosInstance.delete(`${MATPASS_URL}/${id}`);
      if (editingId === id) handleCancelForm();
      setSuccessMessage("Material pass deleted.");
      await fetchRows();
    } catch (err) {
      setErrorMessage(getAxiosErrorMessage(err));
    } finally {
      setIsSubmitting(false);
    }
  };

  // ─── Render ───────────────────────────────────────────────────────────────

  return (
    <>
      <PageMeta title="MosIC_frontend | Material Pass" description="Material pass CRUD table" />
      <PageBreadcrumb pageTitle="Material Pass" />

      {/*<ComponentCard title="Material Pass" desc={`API endpoint: ${MATPASS_URL}`}>*/}
      <ComponentCard title="Material Pass" desc="Manage your material pass records here. Click on any record to view its stock in/out items.">
        {/* Toolbar */}
        <div className="flex flex-wrap items-center justify-between gap-2">
          <p className="text-xs text-gray-500 dark:text-gray-400">
            Click any row to view its stock in/out items
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
            {canCreate && (
              <button
                type="button"
                onClick={openCreateForm}
                disabled={isSubmitting}
                className="inline-flex items-center justify-center rounded-md bg-brand-500 px-3 py-1.5 text-xs font-medium text-white hover:bg-brand-600 disabled:opacity-50"
              >
                + Add Material Pass
              </button>
            )}
          </div>
        </div>

        {/* Banners */}
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

        {/* Create / Edit Modal */}
        <Modal
          isOpen={showForm}
          onClose={handleCancelForm}
          className="mx-4 w-full max-w-4xl p-4 sm:p-6"
        >
          <h3 className="pr-12 text-xl font-semibold text-gray-800 dark:text-white/90">
            {isEditing ? "Edit Material Pass" : "Add Material Pass"}
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

              {/* Direction IN / OUT */}
              <div>
                <Label htmlFor="inOrOut">Direction <span className="text-red-500">*</span></Label>
                <select
                  id="inOrOut"
                  className={selectClass}
                  value={formState.inOrOut}
                  onChange={(e) => setField("inOrOut", e.target.value)}
                >
                  <option value="IN">IN</option>
                  <option value="OUT">OUT</option>
                </select>
              </div>

              {/* Date */}
              <div>
                <Label htmlFor="date">Date <span className="text-red-500">*</span></Label>
                <DatePicker
                  value={formState.date}
                  onChange={(val) => { setField("date", val); setFieldErrors((p) => ({ ...p, date: "" })); }}
                />
                {fieldErrors.date && <p className="mt-1 text-xs text-red-500">{fieldErrors.date}</p>}
              </div>

              {/* Party */}
              <div>
                <Label htmlFor="party">Party <span className="text-red-500">*</span></Label>
                <SearchableSelect
                  id="party"
                  value={formState.party}
                  options={customerOptions}
                  onChange={(v) => { setField("party", v); setFieldErrors((p) => ({ ...p, party: "", contactPerson: "" })); }}
                  placeholder="Select party…"
                  isLoading={refLoading}
                  hasError={!!fieldErrors.party}
                />
                {fieldErrors.party && <p className="mt-1 text-xs text-red-500">{fieldErrors.party}</p>}
              </div>

              {/* Contact Person */}
              <div>
                <Label htmlFor="contactPerson">Contact Person <span className="text-red-500">*</span></Label>
                {formState.party ? (
                  <SearchableSelect
                    id="contactPerson"
                    value={formState.contactPerson}
                    options={partyOptions}
                    onChange={(v) => { setField("contactPerson", v); setFieldErrors((p) => ({ ...p, contactPerson: "" })); }}
                    placeholder={
                      partiesLoading ? "Loading contacts…"
                      : parties.length === 0 ? "No contacts found"
                      : "Select contact…"
                    }
                    isLoading={partiesLoading}
                    hasError={!!fieldErrors.contactPerson}
                  />
                ) : (
                  <div className={`flex h-10 w-full items-center rounded-lg border border-dashed px-3 text-sm
                    ${fieldErrors.contactPerson
                      ? "border-red-400 bg-red-50 text-red-400 dark:bg-red-500/5"
                      : "border-gray-300 bg-gray-50 text-gray-400 dark:border-gray-700 dark:bg-gray-800/40 dark:text-gray-500"}`}>
                    Select a Party first
                  </div>
                )}
                {fieldErrors.contactPerson && <p className="mt-1 text-xs text-red-500">{fieldErrors.contactPerson}</p>}
              </div>

              {/* File Reference — active files only */}
              <div>
                <Label htmlFor="fileRef">File Reference <span className="text-red-500">*</span></Label>
                <SearchableSelect
                  id="fileRef"
                  value={formState.fileRef}
                  options={fileOptions}
                  onChange={(v) => { setField("fileRef", v); setFieldErrors((p) => ({ ...p, fileRef: "" })); }}
                  placeholder="Select file…"
                  isLoading={refLoading}
                  hasError={!!fieldErrors.fileRef}
                />
                {fieldErrors.fileRef && <p className="mt-1 text-xs text-red-500">{fieldErrors.fileRef}</p>}
              </div>

              {/* Status */}
              <div>
                <Label htmlFor="status">Status</Label>
                {isEditing ? (
                  <select
                    id="status"
                    className={selectClass}
                    value={formState.status}
                    onChange={(e) => setField("status", Number(e.target.value))}
                  >
                    <option value={1}>Active</option>
                    <option value={0}>Inactive</option>
                  </select>
                ) : (
                  <div className="flex h-10 items-center">
                    <StatusBadge status={1} />
                  </div>
                )}
              </div>

              {/* Description — full width */}
              <div className="md:col-span-2">
                <Label htmlFor="discription">Description <span className="text-red-500">*</span></Label>
                <TextArea
                  value={formState.discription}
                  onChange={(v) => { setField("discription", v); setFieldErrors((p) => ({ ...p, discription: "" })); }}
                  placeholder="Enter description"
                  className={fieldErrors.discription ? "border-red-400" : ""}
                />
                {fieldErrors.discription && <p className="mt-1 text-xs text-red-500">{fieldErrors.discription}</p>}
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

        {/* Matpass Table */}
        <div className="overflow-x-auto rounded-lg border border-gray-200 dark:border-gray-800">
          <Table>
            <TableHeader className="bg-gray-50 dark:bg-white/[0.03]">
              <TableRow>
                {["ID", "Direction", "Date", "Party", "Contact Person", "File Ref", "Description", "Status", "Actions"].map((h) => (
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
                  <TableCell className="px-3 py-5 text-center text-xs text-gray-500 dark:text-gray-400" colSpan={9}>
                    <div className="flex items-center justify-center gap-2">
                      <svg className="h-4 w-4 animate-spin text-brand-500" fill="none" viewBox="0 0 24 24">
                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8H4z" />
                      </svg>
                      Loading material passes…
                    </div>
                  </TableCell>
                </TableRow>
              )}

              {!isLoading && rows.length === 0 && (
                <TableRow>
                  <TableCell className="px-3 py-5 text-center text-xs text-gray-500 dark:text-gray-400" colSpan={9}>
                    No records found.{canCreate ? ' Click "+ Add Material Pass" to create your first entry.' : ""}
                  </TableCell>
                </TableRow>
              )}

              {!isLoading &&
                rows.map((row) => (
                  <TableRow
                    key={row.id}
                    onClick={() => setViewingStocksFor(row)}
                    className="cursor-pointer transition-colors hover:bg-brand-50/60 dark:hover:bg-brand-500/5"
                    title={`Open stock items for matpass #${row.id}`}
                  >
                    <TableCell className="px-3 py-2 text-xs font-medium text-brand-600 dark:text-brand-400">
                      {row.id}
                    </TableCell>
                    <TableCell className="px-3 py-2">
                      <DirectionBadge direction={row.inOrOut} />
                    </TableCell>
                    <TableCell className="px-3 py-2 text-xs text-gray-600 dark:text-gray-300">
                      {row.date || "—"}
                    </TableCell>
                    {/* Party — strip the "id-" prefix for display */}
                    <TableCell className="max-w-[160px] truncate px-3 py-2 text-xs font-medium text-gray-800 dark:text-white">
                      {row.party ? (row.party.includes("-") ? row.party.slice(row.party.indexOf("-") + 1) : row.party) : "—"}
                    </TableCell>
                    {/* Contact Person — strip the "id-" prefix for display */}
                    <TableCell className="px-3 py-2 text-xs text-gray-600 dark:text-gray-300">
                      {row.contactPerson
                        ? (row.contactPerson.includes("-") ? row.contactPerson.slice(row.contactPerson.indexOf("-") + 1) : row.contactPerson)
                        : "—"}
                    </TableCell>
                    {/* File Ref — strip the "id-" prefix for display */}
                    <TableCell className="px-3 py-2 text-xs text-gray-600 dark:text-gray-300">
                      {row.fileRef
                        ? (row.fileRef.includes("-") ? row.fileRef.slice(row.fileRef.indexOf("-") + 1) : row.fileRef)
                        : "—"}
                    </TableCell>
                    <TableCell className="max-w-[200px] truncate px-3 py-2 text-xs text-gray-600 dark:text-gray-300">
                      {row.discription || "—"}
                    </TableCell>
                    <TableCell className="px-3 py-2">
                      <StatusBadge status={row.status} />
                    </TableCell>
                    <TableCell className="px-3 py-2 text-xs" onClick={(e) => e.stopPropagation()}>
                      <div className="flex items-center gap-1.5">
                        {canEdit && (
                          <button
                            type="button"
                            onClick={() => openEditForm(row)}
                            disabled={isSubmitting}
                            className="inline-flex items-center justify-center rounded-md border border-brand-300 px-2 py-1 text-xs font-medium text-brand-600 hover:bg-brand-50 disabled:opacity-50 dark:border-brand-800 dark:text-brand-300 dark:hover:bg-brand-500/10"
                          >
                            Edit
                          </button>
                        )}
                        {canDelete && (
                          <button
                            type="button"
                            onClick={() => void handleDelete(row.id!)}
                            disabled={isSubmitting}
                            className="inline-flex items-center justify-center rounded-md border border-error-300 px-2 py-1 text-xs font-medium text-error-600 hover:bg-error-50 disabled:opacity-50 dark:border-error-800 dark:text-error-400 dark:hover:bg-error-500/10"
                          >
                            Delete
                          </button>
                        )}
                        {!canEdit && !canDelete && (
                          <span className="text-xs text-gray-300 dark:text-gray-600">—</span>
                        )}
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
            </TableBody>
          </Table>
        </div>

        {!isLoading && rows.length > 0 && (
          <p className="text-xs text-gray-400 dark:text-gray-500">
            {rows.length} record{rows.length !== 1 ? "s" : ""} — click a row to view its stock in/out items
          </p>
        )}
      </ComponentCard>

      {/* Stock Items Modal */}
      <Modal
        isOpen={viewingStocksFor !== null}
        onClose={() => setViewingStocksFor(null)}
        className="mx-4 w-full max-w-6xl p-4 sm:p-6"
      >
        {viewingStocksFor && (
          <MatpassStocksItems
            matpassRecord={{
              id:            viewingStocksFor.id!,
              inOrOut:       viewingStocksFor.inOrOut,
              party:         viewingStocksFor.party,
              date:          viewingStocksFor.date,
              contactPerson: viewingStocksFor.contactPerson,
              fileRef:       viewingStocksFor.fileRef,
              discription:   viewingStocksFor.discription,
            }}
            onClose={() => setViewingStocksFor(null)}
          />
        )}
      </Modal>
    </>
  );
}