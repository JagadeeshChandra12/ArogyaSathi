import React, { useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { FaEnvelope, FaEye, FaEyeSlash, FaLock, FaUser } from 'react-icons/fa';
import { isFirebaseConfigured } from '../../firebase/config';
import { registerHospitalStaff } from '../../services/firebaseHospitalData';
import { useAuth } from '../../context/AuthContext';
import { HOSPITAL_DEPARTMENT_OPTIONS, HOSPITAL_NAME_OPTIONS } from '../../types/hospital';

const HospitalSignUp: React.FC = () => {
  const navigate = useNavigate();
  const { refreshProfile, staff, loading: authLoading } = useAuth();
  const [showPassword, setShowPassword] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);
  const [form, setForm] = useState({
    fullName: '',
    email: '',
    password: '',
    hospitalName: 'KIMS' as (typeof HOSPITAL_NAME_OPTIONS)[number],
    hospitalCustom: '',
    specialization: '',
    department: 'General Medicine' as (typeof HOSPITAL_DEPARTMENT_OPTIONS)[number],
    phone: ''
  });

  useEffect(() => {
    if (!authLoading && staff) {
      navigate('/hospital', { replace: true });
    }
  }, [staff, authLoading, navigate]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (form.password.length < 6) {
      setMessage({ type: 'error', text: 'Password must be at least 6 characters.' });
      return;
    }
    if (form.hospitalName === 'Other' && !form.hospitalCustom.trim()) {
      setMessage({ type: 'error', text: 'Please enter your hospital name.' });
      return;
    }
    setIsSubmitting(true);
    setMessage(null);
    try {
      if (!isFirebaseConfigured()) {
        const { userStorageService } = await import('../../services/userStorage');
        const staffData = {
          email: form.email.trim(),
          fullName: form.fullName.trim(),
          hospitalName: form.hospitalName === 'Other' ? form.hospitalCustom.trim() : form.hospitalName,
          specialization: form.specialization.trim(),
          department: form.department,
          phone: form.phone.trim() || undefined
        };
        const result = userStorageService.registerStaff(staffData, form.password);
        if (result.success) {
           await refreshProfile();
           navigate('/hospital', { replace: true });
        } else {
           setMessage({ type: 'error', text: result.message });
        }
        return;
      }

      const result = await registerHospitalStaff(form.email.trim(), form.password, {
        fullName: form.fullName.trim(),
        hospitalName: form.hospitalName === 'Other' ? 'Other' : form.hospitalName,
        hospitalCustom: form.hospitalName === 'Other' ? form.hospitalCustom.trim() : undefined,
        specialization: form.specialization.trim(),
        department: form.department,
        phone: form.phone.trim() || undefined
      });
      if (result.success) {
        await refreshProfile();
        navigate('/hospital', { replace: true });
      } else {
        setMessage({ type: 'error', text: result.message });
      }
    } catch (error) {
      setMessage({ type: 'error', text: 'An unexpected error occurred.' });
    } finally {
      setIsSubmitting(false);
    }
  };

  // Removed blocking Firebase check to allow offline demo registration

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-white to-blue-50 py-12 px-4 sm:px-6 pt-28 pb-16">
      <div className="max-w-lg mx-auto">
        <div className="flex justify-end gap-3 mb-6">
          <Link to="/signin" className="text-sm text-gray-600 hover:text-blue-600">
            Patient sign-in
          </Link>
          <Link to="/hospital/signin" className="text-sm font-medium text-blue-600">
            Hospital sign in
          </Link>
        </div>

        <div className="text-center mb-6">
          <h1 className="text-2xl font-bold text-gray-900">Register as hospital staff</h1>
          <p className="text-gray-600 text-sm mt-1">Name, specialization, hospital, and department</p>
        </div>

        {message && (
          <div
            className={`mb-4 p-3 rounded-lg text-sm ${
              message.type === 'error' ? 'bg-red-50 border border-red-200 text-red-800' : 'bg-green-50 border border-green-200 text-green-800'
            }`}
          >
            {message.text}
          </div>
        )}

        <form onSubmit={handleSubmit} className="bg-white rounded-2xl shadow-xl p-6 sm:p-8 space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Full name</label>
            <div className="relative">
              <FaUser className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
              <input
                required
                value={form.fullName}
                onChange={(e) => setForm((f) => ({ ...f, fullName: e.target.value }))}
                className="w-full pl-10 pr-3 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                placeholder="Dr. Priya Sharma"
              />
            </div>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Specialization</label>
            <input
              required
              value={form.specialization}
              onChange={(e) => setForm((f) => ({ ...f, specialization: e.target.value }))}
              className="w-full px-3 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
              placeholder="e.g. Interventional Cardiology"
            />
          </div>
          <div className="grid sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Hospital</label>
              <select
                value={form.hospitalName}
                onChange={(e) =>
                  setForm((f) => ({ ...f, hospitalName: e.target.value as typeof f.hospitalName }))
                }
                className="w-full px-3 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
              >
                {HOSPITAL_NAME_OPTIONS.map((h) => (
                  <option key={h} value={h}>
                    {h}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Department</label>
              <select
                value={form.department}
                onChange={(e) =>
                  setForm((f) => ({ ...f, department: e.target.value as typeof f.department }))
                }
                className="w-full px-3 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
              >
                {HOSPITAL_DEPARTMENT_OPTIONS.map((d) => (
                  <option key={d} value={d}>
                    {d}
                  </option>
                ))}
              </select>
            </div>
          </div>
          {form.hospitalName === 'Other' && (
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Hospital name</label>
              <input
                value={form.hospitalCustom}
                onChange={(e) => setForm((f) => ({ ...f, hospitalCustom: e.target.value }))}
                className="w-full px-3 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                placeholder="Your hospital name"
              />
            </div>
          )}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Phone (optional)</label>
            <input
              type="tel"
              value={form.phone}
              onChange={(e) => setForm((f) => ({ ...f, phone: e.target.value }))}
              className="w-full px-3 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Email</label>
            <div className="relative">
              <FaEnvelope className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
              <input
                type="email"
                required
                autoComplete="email"
                value={form.email}
                onChange={(e) => setForm((f) => ({ ...f, email: e.target.value }))}
                className="w-full pl-10 pr-3 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
              />
            </div>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Password</label>
            <div className="relative">
              <FaLock className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
              <input
                type={showPassword ? 'text' : 'password'}
                required
                autoComplete="new-password"
                value={form.password}
                onChange={(e) => setForm((f) => ({ ...f, password: e.target.value }))}
                className="w-full pl-10 pr-12 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
              />
              <button
                type="button"
                className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400"
                onClick={() => setShowPassword(!showPassword)}
              >
                {showPassword ? <FaEyeSlash /> : <FaEye />}
              </button>
            </div>
          </div>
          <button
            type="submit"
            disabled={isSubmitting}
            className="w-full py-3 rounded-lg text-white font-medium bg-gradient-to-r from-slate-800 to-blue-600 hover:from-slate-900 hover:to-blue-700 disabled:opacity-50"
          >
            {isSubmitting ? 'Creating account…' : 'Create hospital account'}
          </button>
        </form>
      </div>
    </div>
  );
};

export default HospitalSignUp;
