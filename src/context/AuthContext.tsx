import React, { createContext, useCallback, useContext, useEffect, useState } from 'react';
import { onAuthStateChanged, type User as FirebaseUser } from 'firebase/auth';
import { isFirebaseConfigured, getFirebaseAuth } from '../firebase/config';
import { fetchUserProfile, firebaseSignOut } from '../services/firebaseUserData';
import { fetchHospitalStaffProfile } from '../services/firebaseHospitalData';
import {
  cachePatientProfile,
  cacheStaffProfile,
  getCachedPatientProfile,
  getCachedStaffProfile
} from '../services/authProfileCache';
import { userStorageService } from '../services/userStorage';
import type { User } from '../services/userStorage';
import type { HospitalStaffProfile } from '../types/hospital';

export type AuthSnapshot = {
  user: User | null;
  staff: HospitalStaffProfile | null;
};

type AuthContextValue = {
  user: User | null;
  /** Set when signed in as hospital staff (Firebase `hospitalStaff/{uid}`). Mutually exclusive with patient `user` in normal flows. */
  staff: HospitalStaffProfile | null;
  loading: boolean;
  refreshLocalUser: () => void;
  /** Re-read Firebase Auth + Firestore profile into React state (call after email sign-in / sign-up). */
  refreshProfile: () => Promise<AuthSnapshot>;
  signOutApp: () => Promise<void>;
};

const AuthContext = createContext<AuthContextValue | null>(null);

