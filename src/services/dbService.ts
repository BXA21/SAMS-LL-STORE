import { supabase, isSupabaseConfigured } from '@/lib/supabase';
import { 
  Category, 
  Product, 
  Inquiry, 
  Order, 
  Certificate, 
  Testimonial, 
  FAQ, 
  SiteSetting 
} from '@/types/database';

// -----------------------------------------------------------------------------
// LOCAL STORAGE & SEED MOCK DATA FALLBACKS
// -----------------------------------------------------------------------------

const DEFAULT_CATEGORIES: Category[] = [
  {
    id: '11111111-1111-1111-1111-111111111111',
    name: 'Fire Extinguisher Balls',
    slug: 'fire-extinguisher-balls',
    description: 'Automatic fire extinguishing balls designed to activate on contact with flames, providing fast protection for various environments.',
    image_url: '/hero_bg.png',
    is_active: true,
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  },
  {
    id: '22222222-2222-2222-2222-222222222222',
    name: 'Fire Extinguisher Flower Pots',
    slug: 'fire-extinguisher-flower-pots',
    description: 'Decorative fire safety products designed to blend elegantly into interiors while serving as automatic fire suppression devices.',
    image_url: '/hero_bg.png',
    is_active: true,
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  }
];

const DEFAULT_PRODUCTS: Product[] = [
  {
    id: 'p1',
    name: 'GFO Baby Fire Ball 400 gms',
    slug: 'gfo-baby-fire-ball-400-gms',
    make: 'GFO',
    category_id: '11111111-1111-1111-1111-111111111111',
    product_type: 'Fire Extinguisher Ball',
    short_description: 'Compact self-activating baby fire safety ball designed for vehicles, electrical panels, and tight spaces.',
    overview: 'The GFO Baby Fire Ball 400 gms is a compact automatic fire suppression product designed for small spaces, car engines, and home electrical cabinets. It activates instantly when it comes into contact with open flames, helping suppress fire before it can spread.',
    price: 15.600,
    currency: 'OMR',
    weight: '400 gms',
    life_years: 5,
    quantity: 1,
    stock: 100,
    images: [
      '/products/image_1_gfo_main_image.png',
      '/products/image_2_gfro_kitchen_image.png',
      '/products/image_3_gfo_electrical_socket_image.png',
      '/products/image_4_gfo_car_image.png',
      '/products/image_5_gfo_server_room_image.png'
    ],
    key_features: ['Self-activating fire suppression', 'Compact and ultra-lightweight', 'Suitable for vehicle and small-space use', 'No special training required', '5-year maintenance-free product life', 'Non-toxic extinguishing powder'],
    specifications: { "Product Type": "Fire Extinguisher Ball", "Make": "GFO", "Weight": "400 gms", "Life": "5 years", "Activation": "Flame contact", "Use": "Automatic fire suppression", "Quantity": "1 unit" },
    best_for: ['Cars', 'Small cabinets', 'Electrical panels', 'Kitchen corners', 'Compact high-risk spaces'],
    safety_notes: ['Designed to support fire suppression', 'Helps provide automatic fire response', 'Can help reduce fire spread', 'Suitable as a supplementary safety measure', 'Consult SAMS for proper placement guidance'],
    usage_areas: ['Vehicles', 'Electrical panels', 'Kitchens', 'Homes', 'Offices'],
    is_featured: true,
    is_active: true,
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  },
  {
    id: 'p2',
    name: 'GFO Fire Ball Extinguisher 1.3 kg',
    slug: 'gfo-fire-ball-extinguisher-1-3-kg',
    make: 'GFO',
    category_id: '11111111-1111-1111-1111-111111111111',
    product_type: 'Fire Extinguisher Ball',
    short_description: 'A versatile automatic fire safety ball ideal for homes, kitchens, and general fire-risk zones.',
    overview: 'The GFO Fire Ball Extinguisher 1.3 kg is an automatic fire safety solution suitable for homes, offices, kitchens, stores, and general fire-risk zones. It can be placed or mounted in areas where fast automatic fire response is needed.',
    price: 19.500,
    currency: 'OMR',
    weight: '1.3 kgs',
    life_years: 5,
    quantity: 1,
    stock: 100,
    images: [
      '/products/gfc_ball_image_1.png',
      '/products/gfc_ball_image_2.png',
      '/products/gfc_ball_image_3.png',
      '/products/gfc_ball_image_4.png'
    ],
    key_features: ['Activates automatically on flame contact', 'Fast fire suppression support', 'Lightweight and easy to position', 'Suitable for indoor and selected outdoor spaces', 'No manual operation required', '5-year product life', 'Non-toxic and eco-friendly design'],
    specifications: { "Product Type": "Fire Extinguisher Ball", "Make": "GFO", "Weight": "1.3 kgs", "Life": "5 years", "Activation": "Flame contact", "Use": "Automatic fire suppression", "Quantity": "1 unit" },
    best_for: ['Homes', 'Offices', 'Kitchens', 'Shops', 'Small warehouses', 'Electrical areas'],
    safety_notes: ['Designed to support fire suppression', 'Helps provide automatic fire response', 'Can help reduce fire spread', 'Suitable as a supplementary safety measure', 'Consult SAMS for proper placement guidance'],
    usage_areas: ['Homes', 'Offices', 'Kitchens', 'Warehouses', 'Shops'],
    is_featured: true,
    is_active: true,
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  },
  {
    id: 'p3',
    name: 'AFO Fire Ball Extinguisher 1.5 kg',
    slug: 'afo-fire-ball-extinguisher-1-5-kg',
    make: 'AFO',
    category_id: '11111111-1111-1111-1111-111111111111',
    product_type: 'Fire Extinguisher Ball',
    short_description: 'An automatic fire extinguisher ball optimized for residential, commercial, and shop security.',
    overview: 'The AFO Fire Ball Extinguisher 1.5 kg is a practical automatic fire suppression product designed for quick activation during fire emergencies. It provides added protection in residential, commercial, and retail environments.',
    price: 23.400,
    currency: 'OMR',
    weight: '1.5 kgs',
    life_years: 5,
    quantity: 1,
    stock: 100,
    images: [
      '/products/afo_image_1.png',
      '/products/afo_image_2.png',
      '/products/afo_image_3.png',
      '/products/afo_image_4.png',
      '/products/afo_image_5.png'
    ],
    key_features: ['Automatic activation after flame contact', 'Simple placement and handling', 'Suitable for multiple fire-risk environments', '5-year product life', 'No special training required', 'Helps reduce response time during emergencies'],
    specifications: { "Product Type": "Fire Extinguisher Ball", "Make": "AFO", "Weight": "1.5 kgs", "Life": "5 years", "Activation": "Flame contact", "Use": "Automatic fire suppression", "Quantity": "1 unit" },
    best_for: ['Homes', 'Offices', 'Retail shops', 'Electrical rooms', 'Kitchens', 'Storage areas'],
    safety_notes: ['Designed to support fire suppression', 'Helps provide automatic fire response', 'Can help reduce fire spread', 'Suitable as a supplementary safety measure', 'Consult SAMS for proper placement guidance'],
    usage_areas: ['Homes', 'Offices', 'Shops', 'Electrical panels', 'Kitchens'],
    is_featured: true,
    is_active: true,
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  },
  {
    id: 'p4',
    name: 'GFO Green Fire Ball 1.3 kg',
    slug: 'gfo-green-fire-ball-1-3-kg',
    make: 'GFO',
    category_id: '11111111-1111-1111-1111-111111111111',
    product_type: 'Fire Extinguisher Ball',
    short_description: 'Vibrant blue-green fire safety ball optimized for commercial shops and electrical panels.',
    overview: 'The GFO Green Fire Ball 1.3 kg provides passive automatic protection for spaces with active electrical or chemical risks. Features high-visibility green branding and robust rapid-fuse activation.',
    price: 21.450,
    currency: 'OMR',
    weight: '1.3 kgs',
    life_years: 5,
    quantity: 1,
    stock: 100,
    images: [
      '/products/gfo_green_fire_ball_1.jpg',
      '/products/gfo_green_fire_ball_2_kitchen.jpg',
      '/products/gfo_green_fire_ball_3_electrical.jpg',
      '/products/gfo_green_fire_ball_4_car.jpg',
      '/products/gfo_green_fire_ball_5_server_room.jpg'
    ],
    key_features: ['Special Green Fire Off branding', 'High visibility safety color', 'Activates within 3-5 seconds on flame contact', 'Suitable for indoor installations', 'Maintenance-free 5-year life'],
    specifications: { "Product Type": "Fire Extinguisher Ball", "Make": "GFO", "Weight": "1.3 kgs", "Life": "5 years", "Activation": "Flame contact", "Use": "Automatic fire suppression", "Quantity": "1 unit" },
    best_for: ['Retail shops', 'Commercial buildings', 'Switchboards', 'Server racks'],
    safety_notes: ['Designed to support fire suppression', 'Helps provide automatic fire response', 'Can help reduce fire spread', 'Suitable as a supplementary safety measure'],
    usage_areas: ['Shops', 'Offices', 'Electrical panels', 'Homes'],
    is_featured: false,
    is_active: true,
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  },
  {
    id: 'p5',
    name: 'GFO Fire Drum 5 kg',
    slug: 'gfo-fire-drum-5-kg',
    make: 'GFO',
    category_id: '11111111-1111-1111-1111-111111111111',
    product_type: 'Fire Drum',
    short_description: 'Heavy-duty cylindrical fire suppression drum designed for passive industrial safety coverage.',
    overview: 'The GFO Fire Drum 5 kg is a heavy-duty automatic fire suppression cylindrical drum designed for larger industrial spaces, factories, and warehouses. It triggers automatically when exposed to open flame.',
    price: 52.000,
    currency: 'OMR',
    weight: '5 kgs',
    life_years: 5,
    quantity: 1,
    stock: 100,
    images: [
      '/products/gfo_fire_drum_1.jpg',
      '/products/gfo_fire_drum_2_mall.jpg',
      '/products/gfo_fire_drum_3_industrial.jpg',
      '/products/gfo_fire_drum_4_warehouse.jpg',
      '/products/gfo_fire_drum_5_parking.jpg'
    ],
    key_features: ['Cylindrical heavy-duty body', 'High capacity dry chemical charge', 'Self-activates on flame contact', 'Designed for passive industrial coverage', '5-year product life'],
    specifications: { "Product Type": "Fire Safety Drum", "Make": "GFO", "Weight": "5 kgs", "Life": "5 years", "Activation": "Flame contact", "Use": "Industrial automatic fire suppression", "Quantity": "1 unit" },
    best_for: ['Factories', 'Warehouses', 'Large electrical rooms', 'Storage units', 'Industrial workshops'],
    safety_notes: ['Designed to support fire suppression in large zones', 'Can help contain industrial fires before spread', 'Consult SAMS for warehouse placement layouts'],
    usage_areas: ['Factories', 'Warehouses', 'Industrial spaces', 'Server rooms'],
    is_featured: false,
    is_active: true,
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  },
  {
    id: 'p6',
    name: 'GFO Flowerpot Extinguisher 1.3 kg',
    slug: 'gfo-flowerpot-extinguisher-1-3-kg',
    make: 'GFO',
    category_id: '22222222-2222-2222-2222-222222222222',
    product_type: 'Fire Extinguisher Flower Pot',
    short_description: 'An elegant, decorative automatic fire extinguishing pot matching room decor.',
    overview: 'The GFO Flowerpot Extinguisher 1.3 kg combines safety and decoration in one product. It is designed to look like a flower pot while functioning as an automatic fire suppression device when exposed to flames.',
    price: 23.400,
    currency: 'OMR',
    weight: '1.3 kgs',
    life_years: 5,
    quantity: 1,
    stock: 100,
    images: [
      '/products/flower_image_1.png',
      '/products/flower_image_2_kitchen.png',
      '/products/flower_image_3_server_room.png'
    ],
    key_features: ['Decorative fire safety product', 'Blends into home and office interiors', 'Self-activating fire suppression', 'Lightweight and easy to place', 'No special training required', '5-year product life', 'Suitable for visible indoor placement'],
    specifications: { "Product Type": "Fire Extinguisher Flower Pot", "Make": "GFO", "Weight": "1.3 kgs", "Life": "5 years", "Activation": "Flame contact", "Use": "Decorative automatic fire suppression", "Quantity": "1 unit" },
    best_for: ['Homes', 'Offices', 'Reception areas', 'Restaurants', 'Decorative indoor spaces'],
    safety_notes: ['Designed to support fire suppression', 'Helps provide automatic fire response', 'Can help reduce fire spread', 'Suitable as a supplementary safety measure', 'Consult SAMS for proper placement guidance'],
    usage_areas: ['Homes', 'Offices', 'Restaurants', 'Shops'],
    is_featured: true,
    is_active: true,
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  }
];

