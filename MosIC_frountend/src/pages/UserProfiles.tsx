import { useEffect, useRef, useState } from "react";
import axiosInstance from "../utils/axiosInstance";
import { useAuth } from "../context/AuthContext";
// ✅ NEW [line 4]: import the design picker component and flavor hook
import AppDesignColor, { useAppFlavor } from "../layout/Appdesigncolor";

// ─── Types ────────────────────────────────────────────────────────────────────

type User = {
  id: number;
  username: string;
  gmail: string;
  contact: string;
  status: number;
  profile: string; // "user" | "superuser" | "admin"
};

type UserForm = {
  username: string;
  gmail: string;
  contact: string;
  password: string;
  status: number;
  profile: string;
};

type FormErrors = {
  username?: string;
  gmail?: string;
  contact?: string;
  password?: string;
};

const emptyForm: UserForm = {
  username: "",
  gmail: "",
  contact: "",
  password: "",
  status: 1,
  profile: "user",
};

// ─── Small reusable components ────────────────────────────────────────────────

const StatusBadge = ({ status }: { status: number }) =>
  status === 1 ? (
    <span className="inline-flex items-center gap-1.5 rounded-full bg-green-50 px-2.5 py-0.5 text-xs font-medium text-green-700 dark:bg-green-500/10 dark:text-green-400">
      <span className="size-1.5 rounded-full bg-green-500" />
      Active
    </span>
  ) : (
    <span className="inline-flex items-center gap-1.5 rounded-full bg-gray-100 px-2.5 py-0.5 text-xs font-medium text-gray-500 dark:bg-gray-700 dark:text-gray-400">
      <span className="size-1.5 rounded-full bg-gray-400" />
      Disabled
    </span>
  );

