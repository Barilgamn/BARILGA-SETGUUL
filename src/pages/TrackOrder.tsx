import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { db } from '../lib/firebase';
import { collection, query, where, getDocs } from 'firebase/firestore';
import { Order } from '../types';
import { MOCK_MAGAZINES } from '../lib/data';
import { Search, Package, Calendar, ExternalLink } from 'lucide-react';
import { format as formatDate } from 'date-fns';

export function TrackOrder() {
  const [phoneNumber, setPhoneNumber] = useState('+976');
  const [orders, setOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(false);
  const [searched, setSearched] = useState(false);
  const [error, setError] = useState('');

  const handleSearch = async (e: React.FormEvent) => {
    e.preventDefault();
    
    const formattedPhone = phoneNumber.trim();
    if (formattedPhone.length < 12) {
      setError('Утасны дугаараа зөв оруулна уу (+976...)');
      return;
    }

    setLoading(true);
    setError('');
    setSearched(true);
    setOrders([]);

    try {
      // First try to find orders by the phone number directly on the order document
      const ordersQ = query(
        collection(db, 'orders'),
        where('phoneNumber', '==', formattedPhone)
      );
      
      const ordersSnap = await getDocs(ordersQ);
      let ordersData = ordersSnap.docs.map(doc => doc.data() as Order);
      
      // Fallback: Check if the user exists and find their older orders
      if (ordersData.length === 0) {
        const userQ = query(collection(db, 'users'), where('phoneNumber', '==', formattedPhone));
        const userSnap = await getDocs(userQ);

        if (!userSnap.empty) {
          const uids = userSnap.docs.map(doc => doc.id);
          
          // Get orders by userId (limited to 10 clauses in 'in' query usually, but assuming 1 uid here)
          const fallbackOrdersQ = query(
            collection(db, 'orders'),
            where('userId', 'in', uids.slice(0, 10))
          );
          
          const fallbackSnap = await getDocs(fallbackOrdersQ);
          ordersData = fallbackSnap.docs.map(doc => doc.data() as Order);
        }
      }
      
      // Sort client-side
      ordersData.sort((a, b) => b.createdAt - a.createdAt);
      
      setOrders(ordersData);
    } catch (err: any) {
      console.error(err);
      if (err.code === 'permission-denied') {
        setError('Хандалтын тохиргооноос шалтгаалан хайх боломжгүй байна. Та нэвтэрч орно уу.');
      } else {
        setError('Алдаа гарлаа. Дахин оролдоно уу.');
      }
    } finally {
      setLoading(false);
    }
  };

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
    <div className="max-w-3xl mx-auto mt-6">
      <div className="bg-white p-8 sm:p-12 rounded-3xl shadow-sm border border-stone-200/90 mb-8">
        <div className="text-center mb-8">
          <span className="text-xs text-amber-600 font-bold block mb-1">
            Хүргэлтийн хяналт
          </span>
          <h1 className="font-serif text-3xl font-bold text-stone-900 tracking-tight">Захиалга шалгах</h1>
          <p className="text-stone-500 text-xs mt-2 max-w-sm mx-auto font-sans">
            Утасны дугаараа оруулан сэтгүүлийн захиалга болон хүргэлтийн төлвийг шуурхай шалгах боломжтой
          </p>
        </div>

        <form onSubmit={handleSearch} className="flex flex-col sm:flex-row gap-4 max-w-md mx-auto">
          <div className="flex-1">
            <input
              type="tel"
              value={phoneNumber}
              onChange={(e) => setPhoneNumber(e.target.value)}
              className="w-full px-4 py-3 rounded-xl border border-slate-200 focus:ring-2 focus:ring-[#0F172A] focus:border-[#0F172A] transition-colors"
              placeholder="+976 99001234"
              disabled={loading}
            />
          </div>
          <button
            type="submit"
            disabled={loading}
            className="bg-[#0F172A] text-white hover:bg-slate-800 px-6 py-3 rounded-xl font-bold transition-colors disabled:opacity-70 shadow-sm flex justify-center items-center h-[50px] sm:h-auto"
          >
            {loading ? 'Уншиж байна...' : 'Шалгах'}
          </button>
        </form>
        {error && <p className="text-red-500 text-sm font-medium text-center mt-4">{error}</p>}
      </div>

      {searched && !loading && !error && (
        <div className="space-y-4">
          <h2 className="text-lg font-bold text-[#0F172A] mb-4">Хайлтын үр дүн: {orders.length} захиалга олдлоо</h2>
          
          {orders.length === 0 ? (
            <div className="text-center py-12 bg-white rounded-xl border border-slate-100">
              <Package className="h-12 w-12 text-slate-300 mx-auto mb-3" />
              <p className="text-slate-500 font-medium">Энэ дугаар дээр захиалга бүртгэгдээгүй байна.</p>
            </div>
          ) : (
            orders.map(order => {
              const mag = MOCK_MAGAZINES.find(m => m.id === order.magazineId);
              if (!mag) return null;
              
              return (
                <div key={order.id} className="bg-white rounded-xl border border-slate-100 p-4 sm:p-6 shadow-sm flex flex-col sm:flex-row sm:items-center justify-between gap-4 hover:shadow-md transition-shadow">
                  <div className="flex items-center gap-4">
                    <img src={mag.coverImage} alt={mag.title} className="w-16 h-auto rounded shadow-sm" />
                    <div>
                      <h3 className="font-bold text-[#0F172A]">{mag.title}</h3>
                      <div className="flex items-center text-sm text-slate-500 mt-1">
                        <Calendar className="h-4 w-4 mr-1" />
                        {formatDate(new Date(order.createdAt), 'yyyy-MM-dd HH:mm')}
                      </div>
                      <div className="mt-2 text-sm">
                        <span className="font-bold text-slate-700">Төрөл:</span> <span className="font-medium text-[#0F172A]">{order.format === 'digital' ? 'Цахим' : order.format === 'print' ? 'Хэвлэмэл' : 'Цахим + Хэвлэмэл'}</span>
                      </div>
                    </div>
                  </div>
                  
                  <div className="flex flex-col sm:items-end gap-2 border-t sm:border-t-0 pt-4 sm:pt-0 border-slate-100">
                    <div>
                      <span className="text-sm text-slate-500 mr-2 font-medium">Төлөв:</span>
                      {getStatusBadge(order.deliveryStatus)}
                    </div>
                    {order.format !== 'print' && (
                      <Link 
                        to={`/read/${mag.id}`}
                        className="inline-flex items-center text-xs font-bold text-[#F59E0B] hover:text-[#D97706] mt-2 bg-amber-50 px-3 py-1.5 rounded-lg border border-amber-100 transition-colors"
                      >
                        <ExternalLink className="h-3 w-3 mr-1" />
                        Цахимаар унших
                      </Link>
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
