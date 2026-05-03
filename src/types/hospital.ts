export type HospitalName =
  | 'KIMS'
  | 'Manipal'
  | 'Apollo'
  | 'Narayana'
  | 'Care Hospitals'
  | 'Other';

export type HospitalDepartment =
  | 'Cardiology'
  | 'Neurology'
  | 'Orthopedics'
  | 'General Medicine'
  | 'Pediatrics'
  | 'Emergency'
  | 'Oncology'
  | 'Other';

export const HOSPITAL_NAME_OPTIONS: HospitalName[] = [
  'KIMS',
  'Manipal',
  'Apollo',
  'Narayana',
  'Care Hospitals',
  'Other'
];

export const HOSPITAL_DEPARTMENT_OPTIONS: HospitalDepartment[] = [
  'Cardiology',
  'Neurology',
  'Orthopedics',
  'General Medicine',
  'Pediatrics',
  'Emergency',
  'Oncology',
  'Other'
];

export interface HospitalStaffProfile {
  id: string;
  email: string;
  fullName: string;
  hospitalName: string;
  hospitalCustom?: string;
  specialization: string;
  department: string;
  phone?: string;
  createdAt: string;
}

export interface HospitalPatientFileRecord {
  id: string;
  staffUid: string;
  hospitalName: string;
  department: string;
  patientName: string;
  patientEmail: string;
  patientPhone: string;
  notes: string;
  fileName: string;
  fileUrl: string;
  createdAt: string;
}

export interface HospitalAppointment {
  id: string;
  staffUid: string;
  hospitalName: string;
  department: string;
  patientName: string;
  patientContact: string;
  scheduledAt: string;
  status: 'scheduled' | 'completed' | 'cancelled';
  notes: string;
  createdAt: string;
}
