import React, { useState, useEffect } from 'react';
import { TrendingUp, TrendingDown, Activity, Heart, Calendar, Target, Zap, Users, ArrowLeft, BarChart3, ActivitySquare, Brain, Plus, Upload, CheckCircle, Clock, Trophy, Medal, Crown } from 'lucide-react';
import { Link } from 'react-router-dom';
import { userStorageService, HealthData } from '../services/userStorage';

interface HealthTrend {
  direction: 'improving' | 'declining' | 'stable';
  percentage: number;
  description: string;
}

interface MonthlySchedule {
  month: string;
  status: 'completed' | 'pending' | 'upcoming';
  dueDate: string;
  healthScore: number;
}

interface LeaderboardEntry {
  userId: string;
  userName: string;
  healthScore: number;
  rank: number;
  lastUpdated: string;
}

export default function HealthPage() {
  const [healthData, setHealthData] = useState<HealthData[]>([]);
  const [currentData, setCurrentData] = useState<HealthData | null>(null);
  const [previousData, setPreviousData] = useState<HealthData | null>(null);
  const [healthTrend, setHealthTrend] = useState<HealthTrend | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [showInputForm, setShowInputForm] = useState(false);
  const [monthlySchedule, setMonthlySchedule] = useState<MonthlySchedule[]>([]);
  const [leaderboard, setLeaderboard] = useState<LeaderboardEntry[]>([]);
  const [currentUser] = useState(userStorageService.getCurrentUser());

  // Initialize with user data
  useEffect(() => {
    const userHealthData = userStorageService.getUserHealthData();
    setHealthData(userHealthData);

    // Generate monthly schedule
    generateMonthlySchedule();
    
    // Generate leaderboard
    generateLeaderboard();
    
    setIsLoading(false);
  }, []);

  const generateMonthlySchedule = () => {
    const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
    const currentMonth = new Date().getMonth();
    const currentYear = new Date().getFullYear();
    
    const schedule: MonthlySchedule[] = [];
    
    for (let i = 0; i < 12; i++) {
      const monthIndex = (currentMonth + i) % 12;
      const year = currentYear + Math.floor((currentMonth + i) / 12);
      const monthName = months[monthIndex];
      
      schedule.push({
        month: `${monthName} ${year}`,
        status: i === 0 ? 'pending' : i < 0 ? 'completed' : 'upcoming',
        dueDate: `${monthName} 15, ${year}`,
        healthScore: 0
      });
    }
    
    setMonthlySchedule(schedule);
  };

  const generateLeaderboard = () => {
    const allUsers = userStorageService.getAllUsers();
    const allHealthData = userStorageService.getAllHealthData();
    
    const leaderboardData: LeaderboardEntry[] = [];
    
    allUsers.forEach(user => {
      const userHealthData = allHealthData.filter(data => data.userId === user.id);
      if (userHealthData.length > 0) {
        const latestData = userHealthData[userHealthData.length - 1];
        leaderboardData.push({
          userId: user.id,
          userName: `${user.firstName} ${user.lastName}`,
          healthScore: latestData.healthScore,
          rank: 0,
          lastUpdated: latestData.createdAt
        });
      }
    });
    
    // Sort by health score (descending) and assign ranks
    leaderboardData.sort((a, b) => b.healthScore - a.healthScore);
    leaderboardData.forEach((entry, index) => {
      entry.rank = index + 1;
    });
    
    setLeaderboard(leaderboardData);
  };

  const calculateHealthScore = (data: Partial<HealthData>): number => {
    let score = 100;
    
    // Deduct points for negative factors
    if (data.doctorVisits) score -= data.doctorVisits * 5;
    if (data.diseases) score -= data.diseases * 10;
    if (data.symptoms) score -= data.symptoms * 2;
    if (data.medications) score -= data.medications * 3;
    if (data.stressLevel) score -= data.stressLevel * 2;
    
    // Add points for positive factors
    if (data.sleepHours && data.sleepHours >= 7) score += 5;
    if (data.exerciseMinutes && data.exerciseMinutes >= 30) score += 10;
    if (data.waterIntake && data.waterIntake >= 6) score += 5;
    
    return Math.max(0, Math.min(100, score));
  };

  const handleAddHealthData = (newData: Omit<HealthData, 'id' | 'userId' | 'healthScore' | 'createdAt'>) => {
    const healthScore = calculateHealthScore(newData);
    const dataWithScore = {
      ...newData,
      healthScore
    };

    const result = userStorageService.addHealthData(dataWithScore);
    
    if (result.success) {
      // Refresh health data
      const updatedHealthData = userStorageService.getUserHealthData();
      setHealthData(updatedHealthData);
      
      // Update monthly schedule
      updateMonthlySchedule(result.data!);
      
      // Update leaderboard
      generateLeaderboard();
      
      setShowInputForm(false);
    } else {
      alert(result.message);
    }
  };

  const updateMonthlySchedule = (newData: HealthData) => {
    const updatedSchedule = monthlySchedule.map(item => {
      if (item.month === newData.month) {
        return {
          ...item,
          status: 'completed' as const,
          healthScore: newData.healthScore
        };
      }
      return item;
    });
    setMonthlySchedule(updatedSchedule);
  };

  const getHealthColor = (score: number) => {
    if (score >= 80) return 'text-green-600';
    if (score >= 60) return 'text-yellow-600';
    return 'text-red-600';
  };

  const getHealthStatus = (score: number) => {
    if (score >= 80) return 'Excellent';
    if (score >= 60) return 'Good';
    return 'Needs Attention';
  };

  const getTrendIcon = (direction: string) => {
    switch (direction) {
      case 'improving':
        return <TrendingUp className="text-green-600" size={24} />;
      case 'declining':
        return <TrendingDown className="text-red-600" size={24} />;
      default:
        return <Activity className="text-blue-600" size={24} />;
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'completed':
        return <CheckCircle className="text-green-500" size={20} />;
      case 'pending':
        return <Clock className="text-yellow-500" size={20} />;
      case 'upcoming':
        return <Calendar className="text-gray-400" size={20} />;
      default:
        return <Calendar className="text-gray-400" size={20} />;
    }
  };

  const getRankIcon = (rank: number) => {
    switch (rank) {
      case 1:
        return <Crown className="text-yellow-500" size={20} />;
      case 2:
        return <Medal className="text-gray-400" size={20} />;
      case 3:
        return <Trophy className="text-orange-500" size={20} />;
      default:
        return <span className="text-gray-600 font-bold">{rank}</span>;
    }
  };

  const getCurrentUserRank = () => {
    if (!currentUser) return null;
    return leaderboard.find(entry => entry.userId === currentUser.id);
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-purple-50 pt-20">
        <div className="container mx-auto px-4 sm:px-6 lg:px-8 py-20">
          <div className="text-center">
            <div className="animate-spin rounded-full h-16 w-16 border-b-2 border-purple-600 mx-auto mb-4"></div>
            <p className="text-gray-600 text-lg">Loading your health data...</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-purple-50 pt-20">
      <div className="container mx-auto px-4 sm:px-6 lg:px-8 py-12">
        {/* Page Header */}
        <div className="mb-12">
          <Link 
            to="/" 
            className="inline-flex items-center gap-2 text-blue-600 hover:text-blue-700 mb-6 transition-colors duration-300"
          >
            <ArrowLeft size={20} />
            <span>Back to Home</span>
          </Link>
          
          <div className="text-center">
            <h1 className="text-5xl font-bold text-gray-800 mb-4">
              My <span className="text-purple-600">Health Journey</span>
            </h1>
            <p className="text-xl text-gray-600 max-w-3xl mx-auto">
              Track your health progress over time with detailed analytics and visual insights
            </p>
          </div>
        </div>

        {/* Add Health Data Button */}
        <div className="max-w-7xl mx-auto mb-8">
          <button
            onClick={() => setShowInputForm(true)}
            className="flex items-center gap-2 px-6 py-3 bg-gradient-to-r from-blue-600 to-purple-600 text-white rounded-xl hover:from-blue-700 hover:to-purple-700 transition-all duration-300 shadow-lg"
          >
            <Plus size={20} />
            <span>Add Health Data</span>
          </button>
        </div>

        {/* Leaderboard */}
        <div className="max-w-7xl mx-auto mb-12">
          <div className="bg-white rounded-3xl shadow-xl border border-gray-200 p-8">
            <h2 className="text-2xl font-bold text-gray-800 mb-6 flex items-center gap-2">
              <Trophy className="text-yellow-500" size={24} />
              Health Leaderboard
            </h2>
            
            {leaderboard.length > 0 ? (
              <div className="space-y-4">
                {/* Top 3 Podium */}
                {leaderboard.slice(0, 3).length > 0 && (
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-8">
                    {leaderboard.slice(0, 3).map((entry, index) => (
                      <div
                        key={entry.userId}
                        className={`p-6 rounded-2xl text-center ${
                          index === 0
                            ? 'bg-gradient-to-br from-yellow-50 to-yellow-100 border-2 border-yellow-200'
                            : index === 1
                            ? 'bg-gradient-to-br from-gray-50 to-gray-100 border-2 border-gray-200'
                            : 'bg-gradient-to-br from-orange-50 to-orange-100 border-2 border-orange-200'
                        }`}
                      >
                        <div className="flex justify-center mb-3">
                          {getRankIcon(entry.rank)}
                        </div>
                        <h3 className="font-bold text-lg text-gray-800 mb-2">
                          {entry.userName}
                        </h3>
                        <div className={`text-2xl font-bold ${getHealthColor(entry.healthScore)}`}>
                          {entry.healthScore}/100
                        </div>
                        <p className="text-sm text-gray-600 mt-1">
                          {getHealthStatus(entry.healthScore)}
                        </p>
                      </div>
                    ))}
                  </div>
                )}
                
                {/* Full Leaderboard */}
                <div className="space-y-3">
                  {leaderboard.map((entry) => (
                    <div
                      key={entry.userId}
                      className={`flex items-center justify-between p-4 rounded-xl border-2 transition-all duration-300 ${
                        entry.userId === currentUser?.id
                          ? 'border-blue-300 bg-blue-50'
                          : 'border-gray-200 bg-gray-50'
                      }`}
                    >
                      <div className="flex items-center gap-4">
                        <div className="flex items-center justify-center w-8 h-8">
                          {getRankIcon(entry.rank)}
                        </div>
                        <div>
                          <h4 className="font-semibold text-gray-800">
                            {entry.userName}
                            {entry.userId === currentUser?.id && (
                              <span className="ml-2 text-xs bg-blue-100 text-blue-700 px-2 py-1 rounded-full">
                                You
                              </span>
                            )}
                          </h4>
                          <p className="text-sm text-gray-600">
                            Last updated: {new Date(entry.lastUpdated).toLocaleDateString()}
                          </p>
                        </div>
                      </div>
                      <div className="text-right">
                        <div className={`text-lg font-bold ${getHealthColor(entry.healthScore)}`}>
                          {entry.healthScore}/100
                        </div>
                        <div className="text-sm text-gray-600">
                          {getHealthStatus(entry.healthScore)}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            ) : (
              <div className="text-center py-8">
                <Trophy className="text-gray-400 mx-auto mb-4" size={48} />
                <h3 className="text-lg font-semibold text-gray-600 mb-2">No Leaderboard Data</h3>
                <p className="text-gray-500">Start adding health data to see rankings!</p>
              </div>
            )}
          </div>
        </div>

        {/* Monthly Schedule */}
        <div className="max-w-7xl mx-auto mb-12">
          <div className="bg-white rounded-3xl shadow-xl border border-gray-200 p-8">
            <h2 className="text-2xl font-bold text-gray-800 mb-6 flex items-center gap-2">
              <Calendar className="text-purple-600" size={24} />
              Monthly Health Upload Schedule
            </h2>
            
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
              {monthlySchedule.map((item, index) => (
                <div
                  key={index}
                  className={`p-4 rounded-xl border-2 transition-all duration-300 ${
                    item.status === 'completed'
                      ? 'border-green-200 bg-green-50'
                      : item.status === 'pending'
                      ? 'border-yellow-200 bg-yellow-50'
                      : 'border-gray-200 bg-gray-50'
                  }`}
                >
                  <div className="flex items-center justify-between mb-2">
                    <span className="font-semibold text-gray-800">{item.month}</span>
                    {getStatusIcon(item.status)}
                  </div>
                  <p className="text-sm text-gray-600 mb-2">Due: {item.dueDate}</p>
                  {item.status === 'completed' && (
                    <div className="flex items-center gap-2">
                      <span className="text-sm font-medium">Health Score:</span>
                      <span className={`text-sm font-bold ${getHealthColor(item.healthScore)}`}>
                        {item.healthScore}/100
                      </span>
                    </div>
                  )}
                  <div className="mt-2">
                    <span className={`text-xs px-2 py-1 rounded-full ${
                      item.status === 'completed'
                        ? 'bg-green-100 text-green-700'
                        : item.status === 'pending'
                        ? 'bg-yellow-100 text-yellow-700'
                        : 'bg-gray-100 text-gray-600'
                    }`}>
                      {item.status.charAt(0).toUpperCase() + item.status.slice(1)}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Health Data Input Form */}
        {showInputForm && (
          <HealthDataInputForm
            onSubmit={handleAddHealthData}
            onCancel={() => setShowInputForm(false)}
          />
        )}

        {/* Health Overview */}
        {healthData.length > 0 && (
          <div className="max-w-7xl mx-auto mb-12">
            <div className="bg-white rounded-3xl shadow-xl border border-gray-200 p-8">
              <h2 className="text-2xl font-bold text-gray-800 mb-6">Health Overview</h2>
              
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                {healthData.slice(-4).map((data) => (
                  <div key={data.id} className="bg-gradient-to-br from-blue-50 to-purple-50 rounded-xl p-6">
                    <div className="flex items-center justify-between mb-4">
                      <h3 className="font-semibold text-gray-800">{data.month}</h3>
                      <span className={`text-sm font-bold ${getHealthColor(data.healthScore)}`}>
                        {data.healthScore}/100
                      </span>
                    </div>
                    
                    <div className="space-y-2 text-sm">
                      <div className="flex justify-between">
                        <span>Doctor Visits:</span>
                        <span className="font-medium">{data.doctorVisits}</span>
                      </div>
                      <div className="flex justify-between">
                        <span>Diseases:</span>
                        <span className="font-medium">{data.diseases}</span>
                      </div>
                      <div className="flex justify-between">
                        <span>Exercise:</span>
                        <span className="font-medium">{data.exerciseMinutes} min</span>
                      </div>
                      <div className="flex justify-between">
                        <span>Sleep:</span>
                        <span className="font-medium">{data.sleepHours} hrs</span>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* Empty State */}
        {healthData.length === 0 && !showInputForm && (
          <div className="max-w-7xl mx-auto">
            <div className="bg-white rounded-3xl shadow-xl border border-gray-200 p-12 text-center">
              <div className="w-24 h-24 bg-gradient-to-br from-blue-100 to-purple-100 rounded-full flex items-center justify-center mx-auto mb-6">
                <Upload className="text-blue-600" size={40} />
              </div>
              <h3 className="text-2xl font-bold text-gray-800 mb-4">Start Your Health Journey</h3>
              <p className="text-gray-600 mb-8 max-w-md mx-auto">
                Add your first health data to begin tracking your progress and see your health score improve over time.
              </p>
              <button
                onClick={() => setShowInputForm(true)}
                className="px-6 py-3 bg-gradient-to-r from-blue-600 to-purple-600 text-white rounded-xl hover:from-blue-700 hover:to-purple-700 transition-all duration-300"
              >
                Add Your First Health Data
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

// Health Data Input Form Component
interface HealthDataInputFormProps {
  onSubmit: (data: Omit<HealthData, 'id' | 'userId' | 'healthScore' | 'createdAt'>) => void;
  onCancel: () => void;
}

function HealthDataInputForm({ onSubmit, onCancel }: HealthDataInputFormProps) {
  const [formData, setFormData] = useState({
    month: new Date().toLocaleDateString('en-US', { month: 'short', year: 'numeric' }),
    date: new Date().toISOString().split('T')[0],
    doctorVisits: 0,
    diseases: 0,
    symptoms: 0,
    medications: 0,
    stressLevel: 5,
    sleepHours: 7,
    exerciseMinutes: 30,
    waterIntake: 6,
    bloodPressure: '',
    heartRate: 70,
    bloodSugar: 100,
    weight: 70,
    notes: ''
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSubmit(formData);
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-3xl shadow-2xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
        <div className="p-8">
          <h2 className="text-2xl font-bold text-gray-800 mb-6">Add Health Data</h2>
          
          <form onSubmit={handleSubmit} className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Month</label>
                <input
                  type="text"
                  value={formData.month}
                  onChange={(e) => setFormData({...formData, month: e.target.value})}
                  className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  placeholder="e.g., Jan 2025"
                />
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Date</label>
                <input
                  type="date"
                  value={formData.date}
                  onChange={(e) => setFormData({...formData, date: e.target.value})}
                  className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                />
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Doctor Visits</label>
                <input
                  type="number"
                  value={formData.doctorVisits}
                  onChange={(e) => setFormData({...formData, doctorVisits: parseInt(e.target.value) || 0})}
                  className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  min="0"
                />
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Diseases</label>
                <input
                  type="number"
                  value={formData.diseases}
                  onChange={(e) => setFormData({...formData, diseases: parseInt(e.target.value) || 0})}
                  className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  min="0"
                />
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Symptoms</label>
                <input
                  type="number"
                  value={formData.symptoms}
                  onChange={(e) => setFormData({...formData, symptoms: parseInt(e.target.value) || 0})}
                  className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  min="0"
                />
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Medications</label>
                <input
                  type="number"
                  value={formData.medications}
                  onChange={(e) => setFormData({...formData, medications: parseInt(e.target.value) || 0})}
                  className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  min="0"
                />
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Stress Level (1-10)</label>
                <input
                  type="range"
                  min="1"
                  max="10"
                  value={formData.stressLevel}
                  onChange={(e) => setFormData({...formData, stressLevel: parseInt(e.target.value)})}
                  className="w-full"
                />
                <span className="text-sm text-gray-600">{formData.stressLevel}/10</span>
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Sleep Hours</label>
                <input
                  type="number"
                  step="0.5"
                  value={formData.sleepHours}
                  onChange={(e) => setFormData({...formData, sleepHours: parseFloat(e.target.value) || 0})}
                  className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  min="0"
                  max="24"
                />
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Exercise (minutes)</label>
                <input
                  type="number"
                  value={formData.exerciseMinutes}
                  onChange={(e) => setFormData({...formData, exerciseMinutes: parseInt(e.target.value) || 0})}
                  className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  min="0"
                />
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Water Intake (glasses)</label>
                <input
                  type="number"
                  value={formData.waterIntake}
                  onChange={(e) => setFormData({...formData, waterIntake: parseInt(e.target.value) || 0})}
                  className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  min="0"
                />
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Blood Pressure</label>
                <input
                  type="text"
                  value={formData.bloodPressure}
                  onChange={(e) => setFormData({...formData, bloodPressure: e.target.value})}
                  className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  placeholder="e.g., 120/80"
                />
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Heart Rate (bpm)</label>
                <input
                  type="number"
                  value={formData.heartRate}
                  onChange={(e) => setFormData({...formData, heartRate: parseInt(e.target.value) || 0})}
                  className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  min="0"
                />
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Blood Sugar (mg/dL)</label>
                <input
                  type="number"
                  value={formData.bloodSugar}
                  onChange={(e) => setFormData({...formData, bloodSugar: parseInt(e.target.value) || 0})}
                  className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  min="0"
                />
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Weight (kg)</label>
                <input
                  type="number"
                  step="0.1"
                  value={formData.weight}
                  onChange={(e) => setFormData({...formData, weight: parseFloat(e.target.value) || 0})}
                  className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  min="0"
                />
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Notes</label>
              <textarea
                value={formData.notes}
                onChange={(e) => setFormData({...formData, notes: e.target.value})}
                rows={3}
                className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                placeholder="Any additional notes about your health..."
              />
            </div>

            <div className="flex justify-end gap-4 pt-6">
              <button
                type="button"
                onClick={onCancel}
                className="px-6 py-3 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors"
              >
                Cancel
              </button>
              <button
                type="submit"
                className="px-6 py-3 bg-gradient-to-r from-blue-600 to-purple-600 text-white rounded-lg hover:from-blue-700 hover:to-purple-700 transition-all duration-300"
              >
                Save Health Data
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
} 