import { useState, useEffect } from "react";
import {
  X,
  Layers,
  CheckCircle2,
  AlertCircle,
} from "lucide-react";

const PLATFORM_OPTIONS = [
  "YouTube",
  "Instagram",
  "TikTok",
  "Twitch",
  "X / Twitter",
  "LinkedIn",
  "Podcast / Audio",
];

const OBJECTIVES = [
  { id: "Awareness", label: "Awareness", desc: "Maximize reach & brand exposure" },
  { id: "Engagement", label: "Engagement", desc: "High community interactions & shares" },
  { id: "Traffic", label: "Traffic", desc: "Drive qualified visitors to web apps" },
  { id: "Leads", label: "Leads", desc: "Acquire business inquiries & signups" },
  { id: "Sales", label: "Sales", desc: "Direct product conversions & coupon sales" },
];

const SAMPLE_PRESET_IMAGES = [
  { label: "Tech SaaS & Cloud", url: "https://images.unsplash.com/photo-1460925895917-afdab827c52f?w=600&auto=format&fit=crop&q=80" },
  { label: "Productivity & Setup", url: "https://images.unsplash.com/photo-1531403009284-440f080d1e12?w=600&auto=format&fit=crop&q=80" },
  { label: "AI & Innovation", url: "https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe?w=600&auto=format&fit=crop&q=80" },
  { label: "Global Brand Launch", url: "https://images.unsplash.com/photo-1551836022-d5d88e9218df?w=600&auto=format&fit=crop&q=80" },
];

