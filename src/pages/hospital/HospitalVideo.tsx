import React from 'react';
import { Link } from 'react-router-dom';
import { ArrowLeft } from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import VideoSession from '../VideoSession';

const HospitalVideo: React.FC = () => {
  const { staff } = useAuth();
  if (!staff) return null;

  const hospitalLabel =
    staff.hospitalName === 'Other' && staff.hospitalCustom ? staff.hospitalCustom : staff.hospitalName;

  return (
    <div className="min-h-screen bg-white pt-20">
      <div className="max-w-6xl mx-auto px-4 pb-4">
        <Link
          to="/hospital"
          className="inline-flex items-center gap-2 text-sm text-blue-600 hover:text-blue-800 mb-4"
        >
          <ArrowLeft className="h-4 w-4" />
          Dashboard
        </Link>
        <div className="rounded-xl border border-blue-100 bg-blue-50/80 px-4 py-3 mb-6 text-sm text-gray-800">
          <strong>{staff.fullName}</strong> · {staff.specialization} · {hospitalLabel} ·{' '}
          <span className="text-blue-800">{staff.department}</span>
          <span className="block text-gray-600 mt-1">
            Video sessions are scoped to your hospital profile. Patient list below is demo data; connect a signaling
            server for production calls.
          </span>
        </div>
      </div>
      <VideoSession />
    </div>
  );
};

export default HospitalVideo;
