'use client';

import React, { useState, useEffect, useCallback } from 'react';
import Image from 'next/image';
import Link from 'next/link';
import {
  LayoutDashboard,
  ShoppingBag,
  MessageSquare,
  FileText,
  Settings,
  Plus,
  Trash2,
  Edit3,
  Lock,
  TrendingUp,
  LogOut,
  Check,
  X,
  FileCode,
  Users,
  AlertCircle,
  Search,
  MapPin,
  Loader2,
  Truck,
  Phone,
  Mail,
  CreditCard,
  RefreshCw,
  ExternalLink,
  Languages,
} from 'lucide-react';
import { dbService } from '@/services/dbService';
import { isSupabaseConfigured, supabase } from '@/lib/supabase';
import { ContentTranslations, Product, Inquiry, Order, Certificate, FAQ, SalesReport, OrderStatusHistoryEntry, PaymentAlert, InventoryRow, PaymentRefund, NotificationStatus } from '@/types/database';

type ReportPeriod = '30d' | '90d' | '365d' | 'all';

const REPORT_PERIODS: { value: ReportPeriod; label: string }[] = [
  { value: '30d', label: 'Last 30 days' },
  { value: '90d', label: 'Last 90 days' },
  { value: '365d', label: 'Last 12 months' },
  { value: 'all', label: 'All time' },
];

function periodRange(period: ReportPeriod): { from: Date; to: Date } {
  const to = new Date(Date.now() + 60_000);
  if (period === 'all') return { from: new Date('2020-01-01T00:00:00Z'), to };
  const days = period === '30d' ? 30 : period === '90d' ? 90 : 365;
  return { from: new Date(Date.now() - days * 86_400_000), to };
}

function formatOmr(value: number): string {
  return `${Number(value || 0).toFixed(3)} OMR`;
}

// --- ARABIC CONTENT (translations.ar) ---
// The storefront falls back to the English column for any Arabic field left
// blank, so empty values are dropped rather than saved.

type ArabicFields = Record<string, unknown>;

function arabicOf(row: { translations?: ContentTranslations } | null | undefined): ArabicFields {
  const ar = row?.translations?.ar;
  return ar && typeof ar === 'object' && !Array.isArray(ar) ? ar : {};
}

function arText(ar: ArabicFields, key: string): string {
  const value = ar[key];
  return typeof value === 'string' ? value : '';
}

function arLines(ar: ArabicFields, key: string): string {
  const value = ar[key];
  return Array.isArray(value) ? value.filter((v): v is string => typeof v === 'string').join('\n') : '';
}

function arSpecs(ar: ArabicFields): string {
  const value = ar.specifications;
  if (!value || typeof value !== 'object' || Array.isArray(value)) return '';
  return Object.entries(value)
    .filter((entry): entry is [string, string] => typeof entry[1] === 'string')
    .map(([k, v]) => `${k}: ${v}`)
    .join('\n');
}

function parseLines(text: string): string[] {
  return text.split('\n').map((line) => line.trim()).filter(Boolean);
}

function parseSpecs(text: string): Record<string, string> {
  const specs: Record<string, string> = {};
  for (const line of parseLines(text)) {
    const at = line.indexOf(':');
    if (at <= 0) continue;
    const key = line.slice(0, at).trim();
    const value = line.slice(at + 1).trim();
    if (key && value) specs[key] = value;
  }
  return specs;
}

/** Merges new Arabic copy into existing translations, dropping blanks and keeping other locales. */
function mergeArabic(existing: ContentTranslations | undefined, ar: ArabicFields): ContentTranslations {
  const cleaned: ArabicFields = {};
  for (const [key, value] of Object.entries(ar)) {
    if (typeof value === 'string' && value.trim()) cleaned[key] = value.trim();
    else if (Array.isArray(value) && value.length) cleaned[key] = value;
    else if (value && typeof value === 'object' && !Array.isArray(value) && Object.keys(value).length) cleaned[key] = value;
  }
  const next: ContentTranslations = { ...(existing ?? {}) };
  if (Object.keys(cleaned).length) next.ar = cleaned;
  else delete next.ar;
  return next;
}

function hasArabic(row: { translations?: ContentTranslations }): boolean {
  return arText(arabicOf(row), 'name').trim() !== '';
}

interface ProductArabicForm {
  name: string;
  product_type: string;
  weight: string;
  short_description: string;
  overview: string;
  key_features: string;
  best_for: string;
  safety_notes: string;
  usage_areas: string;
  specifications: string;
}

function productArabicForm(product: Partial<Product>): ProductArabicForm {
  const ar = arabicOf(product);
  return {
    name: arText(ar, 'name'),
    product_type: arText(ar, 'product_type'),
    weight: arText(ar, 'weight'),
    short_description: arText(ar, 'short_description'),
    overview: arText(ar, 'overview'),
    key_features: arLines(ar, 'key_features'),
    best_for: arLines(ar, 'best_for'),
    safety_notes: arLines(ar, 'safety_notes'),
    usage_areas: arLines(ar, 'usage_areas'),
    specifications: arSpecs(ar),
  };
}

function productArabicFields(form: ProductArabicForm): ArabicFields {
  return {
    name: form.name,
    product_type: form.product_type,
    weight: form.weight,
    short_description: form.short_description,
    overview: form.overview,
    key_features: parseLines(form.key_features),
    best_for: parseLines(form.best_for),
    safety_notes: parseLines(form.safety_notes),
    usage_areas: parseLines(form.usage_areas),
    specifications: parseSpecs(form.specifications),
  };
}

/** Converts a customer phone number to the digits wa.me expects, defaulting to Oman (+968). */
function whatsappNumber(phone: string): string {
  const digits = phone.replace(/\D/g, '');
  if (digits.startsWith('00')) return digits.slice(2);
  if (digits.startsWith('968')) return digits;
  return digits.length === 8 ? `968${digits}` : digits;
}

const STATUS_LABELS: Record<Order['status'], string> = {
  pending_payment: 'Awaiting payment',
  manual_inquiry: 'New quotation',
  paid: 'Paid',
  failed: 'Payment failed',
  placement: 'Placement',
  processing: 'Processing',
  shipping: 'Shipping',
  delivered: 'Delivered',
  completed: 'Completed',
  cancelled: 'Cancelled',
  refunded: 'Refunded',
  pending: 'Pending',
};

// Mirrors guard_order_staff_update in the database, which is what actually enforces it.
const STATUS_TRANSITIONS: Partial<Record<Order['status'], Order['status'][]>> = {
  pending_payment: ['cancelled'],
  failed: ['cancelled'],
  paid: ['processing', 'cancelled'],
  manual_inquiry: ['placement', 'cancelled'],
  placement: ['processing', 'cancelled'],
  processing: ['shipping', 'cancelled'],
  shipping: ['delivered'],
  delivered: ['completed'],
  // Owner-only reinstatement; filtered per order type in reinstateTargets().
  cancelled: ['paid', 'placement'],
};

function reinstateAllowed(order: Order, next: Order['status']): boolean {
  if (next === 'paid') return order.payment_provider === 'paymob' && order.payment_status === 'successful';
  if (next === 'placement') return order.order_type === 'quotation';
  return false;
}
const FULFILMENT_STATUSES: Order['status'][] = ['processing', 'shipping', 'delivered', 'completed'];

function isPaymentConfirmed(order: Order): boolean {
  return order.payment_status === 'successful' || order.payment_status === 'verified';
}

