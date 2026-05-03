import React, { useEffect, useState } from 'react';
import { Brain, CheckCircle2, Clock, ExternalLink, FileText, History, Loader2, Upload } from 'lucide-react';
import { getCloudReportUploadUrl } from '../config/healthRecordCompanion';
import { uploadMedicalReportToCloud } from '../services/cloudReportUpload';

type Variant = 'doctor' | 'patient';

export interface CloudHistoryEntry {
  id: string;
  file_url: string;
  summary: string;
  timestamp: string;
  fileName: string;
}

const STORAGE_KEYS: Record<Variant, string> = {
  patient: 'arogya_cloud_report_history_patient',
  doctor: 'arogya_cloud_report_history_doctor'
};

interface CloudMedicalDocumentPanelProps {
  variant: Variant;
  className?: string;
}

/**
 * Inline cloud upload + AI summary (same backend as health-record-companion ReportSummary).
 */
export default function CloudMedicalDocumentPanel({ variant, className = '' }: CloudMedicalDocumentPanelProps) {
  const uploadUrl = getCloudReportUploadUrl();
  const [file, setFile] = useState<File | null>(null);
  const [busy, setBusy] = useState(false);
  const [progress, setProgress] = useState(0);
  const [result, setResult] = useState<{ file_url: string; summary: string } | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [history, setHistory] = useState<CloudHistoryEntry[]>([]);

  useEffect(() => {
    try {
      const raw = localStorage.getItem(STORAGE_KEYS[variant]);
      if (raw) setHistory(JSON.parse(raw) as CloudHistoryEntry[]);
    } catch {
      setHistory([]);
    }
  }, [variant]);

  const persistHistory = (next: CloudHistoryEntry[]) => {
    setHistory(next);
    try {
      localStorage.setItem(STORAGE_KEYS[variant], JSON.stringify(next));
    } catch {
      /* ignore quota */
    }
  };

  const handleUpload = async () => {
    if (!uploadUrl || !file) return;
    setError(null);
    setResult(null);
    setBusy(true);
    setProgress(8);

    const tick = window.setInterval(() => {
      setProgress((p) => (p < 88 ? p + 6 : p));
    }, 280);

    try {
      const data = await uploadMedicalReportToCloud(uploadUrl, file);
      setProgress(100);
      setResult(data);

      const entry: CloudHistoryEntry = {
        id: crypto.randomUUID(),
        file_url: data.file_url,
        summary: data.summary,
        timestamp: new Date().toLocaleString(),
        fileName: file.name
      };
      setHistory((prev) => {
        const next = [entry, ...prev];
        try {
          localStorage.setItem(STORAGE_KEYS[variant], JSON.stringify(next));
        } catch {
          /* ignore */
        }
        return next;
      });
    } catch (e: unknown) {
      const msg = e instanceof Error ? e.message : 'Upload failed.';
      setError(msg);
    } finally {
      window.clearInterval(tick);
      setBusy(false);
      setTimeout(() => setProgress(0), 600);
    }
  };

  if (!uploadUrl) {
    return null;
  }

  const title =
    variant === 'doctor'
      ? 'Cloud report summary (for patients)'
      : 'Cloud report summary';

  return (
    <div
      className={`rounded-2xl border border-emerald-200/90 bg-gradient-to-br from-emerald-50/90 via-white to-teal-50/80 p-6 shadow-sm ${className}`}
    >
      <div className="flex flex-wrap items-start gap-3">
        <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-emerald-600 text-white shadow-md">
          <Brain className="h-6 w-6" />
        </div>
        <div className="min-w-0 flex-1">
          <h2 className="text-lg font-semibold text-gray-900">{title}</h2>
          <p className="mt-1 text-sm text-gray-600">
            Upload a PDF or image — your separate cloud project processes the file and returns a summary plus a stored
            document link (same flow as Health Record Companion).
          </p>
        </div>
      </div>

      <div className="mt-5 rounded-xl border-2 border-dashed border-emerald-200/80 bg-white/70 p-6">
        <label className="relative flex cursor-pointer flex-col items-center justify-center gap-2 text-center">
          <input
            type="file"
            className="absolute inset-0 cursor-pointer opacity-0"
            accept=".pdf,.png,.jpg,.jpeg,.txt"
            disabled={busy}
            onChange={(e) => {
              const f = e.target.files?.[0] ?? null;
              setFile(f);
              setResult(null);
              setError(null);
            }}
          />
          <Upload className="h-8 w-8 text-emerald-600" />
          <span className="font-medium text-gray-900">{file ? file.name : 'Click to choose a report'}</span>
          <span className="text-xs text-gray-500">PDF, PNG, JPG, TXT — processed on your cloud endpoint</span>
        </label>

        {busy && (
          <div className="mt-4 space-y-2">
            <div className="flex justify-between text-xs font-medium text-gray-600">
              <span>Processing…</span>
              <span>{progress}%</span>
            </div>
            <div className="h-2 overflow-hidden rounded-full bg-gray-200">
              <div
                className="h-full rounded-full bg-gradient-to-r from-emerald-500 to-teal-500 transition-all duration-300"
                style={{ width: `${progress}%` }}
              />
            </div>
          </div>
        )}

        {error && (
          <p className="mt-4 rounded-lg bg-red-50 px-3 py-2 text-sm text-red-800" role="alert">
            {error}
          </p>
        )}

        <button
          type="button"
          disabled={!file || busy}
          onClick={() => void handleUpload()}
          className="mt-5 flex w-full items-center justify-center gap-2 rounded-xl bg-emerald-600 py-3 text-sm font-semibold text-white shadow-md transition hover:bg-emerald-700 disabled:cursor-not-allowed disabled:opacity-50"
        >
          {busy ? (
            <>
              <Loader2 className="h-4 w-4 animate-spin" />
              Processing…
            </>
          ) : (
            <>
              <Brain className="h-4 w-4" />
              Generate cloud summary
            </>
          )}
        </button>
      </div>

      {result && (
        <div className="mt-5 rounded-xl border border-green-200 bg-green-50/50 p-5">
          <div className="flex items-center gap-2 text-green-700">
            <CheckCircle2 className="h-5 w-5 shrink-0" />
            <span className="text-xs font-bold uppercase tracking-wide">Summary ready</span>
          </div>
          <p className="mt-3 whitespace-pre-wrap text-sm italic leading-relaxed text-gray-800">&ldquo;{result.summary}&rdquo;</p>
          <div className="mt-4 flex flex-wrap gap-2">
            <a
              href={result.file_url}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-2 rounded-lg bg-emerald-600 px-4 py-2 text-sm font-medium text-white hover:bg-emerald-700"
            >
              <ExternalLink className="h-4 w-4" />
              Open stored document
            </a>
            <button
              type="button"
              className="rounded-lg border border-gray-300 bg-white px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50"
              onClick={() => {
                setFile(null);
                setResult(null);
              }}
            >
              Upload another
            </button>
          </div>
        </div>
      )}

      {history.length > 0 && (
        <div className="mt-6 border-t border-emerald-100 pt-5">
          <div className="mb-3 flex items-center justify-between">
            <div className="flex items-center gap-2 text-gray-800">
              <History className="h-5 w-5 text-emerald-700" />
              <span className="font-semibold">Recent cloud summaries</span>
            </div>
            <button
              type="button"
              className="text-xs font-medium text-gray-500 hover:text-red-600"
              onClick={() => {
                persistHistory([]);
                localStorage.removeItem(STORAGE_KEYS[variant]);
              }}
            >
              Clear
            </button>
          </div>
          <ul className="space-y-3">
            {history.map((item) => (
              <li
                key={item.id}
                className="flex flex-col gap-2 rounded-lg border border-gray-100 bg-white/90 p-4 sm:flex-row sm:items-start sm:justify-between"
              >
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2">
                    <FileText className="h-4 w-4 shrink-0 text-emerald-600" />
                    <span className="truncate font-medium text-gray-900">{item.fileName}</span>
                  </div>
                  <p className="mt-1 line-clamp-2 pl-6 text-xs text-gray-600">&ldquo;{item.summary}&rdquo;</p>
                  <p className="mt-1 flex items-center gap-1 pl-6 text-xs text-gray-400">
                    <Clock className="h-3 w-3" />
                    {item.timestamp}
                  </p>
                </div>
                <a
                  href={item.file_url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex shrink-0 items-center gap-1 rounded-lg border border-emerald-200 bg-emerald-50 px-3 py-1.5 text-xs font-medium text-emerald-800 hover:bg-emerald-100"
                >
                  <ExternalLink className="h-3.5 w-3.5" />
                  Document
                </a>
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}
