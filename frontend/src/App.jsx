import React from "react";
import CreatorDashboard from "./creatordashboard";
import AdminDashboard from "./admindashboard";
import AgencyDashboard from "./agencydashboard";
import MarketingDashboard from "./marketingdashboard";
import { useEffect, useState } from "react";
import { BrowserRouter, Navigate, Route, Routes, Link, useNavigate } from "react-router-dom";
import {
  Activity,
  ArrowRight,
  BarChart3,
  Bell,
  Check,
  ChevronDown,
  CircleHelp,
  Eye,
  EyeOff,
  Instagram,
  LockKeyhole,
  Mail,
  ShieldCheck,
  Sparkles,
  TrendingUp,
  Users,
  Youtube,
  ChartNoAxesCombined,
} from "lucide-react";

import { apiRequest } from "./api";


const roles = [
  { value: "creator", label: "Creator", note: "Grow your audience and track content." },
  { value: "agency", label: "Agency", note: "Manage creators and campaigns." },
  { value: "marketing_team", label: "Marketing Team", note: "Measure campaign performance." },
  {
    value: "administrator",
    label: "Administrator",
    note: "Manage platform users and access.",
  },
];

function Brand({ light = false }) {
  return <Link className={`brand ${light ? "brand-light" : ""}`} to="/login">
    <span className="brand-mark">C</span><span>Creator<span className="brand-iq">IQ</span></span>
  </Link>;
}

function SocialOrb({ children, className = "" }) {
  return <span className={`social-orb ${className}`}>{children}</span>;
}

function ArtPanel({ mode = "register" }) {
  const isRegister = mode === "register";
  return <aside className={`art-panel ${isRegister ? "art-light" : "art-dark"}`}>
    <div className="art-topline"><Brand light={!isRegister} /><span className="art-top-caption">{isRegister ? "CREATOR GROWTH, REIMAGINED" : "YOUR NEXT CHAPTER STARTS HERE"}</span></div>
    <div className="art-copy">
      <div className="pill"><Sparkles size={14} /> BUILT FOR THE CREATOR ECONOMY</div>
      <h2>{isRegister ? <>Turn your creativity<br />into <em>measurable growth.</em></> : <>Your creator insights<br />are <em>one click away.</em></>}</h2>
      <p>{isRegister
        ? "One workspace to understand your content, build stronger partnerships, and make every post count."
        : "See what works, discover new opportunities, and make your next move with confidence."}</p>
    </div>

    <div className="visual-stage" aria-label="Creator analytics illustration">
      <div className="glow glow-one" />
      <div className="glow glow-two" />
      <div className="floating-icon float-instagram"><Instagram size={22} /></div>
      <div className="floating-icon float-youtube"><Youtube size={23} /></div>
      <div className="floating-icon float-trend"><TrendingUp size={22} /></div>
      <div className="analytics-card">
        <div className="analytics-card-top"><span className="mini-brand"><span className="mini-dot" /> CREATORIQ INSIGHTS</span><span className="live-dot">LIVE</span></div>
        <div className="chart-number">{isRegister ? "84.6K" : "2.4M"} <span>↗ {isRegister ? "18.6%" : "12.4%"}</span></div>
        <div className="chart-label">{isRegister ? "Total audience reach" : "Total campaign reach"}</div>
        <svg viewBox="0 0 330 100" className="chart-svg" role="img" aria-label="Rising performance chart">
          <defs><linearGradient id="chartFill" x1="0" x2="0" y1="0" y2="1"><stop offset="0%" stopColor="#8266ff" stopOpacity=".35"/><stop offset="100%" stopColor="#8266ff" stopOpacity="0"/></linearGradient></defs>
          {[20, 45, 70].map(y => <line key={y} x1="0" x2="330" y1={y} y2={y} stroke="currentColor" strokeOpacity=".1" strokeDasharray="4 5" />)}
          <path d="M0,80 C20,78 25,56 48,61 S80,74 102,49 S142,62 164,34 S204,48 224,28 S260,40 282,15 S312,24 330,7 L330,100 L0,100 Z" fill="url(#chartFill)" />
          <path d="M0,80 C20,78 25,56 48,61 S80,74 102,49 S142,62 164,34 S204,48 224,28 S260,40 282,15 S312,24 330,7" fill="none" stroke="#8567ff" strokeWidth="3" strokeLinecap="round" />
          <circle cx="282" cy="15" r="5" fill="#8567ff" stroke="white" strokeWidth="2" />
        </svg>
        <div className="chart-footer"><span>MON</span><span>TUE</span><span>WED</span><span>THU</span><span>FRI</span><span>SAT</span><span>SUN</span></div>
      </div>
      <div className="floating-stat stat-top"><span className="stat-icon"><Users size={16}/></span><span><small>Creator network</small><strong>12.8K <i>+16.8%</i></strong></span></div>
      <div className="floating-stat stat-bottom"><span className="stat-icon green"><Activity size={16}/></span><span><small>Engagement rate</small><strong>8.42% <i>+2.1%</i></strong></span></div>
      <div className="orbit orbit-a" /><div className="orbit orbit-b" />
    </div>

    <div className="art-benefits">
      <div><span className="benefit-icon"><ChartNoAxesCombined size={17}/></span><span><strong>Understand performance</strong><small>Turn metrics into meaningful action.</small></span></div>
      <div><span className="benefit-icon"><Users size={17}/></span><span><strong>Build better partnerships</strong><small>Bring creators and teams together.</small></span></div>
      <div><span className="benefit-icon"><ShieldCheck size={17}/></span><span><strong>Your workspace, your way</strong><small>Role-based access built for your team.</small></span></div>
    </div>
    <div className="art-bottom"><span>© 2026 CreatorIQ</span><span>Insights that move you forward <ArrowRight size={13}/></span></div>
  </aside>;
}

function AuthLayout({ mode, children }) {
  return <main className={`auth-layout ${mode}`}>
    <ArtPanel mode={mode} />
    <section className="form-panel">
      <div className="mobile-brand"><Brand /></div>
      <div className="form-top-link">
        <span>{mode === "register" ? "Already have an account?" : "New to CreatorIQ?"}</span>
        <Link to={mode === "register" ? "/login" : "/register"}>{mode === "register" ? "Sign in" : "Create account"} <ArrowRight size={14}/></Link>
      </div>
      {children}
      <footer className="form-footer"><span>© 2026 CreatorIQ, Inc.</span><div><a href="#privacy">Privacy</a><a href="#terms">Terms</a><a href="#help">Help <CircleHelp size={12}/></a></div></footer>
    </section>
  </main>;
}

