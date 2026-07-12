import React from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { Phone, Mail, MapPin } from 'lucide-react';

export default function Footer() {
  return (
    <footer className="bg-navy text-white/95 border-t border-white/10 pt-16 pb-8">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-12 mb-12">
          {/* Logo & Description */}
          <div className="space-y-4">
            <Link href="/" className="flex items-center gap-2">
              <Image 
                src="/logo.png" 
                alt="SAMS LLC Logo" 
                width={48} 
                height={48} 
                className="object-contain bg-white rounded-full p-0.5"
              />
              <span className="font-display text-xl tracking-wider font-bold text-white">
                SAMS LLC
              </span>
            </Link>
            <p className="text-sm text-gray-300 leading-relaxed font-light">
              SWIFT ADVANCED MANAGEMENT SOLUTIONS LLC provides advanced fire safety products and solutions in Oman, helping homes, businesses, and industrial spaces improve fire protection with reliable and easy-to-use products.
            </p>
          </div>

          {/* Quick Links */}
          <div>
            <h3 className="font-display text-lg uppercase tracking-wider font-semibold text-white mb-5 border-l-2 border-fire pl-3">
              Quick Links
            </h3>
            <ul className="space-y-3 text-sm font-light text-gray-300">
              <li>
                <Link href="/" className="hover:text-fire transition-colors">Home</Link>
              </li>
              <li>
                <Link href="/catalog" className="hover:text-fire transition-colors">Catalog</Link>
              </li>
              <li>
                <Link href="/contact" className="hover:text-fire transition-colors">Contact Us</Link>
              </li>
              <li>
                <Link href="/terms" className="hover:text-fire transition-colors">Terms & Conditions</Link>
              </li>
              <li>
                <Link href="/privacy" className="hover:text-fire transition-colors">Privacy Policy</Link>
              </li>
              <li>
                <Link href="/admin" className="hover:text-fire transition-colors">Admin Portal</Link>
              </li>
            </ul>
          </div>

          {/* Products */}
          <div>
            <h3 className="font-display text-lg uppercase tracking-wider font-semibold text-white mb-5 border-l-2 border-fire pl-3">
              Products
            </h3>
            <ul className="space-y-3 text-sm font-light text-gray-300">
              <li>
                <Link href="/catalog?category=fire-extinguisher-balls" className="hover:text-fire transition-colors">
                  Fire Extinguisher Ball
                </Link>
              </li>
              <li>
                <Link href="/catalog?category=fire-extinguisher-flower-pots" className="hover:text-fire transition-colors">
                  Fire Extinguisher Flower Pot
                </Link>
              </li>
              <li>
                <span className="text-gray-400">Fire Safety Devices</span>
              </li>
              <li>
                <span className="text-gray-400">Automatic Suppression</span>
              </li>
            </ul>
          </div>

          {/* Contact Details */}
          <div>
            <h3 className="font-display text-lg uppercase tracking-wider font-semibold text-white mb-5 border-l-2 border-fire pl-3">
              Contact SAMS
            </h3>
            <ul className="space-y-4 text-sm font-light text-gray-300">
              <li className="flex items-start gap-3">
                <MapPin className="w-5 h-5 text-fire shrink-0 mt-0.5" />
                <span>Unit No. 2, Al Shumoor Building, Way no 2706, CBD, Ruwi, Muscat, Sultanate of Oman</span>
              </li>
              <li className="flex items-center gap-3">
                <Phone className="w-5 h-5 text-fire shrink-0" />
                <a href="tel:+96877554070" className="hover:text-fire transition-colors">+968 77554070</a>
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
              Safety & Legal Disclaimer
            </strong>
            Product effectiveness depends on correct placement, environment, fire type, and installation conditions. Customers should follow local fire safety regulations and consult qualified professionals for complete fire safety planning.
          </p>
        </div>

        {/* Copyright */}
        <div className="border-t border-white/5 pt-6 text-center text-xs text-gray-500 font-light">
          <p>
            &copy; {new Date().getFullYear()} SWIFT ADVANCED MANAGEMENT SOLUTIONS LLC. All rights reserved.
          </p>
        </div>
      </div>
    </footer>
  );
}
