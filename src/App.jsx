import React, { useState, useEffect } from "react";
import { onAuthStateChanged, signOut } from "firebase/auth";
import { auth } from "./firebase";
import { initLocalRegistry, verifyUserEmailAndRole } from "./authService";
import Login from "./Login";
import SignUp from "./SignUp";
import Dashboard from "./Dashboard";

function formatEmailToName(email) {
  if (!email || !email.includes("@")) return "";
  const prefix = email.split("@")[0];
  return prefix
    .split(/[._-]/)
    .filter(Boolean)
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase())
    .join(" ");
}

export default function App() {
  const [user, setUser] = useState(null);
  const [userProfile, setUserProfile] = useState(null);
  const [loading, setLoading] = useState(true);
  const [view, setView] = useState("login"); // 'login' | 'signup'
  const [isDemoMode, setIsDemoMode] = useState(false);
  const [selectedRole, setSelectedRole] = useState("Creator");

  // Initialize registry and restore existing verified session if available
  useEffect(() => {
    initLocalRegistry();

    if (!auth) {
      setLoading(false);
      return;
    }

    let isInitialCheck = true;
    const unsubscribe = onAuthStateChanged(auth, async (currentUser) => {
      if (isInitialCheck) {
        isInitialCheck = false;
        if (currentUser) {
          try {
            const check = await verifyUserEmailAndRole(currentUser.email, null, currentUser.uid);
            if (check.success && check.profile?.role) {
              setUser(currentUser);
              setUserProfile(check.profile);
              setSelectedRole(check.profile.role);
            } else {
              // Unregistered or incomplete session, sign out
              await signOut(auth);
              setUser(null);
              setUserProfile(null);
            }
          } catch (e) {
            console.warn("Initial session recovery note:", e);
            setUser(null);
            setUserProfile(null);
          }
        }
        setLoading(false);
      } else {
        // Subsequent auth state changes (e.g. signOut)
        if (!currentUser) {
          setUser(null);
          setUserProfile(null);
        }
      }
    });

    return () => unsubscribe();
  }, []);

  // Called when login is verified and successfully completed
  const handleLoginSuccess = (authenticatedUser, verifiedProfile) => {
    const verifiedRole = verifiedProfile?.role || selectedRole || "Creator";
    setSelectedRole(verifiedRole);
    setUser(authenticatedUser);
    setUserProfile({
      ...verifiedProfile,
      role: verifiedRole,
    });
    setIsDemoMode(authenticatedUser.uid?.startsWith("usr_") ? true : false);
  };

  // Called when signup is successfully completed
  const handleSignUpSuccess = (newUser, newProfile) => {
    const newRole = newProfile?.role || selectedRole || "Creator";
    setSelectedRole(newRole);
    setUser(newUser);
    setUserProfile({
      ...newProfile,
      role: newRole,
    });
    setIsDemoMode(newUser.uid?.startsWith("usr_") ? true : false);
  };

  // Handle fallback sign-up (when running offline or demo mode)
  const handleDemoSignUp = (data) => {
    const role = data.role || selectedRole || "Creator";
    const resolvedName =
      data.fullName?.trim() ||
      formatEmailToName(data.email) ||
      `${role} User`;
    const resolvedUid = `usr_${role.toLowerCase().slice(0, 3)}_${Date.now().toString(36)}`;

    const mockUser = {
      uid: resolvedUid,
      displayName: resolvedName,
      email: data.email,
      photoURL: data.photoURL || null,
    };
    const mockProfile = {
      uid: resolvedUid,
      fullName: resolvedName,
      email: data.email,
      role: role,
      provider: data.provider || "email",
      createdAt: new Date().toISOString(),
      lastLogin: new Date().toISOString(),
      status: "active",
      metrics: {
        totalReach: role === "Admin" ? "Platform-wide" : role === "Agency" ? "8.6M" : role === "Marketing Team" ? "4.2M" : "1.4M",
        engagementRate: role === "Admin" ? "99.9%" : role === "Agency" ? "7.1%" : role === "Marketing Team" ? "4.9%" : "5.8%",
        contentScore: role === "Admin" ? 99 : 94,
        activeCampaigns: role === "Admin" ? 42 : role === "Agency" ? 18 : role === "Marketing Team" ? 12 : 4,
      },
    };
    setIsDemoMode(true);
    setSelectedRole(role);
    setUser(mockUser);
    setUserProfile(mockProfile);
  };

  const handleDemoLogin = (data) => {
    const role = data.role || selectedRole || "Creator";
    const resolvedEmail = data.email || `${role.toLowerCase().replace(/\s+/g, "")}@creatoriq.io`;
    const resolvedName =
      data.fullName?.trim() ||
      formatEmailToName(resolvedEmail) ||
      `${role} User`;
    const resolvedUid = data.uid || `usr_${role.toLowerCase().slice(0, 3)}_${Date.now().toString(36)}`;

    const mockUser = {
      uid: resolvedUid,
      displayName: resolvedName,
      email: resolvedEmail,
      photoURL: data.photoURL || null,
    };
    const mockProfile = {
      uid: resolvedUid,
      fullName: resolvedName,
      email: resolvedEmail,
      role: role,
      provider: data.provider || "email",
      createdAt: new Date().toISOString(),
      lastLogin: new Date().toISOString(),
      status: "active",
      metrics: {
        totalReach: role === "Admin" ? "Platform-wide" : role === "Agency" ? "12.4M" : role === "Marketing Team" ? "6.8M" : "2.1M",
        engagementRate: role === "Admin" ? "100%" : role === "Agency" ? "8.4%" : role === "Marketing Team" ? "5.4%" : "6.2%",
        contentScore: role === "Admin" ? 99 : 96,
        activeCampaigns: role === "Admin" ? 54 : role === "Agency" ? 22 : role === "Marketing Team" ? 14 : 7,
      },
    };
    setIsDemoMode(true);
    setSelectedRole(role);
    setUser(mockUser);
    setUserProfile(mockProfile);
  };

  // Sign out handler
  const handleSignOut = async () => {
    try {
      if (auth) {
        await signOut(auth);
      }
      setUser(null);
      setUserProfile(null);
      setIsDemoMode(false);
      setView("login");
    } catch (err) {
      console.error("Sign out error:", err);
    }
  };

  if (loading) {
    return (
      <div style={loadingStyles.container}>
        <div style={loadingStyles.spinner}></div>
        <p style={loadingStyles.text}>Loading CreatorIQ Intelligence Portal...</p>
      </div>
    );
  }

  // If user is authenticated, display the Dashboard for their verified role
  if (user) {
    return (
      <Dashboard
        user={user}
        userProfile={userProfile}
        onSignOut={handleSignOut}
        isDemoMode={isDemoMode}
      />
    );
  }

  // If user is not authenticated, render Login or SignUp based on state
  return view === "signup" ? (
    <SignUp
      selectedRole={selectedRole}
      onSelectRole={setSelectedRole}
      onSwitchToLogin={() => setView("login")}
      onDemoSignUp={handleDemoSignUp}
      onSignUpSuccess={handleSignUpSuccess}
    />
  ) : (
    <Login
      selectedRole={selectedRole}
      onSelectRole={setSelectedRole}
      onSwitchToSignUp={() => setView("signup")}
      onDemoLogin={handleDemoLogin}
      onLoginSuccess={handleLoginSuccess}
    />
  );
}

const loadingStyles = {
  container: {
    minHeight: "100vh",
    display: "flex",
    flexDirection: "column",
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#f8fafc",
    color: "#0f172a",
  },
  spinner: {
    width: "44px",
    height: "44px",
    border: "3px solid rgba(37, 99, 235, 0.15)",
    borderTopColor: "#1d4ed8",
    borderRadius: "50%",
    animation: "spin 0.8s linear infinite",
  },
  text: {
    marginTop: "16px",
    color: "#64748b",
    fontSize: "14px",
    fontWeight: "500",
  },
};
