import {
  addDoc,
  collection,
  deleteDoc,
  doc,
  getDoc,
  getDocs,
  onSnapshot,
  query,
  serverTimestamp,
  setDoc,
  updateDoc,
  where
} from 'firebase/firestore';
import { ref, uploadBytes, getDownloadURL } from 'firebase/storage';
import { createUserWithEmailAndPassword, signInWithEmailAndPassword, signOut } from 'firebase/auth';
import { getFirebaseAuth, getFirebaseDb, getFirebaseStorage } from '../firebase/config';
import { isFirestoreTransientError } from './firebaseUserData';
import { registerReportForPatient } from './healthPassportApi';
import type {
  HospitalAppointment,
  HospitalPatientFileRecord,
  HospitalStaffProfile
} from '../types/hospital';

function hospitalStaffCol() {
  return collection(getFirebaseDb(), 'hospitalStaff');
}

function patientFilesCol() {
  return collection(getFirebaseDb(), 'hospitalPatientFiles');
}

function appointmentsCol() {
  return collection(getFirebaseDb(), 'hospitalAppointments');
}

/**
 * Reads hospitalStaff/{uid}. Retries when Firestore briefly reports "offline" (same pattern as fetchUserProfile).
 * Never throws — returns null on failure so patient sign-in can continue.
 */
export async function fetchHospitalStaffProfile(uid: string): Promise<HospitalStaffProfile | null> {
  const maxAttempts = 6;
  for (let attempt = 0; attempt < maxAttempts; attempt++) {
    if (attempt > 0) {
      await new Promise((r) => setTimeout(r, Math.min(250 * 2 ** (attempt - 1), 4000)));
    }
    try {
      const snap = await getDoc(doc(hospitalStaffCol(), uid));
      if (!snap.exists()) return null;
      const d = snap.data() as Record<string, unknown>;
      return {
        id: uid,
        email: String(d.email || ''),
        fullName: String(d.fullName || ''),
        hospitalName: String(d.hospitalName || ''),
        hospitalCustom: d.hospitalCustom ? String(d.hospitalCustom) : undefined,
        specialization: String(d.specialization || ''),
        department: String(d.department || ''),
        phone: d.phone ? String(d.phone) : undefined,
        createdAt: String(d.createdAt || '')
      };
    } catch (e) {
      if (isFirestoreTransientError(e) && attempt < maxAttempts - 1) {
        continue;
      }
      console.warn('fetchHospitalStaffProfile', e);
      return null;
    }
  }
  return null;
}

export async function registerHospitalStaff(
  email: string,
  password: string,
  profile: Omit<HospitalStaffProfile, 'id' | 'email' | 'createdAt'>
): Promise<{ success: boolean; message: string }> {
  try {
    const auth = getFirebaseAuth();
    const cred = await createUserWithEmailAndPassword(auth, email, password);
    const uid = cred.user.uid;
    const createdAt = new Date().toISOString();
    await setDoc(doc(hospitalStaffCol(), uid), {
      email: cred.user.email || email,
      fullName: profile.fullName,
      hospitalName: profile.hospitalName,
      hospitalCustom: profile.hospitalCustom || '',
      specialization: profile.specialization,
      department: profile.department,
      phone: profile.phone || '',
      createdAt,
      updatedAt: serverTimestamp()
    });
    return { success: true, message: 'Hospital account created.' };
  } catch (e: unknown) {
    const code = e && typeof e === 'object' && 'code' in e ? String((e as { code: string }).code) : '';
    if (code === 'auth/email-already-in-use') {
      return {
        success: false,
        message:
          'This email is already registered. Sign in instead, or use another email (patient and hospital accounts cannot share one email).'
      };
    }
    console.error('registerHospitalStaff', e);
    return { success: false, message: 'Could not create hospital account. Try again.' };
  }
}

export async function signInHospitalStaff(
  email: string,
  password: string
): Promise<{ success: boolean; message: string }> {
  try {
    await signInWithEmailAndPassword(getFirebaseAuth(), email, password);
    const uid = getFirebaseAuth().currentUser?.uid;
    if (!uid) {
      return { success: false, message: 'Sign-in failed.' };
    }
    const staff = await fetchHospitalStaffProfile(uid);
    if (!staff) {
      await signOut(getFirebaseAuth());
      return {
        success: false,
        message:
          'This account is not registered as hospital staff. Use the patient sign-in at /signin, or register at /hospital/signup.'
      };
    }
    return { success: true, message: 'Signed in.' };
  } catch (e: unknown) {
    const code = e && typeof e === 'object' && 'code' in e ? String((e as { code: string }).code) : '';
    if (code === 'auth/user-not-found' || code === 'auth/wrong-password' || code === 'auth/invalid-credential') {
      return { success: false, message: 'Invalid email or password.' };
    }
    console.error('signInHospitalStaff', e);
    return { success: false, message: 'Sign-in failed. Try again.' };
  }
}

