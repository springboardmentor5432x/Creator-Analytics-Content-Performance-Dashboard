import React from "react";
import { BarChart3, TrendingUp, DollarSign, Users, Sparkles, Award } from "lucide-react";

export default function AgencyReports({ user, userProfile, theme, assignments = [], relationships = [], recommendations = [] }) {
  const accent = theme?.accent || "#0d9488";
  const accentLight = theme?.accentLight || "#f0fdfa";

  const activeDeals = recommendations.filter((r) => r.status === "approved").length;
  const activeRoster = relationships.filter((r) => r.status === "active").length;
  const acceptedAssignments = assignments.filter((a) => a.status === "accepted").length;
  const avgMatchScore =
    recommendations.length > 0
      ? Math.round(recommendations.reduce((sum, r) => sum + (r.matchScore || 0), 0) / recommendations.length)
      : 0;

  const kpis = [
    { label: "Active Brand Assignments", value: acceptedAssignments, icon: BarChart3, color: accent, bg: accentLight },
    { label: "Creator Roster Size", value: activeRoster, icon: Users, color: "#7c3aed", bg: "#f5f3ff" },
    { label: "Approved Deals", value: activeDeals, icon: Award, color: "#065f46", bg: "#d1fae5" },
    { label: "Avg. Match Score", value: avgMatchScore ? `${avgMatchScore}%` : "N/A", icon: Sparkles, color: "#f59e0b", bg: "#fffbeb" },
  ];

  // Commission estimates (15% typical agency cut, indicative only)
  const commissionEstimates = recommendations.filter((r) => r.status === "approved").map((r) => ({
    creator: r.creatorName,
    campaign: r.campaignTitle,
    status: r.status,
  }));

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "24px" }}>
      <div>
        <h2 style={{ margin: 0, fontSize: "20px", fontWeight: "800", color: "#0f172a" }}>Reports & Commission</h2>
        <p style={{ margin: "4px 0 0", fontSize: "13px", color: "#64748b" }}>
          Agency performance summary, deal metrics, and commission tracking
        </p>
      </div>

      {/* KPI Grid */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))", gap: "14px" }}>
        {kpis.map((k) => (
          <div key={k.label} style={{ backgroundColor: "#ffffff", border: "1px solid #e2e8f0", borderRadius: "14px", padding: "18px 20px" }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "10px" }}>
              <div style={{ fontSize: "12px", fontWeight: "600", color: "#64748b" }}>{k.label}</div>
              <div style={{ width: 34, height: 34, borderRadius: "10px", backgroundColor: k.bg, display: "flex", alignItems: "center", justifyContent: "center" }}>
                <k.icon size={16} color={k.color} />
              </div>
            </div>
            <div style={{ fontSize: "28px", fontWeight: "800", color: "#0f172a" }}>{k.value}</div>
          </div>
        ))}
      </div>

      {/* Brand Assignment Breakdown */}
      <div style={{ backgroundColor: "#ffffff", border: "1px solid #e2e8f0", borderRadius: "16px", padding: "22px" }}>
        <div style={{ fontSize: "14px", fontWeight: "700", color: "#0f172a", marginBottom: "16px" }}>
          Brand Assignment Status Breakdown
        </div>
        {assignments.length === 0 ? (
          <p style={{ color: "#94a3b8", fontSize: "13px" }}>No assignments to report on.</p>
        ) : (
          <div style={{ display: "flex", flexDirection: "column", gap: "8px" }}>
            {["pending", "accepted", "declined", "revoked"].map((status) => {
              const count = assignments.filter((a) => a.status === status).length;
              const pct = assignments.length ? Math.round((count / assignments.length) * 100) : 0;
              const colors = {
                pending: "#f59e0b",
                accepted: "#0d9488",
                declined: "#ef4444",
                revoked: "#94a3b8",
              };
              return (
                <div key={status} style={{ display: "flex", alignItems: "center", gap: "12px" }}>
                  <div style={{ width: "90px", fontSize: "12px", fontWeight: "600", color: "#64748b", textTransform: "capitalize" }}>{status}</div>
                  <div style={{ flex: 1, height: "8px", backgroundColor: "#f1f5f9", borderRadius: "4px", overflow: "hidden" }}>
                    <div style={{ width: `${pct}%`, height: "100%", backgroundColor: colors[status] || "#94a3b8", borderRadius: "4px", transition: "width 0.5s ease" }} />
                  </div>
                  <div style={{ fontSize: "12px", fontWeight: "700", color: "#0f172a", width: "40px", textAlign: "right" }}>
                    {count} ({pct}%)
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Commission Tracking */}
      <div style={{ backgroundColor: "#ffffff", border: "1px solid #e2e8f0", borderRadius: "16px", padding: "22px" }}>
        <div style={{ fontSize: "14px", fontWeight: "700", color: "#0f172a", marginBottom: "6px" }}>
          Commission Tracking
        </div>
        <div style={{ fontSize: "12.5px", color: "#64748b", marginBottom: "16px" }}>
          Commission is tracked manually based on deal terms agreed with each creator. Actual amounts depend on individual representation agreements.
        </div>

        {commissionEstimates.length === 0 ? (
          <div style={{ padding: "24px", textAlign: "center", color: "#94a3b8", fontSize: "13px" }}>
            No approved deals yet. Commission tracking will appear once deals are approved by brands.
          </div>
        ) : (
          <div style={{ display: "flex", flexDirection: "column", gap: "10px" }}>
            {commissionEstimates.map((c, i) => (
              <div key={i} style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "12px 14px", backgroundColor: "#f8fafc", borderRadius: "8px", border: "1px solid #f1f5f9" }}>
                <div>
                  <div style={{ fontSize: "13px", fontWeight: "700", color: "#0f172a" }}>{c.creator}</div>
                  <div style={{ fontSize: "11.5px", color: "#64748b" }}>{c.campaign}</div>
                </div>
                <div style={{ textAlign: "right" }}>
                  <div style={{ fontSize: "11.5px", color: "#94a3b8" }}>Status</div>
                  <span style={{ fontSize: "12px", fontWeight: "700", color: "#065f46", backgroundColor: "#d1fae5", padding: "2px 8px", borderRadius: "6px" }}>
                    {c.status}
                  </span>
                </div>
              </div>
            ))}
          </div>
        )}

        <div style={{ marginTop: "16px", padding: "12px 16px", backgroundColor: "#f0fdfa", borderRadius: "10px", border: `1px solid ${theme?.accentBorder || "#99f6e4"}` }}>
          <div style={{ fontSize: "12px", fontWeight: "700", color: accent, marginBottom: "4px" }}>ℹ️ Payment Note</div>
          <div style={{ fontSize: "12px", color: "#0f172a" }}>
            Commission payments are handled directly between the agency and creators per their representation agreement. No payment processing occurs within this platform — use this as a reference tracker only.
          </div>
        </div>
      </div>

      {/* Creator Roster Performance */}
      <div style={{ backgroundColor: "#ffffff", border: "1px solid #e2e8f0", borderRadius: "16px", padding: "22px" }}>
        <div style={{ fontSize: "14px", fontWeight: "700", color: "#0f172a", marginBottom: "16px" }}>
          Creator Roster Activity
        </div>
        {relationships.length === 0 ? (
          <p style={{ color: "#94a3b8", fontSize: "13px" }}>No creator relationships to report.</p>
        ) : (
          <div style={{ display: "flex", flexDirection: "column", gap: "10px" }}>
            {relationships.map((r) => {
              const dealsForCreator = recommendations.filter((rec) => rec.creatorId === r.creatorId).length;
              return (
                <div key={r.id} style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "12px 14px", backgroundColor: "#f8fafc", borderRadius: "8px", border: "1px solid #f1f5f9" }}>
                  <div>
                    <div style={{ fontSize: "13px", fontWeight: "700", color: "#0f172a" }}>{r.creatorName}</div>
                    <div style={{ fontSize: "11.5px", color: "#64748b" }}>{r.creatorNiche} · {r.creatorFollowers}</div>
                  </div>
                  <div style={{ textAlign: "right" }}>
                    <div style={{ fontSize: "13px", fontWeight: "800", color: accent }}>{dealsForCreator}</div>
                    <div style={{ fontSize: "11px", color: "#94a3b8" }}>deal{dealsForCreator !== 1 ? "s" : ""} facilitated</div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
