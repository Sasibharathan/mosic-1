import { type FormEvent, useCallback, useEffect, useMemo, useState } from "react";
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
import PartyDetails from "./PartyDetails";

// ─────────────────────────────────────────────────────────────────────────────
// CONSTANTS & STYLES
// ─────────────────────────────────────────────────────────────────────────────

const CUSTOMER_URL = "/api/customers";

const selectClass =
  "h-10 w-full rounded-lg border border-gray-300 bg-white px-3 text-sm text-gray-800 outline-none transition-colors focus:border-brand-500 focus:ring-2 focus:ring-brand-500/20 dark:border-gray-700 dark:bg-gray-900 dark:text-white";

const PAGE_SIZE = 10;

// ─────────────────────────────────────────────────────────────────────────────
// TYPES
// ─────────────────────────────────────────────────────────────────────────────

type CustomerDTO = {
  id: number | null;
  name: string;
  buyerAddress1: string;
  buyerAddress2: string;
  buyerAddress3: string;
  shippingAddress1: string;
  shippingAddress2: string;
  shippingAddress3: string;
  website: string;
  gmailId: string;
  contact: string;
  cin: string;
  gst: string;
  pan: string;
  tan: string;
  bankAccHolder: string;
  bankName: string;
  accNumber: string;
  micrCode: string;
  ifscCode: string;
  cSwiftCode: string;
  cBankCode: string;
  cIban: string;
  cBankBranchAdd1: string;
  cBankBranchAdd2: string;
  cBankBranchAdd3: string;
  custType: string;   // "1" = Local, "2" = International
  status: number;     // 1 = Active, 0 = Inactive
  cGstLutNo: string;
};

type SortField = "id" | "name" | "contact" | "gst" | "custType" | "status";
type SortDir   = "asc" | "desc";

// ─────────────────────────────────────────────────────────────────────────────
// HELPER FUNCTIONS
// ─────────────────────────────────────────────────────────────────────────────

const createEmptyForm = (): CustomerDTO => ({
  id: null,
  name: "",
  buyerAddress1: "",
  buyerAddress2: "",
  buyerAddress3: "",
  shippingAddress1: "",
  shippingAddress2: "",
  shippingAddress3: "",
  website: "",
  gmailId: "",
  contact: "",
  cin: "",
  gst: "",
  pan: "",
  tan: "",
  bankAccHolder: "",
  bankName: "",
  accNumber: "",
  micrCode: "",
  ifscCode: "",
  cSwiftCode: "",
  cBankCode: "",
  cIban: "",
  cBankBranchAdd1: "",
  cBankBranchAdd2: "",
  cBankBranchAdd3: "",
  custType: "1",
  status: 1,
  cGstLutNo: "",
});

const getAxiosErrorMessage = (err: unknown): string => {
  if (err && typeof err === "object" && "response" in err) {
    const res = (err as any).response;
    return res?.data?.message ?? res?.data?.error ?? "An error occurred";
  }
  return "Network error — please try again";
};

// ── GST LUT expiry — auto March 31 of current financial year ─────────────────

type LutStatus =
  | { type: "expired";  daysAgo: number }
  | { type: "warning";  daysLeft: number }
  | { type: "ok" }
  | { type: "none" };

const getFinancialYearExpiry = (): Date => {
  const today = new Date();
  // Jan(0)/Feb(1)/Mar(2) → expiry is this year's March 31
  // Apr(3)–Dec(11)       → expiry is next year's March 31
  const year = today.getMonth() < 3 ? today.getFullYear() : today.getFullYear() + 1;
  const expiry = new Date(year, 2, 31);
  expiry.setHours(0, 0, 0, 0);
  return expiry;
};

const getLutStatus = (lutNo: string): LutStatus => {
  if (!lutNo || !lutNo.trim()) return { type: "none" };
  const today  = new Date(); today.setHours(0, 0, 0, 0);
  const expiry = getFinancialYearExpiry();
  const diffDays = Math.round((expiry.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));
  if (diffDays < 0)   return { type: "expired", daysAgo: Math.abs(diffDays) };
  if (diffDays <= 30) return { type: "warning", daysLeft: diffDays };
  return { type: "ok" };
};

// ── Format validators ─────────────────────────────────────────────────────────

const GST_REGEX   = /^[0-9]{2}[A-Z]{5}[0-9]{4}[A-Z]{1}[1-9A-Z]{1}Z[0-9A-Z]{1}$/;
const PAN_REGEX   = /^[A-Z]{5}[0-9]{4}[A-Z]{1}$/;
const IFSC_REGEX  = /^[A-Z]{4}0[A-Z0-9]{6}$/;
const PHONE_REGEX = /^[+]?[\d\s\-().]{7,15}$/;

// ─────────────────────────────────────────────────────────────────────────────
// BADGE COMPONENTS
// ─────────────────────────────────────────────────────────────────────────────

