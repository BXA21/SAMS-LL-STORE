import type { SupabaseClient } from '@supabase/supabase-js';
import { supabase, isSupabaseConfigured } from '@/lib/supabase';
import { 
  Category, 
  Product, 
  Inquiry, 
  Order, 
  Certificate, 
  Testimonial, 
  FAQ, 
  SiteSetting,
  StaffProfile,
  OrderStatusHistoryEntry,
  PaymentAlert,
  ProductAvailability,
  InventoryRow,
  InventoryMovement,
  PaymentRefund,
  NotificationStatus,
  SalesReport
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

export const DEFAULT_PRODUCTS: Product[] = [
  {
    id: 'p1',
    name: 'GFO Baby Fire Ball 400 gms',
    slug: 'gfo-baby-fire-ball-400-gms',
    make: 'GFO',
    category_id: '11111111-1111-1111-1111-111111111111',
    product_type: 'Fire Extinguisher Ball',
    short_description: 'Compact self-activating baby fire safety ball designed for vehicles, electrical panels, and tight spaces.',
    overview: 'The GFO Baby Fire Ball 400 gms is a compact automatic fire suppression product designed for small spaces, car engines, and home electrical cabinets. It activates instantly when it comes into contact with open flames, helping suppress fire before it can spread.',
    price: 12.000,
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
    price: 15.000,
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

/*
 * localStorage is unavailable or throws in several environments real customers
 * browse from: Safari with "Block All Cookies", private/incognito modes, and
 * the in-app webviews used by WhatsApp, Instagram and Facebook. An uncaught
 * SecurityError/QuotaExceededError here rejects getProducts() and leaves the
 * catalog, testimonials and FAQ empty, so every access is guarded and the app
 * degrades to the default data instead of failing.
 */
function safeGetItem(key: string): string | null {
  try {
    return localStorage.getItem(key);
  } catch {
    return null;
  }
}

function safeSetItem(key: string, value: string): void {
  try {
    localStorage.setItem(key, value);
  } catch {
    // Storage is unavailable or full; in-memory defaults remain correct.
  }
}

function safeRemoveItem(key: string): void {
  try {
    localStorage.removeItem(key);
  } catch {
    // Nothing to clean up if storage is unavailable.
  }
}

/*
 * The seeded defaults are copied into localStorage on a visitor's first load, so
 * without a version stamp a returning visitor keeps rendering whatever was cached
 * back then and a price or contact-detail change never reaches them. The previous
 * approach sniffed for known-old values, which silently breaks the moment a new
 * price reuses one of those numbers. Bump SEED_VERSION whenever DEFAULT_PRODUCTS
 * or DEFAULT_SITE_SETTINGS change and every browser reseeds once on its next load.
 */
const SEED_VERSION = '2026-09-03-pricing';
const SEED_VERSION_KEY = 'sams_seed_version';
const VERSIONED_SEED_KEYS = ['sams_products', 'sams_site_settings'];

let seedVersionChecked = false;

function ensureSeedVersion(): void {
  if (seedVersionChecked || typeof window === 'undefined') return;
  seedVersionChecked = true;

  if (safeGetItem(SEED_VERSION_KEY) === SEED_VERSION) return;

  VERSIONED_SEED_KEYS.forEach(safeRemoveItem);
  safeSetItem(SEED_VERSION_KEY, SEED_VERSION);
}

// Helper to initialize local storage mock data on client
function getLocalData<T>(key: string, defaultValue: T[]): T[] {
  if (typeof window === 'undefined') return defaultValue;
  ensureSeedVersion();
  const data = safeGetItem(key);

  if (!data) {
    safeSetItem(key, JSON.stringify(defaultValue));
    return defaultValue;
  }

  try {
    return JSON.parse(data);
  } catch {
    // Corrupted entry: fall back to defaults rather than breaking the page.
    safeRemoveItem(key);
    return defaultValue;
  }
}

function setLocalData<T>(key: string, value: T[]): void {
  if (typeof window !== 'undefined') {
    safeSetItem(key, JSON.stringify(value));
  }
}

// -----------------------------------------------------------------------------
// UNIFIED DATA SERVICE INTERFACE
// -----------------------------------------------------------------------------
//
// Public catalog reads fall back to the bundled defaults so the storefront
// always renders. Everything else talks to the real backend:
//   - customer writes (enquiries, quotations, card checkout) go through the
//     Next.js API routes, which validate, rate limit and price on the server;
//   - dashboard reads/writes run under the signed-in staff member's Supabase
//     session and are enforced by row level security in the database.

function requireDb(): SupabaseClient {
  if (!isSupabaseConfigured || !supabase) {
    throw new Error('The store database is not connected. Please contact the site administrator.');
  }
  return supabase;
}

interface ApiErrorBody {
  error?: { code?: string; message?: string; fields?: { path: string; message: string }[] };
}

export class ApiRequestError extends Error {
  constructor(message: string, readonly code?: string, readonly status?: number) {
    super(message);
    this.name = 'ApiRequestError';
  }
}

async function postJson<T>(url: string, body: unknown, extraHeaders: Record<string, string> = {}): Promise<T> {
  let res: Response;
  try {
    res = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', ...extraHeaders },
      body: JSON.stringify(body),
    });
  } catch {
    throw new ApiRequestError('Network error. Please check your connection and try again.');
  }
  const json = (await res.json().catch(() => ({}))) as { data?: T } & ApiErrorBody;
  if (!res.ok || json.data === undefined) {
    const firstField = json.error?.fields?.[0]?.message;
    throw new ApiRequestError(
      firstField ? `${json.error?.message ?? 'Invalid request.'} (${firstField})` : json.error?.message ?? 'Something went wrong. Please try again.',
      json.error?.code,
      res.status
    );
  }
  return json.data;
}

const PRODUCT_WRITABLE_FIELDS = [
  'name', 'slug', 'make', 'category_id', 'product_type', 'short_description', 'overview', 'price',
  'weight', 'life_years', 'quantity', 'stock', 'images', 'key_features', 'specifications',
  'best_for', 'safety_notes', 'usage_areas', 'is_featured', 'is_active',
] as const satisfies readonly (keyof Product)[];

function pickProductFields(product: Partial<Product>): Partial<Product> {
  const out: Partial<Product> = {};
  for (const key of PRODUCT_WRITABLE_FIELDS) {
    if (product[key] !== undefined) (out as Record<string, unknown>)[key] = product[key];
  }
  if (out.images) out.images = out.images.filter(Boolean);
  return out;
}

export interface CheckoutCustomer {
  fullName: string;
  email: string;
  phone: string;
  address: string;
  companyName?: string;
  notes?: string;
}

export interface CheckoutLine {
  slug: string;
  quantity: number;
}

export const dbService = {
  // --- CATEGORIES ---
  async getCategories(): Promise<Category[]> {
    if (isSupabaseConfigured && supabase) {
      const { data, error } = await supabase.from('categories').select('*').eq('is_active', true);
      if (!error && data) return data;
    }
    return getLocalData('sams_categories', DEFAULT_CATEGORIES).filter(c => c.is_active);
  },

  // --- PRODUCTS ---
  async getProducts(): Promise<Product[]> {
    if (isSupabaseConfigured && supabase) {
      const { data, error } = await supabase.from('products').select('*').eq('is_active', true).order('price');
      if (!error && data && data.length) return data;
    }
    return getLocalData('sams_products', DEFAULT_PRODUCTS).filter(p => p.is_active);
  },

  async getProductBySlug(slug: string): Promise<Product | null> {
    if (isSupabaseConfigured && supabase) {
      const { data, error } = await supabase
        .from('products')
        .select('*')
        .eq('slug', slug)
        .eq('is_active', true)
        .maybeSingle();
      if (!error && data) return data;
    }
    const products = getLocalData('sams_products', DEFAULT_PRODUCTS);
    return products.find(p => p.slug === slug && p.is_active) || null;
  },

  /** Every product including inactive ones (staff session). */
  async getAllProductsAdmin(): Promise<Product[]> {
    const { data, error } = await requireDb().from('products').select('*').order('name');
    if (error) throw new Error(error.message);
    return data ?? [];
  },

  async saveProduct(product: Partial<Product>): Promise<Product> {
    const db = requireDb();
    const fields = pickProductFields(product);
    const query = product.id
      ? db.from('products').update(fields).eq('id', product.id)
      : db.from('products').insert(fields);
    const { data, error } = await query.select().single();
    if (error || !data) throw new Error(error?.message || 'Failed to save product');
    return data;
  },

  // --- CUSTOMER WRITES (server API) ---
  async submitInquiry(input: {
    fullName: string;
    email: string;
    phone: string;
    companyName?: string;
    productSlug?: string;
    quantity: number;
    message: string;
  }): Promise<void> {
    await postJson('/api/inquiries', input);
  },

  async submitQuotation(customer: CheckoutCustomer, items: CheckoutLine[]) {
    return postJson<{ orderNumber: string; totalAmount: number; currency: string }>('/api/checkout/quote', { customer, items });
  },

  /** checkoutKey: one per checkout attempt, so a double submit cannot create two orders. */
  async startCardPayment(customer: CheckoutCustomer, items: CheckoutLine[], checkoutKey: string) {
    return postJson<{ orderNumber: string; paymentUrl: string }>(
      '/api/checkout/create-payment',
      { customer, items, deliveryAcknowledged: true },
      { 'Idempotency-Key': checkoutKey }
    );
  },

  // --- SALES PIPELINE (staff session) ---
  async getInquiries(): Promise<Inquiry[]> {
    const { data, error } = await requireDb()
      .from('inquiries')
      .select('*')
      .order('created_at', { ascending: false })
      .limit(1000);
    if (error) throw new Error(error.message);
    return data ?? [];
  },

  async updateInquiryStatus(id: string, status: Inquiry['status']): Promise<boolean> {
    const { error } = await requireDb().from('inquiries').update({ status }).eq('id', id);
    return !error;
  },

  async getOrders(): Promise<Order[]> {
    const { data, error } = await requireDb()
      .from('orders')
      .select('*')
      .order('created_at', { ascending: false })
      .limit(1000);
    if (error) throw new Error(error.message);
    return (data ?? []).map((o) => ({ ...o, total_amount: Number(o.total_amount) }));
  },

  /**
   * Moves an order to a new fulfilment status. The database enforces the
   * transition table, payment prerequisites and stale-write protection, and
   * writes the audit history; the dashboard only offers valid moves.
   */
  async setOrderStatus(id: string, expected: Order['status'], next: Order['status'], reason?: string): Promise<{ ok: boolean; message?: string }> {
    const { error } = await requireDb().rpc('staff_set_order_status', {
      p_order_id: id,
      p_expected_status: expected,
      p_new_status: next,
      p_reason: reason ?? null,
    });
    return error ? { ok: false, message: error.message } : { ok: true };
  },

  /** Owner only: records (or corrects) an offline payment on a quotation order. */
  async setOfflinePayment(
    id: string,
    expected: Order['payment_status'],
    next: Order['payment_status'],
    reason: string
  ): Promise<{ ok: boolean; message?: string }> {
    const { error } = await requireDb().rpc('owner_set_offline_payment', {
      p_order_id: id,
      p_expected_payment_status: expected,
      p_new_payment_status: next,
      p_reason: reason,
    });
    return error ? { ok: false, message: error.message } : { ok: true };
  },

  /** Open payment alerts (money that needs a human decision). Visible to all staff. */
  /** Public stock signal per product slug (no exact quantities). */
  async getProductAvailability(): Promise<Record<string, ProductAvailability>> {
    if (!isSupabaseConfigured || !supabase) return {};
    const { data, error } = await supabase.rpc('get_product_availability');
    if (error || !Array.isArray(data)) return {};
    return Object.fromEntries((data as { slug: string; availability: ProductAvailability }[]).map((r) => [r.slug, r.availability]));
  },

  /** Stock levels (all staff can read). */
  async getInventory(): Promise<Record<string, InventoryRow>> {
    const { data, error } = await requireDb().from('product_inventory').select('*');
    if (error) throw new Error(error.message);
    return Object.fromEntries(((data ?? []) as InventoryRow[]).map((r) => [r.product_id, r]));
  },

  async getInventoryMovements(productId: string): Promise<InventoryMovement[]> {
    const { data, error } = await requireDb()
      .from('inventory_movements')
      .select('id, product_id, order_id, kind, on_hand_before, on_hand_after, reserved_before, reserved_after, actor_role, reason, created_at')
      .eq('product_id', productId)
      .order('created_at', { ascending: false })
      .limit(50);
    if (error) throw new Error(error.message);
    return (data ?? []) as InventoryMovement[];
  },

  /** Owner only: set stock (stale-safe), tracking and low-stock threshold. */
  async setStock(input: {
    productId: string;
    expectedOnHand: number;
    newOnHand: number;
    trackInventory: boolean;
    lowStockThreshold: number;
    reason: string;
  }): Promise<{ ok: boolean; message?: string }> {
    const { error } = await requireDb().rpc('owner_set_stock', {
      p_product_id: input.productId,
      p_expected_on_hand: input.expectedOnHand,
      p_new_on_hand: input.newOnHand,
      p_track_inventory: input.trackInventory,
      p_low_stock_threshold: input.lowStockThreshold,
      p_reason: input.reason,
    });
    return error ? { ok: false, message: error.message } : { ok: true };
  },

  /** Owner only: physically returned goods go back on the shelf (never automatic after a refund). */
  async returnToStock(orderId: string, productId: string, quantity: number, reason: string): Promise<{ ok: boolean; message?: string }> {
    const { error } = await requireDb().rpc('owner_return_to_stock', {
      p_order_id: orderId,
      p_product_id: productId,
      p_quantity: quantity,
      p_reason: reason,
      p_idempotency_key: crypto.randomUUID(),
    });
    return error ? { ok: false, message: error.message } : { ok: true };
  },

  /** Owner only: after restocking, take stock for a paid order that had a shortfall. */
  async retryStockCommit(orderId: string, reason: string): Promise<{ ok: boolean; message?: string }> {
    const { error } = await requireDb().rpc('owner_retry_stock_commit', { p_order_id: orderId, p_reason: reason });
    return error ? { ok: false, message: error.message } : { ok: true };
  },

  async getOrderRefunds(orderId: string): Promise<PaymentRefund[]> {
    const { data, error } = await requireDb()
      .from('payment_refunds')
      .select('id, kind, amount_minor, currency, cumulative_refunded_minor, created_at')
      .eq('order_id', orderId)
      .order('created_at', { ascending: true });
    if (error) throw new Error(error.message);
    return (data ?? []) as PaymentRefund[];
  },

  /** Owner only (RLS): delivery status of this order's notifications. */
  async getOrderNotifications(orderId: string): Promise<NotificationStatus[]> {
    const { data, error } = await requireDb()
      .from('notification_outbox')
      .select('id, event_type, status, attempts, sent_at, last_error, created_at')
      .eq('order_id', orderId)
      .order('created_at', { ascending: true });
    if (error) return [];
    return (data ?? []) as NotificationStatus[];
  },

  async getOpenPaymentAlerts(): Promise<PaymentAlert[]> {
    const { data, error } = await requireDb()
      .from('payment_alerts')
      .select('id, order_id, kind, message, created_at, resolved_at, resolution')
      .is('resolved_at', null)
      .order('created_at', { ascending: false })
      .limit(100);
    if (error) throw new Error(error.message);
    return (data ?? []) as PaymentAlert[];
  },

  /** Owner only: closes an alert with a written resolution. */
  async resolvePaymentAlert(alertId: number, resolution: string): Promise<{ ok: boolean; message?: string }> {
    const { error } = await requireDb().rpc('owner_resolve_payment_alert', { p_alert_id: alertId, p_resolution: resolution });
    return error ? { ok: false, message: error.message } : { ok: true };
  },

  async getOrderHistory(orderId: string): Promise<OrderStatusHistoryEntry[]> {
    const { data, error } = await requireDb()
      .from('order_status_history')
      .select('id, actor_role, from_status, to_status, from_payment_status, to_payment_status, reason, created_at')
      .eq('order_id', orderId)
      .order('created_at', { ascending: true })
      .limit(100);
    if (error) throw new Error(error.message);
    return (data ?? []) as OrderStatusHistoryEntry[];
  },

  async updateOrderNotes(id: string, staff_notes: string): Promise<boolean> {
    const { error } = await requireDb().from('orders').update({ staff_notes }).eq('id', id);
    return !error;
  },

  // --- STAFF / OWNER ---
  async getMyStaffProfile(): Promise<StaffProfile | null> {
    const db = requireDb();
    const { data: userData } = await db.auth.getUser();
    const userId = userData.user?.id;
    if (!userId) return null;
    const { data, error } = await db
      .from('staff_profiles')
      .select('user_id, full_name, role, is_active')
      .eq('user_id', userId)
      .maybeSingle();
    if (error || !data || !data.is_active) return null;
    return data as StaffProfile;
  },

  async getProductCosts(): Promise<Record<string, number>> {
    const { data, error } = await requireDb().from('product_costs').select('product_id, unit_cost');
    if (error) throw new Error(error.message);
    return Object.fromEntries((data ?? []).map((row) => [row.product_id, Number(row.unit_cost)]));
  },

  async saveProductCost(productId: string, unitCost: number | null): Promise<void> {
    const db = requireDb();
    const { error } = unitCost === null
      ? await db.from('product_costs').delete().eq('product_id', productId)
      : await db.from('product_costs').upsert({ product_id: productId, unit_cost: unitCost });
    if (error) throw new Error(error.message);
  },

  async getSalesReport(from: Date, to: Date): Promise<SalesReport> {
    const { data, error } = await requireDb().rpc('get_sales_report', {
      p_from: from.toISOString(),
      p_to: to.toISOString(),
    });
    if (error) throw new Error(error.message);
    return data as SalesReport;
  },

  // --- CERTIFICATES ---
  async getCertificates(): Promise<Certificate[]> {
    if (isSupabaseConfigured && supabase) {
      const { data, error } = await supabase.from('certificates').select('*').eq('is_active', true);
      if (!error && data) return data;
    }
    return getLocalData('sams_certificates', DEFAULT_CERTIFICATES).filter(c => c.is_active);
  },

  async getAllCertificatesAdmin(): Promise<Certificate[]> {
    const { data, error } = await requireDb().from('certificates').select('*').eq('is_active', true).order('created_at', { ascending: false });
    if (error) throw new Error(error.message);
    return data ?? [];
  },

  async saveCertificate(certificate: Partial<Certificate>): Promise<Certificate> {
    const db = requireDb();
    const fields = {
      title: certificate.title,
      description: certificate.description,
      image_url: certificate.image_url,
      file_url: certificate.file_url,
      certificate_type: certificate.certificate_type,
      is_active: certificate.is_active,
    };
    const query = certificate.id
      ? db.from('certificates').update(fields).eq('id', certificate.id)
      : db.from('certificates').insert({ ...fields, image_url: fields.image_url ?? '/hero_bg.png', file_url: fields.file_url ?? '#' });
    const { data, error } = await query.select().single();
    if (error || !data) throw new Error(error?.message || 'Failed to save certificate');
    return data;
  },

  // --- TESTIMONIALS ---
  async getTestimonials(): Promise<Testimonial[]> {
    if (isSupabaseConfigured && supabase) {
      const { data, error } = await supabase.from('testimonials').select('*').eq('is_active', true);
      if (!error && data) return data;
    }
    return getLocalData('sams_testimonials', DEFAULT_TESTIMONIALS).filter(t => t.is_active);
  },

  // --- FAQS ---
  async getFAQs(): Promise<FAQ[]> {
    if (isSupabaseConfigured && supabase) {
      const { data, error } = await supabase.from('faqs').select('*').eq('is_active', true).order('order_index');
      if (!error && data) return data;
    }
    return getLocalData('sams_faqs', DEFAULT_FAQS)
      .filter(f => f.is_active)
      .sort((a, b) => a.order_index - b.order_index);
  },

  async getAllFAQsAdmin(): Promise<FAQ[]> {
    const { data, error } = await requireDb().from('faqs').select('*').eq('is_active', true).order('order_index');
    if (error) throw new Error(error.message);
    return data ?? [];
  },

  async saveFAQ(faq: Partial<FAQ>): Promise<FAQ> {
    const db = requireDb();
    const fields = { question: faq.question, answer: faq.answer, order_index: faq.order_index, is_active: faq.is_active };
    const query = faq.id
      ? db.from('faqs').update(fields).eq('id', faq.id)
      : db.from('faqs').insert({ ...fields, order_index: fields.order_index ?? 100 });
    const { data, error } = await query.select().single();
    if (error || !data) throw new Error(error?.message || 'Failed to save FAQ');
    return data;
  },

  // --- SITE SETTINGS ---
  async getSiteSettings(): Promise<Record<string, string>> {
    if (isSupabaseConfigured && supabase) {
      const { data, error } = await supabase.from('site_settings').select('key, value');
      if (!error && data) {
        return Object.fromEntries(data.map((row: { key: string; value: string }) => [row.key, row.value]));
      }
    }
    const local = getLocalData('sams_site_settings', DEFAULT_SITE_SETTINGS);
    return Object.fromEntries(local.map(row => [row.key, row.value]));
  },

  async updateSiteSetting(key: string, value: string): Promise<boolean> {
    const { error } = await requireDb()
      .from('site_settings')
      .upsert({ key, value }, { onConflict: 'key' });
    return !error;
  },
};
