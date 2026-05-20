import { type FormEvent, useCallback, useEffect, useState } from "react";
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

const ITEMS_URL      = "/api/sales-items";
const ACTIVITY_URL   = "/api/activities";

const selectClass =
  "h-10 w-full rounded-lg border border-gray-300 bg-white px-3 text-sm text-gray-800 outline-none transition-colors focus:border-brand-500 focus:ring-2 focus:ring-brand-500/20 dark:border-gray-700 dark:bg-gray-900 dark:text-white";

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

// ─── Types ────────────────────────────────────────────────────────────────────

export type SalesItemDTO = {
  id: number | null;
  nameOfProductService: string;
  hsnAcs: string;
  quantity: number;
  unit: string;
  unitRate: number;
  taxableValue: number;
  cgstRate: number;
  cgstAmount: number;
  sgstRate: number;
  sgstAmount: number;
  igstRate: number;
  igstAmount: number;
  total: number;
  refFileNo: number;
  status: number;
};

export type SalesRecord = {
  id: number;
  salesFromParty: string;
  salesToParty: string;
  salesDoctype: string;
  salesDate: string;
  salesCurrency?: string;
  salesFileRef?: string;        // ← used as ref_file_no when creating activity
  salesDescription?: string;
};

type Props = {
  salesRecord: SalesRecord;
  onClose: () => void;
};

// ─── Activity DTO (matches ActivityEntity) ───────────────────────────────────

type ActivityDTO = {
  activityReferenceNo: string;  // ref_file_no = salesFileRef
  activityDate: string;
  activityRemarks: string;
  activityDocId: string | null;
  activityDocTable: string | null;
  activityStatus: string;
};

// ─── Helpers ──────────────────────────────────────────────────────────────────

const createEmptyItem = (refFileNo: number): SalesItemDTO => ({
  id: null,
  nameOfProductService: "",
  hsnAcs: "",
  quantity: 0,
  unit: "",
  unitRate: 0,
  taxableValue: 0,
  cgstRate: 0,
  cgstAmount: 0,
  sgstRate: 0,
  sgstAmount: 0,
  igstRate: 0,
  igstAmount: 0,
  total: 0,
  refFileNo,
  status: 1,
});

const fmt = (n: number) =>
  n.toLocaleString("en-IN", { minimumFractionDigits: 2, maximumFractionDigits: 2 });

const getAxiosErrorMessage = (err: unknown): string => {
  if (err && typeof err === "object" && "response" in err) {
    const res = (err as { response?: { data?: { message?: string; error?: string } } }).response;
    return res?.data?.message ?? res?.data?.error ?? "An error occurred";
  }
  return "Network error — please try again";
};

// ─── Sub-components ───────────────────────────────────────────────────────────

const DoctypeBadge = ({ doctype }: { doctype: string }) => (
  <span
    className={`inline-flex items-center rounded px-2 py-0.5 text-xs font-medium ${
      DOCTYPE_COLORS[doctype] ?? "bg-gray-100 text-gray-600 dark:bg-gray-800 dark:text-gray-400"
    }`}
  >
    {DOCTYPE_LABELS[doctype] ?? doctype}
  </span>
);

const NumInput = ({
  id,
  value,
  onChange,
  readOnly = false,
  placeholder = "0.00",
}: {
  id: string;
  value: number;
  onChange?: (v: number) => void;
  readOnly?: boolean;
  placeholder?: string;
}) => (
  <Input
    id={id}
    type="number"
    value={value === 0 ? "" : String(value)}
    placeholder={placeholder}
    onChange={(e) => onChange?.(parseFloat(e.target.value) || 0)}
    disabled={readOnly}
    className={readOnly ? "cursor-not-allowed bg-gray-50 dark:bg-gray-800/60" : ""}
  />
);

// ─── PDF Generator ────────────────────────────────────────────────────────────
// Builds a styled HTML document in a hidden iframe and triggers window.print().
// No extra npm dependencies needed.

