'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { Search, User, ShoppingBag, Menu, X } from 'lucide-react';
import { useCartStore } from '@/store/cartStore';
import { useHydrated } from '@/lib/useHydrated';
import { useInternalPath, useLocalePath, useMessages } from '@/i18n/I18nProvider';
import { siteMessages } from '@/i18n/messages/site';
import LanguageToggle from './LanguageToggle';

export default function Header() {
  const [isScrolled, setIsScrolled] = useState(false);
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const pathname = useInternalPath();
  const href = useLocalePath();
  const t = useMessages(siteMessages);
  const { setIsOpen: openCart, getItemCount } = useCartStore();

  const mounted = useHydrated();

  useEffect(() => {
    const handleScroll = () => {
      if (window.scrollY > 50) {
        setIsScrolled(true);
      } else {
        setIsScrolled(false);
      }
    };
    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  const isHeroPage = pathname === '/';
  
  // Decide header text & background styles
  const headerBgClass = isScrolled 
    ? 'bg-white/95 backdrop-blur-md shadow-md text-gray-900 border-b border-gray-100 py-3' 
    : isHeroPage 
      ? 'bg-transparent text-white py-6' 
      : 'bg-white text-gray-900 border-b border-gray-100 py-4';

  const linkColorClass = isScrolled 
    ? 'text-gray-700 hover:text-fire transition-colors' 
    : isHeroPage 
      ? 'text-white/80 hover:text-white transition-colors' 
      : 'text-gray-600 hover:text-fire transition-colors';

  const iconColorClass = isScrolled 
    ? 'text-gray-700 hover:text-fire transition-colors' 
    : isHeroPage 
      ? 'text-white/90 hover:text-white transition-colors' 
      : 'text-gray-700 hover:text-fire transition-colors';

  const activeLinkClass = isScrolled
    ? 'text-fire border-b-2 border-fire pb-1 font-bold'
    : isHeroPage
      ? 'text-white font-bold'
      : 'text-fire border-b-2 border-fire pb-1 font-bold';

  return (
    <header className={`fixed top-0 inset-x-0 z-50 transition-all duration-300 ${headerBgClass}`}>
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between relative">
          {/* Logo */}
          <div className="flex-shrink-0 flex items-center z-10">
            <Link href={href('/')} className="flex items-center gap-2">
              <Image 
                src="/logo.png" 
                alt={t.logoAlt} 
                width={64} 
                height={64} 
                className={`object-contain transition-all duration-300 ${
                  isScrolled || !isHeroPage ? 'bg-white rounded-full p-1 shadow-md' : ''
                }`}
              />
              <span className={`font-display text-2xl tracking-wider font-bold transition-all duration-300 ${
                isScrolled || !isHeroPage ? 'inline-block text-navy' : 'hidden'
              }`}>
                {t.brand}
              </span>
            </Link>
          </div>

          {/* Desktop Navigation */}
          <nav className="hidden md:flex absolute left-1/2 -translate-x-1/2 gap-10 text-sm uppercase tracking-wider font-bold">
            <Link 
              href={href('/')} 
              className={pathname === '/' ? activeLinkClass : linkColorClass}
            >
              {t.nav.home}
            </Link>
            <Link 
              href={href('/catalog')} 
              className={pathname === '/catalog' || pathname.startsWith('/catalog/') ? activeLinkClass : linkColorClass}
            >
              {t.nav.catalog}
            </Link>
            <Link 
              href={href('/contact')} 
              className={pathname === '/contact' ? activeLinkClass : linkColorClass}
            >
              {t.nav.contact}
            </Link>
          </nav>

          {/* Utility Icons */}
          <div className="flex items-center gap-3 sm:gap-4 z-10">
            <LanguageToggle
              className={
                isScrolled || !isHeroPage
                  ? 'border-gray-200 text-navy hover:border-fire hover:text-fire'
                  : 'border-white/40 text-white hover:bg-white/10'
              }
            />

            {/* Search lives on the catalog page */}
            <Link href={href('/catalog')} className={`hidden sm:inline-flex p-1.5 rounded-full ${iconColorClass}`} aria-label={t.nav.catalog}>
              <Search className="w-5 h-5" />
            </Link>

            {/* Profile / Admin Login */}
            <Link href="/admin" className={`hidden sm:inline-flex p-1.5 rounded-full ${iconColorClass}`} aria-label={t.nav.staffLogin}>
              <User className="w-5 h-5" />
            </Link>

            {/* Shopping Cart */}
            <button 
              onClick={() => openCart(true)} 
              className={`p-1.5 rounded-full relative ${iconColorClass}`} 
              aria-label={t.nav.openCart}
            >
              <ShoppingBag className="w-5 h-5" />
              {mounted && getItemCount() > 0 && (
                <span className="absolute -top-1 -end-1 bg-fire text-white text-[10px] font-bold rounded-full w-5 h-5 flex items-center justify-center animate-pulse">
                  {getItemCount()}
                </span>
              )}
            </button>

            {/* Mobile Menu Toggle */}
            <button 
              onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)} 
              className={`p-1.5 rounded-full md:hidden ${iconColorClass}`}
              aria-label={t.nav.toggleMenu}
              aria-expanded={isMobileMenuOpen}
            >
              {isMobileMenuOpen ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
            </button>
          </div>
        </div>
      </div>

      {/* Mobile Drawer Menu */}
      {isMobileMenuOpen && (
        <div className="md:hidden bg-white text-gray-950 border-t border-gray-100 shadow-xl py-4 transition-all duration-300">
          <div className="px-4 pt-2 pb-4 space-y-3">
            <Link 
              href={href('/')} 
              onClick={() => setIsMobileMenuOpen(false)}
              className={`block px-4 py-2.5 rounded-lg text-sm font-semibold tracking-wider uppercase ${
                pathname === '/' ? 'bg-gray-100 text-fire' : 'text-gray-700 hover:bg-gray-50'
              }`}
            >
              {t.nav.home}
            </Link>
            <Link 
              href={href('/catalog')} 
              onClick={() => setIsMobileMenuOpen(false)}
              className={`block px-4 py-2.5 rounded-lg text-sm font-semibold tracking-wider uppercase ${
                pathname.startsWith('/catalog') ? 'bg-gray-100 text-fire' : 'text-gray-700 hover:bg-gray-50'
              }`}
            >
              {t.nav.catalog}
            </Link>
            <Link 
              href={href('/contact')} 
              onClick={() => setIsMobileMenuOpen(false)}
              className={`block px-4 py-2.5 rounded-lg text-sm font-semibold tracking-wider uppercase ${
                pathname === '/contact' ? 'bg-gray-100 text-fire' : 'text-gray-700 hover:bg-gray-50'
              }`}
            >
              {t.nav.contact}
            </Link>
            <Link 
              href="/admin" 
              onClick={() => setIsMobileMenuOpen(false)}
              className={`block px-4 py-2.5 rounded-lg text-sm font-semibold tracking-wider uppercase ${
                pathname === '/admin' ? 'bg-gray-100 text-fire' : 'text-gray-700 hover:bg-gray-50'
              }`}
            >
              {t.nav.staffLogin}
            </Link>
          </div>
        </div>
      )}
    </header>
  );
}
