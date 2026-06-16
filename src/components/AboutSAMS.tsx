import React from 'react';
import { Shield, Sparkles, LayoutGrid } from 'lucide-react';

export default function AboutSAMS() {
  const cards = [
    {
      icon: <Shield className="w-8 h-8 text-fire" />,
      title: "Automatic Protection",
      description: "Our fire safety products self-activate on direct contact with flames, providing immediate suppression support."
    },
    {
      icon: <Sparkles className="w-8 h-8 text-fire" />,
      title: "Easy to Use",
      description: "No special training, pull pins, or manual operations required. Designed for immediate protection by anyone."
    },
    {
      icon: <LayoutGrid className="w-8 h-8 text-fire" />,
      title: "Built for Different Spaces",
      description: "Suitable for residential homes, office spaces, warehouses, electrical panels, vehicles, and industrial zones."
    }
  ];

  return (
    <section className="py-24 bg-white">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-16 items-center mb-16">
          {/* Left Column: Heading and Tagline */}
          <div className="space-y-6">
            <div className="flex items-center gap-2">
              <span className="h-0.5 w-6 bg-fire" />
              <span className="text-xs uppercase tracking-widest font-bold text-navy">
                Who We Are
              </span>
            </div>
            <h2 className="font-display text-4xl sm:text-5xl font-bold uppercase tracking-tight text-navy leading-tight">
              About SWIFT ADVANCED<br />
              MANAGEMENT SOLUTIONS
            </h2>
            <p className="text-lg font-medium text-fire uppercase tracking-wide">
              Smart Fire Safety Made Simple
            </p>
          </div>

          {/* Right Column: Paragraph narrative */}
          <div className="text-gray-600 space-y-4 font-light leading-relaxed text-sm sm:text-base">
            <p>
              In a world where fire safety and security are essential, <strong>SWIFT ADVANCED MANAGEMENT SOLUTIONS LLC (SAMS)</strong> brings advanced fire safety products to Oman. Our offerings include automatic fire extinguisher balls, fire extinguisher flower pots, fire drums, smoke detectors, fire alarms, location-sharing fire alarms, and electrical board fire safety devices.
            </p>
            <p>
              SAMS is committed to protecting lives and properties through reliable, easy-to-use, and technologically advanced fire safety solutions. Our products are designed to meet high safety standards and support residential, commercial, and industrial environments.
            </p>
            <p>
              Whether customers need protection for a home, office, warehouse, factory, vehicle, electrical panel, or kitchen area, SAMS provides tailored guidance to help them choose the right solution.
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
