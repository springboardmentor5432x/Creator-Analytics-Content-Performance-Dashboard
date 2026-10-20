import React, { useState, useEffect } from "react";
import { CheckSquare, Clock, CheckCircle2, AlertCircle, ExternalLink, RefreshCw } from "lucide-react";
import { getLocalDeliverables } from "../../marketing/campaignService";

function statusChip(status) {
  const map = {
    pending: { color: "#92400e", bg: "#fef3c7", label: "Pending" },
    submitted: { color: "#0284c7", bg: "#f0f9ff", label: "Submitted" },
    under_review: { color: "#7c3aed", bg: "#f5f3ff", label: "Under Review" },
    revision_requested: { color: "#b45309", bg: "#fef3c7", label: "Revision Needed" },
    approved: { color: "#065f46", bg: "#d1fae5", label: "Approved" },
    rejected: { color: "#991b1b", bg: "#fee2e2", label: "Rejected" },
  };
  const s = map[status] || { color: "#64748b", bg: "#f1f5f9", label: status };
  return (
    <span style={{ padding: "3px 10px", borderRadius: "20px", fontSize: "11.5px", fontWeight: "700", color: s.color, backgroundColor: s.bg }}>
      {s.label}
    </span>
  );
}

export default function AgencyDeliverables({ user, userProfile, theme, assignments = [], onRefresh }) {
  const accent = theme?.accent || "#0d9488";
  const accentLight = theme?.accentLight || "#f0fdfa";
  const [deliverables, setDeliverables] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    try {
      const all = getLocalDeliverables ? getLocalDeliverables() : [];
      // Filter to deliverables for campaigns this agency manages
      const assignedCampaignIds = new Set(assignments.map((a) => a.campaignId));
      const agencyDels = all.filter((d) => assignedCampaignIds.has(d.campaignId));
      setDeliverables(agencyDels);
    } catch (err) {
      console.warn("Deliverables load error:", err);
    } finally {
      setLoading(false);
    }
  }, [assignments]);

  const byStatus = (status) => deliverables.filter((d) => d.status === status);

  const needsReview = deliverables.filter((d) => ["submitted", "under_review"].includes(d.status));
  const approved = deliverables.filter((d) => d.status === "approved");
  const pending = deliverables.filter((d) => d.status === "pending");
  const revised = deliverables.filter((d) => d.status === "revision_requested");

  if (loading) {
    return <div style={{ padding: "60px", textAlign: "center", color: "#64748b" }}>Loading deliverables…</div>;
  }

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "24px" }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
        <div>
          <h2 style={{ margin: 0, fontSize: "20px", fontWeight: "800", color: "#0f172a" }}>Deliverables</h2>
          <p style={{ margin: "4px 0 0", fontSize: "13px", color: "#64748b" }}>
            Track creator content submissions for campaigns you manage
          </p>
        </div>
        <button onClick={onRefresh} style={{ display: "flex", alignItems: "center", gap: "5px", padding: "8px 14px", borderRadius: "8px", backgroundColor: "#f8fafc", border: "1px solid #e2e8f0", color: "#64748b", fontWeight: "600", fontSize: "12.5px", cursor: "pointer" }}>
          <RefreshCw size={13} />
          Refresh
        </button>
      </div>

      {/* Summary Row */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: "12px" }}>
        {[
          { label: "Pending", count: pending.length, color: "#92400e", bg: "#fef3c7" },
          { label: "Needs Review", count: needsReview.length, color: "#7c3aed", bg: "#f5f3ff" },
          { label: "Revision Requested", count: revised.length, color: "#b45309", bg: "#fffbeb" },
          { label: "Approved", count: approved.length, color: "#065f46", bg: "#d1fae5" },
        ].map((s) => (
          <div key={s.label} style={{ backgroundColor: "#ffffff", border: "1px solid #e2e8f0", borderRadius: "12px", padding: "14px 16px", textAlign: "center" }}>
            <div style={{ fontSize: "24px", fontWeight: "800", color: s.color }}>{s.count}</div>
            <div style={{ fontSize: "11.5px", color: "#64748b", marginTop: "3px" }}>{s.label}</div>
          </div>
        ))}
      </div>

      {deliverables.length === 0 ? (
        <div style={{ backgroundColor: "#ffffff", border: "1px solid #e2e8f0", borderRadius: "16px", padding: "60px 20px", textAlign: "center" }}>
          <CheckSquare size={40} color="#cbd5e1" style={{ marginBottom: 14 }} />
          <h3 style={{ margin: "0 0 8px", fontSize: "16px", fontWeight: "700", color: "#475569" }}>No Deliverables Yet</h3>
          <p style={{ margin: 0, fontSize: "13px", color: "#94a3b8" }}>
            When creators submit content for campaigns you manage, deliverables will appear here for review.
          </p>
        </div>
      ) : (
        <div style={{ backgroundColor: "#ffffff", border: "1px solid #e2e8f0", borderRadius: "16px", overflow: "hidden" }}>
          <table style={{ width: "100%", borderCollapse: "collapse", fontSize: "13px" }}>
            <thead>
              <tr style={{ backgroundColor: "#f8fafc", borderBottom: "2px solid #e2e8f0" }}>
                {["Creator", "Campaign", "Type", "Submitted", "Status", "Link"].map((h) => (
                  <th key={h} style={{ textAlign: "left", padding: "12px 16px", color: "#64748b", fontSize: "11.5px", fontWeight: "700", textTransform: "uppercase", letterSpacing: "0.5px" }}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {deliverables.map((d) => (
                <tr key={d.id} style={{ borderBottom: "1px solid #f1f5f9" }}>
                  <td style={{ padding: "12px 16px", fontWeight: "600", color: "#0f172a" }}>
                    {d.creatorName || d.creatorId || "Creator"}
                  </td>
                  <td style={{ padding: "12px 16px", color: "#334155" }}>
                    {d.campaignTitle || d.campaignId || "Campaign"}
                  </td>
                  <td style={{ padding: "12px 16px", color: "#64748b" }}>
                    <span style={{ padding: "2px 8px", borderRadius: "6px", backgroundColor: "#f0f9ff", color: "#0284c7", fontSize: "11.5px", fontWeight: "600" }}>
                      {d.contentType || d.type || "Content"}
                    </span>
                  </td>
                  <td style={{ padding: "12px 16px", color: "#64748b", fontSize: "12px" }}>
                    {d.submittedAt
                      ? new Date(d.submittedAt).toLocaleDateString()
                      : d.createdAt
                      ? new Date(d.createdAt).toLocaleDateString()
                      : "—"}
                  </td>
                  <td style={{ padding: "12px 16px" }}>{statusChip(d.status)}</td>
                  <td style={{ padding: "12px 16px" }}>
                    {d.submissionUrl ? (
                      <a
                        href={d.submissionUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        style={{ display: "flex", alignItems: "center", gap: "4px", color: accent, fontWeight: "600", fontSize: "12.5px", textDecoration: "none" }}
                      >
                        View <ExternalLink size={12} />
                      </a>
                    ) : (
                      <span style={{ color: "#cbd5e1", fontSize: "12px" }}>Not submitted</span>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
