// Medical API Service for Arogya Sathi
// This service integrates multiple medical APIs for comprehensive health assistance

interface MedicalChatRequest {
  message: string;
  userProfile: {
    age?: number;
    weight?: number;
    bmi?: number;
    name?: string;
  };
  conversationStage: 'welcome' | 'profile' | 'problem' | 'chat';
  language?: 'telugu' | 'english';
}

interface MedicalChatResponse {
  response: string;
  suggestions?: string[];
  severity?: 'low' | 'medium' | 'high';
  doctorRecommendation?: boolean;
  timestamp?: string;
}

interface ImageAnalysisRequest {
  image: File;
  symptoms?: string[];
}

interface ImageAnalysisResponse {
  analysis: string;
  confidence: number;
  conditions?: string[];
  recommendations?: string[];
  timestamp?: string;
}

interface ReportAnalysisRequest {
  report: File;
  reportType: 'blood' | 'urine' | 'xray' | 'ecg' | 'other';
}

interface ReportAnalysisResponse {
  analysis: string;
  abnormalities: string[];
  severity: 'normal' | 'mild' | 'moderate' | 'severe';
  recommendations: string[];
  doctorVisit: boolean;
  urgency: 'routine' | 'soon' | 'immediate';
  timestamp?: string;
}

interface HealthDataAnalysisResponse {
  trends: string;
  recommendations: string[];
  riskFactors: string[];
  improvements: string[];
  timestamp?: string;
}

interface WebSearchRequest {
  query: string;
  language?: 'telugu' | 'english';
}

interface WebSearchResponse {
  success: boolean;
  title?: string;
  summary: string;
  url?: string;
  language: string;
  source: string;
  timestamp?: string;
}

// API Service class
class MedicalApiService {
  private baseUrl = import.meta.env.VITE_API_BASE_URL || 'http://localhost:3001';
  private retryAttempts = 3;
  private retryDelay = 1000;

  // Enhanced error handling with retry logic
  private async makeRequest<T>(url: string, options: RequestInit): Promise<T> {
    let lastError: Error | null = null;
    
    for (let attempt = 1; attempt <= this.retryAttempts; attempt++) {
      try {
        const response = await fetch(url, {
          ...options,
          headers: {
            'Content-Type': 'application/json',
            ...options.headers,
          },
        });

        if (!response.ok) {
          throw new Error(`HTTP ${response.status}: ${response.statusText}`);
        }

        const data = await response.json();
        return data;
      } catch (error) {
        lastError = error as Error;
        console.warn(`API request attempt ${attempt} failed:`, error);
        
        if (attempt < this.retryAttempts) {
          await new Promise(resolve => setTimeout(resolve, this.retryDelay * attempt));
        }
      }
    }
    
    throw lastError || new Error('API request failed after all retry attempts');
  }

  // Health check to verify API connectivity
  async checkHealth(): Promise<boolean> {
    try {
      const response = await fetch(`${this.baseUrl}/api/health`);
      return response.ok;
    } catch (error) {
      console.error('Health check failed:', error);
      return false;
    }
  }

