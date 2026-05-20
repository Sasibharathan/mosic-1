import { type FormEvent, useCallback, useEffect, useRef, useState } from "react";
import { useLocation, useNavigate, useParams } from "react-router";
import axios from "axios";
import PageMeta from "../../components/common/PageMeta";
import PageBreadcrumb from "../../components/common/PageBreadCrumb";
import Label from "../../components/form/Label";
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
import { usePermissions } from "../../hooks/usePermissions";
import {
  type FileIndexRow,
  type ActivityRow,
  type ActivityFormState,
  // type BlobMeta,
  COLLECTION_URL,
  ACTIVITIES_URL,
  BLOBS_URL,
  createEmptyActivityForm,
  extractRows,
  mapFileRow,
  mapActivityRow,
  getAxiosErrorMessage,
  formatFileSize,
  isBlobLinked,
} from "./FileIndex.shared";

// ─── PDF generators ───────────────────────────────────────────────────────────
import { generateSalesPDF }    from "../pdf/Generatesalespdf";
import { generatePurchasePDF } from "../pdf/Generatepurchasepdf";
import { generateMatpassPDF }  from "../pdf/Generatematpasspdf";
import DatePicker from "../../components/form/input/DatePicker";

// ─── Shared input classes ─────────────────────────────────────────────────────

const _dateInputClass =
  "h-10 w-full rounded-lg border border-gray-300 bg-white px-3 text-sm text-gray-800 outline-none transition-colors focus:border-brand-500 focus:ring-2 focus:ring-brand-500/20 dark:border-gray-700 dark:bg-gray-900 dark:text-white [color-scheme:light] dark:[color-scheme:dark]";

const selectClass =
  "h-10 w-full appearance-none rounded-lg border border-gray-300 bg-white pl-3 pr-9 text-sm font-medium outline-none transition-colors focus:border-brand-500 focus:ring-2 focus:ring-brand-500/20 dark:border-gray-700 dark:bg-gray-900 dark:text-white";

// ─── Status helpers ───────────────────────────────────────────────────────────

/**
 * Normalise whatever the API returns (raw "1","2","3","0") into canonical labels.
 * DB stores: 1=Active, 2=Processing, 3=Complete, 0=Disabled
 */
const normaliseStatus = (raw: string | undefined | null): string => {
  const s = String(raw ?? "").toUpperCase().trim();
  if (s === "1" || s === "ACTIVE")      return "ACTIVE";
  if (s === "2" || s === "PROCESSING")  return "PROCESSING";
  if (s === "3" || s === "COMPLETE")    return "COMPLETE";
  if (s === "0" || s === "DISABLED")    return "DISABLED";
  return s; // pass-through for unknown values
};

/** Badge colour classes for a normalised status string */
const statusBadgeClass = (status: string): string => {
  if (status === "ACTIVE")
    return "bg-success-50 text-success-700 dark:bg-success-500/10 dark:text-success-400";
  if (status === "PROCESSING")
    return "bg-warning-50 text-warning-700 dark:bg-warning-500/10 dark:text-warning-400";
  if (status === "COMPLETE")
    return "bg-blue-50 text-blue-700 dark:bg-blue-500/10 dark:text-blue-400";
  if (status === "DISABLED")
    return "bg-error-50 text-error-600 dark:bg-error-500/10 dark:text-error-400";
  return "bg-gray-100 text-gray-600 dark:bg-gray-800 dark:text-gray-400";
};

/** Human-readable label for a normalised status string */
const statusLabel = (status: string): string => {
  if (status === "ACTIVE")      return "Active";
  if (status === "PROCESSING")  return "Processing";
  if (status === "COMPLETE")    return "Complete";
  if (status === "DISABLED")    return "Disabled";
  return status || "—";
};

// ─── Doc-table helpers ────────────────────────────────────────────────────────

/**
 * Returns true when the activity has a linked blob (DOC_BLOB_TABLE).
 * The existing View / Download buttons handle this case — leave them untouched.
 */
const isDocBlob = (act: ActivityRow) =>
  String(act.activityDocTable ?? "").toUpperCase() === "DOC_BLOB_TABLE" &&
  isBlobLinked(act.activityDocId);

/**
 * Returns true when the activity references a generatable PDF document
 * (SALES_REGISTER, PURCHASE_REGISTER, or MATERIAL_PASS) with a valid ID.
 */
const isGeneratablePdf = (act: ActivityRow): boolean => {
  const table = String(act.activityDocTable ?? "").toUpperCase();
  const hasId  = act.activityDocId && act.activityDocId.trim() !== "" && act.activityDocId !== "0";
  return (
    hasId === true &&
    (table === "SALES_REGISTER" ||
      table === "PURCHASE_REGISTER" ||
      table === "MATERIAL_PASS")
  );
};

