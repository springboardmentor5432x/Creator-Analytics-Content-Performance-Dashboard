import React from "react";
import { Compass, Layers, ArrowRight, Sparkles } from "lucide-react";
import { getLocalCampaigns } from "../../marketing/campaignService";

export default function AgencyBrandOpportunities({
  user,
  userProfile,
  theme,
  assignments = [],
  relationships = [],
  onRefresh,
  onNavigate,
}) {
  const accent = theme?.accent || "#0d9488";
  const accentLight = theme?.accentLight || "#f0fdfa";

  // Get all campaigns from local store to find opportunities
  const allCampaigns = getLocalCampaigns ? getLocalCampaigns() : [];
  const assignedCampaignIds = new Set(assignments.map((a) => a.campaignId));

  // Campaigns not yet assigned to this agency
  const openOpportunities = allCampaigns.filter(
    (c) => c.status === "active" && !assignedCampaignIds.has(c.id)
  );

  // Accepted assignments = active brand relationships
  const activeBrandCount = assignments.filter((a) => a.status === "accepted").length;
  const activeCreatorCount = relationships.filter((r) => r.status === "active").length;

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "24px" }}>
      {/* Header */}
      <div>
        <h2 style={{ margin: 0, fontSize: "20px", fontWeight: "800", color: "#0f172a" }}>Brand Opportunities</h2>
        <p style={{ margin: "4px 0 0", fontSize: "13px", color: "#64748b" }}>
          Active campaigns on the platform that your roster creators could be matched to
        </p>
      </div>

      {/* Agency Strength Summary */}
      <div style={{ backgroundColor: accentLight, border: `1px solid ${theme?.accentBorder || "#99f6e4"}`, borderRadius: "14px", padding: "18px 22px" }}>
        <div style={{ fontSize: "13px", fontWeight: "700", color: accent, marginBottom: "10px" }}>Agency Overview</div>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: "12px" }}>
          {[
            { label: "Brand Relationships", value: activeBrandCount },
            { label: "Roster Creators", value: activeCreatorCount },
            { label: "Assigned Campaigns", value: assignments.filter((a) => a.status === "accepted").length },
          ].map((s) => (
            <div key={s.label} style={{ textAlign: "center" }}>
              <div style={{ fontSize: "24px", fontWeight: "800", color: "#0f172a" }}>{s.value}</div>
              <div style={{ fontSize: "11.5px", color: "#64748b" }}>{s.label}</div>
            </div>
          ))}
        </div>
      </div>

      {/* Open Campaign Opportunities */}
      <div>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "14px" }}>
          <div style={{ fontSize: "14px", fontWeight: "700", color: "#0f172a" }}>
            Active Campaigns on Platform ({openOpportunities.length})
          </div>
          <div style={{ fontSize: "12px", color: "#64748b" }}>
            Your roster creators can be matched to these
          </div>
        </div>

        {openOpportunities.length === 0 ? (
          <div style={{ backgroundColor: "#ffffff", border: "1px solid #e2e8f0", borderRadius: "14px", padding: "48px 20px", textAlign: "center" }}>
            <Compass size={36} color="#cbd5e1" style={{ marginBottom: 12 }} />
            <p style={{ margin: 0, fontSize: "13px", color: "#94a3b8" }}>
              No additional open campaigns at the moment. All active campaigns are already in your pipeline.
            </p>
          </div>
        ) : (
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(320px, 1fr))", gap: "14px" }}>
            {openOpportunities.map((c) => (
              <div key={c.id} style={{ backgroundColor: "#ffffff", border: "1px solid #e2e8f0", borderRadius: "14px", padding: "18px 20px" }}>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: "10px" }}>
                  <span style={{ padding: "3px 10px", borderRadius: "20px", fontSize: "11.5px", fontWeight: "700", color: "#065f46", backgroundColor: "#d1fae5" }}>
                    Active
                  </span>
                  {c.budget && (
                    <span style={{ fontSize: "12px", fontWeight: "700", color: accent }}>{c.budget}</span>
                  )}
                </div>
                <h4 style={{ margin: "0 0 5px", fontSize: "14px", fontWeight: "700", color: "#0f172a" }}>
                  {c.title || c.name || "Campaign"}
                </h4>
                <p style={{ margin: "0 0 12px", fontSize: "12.5px", color: "#64748b", lineHeight: 1.5 }}>
                  {c.description?.slice(0, 100) || "No description available."}
                  {(c.description?.length || 0) > 100 ? "…" : ""}
                </p>

                {c.niche && (
                  <div style={{ display: "flex", gap: "6px", flexWrap: "wrap", marginBottom: "12px" }}>
                    <span style={{ padding: "2px 8px", borderRadius: "6px", fontSize: "11.5px", fontWeight: "600", backgroundColor: "#f0f9ff", color: "#0284c7" }}>
                      {c.niche}
                    </span>
                    {c.platforms?.map((p) => (
                      <span key={p} style={{ padding: "2px 8px", borderRadius: "6px", fontSize: "11.5px", fontWeight: "600", backgroundColor: "#f8fafc", color: "#475569" }}>
                        {p}
                      </span>
                    ))}
                  </div>
                )}

                <button
                  onClick={() => onNavigate("matches")}
                  style={{ display: "flex", alignItems: "center", gap: "5px", padding: "7px 14px", borderRadius: "8px", backgroundColor: accentLight, border: `1px solid ${theme?.accentBorder || "#99f6e4"}`, color: accent, fontWeight: "600", fontSize: "12.5px", cursor: "pointer" }}
                >
                  <Sparkles size={13} />
                  Match Creator
                </button>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
