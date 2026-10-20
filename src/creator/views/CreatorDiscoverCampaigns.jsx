import React, { useState, useEffect } from "react";
import {
  Compass,
  Search,
  Filter,
  DollarSign,
  Calendar,
  Layers,
  Sparkles,
  Send,
  CheckCircle2,
  X,
  Target,
  ExternalLink,
} from "lucide-react";
import { getDiscoverableCampaigns } from "../creatorService";

export default function CreatorDiscoverCampaigns({ theme, user, userProfile }) {
  const accent = theme?.accent || "#2563eb";
  const [campaigns, setCampaigns] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [nicheFilter, setNicheFilter] = useState("all");
  const [selectedBriefCampaign, setSelectedBriefCampaign] = useState(null);
  const [pitchSuccess, setPitchSuccess] = useState("");

  useEffect(() => {
    async function loadCampaigns() {
      setLoading(true);
      try {
        const list = await getDiscoverableCampaigns();
        setCampaigns(list);
      } catch (err) {
        console.warn("Could not load campaigns for discovery:", err);
      } finally {
        setLoading(false);
      }
    }
    loadCampaigns();
  }, []);

  const niches = ["all", "Tech & Software Engineering", "Gaming", "Lifestyle", "Productivity & Setup", "AI & SaaS"];

  const filtered = campaigns.filter((c) => {
    if (nicheFilter !== "all" && c.targetNiche !== nicheFilter) return false;
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      const matchName = c.name?.toLowerCase().includes(q);
      const matchNiche = c.targetNiche?.toLowerCase().includes(q);
      const matchDesc = c.description?.toLowerCase().includes(q);
      if (!matchName && !matchNiche && !matchDesc) return false;
    }
    return true;
  });

  const handleApply = (camp) => {
    setPitchSuccess(`Your creator profile was submitted to "${camp.name}"! The brand marketing team will review your channel and dispatch an official invitation.`);
    setSelectedBriefCampaign(null);
    setTimeout(() => setPitchSuccess(""), 5000);
  };

  return (
    <div style={styles.container}>
      {/* Header */}
      <div style={styles.topBar}>
        <div>
          <h2 style={styles.pageTitle}>Discover Brand Campaigns</h2>
          <p style={styles.pageSubtitle}>
            Browse open campaigns from verified brands actively seeking creator collaborations.
          </p>
        </div>
      </div>

      {/* Success alert */}
      {pitchSuccess && (
        <div style={styles.successBanner}>
          <CheckCircle2 size={16} color="#15803d" />
          <span>{pitchSuccess}</span>
        </div>
      )}

      {/* Search & Filter Bar */}
      <div style={styles.filterCard}>
        <div style={styles.searchWrap}>
          <Search size={16} color="#64748b" style={styles.searchIcon} />
          <input
            type="text"
            placeholder="Search campaigns by name, niche, keywords..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            style={styles.searchInput}
          />
        </div>

        <div style={styles.selectWrap}>
          <Filter size={14} color="#64748b" />
          <select
            value={nicheFilter}
            onChange={(e) => setNicheFilter(e.target.value)}
            style={styles.selectInput}
          >
            <option value="all">All Niches</option>
            {niches.filter((n) => n !== "all").map((n) => (
              <option key={n} value={n}>
                {n}
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* Campaign Cards Grid */}
      {loading ? (
        <div style={styles.loadingBox}>
          <div style={{ ...styles.spinner, borderTopColor: accent }} />
          <p style={styles.loadingText}>Loading discoverable brand campaigns...</p>
        </div>
      ) : filtered.length === 0 ? (
        <div style={styles.emptyState}>
          <div style={styles.emptyIconWrap}>
            <Compass size={28} color="#94a3b8" />
          </div>
          <h4 style={styles.emptyTitle}>No matching campaigns found</h4>
          <p style={styles.emptyDesc}>
            Try clearing your search query or niche filters to view all active brand initiatives.
          </p>
          <button
            onClick={() => {
              setSearchQuery("");
              setNicheFilter("all");
            }}
            style={{ ...styles.primaryBtn, backgroundColor: accent, marginTop: 12 }}
          >
            Clear Filters
          </button>
        </div>
      ) : (
        <div style={styles.grid}>
          {filtered.map((c) => (
            <div key={c.id} style={styles.card}>
              {c.imageUrl ? (
                <div style={styles.cardImgWrap}>
                  <img src={c.imageUrl} alt={c.name} style={styles.cardImg} />
                  <span style={styles.objectiveBadge}>
                    <Target size={11} style={{ marginRight: 4 }} />
                    {c.objective || "Awareness"}
                  </span>
                </div>
              ) : (
                <div style={styles.cardImgFallback}>
                  <Layers size={28} color="#94a3b8" />
                  <span style={styles.objectiveBadge}>
                    <Target size={11} style={{ marginRight: 4 }} />
                    {c.objective || "Awareness"}
                  </span>
                </div>
              )}

              <div style={styles.cardBody}>
                <div style={styles.nicheTag}>{c.targetNiche || "General Content"}</div>
                <h3 style={styles.cardTitle}>{c.name}</h3>
                <p style={styles.cardDesc}>
                  {c.description
                    ? c.description.slice(0, 110) + (c.description.length > 110 ? "..." : "")
                    : "Brand sponsorship campaign seeking engaged creator partnerships."}
                </p>

                <div style={styles.cardMetaRow}>
                  <div style={styles.metaCol}>
                    <span style={styles.metaLabel}>BUDGET POOL</span>
                    <span style={styles.metaVal}>
                      ${Number(c.budget || 0).toLocaleString()}
                    </span>
                  </div>

                  <div style={styles.metaCol}>
                    <span style={styles.metaLabel}>TIMELINE</span>
                    <span style={styles.metaVal}>
                      {c.startDate ? `${c.startDate} → ${c.endDate}` : "Flexible"}
                    </span>
                  </div>
                </div>

                <div style={styles.cardFooter}>
                  <button
                    onClick={() => setSelectedBriefCampaign(c)}
                    style={styles.secondaryBtn}
                  >
                    View Brief
                  </button>
                  <button
                    onClick={() => handleApply(c)}
                    style={{ ...styles.primaryBtn, backgroundColor: accent }}
                  >
                    <Send size={13} style={{ marginRight: 5 }} />
                    Express Interest
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Campaign Brief Modal */}
      {selectedBriefCampaign && (
        <div style={styles.modalBackdrop}>
          <div style={styles.modalCard}>
            <div style={styles.modalHeader}>
              <div>
                <span style={styles.modalSubHeader}>OFFICIAL BRAND CAMPAIGN BRIEF</span>
                <h3 style={styles.modalTitle}>{selectedBriefCampaign.name}</h3>
              </div>
              <button
                onClick={() => setSelectedBriefCampaign(null)}
                style={styles.modalCloseBtn}
              >
                <X size={18} />
              </button>
            </div>

            <div style={styles.modalContent}>
              <div style={styles.briefGrid}>
                <div style={styles.briefItem}>
                  <span style={styles.briefLabel}>Target Niche</span>
                  <span style={styles.briefVal}>{selectedBriefCampaign.targetNiche || "Tech / All"}</span>
                </div>
                <div style={styles.briefItem}>
                  <span style={styles.briefLabel}>Campaign Objective</span>
                  <span style={styles.briefVal}>{selectedBriefCampaign.objective || "Brand Awareness"}</span>
                </div>
                <div style={styles.briefItem}>
                  <span style={styles.briefLabel}>Budget Pool</span>
                  <span style={styles.briefVal}>${Number(selectedBriefCampaign.budget || 0).toLocaleString()}</span>
                </div>
                <div style={styles.briefItem}>
                  <span style={styles.briefLabel}>Flight Dates</span>
                  <span style={styles.briefVal}>{selectedBriefCampaign.startDate} → {selectedBriefCampaign.endDate}</span>
                </div>
              </div>

              <div style={styles.briefSection}>
                <h4 style={styles.briefSectionTitle}>Campaign Description & Vision</h4>
                <p style={styles.briefSectionText}>
                  {selectedBriefCampaign.description || "The brand is seeking dedicated creator placements showcasing product workflows, authentic integrations, and link attribution."}
                </p>
              </div>

              {selectedBriefCampaign.requirements && (
                <div style={styles.briefSection}>
                  <h4 style={styles.briefSectionTitle}>Talking Points & Content Requirements</h4>
                  <p style={styles.briefSectionText}>{selectedBriefCampaign.requirements}</p>
                </div>
              )}
            </div>

            <div style={styles.modalFooter}>
              <button
                onClick={() => setSelectedBriefCampaign(null)}
                style={styles.secondaryBtn}
              >
                Close
              </button>
              <button
                onClick={() => handleApply(selectedBriefCampaign)}
                style={{ ...styles.primaryBtn, backgroundColor: accent }}
              >
                <Send size={14} style={{ marginRight: 6 }} />
                Submit Profile & Pitch
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
    gap: "20px",
  },
  topBar: {
    display: "flex",
    justifyContent: "space-between",
    alignItems: "center",
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
  successBanner: {
    backgroundColor: "#f0fdf4",
    border: "1px solid #bbf7d0",
    borderRadius: "10px",
    padding: "12px 16px",
    display: "flex",
    alignItems: "center",
    gap: "10px",
    fontSize: "13px",
    color: "#15803d",
    fontWeight: "500",
  },
  filterCard: {
    backgroundColor: "#ffffff",
    border: "1px solid #e2e8f0",
    borderRadius: "12px",
    padding: "12px 16px",
    display: "flex",
    gap: "12px",
    alignItems: "center",
    flexWrap: "wrap",
  },
  searchWrap: {
    flex: 1,
    minWidth: "240px",
    position: "relative",
  },
  searchIcon: {
    position: "absolute",
    left: "12px",
    top: "50%",
    transform: "translateY(-50%)",
  },
  searchInput: {
    width: "100%",
    padding: "9px 12px 9px 36px",
    borderRadius: "8px",
    border: "1px solid #cbd5e1",
    fontSize: "13px",
    outline: "none",
    boxSizing: "border-box",
  },
  selectWrap: {
    display: "flex",
    alignItems: "center",
    gap: "6px",
    border: "1px solid #cbd5e1",
    borderRadius: "8px",
    padding: "2px 8px",
  },
  selectInput: {
    border: "none",
    outline: "none",
    fontSize: "13px",
    color: "#334155",
    padding: "7px 4px",
    backgroundColor: "transparent",
  },
  grid: {
    display: "grid",
    gridTemplateColumns: "repeat(auto-fill, minmax(320px, 1fr))",
    gap: "20px",
  },
  card: {
    backgroundColor: "#ffffff",
    border: "1px solid #e2e8f0",
    borderRadius: "14px",
    overflow: "hidden",
    boxShadow: "0 1px 3px rgba(15, 23, 42, 0.04)",
    display: "flex",
    flexDirection: "column",
  },
  cardImgWrap: {
    height: "140px",
    position: "relative",
    overflow: "hidden",
  },
  cardImg: {
    width: "100%",
    height: "100%",
    objectFit: "cover",
  },
  cardImgFallback: {
    height: "120px",
    backgroundColor: "#f1f5f9",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    position: "relative",
  },
  objectiveBadge: {
    position: "absolute",
    top: "10px",
    right: "10px",
    backgroundColor: "rgba(15, 23, 42, 0.85)",
    color: "#ffffff",
    fontSize: "11px",
    fontWeight: "600",
    padding: "3px 8px",
    borderRadius: "6px",
    display: "inline-flex",
    alignItems: "center",
  },
  cardBody: {
    padding: "16px 18px",
    flex: 1,
    display: "flex",
    flexDirection: "column",
  },
  nicheTag: {
    fontSize: "11px",
    fontWeight: "700",
    color: "#0284c7",
    textTransform: "uppercase",
    letterSpacing: "0.4px",
    marginBottom: "4px",
  },
  cardTitle: {
    fontSize: "16px",
    fontWeight: "700",
    color: "#0f172a",
    marginBottom: "6px",
  },
  cardDesc: {
    fontSize: "12.5px",
    color: "#64748b",
    lineHeight: "1.4",
    flex: 1,
    marginBottom: "14px",
  },
  cardMetaRow: {
    display: "flex",
    justifyContent: "space-between",
    backgroundColor: "#f8fafc",
    padding: "10px 12px",
    borderRadius: "8px",
    border: "1px solid #f1f5f9",
    marginBottom: "14px",
  },
  metaCol: {
    display: "flex",
    flexDirection: "column",
  },
  metaLabel: {
    fontSize: "10px",
    fontWeight: "700",
    color: "#94a3b8",
    textTransform: "uppercase",
  },
  metaVal: {
    fontSize: "13px",
    fontWeight: "700",
    color: "#0f172a",
    marginTop: "2px",
  },
  cardFooter: {
    display: "flex",
    gap: "8px",
  },
  primaryBtn: {
    flex: 1,
    display: "inline-flex",
    alignItems: "center",
    justifyContent: "center",
    padding: "8px 14px",
    borderRadius: "8px",
    color: "#ffffff",
    fontSize: "12.5px",
    fontWeight: "600",
    border: "none",
    cursor: "pointer",
  },
  secondaryBtn: {
    padding: "8px 14px",
    borderRadius: "8px",
    border: "1px solid #cbd5e1",
    backgroundColor: "#ffffff",
    color: "#334155",
    fontSize: "12.5px",
    fontWeight: "600",
    cursor: "pointer",
  },
  loadingBox: {
    padding: "60px 20px",
    textAlign: "center",
    backgroundColor: "#ffffff",
    borderRadius: "14px",
    border: "1px solid #e2e8f0",
  },
  spinner: {
    width: "32px",
    height: "32px",
    borderRadius: "50%",
    border: "3px solid #e2e8f0",
    animation: "spin 0.8s linear infinite",
    margin: "0 auto",
  },
  loadingText: {
    marginTop: "12px",
    fontSize: "13.5px",
    color: "#64748b",
  },
  emptyState: {
    textAlign: "center",
    padding: "50px 20px",
    backgroundColor: "#ffffff",
    borderRadius: "14px",
    border: "1px solid #e2e8f0",
  },
  emptyIconWrap: {
    width: "56px",
    height: "56px",
    borderRadius: "50%",
    backgroundColor: "#f8fafc",
    border: "1px solid #e2e8f0",
    display: "inline-flex",
    alignItems: "center",
    justifyContent: "center",
    marginBottom: "12px",
  },
  emptyTitle: {
    fontSize: "15px",
    fontWeight: "700",
    color: "#0f172a",
  },
  emptyDesc: {
    fontSize: "13px",
    color: "#64748b",
    maxWidth: "380px",
    margin: "6px auto 0",
  },
  modalBackdrop: {
    position: "fixed",
    inset: 0,
    backgroundColor: "rgba(15, 23, 42, 0.5)",
    backdropFilter: "blur(3px)",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    zIndex: 1000,
    padding: "20px",
  },
  modalCard: {
    backgroundColor: "#ffffff",
    borderRadius: "16px",
    maxWidth: "580px",
    width: "100%",
    maxHeight: "90vh",
    display: "flex",
    flexDirection: "column",
    boxShadow: "0 20px 25px -5px rgba(0, 0, 0, 0.1)",
    overflow: "hidden",
  },
  modalHeader: {
    padding: "20px 24px",
    borderBottom: "1px solid #e2e8f0",
    display: "flex",
    justifyContent: "space-between",
    alignItems: "flex-start",
  },
  modalSubHeader: {
    fontSize: "11px",
    fontWeight: "700",
    color: "#0284c7",
    letterSpacing: "0.5px",
    textTransform: "uppercase",
  },
  modalTitle: {
    fontSize: "18px",
    fontWeight: "800",
    color: "#0f172a",
    marginTop: "2px",
  },
  modalCloseBtn: {
    background: "none",
    border: "none",
    padding: "6px",
    cursor: "pointer",
    borderRadius: "6px",
  },
  modalContent: {
    padding: "20px 24px",
    overflowY: "auto",
    flex: 1,
    display: "flex",
    flexDirection: "column",
    gap: "18px",
  },
  briefGrid: {
    display: "grid",
    gridTemplateColumns: "1fr 1fr",
    gap: "12px",
    backgroundColor: "#f8fafc",
    padding: "14px",
    borderRadius: "10px",
    border: "1px solid #e2e8f0",
  },
  briefItem: {
    display: "flex",
    flexDirection: "column",
  },
  briefLabel: {
    fontSize: "10.5px",
    fontWeight: "700",
    color: "#64748b",
    textTransform: "uppercase",
  },
  briefVal: {
    fontSize: "13px",
    fontWeight: "700",
    color: "#0f172a",
    marginTop: "2px",
  },
  briefSection: {
    display: "flex",
    flexDirection: "column",
    gap: "4px",
  },
  briefSectionTitle: {
    fontSize: "13px",
    fontWeight: "700",
    color: "#0f172a",
  },
  briefSectionText: {
    fontSize: "13px",
    color: "#475569",
    lineHeight: "1.5",
  },
  modalFooter: {
    padding: "16px 24px",
    borderTop: "1px solid #e2e8f0",
    display: "flex",
    justifyContent: "flex-end",
    gap: "10px",
    backgroundColor: "#f8fafc",
  },
};
