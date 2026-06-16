'use client';

import React from 'react';
import Link from 'next/link';
import { ArrowRight, MessageSquare } from 'lucide-react';
import { motion } from 'framer-motion';

export default function Hero() {
  return (
    <section className="relative h-screen flex items-center bg-gray-150 overflow-hidden">
      {/* Background Image Container */}
      <div 
        className="absolute inset-0 bg-cover bg-no-repeat transition-all duration-75"
        style={{ 
          backgroundImage: "url('/hero_bg.png')",
          backgroundPosition: '98% center'
        }}
      >
        {/* Soft overlay gradient to ensure left-side white text is highly readable while keeping the right side bright */}
        <div className="absolute inset-0 bg-gradient-to-r from-black/50 via-black/20 to-transparent md:from-black/45 md:via-black/10 md:to-transparent" />
      </div>

      <div className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 w-full z-10">
        <div className="max-w-[90%] sm:max-w-[80%] md:max-w-[58%] lg:max-w-[55%] text-white">
          {/* Heading */}
          <motion.h1
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8, delay: 0.1 }}
            className="font-display text-5xl sm:text-6xl md:text-7xl lg:text-[80px] xl:text-[95px] 2xl:text-[110px] font-bold tracking-tight leading-[0.92] text-white select-none"
          >
            Protect what<br />
            matters from fire
          </motion.h1>
        </div>
      </div>
    </section>
  );
}
