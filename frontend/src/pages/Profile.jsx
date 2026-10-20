import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { useAuth } from "../AuthContext.jsx";
import AppLayout from "../components/AppLayout.jsx";
import api, { errorMessage } from "../api";

const FORMS = {
  creator: {
    url: "/api/creators/me",
    title: "Creator Profile",
    intro: "This is how you appear to agencies and on your reports.",
    fields: [
      ["creator_name", "Display name", "text", "How should people see your name?"],
      ["bio", "Bio", "textarea", "Tell people what you create"],
      ["location", "Location", "text", "City, Country"],
      ["website", "Website", "url", "https://yourwebsite.com"],
      ["profile_image", "Profile image URL", "url", "https://..."],
    ],
    image: "profile_image",
    nameField: "creator_name",
  },
  agency: {
    url: "/api/agencies/me",
    title: "Agency Profile",
    intro: "Details of your agency shown to the creators you work with.",
    fields: [
      ["agency_name", "Agency name", "text", "Your agency's name"],
      ["description", "About", "textarea", "What does your agency do?"],
      ["location", "Location", "text", "City, Country"],
      ["website", "Website", "url", "https://youragency.com"],
      ["logo", "Logo URL", "url", "https://..."],
    ],
    image: "logo",
    nameField: "agency_name",
  },
};

export default function Profile() {
  const { user } = useAuth();
  const cfg = FORMS[user.role];
  const [data, setData] = useState(null);
  const [creators, setCreators] = useState([]);
  const [loading, setLoading] = useState(Boolean(cfg));
  const [error, setError] = useState("");
  const [saved, setSaved] = useState(false);
  const [busy, setBusy] = useState(false);
  const [imgBroken, setImgBroken] = useState(false);

  useEffect(() => {
    if (!cfg) return;
    api.get(cfg.url)
      .then((r) => setData(r.data))
      .catch((e) => setError(errorMessage(e)))
      .finally(() => setLoading(false));
    if (user.role === "agency") {
      api.get("/api/agencies/me/creators").then((r) => setCreators(r.data)).catch(() => {});
    }
  }, [cfg, user.role]);

  const set = (key) => (e) => { setSaved(false); setData({ ...data, [key]: e.target.value }); };

  async function onSubmit(e) {
    e.preventDefault();
    setError("");
    setSaved(false);
    setBusy(true);
    try {
      const body = Object.fromEntries(cfg.fields.map(([k]) => [k, data[k] ?? ""]));
      const res = await api.put(cfg.url, body);
      setData(res.data);
      setImgBroken(false);
      setSaved(true);
    } catch (err) {
      setError(errorMessage(err));
    } finally {
      setBusy(false);
    }
  }

  // Marketing Team and Administrator have no separate profile table.
  if (!cfg) {
    return (
      <AppLayout>
        <div className="hello"><div><h1>My Profile</h1></div></div>
        <article className="card form-card">
          <p><strong>{user.name}</strong> <span className="role-tag">{user.role_label}</span></p>
          <p className="muted">{user.email}</p>
          <p className="muted">Your role does not have a separate profile page. You can change your name and password in <Link to="/settings">Settings</Link>.</p>
        </article>
      </AppLayout>
    );
  }

  const initials = user.name.split(" ").map((s) => s[0]).slice(0, 2).join("").toUpperCase();
  const img = data?.[cfg.image];

  return (
    <AppLayout>
      <div className="hello">
        <div>
          <h1>{cfg.title}</h1>
          <p className="muted">{cfg.intro}</p>
        </div>
      </div>

      {loading && <p className="muted">Loading profile...</p>}
      {error && !data && <div className="error" role="alert">{error}</div>}

      {data && (
        <div className="profile-grid">
          <article className="card form-card">
            <form onSubmit={onSubmit} noValidate>
              {cfg.fields.map(([key, label, type, ph]) => (
                <label key={key}>
                  {label}
                  {type === "textarea"
                    ? <textarea rows={4} value={data[key] ?? ""} onChange={set(key)} placeholder={ph} maxLength={1000} />
                    : <input type={type === "url" ? "text" : type} inputMode={type === "url" ? "url" : undefined} value={data[key] ?? ""} onChange={set(key)} placeholder={ph} />}
                </label>
              ))}
              {error && <div className="error" role="alert">{error}</div>}
              {saved && <div className="success" role="status">Profile saved.</div>}
              <button className="btn" disabled={busy}>{busy ? "Saving..." : "Save changes"}</button>
            </form>
          </article>

          <div className="stack">
            <article className="card id-card">
              {img && !imgBroken
                ? <img src={img} alt="" className="id-img" onError={() => setImgBroken(true)} />
                : <span className="avatar xl">{initials}</span>}
              <strong>{data[cfg.nameField] || user.name}</strong>
              <span className="role-tag">{user.role_label}</span>
              <small className="muted">{user.email}</small>
            </article>

            {user.role === "agency" && (
              <article className="card">
                <div className="card-head"><h2>Creators you manage</h2></div>
                {creators.length === 0 ? (
                  <p className="muted">No creators linked yet.</p>
                ) : (
                  <ul className="clist">
                    {creators.map((c) => (
                      <li key={c.creator_id}>
                        <span className="avatar sm">{(c.creator_name || "C")[0].toUpperCase()}</span>
                        <span className="clist-name">
                          <strong>{c.creator_name || "Unnamed creator"}</strong>
                          <small>{c.location || "Location not set"}</small>
                        </span>
                      </li>
                    ))}
                  </ul>
                )}
              </article>
            )}
          </div>
        </div>
      )}
    </AppLayout>
  );
}
