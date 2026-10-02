import React, { useState, useEffect } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { displayPhone, useAuth } from '../contexts/AuthContext';
import { createSubscription, SubscriptionInput } from '../lib/records';
import { getBankSettings } from '../lib/purchases';
import { CONTACT_PHONE, CONTACT_PHONE_TEL } from '../lib/bank';
import { Invoice, transferReference } from '../components/Invoice';
import { PLAN_PRICES, PlanId, planSavings } from '../lib/plans';
import { BankSettings } from '../types';
import { BankDetails } from '../components/BankDetails';
import { AddressFields } from '../components/AddressFields';
import { fullName, getMyProfile } from '../lib/account';
import { addressColumns, addressComplete, DeliveryAddress, emptyAddress } from '../lib/places';
import { BookOpen, MapPin, CreditCard, CheckCircle, ChevronRight, Loader2, FileText } from 'lucide-react';

const PLANS = {
  'quarterly': { name: 'Улирлын захиалга (3 дугаар)', price: PLAN_PRICES.quarterly.price },
  'half-year': { name: 'Хагас жилийн (6 дугаар)', price: PLAN_PRICES['half-year'].price },
  'yearly': { name: 'Жилийн захиалга (12 дугаар)', price: PLAN_PRICES.yearly.price },
};

const DRAFT_KEY = 'subscribe-draft';

