import React, { useState } from "react";
import {
  Handshake,
  Calendar,
  CheckCircle2,
  Clock,
  AlertTriangle,
  RotateCcw,
  Send,
  FileCheck,
  ArrowRight,
  X,
  UploadCloud,
  ExternalLink,
  BadgeCheck,
  XCircle,
  MessageSquare,
} from "lucide-react";
import { submitDeliverable } from "../creatorService";

const STATUS_CONFIG = {
  approved: { label: "Reviewed & Accepted", color: "#15803d", bg: "#f0fdf4", border: "#bbf7d0", Icon: CheckCircle2 },
  rejected: { label: "Rejected", color: "#b91c1c", bg: "#fef2f2", border: "#fecaca", Icon: XCircle },
  revision_requested: { label: "Changes Requested", color: "#b45309", bg: "#fffbeb", border: "#fde68a", Icon: MessageSquare },
  submitted: { label: "Under Review", color: "#1d4ed8", bg: "#eff6ff", border: "#bfdbfe", Icon: Clock },
  resubmitted: { label: "Under Review (Resubmitted)", color: "#1d4ed8", bg: "#eff6ff", border: "#bfdbfe", Icon: Clock },
  pending: { label: "Awaiting Submission", color: "#475569", bg: "#f8fafc", border: "#e2e8f0", Icon: UploadCloud },
};

function StatusPill({ status }) {
  const cfg = STATUS_CONFIG[status] || STATUS_CONFIG.pending;
  const Icon = cfg.Icon;
  return (
    <span style={{ display: "inline-flex", alignItems: "center", gap: "5px", padding: "4px 10px", borderRadius: "20px", fontSize: "11.5px", fontWeight: "700", color: cfg.color, backgroundColor: cfg.bg, border: `1px solid ${cfg.border}`, whiteSpace: "nowrap" }}>
      <Icon size={12} />{cfg.label}
    </span>
  );
}

