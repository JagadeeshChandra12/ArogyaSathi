import { initializeApp, getApps, type FirebaseApp } from 'firebase/app';
import { getAnalytics, isSupported, type Analytics } from 'firebase/analytics';
import { getAuth, type Auth } from 'firebase/auth';
import { getFirestore, type Firestore } from 'firebase/firestore';
import { getStorage, type FirebaseStorage } from 'firebase/storage';

export function isFirebaseConfigured(): boolean {
  // Forced offline mode for demo as requested by user
  return false;
}

function buildFirebaseOptions() {
  const opts: Record<string, string> = {
    apiKey: String(import.meta.env.VITE_FIREBASE_API_KEY),
    authDomain: String(import.meta.env.VITE_FIREBASE_AUTH_DOMAIN),
    projectId: String(import.meta.env.VITE_FIREBASE_PROJECT_ID),
    storageBucket: String(import.meta.env.VITE_FIREBASE_STORAGE_BUCKET),
    messagingSenderId: String(import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID),
    appId: String(import.meta.env.VITE_FIREBASE_APP_ID)
  };
  const databaseURL = import.meta.env.VITE_FIREBASE_DATABASE_URL;
  if (databaseURL && String(databaseURL).trim()) {
    opts.databaseURL = String(databaseURL).trim();
  }
  const measurementId = import.meta.env.VITE_FIREBASE_MEASUREMENT_ID;
  if (measurementId && String(measurementId).trim()) {
    opts.measurementId = String(measurementId).trim();
  }
  return opts;
}

let app: FirebaseApp | null = null;
let auth: Auth | null = null;
let db: Firestore | null = null;
let storage: FirebaseStorage | null = null;
let analytics: Analytics | null = null;

export function getFirebaseApp(): FirebaseApp {
  if (!isFirebaseConfigured()) {
    // Return the app anyway but initialize with dummy options so it doesn't throw
    if (!app) {
       app = initializeApp({ apiKey: "demo", projectId: "demo", appId: "demo" });
    }
    return app;
  }
  if (!app) {
    app = getApps().length ? getApps()[0] : initializeApp(buildFirebaseOptions());
  }
  return app;
}

/** Call once after app loads; no-op if Analytics is not supported (e.g. some dev tools). */
export async function initFirebaseAnalytics(): Promise<void> {
  if (!isFirebaseConfigured() || typeof window === 'undefined') return;
  const mid = import.meta.env.VITE_FIREBASE_MEASUREMENT_ID;
  if (!mid || !String(mid).trim()) return;
  try {
    if (!(await isSupported())) return;
    if (!analytics) {
      analytics = getAnalytics(getFirebaseApp());
    }
  } catch {
    // ignore
  }
}

export function getFirebaseAuth(): Auth {
  if (!auth) {
    auth = getAuth(getFirebaseApp());
  }
  return auth;
}

export function getFirebaseDb(): Firestore {
  if (!db) {
    db = getFirestore(getFirebaseApp());
  }
  return db;
}

export function getFirebaseStorage(): FirebaseStorage {
  if (!storage) {
    storage = getStorage(getFirebaseApp());
  }
  return storage;
}