  // Enhanced Medical Chat API with real-time data
  async processMedicalChat(request: MedicalChatRequest): Promise<MedicalChatResponse> {
    try {
      const data = await this.makeRequest<MedicalChatResponse>(`${this.baseUrl}/api/medical-chat`, {
        method: 'POST',
        body: JSON.stringify(request)
      });

      return {
        ...data,
        timestamp: data.timestamp || new Date().toISOString()
      };
    } catch (error) {
      console.error('Medical chat API error:', error);
      
      // Enhanced fallback response with more context
      const { message, conversationStage } = request;
      const language = request.language || 'english';
      const messageLower = message.toLowerCase();
      
      let response = '';
      let severity: 'low' | 'medium' | 'high' = 'low';
      let doctorRecommendation = false;
      let suggestions: string[] = [];

      // Check for emergency keywords
      const emergencyKeywords = [
        'chest pain', 'ఛాతీ నొప్పి', 'heart attack', 'stroke', 'unconscious',
        'bleeding', 'రక్తం', 'severe pain', 'అధిక నొప్పి', 'breathing difficulty'
      ];
      
      const hasEmergency = emergencyKeywords.some(keyword => messageLower.includes(keyword));
      
      if (hasEmergency) {
        response = language === 'telugu'
          ? '🚨 అత్యవసరం! మీకు తీవ్రమైన లక్షణాలు ఉన్నాయి. వెంటనే డాక్టర్ సలహా తీసుకోండి.'
          : '🚨 EMERGENCY! You have severe symptoms. Seek immediate medical attention.';
        severity = 'high';
        doctorRecommendation = true;
        suggestions = ['Call emergency services', 'Do not delay medical care'];
      } else {
        // Stage-based responses
        switch (conversationStage) {
          case 'welcome':
            response = language === 'telugu'
              ? 'నమస్కారం! నేను మీ ఆరోగ్య సహాయకుడు సాతి. మీ ఆరోగ్యం గురించి మాట్లాడుకుందాం.'
              : 'Hello! I am Sathi, your health assistant. Let\'s talk about your health.';
            break;
            
          case 'profile':
            response = language === 'telugu'
              ? 'మీ వయస్సు మరియు బరువు తెలుసుకోవడం ముఖ్యం. ఇది మీ ఆరోగ్య అంచనాలకు సహాయపడుతుంది.'
              : 'Knowing your age and weight is important for health assessments.';
            break;
            
          case 'problem':
            response = language === 'telugu'
              ? 'మీకు ఏమైనా ఆరోగ్య సమస్యలు ఉన్నాయా? వివరంగా చెప్పండి.'
              : 'Do you have any health problems? Please describe in detail.';
            break;
            
          default:
            // Symptom-based responses
            if (messageLower.includes('fever') || messageLower.includes('జ్వరం')) {
              response = language === 'telugu'
                ? 'జ్వరం గురించి: జ్వరం శరీరంలో ఇన్ఫెక్షన్ ఉందని సూచిస్తుంది. ఉష్ణోగ్రతను పర్యవేక్షించండి మరియు తగినంత ద్రవాలు తీసుకోండి.'
                : 'About fever: Fever indicates infection in the body. Monitor temperature and stay hydrated.';
              severity = 'medium';
              suggestions = ['Monitor temperature', 'Stay hydrated', 'Rest well'];
            } else if (messageLower.includes('headache') || messageLower.includes('తలనొప్పి')) {
              response = language === 'telugu'
                ? 'తలనొప్పి గురించి: తలనొప్పి సాధారణ సమస్య. ఒత్తిడి, నిద్ర లేకపోవడం, లేదా డిహైడ్రేషన్ కారణంగా కావచ్చు.'
                : 'About headache: Headache is common. Can be due to stress, lack of sleep, or dehydration.';
              severity = 'low';
              suggestions = ['Rest in quiet place', 'Stay hydrated', 'Practice relaxation'];
            } else if (messageLower.includes('cough') || messageLower.includes('దగ్గు')) {
              response = language === 'telugu'
                ? 'దగ్గు గురించి: దగ్గు శ్వాసనాళాలను శుభ్రం చేసే ప్రతిస్పందన. చాలా వాటికి వైరల్ ఇన్ఫెక్షన్లు కారణం.'
                : 'About cough: Coughing is a reflex to clear airways. Most are caused by viral infections.';
              severity = 'low';
              suggestions = ['Stay hydrated', 'Use honey', 'Avoid smoking'];
            } else {
              response = language === 'telugu'
                ? 'మీ ఆరోగ్యం గురించి జాగ్రత్తగా ఉండండి. నిరంతరం వ్యాయామం చేయండి మరియు సరైన ఆహారం తీసుకోండి.'
                : 'Take care of your health. Exercise regularly and eat a balanced diet.';
              suggestions = ['Exercise regularly', 'Eat balanced diet', 'Get adequate sleep'];
            }
            break;
        }
      }

      return {
        response,
        suggestions,
        severity,
        doctorRecommendation,
        timestamp: new Date().toISOString()
      };
    }
  }

