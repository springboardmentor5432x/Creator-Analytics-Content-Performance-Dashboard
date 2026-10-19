import { useState } from "react";
import api, { parseError } from "../api/client";
import { useAuth } from "../context/AuthContext";
import { useApi, Alert, PageHeader, Spinner, ErrorState, LoadDemoButton } from "../components/ui";
import { ROLE_LABEL, normalizeRole } from "../utils/format";

const SETTINGS_ROLES = [
  ["creator", "Creator"],
  ["agency", "Agency"],
  ["marketing", "Marketing Team"],
  ["admin", "Administrator"],
];

function AdminUsers() {
  const { user } = useAuth();
  const { data, loading, error, reload } = useApi("/api/admin/users");
  const [msg, setMsg] = useState("");
  const patch = async (id, body) => { setMsg(""); try { await api.patch(`/api/admin/users/${id}`, body); reload(); } catch (e) { setMsg(parseError(e).message); } };
  return (
    <div className="card">
      <h2 className="mb-1 font-display text-base font-bold">User management <span className="text-xs font-normal text-ink-500">(administrators only)</span></h2>
      {msg && <div className="my-3"><Alert onClose={() => setMsg("")}>{msg}</Alert></div>}
      {loading && !data ? <Spinner /> : error ? <ErrorState message={error} onRetry={reload} /> : (
        <div className="overflow-x-auto"><table className="mt-3 w-full min-w-[560px] text-sm"><thead><tr className="border-b border-ink-100 text-left text-ink-500"><th className="py-2 font-medium">Name</th><th className="font-medium">Email</th><th className="font-medium">Role</th><th className="font-medium">Active</th></tr></thead>
          <tbody>{(data || []).map((u) => <tr key={u.id} className="border-b border-ink-50"><td className="py-2">{u.full_name}</td><td>{u.email}</td>
            <td><select aria-label={`Role for ${u.email}`} className="input w-auto py-1" value={normalizeRole(u.role)} disabled={u.id === user.id} onChange={(e) => patch(u.id, { role: e.target.value })}>{SETTINGS_ROLES.map(([v, l]) => <option key={v} value={v}>{l}</option>)}</select></td>
            <td><input type="checkbox" aria-label={`Active: ${u.email}`} checked={u.is_active} disabled={u.id === user.id} onChange={(e) => patch(u.id, { is_active: e.target.checked })} /></td></tr>)}</tbody></table></div>
      )}
    </div>
  );
}

export default function Settings() {
  const { user } = useAuth();
  const [msg, setMsg] = useState("");
  return (
    <>
      <PageHeader title="Settings" subtitle="Data and account administration." />
      <div className="space-y-6">
        <div className="card">
          <h2 className="font-display text-base font-bold">Demo data</h2>
          <p className="mb-4 mt-1 text-sm text-ink-500">Generate or remove sample content, follower history and demographics for your account. Everything generated is flagged <b>DEMO DATA</b>. Records you create yourself are never removed.</p>
          {msg && <div className="mb-3"><Alert kind="success" onClose={() => setMsg("")}>{msg}</Alert></div>}
          <div className="flex flex-wrap gap-2">
            <LoadDemoButton label="Reset & reload demo data" onDone={() => setMsg("DEMO DATA loaded.")} />
            <button className="btn-danger" onClick={async () => { await api.delete("/api/demo"); setMsg("DEMO DATA removed."); }}>Remove demo data</button>
          </div>
        </div>
        <div className="card text-sm"><h2 className="mb-1 font-display text-base font-bold">Engagement rate formula</h2>
          <p className="font-mono text-ink-700">(Likes + Comments + Shares + Saves) ÷ Reach × 100</p><p className="mt-1 text-ink-500">When reach is 0, the rate is shown as 0%.</p></div>
        {normalizeRole(user?.role) === "admin" && <AdminUsers />}
        <p className="text-xs text-ink-500">API documentation: <a className="underline" href={`${import.meta.env.VITE_API_URL || "http://localhost:8000"}/docs`} target="_blank" rel="noreferrer">Swagger UI</a></p>
      </div>
    </>
  );
}
