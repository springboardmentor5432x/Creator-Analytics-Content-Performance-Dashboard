import React, { useState } from "react";
import { UserCheck, CheckCircle2, XCircle, Clock, MessageSquare } from "lucide-react";
import { respondToRepresentationRelationship } from "../agencyService";

export default function AgencyCreatorRequests({ user, userProfile, theme, relationships = [], onRefresh }) {
  const accent = theme?.accent || "#0d9488";
  const accentLight = theme?.accentLight || "#f0fdfa";
  const [responding, setResponding] = useState(null);
  const [responseMsg, setResponseMsg] = useState("");

  // Only show pending requests initiated by creators
  const incomingRequests = relationships.filter(
    (r) => r.status === "pending" && r.initiatedBy === "creator"
  );
  // Outgoing invites (agency invited creator, waiting for creator to accept)
  const outgoingInvites = relationships.filter(
    (r) => r.status === "pending" && r.initiatedBy === "agency"
  );

  const handleRespond = async (rel, action) => {
    setResponding(rel.id);
    try {
      await respondToRepresentationRelationship(
        rel.id,
        action,
        user?.uid || "usr_agency_demo",
        "Agency",
        responseMsg || (action === "accepted" ? "Welcome to Vanguard Talent Agency!" : "Thank you for your interest.")
      );
      setResponseMsg("");
      onRefresh();
    } catch (err) {
      console.warn("Response error:", err);
      onRefresh();
    } finally {
      setResponding(null);
    }
  };

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "24px" }}>
      {/* Header */}
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
        <div>
          <h2 style={{ margin: 0, fontSize: "20px", fontWeight: "800", color: "#0f172a" }}>Creator Requests</h2>
          <p style={{ margin: "4px 0 0", fontSize: "13px", color: "#64748b" }}>
            Creators requesting representation and your pending invitations
          </p>
        </div>
        {incomingRequests.length > 0 && (
          <span style={{ padding: "6px 14px", borderRadius: "20px", fontSize: "12.5px", fontWeight: "700", backgroundColor: "#fee2e2", color: "#991b1b" }}>
            {incomingRequests.length} Needs Response
          </span>
        )}
      </div>

      {/* Incoming Creator Requests */}
      <div>
        <div style={{ fontSize: "12px", fontWeight: "700", color: "#334155", textTransform: "uppercase", letterSpacing: "0.5px", marginBottom: "12px" }}>
          Incoming Representation Requests ({incomingRequests.length})
        </div>

        {incomingRequests.length === 0 ? (
          <div style={{ backgroundColor: "#ffffff", border: "1px solid #e2e8f0", borderRadius: "14px", padding: "36px 20px", textAlign: "center" }}>
            <UserCheck size={36} color="#cbd5e1" style={{ marginBottom: 12 }} />
            <p style={{ margin: 0, fontSize: "13px", color: "#94a3b8" }}>No pending creator requests at this time.</p>
          </div>
        ) : (
          <div style={{ display: "flex", flexDirection: "column", gap: "14px" }}>
            {incomingRequests.map((r) => (
              <div key={r.id} style={{ backgroundColor: "#ffffff", border: "1px solid #fde68a", borderRadius: "14px", padding: "20px 22px" }}>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: "12px" }}>
                  <div style={{ display: "flex", alignItems: "center", gap: "12px" }}>
                    <div style={{ width: 44, height: 44, borderRadius: "12px", backgroundColor: "#f5f3ff", display: "flex", alignItems: "center", justifyContent: "center", fontSize: "16px", fontWeight: "800", color: "#7c3aed" }}>
                      {(r.creatorName || "C").charAt(0).toUpperCase()}
                    </div>
                    <div>
                      <div style={{ fontSize: "14.5px", fontWeight: "700", color: "#0f172a" }}>{r.creatorName}</div>
                      <div style={{ fontSize: "12px", color: "#64748b" }}>
                        {r.creatorHandle || r.creatorEmail}
                        {r.creatorNiche && <span style={{ marginLeft: 8 }}>· {r.creatorNiche}</span>}
                      </div>
                    </div>
                  </div>
                  <div style={{ display: "flex", alignItems: "center", gap: "6px" }}>
                    <Clock size={13} color="#f59e0b" />
                    <span style={{ fontSize: "11.5px", color: "#92400e", fontWeight: "600" }}>
                      {new Date(r.createdAt).toLocaleDateString()}
                    </span>
                  </div>
                </div>

                {r.message && (
                  <div style={{ padding: "10px 14px", backgroundColor: "#fffbeb", borderRadius: "8px", marginBottom: "14px", borderLeft: "3px solid #f59e0b" }}>
                    <div style={{ display: "flex", gap: "6px", alignItems: "flex-start" }}>
                      <MessageSquare size={13} color="#f59e0b" style={{ flexShrink: 0, marginTop: 2 }} />
                      <p style={{ margin: 0, fontSize: "12.5px", color: "#78350f", lineHeight: 1.6 }}>{r.message}</p>
                    </div>
                  </div>
                )}

                {r.terms && (
                  <div style={{ padding: "8px 12px", backgroundColor: "#f8fafc", borderRadius: "8px", marginBottom: "14px", fontSize: "12px", color: "#475569" }}>
                    <strong>Proposed Terms:</strong> {r.terms}
                  </div>
                )}

                {/* Creator Stats */}
                <div style={{ display: "flex", gap: "12px", flexWrap: "wrap", marginBottom: "14px" }}>
                  {r.creatorFollowers && (
                    <span style={{ fontSize: "12px", fontWeight: "600", color: "#475569", padding: "3px 10px", backgroundColor: "#f1f5f9", borderRadius: "6px" }}>
                      {r.creatorFollowers} followers
                    </span>
                  )}
                  {r.creatorPlatforms?.map((p) => (
                    <span key={p} style={{ fontSize: "12px", fontWeight: "600", color: "#475569", padding: "3px 10px", backgroundColor: "#f1f5f9", borderRadius: "6px" }}>
                      {p}
                    </span>
                  ))}
                </div>

                {/* Optional response message */}
                <textarea
                  placeholder="Optional: add a note to the creator…"
                  value={responding === r.id ? responseMsg : ""}
                  onChange={(e) => { setResponding(r.id); setResponseMsg(e.target.value); }}
                  style={{ width: "100%", padding: "8px 12px", borderRadius: "8px", border: "1px solid #e2e8f0", fontSize: "12.5px", color: "#334155", resize: "vertical", minHeight: "60px", boxSizing: "border-box", marginBottom: "12px", fontFamily: "inherit" }}
                />

                <div style={{ display: "flex", gap: "10px" }}>
                  <button
                    onClick={() => handleRespond(r, "accepted")}
                    disabled={responding === r.id && !responseMsg}
                    style={{ flex: 1, padding: "9px 0", borderRadius: "8px", backgroundColor: accent, border: "none", color: "#ffffff", fontWeight: "700", fontSize: "13px", cursor: "pointer" }}
                  >
                    <CheckCircle2 size={14} style={{ marginRight: 6 }} />
                    Accept & Add to Roster
                  </button>
                  <button
                    onClick={() => handleRespond(r, "declined")}
                    style={{ flex: 1, padding: "9px 0", borderRadius: "8px", backgroundColor: "#fff1f2", border: "1px solid #fecdd3", color: "#ef4444", fontWeight: "700", fontSize: "13px", cursor: "pointer" }}
                  >
                    <XCircle size={14} style={{ marginRight: 6 }} />
                    Decline
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Outgoing Invites */}
      {outgoingInvites.length > 0 && (
        <div>
          <div style={{ fontSize: "12px", fontWeight: "700", color: "#334155", textTransform: "uppercase", letterSpacing: "0.5px", marginBottom: "12px" }}>
            Outgoing Invitations — Awaiting Creator Response ({outgoingInvites.length})
          </div>
          <div style={{ display: "flex", flexDirection: "column", gap: "10px" }}>
            {outgoingInvites.map((r) => (
              <div key={r.id} style={{ backgroundColor: "#ffffff", border: "1px solid #e2e8f0", borderRadius: "12px", padding: "14px 18px", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                <div>
                  <div style={{ fontSize: "13px", fontWeight: "700", color: "#0f172a" }}>{r.creatorName}</div>
                  <div style={{ fontSize: "11.5px", color: "#64748b" }}>{r.creatorEmail}</div>
                </div>
                <span style={{ padding: "3px 10px", borderRadius: "20px", fontSize: "11.5px", fontWeight: "700", color: "#92400e", backgroundColor: "#fef3c7" }}>
                  Awaiting Creator
                </span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
