import React from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft, User, Search, ChevronRight, Activity, ShieldCheck } from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { userStorageService } from '../../services/userStorage';

const PatientRecords: React.FC = () => {
  const navigate = useNavigate();
  const { staff } = useAuth();

  const mockFromStore = userStorageService.getAllUsers().map(u => ({
    id: u.id,
    name: `${u.firstName} ${u.lastName}`,
    lastVisit: new Date(u.createdAt).toLocaleDateString(),
    status: 'Healthy' as const,
    score: 85,
    blood: u.bloodGroup || 'O+'
  }));

  const demoPatients = mockFromStore.length > 0 ? mockFromStore : [
    { id: 'PAT-8829-X', name: 'Rayan Siddiqui', lastVisit: '2026-04-25', status: 'Healthy' as const, score: 88, blood: 'O+' },
    { id: 'PAT-1102-Y', name: 'Nabi Saheb', lastVisit: '2026-04-20', status: 'Follow-up' as const, score: 72, blood: 'A+' },
    { id: 'PAT-4432-Z', name: 'Priya Sharma', lastVisit: '2026-04-22', status: 'Treatment' as const, score: 65, blood: 'B-' }
  ];

  if (!staff) return null;

  return (
    <div className="min-h-screen bg-slate-50 pt-24 pb-16 px-4">
      <div className="max-w-4xl mx-auto">
        <div className="flex items-center gap-4 mb-8">
          <button 
            onClick={() => navigate('/hospital')}
            className="p-2 rounded-xl bg-white border border-gray-200 text-gray-600 hover:bg-gray-50 transition shadow-sm"
          >
            <ArrowLeft size={20} />
          </button>
          <div>
            <h1 className="text-2xl font-black text-gray-900 leading-none">Patient Records</h1>
            <p className="text-gray-500 text-sm mt-1">Authorized database access for {staff.fullName}</p>
          </div>
        </div>

        {/* Search Bar */}
        <div className="relative mb-8">
          <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400 h-5 w-5" />
          <input 
            type="text" 
            placeholder="Search by Patient Name or ID..."
            className="w-full pl-12 pr-4 py-4 bg-white border border-gray-200 rounded-2xl shadow-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all"
          />
        </div>

        {/* Patients List */}
        <div className="bg-white rounded-[2.5rem] shadow-sm border border-gray-100 overflow-hidden">
          <div className="p-6 border-b border-gray-100 flex items-center justify-between bg-slate-50/50">
            <h2 className="text-sm font-black text-gray-400 uppercase tracking-widest flex items-center gap-2">
              <User size={16} />
              Recent Patients
            </h2>
            <span className="text-[10px] font-bold text-blue-600 bg-blue-50 px-2 py-1 rounded-full border border-blue-100 uppercase tracking-tighter">
              LIVE DATABASE
            </span>
          </div>

          <div className="divide-y divide-gray-50">
            {demoPatients.map((patient) => (
              <div 
                key={patient.id}
                onClick={() => navigate(`/scan/${patient.id}`)}
                className="group p-6 hover:bg-blue-50/30 transition-all cursor-pointer flex items-center gap-6"
              >
                <div className="h-14 w-14 rounded-2xl bg-slate-100 flex items-center justify-center relative overflow-hidden shrink-0 group-hover:bg-white transition-colors">
                   <User className="text-gray-400 group-hover:text-blue-600 transition-colors" size={24} />
                   <div className="absolute inset-0 bg-blue-600/5 opacity-0 group-hover:opacity-100 transition-opacity" />
                </div>

                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-0.5">
                    <h3 className="font-bold text-gray-900 group-hover:text-blue-700 transition-colors truncate">
                      {patient.name}
                    </h3>
                    <span className="text-[10px] font-black text-gray-300 tracking-widest">{patient.id}</span>
                  </div>
                  <div className="flex items-center gap-4 text-xs font-medium text-gray-500">
                    <span className="flex items-center gap-1">
                      <Activity size={12} className="text-blue-400" />
                      Score: {patient.score}
                    </span>
                    <span className="flex items-center gap-1">
                      <ShieldCheck size={12} className="text-red-400" />
                      Blood: {patient.blood}
                    </span>
                    <span className="truncate">Last Visit: {patient.lastVisit}</span>
                  </div>
                </div>

                <div className="flex items-center gap-4 shrink-0">
                  <div className={`px-3 py-1 rounded-full text-[10px] font-bold uppercase tracking-wide border ${
                    patient.status === 'Healthy' ? 'bg-green-50 text-green-700 border-green-100' :
                    patient.status === 'Follow-up' ? 'bg-blue-50 text-blue-700 border-blue-100' :
                    'bg-amber-50 text-amber-700 border-amber-100'
                  }`}>
                    {patient.status}
                  </div>
                  <ChevronRight size={20} className="text-gray-300 group-hover:text-blue-400 group-hover:translate-x-1 transition-all" />
                </div>
              </div>
            ))}
          </div>
          
          <div className="p-6 bg-slate-50 border-t border-gray-100 text-center">
             <p className="text-xs text-gray-400 italic">Showing recent records from Apollo Hospitals Bangalore center</p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default PatientRecords;
