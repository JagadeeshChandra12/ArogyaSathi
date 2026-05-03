import {
  collection,
  doc,
  enableNetwork,
  getDoc,
  getDocs,
  setDoc,
  updateDoc,
  addDoc,
  query,
  where,
  serverTimestamp
} from 'firebase/firestore';
import {
  createUserWithEmailAndPassword,
  deleteUser,
  getRedirectResult,
  GoogleAuthProvider,
  signInWithCredential,
  signInWithEmailAndPassword,
  signInWithPopup,
  signInWithRedirect,
  signOut as fbSignOut,
  type User as FirebaseAuthUser,
  type UserCredential
} from 'firebase/auth';
import { getFirebaseAuth, getFirebaseDb, isFirebaseConfigured } from '../firebase/config';
import type { User, HealthData } from './userStorage';

const AUTH_SETUP_HINT =
  'Open Firebase Console → Authentication → Sign-in method → enable Email/Password. In Google Cloud Console, ensure the Identity Toolkit API is enabled for this project.';

function authErrorMessage(code: string, fallback: string): string {
  switch (code) {
    case 'auth/configuration-not-found':
    case 'auth/operation-not-allowed':
      return `Authentication is not enabled for this app. ${AUTH_SETUP_HINT}`;
    case 'auth/invalid-api-key':
      return 'Invalid Firebase API key. Check VITE_FIREBASE_* in .env matches your Firebase web app.';
    case 'auth/popup-blocked':
      return 'Pop-up was blocked. Allow pop-ups for this site and try again.';
    case 'auth/account-exists-with-different-credential':
      return 'An account already exists with this email using a different sign-in method. Sign in with email/password first.';
    case 'auth/unauthorized-domain':
      return 'This domain is not allowed for OAuth. Add it under Firebase Console → Authentication → Settings → Authorized domains.';
    case 'auth/invalid-email':
      return 'That email address is not valid.';
    case 'auth/weak-password':
      return 'Password is too weak. Use at least 6 characters (your form may require more).';
    case 'auth/missing-password':
      return 'Please enter your password.';
    default:
      return fallback;
  }
}

/** Create Firestore `users/{uid}` on first Google sign-in if missing (rules: create when auth.uid == userId). */
async function ensureFirestoreUserFromGoogle(fbUser: FirebaseAuthUser): Promise<void> {
  const uid = fbUser.uid;
  const ref = doc(usersCol(), uid);
  const display = fbUser.displayName?.trim() || '';
  const parts = display.split(/\s+/).filter(Boolean);
  const firstName = parts[0] || '';
  const lastName = parts.slice(1).join(' ') || '';
  const createdAt = new Date().toISOString();
  const payload = {
    email: fbUser.email || '',
    firstName,
    lastName,
    phone: fbUser.phoneNumber || '',
    dateOfBirth: '',
    gender: '',
    bloodGroup: '',
    createdAt,
    updatedAt: serverTimestamp()
  };

  for (let attempt = 0; attempt < 6; attempt++) {
    if (attempt > 0) {
      await new Promise((r) => setTimeout(r, Math.min(250 * 2 ** (attempt - 1), 4000)));
    }
    try {
      const snap = await getDoc(ref);
      if (snap.exists()) return;
      await setDoc(ref, payload);
      return;
    } catch (e) {
      if (isFirestoreTransientError(e) && attempt < 5) {
        try {
          await enableNetwork(getFirebaseDb());
        } catch {
          /* ignore */
        }
        continue;
      }
      console.warn('ensureFirestoreUserFromGoogle', e);
      return;
    }
  }
}

/**
 * Call once on app load when using Google redirect sign-in (before relying on auth state).
 * Creates Firestore user doc if this is the first Google login after OAuth redirect.
 */
export async function completeGoogleRedirectSignIn(): Promise<void> {
  if (!isFirebaseConfigured()) return;
  try {
    const auth = getFirebaseAuth();
    const result = await getRedirectResult(auth);
    if (result?.user) {
      await ensureFirestoreUserFromGoogle(result.user);
    }
  } catch (e) {
    console.error('completeGoogleRedirectSignIn', e);
  }
}

declare global {
  interface Window {
    google?: {
      accounts: {
        oauth2: {
          initTokenClient: (config: {
            client_id: string;
            scope: string;
            callback: (resp: { access_token?: string; error?: string }) => void;
          }) => { requestAccessToken: (opts?: { prompt?: string }) => void };
        };
      };
    };
  }
}

