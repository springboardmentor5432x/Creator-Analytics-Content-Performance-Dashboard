import { useEffect, useState } from "react";
import { useAuth } from "../AuthContext.jsx";
import AppLayout from "../components/AppLayout.jsx";
import api, { errorMessage } from "../api";

const ROLES = [
  { value: "creator", label: "Creator" },
  { value: "agency", label: "Agency" },
  { value: "marketing_team", label: "Marketing Team" },
  { value: "admin", label: "Administrator" },
];

export default function AdminUsers() {
  const { user: me } = useAuth();
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [busyId, setBusyId] = useState(null);

  useEffect(() => {
    api.get("/api/admin/users")
      .then((r) => setUsers(r.data))
      .catch((e) => setError(errorMessage(e)))
      .finally(() => setLoading(false));
  }, []);

  async function update(id, changes) {
    setError("");
    setBusyId(id);
    try {
      const res = await api.patch(`/api/admin/users/${id}`, changes);
      setUsers((list) => list.map((u) => (u.user_id === id ? res.data : u)));
    } catch (e) {
      setError(errorMessage(e));
    } finally {
      setBusyId(null);
    }
  }

  return (
    <AppLayout>
      <div className="hello">
        <div>
          <h1>User Management</h1>
          <p className="muted">Assign roles and enable or disable accounts. Marketing Team and Administrator roles can only be given here.</p>
        </div>
      </div>

      {error && <div className="error" role="alert">{error}</div>}

      <article className="card">
        {loading ? (
          <p className="muted">Loading users...</p>
        ) : (
          <div className="table-wrap">
            <table className="users-table">
              <thead>
                <tr><th>Name</th><th>Email</th><th>Role</th><th>Status</th><th>Joined</th></tr>
              </thead>
              <tbody>
                {users.map((u) => {
                  const self = u.user_id === me.user_id;
                  return (
                    <tr key={u.user_id}>
                      <td><strong>{u.name}</strong>{self && <span className="you">You</span>}</td>
                      <td className="muted">{u.email}</td>
                      <td>
                        <select
                          className="sel"
                          value={u.role}
                          disabled={self || busyId === u.user_id}
                          aria-label={`Role for ${u.name}`}
                          onChange={(e) => update(u.user_id, { role: e.target.value })}
                        >
                          {ROLES.map((r) => <option key={r.value} value={r.value}>{r.label}</option>)}
                        </select>
                      </td>
                      <td>
                        <button
                          className={"status " + (u.is_active ? "on" : "off")}
                          disabled={self || busyId === u.user_id}
                          onClick={() => update(u.user_id, { is_active: !u.is_active })}
                          aria-label={`${u.is_active ? "Disable" : "Enable"} ${u.name}`}
                        >
                          {u.is_active ? "Active" : "Disabled"}
                        </button>
                      </td>
                      <td className="muted">{new Date(u.created_at).toLocaleDateString()}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </article>
    </AppLayout>
  );
}
