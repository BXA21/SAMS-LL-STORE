'use client';

import React, { useEffect, useState } from 'react';
import { Star, Quote } from 'lucide-react';
import { dbService } from '@/services/dbService';
import { Testimonial } from '@/types/database';

interface TestimonialsProps {
  /* Supplied by the server so the section is in the HTML without JavaScript. */
  initialTestimonials: Testimonial[];
}

export default function Testimonials({ initialTestimonials }: TestimonialsProps) {
  const [testimonials, setTestimonials] = useState<Testimonial[]>(initialTestimonials);

  useEffect(() => {
    let cancelled = false;
    async function refreshTestimonials() {
      try {
        const data = await dbService.getTestimonials();
        if (!cancelled && data.length) setTestimonials(data);
      } catch (err) {
        console.error(err);
      }
    }
    refreshTestimonials();
    return () => {
      cancelled = true;
    };
  }, []);

  return (
    <section className="py-24 bg-light-grey">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Title */}
        <div className="text-center max-w-3xl mx-auto mb-16 space-y-4">
          <div className="flex items-center justify-center gap-2">
            <span className="h-0.5 w-6 bg-fire" />
            <span className="text-xs uppercase tracking-widest font-bold text-navy">
              Testimonials
            </span>
            <span className="h-0.5 w-6 bg-fire" />
          </div>
          <h2 className="font-display text-4xl sm:text-5xl font-bold uppercase tracking-tight text-navy">
            Client Success Stories
          </h2>
          <p className="text-sm sm:text-base text-gray-500 font-light leading-relaxed">
            Here is what safety managers, homeowners, and facility directors in Oman say about SAMS fire solutions.
          </p>
        </div>

        {/* Testimonials Grid */}
        {
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            {testimonials.map((test) => (
              <div 
                key={test.id}
                className="bg-white p-8 rounded-xl border border-gray-100 hover:shadow-lg transition-all duration-300 relative flex flex-col justify-between"
              >
                {/* Quote Icon Background */}
                <div className="absolute top-6 right-8 text-gray-100">
                  <Quote className="w-12 h-12" />
                </div>

                <div className="space-y-4 z-10">
                  {/* Rating Stars */}
                  <div className="flex gap-1">
                    {Array.from({ length: test.rating }).map((_, starIdx) => (
                      <Star key={starIdx} className="w-4 h-4 fill-safety text-safety" />
                    ))}
                  </div>

                  {/* Message */}
                  <p className="text-sm text-gray-600 font-light italic leading-relaxed">
                    “{test.message}”
                  </p>
                </div>

                {/* Author Info */}
                <div className="pt-6 border-t border-gray-100 flex items-center justify-between mt-6">
                  <div>
                    <h4 className="font-display text-sm font-bold uppercase tracking-wider text-navy">
                      {test.name}
                    </h4>
                    {test.position && (
                      <p className="text-[10px] text-gray-400 font-medium uppercase tracking-widest mt-0.5">
                        {test.position} {test.company ? `| ${test.company}` : ''}
                      </p>
                    )}
                  </div>
                </div>
              </div>
            ))}
          </div>
        }
      </div>
    </section>
  );
}
