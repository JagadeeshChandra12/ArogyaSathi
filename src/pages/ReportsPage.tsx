import React, { useState, useRef, useMemo } from 'react';
import { Link } from 'react-router-dom';
import { 
  ArrowLeft, 
  FileText,
  Activity, 
  AlertTriangle, 
  CheckCircle, 
  Clock,
  Download,
  Eye,
  Trash2,
  Plus,
  Search
} from 'lucide-react';
import { medicalApiService } from '../services/medicalApi';
import HealthRecordCompanionPanel from '../components/HealthRecordCompanionPanel';
import { useAuth } from '../context/AuthContext';
import { registerReportForPatient } from '../services/healthPassportApi';

interface Report {
  id: string;
  name: string;
  type: 'blood' | 'urine' | 'xray' | 'ecg' | 'other';
  date: Date;
  status: 'pending' | 'analyzing' | 'completed' | 'abnormal';
  file: File;
  analysis?: {
    summary: string;
    summaryTelugu?: string;
    abnormalities: string[];
    abnormalitiesTelugu?: string[];
    severity: 'normal' | 'mild' | 'moderate' | 'severe';
    recommendations: string[];
    recommendationsTelugu?: string[];
    doctorVisit: boolean;
    urgency: 'routine' | 'soon' | 'immediate';
    diagnosisSummary?: string;
    diagnosisSummaryTelugu?: string;
    precautions?: string[];
    precautionsTelugu?: string[];
    diagnosisPrecautions?: { [abnormality: string]: { en: string; te: string } };
  };
}