function PasswordInput({ value, onChange, placeholder, autoComplete, id }) {
  const [visible, setVisible] = useState(false);
  return <div className="password-wrap">
    <LockKeyhole className="input-icon" size={17}/>
    <input id={id} type={visible ? "text" : "password"} value={value} onChange={onChange} placeholder={placeholder} autoComplete={autoComplete} required />
    <button className="visibility-button" type="button" onClick={() => setVisible(!visible)} aria-label={visible ? "Hide password" : "Show password"}>{visible ? <EyeOff size={17}/> : <Eye size={17}/>}</button>
  </div>;
}

function Register() {
  const navigate = useNavigate();
  const [form, setForm] = useState({ full_name: "", email: "", role: "creator", password: "", confirmPassword: "" });
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [showRoles, setShowRoles] = useState(false);

  const update = (key, value) => setForm(old => ({ ...old, [key]: value }));

  async function submit(event) {
    event.preventDefault();
    setError("");
    if (form.full_name.trim().length < 2) return setError("Please enter your full name.");
    if (form.password.length < 8) return setError("Your password must be at least 8 characters.");
    if (!/[A-Za-z]/.test(form.password) || !/[0-9]/.test(form.password)) return setError("Use at least one letter and one number in your password.");
    if (form.password !== form.confirmPassword) return setError("Your passwords don't match.");
    setLoading(true);
    try {
      await apiRequest("/auth/register", { method: "POST", body: JSON.stringify({
        full_name: form.full_name.trim(), email: form.email.trim().toLowerCase(), password: form.password, role: form.role
      })});
      navigate("/login", { state: { message: "Your account is ready. Sign in to continue." } });
    } catch (err) { setError(err.message); }
    finally { setLoading(false); }
  }

  const selectedRole = roles.find(role => role.value === form.role);

  return <AuthLayout mode="register">
    <div className="auth-form-card register-form-card">
      <div className="form-heading">
        <div className="heading-symbol"><Sparkles size={20}/></div>
        <div className="eyebrow">LET'S GET STARTED</div>
        <h1>Create your account</h1>
        <p>Join CreatorIQ and make your content work smarter.</p>
      </div>
      {error && <div className="alert error" role="alert">{error}</div>}
      <form onSubmit={submit}>
        <label htmlFor="full_name">Full name <b>*</b></label>
        <div className="input-wrap"><Users className="input-icon" size={17}/><input id="full_name" value={form.full_name} onChange={e => update("full_name", e.target.value)} placeholder="e.g. Maya Sharma" autoComplete="name" maxLength={120} required /></div>
        <label htmlFor="register-email">Work email <b>*</b></label>
        <div className="input-wrap"><Mail className="input-icon" size={17}/><input id="register-email" type="email" value={form.email} onChange={e => update("email", e.target.value)} placeholder="you@company.com" autoComplete="email" required /></div>
        <label htmlFor="role-select">I am joining as <b>*</b></label>
        <div className="role-select-wrap">
          <button type="button" id="role-select" className={`role-select ${showRoles ? "selected" : ""}`} onClick={() => setShowRoles(!showRoles)} aria-expanded={showRoles}>
            <span className="role-select-icon"><Users size={17}/></span><span className="role-copy"><strong>{selectedRole.label}</strong><small>{selectedRole.note}</small></span><ChevronDown size={17} className={showRoles ? "rotate" : ""}/>
          </button>
          {showRoles && <div className="role-options">{roles.map(role => <button type="button" key={role.value} onClick={() => { update("role", role.value); setShowRoles(false); }} className={form.role === role.value ? "active" : ""}><span><strong>{role.label}</strong><small>{role.note}</small></span>{form.role === role.value && <Check size={16}/>}</button>)}</div>}
        </div>
        <div className="field-row">
          <div className="field-col"><label htmlFor="register-password">Password <b>*</b></label><PasswordInput id="register-password" value={form.password} onChange={e => update("password", e.target.value)} placeholder="Create password" autoComplete="new-password" /></div>
          <div className="field-col"><label htmlFor="confirm-password">Confirm password <b>*</b></label><PasswordInput id="confirm-password" value={form.confirmPassword} onChange={e => update("confirmPassword", e.target.value)} placeholder="Repeat password" autoComplete="new-password" /></div>
        </div>
        <div className="password-hint"><ShieldCheck size={14}/> Use 8+ characters with letters and numbers.</div>
        <button className="primary-button" type="submit" disabled={loading}>{loading ? <><span className="spinner"/> Creating account...</> : <>Create account <ArrowRight size={17}/></>}</button>
      </form>
      <p className="consent">By creating an account, you agree to our <a href="#terms">Terms of Service</a> and <a href="#privacy">Privacy Policy</a>.</p>
      <div className="secure-note"><LockKeyhole size={13}/> Your information is encrypted and secure</div>
    </div>
  </AuthLayout>;
}