const DEFAULT_TESTIMONIALS: Testimonial[] = [
  {
    id: 't1',
    name: 'Rahul Kumar',
    position: 'Safety Director',
    company: 'Oman Logistics',
    message: 'SAMS exceeded my expectations. Their fire safety products are top-notch, and their customer service is excellent. Highly recommended.',
    rating: 5,
    is_active: true,
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  },
  {
    id: 't2',
    name: 'Mohsin Abbas',
    position: 'Operations Manager',
    company: 'Muscat Residences',
    message: 'We have been using SAMS fire extinguishers for years, and they have never let us down. Reliable and easy to use.',
    rating: 5,
    is_active: true,
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  },
  {
    id: 't3',
    name: 'Ashutosh Rai',
    position: 'Facility Head',
    company: 'Industrial Hub Sohar',
    message: 'The effectiveness of SAMS fire suppression devices is impressive. They provide peace of mind knowing we are protected in emergencies.',
    rating: 5,
    is_active: true,
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  }
];

const DEFAULT_FAQS: FAQ[] = [
  {
    id: 'f1',
    question: 'What is the effectiveness of fire balls?',
    answer: 'Fire balls are designed to provide an automatic fire-fighting response. They activate when they come into contact with flames, making them an effective supplementary safety measure for high-risk fire areas.',
    order_index: 1,
    is_active: true,
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  },
  {
    id: 'f2',
    question: 'How effective is a fire extinguisher ball?',
    answer: 'A fire extinguisher ball is designed to suppress fire quickly after flame contact. When flames touch the ball, the fuse mechanism activates and releases extinguishing powder within seconds.',
    order_index: 2,
    is_active: true,
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  },
  {
    id: 'f3',
    question: 'What is a fire ball extinguisher?',
    answer: 'A fire ball extinguisher is a spherical fire suppression device used during fire emergencies. It works similarly to traditional extinguishers but is designed for automatic activation and easy placement.',
    order_index: 3,
    is_active: true,
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  },
  {
    id: 'f4',
    question: 'Does the product require training?',
    answer: 'No special training is required. The product is designed for simple use and automatic activation. Anyone can place it or throw it in case of an emergency.',
    order_index: 4,
    is_active: true,
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  },
  {
    id: 'f5',
    question: 'Where can it be placed?',
    answer: 'It can be placed near kitchens, electrical panels, vehicles, warehouses, factories, server rooms, offices, homes, and other fire-prone areas.',
    order_index: 5,
    is_active: true,
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  },
  {
    id: 'f6',
    question: 'How long is the product life?',
    answer: 'The active lifespan of both our automatic fire balls and decorative flower pots is 5 years. There is no maintenance or refilling required during this period.',
    order_index: 6,
    is_active: true,
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  },
  {
    id: 'f7',
    question: 'Can it be used in vehicles?',
    answer: 'Yes, the 400 gms compact ball is specifically recommended for vehicles, engine compartments, and car trunks due to its lightweight and portable design.',
    order_index: 7,
    is_active: true,
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  },
  {
    id: 'f8',
    question: 'Can it be used near electrical panels?',
    answer: 'Yes, placing it inside or directly above electrical panels is highly effective as it will automatically suppress electrical fires at the source before they can spread.',
    order_index: 8,
    is_active: true,
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  }
];

