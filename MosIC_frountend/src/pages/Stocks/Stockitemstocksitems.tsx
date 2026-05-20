import { type FormEvent, useCallback, useEffect, useState } from "react";
import Label from "../../components/form/Label";
import Input from "../../components/form/input/InputField";
import TextArea from "../../components/form/input/TextArea";
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
import { usePermissions } from "../../hooks/usePermissions";

// ─── Constants ────────────────────────────────────────────────────────────────

const STOCKS_URL = "/api/stocks";

const selectClass =
  "h-10 w-full rounded-lg border border-gray-300 bg-white px-3 text-sm text-gray-800 outline-none transition-colors focus:border-brand-500 focus:ring-2 focus:ring-brand-500/20 dark:border-gray-700 dark:bg-gray-900 dark:text-white";

const readonlyClass =
  "h-10 w-full rounded-lg border border-gray-200 bg-gray-50 px-3 text-sm text-gray-500 dark:border-gray-700 dark:bg-gray-800/60 dark:text-gray-400 cursor-not-allowed select-none flex items-center";

// ─── Types ────────────────────────────────────────────────────────────────────

export type StockEntryDTO = {
  id: number | null;
  stockItemId: number;
  stockDate: string;
  stockDescription: string;
  stockInOut: string;
  stockQuantity: string;
  stockReturnOrNonReturn: string;
  stockParty: string;
  matPassId: number | null;
  status: number;
};

/** What the parent (StockItemPage) passes in when a row is clicked */
export type StockItemRecord = {
  id: number;
  productName: string;
  smUnit: string;
  smOpeningBalance: number;
};

type Props = {
  stockItemRecord: StockItemRecord;
  onClose: () => void;
};

// ─── Helpers ──────────────────────────────────────────────────────────────────

const createEmptyEntry = (stockItemId: number): StockEntryDTO => ({
  id: null,
  stockItemId,
  stockDate: "",
  stockDescription: "",
  stockInOut: "IN",
  stockQuantity: "",
  stockReturnOrNonReturn: "NON-RETURN",
  stockParty: "",       // will be set from matpass party info when linked; blank by default
  matPassId: null,
  status: 1,
});

const getAxiosErrorMessage = (err: unknown): string => {
  if (err && typeof err === "object" && "response" in err) {
    const res = (err as { response?: { data?: { message?: string; error?: string } } }).response;
    return res?.data?.message ?? res?.data?.error ?? "An error occurred";
  }
  return "Network error — please try again";
};

// ─── Sub-components ───────────────────────────────────────────────────────────

const DirectionBadge = ({ direction }: { direction: string }) => {
  const isIn = direction?.toUpperCase() === "IN";
  return (
    <span
      className={`inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-xs font-semibold ${
        isIn
          ? "bg-blue-50 text-blue-700 dark:bg-blue-500/10 dark:text-blue-400"
          : "bg-orange-50 text-orange-700 dark:bg-orange-500/10 dark:text-orange-400"
      }`}
    >
      <span className={`size-1.5 rounded-full ${isIn ? "bg-blue-500" : "bg-orange-500"}`} />
      {direction?.toUpperCase() || "—"}
    </span>
  );
};

const ReturnBadge = ({ value }: { value: string }) => {
  const isReturn = value?.toUpperCase() === "RETURN";
  return (
    <span
      className={`inline-flex items-center rounded px-2 py-0.5 text-xs font-medium ${
        isReturn
          ? "bg-purple-50 text-purple-700 dark:bg-purple-500/10 dark:text-purple-400"
          : "bg-gray-100 text-gray-600 dark:bg-gray-800 dark:text-gray-400"
      }`}
    >
      {value || "—"}
    </span>
  );
};

// ─── PDF Generator ────────────────────────────────────────────────────────────

