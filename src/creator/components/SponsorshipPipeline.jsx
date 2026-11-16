import React from "react";
import { Briefcase, DollarSign, Calendar, CheckCircle2, Clock } from "lucide-react";

export default function SponsorshipPipeline({ invitations = [] }) {
  const acceptedInvs = (invitations || []).filter((i) => i.status === "accepted");
  const totalPipeline = acceptedInvs.reduce(
    (acc, curr) => acc + (Number(curr.compensation) || 0),
    0
  );

  return (
    <div style={styles.card}>
      <div style={styles.cardHeader}>
        <div>
          <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
            <h3 style={styles.title}>Brand Deals & Sponsorship Pipeline</h3>
            <span style={styles.dealPill}>
              {acceptedInvs.length} Active {acceptedInvs.length === 1 ? "Contract" : "Contracts"}
            </span>
          </div>
          <p style={styles.subtitle}>Track contracted deliverables, invoice milestones, and payouts</p>
        </div>

        <div style={styles.pipelineSummary}>
          <div style={styles.sumBox}>
            <span style={styles.sumLabel}>Contracted Pipeline Value</span>
            <span style={styles.sumVal}>${totalPipeline.toLocaleString()}</span>
          </div>
        </div>
      </div>

      {acceptedInvs.length > 0 ? (
        <div style={styles.dealsGrid}>
          {acceptedInvs.map((deal) => (
            <div key={deal.id} style={styles.dealCard}>
              <div style={styles.dealTop}>
                <div style={styles.brandInfo}>
                  <span style={styles.brandIcon}>
                    {(deal.marketingName || deal.campaignTitle || "B").charAt(0).toUpperCase()}
                  </span>
                  <div>
                    <span style={styles.brandName}>{deal.marketingName || "Brand Marketer"}</span>
                    <span style={styles.brandCat}>{deal.campaignTitle || "Brand Campaign"}</span>
                  </div>
                </div>
                <span style={styles.dealValue}>
                  ${Number(deal.compensation || 0).toLocaleString()}
                </span>
              </div>

              <p style={styles.deliverableText}>
                {deal.deliverables || deal.message || "Dedicated brand integration & content deliverables"}
              </p>

              <div style={styles.dealFooter}>
                <span style={styles.stageBadge}>
                  Active Contract
                </span>

                <div style={styles.metaRight}>
                  <span style={styles.deadline}>
                    <Calendar size={12} style={{ marginRight: 4 }} />
                    {deal.dueDate || "Standard Timeline"}
                  </span>
                  <span style={styles.paymentStatus}>Verified</span>
                </div>
              </div>
            </div>
          ))}
        </div>
      ) : (
        <div style={styles.emptyState}>
          <Briefcase size={28} color="#94a3b8" />
          <h4 style={styles.emptyTitle}>No Active Sponsorship Contracts</h4>
          <p style={styles.emptyText}>
            When brand marketing teams invite you to campaigns and you accept their terms, contracted deals and compensation milestones will stream here automatically.
          </p>
        </div>
      )}
    </div>
  );
}

const styles = {
  card: {
    backgroundColor: "#ffffff",
    borderRadius: "14px",
    border: "1px solid #e2e8f0",
    padding: "24px",
    boxShadow: "0 2px 10px rgba(15, 23, 42, 0.04)",
    marginBottom: "24px",
  },
  cardHeader: {
    display: "flex",
    justifyContent: "space-between",
    alignItems: "flex-start",
    flexWrap: "wrap",
    gap: "14px",
    marginBottom: "18px",
  },
  title: {
    fontSize: "16px",
    fontWeight: "700",
    color: "#0f172a",
    margin: 0,
  },
  subtitle: {
    fontSize: "12.5px",
    color: "#64748b",
    marginTop: "4px",
    marginBottom: 0,
  },
  dealPill: {
    fontSize: "11px",
    fontWeight: "700",
    color: "#15803d",
    backgroundColor: "#f0fdf4",
    border: "1px solid #bbf7d0",
    padding: "2px 8px",
    borderRadius: "6px",
  },
  pipelineSummary: {
    display: "flex",
    gap: "16px",
  },
  sumBox: {
    display: "flex",
    flexDirection: "column",
    alignItems: "flex-end",
  },
  sumLabel: {
    fontSize: "11px",
    color: "#64748b",
    fontWeight: "600",
  },
  sumVal: {
    fontSize: "18px",
    fontWeight: "800",
    color: "#0f172a",
    marginTop: "2px",
  },
  dealsGrid: {
    display: "grid",
    gridTemplateColumns: "repeat(auto-fill, minmax(280px, 1fr))",
    gap: "16px",
  },
  dealCard: {
    backgroundColor: "#f8fafc",
    border: "1px solid #e2e8f0",
    borderRadius: "12px",
    padding: "16px",
    display: "flex",
    flexDirection: "column",
    justifyContent: "space-between",
  },
  dealTop: {
    display: "flex",
    justifyContent: "space-between",
    alignItems: "flex-start",
    marginBottom: "10px",
  },
  brandInfo: {
    display: "flex",
    alignItems: "center",
    gap: "10px",
  },
  brandIcon: {
    width: "32px",
    height: "32px",
    borderRadius: "8px",
    backgroundColor: "#eff6ff",
    color: "#2563eb",
    fontSize: "13px",
    fontWeight: "800",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
  },
  brandName: {
    fontSize: "13px",
    fontWeight: "700",
    color: "#0f172a",
    display: "block",
  },
  brandCat: {
    fontSize: "11px",
    color: "#64748b",
    display: "block",
  },
  dealValue: {
    fontSize: "15px",
    fontWeight: "800",
    color: "#15803d",
  },
  deliverableText: {
    fontSize: "12.5px",
    color: "#334155",
    lineHeight: "1.4",
    margin: "0 0 14px 0",
    flex: 1,
  },
  dealFooter: {
    display: "flex",
    justifyContent: "space-between",
    alignItems: "center",
    borderTop: "1px solid #f1f5f9",
    paddingTop: "10px",
  },
  stageBadge: {
    fontSize: "10.5px",
    fontWeight: "700",
    padding: "2px 8px",
    borderRadius: "6px",
    backgroundColor: "#f0fdf4",
    color: "#15803d",
  },
  metaRight: {
    display: "flex",
    alignItems: "center",
    gap: "10px",
    fontSize: "11px",
    color: "#64748b",
  },
  deadline: {
    display: "flex",
    alignItems: "center",
  },
  paymentStatus: {
    fontWeight: "600",
    color: "#0f172a",
  },
  emptyState: {
    display: "flex",
    flexDirection: "column",
    alignItems: "center",
    justifyContent: "center",
    padding: "36px 20px",
    textAlign: "center",
    backgroundColor: "#f8fafc",
    borderRadius: "10px",
    border: "1px dashed #cbd5e1",
  },
  emptyTitle: {
    fontSize: "14px",
    fontWeight: "700",
    color: "#0f172a",
    margin: "10px 0 4px 0",
  },
  emptyText: {
    fontSize: "12.5px",
    color: "#64748b",
    maxWidth: "420px",
    lineHeight: "1.4",
    margin: 0,
  },
};
