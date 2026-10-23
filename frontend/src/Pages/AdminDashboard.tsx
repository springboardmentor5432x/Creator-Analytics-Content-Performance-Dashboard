import { useMemo, useState } from "react";
import {
  Activity,
  ArrowDownRight,
  ArrowUpRight,
  Bell,
  Check,
  ChevronDown,
  CircleHelp,
  Download,
  Ellipsis,
  Eye,
  Filter,
  LayoutDashboard,
  Search,
  Settings,
  ShieldCheck,
  ShieldAlert,
  UserCheck,
  UserPlus,
  Users,
  X,
  Megaphone,
  Clock3,
  Server,
  FileText,
} from "lucide-react";
import "./AdminDashboard.css";

type UserRole = "Creator" | "Agency" | "Marketing Team";
type UserStatus = "Active" | "Pending" | "Suspended";

type PlatformUser = {
  id: number;
  name: string;
  email: string;
  role: UserRole;
  status: UserStatus;
  joined: string;
  initials: string;
};

const initialUsers: PlatformUser[] = [
  {
    id: 1,
    name: "Ananya Menon",
    email: "ananya@example.com",
    role: "Creator",
    status: "Active",
    joined: "Oct 21, 2026",
    initials: "AM",
  },
  {
    id: 2,
    name: "BrightSide Media",
    email: "hello@brightside.demo",
    role: "Agency",
    status: "Active",
    joined: "Oct 20, 2026",
    initials: "BM",
  },
  {
    id: 3,
    name: "Riya Sharma",
    email: "riya@example.com",
    role: "Creator",
    status: "Pending",
    joined: "Oct 19, 2026",
    initials: "RS",
  },
  {
    id: 4,
    name: "Marketing Operations",
    email: "marketing@creatoriq.demo",
    role: "Marketing Team",
    status: "Active",
    joined: "Oct 18, 2026",
    initials: "MO",
  },
  {
    id: 5,
    name: "Nova Creators",
    email: "team@novacreators.demo",
    role: "Agency",
    status: "Suspended",
    joined: "Oct 17, 2026",
    initials: "NC",
  },
  {
    id: 6,
    name: "Arjun Nair",
    email: "arjun@example.com",
    role: "Creator",
    status: "Active",
    joined: "Oct 16, 2026",
    initials: "AN",
  },
  {
    id: 7,
    name: "Pixel Reach Agency",
    email: "team@pixelreach.demo",
    role: "Agency",
    status: "Pending",
    joined: "Oct 15, 2026",
    initials: "PR",
  },
];

const adminActivities = [
  {
    title: "New creator registered",
    detail: "Ananya Menon created a creator account",
    time: "12 minutes ago",
    type: "user",
  },
  {
    title: "Agency account approved",
    detail: "BrightSide Media is now active",
    time: "38 minutes ago",
    type: "success",
  },
  {
    title: "Campaign activity detected",
    detail: "Summer Essentials received new engagement",
    time: "1 hour ago",
    type: "campaign",
  },
  {
    title: "Security review completed",
    detail: "Routine account review finished",
    time: "3 hours ago",
    type: "security",
  },
];

