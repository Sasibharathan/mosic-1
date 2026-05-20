import { type FormEvent, useCallback, useEffect, useState } from "react";
import { useNavigate, useParams, useLocation } from "react-router";
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

// ─── Constants ────────────────────────────────────────────────────────────────

const PARTIES_BY_CUSTOMER = (customerId: string | number) =>
  `/api/customers/${customerId}/parties`;
const PARTIES_URL = "/api/parties";

const selectClass =
  "h-10 w-full rounded-lg border border-gray-300 bg-white px-3 text-sm text-gray-800 outline-none transition-colors focus:border-brand-500 focus:ring-2 focus:ring-brand-500/20 dark:border-gray-700 dark:bg-gray-900 dark:text-white";

// ─── Types ────────────────────────────────────────────────────────────────────

type PartyDTO = {
  id: number | null;
  customerId: number;
  customerName: string;
  partyName: string;
  partyPhoneno: string;
  partyEmail: string;
  status: string; // "1" = Active, "0" = Inactive
};

// ─── Props ────────────────────────────────────────────────────────────────────
// When used as a modal (from CustomerDetails), pass these props.
// When used as a standalone route page, leave them undefined — it reads from URL params.

type PartyDetailsProps = {
  /** Customer ID — passed when embedded in a modal */
  customerIdProp?: number;
  /** Customer name — passed when embedded in a modal */
  customerNameProp?: string;
  /** True when rendered inside a modal (hides PageMeta, PageBreadcrumb, back button) */
  isModal?: boolean;
};

// ─── Helpers ──────────────────────────────────────────────────────────────────

const createEmptyForm = (customerId: number): PartyDTO => ({
  id: null,
  customerId,
  customerName: "",
  partyName: "",
  partyPhoneno: "",
  partyEmail: "",
  status: "1",
});

const getAxiosErrorMessage = (err: unknown): string => {
  if (err && typeof err === "object" && "response" in err) {
    const res = (err as any).response;
    return res?.data?.message ?? res?.data?.error ?? "An error occurred";
  }
  return "Network error — please try again";
};

// ─── Badge ────────────────────────────────────────────────────────────────────

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
      <span className={`size-1.5 rounded-full ${isActive ? "bg-green-500" : "bg-gray-400"}`} />
      {isActive ? "Active" : "Inactive"}
    </span>
  );
};

// ─── Main Component ───────────────────────────────────────────────────────────

