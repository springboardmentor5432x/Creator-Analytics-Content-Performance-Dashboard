import React from "react";
import { AlertTriangle, RefreshCw, Home } from "lucide-react";

export default class ErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false, error: null, errorInfo: null };
  }

  static getDerivedStateFromError(error) {
    return { hasError: true, error };
  }

  componentDidCatch(error, errorInfo) {
    console.error("[CreatorIQ ErrorBoundary caught]:", error, errorInfo);
    this.setState({ errorInfo });
  }

  handleReload = () => {
    window.location.reload();
  };

  handleReset = () => {
    try {
      localStorage.removeItem("creatoriq_campaign_store_v2");
    } catch (e) {}
    window.location.href = "/";
  };

  render() {
    if (this.state.hasError) {
      return (
        <div style={styles.container}>
          <div style={styles.card}>
            <div style={styles.iconWrap}>
              <AlertTriangle size={32} color="#dc2626" />
            </div>
            <h2 style={styles.title}>Something went wrong</h2>
            <p style={styles.subtitle}>
              An unexpected interface error occurred. Your database records are safe.
            </p>
            {this.state.error && (
              <div style={styles.errorBox}>
                <code>{this.state.error.toString()}</code>
              </div>
            )}
            <div style={styles.btnRow}>
              <button onClick={this.handleReload} style={styles.primaryBtn}>
                <RefreshCw size={14} style={{ marginRight: 6 }} />
                Reload Page
              </button>
              <button onClick={this.handleReset} style={styles.secondaryBtn}>
                <Home size={14} style={{ marginRight: 6 }} />
                Return to Login
              </button>
            </div>
          </div>
        </div>
      );
    }
    return this.props.children;
  }
}

const styles = {
  container: {
    minHeight: "100vh",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#f8fafc",
    padding: "20px",
    fontFamily: "Inter, -apple-system, BlinkMacSystemFont, sans-serif",
  },
  card: {
    backgroundColor: "#ffffff",
    border: "1px solid #e2e8f0",
    borderRadius: "16px",
    padding: "36px 32px",
    maxWidth: "520px",
    width: "100%",
    textAlign: "center",
    boxShadow: "0 10px 25px -5px rgba(15, 23, 42, 0.08)",
  },
  iconWrap: {
    width: "60px",
    height: "60px",
    borderRadius: "50%",
    backgroundColor: "#fef2f2",
    display: "inline-flex",
    alignItems: "center",
    justifyContent: "center",
    marginBottom: "16px",
    border: "1px solid #fee2e2",
  },
  title: {
    fontSize: "20px",
    fontWeight: "700",
    color: "#0f172a",
    marginBottom: "8px",
  },
  subtitle: {
    fontSize: "14px",
    color: "#64748b",
    lineHeight: "1.5",
    marginBottom: "20px",
  },
  errorBox: {
    backgroundColor: "#f8fafc",
    border: "1px solid #e2e8f0",
    borderRadius: "8px",
    padding: "12px 14px",
    fontSize: "12px",
    color: "#b91c1c",
    textAlign: "left",
    marginBottom: "24px",
    overflowX: "auto",
    fontFamily: "monospace",
  },
  btnRow: {
    display: "flex",
    gap: "12px",
    justifyContent: "center",
    flexWrap: "wrap",
  },
  primaryBtn: {
    display: "inline-flex",
    alignItems: "center",
    padding: "10px 18px",
    borderRadius: "8px",
    backgroundColor: "#2563eb",
    color: "#ffffff",
    fontSize: "13px",
    fontWeight: "600",
    border: "none",
    cursor: "pointer",
    boxShadow: "0 2px 6px rgba(37, 99, 235, 0.2)",
  },
  secondaryBtn: {
    display: "inline-flex",
    alignItems: "center",
    padding: "10px 18px",
    borderRadius: "8px",
    backgroundColor: "#ffffff",
    color: "#334155",
    fontSize: "13px",
    fontWeight: "600",
    border: "1px solid #cbd5e1",
    cursor: "pointer",
  },
};
