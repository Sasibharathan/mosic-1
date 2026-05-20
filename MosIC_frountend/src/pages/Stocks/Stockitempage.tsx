import { type FormEvent, useCallback, useEffect, useState } from "react";
import PageMeta from "../../components/common/PageMeta";
import PageBreadcrumb from "../../components/common/PageBreadCrumb";
import ComponentCard from "../../components/common/ComponentCard";
import Label from "../../components/form/Label";
import Input from "../../components/form/input/InputField";
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
import StockitemStocksItems from "./Stockitemstocksitems";

// ─── Constants ────────────────────────────────────────────────────────────────

const STOCK_ITEMS_URL = "/api/stock-items";
const STOCKS_URL      = "/api/stocks";

const selectClass =
  "h-10 w-full rounded-lg border border-gray-300 bg-white px-3 text-sm text-gray-800 outline-none transition-colors focus:border-brand-500 focus:ring-2 focus:ring-brand-500/20 dark:border-gray-700 dark:bg-gray-900 dark:text-white";

// ─── Types ────────────────────────────────────────────────────────────────────

type StockItem = {
  id: number;
  productName: string;
  openingDate: string;
  smDescription: string;
  smUnit: string;
  smOpeningBalance: number;
  status: number;
};

type StockEntry = {
  stockItemId: number;
  stockInOut: string;
  stockQuantity: string;
};

type StocksMap = Record<number, { in: number; out: number }>;

type StockItemFormState = {
  productName: string;
  openingDate: string;
  smDescription: string;
  smUnit: string;
  smOpeningBalance: string;
  status: string;
};

const createEmptyForm = (): StockItemFormState => ({
  productName: "",
  openingDate: "",
  smDescription: "",
  smUnit: "",
  smOpeningBalance: "0",
  status: "1",
});

// ─── Helpers ──────────────────────────────────────────────────────────────────

function getAxiosErrorMessage(err: unknown): string {
  if (err && typeof err === "object") {
    const e = err as { response?: { data?: { message?: string } }; message?: string };
    return e.response?.data?.message ?? e.message ?? "Something went wrong";
  }
  return "Something went wrong";
}

// ─── Sub-components ───────────────────────────────────────────────────────────

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
      <span
        className={`size-1.5 rounded-full ${isActive ? "bg-green-500" : "bg-gray-400"}`}
      />
      {isActive ? "Active" : "Inactive"}
    </span>
  );
};

// ─── Main Page ────────────────────────────────────────────────────────────────

