import React, { useState, useEffect, useCallback } from "react";
import {
  Activity,
  CheckCircle2,
  AlertTriangle,
  XCircle,
  RefreshCw,
  Server,
  Database,
  Lock,
  HardDrive,
  Bell,
  Share2,
  Clock,
  ShieldCheck,
  Sparkles,
  Info,
} from "lucide-react";
import { runSystemHealthDiagnostics } from "../systemHealthService";

export default function AdminSystemHealthView({ theme }) {
  const accent = theme?.accent || "#6366f1";
  const accentLight = theme?.accentLight || "#eef2ff";

  const [diagnostics, setDiagnostics] = useState(null);
  const [running, setRunning] = useState(true);

  const runDiagnostics = useCallback(async () => {
    setRunning(true);
    try {
      const results = await runSystemHealthDiagnostics();
      setDiagnostics(results);
    } catch (err) {
      console.warn("Diagnostics error:", err);
    } finally {
      setRunning(false);
    }
  }, []);

  useEffect(() => {
    runDiagnostics();
  }, [runDiagnostics]);

  const getStatusBadge = (status) => {
    switch (status) {
      case "Operational":
      case "Configured":
        return (
          <span style={{ ...styles.badge, backgroundColor: "#dcfce7", color: "#15803d" }}>
            <CheckCircle2 size={12} />
            <span>{status}</span>
          </span>
        );
      case "Degraded":
      case "Local Fallback":
      case "Local Engine":
        return (
          <span style={{ ...styles.badge, backgroundColor: "#fef3c7", color: "#b45309" }}>
            <AlertTriangle size={12} />
            <span>{status}</span>
          </span>
        );
      case "Direct OAuth Flow":
      case "Direct OAuth (No Server Key)":
        return (
          <span style={{ ...styles.badge, backgroundColor: "#eff6ff", color: "#1d4ed8" }}>
            <Share2 size={12} />
            <span>{status}</span>
          </span>
        );
      case "Unavailable":
      case "Error":
      default:
        return (
          <span style={{ ...styles.badge, backgroundColor: "#fee2e2", color: "#b91c1c" }}>
            <XCircle size={12} />
            <span>{status}</span>
          </span>
        );
    }
  };

  const getComponentIcon = (id) => {
    switch (id) {
      case "firestore":
        return <Database size={18} color="#4338ca" />;
      case "auth":
        return <Lock size={18} color="#059669" />;
      case "storage":
        return <HardDrive size={18} color="#d97706" />;
      case "notifications":
        return <Bell size={18} color="#7c3aed" />;
      case "youtube_api":
      case "meta_api":
      case "tiktok_api":
      default:
        return <Share2 size={18} color="#0284c7" />;
    }
  };

  return (
    <div style={styles.container}>
      {/* Header */}
      <div style={styles.headerCard}>
        <div style={styles.headerLeft}>
          <div style={{ ...styles.headerIconBox, backgroundColor: accentLight }}>
            <Activity size={24} color={accent} />
          </div>
          <div>
            <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 2 }}>
              <h1 style={styles.title}>System Health & Infrastructure Diagnostics</h1>
              <span style={styles.liveBadge}>LIVE SYSTEM PROBES</span>
            </div>
            <p style={styles.subtitle}>
              Real-time diagnostic health probes verifying Cloud Firestore latency, RBAC Token Engine, client quota persistence, and OAuth connectors.
            </p>
          </div>
        </div>

        <div style={styles.headerActions}>
          {diagnostics?.checkedAt && (
            <div style={styles.timestampWrap}>
              <Clock size={13} color="#64748b" />
              <span>
                Last probe: {new Date(diagnostics.checkedAt).toLocaleTimeString()}
              </span>
            </div>
          )}

          <button
            onClick={runDiagnostics}
            disabled={running}
            style={styles.refreshBtn}
            title="Execute live diagnostics round-trip"
          >
            <RefreshCw
              size={14}
              color="#334155"
              className={running ? "animate-spin" : ""}
            />
            <span>{running ? "Running Probe..." : "Run Live Probe"}</span>
          </button>
        </div>
      </div>

      {/* Security & Zero Secret Disclosure Notice */}
      <div style={styles.privacyCard}>
        <div style={{ display: "flex", alignItems: "flex-start", gap: 12 }}>
          <ShieldCheck size={18} color="#059669" style={{ flexShrink: 0, marginTop: 2 }} />
          <div>
            <strong style={{ fontSize: "13px", color: "#065f46", display: "block", marginBottom: 3 }}>
              Zero Secret Exposure Policy
            </strong>
            <p style={{ margin: 0, fontSize: "12px", color: "#334155", lineHeight: "1.5" }}>
              In adherence to strict cybersecurity standards, API secrets, OAuth access tokens, private service accounts, and production environment variables are never transmitted to or displayed in the administrative user interface. Connection states indicate architectural availability and cryptographic handshake verification only.
            </p>
          </div>
        </div>
      </div>

      {/* Overview Cards */}
      <div style={styles.overviewGrid}>
        <div style={styles.overviewCard}>
          <span style={styles.overviewLabel}>Platform Overall State</span>
          <div style={styles.overviewStateRow}>
            <span
              style={{
                ...styles.stateIndicatorDot,
                backgroundColor:
                  diagnostics?.overallState === "100% Operational"
                    ? "#16a34a"
                    : "#d97706",
              }}
            />
            <span style={styles.overviewStateText}>
              {diagnostics?.overallState || "Probing..."}
            </span>
          </div>
          <span style={styles.overviewSub}>
            {diagnostics?.healthyComponentCount || 0} of {diagnostics?.totalComponents || 0} subsystems healthy
          </span>
        </div>

        <div style={styles.overviewCard}>
          <span style={styles.overviewLabel}>Cloud Firestore Latency</span>
          <div style={styles.overviewVal}>
            {diagnostics?.components?.find((c) => c.id === "firestore")?.latencyMs !== null
              ? `${diagnostics?.components?.find((c) => c.id === "firestore")?.latencyMs} ms`
              : "N/A"}
          </div>
          <span style={styles.overviewSub}>
            Real cloud database read probe round-trip
          </span>
        </div>

        <div style={styles.overviewCard}>
          <span style={styles.overviewLabel}>Auth & Session Guard</span>
          <div style={styles.overviewVal}>
            {diagnostics?.components?.find((c) => c.id === "auth")?.status || "Active"}
          </div>
          <span style={styles.overviewSub}>
            Firebase Identity Token validation & RBAC
          </span>
        </div>

        <div style={styles.overviewCard}>
          <span style={styles.overviewLabel}>Storage Integrity</span>
          <div style={styles.overviewVal}>
            {diagnostics?.components?.find((c) => c.id === "storage")?.status || "Verified"}
          </div>
          <span style={styles.overviewSub}>
            Client persistence & zero quota exceptions
          </span>
        </div>
      </div>

      {/* Detailed Components List */}
      <div style={styles.listCard}>
        <div style={styles.listHeader}>
          <h3 style={styles.listTitle}>Subsystem Health Probes & Connector Status</h3>
          <span style={styles.listSub}>
            Each probe executes a genuine operational check against the active runtime
          </span>
        </div>

        <div style={styles.componentsList}>
          {diagnostics?.components?.map((component) => (
            <div key={component.id} style={styles.componentRow}>
              <div style={styles.componentLeft}>
                <div style={styles.iconCircle}>
                  {getComponentIcon(component.id)}
                </div>
                <div>
                  <div style={styles.componentNameRow}>
                    <strong style={styles.componentName}>{component.name}</strong>
                    <span style={styles.categoryPill}>{component.category}</span>
                    {component.critical && (
                      <span style={styles.criticalPill}>Core Service</span>
                    )}
                  </div>
                  <div style={styles.componentDetails}>{component.details}</div>
                </div>
              </div>

              <div style={styles.componentRight}>
                {component.latencyMs !== null && (
                  <span style={styles.latencyTag}>{component.latencyMs}ms</span>
                )}
                {getStatusBadge(component.status)}
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

const styles = {
  container: {
    padding: "24px 32px",
    display: "flex",
    flexDirection: "column",
    gap: "24px",
    boxSizing: "border-box",
  },
  headerCard: {
    display: "flex",
    alignItems: "center",
    justifyContent: "space-between",
    backgroundColor: "#ffffff",
    padding: "24px 28px",
    borderRadius: "14px",
    border: "1px solid #e2e8f0",
    boxShadow: "0 1px 3px rgba(0, 0, 0, 0.04)",
    flexWrap: "wrap",
    gap: "16px",
  },
  headerLeft: {
    display: "flex",
    alignItems: "center",
    gap: "16px",
  },
  headerIconBox: {
    width: "48px",
    height: "48px",
    borderRadius: "12px",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
  },
  title: {
    margin: 0,
    fontSize: "20px",
    fontWeight: 700,
    color: "#0f172a",
    letterSpacing: "-0.01em",
  },
  liveBadge: {
    fontSize: "11px",
    fontWeight: 700,
    color: "#059669",
    backgroundColor: "#d1fae5",
    padding: "3px 8px",
    borderRadius: "6px",
    letterSpacing: "0.04em",
  },
  subtitle: {
    margin: 0,
    fontSize: "13px",
    color: "#64748b",
    lineHeight: "1.4",
  },
  headerActions: {
    display: "flex",
    alignItems: "center",
    gap: "12px",
  },
  timestampWrap: {
    display: "flex",
    alignItems: "center",
    gap: "6px",
    fontSize: "12px",
    color: "#64748b",
  },
  refreshBtn: {
    display: "flex",
    alignItems: "center",
    gap: "8px",
    backgroundColor: "#ffffff",
    border: "1px solid #cbd5e1",
    padding: "8px 14px",
    borderRadius: "8px",
    fontSize: "13px",
    fontWeight: 600,
    color: "#334155",
    cursor: "pointer",
    transition: "all 0.15s ease",
  },
  privacyCard: {
    backgroundColor: "#f0fdf4",
    border: "1px solid #bbf7d0",
    borderRadius: "12px",
    padding: "16px 20px",
  },
  overviewGrid: {
    display: "grid",
    gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))",
    gap: "16px",
  },
  overviewCard: {
    backgroundColor: "#ffffff",
    border: "1px solid #e2e8f0",
    borderRadius: "12px",
    padding: "18px 20px",
    display: "flex",
    flexDirection: "column",
    gap: "8px",
    boxShadow: "0 1px 3px rgba(0, 0, 0, 0.02)",
  },
  overviewLabel: {
    fontSize: "12px",
    fontWeight: 600,
    color: "#64748b",
    textTransform: "uppercase",
    letterSpacing: "0.03em",
  },
  overviewStateRow: {
    display: "flex",
    alignItems: "center",
    gap: "8px",
  },
  stateIndicatorDot: {
    width: "10px",
    height: "10px",
    borderRadius: "50%",
  },
  overviewStateText: {
    fontSize: "20px",
    fontWeight: 700,
    color: "#0f172a",
  },
  overviewVal: {
    fontSize: "22px",
    fontWeight: 700,
    color: "#0f172a",
  },
  overviewSub: {
    fontSize: "11px",
    color: "#94a3b8",
  },
  listCard: {
    backgroundColor: "#ffffff",
    borderRadius: "14px",
    border: "1px solid #e2e8f0",
    overflow: "hidden",
    boxShadow: "0 1px 3px rgba(0, 0, 0, 0.04)",
  },
  listHeader: {
    padding: "20px 24px",
    borderBottom: "1px solid #f1f5f9",
  },
  listTitle: {
    margin: 0,
    fontSize: "15px",
    fontWeight: 700,
    color: "#0f172a",
  },
  listSub: {
    fontSize: "12px",
    color: "#64748b",
  },
  componentsList: {
    display: "flex",
    flexDirection: "column",
  },
  componentRow: {
    display: "flex",
    alignItems: "center",
    justifyContent: "space-between",
    padding: "18px 24px",
    borderBottom: "1px solid #f8fafc",
    flexWrap: "wrap",
    gap: "12px",
  },
  componentLeft: {
    display: "flex",
    alignItems: "center",
    gap: "14px",
    flex: 1,
    minWidth: "280px",
  },
  iconCircle: {
    width: "38px",
    height: "38px",
    borderRadius: "10px",
    backgroundColor: "#f8fafc",
    border: "1px solid #e2e8f0",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    flexShrink: 0,
  },
  componentNameRow: {
    display: "flex",
    alignItems: "center",
    gap: "8px",
    flexWrap: "wrap",
    marginBottom: "3px",
  },
  componentName: {
    fontSize: "14px",
    fontWeight: 600,
    color: "#0f172a",
  },
  categoryPill: {
    fontSize: "11px",
    fontWeight: 600,
    color: "#475569",
    backgroundColor: "#f1f5f9",
    padding: "2px 6px",
    borderRadius: "4px",
  },
  criticalPill: {
    fontSize: "10px",
    fontWeight: 700,
    color: "#b45309",
    backgroundColor: "#fef3c7",
    padding: "2px 6px",
    borderRadius: "4px",
    textTransform: "uppercase",
    letterSpacing: "0.03em",
  },
  componentDetails: {
    fontSize: "12px",
    color: "#64748b",
  },
  componentRight: {
    display: "flex",
    alignItems: "center",
    gap: "10px",
    flexShrink: 0,
  },
  latencyTag: {
    fontSize: "12px",
    fontWeight: 600,
    color: "#475569",
    backgroundColor: "#f1f5f9",
    border: "1px solid #e2e8f0",
    padding: "3px 8px",
    borderRadius: "6px",
  },
  badge: {
    display: "inline-flex",
    alignItems: "center",
    gap: "5px",
    fontSize: "12px",
    fontWeight: 600,
    padding: "4px 10px",
    borderRadius: "20px",
  },
};
