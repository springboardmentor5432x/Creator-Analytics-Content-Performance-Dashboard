import React, { useState } from "react";
import {
  Settings,
  Shield,
  Bell,
  Mail,
  Key,
  LogOut,
  CheckCircle2,
  Database,
  ExternalLink,
} from "lucide-react";

export default function CreatorSettingsView({ user, userProfile, theme, onSignOut }) {
  const accent = theme?.accent || "#2563eb";

  const [notifInvites, setNotifInvites] = useState(true);
  const [notifReviews, setNotifReviews] = useState(true);
  const [notifDigest, setNotifDigest] = useState(false);
  const [savedNotice, setSavedNotice] = useState("");

  const email = user?.email || userProfile?.email || "creator@creatoriq.io";
  const provider = userProfile?.provider || (user?.providerData?.[0]?.providerId === "google.com" ? "Google OAuth" : "Email / Password");
  const uid = user?.uid || userProfile?.uid || "N/A";

  const handleSavePref = () => {
    setSavedNotice("Notification preferences updated.");
    setTimeout(() => setSavedNotice(""), 3000);
  };

  return (
    <div style={styles.container}>
      {/* Header */}
      <div style={styles.topBar}>
        <div>
          <h2 style={styles.pageTitle}>Account Settings & Security</h2>
          <p style={styles.pageSubtitle}>
            Authentication details, notification triggers, and session management.
          </p>
        </div>
      </div>

      {savedNotice && (
        <div style={styles.noticeBanner}>
          <CheckCircle2 size={16} color="#15803d" />
          <span>{savedNotice}</span>
        </div>
      )}

      {/* Account Identity Card */}
      <div style={styles.card}>
        <div style={styles.cardHeader}>
          <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
            <div style={{ ...styles.iconBox, backgroundColor: "#eff6ff" }}>
              <Shield size={18} color="#2563eb" />
            </div>
            <div>
              <h3 style={styles.cardTitle}>Verified Account Identity</h3>
              <p style={styles.cardSubtitle}>
                Authentication credentials and Firestore synchronization identifiers.
              </p>
            </div>
          </div>
          <span style={styles.activePill}>✓ Active Session</span>
        </div>

        <div style={styles.grid}>
          <div style={styles.fieldBox}>
            <span style={styles.fieldLabel}>REGISTERED WORK EMAIL</span>
            <span style={styles.fieldVal}>{email}</span>
            <span style={styles.fieldSub}>Role: Content Creator</span>
          </div>

          <div style={styles.fieldBox}>
            <span style={styles.fieldLabel}>AUTHENTICATION PROVIDER</span>
            <span style={styles.fieldVal}>{provider}</span>
            <span style={styles.fieldSub}>Verified Identity</span>
          </div>

          <div style={styles.fieldBox}>
            <span style={styles.fieldLabel}>FIRESTORE DOCUMENT UID</span>
            <code style={styles.monoVal}>{uid}</code>
            <span style={styles.fieldSub}>Path: /users/{uid}</span>
          </div>

          <div style={styles.fieldBox}>
            <span style={styles.fieldLabel}>DATA ENCRYPTION & PRIVACY</span>
            <span style={styles.fieldVal}>AES-256 Cloud Vault</span>
            <span style={styles.fieldSub}>GDPR & SOC2 Compliant</span>
          </div>
        </div>
      </div>

      {/* Notification Preferences */}
      <div style={styles.card}>
        <div style={styles.cardHeader}>
          <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
            <div style={{ ...styles.iconBox, backgroundColor: "#fef3c7" }}>
              <Bell size={18} color="#d97706" />
            </div>
            <div>
              <h3 style={styles.cardTitle}>Collaboration Notifications</h3>
              <p style={styles.cardSubtitle}>
                Configure alerts for brand campaign offers and deliverable review statuses.
              </p>
            </div>
          </div>
        </div>

        <div style={styles.toggleList}>
          <div style={styles.toggleItem}>
            <div>
              <span style={styles.toggleTitle}>Campaign Invitations & Sponsorship Offers</span>
              <span style={styles.toggleDesc}>
                Instant notifications when a brand marketer invites you to a new campaign.
              </span>
            </div>
            <input
              type="checkbox"
              checked={notifInvites}
              onChange={(e) => {
                setNotifInvites(e.target.checked);
                handleSavePref();
              }}
              style={styles.checkbox}
            />
          </div>

          <div style={styles.toggleItem}>
            <div>
              <span style={styles.toggleTitle}>Deliverable Review & Approval Alerts</span>
              <span style={styles.toggleDesc}>
                Alerts when a brand approves your content link or requests revisions.
              </span>
            </div>
            <input
              type="checkbox"
              checked={notifReviews}
              onChange={(e) => {
                setNotifReviews(e.target.checked);
                handleSavePref();
              }}
              style={styles.checkbox}
            />
          </div>

          <div style={styles.toggleItem}>
            <div>
              <span style={styles.toggleTitle}>Weekly Audience Telemetry Digest</span>
              <span style={styles.toggleDesc}>
                Summary of cross-platform growth, engagement rate benchmarks, and revenue.
              </span>
            </div>
            <input
              type="checkbox"
              checked={notifDigest}
              onChange={(e) => {
                setNotifDigest(e.target.checked);
                handleSavePref();
              }}
              style={styles.checkbox}
            />
          </div>
        </div>
      </div>

      {/* Security & Sign Out */}
      <div style={styles.dangerCard}>
        <div>
          <h3 style={styles.dangerTitle}>Session & Sign Out</h3>
          <p style={styles.dangerSubtitle}>
            End your current authenticated session on this browser. All data will remain safely synchronized in Firestore.
          </p>
        </div>

        <button onClick={onSignOut} style={styles.signOutBtn}>
          <LogOut size={15} style={{ marginRight: 6 }} />
          Sign Out of CreatorIQ
        </button>
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
  noticeBanner: {
    backgroundColor: "#f0fdf4",
    border: "1px solid #bbf7d0",
    borderRadius: "10px",
    padding: "12px 16px",
    display: "flex",
    alignItems: "center",
    gap: "10px",
    fontSize: "13px",
    color: "#15803d",
    fontWeight: "500",
  },
  card: {
    backgroundColor: "#ffffff",
    border: "1px solid #e2e8f0",
    borderRadius: "14px",
    padding: "22px 24px",
    boxShadow: "0 1px 3px rgba(15, 23, 42, 0.03)",
  },
  cardHeader: {
    display: "flex",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: "18px",
    flexWrap: "wrap",
    gap: "12px",
  },
  iconBox: {
    width: "36px",
    height: "36px",
    borderRadius: "9px",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
  },
  cardTitle: {
    fontSize: "16px",
    fontWeight: "700",
    color: "#0f172a",
  },
  cardSubtitle: {
    fontSize: "12px",
    color: "#64748b",
  },
  activePill: {
    fontSize: "11px",
    fontWeight: "700",
    color: "#15803d",
    backgroundColor: "#f0fdf4",
    border: "1px solid #bbf7d0",
    padding: "3px 8px",
    borderRadius: "6px",
  },
  grid: {
    display: "grid",
    gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))",
    gap: "14px",
  },
  fieldBox: {
    backgroundColor: "#f8fafc",
    padding: "12px 14px",
    borderRadius: "10px",
    border: "1px solid #f1f5f9",
  },
  fieldLabel: {
    fontSize: "10px",
    fontWeight: "700",
    color: "#64748b",
    letterSpacing: "0.5px",
    display: "block",
  },
  fieldVal: {
    fontSize: "13.5px",
    fontWeight: "700",
    color: "#0f172a",
    marginTop: "2px",
    display: "block",
  },
  monoVal: {
    fontSize: "12px",
    fontFamily: "monospace",
    color: "#0369a1",
    display: "block",
    marginTop: "2px",
    wordBreak: "break-all",
  },
  fieldSub: {
    fontSize: "11px",
    color: "#94a3b8",
    display: "block",
    marginTop: "2px",
  },
  toggleList: {
    display: "flex",
    flexDirection: "column",
    gap: "14px",
  },
  toggleItem: {
    display: "flex",
    justifyContent: "space-between",
    alignItems: "center",
    padding: "12px 14px",
    backgroundColor: "#f8fafc",
    borderRadius: "10px",
    border: "1px solid #f1f5f9",
    gap: "12px",
  },
  toggleTitle: {
    fontSize: "13px",
    fontWeight: "700",
    color: "#0f172a",
    display: "block",
  },
  toggleDesc: {
    fontSize: "12px",
    color: "#64748b",
    display: "block",
    marginTop: "2px",
  },
  checkbox: {
    width: "18px",
    height: "18px",
    cursor: "pointer",
  },
  dangerCard: {
    backgroundColor: "#ffffff",
    border: "1px solid #fee2e2",
    borderRadius: "14px",
    padding: "20px 24px",
    display: "flex",
    justifyContent: "space-between",
    alignItems: "center",
    flexWrap: "wrap",
    gap: "14px",
  },
  dangerTitle: {
    fontSize: "15px",
    fontWeight: "700",
    color: "#991b1b",
  },
  dangerSubtitle: {
    fontSize: "12.5px",
    color: "#64748b",
    marginTop: "2px",
    maxWidth: "520px",
  },
  signOutBtn: {
    display: "inline-flex",
    alignItems: "center",
    padding: "9px 16px",
    borderRadius: "8px",
    border: "1px solid #fca5a5",
    backgroundColor: "#fef2f2",
    color: "#b91c1c",
    fontSize: "12.5px",
    fontWeight: "700",
    cursor: "pointer",
  },
};