function printStockItemPDF(stockItemRecord: StockItemRecord, items: StockEntryDTO[]) {
  const totalIn  = items.filter((i) => i.stockInOut?.toUpperCase() === "IN").reduce((s, i) => s + Number(i.stockQuantity || 0), 0);
  const totalOut = items.filter((i) => i.stockInOut?.toUpperCase() === "OUT").reduce((s, i) => s + Number(i.stockQuantity || 0), 0);
  const netBalance = stockItemRecord.smOpeningBalance + totalIn - totalOut;

  const itemRows = items
    .map(
      (item, idx) => `
    <tr>
      <td>${idx + 1}</td>
      <td>${item.stockDate || "—"}</td>
      <td>${item.stockInOut?.toUpperCase() || "—"}</td>
      <td class="right bold">${item.stockQuantity || "—"}${stockItemRecord.smUnit ? ` <span style="font-weight:400;color:#888;">${stockItemRecord.smUnit}</span>` : ""}</td>
      <td>${item.stockReturnOrNonReturn || "—"}</td>
      <td>${item.stockParty || "—"}</td>
      <td>${item.matPassId ? `#${item.matPassId}` : "—"}</td>
      <td>${item.stockDescription || "—"}</td>
    </tr>
  `
    )
    .join("");

  const html = `<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8"/>
  <title>Stock Ledger — ${stockItemRecord.productName}</title>
  <style>
    * { box-sizing: border-box; margin: 0; padding: 0; }
    body { font-family: Arial, sans-serif; font-size: 12px; color: #1a1a1a; padding: 32px; }
    .header { display: flex; justify-content: space-between; align-items: flex-start; margin-bottom: 28px; border-bottom: 2px solid #3b5bf5; padding-bottom: 16px; }
    .company { font-size: 22px; font-weight: 700; color: #3b5bf5; }
    .doc-type { font-size: 18px; font-weight: 700; text-align: right; color: #1a1a1a; }
    .doc-meta { font-size: 11px; color: #555; text-align: right; margin-top: 4px; }
    .info-bar { display: grid; grid-template-columns: repeat(4, 1fr); gap: 16px; margin-bottom: 24px; background: #f8f9ff; border: 1px solid #e2e6ff; border-radius: 8px; padding: 16px; }
    .info-block h4 { font-size: 10px; font-weight: 700; text-transform: uppercase; color: #666; letter-spacing: 0.05em; margin-bottom: 6px; }
    .info-block p { font-size: 13px; font-weight: 600; color: #1a1a1a; }
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
      <div class="doc-type">Stock Ledger</div>
      <div class="doc-meta">Item: ${stockItemRecord.productName}</div>
      <div class="doc-meta">Unit: ${stockItemRecord.smUnit || "—"}</div>
    </div>
  </div>

  <div class="info-bar">
    <div class="info-block">
      <h4>Product</h4>
      <p>${stockItemRecord.productName}</p>
    </div>
    <div class="info-block">
      <h4>Unit</h4>
      <p>${stockItemRecord.smUnit || "—"}</p>
    </div>
    <div class="info-block">
      <h4>Opening Balance</h4>
      <p>${stockItemRecord.smOpeningBalance} ${stockItemRecord.smUnit || ""}</p>
    </div>
    <div class="info-block">
      <h4>Net Balance</h4>
      <p>${netBalance} ${stockItemRecord.smUnit || ""}</p>
    </div>
  </div>

  <table>
    <thead>
      <tr>
        <th>#</th>
        <th>Date</th>
        <th>Direction</th>
        <th class="right">Quantity</th>
        <th>Return Type</th>
        <th>Party</th>
        <th>Matpass Ref</th>
        <th>Description</th>
      </tr>
    </thead>
    <tbody>
      ${itemRows}
      <tr class="totals-row">
        <td colspan="3" style="text-align:right;font-size:10px;text-transform:uppercase;letter-spacing:.04em;">
          Total (${items.length} entr${items.length !== 1 ? "ies" : "y"})
        </td>
        <td colspan="5">IN: ${totalIn} | OUT: ${totalOut} | Net: ${netBalance} ${stockItemRecord.smUnit || ""}</td>
      </tr>
    </tbody>
  </table>

  <div class="summary">
    <div class="summary-card">
      <div class="label">Total IN</div>
      <div class="value">${totalIn} ${stockItemRecord.smUnit || ""}</div>
    </div>
    <div class="summary-card">
      <div class="label">Total OUT</div>
      <div class="value">${totalOut} ${stockItemRecord.smUnit || ""}</div>
    </div>
    <div class="summary-card">
      <div class="label">Opening Balance</div>
      <div class="value">${stockItemRecord.smOpeningBalance} ${stockItemRecord.smUnit || ""}</div>
    </div>
    <div class="summary-card total-card">
      <div class="label">Net Balance</div>
      <div class="value">${netBalance} ${stockItemRecord.smUnit || ""}</div>
    </div>
  </div>

  <div class="footer">Generated by MosIC Solutions · ${new Date().toLocaleString("en-IN")}</div>
</body>
</html>`;

  const iframe = document.createElement("iframe");
  iframe.style.cssText =
    "position:fixed;top:-9999px;left:-9999px;width:1px;height:1px;border:none;";
  document.body.appendChild(iframe);

  const doc = iframe.contentDocument || iframe.contentWindow?.document;
  if (!doc) return;

  doc.open();
  doc.write(html);
  doc.close();

  setTimeout(() => {
    iframe.contentWindow?.focus();
    iframe.contentWindow?.print();
    setTimeout(() => document.body.removeChild(iframe), 2000);
  }, 500);
}

// ─── Component ────────────────────────────────────────────────────────────────

export default function StockitemStocksItems({ stockItemRecord, onClose }: Props) {
  const { canCreate, canEdit, canDelete } = usePermissions();

  const [items, setItems]               = useState<StockEntryDTO[]>([]);
  const [formState, setFormState]       = useState<StockEntryDTO>(createEmptyEntry(stockItemRecord.id));
  const [editingId, setEditingId]       = useState<number | null>(null);
  const [showForm, setShowForm]         = useState(false);
  const [isLoading, setIsLoading]       = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState("");
  const [successMessage, setSuccessMessage] = useState("");

  const isEditing = editingId !== null;
  const clearMessages = () => { setErrorMessage(""); setSuccessMessage(""); };

  // ─── Fetch stocks for this stock item ─────────────────────────────────────

  const fetchItems = useCallback(async () => {
    setIsLoading(true);
    setErrorMessage("");
    try {
      // Fetches all stock entries filtered by stockItemId
      const res = await axiosInstance.get<StockEntryDTO[]>(
       // `${STOCKS_URL}/stock-item/${stockItemRecord.id}`
       `${STOCKS_URL}/item/${stockItemRecord.id}`
      );
      setItems(res.data ?? []);
    } catch (err) {
      setErrorMessage(getAxiosErrorMessage(err));
    } finally {
      setIsLoading(false);
    }
  }, [stockItemRecord.id]);

  useEffect(() => {
    void fetchItems();
  }, [fetchItems]);

  // ─── Derived counts ───────────────────────────────────────────────────────

  const totalInQty  = items
    .filter((i) => i.stockInOut?.toUpperCase() === "IN")
    .reduce((s, i) => s + Number(i.stockQuantity || 0), 0);
  const totalOutQty = items
    .filter((i) => i.stockInOut?.toUpperCase() === "OUT")
    .reduce((s, i) => s + Number(i.stockQuantity || 0), 0);
  const netBalance  = stockItemRecord.smOpeningBalance + totalInQty - totalOutQty;

  // ─── Form helpers ─────────────────────────────────────────────────────────

  const setField = (field: keyof StockEntryDTO, value: string | number | null) =>
    setFormState((prev) => ({ ...prev, [field]: value }));

  const openCreateForm = () => {
    setEditingId(null);
    setFormState(createEmptyEntry(stockItemRecord.id));
    setShowForm(true);
    clearMessages();
  };

  const openEditForm = (item: StockEntryDTO) => {
    setEditingId(item.id);
    setFormState({ ...item });
    setShowForm(true);
    clearMessages();
  };

  const handleCancelForm = () => {
    setEditingId(null);
    setFormState(createEmptyEntry(stockItemRecord.id));
    setShowForm(false);
  };

  // ─── CRUD ─────────────────────────────────────────────────────────────────

  const handleSubmit = async (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    clearMessages();

    if (!formState.stockQuantity.trim()) {
      setErrorMessage("Quantity is required.");
      return;
    }
    if (!formState.stockDate.trim()) {
      setErrorMessage("Date is required.");
      return;
    }

    setIsSubmitting(true);
    const payload: Partial<StockEntryDTO> = {
      ...formState,
      stockItemId: stockItemRecord.id,
    };
    if (!isEditing) delete payload.id;

    try {
      if (isEditing && editingId !== null) {
        await axiosInstance.put(`${STOCKS_URL}/${editingId}`, payload);
        setSuccessMessage("Stock entry updated.");
      } else {
        const res = await axiosInstance.post<StockEntryDTO>(STOCKS_URL, payload);
        setSuccessMessage(`Stock entry #${res.data.id} created.`);
      }
      handleCancelForm();
      await fetchItems();
    } catch (err) {
      setErrorMessage(getAxiosErrorMessage(err));
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDelete = async (id: number) => {
    if (!window.confirm(`Delete stock entry #${id}?`)) return;
    clearMessages();
    setIsSubmitting(true);
    try {
      await axiosInstance.delete(`${STOCKS_URL}/${id}`);
      if (editingId === id) handleCancelForm();
      setSuccessMessage("Stock entry deleted.");
      await fetchItems();
    } catch (err) {
      setErrorMessage(getAxiosErrorMessage(err));
    } finally {
      setIsSubmitting(false);
    }
  };

  // ─── PDF Download ─────────────────────────────────────────────────────────

  const handleDownloadPDF = () => {
    if (items.length === 0) {
      alert("No stock entries to print. Please add entries first.");
      return;
    }
    printStockItemPDF(stockItemRecord, items);
  };

  // ─── Render ───────────────────────────────────────────────────────────────

  return (
    <div className="flex flex-col gap-5">

      {/* ── Header ───────────────────────────────────────────────────────────── */}
      <div className="flex flex-wrap items-start justify-between gap-4 border-b border-gray-100 pb-4 dark:border-gray-800">
        <div className="flex flex-col gap-1">
          <div className="flex items-center gap-2 flex-wrap">
            <span className="text-lg font-semibold text-gray-800 dark:text-white/90">
              Stock Ledger
            </span>
            <span className="rounded bg-brand-50 px-2 py-0.5 text-xs font-semibold text-brand-600 dark:bg-brand-500/10 dark:text-brand-300">
              {stockItemRecord.productName}
            </span>
            {stockItemRecord.smUnit && (
              <span className="rounded bg-gray-100 px-2 py-0.5 text-xs font-mono text-gray-500 dark:bg-gray-800 dark:text-gray-400">
                Unit: {stockItemRecord.smUnit}
              </span>
            )}
            <span className="rounded bg-gray-100 px-2 py-0.5 text-xs font-mono text-gray-500 dark:bg-gray-800 dark:text-gray-400">
              Item #{stockItemRecord.id}
            </span>
          </div>
          <p className="text-sm text-gray-500 dark:text-gray-400">
            Opening Balance:{" "}
            <span className="font-medium text-gray-700 dark:text-gray-300">
              {stockItemRecord.smOpeningBalance} {stockItemRecord.smUnit}
            </span>
            {" · "}Net Balance:{" "}
            <span
              className={`font-semibold ${
                netBalance < 0
                  ? "text-red-600 dark:text-red-400"
                  : "text-green-600 dark:text-green-400"
              }`}
            >
              {netBalance} {stockItemRecord.smUnit}
            </span>
          </p>
        </div>

        {/* ── Toolbar buttons ──────────────────────────────────────────────── */}
        <div className="flex flex-wrap items-center gap-2">

          {/* Refresh */}
          <button
            type="button"
            onClick={() => void fetchItems()}
            disabled={isLoading || isSubmitting}
            title="Refresh entries"
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

          {/* Download PDF */}
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

          {/* Add Stock Entry */}
          {canCreate && (
            <button
              type="button"
              onClick={openCreateForm}
              disabled={isSubmitting}
              className="inline-flex items-center justify-center gap-1.5 rounded-lg bg-brand-500 px-4 py-2 text-sm font-medium text-white hover:bg-brand-600 disabled:opacity-50"
            >
              <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M12 4v16m8-8H4" />
              </svg>
              Add Entry
            </button>
          )}

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

      {/* ── Add / Edit Modal ─────────────────────────────────────────────────── */}
      <Modal
        isOpen={showForm}
        onClose={handleCancelForm}
        className="mx-4 w-full max-w-4xl p-6 sm:p-8"
      >
        <h3 className="pr-12 text-xl font-semibold text-gray-800 dark:text-white/90">
          {isEditing ? "Edit Stock Entry" : "Add Stock Entry"}
        </h3>
        <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
          Linked to Stock Item:{" "}
          <span className="font-medium text-brand-600 dark:text-brand-400">
            {stockItemRecord.productName}
          </span>
          {stockItemRecord.smUnit && (
            <span className="ml-1 text-gray-400">({stockItemRecord.smUnit})</span>
          )}
        </p>

        <form onSubmit={(e) => void handleSubmit(e)} className="mt-6">
          <div className="grid grid-cols-1 gap-4 md:grid-cols-2">

            {/* Stock Item — read-only, always the current stock item */}
            <div>
              <Label htmlFor="stockItemDisplay">Stock Item</Label>
              <div className={readonlyClass}>
                {stockItemRecord.productName}
                {stockItemRecord.smUnit && (
                  <span className="ml-1 text-xs text-gray-400">
                    ({stockItemRecord.smUnit})
                  </span>
                )}
              </div>
              <p className="mt-1 text-xs text-gray-400 dark:text-gray-500">
                Auto-linked to this stock item — not editable
              </p>
            </div>

            {/* Direction */}
            <div>
              <Label htmlFor="stockInOut">
                Direction <span className="text-red-500">*</span>
              </Label>
              <select
                id="stockInOut"
                className={selectClass}
                value={formState.stockInOut}
                onChange={(e) => setField("stockInOut", e.target.value)}
              >
                <option value="IN">IN</option>
                <option value="OUT">OUT</option>
              </select>
            </div>

            {/* Date */}
            <div>
              <Label htmlFor="stockDate">
                Date <span className="text-red-500">*</span>
              </Label>
              <DatePicker
                value={formState.stockDate}
                onChange={(val) => setField("stockDate", val)}
              />
            </div>

            {/* Quantity */}
            <div>
              <Label htmlFor="stockQuantity">
                Quantity <span className="text-red-500">*</span>
              </Label>
              <Input
                id="stockQuantity"
                type="number"
                value={formState.stockQuantity}
                onChange={(e) => setField("stockQuantity", e.target.value)}
                placeholder="e.g. 10"
              />
            </div>

            {/* Return / Non-Return */}
            <div>
              <Label htmlFor="stockReturnOrNonReturn">Return / Non-Return</Label>
              <select
                id="stockReturnOrNonReturn"
                className={selectClass}
                value={formState.stockReturnOrNonReturn}
                onChange={(e) => setField("stockReturnOrNonReturn", e.target.value)}
              >
                <option value="NON-RETURN">NON-RETURN</option>
                <option value="RETURN">RETURN</option>
              </select>
            </div>

            {/* Party — typed manually (NOT pre-filled from matpass;
                party info is on the matpass, not on the stock item itself) */}
            <div>
              <Label htmlFor="stockParty">Party</Label>
              <Input
                id="stockParty"
                value={formState.stockParty}
                onChange={(e) => setField("stockParty", e.target.value)}
                placeholder="e.g. Acme Corp"
              />
              <p className="mt-1 text-xs text-gray-400 dark:text-gray-500">
                If this entry is from a Matpass, party will be shown from that record
              </p>
            </div>

            {/* Matpass Reference — optional numeric link */}
            <div>
              <Label htmlFor="matPassId">Matpass Reference (optional)</Label>
              <Input
                id="matPassId"
                type="number"
                value={formState.matPassId !== null ? String(formState.matPassId) : ""}
                onChange={(e) =>
                  setField("matPassId", e.target.value ? Number(e.target.value) : null)
                }
                placeholder="e.g. 12"
              />
            </div>

            {/* Status */}
            <div>
              <Label htmlFor="stockStatus">Status</Label>
              <select
                id="stockStatus"
                className={selectClass}
                value={formState.status}
                onChange={(e) => setField("status", Number(e.target.value))}
              >
                <option value={1}>Active</option>
                <option value={0}>Disabled</option>
              </select>
            </div>

            {/* Description */}
            <div className="md:col-span-2">
              <Label htmlFor="stockDescription">Description</Label>
              <TextArea
                value={formState.stockDescription}
                onChange={(v) => setField("stockDescription", v)}
                placeholder="Enter description"
              />
            </div>
          </div>

          <div className="mt-6 flex gap-2">
            <button
              type="submit"
              disabled={isSubmitting}
              className="inline-flex items-center justify-center rounded-lg bg-brand-500 px-4 py-2.5 text-sm font-medium text-white hover:bg-brand-600 disabled:opacity-50"
            >
              {isSubmitting ? "Saving..." : isEditing ? "Update Entry" : "Add Entry"}
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

      {/* ── Stock Entries Table ──────────────────────────────────────────────── */}
      <div className="overflow-x-auto rounded-xl border border-gray-200 dark:border-gray-800">
        <Table>
          <TableHeader className="bg-gray-50 dark:bg-white/[0.03]">
            <TableRow>
              {["#", "Date", "Direction", "Quantity", "Return Type", "Party", "Matpass Ref", "Description", "Actions"].map((h) => (
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
            {isLoading && (
              <TableRow>
                <TableCell className="px-4 py-8 text-center text-sm text-gray-500 dark:text-gray-400" colSpan={9}>
                  <div className="flex items-center justify-center gap-2">
                    <svg className="h-4 w-4 animate-spin text-brand-500" fill="none" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8H4z" />
                    </svg>
                    Loading stock entries…
                  </div>
                </TableCell>
              </TableRow>
            )}

            {!isLoading && items.length === 0 && (
              <TableRow>
                <TableCell className="px-4 py-10 text-center text-sm text-gray-500 dark:text-gray-400" colSpan={9}>
                  <div className="flex flex-col items-center gap-2">
                    <svg className="h-8 w-8 text-gray-300 dark:text-gray-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10" />
                    </svg>
                    <span>
                      No stock entries yet.{canCreate ? " Click " : ""}
                      {canCreate && <strong>Add Entry</strong>}
                      {canCreate ? " to get started." : ""}
                    </span>
                  </div>
                </TableCell>
              </TableRow>
            )}

            {!isLoading &&
              items.map((item, idx) => (
                <TableRow
                  key={item.id}
                  className="transition-colors hover:bg-brand-50/60 dark:hover:bg-brand-500/5"
                >
                  <TableCell className="px-4 py-3 text-sm text-gray-400 dark:text-gray-500">
                    {idx + 1}
                  </TableCell>
                  <TableCell className="px-4 py-3 text-sm text-gray-600 dark:text-gray-300">
                    {item.stockDate || "—"}
                  </TableCell>
                  <TableCell className="px-4 py-3">
                    <DirectionBadge direction={item.stockInOut} />
                  </TableCell>
                  <TableCell className="px-4 py-3 text-sm font-semibold text-brand-600 dark:text-brand-400">
                    {item.stockQuantity || "—"}
                    {stockItemRecord.smUnit && (
                      <span className="ml-1 text-xs font-normal text-gray-400">
                        {stockItemRecord.smUnit}
                      </span>
                    )}
                  </TableCell>
                  <TableCell className="px-4 py-3">
                    <ReturnBadge value={item.stockReturnOrNonReturn} />
                  </TableCell>
                  <TableCell className="px-4 py-3 text-sm text-gray-600 dark:text-gray-300">
                    {item.stockParty || "—"}
                  </TableCell>
                  <TableCell className="px-4 py-3 text-sm text-gray-500 dark:text-gray-400">
                    {item.matPassId ? (
                      <span className="rounded bg-gray-100 px-1.5 py-0.5 font-mono text-xs dark:bg-gray-800">
                        #{item.matPassId}
                      </span>
                    ) : "—"}
                  </TableCell>
                  <TableCell className="max-w-[200px] truncate px-4 py-3 text-sm text-gray-600 dark:text-gray-300">
                    {item.stockDescription || "—"}
                  </TableCell>
                  <TableCell className="px-4 py-3" onClick={(e) => e.stopPropagation()}>
                    <div className="flex items-center gap-2">
                      {canEdit && (
                        <button
                          type="button"
                          onClick={() => openEditForm(item)}
                          disabled={isSubmitting}
                          className="inline-flex items-center justify-center rounded-md border border-brand-300 px-3 py-1.5 text-xs font-medium text-brand-600 hover:bg-brand-50 disabled:opacity-50 dark:border-brand-800 dark:text-brand-300 dark:hover:bg-brand-500/10"
                        >
                          Edit
                        </button>
                      )}
                      {canDelete && (
                        <button
                          type="button"
                          onClick={() => void handleDelete(item.id!)}
                          disabled={isSubmitting}
                          className="inline-flex items-center justify-center rounded-md border border-error-300 px-3 py-1.5 text-xs font-medium text-error-600 hover:bg-error-50 disabled:opacity-50 dark:border-error-800 dark:text-error-400 dark:hover:bg-error-500/10"
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

            {/* Summary row */}
            {!isLoading && items.length > 0 && (
              <TableRow className="bg-gray-50 dark:bg-white/[0.03]">
                <TableCell
                  className="px-4 py-3 text-xs font-semibold uppercase tracking-wide text-gray-500 dark:text-gray-400"
                  colSpan={3}
                >
                  Total ({items.length} entr{items.length !== 1 ? "ies" : "y"})
                </TableCell>
                <TableCell className="px-4 py-3 text-sm font-bold text-brand-600 dark:text-brand-400" colSpan={6}>
                  IN: {totalInQty} · OUT: {totalOutQty} · Net Balance: {netBalance}{" "}
                  {stockItemRecord.smUnit}
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </div>

      {/* ── Summary Cards ────────────────────────────────────────────────────── */}
      {!isLoading && (
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
          {[
            {
              label: "Total IN",
              value: `${totalInQty} ${stockItemRecord.smUnit}`,
              color: "text-blue-600 dark:text-blue-400",
            },
            {
              label: "Total OUT",
              value: `${totalOutQty} ${stockItemRecord.smUnit}`,
              color: "text-orange-600 dark:text-orange-400",
            },
            {
              label: "Opening Balance",
              value: `${stockItemRecord.smOpeningBalance} ${stockItemRecord.smUnit}`,
              color: "text-gray-700 dark:text-gray-200",
            },
            {
              label: "Net Balance",
              value: `${netBalance} ${stockItemRecord.smUnit}`,
              color:
                netBalance < 0
                  ? "text-red-600 dark:text-red-400"
                  : "text-green-600 dark:text-green-400",
            },
          ].map((card) => (
            <div
              key={card.label}
              className="rounded-xl border border-gray-200 bg-white p-4 dark:border-gray-800 dark:bg-gray-900"
            >
              <p className="text-xs text-gray-500 dark:text-gray-400">{card.label}</p>
              <p className={`mt-1 text-xl font-bold ${card.color}`}>{card.value}</p>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}