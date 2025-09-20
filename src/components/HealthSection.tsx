import React, { useState, useEffect } from 'react';
import { TrendingUp, TrendingDown, Activity, Heart, Calendar, Target, Zap, Users } from 'lucide-react';

interface HealthData {
  month: string;
  doctorVisits: number;
  diseases: number;
  symptoms: number;
  healthScore: number;
  medications: number;
  stressLevel: number;
}

interface HealthTrend {
  direction: 'improving' | 'declining' | 'stable';
  percentage: number;
  description: string;
}

const sampleHealthData: HealthData[] = [
  {
    month: 'Oct 2024',
    doctorVisits: 3,
    diseases: 2,
    symptoms: 8,
    healthScore: 65,
    medications: 2,
    stressLevel: 7
  },
  {
    month: 'Nov 2024',
    doctorVisits: 2,
    diseases: 1,
    symptoms: 6,
    healthScore: 72,
    medications: 1,
    stressLevel: 6
  },
  {
    month: 'Dec 2024',
    doctorVisits: 1,
    diseases: 1,
    symptoms: 4,
    healthScore: 78,
    medications: 1,
    stressLevel: 5
  },
  {
    month: 'Jan 2025',
    doctorVisits: 0,
    diseases: 0,
    symptoms: 2,
    healthScore: 85,
    medications: 0,
    stressLevel: 3
  }
];

