import { useState, useEffect, useCallback } from "react";
import MarketingNav from "./components/MarketingNav";
import MarketingOverview from "./components/MarketingOverview";
import CampaignsList from "./components/CampaignsList";
import CampaignDetailsView from "./components/CampaignDetailsView";
import CampaignFormModal from "./components/CampaignFormModal";
import CreatorDiscovery from "./components/CreatorDiscovery";
import InvitationsManager from "./components/InvitationsManager";
import DeliverablesManager from "./components/DeliverablesManager";
import DeliverableFormModal from "./components/DeliverableFormModal";
import MarketingAnalytics from "./components/MarketingAnalytics";
import MarketingReports from "./components/MarketingReports";
import MarketingAgencies from "./components/MarketingAgencies";
import {
  getLocalCampaigns,
  getLocalInvitations,
  getLocalDeliverables,
  createCampaign,
  updateCampaign,
  setCampaignStatus,
  sendCampaignInvitation,
  createDeliverable,
  reviewDeliverable,
  subscribeToDataChanges,
  INITIAL_CAMPAIGNS,
} from "./campaignService";
import {
  fetchWorkspaceCampaigns,
  fetchWorkspaceInvitations,
  fetchWorkspaceDeliverables,
  subscribeToWorkspaceDeliverables,
  getOrCreateWorkspace,
} from "./firestoreService";

// ─── constants ───────────────────────────────
const DEMO_CAMPAIGN_IDS = new Set([
  "cmp-2026-001",
  "cmp-2026-002",
  "cmp-2026-003",
  "cmp-2026-004",
  "cmp-2026-005",
]);

// ─── helpers ─────────────────────────────────
function isDemoCampaign(campaign) {
  return DEMO_CAMPAIGN_IDS.has(campaign?.id);
}

function filterToUserCampaigns(campaigns, user) {
  if (!user) return [];
  const uid = user.uid;
  const email = (user.email || "").toLowerCase();
  return campaigns.filter(
    (c) =>
      c.marketingId === uid ||
      (c.marketingEmail || "").toLowerCase() === email
  );
}

