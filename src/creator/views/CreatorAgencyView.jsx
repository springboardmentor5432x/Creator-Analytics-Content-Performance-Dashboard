import React, { useState, useEffect, useCallback } from "react";
import {
  Building2,
  Users,
  CheckCircle2,
  Clock,
  XCircle,
  ExternalLink,
  ShieldCheck,
  Send,
  Star,
  Award,
  Sparkles,
  ArrowRight,
  UserMinus,
  RefreshCw,
  MessageSquare,
  AlertCircle,
} from "lucide-react";
import {
  getRegisteredAgencies,
  getAgencyCreatorRelationships,
  getAgencyRecommendations,
  requestAgencyRepresentation,
  respondToRepresentationRelationship,
  endRepresentationRelationship,
} from "../../agency/agencyService";

export default function CreatorAgencyView({
  user,
  userProfile,
  theme,
  onNavigate,
}) {
  const accent = theme?.accent || "#2563eb";
  const accentLight = theme?.accentLight || "#eff6ff";

  const [relationships, setRelationships] = useState([]);
  const [recommendations, setRecommendations] = useState([]);
  const [agencies, setAgencies] = useState([]);
  const [loading, setLoading] = useState(true);

  // Modal states
  const [requestModalAgency, setRequestModalAgency] = useState(null);
  const [proposedTerms, setProposedTerms] = useState(
    "Standard Representation (15% agency commission on secured brand deals)"
  );
  const [pitchMessage, setPitchMessage] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  // End representation modal
  const [confirmEndRel, setConfirmEndRel] = useState(null);
  const [endReason, setEndReason] = useState("");
  const [isEnding, setIsEnding] = useState(false);

  // Toast
  const [toast, setToast] = useState("");
  const showToast = (msg) => {
    setToast(msg);
    setTimeout(() => setToast(""), 4000);
  };

  const loadData = useCallback(async () => {
    setLoading(true);
    try {
      const creatorId = user?.uid || "usr_creator_demo";
      const creatorEmail = user?.email || "creator@creatoriq.io";

      const [rels, recs, agencyList] = await Promise.all([
        getAgencyCreatorRelationships({ creatorId, creatorEmail }),
        getAgencyRecommendations({ creatorId, creatorEmail }),
        getRegisteredAgencies(),
      ]);

      setRelationships(rels || []);
      setRecommendations(recs || []);
      setAgencies(agencyList || []);
    } catch (err) {
      console.warn("Failed to load creator agency data:", err);
    } finally {
      setLoading(false);
    }
  }, [user]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  // Relationships categorization
  const activeRelationship = relationships.find((r) => r.status === "active");
  const pendingIncoming = relationships.filter(
    (r) => r.status === "pending" && r.initiatedBy === "agency"
  );
  const pendingOutgoing = relationships.filter(
    (r) => r.status === "pending" && r.initiatedBy === "creator"
  );
  const pastRelationships = relationships.filter(
    (r) => r.status === "ended" || r.status === "declined"
  );

  // Handle request representation
  const handleSendRequest = async (e) => {
    e.preventDefault();
    if (!requestModalAgency) return;
    setIsSubmitting(true);
    try {
      await requestAgencyRepresentation({
        creatorUser: {
          uid: user?.uid || "usr_creator_demo",
          email: user?.email || "creator@creatoriq.io",
          fullName:
            userProfile?.fullName || user?.displayName || "Alex Rivers",
          handle: userProfile?.handle || "@alexrivers",
          niche: userProfile?.niche || "Tech & Software",
          platforms: userProfile?.platforms || ["YouTube", "Instagram"],
          formattedFollowers: userProfile?.followers || "1.4M",
        },
        agency: requestModalAgency,
        message: pitchMessage,
        proposedTerms: proposedTerms,
      });

      showToast("Representation request sent successfully!");
      setRequestModalAgency(null);
      setPitchMessage("");
      loadData();
    } catch (err) {
      alert(err.message || "Failed to send request.");
    } finally {
      setIsSubmitting(false);
    }
  };

  // Handle respond to incoming agency invitation
  const handleRespond = async (relId, newStatus) => {
    try {
      await respondToRepresentationRelationship(
        relId,
        newStatus,
        user || { uid: "usr_creator_demo", role: "Creator" }
      );
      showToast(
        newStatus === "active"
          ? "Representation accepted! Agency is now active on your profile."
          : "Representation invitation declined."
      );
      loadData();
    } catch (err) {
      alert(err.message || "Failed to respond.");
    }
  };

  // Handle end representation
  const handleEnd = async () => {
    if (!confirmEndRel) return;
    setIsEnding(true);
    try {
      await endRepresentationRelationship(
        confirmEndRel.id,
        user || { uid: "usr_creator_demo", role: "Creator" },
        endReason
      );
      showToast("Agency representation ended.");
      setConfirmEndRel(null);
      setEndReason("");
      loadData();
    } catch (err) {
      alert(err.message || "Failed to end relationship.");
    } finally {
      setIsEnding(false);
    }
  };

  return (
    <div style={styles.container}>
      {/* Toast Notification */}
      {toast && (
        <div style={styles.toast}>
          <CheckCircle2 size={16} color="#15803d" />
          <span>{toast}</span>
        </div>
      )}

      {/* Header */}
      <div style={styles.headerCard}>
        <div style={styles.headerLeft}>
          <div
            style={{
              ...styles.iconBadge,
              backgroundColor: accentLight,
              color: accent,
            }}
          >
            <Building2 size={24} />
          </div>
          <div>
            <h1 style={styles.title}>Agency Representation & Talent Management</h1>
            <p style={styles.subtitle}>
              Partner with professional talent agencies to secure premier brand sponsorships, negotiate high-value contracts, and handle campaign compliance.
            </p>
          </div>
        </div>
        <button onClick={loadData} style={styles.refreshBtn} title="Refresh data">
          <RefreshCw size={15} color="#475569" />
          <span>Refresh</span>
        </button>
      </div>

      {/* 1. Active Agency Representation Card */}
      {activeRelationship ? (
        <div style={styles.activeAgencyCard}>
          <div style={styles.activeAgencyHeader}>
            <div style={styles.activeAgencyBrand}>
              <div style={styles.agencyAvatar}>
                <Building2 size={26} color="#ffffff" />
              </div>
              <div>
                <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                  <h2 style={styles.agencyName}>
                    {activeRelationship.agencyName}
                  </h2>
                  <span style={styles.verifiedBadge}>
                    <ShieldCheck size={13} color="#0d9488" /> Verified Talent Agency
                  </span>
                </div>
                <div style={styles.agencyEmail}>
                  <span>{activeRelationship.agencyEmail}</span>
                  <span>•</span>
                  <span>Active representation partner</span>
                </div>
              </div>
            </div>

            <button
              onClick={() => setConfirmEndRel(activeRelationship)}
              style={styles.endBtn}
            >
              <UserMinus size={14} />
              <span>End Representation</span>
            </button>
          </div>

          <div style={styles.activeAgencyBody}>
            <div style={styles.agencyStatBox}>
              <span style={styles.statLabel}>Commission Terms</span>
              <span style={styles.statValue}>15% Agency / 85% Creator</span>
              <span style={styles.statSub}>On agency-brokered brand deals</span>
            </div>

            <div style={styles.agencyStatBox}>
              <span style={styles.statLabel}>Relationship Status</span>
              <span style={{ ...styles.statValue, color: "#0d9488" }}>
                Active & Synced
              </span>
              <span style={styles.statSub}>
                Full representation privileges granted
              </span>
            </div>

            <div style={styles.agencyStatBox}>
              <span style={styles.statLabel}>Partner Since</span>
              <span style={styles.statValue}>
                {new Date(activeRelationship.createdAt).toLocaleDateString()}
              </span>
              <span style={styles.statSub}>Verified contract terms</span>
            </div>
          </div>

          <div style={styles.agencyTermsBox}>
            <span style={styles.termsLabel}>Agreed Contract Terms:</span>
            <p style={styles.termsText}>{activeRelationship.terms}</p>
          </div>
        </div>
      ) : (
        <div style={styles.noActiveAgencyBanner}>
          <div style={{ display: "flex", alignItems: "center", gap: 14 }}>
            <div style={styles.noActiveIcon}>
              <Sparkles size={24} color="#f59e0b" />
            </div>
            <div>
              <h3 style={styles.noActiveTitle}>You are currently Independent</h3>
              <p style={styles.noActiveDesc}>
                Connect with an accredited talent agency below to represent you for brand opportunities, or continue managing collaborations independently.
              </p>
            </div>
          </div>
        </div>
      )}

      {/* 2. Incoming Agency Invitations */}
      {pendingIncoming.length > 0 && (
        <div style={styles.section}>
          <div style={styles.sectionHeaderRow}>
            <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
              <Clock size={18} color="#b45309" />
              <h2 style={styles.sectionTitle}>
                Incoming Agency Invitations ({pendingIncoming.length})
              </h2>
            </div>
          </div>

          <div style={styles.cardsGrid}>
            {pendingIncoming.map((inv) => (
              <div key={inv.id} style={styles.pendingCard}>
                <div style={styles.pendingCardHeader}>
                  <div>
                    <h3 style={styles.pendingAgencyName}>{inv.agencyName}</h3>
                    <span style={styles.pendingAgencyEmail}>
                      {inv.agencyEmail}
                    </span>
                  </div>
                  <span style={styles.pendingBadge}>Incoming Invite</span>
                </div>

                <div style={styles.pendingMessage}>
                  <MessageSquare size={14} color="#64748b" style={{ flexShrink: 0 }} />
                  <p style={{ margin: 0, fontSize: "13px", color: "#334155" }}>
                    "{inv.message}"
                  </p>
                </div>

                <div style={styles.pendingTerms}>
                  <strong>Proposed Terms:</strong> {inv.terms}
                </div>

                <div style={styles.pendingActions}>
                  <button
                    onClick={() => handleRespond(inv.id, "active")}
                    style={{ ...styles.actionBtn, backgroundColor: "#15803d", color: "#fff" }}
                  >
                    <CheckCircle2 size={14} /> Accept Representation
                  </button>
                  <button
                    onClick={() => handleRespond(inv.id, "declined")}
                    style={{ ...styles.actionBtn, backgroundColor: "#fff", color: "#b91c1c", borderColor: "#fca5a5" }}
                  >
                    <XCircle size={14} /> Decline
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* 3. Outgoing Representation Requests */}
      {pendingOutgoing.length > 0 && (
        <div style={styles.section}>
          <div style={styles.sectionHeaderRow}>
            <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
              <Send size={18} color="#2563eb" />
              <h2 style={styles.sectionTitle}>
                Your Pending Requests to Agencies ({pendingOutgoing.length})
              </h2>
            </div>
          </div>

          <div style={styles.cardsGrid}>
            {pendingOutgoing.map((req) => (
              <div key={req.id} style={styles.pendingCard}>
                <div style={styles.pendingCardHeader}>
                  <div>
                    <h3 style={styles.pendingAgencyName}>{req.agencyName}</h3>
                    <span style={styles.pendingAgencyEmail}>
                      {req.agencyEmail}
                    </span>
                  </div>
                  <span style={{ ...styles.pendingBadge, backgroundColor: "#eff6ff", color: "#1d4ed8", borderColor: "#bfdbfe" }}>
                    Awaiting Agency Review
                  </span>
                </div>

                <div style={styles.pendingTerms}>
                  <strong>Proposed Terms:</strong> {req.terms}
                </div>

                <div style={{ fontSize: "12px", color: "#64748b" }}>
                  Submitted on {new Date(req.createdAt).toLocaleDateString()}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* 4. Brand Opportunities Pitched by Agency */}
      <div style={styles.section}>
        <div style={styles.sectionHeaderRow}>
          <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
            <Award size={18} color={accent} />
            <h2 style={styles.sectionTitle}>
              Brand Opportunities Pitched by Agency ({recommendations.length})
            </h2>
          </div>
          <span style={styles.sectionBadge}>Facilitated Sponsorships</span>
        </div>

        {recommendations.length === 0 ? (
          <div style={styles.emptyCard}>
            <p style={{ margin: 0, fontSize: "14px", color: "#64748b" }}>
              No campaigns have been pitched by your agency yet. When your agency recommends you for brand campaigns, they will appear here with match scores and pitch notes.
            </p>
          </div>
        ) : (
          <div style={styles.tableWrapper}>
            <table style={styles.table}>
              <thead>
                <tr style={styles.thRow}>
                  <th style={styles.th}>Campaign</th>
                  <th style={styles.th}>Agency</th>
                  <th style={styles.th}>Match Score</th>
                  <th style={styles.th}>Pitch Notes</th>
                  <th style={styles.th}>Status</th>
                </tr>
              </thead>
              <tbody>
                {recommendations.map((rec) => (
                  <tr key={rec.id} style={styles.tr}>
                    <td style={styles.tdBold}>{rec.campaignTitle}</td>
                    <td style={styles.td}>{rec.agencyName}</td>
                    <td style={styles.td}>
                      <span style={styles.matchScoreBadge}>
                        <Star size={11} fill="#eab308" color="#eab308" />
                        {rec.matchScore}% Match
                      </span>
                    </td>
                    <td style={{ ...styles.td, maxWidth: 300, fontSize: "12.5px" }}>
                      {rec.pitchNotes || "Recommended based on niche & audience match."}
                    </td>
                    <td style={styles.td}>
                      <span
                        style={{
                          ...styles.statusChip,
                          backgroundColor:
                            rec.status === "approved"
                              ? "#d1fae5"
                              : rec.status === "invited"
                              ? "#dbeafe"
                              : "#fef3c7",
                          color:
                            rec.status === "approved"
                              ? "#065f46"
                              : rec.status === "invited"
                              ? "#1e40af"
                              : "#92400e",
                        }}
                      >
                        {rec.status.toUpperCase()}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* 5. Browse Accredited Talent Agencies */}
      <div style={styles.section}>
        <div style={styles.sectionHeaderRow}>
          <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
            <Users size={18} color="#0d9488" />
            <h2 style={styles.sectionTitle}>
              Accredited Talent Agencies on CreatorIQ ({agencies.length})
            </h2>
          </div>
          <span style={styles.sectionBadge}>Verified Partners</span>
        </div>

        <div style={styles.agenciesGrid}>
          {agencies.map((agency) => {
            const isCurrentlyRepresentedByThis =
              activeRelationship?.agencyId === agency.uid ||
              activeRelationship?.agencyEmail?.toLowerCase() ===
                agency.email?.toLowerCase();
            const hasPendingWithThis = relationships.some(
              (r) =>
                (r.agencyId === agency.uid ||
                  r.agencyEmail?.toLowerCase() === agency.email?.toLowerCase()) &&
                r.status === "pending"
            );

            return (
              <div key={agency.uid} style={styles.agencyCard}>
                <div style={styles.agencyCardTop}>
                  <div style={styles.agencyCardAvatar}>
                    <Building2 size={20} color="#0d9488" />
                  </div>
                  <div>
                    <h3 style={styles.agencyCardName}>{agency.fullName}</h3>
                    <span style={styles.agencyCardLocation}>
                      {agency.location}
                    </span>
                  </div>
                </div>

                <p style={styles.agencyCardBio}>{agency.bio}</p>

                <div style={styles.agencyMetaRow}>
                  <span style={styles.metaPill}>
                    Roster: {agency.rosterSize}+ Creators
                  </span>
                  <span style={styles.metaPill}>
                    Rating: {agency.rating} ★
                  </span>
                </div>

                <div style={styles.nicheTags}>
                  {(agency.niches || []).slice(0, 3).map((n) => (
                    <span key={n} style={styles.nicheTag}>
                      {n}
                    </span>
                  ))}
                </div>

                <div style={styles.agencyCardFooter}>
                  {isCurrentlyRepresentedByThis ? (
                    <span style={styles.activePill}>
                      <CheckCircle2 size={13} /> Active Agency
                    </span>
                  ) : hasPendingWithThis ? (
                    <span style={styles.pendingRequestPill}>
                      <Clock size={13} /> Request Pending
                    </span>
                  ) : (
                    <button
                      onClick={() => setRequestModalAgency(agency)}
                      style={{
                        ...styles.requestBtn,
                        backgroundColor: accent,
                      }}
                    >
                      <Send size={13} /> Request Representation
                    </button>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Modal: Request Representation */}
      {requestModalAgency && (
        <div style={styles.modalOverlay}>
          <div style={styles.modalCard}>
            <h2 style={styles.modalTitle}>
              Request Representation from {requestModalAgency.fullName}
            </h2>
            <p style={styles.modalSubtitle}>
              Propose terms and introduce your creator channels to the agency team.
            </p>

            <form onSubmit={handleSendRequest} style={styles.modalForm}>
              <div style={styles.formGroup}>
                <label style={styles.label}>Proposed Commission & Representation Terms</label>
                <input
                  type="text"
                  value={proposedTerms}
                  onChange={(e) => setProposedTerms(e.target.value)}
                  style={styles.input}
                  required
                />
              </div>

              <div style={styles.formGroup}>
                <label style={styles.label}>Pitch Message / Introduction</label>
                <textarea
                  value={pitchMessage}
                  onChange={(e) => setPitchMessage(e.target.value)}
                  rows={4}
                  placeholder="Tell the agency about your audience, past brand collaborations, and representation goals..."
                  style={styles.textarea}
                  required
                />
              </div>

              <div style={styles.modalActions}>
                <button
                  type="button"
                  onClick={() => setRequestModalAgency(null)}
                  style={styles.cancelBtn}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isSubmitting}
                  style={{ ...styles.submitBtn, backgroundColor: accent }}
                >
                  {isSubmitting ? "Sending..." : "Submit Representation Request"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal: End Representation */}
      {confirmEndRel && (
        <div style={styles.modalOverlay}>
          <div style={styles.modalCard}>
            <div style={{ display: "flex", alignItems: "center", gap: 10, color: "#b91c1c", marginBottom: 8 }}>
              <AlertCircle size={22} />
              <h2 style={{ ...styles.modalTitle, margin: 0, color: "#b91c1c" }}>
                End Agency Representation
              </h2>
            </div>
            <p style={styles.modalSubtitle}>
              Are you sure you want to terminate representation with <strong>{confirmEndRel.agencyName}</strong>? Your active deals and campaigns will remain intact, but future sponsorships will not be managed by this agency.
            </p>

            <div style={styles.formGroup}>
              <label style={styles.label}>Reason for Ending Representation (Optional)</label>
              <textarea
                value={endReason}
                onChange={(e) => setEndReason(e.target.value)}
                rows={3}
                placeholder="Contract expired, switching to independent, etc."
                style={styles.textarea}
              />
            </div>

            <div style={styles.modalActions}>
              <button
                type="button"
                onClick={() => setConfirmEndRel(null)}
                style={styles.cancelBtn}
              >
                Keep Representation
              </button>
              <button
                type="button"
                onClick={handleEnd}
                disabled={isEnding}
                style={{ ...styles.submitBtn, backgroundColor: "#b91c1c" }}
              >
                {isEnding ? "Terminating..." : "Confirm Termination"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

const styles = {
  container: {
    display: "flex",
    flexDirection: "column",
    gap: "24px",
  },
  toast: {
    position: "fixed",
    bottom: "24px",
    right: "24px",
    backgroundColor: "#ffffff",
    color: "#0f172a",
    padding: "14px 20px",
    borderRadius: "10px",
    boxShadow: "0 10px 25px -5px rgba(0,0,0,0.15)",
    border: "1px solid #bbf7d0",
    display: "flex",
    alignItems: "center",
    gap: "10px",
    fontSize: "14px",
    fontWeight: "600",
    zIndex: 9999,
  },
  headerCard: {
    backgroundColor: "#ffffff",
    borderRadius: "14px",
    padding: "24px 28px",
    border: "1px solid #e2e8f0",
    display: "flex",
    alignItems: "center",
    justifyContent: "space-between",
    boxShadow: "0 1px 3px rgba(0,0,0,0.04)",
  },
  headerLeft: {
    display: "flex",
    alignItems: "center",
    gap: "18px",
  },
  iconBadge: {
    width: "52px",
    height: "52px",
    borderRadius: "12px",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    flexShrink: 0,
  },
  title: {
    margin: "0 0 4px 0",
    fontSize: "20px",
    fontWeight: "700",
    color: "#0f172a",
  },
  subtitle: {
    margin: 0,
    fontSize: "13.5px",
    color: "#64748b",
    maxWidth: "680px",
  },
  refreshBtn: {
    display: "flex",
    alignItems: "center",
    gap: "6px",
    padding: "8px 14px",
    backgroundColor: "#f8fafc",
    border: "1px solid #cbd5e1",
    borderRadius: "8px",
    fontSize: "13px",
    fontWeight: "600",
    color: "#334155",
    cursor: "pointer",
  },
  activeAgencyCard: {
    backgroundColor: "#ffffff",
    borderRadius: "14px",
    border: "2px solid #0d9488",
    padding: "24px 28px",
    boxShadow: "0 4px 12px rgba(13, 148, 136, 0.08)",
  },
  activeAgencyHeader: {
    display: "flex",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: "20px",
  },
  activeAgencyBrand: {
    display: "flex",
    alignItems: "center",
    gap: "14px",
  },
  agencyAvatar: {
    width: "48px",
    height: "48px",
    borderRadius: "12px",
    backgroundColor: "#0d9488",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
  },
  agencyName: {
    margin: 0,
    fontSize: "18px",
    fontWeight: "700",
    color: "#0f172a",
  },
  verifiedBadge: {
    display: "inline-flex",
    alignItems: "center",
    gap: "4px",
    backgroundColor: "#ccfbf1",
    color: "#0f766e",
    padding: "2px 8px",
    borderRadius: "20px",
    fontSize: "11px",
    fontWeight: "700",
  },
  agencyEmail: {
    display: "flex",
    alignItems: "center",
    gap: "8px",
    fontSize: "13px",
    color: "#64748b",
    marginTop: "2px",
  },
  endBtn: {
    display: "flex",
    alignItems: "center",
    gap: "6px",
    padding: "8px 14px",
    backgroundColor: "#fff",
    border: "1px solid #fca5a5",
    color: "#b91c1c",
    borderRadius: "8px",
    fontSize: "12.5px",
    fontWeight: "600",
    cursor: "pointer",
  },
  activeAgencyBody: {
    display: "grid",
    gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))",
    gap: "16px",
    backgroundColor: "#f0fdfa",
    padding: "16px 20px",
    borderRadius: "10px",
    border: "1px solid #ccfbf1",
    marginBottom: "16px",
  },
  agencyStatBox: {
    display: "flex",
    flexDirection: "column",
    gap: "3px",
  },
  statLabel: {
    fontSize: "11px",
    textTransform: "uppercase",
    letterSpacing: "0.5px",
    color: "#0f766e",
    fontWeight: "700",
  },
  statValue: {
    fontSize: "15px",
    fontWeight: "700",
    color: "#0f172a",
  },
  statSub: {
    fontSize: "11.5px",
    color: "#64748b",
  },
  agencyTermsBox: {
    fontSize: "13px",
    color: "#475569",
    borderTop: "1px solid #f1f5f9",
    paddingTop: "14px",
  },
  termsLabel: {
    fontWeight: "700",
    color: "#0f172a",
    marginRight: "6px",
  },
  termsText: {
    margin: "4px 0 0 0",
    lineHeight: "1.5",
  },
  noActiveAgencyBanner: {
    backgroundColor: "#fffbeb",
    border: "1px solid #fde68a",
    borderRadius: "12px",
    padding: "20px 24px",
  },
  noActiveIcon: {
    width: "44px",
    height: "44px",
    borderRadius: "10px",
    backgroundColor: "#fef3c7",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    flexShrink: 0,
  },
  noActiveTitle: {
    margin: "0 0 4px 0",
    fontSize: "16px",
    fontWeight: "700",
    color: "#92400e",
  },
  noActiveDesc: {
    margin: 0,
    fontSize: "13.5px",
    color: "#78350f",
  },
  section: {
    backgroundColor: "#ffffff",
    borderRadius: "14px",
    border: "1px solid #e2e8f0",
    padding: "24px 28px",
  },
  sectionHeaderRow: {
    display: "flex",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: "20px",
  },
  sectionTitle: {
    margin: 0,
    fontSize: "17px",
    fontWeight: "700",
    color: "#0f172a",
  },
  sectionBadge: {
    fontSize: "12px",
    fontWeight: "600",
    color: "#64748b",
    backgroundColor: "#f1f5f9",
    padding: "4px 10px",
    borderRadius: "20px",
  },
  cardsGrid: {
    display: "grid",
    gridTemplateColumns: "repeat(auto-fit, minmax(320px, 1fr))",
    gap: "16px",
  },
  pendingCard: {
    border: "1px solid #e2e8f0",
    borderRadius: "10px",
    padding: "18px",
    backgroundColor: "#f8fafc",
    display: "flex",
    flexDirection: "column",
    gap: "12px",
  },
  pendingCardHeader: {
    display: "flex",
    justifyContent: "space-between",
    alignItems: "flex-start",
  },
  pendingAgencyName: {
    margin: "0 0 2px 0",
    fontSize: "15px",
    fontWeight: "700",
    color: "#0f172a",
  },
  pendingAgencyEmail: {
    fontSize: "12px",
    color: "#64748b",
  },
  pendingBadge: {
    fontSize: "11px",
    fontWeight: "700",
    color: "#b45309",
    backgroundColor: "#fef3c7",
    border: "1px solid #fde68a",
    padding: "3px 8px",
    borderRadius: "12px",
  },
  pendingMessage: {
    display: "flex",
    alignItems: "flex-start",
    gap: "8px",
    backgroundColor: "#ffffff",
    padding: "10px 12px",
    borderRadius: "8px",
    border: "1px solid #e2e8f0",
  },
  pendingTerms: {
    fontSize: "12.5px",
    color: "#475569",
  },
  pendingActions: {
    display: "flex",
    gap: "10px",
    marginTop: "4px",
  },
  actionBtn: {
    flex: 1,
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    gap: "6px",
    padding: "8px 12px",
    borderRadius: "8px",
    fontSize: "12.5px",
    fontWeight: "600",
    border: "1px solid transparent",
    cursor: "pointer",
  },
  emptyCard: {
    padding: "24px",
    backgroundColor: "#f8fafc",
    borderRadius: "8px",
    border: "1px dashed #cbd5e1",
    textAlign: "center",
  },
  tableWrapper: {
    overflowX: "auto",
  },
  table: {
    width: "100%",
    borderCollapse: "collapse",
  },
  thRow: {
    borderBottom: "1px solid #e2e8f0",
    textAlign: "left",
  },
  th: {
    padding: "10px 14px",
    fontSize: "11.5px",
    fontWeight: "700",
    color: "#64748b",
    textTransform: "uppercase",
    letterSpacing: "0.5px",
  },
  tr: {
    borderBottom: "1px solid #f1f5f9",
  },
  td: {
    padding: "14px",
    fontSize: "13.5px",
    color: "#334155",
  },
  tdBold: {
    padding: "14px",
    fontSize: "13.5px",
    fontWeight: "700",
    color: "#0f172a",
  },
  matchScoreBadge: {
    display: "inline-flex",
    alignItems: "center",
    gap: "4px",
    fontSize: "12px",
    fontWeight: "700",
    color: "#854d0e",
    backgroundColor: "#fef9c3",
    padding: "2px 8px",
    borderRadius: "12px",
  },
  statusChip: {
    display: "inline-block",
    fontSize: "11px",
    fontWeight: "700",
    padding: "3px 8px",
    borderRadius: "12px",
  },
  agenciesGrid: {
    display: "grid",
    gridTemplateColumns: "repeat(auto-fit, minmax(300px, 1fr))",
    gap: "18px",
  },
  agencyCard: {
    border: "1px solid #e2e8f0",
    borderRadius: "12px",
    padding: "20px",
    backgroundColor: "#ffffff",
    display: "flex",
    flexDirection: "column",
    gap: "12px",
    boxShadow: "0 1px 3px rgba(0,0,0,0.03)",
  },
  agencyCardTop: {
    display: "flex",
    alignItems: "center",
    gap: "12px",
  },
  agencyCardAvatar: {
    width: "40px",
    height: "40px",
    borderRadius: "10px",
    backgroundColor: "#f0fdfa",
    border: "1px solid #ccfbf1",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
  },
  agencyCardName: {
    margin: 0,
    fontSize: "15px",
    fontWeight: "700",
    color: "#0f172a",
  },
  agencyCardLocation: {
    fontSize: "12px",
    color: "#64748b",
  },
  agencyCardBio: {
    margin: 0,
    fontSize: "13px",
    color: "#475569",
    lineHeight: "1.45",
  },
  agencyMetaRow: {
    display: "flex",
    gap: "8px",
  },
  metaPill: {
    fontSize: "11.5px",
    fontWeight: "600",
    color: "#475569",
    backgroundColor: "#f1f5f9",
    padding: "3px 8px",
    borderRadius: "6px",
  },
  nicheTags: {
    display: "flex",
    flexWrap: "wrap",
    gap: "6px",
  },
  nicheTag: {
    fontSize: "11px",
    fontWeight: "500",
    color: "#0f766e",
    backgroundColor: "#f0fdfa",
    border: "1px solid #ccfbf1",
    padding: "2px 7px",
    borderRadius: "4px",
  },
  agencyCardFooter: {
    marginTop: "auto",
    paddingTop: "12px",
    borderTop: "1px solid #f1f5f9",
  },
  activePill: {
    display: "inline-flex",
    alignItems: "center",
    gap: "5px",
    fontSize: "12px",
    fontWeight: "700",
    color: "#0f766e",
    backgroundColor: "#ccfbf1",
    padding: "6px 12px",
    borderRadius: "8px",
    width: "100%",
    justifyContent: "center",
  },
  pendingRequestPill: {
    display: "inline-flex",
    alignItems: "center",
    gap: "5px",
    fontSize: "12px",
    fontWeight: "700",
    color: "#b45309",
    backgroundColor: "#fef3c7",
    padding: "6px 12px",
    borderRadius: "8px",
    width: "100%",
    justifyContent: "center",
  },
  requestBtn: {
    width: "100%",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    gap: "6px",
    padding: "9px 14px",
    color: "#ffffff",
    borderRadius: "8px",
    border: "none",
    fontSize: "13px",
    fontWeight: "600",
    cursor: "pointer",
  },
  modalOverlay: {
    position: "fixed",
    inset: 0,
    backgroundColor: "rgba(15, 23, 42, 0.6)",
    backdropFilter: "blur(4px)",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    zIndex: 10000,
    padding: "20px",
  },
  modalCard: {
    backgroundColor: "#ffffff",
    borderRadius: "16px",
    maxWidth: "520px",
    width: "100%",
    padding: "28px",
    boxShadow: "0 20px 25px -5px rgba(0,0,0,0.2)",
  },
  modalTitle: {
    margin: "0 0 6px 0",
    fontSize: "18px",
    fontWeight: "700",
    color: "#0f172a",
  },
  modalSubtitle: {
    margin: "0 0 20px 0",
    fontSize: "13.5px",
    color: "#64748b",
    lineHeight: "1.45",
  },
  modalForm: {
    display: "flex",
    flexDirection: "column",
    gap: "16px",
  },
  formGroup: {
    display: "flex",
    flexDirection: "column",
    gap: "6px",
  },
  label: {
    fontSize: "12.5px",
    fontWeight: "700",
    color: "#334155",
  },
  input: {
    padding: "10px 12px",
    borderRadius: "8px",
    border: "1px solid #cbd5e1",
    fontSize: "13.5px",
    color: "#0f172a",
    outline: "none",
  },
  textarea: {
    padding: "10px 12px",
    borderRadius: "8px",
    border: "1px solid #cbd5e1",
    fontSize: "13.5px",
    color: "#0f172a",
    outline: "none",
    fontFamily: "inherit",
    resize: "vertical",
  },
  modalActions: {
    display: "flex",
    justifyContent: "flex-end",
    gap: "12px",
    marginTop: "8px",
  },
  cancelBtn: {
    padding: "9px 16px",
    borderRadius: "8px",
    border: "1px solid #cbd5e1",
    backgroundColor: "#ffffff",
    color: "#475569",
    fontSize: "13px",
    fontWeight: "600",
    cursor: "pointer",
  },
  submitBtn: {
    padding: "9px 18px",
    borderRadius: "8px",
    border: "none",
    color: "#ffffff",
    fontSize: "13px",
    fontWeight: "600",
    cursor: "pointer",
  },
};
