import React, { useState, useEffect } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { db } from '../lib/firebase';
import { collection, addDoc } from 'firebase/firestore';
import { BookOpen, MapPin, CreditCard, CheckCircle, ChevronRight, Loader2 } from 'lucide-react';

const PLANS = {
  'quarterly': { name: 'Улирлын захиалга (3 дугаар)', price: 41000 },
  'half-year': { name: 'Хагас жилийн (6 дугаар)', price: 76000 },
  'yearly': { name: 'Жилийн захиалга (12 дугаар)', price: 149000 },
};

export function Subscribe() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const planParam = searchParams.get('plan') as keyof typeof PLANS || 'yearly';
  
  const [step, setStep] = useState(1);
  const [loading, setLoading] = useState(false);
  const [orderId, setOrderId] = useState('');
  
  const [formData, setFormData] = useState({
    plan: planParam,
    fullName: user?.displayName || '',
    phone: user?.phoneNumber || '',
    email: '',
    city: 'Улаанбаатар',
    district: '',
    addressDetail: '',
    ebarimtType: 'personal',
    companyName: '',
    registerNumber: '',
    paymentMethod: 'qpay',
  });

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  const handleNext = () => {
    if (step === 1) {
      if (!formData.fullName || !formData.phone || !formData.district || !formData.addressDetail) {
        alert('Бүх талбарыг бөглөнө үү');
        return;
      }
      if (formData.ebarimtType === 'company' && (!formData.companyName || !formData.registerNumber)) {
        alert('Байгууллагын мэдээллийг бүрэн бөглөнө үү');
        return;
      }
    }
    setStep(step + 1);
  };

  const handleSubmit = async () => {
    if (!user) {
      navigate('/login?redirect=/subscribe');
      return;
    }
    
    setLoading(true);
    try {
      const newOrder = {
        userId: user.uid,
        ...formData,
        price: PLANS[formData.plan as keyof typeof PLANS].price,
        paymentStatus: 'pending', // would be updated by webhook in real app
        deliveryStatus: 'pending',
        createdAt: Date.now(),
        endDate: Date.now() + (formData.plan === 'yearly' ? 31536000000 : formData.plan === 'half-year' ? 15768000000 : 7884000000),
      };
      
      const docRef = await addDoc(collection(db, 'subscription_orders'), newOrder);
      setOrderId(docRef.id);
      
      // Simulate payment processing
      setTimeout(() => {
        setStep(3); // Success screen
        setLoading(false);
      }, 2000);
      
    } catch (err) {
      console.error(err);
      alert('Алдаа гарлаа. Та дахин оролдоно уу.');
      setLoading(false);
    }
  };

  if (!PLANS[formData.plan as keyof typeof PLANS]) {
    return <div className="text-center py-20">Сонгосон багц олдсонгүй</div>;
  }

  return (
    <div className="max-w-4xl mx-auto space-y-8">
      <div className="text-center mb-10">
        <span className="text-xs text-amber-600 font-bold block mb-1">
          Албан ёсны захиалга
        </span>
        <h1 className="font-serif text-3xl sm:text-4xl font-bold text-stone-900 mb-2">Сэтгүүл захиалах</h1>
        <p className="text-stone-500 text-sm">Барилгын салбарын тэргүүлэх мэдээлэл, үнэ ханшийн судалгааг цаг алдалгүй аваарай</p>
      </div>

      {/* Stepper */}
      <div className="flex items-center justify-center mb-12">
        <div className={`flex items-center ${step >= 1 ? 'text-[#F59E0B]' : 'text-slate-400'}`}>
          <div className={`h-10 w-10 rounded-full flex items-center justify-center font-bold border-2 ${step >= 1 ? 'border-[#F59E0B] bg-amber-50' : 'border-slate-300'}`}>1</div>
          <span className="ml-3 font-bold hidden sm:inline">Хүргэлтийн мэдээлэл</span>
        </div>
        <div className="w-16 sm:w-24 h-1 mx-4 bg-slate-200">
          <div className={`h-full ${step >= 2 ? 'bg-[#F59E0B]' : 'bg-transparent'} transition-all`}></div>
        </div>
        <div className={`flex items-center ${step >= 2 ? 'text-[#F59E0B]' : 'text-slate-400'}`}>
          <div className={`h-10 w-10 rounded-full flex items-center justify-center font-bold border-2 ${step >= 2 ? 'border-[#F59E0B] bg-amber-50' : 'border-slate-300'}`}>2</div>
          <span className="ml-3 font-bold hidden sm:inline">Төлбөр төлөх</span>
        </div>
        <div className="w-16 sm:w-24 h-1 mx-4 bg-slate-200">
          <div className={`h-full ${step >= 3 ? 'bg-[#F59E0B]' : 'bg-transparent'} transition-all`}></div>
        </div>
        <div className={`flex items-center ${step >= 3 ? 'text-green-500' : 'text-slate-400'}`}>
          <div className={`h-10 w-10 rounded-full flex items-center justify-center font-bold border-2 ${step >= 3 ? 'border-green-500 bg-green-50' : 'border-slate-300'}`}><CheckCircle className="h-5 w-5" /></div>
          <span className="ml-3 font-bold hidden sm:inline">Баталгаажуулах</span>
        </div>
      </div>

      {step === 1 && (
        <div className="grid md:grid-cols-3 gap-8">
          <div className="md:col-span-2 space-y-6">
            <div className="bg-white p-6 sm:p-8 rounded-2xl border border-slate-200 shadow-sm">
              <h2 className="text-xl font-bold text-[#0F172A] mb-6 flex items-center"><BookOpen className="mr-2 h-5 w-5 text-[#F59E0B]"/> Багцын сонголт</h2>
              <div className="grid sm:grid-cols-3 gap-4">
                {Object.entries(PLANS).map(([key, plan]) => (
                  <label key={key} className={`cursor-pointer border-2 rounded-xl p-4 flex flex-col transition-all ${formData.plan === key ? 'border-[#0F172A] bg-slate-50 shadow-sm' : 'border-slate-100 hover:border-slate-300'}`}>
                    <input type="radio" name="plan" value={key} checked={formData.plan === key} onChange={handleChange} className="sr-only" />
                    <span className="font-bold text-[#0F172A] text-sm mb-2">{plan.name}</span>
                    <span className="text-[#e11d48] font-extrabold mt-auto">{plan.price.toLocaleString()}₮</span>
                  </label>
                ))}
              </div>
            </div>

            <div className="bg-white p-6 sm:p-8 rounded-2xl border border-slate-200 shadow-sm">
              <h2 className="text-xl font-bold text-[#0F172A] mb-6 flex items-center"><MapPin className="mr-2 h-5 w-5 text-[#F59E0B]"/> Хүргэлтийн мэдээлэл</h2>
              <div className="grid sm:grid-cols-2 gap-5">
                <div>
                  <label className="block text-sm font-bold text-slate-700 mb-1">Овог, нэр</label>
                  <input type="text" name="fullName" value={formData.fullName} onChange={handleChange} className="w-full px-4 py-2.5 rounded-xl border border-slate-200 focus:ring-2 focus:ring-[#0F172A]" required />
                </div>
                <div>
                  <label className="block text-sm font-bold text-slate-700 mb-1">Холбогдох утас</label>
                  <input type="tel" name="phone" value={formData.phone} onChange={handleChange} className="w-full px-4 py-2.5 rounded-xl border border-slate-200 focus:ring-2 focus:ring-[#0F172A]" required />
                </div>
                <div className="sm:col-span-2">
                  <label className="block text-sm font-bold text-slate-700 mb-1">Имэйл хаяг</label>
                  <input type="email" name="email" value={formData.email} onChange={handleChange} className="w-full px-4 py-2.5 rounded-xl border border-slate-200 focus:ring-2 focus:ring-[#0F172A]" />
                </div>
                <div>
                  <label className="block text-sm font-bold text-slate-700 mb-1">Хот/Аймаг</label>
                  <select name="city" value={formData.city} onChange={handleChange} className="w-full px-4 py-2.5 rounded-xl border border-slate-200 focus:ring-2 focus:ring-[#0F172A]">
                    <option value="Улаанбаатар">Улаанбаатар</option>
                    <option value="Орон нутаг">Орон нутаг</option>
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-bold text-slate-700 mb-1">Дүүрэг/Сум</label>
                  <input type="text" name="district" value={formData.district} onChange={handleChange} className="w-full px-4 py-2.5 rounded-xl border border-slate-200 focus:ring-2 focus:ring-[#0F172A]" required />
                </div>
                <div className="sm:col-span-2">
                  <label className="block text-sm font-bold text-slate-700 mb-1">Дэлгэрэнгүй хаяг (Байр, орц, тоот)</label>
                  <textarea name="addressDetail" value={formData.addressDetail} onChange={handleChange} className="w-full px-4 py-2.5 rounded-xl border border-slate-200 focus:ring-2 focus:ring-[#0F172A]" rows={3} required></textarea>
                </div>
              </div>
            </div>

            <div className="bg-white p-6 sm:p-8 rounded-2xl border border-slate-200 shadow-sm">
              <h2 className="text-xl font-bold text-[#0F172A] mb-6 flex items-center"><CreditCard className="mr-2 h-5 w-5 text-[#F59E0B]"/> И-Баримт</h2>
              <div className="flex gap-6 mb-6">
                <label className="flex items-center cursor-pointer">
                  <input type="radio" name="ebarimtType" value="personal" checked={formData.ebarimtType === 'personal'} onChange={handleChange} className="text-[#0F172A] focus:ring-[#0F172A] h-4 w-4" />
                  <span className="ml-2 font-medium text-slate-700">Хувь хүн</span>
                </label>
                <label className="flex items-center cursor-pointer">
                  <input type="radio" name="ebarimtType" value="company" checked={formData.ebarimtType === 'company'} onChange={handleChange} className="text-[#0F172A] focus:ring-[#0F172A] h-4 w-4" />
                  <span className="ml-2 font-medium text-slate-700">Байгууллага</span>
                </label>
              </div>

              {formData.ebarimtType === 'company' && (
                <div className="grid sm:grid-cols-2 gap-5 p-5 bg-slate-50 rounded-xl border border-slate-200">
                  <div>
                    <label className="block text-sm font-bold text-slate-700 mb-1">Байгууллагын РД</label>
                    <input type="text" name="registerNumber" value={formData.registerNumber} onChange={handleChange} className="w-full px-4 py-2.5 rounded-xl border border-slate-200 focus:ring-2 focus:ring-[#0F172A]" required={formData.ebarimtType === 'company'} />
                  </div>
                  <div>
                    <label className="block text-sm font-bold text-slate-700 mb-1">Байгууллагын нэр</label>
                    <input type="text" name="companyName" value={formData.companyName} onChange={handleChange} className="w-full px-4 py-2.5 rounded-xl border border-slate-200 focus:ring-2 focus:ring-[#0F172A]" required={formData.ebarimtType === 'company'} />
                  </div>
                </div>
              )}
            </div>
          </div>

          <div>
            <div className="bg-slate-50 p-6 rounded-2xl border border-slate-200 sticky top-24">
              <h3 className="font-bold text-lg text-[#0F172A] mb-4">Захиалгын мэдээлэл</h3>
              <div className="space-y-3 mb-6 pb-6 border-b border-slate-200">
                <div className="flex justify-between">
                  <span className="text-slate-500">Сонгосон багц:</span>
                  <span className="font-bold text-[#0F172A]">{PLANS[formData.plan as keyof typeof PLANS].name}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-500">Үнэ:</span>
                  <span className="font-bold text-[#0F172A]">{PLANS[formData.plan as keyof typeof PLANS].price.toLocaleString()}₮</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-500">Хүргэлт:</span>
                  <span className="font-bold text-green-600">Үнэгүй</span>
                </div>
              </div>
              <div className="flex justify-between items-end mb-8">
                <span className="font-bold text-slate-700">Нийт төлөх:</span>
                <span className="text-2xl font-extrabold text-[#e11d48]">{PLANS[formData.plan as keyof typeof PLANS].price.toLocaleString()}₮</span>
              </div>
              
              <button onClick={handleNext} className="w-full bg-[#0F172A] text-white py-4 rounded-xl font-bold flex items-center justify-center hover:bg-slate-800 transition-colors shadow-lg">
                Үргэлжлүүлэх <ChevronRight className="ml-2 h-5 w-5" />
              </button>
            </div>
          </div>
        </div>
      )}

      {step === 2 && (
        <div className="max-w-2xl mx-auto">
          <div className="bg-white p-6 sm:p-10 rounded-2xl border border-slate-200 shadow-sm text-center">
            <h2 className="text-2xl font-bold text-[#0F172A] mb-2">Төлбөр төлөх</h2>
            <p className="text-slate-500 mb-8">Төлбөрөө дараах аргуудаас сонгон төлнө үү</p>
            
            <div className="text-4xl font-extrabold text-[#e11d48] mb-10">
              {PLANS[formData.plan as keyof typeof PLANS].price.toLocaleString()}₮
            </div>

            <div className="grid grid-cols-3 gap-4 mb-8">
              <label className={`cursor-pointer border-2 rounded-xl p-4 flex flex-col items-center justify-center transition-all ${formData.paymentMethod === 'qpay' ? 'border-[#F59E0B] bg-amber-50' : 'border-slate-200 hover:border-slate-300'}`}>
                <input type="radio" name="paymentMethod" value="qpay" checked={formData.paymentMethod === 'qpay'} onChange={handleChange} className="sr-only" />
                <span className="font-bold text-[#0F172A]">Qpay</span>
              </label>
              <label className={`cursor-pointer border-2 rounded-xl p-4 flex flex-col items-center justify-center transition-all ${formData.paymentMethod === 'socialpay' ? 'border-[#F59E0B] bg-amber-50' : 'border-slate-200 hover:border-slate-300'}`}>
                <input type="radio" name="paymentMethod" value="socialpay" checked={formData.paymentMethod === 'socialpay'} onChange={handleChange} className="sr-only" />
                <span className="font-bold text-[#0F172A]">SocialPay</span>
              </label>
              <label className={`cursor-pointer border-2 rounded-xl p-4 flex flex-col items-center justify-center transition-all ${formData.paymentMethod === 'invoice' ? 'border-[#F59E0B] bg-amber-50' : 'border-slate-200 hover:border-slate-300'}`}>
                <input type="radio" name="paymentMethod" value="invoice" checked={formData.paymentMethod === 'invoice'} onChange={handleChange} className="sr-only" />
                <span className="font-bold text-[#0F172A] text-sm text-center">Нэхэмжлэх<br/>/Дансаар/</span>
              </label>
            </div>

            {formData.paymentMethod === 'invoice' ? (
              <div className="bg-slate-50 p-6 rounded-xl border border-slate-200 mb-8 text-left">
                <h4 className="font-bold text-[#0F172A] mb-4">Дансаар шилжүүлэх мэдээлэл:</h4>
                <div className="space-y-2 text-slate-700">
                  <p><span className="font-medium text-slate-500 w-24 inline-block">Банк:</span> Хаан банк</p>
                  <p><span className="font-medium text-slate-500 w-24 inline-block">Данс:</span> <b>5000 123 456</b></p>
                  <p><span className="font-medium text-slate-500 w-24 inline-block">Нэр:</span> Барилга МН ХХК</p>
                  <p><span className="font-medium text-slate-500 w-24 inline-block">Утга:</span> Утасны дугаар, Овог нэр</p>
                </div>
              </div>
            ) : (
               <div className="bg-slate-50 p-8 rounded-xl border border-slate-200 mb-8 flex flex-col items-center justify-center">
                 <div className="w-48 h-48 bg-white border border-slate-200 rounded-xl flex items-center justify-center mb-4">
                   <span className="text-slate-400 font-medium">QR код гарч ирнэ</span>
                 </div>
                 <p className="text-sm text-slate-500">Аппликейшнээ нээгээд уншуулна уу</p>
               </div>
            )}

            <div className="flex gap-4">
              <button onClick={() => setStep(1)} className="flex-1 bg-white text-slate-700 border border-slate-200 py-4 rounded-xl font-bold hover:bg-slate-50 transition-colors">
                Буцах
              </button>
              <button onClick={handleSubmit} disabled={loading} className="flex-1 bg-[#0F172A] text-white py-4 rounded-xl font-bold flex items-center justify-center hover:bg-slate-800 transition-colors disabled:opacity-70 shadow-lg">
                {loading ? <><Loader2 className="animate-spin h-5 w-5 mr-2" /> Уншиж байна...</> : 'Төлбөр төлсөн (Баталгаажуулах)'}
              </button>
            </div>
          </div>
        </div>
      )}

      {step === 3 && (
        <div className="max-w-xl mx-auto text-center py-10">
          <div className="bg-white p-10 rounded-2xl border border-green-100 shadow-xl shadow-green-900/5 relative overflow-hidden">
            <div className="absolute top-0 left-0 w-full h-2 bg-green-500"></div>
            <div className="h-20 w-20 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-6">
              <CheckCircle className="h-10 w-10 text-green-500" />
            </div>
            <h2 className="text-3xl font-extrabold text-[#0F172A] mb-4">Захиалга амжилттай!</h2>
            <p className="text-slate-600 mb-8 text-lg">
              Таны <b>{PLANS[formData.plan as keyof typeof PLANS].name}</b> баталгаажлаа. Хүргэлтийн мэдээллийг бид удахгүй утсаар мэдэгдэх болно.
            </p>
            
            <div className="bg-slate-50 p-6 rounded-xl border border-slate-200 text-left mb-8">
              <h3 className="font-bold text-[#0F172A] mb-4 border-b border-slate-200 pb-2">И-Баримт</h3>
              <p className="text-sm text-slate-500 mb-2">Таны и-баримт амжилттай үүслээ. Имэйл хаяг руу илгээгдсэн болно.</p>
              <div className="flex justify-between items-center text-sm font-medium">
                <span>Дүн: {PLANS[formData.plan as keyof typeof PLANS].price.toLocaleString()}₮</span>
                <span className="bg-blue-100 text-blue-800 px-2 py-1 rounded">Сугалаа: 34567812</span>
              </div>
            </div>

            <button onClick={() => navigate('/profile')} className="bg-[#F59E0B] text-white px-8 py-3 rounded-xl font-bold hover:bg-amber-600 transition-colors shadow-lg">
              Миний захиалгууд руу очих
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
