import React from 'react';
import { Heart, Users, Award, Globe, Target, Zap, Shield } from 'lucide-react';

const stats = [
  {
    number: '10,000+',
    label: 'Happy Users',
    icon: Users,
    color: 'blue',
    bgColor: 'bg-blue-50',
    iconColor: 'text-blue-600'
  },
  {
    number: '95%',
    label: 'Satisfaction Rate',
    icon: Heart,
    color: 'red',
    bgColor: 'bg-red-50',
    iconColor: 'text-red-600'
  },
  {
    number: '24/7',
    label: 'Available Support',
    icon: Zap,
    color: 'blue',
    bgColor: 'bg-blue-50',
    iconColor: 'text-blue-600'
  },
  {
    number: '50+',
    label: 'Countries Served',
    icon: Globe,
    color: 'red',
    bgColor: 'bg-red-50',
    iconColor: 'text-red-600'
  }
];

const values = [
  {
    icon: Heart,
    title: 'Empathy First',
    description: 'We understand that health concerns can be stressful. Our approach is always caring and supportive.',
    color: 'red',
    bgColor: 'bg-red-50',
    iconColor: 'text-red-600'
  },
  {
    icon: Target,
    title: 'Accuracy Matters',
    description: 'Every health insight is based on reliable medical research and validated by healthcare professionals.',
    color: 'blue',
    bgColor: 'bg-blue-50',
    iconColor: 'text-blue-600'
  },
  {
    icon: Shield,
    title: 'Privacy & Trust',
    description: 'Your health information is sacred. We protect it with the highest security standards.',
    color: 'blue',
    bgColor: 'bg-blue-50',
    iconColor: 'text-blue-600'
  }
];

export default function AboutSection() {
  return (
    <section className="py-20 bg-white">
      <div className="container mx-auto px-4 sm:px-6 lg:px-8">
        {/* Section Header */}
        <div className="text-center mb-16">
          <div className="inline-flex items-center gap-2 bg-blue-50 text-blue-600 px-4 py-2 rounded-full text-sm font-semibold mb-6">
            <Award size={16} />
            About ArogyaSathi
          </div>
          <h2 className="text-4xl md:text-5xl font-bold text-black mb-6">
            Your Trusted <span className="text-blue-600">Health Partner</span>
          </h2>
          <p className="text-xl text-gray-600 max-w-3xl mx-auto">
            We're on a mission to make healthcare more accessible, understandable, and human. Every feature we build is designed with you in mind.
          </p>
        </div>

        {/* Stats */}
        <div className="max-w-6xl mx-auto mb-20">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-6">
            {stats.map((stat, index) => (
              <div
                key={index}
                className="bg-white rounded-2xl p-6 text-center shadow-lg border border-gray-100 hover:shadow-xl transition-shadow duration-300"
              >
                <div className={`w-12 h-12 ${stat.bgColor} rounded-xl flex items-center justify-center mx-auto mb-4`}>
                  <stat.icon className={stat.iconColor} size={24} />
                </div>
                <div className="text-3xl font-bold text-black mb-2">{stat.number}</div>
                <div className="text-gray-600 font-medium">{stat.label}</div>
              </div>
            ))}
          </div>
        </div>

        {/* Mission */}
        <div className="max-w-5xl mx-auto">
          <div className="bg-gradient-to-r from-blue-600 to-red-600 rounded-3xl p-8 md:p-12 text-white text-center">
            <h3 className="text-3xl font-bold mb-6">Our Mission</h3>
            <p className="text-xl text-white/90 leading-relaxed mb-8 max-w-4xl mx-auto">
              We believe everyone deserves access to clear, reliable health information. Our platform bridges the gap between complex medical knowledge and everyday understanding, empowering you to make informed decisions about your health.
            </p>
            <p className="text-lg text-white/80 max-w-3xl mx-auto">
              Whether you're experiencing symptoms, managing a condition, or just want to understand your health better, we're here to help with personalized insights and guidance.
                </p>
          </div>
        </div>
      </div>
    </section>
  );
}