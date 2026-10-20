import React, { useState } from "react";
import {
  Send,
  Clock,
  Check,
  X,
  DollarSign,
  Calendar,
  AlertCircle,
  CheckCircle2,
  Layers,
  ArrowRight,
} from "lucide-react";
import { respondToInvitation } from "../creatorService";

export default function CreatorInvitationsView({
  invitations = [],
  theme,
  user,
  userProfile,
  onRefresh,
  onNavigate,
}) {
  const accent = theme?.accent || "#2563eb";
  const [statusFilter, setStatusFilter] = useState("all");
  const [respondingId, setRespondingId] = useState(null);
  const [toastMessage, setToastMessage] = useState("");

  const showToast = (msg) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(""), 4000);
  };

  const handleRespond = async (invitationId, responseStatus) => {
    setRespondingId(invitationId);
    try {
      await respondToInvitation(invitationId, responseStatus, userProfile || user);
      showToast(
        responseStatus === "accepted"
          ? "Invitation accepted! Deliverable requirements are now active."
          : "Invitation declined."
      );
      if (onRefresh) onRefresh();
    } catch (err) {
      alert(err.message || "Failed to respond to invitation.");
    } finally {
      setRespondingId(null);
    }
  };

  const filtered = invitations.filter((i) => {
    if (statusFilter !== "all" && i.status !== statusFilter) return false;
    return true;
  });

  const pendingCount = invitations.filter((i) => i.status === "pending").length;
  const acceptedCount = invitations.filter((i) => i.status === "accepted").length;
  const declinedCount = invitations.filter((i) => i.status === "declined").length;

  return (
    <div style={styles.container}>
      {/* Toast Notification */}
      {toastMessage && (
        <div style={styles.toast}>
          <CheckCircle2 size={16} color="#15803d" />
          <span>{toastMessage}</span>
        </div>
      )}

      {/* Header */}
      <div style={styles.topBar}>
        <div>
          <h2 style={styles.pageTitle}>Campaign Invitations</h2>
          <p style={styles.pageSubtitle}>
            Review official brand collaboration offers, contracted rates, and project briefs.
          </p>
        </div>

        {/* Filter Pills */}
        <div style={styles.filterPills}>
          {[
            { id: "all", label: "All Offers", count: invitations.length },
            { id: "pending", label: "Pending Response", count: pendingCount, isAlert: pendingCount > 0 },
            { id: "accepted", label: "Accepted", count: acceptedCount },
            { id: "declined", label: "Declined", count: declinedCount },
          ].map((pill) => {
            const isSelected = statusFilter === pill.id;
            return (
              <button
                key={pill.id}
                onClick={() => setStatusFilter(pill.id)}
                style={{
                  ...styles.filterBtn,
                  backgroundColor: isSelected ? accent : "#ffffff",
                  color: isSelected ? "#ffffff" : "#475569",
                  borderColor: isSelected ? accent : "#cbd5e1",
                  fontWeight: isSelected ? 600 : 500,
                }}
              >
                <span>{pill.label}</span>
                <span
                  style={{
                    ...styles.countBadge,
                    backgroundColor: isSelected
                      ? "rgba(255,255,255,0.25)"
                      : pill.isAlert
                      ? "#fef3c7"
                      : "#f1f5f9",
                    color: isSelected
                      ? "#ffffff"
                      : pill.isAlert
                      ? "#b45309"
                      : "#475569",
                  }}
                >
                  {pill.count}
                </span>
              </button>
            );
          })}
        </div>
      </div>

      {/* Invitations List */}
      {filtered.length === 0 ? (
        <div style={styles.emptyState}>
          <div style={styles.emptyIconWrap}>
            <Send size={28} color="#94a3b8" />
          </div>
          <h4 style={styles.emptyTitle}>No invitations matching this filter</h4>
          <p style={styles.emptyDesc}>
            When verified brand marketers discover your channel in Creator Discovery, their official sponsorship offers will arrive here.
          </p>
          <button
            onClick={() => onNavigate("discover")}
            style={{ ...styles.primaryBtn, backgroundColor: accent, marginTop: 12 }}
          >
            Discover Brand Campaigns
          </button>
        </div>
      ) : (
        <div style={styles.invitationList}>
          {filtered.map((inv) => {
            const isPending = inv.status === "pending";
            const isAccepted = inv.status === "accepted";
            const isDeclined = inv.status === "declined";

            return (
              <div
                key={inv.id}
                style={{
                  ...styles.invCard,
                  borderColor: isPending ? "#fde68a" : "#e2e8f0",
                }}
              >
                {/* Status Bar */}
                <div style={styles.invCardTop}>
                  <div style={styles.brandInfo}>
                    <span style={styles.brandSenderTag}>OFFICIAL BRAND INVITATION</span>
                    <h3 style={styles.campaignTitle}>
                      {inv.campaignTitle || inv.campaignName || "Campaign Partnership"}
                    </h3>
                    <span style={styles.senderSub}>
                      From: <strong>{inv.marketingName || "Brand Marketing Team"}</strong> • Dispatched: {inv.sentAt ? new Date(inv.sentAt).toLocaleDateString() : "Recent"}
                    </span>
                  </div>

                  <div style={styles.rateBox}>
                    <span style={styles.rateLabel}>CONTRACTED RATE</span>
                    <span style={{ ...styles.rateVal, color: accent }}>
                      ${Number(inv.compensation || inv.fee || 0).toLocaleString()}
                    </span>
                    <span style={styles.rateSub}>Guaranteed upon approval</span>
                  </div>
                </div>

                {/* Message from Brand */}
                {inv.message && (
                  <div style={styles.messageBox}>
                    <span style={styles.messageLabel}>Brand Message & Collaboration Vision:</span>
                    <p style={styles.messageText}>"{inv.message}"</p>
                  </div>
                )}

                {/* Details Row */}
                <div style={styles.detailsRow}>
                  <div style={styles.detailItem}>
                    <span style={styles.detailLabel}>Deliverable Format</span>
                    <span style={styles.detailVal}>
                      {inv.deliverableFormat || "Sponsored Video & Social Post"}
                    </span>
                  </div>

                  <div style={styles.detailItem}>
                    <span style={styles.detailLabel}>Invitation Status</span>
                    <span
                      style={{
                        ...styles.statusPill,
                        backgroundColor: isAccepted
                          ? "#f0fdf4"
                          : isDeclined
                          ? "#fef2f2"
                          : "#fef3c7",
                        color: isAccepted
                          ? "#15803d"
                          : isDeclined
                          ? "#b91c1c"
                          : "#b45309",
                      }}
                    >
                      {inv.status ? inv.status.toUpperCase() : "PENDING"}
                    </span>
                  </div>
                </div>

                {/* Actions Row */}
                <div style={styles.invCardFooter}>
                  {isPending && (
                    <div style={styles.btnActionRow}>
                      <button
                        onClick={() => handleRespond(inv.id, "declined")}
                        disabled={respondingId === inv.id}
                        style={styles.declineBtn}
                      >
                        <X size={14} style={{ marginRight: 6 }} />
                        Decline
                      </button>
                      <button
                        onClick={() => handleRespond(inv.id, "accepted")}
                        disabled={respondingId === inv.id}
                        style={{ ...styles.acceptBtn, backgroundColor: accent }}
                      >
                        <Check size={14} style={{ marginRight: 6 }} />
                        {respondingId === inv.id ? "Processing..." : "Accept Sponsorship"}
                      </button>
                    </div>
                  )}

                  {isAccepted && (
                    <div style={styles.acceptedRow}>
                      <span style={styles.acceptedTag}>
                        <CheckCircle2 size={15} color="#15803d" style={{ marginRight: 6 }} />
                        Deal Accepted • Collaboration Active
                      </span>
                      <button
                        onClick={() => onNavigate("deliverables")}
                        style={{ ...styles.deliverablesBtn, color: accent }}
                      >
                        View Deliverables & Submit Content →
                      </button>
                    </div>
                  )}

                  {isDeclined && (
                    <span style={styles.declinedNotice}>
                      You declined this invitation on {inv.respondedAt ? new Date(inv.respondedAt).toLocaleDateString() : "file"}.
                    </span>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}
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
    flexWrap: "wrap",
    gap: "14px",
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
  filterPills: {
    display: "flex",
    gap: "6px",
    flexWrap: "wrap",
  },
  filterBtn: {
    display: "inline-flex",
    alignItems: "center",
    gap: "6px",
    padding: "7px 12px",
    borderRadius: "8px",
    border: "1px solid",
    fontSize: "12.5px",
    cursor: "pointer",
    transition: "all 0.15s ease",
  },
  countBadge: {
    fontSize: "10.5px",
    fontWeight: "700",
    padding: "1px 6px",
    borderRadius: "10px",
  },
  emptyState: {
    textAlign: "center",
    padding: "60px 20px",
    backgroundColor: "#ffffff",
    borderRadius: "14px",
    border: "1px solid #e2e8f0",
  },
  emptyIconWrap: {
    width: "56px",
    height: "56px",
    borderRadius: "50%",
    backgroundColor: "#f8fafc",
    display: "inline-flex",
    alignItems: "center",
    justifyContent: "center",
    marginBottom: "12px",
    border: "1px solid #e2e8f0",
  },
  emptyTitle: {
    fontSize: "15px",
    fontWeight: "700",
    color: "#0f172a",
  },
  emptyDesc: {
    fontSize: "13px",
    color: "#64748b",
    maxWidth: "400px",
    margin: "6px auto 0",
  },
  primaryBtn: {
    padding: "8px 16px",
    borderRadius: "8px",
    color: "#ffffff",
    border: "none",
    fontSize: "12.5px",
    fontWeight: "600",
    cursor: "pointer",
  },
  invitationList: {
    display: "flex",
    flexDirection: "column",
    gap: "16px",
  },
  invCard: {
    backgroundColor: "#ffffff",
    borderRadius: "14px",
    border: "1px solid #e2e8f0",
    padding: "22px 24px",
    boxShadow: "0 1px 3px rgba(15, 23, 42, 0.03)",
    display: "flex",
    flexDirection: "column",
    gap: "14px",
  },
  invCardTop: {
    display: "flex",
    justifyContent: "space-between",
    alignItems: "flex-start",
    flexWrap: "wrap",
    gap: "14px",
  },
  brandInfo: {
    flex: 1,
    minWidth: "260px",
  },
  brandSenderTag: {
    fontSize: "10.5px",
    fontWeight: "700",
    color: "#0369a1",
    backgroundColor: "#f0f9ff",
    border: "1px solid #bae6fd",
    padding: "2px 7px",
    borderRadius: "4px",
    letterSpacing: "0.5px",
    display: "inline-block",
    marginBottom: "4px",
  },
  campaignTitle: {
    fontSize: "17px",
    fontWeight: "700",
    color: "#0f172a",
  },
  senderSub: {
    fontSize: "12px",
    color: "#64748b",
    marginTop: "2px",
    display: "block",
  },
  rateBox: {
    textAlign: "right",
    backgroundColor: "#f8fafc",
    padding: "10px 16px",
    borderRadius: "10px",
    border: "1px solid #e2e8f0",
  },
  rateLabel: {
    fontSize: "10px",
    fontWeight: "700",
    color: "#64748b",
    textTransform: "uppercase",
    display: "block",
  },
  rateVal: {
    fontSize: "20px",
    fontWeight: "800",
    display: "block",
    letterSpacing: "-0.5px",
  },
  rateSub: {
    fontSize: "10.5px",
    color: "#64748b",
    display: "block",
  },
  messageBox: {
    backgroundColor: "#f8fafc",
    borderLeft: "3px solid #cbd5e1",
    padding: "12px 14px",
    borderRadius: "0 8px 8px 0",
  },
  messageLabel: {
    fontSize: "11px",
    fontWeight: "700",
    color: "#475569",
    display: "block",
    marginBottom: "2px",
  },
  messageText: {
    fontSize: "13px",
    color: "#334155",
    fontStyle: "italic",
    lineHeight: "1.4",
  },
  detailsRow: {
    display: "flex",
    gap: "24px",
    paddingTop: "6px",
    borderTop: "1px solid #f1f5f9",
    flexWrap: "wrap",
  },
  detailItem: {
    display: "flex",
    flexDirection: "column",
  },
  detailLabel: {
    fontSize: "11px",
    fontWeight: "700",
    color: "#94a3b8",
    textTransform: "uppercase",
  },
  detailVal: {
    fontSize: "13px",
    fontWeight: "600",
    color: "#0f172a",
    marginTop: "2px",
  },
  statusPill: {
    fontSize: "11px",
    fontWeight: "700",
    padding: "2px 8px",
    borderRadius: "6px",
    marginTop: "2px",
    display: "inline-block",
    width: "fit-content",
  },
  invCardFooter: {
    paddingTop: "10px",
    borderTop: "1px solid #f1f5f9",
    display: "flex",
    justifyContent: "space-between",
    alignItems: "center",
    flexWrap: "wrap",
    gap: "10px",
  },
  btnActionRow: {
    display: "flex",
    gap: "10px",
    marginLeft: "auto",
  },
  declineBtn: {
    display: "inline-flex",
    alignItems: "center",
    padding: "8px 16px",
    borderRadius: "8px",
    border: "1px solid #cbd5e1",
    backgroundColor: "#ffffff",
    color: "#475569",
    fontSize: "12.5px",
    fontWeight: "600",
    cursor: "pointer",
  },
  acceptBtn: {
    display: "inline-flex",
    alignItems: "center",
    padding: "8px 18px",
    borderRadius: "8px",
    border: "none",
    color: "#ffffff",
    fontSize: "12.5px",
    fontWeight: "600",
    cursor: "pointer",
    boxShadow: "0 2px 6px rgba(37,99,235,0.2)",
  },
  acceptedRow: {
    display: "flex",
    justifyContent: "space-between",
    alignItems: "center",
    width: "100%",
    flexWrap: "wrap",
    gap: "10px",
  },
  acceptedTag: {
    display: "inline-flex",
    alignItems: "center",
    fontSize: "13px",
    fontWeight: "600",
    color: "#15803d",
  },
  deliverablesBtn: {
    background: "none",
    border: "none",
    fontSize: "12.5px",
    fontWeight: "700",
    cursor: "pointer",
    padding: "4px 8px",
  },
  declinedNotice: {
    fontSize: "12.5px",
    color: "#94a3b8",
    fontStyle: "italic",
  },
};
