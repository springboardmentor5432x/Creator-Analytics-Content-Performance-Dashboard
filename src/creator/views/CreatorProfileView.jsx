import React, { useState, useEffect } from "react";
import {
  User,
  Sparkles,
  CheckCircle2,
  AlertCircle,
  Save,
  Globe,
  Share2,
  MapPin,
  Tag,
  Eye,
  EyeOff,
} from "lucide-react";
import { saveCreatorProfile } from "../creatorService";

const NICHE_OPTIONS = [
  "Tech & Software Engineering",
  "Productivity & Setup",
  "AI & SaaS",
  "Gaming & Streaming",
  "Lifestyle & Travel",
  "Finance & Crypto",
  "Design & Creative Arts",
  "Fitness & Health",
];

const PLATFORM_OPTIONS = [
  "YouTube",
  "Instagram",
  "TikTok",
  "Twitch",
  "LinkedIn",
  "X / Twitter",
];

export default function CreatorProfileView({ user, userProfile, theme, onProfileUpdated }) {
  const accent = theme?.accent || "#2563eb";

  const [fullName, setFullName] = useState("");
  const [handle, setHandle] = useState("");
  const [niche, setNiche] = useState("Tech & Software Engineering");
  const [platforms, setPlatforms] = useState(["YouTube"]);
  const [location, setLocation] = useState("");
  const [bio, setBio] = useState("");
  const [discoverable, setDiscoverable] = useState(true);

  const [saving, setSaving] = useState(false);
  const [toastMessage, setToastMessage] = useState("");
  const [errorMessage, setErrorMessage] = useState("");

  useEffect(() => {
    if (userProfile || user) {
      const p = userProfile || {};
      setFullName(p.fullName || user?.displayName || "");
      setHandle(p.handle || (user?.email ? `@${user.email.split("@")[0]}` : "@creator"));
      setNiche(p.niche || "Tech & Software Engineering");
      setPlatforms(Array.isArray(p.platforms) && p.platforms.length > 0 ? p.platforms : ["YouTube"]);
      setLocation(p.location || "");
      setBio(p.bio || "");
      setDiscoverable(p.discoverable !== false);
    }
  }, [userProfile, user]);

  const togglePlatform = (p) => {
    if (platforms.includes(p)) {
      if (platforms.length > 1) {
        setPlatforms(platforms.filter((x) => x !== p));
      }
    } else {
      setPlatforms([...platforms, p]);
    }
  };

  const handleSave = async (e) => {
    e.preventDefault();
    setSaving(true);
    setErrorMessage("");
    setToastMessage("");

    const profileData = {
      fullName: fullName.trim(),
      handle: handle.trim().startsWith("@") ? handle.trim() : `@${handle.trim()}`,
      niche,
      platforms,
      primaryPlatform: platforms[0] || "YouTube",
      location: location.trim(),
      bio: bio.trim(),
      discoverable,
      email: user?.email || userProfile?.email || "",
      updatedAt: new Date().toISOString(),
    };

    const result = await saveCreatorProfile(user?.uid || userProfile?.uid, profileData);

    setSaving(false);
    if (result.success) {
      setToastMessage("Creator profile saved and synchronized with Firestore!");
      if (onProfileUpdated) onProfileUpdated(profileData);
      setTimeout(() => setToastMessage(""), 4000);
    } else {
      setErrorMessage(result.error || "Failed to update profile.");
    }
  };

  // Compute profile completeness score
  let score = 25; // base for email/uid
  if (fullName.trim()) score += 15;
  if (handle.trim()) score += 15;
  if (niche) score += 15;
  if (platforms.length > 0) score += 15;
  if (bio.trim()) score += 15;

  return (
    <div style={styles.container}>
      {/* Toast */}
      {toastMessage && (
        <div style={styles.toast}>
          <CheckCircle2 size={16} color="#15803d" />
          <span>{toastMessage}</span>
        </div>
      )}

      {/* Header */}
      <div style={styles.topBar}>
        <div>
          <h2 style={styles.pageTitle}>Creator Profile & Identity</h2>
          <p style={styles.pageSubtitle}>
            Manage how brand marketers discover your channel, niche categorization, and verified platforms.
          </p>
        </div>
      </div>

      {/* Profile Completeness Card */}
      <div style={styles.completenessBanner}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 8 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
            <Sparkles size={16} color={accent} />
            <span style={styles.scoreTitle}>Creator Profile Readiness</span>
          </div>
          <span style={{ ...styles.scorePercent, color: accent }}>{score}% Complete</span>
        </div>
        <div style={styles.scoreBarBg}>
          <div style={{ ...styles.scoreBarFill, width: `${score}%`, backgroundColor: accent }} />
        </div>
        <span style={styles.scoreSub}>
          Complete profiles are 3.8x more likely to receive direct brand campaign offers in Creator Discovery.
        </span>
      </div>

      {/* Profile Edit Form */}
      <div style={styles.formCard}>
        {errorMessage && (
          <div style={styles.errorBox}>
            <AlertCircle size={15} color="#dc2626" />
            <span>{errorMessage}</span>
          </div>
        )}

        <form onSubmit={handleSave} style={styles.form}>
          <div style={styles.twoCol}>
            <div style={styles.field}>
              <label style={styles.label}>Full Creator / Channel Name:</label>
              <input
                type="text"
                value={fullName}
                onChange={(e) => setFullName(e.target.value)}
                placeholder="e.g. Alex Rivers / TechHQ"
                style={styles.input}
                required
              />
            </div>

            <div style={styles.field}>
              <label style={styles.label}>Creator Handle / Username:</label>
              <input
                type="text"
                value={handle}
                onChange={(e) => setHandle(e.target.value)}
                placeholder="@username"
                style={styles.input}
                required
              />
            </div>
          </div>

          <div style={styles.twoCol}>
            <div style={styles.field}>
              <label style={styles.label}>Primary Creator Niche:</label>
              <select
                value={niche}
                onChange={(e) => setNiche(e.target.value)}
                style={styles.select}
              >
                {NICHE_OPTIONS.map((opt) => (
                  <option key={opt} value={opt}>
                    {opt}
                  </option>
                ))}
              </select>
            </div>

            <div style={styles.field}>
              <label style={styles.label}>Location / Territory:</label>
              <input
                type="text"
                value={location}
                onChange={(e) => setLocation(e.target.value)}
                placeholder="e.g. San Francisco, CA / London, UK"
                style={styles.input}
              />
            </div>
          </div>

          {/* Platforms Multi-Select */}
          <div style={styles.field}>
            <label style={styles.label}>Active Publishing Platforms:</label>
            <div style={styles.platformPills}>
              {PLATFORM_OPTIONS.map((p) => {
                const isSelected = platforms.includes(p);
                return (
                  <button
                    key={p}
                    type="button"
                    onClick={() => togglePlatform(p)}
                    style={{
                      ...styles.platformBtn,
                      backgroundColor: isSelected ? accent : "#f8fafc",
                      color: isSelected ? "#ffffff" : "#475569",
                      borderColor: isSelected ? accent : "#cbd5e1",
                      fontWeight: isSelected ? 600 : 500,
                    }}
                  >
                    {isSelected && <CheckCircle2 size={12} style={{ marginRight: 4 }} />}
                    {p}
                  </button>
                );
              })}
            </div>
            <span style={styles.helpText}>
              Brands filter creators by supported platforms when drafting deliverables.
            </span>
          </div>

          {/* Bio */}
          <div style={styles.field}>
            <label style={styles.label}>Channel Summary & Creator Bio:</label>
            <textarea
              rows={4}
              value={bio}
              onChange={(e) => setBio(e.target.value)}
              placeholder="Tell brands about your audience demographics, favorite product categories, and past brand sponsorship highlights..."
              style={styles.textarea}
            />
          </div>

          {/* Discoverability Toggle */}
          <div style={styles.discoverableBox}>
            <div style={{ display: "flex", alignItems: "flex-start", gap: 12 }}>
              <div
                style={{
                  ...styles.toggleIconWrap,
                  backgroundColor: discoverable ? "#f0fdf4" : "#f1f5f9",
                }}
              >
                {discoverable ? (
                  <Eye size={18} color="#15803d" />
                ) : (
                  <EyeOff size={18} color="#64748b" />
                )}
              </div>
              <div>
                <span style={styles.discoverableTitle}>
                  Discoverable in Creator Discovery
                </span>
                <p style={styles.discoverableDesc}>
                  When enabled, verified marketing teams on CreatorIQ can discover your channel and send you direct campaign offers.
                </p>
              </div>
            </div>

            <label style={styles.switchLabel}>
              <input
                type="checkbox"
                checked={discoverable}
                onChange={(e) => setDiscoverable(e.target.checked)}
                style={styles.checkbox}
              />
              <span style={styles.switchStatus}>
                {discoverable ? "Public Roster" : "Hidden"}
              </span>
            </label>
          </div>

          {/* Save Button */}
          <div style={styles.submitRow}>
            <button
              type="submit"
              disabled={saving}
              style={{ ...styles.saveBtn, backgroundColor: accent }}
            >
              <Save size={15} style={{ marginRight: 6 }} />
              {saving ? "Saving to Cloud..." : "Save Profile Changes"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

const styles = {
  container: {
    display: "flex",
    flexDirection: "column",
    gap: "20px",
  },
  topBar: {
    display: "flex",
    justifyContent: "space-between",
    alignItems: "center",
  },
  pageTitle: {
    fontSize: "20px",
    fontWeight: "700",
    color: "#0f172a",
  },
  pageSubtitle: {
    fontSize: "13px",
    color: "#64748b",
    marginTop: "2px",
  },
  toast: {
    position: "fixed",
    bottom: "24px",
    right: "24px",
    backgroundColor: "#ffffff",
    border: "1px solid #bbf7d0",
    color: "#15803d",
    fontSize: "13px",
    fontWeight: "600",
    padding: "12px 20px",
    borderRadius: "10px",
    display: "flex",
    alignItems: "center",
    gap: "10px",
    boxShadow: "0 10px 25px rgba(0,0,0,0.12)",
    zIndex: 1000,
  },
  completenessBanner: {
    backgroundColor: "#ffffff",
    border: "1px solid #e2e8f0",
    borderRadius: "14px",
    padding: "18px 22px",
    boxShadow: "0 1px 3px rgba(15, 23, 42, 0.03)",
  },
  scoreTitle: {
    fontSize: "13.5px",
    fontWeight: "700",
    color: "#0f172a",
  },
  scorePercent: {
    fontSize: "14px",
    fontWeight: "800",
  },
  scoreBarBg: {
    height: "7px",
    borderRadius: "4px",
    backgroundColor: "#f1f5f9",
    overflow: "hidden",
    margin: "8px 0",
  },
  scoreBarFill: {
    height: "100%",
    borderRadius: "4px",
    transition: "width 0.3s ease",
  },
  scoreSub: {
    fontSize: "11.5px",
    color: "#64748b",
  },
  formCard: {
    backgroundColor: "#ffffff",
    border: "1px solid #e2e8f0",
    borderRadius: "14px",
    padding: "24px 28px",
    boxShadow: "0 1px 4px rgba(15, 23, 42, 0.04)",
  },
  errorBox: {
    backgroundColor: "#fef2f2",
    borderLeft: "3px solid #dc2626",
    padding: "10px 16px",
    display: "flex",
    alignItems: "center",
    gap: "8px",
    fontSize: "12.5px",
    color: "#b91c1c",
    marginBottom: "18px",
  },
  form: {
    display: "flex",
    flexDirection: "column",
    gap: "18px",
  },
  twoCol: {
    display: "grid",
    gridTemplateColumns: "1fr 1fr",
    gap: "18px",
  },
  field: {
    display: "flex",
    flexDirection: "column",
    gap: "6px",
  },
  label: {
    fontSize: "12.5px",
    fontWeight: "600",
    color: "#334155",
  },
  input: {
    padding: "9px 12px",
    borderRadius: "8px",
    border: "1px solid #cbd5e1",
    fontSize: "13px",
    outline: "none",
  },
  select: {
    padding: "9px 12px",
    borderRadius: "8px",
    border: "1px solid #cbd5e1",
    fontSize: "13px",
    outline: "none",
    backgroundColor: "#ffffff",
  },
  textarea: {
    padding: "10px 12px",
    borderRadius: "8px",
    border: "1px solid #cbd5e1",
    fontSize: "13px",
    outline: "none",
    resize: "vertical",
  },
  platformPills: {
    display: "flex",
    gap: "8px",
    flexWrap: "wrap",
  },
  platformBtn: {
    display: "inline-flex",
    alignItems: "center",
    padding: "6px 12px",
    borderRadius: "6px",
    border: "1px solid",
    fontSize: "12px",
    cursor: "pointer",
    transition: "all 0.15s ease",
  },
  helpText: {
    fontSize: "11px",
    color: "#64748b",
  },
  discoverableBox: {
    backgroundColor: "#f8fafc",
    border: "1px solid #e2e8f0",
    borderRadius: "10px",
    padding: "16px 18px",
    display: "flex",
    justifyContent: "space-between",
    alignItems: "center",
    flexWrap: "wrap",
    gap: "14px",
  },
  toggleIconWrap: {
    width: "36px",
    height: "36px",
    borderRadius: "8px",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    flexShrink: 0,
  },
  discoverableTitle: {
    fontSize: "13.5px",
    fontWeight: "700",
    color: "#0f172a",
    display: "block",
  },
  discoverableDesc: {
    fontSize: "12px",
    color: "#64748b",
    marginTop: "2px",
    maxWidth: "460px",
  },
  switchLabel: {
    display: "flex",
    alignItems: "center",
    gap: "8px",
    cursor: "pointer",
  },
  checkbox: {
    width: "18px",
    height: "18px",
    cursor: "pointer",
  },
  switchStatus: {
    fontSize: "12.5px",
    fontWeight: "600",
    color: "#334155",
  },
  submitRow: {
    display: "flex",
    justifyContent: "flex-end",
    paddingTop: "10px",
    borderTop: "1px solid #f1f5f9",
  },
  saveBtn: {
    display: "inline-flex",
    alignItems: "center",
    padding: "10px 20px",
    borderRadius: "8px",
    color: "#ffffff",
    fontSize: "13px",
    fontWeight: "600",
    border: "none",
    cursor: "pointer",
    boxShadow: "0 2px 6px rgba(37, 99, 235, 0.2)",
  },
};
