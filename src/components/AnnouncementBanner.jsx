import React, { useState, useEffect, useCallback } from "react";
import { Megaphone, AlertTriangle, AlertCircle, X, ShieldAlert } from "lucide-react";
import { fetchActiveAnnouncementsForRole } from "../admin/announcementService";
import { subscribeToDataChanges } from "../marketing/campaignService";

const STORAGE_KEY_DISMISSED = "creatoriq_dismissed_announcements";

function getDismissedIds() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY_DISMISSED);
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
}

function addDismissedId(id) {
  try {
    const dismissed = getDismissedIds();
    if (!dismissed.includes(id)) {
      dismissed.push(id);
      localStorage.setItem(STORAGE_KEY_DISMISSED, JSON.stringify(dismissed));
    }
  } catch (err) {
    console.warn("Could not save announcement dismissal:", err);
  }
}

/**
 * Platform Announcement Banner
 * Safely displays admin broadcast messages to authenticated users.
 * Automatically respects user dismissals across browser reloads.
 */
export default function AnnouncementBanner({ userRole = "all" }) {
  const [announcements, setAnnouncements] = useState([]);
  const [dismissedMap, setDismissedMap] = useState(() => new Set(getDismissedIds()));

  const loadAnnouncements = useCallback(async () => {
    try {
      const active = await fetchActiveAnnouncementsForRole(userRole);
      setAnnouncements(active);
    } catch (err) {
      console.warn("[AnnouncementBanner] Could not load announcements:", err);
    }
  }, [userRole]);

  useEffect(() => {
    loadAnnouncements();

    // Listen to real-time administrative broadcast changes
    const unsubscribe = subscribeToDataChanges((event) => {
      if (event?.detail?.entity === "announcements") {
        loadAnnouncements();
      }
    });

    return () => {
      if (unsubscribe) unsubscribe();
    };
  }, [loadAnnouncements]);

  const visibleAnnouncements = announcements.filter(
    (a) => !dismissedMap.has(a.id)
  );

  if (visibleAnnouncements.length === 0) return null;

  const current = visibleAnnouncements[0];

  const handleDismiss = (id) => {
    addDismissedId(id);
    setDismissedMap((prev) => new Set([...prev, id]));
  };

  const getPriorityTheme = (priority) => {
    switch (priority) {
      case "critical":
        return {
          bg: "#fef2f2",
          border: "#fecaca",
          text: "#991b1b",
          badgeBg: "#dc2626",
          badgeText: "#ffffff",
          icon: ShieldAlert,
          iconColor: "#dc2626",
          label: "URGENT SYSTEM NOTICE",
        };
      case "warning":
        return {
          bg: "#fffbeb",
          border: "#fde68a",
          text: "#92400e",
          badgeBg: "#d97706",
          badgeText: "#ffffff",
          icon: AlertTriangle,
          iconColor: "#d97706",
          label: "PLATFORM NOTICE",
        };
      case "info":
      default:
        return {
          bg: "#eff6ff",
          border: "#bfdbfe",
          text: "#1e40af",
          badgeBg: "#2563eb",
          badgeText: "#ffffff",
          icon: Megaphone,
          iconColor: "#2563eb",
          label: "PLATFORM ANNOUNCEMENT",
        };
    }
  };

  const currentTheme = getPriorityTheme(current.priority);
  const Icon = currentTheme.icon;

  return (
    <div
      style={{
        ...styles.container,
        backgroundColor: currentTheme.bg,
        borderBottom: `1px solid ${currentTheme.border}`,
        color: currentTheme.text,
      }}
      role="region"
      aria-label="Platform Announcement"
    >
      <div style={styles.contentWrap}>
        <div style={styles.leftCol}>
          <div style={{ ...styles.iconBadge, backgroundColor: "rgba(255, 255, 255, 0.8)" }}>
            <Icon size={16} color={currentTheme.iconColor} />
          </div>
          <span
            style={{
              ...styles.priorityBadge,
              backgroundColor: currentTheme.badgeBg,
              color: currentTheme.badgeText,
            }}
          >
            {currentTheme.label}
          </span>
          {visibleAnnouncements.length > 1 && (
            <span style={styles.countBadge}>
              1 of {visibleAnnouncements.length}
            </span>
          )}
        </div>

        <div style={styles.messageCol}>
          <strong style={styles.titleText}>{current.title}</strong>
          <span style={styles.sepDot}>•</span>
          <span style={styles.bodyText}>{current.message}</span>
        </div>

        <button
          onClick={() => handleDismiss(current.id)}
          style={styles.dismissBtn}
          title="Dismiss announcement"
          aria-label="Dismiss announcement"
        >
          <X size={15} color={currentTheme.text} />
        </button>
      </div>
    </div>
  );
}

const styles = {
  container: {
    width: "100%",
    padding: "10px 24px",
    boxSizing: "border-box",
    transition: "all 0.2s ease-in-out",
    zIndex: 40,
    boxShadow: "0 1px 3px rgba(0, 0, 0, 0.04)",
  },
  contentWrap: {
    maxWidth: "1400px",
    margin: "0 auto",
    display: "flex",
    alignItems: "center",
    justifyContent: "space-between",
    gap: "16px",
    flexWrap: "wrap",
  },
  leftCol: {
    display: "flex",
    alignItems: "center",
    gap: "8px",
    flexShrink: 0,
  },
  iconBadge: {
    width: "28px",
    height: "28px",
    borderRadius: "6px",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
  },
  priorityBadge: {
    fontSize: "10px",
    fontWeight: 700,
    letterSpacing: "0.05em",
    padding: "2px 8px",
    borderRadius: "4px",
    textTransform: "uppercase",
  },
  countBadge: {
    fontSize: "11px",
    fontWeight: 600,
    color: "#64748b",
    backgroundColor: "rgba(255, 255, 255, 0.6)",
    padding: "2px 6px",
    borderRadius: "4px",
  },
  messageCol: {
    flex: 1,
    minWidth: "260px",
    display: "flex",
    alignItems: "center",
    gap: "8px",
    fontSize: "13px",
    lineHeight: "1.4",
  },
  titleText: {
    fontWeight: 700,
  },
  sepDot: {
    opacity: 0.5,
  },
  bodyText: {
    fontWeight: 400,
    opacity: 0.95,
  },
  dismissBtn: {
    background: "transparent",
    border: "none",
    cursor: "pointer",
    padding: "4px",
    borderRadius: "4px",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    opacity: 0.75,
    transition: "opacity 0.15s ease",
    ":hover": {
      opacity: 1,
    },
  },
};
