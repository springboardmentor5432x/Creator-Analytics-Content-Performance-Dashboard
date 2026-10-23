
import React, { useState } from "react";
import "./admin-dashboard.css";

function AdminDashboard({ user }) {
  const [activeSection, setActiveSection] = useState("Overview");

  const [users, setUsers] = useState([
    {
      id: 1,
      name: "Arun Kumar",
      email: "arun@example.com",
      role: "Creator",
      status: "Active",
    },
    {
      id: 2,
      name: "Priya Sharma",
      email: "priya@example.com",
      role: "Agency",
      status: "Active",
    },
    {
      id: 3,
      name: "Rahul Raj",
      email: "rahul@example.com",
      role: "Marketing",
      status: "Pending",
    },
    {
      id: 4,
      name: "Divya S",
      email: "divya@example.com",
      role: "Creator",
      status: "Suspended",
    },
  ]);

  const [search, setSearch] = useState("");
  const [roleFilter, setRoleFilter] = useState("All");
  const [statusFilter, setStatusFilter] = useState("All");

  const activeUsers = users.filter(
    (item) => item.status === "Active"
  ).length;

  const pendingUsers = users.filter(
    (item) => item.status === "Pending"
  ).length;

  const filteredUsers = users.filter((item) => {
    const matchesSearch =
      item.name.toLowerCase().includes(search.toLowerCase()) ||
      item.email.toLowerCase().includes(search.toLowerCase());

    const matchesRole =
      roleFilter === "All" || item.role === roleFilter;

    const matchesStatus =
      statusFilter === "All" || item.status === statusFilter;

    return matchesSearch && matchesRole && matchesStatus;
  });

  function changeStatus(id, newStatus) {
    setUsers((previousUsers) =>
      previousUsers.map((item) =>
        item.id === id
          ? { ...item, status: newStatus }
          : item
      )
    );
  }

  const sections = [
    "Overview",
    "User Management",
    "Role & Permissions",
    "Platform Analytics",
    "Content Moderation",
    "Reports",
    "Notifications",
    "Settings",
  ];

  return (
    <div className="admin-dashboard">
      {/* Sidebar */}
      <aside className="admin-sidebar">
        <div className="admin-logo">
          Creator<span>IQ</span>
        </div>

        <p className="admin-sidebar-title">ADMIN MENU</p>

        <nav className="admin-nav">
          {sections.map((section) => (
            <button
              key={section}
              className={
                activeSection === section ? "active" : ""
              }
              onClick={() => setActiveSection(section)}
            >
              {section === "Overview" && "▦"}
              {section === "User Management" && "♙"}
              {section === "Role & Permissions" && "♢"}
              {section === "Platform Analytics" && "▥"}
              {section === "Content Moderation" && "▤"}
              {section === "Reports" && "▧"}
              {section === "Notifications" && "♧"}
              {section === "Settings" && "⚙"}
              <span>{section}</span>
            </button>
          ))}
        </nav>

        <div className="admin-sidebar-bottom">
          <button
            className="admin-nav-item"
            onClick={() => setActiveSection("Settings")}
          >
            ⚙ <span>Settings</span>
          </button>
        </div>
      </aside>

      {/* Main content */}
      <main className="admin-main">
        <header className="admin-header">
          <div>
            <h1>{activeSection}</h1>
            <p>
              Welcome,{" "}
              {user?.full_name || user?.email || "Administrator"}!
              {" "}Manage your CreatorIQ platform.
            </p>
          </div>

          <div className="admin-header-actions">
            <div className="admin-profile">
              <div className="admin-avatar">
                {(user?.full_name || "A").charAt(0).toUpperCase()}
              </div>
              <div className="admin-profile-info">
                <strong>
                  {user?.full_name || "Administrator"}
                </strong>
                <span>Platform Admin</span>
              </div>
            </div>
          </div>
        </header>

        {activeSection === "Overview" && (
          <>
            {/* Summary cards */}
            <div className="admin-stats-grid">
              <div className="admin-stat-card">
                <div className="admin-stat-top">
                  <span className="admin-stat-title">
                    Total Users
                  </span>
                  <div className="admin-stat-icon">♙</div>
                </div>
                <h2 className="admin-stat-value">{users.length}</h2>
                <div className="admin-stat-footer">
                  Registered demo users
                </div>
              </div>

              <div className="admin-stat-card">
                <div className="admin-stat-top">
                  <span className="admin-stat-title">
                    Active Users
                  </span>
                  <div className="admin-stat-icon green">✓</div>
                </div>
                <h2 className="admin-stat-value">{activeUsers}</h2>
                <div className="admin-stat-footer">
                  Currently marked active
                </div>
              </div>

              <div className="admin-stat-card">
                <div className="admin-stat-top">
                  <span className="admin-stat-title">
                    Pending Approval
                  </span>
                  <div className="admin-stat-icon orange">◷</div>
                </div>
                <h2 className="admin-stat-value">{pendingUsers}</h2>
                <div className="admin-stat-footer">
                  Waiting for review
                </div>
              </div>

              <div className="admin-stat-card">
                <div className="admin-stat-top">
                  <span className="admin-stat-title">
                    Suspended Users
                  </span>
                  <div className="admin-stat-icon red">!</div>
                </div>
                <h2 className="admin-stat-value">
                  {users.filter(
                    (item) => item.status === "Suspended"
                  ).length}
                </h2>
                <div className="admin-stat-footer">
                  Accounts currently suspended
                </div>
              </div>
            </div>

            {/* Dashboard panels */}
            <div className="admin-content-grid">
              <section className="admin-panel">
                <div className="admin-panel-header">
                  <div>
                    <h2>Platform Overview</h2>
                    <p>User distribution by role</p>
                  </div>
                </div>

                <div className="admin-role-legend">
                  {["Creator", "Agency", "Marketing"].map((role) => (
                    <div className="admin-role-row" key={role}>
                      <span className="admin-legend-dot" />
                      <span>{role}</span>
                      <strong>
                        {users.filter(
                          (item) => item.role === role
                        ).length}
                      </strong>
                    </div>
                  ))}
                </div>
              </section>

              <section className="admin-panel">
                <div className="admin-panel-header">
                  <div>
                    <h2>Quick Actions</h2>
                    <p>Common administrative tasks</p>
                  </div>
                </div>

                <div
                  style={{
                    display: "flex",
                    flexDirection: "column",
                    gap: "12px",
                  }}
                >
                  <button
                    className="admin-btn admin-btn-primary"
                    onClick={() =>
                      setActiveSection("User Management")
                    }
                  >
                    Manage Users
                  </button>

                  <button
                    className="admin-btn admin-btn-secondary"
                    onClick={() =>
                      setActiveSection("Platform Analytics")
                    }
                  >
                    View Analytics
                  </button>

                  <button
                    className="admin-btn admin-btn-secondary"
                    onClick={() => setActiveSection("Settings")}
                  >
                    Platform Settings
                  </button>
                </div>
              </section>
            </div>
          </>
        )}

        {activeSection === "User Management" && (
          <section className="admin-panel">
            <div className="admin-panel-header">
              <div>
                <h2>User Management</h2>
                <p>Search and manage registered users</p>
              </div>
            </div>

            <div className="admin-toolbar">
              <div className="admin-toolbar-left">
                <input
                  className="admin-search"
                  type="text"
                  placeholder="Search by name or email..."
                  value={search}
                  onChange={(event) =>
                    setSearch(event.target.value)
                  }
                />

                <select
                  className="admin-select"
                  value={roleFilter}
                  onChange={(event) =>
                    setRoleFilter(event.target.value)
                  }
                >
                  <option value="All">All Roles</option>
                  <option value="Creator">Creator</option>
                  <option value="Agency">Agency</option>
                  <option value="Marketing">Marketing</option>
                </select>

                <select
                  className="admin-select"
                  value={statusFilter}
                  onChange={(event) =>
                    setStatusFilter(event.target.value)
                  }
                >
                  <option value="All">All Statuses</option>
                  <option value="Active">Active</option>
                  <option value="Pending">Pending</option>
                  <option value="Suspended">Suspended</option>
                </select>
              </div>
            </div>

            <div className="admin-table-wrapper">
              <table className="admin-table">
                <thead>
                  <tr>
                    <th>User</th>
                    <th>Role</th>
                    <th>Status</th>
                    <th>Actions</th>
                  </tr>
                </thead>

                <tbody>
                  {filteredUsers.map((item) => (
                    <tr key={item.id}>
                      <td>
                        <div className="admin-table-user">
                          <div className="admin-table-avatar">
                            {item.name.charAt(0)}
                          </div>
                          <div className="admin-table-user-info">
                            <strong>{item.name}</strong>
                            <span>{item.email}</span>
                          </div>
                        </div>
                      </td>

                      <td>{item.role}</td>

                      <td>
                        <span
                          className={`admin-status ${item.status.toLowerCase()}`}
                        >
                          {item.status}
                        </span>
                      </td>

                      <td>
                        <div className="admin-table-actions">
                          {item.status !== "Active" && (
                            <button
                              className="admin-icon-btn"
                              title="Activate user"
                              onClick={() =>
                                changeStatus(item.id, "Active")
                              }
                            >
                              ✓
                            </button>
                          )}

                          {item.status !== "Suspended" && (
                            <button
                              className="admin-icon-btn"
                              title="Suspend user"
                              onClick={() =>
                                changeStatus(item.id, "Suspended")
                              }
                            >
                              ⊘
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                  ))}

                  {filteredUsers.length === 0 && (
                    <tr>
                      <td colSpan="4">
                        <div className="admin-empty-state">
                          No users match your search.
                        </div>
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </section>
        )}

        {activeSection !== "Overview" &&
          activeSection !== "User Management" && (
            <section className="admin-panel">
              <div className="admin-panel-header">
                <div>
                  <h2>{activeSection}</h2>
                  <p>
                    This section is ready for your next
                    implementation step.
                  </p>
                </div>
              </div>

              <p>
                You can build the {activeSection.toLowerCase()} module
                here. Connect it to your backend when its API is ready.
              </p>
            </section>
          )}

        <footer
          style={{
            textAlign: "center",
            color: "#888ba0",
            fontSize: "12px",
            padding: "25px 0 5px",
          }}
        >
          CreatorIQ Admin Dashboard
        </footer>
      </main>
    </div>
  );
}

export default AdminDashboard;