const DEFAULT_CERTIFICATES: Certificate[] = [
  {
    id: 'c1',
    title: 'MSDS Certificate',
    description: 'Material Safety Data Sheet confirming the non-toxic nature of the fire extinguishing agents.',
    image_url: '/hero_bg.png',
    file_url: '#',
    certificate_type: 'Safety Documentation',
    is_active: true,
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  },
  {
    id: 'c2',
    title: 'Product Test Certificate',
    description: 'Official laboratory test document confirming the 3-5 seconds flame contact activation response.',
    image_url: '/hero_bg.png',
    file_url: '#',
    certificate_type: 'Performance Certificate',
    is_active: true,
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  },
  {
    id: 'c3',
    title: 'UL Certificate DCP ABC',
    description: 'Underwriters Laboratories standard validation for dry chemical powder suppression agents.',
    image_url: '/hero_bg.png',
    file_url: '#',
    certificate_type: 'Quality Standard',
    is_active: true,
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  },
  {
    id: 'c4',
    title: 'Certificate 4',
    description: 'Standard safety compliance documentation from SAMS.',
    image_url: '/hero_bg.png',
    file_url: '#',
    certificate_type: 'Compliance',
    is_active: true,
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  },
  {
    id: 'c5',
    title: 'Certificate 5',
    description: 'Official quality assurance document from manufacturer.',
    image_url: '/hero_bg.png',
    file_url: '#',
    certificate_type: 'Compliance',
    is_active: true,
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  }
];

