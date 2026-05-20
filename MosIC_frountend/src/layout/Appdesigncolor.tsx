/**
 * AppDesignColor.tsx
 * ─────────────────────────────────────────────────────────────────────────────
 * Design-flavor picker for the Users page.
 *
 * HOW IT WORKS
 * ─────────────────────────────────────────────────────────────────────────────
 * • Stores the chosen flavor in localStorage under the key "appFlavor".
 * • Writes a `data-flavor` attribute on <html> every time the flavor changes.
 * • Exports `useAppFlavor()` – a hook any component can import to read the
 *   current flavor, and `AppDesignColor` – the visual picker panel itself.
 *
 * HOW TO WIRE IT UP IN UserProfiles.tsx
 * ─────────────────────────────────────────────────────────────────────────────
 * 1. Add a "Design" tab alongside your existing "Users" tab.
 * 2. Render <AppDesignColor /> when that tab is active.
 * 3. That's it — no other changes needed anywhere in the app.
 *
 * GLOBAL CSS  (add these four blocks once to your global CSS / index.css)
 * ─────────────────────────────────────────────────────────────────────────────
 * The four flavors are applied through CSS custom-property overrides scoped to
 * [data-flavor="glass|nature|machine|circuit"]. The tokens they override are:
 *
 *   --flavor-bg          background of the main content area / sidebar
 *   --flavor-accent      primary accent colour (buttons, active states, borders)
 *   --flavor-accent-soft very-low-opacity version of the accent (hover fills)
 *   --flavor-surface     card / panel background
 *   --flavor-border      card / panel border
 *   --flavor-text        primary text colour
 *   --flavor-text-muted  secondary / muted text colour
 *   --flavor-radius      border-radius for cards
 *   --flavor-font        body font-family string
 *   --flavor-font-head   heading / display font-family string
 *
 * ─────────────────────────────────────────────────────────────────────────────
 * NOTE: This file touches **zero** functional logic. It is purely cosmetic.
 * ─────────────────────────────────────────────────────────────────────────────
 */

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useState,
} from "react";

// ─── Types ────────────────────────────────────────────────────────────────────

export type Flavor = "standard" | "glass" | "nature" | "machine" | "circuit";

type FlavorMeta = {
  id: Flavor;
  label: string;
  tagline: string;
  /** Tailwind-safe preview gradient (rendered as inline style) */
  previewGrad: string;
  accentHex: string;
  surfaceHex: string;
  borderHex: string;
  textHex: string;
  mutedHex: string;
  radiusPx: number;
  font: string;
  fontHead: string;
  /** CSS vars injected on <html data-flavor="…"> */
  cssVars: Record<string, string>;
};

// ─── Flavor definitions ───────────────────────────────────────────────────────

