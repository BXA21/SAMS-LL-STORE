export interface Category {
  id: string;
  name: string;
  slug: string;
  description?: string;
  image_url?: string;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export interface Product {
  id: string;
  name: string;
  slug: string;
  make: string;
  category_id?: string;
  product_type: string;
  short_description?: string;
  overview?: string;
  price: number;
  currency: string;
  weight: string;
  life_years: number;
  quantity: number;
  stock: number;
  images: string[];
  key_features: string[];
  specifications: Record<string, string>;
  best_for: string[];
  safety_notes: string[];
  usage_areas: string[];
  is_featured: boolean;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export interface Inquiry {
  id: string;
  full_name: string;
  email: string;
  phone: string;
  company_name?: string;
  product_id?: string;
  product_name?: string;
  quantity: number;
  message: string;
  status: 'new' | 'contacted' | 'quoted' | 'closed';
  created_at: string;
  updated_at: string;
}

export interface Order {
  id: string;
  order_number: string;
  order_type: 'online' | 'quotation';
  staff_notes?: string | null;
  paid_at?: string | null;
  customer_name: string;
  email: string;
  phone: string;
  address: string;
  company_name?: string;
  notes?: string;
  total_amount: number;
  currency: string;
  status: 'pending_payment' | 'pending' | 'paid' | 'completed' | 'delivered' | 'failed' | 'cancelled' | 'refunded' | 'manual_inquiry' | 'placement' | 'processing' | 'shipping';
  payment_status: 'initiated' | 'pending' | 'successful' | 'failed' | 'cancelled' | 'refunded' | 'unpaid' | 'verified';
  payment_provider?: 'paymob' | 'manual';
  paymob_order_id?: string;
  paymob_transaction_id?: string;
  items: CartItemSnapshot[];
  created_at: string;
  updated_at: string;
}

export interface CartItemSnapshot {
  product_id: string;
  product_name: string;
  product_slug: string;
  make: string;
  weight: string;
  quantity: number;
  unit_price: number;
  total_price: number;
  currency: string;
}

export interface Payment {
  id: string;
  order_id: string;
  provider: 'paymob';
  provider_order_id?: string;
  provider_transaction_id?: string;
  amount: number;
  currency: string;
  status: 'initiated' | 'pending' | 'successful' | 'failed' | 'cancelled' | 'refunded';
  payment_url?: string;
  iframe_url?: string;
  raw_response?: unknown;
  created_at: string;
  updated_at: string;
}

export interface Certificate {
  id: string;
  title: string;
  description?: string;
  image_url?: string;
  file_url?: string;
  certificate_type?: string;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export interface Testimonial {
  id: string;
  name: string;
  position?: string;
  company?: string;
  message: string;
  rating: number;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export interface FAQ {
  id: string;
  question: string;
  answer: string;
  order_index: number;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export interface SiteSetting {
  id: string;
  key: string;
  value: string;
  updated_at: string;
}

export type StaffRole = 'owner' | 'sales';

export interface StaffProfile {
  user_id: string;
  full_name: string;
  role: StaffRole;
  is_active: boolean;
}

export interface PaymentAlert {
  id: number;
  order_id: string | null;
  kind: string;
  message: string;
  created_at: string;
  resolved_at: string | null;
  resolution: string | null;
}

export interface OrderStatusHistoryEntry {
  id: number;
  actor_role: string;
  from_status: string | null;
  to_status: string | null;
  from_payment_status: string | null;
  to_payment_status: string | null;
  reason: string | null;
  created_at: string;
}

export interface SalesReport {
  /** Money captured in the period, including orders later cancelled or refunded. */
  gross: number;
  refunds: number;
  /** Net collected: gross minus refunds. */
  revenue: number;
  cancelled_paid: number;
  cancelled_paid_amount: number;
  orders: number;
  units: number;
  cost: number;
  costed_revenue: number;
  uncosted_revenue: number;
  online_revenue: number;
  manual_revenue: number;
  pending_payment: number;
  failed_payment: number;
  by_month: { month: string; revenue: number; orders: number }[];
  by_product: { product_name: string; units: number; revenue: number; cost: number | null; has_cost: boolean }[];
}