const DEFAULT_SITE_SETTINGS: SiteSetting[] = [
  { id: 's1', key: 'hero_headline', value: 'PROTECT WHAT\nMATTERS\nBEFORE FIRE\nSPREADS', updated_at: new Date().toISOString() },
  { id: 's2', key: 'hero_subtitle', value: 'Explore automatic fire extinguishing solutions designed to activate quickly, help reduce fire spread, and provide peace of mind for homes, offices, vehicles, warehouses, and industrial spaces.', updated_at: new Date().toISOString() },
  { id: 's3', key: 'contact_phone', value: '+968 77554070', updated_at: new Date().toISOString() },
  { id: 's4', key: 'contact_whatsapp', value: '+968 77554070', updated_at: new Date().toISOString() },
  { id: 's5', key: 'contact_email', value: 'info@samsoman.com', updated_at: new Date().toISOString() },
  { id: 's6', key: 'contact_address', value: 'Unit No. 2, Al Shumoor Building, Way no 2706, CBD, Ruwi, Muscat, Sultanate of Oman', updated_at: new Date().toISOString() },
  { id: 's7', key: 'currency', value: 'OMR', updated_at: new Date().toISOString() }
];

// Helper to initialize local storage mock data on client
function getLocalData<T>(key: string, defaultValue: T[]): T[] {
  if (typeof window === 'undefined') return defaultValue;
  let data = localStorage.getItem(key);
  
  // Auto-update local storage if we updated the default product images or prices
  if (key === 'sams_products' && data) {
    try {
      const parsed = JSON.parse(data) as any[];
      const hasOldImages = parsed.some(p => 
        p.images && p.images.some((img: string) => 
          img.includes('gfo_baby_fire_ball.png') || 
          img.includes('gfo_fire_ball.png') || 
          img.includes('afo_fire_ball.png') || 
          img.includes('gfo_flowerpot_extinguisher.png') ||
          img.includes('gfo_green_fire_ball.png') ||
          img.includes('gfo_fire_drum.png')
        )
      );
      const hasOldPrices = parsed.some(p => 
        p.price === 12 || p.price === 15 || p.price === 18 || p.price === 16.5 || p.price === 40
      );
      if (hasOldImages || hasOldPrices) {
        console.log('Old product data or prices detected. Resetting local storage product data.');
        localStorage.removeItem('sams_products');
        data = null;
      }
    } catch (e) {
      console.error('Error parsing local product data:', e);
    }
  }

  // Auto-update site settings if they contain the old phone number or email
  if (key === 'sams_site_settings' && data) {
    try {
      const parsed = JSON.parse(data) as any[];
      const hasOldSettings = parsed.some(s => 
        s.value === '+968 24000000' || s.value === 'info@sams-oman.com'
      );
      if (hasOldSettings) {
        console.log('Old site settings detected. Resetting local storage settings data.');
        localStorage.removeItem('sams_site_settings');
        data = null;
      }
    } catch (e) {
      console.error('Error parsing local site settings:', e);
    }
  }

  if (!data) {
    localStorage.setItem(key, JSON.stringify(defaultValue));
    return defaultValue;
  }
  return JSON.parse(data);
}

