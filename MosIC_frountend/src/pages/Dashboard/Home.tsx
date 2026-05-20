import PageMeta from "../../components/common/PageMeta";
import { useAuth } from "../../context/AuthContext";

// ─── Greeting ─────────────────────────────────────────────────────────────────

const getGreeting = () => {
  const hour = new Date().getHours();
  if (hour < 12) return "Good morning";
  if (hour < 17) return "Good afternoon";
  return "Good evening";
};

// ─── Module Card ──────────────────────────────────────────────────────────────

type ModuleCardProps = {
  label: string;
  description: string;
  href: string;
  icon: React.ReactNode;
  iconBg: string;
  status: "live" | "development";
};

function ModuleCard({ label, description, href, icon, iconBg, status }: ModuleCardProps) {
  const isLive = status === "live";

  return (
    <div
      onClick={() => isLive && (window.location.href = href)}
      className={`group relative flex flex-col gap-3 rounded-2xl border p-5 transition-all duration-200
        ${isLive
          ? "cursor-pointer border-gray-200 bg-white hover:border-brand-300 hover:shadow-md dark:border-gray-800 dark:bg-white/[0.03] dark:hover:border-brand-500/50"
          : "cursor-not-allowed border-gray-100 bg-gray-50/50 dark:border-gray-800/50 dark:bg-white/[0.01]"
        }`}
    >
      {/* Status badge */}
      {!isLive && (
        <span className="absolute right-3 top-3 inline-flex items-center gap-1 rounded-full bg-amber-50 px-2 py-0.5 text-[10px] font-medium text-amber-600 dark:bg-amber-500/10 dark:text-amber-400">
          <span className="size-1.5 rounded-full bg-amber-400" />
          Soon
        </span>
      )}

      {/* Icon */}
      <div className={`flex size-11 items-center justify-center rounded-xl ${iconBg} ${!isLive ? "opacity-50" : ""}`}>
        {icon}
      </div>

      {/* Text */}
      <div className={!isLive ? "opacity-50" : ""}>
        <p className="font-semibold text-gray-900 dark:text-white">{label}</p>
        <p className="mt-0.5 text-xs leading-relaxed text-gray-400 dark:text-gray-500">
          {description}
        </p>
      </div>

      {/* Arrow — only for live */}
      {isLive && (
        <div className="mt-auto pt-1">
          <span className="inline-flex items-center gap-1 text-xs font-medium text-brand-500 opacity-0 transition-opacity group-hover:opacity-100">
            Open
            <svg className="size-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}>
              <path d="M5 12h14M12 5l7 7-7 7" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
          </span>
        </div>
      )}
    </div>
  );
}

// ─── Modules config ───────────────────────────────────────────────────────────

const modules: ModuleCardProps[] = [
  {
    label: "File Index",
    description: "Browse, upload, and manage all office documents and files in one place.",
    href: "/file-index",
    status: "live",
    iconBg: "bg-blue-50 dark:bg-blue-500/10",
    icon: (
      <svg className="size-6 text-blue-500" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.8}>
        <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" strokeLinecap="round" strokeLinejoin="round" />
        <path d="M14 2v6h6M16 13H8M16 17H8M10 9H8" strokeLinecap="round" />
      </svg>
    ),
  },
  {
    label: "Sales",
    description: "Track sales orders, invoices, and revenue reports for your business.",
    href: "/sales",
    status: "live",
    iconBg: "bg-green-50 dark:bg-green-500/10",
    icon: (
      <svg className="size-6 text-green-500" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.8}>
        <path d="M12 2v20M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6" strokeLinecap="round" strokeLinejoin="round" />
      </svg>
    ),
  },
  {
    label: "Purchase",
    description: "Manage purchase orders, vendor invoices, and procurement records.",
    href: "/purchase",
    status: "live",
    iconBg: "bg-purple-50 dark:bg-purple-500/10",
    icon: (
      <svg className="size-6 text-purple-500" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.8}>
        <path d="M6 2 3 6v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2V6l-3-4z" strokeLinecap="round" strokeLinejoin="round" />
        <path d="M3 6h18M16 10a4 4 0 0 1-8 0" strokeLinecap="round" />
      </svg>
    ),
  },
  {
    label: "Stock",
    description: "Monitor inventory levels, stock movements, and warehouse records.",
    href: "/stocks/items",
    status: "live",
    iconBg: "bg-orange-50 dark:bg-orange-500/10",
    icon: (
      <svg className="size-6 text-orange-500" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.8}>
        <path d="M21 16V8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16z" strokeLinecap="round" strokeLinejoin="round" />
        <path d="M3.27 6.96 12 12.01l8.73-5.05M12 22.08V12" strokeLinecap="round" />
      </svg>
    ),
  },
  {
    label: "Matpass",
    description: "Handle material passbook entries, logs, and transaction history.",
    href: "/matpass",
    status: "live",
    iconBg: "bg-teal-50 dark:bg-teal-500/10",
    icon: (
      <svg className="size-6 text-teal-500" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.8}>
        <path d="M4 19.5A2.5 2.5 0 0 1 6.5 17H20" strokeLinecap="round" strokeLinejoin="round" />
        <path d="M6.5 2H20v20H6.5A2.5 2.5 0 0 1 4 19.5v-15A2.5 2.5 0 0 1 6.5 2z" strokeLinecap="round" />
      </svg>
    ),
  },
  {
    label: "HR",
    description: "Manage HR policies, attendance, leaves, and workforce records.",
    href: "/hr",
    status: "live",
    iconBg: "bg-pink-50 dark:bg-pink-500/10",
    icon: (
      <svg className="size-6 text-pink-500" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.8}>
        <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" strokeLinecap="round" strokeLinejoin="round" />
        <circle cx="9" cy="7" r="4" />
        <path d="M23 21v-2a4 4 0 0 0-3-3.87M16 3.13a4 4 0 0 1 0 7.75" strokeLinecap="round" />
      </svg>
    ),
  },
  {
    label: "Employee",
    description: "View and manage employee profiles, roles, and contact details.",
    href: "/employees",
    status: "live",
    iconBg: "bg-indigo-50 dark:bg-indigo-500/10",
    icon: (
      <svg className="size-6 text-indigo-500" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.8}>
        <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" strokeLinecap="round" strokeLinejoin="round" />
        <circle cx="12" cy="7" r="4" />
      </svg>
    ),
  },
  {
    label: "Customer",
    description: "Manage customer information, contacts, and interaction history.",
    href: "/customers",
    status: "live",
    iconBg: "bg-cyan-50 dark:bg-cyan-500/10",
    icon: (
      <svg className="size-6 text-cyan-500" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.8}>
        <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" strokeLinecap="round" strokeLinejoin="round" />
      </svg>
    ),
  },
];