const ProfileBadge = ({ profile }: { profile: string }) => {
  const map: Record<string, { label: string; color: string }> = {
    admin:     { label: "Admin",     color: "bg-purple-50 text-purple-700 dark:bg-purple-500/10 dark:text-purple-400" },
    superuser: { label: "Superuser", color: "bg-amber-50 text-amber-700 dark:bg-amber-500/10 dark:text-amber-400" },
    user:      { label: "User",      color: "bg-blue-50 text-blue-600 dark:bg-blue-500/10 dark:text-blue-400" },
  };
  const cfg = map[profile] ?? map["user"];
  return (
    <span className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium ${cfg.color}`}>
      {cfg.label}
    </span>
  );
};

const Avatar = ({ name }: { name: string }) => (
  <span className="flex size-8 shrink-0 items-center justify-center rounded-full bg-brand-500 text-xs font-semibold text-white">
    {name?.slice(0, 2).toUpperCase() ?? "U"}
  </span>
);

// ─── Field component ──────────────────────────────────────────────────────────

const Field = ({
  label,
  required,
  children,
  error,
}: {
  label: string;
  required?: boolean;
  children: React.ReactNode;
  error?: string;
}) => (
  <div className="flex flex-col gap-1.5">
    <label className="text-sm font-medium text-gray-700 dark:text-gray-300">
      {label} {required && <span className="text-red-500">*</span>}
    </label>
    {children}
    {error && <p className="text-xs text-red-500">{error}</p>}
  </div>
);

const inputClass =
  "h-10 w-full rounded-lg border border-gray-200 bg-white px-3 text-sm text-gray-800 outline-none transition-colors focus:border-brand-500 focus:ring-2 focus:ring-brand-500/20 dark:border-gray-700 dark:bg-gray-800 dark:text-white dark:focus:border-brand-400";

// ─── Modal ────────────────────────────────────────────────────────────────────

type ModalProps = {
  isOpen: boolean;
  title: string;
  onClose: () => void;
  children: React.ReactNode;
};

const Modal = ({ isOpen, title, onClose, children }: ModalProps) => {
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleKey = (e: KeyboardEvent) => e.key === "Escape" && onClose();
    if (isOpen) document.addEventListener("keydown", handleKey);
    return () => document.removeEventListener("keydown", handleKey);
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[99999] flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-gray-900/60 backdrop-blur-sm" onClick={onClose} />
      <div
        ref={ref}
        className="relative w-full max-w-lg rounded-2xl bg-white shadow-2xl border border-gray-100 dark:bg-gray-900 dark:border-gray-800 overflow-hidden"
        style={{ animation: "modalIn 0.2s cubic-bezier(0.16,1,0.3,1) forwards" }}
      >
        <div className="h-1 w-full bg-gradient-to-r from-brand-400 via-brand-500 to-brand-600" />
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100 dark:border-gray-800">
          <h2 className="text-base font-semibold text-gray-900 dark:text-white">{title}</h2>
          <button
            onClick={onClose}
            className="flex size-8 items-center justify-center rounded-lg text-gray-400 hover:bg-gray-100 hover:text-gray-600 dark:hover:bg-gray-800 transition-colors"
          >
            <svg viewBox="0 0 24 24" fill="none" className="size-4" stroke="currentColor" strokeWidth={2}>
              <path d="M18 6 6 18M6 6l12 12" strokeLinecap="round" />
            </svg>
          </button>
        </div>
        <div className="px-6 py-5">{children}</div>
      </div>
      <style>{`@keyframes modalIn { from { opacity:0; transform:scale(.95) translateY(8px) } to { opacity:1; transform:scale(1) translateY(0) } }`}</style>
    </div>
  );
};

// ─── Delete Confirm Modal ─────────────────────────────────────────────────────

const DeleteModal = ({
  user,
  onConfirm,
  onCancel,
}: {
  user: User | null;
  onConfirm: () => void;
  onCancel: () => void;
}) => (
  <Modal isOpen={!!user} title="Delete User" onClose={onCancel}>
    <div className="flex flex-col items-center text-center gap-4">
      <div className="flex size-14 items-center justify-center rounded-full bg-red-50 dark:bg-red-500/10">
        <svg className="size-7 text-red-500" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}>
          <path d="M3 6h18M8 6V4h8v2M19 6l-1 14H6L5 6" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
      </div>
      <div>
        <p className="font-semibold text-gray-900 dark:text-white">Delete "{user?.username}"?</p>
        <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
          This will permanently remove{" "}
          <span className="font-medium text-gray-700 dark:text-gray-300">{user?.gmail}</span>.
          This action cannot be undone.
        </p>
      </div>
      <div className="flex w-full gap-3 mt-2">
        <button
          onClick={onCancel}
          className="flex-1 rounded-xl border border-gray-200 py-2.5 text-sm font-medium text-gray-700 hover:bg-gray-50 dark:border-gray-700 dark:text-gray-300 dark:hover:bg-gray-800 transition-colors"
        >
          Cancel
        </button>
        <button
          onClick={onConfirm}
          className="flex-1 rounded-xl bg-red-500 py-2.5 text-sm font-medium text-white hover:bg-red-600 transition-colors shadow-sm"
        >
          Yes, delete
        </button>
      </div>
    </div>
  </Modal>
);

// ─── User Form Modal ──────────────────────────────────────────────────────────

type UserFormModalProps = {
  isOpen: boolean;
  mode: "create" | "edit";
  initial: UserForm;
  onClose: () => void;
  onSubmit: (form: UserForm) => Promise<void>;
  currentUserProfile: string;
};

const UserFormModal = ({ isOpen, mode, initial, onClose, onSubmit, currentUserProfile }: UserFormModalProps) => {
  const [form, setForm] = useState<UserForm>(initial);
  const [errors, setErrors] = useState<FormErrors>({});
  const [loading, setLoading] = useState(false);
  const [apiError, setApiError] = useState("");
  const [showPassword, setShowPassword] = useState(false);

  useEffect(() => {
    setForm(initial);
    setErrors({});
    setApiError("");
    setShowPassword(false);
  }, [initial, isOpen]);

  const set = (key: keyof UserForm, val: string | number) =>
    setForm((prev) => ({ ...prev, [key]: val }));

  const validate = (): FormErrors => {
    const e: FormErrors = {};
    if (!form.username.trim()) e.username = "Username is required";
    if (!form.gmail.trim()) e.gmail = "Gmail is required";
    else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.gmail)) e.gmail = "Enter a valid email";
    if (form.contact.trim() && !/^\d{10}$/.test(form.contact.trim()))
      e.contact = "Enter a valid 10-digit phone number";
    if (mode === "create") {
      if (!form.password.trim()) e.password = "Password is required";
      else if (form.password.length < 6) e.password = "Min 6 characters";
    }
    return e;
  };

  const handleSubmit = async () => {
    setErrors({});
    setApiError("");
    const e = validate();
    if (Object.keys(e).length > 0) { setErrors(e); return; }
    setLoading(true);
    try {
      await onSubmit(form);
      onClose();
    } catch (err: any) {
      setApiError(err?.response?.data?.message ?? "Something went wrong. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <Modal isOpen={isOpen} title={mode === "create" ? "Register New User" : "Edit User"} onClose={onClose}>
      <div className="flex flex-col gap-4">
        {apiError && (
          <div className="rounded-lg bg-red-50 border border-red-200 px-4 py-3 text-sm text-red-600 dark:bg-red-500/10 dark:border-red-500/20 dark:text-red-400">
            {apiError}
          </div>
        )}

        <div className="grid grid-cols-2 gap-4">
          <Field label="Username" required error={errors.username}>
            <input
              className={`${inputClass} ${errors.username ? "border-red-400 focus:border-red-400 focus:ring-red-400/20" : ""}`}
              value={form.username}
              onChange={(e) => { set("username", e.target.value); if (errors.username) setErrors((p) => ({ ...p, username: undefined })); }}
              placeholder="Username"
            />
          </Field>

          <Field label="Gmail" required error={errors.gmail}>
            <input
              className={`${inputClass} ${errors.gmail ? "border-red-400 focus:border-red-400 focus:ring-red-400/20" : ""} ${mode === "edit" ? "opacity-60 cursor-not-allowed" : ""}`}
              value={form.gmail}
              onChange={(e) => { set("gmail", e.target.value); if (errors.gmail) setErrors((p) => ({ ...p, gmail: undefined })); }}
              placeholder="user@gmail.com"
              disabled={mode === "edit"}
            />
          </Field>
        </div>

        <div className="grid grid-cols-2 gap-4">
          <Field label="Contact" error={errors.contact}>
            <input
              className={inputClass}
              value={form.contact}
              onChange={(e) => set("contact", e.target.value)}
              placeholder="+91 9876543210"
            />
          </Field>

          <Field
            label={mode === "edit" ? "New Password (optional)" : "Password"}
            required={mode === "create"}
            error={errors.password}
          >
            <div className="relative">
              <input
                className={`${inputClass} pr-10 ${errors.password ? "border-red-400 focus:border-red-400 focus:ring-red-400/20" : ""}`}
                type={showPassword ? "text" : "password"}
                value={form.password}
                onChange={(e) => { set("password", e.target.value); if (errors.password) setErrors((p) => ({ ...p, password: undefined })); }}
                placeholder={mode === "edit" ? "Leave blank to keep" : "Min 6 characters"}
              />
              <button
                type="button"
                onClick={() => setShowPassword((p) => !p)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300"
              >
                {showPassword ? (
                  <svg className="size-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}>
                    <path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19m-6.72-1.07a3 3 0 1 1-4.24-4.24M1 1l22 22" strokeLinecap="round" />
                  </svg>
                ) : (
                  <svg className="size-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}>
                    <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z" />
                    <circle cx="12" cy="12" r="3" />
                  </svg>
                )}
              </button>
            </div>
          </Field>
        </div>

        <div className="grid grid-cols-2 gap-4">
          <Field label="Status">
            <select className={inputClass} value={form.status} onChange={(e) => set("status", Number(e.target.value))}>
              <option value={1}>Active</option>
              <option value={0}>Disabled</option>
            </select>
          </Field>

          {currentUserProfile === "admin" && (
            <Field label="Profile / Role">
              <select className={inputClass} value={form.profile} onChange={(e) => set("profile", e.target.value)}>
                <option value="user">User</option>
                <option value="superuser">Superuser</option>
                <option value="admin">Admin</option>
              </select>
            </Field>
          )}
        </div>

        <div className="flex gap-3 pt-2">
          <button
            onClick={onClose}
            className="flex-1 rounded-xl border border-gray-200 py-2.5 text-sm font-medium text-gray-700 hover:bg-gray-50 dark:border-gray-700 dark:text-gray-300 dark:hover:bg-gray-800 transition-colors"
          >
            Cancel
          </button>
          <button
            onClick={handleSubmit}
            disabled={loading}
            className="flex-1 rounded-xl bg-brand-500 py-2.5 text-sm font-medium text-white hover:bg-brand-600 disabled:opacity-60 transition-colors shadow-sm"
          >
            {loading ? (
              <span className="flex items-center justify-center gap-2">
                <svg className="size-4 animate-spin" viewBox="0 0 24 24" fill="none">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                </svg>
                {mode === "create" ? "Registering..." : "Saving..."}
              </span>
            ) : mode === "create" ? "Register User" : "Save Changes"}
          </button>
        </div>
      </div>
    </Modal>
  );
};

// ─── Main Page ────────────────────────────────────────────────────────────────

const UsersPage: React.FC = () => {
  const [users, setUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");

  // ✅ NEW [~line 320]: tab state — "users" shows the original list, "design" shows the picker
  const [activeTab, setActiveTab] = useState<"users" | "design">("users");

  const { user } = useAuth();
  const currentUserProfile = user?.profile ?? "user";

  const canRegister = currentUserProfile === "superuser" || currentUserProfile === "admin";
  const canEdit     = currentUserProfile === "superuser" || currentUserProfile === "admin";
  const canDelete   = currentUserProfile === "admin";

  // ✅ NEW [~line 327]: read current flavor so the active tab pill can show the flavor dot
  const { flavor } = useAppFlavor();

  // ── flavor dot color map (purely visual label for the Design tab) ──────────
  // ✅ NEW [~line 330]: map of flavor → accent hex so the Design tab button shows a live color dot
  const flavorDotMap: Record<string, string> = {
    standard: "#3b82f6",
    glass:    "#a5b4fc",
    nature:   "#86c564",
    machine:  "#ff8c00",
    circuit:  "#00ffb4",
  };

  const [formModal, setFormModal] = useState<{
    open: boolean;
    mode: "create" | "edit";
    initial: UserForm;
    editId: number | null;
  }>({
    open: false,
    mode: "create",
    initial: emptyForm,
    editId: null,
  });

  const [deleteTarget, setDeleteTarget] = useState<User | null>(null);
  const [toast, setToast] = useState<{ msg: string; type: "success" | "error" } | null>(null);

  // ── fetch ──────────────────────────────────────────────────────────────────

  const fetchUsers = async () => {
    setLoading(true);
    try {
      const res = await axiosInstance.get<User[]>("/api/auth/users");
      setUsers(res.data);
    } catch {
      showToast("Failed to load users", "error");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchUsers(); }, []);

  // ── toast ──────────────────────────────────────────────────────────────────

  const showToast = (msg: string, type: "success" | "error" = "success") => {
    setToast({ msg, type });
    setTimeout(() => setToast(null), 3000);
  };

  // ── CRUD handlers ──────────────────────────────────────────────────────────

  const handleCreate = async (form: UserForm) => {
    await axiosInstance.post("/api/auth/register", form);
    await fetchUsers();
    showToast("User registered successfully");
  };

  const handleEdit = async (form: UserForm) => {
    await axiosInstance.put(`/api/auth/users/${formModal.editId}`, form);
    await fetchUsers();
    showToast("User updated successfully");
  };

  const handleDelete = async () => {
    if (!deleteTarget) return;
    try {
      await axiosInstance.delete(`/api/auth/users/${deleteTarget.id}`);
      await fetchUsers();
      showToast("User deleted");
    } catch {
      showToast("Failed to delete user", "error");
    } finally {
      setDeleteTarget(null);
    }
  };

  const handleToggleStatus = async (user: User) => {
    if (!canEdit) return;
    const newStatus = user.status === 1 ? 0 : 1;
    try {
      await axiosInstance.put(`/api/auth/users/${user.id}/status`, { status: newStatus });
      setUsers((prev) => prev.map((u) => (u.id === user.id ? { ...u, status: newStatus } : u)));
      showToast(`User ${newStatus === 1 ? "enabled" : "disabled"}`);
    } catch {
      showToast("Failed to update status", "error");
    }
  };

  // ── open modals ────────────────────────────────────────────────────────────

  const openCreate = () =>
    setFormModal({ open: true, mode: "create", initial: emptyForm, editId: null });

  const openEdit = (user: User) =>
    setFormModal({
      open: true,
      mode: "edit",
      initial: {
        username: user.username,
        gmail: user.gmail,
        contact: user.contact ?? "",
        password: "",
        status: user.status,
        profile: user.profile ?? "user",
      },
      editId: user.id,
    });

  // ── filter ─────────────────────────────────────────────────────────────────

  const filtered = users.filter(
    (u) =>
      u.username.toLowerCase().includes(search.toLowerCase()) ||
      u.gmail.toLowerCase().includes(search.toLowerCase()) ||
      (u.contact ?? "").includes(search),
  );

  const activeCount = users.filter((u) => u.status === 1).length;

  // ── render ─────────────────────────────────────────────────────────────────

  return (
    <div className="flex flex-col gap-6">

      {/* ─────────────────────────────────────────────────────────────────────
          ✅ NEW [~line 460]: Page header — title + tab switcher live here now.
          The "Register User" button only appears on the "users" tab.
          ───────────────────────────────────────────────────────────────── */}
      <div className="flex flex-col gap-1 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <h1 className="text-2xl font-semibold text-gray-900 dark:text-white">User Management</h1>
          <p className="mt-0.5 text-sm text-gray-500 dark:text-gray-400">
            {users.length} total · {activeCount} active
          </p>
        </div>

        {/* ✅ NEW [~line 468]: Register button — only shown on the users tab */}
        {activeTab === "users" && canRegister && (
          <button
            onClick={openCreate}
            className="inline-flex items-center gap-2 rounded-xl bg-brand-500 px-4 py-2.5 text-sm font-medium text-white hover:bg-brand-600 transition-colors shadow-sm"
          >
            <svg className="size-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2.5}>
              <path d="M12 5v14M5 12h14" strokeLinecap="round" />
            </svg>
            Register User
          </button>
        )}
      </div>

      {/* ─────────────────────────────────────────────────────────────────────
          ✅ NEW [~line 480]: Tab bar — "User List" and "Design Style" tabs.
          The Design tab shows a small colored dot that reflects the active flavor.
          ───────────────────────────────────────────────────────────────── */}
      <div className="flex items-center gap-1 border-b border-gray-200 dark:border-gray-800">
        {/* Tab: User List */}
        <button
          onClick={() => setActiveTab("users")}
          className={`
            relative flex items-center gap-2 px-4 py-2.5 text-sm font-medium transition-colors
            ${activeTab === "users"
              ? "text-brand-600 dark:text-brand-400"
              : "text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200"
            }
          `}
        >
          {/* icon */}
          <svg className="size-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}>
            <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" />
            <circle cx="9" cy="7" r="4" />
            <path d="M23 21v-2a4 4 0 0 0-3-3.87M16 3.13a4 4 0 0 1 0 7.75" strokeLinecap="round" />
          </svg>
          User List
          {/* active underline */}
          {activeTab === "users" && (
            <span className="absolute bottom-0 left-0 right-0 h-0.5 rounded-full bg-brand-500" />
          )}
        </button>
{/*
        {/* Tab: Design Style
        <button
          onClick={() => setActiveTab("design")}
          className={`
            relative flex items-center gap-2 px-4 py-2.5 text-sm font-medium transition-colors
            ${activeTab === "design"
              ? "text-brand-600 dark:text-brand-400"
              : "text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200"
            }
          `}
        >

          <svg className="size-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}>
            <circle cx="12" cy="12" r="3" />
            <path d="M19.07 4.93a10 10 0 0 1 0 14.14M4.93 19.07a10 10 0 0 1 0-14.14" strokeLinecap="round" />
            <path d="M21 12a9 9 0 1 1-18 0 9 9 0 0 1 18 0" />
          </svg>
          Design Style
          {/* ✅ NEW: live flavor dot — shows the currently active accent color
          <span
            style={{ background: flavorDotMap[flavor] ?? "#3b82f6" }}
            className="size-2 rounded-full inline-block"
          />
          {/* active underline
          {activeTab === "design" && (
            <span className="absolute bottom-0 left-0 right-0 h-0.5 rounded-full bg-brand-500" />
          )}
        </button>
        */}
      </div>

      {/* ─────────────────────────────────────────────────────────────────────
          ✅ NEW [~line 530]: Conditional render based on active tab.
          "users" → original stats + table  (zero changes inside).
          "design" → <AppDesignColor /> picker panel.
          ───────────────────────────────────────────────────────────────── */}
      {activeTab === "design" ? (
        /* ── Design Style tab ─────────────────────────────────────────── */
        <AppDesignColor />
      ) : (
        /* ── User List tab (original content — nothing changed below) ─── */
        <>
          {/* Stats cards */}
          <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
            {[
              { label: "Total Users",  value: users.length,               color: "bg-blue-50 dark:bg-blue-500/10",   text: "text-blue-600 dark:text-blue-400"   },
              { label: "Active",       value: activeCount,                color: "bg-green-50 dark:bg-green-500/10", text: "text-green-600 dark:text-green-400" },
              { label: "Disabled",     value: users.length - activeCount, color: "bg-gray-50 dark:bg-gray-800",      text: "text-gray-600 dark:text-gray-400"   },
              { label: "Showing",      value: filtered.length,            color: "bg-brand-50 dark:bg-brand-500/10", text: "text-brand-600 dark:text-brand-400" },
            ].map((s) => (
              <div key={s.label} className={`rounded-2xl ${s.color} p-4`}>
                <p className={`text-2xl font-bold ${s.text}`}>{s.value}</p>
                <p className="mt-0.5 text-xs text-gray-500 dark:text-gray-400">{s.label}</p>
              </div>
            ))}
          </div>

          {/* Table card */}
          <div className="rounded-2xl border border-gray-200 bg-white dark:border-gray-800 dark:bg-gray-900 overflow-hidden">
            {/* Toolbar */}
            <div className="flex items-center gap-3 border-b border-gray-100 dark:border-gray-800 px-5 py-3">
              <div className="relative flex-1 max-w-xs">
                <svg className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-gray-400" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}>
                  <circle cx="11" cy="11" r="8" />
                  <path d="m21 21-4.35-4.35" strokeLinecap="round" />
                </svg>
                <input
                  className="h-9 w-full rounded-lg border border-gray-200 bg-gray-50 pl-9 pr-3 text-sm text-gray-700 outline-none focus:border-brand-500 focus:bg-white dark:border-gray-700 dark:bg-gray-800 dark:text-gray-200"
                  placeholder="Search users..."
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                />
              </div>
              <button
                onClick={fetchUsers}
                className="flex size-9 items-center justify-center rounded-lg border border-gray-200 text-gray-500 hover:bg-gray-50 dark:border-gray-700 dark:hover:bg-gray-800 transition-colors"
                title="Refresh"
              >
                <svg className="size-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}>
                  <path d="M1 4v6h6M23 20v-6h-6" strokeLinecap="round" strokeLinejoin="round" />
                  <path d="M20.49 9A9 9 0 0 0 5.64 5.64L1 10m22 4-4.64 4.36A9 9 0 0 1 3.51 15" strokeLinecap="round" strokeLinejoin="round" />
                </svg>
              </button>
            </div>

            {/* Table */}
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-gray-100 dark:border-gray-800 bg-gray-50 dark:bg-gray-800/50">
                    <th className="px-5 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-400">#</th>
                    <th className="px-5 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-400">User</th>
                    <th className="px-5 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-400 hidden md:table-cell">Contact</th>
                    <th className="px-5 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-400 hidden sm:table-cell">Role</th>
                    <th className="px-5 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-400">Status</th>
                    <th className="px-5 py-3 text-right text-xs font-medium uppercase tracking-wider text-gray-400">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100 dark:divide-gray-800">
                  {loading ? (
                    Array.from({ length: 4 }).map((_, i) => (
                      <tr key={i}>
                        {Array.from({ length: 6 }).map((_, j) => (
                          <td key={j} className="px-5 py-4">
                            <div className="h-4 rounded-md bg-gray-100 dark:bg-gray-800 animate-pulse" style={{ width: `${60 + Math.random() * 40}%` }} />
                          </td>
                        ))}
                      </tr>
                    ))
                  ) : filtered.length === 0 ? (
                    <tr>
                      <td colSpan={6} className="px-5 py-16 text-center">
                        <div className="flex flex-col items-center gap-2 text-gray-400">
                          <svg className="size-10 opacity-30" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.5}>
                            <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" />
                            <circle cx="9" cy="7" r="4" />
                            <path d="M23 21v-2a4 4 0 0 0-3-3.87M16 3.13a4 4 0 0 1 0 7.75" strokeLinecap="round" />
                          </svg>
                          <p className="text-sm font-medium">
                            {search ? "No users match your search" : "No users found"}
                          </p>
                          {!search && canRegister && (
                            <p className="text-xs">Click "Register User" to add the first user</p>
                          )}
                        </div>
                      </td>
                    </tr>
                  ) : (
                    filtered.map((user, idx) => (
                      <tr key={user.id} className="hover:bg-gray-50 dark:hover:bg-gray-800/40 transition-colors">
                        <td className="px-5 py-3.5 text-gray-400 text-xs">{idx + 1}</td>
                        <td className="px-5 py-3.5">
                          <div className="flex items-center gap-3">
                            <Avatar name={user.username} />
                            <div className="min-w-0">
                              <p className="font-medium text-gray-900 dark:text-white truncate">{user.username}</p>
                              <p className="text-xs text-gray-400 truncate">{user.gmail}</p>
                            </div>
                          </div>
                        </td>
                        <td className="px-5 py-3.5 text-gray-500 dark:text-gray-400 hidden md:table-cell">
                          {user.contact || <span className="text-gray-300 dark:text-gray-600">—</span>}
                        </td>
                        <td className="px-5 py-3.5 hidden sm:table-cell">
                          <ProfileBadge profile={user.profile ?? "user"} />
                        </td>
                        <td className="px-5 py-3.5">
                          <button
                            onClick={() => handleToggleStatus(user)}
                            title={canEdit ? "Click to toggle status" : "Read-only"}
                            disabled={!canEdit}
                            className={!canEdit ? "cursor-default" : ""}
                          >
                            <StatusBadge status={user.status} />
                          </button>
                        </td>
                        <td className="px-5 py-3.5">
                          <div className="flex items-center justify-end gap-1">
                            {canEdit && (
                              <button
                                onClick={() => openEdit(user)}
                                className="flex size-8 items-center justify-center rounded-lg text-gray-400 hover:bg-blue-50 hover:text-blue-500 dark:hover:bg-blue-500/10 dark:hover:text-blue-400 transition-colors"
                                title="Edit user"
                              >
                                <svg className="size-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}>
                                  <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7" strokeLinecap="round" />
                                  <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z" strokeLinecap="round" />
                                </svg>
                              </button>
                            )}
                            {canDelete && (
                              <button
                                onClick={() => setDeleteTarget(user)}
                                className="flex size-8 items-center justify-center rounded-lg text-gray-400 hover:bg-red-50 hover:text-red-500 dark:hover:bg-red-500/10 dark:hover:text-red-400 transition-colors"
                                title="Delete user"
                              >
                                <svg className="size-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}>
                                  <path d="M3 6h18M8 6V4h8v2M19 6l-1 14H6L5 6" strokeLinecap="round" strokeLinejoin="round" />
                                </svg>
                              </button>
                            )}
                            {!canEdit && !canDelete && (
                              <span className="text-xs text-gray-300 dark:text-gray-600 pr-2">—</span>
                            )}
                          </div>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>

            {/* Footer */}
            {!loading && filtered.length > 0 && (
              <div className="border-t border-gray-100 dark:border-gray-800 px-5 py-3 text-xs text-gray-400">
                Showing {filtered.length} of {users.length} users
              </div>
            )}
          </div>
        </>
      )}
      {/* ✅ NEW: end of tab conditional render ─────────────────────────── */}

      {/* Modals */}
      <UserFormModal
        isOpen={formModal.open}
        mode={formModal.mode}
        initial={formModal.initial}
        onClose={() => setFormModal((p) => ({ ...p, open: false }))}
        onSubmit={formModal.mode === "create" ? handleCreate : handleEdit}
        currentUserProfile={currentUserProfile}
      />

      <DeleteModal
        user={deleteTarget}
        onConfirm={handleDelete}
        onCancel={() => setDeleteTarget(null)}
      />

      {/* Toast */}
      {toast && (
        <div
          className={`fixed bottom-6 right-6 z-[99999] flex items-center gap-3 rounded-xl px-4 py-3 text-sm font-medium text-white shadow-lg
            ${toast.type === "success" ? "bg-green-500" : "bg-red-500"}`}
          style={{ animation: "toastIn 0.25s ease forwards" }}
        >
          {toast.type === "success" ? (
            <svg className="size-4 shrink-0" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2.5}>
              <path d="M20 6 9 17l-5-5" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
          ) : (
            <svg className="size-4 shrink-0" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2.5}>
              <circle cx="12" cy="12" r="10" />
              <path d="M12 8v4M12 16h.01" strokeLinecap="round" />
            </svg>
          )}
          {toast.msg}
        </div>
      )}

      <style>{`
        @keyframes toastIn { from { opacity:0; transform:translateY(8px) } to { opacity:1; transform:translateY(0) } }
      `}</style>
    </div>
  );
};

export default UsersPage;