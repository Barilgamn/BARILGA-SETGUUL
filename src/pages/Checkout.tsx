import { useState, useEffect } from 'react';
import { useParams, useNavigate, useLocation } from 'react-router-dom';
import { MOCK_MAGAZINES } from '../lib/data';
import { useAuth } from '../contexts/AuthContext';
import { doc, setDoc, getDoc } from 'firebase/firestore';
import { db } from '../lib/firebase';
import { Order } from '../types';
import { MapPin, CreditCard, ShieldCheck, ShoppingBag } from 'lucide-react';

export function Checkout() {
  const { id } = useParams<{ id: string }>();
  const location = useLocation();
  const navigate = useNavigate();
  const { user } = useAuth();
  
  const searchParams = new URLSearchParams(location.search);
  const format = searchParams.get('format') as 'digital' | 'print' | 'both' || 'digital';
  
  const [magazine, setMagazine] = useState<any>(MOCK_MAGAZINES.find(m => m.id === id) || null);
  const [loadingMag, setLoadingMag] = useState(!magazine);

  useEffect(() => {
    if (!magazine && id) {
      const fetchMag = async () => {
        try {
          const docRef = doc(db, 'magazines', id);
          const snap = await getDoc(docRef);
          if (snap.exists()) {
            setMagazine({ id: snap.id, ...snap.data() });
          }
        } catch (e) {
          console.error(e);
        } finally {
          setLoadingMag(false);
        }
      };
      fetchMag();
    }
  }, [id, magazine]);

  const [address, setAddress] = useState({
    city: 'Улаанбаатар',
    district: '',
    addressLine: '',
    phone: user?.phoneNumber || ''
  });
  
  const [loading, setLoading] = useState(false);
  
  if (loadingMag) {
    return <div className="text-center py-20 text-slate-500">Уншиж байна...</div>;
  }

  if (!magazine) {
    return <div className="text-center py-20">Сэтгүүл олдсонгүй</div>;
  }
  
  const getPrice = () => {
    if (format === 'digital') return magazine.priceDigital;
    if (format === 'print') return magazine.pricePrint;
    return magazine.priceDigital + magazine.pricePrint;
  };
  
  const needsShipping = format === 'print' || format === 'both';

  const handlePayment = async () => {
    if (needsShipping && (!address.district || !address.addressLine)) {
      alert('Хүргэлтийн хаягаа бүрэн оруулна уу');
      return;
    }
    
    setLoading(true);
    
    try {
      // Create order in Firestore
      const orderId = `ord-${Date.now()}`;
      const newOrder: Order = {
        id: orderId,
        userId: user.uid,
        magazineId: magazine.id,
        format,
        totalPrice: getPrice(),
        paymentStatus: 'paid', // Simulating successful payment
        deliveryStatus: needsShipping ? 'pending' : 'delivered',
        createdAt: Date.now(),
        phoneNumber: address.phone || user.phoneNumber || '',
        ...(needsShipping ? { shippingAddress: address } : {})
      };
      
      await setDoc(doc(db, 'orders', orderId), newOrder);
      
      // Navigate to profile
      navigate('/profile');
    } catch (err) {
      console.error(err);
      alert('Захиалга үүсгэхэд алдаа гарлаа');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="max-w-4xl mx-auto">
      <h1 className="text-3xl font-extrabold text-[#0F172A] mb-8 tracking-tight">Захиалга баталгаажуулах</h1>
      
      <div className="flex flex-col lg:flex-row gap-8">
        <div className="lg:w-2/3 space-y-6">
          
          {/* Order Summary */}
          <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-100">
            <h2 className="text-xl font-bold text-[#0F172A] mb-4 flex items-center">
              <ShoppingBag className="h-5 w-5 mr-2 text-[#F59E0B]" />
              Захиалгын мэдээлэл
            </h2>
            
            <div className="flex gap-4 items-center">
              <img src={magazine.coverImage} alt={magazine.title} className="w-20 h-auto rounded shadow-sm" />
              <div>
                <h3 className="font-bold text-[#0F172A]">{magazine.title}</h3>
                <p className="text-sm text-slate-500">{magazine.issueNumber}</p>
                <div className="mt-2 text-xs font-bold bg-slate-100 text-[#0F172A] px-2 py-1 rounded inline-block">
                  {format === 'digital' ? 'Цахим' : format === 'print' ? 'Хэвлэмэл' : 'Цахим + Хэвлэмэл'}
                </div>
              </div>
            </div>
          </div>

          {/* Shipping Address */}
          {needsShipping && (
            <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-100">
              <h2 className="text-xl font-bold text-[#0F172A] mb-4 flex items-center">
                <MapPin className="h-5 w-5 mr-2 text-[#F59E0B]" />
                Хүргэлтийн хаяг
              </h2>
              
              <div className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-bold text-slate-700 mb-1">Хот/Аймаг</label>
                    <select 
                      value={address.city}
                      onChange={(e) => setAddress({...address, city: e.target.value})}
                      className="w-full px-4 py-2 rounded-lg border border-slate-200 focus:ring-2 focus:ring-[#0F172A] focus:border-[#0F172A]"
                    >
                      <option value="Улаанбаатар">Улаанбаатар</option>
                      <option value="Орон нутаг">Орон нутаг</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-sm font-bold text-slate-700 mb-1">Дүүрэг/Сум</label>
                    <input 
                      type="text"
                      value={address.district}
                      onChange={(e) => setAddress({...address, district: e.target.value})}
                      placeholder="Жнь: СБД, 1-р хороо"
                      className="w-full px-4 py-2 rounded-lg border border-slate-200 focus:ring-2 focus:ring-[#0F172A] focus:border-[#0F172A]"
                    />
                  </div>
                </div>
                <div>
                  <label className="block text-sm font-bold text-slate-700 mb-1">Дэлгэрэнгүй хаяг</label>
                  <textarea 
                    value={address.addressLine}
                    onChange={(e) => setAddress({...address, addressLine: e.target.value})}
                    placeholder="Байр, орц, давхар, тоот"
                    rows={2}
                    className="w-full px-4 py-2 rounded-lg border border-slate-200 focus:ring-2 focus:ring-[#0F172A] focus:border-[#0F172A]"
                  />
                </div>
                <div>
                  <label className="block text-sm font-bold text-slate-700 mb-1">Холбогдох дугаар</label>
                  <input 
                    type="tel"
                    value={address.phone}
                    onChange={(e) => setAddress({...address, phone: e.target.value})}
                    className="w-full px-4 py-2 rounded-lg border border-slate-200 focus:ring-2 focus:ring-[#0F172A] focus:border-[#0F172A]"
                  />
                </div>
              </div>
            </div>
          )}
          
          {/* Payment Method */}
          <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-100">
            <h2 className="text-xl font-bold text-[#0F172A] mb-4 flex items-center">
              <CreditCard className="h-5 w-5 mr-2 text-[#F59E0B]" />
              Төлбөр төлөх
            </h2>
            
            <div className="border border-orange-100 bg-orange-50 p-4 rounded-xl flex items-start">
              <ShieldCheck className="h-6 w-6 text-orange-600 mt-0.5 mr-3 flex-shrink-0" />
              <div>
                <p className="font-bold text-orange-900">QPay эсвэл Банкны апп</p>
                <p className="text-sm text-orange-800 mt-1">
                  Энэхүү демо хувилбар тул шууд захиалах товчийг дарж гүйлгээг амжилттай болсон гэж үзнэ.
                </p>
              </div>
            </div>
          </div>
          
        </div>
        
        {/* Total Summary */}
        <div className="lg:w-1/3">
          <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-100 sticky top-24">
            <h3 className="text-lg font-bold text-[#0F172A] mb-4 border-b border-slate-100 pb-4">Төлбөрийн мэдээлэл</h3>
            
            <div className="space-y-3 mb-6">
              <div className="flex justify-between text-slate-600 text-sm">
                <span>Сэтгүүлийн үнэ</span>
                <span className="font-bold text-[#0F172A]">{getPrice().toLocaleString()} ₮</span>
              </div>
              {needsShipping && (
                <div className="flex justify-between text-slate-600 text-sm">
                  <span>Хүргэлт</span>
                  <span className="font-bold text-green-600">Үнэгүй</span>
                </div>
              )}
            </div>
            
            <div className="border-t border-slate-100 pt-4 mb-6">
              <div className="flex justify-between items-center">
                <span className="font-bold text-[#0F172A]">Нийт дүн</span>
                <span className="text-2xl font-extrabold text-[#0F172A]">{getPrice().toLocaleString()} ₮</span>
              </div>
            </div>
            
            <button
              onClick={handlePayment}
              disabled={loading}
              className="w-full bg-[#0F172A] text-white hover:bg-slate-800 py-4 rounded-xl font-bold text-sm transition-colors disabled:opacity-70 flex justify-center items-center shadow-sm"
            >
              {loading ? 'Уншиж байна...' : 'Төлбөр төлөх'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
