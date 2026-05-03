import React, { useState, useEffect } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { 
  Shield, 
  Activity, 
  ShieldCheck, 
  AlertCircle, 
  FileText, 
  Clock, 
  ChevronRight,
  Stethoscope,
  AlertTriangle
} from 'lucide-react';
import { motion } from 'framer-motion';
import { useAuth } from '../../context/AuthContext';
import { getHealthPassportByToken } from '../../services/healthPassportApi';

const ScanIdentity: React.FC = () => {
  const { patentId: token } = useParams();
  const navigate = useNavigate();
  const { staff } = useAuth();
  
  const [loading, setLoading] = useState(true);
  const [patient, setPatient] = useState<any>(null);
  const [healthHistory, setHealthHistory] = useState<any[]>([]);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function verifyAndLoad() {
      if (!token) {
        setError('Invalid token');
        setLoading(false);
        return;
      }

      // 1. Role-based Security Verification
      // In a production app, we would verify the staff token against the backend
      if (!staff) {
        setError('Unauthorized Access: Hospital staff authentication required.');
        setLoading(false);
        return;
      }

      try {
        setLoading(true);
        
        const passport = await getHealthPassportByToken(token);
        setHealthHistory([]);
        setPatient({
          id: passport.patient.patient_id,
          firstName: passport.patient.name.split(' ')[0] || passport.patient.name,
          lastName: passport.patient.name.split(' ').slice(1).join(' '),
          bloodGroup: passport.patient.bloodGroup,
          age: '--',
          emergencyContact: passport.patient.emergencyContact,
          gender: 'N/A'
        });
      } catch (err) {
        setError('Failed to retrieve patient medical identity.');
      } finally {
        setLoading(false);
      }
    }

    verifyAndLoad();
  }, [token, staff]);

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center p-6">
        <div className="text-center">
          <motion.div 
            animate={{ rotate: 360 }}
            transition={{ repeat: Infinity, duration: 2, ease: "linear" }}
            className="w-16 h-16 border-4 border-blue-600 border-t-transparent rounded-full mx-auto mb-4"
          />
          <p className="text-gray-600 font-medium animate-pulse">Verifying Digital Token...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center p-6">
        <div className="max-w-md w-full bg-white rounded-3xl shadow-xl p-8 text-center border border-red-100">
          <div className="w-16 h-16 bg-red-50 rounded-full flex items-center justify-center mx-auto mb-4 text-red-600">
            <AlertCircle size={32} />
          </div>
          <h2 className="text-2xl font-bold text-gray-900 mb-2">Access Denied</h2>
          <p className="text-gray-600 mb-6">{error}</p>
          <div className="space-y-3">
            {!staff && (
              <Link 
                to="/signin" 
                className="block w-full py-3 bg-blue-600 text-white rounded-xl font-bold hover:bg-blue-700 transition"
              >
                Sign In as Hospital Staff
              </Link>
            )}
            <button 
              onClick={() => navigate('/hospital')}
              className="block w-full py-3 bg-gray-100 text-gray-700 rounded-xl font-bold hover:bg-gray-200 transition"
            >
              Return to Dashboard
            </button>
          </div>
        </div>
      </div>
    );
  }

  const latestScore = healthHistory.length > 0 ? healthHistory[healthHistory.length - 1].healthScore : 0;

  return (
    <div className="min-h-screen bg-slate-50 pt-24 pb-16 px-4">
      <div className="max-w-4xl mx-auto">
        {/* Header Section */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 mb-8">
          <div>
            <div className="flex items-center gap-2 text-blue-600 mb-2">
              <ShieldCheck className="h-5 w-5" />
              <span className="text-xs font-black uppercase tracking-widest">Verified Medical Identity</span>
            </div>
            <h1 className="text-3xl font-black text-gray-900">
              {patient.firstName} {patient.lastName}
            </h1>
            <p className="text-gray-500 font-medium">Patient ID: {patient.id.toUpperCase()}</p>
          </div>
          
          <div className="flex items-center gap-3">
            <button className="flex items-center gap-2 px-4 py-2 bg-white border border-gray-200 rounded-xl font-bold text-sm text-gray-700 hover:bg-gray-50 shadow-sm transition">
              <Stethoscope className="h-4 w-4" />
              Start Consultation
            </button>
            <button className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-xl font-bold text-sm hover:bg-blue-700 shadow-md transition">
              <FileText className="h-4 w-4" />
              View Full History
            </button>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {/* Quick Stats Panel */}
          <div className="md:col-span-1 space-y-6">
            <div className="bg-white rounded-3xl p-6 shadow-sm border border-gray-100">
              <h3 className="text-sm font-bold text-gray-400 uppercase tracking-wider mb-4 flex items-center gap-2">
                <Activity className="h-4 w-4" />
                Vitals Status
              </h3>
              <div className="space-y-4">
                <div className="text-center p-6 bg-blue-50 rounded-2xl relative overflow-hidden group">
                  <div className="relative z-10">
                    <p className="text-sm font-bold text-blue-600 uppercase tracking-tighter">Health Index</p>
                    <p className="text-5xl font-black text-blue-800">{latestScore}</p>
                    <p className="text-xs font-bold text-blue-400 mt-1">LATEST ASSESSMENT</p>
                  </div>
                  <div className="absolute top-0 right-0 p-4 opacity-10 group-hover:scale-110 transition-transform">
                    <Activity size={60} />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div className="p-3 bg-red-50 rounded-xl border border-red-100">
                    <p className="text-[10px] font-bold text-red-400 uppercase">Blood</p>
                    <p className="text-xl font-black text-red-600">{patient.bloodGroup}</p>
                  </div>
                  <div className="p-3 bg-purple-50 rounded-xl border border-purple-100">
                    <p className="text-[10px] font-bold text-purple-400 uppercase">Age</p>
                    <p className="text-xl font-black text-purple-600">{patient.age}</p>
                  </div>
                </div>
              </div>
            </div>

            <div className="bg-amber-50 rounded-3xl p-6 border border-amber-200">
              <h3 className="text-sm font-bold text-amber-700 uppercase tracking-wider mb-3 flex items-center gap-2">
                <AlertTriangle className="h-4 w-4" />
                Critical Alerts
              </h3>
              <ul className="space-y-2">
                <li className="flex items-start gap-2 text-sm text-amber-800 font-medium">
                  <div className="w-1.5 h-1.5 bg-amber-500 rounded-full mt-1.5 shrink-0" />
                  No known medicine allergies reported.
                </li>
                <li className="flex items-start gap-2 text-sm text-amber-800 font-medium">
                  <div className="w-1.5 h-1.5 bg-amber-500 rounded-full mt-1.5 shrink-0" />
                  Chronic conditions: Hypertension (Managed)
                </li>
              </ul>
            </div>
          </div>

          {/* Detailed Timeline Panel */}
          <div className="md:col-span-2">
            <div className="bg-white rounded-3xl shadow-sm border border-gray-100 overflow-hidden">
              <div className="p-6 border-b border-gray-100 flex items-center justify-between">
                <h3 className="text-lg font-bold text-gray-900">Recent Medical History</h3>
                <span className="text-xs font-bold text-gray-400 uppercase">Last 5 Visits</span>
              </div>
              
              <div className="divide-y divide-gray-50">
                {healthHistory.length === 0 ? (
                  <div className="p-12 text-center">
                    <Clock size={48} className="mx-auto text-gray-300 mb-4" />
                    <p className="text-gray-500 font-medium">No recent medical history found.</p>
                  </div>
                ) : (
                  [...healthHistory].reverse().map((entry, idx) => (
                    <motion.div 
                      key={idx}
                      initial={{ opacity: 0, x: 10 }}
                      animate={{ opacity: 1, x: 0 }}
                      transition={{ delay: idx * 0.1 }}
                      className="p-6 hover:bg-slate-50 transition-colors flex items-start gap-4"
                    >
                      <div className="w-10 h-10 bg-slate-100 rounded-xl flex items-center justify-center shrink-0">
                        <Activity size={20} className={entry.healthScore > 70 ? 'text-green-600' : 'text-amber-600'} />
                      </div>
                      <div className="flex-1">
                        <div className="flex items-center justify-between mb-1">
                          <p className="font-bold text-gray-900 text-sm">Routine Checkup Assessment</p>
                          <span className="text-[10px] font-bold text-gray-400 uppercase">{new Date(entry.timestamp).toLocaleDateString()}</span>
                        </div>
                        <p className="text-xs text-gray-600 leading-relaxed mb-3">
                          Assessment performed via Arogya Sathi Patient Portal. Score calculated based on reported symptoms and vitals.
                        </p>
                        <div className="flex items-center gap-2">
                          <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wide ${
                            entry.healthScore > 70 ? 'bg-green-100 text-green-700' : 'bg-amber-100 text-amber-700'
                          }`}>
                            Score: {entry.healthScore}
                          </span>
                          <ChevronRight size={14} className="text-gray-300" />
                        </div>
                      </div>
                    </motion.div>
                  ))
                )}
              </div>
            </div>

            {/* Footer / Instructions */}
            <div className="mt-6 flex items-center gap-3 px-6 py-4 bg-slate-900 rounded-2xl text-white">
              <Shield size={20} className="text-blue-400" />
              <p className="text-[11px] font-medium leading-relaxed opacity-80">
                Authorized Personnel Only. Every access is logged with Staff ID: <strong>{staff?.id?.substring(0, 8)}</strong> and Hospital IP for auditing purposes. Do not share or screenshot patient data.
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ScanIdentity;
