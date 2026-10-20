import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { loginUser, getProfile } from "./api";
import "./Auth.css";

export default function Login() {
  const navigate = useNavigate();

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  async function handleLogin(event) {
    event.preventDefault();
    setError("");
    setLoading(true);

    try {
      await loginUser(email.trim().toLowerCase(), password);
      await getProfile();

      navigate("/dashboard");
    } catch (err) {
      setError(err.message || "Login failed. Please try again.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <main className="auth-layout">
      <section className="auth-hero">
        <div className="hero-content">
          <span className="eyebrow">
            YOUR CONTENT. YOUR NEXT CHAPTER.
          </span>

          <h1>
            From content
            <br />
            to <span>opportunities.</span>
          </h1>

          <p className="hero-description">
            Turn your social content into real insights. Understand
            your audience, discover what works, and make your next move
            with confidence.
          </p>

          <div className="hero-features">
            <span>▥ Track performance</span>
            <span>◎ Audience insights</span>
            <span>♡ Brand collaborations</span>
            <span>↗ Grow your reach</span>
          </div>

          <div className="hero-visual">
            <div className="visual-heading">
              <span>CREATORIQ ANALYTICS</span>
              <h2>Your content, understood.</h2>
              <p>Insights that move you forward.</p>
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
          <span className="eyebrow purple">WELCOME BACK</span>

          <h2>Good to see you.</h2>

          <p className="form-subtitle">
            Log in to your account and keep your creator journey moving.
          </p>

          <form onSubmit={handleLogin}>
            <label htmlFor="loginEmail">Email address</label>

            <input
              id="loginEmail"
              type="email"
              placeholder="Enter your email"
              value={email}
              onChange={(event) => setEmail(event.target.value)}
              autoComplete="email"
              required
            />

            <label htmlFor="loginPassword">Password</label>

            <div className="password-wrap">
              <input
                id="loginPassword"
                type={showPassword ? "text" : "password"}
                placeholder="Enter your password"
                value={password}
                onChange={(event) => setPassword(event.target.value)}
                autoComplete="current-password"
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

            {error && (
              <p className="auth-error" role="alert">
                {error}
              </p>
            )}

            <div className="login-options">
              <label className="remember-me">
                <input type="checkbox" />
                Remember me
              </label>

              <a
                href="/forgot-password"
                className="forgot-password"
              >
                Forgot password?
              </a>
            </div>

            <button
              type="submit"
              className="login-button"
              disabled={loading}
            >
              {loading ? "Logging in..." : "Login"}
            </button>

            <div className="social-divider">
              <span>or continue with</span>
            </div>

            <div className="social-login">
              <button
                type="button"
                className="social-button"
                onClick={() =>
                  alert("Google login setup is required.")
                }
              >
                <span className="google-icon">G</span>
                Google
              </button>

              <button
                type="button"
                className="social-button"
                onClick={() =>
                  alert("Apple login setup is required.")
                }
              >
                <span className="apple-icon">●</span>
                Apple
              </button>

              <button
                type="button"
                className="social-button"
                onClick={() =>
                  alert("LinkedIn login setup is required.")
                }
              >
                <span className="linkedin-icon">in</span>
                LinkedIn
              </button>
            </div>
          </form>

          <p className="auth-switch">
            Don't have an account?{" "}
            <a href="/register">Sign up →</a>
          </p>
        </div>
      </section>
    </main>
  );
}