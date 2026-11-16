import React from "react";
import {
  Building2,
  Layers,
  ShieldAlert,
  BarChart3,
  Clock,
  ArrowRight,
  ShieldCheck,
  CheckCircle2,
} from "lucide-react";

const SECTION_CONFIG = {
  agency_brand: {
    title: "Agency & Brand Management",
    subtitle: "Enterprise oversight of brand delegations, agency contracts, and commission splits.",
    badge: "Phase 2 Roadmap",
    icon: Building2,
    accent: "#0d9488",
    accentLight: "#f0fdfa",
    phase: "Phase 2",
    details: [
      "Platform-wide audit of all brand-to-agency campaign assignments",
      "Commission split compliance and dispute resolution queues",
      "Talent agency verification and accreditation controls",
    ],
  },
  campaigns: {
    title: "Campaign Oversight & Compliance",
    subtitle: "Cross-suite monitoring of active influencer campaigns, budget caps, and deliverable fulfillment.",
    badge: "Phase 2 Roadmap",
    icon: Layers,
    accent: "#0284c7",
    accentLight: "#f0f9ff",
    phase: "Phase 2",
    details: [
      "Global campaign review and automated budget overspend triggers",
      "Platform terms compliance scans for campaign briefs",
      "Cross-brand influencer attribution and campaign status overrides",
    ],
  },
  reports_moderation: {
    title: "Reports & Content Moderation",
    subtitle: "User reports, impersonation alerts, and content violation moderation queues.",
    badge: "Schema Pending",
    icon: ShieldAlert,
    accent: "#b45309",
    accentLight: "#fffbeb",
    phase: "Future Phase",
    isHonestSchemaMissing: true,
    details: [
      "Honest Inspection: No 'reports' or 'moderation_reports' collection currently exists in Firestore database.",
      "Requires schema design for report tickets, reporter identity, and evidence attachments.",
      "Full review queue with triage statuses will be deployed in a future security update.",
    ],
  },
  analytics: {
    title: "Platform-Wide Analytics & Infrastructure",
    subtitle: "System throughput, API latency, database query costs, and aggregate user engagement.",
    badge: "Phase 2 Roadmap",
    icon: BarChart3,
    accent: "#7c3aed",
    accentLight: "#f5f3ff",
    phase: "Phase 2",
    details: [
      "Multi-channel aggregate audience reach metrics across all registered creators",
      "Real-time Firestore query latency monitoring and error telemetry",
      "Platform revenue and contract gross volume trends",
    ],
  },
};

export default function AdminPlaceholderView({ sectionId = "agency_brand", onNavigate }) {
  const cfg = SECTION_CONFIG[sectionId] || SECTION_CONFIG.agency_brand;
  const Icon = cfg.icon;

  return (
    <div style={styles.container}>
      <div style={styles.card}>
        <div style={{ ...styles.iconWrap, backgroundColor: cfg.accentLight }}>
          <Icon size={32} color={cfg.accent} />
        </div>

        <div style={styles.badgeRow}>
          <span
            style={{
              ...styles.phaseBadge,
              backgroundColor: cfg.accentLight,
              color: cfg.accent,
            }}
          >
            {cfg.badge}
          </span>
          <span style={styles.phaseIndicator}>
            Current Focus: Phase 1 (Overview & User Management)
          </span>
        </div>

        <h1 style={styles.title}>{cfg.title}</h1>
        <p style={styles.subtitle}>{cfg.subtitle}</p>

        {cfg.isHonestSchemaMissing && (
          <div style={styles.schemaAlertBox}>
            <p style={{ margin: 0, fontSize: "13px", color: "#92400e", lineHeight: "1.5" }}>
              <strong>Database Status:</strong> This section is withheld from Phase 1 because no reporting collection exists in Firestore. Rather than injecting dummy reports or mock complaints, this module is transparently marked pending backend schema implementation.
            </p>
          </div>
        )}

        <div style={styles.scopeBox}>
          <h3 style={styles.scopeTitle}>Planned Capabilities in {cfg.phase}:</h3>
          <ul style={styles.scopeList}>
            {cfg.details.map((d, i) => (
              <li key={i} style={styles.scopeItem}>
                <CheckCircle2 size={15} color={cfg.accent} style={{ flexShrink: 0, marginTop: 2 }} />
                <span>{d}</span>
              </li>
            ))}
          </ul>
        </div>

        <div style={styles.actionsRow}>
          <button onClick={() => onNavigate("overview")} style={styles.secondaryBtn}>
            Return to Admin Overview
          </button>
          <button
            onClick={() => onNavigate("users")}
            style={{ ...styles.primaryBtn, backgroundColor: cfg.accent }}
          >
            <span>Open User Management</span>
            <ArrowRight size={14} />
          </button>
        </div>
      </div>
    </div>
  );
}

