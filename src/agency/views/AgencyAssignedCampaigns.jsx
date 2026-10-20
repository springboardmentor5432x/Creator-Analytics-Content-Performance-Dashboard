import React, { useState } from "react";
import {
  Layers,
  CheckCircle2,
  Clock,
  XCircle,
  ChevronDown,
  ChevronUp,
  Sparkles,
  ArrowRight,
} from "lucide-react";
import { respondToAgencyBrandAssignment } from "../agencyService";

function statusChip(status) {
  const map = {
    pending: { color: "#92400e", bg: "#fef3c7", label: "Pending Review" },
    accepted: { color: "#065f46", bg: "#d1fae5", label: "Accepted" },
    declined: { color: "#991b1b", bg: "#fee2e2", label: "Declined" },
    revoked: { color: "#475569", bg: "#f1f5f9", label: "Revoked" },
  };
  const s = map[status] || { color: "#64748b", bg: "#f1f5f9", label: status };
  return (
    <span style={{ padding: "3px 10px", borderRadius: "20px", fontSize: "11.5px", fontWeight: "700", color: s.color, backgroundColor: s.bg }}>
      {s.label}
    </span>
  );
}

export default function AgencyAssignedCampaigns({
  user,
  userProfile,
  theme,
  assignments = [],
  recommendations = [],
  onRefresh,
  onNavigate,
}) {
  const accent = theme?.accent || "#0d9488";
  const accentLight = theme?.accentLight || "#f0fdfa";
  const [expandedId, setExpandedId] = useState(null);
  const [responding, setResponding] = useState(null);

  const handleRespond = async (assignmentId, action) => {
    setResponding(assignmentId);
    try {
      await respondToAgencyBrandAssignment(
        assignmentId,
        action,
        user?.uid || "usr_agency_demo",
        action === "accepted" ? "We're excited to work on this campaign!" : "Thank you for the opportunity."
      );
      onRefresh();
    } catch (err) {
      console.warn("Respond error:", err);
      onRefresh();
    } finally {
      setResponding(null);
    }
  };

  const pending = assignments.filter((a) => a.status === "pending");
  const accepted = assignments.filter((a) => a.status === "accepted");
  const others = assignments.filter((a) => !["pending", "accepted"].includes(a.status));

  const renderAssignmentCard = (a) => {
    const isExpanded = expandedId === a.id;
    const recsForCampaign = recommendations.filter((r) => r.campaignId === a.campaignId);

    return (
      <div
        key={a.id}
        style={{ backgroundColor: "#ffffff", border: `1px solid ${a.status === "pending" ? "#fde68a" : "#e2e8f0"}`, borderRadius: "14px", overflow: "hidden" }}
      >
        <div style={{ padding: "18px 20px" }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
            <div style={{ flex: 1 }}>
              <div style={{ display: "flex", alignItems: "center", gap: "10px", marginBottom: "6px" }}>
                {statusChip(a.status)}
                {recsForCampaign.length > 0 && (
                  <span style={{ padding: "3px 10px", borderRadius: "20px", fontSize: "11.5px", fontWeight: "700", color: "#7c3aed", backgroundColor: "#f5f3ff" }}>
                    {recsForCampaign.length} Creator{recsForCampaign.length > 1 ? "s" : ""} Recommended
                  </span>
                )}
              </div>
              <h3 style={{ margin: "0 0 4px", fontSize: "15px", fontWeight: "700", color: "#0f172a" }}>
                {a.campaignTitle || "Campaign"}
              </h3>
              <div style={{ fontSize: "12.5px", color: "#64748b" }}>
                Brand: <strong>{a.brandName || a.brandEmail}</strong>
                {a.createdAt && (
                  <span style={{ marginLeft: 12 }}>
                    {new Date(a.createdAt).toLocaleDateString()}
                  </span>
                )}
              </div>
            </div>

            <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
              {a.status === "pending" && (
                <>
                  <button
                    onClick={() => handleRespond(a.id, "accepted")}
                    disabled={responding === a.id}
                    style={{ padding: "7px 16px", borderRadius: "8px", backgroundColor: accent, border: "none", color: "#ffffff", fontWeight: "600", fontSize: "12.5px", cursor: "pointer", opacity: responding === a.id ? 0.6 : 1 }}
                  >
                    {responding === a.id ? "Saving…" : "Accept"}
                  </button>
                  <button
                    onClick={() => handleRespond(a.id, "declined")}
                    disabled={responding === a.id}
                    style={{ padding: "7px 16px", borderRadius: "8px", backgroundColor: "#ffffff", border: "1px solid #e2e8f0", color: "#ef4444", fontWeight: "600", fontSize: "12.5px", cursor: "pointer" }}
                  >
                    Decline
                  </button>
                </>
              )}
              <button
                onClick={() => setExpandedId(isExpanded ? null : a.id)}
                style={{ padding: "7px 10px", borderRadius: "8px", backgroundColor: "#f8fafc", border: "1px solid #e2e8f0", cursor: "pointer", display: "flex", alignItems: "center" }}
              >
                {isExpanded ? <ChevronUp size={16} color="#64748b" /> : <ChevronDown size={16} color="#64748b" />}
              </button>
            </div>
          </div>
        </div>

        {/* Expanded Details */}
        {isExpanded && (
          <div style={{ borderTop: "1px solid #f1f5f9", padding: "16px 20px", backgroundColor: "#f8fafc" }}>
            {a.message && (
              <div style={{ marginBottom: "14px" }}>
                <div style={{ fontSize: "11px", fontWeight: "700", color: "#64748b", letterSpacing: "0.5px", textTransform: "uppercase", marginBottom: "4px" }}>
                  Brief from Brand
                </div>
                <p style={{ margin: 0, fontSize: "13px", color: "#334155", lineHeight: 1.6 }}>{a.message}</p>
              </div>
            )}

            {/* Permissions */}
            <div style={{ marginBottom: "14px" }}>
              <div style={{ fontSize: "11px", fontWeight: "700", color: "#64748b", letterSpacing: "0.5px", textTransform: "uppercase", marginBottom: "8px" }}>
                Agency Permissions
              </div>
              <div style={{ display: "flex", gap: "8px", flexWrap: "wrap" }}>
                {Object.entries(a.permissions || {}).map(([key, val]) => (
                  <span key={key} style={{ padding: "3px 10px", borderRadius: "8px", fontSize: "11.5px", fontWeight: "600", backgroundColor: val ? "#d1fae5" : "#f1f5f9", color: val ? "#065f46" : "#94a3b8" }}>
                    {val ? "✓ " : "✗ "}{key.replace(/([A-Z])/g, " $1")}
                  </span>
                ))}
              </div>
            </div>

            {/* Creator Recommendations for this campaign */}
            {recsForCampaign.length > 0 && (
              <div>
                <div style={{ fontSize: "11px", fontWeight: "700", color: "#64748b", letterSpacing: "0.5px", textTransform: "uppercase", marginBottom: "8px" }}>
                  Creator Recommendations
                </div>
                {recsForCampaign.map((r) => (
                  <div key={r.id} style={{ padding: "10px 12px", backgroundColor: "#ffffff", borderRadius: "8px", border: "1px solid #e2e8f0", marginBottom: "6px", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                    <div>
                      <span style={{ fontSize: "12.5px", fontWeight: "600", color: "#0f172a" }}>{r.creatorName}</span>
                      <span style={{ marginLeft: 8, fontSize: "11.5px", color: "#64748b" }}>Match: {r.matchScore}%</span>
                    </div>
                    <span style={{ padding: "2px 8px", borderRadius: "20px", fontSize: "11px", fontWeight: "700", color: r.status === "approved" ? "#065f46" : r.status === "rejected" ? "#991b1b" : "#7c3aed", backgroundColor: r.status === "approved" ? "#d1fae5" : r.status === "rejected" ? "#fee2e2" : "#f5f3ff" }}>
                      {r.status}
                    </span>
                  </div>
                ))}
              </div>
            )}

            {a.status === "accepted" && (
              <button
                onClick={() => onNavigate("matches")}
                style={{ marginTop: "10px", display: "flex", alignItems: "center", gap: "6px", padding: "8px 16px", borderRadius: "8px", backgroundColor: accentLight, border: `1px solid ${theme?.accentBorder || "#99f6e4"}`, color: accent, fontWeight: "600", fontSize: "12.5px", cursor: "pointer" }}
              >
                <Sparkles size={14} />
                Recommend a Creator
              </button>
            )}
          </div>
        )}
      </div>
    );
  };

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "24px" }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
        <div>
          <h2 style={{ margin: 0, fontSize: "20px", fontWeight: "800", color: "#0f172a" }}>Assigned Campaigns</h2>
          <p style={{ margin: "4px 0 0", fontSize: "13px", color: "#64748b" }}>Campaigns brands have entrusted to your agency</p>
        </div>
        <div style={{ fontSize: "12.5px", fontWeight: "600", color: "#64748b", padding: "8px 14px", borderRadius: "8px", backgroundColor: "#f8fafc", border: "1px solid #e2e8f0" }}>
          {assignments.length} total · {pending.length} pending
        </div>
      </div>

      {assignments.length === 0 ? (
        <div style={{ backgroundColor: "#ffffff", border: "1px solid #e2e8f0", borderRadius: "16px", padding: "60px 20px", textAlign: "center" }}>
          <Layers size={40} color="#cbd5e1" style={{ marginBottom: 14 }} />
          <h3 style={{ margin: "0 0 8px", fontSize: "16px", fontWeight: "700", color: "#475569" }}>No Assigned Campaigns</h3>
          <p style={{ margin: 0, fontSize: "13px", color: "#94a3b8" }}>
            When a Marketing team assigns a campaign to your agency, it will appear here.
          </p>
        </div>
      ) : (
        <>
          {pending.length > 0 && (
            <div>
              <div style={{ fontSize: "12px", fontWeight: "700", color: "#92400e", textTransform: "uppercase", letterSpacing: "0.5px", marginBottom: "10px" }}>
                ⏳ Pending Response ({pending.length})
              </div>
              <div style={{ display: "flex", flexDirection: "column", gap: "12px" }}>
                {pending.map(renderAssignmentCard)}
              </div>
            </div>
          )}

          {accepted.length > 0 && (
            <div>
              <div style={{ fontSize: "12px", fontWeight: "700", color: "#065f46", textTransform: "uppercase", letterSpacing: "0.5px", marginBottom: "10px" }}>
                ✓ Active Assignments ({accepted.length})
              </div>
              <div style={{ display: "flex", flexDirection: "column", gap: "12px" }}>
                {accepted.map(renderAssignmentCard)}
              </div>
            </div>
          )}

          {others.length > 0 && (
            <div>
              <div style={{ fontSize: "12px", fontWeight: "700", color: "#64748b", textTransform: "uppercase", letterSpacing: "0.5px", marginBottom: "10px" }}>
                Past Assignments ({others.length})
              </div>
              <div style={{ display: "flex", flexDirection: "column", gap: "12px" }}>
                {others.map(renderAssignmentCard)}
              </div>
            </div>
          )}
        </>
      )}
    </div>
  );
}
