/**
 * Deployed Health Record Companion app (Supabase cloud). Set in .env:
 * VITE_HEALTH_RECORD_COMPANION_URL=https://your-app.lovable.app
 */
export function getHealthRecordCompanionBaseUrl(): string | null {
  const raw = import.meta.env.VITE_HEALTH_RECORD_COMPANION_URL;
  if (raw === undefined || raw === null) return null;
  const s = String(raw).trim();
  if (!s) return null;
  return s.replace(/\/$/, '');
}

/**
 * PHP (or other) endpoint that accepts POST multipart `file` and returns JSON with `file_url` and `summary`
 * (same contract as health-record-companion ReportSummary / PatientDetail upload flow).
 * Example: https://your-domain.com/upload.php
 */
export function getCloudReportUploadUrl(): string | null {
  const raw = import.meta.env.VITE_CLOUD_REPORT_UPLOAD_URL;
  if (raw === undefined || raw === null) return null;
  const s = String(raw).trim();
  if (!s) return null;
  return s;
}