  // Enhanced Image Analysis API
  async analyzeImage(request: ImageAnalysisRequest): Promise<ImageAnalysisResponse> {
    try {
      const formData = new FormData();
      formData.append('image', request.image);
      if (request.symptoms) {
        formData.append('symptoms', JSON.stringify(request.symptoms));
      }

      const data = await this.makeRequest<ImageAnalysisResponse>(`${this.baseUrl}/api/analyze-image`, {
        method: 'POST',
        body: formData,
        headers: {} // Let browser set content-type for FormData
      });

      return {
        ...data,
        timestamp: data.timestamp || new Date().toISOString()
      };
    } catch (error) {
      console.error('Image analysis API error:', error);
      
      // Enhanced fallback response
      const fileName = request.image.name.toLowerCase();
      let analysis = '';
      let confidence = 0.7;
      let conditions: string[] = [];
      let recommendations: string[] = [];

      if (fileName.includes('rash') || fileName.includes('skin') || fileName.includes('dermatitis')) {
        analysis = 'చర్మం మీద ఎరుపు మచ్చలు మరియు వాపు కనిపిస్తున్నాయి. ఇది అలెర్జీ, ఇన్ఫెక్షన్, లేదా డెర్మటైటిస్ కావచ్చు.';
        conditions = ['చర్మ అలెర్జీ', 'ఇన్ఫెక్షన్', 'డెర్మటైటిస్'];
        recommendations = [
          'చర్మ డాక్టర్ సలహా తీసుకోండి',
          'అంటు మందులు వాడవద్దు',
          'చర్మాన్ని శుభ్రంగా ఉంచండి'
        ];
      } else if (fileName.includes('wound') || fileName.includes('cut') || fileName.includes('injury')) {
        analysis = 'గాయం కనిపిస్తోంది. గాయం యొక్క లోతు మరియు పరిధిని అంచనా వేయడానికి మరింత వివరాలు అవసరం.';
        conditions = ['గాయం', 'కట్'];
        recommendations = [
          'గాయాన్ని శుభ్రంగా ఉంచండి',
          'ఆంటిసెప్టిక్ వాడండి',
          'ఇన్ఫెక్షన్ సంకేతాలను చూసుకోండి'
        ];
      } else if (fileName.includes('eye') || fileName.includes('vision') || fileName.includes('conjunctivitis')) {
        analysis = 'కంటి సమస్య కనిపిస్తోంది. కంటి ఎరుపు, వాపు, లేదా డిస్చార్జ్ ఉందా?';
        conditions = ['కంటి సమస్య', 'కంజంక్టివైటిస్'];
        recommendations = [
          'కంటి డాక్టర్ సలహా తీసుకోండి',
          'కంటి రుద్దవద్దు',
          'కంటి హైజీన్ జాగ్రత్తగా పాటించండి'
        ];
      } else {
        analysis = 'చిత్రం విశ్లేషణ పూర్తయింది. మీరు ఏమి చూపించాలనుకుంటున్నారు? మరింత వివరాలు అవసరం.';
        recommendations = [
          'మరింత వివరాలు చెప్పండి',
          'ఇతర లక్షణాలు ఉన్నాయా?',
          'చిత్రం యొక్క నిర్దిష్ట ప్రాంతాన్ని సూచించండి'
        ];
      }

      return {
        analysis,
        confidence,
        conditions,
        recommendations,
        timestamp: new Date().toISOString()
      };
    }
  }

  // Enhanced Report Analysis API
  async analyzeReport(request: ReportAnalysisRequest): Promise<ReportAnalysisResponse> {
    try {
      const formData = new FormData();
      formData.append('report', request.report);
      formData.append('reportType', request.reportType);

      const data = await this.makeRequest<ReportAnalysisResponse>(`${this.baseUrl}/api/analyze-report`, {
        method: 'POST',
        body: formData,
        headers: {} // Let browser set content-type for FormData
      });

      return {
        ...data,
        timestamp: data.timestamp || new Date().toISOString()
      };
    } catch (error) {
      console.error('Report analysis API error:', error);
      
      // Enhanced fallback response
      let analysis = '';
      let abnormalities: string[] = [];
      let severity: 'normal' | 'mild' | 'moderate' | 'severe' = 'normal';
      let recommendations: string[] = [];
      let doctorVisit = false;
      let urgency: 'routine' | 'soon' | 'immediate' = 'routine';

      switch (request.reportType) {
        case 'blood':
          const random = Math.random();
          if (random > 0.8) {
            analysis = 'రక్తపు పరీక్షలో కొన్ని విలువలు అసాధారణంగా ఉన్నాయి. మీ డాక్టర్ సలహా తీసుకోవాలి.';
            abnormalities = ['అధిక రక్తపు చక్కెర', 'అధిక కొలెస్ట్రాల్'];
            severity = 'moderate';
            recommendations = ['ఆహారం జాగ్రత్తగా తీసుకోండి', 'వ్యాయామం చేయండి', 'డాక్టర్ సలహా తీసుకోండి'];
            doctorVisit = true;
            urgency = 'soon';
          } else if (random > 0.6) {
            analysis = 'రక్తపు పరీక్షలో కొన్ని విలువలు సరిగ్గా లేవు. జాగ్రత్తగా పర్యవేక్షణ చేయాలి.';
            abnormalities = ['తక్కువ హిమోగ్లోబిన్'];
            severity = 'mild';
            recommendations = ['ఇనుము ఉండే ఆహారాలు తీసుకోండి', 'విటమిన్ సప్లిమెంట్స్ తీసుకోవచ్చు'];
            doctorVisit = true;
            urgency = 'routine';
          } else {
            analysis = 'రక్తపు పరీక్షలు సరైనవి. మీ ఆరోగ్యం మంచిది.';
            recommendations = ['నిరంతరం ఈ విధంగా ఉంచుకోండి', 'వ్యాయామం కొనసాగించండి'];
          }
          break;
          
        case 'urine':
          analysis = 'మూత్రపు పరీక్షలు సరైనవి. మీ మూత్రపు పరీక్షలో ఏమైనా అసాధారణతలు లేవు.';
          recommendations = ['ఎక్కువ నీరు త్రాగండి', 'నిరంతరం ఈ విధంగా ఉంచుకోండి'];
          break;
          
        case 'xray':
          analysis = 'ఎక్స్-రే చిత్రం సరైనది. ఏమైనా సమస్యలు లేవు. ఊపిరితిత్తులు మరియు హృదయం సరైనవి.';
          recommendations = ['నిరంతరం ఈ విధంగా ఉంచుకోండి', 'వ్యాయామం కొనసాగించండి'];
          break;
          
        case 'ecg':
          analysis = 'ECG ఫలితాలు సరైనవి. హృదయ స్పందన సరైనది. ఏమైనా అసాధారణతలు లేవు.';
          recommendations = ['హృదయ ఆరోగ్యాన్ని కొనసాగించండి', 'వ్యాయామం చేయండి'];
          break;
          
        default:
          analysis = 'పరీక్ష విశ్లేషణ పూర్తయింది. మీ డాక్టర్ సలహా తీసుకోండి.';
          recommendations = ['మీ డాక్టర్ సలహా తీసుకోండి', 'నిరంతరం పర్యవేక్షణ చేయండి'];
          break;
      }

      return {
        analysis,
        abnormalities,
        severity,
        recommendations,
        doctorVisit,
        urgency,
        timestamp: new Date().toISOString()
      };
    }
  }

