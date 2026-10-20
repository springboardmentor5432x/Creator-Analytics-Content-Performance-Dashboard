import {
  LayoutDashboard,
  Layers,
  Users,
  Send,
  CheckSquare,
  BarChart3,
  FileSpreadsheet,
  Building2,
} from "lucide-react";

const MARKETING_SECTIONS = [
  { id: "overview", label: "Overview", icon: LayoutDashboard },
  { id: "campaigns", label: "Campaigns", icon: Layers },
  { id: "discovery", label: "Creator Discovery", icon: Users },
  { id: "invitations", label: "Invitations", icon: Send },
  { id: "deliverables", label: "Deliverables", icon: CheckSquare },
  { id: "agencies", label: "Agency Partners", icon: Building2 },
  { id: "analytics", label: "Analytics & ROI", icon: BarChart3 },
  { id: "reports", label: "Reports", icon: FileSpreadsheet },
];

export default function MarketingNav({
  activeSection,
  onSelectSection,
  counts = {},
  theme,
}) {
  const accent = theme?.accent || "#0284c7";

  return (
    <nav style={styles.navBar} aria-label="Marketing Suite Navigation">
      <div style={styles.tabList}>
        {MARKETING_SECTIONS.map((sec) => {
          const Icon = sec.icon;
          const isActive = activeSection === sec.id;
          const badgeCount = counts[sec.id] || 0;

          return (
            <button
              key={sec.id}
              onClick={() => onSelectSection(sec.id)}
              style={{
                ...styles.tabBtn,
                color: isActive ? accent : "#475569",
                backgroundColor: isActive ? "#ffffff" : "transparent",
                borderColor: isActive ? "#cbd5e1" : "transparent",
                boxShadow: isActive ? "0 2px 8px rgba(15, 23, 42, 0.06)" : "none",
                fontWeight: isActive ? 600 : 500,
              }}
            >
              <Icon
                size={16}
                color={isActive ? accent : "#64748b"}
                style={{ flexShrink: 0 }}
              />
              <span>{sec.label}</span>
              {badgeCount > 0 && (
                <span
                  style={{
                    ...styles.badge,
                    backgroundColor: isActive ? accent : "#e2e8f0",
                    color: isActive ? "#ffffff" : "#475569",
                  }}
                >
                  {badgeCount}
                </span>
              )}
            </button>
          );
        })}
      </div>
    </nav>
  );
}

const styles = {
  navBar: {
    backgroundColor: "#f1f5f9",
    padding: "6px",
    borderRadius: "12px",
    border: "1px solid #e2e8f0",
    marginBottom: "20px",
    overflowX: "auto",
  },
  tabList: {
    display: "flex",
    gap: "6px",
    alignItems: "center",
    minWidth: "max-content",
  },
  tabBtn: {
    display: "inline-flex",
    alignItems: "center",
    gap: "8px",
    padding: "8px 14px",
    fontSize: "13px",
    borderRadius: "8px",
    border: "1px solid",
    cursor: "pointer",
    transition: "all 0.18s ease",
    background: "none",
    whiteSpace: "nowrap",
  },
  badge: {
    fontSize: "11px",
    fontWeight: "700",
    padding: "1px 6px",
    borderRadius: "10px",
    lineHeight: "1.3",
  },
};
