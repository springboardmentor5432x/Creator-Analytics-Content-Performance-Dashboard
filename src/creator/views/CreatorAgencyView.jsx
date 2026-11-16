import React, { useState, useEffect, useCallback, useMemo } from "react";
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
  Mail,
  DollarSign,
  Briefcase,
  Search,
  Filter,
  Check,
  ChevronRight,
  Calendar,
  Layers,
  FileText,
  Percent,
  TrendingUp,
  CreditCard,
  Info,
} from "lucide-react";
import {
  getRegisteredAgencies,
  getAgencyCreatorRelationships,
  getAgencyRecommendations,
  submitRepresentationRequest,
  getCreatorRepresentationRequests,
  withdrawRepresentationRequest,
  getActiveAgencyRepresentation,
  getAgencyCampaignAssignments,
  respondToAgencyCampaignAssignment,
  updateAgencyCampaignProgress,
  getCreatorCommissionOverview,
  endRepresentationRelationship,
  calculateCommission,
} from "../../agency/agencyService";

export default function CreatorAgencyView({
  user,
  userProfile,
  theme,
  onNavigate,
  invitations = [],
}) {
  const accent = theme?.accent || "#2563eb";
  const accentLight = theme?.accentLight || "#eff6ff";

  // Active top sub-tab
  const [activeTab, setActiveTab] = useState("discover"); // "discover" | "requests" | "my_agency" | "campaigns" | "earnings"

  // Data states
  const [agencies, setAgencies] = useState([]);
  const [myRequests, setMyRequests] = useState([]);
  const [activeAgency, setActiveAgency] = useState(null);
  const [agencyCampaigns, setAgencyCampaigns] = useState([]);
  const [commissionOverview, setCommissionOverview] = useState(null);
  const [loading, setLoading] = useState(true);

  // Search & Filter state for Discover Agencies
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedNiche, setSelectedNiche] = useState("all");

  // Filter state for My Requests
  const [requestStatusFilter, setRequestStatusFilter] = useState("all");

  // Search & Filter state for Agency Campaigns
  const [campaignSearchQuery, setCampaignSearchQuery] = useState("");
  const [selectedAgencyFilter, setSelectedAgencyFilter] = useState("all");
  const [campaignStatusFilter, setCampaignStatusFilter] = useState("all");

  // Modal: Send Representation Request
  const [requestModalAgency, setRequestModalAgency] = useState(null);
  const [proposedTerms, setProposedTerms] = useState(
    "Standard Representation (15% agency commission on secured brand deals)"
  );
  const [pitchMessage, setPitchMessage] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Modal: End Representation
  const [confirmEndModal, setConfirmEndModal] = useState(false);
  const [endReason, setEndReason] = useState("");
  const [isEnding, setIsEnding] = useState(false);

  // Action in progress state
  const [actionInProgress, setActionInProgress] = useState(null);

  // Toast
  const [toast, setToast] = useState("");
  const showToast = (msg) => {
    setToast(msg);
    setTimeout(() => setToast(""), 4000);
  };

  const creatorId = user?.uid || "usr_creator_demo";
  const creatorEmail = user?.email || "creator@creatoriq.io";

  // Load all representation and campaign data
  const loadData = useCallback(async () => {
    setLoading(true);
    try {
      const [
        agencyList,
        requestsList,
        activeRep,
        campaignsList,
        commOverview,
      ] = await Promise.all([
        getRegisteredAgencies(),
        getCreatorRepresentationRequests({ creatorId, creatorEmail }),
        getActiveAgencyRepresentation({ creatorId, creatorEmail }),
        getAgencyCampaignAssignments({ creatorId, creatorEmail }),
        getCreatorCommissionOverview({ creatorId, creatorEmail }),
      ]);

      setAgencies(agencyList || []);
      setMyRequests(requestsList || []);
      setActiveAgency(activeRep || null);
      setAgencyCampaigns(campaignsList || []);
      setCommissionOverview(commOverview || null);
    } catch (err) {
      console.warn("Failed to load creator agency data:", err);
    } finally {
      setLoading(false);
    }
  }, [creatorId, creatorEmail]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  // Handle Send Representation Request
  const handleSendRequest = async (e) => {
    e.preventDefault();
    if (!requestModalAgency) return;
    setIsSubmitting(true);
    try {
      await submitRepresentationRequest({
        creatorUser: {
          uid: creatorId,
          email: creatorEmail,
          fullName: userProfile?.fullName || user?.displayName || "Content Creator",
          handle: userProfile?.handle || `@${creatorEmail.split("@")[0]}`,
          niche: userProfile?.niche || "Tech & Software",
          platforms: userProfile?.platforms || ["YouTube"],
          formattedFollowers: userProfile?.followers || "100K+",
        },
        agency: requestModalAgency,
        message: pitchMessage,
        proposedTerms: proposedTerms,
      });

      showToast(`Representation request sent successfully to ${requestModalAgency.fullName || "Agency"}!`);
      setRequestModalAgency(null);
      setPitchMessage("");
      await loadData();
      setActiveTab("requests");
    } catch (err) {
      alert(err.message || "Failed to submit representation request.");
    } finally {
      setIsSubmitting(false);
    }
  };

  // Handle Withdraw Request
  const handleWithdrawRequest = async (requestId) => {
    if (!window.confirm("Are you sure you want to withdraw this pending representation request?")) {
      return;
    }
    setActionInProgress(requestId);
    try {
      await withdrawRepresentationRequest(requestId, user || { uid: creatorId, email: creatorEmail });
      showToast("Representation request withdrawn.");
      loadData();
    } catch (err) {
      alert(err.message || "Failed to withdraw request.");
    } finally {
      setActionInProgress(null);
    }
  };

  // Handle End Representation
  const handleEndRepresentation = async () => {
    if (!activeAgency) return;
    setIsEnding(true);
    try {
      await endRepresentationRelationship(
        activeAgency.id,
        user || { uid: creatorId, role: "Creator", email: creatorEmail },
        endReason
      );
      showToast("Agency representation ended.");
      setConfirmEndModal(false);
      setEndReason("");
      loadData();
      setActiveTab("discover");
    } catch (err) {
      alert(err.message || "Failed to end representation.");
    } finally {
      setIsEnding(false);
    }
  };

  // Handle Respond to Agency Campaign Assignment
  const handleRespondToAssignment = async (assignmentId, newStatus) => {
    setActionInProgress(assignmentId);
    try {
      await respondToAgencyCampaignAssignment(assignmentId, newStatus, user);
      showToast(
        newStatus === "ACCEPTED"
          ? "Campaign assignment accepted! Deliverables tracking is active."
          : "Campaign assignment declined."
      );
      loadData();
    } catch (err) {
      alert(err.message || "Failed to respond to assignment.");
    } finally {
      setActionInProgress(null);
    }
  };

  // Handle Update Campaign Progress
  const handleUpdateProgress = async (assignmentId, newStatus) => {
    setActionInProgress(assignmentId);
    try {
      await updateAgencyCampaignProgress(assignmentId, newStatus);
      showToast(`Campaign status updated to ${newStatus}.`);
      loadData();
    } catch (err) {
      alert(err.message || "Failed to update campaign progress.");
    } finally {
      setActionInProgress(null);
    }
  };

  // Filtered agencies based on search query and niche
  const filteredAgencies = useMemo(() => {
    return agencies.filter((agency) => {
      const q = searchQuery.toLowerCase().trim();
      const name = (agency.fullName || agency.agencyName || "").toLowerCase();
      const email = (agency.email || "").toLowerCase();
      const bio = (agency.bio || agency.description || "").toLowerCase();
      const location = (agency.location || "").toLowerCase();
      const matchesSearch = !q || name.includes(q) || email.includes(q) || bio.includes(q) || location.includes(q);

      const niches = (agency.niches || ["General"]).map((n) => n.toLowerCase());
      const matchesNiche =
        selectedNiche === "all" ||
        niches.some((n) => n.includes(selectedNiche.toLowerCase())) ||
        bio.includes(selectedNiche.toLowerCase());

      return matchesSearch && matchesNiche;
    });
  }, [agencies, searchQuery, selectedNiche]);

  // Unique niches available in registered agencies
  const availableNiches = useMemo(() => {
    const set = new Set(["all"]);
    agencies.forEach((a) => {
      (a.niches || []).forEach((n) => set.add(n));
    });
    return Array.from(set);
  }, [agencies]);

  // Filtered requests
  const filteredRequests = useMemo(() => {
    return myRequests.filter((req) => {
      if (requestStatusFilter === "all") return true;
      return (req.status || "").toUpperCase() === requestStatusFilter.toUpperCase();
    });
  }, [myRequests, requestStatusFilter]);

  // Filtered Agency Campaigns
  const filteredAgencyCampaigns = useMemo(() => {
    return agencyCampaigns.filter((camp) => {
      // 1. Search Query
      const q = campaignSearchQuery.trim().toLowerCase();
      if (q) {
        const title = (camp.campaignTitle || "").toLowerCase();
        const brand = (camp.brandName || "").toLowerCase();
        const agency = (camp.agencyName || "").toLowerCase();
        const dels = Array.isArray(camp.deliverables)
          ? camp.deliverables.join(" ").toLowerCase()
          : (camp.deliverables || "").toLowerCase();
        if (!title.includes(q) && !brand.includes(q) && !agency.includes(q) && !dels.includes(q)) {
          return false;
        }
      }

      // 2. Agency Filter
      if (selectedAgencyFilter !== "all") {
        const agencyEmail = (camp.agencyEmail || "").toLowerCase();
        const agencyId = camp.agencyId;
        if (agencyEmail !== selectedAgencyFilter.toLowerCase() && agencyId !== selectedAgencyFilter) {
          return false;
        }
      }

      // 3. Status Filter
      if (campaignStatusFilter !== "all") {
        const statusNorm = (camp.status || "PENDING").toUpperCase();
        if (statusNorm !== campaignStatusFilter.toUpperCase()) {
          return false;
        }
      }

      return true;
    });
  }, [agencyCampaigns, campaignSearchQuery, selectedAgencyFilter, campaignStatusFilter]);

  // Unique Agencies for Campaign Filter Dropdown
  const availableCampaignAgencies = useMemo(() => {
    const map = new Map();
    agencyCampaigns.forEach((c) => {
      const email = (c.agencyEmail || "").toLowerCase();
      const name = c.agencyName || email || "Agency";
      if (email && !map.has(email)) {
        map.set(email, name);
      }
    });
    return Array.from(map.entries()).map(([email, name]) => ({ email, name }));
  }, [agencyCampaigns]);

  // Top KPI Metrics for Campaigns
  const campaignKpis = useMemo(() => {
    const total = agencyCampaigns.length;
    const pending = agencyCampaigns.filter((c) => (c.status || "PENDING").toUpperCase() === "PENDING").length;
    const active = agencyCampaigns.filter((c) => ["ACCEPTED", "IN_PROGRESS"].includes((c.status || "").toUpperCase())).length;
    const completed = agencyCampaigns.filter((c) => (c.status || "").toUpperCase() === "COMPLETED").length;
    const totalNetEarnings = agencyCampaigns.reduce((sum, c) => {
      const net = Number(c.creatorNetEarnings) || (Number(c.compensation || 0) - Number(c.agencyCommission || 0));
      return sum + (isNaN(net) ? 0 : net);
    }, 0);

    return { total, pending, active, completed, totalNetEarnings };
  }, [agencyCampaigns]);

  // Pending counts
  const pendingRequestsCount = myRequests.filter(
    (r) => (r.status || "").toUpperCase() === "PENDING"
  ).length;
  const pendingCampaignsCount = agencyCampaigns.filter(
    (c) => (c.status || "").toUpperCase() === "PENDING"
  ).length;

  return (
    <div style={styles.container}>
      {/* Toast Notification */}
      {toast && (
        <div style={styles.toast}>
          <CheckCircle2 size={16} color="#15803d" />
          <span>{toast}</span>
        </div>
      )}

      {/* Header Banner */}
      <div style={styles.headerCard}>
        <div style={styles.headerLeft}>
          <div style={{ ...styles.iconBadge, backgroundColor: accentLight, color: accent }}>
            <Building2 size={24} />
          </div>
          <div>
            <h1 style={styles.title}>Agency Representation & Talent Management</h1>
            <p style={styles.subtitle}>
              Discover accredited talent agencies, manage your representation requests, review exclusive agency campaigns, and track transparent commissions.
            </p>
          </div>
        </div>

        <button onClick={loadData} style={styles.refreshBtn} title="Refresh data">
          <RefreshCw size={15} color="#475569" className={loading ? "animate-spin" : ""} />
          <span>Refresh</span>
        </button>
      </div>

      {/* Top Sub-Navigation Tabs */}
      <div style={styles.tabNav}>
        <button
          onClick={() => setActiveTab("discover")}
          style={{
            ...styles.navTabBtn,
            ...(activeTab === "discover" ? { ...styles.navTabBtnActive, borderColor: accent, color: accent } : {}),
          }}
        >
          <Building2 size={16} />
          <span>Discover Agencies</span>
          <span style={styles.tabCountBadge}>{agencies.length}</span>
        </button>

        <button
          onClick={() => setActiveTab("requests")}
          style={{
            ...styles.navTabBtn,
            ...(activeTab === "requests" ? { ...styles.navTabBtnActive, borderColor: accent, color: accent } : {}),
          }}
        >
          <Send size={16} />
          <span>My Requests</span>
          {pendingRequestsCount > 0 && (
            <span style={{ ...styles.tabCountBadge, backgroundColor: "#dbeafe", color: "#1e40af" }}>
              {pendingRequestsCount} Pending
            </span>
          )}
        </button>

        <button
          onClick={() => setActiveTab("my_agency")}
          style={{
            ...styles.navTabBtn,
            ...(activeTab === "my_agency" ? { ...styles.navTabBtnActive, borderColor: accent, color: accent } : {}),
          }}
        >
          <ShieldCheck size={16} />
          <span>My Agency</span>
          {activeAgency && (
            <span style={{ ...styles.tabCountBadge, backgroundColor: "#d1fae5", color: "#065f46" }}>
              Active
            </span>
          )}
        </button>

        <button
          onClick={() => setActiveTab("campaigns")}
          style={{
            ...styles.navTabBtn,
            ...(activeTab === "campaigns" ? { ...styles.navTabBtnActive, borderColor: accent, color: accent } : {}),
          }}
        >
          <Layers size={16} />
          <span>Agency Campaigns</span>
          {pendingCampaignsCount > 0 && (
            <span style={{ ...styles.tabCountBadge, backgroundColor: "#fef3c7", color: "#92400e" }}>
              {pendingCampaignsCount} New
            </span>
          )}
        </button>

        <button
          onClick={() => setActiveTab("earnings")}
          style={{
            ...styles.navTabBtn,
            ...(activeTab === "earnings" ? { ...styles.navTabBtnActive, borderColor: accent, color: accent } : {}),
          }}
        >
          <DollarSign size={16} />
          <span>Commission & Earnings</span>
        </button>
      </div>

      {/* ========================================================================= */}
      {/* SECTION A: DISCOVER AGENCIES                                             */}
      {/* ========================================================================= */}
      {activeTab === "discover" && (
        <div style={styles.section}>
          {/* Active Agency Reminder if already represented */}
          {activeAgency && (
            <div style={styles.representedNoticeBanner}>
              <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
                <CheckCircle2 size={20} color="#0d9488" />
                <div>
                  <div style={{ fontWeight: "700", color: "#0f766e", fontSize: "14px" }}>
                    Currently Represented by {activeAgency.agencyName}
                  </div>
                  <div style={{ fontSize: "12.5px", color: "#134e4a" }}>
                    You have active exclusive representation. You can still browse other accredited agencies or view your representation details in the "My Agency" tab.
                  </div>
                </div>
              </div>
              <button
                onClick={() => setActiveTab("my_agency")}
                style={styles.noticeLinkBtn}
              >
                View My Agency <ChevronRight size={14} />
              </button>
            </div>
          )}

          {/* Search and Filters Bar */}
          <div style={styles.filtersBar}>
            <div style={styles.searchWrapper}>
              <Search size={16} color="#94a3b8" style={{ marginLeft: 12, marginRight: 8 }} />
              <input
                type="text"
                placeholder="Search registered agencies by name, email, niche, or location..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                style={styles.searchInput}
              />
              {searchQuery && (
                <button
                  onClick={() => setSearchQuery("")}
                  style={styles.clearSearchBtn}
                  aria-label="Clear search"
                >
                  <XCircle size={15} color="#94a3b8" />
                </button>
              )}
            </div>

            <div style={styles.nicheFilterGroup}>
              <Filter size={14} color="#64748b" style={{ marginRight: 6 }} />
              <span style={{ fontSize: "13px", fontWeight: "600", color: "#475569", marginRight: 8 }}>
                Niche:
              </span>
              <select
                value={selectedNiche}
                onChange={(e) => setSelectedNiche(e.target.value)}
                style={styles.selectInput}
              >
                {availableNiches.map((n) => (
                  <option key={n} value={n}>
                    {n === "all" ? "All Niches" : n}
                  </option>
                ))}
              </select>
            </div>
          </div>

          {/* Agencies Grid */}
          {filteredAgencies.length === 0 ? (
            <div style={styles.emptyCard}>
              <Building2 size={40} color="#cbd5e1" style={{ marginBottom: 12 }} />
              <h3 style={styles.emptyTitle}>No matching agencies found</h3>
              <p style={styles.emptyDesc}>
                {searchQuery || selectedNiche !== "all"
                  ? "Try adjusting your search query or niche filter to see more registered agencies."
                  : "No accredited talent agencies are currently registered in the directory."}
              </p>
            </div>
          ) : (
            <div style={styles.agenciesGrid}>
              {filteredAgencies.map((agency) => {
                const isCurrentlyRepresentedByThis =
                  activeAgency &&
                  (activeAgency.agencyId === agency.uid ||
                    activeAgency.agencyEmail?.toLowerCase() === agency.email?.toLowerCase());

                const hasPendingWithThis = myRequests.some(
                  (r) =>
                    (r.agencyId === agency.uid ||
                      r.agencyEmail?.toLowerCase() === agency.email?.toLowerCase()) &&
                    (r.status || "").toUpperCase() === "PENDING"
                );

                return (
                  <div key={agency.uid} style={styles.agencyCard}>
                    <div style={styles.agencyCardTop}>
                      <div style={styles.agencyCardAvatar}>
                        <Building2 size={24} color="#0d9488" />
                      </div>
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 6 }}>
                          <h3 style={styles.agencyCardName}>{agency.fullName || "Talent Agency"}</h3>
                          <span style={styles.verifiedTag}>
                            <ShieldCheck size={11} color="#0d9488" /> Accredited
                          </span>
                        </div>
                        <div style={styles.agencyCardEmail}>
                          <Mail size={12} color="#64748b" style={{ marginRight: 5, flexShrink: 0 }} />
                          <span style={{ overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                            {agency.email}
                          </span>
                        </div>
                      </div>
                    </div>

                    <p style={styles.agencyCardBio}>
                      {agency.bio || agency.description || "Accredited full-service talent representation agency on CreatorIQ."}
                    </p>

                    {/* Real Dynamic Collaboration Statistics */}
                    <div style={styles.agencyStatsContainer}>
                      <div style={styles.statMetricItem}>
                        <div style={{ ...styles.statIconBadge, backgroundColor: "#eff6ff", color: "#2563eb" }}>
                          <Users size={14} />
                        </div>
                        <div>
                          <div style={styles.statNumber}>{agency.collaboratedCreatorsCount ?? 0}</div>
                          <div style={styles.statLabelText}>Represented Creators</div>
                        </div>
                      </div>

                      <div style={styles.statMetricItem}>
                        <div style={{ ...styles.statIconBadge, backgroundColor: "#f0fdf4", color: "#16a34a" }}>
                          <Briefcase size={14} />
                        </div>
                        <div>
                          <div style={styles.statNumber}>{agency.collaboratedBrandsCount ?? 0}</div>
                          <div style={styles.statLabelText}>Collaborated Brands</div>
                        </div>
                      </div>
                    </div>

                    {/* Tags */}
                    <div style={styles.nicheTags}>
                      {(agency.niches || ["Tech", "General"]).slice(0, 3).map((n) => (
                        <span key={n} style={styles.nicheTag}>
                          {n}
                        </span>
                      ))}
                      {agency.location && (
                        <span style={{ ...styles.nicheTag, backgroundColor: "#f8fafc", color: "#64748b", borderColor: "#e2e8f0" }}>
                          📍 {agency.location}
                        </span>
                      )}
                    </div>

                    {/* Card Footer Button */}
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
                          <Send size={13} style={{ marginRight: 6 }} />
                          Request Representation
                        </button>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* ========================================================================= */}
      {/* SECTION C: MY REQUESTS                                                   */}
      {/* ========================================================================= */}
      {activeTab === "requests" && (
        <div style={styles.section}>
          <div style={styles.sectionHeaderRow}>
            <div>
              <h2 style={styles.sectionTitle}>Representation Requests History ({myRequests.length})</h2>
              <p style={styles.sectionSubtitle}>
                Track the status of representation requests you have submitted to agencies.
              </p>
            </div>

            {/* Status Filter Pills */}
            <div style={styles.filterPillsRow}>
              {["all", "pending", "accepted", "rejected", "withdrawn"].map((st) => (
                <button
                  key={st}
                  onClick={() => setRequestStatusFilter(st)}
                  style={{
                    ...styles.filterPillBtn,
                    ...(requestStatusFilter === st
                      ? { backgroundColor: accent, color: "#fff", borderColor: accent }
                      : {}),
                  }}
                >
                  {st.charAt(0).toUpperCase() + st.slice(1)}
                </button>
              ))}
            </div>
          </div>

          {filteredRequests.length === 0 ? (
            <div style={styles.emptyCard}>
              <Send size={36} color="#cbd5e1" style={{ marginBottom: 12 }} />
              <h3 style={styles.emptyTitle}>No representation requests found</h3>
              <p style={styles.emptyDesc}>
                {requestStatusFilter !== "all"
                  ? `You have no representation requests with status '${requestStatusFilter}'.`
                  : "You have not submitted any representation requests yet. Discover agencies and submit a representation proposal."}
              </p>
              {myRequests.length === 0 && (
                <button
                  onClick={() => setActiveTab("discover")}
                  style={{ ...styles.actionBtn, backgroundColor: accent, color: "#fff", marginTop: 12 }}
                >
                  <Building2 size={14} style={{ marginRight: 6 }} /> Discover Agencies
                </button>
              )}
            </div>
          ) : (
            <div style={styles.tableWrapper}>
              <table style={styles.table}>
                <thead>
                  <tr style={styles.thRow}>
                    <th style={styles.th}>Agency</th>
                    <th style={styles.th}>Proposed Terms</th>
                    <th style={styles.th}>Intro Message</th>
                    <th style={styles.th}>Date Submitted</th>
                    <th style={styles.th}>Status</th>
                    <th style={{ ...styles.th, textAlign: "right" }}>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredRequests.map((req) => {
                    const statusNorm = (req.status || "PENDING").toUpperCase();
                    const isPending = statusNorm === "PENDING";
                    const isAccepted = statusNorm === "ACCEPTED";
                    const isRejected = statusNorm === "REJECTED";
                    const isWithdrawn = statusNorm === "WITHDRAWN";

                    return (
                      <tr key={req.id} style={styles.tr}>
                        <td style={styles.tdBold}>
                          <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                            <div style={styles.smallAvatar}>
                              <Building2 size={14} color="#0d9488" />
                            </div>
                            <div>
                              <div style={{ fontWeight: "700", color: "#0f172a", fontSize: "13.5px" }}>
                                {req.agencyName}
                              </div>
                              <div style={{ fontSize: "12px", color: "#64748b", fontWeight: "400" }}>
                                {req.agencyEmail}
                              </div>
                            </div>
                          </div>
                        </td>

                        <td style={{ ...styles.td, maxWidth: 220, fontSize: "13px" }}>
                          {req.proposedTerms || "Standard Talent Representation (15%)"}
                        </td>

                        <td style={{ ...styles.td, maxWidth: 260, fontSize: "12.5px", color: "#475569" }}>
                          {req.message ? `"${req.message}"` : <span style={{ color: "#94a3b8" }}>No custom message</span>}
                        </td>

                        <td style={{ ...styles.td, fontSize: "12.5px", color: "#64748b" }}>
                          {new Date(req.createdAt).toLocaleDateString(undefined, {
                            year: "numeric",
                            month: "short",
                            day: "numeric",
                          })}
                        </td>

                        <td style={styles.td}>
                          <span
                            style={{
                              ...styles.statusChip,
                              backgroundColor: isAccepted
                                ? "#d1fae5"
                                : isPending
                                ? "#dbeafe"
                                : isWithdrawn
                                ? "#f1f5f9"
                                : "#fee2e2",
                              color: isAccepted
                                ? "#065f46"
                                : isPending
                                ? "#1e40af"
                                : isWithdrawn
                                ? "#475569"
                                : "#991b1b",
                            }}
                          >
                            {statusNorm}
                          </span>
                        </td>

                        <td style={{ ...styles.td, textAlign: "right" }}>
                          {isPending ? (
                            <button
                              onClick={() => handleWithdrawRequest(req.id)}
                              disabled={actionInProgress === req.id}
                              style={styles.withdrawBtn}
                              title="Withdraw representation request"
                            >
                              <XCircle size={13} style={{ marginRight: 4 }} />
                              <span>Withdraw</span>
                            </button>
                          ) : isAccepted ? (
                            <button
                              onClick={() => setActiveTab("my_agency")}
                              style={{ ...styles.withdrawBtn, borderColor: "#a7f3d0", color: "#065f46", backgroundColor: "#f0fdf4" }}
                            >
                              View Agency <ArrowRight size={12} style={{ marginLeft: 3 }} />
                            </button>
                          ) : (
                            <span style={{ fontSize: "12px", color: "#94a3b8" }}>—</span>
                          )}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      {/* ========================================================================= */}
      {/* SECTION D: MY AGENCY (Active Representation)                              */}
      {/* ========================================================================= */}
      {activeTab === "my_agency" && (
        <div style={styles.section}>
          {activeAgency ? (
            <div style={styles.activeAgencyCard}>
              <div style={styles.activeAgencyHeader}>
                <div style={styles.activeAgencyBrand}>
                  <div style={styles.agencyAvatar}>
                    <Building2 size={28} color="#ffffff" />
                  </div>
                  <div>
                    <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                      <h2 style={styles.agencyName}>{activeAgency.agencyName}</h2>
                      <span style={styles.verifiedBadge}>
                        <ShieldCheck size={13} color="#0d9488" /> Verified Talent Agency
                      </span>
                    </div>
                    <div style={styles.agencyEmail}>
                      <Mail size={13} color="#64748b" />
                      <span>{activeAgency.agencyEmail}</span>
                      <span>•</span>
                      <span>📍 {activeAgency.location || "Global Headquarters"}</span>
                      <span>•</span>
                      <span style={{ color: "#0d9488", fontWeight: "600" }}>Active Representation</span>
                    </div>
                  </div>
                </div>

                <button
                  onClick={() => setConfirmEndModal(true)}
                  style={styles.endBtn}
                >
                  <UserMinus size={14} />
                  <span>End Representation</span>
                </button>
              </div>

              {/* Verified Metrics for Current Agency */}
              <div style={styles.activeAgencyBody}>
                <div style={styles.agencyStatBox}>
                  <span style={styles.statLabel}>Collaborated Brands</span>
                  <span style={{ ...styles.statValue, color: "#16a34a" }}>
                    {activeAgency.collaboratedBrandsCount ?? 0}
                  </span>
                  <span style={styles.statSub}>Active brand relationships</span>
                </div>

                <div style={styles.agencyStatBox}>
                  <span style={styles.statLabel}>Represented Creators</span>
                  <span style={{ ...styles.statValue, color: "#2563eb" }}>
                    {activeAgency.collaboratedCreatorsCount ?? 0}
                  </span>
                  <span style={styles.statSub}>Talent roster members</span>
                </div>

                <div style={styles.agencyStatBox}>
                  <span style={styles.statLabel}>Representation Since</span>
                  <span style={styles.statValue}>
                    {activeAgency.createdAt
                      ? new Date(activeAgency.createdAt).toLocaleDateString()
                      : "Active"}
                  </span>
                  <span style={styles.statSub}>Contract established</span>
                </div>

                <div style={styles.agencyStatBox}>
                  <span style={styles.statLabel}>Campaign Assignments</span>
                  <span style={styles.statValue}>{agencyCampaigns.length}</span>
                  <span style={styles.statSub}>Assigned by this agency</span>
                </div>
              </div>

              <div style={styles.agencyTermsBox}>
                <div style={{ display: "flex", alignItems: "center", gap: 6, marginBottom: 4 }}>
                  <FileText size={15} color="#0f766e" />
                  <span style={styles.termsLabel}>Agreed Contract Terms & Representation Scope:</span>
                </div>
                <p style={styles.termsText}>
                  {activeAgency.terms || "Standard Exclusive Talent Management: 15% agency commission on agency-brokered sponsorships."}
                </p>
              </div>
            </div>
          ) : (
            <div style={styles.noActiveAgencyBanner}>
              <div style={{ display: "flex", alignItems: "center", gap: 14 }}>
                <div style={styles.noActiveIcon}>
                  <Sparkles size={24} color="#f59e0b" />
                </div>
                <div style={{ flex: 1 }}>
                  <h3 style={styles.noActiveTitle}>You are currently an Independent Creator</h3>
                  <p style={styles.noActiveDesc}>
                    You do not have an active talent agency representation agreement. Partnering with an accredited agency allows agents to negotiate brand sponsorships on your behalf, review high-paying campaign assignments, and handle contract fulfillment.
                  </p>
                </div>
                <button
                  onClick={() => setActiveTab("discover")}
                  style={{ ...styles.actionBtn, backgroundColor: accent, color: "#fff", whiteSpace: "nowrap" }}
                >
                  <Building2 size={14} style={{ marginRight: 6 }} /> Browse Agencies
                </button>
              </div>
            </div>
          )}
        </div>
      )}

      {/* ========================================================================= */}
      {/* SECTION E: AGENCY CAMPAIGNS                                               */}
      {/* ========================================================================= */}
      {activeTab === "campaigns" && (
        <div style={styles.section}>
          <div style={styles.sectionHeaderRow}>
            <div>
              <h2 style={styles.sectionTitle}>
                Agency-Assigned Campaigns ({agencyCampaigns.length})
              </h2>
              <p style={styles.subtitle}>
                Brand campaigns assigned directly to you through your represented agency. Distinct from direct brand marketing invitations.
              </p>
            </div>
            <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
              {activeAgency && (
                <span style={{ ...styles.sectionBadge, backgroundColor: "#f0fdfa", color: "#0f766e", borderColor: "#99f6e4" }}>
                  <ShieldCheck size={13} style={{ marginRight: 5 }} />
                  Represented by {activeAgency.agencyName}
                </span>
              )}
              <span style={styles.sectionBadge}>
                <Award size={12} style={{ marginRight: 4 }} />
                Agency Deals
              </span>
            </div>
          </div>

          {/* Quick KPI Stat Cards */}
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(210px, 1fr))", gap: "14px", marginBottom: "20px" }}>
            <div style={{ ...styles.kpiCard, borderLeft: "4px solid #2563eb" }}>
              <div style={styles.kpiHeader}>
                <span style={styles.kpiTitle}>Total Assigned Deals</span>
                <Layers size={18} color="#2563eb" />
              </div>
              <div style={{ ...styles.kpiValue, color: "#1e293b" }}>{campaignKpis.total}</div>
              <span style={styles.kpiSub}>Brand campaigns via agency</span>
            </div>

            <div style={{ ...styles.kpiCard, borderLeft: "4px solid #f59e0b" }}>
              <div style={styles.kpiHeader}>
                <span style={styles.kpiTitle}>Pending Your Review</span>
                <Clock size={18} color="#b45309" />
              </div>
              <div style={{ ...styles.kpiValue, color: "#b45309" }}>{campaignKpis.pending}</div>
              <span style={styles.kpiSub}>Require acceptance</span>
            </div>

            <div style={{ ...styles.kpiCard, borderLeft: "4px solid #0d9488" }}>
              <div style={styles.kpiHeader}>
                <span style={styles.kpiTitle}>Active In Production</span>
                <Sparkles size={18} color="#0f766e" />
              </div>
              <div style={{ ...styles.kpiValue, color: "#0f766e" }}>{campaignKpis.active}</div>
              <span style={styles.kpiSub}>In-progress deliverables</span>
            </div>

            <div style={{ ...styles.kpiCard, borderLeft: "4px solid #16a34a" }}>
              <div style={styles.kpiHeader}>
                <span style={styles.kpiTitle}>Total Net Deal Value</span>
                <DollarSign size={18} color="#15803d" />
              </div>
              <div style={{ ...styles.kpiValue, color: "#15803d" }}>
                ${campaignKpis.totalNetEarnings.toLocaleString()}
              </div>
              <span style={styles.kpiSub}>Creator take-home earnings</span>
            </div>
          </div>

          {/* Filter & Search Toolbar */}
          <div style={styles.filtersBar}>
            <div style={styles.searchWrapper}>
              <Search size={16} color="#94a3b8" style={{ margin: "0 10px 0 14px" }} />
              <input
                type="text"
                placeholder="Search campaigns by title, brand, agency, or deliverable..."
                value={campaignSearchQuery}
                onChange={(e) => setCampaignSearchQuery(e.target.value)}
                style={styles.searchInput}
              />
              {campaignSearchQuery && (
                <button onClick={() => setCampaignSearchQuery("")} style={styles.clearSearchBtn}>
                  <XCircle size={14} color="#94a3b8" />
                </button>
              )}
            </div>

            <div style={{ display: "flex", alignItems: "center", gap: 10, flexWrap: "wrap" }}>
              {/* Agency Filter */}
              <div style={styles.nicheFilterGroup}>
                <Building2 size={14} color="#64748b" style={{ marginRight: 6 }} />
                <select
                  value={selectedAgencyFilter}
                  onChange={(e) => setSelectedAgencyFilter(e.target.value)}
                  style={styles.selectInput}
                >
                  <option value="all">All Agencies ({agencyCampaigns.length})</option>
                  {availableCampaignAgencies.map((ag) => (
                    <option key={ag.email} value={ag.email}>
                      {ag.name}
                    </option>
                  ))}
                </select>
              </div>

              {/* Status Filter */}
              <div style={styles.nicheFilterGroup}>
                <Filter size={14} color="#64748b" style={{ marginRight: 6 }} />
                <select
                  value={campaignStatusFilter}
                  onChange={(e) => setCampaignStatusFilter(e.target.value)}
                  style={styles.selectInput}
                >
                  <option value="all">All Statuses</option>
                  <option value="PENDING">Pending Review ({campaignKpis.pending})</option>
                  <option value="ACCEPTED">Accepted</option>
                  <option value="IN_PROGRESS">In Progress</option>
                  <option value="COMPLETED">Completed ({campaignKpis.completed})</option>
                </select>
              </div>
            </div>
          </div>

          {agencyCampaigns.length === 0 ? (
            <div style={styles.emptyCard}>
              <Award size={36} color="#cbd5e1" style={{ marginBottom: 12 }} />
              <h3 style={styles.emptyTitle}>No agency campaigns assigned yet</h3>
              <p style={styles.emptyDesc}>
                When your represented agency matches and assigns you to a brand sponsorship, the details, deliverables, gross compensation, and net earnings will appear here.
              </p>
            </div>
          ) : filteredAgencyCampaigns.length === 0 ? (
            <div style={styles.emptyCard}>
              <Search size={36} color="#cbd5e1" style={{ marginBottom: 12 }} />
              <h3 style={styles.emptyTitle}>No matching agency campaigns</h3>
              <p style={styles.emptyDesc}>
                No campaigns match your current search or filter criteria. Try clearing search keywords or selecting "All Agencies".
              </p>
              <button
                onClick={() => {
                  setCampaignSearchQuery("");
                  setSelectedAgencyFilter("all");
                  setCampaignStatusFilter("all");
                }}
                style={{ ...styles.actionBtn, backgroundColor: accent, color: "#fff", marginTop: 12 }}
              >
                Reset Filters
              </button>
            </div>
          ) : (
            <div style={styles.tableWrapper}>
              <table style={styles.table}>
                <thead>
                  <tr style={styles.thRow}>
                    <th style={styles.th}>Campaign & Brand</th>
                    <th style={styles.th}>Assigned Agency</th>
                    <th style={styles.th}>Gross Pay</th>
                    <th style={styles.th}>Agency Commission</th>
                    <th style={styles.th}>Creator Net Earnings</th>
                    <th style={styles.th}>Deliverables & Deadline</th>
                    <th style={styles.th}>Status</th>
                    <th style={{ ...styles.th, textAlign: "right" }}>Action</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredAgencyCampaigns.map((camp) => {
                    const statusNorm = (camp.status || "PENDING").toUpperCase();
                    const isPending = statusNorm === "PENDING";
                    const isAccepted = statusNorm === "ACCEPTED";
                    const isInProgress = statusNorm === "IN_PROGRESS";
                    const isCompleted = statusNorm === "COMPLETED";

                    return (
                      <tr key={camp.id} style={styles.tr}>
                        <td style={styles.tdBold}>
                          <div style={{ fontSize: "14px", color: "#0f172a" }}>
                            {camp.campaignTitle}
                          </div>
                          <div style={{ fontSize: "12px", color: "#64748b", fontWeight: "400" }}>
                            Brand: {camp.brandName || "Brand Partner"}
                          </div>
                          {camp.instructions && (
                            <div style={{ fontSize: "11.5px", color: "#64748b", marginTop: 4, fontStyle: "italic" }}>
                              "{camp.instructions}"
                            </div>
                          )}
                        </td>

                        <td style={styles.td}>
                          <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                            <Building2 size={13} color="#0d9488" />
                            <span style={{ fontWeight: "600", color: "#0f172a" }}>
                              {camp.agencyName}
                            </span>
                          </div>
                          {camp.agencyEmail && (
                            <div style={{ fontSize: "11.5px", color: "#64748b", marginTop: 2, display: "flex", alignItems: "center", gap: 4 }}>
                              <Mail size={11} color="#94a3b8" />
                              <span>{camp.agencyEmail}</span>
                            </div>
                          )}
                        </td>

                        <td style={styles.td}>
                          <div style={{ fontSize: "13.5px", fontWeight: "700", color: "#0f172a" }}>
                            ${Number(camp.compensation || 0).toLocaleString()}
                          </div>
                        </td>

                        <td style={styles.td}>
                          <div style={{ fontSize: "13px", color: "#b45309", fontWeight: "600" }}>
                            -${Number(camp.agencyCommission || 0).toLocaleString()}
                            <span style={{ fontSize: "11px", color: "#94a3b8", display: "block" }}>
                              ({camp.commissionType === "fixed" ? "Fixed" : `${camp.commissionValue}%`})
                            </span>
                          </div>
                        </td>

                        <td style={styles.td}>
                          <div style={{ fontSize: "14px", fontWeight: "800", color: "#15803d" }}>
                            ${Number(camp.creatorNetEarnings || (camp.compensation - camp.agencyCommission)).toLocaleString()}
                          </div>
                          <span style={{ fontSize: "10.5px", fontWeight: "600", color: "#15803d", backgroundColor: "#dcfce7", padding: "1px 6px", borderRadius: "8px" }}>
                            Take-Home
                          </span>
                        </td>

                        <td style={styles.td}>
                          <div style={{ fontSize: "12.5px", color: "#334155" }}>
                            {Array.isArray(camp.deliverables)
                              ? camp.deliverables.join(", ")
                              : camp.deliverables || "Standard Deliverable"}
                          </div>
                          {camp.deadline && (
                            <div style={{ fontSize: "11px", color: "#64748b", marginTop: 3, display: "flex", alignItems: "center", gap: 4 }}>
                              <Calendar size={11} color="#64748b" />
                              <span>Deadline: {camp.deadline}</span>
                            </div>
                          )}
                        </td>

                        <td style={styles.td}>
                          <span
                            style={{
                              ...styles.statusChip,
                              backgroundColor: isCompleted
                                ? "#d1fae5"
                                : isInProgress
                                ? "#fef3c7"
                                : isAccepted
                                ? "#dbeafe"
                                : "#fee2e2",
                              color: isCompleted
                                ? "#065f46"
                                : isInProgress
                                ? "#92400e"
                                : isAccepted
                                ? "#1e40af"
                                : "#991b1b",
                            }}
                          >
                            {statusNorm}
                          </span>
                        </td>

                        <td style={{ ...styles.td, textAlign: "right" }}>
                          {isPending ? (
                            <div style={{ display: "inline-flex", gap: "6px" }}>
                              <button
                                onClick={() => handleRespondToAssignment(camp.id, "ACCEPTED")}
                                disabled={actionInProgress === camp.id}
                                style={styles.invAcceptBtn}
                                title="Accept campaign assignment"
                              >
                                <CheckCircle2 size={13} />
                                <span>Accept Deal</span>
                              </button>
                              <button
                                onClick={() => handleRespondToAssignment(camp.id, "REJECTED")}
                                disabled={actionInProgress === camp.id}
                                style={styles.invDeclineBtn}
                                title="Decline campaign assignment"
                              >
                                <XCircle size={13} />
                                <span>Decline</span>
                              </button>
                            </div>
                          ) : isAccepted ? (
                            <div style={{ display: "inline-flex", flexDirection: "column", gap: 4, alignItems: "flex-end" }}>
                              <button
                                onClick={() => handleUpdateProgress(camp.id, "IN_PROGRESS")}
                                disabled={actionInProgress === camp.id}
                                style={{ ...styles.actionBtn, backgroundColor: "#2563eb", color: "#fff", padding: "4px 10px", fontSize: "12px" }}
                              >
                                Start Production
                              </button>
                              {onNavigate && (
                                <button
                                  onClick={() => onNavigate("deliverables")}
                                  style={{ background: "transparent", border: "none", color: "#2563eb", fontSize: "11px", cursor: "pointer", textDecoration: "underline", padding: 0 }}
                                >
                                  Deliverables Pipeline →
                                </button>
                              )}
                            </div>
                          ) : isInProgress ? (
                            <div style={{ display: "inline-flex", flexDirection: "column", gap: 4, alignItems: "flex-end" }}>
                              <button
                                onClick={() => handleUpdateProgress(camp.id, "COMPLETED")}
                                disabled={actionInProgress === camp.id}
                                style={{ ...styles.actionBtn, backgroundColor: "#15803d", color: "#fff", padding: "4px 10px", fontSize: "12px" }}
                              >
                                Mark Completed
                              </button>
                              {onNavigate && (
                                <button
                                  onClick={() => onNavigate("deliverables")}
                                  style={{ background: "transparent", border: "none", color: "#15803d", fontSize: "11px", cursor: "pointer", textDecoration: "underline", padding: 0 }}
                                >
                                  Submit Deliverable →
                                </button>
                              )}
                            </div>
                          ) : (
                            <span style={{ fontSize: "12px", color: "#15803d", fontWeight: "600", display: "inline-flex", alignItems: "center", gap: 3 }}>
                              <CheckCircle2 size={13} color="#15803d" /> Completed
                            </span>
                          )}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      {/* ========================================================================= */}
      {/* SECTION F: COMMISSION & EARNINGS                                          */}
      {/* ========================================================================= */}
      {activeTab === "earnings" && (
        <div style={styles.section}>
          <div style={styles.sectionHeaderRow}>
            <div>
              <h2 style={styles.sectionTitle}>Commission Breakdown & Earnings Ledger</h2>
              <p style={styles.subtitle}>
                Transparent breakdown of gross sponsorships, agreed agency commission rates, and net creator earnings.
              </p>
            </div>
            <span style={styles.sectionBadge}>
              <Percent size={12} style={{ marginRight: 4 }} />
              Transparent Ledger
            </span>
          </div>

          {/* Metric KPI Cards */}
          <div style={styles.kpiGrid}>
            <div style={styles.kpiCard}>
              <div style={styles.kpiHeader}>
                <span style={styles.kpiTitle}>Total Gross Compensation</span>
                <DollarSign size={18} color="#2563eb" />
              </div>
              <div style={{ ...styles.kpiValue, color: "#1e293b" }}>
                ${(commissionOverview?.totalGrossCompensation || 0).toLocaleString()}
              </div>
              <div style={styles.kpiSub}>Total contracted brand deals</div>
            </div>

            <div style={styles.kpiCard}>
              <div style={styles.kpiHeader}>
                <span style={styles.kpiTitle}>Agency Commission Deducted</span>
                <Percent size={18} color="#b45309" />
              </div>
              <div style={{ ...styles.kpiValue, color: "#b45309" }}>
                -${(commissionOverview?.totalAgencyCommission || 0).toLocaleString()}
              </div>
              <div style={styles.kpiSub}>Management & deal negotiation fee</div>
            </div>

            <div style={styles.kpiCard}>
              <div style={styles.kpiHeader}>
                <span style={styles.kpiTitle}>Net Creator Earnings</span>
                <CheckCircle2 size={18} color="#15803d" />
              </div>
              <div style={{ ...styles.kpiValue, color: "#15803d" }}>
                ${(commissionOverview?.totalNetEarnings || 0).toLocaleString()}
              </div>
              <div style={styles.kpiSub}>Take-home compensation</div>
            </div>

            <div style={styles.kpiCard}>
              <div style={styles.kpiHeader}>
                <span style={styles.kpiTitle}>Confirmed Paid</span>
                <CreditCard size={18} color="#0d9488" />
              </div>
              <div style={{ ...styles.kpiValue, color: "#0d9488" }}>
                ${(commissionOverview?.paidNetEarnings || 0).toLocaleString()}
              </div>
              <div style={styles.kpiSub}>
                Pending payout: ${(commissionOverview?.pendingNetEarnings || 0).toLocaleString()}
              </div>
            </div>
          </div>

          {/* Commission Calculation Formula Info Box */}
          <div style={styles.formulaInfoCard}>
            <div style={{ display: "flex", alignItems: "flex-start", gap: 12 }}>
              <div style={{ ...styles.iconBadge, backgroundColor: "#eff6ff", color: "#2563eb", marginTop: 2 }}>
                <Info size={18} />
              </div>
              <div style={{ flex: 1 }}>
                <h3 style={{ margin: "0 0 6px", fontSize: "14.5px", fontWeight: "700", color: "#1e3a8a" }}>
                  How CreatorIQ Calculates Agency Commission & Creator Net Earnings
                </h3>
                <p style={{ margin: "0 0 10px", fontSize: "13px", color: "#334155", lineHeight: "1.5" }}>
                  CreatorIQ enforces mathematical transparency on all agency-assigned campaigns. All metrics are calculated without hidden markups or unauthorized deductions:
                </p>
                <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(260px, 1fr))", gap: 10 }}>
                  <div style={styles.formulaBox}>
                    <div style={styles.formulaTitle}>1. Percentage-Based Model</div>
                    <code style={styles.formulaCode}>
                      Agency Commission = Gross Compensation × (Commission % / 100)
                    </code>
                    <code style={styles.formulaCode}>
                      Creator Net = Gross Compensation - Agency Commission
                    </code>
                  </div>
                  <div style={styles.formulaBox}>
                    <div style={styles.formulaTitle}>2. Fixed-Fee Model</div>
                    <code style={styles.formulaCode}>
                      Agency Commission = Fixed Fee Amount ($)
                    </code>
                    <code style={styles.formulaCode}>
                      Creator Net = Gross Compensation - Fixed Fee
                    </code>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Campaign-by-Campaign Commission Breakdown Table */}
          <div style={{ marginTop: 20 }}>
            <h3 style={{ margin: "0 0 12px", fontSize: "15px", fontWeight: "700", color: "#0f172a" }}>
              Campaign Commission Ledger
            </h3>

            {agencyCampaigns.length === 0 ? (
              <div style={styles.emptyCard}>
                <p style={{ margin: 0, fontSize: "13px", color: "#64748b" }}>
                  No agency campaign assignments recorded yet.
                </p>
              </div>
            ) : (
              <div style={styles.tableWrapper}>
                <table style={styles.table}>
                  <thead>
                    <tr style={styles.thRow}>
                      <th style={styles.th}>Campaign</th>
                      <th style={styles.th}>Agency</th>
                      <th style={styles.th}>Gross Amount</th>
                      <th style={styles.th}>Commission Model</th>
                      <th style={styles.th}>Commission Amount</th>
                      <th style={styles.th}>Net Creator Payout</th>
                      <th style={styles.th}>Payout Status</th>
                    </tr>
                  </thead>
                  <tbody>
                    {agencyCampaigns.map((camp) => {
                      const isPaid = (camp.paymentStatus || "").toLowerCase() === "paid";
                      return (
                        <tr key={camp.id} style={styles.tr}>
                          <td style={styles.tdBold}>{camp.campaignTitle}</td>
                          <td style={styles.td}>{camp.agencyName}</td>
                          <td style={styles.td}>${Number(camp.compensation || 0).toLocaleString()}</td>
                          <td style={styles.td}>
                            {camp.commissionType === "fixed"
                              ? `$${camp.commissionValue} (Fixed)`
                              : `${camp.commissionValue}% (Percentage)`}
                          </td>
                          <td style={{ ...styles.td, color: "#b45309", fontWeight: "600" }}>
                            -${Number(camp.agencyCommission || 0).toLocaleString()}
                          </td>
                          <td style={{ ...styles.td, color: "#15803d", fontWeight: "800" }}>
                            ${Number(camp.creatorNetEarnings || 0).toLocaleString()}
                          </td>
                          <td style={styles.td}>
                            <span
                              style={{
                                ...styles.statusChip,
                                backgroundColor: isPaid ? "#d1fae5" : "#fef3c7",
                                color: isPaid ? "#065f46" : "#92400e",
                              }}
                            >
                              {isPaid ? "PAID" : "PENDING"}
                            </span>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* MODAL: SEND REPRESENTATION REQUEST                                        */}
      {/* ========================================================================= */}
      {requestModalAgency && (
        <div style={styles.modalOverlay}>
          <div style={styles.modalCard}>
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 12 }}>
              <h2 style={styles.modalTitle}>
                Request Representation from {requestModalAgency.fullName}
              </h2>
              <button
                onClick={() => setRequestModalAgency(null)}
                style={styles.closeModalBtn}
                aria-label="Close"
              >
                <XCircle size={18} color="#64748b" />
              </button>
            </div>

            {/* Agency Summary */}
            <div style={styles.modalSummaryBox}>
              <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                <Building2 size={20} color="#0d9488" />
                <div>
                  <div style={{ fontWeight: "700", color: "#0f172a", fontSize: "14px" }}>
                    {requestModalAgency.fullName}
                  </div>
                  <div style={{ fontSize: "12px", color: "#64748b" }}>
                    {requestModalAgency.email} • {requestModalAgency.location || "Global"}
                  </div>
                </div>
              </div>
              <div style={{ display: "flex", gap: 14, fontSize: "12px", color: "#334155" }}>
                <span><strong>{requestModalAgency.collaboratedBrandsCount ?? 0}</strong> Brands</span>
                <span>•</span>
                <span><strong>{requestModalAgency.collaboratedCreatorsCount ?? 0}</strong> Creators</span>
              </div>
            </div>

            {/* Creator Summary Preview */}
            <div style={{ ...styles.modalSummaryBox, backgroundColor: "#f8fafc", borderColor: "#e2e8f0" }}>
              <div style={{ fontSize: "12px", color: "#64748b", marginBottom: 2 }}>
                Your Creator Profile Summary:
              </div>
              <div style={{ fontWeight: "600", color: "#0f172a", fontSize: "13px" }}>
                {userProfile?.fullName || user?.displayName || "Content Creator"} ({userProfile?.handle || `@${creatorEmail.split("@")[0]}`})
              </div>
              <div style={{ fontSize: "12px", color: "#475569" }}>
                Niche: {userProfile?.niche || "Tech & Software"} • Follower Reach: {userProfile?.followers || "100K+"}
              </div>
            </div>

            <form onSubmit={handleSendRequest} style={styles.modalForm}>
              <div style={styles.formGroup}>
                <label style={styles.label}>Proposed Commission & Representation Terms</label>
                <input
                  type="text"
                  value={proposedTerms}
                  onChange={(e) => setProposedTerms(e.target.value)}
                  placeholder="e.g. Standard Representation (15% agency commission on secured brand deals)"
                  style={styles.input}
                  required
                />
                <span style={{ fontSize: "11.5px", color: "#64748b", marginTop: 3 }}>
                  Standard industry management commission is typically 15% - 20%.
                </span>
              </div>

              <div style={styles.formGroup}>
                <label style={styles.label}>Pitch Message / Introduction (Optional)</label>
                <textarea
                  value={pitchMessage}
                  onChange={(e) => setPitchMessage(e.target.value)}
                  rows={4}
                  placeholder="Introduce your channel, audience demographics, sponsorship goals, and why you'd like to join this agency..."
                  style={styles.textarea}
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
                  {isSubmitting ? "Submitting Request..." : "Send Representation Request"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* MODAL: CONFIRM END REPRESENTATION                                         */}
      {/* ========================================================================= */}
      {confirmEndModal && activeAgency && (
        <div style={styles.modalOverlay}>
          <div style={styles.modalCard}>
            <div style={{ display: "flex", alignItems: "center", gap: 10, color: "#b91c1c", marginBottom: 8 }}>
              <AlertCircle size={22} />
              <h2 style={{ ...styles.modalTitle, margin: 0, color: "#b91c1c" }}>
                End Agency Representation
              </h2>
            </div>
            <p style={styles.modalSubtitle}>
              Are you sure you want to terminate representation with <strong>{activeAgency.agencyName}</strong>? All active campaigns will be preserved, but new deals will not be managed by this agency.
            </p>

            <div style={styles.formGroup}>
              <label style={styles.label}>Reason for Ending Representation (Optional)</label>
              <textarea
                value={endReason}
                onChange={(e) => setEndReason(e.target.value)}
                rows={3}
                placeholder="Contract expired, moving to independent status, etc."
                style={styles.textarea}
              />
            </div>

            <div style={styles.modalActions}>
              <button
                type="button"
                onClick={() => setConfirmEndModal(false)}
                style={styles.cancelBtn}
              >
                Keep Active
              </button>
              <button
                type="button"
                onClick={handleEndRepresentation}
                disabled={isEnding}
                style={{ ...styles.submitBtn, backgroundColor: "#dc2626" }}
              >
                {isEnding ? "Ending..." : "Confirm & End Representation"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

// -----------------------------------------------------------------------------
// STYLES
// -----------------------------------------------------------------------------
const styles = {
  container: {
    padding: "24px",
    maxWidth: "1400px",
    margin: "0 auto",
    fontFamily: "-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif",
  },
  toast: {
    position: "fixed",
    bottom: "24px",
    right: "24px",
    backgroundColor: "#ffffff",
    padding: "12px 18px",
    borderRadius: "10px",
    boxShadow: "0 10px 25px -5px rgba(0, 0, 0, 0.15), 0 8px 10px -6px rgba(0, 0, 0, 0.1)",
    display: "flex",
    alignItems: "center",
    gap: "10px",
    fontSize: "13.5px",
    fontWeight: "600",
    color: "#0f172a",
    zIndex: 9999,
    border: "1px solid #e2e8f0",
  },
  headerCard: {
    display: "flex",
    alignItems: "center",
    justifyContent: "space-between",
    backgroundColor: "#ffffff",
    border: "1px solid #e2e8f0",
    borderRadius: "14px",
    padding: "22px 26px",
    marginBottom: "20px",
    boxShadow: "0 1px 3px rgba(0,0,0,0.04)",
  },
  headerLeft: {
    display: "flex",
    alignItems: "center",
    gap: "16px",
  },
  iconBadge: {
    width: "48px",
    height: "48px",
    borderRadius: "12px",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    flexShrink: 0,
  },
  title: {
    margin: "0 0 4px",
    fontSize: "20px",
    fontWeight: "800",
    color: "#0f172a",
    letterSpacing: "-0.01em",
  },
  subtitle: {
    margin: 0,
    fontSize: "13px",
    color: "#64748b",
    maxWidth: "800px",
    lineHeight: "1.45",
  },
  refreshBtn: {
    display: "flex",
    alignItems: "center",
    gap: "6px",
    backgroundColor: "#f8fafc",
    border: "1px solid #e2e8f0",
    borderRadius: "8px",
    padding: "8px 14px",
    fontSize: "13px",
    fontWeight: "600",
    color: "#475569",
    cursor: "pointer",
  },
  tabNav: {
    display: "flex",
    gap: "8px",
    borderBottom: "1px solid #e2e8f0",
    marginBottom: "22px",
    overflowX: "auto",
  },
  navTabBtn: {
    display: "flex",
    alignItems: "center",
    gap: "8px",
    padding: "10px 18px",
    border: "none",
    borderBottom: "2px solid transparent",
    backgroundColor: "transparent",
    fontSize: "13.5px",
    fontWeight: "600",
    color: "#64748b",
    cursor: "pointer",
    whiteSpace: "nowrap",
  },
  navTabBtnActive: {
    fontWeight: "700",
  },
  tabCountBadge: {
    fontSize: "11px",
    fontWeight: "700",
    backgroundColor: "#f1f5f9",
    color: "#475569",
    padding: "2px 7px",
    borderRadius: "10px",
  },
  section: {
    marginBottom: "28px",
  },
  sectionHeaderRow: {
    display: "flex",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: "16px",
    gap: "14px",
    flexWrap: "wrap",
  },
  sectionTitle: {
    margin: "0 0 4px",
    fontSize: "16px",
    fontWeight: "700",
    color: "#0f172a",
  },
  sectionSubtitle: {
    margin: 0,
    fontSize: "12.5px",
    color: "#64748b",
  },
  sectionBadge: {
    display: "inline-flex",
    alignItems: "center",
    fontSize: "11.5px",
    fontWeight: "600",
    backgroundColor: "#f0fdf4",
    color: "#16a34a",
    padding: "4px 10px",
    borderRadius: "6px",
    border: "1px solid #bbf7d0",
  },
  filtersBar: {
    display: "flex",
    alignItems: "center",
    justifyContent: "space-between",
    gap: "12px",
    marginBottom: "18px",
    flexWrap: "wrap",
  },
  searchWrapper: {
    display: "flex",
    alignItems: "center",
    backgroundColor: "#ffffff",
    border: "1px solid #e2e8f0",
    borderRadius: "10px",
    flex: 1,
    minWidth: "280px",
    maxWidth: "540px",
  },
  searchInput: {
    border: "none",
    outline: "none",
    width: "100%",
    padding: "10px 10px 10px 0",
    fontSize: "13px",
    color: "#0f172a",
    backgroundColor: "transparent",
  },
  clearSearchBtn: {
    border: "none",
    background: "transparent",
    padding: "6px 10px",
    cursor: "pointer",
  },
  nicheFilterGroup: {
    display: "flex",
    alignItems: "center",
    backgroundColor: "#ffffff",
    border: "1px solid #e2e8f0",
    borderRadius: "8px",
    padding: "4px 10px",
  },
  selectInput: {
    border: "none",
    outline: "none",
    fontSize: "13px",
    fontWeight: "600",
    color: "#0f172a",
    backgroundColor: "transparent",
    cursor: "pointer",
  },
  agenciesGrid: {
    display: "grid",
    gridTemplateColumns: "repeat(auto-fill, minmax(340px, 1fr))",
    gap: "18px",
  },
  agencyCard: {
    backgroundColor: "#ffffff",
    border: "1px solid #e2e8f0",
    borderRadius: "14px",
    padding: "20px",
    display: "flex",
    flexDirection: "column",
    boxShadow: "0 1px 3px rgba(0,0,0,0.03)",
  },
  agencyCardTop: {
    display: "flex",
    alignItems: "flex-start",
    gap: "12px",
    marginBottom: "12px",
  },
  agencyCardAvatar: {
    width: "44px",
    height: "44px",
    borderRadius: "10px",
    backgroundColor: "#f0fdfa",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    flexShrink: 0,
    border: "1px solid #ccfbf1",
  },
  agencyCardName: {
    margin: 0,
    fontSize: "15px",
    fontWeight: "700",
    color: "#0f172a",
  },
  agencyCardEmail: {
    display: "flex",
    alignItems: "center",
    fontSize: "12px",
    color: "#64748b",
    marginTop: "2px",
  },
  agencyCardBio: {
    margin: "0 0 14px",
    fontSize: "12.5px",
    color: "#475569",
    lineHeight: "1.45",
    flex: 1,
  },
  agencyStatsContainer: {
    display: "grid",
    gridTemplateColumns: "1fr 1fr",
    gap: "8px",
    backgroundColor: "#f8fafc",
    padding: "10px",
    borderRadius: "8px",
    marginBottom: "12px",
  },
  statMetricItem: {
    display: "flex",
    alignItems: "center",
    gap: "8px",
  },
  statIconBadge: {
    width: "28px",
    height: "28px",
    borderRadius: "6px",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    flexShrink: 0,
  },
  statNumber: {
    fontSize: "14px",
    fontWeight: "700",
    color: "#0f172a",
    lineHeight: "1.1",
  },
  statLabelText: {
    fontSize: "10.5px",
    color: "#64748b",
    lineHeight: "1.1",
  },
  nicheTags: {
    display: "flex",
    flexWrap: "wrap",
    gap: "6px",
    marginBottom: "16px",
  },
  nicheTag: {
    fontSize: "11px",
    fontWeight: "600",
    backgroundColor: "#eff6ff",
    color: "#1d4ed8",
    padding: "3px 8px",
    borderRadius: "6px",
    border: "1px solid #dbeafe",
  },
  agencyCardFooter: {
    marginTop: "auto",
    paddingTop: "12px",
    borderTop: "1px solid #f1f5f9",
  },
  requestBtn: {
    width: "100%",
    padding: "9px 14px",
    borderRadius: "8px",
    border: "none",
    color: "#ffffff",
    fontSize: "13px",
    fontWeight: "700",
    cursor: "pointer",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
  },
  activePill: {
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    gap: "6px",
    width: "100%",
    padding: "8px",
    fontSize: "12.5px",
    fontWeight: "700",
    backgroundColor: "#d1fae5",
    color: "#065f46",
    borderRadius: "8px",
  },
  pendingRequestPill: {
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    gap: "6px",
    width: "100%",
    padding: "8px",
    fontSize: "12.5px",
    fontWeight: "600",
    backgroundColor: "#eff6ff",
    color: "#1d4ed8",
    borderRadius: "8px",
  },
  verifiedTag: {
    display: "inline-flex",
    alignItems: "center",
    gap: "3px",
    fontSize: "10.5px",
    fontWeight: "700",
    color: "#0f766e",
    backgroundColor: "#ccfbf1",
    padding: "2px 6px",
    borderRadius: "4px",
  },
  emptyCard: {
    backgroundColor: "#ffffff",
    border: "1px dashed #cbd5e1",
    borderRadius: "14px",
    padding: "48px 20px",
    textAlign: "center",
    display: "flex",
    flexDirection: "column",
    alignItems: "center",
  },
  emptyTitle: {
    margin: "0 0 6px",
    fontSize: "15px",
    fontWeight: "700",
    color: "#0f172a",
  },
  emptyDesc: {
    margin: 0,
    fontSize: "13px",
    color: "#64748b",
    maxWidth: "500px",
  },
  tableWrapper: {
    backgroundColor: "#ffffff",
    border: "1px solid #e2e8f0",
    borderRadius: "12px",
    overflow: "hidden",
    boxShadow: "0 1px 3px rgba(0,0,0,0.02)",
  },
  table: {
    width: "100%",
    borderCollapse: "collapse",
    textAlign: "left",
  },
  thRow: {
    backgroundColor: "#f8fafc",
    borderBottom: "1px solid #e2e8f0",
  },
  th: {
    padding: "12px 16px",
    fontSize: "12px",
    fontWeight: "700",
    color: "#475569",
    textTransform: "uppercase",
    letterSpacing: "0.03em",
  },
  tr: {
    borderBottom: "1px solid #f1f5f9",
  },
  td: {
    padding: "14px 16px",
    fontSize: "13px",
    color: "#334155",
    verticalAlign: "middle",
  },
  tdBold: {
    padding: "14px 16px",
    fontSize: "13.5px",
    fontWeight: "700",
    color: "#0f172a",
    verticalAlign: "middle",
  },
  statusChip: {
    display: "inline-block",
    fontSize: "11px",
    fontWeight: "700",
    padding: "3px 8px",
    borderRadius: "6px",
    textTransform: "uppercase",
    letterSpacing: "0.02em",
  },
  smallAvatar: {
    width: "28px",
    height: "28px",
    borderRadius: "6px",
    backgroundColor: "#f0fdfa",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
  },
  withdrawBtn: {
    display: "inline-flex",
    alignItems: "center",
    padding: "5px 10px",
    borderRadius: "6px",
    border: "1px solid #fca5a5",
    backgroundColor: "#fff",
    color: "#b91c1c",
    fontSize: "12px",
    fontWeight: "600",
    cursor: "pointer",
  },
  filterPillsRow: {
    display: "flex",
    gap: "6px",
  },
  filterPillBtn: {
    padding: "5px 12px",
    borderRadius: "20px",
    border: "1px solid #e2e8f0",
    backgroundColor: "#ffffff",
    fontSize: "12px",
    fontWeight: "600",
    color: "#64748b",
    cursor: "pointer",
  },
  representedNoticeBanner: {
    display: "flex",
    alignItems: "center",
    justifyContent: "space-between",
    backgroundColor: "#f0fdfa",
    border: "1px solid #99f6e4",
    borderRadius: "12px",
    padding: "14px 18px",
    marginBottom: "18px",
  },
  noticeLinkBtn: {
    display: "flex",
    alignItems: "center",
    gap: "4px",
    border: "none",
    backgroundColor: "transparent",
    color: "#0d9488",
    fontWeight: "700",
    fontSize: "13px",
    cursor: "pointer",
  },
  activeAgencyCard: {
    backgroundColor: "#ffffff",
    border: "1px solid #ccfbf1",
    borderRadius: "14px",
    padding: "24px",
    boxShadow: "0 2px 6px rgba(13, 148, 136, 0.05)",
  },
  activeAgencyHeader: {
    display: "flex",
    alignItems: "center",
    justifyContent: "space-between",
    gap: "16px",
    marginBottom: "20px",
    flexWrap: "wrap",
  },
  activeAgencyBrand: {
    display: "flex",
    alignItems: "center",
    gap: "14px",
  },
  agencyAvatar: {
    width: "52px",
    height: "52px",
    borderRadius: "12px",
    backgroundColor: "#0d9488",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    flexShrink: 0,
  },
  agencyName: {
    margin: 0,
    fontSize: "18px",
    fontWeight: "800",
    color: "#0f172a",
  },
  agencyEmail: {
    display: "flex",
    alignItems: "center",
    gap: "6px",
    fontSize: "12.5px",
    color: "#64748b",
    marginTop: "2px",
  },
  verifiedBadge: {
    display: "inline-flex",
    alignItems: "center",
    gap: "4px",
    fontSize: "11px",
    fontWeight: "700",
    color: "#0d9488",
    backgroundColor: "#ccfbf1",
    padding: "3px 8px",
    borderRadius: "6px",
  },
  endBtn: {
    display: "flex",
    alignItems: "center",
    gap: "6px",
    padding: "8px 14px",
    borderRadius: "8px",
    border: "1px solid #fecaca",
    backgroundColor: "#fff",
    color: "#b91c1c",
    fontSize: "12.5px",
    fontWeight: "600",
    cursor: "pointer",
  },
  activeAgencyBody: {
    display: "grid",
    gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))",
    gap: "12px",
    marginBottom: "18px",
  },
  agencyStatBox: {
    backgroundColor: "#f8fafc",
    border: "1px solid #f1f5f9",
    borderRadius: "10px",
    padding: "14px 16px",
    display: "flex",
    flexDirection: "column",
  },
  statLabel: {
    fontSize: "11.5px",
    fontWeight: "700",
    color: "#64748b",
    textTransform: "uppercase",
    marginBottom: "4px",
  },
  statValue: {
    fontSize: "20px",
    fontWeight: "800",
    color: "#0f172a",
  },
  statSub: {
    fontSize: "11.5px",
    color: "#94a3b8",
    marginTop: "2px",
  },
  agencyTermsBox: {
    backgroundColor: "#f0fdfa",
    border: "1px solid #ccfbf1",
    borderRadius: "10px",
    padding: "14px 18px",
  },
  termsLabel: {
    fontSize: "13px",
    fontWeight: "700",
    color: "#0f766e",
  },
  termsText: {
    margin: "4px 0 0",
    fontSize: "13px",
    color: "#134e4a",
    lineHeight: "1.5",
  },
  noActiveAgencyBanner: {
    backgroundColor: "#fffbeb",
    border: "1px solid #fde68a",
    borderRadius: "14px",
    padding: "22px 24px",
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
    margin: "0 0 4px",
    fontSize: "15px",
    fontWeight: "700",
    color: "#92400e",
  },
  noActiveDesc: {
    margin: 0,
    fontSize: "13px",
    color: "#78350f",
    lineHeight: "1.45",
  },
  invAcceptBtn: {
    display: "inline-flex",
    alignItems: "center",
    gap: "4px",
    padding: "5px 10px",
    borderRadius: "6px",
    border: "none",
    backgroundColor: "#15803d",
    color: "#fff",
    fontSize: "12px",
    fontWeight: "600",
    cursor: "pointer",
  },
  invDeclineBtn: {
    display: "inline-flex",
    alignItems: "center",
    gap: "4px",
    padding: "5px 10px",
    borderRadius: "6px",
    border: "1px solid #fca5a5",
    backgroundColor: "#fff",
    color: "#b91c1c",
    fontSize: "12px",
    fontWeight: "600",
    cursor: "pointer",
  },
  actionBtn: {
    display: "inline-flex",
    alignItems: "center",
    padding: "6px 14px",
    borderRadius: "8px",
    border: "none",
    fontSize: "13px",
    fontWeight: "600",
    cursor: "pointer",
  },
  kpiGrid: {
    display: "grid",
    gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))",
    gap: "14px",
    marginBottom: "20px",
  },
  kpiCard: {
    backgroundColor: "#ffffff",
    border: "1px solid #e2e8f0",
    borderRadius: "12px",
    padding: "16px 18px",
  },
  kpiHeader: {
    display: "flex",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: "8px",
  },
  kpiTitle: {
    fontSize: "12px",
    fontWeight: "700",
    color: "#64748b",
    textTransform: "uppercase",
  },
  kpiValue: {
    fontSize: "22px",
    fontWeight: "800",
    marginBottom: "4px",
  },
  kpiSub: {
    fontSize: "11.5px",
    color: "#94a3b8",
  },
  formulaInfoCard: {
    backgroundColor: "#ffffff",
    border: "1px solid #bfdbfe",
    borderRadius: "12px",
    padding: "18px 20px",
  },
  formulaBox: {
    backgroundColor: "#f8fafc",
    border: "1px solid #e2e8f0",
    borderRadius: "8px",
    padding: "10px 12px",
  },
  formulaTitle: {
    fontSize: "12px",
    fontWeight: "700",
    color: "#0f172a",
    marginBottom: "6px",
  },
  formulaCode: {
    display: "block",
    fontSize: "11.5px",
    fontFamily: "monospace",
    color: "#1e40af",
    backgroundColor: "#eff6ff",
    padding: "4px 6px",
    borderRadius: "4px",
    marginBottom: "4px",
  },
  modalOverlay: {
    position: "fixed",
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: "rgba(15, 23, 42, 0.6)",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    zIndex: 9999,
    padding: "20px",
  },
  modalCard: {
    backgroundColor: "#ffffff",
    borderRadius: "14px",
    width: "100%",
    maxWidth: "540px",
    padding: "24px",
    boxShadow: "0 20px 25px -5px rgba(0, 0, 0, 0.1), 0 10px 10px -5px rgba(0, 0, 0, 0.04)",
  },
  modalTitle: {
    margin: 0,
    fontSize: "17px",
    fontWeight: "800",
    color: "#0f172a",
  },
  modalSubtitle: {
    margin: "4px 0 14px",
    fontSize: "13px",
    color: "#64748b",
  },
  closeModalBtn: {
    border: "none",
    background: "transparent",
    cursor: "pointer",
    padding: 0,
  },
  modalSummaryBox: {
    display: "flex",
    alignItems: "center",
    justifyContent: "space-between",
    backgroundColor: "#f0fdfa",
    border: "1px solid #ccfbf1",
    borderRadius: "10px",
    padding: "10px 14px",
    marginBottom: "14px",
  },
  modalForm: {
    display: "flex",
    flexDirection: "column",
    gap: "14px",
  },
  formGroup: {
    display: "flex",
    flexDirection: "column",
  },
  label: {
    fontSize: "12.5px",
    fontWeight: "700",
    color: "#334155",
    marginBottom: "5px",
  },
  input: {
    padding: "9px 12px",
    borderRadius: "8px",
    border: "1px solid #cbd5e1",
    fontSize: "13px",
    outline: "none",
  },
  textarea: {
    padding: "10px 12px",
    borderRadius: "8px",
    border: "1px solid #cbd5e1",
    fontSize: "13px",
    outline: "none",
    resize: "vertical",
    fontFamily: "inherit",
  },
  modalActions: {
    display: "flex",
    justifyContent: "flex-end",
    gap: "10px",
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
    fontWeight: "700",
    cursor: "pointer",
  },
};
