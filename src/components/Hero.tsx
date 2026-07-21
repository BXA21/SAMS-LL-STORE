import React from 'react';

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
        {/*
          Darkens the left of the frame so the white headline stays readable
          against the pale wall in the photograph, while fading out entirely
          on the right to keep the products brightly lit. The midpoint is
          pushed past the headline's right edge; a midpoint at 50% left the
          end of the headline sitting on near-white with almost no overlay.
        */}
        <div className="absolute inset-0 bg-gradient-to-r from-black/75 via-black/50 via-70% to-transparent" />
      </div>

      <div className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 w-full z-10">
        <div className="max-w-[90%] sm:max-w-[80%] md:max-w-[58%] lg:max-w-[55%] text-white">
          {/* Heading */}
          <h1 className="animate-rise-in font-display text-5xl sm:text-6xl md:text-7xl lg:text-[80px] xl:text-[95px] 2xl:text-[110px] font-bold tracking-tight leading-[0.92] text-white select-none [text-shadow:0_2px_16px_rgb(0_0_0/0.45)]">
            Protect what<br />
            matters from fire
          </h1>
        </div>
      </div>
    </section>
  );
}
