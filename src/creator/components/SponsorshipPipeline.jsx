import React from "react";
import { Briefcase, DollarSign, Calendar, CheckCircle2, Clock, ArrowUpRight } from "lucide-react";
import { SPONSORSHIP_DEALS } from "../mockData";

export default function SponsorshipPipeline() {
  const totalPipeline = SPONSORSHIP_DEALS.reduce((acc, curr) => {
    const num = parseInt(curr.value.replace(/[^0-9]/g, ""), 10);
    return acc + (isNaN(num) ? 0 : num);
  }, 0);

  return (
    <div style={styles.card}>
      <div style={styles.cardHeader}>
        <div>
          <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
            <h3 style={styles.title}>Brand Deals & Sponsorship Pipeline</h3>
            <span style={styles.dealPill}>4 Live Contracts</span>
          </div>
          <p style={styles.subtitle}>Track contracted deliverables, invoice milestones, and payouts</p>
        </div>

        <div style={styles.pipelineSummary}>
          <div style={styles.sumBox}>
            <span style={styles.sumLabel}>Pipeline Value</span>
            <span style={styles.sumVal}>${totalPipeline.toLocaleString()}</span>
          </div>
          <div style={styles.sumBox}>
            <span style={styles.sumLabel}>Paid to Date</span>
            <span style={{ ...styles.sumVal, color: "#15803d" }}>$11,200</span>
          </div>
        </div>
      </div>

      <div style={styles.dealsGrid}>
        {SPONSORSHIP_DEALS.map((deal) => (
          <div key={deal.id} style={styles.dealCard}>
            <div style={styles.dealTop}>
              <div style={styles.brandInfo}>
                <span style={styles.brandIcon}>{deal.logoText}</span>
                <div>
                  <span style={styles.brandName}>{deal.brand}</span>
                  <span style={styles.brandCat}>{deal.category}</span>
                </div>
              </div>
              <span style={styles.dealValue}>{deal.value}</span>
            </div>

            <p style={styles.deliverableText}>{deal.deliverables}</p>

            <div style={styles.dealFooter}>
              <span
                style={{
                  ...styles.stageBadge,
                  backgroundColor: deal.stageBg,
                  color: deal.stageColor,
                }}
              >
                {deal.stage}
              </span>

              <div style={styles.metaRight}>
                <span style={styles.deadline}>
                  <Calendar size={12} style={{ marginRight: 4 }} />
                  {deal.deadline}
                </span>
                <span style={styles.paymentStatus}>{deal.paymentStatus}</span>
              </div>
            </div>
          </div>
        ))}
      </div>
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
  },
  dealPill: {
    fontSize: "11px",
    fontWeight: "700",
    color: "#15803d",
    backgroundColor: "#dcfce7",
    padding: "2px 8px",
    borderRadius: "6px",
  },
  subtitle: {
    fontSize: "12px",
    color: "#64748b",
    marginTop: "2px",
  },
  pipelineSummary: {
    display: "flex",
    gap: "14px",
  },
  sumBox: {
    backgroundColor: "#f8fafc",
    padding: "6px 12px",
    borderRadius: "8px",
    border: "1px solid #e2e8f0",
    textAlign: "right",
  },
  sumLabel: {
    fontSize: "10px",
    fontWeight: "600",
    color: "#64748b",
    textTransform: "uppercase",
    display: "block",
  },
  sumVal: {
    fontSize: "15px",
    fontWeight: "800",
    color: "#0f172a",
  },
  dealsGrid: {
    display: "grid",
    gridTemplateColumns: "repeat(auto-fit, minmax(280px, 1fr))",
    gap: "14px",
  },
  dealCard: {
    backgroundColor: "#f8fafc",
    padding: "16px",
    borderRadius: "10px",
    border: "1px solid #e2e8f0",
    display: "flex",
    flexDirection: "column",
    justifyContent: "space-between",
    gap: "12px",
    transition: "transform 0.15s ease, box-shadow 0.15s ease",
  },
  dealTop: {
    display: "flex",
    justifyContent: "space-between",
    alignItems: "center",
  },
  brandInfo: {
    display: "flex",
    alignItems: "center",
    gap: "10px",
  },
  brandIcon: {
    fontSize: "20px",
    width: "36px",
    height: "36px",
    backgroundColor: "#ffffff",
    borderRadius: "8px",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    border: "1px solid #e2e8f0",
  },
  brandName: {
    fontSize: "13.5px",
    fontWeight: "700",
    color: "#0f172a",
    display: "block",
  },
  brandCat: {
    fontSize: "11px",
    color: "#64748b",
  },
  dealValue: {
    fontSize: "16px",
    fontWeight: "800",
    color: "#0f172a",
  },
  deliverableText: {
    fontSize: "12.5px",
    color: "#334155",
    lineHeight: "1.4",
  },
  dealFooter: {
    display: "flex",
    justifyContent: "space-between",
    alignItems: "center",
    paddingTop: "10px",
    borderTop: "1px solid #e2e8f0",
  },
  stageBadge: {
    fontSize: "11px",
    fontWeight: "700",
    padding: "3px 8px",
    borderRadius: "6px",
  },
  metaRight: {
    display: "flex",
    flexDirection: "column",
    alignItems: "flex-end",
    gap: "2px",
  },
  deadline: {
    display: "flex",
    alignItems: "center",
    fontSize: "11px",
    color: "#64748b",
  },
  paymentStatus: {
    fontSize: "11px",
    fontWeight: "600",
    color: "#15803d",
  },
};
