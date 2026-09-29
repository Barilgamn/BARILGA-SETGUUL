import React, { useState, useEffect } from 'react';
import { db } from '../lib/firebase';
import { collection, addDoc, getDocs, query, orderBy, updateDoc, doc } from 'firebase/firestore';
import { BookOpen, Link as LinkIcon, Plus, FileText, Users, ShoppingBag, Search, Filter, Calendar, Edit, Trash2, X } from 'lucide-react';
import { SubscriptionOrder } from '../types';

export function Admin() {
  const [activeTab, setActiveTab] = useState<'orders' | 'add_magazine' | 'manual_sub' | 'magazines'>('orders');

  return (
    <div className="max-w-6xl mx-auto mt-6 px-4">
      <div className="flex flex-col sm:flex-row gap-8">
        
        {/* Sidebar Navigation */}
        <div className="w-full sm:w-64 shrink-0">
          <div className="bg-white rounded-3xl border border-stone-200/90 p-4 sticky top-24 shadow-sm">
            <h2 className="text-xs font-bold text-stone-400 mb-4 px-2">Удирдлага</h2>
            <nav className="space-y-1">
              <button
                onClick={() => setActiveTab('orders')}
                className={`w-full flex items-center px-4 py-3 rounded-xl text-sm font-semibold transition-all ${
                  activeTab === 'orders' ? 'bg-[#0C121E] text-white shadow-sm' : 'text-stone-600 hover:bg-stone-50'
                }`}
              >
                <ShoppingBag className="h-4 w-4 mr-3 text-amber-400" /> Захиалгууд
              </button>
              <button
                onClick={() => setActiveTab('magazines')}
                className={`w-full flex items-center px-4 py-3 rounded-xl text-sm font-semibold transition-all ${
                  activeTab === 'magazines' ? 'bg-[#0C121E] text-white shadow-sm' : 'text-stone-600 hover:bg-stone-50'
                }`}
              >
                <BookOpen className="h-4 w-4 mr-3 text-amber-400" /> Сэтгүүлүүд
              </button>
              <button
                onClick={() => setActiveTab('add_magazine')}
                className={`w-full flex items-center px-4 py-3 rounded-xl text-sm font-semibold transition-all ${
                  activeTab === 'add_magazine' ? 'bg-[#0C121E] text-white shadow-sm' : 'text-stone-600 hover:bg-stone-50'
                }`}
              >
                <Plus className="h-4 w-4 mr-3 text-amber-400" /> Сэтгүүл нэмэх
              </button>
              <button
                onClick={() => setActiveTab('manual_sub')}
                className={`w-full flex items-center px-4 py-3 rounded-xl text-sm font-semibold transition-all ${
                  activeTab === 'manual_sub' ? 'bg-[#0C121E] text-white shadow-sm' : 'text-stone-600 hover:bg-stone-50'
                }`}
              >
                <Users className="h-4 w-4 mr-3 text-amber-400" /> Гараар шивэх
              </button>
            </nav>
          </div>
        </div>

        {/* Main Content Area */}
        <div className="flex-1">
          {activeTab === 'orders' && <AdminOrders />}
          {activeTab === 'magazines' && <AdminMagazines />}
          {activeTab === 'add_magazine' && <AdminAddMagazine />}
          {activeTab === 'manual_sub' && <AdminManualSubscription />}
        </div>
      </div>
    </div>
  );
}

// ==========================================
// 1. ORDERS DASHBOARD
// ==========================================
function AdminOrders() {
  const [orders, setOrders] = useState<SubscriptionOrder[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [filterStatus, setFilterStatus] = useState('all'); // all, pending, delivering, delivered

  useEffect(() => {
    fetchOrders();
  }, []);

  const fetchOrders = async () => {
    setLoading(true);
    try {
      const q = query(collection(db, 'subscription_orders'), orderBy('createdAt', 'desc'));
      const snapshot = await getDocs(q);
      const data = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as SubscriptionOrder));
      setOrders(data);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const updateOrderStatus = async (orderId: string, newStatus: string) => {
    try {
      await updateDoc(doc(db, 'subscription_orders', orderId), {
        deliveryStatus: newStatus
      });
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
      } else {
        matchStatus = o.deliveryStatus === filterStatus;
      }
    }
    
    return matchSearch && matchStatus;
  });


  return (
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
                    </td>
                    <td className="px-4 py-4 text-sm font-medium">
                      {order.plan === 'quarterly' ? 'Улирал' : order.plan === 'half-year' ? 'Хагас жил' : 'Жил'}
                    </td>
                    <td className="px-4 py-4">
                      <span className="font-bold text-[#e11d48] text-sm">{order.price?.toLocaleString()}₮</span>
                      <div className="text-xs text-slate-500">{order.paymentMethod}</div>
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
            <option value="expiring">Хугацаа дуусч буй</option>
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
      await addDoc(collection(db, 'subscription_orders'), manualOrder);
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

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (importMethod === 'pdf' && !pdfUrl) return setError('PDF URL оруулна уу');
    if (importMethod === 'heyzine' && !heyzineLinkInput) return setError('Heyzine линк оруулна уу');
    if (importMethod === 'heyzine' && !coverImage) return setError('Бэлэн линк оруулах үед хавтасны зураг (URL) заавал шаардлагатай');
    
    setLoading(true); setError(''); setResult(null);

    try {
      let finalHeyzineLink = '';
      let finalCoverImage = coverImage;

      if (importMethod === 'pdf') {
        const response = await fetch('/api/magazines/heyzine', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
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
      
      const docRef = await addDoc(collection(db, 'magazines'), newMagazine);
      setResult({ id: docRef.id, ...newMagazine });
      
      setTitle(''); setIssueNumber(''); setDescription(''); setCoverImage(''); setPdfUrl(''); setHeyzineLinkInput('');
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
          <textarea required value={description} onChange={e => setDescription(e.target.value)} className="w-full px-4 py-2 rounded-lg border border-slate-200 focus:ring-2 focus:ring-[#0F172A]" rows={3}></textarea>
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
                <input required={importMethod === 'heyzine'} type="url" value={heyzineLinkInput} onChange={e => setHeyzineLinkInput(e.target.value)} className="w-full px-4 py-2 rounded-lg border border-slate-200 focus:ring-2 focus:ring-[#0F172A]" />
              </div>
            )}
            <div>
              <label className="block text-sm font-bold text-slate-700 mb-1">Хавтасны зураг (URL) {importMethod === 'heyzine' && <span className="text-red-500">*</span>}</label>
              <input required={importMethod === 'heyzine'} type="url" value={coverImage} onChange={e => setCoverImage(e.target.value)} className="w-full px-4 py-2 rounded-lg border border-slate-200 focus:ring-2 focus:ring-[#0F172A]" />
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
import { deleteDoc } from 'firebase/firestore';

function AdminMagazines() {
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
      const q = query(collection(db, 'magazines'), orderBy('createdAt', 'desc'));
      const snapshot = await getDocs(q);
      const data = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
      setMagazines(data);
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
      await updateDoc(doc(db, 'magazines', editingId), {
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
        await deleteDoc(doc(db, 'magazines', id));
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
      <h2 className="text-2xl font-extrabold text-[#0F172A] mb-6">Сэтгүүлүүд</h2>
      
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
                  <input type="url" value={coverImage} onChange={e=>setCoverImage(e.target.value)} className="w-full px-2 py-1 text-sm border rounded" required />
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
