import { useState } from 'react';
import CreatorDashboard from './Pages/CreatorDashboard';
import AgencyDashboard from './Pages/AgencyDashboard';
import MarketingDashboard from "./Pages/MarketingDashboard";
import AdminDashboard from "./Pages/AdminDashboard";
import { motion, AnimatePresence } from 'motion/react';
import {
  ShieldCheck,
  Video,
  Building2,
  ChartNoAxesCombined,
  ArrowRight,
  Sparkles,
} from 'lucide-react';
import './App.css';

const roles = [
  {
    id: 'creator',
    label: 'Creator',
    description: 'Track your content and audience',
    icon: Video,
  },
  {
    id: 'agency',
    label: 'Agency',
    description: 'Manage your creator portfolio',
    icon: Building2,
  },
  {
    id: 'marketing',
    label: 'Marketing Team',
    description: 'Measure campaign performance',
    icon: ChartNoAxesCombined,
  },
  {
    id: 'admin',
    label: 'Administrator',
    description: 'Manage users and permissions',
    icon: ShieldCheck,
  },
];

function App() {
  const [selectedRole, setSelectedRole] = useState('creator');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [message, setMessage] = useState('');
  const [showDashboard, setShowDashboard] = useState(false);
  if (showDashboard) {
  if (selectedRole === "creator") {
    return <CreatorDashboard />;
  }

  if (selectedRole === "agency") {
    return <AgencyDashboard />;
  }

  if (selectedRole === "marketing") {
    return <MarketingDashboard />;
  }

  if (selectedRole === "admin") {
    return <AdminDashboard />;
  }
}

  function handleLogin(event: React.FormEvent<HTMLFormElement>) {
  event.preventDefault();
  setShowDashboard(true);
}

  return (
    <main className="app-shell">
      {/* Branding panel */}
      <motion.section
        className="brand-panel"
        initial={{ opacity: 0, x: -35 }}
        animate={{ opacity: 1, x: 0 }}
        transition={{ duration: 0.7, ease: 'easeOut' }}
      >
        <motion.div
          className="brand-logo"
          initial={{ opacity: 0, y: -15 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2, duration: 0.5 }}
        >
          <motion.span
            className="logo-mark"
            whileHover={{ rotate: 10, scale: 1.08 }}
            transition={{ type: 'spring', stiffness: 300 }}
          >
            C
          </motion.span>

          <span>CreatorIQ</span>
        </motion.div>

        <div className="brand-content">
          <motion.span
            className="eyebrow"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.35 }}
          >
            <Sparkles size={15} />
            CREATOR INTELLIGENCE
          </motion.span>

          <motion.h1
            initial={{ opacity: 0, y: 25 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.4, duration: 0.7 }}
          >
            Culture
            <br />
            moves<span className="headline-dot">.</span>
            <br />
            <span className="headline-outline">Signals</span>
            <br />
            emerge<span className="headline-dot">.</span>
          </motion.h1>

          <motion.p
            initial={{ opacity: 0, y: 15 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.65, duration: 0.6 }}
          >
            Understand your audience, discover meaningful insights, and turn
            content performance into better decisions.
          </motion.p>
        </div>

        <motion.div
          className="brand-footer"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.9 }}
        >
          CREATOR ANALYTICS &amp; CONTENT PERFORMANCE
        </motion.div>
      </motion.section>

      {/* Login panel */}
      <motion.section
        className="login-panel"
        initial={{ opacity: 0, x: 25 }}
        animate={{ opacity: 1, x: 0 }}
        transition={{ delay: 0.15, duration: 0.7, ease: 'easeOut' }}
      >
        <div className="login-container">
          <motion.div
            className="login-heading"
            initial={{ opacity: 0, y: 18 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.3, duration: 0.5 }}
          >
            <span className="eyebrow">YOUR WORKSPACE</span>

            <h2>
              Welcome back<span>.</span>
            </h2>

            <p>Choose your role and sign in to CreatorIQ.</p>
          </motion.div>

          {/* Role selection */}
          <div className="role-grid">
            {roles.map((role, index) => {
              const Icon = role.icon;
              const isSelected = selectedRole === role.id;

              return (
                <motion.button
                  key={role.id}
                  type="button"
                  className={`role-option ${isSelected ? 'selected' : ''}`}
                  onClick={() => {
                    setSelectedRole(role.id);
                    setMessage('');
                  }}
                  aria-pressed={isSelected}
                  initial={{ opacity: 0, y: 15 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{
                    delay: 0.4 + index * 0.09,
                    duration: 0.4,
                  }}
                  whileHover={{ y: -3, scale: 1.015 }}
                  whileTap={{ scale: 0.98 }}
                >
                  <motion.span
                    className="role-icon"
                    animate={{ scale: isSelected ? 1.05 : 1 }}
                    transition={{ type: 'spring', stiffness: 300 }}
                  >
                    <Icon size={21} />
                  </motion.span>

                  <span className="role-copy">
                    <strong>{role.label}</strong>
                    <small>{role.description}</small>
                  </span>

                  <motion.span
                    className="role-indicator"
                    animate={{
                      scale: isSelected ? 1.2 : 1,
                      backgroundColor: isSelected
                        ? '#252620'
                        : 'transparent',
                    }}
                    transition={{ duration: 0.2 }}
                  />
                </motion.button>
              );
            })}
          </div>

          {/* Login form */}
          <motion.form
            className="login-form"
            onSubmit={handleLogin}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.7, duration: 0.5 }}
          >
            <label htmlFor="email">EMAIL ADDRESS</label>

            <input
              id="email"
              type="email"
              placeholder="you@company.com"
              value={email}
              onChange={(event) => setEmail(event.target.value)}
              autoComplete="email"
              required
            />

            <div className="password-label">
              <label htmlFor="password">PASSWORD</label>
            </div>

            <input
              id="password"
              type="password"
              placeholder="Enter your password"
              value={password}
              onChange={(event) => setPassword(event.target.value)}
              autoComplete="current-password"
              required
            />

            <motion.button
              className="login-button"
              type="submit"
              whileHover={{ scale: 1.015, y: -2 }}
              whileTap={{ scale: 0.98 }}
              transition={{ type: 'spring', stiffness: 350 }}
            >
              <span>Sign in to CreatorIQ</span>

              <motion.span
                animate={{ x: [0, 3, 0] }}
                transition={{
                  duration: 1.5,
                  repeat: Infinity,
                  ease: 'easeInOut',
                }}
              >
                <ArrowRight size={18} />
              </motion.span>
            </motion.button>

            <AnimatePresence mode="wait">
              {message && (
                <motion.p
                  key={message}
                  className="login-message"
                  initial={{ opacity: 0, y: 8 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -5 }}
                  transition={{ duration: 0.25 }}
                >
                  {message}
                </motion.p>
              )}
            </AnimatePresence>
          </motion.form>

          <motion.p
            className="login-note"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 1 }}
          >
            Secure access for creators, agencies, marketing teams, and
            administrators.
          </motion.p>
        </div>
      </motion.section>
    </main>
  );
}

export default App;