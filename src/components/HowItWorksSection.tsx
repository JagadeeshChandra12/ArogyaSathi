import React from 'react';
import { MessageCircle, Brain, FileText, CheckCircle, ArrowRight } from 'lucide-react';

const steps = [
  {
    number: '01',
    icon: MessageCircle,
    title: 'Describe Your Symptoms',
    description: 'Tell us what you\'re experiencing in simple, everyday language. No medical jargon required.',
    color: 'blue',
    bgColor: 'bg-blue-50',
    iconColor: 'text-blue-600'
  },
  {
    number: '02',
    icon: Brain,
    title: 'AI Analysis',
    description: 'Our advanced AI analyzes your symptoms and compares them with medical databases to provide insights.',
    color: 'red',
    bgColor: 'bg-red-50',
    iconColor: 'text-red-600'
  },
  {
    number: '03',
    icon: FileText,
    title: 'Get Your Report',
    description: 'Receive a detailed health report with potential causes, recommendations, and next steps.',
    color: 'blue',
    bgColor: 'bg-blue-50',
    iconColor: 'text-blue-600'
  }
];

export default function HowItWorksSection() {
  return (
    <section className="py-20 bg-gray-50">
      <div className="container mx-auto px-4 sm:px-6 lg:px-8">
        {/* Section Header */}
        <div className="text-center mb-16">
          <div className="inline-flex items-center gap-2 bg-blue-50 text-blue-600 px-4 py-2 rounded-full text-sm font-semibold mb-6">
            <CheckCircle size={16} />
            Simple & Effective
          </div>
          <h2 className="text-4xl md:text-5xl font-bold text-black mb-6">
            How It <span className="text-blue-600">Works</span>
          </h2>
          <p className="text-xl text-gray-600 max-w-3xl mx-auto">
            Getting health insights has never been easier. Our simple three-step process puts you in control of your health.
          </p>
        </div>

        {/* Steps */}
        <div className="max-w-6xl mx-auto">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            {steps.map((step, index) => (
              <div key={index} className="relative">
                {/* Step Card */}
                <div className="bg-white rounded-3xl p-8 shadow-lg border border-gray-100 hover:shadow-xl transition-all duration-500 transform hover:-translate-y-2">
                  {/* Step Number */}
                  <div className={`w-16 h-16 ${step.color === 'blue' ? 'bg-blue-600' : 'bg-red-600'} rounded-2xl flex items-center justify-center mb-6 text-white font-bold text-xl`}>
                    {step.number}
                  </div>
                  
                  {/* Icon */}
                  <div className={`w-12 h-12 ${step.bgColor} rounded-xl flex items-center justify-center mb-4`}>
                    <step.icon className={step.iconColor} size={24} />
                  </div>
                  
                  {/* Content */}
                  <h3 className="text-2xl font-bold text-black mb-4">{step.title}</h3>
                  <p className="text-gray-600 leading-relaxed">{step.description}</p>
                </div>

                {/* Arrow */}
                {index < steps.length - 1 && (
                  <div className="hidden md:block absolute top-1/2 -right-4 transform -translate-y-1/2 z-10">
                    <div className="w-8 h-8 bg-white rounded-full shadow-lg flex items-center justify-center border border-gray-200">
                      <ArrowRight size={16} className="text-gray-600" />
                    </div>
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}