import React, { useState } from "react";
import {
  createUserWithEmailAndPassword,
  signInWithPopup,
  updateProfile,
} from "firebase/auth";
import { doc, getDoc, setDoc, serverTimestamp } from "firebase/firestore";
import {
  auth,
  db,
  googleProvider,
  isFirebaseConfigured,
} from "./firebase";
import {
  BarChart3,
  TrendingUp,
  ShieldCheck,
  Mail,
  Lock,
  User,
  Eye,
  EyeOff,
  AlertCircle,
  ArrowRight,
  Sparkles,
  Database,
  CheckCircle2,
} from "lucide-react";
import { ROLE_CONFIGS, registerUserProfile } from "./authService";

export default function SignUp({
  onSwitchToLogin,
  onDemoSignUp,
  onSignUpSuccess,
  selectedRole = "Creator",
  onSelectRole,
}) {
  const [role, setRole] = useState(selectedRole);
  const [fullName, setFullName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);

  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");
  const [successMessage, setSuccessMessage] = useState("");

  const handleRoleSelect = (roleId) => {
    setRole(roleId);
    if (onSelectRole) {
      onSelectRole(roleId);
    }
  };

  const currentRoleObj =
    ROLE_CONFIGS.find((r) => r.id === role) || ROLE_CONFIGS[0];

  const getFriendlyErrorMessage = (errCode) => {
    switch (errCode) {
      case "auth/email-already-in-use":
        return "An account with this email already exists. Please sign in instead.";
      case "auth/invalid-email":
        return "Please enter a valid email address.";
      case "auth/weak-password":
        return "Password is too weak. Please use at least 6 characters.";
      case "auth/popup-closed-by-user":
        return "Google sign-in popup was closed before completing.";
      case "auth/popup-blocked":
        return "Google sign-in popup was blocked by your browser. Please allow popups.";
      default:
        return errCode || "An unexpected error occurred. Please try again.";
    }
  };

  const saveUserToFirestore = async (userObj, assignedRole, isGoogle = false) => {
    return await registerUserProfile(userObj, assignedRole, isGoogle);
  };

  const handleSignUp = async (e) => {
    e.preventDefault();
    setError("");
    setSuccessMessage("");

    if (!fullName.trim()) {
      setError("Please enter your full name.");
      return;
    }
    if (!email.trim()) {
      setError("Please enter your email address.");
      return;
    }
    if (password.length < 6) {
      setError("Password must be at least 6 characters.");
      return;
    }
    if (password !== confirmPassword) {
      setError("Passwords do not match.");
      return;
    }

    if (!isFirebaseConfigured && !auth) {
      const demoUserObj = {
        uid: `usr_${role.toLowerCase().slice(0, 3)}_${Date.now().toString(36)}`,
        displayName: fullName.trim(),
        email: email.trim(),
      };
      const profile = await registerUserProfile(demoUserObj, role, false);
      if (onSignUpSuccess) {
        onSignUpSuccess(demoUserObj, profile);
      } else if (onDemoSignUp) {
        onDemoSignUp({
          fullName: fullName.trim(),
          email: email.trim(),
          role: role,
        });
      }
      return;
    }

    setSubmitting(true);
    try {
      const userCredential = await createUserWithEmailAndPassword(
        auth,
        email.trim(),
        password
      );
      const newUser = userCredential.user;

      await updateProfile(newUser, {
        displayName: fullName.trim(),
      });

      const profile = await saveUserToFirestore(
        { ...newUser, displayName: fullName.trim() },
        role,
        false
      );

      setSuccessMessage("Account created and synced successfully!");

      if (onSignUpSuccess) {
        onSignUpSuccess(newUser, profile);
      }
    } catch (err) {
      console.error("Sign up error:", err);
      setError(getFriendlyErrorMessage(err.code || err.message));
    } finally {
      setSubmitting(false);
    }
  };

  const handleGoogleSignUp = async () => {
    setError("");
    setSuccessMessage("");

    if (!isFirebaseConfigured && !auth) {
      const demoUserObj = {
        uid: `usr_${role.toLowerCase().slice(0, 3)}_${Date.now().toString(36)}`,
        displayName: role === "Admin" ? "Platform Administrator" : `${role} User`,
        email: `${role.toLowerCase().replace(/\s+/g, "")}@creatoriq.io`,
      };
      const profile = await registerUserProfile(demoUserObj, role, true);
      if (onSignUpSuccess) {
        onSignUpSuccess(demoUserObj, profile);
      } else if (onDemoSignUp) {
        onDemoSignUp({
          fullName: demoUserObj.displayName,
          email: demoUserObj.email,
          role: role,
          photoURL: null,
          provider: "google",
        });
      }
      return;
    }

    setSubmitting(true);
    try {
      const result = await signInWithPopup(auth, googleProvider);
      const googleUser = result.user;

      const profile = await saveUserToFirestore(googleUser, role, true);

      if (onSignUpSuccess) {
        onSignUpSuccess(googleUser, profile);
      }
    } catch (err) {
      console.error("Google Auth error:", err);
      setError(getFriendlyErrorMessage(err.code || err.message));
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div style={styles.splitScreenContainer}>
      {/* Left Pane: Full-Screen Brand & Product Showcase */}
      <div style={styles.leftBrandPane}>
        <div style={styles.bgGlowTopLeft}></div>
        <div style={styles.bgGlowBottomRight}></div>
        <div style={styles.bgGridPattern}></div>

        <div style={styles.leftBrandContent}>
          {/* Brand Header */}
          <div style={styles.brandHeader}>
            <div style={styles.brandLogoIcon}>
              <BarChart3 size={24} color="#ffffff" />
            </div>
            <div>
              <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                <h2 style={styles.brandLogoText}>CreatorIQ</h2>
                <span style={styles.enterprisePill}>ENTERPRISE</span>
              </div>
              <p style={styles.brandTagline}>Creator Analytics & Intelligence Suite</p>
            </div>
          </div>

          {/* Hero Section */}
          <div style={styles.heroTextSection}>
            <h1 style={styles.heroTitle}>
              Scale your creator growth with intelligence.
            </h1>
            <p style={styles.heroDescription}>
              Purpose-built analytics engine for content creators, talent agencies, brand marketing teams, and platform administrators.
            </p>
          </div>

          {/* Features Overview */}
          <div style={styles.featureList}>
            <div style={styles.featureItem}>
              <div style={{ ...styles.featureIcon, backgroundColor: "#eff6ff", borderColor: "#bfdbfe" }}>
                <ShieldCheck size={18} color="#1d4ed8" />
              </div>
              <div>
                <h4 style={styles.featureTitle}>Role-Based Access Control</h4>
                <p style={styles.featureDesc}>
                  Tailored dashboards with custom permissions for Creators, Agencies, Marketing Teams & Admins.
                </p>
              </div>
            </div>

            <div style={styles.featureItem}>
              <div style={{ ...styles.featureIcon, backgroundColor: "#f0fdf4", borderColor: "#bbf7d0" }}>
                <Database size={18} color="#15803d" />
              </div>
              <div>
                <h4 style={styles.featureTitle}>Real-Time Firestore Sync</h4>
                <p style={styles.featureDesc}>
                  Instant cloud synchronization for profiles, performance metrics, and registrations.
                </p>
              </div>
            </div>

            <div style={styles.featureItem}>
              <div style={{ ...styles.featureIcon, backgroundColor: "#f5f3ff", borderColor: "#ddd6fe" }}>
                <TrendingUp size={18} color="#6d28d9" />
              </div>
              <div>
                <h4 style={styles.featureTitle}>Comprehensive Analytics</h4>
                <p style={styles.featureDesc}>
                  Multi-platform reach, benchmark engagement, and attribution conversion ROI.
                </p>
              </div>
            </div>
          </div>

          {/* Live Benchmarking Card */}
          <div style={styles.socialProofCard}>
            <div style={styles.socialProofHeader}>
              <Sparkles size={15} color="#1d4ed8" />
              <span>Enterprise Live Benchmarking</span>
              <span style={styles.liveDot}></span>
            </div>
            <div style={styles.socialProofMetrics}>
              <div>
                <span style={styles.spNum}>99.9%</span>
                <span style={styles.spText}>Platform Uptime</span>
              </div>
              <div style={styles.spDivider}></div>
              <div>
                <span style={styles.spNum}>50k+</span>
                <span style={styles.spText}>Active Creators</span>
              </div>
              <div style={styles.spDivider}></div>
              <div>
                <span style={styles.spNum}>&lt; 50ms</span>
                <span style={styles.spText}>Cloud Latency</span>
              </div>
            </div>
          </div>

          {/* Security Compliance Footer */}
          <div style={styles.trustFooter}>
            <span style={styles.trustText}>
              🔒 SOC2 Type II Certified • GDPR Compliant • AES-256 Cloud Encryption
            </span>
          </div>
        </div>
      </div>

      {/* Right Pane: Full-Screen Authentication Form */}
      <div style={styles.rightFormPane}>
        <div style={styles.formContainerWrapper}>
          {!isFirebaseConfigured && (
            <div style={styles.configNotice}>
              <div style={{ display: "flex", gap: 10, alignItems: "center" }}>
                <AlertCircle size={16} color="#1d4ed8" style={{ flexShrink: 0 }} />
                <span style={{ color: "#334155", fontSize: "12px" }}>
                  <strong style={{ color: "#1e40af" }}>Interactive Preview: </strong>
                  Register and test role portals immediately without cloud setup!
                </span>
              </div>
            </div>
          )}

          {/* Navigation Switcher Tabs (Create Account vs Sign In) */}
          <div style={styles.tabContainer}>
            <button
              type="button"
              style={{ ...styles.tabButton, ...styles.tabButtonActive }}
            >
              Create Account
            </button>
            <button
              type="button"
              onClick={onSwitchToLogin}
              style={styles.tabButton}
            >
              Sign In
            </button>
          </div>

          {/* Horizontal Role Selector Tabs */}
          <div style={styles.roleTabsContainer}>
            <div style={styles.roleTabsHeader}>
              <span style={styles.roleTabsLabel}>SELECT REGISTRATION ROLE</span>
              <span
                style={{
                  ...styles.roleBadgeActive,
                  backgroundColor: currentRoleObj.badgeBg,
                  color: currentRoleObj.badgeColor,
                  borderColor: currentRoleObj.badgeColor + "33",
                }}
              >
                {currentRoleObj.badge}
              </span>
            </div>

            <div style={styles.roleTabsGrid}>
              {ROLE_CONFIGS.map((r) => {
                const IconComponent = r.icon;
                const isActive = role === r.id;
                return (
                  <button
                    type="button"
                    key={r.id}
                    onClick={() => handleRoleSelect(r.id)}
                    style={{
                      ...styles.roleTabButton,
                      ...(isActive ? styles.roleTabButtonActive : {}),
                    }}
                  >
                    <div
                      style={{
                        ...styles.roleTabIconWrap,
                        backgroundColor: isActive ? r.accentLight : "#f8fafc",
                        color: isActive ? r.accentColor : "#64748b",
                      }}
                    >
                      <IconComponent size={15} />
                    </div>
                    <span
                      style={{
                        ...styles.roleTabTitle,
                        color: isActive ? "#0f172a" : "#475569",
                        fontWeight: isActive ? 600 : 500,
                      }}
                    >
                      {r.shortTitle}
                    </span>
                    {isActive && (
                      <div
                        style={{
                          ...styles.roleTabActiveIndicator,
                          backgroundColor: r.accentColor,
                        }}
                      />
                    )}
                  </button>
                );
              })}
            </div>

            {/* Role Context Callout */}
            <div
              style={{
                ...styles.roleContextBanner,
                borderColor: currentRoleObj.accentColor + "33",
                backgroundColor: currentRoleObj.accentLight,
              }}
            >
              <div style={styles.roleContextLeft}>
                <div style={styles.roleContextTitleRow}>
                  <span style={{ ...styles.roleContextTitle, color: currentRoleObj.badgeColor }}>
                    {currentRoleObj.title} Account
                  </span>
                  <span style={styles.roleContextTagline}>• {currentRoleObj.tagline}</span>
                </div>
              </div>
            </div>
          </div>

          {/* Form Header */}
          <div style={styles.formHeader}>
            <h2 style={styles.formHeading}>Get started with CreatorIQ</h2>
            <p style={styles.formSubheading}>
              Register to unlock intelligence for your {currentRoleObj.title.toLowerCase()} workflow.
            </p>
          </div>

          {error && (
            <div style={styles.errorAlert}>
              <AlertCircle size={15} color="#b91c1c" style={{ flexShrink: 0 }} />
              <span>{error}</span>
            </div>
          )}

          {successMessage && (
            <div style={styles.successAlert}>
              <CheckCircle2 size={15} color="#15803d" style={{ flexShrink: 0 }} />
              <span>{successMessage}</span>
            </div>
          )}

          {/* Google Authentication Button */}
          <button
            type="button"
            onClick={handleGoogleSignUp}
            disabled={submitting}
            style={styles.googleButton}
          >
            <svg width="18" height="18" viewBox="0 0 24 24" style={{ marginRight: 10 }}>
              <path
                fill="#4285F4"
                d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
              />
              <path
                fill="#34A853"
                d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
              />
              <path
                fill="#FBBC05"
                d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z"
              />
              <path
                fill="#EA4335"
                d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z"
              />
            </svg>
            <span>Sign up with Google</span>
          </button>

          <div style={styles.divider}>
            <div style={styles.dividerLine}></div>
            <span style={styles.dividerText}>or register with email</span>
            <div style={styles.dividerLine}></div>
          </div>

          {/* Email Registration Form */}
          <form onSubmit={handleSignUp} style={styles.form}>
            <div style={styles.inputRowTwoCol}>
              <div style={styles.inputGroup}>
                <label style={styles.inputLabel}>Full Name</label>
                <div style={styles.inputWrapper}>
                  <User size={16} color="#64748b" style={styles.inputIcon} />
                  <input
                    type="text"
                    placeholder="Enter your full name"
                    value={fullName}
                    onChange={(e) => setFullName(e.target.value)}
                    required
                    style={styles.inputField}
                  />
                </div>
              </div>

              <div style={styles.inputGroup}>
                <label style={styles.inputLabel}>Work Email</label>
                <div style={styles.inputWrapper}>
                  <Mail size={16} color="#64748b" style={styles.inputIcon} />
                  <input
                    type="email"
                    placeholder="you@company.com"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    required
                    style={styles.inputField}
                  />
                </div>
              </div>
            </div>

            <div style={styles.inputRowTwoCol}>
              <div style={styles.inputGroup}>
                <label style={styles.inputLabel}>Password</label>
                <div style={styles.inputWrapper}>
                  <Lock size={16} color="#64748b" style={styles.inputIcon} />
                  <input
                    type={showPassword ? "text" : "password"}
                    placeholder="6+ chars"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    required
                    style={{ ...styles.inputField, paddingRight: "38px" }}
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    style={styles.eyeBtn}
                    aria-label="Toggle password visibility"
                  >
                    {showPassword ? <EyeOff size={15} color="#64748b" /> : <Eye size={15} color="#64748b" />}
                  </button>
                </div>
              </div>

              <div style={styles.inputGroup}>
                <label style={styles.inputLabel}>Confirm</label>
                <div style={styles.inputWrapper}>
                  <Lock size={16} color="#64748b" style={styles.inputIcon} />
                  <input
                    type={showPassword ? "text" : "password"}
                    placeholder="Re-enter"
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    required
                    style={styles.inputField}
                  />
                </div>
              </div>
            </div>

            <button
              type="submit"
              disabled={submitting}
              style={{
                ...styles.submitButton,
                backgroundColor: currentRoleObj.accentColor,
              }}
            >
              {submitting ? (
                <div style={styles.buttonSpinner}></div>
              ) : (
                <>
                  <span>Create {currentRoleObj.title} Account</span>
                  <ArrowRight size={16} style={{ marginLeft: 8 }} />
                </>
              )}
            </button>
          </form>

          <div style={styles.formFooter}>
            <p style={styles.footerText}>
              Already have an account?{" "}
              <button
                type="button"
                onClick={onSwitchToLogin}
                style={styles.footerLink}
              >
                Sign in
              </button>
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}

const styles = {
  splitScreenContainer: {
    minHeight: "100vh",
    width: "100%",
    display: "grid",
    gridTemplateColumns: "1.05fr 1fr",
    margin: 0,
    padding: 0,
    backgroundColor: "#ffffff",
    overflow: "hidden",
  },
  leftBrandPane: {
    backgroundColor: "#f8fafc",
    borderRight: "1px solid #e2e8f0",
    display: "flex",
    flexDirection: "column",
    justifyContent: "center",
    position: "relative",
    background: "linear-gradient(165deg, #f8fafc 0%, #f1f5f9 50%, #edf2f7 100%)",
    padding: "44px 54px",
    overflow: "hidden",
  },
  leftBrandContent: {
    position: "relative",
    zIndex: 1,
    display: "flex",
    flexDirection: "column",
    gap: "24px",
    maxWidth: "500px",
    margin: "0 auto",
    width: "100%",
  },
  bgGlowTopLeft: {
    position: "absolute",
    top: "-140px",
    left: "-140px",
    width: "500px",
    height: "500px",
    borderRadius: "50%",
    background: "radial-gradient(circle, rgba(219, 234, 254, 0.6) 0%, rgba(248, 250, 252, 0) 70%)",
    pointerEvents: "none",
    zIndex: 0,
  },
  bgGlowBottomRight: {
    position: "absolute",
    bottom: "-140px",
    right: "-140px",
    width: "500px",
    height: "500px",
    borderRadius: "50%",
    background: "radial-gradient(circle, rgba(224, 231, 255, 0.5) 0%, rgba(248, 250, 252, 0) 70%)",
    pointerEvents: "none",
    zIndex: 0,
  },
  bgGridPattern: {
    position: "absolute",
    inset: 0,
    backgroundImage: "radial-gradient(rgba(148, 163, 184, 0.18) 1px, transparent 1px)",
    backgroundSize: "26px 26px",
    pointerEvents: "none",
    zIndex: 0,
  },
  brandHeader: {
    display: "flex",
    alignItems: "center",
    gap: "12px",
  },
  brandLogoIcon: {
    width: "42px",
    height: "42px",
    borderRadius: "11px",
    backgroundColor: "#0f172a",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    boxShadow: "0 4px 12px rgba(15, 23, 42, 0.15)",
  },
  brandLogoText: {
    fontSize: "22px",
    fontWeight: "700",
    color: "#0f172a",
    letterSpacing: "-0.5px",
    lineHeight: "1.2",
  },
  enterprisePill: {
    fontSize: "10px",
    fontWeight: "700",
    letterSpacing: "0.5px",
    color: "#1d4ed8",
    backgroundColor: "#dbeafe",
    padding: "2px 7px",
    borderRadius: "10px",
  },
  brandTagline: {
    fontSize: "12px",
    color: "#64748b",
    fontWeight: "400",
    marginTop: "1px",
  },
  heroTextSection: {
    display: "flex",
    flexDirection: "column",
    gap: "8px",
  },
  heroTitle: {
    fontSize: "24px",
    fontWeight: "700",
    color: "#0f172a",
    lineHeight: "1.3",
    letterSpacing: "-0.4px",
  },
  heroDescription: {
    fontSize: "13.5px",
    color: "#475569",
    lineHeight: "1.55",
  },
  featureList: {
    display: "flex",
    flexDirection: "column",
    gap: "12px",
  },
  featureItem: {
    display: "flex",
    alignItems: "center",
    gap: "14px",
    backgroundColor: "#ffffff",
    border: "1px solid #e2e8f0",
    borderRadius: "12px",
    padding: "12px 16px",
    boxShadow: "0 1px 3px rgba(15, 23, 42, 0.03)",
  },
  featureIcon: {
    width: "34px",
    height: "34px",
    borderRadius: "8px",
    border: "1px solid",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    flexShrink: 0,
  },
  featureTitle: {
    fontSize: "13px",
    fontWeight: "600",
    color: "#0f172a",
    marginBottom: "2px",
  },
  featureDesc: {
    fontSize: "11.5px",
    color: "#64748b",
    lineHeight: "1.4",
  },
  socialProofCard: {
    backgroundColor: "#ffffff",
    border: "1px solid #e2e8f0",
    borderRadius: "12px",
    padding: "14px 18px",
    boxShadow: "0 2px 6px rgba(15, 23, 42, 0.03)",
  },
  socialProofHeader: {
    display: "flex",
    alignItems: "center",
    gap: "8px",
    fontSize: "12px",
    fontWeight: "600",
    color: "#1d4ed8",
    marginBottom: "10px",
  },
  liveDot: {
    width: "7px",
    height: "7px",
    borderRadius: "50%",
    backgroundColor: "#16a34a",
    display: "inline-block",
    boxShadow: "0 0 6px rgba(22, 163, 74, 0.6)",
  },
  socialProofMetrics: {
    display: "flex",
    justifyContent: "space-between",
    alignItems: "center",
  },
  spNum: {
    display: "block",
    fontSize: "17px",
    fontWeight: "700",
    color: "#0f172a",
  },
  spText: {
    fontSize: "11px",
    color: "#64748b",
  },
  spDivider: {
    width: "1px",
    height: "24px",
    backgroundColor: "#e2e8f0",
  },
  trustFooter: {
    paddingTop: "12px",
    borderTop: "1px solid #e2e8f0",
  },
  trustText: {
    fontSize: "11px",
    color: "#64748b",
    display: "block",
  },
  rightFormPane: {
    backgroundColor: "#ffffff",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    padding: "36px 48px",
    height: "100%",
    overflowY: "auto",
  },
  formContainerWrapper: {
    width: "100%",
    maxWidth: "430px",
  },
  configNotice: {
    backgroundColor: "#eff6ff",
    border: "1px solid #bfdbfe",
    borderRadius: "9px",
    padding: "9px 12px",
    marginBottom: "16px",
  },
  tabContainer: {
    display: "grid",
    gridTemplateColumns: "1fr 1fr",
    gap: "6px",
    backgroundColor: "#f1f5f9",
    padding: "4px",
    borderRadius: "10px",
    marginBottom: "18px",
    border: "1px solid #e2e8f0",
  },
  tabButton: {
    padding: "8px 14px",
    borderRadius: "7px",
    border: "none",
    backgroundColor: "transparent",
    color: "#64748b",
    fontSize: "13px",
    fontWeight: "500",
    cursor: "pointer",
    transition: "all 0.15s ease",
  },
  tabButtonActive: {
    backgroundColor: "#ffffff",
    color: "#0f172a",
    fontWeight: "600",
    boxShadow: "0 1px 3px rgba(15, 23, 42, 0.08)",
  },
  roleTabsContainer: {
    backgroundColor: "#f8fafc",
    border: "1px solid #e2e8f0",
    borderRadius: "12px",
    padding: "12px 14px",
    marginBottom: "18px",
  },
  roleTabsHeader: {
    display: "flex",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: "8px",
  },
  roleTabsLabel: {
    fontSize: "11px",
    fontWeight: "700",
    letterSpacing: "0.5px",
    color: "#475569",
  },
  roleBadgeActive: {
    fontSize: "10.5px",
    fontWeight: "600",
    padding: "2px 8px",
    borderRadius: "10px",
    border: "1px solid",
  },
  roleTabsGrid: {
    display: "grid",
    gridTemplateColumns: "repeat(4, 1fr)",
    gap: "6px",
    marginBottom: "10px",
  },
  roleTabButton: {
    display: "flex",
    flexDirection: "column",
    alignItems: "center",
    gap: "4px",
    padding: "7px 4px",
    borderRadius: "8px",
    backgroundColor: "#ffffff",
    border: "1px solid #e2e8f0",
    cursor: "pointer",
    position: "relative",
    transition: "all 0.15s ease",
  },
  roleTabButtonActive: {
    borderColor: "#2563eb",
    backgroundColor: "#ffffff",
    boxShadow: "0 2px 6px rgba(37, 99, 235, 0.12)",
  },
  roleTabIconWrap: {
    width: "28px",
    height: "28px",
    borderRadius: "6px",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    transition: "all 0.15s ease",
  },
  roleTabTitle: {
    fontSize: "11px",
    lineHeight: "1.2",
    textAlign: "center",
  },
  roleTabActiveIndicator: {
    position: "absolute",
    bottom: "-1px",
    width: "16px",
    height: "2px",
    borderRadius: "2px",
  },
  roleContextBanner: {
    border: "1px solid",
    borderRadius: "8px",
    padding: "8px 10px",
    display: "flex",
    justifyContent: "space-between",
    alignItems: "center",
    gap: "8px",
  },
  roleContextLeft: {
    flex: 1,
  },
  roleContextTitleRow: {
    display: "flex",
    alignItems: "center",
    gap: "6px",
  },
  roleContextTitle: {
    fontSize: "12px",
    fontWeight: "700",
  },
  roleContextTagline: {
    fontSize: "11px",
    color: "#64748b",
  },
  formHeader: {
    marginBottom: "16px",
  },
  formHeading: {
    fontSize: "20px",
    fontWeight: "700",
    color: "#0f172a",
    letterSpacing: "-0.3px",
  },
  formSubheading: {
    fontSize: "13px",
    color: "#64748b",
    marginTop: "3px",
  },
  errorAlert: {
    backgroundColor: "#fef2f2",
    border: "1px solid #fecaca",
    color: "#b91c1c",
    padding: "8px 12px",
    borderRadius: "8px",
    fontSize: "12px",
    display: "flex",
    alignItems: "center",
    gap: "8px",
    marginBottom: "12px",
  },
  successAlert: {
    backgroundColor: "#f0fdf4",
    border: "1px solid #bbf7d0",
    color: "#15803d",
    padding: "8px 12px",
    borderRadius: "8px",
    fontSize: "12px",
    display: "flex",
    alignItems: "center",
    gap: "8px",
    marginBottom: "12px",
  },
  googleButton: {
    width: "100%",
    padding: "9px 14px",
    borderRadius: "9px",
    border: "1px solid #cbd5e1",
    backgroundColor: "#ffffff",
    color: "#0f172a",
    fontSize: "13px",
    fontWeight: "500",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    cursor: "pointer",
    transition: "all 0.15s ease",
    boxShadow: "0 1px 2px rgba(15, 23, 42, 0.04)",
  },
  divider: {
    display: "flex",
    alignItems: "center",
    margin: "16px 0",
    gap: "10px",
  },
  dividerLine: {
    flex: 1,
    height: "1px",
    backgroundColor: "#e2e8f0",
  },
  dividerText: {
    fontSize: "11px",
    color: "#94a3b8",
    textTransform: "uppercase",
    letterSpacing: "0.5px",
    fontWeight: "600",
  },
  form: {
    display: "flex",
    flexDirection: "column",
    gap: "14px",
  },
  inputRowTwoCol: {
    display: "grid",
    gridTemplateColumns: "1fr 1fr",
    gap: "12px",
  },
  inputGroup: {
    display: "flex",
    flexDirection: "column",
    gap: "5px",
  },
  inputLabel: {
    fontSize: "12px",
    fontWeight: "600",
    color: "#334155",
  },
  inputWrapper: {
    position: "relative",
    display: "flex",
    alignItems: "center",
  },
  inputIcon: {
    position: "absolute",
    left: "13px",
    pointerEvents: "none",
  },
  inputField: {
    width: "100%",
    padding: "9px 12px 9px 38px",
    backgroundColor: "#ffffff",
    border: "1px solid #cbd5e1",
    borderRadius: "8px",
    color: "#0f172a",
    fontSize: "13.5px",
    outline: "none",
    transition: "border-color 0.15s, box-shadow 0.15s",
  },
  eyeBtn: {
    position: "absolute",
    right: "10px",
    background: "none",
    border: "none",
    cursor: "pointer",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    padding: "4px",
  },
  submitButton: {
    marginTop: "6px",
    padding: "11px 18px",
    borderRadius: "9px",
    border: "none",
    color: "#ffffff",
    fontSize: "14px",
    fontWeight: "600",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    cursor: "pointer",
    transition: "all 0.15s ease",
    boxShadow: "0 4px 12px rgba(15, 23, 42, 0.12)",
  },
  buttonSpinner: {
    width: "17px",
    height: "17px",
    border: "2px solid rgba(255, 255, 255, 0.4)",
    borderTopColor: "#fff",
    borderRadius: "50%",
    animation: "spin 0.6s linear infinite",
  },
  formFooter: {
    marginTop: "16px",
    textAlign: "center",
  },
  footerText: {
    fontSize: "13px",
    color: "#64748b",
  },
  footerLink: {
    background: "none",
    border: "none",
    color: "#1d4ed8",
    fontSize: "13px",
    fontWeight: "600",
    cursor: "pointer",
    marginLeft: "4px",
  },
};
