
import {
  BrowserRouter,
  Routes,
  Route,
  Navigate,
} from "react-router-dom";

import Login from "./Login";
import Register from "./Register";
import Dashboard from "./Dashboard";
import CreatorDashboard from "./CreatorDashboard";
import MarketingDashboard from "./MarketingDashboard";
import AdminDashboard from "./AdminDashboard";
import GPSNavigator from "./GPSNavigator";
import DashboardHeader from "./DashboardHeader";

export default function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route
          path="/"
          element={<Navigate to="/register" replace />}
        />

        <Route path="/register" element={<Register />} />
        <Route path="/login" element={<Login />} />

        {/* Existing role-based dashboard */}
        <Route path="/dashboard" element={<Dashboard />} />

        {/* Existing Creator dashboard */}
        <Route
          path="/creator-dashboard"
          element={<CreatorDashboard />}
        />

        {/* Marketing Agent dashboard */}
        <Route
          path="/marketing-dashboard"
          element={<MarketingDashboard />}
        />

        {/* Administrator dashboard */}
        <Route
          path="/admin-dashboard"
          element={<AdminDashboard />}
        />
        {/* GPS Navigator */}
        <Route
          path="/gps-navigator"
          element={<GPSNavigator />}
        />

        <Route
          path="/old-dashboard"
          element={<Dashboard />}
        />

        <Route
          path="*"
          element={<Navigate to="/register" replace />}
        />
      </Routes>
    </BrowserRouter>
  );
}