function printSalesPDF(salesRecord: SalesRecord, items: SalesItemDTO[], grandTotals: { taxable: number; cgst: number; sgst: number; igst: number; total: number }) {
  const docLabel = DOCTYPE_LABELS[salesRecord.salesDoctype] ?? salesRecord.salesDoctype;
  const currency = salesRecord.salesCurrency || "";

  const itemRows = items.map((item, idx) => `
    <tr>
      <td>${idx + 1}</td>
      <td>${item.nameOfProductService || "—"}</td>
      <td>${item.hsnAcs || "—"}</td>
      <td class="right">${item.quantity}</td>
      <td>${item.unit || "—"}</td>
      <td class="right">${fmt(item.unitRate)}</td>
      <td class="right">${fmt(item.taxableValue)}</td>
      <td class="right">${item.cgstRate > 0 ? item.cgstRate + "%" : "—"}</td>
      <td class="right">${item.cgstAmount > 0 ? fmt(item.cgstAmount) : "—"}</td>
      <td class="right">${item.sgstRate > 0 ? item.sgstRate + "%" : "—"}</td>
      <td class="right">${item.sgstAmount > 0 ? fmt(item.sgstAmount) : "—"}</td>
      <td class="right">${item.igstRate > 0 ? item.igstRate + "%" : "—"}</td>
      <td class="right">${item.igstAmount > 0 ? fmt(item.igstAmount) : "—"}</td>
      <td class="right bold">${currency} ${fmt(item.total)}</td>
    </tr>
  `).join("");

  const html = `<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8"/>
  <title>${docLabel} — Sales #${salesRecord.id}</title>
  <style>
    * { box-sizing: border-box; margin: 0; padding: 0; }
    body { font-family: Arial, sans-serif; font-size: 12px; color: #1a1a1a; padding: 32px; }
    .header { display: flex; justify-content: space-between; align-items: flex-start; margin-bottom: 28px; border-bottom: 2px solid #3b5bf5; padding-bottom: 16px; }
    .company { font-size: 22px; font-weight: 700; color: #3b5bf5; }
    .doc-type { font-size: 18px; font-weight: 700; text-align: right; color: #1a1a1a; }
    .doc-meta { font-size: 11px; color: #555; text-align: right; margin-top: 4px; }
    .parties { display: grid; grid-template-columns: 1fr 1fr; gap: 24px; margin-bottom: 24px; background: #f8f9ff; border: 1px solid #e2e6ff; border-radius: 8px; padding: 16px; }
    .party-block h4 { font-size: 10px; font-weight: 700; text-transform: uppercase; color: #666; letter-spacing: 0.05em; margin-bottom: 6px; }
    .party-block p { font-size: 13px; font-weight: 600; color: #1a1a1a; }
    .party-block .sub { font-size: 11px; color: #555; font-weight: 400; margin-top: 2px; }
    table { width: 100%; border-collapse: collapse; margin-bottom: 20px; font-size: 11px; }
    th { background: #3b5bf5; color: white; padding: 8px 6px; text-align: left; font-size: 10px; font-weight: 700; text-transform: uppercase; letter-spacing: 0.04em; white-space: nowrap; }
    td { padding: 7px 6px; border-bottom: 1px solid #e8e8e8; vertical-align: top; }
    tr:nth-child(even) td { background: #f9faff; }
    .right { text-align: right; }
    .bold { font-weight: 700; }
    .totals-row td { background: #f0f3ff !important; font-weight: 700; border-top: 2px solid #3b5bf5; }
    .summary { display: grid; grid-template-columns: repeat(4, 1fr); gap: 12px; margin-top: 16px; }
    .summary-card { border: 1px solid #e2e6ff; border-radius: 8px; padding: 12px; }
    .summary-card .label { font-size: 10px; color: #666; text-transform: uppercase; letter-spacing: 0.05em; }
    .summary-card .value { font-size: 15px; font-weight: 700; color: #1a1a1a; margin-top: 4px; }
    .summary-card.total-card { background: #3b5bf5; border-color: #3b5bf5; }
    .summary-card.total-card .label, .summary-card.total-card .value { color: white; }
    .file-ref { font-size: 11px; color: #555; margin-bottom: 20px; }
    .file-ref span { font-weight: 600; color: #3b5bf5; }
    .footer { margin-top: 32px; padding-top: 12px; border-top: 1px solid #ddd; font-size: 10px; color: #999; text-align: center; }
    @media print { body { padding: 0; } @page { margin: 20mm; } }
  </style>
</head>
<body>
  <div class="header">
    <div>
      <div class="company">MosIC Solutions</div>
      <div style="font-size:11px;color:#555;margin-top:4px;">Internal Office Management System</div>
    </div>
    <div>
      <div class="doc-type">${docLabel}</div>
      <div class="doc-meta">Sales Record #${salesRecord.id}</div>
      <div class="doc-meta">Date: ${salesRecord.salesDate || "—"}</div>
      ${currency ? `<div class="doc-meta">Currency: ${currency}</div>` : ""}
    </div>
  </div>

  ${salesRecord.salesFileRef ? `<div class="file-ref">File Reference: <span>${salesRecord.salesFileRef}</span></div>` : ""}

  <div class="parties">
    <div class="party-block">
      <h4>From</h4>
      <p>${salesRecord.salesFromParty || "—"}</p>
    </div>
    <div class="party-block">
      <h4>To</h4>
      <p>${salesRecord.salesToParty || "—"}</p>
    </div>
  </div>

  ${salesRecord.salesDescription ? `<div style="margin-bottom:20px;font-size:12px;color:#444;background:#fffbe6;border:1px solid #ffe58f;border-radius:6px;padding:12px;"><strong>Description:</strong> ${salesRecord.salesDescription}</div>` : ""}

  <table>
    <thead>
      <tr>
        <th>#</th>
        <th>Product / Service</th>
        <th>HSN</th>
        <th class="right">Qty</th>
        <th>Unit</th>
        <th class="right">Rate</th>
        <th class="right">Taxable Value</th>
        <th class="right">CGST %</th>
        <th class="right">CGST Amt</th>
        <th class="right">SGST %</th>
        <th class="right">SGST Amt</th>
        <th class="right">IGST %</th>
        <th class="right">IGST Amt</th>
        <th class="right">Total</th>
      </tr>
    </thead>
    <tbody>
      ${itemRows}
      <tr class="totals-row">
        <td colspan="6" style="text-align:right;font-size:10px;text-transform:uppercase;letter-spacing:.04em;">Grand Total (${items.length} item${items.length !== 1 ? "s" : ""})</td>
        <td class="right">${currency} ${fmt(grandTotals.taxable)}</td>
        <td></td>
        <td class="right">${currency} ${fmt(grandTotals.cgst)}</td>
        <td></td>
        <td class="right">${currency} ${fmt(grandTotals.sgst)}</td>
        <td></td>
        <td class="right">${currency} ${fmt(grandTotals.igst)}</td>
        <td class="right">${currency} ${fmt(grandTotals.total)}</td>
      </tr>
    </tbody>
  </table>

  <div class="summary">
    <div class="summary-card">
      <div class="label">Taxable Value</div>
      <div class="value">${currency} ${fmt(grandTotals.taxable)}</div>
    </div>
    <div class="summary-card">
      <div class="label">Total Tax</div>
      <div class="value">${currency} ${fmt(grandTotals.cgst + grandTotals.sgst + grandTotals.igst)}</div>
    </div>
    <div class="summary-card">
      <div class="label">Items Count</div>
      <div class="value">${items.length}</div>
    </div>
    <div class="summary-card total-card">
      <div class="label">Invoice Total</div>
      <div class="value">${currency} ${fmt(grandTotals.total)}</div>
    </div>
  </div>

  <div class="footer">Generated by MosIC Solutions · ${new Date().toLocaleString("en-IN")}</div>
</body>
</html>`;

  const iframe = document.createElement("iframe");
  iframe.style.cssText = "position:fixed;top:-9999px;left:-9999px;width:1px;height:1px;border:none;";
  document.body.appendChild(iframe);

  const doc = iframe.contentDocument || iframe.contentWindow?.document;
  if (!doc) return;

  doc.open();
  doc.write(html);
  doc.close();

  // Wait for content to render, then print
  setTimeout(() => {
    iframe.contentWindow?.focus();
    iframe.contentWindow?.print();
    // Clean up after print dialog closes
    setTimeout(() => document.body.removeChild(iframe), 2000);
  }, 500);
}