export default function StockItemPage() {
  const { canCreate, canEdit, canDelete } = usePermissions();

  const [items, setItems]                         = useState<StockItem[]>([]);
  const [stocksMap, setStocksMap]                 = useState<StocksMap>({});
  const [formState, setFormState]                 = useState<StockItemFormState>(createEmptyForm());
  const [editingId, setEditingId]                 = useState<number | null>(null);
  const [showForm, setShowForm]                   = useState(false);
  const [isLoading, setIsLoading]                 = useState(false);
  const [isSubmitting, setIsSubmitting]           = useState(false);
  const [errorMessage, setErrorMessage]           = useState("");
  const [successMessage, setSuccessMessage]       = useState("");
  const [formError, setFormError]                 = useState("");
  const [fieldErrors, setFieldErrors]             = useState<Partial<Record<keyof StockItemFormState, string>>>({});
  // ── Stocks ledger panel — opened when a row is clicked ───────────────────
  const [viewingStocksFor, setViewingStocksFor]   = useState<StockItem | null>(null);

  const isEditing = editingId !== null;
  const clearMessages = () => { setErrorMessage(""); setSuccessMessage(""); setFormError(""); setFieldErrors({}); };

  // ─── Closing balance helper ───────────────────────────────────────────────

  const getClosingBalance = (item: StockItem): number => {
    const entry = stocksMap[item.id];
    if (!entry) return item.smOpeningBalance;
    return item.smOpeningBalance + entry.in - entry.out;
  };

  // ─── Fetch ────────────────────────────────────────────────────────────────

  const fetchItems = useCallback(async () => {
    setIsLoading(true);
    setErrorMessage("");
    try {
      const [itemsRes, stocksRes] = await Promise.all([
        axiosInstance.get<StockItem[]>(STOCK_ITEMS_URL),
        axiosInstance.get<StockEntry[]>(STOCKS_URL),
      ]);

      setItems(Array.isArray(itemsRes.data) ? itemsRes.data : []);

      // Build map: stockItemId → { in, out }
      const map: StocksMap = {};
      for (const s of stocksRes.data ?? []) {
        if (!map[s.stockItemId]) map[s.stockItemId] = { in: 0, out: 0 };
        if (s.stockInOut?.toUpperCase() === "IN") {
          map[s.stockItemId].in += Number(s.stockQuantity || 0);
        } else {
          map[s.stockItemId].out += Number(s.stockQuantity || 0);
        }
      }
      setStocksMap(map);
    } catch (err) {
      setErrorMessage(getAxiosErrorMessage(err));
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    void fetchItems();
  }, [fetchItems]);

  // ─── Form helpers ─────────────────────────────────────────────────────────

  const setField = (field: keyof StockItemFormState, value: string) =>
    setFormState((prev) => ({ ...prev, [field]: value }));

  const openCreateForm = () => {
    setEditingId(null);
    setFormState(createEmptyForm());
    setShowForm(true);
    clearMessages();
  };

  const openEditForm = (item: StockItem) => {
    setEditingId(item.id);
    setFormState({
      productName:       item.productName,
      openingDate:       item.openingDate,
      smDescription:     item.smDescription,
      smUnit:            item.smUnit,
      smOpeningBalance:  String(item.smOpeningBalance),
      status:            String(item.status),
    });
    setShowForm(true);
    clearMessages();
  };

  const handleCancelForm = () => {
    setEditingId(null);
    setFormState(createEmptyForm());
    setShowForm(false);
  };

  // ─── CRUD handlers ────────────────────────────────────────────────────────

  const handleSubmit = async (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setFormError("");
    setFieldErrors({});
    setSuccessMessage("");

    // ✅ FULL FIELD VALIDATION
    const errs: Partial<Record<keyof StockItemFormState, string>> = {};
    if (!formState.productName.trim()) errs.productName = "Product name is required";
    if (!formState.openingDate.trim()) errs.openingDate = "Opening date is required";
    if (!formState.smUnit.trim())      errs.smUnit = "Unit is required";

    if (Object.keys(errs).length > 0) {
      setFieldErrors(errs);
      setFormError("Please fill in all required fields before submitting.");
      return;
    }

    setIsSubmitting(true);
    const payload = {
      productName:      formState.productName.trim(),
      openingDate:      formState.openingDate,
      smDescription:    formState.smDescription.trim(),
      smUnit:           formState.smUnit.trim(),
      smOpeningBalance: Number(formState.smOpeningBalance) || 0,
      status:           Number(formState.status),
    };

    try {
      if (isEditing && editingId !== null) {
        await axiosInstance.put(`${STOCK_ITEMS_URL}/${editingId}`, payload);
        setSuccessMessage("Stock item updated.");
      } else {
        await axiosInstance.post(STOCK_ITEMS_URL, payload);
        setSuccessMessage("Stock item created.");
      }
      handleCancelForm();
      await fetchItems();
    } catch (err) {
      setFormError(getAxiosErrorMessage(err));
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDelete = async (id: number) => {
    if (!window.confirm(`Delete stock item #${id}?`)) return;
    clearMessages();
    setIsSubmitting(true);
    try {
      await axiosInstance.delete(`${STOCK_ITEMS_URL}/${id}`);
      if (editingId === id) handleCancelForm();
      setSuccessMessage("Stock item deleted.");
      await fetchItems();
    } catch (err) {
      setErrorMessage(getAxiosErrorMessage(err));
    } finally {
      setIsSubmitting(false);
    }
  };

  // ─── Render ───────────────────────────────────────────────────────────────

  return (
    <>
      <PageMeta title="MosIC_frontend | Stock Items" description="Stock items CRUD table" />
      <PageBreadcrumb pageTitle="Stock Items" />

      {/*<ComponentCard title="Stock Items" desc={`API endpoint: ${STOCK_ITEMS_URL}`}>*/}
      <ComponentCard title="Stock Items" desc="Manage your stock items here. Click a row to view its stock in/out ledger.">
        {/* Toolbar */}
        <div className="flex flex-wrap items-center justify-between gap-2">
          <p className="text-xs text-gray-500 dark:text-gray-400">
            Click any row to view its stock in/out ledger
          </p>
          <div className="flex items-center gap-1.5">
            <button
              type="button"
              onClick={() => void fetchItems()}
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
                + Add Stock Item
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
            {isEditing ? "Edit Stock Item" : "Add Stock Item"}
          </h3>
          <p className="mt-0.5 text-xs text-gray-500 dark:text-gray-400">
            Enter values and submit to update the <code>stock_items</code> table.
          </p>

          {/* ── In-modal error toast ── */}
          {formError && (
            <div className="mt-4 flex items-start justify-between gap-2 rounded border border-red-200 bg-red-50 px-3 py-2 text-xs text-red-700 dark:border-red-500/20 dark:bg-red-500/10 dark:text-red-400">
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

          <form onSubmit={(e) => void handleSubmit(e)} className="mt-4">
            <div className="grid grid-cols-1 gap-3 md:grid-cols-2">

              {/* Product Name */}
              <div>
                <Label htmlFor="productName">
                  Product Name <span className="text-red-500">*</span>
                </Label>
                <Input
                  id="productName"
                  value={formState.productName}
                  onChange={(e) => {
                    setField("productName", e.target.value);
                    if (e.target.value.trim()) setFieldErrors((p) => ({ ...p, productName: undefined }));
                  }}
                  placeholder="e.g. Office Chair"
                  className={fieldErrors.productName ? "border-red-500 ring-2 ring-red-500/20" : ""}
                />
                {fieldErrors.productName && <p className="mt-1 text-xs text-red-500">{fieldErrors.productName}</p>}
              </div>

              {/* Opening Date */}
              <div>
                <Label htmlFor="openingDate">
                  Opening Date <span className="text-red-500">*</span>
                </Label>
                <DatePicker
                  value={formState.openingDate}
                  onChange={(val) => {
                    setField("openingDate", val);
                    if (val.trim()) setFieldErrors((p) => ({ ...p, openingDate: undefined }));
                  }}
                  className={fieldErrors.openingDate ? "border-red-500 ring-2 ring-red-500/20" : ""}
                />
                {fieldErrors.openingDate && <p className="mt-1 text-xs text-red-500">{fieldErrors.openingDate}</p>}
              </div>

              {/* Unit */}
              <div>
                <Label htmlFor="smUnit">
                  Unit <span className="text-red-500">*</span>
                </Label>
                <Input
                  id="smUnit"
                  value={formState.smUnit}
                  onChange={(e) => {
                    setField("smUnit", e.target.value);
                    if (e.target.value.trim()) setFieldErrors((p) => ({ ...p, smUnit: undefined }));
                  }}
                  placeholder="e.g. pcs, kg, box"
                  className={fieldErrors.smUnit ? "border-red-500 ring-2 ring-red-500/20" : ""}
                />
                {fieldErrors.smUnit && <p className="mt-1 text-xs text-red-500">{fieldErrors.smUnit}</p>}
              </div>

              {/* Opening Balance */}
              <div>
                <Label htmlFor="smOpeningBalance">Opening Balance</Label>
                <Input
                  id="smOpeningBalance"
                  type="number"
                  value={formState.smOpeningBalance}
                  onChange={(e) => setField("smOpeningBalance", e.target.value)}
                  placeholder="0"
                />
                <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">Defaults to 0 if left blank</p>
              </div>

              {/* Status */}
              <div>
                <Label htmlFor="status">
                  Status <span className="text-red-500">*</span>
                </Label>
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
                    <span className="inline-flex items-center gap-1 rounded-full bg-green-50 px-3 py-1 text-sm font-medium text-green-700 dark:bg-green-500/10 dark:text-green-400">
                      <span className="size-1.5 rounded-full bg-green-500" />
                      Active
                    </span>
                    <input type="hidden" name="status" value="1" />
                  </div>
                )}
              </div>

              {/* Description */}
              <div className="md:col-span-2">
                <Label htmlFor="smDescription">Description</Label>
                <TextArea
                  value={formState.smDescription}
                  onChange={(v) => setField("smDescription", v)}
                  placeholder="Enter item description"
                />
              </div>
            </div>

            <div className="mt-4 flex gap-2">
              <button
                type="submit"
                disabled={isSubmitting}
                className="inline-flex items-center justify-center rounded-md bg-brand-500 px-3 py-1.5 text-xs font-medium text-white hover:bg-brand-600 disabled:opacity-50"
              >
                {isSubmitting
                  ? "Saving..."
                  : isEditing
                  ? "Update Item"
                  : "Create Item"}
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

        {/* Stock Items Table */}
        <div className="overflow-x-auto rounded-lg border border-gray-200 dark:border-gray-800">
          <Table>
            <TableHeader className="bg-gray-50 dark:bg-white/[0.03]">
              <TableRow>
                {[
                  "ID",
                  "Product Name",
                  "Opening Date",
                  "Unit",
                  "Opening Balance",
                  "Closing Balance",
                  "Description",
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
                    colSpan={9}
                  >
                    <div className="flex items-center justify-center gap-2">
                      <svg className="h-4 w-4 animate-spin text-brand-500" fill="none" viewBox="0 0 24 24">
                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8H4z" />
                      </svg>
                      Loading stock items…
                    </div>
                  </TableCell>
                </TableRow>
              )}

              {!isLoading && items.length === 0 && (
                <TableRow>
                  <TableCell
                    className="px-3 py-5 text-center text-xs text-gray-500 dark:text-gray-400"
                    colSpan={9}
                  >
                    No stock items found.
                    {canCreate ? ' Click "+ Add Stock Item" to create your first record.' : ""}
                  </TableCell>
                </TableRow>
              )}

              {!isLoading &&
                items.map((item) => {
                  const closingBalance = getClosingBalance(item);
                  return (
                    <TableRow
                      key={item.id}
                      onClick={() => setViewingStocksFor(item)}
                      className="cursor-pointer transition-colors hover:bg-brand-50/60 dark:hover:bg-brand-500/5"
                      title={`Open stock ledger for ${item.productName}`}
                    >
                      <TableCell className="px-3 py-2 text-xs font-medium text-brand-600 dark:text-brand-400">
                        {item.id}
                      </TableCell>
                      <TableCell className="px-3 py-2 text-xs font-medium text-gray-800 dark:text-white">
                        {item.productName || "—"}
                      </TableCell>
                      <TableCell className="px-3 py-2 text-xs text-gray-600 dark:text-gray-300">
                        {item.openingDate || "—"}
                      </TableCell>
                      <TableCell className="px-3 py-2 text-xs text-gray-600 dark:text-gray-300">
                        {item.smUnit || "—"}
                      </TableCell>
                      <TableCell className="px-3 py-2 text-xs text-gray-600 dark:text-gray-300">
                        {item.smOpeningBalance ?? "—"}
                      </TableCell>
                      {/* ── Closing Balance ── */}
                      <TableCell className="px-3 py-2 text-sm font-semibold">
                        <span
                          className={
                            closingBalance < 0
                              ? "text-red-500 dark:text-red-400"
                              : "text-green-600 dark:text-green-400"
                          }
                        >
                          {closingBalance}
                          {item.smUnit && (
                            <span className="ml-1 text-xs font-normal text-gray-400">
                              {item.smUnit}
                            </span>
                          )}
                        </span>
                      </TableCell>
                      <TableCell className="max-w-[220px] truncate px-3 py-2 text-xs text-gray-600 dark:text-gray-300">
                        {item.smDescription || "—"}
                      </TableCell>
                      <TableCell className="px-3 py-2">
                        <StatusBadge status={item.status} />
                      </TableCell>
                      <TableCell
                        className="px-3 py-2 text-xs"
                        onClick={(e) => e.stopPropagation()}
                      >
                        <div className="flex items-center gap-1.5">
                          {canEdit && (
                            <button
                              type="button"
                              onClick={() => openEditForm(item)}
                              disabled={isSubmitting}
                              className="inline-flex items-center justify-center rounded-md border border-brand-300 px-2 py-1 text-xs font-medium text-brand-600 hover:bg-brand-50 disabled:opacity-50 dark:border-brand-800 dark:text-brand-300 dark:hover:bg-brand-500/10"
                            >
                              Edit
                            </button>
                          )}
                          {canDelete && (
                            <button
                              type="button"
                              onClick={() => void handleDelete(item.id)}
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
                  );
                })}
            </TableBody>
          </Table>
        </div>

        {!isLoading && items.length > 0 && (
          <p className="text-xs text-gray-400 dark:text-gray-500">
            {items.length} stock item{items.length !== 1 ? "s" : ""} total — click a row to view its stock in/out ledger
          </p>
        )}
      </ComponentCard>

      {/* ── Stock Ledger Modal ──────────────────────────────────────────────── */}
      <Modal
        isOpen={viewingStocksFor !== null}
        onClose={() => setViewingStocksFor(null)}
        className="mx-4 w-full max-w-6xl p-4 sm:p-6"
      >
        {viewingStocksFor && (
          <StockitemStocksItems
            stockItemRecord={{
              id:               viewingStocksFor.id,
              productName:      viewingStocksFor.productName,
              smUnit:           viewingStocksFor.smUnit,
              smOpeningBalance: viewingStocksFor.smOpeningBalance,
            }}
            onClose={() => setViewingStocksFor(null)}
          />
        )}
      </Modal>
    </>
  );
}