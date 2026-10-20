import React, { useState } from "react";
import { Building2, ExternalLink, ArrowRight, CheckCircle2, Clock, XCircle } from "lucide-react";

function statusChip(status) {
  const map = {
    pending: { color: "#92400e", bg: "#fef3c7", label: "Pending" },
    accepted: { color: "#065f46", bg: "#d1fae5", label: "Active" },
    active: { color: "#065f46", bg: "#d1fae5", label: "Active" },
    declined: { color: "#991b1b", bg: "#fee2e2", label: "Declined" },
    revoked: { color: "#475569", bg: "#f1f5f9", label: "Revoked" },
  };
  const s = map[status] || { color: "#64748b", bg: "#f1f5f9", label: status };
  return (
    <span style={{ padding: "3px 10px", borderRadius: "20px", fontSize: "11.5px", fontWeight: "700", color: s.color, backgroundColor: s.bg }}>
      {s.label}
    </span>
  );
}

export default function AgencyBrandClients({ user, userProfile, theme, assignments = [], onRefresh, onNavigate }) {
  const accent = theme?.accent || "#0d9488";
  const accentLight = theme?.accentLight || "#f0fdfa";

  // Deduplicate brands by brandId
  const brandsMap = new Map();
  assignments.forEach((a) => {
    const key = a.brandId || a.brandEmail;
    if (!brandsMap.has(key)) {
      brandsMap.set(key, {
        brandId: a.brandId,
        brandName: a.brandName || a.brandEmail,
        brandEmail: a.brandEmail,
        campaigns: [],
      });
    }
    brandsMap.get(key).campaigns.push(a);
  });
  const brands = Array.from(brandsMap.values());

  const activeBrands = brands.filter((b) => b.campaigns.some((c) => c.status === "accepted"));
  const pendingBrands = brands.filter((b) => b.campaigns.every((c) => c.status === "pending"));

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "24px" }}>
      {/* Header */}
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
        <div>
          <h2 style={{ margin: 0, fontSize: "20px", fontWeight: "800", color: "#0f172a" }}>Brand Clients</h2>
          <p style={{ margin: "4px 0 0", fontSize: "13px", color: "#64748b" }}>
            Brands that have assigned campaigns to your agency
          </p>
        </div>
        <div style={{ display: "flex", gap: "10px" }}>
          <div style={{ padding: "8px 16px", borderRadius: "8px", backgroundColor: accentLight, border: `1px solid ${theme?.accentBorder || "#99f6e4"}`, fontSize: "12.5px", fontWeight: "600", color: accent }}>
            {activeBrands.length} Active · {pendingBrands.length} Pending
          </div>
        </div>
      </div>

      {/* Summary Stats */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: "14px" }}>
        {[
          { label: "Total Brands", value: brands.length, icon: Building2, color: accent, bg: accentLight },
          { label: "Active Relationships", value: activeBrands.length, icon: CheckCircle2, color: "#16a34a", bg: "#f0fdf4" },
          { label: "Pending Approvals", value: pendingBrands.length, icon: Clock, color: "#f59e0b", bg: "#fffbeb" },
        ].map((s) => (
          <div key={s.label} style={{ backgroundColor: "#ffffff", border: "1px solid #e2e8f0", borderRadius: "12px", padding: "16px 18px", display: "flex", alignItems: "center", gap: "12px" }}>
            <div style={{ width: 36, height: 36, borderRadius: "10px", backgroundColor: s.bg, display: "flex", alignItems: "center", justifyContent: "center" }}>
              <s.icon size={18} color={s.color} />
            </div>
            <div>
              <div style={{ fontSize: "20px", fontWeight: "800", color: "#0f172a" }}>{s.value}</div>
              <div style={{ fontSize: "11.5px", color: "#64748b" }}>{s.label}</div>
            </div>
          </div>
        ))}
      </div>

      {/* Brands List */}
      {brands.length === 0 ? (
        <div style={{ backgroundColor: "#ffffff", border: "1px solid #e2e8f0", borderRadius: "16px", padding: "60px 20px", textAlign: "center" }}>
          <Building2 size={40} color="#cbd5e1" style={{ marginBottom: 14 }} />
          <h3 style={{ margin: "0 0 8px", fontSize: "16px", fontWeight: "700", color: "#475569" }}>No Brand Clients Yet</h3>
          <p style={{ margin: 0, fontSize: "13px", color: "#94a3b8" }}>
            Marketing teams can assign campaigns to your agency from their portal. Once accepted, brands appear here.
          </p>
        </div>
      ) : (
        <div style={{ display: "flex", flexDirection: "column", gap: "14px" }}>
          {brands.map((brand) => {
            const activeCount = brand.campaigns.filter((c) => c.status === "accepted").length;
            const pendingCount = brand.campaigns.filter((c) => c.status === "pending").length;
            return (
              <div key={brand.brandId || brand.brandEmail} style={{ backgroundColor: "#ffffff", border: "1px solid #e2e8f0", borderRadius: "14px", padding: "20px 22px" }}>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
                  <div style={{ display: "flex", alignItems: "center", gap: "14px" }}>
                    {/* Brand Avatar */}
                    <div style={{ width: 46, height: 46, borderRadius: "12px", backgroundColor: accentLight, display: "flex", alignItems: "center", justifyContent: "center", fontWeight: "800", color: accent, fontSize: "18px", border: `1px solid ${theme?.accentBorder || "#99f6e4"}` }}>
                      {(brand.brandName || "B").charAt(0).toUpperCase()}
                    </div>
                    <div>
                      <div style={{ fontSize: "15px", fontWeight: "700", color: "#0f172a" }}>{brand.brandName}</div>
                      <div style={{ fontSize: "12px", color: "#64748b" }}>{brand.brandEmail}</div>
                    </div>
                  </div>
                  <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                    {activeCount > 0 && <span style={{ padding: "3px 10px", borderRadius: "20px", fontSize: "11.5px", fontWeight: "700", color: "#065f46", backgroundColor: "#d1fae5" }}>{activeCount} Active</span>}
                    {pendingCount > 0 && <span style={{ padding: "3px 10px", borderRadius: "20px", fontSize: "11.5px", fontWeight: "700", color: "#92400e", backgroundColor: "#fef3c7" }}>{pendingCount} Pending</span>}
                  </div>
                </div>

                {/* Campaign list for this brand */}
                <div style={{ marginTop: "16px", display: "flex", flexDirection: "column", gap: "8px" }}>
                  {brand.campaigns.map((c) => (
                    <div key={c.id} style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "9px 12px", backgroundColor: "#f8fafc", borderRadius: "8px", border: "1px solid #f1f5f9" }}>
                      <div>
                        <span style={{ fontSize: "12.5px", fontWeight: "600", color: "#334155" }}>{c.campaignTitle || "Campaign"}</span>
                        {c.permissions?.viewBudget && c.budget && (
                          <span style={{ marginLeft: 8, fontSize: "11.5px", color: "#64748b" }}>Budget: {c.budget}</span>
                        )}
                      </div>
                      <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                        {statusChip(c.status)}
                        <button
                          onClick={() => onNavigate("campaigns")}
                          style={{ display: "flex", alignItems: "center", gap: "4px", background: "none", border: "none", color: accent, fontSize: "12px", fontWeight: "600", cursor: "pointer" }}
                        >
                          Details <ArrowRight size={12} />
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
