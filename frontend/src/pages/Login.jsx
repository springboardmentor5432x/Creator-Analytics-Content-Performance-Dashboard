import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import api from "../api/axios";
import "../styles/CreatorAuth.css";

export default function Login() {
  const navigate = useNavigate();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [remember, setRemember] = useState(true);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  async function handleSubmit(event) {
    event.preventDefault();
    setError("");
    setLoading(true);
    try {
      const body = new URLSearchParams();
      body.append("username", email.trim());
      body.append("password", password);
      const response = await api.post("/api/auth/login", body, {
        headers: { "Content-Type": "application/x-www-form-urlencoded" },
      });
      const token = response.data.access_token;
      if (!token) throw new Error("The server did not return an access token.");

      const storage = remember ? window.localStorage : window.sessionStorage;
      const otherStorage = remember ? window.sessionStorage : window.localStorage;
      storage.setItem("creatoriq_token", token);
      otherStorage.removeItem("creatoriq_token");

let loggedInUser = response.data.user;

try {
  const me = await api.get("/api/auth/me", {
    headers: { Authorization: `Bearer ${token}` },
  });

  loggedInUser = me.data;
} catch {
  // Use the user returned by the login endpoint.
}

if (!loggedInUser?.role) {
  throw new Error(
    "Your account role could not be identified. Please try again."
  );
}

const normalizedRole = loggedInUser.role.toLowerCase();

storage.setItem(
  "creatoriq_user",
  JSON.stringify(loggedInUser)
);

otherStorage.removeItem("creatoriq_user");

const roleRoutes = {
  creator: "/dashboard",
  agency: "/agency-dashboard",
  administrator: "/admin-dashboard",
  marketing_team: "/marketing-dashboard",
};

const destination = roleRoutes[normalizedRole];

if (!destination) {
  throw new Error("Your account has an unsupported role.");
}

navigate(destination, { replace: true });

    } catch (err) {
      const detail = err?.response?.data?.detail;
      setError(typeof detail === "string" ? detail : "Unable to sign in. Check your details and try again.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <main className="ciq-auth-page">
      <section className="ciq-auth-shell">
        <aside className="ciq-hero">
          <header className="ciq-brand"><span className="ciq-brand-mark">✦</span><span>Creator<span className="ciq-brand-accent">IQ</span></span></header>
          <div className="ciq-hero-topline">
            <span className="ciq-pill"><i /> ALL-IN-ONE CREATOR ANALYTICS</span>
            <span className="ciq-top-note">Create · Analyze · Grow</span>
          </div>
          <div className="ciq-hero-copy">
            <p className="ciq-eyebrow">YOUR CONTENT. YOUR NEXT CHAPTER.</p>
            <h1>From content<br />to <span>opportunities.</span></h1>
            <p className="ciq-hero-description">Turn your social content into real insights. Understand your audience, discover what works, and make your next move with confidence.</p>
          </div>
          <div className="ciq-feature-row">
            <div><span className="ciq-feature-icon">▥</span><span>Track<br />performance</span></div>
            <div><span className="ciq-feature-icon">◎</span><span>Audience<br />insights</span></div>
            <div><span className="ciq-feature-icon">♡</span><span>Brand<br />collaborations</span></div>
            <div><span className="ciq-feature-icon">↗</span><span>Grow your<br />reach</span></div>
          </div>
          <div className="ciq-studio-wrap">
            <img className="ciq-studio-image" src="/creator-studio.png" alt="Creator studio with analytics visuals" />
            <div className="ciq-floating-stat ciq-stat-followers">
              <span className="ciq-stat-label">TOTAL FOLLOWERS</span><strong>1.2M</strong><span className="ciq-stat-up">↗ 12.5% this month</span>
              <div className="ciq-avatar-stack"><i>H</i><i>A</i><i>M</i><i>+</i></div>
            </div>
            <div className="ciq-floating-stat ciq-stat-engagement">
              <span className="ciq-stat-label">ENGAGEMENT RATE</span><strong>8.4%</strong><span className="ciq-stat-up">↗ 2.1%</span>
              <div className="ciq-mini-bars"><i/><i/><i/><i/><i/><i/><i/></div>
            </div>
            <div className="ciq-video-chip"><span>▶</span><div><strong>See CreatorIQ in action</strong><small>Explore your creative potential</small></div></div>
          </div>
          <div className="ciq-hero-footer"><span className="ciq-live-dot" /> One space for your creator journey <span className="ciq-footer-divider">/</span> Insights that move you forward</div>
        </aside>

        <section className="ciq-form-side">
          <div className="ciq-form-top">New to CreatorIQ? <Link to="/register">Sign up <span>↗</span></Link></div>
          <div className="ciq-form-content">
            <div className="ciq-form-brand"><span className="ciq-brand-mark">✦</span><span>Creator<span className="ciq-brand-accent">IQ</span></span></div>
            <span className="ciq-welcome-icon">✦</span>
            <p className="ciq-eyebrow ciq-purple-eyebrow">WELCOME BACK</p>
            <h2>Good to see you<span>.</span></h2>
            <p className="ciq-form-subtitle">Log in to your account and keep your creator journey moving.</p>
            <form onSubmit={handleSubmit}>
              <label htmlFor="login-email">Email address</label>
              <div className="ciq-input-wrap"><span className="ciq-input-icon">✉</span><input id="login-email" type="email" autoComplete="email" placeholder="Enter your email address" value={email} onChange={(e) => setEmail(e.target.value)} required /></div>
              <label htmlFor="login-password">Password</label>
              <div className="ciq-input-wrap"><span className="ciq-input-icon">♙</span><input id="login-password" type={showPassword ? "text" : "password"} autoComplete="current-password" placeholder="Enter your password" value={password} onChange={(e) => setPassword(e.target.value)} required /><button className="ciq-show-password" type="button" onClick={() => setShowPassword(v => !v)} aria-label={showPassword ? "Hide password" : "Show password"}>{showPassword ? "Hide" : "Show"}</button></div>
              <div className="ciq-form-options"><label className="ciq-remember"><input type="checkbox" checked={remember} onChange={(e) => setRemember(e.target.checked)} /><span>Remember me</span></label><button type="button" className="ciq-text-button" onClick={() => setError("Password recovery is not configured yet. Please contact your project administrator.")}>Forgot password?</button></div>
              {error && <div className="ciq-error" role="alert">{error}</div>}
              <button className="ciq-primary-button" type="submit" disabled={loading}>{loading ? "Signing you in..." : "Login"} <span>→</span></button>
            </form>
            <div className="ciq-or"><span /> <small>or continue with</small> <span /></div>
            <div className="ciq-social-row">
              <button type="button" onClick={() => setError("Google sign-in is a visual preview and is not configured yet.")}><b className="ciq-google-g">G</b> Google</button>
              <button type="button" onClick={() => setError("Apple sign-in is a visual preview and is not configured yet.")}><b className="ciq-apple">●</b> Apple</button>
              <button type="button" onClick={() => setError("LinkedIn sign-in is a visual preview and is not configured yet.")}><b className="ciq-linkedin">in</b> LinkedIn</button>
            </div>
            <p className="ciq-form-bottom">Don’t have an account? <Link to="/register">Sign up <span>→</span></Link></p>
            <p className="ciq-terms">By continuing, you agree to our <span>Terms</span> and <span>Privacy Policy</span>.</p>
          </div>
        </section>
      </section>
    </main>
  );
}
