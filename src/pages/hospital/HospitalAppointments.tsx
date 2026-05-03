import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { ArrowLeft } from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import {
  createAppointment,
  deleteAppointment,
  subscribeToStaffAppointments,
  updateAppointmentStatus
} from '../../services/firebaseHospitalData';
import { HOSPITAL_DEPARTMENT_OPTIONS } from '../../types/hospital';
import type { HospitalAppointment } from '../../types/hospital';

const HospitalAppointments: React.FC = () => {
  const { staff } = useAuth();
  const [rows, setRows] = useState<HospitalAppointment[]>([]);
  const [loading, setLoading] = useState(true);
  const [deptFilter, setDeptFilter] = useState<string>('My department');
  const [msg, setMsg] = useState<string | null>(null);
  const [patientName, setPatientName] = useState('');
  const [patientContact, setPatientContact] = useState('');
  const [scheduledAt, setScheduledAt] = useState('');
  const [notes, setNotes] = useState('');
  const [saving, setSaving] = useState(false);

  const effectiveFilter: string | undefined =
    deptFilter === 'My department' ? staff?.department : deptFilter === 'All' ? undefined : deptFilter;

  useEffect(() => {
    if (!staff) return;
    setLoading(true);
    const unsubscribe = subscribeToStaffAppointments(
      staff.id,
      (list) => {
        if (effectiveFilter) {
          setRows(list.filter(a => a.department === effectiveFilter));
        } else {
          setRows(list);
        }
        setLoading(false);
      },
      () => {
        setMsg('Realtime sync failed. Please refresh.');
        setLoading(false);
      }
    );
    return () => unsubscribe();
  }, [staff, effectiveFilter]);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!staff || !patientName.trim() || !scheduledAt) {
      setMsg('Patient name and date/time are required.');
      return;
    }
    setSaving(true);
    setMsg(null);
    try {
      const iso = new Date(scheduledAt).toISOString();
      const res = await createAppointment(staff, patientName.trim(), patientContact.trim(), iso, notes.trim());
      setMsg(res.message);
      if (res.success) {
        setPatientName('');
        setPatientContact('');
        setScheduledAt('');
        setNotes('');
      }
    } finally {
      setSaving(false);
    }
  };

  const setStatus = async (id: string, status: HospitalAppointment['status']) => {
    const res = await updateAppointmentStatus(id, status);
    setMsg(res.message);
  };

  const remove = async (id: string) => {
    if (!confirm('Delete this appointment?')) return;
    const res = await deleteAppointment(id);
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

        <h1 className="text-2xl font-bold text-gray-900 mb-2">Appointments</h1>
        <p className="text-gray-600 text-sm mb-6">
          New bookings default to your department: <strong>{staff.department}</strong>. Filter the list to focus on one
          department.
        </p>

        <div className="mb-6 flex flex-wrap items-center gap-2">
          <label className="text-sm text-gray-600">Show:</label>
          <select
            value={deptFilter}
            onChange={(e) => setDeptFilter(e.target.value)}
            className="border border-gray-300 rounded-lg px-3 py-2 text-sm"
          >
            <option value="My department">My department</option>
            <option value="All">All my departments (same hospital profile)</option>
            {HOSPITAL_DEPARTMENT_OPTIONS.map((d) => (
              <option key={d} value={d}>
                {d}
              </option>
            ))}
          </select>
        </div>

        <form onSubmit={submit} className="bg-white rounded-2xl shadow border border-gray-100 p-6 mb-10 space-y-4">
          <h2 className="font-semibold text-gray-900">Book appointment</h2>
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
              <label className="block text-xs font-medium text-gray-600 mb-1">Contact (phone / email)</label>
              <input
                value={patientContact}
                onChange={(e) => setPatientContact(e.target.value)}
                className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm"
              />
            </div>
            <div className="sm:col-span-2">
              <label className="block text-xs font-medium text-gray-600 mb-1">Date & time *</label>
              <input
                type="datetime-local"
                required
                value={scheduledAt}
                onChange={(e) => setScheduledAt(e.target.value)}
                className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm"
              />
            </div>
            <div className="sm:col-span-2">
              <label className="block text-xs font-medium text-gray-600 mb-1">Notes</label>
              <textarea
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                rows={2}
                className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm"
              />
            </div>
          </div>
          {msg && <p className="text-sm text-gray-700">{msg}</p>}
          <button
            type="submit"
            disabled={saving}
            className="px-4 py-2 rounded-lg bg-blue-600 text-white text-sm font-medium hover:bg-blue-700 disabled:opacity-50"
          >
            {saving ? 'Saving…' : 'Create appointment'}
          </button>
        </form>

        <div className="bg-white rounded-2xl shadow border border-gray-100 overflow-hidden">
          <div className="px-6 py-4 border-b border-gray-100 font-semibold text-gray-900">Upcoming & recent</div>
          {loading ? (
            <p className="p-6 text-gray-500 text-sm">Loading…</p>
          ) : rows.length === 0 ? (
            <p className="p-6 text-gray-500 text-sm">No appointments match this filter.</p>
          ) : (
            <ul className="divide-y divide-gray-100">
              {rows.map((a) => (
                <li key={a.id} className="px-6 py-4 flex flex-col gap-2">
                  <div className="flex flex-wrap justify-between gap-2">
                    <div>
                      <p className="font-medium text-gray-900">{a.patientName}</p>
                      <p className="text-xs text-gray-500">
                        {a.department} · {new Date(a.scheduledAt).toLocaleString()} ·{' '}
                        <span className="capitalize">{a.status}</span>
                      </p>
                      {a.patientContact && <p className="text-xs text-gray-600">{a.patientContact}</p>}
                    </div>
                    <div className="flex flex-wrap gap-2">
                      {a.status === 'scheduled' && (
                        <>
                          <button
                            type="button"
                            onClick={() => void setStatus(a.id, 'completed')}
                            className="text-xs px-2 py-1 rounded bg-green-50 text-green-800 hover:bg-green-100"
                          >
                            Complete
                          </button>
                          <button
                            type="button"
                            onClick={() => void setStatus(a.id, 'cancelled')}
                            className="text-xs px-2 py-1 rounded bg-amber-50 text-amber-800 hover:bg-amber-100"
                          >
                            Cancel
                          </button>
                        </>
                      )}
                      <button
                        type="button"
                        onClick={() => void remove(a.id)}
                        className="text-xs px-2 py-1 rounded text-red-600 hover:bg-red-50"
                      >
                        Delete
                      </button>
                    </div>
                  </div>
                  {a.notes && <p className="text-sm text-gray-600">{a.notes}</p>}
                </li>
              ))}
            </ul>
          )}
        </div>
      </div>
    </div>
  );
};

export default HospitalAppointments;