function Login() {
  const navigate = useNavigate();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [remember, setRemember] = useState(true);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const [loading, setLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    if (params.get("registered") === "1") setNotice("Account created. Please sign in.");
  }, []);

  async function submit(event) {
    event.preventDefault();
    setError(""); setNotice(""); setLoading(true);
    try {
      const form = new URLSearchParams();
      form.set("username", email.trim().toLowerCase());
      form.set("password", password);
      const result = await apiRequest("/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/x-www-form-urlencoded" },
        body: form
      });
      // Use sessionStorage by default. "Remember me" is UI-only in this starter.
      // For production, prefer secure HttpOnly cookies rather than JS-readable tokens.
      sessionStorage.setItem("access_token", result.access_token);
      sessionStorage.setItem("user", JSON.stringify(result.user));
      navigate("/dashboard");
    } catch (err) { setError(err.message || "Unable to sign in. Please try again."); }
    finally { setLoading(false); }
  }

  return <AuthLayout mode="login">
    <div className="auth-form-card login-form-card">
      <div className="form-heading">
        <div className="heading-symbol"><Sparkles size={20}/></div>
        <div className="eyebrow">WELCOME BACK</div>
        <h1>Sign in to CreatorIQ</h1>
        <p>Your next big insight is waiting for you.</p>
      </div>
      {notice && <div className="alert success" role="status">{notice}</div>}
      {error && <div className="alert error" role="alert">{error}</div>}
      <form onSubmit={submit}>
        <label htmlFor="login-email">Email address <b>*</b></label>
        <div className="input-wrap"><Mail className="input-icon" size={17}/><input id="login-email" type="email" value={email} onChange={e => setEmail(e.target.value)} placeholder="you@company.com" autoComplete="username" required /></div>
        <div className="password-label-row"><label htmlFor="login-password">Password <b>*</b></label><a href="#forgot-password" onClick={e => { e.preventDefault(); setNotice("Password reset is not configured yet. Please contact your administrator."); }}>Forgot password?</a></div>
        <div className="password-wrap"><LockKeyhole className="input-icon" size={17}/><input id="login-password" type={showPassword ? "text" : "password"} value={password} onChange={e => setPassword(e.target.value)} placeholder="Enter your password" autoComplete="current-password" required/><button className="visibility-button" type="button" onClick={() => setShowPassword(!showPassword)} aria-label={showPassword ? "Hide password" : "Show password"}>{showPassword ? <EyeOff size={17}/> : <Eye size={17}/>}</button></div>
        <label className="remember-row"><input type="checkbox" checked={remember} onChange={e => setRemember(e.target.checked)}/><span className="custom-check"><Check size={12}/></span><span>Remember me</span></label>
        <button className="primary-button login-submit" type="submit" disabled={loading}>{loading ? <><span className="spinner"/> Signing in...</> : <>Sign in securely <ArrowRight size={17}/></>}</button>
      </form>
      <div className="divider"><span>SECURE ACCESS</span></div>
      <div className="security-points"><span><ShieldCheck size={15}/> Protected account</span><span><LockKeyhole size={14}/> Encrypted sign in</span></div>
      <p className="switch-auth">Don't have an account? <Link to="/register">Create one for free <ArrowRight size={14}/></Link></p>
    </div>
  </AuthLayout>;
}

function ProtectedRoute({ children }) {
  const [status, setStatus] = useState("checking");
  useEffect(() => {
    let active = true;
    apiRequest("/auth/me").then(() => { if (active) setStatus("ready"); })
      .catch(() => { sessionStorage.removeItem("access_token"); sessionStorage.removeItem("user"); if (active) setStatus("denied"); });
    return () => { active = false; };
  }, []);
  if (status === "checking") return <div className="loading-screen"><span className="spinner"/> Checking your secure session...</div>;
  if (status === "denied") return <Navigate to="/login" replace />;
  return children;
}

function CreatorDashboardold({ user, activeNav }) {
  return (
    <div className="role-dashboard creator-dashboard">
      <div className="creator-welcome">
        <div>
          <span className="creator-eyebrow">CREATOR WORKSPACE</span>
          <h1>Welcome, {user?.full_name || user?.email || "Creator"}! ✨</h1>
          <p>Track your growth, understand your audience, and discover new opportunities.</p>
        </div>
        <div className="creator-avatar">
          {(user?.full_name || user?.email || "C").charAt(0).toUpperCase()}
        </div>
      </div>

      <div className="creator-stats">
        <div className="creator-stat-card">
          <div className="creator-stat-top">
            <span>Total Followers</span>
            <span className="creator-stat-icon purple"><Users size={20}/></span>
          </div>
          <h2>Connect Account</h2>
          <p>Connect Instagram or YouTube to see your followers.</p>
        </div>

        <div className="creator-stat-card">
          <div className="creator-stat-top">
            <span>Engagement Rate</span>
            <span className="creator-stat-icon green"><Activity size={20}/></span>
          </div>
          <h2>--</h2>
          <p>Your engagement analytics will appear here.</p>
        </div>

        <div className="creator-stat-card">
          <div className="creator-stat-top">
            <span>Active Campaigns</span>
            <span className="creator-stat-icon blue"><TrendingUp size={20}/></span>
          </div>
          <h2>Explore</h2>
          <p>Discover brand collaboration opportunities.</p>
        </div>

        <div className="creator-stat-card">
          <div className="creator-stat-top">
            <span>Profile Status</span>
            <span className="creator-stat-icon orange"><ShieldCheck size={20}/></span>
          </div>
          <h2>Getting Started</h2>
          <p>Complete your profile to build trust with brands.</p>
        </div>
      </div>

      <div className="creator-content-grid">
        <section className="creator-panel">
          <div className="creator-panel-heading">
            <div>
              <h2>Social Accounts</h2>
              <p>Your connected creator platforms</p>
            </div>
            <span className="creator-heading-icon"><Activity size={20}/></span>
          </div>

          <div className="creator-social-row">
            <span className="creator-social-logo instagram"><Instagram size={21}/></span>
            <div className="creator-social-info">
              <strong>Instagram</strong>
              <small>Audience and post analytics</small>
            </div>
            <span className="creator-status">Not connected</span>
          </div>

          <div className="creator-social-row">
            <span className="creator-social-logo youtube"><Youtube size={21}/></span>
            <div className="creator-social-info">
              <strong>YouTube</strong>
              <small>Subscribers and video analytics</small>
            </div>
            <span className="creator-status">Not connected</span>
          </div>

          <p className="creator-note">
            Social account integration must be configured before live statistics can appear.
          </p>
        </section>

        <section className="creator-panel">
          <div className="creator-panel-heading">
            <div>
              <h2>Quick Actions</h2>
              <p>Make the most of your workspace</p>
            </div>
            <span className="creator-heading-icon"><Sparkles size={20}/></span>
          </div>

          <button className="creator-action" onClick={() => window.location.hash = "profile"}>
            <span className="creator-action-icon"><Users size={18}/></span>
            <span>
              <strong>Build your creator profile</strong>
              <small>Add your bio and social links</small>
            </span>
            <ArrowRight size={17}/>
          </button>

          <button className="creator-action" onClick={() => window.location.hash = "campaigns"}>
            <span className="creator-action-icon"><TrendingUp size={18}/></span>
            <span>
              <strong>Explore campaigns</strong>
              <small>Find potential brand partnerships</small>
            </span>
            <ArrowRight size={17}/>
          </button>

          <button className="creator-action" onClick={() => window.location.hash = "analytics"}>
            <span className="creator-action-icon"><BarChart3 size={18}/></span>
            <span>
              <strong>View analytics</strong>
              <small>Review your creator performance</small>
            </span>
            <ArrowRight size={17}/>
          </button>
        </section>
      </div>

      <section className="creator-panel creator-growth-panel">
        <div className="creator-panel-heading">
          <div>
            <h2>Your Growth Journey</h2>
            <p>Complete these steps to get started on CreatorIQ.</p>
          </div>
          <span className="creator-heading-icon"><TrendingUp size={20}/></span>
        </div>

        <div className="creator-growth-steps">
          <div className="creator-growth-step">
            <span>01</span>
            <div>
              <strong>Complete your profile</strong>
              <p>Add your creator bio and social links.</p>
            </div>
          </div>

          <div className="creator-growth-step">
            <span>02</span>
            <div>
              <strong>Connect social accounts</strong>
              <p>Set up integrations to display real analytics.</p>
            </div>
          </div>

          <div className="creator-growth-step">
            <span>03</span>
            <div>
              <strong>Discover collaborations</strong>
              <p>Prepare your profile for brand opportunities.</p>
            </div>
          </div>
        </div>
      </section>
    </div>
  );
}