export default function ReportsPage() {
  const { user } = useAuth();
  const [reports, setReports] = useState<Report[]>([]);
  const [selectedReport, setSelectedReport] = useState<Report | null>(null);
  const [isUploading, setIsUploading] = useState(false);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [filterType, setFilterType] = useState<'all' | 'blood' | 'urine' | 'xray' | 'ecg' | 'other'>('all');
  const [filterStatus, setFilterStatus] = useState<'all' | 'pending' | 'analyzing' | 'completed' | 'abnormal'>('all');
  const [language, setLanguage] = useState<'english' | 'telugu' | 'both'>('both');

  // Optimized statistics calculation
  const stats = useMemo(() => {
    return {
      total: reports.length,
      normal: reports.filter(r => r.status === 'completed' && r.analysis?.severity === 'normal').length,
      abnormal: reports.filter(r => r.status === 'abnormal' || (r.analysis?.severity && r.analysis.severity !== 'normal')).length,
      pending: reports.filter(r => r.status === 'pending' || r.status === 'analyzing').length
    };
  }, [reports]);

  // Optimized filtering
  const filteredReports = useMemo(() => {
    return reports.filter(report => {
      const matchesSearch = report.name.toLowerCase().includes(searchTerm.toLowerCase());
      const matchesType = filterType === 'all' || report.type === filterType;
      const matchesStatus = filterStatus === 'all' || 
        (filterStatus === 'completed' && report.status === 'completed') ||
        (filterStatus === 'abnormal' && report.status === 'abnormal');
      return matchesSearch && matchesType && matchesStatus;
    });
  }, [reports, searchTerm, filterType, filterStatus]);

  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFileUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const files = event.target.files;
    if (!files) return;

    setIsUploading(true);

    for (let i = 0; i < files.length; i++) {
      const file = files[i];
      const reportType = determineReportType(file.name);
      
      const newReport: Report = {
        id: Date.now().toString() + i,
        name: file.name,
        type: reportType,
        date: new Date(),
        status: 'pending',
        file: file
      };

      setReports(prev => [newReport, ...prev]);

      // Start analysis
      await analyzeReport(newReport);
    }

    setIsUploading(false);
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  const determineReportType = (fileName: string): 'blood' | 'urine' | 'xray' | 'ecg' | 'other' => {
    const lowerName = fileName.toLowerCase();
    if (lowerName.includes('blood') || lowerName.includes('cbc') || lowerName.includes('hemoglobin')) {
      return 'blood';
    } else if (lowerName.includes('urine') || lowerName.includes('urinalysis')) {
      return 'urine';
    } else if (lowerName.includes('xray') || lowerName.includes('x-ray') || lowerName.includes('chest')) {
      return 'xray';
    } else if (lowerName.includes('ecg') || lowerName.includes('ekg') || lowerName.includes('heart')) {
      return 'ecg';
    } else {
      return 'other';
    }
  };

  const analyzeReport = async (report: Report) => {
    setIsAnalyzing(true);
    
    try {
      // Update status to analyzing
      setReports(prev => prev.map(r => 
        r.id === report.id ? { ...r, status: 'analyzing' } : r
      ));

      // Use medical API service for report analysis
      const analysis = await medicalApiService.analyzeReport({
        report: report.file,
        reportType: report.type
      });

      // Generate AI-powered diagnosis and precautions
      let diagnosisSummary = '';
      let precautions = [];
      
      if (analysis.abnormalities.length > 0) {
        // Create a smart diagnosis based on abnormalities
        const abnormalityText = analysis.abnormalities.join(', ');
        diagnosisSummary = `Diagnosis: Based on your report, ${abnormalityText} has been detected. This requires attention and proper management.`;
        
        // Generate smart precautions based on severity and type
        if (analysis.severity === 'severe') {
          precautions = [
            'Immediate medical consultation required',
            'Follow doctor\'s prescription strictly',
            'Monitor symptoms daily',
            'Avoid self-medication'
          ];
        } else if (analysis.severity === 'moderate') {
          precautions = [
            'Schedule doctor appointment soon',
            'Monitor your condition regularly',
            'Follow healthy lifestyle habits',
            'Take prescribed medications'
          ];
        } else {
          precautions = [
            'Regular health monitoring',
            'Maintain healthy diet',
            'Exercise regularly',
            'Follow up with doctor'
          ];
        }
      } else {
        diagnosisSummary = 'Great news! No abnormalities detected in your report. Keep maintaining your healthy lifestyle.';
        precautions = [
          'Continue regular health checkups',
          'Maintain balanced diet',
          'Exercise regularly',
          'Stay hydrated and get adequate sleep'
        ];
      }

      // Update report with analysis results
      setReports(prev => prev.map(r => 
        r.id === report.id ? { 
          ...r, 
          status: analysis.doctorVisit ? 'abnormal' : 'completed',
          analysis: {
            ...analysis,
            summary: analysis.analysis,
            summaryTelugu: getTeluguSummary(analysis.analysis, report.type),
            abnormalitiesTelugu: analysis.abnormalities.map(ab => getTeluguAbnormality(ab)),
            recommendationsTelugu: analysis.recommendations.map(rec => getTeluguRecommendation(rec)),
            diagnosisSummary,
            diagnosisSummaryTelugu: getTeluguDiagnosis(diagnosisSummary),
            precautions,
            precautionsTelugu: precautions.map(prec => getTeluguPrecaution(prec))
          }
        } : r
      ));
      if (user?.id) {
        void registerReportForPatient({
          patientId: user.id,
          report: {
            report_id: report.id,
            file_name: report.name,
            s3_url: URL.createObjectURL(report.file),
            profile: {
              firstName: user.firstName,
              lastName: user.lastName,
              bloodGroup: user.bloodGroup,
              emergencyContact: user.phone
            }
          }
        }).catch(() => {});
      }

    } catch (error) {
      console.error('Error analyzing report:', error);
      setReports(prev => prev.map(r => 
        r.id === report.id ? { ...r, status: 'completed' } : r
      ));
    } finally {
      setIsAnalyzing(false);
    }
  };

  // Telugu translation functions
  const getTeluguSummary = (summary: string, type: string): string => {
    console.log('Translating summary:', summary);
    const summaries: { [key: string]: string } = {
      'blood': 'రక్తపు పరీక్షలు సరైనవి. మీ ఆరోగ్యం మంచిది.',
      'urine': 'మూత్రపు పరీక్షలు సరైనవి. మీ మూత్రపు పరీక్షలో ఏమైనా అసాధారణతలు లేవు.',
      'xray': 'ఎక్స్-రే చిత్రం సరైనది. ఏమైనా సమస్యలు లేవు. ఊపిరితిత్తులు మరియు హృదయం సరైనవి.',
      'ecg': 'ECG ఫలితాలు సరైనవి. హృదయ స్పందన సరైనది. ఏమైనా అసాధారణతలు లేవు.',
      'other': 'పరీక్ష విశ్లేషణ పూర్తయింది. మీ డాక్టర్ సలహా తీసుకోండి.'
    };
    
    return summaries[type] || 'పరీక్ష విశ్లేషణ పూర్తయింది. మీ డాక్టర్ సలహా తీసుకోండి.';
  };

  const getTeluguAbnormality = (abnormality: string): string => {
    const translations: { [key: string]: string } = {
      'high blood sugar': 'అధిక రక్తపు చక్కెర',
      'high cholesterol': 'అధిక కొలెస్ట్రాల్',
      'low hemoglobin': 'తక్కువ హిమోగ్లోబిన్',
      'high blood pressure': 'అధిక రక్తపు పోటు',
      'low blood pressure': 'తక్కువ రక్తపు పోటు',
      'irregular heartbeat': 'అనియమిత హృదయ స్పందన',
      'chest infection': 'ఛాతీ ఇన్ఫెక్షన్',
      'lung problem': 'ఊపిరితిత్తుల సమస్య'
    };
    
    return translations[abnormality.toLowerCase()] || abnormality;
  };

  const getTeluguRecommendation = (recommendation: string): string => {
    const translations: { [key: string]: string } = {
      'monitor blood pressure': 'రక్తపు పోటును పర్యవేక్షించండి',
      'exercise regularly': 'నిరంతరం వ్యాయామం చేయండి',
      'eat balanced diet': 'సంతులిత ఆహారం తీసుకోండి',
      'consult doctor': 'డాక్టర్ సలహా తీసుకోండి',
      'take prescribed medication': 'నిర్దేశించిన మందులు తీసుకోండి',
      'avoid smoking': 'ధూమపానం వదిలేయండి',
      'reduce salt intake': 'ఉప్పు తీసుకోవడం తగ్గించండి',
      'get adequate sleep': 'తగినంత నిద్ర తీసుకోండి',
      'stay hydrated': 'ఎక్కువ నీరు త్రాగండి',
      'avoid stress': 'ఒత్తిడిని నిర్వహించండి'
    };
    
    return translations[recommendation.toLowerCase()] || recommendation;
  };

  const getTeluguDiagnosis = (diagnosis: string): string => {
    if (diagnosis.includes('Great news')) {
      return 'మంచి వార్త! మీ పరీక్షలో ఏమైనా అసాధారణతలు కనుగొనబడలేదు. మీ ఆరోగ్యకర జీవనశైలిని కొనసాగించండి.';
    }
    return 'నిర్ధారణ: మీ పరీక్ష ఆధారంగా, అసాధారణతలు కనుగొనబడ్డాయి. దీనికి శ్రద్ధ మరియు సరైన నిర్వహణ అవసరం.';
  };

  const getTeluguPrecaution = (precaution: string): string => {
    const translations: { [key: string]: string } = {
      'Immediate medical consultation required': 'వెంటనే వైద్య సంప్రదింపు అవసరం',
      'Follow doctor\'s prescription strictly': 'డాక్టర్ నిర్దేశించిన మందులు కఠినంగా పాటించండి',
      'Monitor symptoms daily': 'రోజువారీ లక్షణాలను పర్యవేక్షించండి',
      'Avoid self-medication': 'స్వయం మందులు వాడవద్దు',
      'Schedule doctor appointment soon': 'వెంటనే డాక్టర్ నియామకం ఏర్పాటు చేయండి',
      'Monitor your condition regularly': 'మీ పరిస్థితిని నిరంతరం పర్యవేక్షించండి',
      'Follow healthy lifestyle habits': 'ఆరోగ్యకర జీవనశైలి అలవాట్లను పాటించండి',
      'Take prescribed medications': 'నిర్దేశించిన మందులు తీసుకోండి',
      'Regular health monitoring': 'నిరంతర ఆరోగ్య పర్యవేక్షణ',
      'Maintain healthy diet': 'ఆరోగ్యకర ఆహారం తీసుకోండి',
      'Exercise regularly': 'నిరంతరం వ్యాయామం చేయండి',
      'Follow up with doctor': 'డాక్టర్ సలహా తీసుకోండి',
      'Continue regular health checkups': 'నిరంతర ఆరోగ్య పరీక్షలను కొనసాగించండి',
      'Stay hydrated and get adequate sleep': 'ఎక్కువ నీరు త్రాగండి మరియు తగినంత నిద్ర తీసుకోండి'
    };
    
    return translations[precaution] || precaution;
  };

  const getStatusIcon = (status: Report['status']) => {
    switch (status) {
      case 'pending':
        return <Clock className="text-yellow-500" size={16} />;
      case 'analyzing':
        return <Activity className="text-blue-500 animate-spin" size={16} />;
      case 'completed':
        return <CheckCircle className="text-green-500" size={16} />;
      case 'abnormal':
        return <AlertTriangle className="text-red-500" size={16} />;
      default:
        return <FileText className="text-gray-500" size={16} />;
    }
  };

  const getStatusText = (status: Report['status']) => {
    switch (status) {
      case 'pending':
        return 'Pending';
      case 'analyzing':
        return 'Analyzing';
      case 'completed':
        return 'Normal';
      case 'abnormal':
        return 'Abnormal';
      default:
        return 'Unknown';
    }
  };

  const getSeverityColor = (severity: string) => {
    switch (severity) {
      case 'normal':
        return 'text-green-600 bg-green-50';
      case 'mild':
        return 'text-yellow-600 bg-yellow-50';
      case 'moderate':
        return 'text-orange-600 bg-orange-50';
      case 'severe':
        return 'text-red-600 bg-red-50';
      default:
        return 'text-gray-600 bg-gray-50';
    }
  };

  const getUrgencyColor = (urgency: string) => {
    switch (urgency) {
      case 'routine':
        return 'text-green-600 bg-green-50';
      case 'soon':
        return 'text-yellow-600 bg-yellow-50';
      case 'immediate':
        return 'text-red-600 bg-red-50';
      default:
        return 'text-gray-600 bg-gray-50';
    }
  };

  // stats and filteredReports are now at the top for better organization and type safety

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-red-50 pt-20">
      <div className="container mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Page Header */}
        <div className="mb-8">
          <Link 
            to="/" 
            className="inline-flex items-center gap-2 text-blue-600 hover:text-blue-700 mb-6 transition-colors duration-300"
          >
            <ArrowLeft size={20} />
            <span>Back to Home</span>
          </Link>
          
          <div className="text-center">
            <h1 className="text-4xl font-bold text-gray-800 mb-4">
              My <span className="text-blue-600">Reports</span>
            </h1>
            <p className="text-lg text-gray-600">
              Upload, analyze, and track your medical reports with AI-powered insights
            </p>
          </div>
        </div>

        <div className="max-w-4xl mx-auto mb-8">
          <HealthRecordCompanionPanel variant="patient" />
        </div>

        <div className="max-w-7xl mx-auto">
          {/* Statistics Cards */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-8">
            <div className="bg-white rounded-2xl p-6 shadow-lg border border-gray-200">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-600">Total Reports</p>
                  <p className="text-2xl font-bold text-gray-800">{stats.total}</p>
                </div>
                <FileText className="text-blue-600" size={24} />
              </div>
            </div>
            
            <div className="bg-white rounded-2xl p-6 shadow-lg border border-gray-200">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-600">Normal</p>
                  <p className="text-2xl font-bold text-green-600">{stats.normal}</p>
                </div>
                <CheckCircle className="text-green-600" size={24} />
              </div>
            </div>
            
            <div className="bg-white rounded-2xl p-6 shadow-lg border border-gray-200">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-600">Abnormal</p>
                  <p className="text-2xl font-bold text-red-600">{stats.abnormal}</p>
                </div>
                <AlertTriangle className="text-red-600" size={24} />
              </div>
            </div>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
            {/* Reports List */}
            <div className="lg:col-span-2">
              <div className="bg-white rounded-3xl shadow-xl border border-gray-200 p-6">
                {/* Header */}
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
                  <h2 className="text-2xl font-bold text-gray-800">Medical Reports</h2>
                  
                  <div className="flex items-center gap-3">
                    {/* Language Toggle */}
                    <div className="flex items-center gap-2 bg-gray-100 rounded-lg p-1">
                      <button
                        onClick={() => setLanguage('english')}
                        className={`px-3 py-1 rounded-md text-sm font-medium transition-colors ${
                          language === 'english' 
                            ? 'bg-white text-blue-600 shadow-sm' 
                            : 'text-gray-600 hover:text-gray-800'
                        }`}
                      >
                        English
                      </button>
                      <button
                        onClick={() => setLanguage('telugu')}
                        className={`px-3 py-1 rounded-md text-sm font-medium transition-colors ${
                          language === 'telugu' 
                            ? 'bg-white text-blue-600 shadow-sm' 
                            : 'text-gray-600 hover:text-gray-800'
                        }`}
                      >
                        తెలుగు
                      </button>
                      <button
                        onClick={() => setLanguage('both')}
                        className={`px-3 py-1 rounded-md text-sm font-medium transition-colors ${
                          language === 'both' 
                            ? 'bg-white text-blue-600 shadow-sm' 
                            : 'text-gray-600 hover:text-gray-800'
                        }`}
                      >
                        Both
                      </button>
                    </div>
                    
                    <button
                      onClick={() => fileInputRef.current?.click()}
                      disabled={isUploading}
                      className="inline-flex items-center gap-2 bg-blue-600 text-white px-4 py-2 rounded-xl hover:bg-blue-700 transition-colors duration-300 disabled:opacity-50"
                    >
                      <Plus size={20} />
                      {isUploading ? 'Uploading...' : 'Upload Report'}
                    </button>
                  </div>
                </div>

                {/* Filters */}
                <div className="flex flex-col sm:flex-row gap-4 mb-6">
                  <div className="flex-1">
                    <div className="relative">
                      <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" size={20} />
                      <input
                        type="text"
                        placeholder="Search reports..."
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                        className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500"
                      />
                    </div>
                  </div>
                  
                  <select
                    value={filterType}
                    onChange={(e) => setFilterType(e.target.value as any)}
                    className="px-4 py-2 border border-gray-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500"
                  >
                    <option value="all">All Types</option>
                    <option value="blood">Blood</option>
                    <option value="urine">Urine</option>
                    <option value="xray">X-Ray</option>
                    <option value="ecg">ECG</option>
                    <option value="other">Other</option>
                  </select>
                  
                  <select
                    value={filterStatus}
                    onChange={(e) => setFilterStatus(e.target.value as any)}
                    className="px-4 py-2 border border-gray-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500"
                  >
                    <option value="all">All Status</option>
                    <option value="completed">Normal</option>
                    <option value="abnormal">Abnormal</option>
                  </select>
                </div>

                {/* Reports List */}
                <div className="space-y-4 max-h-96 overflow-y-auto">
                  {filteredReports.length === 0 ? (
                    <div className="text-center py-12">
                      <FileText className="mx-auto text-gray-400" size={48} />
                      <p className="text-gray-600 mt-4">No reports found</p>
                      <p className="text-sm text-gray-500">Upload your first medical report to get started</p>
                    </div>
                  ) : (
                    filteredReports.map((report) => (
                      <div
                        key={report.id}
                        onClick={() => setSelectedReport(report)}
                        className={`p-4 border rounded-2xl cursor-pointer transition-all duration-300 hover:shadow-lg ${
                          selectedReport?.id === report.id 
                            ? 'border-blue-500 bg-blue-50' 
                            : 'border-gray-200 hover:border-blue-300'
                        }`}
                      >
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-3">
                            <div className="w-10 h-10 bg-blue-100 rounded-full flex items-center justify-center">
                              <FileText className="text-blue-600" size={20} />
                            </div>
                            <div>
                              <h3 className="font-semibold text-gray-800">{report.name}</h3>
                              <p className="text-sm text-gray-600">
                                {report.type.toUpperCase()} • {report.date.toLocaleDateString()}
                              </p>
                            </div>
                          </div>
                          
                          <div className="flex items-center gap-2">
                            {getStatusIcon(report.status)}
                            <span className="text-sm font-medium">{getStatusText(report.status)}</span>
                          </div>
                        </div>
                        
                        {report.analysis && (
                          <div className="mt-3 pt-3 border-t border-gray-200">
                            <div className="flex items-center gap-2">
                              <span className={`px-2 py-1 rounded-full text-xs font-medium ${getSeverityColor(report.analysis.severity)}`}>
                                {report.analysis.severity}
                              </span>
                              {report.analysis.doctorVisit && (
                                <span className="px-2 py-1 rounded-full text-xs font-medium bg-red-100 text-red-600">
                                  Doctor Visit Recommended
                                </span>
                              )}
                            </div>
                          </div>
                        )}
                      </div>
                    ))
                  )}
                </div>

                <input
                  ref={fileInputRef}
                  type="file"
                  multiple
                  accept=".pdf,.jpg,.jpeg,.png,.doc,.docx"
                  onChange={handleFileUpload}
                  className="hidden"
                />
              </div>
            </div>

            {/* Report Details */}
            <div className="lg:col-span-1">
              <div className="bg-white rounded-3xl shadow-xl border border-gray-200 p-6 h-fit">
                <h2 className="text-2xl font-bold text-gray-800 mb-6">Report Details</h2>
                
                {selectedReport ? (
                  <div className="space-y-6">
                    {/* Report Info */}
                    <div>
                      <h3 className="font-semibold text-gray-800 mb-3">Report Information</h3>
                      <div className="space-y-2 text-sm">
                        <div className="flex justify-between">
                          <span className="text-gray-600">Name:</span>
                          <span className="font-medium">{selectedReport.name}</span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-gray-600">Type:</span>
                          <span className="font-medium capitalize">{selectedReport.type}</span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-gray-600">Date:</span>
                          <span className="font-medium">{selectedReport.date.toLocaleDateString()}</span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-gray-600">Status:</span>
                          <span className="font-medium">{getStatusText(selectedReport.status)}</span>
                        </div>
                      </div>
                    </div>

                    {/* Analysis Results */}
                    {selectedReport.analysis && (
                      <div>
                        <h3 className="font-semibold text-gray-800 mb-3">AI Analysis Results</h3>
                        <div className="space-y-4">
                          {/* Diagnosis Summary */}
                          <div>
                            <p className="text-sm text-gray-600 mb-2">Diagnosis Summary</p>
                            <div className="space-y-2">
                              {(language === 'english' || language === 'both') && (
                                <p className="text-sm bg-blue-50 p-3 rounded-lg text-blue-800">
                                  {selectedReport.analysis.diagnosisSummary}
                                </p>
                              )}
                              {(language === 'telugu' || language === 'both') && selectedReport.analysis.diagnosisSummaryTelugu && (
                                <p className="text-sm bg-green-50 p-3 rounded-lg text-green-800">
                                  {selectedReport.analysis.diagnosisSummaryTelugu}
                                </p>
                              )}
                            </div>
                          </div>
                          
                          {/* Precautions */}
                          {selectedReport.analysis.precautions && selectedReport.analysis.precautions.length > 0 && (
                            <div>
                              <p className="text-sm text-gray-600 mb-2">Precautions & Recommendations</p>
                              <div className="space-y-1">
                                {selectedReport.analysis.precautions.map((prec, index) => (
                                  <div key={index} className="space-y-1">
                                    <div className="flex items-center gap-2 text-sm">
                                      <CheckCircle className="text-green-500" size={16} />
                                      <span>{prec}</span>
                                    </div>
                                    {selectedReport.analysis?.precautionsTelugu?.[index] && (language === 'telugu' || language === 'both') && (
                                      <div className="flex items-center gap-2 text-sm text-green-600 ml-6">
                                        <span>{selectedReport.analysis.precautionsTelugu[index]}</span>
                                      </div>
                                    )}
                                  </div>
                                ))}
                              </div>
                            </div>
                          )}
                          
                          {/* Original Analysis */}
                          <div>
                            <p className="text-sm text-gray-600 mb-2">Detailed Analysis</p>
                            <div className="space-y-2">
                              {(language === 'english' || language === 'both') && (
                                <p className="text-sm bg-gray-50 p-3 rounded-lg">{selectedReport.analysis.summary}</p>
                              )}
                              {(language === 'telugu' || language === 'both') && selectedReport.analysis.summaryTelugu && (
                                <p className="text-sm bg-blue-50 p-3 rounded-lg text-blue-800">
                                  {selectedReport.analysis.summaryTelugu}
                                </p>
                              )}
                            </div>
                          </div>
                          
                          {/* Severity and Urgency */}
                          <div className="flex items-center gap-2">
                            <span className={`px-2 py-1 rounded-full text-xs font-medium ${getSeverityColor(selectedReport.analysis.severity)}`}>
                              Severity: {selectedReport.analysis.severity}
                            </span>
                            <span className={`px-2 py-1 rounded-full text-xs font-medium ${getUrgencyColor(selectedReport.analysis.urgency)}`}>
                              Urgency: {selectedReport.analysis.urgency}
                            </span>
                          </div>
                          
                          {/* Doctor Visit Alert */}
                          {selectedReport.analysis.doctorVisit && (
                            <div className="bg-red-50 border border-red-200 rounded-lg p-3">
                              <div className="flex items-center gap-2">
                                <AlertTriangle className="text-red-600" size={20} />
                                <span className="font-medium text-red-800">Doctor Visit Recommended</span>
                              </div>
                              <p className="text-sm text-red-700 mt-1">
                                Based on the analysis, a doctor consultation is advised.
                              </p>
                              <p className="text-sm text-red-700 mt-1">
                                విశ్లేషణ ఆధారంగా, డాక్టర్ సంప్రదింపు సిఫార్సు చేయబడింది.
                              </p>
                            </div>
                          )}
                        </div>
                      </div>
                    )}

                    {selectedReport.analysis?.diagnosisPrecautions && (
                      <div>
                        <h4 className="font-semibold text-gray-800 mt-4 mb-2">Diagnosis & Precautions</h4>
                        {selectedReport.analysis.abnormalities.map((ab) => (
                          <div key={ab} className="mb-3">
                            <div className="font-medium text-red-700">{ab}</div>
                            {selectedReport.analysis?.diagnosisPrecautions?.[ab]?.en && (
                              <div className="text-sm bg-gray-50 p-2 rounded mb-1">{selectedReport.analysis.diagnosisPrecautions[ab].en}</div>
                            )}
                            {selectedReport.analysis?.diagnosisPrecautions?.[ab]?.te && (
                              <div className="text-sm bg-blue-50 p-2 rounded text-blue-800">{selectedReport.analysis.diagnosisPrecautions[ab].te}</div>
                            )}
                          </div>
                        ))}
                      </div>
                    )}

                    {/* Actions */}
                    <div className="flex gap-2">
                      <button className="flex-1 bg-blue-600 text-white px-4 py-2 rounded-xl hover:bg-blue-700 transition-colors duration-300">
                        <Eye size={16} className="inline mr-2" />
                        View
                      </button>
                      <button className="flex-1 bg-green-600 text-white px-4 py-2 rounded-xl hover:bg-green-700 transition-colors duration-300">
                        <Download size={16} className="inline mr-2" />
                        Download
                      </button>
                      <button className="bg-red-600 text-white px-4 py-2 rounded-xl hover:bg-red-700 transition-colors duration-300">
                        <Trash2 size={16} />
                      </button>
                    </div>
                  </div>
                ) : (
                  <div className="text-center py-12">
                    <FileText className="mx-auto text-gray-400" size={48} />
                    <p className="text-gray-600 mt-4">Select a report</p>
                    <p className="text-sm text-gray-500">Choose a report from the list to view details</p>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
} 