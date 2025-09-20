import React from 'react';
import { Link } from 'react-router-dom';
import { Heart, ArrowRight, Activity, Brain, Shield } from 'lucide-react';

export default function HeroSection() {
  return (
    <section className="relative min-h-screen flex items-center justify-center bg-white overflow-hidden">
      {/* Clean Background Elements */}
      <div className="absolute inset-0">
        <div className="absolute top-20 left-10 w-96 h-96 bg-blue-50 rounded-full opacity-60"></div>
        <div className="absolute bottom-20 right-10 w-96 h-96 bg-red-50 rounded-full opacity-60"></div>
      </div>

      <div className="relative z-10 container mx-auto px-4 sm:px-6 lg:px-8 pt-20">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-16 items-center">
          {/* Left Content */}
          <div className="text-left">
            <h1 className="text-5xl md:text-6xl font-bold text-black mb-8 leading-tight">
              Your Personal
              <span className="block text-blue-600">Health Companion</span>
            </h1>

            <p className="text-xl text-gray-600 mb-10 leading-relaxed">
              Get instant health insights, track your wellness journey, and make informed decisions about your health with our AI-powered platform.
            </p>

            <Link
              to="/health"
              className="inline-flex items-center gap-3 bg-blue-600 text-white px-10 py-5 rounded-2xl font-semibold text-lg shadow-lg hover:shadow-xl transition-all duration-300 transform hover:scale-105"
            >
              <Heart size={24} />
              Start Your Health Journey
              <ArrowRight size={20} className="group-hover:translate-x-1 transition-transform duration-300" />
            </Link>
          </div>

          {/* Right - Health Companion Sketch */}
            <div className="relative">
            <div className="bg-gradient-to-br from-blue-50 to-red-50 rounded-3xl p-10 shadow-2xl border border-gray-100">
              {/* Main Health Icon */}
              <div className="relative mx-auto w-72 h-72 mb-10">
                {/* Central Heart */}
                <div className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2">
                  <div className="w-40 h-40 bg-gradient-to-br from-red-500 to-red-600 rounded-full flex items-center justify-center shadow-xl">
                    <Heart size={56} className="text-white" />
                  </div>
                </div>

                {/* Orbiting Health Elements */}
                <div className="absolute top-6 left-1/2 transform -translate-x-1/2">
                  <div className="w-16 h-16 bg-blue-500 rounded-full flex items-center justify-center shadow-lg">
                    <Brain size={24} className="text-white" />
                  </div>
                </div>

                <div className="absolute bottom-6 left-1/2 transform -translate-x-1/2">
                  <div className="w-16 h-16 bg-green-500 rounded-full flex items-center justify-center shadow-lg">
                    <Activity size={24} className="text-white" />
                  </div>
                </div>

                <div className="absolute left-6 top-1/2 transform -translate-y-1/2">
                  <div className="w-16 h-16 bg-purple-500 rounded-full flex items-center justify-center shadow-lg">
                    <Shield size={24} className="text-white" />
                  </div>
                </div>

                <div className="absolute right-6 top-1/2 transform -translate-y-1/2">
                  <div className="w-16 h-16 bg-orange-500 rounded-full flex items-center justify-center shadow-lg">
                    <Heart size={24} className="text-white" />
                  </div>
                </div>

                {/* Connection Lines */}
                <svg className="absolute inset-0 w-full h-full" viewBox="0 0 288 288">
                  <circle cx="144" cy="144" r="136" fill="none" stroke="url(#gradient)" strokeWidth="2" strokeDasharray="5,5" opacity="0.3"/>
                  <defs>
                    <linearGradient id="gradient" x1="0%" y1="0%" x2="100%" y2="100%">
                      <stop offset="0%" stopColor="#3B82F6"/>
                      <stop offset="100%" stopColor="#EF4444"/>
                    </linearGradient>
                  </defs>
                </svg>
              </div>

              {/* Health Stats */}
              <div className="grid grid-cols-3 gap-6">
                <div className="text-center p-6 bg-white rounded-2xl shadow-sm">
                  <div className="text-3xl font-bold text-blue-600">24/7</div>
                  <div className="text-sm text-gray-600">Available</div>
                </div>
                <div className="text-center p-6 bg-white rounded-2xl shadow-sm">
                  <div className="text-3xl font-bold text-red-600">AI</div>
                  <div className="text-sm text-gray-600">Powered</div>
                </div>
                <div className="text-center p-6 bg-white rounded-2xl shadow-sm">
                  <div className="text-3xl font-bold text-green-600">Safe</div>
                  <div className="text-sm text-gray-600">Secure</div>
                </div>
              </div>
            </div>
          </div>
          </div>

        {/* Bottom Features */}
        <div className="mt-24 grid grid-cols-1 md:grid-cols-3 gap-10 max-w-5xl mx-auto">
            <div className="text-center">
            <div className="w-20 h-20 bg-blue-100 rounded-2xl flex items-center justify-center mx-auto mb-6">
              <Brain className="text-blue-600" size={36} />
            </div>
            <h3 className="text-2xl font-semibold text-black mb-3">Smart Analysis</h3>
            <p className="text-gray-600">AI-powered insights for better health decisions</p>
          </div>

            <div className="text-center">
            <div className="w-20 h-20 bg-red-100 rounded-2xl flex items-center justify-center mx-auto mb-6">
              <Heart className="text-red-600" size={36} />
            </div>
            <h3 className="text-2xl font-semibold text-black mb-3">Health Tracking</h3>
            <p className="text-gray-600">Monitor your wellness journey over time</p>
          </div>

            <div className="text-center">
            <div className="w-20 h-20 bg-green-100 rounded-2xl flex items-center justify-center mx-auto mb-6">
              <Shield className="text-green-600" size={36} />
            </div>
            <h3 className="text-2xl font-semibold text-black mb-3">Privacy First</h3>
            <p className="text-gray-600">Your health data is secure and private</p>
          </div>
        </div>
      </div>
    </section>
  );
}