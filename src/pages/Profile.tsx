import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { listMagazines, listMyOrders, listMySubscriptions } from '../lib/records';
import { Order } from '../types';
import { MOCK_MAGAZINES } from '../lib/data';
import { BookOpen, Package, User, LogOut, ExternalLink, Calendar } from 'lucide-react';
import { format } from 'date-fns';
import { MyIssues } from '../components/MyIssues';

export function Profile() {
  const { user, profile, signOut } = useAuth();
  const [orders, setOrders] = useState<Order[]>([]);
  const [subscriptions, setSubscriptions] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [magazines, setMagazines] = useState<Map<string, any>>(new Map());
  const [activeTab, setActiveTab] = useState<'digital' | 'orders'>('digital');

  useEffect(() => {
    async function fetchOrders() {
      if (!user) return;
      try {
        const [ordersData, subsData, mags] = await Promise.all([
          listMyOrders(user.id),
          listMySubscriptions(user.id),
          listMagazines().catch(() => []),
        ]);
        setOrders(ordersData);
        setSubscriptions(subsData);
        setMagazines(new Map([...MOCK_MAGAZINES, ...mags].map(m => [m.id, m])));
      } catch (err) {
        console.error('Error fetching orders:', err);
      } finally {
        setLoading(false);
      }
    }
    fetchOrders();
  }, [user]);

  if (!user || !profile) {
    return <div className="text-center py-20">Нэвтэрч орно уу</div>;
  }

  // Only paid digital orders can be read
  const digitalOrders = orders.filter(o => (o.format === 'digital' || o.format === 'both') && o.paymentStatus === 'paid');
  const physicalOrders = orders.filter(o => o.format === 'print' || o.format === 'both');

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'pending': return <span className="bg-yellow-100 text-yellow-800 px-2 py-1 rounded text-xs font-bold">Хүлээгдэж буй</span>;
      case 'processing': return <span className="bg-blue-100 text-blue-800 px-2 py-1 rounded text-xs font-bold">Бэлтгэгдэж буй</span>;
      case 'shipped': return <span className="bg-purple-100 text-purple-800 px-2 py-1 rounded text-xs font-bold">Хүргэлтэнд гарсан</span>;
      case 'delivered': return <span className="bg-green-100 text-green-800 px-2 py-1 rounded text-xs font-bold">Хүргэгдсэн</span>;
      default: return null;
    }
  };

  return (
    <div className="max-w-5xl mx-auto space-y-8">
      {/* Profile Header */}
      <div className="bg-white rounded-3xl shadow-sm border border-stone-200/90 p-6 md:p-8 flex flex-col md:flex-row items-center justify-between">
        <div className="flex items-center mb-4 md:mb-0">
          <div className="h-14 w-14 bg-[#0C121E] text-white rounded-2xl flex items-center justify-center mr-4 shadow-sm">
            <User className="h-7 w-7 text-amber-400" />
          </div>
          <div>
            <span className="text-xs text-stone-400 font-bold block">
              Хэрэглэгчийн хуудас
            </span>
            <h1 className="font-serif text-2xl font-bold text-stone-900 tracking-tight">Миний цахим сан</h1>
            <p className="text-stone-500 text-xs font-mono">{profile.phoneNumber}</p>
          </div>
        </div>
        
        <button
          onClick={signOut}
          className="flex items-center text-stone-600 hover:text-red-700 hover:bg-stone-50 px-4 py-2 rounded-xl text-xs font-semibold transition-colors border border-stone-200"
        >
          <LogOut className="h-4 w-4 mr-2" />
          Системээс гарах
        </button>
      </div>

      
      <MyIssues uid={user.id} />

      {/* Сэтгүүлийн захиалгууд */}
      {subscriptions.length > 0 && (
        <section className="mb-8">
          <h2 className="text-xl font-bold text-[#0F172A] mb-4">Сэтгүүлийн захиалгууд (Багц)</h2>
          <div className="grid sm:grid-cols-2 gap-4">
            {subscriptions.map(sub => (
              <div key={sub.id} className="bg-white rounded-xl border border-slate-200 p-5 flex flex-col justify-between shadow-sm">
                <div>
                  <div className="flex justify-between items-start mb-3">
                    <span className="bg-[#F59E0B] text-white text-xs font-bold px-2 py-1 rounded">
                      {sub.plan === 'quarterly' ? 'Улирал' : sub.plan === 'half-year' ? 'Хагас жил' : 'Жил'}
                    </span>
                    <span className="text-slate-500 text-sm">{new Date(sub.createdAt).toLocaleDateString()}</span>
                  </div>
                  <h3 className="font-extrabold text-[#0F172A] text-lg mb-1">{sub.price.toLocaleString()}₮</h3>
                  <div className="text-sm text-slate-600 mb-2">
                    <span className="font-medium">Хүргэлтийн төлөв:</span> 
                    {sub.deliveryStatus === 'pending' ? ' Хүлээгдэж буй' : sub.deliveryStatus === 'delivering' ? ' Хүргэлтэнд' : ' Хүргэгдсэн'}
                  </div>
                  {sub.digitalCode && (
                    <div className="text-sm text-slate-600 bg-slate-50 p-2 rounded border border-slate-100 mt-2">
                      <span className="font-medium">Цахим код:</span> <span className="font-bold text-[#0F172A] ml-1">{sub.digitalCode}</span>
                    </div>
                  )}
                </div>
              </div>
            ))}
          </div>
        </section>
      )}

      {/* Tabs */}
      <div className="flex border-b border-slate-200 mb-8 overflow-x-auto hide-scrollbar">
        <button
          onClick={() => setActiveTab('digital')}
          className={`flex items-center px-6 py-4 border-b-2 font-bold whitespace-nowrap transition-colors ${
            activeTab === 'digital' 
              ? 'border-[#0F172A] text-[#0F172A]' 
              : 'border-transparent text-slate-500 hover:text-[#0F172A]'
          }`}
        >
          <BookOpen className="h-5 w-5 mr-2" />
          Цахим номын сан ({digitalOrders.length})
        </button>
        <button
          onClick={() => setActiveTab('orders')}
          className={`flex items-center px-6 py-4 border-b-2 font-bold whitespace-nowrap transition-colors ${
            activeTab === 'orders' 
              ? 'border-[#0F172A] text-[#0F172A]' 
              : 'border-transparent text-slate-500 hover:text-[#0F172A]'
          }`}
        >
          <Package className="h-5 w-5 mr-2" />
          Захиалга & Хүргэлт ({physicalOrders.length})
        </button>
      </div>

      {/* Content */}
      {loading ? (
        <div className="text-center py-12 text-slate-500">Уншиж байна...</div>
      ) : activeTab === 'digital' ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-6">
          {digitalOrders.length === 0 ? (
            <div className="col-span-full text-center py-12 bg-white rounded-xl border border-slate-100">
              <BookOpen className="h-12 w-12 text-slate-300 mx-auto mb-3" />
              <p className="text-slate-500 font-medium">Цахим сэтгүүл алга байна.</p>
            </div>
          ) : (
            digitalOrders.map(order => {
              const mag = magazines.get(order.magazineId) || { id: order.magazineId, title: (order as any).magazineTitle, coverImage: '', issueNumber: '' };
              
              return (
                <div key={order.id} className="bg-white rounded-xl border border-slate-100 overflow-hidden shadow-sm flex flex-col group">
                  <div className="aspect-[3/4] relative bg-slate-100 p-6 flex justify-center items-center">
                    <div className="absolute inset-0 bg-gradient-to-t from-black/20 to-transparent z-10 pointer-events-none"></div>
                    <img src={mag.coverImage} alt={mag.title} className="w-full h-full object-cover rounded shadow-lg relative z-20" />
                  </div>
                  <div className="p-4 flex flex-col flex-1 border-t border-slate-100">
                    <h3 className="font-bold text-[#0F172A] mb-1">{mag.title}</h3>
                    <p className="text-sm text-slate-500 mb-4">{mag.issueNumber}</p>
                    
                    <Link 
                      to={`/read/${mag.id}`}
                      className="mt-auto flex items-center justify-center bg-slate-50 text-[#0F172A] border border-slate-200 hover:bg-[#0F172A] hover:text-white hover:border-transparent px-4 py-2 rounded-lg font-bold text-sm transition-colors"
                    >
                      <BookOpen className="h-4 w-4 mr-2" />
                      Унших
                    </Link>
                  </div>
                </div>
              );
            })
          )}
        </div>
      ) : (
        <div className="space-y-4">
          {physicalOrders.length === 0 ? (
            <div className="text-center py-12 bg-white rounded-xl border border-slate-100">
              <Package className="h-12 w-12 text-slate-300 mx-auto mb-3" />
              <p className="text-slate-500 font-medium">Захиалга алга байна.</p>
            </div>
          ) : (
            physicalOrders.map(order => {
              const mag = magazines.get(order.magazineId) || { id: order.magazineId, title: (order as any).magazineTitle, coverImage: '', issueNumber: '' };
              
              return (
                <div key={order.id} className="bg-white rounded-xl border border-slate-100 p-4 sm:p-6 shadow-sm flex flex-col sm:flex-row sm:items-center justify-between gap-4 hover:shadow-md transition-shadow">
                  <div className="flex items-center gap-4">
                    <img src={mag.coverImage} alt={mag.title} className="w-16 h-auto rounded shadow-sm" />
                    <div>
                      <h3 className="font-bold text-[#0F172A]">{mag.title}</h3>
                      <div className="flex items-center text-sm text-slate-500 mt-1">
                        <Calendar className="h-4 w-4 mr-1" />
                        {format(new Date(order.createdAt), 'yyyy-MM-dd HH:mm')}
                      </div>
                      <div className="mt-2 text-sm">
                        <span className="font-bold text-slate-700">Төлбөр:</span> <span className="font-bold text-[#0F172A]">{order.totalPrice.toLocaleString()} ₮</span>
                      </div>
                    </div>
                  </div>
                  
                  <div className="flex flex-col sm:items-end gap-2 border-t sm:border-t-0 pt-4 sm:pt-0 border-slate-100">
                    <div>
                      <span className="text-sm text-slate-500 mr-2 font-medium">Төлөв:</span>
                      {getStatusBadge(order.deliveryStatus)}
                    </div>
                    {order.shippingAddress && (
                      <div className="text-sm text-slate-600 text-left sm:text-right bg-slate-50 border border-slate-100 px-3 py-2 rounded-lg mt-2 max-w-xs">
                        <strong className="text-slate-700">Хаяг:</strong> {order.shippingAddress.city}, {order.shippingAddress.district}, {order.shippingAddress.addressLine}
                      </div>
                    )}
                  </div>
                </div>
              );
            })
          )}
        </div>
      )}
    </div>
  );
}
