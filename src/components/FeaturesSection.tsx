import React from 'react';
import { Heart, Brain, Shield, Users, Clock, Zap, Activity } from 'lucide-react';

const features = [
  {
    icon: Brain,
    title: "Smart Symptom Analysis",
    description: "Our AI analyzes your symptoms and provides personalized insights about potential causes and when to seek medical attention.",
    color: "blue",
    bgColor: "bg-blue-50",
    iconColor: "text-blue-600"
  },
  {
    icon: Heart,
    title: "Health Journey Tracking",
    description: "Monitor your health patterns over time with detailed analytics and visual representations of your wellness journey.",
    color: "red",
    bgColor: "bg-red-50",
    iconColor: "text-red-600"
  },
  {
    icon: Shield,
    title: "Privacy & Security",
    description: "Your health data is encrypted and secure. We follow strict privacy guidelines to protect your personal information.",
    color: "blue",
    bgColor: "bg-blue-50",
    iconColor: "text-blue-600"
  },
  {
    icon: Users,
    title: "Expert Consultation",
    description: "Connect with healthcare professionals when you need guidance. Get expert advice from qualified medical professionals.",
    color: "red",
    bgColor: "bg-red-50",
    iconColor: "text-red-600"
  },
  {
    icon: Clock,
    title: "24/7 Availability",
    description: "Access your health information and get insights anytime, anywhere. We're always here when you need us.",
    color: "blue",
    bgColor: "bg-blue-50",
    iconColor: "text-blue-600"
  },
  {
    icon: Zap,
    title: "Instant Insights",
    description: "Get immediate health insights and recommendations. No waiting, no delays - just instant, actionable information.",
    color: "red",
    bgColor: "bg-red-50",
    iconColor: "text-red-600"
  }
];

export default function FeaturesSection() {
  return (
    <section className="py-20 bg-white">
      <div className="container mx-auto px-4 sm:px-6 lg:px-8">
        {/* Section Header */}
        <div className="text-center mb-16">
          <div className="inline-flex items-center gap-2 bg-blue-50 text-blue-600 px-4 py-2 rounded-full text-sm font-semibold mb-6">
            <Activity size={16} />
            Powerful Features
          </div>
          <h2 className="text-4xl md:text-5xl font-bold text-black mb-6">
            Everything You Need for
            <span className="block text-blue-600">Better Health</span>
          </h2>
          <p className="text-xl text-gray-600 max-w-3xl mx-auto">
            Our comprehensive platform provides all the tools you need to take control of your health and make informed decisions.
          </p>
        </div>

        {/* Features Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8 max-w-7xl mx-auto">
          {features.map((feature, index) => (
            <div
              key={index}
              className="group bg-white rounded-3xl p-8 shadow-lg border border-gray-100 hover:shadow-xl transition-all duration-500 transform hover:-translate-y-2"
            >
              {/* Icon */}
              <div className={`w-16 h-16 ${feature.bgColor} rounded-2xl flex items-center justify-center mb-6 group-hover:scale-110 transition-transform duration-300`}>
                <feature.icon className={feature.iconColor} size={32} />
              </div>
              
              {/* Content */}
              <h3 className="text-2xl font-bold text-black mb-4 group-hover:text-blue-600 transition-colors duration-300">
                {feature.title}
              </h3>
              <p className="text-gray-600 leading-relaxed">
                {feature.description}
              </p>
              
              {/* Hover Effect */}
              <div className="mt-6 opacity-0 group-hover:opacity-100 transition-opacity duration-300">
                <div className={`w-full h-1 ${feature.color === 'blue' ? 'bg-blue-600' : 'bg-red-600'} rounded-full`}></div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}