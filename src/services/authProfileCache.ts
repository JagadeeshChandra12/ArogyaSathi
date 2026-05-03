/**
 * Persists Firebase-linked profiles in localStorage so sign-in still works when Firestore is offline or flaky.
 * Keyed by Firebase Auth uid (not email).
 */
import type { User } from './userStorage';
import type { HospitalStaffProfile } from '../types/hospital';

const CACHE_KEY = 'arogya_sathi_firebase_profile_cache';

type CacheShape = {
  patients: Record<string, User>;
  staff: Record<string, HospitalStaffProfile>;
};

function read(): CacheShape {
  try {
    const raw = localStorage.getItem(CACHE_KEY);
    if (!raw) return { patients: {}, staff: {} };
    const p = JSON.parse(raw) as CacheShape;
    return { patients: p.patients ?? {}, staff: p.staff ?? {} };
  } catch {
    return { patients: {}, staff: {} };
  }
}

function write(data: CacheShape): void {
  try {
    localStorage.setItem(CACHE_KEY, JSON.stringify(data));
  } catch (e) {
    console.warn('authProfileCache write failed', e);
  }
}

export function cachePatientProfile(uid: string, user: User): void {
  const c = read();
  c.patients[uid] = { ...user, id: uid, password: '' };
  write(c);
}

export function getCachedPatientProfile(uid: string): User | null {
  const u = read().patients[uid];
  return u ? { ...u, id: uid, password: '' } : null;
}

export function cacheStaffProfile(uid: string, staff: HospitalStaffProfile): void {
  const c = read();
  c.staff[uid] = { ...staff, id: uid };
  write(c);
}

export function getCachedStaffProfile(uid: string): HospitalStaffProfile | null {
  const s = read().staff[uid];
  return s ? { ...s, id: uid } : null;
}

/** Optional: remove one uid (e.g. if you add an explicit "forget my data" action). */
export function clearCachedProfilesForUid(uid: string): void {
  const c = read();
  delete c.patients[uid];
  delete c.staff[uid];
  write(c);
}
