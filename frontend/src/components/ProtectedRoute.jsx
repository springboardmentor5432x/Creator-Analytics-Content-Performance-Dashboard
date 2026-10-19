
import { Navigate } from "react-router-dom";

function ProtectedRoute({ children, allowedRoles }) {
  const token =
    localStorage.getItem("creatoriq_token") ||
    sessionStorage.getItem("creatoriq_token");

  const storedUser =
    localStorage.getItem("creatoriq_user") ||
    sessionStorage.getItem("creatoriq_user");

  if (!token) {
    return <Navigate to="/login" replace />;
  }

  let user;

  try {
    user = JSON.parse(storedUser || "{}");
  } catch {
    return <Navigate to="/login" replace />;
  }

  const role = user.role?.toLowerCase();

  if (allowedRoles && !allowedRoles.includes(role)) {
    const roleRoutes = {
      creator: "/dashboard",
      agency: "/agency-dashboard",
      marketing_team: "/marketing-dashboard",
      administrator: "/admin-dashboard",
    };

    return (
      <Navigate
        to={roleRoutes[role] || "/login"}
        replace
      />
    );
  }

  return children;
}

export default ProtectedRoute;