// ─── Home ─────────────────────────────────────────────────────────────────────

export default function Home() {
  const { user } = useAuth();

  const today = new Date().toLocaleDateString("en-IN", {
    weekday: "long", year: "numeric", month: "long", day: "numeric",
  });

  const liveCount = modules.filter((m) => m.status === "live").length;
  const devCount  = modules.filter((m) => m.status === "development").length;

  return (
    <>
      <PageMeta title="Dashboard — MosIC" description="MosIC Office Dashboard" />

      <div className="flex flex-col gap-6">

        {/* ── Welcome Banner ───────────────────────────────────── */}
        <div className="rounded-2xl border border-gray-200 bg-white dark:border-gray-800 dark:bg-white/[0.03] overflow-hidden">
          <div className="h-1 w-full bg-gradient-to-r from-brand-400 via-brand-500 to-brand-600" />
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 p-6">
            <div className="flex items-center gap-4">
              <div className="flex size-14 shrink-0 items-center justify-center rounded-2xl bg-brand-500 text-lg font-bold text-white shadow-sm">
                {user?.username?.slice(0, 2).toUpperCase() ?? "U"}
              </div>
              <div>
                <p className="text-sm text-gray-400 dark:text-gray-500">{getGreeting()},</p>
                <h1 className="text-2xl font-bold text-gray-900 dark:text-white">
                  {user?.username ?? "User"}
                </h1>
                <p className="text-xs text-gray-400 mt-0.5">{user?.gmail}</p>
              </div>
            </div>
            <div className="flex flex-col items-start sm:items-end gap-2">
              <p className="text-xs text-gray-400">{today}</p>
              {/*
              <div className="flex items-center gap-2">
                <span className="inline-flex items-center gap-1 rounded-full bg-green-50 px-2.5 py-0.5 text-xs font-medium text-green-600 dark:bg-green-500/10 dark:text-green-400">
                  <span className="size-1.5 rounded-full bg-green-500" />
                  {liveCount} Live
                </span>
                <span className="inline-flex items-center gap-1 rounded-full bg-amber-50 px-2.5 py-0.5 text-xs font-medium text-amber-600 dark:bg-amber-500/10 dark:text-amber-400">
                  <span className="size-1.5 rounded-full bg-amber-400" />
                  {devCount} In Development
                </span>
              </div>
              */}
            </div>
          </div>
        </div>

        {/* ── Module Grid ─────────────────────────────────────── */}
        <div>
          <h2 className="mb-3 text-xs font-semibold uppercase tracking-wider text-gray-400">
            Modules
          </h2>
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
            {modules.map((mod) => (
              <ModuleCard key={mod.label} {...mod} />
            ))}
          </div>
        </div>

      </div>
    </>
  );
}