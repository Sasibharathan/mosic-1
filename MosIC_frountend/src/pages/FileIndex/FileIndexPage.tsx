import { type FormEvent, useCallback, useEffect, useState } from "react";
import { useNavigate } from "react-router";
import PageMeta from "../../components/common/PageMeta";
import PageBreadcrumb from "../../components/common/PageBreadCrumb";
import ComponentCard from "../../components/common/ComponentCard";
import Label from "../../components/form/Label";
import Input from "../../components/form/input/InputField";
import TextArea from "../../components/form/input/TextArea";
import { usePermissions } from "../../hooks/usePermissions"; // ✅ already imported — now actually used
import DatePicker from "../../components/form/input/DatePicker";
import {
  Table,
  TableBody,
  TableCell,
  TableHeader,
  TableRow,
} from "../../components/ui/table";
import { Modal } from "../../components/ui/modal";
import axiosInstance from "../../utils/axiosInstance";
import {
  type FileIndexRow,
  type FileIndexFormState,
  COLLECTION_URL,
  createEmptyFileForm,
  extractRows,
  mapFileRow,
  getAxiosErrorMessage,
} from "./FileIndex.shared";

// ─── Types ────────────────────────────────────────────────────────────────────

type ActivityType = {
  id: number;
  activityTypeName: string;
  activityTypeStatus: string;
};

type ActivityTypeForm = {
  activityTypeName: string;
  activityTypeStatus: string;
};

const emptyActivityForm: ActivityTypeForm = {
  activityTypeName: "",
  activityTypeStatus: "1",
};

const ACTIVITY_URL = "/api/activity-type";

const selectClass =
  "h-10 w-full rounded-lg border border-gray-300 bg-white px-3 text-sm text-gray-800 outline-none transition-colors focus:border-brand-500 focus:ring-2 focus:ring-brand-500/20 dark:border-gray-700 dark:bg-gray-900 dark:text-white";