let gsiScriptPromise: Promise<void> | null = null;

function loadGoogleIdentityScript(): Promise<void> {
  if (typeof window === 'undefined') return Promise.reject(new Error('no window'));
  if (window.google?.accounts?.oauth2) return Promise.resolve();
  if (gsiScriptPromise) return gsiScriptPromise;
  gsiScriptPromise = new Promise((resolve, reject) => {
    const s = document.createElement('script');
    s.src = 'https://accounts.google.com/gsi/client';
    s.async = true;
    s.onload = () => resolve();
    s.onerror = () => {
      gsiScriptPromise = null;
      reject(Object.assign(new Error('gsi-load-failed'), { code: 'gsi-load-failed' }));
    };
    document.head.appendChild(s);
  });
  return gsiScriptPromise;
}

/**
 * Google Identity Services token + Firebase credential — no Firebase-managed popup, so no window.closed / COOP issues.
 * Requires VITE_GOOGLE_WEB_CLIENT_ID (Google Cloud → APIs & Credentials → OAuth 2.0 → Web client ID for this Firebase project).
 */
async function signInWithGoogleViaGis(webClientId: string): Promise<UserCredential> {
  await loadGoogleIdentityScript();
  const auth = getFirebaseAuth();
  return new Promise((resolve, reject) => {
    let settled = false;
    const client = window.google!.accounts.oauth2.initTokenClient({
      client_id: webClientId,
      scope: 'openid email profile',
      callback: async (resp) => {
        if (settled) return;
        if (resp.error) {
          settled = true;
          reject(Object.assign(new Error(resp.error), { code: resp.error }));
          return;
        }
        if (!resp.access_token) {
          settled = true;
          reject(Object.assign(new Error('cancelled'), { code: 'auth/cancelled-popup-request' }));
          return;
        }
        try {
          const oauthCred = GoogleAuthProvider.credential(null, resp.access_token);
          const result = await signInWithCredential(auth, oauthCred);
          settled = true;
          resolve(result);
        } catch (err) {
          settled = true;
          reject(err);
        }
      }
    });
    client.requestAccessToken({ prompt: '' });
  });
}

/**
 * Google sign-in: prefers GIS + signInWithCredential when VITE_GOOGLE_WEB_CLIENT_ID is set (avoids COOP popup errors).
 * Otherwise Firebase signInWithPopup (dev server must send Cross-Origin-Opener-Policy: unsafe-none — see vite.config).
 */
export async function firebaseSignInWithGoogle(): Promise<{ success: boolean; message: string }> {
  const webClientId = String(import.meta.env.VITE_GOOGLE_WEB_CLIENT_ID || '').trim();

  try {
    if (webClientId) {
      const cred = await signInWithGoogleViaGis(webClientId);
      await ensureFirestoreUserFromGoogle(cred.user);
      return { success: true, message: 'Signed in with Google!' };
    } else {
      const auth = getFirebaseAuth();
      const provider = new GoogleAuthProvider();
      provider.addScope('profile');
      provider.addScope('email');
      provider.setCustomParameters({ prompt: 'select_account' });
      const cred = await signInWithPopup(auth, provider);
      await ensureFirestoreUserFromGoogle(cred.user);
      return { success: true, message: 'Signed in with Google!' };
    }
  } catch (e: unknown) {
    const code = e && typeof e === 'object' && 'code' in e ? String((e as { code: string }).code) : '';
    console.error('firebaseSignInWithGoogle', e);
    return {
      success: false,
      message: authErrorMessage(code, 'Google sign-in failed. Please try again.')
    };
  }
}

function usersCol() {
  return collection(getFirebaseDb(), 'users');
}

function healthCol() {
  return collection(getFirebaseDb(), 'healthData');
}