function firebaseUserToAppUser(fbUser: FirebaseUser, profile: User | null): User {
  if (profile) {
    return {
      ...profile,
      id: fbUser.uid,
      email: fbUser.email || profile.email
    };
  }
  const dn = fbUser.displayName?.trim() || '';
  const parts = dn.split(/\s+/).filter(Boolean);
  return {
    id: fbUser.uid,
    email: fbUser.email || '',
    firstName: parts[0] || '',
    lastName: parts.slice(1).join(' ') || '',
    phone: '',
    dateOfBirth: '',
    gender: '',
    bloodGroup: '',
    createdAt: new Date().toISOString(),
    password: ''
  };
}

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(() => {
    if (!isFirebaseConfigured()) return userStorageService.getCurrentUser();
    try {
      const cached = localStorage.getItem('last_known_patient');
      return cached ? JSON.parse(cached) : null;
    } catch { return null; }
  });
  
  const [staff, setStaff] = useState<HospitalStaffProfile | null>(() => {
    if (!isFirebaseConfigured()) return null;
    try {
      const cached = localStorage.getItem('last_known_staff');
      return cached ? JSON.parse(cached) : null;
    } catch { return null; }
  });

  const [loading, setLoading] = useState(() => {
    if (!isFirebaseConfigured()) return false;
    const hasCache = !!localStorage.getItem('last_known_patient') || !!localStorage.getItem('last_known_staff');
    return !hasCache; 
  });

  const refreshLocalUser = useCallback(() => {
    const sStr = localStorage.getItem('last_known_staff');
    if (sStr) {
       try {
         setStaff(JSON.parse(sStr));
         setUser(null);
       } catch { setStaff(null); }
    } else {
       setUser(userStorageService.getCurrentUser());
       setStaff(null);
    }
  }, []);

  const applyFirebaseUser = useCallback(async (fbUser: FirebaseUser | null): Promise<AuthSnapshot> => {
    if (!fbUser) {
      setUser(null);
      setStaff(null);
      setLoading(false);
      return { user: null, staff: null };
    }
    
    // Only block UI with loading if we don't already have optimistic state
    const hasOptimisticCache = !!localStorage.getItem('last_known_patient') || !!localStorage.getItem('last_known_staff');
    if (!hasOptimisticCache) {
      setLoading(true);
    }

    const uid = fbUser.uid;
    try {
      const staffProfile = await fetchHospitalStaffProfile(uid);
      if (staffProfile) {
        cacheStaffProfile(uid, staffProfile);
        setStaff(staffProfile);
        setUser(null);
        return { user: null, staff: staffProfile };
      }
      setStaff(null);

      let profile = await fetchUserProfile(uid);
      const isGoogle = fbUser.providerData?.some((p) => p.providerId === 'google.com') ?? false;
      if (!profile && isGoogle) {
        await new Promise((r) => setTimeout(r, 500));
        profile = await fetchUserProfile(uid);
      }
      if (!profile) {
        profile = getCachedPatientProfile(uid);
      }

      if (profile) {
        const appUser = firebaseUserToAppUser(fbUser, profile);
        cachePatientProfile(uid, appUser);
        setUser(appUser);
        return { user: appUser, staff: null };
      }

      const staffFromCache = getCachedStaffProfile(uid);
      if (staffFromCache) {
        cacheStaffProfile(uid, staffFromCache);
        setStaff(staffFromCache);
        setUser(null);
        return { user: null, staff: staffFromCache };
      }

      const appUser = firebaseUserToAppUser(fbUser, null);
      cachePatientProfile(uid, appUser);
      setUser(appUser);
      return { user: appUser, staff: null };
    } catch (e) {
      console.error('applyFirebaseUser', e);
      const staffFromCache = getCachedStaffProfile(uid);
      if (staffFromCache) {
        setStaff(staffFromCache);
        setUser(null);
        return { user: null, staff: staffFromCache };
      }
      const cachedPatient = getCachedPatientProfile(uid);
      const fallback = firebaseUserToAppUser(fbUser, cachedPatient);
      cachePatientProfile(uid, fallback);
      setStaff(null);
      setUser(fallback);
      return { user: fallback, staff: null };
    } finally {
      setLoading(false);
    }
  }, []);

  const refreshProfile = useCallback(async (): Promise<AuthSnapshot> => {
    if (!isFirebaseConfigured()) {
      refreshLocalUser();
      const u = userStorageService.getCurrentUser();
      const sStr = localStorage.getItem('last_known_staff');
      let st = null;
      if (sStr) {
         try { st = JSON.parse(sStr); } catch {}
      }
      return { user: u, staff: st };
    }
    return applyFirebaseUser(getFirebaseAuth().currentUser);
  }, [applyFirebaseUser, refreshLocalUser]);

  const signOutApp = useCallback(async () => {
    if (isFirebaseConfigured()) {
      await firebaseSignOut();
      setUser(null);
      setStaff(null);
    } else {
      userStorageService.signOutUser();
      localStorage.removeItem('last_known_staff');
      localStorage.removeItem('last_known_patient');
      setUser(null);
      setStaff(null);
    }
  }, []);

  useEffect(() => {
    if (user) {
      localStorage.setItem('last_known_patient', JSON.stringify(user));
    } else {
      localStorage.removeItem('last_known_patient');
    }
  }, [user]);

  useEffect(() => {
    if (staff) {
      localStorage.setItem('last_known_staff', JSON.stringify(staff));
    } else {
      localStorage.removeItem('last_known_staff');
    }
  }, [staff]);

  useEffect(() => {
    if (!isFirebaseConfigured()) {
      setUser(userStorageService.getCurrentUser());
      setStaff(null);
      setLoading(false);
      return;
    }

    const auth = getFirebaseAuth();

    // Redirect result is handled in main.tsx (bootstrap) before render — do not call getRedirectResult here

    const unsub = onAuthStateChanged(auth, (fbUser) => {
      void applyFirebaseUser(fbUser);
    });

    return () => unsub();
  }, [applyFirebaseUser]);

  return (
    <AuthContext.Provider value={{ user, staff, loading, refreshLocalUser, refreshProfile, signOutApp }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth(): AuthContextValue {
  const ctx = useContext(AuthContext);
  if (!ctx) {
    throw new Error('useAuth must be used within AuthProvider');
  }
  return ctx;
}
