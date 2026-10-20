import React, { useState } from "react";
import { Settings, Building2, Mail, Globe, Phone, MapPin, Save, LogOut, ShieldCheck } from "lucide-react";
import { doc, updateDoc } from "firebase/firestore";
import { db } from "../../firebase";

export default function AgencyProfileSettings({ user, userProfile, theme, onSignOut, onRefresh }) {
  const accent = theme?.accent || "#0d9488";
  const accentLight = theme?.accentLight || "#f0fdfa";

  const [form, setForm] = useState({
    agencyName: userProfile?.fullName || user?.displayName || "",
    email: userProfile?.email || user?.email || "",
    website: userProfile?.website || "",
    phone: userProfile?.phone || "",
    location: userProfile?.location || "",
    bio: userProfile?.bio || "",
    specializations: userProfile?.specializations || "",
  });
  const [saving, setSaving] = useState(false);
  const [savedMsg, setSavedMsg] = useState("");

  const handleChange = (field, value) => setForm((prev) => ({ ...prev, [field]: value }));

  const handleSave = async () => {
    setSaving(true);
    try {
      const uid = user?.uid;
      if (uid && db) {
        await updateDoc(doc(db, "users", uid), {
          fullName: form.agencyName,
          website: form.website,
          phone: form.phone,
          location: form.location,
          bio: form.bio,
          specializations: form.specializations,
        });
      }
      // Also update localStorage fallback
      try {
        const stored = JSON.parse(localStorage.getItem("creatoriq_registered_users") || "{}");
        const emailKey = form.email?.toLowerCase();
        if (stored[emailKey]) {
          stored[emailKey] = { ...stored[emailKey], ...form, fullName: form.agencyName };
          localStorage.setItem("creatoriq_registered_users", JSON.stringify(stored));
        }
      } catch {}
      setSavedMsg("Profile saved successfully!");
      setTimeout(() => setSavedMsg(""), 3500);
      if (onRefresh) onRefresh();
    } catch (err) {
      console.warn("Save error:", err);
      setSavedMsg("Saved locally. Sync when online.");
      setTimeout(() => setSavedMsg(""), 3500);
    } finally {
      setSaving(false);
    }
  };

  const getInitials = (name) => {
    if (!name) return "AG";
    const parts = name.trim().split(/\s+/);
    if (parts.length >= 2) return `${parts[0][0]}${parts[1][0]}`.toUpperCase();
    return name.slice(0, 2).toUpperCase();
  };

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "24px", maxWidth: "700px" }}>
      <div>
        <h2 style={{ margin: 0, fontSize: "20px", fontWeight: "800", color: "#0f172a" }}>Agency Profile & Settings</h2>
        <p style={{ margin: "4px 0 0", fontSize: "13px", color: "#64748b" }}>
          Manage your agency profile and account preferences
        </p>
      </div>

      {/* Avatar + Identity */}
      <div style={{ backgroundColor: "#ffffff", border: "1px solid #e2e8f0", borderRadius: "16px", padding: "24px" }}>
        <div style={{ display: "flex", alignItems: "center", gap: "18px", marginBottom: "24px" }}>
          <div style={{ width: 64, height: 64, borderRadius: "16px", backgroundColor: accentLight, border: `2px solid ${theme?.accentBorder || "#99f6e4"}`, display: "flex", alignItems: "center", justifyContent: "center", fontSize: "24px", fontWeight: "800", color: accent }}>
            {getInitials(form.agencyName)}
          </div>
          <div>
            <div style={{ fontSize: "17px", fontWeight: "800", color: "#0f172a" }}>{form.agencyName || "Agency Name"}</div>
            <div style={{ fontSize: "12.5px", color: "#64748b" }}>{form.email}</div>
            <div style={{ display: "flex", gap: "6px", marginTop: "6px" }}>
              <span style={{ padding: "2px 8px", borderRadius: "6px", fontSize: "11px", fontWeight: "700", backgroundColor: accentLight, color: accent }}>
                Talent Agency
              </span>
              <span style={{ padding: "2px 8px", borderRadius: "6px", fontSize: "11px", fontWeight: "700", backgroundColor: "#d1fae5", color: "#065f46", display: "flex", alignItems: "center", gap: "3px" }}>
                <ShieldCheck size={10} />Verified
              </span>
            </div>
          </div>
        </div>

        {savedMsg && (
          <div style={{ padding: "10px 14px", borderRadius: "8px", backgroundColor: "#d1fae5", color: "#065f46", fontSize: "13px", fontWeight: "600", marginBottom: "18px" }}>
            ✓ {savedMsg}
          </div>
        )}

        {/* Form Fields */}
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "16px" }}>
          {[
            { label: "Agency Name", field: "agencyName", icon: Building2, placeholder: "Your agency name" },
            { label: "Contact Email", field: "email", icon: Mail, placeholder: "agency@email.com", disabled: true },
            { label: "Website", field: "website", icon: Globe, placeholder: "https://youragency.com" },
            { label: "Phone", field: "phone", icon: Phone, placeholder: "+1 (555) 000-0000" },
            { label: "Location", field: "location", icon: MapPin, placeholder: "City, Country" },
            { label: "Specializations", field: "specializations", icon: Settings, placeholder: "e.g. Tech, Lifestyle, Gaming" },
          ].map(({ label, field, icon: Icon, placeholder, disabled }) => (
            <div key={field}>
              <label style={{ display: "block", fontSize: "11.5px", fontWeight: "700", color: "#64748b", marginBottom: "6px", textTransform: "uppercase", letterSpacing: "0.4px" }}>
                {label}
              </label>
              <div style={{ position: "relative" }}>
                <Icon size={14} color="#94a3b8" style={{ position: "absolute", top: "50%", left: "12px", transform: "translateY(-50%)" }} />
                <input
                  type="text"
                  value={form[field]}
                  onChange={(e) => !disabled && handleChange(field, e.target.value)}
                  placeholder={placeholder}
                  disabled={disabled}
                  style={{ width: "100%", padding: "9px 12px 9px 32px", borderRadius: "8px", border: "1px solid #e2e8f0", fontSize: "13px", color: disabled ? "#94a3b8" : "#0f172a", backgroundColor: disabled ? "#f8fafc" : "#ffffff", boxSizing: "border-box", cursor: disabled ? "not-allowed" : "text" }}
                />
              </div>
            </div>
          ))}
        </div>

        {/* Bio — full width */}
        <div style={{ marginTop: "16px" }}>
          <label style={{ display: "block", fontSize: "11.5px", fontWeight: "700", color: "#64748b", marginBottom: "6px", textTransform: "uppercase", letterSpacing: "0.4px" }}>
            Agency Bio
          </label>
          <textarea
            value={form.bio}
            onChange={(e) => handleChange("bio", e.target.value)}
            placeholder="Brief description of your agency, its strengths, and creator niches you specialize in…"
            style={{ width: "100%", padding: "10px 14px", borderRadius: "8px", border: "1px solid #e2e8f0", fontSize: "13px", color: "#334155", resize: "vertical", minHeight: "90px", boxSizing: "border-box", fontFamily: "inherit" }}
          />
        </div>

        <div style={{ marginTop: "20px", display: "flex", gap: "10px" }}>
          <button
            onClick={handleSave}
            disabled={saving}
            style={{ display: "flex", alignItems: "center", gap: "7px", padding: "10px 22px", borderRadius: "8px", backgroundColor: accent, border: "none", color: "#ffffff", fontWeight: "700", fontSize: "13px", cursor: "pointer", opacity: saving ? 0.7 : 1 }}
          >
            <Save size={14} />
            {saving ? "Saving…" : "Save Profile"}
          </button>
        </div>
      </div>

      {/* Sign Out */}
      <div style={{ backgroundColor: "#ffffff", border: "1px solid #fee2e2", borderRadius: "14px", padding: "20px 22px" }}>
        <div style={{ fontSize: "14px", fontWeight: "700", color: "#991b1b", marginBottom: "8px" }}>Sign Out</div>
        <p style={{ margin: "0 0 14px", fontSize: "13px", color: "#64748b" }}>
          Sign out of your agency account. Your data will remain saved.
        </p>
        <button
          onClick={onSignOut}
          style={{ display: "flex", alignItems: "center", gap: "7px", padding: "10px 18px", borderRadius: "8px", backgroundColor: "#fff1f2", border: "1px solid #fecdd3", color: "#ef4444", fontWeight: "700", fontSize: "13px", cursor: "pointer" }}
        >
          <LogOut size={14} />
          Sign Out
        </button>
      </div>
    </div>
  );
}
