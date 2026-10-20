import React, { useState } from "react";
import { Sparkles, Star, CheckCircle2, XCircle, Send, ChevronDown, ChevronUp } from "lucide-react";
import { recommendCreatorForCampaign, updateRecommendationStatus } from "../agencyService";

export default function AgencyCreatorMatches({
  user,
  userProfile,
  theme,
  assignments = [],
  relationships = [],
  recommendations = [],
  onRefresh,
}) {
  const accent = theme?.accent || "#0d9488";
  const accentLight = theme?.accentLight || "#f0fdfa";
  const [selectedCampaign, setSelectedCampaign] = useState("");
  const [selectedCreator, setSelectedCreator] = useState("");
  const [pitchNotes, setPitchNotes] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [successMsg, setSuccessMsg] = useState("");

  const acceptedAssignments = assignments.filter((a) => a.status === "accepted");
  const activeCreators = relationships.filter((r) => r.status === "active");

  const handleRecommend = async () => {
    if (!selectedCampaign || !selectedCreator) return;
    setSubmitting(true);
    try {
      const campaign = acceptedAssignments.find((a) => a.campaignId === selectedCampaign);
      const creator = activeCreators.find((r) => r.creatorId === selectedCreator);
      await recommendCreatorForCampaign({
        campaignId: selectedCampaign,
        campaignTitle: campaign?.campaignTitle || "",
        brandId: campaign?.brandId || "",
        agencyId: user?.uid || "usr_agency_demo",
        agencyName: userProfile?.fullName || "Agency",
        creatorId: creator?.creatorId || "",
        creatorName: creator?.creatorName || "",
        creatorEmail: creator?.creatorEmail || "",
        pitchNotes,
        matchScore: 80,
        matchReasons: ["Agency vetted", "Audience overlap", "Content style fit"],
      });
      setSuccessMsg(`Successfully recommended ${creator?.creatorName} for ${campaign?.campaignTitle}!`);
      setSelectedCampaign("");
      setSelectedCreator("");
      setPitchNotes("");
      onRefresh();
      setTimeout(() => setSuccessMsg(""), 4000);
    } catch (err) {
      console.warn("Recommend error:", err);
    } finally {
      setSubmitting(false);
    }
  };

  const matchStatusColor = (status) => {
    const map = {
      recommended: { color: "#7c3aed", bg: "#f5f3ff" },
      invited: { color: "#0284c7", bg: "#f0f9ff" },
      approved: { color: "#065f46", bg: "#d1fae5" },
      rejected: { color: "#991b1b", bg: "#fee2e2" },
    };
    return map[status] || { color: "#64748b", bg: "#f1f5f9" };
  };

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "24px" }}>
      {/* Header */}
      <div>
        <h2 style={{ margin: 0, fontSize: "20px", fontWeight: "800", color: "#0f172a" }}>Creator Matches</h2>
        <p style={{ margin: "4px 0 0", fontSize: "13px", color: "#64748b" }}>
          Recommend your roster creators to brand campaigns you manage
        </p>
      </div>

      {/* Recommend Form */}
      {acceptedAssignments.length > 0 && activeCreators.length > 0 && (
        <div style={{ backgroundColor: "#ffffff", border: "1px solid #e2e8f0", borderRadius: "16px", padding: "22px" }}>
          <div style={{ fontSize: "14px", fontWeight: "700", color: "#0f172a", marginBottom: "16px", display: "flex", alignItems: "center", gap: "8px" }}>
            <Sparkles size={16} color={accent} />
            Recommend a Creator for a Campaign
          </div>

          {successMsg && (
            <div style={{ padding: "10px 14px", borderRadius: "8px", backgroundColor: "#d1fae5", border: "1px solid #a7f3d0", color: "#065f46", fontSize: "13px", fontWeight: "600", marginBottom: "14px" }}>
              ✓ {successMsg}
            </div>
          )}

          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "14px", marginBottom: "14px" }}>
            <div>
              <label style={{ display: "block", fontSize: "11.5px", fontWeight: "700", color: "#64748b", marginBottom: "6px", textTransform: "uppercase", letterSpacing: "0.5px" }}>
                Select Campaign
              </label>
              <select
                value={selectedCampaign}
                onChange={(e) => setSelectedCampaign(e.target.value)}
                style={{ width: "100%", padding: "9px 12px", borderRadius: "8px", border: "1px solid #e2e8f0", fontSize: "13px", color: "#0f172a", backgroundColor: "#ffffff", boxSizing: "border-box" }}
              >
                <option value="">— Choose a Campaign —</option>
                {acceptedAssignments.map((a) => (
                  <option key={a.campaignId} value={a.campaignId}>
                    {a.campaignTitle}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label style={{ display: "block", fontSize: "11.5px", fontWeight: "700", color: "#64748b", marginBottom: "6px", textTransform: "uppercase", letterSpacing: "0.5px" }}>
                Select Creator
              </label>
              <select
                value={selectedCreator}
                onChange={(e) => setSelectedCreator(e.target.value)}
                style={{ width: "100%", padding: "9px 12px", borderRadius: "8px", border: "1px solid #e2e8f0", fontSize: "13px", color: "#0f172a", backgroundColor: "#ffffff", boxSizing: "border-box" }}
              >
                <option value="">— Choose a Creator —</option>
                {activeCreators.map((r) => (
                  <option key={r.creatorId} value={r.creatorId}>
                    {r.creatorName} ({r.creatorNiche || r.creatorFollowers || ""})
                  </option>
                ))}
              </select>
            </div>
          </div>

          <div style={{ marginBottom: "14px" }}>
            <label style={{ display: "block", fontSize: "11.5px", fontWeight: "700", color: "#64748b", marginBottom: "6px", textTransform: "uppercase", letterSpacing: "0.5px" }}>
              Pitch Notes (why this creator?)
            </label>
            <textarea
              value={pitchNotes}
              onChange={(e) => setPitchNotes(e.target.value)}
              placeholder="Describe why this creator is a great fit for this campaign…"
              style={{ width: "100%", padding: "9px 12px", borderRadius: "8px", border: "1px solid #e2e8f0", fontSize: "13px", color: "#334155", resize: "vertical", minHeight: "80px", boxSizing: "border-box", fontFamily: "inherit" }}
            />
          </div>

          <button
            onClick={handleRecommend}
            disabled={!selectedCampaign || !selectedCreator || submitting}
            style={{ display: "flex", alignItems: "center", gap: "7px", padding: "10px 22px", borderRadius: "8px", backgroundColor: selectedCampaign && selectedCreator ? accent : "#e2e8f0", border: "none", color: selectedCampaign && selectedCreator ? "#ffffff" : "#94a3b8", fontWeight: "700", fontSize: "13px", cursor: selectedCampaign && selectedCreator ? "pointer" : "not-allowed", transition: "background-color 0.15s" }}
          >
            <Send size={14} />
            {submitting ? "Submitting…" : "Submit Recommendation to Brand"}
          </button>
        </div>
      )}

      {/* All Recommendations */}
      <div>
        <div style={{ fontSize: "13px", fontWeight: "700", color: "#0f172a", marginBottom: "14px" }}>
          All Creator Recommendations ({recommendations.length})
        </div>

        {recommendations.length === 0 ? (
          <div style={{ backgroundColor: "#ffffff", border: "1px solid #e2e8f0", borderRadius: "14px", padding: "48px 20px", textAlign: "center" }}>
            <Sparkles size={36} color="#cbd5e1" style={{ marginBottom: 12 }} />
            <p style={{ margin: 0, fontSize: "13px", color: "#94a3b8" }}>
              No recommendations yet. Accept a brand campaign assignment and have creators on your roster to start recommending.
            </p>
          </div>
        ) : (
          <div style={{ display: "flex", flexDirection: "column", gap: "12px" }}>
            {recommendations.map((r) => {
              const sc = matchStatusColor(r.status);
              return (
                <div key={r.id} style={{ backgroundColor: "#ffffff", border: "1px solid #e2e8f0", borderRadius: "12px", padding: "16px 20px" }}>
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
                    <div>
                      <div style={{ fontSize: "13px", fontWeight: "700", color: "#0f172a" }}>
                        {r.creatorName} → {r.campaignTitle}
                      </div>
                      <div style={{ fontSize: "12px", color: "#64748b", marginTop: "2px" }}>
                        Match Score: <strong style={{ color: accent }}>{r.matchScore}%</strong>
                        {r.createdAt && <span style={{ marginLeft: 12 }}>{new Date(r.createdAt).toLocaleDateString()}</span>}
                      </div>
                    </div>
                    <span style={{ padding: "3px 10px", borderRadius: "20px", fontSize: "11.5px", fontWeight: "700", color: sc.color, backgroundColor: sc.bg }}>
                      {r.status}
                    </span>
                  </div>

                  {r.matchReasons?.length > 0 && (
                    <div style={{ marginTop: "10px", display: "flex", gap: "6px", flexWrap: "wrap" }}>
                      {r.matchReasons.map((reason, i) => (
                        <span key={i} style={{ padding: "2px 8px", borderRadius: "6px", fontSize: "11.5px", backgroundColor: "#f8fafc", color: "#475569", border: "1px solid #e2e8f0" }}>
                          ✓ {reason}
                        </span>
                      ))}
                    </div>
                  )}

                  {r.pitchNotes && (
                    <p style={{ margin: "10px 0 0", fontSize: "12.5px", color: "#64748b", lineHeight: 1.5 }}>{r.pitchNotes}</p>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
