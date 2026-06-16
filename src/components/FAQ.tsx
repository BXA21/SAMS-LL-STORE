'use client';

import React, { useEffect, useState } from 'react';
import { ChevronDown, Plus, Minus } from 'lucide-react';
import { dbService } from '@/services/dbService';
import { FAQ } from '@/types/database';

export default function FAQComponent() {
  const [faqs, setFaqs] = useState<FAQ[]>([]);
  const [loading, setLoading] = useState(true);
  const [openIndex, setOpenIndex] = useState<number | null>(null);

  useEffect(() => {
    async function loadFaqs() {
      try {
        const data = await dbService.getFAQs();
        setFaqs(data);
      } catch (err) {
        console.error(err);
      } finally {
        setLoading(false);
      }
    }
    loadFaqs();
  }, []);

  const toggleFAQ = (index: number) => {
    if (openIndex === index) {
      setOpenIndex(null);
    } else {
      setOpenIndex(index);
    }
  };

  return (
    <section className="py-24 bg-white text-gray-900">
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Title */}
        <div className="text-center mb-16 space-y-4">
          <div className="flex items-center justify-center gap-2">
            <span className="h-0.5 w-6 bg-fire" />
            <span className="text-xs uppercase tracking-widest font-bold text-navy">
              Got Questions?
            </span>
            <span className="h-0.5 w-6 bg-fire" />
          </div>
          <h2 className="font-display text-4xl sm:text-5xl font-bold uppercase tracking-tight text-navy">
            Get Answers to Your Questions
          </h2>
          <p className="text-sm sm:text-base text-gray-500 font-light leading-relaxed">
            Have questions about how SAMS automatic fire extinguisher balls and pots operate? Find key answers here.
          </p>
        </div>

        {/* FAQ list */}
        {loading ? (
          <div className="space-y-4">
            {[1, 2, 3, 4].map((i) => (
              <div key={i} className="animate-pulse bg-gray-50 border border-gray-150 h-16 rounded-xl" />
            ))}
          </div>
        ) : (
          <div className="space-y-4">
            {faqs.map((faq, idx) => {
              const isOpen = openIndex === idx;
              return (
                <div 
                  key={faq.id}
                  className={`border rounded-xl transition-all duration-300 ${
                    isOpen 
                      ? 'border-fire bg-light-grey/50 shadow-sm' 
                      : 'border-gray-200 hover:border-navy bg-white'
                  }`}
                >
                  {/* Question trigger button */}
                  <button
                    onClick={() => toggleFAQ(idx)}
                    className="w-full text-left p-6 flex justify-between items-center gap-4 focus:outline-none"
                  >
                    <h3 className="font-display text-base font-bold uppercase tracking-wide text-navy">
                      {faq.question}
                    </h3>
                    <span className="text-navy shrink-0 p-1 bg-gray-50 rounded-full border border-gray-100 group-hover:bg-navy group-hover:text-white transition-colors">
                      {isOpen ? <Minus className="w-4 h-4" /> : <Plus className="w-4 h-4" />}
                    </span>
                  </button>

                  {/* Answer content (expand/collapse) */}
                  <div 
                    className={`overflow-hidden transition-all duration-300 ${
                      isOpen ? 'max-h-[500px] border-t border-gray-150' : 'max-h-0'
                    }`}
                  >
                    <div className="p-6 text-sm text-gray-650 leading-relaxed font-light">
                      {faq.answer}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </section>
  );
}
