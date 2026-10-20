import { useState } from "react";
import { registerUser } from "./api";
import "./Auth.css";

const roles = [
  {
    name: "Creator",
    description: "Grow your audience",
    icon: "✦",
  },
  {
    name: "Agency",
    description: "Manage creators",
    icon: "◈",
  },
  {
    name: "Marketing Team",
    description: "Analyze campaigns",
    icon: "▥",
  },
  {
    name: "Administrator",
    description: "Manage the platform",
    icon: "⚙",
  },
];

export default function Register() {
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [gender, setGender] = useState("");
  const [role, setRole] = useState("Creator");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  async function handleRegister(event) {
    event.preventDefault();
    setMessage("");
    setError("");

    if (password.length < 8) {
      setError("Password must contain at least 8 characters.");
      return;
    }

    if (password !== confirmPassword) {
      setError("Passwords do not match.");
      return;
    }

    setLoading(true);

    try {
      await registerUser({
        name: name.trim(),
        email: email.trim().toLowerCase(),
        gender,
        password,
        role,
      });

      setMessage("Account created successfully! You can now log in.");
      setName("");
      setEmail("");
      setGender("");
      setPassword("");
      setConfirmPassword("");
      setRole("Creator");
    } catch (err) {
      setError(err.message || "Unable to create account.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <main className="auth-layout">
      <section className="auth-hero">
        <div className="hero-content">
          <span className="eyebrow">MAKE YOUR NEXT MOVE COUNT.</span>

          <h1>
            Your creativity
            <br />
            deserves to <span>grow.</span>
          </h1>

          <p className="hero-description">
            Join a smarter space for creator insights, audience
            understanding, and meaningful brand opportunities.
          </p>

          <div className="hero-features">
            <span>↗ Know your numbers</span>
            <span>◎ Understand your audience</span>
            <span>✦ Find new opportunities</span>
          </div>

          <div className="hero-visual">
            <div className="visual-glow glow-one" />
            <div className="visual-glow glow-two" />

            <div className="visual-heading">
              <span>CREATORIQ ANALYTICS</span>
              <h2>Make your content count.</h2>
              <p>Every insight moves you forward.</p>
            </div>

            <div className="analytics-cards">
              <div className="metric-card">
                <span>Total followers</span>
                <strong>1.2M</strong>
                <small>↗ Audience growth</small>
              </div>

              <div className="metric-card metric-bottom">
                <span>Engagement rate</span>
                <strong>8.4%</strong>
                <div className="chart-bars">
                  {[25, 40, 32, 58, 44, 72, 88].map(
                    (height, index) => (
                      <i
                        key={index}
                        style={{ height: `${height}%` }}
                      />
                    )
                  )}
                </div>
              </div>
            </div>

            <div className="visual-footer">
              ✦ One space for your creator journey
            </div>
          </div>
        </div>
      </section>

      <section className="auth-form-panel">
        <div className="auth-form-wrap">
          <span className="eyebrow purple">CREATE YOUR ACCOUNT</span>
          <h2>Start your journey.</h2>
          <p className="form-subtitle">
            A few details. A whole lot of possibility.
          </p>

          <form onSubmit={handleRegister}>
            <label htmlFor="fullName">Full name</label>
            <input
              id="fullName"
              type="text"
              placeholder="Enter your full name"
              value={name}
              onChange={(event) => setName(event.target.value)}
              minLength={2}
              maxLength={100}
              autoComplete="name"
              required
            />

            <label htmlFor="registerEmail">Email address</label>
            <input
              id="registerEmail"
              type="email"
              placeholder="Enter your email"
              value={email}
              onChange={(event) => setEmail(event.target.value)}
              autoComplete="email"
              required
            />

            <label htmlFor="registerGender">Gender</label>
            <select
              id="registerGender"
              name="gender"
              value={gender}
              onChange={(event) => setGender(event.target.value)}
              required
            >
              <option value="">Select your gender</option>
              <option value="Male">Male</option>
              <option value="Female">Female</option>
              <option value="Prefer not to say">Prefer not to say</option>
            </select>

            <label>Choose your workspace</label>
            <div className="role-grid">
              {roles.map((item) => (
                <button
                  type="button"
                  key={item.name}
                  className={`role-card ${
                    role === item.name ? "selected" : ""
                  }`}
                  onClick={() => setRole(item.name)}
                  aria-pressed={role === item.name}
                >
                  <span className="role-icon">{item.icon}</span>
                  <span className="role-copy">
                    <strong>{item.name}</strong>
                    <small>{item.description}</small>
                  </span>
                  <span className="role-check">
                    {role === item.name ? "✓" : "+"}
                  </span>
                </button>
              ))}
            </div>

            <label htmlFor="registerPassword">Password</label>
            <div className="password-wrap">
              <input
                id="registerPassword"
                type={showPassword ? "text" : "password"}
                placeholder="Create a password (8+ characters)"
                value={password}
                onChange={(event) => setPassword(event.target.value)}
                minLength={8}
                maxLength={128}
                autoComplete="new-password"
                required
              />
              <button
                type="button"
                className="password-toggle"
                onClick={() => setShowPassword(!showPassword)}
              >
                {showPassword ? "Hide" : "Show"}
              </button>
            </div>

            <label htmlFor="confirmPassword">Confirm password</label>
            <input
              id="confirmPassword"
              type={showPassword ? "text" : "password"}
              placeholder="Re-enter your password"
              value={confirmPassword}
              onChange={(event) =>
                setConfirmPassword(event.target.value)
              }
              autoComplete="new-password"
              required
            />

            {error && <p className="auth-error">{error}</p>}
            {message && <p className="auth-success">{message}</p>}

            <button
              className="primary-auth-button"
              type="submit"
              disabled={loading}
            >
              {loading ? "Creating account..." : "Create my account  →"}
            </button>
          </form>

          <p className="auth-switch">
            Already have an account? <a href="/login">Log in →</a>
          </p>

          <p className="auth-terms">
            By creating an account, you agree to our Terms and Privacy
            Policy.
          </p>
        </div>
      </section>
    </main>
  );
}