export async function listStaffPatientFiles(staffUid: string): Promise<HospitalPatientFileRecord[]> {
  const q = query(patientFilesCol(), where('staffUid', '==', staffUid));
  const snap = await getDocs(q);
  const rows = snap.docs.map((d) => {
    const x = d.data() as Record<string, unknown>;
    return {
      id: d.id,
      staffUid: String(x.staffUid || ''),
      hospitalName: String(x.hospitalName || ''),
      department: String(x.department || ''),
      patientName: String(x.patientName || ''),
      patientEmail: String(x.patientEmail || ''),
      patientPhone: String(x.patientPhone || ''),
      notes: String(x.notes || ''),
      fileName: String(x.fileName || ''),
      fileUrl: String(x.fileUrl || ''),
      createdAt:
        x.createdAt && typeof (x.createdAt as { toDate?: () => Date }).toDate === 'function'
          ? (x.createdAt as { toDate: () => Date }).toDate().toISOString()
          : String(x.createdAt || '')
    };
  });
  return rows.sort((a, b) => b.createdAt.localeCompare(a.createdAt));
}

export async function fetchPatientFilesByEmail(email: string): Promise<HospitalPatientFileRecord[]> {
  try {
    const q = query(patientFilesCol(), where('patientEmail', '==', email));
    const snap = await getDocs(q);
    const rows = snap.docs.map((d) => {
      const x = d.data() as Record<string, unknown>;
      return {
        id: d.id,
        staffUid: String(x.staffUid || ''),
        hospitalName: String(x.hospitalName || ''),
        department: String(x.department || ''),
        patientName: String(x.patientName || ''),
        patientEmail: String(x.patientEmail || ''),
        patientPhone: String(x.patientPhone || ''),
        notes: String(x.notes || ''),
        fileName: String(x.fileName || ''),
        fileUrl: String(x.fileUrl || ''),
        createdAt:
          x.createdAt && typeof (x.createdAt as { toDate?: () => Date }).toDate === 'function'
            ? (x.createdAt as { toDate: () => Date }).toDate().toISOString()
            : String(x.createdAt || '')
      };
    });
    return rows.sort((a, b) => b.createdAt.localeCompare(a.createdAt));
  } catch(e) {
    console.error('fetchPatientFilesByEmail error:', e);
    return [];
  }
}

/**
 * Real-time listener for patient files.
 */
export function subscribeToStaffPatientFiles(
  staffUid: string,
  onUpdate: (files: HospitalPatientFileRecord[]) => void,
  onError?: (error: unknown) => void
) {
  if (!staffUid?.trim()) {
    onUpdate([]);
    return () => {};
  }
  const q = query(patientFilesCol(), where('staffUid', '==', staffUid));
  try {
    return onSnapshot(
      q,
      (snap) => {
        const rows = snap.docs.map((d) => {
          const x = d.data() as Record<string, unknown>;
          return {
            id: d.id,
            staffUid: String(x.staffUid || ''),
            hospitalName: String(x.hospitalName || ''),
            department: String(x.department || ''),
            patientName: String(x.patientName || ''),
            patientEmail: String(x.patientEmail || ''),
            patientPhone: String(x.patientPhone || ''),
            notes: String(x.notes || ''),
            fileName: String(x.fileName || ''),
            fileUrl: String(x.fileUrl || ''),
            createdAt:
              x.createdAt && typeof (x.createdAt as { toDate?: () => Date }).toDate === 'function'
                ? (x.createdAt as { toDate: () => Date }).toDate().toISOString()
                : String(x.createdAt || '')
          };
        });
        onUpdate(rows.sort((a, b) => b.createdAt.localeCompare(a.createdAt)));
      },
      (error) => {
        console.error('subscribeToStaffPatientFiles', error);
        onError?.(error);
      }
    );
  } catch (error) {
    console.error('subscribeToStaffPatientFiles setup failed', error);
    onError?.(error);
    onUpdate([]);
    return () => {};
  }
}

/**
 * Real-time listener for appointments.
 */
export function subscribeToStaffAppointments(
  staffUid: string,
  onUpdate: (appointments: HospitalAppointment[]) => void,
  onError?: (error: unknown) => void
) {
  if (!staffUid?.trim()) {
    onUpdate([]);
    return () => {};
  }
  const q = query(appointmentsCol(), where('staffUid', '==', staffUid));
  try {
    return onSnapshot(
      q,
      (snap) => {
        const list = snap.docs.map((d) => {
          const x = d.data() as Record<string, unknown>;
          return {
            id: d.id,
            staffUid: String(x.staffUid || ''),
            hospitalName: String(x.hospitalName || ''),
            department: String(x.department || ''),
            patientName: String(x.patientName || ''),
            patientContact: String(x.patientContact || ''),
            scheduledAt: String(x.scheduledAt || ''),
            status: (x.status as HospitalAppointment['status']) || 'scheduled',
            notes: String(x.notes || ''),
            createdAt: String(x.createdAt || '')
          };
        });
        onUpdate(list.sort((a, b) => a.scheduledAt.localeCompare(b.scheduledAt)));
      },
      (error) => {
        console.error('subscribeToStaffAppointments', error);
        onError?.(error);
      }
    );
  } catch (error) {
    console.error('subscribeToStaffAppointments setup failed', error);
    onError?.(error);
    onUpdate([]);
    return () => {};
  }
}