export default function MarketingSection({ user, userProfile, theme }) {
  const [activeSection, setActiveSection] = useState("overview");
  const [selectedCampaignId, setSelectedCampaignId] = useState(null);

  // Data states
  const [campaigns, setCampaigns] = useState([]);
  const [invitations, setInvitations] = useState([]);
  const [deliverables, setDeliverables] = useState([]);
  const [workspace, setWorkspace] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  // Demo mode: shown when no real campaigns exist
  const [showDemoData, setShowDemoData] = useState(false);
  const [hasDemoToggle, setHasDemoToggle] = useState(false); // only show toggle if no real data

  // Data source indicator for transparency
  const [dataSource, setDataSource] = useState(null); // 'firestore' | 'local' | null

  // Modals
  const [isCampaignModalOpen, setIsCampaignModalOpen] = useState(false);
  const [campaignToEdit, setCampaignToEdit] = useState(null);
  const [isDeliverableModalOpen, setIsDeliverableModalOpen] = useState(false);
  const [deliverableModalContext, setDeliverableModalContext] = useState({ campaign: null, invitation: null });

  const currentUser = userProfile || user;

  // ── Main data loader ───────────────────────
  const refreshData = useCallback(async () => {
    if (!currentUser?.uid) {
      setLoading(false);
      setError("User session not found. Please log out and sign in again.");
      return;
    }

    try {
      // 1. Attempt Firestore workspace-scoped query
      const [campResult, invResult, delResult] = await Promise.all([
        fetchWorkspaceCampaigns(currentUser.uid, currentUser.email),
        fetchWorkspaceInvitations(currentUser.uid),
        fetchWorkspaceDeliverables(currentUser.uid),
      ]);

      let resolvedCampaigns = [];
      let resolvedInvitations = [];
      let resolvedDeliverables = [];
      let source = null;

      if (campResult.source === "firestore" && campResult.campaigns.length > 0) {
        // Real Firestore data exists
        resolvedCampaigns = campResult.campaigns;
        source = "firestore";
      } else {
        // Firestore empty or failed — fall back to local storage
        const localAll = getLocalCampaigns();
        // Filter to only this user's campaigns (excluding pure demo seed)
        const userOwned = filterToUserCampaigns(localAll, currentUser);
        const realUserCampaigns = userOwned.filter((c) => !isDemoCampaign(c));

        if (realUserCampaigns.length > 0) {
          resolvedCampaigns = realUserCampaigns;
          source = "local";
        } else {
          // No real campaigns — offer demo mode toggle
          resolvedCampaigns = [];
          setHasDemoToggle(true);
          source = null;
        }
      }

      // Invitations
      if (invResult.source === "firestore" && invResult.invitations.length > 0) {
        resolvedInvitations = invResult.invitations;
      } else {
        const localInvs = getLocalInvitations();
        // If we're showing demo campaigns, show all; otherwise only user-related
        const demoCampaignIds = new Set(resolvedCampaigns.map((c) => c.id));
        resolvedInvitations = localInvs.filter((inv) => {
          if (isDemoCampaign({ id: inv.campaignId })) return false;
          return true;
        });
      }

      // Deliverables
      if (delResult.source === "firestore" && delResult.deliverables.length > 0) {
        resolvedDeliverables = delResult.deliverables;
      } else {
        const localDels = getLocalDeliverables();
        resolvedDeliverables = localDels.filter((d) => !DEMO_CAMPAIGN_IDS.has(d.campaignId));
      }

      // If demo mode is active, add demo data on top
      if (showDemoData) {
        const demoCamps = getLocalCampaigns().filter(isDemoCampaign);
        const demoInvs = getLocalInvitations().filter((inv) => DEMO_CAMPAIGN_IDS.has(inv.campaignId));
        const demoDels = getLocalDeliverables().filter((d) => DEMO_CAMPAIGN_IDS.has(d.campaignId));

        resolvedCampaigns = [
          ...resolvedCampaigns,
          ...demoCamps.map((c) => ({ ...c, _isDemo: true })),
        ];
        resolvedInvitations = [...resolvedInvitations, ...demoInvs.map((i) => ({ ...i, _isDemo: true }))];
        resolvedDeliverables = [...resolvedDeliverables, ...demoDels.map((d) => ({ ...d, _isDemo: true }))];
      }

      setCampaigns(resolvedCampaigns);
      setInvitations(resolvedInvitations);
      setDeliverables(resolvedDeliverables);
      setDataSource(source);
      setError(null);
    } catch (err) {
      console.error("[MarketingSection] Error loading data:", err);
      setError("Failed to load campaign data. Please try refreshing.");
    } finally {
      setLoading(false);
    }
  }, [currentUser, showDemoData]);

  // ── Workspace init + subscription ─────────
  useEffect(() => {
    if (currentUser?.uid) {
      getOrCreateWorkspace(currentUser).then((ws) => {
        setWorkspace(ws);
      });
    }
  }, [currentUser?.uid]);

  useEffect(() => {
    setLoading(true);
    refreshData();

    const unsubscribe = subscribeToDataChanges(() => {
      refreshData();
    });

    const unsubscribeFs = subscribeToWorkspaceDeliverables(currentUser?.uid, () => {
      refreshData();
    });

    return () => {
      unsubscribe();
      unsubscribeFs();
    };
  }, [refreshData, currentUser?.uid]);

  // ── Campaign handlers ──────────────────────
  const handleOpenCreateCampaign = () => {
    setCampaignToEdit(null);
    setIsCampaignModalOpen(true);
  };

  const handleOpenEditCampaign = (camp) => {
    setCampaignToEdit(camp);
    setIsCampaignModalOpen(true);
  };

  const handleCampaignSubmit = async (formData) => {
    if (campaignToEdit) {
      await updateCampaign(campaignToEdit.id, formData);
    } else {
      await createCampaign(formData, currentUser);
    }
    setHasDemoToggle(false); // user now has a real campaign
    await refreshData();
  };

  const handleStatusChange = async (campaignId, newStatus, reason = "") => {
    await setCampaignStatus(campaignId, newStatus, reason);
    await refreshData();
  };

  // ── Invitation handlers ────────────────────
  const handleSendInvitation = async ({ campaignId, creator, compensation, message }) => {
    await sendCampaignInvitation({
      campaignId,
      creator,
      compensation,
      message,
      marketingUser: currentUser,
    });
    await refreshData();
  };

  // ── Deliverable handlers ───────────────────
  const handleOpenDeliverableModal = (campaign, invitation) => {
    setDeliverableModalContext({ campaign, invitation });
    setIsDeliverableModalOpen(true);
  };

  const handleCreateDeliverableSubmit = async (payload) => {
    await createDeliverable(payload);
    await refreshData();
  };

  const handleReviewDeliverableSubmit = async (deliverableId, { action, feedback }) => {
    await reviewDeliverable(deliverableId, { action, feedback }, currentUser);
    await refreshData();
  };

  // ── Count badges ───────────────────────────
  const realCampaigns = campaigns.filter((c) => !c._isDemo);
  const pendingInvitesCount = invitations.filter((i) => i.status === "pending" && !i._isDemo).length;
  const awaitingReviewCount = deliverables.filter(
    (d) => (d.status === "submitted" || d.status === "resubmitted") && !d._isDemo
  ).length;
  const activeCampaignsCount = realCampaigns.filter((c) => c.status === "active").length;

  const counts = {
    campaigns: activeCampaignsCount,
    invitations: pendingInvitesCount,
    deliverables: awaitingReviewCount,
  };

  const selectedCampaign = selectedCampaignId
    ? campaigns.find((c) => c.id === selectedCampaignId)
    : null;

  return (
    <div style={styles.container}>
      {/* 7-Section Navigation Header */}
      <MarketingNav
        activeSection={activeSection}
        onSelectSection={(sec) => {
          setSelectedCampaignId(null);
          setActiveSection(sec);
        }}
        counts={counts}
        theme={theme}
      />

      {/* Demo Data Banner */}
      {hasDemoToggle && (
        <div style={styles.demoBanner}>
          <div style={styles.demoBannerLeft}>
            <span style={styles.demoBannerIcon}>💡</span>
            <div>
              <span style={styles.demoBannerTitle}>No campaigns yet</span>
              <span style={styles.demoBannerDesc}>
                {" "}Create your first real campaign, or preview the platform with demo data.
              </span>
            </div>
          </div>
          <div style={styles.demoBannerActions}>
            <button
              onClick={() => setShowDemoData((prev) => !prev)}
              style={{
                ...styles.demoBannerToggle,
                backgroundColor: showDemoData ? "#f1f5f9" : "transparent",
                border: showDemoData ? "1px solid #94a3b8" : "1px solid #cbd5e1",
              }}
            >
              {showDemoData ? "🙈 Hide Demo" : "👁 Preview Demo Data"}
            </button>
            <button
              onClick={handleOpenCreateCampaign}
              style={styles.demoBannerCreate}
            >
              + Create Campaign
            </button>
          </div>
        </div>
      )}

      {/* Demo mode indicator when active */}
      {showDemoData && (
        <div style={styles.demoModeBar}>
          <span style={styles.demoModeDot} />
          <span>Demo preview mode is active — these campaigns are example data and not stored in your workspace</span>
        </div>
      )}

      {/* Main View Area */}
      {selectedCampaignId ? (
        <CampaignDetailsView
          campaign={selectedCampaign}
          invitations={invitations}
          deliverables={deliverables}
          onBack={() => setSelectedCampaignId(null)}
          onOpenEditModal={handleOpenEditCampaign}
          onStatusChange={handleStatusChange}
          onOpenInviteModal={() => {
            setActiveSection("discovery");
            setSelectedCampaignId(null);
          }}
          onOpenDeliverableModal={handleOpenDeliverableModal}
          onReviewDeliverable={() => {
            setActiveSection("deliverables");
            setSelectedCampaignId(null);
          }}
          theme={theme}
        />
      ) : (
        <>
          {activeSection === "overview" && (
            <MarketingOverview
              campaigns={campaigns}
              invitations={invitations}
              deliverables={deliverables}
              loading={loading}
              error={error}
              dataSource={dataSource}
              hasDemoData={showDemoData}
              onNavigate={setActiveSection}
              onOpenCreateModal={handleOpenCreateCampaign}
              onSelectCampaign={(id) => setSelectedCampaignId(id)}
              theme={theme}
            />
          )}

          {activeSection === "campaigns" && (
            <CampaignsList
              campaigns={campaigns}
              invitations={invitations}
              deliverables={deliverables}
              onOpenCreateModal={handleOpenCreateCampaign}
              onOpenEditModal={handleOpenEditCampaign}
              onSelectCampaign={(id) => setSelectedCampaignId(id)}
              onStatusChange={handleStatusChange}
              theme={theme}
            />
          )}

          {activeSection === "discovery" && (
            <CreatorDiscovery
              campaigns={campaigns.filter((c) => !c._isDemo)}
              invitations={invitations}
              onSendInvitation={handleSendInvitation}
              preselectedCampaign={selectedCampaign}
              theme={theme}
            />
          )}

          {activeSection === "invitations" && (
            <InvitationsManager
              invitations={invitations}
              onSelectCampaign={(id) => setSelectedCampaignId(id)}
              theme={theme}
            />
          )}

          {activeSection === "deliverables" && (
            <DeliverablesManager
              deliverables={deliverables}
              onReviewDeliverable={handleReviewDeliverableSubmit}
              onSelectCampaign={(id) => setSelectedCampaignId(id)}
              theme={theme}
            />
          )}

          {activeSection === "agencies" && (
            <MarketingAgencies
              user={user}
              userProfile={userProfile}
              theme={theme}
              campaigns={campaigns}
              onRefresh={refreshData}
            />
          )}

          {activeSection === "analytics" && (
            <MarketingAnalytics
              campaigns={campaigns}
              invitations={invitations}
              deliverables={deliverables}
              theme={theme}
            />
          )}

          {activeSection === "reports" && (
            <MarketingReports
              campaigns={campaigns}
              invitations={invitations}
              deliverables={deliverables}
              theme={theme}
            />
          )}
        </>
      )}

      {/* Campaign Create & Edit Modal */}
      <CampaignFormModal
        isOpen={isCampaignModalOpen}
        onClose={() => {
          setIsCampaignModalOpen(false);
          setCampaignToEdit(null);
        }}
        onSubmit={handleCampaignSubmit}
        campaignToEdit={campaignToEdit}
        theme={theme}
      />

      {/* Deliverable Assignment Modal */}
      {isDeliverableModalOpen &&
        deliverableModalContext.campaign &&
        deliverableModalContext.invitation && (
          <DeliverableFormModal
            isOpen={isDeliverableModalOpen}
            onClose={() => setIsDeliverableModalOpen(false)}
            onSubmit={handleCreateDeliverableSubmit}
            campaign={deliverableModalContext.campaign}
            invitation={deliverableModalContext.invitation}
            theme={theme}
          />
        )}
    </div>
  );
}

