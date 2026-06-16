'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { usePathname } from 'next/navigation';
import { Search, User, ShoppingBag, Menu, X } from 'lucide-react';
import { useCartStore } from '@/store/cartStore';

export default function Header() {
  const [isScrolled, setIsScrolled] = useState(false);
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const pathname = usePathname();
  const { setIsOpen: openCart, getItemCount } = useCartStore();

  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
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
    <header className={`fixed top-0 left-0 right-0 z-50 transition-all duration-300 ${headerBgClass}`}>
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between relative">
          {/* Logo */}
          <div className="flex-shrink-0 flex items-center z-10">
            <Link href="/" className="flex items-center gap-2">
              <Image 
                src="/logo.png" 
                alt="SAMS LLC Logo" 
                width={64} 
                height={64} 
                className={`object-contain transition-all duration-300 ${
                  isScrolled || !isHeroPage ? 'bg-white rounded-full p-1 shadow-md' : ''
                }`}
              />
              <span className={`font-display text-2xl tracking-wider font-bold transition-all duration-300 ${
                isScrolled || !isHeroPage ? 'inline-block text-navy' : 'hidden'
              }`}>
                SAMS LLC
              </span>
            </Link>
          </div>

          {/* Desktop Navigation */}
          <nav className="hidden md:flex absolute left-1/2 -translate-x-1/2 space-x-10 text-sm uppercase tracking-wider font-bold">
            <Link 
              href="/" 
              className={pathname === '/' ? activeLinkClass : linkColorClass}
            >
              Home
            </Link>
            <Link 
              href="/catalog" 
              className={pathname === '/catalog' || pathname.startsWith('/catalog/') ? activeLinkClass : linkColorClass}
            >
              Catalog
            </Link>
            <Link 
              href="/contact" 
              className={pathname === '/contact' ? activeLinkClass : linkColorClass}
            >
              Contact
            </Link>
          </nav>

          {/* Utility Icons */}
          <div className="flex items-center space-x-4 z-10">
            {/* Search */}
            <button className={`p-1.5 rounded-full ${iconColorClass}`} aria-label="Search">
              <Search className="w-5 h-5" />
            </button>

            {/* Profile / Admin Login */}
            <Link href="/admin" className={`p-1.5 rounded-full ${iconColorClass}`} aria-label="Admin Dashboard">
              <User className="w-5 h-5" />
            </Link>

            {/* Shopping Cart */}
            <button 
              onClick={() => openCart(true)} 
              className={`p-1.5 rounded-full relative ${iconColorClass}`} 
              aria-label="Open Cart"
            >
              <ShoppingBag className="w-5 h-5" />
              {mounted && getItemCount() > 0 && (
                <span className="absolute -top-1 -right-1 bg-fire text-white text-[10px] font-bold rounded-full w-5 h-5 flex items-center justify-center animate-pulse">
                  {getItemCount()}
                </span>
              )}
            </button>

            {/* Mobile Menu Toggle */}
            <button 
              onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)} 
              className={`p-1.5 rounded-full md:hidden ${iconColorClass}`}
              aria-label="Toggle Menu"
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
              href="/" 
              onClick={() => setIsMobileMenuOpen(false)}
              className={`block px-4 py-2.5 rounded-lg text-sm font-semibold tracking-wider uppercase ${
                pathname === '/' ? 'bg-gray-100 text-fire' : 'text-gray-700 hover:bg-gray-50'
              }`}
            >
              Home
            </Link>
            <Link 
              href="/catalog" 
              onClick={() => setIsMobileMenuOpen(false)}
              className={`block px-4 py-2.5 rounded-lg text-sm font-semibold tracking-wider uppercase ${
                pathname.startsWith('/catalog') ? 'bg-gray-100 text-fire' : 'text-gray-700 hover:bg-gray-50'
              }`}
            >
              Catalog
            </Link>
            <Link 
              href="/contact" 
              onClick={() => setIsMobileMenuOpen(false)}
              className={`block px-4 py-2.5 rounded-lg text-sm font-semibold tracking-wider uppercase ${
                pathname === '/contact' ? 'bg-gray-100 text-fire' : 'text-gray-700 hover:bg-gray-50'
              }`}
            >
              Contact
            </Link>
            <Link 
              href="/admin" 
              onClick={() => setIsMobileMenuOpen(false)}
              className={`block px-4 py-2.5 rounded-lg text-sm font-semibold tracking-wider uppercase ${
                pathname === '/admin' ? 'bg-gray-100 text-fire' : 'text-gray-700 hover:bg-gray-50'
              }`}
            >
              Admin Dashboard
            </Link>
          </div>
        </div>
      )}
    </header>
  );
}
