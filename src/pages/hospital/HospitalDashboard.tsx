import { useNavigate, Link } from 'react-router-dom';
import { Building2, Calendar, FileUp, Video, QrCode } from 'lucide-react';
import { useAuth } from '../../context/AuthContext';

const HospitalDashboard: React.FC = () => {
  const navigate = useNavigate();
  const { staff } = useAuth();
  if (!staff) return null;

  const hospitalLabel =
    staff.hospitalName === 'Other' && staff.hospitalCustom ? staff.hospitalCustom : staff.hospitalName;

  const cards = [
    {
      to: '/hospital/files',
      title: 'Patient files',
      desc: 'Upload and manage documents for visiting patients.',
      icon: FileUp,
      color: 'from-emerald-600 to-teal-600'
    },
    {
      to: '/hospital/patients',
      title: 'Patient Records',
      desc: 'Access patient medical identity and historical health data.',
      icon: QrCode,
      color: 'from-blue-700 to-slate-800'
    },
    {
      to: '/hospital/appointments',
      title: 'Appointments',
      desc: `Book and track visits for ${staff.department}.`,
      icon: Calendar,
      color: 'from-blue-600 to-indigo-600'
    },
    {
      to: '/hospital/video',
      title: 'Video calls',
      desc: 'Start or join department video sessions.',
      icon: Video,
      color: 'from-violet-600 to-purple-600'
    },
    {
      to: '#',
      title: 'Scan Patient QR',
      desc: 'Verify digital health ID via secure token scan.',
      icon: QrCode,
      color: 'from-blue-600 to-indigo-700',
      isScanner: true
    }
  ];

  const handleScanClick = () => {
    const patentId = prompt("Enter Patient ID to scan (Simulated):");
    if (patentId) {
      navigate(`/scan/${patentId}`);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-b from-slate-50 to-white pt-24 pb-16 px-4">
      <div className="max-w-4xl mx-auto">
        <div className="flex items-start gap-3 mb-10">
          <div className="p-3 rounded-2xl bg-slate-900 text-white shadow-lg">
            <Building2 className="h-8 w-8" />
          </div>
          <div>
            <h1 className="text-2xl sm:text-3xl font-bold text-gray-900">Hospital workspace</h1>
            <p className="text-gray-600 mt-1">
              {staff.fullName} · {staff.specialization}
            </p>
            <p className="text-sm text-gray-500 mt-1">
              {hospitalLabel} · {staff.department}
            </p>
          </div>
        </div>

        <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {cards.map(({ to, title, desc, icon: Icon, color, isScanner }) => (
            <div
              key={title}
              onClick={isScanner ? handleScanClick : undefined}
              className="cursor-pointer"
            >
              {isScanner ? (
                <div className="group block h-full rounded-2xl border border-gray-200 bg-white p-6 shadow-sm hover:shadow-md hover:border-blue-200 transition">
                  <div
                    className={`inline-flex p-3 rounded-xl bg-gradient-to-br ${color} text-white mb-4 group-hover:scale-105 transition-transform`}
                  >
                    <Icon className="h-6 w-6" />
                  </div>
                  <h2 className="font-semibold text-gray-900 group-hover:text-blue-700">{title}</h2>
                  <p className="text-sm text-gray-600 mt-2">{desc}</p>
                </div>
              ) : (
                <Link
                  to={to}
                  className="group block h-full rounded-2xl border border-gray-200 bg-white p-6 shadow-sm hover:shadow-md hover:border-blue-200 transition"
                >
                  <div
                    className={`inline-flex p-3 rounded-xl bg-gradient-to-br ${color} text-white mb-4 group-hover:scale-105 transition-transform`}
                  >
                    <Icon className="h-6 w-6" />
                  </div>
                  <h2 className="font-semibold text-gray-900 group-hover:text-blue-700">{title}</h2>
                  <p className="text-sm text-gray-600 mt-2">{desc}</p>
                </Link>
              )}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};

export default HospitalDashboard;
