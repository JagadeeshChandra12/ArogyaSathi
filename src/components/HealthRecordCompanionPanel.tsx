import React, { useMemo, useState } from 'react';
import { Brain, ExternalLink, FileStack, Sparkles } from 'lucide-react';
import { getCloudReportUploadUrl, getHealthRecordCompanionBaseUrl } from '../config/healthRecordCompanion';
import CloudMedicalDocumentPanel from './CloudMedicalDocumentPanel';

type Variant = 'doctor' | 'patient';

interface HealthRecordCompanionPanelProps {
  variant: Variant;
  className?: string;
}

/**
 * Cloud document upload (same API as health-record-companion ReportSummary) plus optional links/embed
 * to the separate Health Record Companion deployment (Supabase).
 */
export default function HealthRecordCompanionPanel({ variant, className = '' }: HealthRecordCompanionPanelProps) {
  const base = getHealthRecordCompanionBaseUrl();
  const [embedOpen, setEmbedOpen] = useState(false);

  const links = useMemo(() => {
    if (!base) return null;
    if (variant === 'doctor') {
      return {
        title: 'Health Record Companion (cloud workspace)',
        subtitle:
          'Full patient list, timelines, Supabase storage, and edge summaries — open in a new tab or embed below.',
        primary: { label: 'Patient list & documents', href: `${base}/patients` },
        secondary: { label: 'Dashboard overview', href: `${base}/` }
      };
    }
    return {
      title: 'Health Record Companion (cloud workspace)',
      subtitle:
        'Extended cloud workspace for reports, timelines, and AI summaries alongside Arogya Sathi tools below.',
      primary: { label: 'Reports & AI summary', href: `${base}/report-summary` },
      secondary: { label: 'My records workspace', href: `${base}/patients` }
    };
  }, [base, variant]);

  const cloudUploadEnabled = Boolean(getCloudReportUploadUrl());

  if (!cloudUploadEnabled && !base) {
    return (
      <div
        className={`rounded-2xl border border-dashed border-gray-300 bg-gray-50/80 p-5 text-sm text-gray-600 ${className}`}
      >
        <p className="font-medium text-gray-800">Health Record Companion — cloud documents</p>
        <p className="mt-2">
          Add <code className="rounded bg-gray-200 px-1.5 py-0.5 text-xs">VITE_CLOUD_REPORT_UPLOAD_URL</code> with your
          deployed <code className="rounded bg-gray-200 px-1.5 py-0.5 text-xs">upload.php</code> URL for inline
          summaries and document links.
        </p>
        <p className="mt-2">
          Optionally add{' '}
          <code className="rounded bg-gray-200 px-1.5 py-0.5 text-xs">VITE_HEALTH_RECORD_COMPANION_URL</code> for
          the full companion app (patients, timelines, Supabase).
        </p>
      </div>
    );
  }

  return (
    <div className={`space-y-6 ${className}`}>
      {cloudUploadEnabled && <CloudMedicalDocumentPanel variant={variant} />}

      {base && links && (
        <div className="relative overflow-hidden rounded-2xl border border-indigo-200/80 bg-gradient-to-br from-indigo-50 via-white to-violet-50 shadow-sm">
          <div className="absolute right-0 top-0 h-32 w-32 translate-x-8 -translate-y-8 rounded-full bg-indigo-200/30 blur-2xl" />
          <div className="relative p-6 sm:p-7">
            <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
              <div className="flex gap-3">
                <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-indigo-600 text-white shadow-md">
                  <FileStack className="h-6 w-6" />
                </div>
                <div>
                  <h2 className="text-lg font-semibold text-gray-900">{links.title}</h2>
                  <p className="mt-1 max-w-2xl text-sm text-gray-600">{links.subtitle}</p>
                  <p className="mt-2 flex flex-wrap items-center gap-2 text-xs text-indigo-700/90">
                    <Sparkles className="h-3.5 w-3.5" />
                    Sign in on the companion site uses its own secure account (same email is fine).
                  </p>
                </div>
              </div>
              <div className="flex flex-col gap-2 sm:items-end">
                <a
                  href={links.primary.href}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center justify-center gap-2 rounded-xl bg-indigo-600 px-4 py-2.5 text-sm font-semibold text-white shadow-md transition hover:bg-indigo-700"
                >
                  {links.primary.label}
                  <ExternalLink className="h-4 w-4 opacity-90" />
                </a>
                <a
                  href={links.secondary.href}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center justify-center gap-2 rounded-xl border border-indigo-200 bg-white/80 px-4 py-2 text-sm font-medium text-indigo-800 transition hover:bg-indigo-50"
                >
                  <Brain className="h-4 w-4" />
                  {links.secondary.label}
                </a>
              </div>
            </div>

            <div className="mt-5 border-t border-indigo-100 pt-4">
              <button
                type="button"
                onClick={() => setEmbedOpen((o) => !o)}
                className="text-sm font-medium text-indigo-700 underline-offset-2 hover:underline"
              >
                {embedOpen ? 'Hide' : 'Show'} embedded workspace
              </button>
              <p className="mt-1 text-xs text-gray-500">
                If the frame stays blank, your host may block embedding; use the buttons above to open in a new tab.
              </p>
              {embedOpen && (
                <iframe
                  title="Health Record Companion"
                  src={links.primary.href}
                  className="mt-3 h-[min(65vh,560px)] w-full rounded-xl border border-indigo-200 bg-white shadow-inner"
                  sandbox="allow-scripts allow-same-origin allow-forms allow-popups allow-downloads"
                />
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
