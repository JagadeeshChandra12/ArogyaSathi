import React, { useState, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import { ShieldCheck, AlertCircle, FileText, Download, Pill, Droplet, Phone, User } from 'lucide-react';
import { motion } from 'framer-motion';
import {
  getEmergencyPassportByToken,
  getHealthPassportByToken,
  requestOtp,
  verifyOtp
} from '../services/healthPassportApi';

const HealthPassport: React.FC = () => {
  const { patientId: token } = useParams();
  const [loading, setLoading] = useState(true);
  const [patient, setPatient] = useState<any>(null);
  const [summary, setSummary] = useState<any>(null);
  const [reports, setReports] = useState<any[]>([]);
  const [otpCode, setOtpCode] = useState('');
  const [otpVerified, setOtpVerified] = useState(false);
  const [otpHint, setOtpHint] = useState('');
  const [emergency, setEmergency] = useState<any>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function loadPassportData() {
      if (!token) {
        setError('Invalid token');
        setLoading(false);
        return;
      }

      try {
        setLoading(true);
        const data = await getHealthPassportByToken(token);
        setPatient(data.patient);
        setSummary(data.summary);
        setReports(data.reports);
      } catch (err: any) {
        const emergencyData = await getEmergencyPassportByToken(token).catch(() => null);
        if (emergencyData?.emergency) setEmergency(emergencyData.emergency);
        setError(err?.message || 'Failed to retrieve health passport.');
      } finally {
        setLoading(false);
      }
    }

    loadPassportData();
  }, [token]);

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center p-6">
        <div className="text-center">
          <motion.div 
            animate={{ rotate: 360 }}
            transition={{ repeat: Infinity, duration: 2, ease: "linear" }}
            className="w-16 h-16 border-4 border-blue-600 border-t-transparent rounded-full mx-auto mb-4"
          />
          <p className="text-gray-600 font-medium animate-pulse">Loading Digital Health Passport...</p>
        </div>
      </div>
    );
  }

  if (error || !patient) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center p-6">
        <div className="max-w-lg w-full bg-white rounded-3xl shadow-xl p-8 text-center border border-red-100">
          <div className="w-16 h-16 bg-red-50 rounded-full flex items-center justify-center mx-auto mb-4 text-red-600">
            <AlertCircle size={32} />
          </div>
          <h2 className="text-2xl font-bold text-gray-900 mb-2">Passport Not Found</h2>
          <p className="text-gray-600 mb-6">{error || 'Could not load the requested health passport.'}</p>
          {emergency && (
            <div className="text-left bg-amber-50 border border-amber-200 rounded-xl p-4 mb-6">
              <h3 className="font-bold text-amber-900 mb-2">Emergency View</h3>
              <p className="text-sm text-amber-900">Blood Group: {emergency.bloodGroup}</p>
              <p className="text-sm text-amber-900">
                Allergies: {Array.isArray(emergency.allergies) && emergency.allergies.length ? emergency.allergies.join(', ') : 'N/A'}
              </p>
              <p className="text-sm text-amber-900">Emergency Contact: {emergency.emergencyContact}</p>
            </div>
          )}
          <Link 
            to="/" 
            className="block w-full py-3 bg-blue-600 text-white rounded-xl font-bold hover:bg-blue-700 transition"
          >
            Return Home
          </Link>
        </div>
      </div>
    );
  }

  const downloadSummary = () => {
    if (!patient) return;
    const qs = otpVerified ? '?otpVerified=true' : '';
    window.open(`/download-summary/${patient.id}${qs}`, '_blank', 'noopener,noreferrer');
  };

  const downloadReports = () => {
    if (!patient) return;
    const qs = otpVerified ? '?otpVerified=true' : '';
    window.open(`/download-reports/${patient.id}${qs}`, '_blank', 'noopener,noreferrer');
  };

  return (
    <div className="min-h-screen bg-slate-50 pt-24 pb-16 px-4 print:pt-4 print:bg-white">
      <div className="max-w-4xl mx-auto">
        
        {/* Print Only Header */}
        <div className="hidden print:block text-center mb-8 border-b pb-4">
          <h1 className="text-2xl font-bold text-slate-800">Arogya Sathi</h1>
          <p className="text-slate-500">Smart Health Passport</p>
        </div>

        {/* Header Section */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 mb-8 print:mb-4">
          <div>
            <div className="flex items-center gap-2 text-blue-600 mb-2">
              <ShieldCheck className="h-5 w-5" />
              <span className="text-xs font-black uppercase tracking-widest">Smart Health Passport</span>
            </div>
            <h1 className="text-3xl font-black text-gray-900">
              {patient.name}
            </h1>
            <p className="text-gray-500 font-medium tracking-wide">ID: {patient.patient_id}</p>
          </div>
          
          <div className="flex items-center gap-3 print:hidden">
            <button 
              onClick={downloadSummary}
              className="flex items-center gap-2 px-5 py-2.5 bg-blue-600 text-white rounded-xl font-bold text-sm hover:bg-blue-700 shadow-md transition"
            >
              <Download className="h-4 w-4" />
              Download Health Summary PDF
            </button>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {/* Patient Details Panel */}
          <div className="md:col-span-1 space-y-6">
            <div className="bg-white rounded-3xl p-6 shadow-sm border border-gray-100">
              <h3 className="text-sm font-bold text-gray-400 uppercase tracking-wider mb-4 flex items-center gap-2">
                <User className="h-4 w-4" />
                Identity
              </h3>
              <div className="space-y-4">
                <div className="grid grid-cols-2 gap-3">
                  <div className="p-3 bg-red-50 rounded-xl border border-red-100">
                     <div className="flex items-center gap-1.5 text-red-500 mb-1">
                        <Droplet className="w-3 h-3"/>
                        <p className="text-[10px] font-bold uppercase">Blood</p>
                     </div>
                    <p className="text-xl font-black text-red-700">{patient.bloodGroup || 'N/A'}</p>
                  </div>
                  <div className="p-3 bg-purple-50 rounded-xl border border-purple-100">
                    <p className="text-[10px] font-bold text-purple-400 uppercase mb-1">Age</p>
                    <p className="text-xl font-black text-purple-600">--</p>
                  </div>
                </div>

                <div className="p-4 bg-gray-50 rounded-xl border border-gray-100 space-y-3">
                  <div>
                    <p className="text-xs font-bold text-gray-400 uppercase">Emergency Contact</p>
                    <p className="text-md font-bold text-gray-800 flex items-center gap-2 mt-1">
                      <Phone className="w-4 h-4 text-gray-500"/>
                      {patient.emergencyContact || 'Not provided'}
                    </p>
                  </div>
                  <div className="pt-3 border-t border-gray-200">
                     <p className="text-xs font-bold text-gray-400 uppercase">Name</p>
                     <p className="text-md font-medium text-gray-800 mt-1">{patient.name}</p>
                  </div>
                </div>
              </div>
            </div>

            <div className="bg-white rounded-3xl p-6 shadow-sm border border-gray-100">
              <h3 className="text-sm font-bold text-gray-400 uppercase tracking-wider mb-3">Access Security</h3>
              <div className="space-y-3">
                <button
                  onClick={() => requestOtp(token || '').then((x) => setOtpHint(x.otp_hint || 'OTP sent')).catch(() => setOtpHint('Unable to request OTP'))}
                  className="w-full py-2 px-3 text-sm font-semibold border border-blue-200 text-blue-700 rounded-lg hover:bg-blue-50"
                >
                  Request OTP
                </button>
                <input
                  value={otpCode}
                  onChange={(e) => setOtpCode(e.target.value)}
                  placeholder="Enter OTP"
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm"
                />
                <button
                  onClick={() => verifyOtp(token || '', otpCode).then(() => setOtpVerified(true)).catch(() => setOtpVerified(false))}
                  className="w-full py-2 px-3 text-sm font-semibold bg-gray-900 text-white rounded-lg"
                >
                  Verify OTP
                </button>
                {otpHint && <p className="text-xs text-gray-500">{otpHint}</p>}
              </div>
            </div>
          </div>

          {/* Medical Summary Area */}
          <div className="md:col-span-2 space-y-6">
            
            <div className="bg-white rounded-3xl p-6 shadow-sm border border-gray-100">
              <h3 className="text-lg font-bold text-gray-900 mb-6 flex items-center gap-2">
                <Pill className="h-5 w-5 text-blue-600" />
                Medical Summary
              </h3>
              <div className="space-y-3 text-sm text-gray-700">
                <p>
                  <strong>Diseases:</strong>{' '}
                  {patient.diseases?.length ? patient.diseases.join(', ') : 'N/A'}
                </p>
                <p>
                  <strong>Medications:</strong>{' '}
                  {patient.medications?.length ? patient.medications.join(', ') : 'N/A'}
                </p>
                <p>
                  <strong>Allergies:</strong>{' '}
                  {patient.allergies?.length ? patient.allergies.join(', ') : 'N/A'}
                </p>
                <p>
                  <strong>Summary Updated:</strong> {summary?.last_updated || 'Pending'}
                </p>
              </div>
            </div>
            
            <div className="bg-white rounded-3xl p-6 shadow-sm border border-gray-100">
              <h3 className="text-lg font-bold text-gray-900 mb-6 flex items-center gap-2">
                <FileText className="h-5 w-5 text-blue-600" />
                Actions
              </h3>

              <div className="grid sm:grid-cols-2 gap-3">
                <button onClick={downloadSummary} className="px-4 py-3 rounded-xl bg-blue-600 text-white font-semibold">
                  View Summary / Download PDF
                </button>
                <button onClick={downloadReports} className="px-4 py-3 rounded-xl bg-slate-900 text-white font-semibold">
                  Download Reports (ZIP)
                </button>
                <button className="px-4 py-3 rounded-xl border border-gray-200 font-semibold text-gray-700">Share with Doctor</button>
                <button className="px-4 py-3 rounded-xl border border-red-200 text-red-700 font-semibold">Emergency View</button>
              </div>
              {reports.length > 0 && (
                <div className="mt-5 space-y-2">
                  {reports.map((report) => (
                    <a
                      key={report.report_id}
                      href={report.s3_url}
                      target="_blank"
                      rel="noreferrer"
                      className="block text-sm text-blue-700 underline"
                    >
                      {report.file_name}
                    </a>
                  ))}
                </div>
              )}
            </div>

          </div>
        </div>

        <div className="mt-8 text-center print:mt-12">
            <p className="text-xs text-slate-400 font-medium">⚕️ Generated securely by Arogya Sathi Smart Health Passport</p>
        </div>
      </div>
    </div>
  );
};

export default HealthPassport;
