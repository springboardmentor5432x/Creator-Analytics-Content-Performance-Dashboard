import { useEffect, useState, useCallback } from "react";
import { Loader2, AlertTriangle, Inbox, CheckCircle2, X } from "lucide-react";
import api, { parseError } from "../api/client";
import { PLATFORMS, PLATFORM_LABEL, RANGES } from "../utils/format";

// Fetch hook with loading + error state.
export function useApi(url, params, enabled = true) {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(enabled);
  const [error, setError] = useState(null);
  const key = JSON.stringify(params || {});
  const load = useCallback(() => {
    if (!enabled) return;
    setLoading(true); setError(null);
    return api.get(url, { params: JSON.parse(key) })
      .then((r) => setData(r.data))
      .catch((e) => setError(parseError(e).message))
      .finally(() => setLoading(false));
  }, [url, key, enabled]);
  useEffect(() => { load(); }, [load]);
  return { data, loading, error, reload: load };
}

export const Spinner = ({ label = "Loading…" }) => (
  <div role="status" className="flex items-center justify-center gap-2 py-16 text-ink-500">
    <Loader2 className="h-5 w-5 animate-spin" /> <span className="text-sm">{label}</span>
  </div>
);

export const ErrorState = ({ message, onRetry }) => (
  <div role="alert" className="card flex flex-col items-center gap-3 py-10 text-center">
    <AlertTriangle className="h-8 w-8 text-coral" />
    <p className="font-semibold">We couldn’t load this data</p>
    <p className="max-w-md text-sm text-ink-500">{message}</p>
    {onRetry && <button className="btn-ghost" onClick={onRetry}>Try again</button>}
  </div>
);

export const EmptyState = ({ title, text, action }) => (
  <div className="card flex flex-col items-center gap-3 py-12 text-center">
    <Inbox className="h-9 w-9 text-ink-300" />
    <p className="font-display text-lg font-bold">{title}</p>
    <p className="max-w-md text-sm text-ink-500">{text}</p>
    {action}
  </div>
);

export const DemoBadge = ({ className = "" }) => (
  <span className={`inline-flex items-center rounded-md bg-signal-soft px-2 py-0.5 text-xs font-bold text-signal-dark ${className}`}>DEMO DATA</span>
);

export const DemoBanner = () => (
  <div className="flex items-start gap-2 rounded-lg border border-signal/40 bg-signal-soft px-4 py-2.5 text-sm text-signal-dark">
    <DemoBadge className="bg-white" />
    <span>The numbers on this page include generated sample data, not real platform analytics.</span>
  </div>
);

export function PageHeader({ title, subtitle, children }) {
  return (
    <div className="mb-6 flex flex-wrap items-end justify-between gap-3">
      <div>
        <h1 className="font-display text-2xl font-extrabold tracking-tight sm:text-3xl">{title}</h1>
        {subtitle && <p className="mt-1 text-sm text-ink-500">{subtitle}</p>}
      </div>
      <div className="flex flex-wrap items-center gap-2">{children}</div>
    </div>
  );
}

export const StatCard = ({ label, value, icon: Icon, hint }) => (
  <div className="card">
    <div className="flex items-center justify-between text-ink-500">
      <span className="text-sm font-medium">{label}</span>
      {Icon && <Icon className="h-4 w-4" />}
    </div>
    <p className="mt-2 font-display text-2xl font-extrabold tabular-nums sm:text-3xl">{value}</p>
    {hint && <p className="mt-1 text-xs text-ink-500">{hint}</p>}
  </div>
);

export function Alert({ kind = "error", children, onClose }) {
  const ok = kind === "success";
  return (
    <div role={ok ? "status" : "alert"} className={`flex items-start gap-2 rounded-lg border px-3 py-2 text-sm ${ok ? "border-moss/30 bg-moss/10 text-moss" : "border-coral/30 bg-coral/10 text-coral"}`}>
      {ok ? <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0" /> : <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" />}
      <span className="flex-1">{children}</span>
      {onClose && <button onClick={onClose} aria-label="Dismiss"><X className="h-4 w-4" /></button>}
    </div>
  );
}

export const Field = ({ label, error, children, htmlFor }) => (
  <div>
    <label htmlFor={htmlFor} className="label">{label}</label>
    {children}
    {error && <p className="mt-1 text-xs text-coral">{error}</p>}
  </div>
);

// Date range + optional platform filter.
export function Filters({ days, setDays, custom, setCustom, platform, setPlatform, showPlatform = false }) {
  return (
    <div className="flex flex-wrap items-center gap-2">
      <select aria-label="Date range" className="input w-auto" value={days} onChange={(e) => setDays(e.target.value === "custom" ? "custom" : Number(e.target.value))}>
        {RANGES.map((r) => <option key={r.days} value={r.days}>{r.label}</option>)}
        <option value="custom">Custom range</option>
      </select>
      {days === "custom" && (
        <>
          <input aria-label="Start date" type="date" className="input w-auto" value={custom.start} onChange={(e) => setCustom({ ...custom, start: e.target.value })} />
          <input aria-label="End date" type="date" className="input w-auto" value={custom.end} onChange={(e) => setCustom({ ...custom, end: e.target.value })} />
        </>
      )}
      {showPlatform && (
        <select aria-label="Platform" className="input w-auto" value={platform} onChange={(e) => setPlatform(e.target.value)}>
          <option value="">All platforms</option>
          {PLATFORMS.map((p) => <option key={p} value={p}>{PLATFORM_LABEL[p]}</option>)}
        </select>
      )}
    </div>
  );
}

export const ChartCard = ({ title, subtitle, children, height = 280 }) => (
  <div className="card">
    <h2 className="font-display text-base font-bold">{title}</h2>
    {subtitle && <p className="mb-3 text-xs text-ink-500">{subtitle}</p>}
    <div style={{ height }} className="mt-2">{children}</div>
  </div>
);

export function LoadDemoButton({ onDone, label = "Load demo data" }) {
  const [busy, setBusy] = useState(false);
  return (
    <button className="btn-primary" disabled={busy} onClick={async () => { setBusy(true); try { await api.post("/api/demo/load"); onDone?.(); } finally { setBusy(false); } }}>
      {busy && <Loader2 className="h-4 w-4 animate-spin" />} {label}
    </button>
  );
}
