import { Routes, Route, Navigate, useNavigate } from "react-router-dom";
import Login from "./pages/Login.jsx";
import Register from "./pages/Register.jsx";

function Dashboard() {
  const navigate = useNavigate();
  const role = localStorage.getItem("role");
  const name = localStorage.getItem("full_name");

  if (!localStorage.getItem("token")) return <Navigate to="/login" replace />;

  const logout = () => {
    localStorage.clear();
    navigate("/login");
  };

  return (
    <div className="dash">
      <h1>Welcome, {name}</h1>
      <p>You are signed in as <strong>{role?.replace("_", " ")}</strong>.</p>
      <p className="muted">Profile, account settings and role-based menus come next.</p>
      <button className="btn" onClick={logout}>Log out</button>
    </div>
  );
}

export default function App() {
  return (
    <Routes>
      <Route path="/login" element={<Login />} />
      <Route path="/register" element={<Register />} />
      <Route path="/dashboard" element={<Dashboard />} />
      <Route path="*" element={<Navigate to="/login" replace />} />
    </Routes>
  );
}
