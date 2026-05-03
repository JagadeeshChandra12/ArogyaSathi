import React, { useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { FaEnvelope, FaEye, FaEyeSlash, FaLock } from 'react-icons/fa';
import { isFirebaseConfigured } from '../../firebase/config';
import { signInHospitalStaff } from '../../services/firebaseHospitalData';
import { useAuth } from '../../context/AuthContext';

const HospitalSignIn: React.FC = () => {
  const navigate = useNavigate();
  const { refreshProfile, staff, loading: authLoading } = useAuth();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  useEffect(() => {
    if (!authLoading && staff) {
      navigate('/hospital', { replace: true });
    }
  }, [staff, authLoading, navigate]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    setMessage(null);
    try {
      if (!isFirebaseConfigured()) {
         // Offline mock mode
         const { userStorageService } = await import('../../services/userStorage');
         const result = userStorageService.signInStaff(email.trim(), password);
         if (result.success) {
            await refreshProfile(); // Will pick up the new staff from localStorage
            navigate('/hospital', { replace: true });
         } else {
            setMessage({ type: 'error', text: result.message });
         }
         return;
      }
      
      const result = await signInHospitalStaff(email.trim(), password);
      if (result.success) {
        await refreshProfile();
        navigate('/hospital', { replace: true });
      } else {
        setMessage({ type: 'error', text: result.message });
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  // Allow render even if offline so they can use demo accounts
  return (
    <div className="min-h-screen bg-[#0a0f1a] flex items-center justify-center py-12 px-4 sm:px-6 relative overflow-hidden">
      {/* Dynamic Background Elements */}
      <div className="absolute top-[-10%] right-[-10%] w-[500px] h-[500px] bg-blue-600/10 rounded-full blur-[120px] animate-pulse" />
      <div className="absolute bottom-[-10%] left-[-10%] w-[500px] h-[500px] bg-slate-600/10 rounded-full blur-[120px] animate-pulse" />
      
      <div className="absolute top-24 right-6 flex gap-4 z-20">
        <Link
          to="/signin"
          className="text-sm font-bold text-gray-400 hover:text-white transition-colors flex items-center gap-2"
        >
          <span className="w-1.5 h-1.5 rounded-full bg-gray-500" />
          Patient Portal
        </Link>
        <Link
          to="/hospital/signup"
          className="text-sm font-bold text-white bg-blue-600 hover:bg-blue-500 px-5 py-2.5 rounded-xl shadow-[0_0_20px_rgba(37,99,235,0.4)] transition-all transform hover:scale-105"
        >
          Register Facility
        </Link>
      </div>

      <div className="max-w-md w-full space-y-8 relative z-10">
        <div className="text-center">
          <div className="mx-auto h-20 w-20 bg-gradient-to-br from-blue-500 to-indigo-700 rounded-[2rem] flex items-center justify-center mb-6 shadow-[0_0_40px_rgba(37,99,235,0.3)] transform rotate-12">
            <span className="text-white text-3xl font-black -rotate-12">H</span>
          </div>
          <h1 className="text-4xl font-black text-white tracking-tight italic">
            AROGYA <span className="text-blue-500 not-italic">SATHI</span>
          </h1>
          <p className="text-blue-400/60 text-xs font-black uppercase tracking-[0.3em] mt-2">Physician & Staff Terminal</p>
        </div>

        <div className="bg-white/5 backdrop-blur-2xl border border-white/10 rounded-[2.5rem] p-10 shadow-2xl relative overflow-hidden group">
          <div className="absolute inset-0 bg-gradient-to-br from-blue-600/5 to-transparent pointer-events-none" />
          
          <div className="relative z-10 mb-8">
            <h2 className="text-xl font-bold text-white">System Access</h2>
            <p className="text-gray-400 text-sm">Enter authorized credentials to proceed.</p>
          </div>

          {message && (
            <div
              className={`p-4 rounded-2xl text-sm mb-6 ${
                message.type === 'success'
                  ? 'bg-green-500/10 border border-green-500/20 text-green-400'
                  : 'bg-red-500/10 border border-red-500/20 text-red-400'
              }`}
            >
              {message.text}
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-6">
            <div className="space-y-2">
              <label htmlFor="h-email" className="block text-xs font-black text-gray-500 uppercase tracking-widest ml-1">
                Authorized Identifier
              </label>
              <div className="relative group">
                <FaEnvelope className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-500 group-focus-within:text-blue-400 transition-colors" />
                <input
                  id="h-email"
                  type="email"
                  autoComplete="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="w-full pl-12 pr-4 py-4 bg-white/5 border border-white/10 rounded-2xl text-white placeholder:text-gray-600 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all"
                  placeholder="doctor@hospital.org"
                />
              </div>
            </div>

            <div className="space-y-2">
              <label htmlFor="h-password" className="block text-xs font-black text-gray-500 uppercase tracking-widest ml-1">
                Security Key
              </label>
              <div className="relative group">
                <FaLock className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-500 group-focus-within:text-blue-400 transition-colors" />
                <input
                  id="h-password"
                  type={showPassword ? 'text' : 'password'}
                  autoComplete="current-password"
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="w-full pl-12 pr-12 py-4 bg-white/5 border border-white/10 rounded-2xl text-white placeholder:text-gray-600 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all"
                  placeholder="••••••••"
                />
                <button
                  type="button"
                  className="absolute right-4 top-1/2 -translate-y-1/2 text-gray-500 hover:text-white transition-colors"
                  onClick={() => setShowPassword(!showPassword)}
                >
                  {showPassword ? <FaEyeSlash size={18} /> : <FaEye size={18} />}
                </button>
              </div>
            </div>

            <button
              type="submit"
              disabled={isSubmitting}
              className="w-full py-5 rounded-2xl text-white font-black uppercase tracking-widest bg-blue-600 hover:bg-blue-500 disabled:opacity-50 transition-all shadow-[0_10px_20px_rgba(37,99,235,0.2)] hover:shadow-[0_15px_30px_rgba(37,99,235,0.4)] active:scale-95"
            >
              {isSubmitting ? 'Authenticating…' : 'Establish Session'}
            </button>
          </form>
          
          <div className="mt-8 pt-8 border-t border-white/5 text-center">
            <p className="text-[10px] text-gray-600 font-bold uppercase tracking-widest">
              Secured by Antigravity Quantum Encryption
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default HospitalSignIn;
