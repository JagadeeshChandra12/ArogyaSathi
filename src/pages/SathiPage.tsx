import React, { useState, useEffect, useRef } from 'react';
import { Link } from 'react-router-dom';
import { 
  ArrowLeft, 
  Mic, 
  MicOff, 
  Send, 
  Heart, 
  Brain, 
  MessageCircle,
  User,
  Bot,
  Volume2,
  VolumeX,
  Camera,
  Globe
} from 'lucide-react';
import { medicalApiService } from '../services/medicalApi';

interface Message {
  id: string;
  text: string;
  sender: 'user' | 'bot';
  timestamp: Date;
  type: 'text' | 'image' | 'voice';
  mediaUrl?: string;
  isTelugu?: boolean;
  isHindi?: boolean;
}

interface UserProfile {
  age?: number;
  weight?: number;
  bmi?: number;
  name?: string;
}

export default function SathiPage() {
  const [messages, setMessages] = useState<Message[]>([]);
  const [inputText, setInputText] = useState('');
  const [isListening, setIsListening] = useState(false);
  const [isSpeaking, setIsSpeaking] = useState(false);
  const [voiceEnabled, setVoiceEnabled] = useState(true);
  const [selectedVoice, setSelectedVoice] = useState<SpeechSynthesisVoice | null>(null);
  const [availableVoices, setAvailableVoices] = useState<SpeechSynthesisVoice[]>([]);
  const [userProfile, setUserProfile] = useState<UserProfile>({});
  const conversationStage = 'chat' as const;
  const [isLoading, setIsLoading] = useState(false);
  const [, setSelectedImage] = useState<File | null>(null);
  const [, setImagePreview] = useState<string>('');
  const [selectedLanguage, setSelectedLanguage] = useState<'english' | 'telugu' | 'hindi'>('telugu');

  const chatContainerRef = useRef<HTMLDivElement>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const recognitionRef = useRef<any>(null);
  const currentUtteranceRef = useRef<SpeechSynthesisUtterance | null>(null);
  const voiceQueueRef = useRef<string[]>([]);
  const isProcessingQueueRef = useRef(false);

  // Initialize speech recognition and voices
  useEffect(() => {
    if ('webkitSpeechRecognition' in window || 'SpeechRecognition' in window) {
      const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
      recognitionRef.current = new SpeechRecognition();
      recognitionRef.current.continuous = false;
      recognitionRef.current.interimResults = false;
      recognitionRef.current.lang = selectedLanguage === 'telugu' ? 'te-IN' : selectedLanguage === 'hindi' ? 'hi-IN' : 'en-US';

      recognitionRef.current.onresult = (event: any) => {
        const transcript = event.results[0][0].transcript;
        handleVoiceInput(transcript);
      };

      recognitionRef.current.onerror = (event: any) => {
        console.error('Speech recognition error:', event.error);
        setIsListening(false);
      };

      recognitionRef.current.onend = () => {
        setIsListening(false);
      };
    }

    // Initialize speech synthesis voices
    const loadVoices = () => {
      if ('speechSynthesis' in window) {
        const voices = speechSynthesis.getVoices();
        setAvailableVoices(voices);
        
        // Try to find Microsoft Sruthi Telugu first, then other Telugu voices, then Hindi, then English
        const msSruthiTelugu = voices.find(voice => 
          voice.name.includes('Microsoft Sruthi') && voice.lang.includes('te')
        );
        const teluguVoice = voices.find(voice => voice.lang.includes('te'));
        const hindiVoice = voices.find(voice => voice.lang.includes('hi'));
        const englishVoice = voices.find(voice => voice.lang.includes('en'));
        
        if (msSruthiTelugu) {
          setSelectedVoice(msSruthiTelugu);
          console.log('Using Microsoft Sruthi Telugu voice');
        } else if (teluguVoice) {
          setSelectedVoice(teluguVoice);
          console.log('Using Telugu voice:', teluguVoice.name);
        } else if (hindiVoice) {
          setSelectedVoice(hindiVoice);
          console.log('Using Hindi voice:', hindiVoice.name);
        } else if (englishVoice) {
          setSelectedVoice(englishVoice);
          console.log('Using English voice:', englishVoice.name);
        } else if (voices.length > 0) {
          setSelectedVoice(voices[0]);
          console.log('Using default voice:', voices[0].name);
        }
      }
    };

    // Load voices immediately if available
    loadVoices();
    
    // Also listen for voices to be loaded
    if ('speechSynthesis' in window) {
      speechSynthesis.addEventListener('voiceschanged', loadVoices);
    }

    // Cleanup function
    return () => {
      if (currentUtteranceRef.current) {
        speechSynthesis.cancel();
      }
      if ('speechSynthesis' in window) {
        speechSynthesis.removeEventListener('voiceschanged', loadVoices);
      }
    };
  }, [selectedLanguage]);

  // Chat scrolling logic and other effects
  const scrollToBottom = () => {
    chatContainerRef.current?.scrollTo({
      top: chatContainerRef.current.scrollHeight,
      behavior: 'smooth'
    });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  // Opening hint when language changes (not a forced onboarding script)
  useEffect(() => {
    setMessages([]);
    setTimeout(() => {
      const welcomeMessage =
        selectedLanguage === 'hindi'
          ? 'नमस्ते! मैं साथी हूँ। आज आपके स्वास्थ्य में क्या समस्या महसूस हो रही है?'
          : selectedLanguage === 'telugu'
            ? 'నమస్కారం! నేను సాతిని. ఈ రోజు మీ ఆరోగ్యానికి సంబంధించి ఏ విషయం మిమ్మల్ని ఇబ్బంది పెడుతోంది?'
            : "Hi — I'm Sathi. What health concern or symptom can I help you with today?";
      addBotMessage(welcomeMessage, selectedLanguage === 'telugu', selectedLanguage === 'hindi');
    }, 400);
  }, [selectedLanguage]);

  const addBotMessage = (text: string, isTelugu = false, isHindi = false) => {
    const newMessage: Message = {
      id: `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
      text,
      sender: 'bot',
      timestamp: new Date(),
      type: 'text',
      isTelugu,
      isHindi
    };
    setMessages(prev => [...prev, newMessage]);
  };

  const addUserMessage = (text: string, type: 'text' | 'image' | 'voice' = 'text', mediaUrl?: string) => {
    const newMessage: Message = {
      id: `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
      text,
      sender: 'user',
      timestamp: new Date(),
      type,
      mediaUrl
    };
    setMessages(prev => [...prev, newMessage]);
  };

  const handleVoiceInput = async (transcript: string) => {
    addUserMessage(transcript, 'voice');
    setInputText(transcript);
    await processUserInput(transcript);
  };

  const startListening = () => {
    if (recognitionRef.current) {
      try {
        recognitionRef.current.start();
        setIsListening(true);
      } catch (error) {
        console.error('Error starting speech recognition:', error);
        setIsListening(false);
      }
    }
  };

  const stopListening = () => {
    if (recognitionRef.current) {
      try {
        recognitionRef.current.stop();
        setIsListening(false);
      } catch (error) {
        console.error('Error stopping speech recognition:', error);
      }
    }
  };

  const speakText = (text: string) => {
    if ('speechSynthesis' in window && voiceEnabled) {
      // Add to queue
      voiceQueueRef.current.push(text);
      
      // Process queue if not already processing
      if (!isProcessingQueueRef.current) {
        processVoiceQueue();
      }
    }
  };

  const processVoiceQueue = () => {
    if (voiceQueueRef.current.length === 0 || !voiceEnabled) {
      isProcessingQueueRef.current = false;
      return;
    }

    isProcessingQueueRef.current = true;
    
    // Cancel any current speech
    speechSynthesis.cancel();
    
    const text = voiceQueueRef.current.shift();
    if (!text) {
      isProcessingQueueRef.current = false;
      return;
    }

    setIsSpeaking(true);
    const utterance = new SpeechSynthesisUtterance(text);
    
    // Set voice if available
    if (selectedVoice) {
      utterance.voice = selectedVoice;
    }
    
    // Set language based on voice or default
    utterance.lang = selectedVoice?.lang || (selectedLanguage === 'telugu' ? 'te-IN' : selectedLanguage === 'hindi' ? 'hi-IN' : 'en-US');
    utterance.rate = 0.9; // Slightly faster for better naturalness
    utterance.pitch = 1.1; // Slightly higher pitch for clarity
    utterance.volume = 1.0; // Full volume
    
    // Store reference to current utterance
    currentUtteranceRef.current = utterance;
    
    utterance.onstart = () => {
      setIsSpeaking(true);
      console.log('Bot started speaking:', text);
    };
    
    utterance.onend = () => {
      setIsSpeaking(false);
      currentUtteranceRef.current = null;
      console.log('Bot finished speaking');
      
      // AUTO-LISTEN: If voice was enabled and it's a diagnostic flow, start listening for the answer
      if (voiceEnabled) {
        setTimeout(() => {
          startListening();
        }, 500);
      }
      
      // Process next item in queue
      setTimeout(() => {
        processVoiceQueue();
      }, 300);
    };
    
    utterance.onerror = (event) => {
      console.error('Speech synthesis error:', event.error);
      setIsSpeaking(false);
      currentUtteranceRef.current = null;
      
      // Process next item in queue even on error
      setTimeout(() => {
        processVoiceQueue();
      }, 300);
    };
    
    // Speak immediately
    speechSynthesis.speak(utterance);
  };

  const testVoice = () => {
    const testMessage = 'నమస్కారం! నేను మీ ఆరోగ్య సహాయకుడిని. మీకు ఎలా సహాయం చేయగలను?';
    console.log('Testing voice with message:', testMessage);
    console.log('Voice enabled:', voiceEnabled);
    console.log('Selected voice:', selectedVoice);
    console.log('Available voices:', availableVoices);
    speakText(testMessage);
  };

  const toggleVoice = () => {
    if (voiceEnabled) {
      // Stop current speech and clear queue
      speechSynthesis.cancel();
      voiceQueueRef.current = [];
      setIsSpeaking(false);
      isProcessingQueueRef.current = false;
    }
    setVoiceEnabled(!voiceEnabled);
  };

  const clearVoiceQueue = () => {
    speechSynthesis.cancel();
    voiceQueueRef.current = [];
    setIsSpeaking(false);
    isProcessingQueueRef.current = false;
  };

  const processUserInput = async (input: string) => {
    if (!input.trim()) return;
    
    setIsLoading(true);
    
    try {
      const response = await medicalApiService.processMedicalChat({
        message: input,
        userProfile,
        conversationStage,
        language: selectedLanguage,
        history: messages.slice(-10).map(m => ({
          role: m.sender === 'user' ? 'user' : 'assistant',
          content: m.text
        }))
      });
      
      // Add bot response
      addBotMessage(response.response, selectedLanguage === 'telugu', selectedLanguage === 'hindi');
      
      // Speak the response if voice is enabled
      if (voiceEnabled) {
        speakText(response.response);
      }

      // Update user profile if age/weight mentioned
      const ageMatch = input.match(/(\d+)\s*(వయస్సు|సంవత్సరాలు|years?)/i);
      const weightMatch = input.match(/(\d+)\s*(కిలోలు|kg|kilos?)/i);
      
      if (ageMatch) {
        setUserProfile(prev => ({ ...prev, age: parseInt(ageMatch[1]) }));
      }
      if (weightMatch) {
        setUserProfile(prev => ({ ...prev, weight: parseInt(weightMatch[1]) }));
      }
      
    } catch (error) {
      console.error('Error processing user input:', error);
      const errorMessage = selectedLanguage === 'hindi'
        ? 'क्षमा करें, कोई त्रुटि उत्पन्न हुई। कृपया पुनः प्रयास करें।'
        : selectedLanguage === 'telugu'
          ? 'క్షమించండి, సమస్య జరిగింది. దయచేసి మళ్లీ ప్రయత్నించండి.'
          : 'Sorry, an error occurred. Please try again.';
      addBotMessage(errorMessage, selectedLanguage === 'telugu', selectedLanguage === 'hindi');
    } finally {
      setIsLoading(false);
    }
  };

  const handleSendMessage = async () => {
    if (inputText.trim()) {
      addUserMessage(inputText);
      await processUserInput(inputText);
      setInputText('');
    }
  };

  const handleImageUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      setSelectedImage(file);
      const reader = new FileReader();
      reader.onload = (e) => {
        setImagePreview(e.target?.result as string);
        addUserMessage('చిత్రం పంపబడింది', 'image', e.target?.result as string);
        // Process image for medical analysis
        processImageAnalysis(file);
      };
      reader.readAsDataURL(file);
    }
  };

  const processImageAnalysis = async (file: File) => {
    setIsLoading(true);
    try {
      // Use the medical API service for image analysis
      const response = await medicalApiService.analyzeImage({
        image: file,
        symptoms: [],
        language: selectedLanguage
      });

      setTimeout(() => {
        addBotMessage(`చిత్రం విశ్లేషణ: ${response.analysis}`, true);
        
        // Add recommendations if available
        if (response.recommendations?.length) {
          setTimeout(() => {
            addBotMessage(`సూచనలు: ${response.recommendations!.join(', ')}`, true);
          }, 1000);
        }
      }, 2000);

    } catch (error) {
      setTimeout(() => {
        addBotMessage('చిత్రం విశ్లేషణలో సమస్య జరిగింది. మళ్లీ ప్రయత్నించండి.', true);
      }, 2000);
    } finally {
      setIsLoading(false);
    }
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSendMessage();
    }
  };

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
              My <span className="text-blue-600">Sathi</span>
            </h1>
            <p className="text-lg text-gray-600">
              Your AI health companion - Talk in Telugu, get instant medical guidance
            </p>
          </div>
        </div>

        <div className="max-w-6xl mx-auto">
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
            {/* Chat Interface */}
            <div className="lg:col-span-2">
              <div className="bg-white rounded-3xl shadow-xl border border-gray-200 h-[600px] flex flex-col">
                {/* Chat Header */}
                <div className="p-6 border-b border-gray-200 bg-gradient-to-r from-blue-600 to-red-600 rounded-t-3xl">
                  <div className="flex items-center gap-4">
                    <div className="w-12 h-12 bg-white/20 rounded-full flex items-center justify-center">
                      <Bot className="text-white" size={24} />
                    </div>
                    <div>
                      <h3 className="text-white font-semibold text-lg">Dr. Sathi</h3>
                      <p className="text-white/80 text-sm">AI Health Assistant</p>
                    </div>
                    <div className="ml-auto flex items-center gap-2">
                      {/* Language Selector */}
                      <div className="relative">
                        <select
                          value={selectedLanguage}
                          onChange={(e) => setSelectedLanguage(e.target.value as 'english' | 'telugu' | 'hindi')}
                          className="bg-white/20 text-white border border-white/30 rounded-lg px-3 py-1 text-sm focus:outline-none focus:ring-2 focus:ring-white/50 appearance-none pr-8"
                        >
                          <option value="english">English</option>
                          <option value="telugu">తెలుగు</option>
                          <option value="hindi">हिंदी</option>
                        </select>
                        <Globe className="absolute right-2 top-1/2 transform -translate-y-1/2 text-white/80" size={14} />
                      </div>
                      
                      <button
                        onClick={toggleVoice}
                        className={`p-2 rounded-full transition-all duration-300 ${
                          voiceEnabled 
                            ? 'bg-white/20 text-white' 
                            : 'bg-white/10 text-white/60'
                        }`}
                        title={voiceEnabled ? 'Disable Voice' : 'Enable Voice'}
                      >
                        {voiceEnabled ? <Volume2 size={18} /> : <VolumeX size={18} />}
                      </button>
                      {isSpeaking && (
                        <div className="flex items-center gap-1">
                          <div className="w-2 h-2 bg-white rounded-full animate-pulse"></div>
                          <div className="w-2 h-2 bg-white rounded-full animate-pulse" style={{ animationDelay: '0.2s' }}></div>
                          <div className="w-2 h-2 bg-white rounded-full animate-pulse" style={{ animationDelay: '0.4s' }}></div>
                        </div>
                      )}
                      {voiceQueueRef.current.length > 0 && !isSpeaking && (
                        <div className="text-white/80 text-xs bg-white/10 px-2 py-1 rounded-full">
                          {voiceQueueRef.current.length} in queue
                        </div>
                      )}
                    </div>
                  </div>
                </div>

                {/* Messages */}
                <div ref={chatContainerRef} className="flex-1 overflow-y-auto p-6 space-y-4">
                  {messages.map((message) => (
                    <div
                      key={message.id}
                      className={`flex ${message.sender === 'user' ? 'justify-end' : 'justify-start'}`}
                    >
                      <div className={`max-w-xs lg:max-w-md ${
                        message.sender === 'user' 
                          ? 'bg-blue-600 text-white' 
                          : 'bg-gray-100 text-gray-800'
                      } rounded-2xl p-4 shadow-sm`}>
                        {message.type === 'image' && message.mediaUrl && (
                          <img 
                            src={message.mediaUrl} 
                            alt="User uploaded" 
                            className="w-full h-32 object-cover rounded-lg mb-2"
                          />
                        )}
                        <p className={`${message.isTelugu ? 'font-telugu' : ''}`}>
                          {message.text}
                        </p>
                        <p className="text-xs opacity-70 mt-2">
                          {message.timestamp.toLocaleTimeString()}
                        </p>
                      </div>
                    </div>
                  ))}
                  
                  {isLoading && (
                    <div className="flex justify-start">
                      <div className="bg-gray-100 rounded-2xl p-4">
                        <div className="flex space-x-1">
                          <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce"></div>
                          <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '0.1s' }}></div>
                          <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '0.2s' }}></div>
                        </div>
                      </div>
                    </div>
                  )}
                  
                  <div ref={messagesEndRef} />
                </div>

                {/* Input Area */}
                <div className="p-6 border-t border-gray-200">
                  <div className="flex items-center gap-3">
                    <button
                      onClick={() => fileInputRef.current?.click()}
                      className="p-3 text-gray-500 hover:text-blue-600 transition-colors duration-300"
                      title="Upload Image"
                    >
                      <Camera size={20} />
                    </button>
                    
                    <div className="flex-1 relative">
                      <input
                        type="text"
                        value={inputText}
                        onChange={(e) => setInputText(e.target.value)}
                        onKeyPress={handleKeyPress}
                        placeholder={selectedLanguage === 'hindi' 
                          ? "अपना संदेश टाइप करें या हिंदी में बोलें..." 
                          : selectedLanguage === 'telugu' 
                            ? "మీ సందేశాన్ని టైప్ చేయండి లేదా తెలుగులో మాట్లాడండి..."
                            : "Type your message or speak in English..."
                        }
                        className="w-full px-4 py-3 border border-gray-300 rounded-2xl focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                      />
                    </div>
                    
                    <button
                      onClick={isListening ? stopListening : startListening}
                      className={`p-3 rounded-full transition-all duration-300 ${
                        isListening 
                          ? 'bg-red-500 text-white animate-pulse' 
                          : 'bg-blue-600 text-white hover:bg-blue-700'
                      }`}
                      title={isListening ? 'Stop Listening' : 'Start Voice Input'}
                    >
                      {isListening ? <MicOff size={20} /> : <Mic size={20} />}
                    </button>
                    
                    <button
                      onClick={handleSendMessage}
                      disabled={!inputText.trim()}
                      className="p-3 bg-blue-600 text-white rounded-full hover:bg-blue-700 transition-colors duration-300 disabled:opacity-50 disabled:cursor-not-allowed"
                      title="Send Message"
                    >
                      <Send size={20} />
                    </button>
                  </div>
                  
                  <input
                    ref={fileInputRef}
                    type="file"
                    accept="image/*"
                    onChange={handleImageUpload}
                    className="hidden"
                  />
                </div>
              </div>
            </div>

            {/* Doctor Friend Visualization */}
            <div className="lg:col-span-1">
              <div className="bg-white rounded-3xl shadow-xl border border-gray-200 p-8 h-[600px] flex flex-col items-center justify-center">
                {/* Animated Doctor Friend */}
                <div className="relative mb-8">
                  {/* Main Doctor Figure */}
                  <div className="w-48 h-48 bg-gradient-to-br from-blue-500 to-red-500 rounded-full flex items-center justify-center shadow-2xl animate-pulse-slow">
                    <div className="w-40 h-40 bg-white rounded-full flex items-center justify-center">
                      <Heart size={48} className="text-blue-600" />
                    </div>
                  </div>
                  
                  {/* Orbiting Elements */}
                  <div className="absolute -top-4 -left-4 w-12 h-12 bg-green-500 rounded-full flex items-center justify-center animate-float">
                    <Brain size={20} className="text-white" />
                  </div>
                  <div className="absolute -top-4 -right-4 w-12 h-12 bg-purple-500 rounded-full flex items-center justify-center animate-float" style={{ animationDelay: '1s' }}>
                    <MessageCircle size={20} className="text-white" />
                  </div>
                  <div className="absolute -bottom-4 left-1/2 transform -translate-x-1/2 w-12 h-12 bg-orange-500 rounded-full flex items-center justify-center animate-float" style={{ animationDelay: '2s' }}>
                    <User size={20} className="text-white" />
                  </div>
                </div>

                {/* Status */}
                <div className="text-center mb-6">
                  <h3 className="text-2xl font-bold text-gray-800 mb-2">Dr. Sathi</h3>
                  <p className="text-gray-600 mb-4">Your AI Health Friend</p>
                  <div className="flex items-center justify-center gap-2">
                    <div className="w-3 h-3 bg-green-500 rounded-full animate-pulse"></div>
                    <span className="text-sm text-gray-600">Online & Ready</span>
                  </div>
                </div>

                {/* Quick Actions */}
                <div className="space-y-3 w-full">
                  {/* Voice Input Button */}
                  <button 
                    onClick={isListening ? stopListening : startListening}
                    className={`w-full px-4 py-3 rounded-xl font-medium transition-all duration-300 ${
                      isListening 
                        ? 'bg-red-500 text-white shadow-lg animate-pulse' 
                        : 'bg-gradient-to-r from-blue-500 to-indigo-500 text-white hover:from-blue-600 hover:to-indigo-600 shadow-md hover:shadow-lg'
                    }`}
                  >
                    <div className="flex items-center justify-center gap-2">
                      {isListening ? <MicOff size={18} /> : <Mic size={18} />}
                      {isListening 
                        ? (selectedLanguage === 'hindi' ? 'आवाज़ बंद करें' : selectedLanguage === 'telugu' ? 'వాయిస్ ఆపండి' : 'Stop Voice Input')
                        : (selectedLanguage === 'hindi' ? 'आवाज़ शुरू करें' : selectedLanguage === 'telugu' ? 'వాయిస్ ప్రారంభించండి' : 'Start Voice Input')
                      }
                    </div>
                  </button>
                  
                  {/* Voice Toggle Button */}
                  <button 
                    onClick={toggleVoice}
                    className={`w-full px-4 py-3 rounded-xl font-medium transition-all duration-300 ${
                      voiceEnabled 
                        ? 'bg-gradient-to-r from-green-500 to-emerald-500 text-white shadow-md hover:shadow-lg' 
                        : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                    }`}
                  >
                    <div className="flex items-center justify-center gap-2">
                      {voiceEnabled ? <Volume2 size={18} /> : <VolumeX size={18} />}
                      {voiceEnabled ? 'Voice: ON' : 'Voice: OFF'}
                    </div>
                  </button>
                  
                  {/* Voice Status Indicator */}
                  {voiceEnabled && selectedVoice && (
                    <div className="bg-green-50 border border-green-200 rounded-lg p-3">
                      <div className="flex items-center gap-2 text-green-700">
                        <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse"></div>
                        <span className="text-sm font-medium">Voice Active</span>
                      </div>
                      <div className="text-xs text-green-600 mt-1">
                        {selectedVoice.name.includes('Microsoft Sruthi') ? '🎤 ' : ''}{selectedVoice.name}
                      </div>
                      <button 
                        onClick={testVoice}
                        className="mt-2 w-full bg-green-100 text-green-700 px-2 py-1 rounded text-xs font-medium hover:bg-green-200 transition-colors duration-300"
                      >
                        🎤 Test Voice
                      </button>
                    </div>
                  )}
                  
                  {/* Voice Settings Collapsible */}
                  {voiceEnabled && (
                    <details className="bg-gradient-to-br from-blue-50 to-indigo-50 rounded-xl border border-blue-100">
                      <summary className="p-3 cursor-pointer text-blue-800 font-medium flex items-center gap-2 hover:bg-blue-100 rounded-t-xl">
                        <Volume2 size={16} />
                        Voice Settings
                      </summary>
                      <div className="p-3 border-t border-blue-100">
                        <div className="mb-3">
                          <label className="block text-xs text-blue-600 mb-1 font-medium">Change Voice:</label>
                          <select
                            value={selectedVoice?.name || ''}
                            onChange={(e) => {
                              const voice = availableVoices.find(v => v.name === e.target.value);
                              setSelectedVoice(voice || null);
                            }}
                            className="w-full px-3 py-2 border border-blue-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white"
                          >
                            {availableVoices.map((voice) => (
                              <option key={voice.name} value={voice.name}>
                                {voice.name.includes('Microsoft Sruthi') ? '🎤 ' : ''}{voice.name} ({voice.lang})
                              </option>
                            ))}
                          </select>
                        </div>
                      </div>
                    </details>
                  )}
                  
                  {/* Voice Queue Status */}
                  {voiceQueueRef.current.length > 0 && (
                    <div className="bg-orange-50 border border-orange-200 rounded-lg p-3">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2 text-orange-700">
                          <div className="w-2 h-2 bg-orange-500 rounded-full animate-pulse"></div>
                          <span className="text-sm font-medium">
                            {voiceQueueRef.current.length} message{voiceQueueRef.current.length > 1 ? 's' : ''} in queue
                          </span>
                        </div>
                        <button 
                          onClick={clearVoiceQueue}
                          className="text-orange-600 hover:text-orange-800 text-xs underline"
                        >
                          Clear
                        </button>
                      </div>
                    </div>
                  )}
                  
                  {/* Other Action Buttons */}
                  <button 
                    onClick={() => fileInputRef.current?.click()}
                    className="w-full bg-gradient-to-r from-red-500 to-pink-500 text-white px-4 py-3 rounded-xl font-medium hover:from-red-600 hover:to-pink-600 transition-all duration-300 shadow-md hover:shadow-lg"
                  >
                    <div className="flex items-center justify-center gap-2">
                      <Camera size={18} />
                      Upload Image
                    </div>
                  </button>
                  
                  <button className="w-full bg-gradient-to-r from-green-500 to-emerald-500 text-white px-4 py-3 rounded-xl font-medium hover:from-green-600 hover:to-emerald-600 transition-all duration-300 shadow-md hover:shadow-lg">
                    <div className="flex items-center justify-center gap-2">
                      <Heart size={18} />
                      Health Check
                    </div>
                  </button>
                </div>

                {/* Language Indicator */}
                <div className="mt-6 text-center">
                  <div className="inline-flex items-center gap-2 bg-orange-100 text-orange-800 px-3 py-1 rounded-full text-sm">
                    <span>{selectedLanguage === 'english' ? '🇺🇸' : '🇮🇳'}</span>
                    <span>{selectedLanguage === 'hindi' ? 'हिंदी' : selectedLanguage === 'telugu' ? 'తెలుగు' : 'English'}</span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
} 