export function Subscribe() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const planParam = searchParams.get('plan') as keyof typeof PLANS || 'yearly';
  
  const [step, setStep] = useState(1);
  const [loading, setLoading] = useState(false);
  const [orderId, setOrderId] = useState('');
  const [bank, setBank] = useState<BankSettings | null | undefined>(undefined);

  useEffect(() => {
    getBankSettings().then(setBank);
  }, []);
  
  const [formData, setFormData] = useState(() => {
    // Restore what was typed before being sent to log in
    try {
      const saved = sessionStorage.getItem(DRAFT_KEY);
      if (saved) {
        sessionStorage.removeItem(DRAFT_KEY);
        const draft = JSON.parse(saved);
        // Drafts from before the structured address have none
        return { ...draft, address: { ...emptyAddress(), ...(draft.address || {}) } };
      }
    } catch {
      /* storage unavailable */
    }
    return {
    plan: planParam,
    fullName: '',
    phone: displayPhone(user),
    email: '',
    address: emptyAddress() as DeliveryAddress,
    ebarimtType: 'personal',
    companyName: '',
    registerNumber: '',
    paymentMethod: 'invoice',
    };
  });

  // Fill in the name and email saved under «Миний мэдээлэл»
  useEffect(() => {
    if (!user) return;
    getMyProfile(user.id)
      .then(p =>
        setFormData((f: typeof formData) => ({
          ...f,
          fullName: f.fullName || fullName(p),
          email: f.email || p.email,
          phone: f.phone || displayPhone(user),
          // The saved delivery address, unless one was already picked here
          address: !f.address?.district && p.address ? p.address : f.address,
        }))
      )
      .catch(() => undefined);
  }, [user]);

  // Came back from login with a draft: go straight to the confirm step
  useEffect(() => {
    if (user && formData.fullName && addressComplete(formData.address) && step === 1) {
      setStep(2);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user]);

  const reference = transferReference(formData.fullName, formData.phone);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  const handleNext = () => {
    if (step === 1) {
      if (!formData.fullName || !formData.phone || !addressComplete(formData.address)) {
        alert(
          formData.address.region === 'ub'
            ? 'Нэр, утас, дүүрэг, хороо болон дэлгэрэнгүй хаягаа бөглөнө үү'
            : 'Нэр, утас, аймаг, сум болон дэлгэрэнгүй хаягаа бөглөнө үү'
        );
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
      try {
        sessionStorage.setItem(DRAFT_KEY, JSON.stringify(formData));
      } catch {
        /* storage unavailable: the form is simply refilled */
      }
      navigate(`/login?redirect=${encodeURIComponent(`/subscribe?plan=${formData.plan}`)}`);
      return;
    }

    setLoading(true);
    try {
      // Price and statuses are set by the database from the plan
      const { address, ...rest } = formData;
      const where = addressColumns(address);
      const order = await createSubscription({
        ...rest,
        city: where.city,
        district: where.district,
        khoroo: where.khoroo,
        addressDetail: where.detail,
        placeType: where.placeType,
        lat: where.lat,
        lng: where.lng,
      } as SubscriptionInput);
      setOrderId(order.id);
      setStep(3);
    } catch (err) {
      console.error(err);
      alert('Алдаа гарлаа. Та дахин оролдоно уу.');
    } finally {
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
                    <span className="text-slate-400 text-xs line-through mt-auto tabular-nums">
                      {planSavings(key as PlanId).separately.toLocaleString()}₮
                    </span>
                    <span className="text-[#0F172A] font-extrabold tabular-nums">{plan.price.toLocaleString()}₮</span>
                    <span className={`mt-1 text-xs font-semibold ${key === 'yearly' ? 'text-emerald-700' : 'text-slate-500'}`}>
                      {planSavings(key as PlanId).saved.toLocaleString()}₮ хэмнэнэ
                      {key === 'yearly' && ' · хамгийн хямд'}
                    </span>
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
                <div className="sm:col-span-2">
                  <AddressFields value={formData.address} onChange={address => setFormData({ ...formData, address })} />
                </div>
              </div>
            </div>

            <div className="bg-white p-6 sm:p-8 rounded-2xl border border-slate-200 shadow-sm">
              <h2 className="text-xl font-bold text-[#0F172A] mb-6 flex items-center"><CreditCard className="mr-2 h-5 w-5 text-[#F59E0B]"/> И-Баримт</h2>
              <div className="grid grid-cols-2 gap-3 mb-6">
                <label className="flex items-center cursor-pointer px-4 py-3 rounded-xl border border-slate-200 has-[:checked]:border-[#0F172A] has-[:checked]:bg-slate-50">
                  <input type="radio" name="ebarimtType" value="personal" checked={formData.ebarimtType === 'personal'} onChange={handleChange} className="text-[#0F172A] focus:ring-[#0F172A] h-4 w-4" />
                  <span className="ml-2 font-medium text-slate-700">Хувь хүн</span>
                </label>
                <label className="flex items-center cursor-pointer px-4 py-3 rounded-xl border border-slate-200 has-[:checked]:border-[#0F172A] has-[:checked]:bg-slate-50">
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
          <div className="bg-white p-6 sm:p-10 rounded-2xl border border-slate-200 shadow-sm">
            <h2 className="text-2xl font-bold text-[#0F172A] mb-2 text-center">Төлбөр</h2>
            <p className="text-slate-500 mb-6 text-center">Нэхэмжлэх үүсгээд дансаар шилжүүлнэ. Төлбөр орсны дараа захиалга идэвхжинэ.</p>

            <div className="text-center mb-8">
              <p className="text-sm text-slate-500">{PLANS[formData.plan as keyof typeof PLANS].name}</p>
              <p className="text-4xl font-extrabold text-[#0F172A] tabular-nums">
                {PLANS[formData.plan as keyof typeof PLANS].price.toLocaleString()}₮
              </p>
            </div>

            <div className="bg-[#EDE8DF] p-5 sm:p-6 mb-8 text-left space-y-3">
              <h4 className="font-bold text-[#0F172A]">Шууд шилжүүлэх бол</h4>
              {!bank ? (
                <Loader2 className="animate-spin h-5 w-5 text-slate-400" />
              ) : (
                <BankDetails bank={bank} reference={reference} />
              )}
              <p className="text-sm text-slate-600">Холбогдох утас: <a href={CONTACT_PHONE_TEL} className="font-semibold text-[#0F172A]">{CONTACT_PHONE}</a></p>
            </div>

            <div className="flex flex-col-reverse sm:flex-row gap-3">
              <button onClick={() => setStep(1)} className="sm:flex-1 bg-white text-slate-700 border border-slate-300 py-4 font-bold hover:bg-slate-50 transition-colors">
                Буцах
              </button>
              <button onClick={handleSubmit} disabled={loading} className="sm:flex-[2] bg-[#0F172A] text-white py-4 font-bold flex items-center justify-center gap-2 hover:bg-slate-800 transition-colors disabled:opacity-70">
                {loading ? <><Loader2 className="animate-spin h-5 w-5" /> Уншиж байна...</> : <><FileText className="h-5 w-5" /> Нэхэмжлэх үүсгэх</>}
              </button>
            </div>
          </div>
        </div>
      )}

      {step === 3 && (
        <div className="max-w-2xl mx-auto space-y-6">
          <div className="text-center space-y-2 print:hidden">
            <CheckCircle className="h-12 w-12 text-green-600 mx-auto" />
            <h2 className="text-2xl sm:text-3xl font-extrabold text-[#0F172A]">Захиалга хүлээн авлаа</h2>
            <p className="text-slate-600">
              Доорх нэхэмжлэхийн дагуу төлбөрөө шилжүүлнэ үү. Төлбөр орсны дараа захиалга идэвхжиж, бид тантай холбогдоно.
            </p>
          </div>

          <Invoice
            number={orderId.slice(0, 8).toUpperCase()}
            date={Date.now()}
            buyer={{
              name: formData.fullName,
              phone: formData.phone,
              company: formData.ebarimtType === 'company' ? formData.companyName : undefined,
              registerNumber: formData.ebarimtType === 'company' ? formData.registerNumber : undefined,
            }}
            items={[{ label: `Барилга МН сэтгүүл — ${PLANS[formData.plan as keyof typeof PLANS].name}`, amount: PLANS[formData.plan as keyof typeof PLANS].price }]}
            reference={reference}
            note="Төлбөр орсныг шалгаад захиалгыг идэвхжүүлж, хүргэлтийн мэдээллийг утсаар мэдэгдэнэ."
          />

          <button onClick={() => navigate('/profile')} className="print:hidden w-full sm:w-auto px-8 py-3.5 bg-[#0F172A] text-white font-bold hover:bg-slate-800 transition-colors">
            Миний захиалгууд руу очих
          </button>
        </div>
      )}
    </div>
  );
}
