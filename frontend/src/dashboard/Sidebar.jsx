import { NavLink } from "react-router-dom";
import { NAV_BY_ROLE } from "./data";
import { Icon } from "./Icons";

export default function Sidebar({ role }) {
  const items = NAV_BY_ROLE[role] || NAV_BY_ROLE.creator;
  return (
    <aside className="sb">
      <div className="sb-brand">
        <svg width="26" height="26" viewBox="0 0 28 28" aria-hidden="true">
          <rect x="2" y="14" width="6" height="12" rx="2" fill="#8b7bf2" />
          <rect x="11" y="8" width="6" height="18" rx="2" fill="#6d4ae8" />
          <rect x="20" y="2" width="6" height="24" rx="2" fill="#4b2fc4" />
        </svg>
        <span>CreatorIQ</span>
      </div>

      <nav aria-label="Main">
        {items.map((n) => (
          <NavLink key={n.label} to={n.to} end className={({ isActive }) => "sb-item" + (isActive ? " active" : "")}>
            <Icon name={n.icon} />
            <span>{n.label}</span>
            {n.chevron && <Icon name="chevron" size={15} className="sb-chev" />}
          </NavLink>
        ))}
      </nav>

      {role === "creator" || role === "agency" && (
        <div className="sb-plan">
          <Icon name="crown" size={22} />
          <strong>Pro Plan</strong>
          <p>Unlock advanced analytics and reports</p>
          <button className="btn-solid">Upgrade Plan</button>
        </div>
      )}
    </aside>
  );
}