const styles = {
  container: {
    padding: "20px 0",
  },
  card: {
    backgroundColor: "#ffffff",
    borderRadius: "16px",
    padding: "40px 32px",
    border: "1px solid #e2e8f0",
    maxWidth: "760px",
    margin: "0 auto",
    display: "flex",
    flexDirection: "column",
    alignItems: "center",
    textAlign: "center",
    boxShadow: "0 1px 3px rgba(15, 23, 42, 0.03)",
  },
  iconWrap: {
    width: "64px",
    height: "64px",
    borderRadius: "16px",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    marginBottom: "16px",
  },
  badgeRow: {
    display: "flex",
    alignItems: "center",
    gap: "10px",
    marginBottom: "10px",
  },
  phaseBadge: {
    fontSize: "11px",
    fontWeight: "700",
    padding: "3px 10px",
    borderRadius: "12px",
    letterSpacing: "0.5px",
  },
  phaseIndicator: {
    fontSize: "12px",
    color: "#64748b",
  },
  title: {
    margin: "0 0 8px 0",
    fontSize: "22px",
    fontWeight: "800",
    color: "#0f172a",
  },
  subtitle: {
    margin: "0 0 24px 0",
    fontSize: "14px",
    color: "#64748b",
    maxWidth: "540px",
    lineHeight: "1.5",
  },
  schemaAlertBox: {
    backgroundColor: "#fffbeb",
    border: "1px solid #fde68a",
    borderRadius: "10px",
    padding: "14px 18px",
    marginBottom: "24px",
    textAlign: "left",
    width: "100%",
  },
  scopeBox: {
    backgroundColor: "#f8fafc",
    border: "1px solid #e2e8f0",
    borderRadius: "12px",
    padding: "20px 24px",
    width: "100%",
    textAlign: "left",
    marginBottom: "28px",
  },
  scopeTitle: {
    margin: "0 0 12px 0",
    fontSize: "13.5px",
    fontWeight: "700",
    color: "#0f172a",
  },
  scopeList: {
    margin: 0,
    padding: 0,
    listStyle: "none",
    display: "flex",
    flexDirection: "column",
    gap: "10px",
  },
  scopeItem: {
    display: "flex",
    alignItems: "flex-start",
    gap: "10px",
    fontSize: "13px",
    color: "#334155",
    lineHeight: "1.45",
  },
  actionsRow: {
    display: "flex",
    alignItems: "center",
    gap: "12px",
    flexWrap: "wrap",
    justifyContent: "center",
  },
  secondaryBtn: {
    padding: "10px 18px",
    borderRadius: "8px",
    border: "1px solid #cbd5e1",
    backgroundColor: "#ffffff",
    color: "#334155",
    fontSize: "13px",
    fontWeight: "600",
    cursor: "pointer",
  },
  primaryBtn: {
    display: "flex",
    alignItems: "center",
    gap: "6px",
    padding: "10px 20px",
    borderRadius: "8px",
    border: "none",
    color: "#ffffff",
    fontSize: "13px",
    fontWeight: "700",
    cursor: "pointer",
  },
};
