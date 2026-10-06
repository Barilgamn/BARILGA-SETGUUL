import React, { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';
import { addMagazine, createManualSubscription, deleteMagazine, listAllMagazines, listAllSubscriptions, updateMagazine, updateSubscription } from '../lib/records';
import { AddressSummary } from '../components/AddressSummary';
import { BookOpen, Link as LinkIcon, Plus, FileText, Users, ShoppingBag, Search, Filter, Calendar, Edit, Trash2, X, Package, LogOut, CreditCard, ExternalLink, UserRound, BarChart3 } from 'lucide-react';
import { AdminGate } from '../components/AdminGate';
import { lookupHeyzineLink } from '../lib/heyzine';
import { ErrorBoundary } from '../components/ErrorBoundary';
import { useAuth } from '../contexts/AuthContext';
import { AdminCatalogOrders } from './admin/CatalogOrders';
import { AdminDigitalSales } from './admin/DigitalSales';
import { AdminMagazineOrders } from './admin/MagazineOrders';
import { AdminUsers } from './admin/Users';
import { AdminOverview } from './admin/Overview';
import { NotifyIssueButton } from './admin/NotifyIssue';
import { RenewalReminders } from './admin/Renewals';
import { SubscriptionOrder } from '../types';

export type AdminTab = 'overview' | 'users' | 'digital_sales' | 'catalog_orders' | 'magazine_orders' | 'orders' | 'magazines' | 'add_magazine' | 'manual_sub';

const ADMIN_TABS: { id: AdminTab; label: string; icon: typeof ShoppingBag }[] = [
  { id: 'overview', label: 'Тойм', icon: BarChart3 },
  { id: 'digital_sales', label: 'Цахим борлуулалт', icon: CreditCard },
  { id: 'catalog_orders', label: 'Каталогийн захиалга', icon: Package },
  { id: 'orders', label: 'Багц захиалга', icon: ShoppingBag },
  { id: 'magazine_orders', label: 'Сэтгүүлийн захиалга', icon: FileText },
  { id: 'magazines', label: 'Сэтгүүлүүд', icon: BookOpen },
  { id: 'add_magazine', label: 'Сэтгүүл нэмэх', icon: Plus },
  { id: 'manual_sub', label: 'Гараар шивэх', icon: Users },
  { id: 'users', label: 'Хэрэглэгчид', icon: UserRound },
];

export function Admin() {
  return (
    <AdminShell>
      <AdminGate>
        <AdminPanel />
      </AdminGate>
    </AdminShell>
  );
}

// The admin's own frame: no public announcement bar, menu or footer
function AdminShell({ children }: { children: React.ReactNode }) {
  const { user, signOut } = useAuth();
  return (
    <div className="min-h-screen bg-stone-100 text-stone-900 flex flex-col">
      <header className="bg-stone-950 text-white sticky top-0 z-40">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 h-14 flex items-center justify-between gap-4">
          <div className="flex items-center gap-3 min-w-0">
            <span className="font-serif text-xl font-bold tracking-tight">
              BARILGA<span className="text-amber-500">.</span>MN
            </span>
            <span className="text-xs font-semibold text-stone-950 bg-amber-400 px-2 py-0.5">Удирдлага</span>
          </div>
          <div className="flex items-center gap-4 text-sm">
            <a href="/" target="_blank" rel="noreferrer" className="inline-flex items-center gap-1.5 text-stone-300 hover:text-white">
              <ExternalLink className="w-4 h-4" />
              <span className="hidden sm:inline">Сайт руу</span>
            </a>
            {user?.email && (
              <>
                <span className="hidden md:inline text-stone-400 truncate max-w-[200px]">{user.email}</span>
                <button onClick={signOut} className="inline-flex items-center gap-1.5 text-stone-300 hover:text-white">
                  <LogOut className="w-4 h-4" />
                  <span className="hidden sm:inline">Гарах</span>
                </button>
              </>
            )}
          </div>
        </div>
      </header>
      <main className="flex-1 w-full max-w-7xl mx-auto px-4 sm:px-6 py-6 sm:py-8">
        <ErrorBoundary>{children}</ErrorBoundary>
      </main>
    </div>
  );
}

const isAdminTab = (value: string): value is AdminTab => ADMIN_TABS.some(t => t.id === value);

function AdminPanel() {
  // The open tab (and an optional filter, «#digital_sales:pending») lives in
  // the URL hash so a refresh or shared link keeps it
  const readHash = () => {
    const [tab, filter = ''] = window.location.hash.slice(1).split(':');
    return { tab: isAdminTab(tab) ? tab : ('overview' as AdminTab), filter };
  };
  const [route, setRoute] = useState(readHash);
  const activeTab = route.tab;
  const goTo = (tab: AdminTab, filter = '') => {
    setRoute({ tab, filter });
    window.history.replaceState(null, '', `#${tab}${filter ? `:${filter}` : ''}`);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };
  const setActiveTab = (tab: AdminTab) => goTo(tab);

  return (
    <div>
      <div className="flex flex-col lg:flex-row gap-6 lg:gap-8">
        {/* Tabs: a scrolling strip on phones, a sidebar on desktop */}
        <div className="w-full lg:w-64 shrink-0">
          <div className="lg:bg-white lg:rounded-2xl lg:border lg:border-stone-200/90 lg:p-4 lg:sticky lg:top-20 lg:shadow-sm">
            <nav className="flex lg:flex-col gap-2 lg:gap-1 overflow-x-auto hide-scrollbar -mx-4 px-4 lg:mx-0 lg:px-0">
              {ADMIN_TABS.map(({ id, label, icon: Icon }) => (
                <button
                  key={id}
                  onClick={() => setActiveTab(id)}
                  className={`shrink-0 whitespace-nowrap flex items-center px-4 py-2.5 lg:py-3 rounded-full lg:rounded-xl text-sm font-semibold transition-colors border lg:border-0 ${
                    activeTab === id
                      ? 'bg-[#0C121E] border-[#0C121E] text-white'
                      : 'bg-white border-stone-300 text-stone-600 hover:bg-stone-50'
                  }`}
                >
                  <Icon className="h-4 w-4 mr-2 lg:mr-3 text-amber-400" /> {label}
                </button>
              ))}
            </nav>
          </div>
        </div>

        {/* Main Content Area */}
        {/* Keyed by the route so a new filter from «Тойм» starts the tab fresh */}
        <div key={`${route.tab}:${route.filter}`} className="flex-1 min-w-0">
          {activeTab === 'overview' && <AdminOverview onNavigate={goTo} />}
          {activeTab === 'digital_sales' && <AdminDigitalSales initialFilter={route.filter} />}
          {activeTab === 'catalog_orders' && <AdminCatalogOrders initialFilter={route.filter} />}
          {activeTab === 'orders' && <AdminOrders initialFilter={route.filter} />}
          {activeTab === 'magazine_orders' && <AdminMagazineOrders />}
          {activeTab === 'magazines' && <AdminMagazines onAdd={() => setActiveTab('add_magazine')} />}
          {activeTab === 'add_magazine' && <AdminAddMagazine />}
          {activeTab === 'manual_sub' && <AdminManualSubscription />}
          {activeTab === 'users' && <AdminUsers />}
        </div>
      </div>
    </div>
  );
}

function AdminOrders({ initialFilter = '' }: { initialFilter?: string }) {
  const [orders, setOrders] = useState<SubscriptionOrder[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  // all, unpaid, pending, delivering, delivered, expiring
  const [filterStatus, setFilterStatus] = useState(initialFilter || 'all');

  useEffect(() => {
    fetchOrders();
  }, []);

  const fetchOrders = async () => {
    setLoading(true);
    try {
      setOrders(await listAllSubscriptions());
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  // Marking paid starts the subscription period from today
  const togglePaid = async (order: SubscriptionOrder) => {
    const paid = order.paymentStatus !== 'paid';
    if (paid && !window.confirm(`${order.fullName} — ${order.price.toLocaleString()}₮ төлбөр орсныг шалгасан уу?`)) return;
    const months = order.plan === 'yearly' ? 12 : order.plan === 'half-year' ? 6 : 3;
    const start = new Date();
    const end = new Date(start);
    end.setMonth(end.getMonth() + months);
    try {
      await updateSubscription(
        order.id,
        paid
          ? { paymentStatus: 'paid', startDate: start.getTime(), endDate: end.getTime() }
          : { paymentStatus: 'pending' }
      );
      fetchOrders();
    } catch (err) {
      console.error(err);
      alert('Алдаа гарлаа');
    }
  };

  const updateOrderStatus = async (orderId: string, newStatus: string) => {
    try {
      await updateSubscription(orderId, { deliveryStatus: newStatus as SubscriptionOrder['deliveryStatus'] });
      fetchOrders(); // refresh
    } catch (err) {
      alert('Алдаа гарлаа');
    }
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'pending': return <span className="bg-amber-100 text-amber-800 px-2 py-1 rounded text-xs font-bold">Хүлээгдэж буй</span>;
      case 'delivering': return <span className="bg-blue-100 text-blue-800 px-2 py-1 rounded text-xs font-bold">Хүргэлтэнд гарсан</span>;
      case 'delivered': return <span className="bg-green-100 text-green-800 px-2 py-1 rounded text-xs font-bold">Хүргэгдсэн</span>;
      default: return <span className="bg-slate-100 text-slate-800 px-2 py-1 rounded text-xs font-bold">{status}</span>;
    }
  };


  const filteredOrders = orders.filter(o => {
    const matchSearch = (o.fullName?.toLowerCase().includes(searchTerm.toLowerCase()) || o.phone?.includes(searchTerm));
    
    let matchStatus = true;
    if (filterStatus !== 'all') {
      if (filterStatus === 'expiring') {
        const now = Date.now();
        const thirtyDays = 30 * 24 * 60 * 60 * 1000;
        // End date exists and is within the next 30 days or already expired
        matchStatus = o.endDate ? (o.endDate - now <= thirtyDays) : false;
      } else if (filterStatus === 'unpaid') {
        matchStatus = o.paymentStatus === 'pending';
      } else {
        matchStatus = o.deliveryStatus === filterStatus;
      }
    }
    
    return matchSearch && matchStatus;
  });


  return (
    <div className="space-y-4">
    <RenewalReminders />
    <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-200">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center mb-6 gap-4">
        <h2 className="text-2xl font-extrabold text-[#0F172A]">Захиалгууд</h2>
        
        <div className="flex flex-wrap gap-3">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-slate-400" />
            <input 
              type="text" 
              placeholder="Утас, Нэрээр хайх..." 
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-9 pr-4 py-2 border border-slate-200 rounded-lg text-sm focus:ring-2 focus:ring-[#0F172A]"
            />
          </div>
          <select 
            value={filterStatus}
            onChange={(e) => setFilterStatus(e.target.value)}
            className="px-4 py-2 border border-slate-200 rounded-lg text-sm focus:ring-2 focus:ring-[#0F172A] bg-white"
          >
            <option value="all">Бүх төлөв</option>
            <option value="unpaid">Төлбөр хүлээж буй</option>
            <option value="pending">Хүлээгдэж буй</option>
            <option value="delivering">Хүргэлтэнд</option>
            <option value="delivered">Хүргэгдсэн</option>
            <option value="expiring">Хугацаа дуусч буй</option>
          </select>
        </div>
      </div>

      {loading ? (
        <div className="py-10 text-center text-slate-500">Уншиж байна...</div>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-slate-50 text-slate-500 text-sm border-y border-slate-200">
                <th className="px-4 py-3 font-medium">Огноо</th>
                <th className="px-4 py-3 font-medium">Харилцагч</th>
                <th className="px-4 py-3 font-medium">Багц</th>
                <th className="px-4 py-3 font-medium">Төлбөр</th>
                <th className="px-4 py-3 font-medium">Хүргэлт</th>
                <th className="px-4 py-3 font-medium">Хүчинтэй</th>
                <th className="px-4 py-3 font-medium text-right">Үйлдэл</th>
              </tr>
            </thead>
            <tbody>
              {filteredOrders.length === 0 ? (
                <tr>
                  <td colSpan={6} className="text-center py-10 text-slate-500">Захиалга олдсонгүй</td>
                </tr>
              ) : (
                filteredOrders.map(order => (
                  <tr key={order.id} className="border-b border-slate-100 hover:bg-slate-50 transition-colors">
                    <td className="px-4 py-4 text-sm">
                      {new Date(order.createdAt).toLocaleDateString()}
                    </td>
                    <td className="px-4 py-4">
                      <div className="font-bold text-[#0F172A] text-sm">{order.fullName}</div>
                      <div className="text-xs text-slate-500">{order.phone}</div>
                      <div className="text-xs text-slate-600 mt-1 max-w-xs">
                        <AddressSummary
                          city={order.city}
                          district={order.district}
                          khoroo={order.khoroo}
                          detail={order.addressDetail}
                          placeType={order.placeType}
                          lat={order.lat}
                          lng={order.lng}
                        />
                      </div>
                    </td>
                    <td className="px-4 py-4 text-sm font-medium">
                      {order.plan === 'quarterly' ? 'Улирал' : order.plan === 'half-year' ? 'Хагас жил' : 'Жил'}
                    </td>
                    <td className="px-4 py-4">
                      <span className="font-bold text-[#0F172A] text-sm tabular-nums">{order.price?.toLocaleString()}₮</span>
                      <button
                        onClick={() => togglePaid(order)}
                        className={`mt-1 block text-xs font-semibold px-2 py-1 rounded ${
                          order.paymentStatus === 'paid' ? 'bg-emerald-100 text-emerald-800' : 'bg-red-50 text-red-700 hover:bg-red-100'
                        }`}
                        title={order.paymentStatus === 'paid' ? 'Төлөөгүй болгох' : 'Төлбөр орсон бол дарна уу'}
                      >
                        {order.paymentStatus === 'paid' ? 'Төлсөн ✓' : 'Төлөөгүй · тэмдэглэх'}
                      </button>
                    </td>
                    <td className="px-4 py-4">
                      {getStatusBadge(order.deliveryStatus)}
                    </td>
                    <td className="px-4 py-4 text-sm text-slate-500">
                      {order.endDate ? new Date(order.endDate).toLocaleDateString() : '-'}
                    </td>
                    <td className="px-4 py-4 text-right">
                      <select 
                        value={order.deliveryStatus}
                        onChange={(e) => updateOrderStatus(order.id, e.target.value)}
                        className="text-xs px-2 py-1.5 border border-slate-200 rounded-md bg-white focus:ring-1 focus:ring-[#0F172A]"
                      >
                        <option value="pending">Хүлээгдэж буй</option>
                        <option value="delivering">Хүргэлтэнд</option>
                        <option value="delivered">Хүргэгдсэн</option>
                      </select>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      )}
    </div>
    </div>
  );
}

// ==========================================
// 2. MANUAL SUBSCRIPTION ENTRY
// ==========================================
function AdminManualSubscription() {
  const [loading, setLoading] = useState(false);
  const [formData, setFormData] = useState({
    fullName: '',
    phone: '',
    email: '',
    companyName: '',
    plan: 'yearly',
    freeCode: '',
  });

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      const manualOrder = {
        userId: 'manual_entry',
        ...formData,
        price: 0,
        paymentMethod: 'manual',
        paymentStatus: 'paid',
        deliveryStatus: 'delivered',
        ebarimtType: 'company',
        city: '', district: '', addressDetail: '',
        createdAt: Date.now(), endDate: Date.now() + (formData.plan === 'yearly' ? 31536000000 : formData.plan === 'half-year' ? 15768000000 : 7884000000),
        digitalCode: formData.freeCode || Math.random().toString(36).substring(2, 8).toUpperCase(),
      };
      await createManualSubscription(manualOrder as any);
      alert('Амжилттай бүртгэгдлээ. Дижитал код: ' + manualOrder.digitalCode);
      setFormData({ fullName: '', phone: '', email: '', companyName: '', plan: 'yearly', freeCode: '' });
    } catch (err) {
      console.error(err);
      alert('Алдаа гарлаа');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-200">
      <div className="mb-6">
        <h2 className="text-2xl font-extrabold text-[#0F172A]">Гараар шивэх (Байгууллага)</h2>
        <p className="text-slate-500 text-sm mt-1">Гишүүн байгууллагуудын сэтгүүлийн эрхийг үнэ төлбөргүй нээх, код үүсгэх</p>
      </div>

      <form onSubmit={handleSubmit} className="space-y-4 max-w-lg">
        <div>
          <label className="block text-sm font-bold text-slate-700 mb-1">Байгууллагын нэр</label>
          <input required type="text" name="companyName" value={formData.companyName} onChange={handleChange} className="w-full px-4 py-2.5 rounded-xl border border-slate-200 focus:ring-2 focus:ring-[#0F172A]" />
        </div>
        <div>
          <label className="block text-sm font-bold text-slate-700 mb-1">Холбогдох хүний нэр</label>
          <input required type="text" name="fullName" value={formData.fullName} onChange={handleChange} className="w-full px-4 py-2.5 rounded-xl border border-slate-200 focus:ring-2 focus:ring-[#0F172A]" />
        </div>
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-bold text-slate-700 mb-1">Утас</label>
            <input required type="text" name="phone" value={formData.phone} onChange={handleChange} className="w-full px-4 py-2.5 rounded-xl border border-slate-200 focus:ring-2 focus:ring-[#0F172A]" />
          </div>
          <div>
            <label className="block text-sm font-bold text-slate-700 mb-1">Багц</label>
            <select name="plan" value={formData.plan} onChange={handleChange} className="w-full px-4 py-2.5 rounded-xl border border-slate-200 focus:ring-2 focus:ring-[#0F172A] bg-white">
              <option value="yearly">Жил</option>
              <option value="half-year">Хагас жил</option>
              <option value="quarterly">Улирал</option>
            </select>
          </div>
        </div>
        <div>
          <label className="block text-sm font-bold text-slate-700 mb-1">Хүссэн эрхийн код (Сонголттой)</label>
          <input type="text" name="freeCode" value={formData.freeCode} onChange={handleChange} placeholder="Жишээ нь: VIP2024" className="w-full px-4 py-2.5 rounded-xl border border-slate-200 focus:ring-2 focus:ring-[#0F172A]" />
          <p className="text-xs text-slate-500 mt-1">Оруулахгүй бол систем автоматаар код үүсгэнэ.</p>
        </div>
        
        <button type="submit" disabled={loading} className="bg-[#0F172A] text-white py-3 px-6 rounded-xl font-bold mt-4">
          {loading ? 'Уншиж байна...' : 'Бүртгэх'}
        </button>
      </form>
    </div>
  );
}

// ==========================================
// 3. ADD MAGAZINE (Existing functionality)
// ==========================================
function AdminAddMagazine() {
  const [importMethod, setImportMethod] = useState<'pdf' | 'heyzine'>('heyzine');
  const [pdfUrl, setPdfUrl] = useState('');
  const [heyzineLinkInput, setHeyzineLinkInput] = useState('');
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [issueNumber, setIssueNumber] = useState('');
  const [category, setCategory] = useState('magazine');
  const [coverImage, setCoverImage] = useState('');
  const [priceDigital, setPriceDigital] = useState(5000);
  const [pricePrint, setPricePrint] = useState(15000);
  
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [result, setResult] = useState<any>(null);
  const [lookupState, setLookupState] = useState<'idle' | 'loading' | 'found' | 'missing'>('idle');

  // Pasting a Heyzine link fills the cover (and title, issue, category if empty)
  useEffect(() => {
    if (importMethod !== 'heyzine' || !/^https?:\/\/\S+\.\S+/.test(heyzineLinkInput.trim())) {
      setLookupState('idle');
      return;
    }
    setLookupState('loading');
    let cancelled = false;
    const timer = setTimeout(async () => {
      const found = await lookupHeyzineLink(heyzineLinkInput).catch(() => null);
      if (cancelled) return;
      if (!found) return setLookupState('missing');
      setCoverImage(found.coverImage);
      setTitle(t => t || found.title);
      setIssueNumber(n => n || found.issueNumber || found.title.match(/№\s?\d+/)?.[0] || '');
      if (found.category) setCategory(found.category);
      setLookupState('found');
    }, 500);
    return () => {
      cancelled = true;
      clearTimeout(timer);
    };
  }, [heyzineLinkInput, importMethod]);

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (importMethod === 'pdf' && !pdfUrl) return setError('PDF URL оруулна уу');
    if (importMethod === 'heyzine' && !heyzineLinkInput) return setError('Heyzine линк оруулна уу');

    setLoading(true); setError(''); setResult(null);

    try {
      let finalHeyzineLink = '';
      let finalCoverImage = coverImage;
      if (importMethod === 'heyzine' && !finalCoverImage) {
        finalCoverImage = (await lookupHeyzineLink(heyzineLinkInput).catch(() => null))?.coverImage || '';
        if (!finalCoverImage) throw new Error('Heyzine-ээс хавтас олдсонгүй. Линкээ шалгах эсвэл зургийн URL оруулна уу.');
      }

      if (importMethod === 'pdf') {
        const { data: session } = await supabase.auth.getSession();
        const response = await fetch('/api/magazines/heyzine', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${session.session?.access_token ?? ''}`,
          },
          body: JSON.stringify({ pdfUrl, title })
        });
        const data = await response.json();
        if (!response.ok) throw new Error(data.error || 'Алдаа гарлаа');
        finalHeyzineLink = data.link || data.url;
        if (!finalCoverImage && data.thumbnail) finalCoverImage = data.thumbnail;
      } else {
        finalHeyzineLink = heyzineLinkInput;
      }
      
      const newMagazine = {
        title, issueNumber, category, description,
        coverImage: finalCoverImage || 'https://images.unsplash.com/photo-1585829365295-ab7cd400c167?w=500&q=80',
        pdfUrl: importMethod === 'pdf' ? pdfUrl : '',
        heyzineLink: finalHeyzineLink,
        priceDigital, pricePrint,
        createdAt: Date.now()
      };
      
      const { createdAt: _createdAt, ...fields } = newMagazine;
      setResult(await addMagazine(fields));
      
      setTitle(''); setIssueNumber(''); setDescription(''); setCoverImage(''); setPdfUrl(''); setHeyzineLinkInput(''); setLookupState('idle');
    } catch (err: any) {
      setError(err.message || 'Алдаа гарлаа.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="bg-white p-8 rounded-2xl shadow-sm border border-slate-100">
      <div className="flex items-center mb-6 pb-6 border-b border-slate-100">
        <div className="h-12 w-12 bg-[#0F172A] text-white rounded-xl flex items-center justify-center mr-4">
          <Plus className="h-6 w-6" />
        </div>
        <div>
          <h1 className="text-2xl font-extrabold text-[#0F172A]">Сэтгүүл нэмэх</h1>
          <p className="text-slate-500 text-sm mt-1">Системд шинээр сэтгүүл оруулах</p>
        </div>
      </div>

      <div className="flex bg-slate-100 p-1 rounded-xl mb-8">
        <button type="button" onClick={() => setImportMethod('heyzine')} className={`flex-1 flex items-center justify-center py-2.5 text-sm font-bold rounded-lg transition-all ${importMethod === 'heyzine' ? 'bg-white text-[#0F172A] shadow-sm' : 'text-slate-500 hover:text-slate-700'}`}>
          <BookOpen className="h-4 w-4 mr-2" /> Бэлэн Heyzine линк оруулах
        </button>
        <button type="button" onClick={() => setImportMethod('pdf')} className={`flex-1 flex items-center justify-center py-2.5 text-sm font-bold rounded-lg transition-all ${importMethod === 'pdf' ? 'bg-white text-[#0F172A] shadow-sm' : 'text-slate-500 hover:text-slate-700'}`}>
          <FileText className="h-4 w-4 mr-2" /> PDF файлаас шинээр үүсгэх
        </button>
      </div>

      {error && <div className="bg-red-50 text-red-700 p-4 rounded-xl mb-6 font-medium text-sm border border-red-100">{error}</div>}
      {result && (
        <div className="bg-green-50 text-green-800 p-4 rounded-xl mb-6 border border-green-100">
          <h3 className="font-bold mb-2">Амжилттай нэмэгдлээ!</h3>
          <p className="text-sm">Heyzine Link: <a href={result.heyzineLink} target="_blank" rel="noreferrer" className="underline">{result.heyzineLink}</a></p>
        </div>
      )}

      <form onSubmit={handleCreate} className="space-y-5">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
          <div>
            <label className="block text-sm font-bold text-slate-700 mb-1">Сэтгүүлийн гарчиг</label>
            <input required type="text" value={title} onChange={e => setTitle(e.target.value)} className="w-full px-4 py-2 rounded-lg border border-slate-200 focus:ring-2 focus:ring-[#0F172A]" />
          </div>
          <div>
            <label className="block text-sm font-bold text-slate-700 mb-1">Дугаар (Issue)</label>
            <input required type="text" value={issueNumber} onChange={e => setIssueNumber(e.target.value)} className="w-full px-4 py-2 rounded-lg border border-slate-200 focus:ring-2 focus:ring-[#0F172A]" />
          </div>
        </div>
        <div>
          <label className="block text-sm font-bold text-slate-700 mb-1">Ангилал</label>
          <select required value={category} onChange={e => setCategory(e.target.value)} className="w-full px-4 py-2 rounded-lg border border-slate-200 focus:ring-2 focus:ring-[#0F172A] bg-white">
            <option value="magazine">Барилга МН Сэтгүүл</option>
            <option value="book">Ном, товхимол</option>
            <option value="norm">Норм дүрэм /БНбД/</option>
            <option value="standard">Стандарт</option>
            <option value="research">Судалгаа</option>
            <option value="blueprint">Зураг төсөл</option>
          </select>
        </div>
        <div>
          <label className="block text-sm font-bold text-slate-700 mb-1">Тайлбар</label>
          <textarea value={description} onChange={e => setDescription(e.target.value)} placeholder="Заавал биш" className="w-full px-4 py-2 rounded-lg border border-slate-200 focus:ring-2 focus:ring-[#0F172A]" rows={3}></textarea>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
          <div>
            <label className="block text-sm font-bold text-slate-700 mb-1">Цахим үнэ (₮)</label>
            <input type="number" value={priceDigital} onChange={e => setPriceDigital(Number(e.target.value))} className="w-full px-4 py-2 rounded-lg border border-slate-200 focus:ring-2 focus:ring-[#0F172A]" />
          </div>
          <div>
            <label className="block text-sm font-bold text-slate-700 mb-1">Хэвлэмэл үнэ (₮)</label>
            <input type="number" value={pricePrint} onChange={e => setPricePrint(Number(e.target.value))} className="w-full px-4 py-2 rounded-lg border border-slate-200 focus:ring-2 focus:ring-[#0F172A]" />
          </div>
        </div>
        <div className="border-t border-slate-100 pt-5 mt-5">
          <h3 className="font-bold text-[#0F172A] mb-4 flex items-center"><LinkIcon className="h-4 w-4 mr-2" /> Файл болон Зураг</h3>
          <div className="space-y-4">
            {importMethod === 'pdf' ? (
              <div>
                <label className="block text-sm font-bold text-slate-700 mb-1">PDF Файлын линк (Шууд татагдах URL)</label>
                <input required={importMethod === 'pdf'} type="url" value={pdfUrl} onChange={e => setPdfUrl(e.target.value)} className="w-full px-4 py-2 rounded-lg border border-slate-200 focus:ring-2 focus:ring-[#0F172A]" />
              </div>
            ) : (
              <div>
                <label className="block text-sm font-bold text-slate-700 mb-1">Heyzine Линк (Flipbook URL)</label>
                <input required={importMethod === 'heyzine'} type="url" value={heyzineLinkInput} onChange={e => setHeyzineLinkInput(e.target.value)} placeholder="https://heyzine.com/flip-book/….html" className="w-full px-4 py-2 rounded-lg border border-slate-200 focus:ring-2 focus:ring-[#0F172A]" />
                <p className="text-xs mt-1.5 text-slate-500">
                  {lookupState === 'loading' && 'Heyzine-ээс хавтас, гарчгийг татаж байна…'}
                  {lookupState === 'found' && '✓ Хавтас, гарчгийг Heyzine-ээс авлаа.'}
                  {lookupState === 'missing' && 'Энэ линкээр Heyzine-ээс мэдээлэл олдсонгүй — хавтасны URL-ийг гараар оруулна уу.'}
                  {lookupState === 'idle' && 'Линкээ буулгахад хавтасны зураг автоматаар орно.'}
                </p>
              </div>
            )}
            <div className="flex gap-4 items-start">
              {coverImage && (
                <img src={coverImage} alt="Хавтас" referrerPolicy="no-referrer" className="w-20 aspect-[3/4] object-cover rounded border border-slate-200 shrink-0" />
              )}
              <div className="flex-1">
                <label className="block text-sm font-bold text-slate-700 mb-1">
                  Хавтасны зураг (URL) <span className="font-normal text-slate-400">— Heyzine-ээс автоматаар</span>
                </label>
                <input type="url" value={coverImage} onChange={e => setCoverImage(e.target.value)} className="w-full px-4 py-2 rounded-lg border border-slate-200 focus:ring-2 focus:ring-[#0F172A]" />
              </div>
            </div>
          </div>
        </div>
        <button type="submit" disabled={loading} className="w-full bg-[#0F172A] text-white hover:bg-slate-800 py-3 rounded-xl font-bold transition-colors disabled:opacity-70 shadow-sm mt-4">
          {loading ? 'Уншиж байна...' : importMethod === 'pdf' ? 'Шинээр үүсгэх' : 'Сэтгүүл нэмэх'}
        </button>
      </form>
    </div>
  );
}


// ==========================================
// 4. MAGAZINES LIST & EDIT
// ==========================================

function AdminMagazines({ onAdd }: { onAdd: () => void }) {
  const [magazines, setMagazines] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [editingId, setEditingId] = useState<string | null>(null);
  
  // Edit Form State
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [issueNumber, setIssueNumber] = useState('');
  const [category, setCategory] = useState('magazine');
  const [coverImage, setCoverImage] = useState('');
  const [priceDigital, setPriceDigital] = useState(5000);
  const [pricePrint, setPricePrint] = useState(15000);
  const [heyzineLink, setHeyzineLink] = useState('');
  const [pdfUrl, setPdfUrl] = useState('');
  
  useEffect(() => {
    fetchMagazines();
  }, []);

  const fetchMagazines = async () => {
    setLoading(true);
    try {
      setMagazines(await listAllMagazines());
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const handleEditClick = (mag: any) => {
    setEditingId(mag.id);
    setTitle(mag.title || '');
    setDescription(mag.description || '');
    setIssueNumber(mag.issueNumber || '');
    setCategory(mag.category || 'magazine');
    setCoverImage(mag.coverImage || '');
    setPriceDigital(mag.priceDigital || 0);
    setPricePrint(mag.pricePrint || 0);
    setHeyzineLink(mag.heyzineLink || '');
    setPdfUrl(mag.pdfUrl || '');
  };

  const handleCancelEdit = () => {
    setEditingId(null);
  };

  const handleUpdate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingId) return;
    
    try {
      await updateMagazine(editingId, {
        title, description, issueNumber, category, coverImage,
        priceDigital, pricePrint, heyzineLink, pdfUrl
      });
      alert('Амжилттай шинэчиллээ');
      setEditingId(null);
      fetchMagazines();
    } catch (err) {
      console.error(err);
      alert('Алдаа гарлаа');
    }
  };

  const handleDelete = async (id: string) => {
    if (window.confirm('Үнэхээр устгах уу? Устгасан өгөгдлийг сэргээх боломжгүй.')) {
      try {
        await deleteMagazine(id);
        fetchMagazines();
      } catch (err) {
        console.error(err);
        alert('Алдаа гарлаа');
      }
    }
  };

  if (loading) return <div className="p-10 text-center">Уншиж байна...</div>;

  return (
    <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-200">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-6">
        <div>
          <h2 className="text-2xl font-extrabold text-[#0F172A]">Сэтгүүлүүд</h2>
          <p className="text-sm text-slate-500">Админаас гараар нэмсэн хэвлэлүүд</p>
        </div>
        <button
          onClick={onAdd}
          className="inline-flex items-center justify-center gap-2 px-5 py-3 bg-[#0F172A] hover:bg-slate-800 text-white text-sm font-semibold"
        >
          <Plus className="w-4 h-4" /> Сэтгүүл нэмэх
        </button>
      </div>

      {/* Heyzine flipbooks show on the site automatically and aren't rows here */}
      <div className="mb-6 bg-amber-50 border border-amber-200 p-4 text-sm text-slate-700 space-y-1">
        <p>
          <b>Heyzine дээрх хэвлэлүүд</b> (сэтгүүл, ном, норм дүрэм) сайт дээр <b>автоматаар</b> харагдана — энд нэмэх шаардлагагүй.
          Шинэ дугаар гаргахдаа Heyzine-д байршуулахад хангалттай; 5 минутын дотор сайтад гарна.
        </p>
        <p>
          Цахимаар худалдах дугаарын үнийг <b>«Цахим борлуулалт → Үнэ тохируулах»</b>-аас оруулна.
          Энд зөвхөн Heyzine-д байхгүй, гараар нэмэх хэвлэлүүд харагдана.
        </p>
      </div>

      {magazines.length === 0 && (
        <div className="text-center py-12 border border-dashed border-slate-300 space-y-3">
          <p className="text-slate-600">Гараар нэмсэн хэвлэл одоогоор алга.</p>
          <button onClick={onAdd} className="inline-flex items-center gap-2 text-sm font-semibold text-[#0F172A] underline underline-offset-4">
            <Plus className="w-4 h-4" /> Эхний хэвлэлээ нэмэх
          </button>
        </div>
      )}
      
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {magazines.map((mag) => (
          <div key={mag.id} className="border border-slate-200 rounded-xl overflow-hidden flex flex-col group hover:border-slate-300 transition-colors">
            {editingId === mag.id ? (
              <form onSubmit={handleUpdate} className="p-4 space-y-4 bg-slate-50">
                <div className="flex justify-between items-center mb-2">
                  <h3 className="font-bold">Засах</h3>
                  <button type="button" onClick={handleCancelEdit} className="text-slate-500 hover:text-slate-800"><X className="w-5 h-5"/></button>
                </div>
                
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="text-xs font-bold text-slate-700">Гарчиг</label>
                    <input type="text" value={title} onChange={e=>setTitle(e.target.value)} className="w-full px-2 py-1 text-sm border rounded" required />
                  </div>
                  <div>
                    <label className="text-xs font-bold text-slate-700">Дугаар</label>
                    <input type="text" value={issueNumber} onChange={e=>setIssueNumber(e.target.value)} className="w-full px-2 py-1 text-sm border rounded" required />
                  </div>
                </div>
                
                <div>
                  <label className="text-xs font-bold text-slate-700">Ангилал</label>
                  <select value={category} onChange={e=>setCategory(e.target.value)} className="w-full px-2 py-1 text-sm border rounded">
                    <option value="magazine">Барилга МН Сэтгүүл</option>
                    <option value="book">Ном, товхимол</option>
                    <option value="norm">Норм дүрэм /БНбД/</option>
                    <option value="standard">Стандарт</option>
                    <option value="research">Судалгаа</option>
                    <option value="blueprint">Зураг төсөл</option>
                  </select>
                </div>
                
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="text-xs font-bold text-slate-700">Heyzine Link</label>
                    <input type="url" value={heyzineLink} onChange={e=>setHeyzineLink(e.target.value)} className="w-full px-2 py-1 text-sm border rounded" />
                  </div>
                  <div>
                    <label className="text-xs font-bold text-slate-700">PDF URL</label>
                    <input type="url" value={pdfUrl} onChange={e=>setPdfUrl(e.target.value)} className="w-full px-2 py-1 text-sm border rounded" />
                  </div>
                </div>

                <div>
                  <label className="text-xs font-bold text-slate-700">Зураг (URL)</label>
                  <input type="url" value={coverImage} onChange={e=>setCoverImage(e.target.value)} className="w-full px-2 py-1 text-sm border rounded" />
                  {heyzineLink && (
                    <button
                      type="button"
                      onClick={async () => {
                        const found = await lookupHeyzineLink(heyzineLink).catch(() => null);
                        if (found?.coverImage) setCoverImage(found.coverImage);
                        else alert('Heyzine-ээс хавтас олдсонгүй.');
                      }}
                      className="mt-1 text-xs font-semibold text-[#0F172A] underline underline-offset-2"
                    >
                      Heyzine-ээс хавтас авах
                    </button>
                  )}
                </div>
                
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="text-xs font-bold text-slate-700">Цахим үнэ</label>
                    <input type="number" value={priceDigital} onChange={e=>setPriceDigital(Number(e.target.value))} className="w-full px-2 py-1 text-sm border rounded" />
                  </div>
                  <div>
                    <label className="text-xs font-bold text-slate-700">Хэвлэмэл үнэ</label>
                    <input type="number" value={pricePrint} onChange={e=>setPricePrint(Number(e.target.value))} className="w-full px-2 py-1 text-sm border rounded" />
                  </div>
                </div>
                
                <button type="submit" className="w-full bg-[#0F172A] text-white py-2 rounded font-bold text-sm">Хадгалах</button>
              </form>
            ) : (
              <>
                <div className="flex gap-4 p-4">
                  <img src={mag.coverImage} alt={mag.title} className="w-20 h-auto object-cover rounded border border-slate-100 shadow-sm" />
                  <div className="flex-1">
                    <h3 className="font-bold text-[#0F172A] leading-tight mb-1">{mag.title}</h3>
                    <p className="text-sm text-slate-500 mb-2">{mag.issueNumber}</p>
                    <span className="inline-block px-2 py-1 bg-slate-100 text-xs font-bold text-slate-600 rounded">
                      {mag.category === 'magazine' ? 'Сэтгүүл' : mag.category === 'book' ? 'Ном' : mag.category}
                    </span>
                    {mag.category === 'magazine' && (
                      <div>
                        <NotifyIssueButton issueId={mag.id} title={mag.issueNumber ? `${mag.title} №${mag.issueNumber}` : mag.title} />
                      </div>
                    )}
                  </div>
                </div>
                <div className="mt-auto border-t border-slate-100 bg-slate-50 flex">
                  <button onClick={() => handleEditClick(mag)} className="flex-1 py-3 text-sm font-bold text-slate-600 hover:text-[#0F172A] hover:bg-slate-100 flex items-center justify-center transition-colors">
                    <Edit className="w-4 h-4 mr-2" /> Засах
                  </button>
                  <div className="w-px bg-slate-200"></div>
                  <button onClick={() => handleDelete(mag.id)} className="flex-1 py-3 text-sm font-bold text-red-500 hover:text-red-700 hover:bg-red-50 flex items-center justify-center transition-colors">
                    <Trash2 className="w-4 h-4 mr-2" /> Устгах
                  </button>
                </div>
              </>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}
