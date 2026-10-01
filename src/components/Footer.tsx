'use client';

import React from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { Phone, Mail, MapPin } from 'lucide-react';
import { useLocalePath, useMessages } from '@/i18n/I18nProvider';
import { siteMessages } from '@/i18n/messages/site';

export default function Footer() {
  const t = useMessages(siteMessages);
  const href = useLocalePath();
  return (
    <footer className="bg-navy text-white/95 border-t border-white/10 pt-16 pb-8">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-12 mb-12">
          {/* Logo & Description */}
          <div className="space-y-4">
            <Link href={href('/')} className="flex items-center gap-2">
              <Image 
                src="/logo.png" 
                alt={t.logoAlt} 
                width={48} 
                height={48} 
                className="object-contain bg-white rounded-full p-0.5"
              />
              <span className="font-display text-xl tracking-wider font-bold text-white">
                {t.brand}
              </span>
            </Link>
            <p className="text-sm text-gray-300 leading-relaxed font-light">
              {t.footer.about}
            </p>
          </div>

          {/* Quick Links */}
          <div>
            <h3 className="font-display text-lg uppercase tracking-wider font-semibold text-white mb-5 border-s-2 border-fire ps-3">
              {t.footer.quickLinks}
            </h3>
            <ul className="space-y-3 text-sm font-light text-gray-300">
              <li>
                <Link href={href('/')} className="hover:text-fire transition-colors">{t.nav.home}</Link>
              </li>
              <li>
                <Link href={href('/catalog')} className="hover:text-fire transition-colors">{t.nav.catalog}</Link>
              </li>
              <li>
                <Link href={href('/contact')} className="hover:text-fire transition-colors">{t.nav.contactUs}</Link>
              </li>
              <li>
                <Link href={href('/orders')} className="hover:text-fire transition-colors">{t.nav.trackOrder}</Link>
              </li>
              <li>
                <Link href={href('/terms')} className="hover:text-fire transition-colors">{t.footer.terms}</Link>
              </li>
              <li>
                <Link href={href('/privacy')} className="hover:text-fire transition-colors">{t.footer.privacy}</Link>
              </li>
            </ul>
          </div>

          {/* Products */}
          <div>
            <h3 className="font-display text-lg uppercase tracking-wider font-semibold text-white mb-5 border-s-2 border-fire ps-3">
              {t.footer.products}
            </h3>
            <ul className="space-y-3 text-sm font-light text-gray-300">
              <li>
                <Link href={href('/catalog?category=fire-extinguisher-balls')} className="hover:text-fire transition-colors">
                  {t.footer.fireBall}
                </Link>
              </li>
              <li>
                <Link href={href('/catalog?category=fire-extinguisher-flower-pots')} className="hover:text-fire transition-colors">
                  {t.footer.flowerPot}
                </Link>
              </li>
              <li>
                <span className="text-gray-400">{t.footer.devices}</span>
              </li>
              <li>
                <span className="text-gray-400">{t.footer.suppression}</span>
              </li>
            </ul>
          </div>

          {/* Contact Details */}
          <div>
            <h3 className="font-display text-lg uppercase tracking-wider font-semibold text-white mb-5 border-s-2 border-fire ps-3">
              {t.footer.contactHeading}
            </h3>
            <ul className="space-y-4 text-sm font-light text-gray-300">
              <li className="flex items-start gap-3">
                <MapPin className="w-5 h-5 text-fire shrink-0 mt-0.5" />
                <span>{t.footer.address}</span>
              </li>
              <li className="flex items-center gap-3">
                <Phone className="w-5 h-5 text-fire shrink-0" />
                <a href="tel:+96877554070" dir="ltr" className="hover:text-fire transition-colors">+968 77554070</a>
              </li>
              <li className="flex items-center gap-3">
                <Mail className="w-5 h-5 text-fire shrink-0" />
                <a href="mailto:info@samsoman.com" className="hover:text-fire transition-colors">info@samsoman.com</a>
              </li>
            </ul>
          </div>
        </div>

        {/* Safety and Legal Disclaimer */}
        <div className="border-t border-white/10 pt-8 pb-6 text-center text-xs text-gray-400 leading-relaxed font-light">
          <p className="max-w-4xl mx-auto">
            <strong className="text-gray-300 font-semibold uppercase tracking-wider block mb-2">
              {t.footer.disclaimerHeading}
            </strong>
            {t.footer.disclaimer}
          </p>
        </div>

        {/* Copyright */}
        <div className="border-t border-white/5 pt-6 text-center text-xs text-gray-500 font-light">
          <p>
            &copy; {new Date().getFullYear()} {t.companyName}. {t.footer.rights}
          </p>
        </div>
      </div>
    </footer>
  );
}
