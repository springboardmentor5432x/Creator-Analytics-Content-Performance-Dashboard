import { Navigate, Route, Routes, useLocation } from "react-router-dom";
import { useAuth } from "./context/AuthContext";
import Layout from "./components/Layout";
import { Spinner } from "./components/ui";
import Login from "./pages/Login";
import Register from "./pages/Register";
import CreatorDashboard from "./pages/CreatorDashboard";
import AgencyDashboard from "./pages/AgencyDashboard";
import MarketingDashboard from "./pages/MarketingDashboard";
import AdminDashboard from "./pages/AdminDashboard";
import ContentAnalytics from "./pages/ContentAnalytics";
import AudienceAnalytics from "./pages/AudienceAnalytics";
import Connections from "./pages/Connections";
import Profile from "./pages/Profile";
import Settings from "./pages/Settings";
import { getRoleDashboardPath, normalizeRole } from "./utils/format";

function Protected({ children }) {
  const { user, loading } = useAuth();
  const loc = useLocation();
  if (loading) return <Spinner label="Checking your session…" />;
  return user ? children : <Navigate to="/login" replace state={{ from: loc.pathname }} />;
}

function RoleGuard({ allowedRoles, children }) {
  const { user } = useAuth();
  if (!user) return <Navigate to="/login" replace />;
  const userRole = normalizeRole(user.role);
  const normalizedAllowed = allowedRoles.map(normalizeRole);
  // Admins can inspect any dashboard for demonstration purposes, or user must have allowed role
  if (userRole === "admin" || normalizedAllowed.includes(userRole)) {
    return children;
  }
  // Unauthorized: redirect to their own role dashboard
  return <Navigate to={getRoleDashboardPath(user.role)} replace />;
}

function RoleDispatcher() {
  const { user } = useAuth();
  return <Navigate to={getRoleDashboardPath(user?.role)} replace />;
}

function GuestOnly({ children }) {
  const { user, loading } = useAuth();
  if (loading) return <Spinner />;
  return user ? <Navigate to={getRoleDashboardPath(user.role)} replace /> : children;
}

export default function App() {
  return (
    <Routes>
      <Route path="/login" element={<GuestOnly><Login /></GuestOnly>} />
      <Route path="/register" element={<GuestOnly><Register /></GuestOnly>} />
      <Route element={<Protected><Layout /></Protected>}>
        {/* Dynamic role router for /dashboard */}
        <Route path="/dashboard" element={<RoleDispatcher />} />

        {/* Four Dedicated Role-Based Dashboards */}
        <Route
          path="/creator-dashboard"
          element={
            <RoleGuard allowedRoles={["creator", "admin"]}>
              <CreatorDashboard />
            </RoleGuard>
          }
        />
        <Route
          path="/agency-dashboard"
          element={
            <RoleGuard allowedRoles={["agency", "admin"]}>
              <AgencyDashboard />
            </RoleGuard>
          }
        />
        <Route
          path="/marketing-dashboard"
          element={
            <RoleGuard allowedRoles={["marketing", "admin"]}>
              <MarketingDashboard />
            </RoleGuard>
          }
        />
        <Route
          path="/admin-dashboard"
          element={
            <RoleGuard allowedRoles={["admin"]}>
              <AdminDashboard />
            </RoleGuard>
          }
        />
        <Route
          path="/administrator-dashboard"
          element={<Navigate to="/admin-dashboard" replace />}
        />

        {/* Common & Role Analytics Pages */}
        <Route
          path="/content"
          element={
            <RoleGuard allowedRoles={["creator", "admin"]}>
              <ContentAnalytics />
            </RoleGuard>
          }
        />
        <Route
          path="/audience"
          element={
            <RoleGuard allowedRoles={["creator", "admin"]}>
              <AudienceAnalytics />
            </RoleGuard>
          }
        />
        <Route
          path="/connections"
          element={
            <RoleGuard allowedRoles={["creator", "admin"]}>
              <Connections />
            </RoleGuard>
          }
        />
        <Route path="/profile" element={<Profile />} />
        <Route path="/settings" element={<Settings />} />
      </Route>
      <Route path="*" element={<Navigate to="/dashboard" replace />} />
    </Routes>
  );
}
