import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { ArrowLeft, Trash2, Upload } from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import {
  deletePatientFileRecord,
  subscribeToStaffPatientFiles,
  uploadPatientFileAndRecord
} from '../../services/firebaseHospitalData';
import type { HospitalPatientFileRecord } from '../../types/hospital';
import HealthRecordCompanionPanel from '../../components/HealthRecordCompanionPanel';

const HospitalFiles: React.FC = () => {
  const { staff } = useAuth();
  const [rows, setRows] = useState<HospitalPatientFileRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState(false);
  const [msg, setMsg] = useState<string | null>(null);
  const [patientName, setPatientName] = useState('');
  const [patientId, setPatientId] = useState('');
  const [patientEmail, setPatientEmail] = useState('');
  const [patientPhone, setPatientPhone] = useState('');
  const [notes, setNotes] = useState('');
  const [file, setFile] = useState<File | null>(null);

  useEffect(() => {
    if (!staff) return;
    setLoading(true);
    const unsubscribe = subscribeToStaffPatientFiles(
      staff.id,
      (files) => {
        setRows(files);
        setLoading(false);
      },
      () => {
        setMsg('Realtime sync failed. Please refresh.');
        setLoading(false);
      }
    );
    return () => unsubscribe();
  }, [staff]);

  const onUpload = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!staff || !file || !patientName.trim()) {
      setMsg('Patient name and a file are required.');
      return;
    }
    setUploading(true);
    setMsg(null);
    try {
      const res = await uploadPatientFileAndRecord(
        staff,
        patientId.trim(),
        patientName.trim(),
        patientEmail.trim(),
        patientPhone.trim(),
        notes.trim(),
        file
      );
      setMsg(res.message);
      if (res.success) {
        setPatientName('');
        setPatientId('');
        setPatientEmail('');
        setPatientPhone('');
        setNotes('');
        setFile(null);
      }
    } finally {
      setUploading(false);
    }
  };

  const onDelete = async (id: string) => {
    if (!confirm('Remove this file record?')) return;
    const res = await deletePatientFileRecord(id);
    setMsg(res.message);
  };

  if (!staff) return null;

  return (
    <div className="min-h-screen bg-slate-50 pt-24 pb-16 px-4">
      <div className="max-w-4xl mx-auto">
        <Link
          to="/hospital"
          className="inline-flex items-center gap-2 text-sm text-blue-600 hover:text-blue-800 mb-6"
        >
          <ArrowLeft className="h-4 w-4" />
          Dashboard
        </Link>

        <h1 className="text-2xl font-bold text-gray-900 mb-2">Patient files</h1>
        <p className="text-gray-600 text-sm mb-8">
          Attach documents for patients who visited {staff.hospitalName}. Files are tagged with your department (
          {staff.department}).
        </p>

        <div className="mb-10">
          <HealthRecordCompanionPanel variant="doctor" />
        </div>

        <form onSubmit={onUpload} className="bg-white rounded-2xl shadow border border-gray-100 p-6 mb-10 space-y-4">
          <h2 className="font-semibold text-gray-900">Upload for a patient</h2>
          <div className="grid sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1">Patient name *</label>
              <input
                required
                value={patientName}
                onChange={(e) => setPatientName(e.target.value)}
                className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1">Patient ID (preferred)</label>
              <input
                value={patientId}
                onChange={(e) => setPatientId(e.target.value)}
                className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1">Patient email</label>
              <input
                type="email"
                value={patientEmail}
                onChange={(e) => setPatientEmail(e.target.value)}
                className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1">Patient phone</label>
              <input
                value={patientPhone}
                onChange={(e) => setPatientPhone(e.target.value)}
                className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1">File *</label>
              <input
                type="file"
                required
                onChange={(e) => setFile(e.target.files?.[0] ?? null)}
                className="w-full text-sm"
              />
            </div>
          </div>
          <div>
            <label className="block text-xs font-medium text-gray-600 mb-1">Notes</label>
            <textarea
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              rows={2}
              className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm"
            />
          </div>
          {msg && <p className="text-sm text-gray-700">{msg}</p>}
          <button
            type="submit"
            disabled={uploading}
            className="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-blue-600 text-white text-sm font-medium hover:bg-blue-700 disabled:opacity-50"
          >
            <Upload className="h-4 w-4" />
            {uploading ? 'Uploading…' : 'Upload'}
          </button>
        </form>

        <div className="bg-white rounded-2xl shadow border border-gray-100 overflow-hidden">
          <div className="px-6 py-4 border-b border-gray-100 font-semibold text-gray-900">Recent uploads</div>
          {loading ? (
            <p className="p-6 text-gray-500 text-sm">Loading…</p>
          ) : rows.length === 0 ? (
            <p className="p-6 text-gray-500 text-sm">No files yet.</p>
          ) : (
            <ul className="divide-y divide-gray-100">
              {rows.map((r) => (
                <li key={r.id} className="px-6 py-4 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
                  <div>
                    <p className="font-medium text-gray-900">{r.patientName}</p>
                    <p className="text-xs text-gray-500">
                      {r.fileName} · {new Date(r.createdAt).toLocaleString()}
                    </p>
                    {r.patientEmail && <p className="text-xs text-gray-600">{r.patientEmail}</p>}
                  </div>
                  <div className="flex items-center gap-3">
                    <a
                      href={r.fileUrl}
                      target="_blank"
                      rel="noreferrer"
                      className="text-sm text-blue-600 hover:underline"
                    >
                      Open
                    </a>
                    <button
                      type="button"
                      onClick={() => void onDelete(r.id)}
                      className="p-2 text-red-600 hover:bg-red-50 rounded-lg"
                      aria-label="Delete"
                    >
                      <Trash2 className="h-4 w-4" />
                    </button>
                  </div>
                </li>
              ))}
            </ul>
          )}
        </div>
      </div>
    </div>
  );
};

export default HospitalFiles;
