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

export default function Benefits() {
  return (
    <section className="py-24 bg-light-grey border-b border-gray-100">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        
        {/* Title */}
        <div className="text-center max-w-3xl mx-auto mb-16 space-y-4">
          <div className="flex items-center justify-center gap-2">
            <span className="h-0.5 w-6 bg-fire" />
            <span className="text-xs uppercase tracking-widest font-bold text-navy">
              Product Effectiveness
            </span>
            <span className="h-0.5 w-6 bg-fire" />
          </div>
          <h2 className="font-display text-4xl sm:text-5xl font-bold uppercase tracking-tight text-navy">
            How Our Products Make a Difference
          </h2>
          <p className="text-sm text-gray-500 font-light leading-relaxed max-w-2xl mx-auto">
            SAMS automatic fire extinguishing solutions offer advanced, self-activating safety parameters. We secure life and property with technology that requires no maintenance or human presence.
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
                Core Feature
              </span>
            </div>
            <div className="space-y-3 mt-8">
              <h3 className="font-display text-2xl font-bold uppercase tracking-wide">
                Self-Activating Suppression
              </h3>
              <p className="text-sm text-white/95 font-light leading-relaxed max-w-xl">
                Unlike traditional fire extinguishers that require manual operation, SAMS fire safety balls trigger automatically upon direct flame exposure. They act as your silent 24/7 guard, defending your property when you are asleep or away.
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
                3-5s
              </div>
              <h3 className="font-display text-lg font-bold uppercase tracking-wide text-navy">
                Rapid Activation
              </h3>
              <p className="text-xs text-gray-500 font-light leading-relaxed">
                Suppresses fire in roughly 3 to 5 seconds on direct flame contact, choking flames at the source before they expand.
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
                Non-Toxic Agent
              </h3>
              <p className="text-xs text-gray-500 font-light leading-relaxed">
                Uses eco-friendly, biodegradable dry chemical powders. Completely harmless to humans, pets, and delicate computer server hardware.
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
                Zero Cost
              </span>
            </div>
            <div className="space-y-3 mt-8">
              <h3 className="font-display text-2xl font-bold uppercase tracking-wide">
                5-Year Maintenance-Free Lifespan
              </h3>
              <p className="text-sm text-red-100 font-light leading-relaxed max-w-xl">
                Guarantees 5 years of active readiness with zero maintenance. No pressure tests, no refilling, and no recurring inspection fees. A single placement secures your property for half a decade.
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
                Universal Usability
              </span>
            </div>
            <div className="space-y-3 mt-8">
              <h3 className="font-display text-2xl font-bold uppercase tracking-wide text-navy">
                No Safety Training Required
              </h3>
              <p className="text-sm text-gray-500 font-light leading-relaxed max-w-xl">
                Extremely simple to use—just roll or toss the fire safety ball into active flames. Since it is self-activating, even children, elderly residents, or visitors can defend themselves without operating heavy handles or pins.
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
                Compact & Portable
              </h3>
              <p className="text-xs text-gray-300 font-light leading-relaxed">
                Weighing between 400g to 1.3kg, these automatic balls can be easily thrown by hand or mounted anywhere near fire hazard zones.
              </p>
            </div>
          </div>

        </div>
      </div>
    </section>
  );
}
