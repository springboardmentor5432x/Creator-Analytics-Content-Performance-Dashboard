import { useState, useEffect } from "react";
import {
  Search,
  Send,
  CheckCircle2,
  MapPin,
  AlertCircle,
  X,
  RefreshCw,
  UserX,
} from "lucide-react";
import { fetchRegisteredCreators } from "../firestoreService";

export default function CreatorDiscovery({
  campaigns = [],
  invitations = [],
  onSendInvitation,
  preselectedCampaign = null,
  theme,
}) {
  const accent = theme?.accent || "#0284c7";

  // Async creator data state
  const [creators, setCreators] = useState([]);
  const [creatorsLoading, setCreatorsLoading] = useState(true);
  const [creatorsError, setCreatorsError] = useState(null);
  const [dataSource, setDataSource] = useState(null);

  // Search & Filters
  const [searchQuery, setSearchQuery] = useState("");
  const [nicheFilter, setNicheFilter] = useState("all");
  const [platformFilter, setPlatformFilter] = useState("all");

  // Invite Modal state
  const [inviteModalCreator, setInviteModalCreator] = useState(null);
  const [selectedCampaignId, setSelectedCampaignId] = useState(
    preselectedCampaign?.id ||
      campaigns.find((c) => c.status === "active" || c.status === "draft")?.id ||
      ""
  );
  const [compensation, setCompensation] = useState("$3,000");
  const [inviteMessage, setInviteMessage] = useState("");
  const [inviteError, setInviteError] = useState("");
  const [inviteSuccess, setInviteSuccess] = useState("");
  const [isSending, setIsSending] = useState(false);

  // ── Load creators from Firestore (real registered users) ─────────
  const loadCreators = async () => {
    setCreatorsLoading(true);
    setCreatorsError(null);
    try {
      const result = await fetchRegisteredCreators();
      setCreators(result.creators);
      setDataSource(result.source);
    } catch (err) {
      setCreatorsError("Failed to load creator profiles. Please try again.");
      setCreators([]);
    } finally {
      setCreatorsLoading(false);
    }
  };

  useEffect(() => {
    loadCreators();
  }, []);

  // ── Filter creator list ───────────────────────────────────────────
  const filteredCreators = creators.filter((c) => {
    if (c.discoverable === false) return false;
    if (c.status === "suspended") return false;
    if (nicheFilter !== "all" && !c.niche?.toLowerCase().includes(nicheFilter.toLowerCase())) {
      return false;
    }
    if (platformFilter !== "all" && !c.platforms?.includes(platformFilter)) {
      return false;
    }
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      const matchName = c.fullName?.toLowerCase().includes(q);
      const matchHandle = c.handle?.toLowerCase().includes(q);
      const matchBio = c.bio?.toLowerCase().includes(q);
      const matchLoc = c.location?.toLowerCase().includes(q);
      const matchNiche = c.niche?.toLowerCase().includes(q);
      if (!matchName && !matchHandle && !matchBio && !matchLoc && !matchNiche) return false;
    }
    return true;
  });

  const handleOpenInvite = (creator) => {
    setInviteModalCreator(creator);
    setInviteError("");
    setInviteSuccess("");
    setCompensation("$3,000");
    setInviteMessage(
      `Hello ${creator.fullName.split(" ")[0]}, we love your content and would be thrilled to have you collaborate with us on our upcoming campaign!`
    );
    if (!selectedCampaignId && campaigns.length > 0) {
      setSelectedCampaignId(campaigns[0].id);
    }
  };

  const handleSendInviteSubmit = async (e) => {
    e.preventDefault();
    setInviteError("");
    setInviteSuccess("");

    if (!selectedCampaignId) {
      setInviteError("Please select a target campaign.");
      return;
    }

    setIsSending(true);
    try {
      await onSendInvitation({
        campaignId: selectedCampaignId,
        creator: inviteModalCreator,
        compensation,
        message: inviteMessage,
      });

      setInviteSuccess(`Invitation successfully sent to ${inviteModalCreator.fullName}!`);
      setTimeout(() => {
        setInviteModalCreator(null);
        setInviteSuccess("");
      }, 1500);
    } catch (err) {
      setInviteError(err.message || "Failed to dispatch campaign invitation.");
    } finally {
      setIsSending(false);
    }
  };

  // ── Loading state ─────────────────────────────────────────────────
  if (creatorsLoading) {
    return (
      <div style={styles.container}>
        <div style={styles.topBar}>
          <div>
            <h2 style={styles.pageTitle}>Creator Discovery & Roster</h2>
            <p style={styles.pageSubtitle}>Querying registered creator profiles from database...</p>
          </div>
        </div>
        <div style={styles.stateBox}>
          <div style={{ ...styles.spinnerRing, borderTopColor: accent }} />
          <p style={styles.stateTitle}>Loading Creator Profiles</p>
          <p style={styles.stateDesc}>Fetching registered creators from the platform registry...</p>
        </div>
      </div>
    );
  }

  // ── Error state ───────────────────────────────────────────────────
  if (creatorsError) {
    return (
      <div style={styles.container}>
        <div style={styles.topBar}>
          <div>
            <h2 style={styles.pageTitle}>Creator Discovery & Roster</h2>
          </div>
        </div>
        <div style={{ ...styles.stateBox, border: "1px solid #fecaca", backgroundColor: "#fef2f2" }}>
          <AlertCircle size={32} color="#dc2626" />
          <p style={{ ...styles.stateTitle, color: "#dc2626" }}>Unable to Load Creators</p>
          <p style={styles.stateDesc}>{creatorsError}</p>
          <button onClick={loadCreators} style={{ ...styles.stateBtn, backgroundColor: accent }}>
            <RefreshCw size={14} style={{ marginRight: 6 }} />
            Retry
          </button>
        </div>
      </div>
    );
  }

  return (
    <div style={styles.container}>
      {/* Header */}
      <div style={styles.topBar}>
        <div>
          <h2 style={styles.pageTitle}>Creator Discovery & Roster</h2>
          <p style={styles.pageSubtitle}>
            Search registered creator profiles and dispatch campaign invitations.
            {dataSource === "firestore" && (
              <span style={styles.sourceTag}> ✓ Live from Firestore</span>
            )}
            {dataSource === "local" && (
              <span style={{ ...styles.sourceTag, color: "#d97706" }}> ⚡ From local registry</span>
            )}
          </p>
        </div>
        <button onClick={loadCreators} style={styles.refreshBtn} title="Reload creator profiles">
          <RefreshCw size={14} style={{ marginRight: 6 }} />
          Refresh
        </button>
      </div>

      {/* Filter and Search Bar */}
      <div style={styles.filterCard}>
        <div style={styles.searchWrap}>
          <Search size={16} color="#64748b" style={styles.searchIcon} />
          <input
            type="text"
            placeholder="Search creators by name, niche, bio, or location..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            style={styles.searchInput}
          />
        </div>

        <div style={styles.filterGroup}>
          <div style={styles.selectWrap}>
            <label style={styles.selectLabel}>Niche:</label>
            <select
              value={nicheFilter}
              onChange={(e) => setNicheFilter(e.target.value)}
              style={styles.selectInput}
            >
              <option value="all">All Niches</option>
              <option value="tech">Technology & Software</option>
              <option value="productivity">Productivity & Setup</option>
              <option value="lifestyle">Lifestyle & Design</option>
              <option value="gaming">Gaming & Streaming</option>
              <option value="saas">B2B SaaS & Business</option>
              <option value="fitness">Fitness & Wellness</option>
            </select>
          </div>

          <div style={styles.selectWrap}>
            <label style={styles.selectLabel}>Platform:</label>
            <select
              value={platformFilter}
              onChange={(e) => setPlatformFilter(e.target.value)}
              style={styles.selectInput}
            >
              <option value="all">All Platforms</option>
              <option value="YouTube">YouTube</option>
              <option value="Instagram">Instagram</option>
              <option value="TikTok">TikTok</option>
              <option value="Twitch">Twitch</option>
              <option value="LinkedIn">LinkedIn</option>
            </select>
          </div>
        </div>
      </div>

      {/* Empty state — no creators registered yet */}
      {creators.length === 0 && (
        <div style={styles.stateBox}>
          <UserX size={40} color="#94a3b8" />
          <p style={styles.stateTitle}>No Creator Profiles Found</p>
          <p style={styles.stateDesc}>
            Creator profiles will appear here once users register as Creators and complete their profiles.
            Share the platform sign-up link with creators you want to collaborate with.
          </p>
          <div style={styles.stateHint}>
            <span style={styles.stateHintTitle}>How creators appear here:</span>
            <ol style={styles.stateHintList}>
              <li>Creator registers an account selecting "Content Creator" role</li>
              <li>Creator completes their profile (niche, platforms, bio)</li>
              <li>Their profile becomes discoverable and visible here</li>
            </ol>
          </div>
        </div>
      )}

      {/* Filtered empty state */}
      {creators.length > 0 && filteredCreators.length === 0 && (
        <div style={{ ...styles.stateBox, padding: "32px" }}>
          <Search size={28} color="#94a3b8" />
          <p style={styles.stateTitle}>No Creators Match Your Filters</p>
          <p style={styles.stateDesc}>Try adjusting your search query or filter criteria.</p>
          <button
            onClick={() => {
              setSearchQuery("");
              setNicheFilter("all");
              setPlatformFilter("all");
            }}
            style={{ ...styles.stateBtn, backgroundColor: "#64748b" }}
          >
            Clear Filters
          </button>
        </div>
      )}

      {/* Creator Cards Grid */}
      {filteredCreators.length > 0 && (
        <div style={styles.creatorsGrid}>
          {filteredCreators.map((creator) => {
            const creatorInvites = invitations.filter(
              (inv) => inv.creatorEmail?.toLowerCase() === creator.email?.toLowerCase()
            );
            const acceptedInvites = creatorInvites.filter((inv) => inv.status === "accepted");
            const hasActiveInvite = creatorInvites.some(
              (inv) => inv.status === "pending" || inv.status === "accepted"
            );

            return (
              <div key={creator.uid || creator.email} style={styles.creatorCard}>
                {/* Creator Top Profile */}
                <div style={styles.cardHeader}>
                  {creator.photoURL ? (
                    <img
                      src={creator.photoURL}
                      alt={creator.fullName}
                      style={styles.avatarImg}
                      onError={(e) => {
                        e.target.style.display = "none";
                      }}
                    />
                  ) : (
                    <div style={{ ...styles.avatarFallback, backgroundColor: accent }}>
                      {creator.fullName.charAt(0).toUpperCase()}
                    </div>
                  )}

                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                      <span style={styles.creatorName}>{creator.fullName}</span>
                    </div>
                    <span style={styles.creatorHandle}>{creator.handle}</span>
                    {creator.niche ? (
                      <span style={styles.creatorNicheBadge}>{creator.niche}</span>
                    ) : (
                      <span style={{ ...styles.creatorNicheBadge, color: "#94a3b8", backgroundColor: "#f8fafc" }}>
                        Niche not set
                      </span>
                    )}
                  </div>
                </div>

                {/* Bio snippet */}
                {creator.bio ? (
                  <p style={styles.creatorBio}>{creator.bio}</p>
                ) : (
                  <p style={{ ...styles.creatorBio, color: "#94a3b8", fontStyle: "italic" }}>
                    Bio not provided yet.
                  </p>
                )}

                {/* Metrics Row — only real values, never fabricated */}
                <div style={styles.metricsRow}>
                  <div style={styles.metricItem}>
                    <span style={styles.metricVal}>{creator.formattedFollowers || "—"}</span>
                    <span style={styles.metricLbl}>Audience</span>
                  </div>
                  <div style={styles.metricItem}>
                    <span style={{ ...styles.metricVal, color: creator.engagementRate ? "#15803d" : "#94a3b8" }}>
                      {creator.engagementRate || "—"}
                    </span>
                    <span style={styles.metricLbl}>Engagement</span>
                  </div>
                  <div style={styles.metricItem}>
                    <span style={styles.metricVal}>
                      {acceptedInvites.length > 0
                        ? `${acceptedInvites.length} Deal${acceptedInvites.length > 1 ? "s" : ""}`
                        : "—"}
                    </span>
                    <span style={styles.metricLbl}>Active Deals</span>
                  </div>
                </div>

                {/* Platforms & Location */}
                <div style={styles.footerMeta}>
                  {creator.platforms?.length > 0 ? (
                    <div style={styles.platformPills}>
                      {creator.platforms.map((p) => (
                        <span key={p} style={styles.pPill}>
                          {p}
                        </span>
                      ))}
                    </div>
                  ) : (
                    <span style={{ fontSize: "11px", color: "#94a3b8", fontStyle: "italic" }}>
                      No platforms listed
                    </span>
                  )}

                  {creator.location && (
                    <div style={styles.locationWrap}>
                      <MapPin size={11} color="#64748b" />
                      <span>{creator.location}</span>
                    </div>
                  )}
                </div>

                {/* Active invite warning */}
                {hasActiveInvite && (
                  <div style={styles.alreadyInvitedBadge}>
                    <CheckCircle2 size={13} color="#0369a1" />
                    <span>Already has an active invitation</span>
                  </div>
                )}

                {/* Action Button */}
                <div style={styles.cardActionRow}>
                  <span style={styles.registeredBadge}>✓ Registered</span>
                  <button
                    onClick={() => handleOpenInvite(creator)}
                    disabled={campaigns.length === 0}
                    title={campaigns.length === 0 ? "Create a campaign first" : ""}
                    style={{
                      ...styles.inviteBtn,
                      backgroundColor: campaigns.length === 0 ? "#94a3b8" : accent,
                      cursor: campaigns.length === 0 ? "not-allowed" : "pointer",
                    }}
                  >
                    <Send size={13} style={{ marginRight: 6 }} />
                    Invite to Campaign
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Invitation Dispatch Modal */}
      {inviteModalCreator && (
        <div style={styles.modalOverlay}>
          <div style={styles.inviteModalCard}>
            <div style={styles.modalHeader}>
              <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                <div style={{ ...styles.modalIconWrap, backgroundColor: "#f0f9ff" }}>
                  <Send size={18} color={accent} />
                </div>
                <div>
                  <h3 style={styles.modalTitle}>Invite {inviteModalCreator.fullName}</h3>
                  <p style={styles.modalSub}>Dispatch a formal campaign collaboration invitation.</p>
                </div>
              </div>
              <button onClick={() => setInviteModalCreator(null)} style={styles.modalCloseBtn}>
                <X size={18} />
              </button>
            </div>

            {inviteError && (
              <div style={styles.errorBanner}>
                <AlertCircle size={16} color="#dc2626" />
                <span>{inviteError}</span>
              </div>
            )}

            {inviteSuccess && (
              <div style={styles.successBanner}>
                <CheckCircle2 size={16} color="#15803d" />
                <span>{inviteSuccess}</span>
              </div>
            )}

            <form onSubmit={handleSendInviteSubmit} style={styles.modalBody}>
              <div style={styles.fieldGroup}>
                <label style={styles.label}>Select Campaign:</label>
                {campaigns.length === 0 ? (
                  <p style={{ fontSize: "12.5px", color: "#dc2626" }}>
                    No campaigns available. Create a campaign first before inviting creators.
                  </p>
                ) : (
                  <select
                    value={selectedCampaignId}
                    onChange={(e) => setSelectedCampaignId(e.target.value)}
                    style={styles.modalSelect}
                    required
                  >
                    <option value="">— Select a campaign —</option>
                    {campaigns.map((c) => (
                      <option key={c.id} value={c.id}>
                        {c.name} ({c.status.toUpperCase()} • $
                        {(Number(c.budget) || 0).toLocaleString()})
                      </option>
                    ))}
                  </select>
                )}
              </div>

              <div style={styles.fieldGroup}>
                <label style={styles.label}>Proposed Compensation / Deal Fee:</label>
                <input
                  type="text"
                  placeholder="$3,000"
                  value={compensation}
                  onChange={(e) => setCompensation(e.target.value)}
                  style={styles.modalInput}
                  required
                />
              </div>

              <div style={styles.fieldGroup}>
                <label style={styles.label}>Personalized Invitation Message:</label>
                <textarea
                  value={inviteMessage}
                  onChange={(e) => setInviteMessage(e.target.value)}
                  rows={4}
                  style={styles.modalTextarea}
                  placeholder="Explain why this creator is an ideal fit, what the deliverables are, and expectations..."
                />
              </div>

              <div style={styles.modalFooter}>
                <button
                  type="button"
                  onClick={() => setInviteModalCreator(null)}
                  disabled={isSending}
                  style={styles.cancelBtn}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isSending || campaigns.length === 0}
                  style={{
                    ...styles.sendBtn,
                    backgroundColor: campaigns.length === 0 ? "#94a3b8" : accent,
                  }}
                >
                  {isSending ? "Sending Invite..." : "Send Campaign Invitation"}
                </button>
              </div>
            </form>
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
    gap: "20px",
  },
  topBar: {
    display: "flex",
    justifyContent: "space-between",
    alignItems: "center",
    flexWrap: "wrap",
    gap: "14px",
  },
  pageTitle: {
    fontSize: "20px",
    fontWeight: "700",
    color: "#0f172a",
  },
  pageSubtitle: {
    fontSize: "13px",
    color: "#64748b",
    marginTop: "2px",
  },
  sourceTag: {
    fontSize: "11px",
    fontWeight: "600",
    color: "#15803d",
  },
  refreshBtn: {
    display: "inline-flex",
    alignItems: "center",
    padding: "7px 14px",
    borderRadius: "8px",
    border: "1px solid #cbd5e1",
    backgroundColor: "#ffffff",
    color: "#475569",
    fontSize: "12.5px",
    fontWeight: "600",
    cursor: "pointer",
  },
  filterCard: {
    backgroundColor: "#ffffff",
    borderRadius: "12px",
    border: "1px solid #e2e8f0",
    padding: "14px 18px",
    display: "flex",
    justifyContent: "space-between",
    alignItems: "center",
    flexWrap: "wrap",
    gap: "14px",
    boxShadow: "0 1px 3px rgba(15, 23, 42, 0.03)",
  },
  searchWrap: {
    position: "relative",
    flex: "1 1 300px",
  },
  searchIcon: {
    position: "absolute",
    left: "12px",
    top: "50%",
    transform: "translateY(-50%)",
  },
  searchInput: {
    width: "100%",
    padding: "8px 12px 8px 36px",
    borderRadius: "8px",
    border: "1px solid #cbd5e1",
    fontSize: "13px",
    outline: "none",
    color: "#0f172a",
  },
  filterGroup: {
    display: "flex",
    alignItems: "center",
    gap: "14px",
    flexWrap: "wrap",
  },
  selectWrap: {
    display: "flex",
    alignItems: "center",
    gap: "6px",
  },
  selectLabel: {
    fontSize: "12px",
    fontWeight: "600",
    color: "#64748b",
  },
  selectInput: {
    padding: "7px 10px",
    borderRadius: "8px",
    border: "1px solid #cbd5e1",
    fontSize: "12.5px",
    color: "#0f172a",
    backgroundColor: "#ffffff",
    outline: "none",
  },
  // State boxes
  stateBox: {
    display: "flex",
    flexDirection: "column",
    alignItems: "center",
    justifyContent: "center",
    textAlign: "center",
    gap: "12px",
    backgroundColor: "#ffffff",
    borderRadius: "16px",
    border: "1px solid #e2e8f0",
    padding: "60px 40px",
    boxShadow: "0 1px 4px rgba(15,23,42,0.04)",
  },
  spinnerRing: {
    width: "36px",
    height: "36px",
    borderRadius: "50%",
    border: "3px solid #e2e8f0",
    borderTopColor: "#0284c7",
    animation: "spin 0.9s linear infinite",
  },
  stateTitle: {
    fontSize: "16px",
    fontWeight: "700",
    color: "#0f172a",
    margin: 0,
  },
  stateDesc: {
    fontSize: "13px",
    color: "#64748b",
    lineHeight: "1.5",
    maxWidth: "480px",
    margin: 0,
  },
  stateBtn: {
    display: "inline-flex",
    alignItems: "center",
    padding: "8px 16px",
    borderRadius: "8px",
    border: "none",
    color: "#ffffff",
    fontSize: "13px",
    fontWeight: "600",
    cursor: "pointer",
    marginTop: "4px",
  },
  stateHint: {
    backgroundColor: "#f8fafc",
    borderRadius: "10px",
    border: "1px solid #e2e8f0",
    padding: "14px 18px",
    textAlign: "left",
    maxWidth: "400px",
  },
  stateHintTitle: {
    fontSize: "12.5px",
    fontWeight: "700",
    color: "#334155",
    display: "block",
    marginBottom: "8px",
  },
  stateHintList: {
    margin: 0,
    paddingLeft: "18px",
    fontSize: "12.5px",
    color: "#475569",
    lineHeight: "1.7",
  },
  // Creator grid
  creatorsGrid: {
    display: "grid",
    gridTemplateColumns: "repeat(auto-fit, minmax(320px, 1fr))",
    gap: "18px",
  },
  creatorCard: {
    backgroundColor: "#ffffff",
    borderRadius: "14px",
    border: "1px solid #e2e8f0",
    padding: "20px",
    display: "flex",
    flexDirection: "column",
    justifyContent: "space-between",
    gap: "14px",
    boxShadow: "0 1px 3px rgba(15, 23, 42, 0.04)",
  },
  cardHeader: {
    display: "flex",
    gap: "12px",
    alignItems: "flex-start",
  },
  avatarImg: {
    width: "48px",
    height: "48px",
    borderRadius: "50%",
    objectFit: "cover",
    border: "2px solid #e2e8f0",
    flexShrink: 0,
  },
  avatarFallback: {
    width: "48px",
    height: "48px",
    borderRadius: "50%",
    color: "#ffffff",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    fontSize: "18px",
    fontWeight: "700",
    flexShrink: 0,
  },
  creatorName: {
    fontSize: "14px",
    fontWeight: "700",
    color: "#0f172a",
  },
  creatorHandle: {
    fontSize: "12px",
    color: "#64748b",
    display: "block",
  },
  creatorNicheBadge: {
    display: "inline-block",
    fontSize: "10.5px",
    fontWeight: "600",
    padding: "2px 6px",
    borderRadius: "4px",
    backgroundColor: "#f1f5f9",
    color: "#334155",
    marginTop: "4px",
  },
  creatorBio: {
    fontSize: "12.5px",
    color: "#475569",
    lineHeight: "1.45",
    margin: 0,
  },
  metricsRow: {
    display: "grid",
    gridTemplateColumns: "repeat(3, 1fr)",
    backgroundColor: "#f8fafc",
    borderRadius: "8px",
    padding: "8px",
    border: "1px solid #e2e8f0",
    textAlign: "center",
  },
  metricItem: {
    display: "flex",
    flexDirection: "column",
  },
  metricVal: {
    fontSize: "13.5px",
    fontWeight: "700",
    color: "#0f172a",
  },
  metricLbl: {
    fontSize: "10px",
    color: "#64748b",
    textTransform: "uppercase",
  },
  footerMeta: {
    display: "flex",
    flexDirection: "column",
    gap: "6px",
  },
  platformPills: {
    display: "flex",
    gap: "4px",
    flexWrap: "wrap",
  },
  pPill: {
    fontSize: "10.5px",
    padding: "2px 6px",
    borderRadius: "4px",
    backgroundColor: "#f1f5f9",
    color: "#475569",
  },
  locationWrap: {
    display: "flex",
    alignItems: "center",
    gap: "4px",
    fontSize: "11px",
    color: "#64748b",
  },
  alreadyInvitedBadge: {
    display: "flex",
    alignItems: "center",
    gap: "6px",
    backgroundColor: "#eff6ff",
    border: "1px solid #bfdbfe",
    borderRadius: "6px",
    padding: "6px 10px",
    fontSize: "12px",
    color: "#1d4ed8",
    fontWeight: "600",
  },
  cardActionRow: {
    display: "flex",
    justifyContent: "space-between",
    alignItems: "center",
    paddingTop: "12px",
    borderTop: "1px solid #f1f5f9",
  },
  registeredBadge: {
    fontSize: "11.5px",
    fontWeight: "600",
    color: "#15803d",
  },
  inviteBtn: {
    display: "inline-flex",
    alignItems: "center",
    padding: "7px 14px",
    borderRadius: "8px",
    border: "none",
    color: "#ffffff",
    fontSize: "12px",
    fontWeight: "600",
  },
  // Modal
  modalOverlay: {
    position: "fixed",
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: "rgba(15, 23, 42, 0.45)",
    backdropFilter: "blur(3px)",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    zIndex: 1000,
    padding: "20px",
  },
  inviteModalCard: {
    backgroundColor: "#ffffff",
    borderRadius: "16px",
    maxWidth: "520px",
    width: "100%",
    padding: "24px",
    boxShadow: "0 25px 50px -12px rgba(0, 0, 0, 0.2)",
  },
  modalHeader: {
    display: "flex",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: "16px",
  },
  modalIconWrap: {
    width: "38px",
    height: "38px",
    borderRadius: "10px",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    border: "1px solid #bae6fd",
  },
  modalTitle: {
    fontSize: "16px",
    fontWeight: "700",
    color: "#0f172a",
  },
  modalSub: {
    fontSize: "12px",
    color: "#64748b",
  },
  modalCloseBtn: {
    background: "none",
    border: "none",
    color: "#64748b",
    cursor: "pointer",
  },
  errorBanner: {
    backgroundColor: "#fef2f2",
    border: "1px solid #fecaca",
    color: "#b91c1c",
    padding: "10px 14px",
    borderRadius: "8px",
    fontSize: "12.5px",
    display: "flex",
    alignItems: "center",
    gap: "8px",
    marginBottom: "14px",
  },
  successBanner: {
    backgroundColor: "#f0fdf4",
    border: "1px solid #bbf7d0",
    color: "#15803d",
    padding: "10px 14px",
    borderRadius: "8px",
    fontSize: "12.5px",
    display: "flex",
    alignItems: "center",
    gap: "8px",
    marginBottom: "14px",
  },
  modalBody: {
    display: "flex",
    flexDirection: "column",
    gap: "14px",
  },
  fieldGroup: {
    display: "flex",
    flexDirection: "column",
    gap: "4px",
  },
  label: {
    fontSize: "12px",
    fontWeight: "600",
    color: "#334155",
  },
  modalSelect: {
    padding: "8px 12px",
    borderRadius: "8px",
    border: "1px solid #cbd5e1",
    fontSize: "13px",
    color: "#0f172a",
    backgroundColor: "#ffffff",
    outline: "none",
  },
  modalInput: {
    padding: "8px 12px",
    borderRadius: "8px",
    border: "1px solid #cbd5e1",
    fontSize: "13px",
    color: "#0f172a",
    outline: "none",
  },
  modalTextarea: {
    padding: "8px 12px",
    borderRadius: "8px",
    border: "1px solid #cbd5e1",
    fontSize: "13px",
    color: "#0f172a",
    outline: "none",
    fontFamily: "inherit",
  },
  modalFooter: {
    display: "flex",
    justifyContent: "flex-end",
    gap: "10px",
    marginTop: "10px",
  },
  cancelBtn: {
    padding: "8px 14px",
    borderRadius: "8px",
    border: "1px solid #cbd5e1",
    backgroundColor: "#ffffff",
    fontSize: "13px",
    fontWeight: "600",
    color: "#475569",
    cursor: "pointer",
  },
  sendBtn: {
    padding: "8px 18px",
    borderRadius: "8px",
    border: "none",
    color: "#ffffff",
    fontSize: "13px",
    fontWeight: "600",
    cursor: "pointer",
  },
};