export default function CampaignFormModal({
  isOpen,
  onClose,
  onSubmit,
  campaignToEdit = null,
  theme,
}) {
  const accent = theme?.accent || "#0284c7";

  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [objective, setObjective] = useState("Awareness");
  const [budget, setBudget] = useState("25000");
  const [currency, setCurrency] = useState("USD");
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");
  const [targetNiche, setTargetNiche] = useState("Tech & Software Engineering");
  const [targetPlatforms, setTargetPlatforms] = useState(["YouTube", "Instagram"]);
  const [requirements, setRequirements] = useState("");
  const [deliverableRequirements, setDeliverableRequirements] = useState("");
  const [imageUrl, setImageUrl] = useState("");
  const [status, setStatus] = useState("draft");

  const [errors, setErrors] = useState({});
  const [submitting, setSubmitting] = useState(false);

  // Populate form if editing
  useEffect(() => {
    if (campaignToEdit) {
      setName(campaignToEdit.name || "");
      setDescription(campaignToEdit.description || "");
      setObjective(campaignToEdit.objective || "Awareness");
      setBudget(String(campaignToEdit.budget || ""));
      setCurrency(campaignToEdit.currency || "USD");
      setStartDate(campaignToEdit.startDate || "");
      setEndDate(campaignToEdit.endDate || "");
      setTargetNiche(campaignToEdit.targetNiche || "");
      setTargetPlatforms(campaignToEdit.targetPlatforms || ["YouTube"]);
      setRequirements(campaignToEdit.requirements || "");
      setDeliverableRequirements(campaignToEdit.deliverableRequirements || "");
      setImageUrl(campaignToEdit.imageUrl || "");
      setStatus(campaignToEdit.status || "draft");
    } else {
      // Defaults for new campaign
      const today = new Date();
      const in30Days = new Date();
      in30Days.setDate(today.getDate() + 45);

      setName("");
      setDescription("");
      setObjective("Awareness");
      setBudget("25000");
      setCurrency("USD");
      setStartDate(today.toISOString().split("T")[0]);
      setEndDate(in30Days.toISOString().split("T")[0]);
      setTargetNiche("Tech & Software Engineering");
      setTargetPlatforms(["YouTube", "Instagram"]);
      setRequirements("Must include product review walkthrough, UTM affiliate link in video description, and mention key feature highlights.");
      setDeliverableRequirements("1x Dedicated long-form integration (60s mid-roll) + 1x Short viral clip (30s).");
      setImageUrl(SAMPLE_PRESET_IMAGES[0].url);
      setStatus("draft");
    }
    setErrors({});
  }, [campaignToEdit, isOpen]);

  if (!isOpen) return null;

  const togglePlatform = (p) => {
    if (targetPlatforms.includes(p)) {
      if (targetPlatforms.length > 1) {
        setTargetPlatforms(targetPlatforms.filter((item) => item !== p));
      }
    } else {
      setTargetPlatforms([...targetPlatforms, p]);
    }
  };

  const validate = () => {
    const errs = {};
    if (!name.trim()) errs.name = "Campaign name is required.";
    if (!budget || isNaN(Number(budget)) || Number(budget) <= 0) {
      errs.budget = "Please specify a positive budget amount.";
    }
    if (!startDate) errs.startDate = "Start date is required.";
    if (!endDate) errs.endDate = "End date is required.";
    if (startDate && endDate && new Date(endDate) < new Date(startDate)) {
      errs.endDate = "End date must be on or after start date.";
    }
    if (!targetNiche.trim()) errs.targetNiche = "Target niche/category is required.";
    if (targetPlatforms.length === 0) {
      errs.targetPlatforms = "Select at least one social platform.";
    }
    setErrors(errs);
    return Object.keys(errs).length === 0;
  };

  const handleSubmit = async (desiredStatus = null) => {
    if (!validate()) return;
    setSubmitting(true);

    try {
      const payload = {
        name: name.trim(),
        description: description.trim(),
        objective,
        budget: Number(budget),
        currency,
        startDate,
        endDate,
        targetNiche: targetNiche.trim(),
        targetPlatforms,
        requirements: requirements.trim(),
        deliverableRequirements: deliverableRequirements.trim(),
        imageUrl: imageUrl.trim() || SAMPLE_PRESET_IMAGES[0].url,
        status: desiredStatus || status,
      };

      await onSubmit(payload);
      onClose();
    } catch (err) {
      setErrors({ form: err.message || "Failed to save campaign." });
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div style={styles.overlay}>
      <div style={styles.modalCard}>
        {/* Header */}
        <div style={styles.modalHeader}>
          <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
            <div style={{ ...styles.iconBadge, backgroundColor: "#f0f9ff" }}>
              <Layers size={18} color={accent} />
            </div>
            <div>
              <h3 style={styles.modalTitle}>
                {campaignToEdit ? "Edit Campaign" : "Create New Marketing Campaign"}
              </h3>
              <p style={styles.modalSubtitle}>
                Define campaign goals, budget, deliverables, and targeted creator criteria.
              </p>
            </div>
          </div>
          <button onClick={onClose} style={styles.closeBtn}>
            <X size={18} />
          </button>
        </div>

        {/* Global form error */}
        {errors.form && (
          <div style={styles.globalError}>
            <AlertCircle size={16} color="#dc2626" />
            <span>{errors.form}</span>
          </div>
        )}

        {/* Scrollable Body */}
        <div style={styles.modalBody}>
          {/* Campaign Name */}
          <div style={styles.formGroup}>
            <label style={styles.label}>
              Campaign Name <span style={styles.req}>*</span>
            </label>
            <input
              type="text"
              placeholder="e.g. CreatorIQ 2026 Spring Launch Campaign"
              value={name}
              onChange={(e) => setName(e.target.value)}
              style={{
                ...styles.input,
                borderColor: errors.name ? "#dc2626" : "#cbd5e1",
              }}
            />
            {errors.name && <span style={styles.errText}>{errors.name}</span>}
          </div>

          {/* Description */}
          <div style={styles.formGroup}>
            <label style={styles.label}>Campaign Overview & Purpose</label>
            <textarea
              placeholder="Brief summary of what this campaign achieves and what key message creators will promote..."
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              rows={2}
              style={styles.textarea}
            />
          </div>

          {/* Objective Selection */}
          <div style={styles.formGroup}>
            <label style={styles.label}>
              Marketing Objective <span style={styles.req}>*</span>
            </label>
            <div style={styles.objectiveGrid}>
              {OBJECTIVES.map((obj) => {
                const isSelected = objective === obj.id;
                return (
                  <button
                    key={obj.id}
                    type="button"
                    onClick={() => setObjective(obj.id)}
                    style={{
                      ...styles.objCard,
                      borderColor: isSelected ? accent : "#e2e8f0",
                      backgroundColor: isSelected ? "#f0f9ff" : "#ffffff",
                    }}
                  >
                    <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
                      <span style={{ ...styles.objTitle, color: isSelected ? accent : "#0f172a" }}>
                        {obj.label}
                      </span>
                      {isSelected && <CheckCircle2 size={14} color={accent} />}
                    </div>
                    <span style={styles.objDesc}>{obj.desc}</span>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Budget & Currency */}
          <div style={styles.twoColRow}>
            <div style={{ flex: 2 }}>
              <label style={styles.label}>
                Campaign Budget <span style={styles.req}>*</span>
              </label>
              <div style={styles.inputPrefixWrap}>
                <span style={styles.inputPrefix}>$</span>
                <input
                  type="number"
                  min="1"
                  step="100"
                  placeholder="25000"
                  value={budget}
                  onChange={(e) => setBudget(e.target.value)}
                  style={{
                    ...styles.input,
                    paddingLeft: "26px",
                    borderColor: errors.budget ? "#dc2626" : "#cbd5e1",
                  }}
                />
              </div>
              {errors.budget && <span style={styles.errText}>{errors.budget}</span>}
            </div>

            <div style={{ flex: 1 }}>
              <label style={styles.label}>Currency</label>
              <select
                value={currency}
                onChange={(e) => setCurrency(e.target.value)}
                style={styles.select}
              >
                <option value="USD">USD ($)</option>
                <option value="EUR">EUR (€)</option>
                <option value="GBP">GBP (£)</option>
                <option value="CAD">CAD ($)</option>
              </select>
            </div>
          </div>

          {/* Start and End Dates */}
          <div style={styles.twoColRow}>
            <div style={{ flex: 1 }}>
              <label style={styles.label}>
                Start Date <span style={styles.req}>*</span>
              </label>
              <input
                type="date"
                value={startDate}
                onChange={(e) => setStartDate(e.target.value)}
                style={{
                  ...styles.input,
                  borderColor: errors.startDate ? "#dc2626" : "#cbd5e1",
                }}
              />
              {errors.startDate && <span style={styles.errText}>{errors.startDate}</span>}
            </div>

            <div style={{ flex: 1 }}>
              <label style={styles.label}>
                End Date <span style={styles.req}>*</span>
              </label>
              <input
                type="date"
                value={endDate}
                onChange={(e) => setEndDate(e.target.value)}
                style={{
                  ...styles.input,
                  borderColor: errors.endDate ? "#dc2626" : "#cbd5e1",
                }}
              />
              {errors.endDate && <span style={styles.errText}>{errors.endDate}</span>}
            </div>
          </div>

          {/* Target Audience & Niche */}
          <div style={styles.formGroup}>
            <label style={styles.label}>
              Target Audience Niche / Category <span style={styles.req}>*</span>
            </label>
            <input
              type="text"
              placeholder="e.g. Tech & Software Engineering, B2B SaaS, Gaming, Lifestyle"
              value={targetNiche}
              onChange={(e) => setTargetNiche(e.target.value)}
              style={{
                ...styles.input,
                borderColor: errors.targetNiche ? "#dc2626" : "#cbd5e1",
              }}
            />
            {errors.targetNiche && <span style={styles.errText}>{errors.targetNiche}</span>}
          </div>

          {/* Target Platforms */}
          <div style={styles.formGroup}>
            <label style={styles.label}>
              Target Platforms <span style={styles.req}>*</span>
            </label>
            <div style={styles.chipsWrap}>
              {PLATFORM_OPTIONS.map((plat) => {
                const isSelected = targetPlatforms.includes(plat);
                return (
                  <button
                    key={plat}
                    type="button"
                    onClick={() => togglePlatform(plat)}
                    style={{
                      ...styles.platChip,
                      backgroundColor: isSelected ? accent : "#f1f5f9",
                      color: isSelected ? "#ffffff" : "#475569",
                      borderColor: isSelected ? accent : "#cbd5e1",
                    }}
                  >
                    {plat} {isSelected ? "✓" : "+"}
                  </button>
                );
              })}
            </div>
            {errors.targetPlatforms && <span style={styles.errText}>{errors.targetPlatforms}</span>}
          </div>

          {/* Campaign Requirements */}
          <div style={styles.formGroup}>
            <label style={styles.label}>Campaign Requirements & Talking Points</label>
            <textarea
              placeholder="Specify requirements: e.g. Show UI live, mention referral code, include link in top 3 lines of video description, avoid competitor mentions..."
              value={requirements}
              onChange={(e) => setRequirements(e.target.value)}
              rows={3}
              style={styles.textarea}
            />
          </div>

          {/* Deliverable Requirements */}
          <div style={styles.formGroup}>
            <label style={styles.label}>Deliverable Expectations</label>
            <textarea
              placeholder="Expected content pieces per creator: e.g. 1x 60s mid-roll YouTube video, 1x TikTok vertical short, 1x Instagram story series..."
              value={deliverableRequirements}
              onChange={(e) => setDeliverableRequirements(e.target.value)}
              rows={2}
              style={styles.textarea}
            />
          </div>

          {/* Campaign Image / Brief Banner */}
          <div style={styles.formGroup}>
            <label style={styles.label}>Campaign Image or Brief Banner (URL)</label>
            <input
              type="url"
              placeholder="https://example.com/campaign-banner.jpg"
              value={imageUrl}
              onChange={(e) => setImageUrl(e.target.value)}
              style={styles.input}
            />
            <div style={styles.presetRow}>
              <span style={styles.presetLabel}>Select Preset:</span>
              {SAMPLE_PRESET_IMAGES.map((preset, idx) => (
                <button
                  key={idx}
                  type="button"
                  onClick={() => setImageUrl(preset.url)}
                  style={{
                    ...styles.presetBtn,
                    borderColor: imageUrl === preset.url ? accent : "#e2e8f0",
                    color: imageUrl === preset.url ? accent : "#475569",
                  }}
                >
                  {preset.label}
                </button>
              ))}
            </div>
            {imageUrl && (
              <div style={styles.previewBox}>
                <span style={styles.previewLabel}>Banner Preview:</span>
                <img
                  src={imageUrl}
                  alt="Preview"
                  style={styles.previewImg}
                  onError={(e) => {
                    e.target.style.display = "none";
                  }}
                />
              </div>
            )}
          </div>
        </div>

        {/* Modal Footer with Actions */}
        <div style={styles.modalFooter}>
          <button
            type="button"
            onClick={onClose}
            disabled={submitting}
            style={styles.cancelBtn}
          >
            Cancel
          </button>

          <div style={{ display: "flex", gap: "10px" }}>
            <button
              type="button"
              disabled={submitting}
              onClick={() => handleSubmit("draft")}
              style={styles.draftBtn}
            >
              Save as Draft
            </button>

            <button
              type="button"
              disabled={submitting}
              onClick={() => handleSubmit("active")}
              style={{ ...styles.publishBtn, backgroundColor: accent }}
            >
              {submitting ? "Saving..." : campaignToEdit ? "Update Campaign" : "Launch & Activate"}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

const styles = {
  overlay: {
    position: "fixed",
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: "rgba(15, 23, 42, 0.5)",
    backdropFilter: "blur(3px)",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    zIndex: 1000,
    padding: "20px",
  },
  modalCard: {
    backgroundColor: "#ffffff",
    borderRadius: "16px",
    maxWidth: "680px",
    width: "100%",
    maxHeight: "90vh",
    display: "flex",
    flexDirection: "column",
    boxShadow: "0 25px 50px -12px rgba(0, 0, 0, 0.25)",
    overflow: "hidden",
  },
  modalHeader: {
    padding: "20px 24px",
    borderBottom: "1px solid #e2e8f0",
    display: "flex",
    justifyContent: "space-between",
    alignItems: "center",
  },
  iconBadge: {
    width: "38px",
    height: "38px",
    borderRadius: "10px",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    border: "1px solid #bae6fd",
  },
  modalTitle: {
    fontSize: "17px",
    fontWeight: "700",
    color: "#0f172a",
  },
  modalSubtitle: {
    fontSize: "12px",
    color: "#64748b",
    marginTop: "2px",
  },
  closeBtn: {
    background: "none",
    border: "none",
    color: "#64748b",
    cursor: "pointer",
    padding: "4px",
    borderRadius: "6px",
  },
  globalError: {
    backgroundColor: "#fef2f2",
    borderBottom: "1px solid #fecaca",
    color: "#b91c1c",
    padding: "10px 24px",
    fontSize: "12.5px",
    display: "flex",
    alignItems: "center",
    gap: "8px",
  },
  modalBody: {
    padding: "20px 24px",
    overflowY: "auto",
    display: "flex",
    flexDirection: "column",
    gap: "18px",
  },
  formGroup: {
    display: "flex",
    flexDirection: "column",
    gap: "6px",
  },
  twoColRow: {
    display: "flex",
    gap: "14px",
    flexWrap: "wrap",
  },
  label: {
    fontSize: "12.5px",
    fontWeight: "600",
    color: "#334155",
  },
  req: {
    color: "#dc2626",
  },
  input: {
    width: "100%",
    padding: "9px 12px",
    borderRadius: "8px",
    border: "1px solid #cbd5e1",
    fontSize: "13px",
    color: "#0f172a",
    outline: "none",
    boxSizing: "border-box",
  },
  inputPrefixWrap: {
    position: "relative",
    width: "100%",
  },
  inputPrefix: {
    position: "absolute",
    left: "10px",
    top: "50%",
    transform: "translateY(-50%)",
    color: "#64748b",
    fontWeight: "600",
    fontSize: "13px",
  },
  textarea: {
    width: "100%",
    padding: "9px 12px",
    borderRadius: "8px",
    border: "1px solid #cbd5e1",
    fontSize: "13px",
    color: "#0f172a",
    outline: "none",
    boxSizing: "border-box",
    fontFamily: "inherit",
  },
  select: {
    width: "100%",
    padding: "9px 12px",
    borderRadius: "8px",
    border: "1px solid #cbd5e1",
    fontSize: "13px",
    color: "#0f172a",
    backgroundColor: "#ffffff",
    outline: "none",
    boxSizing: "border-box",
  },
  objectiveGrid: {
    display: "grid",
    gridTemplateColumns: "repeat(auto-fit, minmax(110px, 1fr))",
    gap: "8px",
  },
  objCard: {
    padding: "10px 12px",
    borderRadius: "8px",
    border: "1px solid #e2e8f0",
    textAlign: "left",
    cursor: "pointer",
    transition: "all 0.15s ease",
  },
  objTitle: {
    fontSize: "12.5px",
    fontWeight: "700",
  },
  objDesc: {
    fontSize: "10.5px",
    color: "#64748b",
    display: "block",
    marginTop: "2px",
    lineHeight: "1.3",
  },
  chipsWrap: {
    display: "flex",
    gap: "6px",
    flexWrap: "wrap",
  },
  platChip: {
    padding: "6px 12px",
    borderRadius: "20px",
    border: "1px solid",
    fontSize: "12px",
    fontWeight: "600",
    cursor: "pointer",
    transition: "all 0.15s ease",
  },
  presetRow: {
    display: "flex",
    alignItems: "center",
    gap: "6px",
    flexWrap: "wrap",
    marginTop: "6px",
  },
  presetLabel: {
    fontSize: "11px",
    color: "#64748b",
    fontWeight: "600",
  },
  presetBtn: {
    padding: "3px 8px",
    borderRadius: "6px",
    border: "1px solid",
    backgroundColor: "#ffffff",
    fontSize: "11px",
    cursor: "pointer",
  },
  previewBox: {
    marginTop: "8px",
  },
  previewLabel: {
    fontSize: "11px",
    color: "#64748b",
    display: "block",
    marginBottom: "4px",
  },
  previewImg: {
    width: "100%",
    height: "120px",
    objectFit: "cover",
    borderRadius: "8px",
    border: "1px solid #e2e8f0",
  },
  errText: {
    fontSize: "11.5px",
    color: "#dc2626",
    marginTop: "2px",
  },
  modalFooter: {
    padding: "16px 24px",
    borderTop: "1px solid #e2e8f0",
    backgroundColor: "#f8fafc",
    display: "flex",
    justifyContent: "space-between",
    alignItems: "center",
  },
  cancelBtn: {
    padding: "8px 16px",
    borderRadius: "8px",
    border: "1px solid #cbd5e1",
    backgroundColor: "#ffffff",
    fontSize: "13px",
    fontWeight: "600",
    color: "#475569",
    cursor: "pointer",
  },
  draftBtn: {
    padding: "8px 16px",
    borderRadius: "8px",
    border: "1px solid #cbd5e1",
    backgroundColor: "#ffffff",
    fontSize: "13px",
    fontWeight: "600",
    color: "#334155",
    cursor: "pointer",
  },
  publishBtn: {
    padding: "8px 18px",
    borderRadius: "8px",
    border: "none",
    color: "#ffffff",
    fontSize: "13px",
    fontWeight: "600",
    cursor: "pointer",
    boxShadow: "0 2px 6px rgba(15, 23, 42, 0.12)",
  },
};