/** Human-readable label for the Generate PDF button tooltip */
const docTableLabel = (table: string): string => {
  const t = table.toUpperCase();
  if (t === "SALES_REGISTER")    return "Sales Document";
  if (t === "PURCHASE_REGISTER") return "Purchase Document";
  if (t === "MATERIAL_PASS")     return "Material Pass";
  return "Document";
};

// ─────────────────────────────────────────────────────────────────────────────

export default function FileActivityPage() {
  const { fileId }  = useParams<{ fileId: string }>();
  const location    = useLocation();
  const navigate    = useNavigate();

  const { canCreate, canEdit, canDelete } = usePermissions();

  // ── File data ──────────────────────────────────────────────────────────────
  const [file, setFile]           = useState<FileIndexRow | null>(
    (location.state as { file?: FileIndexRow } | null)?.file ?? null,
  );
  const [fileLoading, setFileLoading] = useState(file === null);
  const [fileError, setFileError]     = useState("");

  useEffect(() => {
    if (file !== null || !fileId) return;
    void (async () => {
      setFileLoading(true);
      try {
        const res    = await axiosInstance.get(`${COLLECTION_URL}/${encodeURIComponent(fileId)}`);
        const mapped = mapFileRow(res.data);
        if (mapped) setFile(mapped);
        else setFileError("File record not found.");
      } catch (err) {
        setFileError(getAxiosErrorMessage(err));
      } finally {
        setFileLoading(false);
      }
    })();
  }, [file, fileId]);

  // ── Activities ─────────────────────────────────────────────────────────────
  const [activities, setActivities]           = useState<ActivityRow[]>([]);
  const [isLoading, setIsLoading]             = useState(false);
  const [fetchError, setFetchError]           = useState("");
  const [showForm, setShowForm]               = useState(false);
  const [editingActivityId, setEditingActivityId] = useState<string | null>(null);
  const [actForm, setActForm]                 = useState(createEmptyActivityForm);
  const [isSubmitting, setIsSubmitting]       = useState(false);
  const [formError, setFormError]             = useState("");
  const [successMsg, setSuccessMsg]           = useState("");

  // ── Blob state ─────────────────────────────────────────────────────────────
  const [selectedFile, setSelectedFile]         = useState<File | null>(null);
  const [blobDescription, setBlobDescription]   = useState("");
  const [isUploadingBlob, setIsUploadingBlob]   = useState(false);
  const [blobAction, setBlobAction]             = useState<{ id: string; kind: "view" | "download" } | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // ── PDF generation state ───────────────────────────────────────────────────
  const [pdfGenerating, setPdfGenerating] = useState<string | null>(null);
  const [pdfError, setPdfError]           = useState("");

  const isEditingActivity = editingActivityId !== null;

  // ── Fetch activities ───────────────────────────────────────────────────────
  const fetchActivities = useCallback(async (fId: string) => {
    setIsLoading(true);
    setFetchError("");
    try {
      const url = `${ACTIVITIES_URL}?refFileNo=${encodeURIComponent(fId)}`;
      const res = await axiosInstance.get(url);
      const mapped = extractRows(res.data)
        .map(mapActivityRow)
        .filter((r): r is ActivityRow => r !== null);
      setActivities(mapped);
    } catch (err) {
      setFetchError(getAxiosErrorMessage(err));
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    if (fileId) void fetchActivities(fileId);
  }, [fileId, fetchActivities]);

  // ── Form helpers ───────────────────────────────────────────────────────────
  const setActField = (field: keyof ActivityFormState, value: string) =>
    setActForm((prev) => ({ ...prev, [field]: value }));

  const clearFileState = () => {
    setSelectedFile(null);
    setBlobDescription("");
    if (fileInputRef.current) fileInputRef.current.value = "";
  };

  const openAddForm = () => {
    setEditingActivityId(null);
    setActForm(createEmptyActivityForm());
    clearFileState();
    setFormError("");
    setSuccessMsg("");
    setShowForm(true);
  };

  const openEditActivityForm = (act: ActivityRow) => {
    setEditingActivityId(act.id);
    setActForm({
      activityDate:      act.activityDate,
      activityRemarks:   act.activityRemarks,
      activityDocId:     act.activityDocId,
      activityDocTable:  act.activityDocTable,
      // normalise status so the <select> value matches one of its <option> values
      activityStatus:    normaliseStatus(act.activityStatus),
    });
    clearFileState();
    setFormError("");
    setSuccessMsg("");
    setShowForm(true);
  };

  const cancelForm = () => {
    setShowForm(false);
    setEditingActivityId(null);
    setActForm(createEmptyActivityForm());
    clearFileState();
    setFormError("");
  };

  // ── Blob upload ─────────────────────────────────────────────────────────────
  const uploadBlob = async (f: File, description: string): Promise<string> => {
    const formData = new FormData();
    formData.append("file", f);
    if (description.trim()) formData.append("description", description.trim());
    const res = await axiosInstance.post(BLOBS_URL, formData, {
      headers: { "Content-Type": "multipart/form-data" },
    });
    return res.data.id;
  };

  // ── Submit activity ─────────────────────────────────────────────────────────
  const handleActivitySubmit = async (e: FormEvent) => {
    e.preventDefault();
    if (!fileId) return;
    if (!actForm.activityRemarks.trim() && !actForm.activityDocId.trim() && !selectedFile) {
      setFormError("Remarks, Document ID, or a file attachment is required.");
      return;
    }

    setIsSubmitting(true);
    setFormError("");
    setSuccessMsg("");

    let docId    = actForm.activityDocId;
    let docTable = actForm.activityDocTable;

    if (selectedFile) {
      setIsUploadingBlob(true);
      try {
        const blobId = await uploadBlob(selectedFile, blobDescription);
        docId    = String(blobId);
        docTable = "DOC_BLOB_TABLE";
      } catch (err) {
        setFormError("File upload failed: " + getAxiosErrorMessage(err));
        setIsSubmitting(false);
        setIsUploadingBlob(false);
        return;
      } finally {
        setIsUploadingBlob(false);
      }
    }

    const payload = {
      activityReferenceNo: fileId,
      activityDate:        actForm.activityDate,
      activityRemarks:     actForm.activityRemarks,
      activityDocId:       docId,
      activityDocTable:    docTable,
      // always send the normalised canonical label
      activityStatus:      normaliseStatus(actForm.activityStatus),
    };

    try {
      if (isEditingActivity && editingActivityId) {
        await axiosInstance.put(`${ACTIVITIES_URL}/${encodeURIComponent(editingActivityId)}`, payload);
        setSuccessMsg("Activity updated successfully.");
      } else {
        await axiosInstance.post(ACTIVITIES_URL, payload);
        setSuccessMsg("Activity added successfully.");
      }
      cancelForm();
      await fetchActivities(fileId);
    } catch (err) {
      setFormError(getAxiosErrorMessage(err));
    } finally {
      setIsSubmitting(false);
    }
  };

  // ── Delete activity ─────────────────────────────────────────────────────────
  const handleDeleteActivity = async (actId: string) => {
    if (!fileId || !window.confirm(`Delete activity #${actId}?`)) return;
    setIsSubmitting(true);
    setSuccessMsg("");
    try {
      await axiosInstance.delete(`${ACTIVITIES_URL}/${encodeURIComponent(actId)}`);
      setSuccessMsg("Activity deleted.");
      await fetchActivities(fileId);
    } catch (err) {
      setFetchError(getAxiosErrorMessage(err));
    } finally {
      setIsSubmitting(false);
    }
  };

  // ── Blob view / download ────────────────────────────────────────────────────
  const readFileNameFromContentDisposition = (headerValue: unknown): string | null => {
    if (typeof headerValue !== "string" || !headerValue.trim()) return null;
    // RFC 5987 encoded filename* takes priority
    const utf8  = /filename\*=UTF-8''([^;]+)/i.exec(headerValue);
    if (utf8?.[1]) {
      try { return decodeURIComponent(utf8[1].trim().replace(/^"|"$/g, "")); }
      catch { return utf8[1].trim().replace(/^"|"$/g, ""); }
    }
    // Plain filename fallback
    const plain = /filename="?([^";]+)"?/i.exec(headerValue);
    return plain?.[1]?.trim() ?? null;
  };

  const createBlobObjectUrl = (blob: Blob): string => {
    const url = URL.createObjectURL(blob);
    // Revoke after 60 s to avoid memory leaks
    window.setTimeout(() => URL.revokeObjectURL(url), 60_000);
    return url;
  };

  // handleViewBlob — open popup before the async call so browsers don't
  // block it as an "unprompted" window.open, then navigate to the blob URL.
  const handleViewBlob = async (docId: string) => {
    setFetchError("");
    // Open the popup synchronously (inside the click handler) to satisfy popup blockers
    const popup = window.open("about:blank", "_blank");
    if (popup) {
      try { popup.opener = null; } catch { /* cross-origin guard */ }
    }
    setBlobAction({ id: docId, kind: "view" });
    try {
      let blob: Blob;
      try {
        blob = (
          await axiosInstance.get(`${BLOBS_URL}/${encodeURIComponent(docId)}/view`, {
            responseType: "blob",
          })
        ).data as Blob;
      } catch (innerErr) {
        const status = axios.isAxiosError(innerErr) ? innerErr.response?.status : undefined;
        // Fall back to /download if /view returns 404 or 405
        if (status === 404 || status === 405) {
          blob = (
            await axiosInstance.get(`${BLOBS_URL}/${encodeURIComponent(docId)}/download`, {
              responseType: "blob",
            })
          ).data as Blob;
        } else {
          throw innerErr;
        }
      }

      const url = createBlobObjectUrl(blob);

      if (popup) {
        popup.location.href = url;
        popup.focus();
      } else {
        // Popup was blocked — try again directly; tell the user if that also fails
        const opened = window.open(url, "_blank", "noopener,noreferrer");
        if (!opened) setFetchError("Unable to open a new tab — please allow pop-ups for this site.");
      }
    } catch (err) {
      if (popup) popup.close();
      setFetchError(`Unable to view file: ${getAxiosErrorMessage(err)}`);
    } finally {
      setBlobAction(null);
    }
  };

  // handleDownloadBlob — wait for the full blob before revoking, use
  // a short-lived <a> that is removed from the DOM immediately after click.
  const handleDownloadBlob = async (docId: string) => {
    setFetchError("");
    setBlobAction({ id: docId, kind: "download" });
    try {
      const res = await axiosInstance.get(
        `${BLOBS_URL}/${encodeURIComponent(docId)}/download`,
        { responseType: "blob" },
      );

      const blob: Blob = res.data as Blob;
      const url        = createBlobObjectUrl(blob);

      // Derive a sensible filename: Content-Disposition → fallback to blob-<id>
      const filename =
        readFileNameFromContentDisposition(res.headers?.["content-disposition"]) ??
        `blob-${docId}`;

      // Trigger the browser's save-file dialog
      const a       = document.createElement("a");
      a.href        = url;
      a.download    = filename;
      a.rel         = "noopener";
      a.style.display = "none";
      document.body.appendChild(a);
      a.click();
      // Small delay before removal so the click registers in all browsers
      window.setTimeout(() => {
        a.remove();
        URL.revokeObjectURL(url); // revoke early — download has already started
      }, 200);
    } catch (err) {
      setFetchError(`Unable to download file: ${getAxiosErrorMessage(err)}`);
    } finally {
      setBlobAction(null);
    }
  };

  // ── Generate PDF from document reference ───────────────────────────────────
  const handleGeneratePdf = async (act: ActivityRow) => {
    const table = String(act.activityDocTable ?? "").toUpperCase();
    const docId = act.activityDocId;

    setPdfError("");
    setPdfGenerating(act.id);

    try {
      if (table === "SALES_REGISTER") {
        await generateSalesPDF(docId);
      } else if (table === "PURCHASE_REGISTER") {
        await generatePurchasePDF(docId);
      } else if (table === "MATERIAL_PASS") {
        await generateMatpassPDF(docId);
      } else {
        setPdfError(`Unknown document table: ${act.activityDocTable}`);
      }
    } catch (err) {
      setPdfError(
        `PDF generation failed for ${docTableLabel(table)} #${docId}: ${getAxiosErrorMessage(err)}`,
      );
    } finally {
      setPdfGenerating(null);
    }
  };

  // ─────────────────────────────────────────────────────────────────────────

  return (
    <>
      <PageMeta
        title={`MosIC_frontend | Activities — File ${fileId ?? ""}`}
        description="Activity history for selected file"
      />

      <PageBreadcrumb pageTitle={`File ${fileId ?? ""} — Activities`} />

      {/* Back button */}
      <div className="mb-3 px-1">
        <button
          type="button"
          onClick={() => navigate("/file-index")}
          className="inline-flex items-center gap-1.5 rounded-md border border-gray-200 bg-white px-3 py-1.5 text-xs font-medium text-gray-600 shadow-sm transition hover:bg-gray-50 hover:text-brand-600 dark:border-gray-700 dark:bg-gray-900 dark:text-gray-300 dark:hover:bg-gray-800 dark:hover:text-brand-400"
        >
          <svg className="h-3.5 w-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
          </svg>
          Back to File Index
        </button>
      </div>

      {/* File info card */}
      <div className="mb-4 overflow-hidden rounded-lg border border-gray-200 bg-white shadow-sm dark:border-gray-800 dark:bg-gray-900">
        {fileLoading && (
          <div className="flex items-center gap-2 px-4 py-3 text-xs text-gray-500 dark:text-gray-400">
            <svg className="h-3.5 w-3.5 animate-spin text-brand-500" fill="none" viewBox="0 0 24 24">
              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8H4z" />
            </svg>
            Loading file details…
          </div>
        )}
        {fileError && (
          <div className="px-4 py-3 text-xs text-error-700 dark:text-error-400">{fileError}</div>
        )}
        {file && !fileLoading && (
          <>
            <div className="flex flex-wrap items-start justify-between gap-3 border-b border-gray-100 px-4 py-3 dark:border-gray-800">
              <div className="min-w-0">
                <div className="flex flex-wrap items-center gap-1.5">
                  <span className="inline-flex items-center rounded bg-brand-50 px-2 py-0.5 text-xs font-semibold text-brand-700 dark:bg-brand-500/10 dark:text-brand-300">
                    FILE #{file.id}
                  </span>
                  <span className={`inline-flex items-center rounded px-2 py-0.5 text-xs font-semibold ${statusBadgeClass(normaliseStatus(file.status))}`}>
                    {statusLabel(normaliseStatus(file.status))}
                  </span>
                </div>
                <h2 className="mt-1 truncate text-sm font-semibold text-gray-900 dark:text-white">
                  {file.f_subject || "—"}
                </h2>
                <p className="text-xs text-gray-500 dark:text-gray-400">
                  {file.f_activity || "—"} · {file.f_date || "—"}
                </p>
              </div>
            </div>
            <div className="grid grid-cols-2 gap-x-4 gap-y-0.5 bg-gray-50 px-4 py-2 text-xs dark:bg-white/[0.02] sm:grid-cols-3">
              <span className="text-gray-500 dark:text-gray-400">
                Date: <strong className="text-gray-800 dark:text-white/80">{file.f_date || "—"}</strong>
              </span>
              <span className="text-gray-500 dark:text-gray-400">
              {/*  Created: <strong className="text-gray-800 dark:text-white/80">{file.datecreated || "—"}</strong>*/}
              </span>
              <span className="col-span-2 text-gray-500 dark:text-gray-400 sm:col-span-1">
                Description: <strong className="text-gray-800 dark:text-white/80">{file.f_description || "—"}</strong>
              </span>
            </div>
          </>
        )}
      </div>

      {/* Activities section */}
      <div className="overflow-hidden rounded-lg border border-gray-200 bg-white shadow-sm dark:border-gray-800 dark:bg-gray-900">

        {/* Section toolbar */}
        <div className="flex items-center justify-between border-b border-gray-200 px-4 py-2.5 dark:border-gray-800">
          <div className="flex items-center gap-2">
            <h3 className="text-sm font-semibold text-gray-800 dark:text-white/90">Activities</h3>
            {!isLoading && activities.length > 0 && (
              <span className="inline-flex items-center rounded-full bg-brand-100 px-2 py-0.5 text-xs font-medium text-brand-700 dark:bg-brand-500/20 dark:text-brand-300">
                {activities.length}
              </span>
            )}
          </div>
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => fileId && void fetchActivities(fileId)}
              disabled={isLoading}
              className="inline-flex items-center gap-1 rounded border border-gray-200 px-2 py-1 text-xs font-medium text-gray-600 hover:bg-gray-50 disabled:opacity-50 dark:border-gray-700 dark:text-gray-300 dark:hover:bg-white/[0.03]"
            >
              <svg className={`h-3 w-3 ${isLoading ? "animate-spin" : ""}`} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
              </svg>
              Refresh
            </button>

            {canCreate && (
              <button
                type="button"
                onClick={openAddForm}
                disabled={isSubmitting}
                className="inline-flex items-center gap-1 rounded bg-brand-500 px-2.5 py-1 text-xs font-medium text-white hover:bg-brand-600 disabled:cursor-not-allowed disabled:opacity-50"
              >
                <svg className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M12 4v16m8-8H4" />
                </svg>
                Add Activity
              </button>
            )}
          </div>
        </div>

        {/* Activity Form Modal */}
        <Modal isOpen={showForm} onClose={cancelForm} className="mx-4 w-full max-w-2xl p-6 sm:p-8">
          <h3 className="pr-12 text-xl font-semibold text-gray-800 dark:text-white/90">
            {isEditingActivity ? "Edit Activity" : "New Activity"}
            <span className="ml-2 text-sm font-normal text-gray-500">— File #{fileId}</span>
          </h3>
          <p className="mt-1 text-sm text-gray-400">Fill in the details below and submit.</p>

          {formError && (
            <div className="mt-4 rounded-lg border border-error-500/40 bg-error-50 px-3 py-2 text-xs text-error-700 dark:bg-error-500/10 dark:text-error-400">
              {formError}
            </div>
          )}

          <form onSubmit={(e) => void handleActivitySubmit(e)} className="mt-5 grid grid-cols-1 gap-4 sm:grid-cols-2">
            <div>
              <Label htmlFor="act_date">Activity Date</Label>
              <DatePicker
                value={actForm.activityDate}
                onChange={(val) => setActField("activityDate", val)}
              />
            </div>

            {/* Status: option values are raw DB numbers (1/2/3/0).
                normaliseStatus() converts them to canonical labels before saving/displaying. */}
            <div>
              <Label htmlFor="act_status">Status</Label>
              <div className="relative">
                <select
                  id="act_status"
                  className={selectClass}
                  value={actForm.activityStatus}
                  onChange={(e) => setActField("activityStatus", e.target.value)}
                >
                  <option value="">— Select Status —</option>
                  <option value="1">Active</option>
                  <option value="2">Processing</option>
                  <option value="3">Complete</option>
                  <option value="0">Disabled</option>
                </select>
                <span className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-gray-400">
                  <svg className="size-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}>
                    <path d="M6 9l6 6 6-6" strokeLinecap="round" strokeLinejoin="round" />
                  </svg>
                </span>
              </div>
            </div>

            <div className="sm:col-span-2">
              <Label htmlFor="act_remarks">Remarks</Label>
              <TextArea
                value={actForm.activityRemarks}
                onChange={(v) => setActField("activityRemarks", v)}
                placeholder="Enter activity remarks…"
              />
            </div>

            <div className="sm:col-span-2">
              <div className="rounded-lg border border-dashed border-gray-300 bg-white p-4 dark:border-gray-700 dark:bg-white/[0.02]">
                <p className="mb-3 text-xs font-semibold uppercase tracking-wide text-gray-500 dark:text-gray-400">
                  Attach File (Optional) — saved to DOC_BLOB_TABLE
                </p>
                <input
                  ref={fileInputRef}
                  type="file"
                  accept=".jpg,.jpeg,.png,.gif,.pdf,.txt,.tar,.rar"
                  className="hidden"
                  onChange={(e) => {
                    const f = e.target.files?.[0] ?? null;
                    setSelectedFile(f);
                    if (!f) setBlobDescription("");
                  }}
                />
                <div className="flex items-center gap-2">
                  <div className="flex min-w-0 flex-1 items-center rounded-md border border-gray-200 bg-gray-50 px-3 py-2 dark:border-gray-700 dark:bg-gray-800">
                    {selectedFile ? (
                      <div className="flex min-w-0 flex-1 items-center gap-2">
                        <svg className="h-4 w-4 flex-shrink-0 text-brand-500" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                          <path strokeLinecap="round" strokeLinejoin="round" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                        </svg>
                        <span className="truncate text-xs font-medium text-gray-800 dark:text-white/80">{selectedFile.name}</span>
                        <span className="flex-shrink-0 text-xs text-gray-400">({formatFileSize(selectedFile.size)})</span>
                      </div>
                    ) : (
                      <span className="text-xs italic text-gray-400">No file chosen — click Browse to select</span>
                    )}
                  </div>
                  <button
                    type="button"
                    onClick={() => fileInputRef.current?.click()}
                    className="inline-flex flex-shrink-0 items-center gap-1.5 rounded-md border border-gray-300 bg-white px-3 py-2 text-xs font-medium text-gray-600 hover:bg-gray-50 dark:border-gray-700 dark:bg-gray-800 dark:text-gray-300 dark:hover:bg-gray-700"
                  >
                    Browse
                  </button>
                  {selectedFile && (
                    <button
                      type="button"
                      onClick={clearFileState}
                      className="inline-flex flex-shrink-0 items-center justify-center rounded-md border border-error-200 px-2.5 py-2 text-xs font-medium text-error-500 hover:bg-error-50 dark:border-error-800 dark:text-error-400 dark:hover:bg-error-500/10"
                      title="Remove selected file"
                    >
                      <svg className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                        <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                      </svg>
                    </button>
                  )}
                </div>
                {selectedFile && (
                  <div className="mt-3">
                    <label className="mb-1 block text-xs font-medium text-gray-600 dark:text-gray-400">
                      File Description (optional)
                    </label>
                    <input
                      type="text"
                      value={blobDescription}
                      onChange={(e) => setBlobDescription(e.target.value)}
                      placeholder="e.g. Purchase invoice Jan 2026"
                      className="w-full rounded-md border border-gray-200 bg-white px-3 py-1.5 text-xs text-gray-800 placeholder-gray-400 focus:border-brand-400 focus:outline-none focus:ring-1 focus:ring-brand-400 dark:border-gray-700 dark:bg-gray-800 dark:text-white/80 dark:placeholder-gray-500"
                    />
                    <p className="mt-1 text-xs text-gray-400">
                      Supported: jpg, jpeg, png, gif, pdf, txt, tar, rar
                    </p>
                  </div>
                )}
              </div>
            </div>

            <div className="flex gap-2 sm:col-span-2">
              <button
                type="submit"
                disabled={isSubmitting}
                className="inline-flex items-center justify-center gap-1.5 rounded-lg bg-brand-500 px-4 py-2 text-sm font-medium text-white hover:bg-brand-600 disabled:opacity-50"
              >
                {isSubmitting && (
                  <svg className="h-3.5 w-3.5 animate-spin" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8H4z" />
                  </svg>
                )}
                {isSubmitting
                  ? isUploadingBlob ? "Uploading file…" : "Saving…"
                  : isEditingActivity ? "Update Activity" : "Create Activity"}
              </button>
              <button
                type="button"
                onClick={cancelForm}
                disabled={isSubmitting}
                className="inline-flex items-center justify-center rounded-lg border border-gray-300 px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50 disabled:opacity-50 dark:border-gray-700 dark:text-gray-300 dark:hover:bg-white/[0.03]"
              >
                Cancel
              </button>
            </div>
          </form>
        </Modal>

        {/* Success banner */}
        {successMsg && (
          <div className="border-b border-success-500/20 bg-success-50 px-6 py-2 text-xs text-success-700 dark:bg-success-500/10 dark:text-success-400">
            ✓ {successMsg}
          </div>
        )}

        {/* Fetch / PDF error */}
        {(fetchError || pdfError) && (
          <div className="mx-4 mt-3 rounded border border-error-500/40 bg-error-50 px-3 py-2 text-xs text-error-700 dark:bg-error-500/10 dark:text-error-400">
            {fetchError || pdfError}
          </div>
        )}

        {/* Loading skeletons */}
        {isLoading && (
          <div className="space-y-1.5 px-4 py-3">
            {[1, 2, 3].map((i) => (
              <div key={i} className="animate-pulse rounded border border-gray-100 p-2.5 dark:border-gray-800">
                <div className="mb-1.5 flex gap-2">
                  <div className="h-3 w-12 rounded bg-gray-200 dark:bg-gray-700" />
                  <div className="h-3 w-20 rounded bg-gray-100 dark:bg-gray-800" />
                </div>
                <div className="h-3 w-2/3 rounded bg-gray-100 dark:bg-gray-800" />
              </div>
            ))}
          </div>
        )}

        {/* Empty state */}
        {!isLoading && !fetchError && activities.length === 0 && (
          <div className="flex flex-col items-center justify-center py-10 text-center">
            <div className="mb-2 flex h-10 w-10 items-center justify-center rounded-full bg-gray-100 dark:bg-gray-800">
              <svg className="h-5 w-5 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
              </svg>
            </div>
            <p className="text-xs font-medium text-gray-600 dark:text-gray-300">No activities yet</p>
            {canCreate && (
              <p className="mt-0.5 text-xs text-gray-400">
                Click <strong>Add Activity</strong> to create the first one for this file.
              </p>
            )}
          </div>
        )}

        {/* Activities Table */}
        {!isLoading && activities.length > 0 && (
          <div className="overflow-x-auto">
            <Table>
              <TableHeader className="bg-gray-50 dark:bg-white/[0.03]">
                <TableRow>
                  {["ID", "Ref No", "Date", "Remarks", "Status", "Actions"].map((h) => (
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
                {activities.map((act) => {
                  // normalise once per row so badge colour and label are always consistent
                  const normStatus = normaliseStatus(act.activityStatus);
                  return (
                    <TableRow key={act.id}>
                      <TableCell className="px-3 py-2 text-xs font-medium text-gray-800 dark:text-white/90">
                        {act.id}
                      </TableCell>
                      <TableCell className="px-3 py-2 text-xs text-gray-600 dark:text-gray-300">
                        {act.activityReferenceNo || "—"}
                      </TableCell>
                      <TableCell className="px-3 py-2 text-xs text-gray-600 dark:text-gray-300">
                        {act.activityDate || "—"}
                      </TableCell>
                      <TableCell className="max-w-[200px] truncate px-3 py-2 text-xs text-gray-600 dark:text-gray-300">
                        {act.activityRemarks || "—"}
                      </TableCell>
                      <TableCell className="px-3 py-2 text-xs">
                        <span className={`inline-flex items-center rounded px-1.5 py-0.5 text-xs font-medium ${statusBadgeClass(normStatus)}`}>
                          {statusLabel(normStatus)}
                        </span>
                      </TableCell>

                      <TableCell className="px-3 py-2 text-xs">
                        <div className="flex flex-wrap items-center gap-1">

                          {/* ── CASE 1: DOC_BLOB_TABLE — View / Download ── */}
                          {isDocBlob(act) && (
                            <>
                              <button
                                type="button"
                                onClick={() => void handleViewBlob(act.activityDocId)}
                                disabled={blobAction?.id === act.activityDocId}
                                className="inline-flex items-center justify-center gap-1 rounded border border-gray-300 px-2.5 py-1 text-xs font-medium text-gray-600 hover:bg-gray-50 disabled:opacity-60 dark:border-gray-700 dark:text-gray-300 dark:hover:bg-white/[0.03]"
                                title="View file in browser"
                              >
                                <svg className="h-3 w-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                                  <path strokeLinecap="round" strokeLinejoin="round" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                                  <path strokeLinecap="round" strokeLinejoin="round" d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                                </svg>
                                {blobAction?.id === act.activityDocId && blobAction.kind === "view" ? "Viewing…" : "View"}
                              </button>
                              <button
                                type="button"
                                onClick={() => void handleDownloadBlob(act.activityDocId)}
                                disabled={blobAction?.id === act.activityDocId}
                                className="inline-flex items-center justify-center gap-1 rounded border border-gray-300 px-2.5 py-1 text-xs font-medium text-gray-600 hover:bg-gray-50 disabled:opacity-60 dark:border-gray-700 dark:text-gray-300 dark:hover:bg-white/[0.03]"
                                title="Download file"
                              >
                                <svg className="h-3 w-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                                  <path strokeLinecap="round" strokeLinejoin="round" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
                                </svg>
                                {blobAction?.id === act.activityDocId && blobAction.kind === "download" ? "Downloading…" : "Download"}
                              </button>
                            </>
                          )}

                          {/* ── CASE 2: SALES / PURCHASE / MATERIAL_PASS — Generate PDF ── */}
                          {isGeneratablePdf(act) && (
                            <button
                              type="button"
                              onClick={() => void handleGeneratePdf(act)}
                              disabled={pdfGenerating === act.id}
                              className="inline-flex items-center justify-center gap-1 rounded border border-purple-300 px-2.5 py-1 text-xs font-medium text-purple-700 hover:bg-purple-50 disabled:opacity-60 dark:border-purple-700 dark:text-purple-300 dark:hover:bg-purple-500/10"
                              title={`Generate PDF — ${docTableLabel(act.activityDocTable ?? "")} #${act.activityDocId}`}
                            >
                              {pdfGenerating === act.id ? (
                                <>
                                  <svg className="h-3 w-3 animate-spin" fill="none" viewBox="0 0 24 24">
                                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8H4z" />
                                  </svg>
                                  Generating…
                                </>
                              ) : (
                                <>
                                  <svg className="h-3 w-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                                    <path strokeLinecap="round" strokeLinejoin="round" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                                  </svg>
                                  {String(act.activityDocTable ?? "").toUpperCase() === "SALES_REGISTER"
                                    ? "Sales PDF"
                                    : String(act.activityDocTable ?? "").toUpperCase() === "PURCHASE_REGISTER"
                                      ? "Purchase PDF"
                                      : "MatPass PDF"}
                                </>
                              )}
                            </button>
                          )}

                          {/* ── Edit / Delete (role-gated) ── */}
                          {canEdit && (
                            <button
                              type="button"
                              onClick={() => openEditActivityForm(act)}
                              disabled={isSubmitting}
                              className="inline-flex items-center justify-center rounded border border-brand-300 px-2.5 py-1 text-xs font-medium text-brand-600 hover:bg-brand-50 disabled:opacity-50 dark:border-brand-800 dark:text-brand-300 dark:hover:bg-brand-500/10"
                            >
                              Edit
                            </button>
                          )}
                          {canDelete && (
                            <button
                              type="button"
                              onClick={() => void handleDeleteActivity(act.id)}
                              disabled={isSubmitting}
                              className="inline-flex items-center justify-center rounded border border-error-300 px-2.5 py-1 text-xs font-medium text-error-600 hover:bg-error-50 disabled:opacity-50 dark:border-error-800 dark:text-error-400 dark:hover:bg-error-500/10"
                            >
                              Delete
                            </button>
                          )}
                        </div>
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          </div>
        )}

        {/* Footer */}
        {!isLoading && activities.length > 0 && (
          <div className="border-t border-gray-100 px-4 py-2 dark:border-gray-800">
            <p className="text-xs text-gray-400 dark:text-gray-500">
              {activities.length} activit{activities.length !== 1 ? "ies" : "y"} for file #{fileId}
            </p>
          </div>
        )}
      </div>
    </>
  );
}