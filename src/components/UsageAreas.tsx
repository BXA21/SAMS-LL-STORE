import React from 'react';
import Image from 'next/image';
import { Home, Cpu, Car, Warehouse } from 'lucide-react';

export default function UsageAreas() {
  const placements = [
    {
      icon: <Home className="w-5 h-5" />,
      title: "Stoves, Cylinder Storage & Kitchens",
      desc: "Cooking fires represent a large percentage of residential accidents. Placing a SAMS automatic fire extinguisher ball or decorative flower pot near stoves or gas cylinder storage units offers immediate, self-activating protection. If a flare-up occurs, the ball activates within 3-5 seconds, choking the flames before they can spread to wooden cabinets.",
      image: "/products/flower_image_2_kitchen.png",
      badge: "Residential Safety",
      isImageLeft: true
    },
    {
      icon: <Cpu className="w-5 h-5" />,
      title: "Electrical Boards & Power Cabling",
      desc: "SAMS self-activating solutions are non-conductive and dry. When mounted inside or directly above circuit breakers, electrical boards, and server cabinets, they serve as a passive guard. Upon flame exposure from a short circuit, the dry chemical powder is dispersed, extinguishing the fire immediately without water damage to electronics.",
      image: "/products/image_3_gfo_electrical_socket_image.png",
      badge: "Critical Hardware",
      isImageLeft: false
    },
    {
      icon: <Car className="w-5 h-5" />,
      title: "Car Engines, Trunks & Highway Safety",
      desc: "Vehicle engine fires are fast-moving and difficult to fight manually. SAMS fire safety balls are lightweight and can be mounted securely in engine bays or stored in trunks. If a fire starts under the hood, the heat-sensitive shell triggers upon contact with open flames, suppressing the fire and giving passengers critical seconds to exit safely.",
      image: "/products/image_4_gfo_car_image.png",
      badge: "Automotive Guard",
      isImageLeft: true
    },
    {
      icon: <Warehouse className="w-5 h-5" />,
      title: "Commercial Warehousing & Inventory Storage",
      desc: "Isolating fire zones in commercial spaces is vital for business continuity. SAMS automatic balls can be easily mounted on high racks, inventory shelves, or warehouses. They provide localized, 24/7 passive suppression, isolating potential fire zones before building sprinkler systems are triggered, reducing heavy water damage to stock.",
      image: "/products/gfo_fire_drum_4_warehouse.jpg",
      badge: "Asset Protection",
      isImageLeft: false
    }
  ];

  return (
    <section className="py-24 bg-white border-b border-gray-100">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        
        {/* Title */}
        <div className="text-center max-w-3xl mx-auto mb-20 space-y-4">
          <div className="flex items-center justify-center gap-2">
            <span className="h-0.5 w-6 bg-fire" />
            <span className="text-xs uppercase tracking-widest font-bold text-navy">
              Versatile Placements
            </span>
            <span className="h-0.5 w-6 bg-fire" />
          </div>
          <h2 className="font-display text-4xl sm:text-5xl font-bold uppercase tracking-tight text-navy">
            Where Can Fire Balls Be Used?
          </h2>
          <p className="text-sm text-gray-500 font-light leading-relaxed">
            Compact fire extinguisher balls are lightweight and highly adaptable, providing supplementary fire safety coverage for almost any environment.
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
                    sizes="(max-w-768px) 100vw, 50vw"
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
