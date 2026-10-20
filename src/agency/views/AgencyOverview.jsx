import React from "react";
import {
  Building2,
  Users,
  Layers,
  Sparkles,
  Handshake,
  CheckSquare,
  ArrowRight,
  Clock,
  CheckCircle2,
  AlertCircle,
  TrendingUp,
} from "lucide-react";

function StatCard({ icon: Icon, label, value, sub, color, bg, onClick }) {
  return (
    <div
      onClick={onClick}
      style={{
        backgroundColor: "#ffffff",
        border: "1px solid #e2e8f0",
        borderRadius: "14px",
        padding: "20px 22px",
        display: "flex",
        flexDirection: "column",
        gap: "8px",
        cursor: onClick ? "pointer" : "default",
        transition: "box-shadow 0.15s ease",
        boxShadow: "0 1px 4px rgba(15,23,42,0.04)",
      }}
      onMouseEnter={(e) => onClick && (e.currentTarget.style.boxShadow = "0 4px 12px rgba(15,23,42,0.08)")}
      onMouseLeave={(e) => onClick && (e.currentTarget.style.boxShadow = "0 1px 4px rgba(15,23,42,0.04)")}
    >
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
        <span style={{ fontSize: "12.5px", fontWeight: "600", color: "#64748b" }}>{label}</span>
        <div style={{ width: 36, height: 36, borderRadius: 10, backgroundColor: bg, display: "flex", alignItems: "center", justifyContent: "center" }}>
          <Icon size={18} color={color} />
        </div>
      </div>
      <div style={{ fontSize: "28px", fontWeight: "800", color: "#0f172a" }}>{value}</div>
      {sub && <div style={{ fontSize: "11.5px", color: "#64748b" }}>{sub}</div>}
    </div>
  );
}

function statusChip(status) {
  const map = {
    pending: { color: "#92400e", bg: "#fef3c7", label: "Pending" },
    accepted: { color: "#065f46", bg: "#d1fae5", label: "Accepted" },
    active: { color: "#065f46", bg: "#d1fae5", label: "Active" },
    declined: { color: "#991b1b", bg: "#fee2e2", label: "Declined" },
    revoked: { color: "#475569", bg: "#f1f5f9", label: "Revoked" },
    ended: { color: "#475569", bg: "#f1f5f9", label: "Ended" },
  };
  const s = map[status] || { color: "#64748b", bg: "#f1f5f9", label: status };
  return (
    <span style={{ padding: "2px 10px", borderRadius: "20px", fontSize: "11.5px", fontWeight: "700", color: s.color, backgroundColor: s.bg }}>
      {s.label}
    </span>
  );
}

