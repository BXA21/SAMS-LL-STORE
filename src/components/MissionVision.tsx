import React from 'react';
import { ShieldCheck, Heart, Award, TrendingUp } from 'lucide-react';
import type { Locale } from '@/i18n/config';
import { homeMessages } from '@/i18n/messages/home';

export default function MissionVision({ locale }: { locale: Locale }) {
  const t = homeMessages[locale].mission;
  const icons = [
    <ShieldCheck key="safety" className="w-6 h-6 text-white" />,
    <Heart key="integrity" className="w-6 h-6 text-white" />,
    <Award key="commitment" className="w-6 h-6 text-white" />,
    <TrendingUp key="growth" className="w-6 h-6 text-white" />,
  ];
  const values = t.values.map((value, i) => ({ ...value, icon: icons[i] }));

  return (
    <section className="py-24 bg-navy text-white">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-16 items-start mb-16">
          {/* Mission */}
          <div className="space-y-6">
            <div className="flex items-center gap-2">
              <span className="h-0.5 w-6 bg-fire" />
              <span className="text-xs uppercase tracking-widest font-bold text-fire-400">
                {t.missionEyebrow}
              </span>
            </div>
            <h2 className="font-display text-3xl sm:text-4xl font-bold uppercase tracking-tight text-white">
              {t.missionTitle}
            </h2>
            <p className="text-sm sm:text-base font-light text-gray-350 leading-relaxed">
              {t.missionBody}
            </p>
          </div>

          {/* Vision */}
          <div className="space-y-6">
            <div className="flex items-center gap-2">
              <span className="h-0.5 w-6 bg-fire" />
              <span className="text-xs uppercase tracking-widest font-bold text-fire-400">
                {t.visionEyebrow}
              </span>
            </div>
            <h2 className="font-display text-3xl sm:text-4xl font-bold uppercase tracking-tight text-white">
              {t.visionTitle}
            </h2>
            <p className="text-sm sm:text-base font-light text-gray-350 leading-relaxed">
              {t.visionBody}
            </p>
          </div>
        </div>

        {/* 4 Value Cards Grid */}
        <div className="mt-16">
          <h3 className="font-display text-xl uppercase tracking-widest font-semibold text-center mb-10 text-gray-300">
            {t.valuesTitle}
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
