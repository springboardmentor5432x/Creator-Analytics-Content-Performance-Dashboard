import { initializeApp, getApps, getApp } from 'firebase/app';
import { getAuth } from 'firebase/auth';
import { getFirestore } from 'firebase/firestore';
import firebaseConfig from '../../firebase-applet-config.json';

// Initialize Firebase App
export const app = !getApps().length ? initializeApp(firebaseConfig) : getApp();

// CRITICAL: Must pass firestoreDatabaseId per skill requirement
export const db = getFirestore(app, firebaseConfig.firestoreDatabaseId);
export const firestore = db;

// Firebase Auth Instance
export const auth = getAuth(app);

export default app;