const FLAVORS: FlavorMeta[] = [
  {
    id: "standard",
    label: "Standard",
    tagline: "Clean Tailwind default",
    previewGrad: "linear-gradient(135deg,#f9fafb 0%,#e5e7eb 100%)",
    accentHex: "#3b82f6",
    surfaceHex: "#ffffff",
    borderHex: "#e5e7eb",
    textHex: "#111827",
    mutedHex: "#6b7280",
    radiusPx: 12,
    font: "inherit",
    fontHead: "inherit",
    cssVars: {
      "--flavor-bg": "#f3f4f6",
      "--flavor-accent": "#3b82f6",
      "--flavor-accent-soft": "rgba(59,130,246,0.08)",
      "--flavor-surface": "#ffffff",
      "--flavor-border": "#e5e7eb",
      "--flavor-text": "#111827",
      "--flavor-text-muted": "#6b7280",
      "--flavor-radius": "12px",
      "--flavor-font": "inherit",
      "--flavor-font-head": "inherit",
    },
  },
  {
    id: "glass",
    label: "Glass",
    tagline: "Frosted depth · soft indigo",
    previewGrad: "linear-gradient(135deg,#1a1a2e 0%,#16213e 55%,#0f3460 100%)",
    accentHex: "#a5b4fc",
    surfaceHex: "rgba(255,255,255,0.07)",
    borderHex: "rgba(255,255,255,0.18)",
    textHex: "#e8f0fe",
    mutedHex: "rgba(232,240,254,0.55)",
    radiusPx: 16,
    font: "-apple-system, BlinkMacSystemFont, 'SF Pro Text', sans-serif",
    fontHead: "-apple-system, BlinkMacSystemFont, 'SF Pro Display', sans-serif",
    cssVars: {
      "--flavor-bg": "linear-gradient(135deg,#1a1a2e 0%,#16213e 55%,#0f3460 100%)",
      "--flavor-accent": "#a5b4fc",
      "--flavor-accent-soft": "rgba(165,180,252,0.14)",
      "--flavor-surface": "rgba(255,255,255,0.07)",
      "--flavor-border": "rgba(255,255,255,0.18)",
      "--flavor-text": "#e8f0fe",
      "--flavor-text-muted": "rgba(232,240,254,0.55)",
      "--flavor-radius": "16px",
      "--flavor-font": "-apple-system,BlinkMacSystemFont,'SF Pro Text',sans-serif",
      "--flavor-font-head": "-apple-system,BlinkMacSystemFont,'SF Pro Display',sans-serif",
    },
  },
  {
    id: "nature",
    label: "Nature",
    tagline: "Organic warmth · forest green",
    previewGrad: "linear-gradient(160deg,#1a2f1a 0%,#1e3a1e 45%,#243d24 100%)",
    accentHex: "#86c564",
    surfaceHex: "rgba(255,255,255,0.06)",
    borderHex: "rgba(134,197,100,0.22)",
    textHex: "#d4edcc",
    mutedHex: "rgba(212,237,204,0.6)",
    radiusPx: 20,
    font: "Georgia,'Times New Roman',serif",
    fontHead: "Georgia,'Times New Roman',serif",
    cssVars: {
      "--flavor-bg": "linear-gradient(160deg,#1a2f1a 0%,#1e3a1e 45%,#243d24 100%)",
      "--flavor-accent": "#86c564",
      "--flavor-accent-soft": "rgba(134,197,100,0.12)",
      "--flavor-surface": "rgba(255,255,255,0.06)",
      "--flavor-border": "rgba(134,197,100,0.22)",
      "--flavor-text": "#d4edcc",
      "--flavor-text-muted": "rgba(212,237,204,0.6)",
      "--flavor-radius": "20px",
      "--flavor-font": "Georgia,'Times New Roman',serif",
      "--flavor-font-head": "Georgia,'Times New Roman',serif",
    },
  },
  {
    id: "machine",
    label: "Machine",
    tagline: "Industrial precision · amber fire",
    previewGrad: "linear-gradient(180deg,#111111 0%,#1a1a1a 100%)",
    accentHex: "#ff8c00",
    surfaceHex: "rgba(255,255,255,0.03)",
    borderHex: "rgba(255,140,0,0.25)",
    textHex: "#e8e0d0",
    mutedHex: "rgba(232,224,208,0.5)",
    radiusPx: 4,
    font: "'Courier New',Courier,monospace",
    fontHead: "'Courier New',Courier,monospace",
    cssVars: {
      "--flavor-bg": "#111111",
      "--flavor-accent": "#ff8c00",
      "--flavor-accent-soft": "rgba(255,140,0,0.09)",
      "--flavor-surface": "rgba(255,255,255,0.03)",
      "--flavor-border": "rgba(255,140,0,0.25)",
      "--flavor-text": "#e8e0d0",
      "--flavor-text-muted": "rgba(232,224,208,0.5)",
      "--flavor-radius": "4px",
      "--flavor-font": "'Courier New',Courier,monospace",
      "--flavor-font-head": "'Courier New',Courier,monospace",
    },
  },
  {
    id: "circuit",
    label: "Circuit",
    tagline: "Terminal neon · cyber teal",
    previewGrad: "linear-gradient(135deg,#050d12 0%,#071a14 100%)",
    accentHex: "#00ffb4",
    surfaceHex: "rgba(0,255,180,0.04)",
    borderHex: "rgba(0,255,180,0.18)",
    textHex: "#ccfff2",
    mutedHex: "rgba(204,255,242,0.5)",
    radiusPx: 3,
    font: "'Courier New',Courier,monospace",
    fontHead: "'Courier New',Courier,monospace",
    cssVars: {
      "--flavor-bg": "#050d12",
      "--flavor-accent": "#00ffb4",
      "--flavor-accent-soft": "rgba(0,255,180,0.07)",
      "--flavor-surface": "rgba(0,255,180,0.04)",
      "--flavor-border": "rgba(0,255,180,0.18)",
      "--flavor-text": "#ccfff2",
      "--flavor-text-muted": "rgba(204,255,242,0.5)",
      "--flavor-radius": "3px",
      "--flavor-font": "'Courier New',Courier,monospace",
      "--flavor-font-head": "'Courier New',Courier,monospace",
    },
  },
];

