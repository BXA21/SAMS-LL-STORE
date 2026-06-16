'use client';

import React, { useEffect, useState } from 'react';
import { Users, CheckCircle, ShieldAlert, Award } from 'lucide-react';

interface StatItem {
  id: string;
  icon: React.ReactNode;
  label: string;
  targetNumber: number;
  suffix: string;
}

export default function Statistics() {
  const [stats, setStats] = useState<StatItem[]>([
    {
      id: 'clients',
      icon: <Users className="w-8 h-8 text-white" />,
      label: 'Happy Clients',
      targetNumber: 1200,
      suffix: '+'
    },
    {
      id: 'projects',
      icon: <CheckCircle className="w-8 h-8 text-white" />,
      label: 'Projects Done',
      targetNumber: 140,
      suffix: '+'
    },
    {
      id: 'installations',
      icon: <ShieldAlert className="w-8 h-8 text-white" />,
      label: 'Safety Installations',
      targetNumber: 89,
      suffix: '+'
    },
    {
      id: 'awards',
      icon: <Award className="w-8 h-8 text-white" />,
      label: 'Built Awards',
      targetNumber: 18,
      suffix: '+'
    }
  ]);

  const [counts, setCounts] = useState<Record<string, number>>({
    clients: 0,
    projects: 0,
    installations: 0,
    awards: 0
  });

  useEffect(() => {
    // Simple dynamic count animation on load
    const duration = 2000; // 2 seconds animation
    const steps = 50;
    const stepTime = duration / steps;
    let step = 0;

    const timer = setInterval(() => {
      step++;
      setCounts({
        clients: Math.min(Math.round((1200 / steps) * step), 1200),
        projects: Math.min(Math.round((140 / steps) * step), 140),
        installations: Math.min(Math.round((89 / steps) * step), 89),
        awards: Math.min(Math.round((18 / steps) * step), 18)
      });

      if (step >= steps) {
        clearInterval(timer);
      }
    }, stepTime);

    return () => clearInterval(timer);
  }, []);

  return (
    <section className="py-20 bg-navy text-white">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-12 text-center">
          {stats.map((stat) => (
            <div key={stat.id} className="space-y-4 flex flex-col items-center">
              {/* Icon Container */}
              <div className="bg-fire p-4 rounded-full shadow-lg shadow-fire/20 w-fit">
                {stat.icon}
              </div>

              {/* Animated Target Number */}
              <div className="font-display text-4xl sm:text-5xl font-extrabold tracking-tight">
                {stat.id === 'clients' && counts.clients >= 1000 
                  ? `${(counts.clients / 1000).toFixed(1)}k`
                  : counts[stat.id]
                }
                {stat.suffix}
              </div>

              {/* Label */}
              <div className="text-xs sm:text-sm uppercase tracking-widest font-semibold text-gray-400">
                {stat.label}
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