function AdminDashboard() {
  const [users, setUsers] = useState<PlatformUser[]>(initialUsers);
  const [activeNav, setActiveNav] = useState("Overview");
  const [searchTerm, setSearchTerm] = useState("");
  const [roleFilter, setRoleFilter] = useState("All roles");
  const [statusFilter, setStatusFilter] = useState("All statuses");
  const [selectedUser, setSelectedUser] = useState<PlatformUser | null>(
    null,
  );
  const [notificationOpen, setNotificationOpen] = useState(false);
  const [notice, setNotice] = useState("");
  const [showActivity, setShowActivity] = useState(false);

  const filteredUsers = useMemo(() => {
    return users.filter((user) => {
      const query = searchTerm.toLowerCase();

      const matchesSearch =
        user.name.toLowerCase().includes(query) ||
        user.email.toLowerCase().includes(query);

      const matchesRole =
        roleFilter === "All roles" || user.role === roleFilter;

      const matchesStatus =
        statusFilter === "All statuses" || user.status === statusFilter;

      const matchesSection =
        activeNav === "Creators"
          ? user.role === "Creator"
          : activeNav === "Agencies"
            ? user.role === "Agency"
            : activeNav === "Marketing Team"
              ? user.role === "Marketing Team"
              : activeNav === "Pending Approvals"
                ? user.status === "Pending"
                : activeNav === "Suspended Accounts"
                  ? user.status === "Suspended"
                  : true;

      return (
        matchesSearch &&
        matchesRole &&
        matchesStatus &&
        matchesSection
      );
    });
  }, [users, searchTerm, roleFilter, statusFilter, activeNav]);

  const activeUsers = users.filter(
    (user) => user.status === "Active",
  ).length;

  const pendingUsers = users.filter(
    (user) => user.status === "Pending",
  ).length;

  const suspendedUsers = users.filter(
    (user) => user.status === "Suspended",
  ).length;

  function updateUserStatus(
    userId: number,
    nextStatus: UserStatus,
  ) {
    const user = users.find((item) => item.id === userId);

    if (!user) return;

    setUsers((previousUsers) =>
      previousUsers.map((item) =>
        item.id === userId
          ? { ...item, status: nextStatus }
          : item,
      ),
    );

    setNotice(`${user.name}'s demo account is now ${nextStatus.toLowerCase()}.`);
    setSelectedUser(null);
  }

  function exportUsers() {
    const headers = [
      "Name",
      "Email",
      "Role",
      "Status",
      "Joined",
    ];

    const rows = filteredUsers.map((user) => [
      user.name,
      user.email,
      user.role,
      user.status,
      user.joined,
    ]);

    const csv = [headers, ...rows]
      .map((row) =>
        row
          .map((value) => `"${String(value).replace(/"/g, '""')}"`)
          .join(","),
      )
      .join("\n");

    const blob = new Blob([csv], {
      type: "text/csv;charset=utf-8;",
    });

    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");

    link.href = url;
    link.download = "creatoriq-admin-users.csv";
    link.click();

    URL.revokeObjectURL(url);
  }

  function selectNavigation(item: string) {
    setActiveNav(item);
    setNotice("");
  }

  return (
    <div className="admin-dashboard">
      <aside className="admin-sidebar">
        <div className="admin-brand">
          <div className="admin-brand-mark">C</div>
          <div>
            <h2>CreatorIQ</h2>
            <span>CREATOR INTELLIGENCE</span>
          </div>
        </div>

        <div className="admin-workspace">
          <div className="admin-workspace-icon">
            <ShieldCheck size={19} />
          </div>

          <div className="admin-workspace-info">
            <strong>Administration</strong>
            <span>Platform control</span>
          </div>

          <ChevronDown size={15} />
        </div>

        <p className="admin-nav-label">PLATFORM</p>

        <nav className="admin-navigation">
          <button
            className={`admin-nav-item ${
              activeNav === "Overview" ? "active" : ""
            }`}
            onClick={() => selectNavigation("Overview")}
          >
            <LayoutDashboard size={18} />
            <span>Overview</span>
          </button>

          <button
            className={`admin-nav-item ${
              activeNav === "All Users" ? "active" : ""
            }`}
            onClick={() => selectNavigation("All Users")}
          >
            <Users size={18} />
            <span>All users</span>
            <span className="admin-nav-count">{users.length}</span>
          </button>

          <button
            className={`admin-nav-item ${
              activeNav === "Creators" ? "active" : ""
            }`}
            onClick={() => selectNavigation("Creators")}
          >
            <UserCheck size={18} />
            <span>Creators</span>
          </button>

          <button
            className={`admin-nav-item ${
              activeNav === "Agencies" ? "active" : ""
            }`}
            onClick={() => selectNavigation("Agencies")}
          >
            <Users size={18} />
            <span>Agencies</span>
          </button>

          <button
            className={`admin-nav-item ${
              activeNav === "Marketing Team" ? "active" : ""
            }`}
            onClick={() => selectNavigation("Marketing Team")}
          >
            <Megaphone size={18} />
            <span>Marketing team</span>
          </button>

          <p className="admin-nav-label admin-nav-label-spaced">
            MODERATION
          </p>

          <button
            className={`admin-nav-item ${
              activeNav === "Pending Approvals" ? "active" : ""
            }`}
            onClick={() => selectNavigation("Pending Approvals")}
          >
            <Clock3 size={18} />
            <span>Pending approvals</span>
            {pendingUsers > 0 && (
              <span className="admin-nav-count">{pendingUsers}</span>
            )}
          </button>

          <button
            className={`admin-nav-item ${
              activeNav === "Suspended Accounts" ? "active" : ""
            }`}
            onClick={() => selectNavigation("Suspended Accounts")}
          >
            <ShieldAlert size={18} />
            <span>Suspended accounts</span>
          </button>

          <p className="admin-nav-label admin-nav-label-spaced">
            SYSTEM
          </p>

          <button
            className={`admin-nav-item ${
              activeNav === "System Activity" ? "active" : ""
            }`}
            onClick={() => selectNavigation("System Activity")}
          >
            <Activity size={18} />
            <span>System activity</span>
          </button>

          <button
            className={`admin-nav-item ${
              activeNav === "Settings" ? "active" : ""
            }`}
            onClick={() => selectNavigation("Settings")}
          >
            <Settings size={18} />
            <span>Settings</span>
          </button>
        </nav>

        <div className="admin-sidebar-bottom">
          <div className="admin-security-card">
            <div className="admin-security-icon">
              <ShieldCheck size={20} />
            </div>
            <strong>Platform security</strong>
            <p>Review access and keep account permissions up to date.</p>
            <span>
              <i></i> Demo monitoring
            </span>
          </div>

          <div className="admin-profile">
            <div className="admin-avatar admin-avatar-lime">AD</div>
            <div className="admin-profile-info">
              <strong>Platform Admin</strong>
              <span>admin@creatoriq.demo</span>
            </div>
            <ChevronDown size={15} />
          </div>
        </div>
      </aside>

      <main className="admin-main">
        <header className="admin-topbar">
          <div className="admin-breadcrumb">
            Administration <span>/</span> <strong>{activeNav}</strong>
          </div>

          <div className="admin-topbar-actions">
            <div className="admin-demo-label">
              <span></span> Demo environment
            </div>

            <button
              className="admin-icon-button"
              aria-label="Notifications"
              onClick={() => setNotificationOpen(!notificationOpen)}
            >
              <Bell size={18} />
              <i></i>
            </button>

            <div className="admin-avatar admin-avatar-lime">AD</div>
          </div>

          {notificationOpen && (
            <div className="admin-notification-panel">
              <div className="admin-notification-heading">
                <strong>Notifications</strong>
                <span>Recent updates</span>
              </div>

              {adminActivities.slice(0, 3).map((activity) => (
                <div
                  className="admin-notification-item"
                  key={activity.title}
                >
                  <span></span>
                  <div>
                    <strong>{activity.title}</strong>
                    <p>{activity.time}</p>
                  </div>
                </div>
              ))}
            </div>
          )}
        </header>

        <div className="admin-content">
          <section className="admin-welcome">
            <div>
              <div className="admin-eyebrow">
                <span></span> PLATFORM ADMINISTRATION
              </div>

              <h1>
                Everything in
                <br />
                <span>good hands.</span>
              </h1>

              <p>
                Monitor your CreatorIQ workspace, manage accounts, and
                keep your creator ecosystem organized.
              </p>
            </div>

            <div className="admin-welcome-actions">
              <button
                className="admin-button-secondary"
                onClick={exportUsers}
              >
                <Download size={16} />
                Export users
              </button>

              <button
                className="admin-button-primary"
                onClick={() => selectNavigation("All Users")}
              >
                <Users size={16} />
                Manage users
              </button>
            </div>
          </section>

          {notice && (
            <div className="admin-success-notice">
              <Check size={17} />
              <span>{notice}</span>
              <button
                onClick={() => setNotice("")}
                aria-label="Dismiss notification"
              >
                <X size={16} />
              </button>
            </div>
          )}

          {activeNav === "Overview" && (
            <>
              <section className="admin-status-banner">
                <div className="admin-status-banner-icon">
                  <ShieldCheck size={23} />
                </div>

                <div>
                  <strong>Welcome to your admin workspace</strong>
                  <p>
                    Your dashboard is ready. The figures below are
                    demonstration data and do not represent live users.
                  </p>
                </div>

                <span className="admin-banner-badge">
                  <i></i> Demo mode
                </span>
              </section>

              <section className="admin-stats-grid">
                <article className="admin-stat-card">
                  <div className="admin-stat-top">
                    <span>Total users</span>
                    <div className="admin-stat-icon lime">
                      <Users size={19} />
                    </div>
                  </div>

                  <h2>{users.length.toLocaleString("en-IN")}</h2>

                  <div className="admin-stat-bottom">
                    <span className="admin-stat-neutral">
                      <UserPlus size={14} /> Sample accounts
                    </span>
                  </div>

                  <div className="admin-stat-decoration">
                    <span></span>
                    <span></span>
                    <span></span>
                    <span></span>
                    <span></span>
                  </div>
                </article>

                <article className="admin-stat-card">
                  <div className="admin-stat-top">
                    <span>Active accounts</span>
                    <div className="admin-stat-icon dark">
                      <UserCheck size={19} />
                    </div>
                  </div>

                  <h2>{activeUsers}</h2>

                  <div className="admin-stat-bottom">
                    <span className="admin-stat-positive">
                      <ArrowUpRight size={14} /> Active status
                    </span>
                  </div>

                  <div className="admin-stat-progress">
                    <div
                      style={{
                        width: `${users.length ? (activeUsers / users.length) * 100 : 0}%`,
                      }}
                    ></div>
                  </div>
                </article>

                <article className="admin-stat-card">
                  <div className="admin-stat-top">
                    <span>Pending approvals</span>
                    <div className="admin-stat-icon beige">
                      <Clock3 size={19} />
                    </div>
                  </div>

                  <h2>{pendingUsers}</h2>

                  <div className="admin-stat-bottom">
                    <span className="admin-stat-neutral">
                      Awaiting review
                    </span>
                  </div>

                  <button
                    className="admin-stat-link"
                    onClick={() => selectNavigation("Pending Approvals")}
                  >
                    Review requests <span>↗</span>
                  </button>
                </article>

                <article className="admin-stat-card">
                  <div className="admin-stat-top">
                    <span>Suspended accounts</span>
                    <div className="admin-stat-icon peach">
                      <ShieldAlert size={19} />
                    </div>
                  </div>

                  <h2>{suspendedUsers}</h2>

                  <div className="admin-stat-bottom">
                    <span className="admin-stat-neutral">
                      Requires attention
                    </span>
                  </div>

                  <button
                    className="admin-stat-link"
                    onClick={() => selectNavigation("Suspended Accounts")}
                  >
                    View accounts <span>↗</span>
                  </button>
                </article>
              </section>

              <section className="admin-overview-grid">
                <article className="admin-panel admin-user-overview">
                  <div className="admin-panel-header">
                    <div>
                      <span className="admin-section-kicker">
                        USER DISTRIBUTION
                      </span>
                      <h3>Who's on the platform?</h3>
                      <p>Breakdown of demo accounts by role.</p>
                    </div>

                    <Users size={19} />
                  </div>

                  <div className="admin-role-summary">
                    {(
                      [
                        "Creator",
                        "Agency",
                        "Marketing Team",
                      ] as UserRole[]
                    ).map((role, index) => {
                      const count = users.filter(
                        (user) => user.role === role,
                      ).length;

                      const percentage = users.length
                        ? (count / users.length) * 100
                        : 0;

                      return (
                        <div className="admin-role-item" key={role}>
                          <div className="admin-role-item-top">
                            <div className="admin-role-name">
                              <span className={`admin-role-dot role-${index}`}></span>
                              <strong>{role}</strong>
                            </div>

                            <div className="admin-role-count">
                              <strong>{count}</strong>
                              <span>
                                {Math.round(percentage)}%
                              </span>
                            </div>
                          </div>

                          <div className="admin-role-track">
                            <div
                              className={`role-fill role-fill-${index}`}
                              style={{ width: `${percentage}%` }}
                            ></div>
                          </div>
                        </div>
                      );
                    })}
                  </div>

                  <button
                    className="admin-panel-link"
                    onClick={() => selectNavigation("All Users")}
                  >
                    View all users <span>↗</span>
                  </button>
                </article>

                <article className="admin-panel admin-system-overview">
                  <div className="admin-panel-header">
                    <div>
                      <span className="admin-section-kicker">
                        SYSTEM OVERVIEW
                      </span>
                      <h3>Platform status</h3>
                      <p>Illustrative monitoring indicators.</p>
                    </div>

                    <Server size={19} />
                  </div>

                  <div className="admin-system-status">
                    <div className="admin-system-status-icon">
                      <Check size={18} />
                    </div>

                    <div>
                      <strong>Frontend interface</strong>
                      <span>Demo interface loaded</span>
                    </div>

                    <span className="admin-system-badge">Demo</span>
                  </div>

                  <div className="admin-system-status">
                    <div className="admin-system-status-icon">
                      <Activity size={18} />
                    </div>

                    <div>
                      <strong>Analytics</strong>
                      <span>Sample data displayed</span>
                    </div>

                    <span className="admin-system-badge">Demo</span>
                  </div>

                  <div className="admin-system-status">
                    <div className="admin-system-status-icon">
                      <ShieldCheck size={18} />
                    </div>

                    <div>
                      <strong>Access controls</strong>
                      <span>Backend verification not connected</span>
                    </div>

                    <span className="admin-system-badge pending">
                      Pending
                    </span>
                  </div>

                  <div className="admin-system-note">
                    These indicators are informational only. Live
                    server health and security checks require backend
                    integration.
                  </div>
                </article>
              </section>

              <section className="admin-panel admin-activity-panel">
                <div className="admin-panel-header">
                  <div>
                    <span className="admin-section-kicker">
                      RECENT EVENTS
                    </span>
                    <h3>Latest platform activity</h3>
                    <p>Recent example events across the workspace.</p>
                  </div>

                  <button
                    className="admin-panel-link"
                    onClick={() => {
                      setShowActivity(!showActivity);
                    }}
                  >
                    {showActivity ? "Show less" : "View activity"}{" "}
                    <span>↗</span>
                  </button>
                </div>

                <div className="admin-activity-list">
                  {(showActivity
                    ? adminActivities
                    : adminActivities.slice(0, 3)
                  ).map((activity) => (
                    <div
                      className="admin-activity-row"
                      key={activity.title}
                    >
                      <div
                        className={`admin-activity-icon ${activity.type}`}
                      >
                        {activity.type === "user" && (
                          <UserPlus size={17} />
                        )}
                        {activity.type === "success" && (
                          <Check size={17} />
                        )}
                        {activity.type === "campaign" && (
                          <Megaphone size={17} />
                        )}
                        {activity.type === "security" && (
                          <ShieldCheck size={17} />
                        )}
                      </div>

                      <div className="admin-activity-description">
                        <strong>{activity.title}</strong>
                        <span>{activity.detail}</span>
                      </div>

                      <span className="admin-activity-time">
                        {activity.time}
                      </span>
                    </div>
                  ))}
                </div>
              </section>
            </>
          )}

          {activeNav !== "Overview" && (
            <section className="admin-panel admin-management-panel">
              <div className="admin-panel-header">
                <div>
                  <span className="admin-section-kicker">
                    ADMINISTRATION
                  </span>

                  <h3>
                    {activeNav === "All Users"
                      ? "User management"
                      : activeNav}
                  </h3>

                  <p>
                    Search, filter, review, and manage demonstration
                    accounts.
                  </p>
                </div>

                <button
                  className="admin-button-secondary"
                  onClick={exportUsers}
                >
                  <Download size={15} />
                  Export CSV
                </button>
              </div>

              {activeNav === "System Activity" && (
                <div className="admin-full-activity">
                  {adminActivities.map((activity) => (
                    <div
                      className="admin-activity-row"
                      key={activity.title}
                    >
                      <div
                        className={`admin-activity-icon ${activity.type}`}
                      >
                        <Activity size={17} />
                      </div>

                      <div className="admin-activity-description">
                        <strong>{activity.title}</strong>
                        <span>{activity.detail}</span>
                      </div>

                      <span className="admin-activity-time">
                        {activity.time}
                      </span>
                    </div>
                  ))}
                </div>
              )}

              {activeNav === "Settings" && (
                <div className="admin-settings-notice">
                  <Settings size={26} />
                  <strong>Workspace settings</strong>
                  <p>
                    This frontend demo does not yet save platform settings.
                    Authentication, permissions, and persistent settings
                    need backend integration.
                  </p>
                </div>
              )}

              {activeNav !== "System Activity" &&
                activeNav !== "Settings" && (
                  <>
                    <div className="admin-table-toolbar">
                      <div className="admin-search">
                        <Search size={17} />
                        <input
                          type="text"
                          placeholder="Search by name or email..."
                          value={searchTerm}
                          onChange={(event) =>
                            setSearchTerm(event.target.value)
                          }
                        />
                      </div>

                      <div className="admin-filter-control">
                        <Filter size={15} />

                        <select
                          value={roleFilter}
                          onChange={(event) =>
                            setRoleFilter(event.target.value)
                          }
                          aria-label="Filter by role"
                        >
                          <option>All roles</option>
                          <option>Creator</option>
                          <option>Agency</option>
                          <option>Marketing Team</option>
                        </select>
                      </div>

                      <div className="admin-filter-control">
                        <select
                          value={statusFilter}
                          onChange={(event) =>
                            setStatusFilter(event.target.value)
                          }
                          aria-label="Filter by status"
                        >
                          <option>All statuses</option>
                          <option>Active</option>
                          <option>Pending</option>
                          <option>Suspended</option>
                        </select>
                        <ChevronDown size={14} />
                      </div>
                    </div>

                    <div className="admin-table-wrap">
                      <table className="admin-table">
                        <thead>
                          <tr>
                            <th>USER</th>
                            <th>ROLE</th>
                            <th>STATUS</th>
                            <th>JOINED</th>
                            <th>ACTIONS</th>
                          </tr>
                        </thead>

                        <tbody>
                          {filteredUsers.map((user, index) => (
                            <tr key={user.id}>
                              <td>
                                <div className="admin-table-user">
                                  <div
                                    className={`admin-user-avatar avatar-${index % 4}`}
                                  >
                                    {user.initials}
                                  </div>

                                  <div>
                                    <strong>{user.name}</strong>
                                    <span>{user.email}</span>
                                  </div>
                                </div>
                              </td>

                              <td>
                                <span className="admin-role-badge">
                                  {user.role}
                                </span>
                              </td>

                              <td>
                                <span
                                  className={`admin-status-badge status-${user.status.toLowerCase()}`}
                                >
                                  <i></i>
                                  {user.status}
                                </span>
                              </td>

                              <td className="admin-joined-date">
                                {user.joined}
                              </td>

                              <td>
                                <button
                                  className="admin-row-action"
                                  aria-label={`Manage ${user.name}`}
                                  onClick={() => setSelectedUser(user)}
                                >
                                  <Ellipsis size={19} />
                                </button>
                              </td>
                            </tr>
                          ))}

                          {filteredUsers.length === 0 && (
                            <tr>
                              <td
                                colSpan={5}
                                className="admin-empty-state"
                              >
                                No accounts match your filters.
                              </td>
                            </tr>
                          )}
                        </tbody>
                      </table>
                    </div>

                    <div className="admin-table-footer">
                      <span>
                        Showing {filteredUsers.length} of {users.length}{" "}
                        demo accounts
                      </span>

                      <span>Changes are temporary and reset on refresh.</span>
                    </div>
                  </>
                )}
            </section>
          )}

          <footer className="admin-footer">
            <div className="admin-footer-brand">
              <span className="admin-footer-mark">C</span>
              <strong>CreatorIQ</strong>
              <span>Creator intelligence, made clearer.</span>
            </div>

            <span>Admin Dashboard · Frontend demo · 2026</span>
          </footer>
        </div>
      </main>

      {selectedUser && (
        <div
          className="admin-modal-overlay"
          onClick={() => setSelectedUser(null)}
        >
          <div
            className="admin-modal"
            onClick={(event) => event.stopPropagation()}
          >
            <button
              className="admin-modal-close"
              onClick={() => setSelectedUser(null)}
              aria-label="Close dialog"
            >
              <X size={19} />
            </button>

            <div className="admin-modal-avatar">
              {selectedUser.initials}
            </div>

            <span className="admin-section-kicker">
              ACCOUNT MANAGEMENT
            </span>

            <h2>{selectedUser.name}</h2>
            <p className="admin-modal-email">{selectedUser.email}</p>

            <div className="admin-modal-details">
              <div>
                <span>Role</span>
                <strong>{selectedUser.role}</strong>
              </div>

              <div>
                <span>Current status</span>
                <strong>{selectedUser.status}</strong>
              </div>

              <div>
                <span>Joined</span>
                <strong>{selectedUser.joined}</strong>
              </div>
            </div>

            <p className="admin-modal-disclaimer">
              These actions update local demo data only. They do not
              change a real user account.
            </p>

            {selectedUser.status !== "Active" && (
              <button
                className="admin-button-primary admin-modal-action"
                onClick={() =>
                  updateUserStatus(selectedUser.id, "Active")
                }
              >
                <Check size={16} />
                Activate account
              </button>
            )}

            {selectedUser.status !== "Suspended" && (
              <button
                className="admin-button-danger admin-modal-action"
                onClick={() =>
                  updateUserStatus(selectedUser.id, "Suspended")
                }
              >
                <ShieldAlert size={16} />
                Suspend account
              </button>
            )}

            {selectedUser.status === "Suspended" && (
              <button
                className="admin-button-secondary admin-modal-action"
                onClick={() =>
                  updateUserStatus(selectedUser.id, "Pending")
                }
              >
                <Clock3 size={16} />
                Return to pending
              </button>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

export default AdminDashboard;