const StatusBadge = ({ status }: { status: number }) => {
  const isActive = status === 1;
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

const CustTypeBadge = ({ type }: { type: string }) => (
  <span className={`inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium ${
    type === "1"
      ? "bg-blue-50 text-blue-700 dark:bg-blue-500/10 dark:text-blue-400"
      : "bg-purple-50 text-purple-700 dark:bg-purple-500/10 dark:text-purple-400"
  }`}>
    {type === "1" ? "Local" : "International"}
  </span>
);

// Change 7: LUT status badge for table column
const LutBadge = ({ lutNo }: { lutNo: string }) => {
  const status = getLutStatus(lutNo);
  if (status.type === "none")
    return <span className="text-xs text-gray-400">—</span>;
  if (status.type === "expired")
    return (
      <span className="inline-flex items-center gap-1 rounded-full bg-red-50 px-2 py-0.5 text-xs font-medium text-red-700 dark:bg-red-500/10 dark:text-red-400">
        <span className="size-1.5 rounded-full bg-red-500" /> Expired
      </span>
    );
  if (status.type === "warning")
    return (
      <span className="inline-flex items-center gap-1 rounded-full bg-amber-50 px-2 py-0.5 text-xs font-medium text-amber-700 dark:bg-amber-500/10 dark:text-amber-400">
        <span className="size-1.5 rounded-full bg-amber-500" /> Expiring
      </span>
    );
  return (
    <span className="inline-flex items-center gap-1 rounded-full bg-green-50 px-2 py-0.5 text-xs font-medium text-green-700 dark:bg-green-500/10 dark:text-green-400">
      <span className="size-1.5 rounded-full bg-green-500" /> Valid
    </span>
  );
};

const SectionHeading = ({ title }: { title: string }) => (
  <div className="col-span-full mb-2 mt-3 border-b border-gray-200 pb-2 dark:border-gray-700">
    <p className="text-xs font-semibold uppercase tracking-widest text-gray-500 dark:text-gray-400">
      {title}
    </p>
  </div>
);

// ─────────────────────────────────────────────────────────────────────────────
// MAIN COMPONENT
// ─────────────────────────────────────────────────────────────────────────────

export default function CustomerDetails() {

  const [rows, setRows]                     = useState<CustomerDTO[]>([]);
  const [formState, setFormState]           = useState<CustomerDTO>(createEmptyForm());
  const [editingId, setEditingId]           = useState<number | null>(null);
  const [showForm, setShowForm]             = useState(false);
  const [isLoading, setIsLoading]           = useState(false);
  const [isSubmitting, setIsSubmitting]     = useState(false);
  const [errorMessage, setErrorMessage]     = useState("");
  const [successMessage, setSuccessMessage] = useState("");
  const [formError, setFormError]           = useState("");
  const [fieldErrors, setFieldErrors]       = useState<Partial<Record<keyof CustomerDTO, string>>>({});

  // Change 8/9/15: Search, sort, pagination state
  const [search, setSearch]       = useState("");
  const [sortField, setSortField] = useState<SortField>("id");
  const [sortDir, setSortDir]     = useState<SortDir>("asc");
  const [page, setPage]           = useState(1);

  // Change 1–5: LUT status driven entirely by cGstLutNo — no lutExpiry state
  const lutStatus = getLutStatus(formState.cGstLutNo);

  const [partiesModal, setPartiesModal] = useState<{
    open: boolean; customerId: number | null; customerName: string;
  }>({ open: false, customerId: null, customerName: "" });

  const isEditing = editingId !== null;

  const clearMessages = () => {
    setErrorMessage(""); setSuccessMessage(""); setFormError(""); setFieldErrors({});
  };

  const setField = <K extends keyof CustomerDTO>(f: K, v: CustomerDTO[K]) =>
    setFormState((p) => ({ ...p, [f]: v }));

  // ── Filtered + sorted + paginated ─────────────────────────────────────────
  const filteredRows = useMemo(() => {
    const q = search.toLowerCase();
    const filtered = q
      ? rows.filter((r) =>
          r.name.toLowerCase().includes(q) ||
          r.gst.toLowerCase().includes(q) ||
          r.contact.toLowerCase().includes(q) ||
          r.gmailId.toLowerCase().includes(q)
        )
      : rows;

    const sorted = [...filtered].sort((a, b) => {
      let av: any = a[sortField];
      let bv: any = b[sortField];
      if (typeof av === "string") av = av.toLowerCase();
      if (typeof bv === "string") bv = bv.toLowerCase();
      if (av < bv) return sortDir === "asc" ? -1 : 1;
      if (av > bv) return sortDir === "asc" ? 1 : -1;
      return 0;
    });

    return sorted;
  }, [rows, search, sortField, sortDir]);

  const totalPages = Math.max(1, Math.ceil(filteredRows.length / PAGE_SIZE));
  const pagedRows  = filteredRows.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE);

  const handleSort = (field: SortField) => {
    if (sortField === field) setSortDir((d) => (d === "asc" ? "desc" : "asc"));
    else { setSortField(field); setSortDir("asc"); }
    setPage(1);
  };

  const SortIcon = ({ field }: { field: SortField }) => (
    <span className="ml-1 text-gray-400">
      {sortField === field ? (sortDir === "asc" ? "▲" : "▼") : "⇅"}
    </span>
  );

  // ── Fetch ─────────────────────────────────────────────────────────────────
  const fetchCustomers = useCallback(async () => {
    setIsLoading(true); clearMessages();
    try {
      const { data } = await axiosInstance.get<CustomerDTO[]>(CUSTOMER_URL);
      setRows(Array.isArray(data) ? data : []);
    } catch (err) {
      setErrorMessage(getAxiosErrorMessage(err));
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => { void fetchCustomers(); }, [fetchCustomers]);

  // ── Form handlers ─────────────────────────────────────────────────────────
  const openNewForm = () => {
    setFormState(createEmptyForm()); // Change 4: no lutExpiry to reset
    setEditingId(null);
    setShowForm(true);
    clearMessages();
  };

  const openEditForm = (row: CustomerDTO) => {
    setFormState(row); // Change 4: no setLutExpiry needed
    setEditingId(row.id);
    setShowForm(true);
    clearMessages();
  };

  const handleCancelForm = () => {
    setShowForm(false);
    setFormState(createEmptyForm()); // Change 4: no lutExpiry to reset
    setEditingId(null);
  };

  const handleSubmitForm = async (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setFormError(""); setFieldErrors({}); setSuccessMessage("");

    const errs: Partial<Record<keyof CustomerDTO, string>> = {};
    const isLocal = formState.custType === "1";
    const isIntl  = formState.custType === "2";

    if (!formState.name.trim()) errs.name = "Company name is required";

    // Change 13: Phone validation
    if (!formState.contact.trim()) errs.contact = "Contact number is required";
    else if (!PHONE_REGEX.test(formState.contact)) errs.contact = "Invalid phone number format";

    if (!formState.gmailId.trim()) errs.gmailId = "Email is required";
    else if (!formState.gmailId.includes("@")) errs.gmailId = "Invalid email format";

    if (!formState.custType) errs.custType = "Customer type is required";
    if (!formState.buyerAddress1.trim())    errs.buyerAddress1    = "Buyer address line 1 is required";
    if (!formState.shippingAddress1.trim()) errs.shippingAddress1 = "Shipping address line 1 is required";

    // Change 10: GST validation
    if (!formState.gst.trim()) errs.gst = "GST number is required";
    else if (!GST_REGEX.test(formState.gst.toUpperCase())) errs.gst = "Invalid GST format (e.g. 22AAAAA0000A1Z5)";

    // Change 11: PAN validation
    if (!formState.pan.trim()) errs.pan = "PAN is required";
    else if (!PAN_REGEX.test(formState.pan.toUpperCase())) errs.pan = "Invalid PAN format (e.g. AAAAA0000A)";

    if (!formState.bankAccHolder.trim()) errs.bankAccHolder = "Account holder name is required";
    if (!formState.bankName.trim())      errs.bankName      = "Bank name is required";
    if (!formState.accNumber.trim())     errs.accNumber     = "Account number is required";

    // Change 12: IFSC validation
    if (isLocal) {
      if (!formState.ifscCode.trim()) errs.ifscCode = "IFSC code is required";
      else if (!IFSC_REGEX.test(formState.ifscCode.toUpperCase())) errs.ifscCode = "Invalid IFSC format (e.g. HDFC0001234)";
    }

    if (isIntl) {
      if (!formState.cSwiftCode.trim())      errs.cSwiftCode      = "SWIFT code is required for international customers";
      if (!formState.cBankCode.trim())       errs.cBankCode       = "Bank code is required for international customers";
      if (!formState.cIban.trim())           errs.cIban           = "IBAN is required for international customers";
      if (!formState.cBankBranchAdd1.trim()) errs.cBankBranchAdd1 = "Bank branch address is required for international customers";
    }

    if (Object.keys(errs).length > 0) {
      setFieldErrors(errs);
      setFormError("Please fill in all required fields before submitting.");
      return;
    }

    setIsSubmitting(true);
    const payload: Partial<CustomerDTO> = { ...formState };

    try {
      if (isEditing && editingId !== null) {
        await axiosInstance.put(`${CUSTOMER_URL}/${editingId}`, payload);
        setSuccessMessage("Customer updated successfully");
      } else {
        delete payload.id;
        await axiosInstance.post(CUSTOMER_URL, payload);
        setSuccessMessage("Customer created successfully");
      }
      await fetchCustomers();
      setShowForm(false);
      setFormState(createEmptyForm());
      setEditingId(null);
    } catch (err) {
      console.error("Backend Error Detail:", err);
      setFormError(getAxiosErrorMessage(err));
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDelete = async (id: number) => {
    if (!window.confirm("Are you sure you want to delete this customer?")) return;
    setIsSubmitting(true); clearMessages();
    try {
      await axiosInstance.delete(`${CUSTOMER_URL}/${id}`);
      setSuccessMessage("Customer deleted successfully");
      await fetchCustomers();
    } catch (err) {
      setErrorMessage(getAxiosErrorMessage(err));
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleOpenParties = (customer: CustomerDTO) => {
    setPartiesModal({ open: true, customerId: customer.id!, customerName: customer.name });
  };

  // ─────────────────────────────────────────────────────────────────────────────
  // RENDER
  // ─────────────────────────────────────────────────────────────────────────────

  return (
    <>
      <PageMeta title="Customers" description="Manage customer details and contacts" />
      {/* Change 6: clickable breadcrumb */}
      <PageBreadcrumb items={[{ label: "Dashboard", href: "/" }, { label: "Customers" }]} />

      <ComponentCard>
        {/* Header */}
        <div className="mb-6 flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Customers</h1>
            <p className="mt-0.5 text-xs text-gray-500 dark:text-gray-400">
              Manage company information and contacts
            </p>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={openNewForm}
              disabled={isSubmitting}
              className="inline-flex items-center gap-2 rounded-md bg-brand-500 px-3 py-1.5 text-sm font-medium text-white hover:bg-brand-600 disabled:opacity-50 dark:bg-brand-600 dark:hover:bg-brand-700"
            >
              <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
              </svg>
              Add Customer
            </button>
          </div>
        </div>

        {/* Messages */}
        {errorMessage && (
          <div className="mb-4 rounded border border-red-200 bg-red-50 px-3 py-2 text-xs text-red-700 dark:border-red-500/20 dark:bg-red-500/10 dark:text-red-400">
            {errorMessage}
          </div>
        )}
        {successMessage && (
          <div className="mb-4 rounded-lg border border-green-200 bg-green-50 px-3 py-2 text-sm text-green-700 dark:border-green-500/20 dark:bg-green-500/10 dark:text-green-400">
            {successMessage}
          </div>
        )}

        {/* Change 8: Search bar */}
        <div className="mb-3 flex items-center gap-2">
          <div className="relative max-w-sm flex-1">
            <svg className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-4.35-4.35M17 11A6 6 0 115 11a6 6 0 0112 0z" />
            </svg>
            <input
              type="text"
              value={search}
              onChange={(e) => { setSearch(e.target.value); setPage(1); }}
              placeholder="Search by name, GST, contact, email…"
              className="h-9 w-full rounded-lg border border-gray-300 bg-white pl-9 pr-3 text-sm text-gray-800 outline-none transition-colors focus:border-brand-500 focus:ring-2 focus:ring-brand-500/20 dark:border-gray-700 dark:bg-gray-900 dark:text-white"
            />
          </div>
          {search && (
            <button onClick={() => { setSearch(""); setPage(1); }} className="text-xs text-gray-400 hover:text-gray-600">
              Clear
            </button>
          )}
        </div>

        {/* ── Parties Modal ─────────────────────────────────────────────────── */}
        <Modal
          isOpen={partiesModal.open}
          onClose={() => setPartiesModal({ open: false, customerId: null, customerName: "" })}
          className="mx-4 w-full max-w-4xl p-4 sm:p-6"
        >
          <div className="mb-4 flex items-center gap-3 border-b border-gray-100 pb-4 dark:border-gray-800">
            <span className="flex size-9 items-center justify-center rounded-lg bg-teal-50 dark:bg-teal-500/10">
              <svg className="size-5 text-teal-600 dark:text-teal-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M17 20h5v-2a4 4 0 00-4-4h-1M9 20H4v-2a4 4 0 014-4h1m4-4a4 4 0 100-8 4 4 0 000 8zm6 4a3 3 0 11-6 0 3 3 0 016 0z" />
              </svg>
            </span>
            <div>
              <h3 className="text-lg font-semibold text-gray-800 dark:text-white">Party Contacts</h3>
              <p className="text-xs text-gray-500 dark:text-gray-400">{partiesModal.customerName}</p>
            </div>
          </div>
          {partiesModal.customerId !== null && (
            <PartyDetails customerIdProp={partiesModal.customerId} customerNameProp={partiesModal.customerName} isModal />
          )}
        </Modal>

        {/* ── Customer Form Modal ───────────────────────────────────────────── */}
        <Modal isOpen={showForm} onClose={handleCancelForm} className="mx-4 w-full max-w-4xl p-4 sm:p-6">
          <h3 className="pr-12 text-xl font-semibold text-gray-800 dark:text-white/90">
            {isEditing ? "Edit Customer" : "Add New Customer"}
          </h3>
          <p className="mt-0.5 text-xs text-gray-500 dark:text-gray-400">
            {isEditing ? "Update customer information and bank details" : "Create a new customer profile with complete details"}
          </p>

          {formError && (
            <div className="mt-4 flex items-start justify-between gap-2 rounded border border-red-200 bg-red-50 px-3 py-2 text-xs text-red-700 dark:border-red-500/20 dark:bg-red-500/10 dark:text-red-400">
              <span>{formError}</span>
              <button type="button" onClick={() => setFormError("")} className="shrink-0 text-red-400 hover:text-red-600">✕</button>
            </div>
          )}

          <form onSubmit={(e) => void handleSubmitForm(e)} className="mt-4">
            <div className="grid grid-cols-1 gap-3 md:grid-cols-2">

              <SectionHeading title="Basic Information" />

              <div>
                <Label htmlFor="name">Company Name <span className="text-red-500">*</span></Label>
                <Input id="name" value={formState.name}
                  onChange={(e) => { setField("name", e.target.value); if (e.target.value.trim()) setFieldErrors((p) => ({ ...p, name: undefined })); }}
                  placeholder="Company or organization name" disabled={isSubmitting}
                  className={fieldErrors.name ? "border-red-500 ring-2 ring-red-500/20" : ""}
                />
                {fieldErrors.name && <p className="mt-1 text-xs text-red-500">{fieldErrors.name}</p>}
              </div>

              <div>
                <Label htmlFor="contact">Contact Number <span className="text-red-500">*</span></Label>
                <Input id="contact" value={formState.contact}
                  onChange={(e) => { setField("contact", e.target.value); if (e.target.value.trim()) setFieldErrors((p) => ({ ...p, contact: undefined })); }}
                  placeholder="+91 9999999999" disabled={isSubmitting}
                  className={fieldErrors.contact ? "border-red-500 ring-2 ring-red-500/20" : ""}
                />
                {fieldErrors.contact && <p className="mt-1 text-xs text-red-500">{fieldErrors.contact}</p>}
              </div>

              <div>
                <Label htmlFor="gmailId">Email <span className="text-red-500">*</span></Label>
                <Input id="gmailId" type="email" value={formState.gmailId}
                  onChange={(e) => { setField("gmailId", e.target.value); if (e.target.value.trim()) setFieldErrors((p) => ({ ...p, gmailId: undefined })); }}
                  placeholder="company@email.com" disabled={isSubmitting}
                  className={fieldErrors.gmailId ? "border-red-500 ring-2 ring-red-500/20" : ""}
                />
                {fieldErrors.gmailId && <p className="mt-1 text-xs text-red-500">{fieldErrors.gmailId}</p>}
              </div>

              <div>
                <Label htmlFor="website">Website</Label>
                <Input id="website" value={formState.website} onChange={(e) => setField("website", e.target.value)} placeholder="www.example.com" disabled={isSubmitting} />
              </div>

              <div>
                <Label htmlFor="custType">Customer Type <span className="text-red-500">*</span></Label>
                <select id="custType"
                  className={`${selectClass}${fieldErrors.custType ? " border-red-500 ring-2 ring-red-500/20" : ""}`}
                  value={formState.custType}
                  onChange={(e) => { setField("custType", e.target.value); if (e.target.value) setFieldErrors((p) => ({ ...p, custType: undefined })); }}
                  disabled={isSubmitting}
                >
                  <option value="1">Local</option>
                  <option value="2">International</option>
                </select>
                {fieldErrors.custType && <p className="mt-1 text-xs text-red-500">{fieldErrors.custType}</p>}
              </div>

              <div>
                <Label htmlFor="status">Status <span className="text-red-500">*</span></Label>
                {isEditing ? (
                  <select id="status" className={selectClass} value={formState.status} onChange={(e) => setField("status", parseInt(e.target.value))} disabled={isSubmitting}>
                    <option value={1}>Active</option>
                    <option value={0}>Inactive</option>
                  </select>
                ) : (
                  <div className="flex h-10 items-center">
                    <span className="inline-flex items-center gap-1 rounded-full bg-green-50 px-3 py-1 text-sm font-medium text-green-700 dark:bg-green-500/10 dark:text-green-400">
                      <span className="size-1.5 rounded-full bg-green-500" /> Active
                    </span>
                  </div>
                )}
              </div>

              <SectionHeading title="Buyer Address" />

              <div>
                <Label htmlFor="buyerAddress1">Address Line 1 <span className="text-red-500">*</span></Label>
                <Input id="buyerAddress1" value={formState.buyerAddress1}
                  onChange={(e) => { setField("buyerAddress1", e.target.value); if (e.target.value.trim()) setFieldErrors((p) => ({ ...p, buyerAddress1: undefined })); }}
                  placeholder="Street address" disabled={isSubmitting}
                  className={fieldErrors.buyerAddress1 ? "border-red-500 ring-2 ring-red-500/20" : ""}
                />
                {fieldErrors.buyerAddress1 && <p className="mt-1 text-xs text-red-500">{fieldErrors.buyerAddress1}</p>}
              </div>

              <div>
                <Label htmlFor="buyerAddress2">Address Line 2</Label>
                <Input id="buyerAddress2" value={formState.buyerAddress2} onChange={(e) => setField("buyerAddress2", e.target.value)} placeholder="Apartment, suite, etc." disabled={isSubmitting} />
              </div>

              <div className="md:col-span-2">
                <Label htmlFor="buyerAddress3">Address Line 3</Label>
                <Input id="buyerAddress3" value={formState.buyerAddress3} onChange={(e) => setField("buyerAddress3", e.target.value)} placeholder="City, state, ZIP code" disabled={isSubmitting} />
              </div>

              <SectionHeading title="Shipping Address" />

              <div>
                <Label htmlFor="shippingAddress1">Address Line 1 <span className="text-red-500">*</span></Label>
                <Input id="shippingAddress1" value={formState.shippingAddress1}
                  onChange={(e) => { setField("shippingAddress1", e.target.value); if (e.target.value.trim()) setFieldErrors((p) => ({ ...p, shippingAddress1: undefined })); }}
                  placeholder="Street address" disabled={isSubmitting}
                  className={fieldErrors.shippingAddress1 ? "border-red-500 ring-2 ring-red-500/20" : ""}
                />
                {fieldErrors.shippingAddress1 && <p className="mt-1 text-xs text-red-500">{fieldErrors.shippingAddress1}</p>}
              </div>

              <div>
                <Label htmlFor="shippingAddress2">Address Line 2</Label>
                <Input id="shippingAddress2" value={formState.shippingAddress2} onChange={(e) => setField("shippingAddress2", e.target.value)} placeholder="Apartment, suite, etc." disabled={isSubmitting} />
              </div>

              <div className="md:col-span-2">
                <Label htmlFor="shippingAddress3">Address Line 3</Label>
                <Input id="shippingAddress3" value={formState.shippingAddress3} onChange={(e) => setField("shippingAddress3", e.target.value)} placeholder="City, state, ZIP code" disabled={isSubmitting} />
              </div>

              <SectionHeading title="Tax & Compliance" />

              <div>
                <Label htmlFor="cin">CIN</Label>
                <Input id="cin" value={formState.cin} onChange={(e) => setField("cin", e.target.value)} placeholder="Corporate Identification Number" disabled={isSubmitting} />
              </div>

              <div>
                <Label htmlFor="gst">GST Number <span className="text-red-500">*</span></Label>
                <Input id="gst" value={formState.gst}
                  onChange={(e) => { setField("gst", e.target.value.toUpperCase()); if (e.target.value.trim()) setFieldErrors((p) => ({ ...p, gst: undefined })); }}
                  placeholder="22AAAAA0000A1Z5" disabled={isSubmitting} maxLength={15}
                  className={fieldErrors.gst ? "border-red-500 ring-2 ring-red-500/20" : ""}
                />
                <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">15-character GST Identification Number</p>
                {fieldErrors.gst && <p className="mt-1 text-xs text-red-500">{fieldErrors.gst}</p>}
              </div>

              <div>
                <Label htmlFor="pan">PAN <span className="text-red-500">*</span></Label>
                <Input id="pan" value={formState.pan}
                  onChange={(e) => { setField("pan", e.target.value.toUpperCase()); if (e.target.value.trim()) setFieldErrors((p) => ({ ...p, pan: undefined })); }}
                  placeholder="AAAAA0000A" disabled={isSubmitting} maxLength={10}
                  className={fieldErrors.pan ? "border-red-500 ring-2 ring-red-500/20" : ""}
                />
                <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">10-character Permanent Account Number</p>
                {fieldErrors.pan && <p className="mt-1 text-xs text-red-500">{fieldErrors.pan}</p>}
              </div>

              <div>
                <Label htmlFor="tan">TAN</Label>
                <Input id="tan" value={formState.tan} onChange={(e) => setField("tan", e.target.value)} placeholder="Tax Deduction Account Number" disabled={isSubmitting} />
              </div>

              {/* Changes 1–5: GST LUT No — auto March 31 expiry, no date input */}
              <div className="md:col-span-2">
                <Label htmlFor="cGstLutNo">GST LUT Number</Label>
                <Input id="cGstLutNo" value={formState.cGstLutNo}
                  onChange={(e) => setField("cGstLutNo", e.target.value)}
                  placeholder="Letter of Undertaking Number" disabled={isSubmitting}
                />
                <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">
                  LUT validity is automatically checked against 31 March of the current financial year.
                </p>
                {lutStatus.type === "expired" && (
                  <div className="mt-2 flex items-center gap-2 rounded-md border border-red-200 bg-red-50 px-3 py-2 dark:border-red-500/30 dark:bg-red-500/10">
                    <svg className="h-4 w-4 shrink-0 text-red-500" viewBox="0 0 20 20" fill="currentColor">
                      <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm-.75-11.25a.75.75 0 011.5 0v4.5a.75.75 0 01-1.5 0v-4.5zm.75 7.5a.75.75 0 100-1.5.75.75 0 000 1.5z" clipRule="evenodd" />
                    </svg>
                    <span className="text-xs font-medium text-red-700 dark:text-red-400">
                      LUT expired {lutStatus.daysAgo} day{lutStatus.daysAgo !== 1 ? "s" : ""} ago — renew immediately to avoid compliance issues.
                    </span>
                  </div>
                )}
                {lutStatus.type === "warning" && (
                  <div className="mt-2 flex items-center gap-2 rounded-md border border-amber-200 bg-amber-50 px-3 py-2 dark:border-amber-500/30 dark:bg-amber-500/10">
                    <svg className="h-4 w-4 shrink-0 text-amber-500" viewBox="0 0 20 20" fill="currentColor">
                      <path fillRule="evenodd" d="M8.485 2.495c.673-1.167 2.357-1.167 3.03 0l6.28 10.875c.673 1.167-.17 2.625-1.516 2.625H3.72c-1.347 0-2.189-1.458-1.515-2.625L8.485 2.495zM10 5a.75.75 0 01.75.75v3.5a.75.75 0 01-1.5 0v-3.5A.75.75 0 0110 5zm0 9a1 1 0 100-2 1 1 0 000 2z" clipRule="evenodd" />
                    </svg>
                    <span className="text-xs font-medium text-amber-700 dark:text-amber-400">
                      {lutStatus.daysLeft === 0
                        ? "LUT expires today — renew as soon as possible."
                        : `LUT expires in ${lutStatus.daysLeft} day${lutStatus.daysLeft !== 1 ? "s" : ""} — consider renewing soon.`}
                    </span>
                  </div>
                )}
                {lutStatus.type === "ok" && (
                  <div className="mt-2 flex items-center gap-2 rounded-md border border-green-200 bg-green-50 px-3 py-2 dark:border-green-500/30 dark:bg-green-500/10">
                    <svg className="h-4 w-4 shrink-0 text-green-500" viewBox="0 0 20 20" fill="currentColor">
                      <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.857-9.809a.75.75 0 00-1.214-.882l-3.483 4.79-1.88-1.88a.75.75 0 10-1.06 1.061l2.5 2.5a.75.75 0 001.137-.089l4-5.5z" clipRule="evenodd" />
                    </svg>
                    <span className="text-xs font-medium text-green-700 dark:text-green-400">
                      LUT is valid until 31 March {getFinancialYearExpiry().getFullYear()}.
                    </span>
                  </div>
                )}
              </div>

              <SectionHeading title="Bank Details (India)" />

              <div>
                <Label htmlFor="bankAccHolder">Account Holder Name <span className="text-red-500">*</span></Label>
                <Input id="bankAccHolder" value={formState.bankAccHolder}
                  onChange={(e) => { setField("bankAccHolder", e.target.value); if (e.target.value.trim()) setFieldErrors((p) => ({ ...p, bankAccHolder: undefined })); }}
                  placeholder="Full name on bank account" disabled={isSubmitting}
                  className={fieldErrors.bankAccHolder ? "border-red-500 ring-2 ring-red-500/20" : ""}
                />
                {fieldErrors.bankAccHolder && <p className="mt-1 text-xs text-red-500">{fieldErrors.bankAccHolder}</p>}
              </div>

              <div>
                <Label htmlFor="bankName">Bank Name <span className="text-red-500">*</span></Label>
                <Input id="bankName" value={formState.bankName}
                  onChange={(e) => { setField("bankName", e.target.value); if (e.target.value.trim()) setFieldErrors((p) => ({ ...p, bankName: undefined })); }}
                  placeholder="e.g., HDFC Bank, ICICI Bank" disabled={isSubmitting}
                  className={fieldErrors.bankName ? "border-red-500 ring-2 ring-red-500/20" : ""}
                />
                {fieldErrors.bankName && <p className="mt-1 text-xs text-red-500">{fieldErrors.bankName}</p>}
              </div>

              <div>
                <Label htmlFor="accNumber">Account Number <span className="text-red-500">*</span></Label>
                <Input id="accNumber" value={formState.accNumber}
                  onChange={(e) => { setField("accNumber", e.target.value); if (e.target.value.trim()) setFieldErrors((p) => ({ ...p, accNumber: undefined })); }}
                  placeholder="Bank account number" disabled={isSubmitting}
                  className={fieldErrors.accNumber ? "border-red-500 ring-2 ring-red-500/20" : ""}
                />
                {fieldErrors.accNumber && <p className="mt-1 text-xs text-red-500">{fieldErrors.accNumber}</p>}
              </div>

              <div>
                <Label htmlFor="micrCode">MICR Code</Label>
                <Input id="micrCode" value={formState.micrCode} onChange={(e) => setField("micrCode", e.target.value)} placeholder="9 digits (e.g., 400016089)" disabled={isSubmitting} />
              </div>

              <div>
                <Label htmlFor="ifscCode">IFSC Code {formState.custType === "1" && <span className="text-red-500">*</span>}</Label>
                <Input id="ifscCode" value={formState.ifscCode}
                  onChange={(e) => { setField("ifscCode", e.target.value.toUpperCase()); if (e.target.value.trim()) setFieldErrors((p) => ({ ...p, ifscCode: undefined })); }}
                  placeholder="e.g., HDFC0000089" maxLength={11} disabled={isSubmitting}
                  className={fieldErrors.ifscCode ? "border-red-500 ring-2 ring-red-500/20" : ""}
                />
                <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">11 characters: Bank code (4) + 0 + Branch code (6)</p>
                {fieldErrors.ifscCode && <p className="mt-1 text-xs text-red-500">{fieldErrors.ifscCode}</p>}
              </div>

              <SectionHeading title="International Bank Details" />

              <div>
                <Label htmlFor="cSwiftCode">SWIFT Code {formState.custType === "2" && <span className="text-red-500">*</span>}</Label>
                <Input id="cSwiftCode" value={formState.cSwiftCode}
                  onChange={(e) => { setField("cSwiftCode", e.target.value); if (e.target.value.trim()) setFieldErrors((p) => ({ ...p, cSwiftCode: undefined })); }}
                  placeholder="e.g., HDFCINBBXXX" disabled={isSubmitting}
                  className={fieldErrors.cSwiftCode ? "border-red-500 ring-2 ring-red-500/20" : ""}
                />
                {fieldErrors.cSwiftCode && <p className="mt-1 text-xs text-red-500">{fieldErrors.cSwiftCode}</p>}
              </div>

              <div>
                <Label htmlFor="cBankCode">Bank Code {formState.custType === "2" && <span className="text-red-500">*</span>}</Label>
                <Input id="cBankCode" value={formState.cBankCode}
                  onChange={(e) => { setField("cBankCode", e.target.value); if (e.target.value.trim()) setFieldErrors((p) => ({ ...p, cBankCode: undefined })); }}
                  placeholder="International bank code" disabled={isSubmitting}
                  className={fieldErrors.cBankCode ? "border-red-500 ring-2 ring-red-500/20" : ""}
                />
                {fieldErrors.cBankCode && <p className="mt-1 text-xs text-red-500">{fieldErrors.cBankCode}</p>}
              </div>

              <div className="md:col-span-2">
                <Label htmlFor="cIban">IBAN {formState.custType === "2" && <span className="text-red-500">*</span>}</Label>
                <Input id="cIban" value={formState.cIban}
                  onChange={(e) => { setField("cIban", e.target.value); if (e.target.value.trim()) setFieldErrors((p) => ({ ...p, cIban: undefined })); }}
                  placeholder="International Bank Account Number" disabled={isSubmitting}
                  className={fieldErrors.cIban ? "border-red-500 ring-2 ring-red-500/20" : ""}
                />
                {fieldErrors.cIban && <p className="mt-1 text-xs text-red-500">{fieldErrors.cIban}</p>}
              </div>

              <SectionHeading title="Bank Branch Address" />

              <div>
                <Label htmlFor="cBankBranchAdd1">Address Line 1 {formState.custType === "2" && <span className="text-red-500">*</span>}</Label>
                <Input id="cBankBranchAdd1" value={formState.cBankBranchAdd1}
                  onChange={(e) => { setField("cBankBranchAdd1", e.target.value); if (e.target.value.trim()) setFieldErrors((p) => ({ ...p, cBankBranchAdd1: undefined })); }}
                  placeholder="Branch street address" disabled={isSubmitting}
                  className={fieldErrors.cBankBranchAdd1 ? "border-red-500 ring-2 ring-red-500/20" : ""}
                />
                {fieldErrors.cBankBranchAdd1 && <p className="mt-1 text-xs text-red-500">{fieldErrors.cBankBranchAdd1}</p>}
              </div>

              <div>
                <Label htmlFor="cBankBranchAdd2">Address Line 2</Label>
                <Input id="cBankBranchAdd2" value={formState.cBankBranchAdd2} onChange={(e) => setField("cBankBranchAdd2", e.target.value)} placeholder="Apartment, suite, etc." disabled={isSubmitting} />
              </div>

              <div className="md:col-span-2">
                <Label htmlFor="cBankBranchAdd3">Address Line 3</Label>
                <Input id="cBankBranchAdd3" value={formState.cBankBranchAdd3} onChange={(e) => setField("cBankBranchAdd3", e.target.value)} placeholder="City, state, country, ZIP code" disabled={isSubmitting} />
              </div>

            </div>

            {/* Form Actions */}
            <div className="mt-4 flex gap-2">
              <button type="submit" disabled={isSubmitting}
                className="inline-flex items-center justify-center rounded-md bg-brand-500 px-3 py-1.5 text-xs font-medium text-white hover:bg-brand-600 disabled:opacity-50">
                {isSubmitting ? "Saving..." : isEditing ? "Update Customer" : "Create Customer"}
              </button>
              <button type="button" onClick={handleCancelForm} disabled={isSubmitting}
                className="inline-flex items-center justify-center rounded-md border border-gray-300 px-3 py-1.5 text-xs font-medium text-gray-700 hover:bg-gray-50 disabled:opacity-50 dark:border-gray-700 dark:text-gray-300">
                Cancel
              </button>
            </div>
          </form>
        </Modal>

        {/* ── Table ─────────────────────────────────────────────────────────── */}
        <div className="overflow-x-auto rounded-lg border border-gray-200 dark:border-gray-800">
          <Table>
            <TableHeader className="bg-gray-50 dark:bg-white/[0.03]">
              <TableRow>
                {(["id","name","contact","gst","custType","status"] as SortField[]).map((field) => {
                  const labels: Record<SortField, string> = { id: "ID", name: "Company Name", contact: "Contact", gst: "GST", custType: "Type", status: "Status" };
                  return (
                    <TableCell key={field} isHeader
                      className="cursor-pointer select-none px-3 py-2 text-left text-xs font-semibold uppercase tracking-wide text-gray-600 hover:text-gray-900 dark:text-gray-300 dark:hover:text-white"
                      onClick={() => handleSort(field)}
                    >
                      {labels[field]}<SortIcon field={field} />
                    </TableCell>
                  );
                })}
                {/* Change 7: LUT Status column */}
                <TableCell isHeader className="px-3 py-2 text-left text-xs font-semibold uppercase tracking-wide text-gray-600 dark:text-gray-300">
                  LUT Status
                </TableCell>
                <TableCell isHeader className="px-3 py-2 text-left text-xs font-semibold uppercase tracking-wide text-gray-600 dark:text-gray-300">
                  Actions
                </TableCell>
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
                      Loading customers…
                    </div>
                  </TableCell>
                </TableRow>
              )}

              {!isLoading && pagedRows.length === 0 && (
                <TableRow>
                  <TableCell colSpan={9} className="px-3 py-5 text-center text-xs text-gray-500 dark:text-gray-400">
                    {search ? `No customers match "${search}".` : `No customers found. Click "Add Customer" to create your first one.`}
                  </TableCell>
                </TableRow>
              )}

              {!isLoading && pagedRows.map((row) => (
                <TableRow key={row.id} className="transition-colors hover:bg-brand-50/60 dark:hover:bg-brand-500/5">
                  <TableCell className="px-3 py-2 text-xs font-medium text-brand-600 dark:text-brand-400">{row.id}</TableCell>
                  <TableCell className="px-3 py-2 text-xs font-medium text-gray-800 dark:text-white">{row.name || "—"}</TableCell>
                  <TableCell className="px-3 py-2 text-xs text-gray-600 dark:text-gray-300">{row.contact || "—"}</TableCell>
                  <TableCell className="px-3 py-2 font-mono text-xs text-gray-600 dark:text-gray-300">{row.gst || "—"}</TableCell>
                  <TableCell className="px-3 py-2"><CustTypeBadge type={row.custType} /></TableCell>
                  <TableCell className="px-3 py-2"><StatusBadge status={row.status} /></TableCell>
                  {/* Change 7: LUT badge */}
                  <TableCell className="px-3 py-2"><LutBadge lutNo={row.cGstLutNo} /></TableCell>
                  <TableCell className="px-3 py-2" onClick={(e) => e.stopPropagation()}>
                    <div className="flex items-center gap-1.5">
                      <button type="button" onClick={() => handleOpenParties(row)}
                        className="inline-flex items-center justify-center rounded-md border border-teal-300 px-3 py-1.5 text-xs font-medium text-teal-600 hover:bg-teal-50 disabled:opacity-50 dark:border-teal-700 dark:text-teal-400 dark:hover:bg-teal-500/10">
                        Parties
                      </button>
                      <button type="button" onClick={() => openEditForm(row)} disabled={isSubmitting}
                        className="inline-flex items-center justify-center rounded-md border border-brand-300 px-2 py-1 text-xs font-medium text-brand-600 hover:bg-brand-50 disabled:opacity-50 dark:border-brand-800 dark:text-brand-300 dark:hover:bg-brand-500/10">
                        Edit
                      </button>
                      <button type="button" onClick={() => void handleDelete(row.id!)} disabled={isSubmitting}
                        className="inline-flex items-center justify-center rounded-md border border-error-300 px-2 py-1 text-xs font-medium text-error-600 hover:bg-error-50 disabled:opacity-50 dark:border-error-800 dark:text-error-400 dark:hover:bg-error-500/10">
                        Delete
                      </button>
                    </div>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>

        {/* Change 9: Pagination */}
        {!isLoading && filteredRows.length > 0 && (
          <div className="mt-3 flex items-center justify-between">
            <p className="text-xs text-gray-400 dark:text-gray-500">
              Showing {(page - 1) * PAGE_SIZE + 1}–{Math.min(page * PAGE_SIZE, filteredRows.length)} of {filteredRows.length} customer{filteredRows.length !== 1 ? "s" : ""}
            </p>
            <div className="flex items-center gap-1">
              <button onClick={() => setPage(1)} disabled={page === 1}
                className="rounded border border-gray-300 px-2 py-1 text-xs disabled:opacity-40 hover:bg-gray-50 dark:border-gray-700 dark:hover:bg-white/[0.03]">«</button>
              <button onClick={() => setPage((p) => p - 1)} disabled={page === 1}
                className="rounded border border-gray-300 px-2 py-1 text-xs disabled:opacity-40 hover:bg-gray-50 dark:border-gray-700 dark:hover:bg-white/[0.03]">‹</button>
              {Array.from({ length: totalPages }, (_, i) => i + 1)
                .filter((p) => p === 1 || p === totalPages || Math.abs(p - page) <= 1)
                .reduce<(number | "...")[]>((acc, p, i, arr) => {
                  if (i > 0 && p - (arr[i - 1] as number) > 1) acc.push("...");
                  acc.push(p);
                  return acc;
                }, [])
                .map((p, i) =>
                  p === "..." ? (
                    <span key={`ellipsis-${i}`} className="px-1 text-xs text-gray-400">…</span>
                  ) : (
                    <button key={p} onClick={() => setPage(p as number)}
                      className={`rounded border px-2 py-1 text-xs ${page === p ? "border-brand-500 bg-brand-500 text-white" : "border-gray-300 hover:bg-gray-50 dark:border-gray-700 dark:hover:bg-white/[0.03]"}`}>
                      {p}
                    </button>
                  )
                )}
              <button onClick={() => setPage((p) => p + 1)} disabled={page === totalPages}
                className="rounded border border-gray-300 px-2 py-1 text-xs disabled:opacity-40 hover:bg-gray-50 dark:border-gray-700 dark:hover:bg-white/[0.03]">›</button>
              <button onClick={() => setPage(totalPages)} disabled={page === totalPages}
                className="rounded border border-gray-300 px-2 py-1 text-xs disabled:opacity-40 hover:bg-gray-50 dark:border-gray-700 dark:hover:bg-white/[0.03]">»</button>
            </div>
          </div>
        )}

      </ComponentCard>
    </>
  );
}