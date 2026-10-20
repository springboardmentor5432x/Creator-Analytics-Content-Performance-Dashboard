import { Icon } from "./Icons";

export default function Topbar({ user, onLogout }) {
  const initials = user.name.split(" ").map((s) => s[0]).slice(0, 2).join("").toUpperCase();
  return (
    <header className="tb">
      <label className="tb-search">
        <Icon name="search" />
        <input type="search" placeholder="Search content, analytics, reports..." aria-label="Search" />
      </label>

      <div className="tb-right">
        <label className="tb-range">
          <Icon name="calendar" />
          <select aria-label="Date range" defaultValue="30">
            <option value="7">Last 7 Days</option>
            <option value="30">Last 30 Days</option>
            <option value="90">Last 90 Days</option>
          </select>
        </label>

        <button className="icon-btn" aria-label="Notifications">
          <Icon name="bell" />
          <span className="dot" />
        </button>

        <div className="tb-user">
          <span className="avatar">{initials}</span>
          <span className="tb-name">
            <strong>{user.name}</strong>
            <small>{user.role_label}</small>
          </span>
        </div>

        <button className="icon-btn" onClick={onLogout} aria-label="Log out" title="Log out">
          <Icon name="logout" />
        </button>
      </div>
    </header>
  );
}
