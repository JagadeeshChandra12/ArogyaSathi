import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { FaUser, FaHeart, FaEdit, FaSave, FaCamera, FaSignOutAlt } from 'react-icons/fa';
import { userStorageService } from '../services/userStorage';
import { useAuth } from '../context/AuthContext';
import { isFirebaseConfigured } from '../firebase/config';
import { firebaseGetUserHealthData, firebaseUpdateProfile } from '../services/firebaseUserData';
import HealthIDCard from '../components/HealthIDCard';
import { regenerateSummary } from '../services/healthPassportApi';

const ProfilePage: React.FC = () => {
  const navigate = useNavigate();
  const { user: currentUser, signOutApp, refreshProfile } = useAuth();
  const [isEditing, setIsEditing] = useState(false);
  const [healthScore, setHealthScore] = useState(0);
  const [reportsCount, setReportsCount] = useState(0);

  const [profileData, setProfileData] = useState({
    name: '',
    email: '',
    phone: '',
    age: 0,
    gender: '',
    bloodGroup: '',
    height: 0,
    weight: 0,
    emergencyContact: {
      name: '',
      phone: '',
      relation: ''
    }
  });

  const healthMetrics = {
    bloodPressure: '',
    heartRate: '',
    bloodSugar: '',
    cholesterol: '',
    bmi: ''
  };

  useEffect(() => {
    if (!currentUser) return;
    setProfileData((prev) => ({
      ...prev,
      name: `${currentUser.firstName} ${currentUser.lastName}`.trim() || prev.name,
      email: currentUser.email || prev.email,
      phone: currentUser.phone || prev.phone,
      gender: currentUser.gender || prev.gender,
      bloodGroup: currentUser.bloodGroup || prev.bloodGroup
      ,
      emergencyContact: {
        ...prev.emergencyContact,
        phone: currentUser.phone || prev.emergencyContact.phone
      }
    }));
  }, [
    currentUser?.id,
    currentUser?.firstName,
    currentUser?.lastName,
    currentUser?.email,
    currentUser?.phone,
    currentUser?.gender,
    currentUser?.bloodGroup
  ]);

  useEffect(() => {
    let cancelled = false;
    async function load() {
      if (!currentUser) return;
      if (isFirebaseConfigured()) {
        const data = await firebaseGetUserHealthData(currentUser.id);
        if (!cancelled) {
          setHealthScore(data.length ? data[data.length - 1].healthScore : 0);
        }
      } else if (!cancelled) {
        setHealthScore(userStorageService.getUserHealthScore());
      }
    }
    load();
    return () => {
      cancelled = true;
    };
  }, [currentUser?.id]);

  useEffect(() => {
    const storedReports = localStorage.getItem('arogya_reports');
    if (storedReports) {
      try {
        const reports = JSON.parse(storedReports);
        setReportsCount(Array.isArray(reports) ? reports.length : 0);
      } catch {
        setReportsCount(0);
      }
    } else {
      setReportsCount(0);
    }
  }, []);

  const handleSave = async () => {
    setIsEditing(false);
    if (!currentUser) return;
    const nameTrim = profileData.name.trim();
    const parts = nameTrim.split(/\s+/);
    const firstName = parts[0] || '';
    const lastName = parts.slice(1).join(' ') || '';

    if (isFirebaseConfigured()) {
      const res = await firebaseUpdateProfile(currentUser.id, {
        firstName,
        lastName,
        phone: profileData.phone,
        gender: profileData.gender,
        bloodGroup: profileData.bloodGroup
      });
      if (res.success) await refreshProfile();
      else alert(res.message);
      if (res.success) {
        void regenerateSummary(currentUser.id, {
          firstName,
          lastName,
          bloodGroup: profileData.bloodGroup,
          phone: profileData.phone,
          emergencyContact: profileData.emergencyContact.phone
        }).catch(() => {});
      }
      return;
    }

    const res = userStorageService.updateUserProfile(currentUser.id, {
      firstName,
      lastName,
      phone: profileData.phone,
      gender: profileData.gender,
      bloodGroup: profileData.bloodGroup,
      email: profileData.email
    });
    if (res.success) await refreshProfile();
    else alert(res.message);
    if (res.success) {
      void regenerateSummary(currentUser.id, {
        firstName,
        lastName,
        bloodGroup: profileData.bloodGroup,
        phone: profileData.phone,
        emergencyContact: profileData.emergencyContact.phone
      }).catch(() => {});
    }
  };

  const handleInputChange = (field: string, value: string | number) => {
    setProfileData(prev => ({
      ...prev,
      [field]: value
    }));
  };

  const handleSignOut = async () => {
    await signOutApp();
    navigate('/');
  };

  const getHealthScoreColor = (score: number) => {
    if (score >= 80) return 'text-green-600';
    if (score >= 60) return 'text-yellow-600';
    return 'text-red-600';
  };

  const getHealthScoreStatus = (score: number) => {
    if (score >= 80) return 'Excellent';
    if (score >= 60) return 'Good';
    return 'Needs Attention';
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 py-8">
      <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Header */}
        <div className="text-center mb-8">
          <h1 className="text-4xl font-bold text-gray-900 mb-2">My Profile</h1>
          <p className="text-lg text-gray-600">Manage your health information and preferences</p>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Profile Card */}
          <div className="lg:col-span-1">
            <div className="bg-white rounded-2xl shadow-lg p-6">
              <div className="text-center mb-6">
                <div className="relative inline-block">
                  <div className="w-32 h-32 bg-gradient-to-br from-blue-400 to-purple-500 rounded-full flex items-center justify-center text-white text-4xl font-bold mb-4">
                    {profileData.name ? profileData.name.split(' ').map(n => n[0]).join('') : 'U'}
                  </div>
                  <button className="absolute bottom-2 right-2 bg-white p-2 rounded-full shadow-md hover:shadow-lg transition-shadow">
                    <FaCamera className="text-gray-600" />
                  </button>
                </div>
                <h2 className="text-2xl font-bold text-gray-900">{profileData.name || 'User'}</h2>
                <p className="text-gray-600">{profileData.email}</p>
              </div>

              <div className="space-y-4">
                <div className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                  <span className="text-gray-600">Member Since</span>
                  <span className="font-semibold">March 2024</span>
                </div>
                <div className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                  <span className="text-gray-600">Health Score</span>
                  <div className="text-right">
                    <span className={`font-semibold ${getHealthScoreColor(healthScore)}`}>
                      {healthScore}/100
                    </span>
                    <div className="text-xs text-gray-500">{getHealthScoreStatus(healthScore)}</div>
                  </div>
                </div>
                <div className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                  <span className="text-gray-600">Reports</span>
                  <span className="font-semibold">{reportsCount}</span>
                </div>
              </div>
            </div>
          </div>

          {/* Main Content */}
          <div className="lg:col-span-2 space-y-6">
            {/* Digital Health Identity Card */}
            {currentUser && (
              <HealthIDCard 
                user={{
                  firstName: currentUser.firstName,
                  lastName: currentUser.lastName,
                  email: currentUser.email,
                  phone: currentUser.phone,
                  bloodGroup: currentUser.bloodGroup,
                  gender: currentUser.gender,
                  age: profileData.age || undefined,
                  emergencyContact: profileData.emergencyContact,
                  id: currentUser.id
                }} 
              />
            )}

            {/* Personal Information */}
            <div className="bg-white rounded-2xl shadow-lg p-6">
              <div className="flex items-center justify-between mb-6">
                <h3 className="text-xl font-bold text-gray-900 flex items-center">
                  <FaUser className="mr-2 text-blue-500" />
                  Personal Information
                </h3>
                <button
                  onClick={() => setIsEditing(!isEditing)}
                  className="flex items-center px-4 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600 transition-colors"
                >
                  {isEditing ? <FaSave className="mr-2" /> : <FaEdit className="mr-2" />}
                  {isEditing ? 'Save' : 'Edit'}
                </button>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Full Name</label>
                  <input
                    type="text"
                    value={profileData.name}
                    onChange={(e) => handleInputChange('name', e.target.value)}
                    disabled={!isEditing}
                    className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent disabled:bg-gray-50"
                    placeholder="Enter your full name"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Email</label>
                  <input
                    type="email"
                    value={profileData.email}
                    onChange={(e) => handleInputChange('email', e.target.value)}
                    disabled={!isEditing}
                    className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent disabled:bg-gray-50"
                    placeholder="Enter your email"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Phone</label>
                  <input
                    type="tel"
                    value={profileData.phone}
                    onChange={(e) => handleInputChange('phone', e.target.value)}
                    disabled={!isEditing}
                    className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent disabled:bg-gray-50"
                    placeholder="Enter your phone number"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Age</label>
                  <input
                    type="number"
                    value={profileData.age}
                    onChange={(e) => handleInputChange('age', parseInt(e.target.value) || 0)}
                    disabled={!isEditing}
                    className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent disabled:bg-gray-50"
                    placeholder="Enter your age"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Gender</label>
                  <select
                    value={profileData.gender}
                    onChange={(e) => handleInputChange('gender', e.target.value)}
                    disabled={!isEditing}
                    className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent disabled:bg-gray-50"
                  >
                    <option value="">Select gender</option>
                    <option value="Male">Male</option>
                    <option value="Female">Female</option>
                    <option value="Other">Other</option>
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Blood Group</label>
                  <select
                    value={profileData.bloodGroup}
                    onChange={(e) => handleInputChange('bloodGroup', e.target.value)}
                    disabled={!isEditing}
                    className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent disabled:bg-gray-50"
                  >
                    <option value="">Select blood group</option>
                    <option value="A+">A+</option>
                    <option value="A-">A-</option>
                    <option value="B+">B+</option>
                    <option value="B-">B-</option>
                    <option value="AB+">AB+</option>
                    <option value="AB-">AB-</option>
                    <option value="O+">O+</option>
                    <option value="O-">O-</option>
                  </select>
                </div>
              </div>

              {isEditing && (
                <div className="mt-6 flex justify-end">
                  <button
                    onClick={handleSave}
                    className="px-6 py-2 bg-green-500 text-white rounded-lg hover:bg-green-600 transition-colors"
                  >
                    Save Changes
                  </button>
                </div>
              )}
            </div>

            {/* Health Metrics */}
            <div className="bg-white rounded-2xl shadow-lg p-6">
              <h3 className="text-xl font-bold text-gray-900 mb-6 flex items-center">
                <FaHeart className="mr-2 text-red-500" />
                Health Metrics
              </h3>
              
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <div className="text-center p-4 bg-red-50 rounded-lg">
                  <div className="text-2xl font-bold text-red-600">{healthMetrics.bloodPressure || '--'}</div>
                  <div className="text-sm text-gray-600">Blood Pressure</div>
                </div>
                <div className="text-center p-4 bg-blue-50 rounded-lg">
                  <div className="text-2xl font-bold text-blue-600">{healthMetrics.heartRate || '--'}</div>
                  <div className="text-sm text-gray-600">Heart Rate</div>
                </div>
                <div className="text-center p-4 bg-green-50 rounded-lg">
                  <div className="text-2xl font-bold text-green-600">{healthMetrics.bloodSugar || '--'}</div>
                  <div className="text-sm text-gray-600">Blood Sugar</div>
                </div>
                <div className="text-center p-4 bg-purple-50 rounded-lg">
                  <div className="text-2xl font-bold text-purple-600">{healthMetrics.bmi || '--'}</div>
                  <div className="text-sm text-gray-600">BMI</div>
                </div>
              </div>
            </div>

            {/* Emergency Contact */}
            <div className="bg-white rounded-2xl shadow-lg p-6">
              <h3 className="text-xl font-bold text-gray-900 mb-6">Emergency Contact</h3>
              
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Name</label>
                  <input
                    type="text"
                    value={profileData.emergencyContact.name}
                    onChange={(e) => setProfileData(prev => ({
                      ...prev,
                      emergencyContact: { ...prev.emergencyContact, name: e.target.value }
                    }))}
                    disabled={!isEditing}
                    className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent disabled:bg-gray-50"
                    placeholder="Enter emergency contact name"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Phone</label>
                  <input
                    type="tel"
                    value={profileData.emergencyContact.phone}
                    onChange={(e) => setProfileData(prev => ({
                      ...prev,
                      emergencyContact: { ...prev.emergencyContact, phone: e.target.value }
                    }))}
                    disabled={!isEditing}
                    className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent disabled:bg-gray-50"
                    placeholder="Enter emergency contact phone"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Relation</label>
                  <input
                    type="text"
                    value={profileData.emergencyContact.relation}
                    onChange={(e) => setProfileData(prev => ({
                      ...prev,
                      emergencyContact: { ...prev.emergencyContact, relation: e.target.value }
                    }))}
                    disabled={!isEditing}
                    className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent disabled:bg-gray-50"
                    placeholder="Enter relation"
                  />
                </div>
              </div>
            </div>

            {/* Settings */}
            <div className="bg-white rounded-2xl shadow-lg p-6">
              <h3 className="text-xl font-bold text-gray-900 mb-6">Settings</h3>
              
              <div className="space-y-4">
                <div className="flex items-center justify-between p-4 border border-gray-200 rounded-lg">
                  <div className="flex items-center">
                    <FaSignOutAlt className="text-red-500 mr-3" />
                    <div>
                      <div className="font-medium">Sign Out</div>
                      <div className="text-sm text-gray-600">Log out of your account</div>
                    </div>
                  </div>
                  <button 
                    onClick={handleSignOut}
                    className="text-red-500 hover:text-red-700 font-medium"
                  >
                    Sign Out
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ProfilePage; 