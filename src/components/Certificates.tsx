'use client';

import React, { useEffect, useState } from 'react';
import Image from 'next/image';
import { FileText, ShieldAlert } from 'lucide-react';
import { dbService } from '@/services/dbService';
import { Certificate } from '@/types/database';

export default function Certificates() {
  const [certs, setCerts] = useState<Certificate[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function loadCerts() {
      try {
        const data = await dbService.getCertificates();
        setCerts(data);
      } catch (err) {
        console.error(err);
      } finally {
        setLoading(false);
      }
    }
    loadCerts();
  }, []);

  return (
    <section className="py-24 bg-white">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Title */}
        <div className="text-center max-w-3xl mx-auto mb-16 space-y-4">
          <div className="flex items-center justify-center gap-2">
            <span className="h-0.5 w-6 bg-fire" />
            <span className="text-xs uppercase tracking-widest font-bold text-navy">
              Quality Assurance
            </span>
            <span className="h-0.5 w-6 bg-fire" />
          </div>
          <h2 className="font-display text-4xl sm:text-5xl font-bold uppercase tracking-tight text-navy">
            Certified Fire Safety Solutions
          </h2>
          <p className="text-sm sm:text-base text-gray-500 font-light leading-relaxed">
            SAMS provides automatic fire suppression solutions supported by testing data and safety documentation.
          </p>
        </div>

        {/* Certificates Grid */}
        {loading ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-6">
            {[1, 2, 3, 4, 5].map((i) => (
              <div key={i} className="animate-pulse bg-gray-50 aspect-[3/4] rounded-lg" />
            ))}
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-6">
            {certs.map((cert) => (
              <div 
                key={cert.id}
                className="bg-light-grey rounded-xl border border-gray-150 overflow-hidden flex flex-col justify-between hover:shadow-lg transition-all duration-300 group"
              >
                {/* Visual Preview */}
                <div className="relative aspect-[3/4] bg-gray-200 overflow-hidden border-b border-gray-150 shrink-0">
                  <Image
                    src={cert.image_url || '/hero_bg.png'}
                    alt={cert.title}
                    fill
                    className="object-cover group-hover:scale-105 transition-transform duration-500"
                  />
                  <div className="absolute inset-0 bg-navy/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                    <span className="bg-white/95 text-navy text-[10px] uppercase font-bold tracking-widest px-4 py-2 rounded-md shadow-md flex items-center gap-1.5 hover:bg-fire hover:text-white transition-colors cursor-pointer">
                      <FileText className="w-3.5 h-3.5" />
                      View Document
                    </span>
                  </div>
                </div>

                {/* Details */}
                <div className="p-4 flex-1 flex flex-col justify-between gap-2">
                  <div className="space-y-1">
                    <span className="text-[9px] uppercase tracking-widest text-fire font-bold block">
                      {cert.certificate_type || 'Safety compliance'}
                    </span>
                    <h3 className="font-display text-sm font-bold uppercase tracking-wide text-navy line-clamp-1">
                      {cert.title}
                    </h3>
                    <p className="text-[11px] text-gray-500 font-light leading-normal line-clamp-2">
                      {cert.description}
                    </p>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Disclaimer Callout */}
        <div className="mt-12 bg-fire/5 border border-fire/10 p-5 rounded-xl flex gap-3 max-w-4xl mx-auto">
          <ShieldAlert className="w-6 h-6 text-fire shrink-0 mt-0.5" />
          <p className="text-xs text-gray-600 font-light leading-relaxed">
            <strong className="text-navy font-semibold uppercase tracking-wider block mb-1">
              Client Certification Notice
            </strong>
            SAMS only displays certificates and documentation issued by verified, authorized manufacturing plants and testing laboratories. We strictly prohibit fake certification claims. All active certificates can be requested through our inquiry channel.
          </p>
        </div>
      </div>
    </section>
  );
}