export async function uploadPatientFileAndRecord(
  staff: HospitalStaffProfile,
  patientId: string,
  patientName: string,
  patientEmail: string,
  patientPhone: string,
  notes: string,
  file: File
): Promise<{ success: boolean; message: string }> {
  try {
    const safeName = file.name.replace(/[^\w.\-]/g, '_');
    const path = `hospitalFiles/${staff.id}/${Date.now()}_${safeName}`;
    const sref = ref(getFirebaseStorage(), path);
    await uploadBytes(sref, file);
    const fileUrl = await getDownloadURL(sref);
    const createdAt = new Date().toISOString();
    await addDoc(patientFilesCol(), {
      staffUid: staff.id,
      hospitalName: staff.hospitalName,
      department: staff.department,
      patientName,
      patientEmail,
      patientPhone,
      notes,
      fileName: file.name,
      fileUrl,
      createdAt,
      updatedAt: serverTimestamp()
    });
    const identityKey = patientId.trim() || patientEmail.trim() || patientPhone.trim();
    if (identityKey) {
      void registerReportForPatient({
        patientId: identityKey,
        report: {
          file_name: file.name,
          s3_url: fileUrl,
          profile: {
            firstName: patientName.split(' ')[0] || patientName,
            lastName: patientName.split(' ').slice(1).join(' '),
            emergencyContact: patientPhone
          }
        }
      }).catch(() => {});
    }
    return { success: true, message: 'File saved.' };
  } catch (e) {
    console.error('uploadPatientFileAndRecord', e);
    return { success: false, message: 'Upload failed. Check Storage rules and connection.' };
  }
}

export async function deletePatientFileRecord(docId: string): Promise<{ success: boolean; message: string }> {
  try {
    await deleteDoc(doc(patientFilesCol(), docId));
    return { success: true, message: 'Removed.' };
  } catch (e) {
    console.error('deletePatientFileRecord', e);
    return { success: false, message: 'Could not delete record.' };
  }
}

export async function listStaffAppointments(staffUid: string, departmentFilter?: string): Promise<HospitalAppointment[]> {
  const q = query(appointmentsCol(), where('staffUid', '==', staffUid));
  const snap = await getDocs(q);
  const list = snap.docs.map((d) => {
    const x = d.data() as Record<string, unknown>;
    return {
      id: d.id,
      staffUid: String(x.staffUid || ''),
      hospitalName: String(x.hospitalName || ''),
      department: String(x.department || ''),
      patientName: String(x.patientName || ''),
      patientContact: String(x.patientContact || ''),
      scheduledAt: String(x.scheduledAt || ''),
      status: (x.status as HospitalAppointment['status']) || 'scheduled',
      notes: String(x.notes || ''),
      createdAt: String(x.createdAt || '')
    };
  });
  list.sort((a, b) => a.scheduledAt.localeCompare(b.scheduledAt));
  if (departmentFilter && departmentFilter !== 'All') {
    return list.filter((a) => a.department === departmentFilter);
  }
  return list;
}

export async function createAppointment(
  staff: HospitalStaffProfile,
  patientName: string,
  patientContact: string,
  scheduledAt: string,
  notes: string
): Promise<{ success: boolean; message: string }> {
  try {
    const createdAt = new Date().toISOString();
    await addDoc(appointmentsCol(), {
      staffUid: staff.id,
      hospitalName: staff.hospitalName,
      department: staff.department,
      patientName,
      patientContact,
      scheduledAt,
      status: 'scheduled',
      notes,
      createdAt,
      updatedAt: serverTimestamp()
    });
    return { success: true, message: 'Appointment created.' };
  } catch (e) {
    console.error('createAppointment', e);
    return { success: false, message: 'Could not save appointment.' };
  }
}

export async function updateAppointmentStatus(
  docId: string,
  status: HospitalAppointment['status']
): Promise<{ success: boolean; message: string }> {
  try {
    await updateDoc(doc(appointmentsCol(), docId), { status, updatedAt: serverTimestamp() });
    return { success: true, message: 'Updated.' };
  } catch (e) {
    console.error('updateAppointmentStatus', e);
    return { success: false, message: 'Update failed.' };
  }
}

export async function deleteAppointment(docId: string): Promise<{ success: boolean; message: string }> {
  try {
    await deleteDoc(doc(appointmentsCol(), docId));
    return { success: true, message: 'Deleted.' };
  } catch (e) {
    console.error('deleteAppointment', e);
    return { success: false, message: 'Could not delete.' };
  }
}
