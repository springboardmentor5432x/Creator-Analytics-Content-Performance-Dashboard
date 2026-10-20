import { initializeApp, getApps, getApp } from "firebase/app";
import { getAuth, GoogleAuthProvider } from "firebase/auth";
import { getFirestore } from "firebase/firestore";

// CreatorIQ Firebase Configuration
// Loaded from environment variables (.env / .env.example)
const firebaseConfig = {
  apiKey: "AIzaSyA4PFkdJdeOnOgIO-uyjIPVjGM8UrV_JaA",
  authDomain: "creatoriq-2c8e7.firebaseapp.com",
  projectId: "creatoriq-2c8e7",
  storageBucket: "creatoriq-2c8e7.firebasestorage.app",
  messagingSenderId: "629831164106",
  appId: "1:629831164106:web:faddc9253e997a2caad433",
  measurementId: "G-JCP1SBEZ4T"
};
// Check if credentials are properly provided
export const isFirebaseConfigured = Boolean(
  firebaseConfig.apiKey &&
  !firebaseConfig.apiKey.includes("your_firebase_api_key") &&
  firebaseConfig.projectId &&
  !firebaseConfig.projectId.includes("your_project_id")
);

// Initialize Firebase safely
let app;
let auth;
let db;
let googleProvider;

try {
  app = getApps().length > 0 ? getApp() : initializeApp(firebaseConfig);
  auth = getAuth(app);
  db = getFirestore(app);
  googleProvider = new GoogleAuthProvider();
  googleProvider.setCustomParameters({ prompt: "select_account" });
} catch (error) {
  console.warn("CreatorIQ: Firebase initialization note:", error.message);
}

export { app, auth, db, googleProvider, firebaseConfig };
