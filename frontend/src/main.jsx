import React from 'react';
import { createRoot } from 'react-dom/client';
import App from './App.jsx';
import './styles.css';

class ErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false };
  }
  static getDerivedStateFromError() {
    return { hasError: true };
  }
  componentDidCatch(error, info) {
    if (import.meta.env.DEV) console.error(error, info);
  }
  render() {
    if (this.state.hasError) {
      return (
        <main style={{ minHeight: '100vh', display: 'grid', placeItems: 'center', padding: 24, fontFamily: 'Manrope, system-ui, sans-serif' }}>
          <div style={{ maxWidth: 420, textAlign: 'center' }}>
            <h1 style={{ fontSize: 22, margin: '0 0 8px' }}>Something went wrong</h1>
            <p style={{ color: '#6b7280', margin: '0 0 16px' }}>Refresh the page to try again. If the problem continues, contact support.</p>
            <button onClick={() => window.location.reload()} style={{ padding: '10px 16px', borderRadius: 8, border: 0, background: '#6d5eea', color: '#fff', fontWeight: 700, cursor: 'pointer' }}>Reload</button>
          </div>
        </main>
      );
    }
    return this.props.children;
  }
}

createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <ErrorBoundary>
      <App />
    </ErrorBoundary>
  </React.StrictMode>,
);