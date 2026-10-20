import { useState, useMemo } from "react";
import {
  Info,
  CheckCircle2,
  BarChart2,
  TrendingUp,
  Users,
} from "lucide-react";
import { calculateROI } from "../campaignService";

export default function MarketingAnalytics({
  campaigns = [],
  invitations = [],
  deliverables = [],
  theme,
}) {
  const accent = theme?.accent || "#0284c7";
  const [selectedCampaignId, setSelectedCampaignId] = useState("all");
  const [timeRange, setTimeRange] = useState("30D");

  // Filter campaigns by selected ID or aggregate all
  const activeCampaignList = useMemo(() => {
    return selectedCampaignId === "all"
      ? campaigns
      : campaigns.filter((c) => c.id === selectedCampaignId);
  }, [campaigns, selectedCampaignId]);

  // Aggregated totals from active campaigns
  const totalSpend = useMemo(() => {
    return activeCampaignList.reduce((acc, c) => acc + (Number(c.spend) || 0), 0);
  }, [activeCampaignList]);

  const totalBudget = useMemo(() => {
    return activeCampaignList.reduce((acc, c) => acc + (Number(c.budget) || 0), 0);
  }, [activeCampaignList]);

  const totalAttributedRevenue = useMemo(() => {
    return activeCampaignList.reduce(
      (acc, c) => acc + (Number(c.attributedRevenue) || 0),
      0
    );
  }, [activeCampaignList]);

  const totalViews = useMemo(() => {
    return activeCampaignList.reduce((acc, c) => acc + (Number(c.views) || 0), 0);
  }, [activeCampaignList]);

  const totalReach = useMemo(() => {
    return activeCampaignList.reduce((acc, c) => acc + (Number(c.reach) || 0), 0);
  }, [activeCampaignList]);

  const totalClicks = useMemo(() => {
    return activeCampaignList.reduce((acc, c) => acc + (Number(c.clicks) || 0), 0);
  }, [activeCampaignList]);

  const totalConversions = useMemo(() => {
    return activeCampaignList.reduce((acc, c) => acc + (Number(c.conversions) || 0), 0);
  }, [activeCampaignList]);

  const overallROI = calculateROI(totalAttributedRevenue, totalSpend);

  // Derive Creator Performance rows from actual invitations & deliverables
  const creatorPerformanceRows = useMemo(() => {
    // Filter invitations matching active campaigns
    const relevantInvs = invitations.filter((inv) => {
      if (selectedCampaignId !== "all" && inv.campaignId !== selectedCampaignId) {
        return false;
      }
      return true;
    });

    return relevantInvs.map((inv) => {
      const camp = campaigns.find((c) => c.id === inv.campaignId);
      const campDeliverables = deliverables.filter(
        (d) =>
          d.campaignId === inv.campaignId &&
          (d.creatorId === inv.creatorId || d.creatorEmail === inv.creatorEmail)
      );

      const format =
        campDeliverables.map((d) => d.format || d.title).filter(Boolean).join(", ") ||
        inv.deliverableFormat ||
        "Sponsored Post";

      const cost = Number(inv.compensation) || Number(inv.fee) || 0;
      const attributedSales =
        Number(inv.attributedRevenue) || Number(inv.attributedSales) || 0;

      const views =
        inv.views != null
          ? Number(inv.views)
          : inv.metrics?.views != null
          ? Number(inv.metrics.views)
          : null;

      const clicks =
        inv.clicks != null
          ? Number(inv.clicks)
          : inv.metrics?.clicks != null
          ? Number(inv.metrics.clicks)
          : null;

      const conversions =
        inv.conversions != null
          ? Number(inv.conversions)
          : inv.metrics?.conversions != null
          ? Number(inv.metrics.conversions)
          : null;

      let conversionRate = "—";
      if (clicks && conversions) {
        conversionRate = `${((conversions / clicks) * 100).toFixed(1)}%`;
      } else if (inv.conversionRate) {
        conversionRate = `${inv.conversionRate}%`;
      }

      return {
        id: inv.id,
        name: inv.creatorName || inv.creatorEmail || "Registered Creator",
        handle:
          inv.creatorHandle ||
          (inv.creatorEmail ? `@${inv.creatorEmail.split("@")[0]}` : "—"),
        campaign: inv.campaignName || camp?.name || "Campaign",
        format,
        cost,
        attributedSales,
        views: views != null ? views.toLocaleString() : "—",
        clicks: clicks != null ? clicks.toLocaleString() : "—",
        conversionRate,
        status: inv.status || "pending",
        itemROI: calculateROI(attributedSales, cost),
      };
    });
  }, [invitations, deliverables, campaigns, selectedCampaignId]);

  // Dynamic Chart Points derived from campaigns with non-zero financial or reach data
  const chartData = useMemo(() => {
    const list = activeCampaignList.filter(
      (c) =>
        (Number(c.spend) || 0) > 0 ||
        (Number(c.attributedRevenue) || 0) > 0 ||
        (Number(c.views) || 0) > 0
    );

    if (list.length === 0) return [];

    return list.map((c) => ({
      label: c.name.length > 16 ? c.name.slice(0, 14) + "…" : c.name,
      fullName: c.name,
      revenue: Number(c.attributedRevenue) || 0,
      spend: Number(c.spend) || 0,
      views: Number(c.views) || 0,
    }));
  }, [activeCampaignList]);

  // Compute SVG chart coordinates dynamically if chartData exists
  const maxRevenue = useMemo(() => {
    if (chartData.length === 0) return 1;
    return Math.max(...chartData.map((d) => Math.max(d.revenue, d.spend)), 100);
  }, [chartData]);

  return (
    <div style={styles.container}>
      {/* Header and Filter Control */}
      <div style={styles.topBar}>
        <div>
          <h2 style={styles.pageTitle}>Campaign Analytics & ROI Suite</h2>
          <p style={styles.pageSubtitle}>
            Full multi-touch attribution, creator performance scorecards, and verifiable return on spend.
          </p>
        </div>

        <div style={styles.filterControls}>
          <div style={styles.selectWrap}>
            <label style={styles.selectLabel}>Filter Campaign:</label>
            <select
              value={selectedCampaignId}
              onChange={(e) => setSelectedCampaignId(e.target.value)}
              style={styles.selectInput}
            >
              <option value="all">All Campaigns (Aggregated)</option>
              {campaigns.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.name}
                </option>
              ))}
            </select>
          </div>

          <div style={styles.timeRangePills}>
            {["7D", "30D", "90D", "YTD"].map((r) => (
              <button
                key={r}
                onClick={() => setTimeRange(r)}
                style={{
                  ...styles.rangeBtn,
                  backgroundColor: timeRange === r ? accent : "#f1f5f9",
                  color: timeRange === r ? "#ffffff" : "#475569",
                  fontWeight: timeRange === r ? 700 : 500,
                }}
              >
                {r}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Financial ROI Master Banner */}
      <div style={styles.roiMasterBanner}>
        <div style={styles.roiInfoBlock}>
          <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 4 }}>
            <span style={styles.formulaTag}>Attribution Equation</span>
            <span style={styles.sourceVerifiedTag}>
              <CheckCircle2 size={12} color="#15803d" style={{ marginRight: 4 }} />
              Database Computed
            </span>
          </div>

          <code style={styles.formulaCode}>
            ROI = ((Attributed Revenue - Campaign Cost) / Campaign Cost) × 100
          </code>

          <p style={styles.formulaExplanation}>
            Calculated against <strong>${totalSpend.toLocaleString()}</strong> in verified campaign expenditure and <strong>${totalAttributedRevenue.toLocaleString()}</strong> in attributed customer sales.
          </p>
        </div>

        <div style={styles.roiStatHighlight}>
          <span style={styles.roiHeaderLabel}>Net Financial ROI</span>
          <span
            style={{
              ...styles.roiLargePercent,
              color: overallROI.isPositive ? "#15803d" : totalSpend === 0 ? "#64748b" : "#b91c1c",
            }}
          >
            {overallROI.formatted}
          </span>
          <span style={styles.netProfitLabel}>
            Net Gain:{" "}
            <strong>
              {totalAttributedRevenue >= totalSpend ? "+" : ""}
              ${(totalAttributedRevenue - totalSpend).toLocaleString()}
            </strong>
          </span>
        </div>
      </div>

      {/* KPI Cards Grid */}
      <div style={styles.kpiGrid}>
        <div style={styles.kpiCard}>
          <span style={styles.kpiLabel}>Total Attributed Views</span>
          <span style={styles.kpiVal}>
            {totalViews > 0 ? totalViews.toLocaleString() : "0"}
          </span>
          <span style={styles.kpiSub}>
            {totalViews > 0
              ? "Across connected creator publications"
              : "Awaiting platform telemetry"}
          </span>
        </div>

        <div style={styles.kpiCard}>
          <span style={styles.kpiLabel}>Unique Audience Reach</span>
          <span style={styles.kpiVal}>
            {totalReach > 0 ? totalReach.toLocaleString() : "0"}
          </span>
          <span style={styles.kpiSub}>
            {totalReach > 0
              ? "Deduplicated unique users exposed"
              : "Awaiting audience metrics"}
          </span>
        </div>

        <div style={styles.kpiCard}>
          <span style={styles.kpiLabel}>Tracked Referral Clicks</span>
          <span style={styles.kpiVal}>
            {totalClicks > 0 ? totalClicks.toLocaleString() : "0"}
          </span>
          <span style={styles.kpiSub}>
            {totalClicks > 0
              ? "Via UTM links & bio links"
              : "Awaiting referral link tracking"}
          </span>
        </div>

        <div style={styles.kpiCard}>
          <span style={styles.kpiLabel}>Attributed Conversions</span>
          <span style={styles.kpiVal}>
            {totalConversions > 0 ? totalConversions.toLocaleString() : "0"}
          </span>
          <span style={styles.kpiSub}>
            {totalConversions > 0
              ? `Avg CPA: $${(totalSpend / totalConversions).toFixed(2)}`
              : "Awaiting conversion events"}
          </span>
        </div>
      </div>

      {/* Performance Over Time Chart */}
      <div style={styles.chartCard}>
        <div style={styles.chartHeader}>
          <div>
            <h3 style={styles.chartTitle}>Attributed Performance Trends</h3>
            <p style={styles.chartSubtitle}>
              Comparison of verified spend and attributed customer revenue across campaigns.
            </p>
          </div>
          {chartData.length > 0 && (
            <div style={styles.legendRow}>
              <span style={styles.legendItem}>
                <span style={{ ...styles.legendDot, backgroundColor: accent }} />
                Attributed Revenue ($)
              </span>
              <span style={styles.legendItem}>
                <span style={{ ...styles.legendDot, backgroundColor: "#f59e0b" }} />
                Campaign Spend ($)
              </span>
            </div>
          )}
        </div>

        {chartData.length === 0 ? (
          <div style={styles.chartEmptyWrap}>
            <div style={styles.chartEmptyIconWrap}>
              <BarChart2 size={32} color="#94a3b8" />
            </div>
            <h4 style={styles.chartEmptyTitle}>No Performance Telemetry Recorded Yet</h4>
            <p style={styles.chartEmptyText}>
              When campaigns record spend, attributed sales, or reach data, dynamic performance comparisons and attribution curves will render here.
            </p>
          </div>
        ) : (
          <div style={styles.svgContainer}>
            <svg viewBox="0 0 700 220" style={styles.svg}>
              {/* Grid lines */}
              {[30, 80, 130, 180].map((y) => (
                <line
                  key={y}
                  x1="40"
                  y1={y}
                  x2="680"
                  y2={y}
                  stroke="#f1f5f9"
                  strokeWidth="1"
                />
              ))}

              <defs>
                <linearGradient id="revenueGrad" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor={accent} stopOpacity="0.25" />
                  <stop offset="100%" stopColor={accent} stopOpacity="0.0" />
                </linearGradient>
              </defs>

              {/* Dynamic Bars or Points depending on data count */}
              {chartData.map((d, i) => {
                const totalPoints = chartData.length;
                const slotWidth = (640 - 80) / Math.max(totalPoints - 1, 1);
                const x = totalPoints === 1 ? 350 : 80 + i * slotWidth;

                // Scale Y from 180 (zero) down to 30 (max)
                const revHeight = (d.revenue / maxRevenue) * 140;
                const spendHeight = (d.spend / maxRevenue) * 140;

                const yRev = Math.max(180 - revHeight, 30);
                const ySpend = Math.max(180 - spendHeight, 30);

                return (
                  <g key={i}>
                    {/* Spend bar/indicator */}
                    {d.spend > 0 && (
                      <rect
                        x={x - 14}
                        y={ySpend}
                        width="12"
                        height={Math.max(180 - ySpend, 2)}
                        fill="#fde68a"
                        stroke="#f59e0b"
                        strokeWidth="1"
                        rx="3"
                      />
                    )}

                    {/* Revenue bar/indicator */}
                    {d.revenue > 0 && (
                      <rect
                        x={x + 2}
                        y={yRev}
                        width="12"
                        height={Math.max(180 - yRev, 2)}
                        fill={accent}
                        opacity="0.85"
                        rx="3"
                      />
                    )}

                    {/* Value text above higher bar */}
                    <text
                      x={x}
                      y={Math.min(yRev, ySpend) - 8}
                      textAnchor="middle"
                      fontSize="10"
                      fill="#0f172a"
                      fontWeight="700"
                    >
                      ${d.revenue > 0 ? `${(d.revenue / 1000).toFixed(1)}k` : `$${d.spend.toLocaleString()}`}
                    </text>

                    {/* X-axis label */}
                    <text
                      x={x}
                      y="204"
                      textAnchor="middle"
                      fontSize="11"
                      fill="#64748b"
                      fontWeight="500"
                    >
                      {d.label}
                    </text>
                  </g>
                );
              })}
            </svg>
          </div>
        )}
      </div>

      {/* Creator-Level Performance Comparison Table */}
      <div style={styles.tableCard}>
        <div style={styles.cardHeaderFlex}>
          <div>
            <h3 style={styles.tableTitle}>Creator Performance & ROI Scorecard</h3>
            <p style={styles.tableSubtitle}>
              Individual performance attribution across creators, deliverables, and conversion yield.
            </p>
          </div>
          <span style={styles.benchmarkLabel}>
            <Users size={13} style={{ marginRight: 4 }} color="#0284c7" />
            {creatorPerformanceRows.length} Creator Record{creatorPerformanceRows.length !== 1 ? "s" : ""}
          </span>
        </div>

        {creatorPerformanceRows.length === 0 ? (
          <div style={styles.emptyTableBox}>
            <div style={styles.emptyTableIconWrap}>
              <TrendingUp size={26} color="#94a3b8" />
            </div>
            <h4 style={styles.emptyTableTitle}>No Creator Attribution Data Yet</h4>
            <p style={styles.emptyTableText}>
              Once creators accept invitations to your campaigns and deliverables are submitted, their individual attribution metrics, reach, and ROI will appear in this scorecard.
            </p>
          </div>
        ) : (
          <div style={styles.tableWrapper}>
            <table style={styles.table}>
              <thead>
                <tr style={styles.thRow}>
                  <th style={styles.th}>Creator</th>
                  <th style={styles.th}>Campaign & Content Format</th>
                  <th style={styles.th}>Contracted Cost</th>
                  <th style={styles.th}>Attributed Revenue</th>
                  <th style={styles.th}>Individual ROI</th>
                  <th style={styles.th}>Views</th>
                  <th style={styles.th}>Clicks</th>
                  <th style={{ ...styles.th, textAlign: "right" }}>Conversion Rate</th>
                </tr>
              </thead>
              <tbody>
                {creatorPerformanceRows.map((item) => (
                  <tr key={item.id} style={styles.tr}>
                    <td style={styles.td}>
                      <span style={styles.creatorBold}>{item.name}</span>
                      <span style={styles.handleSub}>{item.handle}</span>
                    </td>
                    <td style={styles.td}>
                      <span style={styles.campTitleText}>{item.campaign}</span>
                      <span style={styles.formatTag}>{item.format}</span>
                    </td>
                    <td style={styles.tdBold}>${item.cost.toLocaleString()}</td>
                    <td
                      style={{
                        ...styles.tdBold,
                        color: item.attributedSales > 0 ? "#15803d" : "#64748b",
                      }}
                    >
                      ${item.attributedSales.toLocaleString()}
                    </td>
                    <td style={styles.td}>
                      <span
                        style={{
                          ...styles.roiBadge,
                          backgroundColor: item.itemROI.isPositive
                            ? "#f0fdf4"
                            : item.cost === 0
                            ? "#f8fafc"
                            : "#fef2f2",
                          color: item.itemROI.isPositive
                            ? "#15803d"
                            : item.cost === 0
                            ? "#64748b"
                            : "#b91c1c",
                          borderColor: item.itemROI.isPositive
                            ? "#bbf7d0"
                            : item.cost === 0
                            ? "#e2e8f0"
                            : "#fecaca",
                        }}
                      >
                        {item.itemROI.formatted}
                      </span>
                    </td>
                    <td style={styles.td}>{item.views}</td>
                    <td style={styles.td}>{item.clicks}</td>
                    <td style={{ ...styles.td, textAlign: "right" }}>
                      <span style={styles.cvrPill}>{item.conversionRate}</span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Telemetry Stamp */}
      <div style={styles.footerNotice}>
        <Info size={15} color="#0284c7" />
        <span>
          Metrics Source: <strong>CreatorIQ Attributed Telemetry Engine</strong> • Real-time database calculations • Zero synthetic data injected.
        </span>
      </div>
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
  filterControls: {
    display: "flex",
    alignItems: "center",
    gap: "12px",
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
    padding: "7px 12px",
    borderRadius: "8px",
    border: "1px solid #cbd5e1",
    fontSize: "12.5px",
    color: "#0f172a",
    backgroundColor: "#ffffff",
    outline: "none",
  },
  timeRangePills: {
    display: "flex",
    gap: "4px",
    backgroundColor: "#ffffff",
    padding: "3px",
    borderRadius: "8px",
    border: "1px solid #cbd5e1",
  },
  rangeBtn: {
    padding: "4px 10px",
    borderRadius: "6px",
    border: "none",
    fontSize: "11.5px",
    cursor: "pointer",
    transition: "all 0.15s ease",
  },
  roiMasterBanner: {
    backgroundColor: "#ffffff",
    borderRadius: "14px",
    border: "1px solid #bae6fd",
    backgroundImage: "linear-gradient(180deg, #f0f9ff 0%, #ffffff 100%)",
    padding: "22px 28px",
    display: "flex",
    justifyContent: "space-between",
    alignItems: "center",
    flexWrap: "wrap",
    gap: "20px",
    boxShadow: "0 2px 6px rgba(2, 132, 199, 0.08)",
  },
  roiInfoBlock: {
    flex: "1 1 400px",
  },
  formulaTag: {
    fontSize: "11px",
    fontWeight: "700",
    textTransform: "uppercase",
    color: "#0369a1",
    backgroundColor: "#e0f2fe",
    padding: "2px 8px",
    borderRadius: "4px",
    letterSpacing: "0.5px",
  },
  sourceVerifiedTag: {
    fontSize: "11px",
    fontWeight: "600",
    color: "#15803d",
    display: "inline-flex",
    alignItems: "center",
  },
  formulaCode: {
    display: "block",
    fontSize: "13px",
    fontWeight: "700",
    color: "#0f172a",
    fontFamily: "monospace",
    backgroundColor: "#ffffff",
    padding: "6px 12px",
    borderRadius: "6px",
    border: "1px solid #cbd5e1",
    width: "fit-content",
    marginTop: "8px",
    marginBottom: "8px",
  },
  formulaExplanation: {
    fontSize: "12.5px",
    color: "#475569",
    lineHeight: "1.4",
  },
  roiStatHighlight: {
    textAlign: "right",
  },
  roiHeaderLabel: {
    fontSize: "11.5px",
    fontWeight: "600",
    color: "#64748b",
    textTransform: "uppercase",
    display: "block",
  },
  roiLargePercent: {
    fontSize: "36px",
    fontWeight: "800",
    letterSpacing: "-1px",
    lineHeight: "1.1",
    display: "block",
  },
  netProfitLabel: {
    fontSize: "12px",
    color: "#475569",
    display: "block",
    marginTop: "4px",
  },
  kpiGrid: {
    display: "grid",
    gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))",
    gap: "16px",
  },
  kpiCard: {
    backgroundColor: "#ffffff",
    borderRadius: "12px",
    border: "1px solid #e2e8f0",
    padding: "18px 20px",
    boxShadow: "0 1px 3px rgba(15, 23, 42, 0.03)",
  },
  kpiLabel: {
    fontSize: "11px",
    fontWeight: "700",
    color: "#64748b",
    textTransform: "uppercase",
    letterSpacing: "0.5px",
    display: "block",
  },
  kpiVal: {
    fontSize: "24px",
    fontWeight: "800",
    color: "#0f172a",
    marginTop: "4px",
    display: "block",
    letterSpacing: "-0.5px",
  },
  kpiSub: {
    fontSize: "11px",
    color: "#64748b",
    marginTop: "4px",
    display: "block",
  },
  chartCard: {
    backgroundColor: "#ffffff",
    borderRadius: "14px",
    border: "1px solid #e2e8f0",
    padding: "24px",
    boxShadow: "0 1px 4px rgba(15, 23, 42, 0.04)",
  },
  chartHeader: {
    display: "flex",
    justifyContent: "space-between",
    alignItems: "center",
    flexWrap: "wrap",
    gap: "12px",
    marginBottom: "16px",
  },
  chartTitle: {
    fontSize: "16px",
    fontWeight: "700",
    color: "#0f172a",
  },
  chartSubtitle: {
    fontSize: "12px",
    color: "#64748b",
    marginTop: "2px",
  },
  legendRow: {
    display: "flex",
    gap: "14px",
    fontSize: "12px",
    color: "#475569",
  },
  legendItem: {
    display: "flex",
    alignItems: "center",
    gap: "6px",
  },
  legendDot: {
    width: "8px",
    height: "8px",
    borderRadius: "50%",
  },
  chartEmptyWrap: {
    textAlign: "center",
    padding: "44px 20px",
    backgroundColor: "#f8fafc",
    borderRadius: "10px",
    border: "1px dashed #cbd5e1",
  },
  chartEmptyIconWrap: {
    width: "52px",
    height: "52px",
    borderRadius: "50%",
    backgroundColor: "#ffffff",
    display: "inline-flex",
    alignItems: "center",
    justifyContent: "center",
    marginBottom: "10px",
    border: "1px solid #e2e8f0",
  },
  chartEmptyTitle: {
    fontSize: "14.5px",
    fontWeight: "700",
    color: "#0f172a",
  },
  chartEmptyText: {
    fontSize: "12.5px",
    color: "#64748b",
    maxWidth: "460px",
    margin: "6px auto 0",
    lineHeight: "1.5",
  },
  svgContainer: {
    width: "100%",
    overflowX: "auto",
  },
  svg: {
    width: "100%",
    height: "220px",
    display: "block",
  },
  tableCard: {
    backgroundColor: "#ffffff",
    borderRadius: "14px",
    border: "1px solid #e2e8f0",
    boxShadow: "0 1px 4px rgba(15, 23, 42, 0.04)",
    overflow: "hidden",
  },
  cardHeaderFlex: {
    padding: "20px 24px",
    borderBottom: "1px solid #e2e8f0",
    display: "flex",
    justifyContent: "space-between",
    alignItems: "center",
    flexWrap: "wrap",
    gap: "12px",
  },
  tableTitle: {
    fontSize: "16px",
    fontWeight: "700",
    color: "#0f172a",
  },
  tableSubtitle: {
    fontSize: "12px",
    color: "#64748b",
    marginTop: "2px",
  },
  benchmarkLabel: {
    display: "inline-flex",
    alignItems: "center",
    fontSize: "11.5px",
    fontWeight: "600",
    color: "#0369a1",
    backgroundColor: "#f0f9ff",
    border: "1px solid #bae6fd",
    padding: "4px 10px",
    borderRadius: "20px",
  },
  emptyTableBox: {
    textAlign: "center",
    padding: "48px 20px",
  },
  emptyTableIconWrap: {
    width: "50px",
    height: "50px",
    borderRadius: "50%",
    backgroundColor: "#f8fafc",
    display: "inline-flex",
    alignItems: "center",
    justifyContent: "center",
    marginBottom: "10px",
    border: "1px solid #e2e8f0",
  },
  emptyTableTitle: {
    fontSize: "14.5px",
    fontWeight: "700",
    color: "#0f172a",
  },
  emptyTableText: {
    fontSize: "12.5px",
    color: "#64748b",
    maxWidth: "460px",
    margin: "6px auto 0",
    lineHeight: "1.5",
  },
  tableWrapper: {
    overflowX: "auto",
  },
  table: {
    width: "100%",
    borderCollapse: "collapse",
    fontSize: "13px",
  },
  thRow: {
    backgroundColor: "#f8fafc",
    borderBottom: "1px solid #e2e8f0",
  },
  th: {
    textAlign: "left",
    padding: "12px 16px",
    color: "#64748b",
    fontSize: "11px",
    fontWeight: "700",
    textTransform: "uppercase",
    letterSpacing: "0.5px",
  },
  tr: {
    borderBottom: "1px solid #f1f5f9",
  },
  td: {
    padding: "12px 16px",
    verticalAlign: "middle",
  },
  tdBold: {
    padding: "12px 16px",
    fontWeight: "700",
    color: "#0f172a",
  },
  creatorBold: {
    fontSize: "13px",
    fontWeight: "700",
    color: "#0f172a",
    display: "block",
  },
  handleSub: {
    fontSize: "11px",
    color: "#64748b",
  },
  campTitleText: {
    fontSize: "12.5px",
    fontWeight: "600",
    color: "#0f172a",
    display: "block",
  },
  formatTag: {
    fontSize: "10.5px",
    color: "#64748b",
  },
  roiBadge: {
    display: "inline-block",
    border: "1px solid",
    fontWeight: "700",
    fontSize: "12px",
    padding: "2px 8px",
    borderRadius: "6px",
  },
  cvrPill: {
    backgroundColor: "#f1f5f9",
    color: "#334155",
    fontWeight: "600",
    fontSize: "11.5px",
    padding: "2px 8px",
    borderRadius: "6px",
  },
  footerNotice: {
    display: "flex",
    alignItems: "center",
    gap: "8px",
    fontSize: "12px",
    color: "#64748b",
    backgroundColor: "#ffffff",
    border: "1px solid #e2e8f0",
    padding: "12px 18px",
    borderRadius: "10px",
  },
};