const StatusBadge = ({ status }: { status: string }) => {
  const isActive = status === "1"|| status === "ACTIVE";
  return (
    <span className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-xs font-medium ${
      isActive
        ? "bg-green-50 text-green-700 dark:bg-green-500/10 dark:text-green-400"
        : "bg-gray-100 text-gray-500 dark:bg-gray-700 dark:text-gray-400"
    }`}>
      <span className={`size-1.5 rounded-full ${isActive ? "bg-green-500" : "bg-gray-400"}`} />
      {isActive ? "Active" : "Disabled"}
    </span>
  );
};

// ─── Activity Type CRUD Modal ─────────────────────────────────────────────────
// NOTE: This modal manages activity types (a settings/config screen).
// The permissions here also apply — only admin/superuser can add/edit/delete activity types.

function ActivityTypeModal({
  isOpen,
  onClose,
}: {
  isOpen: boolean;
  onClose: () => void;
}) {
  const { canCreate, canEdit, canDelete } = usePermissions(); // ✅ ADDED: permissions inside this modal too

  const [activities, setActivities] = useState<ActivityType[]>([]);
  const [loading, setLoading]       = useState(false);
  const [form, setForm]             = useState<ActivityTypeForm>(emptyActivityForm);
  const [editingId, setEditingId]   = useState<number | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError]           = useState("");
  const [success, setSuccess]       = useState("");

  const fetchActivities = useCallback(async () => {
    setLoading(true);
    try {
      const res = await axiosInstance.get<ActivityType[]>(ACTIVITY_URL);
      setActivities(res.data);
    } catch {
      setError("Failed to load activity types");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (isOpen) {
      void fetchActivities();
      setForm(emptyActivityForm);
      setEditingId(null);
      setError("");
      setSuccess("");
    }
  }, [isOpen, fetchActivities]);

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setError("");
    setSuccess("");

    if (!form.activityTypeName.trim()) {
      setError("Activity name is required");
      return;
    }

    const duplicate = activities.find(
      (a) =>
        a.activityTypeName.toLowerCase() === form.activityTypeName.trim().toLowerCase() &&
        a.id !== editingId,
    );
    if (duplicate) {
      setError(`"${form.activityTypeName}" already exists`);
      return;
    }

    setSubmitting(true);
    try {
      if (editingId !== null) {
        await axiosInstance.put(`${ACTIVITY_URL}/${editingId}`, form);
        setSuccess("Activity type updated");
      } else {
        await axiosInstance.post(ACTIVITY_URL, form);
        setSuccess("Activity type created");
      }
      setForm(emptyActivityForm);
      setEditingId(null);
      await fetchActivities();
    } catch (err: any) {
      setError(err?.response?.data?.message ?? "Something went wrong");
    } finally {
      setSubmitting(false);
    }
  };

  const handleEdit = (a: ActivityType) => {
    setEditingId(a.id);
    setForm({
      activityTypeName: a.activityTypeName,
      activityTypeStatus: a.activityTypeStatus,
    });
    setError("");
    setSuccess("");
  };

  const handleDelete = async (id: number) => {
    if (!window.confirm("Delete this activity type?")) return;
    setError("");
    setSuccess("");
    try {
      await axiosInstance.delete(`${ACTIVITY_URL}/${id}`);
      setSuccess("Activity type deleted");
      if (editingId === id) { setEditingId(null); setForm(emptyActivityForm); }
      await fetchActivities();
    } catch (err: any) {
      setError(err?.response?.data?.message ?? "Failed to delete");
    }
  };

  const handleCancel = () => {
    setEditingId(null);
    setForm(emptyActivityForm);
    setError("");
    setSuccess("");
  };


  return (
    <Modal isOpen={isOpen} onClose={onClose} className="mx-4 w-full max-w-2xl p-6">
      <div className="mb-5">
        <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
          Manage Activity Types
        </h3>
        <p className="mt-0.5 text-sm text-gray-400">
          Add, edit, or remove activity types used in File Index
        </p>
      </div>

      {error && (
        <div className="mb-4 rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-600 dark:border-red-500/20 dark:bg-red-500/10 dark:text-red-400">
          {error}
        </div>
      )}
      {success && (
        <div className="mb-4 rounded-lg border border-green-200 bg-green-50 px-4 py-3 text-sm text-green-600 dark:border-green-500/20 dark:bg-green-500/10 dark:text-green-400">
          {success}
        </div>
      )}

      {/* ✅ CHANGED: Add form hidden for role="user" — only superuser/admin can add activity types */}
      {canCreate && (
        <form onSubmit={(e) => void handleSubmit(e)}>
          <div className="flex flex-wrap gap-3 items-end">
            <div className="flex-1 min-w-[180px]">
              <Label htmlFor="act_name">
                {editingId !== null ? "Edit Activity Name" : "New Activity Name"}{" "}
                <span className="text-red-500">*</span>
              </Label>
              <Input
                id="act_name"
                value={form.activityTypeName}
                onChange={(e) => setForm((p) => ({ ...p, activityTypeName: e.target.value }))}
                placeholder="e.g. CUSTOMER"
              />
            </div>
            <div className="w-36">
              <Label htmlFor="act_status">Status</Label>
              {editingId !== null ? (
                <select
                  id="act_status"
                  className={selectClass}
                  value={form.activityTypeStatus}
                  onChange={(e) => setForm((p) => ({ ...p, activityTypeStatus: e.target.value }))}
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
            <button
              type="submit"
              disabled={submitting}
              className="h-10 rounded-lg bg-brand-500 px-4 text-sm font-medium text-white hover:bg-brand-600 disabled:opacity-50 transition-colors shrink-0"
            >
              {submitting ? "Saving..." : editingId !== null ? "Update" : "Add"}
            </button>
            {editingId !== null && (
              <button
                type="button"
                onClick={handleCancel}
                className="h-10 rounded-lg border border-gray-300 px-4 text-sm font-medium text-gray-600 hover:bg-gray-50 dark:border-gray-700 dark:text-gray-300 shrink-0"
              >
                Cancel
              </button>
            )}
          </div>
        </form>
      )}

      {/* List */}
      <div className="mt-5 overflow-hidden rounded-xl border border-gray-200 dark:border-gray-800">
        <table className="w-full text-sm">
          <thead className="bg-gray-50 dark:bg-white/[0.03]">
            <tr>
              {["#", "Name", "Status", "Actions"].map((h) => (
                <th key={h} className="px-3 py-2 text-left text-xs font-semibold uppercase tracking-wide text-gray-500 dark:text-gray-400">
                  {h}
                </th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100 dark:divide-gray-800">
            {loading ? (
              Array.from({ length: 3 }).map((_, i) => (
                <tr key={i}>
                  {Array.from({ length: 4 }).map((_, j) => (
                    <td key={j} className="px-4 py-3">
                      <div className="h-4 rounded bg-gray-100 dark:bg-gray-800 animate-pulse w-3/4" />
                    </td>
                  ))}
                </tr>
              ))
            ) : activities.length === 0 ? (
              <tr>
                <td colSpan={4} className="px-4 py-8 text-center text-sm text-gray-400">
                  No activity types yet. Add one above.
                </td>
              </tr>
            ) : (
              activities.map((a, idx) => (
                <tr
                  key={a.id}
                  className={`transition-colors hover:bg-gray-50 dark:hover:bg-white/[0.02] ${
                    editingId === a.id ? "bg-brand-50 dark:bg-brand-500/5" : ""
                  }`}
                >
                  <td className="px-3 py-2 text-gray-400 text-xs">{idx + 1}</td>
                  <td className="px-3 py-2 font-medium text-gray-800 dark:text-white text-xs">
                    {a.activityTypeName}
                  </td>
                  <td className="px-3 py-2">
                    <StatusBadge status={a.activityTypeStatus} />
                  </td>
                  <td className="px-3 py-2">
                    <div className="flex items-center gap-1.5">
                      {/* ✅ CHANGED: Edit button hidden for role="user" */}
                      {canEdit && (
                        <button
                          type="button"
                          onClick={() => handleEdit(a)}
                          className="rounded-md border border-brand-300 px-2.5 py-1 text-xs font-medium text-brand-600 hover:bg-brand-50 dark:border-brand-800 dark:text-brand-400 dark:hover:bg-brand-500/10 transition-colors"
                        >
                          Edit
                        </button>
                      )}
                      {/* ✅ CHANGED: Delete button hidden for role="user" and role="superuser" */}
                      {canDelete && (
                        <button
                          type="button"
                          onClick={() => void handleDelete(a.id)}
                          className="rounded-md border border-red-300 px-2.5 py-1 text-xs font-medium text-red-600 hover:bg-red-50 dark:border-red-800 dark:text-red-400 dark:hover:bg-red-500/10 transition-colors"
                        >
                          Delete
                        </button>
                      )}
                      {/* ✅ ADDED: dash shown when user has no actions */}
                      {!canEdit && !canDelete && (
                        <span className="text-xs text-gray-300 dark:text-gray-600">—</span>
                      )}
                    </div>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      <div className="mt-5 flex justify-end">
        <button
          type="button"
          onClick={onClose}
          className="rounded-lg border border-gray-300 px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50 dark:border-gray-700 dark:text-gray-300 dark:hover:bg-gray-800 transition-colors"
        >
          Close
        </button>
      </div>
    </Modal>
  );
}

// ─── Main Page ────────────────────────────────────────────────────────────────

export default function FileIndexPage() {
  const navigate = useNavigate();

  // ✅ ADDED: pull permissions — this is the only new line needed in the main component
  const { canCreate, canEdit, canDelete } = usePermissions();

  const [rows, setRows]                           = useState<FileIndexRow[]>([]);
  const [formState, setFormState]                 = useState<FileIndexFormState>(createEmptyFileForm);
  const [editingId, setEditingId]                 = useState<string | null>(null);
  const [showForm, setShowForm]                   = useState(false);
  const [isLoading, setIsLoading]                 = useState(false);
  const [isSubmitting, setIsSubmitting]           = useState(false);
  const [errorMessage, setErrorMessage]           = useState("");
  const [successMessage, setSuccessMessage]       = useState("");
  const [activityTypes, setActivityTypes]         = useState<ActivityType[]>([]);
  const [showActivityModal, setShowActivityModal] = useState(false);

  const isEditing = editingId !== null;
  const clearMessages = () => { setErrorMessage(""); setSuccessMessage(""); };

  // ─── Search / Filter / Pagination ──────────────────────────────────────────
  const [searchQuery, setSearchQuery]       = useState("");
  const [filterActivity, setFilterActivity] = useState("all");
  const [filterStatus, setFilterStatus]     = useState("all");
  const [currentPage, setCurrentPage]       = useState(1);
  const PAGE_SIZE = 10;

  // Descending — newest (highest id) on top
  const sortedRows = [...rows].sort((a, b) => {
    const aId = parseInt(String(a.id), 10) || 0;
    const bId = parseInt(String(b.id), 10) || 0;
    return bId - aId;
  });

  const filteredRows = sortedRows.filter((r) => {
    const q = searchQuery.toLowerCase();
    const matchSearch   = !q
      || (r.f_subject    ?? "").toLowerCase().includes(q)
      || (r.f_activity   ?? "").toLowerCase().includes(q)
      || (r.f_description ?? "").toLowerCase().includes(q)
      || String(r.id).includes(q);
    const matchActivity = filterActivity === "all" || r.f_activity === filterActivity;
    const matchStatus   = filterStatus === "all"
      || (filterStatus === "1" && (r.status === "1" || r.status === "ACTIVE"))
      || (filterStatus === "0" && r.status !== "1" && r.status !== "ACTIVE");
    return matchSearch && matchActivity && matchStatus;
  });

  const totalPages    = Math.max(1, Math.ceil(filteredRows.length / PAGE_SIZE));
  const pagedRows     = filteredRows.slice((currentPage - 1) * PAGE_SIZE, currentPage * PAGE_SIZE);
  const allActivities = Array.from(new Set(rows.map((r) => r.f_activity).filter(Boolean)));

  const fetchActivityTypes = useCallback(async () => {
    try {
      const res = await axiosInstance.get<ActivityType[]>(ACTIVITY_URL);
      setActivityTypes(res.data.filter((a) => a.activityTypeStatus === "1"));
    } catch {
      // silently fail
    }
  }, []);

  const fetchRows = useCallback(async () => {
    setIsLoading(true);
    setErrorMessage("");
    try {
      const res = await axiosInstance.get<unknown>(COLLECTION_URL);
      const mapped = extractRows(res.data)
        .map(mapFileRow)
        .filter((r): r is FileIndexRow => r !== null);
      setRows(mapped);
    } catch (err) {
      setErrorMessage(getAxiosErrorMessage(err));
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    void fetchRows();
    void fetchActivityTypes();
  }, [fetchRows, fetchActivityTypes]);

  const setField = (field: keyof FileIndexFormState, value: string) =>
    setFormState((prev) => ({ ...prev, [field]: value }));

  const openCreateForm = () => {
    setEditingId(null);
    setFormState(createEmptyFileForm());
    setShowForm(true);
    clearMessages();
  };

  const openEditForm = (row: FileIndexRow) => {
    setEditingId(row.id);
    setFormState({
      f_date: row.f_date,
      f_activity: row.f_activity,
      f_subject: row.f_subject,
      f_description: row.f_description,
      status: row.status,
      datecreated: row.datecreated,
    });
    setShowForm(true);
    clearMessages();
  };

  const handleCancelForm = () => {
    setEditingId(null);
    setFormState(createEmptyFileForm());
    setShowForm(false);
  };

  const handleSubmit = async (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    clearMessages();
    if (!formState.f_activity.trim() || !formState.f_subject.trim()) {
      setErrorMessage("Activity and Subject are required.");
      return;
    }
    setIsSubmitting(true);
{/*
    const payload: Record<string, string> = {
      fileDate: formState.f_date,
      fileActivity: formState.f_activity,
      fileSubject: formState.f_subject,
      fileDescription: formState.f_description,
      fileStatus: formState.status,
    };
*/}
    const payload = {
      fileDate: formState.f_date,
      fileActivity: formState.f_activity,
      fileSubject: formState.f_subject,
      fileDescription: formState.f_description,
      fileStatus: Number(formState.status),
    };
    try {
      if (isEditing && editingId) {
        await axiosInstance.put(`${COLLECTION_URL}/${encodeURIComponent(editingId)}`, payload);
      } else {
        await axiosInstance.post(COLLECTION_URL, payload);
      }
      setSuccessMessage(isEditing ? "File updated." : "File created.");
      handleCancelForm();
      await fetchRows();
    } catch (err) {
      setErrorMessage(getAxiosErrorMessage(err));
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDelete = async (id: string) => {
    if (!window.confirm(`Delete file row ${id}?`)) return;
    clearMessages();
    setIsSubmitting(true);
    try {
      await axiosInstance.delete(`${COLLECTION_URL}/${encodeURIComponent(id)}`);
      if (editingId === id) handleCancelForm();
      setSuccessMessage("File deleted.");
      await fetchRows();
    } catch (err) {
      setErrorMessage(getAxiosErrorMessage(err));
    } finally {
      setIsSubmitting(false);
    }
  };
{/*
  // DD-MM-YYYY  →  YYYY-MM-DD  (for the input value)
  const toInputDate = (val: string): string => {
    if (!val) return "";
    const parts = val.split("-");
    if (parts.length !== 3) return val;
    const [dd, mm, yyyy] = parts;
    return `${yyyy}-${mm}-${dd}`;
  };

  // YYYY-MM-DD  →  DD-MM-YYYY  (to save back to state)
  const fromInputDate = (val: string): string => {
    if (!val) return "";
    const parts = val.split("-");
    if (parts.length !== 3) return val;
    const [yyyy, mm, dd] = parts;
    return `${dd}-${mm}-${yyyy}`;
  };
*/}
  const handleRowClick = (row: FileIndexRow) => {
    navigate(`/file-index/${encodeURIComponent(row.id)}/activity`, {
      state: { file: row },
    });
  };

  return (
    <>
      <PageMeta title="MosIC_frontend | File Index" description="File index CRUD table" />
      <PageBreadcrumb pageTitle="File Index" />

      {/**<ComponentCard title="Files" desc={`API endpoint: ${COLLECTION_URL}`}>*/}
      <ComponentCard title="Files" desc="Manage your files and their activities. Click a row to view its activity history.">
        {/* Toolbar */}
        <div className="flex flex-wrap items-center justify-between gap-2">
          <p className="text-xs text-gray-500 dark:text-gray-400">
            {filteredRows.length} of {rows.length} file{rows.length !== 1 ? "s" : ""}
          </p>
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => void fetchRows()}
              disabled={isLoading || isSubmitting}
              className="inline-flex items-center justify-center rounded-md border border-gray-300 px-3 py-1.5 text-xs font-medium text-gray-700 hover:bg-gray-50 disabled:opacity-50 dark:border-gray-700 dark:text-gray-300 dark:hover:bg-white/[0.03]"
            >
              {isLoading && (
                <svg className="mr-1.5 h-3 w-3 animate-spin" fill="none" viewBox="0 0 24 24">
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
                + Add File Row
              </button>
            )}
          </div>
        </div>

        {/* ── Search & Filter Bar ── */}
        <div className="flex flex-wrap items-center gap-3">
          <div className="relative flex-1 min-w-[180px]">
            <svg className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 size-4 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <circle cx="11" cy="11" r="8" /><path d="M21 21l-4.35-4.35" strokeLinecap="round" />
            </svg>
            <input type="text" value={searchQuery}
              onChange={(e) => { setSearchQuery(e.target.value); setCurrentPage(1); }}
              placeholder="Search by subject, activity, description or ID…"
              className="h-10 w-full rounded-lg border border-gray-200 bg-white pl-9 pr-4 text-sm text-gray-700 outline-none focus:border-brand-500 dark:border-gray-700 dark:bg-gray-900 dark:text-gray-200 dark:placeholder:text-gray-500"
            />
          </div>
          <select value={filterActivity}
            onChange={(e) => { setFilterActivity(e.target.value); setCurrentPage(1); }}
            className="h-10 rounded-lg border border-gray-200 bg-white px-3 text-sm text-gray-700 outline-none dark:border-gray-700 dark:bg-gray-900 dark:text-gray-200">
            <option value="all">All Activities</option>
            {allActivities.map((a) => <option key={a} value={a}>{a}</option>)}
          </select>
          <select value={filterStatus}
            onChange={(e) => { setFilterStatus(e.target.value); setCurrentPage(1); }}
            className="h-10 rounded-lg border border-gray-200 bg-white px-3 text-sm text-gray-700 outline-none dark:border-gray-700 dark:bg-gray-900 dark:text-gray-200">
            <option value="all">All Status</option>
            <option value="1">Active</option>
            <option value="0">Inactive</option>
          </select>
        </div>

        {/* Banners */}
        {errorMessage && (
          <div className="rounded-lg border border-error-500/40 bg-error-50 px-4 py-3 text-sm text-error-700 dark:bg-error-500/10 dark:text-error-400">
            {errorMessage}
          </div>
        )}
        {successMessage && (
          <div className="rounded-lg border border-success-500/40 bg-success-50 px-4 py-3 text-sm text-success-700 dark:bg-success-500/10 dark:text-success-400">
            {successMessage}
          </div>
        )}

        {/* Create / Edit Modal — unchanged, only accessible when canCreate/canEdit is true via the buttons */}
        <Modal
          isOpen={showForm}
          onClose={handleCancelForm}
          className="mx-4 w-full max-w-4xl p-6 sm:p-8"
        >
          <h3 className="pr-12 text-xl font-semibold text-gray-800 dark:text-white/90">
            {isEditing ? "Edit File Row" : "Add File Row"}
          </h3>
          <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
            Enter values and submit to update the `file_index` table.
          </p>

          <form onSubmit={(e) => void handleSubmit(e)} className="mt-6">
            <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
              <div>
                <Label htmlFor="f_date">File Date</Label>
                <DatePicker
                  value={formState.f_date}
                  onChange={(val) => setField("f_date", val)}
                />
              </div>
              <div>
                <Label htmlFor="status">Status</Label>
                {isEditing ? (
                  <select
                    id="status"
                    className={selectClass}
                    value={formState.status}
                    onChange={(e) => setField("status", e.target.value)}
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

              <div>
                <Label htmlFor="f_activity">
                  Activity <span className="text-red-500">*</span>
                </Label>
                <div className="flex items-center gap-2">
                  <select
                    id="f_activity"
                    className={selectClass}
                    value={formState.f_activity}
                    onChange={(e) => setField("f_activity", e.target.value)}
                  >
                    <option value="">— Select Activity —</option>
                    {activityTypes.map((a) => (
                      <option key={a.id} value={a.activityTypeName}>
                        {a.activityTypeName}
                      </option>
                    ))}
                  </select>
                  <button
                    type="button"
                    title="Manage activity types"
                    onClick={() => setShowActivityModal(true)}
                    className="flex size-10 shrink-0 items-center justify-center rounded-lg border border-brand-300 text-brand-600 hover:bg-brand-50 dark:border-brand-700 dark:text-brand-400 dark:hover:bg-brand-500/10 transition-colors"
                  >
                    <svg className="size-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2.5}>
                      <path d="M12 5v14M5 12h14" strokeLinecap="round" />
                    </svg>
                  </button>
                </div>
                {activityTypes.length === 0 && (
                  <p className="mt-1 text-xs text-amber-500">
                    No active activity types — click + to add one.
                  </p>
                )}
              </div>

              <div>
                <Label htmlFor="f_subject">
                  Subject <span className="text-red-500">*</span>
                </Label>
                <Input
                  id="f_subject"
                  value={formState.f_subject}
                  onChange={(e) => setField("f_subject", e.target.value)}
                />
              </div>

              <div className="md:col-span-2">
                <Label htmlFor="f_description">Description</Label>
                <TextArea
                  value={formState.f_description}
                  onChange={(v) => setField("f_description", v)}
                  placeholder="Enter file description"
                />
              </div>
            </div>

            <div className="mt-6 flex gap-2">
              <button
                type="submit"
                disabled={isSubmitting}
                className="inline-flex items-center justify-center rounded-lg bg-brand-500 px-4 py-2.5 text-sm font-medium text-white hover:bg-brand-600 disabled:opacity-50"
              >
                {isEditing ? "Update Row" : "Create Row"}
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

        <ActivityTypeModal
          isOpen={showActivityModal}
          onClose={() => {
            setShowActivityModal(false);
            void fetchActivityTypes();
          }}
        />

        {/* Files Table */}
        <div className="overflow-x-auto rounded-xl border border-gray-200 dark:border-gray-800">
          <Table>
            <TableHeader className="bg-gray-50 dark:bg-white/[0.03]">
              <TableRow>
                {["ID", "File Date", "Activity", "Subject", "Description", "Status", "Actions"].map((h) => (
                  <TableCell key={h} isHeader className="px-3 py-2 text-left text-xs font-semibold uppercase tracking-wide text-gray-600 dark:text-gray-300">
                    {h}
                  </TableCell>
                ))}
              </TableRow>
            </TableHeader>

            <TableBody className="divide-y divide-gray-100 dark:divide-gray-800">
              {isLoading && (
                <TableRow>
                  <TableCell className="px-3 py-5 text-center text-xs text-gray-500 dark:text-gray-400" colSpan={8}>
                    <div className="flex items-center justify-center gap-2">
                      <svg className="h-3.5 w-3.5 animate-spin text-brand-500" fill="none" viewBox="0 0 24 24">
                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8H4z" />
                      </svg>
                      Loading files…
                    </div>
                  </TableCell>
                </TableRow>
              )}

              {!isLoading && rows.length === 0 && (
                <TableRow>
                  <TableCell className="px-3 py-5 text-center text-xs text-gray-500 dark:text-gray-400" colSpan={8}>
                    No rows found.{canCreate ? ' Click "Add File Row" to create your first record.' : ""}
                  </TableCell>
                </TableRow>
              )}

              {!isLoading && rows.length > 0 && filteredRows.length === 0 && (
                <TableRow>
                  <TableCell className="px-3 py-8 text-center text-xs text-gray-400 dark:text-gray-500" colSpan={8}>
                    No files match your search or filters.{" "}
                    <button type="button"
                      onClick={() => { setSearchQuery(""); setFilterActivity("all"); setFilterStatus("all"); }}
                      className="text-brand-500 underline underline-offset-2 hover:no-underline">
                      Clear filters
                    </button>
                  </TableCell>
                </TableRow>
              )}

              {!isLoading && pagedRows.map((row) => (
                <TableRow
                  key={row.id}
                  onClick={() => handleRowClick(row)}
                  className="cursor-pointer transition-colors hover:bg-brand-50/60 dark:hover:bg-brand-500/5"
                  title={`Open activities for file ${row.id}`}
                >
                  <TableCell className="px-3 py-2 text-xs font-medium text-brand-600 dark:text-brand-400">
                    {row.id}
                  </TableCell>
                  <TableCell className="px-3 py-2 text-xs text-gray-600 dark:text-gray-300">
                    {row.f_date || "—"}
                  </TableCell>
                  <TableCell className="px-3 py-2 text-xs text-gray-600 dark:text-gray-300">
                    {row.f_activity || "—"}
                  </TableCell>
                  <TableCell className="px-3 py-2 text-xs text-gray-600 dark:text-gray-300">
                    {row.f_subject || "—"}
                  </TableCell>
                  <TableCell className="max-w-[240px] truncate px-3 py-2 text-xs text-gray-600 dark:text-gray-300">
                    {row.f_description || "—"}
                  </TableCell>

                  <TableCell className="px-3 py-2">
                    <StatusBadge status={row.status} />
                  </TableCell>

                  {/*
                  <TableCell className="px-4 py-3">
                    <span className={`inline-flex items-center rounded px-2 py-0.5 text-xs font-medium ${
                      row.status === "ACTIVE"
                        ? "bg-success-50 text-success-700 dark:bg-success-500/10 dark:text-success-400"
                        : "bg-gray-100 text-gray-600 dark:bg-gray-800 dark:text-gray-400"
                    }`}>
                      {row.status || "—"}
                    </span>
                  </TableCell>
                  */}
                  {/*<TableCell className="px-4 py-3 text-sm text-gray-600 dark:text-gray-300">
                    {row.datecreated || "—"}
                  </TableCell>
                  */}
                  <TableCell className="px-3 py-2 text-xs" onClick={(e) => e.stopPropagation()}>
                    <div className="flex items-center gap-1.5">
                      {/* ✅ CHANGED: Edit button hidden for role="user" */}
                      {canEdit && (
                        <button
                          type="button"
                          onClick={() => openEditForm(row)}
                          disabled={isSubmitting}
                          className="inline-flex items-center justify-center rounded border border-brand-300 px-2 py-1 text-xs font-medium text-brand-600 hover:bg-brand-50 disabled:opacity-50 dark:border-brand-800 dark:text-brand-300 dark:hover:bg-brand-500/10"
                        >
                          Edit
                        </button>
                      )}
                      {/* ✅ CHANGED: Delete button hidden for role="user" and role="superuser" */}
                      {canDelete && (
                        <button
                          type="button"
                          onClick={() => void handleDelete(row.id)}
                          disabled={isSubmitting}
                          className="inline-flex items-center justify-center rounded border border-error-300 px-2 py-1 text-xs font-medium text-error-600 hover:bg-error-50 disabled:opacity-50 dark:border-error-800 dark:text-error-400 dark:hover:bg-error-500/10"
                        >
                          Delete
                        </button>
                      )}
                      {/* ✅ ADDED: dash when user has no actions */}
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

        {/* ── Pagination ── */}
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
          <p className="text-xs text-gray-400 dark:text-gray-500">
            {rows.length} file{rows.length !== 1 ? "s" : ""} — click a row to open its full activity page
          </p>
        )}
      </ComponentCard>
    </>
  );
}