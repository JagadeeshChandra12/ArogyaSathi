import React, { useState, useEffect } from 'react';
import { FileText, Calendar, TrendingUp, Clock, CheckCircle, AlertCircle, Activity } from 'lucide-react';

interface Report {
  id: number;
  date: string;
  symptoms: string[];
  severity: number;
  status: 'completed' | 'pending' | 'urgent';
  summary: string;
  recommendations: string[];
}

const sampleReports: Report[] = [
  {
    id: 1,
    date: '2025-01-15',
    symptoms: ['Headache', 'Fatigue', 'Mild Fever'],
    severity: 4,
    status: 'completed',
    summary: 'Tension headache with mild fever. Symptoms improved with rest and hydration.',
    recommendations: ['Rest well', 'Stay hydrated', 'Monitor temperature']
  },
  {
    id: 2,
    date: '2025-01-10',
    symptoms: ['Back Pain', 'Nausea'],
    severity: 7,
    status: 'urgent',
    summary: 'Severe back pain with nausea. Recommended to see doctor within 24 hours.',
    recommendations: ['See doctor soon', 'Avoid heavy lifting', 'Rest']
  },
  {
    id: 3,
    date: '2025-01-05',
    symptoms: ['Cough', 'Sore Throat'],
    severity: 3,
    status: 'completed',
    summary: 'Mild respiratory symptoms. Improved with over-the-counter medication.',
    recommendations: ['Rest voice', 'Stay hydrated', 'Use throat lozenges']
  }
];