// ─── Context ──────────────────────────────────────────────────────────────────

type FlavorCtx = { flavor: Flavor; setFlavor: (f: Flavor) => void };
const FlavorContext = createContext<FlavorCtx>({
  flavor: "standard",
  setFlavor: () => {},
});

/** Wrap your app (or just AppLayout) with this once to make flavor available everywhere. */
export const FlavorProvider: React.FC<{ children: React.ReactNode }> = ({
  children,
}) => {
  const [flavor, _setFlavor] = useState<Flavor>(() => {
    try {
      return (localStorage.getItem("appFlavor") as Flavor) ?? "standard";
    } catch {
      return "standard";
    }
  });

  const applyFlavor = useCallback((f: Flavor) => {
    const meta = FLAVORS.find((x) => x.id === f)!;
    const root = document.documentElement;
    // Remove all other flavor attributes
    root.removeAttribute("data-flavor");
    if (f !== "standard") root.setAttribute("data-flavor", f);
    // Inject CSS vars directly on :root so they work without global CSS
    Object.entries(meta.cssVars).forEach(([k, v]) =>
      root.style.setProperty(k, v)
    );
  }, []);

  const setFlavor = useCallback(
    (f: Flavor) => {
      _setFlavor(f);
      try {
        localStorage.setItem("appFlavor", f);
      } catch {}
      applyFlavor(f);
    },
    [applyFlavor]
  );

  // Apply on first mount (restore persisted choice)
  useEffect(() => {
    applyFlavor(flavor);
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  return (
    <FlavorContext.Provider value={{ flavor, setFlavor }}>
      {children}
    </FlavorContext.Provider>
  );
};

/** Hook — read and change the current design flavor from any component. */
export const useAppFlavor = () => useContext(FlavorContext);

// ─── Mini live-preview card ───────────────────────────────────────────────────

const PreviewCard: React.FC<{ meta: FlavorMeta }> = ({ meta }) => (
  <div
    style={{
      background: meta.previewGrad,
      borderRadius: meta.radiusPx,
      border: `1px solid ${meta.borderHex}`,
      padding: "14px",
      fontFamily: meta.font,
      color: meta.textHex,
      minHeight: 120,
      display: "flex",
      flexDirection: "column",
      gap: 8,
      position: "relative",
      overflow: "hidden",
    }}
  >
    {/* scanlines for circuit */}
    {meta.id === "circuit" && (
      <div
        style={{
          position: "absolute",
          inset: 0,
          backgroundImage:
            "repeating-linear-gradient(0deg,rgba(0,255,180,0.03) 0px,rgba(0,255,180,0.03) 1px,transparent 1px,transparent 4px)",
          pointerEvents: "none",
        }}
      />
    )}
    {/* accent bar for machine */}
    {meta.id === "machine" && (
      <div
        style={{
          position: "absolute",
          top: 0,
          left: 0,
          right: 0,
          height: 2,
          background: meta.accentHex,
          opacity: 0.5,
        }}
      />
    )}

    {/* tiny fake header */}
    <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
      <div
        style={{
          width: 20,
          height: 20,
          borderRadius: "50%",
          background: meta.accentHex,
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          fontSize: 9,
          fontWeight: 700,
          color: meta.id === "standard" ? "#fff" : "#050d12",
        }}
      >
        U
      </div>
      <div style={{ fontSize: 11, fontWeight: 600, color: meta.textHex }}>
        User Name
      </div>
      <div
        style={{
          marginLeft: "auto",
          fontSize: 9,
          padding: "2px 7px",
          borderRadius: 99,
          background: meta.accentHex + "22",
          color: meta.accentHex,
          border: `1px solid ${meta.accentHex}44`,
        }}
      >
        Admin
      </div>
    </div>

    {/* fake rows */}
    {[0.9, 0.6, 0.75].map((w, i) => (
      <div
        key={i}
        style={{
          height: 6,
          borderRadius: 4,
          background: meta.accentHex,
          opacity: 0.12 + i * 0.06,
          width: `${w * 100}%`,
        }}
      />
    ))}

    {/* fake button */}
    <div
      style={{
        alignSelf: "flex-start",
        marginTop: 4,
        fontSize: 9,
        padding: "3px 10px",
        borderRadius: meta.radiusPx,
        background: meta.accentHex,
        color: meta.id === "standard" ? "#fff" : "#050d12",
        fontWeight: 600,
      }}
    >
      + New
    </div>
  </div>
);

// ─── Flavor card ──────────────────────────────────────────────────────────────

const FlavorCard: React.FC<{
  meta: FlavorMeta;
  active: boolean;
  onSelect: () => void;
}> = ({ meta, active, onSelect }) => (
  <button
    onClick={onSelect}
    style={{ all: "unset", cursor: "pointer", display: "block", width: "100%" }}
    aria-pressed={active}
  >
    <div
      style={{
        borderRadius: 14,
        border: active
          ? `2px solid ${meta.accentHex}`
          : "1.5px solid transparent",
        boxShadow: active
          ? `0 0 0 3px ${meta.accentHex}33, 0 4px 20px rgba(0,0,0,0.1)`
          : "0 1px 4px rgba(0,0,0,0.06)",
        background: "#ffffff",
        overflow: "hidden",
        transition: "box-shadow 0.2s, border-color 0.2s",
        position: "relative",
      }}
      className="dark:bg-gray-900"
    >
      {/* Active tick */}
      {active && (
        <div
          style={{
            position: "absolute",
            top: 10,
            right: 10,
            zIndex: 10,
            width: 22,
            height: 22,
            borderRadius: "50%",
            background: meta.accentHex,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
          }}
        >
          <svg width="11" height="11" viewBox="0 0 11 11" fill="none">
            <path
              d="M2 5.5L4.5 8 9 3"
              stroke={meta.id === "standard" ? "#fff" : "#050d12"}
              strokeWidth="1.8"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          </svg>
        </div>
      )}

      {/* Preview */}
      <div style={{ padding: "12px 12px 0" }}>
        <PreviewCard meta={meta} />
      </div>

      {/* Label row */}
      <div style={{ padding: "10px 14px 12px" }}>
        <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
          {/* Color dot */}
          <span
            style={{
              width: 10,
              height: 10,
              borderRadius: "50%",
              background: meta.accentHex,
              flexShrink: 0,
            }}
          />
          <p
            className="text-sm font-semibold text-gray-900 dark:text-white"
            style={{ margin: 0 }}
          >
            {meta.label}
          </p>
        </div>
        <p
          className="text-xs text-gray-400 dark:text-gray-500"
          style={{ marginTop: 3, paddingLeft: 18 }}
        >
          {meta.tagline}
        </p>
      </div>
    </div>
  </button>
);

// ─── Token row (shows what the CSS var is set to) ─────────────────────────────

const TokenPill: React.FC<{ label: string; value: string; hex?: string }> = ({
  label,
  value,
  hex,
}) => (
  <div
    style={{
      display: "inline-flex",
      alignItems: "center",
      gap: 6,
      padding: "4px 10px",
      borderRadius: 99,
      background: "#f3f4f6",
      fontSize: 11,
    }}
    className="dark:bg-gray-800"
  >
    {hex && (
      <span
        style={{
          width: 10,
          height: 10,
          borderRadius: "50%",
          background: hex,
          border: "1px solid rgba(0,0,0,0.1)",
          flexShrink: 0,
        }}
      />
    )}
    <span className="text-gray-500 dark:text-gray-400">{label}:</span>
    <span
      className="text-gray-800 dark:text-gray-200"
      style={{ fontFamily: "monospace" }}
    >
      {value.length > 22 ? value.slice(0, 22) + "…" : value}
    </span>
  </div>
);

// ─── Main exported component ──────────────────────────────────────────────────

/**
 * <AppDesignColor />
 *
 * Drop this inside your Users page (or any page) to let the user pick a
 * visual theme. Persists the choice to localStorage and applies it globally
 * via CSS custom properties on <html>.
 *
 * Requires <FlavorProvider> somewhere above in the tree (e.g. wrap AppLayout).
 */
const AppDesignColor: React.FC = () => {
  const { flavor, setFlavor } = useAppFlavor();
  const activeMeta = FLAVORS.find((f) => f.id === flavor)!;

  return (
    <div className="flex flex-col gap-6">
      {/* Page header */}
      <div>
        <h2 className="text-xl font-semibold text-gray-900 dark:text-white">
          Design Style
        </h2>
        <p className="mt-0.5 text-sm text-gray-500 dark:text-gray-400">
          Choose a visual flavor for the entire app. Your preference is saved
          and restored automatically.
        </p>
      </div>

      {/* Flavor grid */}
      <div
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(auto-fill,minmax(200px,1fr))",
          gap: 16,
        }}
      >
        {FLAVORS.map((meta) => (
          <FlavorCard
            key={meta.id}
            meta={meta}
            active={flavor === meta.id}
            onSelect={() => setFlavor(meta.id)}
          />
        ))}
      </div>

      {/* Active flavor token summary */}
      <div className="rounded-2xl border border-gray-200 bg-white dark:border-gray-800 dark:bg-gray-900 p-5">
        <p className="text-xs uppercase tracking-wider text-gray-400 mb-3">
          Active tokens —{" "}
          <span style={{ color: activeMeta.accentHex, fontWeight: 600 }}>
            {activeMeta.label}
          </span>
        </p>
        <div style={{ display: "flex", flexWrap: "wrap", gap: 8 }}>
          <TokenPill
            label="accent"
            value={activeMeta.accentHex}
            hex={activeMeta.accentHex}
          />
          <TokenPill
            label="surface"
            value={activeMeta.surfaceHex}
            hex={activeMeta.accentHex + "33"}
          />
          <TokenPill
            label="border"
            value={activeMeta.borderHex}
            hex={activeMeta.borderHex}
          />
          <TokenPill
            label="text"
            value={activeMeta.textHex}
            hex={activeMeta.textHex}
          />
          <TokenPill label="radius" value={`${activeMeta.radiusPx}px`} />
          <TokenPill
            label="font"
            value={activeMeta.font.split(",")[0].replace(/'/g, "")}
          />
        </div>
      </div>

      {/* Usage hint */}
      <div className="rounded-xl border border-blue-100 bg-blue-50 dark:border-blue-500/20 dark:bg-blue-500/10 px-5 py-4 text-sm text-blue-700 dark:text-blue-300">
        <strong className="font-semibold">How to apply in your components:</strong>
        <br />
        Use{" "}
        <code className="rounded bg-blue-100 px-1.5 py-0.5 text-xs dark:bg-blue-500/20">
          var(--flavor-accent)
        </code>
        ,{" "}
        <code className="rounded bg-blue-100 px-1.5 py-0.5 text-xs dark:bg-blue-500/20">
          var(--flavor-surface)
        </code>
        ,{" "}
        <code className="rounded bg-blue-100 px-1.5 py-0.5 text-xs dark:bg-blue-500/20">
          var(--flavor-border)
        </code>{" "}
        etc. in any CSS or inline-style to automatically pick up the active
        flavor. Or call{" "}
        <code className="rounded bg-blue-100 px-1.5 py-0.5 text-xs dark:bg-blue-500/20">
          useAppFlavor()
        </code>{" "}
        to read the current flavor string in JS.
      </div>
    </div>
  );
};

export default AppDesignColor;