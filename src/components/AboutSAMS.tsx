import React from 'react';
import { Shield, Sparkles, LayoutGrid } from 'lucide-react';
import type { Locale } from '@/i18n/config';
import { homeMessages } from '@/i18n/messages/home';

const CARD_ICONS = [
  <Shield key="shield" className="w-8 h-8 text-fire" />,
  <Sparkles key="sparkles" className="w-8 h-8 text-fire" />,
  <LayoutGrid key="grid" className="w-8 h-8 text-fire" />,
];

export default function AboutSAMS({ locale }: { locale: Locale }) {
  const t = homeMessages[locale].about;
  const cards = t.cards.map((card, i) => ({ ...card, icon: CARD_ICONS[i] }));

  return (
    <section className="py-24 bg-white">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-16 items-center mb-16">
          {/* Left Column: Heading and Tagline */}
          <div className="space-y-6">
            <div className="flex items-center gap-2">
              <span className="h-0.5 w-6 bg-fire" />
              <span className="text-xs uppercase tracking-widest font-bold text-navy">
                {t.eyebrow}
              </span>
            </div>
            <h2 className="font-display text-4xl sm:text-5xl font-bold uppercase tracking-tight text-navy leading-tight">
              {t.titleLine1}<br />
              {t.titleLine2}
            </h2>
            <p className="text-lg font-medium text-fire uppercase tracking-wide">
              {t.tagline}
            </p>
          </div>

          {/* Right Column: Paragraph narrative */}
          <div className="text-gray-600 space-y-4 font-light leading-relaxed text-sm sm:text-base">
            <p>
              {t.p1Lead}<strong>{t.p1Company}</strong>{t.p1Rest}
            </p>
            <p>
              {t.p2}
            </p>
            <p>
              {t.p3}
            </p>
          </div>
        </div>

        {/* Feature Cards Grid */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-8 pt-8 border-t border-gray-100">
          {cards.map((card, i) => (
            <div 
              key={i} 
              className="bg-light-grey p-8 rounded-xl space-y-4 border border-gray-100/50 hover:shadow-lg hover:border-fire/20 transition-all duration-300"
            >
              <div className="bg-white p-3 rounded-lg w-fit shadow-sm border border-gray-100">
                {card.icon}
              </div>
              <h3 className="font-display text-lg uppercase tracking-wide font-bold text-navy">
                {card.title}
              </h3>
              <p className="text-sm text-gray-500 font-light leading-relaxed">
                {card.description}
              </p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
