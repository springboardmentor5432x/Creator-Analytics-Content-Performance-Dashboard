export default function AuthLayout({ children }) {
  return (
    <div className="auth">
      <main className="auth-form-side">
        <div className="brand">
          <svg width="28" height="28" viewBox="0 0 28 28" aria-hidden="true">
            <rect x="2" y="14" width="6" height="12" rx="2" fill="#8b7bf2" />
            <rect x="11" y="8" width="6" height="18" rx="2" fill="#6d4ae8" />
            <rect x="20" y="2" width="6" height="24" rx="2" fill="#4b2fc4" />
          </svg>
          <span>CreatorIQ</span>
        </div>
        <div className="auth-card">{children}</div>
      </main>

      <aside className="auth-visual" aria-hidden="true">
        <h2>See what your content is really doing.</h2>
        <p>Followers, views and engagement from every platform, in one dashboard.</p>
        <div className="mini-chart">
          <div className="mini-stat">
            <span>Total followers</span>
            <strong>125,430</strong>
            <em>+12.4% this month</em>
          </div>
          <svg viewBox="0 0 300 110" preserveAspectRatio="none">
            <defs>
              <linearGradient id="g" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0" stopColor="#fff" stopOpacity="0.35" />
                <stop offset="1" stopColor="#fff" stopOpacity="0" />
              </linearGradient>
            </defs>
            <path d="M0 95 L50 82 L100 70 L150 58 L200 40 L250 24 L300 8 L300 110 L0 110Z" fill="url(#g)" />
            <path d="M0 95 L50 82 L100 70 L150 58 L200 40 L250 24 L300 8" fill="none" stroke="#fff" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
        </div>
      </aside>
    </div>
  );
}