export default function CreatorCollaborationsView({ invitations = [], deliverables = [], theme, onNavigate, onRefresh, user, userProfile }) {
  const accent = theme?.accent || "#2563eb";
  const [uploadModal, setUploadModal] = useState(null);
  const [uploadUrl, setUploadUrl] = useState("");
  const [uploadNotes, setUploadNotes] = useState("");
  const [uploadError, setUploadError] = useState("");
  const [isUploading, setIsUploading] = useState(false);
  const [toast, setToast] = useState("");

  const showToast = (msg) => { setToast(msg); setTimeout(() => setToast(""), 4000); };

  const openUploadModal = (deliverable, collab) => {
    setUploadModal({ deliverable, collab });
    setUploadUrl(deliverable.submissionUrl || "");
    setUploadNotes(deliverable.submissionNotes || "");
    setUploadError("");
  };

  const handleUploadSubmit = async (e) => {
    e.preventDefault();
    if (!uploadUrl.trim()) { setUploadError("Please provide a valid content URL."); return; }
    const trimmed = uploadUrl.trim();
    if (!trimmed.startsWith("http://") && !trimmed.startsWith("https://")) {
      setUploadError("Content URL must begin with http:// or https://");
      return;
    }
    setIsUploading(true); setUploadError("");
    try {
      await submitDeliverable(uploadModal.deliverable.id, { submissionUrl: uploadUrl.trim(), submissionNotes: uploadNotes.trim() }, userProfile || user);
      setUploadModal(null);
      showToast("Content submitted! The brand team has been notified.");
      if (onRefresh) onRefresh();
    } catch (err) {
      setUploadError(err.message || "Upload failed. Please try again.");
    } finally {
      setIsUploading(false);
    }
  };

  const collaborations = invitations.filter((inv) => inv.status === "accepted");
  const totalContracted = collaborations.reduce((acc, inv) => acc + Number(inv.compensation || inv.fee || inv.budget || 0), 0);

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "20px" }}>
      {toast && (
        <div style={{ position: "fixed", bottom: "24px", right: "24px", backgroundColor: "#ffffff", border: "1px solid #bbf7d0", color: "#15803d", fontSize: "13px", fontWeight: "600", padding: "12px 20px", borderRadius: "10px", display: "flex", alignItems: "center", gap: "10px", boxShadow: "0 10px 25px rgba(0,0,0,0.12)", zIndex: 1100 }}>
          <CheckCircle2 size={16} color="#15803d" /><span>{toast}</span>
        </div>
      )}

      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: "14px" }}>
        <div>
          <h2 style={{ fontSize: "20px", fontWeight: "700", color: "#0f172a", margin: 0 }}>My Brand Collaborations</h2>
          <p style={{ fontSize: "13px", color: "#64748b", marginTop: "3px" }}>Active brand deals — your accepted budget, deliverable submissions, and review statuses.</p>
        </div>
        <div style={{ backgroundColor: "#ffffff", border: "1px solid #e2e8f0", borderRadius: "12px", padding: "12px 22px", textAlign: "right", boxShadow: "0 1px 3px rgba(15,23,42,0.03)" }}>
          <span style={{ fontSize: "10px", fontWeight: "700", color: "#64748b", textTransform: "uppercase", letterSpacing: "0.5px", display: "block" }}>TOTAL ACCEPTED BUDGET</span>
          <span style={{ fontSize: "24px", fontWeight: "800", letterSpacing: "-0.5px", display: "block", color: "#15803d" }}>${totalContracted.toLocaleString()}</span>
          <span style={{ fontSize: "11px", color: "#64748b", display: "block" }}>Across {collaborations.length} active deal{collaborations.length !== 1 ? "s" : ""}</span>
        </div>
      </div>

      {collaborations.length === 0 ? (
        <div style={{ textAlign: "center", padding: "60px 20px", backgroundColor: "#ffffff", borderRadius: "14px", border: "1px solid #e2e8f0", display: "flex", flexDirection: "column", alignItems: "center" }}>
          <div style={{ width: "56px", height: "56px", borderRadius: "50%", backgroundColor: "#f8fafc", border: "1px solid #e2e8f0", display: "inline-flex", alignItems: "center", justifyContent: "center", marginBottom: "12px" }}><Handshake size={28} color="#94a3b8" /></div>
          <h4 style={{ fontSize: "15px", fontWeight: "700", color: "#0f172a", margin: 0 }}>No active collaborations yet</h4>
          <p style={{ fontSize: "13px", color: "#64748b", maxWidth: "400px", margin: "6px auto 0" }}>When you accept a brand invitation, your partnership details, agreed budget, and deliverables will appear here.</p>
          <div style={{ display: "flex", gap: "10px", marginTop: "14px" }}>
            <button onClick={() => onNavigate("invitations")} style={{ padding: "8px 16px", borderRadius: "8px", color: "#ffffff", border: "none", fontSize: "12.5px", fontWeight: "600", cursor: "pointer", backgroundColor: accent }}>Check Invitations</button>
            <button onClick={() => onNavigate("discover")} style={{ padding: "8px 16px", borderRadius: "8px", border: "1px solid #cbd5e1", backgroundColor: "#ffffff", color: "#334155", fontSize: "12.5px", fontWeight: "600", cursor: "pointer" }}>Discover Campaigns</button>
          </div>
        </div>
      ) : (
        <div style={{ display: "flex", flexDirection: "column", gap: "20px" }}>
          {collaborations.map((collab) => {
            const collabDeliverables = deliverables.filter((d) => d.campaignId === collab.campaignId || d.campaignTitle === collab.campaignTitle || d.campaignName === collab.campaignName);
            const approvedCount = collabDeliverables.filter((d) => d.status === "approved").length;
            const totalCount = collabDeliverables.length || 1;
            const progressPercent = Math.round((approvedCount / totalCount) * 100);
            const acceptedBudget = Number(collab.compensation || collab.fee || collab.budget || 0);

            return (
              <div key={collab.id} style={{ backgroundColor: "#ffffff", border: "1px solid #e2e8f0", borderRadius: "16px", padding: "24px", boxShadow: "0 1px 4px rgba(15,23,42,0.04)", display: "flex", flexDirection: "column", gap: "18px" }}>
                {/* Header */}
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", flexWrap: "wrap", gap: "14px" }}>
                  <div>
                    <span style={{ fontSize: "10.5px", fontWeight: "700", color: "#15803d", backgroundColor: "#f0fdf4", border: "1px solid #bbf7d0", padding: "2px 8px", borderRadius: "6px", letterSpacing: "0.5px", display: "inline-block", marginBottom: "5px" }}>✓ CONTRACT ACTIVE</span>
                    <h3 style={{ fontSize: "18px", fontWeight: "700", color: "#0f172a", margin: "0 0 2px" }}>{collab.campaignTitle || collab.campaignName || "Brand Partnership"}</h3>
                    <span style={{ fontSize: "12.5px", color: "#64748b", display: "block" }}>Brand Partner: <strong>{collab.marketingName || collab.brandName || "Brand Team"}</strong></span>
                  </div>

                  {/* ACCEPTED BUDGET - green box */}
                  <div style={{ backgroundColor: "#f0fdf4", border: "1px solid #bbf7d0", borderRadius: "12px", padding: "12px 18px", textAlign: "right", minWidth: "160px" }}>
                    <span style={{ fontSize: "10px", fontWeight: "700", color: "#15803d", textTransform: "uppercase", letterSpacing: "0.5px", display: "block" }}>ACCEPTED BUDGET</span>
                    <span style={{ fontSize: "22px", fontWeight: "800", letterSpacing: "-0.5px", display: "block", marginTop: "1px", color: "#15803d" }}>${acceptedBudget.toLocaleString()}</span>
                    <span style={{ fontSize: "11px", color: "#4d7c60", display: "block", marginTop: "1px" }}>Agreed collaboration fee</span>
                  </div>
                </div>

                {/* Progress bar */}
                <div style={{ display: "flex", flexDirection: "column", gap: "6px" }}>
                  <div style={{ display: "flex", justifyContent: "space-between", fontSize: "12px" }}>
                    <span style={{ fontWeight: "600", color: "#475569" }}>Deliverable Progress</span>
                    <span style={{ color: "#64748b" }}>{approvedCount} of {collabDeliverables.length} Accepted ({progressPercent}%)</span>
                  </div>
                  <div style={{ height: "7px", borderRadius: "4px", backgroundColor: "#f1f5f9", overflow: "hidden" }}>
                    <div style={{ height: "100%", borderRadius: "4px", transition: "width 0.4s ease", width: `${progressPercent}%`, backgroundColor: progressPercent === 100 ? "#16a34a" : accent }} />
                  </div>
                </div>

                {/* Deliverables Table */}
                {collabDeliverables.length > 0 ? (
                  <div style={{ borderRadius: "10px", border: "1px solid #e2e8f0", overflow: "hidden" }}>
                    <div style={{ display: "grid", gridTemplateColumns: "1.5fr 1.6fr 1fr auto", gap: "12px", padding: "9px 14px", backgroundColor: "#f8fafc", borderBottom: "1px solid #e2e8f0", fontSize: "10.5px", fontWeight: "700", color: "#64748b", textTransform: "uppercase", letterSpacing: "0.4px" }}>
                      <span>Deliverable</span><span>Status</span><span>Submission</span><span style={{ textAlign: "right" }}>Action</span>
                    </div>
                    {collabDeliverables.map((del) => {
                      const isActionable = del.status === "pending" || del.status === "revision_requested" || del.status === "rejected";
                      const isResubmittable = del.status === "submitted" || del.status === "resubmitted";
                      const isDone = del.status === "approved";
                      return (
                        <div key={del.id} style={{ display: "grid", gridTemplateColumns: "1.5fr 1.6fr 1fr auto", gap: "12px", padding: "12px 14px", borderBottom: "1px solid #f1f5f9", alignItems: "center", backgroundColor: "#ffffff" }}>
                          <div>
                            <div style={{ fontSize: "13px", fontWeight: "600", color: "#0f172a" }}>{del.title || "Deliverable"}</div>
                            {del.format && <span style={{ fontSize: "10.5px", backgroundColor: "#f1f5f9", color: "#475569", padding: "1px 6px", borderRadius: "4px", fontWeight: "600", display: "inline-block", marginTop: "3px" }}>{del.format}</span>}
                            {del.dueDate && <div style={{ display: "flex", alignItems: "center", fontSize: "11px", color: "#94a3b8", marginTop: "4px" }}><Calendar size={11} style={{ marginRight: 3 }} />Due: {del.dueDate}</div>}
                          </div>
                          <div>
                            <StatusPill status={del.status} />
                            {del.status === "revision_requested" && del.revisionFeedback && (
                              <div style={{ display: "flex", alignItems: "flex-start", marginTop: "6px", fontSize: "11px", color: "#92400e", backgroundColor: "#fffbeb", border: "1px solid #fde68a", borderRadius: "6px", padding: "4px 8px", lineHeight: "1.4" }}>
                                <MessageSquare size={11} style={{ marginRight: 4, flexShrink: 0, marginTop: 1 }} />
                                <span>{del.revisionFeedback}</span>
                              </div>
                            )}
                          </div>
                          <div>
                            {del.submissionUrl ? (
                              <a href={del.submissionUrl} target="_blank" rel="noopener noreferrer" style={{ display: "inline-flex", alignItems: "center", fontSize: "12px", fontWeight: "600", color: "#0284c7", textDecoration: "underline" }}>
                                <ExternalLink size={11} style={{ marginRight: 3 }} />View Link
                              </a>
                            ) : (
                              <span style={{ fontSize: "11.5px", color: "#94a3b8", fontStyle: "italic" }}>Not submitted</span>
                            )}
                          </div>
                          <div style={{ textAlign: "right" }}>
                            {isDone ? (
                              <span style={{ display: "inline-flex", alignItems: "center", fontSize: "11.5px", fontWeight: "700", color: "#15803d" }}><BadgeCheck size={13} style={{ marginRight: 4 }} />Accepted</span>
                            ) : isActionable ? (
                              <button onClick={() => openUploadModal(del, collab)} style={{ display: "inline-flex", alignItems: "center", padding: "6px 12px", borderRadius: "7px", color: "#ffffff", border: "none", fontSize: "11.5px", fontWeight: "600", cursor: "pointer", whiteSpace: "nowrap", backgroundColor: del.status === "rejected" ? "#b91c1c" : del.status === "revision_requested" ? "#b45309" : accent }}>
                                {del.status === "rejected" ? <><XCircle size={12} style={{ marginRight: 5 }} />Resubmit</> : del.status === "revision_requested" ? <><RotateCcw size={12} style={{ marginRight: 5 }} />Apply Changes</> : <><UploadCloud size={12} style={{ marginRight: 5 }} />Upload Content</>}
                              </button>
                            ) : isResubmittable ? (
                              <button onClick={() => openUploadModal(del, collab)} style={{ display: "inline-flex", alignItems: "center", padding: "6px 12px", borderRadius: "7px", color: "#ffffff", border: "none", fontSize: "11.5px", fontWeight: "600", cursor: "pointer", backgroundColor: "#475569" }}>
                                <FileCheck size={12} style={{ marginRight: 5 }} />Update
                              </button>
                            ) : null}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                ) : (
                  <div style={{ display: "flex", alignItems: "center", fontSize: "12.5px", color: "#94a3b8", fontStyle: "italic", padding: "10px 4px" }}>
                    <Clock size={14} color="#94a3b8" style={{ marginRight: 6 }} />No deliverables assigned yet — the brand team will create milestones shortly.
                  </div>
                )}

                {/* Footer */}
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", borderTop: "1px solid #f1f5f9", paddingTop: "12px", flexWrap: "wrap", gap: "10px" }}>
                  <span style={{ display: "inline-flex", alignItems: "center", fontSize: "12.5px", color: "#64748b" }}><Calendar size={13} style={{ marginRight: 5 }} />Flight: {collab.startDate || "Active"} {"->"} {collab.endDate || "Ongoing"}</span>
                  <button onClick={() => onNavigate("deliverables")} style={{ display: "inline-flex", alignItems: "center", padding: "7px 14px", borderRadius: "8px", color: "#ffffff", border: "none", fontSize: "12px", fontWeight: "600", cursor: "pointer", backgroundColor: accent }}>
                    View All Deliverables<ArrowRight size={13} style={{ marginLeft: 6 }} />
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Upload Modal */}
      {uploadModal && (
        <div style={{ position: "fixed", inset: 0, backgroundColor: "rgba(15,23,42,0.52)", backdropFilter: "blur(3px)", display: "flex", alignItems: "center", justifyContent: "center", zIndex: 1050, padding: "20px" }}>
          <div style={{ backgroundColor: "#ffffff", borderRadius: "18px", maxWidth: "540px", width: "100%", boxShadow: "0 24px 40px rgba(0,0,0,0.15)", overflow: "hidden" }}>
            <div style={{ padding: "22px 24px", borderBottom: "1px solid #e2e8f0", display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
              <div>
                <span style={{ fontSize: "10.5px", fontWeight: "700", color: "#2563eb", textTransform: "uppercase", letterSpacing: "0.5px", display: "block", marginBottom: "3px" }}>{uploadModal.collab?.campaignTitle || "Brand Collaboration"}</span>
                <h3 style={{ fontSize: "18px", fontWeight: "700", color: "#0f172a", margin: "0 0 2px" }}>
                  {uploadModal.deliverable.status === "revision_requested" ? "Apply Requested Changes" : uploadModal.deliverable.status === "rejected" ? "Resubmit Deliverable" : "Upload Content Submission"}
                </h3>
                <p style={{ fontSize: "12.5px", color: "#64748b", margin: 0 }}>{uploadModal.deliverable.title}</p>
              </div>
              <button onClick={() => setUploadModal(null)} style={{ background: "none", border: "none", padding: "6px", cursor: "pointer", color: "#64748b", borderRadius: "6px" }}><X size={18} /></button>
            </div>

            {uploadModal.deliverable.status === "revision_requested" && uploadModal.deliverable.revisionFeedback && (
              <div style={{ display: "flex", alignItems: "flex-start", gap: "8px", padding: "12px 20px", backgroundColor: "#fffbeb", borderBottom: "1px solid #fde68a", fontSize: "12.5px", color: "#92400e" }}>
                <MessageSquare size={14} color="#b45309" style={{ marginRight: 6, flexShrink: 0 }} />
                <div>
                  <span style={{ fontWeight: "700", display: "block", marginBottom: "2px", fontSize: "11px", textTransform: "uppercase", letterSpacing: "0.4px", color: "#b45309" }}>Brand feedback to address:</span>
                  <p style={{ margin: 0, fontStyle: "italic", lineHeight: "1.4" }}>"{uploadModal.deliverable.revisionFeedback}"</p>
                </div>
              </div>
            )}

            {uploadError && (
              <div style={{ backgroundColor: "#fef2f2", borderLeft: "3px solid #dc2626", padding: "10px 20px", display: "flex", alignItems: "center", gap: "8px", fontSize: "12.5px", color: "#b91c1c" }}>
                <AlertTriangle size={14} color="#dc2626" /><span>{uploadError}</span>
              </div>
            )}

            <form onSubmit={handleUploadSubmit} style={{ padding: "20px 24px", display: "flex", flexDirection: "column", gap: "16px" }}>
              <div style={{ display: "flex", flexDirection: "column", gap: "5px" }}>
                <label style={{ fontSize: "12.5px", fontWeight: "600", color: "#334155" }}>Content URL <span style={{ color: "#dc2626" }}>*</span></label>
                <input type="url" placeholder="https://youtube.com/watch?v=... or TikTok / Drive link" value={uploadUrl} onChange={(e) => setUploadUrl(e.target.value)} style={{ padding: "10px 12px", borderRadius: "8px", border: "1px solid #cbd5e1", fontSize: "13px", outline: "none", width: "100%", boxSizing: "border-box" }} required />
                <span style={{ fontSize: "11px", color: "#94a3b8" }}>Paste your published video, Instagram post, TikTok, or staging link.</span>
              </div>
              <div style={{ display: "flex", flexDirection: "column", gap: "5px" }}>
                <label style={{ fontSize: "12.5px", fontWeight: "600", color: "#334155" }}>Notes to Brand (optional):</label>
                <textarea rows={3} placeholder="Include timestamps, metrics screenshots, revision changes made..." value={uploadNotes} onChange={(e) => setUploadNotes(e.target.value)} style={{ padding: "10px 12px", borderRadius: "8px", border: "1px solid #cbd5e1", fontSize: "13px", outline: "none", resize: "vertical", width: "100%", boxSizing: "border-box" }} />
              </div>
              <div style={{ display: "flex", justifyContent: "flex-end", gap: "10px", marginTop: "4px" }}>
                <button type="button" onClick={() => setUploadModal(null)} style={{ padding: "9px 16px", borderRadius: "8px", border: "1px solid #cbd5e1", backgroundColor: "#ffffff", color: "#334155", fontSize: "12.5px", fontWeight: "600", cursor: "pointer" }}>Cancel</button>
                <button type="submit" disabled={isUploading} style={{ display: "inline-flex", alignItems: "center", padding: "9px 18px", borderRadius: "8px", color: "#ffffff", border: "none", fontSize: "12.5px", fontWeight: "600", cursor: "pointer", backgroundColor: uploadModal.deliverable.status === "rejected" ? "#b91c1c" : uploadModal.deliverable.status === "revision_requested" ? "#b45309" : accent }}>
                  {isUploading ? "Submitting..." : <><Send size={13} style={{ marginRight: 6 }} />Send to Brand for Review</>}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
