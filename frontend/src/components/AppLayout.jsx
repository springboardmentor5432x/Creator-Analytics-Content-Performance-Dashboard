import { useAuth } from "../AuthContext.jsx";
import Sidebar from "../dashboard/Sidebar.jsx";
import Topbar from "../dashboard/Topbar.jsx";
import { DateRangeProvider } from "../dashboard/DateRangeContext.jsx";
import "../dashboard/dashboard.css";

export default function AppLayout({ children }) {
  const { user, logout } = useAuth();
  return (
    <DateRangeProvider>
    <div className="dash">
      <Sidebar role={user.role} />
      <div className="dash-main">
        <Topbar user={user} onLogout={logout} />
        <main className="dash-body">{children}</main>
      </div>
    </div>
    </DateRangeProvider>
  );
}
