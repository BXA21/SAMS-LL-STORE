'use client';

import React, { useEffect, useState, useMemo, Suspense } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { useSearchParams, useRouter } from 'next/navigation';
import { 
  Search, 
  SlidersHorizontal, 
  X, 
  ShoppingCart, 
  Eye, 
  Grid, 
  List, 
  ChevronRight, 
  Sparkles,
  RefreshCw
} from 'lucide-react';
import { dbService } from '@/services/dbService';
import { Product, Category } from '@/types/database';
import { useCartStore } from '@/store/cartStore';

function CatalogPageContent() {
  const searchParams = useSearchParams();
  const router = useRouter();

  const [products, setProducts] = useState<Product[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [loading, setLoading] = useState(true);

  // Filter and Search States
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string>('all');
  const [selectedMake, setSelectedMake] = useState<string>('all');
  const [selectedWeight, setSelectedWeight] = useState<string>('all');
  const [selectedUseCase, setSelectedUseCase] = useState<string>('all');
  const [maxPrice, setMaxPrice] = useState<number>(50);
  const [sortBy, setSortBy] = useState<string>('featured');

  // Mobile Filter Drawer Toggle
  const [isMobileFilterOpen, setIsMobileFilterOpen] = useState(false);

  const addItem = useCartStore((state) => state.addItem);

  // Initialize selected category from URL query parameters if present
  useEffect(() => {
    const catQuery = searchParams.get('category');
    if (catQuery) {
      // Find matching category ID from slug
      const cat = categories.find(c => c.slug === catQuery);
      if (cat) {
        setSelectedCategory(cat.id);
      }
    }
  }, [searchParams, categories]);

  // Load products and categories from dbService
  useEffect(() => {
    async function loadData() {
      try {
        setLoading(true);
        const [prodsData, catsData] = await Promise.all([
          dbService.getProducts(),
          dbService.getCategories(),
        ]);
        setProducts(prodsData);
        setCategories(catsData);
      } catch (err) {
        console.error('Error loading catalog data:', err);
      } finally {
        setLoading(false);
      }
    }
    loadData();
  }, []);

  // Get all unique weights for filters
  const uniqueWeights = useMemo(() => {
    const weights = new Set<string>();
    products.forEach((p) => {
      if (p.weight) weights.add(p.weight);
    });
    return Array.from(weights);
  }, [products]);

  // Get all unique use cases for filters
  const uniqueUseCases = useMemo(() => {
    const cases = new Set<string>();
    products.forEach((p) => {
      if (p.best_for) {
        p.best_for.forEach(c => cases.add(c));
      }
    });
    return Array.from(cases);
  }, [products]);

  // Reset all filters
  const resetFilters = () => {
    setSearchQuery('');
    setSelectedCategory('all');
    setSelectedMake('all');
    setSelectedWeight('all');
    setSelectedUseCase('all');
    setMaxPrice(50);
    setSortBy('featured');
    router.replace('/catalog');
  };

  // Filtered and Sorted Products
  const filteredProducts = useMemo(() => {
    let result = [...products];

    // Search Query Filter
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      result = result.filter(
        (p) => 
          p.name.toLowerCase().includes(q) || 
          p.product_type.toLowerCase().includes(q) ||
          p.short_description?.toLowerCase().includes(q)
      );
    }

    // Category Filter
    if (selectedCategory !== 'all') {
      result = result.filter((p) => p.category_id === selectedCategory);
    }

    // Make Filter
    if (selectedMake !== 'all') {
      result = result.filter((p) => p.make.toLowerCase() === selectedMake.toLowerCase());
    }

    // Weight Filter
    if (selectedWeight !== 'all') {
      result = result.filter((p) => p.weight === selectedWeight);
    }

    // Use Case Filter
    if (selectedUseCase !== 'all') {
      result = result.filter((p) => p.best_for && p.best_for.includes(selectedUseCase));
    }

    // Price Filter
    result = result.filter((p) => Number(p.price) <= maxPrice);

    // Sorting
    if (sortBy === 'price-low') {
      result.sort((a, b) => Number(a.price) - Number(b.price));
    } else if (sortBy === 'price-high') {
      result.sort((a, b) => Number(b.price) - Number(a.price));
    } else if (sortBy === 'newest') {
      result.sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());
    } else {
      // featured - default sort (featured items first, then by name)
      result.sort((a, b) => {
        if (a.is_featured && !b.is_featured) return -1;
        if (!a.is_featured && b.is_featured) return 1;
        return a.name.localeCompare(b.name);
      });
    }

    return result;
  }, [products, searchQuery, selectedCategory, selectedMake, selectedWeight, selectedUseCase, maxPrice, sortBy]);

  const handleAddToCart = (e: React.MouseEvent, prod: Product) => {
    e.preventDefault();
    addItem({
      productId: prod.id,
      name: prod.name,
      slug: prod.slug,
      make: prod.make,
      weight: prod.weight,
      price: prod.price,
      currency: prod.currency,
      image: prod.images[0] || '/hero_bg.png',
    });
  };

  return (
    <div className="bg-white min-h-screen text-gray-900 pb-20 pt-20">
      {/* Breadcrumb banner */}
      <div className="bg-light-grey py-8 border-b border-gray-100">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center gap-2 text-xs text-gray-500 uppercase tracking-widest">
            <Link href="/" className="hover:text-fire transition-colors">Home</Link>
            <ChevronRight className="w-3.5 h-3.5" />
            <span className="text-gray-900 font-semibold">Catalog</span>
          </div>
          <h1 className="font-display text-3xl sm:text-4xl font-bold uppercase tracking-wide text-navy mt-3">
            SAMS Product Catalog
          </h1>
          <p className="text-xs sm:text-sm text-gray-500 font-light mt-1 max-w-xl">
            Explore and filter our advanced range of automatic, self-activating fire safety extinguisher balls and decorative pots.
          </p>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-12">
        <div className="flex flex-col lg:flex-row gap-10">
          
          {/* LEFT COLUMN: DESKTOP FILTERS */}
          <aside className="hidden lg:block w-[280px] shrink-0 space-y-8 border-r border-gray-100 pr-8">
            <div className="flex items-center justify-between pb-4 border-b border-gray-150">
              <h2 className="font-display text-base uppercase tracking-wider font-bold text-navy flex items-center gap-2">
                <SlidersHorizontal className="w-4 h-4 text-fire" />
                Filters
              </h2>
              <button 
                onClick={resetFilters} 
                className="text-xs text-fire hover:text-navy hover:underline transition-colors font-medium"
              >
                Reset All
              </button>
            </div>

            {/* Category Filter */}
            <div className="space-y-3">
              <h3 className="text-xs uppercase tracking-widest font-bold text-gray-700">Category</h3>
              <div className="space-y-2">
                <label className="flex items-center gap-2.5 text-sm text-gray-600 cursor-pointer hover:text-navy">
                  <input
                    type="radio"
                    name="category"
                    checked={selectedCategory === 'all'}
                    onChange={() => setSelectedCategory('all')}
                    className="accent-fire w-4 h-4"
                  />
                  <span>All Categories</span>
                </label>
                {categories.map((cat) => (
                  <label key={cat.id} className="flex items-center gap-2.5 text-sm text-gray-600 cursor-pointer hover:text-navy">
                    <input
                      type="radio"
                      name="category"
                      checked={selectedCategory === cat.id}
                      onChange={() => setSelectedCategory(cat.id)}
                      className="accent-fire w-4 h-4"
                    />
                    <span>{cat.name}</span>
                  </label>
                ))}
              </div>
            </div>

            {/* Make Filter */}
            <div className="space-y-3">
              <h3 className="text-xs uppercase tracking-widest font-bold text-gray-700">Make / Brand</h3>
              <div className="space-y-2">
                <label className="flex items-center gap-2.5 text-sm text-gray-600 cursor-pointer hover:text-navy">
                  <input
                    type="radio"
                    name="make"
                    checked={selectedMake === 'all'}
                    onChange={() => setSelectedMake('all')}
                    className="accent-fire w-4 h-4"
                  />
                  <span>All Brands</span>
                </label>
                <label className="flex items-center gap-2.5 text-sm text-gray-600 cursor-pointer hover:text-navy">
                  <input
                    type="radio"
                    name="make"
                    checked={selectedMake === 'gfo'}
                    onChange={() => setSelectedMake('gfo')}
                    className="accent-fire w-4 h-4"
                  />
                  <span>GFO</span>
                </label>
                <label className="flex items-center gap-2.5 text-sm text-gray-600 cursor-pointer hover:text-navy">
                  <input
                    type="radio"
                    name="make"
                    checked={selectedMake === 'afo'}
                    onChange={() => setSelectedMake('afo')}
                    className="accent-fire w-4 h-4"
                  />
                  <span>AFO</span>
                </label>
              </div>
            </div>

            {/* Weight Filter */}
            <div className="space-y-3">
              <h3 className="text-xs uppercase tracking-widest font-bold text-gray-700">Weight</h3>
              <select
                value={selectedWeight}
                onChange={(e) => setSelectedWeight(e.target.value)}
                className="w-full bg-light-grey border border-gray-200 rounded-md p-2 text-sm text-gray-700 focus:outline-none focus:border-fire"
              >
                <option value="all">All Weights</option>
                {uniqueWeights.map(w => (
                  <option key={w} value={w}>{w}</option>
                ))}
              </select>
            </div>

            {/* Price Filter */}
            <div className="space-y-3">
              <div className="flex justify-between text-xs uppercase tracking-widest font-bold text-gray-700">
                <span>Max Price</span>
                <span className="text-fire font-bold">{maxPrice.toFixed(3)} OMR</span>
              </div>
              <input
                type="range"
                min="10"
                max="50"
                step="1"
                value={maxPrice}
                onChange={(e) => setMaxPrice(Number(e.target.value))}
                className="w-full accent-fire h-1.5 bg-gray-200 rounded-lg appearance-none cursor-pointer"
              />
              <div className="flex justify-between text-[10px] text-gray-400 font-semibold">
                <span>10.000 OMR</span>
                <span>50.000 OMR</span>
              </div>
            </div>

            {/* Use Case Filter */}
            <div className="space-y-3">
              <h3 className="text-xs uppercase tracking-widest font-bold text-gray-700">Best Use Case</h3>
              <select
                value={selectedUseCase}
                onChange={(e) => setSelectedUseCase(e.target.value)}
                className="w-full bg-light-grey border border-gray-200 rounded-md p-2 text-sm text-gray-700 focus:outline-none focus:border-fire"
              >
                <option value="all">All Environments</option>
                {uniqueUseCases.map(uc => (
                  <option key={uc} value={uc}>{uc}</option>
                ))}
              </select>
            </div>
          </aside>

          {/* RIGHT COLUMN: SEARCH + PRODUCT GRID */}
          <main className="flex-grow space-y-6">
            
            {/* SEARCH AND GRID SUMMARY BAR */}
            <div className="flex flex-col sm:flex-row gap-4 justify-between items-center bg-light-grey p-4 rounded-xl border border-gray-150">
              {/* Search Bar */}
              <div className="relative w-full sm:max-w-xs">
                <input
                  type="text"
                  placeholder="Search products..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full bg-white border border-gray-200 rounded-lg py-2 pl-9 pr-4 text-sm focus:outline-none focus:border-fire text-gray-800"
                />
                <Search className="absolute left-3 top-2.5 w-4 h-4 text-gray-450" />
                {searchQuery && (
                  <button 
                    onClick={() => setSearchQuery('')}
                    className="absolute right-3 top-2.5 text-gray-400 hover:text-gray-900"
                  >
                    <X className="w-4 h-4" />
                  </button>
                )}
              </div>

              {/* Summary & Sorting */}
              <div className="flex items-center justify-between sm:justify-end gap-6 w-full sm:w-auto">
                <span className="text-xs text-gray-500 font-medium whitespace-nowrap">
                  {filteredProducts.length} Products Found
                </span>

                <div className="flex items-center gap-2">
                  <label className="text-xs text-gray-500 font-semibold whitespace-nowrap hidden sm:inline">Sort By:</label>
                  <select
                    value={sortBy}
                    onChange={(e) => setSortBy(e.target.value)}
                    className="bg-white border border-gray-200 rounded-lg p-2 text-xs font-semibold focus:outline-none focus:border-fire text-gray-700"
                  >
                    <option value="featured">Featured</option>
                    <option value="price-low">Price: Low to High</option>
                    <option value="price-high">Price: High to Low</option>
                    <option value="newest">Newest</option>
                  </select>
                </div>

                {/* Mobile Filter Button */}
                <button
                  onClick={() => setIsMobileFilterOpen(true)}
                  className="lg:hidden bg-navy hover:bg-fire text-white p-2 rounded-lg flex items-center justify-center gap-1.5 text-xs font-bold transition-colors"
                >
                  <SlidersHorizontal className="w-4 h-4" />
                  Filter
                </button>
              </div>
            </div>

            {/* PRODUCT GRID */}
            {loading ? (
              <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-6">
                {[1, 2, 3, 4, 5, 6].map((i) => (
                  <div key={i} className="animate-pulse space-y-4">
                    <div className="bg-gray-150 aspect-[4/3] rounded-xl" />
                    <div className="h-4 bg-gray-150 rounded w-1/3" />
                    <div className="h-6 bg-gray-150 rounded w-2/3" />
                    <div className="h-4 bg-gray-150 rounded w-1/4" />
                  </div>
                ))}
              </div>
            ) : filteredProducts.length === 0 ? (
              /* EMPTY STATE */
              <div className="py-20 flex flex-col items-center justify-center text-center space-y-4 bg-light-grey rounded-2xl border border-gray-150">
                <div className="bg-white p-5 rounded-full text-gray-400 shadow-sm border border-gray-100">
                  <Search className="w-10 h-10" />
                </div>
                <div className="space-y-1">
                  <h3 className="font-display text-lg font-bold uppercase tracking-wider text-navy">No products match your criteria</h3>
                  <p className="text-sm text-gray-500 max-w-[320px] mx-auto font-light leading-relaxed">
                    Try adjusting your filters, clearing your search query, or resetting all options.
                  </p>
                </div>
                <button
                  onClick={resetFilters}
                  className="bg-fire hover:bg-fire/90 text-white text-xs uppercase tracking-widest font-bold px-6 py-3 rounded-md transition-colors shadow-md flex items-center gap-1.5"
                >
                  <RefreshCw className="w-3.5 h-3.5" />
                  Reset Filters
                </button>
              </div>
            ) : (
              /* GRID LIST */
              <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-6">
                {filteredProducts.map((prod) => (
                  <div 
                    key={prod.id} 
                    className="group bg-light-grey rounded-xl overflow-hidden border border-gray-100/50 hover:shadow-xl hover:border-fire/20 transition-all duration-300 flex flex-col justify-between"
                  >
                    {/* Image */}
                    <div className="relative aspect-[4/3] bg-gray-200 overflow-hidden shrink-0 border-b border-gray-100">
                      <Image 
                        src={prod.images[0] || '/hero_bg.png'} 
                        alt={prod.name}
                        fill
                        className="object-cover group-hover:scale-105 transition-transform duration-500"
                      />
                      {prod.is_featured && (
                        <span className="absolute top-4 left-4 bg-navy text-white text-[10px] uppercase font-bold tracking-widest px-2.5 py-1 rounded flex items-center gap-1 shadow-md">
                          <Sparkles className="w-3 h-3 text-safety" />
                          Featured
                        </span>
                      )}
                      {/* Hover quick links */}
                      <div className="absolute inset-0 bg-navy/20 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-3">
                        <Link 
                          href={`/catalog/${prod.slug}`}
                          className="bg-white p-3 rounded-full shadow-md text-navy hover:text-fire hover:scale-110 transition-all"
                          title="View Details"
                        >
                          <Eye className="w-5 h-5" />
                        </Link>
                        <button
                          onClick={(e) => handleAddToCart(e, prod)}
                          className="bg-white p-3 rounded-full shadow-md text-navy hover:text-fire hover:scale-110 transition-all"
                          title="Add to Cart"
                        >
                          <ShoppingCart className="w-5 h-5" />
                        </button>
                      </div>
                    </div>

                    {/* Content */}
                    <div className="p-6 space-y-4 flex-grow flex flex-col justify-between">
                      <div className="space-y-1">
                        <div className="flex items-center justify-between text-xs text-gray-500">
                          <span>Make: <strong className="font-semibold text-gray-700">{prod.make}</strong></span>
                          <span>Life: <strong className="font-semibold text-gray-700">{prod.life_years} Years</strong></span>
                        </div>
                        <h3 className="font-display text-base font-bold uppercase tracking-wide text-navy group-hover:text-fire transition-colors line-clamp-1">
                          <Link href={`/catalog/${prod.slug}`}>
                            {prod.name}
                          </Link>
                        </h3>
                        <p className="text-xs text-gray-500 font-light line-clamp-2 leading-relaxed">
                          {prod.short_description}
                        </p>
                      </div>

                      <div className="pt-4 border-t border-gray-100 flex items-center justify-between">
                        <div className="space-y-0.5">
                          <span className="text-[9px] text-gray-400 uppercase tracking-widest font-semibold block">Selling Price</span>
                          <span className="text-base font-extrabold text-navy">
                            {Number(prod.price).toFixed(3)} <span className="text-[10px] font-semibold">{prod.currency}</span>
                          </span>
                        </div>
                        
                        <button 
                          onClick={(e) => handleAddToCart(e, prod)}
                          className="bg-navy hover:bg-fire hover:scale-105 text-white text-[10px] uppercase tracking-widest font-bold px-4 py-2.5 rounded-md flex items-center gap-1.5 transition-all shadow-md"
                        >
                          <ShoppingCart className="w-3.5 h-3.5" />
                          Add
                        </button>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </main>
        </div>
      </div>

      {/* MOBILE FILTER DRAWER */}
      {isMobileFilterOpen && (
        <div className="fixed inset-0 z-50 lg:hidden flex justify-end">
          {/* Overlay */}
          <div 
            onClick={() => setIsMobileFilterOpen(false)}
            className="absolute inset-0 bg-black/50"
          />

          {/* Drawer content */}
          <div className="relative w-full max-w-sm bg-white h-full flex flex-col justify-between p-6 shadow-2xl overflow-y-auto text-gray-900 z-10">
            <div className="space-y-8">
              <div className="flex items-center justify-between pb-4 border-b border-gray-150">
                <h2 className="font-display text-base uppercase tracking-wider font-bold text-navy flex items-center gap-2">
                  <SlidersHorizontal className="w-4 h-4 text-fire" />
                  Filter Options
                </h2>
                <button 
                  onClick={() => setIsMobileFilterOpen(false)}
                  className="p-1 rounded-full hover:bg-gray-100 text-gray-400 hover:text-gray-900"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              {/* Category */}
              <div className="space-y-3">
                <h3 className="text-xs uppercase tracking-widest font-bold text-gray-700">Category</h3>
                <div className="space-y-2">
                  <label className="flex items-center gap-2.5 text-sm text-gray-600 cursor-pointer">
                    <input
                      type="radio"
                      name="category-m"
                      checked={selectedCategory === 'all'}
                      onChange={() => setSelectedCategory('all')}
                      className="accent-fire w-4 h-4"
                    />
                    <span>All Categories</span>
                  </label>
                  {categories.map((cat) => (
                    <label key={cat.id} className="flex items-center gap-2.5 text-sm text-gray-600 cursor-pointer">
                      <input
                        type="radio"
                        name="category-m"
                        checked={selectedCategory === cat.id}
                        onChange={() => setSelectedCategory(cat.id)}
                        className="accent-fire w-4 h-4"
                      />
                      <span>{cat.name}</span>
                    </label>
                  ))}
                </div>
              </div>

              {/* Brand */}
              <div className="space-y-3">
                <h3 className="text-xs uppercase tracking-widest font-bold text-gray-700">Make / Brand</h3>
                <div className="space-y-2">
                  <label className="flex items-center gap-2.5 text-sm text-gray-600 cursor-pointer">
                    <input
                      type="radio"
                      name="make-m"
                      checked={selectedMake === 'all'}
                      onChange={() => setSelectedMake('all')}
                      className="accent-fire w-4 h-4"
                    />
                    <span>All Brands</span>
                  </label>
                  <label className="flex items-center gap-2.5 text-sm text-gray-600 cursor-pointer">
                    <input
                      type="radio"
                      name="make-m"
                      checked={selectedMake === 'gfo'}
                      onChange={() => setSelectedMake('gfo')}
                      className="accent-fire w-4 h-4"
                    />
                    <span>GFO</span>
                  </label>
                  <label className="flex items-center gap-2.5 text-sm text-gray-600 cursor-pointer">
                    <input
                      type="radio"
                      name="make-m"
                      checked={selectedMake === 'afo'}
                      onChange={() => setSelectedMake('afo')}
                      className="accent-fire w-4 h-4"
                    />
                    <span>AFO</span>
                  </label>
                </div>
              </div>

              {/* Weight */}
              <div className="space-y-3">
                <h3 className="text-xs uppercase tracking-widest font-bold text-gray-700">Weight</h3>
                <select
                  value={selectedWeight}
                  onChange={(e) => setSelectedWeight(e.target.value)}
                  className="w-full bg-light-grey border border-gray-200 rounded-md p-2.5 text-sm text-gray-700 focus:outline-none"
                >
                  <option value="all">All Weights</option>
                  {uniqueWeights.map(w => (
                    <option key={w} value={w}>{w}</option>
                  ))}
                </select>
              </div>

              {/* Price */}
              <div className="space-y-3">
                <div className="flex justify-between text-xs uppercase tracking-widest font-bold text-gray-700">
                  <span>Max Price</span>
                  <span className="text-fire font-bold">{maxPrice.toFixed(3)} OMR</span>
                </div>
                <input
                  type="range"
                  min="10"
                  max="50"
                  step="1"
                  value={maxPrice}
                  onChange={(e) => setMaxPrice(Number(e.target.value))}
                  className="w-full accent-fire h-1.5 bg-gray-200 rounded-lg appearance-none cursor-pointer"
                />
              </div>

              {/* Use Case */}
              <div className="space-y-3">
                <h3 className="text-xs uppercase tracking-widest font-bold text-gray-700">Best Use Case</h3>
                <select
                  value={selectedUseCase}
                  onChange={(e) => setSelectedUseCase(e.target.value)}
                  className="w-full bg-light-grey border border-gray-200 rounded-md p-2.5 text-sm text-gray-700 focus:outline-none"
                >
                  <option value="all">All Environments</option>
                  {uniqueUseCases.map(uc => (
                    <option key={uc} value={uc}>{uc}</option>
                  ))}
                </select>
              </div>
            </div>

            <div className="pt-6 border-t border-gray-150 flex gap-4 mt-8 shrink-0">
              <button
                onClick={resetFilters}
                className="flex-1 bg-gray-100 hover:bg-gray-200 text-gray-700 py-3 rounded-lg text-xs font-bold uppercase tracking-wider transition-colors"
              >
                Reset
              </button>
              <button
                onClick={() => setIsMobileFilterOpen(false)}
                className="flex-1 bg-navy hover:bg-fire text-white py-3 rounded-lg text-xs font-bold uppercase tracking-wider transition-colors"
              >
                Apply
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default function CatalogPage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen bg-white flex items-center justify-center">
        <RefreshCw className="w-10 h-10 animate-spin text-fire" />
      </div>
    }>
      <CatalogPageContent />
    </Suspense>
  );
}
