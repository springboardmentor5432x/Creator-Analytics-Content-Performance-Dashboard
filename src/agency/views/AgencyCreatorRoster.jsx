import React, { useState } from "react";
import { Users, Video, Camera, Globe, UserMinus, Mail, ExternalLink } from "lucide-react";
import { endRepresentationRelationship } from "../agencyService";

function platformIcon(platform) {
  const lp = platform?.toLowerCase() || "";
  if (lp.includes("youtube")) return <Video size={12} color="#ef4444" />;
  if (lp.includes("instagram")) return <Camera size={12} color="#e1306c" />;
  return <Globe size={12} color="#0284c7" />;
}

export default function AgencyCreatorRoster({ user, userProfile, theme, relationships = [], onRefresh }) {
  const accent = theme?.accent || "#0d9488";
  const accentLight = theme?.accentLight || "#f0fdfa";
  const [confirmEnd, setConfirmEnd] = useState(null);
  const [ending, setEnding] = useState(null);

  const active = relationships.filter((r) => r.status === "active");
  const ended = relationships.filter((r) => r.status === "ended");

  const handleEndRepresentation = async (rel) => {
    setEnding(rel.id);
    try {
      await endRepresentationRelationship(
        rel.id,
        user?.uid || "usr_agency_demo",
        "Agency"
      );
      setConfirmEnd(null);
      onRefresh();
    } catch (err) {
      console.warn("End representation error:", err);
      onRefresh();
    } finally {
      setEnding(null);
    }
  };

  const renderCreatorCard = (r) => (
    <div key={r.id} style={{ backgroundColor: "#ffffff", border: "1px solid #e2e8f0", borderRadius: "14px", padding: "20px 22px" }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
        {/* Creator Info */}
        <div style={{ display: "flex", alignItems: "center", gap: "14px" }}>
          <div style={{ width: 48, height: 48, borderRadius: "12px", backgroundColor: accentLight, border: `1px solid ${theme?.accentBorder || "#99f6e4"}`, display: "flex", alignItems: "center", justifyContent: "center", fontSize: "18px", fontWeight: "800", color: accent }}>
            {(r.creatorName || "C").charAt(0).toUpperCase()}
          </div>
          <div>
            <div style={{ fontSize: "15px", fontWeight: "700", color: "#0f172a" }}>{r.creatorName}</div>
            <div style={{ fontSize: "12px", color: "#64748b" }}>{r.creatorHandle || r.creatorEmail}</div>
            <div style={{ fontSize: "12px", color: "#64748b", marginTop: "2px" }}>
              {r.creatorNiche}
              {r.creatorFollowers && <span style={{ marginLeft: 8, fontWeight: "600" }}>{r.creatorFollowers} followers</span>}
            </div>
          </div>
        </div>

        {/* Status + Actions */}
        <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
          <span style={{ padding: "3px 10px", borderRadius: "20px", fontSize: "11.5px", fontWeight: "700", color: r.status === "active" ? "#065f46" : "#475569", backgroundColor: r.status === "active" ? "#d1fae5" : "#f1f5f9" }}>
            {r.status === "active" ? "● Active" : r.status}
          </span>
          {r.status === "active" && (
            <button
              onClick={() => setConfirmEnd(r)}
              style={{ padding: "6px 12px", borderRadius: "8px", backgroundColor: "#fff1f2", border: "1px solid #fecdd3", color: "#ef4444", fontWeight: "600", fontSize: "12px", cursor: "pointer", display: "flex", alignItems: "center", gap: "4px" }}
            >
              <UserMinus size={13} />
              End
            </button>
          )}
        </div>
      </div>

      {/* Platforms */}
      {r.creatorPlatforms && r.creatorPlatforms.length > 0 && (
        <div style={{ marginTop: "12px", display: "flex", gap: "6px", flexWrap: "wrap" }}>
          {r.creatorPlatforms.map((p) => (
            <span key={p} style={{ display: "flex", alignItems: "center", gap: "4px", padding: "3px 8px", borderRadius: "6px", backgroundColor: "#f8fafc", border: "1px solid #e2e8f0", fontSize: "11.5px", fontWeight: "600", color: "#475569" }}>
              {platformIcon(p)}{p}
            </span>
          ))}
        </div>
      )}

      {/* Terms */}
      {r.terms && (
        <div style={{ marginTop: "10px", padding: "8px 12px", backgroundColor: "#f8fafc", borderRadius: "8px", fontSize: "12px", color: "#64748b", borderLeft: `3px solid ${accent}` }}>
          {r.terms}
        </div>
      )}

      {/* Started date */}
      {r.updatedAt && (
        <div style={{ marginTop: "8px", fontSize: "11.5px", color: "#94a3b8" }}>
          Representation since {new Date(r.updatedAt).toLocaleDateString()}
        </div>
      )}
    </div>
  );

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "24px" }}>
      {/* Header */}
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
        <div>
          <h2 style={{ margin: 0, fontSize: "20px", fontWeight: "800", color: "#0f172a" }}>Creator Roster</h2>
          <p style={{ margin: "4px 0 0", fontSize: "13px", color: "#64748b" }}>
            Creators currently represented by your agency
          </p>
        </div>
        <div style={{ padding: "8px 16px", borderRadius: "8px", backgroundColor: accentLight, border: `1px solid ${theme?.accentBorder || "#99f6e4"}`, fontSize: "12.5px", fontWeight: "600", color: accent }}>
          {active.length} Active Creator{active.length !== 1 ? "s" : ""}
        </div>
      </div>

      {active.length === 0 && ended.length === 0 ? (
        <div style={{ backgroundColor: "#ffffff", border: "1px solid #e2e8f0", borderRadius: "16px", padding: "60px 20px", textAlign: "center" }}>
          <Users size={40} color="#cbd5e1" style={{ marginBottom: 14 }} />
          <h3 style={{ margin: "0 0 8px", fontSize: "16px", fontWeight: "700", color: "#475569" }}>Your Roster is Empty</h3>
          <p style={{ margin: 0, fontSize: "13px", color: "#94a3b8" }}>
            Accept creator requests or invite creators to your roster. Active representations appear here.
          </p>
        </div>
      ) : (
        <>
          {active.length > 0 && (
            <div>
              <div style={{ fontSize: "12px", fontWeight: "700", color: "#065f46", textTransform: "uppercase", letterSpacing: "0.5px", marginBottom: "12px" }}>
                Active Representations ({active.length})
              </div>
              <div style={{ display: "flex", flexDirection: "column", gap: "12px" }}>
                {active.map(renderCreatorCard)}
              </div>
            </div>
          )}

          {ended.length > 0 && (
            <div>
              <div style={{ fontSize: "12px", fontWeight: "700", color: "#94a3b8", textTransform: "uppercase", letterSpacing: "0.5px", marginBottom: "12px" }}>
                Past Representations ({ended.length})
              </div>
              <div style={{ display: "flex", flexDirection: "column", gap: "12px" }}>
                {ended.map(renderCreatorCard)}
              </div>
            </div>
          )}
        </>
      )}

      {/* Confirm End Dialog */}
      {confirmEnd && (
        <div style={{ position: "fixed", inset: 0, backgroundColor: "rgba(15,23,42,0.5)", zIndex: 200, display: "flex", alignItems: "center", justifyContent: "center" }}>
          <div style={{ backgroundColor: "#ffffff", borderRadius: "18px", padding: "28px 32px", maxWidth: "400px", width: "90%", boxShadow: "0 20px 60px rgba(15,23,42,0.2)" }}>
            <h3 style={{ margin: "0 0 10px", fontSize: "17px", fontWeight: "700", color: "#0f172a" }}>End Representation?</h3>
            <p style={{ margin: "0 0 22px", fontSize: "13.5px", color: "#475569", lineHeight: 1.6 }}>
              This will end your agency's representation of <strong>{confirmEnd.creatorName}</strong>. This action cannot be undone.
            </p>
            <div style={{ display: "flex", gap: "10px", justifyContent: "flex-end" }}>
              <button onClick={() => setConfirmEnd(null)} style={{ padding: "9px 18px", borderRadius: "8px", border: "1px solid #e2e8f0", backgroundColor: "#ffffff", color: "#475569", fontWeight: "600", fontSize: "13px", cursor: "pointer" }}>
                Cancel
              </button>
              <button
                onClick={() => handleEndRepresentation(confirmEnd)}
                disabled={!!ending}
                style={{ padding: "9px 18px", borderRadius: "8px", border: "none", backgroundColor: "#ef4444", color: "#ffffff", fontWeight: "700", fontSize: "13px", cursor: "pointer", opacity: ending ? 0.6 : 1 }}
              >
                {ending ? "Ending…" : "End Representation"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
