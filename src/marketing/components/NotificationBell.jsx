import { useState, useEffect, useRef, useCallback } from "react";
import {
  Bell,
  CheckCheck,
  Send,
  CheckSquare,
} from "lucide-react";
import {
  getLocalNotifications,
  markNotificationRead,
  markAllNotificationsRead,
  subscribeToDataChanges,
} from "../campaignService";

function getFilteredNotifications(email, uid, role) {
  const list = getLocalNotifications();
  return list.filter((n) => {
    if (role === "Marketing Team" && n.recipientRole === "Marketing Team") return true;
    if (role === "Creator") {
      if (n.recipientId && n.recipientId === uid) return true;
      if (n.recipientEmail && n.recipientEmail.toLowerCase() === email) return true;
      return false;
    }
    return false;
  });
}

export default function NotificationBell({
  currentUser,
  role = "Marketing Team",
  theme,
}) {
  const accent = theme?.accent || "#0284c7";
  const [isOpen, setIsOpen] = useState(false);
  const userEmail = currentUser?.email?.toLowerCase();
  const userId = currentUser?.uid;

  const [notifications, setNotifications] = useState(() =>
    getFilteredNotifications(userEmail, userId, role)
  );
  const dropdownRef = useRef(null);

  const refreshNotifications = useCallback(() => {
    setNotifications(getFilteredNotifications(userEmail, userId, role));
  }, [userEmail, userId, role]);

  useEffect(() => {
    const unsubscribe = subscribeToDataChanges((detail) => {
      if (
        detail.entityType === "notifications" ||
        detail.entityType === "invitations" ||
        detail.entityType === "deliverables"
      ) {
        refreshNotifications();
      }
    });

    const handleClickOutside = (e) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target)) {
        setIsOpen(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);

    return () => {
      unsubscribe();
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, [refreshNotifications]);

  const unreadCount = notifications.filter((n) => !n.read).length;

  const handleMarkAsRead = (id) => {
    markNotificationRead(id);
    refreshNotifications();
  };

  const handleMarkAllRead = () => {
    markAllNotificationsRead(userEmail);
    refreshNotifications();
  };

  return (
    <div style={styles.container} ref={dropdownRef}>
      <button
        onClick={() => setIsOpen(!isOpen)}
        style={{
          ...styles.bellBtn,
          backgroundColor: isOpen ? "#f1f5f9" : "transparent",
        }}
        title="View Real-time Notifications"
      >
        <Bell size={18} color="#475569" />
        {unreadCount > 0 && (
          <span style={{ ...styles.badge, backgroundColor: accent }}>
            {unreadCount > 9 ? "9+" : unreadCount}
          </span>
        )}
      </button>

      {isOpen && (
        <div style={styles.dropdown}>
          <div style={styles.header}>
            <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
              <span style={styles.headerTitle}>Live Notifications</span>
              {unreadCount > 0 && (
                <span style={{ ...styles.unreadPill, color: accent, backgroundColor: "#f0f9ff" }}>
                  {unreadCount} New
                </span>
              )}
            </div>

            {unreadCount > 0 && (
              <button onClick={handleMarkAllRead} style={styles.markAllBtn}>
                <CheckCheck size={12} style={{ marginRight: 4 }} />
                Mark all read
              </button>
            )}
          </div>

          <div style={styles.list}>
            {notifications.length === 0 ? (
              <div style={styles.empty}>
                <Bell size={24} color="#94a3b8" />
                <span style={styles.emptyText}>No notifications yet</span>
              </div>
            ) : (
              notifications.map((n) => (
                <div
                  key={n.id}
                  onClick={() => !n.read && handleMarkAsRead(n.id)}
                  style={{
                    ...styles.item,
                    backgroundColor: n.read ? "#ffffff" : "#f0f9ff",
                  }}
                >
                  <div style={styles.itemIcon}>
                    {n.type?.includes("invitation") ? (
                      <Send size={14} color="#0284c7" />
                    ) : (
                      <CheckSquare size={14} color="#15803d" />
                    )}
                  </div>
                  <div style={{ flex: 1 }}>
                    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
                      <span style={styles.itemTitle}>{n.title}</span>
                      <span style={styles.itemTime}>
                        {formatRelativeTime(n.createdAt)}
                      </span>
                    </div>
                    <p style={styles.itemMessage}>{n.message}</p>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      )}
    </div>
  );
}

function formatRelativeTime(isoString) {
  if (!isoString) return "";
  const diff = Date.now() - new Date(isoString).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return "Just now";
  if (mins < 60) return `${mins}m ago`;
  const hours = Math.floor(mins / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  return `${days}d ago`;
}

const styles = {
  container: {
    position: "relative",
    display: "inline-block",
  },
  bellBtn: {
    position: "relative",
    width: "36px",
    height: "36px",
    borderRadius: "8px",
    border: "1px solid #e2e8f0",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    cursor: "pointer",
    transition: "all 0.15s ease",
  },
  badge: {
    position: "absolute",
    top: "-3px",
    right: "-3px",
    width: "18px",
    height: "18px",
    borderRadius: "50%",
    color: "#ffffff",
    fontSize: "10px",
    fontWeight: "700",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    border: "2px solid #ffffff",
  },
  dropdown: {
    position: "absolute",
    top: "44px",
    right: 0,
    width: "340px",
    backgroundColor: "#ffffff",
    borderRadius: "14px",
    border: "1px solid #e2e8f0",
    boxShadow: "0 10px 25px -5px rgba(0, 0, 0, 0.1)",
    zIndex: 100,
    overflow: "hidden",
  },
  header: {
    padding: "12px 16px",
    borderBottom: "1px solid #e2e8f0",
    display: "flex",
    justifyContent: "space-between",
    alignItems: "center",
  },
  headerTitle: {
    fontSize: "13px",
    fontWeight: "700",
    color: "#0f172a",
  },
  unreadPill: {
    fontSize: "11px",
    fontWeight: "700",
    padding: "2px 6px",
    borderRadius: "6px",
  },
  markAllBtn: {
    background: "none",
    border: "none",
    fontSize: "11px",
    fontWeight: "600",
    color: "#64748b",
    cursor: "pointer",
    display: "inline-flex",
    alignItems: "center",
  },
  list: {
    maxHeight: "360px",
    overflowY: "auto",
  },
  item: {
    padding: "12px 16px",
    borderBottom: "1px solid #f1f5f9",
    display: "flex",
    gap: "10px",
    cursor: "pointer",
    transition: "background-color 0.15s ease",
  },
  itemIcon: {
    width: "28px",
    height: "28px",
    borderRadius: "6px",
    backgroundColor: "#ffffff",
    border: "1px solid #e2e8f0",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    flexShrink: 0,
    marginTop: "2px",
  },
  itemTitle: {
    fontSize: "12.5px",
    fontWeight: "700",
    color: "#0f172a",
  },
  itemTime: {
    fontSize: "10.5px",
    color: "#94a3b8",
  },
  itemMessage: {
    fontSize: "12px",
    color: "#475569",
    marginTop: "2px",
    lineHeight: "1.4",
  },
  empty: {
    padding: "36px 16px",
    textAlign: "center",
    display: "flex",
    flexDirection: "column",
    alignItems: "center",
    gap: "8px",
  },
  emptyText: {
    fontSize: "12.5px",
    color: "#64748b",
  },
};
