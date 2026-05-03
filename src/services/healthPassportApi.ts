export type PassportPatient = {
  id: string;
  patient_id: string;
  name: string;
  bloodGroup: string;
  emergencyContact: string;
  diseases: string[];
  medications: string[];
  allergies: string[];
};

const API_BASE = import.meta.env.VITE_API_BASE_URL || '';

async function parseJson(res: Response) {
  const data = await res.json().catch(() => ({}));
  if (!res.ok) {
    throw new Error(data.message || 'Request failed');
  }
  return data;
}

export async function generateQrToken(input: {
  patientId: string;
  profile: Record<string, unknown>;
}) {
  const res = await fetch(`${API_BASE}/api/generate-qr`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(input)
  });
  return parseJson(res);
}

export async function getHealthPassportByToken(token: string): Promise<{
  patient: PassportPatient;
  summary: { summary_pdf_url: string; last_updated: string } | null;
  reports: Array<{ report_id: string; file_name: string; s3_url: string; created_at: string }>;
}> {
  const res = await fetch(`${API_BASE}/api/health-passport/${encodeURIComponent(token)}`);
  return parseJson(res);
}

export async function getEmergencyPassportByToken(token: string): Promise<{
  emergency: { bloodGroup: string; allergies: string[]; emergencyContact: string };
}> {
  const res = await fetch(`${API_BASE}/api/emergency-passport/${encodeURIComponent(token)}`);
  return parseJson(res);
}

export async function regenerateSummary(patientId: string, profile?: Record<string, unknown>) {
  const res = await fetch(`${API_BASE}/api/summary/regenerate/${encodeURIComponent(patientId)}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ profile: profile || {} })
  });
  return parseJson(res);
}

export async function registerReportForPatient(input: {
  patientId: string;
  report: { s3_url: string; file_name: string; report_id?: string; profile?: Record<string, unknown> };
}) {
  const res = await fetch(`${API_BASE}/api/reports/register`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(input)
  });
  return parseJson(res);
}

export async function requestOtp(token: string) {
  const res = await fetch(`${API_BASE}/api/access/request-otp`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ token })
  });
  return parseJson(res);
}

export async function verifyOtp(token: string, otp: string) {
  const res = await fetch(`${API_BASE}/api/access/verify-otp`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ token, otp })
  });
  return parseJson(res);
}