export default function AgencyOverview({
  user,
  userProfile,
  theme,
  assignments = [],
  relationships = [],
  recommendations = [],
  loading,
  onNavigate,
  onRefresh,
}) {
  const accent = theme?.accent || "#0d9488";
  const accentLight = theme?.accentLight || "#f0fdfa";
  const accentBorder = theme?.accentBorder || "#99f6e4";

  const acceptedAssignments = assignments.filter((a) => a.status === "accepted");
  const pendingAssignments = assignments.filter((a) => a.status === "pending");
  const activeRoster = relationships.filter((r) => r.status === "active");
  const pendingRequests = relationships.filter((r) => r.status === "pending");

  const agencyName =
    userProfile?.fullName?.trim() ||
    user?.displayName?.trim() ||
    (user?.email ? user.email.split("@")[0] : "Talent Agency");

  if (loading) {
    return (
      <div style={{ textAlign: "center", padding: "80px 20px", color: "#64748b" }}>
        <div style={{ fontSize: "15px" }}>Loading agency data…</div>
      </div>
    );
  }

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "28px" }}>
      {/* Welcome Banner */}
      <div
        style={{
          borderRadius: "18px",
          padding: "28px 32px",
          background: `linear-gradient(135deg, #134e4a 0%, ${accent} 100%)`,
          color: "#ffffff",
          position: "relative",
          overflow: "hidden",
        }}
      >
        <div style={{ position: "absolute", top: 0, right: 0, bottom: 0, width: "40%", background: "radial-gradient(circle at 80% 50%, rgba(255,255,255,0.08) 0%, transparent 70%)" }} />
        <div style={{ fontSize: "11px", fontWeight: "700", letterSpacing: "1px", textTransform: "uppercase", opacity: 0.7, marginBottom: "8px" }}>
          Agency Portal
        </div>
        <h1 style={{ margin: 0, fontSize: "24px", fontWeight: "800", letterSpacing: "-0.5px" }}>
          Welcome back, {agencyName}
        </h1>
        <p style={{ margin: "6px 0 20px", opacity: 0.85, fontSize: "14px" }}>
          Manage your brand assignments and creator roster from one place.
        </p>
        <div style={{ display: "flex", gap: "12px", flexWrap: "wrap" }}>
          {pendingAssignments.length > 0 && (
            <button
              onClick={() => onNavigate("campaigns")}
              style={{ padding: "9px 18px", borderRadius: "8px", backgroundColor: "rgba(255,255,255,0.15)", border: "1px solid rgba(255,255,255,0.3)", color: "#ffffff", fontWeight: "600", fontSize: "13px", cursor: "pointer", display: "flex", alignItems: "center", gap: "6px" }}
            >
              <AlertCircle size={14} />
              {pendingAssignments.length} Pending Assignment{pendingAssignments.length > 1 ? "s" : ""}
            </button>
          )}
          {pendingRequests.length > 0 && (
            <button
              onClick={() => onNavigate("requests")}
              style={{ padding: "9px 18px", borderRadius: "8px", backgroundColor: "rgba(255,255,255,0.15)", border: "1px solid rgba(255,255,255,0.3)", color: "#ffffff", fontWeight: "600", fontSize: "13px", cursor: "pointer", display: "flex", alignItems: "center", gap: "6px" }}
            >
              <Users size={14} />
              {pendingRequests.length} Creator Request{pendingRequests.length > 1 ? "s" : ""}
            </button>
          )}
        </div>
      </div>

      {/* KPI Stats Grid */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))", gap: "16px" }}>
        <StatCard
          icon={Building2}
          label="Brand Clients"
          value={acceptedAssignments.length}
          sub={`${pendingAssignments.length} pending`}
          color={accent}
          bg={accentLight}
          onClick={() => onNavigate("brands")}
        />
        <StatCard
          icon={Layers}
          label="Assigned Campaigns"
          value={acceptedAssignments.length}
          sub="Active assignments"
          color="#0284c7"
          bg="#f0f9ff"
          onClick={() => onNavigate("campaigns")}
        />
        <StatCard
          icon={Users}
          label="Creator Roster"
          value={activeRoster.length}
          sub={`${pendingRequests.length} pending`}
          color="#7c3aed"
          bg="#f5f3ff"
          onClick={() => onNavigate("roster")}
        />
        <StatCard
          icon={Sparkles}
          label="Recommendations"
          value={recommendations.length}
          sub="Creator matches"
          color="#f59e0b"
          bg="#fffbeb"
          onClick={() => onNavigate("matches")}
        />
      </div>

      {/* Two-column: Recent Assignments + Roster Highlights */}
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "20px" }}>
        {/* Recent Brand Assignments */}
        <div style={{ backgroundColor: "#ffffff", border: "1px solid #e2e8f0", borderRadius: "16px", padding: "22px" }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "18px" }}>
            <div>
              <div style={{ fontSize: "15px", fontWeight: "700", color: "#0f172a" }}>Brand Assignments</div>
              <div style={{ fontSize: "12px", color: "#64748b" }}>Campaigns you're coordinating</div>
            </div>
            <button onClick={() => onNavigate("campaigns")} style={{ display: "flex", alignItems: "center", gap: "4px", background: "none", border: "none", color: accent, fontWeight: "600", fontSize: "12.5px", cursor: "pointer" }}>
              View all <ArrowRight size={13} />
            </button>
          </div>

          {assignments.length === 0 ? (
            <div style={{ textAlign: "center", padding: "30px 0", color: "#94a3b8" }}>
              <Building2 size={28} style={{ marginBottom: 8, opacity: 0.4 }} />
              <div style={{ fontSize: "13px" }}>No brand assignments yet.</div>
              <div style={{ fontSize: "11.5px", marginTop: 4 }}>Marketing teams can assign campaigns to your agency.</div>
            </div>
          ) : (
            <div style={{ display: "flex", flexDirection: "column", gap: "10px" }}>
              {assignments.slice(0, 4).map((a) => (
                <div key={a.id} style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "10px 12px", backgroundColor: "#f8fafc", borderRadius: "8px", border: "1px solid #f1f5f9" }}>
                  <div>
                    <div style={{ fontSize: "12.5px", fontWeight: "600", color: "#0f172a" }}>{a.campaignTitle || "Campaign"}</div>
                    <div style={{ fontSize: "11.5px", color: "#64748b" }}>{a.brandName || a.brandEmail}</div>
                  </div>
                  {statusChip(a.status)}
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Creator Roster Highlights */}
        <div style={{ backgroundColor: "#ffffff", border: "1px solid #e2e8f0", borderRadius: "16px", padding: "22px" }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "18px" }}>
            <div>
              <div style={{ fontSize: "15px", fontWeight: "700", color: "#0f172a" }}>Creator Roster</div>
              <div style={{ fontSize: "12px", color: "#64748b" }}>Creators you represent</div>
            </div>
            <button onClick={() => onNavigate("roster")} style={{ display: "flex", alignItems: "center", gap: "4px", background: "none", border: "none", color: accent, fontWeight: "600", fontSize: "12.5px", cursor: "pointer" }}>
              View all <ArrowRight size={13} />
            </button>
          </div>

          {activeRoster.length === 0 ? (
            <div style={{ textAlign: "center", padding: "30px 0", color: "#94a3b8" }}>
              <Users size={28} style={{ marginBottom: 8, opacity: 0.4 }} />
              <div style={{ fontSize: "13px" }}>No active creator representations.</div>
              <div style={{ fontSize: "11.5px", marginTop: 4 }}>Invite creators or wait for representation requests.</div>
            </div>
          ) : (
            <div style={{ display: "flex", flexDirection: "column", gap: "10px" }}>
              {activeRoster.slice(0, 4).map((r) => (
                <div key={r.id} style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "10px 12px", backgroundColor: "#f8fafc", borderRadius: "8px", border: "1px solid #f1f5f9" }}>
                  <div>
                    <div style={{ fontSize: "12.5px", fontWeight: "600", color: "#0f172a" }}>{r.creatorName}</div>
                    <div style={{ fontSize: "11.5px", color: "#64748b" }}>{r.creatorNiche}</div>
                  </div>
                  {statusChip(r.status)}
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Pending Actions Call-out */}
      {(pendingAssignments.length > 0 || pendingRequests.length > 0) && (
        <div style={{ backgroundColor: "#fffbeb", border: "1px solid #fde68a", borderRadius: "14px", padding: "18px 22px" }}>
          <div style={{ display: "flex", alignItems: "center", gap: "10px", marginBottom: "12px" }}>
            <AlertCircle size={18} color="#f59e0b" />
            <span style={{ fontSize: "14px", fontWeight: "700", color: "#92400e" }}>Actions Required</span>
          </div>
          <div style={{ display: "flex", flexDirection: "column", gap: "8px" }}>
            {pendingAssignments.map((a) => (
              <div key={a.id} style={{ display: "flex", justifyContent: "space-between", alignItems: "center", fontSize: "13px", color: "#78350f" }}>
                <span>
                  <Clock size={12} style={{ marginRight: 5 }} />
                  Brand assignment from <strong>{a.brandName || a.brandEmail}</strong> for "{a.campaignTitle}"
                </span>
                <button
                  onClick={() => onNavigate("campaigns")}
                  style={{ padding: "4px 12px", borderRadius: "6px", backgroundColor: "#f59e0b", border: "none", color: "#ffffff", fontWeight: "600", fontSize: "11.5px", cursor: "pointer" }}
                >
                  Review
                </button>
              </div>
            ))}
            {pendingRequests.map((r) => (
              <div key={r.id} style={{ display: "flex", justifyContent: "space-between", alignItems: "center", fontSize: "13px", color: "#78350f" }}>
                <span>
                  <Users size={12} style={{ marginRight: 5 }} />
                  Representation request from <strong>{r.creatorName}</strong>
                </span>
                <button
                  onClick={() => onNavigate("requests")}
                  style={{ padding: "4px 12px", borderRadius: "6px", backgroundColor: "#f59e0b", border: "none", color: "#ffffff", fontWeight: "600", fontSize: "11.5px", cursor: "pointer" }}
                >
                  Review
                </button>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
