import React, { useState, useEffect, useCallback, useMemo } from "react";
import {
  Users,
  Building2,
  CheckCircle2,
  XCircle,
  Clock,
  Send,
  DollarSign,
  Percent,
  Layers,
  Calendar,
  AlertCircle,
  FileText,
  Briefcase,
  ArrowRight,
  Sparkles,
  RefreshCw,
  PlusCircle,
  CreditCard,
  Search,
  ExternalLink,
  Info,
} from "lucide-react";
import {
  getAgencyIncomingRequests,
  respondToRepresentationRequest,
  getRepresentedCreators,
  assignCampaignToCreator,
  getAgencyCommissionOverview,
  getAgencyBrandAssignments,
  calculateCommission,
} from "../agencyService";

export default function AgencyRepresentationView({
  user,
  userProfile,
  theme,
  onNavigate,
}) {
  const accent = theme?.accent || "#0d9488";
  const accentLight = theme?.accentLight || "#f0fdfa";

  const agencyId = user?.uid || "usr_agency_demo";
  const agencyEmail = user?.email || "agency@creatoriq.io";

  // Sub-tabs
  const [activeTab, setActiveTab] = useState("requests"); // "requests" | "roster" | "assign" | "commissions"

  // Data states
  const [incomingRequests, setIncomingRequests] = useState([]);
  const [representedCreators, setRepresentedCreators] = useState([]);
  const [agencyCampaigns, setAgencyCampaigns] = useState([]);
  const [commissionOverview, setCommissionOverview] = useState(null);
  const [loading, setLoading] = useState(true);

  // Action in progress state
  const [actionInProgress, setActionInProgress] = useState(null);

  // Response note modal/prompt state
  const [respondingRequest, setRespondingRequest] = useState(null);
  const [responseAction, setResponseAction] = useState(null); // "ACCEPTED" | "REJECTED"
  const [responseNote, setResponseNote] = useState("");
  const [isResponding, setIsResponding] = useState(false);

  // Assign Campaign Form state
  const [selectedCampaignId, setSelectedCampaignId] = useState("");
  const [selectedCreatorId, setSelectedCreatorId] = useState("");
  const [grossCompensation, setGrossCompensation] = useState("5000");
  const [commissionType, setCommissionType] = useState("percentage"); // "percentage" | "fixed"
  const [commissionValue, setCommissionValue] = useState("15");
  const [deliverablesText, setDeliverablesText] = useState("1x Dedicated Video Review, 1x Social Story Post");
  const [deadlineDate, setDeadlineDate] = useState("");
  const [instructions, setInstructions] = useState("");
  const [isAssigning, setIsAssigning] = useState(false);

  // Toast
  const [toast, setToast] = useState("");
  const showToast = (msg) => {
    setToast(msg);
    setTimeout(() => setToast(""), 4000);
  };

  // Load all agency representation data
  const loadData = useCallback(async () => {
    setLoading(true);
    try {
      const [requestsList, rosterList, assignmentsList, commOverview] = await Promise.all([
        getAgencyIncomingRequests({ agencyId, agencyEmail }),
        getRepresentedCreators({ agencyId, agencyEmail }),
        getAgencyBrandAssignments({ agencyId, agencyEmail }),
        getAgencyCommissionOverview({ agencyId, agencyEmail }),
      ]);

      setIncomingRequests(requestsList || []);
      setRepresentedCreators(rosterList || []);
      // Filter accepted brand campaigns available to assign
      const acceptedCamps = (assignmentsList || []).filter((a) => a.status === "accepted" || a.status === "active");
      setAgencyCampaigns(acceptedCamps.length > 0 ? acceptedCamps : assignmentsList || []);
      setCommissionOverview(commOverview || null);
    } catch (err) {
      console.warn("Failed to load agency representation data:", err);
    } finally {
      setLoading(false);
    }
  }, [agencyId, agencyEmail]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  // Live Commission Math Preview
  const liveCommissionCalc = useMemo(() => {
    const comp = parseFloat(grossCompensation) || 0;
    const val = parseFloat(commissionValue) || 0;
    return calculateCommission(comp, commissionType, val);
  }, [grossCompensation, commissionType, commissionValue]);

  // Handle Response to Representation Request
  const handleConfirmResponse = async () => {
    if (!respondingRequest || !responseAction) return;
    setIsResponding(true);
    try {
      await respondToRepresentationRequest(
        respondingRequest.id,
        responseAction,
        user || { uid: agencyId, email: agencyEmail },
        responseNote
      );

      showToast(
        responseAction === "ACCEPTED"
          ? `Accepted representation for ${respondingRequest.creatorName}! Added to roster.`
          : `Representation request for ${respondingRequest.creatorName} declined.`
      );
      setRespondingRequest(null);
      setResponseAction(null);
      setResponseNote("");
      await loadData();
    } catch (err) {
      alert(err.message || "Failed to respond to request.");
    } finally {
      setIsResponding(false);
    }
  };

  // Handle Quick Assign Shortcut
  const handleQuickAssign = (creator) => {
    setSelectedCreatorId(creator.creatorId);
    setActiveTab("assign");
  };

  // Handle Assign Campaign Submission
  const handleAssignSubmit = async (e) => {
    e.preventDefault();
    if (!selectedCampaignId) {
      alert("Please select a brand campaign.");
      return;
    }
    if (!selectedCreatorId) {
      alert("Please select a represented creator.");
      return;
    }

    const campaignObj = agencyCampaigns.find((c) => c.campaignId === selectedCampaignId || c.id === selectedCampaignId);
    const creatorObj = representedCreators.find((r) => r.creatorId === selectedCreatorId);

    if (!campaignObj || !creatorObj) {
      alert("Selected campaign or creator not found.");
      return;
    }

    setIsAssigning(true);
    try {
      const deliverables = deliverablesText.split(",").map((s) => s.trim()).filter(Boolean);

      await assignCampaignToCreator({
        agencyUser: {
          uid: agencyId,
          email: agencyEmail,
          fullName: userProfile?.fullName || user?.displayName || "Talent Agency",
        },
        campaign: {
          id: campaignObj.campaignId || campaignObj.id,
          title: campaignObj.campaignTitle || campaignObj.name || campaignObj.title,
          brandId: campaignObj.brandId,
          brandName: campaignObj.brandName,
          brandEmail: campaignObj.brandEmail,
        },
        creator: {
          uid: creatorObj.creatorId,
          id: creatorObj.creatorId,
          fullName: creatorObj.creatorName,
          email: creatorObj.creatorEmail,
          handle: creatorObj.creatorHandle,
        },
        compensation: liveCommissionCalc.compensation,
        commissionType: liveCommissionCalc.commissionType,
        commissionValue: liveCommissionCalc.commissionValue,
        deliverables,
        deadline: deadlineDate,
        instructions,
      });

      showToast(`Campaign successfully assigned to ${creatorObj.creatorName}!`);
      // Reset form
      setSelectedCampaignId("");
      setSelectedCreatorId("");
      setGrossCompensation("5000");
      setCommissionValue("15");
      setInstructions("");
      await loadData();
      setActiveTab("commissions");
    } catch (err) {
      alert(err.message || "Failed to assign campaign.");
    } finally {
      setIsAssigning(false);
    }
  };

  // Pending incoming requests count
  const pendingRequests = incomingRequests.filter(
    (r) => (r.status || "").toUpperCase() === "PENDING"
  );

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
            <Users size={24} />
          </div>
          <div>
            <h1 style={styles.title}>Creator Representation & Talent Management</h1>
            <p style={styles.subtitle}>
              Review incoming creator representation requests, manage your active talent roster, assign brand campaigns with live commission calculations, and track revenue.
            </p>
          </div>
        </div>

        <button onClick={loadData} style={styles.refreshBtn} title="Refresh data">
          <RefreshCw size={15} color="#475569" className={loading ? "animate-spin" : ""} />
          <span>Refresh</span>
        </button>
      </div>

      {/* Sub-Tabs Navigation */}
      <div style={styles.tabNav}>
        <button
          onClick={() => setActiveTab("requests")}
          style={{
            ...styles.navTabBtn,
            ...(activeTab === "requests" ? { ...styles.navTabBtnActive, borderColor: accent, color: accent } : {}),
          }}
        >
          <Clock size={16} />
          <span>Incoming Requests</span>
          {pendingRequests.length > 0 && (
            <span style={{ ...styles.tabCountBadge, backgroundColor: "#dbeafe", color: "#1e40af" }}>
              {pendingRequests.length} New
            </span>
          )}
        </button>

        <button
          onClick={() => setActiveTab("roster")}
          style={{
            ...styles.navTabBtn,
            ...(activeTab === "roster" ? { ...styles.navTabBtnActive, borderColor: accent, color: accent } : {}),
          }}
        >
          <Users size={16} />
          <span>Represented Creators</span>
          <span style={styles.tabCountBadge}>{representedCreators.length}</span>
        </button>

        <button
          onClick={() => setActiveTab("assign")}
          style={{
            ...styles.navTabBtn,
            ...(activeTab === "assign" ? { ...styles.navTabBtnActive, borderColor: accent, color: accent } : {}),
          }}
        >
          <PlusCircle size={16} />
          <span>Assign Campaigns</span>
        </button>

        <button
          onClick={() => setActiveTab("commissions")}
          style={{
            ...styles.navTabBtn,
            ...(activeTab === "commissions" ? { ...styles.navTabBtnActive, borderColor: accent, color: accent } : {}),
          }}
        >
          <DollarSign size={16} />
          <span>Commission Tracking</span>
        </button>
      </div>

      {/* ========================================================================= */}
      {/* SECTION A: INCOMING REQUESTS                                              */}
      {/* ========================================================================= */}
      {activeTab === "requests" && (
        <div style={styles.section}>
          <div style={styles.sectionHeaderRow}>
            <div>
              <h2 style={styles.sectionTitle}>
                Representation Requests ({incomingRequests.length})
              </h2>
              <p style={styles.sectionSubtitle}>
                Creators requesting representation to join your agency talent roster.
              </p>
            </div>
          </div>

          {incomingRequests.length === 0 ? (
            <div style={styles.emptyCard}>
              <Users size={36} color="#cbd5e1" style={{ marginBottom: 12 }} />
              <h3 style={styles.emptyTitle}>No representation requests yet</h3>
              <p style={styles.emptyDesc}>
                When creators discover your agency in the CreatorIQ directory and request representation, their profiles, stats, and proposed terms will appear here for your review.
              </p>
            </div>
          ) : (
            <div style={styles.requestsGrid}>
              {incomingRequests.map((req) => {
                const statusNorm = (req.status || "PENDING").toUpperCase();
                const isPending = statusNorm === "PENDING";
                const isAccepted = statusNorm === "ACCEPTED";
                const isRejected = statusNorm === "REJECTED";
                const isWithdrawn = statusNorm === "WITHDRAWN";

                return (
                  <div key={req.id} style={styles.requestCard}>
                    <div style={styles.requestCardHeader}>
                      <div style={styles.creatorAvatarBadge}>
                        <Users size={22} color="#0d9488" />
                      </div>
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
                          <h3 style={styles.creatorCardName}>{req.creatorName}</h3>
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
                        </div>
                        <div style={styles.creatorCardHandle}>
                          {req.creatorHandle} • {req.creatorEmail}
                        </div>
                      </div>
                    </div>

                    {/* Creator Stats */}
                    <div style={styles.creatorStatsRow}>
                      <div style={styles.creatorStatPill}>
                        <span style={styles.statPillLabel}>Niche:</span>
                        <span style={styles.statPillVal}>{req.creatorNiche || "Tech & Software"}</span>
                      </div>
                      <div style={styles.creatorStatPill}>
                        <span style={styles.statPillLabel}>Reach:</span>
                        <span style={styles.statPillVal}>{req.creatorFollowers || "100K+"}</span>
                      </div>
                      <div style={styles.creatorStatPill}>
                        <span style={styles.statPillLabel}>Platforms:</span>
                        <span style={styles.statPillVal}>
                          {Array.isArray(req.creatorPlatforms) ? req.creatorPlatforms.join(", ") : "YouTube"}
                        </span>
                      </div>
                    </div>

                    {/* Proposed Terms */}
                    <div style={styles.termsBox}>
                      <span style={{ fontWeight: "700", color: "#0f766e", fontSize: "12px" }}>
                        Proposed Terms:
                      </span>
                      <p style={{ margin: "2px 0 0", fontSize: "13px", color: "#134e4a" }}>
                        {req.proposedTerms || "Standard Representation (15% agency commission)"}
                      </p>
                    </div>

                    {/* Creator Message */}
                    {req.message && (
                      <div style={styles.messageBox}>
                        <span style={{ fontWeight: "700", color: "#475569", fontSize: "11.5px" }}>
                          Creator's Message:
                        </span>
                        <p style={{ margin: "2px 0 0", fontSize: "12.5px", color: "#334155", fontStyle: "italic" }}>
                          "{req.message}"
                        </p>
                      </div>
                    )}

                    <div style={{ fontSize: "11.5px", color: "#94a3b8", marginTop: "10px", marginBottom: "12px" }}>
                      Submitted {new Date(req.createdAt).toLocaleDateString()}
                    </div>

                    {/* Actions */}
                    <div style={styles.requestCardActions}>
                      {isPending ? (
                        <>
                          <button
                            onClick={() => {
                              setRespondingRequest(req);
                              setResponseAction("ACCEPTED");
                              setResponseNote("");
                            }}
                            style={styles.acceptBtn}
                          >
                            <CheckCircle2 size={14} /> Accept Representation
                          </button>
                          <button
                            onClick={() => {
                              setRespondingRequest(req);
                              setResponseAction("REJECTED");
                              setResponseNote("");
                            }}
                            style={styles.rejectBtn}
                          >
                            <XCircle size={14} /> Decline
                          </button>
                        </>
                      ) : isAccepted ? (
                        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", width: "100%" }}>
                          <span style={{ fontSize: "12.5px", color: "#15803d", fontWeight: "700" }}>
                            Active on Roster ✓
                          </span>
                          <button
                            onClick={() => handleQuickAssign(req)}
                            style={{ ...styles.actionBtn, backgroundColor: accent, color: "#fff", fontSize: "12px", padding: "4px 10px" }}
                          >
                            Assign Campaign <ArrowRight size={12} style={{ marginLeft: 3 }} />
                          </button>
                        </div>
                      ) : (
                        <span style={{ fontSize: "12px", color: "#94a3b8" }}>
                          {isWithdrawn ? "Withdrawn by Creator" : "Declined"}
                        </span>
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
      {/* SECTION B: REPRESENTED CREATORS                                           */}
      {/* ========================================================================= */}
      {activeTab === "roster" && (
        <div style={styles.section}>
          <div style={styles.sectionHeaderRow}>
            <div>
              <h2 style={styles.sectionTitle}>
                Actively Represented Talent Roster ({representedCreators.length})
              </h2>
              <p style={styles.sectionSubtitle}>
                Verified creators currently represented by your agency.
              </p>
            </div>
            <button
              onClick={() => setActiveTab("assign")}
              style={{ ...styles.actionBtn, backgroundColor: accent, color: "#fff" }}
            >
              <PlusCircle size={14} style={{ marginRight: 6 }} /> Assign a Campaign
            </button>
          </div>

          {representedCreators.length === 0 ? (
            <div style={styles.emptyCard}>
              <Users size={36} color="#cbd5e1" style={{ marginBottom: 12 }} />
              <h3 style={styles.emptyTitle}>No actively represented creators yet</h3>
              <p style={styles.emptyDesc}>
                Accept incoming representation requests from creators to add them to your active roster and begin assigning brand campaigns.
              </p>
              <button
                onClick={() => setActiveTab("requests")}
                style={{ ...styles.actionBtn, backgroundColor: accent, color: "#fff", marginTop: 12 }}
              >
                Review Requests <ArrowRight size={13} style={{ marginLeft: 4 }} />
              </button>
            </div>
          ) : (
            <div style={styles.rosterGrid}>
              {representedCreators.map((creator) => (
                <div key={creator.id || creator.creatorId} style={styles.rosterCard}>
                  <div style={styles.rosterCardHeader}>
                    <div style={styles.rosterAvatar}>
                      <Users size={24} color="#0d9488" />
                    </div>
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
                        <h3 style={styles.creatorCardName}>{creator.creatorName}</h3>
                        <span style={styles.activeTag}>Represented</span>
                      </div>
                      <div style={styles.creatorCardHandle}>
                        {creator.creatorHandle || `@${creator.creatorEmail?.split("@")[0]}`} • {creator.creatorEmail}
                      </div>
                    </div>
                  </div>

                  <div style={styles.rosterNicheText}>
                    <strong>Niche:</strong> {creator.creatorNiche || "Tech & Software"}
                  </div>

                  {/* Campaign Stats Grid */}
                  <div style={styles.campaignStatsGrid}>
                    <div style={styles.statMetricBox}>
                      <span style={styles.statMetricNum}>{creator.totalCampaigns || 0}</span>
                      <span style={styles.statMetricLabel}>Total Assigned</span>
                    </div>
                    <div style={styles.statMetricBox}>
                      <span style={{ ...styles.statMetricNum, color: "#2563eb" }}>
                        {creator.activeCampaigns || 0}
                      </span>
                      <span style={styles.statMetricLabel}>Active</span>
                    </div>
                    <div style={styles.statMetricBox}>
                      <span style={{ ...styles.statMetricNum, color: "#15803d" }}>
                        {creator.completedCampaigns || 0}
                      </span>
                      <span style={styles.statMetricLabel}>Completed</span>
                    </div>
                  </div>

                  <div style={styles.termsSnippet}>
                    <strong>Agreed Terms:</strong> {creator.terms || "Standard 15% agency management commission."}
                  </div>

                  <div style={styles.rosterCardFooter}>
                    <button
                      onClick={() => handleQuickAssign(creator)}
                      style={{ ...styles.actionBtn, backgroundColor: accent, color: "#fff", width: "100%", justifyContent: "center" }}
                    >
                      <PlusCircle size={14} style={{ marginRight: 6 }} /> Assign Brand Campaign
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* ========================================================================= */}
      {/* SECTION C: ASSIGN CAMPAIGNS                                               */}
      {/* ========================================================================= */}
      {activeTab === "assign" && (
        <div style={styles.section}>
          <div style={styles.sectionHeaderRow}>
            <div>
              <h2 style={styles.sectionTitle}>Assign Campaign to Represented Creator</h2>
              <p style={styles.sectionSubtitle}>
                Select an active brand campaign, choose a represented talent roster member, and set compensation with live commission preview.
              </p>
            </div>
          </div>

          <div style={styles.assignLayout}>
            {/* Form Column */}
            <form onSubmit={handleAssignSubmit} style={styles.assignForm}>
              {/* Campaign Selection */}
              <div style={styles.formGroup}>
                <label style={styles.label}>1. Select Brand Campaign</label>
                <select
                  value={selectedCampaignId}
                  onChange={(e) => setSelectedCampaignId(e.target.value)}
                  style={styles.selectField}
                  required
                >
                  <option value="">-- Choose an Assigned Brand Campaign --</option>
                  {agencyCampaigns.map((camp) => (
                    <option key={camp.id || camp.campaignId} value={camp.campaignId || camp.id}>
                      {camp.campaignTitle || camp.name || "Campaign"} (Brand: {camp.brandName || "Brand Partner"})
                    </option>
                  ))}
                </select>
                {agencyCampaigns.length === 0 && (
                  <span style={{ fontSize: "12px", color: "#b91c1c", marginTop: 4 }}>
                    Notice: No brand campaigns are assigned to your agency yet.
                  </span>
                )}
              </div>

              {/* Creator Selection */}
              <div style={styles.formGroup}>
                <label style={styles.label}>2. Select Represented Creator</label>
                <select
                  value={selectedCreatorId}
                  onChange={(e) => setSelectedCreatorId(e.target.value)}
                  style={styles.selectField}
                  required
                >
                  <option value="">-- Choose a Represented Creator from Roster --</option>
                  {representedCreators.map((creator) => (
                    <option key={creator.creatorId} value={creator.creatorId}>
                      {creator.creatorName} ({creator.creatorHandle || creator.creatorEmail})
                    </option>
                  ))}
                </select>
                {representedCreators.length === 0 && (
                  <span style={{ fontSize: "12px", color: "#b91c1c", marginTop: 4 }}>
                    Notice: No actively represented creators on your roster. Accept incoming requests first.
                  </span>
                )}
              </div>

              {/* Compensation & Commission Setup */}
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "14px" }}>
                <div style={styles.formGroup}>
                  <label style={styles.label}>Gross Compensation Amount ($)</label>
                  <input
                    type="number"
                    min="1"
                    step="1"
                    value={grossCompensation}
                    onChange={(e) => setGrossCompensation(e.target.value)}
                    style={styles.inputField}
                    required
                  />
                </div>

                <div style={styles.formGroup}>
                  <label style={styles.label}>Commission Model</label>
                  <select
                    value={commissionType}
                    onChange={(e) => setCommissionType(e.target.value)}
                    style={styles.selectField}
                  >
                    <option value="percentage">Percentage (%)</option>
                    <option value="fixed">Fixed Dollar ($)</option>
                  </select>
                </div>
              </div>

              <div style={styles.formGroup}>
                <label style={styles.label}>
                  {commissionType === "percentage" ? "Agency Commission Rate (%)" : "Fixed Agency Commission ($)"}
                </label>
                <input
                  type="number"
                  min="0"
                  max={commissionType === "percentage" ? "100" : undefined}
                  step="0.5"
                  value={commissionValue}
                  onChange={(e) => setCommissionValue(e.target.value)}
                  style={styles.inputField}
                  required
                />
              </div>

              {/* Deliverables & Deadline */}
              <div style={styles.formGroup}>
                <label style={styles.label}>Deliverables (comma-separated)</label>
                <input
                  type="text"
                  value={deliverablesText}
                  onChange={(e) => setDeliverablesText(e.target.value)}
                  placeholder="e.g. 1x YouTube mid-roll, 1x Dedicated X Thread"
                  style={styles.inputField}
                  required
                />
              </div>

              <div style={styles.formGroup}>
                <label style={styles.label}>Deliverables Deadline</label>
                <input
                  type="date"
                  value={deadlineDate}
                  onChange={(e) => setDeadlineDate(e.target.value)}
                  style={styles.inputField}
                />
              </div>

              <div style={styles.formGroup}>
                <label style={styles.label}>Deal Instructions / Production Notes</label>
                <textarea
                  rows={3}
                  value={instructions}
                  onChange={(e) => setInstructions(e.target.value)}
                  placeholder="Specific messaging requirements, sponsor links, or product demo guidelines..."
                  style={styles.textareaField}
                />
              </div>

              <button
                type="submit"
                disabled={isAssigning || representedCreators.length === 0}
                style={{ ...styles.submitAssignBtn, backgroundColor: accent }}
              >
                {isAssigning ? "Assigning Campaign..." : "Confirm & Assign Campaign to Creator"}
              </button>
            </form>

            {/* Live Calculation Preview Card */}
            <div style={styles.previewCard}>
              <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 14 }}>
                <Sparkles size={18} color="#0d9488" />
                <h3 style={{ margin: 0, fontSize: "15px", fontWeight: "700", color: "#0f172a" }}>
                  Live Commission Calculation Preview
                </h3>
              </div>

              <p style={{ fontSize: "12.5px", color: "#64748b", margin: "0 0 16px" }}>
                Calculated in real-time according to transparent CreatorIQ ledger rules:
              </p>

              <div style={styles.calcPreviewRow}>
                <span style={styles.calcPreviewLabel}>Gross Compensation:</span>
                <span style={styles.calcPreviewVal}>
                  ${liveCommissionCalc.compensation.toLocaleString()}
                </span>
              </div>

              <div style={styles.calcPreviewRow}>
                <span style={styles.calcPreviewLabel}>
                  Agency Commission ({commissionType === "percentage" ? `${liveCommissionCalc.commissionValue}%` : "Fixed"}):
                </span>
                <span style={{ ...styles.calcPreviewVal, color: "#b45309" }}>
                  -${liveCommissionCalc.agencyCommission.toLocaleString()}
                </span>
              </div>

              <div style={{ ...styles.calcPreviewRow, borderTop: "2px solid #e2e8f0", paddingTop: "12px", marginTop: "8px" }}>
                <span style={{ ...styles.calcPreviewLabel, fontWeight: "800", color: "#0f172a" }}>
                  Creator Net Payout:
                </span>
                <span style={{ ...styles.calcPreviewVal, fontSize: "18px", fontWeight: "800", color: "#15803d" }}>
                  ${liveCommissionCalc.creatorNetEarnings.toLocaleString()}
                </span>
              </div>

              <div style={styles.previewInfoNotice}>
                <Info size={14} color="#0d9488" style={{ flexShrink: 0, marginTop: 1 }} />
                <span>
                  Once assigned, the creator will receive a direct notification with the complete deal breakdown and can accept or decline the campaign assignment.
                </span>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* SECTION D: COMMISSION TRACKING                                            */}
      {/* ========================================================================= */}
      {activeTab === "commissions" && (
        <div style={styles.section}>
          <div style={styles.sectionHeaderRow}>
            <div>
              <h2 style={styles.sectionTitle}>Agency Commission Overview & Tracking</h2>
              <p style={styles.sectionSubtitle}>
                Live tracking of all agency-brokered campaign compensation and agreed management fees.
              </p>
            </div>
            <span style={styles.sectionBadge}>
              <Percent size={12} style={{ marginRight: 4 }} />
              Verified Deal Ledgers
            </span>
          </div>

          {/* Metric KPI Cards */}
          <div style={styles.kpiGrid}>
            <div style={styles.kpiCard}>
              <div style={styles.kpiHeader}>
                <span style={styles.kpiTitle}>Total Compensation Assigned</span>
                <DollarSign size={18} color="#0d9488" />
              </div>
              <div style={{ ...styles.kpiValue, color: "#0f172a" }}>
                ${(commissionOverview?.totalCompensationAssigned || 0).toLocaleString()}
              </div>
              <div style={styles.kpiSub}>Total gross campaign value</div>
            </div>

            <div style={styles.kpiCard}>
              <div style={styles.kpiHeader}>
                <span style={styles.kpiTitle}>Total Agreed Commission</span>
                <Percent size={18} color="#2563eb" />
              </div>
              <div style={{ ...styles.kpiValue, color: "#2563eb" }}>
                ${(commissionOverview?.totalAgreedCommission || 0).toLocaleString()}
              </div>
              <div style={styles.kpiSub}>Contracted agency revenue</div>
            </div>

            <div style={styles.kpiCard}>
              <div style={styles.kpiHeader}>
                <span style={styles.kpiTitle}>Pending Commission</span>
                <Clock size={18} color="#b45309" />
              </div>
              <div style={{ ...styles.kpiValue, color: "#b45309" }}>
                ${(commissionOverview?.pendingCommission || 0).toLocaleString()}
              </div>
              <div style={styles.kpiSub}>Awaiting brand payment confirmation</div>
            </div>

            <div style={styles.kpiCard}>
              <div style={styles.kpiHeader}>
                <span style={styles.kpiTitle}>Confirmed Paid Commission</span>
                <CheckCircle2 size={18} color="#15803d" />
              </div>
              <div style={{ ...styles.kpiValue, color: "#15803d" }}>
                ${(commissionOverview?.paidCommission || 0).toLocaleString()}
              </div>
              <div style={styles.kpiSub}>Strictly from verified payment records</div>
            </div>
          </div>

          {/* Campaign-by-Campaign Table */}
          <div style={{ marginTop: 20 }}>
            <h3 style={{ margin: "0 0 12px", fontSize: "15px", fontWeight: "700", color: "#0f172a" }}>
              Assigned Campaign Breakdown
            </h3>

            {(commissionOverview?.assignments || []).length === 0 ? (
              <div style={styles.emptyCard}>
                <p style={{ margin: 0, fontSize: "13px", color: "#64748b" }}>
                  No campaign assignments recorded yet. Use the "Assign Campaigns" tab to start pitching and placing your roster creators.
                </p>
              </div>
            ) : (
              <div style={styles.tableWrapper}>
                <table style={styles.table}>
                  <thead>
                    <tr style={styles.thRow}>
                      <th style={styles.th}>Campaign</th>
                      <th style={styles.th}>Represented Creator</th>
                      <th style={styles.th}>Gross Pay</th>
                      <th style={styles.th}>Commission Model</th>
                      <th style={styles.th}>Agency Commission</th>
                      <th style={styles.th}>Creator Net</th>
                      <th style={styles.th}>Campaign Status</th>
                      <th style={styles.th}>Payment Status</th>
                    </tr>
                  </thead>
                  <tbody>
                    {(commissionOverview?.assignments || []).map((camp) => {
                      const isPaid = (camp.paymentStatus || "").toLowerCase() === "paid";
                      return (
                        <tr key={camp.id} style={styles.tr}>
                          <td style={styles.tdBold}>{camp.campaignTitle}</td>
                          <td style={styles.td}>{camp.creatorName}</td>
                          <td style={styles.td}>${Number(camp.compensation || 0).toLocaleString()}</td>
                          <td style={styles.td}>
                            {camp.commissionType === "fixed"
                              ? `$${camp.commissionValue} (Fixed)`
                              : `${camp.commissionValue}% (Percentage)`}
                          </td>
                          <td style={{ ...styles.td, color: "#2563eb", fontWeight: "700" }}>
                            ${Number(camp.agencyCommission || 0).toLocaleString()}
                          </td>
                          <td style={{ ...styles.td, color: "#15803d", fontWeight: "800" }}>
                            ${Number(camp.creatorNetEarnings || 0).toLocaleString()}
                          </td>
                          <td style={styles.td}>
                            <span style={styles.statusChip}>
                              {camp.status || "PENDING"}
                            </span>
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
      {/* MODAL: RESPOND TO REQUEST                                                 */}
      {/* ========================================================================= */}
      {respondingRequest && responseAction && (
        <div style={styles.modalOverlay}>
          <div style={styles.modalCard}>
            <h2 style={styles.modalTitle}>
              {responseAction === "ACCEPTED" ? "Accept Creator Representation" : "Decline Representation Request"}
            </h2>
            <p style={styles.modalSubtitle}>
              Creator: <strong>{respondingRequest.creatorName}</strong> ({respondingRequest.creatorHandle})
            </p>

            <div style={styles.formGroup}>
              <label style={styles.label}>
                {responseAction === "ACCEPTED" ? "Welcome Note / Onboarding Instructions" : "Feedback / Reason (Optional)"}
              </label>
              <textarea
                rows={4}
                value={responseNote}
                onChange={(e) => setResponseNote(e.target.value)}
                placeholder={
                  responseAction === "ACCEPTED"
                    ? "Welcome to the roster! We will begin matching your channel with Q2 SaaS sponsorships..."
                    : "Unfortunately our tech roster is currently at full capacity for this category..."
                }
                style={styles.textareaField}
              />
            </div>

            <div style={styles.modalActions}>
              <button
                type="button"
                onClick={() => {
                  setRespondingRequest(null);
                  setResponseAction(null);
                }}
                style={styles.cancelBtn}
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleConfirmResponse}
                disabled={isResponding}
                style={{
                  ...styles.submitBtn,
                  backgroundColor: responseAction === "ACCEPTED" ? "#15803d" : "#dc2626",
                }}
              >
                {isResponding
                  ? "Processing..."
                  : responseAction === "ACCEPTED"
                  ? "Confirm & Add to Roster"
                  : "Confirm Decline"}
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
    boxShadow: "0 10px 25px -5px rgba(0, 0, 0, 0.15)",
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
    boxShadow: "0 1px 3px rgba(0,0,0,0.03)",
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
  requestsGrid: {
    display: "grid",
    gridTemplateColumns: "repeat(auto-fill, minmax(360px, 1fr))",
    gap: "18px",
  },
  requestCard: {
    backgroundColor: "#ffffff",
    border: "1px solid #e2e8f0",
    borderRadius: "14px",
    padding: "20px",
    boxShadow: "0 1px 3px rgba(0,0,0,0.03)",
  },
  requestCardHeader: {
    display: "flex",
    alignItems: "flex-start",
    gap: "12px",
    marginBottom: "14px",
  },
  creatorAvatarBadge: {
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
  creatorCardName: {
    margin: 0,
    fontSize: "15px",
    fontWeight: "700",
    color: "#0f172a",
  },
  creatorCardHandle: {
    fontSize: "12px",
    color: "#64748b",
    marginTop: "2px",
  },
  statusChip: {
    display: "inline-block",
    fontSize: "11px",
    fontWeight: "700",
    padding: "2px 7px",
    borderRadius: "6px",
    textTransform: "uppercase",
  },
  creatorStatsRow: {
    display: "flex",
    flexWrap: "wrap",
    gap: "6px",
    marginBottom: "12px",
  },
  creatorStatPill: {
    display: "inline-flex",
    alignItems: "center",
    gap: "4px",
    backgroundColor: "#f8fafc",
    border: "1px solid #e2e8f0",
    borderRadius: "6px",
    padding: "3px 8px",
    fontSize: "11.5px",
  },
  statPillLabel: {
    color: "#64748b",
  },
  statPillVal: {
    fontWeight: "700",
    color: "#0f172a",
  },
  termsBox: {
    backgroundColor: "#f0fdfa",
    border: "1px solid #ccfbf1",
    borderRadius: "8px",
    padding: "8px 12px",
    marginBottom: "8px",
  },
  messageBox: {
    backgroundColor: "#f8fafc",
    border: "1px solid #e2e8f0",
    borderRadius: "8px",
    padding: "8px 12px",
    marginBottom: "8px",
  },
  requestCardActions: {
    display: "flex",
    gap: "8px",
  },
  acceptBtn: {
    flex: 1,
    display: "inline-flex",
    alignItems: "center",
    justifyContent: "center",
    gap: "6px",
    padding: "8px 12px",
    borderRadius: "8px",
    border: "none",
    backgroundColor: "#15803d",
    color: "#ffffff",
    fontSize: "12.5px",
    fontWeight: "700",
    cursor: "pointer",
  },
  rejectBtn: {
    display: "inline-flex",
    alignItems: "center",
    justifyContent: "center",
    gap: "6px",
    padding: "8px 14px",
    borderRadius: "8px",
    border: "1px solid #fecaca",
    backgroundColor: "#ffffff",
    color: "#b91c1c",
    fontSize: "12.5px",
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
  rosterGrid: {
    display: "grid",
    gridTemplateColumns: "repeat(auto-fill, minmax(340px, 1fr))",
    gap: "18px",
  },
  rosterCard: {
    backgroundColor: "#ffffff",
    border: "1px solid #e2e8f0",
    borderRadius: "14px",
    padding: "20px",
    boxShadow: "0 1px 3px rgba(0,0,0,0.03)",
  },
  rosterCardHeader: {
    display: "flex",
    alignItems: "center",
    gap: "12px",
    marginBottom: "12px",
  },
  rosterAvatar: {
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
  activeTag: {
    fontSize: "10.5px",
    fontWeight: "700",
    backgroundColor: "#d1fae5",
    color: "#065f46",
    padding: "2px 7px",
    borderRadius: "4px",
  },
  rosterNicheText: {
    fontSize: "12.5px",
    color: "#475569",
    marginBottom: "12px",
  },
  campaignStatsGrid: {
    display: "grid",
    gridTemplateColumns: "1fr 1fr 1fr",
    gap: "8px",
    backgroundColor: "#f8fafc",
    padding: "10px",
    borderRadius: "8px",
    marginBottom: "12px",
  },
  statMetricBox: {
    display: "flex",
    flexDirection: "column",
    alignItems: "center",
  },
  statMetricNum: {
    fontSize: "16px",
    fontWeight: "800",
    color: "#0f172a",
  },
  statMetricLabel: {
    fontSize: "10.5px",
    color: "#64748b",
  },
  termsSnippet: {
    fontSize: "12px",
    color: "#64748b",
    marginBottom: "14px",
  },
  rosterCardFooter: {
    paddingTop: "12px",
    borderTop: "1px solid #f1f5f9",
  },
  assignLayout: {
    display: "grid",
    gridTemplateColumns: "1.4fr 1fr",
    gap: "24px",
  },
  assignForm: {
    backgroundColor: "#ffffff",
    border: "1px solid #e2e8f0",
    borderRadius: "14px",
    padding: "24px",
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
  selectField: {
    padding: "10px 12px",
    borderRadius: "8px",
    border: "1px solid #cbd5e1",
    fontSize: "13px",
    outline: "none",
    backgroundColor: "#ffffff",
  },
  inputField: {
    padding: "10px 12px",
    borderRadius: "8px",
    border: "1px solid #cbd5e1",
    fontSize: "13px",
    outline: "none",
  },
  textareaField: {
    padding: "10px 12px",
    borderRadius: "8px",
    border: "1px solid #cbd5e1",
    fontSize: "13px",
    outline: "none",
    resize: "vertical",
    fontFamily: "inherit",
  },
  submitAssignBtn: {
    padding: "12px 18px",
    borderRadius: "8px",
    border: "none",
    color: "#ffffff",
    fontSize: "13.5px",
    fontWeight: "700",
    cursor: "pointer",
    marginTop: "8px",
  },
  previewCard: {
    backgroundColor: "#ffffff",
    border: "1px solid #ccfbf1",
    borderRadius: "14px",
    padding: "24px",
    height: "fit-content",
    boxShadow: "0 2px 6px rgba(13, 148, 136, 0.05)",
  },
  calcPreviewRow: {
    display: "flex",
    alignItems: "center",
    justifyContent: "space-between",
    padding: "8px 0",
    fontSize: "13.5px",
  },
  calcPreviewLabel: {
    color: "#475569",
    fontSize: "13px",
  },
  calcPreviewVal: {
    fontWeight: "700",
    color: "#0f172a",
  },
  previewInfoNotice: {
    display: "flex",
    alignItems: "flex-start",
    gap: "8px",
    backgroundColor: "#f0fdfa",
    border: "1px solid #ccfbf1",
    borderRadius: "8px",
    padding: "10px 12px",
    fontSize: "12px",
    color: "#0f766e",
    marginTop: "16px",
    lineHeight: "1.45",
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
  tableWrapper: {
    backgroundColor: "#ffffff",
    border: "1px solid #e2e8f0",
    borderRadius: "12px",
    overflow: "hidden",
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
  },
  tr: {
    borderBottom: "1px solid #f1f5f9",
  },
  td: {
    padding: "14px 16px",
    fontSize: "13px",
    color: "#334155",
  },
  tdBold: {
    padding: "14px 16px",
    fontSize: "13.5px",
    fontWeight: "700",
    color: "#0f172a",
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
    maxWidth: "500px",
    padding: "24px",
    boxShadow: "0 20px 25px -5px rgba(0, 0, 0, 0.1)",
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
  modalActions: {
    display: "flex",
    justifyContent: "flex-end",
    gap: "10px",
    marginTop: "16px",
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