// ─── Main Component ───────────────────────────────────────────────────────────

export default function SalesDetailsItems({ salesRecord, onClose }: Props) {
  const [items, setItems]                     = useState<SalesItemDTO[]>([]);
  const [formState, setFormState]             = useState<SalesItemDTO>(createEmptyItem(salesRecord.id));
  const [editingId, setEditingId]             = useState<number | null>(null);
  const [showForm, setShowForm]               = useState(false);
  const [isLoading, setIsLoading]             = useState(false);
  const [isSubmitting, setIsSubmitting]       = useState(false);
  const [errorMessage, setErrorMessage]       = useState("");
  const [successMessage, setSuccessMessage]   = useState("");

  // ── Activity modal state ───────────────────────────────────────────────────
  const [showActivityModal, setShowActivityModal]     = useState(false);
  const [activityDate, setActivityDate]               = useState(() => new Date().toISOString().slice(0, 10));
  const [activityRemarks, setActivityRemarks]         = useState("");
  const [activitySubmitting, setActivitySubmitting]   = useState(false);
  const [activityError, setActivityError]             = useState("");
  const [activitySuccess, setActivitySuccess]         = useState("");

  const isEditing = editingId !== null;
  const clearMsgs = () => { setErrorMessage(""); setSuccessMessage(""); };

  const setField = <K extends keyof SalesItemDTO>(field: K, value: SalesItemDTO[K]) =>
    setFormState((prev) => ({ ...prev, [field]: value }));

  // ── Auto-calculate derived tax fields ────────────────────────────────────────
  useEffect(() => {
    const qty   = formState.quantity || 0;
    const rate  = formState.unitRate || 0;
    const cRate = formState.cgstRate || 0;
    const sRate = formState.sgstRate || 0;
    const iRate = formState.igstRate || 0;

    const taxable  = parseFloat((qty * rate).toFixed(2));
    const cgstAmt  = parseFloat((taxable * cRate / 100).toFixed(2));
    const sgstAmt  = parseFloat((taxable * sRate / 100).toFixed(2));
    const igstAmt  = parseFloat((taxable * iRate / 100).toFixed(2));
    const total    = parseFloat((taxable + cgstAmt + sgstAmt + igstAmt).toFixed(2));

    setFormState((prev) => ({
      ...prev,
      taxableValue: taxable,
      cgstAmount: cgstAmt,
      sgstAmount: sgstAmt,
      igstAmount: igstAmt,
      total,
    }));
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [formState.quantity, formState.unitRate, formState.cgstRate, formState.sgstRate, formState.igstRate]);

  // ── Fetch items ──────────────────────────────────────────────────────────────
  const fetchItems = useCallback(async () => {
    setIsLoading(true);
    clearMsgs();
    try {
      const res = await axiosInstance.get<SalesItemDTO[]>(
        `${ITEMS_URL}/by-sales/${salesRecord.id}`
      );
      setItems(res.data);
    } catch (err) {
      setErrorMessage(getAxiosErrorMessage(err));
    } finally {
      setIsLoading(false);
    }
  }, [salesRecord.id]);

  useEffect(() => { void fetchItems(); }, [fetchItems]);

  // ── Grand totals ─────────────────────────────────────────────────────────────
  const grandTotals = items.reduce(
    (acc, item) => ({
      taxable: acc.taxable + (item.taxableValue ?? 0),
      cgst:    acc.cgst    + (item.cgstAmount   ?? 0),
      sgst:    acc.sgst    + (item.sgstAmount   ?? 0),
      igst:    acc.igst    + (item.igstAmount   ?? 0),
      total:   acc.total   + (item.total         ?? 0),
    }),
    { taxable: 0, cgst: 0, sgst: 0, igst: 0, total: 0 }
  );

  // ── Form helpers ──────────────────────────────────────────────────────────────
  const openCreateForm = () => {
    setEditingId(null);
    setFormState(createEmptyItem(salesRecord.id));
    clearMsgs();
    setShowForm(true);
  };

  const openEditForm = (item: SalesItemDTO) => {
    setEditingId(item.id);
    setFormState({ ...item });
    clearMsgs();
    setShowForm(true);
  };

  const handleCancelForm = () => {
    setEditingId(null);
    setFormState(createEmptyItem(salesRecord.id));
    setShowForm(false);
  };

  // ── Submit item ───────────────────────────────────────────────────────────────
  const handleSubmit = async (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    clearMsgs();

    if (!formState.nameOfProductService.trim()) {
      setErrorMessage("Product / Service name is required.");
      return;
    }
    if (formState.quantity <= 0) {
      setErrorMessage("Quantity must be greater than 0.");
      return;
    }

    setIsSubmitting(true);
    const payload: Partial<SalesItemDTO> = { ...formState };
    if (!isEditing) delete payload.id;

    try {
      if (isEditing && editingId !== null) {
        await axiosInstance.put(`${ITEMS_URL}/${editingId}`, payload);
        setSuccessMessage("Item updated successfully.");
      } else {
        await axiosInstance.post(ITEMS_URL, payload);
        setSuccessMessage("Item added successfully.");
      }
      handleCancelForm();
      await fetchItems();
    } catch (err) {
      setErrorMessage(getAxiosErrorMessage(err));
    } finally {
      setIsSubmitting(false);
    }
  };

  // ── Delete item ───────────────────────────────────────────────────────────────
  const handleDelete = async (id: number) => {
    if (!window.confirm(`Delete item #${id}?`)) return;
    clearMsgs();
    setIsSubmitting(true);
    try {
      await axiosInstance.delete(`${ITEMS_URL}/${id}`);
      setSuccessMessage("Item deleted.");
      await fetchItems();
    } catch (err) {
      setErrorMessage(getAxiosErrorMessage(err));
    } finally {
      setIsSubmitting(false);
    }
  };

  // ── PDF Download ──────────────────────────────────────────────────────────────
  const handleDownloadPDF = () => {
    if (items.length === 0) {
      alert("No line items to print. Please add items first.");
      return;
    }
    printSalesPDF(salesRecord, items, grandTotals);
  };

  // ── Activity helpers ──────────────────────────────────────────────────────────

  // Extracts the plain file ref string from the stored "id-label" format or returns as-is
  const getFileRefString = (): string => {
    const raw = salesRecord.salesFileRef ?? "";
    if (!raw) return "";
    // salesFileRef is stored as "id-fileSubject" (e.g. "3-ADMIN")
    // The ActivityEntity expects the ref_file_no which is the plain subject string
    // Extract everything after the first "-"
    const dashIdx = raw.indexOf("-");
    return dashIdx !== -1 ? raw.slice(dashIdx + 1) : raw;
  };

  const openActivityModal = () => {
    const fileRef = getFileRefString();
    if (!fileRef) {
      alert("This sales record has no File Reference set.\nPlease edit the sales record and select a File Reference first.");
      return;
    }
    // Pre-fill remarks with a meaningful default
    const docLabel = DOCTYPE_LABELS[salesRecord.salesDoctype] ?? "Document";
    setActivityRemarks(
      `Sales #${salesRecord.id} — ${docLabel} | From: ${salesRecord.salesFromParty} → To: ${salesRecord.salesToParty}` +
      (salesRecord.salesDate ? ` | Date: ${salesRecord.salesDate}` : "") +
      ` | Total: ${salesRecord.salesCurrency ?? ""} ${fmt(grandTotals.total)}`
    );
    setActivityDate(new Date().toISOString().slice(0, 10));
    setActivityError("");
    setActivitySuccess("");
    setShowActivityModal(true);
  };

  const handleCreateActivity = async () => {
    const fileRef = getFileRefString();
    if (!fileRef) {
      setActivityError("No file reference found on this sales record.");
      return;
    }
    if (!activityRemarks.trim()) {
      setActivityError("Remarks cannot be empty.");
      return;
    }

    setActivitySubmitting(true);
    setActivityError("");

    const payload: ActivityDTO = {
      activityReferenceNo: fileRef,
      activityDate:        activityDate,
      activityRemarks:     activityRemarks.trim(),
      activityDocId:       null,
      activityDocTable:    null,
      activityStatus:      "1",
    };

    try {
      await axiosInstance.post(ACTIVITY_URL, payload);
      setActivitySuccess(
        `Activity logged successfully under file "${fileRef}". You can view it in the File Index → Activities page.`
      );
      // Don't auto-close — let user read the success message and close manually
    } catch (err) {
      setActivityError(getAxiosErrorMessage(err));
    } finally {
      setActivitySubmitting(false);
    }
  };

  // ── Render ────────────────────────────────────────────────────────────────────
  return (
    <div className="flex flex-col gap-5">

      {/* ── Header ──────────────────────────────────────────────────────────── */}
      <div className="flex flex-wrap items-start justify-between gap-4 border-b border-gray-100 pb-4 dark:border-gray-800">
        <div className="flex flex-col gap-1">
          <div className="flex items-center gap-2">
            <span className="text-lg font-semibold text-gray-800 dark:text-white/90">
              Line Items
            </span>
            <DoctypeBadge doctype={salesRecord.salesDoctype} />
            <span className="rounded bg-gray-100 px-2 py-0.5 text-xs font-mono text-gray-500 dark:bg-gray-800 dark:text-gray-400">
              Sales #{salesRecord.id}
            </span>
          </div>
          <p className="text-sm text-gray-500 dark:text-gray-400">
            <span className="font-medium text-gray-700 dark:text-gray-300">
              {salesRecord.salesFromParty}
            </span>
            {" → "}
            <span className="font-medium text-gray-700 dark:text-gray-300">
              {salesRecord.salesToParty}
            </span>
            {salesRecord.salesDate && (
              <span className="ml-2 text-xs text-gray-400">({salesRecord.salesDate})</span>
            )}
            {salesRecord.salesFileRef && (
              <span className="ml-3 inline-flex items-center gap-1 rounded-md bg-brand-50 px-2 py-0.5 text-xs font-medium text-brand-600 dark:bg-brand-500/10 dark:text-brand-300">
                <svg className="h-3 w-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M7 7h.01M7 3h5l4 4v14a2 2 0 01-2 2H5a2 2 0 01-2-2V5a2 2 0 012-2h2z" />
                </svg>
                {getFileRefString()}
              </span>
            )}
          </p>
        </div>

        {/* ── Toolbar buttons ────────────────────────────────────────────────── */}
        <div className="flex flex-wrap items-center gap-2">

          {/* Refresh */}
          <button
            type="button"
            onClick={() => void fetchItems()}
            disabled={isLoading || isSubmitting}
            title="Refresh items"
            className="inline-flex items-center justify-center rounded-lg border border-gray-300 px-3 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50 disabled:opacity-50 dark:border-gray-700 dark:text-gray-300 dark:hover:bg-white/[0.03]"
          >
            {isLoading ? (
              <svg className="h-4 w-4 animate-spin" fill="none" viewBox="0 0 24 24">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8H4z" />
              </svg>
            ) : (
              <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
              </svg>
            )}
          </button>

          {/* ── Download PDF ── */}
          <button
            type="button"
            onClick={handleDownloadPDF}
            disabled={isLoading || isSubmitting}
            title="Download as PDF"
            className="inline-flex items-center justify-center gap-1.5 rounded-lg border border-red-300 px-3 py-2 text-sm font-medium text-red-600 hover:bg-red-50 disabled:opacity-50 dark:border-red-800 dark:text-red-400 dark:hover:bg-red-500/10"
          >
            <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M12 10v6m0 0l-3-3m3 3l3-3M3 17V7a2 2 0 012-2h6l2 2h4a2 2 0 012 2v8a2 2 0 01-2 2H5a2 2 0 01-2-2z" />
            </svg>
            Download PDF
          </button>

          {/* ── Add to File Activity ── */}
          {/*
          <button
            type="button"
            onClick={openActivityModal}
            disabled={isLoading || isSubmitting}
            title={
              salesRecord.salesFileRef
                ? `Log this sales record as an activity under file: ${getFileRefString()}`
                : "No file reference set on this sales record"
            }
            className={`inline-flex items-center justify-center gap-1.5 rounded-lg border px-3 py-2 text-sm font-medium disabled:opacity-50 transition-colors
              ${salesRecord.salesFileRef
                ? "border-purple-300 text-purple-600 hover:bg-purple-50 dark:border-purple-800 dark:text-purple-400 dark:hover:bg-purple-500/10"
                : "border-gray-200 text-gray-400 cursor-not-allowed dark:border-gray-700 dark:text-gray-500"
              }`}
          >
            <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-6 9l2 2 4-4" />
            </svg>
            Add to File Activity
          </button>
            */}
          {/* Add Item */}
          <button
            type="button"
            onClick={openCreateForm}
            disabled={isSubmitting}
            className="inline-flex items-center justify-center gap-1.5 rounded-lg bg-brand-500 px-4 py-2 text-sm font-medium text-white hover:bg-brand-600 disabled:opacity-50"
          >
            <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M12 4v16m8-8H4" />
            </svg>
            Add Item
          </button>

          {/* Close */}
          <button
            type="button"
            onClick={onClose}
            className="inline-flex items-center justify-center rounded-lg border border-gray-300 px-3 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50 dark:border-gray-700 dark:text-gray-300 dark:hover:bg-white/[0.03]"
          >
            <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>

        </div>
      </div>

      {/* ── Banners ──────────────────────────────────────────────────────────── */}
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

      {/* ══════════════════════════════════════════════════════════════════════
          ADD TO FILE ACTIVITY MODAL
          ══════════════════════════════════════════════════════════════════════ */}
      <Modal
        isOpen={showActivityModal}
        onClose={() => { setShowActivityModal(false); setActivitySuccess(""); setActivityError(""); }}
        className="mx-4 w-full max-w-lg p-6 sm:p-8"
      >
        <div className="flex items-start gap-3 mb-5">
          <div className="flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-full bg-purple-100 dark:bg-purple-500/20">
            <svg className="h-5 w-5 text-purple-600 dark:text-purple-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-6 9l2 2 4-4" />
            </svg>
          </div>
          <div>
            <h3 className="text-lg font-semibold text-gray-800 dark:text-white/90">
              Add to File Activity
            </h3>
            <p className="mt-0.5 text-sm text-gray-500 dark:text-gray-400">
              This will create an activity entry under file{" "}
              <span className="font-semibold text-brand-600 dark:text-brand-400">
                {getFileRefString()}
              </span>{" "}
              in the File Index module.
            </p>
          </div>
        </div>

        {/* Info strip */}
        <div className="mb-5 rounded-lg border border-brand-200 bg-brand-50 px-4 py-3 dark:border-brand-500/30 dark:bg-brand-500/10">
          <div className="grid grid-cols-2 gap-x-4 gap-y-1 text-xs">
            <div>
              <span className="text-gray-500 dark:text-gray-400">Sales Record</span>
              <span className="ml-2 font-semibold text-gray-800 dark:text-white">#{salesRecord.id}</span>
            </div>
            <div>
              <span className="text-gray-500 dark:text-gray-400">Doc Type</span>
              <span className="ml-2 font-semibold text-gray-800 dark:text-white">
                {DOCTYPE_LABELS[salesRecord.salesDoctype] ?? salesRecord.salesDoctype}
              </span>
            </div>
            <div>
              <span className="text-gray-500 dark:text-gray-400">From</span>
              <span className="ml-2 font-semibold text-gray-800 dark:text-white truncate">{salesRecord.salesFromParty}</span>
            </div>
            <div>
              <span className="text-gray-500 dark:text-gray-400">To</span>
              <span className="ml-2 font-semibold text-gray-800 dark:text-white truncate">{salesRecord.salesToParty}</span>
            </div>
            <div>
              <span className="text-gray-500 dark:text-gray-400">File Ref</span>
              <span className="ml-2 font-semibold text-brand-600 dark:text-brand-400">{getFileRefString()}</span>
            </div>
            <div>
              <span className="text-gray-500 dark:text-gray-400">Total</span>
              <span className="ml-2 font-semibold text-gray-800 dark:text-white">
                {salesRecord.salesCurrency ?? ""} {fmt(grandTotals.total)}
              </span>
            </div>
          </div>
        </div>

        {/* Form fields */}
        <div className="flex flex-col gap-4">
          <div>
            <Label htmlFor="activityDate">Activity Date</Label>
            <Input
              id="activityDate"
              type="date"
              value={activityDate}
              onChange={(e) => setActivityDate(e.target.value)}
            />
          </div>

          <div>
            <Label htmlFor="activityRemarks">Remarks</Label>
            <textarea
              id="activityRemarks"
              rows={4}
              value={activityRemarks}
              onChange={(e) => setActivityRemarks(e.target.value)}
              placeholder="Describe this activity…"
              className="w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm text-gray-800 outline-none transition-colors focus:border-brand-500 focus:ring-2 focus:ring-brand-500/20 dark:border-gray-700 dark:bg-gray-900 dark:text-white resize-none"
            />
          </div>
        </div>

        {/* Banners */}
        {activityError && (
          <div className="mt-4 rounded-lg border border-error-500/40 bg-error-50 px-4 py-3 text-sm text-error-700 dark:bg-error-500/10 dark:text-error-400">
            {activityError}
          </div>
        )}
        {activitySuccess && (
          <div className="mt-4 rounded-lg border border-success-500/40 bg-success-50 px-4 py-3 text-sm text-success-700 dark:bg-success-500/10 dark:text-success-400">
            {activitySuccess}
          </div>
        )}

        {/* Buttons */}
        <div className="mt-6 flex gap-2">
          {!activitySuccess ? (
            <>
              <button
                type="button"
                onClick={() => void handleCreateActivity()}
                disabled={activitySubmitting}
                className="inline-flex items-center justify-center gap-1.5 rounded-lg bg-purple-600 px-4 py-2.5 text-sm font-medium text-white hover:bg-purple-700 disabled:opacity-50"
              >
                {activitySubmitting ? (
                  <>
                    <svg className="h-4 w-4 animate-spin" fill="none" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8H4z" />
                    </svg>
                    Logging…
                  </>
                ) : (
                  <>
                    <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                    </svg>
                    Log Activity
                  </>
                )}
              </button>
              <button
                type="button"
                onClick={() => { setShowActivityModal(false); setActivityError(""); }}
                disabled={activitySubmitting}
                className="inline-flex items-center justify-center rounded-lg border border-gray-300 px-4 py-2.5 text-sm font-medium text-gray-700 hover:bg-gray-50 disabled:opacity-50 dark:border-gray-700 dark:text-gray-300"
              >
                Cancel
              </button>
            </>
          ) : (
            <button
              type="button"
              onClick={() => { setShowActivityModal(false); setActivitySuccess(""); }}
              className="inline-flex items-center justify-center rounded-lg bg-success-500 px-4 py-2.5 text-sm font-medium text-white hover:bg-success-600"
            >
              Done
            </button>
          )}
        </div>
      </Modal>

      {/* ══════════════════════════════════════════════════════════════════════
          ADD / EDIT ITEM MODAL
          ══════════════════════════════════════════════════════════════════════ */}
      <Modal
        isOpen={showForm}
        onClose={handleCancelForm}
        className="mx-4 w-full max-w-4xl p-6 sm:p-8"
      >
        <h3 className="pr-12 text-xl font-semibold text-gray-800 dark:text-white/90">
          {isEditing ? "Edit Line Item" : "Add Line Item"}
        </h3>
        <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
          Tax amounts are calculated automatically from quantity, rate and tax rates.
        </p>

        <form onSubmit={(e) => void handleSubmit(e)} className="mt-6 flex flex-col gap-5">

          {/* Row 1 — Product & HSN */}
          <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
            <div className="md:col-span-2">
              <Label htmlFor="itemName">
                Product / Service <span className="text-red-500">*</span>
              </Label>
              <Input
                id="itemName"
                value={formState.nameOfProductService}
                onChange={(e) => setField("nameOfProductService", e.target.value)}
                placeholder="Enter product or service name"
              />
            </div>
            <div>
              <Label htmlFor="itemHsn">HSN / SAC Code</Label>
              <Input
                id="itemHsn"
                value={formState.hsnAcs}
                onChange={(e) => setField("hsnAcs", e.target.value)}
                placeholder="e.g. 8471"
              />
            </div>
          </div>

          {/* Row 2 — Qty, Unit, Rate → auto Taxable Value */}
          <div className="grid grid-cols-2 gap-4 md:grid-cols-4">
            <div>
              <Label htmlFor="itemQty">
                Quantity <span className="text-red-500">*</span>
              </Label>
              <NumInput
                id="itemQty"
                value={formState.quantity}
                onChange={(v) => setField("quantity", v)}
                placeholder="0"
              />
            </div>
            <div>
              <Label htmlFor="itemUnit">Unit</Label>
              <Input
                id="itemUnit"
                value={formState.unit}
                onChange={(e) => setField("unit", e.target.value)}
                placeholder="Nos / Kg / L"
              />
            </div>
            <div>
              <Label htmlFor="itemRate">Unit Rate</Label>
              <NumInput
                id="itemRate"
                value={formState.unitRate}
                onChange={(v) => setField("unitRate", v)}
              />
            </div>
            <div>
              <Label htmlFor="itemTaxable">
                Taxable Value
                <span className="ml-1 text-xs text-gray-400">(auto)</span>
              </Label>
              <NumInput id="itemTaxable" value={formState.taxableValue} readOnly />
            </div>
          </div>

          {/* Row 3 — CGST / SGST / IGST */}
          <div className="rounded-lg border border-gray-200 bg-gray-50/60 p-4 dark:border-gray-700 dark:bg-gray-800/30">
            <p className="mb-3 text-xs font-semibold uppercase tracking-wide text-gray-500 dark:text-gray-400">
              Tax Details
            </p>
            <div className="grid grid-cols-2 gap-4 md:grid-cols-3">
              {/* CGST */}
              <div className="flex flex-col gap-2">
                <p className="text-xs font-medium text-gray-600 dark:text-gray-300">CGST</p>
                <div className="flex gap-2">
                  <div className="flex-1">
                    <Label htmlFor="cgstRate">Rate %</Label>
                    <NumInput id="cgstRate" value={formState.cgstRate} onChange={(v) => setField("cgstRate", v)} placeholder="0" />
                  </div>
                  <div className="flex-1">
                    <Label htmlFor="cgstAmt">Amount <span className="text-xs text-gray-400">(auto)</span></Label>
                    <NumInput id="cgstAmt" value={formState.cgstAmount} readOnly />
                  </div>
                </div>
              </div>
              {/* SGST */}
              <div className="flex flex-col gap-2">
                <p className="text-xs font-medium text-gray-600 dark:text-gray-300">SGST</p>
                <div className="flex gap-2">
                  <div className="flex-1">
                    <Label htmlFor="sgstRate">Rate %</Label>
                    <NumInput id="sgstRate" value={formState.sgstRate} onChange={(v) => setField("sgstRate", v)} placeholder="0" />
                  </div>
                  <div className="flex-1">
                    <Label htmlFor="sgstAmt">Amount <span className="text-xs text-gray-400">(auto)</span></Label>
                    <NumInput id="sgstAmt" value={formState.sgstAmount} readOnly />
                  </div>
                </div>
              </div>
              {/* IGST */}
              <div className="flex flex-col gap-2">
                <p className="text-xs font-medium text-gray-600 dark:text-gray-300">IGST</p>
                <div className="flex gap-2">
                  <div className="flex-1">
                    <Label htmlFor="igstRate">Rate %</Label>
                    <NumInput id="igstRate" value={formState.igstRate} onChange={(v) => setField("igstRate", v)} placeholder="0" />
                  </div>
                  <div className="flex-1">
                    <Label htmlFor="igstAmt">Amount <span className="text-xs text-gray-400">(auto)</span></Label>
                    <NumInput id="igstAmt" value={formState.igstAmount} readOnly />
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Row 4 — Total & Status */}
          <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
            <div>
              <Label htmlFor="itemTotal">Total <span className="text-xs text-gray-400">(auto)</span></Label>
              <NumInput id="itemTotal" value={formState.total} readOnly />
            </div>
            <div>
              <Label htmlFor="itemStatus">Status</Label>
              <select
                id="itemStatus"
                className={selectClass}
                value={formState.status}
                onChange={(e) => setField("status", parseInt(e.target.value))}
              >
                <option value={1}>Active</option>
                <option value={0}>Inactive</option>
              </select>
            </div>
          </div>

          {/* Totals preview banner */}
          {formState.quantity > 0 && formState.unitRate > 0 && (
            <div className="flex flex-wrap items-center gap-4 rounded-lg bg-brand-50 px-4 py-3 text-sm dark:bg-brand-500/10">
              <span className="text-gray-600 dark:text-gray-300">
                Taxable: <span className="font-semibold text-gray-800 dark:text-white">{fmt(formState.taxableValue)}</span>
              </span>
              {formState.cgstAmount > 0 && (
                <span className="text-gray-600 dark:text-gray-300">
                  CGST: <span className="font-semibold text-gray-800 dark:text-white">{fmt(formState.cgstAmount)}</span>
                </span>
              )}
              {formState.sgstAmount > 0 && (
                <span className="text-gray-600 dark:text-gray-300">
                  SGST: <span className="font-semibold text-gray-800 dark:text-white">{fmt(formState.sgstAmount)}</span>
                </span>
              )}
              {formState.igstAmount > 0 && (
                <span className="text-gray-600 dark:text-gray-300">
                  IGST: <span className="font-semibold text-gray-800 dark:text-white">{fmt(formState.igstAmount)}</span>
                </span>
              )}
              <span className="ml-auto font-semibold text-brand-700 dark:text-brand-300">
                Line Total: {fmt(formState.total)}
              </span>
            </div>
          )}

          {/* Action Buttons */}
          <div className="flex gap-2">
            <button
              type="submit"
              disabled={isSubmitting}
              className="inline-flex items-center justify-center rounded-lg bg-brand-500 px-4 py-2.5 text-sm font-medium text-white hover:bg-brand-600 disabled:opacity-50"
            >
              {isSubmitting ? "Saving..." : isEditing ? "Update Item" : "Add Item"}
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

      {/* ── Items Table ───────────────────────────────────────────────────────── */}
      <div className="overflow-x-auto rounded-xl border border-gray-200 dark:border-gray-800">
        <Table>
          <TableHeader className="bg-gray-50 dark:bg-white/[0.03]">
            <TableRow>
              {[
                "#",
                "Product / Service",
                "HSN",
                "Qty",
                "Unit",
                "Rate",
                "Taxable Value",
                "CGST %",
                "CGST Amt",
                "SGST %",
                "SGST Amt",
                "IGST %",
                "IGST Amt",
                "Total",
                "Actions",
              ].map((h) => (
                <TableCell
                  key={h}
                  isHeader
                  className="whitespace-nowrap px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-gray-600 dark:text-gray-300"
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
                <TableCell className="px-4 py-8 text-center text-sm text-gray-500 dark:text-gray-400" colSpan={15}>
                  <div className="flex items-center justify-center gap-2">
                    <svg className="h-4 w-4 animate-spin text-brand-500" fill="none" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8H4z" />
                    </svg>
                    Loading items…
                  </div>
                </TableCell>
              </TableRow>
            )}

            {/* Empty */}
            {!isLoading && items.length === 0 && (
              <TableRow>
                <TableCell className="px-4 py-10 text-center text-sm text-gray-500 dark:text-gray-400" colSpan={15}>
                  <div className="flex flex-col items-center gap-2">
                    <svg className="h-8 w-8 text-gray-300 dark:text-gray-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
                    </svg>
                    <span>No items yet — click <strong>Add Item</strong> to get started.</span>
                  </div>
                </TableCell>
              </TableRow>
            )}

            {/* Data rows */}
            {!isLoading &&
              items.map((item, idx) => (
                <TableRow key={item.id} className="transition-colors hover:bg-brand-50/60 dark:hover:bg-brand-500/5">
                  <TableCell className="px-4 py-3 text-sm text-gray-400 dark:text-gray-500">{idx + 1}</TableCell>
                  <TableCell className="max-w-[180px] px-4 py-3">
                    <span className="truncate text-sm font-medium text-gray-800 dark:text-white/90">{item.nameOfProductService || "—"}</span>
                  </TableCell>
                  <TableCell className="px-4 py-3 text-sm text-gray-500 dark:text-gray-400">{item.hsnAcs || "—"}</TableCell>
                  <TableCell className="px-4 py-3 text-right text-sm text-gray-600 dark:text-gray-300">{item.quantity}</TableCell>
                  <TableCell className="px-4 py-3 text-sm text-gray-500 dark:text-gray-400">{item.unit || "—"}</TableCell>
                  <TableCell className="px-4 py-3 text-right text-sm text-gray-600 dark:text-gray-300">{fmt(item.unitRate ?? 0)}</TableCell>
                  <TableCell className="px-4 py-3 text-right text-sm font-medium text-gray-700 dark:text-gray-200">{fmt(item.taxableValue ?? 0)}</TableCell>
                  <TableCell className="px-4 py-3 text-right text-sm text-gray-500 dark:text-gray-400">{item.cgstRate > 0 ? `${item.cgstRate}%` : "—"}</TableCell>
                  <TableCell className="px-4 py-3 text-right text-sm text-gray-600 dark:text-gray-300">{item.cgstAmount > 0 ? fmt(item.cgstAmount) : "—"}</TableCell>
                  <TableCell className="px-4 py-3 text-right text-sm text-gray-500 dark:text-gray-400">{item.sgstRate > 0 ? `${item.sgstRate}%` : "—"}</TableCell>
                  <TableCell className="px-4 py-3 text-right text-sm text-gray-600 dark:text-gray-300">{item.sgstAmount > 0 ? fmt(item.sgstAmount) : "—"}</TableCell>
                  <TableCell className="px-4 py-3 text-right text-sm text-gray-500 dark:text-gray-400">{item.igstRate > 0 ? `${item.igstRate}%` : "—"}</TableCell>
                  <TableCell className="px-4 py-3 text-right text-sm text-gray-600 dark:text-gray-300">{item.igstAmount > 0 ? fmt(item.igstAmount) : "—"}</TableCell>
                  <TableCell className="px-4 py-3 text-right text-sm font-semibold text-brand-600 dark:text-brand-400">{fmt(item.total ?? 0)}</TableCell>
                  <TableCell className="px-4 py-3" onClick={(e) => e.stopPropagation()}>
                    <div className="flex items-center gap-2">
                      <button
                        type="button"
                        onClick={() => openEditForm(item)}
                        disabled={isSubmitting}
                        className="inline-flex items-center justify-center rounded-md border border-brand-300 px-3 py-1.5 text-xs font-medium text-brand-600 hover:bg-brand-50 disabled:opacity-50 dark:border-brand-800 dark:text-brand-300 dark:hover:bg-brand-500/10"
                      >
                        Edit
                      </button>
                      <button
                        type="button"
                        onClick={() => void handleDelete(item.id!)}
                        disabled={isSubmitting}
                        className="inline-flex items-center justify-center rounded-md border border-error-300 px-3 py-1.5 text-xs font-medium text-error-600 hover:bg-error-50 disabled:opacity-50 dark:border-error-800 dark:text-error-400 dark:hover:bg-error-500/10"
                      >
                        Delete
                      </button>
                    </div>
                  </TableCell>
                </TableRow>
              ))}

            {/* Grand Totals Row */}
            {!isLoading && items.length > 0 && (
              <TableRow className="bg-gray-50 dark:bg-white/[0.03]">
                <TableCell className="px-4 py-3 text-xs font-semibold uppercase tracking-wide text-gray-500 dark:text-gray-400" colSpan={6}>
                  Grand Total ({items.length} item{items.length !== 1 ? "s" : ""})
                </TableCell>
                <TableCell className="px-4 py-3 text-right text-sm font-semibold text-gray-800 dark:text-white/90">{fmt(grandTotals.taxable)}</TableCell>
                <TableCell className="px-4 py-3" />
                <TableCell className="px-4 py-3 text-right text-sm font-semibold text-gray-800 dark:text-white/90">{fmt(grandTotals.cgst)}</TableCell>
                <TableCell className="px-4 py-3" />
                <TableCell className="px-4 py-3 text-right text-sm font-semibold text-gray-800 dark:text-white/90">{fmt(grandTotals.sgst)}</TableCell>
                <TableCell className="px-4 py-3" />
                <TableCell className="px-4 py-3 text-right text-sm font-semibold text-gray-800 dark:text-white/90">{fmt(grandTotals.igst)}</TableCell>
                <TableCell className="px-4 py-3 text-right text-sm font-bold text-brand-600 dark:text-brand-400">{fmt(grandTotals.total)}</TableCell>
                <TableCell className="px-4 py-3" />
              </TableRow>
            )}
          </TableBody>
        </Table>
      </div>

      {/* ── Summary Cards ─────────────────────────────────────────────────────── */}
      {!isLoading && items.length > 0 && (
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
          {[
            { label: "Taxable Value", value: grandTotals.taxable,                                    color: "text-gray-700 dark:text-gray-200" },
            { label: "Total Tax",     value: grandTotals.cgst + grandTotals.sgst + grandTotals.igst, color: "text-amber-600 dark:text-amber-400" },
            { label: "Invoice Total", value: grandTotals.total,                                      color: "text-brand-600 dark:text-brand-400" },
          ].map((card) => (
            <div key={card.label} className="rounded-xl border border-gray-200 bg-white p-4 dark:border-gray-800 dark:bg-gray-900">
              <p className="text-xs text-gray-500 dark:text-gray-400">{card.label}</p>
              <p className={`mt-1 text-lg font-bold ${card.color}`}>
                {salesRecord.salesCurrency && (
                  <span className="mr-1 text-sm font-normal opacity-70">{salesRecord.salesCurrency}</span>
                )}
                {fmt(card.value)}
              </p>
            </div>
          ))}
          <div className="rounded-xl border border-gray-200 bg-white p-4 dark:border-gray-800 dark:bg-gray-900">
            <p className="text-xs text-gray-500 dark:text-gray-400">Items Count</p>
            <p className="mt-1 text-lg font-bold text-gray-700 dark:text-gray-200">{items.length}</p>
          </div>
        </div>
      )}

    </div>
  );
}