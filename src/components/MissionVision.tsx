import React from 'react';
import { ShieldCheck, Heart, Award, TrendingUp } from 'lucide-react';

export default function MissionVision() {
  const values = [
    {
      icon: <ShieldCheck className="w-6 h-6 text-white" />,
      title: "Safety",
      description: "Our primary objective is protecting lives and assets through reliable fire safety products."
    },
    {
      icon: <Heart className="w-6 h-6 text-white" />,
      title: "Integrity",
      description: "We are dedicated to honest consulting, transparent testing data, and premium materials."
    },
    {
      icon: <Award className="w-6 h-6 text-white" />,
      title: "Commitment",
      description: "We guarantee 5 years of active readiness for all automatic fire extinguisher solutions."
    },
    {
      icon: <TrendingUp className="w-6 h-6 text-white" />,
      title: "Growth",
      description: "Striving to expand life-saving product accessibility to every home and enterprise in Oman."
    }
  ];

  return (
    <section className="py-24 bg-navy text-white">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-16 items-start mb-16">
          {/* Mission */}
          <div className="space-y-6">
            <div className="flex items-center gap-2">
              <span className="h-0.5 w-6 bg-fire" />
              <span className="text-xs uppercase tracking-widest font-bold text-fire-400">
                Our Foundation
              </span>
            </div>
            <h2 className="font-display text-3xl sm:text-4xl font-bold uppercase tracking-tight text-white">
              Our Mission
            </h2>
            <p className="text-sm sm:text-base font-light text-gray-350 leading-relaxed">
              Our mission is to make fire safety easier, hassle-free, and accessible to every citizen and organization in Oman. SAMS aims to reduce fire accidents, save lives, protect properties, and simplify access to modern fire safety solutions.
            </p>
          </div>

          {/* Vision */}
          <div className="space-y-6">
            <div className="flex items-center gap-2">
              <span className="h-0.5 w-6 bg-fire" />
              <span className="text-xs uppercase tracking-widest font-bold text-fire-400">
                Our Outlook
              </span>
            </div>
            <h2 className="font-display text-3xl sm:text-4xl font-bold uppercase tracking-tight text-white">
              Our Vision
            </h2>
            <p className="text-sm sm:text-base font-light text-gray-350 leading-relaxed">
              Our vision is to become a trusted fire safety partner by delivering advanced products that support safer homes, safer businesses, and safer communities throughout the Sultanate of Oman.
            </p>
          </div>
        </div>

        {/* 4 Value Cards Grid */}
        <div className="mt-16">
          <h3 className="font-display text-xl uppercase tracking-widest font-semibold text-center mb-10 text-gray-300">
            Our Core Values
          </h3>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
            {values.map((val, idx) => (
              <div 
                key={idx}
                className="bg-white/5 border border-white/10 p-6 rounded-xl space-y-4 hover:bg-white/10 hover:border-fire transition-all duration-300"
              >
                <div className="bg-fire p-2.5 rounded-lg w-fit">
                  {val.icon}
                </div>
                <h4 className="font-display text-base uppercase tracking-wider font-bold text-white">
                  {val.title}
                </h4>
                <p className="text-xs text-gray-400 font-light leading-relaxed">
                  {val.description}
                </p>
              </div>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}
