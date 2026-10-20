import React from "react";
import { Handshake, DollarSign, ArrowRight } from "lucide-react";

function statusChip(status) {
  const map = {
    active: { color: "#065f46", bg: "#d1fae5", label: "Active Deal" },
    approved: { color: "#065f46", bg: "#d1fae5", label: "Approved" },
    recommended: { color: "#7c3aed", bg: "#f5f3ff", label: "Recommended" },
    invited: { color: "#0284c7", bg: "#f0f9ff", label: "Invited" },
    rejected: { color: "#991b1b", bg: "#fee2e2", label: "Rejected" },
    ended: { color: "#475569", bg: "#f1f5f9", label: "Ended" },
  };
  const s = map[status] || { color: "#64748b", bg: "#f1f5f9", label: status };
  return (
    <span style={{ padding: "3px 10px", borderRadius: "20px", fontSize: "11.5px", fontWeight: "700", color: s.color, backgroundColor: s.bg }}>
      {s.label}
    </span>
  );
}

export default function AgencyDealsCollaborations({
  user,
  userProfile,
  theme,
  relationships = [],
  recommendations = [],
  onRefresh,
}) {
  const accent = theme?.accent || "#0d9488";
  const accentLight = theme?.accentLight || "#f0fdfa";

  // Active deals = approved recommendations + active representations
  const activeDeals = recommendations.filter((r) => r.status === "approved");
  const allRels = relationships.filter((r) => ["active", "ended"].includes(r.status));

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "24px" }}>
      <div>
        <h2 style={{ margin: 0, fontSize: "20px", fontWeight: "800", color: "#0f172a" }}>Deals & Collaborations</h2>
        <p style={{ margin: "4px 0 0", fontSize: "13px", color: "#64748b" }}>
          Confirmed brand-creator deals your agency has facilitated
        </p>
      </div>

      {/* Deal Summary */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: "14px" }}>
        {[
          { label: "Active Deals", value: activeDeals.length, color: "#065f46", bg: "#d1fae5" },
          { label: "Creator Partnerships", value: allRels.filter((r) => r.status === "active").length, color: accent, bg: accentLight },
          { label: "Total Facilitated", value: recommendations.length, color: "#7c3aed", bg: "#f5f3ff" },
        ].map((s) => (
          <div key={s.label} style={{ backgroundColor: "#ffffff", border: "1px solid #e2e8f0", borderRadius: "12px", padding: "16px 18px", textAlign: "center" }}>
            <div style={{ fontSize: "28px", fontWeight: "800", color: s.color }}>{s.value}</div>
            <div style={{ fontSize: "12px", color: "#64748b", marginTop: "4px" }}>{s.label}</div>
          </div>
        ))}
      </div>

      {/* Active Brand Deals Table */}
      <div style={{ backgroundColor: "#ffffff", border: "1px solid #e2e8f0", borderRadius: "16px", padding: "22px" }}>
        <div style={{ fontSize: "14px", fontWeight: "700", color: "#0f172a", marginBottom: "16px" }}>
          Brand–Creator Deals
        </div>

        {recommendations.length === 0 ? (
          <div style={{ textAlign: "center", padding: "40px 20px" }}>
            <Handshake size={36} color="#cbd5e1" style={{ marginBottom: 12 }} />
            <p style={{ margin: 0, fontSize: "13px", color: "#94a3b8" }}>No deals yet. Recommend creators to brand campaigns to start generating deals.</p>
          </div>
        ) : (
          <div style={{ overflowX: "auto" }}>
            <table style={{ width: "100%", borderCollapse: "collapse", fontSize: "13px" }}>
              <thead>
                <tr style={{ borderBottom: "2px solid #f1f5f9" }}>
                  {["Creator", "Campaign", "Brand", "Match Score", "Status", "Date"].map((h) => (
                    <th key={h} style={{ textAlign: "left", padding: "10px 14px", color: "#64748b", fontSize: "11.5px", fontWeight: "700", textTransform: "uppercase", letterSpacing: "0.5px" }}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {recommendations.map((r) => (
                  <tr key={r.id} style={{ borderBottom: "1px solid #f1f5f9" }}>
                    <td style={{ padding: "12px 14px", fontWeight: "600", color: "#0f172a" }}>{r.creatorName}</td>
                    <td style={{ padding: "12px 14px", color: "#334155" }}>{r.campaignTitle}</td>
                    <td style={{ padding: "12px 14px", color: "#334155" }}>{r.brandId?.replace("usr_", "") || "Brand"}</td>
                    <td style={{ padding: "12px 14px" }}>
                      <span style={{ fontWeight: "700", color: accent }}>{r.matchScore}%</span>
                    </td>
                    <td style={{ padding: "12px 14px" }}>{statusChip(r.status)}</td>
                    <td style={{ padding: "12px 14px", color: "#94a3b8", fontSize: "12px" }}>
                      {r.createdAt ? new Date(r.createdAt).toLocaleDateString() : "—"}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Creator Representation History */}
      {allRels.length > 0 && (
        <div style={{ backgroundColor: "#ffffff", border: "1px solid #e2e8f0", borderRadius: "16px", padding: "22px" }}>
          <div style={{ fontSize: "14px", fontWeight: "700", color: "#0f172a", marginBottom: "16px" }}>
            Creator Representation Agreements
          </div>
          <div style={{ display: "flex", flexDirection: "column", gap: "10px" }}>
            {allRels.map((r) => (
              <div key={r.id} style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "12px 14px", backgroundColor: "#f8fafc", borderRadius: "10px", border: "1px solid #f1f5f9" }}>
                <div>
                  <div style={{ fontSize: "13px", fontWeight: "700", color: "#0f172a" }}>{r.creatorName}</div>
                  <div style={{ fontSize: "11.5px", color: "#64748b" }}>{r.creatorNiche} · {r.creatorFollowers}</div>
                  {r.terms && <div style={{ fontSize: "11.5px", color: "#94a3b8", marginTop: "2px" }}>{r.terms}</div>}
                </div>
                {statusChip(r.status)}
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
