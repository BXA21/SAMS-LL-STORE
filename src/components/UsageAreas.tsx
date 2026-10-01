import React from 'react';
import Image from 'next/image';
import { Home, Cpu, Car, Warehouse } from 'lucide-react';
import type { Locale } from '@/i18n/config';
import { homeMessages } from '@/i18n/messages/home';

const PLACEMENT_VISUALS = [
  {
    icon: <Home className="w-5 h-5" />,
    image: "/products/flower_image_2_kitchen.png",
    isImageLeft: true
  },
  {
    icon: <Cpu className="w-5 h-5" />,
    image: "/products/image_3_gfo_electrical_socket_image.png",
    isImageLeft: false
  },
  {
    icon: <Car className="w-5 h-5" />,
    image: "/products/image_4_gfo_car_image.png",
    isImageLeft: true
  },
  {
    icon: <Warehouse className="w-5 h-5" />,
    image: "/products/gfo_fire_drum_4_warehouse.jpg",
    isImageLeft: false
  }
];

export default function UsageAreas({ locale }: { locale: Locale }) {
  const t = homeMessages[locale].usage;
  const placements = PLACEMENT_VISUALS.map((visual, i) => ({ ...visual, ...t.placements[i] }));

  return (
    <section className="py-24 bg-white border-b border-gray-100">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        
        {/* Title */}
        <div className="text-center max-w-3xl mx-auto mb-20 space-y-4">
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
          <p className="text-sm text-gray-500 font-light leading-relaxed">
            {t.intro}
          </p>
        </div>

        {/* Alternating Layout List */}
        <div className="space-y-24 max-w-6xl mx-auto">
          {placements.map((place, idx) => (
            <div 
              key={idx} 
              className={`flex flex-col ${
                place.isImageLeft ? 'md:flex-row' : 'md:flex-row-reverse'
              } items-center gap-12 md:gap-16`}
            >
              {/* Image Column */}
              <div className="w-full md:w-1/2">
                <div className="relative aspect-[4/3] rounded-3xl overflow-hidden shadow-lg border border-gray-100 bg-gray-100 group">
                  <Image 
                    src={place.image} 
                    alt={place.title}
                    fill
                    sizes="(max-width: 768px) 100vw, 50vw"
                    className="object-cover group-hover:scale-105 transition-transform duration-700"
                  />
                  <div className="absolute inset-0 bg-navy/10 group-hover:bg-transparent transition-colors duration-300" />
                </div>
              </div>

              {/* Text Column */}
              <div className="w-full md:w-1/2 space-y-5">
                <div className="flex items-center gap-2">
                  <span className="bg-fire/10 text-fire p-2 rounded-xl">
                    {place.icon}
                  </span>
                  <span className="text-[10px] uppercase font-bold tracking-widest text-navy bg-light-grey px-2.5 py-1 rounded-full">
                    {place.badge}
                  </span>
                </div>
                <h3 className="font-display text-2xl sm:text-3xl font-bold uppercase tracking-wide text-navy leading-tight">
                  {place.title}
                </h3>
                <p className="text-sm text-gray-500 font-light leading-relaxed">
                  {place.desc}
                </p>
              </div>
            </div>
          ))}
        </div>

      </div>
    </section>
  );
}
