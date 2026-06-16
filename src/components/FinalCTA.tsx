import React from 'react';
import Link from 'next/link';
import { ShoppingCart, MessageSquare } from 'lucide-react';

export default function FinalCTA() {
  return (
    <section className="relative py-24 bg-navy text-white overflow-hidden">
      {/* Background Graphic overlay */}
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_bottom_right,_var(--tw-gradient-stops))] from-fire/20 via-transparent to-transparent pointer-events-none" />

      <div className="relative max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 text-center space-y-8 z-10">
        <div className="flex items-center justify-center gap-2">
          <span className="h-0.5 w-6 bg-fire" />
          <span className="text-xs uppercase tracking-widest font-bold text-fire-400">
            Active Preparedness
          </span>
          <span className="h-0.5 w-6 bg-fire" />
        </div>
        
        <h2 className="font-display text-4xl sm:text-5xl md:text-6xl font-bold uppercase tracking-tight leading-tight">
          Protect Your Space with SAMS<br />
          Fire Safety Solutions
        </h2>
        
        <p className="text-base sm:text-lg text-gray-300 font-light max-w-3xl mx-auto leading-relaxed">
          Need help choosing the right fire safety product? Contact SAMS today and our team will guide you based on your space, risk level, and installation parameters.
        </p>

        <div className="flex flex-col sm:flex-row gap-4 justify-center pt-4">
          <Link 
            href="/catalog" 
            className="bg-fire hover:bg-fire/90 text-white text-xs uppercase tracking-widest font-bold px-8 py-4 rounded-md flex items-center justify-center gap-2 transition-all hover:scale-105"
          >
            <ShoppingCart className="w-4 h-4" />
            Shop Catalog
          </Link>
          <Link 
            href="/contact" 
            className="bg-white/10 hover:bg-white/20 text-white text-xs uppercase tracking-widest font-bold px-8 py-4 rounded-md border border-white/20 flex items-center justify-center gap-2 transition-all backdrop-blur-sm hover:scale-105"
          >
            <MessageSquare className="w-4 h-4" />
            Contact Us
          </Link>
        </div>
      </div>
    </section>
  );
}