export async function firebaseSignUp(
  email: string,
  password: string,
  profile: Omit<User, 'id' | 'createdAt' | 'password'>
): Promise<{ success: boolean; message: string; user?: User }> {
  let cred: UserCredential | null = null;
  try {
    const auth = getFirebaseAuth();
    cred = await createUserWithEmailAndPassword(auth, email, password);
    const uid = cred.user.uid;
    const createdAt = new Date().toISOString();
    const userDoc: Omit<User, 'password'> & { password?: string } = {
      id: uid,
      email: cred.user.email || email,
      firstName: profile.firstName,
      lastName: profile.lastName,
      phone: profile.phone,
      dateOfBirth: profile.dateOfBirth,
      gender: profile.gender,
      bloodGroup: profile.bloodGroup,
      createdAt
    };
    const { id: _omit, ...toStore } = userDoc;
    const ref = doc(usersCol(), uid);
    let saved = false;
    for (let attempt = 0; attempt < 6; attempt++) {
      if (attempt > 0) {
        await new Promise((r) => setTimeout(r, Math.min(250 * 2 ** (attempt - 1), 4000)));
      }
      try {
        await setDoc(ref, { ...toStore, updatedAt: serverTimestamp() });
        saved = true;
        break;
      } catch (fe: unknown) {
        if (isFirestoreTransientError(fe) && attempt < 5) {
          try {
            await enableNetwork(getFirebaseDb());
          } catch {
            /* ignore */
          }
          continue;
        }
        console.error('firebaseSignUp Firestore', fe);
        break;
      }
    }
    if (!saved) {
      try {
        await deleteUser(cred.user);
      } catch {
        /* ignore */
      }
      return {
        success: false,
        message:
          'Could not save your profile (network or Firestore). Check your connection and Firestore rules, then try again.'
      };
    }
    const user: User = { ...userDoc, password: '' };
    return { success: true, message: 'Account created successfully!', user };
  } catch (e: unknown) {
    const code = e && typeof e === 'object' && 'code' in e ? String((e as { code: string }).code) : '';
    if (code === 'auth/email-already-in-use') {
      return { success: false, message: 'An account with this email already exists' };
    }
    console.error('firebaseSignUp', e);
    return {
      success: false,
      message: authErrorMessage(code, 'Failed to create account. Please try again.')
    };
  }
}

export async function firebaseSignIn(email: string, password: string): Promise<{ success: boolean; message: string }> {
  try {
    await signInWithEmailAndPassword(getFirebaseAuth(), email, password);
    return { success: true, message: 'Signed in successfully!' };
  } catch (e: unknown) {
    const code = e && typeof e === 'object' && 'code' in e ? String((e as { code: string }).code) : '';
    if (code === 'auth/user-not-found' || code === 'auth/wrong-password' || code === 'auth/invalid-credential') {
      return { success: false, message: 'Invalid email or password' };
    }
    console.error('firebaseSignIn', e);
    return {
      success: false,
      message: authErrorMessage(code, 'Failed to sign in. Please try again.')
    };
  }
}

export async function firebaseSignOut(): Promise<void> {
  await fbSignOut(getFirebaseAuth());
}

/** Exported for hospital staff reads and other Firestore helpers that should match patient profile retry behavior. */
export function isFirestoreTransientError(e: unknown): boolean {
  if (!e || typeof e !== 'object') return false;
  const err = e as { code?: string; message?: string };
  if (
    err.code === 'unavailable' ||
    err.code === 'resource-exhausted' ||
    err.code === 'deadline-exceeded'
  ) {
    return true;
  }
  const msg = typeof err.message === 'string' ? err.message.toLowerCase() : '';
  if (msg.includes('offline') || msg.includes('failed to get document') || msg.includes('failed to write')) {
    return true;
  }
  return false;
}

/**
 * Reads users/{uid}. Retries when Firestore briefly reports "offline" (common right after OAuth redirect).
 * Never throws — returns null on failure so Auth can still use Firebase Auth user fields.
 */
export async function fetchUserProfile(uid: string): Promise<User | null> {
  const maxAttempts = 6;
  for (let attempt = 0; attempt < maxAttempts; attempt++) {
    if (attempt > 0) {
      await new Promise((r) => setTimeout(r, Math.min(250 * 2 ** (attempt - 1), 4000)));
    }
    try {
      const snap = await getDoc(doc(usersCol(), uid));
      if (!snap.exists()) return null;
      const d = snap.data() as Record<string, unknown>;
      return {
        id: uid,
        email: String(d.email || ''),
        firstName: String(d.firstName || ''),
        lastName: String(d.lastName || ''),
        phone: String(d.phone || ''),
        dateOfBirth: String(d.dateOfBirth || ''),
        gender: String(d.gender || ''),
        bloodGroup: String(d.bloodGroup || ''),
        createdAt: String(d.createdAt || new Date().toISOString()),
        password: ''
      };
    } catch (e) {
      if (isFirestoreTransientError(e) && attempt < maxAttempts - 1) {
        try {
          await enableNetwork(getFirebaseDb());
        } catch {
          /* ignore */
        }
        continue;
      }
      console.warn('fetchUserProfile', e);
      return null;
    }
  }
  return null;
}

