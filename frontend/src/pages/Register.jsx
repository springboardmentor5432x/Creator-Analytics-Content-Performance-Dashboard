import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import api from "../api/axios";
import "../styles/CreatorAuth.css";

export default function Register() {
  const navigate = useNavigate();
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [role, setRole] = useState("creator");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  async function handleSubmit(event) {
    event.preventDefault();
    setError(""); setSuccess("");
    if (password !== confirmPassword) { setError("Your passwords do not match."); return; }
    setLoading(true);
    try {
      await api.post("/api/auth/register", { name: name.trim(), email: email.trim(), password, role });
      setSuccess("Account created successfully. Redirecting to login...");
      window.setTimeout(() => navigate("/login"), 1200);
    } catch (err) {
      const detail = err?.response?.data?.detail;
      setError(typeof detail === "string" ? detail : "Could not create your account. Check the details and try again.");
    } finally { setLoading(false); }
  }

  return (
    <main className="ciq-auth-page">
      <section className="ciq-auth-shell ciq-register-shell">
        <aside className="ciq-hero">
          <header className="ciq-brand"><span className="ciq-brand-mark">✦</span><span>Creator<span className="ciq-brand-accent">IQ</span></span></header>
          <div className="ciq-hero-topline"><span className="ciq-pill"><i /> YOUR GROWTH STARTS HERE</span><span className="ciq-top-note">Create · Analyze · Grow</span></div>
          <div className="ciq-hero-copy"><p className="ciq-eyebrow">MAKE YOUR NEXT MOVE COUNT.</p><h1>Your creativity<br />deserves to <span>grow.</span></h1><p className="ciq-hero-description">Join a smarter space for creator insights, audience understanding, and meaningful brand opportunities.</p></div>
          <div className="ciq-feature-row"><div><span className="ciq-feature-icon">↗</span><span>Know your<br />numbers</span></div><div><span className="ciq-feature-icon">◎</span><span>Understand<br />your audience</span></div><div><span className="ciq-feature-icon">✧</span><span>Find new<br />opportunities</span></div></div>
          <div className="ciq-studio-wrap"><img className="ciq-studio-image" src="/creator-studio.png" alt="Creator studio and analytics" /><div className="ciq-register-note"><span>✦</span><div><strong>Make your content count.</strong><small>Every insight is a new possibility.</small></div></div></div>
          <div className="ciq-hero-footer"><span className="ciq-live-dot" /> Built for creators, agencies, and growth teams</div>
        </aside>
        <section className="ciq-form-side ciq-register-form-side">
          <div className="ciq-form-top">Already a member? <Link to="/login">Log in <span>↗</span></Link></div>
          <div className="ciq-form-content ciq-register-content">
            <div className="ciq-form-brand"><span className="ciq-brand-mark">✦</span><span>Creator<span className="ciq-brand-accent">IQ</span></span></div>
            <span className="ciq-welcome-icon">✦</span><p className="ciq-eyebrow ciq-purple-eyebrow">CREATE YOUR ACCOUNT</p><h2>Start your journey<span>.</span></h2><p className="ciq-form-subtitle">A few details. A whole lot of possibility.</p>
            <form onSubmit={handleSubmit}>
              <label htmlFor="register-name">Full name</label><div className="ciq-input-wrap"><span className="ciq-input-icon">♙</span><input id="register-name" autoComplete="name" placeholder="Enter your full name" value={name} onChange={e => setName(e.target.value)} required /></div>
              <label htmlFor="register-email">Email address</label><div className="ciq-input-wrap"><span className="ciq-input-icon">✉</span><input id="register-email" type="email" autoComplete="email" placeholder="you@example.com" value={email} onChange={e => setEmail(e.target.value)} required /></div>
              
<label htmlFor="register-role">Choose your role</label>
<div className="ciq-input-wrap">
  <span className="ciq-input-icon">◈</span>
  <select
    id="register-role"
    value={role}
    onChange={(e) => setRole(e.target.value)}
    required
    style={{
      width: "100%",
      padding: "12px 40px",
      border: "none",
      outline: "none",
      background: "transparent",
      color: "#21183f",
      fontSize: "14px",
      cursor: "pointer",
    }}
  >
    <option value="creator">Creator</option>
    <option value="agency">Agency</option>
    <option value="marketing_team">Marketing Team</option>
    <option value="administrator">Administrator</option>
  </select>
</div>

              <label htmlFor="register-password">Password</label><div className="ciq-input-wrap"><span className="ciq-input-icon">♙</span><input id="register-password" type={showPassword ? "text" : "password"} autoComplete="new-password" placeholder="Create a password" value={password} onChange={e => setPassword(e.target.value)} required minLength={8} /><button className="ciq-show-password" type="button" onClick={() => setShowPassword(v => !v)}>{showPassword ? "Hide" : "Show"}</button></div>
              <label htmlFor="register-confirm">Confirm password</label><div className="ciq-input-wrap"><span className="ciq-input-icon">♙</span><input id="register-confirm" type={showPassword ? "text" : "password"} autoComplete="new-password" placeholder="Re-enter your password" value={confirmPassword} onChange={e => setConfirmPassword(e.target.value)} required minLength={8} /></div>
              {error && <div className="ciq-error" role="alert">{error}</div>}{success && <div className="ciq-success" role="status">{success}</div>}
              <button className="ciq-primary-button" type="submit" disabled={loading}>{loading ? "Creating account..." : "Create my account"} <span>→</span></button>
            </form>
            <p className="ciq-terms">By creating an account, you agree to our <span>Terms</span> and <span>Privacy Policy</span>.</p>
          </div>
        </section>
      </section>
    </main>
  );
}