export default function AdminPage() {
  // Auth state
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [authChecked, setAuthChecked] = useState(() => !isSupabaseConfigured || !supabase);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loginError, setLoginError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [sessionEmail, setSessionEmail] = useState('');

  // Tab Navigation State
  const [activeTab, setActiveTab] = useState<'dashboard' | 'orders' | 'inventory' | 'customers' | 'reports' | 'settings' | 'whatsapp'>('dashboard');
  const [ordersTab, setOrdersTab] = useState<'checkout' | 'quotations'>('checkout');

  // Role comes from the staff_profiles table, never from the client.
  const [userRole, setUserRole] = useState<'admin' | 'sales'>('sales');
  const [userName, setUserName] = useState<string>('');

  // DB Data States
  const [products, setProducts] = useState<Product[]>([]);
  const [inquiries, setInquiries] = useState<Inquiry[]>([]);
  const [orders, setOrders] = useState<Order[]>([]);
  const [certificates, setCertificates] = useState<Certificate[]>([]);
  const [faqs, setFaqs] = useState<FAQ[]>([]);
  const [siteSettings, setSiteSettings] = useState<Record<string, string>>({});
  const [productCosts, setProductCosts] = useState<Record<string, number>>({});
  const [dataError, setDataError] = useState<string | null>(null);
  const [dataLoading, setDataLoading] = useState(false);
  const [actionError, setActionError] = useState<string | null>(null);

  // Reports
  const [reportPeriod, setReportPeriod] = useState<ReportPeriod>('30d');
  const [report, setReport] = useState<SalesReport | null>(null);
  const [reportLoading, setReportLoading] = useState(false);
  const [reportError, setReportError] = useState<string | null>(null);

  // Order detail drawer
  const [selectedOrder, setSelectedOrder] = useState<Order | null>(null);
  const [orderNotesDraft, setOrderNotesDraft] = useState('');
  const [orderHistory, setOrderHistory] = useState<OrderStatusHistoryEntry[]>([]);
  const [paymentAlerts, setPaymentAlerts] = useState<PaymentAlert[]>([]);
  const [inventory, setInventory] = useState<Record<string, InventoryRow>>({});
  const [stockEdit, setStockEdit] = useState<{ product: Product; onHand: string; track: boolean; threshold: string; reason: string } | null>(null);
  const [orderRefunds, setOrderRefunds] = useState<PaymentRefund[]>([]);
  const [orderNotifications, setOrderNotifications] = useState<NotificationStatus[]>([]);
  const [paymentFilter, setPaymentFilter] = useState<'all' | 'awaiting' | 'paid' | 'refunds' | 'failed'>('all');

  // Product Form Modal State
  const [isProductModalOpen, setIsProductModalOpen] = useState(false);
  const [editingProduct, setEditingProduct] = useState<Partial<Product> | null>(null);
  const [editingCost, setEditingCost] = useState<string>('');
  const [productAr, setProductAr] = useState<ProductArabicForm>(() => productArabicForm({}));

  // FAQ Form State
  const [faqQuestion, setFaqQuestion] = useState('');
  const [faqAnswer, setFaqAnswer] = useState('');
  const [faqQuestionAr, setFaqQuestionAr] = useState('');
  const [faqAnswerAr, setFaqAnswerAr] = useState('');
  const [faqArEdit, setFaqArEdit] = useState<{ id: string; question: string; answer: string } | null>(null);

  // Certificate Form State
  const [certName, setCertName] = useState('');
  const [certIssuer, setCertIssuer] = useState('');

  // Search Filter state (general search for tabs)
  const [searchQuery, setSearchQuery] = useState('');

  const fetchAdminData = useCallback(async (role: 'admin' | 'sales') => {
    setDataLoading(true);
    setDataError(null);
    try {
      const [prods, inqs, ords, certs, faqsData, settingsData] = await Promise.all([
        dbService.getAllProductsAdmin(),
        dbService.getInquiries(),
        dbService.getOrders(),
        dbService.getAllCertificatesAdmin(),
        dbService.getAllFAQsAdmin(),
        dbService.getSiteSettings(),
      ]);
      setProducts(prods);
      setInquiries(inqs);
      setOrders(ords);
      setCertificates(certs);
      setFaqs(faqsData);
      setSiteSettings(settingsData);
      setPaymentAlerts(await dbService.getOpenPaymentAlerts());
      setInventory(await dbService.getInventory());
      if (role === 'admin') setProductCosts(await dbService.getProductCosts());
    } catch (err) {
      setDataError(err instanceof Error ? err.message : 'Failed to load dashboard data.');
    } finally {
      setDataLoading(false);
    }
  }, []);

  const applyStaffSession = useCallback(async (): Promise<boolean> => {
    const profile = await dbService.getMyStaffProfile();
    if (!profile) return false;
    const role = profile.role === 'owner' ? 'admin' : 'sales';
    setUserRole(role);
    setUserName(profile.full_name);
    const { data } = await supabase!.auth.getUser();
    setSessionEmail(data.user?.email ?? '');
    setIsAuthenticated(true);
    fetchAdminData(role);
    return true;
  }, [fetchAdminData]);

  // Restore an existing Supabase session on mount and react to sign-out / expiry.
  useEffect(() => {
    if (!isSupabaseConfigured || !supabase) return;
    let active = true;
    supabase.auth.getSession().then(async ({ data }) => {
      if (data.session) {
        const ok = await applyStaffSession();
        if (!ok) await supabase!.auth.signOut();
      }
      if (active) setAuthChecked(true);
    });
    const { data: sub } = supabase.auth.onAuthStateChange((event) => {
      if (event === 'SIGNED_OUT') setIsAuthenticated(false);
    });
    return () => {
      active = false;
      sub.subscription.unsubscribe();
    };
  }, [applyStaffSession]);

  const loadReport = useCallback(async (period: ReportPeriod) => {
    setReportLoading(true);
    setReportError(null);
    try {
      const { from, to } = periodRange(period);
      setReport(await dbService.getSalesReport(from, to));
    } catch (err) {
      setReportError(err instanceof Error ? err.message : 'Failed to load the report.');
    } finally {
      setReportLoading(false);
    }
  }, []);

  // Auth Handlers
  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setLoginError(null);
    try {
      if (!isSupabaseConfigured || !supabase) {
        throw new Error('The admin portal is not connected to the database yet.');
      }
      const { error } = await supabase.auth.signInWithPassword({ email: email.trim(), password });
      if (error) throw new Error('Invalid email or password.');
      const ok = await applyStaffSession();
      if (!ok) {
        await supabase.auth.signOut();
        throw new Error('This account does not have access to the SAMS portal.');
      }
      setPassword('');
    } catch (err) {
      setLoginError(err instanceof Error ? err.message : 'Login failed.');
    } finally {
      setLoading(false);
    }
  };

  const handleLogout = async () => {
    if (supabase) await supabase.auth.signOut();
    setIsAuthenticated(false);
    setProducts([]);
    setOrders([]);
    setInquiries([]);
    setReport(null);
    setProductCosts({});
    setActiveTab('dashboard');
  };

  // --- CRUD ACTIONS ---

  const openProductModal = (product: Partial<Product>) => {
    setEditingProduct(product);
    setProductAr(productArabicForm(product));
    setEditingCost(product.id && productCosts[product.id] !== undefined ? String(productCosts[product.id]) : '');
    setIsProductModalOpen(true);
  };

  // Inventory Save (Add/Edit)
  const handleSaveProduct = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingProduct) return;
    setActionError(null);
    try {
      const saved = await dbService.saveProduct({
        ...editingProduct,
        translations: mergeArabic(editingProduct.translations, productArabicFields(productAr)),
      });
      const cost = editingCost.trim() === '' ? null : Number(editingCost);
      if (cost !== null && (!Number.isFinite(cost) || cost < 0)) throw new Error('Unit cost must be a positive number.');
      await dbService.saveProductCost(saved.id, cost);
      setProductCosts((prev) => {
        const next = { ...prev };
        if (cost === null) delete next[saved.id];
        else next[saved.id] = cost;
        return next;
      });
      setProducts(prev => {
        const exists = prev.some(p => p.id === saved.id);
        if (exists) {
          return prev.map(p => p.id === saved.id ? saved : p);
        }
        return [...prev, saved];
      });
      setIsProductModalOpen(false);
      setEditingProduct(null);
    } catch (err) {
      setActionError(err instanceof Error ? err.message : 'Error saving product');
    }
  };

  // Toggle Product Status (Active/Inactive)
  const handleToggleProductStatus = async (prod: Product) => {
    setActionError(null);
    try {
      const updated = await dbService.saveProduct({ id: prod.id, is_active: !prod.is_active });
      setProducts(prev => prev.map(p => p.id === prod.id ? updated : p));
    } catch (err) {
      setActionError(err instanceof Error ? err.message : 'Error updating product status');
    }
  };

  // Inquiries Updates (Status)
  const handleUpdateInquiryStatus = async (id: string, status: Inquiry['status']) => {
    const ok = await dbService.updateInquiryStatus(id, status);
    if (ok) {
      setInquiries(prev => prev.map(i => i.id === id ? { ...i, status } : i));
    } else {
      setActionError('Could not update the enquiry status.');
    }
  };

  const applyOrderPatch = (id: string, patch: Partial<Order>) => {
    setOrders(prev => prev.map(o => o.id === id ? { ...o, ...patch } : o));
    setSelectedOrder(prev => (prev && prev.id === id ? { ...prev, ...patch } : prev));
  };

  const loadOrderDetails = async (orderId: string) => {
    setOrderRefunds([]);
    setOrderNotifications([]);
    try {
      setOrderRefunds(await dbService.getOrderRefunds(orderId));
      if (userRole === 'admin') setOrderNotifications(await dbService.getOrderNotifications(orderId));
    } catch {
      /* details are supplementary; the order itself is already shown */
    }
  };

  const handleSaveStock = async () => {
    if (!stockEdit) return;
    const onHand = Number(stockEdit.onHand);
    const threshold = Number(stockEdit.threshold);
    if (!Number.isInteger(onHand) || onHand < 0 || !Number.isInteger(threshold) || threshold < 0) {
      setActionError('Stock and low-stock threshold must be whole numbers of 0 or more.');
      return;
    }
    if (!stockEdit.reason.trim()) {
      setActionError('Please give a reason for the stock change.');
      return;
    }
    const current = inventory[stockEdit.product.id];
    const result = await dbService.setStock({
      productId: stockEdit.product.id,
      expectedOnHand: current?.stock_on_hand ?? 0,
      newOnHand: onHand,
      trackInventory: stockEdit.track,
      lowStockThreshold: threshold,
      reason: stockEdit.reason.trim(),
    });
    if (result.ok) {
      setStockEdit(null);
      setInventory(await dbService.getInventory());
    } else {
      setActionError(result.message ?? 'Could not update stock.');
      setInventory(await dbService.getInventory());
    }
  };

  const handleReturnToStock = async (ord: Order, item: Order['items'][number]) => {
    const qtyText = window.prompt(`How many units of ${item.product_name} physically came back to the shelf? (max ${item.quantity})`);
    if (!qtyText) return;
    const qty = Number(qtyText);
    if (!Number.isInteger(qty) || qty < 1 || qty > item.quantity) {
      setActionError(`Enter a whole number between 1 and ${item.quantity}.`);
      return;
    }
    const reason = window.prompt('Reason (e.g. customer returned unopened goods) - required');
    if (!reason || !reason.trim()) return;
    const result = await dbService.returnToStock(ord.id, item.product_id, qty, reason.trim());
    if (result.ok) setInventory(await dbService.getInventory());
    else setActionError(result.message ?? 'Could not return the items to stock.');
  };

  const loadOrderHistory = async (orderId: string) => {
    try {
      setOrderHistory(await dbService.getOrderHistory(orderId));
    } catch {
      setOrderHistory([]);
    }
  };

  // Fulfilment status: the database enforces the transition table and records who changed what.
  const handleChangeOrderStatus = async (ord: Order, next: Order['status']) => {
    if (next === ord.status) return;
    setActionError(null);
    let reason: string | undefined;
    if (next === 'cancelled' || ord.status === 'cancelled') {
      const answer = window.prompt(
        next === 'cancelled'
          ? `Why is ${ord.order_number} being cancelled? (required)`
          : `Why is ${ord.order_number} being reinstated? (required)`
      );
      if (!answer || !answer.trim()) return;
      reason = answer.trim();
    }
    const result = await dbService.setOrderStatus(ord.id, ord.status, next, reason);
    if (result.ok) {
      applyOrderPatch(ord.id, { status: next });
      if (selectedOrder?.id === ord.id) loadOrderHistory(ord.id);
    } else {
      setActionError(result.message ?? 'Could not update the order.');
      fetchAdminData(userRole);
    }
  };

  // Payment alerts: visible to all staff, resolved only by the owner with a written note.
  const handleResolveAlert = async (alert: PaymentAlert) => {
    const resolution = window.prompt('How was this resolved? (e.g. refunded in Paymob, ref ...) - required');
    if (!resolution || !resolution.trim()) return;
    const result = await dbService.resolvePaymentAlert(alert.id, resolution.trim());
    if (result.ok) setPaymentAlerts(prev => prev.filter(a => a.id !== alert.id));
    else setActionError(result.message ?? 'Could not resolve the alert.');
  };

  // Offline (quotation) payment: owner only, reason required.
  const handleChangeOfflinePayment = async (ord: Order, next: Order['payment_status']) => {
    if (next === ord.payment_status) return;
    setActionError(null);
    const answer = window.prompt(
      next === 'verified'
        ? `How was ${ord.order_number} paid? (e.g. bank transfer reference) - required`
        : `Why is the payment on ${ord.order_number} being reversed? (required)`
    );
    if (!answer || !answer.trim()) return;
    const result = await dbService.setOfflinePayment(ord.id, ord.payment_status, next, answer.trim());
    if (result.ok) {
      applyOrderPatch(ord.id, { payment_status: next });
      if (selectedOrder?.id === ord.id) loadOrderHistory(ord.id);
    } else {
      setActionError(result.message ?? 'Could not record the payment.');
      fetchAdminData(userRole);
    }
  };

  const handleSaveOrderNotes = async () => {
    if (!selectedOrder) return;
    const ok = await dbService.updateOrderNotes(selectedOrder.id, orderNotesDraft);
    if (ok) {
      setOrders(prev => prev.map(o => o.id === selectedOrder.id ? { ...o, staff_notes: orderNotesDraft } : o));
      setSelectedOrder({ ...selectedOrder, staff_notes: orderNotesDraft });
    } else {
      setActionError('Could not save the order notes.');
    }
  };

  // Settings: edit locally, persist when the field loses focus.
  const handleSettingChange = (key: string, val: string) => {
    setSiteSettings(prev => ({ ...prev, [key]: val }));
  };

  const handleSaveSetting = async (key: string) => {
    const ok = await dbService.updateSiteSetting(key, siteSettings[key] ?? '');
    if (!ok) setActionError(`Could not save ${key.replace(/_/g, ' ')}.`);
  };

  // FAQ Actions
  const handleAddFAQ = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!faqQuestion.trim() || !faqAnswer.trim()) return;
    try {
      await dbService.saveFAQ({
        question: faqQuestion,
        answer: faqAnswer,
        is_active: true,
        order_index: faqs.length + 1,
        translations: mergeArabic(undefined, { question: faqQuestionAr, answer: faqAnswerAr }),
      });
      setFaqs(await dbService.getAllFAQsAdmin());
      setFaqQuestion('');
      setFaqAnswer('');
      setFaqQuestionAr('');
      setFaqAnswerAr('');
    } catch (err) {
      setActionError(err instanceof Error ? err.message : 'Failed to add FAQ.');
    }
  };

  const handleSaveFAQArabic = async () => {
    if (!faqArEdit) return;
    const faq = faqs.find((f) => f.id === faqArEdit.id);
    if (!faq) return;
    try {
      const saved = await dbService.saveFAQ({
        id: faq.id,
        translations: mergeArabic(faq.translations, { question: faqArEdit.question, answer: faqArEdit.answer }),
      });
      setFaqs((prev) => prev.map((f) => (f.id === saved.id ? saved : f)));
      setFaqArEdit(null);
    } catch (err) {
      setActionError(err instanceof Error ? err.message : 'Failed to save Arabic FAQ.');
    }
  };

  const handleDeleteFAQ = async (id: string) => {
    if (!confirm('Delete this FAQ?')) return;
    try {
      await dbService.saveFAQ({ id, is_active: false });
      setFaqs(prev => prev.filter(f => f.id !== id));
    } catch (err) {
      setActionError(err instanceof Error ? err.message : 'Failed to delete FAQ.');
    }
  };

  // Certificate Actions
  const handleAddCert = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!certName.trim() || !certIssuer.trim()) return;
    try {
      await dbService.saveCertificate({ title: certName, certificate_type: certIssuer, is_active: true });
      setCertificates(await dbService.getAllCertificatesAdmin());
      setCertName('');
      setCertIssuer('');
    } catch (err) {
      setActionError(err instanceof Error ? err.message : 'Failed to add certificate.');
    }
  };

  const handleDeleteCert = async (id: string) => {
    if (!confirm('Delete this quality certificate?')) return;
    try {
      await dbService.saveCertificate({ id, is_active: false });
      setCertificates(prev => prev.filter(c => c.id !== id));
    } catch (err) {
      setActionError(err instanceof Error ? err.message : 'Failed to delete certificate.');
    }
  };

  // --- CRM CUSTOMER AGGREGATION STATE ---
  const customers = React.useMemo(() => {
    const customerMap = new Map<string, {
      name: string;
      email: string;
      phone: string;
      company: string;
      ordersCount: number;
      inquiriesCount: number;
      location: string;
    }>();

    // Map paid/unpaid orders
    orders.forEach(o => {
      const emailKey = o.email.toLowerCase().trim();
      if (!emailKey) return;
      if (customerMap.has(emailKey)) {
        const existing = customerMap.get(emailKey)!;
        existing.ordersCount += 1;
      } else {
        customerMap.set(emailKey, {
          name: o.customer_name,
          email: o.email,
          phone: o.phone || 'N/A',
          company: 'Individual',
          ordersCount: 1,
          inquiriesCount: 0,
          location: o.address || 'Oman'
        });
      }
    });

    // Map quotation inquiries
    inquiries.forEach(i => {
      const emailKey = i.email.toLowerCase().trim();
      if (!emailKey) return;
      if (customerMap.has(emailKey)) {
        const existing = customerMap.get(emailKey)!;
        existing.inquiriesCount += 1;
        if (i.company_name && existing.company === 'Individual') {
          existing.company = i.company_name;
        }
      } else {
        customerMap.set(emailKey, {
          name: i.full_name || 'Inquirer',
          email: i.email,
          phone: i.phone || 'N/A',
          company: i.company_name || 'Individual',
          ordersCount: 0,
          inquiriesCount: 1,
          location: 'Oman'
        });
      }
    });

    return Array.from(customerMap.values());
  }, [orders, inquiries]);

  // --- FILTERED DATA SETS ---
  const filteredProducts = products.filter(p => 
    p.name.toLowerCase().includes(searchQuery.toLowerCase()) || 
    p.make.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const PAYMENT_FILTERS: Record<typeof paymentFilter, (o: Order) => boolean> = {
    all: () => true,
    awaiting: (o) => ['initiated', 'pending', 'unpaid'].includes(o.payment_status),
    paid: (o) => ['successful', 'partially_refunded', 'verified'].includes(o.payment_status),
    refunds: (o) => ['partially_refunded', 'refunded', 'voided'].includes(o.payment_status),
    failed: (o) => ['failed', 'cancelled'].includes(o.payment_status),
  };

  const filteredOrders = orders.filter(o =>
    PAYMENT_FILTERS[paymentFilter](o) && (
      o.customer_name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      (o.order_number ?? '').toLowerCase().includes(searchQuery.toLowerCase()) ||
      o.phone.includes(searchQuery) ||
      o.email.toLowerCase().includes(searchQuery.toLowerCase())
    )
  );

  const filteredInquiries = inquiries.filter(i => 
    i.full_name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    i.email.toLowerCase().includes(searchQuery.toLowerCase()) ||
    (i.product_name || '').toLowerCase().includes(searchQuery.toLowerCase())
  );

  const filteredCustomers = customers.filter(c => 
    c.name.toLowerCase().includes(searchQuery.toLowerCase()) || 
    c.email.toLowerCase().includes(searchQuery.toLowerCase()) ||
    c.company.toLowerCase().includes(searchQuery.toLowerCase())
  );


  // --- RENDERS ---

  if (!authChecked) {
    return (
      <div className="min-h-screen bg-[#F4F6F8] flex items-center justify-center">
        <Loader2 className="w-8 h-8 text-fire animate-spin" aria-label="Loading" />
      </div>
    );
  }

  if (!isAuthenticated) {
    return (
      <div className="min-h-screen bg-[#F4F6F8] flex flex-col items-center justify-center gap-6 px-4 sm:px-6 lg:px-8 py-10 text-gray-900 font-sans">
        <Link href="/" className="flex items-center gap-2 text-navy hover:text-fire transition-colors">
          <Image src="/logo.png" alt="SAMS logo" width={36} height={36} className="object-contain" />
          <span className="font-display text-lg tracking-wider font-bold">SAMS LLC</span>
        </Link>
        <div className="max-w-md w-full space-y-8 bg-white p-10 rounded-3xl border border-gray-150 shadow-xl">
          <div className="text-center space-y-3">
            <div className="bg-fire/10 p-4 rounded-full w-fit mx-auto text-fire">
              <Lock className="w-8 h-8" />
            </div>
            <h1 className="font-display text-3xl uppercase tracking-wider font-extrabold text-navy">
              SAMS Portal Sign-In
            </h1>
            <p className="text-xs text-gray-400 font-bold uppercase tracking-widest">
              Authorized admin access only
            </p>
          </div>

          <form onSubmit={handleLogin} className="space-y-6">
            {loginError && (
              <div className="bg-red-50 border border-red-200 text-fire p-4 rounded-xl text-xs font-semibold flex items-center gap-2">
                <AlertCircle className="w-5 h-5 shrink-0" />
                <span>{loginError}</span>
              </div>
            )}



            <div className="space-y-4">
              <div className="space-y-1.5">
                <label className="text-[10px] uppercase font-bold text-gray-500 tracking-wider">Email Address</label>
                <input
                  type="email"
                  required
                  autoComplete="username"
                  placeholder="you@samsoman.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="w-full bg-white border border-gray-200 rounded-xl p-3.5 text-sm focus:outline-none focus:border-fire text-gray-800 focus:ring-1 focus:ring-fire/35 transition-all"
                />
              </div>

              <div className="space-y-1.5">
                <label className="text-[10px] uppercase font-bold text-gray-500 tracking-wider">Password</label>
                <input
                  type="password"
                  required
                  autoComplete="current-password"
                  placeholder="••••••••"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="w-full bg-white border border-gray-200 rounded-xl p-3.5 text-sm focus:outline-none focus:border-fire text-gray-800 focus:ring-1 focus:ring-fire/35 transition-all"
                />
              </div>
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full bg-navy hover:bg-fire text-white text-xs uppercase tracking-widest font-bold py-4 rounded-xl transition-all shadow-lg shadow-navy/20 cursor-pointer hover:scale-[1.01] active:scale-95"
            >
              {loading ? 'Authenticating...' : 'Sign In To Dashboard'}
            </button>
          </form>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#F8F9FA] flex text-gray-900 font-sans antialiased">
      
      {/* SIDEBAR NAVIGATION */}
      <aside className="w-68 bg-white flex flex-col justify-between shrink-0 border-r border-gray-150">
        <div className="space-y-8 py-8">
          {/* Logo Branding */}
          <div className="px-6 flex items-center gap-3 pb-6 border-b border-gray-100">
            <Image 
              src="/logo.png" 
              alt="SAMS logo" 
              width={40} 
              height={40} 
              className="object-contain" 
            />
            <div>
              <span className="font-display text-lg tracking-wider font-bold text-navy block leading-none">SAMS LLC</span>
              <span className="text-[9px] uppercase tracking-widest text-gray-400 font-bold">Admin Portal</span>
            </div>
          </div>

          {/* Navigation Links */}
          <div className="space-y-6">
            <div className="px-6">
              <span className="text-[10px] uppercase tracking-widest font-bold text-gray-400 block mb-3">Main Navigation</span>
              <nav className="space-y-1.5">
                {userRole === 'admin' ? (
                  <>
                    <button
                      onClick={() => { setActiveTab('dashboard'); setSearchQuery(''); }}
                      className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl transition-all text-xs font-bold uppercase tracking-wider ${
                        activeTab === 'dashboard' ? 'bg-navy/5 text-navy font-extrabold border-l-4 border-navy' : 'text-gray-500 hover:bg-gray-50'
                      }`}
                    >
                      <LayoutDashboard className="w-4 h-4" />
                      Dashboard
                    </button>
                    <button
                      onClick={() => { setActiveTab('orders'); setSearchQuery(''); }}
                      className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl transition-all text-xs font-bold uppercase tracking-wider ${
                        activeTab === 'orders' ? 'bg-navy/5 text-navy font-extrabold border-l-4 border-navy' : 'text-gray-500 hover:bg-gray-50'
                      }`}
                    >
                      <ShoppingBag className="w-4 h-4" />
                      Orders
                    </button>
                    <button
                      onClick={() => { setActiveTab('inventory'); setSearchQuery(''); }}
                      className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl transition-all text-xs font-bold uppercase tracking-wider ${
                        activeTab === 'inventory' ? 'bg-navy/5 text-navy font-extrabold border-l-4 border-navy' : 'text-gray-500 hover:bg-gray-50'
                      }`}
                    >
                      <FileText className="w-4 h-4" />
                      Inventory
                    </button>
                    <button
                      onClick={() => { setActiveTab('customers'); setSearchQuery(''); }}
                      className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl transition-all text-xs font-bold uppercase tracking-wider ${
                        activeTab === 'customers' ? 'bg-navy/5 text-navy font-extrabold border-l-4 border-navy' : 'text-gray-500 hover:bg-gray-50'
                      }`}
                    >
                      <Users className="w-4 h-4" />
                      Customers
                    </button>
                    <button
                      onClick={() => { setActiveTab('reports'); setSearchQuery(''); loadReport(reportPeriod); }}
                      className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl transition-all text-xs font-bold uppercase tracking-wider ${
                        activeTab === 'reports' ? 'bg-navy/5 text-navy font-extrabold border-l-4 border-navy' : 'text-gray-500 hover:bg-gray-50'
                      }`}
                    >
                      <TrendingUp className="w-4 h-4" />
                      Reports & Analytics
                    </button>
                    <button
                      onClick={() => { setActiveTab('whatsapp'); setSearchQuery(''); }}
                      className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl transition-all text-xs font-bold uppercase tracking-wider ${
                        activeTab === 'whatsapp' ? 'bg-navy/5 text-navy font-extrabold border-l-4 border-navy' : 'text-gray-500 hover:bg-gray-50'
                      }`}
                    >
                      <MessageSquare className="w-4 h-4" />
                      WhatsApp Connect
                    </button>
                  </>
                ) : (
                  <>
                    <button
                      onClick={() => { setActiveTab('dashboard'); setSearchQuery(''); }}
                      className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl transition-all text-xs font-bold uppercase tracking-wider ${
                        activeTab === 'dashboard' ? 'bg-navy/5 text-navy font-extrabold border-l-4 border-navy' : 'text-gray-500 hover:bg-gray-50'
                      }`}
                    >
                      <LayoutDashboard className="w-4 h-4" />
                      Follow-up Queue
                    </button>
                    <button
                      onClick={() => { setActiveTab('orders'); setSearchQuery(''); }}
                      className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl transition-all text-xs font-bold uppercase tracking-wider ${
                        activeTab === 'orders' ? 'bg-navy/5 text-navy font-extrabold border-l-4 border-navy' : 'text-gray-500 hover:bg-gray-50'
                      }`}
                    >
                      <ShoppingBag className="w-4 h-4" />
                      Orders & Logistics
                    </button>
                    <button
                      onClick={() => { setActiveTab('customers'); setSearchQuery(''); }}
                      className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl transition-all text-xs font-bold uppercase tracking-wider ${
                        activeTab === 'customers' ? 'bg-navy/5 text-navy font-extrabold border-l-4 border-navy' : 'text-gray-500 hover:bg-gray-50'
                      }`}
                    >
                      <Users className="w-4 h-4" />
                      Customers (CRM)
                    </button>
                    <button
                      onClick={() => { setActiveTab('whatsapp'); setSearchQuery(''); }}
                      className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl transition-all text-xs font-bold uppercase tracking-wider ${
                        activeTab === 'whatsapp' ? 'bg-navy/5 text-navy font-extrabold border-l-4 border-navy' : 'text-gray-500 hover:bg-gray-50'
                      }`}
                    >
                      <MessageSquare className="w-4 h-4" />
                      WhatsApp Connect
                    </button>
                  </>
                )}
              </nav>
            </div>

            {userRole === 'admin' && (
              <div className="px-6 border-t border-gray-100 pt-6">
                <span className="text-[10px] uppercase tracking-widest font-bold text-gray-400 block mb-3">Other settings</span>
                <nav className="space-y-1.5">
                  <button
                    onClick={() => { setActiveTab('settings'); setSearchQuery(''); }}
                    className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl transition-all text-xs font-bold uppercase tracking-wider ${
                      activeTab === 'settings' ? 'bg-navy/5 text-navy font-extrabold border-l-4 border-navy' : 'text-gray-500 hover:bg-gray-50'
                    }`}
                  >
                    <Settings className="w-4 h-4" />
                    Settings
                  </button>
                </nav>
              </div>
            )}
          </div>
        </div>

        {/* Support & Logout Footer */}
        <div className="p-4 border-t border-gray-100 space-y-4">
          {/* Help Support Box */}
          <div className="bg-gradient-to-br from-navy/5 to-[#063247]/5 p-4 rounded-2xl border border-navy/5 space-y-3">
            <span className="text-xs font-bold text-navy uppercase block tracking-wider leading-none">Need Help?</span>
            <span className="text-[10px] text-gray-500 font-light block leading-relaxed">
              Questions about an order or payment? Email the SAMS team.
            </span>
            <a 
              href="mailto:info@samsoman.com" 
              className="bg-navy hover:bg-fire text-white text-[9px] uppercase tracking-wider font-bold py-2 px-3 rounded-lg text-center block transition-all"
            >
              Get Support
            </a>
          </div>

          <button
            onClick={handleLogout}
            className="w-full flex items-center justify-center gap-2 bg-gray-50 hover:bg-fire/10 hover:text-fire text-gray-500 py-3 rounded-xl text-xs uppercase tracking-widest font-bold transition-all cursor-pointer"
          >
            <LogOut className="w-4 h-4" />
            Logout
          </button>
        </div>
      </aside>

      {/* MAIN LAYOUT SPACE */}
      <div className="flex-grow flex flex-col min-h-screen overflow-hidden">
        
        {/* HEADER */}
        <header className="h-20 bg-white border-b border-gray-150 px-8 flex items-center justify-between shrink-0">
          {/* Search Box */}
          <div className="relative w-80">
            <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
            <input 
              type="text" 
              placeholder={`Search in ${activeTab}...`} 
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full bg-gray-50/50 border border-gray-200 rounded-xl py-2.5 pl-10 pr-4 text-xs focus:outline-none focus:border-fire transition-colors text-gray-800 placeholder-gray-400"
            />
          </div>

          {/* User Status Bar */}
          <div className="flex items-center gap-6">
            <a
              href="/"
              target="_blank"
              rel="noopener noreferrer"
              className="hidden md:inline-flex items-center gap-1.5 text-[10px] uppercase tracking-wider font-bold text-navy hover:text-fire transition-colors"
            >
              <ExternalLink className="w-3.5 h-3.5" />
              View store
            </a>
            <button
              onClick={() => fetchAdminData(userRole)}
              disabled={dataLoading}
              className="relative p-2 rounded-xl hover:bg-gray-100 text-gray-500 transition-colors disabled:opacity-50"
              title="Refresh data"
              aria-label="Refresh data"
            >
              <RefreshCw className={`w-5 h-5 ${dataLoading ? 'animate-spin' : ''}`} />
            </button>

            <div className="flex items-center gap-3 pl-4 border-l border-gray-150">
              <div className="bg-navy/10 p-2.5 rounded-full text-navy font-bold w-10 h-10 flex items-center justify-center text-sm uppercase font-display">
                {(userName || 'SA').substring(0, 2).toUpperCase()}
              </div>
              <div className="hidden sm:block leading-none text-left">
                <span className="text-xs font-bold text-navy block">{userName}</span>
                <span className="text-[10px] text-gray-400 font-mono mt-0.5 block">
                  {sessionEmail} · {userRole === 'admin' ? 'Owner' : 'Sales'}
                </span>
              </div>
            </div>
          </div>
        </header>

        {/* CONTENT SWITCHER */}
        <main className="flex-1 overflow-y-auto p-8 lg:p-10">
          {(dataError || actionError) && (
            <div role="alert" className="mb-6 bg-red-50 border border-red-200 text-fire p-4 rounded-xl text-xs font-semibold flex items-center justify-between gap-3">
              <span className="flex items-center gap-2"><AlertCircle className="w-4 h-4 shrink-0" />{dataError ?? actionError}</span>
              <button onClick={() => { setActionError(null); if (dataError) fetchAdminData(userRole); }} className="underline shrink-0">
                {dataError ? 'Retry' : 'Dismiss'}
              </button>
            </div>
          )}

          {/* ============================================================== */}
          {/* TAB 1: DASHBOARD OVERVIEW */}
          {activeTab === 'dashboard' && (
            <div className="space-y-8">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div className="space-y-1">
                  <h2 className="font-display text-3xl font-bold uppercase tracking-wider text-navy">
                    Dashboard Overview
                  </h2>
                  <p className="text-xs text-gray-500 font-light">
                    Real-time catalog metrics, quotation pipelines, and processing checkouts.
                  </p>
                </div>
                {userRole === 'admin' && (
                <button
                  onClick={() => openProductModal({ currency: 'OMR', life_years: 5, is_active: true, images: [] })}
                  className="bg-navy hover:bg-fire text-white text-xs uppercase tracking-widest font-bold px-5 py-3 rounded-xl flex items-center gap-2 transition-all shadow-md active:scale-95"
                >
                  <Plus className="w-4 h-4" />
                  Add New Product
                </button>
                )}
              </div>

              {/* Stat Panels */}
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
                <div className="bg-white p-6 rounded-2xl border border-gray-150 flex items-center justify-between shadow-sm hover:shadow-md transition-shadow">
                  <div className="space-y-1">
                    <span className="text-[10px] text-gray-400 uppercase tracking-widest font-bold block">SAMS Products</span>
                    <span className="text-3xl font-extrabold text-navy font-display">{products.length}</span>
                  </div>
                  <div className="bg-blue-50 p-3.5 rounded-xl text-blue-600"><ShoppingBag className="w-6 h-6" /></div>
                </div>

                <div className="bg-white p-6 rounded-2xl border border-gray-150 flex items-center justify-between shadow-sm hover:shadow-md transition-shadow">
                  <div className="space-y-1">
                    <span className="text-[10px] text-gray-400 uppercase tracking-widest font-bold block">Quotation Enquiries</span>
                    <span className="text-3xl font-extrabold text-navy font-display">{inquiries.length}</span>
                  </div>
                  <div className="bg-orange-50 p-3.5 rounded-xl text-safety"><MessageSquare className="w-6 h-6" /></div>
                </div>

                <div className="bg-white p-6 rounded-2xl border border-gray-150 flex items-center justify-between shadow-sm hover:shadow-md transition-shadow">
                  <div className="space-y-1">
                    <span className="text-[10px] text-gray-400 uppercase tracking-widest font-bold block">Paid Orders</span>
                    <span className="text-3xl font-extrabold text-navy font-display">{orders.filter(o => o.payment_status === 'successful' || o.payment_status === 'verified').length}</span>
                  </div>
                  <div className="bg-green-50 p-3.5 rounded-xl text-green-600"><FileCode className="w-6 h-6" /></div>
                </div>

                <div className="bg-white p-6 rounded-2xl border border-gray-150 flex items-center justify-between shadow-sm hover:shadow-md transition-shadow">
                  <div className="space-y-1">
                    <span className="text-[10px] text-gray-400 uppercase tracking-widest font-bold block">Registered Contacts</span>
                    <span className="text-3xl font-extrabold text-navy font-display">{customers.length}</span>
                  </div>
                  <div className="bg-purple-50 p-3.5 rounded-xl text-purple-650"><Users className="w-6 h-6" /></div>
                </div>
              </div>

              {/* Grid: Recent Orders & Enquiries */}
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                {/* Quotations */}
                <div className="bg-white rounded-2xl border border-gray-150 p-6 shadow-sm space-y-6">
                  <div className="flex justify-between items-center pb-4 border-b border-gray-100">
                    <h3 className="font-display text-lg uppercase font-bold text-navy">Recent Quotations</h3>
                    <button 
                      onClick={() => setActiveTab('orders')}
                      className="text-[10px] uppercase font-bold text-fire hover:underline transition-all"
                    >
                      View All
                    </button>
                  </div>
                  <div className="space-y-4">
                    {inquiries.slice(0, 4).map((inq) => (
                      <div key={inq.id} className="flex justify-between items-center text-xs pb-3 border-b border-gray-50 last:border-0 last:pb-0">
                        <div className="space-y-0.5 text-left">
                          <p className="font-bold text-navy">{inq.full_name}</p>
                          <p className="text-gray-400 font-light">{inq.product_name} | Qty: {inq.quantity}</p>
                        </div>
                        <div className="text-right space-y-1">
                          <span className={`px-2 py-0.5 rounded-full font-bold text-[9px] uppercase tracking-wider block w-fit ml-auto ${
                            inq.status === 'new' ? 'bg-blue-50 text-blue-600' : 'bg-gray-100 text-gray-500'
                          }`}>
                            {inq.status}
                          </span>
                          <span className="text-[9px] text-gray-400 block font-mono">
                            {new Date(inq.created_at).toLocaleDateString('en-GB')}
                          </span>
                        </div>
                      </div>
                    ))}
                    {inquiries.length === 0 && (
                      <p className="text-xs text-gray-400 italic text-center py-6">No quotation enquiries available.</p>
                    )}
                  </div>
                </div>

                {/* Orders */}
                <div className="bg-white rounded-2xl border border-gray-150 p-6 shadow-sm space-y-6">
                  <div className="flex justify-between items-center pb-4 border-b border-gray-100">
                    <h3 className="font-display text-lg uppercase font-bold text-navy">Recent Orders</h3>
                    <button 
                      onClick={() => setActiveTab('orders')}
                      className="text-[10px] uppercase font-bold text-fire hover:underline transition-all"
                    >
                      View All
                    </button>
                  </div>
                  <div className="space-y-4">
                    {orders.slice(0, 4).map((ord) => (
                      <div key={ord.id} className="flex justify-between items-center text-xs pb-3 border-b border-gray-50 last:border-0 last:pb-0">
                        <div className="space-y-0.5 text-left">
                          <p className="font-bold text-navy">{ord.customer_name} <span className="font-mono text-[10px] text-gray-400">{ord.order_number}</span></p>
                          <p className="text-gray-400 font-light">
                            Total: <strong className="font-semibold text-navy">{Number(ord.total_amount).toFixed(3)} OMR</strong> | {ord.order_type === 'online' ? 'Card' : 'Quotation'} · {ord.payment_status}
                          </p>
                        </div>
                        <div className="text-right space-y-1">
                          <span className={`px-2 py-0.5 rounded-full font-bold text-[9px] uppercase tracking-wider block w-fit ml-auto ${
                            ord.status === 'delivered' || ord.status === 'completed' || ord.status === 'paid'
                              ? 'bg-green-50 text-green-600'
                              : ord.status === 'shipping'
                                ? 'bg-blue-50 text-blue-650'
                                : ord.status === 'processing'
                                  ? 'bg-orange-50 text-safety'
                                  : ord.status === 'placement' || ord.status === 'manual_inquiry' || ord.status === 'pending_payment'
                                    ? 'bg-yellow-50 text-yellow-600'
                                    : 'bg-red-50 text-fire'
                          }`}>
                            {ord.status}
                          </span>
                          <span className="text-[9px] text-gray-400 block font-mono">
                            {new Date(ord.created_at).toLocaleDateString('en-GB')}
                          </span>
                        </div>
                      </div>
                    ))}
                    {orders.length === 0 && (
                      <p className="text-xs text-gray-400 italic text-center py-6">No checkout orders processed yet.</p>
                    )}
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* ============================================================== */}
          {/* TAB 2: ORDERS & INQUIRIES MANAGEMENT */}
          {activeTab === 'orders' && (
            <div className="space-y-6">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-gray-200 pb-4">
                <div className="space-y-1">
                  <h2 className="font-display text-3xl font-bold uppercase tracking-wider text-navy">
                    Orders & Quotations
                  </h2>
                  <p className="text-xs text-gray-500 font-light">
                    Card payments are confirmed automatically by Paymob. Click an order for full delivery details.
                  </p>
                </div>

                {/* Sub Tab Toggles */}
                <div className="flex bg-gray-100 p-1 rounded-xl w-fit">
                  <button
                    onClick={() => setOrdersTab('checkout')}
                    className={`px-4 py-2 rounded-lg text-xs uppercase font-bold tracking-wider transition-all ${
                      ordersTab === 'checkout' ? 'bg-white text-navy shadow-sm' : 'text-gray-500 hover:text-navy'
                    }`}
                  >
                    Orders ({filteredOrders.length})
                  </button>
                  <button
                    onClick={() => setOrdersTab('quotations')}
                    className={`px-4 py-2 rounded-lg text-xs uppercase font-bold tracking-wider transition-all ${
                      ordersTab === 'quotations' ? 'bg-white text-navy shadow-sm' : 'text-gray-500 hover:text-navy'
                    }`}
                  >
                    Quotation Enquiries ({filteredInquiries.length})
                  </button>
                </div>
              </div>

              {ordersTab === 'checkout' && (
                <label className="flex items-center gap-2 text-[10px] uppercase font-bold tracking-wider text-gray-500 w-fit">
                  Payment
                  <select
                    value={paymentFilter}
                    onChange={(e) => setPaymentFilter(e.target.value as typeof paymentFilter)}
                    className="text-[10px] uppercase font-bold tracking-wider bg-white border border-gray-200 rounded-lg p-2 focus:outline-none focus:border-fire"
                  >
                    <option value="all">All</option>
                    <option value="awaiting">Awaiting payment</option>
                    <option value="paid">Paid</option>
                    <option value="refunds">Refunded / voided</option>
                    <option value="failed">Failed / cancelled</option>
                  </select>
                </label>
              )}

              {paymentAlerts.length > 0 && (
                <section aria-label="Payment alerts" className="bg-red-50 border border-red-200 rounded-2xl p-5 space-y-3">
                  <h3 className="font-display text-base uppercase font-bold text-fire flex items-center gap-2">
                    <AlertCircle className="w-5 h-5" />
                    Payment alerts ({paymentAlerts.length})
                  </h3>
                  <ul className="space-y-2">
                    {paymentAlerts.map((alert) => (
                      <li key={alert.id} className="bg-white border border-red-100 rounded-xl p-3 text-xs flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                        <div className="space-y-0.5">
                          <span className="font-bold uppercase tracking-wider text-[10px] text-fire">{alert.kind.replace(/_/g, ' ')}</span>
                          <p className="text-gray-700">{alert.message}</p>
                          <span className="text-[10px] text-gray-400 font-mono">{new Date(alert.created_at).toLocaleString('en-GB', { timeZone: 'Asia/Muscat' })}</span>
                        </div>
                        {userRole === 'admin' ? (
                          <button
                            onClick={() => handleResolveAlert(alert)}
                            className="shrink-0 bg-navy hover:bg-fire text-white text-[10px] uppercase tracking-wider font-bold py-2 px-3 rounded-lg"
                          >
                            Mark resolved
                          </button>
                        ) : (
                          <span className="shrink-0 text-[10px] text-gray-500 font-semibold">Owner will resolve</span>
                        )}
                      </li>
                    ))}
                  </ul>
                </section>
              )}

              {/* SUBTAB 1: CHECKOUT ORDERS */}
              {ordersTab === 'checkout' && (
                <div className="bg-white border border-gray-150 rounded-2xl shadow-sm overflow-hidden">
                  <div className="overflow-x-auto">
                    <table className="w-full text-left text-xs border-collapse">
                      <thead>
                        <tr className="bg-gray-50 text-gray-400 uppercase tracking-wider text-[10px] border-b border-gray-150 font-bold">
                          <th className="p-4 pl-6">Order</th>
                          <th className="p-4">Customer</th>
                          <th className="p-4">Items</th>
                          <th className="p-4">Total</th>
                          <th className="p-4">Type</th>
                          <th className="p-4">Order Status</th>
                          <th className="p-4">Payment</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-gray-100 text-gray-700">
                        {filteredOrders.map((ord) => (
                          <tr
                            key={ord.id}
                            className="hover:bg-gray-50/50 transition-colors cursor-pointer"
                            onClick={() => { setSelectedOrder(ord); setOrderNotesDraft(ord.staff_notes ?? ''); setOrderHistory([]); loadOrderHistory(ord.id); loadOrderDetails(ord.id); }}
                          >
                            <td className="p-4 pl-6">
                              <span className="font-mono font-bold text-navy block">{ord.order_number}</span>
                              <span className="text-[10px] text-gray-400 font-mono">{new Date(ord.created_at).toLocaleString('en-GB', { timeZone: 'Asia/Muscat' })}</span>
                            </td>
                            <td className="p-4">
                              <span className="font-bold text-navy block">{ord.customer_name}</span>
                              <a href={`tel:${ord.phone}`} onClick={(e) => e.stopPropagation()} className="text-gray-500 text-[10px] font-mono block hover:text-fire">{ord.phone}</a>
                              <span className="text-gray-400 text-[10px] font-mono block">{ord.email}</span>
                            </td>
                            <td className="p-4 font-light max-w-[220px]">
                              {ord.items.map((it) => `${it.quantity} x ${it.product_name}`).join(', ')}
                            </td>
                            <td className="p-4 font-bold text-navy text-[13px] whitespace-nowrap">{Number(ord.total_amount).toFixed(3)} OMR</td>
                            <td className="p-4 uppercase tracking-widest text-[9px] font-semibold">
                              {ord.order_type === 'online' ? (
                                <span className="inline-flex items-center gap-1 text-blue-700"><CreditCard className="w-3 h-3" />Card</span>
                              ) : 'Quotation'}
                            </td>
                            <td className="p-4" onClick={(e) => e.stopPropagation()}>
                              <select
                                value={ord.status}
                                aria-label={`Order status for ${ord.order_number}`}
                                onChange={(e) => handleChangeOrderStatus(ord, e.target.value as Order['status'])}
                                className={`text-[10px] font-bold uppercase tracking-wider px-2.5 py-1.5 rounded-lg border focus:outline-none ${
                                  ord.status === 'delivered' || ord.status === 'completed'
                                    ? 'bg-green-50 text-green-700 border-green-200'
                                    : ord.status === 'shipping'
                                      ? 'bg-blue-50 text-blue-700 border-blue-200'
                                      : ord.status === 'processing' || ord.status === 'paid'
                                        ? 'bg-orange-50 text-safety border-orange-200'
                                        : ord.status === 'placement' || ord.status === 'manual_inquiry' || ord.status === 'pending_payment'
                                          ? 'bg-yellow-50 text-yellow-700 border-yellow-200'
                                          : 'bg-red-50 text-fire border-red-200'
                                }`}
                              >
                                <option value={ord.status}>{STATUS_LABELS[ord.status] ?? ord.status}</option>
                                {(STATUS_TRANSITIONS[ord.status] ?? [])
                                  .filter((next) => ord.status !== 'cancelled' || (userRole === 'admin' && reinstateAllowed(ord, next)))
                                  .map((next) => {
                                  const needsPayment = FULFILMENT_STATUSES.includes(next) && !isPaymentConfirmed(ord);
                                  const ownerOnly = next === 'cancelled' && isPaymentConfirmed(ord) && userRole !== 'admin';
                                  return (
                                    <option key={next} value={next} disabled={needsPayment || ownerOnly}>
                                      {STATUS_LABELS[next]}{needsPayment ? ' (awaiting payment)' : ownerOnly ? ' (owner only)' : ''}
                                    </option>
                                  );
                                })}
                              </select>
                            </td>
                            <td className="p-4" onClick={(e) => e.stopPropagation()}>
                              {ord.payment_provider === 'paymob' ? (
                                <span
                                  title="Set automatically by Paymob"
                                  className={`inline-flex items-center gap-1 text-[10px] font-bold uppercase tracking-wider px-2.5 py-1.5 rounded-lg border ${
                                    ord.payment_status === 'successful'
                                      ? 'bg-green-50 text-green-700 border-green-200'
                                      : ord.payment_status === 'failed'
                                        ? 'bg-red-50 text-fire border-red-200'
                                        : 'bg-yellow-50 text-yellow-700 border-yellow-200'
                                  }`}
                                >
                                  <Lock className="w-3 h-3" />
                                  {ord.payment_status === 'successful' ? 'Paid (Paymob)' : ord.payment_status}
                                </span>
                              ) : (
                                userRole === 'admin' && (ord.payment_status === 'unpaid' || ord.payment_status === 'verified') ? (
                                  <select
                                    value={ord.payment_status}
                                    aria-label={`Offline payment for ${ord.order_number}`}
                                    onChange={(e) => handleChangeOfflinePayment(ord, e.target.value as Order['payment_status'])}
                                    className={`text-[10px] font-bold uppercase tracking-wider px-2.5 py-1.5 rounded-lg border focus:outline-none ${
                                      ord.payment_status === 'verified'
                                        ? 'bg-green-50 text-green-700 border-green-200'
                                        : 'bg-yellow-50 text-yellow-700 border-yellow-200'
                                    }`}
                                  >
                                    <option value="unpaid">Unpaid</option>
                                    <option value="verified">Paid (verified)</option>
                                  </select>
                                ) : (
                                  <span
                                    title="Only the owner can record an offline payment"
                                    className={`inline-flex items-center gap-1 text-[10px] font-bold uppercase tracking-wider px-2.5 py-1.5 rounded-lg border ${
                                      ord.payment_status === 'verified' ? 'bg-green-50 text-green-700 border-green-200' : 'bg-yellow-50 text-yellow-700 border-yellow-200'
                                    }`}
                                  >
                                    {ord.payment_status === 'verified' ? 'Paid (verified)' : ord.payment_status}
                                  </span>
                                )
                              )}
                            </td>
                          </tr>
                        ))}
                        {filteredOrders.length === 0 && (
                          <tr>
                            <td colSpan={7} className="p-8 text-center text-gray-400 italic">No checkout orders found.</td>
                          </tr>
                        )}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}

              {/* SUBTAB 2: QUOTATIONS */}
              {ordersTab === 'quotations' && (
                <div className="bg-white border border-gray-150 rounded-2xl shadow-sm overflow-hidden">
                  <div className="overflow-x-auto">
                    <table className="w-full text-left text-xs border-collapse">
                      <thead>
                        <tr className="bg-gray-50 text-gray-400 uppercase tracking-wider text-[10px] border-b border-gray-150 font-bold">
                          <th className="p-4 pl-6">Enquirer Details</th>
                          <th className="p-4">Company</th>
                          <th className="p-4">Product Requested</th>
                          <th className="p-4">Quantity</th>
                          <th className="p-4">Message</th>
                          <th className="p-4">Date</th>
                          <th className="p-4">Status</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-gray-100 text-gray-700">
                        {filteredInquiries.map((inq) => (
                          <tr key={inq.id} className="hover:bg-gray-50/50 transition-colors">
                            <td className="p-4 pl-6">
                              <span className="font-bold text-navy block">{inq.full_name}</span>
                              <span className="text-gray-400 text-[10px] font-mono block">{inq.email}</span>
                              <span className="text-gray-450 text-[10px] block">{inq.phone || 'N/A'}</span>
                            </td>
                            <td className="p-4 font-semibold text-navy">{inq.company_name || 'Individual'}</td>
                            <td className="p-4 font-bold text-fire">{inq.product_name}</td>
                            <td className="p-4 font-bold text-navy">{inq.quantity} Unit(s)</td>
                            <td className="p-4 max-w-xs truncate font-light text-gray-500" title={inq.message}>{inq.message}</td>
                            <td className="p-4 font-mono font-light text-gray-450">{new Date(inq.created_at).toLocaleDateString('en-GB')}</td>
                            <td className="p-4">
                              <select
                                value={inq.status}
                                onChange={(e) => handleUpdateInquiryStatus(inq.id, e.target.value as Inquiry['status'])}
                                className={`text-[10px] font-bold uppercase tracking-wider px-2.5 py-1.5 rounded-lg border focus:outline-none ${
                                  inq.status === 'new' 
                                    ? 'bg-blue-50 text-blue-700 border-blue-200' 
                                    : inq.status === 'contacted'
                                      ? 'bg-yellow-50 text-yellow-700 border-yellow-200'
                                      : 'bg-green-50 text-green-700 border-green-200'
                                }`}
                              >
                                <option value="new">New</option>
                                <option value="contacted">Contacted</option>
                                <option value="quoted">Quoted</option>
                                <option value="closed">Closed</option>
                              </select>
                            </td>
                          </tr>
                        ))}
                        {filteredInquiries.length === 0 && (
                          <tr>
                            <td colSpan={7} className="p-8 text-center text-gray-400 italic">No quotation enquiries found.</td>
                          </tr>
                        )}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* ============================================================== */}
          {/* TAB 3: INVENTORY MANAGEMENT */}
          {activeTab === 'inventory' && (
            <div className="space-y-6">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-gray-200 pb-4">
                <div className="space-y-1">
                  <h2 className="font-display text-3xl font-bold uppercase tracking-wider text-navy">
                    Inventory Management
                  </h2>
                  <p className="text-xs text-gray-500 font-light">
                    Add or update SAMS automatic fire extinguisher details, pricing, Omani specifications, and active lifecycle status.
                  </p>
                </div>
                <button
                  onClick={() => openProductModal({ currency: 'OMR', life_years: 5, is_active: true, images: [] })}
                  className="bg-navy hover:bg-fire text-white text-xs uppercase tracking-widest font-bold px-5 py-3 rounded-xl flex items-center gap-2 transition-all shadow-md active:scale-95"
                >
                  <Plus className="w-4 h-4" />
                  Add New Product
                </button>
              </div>

              {/* Products Table */}
              <div className="bg-white border border-gray-150 rounded-2xl shadow-sm overflow-hidden">
                <div className="overflow-x-auto">
                  <table className="w-full text-left text-xs border-collapse">
                    <thead>
                      <tr className="bg-gray-50 text-gray-400 uppercase tracking-wider text-[10px] border-b border-gray-150 font-bold">
                        <th className="p-4 pl-6">Preview</th>
                        <th className="p-4">Product Details</th>
                        <th className="p-4">Make / Specs</th>
                        <th className="p-4">Weight</th>
                        <th className="p-4">OMR Price</th>
                        <th className="p-4">Stock</th>
                        <th className="p-4">Status</th>
                        <th className="p-4 text-right pr-6">Actions</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-100 text-gray-700">
                      {filteredProducts.map((prod) => (
                        <tr key={prod.id} className="hover:bg-gray-50/50 transition-colors">
                          <td className="p-4 pl-6">
                            <div className="relative w-10 h-10 rounded-lg overflow-hidden border border-gray-200">
                              <Image 
                                src={prod.images[0] || '/hero_bg.png'} 
                                alt={prod.name} 
                                fill 
                                sizes="40px" 
                                className="object-cover" 
                              />
                            </div>
                          </td>
                          <td className="p-4">
                            <span className="font-bold text-navy block">{prod.name}</span>
                            <span className="text-gray-450 text-[10px] font-mono block">{prod.slug}</span>
                            {hasArabic(prod) ? (
                              <span className="mt-1 inline-block px-1.5 py-0.5 rounded bg-green-50 text-green-700 text-[9px] font-bold uppercase tracking-wider" title={arText(arabicOf(prod), 'name')}>AR ✓</span>
                            ) : (
                              <span className="mt-1 inline-block px-1.5 py-0.5 rounded bg-amber-50 text-amber-700 text-[9px] font-bold uppercase tracking-wider">AR missing</span>
                            )}
                          </td>
                          <td className="p-4">
                            <span className="font-semibold text-gray-700 block">{prod.make}</span>
                            <span className="text-gray-400 text-[10px] block">{prod.product_type}</span>
                          </td>
                          <td className="p-4 font-mono font-medium text-navy">{prod.weight}</td>
                          <td className="p-4 font-bold text-navy">{Number(prod.price).toFixed(3)} OMR</td>
                          <td className="p-4">
                            {(() => {
                              const inv = inventory[prod.id];
                              if (!inv) return <span className="text-gray-400">-</span>;
                              if (!inv.track_inventory) return <span className="text-gray-500 font-semibold">Not tracked</span>;
                              const low = inv.stock_available <= inv.low_stock_threshold;
                              return (
                                <div className="space-y-0.5">
                                  <span className={`font-bold block ${inv.stock_available <= 0 ? 'text-fire' : low ? 'text-safety' : 'text-green-700'}`}>
                                    {inv.stock_available} available{inv.stock_available <= 0 ? ' (out of stock)' : low ? ' (low)' : ''}
                                  </span>
                                  <span className="text-[10px] text-gray-400 block">{inv.stock_on_hand} on hand · {inv.stock_reserved} reserved</span>
                                  {!inv.quantity_confirmed && <span className="text-[10px] text-fire font-bold block">Quantity not entered yet</span>}
                                </div>
                              );
                            })()}
                          </td>
                          <td className="p-4">
                            <span className={`px-2.5 py-1 rounded-full font-bold text-[9px] uppercase tracking-wider ${
                              prod.is_active ? 'bg-green-50 text-green-700' : 'bg-red-50 text-red-700'
                            }`}>
                              {prod.is_active ? 'Active' : 'Inactive'}
                            </span>
                          </td>
                          <td className="p-4 text-right pr-6 space-x-2">
                            {userRole === 'admin' && (
                              <button
                                onClick={() => {
                                  const inv = inventory[prod.id];
                                  setStockEdit({ product: prod, onHand: String(inv?.stock_on_hand ?? 0), track: inv?.track_inventory ?? true, threshold: String(inv?.low_stock_threshold ?? 3), reason: '' });
                                }}
                                className="p-2 bg-gray-50 hover:bg-navy/10 rounded-lg text-navy text-[10px] font-bold uppercase tracking-wider inline-block"
                                title="Adjust stock"
                              >
                                Stock
                              </button>
                            )}
                            <button
                              onClick={() => openProductModal(prod)}
                              className="p-2 bg-gray-50 hover:bg-navy/10 rounded-lg text-navy hover:text-navy transition-all active:scale-95 inline-block"
                              title="Edit Product"
                              hidden={userRole !== 'admin'}
                            >
                              <Edit3 className="w-4 h-4" />
                            </button>
                            <button
                              onClick={() => handleToggleProductStatus(prod)}
                              className={`p-2 rounded-lg transition-all active:scale-95 inline-block ${
                                prod.is_active 
                                  ? 'bg-red-50 hover:bg-red-100 text-fire' 
                                  : 'bg-green-50 hover:bg-green-100 text-green-600'
                              }`}
                              title={prod.is_active ? 'Deactivate Product' : 'Activate Product'}
                            >
                              {prod.is_active ? <X className="w-4 h-4" /> : <Check className="w-4 h-4" />}
                            </button>
                          </td>
                        </tr>
                      ))}
                      {filteredProducts.length === 0 && (
                        <tr>
                          <td colSpan={8} className="p-8 text-center text-gray-400 italic">No products matched search parameters.</td>
                        </tr>
                      )}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          )}

          {/* ============================================================== */}
          {/* TAB 4: REGISTERED CUSTOMERS (CRM) */}
          {activeTab === 'customers' && (
            <div className="space-y-6">
              <div className="space-y-1 border-b border-gray-200 pb-4">
                <h2 className="font-display text-3xl font-bold uppercase tracking-wider text-navy">
                  Registered Customers & CRM
                </h2>
                <p className="text-xs text-gray-500 font-light">
                  A unified list of individual customers and businesses that have ordered or submitted quotation enquiries.
                </p>
              </div>

              {/* Customers CRM List */}
              <div className="bg-white border border-gray-150 rounded-2xl shadow-sm overflow-hidden">
                <div className="overflow-x-auto">
                  <table className="w-full text-left text-xs border-collapse">
                    <thead>
                      <tr className="bg-gray-50 text-gray-400 uppercase tracking-wider text-[10px] border-b border-gray-150 font-bold">
                        <th className="p-4 pl-6">Contact Name</th>
                        <th className="p-4">Email Address</th>
                        <th className="p-4">Phone Number</th>
                        <th className="p-4">Client Type / Company</th>
                        <th className="p-4">Billing Location</th>
                        <th className="p-4 text-center">Checkout Invoices</th>
                        <th className="p-4 text-center">Quotations</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-100 text-gray-700">
                      {filteredCustomers.map((cust, idx) => (
                        <tr key={idx} className="hover:bg-gray-50/50 transition-colors">
                          <td className="p-4 pl-6">
                            <div className="flex items-center gap-2">
                              <div className="w-8 h-8 rounded-full bg-navy/5 text-navy font-bold flex items-center justify-center text-xs">
                                {cust.name.charAt(0)}
                              </div>
                              <span className="font-bold text-navy">{cust.name}</span>
                            </div>
                          </td>
                          <td className="p-4 font-mono font-medium text-gray-650">
                            <a href={`mailto:${cust.email}`} className="hover:text-fire">{cust.email}</a>
                          </td>
                          <td className="p-4 font-mono text-gray-600">
                            <a href={`tel:${cust.phone}`} className="hover:text-fire">{cust.phone}</a>
                          </td>
                          <td className="p-4">
                            <span className={`px-2 py-0.5 rounded-full font-bold text-[9px] uppercase tracking-wider ${
                              cust.company === 'Individual' ? 'bg-gray-100 text-gray-600' : 'bg-blue-50 text-blue-700'
                            }`}>
                              {cust.company}
                            </span>
                          </td>
                          <td className="p-4 font-light text-gray-550 flex items-center gap-1">
                            <MapPin className="w-3.5 h-3.5 text-gray-400" />
                            {cust.location}
                          </td>
                          <td className="p-4 text-center font-bold text-navy">{cust.ordersCount}</td>
                          <td className="p-4 text-center font-bold text-safety">{cust.inquiriesCount}</td>
                        </tr>
                      ))}
                      {filteredCustomers.length === 0 && (
                        <tr>
                          <td colSpan={7} className="p-8 text-center text-gray-400 italic">No customers found.</td>
                        </tr>
                      )}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          )}

          {/* ============================================================== */}
          {/* TAB 5: REPORTS & ANALYTICS */}
          {activeTab === 'reports' && userRole === 'admin' && (
            <div className="space-y-8">
              <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4">
                <div className="space-y-1">
                  <h2 className="font-display text-3xl font-bold uppercase tracking-wider text-navy">
                    Reports & Analytics
                  </h2>
                  <p className="text-xs text-gray-500 font-light">
                    Settled sales only: Paymob-confirmed card payments and quotations marked as paid. Owner access only.
                  </p>
                </div>
                <label className="flex items-center gap-2 text-[10px] uppercase font-bold tracking-wider text-gray-500">
                  Period
                  <select
                    value={reportPeriod}
                    onChange={(e) => { const next = e.target.value as ReportPeriod; setReportPeriod(next); loadReport(next); }}
                    className="text-[10px] uppercase font-bold tracking-wider bg-white border border-gray-200 rounded-lg p-2 focus:outline-none focus:border-fire"
                  >
                    {REPORT_PERIODS.map((p) => <option key={p.value} value={p.value}>{p.label}</option>)}
                  </select>
                </label>
              </div>

              {reportError && (
                <div role="alert" className="bg-red-50 border border-red-200 text-fire p-4 rounded-xl text-xs font-semibold flex items-center justify-between">
                  <span>{reportError}</span>
                  <button onClick={() => loadReport(reportPeriod)} className="underline">Retry</button>
                </div>
              )}

              {reportLoading && !report && (
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
                  {[0, 1, 2, 3].map((i) => <div key={i} className="h-28 bg-white rounded-2xl border border-gray-150 animate-pulse" />)}
                </div>
              )}

              {report && (() => {
                const revenue = Number(report.revenue);
                const cost = Number(report.cost);
                const costedRevenue = Number(report.costed_revenue);
                const uncosted = Number(report.uncosted_revenue);
                const profit = costedRevenue - cost;
                const margin = costedRevenue > 0 ? (profit / costedRevenue) * 100 : null;
                const aov = report.orders > 0 ? revenue / report.orders : 0;
                const maxMonth = Math.max(1, ...report.by_month.map((m) => Number(m.revenue)));
                return (
                  <div className={`space-y-8 ${reportLoading ? 'opacity-60' : ''}`}>
                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
                      <div className="bg-white p-6 rounded-2xl border border-gray-150 shadow-sm space-y-2">
                        <span className="text-[10px] text-gray-400 uppercase tracking-widest font-bold block">Net Collected</span>
                        <span className="text-3xl font-extrabold text-navy font-display block">{revenue.toFixed(3)} <span className="text-xs font-semibold">OMR</span></span>
                        <span className="text-[10px] text-gray-400 block">
                          Gross {Number(report.gross).toFixed(3)} − Refunds {Number(report.refunds).toFixed(3)}
                        </span>
                        <span className="text-[10px] text-gray-400 block">Card {Number(report.online_revenue).toFixed(3)} · Quotations {Number(report.manual_revenue).toFixed(3)}</span>
                      </div>
                      <div className="bg-white p-6 rounded-2xl border border-gray-150 shadow-sm space-y-2">
                        <span className="text-[10px] text-gray-400 uppercase tracking-widest font-bold block">Gross Profit</span>
                        <span className={`text-3xl font-extrabold font-display block ${profit >= 0 ? 'text-green-700' : 'text-fire'}`}>
                          {costedRevenue > 0 ? profit.toFixed(3) : '—'} <span className="text-xs font-semibold">OMR</span>
                        </span>
                        <span className="text-[10px] text-gray-400 block">
                          {margin !== null ? `${margin.toFixed(1)}% margin · cost ${cost.toFixed(3)} OMR` : 'Set unit costs in Inventory to see profit'}
                        </span>
                      </div>
                      <div className="bg-white p-6 rounded-2xl border border-gray-150 shadow-sm space-y-2">
                        <span className="text-[10px] text-gray-400 uppercase tracking-widest font-bold block">Paid Orders</span>
                        <span className="text-3xl font-extrabold text-navy font-display block">{report.orders}</span>
                        <span className="text-[10px] text-gray-400 block">{Number(report.units)} units sold</span>
                      </div>
                      <div className="bg-white p-6 rounded-2xl border border-gray-150 shadow-sm space-y-2">
                        <span className="text-[10px] text-gray-400 uppercase tracking-widest font-bold block">Avg. Order Value</span>
                        <span className="text-3xl font-extrabold text-navy font-display block">{aov.toFixed(3)} <span className="text-xs font-semibold">OMR</span></span>
                        <span className="text-[10px] text-gray-400 block">{report.pending_payment} awaiting payment · {report.failed_payment} failed</span>
                      </div>
                    </div>

                    {report.cancelled_paid > 0 && (
                      <div role="alert" className="bg-red-50 border border-red-200 text-fire p-4 rounded-xl text-xs flex items-center gap-2">
                        <AlertCircle className="w-4 h-4 shrink-0" />
                        {report.cancelled_paid} cancelled order(s) still hold {Number(report.cancelled_paid_amount).toFixed(3)} OMR of collected payment. Refund or reinstate them; the money stays in these totals until a refund is confirmed.
                      </div>
                    )}

                    {uncosted > 0 && (
                      <div className="bg-yellow-50 border border-yellow-200 text-yellow-800 p-4 rounded-xl text-xs flex items-center gap-2">
                        <AlertCircle className="w-4 h-4 shrink-0" />
                        {uncosted.toFixed(3)} OMR of revenue comes from products with no unit cost set, so it is excluded from profit. Add costs in Inventory → Edit.
                      </div>
                    )}

                    <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                      <div className="lg:col-span-2 bg-white rounded-2xl border border-gray-150 p-6 shadow-sm space-y-5">
                        <h3 className="font-display text-lg uppercase font-bold text-navy">Revenue by Month</h3>
                        {report.by_month.length === 0 ? (
                          <p className="text-xs text-gray-400 italic text-center py-10">No settled sales in this period yet.</p>
                        ) : (
                          <div className="space-y-3">
                            {report.by_month.map((m) => (
                              <div key={m.month} className="grid grid-cols-[70px_1fr_130px] items-center gap-3 text-xs">
                                <span className="font-mono font-bold text-gray-500">{m.month}</span>
                                <div className="bg-gray-100 h-3 rounded-full overflow-hidden">
                                  <div className="bg-fire h-full rounded-full" style={{ width: `${(Number(m.revenue) / maxMonth) * 100}%` }} />
                                </div>
                                <span className="text-right font-bold text-navy">{formatOmr(Number(m.revenue))} · {m.orders}</span>
                              </div>
                            ))}
                          </div>
                        )}
                      </div>

                      <div className="bg-white rounded-2xl border border-gray-150 p-6 shadow-sm space-y-4">
                        <h3 className="font-display text-lg uppercase font-bold text-navy">Top Products</h3>
                        {report.by_product.length === 0 ? (
                          <p className="text-xs text-gray-400 italic text-center py-10">No products sold in this period.</p>
                        ) : (
                          <div className="space-y-3">
                            {report.by_product.map((p) => (
                              <div key={p.product_name} className="flex justify-between gap-3 border-b border-gray-100 pb-3 last:border-0 text-xs">
                                <div>
                                  <span className="font-bold text-navy block">{p.product_name}</span>
                                  <span className="text-[10px] text-gray-400">{Number(p.units)} units</span>
                                </div>
                                <div className="text-right">
                                  <span className="font-extrabold text-navy block">{formatOmr(Number(p.revenue))}</span>
                                  <span className="text-[10px] text-gray-400">
                                    {p.has_cost && p.cost !== null ? `profit ${(Number(p.revenue) - Number(p.cost)).toFixed(3)}` : 'cost not set'}
                                  </span>
                                </div>
                              </div>
                            ))}
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                );
              })()}
            </div>
          )}

          {/* ============================================================== */}
          {/* TAB 6: SETTINGS MANAGEMENT */}
          {activeTab === 'settings' && userRole === 'admin' && (
            <div className="space-y-8">
              <div className="space-y-1 border-b border-gray-200 pb-4">
                <h2 className="font-display text-3xl font-bold uppercase tracking-wider text-navy">
                  Portal Settings
                </h2>
                <p className="text-xs text-gray-500 font-light">
                  Update SAMS customer contact parameters, active quality credentials, and product FAQ databases.
                </p>
              </div>

              <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 items-start">
                
                {/* Left side: Credentials Settings & Quality Certs */}
                <div className="space-y-8">
                  {/* Site credentials settings */}
                  <div className="bg-white p-6 rounded-2xl border border-gray-150 shadow-sm space-y-4 text-left">
                    <h3 className="font-display text-lg uppercase font-bold text-navy">Storefront Contact Details</h3>
                    <div className="space-y-4">
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                        <div className="space-y-1">
                          <label className="text-[9px] uppercase font-bold text-gray-400 tracking-wider">Business Email</label>
                          <input
                            type="text"
                            value={siteSettings.contact_email ?? ''}
                            onChange={(e) => handleSettingChange('contact_email', e.target.value)}
                            onBlur={() => handleSaveSetting('contact_email')}
                            className="w-full bg-gray-50/50 border border-gray-200 rounded-xl p-3 text-xs focus:outline-none focus:border-fire text-gray-700 font-medium"
                          />
                        </div>
                        <div className="space-y-1">
                          <label className="text-[9px] uppercase font-bold text-gray-400 tracking-wider">Business Phone</label>
                          <input
                            type="text"
                            value={siteSettings.contact_phone ?? ''}
                            onChange={(e) => handleSettingChange('contact_phone', e.target.value)}
                            onBlur={() => handleSaveSetting('contact_phone')}
                            className="w-full bg-gray-50/50 border border-gray-200 rounded-xl p-3 text-xs focus:outline-none focus:border-fire text-gray-700 font-medium"
                          />
                        </div>
                      </div>

                      <div className="space-y-1">
                        <label className="text-[9px] uppercase font-bold text-gray-400 tracking-wider">WhatsApp Trigger Number</label>
                        <input
                          type="text"
                          value={siteSettings.contact_whatsapp ?? ''}
                          onChange={(e) => handleSettingChange('contact_whatsapp', e.target.value)}
                          onBlur={() => handleSaveSetting('contact_whatsapp')}
                          className="w-full bg-gray-50/50 border border-gray-200 rounded-xl p-3 text-xs focus:outline-none focus:border-fire text-gray-700 font-medium"
                        />
                      </div>

                      <p className="text-[10px] text-gray-400 leading-relaxed">
                        Changes save when you leave a field. Payment gateway keys are kept in the server environment only and are never editable here.
                      </p>
                    </div>
                  </div>

                  {/* Quality Certificates */}
                  <div className="bg-white p-6 rounded-2xl border border-gray-150 shadow-sm space-y-6 text-left">
                    <h3 className="font-display text-lg uppercase font-bold text-navy">Quality Certificates</h3>
                    
                    <form onSubmit={handleAddCert} className="grid grid-cols-1 sm:grid-cols-2 gap-4 items-end bg-gray-50 p-4 rounded-xl border border-gray-200">
                      <div className="space-y-1">
                        <label className="text-[9px] uppercase font-bold text-gray-400 tracking-wider">Certificate Name</label>
                        <input
                          type="text"
                          required
                          placeholder="e.g. CE ISO 9001"
                          value={certName}
                          onChange={(e) => setCertName(e.target.value)}
                          className="w-full bg-white border border-gray-200 rounded-lg p-2.5 text-xs text-gray-700"
                        />
                      </div>
                      <div className="space-y-1">
                        <label className="text-[9px] uppercase font-bold text-gray-400 tracking-wider">Issuer</label>
                        <input
                          type="text"
                          required
                          placeholder="e.g. European Standards"
                          value={certIssuer}
                          onChange={(e) => setCertIssuer(e.target.value)}
                          className="w-full bg-white border border-gray-200 rounded-lg p-2.5 text-xs text-gray-700"
                        />
                      </div>
                      <button
                        type="submit"
                        className="sm:col-span-2 bg-navy hover:bg-fire text-white text-[10px] uppercase tracking-wider font-bold py-2 px-4 rounded-lg transition-all"
                      >
                        Add Certificate
                      </button>
                    </form>

                    <div className="space-y-3">
                      {certificates.map((cert) => (
                        <div key={cert.id} className="flex justify-between items-center border border-gray-100 p-3 rounded-xl text-xs">
                          <div>
                            <p className="font-bold text-navy">{cert.title}</p>
                            <p className="text-gray-400 font-light">{cert.certificate_type || 'Safety compliance'}</p>
                          </div>
                          <button
                            onClick={() => handleDeleteCert(cert.id)}
                            className="p-1.5 bg-red-50 hover:bg-red-100 text-fire rounded-lg transition-colors"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>
                      ))}
                      {certificates.length === 0 && (
                        <p className="text-xs text-gray-400 italic">No quality certificates registered.</p>
                      )}
                    </div>
                  </div>
                </div>

                {/* Right side: FAQs manager */}
                <div className="bg-white p-6 rounded-2xl border border-gray-150 shadow-sm space-y-6 text-left">
                  <h3 className="font-display text-lg uppercase font-bold text-navy">Manage Product FAQs</h3>

                  <form onSubmit={handleAddFAQ} className="space-y-3 bg-gray-55/30 p-4 rounded-xl border border-gray-200">
                    <div className="space-y-1">
                      <label className="text-[9px] uppercase font-bold text-gray-400 tracking-wider">FAQ Question</label>
                      <input
                        type="text"
                        required
                        placeholder="e.g. How does the ball activate?"
                        value={faqQuestion}
                        onChange={(e) => setFaqQuestion(e.target.value)}
                        className="w-full bg-white border border-gray-200 rounded-lg p-2.5 text-xs text-gray-700"
                      />
                    </div>
                    <div className="space-y-1">
                      <label className="text-[9px] uppercase font-bold text-gray-400 tracking-wider">FAQ Answer</label>
                      <textarea
                        required
                        placeholder="Provide details..."
                        value={faqAnswer}
                        onChange={(e) => setFaqAnswer(e.target.value)}
                        className="w-full bg-white border border-gray-200 rounded-lg p-2.5 text-xs text-gray-700 h-20 focus:outline-none"
                      />
                    </div>
                    <div className="space-y-1">
                      <label htmlFor="faq-question-ar" className="text-[9px] uppercase font-bold text-gray-400 tracking-wider">Arabic Question (optional)</label>
                      <input
                        id="faq-question-ar"
                        type="text"
                        dir="rtl"
                        lang="ar"
                        value={faqQuestionAr}
                        onChange={(e) => setFaqQuestionAr(e.target.value)}
                        className="w-full bg-white border border-gray-200 rounded-lg p-2.5 text-xs text-gray-700"
                      />
                    </div>
                    <div className="space-y-1">
                      <label htmlFor="faq-answer-ar" className="text-[9px] uppercase font-bold text-gray-400 tracking-wider">Arabic Answer (optional)</label>
                      <textarea
                        id="faq-answer-ar"
                        dir="rtl"
                        lang="ar"
                        value={faqAnswerAr}
                        onChange={(e) => setFaqAnswerAr(e.target.value)}
                        className="w-full bg-white border border-gray-200 rounded-lg p-2.5 text-xs text-gray-700 h-20 focus:outline-none"
                      />
                    </div>
                    <button
                      type="submit"
                      className="w-full bg-navy hover:bg-fire text-white text-[10px] uppercase tracking-wider font-bold py-2.5 px-4 rounded-lg transition-all"
                    >
                      Publish FAQ Item
                    </button>
                  </form>

                  <div className="space-y-4 max-h-[480px] overflow-y-auto pr-2">
                    {faqs.map((faq) => (
                      <div key={faq.id} className="border border-gray-100 p-4 rounded-2xl space-y-2 text-xs relative">
                        <div className="flex justify-between items-start pr-8">
                          <p className="font-bold text-navy">{faq.question}</p>
                          <button
                            onClick={() => handleDeleteFAQ(faq.id)}
                            className="absolute top-3 right-3 p-1.5 bg-red-50 hover:bg-red-100 text-fire rounded-lg transition-colors"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                        <p className="text-gray-450 font-light leading-relaxed">{faq.answer}</p>
                        {faqArEdit?.id === faq.id ? (
                          <div className="space-y-2 pt-2 border-t border-gray-100">
                            <input
                              type="text"
                              dir="rtl"
                              lang="ar"
                              aria-label="Arabic question"
                              placeholder="السؤال"
                              value={faqArEdit.question}
                              onChange={(e) => setFaqArEdit({ ...faqArEdit, question: e.target.value })}
                              className="w-full bg-white border border-gray-200 rounded-lg p-2.5 text-xs text-gray-700"
                            />
                            <textarea
                              dir="rtl"
                              lang="ar"
                              aria-label="Arabic answer"
                              placeholder="الإجابة"
                              value={faqArEdit.answer}
                              onChange={(e) => setFaqArEdit({ ...faqArEdit, answer: e.target.value })}
                              className="w-full bg-white border border-gray-200 rounded-lg p-2.5 text-xs text-gray-700 h-20 focus:outline-none"
                            />
                            <div className="flex justify-end gap-2">
                              <button type="button" onClick={() => setFaqArEdit(null)} className="px-3 py-1.5 rounded-lg bg-gray-105 text-gray-700 text-[10px] font-bold uppercase tracking-wider">
                                Cancel
                              </button>
                              <button type="button" onClick={handleSaveFAQArabic} className="px-3 py-1.5 rounded-lg bg-navy hover:bg-fire text-white text-[10px] font-bold uppercase tracking-wider transition-colors">
                                Save Arabic
                              </button>
                            </div>
                          </div>
                        ) : (
                          <div className="pt-2 border-t border-gray-100 flex items-start justify-between gap-3">
                            {arText(arabicOf(faq), 'question') ? (
                              <div dir="rtl" lang="ar" className="space-y-1 text-right">
                                <p className="font-bold text-navy">{arText(arabicOf(faq), 'question')}</p>
                                <p className="text-gray-450 leading-relaxed">{arText(arabicOf(faq), 'answer')}</p>
                              </div>
                            ) : (
                              <span className="text-[10px] font-bold uppercase tracking-wider text-amber-700">AR missing</span>
                            )}
                            <button
                              type="button"
                              onClick={() => setFaqArEdit({ id: faq.id, question: arText(arabicOf(faq), 'question'), answer: arText(arabicOf(faq), 'answer') })}
                              className="shrink-0 inline-flex items-center gap-1 px-2 py-1 rounded-lg bg-gray-50 hover:bg-navy/10 text-navy text-[10px] font-bold uppercase tracking-wider"
                            >
                              <Languages className="w-3 h-3" />
                              Arabic
                            </button>
                          </div>
                        )}
                      </div>
                    ))}
                    {faqs.length === 0 && (
                      <p className="text-xs text-gray-400 italic text-center py-6">No FAQs published.</p>
                    )}
                  </div>
                </div>

              </div>
            </div>
          )}

          {/* ============================================================== */}
          {/* TAB 7: WHATSAPP CONNECT */}
          {activeTab === 'whatsapp' && (
            <div className="space-y-8">
              <div className="space-y-1">
                <h2 className="font-display text-3xl font-bold uppercase tracking-wider text-navy">
                  WhatsApp Connect Workspace
                </h2>
                <p className="text-xs text-gray-500 font-light">
                  Scan the secure QR code to authenticate your sales WhatsApp agent session. Follow up instantly with client orders and logistics updates.
                </p>
              </div>

              <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
                
                {/* Left side: how follow-ups are sent */}
                <div className="lg:col-span-5 bg-white p-6 sm:p-8 rounded-3xl border border-gray-150 shadow-sm space-y-5 text-left">
                  <h3 className="font-display text-base uppercase font-bold text-navy pb-4 border-b border-gray-100">How follow-ups work</h3>
                  <ol className="list-decimal pl-5 space-y-2 text-xs text-gray-600 font-light leading-relaxed">
                    <li>Pick a customer from the contact sheet.</li>
                    <li>Tap a template button. WhatsApp opens on this device (app or WhatsApp Web) with the message pre-filled.</li>
                    <li>Review and press send from your own SAMS WhatsApp account.</li>
                  </ol>
                  <div className="bg-green-50/60 p-4 rounded-2xl border border-green-150 text-[11px] text-green-800 leading-normal font-light">
                    Messages are always sent by you, from your own WhatsApp. Nothing is sent automatically.
                  </div>
                </div>

                {/* Right side: Client active follow-up lists & templates (7 cols) */}
                <div className="lg:col-span-7 space-y-6">
                  
                  {/* Quick templates */}
                  <div className="bg-white p-6 rounded-3xl border border-gray-150 shadow-sm space-y-4 text-left">
                    <h3 className="font-display text-base uppercase font-bold text-navy">Sales Follow-Up Templates</h3>
                    <p className="text-xs text-gray-500 font-light leading-relaxed">
                      Select a predefined template to quickly format messages for clients regarding quotation confirmations or shipping details.
                    </p>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-2">
                      <div className="border border-gray-150 p-3.5 rounded-2xl hover:border-fire transition-colors space-y-1.5 text-xs">
                        <span className="font-bold text-navy uppercase tracking-wide block">1. Quotation Follow-Up</span>
                        <p className="text-[11px] text-gray-400 font-light line-clamp-2">
                          &ldquo;Dear [Client], thank you for contacting SAMS. We have registered your quotation request...&rdquo;
                        </p>
                      </div>
                      <div className="border border-gray-150 p-3.5 rounded-2xl hover:border-fire transition-colors space-y-1.5 text-xs">
                        <span className="font-bold text-navy uppercase tracking-wide block">2. Shipping & Delivery Alert</span>
                        <p className="text-[11px] text-gray-400 font-light line-clamp-2">
                          &ldquo;Dear [Client], your SAMS order is now shipped via local courier. Tracking code: [ID]...&rdquo;
                        </p>
                      </div>
                    </div>
                  </div>

                  {/* Customer Quick Contacts */}
                  <div className="bg-white p-6 rounded-3xl border border-gray-150 shadow-sm space-y-4 text-left">
                    <h3 className="font-display text-base uppercase font-bold text-navy">Follow-up CRM Contact Sheet</h3>
                    
                    <div className="space-y-3 max-h-[360px] overflow-y-auto pr-1">
                      {customers.map((cust, idx) => {
                        // Clean phone number for WhatsApp wa.me trigger
                        const cleanPhone = cust.phone.replace(/[^0-9+]/g, '');
                        // Add country code if not present (Oman is +968)
                        const waPhone = cleanPhone.startsWith('+') 
                          ? cleanPhone.replace('+', '') 
                          : cleanPhone.startsWith('968') ? cleanPhone : `968${cleanPhone}`;

                        // Custom message templates
                        const quoteMsg = encodeURIComponent(
                          `Dear ${cust.name},\n\nThank you for choosing SAMS LLC Oman. We have reviewed your quotation enquiry and registered it under our sales database. Let us know if you require delivery details.\n\nBest regards,\n${userName}\nSAMS Sales Representative`
                        );
                        const shipMsg = encodeURIComponent(
                          `Dear ${cust.name},\n\nYour SAMS fire safety order has been processed and is currently shipping via local courier (Oman Delivery: 1-3 business days). You can track your order status on our portal.\n\nBest regards,\n${userName}\nSAMS Sales Representative`
                        );

                        return (
                          <div key={idx} className="flex flex-col sm:flex-row sm:items-center justify-between border border-gray-100 p-4 rounded-2xl text-xs gap-3 hover:border-navy transition-all">
                            <div className="space-y-1 text-left">
                              <span className="font-bold text-navy text-sm block">{cust.name}</span>
                              <span className="text-gray-400 block font-mono">{cust.phone} | {cust.company}</span>
                              <span className="text-[10px] text-gray-400 block font-light">
                                Orders: <strong className="font-semibold text-navy">{cust.ordersCount}</strong> | Quotes: <strong className="font-semibold text-safety">{cust.inquiriesCount}</strong>
                              </span>
                            </div>
                            <div className="flex gap-2 self-start sm:self-center shrink-0">
                              <a
                                href={`https://wa.me/${waPhone}?text=${quoteMsg}`}
                                target="_blank"
                                rel="noreferrer"
                                className="bg-[#25D366] hover:bg-[#128C7E] text-white text-[10px] uppercase tracking-wider font-bold py-2 px-3 rounded-lg transition-colors inline-flex items-center gap-1 cursor-pointer"
                              >
                                <MessageSquare className="w-3.5 h-3.5" />
                                Quote Follow-up
                              </a>
                              <a
                                href={`https://wa.me/${waPhone}?text=${shipMsg}`}
                                target="_blank"
                                rel="noreferrer"
                                className="bg-navy hover:bg-fire text-white text-[10px] uppercase tracking-wider font-bold py-2 px-3 rounded-lg transition-colors inline-flex items-center gap-1 cursor-pointer"
                              >
                                <Truck className="w-3.5 h-3.5" />
                                Ship Alert
                              </a>
                            </div>
                          </div>
                        );
                      })}
                      {customers.length === 0 && (
                        <p className="text-xs text-gray-400 italic text-center py-6">No customer contacts logged.</p>
                      )}
                    </div>
                  </div>

                </div>

              </div>
            </div>
          )}
        </main>
      </div>

      {/* ============================================================== */}
      {/* ORDER DETAIL DRAWER */}
      {selectedOrder && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex justify-end" onClick={() => setSelectedOrder(null)}>
          <aside
            role="dialog"
            aria-modal="true"
            aria-label={`Order ${selectedOrder.order_number}`}
            className="bg-white w-full max-w-lg h-full overflow-y-auto p-8 space-y-6 text-left text-xs"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-start justify-between gap-4">
              <div>
                <h3 className="font-display text-2xl font-bold uppercase tracking-wider text-navy">{selectedOrder.order_number}</h3>
                <p className="text-gray-400 font-mono">{new Date(selectedOrder.created_at).toLocaleString('en-GB', { timeZone: 'Asia/Muscat' })} (Muscat)</p>
              </div>
              <button onClick={() => setSelectedOrder(null)} className="p-2 text-gray-400 hover:bg-gray-100 rounded-full" aria-label="Close">
                <X className="w-5 h-5" />
              </button>
            </div>

            <section className="space-y-2 bg-gray-50 p-4 rounded-2xl border border-gray-150">
              <h4 className="text-[10px] uppercase font-bold tracking-widest text-gray-400">Customer</h4>
              <p className="text-sm font-bold text-navy">{selectedOrder.customer_name}{selectedOrder.company_name ? ` · ${selectedOrder.company_name}` : ''}</p>
              <div className="flex flex-wrap gap-2">
                <a href={`tel:${selectedOrder.phone}`} className="inline-flex items-center gap-1 bg-navy text-white px-3 py-2 rounded-lg font-bold"><Phone className="w-3.5 h-3.5" />{selectedOrder.phone}</a>
                <a
                  href={`https://wa.me/${whatsappNumber(selectedOrder.phone)}?text=${encodeURIComponent(`Hello ${selectedOrder.customer_name}, this is ${userName} from SAMS LLC about your order ${selectedOrder.order_number}.`)}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-1 bg-[#25D366] text-white px-3 py-2 rounded-lg font-bold"
                >
                  <MessageSquare className="w-3.5 h-3.5" />WhatsApp
                </a>
                <a href={`mailto:${selectedOrder.email}`} className="inline-flex items-center gap-1 bg-white border border-gray-200 text-navy px-3 py-2 rounded-lg font-bold"><Mail className="w-3.5 h-3.5" />Email</a>
              </div>
              <p className="flex items-start gap-1 text-gray-600"><MapPin className="w-3.5 h-3.5 text-fire shrink-0 mt-0.5" />{selectedOrder.address}</p>
              {selectedOrder.notes && <p className="text-gray-500 italic">Customer note: {selectedOrder.notes}</p>}
            </section>

            <section className="space-y-2">
              <h4 className="text-[10px] uppercase font-bold tracking-widest text-gray-400">Items</h4>
              {selectedOrder.items.map((it, i) => (
                <div key={i} className="flex justify-between border-b border-gray-100 pb-2">
                  <span><strong className="text-navy">{it.quantity} ×</strong> {it.product_name} <span className="text-gray-400">({it.weight})</span></span>
                  <span className="font-bold text-navy">{Number(it.total_price).toFixed(3)} OMR</span>
                </div>
              ))}
              <div className="flex justify-between text-sm font-extrabold text-navy pt-1">
                <span>Total</span>
                <span>{Number(selectedOrder.total_amount).toFixed(3)} OMR</span>
              </div>
              <p className="text-[10px] text-gray-400">Delivery charge is not included and is agreed with the customer.</p>
            </section>

            <section className="space-y-1">
              <h4 className="text-[10px] uppercase font-bold tracking-widest text-gray-400">Payment</h4>
              <p>
                {selectedOrder.order_type === 'online' ? 'Card via Paymob' : 'Quotation / offline'} ·{' '}
                <strong className="uppercase">{selectedOrder.payment_status}</strong>
              </p>
              {selectedOrder.paymob_transaction_id && <p className="font-mono text-gray-500">Paymob transaction: {selectedOrder.paymob_transaction_id}</p>}
              {selectedOrder.paid_at && <p className="text-gray-500">Paid at {new Date(selectedOrder.paid_at).toLocaleString('en-GB', { timeZone: 'Asia/Muscat' })}</p>}
              {Number(selectedOrder.refunded_minor ?? 0) > 0 && (
                <p className="text-fire font-semibold">Refunded {(Number(selectedOrder.refunded_minor) / 1000).toFixed(3)} OMR of {Number(selectedOrder.total_amount).toFixed(3)} OMR</p>
              )}
              {orderRefunds.length > 0 && (
                <ul className="space-y-1 pt-1">
                  {orderRefunds.map((r) => (
                    <li key={r.id} className="text-gray-600">
                      {new Date(r.created_at).toLocaleString('en-GB', { timeZone: 'Asia/Muscat' })} · {r.kind} {(r.amount_minor / 1000).toFixed(3)} {r.currency} (total refunded {(r.cumulative_refunded_minor / 1000).toFixed(3)})
                    </li>
                  ))}
                </ul>
              )}
            </section>

            <section className="space-y-2">
              <h4 className="text-[10px] uppercase font-bold tracking-widest text-gray-400">Stock</h4>
              <p>
                {({ none: 'No stock taken yet', reserved: 'Reserved while the customer pays', committed: 'Sold from stock', released: 'Reservation released (not sold)', shortfall: 'SHORTFALL: paid but not enough stock' } as Record<string, string>)[selectedOrder.inventory_state ?? 'none']}
              </p>
              {userRole === 'admin' && selectedOrder.inventory_state === 'shortfall' && (
                <button
                  onClick={async () => {
                    const reason = window.prompt('Stock has been updated? Reason for retrying (required)');
                    if (!reason || !reason.trim()) return;
                    const result = await dbService.retryStockCommit(selectedOrder.id, reason.trim());
                    if (result.ok) {
                      applyOrderPatch(selectedOrder.id, { inventory_state: 'committed' });
                      setInventory(await dbService.getInventory());
                    } else {
                      setActionError(result.message ?? 'Could not take stock for this order.');
                    }
                  }}
                  className="bg-navy hover:bg-fire text-white text-[10px] uppercase tracking-wider font-bold py-2 px-3 rounded-lg"
                >
                  Retry stock
                </button>
              )}
              {userRole === 'admin' && (selectedOrder.inventory_state === 'committed' || selectedOrder.inventory_state === 'shortfall') && (
                <div className="flex flex-wrap gap-2">
                  {selectedOrder.items.map((it) => (
                    <button
                      key={it.product_id}
                      onClick={() => handleReturnToStock(selectedOrder, it)}
                      className="bg-white border border-gray-200 hover:border-navy text-navy text-[10px] uppercase tracking-wider font-bold py-1.5 px-2.5 rounded-lg"
                    >
                      Return {it.product_name} to stock
                    </button>
                  ))}
                </div>
              )}
              {userRole === 'admin' && orderNotifications.length > 0 && (
                <div className="pt-1 space-y-1">
                  <h5 className="text-[10px] uppercase font-bold tracking-widest text-gray-400">Notifications</h5>
                  {orderNotifications.map((n) => (
                    <p key={n.id} className="text-gray-600">
                      {n.event_type.replace(/_/g, ' ')}: <strong className={n.status === 'sent' ? 'text-green-700' : n.status === 'failed' ? 'text-fire' : 'text-safety'}>{n.status}</strong>
                      {n.attempts > 0 && n.status !== 'sent' ? ` (attempts ${n.attempts})` : ''}
                    </p>
                  ))}
                </div>
              )}
            </section>

            <section className="space-y-2">
              <h4 className="text-[10px] uppercase font-bold tracking-widest text-gray-400">Status history</h4>
              {orderHistory.length === 0 ? (
                <p className="text-gray-400 italic">No history recorded yet.</p>
              ) : (
                <ol className="space-y-1.5">
                  {orderHistory.map((h) => (
                    <li key={h.id} className="border-l-2 border-gray-200 pl-3">
                      <span className="font-mono text-gray-400">{new Date(h.created_at).toLocaleString('en-GB', { timeZone: 'Asia/Muscat' })}</span>{' '}
                      <strong className="text-navy uppercase">{h.actor_role}</strong>{' '}
                      {h.from_status !== h.to_status && <span>{h.from_status ?? 'new'} → {h.to_status}</span>}
                      {h.from_payment_status !== h.to_payment_status && (
                        <span> · payment {h.from_payment_status ?? 'new'} → {h.to_payment_status}</span>
                      )}
                      {h.reason && <span className="block text-gray-500 italic">&ldquo;{h.reason}&rdquo;</span>}
                    </li>
                  ))}
                </ol>
              )}
            </section>

            <section className="space-y-2">
              <label htmlFor="order-notes" className="text-[10px] uppercase font-bold tracking-widest text-gray-400 block">Internal notes (staff only)</label>
              <textarea
                id="order-notes"
                value={orderNotesDraft}
                onChange={(e) => setOrderNotesDraft(e.target.value)}
                maxLength={4000}
                className="w-full bg-gray-50 border border-gray-200 rounded-xl p-3 text-xs h-28 focus:outline-none focus:border-fire"
                placeholder="Delivery arranged for Sunday, courier ref..."
              />
              <button onClick={handleSaveOrderNotes} className="bg-navy hover:bg-fire text-white text-[10px] uppercase tracking-wider font-bold py-2.5 px-4 rounded-lg">
                Save notes
              </button>
            </section>
          </aside>
        </div>
      )}

      {/* ============================================================== */}
      {stockEdit && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4 z-50" onClick={() => setStockEdit(null)}>
          <div role="dialog" aria-modal="true" aria-label="Adjust stock" className="bg-white rounded-3xl max-w-md w-full p-8 space-y-4 text-left text-xs" onClick={(e) => e.stopPropagation()}>
            <h3 className="font-display text-xl font-bold uppercase tracking-wider text-navy">Stock: {stockEdit.product.name}</h3>
            <p className="text-gray-500">Enter the real number of units on the shelf. Units reserved by customers who are paying right now cannot be removed.</p>
            <label className="block space-y-1">
              <span className="text-[10px] uppercase font-bold text-gray-400 tracking-wider">Units on hand</span>
              <input type="number" min={0} step={1} value={stockEdit.onHand} onChange={(e) => setStockEdit({ ...stockEdit, onHand: e.target.value })} className="w-full bg-gray-50 border border-gray-200 rounded-xl p-3 text-sm" />
            </label>
            <label className="block space-y-1">
              <span className="text-[10px] uppercase font-bold text-gray-400 tracking-wider">Low-stock warning at</span>
              <input type="number" min={0} step={1} value={stockEdit.threshold} onChange={(e) => setStockEdit({ ...stockEdit, threshold: e.target.value })} className="w-full bg-gray-50 border border-gray-200 rounded-xl p-3 text-sm" />
            </label>
            <label className="flex items-center gap-2">
              <input type="checkbox" checked={stockEdit.track} onChange={(e) => setStockEdit({ ...stockEdit, track: e.target.checked })} className="accent-fire w-4 h-4" />
              <span>Track stock for this product (untick only for made-to-order items)</span>
            </label>
            <label className="block space-y-1">
              <span className="text-[10px] uppercase font-bold text-gray-400 tracking-wider">Reason (required)</span>
              <input type="text" maxLength={500} value={stockEdit.reason} onChange={(e) => setStockEdit({ ...stockEdit, reason: e.target.value })} placeholder="e.g. Stock count 1 Oct" className="w-full bg-gray-50 border border-gray-200 rounded-xl p-3 text-sm" />
            </label>
            <div className="flex justify-end gap-3 pt-2">
              <button onClick={() => setStockEdit(null)} className="bg-gray-100 hover:bg-gray-200 text-gray-700 uppercase tracking-widest font-bold px-5 py-3 rounded-xl">Cancel</button>
              <button onClick={handleSaveStock} className="bg-navy hover:bg-fire text-white uppercase tracking-widest font-bold px-5 py-3 rounded-xl">Save stock</button>
            </div>
          </div>
        </div>
      )}

      {/* PRODUCT FORM MODAL */}
      {isProductModalOpen && editingProduct && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4 z-50 overflow-y-auto">
          <div className="bg-white rounded-3xl max-w-2xl w-full p-8 border border-gray-100 relative max-h-[90vh] overflow-y-auto">
            <button
              onClick={() => { setIsProductModalOpen(false); setEditingProduct(null); }}
              className="absolute top-6 right-6 p-2 text-gray-400 hover:bg-gray-100 rounded-full transition-colors"
            >
              <X className="w-5 h-5" />
            </button>

            <h3 className="font-display text-2xl font-bold uppercase tracking-wider text-navy mb-6">
              {editingProduct.id ? 'Edit SAMS Product' : 'Add New SAMS Product'}
            </h3>

            <form onSubmit={handleSaveProduct} className="space-y-5 text-left text-xs">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-1">
                  <label className="text-[10px] uppercase font-bold text-gray-400 tracking-wider">Product Name</label>
                  <input
                    type="text"
                    required
                    value={editingProduct.name || ''}
                    onChange={(e) => setEditingProduct({
                      ...editingProduct,
                      name: e.target.value,
                      slug: editingProduct.id ? editingProduct.slug : e.target.value.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, ''),
                    })}
                    className="w-full bg-gray-50 border border-gray-200 rounded-xl p-3 text-sm text-gray-700"
                    placeholder="e.g. SAMS AFO Fireball"
                  />
                </div>
                <div className="space-y-1">
                  <label className="text-[10px] uppercase font-bold text-gray-400 tracking-wider">Slug Path</label>
                  <input
                    type="text"
                    required
                    value={editingProduct.slug || ''}
                    onChange={(e) => setEditingProduct({ ...editingProduct, slug: e.target.value })}
                    className="w-full bg-gray-50 border border-gray-200 rounded-xl p-3 text-sm text-gray-700"
                    placeholder="sams-afo-fireball"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <div className="space-y-1">
                  <label className="text-[10px] uppercase font-bold text-gray-400 tracking-wider">Product Type</label>
                  <input
                    type="text"
                    required
                    value={editingProduct.product_type || ''}
                    onChange={(e) => setEditingProduct({ ...editingProduct, product_type: e.target.value })}
                    className="w-full bg-gray-50 border border-gray-200 rounded-xl p-3 text-sm text-gray-700"
                    placeholder="e.g. Automatic Fireball"
                  />
                </div>
                <div className="space-y-1">
                  <label className="text-[10px] uppercase font-bold text-gray-400 tracking-wider">Manufacturer Make</label>
                  <input
                    type="text"
                    required
                    value={editingProduct.make || ''}
                    onChange={(e) => setEditingProduct({ ...editingProduct, make: e.target.value })}
                    className="w-full bg-gray-50 border border-gray-200 rounded-xl p-3 text-sm text-gray-700"
                    placeholder="e.g. SAMS OMAN"
                  />
                </div>
                <div className="space-y-1">
                  <label className="text-[10px] uppercase font-bold text-gray-400 tracking-wider">Weight Spec</label>
                  <input
                    type="text"
                    required
                    value={editingProduct.weight || ''}
                    onChange={(e) => setEditingProduct({ ...editingProduct, weight: e.target.value })}
                    className="w-full bg-gray-50 border border-gray-200 rounded-xl p-3 text-sm text-gray-700"
                    placeholder="e.g. 1.3 Kg"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <div className="space-y-1">
                  <label className="text-[10px] uppercase font-bold text-gray-400 tracking-wider">Omani Price (OMR)</label>
                  <input
                    type="number"
                    step="0.001"
                    required
                    min="0.001"
                    value={editingProduct.price ?? ''}
                    onChange={(e) => setEditingProduct({ ...editingProduct, price: Number(e.target.value) })}
                    className="w-full bg-gray-50 border border-gray-200 rounded-xl p-3 text-sm text-gray-700"
                    placeholder="12.500"
                  />
                </div>
                <div className="space-y-1">
                  <label className="text-[10px] uppercase font-bold text-gray-400 tracking-wider">Currency</label>
                  <input
                    type="text"
                    required
                    value={editingProduct.currency || 'OMR'}
                    onChange={(e) => setEditingProduct({ ...editingProduct, currency: e.target.value })}
                    className="w-full bg-gray-50 border border-gray-200 rounded-xl p-3 text-sm text-gray-700"
                  />
                </div>
                <div className="space-y-1">
                  <label className="text-[10px] uppercase font-bold text-gray-400 tracking-wider">Lifespan Spec</label>
                  <input
                    type="number"
                    required
                    value={editingProduct.life_years || 5}
                    onChange={(e) => setEditingProduct({ ...editingProduct, life_years: Number(e.target.value) })}
                    className="w-full bg-gray-50 border border-gray-200 rounded-xl p-3 text-sm text-gray-700"
                  />
                </div>
              </div>

              {userRole === 'admin' && (
                <div className="space-y-1 bg-navy/5 border border-navy/10 rounded-xl p-3">
                  <label htmlFor="unit-cost" className="text-[10px] uppercase font-bold text-navy tracking-wider">Unit Cost (OMR) · owner only, never shown on the store</label>
                  <input
                    id="unit-cost"
                    type="number"
                    step="0.001"
                    min="0"
                    value={editingCost}
                    onChange={(e) => setEditingCost(e.target.value)}
                    className="w-full bg-white border border-gray-200 rounded-xl p-3 text-sm text-gray-700"
                    placeholder="What SAMS pays per unit, used for profit reports"
                  />
                </div>
              )}

              <div className="space-y-1">
                <label className="text-[10px] uppercase font-bold text-gray-400 tracking-wider">Product Description</label>
                <textarea
                  required
                  value={editingProduct.short_description || ''}
                  onChange={(e) => setEditingProduct({ ...editingProduct, short_description: e.target.value })}
                  className="w-full bg-gray-50 border border-gray-200 rounded-xl p-3 text-sm text-gray-700 h-20 focus:outline-none"
                  placeholder="Short marketing snippet..."
                />
              </div>

              <fieldset className="space-y-4 border border-gray-150 rounded-2xl p-4 bg-gray-55/40">
                <legend className="px-2 flex items-center gap-1.5 text-[10px] uppercase font-bold text-navy tracking-wider">
                  <Languages className="w-3.5 h-3.5" />
                  Arabic (العربية)
                </legend>
                <p className="text-[10px] text-gray-450 leading-relaxed">
                  Shown on the Arabic storefront. Any field left blank falls back to the English text. Lists take one item per line; specifications take one &quot;key: value&quot; per line.
                </p>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div className="space-y-1">
                    <label htmlFor="ar-name" className="text-[10px] uppercase font-bold text-gray-400 tracking-wider">Arabic name</label>
                    <input
                      id="ar-name"
                      type="text"
                      dir="rtl"
                      lang="ar"
                      value={productAr.name}
                      onChange={(e) => setProductAr({ ...productAr, name: e.target.value })}
                      className="w-full bg-white border border-gray-200 rounded-xl p-3 text-sm text-gray-700 focus:outline-none focus:border-fire"
                    />
                  </div>
                  <div className="space-y-1">
                    <label htmlFor="ar-product_type" className="text-[10px] uppercase font-bold text-gray-400 tracking-wider">Arabic product type</label>
                    <input
                      id="ar-product_type"
                      type="text"
                      dir="rtl"
                      lang="ar"
                      value={productAr.product_type}
                      onChange={(e) => setProductAr({ ...productAr, product_type: e.target.value })}
                      className="w-full bg-white border border-gray-200 rounded-xl p-3 text-sm text-gray-700 focus:outline-none focus:border-fire"
                    />
                  </div>
                  <div className="space-y-1">
                    <label htmlFor="ar-weight" className="text-[10px] uppercase font-bold text-gray-400 tracking-wider">Arabic weight</label>
                    <input
                      id="ar-weight"
                      type="text"
                      dir="rtl"
                      lang="ar"
                      value={productAr.weight}
                      onChange={(e) => setProductAr({ ...productAr, weight: e.target.value })}
                      className="w-full bg-white border border-gray-200 rounded-xl p-3 text-sm text-gray-700 focus:outline-none focus:border-fire"
                    />
                  </div>
                  <div className="space-y-1 sm:col-span-2">
                    <label htmlFor="ar-short_description" className="text-[10px] uppercase font-bold text-gray-400 tracking-wider">Arabic short description</label>
                    <textarea
                      id="ar-short_description"
                      dir="rtl"
                      lang="ar"
                      value={productAr.short_description}
                      onChange={(e) => setProductAr({ ...productAr, short_description: e.target.value })}
                      className="w-full bg-white border border-gray-200 rounded-xl p-3 text-sm text-gray-700 h-24 focus:outline-none focus:border-fire"
                    />
                  </div>
                  <div className="space-y-1 sm:col-span-2">
                    <label htmlFor="ar-overview" className="text-[10px] uppercase font-bold text-gray-400 tracking-wider">Arabic overview</label>
                    <textarea
                      id="ar-overview"
                      dir="rtl"
                      lang="ar"
                      value={productAr.overview}
                      onChange={(e) => setProductAr({ ...productAr, overview: e.target.value })}
                      className="w-full bg-white border border-gray-200 rounded-xl p-3 text-sm text-gray-700 h-24 focus:outline-none focus:border-fire"
                    />
                  </div>
                  <div className="space-y-1 sm:col-span-2">
                    <label htmlFor="ar-key_features" className="text-[10px] uppercase font-bold text-gray-400 tracking-wider">Key features (one per line)</label>
                    <textarea
                      id="ar-key_features"
                      dir="rtl"
                      lang="ar"
                      value={productAr.key_features}
                      onChange={(e) => setProductAr({ ...productAr, key_features: e.target.value })}
                      className="w-full bg-white border border-gray-200 rounded-xl p-3 text-sm text-gray-700 h-24 focus:outline-none focus:border-fire"
                    />
                  </div>
                  <div className="space-y-1 sm:col-span-2">
                    <label htmlFor="ar-best_for" className="text-[10px] uppercase font-bold text-gray-400 tracking-wider">Best for (one per line)</label>
                    <textarea
                      id="ar-best_for"
                      dir="rtl"
                      lang="ar"
                      value={productAr.best_for}
                      onChange={(e) => setProductAr({ ...productAr, best_for: e.target.value })}
                      className="w-full bg-white border border-gray-200 rounded-xl p-3 text-sm text-gray-700 h-24 focus:outline-none focus:border-fire"
                    />
                  </div>
                  <div className="space-y-1 sm:col-span-2">
                    <label htmlFor="ar-safety_notes" className="text-[10px] uppercase font-bold text-gray-400 tracking-wider">Safety notes (one per line)</label>
                    <textarea
                      id="ar-safety_notes"
                      dir="rtl"
                      lang="ar"
                      value={productAr.safety_notes}
                      onChange={(e) => setProductAr({ ...productAr, safety_notes: e.target.value })}
                      className="w-full bg-white border border-gray-200 rounded-xl p-3 text-sm text-gray-700 h-24 focus:outline-none focus:border-fire"
                    />
                  </div>
                  <div className="space-y-1 sm:col-span-2">
                    <label htmlFor="ar-usage_areas" className="text-[10px] uppercase font-bold text-gray-400 tracking-wider">Usage areas (one per line)</label>
                    <textarea
                      id="ar-usage_areas"
                      dir="rtl"
                      lang="ar"
                      value={productAr.usage_areas}
                      onChange={(e) => setProductAr({ ...productAr, usage_areas: e.target.value })}
                      className="w-full bg-white border border-gray-200 rounded-xl p-3 text-sm text-gray-700 h-24 focus:outline-none focus:border-fire"
                    />
                  </div>
                  <div className="space-y-1 sm:col-span-2">
                    <label htmlFor="ar-specifications" className="text-[10px] uppercase font-bold text-gray-400 tracking-wider">Specifications (key: value per line)</label>
                    <textarea
                      id="ar-specifications"
                      dir="rtl"
                      lang="ar"
                      value={productAr.specifications}
                      onChange={(e) => setProductAr({ ...productAr, specifications: e.target.value })}
                      className="w-full bg-white border border-gray-200 rounded-xl p-3 text-sm text-gray-700 h-24 focus:outline-none focus:border-fire"
                    />
                  </div>
                </div>
              </fieldset>

              <div className="space-y-1">
                <label className="text-[10px] uppercase font-bold text-gray-400 tracking-wider">Product Image URLs (Comma Separated)</label>
                <input
                  type="text"
                  value={editingProduct.images?.join(', ') || ''}
                  onChange={(e) => setEditingProduct({ ...editingProduct, images: e.target.value.split(',').map(v => v.trim()).filter(Boolean) })}
                  className="w-full bg-gray-50 border border-gray-200 rounded-xl p-3 text-sm text-gray-700"
                  placeholder="/hero_bg.png"
                />
              </div>

              <div className="pt-4 border-t border-gray-150 flex justify-end gap-3">
                <button
                  type="button"
                  onClick={() => { setIsProductModalOpen(false); setEditingProduct(null); }}
                  className="bg-gray-105 hover:bg-gray-200 text-gray-700 text-xs uppercase tracking-widest font-bold px-6 py-3 rounded-xl transition-all"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="bg-navy hover:bg-fire text-white text-xs uppercase tracking-widest font-bold px-6 py-3 rounded-xl transition-all"
                >
                  Save Product
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

    </div>
  );
}