export async function firebaseUpdateProfile(
  uid: string,
  updates: Partial<User>
): Promise<{ success: boolean; message: string }> {
  try {
    const { password: _p, id: _i, ...rest } = updates;
    await updateDoc(doc(usersCol(), uid), { ...rest, updatedAt: serverTimestamp() });
    return { success: true, message: 'Profile updated successfully!' };
  } catch (e) {
    console.error('firebaseUpdateProfile', e);
    return { success: false, message: 'Failed to update profile.' };
  }
}

function toHealthData(id: string, userId: string, d: Record<string, unknown>): HealthData {
  return {
    id,
    userId,
    month: String(d.month ?? ''),
    date: String(d.date ?? ''),
    doctorVisits: Number(d.doctorVisits ?? 0),
    diseases: Number(d.diseases ?? 0),
    symptoms: Number(d.symptoms ?? 0),
    healthScore: Number(d.healthScore ?? 0),
    medications: Number(d.medications ?? 0),
    stressLevel: Number(d.stressLevel ?? 0),
    sleepHours: Number(d.sleepHours ?? 0),
    exerciseMinutes: Number(d.exerciseMinutes ?? 0),
    waterIntake: Number(d.waterIntake ?? 0),
    bloodPressure: String(d.bloodPressure ?? ''),
    heartRate: Number(d.heartRate ?? 0),
    bloodSugar: Number(d.bloodSugar ?? 0),
    weight: Number(d.weight ?? 0),
    notes: String(d.notes ?? ''),
    createdAt: d.createdAt && typeof (d.createdAt as { toDate?: () => Date }).toDate === 'function'
      ? (d.createdAt as { toDate: () => Date }).toDate().toISOString()
      : String(d.createdAt ?? '')
  };
}

export async function firebaseAddHealthData(
  uid: string,
  userName: string,
  data: Omit<HealthData, 'id' | 'userId' | 'createdAt'>
): Promise<{ success: boolean; message: string; data?: HealthData }> {
  try {
    const createdAt = new Date().toISOString();
    const payload = {
      ...data,
      userId: uid,
      userName,
      createdAt
    };
    const ref = await addDoc(healthCol(), payload);
    const full: HealthData = { ...data, id: ref.id, userId: uid, createdAt };
    return { success: true, message: 'Health data added successfully!', data: full };
  } catch (e) {
    console.error('firebaseAddHealthData', e);
    return { success: false, message: 'Failed to add health data.' };
  }
}

export async function firebaseGetUserHealthData(uid: string): Promise<HealthData[]> {
  const q = query(healthCol(), where('userId', '==', uid));
  const snap = await getDocs(q);
  const list = snap.docs.map((docSnap) => toHealthData(docSnap.id, uid, docSnap.data() as Record<string, unknown>));
  return list.sort((a, b) => a.createdAt.localeCompare(b.createdAt));
}

export async function firebaseGetAllHealthData(): Promise<HealthData[]> {
  const snap = await getDocs(healthCol());
  return snap.docs.map((docSnap) => {
    const d = docSnap.data() as Record<string, unknown>;
    return toHealthData(docSnap.id, String(d.userId ?? ''), d);
  });
}

export async function firebaseGetAllUsers(): Promise<User[]> {
  const snap = await getDocs(usersCol());
  return snap.docs.map((docSnap) => {
    const d = docSnap.data() as Record<string, unknown>;
    const uid = docSnap.id;
    return {
      id: uid,
      email: String(d.email || ''),
      firstName: String(d.firstName || ''),
      lastName: String(d.lastName || ''),
      phone: String(d.phone || ''),
      dateOfBirth: String(d.dateOfBirth || ''),
      gender: String(d.gender || ''),
      bloodGroup: String(d.bloodGroup || ''),
      createdAt: String(d.createdAt || ''),
      password: ''
    };
  });
}