function setLocalData<T>(key: string, value: T[]): void {
  if (typeof window !== 'undefined') {
    localStorage.setItem(key, JSON.stringify(value));
  }
}

// -----------------------------------------------------------------------------
// UNIFIED DATA SERVICE INTERFACE
// -----------------------------------------------------------------------------

export const dbService = {
  // --- CATEGORIES ---
  async getCategories(): Promise<Category[]> {
    if (isSupabaseConfigured) {
      const { data, error } = await supabase
        .from('categories')
        .select('*')
        .eq('is_active', true);
      if (!error && data) return data;
      console.error('Supabase categories fetch error, using local fallback:', error);
    }
    return getLocalData('sams_categories', DEFAULT_CATEGORIES).filter(c => c.is_active);
  },

  async getAllCategoriesAdmin(): Promise<Category[]> {
    if (isSupabaseConfigured) {
      const { data, error } = await supabase
        .from('categories')
        .select('*')
        .order('name');
      if (!error && data) return data;
    }
    return getLocalData('sams_categories', DEFAULT_CATEGORIES);
  },

  async saveCategory(category: Partial<Category>): Promise<Category> {
    if (isSupabaseConfigured) {
      const { data, error } = await supabase
        .from('categories')
        .upsert({ ...category, updated_at: new Date().toISOString() })
        .select()
        .single();
      if (!error && data) return data;
      throw new Error(error?.message || 'Failed to save category in Supabase');
    }
    const categories = getLocalData('sams_categories', DEFAULT_CATEGORIES);
    if (category.id) {
      const idx = categories.findIndex(c => c.id === category.id);
      if (idx !== -1) {
        categories[idx] = { ...categories[idx], ...category, updated_at: new Date().toISOString() } as Category;
        setLocalData('sams_categories', categories);
        return categories[idx];
      }
    }
    const newCat: Category = {
      id: Math.random().toString(36).substr(2, 9),
      name: category.name || 'New Category',
      slug: category.slug || 'new-category',
      description: category.description,
      image_url: category.image_url || '/hero_bg.png',
      is_active: category.is_active ?? true,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    };
    categories.push(newCat);
    setLocalData('sams_categories', categories);
    return newCat;
  },

  // --- PRODUCTS ---
  async getProducts(): Promise<Product[]> {
    if (isSupabaseConfigured) {
      const { data, error } = await supabase
        .from('products')
        .select('*')
        .eq('is_active', true);
      if (!error && data) return data;
      console.error('Supabase products fetch error, using local fallback:', error);
    }
    return getLocalData('sams_products', DEFAULT_PRODUCTS).filter(p => p.is_active);
  },

  async getProductBySlug(slug: string): Promise<Product | null> {
    if (isSupabaseConfigured) {
      const { data, error } = await supabase
        .from('products')
        .select('*')
        .eq('slug', slug)
        .eq('is_active', true)
        .maybeSingle();
      if (!error && data) return data;
    }
    const products = getLocalData('sams_products', DEFAULT_PRODUCTS);
    const prod = products.find(p => p.slug === slug && p.is_active);
    return prod || null;
  },

  async getProductById(id: string): Promise<Product | null> {
    if (isSupabaseConfigured) {
      const { data, error } = await supabase
        .from('products')
        .select('*')
        .eq('id', id)
        .maybeSingle();
      if (!error && data) return data;
    }
    const products = getLocalData('sams_products', DEFAULT_PRODUCTS);
    const prod = products.find(p => p.id === id);
    return prod || null;
  },

  async saveProduct(product: Partial<Product>): Promise<Product> {
    if (isSupabaseConfigured) {
      const { data, error } = await supabase
        .from('products')
        .upsert({ ...product, updated_at: new Date().toISOString() })
        .select()
        .single();
      if (!error && data) return data;
      throw new Error(error?.message || 'Failed to save product in Supabase');
    }
    const products = getLocalData('sams_products', DEFAULT_PRODUCTS);
    if (product.id) {
      const idx = products.findIndex(p => p.id === product.id);
      if (idx !== -1) {
        const oldPrice = products[idx].price;
        const newPrice = product.price ?? oldPrice;
        
        // Log price history if changed
        if (oldPrice !== newPrice) {
          const priceHist = getLocalData<any>('sams_price_history', []);
          priceHist.push({
            id: Math.random().toString(),
            product_id: product.id,
            old_price: oldPrice,
            new_price: newPrice,
            currency: product.currency || 'OMR',
            changed_by: 'Admin',
            reason: 'Manual adjustment',
            created_at: new Date().toISOString()
          });
          setLocalData('sams_price_history', priceHist);
        }

        products[idx] = { ...products[idx], ...product, updated_at: new Date().toISOString() } as Product;
        setLocalData('sams_products', products);
        return products[idx];
      }
    }
    const newProd: Product = {
      id: Math.random().toString(36).substr(2, 9),
      name: product.name || 'New Product',
      slug: product.slug || 'new-product',
      make: product.make || 'GFO',
      category_id: product.category_id,
      product_type: product.product_type || 'Fire Extinguisher Ball',
      short_description: product.short_description || '',
      overview: product.overview || '',
      price: product.price || 0,
      currency: product.currency || 'OMR',
      weight: product.weight || '1.3 kgs',
      life_years: product.life_years || 5,
      quantity: product.quantity || 1,
      stock: product.stock ?? 10,
      images: product.images || ['/hero_bg.png'],
      key_features: product.key_features || [],
      specifications: product.specifications || {},
      best_for: product.best_for || [],
      safety_notes: product.safety_notes || [],
      usage_areas: product.usage_areas || [],
      is_featured: product.is_featured || false,
      is_active: product.is_active ?? true,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    };
    products.push(newProd);
    setLocalData('sams_products', products);
    return newProd;
  },

  async deleteProduct(id: string): Promise<boolean> {
    if (isSupabaseConfigured) {
      const { error } = await supabase
        .from('products')
        .update({ is_active: false })
        .eq('id', id);
      return !error;
    }
    const products = getLocalData('sams_products', DEFAULT_PRODUCTS);
    const idx = products.findIndex(p => p.id === id);
    if (idx !== -1) {
      products[idx].is_active = false;
      setLocalData('sams_products', products);
      return true;
    }
    return false;
  },

  // --- INQUIRIES ---
  async getInquiries(): Promise<Inquiry[]> {
    if (isSupabaseConfigured) {
      const { data, error } = await supabase
        .from('inquiries')
        .select('*')
        .order('created_at', { ascending: false });
      if (!error && data) return data;
    }
    return getLocalData<Inquiry>('sams_inquiries', []).sort(
      (a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
    );
  },

  async saveInquiry(inquiry: Partial<Inquiry>): Promise<Inquiry> {
    if (isSupabaseConfigured) {
      const { data, error } = await supabase
        .from('inquiries')
        .insert({
          ...inquiry,
          status: inquiry.status || 'new',
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString()
        })
        .select()
        .single();
      if (!error && data) return data;
      throw new Error(error?.message || 'Failed to submit inquiry to Supabase');
    }
    const inquiries = getLocalData<Inquiry>('sams_inquiries', []);
    const newInq: Inquiry = {
      id: Math.random().toString(36).substr(2, 9),
      full_name: inquiry.full_name || '',
      email: inquiry.email || '',
      phone: inquiry.phone || '',
      company_name: inquiry.company_name,
      product_id: inquiry.product_id,
      product_name: inquiry.product_name,
      quantity: inquiry.quantity || 1,
      message: inquiry.message || '',
      status: inquiry.status || 'new',
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    };
    inquiries.push(newInq);
    setLocalData('sams_inquiries', inquiries);
    return newInq;
  },

  async updateInquiryStatus(id: string, status: Inquiry['status']): Promise<boolean> {
    if (isSupabaseConfigured) {
      const { error } = await supabase
        .from('inquiries')
        .update({ status, updated_at: new Date().toISOString() })
        .eq('id', id);
      return !error;
    }
    const inquiries = getLocalData<Inquiry>('sams_inquiries', []);
    const idx = inquiries.findIndex(i => i.id === id);
    if (idx !== -1) {
      inquiries[idx].status = status;
      inquiries[idx].updated_at = new Date().toISOString();
      setLocalData('sams_inquiries', inquiries);
      return true;
    }
    return false;
  },

  // --- ORDERS ---
  async getOrders(): Promise<Order[]> {
    if (isSupabaseConfigured) {
      const { data, error } = await supabase
        .from('orders')
        .select('*')
        .order('created_at', { ascending: false });
      if (!error && data) return data;
    }
    return getLocalData<Order>('sams_orders', []).sort(
      (a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
    );
  },

  async saveOrder(order: Partial<Order>): Promise<Order> {
    if (isSupabaseConfigured) {
      const { data, error } = await supabase
        .from('orders')
        .insert({
          ...order,
          status: order.status || 'pending_payment',
          payment_status: order.payment_status || 'initiated',
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString()
        })
        .select()
        .single();
      if (!error && data) return data;
      throw new Error(error?.message || 'Failed to save order in Supabase');
    }
    const orders = getLocalData<Order>('sams_orders', []);
    const newOrder: Order = {
      id: Math.random().toString(36).substr(2, 9),
      customer_name: order.customer_name || '',
      email: order.email || '',
      phone: order.phone || '',
      address: order.address || '',
      company_name: order.company_name,
      notes: order.notes,
      total_amount: order.total_amount || 0,
      currency: order.currency || 'OMR',
      status: order.status || 'pending_payment',
      payment_status: order.payment_status || 'initiated',
      payment_provider: order.payment_provider || 'paymob',
      paymob_order_id: order.paymob_order_id,
      paymob_transaction_id: order.paymob_transaction_id,
      items: order.items || [],
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    };
    orders.push(newOrder);
    setLocalData('sams_orders', orders);
    return newOrder;
  },

  async updateOrderStatus(id: string, status: Order['status'], payment_status?: Order['payment_status']): Promise<boolean> {
    if (isSupabaseConfigured) {
      const payload: Partial<Order> = { status, updated_at: new Date().toISOString() };
      if (payment_status) payload.payment_status = payment_status;
      const { error } = await supabase
        .from('orders')
        .update(payload)
        .eq('id', id);
      return !error;
    }
    const orders = getLocalData<Order>('sams_orders', []);
    const idx = orders.findIndex(o => o.id === id);
    if (idx !== -1) {
      orders[idx].status = status;
      if (payment_status) orders[idx].payment_status = payment_status;
      orders[idx].updated_at = new Date().toISOString();
      setLocalData('sams_orders', orders);
      return true;
    }
    return false;
  },

  // --- CERTIFICATES ---
  async getCertificates(): Promise<Certificate[]> {
    if (isSupabaseConfigured) {
      const { data, error } = await supabase
        .from('certificates')
        .select('*')
        .eq('is_active', true);
      if (!error && data) return data;
    }
    return getLocalData('sams_certificates', DEFAULT_CERTIFICATES).filter(c => c.is_active);
  },

  async getAllCertificatesAdmin(): Promise<Certificate[]> {
    if (isSupabaseConfigured) {
      const { data, error } = await supabase
        .from('certificates')
        .select('*')
        .order('created_at', { ascending: false });
      if (!error && data) return data;
    }
    return getLocalData('sams_certificates', DEFAULT_CERTIFICATES);
  },

  async saveCertificate(certificate: Partial<Certificate>): Promise<Certificate> {
    if (isSupabaseConfigured) {
      const { data, error } = await supabase
        .from('certificates')
        .upsert({ ...certificate, updated_at: new Date().toISOString() })
        .select()
        .single();
      if (!error && data) return data;
      throw new Error(error?.message || 'Failed to save certificate in Supabase');
    }
    const certs = getLocalData('sams_certificates', DEFAULT_CERTIFICATES);
    if (certificate.id) {
      const idx = certs.findIndex(c => c.id === certificate.id);
      if (idx !== -1) {
        certs[idx] = { ...certs[idx], ...certificate, updated_at: new Date().toISOString() } as Certificate;
        setLocalData('sams_certificates', certs);
        return certs[idx];
      }
    }
    const newCert: Certificate = {
      id: Math.random().toString(36).substr(2, 9),
      title: certificate.title || 'New Certificate',
      description: certificate.description,
      image_url: certificate.image_url || '/hero_bg.png',
      file_url: certificate.file_url || '#',
      certificate_type: certificate.certificate_type || 'Safety Standard',
      is_active: certificate.is_active ?? true,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    };
    certs.push(newCert);
    setLocalData('sams_certificates', certs);
    return newCert;
  },

  // --- TESTIMONIALS ---
  async getTestimonials(): Promise<Testimonial[]> {
    if (isSupabaseConfigured) {
      const { data, error } = await supabase
        .from('testimonials')
        .select('*')
        .eq('is_active', true);
      if (!error && data) return data;
    }
    return getLocalData('sams_testimonials', DEFAULT_TESTIMONIALS).filter(t => t.is_active);
  },

  async getAllTestimonialsAdmin(): Promise<Testimonial[]> {
    if (isSupabaseConfigured) {
      const { data, error } = await supabase
        .from('testimonials')
        .select('*')
        .order('created_at', { ascending: false });
      if (!error && data) return data;
    }
    return getLocalData('sams_testimonials', DEFAULT_TESTIMONIALS);
  },

  async saveTestimonial(testimonial: Partial<Testimonial>): Promise<Testimonial> {
    if (isSupabaseConfigured) {
      const { data, error } = await supabase
        .from('testimonials')
        .upsert({ ...testimonial, updated_at: new Date().toISOString() })
        .select()
        .single();
      if (!error && data) return data;
      throw new Error(error?.message || 'Failed to save testimonial in Supabase');
    }
    const tests = getLocalData('sams_testimonials', DEFAULT_TESTIMONIALS);
    if (testimonial.id) {
      const idx = tests.findIndex(t => t.id === testimonial.id);
      if (idx !== -1) {
        tests[idx] = { ...tests[idx], ...testimonial, updated_at: new Date().toISOString() } as Testimonial;
        setLocalData('sams_testimonials', tests);
        return tests[idx];
      }
    }
    const newTest: Testimonial = {
      id: Math.random().toString(36).substr(2, 9),
      name: testimonial.name || 'Anonymous',
      position: testimonial.position,
      company: testimonial.company,
      message: testimonial.message || '',
      rating: testimonial.rating || 5,
      is_active: testimonial.is_active ?? true,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    };
    tests.push(newTest);
    setLocalData('sams_testimonials', tests);
    return newTest;
  },

  // --- FAQS ---
  async getFAQs(): Promise<FAQ[]> {
    if (isSupabaseConfigured) {
      const { data, error } = await supabase
        .from('faqs')
        .select('*')
        .eq('is_active', true)
        .order('order_index');
      if (!error && data) return data;
    }
    return getLocalData('sams_faqs', DEFAULT_FAQS)
      .filter(f => f.is_active)
      .sort((a, b) => a.order_index - b.order_index);
  },

  async getAllFAQsAdmin(): Promise<FAQ[]> {
    if (isSupabaseConfigured) {
      const { data, error } = await supabase
        .from('faqs')
        .select('*')
        .order('order_index');
      if (!error && data) return data;
    }
    return getLocalData('sams_faqs', DEFAULT_FAQS).sort((a, b) => a.order_index - b.order_index);
  },

  async saveFAQ(faq: Partial<FAQ>): Promise<FAQ> {
    if (isSupabaseConfigured) {
      const { data, error } = await supabase
        .from('faqs')
        .upsert({ ...faq, updated_at: new Date().toISOString() })
        .select()
        .single();
      if (!error && data) return data;
      throw new Error(error?.message || 'Failed to save FAQ in Supabase');
    }
    const faqs = getLocalData('sams_faqs', DEFAULT_FAQS);
    if (faq.id) {
      const idx = faqs.findIndex(f => f.id === faq.id);
      if (idx !== -1) {
        faqs[idx] = { ...faqs[idx], ...faq, updated_at: new Date().toISOString() } as FAQ;
        setLocalData('sams_faqs', faqs);
        return faqs[idx];
      }
    }
    const newFaq: FAQ = {
      id: Math.random().toString(36).substr(2, 9),
      question: faq.question || '',
      answer: faq.answer || '',
      order_index: faq.order_index || (faqs.length + 1),
      is_active: faq.is_active ?? true,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    };
    faqs.push(newFaq);
    setLocalData('sams_faqs', faqs);
    return newFaq;
  },

  // --- SITE SETTINGS ---
  async getSiteSettings(): Promise<Record<string, string>> {
    if (isSupabaseConfigured) {
      const { data, error } = await supabase
        .from('site_settings')
        .select('key, value');
      if (!error && data) {
        const settings: Record<string, string> = {};
        data.forEach((row: any) => {
          settings[row.key] = row.value;
        });
        return settings;
      }
    }
    const local = getLocalData('sams_site_settings', DEFAULT_SITE_SETTINGS);
    const settings: Record<string, string> = {};
    local.forEach(row => {
      settings[row.key] = row.value;
    });
    return settings;
  },

  async updateSiteSetting(key: string, value: string): Promise<boolean> {
    if (isSupabaseConfigured) {
      const { error } = await supabase
        .from('site_settings')
        .upsert({ key, value, updated_at: new Date().toISOString() }, { onConflict: 'key' });
      return !error;
    }
    const local = getLocalData('sams_site_settings', DEFAULT_SITE_SETTINGS);
    const idx = local.findIndex(s => s.key === key);
    if (idx !== -1) {
      local[idx].value = value;
      local[idx].updated_at = new Date().toISOString();
    } else {
      local.push({
        id: Math.random().toString(),
        key,
        value,
        updated_at: new Date().toISOString()
      });
    }
    setLocalData('sams_site_settings', local);
    return true;
  }
};
