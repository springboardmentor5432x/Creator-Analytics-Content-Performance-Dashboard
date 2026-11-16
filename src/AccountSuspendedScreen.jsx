import React from "react";
import { AlertTriangle, Lock, LogOut, ShieldAlert, Mail } from "lucide-react";

export default function AccountSuspendedScreen({ user, userProfile, onSignOut }) {
  const reason =
    userProfile?.statusReason ||
    userProfile?.reason ||
    "Violation of Platform Terms of Service or suspicious account activity under administrative review.";

  const suspendedDate = userProfile?.statusUpdatedAt
    ? new Date(userProfile.statusUpdatedAt).toLocaleDateString()
    : "Recently";

  return (
    <div style={styles.container}>
      <div style={styles.card}>
        <div style={styles.iconBox}>
          <ShieldAlert size={42} color="#b91c1c" />
        </div>

        <span style={styles.badge}>SECURITY ENFORCEMENT</span>
        <h1 style={styles.title}>Account Access Suspended</h1>
        <p style={styles.subtitle}>
          Your CreatorIQ account (<code>{user?.email || "Unknown User"}</code>) has been temporarily suspended by a platform administrator.
        </p>

        <div style={styles.reasonBox}>
          <span style={styles.reasonLabel}>Official Administrative Reason:</span>
          <p style={styles.reasonText}>"{reason}"</p>
          <span style={styles.reasonDate}>Enforced: {suspendedDate}</span>
        </div>

        <div style={styles.rulesNotice}>
          <Lock size={15} color="#991b1b" style={{ flexShrink: 0, marginTop: 2 }} />
          <span>
            While your account is suspended, all write privileges in Firestore security rules are revoked. You cannot create campaigns, submit deliverables, respond to invitations, or alter account details.
          </span>
        </div>

        <div style={styles.contactNotice}>
          <Mail size={15} color="#475569" style={{ flexShrink: 0, marginTop: 2 }} />
          <span>
            If you believe this action was taken in error or wish to appeal this decision, please reach out to platform security at{" "}
            <strong>compliance@creatoriq.io</strong>.
          </span>
        </div>

        <div style={styles.actions}>
          <button onClick={onSignOut} style={styles.signOutBtn}>
            <LogOut size={15} />
            <span>Sign Out Session</span>
          </button>
        </div>
      </div>
    </div>
  );
}

const styles = {
  container: {
    minHeight: "100vh",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#f8fafc",
    padding: "24px",
    fontFamily:
      '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif',
  },
  card: {
    backgroundColor: "#ffffff",
    borderRadius: "20px",
    border: "1px solid #fecaca",
    padding: "40px 36px",
    maxWidth: "560px",
    width: "100%",
    boxShadow: "0 25px 50px -12px rgba(185, 28, 28, 0.15)",
    display: "flex",
    flexDirection: "column",
    alignItems: "center",
    textAlign: "center",
  },
  iconBox: {
    width: "76px",
    height: "76px",
    borderRadius: "20px",
    backgroundColor: "#fee2e2",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    marginBottom: "20px",
  },
  badge: {
    fontSize: "11px",
    fontWeight: "800",
    color: "#b91c1c",
    backgroundColor: "#fee2e2",
    padding: "3px 10px",
    borderRadius: "12px",
    letterSpacing: "0.8px",
    marginBottom: "10px",
  },
  title: {
    margin: "0 0 10px 0",
    fontSize: "24px",
    fontWeight: "800",
    color: "#0f172a",
    letterSpacing: "-0.5px",
  },
  subtitle: {
    margin: "0 0 24px 0",
    fontSize: "14px",
    color: "#475569",
    lineHeight: "1.5",
  },
  reasonBox: {
    backgroundColor: "#fef2f2",
    border: "1px solid #fecaca",
    borderRadius: "12px",
    padding: "16px 20px",
    width: "100%",
    boxSizing: "border-box",
    textAlign: "left",
    marginBottom: "18px",
  },
  reasonLabel: {
    display: "block",
    fontSize: "11.5px",
    fontWeight: "700",
    color: "#991b1b",
    textTransform: "uppercase",
    letterSpacing: "0.5px",
    marginBottom: "4px",
  },
  reasonText: {
    margin: "0 0 6px 0",
    fontSize: "13.5px",
    fontWeight: "600",
    color: "#7f1d1d",
    lineHeight: "1.45",
  },
  reasonDate: {
    fontSize: "11px",
    color: "#b91c1c",
  },
  rulesNotice: {
    display: "flex",
    alignItems: "flex-start",
    gap: "10px",
    backgroundColor: "#fffbeb",
    border: "1px solid #fde68a",
    borderRadius: "10px",
    padding: "12px 14px",
    fontSize: "12px",
    color: "#92400e",
    textAlign: "left",
    marginBottom: "16px",
    lineHeight: "1.45",
    width: "100%",
    boxSizing: "border-box",
  },
  contactNotice: {
    display: "flex",
    alignItems: "flex-start",
    gap: "10px",
    backgroundColor: "#f8fafc",
    border: "1px solid #e2e8f0",
    borderRadius: "10px",
    padding: "12px 14px",
    fontSize: "12px",
    color: "#475569",
    textAlign: "left",
    marginBottom: "28px",
    lineHeight: "1.45",
    width: "100%",
    boxSizing: "border-box",
  },
  actions: {
    width: "100%",
  },
  signOutBtn: {
    width: "100%",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    gap: "8px",
    padding: "12px 20px",
    borderRadius: "10px",
    backgroundColor: "#dc2626",
    color: "#ffffff",
    border: "none",
    fontSize: "14px",
    fontWeight: "700",
    cursor: "pointer",
    boxShadow: "0 4px 12px rgba(220, 38, 38, 0.25)",
  },
};
