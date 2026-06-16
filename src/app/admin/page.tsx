'use client';

import React, { useState, useEffect } from 'react';
import Image from 'next/image';
import { useRouter } from 'next/navigation';
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
  ShieldCheck,
  CheckCircle,
  HelpCircle,
  Users,
  AlertCircle,
  Search,
  Bell,
  User,
  ArrowUpRight,
  TrendingDown,
  DollarSign,
  Activity,
  ChevronRight,
  Mail,
  Phone,
  Building,
  MapPin,
  Info,
  Loader2,
  Truck
} from 'lucide-react';
import { dbService } from '@/services/dbService';
import { isSupabaseConfigured, supabase } from '@/lib/supabase';
import { Product, Inquiry, Order, Certificate, FAQ } from '@/types/database';

export default function AdminPage() {
  const router = useRouter();
  
  // Auth state
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loginError, setLoginError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  // Tab Navigation State
  const [activeTab, setActiveTab] = useState<'dashboard' | 'orders' | 'inventory' | 'customers' | 'reports' | 'settings' | 'whatsapp'>('dashboard');
  const [ordersTab, setOrdersTab] = useState<'checkout' | 'quotations'>('checkout');

  // Sales and Connection States
  const [userRole, setUserRole] = useState<'admin' | 'sales'>('admin');
  const [userName, setUserName] = useState<string>('Admin Operator');
  const [whatsappConnected, setWhatsappConnected] = useState(false);
  const [whatsappConnecting, setWhatsappConnecting] = useState(false);

  // DB Data States
  const [products, setProducts] = useState<Product[]>([]);
  const [inquiries, setInquiries] = useState<Inquiry[]>([]);
  const [orders, setOrders] = useState<Order[]>([]);
  const [certificates, setCertificates] = useState<Certificate[]>([]);
  const [faqs, setFaqs] = useState<FAQ[]>([]);
  const [siteSettings, setSiteSettings] = useState<Record<string, string>>({});

  // Product Form Modal State
  const [isProductModalOpen, setIsProductModalOpen] = useState(false);
  const [editingProduct, setEditingProduct] = useState<Partial<Product> | null>(null);

  // FAQ Form State
  const [faqQuestion, setFaqQuestion] = useState('');
  const [faqAnswer, setFaqAnswer] = useState('');

  // Certificate Form State
  const [certName, setCertName] = useState('');
  const [certIssuer, setCertIssuer] = useState('');

  // Search Filter state (general search for tabs)
  const [searchQuery, setSearchQuery] = useState('');

  // Check login session on mount
  useEffect(() => {
    const localSession = sessionStorage.getItem('sams_admin_session');
    if (localSession === 'active') {
      setIsAuthenticated(true);
      const storedRole = sessionStorage.getItem('sams_admin_role') as 'admin' | 'sales' || 'admin';
      const storedName = sessionStorage.getItem('sams_admin_name') || 'Admin Operator';
      setUserRole(storedRole);
      setUserName(storedName);
    } else if (isSupabaseConfigured) {
      supabase.auth.getSession().then((res: any) => {
        if (res?.data?.session) {
          setIsAuthenticated(true);
          const userEmail = res.data.session.user.email || '';
          if (userEmail.includes('abdulrazzaq') || userEmail.includes('abdulwahid')) {
            const name = userEmail.includes('abdulrazzaq') ? 'Abdulrazzaq' : 'Abdulwahid';
            setUserRole('sales');
            setUserName(name);
          } else {
            setUserRole('admin');
            setUserName('Admin Operator');
          }
        }
      });
    }
  }, []);

  // Fetch admin data once authenticated
  useEffect(() => {
    if (!isAuthenticated) return;

    async function fetchAdminData() {
      try {
        const [
          prods, 
          inqs, 
          ords, 
          certs, 
          faqsData, 
          settingsData
        ] = await Promise.all([
          dbService.getProducts(),
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
      } catch (err) {
        console.error('Failed to load admin data:', err);
      }
    }

    fetchAdminData();
  }, [isAuthenticated]);

  // Auth Handlers
  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setLoginError(null);

    try {
      if (isSupabaseConfigured) {
        const { error, data } = await supabase.auth.signInWithPassword({ email, password });
        if (error) throw error;
        setIsAuthenticated(true);
        const userEmail = email.toLowerCase();
        if (userEmail.includes('abdulrazzaq') || userEmail.includes('abdulwahid')) {
          const name = userEmail.includes('abdulrazzaq') ? 'Abdulrazzaq' : 'Abdulwahid';
          setUserRole('sales');
          setUserName(name);
          sessionStorage.setItem('sams_admin_session', 'active');
          sessionStorage.setItem('sams_admin_role', 'sales');
          sessionStorage.setItem('sams_admin_name', name);
        } else {
          setUserRole('admin');
          setUserName('Admin Operator');
          sessionStorage.setItem('sams_admin_session', 'active');
          sessionStorage.setItem('sams_admin_role', 'admin');
          sessionStorage.setItem('sams_admin_name', 'Admin Operator');
        }
      } else {
        // Simulated local fallback credentials for testing
        const userEmail = email.toLowerCase().trim();
        if (userEmail === 'admin@sams-oman.com' && password === 'SAMSAdmin2026!') {
          sessionStorage.setItem('sams_admin_session', 'active');
          sessionStorage.setItem('sams_admin_role', 'admin');
          sessionStorage.setItem('sams_admin_name', 'Admin Operator');
          setUserRole('admin');
          setUserName('Admin Operator');
          setIsAuthenticated(true);
        } else if (userEmail === 'abdulrazzaq@sams-oman.com' && password === 'SAMSAbdul2026!') {
          sessionStorage.setItem('sams_admin_session', 'active');
          sessionStorage.setItem('sams_admin_role', 'sales');
          sessionStorage.setItem('sams_admin_name', 'Abdulrazzaq');
          setUserRole('sales');
          setUserName('Abdulrazzaq');
          setIsAuthenticated(true);
        } else if (userEmail === 'abdulwahid@sams-oman.com' && password === 'SAMSAbdul2026!') {
          sessionStorage.setItem('sams_admin_session', 'active');
          sessionStorage.setItem('sams_admin_role', 'sales');
          sessionStorage.setItem('sams_admin_name', 'Abdulwahid');
          setUserRole('sales');
          setUserName('Abdulwahid');
          setIsAuthenticated(true);
        } else {
          throw new Error('Invalid email or password (Test credentials: admin@sams-oman.com / SAMSAdmin2026! or sales: abdulrazzaq@sams-oman.com / SAMSAbdul2026!)');
        }
      }
    } catch (err: any) {
      setLoginError(err.message || 'Login failed.');
    } finally {
      setLoading(false);
    }
  };

  const handleLogout = async () => {
    if (isSupabaseConfigured) {
      await supabase.auth.signOut();
    }
    sessionStorage.removeItem('sams_admin_session');
    sessionStorage.removeItem('sams_admin_role');
    sessionStorage.removeItem('sams_admin_name');
    setIsAuthenticated(false);
    router.push('/admin');
  };

  // --- CRUD ACTIONS ---

  // Inventory Save (Add/Edit)
  const handleSaveProduct = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingProduct) return;
    try {
      const saved = await dbService.saveProduct(editingProduct);
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
      alert('Error saving product');
    }
  };

  // Toggle Product Status (Active/Inactive)
  const handleToggleProductStatus = async (prod: Product) => {
    const updatedStatus = !prod.is_active;
    try {
      const updated = await dbService.saveProduct({ ...prod, is_active: updatedStatus });
      setProducts(prev => prev.map(p => p.id === prod.id ? updated : p));
    } catch (err) {
      alert('Error updating product status');
    }
  };

  // Inquiries Updates (Status)
  const handleUpdateInquiryStatus = async (id: string, status: Inquiry['status']) => {
    const ok = await dbService.updateInquiryStatus(id, status);
    if (ok) {
      setInquiries(prev => prev.map(i => i.id === id ? { ...i, status } : i));
    }
  };

  // Orders Updates (Status & Payment Status)
  const handleUpdateOrderStatus = async (id: string, status: Order['status'], payStatus: Order['payment_status']) => {
    const ok = await dbService.updateOrderStatus(id, status, payStatus);
    if (ok) {
      setOrders(prev => prev.map(o => o.id === id ? { ...o, status, payment_status: payStatus } : o));
    }
  };

  // Settings Updates
  const handleUpdateSetting = async (key: string, val: string) => {
    const ok = await dbService.updateSiteSetting(key, val);
    if (ok) {
      setSiteSettings(prev => ({ ...prev, [key]: val }));
    }
  };

  // FAQ Actions
  const handleAddFAQ = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!faqQuestion.trim() || !faqAnswer.trim()) return;
    try {
      const saved = await dbService.saveFAQ({
        question: faqQuestion,
        answer: faqAnswer,
        is_active: true
      });
      if (saved) {
        const freshFaqs = await dbService.getAllFAQsAdmin();
        setFaqs(freshFaqs);
        setFaqQuestion('');
        setFaqAnswer('');
      }
    } catch (err) {
      console.error('Error adding FAQ:', err);
      alert('Failed to add FAQ.');
    }
  };

  const handleDeleteFAQ = async (id: string) => {
    if (confirm('Delete this FAQ?')) {
      try {
        const updated = await dbService.saveFAQ({ id, is_active: false });
        if (updated) {
          setFaqs(prev => prev.filter(f => f.id !== id));
        }
      } catch (err) {
        console.error('Error deleting FAQ:', err);
        alert('Failed to delete FAQ.');
      }
    }
  };

  // Certificate Actions
  const handleAddCert = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!certName.trim() || !certIssuer.trim()) return;
    try {
      const saved = await dbService.saveCertificate({
        title: certName,
        certificate_type: certIssuer,
        is_active: true
      });
      if (saved) {
        const freshCerts = await dbService.getAllCertificatesAdmin();
        setCertificates(freshCerts);
        setCertName('');
        setCertIssuer('');
      }
    } catch (err) {
      console.error('Error adding certificate:', err);
      alert('Failed to add certificate.');
    }
  };

  const handleDeleteCert = async (id: string) => {
    if (confirm('Delete this quality certificate?')) {
      try {
        const updated = await dbService.saveCertificate({ id, is_active: false });
        if (updated) {
          setCertificates(prev => prev.filter(c => c.id !== id));
        }
      } catch (err) {
        console.error('Error deleting certificate:', err);
        alert('Failed to delete certificate.');
      }
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

  const filteredOrders = orders.filter(o => 
    o.customer_name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    o.id.toLowerCase().includes(searchQuery.toLowerCase()) ||
    o.email.toLowerCase().includes(searchQuery.toLowerCase())
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

  // --- ANALYTICS CALCULATIONS ---
  // Default Analytics seeds for visual graphs if DB is empty
  const totalSalesVal = orders.reduce((acc, o) => acc + (o.status === 'completed' || o.status === 'paid' ? Number(o.total_amount) : 0), 0) || 12458.000;
  const avgOrderVal = orders.length > 0 ? (totalSalesVal / orders.length) : 32.410;
  const totalTransCount = orders.length || 3842;
  const growthRatePercent = 18.2;

  // --- RENDERS ---

  if (!isAuthenticated) {
    return (
      <div className="min-h-screen bg-[#F4F6F8] flex items-center justify-center px-4 sm:px-6 lg:px-8 text-gray-900 font-sans">
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

            {!isSupabaseConfigured && (
              <div className="bg-navy/5 border border-navy/10 p-4 rounded-2xl text-[11px] text-gray-600 leading-relaxed font-light space-y-1">
                <strong className="text-navy uppercase tracking-wider block font-bold">Local Sandbox Fallback:</strong>
                <p>Sign in using sandbox credentials:</p>
                <div className="bg-white/50 p-2.5 rounded-lg border border-gray-150 font-mono space-y-1 text-[10px]">
                  <div>
                    <span className="font-semibold text-navy">Admin:</span> admin@sams-oman.com / SAMSAdmin2026!
                  </div>
                  <div>
                    <span className="font-semibold text-navy">Sales 1:</span> abdulrazzaq@sams-oman.com / SAMSAbdul2026!
                  </div>
                  <div>
                    <span className="font-semibold text-navy">Sales 2:</span> abdulwahid@sams-oman.com / SAMSAbdul2026!
                  </div>
                </div>
              </div>
            )}

            <div className="space-y-4">
              <div className="space-y-1.5">
                <label className="text-[10px] uppercase font-bold text-gray-500 tracking-wider">Email Address</label>
                <input
                  type="email"
                  required
                  placeholder="admin@sams-oman.com"
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
                      onClick={() => { setActiveTab('reports'); setSearchQuery(''); }}
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
              Contact our tech support for manual databases and API setups.
            </span>
            <a 
              href="mailto:support@sams-oman.com" 
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
            <button className="relative p-2 rounded-xl hover:bg-gray-55/20 text-gray-500 transition-colors">
              <Bell className="w-5 h-5" />
              <span className="absolute top-1 right-1 w-2.5 h-2.5 bg-fire rounded-full border border-white" />
            </button>

            <div className="flex items-center gap-3 pl-4 border-l border-gray-150">
              <div className="bg-navy/10 p-2.5 rounded-full text-navy font-bold w-10 h-10 flex items-center justify-center text-sm uppercase font-display">
                {userName.substring(0, 2).toUpperCase()}
              </div>
              <div className="hidden sm:block leading-none text-left">
                <span className="text-xs font-bold text-navy block">{userName}</span>
                <span className="text-[10px] text-gray-400 font-mono mt-0.5 block">
                  {email || (userRole === 'admin' ? 'admin@sams-oman.com' : `${userName.toLowerCase()}@sams-oman.com`)}
                </span>
              </div>
            </div>
          </div>
        </header>

        {/* CONTENT SWITCHER */}
        <main className="flex-1 overflow-y-auto p-8 lg:p-10">

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
                <button
                  onClick={() => { setEditingProduct({}); setIsProductModalOpen(true); }}
                  className="bg-navy hover:bg-fire text-white text-xs uppercase tracking-widest font-bold px-5 py-3 rounded-xl flex items-center gap-2 transition-all shadow-md active:scale-95"
                >
                  <Plus className="w-4 h-4" />
                  Add New Product
                </button>
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
                    <span className="text-[10px] text-gray-400 uppercase tracking-widest font-bold block">Quotation Inquiries</span>
                    <span className="text-3xl font-extrabold text-navy font-display">{inquiries.length}</span>
                  </div>
                  <div className="bg-orange-50 p-3.5 rounded-xl text-safety"><MessageSquare className="w-6 h-6" /></div>
                </div>

                <div className="bg-white p-6 rounded-2xl border border-gray-150 flex items-center justify-between shadow-sm hover:shadow-md transition-shadow">
                  <div className="space-y-1">
                    <span className="text-[10px] text-gray-400 uppercase tracking-widest font-bold block">Processed Orders</span>
                    <span className="text-3xl font-extrabold text-navy font-display">{orders.length}</span>
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

              {/* Grid: Recent Orders & Inquiries */}
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
                            {new Date(inq.created_at || Date.now()).toLocaleDateString('en-GB')}
                          </span>
                        </div>
                      </div>
                    ))}
                    {inquiries.length === 0 && (
                      <p className="text-xs text-gray-400 italic text-center py-6">No quotation inquiries available.</p>
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
                          <p className="font-bold text-navy">{ord.customer_name}</p>
                          <p className="text-gray-400 font-light">
                            Total: <strong className="font-semibold text-navy">{ord.total_amount.toFixed(3)} OMR</strong> | {ord.payment_provider}
                          </p>
                        </div>
                        <div className="text-right space-y-1">
                          <span className={`px-2 py-0.5 rounded-full font-bold text-[9px] uppercase tracking-wider block w-fit ml-auto ${
                            ord.status === 'delivered'
                              ? 'bg-green-50 text-green-600'
                              : ord.status === 'shipping'
                                ? 'bg-blue-50 text-blue-650'
                                : ord.status === 'processing'
                                  ? 'bg-orange-50 text-safety'
                                  : ord.status === 'placement'
                                    ? 'bg-yellow-50 text-yellow-600'
                                    : 'bg-red-50 text-fire'
                          }`}>
                            {ord.status}
                          </span>
                          <span className="text-[9px] text-gray-400 block font-mono">
                            {new Date(ord.created_at || Date.now()).toLocaleDateString('en-GB')}
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
                    Track customer invoices, update Paymob delivery status, and respond to quote requests.
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
                    Checkout Invoices ({filteredOrders.length})
                  </button>
                  <button
                    onClick={() => setOrdersTab('quotations')}
                    className={`px-4 py-2 rounded-lg text-xs uppercase font-bold tracking-wider transition-all ${
                      ordersTab === 'quotations' ? 'bg-white text-navy shadow-sm' : 'text-gray-500 hover:text-navy'
                    }`}
                  >
                    Quotation Inquiries ({filteredInquiries.length})
                  </button>
                </div>
              </div>

              {/* SUBTAB 1: CHECKOUT ORDERS */}
              {ordersTab === 'checkout' && (
                <div className="bg-white border border-gray-150 rounded-2xl shadow-sm overflow-hidden">
                  <div className="overflow-x-auto">
                    <table className="w-full text-left text-xs border-collapse">
                      <thead>
                        <tr className="bg-gray-50 text-gray-400 uppercase tracking-wider text-[10px] border-b border-gray-150 font-bold">
                          <th className="p-4 pl-6">Order ID</th>
                          <th className="p-4">Customer Details</th>
                          <th className="p-4">Billing Location</th>
                          <th className="p-4">Total Amount</th>
                          <th className="p-4">Payment Method</th>
                          <th className="p-4">Order Status</th>
                          <th className="p-4">Payment Status</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-gray-100 text-gray-700">
                        {filteredOrders.map((ord) => (
                          <tr key={ord.id} className="hover:bg-gray-50/50 transition-colors">
                            <td className="p-4 pl-6 font-mono font-bold text-navy truncate max-w-[120px]">{ord.id}</td>
                            <td className="p-4">
                              <span className="font-bold text-navy block">{ord.customer_name}</span>
                              <span className="text-gray-400 text-[10px] font-mono block">{ord.email}</span>
                            </td>
                            <td className="p-4 font-light">{ord.address || 'N/A'}, Oman</td>
                            <td className="p-4 font-bold text-navy text-[13px]">{Number(ord.total_amount).toFixed(3)} OMR</td>
                            <td className="p-4 uppercase tracking-widest text-[9px] font-semibold">{ord.payment_provider}</td>
                            <td className="p-4">
                              <select
                                value={ord.status}
                                onChange={(e) => handleUpdateOrderStatus(ord.id, e.target.value as Order['status'], ord.payment_status)}
                                className={`text-[10px] font-bold uppercase tracking-wider px-2.5 py-1.5 rounded-lg border focus:outline-none ${
                                  ord.status === 'delivered'
                                    ? 'bg-green-50 text-green-700 border-green-200' 
                                    : ord.status === 'shipping' 
                                      ? 'bg-blue-50 text-blue-700 border-blue-200' 
                                      : ord.status === 'processing'
                                        ? 'bg-orange-50 text-safety border-orange-200'
                                        : ord.status === 'placement'
                                          ? 'bg-yellow-50 text-yellow-700 border-yellow-200'
                                          : 'bg-red-50 text-fire border-red-200'
                                }`}
                              >
                                <option value="placement">Placement</option>
                                <option value="processing">Processing</option>
                                <option value="shipping">Shipping</option>
                                <option value="delivered">Delivered</option>
                                <option value="cancelled">Cancelled</option>
                              </select>
                            </td>
                            <td className="p-4">
                              <select
                                value={ord.payment_status}
                                onChange={(e) => handleUpdateOrderStatus(ord.id, ord.status, e.target.value as Order['payment_status'])}
                                className={`text-[10px] font-bold uppercase tracking-wider px-2.5 py-1.5 rounded-lg border focus:outline-none ${
                                  ord.payment_status === 'verified'
                                    ? 'bg-green-50 text-green-700 border-green-200' 
                                    : 'bg-yellow-50 text-yellow-700 border-yellow-200'
                                }`}
                              >
                                <option value="unpaid">Unpaid</option>
                                <option value="verified">Verified</option>
                              </select>
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
                          <th className="p-4 pl-6">Inquirer Details</th>
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
                            <td className="p-4 font-mono font-light text-gray-450">{new Date(inq.created_at || Date.now()).toLocaleDateString('en-GB')}</td>
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
                            <td colSpan={7} className="p-8 text-center text-gray-400 italic">No quotation inquiries found.</td>
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
                  onClick={() => { setEditingProduct({}); setIsProductModalOpen(true); }}
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
                        <th className="p-4">Life Years</th>
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
                          </td>
                          <td className="p-4">
                            <span className="font-semibold text-gray-700 block">{prod.make}</span>
                            <span className="text-gray-400 text-[10px] block">{prod.product_type}</span>
                          </td>
                          <td className="p-4 font-mono font-medium text-navy">{prod.weight}</td>
                          <td className="p-4 font-bold text-navy">{Number(prod.price).toFixed(3)} OMR</td>
                          <td className="p-4 font-medium">{prod.life_years} Years</td>
                          <td className="p-4">
                            <span className={`px-2.5 py-1 rounded-full font-bold text-[9px] uppercase tracking-wider ${
                              prod.is_active ? 'bg-green-50 text-green-700' : 'bg-red-50 text-red-700'
                            }`}>
                              {prod.is_active ? 'Active' : 'Inactive'}
                            </span>
                          </td>
                          <td className="p-4 text-right pr-6 space-x-2">
                            <button
                              onClick={() => { setEditingProduct(prod); setIsProductModalOpen(true); }}
                              className="p-2 bg-gray-50 hover:bg-navy/10 rounded-lg text-navy hover:text-navy transition-all active:scale-95 inline-block"
                              title="Edit Product"
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
                  A unified list of individual customers and businesses that have ordered or submitted quotation inquiries.
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
                          <td className="p-4 font-mono font-medium text-gray-650">{cust.email}</td>
                          <td className="p-4 font-mono text-gray-600">{cust.phone}</td>
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
          {activeTab === 'reports' && (
            <div className="space-y-8">
              <div className="space-y-1">
                <h2 className="font-display text-3xl font-bold uppercase tracking-wider text-navy">
                  Reports & Analytics
                </h2>
                <p className="text-xs text-gray-500 font-light">
                  Detailed sales reports, profit summaries, and monthly trends.
                </p>
              </div>

              {/* KPI Cards Grid */}
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
                <div className="bg-white p-6 rounded-2xl border border-gray-150 flex flex-col justify-between shadow-sm relative overflow-hidden">
                  <div className="space-y-2">
                    <span className="text-[10px] text-gray-400 uppercase tracking-widest font-bold block">Total Sales</span>
                    <span className="text-3xl font-extrabold text-navy font-display">
                      {totalSalesVal.toFixed(3)} <span className="text-xs font-semibold">OMR</span>
                    </span>
                  </div>
                  <div className="flex items-center gap-1.5 text-xs text-green-600 font-bold mt-4">
                    <ArrowUpRight className="w-4 h-4" />
                    <span>+18% last period</span>
                  </div>
                </div>

                <div className="bg-white p-6 rounded-2xl border border-gray-150 flex flex-col justify-between shadow-sm relative overflow-hidden">
                  <div className="space-y-2">
                    <span className="text-[10px] text-gray-400 uppercase tracking-widest font-bold block">Avg. Order Value</span>
                    <span className="text-3xl font-extrabold text-navy font-display">
                      {avgOrderVal.toFixed(3)} <span className="text-xs font-semibold">OMR</span>
                    </span>
                  </div>
                  <div className="flex items-center gap-1.5 text-xs text-green-600 font-bold mt-4">
                    <ArrowUpRight className="w-4 h-4" />
                    <span>+5.7% last period</span>
                  </div>
                </div>

                <div className="bg-white p-6 rounded-2xl border border-gray-150 flex flex-col justify-between shadow-sm relative overflow-hidden">
                  <div className="space-y-2">
                    <span className="text-[10px] text-gray-400 uppercase tracking-widest font-bold block">Total Transactions</span>
                    <span className="text-3xl font-extrabold text-navy font-display">
                      {totalTransCount.toLocaleString()}
                    </span>
                  </div>
                  <div className="flex items-center gap-1.5 text-xs text-green-600 font-bold mt-4">
                    <ArrowUpRight className="w-4 h-4" />
                    <span>+12% last month</span>
                  </div>
                </div>

                <div className="bg-white p-6 rounded-2xl border border-gray-150 flex flex-col justify-between shadow-sm relative overflow-hidden">
                  <div className="space-y-2">
                    <span className="text-[10px] text-gray-400 uppercase tracking-widest font-bold block">Growth Rate</span>
                    <span className="text-3xl font-extrabold text-navy font-display">
                      {growthRatePercent}%
                    </span>
                  </div>
                  <div className="flex items-center gap-1.5 text-xs text-green-600 font-bold mt-4">
                    <ArrowUpRight className="w-4 h-4" />
                    <span>+3.4% last period</span>
                  </div>
                </div>
              </div>

              {/* Grid: Charts Block */}
              <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                
                {/* Chart 1: Sales Performance Overview (2 cols) */}
                <div className="lg:col-span-2 bg-white rounded-2xl border border-gray-150 p-6 shadow-sm space-y-6">
                  <div className="flex justify-between items-center">
                    <h3 className="font-display text-lg uppercase font-bold text-navy">Sales Performance Overview</h3>
                    <select className="text-[10px] uppercase font-bold tracking-wider bg-gray-50 border border-gray-200 rounded-lg p-2 focus:outline-none">
                      <option>Weekly</option>
                      <option>Monthly</option>
                    </select>
                  </div>

                  <div className="space-y-1 text-left">
                    <span className="text-2xl font-extrabold text-navy font-display">OMR 12,950.72</span>
                    <span className="text-[10px] font-bold text-green-650 bg-green-50 px-2 py-0.5 rounded-full inline-flex items-center gap-0.5 ml-2">
                      <ArrowUpRight className="w-3 h-3" />
                      6.20%
                    </span>
                  </div>

                  {/* SVG Line Graph */}
                  <div className="relative w-full overflow-hidden bg-white pt-4">
                    <svg viewBox="0 0 600 240" className="w-full h-auto text-safety">
                      {/* Grid Lines */}
                      <line x1="0" y1="40" x2="600" y2="40" stroke="#F1F5F9" strokeWidth="1" />
                      <line x1="0" y1="90" x2="600" y2="90" stroke="#F1F5F9" strokeWidth="1" />
                      <line x1="0" y1="140" x2="600" y2="140" stroke="#F1F5F9" strokeWidth="1" />
                      <line x1="0" y1="190" x2="600" y2="190" stroke="#F1F5F9" strokeWidth="1" />

                      {/* X Axis Labels */}
                      <text x="30" y="215" fill="#94A3B8" fontSize="10" fontWeight="bold">JAN</text>
                      <text x="120" y="215" fill="#94A3B8" fontSize="10" fontWeight="bold">FEB</text>
                      <text x="210" y="215" fill="#94A3B8" fontSize="10" fontWeight="bold">MAR</text>
                      <text x="300" y="215" fill="#94A3B8" fontSize="10" fontWeight="bold">APR</text>
                      <text x="390" y="215" fill="#94A3B8" fontSize="10" fontWeight="bold">MAY</text>
                      <text x="480" y="215" fill="#94A3B8" fontSize="10" fontWeight="bold">JUN</text>
                      <text x="570" y="215" fill="#94A3B8" fontSize="10" fontWeight="bold">JUL</text>

                      {/* Shading Area Gradient */}
                      <defs>
                        <linearGradient id="chart-glow" x1="0" y1="0" x2="0" y2="1">
                          <stop offset="0%" stopColor="#E42126" stopOpacity="0.25" />
                          <stop offset="100%" stopColor="#E42126" stopOpacity="0" />
                        </linearGradient>
                      </defs>

                      {/* Filled Shading Path */}
                      <path 
                        d="M 30 150 C 120 120, 150 180, 210 130 C 270 120, 300 170, 390 100 C 480 120, 510 160, 570 110 L 570 190 L 30 190 Z" 
                        fill="url(#chart-glow)" 
                      />

                      {/* Line Path */}
                      <path 
                        d="M 30 150 C 120 120, 150 180, 210 130 C 270 120, 300 170, 390 100 C 480 120, 510 160, 570 110" 
                        fill="none" 
                        stroke="#E42126" 
                        strokeWidth="3.5" 
                        strokeLinecap="round"
                      />

                      {/* Interactive Target Circle */}
                      <circle cx="390" cy="100" r="6" fill="#063247" stroke="#FFFFFF" strokeWidth="2.5" />
                      
                      {/* May Tooltip */}
                      <rect x="395" y="75" width="70" height="20" rx="6" fill="#063247" />
                      <text x="403" y="89" fill="#FFFFFF" fontSize="9" fontWeight="bold">OMR 4,645.80</text>
                    </svg>
                  </div>
                </div>

                {/* Top Selling Products List (1 col) */}
                <div className="bg-white rounded-2xl border border-gray-150 p-6 shadow-sm space-y-6">
                  <div className="flex justify-between items-center pb-2">
                    <h3 className="font-display text-lg uppercase font-bold text-navy">Top Selling Products</h3>
                    <select className="text-[10px] uppercase font-bold tracking-wider bg-gray-50 border border-gray-200 rounded-lg p-2 focus:outline-none">
                      <option>Monthly</option>
                    </select>
                  </div>

                  <div className="space-y-4">
                    {products.slice(0, 4).map((prod, idx) => (
                      <div key={prod.id} className="flex items-center justify-between border-b border-gray-55 pb-3 last:border-0 last:pb-0">
                        <div className="flex items-center gap-3">
                          <div className="relative w-10 h-10 rounded-lg overflow-hidden border border-gray-100">
                            <Image src={prod.images[0] || '/hero_bg.png'} alt={prod.name} fill sizes="40px" className="object-cover" />
                          </div>
                          <div className="space-y-0.5 text-left">
                            <span className="text-xs font-bold text-navy block truncate max-w-[140px]">{prod.name}</span>
                            <span className="text-[10px] text-gray-400 block font-light">{1089 - idx * 240} units sold</span>
                          </div>
                        </div>
                        <span className="text-xs font-extrabold text-navy">
                          {(1089 - idx * 240) * 12.500 > 0 ? `OMR ${((1089 - idx * 240) * Number(prod.price) || 4345).toLocaleString()}` : 'OMR 0.000'}
                        </span>
                      </div>
                    ))}
                  </div>
                </div>

              </div>

              {/* Grid: Sales Category & Hourly Patterns */}
              <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                
                {/* Sales By Category */}
                <div className="bg-white rounded-2xl border border-gray-150 p-6 shadow-sm space-y-6">
                  <div className="flex justify-between items-center">
                    <h3 className="font-display text-lg uppercase font-bold text-navy">Sales by Category</h3>
                    <button className="p-1 rounded hover:bg-gray-100"><Info className="w-4 h-4 text-gray-400" /></button>
                  </div>

                  <div className="space-y-5 pt-4">
                    <div className="space-y-2 text-left">
                      <div className="flex justify-between text-xs font-semibold text-gray-700">
                        <span>Automatic Fireballs</span>
                        <span className="font-bold text-navy">42%</span>
                      </div>
                      <div className="w-full bg-gray-100 h-3 rounded-full overflow-hidden">
                        <div className="bg-fire h-full rounded-full" style={{ width: '42%' }} />
                      </div>
                    </div>

                    <div className="space-y-2 text-left">
                      <div className="flex justify-between text-xs font-semibold text-gray-700">
                        <span>Decorative Flowerpots</span>
                        <span className="font-bold text-navy">35%</span>
                      </div>
                      <div className="w-full bg-gray-100 h-3 rounded-full overflow-hidden">
                        <div className="bg-safety h-full rounded-full" style={{ width: '35%' }} />
                      </div>
                    </div>

                    <div className="space-y-2 text-left">
                      <div className="flex justify-between text-xs font-semibold text-gray-700">
                        <span>Mounting Brackets & Accs</span>
                        <span className="font-bold text-navy">23%</span>
                      </div>
                      <div className="w-full bg-gray-100 h-3 rounded-full overflow-hidden">
                        <div className="bg-navy h-full rounded-full" style={{ width: '23%' }} />
                      </div>
                    </div>
                  </div>
                </div>

                {/* Hourly Sales Line Graph (2 cols) */}
                <div className="lg:col-span-2 bg-white rounded-2xl border border-gray-150 p-6 shadow-sm space-y-6">
                  <div className="flex justify-between items-center">
                    <h3 className="font-display text-lg uppercase font-bold text-navy">Hourly Sales Pattern</h3>
                    <select className="text-[10px] uppercase font-bold tracking-wider bg-gray-50 border border-gray-200 rounded-lg p-2 focus:outline-none">
                      <option>Weekly</option>
                    </select>
                  </div>

                  {/* SVG Line Graph */}
                  <div className="relative w-full overflow-hidden bg-white">
                    <svg viewBox="0 0 600 120" className="w-full h-auto text-safety">
                      {/* Grid Lines */}
                      <line x1="0" y1="20" x2="600" y2="20" stroke="#F1F5F9" strokeWidth="1" />
                      <line x1="0" y1="50" x2="600" y2="50" stroke="#F1F5F9" strokeWidth="1" />
                      <line x1="0" y1="80" x2="600" y2="80" stroke="#F1F5F9" strokeWidth="1" />

                      {/* X Axis Labels */}
                      <text x="30" y="105" fill="#94A3B8" fontSize="10" fontWeight="bold">09:00</text>
                      <text x="140" y="105" fill="#94A3B8" fontSize="10" fontWeight="bold">12:00</text>
                      <text x="250" y="105" fill="#94A3B8" fontSize="10" fontWeight="bold">15:00</text>
                      <text x="360" y="105" fill="#94A3B8" fontSize="10" fontWeight="bold">18:00</text>
                      <text x="470" y="105" fill="#94A3B8" fontSize="10" fontWeight="bold">21:00</text>

                      {/* Line Path */}
                      <path 
                        d="M 30 80 C 100 50, 150 70, 250 20 C 350 15, 400 90, 470 60 C 530 40, 550 50, 580 40" 
                        fill="none" 
                        stroke="#063247" 
                        strokeWidth="3" 
                        strokeLinecap="round"
                      />
                      
                      {/* Peak Marker */}
                      <circle cx="250" cy="20" r="4.5" fill="#E42126" stroke="#FFFFFF" strokeWidth="2" />
                    </svg>
                  </div>
                </div>

              </div>

            </div>
          )}

          {/* ============================================================== */}
          {/* TAB 6: SETTINGS MANAGEMENT */}
          {activeTab === 'settings' && (
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
                    <h3 className="font-display text-lg uppercase font-bold text-navy">Contact & Paymob Configuration</h3>
                    <div className="space-y-4">
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                        <div className="space-y-1">
                          <label className="text-[9px] uppercase font-bold text-gray-400 tracking-wider">Business Email</label>
                          <input
                            type="text"
                            value={siteSettings.contact_email || 'info@sams-oman.com'}
                            onChange={(e) => handleUpdateSetting('contact_email', e.target.value)}
                            className="w-full bg-gray-50/50 border border-gray-200 rounded-xl p-3 text-xs focus:outline-none focus:border-fire text-gray-700 font-medium"
                          />
                        </div>
                        <div className="space-y-1">
                          <label className="text-[9px] uppercase font-bold text-gray-400 tracking-wider">Business Phone</label>
                          <input
                            type="text"
                            value={siteSettings.contact_phone || '+968 9000 0000'}
                            onChange={(e) => handleUpdateSetting('contact_phone', e.target.value)}
                            className="w-full bg-gray-50/50 border border-gray-200 rounded-xl p-3 text-xs focus:outline-none focus:border-fire text-gray-700 font-medium"
                          />
                        </div>
                      </div>

                      <div className="space-y-1">
                        <label className="text-[9px] uppercase font-bold text-gray-400 tracking-wider">WhatsApp Trigger Number</label>
                        <input
                          type="text"
                          value={siteSettings.whatsapp_number || '+968 9000 0000'}
                          onChange={(e) => handleUpdateSetting('whatsapp_number', e.target.value)}
                          className="w-full bg-gray-50/50 border border-gray-200 rounded-xl p-3 text-xs focus:outline-none focus:border-fire text-gray-700 font-medium"
                        />
                      </div>

                      <div className="space-y-1">
                        <label className="text-[9px] uppercase font-bold text-gray-400 tracking-wider">Paymob Secret API Key</label>
                        <input
                          type="password"
                          value={siteSettings.paymob_api_key || '••••••••••••••••••••••••'}
                          onChange={(e) => handleUpdateSetting('paymob_api_key', e.target.value)}
                          className="w-full bg-gray-50/50 border border-gray-200 rounded-xl p-3 text-xs focus:outline-none focus:border-fire text-gray-700 font-medium"
                        />
                      </div>
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
                
                {/* Left side: QR Code Scanner and Session Status (5 cols) */}
                <div className="lg:col-span-5 bg-white p-6 sm:p-8 rounded-3xl border border-gray-150 shadow-sm space-y-6 text-center">
                  <div className="flex items-center justify-between pb-4 border-b border-gray-100">
                    <h3 className="font-display text-base uppercase font-bold text-navy">Authentication</h3>
                    <span className={`px-2.5 py-1 rounded-full text-[9px] uppercase tracking-wider font-extrabold ${
                      whatsappConnected ? 'bg-green-50 text-green-700' : 'bg-yellow-50 text-yellow-700'
                    }`}>
                      {whatsappConnected ? 'Session Connected' : 'Disconnected'}
                    </span>
                  </div>

                  {!whatsappConnected ? (
                    <div className="space-y-6 py-4">
                      <p className="text-xs text-gray-500 font-light leading-relaxed">
                        To link your sales WhatsApp account, scan the secure token QR code below with your phone.
                      </p>

                      {whatsappConnecting ? (
                        <div className="aspect-square max-w-[240px] mx-auto bg-gray-50 rounded-2xl flex flex-col items-center justify-center border border-gray-150 p-6 space-y-4">
                          <Loader2 className="w-8 h-8 text-fire animate-spin" />
                          <span className="text-[10px] uppercase tracking-widest text-navy font-bold">Syncing Session...</span>
                        </div>
                      ) : (
                        <div className="relative aspect-square max-w-[240px] mx-auto bg-white rounded-2xl border-2 border-dashed border-gray-200 p-4 flex flex-col items-center justify-center group hover:border-fire transition-colors">
                          {/* QR Code image simulator */}
                          <div className="w-full h-full relative opacity-90 group-hover:opacity-100 transition-opacity">
                            <Image 
                              src="/logo.png" // Using logo container as QR visual backdrop filler
                              alt="Scan QR"
                              fill
                              className="object-contain p-8 blur-[2px]"
                            />
                            {/* Dummy QR pattern lines overlay */}
                            <div className="absolute inset-0 flex flex-col justify-between p-2 font-mono text-[9px] text-gray-400 select-none pointer-events-none">
                              <div className="flex justify-between"><span>[QR_BLOCK_TL]</span><span>[QR_BLOCK_TR]</span></div>
                              <div className="text-center font-bold text-navy bg-white/95 py-2 px-1 rounded border border-gray-150 shadow uppercase tracking-widest">
                                Scan to Connect
                              </div>
                              <div className="flex justify-between"><span>[QR_BLOCK_BL]</span><span>[QR_BLOCK_BR]</span></div>
                            </div>
                          </div>
                        </div>
                      )}

                      <button
                        onClick={() => {
                          setWhatsappConnecting(true);
                          setTimeout(() => {
                            setWhatsappConnected(true);
                            setWhatsappConnecting(false);
                          }, 2000);
                        }}
                        disabled={whatsappConnecting}
                        className="w-full bg-navy hover:bg-fire text-white text-xs uppercase tracking-widest font-bold py-3 rounded-xl transition-all shadow-md cursor-pointer disabled:bg-gray-300"
                      >
                        {whatsappConnecting ? 'Verifying QR Code...' : 'Simulate Scanning QR Code'}
                      </button>
                    </div>
                  ) : (
                    <div className="space-y-6 py-4">
                      <div className="w-16 h-16 bg-green-50 text-green-600 rounded-full flex items-center justify-center mx-auto border border-green-150">
                        <Check className="w-8 h-8 stroke-[3]" />
                      </div>

                      <div className="space-y-1 text-center">
                        <h4 className="font-display font-bold text-navy text-sm uppercase">Active Agent Session</h4>
                        <p className="text-xs text-gray-500 font-mono">Linked to sales number: +968 9000 0000</p>
                      </div>

                      <div className="bg-green-50/50 p-4 rounded-2xl border border-green-150 text-left text-[11px] text-green-800 leading-normal font-light">
                        <strong>Secure Sync Active:</strong> Your local WhatsApp Web connection is live. You can now use templates to dispatch messages and follow up with orders instantly.
                      </div>

                      <button
                        onClick={() => setWhatsappConnected(false)}
                        className="w-full bg-gray-50 hover:bg-red-50 hover:text-fire text-gray-500 text-xs uppercase tracking-widest font-bold py-3 rounded-xl transition-all border border-gray-200 cursor-pointer"
                      >
                        Disconnect Session
                      </button>
                    </div>
                  )}
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
                          "Dear [Client], thank you for contacting SAMS. We have registered your quotation request..."
                        </p>
                      </div>
                      <div className="border border-gray-150 p-3.5 rounded-2xl hover:border-fire transition-colors space-y-1.5 text-xs">
                        <span className="font-bold text-navy uppercase tracking-wide block">2. Shipping & Delivery Alert</span>
                        <p className="text-[11px] text-gray-400 font-light line-clamp-2">
                          "Dear [Client], your SAMS order is now shipped via local courier. Tracking code: [ID]..."
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
                          `Dear ${cust.name},\n\nThank you for choosing SAMS LLC Oman. We have reviewed your quotation inquiry and registered it under our sales database. Let us know if you require delivery details.\n\nBest regards,\n${userName}\nSAMS Sales Representative`
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
                    onChange={(e) => setEditingProduct({ ...editingProduct, name: e.target.value, slug: e.target.value.toLowerCase().replace(/ /g, '-') })}
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
                    value={editingProduct.price || 0}
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

              <div className="space-y-1">
                <label className="text-[10px] uppercase font-bold text-gray-400 tracking-wider">Product Image URLs (Comma Separated)</label>
                <input
                  type="text"
                  value={editingProduct.images?.join(', ') || ''}
                  onChange={(e) => setEditingProduct({ ...editingProduct, images: e.target.value.split(',').map(s => s.trim()) })}
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
