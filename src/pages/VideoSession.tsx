import React, { useState, useRef, useEffect } from 'react';
import { Phone, PhoneOff, User, Calendar, Heart, Pill, Globe, Mic, MicOff } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { medicalApiService } from '../services/medicalApi';
import patientsData from '../data/patients.json';

interface Patient {
  id: number;
  name: string;
  age: number;
  gender: string;
  condition: string;
  symptoms: string;
  medications: string;
  lastVisit: string;
  phone: string;
  email: string;
}

declare global {
  interface Window {
    JitsiMeetExternalAPI: any;
  }
}

const VideoSession: React.FC = () => {
  const [selectedPatient, setSelectedPatient] = useState<Patient | null>(null);
  const [isCallActive, setIsCallActive] = useState(false);
  
  const jitsiContainerRef = useRef<HTMLDivElement>(null);
  const apiRef = useRef<any>(null);
  
  // Translation & Subtitles State
  const [isTranslationEnabled, setIsTranslationEnabled] = useState(false);
  const [targetLanguage, setTargetLanguage] = useState<'telugu' | 'hindi'>('telugu');
  const [currentTranscription, setCurrentTranscription] = useState('');
  const [translatedSubtitle, setTranslatedSubtitle] = useState('');
  const recognitionRef = useRef<any>(null);

  // Translation mapping for common phrases (Mock/Optimized for Speed)
  const quickTranslate = (text: string, lang: 'telugu' | 'hindi') => {
    const textLow = text.toLowerCase();
    const map: Record<string, Record<'telugu' | 'hindi', string>> = {
      'hello': { telugu: 'నమస్కారం (Namaskaram)', hindi: 'नमस्ते (Namaste)' },
      'how are you': { telugu: 'మీరు ఎలా ఉన్నారు? (How are you?)', hindi: 'आप कैसे हैं?' },
      'are you feeling better': { telugu: 'మీకు ఇప్పుడు నయంగా ఉందా?', hindi: 'क्या आप बेहतर महसूस कर रहे हैं?' },
      'take this medicine': { telugu: 'ఈ మందు తీసుకోండి', hindi: 'यह दवा लें' },
      'any pain': { telugu: 'ఎక్కడైనా నొప్పి ఉందా?', hindi: 'क्या कोई दर्द है?' },
      'don\'t worry': { telugu: 'చింతించకండి, అంతా బాగుంటుంది', hindi: 'चिंता न करें' },
      'breathe deep': { telugu: 'గట్టిగా ఊపిరి తీసుకోండి', hindi: 'गहरी सांस लें' },
      'show me your report': { telugu: 'మీ నివేదిక నాకు చూపించండి', hindi: 'मुझे अपनी रिपोर्ट दिखाएं' }
    };

    const match = Object.keys(map).find(key => textLow.includes(key));
    return match ? map[match][lang] : null;
  };

  useEffect(() => {
    if (isTranslationEnabled && isCallActive) {
      const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
      if (SpeechRecognition) {
        const recognition = new SpeechRecognition();
        recognition.continuous = true;
        recognition.interimResults = true;
        recognition.lang = 'en-US';

        recognition.onresult = async (event: any) => {
          const latest = event.results[event.results.length - 1][0].transcript;
          setCurrentTranscription(latest);

          // Perform Translation
          const quick = quickTranslate(latest, targetLanguage);
          if (quick) {
            setTranslatedSubtitle(quick);
          } else {
            // Use Medical API for smart translation if no quick match
             medicalApiService.processMedicalChat({
               message: `Translate this medical phrase to ${targetLanguage}: "${latest}"`,
               userProfile: {},
               conversationStage: 'chat',
               language: targetLanguage
             }).then(res => {
               setTranslatedSubtitle(res.response);
             });
          }
        };

        recognition.start();
        recognitionRef.current = recognition;
      }
    } else {
      if (recognitionRef.current) {
        recognitionRef.current.stop();
        setTranslatedSubtitle('');
        setCurrentTranscription('');
      }
    }

    return () => {
      if (recognitionRef.current) recognitionRef.current.stop();
    };
  }, [isTranslationEnabled, isCallActive, targetLanguage]);

  useEffect(() => {
    if (isCallActive && selectedPatient && jitsiContainerRef.current) {
      const domain = "meet.jit.si";
      const roomName = `arogya-sathi-consultation-${selectedPatient.id}-${new Date().getTime()}`;
      
      const options = {
        roomName: roomName,
        parentNode: jitsiContainerRef.current,
        width: "100%",
        height: 700,
        userInfo: {
          displayName: "Doctor", // In a real app, use the actual authenticated doctor's name
        },
        configOverwrite: {
          prejoinPageEnabled: false, // Skip the "Ready to join" screen for speed
          disableDeepLinking: true,  // Force it to stay in the browser/IFrame
        },
        interfaceConfigOverwrite: {
          TILE_VIEW_MAX_COLUMNS: 2, // Optimized for 1:1 consultation
        }
      };

      const api = new window.JitsiMeetExternalAPI(domain, options);
      apiRef.current = api;

      // Event listener for participant joined
      api.addEventListener('participantJoined', (participant: any) => {
        console.log('Participant joined:', participant);
        // You could trigger a notification here
      });

      // Cleanup: Stop camera/mic when leaving the component or ending call
      return () => {
        api.dispose();
      };
    }
  }, [isCallActive, selectedPatient]);

  const startCall = () => {
    if (!selectedPatient) {
      alert('Please select a patient first');
      return;
    }
    setIsCallActive(true);
  };

  const endCall = () => {
    if (apiRef.current) {
      apiRef.current.executeCommand('hangup');
    }
    setIsCallActive(false);
  };

  return (
    <div className="min-h-screen bg-gray-50 p-4">
      <div className="max-w-7xl mx-auto">
        <h1 className="text-3xl font-bold text-gray-800 mb-6 text-center">
          Doctor-Patient Video Consultation
        </h1>
        
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Video Section - Left Column (70%) */}
          <div className="lg:col-span-2">
            <div className="bg-white rounded-lg shadow-lg p-6">
              <h2 className="text-xl font-semibold mb-4">Video Call Session</h2>
              
              {/* Jitsi Video Container */}
              <div className="relative">
                {isCallActive ? (
                  <>
                    <div 
                      ref={jitsiContainerRef} 
                      className="rounded-xl overflow-hidden shadow-2xl border border-gray-800 bg-[#0A0A0A] w-full mb-6" 
                      style={{ minHeight: '700px' }}
                    />
                    
                    {/* Subtitle Overlay */}
                    <AnimatePresence>
                      {isTranslationEnabled && translatedSubtitle && (
                        <motion.div
                          initial={{ opacity: 0, y: 20 }}
                          animate={{ opacity: 1, y: 0 }}
                          exit={{ opacity: 0, y: 20 }}
                          className="absolute bottom-16 left-1/2 -translate-x-1/2 w-[90%] z-50 pointer-events-none"
                        >
                          <div className="bg-black/70 backdrop-blur-md border border-white/20 text-white rounded-2xl p-4 text-center shadow-2xl">
                             <div className="flex items-center justify-center gap-2 mb-1">
                               <Globe size={12} className="text-blue-400" />
                               <span className="text-[10px] font-bold text-blue-400 uppercase tracking-widest">{targetLanguage} Live Translation</span>
                               <div className="flex gap-0.5 ml-2">
                                 {[1,2,3,4,5].map(i => (
                                   <motion.div 
                                     key={i}
                                     animate={{ height: [4, 12, 4] }}
                                     transition={{ repeat: Infinity, duration: 0.5, delay: i * 0.1 }}
                                     className="w-1 bg-blue-400 rounded-full"
                                   />
                                 ))}
                               </div>
                             </div>
                             <p className="text-xl font-bold leading-relaxed">
                               {translatedSubtitle}
                             </p>
                             <p className="text-[11px] text-gray-400 mt-1 italic">
                               "{currentTranscription}"
                             </p>
                          </div>
                        </motion.div>
                      )}
                    </AnimatePresence>
                  </>
                ) : (
                  <div className="w-full h-[500px] bg-gray-100 border-2 border-dashed border-gray-300 rounded-xl flex flex-col items-center justify-center mb-6">
                    <User className="w-16 h-16 text-gray-400 mb-4" />
                    <p className="text-gray-500 font-medium">Select a patient and start the session to begin the call</p>
                  </div>
                )}
              </div>

              {/* Call Controls & Translation Settings */}
              <div className="flex flex-col items-center gap-6">
                <div className="flex justify-center space-x-4">
                  {!isCallActive ? (
                    <button
                      onClick={startCall}
                      disabled={!selectedPatient}
                      className="flex items-center space-x-2 bg-green-600 hover:bg-green-700 disabled:bg-gray-400 text-white px-8 py-4 rounded-2xl font-bold shadow-lg transition-all active:scale-95"
                    >
                      <Phone className="w-6 h-6" />
                      <span>Start Video Session</span>
                    </button>
                  ) : (
                    <button
                      onClick={endCall}
                      className="flex items-center space-x-2 bg-red-600 hover:bg-red-700 text-white px-8 py-4 rounded-2xl font-bold shadow-lg transition-all active:scale-95"
                    >
                      <PhoneOff className="w-6 h-6" />
                      <span>End Video Session</span>
                    </button>
                  )}
                </div>

                {isCallActive && (
                  <motion.div 
                    initial={{ opacity: 0, scale: 0.9 }}
                    animate={{ opacity: 1, scale: 1 }}
                    className="flex flex-wrap items-center justify-center gap-4 bg-slate-50 p-4 rounded-2xl border border-slate-200"
                  >
                    <div className="flex items-center gap-2 mr-4">
                      <div className={`p-2 rounded-lg ${isTranslationEnabled ? 'bg-blue-600 text-white' : 'bg-gray-200 text-gray-500'}`}>
                        {isTranslationEnabled ? <Mic size={20} /> : <MicOff size={20} />}
                      </div>
                      <div>
                        <p className="text-xs font-bold text-gray-500 uppercase tracking-wider">AI Translation</p>
                        <p className="text-sm font-black text-gray-900">{isTranslationEnabled ? 'Active' : 'Disabled'}</p>
                      </div>
                    </div>

                    <div className="h-10 w-[1px] bg-gray-200 mx-2" />

                    <div className="flex gap-2">
                       <button
                         onClick={() => setIsTranslationEnabled(!isTranslationEnabled)}
                         className={`px-4 py-2 rounded-xl text-sm font-bold transition-all ${
                           isTranslationEnabled 
                           ? 'bg-blue-600 text-white shadow-md' 
                           : 'bg-white text-gray-700 border border-gray-300 hover:bg-gray-50'
                         }`}
                       >
                         {isTranslationEnabled ? 'Stop Subtitles' : 'Enable Live Subtitles'}
                       </button>

                       {isTranslationEnabled && (
                         <div className="flex bg-white rounded-xl border border-gray-300 p-1 shadow-inner">
                            <button
                              onClick={() => setTargetLanguage('telugu')}
                              className={`px-3 py-1 rounded-lg text-xs font-black transition-all ${targetLanguage === 'telugu' ? 'bg-blue-100 text-blue-700' : 'text-gray-500'}`}
                            >
                              TELUGU
                            </button>
                            <button
                              onClick={() => setTargetLanguage('hindi')}
                              className={`px-3 py-1 rounded-lg text-xs font-black transition-all ${targetLanguage === 'hindi' ? 'bg-blue-100 text-blue-700' : 'text-gray-500'}`}
                            >
                              HINDI
                            </button>
                         </div>
                       )}
                    </div>
                  </motion.div>
                )}
              </div>
            </div>
          </div>

          {/* Patient Profile Section - Right Column (30%) */}
          <div className="lg:col-span-1">
            <div className="bg-white rounded-lg shadow-lg p-6">
              <h2 className="text-xl font-semibold mb-4 flex items-center">
                <User className="w-5 h-5 mr-2" />
                Patient Profile
              </h2>

              {/* Patient Selection */}
              <div className="mb-6">
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Select Patient:
                </label>
                <select
                  value={selectedPatient?.id || ''}
                  onChange={(e) => {
                    const patientId = parseInt(e.target.value);
                    const patient = patientsData.find(p => p.id === patientId);
                    setSelectedPatient(patient || null);
                  }}
                  className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  disabled={isCallActive}
                >
                  <option value="">Choose a patient...</option>
                  {patientsData.map((patient) => (
                    <option key={patient.id} value={patient.id}>
                      {patient.name} - {patient.condition}
                    </option>
                  ))}
                </select>
              </div>

              {/* Patient Details */}
              {selectedPatient ? (
                <div className="space-y-4">
                  <div className="bg-blue-50 p-4 rounded-lg">
                    <h3 className="font-semibold text-lg text-gray-800 mb-2">
                      {selectedPatient.name}
                    </h3>
                    <div className="space-y-2 text-sm">
                      <div className="flex items-center">
                        <Calendar className="w-4 h-4 mr-2 text-gray-600" />
                        <span className="text-gray-600">Age:</span>
                        <span className="ml-2 font-medium">{selectedPatient.age} years</span>
                      </div>
                      <div className="flex items-center">
                        <User className="w-4 h-4 mr-2 text-gray-600" />
                        <span className="text-gray-600">Gender:</span>
                        <span className="ml-2 font-medium">{selectedPatient.gender}</span>
                      </div>
                    </div>
                  </div>

                  <div className="bg-red-50 p-4 rounded-lg">
                    <h4 className="font-semibold text-gray-800 mb-2 flex items-center">
                      <Heart className="w-4 h-4 mr-2 text-red-600" />
                      Condition
                    </h4>
                    <p className="text-sm text-gray-700">{selectedPatient.condition}</p>
                    <p className="text-sm text-gray-600 mt-1">{selectedPatient.symptoms}</p>
                  </div>

                  <div className="bg-green-50 p-4 rounded-lg">
                    <h4 className="font-semibold text-gray-800 mb-2 flex items-center">
                      <Pill className="w-4 h-4 mr-2 text-green-600" />
                      Medications
                    </h4>
                    <p className="text-sm text-gray-700">{selectedPatient.medications}</p>
                  </div>

                  <div className="bg-gray-50 p-4 rounded-lg">
                    <h4 className="font-semibold text-gray-800 mb-2">Contact Info</h4>
                    <div className="space-y-1 text-sm">
                      <p><span className="text-gray-600">Phone:</span> {selectedPatient.phone}</p>
                      <p><span className="text-gray-600">Email:</span> {selectedPatient.email}</p>
                      <p><span className="text-gray-600">Last Visit:</span> {selectedPatient.lastVisit}</p>
                    </div>
                  </div>
                </div>
              ) : (
                <div className="text-center text-gray-500 py-8">
                  <User className="w-12 h-12 mx-auto mb-4 text-gray-400" />
                  <p>Select a patient to view their profile</p>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default VideoSession;