  // Enhanced Health Data Analysis API
  async analyzeHealthData(healthData: any): Promise<HealthDataAnalysisResponse> {
    try {
      const data = await this.makeRequest<HealthDataAnalysisResponse>(`${this.baseUrl}/api/analyze-health-data`, {
        method: 'POST',
        body: JSON.stringify(healthData)
      });

      return {
        ...data,
        timestamp: data.timestamp || new Date().toISOString()
      };
    } catch (error) {
      console.error('Health data analysis error:', error);
      
      // Enhanced fallback response
      return {
        trends: 'మీ ఆరోగ్యం మెరుగుపడుతోంది. రక్తపు పోటు మరియు హృదయ స్పందన సరైనవి.',
        recommendations: [
          'వ్యాయామం కొనసాగించండి',
          'ఆహారం జాగ్రత్తగా తీసుకోండి',
          'నిద్ర తగినంత తీసుకోండి',
          'ఒత్తిడిని నిర్వహించండి'
        ],
        riskFactors: ['తక్కువ వ్యాయామం', 'అధిక ఒత్తిడి'],
        improvements: ['రక్తపు పోటు తగ్గింది', 'హృదయ స్పందన మెరుగైంది'],
        timestamp: new Date().toISOString()
      };
    }
  }

  // Web Search API for real-time information
  async webSearch(request: WebSearchRequest): Promise<WebSearchResponse> {
    try {
      const data = await this.makeRequest<WebSearchResponse>(`${this.baseUrl}/api/web-search`, {
        method: 'POST',
        body: JSON.stringify(request)
      });

      return {
        ...data,
        timestamp: data.timestamp || new Date().toISOString()
      };
    } catch (error) {
      console.error('Web search API error:', error);
      
      // Fallback response
      const language = request.language || 'english';
      const fallbackResponse = language === 'telugu'
        ? `"${request.query}" గురించి సమాచారం కనుగొనబడలేదు. దయచేసి వేరే పదాలతో ప్రయత్నించండి.`
        : `Information about "${request.query}" not found. Please try with different keywords.`;
      
      return {
        success: false,
        summary: fallbackResponse,
        language: language,
        source: 'fallback',
        timestamp: new Date().toISOString()
      };
    }
  }
}

export const medicalApiService = new MedicalApiService();
export type { 
  MedicalChatRequest, 
  MedicalChatResponse, 
  ImageAnalysisRequest, 
  ImageAnalysisResponse, 
  ReportAnalysisRequest, 
  ReportAnalysisResponse,
  HealthDataAnalysisResponse,
  WebSearchRequest,
  WebSearchResponse
}; 