function AgencyDashboardold({ user }) {
  const [activeTab, setActiveTab] = useState("Overview");
  const [search, setSearch] = useState("");

  const [creators] = useState([
    {
      id: 1,
      name: "Arun Kumar",
      platform: "Instagram",
      followers: "125K",
      status: "Active",
    },
    {
      id: 2,
      name: "Priya Sharma",
      platform: "YouTube",
      followers: "85K",
      status: "Active",
    },
    {
      id: 3,
      name: "Rahul Raj",
      platform: "Instagram",
      followers: "52K",
      status: "Pending",
    },
  ]);

  const [campaigns] = useState([
    {
      id: 1,
      name: "Summer Fashion Campaign",
      creator: "Arun Kumar",
      budget: "₹50,000",
      status: "Active",
    },
    {
      id: 2,
      name: "Beauty Brand Promotion",
      creator: "Priya Sharma",
      budget: "₹35,000",
      status: "In Progress",
    },
    {
      id: 3,
      name: "Lifestyle Product Launch",
      creator: "Rahul Raj",
      budget: "₹25,000",
      status: "Pending",
    },
  ]);

  const menuItems = [
    "Overview",
    "Creator Management",
    "Campaigns",
    "Analytics",
    "Reports",
    "Settings",
  ];

  const filteredCreators = creators.filter((creator) =>
    creator.name.toLowerCase().includes(search.toLowerCase())
  );

  const stats = [
    { title: "Total Creators", value: creators.length, color: "#6558f5" },
    { title: "Active Campaigns", value: 2, color: "#19a984" },
    { title: "Total Campaign Budget", value: "₹1.1L", color: "#f59e0b" },
    { title: "Pending Campaigns", value: 1, color: "#e65380" },
  ];

  return (
    <div
      style={{
        display: "flex",
        minHeight: "100vh",
        background: "#f5f6fc",
        fontFamily: "Arial, sans-serif",
        color: "#20243a",
      }}
    >
      {/* Sidebar */}
      <aside
        style={{
          width: "245px",
          background: "#171b35",
          color: "white",
          padding: "25px 15px",
          boxSizing: "border-box",
          flexShrink: 0,
        }}
      >
        <h2 style={{ margin: "0 0 8px" }}>CreatorIQ</h2>
        <p style={{ color: "#aeb5d1", marginBottom: "35px" }}>
          Agency Portal
        </p>

        {menuItems.map((item) => (
          <button
            key={item}
            onClick={() => setActiveTab(item)}
            style={{
              display: "block",
              width: "100%",
              padding: "13px 12px",
              marginBottom: "8px",
              textAlign: "left",
              border: "none",
              borderRadius: "8px",
              cursor: "pointer",
              color: "white",
              background:
                activeTab === item ? "#635bff" : "transparent",
            }}
          >
            {item}
          </button>
        ))}
      </aside>

      {/* Main dashboard */}
      <main style={{ flex: 1, minWidth: 0, padding: "30px" }}>
        <header
          style={{
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
            flexWrap: "wrap",
            gap: "12px",
            marginBottom: "30px",
          }}
        >
          <div>
            <h1 style={{ margin: 0 }}>{activeTab}</h1>
            <p style={{ color: "#737991" }}>
              Welcome, {user?.name || user?.email || "Agency Manager"}
            </p>
          </div>

          <span
            style={{
              background: "#e6e8ff",
              color: "#5148dc",
              padding: "10px 15px",
              borderRadius: "20px",
            }}
          >
            Agency Manager
          </span>
        </header>

        {/* Overview */}
        {activeTab === "Overview" && (
          <>
            <div
              style={{
                display: "grid",
                gridTemplateColumns:
                  "repeat(auto-fit, minmax(180px, 1fr))",
                gap: "20px",
                marginBottom: "25px",
              }}
            >
              {stats.map((stat) => (
                <div
                  key={stat.title}
                  style={{
                    background: "white",
                    padding: "22px",
                    borderRadius: "14px",
                    borderTop: `4px solid ${stat.color}`,
                    boxShadow: "0 3px 15px #1720440d",
                  }}
                >
                  <p style={{ color: "#737991" }}>{stat.title}</p>
                  <h2 style={{ fontSize: "30px", margin: 0 }}>
                    {stat.value}
                  </h2>
                </div>
              ))}
            </div>

            <div
              style={{
                background: "white",
                padding: "25px",
                borderRadius: "14px",
                marginBottom: "25px",
              }}
            >
              <h2>Recent Campaigns</h2>

              <div style={{ overflowX: "auto" }}>
                <table
                  style={{
                    width: "100%",
                    borderCollapse: "collapse",
                    textAlign: "left",
                  }}
                >
                  <thead>
                    <tr style={{ background: "#f4f6fb" }}>
                      {["Campaign", "Creator", "Budget", "Status"].map(
                        (heading) => (
                          <th key={heading} style={{ padding: "14px" }}>
                            {heading}
                          </th>
                        )
                      )}
                    </tr>
                  </thead>
                  <tbody>
                    {campaigns.map((campaign) => (
                      <tr key={campaign.id}>
                        <td style={{ padding: "14px", borderBottom: "1px solid #eee" }}>
                          {campaign.name}
                        </td>
                        <td style={{ padding: "14px", borderBottom: "1px solid #eee" }}>
                          {campaign.creator}
                        </td>
                        <td style={{ padding: "14px", borderBottom: "1px solid #eee" }}>
                          {campaign.budget}
                        </td>
                        <td style={{ padding: "14px", borderBottom: "1px solid #eee" }}>
                          {campaign.status}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>

            <div
              style={{
                background: "white",
                padding: "25px",
                borderRadius: "14px",
              }}
            >
              <h2>Agency Activity</h2>
              <p>Creator profiles are available for review.</p>
              <p>Campaign progress can be monitored from the Campaigns section.</p>
              <button
                onClick={() => setActiveTab("Creator Management")}
                style={{
                  background: "#635bff",
                  color: "white",
                  border: "none",
                  padding: "12px 18px",
                  borderRadius: "8px",
                  cursor: "pointer",
                }}
              >
                Manage Creators
              </button>
            </div>
          </>
        )}

        {/* Creator Management */}
        {activeTab === "Creator Management" && (
          <section
            style={{
              background: "white",
              padding: "25px",
              borderRadius: "14px",
              overflowX: "auto",
            }}
          >
            <h2>Creator Management</h2>

            <input
              type="text"
              placeholder="Search creator by name..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              style={{
                width: "100%",
                maxWidth: "400px",
                padding: "12px",
                margin: "15px 0 25px",
                border: "1px solid #ddd",
                borderRadius: "8px",
                boxSizing: "border-box",
              }}
            />

            <table
              style={{
                width: "100%",
                borderCollapse: "collapse",
                textAlign: "left",
              }}
            >
              <thead>
                <tr style={{ background: "#f4f6fb" }}>
                  {["Creator", "Platform", "Followers", "Status"].map(
                    (heading) => (
                      <th key={heading} style={{ padding: "14px" }}>
                        {heading}
                      </th>
                    )
                  )}
                </tr>
              </thead>
              <tbody>
                {filteredCreators.map((creator) => (
                  <tr key={creator.id}>
                    <td style={{ padding: "14px", borderBottom: "1px solid #eee" }}>
                      {creator.name}
                    </td>
                    <td style={{ padding: "14px", borderBottom: "1px solid #eee" }}>
                      {creator.platform}
                    </td>
                    <td style={{ padding: "14px", borderBottom: "1px solid #eee" }}>
                      {creator.followers}
                    </td>
                    <td style={{ padding: "14px", borderBottom: "1px solid #eee" }}>
                      {creator.status}
                    </td>
                  </tr>
                ))}
                {filteredCreators.length === 0 && (
                  <tr>
                    <td colSpan="4" style={{ padding: "20px" }}>
                      No creators found.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </section>
        )}

        {/* Campaigns */}
        {activeTab === "Campaigns" && (
          <section
            style={{
              background: "white",
              padding: "25px",
              borderRadius: "14px",
              overflowX: "auto",
            }}
          >
            <h2>Campaign Management</h2>
            <table
              style={{ width: "100%", borderCollapse: "collapse", textAlign: "left" }}
            >
              <thead>
                <tr style={{ background: "#f4f6fb" }}>
                  {["Campaign", "Creator", "Budget", "Status"].map((heading) => (
                    <th key={heading} style={{ padding: "14px" }}>{heading}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {campaigns.map((campaign) => (
                  <tr key={campaign.id}>
                    <td style={{ padding: "14px", borderBottom: "1px solid #eee" }}>{campaign.name}</td>
                    <td style={{ padding: "14px", borderBottom: "1px solid #eee" }}>{campaign.creator}</td>
                    <td style={{ padding: "14px", borderBottom: "1px solid #eee" }}>{campaign.budget}</td>
                    <td style={{ padding: "14px", borderBottom: "1px solid #eee" }}>{campaign.status}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </section>
        )}

        {/* Other sections */}
        {![
          "Overview",
          "Creator Management",
          "Campaigns",
        ].includes(activeTab) && (
          <section
            style={{
              background: "white",
              padding: "30px",
              borderRadius: "14px",
            }}
          >
            <h2>{activeTab}</h2>
            <p style={{ color: "#737991" }}>
              Manage your agency's {activeTab.toLowerCase()} here.
            </p>
            <p>
              This section is a placeholder for the next set of features.
            </p>
          </section>
        )}
      </main>
    </div>
  );
}



function MarketingDashboardold({ user }) {
  const campaigns = [
    { name: "Product Launch", platform: "Instagram", budget: 75000, spent: 52000, status: "Active" },
    { name: "Brand Awareness", platform: "YouTube", budget: 100000, spent: 68000, status: "Active" },
    { name: "Festival Promotion", platform: "Facebook", budget: 50000, spent: 50000, status: "Completed" },
    { name: "Creator Growth", platform: "TikTok", budget: 60000, spent: 24500, status: "Active" }
  ];

  const performanceData = [
    { month: "May", reach: 25000, clicks: 3200 },
    { month: "Jun", reach: 32000, clicks: 4100 },
    { month: "Jul", reach: 28500, clicks: 3800 },
    { month: "Aug", reach: 41000, clicks: 5600 },
    { month: "Sep", reach: 46500, clicks: 6400 },
    { month: "Oct", reach: 52000, clicks: 7800 }
  ];

  const channelData = [
    { name: "Instagram", value: 45 },
    { name: "YouTube", value: 30 },
    { name: "TikTok", value: 15 },
    { name: "Facebook", value: 10 }
  ];

  const totalBudget = campaigns.reduce((sum, campaign) => sum + campaign.budget, 0);
  const totalSpent = campaigns.reduce((sum, campaign) => sum + campaign.spent, 0);

  return (
    <div className="role-dashboard marketing-dashboard">
      <header className="marketing-header">
        <div>
          <p>CreatorIQ / Workspace</p>
          <h1>Marketing Team Dashboard</h1>
          <p>Welcome, {user?.full_name || user?.email || "Marketing User"}!</p>
        </div>
        <span className="marketing-role-badge">Marketing Team</span>
      </header>

      <section className="marketing-stats">
        <div className="dashboard-card">
          <p>Total Reach</p>
          <h2>2.50L</h2>
          <span>Across recent campaigns</span>
        </div>

        <div className="dashboard-card">
          <p>Total Campaigns</p>
          <h2>{campaigns.length}</h2>
          <span>{campaigns.filter(c => c.status === "Active").length} active campaigns</span>
        </div>

        <div className="dashboard-card">
          <p>Total Budget</p>
          <h2>₹{totalBudget.toLocaleString("en-IN")}</h2>
          <span>Allocated campaign budget</span>
        </div>

        <div className="dashboard-card">
          <p>Budget Utilized</p>
          <h2>{Math.round((totalSpent / totalBudget) * 100)}%</h2>
          <span>₹{totalSpent.toLocaleString("en-IN")} spent</span>
        </div>
      </section>

      <section className="marketing-charts">
        <div className="dashboard-card marketing-chart-card">
          <h3>Campaign Performance</h3>
          <p>Monthly reach and clicks</p>

          <ResponsiveContainer width="100%" height={280}>
            <LineChart data={performanceData}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="month" />
              <YAxis />
              <Tooltip />
              <Legend />
              <Line
                type="monotone"
                dataKey="reach"
                name="Reach"
                stroke="#6558e8"
                strokeWidth={3}
              />
              <Line
                type="monotone"
                dataKey="clicks"
                name="Clicks"
                stroke="#19b89a"
                strokeWidth={3}
              />
            </LineChart>
          </ResponsiveContainer>
        </div>

        <div className="dashboard-card marketing-chart-card">
          <h3>Social Media Channels</h3>
          <p>Illustrative audience distribution</p>

          <ResponsiveContainer width="100%" height={280}>
            <PieChart>
              <Pie
                data={channelData}
                dataKey="value"
                nameKey="name"
                cx="50%"
                cy="50%"
                outerRadius={85}
                label
              >
                {channelData.map((channel, index) => (
                  <Cell
                    key={channel.name}
                    fill={["#6558e8", "#19b89a", "#f4b544", "#ed7194"][index]}
                  />
                ))}
              </Pie>
              <Tooltip />
              <Legend />
            </PieChart>
          </ResponsiveContainer>
        </div>
      </section>

      <section className="dashboard-card marketing-chart-card">
        <h3>Monthly Reach Comparison</h3>
        <p>Compare campaign reach with click volume.</p>

        <ResponsiveContainer width="100%" height={280}>
          <BarChart data={performanceData}>
            <CartesianGrid strokeDasharray="3 3" />
            <XAxis dataKey="month" />
            <YAxis />
            <Tooltip />
            <Legend />
            <Bar dataKey="reach" fill="#6558e8" name="Reach" radius={[5, 5, 0, 0]} />
            <Bar dataKey="clicks" fill="#19b89a" name="Clicks" radius={[5, 5, 0, 0]} />
          </BarChart>
        </ResponsiveContainer>
      </section>

      <section className="dashboard-card marketing-campaign-card">
        <h3>Campaign Overview</h3>
        <p>Review campaign budgets and status.</p>

        <div className="marketing-table-wrapper">
          <table className="marketing-table">
            <thead>
              <tr>
                <th>Campaign</th>
                <th>Platform</th>
                <th>Budget</th>
                <th>Spent</th>
                <th>Status</th>
              </tr>
            </thead>

            <tbody>
              {campaigns.map(campaign => (
                <tr key={campaign.name}>
                  <td>{campaign.name}</td>
                  <td>{campaign.platform}</td>
                  <td>₹{campaign.budget.toLocaleString("en-IN")}</td>
                  <td>₹{campaign.spent.toLocaleString("en-IN")}</td>
                  <td>
                    <span className={`marketing-status ${campaign.status.toLowerCase()}`}>
                      {campaign.status}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>
    </div>
  );
}


function AdminDashboardold({ user }) {
  const [activeTab, setActiveTab] = useState("Overview");
  const [search, setSearch] = useState("");

  const [users, setUsers] = useState([
    {
      id: 1,
      name: "Arun Kumar",
      email: "arun@example.com",
      role: "creator",
      status: "Active",
    },
    {
      id: 2,
      name: "Priya Sharma",
      email: "priya@example.com",
      role: "agency",
      status: "Active",
    },
    {
      id: 3,
      name: "Rahul Raj",
      email: "rahul@example.com",
      role: "marketing_team",
      status: "Inactive",
    },
  ]);

  const menuItems = [
    "Overview",
    "User Management",
    "Role & Permissions",
    "Platform Analytics",
    "Content Moderation",
    "Reports",
    "Notifications",
    "Settings",
  ];

  const filteredUsers = users.filter(
    (item) =>
      item.name.toLowerCase().includes(search.toLowerCase()) ||
      item.email.toLowerCase().includes(search.toLowerCase())
  );

  function toggleStatus(id) {
    setUsers((previousUsers) =>
      previousUsers.map((item) =>
        item.id === id
          ? {
              ...item,
              status:
                item.status === "Active" ? "Inactive" : "Active",
            }
          : item
      )
    );
  }

  return (
    <div
      style={{
        display: "flex",
        minHeight: "100vh",
        background: "#f4f6fb",
        fontFamily: "Arial, sans-serif",
        color: "#20243a",
      }}
    >
      {/* Sidebar */}
      <aside
        style={{
          width: "245px",
          background: "#171b35",
          color: "white",
          padding: "25px 15px",
          boxSizing: "border-box",
        }}
      >
        <h2 style={{ marginBottom: "8px" }}>CreatorIQ</h2>
        <p style={{ color: "#aeb5d1", marginBottom: "35px" }}>
          Admin Panel
        </p>

        {menuItems.map((item) => (
          <button
            key={item}
            onClick={() => setActiveTab(item)}
            style={{
              display: "block",
              width: "100%",
              padding: "13px 12px",
              marginBottom: "8px",
              textAlign: "left",
              border: "none",
              borderRadius: "8px",
              cursor: "pointer",
              color: "white",
              background:
                activeTab === item ? "#635bff" : "transparent",
            }}
          >
            {item}
          </button>
        ))}
      </aside>

      {/* Main Content */}
      <main style={{ flex: 1, padding: "30px", minWidth: 0 }}>
        <header
          style={{
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
            flexWrap: "wrap",
            gap: "15px",
            marginBottom: "30px",
          }}
        >
          <div>
            <h1 style={{ margin: 0 }}>{activeTab}</h1>
            <p style={{ color: "#737991" }}>
              Welcome, {user?.name || user?.email || "Administrator"}
            </p>
          </div>
          <span
            style={{
              background: "#e6e8ff",
              color: "#5148dc",
              padding: "10px 15px",
              borderRadius: "20px",
            }}
          >
            Administrator
          </span>
        </header>

        {/* Overview */}
        {activeTab === "Overview" && (
          <>
            <div
              style={{
                display: "grid",
                gridTemplateColumns:
                  "repeat(auto-fit, minmax(180px, 1fr))",
                gap: "20px",
                marginBottom: "30px",
              }}
            >
              {[
                {
                  title: "Total Users",
                  value: users.length,
                  color: "#635bff",
                },
                {
                  title: "Active Users",
                  value: users.filter((u) => u.status === "Active").length,
                  color: "#159b75",
                },
                {
                  title: "Inactive Users",
                  value: users.filter((u) => u.status === "Inactive").length,
                  color: "#e18b37",
                },
                {
                  title: "User Roles",
                  value: 4,
                  color: "#db5796",
                },
              ].map((card) => (
                <div
                  key={card.title}
                  style={{
                    background: "white",
                    padding: "25px",
                    borderRadius: "14px",
                    borderTop: `4px solid ${card.color}`,
                    boxShadow: "0 3px 15px #1720440d",
                  }}
                >
                  <p style={{ color: "#737991" }}>{card.title}</p>
                  <h2 style={{ fontSize: "32px", margin: 0 }}>
                    {card.value}
                  </h2>
                </div>
              ))}
            </div>

            <div
              style={{
                background: "white",
                padding: "25px",
                borderRadius: "14px",
              }}
            >
              <h2>Recent Users</h2>
              <p style={{ color: "#737991" }}>
                Manage registered users and their account status.
              </p>
              <button
                onClick={() => setActiveTab("User Management")}
                style={{
                  background: "#635bff",
                  color: "white",
                  border: "none",
                  padding: "12px 18px",
                  borderRadius: "8px",
                  cursor: "pointer",
                }}
              >
                Manage Users
              </button>
            </div>
          </>
        )}

        {/* User Management */}
        {activeTab === "User Management" && (
          <section
            style={{
              background: "white",
              padding: "25px",
              borderRadius: "14px",
              overflowX: "auto",
            }}
          >
            <h2>User Management</h2>

            <input
              type="text"
              placeholder="Search by name or email..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              style={{
                width: "100%",
                maxWidth: "400px",
                padding: "12px",
                margin: "15px 0 25px",
                border: "1px solid #ddd",
                borderRadius: "8px",
                boxSizing: "border-box",
              }}
            />

            <table
              style={{
                width: "100%",
                borderCollapse: "collapse",
                textAlign: "left",
              }}
            >
              <thead>
                <tr style={{ background: "#f4f6fb" }}>
                  {["Name", "Email", "Role", "Status", "Action"].map(
                    (heading) => (
                      <th
                        key={heading}
                        style={{ padding: "14px" }}
                      >
                        {heading}
                      </th>
                    )
                  )}
                </tr>
              </thead>

              <tbody>
                {filteredUsers.map((item) => (
                  <tr key={item.id}>
                    <td style={{ padding: "14px", borderBottom: "1px solid #eee" }}>
                      {item.name}
                    </td>
                    <td style={{ padding: "14px", borderBottom: "1px solid #eee" }}>
                      {item.email}
                    </td>
                    <td style={{ padding: "14px", borderBottom: "1px solid #eee" }}>
                      {item.role}
                    </td>
                    <td style={{ padding: "14px", borderBottom: "1px solid #eee" }}>
                      <span
                        style={{
                          color:
                            item.status === "Active"
                              ? "#159b75"
                              : "#d35454",
                        }}
                      >
                        {item.status}
                      </span>
                    </td>
                    <td style={{ padding: "14px", borderBottom: "1px solid #eee" }}>
                      <button
                        onClick={() => toggleStatus(item.id)}
                        style={{
                          padding: "8px 12px",
                          border: "none",
                          borderRadius: "6px",
                          cursor: "pointer",
                          background: "#e6e8ff",
                          color: "#5148dc",
                        }}
                      >
                        {item.status === "Active"
                          ? "Deactivate"
                          : "Activate"}
                      </button>
                    </td>
                  </tr>
                ))}

                {filteredUsers.length === 0 && (
                  <tr>
                    <td colSpan="5" style={{ padding: "20px" }}>
                      No users found.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </section>
        )}

        {/* Other Sections */}
        {!["Overview", "User Management"].includes(activeTab) && (
          <section
            style={{
              background: "white",
              padding: "30px",
              borderRadius: "14px",
            }}
          >
            <h2>{activeTab}</h2>
            <p style={{ color: "#737991" }}>
              Manage {activeTab.toLowerCase()} from this section.
            </p>
            <p>
              This section is ready for you to add the required features.
            </p>
          </section>
        )}
      </main>
    </div>
  );
}


function RoleDashboard({ user, activeNav }) {
  switch (user?.role) {
    case "creator":
      return <CreatorDashboard user={user} activeNav={activeNav} />;

    case "agency":
      return <AgencyDashboard user={user} />;

    case "marketing_team":
      return <MarketingDashboard user={user} />;

    case "administrator":
      return <AdminDashboard user={user} />;

    default:
      return <p>Unknown role. Please contact the administrator.</p>;
  }
}

function RoleBasedDashboard() {
  const [user, setUser] = useState(() => {
    try {
      return JSON.parse(sessionStorage.getItem("user") || "null");
    } catch {
      return null;
    }
  });

  const [loading, setLoading] = useState(true);

  useEffect(() => {
    apiRequest("/auth/me")
      .then((currentUser) => {
        setUser(currentUser);
        sessionStorage.setItem("user", JSON.stringify(currentUser));
      })
      .catch(() => {
        sessionStorage.removeItem("access_token");
        sessionStorage.removeItem("user");
        setUser(null);
      })
      .finally(() => setLoading(false));
  }, []);

  if (loading) {
    return <div className="loading-screen">Loading dashboard...</div>;
  }

  if (!user) {
    return <Navigate to="/login" replace />;
  }

  return <RoleDashboard user={user} activeNav="Overview" />;
}



function Dashboard() {
  const navigate = useNavigate();
  const [user, setUser] = useState(() => {
    try { return JSON.parse(sessionStorage.getItem("user") || "null"); } catch { return null; }
  });
  const [profile, setProfile] = useState({ full_name: "", bio: "", social_links: "" });
  const [editing, setEditing] = useState(false);
  const [message, setMessage] = useState("");
  const [activeNav, setActiveNav] = useState("Overview");

  useEffect(() => {
    apiRequest("/auth/me").then(setUser).catch(() => {});
    apiRequest("/users/profile").then(data => setProfile({
      full_name: data.full_name || "", bio: data.bio || "", social_links: data.social_links || ""
    })).catch(() => {});
  }, []);

  async function saveProfile(event) {
    event.preventDefault(); setMessage("");
    try {
      const updated = await apiRequest("/users/profile", { method: "PUT", body: JSON.stringify(profile) });
      setUser(updated); sessionStorage.setItem("user", JSON.stringify(updated));
      setEditing(false); setMessage("Profile updated successfully.");
    } catch (err) { setMessage(err.message); }
  }

  function logout() {
    sessionStorage.removeItem("access_token"); sessionStorage.removeItem("user");
    navigate("/login");
  }

  const initials = (user?.full_name || user?.email || "U").slice(0, 1).toUpperCase();

  return <div className="dashboard-shell">
    <aside className="dash-sidebar">
      <Brand />
      <div className="workspace-label">WORKSPACE</div>
      <nav>
        {[["Overview", BarChart3], ["Creator network", Users], ["Analytics", TrendingUp], ["Activity", Activity]].map(([name, Icon]) =>
          <button key={name} className={`nav-item ${activeNav === name ? "active" : ""}`} onClick={() => setActiveNav(name)}><Icon size={18}/>{name}</button>)}
      </nav>
      <div className="sidebar-bottom">
        <button className={`nav-item ${activeNav === "Settings" ? "active" : ""}`} onClick={() => { setActiveNav("Settings"); setEditing(true); }}><ShieldCheck size={18}/>Account settings</button>
        <div className="sidebar-user"><div className="avatar">{initials}</div><span><strong>{user?.full_name || "CreatorIQ user"}</strong><small>{(user?.role || "member").replace("_", " ")}</small></span><button className="logout-icon" onClick={logout} title="Sign out">↗</button></div>
      </div>
    </aside>
    <main className="dash-main">
      <header className="dash-header"><div><div className="eyebrow">YOUR WORKSPACE / {activeNav.toUpperCase()}</div><h1>{activeNav === "Settings" ? "Account settings" : `Welcome back${user?.full_name ? `, ${user.full_name.split(" ")[0]}` : ""}`} <span className="wave">✦</span></h1><p>Here's what's happening with your creator journey today.</p></div><div className="header-actions"><button className="icon-button" title="Notifications"><Bell size={18}/><span/></button><div className="header-avatar">{initials}</div></div></header>
      {message && <div className={`alert ${message.includes("successfully") ? "success" : "error"}`}>{message}</div>}
      {activeNav === "Settings" || editing ? <section className="profile-panel">
        <div className="panel-heading"><div><h2>Profile & preferences</h2><p>Manage the information associated with your account.</p></div><span className="panel-icon"><ShieldCheck size={20}/></span></div>
        <form onSubmit={saveProfile} className="profile-form">
          <label>Full name<input value={profile.full_name} onChange={e => setProfile({...profile, full_name:e.target.value})} required minLength={2}/></label>
          <label>Email address<input value={user?.email || ""} disabled /></label>
          <label>Role<input value={(user?.role || "").replace("_", " ")} disabled /></label>
          <label>Bio<textarea value={profile.bio} onChange={e => setProfile({...profile, bio:e.target.value})} rows={3} maxLength={1000} placeholder="Tell your network a little about yourself"/></label>
          <label>Social links<input value={profile.social_links} onChange={e => setProfile({...profile, social_links:e.target.value})} placeholder="https://..."/></label>
          <div className="profile-actions"><button className="secondary-button" type="button" onClick={() => { setEditing(false); setActiveNav("Overview"); }}>Cancel</button><button className="primary-button" type="submit">Save changes <ArrowRight size={16}/></button></div>
        </form>
      </section> : <>
        <div className="dash-callout"><div className="callout-symbol"><Sparkles size={22}/></div><div><strong>Your CreatorIQ workspace is ready</strong><p>Complete your profile to get a more personalized creator analytics experience.</p></div><button onClick={() => { setEditing(true); setActiveNav("Settings"); }}>Complete profile <ArrowRight size={15}/></button></div>
        <div className="metric-grid">
          <Metric icon={<Users size={19}/>} label="Profile status" value="Getting started" trend="Finish your profile" tone="violet"/>
          <Metric icon={<TrendingUp size={19}/>} label="Account type" value={(user?.role || "Creator").replace("_", " ")} trend="Role-based access" tone="blue"/>
          <Metric icon={<ShieldCheck size={19}/>} label="Security" value="Protected" trend="JWT authenticated" tone="green"/>
        </div>
        <div className="dash-content-grid">
          <section className="content-panel"><div className="panel-heading"><div><h2>Quick start</h2><p>Three steps to make the most of CreatorIQ.</p></div><span className="panel-icon"><Activity size={20}/></span></div>
            {[["01","Complete your profile","Add your bio and social links.",()=>{setEditing(true);setActiveNav("Settings");}],["02","Explore your workspace","Your role determines available features.",()=>setActiveNav("Creator network")],["03","Connect your workflow","Analytics integrations can be added next.",()=>setActiveNav("Analytics")]].map(([n,title,desc,action])=><button className="quick-row" key={n} onClick={action}><span className="quick-number">{n}</span><span className="quick-copy"><strong>{title}</strong><small>{desc}</small></span><ArrowRight size={16}/></button>)}
          </section>
          <section className="content-panel account-panel"><div className="panel-heading"><div><h2>Your account</h2><p>Account identity and access.</p></div><span className="panel-icon"><Users size={20}/></span></div>
            <div className="account-avatar">{initials}</div><h3>{user?.full_name || "CreatorIQ user"}</h3><p className="account-email">{user?.email || ""}</p><span className="role-chip">{(user?.role || "member").replace("_", " ")}</span><div className="account-separator"/><div className="account-detail"><span>Access</span><strong><span className="status-dot"/> Active</strong></div><div className="account-detail"><span>Authentication</span><strong>JWT bearer</strong></div><button className="outline-full" onClick={() => {setEditing(true);setActiveNav("Settings");}}>Manage account <ArrowRight size={15}/></button>
          </section>
        </div>
      </>}
      <footer className="dash-footer"><span>© 2026 CreatorIQ</span><span><ShieldCheck size={13}/> Your workspace is protected</span></footer>
    </main>
  </div>;
}

function Metric({icon,label,value,trend,tone}) {
  return <div className="metric-card"><span className={`metric-icon ${tone}`}>{icon}</span><span className="metric-label">{label}</span><strong className="metric-value">{value}</strong><span className="metric-trend">{trend}</span></div>;
}

function AppRoutes() {
  return <Routes>
    <Route path="/" element={<Navigate to="/login" replace/>}/>
    <Route path="/login" element={<Login/>}/>
    <Route path="/register" element={<Register/>}/>
    <Route
  path="/dashboard"
  element={
    <ProtectedRoute>
      <RoleBasedDashboard />
    </ProtectedRoute>
  }
/>
<Route path="*" element={<Navigate to="/login" replace/>}/>
  </Routes>;
}

export default function App() {
  return <BrowserRouter><AppRoutes/></BrowserRouter>;
}