export default function ReportsSection() {
  const [reports, setReports] = useState<Report[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedReport, setSelectedReport] = useState<Report | null>(null);

  useEffect(() => {
    // Simulate loading reports
    const timer = setTimeout(() => {
      setReports(sampleReports);
      setLoading(false);
    }, 1500);

    return () => clearTimeout(timer);
  }, []);

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'completed': return 'text-green-600 bg-green-100';
      case 'urgent': return 'text-red-600 bg-red-100';
      case 'pending': return 'text-yellow-600 bg-yellow-100';
      default: return 'text-gray-600 bg-gray-100';
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'completed': return <CheckCircle size={16} />;
      case 'urgent': return <AlertCircle size={16} />;
      case 'pending': return <Clock size={16} />;
      default: return <Activity size={16} />;
    }
  };

  if (loading) {
    return (
      <section id="reports" className="py-20 bg-gradient-to-b from-white to-blue-50">
        <div className="container mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
            <p className="text-gray-600">Loading your health reports...</p>
          </div>
        </div>
      </section>
    );
  }

  return (
    <section id="reports" className="py-20 bg-gradient-to-b from-white to-blue-50">
      <div className="container mx-auto px-4 sm:px-6 lg:px-8">
        <div className="text-center mb-16">
          <h2 className="text-4xl font-bold text-gray-800 mb-4">
            Your <span className="text-blue-600">Health Reports</span>
          </h2>
          <p className="text-xl text-gray-600 max-w-3xl mx-auto">
            Keep track of your symptoms and health patterns over time. All your reports are saved here for easy reference.
          </p>
        </div>

        <div className="max-w-6xl mx-auto grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Reports List */}
          <div className="lg:col-span-1">
            <div className="bg-white rounded-2xl shadow-sm border border-gray-200 p-6">
              <h3 className="text-xl font-semibold text-gray-800 mb-6 flex items-center gap-2">
                <FileText className="text-blue-600" size={20} />
                Recent Reports
              </h3>
              
              <div className="space-y-4">
                {reports.map((report) => (
                  <div
                    key={report.id}
                    onClick={() => setSelectedReport(report)}
                    className={`p-4 rounded-lg border cursor-pointer transition-all duration-300 hover:shadow-md ${
                      selectedReport?.id === report.id 
                        ? 'border-blue-300 bg-blue-50' 
                        : 'border-gray-200 hover:border-blue-200'
                    }`}
                  >
                    <div className="flex items-center justify-between mb-2">
                      <div className="flex items-center gap-2">
                        <Calendar size={16} className="text-gray-500" />
                        <span className="text-sm text-gray-600">
                          {new Date(report.date).toLocaleDateString()}
                        </span>
                      </div>
                      <div className={`px-2 py-1 rounded-full text-xs font-medium flex items-center gap-1 ${getStatusColor(report.status)}`}>
                        {getStatusIcon(report.status)}
                        {report.status}
                      </div>
                    </div>
                    
                    <div className="mb-2">
                      <div className="flex items-center gap-2 mb-1">
                        <TrendingUp size={14} className="text-gray-500" />
                        <span className="text-xs text-gray-500">Severity: {report.severity}/10</span>
                      </div>
                      <div className="w-full bg-gray-200 rounded-full h-1">
                        <div
                          className={`h-1 rounded-full transition-all duration-500 ${
                            report.severity <= 3 ? 'bg-green-500' :
                            report.severity <= 6 ? 'bg-yellow-500' : 'bg-red-500'
                          }`}
                          style={{ width: `${report.severity * 10}%` }}
                        ></div>
                      </div>
                    </div>
                    
                    <div className="flex flex-wrap gap-1">
                      {report.symptoms.slice(0, 2).map((symptom, index) => (
                        <span key={index} className="text-xs bg-gray-100 text-gray-600 px-2 py-1 rounded-full">
                          {symptom}
                        </span>
                      ))}
                      {report.symptoms.length > 2 && (
                        <span className="text-xs text-gray-500">+{report.symptoms.length - 2} more</span>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* Report Details */}
          <div className="lg:col-span-2">
            {selectedReport ? (
              <div className="bg-white rounded-2xl shadow-sm border border-gray-200 p-8 animate-fade-in">
                <div className="flex items-center justify-between mb-6">
                  <h3 className="text-2xl font-semibold text-gray-800">Report Details</h3>
                  <div className={`px-3 py-1 rounded-full text-sm font-medium flex items-center gap-2 ${getStatusColor(selectedReport.status)}`}>
                    {getStatusIcon(selectedReport.status)}
                    {selectedReport.status}
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8">
                  <div>
                    <h4 className="text-lg font-semibold text-gray-800 mb-3">Date</h4>
                    <p className="text-gray-600">{new Date(selectedReport.date).toLocaleDateString('en-US', { 
                      weekday: 'long', 
                      year: 'numeric', 
                      month: 'long', 
                      day: 'numeric' 
                    })}</p>
                  </div>
                  
                  <div>
                    <h4 className="text-lg font-semibold text-gray-800 mb-3">Severity Level</h4>
                    <div className="flex items-center gap-3">
                      <div className="text-2xl font-bold text-gray-800">{selectedReport.severity}/10</div>
                      <div className="flex-1">
                        <div className="w-full bg-gray-200 rounded-full h-2">
                          <div
                            className={`h-2 rounded-full transition-all duration-1000 ${
                              selectedReport.severity <= 3 ? 'bg-green-500' :
                              selectedReport.severity <= 6 ? 'bg-yellow-500' : 'bg-red-500'
                            }`}
                            style={{ width: `${selectedReport.severity * 10}%` }}
                          ></div>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>

                <div className="mb-8">
                  <h4 className="text-lg font-semibold text-gray-800 mb-3">Symptoms Reported</h4>
                  <div className="flex flex-wrap gap-2">
                    {selectedReport.symptoms.map((symptom, index) => (
                      <span key={index} className="bg-blue-100 text-blue-800 px-3 py-2 rounded-full text-sm">
                        {symptom}
                      </span>
                    ))}
                  </div>
                </div>

                <div className="mb-8">
                  <h4 className="text-lg font-semibold text-gray-800 mb-3">Summary</h4>
                  <p className="text-gray-600 leading-relaxed">{selectedReport.summary}</p>
                </div>

                <div>
                  <h4 className="text-lg font-semibold text-gray-800 mb-3">Recommendations</h4>
                  <div className="space-y-2">
                    {selectedReport.recommendations.map((rec, index) => (
                      <div key={index} className="flex items-center gap-3 p-3 bg-green-50 rounded-lg">
                        <CheckCircle size={16} className="text-green-600" />
                        <span className="text-gray-700">{rec}</span>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            ) : (
              <div className="bg-white rounded-2xl shadow-sm border border-gray-200 p-8 text-center">
                <FileText size={48} className="text-gray-400 mx-auto mb-4" />
                <h3 className="text-xl font-semibold text-gray-800 mb-2">Select a Report</h3>
                <p className="text-gray-600">Choose a report from the list to view detailed information</p>
              </div>
            )}
          </div>
        </div>

        {/* Stats Summary */}
        <div className="mt-16 grid grid-cols-1 md:grid-cols-4 gap-6">
          <div className="bg-white rounded-2xl p-6 text-center shadow-sm border border-gray-200">
            <div className="text-3xl font-bold text-blue-600 mb-2">{reports.length}</div>
            <div className="text-gray-600">Total Reports</div>
          </div>
          <div className="bg-white rounded-2xl p-6 text-center shadow-sm border border-gray-200">
            <div className="text-3xl font-bold text-green-600 mb-2">
              {reports.filter(r => r.status === 'completed').length}
            </div>
            <div className="text-gray-600">Completed</div>
          </div>
          <div className="bg-white rounded-2xl p-6 text-center shadow-sm border border-gray-200">
            <div className="text-3xl font-bold text-yellow-600 mb-2">
              {reports.filter(r => r.status === 'pending').length}
            </div>
            <div className="text-gray-600">Pending</div>
          </div>
          <div className="bg-white rounded-2xl p-6 text-center shadow-sm border border-gray-200">
            <div className="text-3xl font-bold text-red-600 mb-2">
              {reports.filter(r => r.status === 'urgent').length}
            </div>
            <div className="text-gray-600">Urgent</div>
          </div>
        </div>
      </div>
    </section>
  );
} 