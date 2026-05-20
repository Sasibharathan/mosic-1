import { useEffect, useRef, useState } from "react";

const MONTHS = [
  "January","February","March","April","May","June",
  "July","August","September","October","November","December",
];
const MONTHS_SHORT = ["Jan","Feb","Mar","Apr","May","Jun","Jul","Aug","Sep","Oct","Nov","Dec"];

type View = "day" | "month" | "year";

type DatePickerProps = {
  value: string;
  onChange: (val: string) => void;
  placeholder?: string;
  className?: string;
};

export default function DatePicker({
  value,
  onChange,
  placeholder = "DD-MM-YYYY",
  className = "",
}: DatePickerProps) {
  const today = new Date();
  const [open, setOpen]           = useState(false);
  const [view, setView]           = useState<View>("day");
  const [viewYear, setViewYear]   = useState(today.getFullYear());
  const [viewMonth, setViewMonth] = useState(today.getMonth());
  const [yearStart, setYearStart] = useState(() => Math.floor(today.getFullYear() / 12) * 12);
  const [inputText, setInputText] = useState(value || "");
  const [error, setError]         = useState("");
  const wrapperRef                = useRef<HTMLDivElement>(null);

  const pad = (n: number) => String(n).padStart(2, "0");

  const parsed   = value?.match(/^(\d{2})-(\d{2})-(\d{4})$/);
  const selDay   = parsed ? parseInt(parsed[1]) : null;
  const selMonth = parsed ? parseInt(parsed[2]) - 1 : null;
  const selYear  = parsed ? parseInt(parsed[3]) : null;

  // Sync inputText when value changes externally
  useEffect(() => { setInputText(value || ""); }, [value]);

  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (wrapperRef.current && !wrapperRef.current.contains(e.target as Node)) {
        setOpen(false);
        setView("day");
      }
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, []);

  // Auto-insert dashes while typing: "01" → "01-", "0112" → "01-12-"
  const handleTextChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const raw = e.target.value.replace(/\D/g, "");
    let formatted = "";
    if (raw.length > 4)      formatted = raw.slice(0, 2) + "-" + raw.slice(2, 4) + "-" + raw.slice(4, 8);
    else if (raw.length > 2) formatted = raw.slice(0, 2) + "-" + raw.slice(2);
    else                     formatted = raw;

    setInputText(formatted);
    setError("");

    const match = formatted.match(/^(\d{2})-(\d{2})-(\d{4})$/);
    if (match) {
      const d = parseInt(match[1]), m = parseInt(match[2]) - 1, y = parseInt(match[3]);
      const date = new Date(y, m, d);
      if (date.getFullYear() === y && date.getMonth() === m && date.getDate() === d) {
        setViewYear(y);
        setViewMonth(m);
        onChange(formatted);
      } else {
        setError("Invalid date");
      }
    } else if (formatted.length === 10) {
      setError("Invalid date");
    }
  };

  const selectDate = (day: number) => {
    const v = `${pad(day)}-${pad(viewMonth + 1)}-${viewYear}`;
    onChange(v);
    setInputText(v);
    setError("");
    setOpen(false);
    setView("day");
  };

  const selectToday = () => {
    const v = `${pad(today.getDate())}-${pad(today.getMonth() + 1)}-${today.getFullYear()}`;
    onChange(v);
    setInputText(v);
    setError("");
    setViewYear(today.getFullYear());
    setViewMonth(today.getMonth());
    setOpen(false);
    setView("day");
  };

  const firstDay    = new Date(viewYear, viewMonth, 1).getDay();
  const daysInMonth = new Date(viewYear, viewMonth + 1, 0).getDate();

  const prevMonth = () => {
    if (viewMonth === 0) { setViewMonth(11); setViewYear((y) => y - 1); }
    else setViewMonth((m) => m - 1);
  };
  const nextMonth = () => {
    if (viewMonth === 11) { setViewMonth(0); setViewYear((y) => y + 1); }
    else setViewMonth((m) => m + 1);
  };

  const handleHeaderClick = () => {
    if (view === "day")   { setView("month"); return; }
    if (view === "month") { setYearStart(Math.floor(viewYear / 12) * 12); setView("year"); return; }
    setView("day");
  };

  const headerLabel =
    view === "day"   ? `${MONTHS[viewMonth]} ${viewYear}` :
    view === "month" ? `${viewYear}` :
    `${yearStart} – ${yearStart + 11}`;

  return (
    <div ref={wrapperRef} className={`relative ${className}`}>

      {/* ── Input row ─────────────────────────────────────────────────────── */}
      <div className="flex h-10 w-full items-center rounded-lg border border-gray-300 bg-white focus-within:ring-2 focus-within:ring-brand-400 dark:border-gray-700 dark:bg-gray-900">
        <input
          type="text"
          value={inputText}
          onChange={handleTextChange}
          onFocus={() => setOpen(true)}
          placeholder={placeholder}
          maxLength={10}
          className="flex-1 bg-transparent px-3 text-sm text-gray-800 outline-none placeholder:text-gray-400 dark:text-white"
        />
        <button
          type="button"
          onClick={() => { setOpen((p) => !p); setView("day"); }}
          className="flex h-10 w-9 items-center justify-center border-l border-gray-200 text-gray-400 hover:bg-gray-50 dark:border-gray-700 dark:hover:bg-gray-800"
        >
          <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <rect x="3" y="4" width="18" height="18" rx="2" />
            <line x1="16" y1="2" x2="16" y2="6" />
            <line x1="8"  y1="2" x2="8"  y2="6" />
            <line x1="3"  y1="10" x2="21" y2="10" />
          </svg>
        </button>
      </div>

      {/* ── Validation error ──────────────────────────────────────────────── */}
      {error && <p className="mt-1 text-xs text-red-500">{error}</p>}

      {/* ── Calendar panel ────────────────────────────────────────────────── */}
      {open && (
        <div className="absolute z-50 mt-1 w-72 rounded-xl border border-gray-200 bg-white p-3 shadow-lg dark:border-gray-700 dark:bg-gray-900">

          <div className="mb-2 flex items-center justify-between">
            <button
              type="button"
              onClick={() => {
                if (view === "day")   prevMonth();
                if (view === "month") setViewYear((y) => y - 1);
                if (view === "year")  setYearStart((s) => s - 12);
              }}
              className="rounded-md px-2 py-1 text-gray-500 hover:bg-gray-100 dark:hover:bg-gray-800"
            >‹</button>

            <button
              type="button"
              onClick={handleHeaderClick}
              className="rounded-md px-3 py-1 text-sm font-semibold text-gray-800 hover:bg-gray-100 dark:text-white dark:hover:bg-gray-800"
            >
              {headerLabel}
              <span className="ml-1 text-xs text-brand-500">▾</span>
            </button>

            <button
              type="button"
              onClick={() => {
                if (view === "day")   nextMonth();
                if (view === "month") setViewYear((y) => y + 1);
                if (view === "year")  setYearStart((s) => s + 12);
              }}
              className="rounded-md px-2 py-1 text-gray-500 hover:bg-gray-100 dark:hover:bg-gray-800"
            >›</button>
          </div>

          {view === "year" && (
            <div className="grid grid-cols-4 gap-1">
              {Array.from({ length: 12 }).map((_, i) => {
                const yr = yearStart + i;
                return (
                  <button key={yr} type="button"
                    onClick={() => { setViewYear(yr); setView("month"); }}
                    className={`rounded-lg py-2 text-xs font-medium transition-colors
                      ${yr === selYear ? "bg-brand-500 text-white"
                        : yr === today.getFullYear() ? "border border-brand-400 text-brand-600 dark:text-brand-400"
                        : "text-gray-700 hover:bg-gray-100 dark:text-gray-300 dark:hover:bg-gray-800"}`}
                  >{yr}</button>
                );
              })}
            </div>
          )}

          {view === "month" && (
            <div className="grid grid-cols-3 gap-1">
              {MONTHS_SHORT.map((m, idx) => (
                <button key={m} type="button"
                  onClick={() => { setViewMonth(idx); setView("day"); }}
                  className={`rounded-lg py-2 text-xs font-medium transition-colors
                    ${idx === selMonth && viewYear === selYear ? "bg-brand-500 text-white"
                      : idx === today.getMonth() && viewYear === today.getFullYear() ? "border border-brand-400 text-brand-600 dark:text-brand-400"
                      : "text-gray-700 hover:bg-gray-100 dark:text-gray-300 dark:hover:bg-gray-800"}`}
                >{m}</button>
              ))}
            </div>
          )}

          {view === "day" && (
            <>
              <div className="mb-1 grid grid-cols-7 text-center">
                {["Su","Mo","Tu","We","Th","Fr","Sa"].map((d) => (
                  <span key={d} className="py-1 text-xs text-gray-400">{d}</span>
                ))}
              </div>
              <div className="grid grid-cols-7 gap-0.5">
                {Array.from({ length: firstDay }).map((_, i) => <div key={`e-${i}`} />)}
                {Array.from({ length: daysInMonth }).map((_, i) => {
                  const day = i + 1;
                  const isSelected = day === selDay && viewMonth === selMonth && viewYear === selYear;
                  const isToday = day === today.getDate() && viewMonth === today.getMonth() && viewYear === today.getFullYear();
                  return (
                    <button key={day} type="button" onClick={() => selectDate(day)}
                      className={`aspect-square w-full rounded-md text-xs font-medium transition-colors
                        ${isSelected ? "bg-brand-500 text-white"
                          : isToday ? "border border-brand-400 text-brand-600 dark:text-brand-400"
                          : "text-gray-700 hover:bg-gray-100 dark:text-gray-300 dark:hover:bg-gray-800"}`}
                    >{day}</button>
                  );
                })}
              </div>
            </>
          )}

          {view === "day" && (
            <div className="mt-2 border-t border-gray-100 pt-2 dark:border-gray-800">
              <button type="button" onClick={selectToday}
                className="w-full rounded-md py-1 text-xs font-medium text-brand-600 hover:bg-brand-50 dark:text-brand-400 dark:hover:bg-brand-500/10"
              >Today</button>
            </div>
          )}

        </div>
      )}
    </div>
  );
}