
import React from "react";
import "./Dashboard.css";

export default function DashboardHeader({ title, subtitle }) {
  return (
    <header className="role-dashboard-header">
      <h1>{title}</h1>
      <p>{subtitle}</p>
    </header>
  );
}