const styles = {
  container: {
    display: "flex",
    flexDirection: "column",
    gap: "0px",
  },
  demoBanner: {
    display: "flex",
    alignItems: "center",
    justifyContent: "space-between",
    flexWrap: "wrap",
    gap: "12px",
    padding: "14px 18px",
    backgroundColor: "#fffbeb",
    border: "1px solid #fde68a",
    borderRadius: "12px",
    margin: "16px 0 0 0",
  },
  demoBannerLeft: {
    display: "flex",
    alignItems: "center",
    gap: "10px",
  },
  demoBannerIcon: {
    fontSize: "18px",
  },
  demoBannerTitle: {
    fontSize: "13.5px",
    fontWeight: "700",
    color: "#92400e",
  },
  demoBannerDesc: {
    fontSize: "12.5px",
    color: "#78350f",
  },
  demoBannerActions: {
    display: "flex",
    alignItems: "center",
    gap: "10px",
  },
  demoBannerToggle: {
    padding: "6px 12px",
    borderRadius: "8px",
    fontSize: "12px",
    fontWeight: "600",
    cursor: "pointer",
    color: "#475569",
  },
  demoBannerCreate: {
    padding: "7px 14px",
    borderRadius: "8px",
    border: "none",
    backgroundColor: "#0284c7",
    color: "#ffffff",
    fontSize: "12.5px",
    fontWeight: "700",
    cursor: "pointer",
  },
  demoModeBar: {
    display: "flex",
    alignItems: "center",
    gap: "8px",
    padding: "8px 14px",
    backgroundColor: "#fef9c3",
    border: "1px solid #fde047",
    borderRadius: "8px",
    fontSize: "12px",
    color: "#713f12",
    fontWeight: "500",
    marginTop: "8px",
  },
  demoModeDot: {
    width: "8px",
    height: "8px",
    borderRadius: "50%",
    backgroundColor: "#f59e0b",
    display: "inline-block",
    flexShrink: 0,
  },
};