export default function PartyDetails({
  customerIdProp,
  customerNameProp,
  isModal = false,
}: PartyDetailsProps) {
  const navigate = useNavigate();

  // ── Resolve customer identity ─────────────────────────────────────────────
  // Modal mode: use props. Standalone page mode: use URL params + router state.
  const { customerId: customerIdParam } = useParams<{ customerId: string }>();
  const location = useLocation();

  const resolvedCustomerId: string | number =
    customerIdProp ?? customerIdParam ?? "";
  const resolvedCustomerName: string =
    customerNameProp ??
    (location.state as { customerName?: string })?.customerName ??
    `Company #${resolvedCustomerId}`;

  const custIdNum = Number(resolvedCustomerId);

  // ── State ─────────────────────────────────────────────────────────────────
  const [rows, setRows] = useState<PartyDTO[]>([]);
  const [formState, setFormState] = useState<PartyDTO>(createEmptyForm(custIdNum));
  const [editingId, setEditingId] = useState<number | null>(null);
  const [showForm, setShowForm] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState("");
  const [successMessage, setSuccessMessage] = useState("");
  const [formError, setFormError] = useState("");
  const [fieldErrors, setFieldErrors] = useState<Partial<Record<keyof PartyDTO, string>>>({});

  const isEditing = editingId !== null;
  const clearMessages = () => {
    setErrorMessage("");
    setSuccessMessage("");
    setFormError("");
    setFieldErrors({});
  };
  const setField = <K extends keyof PartyDTO>(f: K, v: PartyDTO[K]) =>
    setFormState((p) => ({ ...p, [f]: v }));

  // ── Fetch ─────────────────────────────────────────────────────────────────
  const fetchRows = useCallback(async () => {
    if (!resolvedCustomerId) return;
    setIsLoading(true);
    setErrorMessage("");
    try {
      const res = await axiosInstance.get<PartyDTO[]>(
        PARTIES_BY_CUSTOMER(resolvedCustomerId),
      );
      setRows(res.data);
    } catch (err) {
      setErrorMessage(getAxiosErrorMessage(err));
    } finally {
      setIsLoading(false);
    }
  }, [resolvedCustomerId]);

  useEffect(() => {
    void fetchRows();
  }, [fetchRows]);

  // ── Form helpers ──────────────────────────────────────────────────────────
  const openCreateForm = () => {
    setEditingId(null);
    setFormState(createEmptyForm(custIdNum));
    setShowForm(true);
    clearMessages();
  };

  const openEditForm = (row: PartyDTO) => {
    setEditingId(row.id);
    setFormState({ ...row });
    setShowForm(true);
    clearMessages();
  };

  const handleCancelForm = () => {
    setEditingId(null);
    setFormState(createEmptyForm(custIdNum));
    setShowForm(false);
  };

  // ── Submit ────────────────────────────────────────────────────────────────
  const handleSubmit = async (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setFormError("");
    setFieldErrors({});
    setSuccessMessage("");

    // ✅ FULL FIELD VALIDATION
    const errs: Partial<Record<keyof PartyDTO, string>> = {};
    if (!formState.partyName.trim()) errs.partyName = "Contact name is required";
    if (!formState.partyPhoneno.trim()) errs.partyPhoneno = "Phone number is required";
    if (!formState.partyEmail.trim()) errs.partyEmail = "Email is required";
    else if (!formState.partyEmail.includes("@")) errs.partyEmail = "Invalid email format";

    if (Object.keys(errs).length > 0) {
      setFieldErrors(errs);
      setFormError("Please fill in all required fields before submitting.");
      return;
    }

    setIsSubmitting(true);

    const payload: Partial<PartyDTO> = { ...formState, customerId: custIdNum };
    if (!isEditing) delete payload.id;
    delete payload.customerName;

    try {
      if (isEditing && editingId !== null) {
        await axiosInstance.put(`${PARTIES_URL}/${editingId}`, payload);
        setSuccessMessage("Contact updated.");
      } else {
        await axiosInstance.post(PARTIES_URL, payload);
        setSuccessMessage("Contact created.");
      }
      handleCancelForm();
      await fetchRows();
    } catch (err) {
      console.error("Backend Error Detail (Parties):", err);
      setFormError(getAxiosErrorMessage(err));
    } finally {
      setIsSubmitting(false);
    }
  };

  // ── Delete ────────────────────────────────────────────────────────────────
  const handleDelete = async (id: number) => {
    if (!window.confirm(`Delete contact #${id}?`)) return;
    clearMessages();
    setIsSubmitting(true);
    try {
      await axiosInstance.delete(`${PARTIES_URL}/${id}`);
      if (editingId === id) handleCancelForm();
      setSuccessMessage("Contact deleted.");
      await fetchRows();
    } catch (err) {
      setErrorMessage(getAxiosErrorMessage(err));
    } finally {
      setIsSubmitting(false);
    }
  };

  // ── Shared inner content ──────────────────────────────────────────────────
  // Extracted so it renders identically in both modal and page modes.
  const content = (
    <>
      {/* Toolbar */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <p className="text-sm text-gray-500 dark:text-gray-400">
          All parties and contacts associated with{" "}
          <span className="font-medium text-gray-700 dark:text-gray-200">
            {resolvedCustomerName}
          </span>
        </p>
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => void fetchRows()}
            disabled={isLoading || isSubmitting}
            className="inline-flex items-center justify-center rounded-lg border border-gray-300 px-4 py-2.5 text-sm font-medium text-gray-700 hover:bg-gray-50 disabled:opacity-50 dark:border-gray-700 dark:text-gray-300 dark:hover:bg-white/[0.03]"
          >
            {isLoading && (
              <svg className="mr-2 h-4 w-4 animate-spin" fill="none" viewBox="0 0 24 24">
                <circle
                  className="opacity-25"
                  cx="12"
                  cy="12"
                  r="10"
                  stroke="currentColor"
                  strokeWidth="4"
                />
                <path
                  className="opacity-75"
                  fill="currentColor"
                  d="M4 12a8 8 0 018-8v8H4z"
                />
              </svg>
            )}
            Refresh
          </button>
          <button
            type="button"
            onClick={openCreateForm}
            disabled={isSubmitting}
            className="inline-flex items-center justify-center rounded-lg bg-brand-500 px-4 py-2.5 text-sm font-medium text-white hover:bg-brand-600 disabled:opacity-50"
          >
            + Add Party
          </button>
        </div>
      </div>

      {/* Banners */}
      {errorMessage && (
        <div className="mt-4 rounded-lg border border-error-500/40 bg-error-50 px-4 py-3 text-sm text-error-700 dark:bg-error-500/10 dark:text-error-400">
          {errorMessage}
        </div>
      )}
      {successMessage && (
        <div className="mt-4 rounded-lg border border-success-500/40 bg-success-50 px-4 py-3 text-sm text-success-700 dark:bg-success-500/10 dark:text-success-400">
          {successMessage}
        </div>
      )}

      {/* Add / Edit Party Modal */}
      <Modal
        isOpen={showForm}
        onClose={handleCancelForm}
        className="mx-4 w-full max-w-lg p-6 sm:p-8"
      >
        <h3 className="pr-12 text-xl font-semibold text-gray-800 dark:text-white/90">
          {isEditing ? "Edit Party" : "Add Party"}
        </h3>
        <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
          Contact person for{" "}
          <span className="font-medium text-gray-700 dark:text-gray-200">
            {resolvedCustomerName}
          </span>
        </p>

        {/* ── In-modal error toast ── */}
        {formError && (
          <div className="mt-4 flex items-start justify-between gap-2 rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700 dark:border-red-500/20 dark:bg-red-500/10 dark:text-red-400">
            <span>{formError}</span>
            <button
              type="button"
              onClick={() => setFormError("")}
              className="shrink-0 text-red-400 hover:text-red-600 dark:text-red-500 dark:hover:text-red-300"
              aria-label="Dismiss"
            >
              ✕
            </button>
          </div>
        )}

        <form onSubmit={(e) => void handleSubmit(e)} className="mt-6">
          <div className="grid grid-cols-1 gap-4">
            <div>
              <Label htmlFor="partyName">
                Full Name <span className="text-red-500">*</span>
              </Label>
              <Input
                id="partyName"
                value={formState.partyName}
                onChange={(e) => {
                  setField("partyName", e.target.value);
                  if (e.target.value.trim()) setFieldErrors((p) => ({ ...p, partyName: undefined }));
                }}
                placeholder="Contact person's full name"
                className={fieldErrors.partyName ? "border-red-500 ring-2 ring-red-500/20" : ""}
              />
              {fieldErrors.partyName && <p className="mt-1 text-xs text-red-500">{fieldErrors.partyName}</p>}
            </div>

            <div>
              <Label htmlFor="partyPhoneno">Phone Number <span className="text-red-500">*</span></Label>
              <Input
                id="partyPhoneno"
                value={formState.partyPhoneno}
                onChange={(e) => {
                  setField("partyPhoneno", e.target.value);
                  if (e.target.value.trim()) setFieldErrors((p) => ({ ...p, partyPhoneno: undefined }));
                }}
                placeholder="+91 XXXXX XXXXX"
                className={fieldErrors.partyPhoneno ? "border-red-500 ring-2 ring-red-500/20" : ""}
              />
              {fieldErrors.partyPhoneno && <p className="mt-1 text-xs text-red-500">{fieldErrors.partyPhoneno}</p>}
            </div>

            <div>
              <Label htmlFor="partyEmail">Email <span className="text-red-500">*</span></Label>
              <Input
                id="partyEmail"
                value={formState.partyEmail}
                onChange={(e) => {
                  setField("partyEmail", e.target.value);
                  if (e.target.value.trim()) setFieldErrors((p) => ({ ...p, partyEmail: undefined }));
                }}
                placeholder="person@company.com"
                className={fieldErrors.partyEmail ? "border-red-500 ring-2 ring-red-500/20" : ""}
              />
              {fieldErrors.partyEmail && <p className="mt-1 text-xs text-red-500">{fieldErrors.partyEmail}</p>}
            </div>

            <div>
              <Label htmlFor="p_status">Status <span className="text-red-500">*</span></Label>
              {isEditing ? (
                <select
                  id="p_status"
                  className={selectClass}
                  value={formState.status}
                  onChange={(e) => setField("status", e.target.value)}
                >
                  <option value="1">Active</option>
                  <option value="0">Inactive</option>
                </select>
              ) : (
                <div className="flex h-10 items-center">
                  <span className="inline-flex items-center gap-1 rounded-full bg-green-50 px-3 py-1 text-sm font-medium text-green-700 dark:bg-green-500/10 dark:text-green-400">
                    <span className="size-1.5 rounded-full bg-green-500" />
                    Active
                  </span>
                  <input type="hidden" name="status" value="1" />
                </div>
              )}
            </div>
          </div>

          <div className="mt-6 flex gap-2">
            <button
              type="submit"
              disabled={isSubmitting}
              className="inline-flex items-center justify-center rounded-lg bg-brand-500 px-4 py-2.5 text-sm font-medium text-white hover:bg-brand-600 disabled:opacity-50"
            >
              {isSubmitting ? "Saving..." : isEditing ? "Update Contact" : "Create Contact"}
            </button>
            <button
              type="button"
              onClick={handleCancelForm}
              disabled={isSubmitting}
              className="inline-flex items-center justify-center rounded-lg border border-gray-300 px-4 py-2.5 text-sm font-medium text-gray-700 hover:bg-gray-50 disabled:opacity-50 dark:border-gray-700 dark:text-gray-300"
            >
              Cancel
            </button>
          </div>
        </form>
      </Modal>

      {/* Parties Table */}
      <div className="mt-4 overflow-x-auto rounded-xl border border-gray-200 dark:border-gray-800">
        <Table>
          <TableHeader className="bg-gray-50 dark:bg-white/[0.03]">
            <TableRow>
              {["ID", "Name", "Phone", "Email", "Status", "Actions"].map((h) => (
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
                <TableCell
                  colSpan={6}
                  className="px-4 py-8 text-center text-sm text-gray-500 dark:text-gray-400"
                >
                  <div className="flex items-center justify-center gap-2">
                    <svg
                      className="h-4 w-4 animate-spin text-brand-500"
                      fill="none"
                      viewBox="0 0 24 24"
                    >
                      <circle
                        className="opacity-25"
                        cx="12"
                        cy="12"
                        r="10"
                        stroke="currentColor"
                        strokeWidth="4"
                      />
                      <path
                        className="opacity-75"
                        fill="currentColor"
                        d="M4 12a8 8 0 018-8v8H4z"
                      />
                    </svg>
                    Loading contacts…
                  </div>
                </TableCell>
              </TableRow>
            )}

            {!isLoading && rows.length === 0 && (
              <TableRow>
                <TableCell
                  colSpan={6}
                  className="px-4 py-8 text-center text-sm text-gray-500 dark:text-gray-400"
                >
                  No contacts yet for{" "}
                  <span className="font-medium">{resolvedCustomerName}</span>.
                  Click &ldquo;Add Party&rdquo; to add the first one.
                </TableCell>
              </TableRow>
            )}

            {!isLoading &&
              rows.map((row) => (
                <TableRow
                  key={row.id}
                  className="transition-colors hover:bg-brand-50/60 dark:hover:bg-brand-500/5"
                >
                  <TableCell className="px-4 py-3 text-sm font-medium text-brand-600 dark:text-brand-400">
                    {row.id}
                  </TableCell>
                  <TableCell className="px-4 py-3 text-sm font-medium text-gray-800 dark:text-white">
                    {row.partyName || "—"}
                  </TableCell>
                  <TableCell className="px-4 py-3 text-sm text-gray-600 dark:text-gray-300">
                    {row.partyPhoneno || "—"}
                  </TableCell>
                  <TableCell className="max-w-[200px] truncate px-4 py-3 text-sm text-gray-600 dark:text-gray-300">
                    {row.partyEmail || "—"}
                  </TableCell>
                  <TableCell className="px-4 py-3">
                    <StatusBadge status={row.status} />
                  </TableCell>
                  <TableCell className="px-4 py-3" onClick={(e) => e.stopPropagation()}>
                    <div className="flex items-center gap-2">
                      <button
                        type="button"
                        onClick={() => openEditForm(row)}
                        disabled={isSubmitting}
                        className="inline-flex items-center justify-center rounded-md border border-brand-300 px-3 py-1.5 text-xs font-medium text-brand-600 hover:bg-brand-50 disabled:opacity-50 dark:border-brand-800 dark:text-brand-300 dark:hover:bg-brand-500/10"
                      >
                        Edit
                      </button>
                      <button
                        type="button"
                        onClick={() => void handleDelete(row.id!)}
                        disabled={isSubmitting}
                        className="inline-flex items-center justify-center rounded-md border border-error-300 px-3 py-1.5 text-xs font-medium text-error-600 hover:bg-error-50 disabled:opacity-50 dark:border-error-800 dark:text-error-400 dark:hover:bg-error-500/10"
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
        <p className="mt-4 text-xs text-gray-400 dark:text-gray-500">
          {rows.length} contact{rows.length !== 1 ? "s" : ""} at {resolvedCustomerName}
        </p>
      )}
    </>
  );

  // ── Render: Modal mode (no page chrome) ───────────────────────────────────
  if (isModal) {
    return <div className="mt-2">{content}</div>;
  }

  // ── Render: Standalone page mode (with full page chrome) ──────────────────
  return (
    <>
      <PageMeta
        title={`Parties — ${resolvedCustomerName}`}
        description={`Parties and contact persons for ${resolvedCustomerName}`}
      />
      <PageBreadcrumb
        items={[{ label: "Customers", path: "/customers" }, { label: "Parties" }]}
      />

      <ComponentCard
        title={
          <span className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => navigate("/customers")}
              className="inline-flex items-center justify-center rounded-lg border border-gray-300 p-1.5 text-gray-500 hover:bg-gray-50 dark:border-gray-700 dark:text-gray-400 dark:hover:bg-white/[0.03]"
              title="Back to Customers"
            >
              <svg
                className="size-4"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth={2.5}
              >
                <path
                  d="M19 12H5M12 19l-7-7 7-7"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                />
              </svg>
            </button>
            <span>Parties</span>
            <span className="rounded-full bg-teal-50 px-3 py-0.5 text-xs font-semibold text-teal-700 dark:bg-teal-500/10 dark:text-teal-400">
              {resolvedCustomerName}
            </span>
          </span>
        }
        desc={`API: ${PARTIES_BY_CUSTOMER(resolvedCustomerId)}`}
      >
        {content}
      </ComponentCard>
    </>
  );
}