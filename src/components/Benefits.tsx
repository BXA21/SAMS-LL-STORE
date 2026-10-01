import React from 'react';
import { 
  Zap, 
  Clock, 
  HelpCircle, 
  Move, 
  ShieldAlert, 
  Leaf,
  Calendar,
  Sparkles
} from 'lucide-react';
import type { Locale } from '@/i18n/config';
import { homeMessages } from '@/i18n/messages/home';

export default function Benefits({ locale }: { locale: Locale }) {
  const t = homeMessages[locale].benefits;
  return (
    <section className="py-24 bg-light-grey border-b border-gray-100">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        
        {/* Title */}
        <div className="text-center max-w-3xl mx-auto mb-16 space-y-4">
          <div className="flex items-center justify-center gap-2">
            <span className="h-0.5 w-6 bg-fire" />
            <span className="text-xs uppercase tracking-widest font-bold text-navy">
              {t.eyebrow}
            </span>
            <span className="h-0.5 w-6 bg-fire" />
          </div>
          <h2 className="font-display text-4xl sm:text-5xl font-bold uppercase tracking-tight text-navy">
            {t.title}
          </h2>
          <p className="text-sm text-gray-500 font-light leading-relaxed max-w-2xl mx-auto">
            {t.intro}
          </p>
        </div>

        {/* Bento Grid */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 max-w-6xl mx-auto">
          
          {/* Card 1: Self-Activating Suppression (2 Cols) */}
          <div className="md:col-span-2 bg-gradient-to-br from-[#051117] to-[#0A2633] text-white p-8 rounded-3xl shadow-sm hover:shadow-xl hover:scale-[1.01] transition-all duration-300 flex flex-col justify-between min-h-[280px]">
            <div className="flex items-start justify-between">
              <div className="bg-safety/10 p-3 rounded-2xl w-fit text-safety">
                <Zap className="w-6 h-6" />
              </div>
              <span className="text-[10px] uppercase font-bold tracking-widest text-white bg-safety px-2.5 py-1 rounded-full shadow-sm font-sans">
                {t.selfActivating.badge}
              </span>
            </div>
            <div className="space-y-3 mt-8">
              <h3 className="font-display text-2xl font-bold uppercase tracking-wide">
                {t.selfActivating.title}
              </h3>
              <p className="text-sm text-white/95 font-light leading-relaxed max-w-xl">
                {t.selfActivating.body}
              </p>
            </div>
          </div>

          {/* Card 2: Ultra-Fast Activation (1 Col) */}
          <div className="bg-white text-gray-950 p-8 rounded-3xl border border-gray-150 shadow-sm hover:shadow-xl hover:scale-[1.01] transition-all duration-300 flex flex-col justify-between min-h-[280px]">
            <div className="bg-fire/10 p-3 rounded-2xl w-fit text-fire">
              <Clock className="w-6 h-6" />
            </div>
            <div className="space-y-2 mt-6">
              <div className="text-5xl font-black font-display text-fire leading-none">
                {t.rapid.stat}
              </div>
              <h3 className="font-display text-lg font-bold uppercase tracking-wide text-navy">
                {t.rapid.title}
              </h3>
              <p className="text-xs text-gray-500 font-light leading-relaxed">
                {t.rapid.body}
              </p>
            </div>
          </div>

          {/* Card 3: Non-Toxic & Safe Agent (1 Col) */}
          <div className="bg-white text-gray-950 p-8 rounded-3xl border border-gray-150 shadow-sm hover:shadow-xl hover:scale-[1.01] transition-all duration-300 flex flex-col justify-between min-h-[280px]">
            <div className="bg-green-600/10 p-3 rounded-2xl w-fit text-green-600">
              <Leaf className="w-6 h-6" />
            </div>
            <div className="space-y-2 mt-6">
              <h3 className="font-display text-lg font-bold uppercase tracking-wide text-navy">
                {t.nonToxic.title}
              </h3>
              <p className="text-xs text-gray-500 font-light leading-relaxed">
                {t.nonToxic.body}
              </p>
            </div>
          </div>

          {/* Card 4: 5-Year Maintenance Free Lifespan (2 Cols) */}
          <div className="md:col-span-2 bg-gradient-to-br from-fire to-red-700 text-white p-8 rounded-3xl shadow-sm hover:shadow-xl hover:scale-[1.01] transition-all duration-300 flex flex-col justify-between min-h-[280px]">
            <div className="flex items-start justify-between">
              <div className="bg-white/10 p-3 rounded-2xl w-fit">
                <Calendar className="w-6 h-6 text-white" />
              </div>
              <span className="text-[10px] uppercase font-bold tracking-widest text-white bg-white/10 px-2.5 py-1 rounded-full font-sans">
                {t.lifespan.badge}
              </span>
            </div>
            <div className="space-y-3 mt-8">
              <h3 className="font-display text-2xl font-bold uppercase tracking-wide">
                {t.lifespan.title}
              </h3>
              <p className="text-sm text-red-100 font-light leading-relaxed max-w-xl">
                {t.lifespan.body}
              </p>
            </div>
          </div>

          {/* Card 5: No Training Required (2 Cols) */}
          <div className="md:col-span-2 bg-white text-gray-950 p-8 rounded-3xl border border-gray-150 shadow-sm hover:shadow-xl hover:scale-[1.01] transition-all duration-300 flex flex-col justify-between min-h-[280px]">
            <div className="flex items-start justify-between">
              <div className="bg-fire/10 p-3 rounded-2xl w-fit text-fire">
                <HelpCircle className="w-6 h-6" />
              </div>
              <span className="text-[10px] uppercase font-bold tracking-widest text-navy bg-light-grey px-2.5 py-1 rounded-full font-sans">
                {t.noTraining.badge}
              </span>
            </div>
            <div className="space-y-3 mt-8">
              <h3 className="font-display text-2xl font-bold uppercase tracking-wide text-navy">
                {t.noTraining.title}
              </h3>
              <p className="text-sm text-gray-500 font-light leading-relaxed max-w-xl">
                {t.noTraining.body}
              </p>
            </div>
          </div>

          {/* Card 6: Lightweight & Portable (1 Col) */}
          <div className="bg-gradient-to-br from-gray-900 to-gray-800 text-white p-8 rounded-3xl shadow-sm hover:shadow-xl hover:scale-[1.01] transition-all duration-300 flex flex-col justify-between min-h-[280px]">
            <div className="bg-white/10 p-3 rounded-2xl w-fit text-white">
              <Move className="w-6 h-6 text-safety" />
            </div>
            <div className="space-y-2 mt-6">
              <h3 className="font-display text-lg font-bold uppercase tracking-wide">
                {t.portable.title}
              </h3>
              <p className="text-xs text-gray-300 font-light leading-relaxed">
                {t.portable.body}
              </p>
            </div>
          </div>

        </div>
      </div>
    </section>
  );
}