export default function HealthSection() {
  const [currentData, setCurrentData] = useState<HealthData | null>(null);
  const [previousData, setPreviousData] = useState<HealthData | null>(null);
  const [healthTrend, setHealthTrend] = useState<HealthTrend | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    // Simulate loading health data
    const timer = setTimeout(() => {
      const current = sampleHealthData[sampleHealthData.length - 1];
      const previous = sampleHealthData[sampleHealthData.length - 2];
      
      setCurrentData(current);
      setPreviousData(previous);
      
      // Calculate health trend
      const scoreDiff = current.healthScore - previous.healthScore;
      const visitsDiff = current.doctorVisits - previous.doctorVisits;
      const diseasesDiff = current.diseases - previous.diseases;
      
      let trend: HealthTrend;
      if (scoreDiff > 0 && visitsDiff <= 0 && diseasesDiff <= 0) {
        trend = {
          direction: 'improving',
          percentage: Math.abs(scoreDiff),
          description: 'Your health is improving! Fewer doctor visits and better overall wellness.'
        };
      } else if (scoreDiff < 0 || visitsDiff > 0 || diseasesDiff > 0) {
        trend = {
          direction: 'declining',
          percentage: Math.abs(scoreDiff),
          description: 'Your health needs attention. Consider lifestyle changes and medical consultation.'
        };
      } else {
        trend = {
          direction: 'stable',
          percentage: 0,
          description: 'Your health is stable. Keep up the good work!'
        };
      }
      
      setHealthTrend(trend);
      setIsLoading(false);
    }, 2000);

    return () => clearTimeout(timer);
  }, []);

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

  if (isLoading) {
    return (
      <section id="my-health" className="py-20 bg-gradient-to-b from-purple-50 to-white">
        <div className="container mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center">
            <div className="animate-spin rounded-full h-16 w-16 border-b-2 border-purple-600 mx-auto mb-4"></div>
            <p className="text-gray-600 text-lg">Analyzing your health data...</p>
          </div>
        </div>
      </section>
    );
  }

  return (
    <section id="my-health" className="py-20 bg-gradient-to-b from-purple-50 to-white">
      <div className="container mx-auto px-4 sm:px-6 lg:px-8">
        <div className="text-center mb-16">
          <h2 className="text-4xl font-bold text-gray-800 mb-4">
            My <span className="text-purple-600">Health Journey</span>
          </h2>
          <p className="text-xl text-gray-600 max-w-3xl mx-auto">
            Track your health progress over time with detailed analytics and visual insights
          </p>
        </div>

        {/* Health Overview Card */}
        <div className="max-w-6xl mx-auto mb-12">
          <div className="bg-white rounded-3xl shadow-lg border border-gray-200 p-8 animate-fade-in">
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
              {/* 3D Health Model Visualization */}
              <div className="lg:col-span-1">
                <div className="relative h-64 bg-gradient-to-br from-blue-100 to-purple-100 rounded-2xl p-6 flex items-center justify-center">
                  {/* Animated 3D-like Health Model */}
                  <div className="relative">
                    {/* Main body circle */}
                    <div className={`w-32 h-32 rounded-full border-4 flex items-center justify-center animate-pulse-slow ${
                      healthTrend?.direction === 'improving' 
                        ? 'border-green-400 bg-green-50' 
                        : healthTrend?.direction === 'declining'
                        ? 'border-red-400 bg-red-50'
                        : 'border-blue-400 bg-blue-50'
                    }`}>
                      <Heart size={48} className={getHealthColor(currentData?.healthScore || 0)} />
                    </div>
                    
                    {/* Orbiting health indicators */}
                    <div className="absolute top-0 left-1/2 transform -translate-x-1/2 -translate-y-2">
                      <div className="w-6 h-6 bg-blue-400 rounded-full animate-float"></div>
                    </div>
                    <div className="absolute bottom-0 left-1/2 transform -translate-x-1/2 translate-y-2">
                      <div className="w-4 h-4 bg-green-400 rounded-full animate-float" style={{ animationDelay: '1s' }}></div>
                    </div>
                    <div className="absolute left-0 top-1/2 transform -translate-x-2 -translate-y-1/2">
                      <div className="w-5 h-5 bg-purple-400 rounded-full animate-float" style={{ animationDelay: '0.5s' }}></div>
                    </div>
                    <div className="absolute right-0 top-1/2 transform translate-x-2 -translate-y-1/2">
                      <div className="w-4 h-4 bg-yellow-400 rounded-full animate-float" style={{ animationDelay: '1.5s' }}></div>
                    </div>
                  </div>
                  
                  {/* Health status text */}
                  <div className="absolute bottom-4 left-4 right-4 text-center">
                    <div className={`text-lg font-bold ${getHealthColor(currentData?.healthScore || 0)}`}>
                      {getHealthStatus(currentData?.healthScore || 0)}
                    </div>
                    <div className="text-sm text-gray-600">
                      Score: {currentData?.healthScore}/100
                    </div>
                  </div>
                </div>
              </div>

              {/* Health Metrics */}
              <div className="lg:col-span-2">
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
                  <div className="text-center p-4 bg-blue-50 rounded-xl">
                    <div className="text-2xl font-bold text-blue-600">{currentData?.doctorVisits}</div>
                    <div className="text-sm text-gray-600">Doctor Visits</div>
                  </div>
                  <div className="text-center p-4 bg-green-50 rounded-xl">
                    <div className="text-2xl font-bold text-green-600">{currentData?.diseases}</div>
                    <div className="text-sm text-gray-600">Active Issues</div>
                  </div>
                  <div className="text-center p-4 bg-purple-50 rounded-xl">
                    <div className="text-2xl font-bold text-purple-600">{currentData?.symptoms}</div>
                    <div className="text-sm text-gray-600">Symptoms</div>
                  </div>
                  <div className="text-center p-4 bg-yellow-50 rounded-xl">
                    <div className="text-2xl font-bold text-yellow-600">{currentData?.medications}</div>
                    <div className="text-sm text-gray-600">Medications</div>
                  </div>
                </div>

                {/* Health Trend */}
                <div className="bg-gray-50 rounded-xl p-6">
                  <div className="flex items-center gap-4 mb-4">
                    {getTrendIcon(healthTrend?.direction || 'stable')}
                    <div>
                      <h3 className="text-lg font-semibold text-gray-800">
                        Health Trend: {healthTrend?.direction?.charAt(0).toUpperCase() + healthTrend?.direction?.slice(1)}
                      </h3>
                      <p className="text-gray-600">{healthTrend?.description}</p>
                    </div>
                  </div>
                  
                  {/* Trend visualization */}
                  <div className="flex items-center gap-4">
                    <div className="flex-1 bg-gray-200 rounded-full h-3">
                      <div 
                        className={`h-3 rounded-full transition-all duration-1000 ${
                          healthTrend?.direction === 'improving' ? 'bg-green-500' :
                          healthTrend?.direction === 'declining' ? 'bg-red-500' : 'bg-blue-500'
                        }`}
                        style={{ width: `${Math.min(100, (currentData?.healthScore || 0))}%` }}
                      ></div>
                    </div>
                    <div className="text-sm font-semibold text-gray-700">
                      {currentData?.healthScore}%
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Detailed Analytics */}
        <div className="max-w-6xl mx-auto grid grid-cols-1 lg:grid-cols-2 gap-8">
          {/* Health Timeline */}
          <div className="bg-white rounded-2xl shadow-lg border border-gray-200 p-6 animate-slide-in-left">
            <h3 className="text-xl font-semibold text-gray-800 mb-6 flex items-center gap-2">
              <Calendar className="text-purple-600" size={20} />
              Health Timeline
            </h3>
            
            <div className="space-y-4">
              {sampleHealthData.map((data, index) => (
                <div key={index} className="flex items-center gap-4 p-4 bg-gray-50 rounded-xl">
                  <div className="w-12 h-12 bg-purple-100 rounded-full flex items-center justify-center">
                    <span className="text-purple-600 font-bold">{index + 1}</span>
                  </div>
                  <div className="flex-1">
                    <div className="font-semibold text-gray-800">{data.month}</div>
                    <div className="text-sm text-gray-600">
                      Score: {data.healthScore} | Visits: {data.doctorVisits} | Issues: {data.diseases}
                    </div>
                  </div>
                  <div className={`w-3 h-3 rounded-full ${
                    data.healthScore >= 80 ? 'bg-green-500' :
                    data.healthScore >= 60 ? 'bg-yellow-500' : 'bg-red-500'
                  }`}></div>
                </div>
              ))}
            </div>
          </div>

          {/* Health Insights */}
          <div className="bg-white rounded-2xl shadow-lg border border-gray-200 p-6 animate-slide-in-right">
            <h3 className="text-xl font-semibold text-gray-800 mb-6 flex items-center gap-2">
              <Target className="text-purple-600" size={20} />
              Health Insights
            </h3>
            
            <div className="space-y-4">
              <div className="p-4 bg-green-50 rounded-xl border border-green-200">
                <div className="flex items-center gap-3 mb-2">
                  <TrendingUp className="text-green-600" size={20} />
                  <span className="font-semibold text-green-800">Improving Areas</span>
                </div>
                <p className="text-green-700 text-sm">
                  Your stress levels have decreased by 40% this month. Keep up the good work!
                </p>
              </div>
              
              <div className="p-4 bg-blue-50 rounded-xl border border-blue-200">
                <div className="flex items-center gap-3 mb-2">
                  <Activity className="text-blue-600" size={20} />
                  <span className="font-semibold text-blue-800">Stable Metrics</span>
                </div>
                <p className="text-blue-700 text-sm">
                  Your medication usage has remained consistent, showing good treatment adherence.
                </p>
              </div>
              
              <div className="p-4 bg-yellow-50 rounded-xl border border-yellow-200">
                <div className="flex items-center gap-3 mb-2">
                  <Zap className="text-yellow-600" size={20} />
                  <span className="font-semibold text-yellow-800">Recommendations</span>
                </div>
                <p className="text-yellow-700 text-sm">
                  Consider increasing physical activity to further improve your health score.
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* Health Goals */}
        <div className="max-w-4xl mx-auto mt-12">
          <div className="bg-white rounded-2xl shadow-lg border border-gray-200 p-8">
            <h3 className="text-2xl font-semibold text-gray-800 mb-6 text-center">
              Your Health Goals
            </h3>
            
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              <div className="text-center p-6 bg-gradient-to-br from-blue-50 to-purple-50 rounded-xl">
                <div className="w-16 h-16 bg-blue-100 rounded-full flex items-center justify-center mx-auto mb-4">
                  <Target className="text-blue-600" size={32} />
                </div>
                <h4 className="font-semibold text-gray-800 mb-2">Target Score</h4>
                <div className="text-3xl font-bold text-blue-600">90</div>
                <p className="text-sm text-gray-600 mt-2">Current: {currentData?.healthScore}</p>
              </div>
              
              <div className="text-center p-6 bg-gradient-to-br from-green-50 to-blue-50 rounded-xl">
                <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
                  <Users className="text-green-600" size={32} />
                </div>
                <h4 className="font-semibold text-gray-800 mb-2">Doctor Visits</h4>
                <div className="text-3xl font-bold text-green-600">0</div>
                <p className="text-sm text-gray-600 mt-2">This month</p>
              </div>
              
              <div className="text-center p-6 bg-gradient-to-br from-purple-50 to-pink-50 rounded-xl">
                <div className="w-16 h-16 bg-purple-100 rounded-full flex items-center justify-center mx-auto mb-4">
                  <Heart className="text-purple-600" size={32} />
                </div>
                <h4 className="font-semibold text-gray-800 mb-2">Stress Level</h4>
                <div className="text-3xl font-bold text-purple-600">3</div>
                <p className="text-sm text-gray-600 mt-2">Out of 10</p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
} 