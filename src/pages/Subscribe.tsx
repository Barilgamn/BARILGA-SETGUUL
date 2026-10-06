import React, { FormEvent, Fragment, useState, useEffect } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import { displayPhone, useAuth } from '../contexts/AuthContext';
import { createSubscription, isRateLimited, SubscriptionInput } from '../lib/records';
import { getBankSettings } from '../lib/purchases';
import { CONTACT_PHONE, CONTACT_PHONE_TEL } from '../lib/bank';
import { Invoice, transferReference } from '../components/Invoice';
import { PLAN_PRICES, PlanId, planSavings, SINGLE_ISSUE_PRICE } from '../lib/plans';
import { BankSettings } from '../types';
import { BankDetails } from '../components/BankDetails';
import { AddressFields } from '../components/AddressFields';
import { fullName, getMyProfile } from '../lib/account';
import { addressColumns, addressComplete, DeliveryAddress, emptyAddress } from '../lib/places';
import { Building2, CheckCircle, ChevronRight, Loader2, FileText, User } from 'lucide-react';
import { ChoiceCard, Field, fieldClass, FormStep, OrderSummary } from '../components/OrderForm';

const PLANS = {
  quarterly: { name: 'Улирлын багц (3 дугаар)', short: 'Улирлын багц · 3 дугаар', price: PLAN_PRICES.quarterly.price },
  'half-year': { name: 'Хагас жилийн багц (6 дугаар)', short: 'Хагас жилийн багц · 6 дугаар', price: PLAN_PRICES['half-year'].price },
  yearly: { name: 'Жилийн багц (12 дугаар)', short: 'Жилийн багц · 12 дугаар', price: PLAN_PRICES.yearly.price },
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

  const [formError, setFormError] = useState('');
  const handleNext = () => {
    if (step === 1) {
      if (!formData.fullName.trim() || formData.phone.replace(/\D/g, '').length < 8) {
        setFormError('Овог нэр, утасны дугаараа бөглөнө үү.');
        return;
      }
      if (!addressComplete(formData.address)) {
        setFormError(
          formData.address.region === 'ub'
            ? 'Хүргэлтийн дүүрэг, хороо болон дэлгэрэнгүй хаягаа бөглөнө үү.'
            : 'Хүргэлтийн аймаг, сум болон дэлгэрэнгүй хаягаа бөглөнө үү.'
        );
        return;
      }
      if (formData.ebarimtType === 'company' && (!formData.companyName.trim() || !formData.registerNumber.trim())) {
        setFormError('Байгууллагын нэр, регистрийн дугаарыг бөглөнө үү.');
        return;
      }
    }
    setFormError('');
    setStep(step + 1);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  // Keep what was typed when leaving to sign in; it comes back afterwards
  const saveDraft = () => {
    try {
      sessionStorage.setItem(DRAFT_KEY, JSON.stringify(formData));
    } catch {
      /* storage unavailable: the form is simply refilled from the profile */
    }
  };

  // Guests can order too; a signed-in order also shows under «Миний хэвлэлүүд»
  const handleSubmit = async () => {
    setLoading(true);
    setFormError('');
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
      setFormError(
        isRateLimited(err)
          ? `Энэ дугаараас саяхан хэд хэдэн захиалга ирсэн байна. Түр хүлээгээд дахин оролдох эсвэл ${CONTACT_PHONE} руу залгана уу.`
          : 'Захиалга илгээхэд алдаа гарлаа. Дахин оролдоно уу.'
      );
    } finally {
      setLoading(false);
    }
  };

  if (!PLANS[formData.plan as keyof typeof PLANS]) {
    return <div className="text-center py-20">Сонгосон багц олдсонгүй</div>;
  }

  const plan = PLANS[formData.plan as keyof typeof PLANS];
  const STAGES = ['Захиалга', 'Төлбөр', 'Баталгаажуулалт'];

  return (
    <div className="max-w-3xl mx-auto space-y-6">
      {/* Where in the three stages we are */}
      <ol className="flex items-center justify-center gap-2 text-xs sm:text-sm print:hidden" aria-label="Захиалгын явц">
        {STAGES.map((label, i) => (
          <li key={label} className="flex items-center gap-2">
            {i > 0 && <span className="w-6 sm:w-10 h-px bg-stone-300" />}
            <span className={step === i + 1 ? 'font-semibold text-stone-950' : step > i + 1 ? 'text-emerald-700' : 'text-stone-400'}>
              {step > i + 1 ? '✓ ' : ''}
              {label}
            </span>
          </li>
        ))}
      </ol>

      {step === 1 && (
        <section className="bg-white rounded-2xl sm:rounded-3xl border border-stone-200 p-6 sm:p-10 shadow-sm">
          <div className="mb-8">
            <h1 className="font-serif text-2xl sm:text-3xl font-bold tracking-tight text-stone-900">Сэтгүүл захиалах</h1>
            <p className="text-sm text-stone-500 mt-1">Барилга МН сэтгүүлийг сар бүр гэр, оффисоороо хүлээн аваарай.</p>
            {!user && (
              <p className="mt-3 text-sm text-stone-600 bg-stone-50 border border-stone-200 px-4 py-3">
                Нэвтрэхгүйгээр захиалж болно.{' '}
                <Link onClick={saveDraft} to={`/login?redirect=${encodeURIComponent(`/subscribe?plan=${formData.plan}`)}`} className="font-semibold text-stone-950 underline underline-offset-2">
                  Нэвтэрвэл
                </Link>{' '}
                нэр, утас, хаяг тань автоматаар бөглөгдөнө.
              </p>
            )}
          </div>

          <form
            onSubmit={(e: FormEvent) => {
              e.preventDefault();
              handleNext();
            }}
            className="space-y-8"
            noValidate
          >
            <FormStep n={1} title="Багц сонгох">
              <div className="grid grid-cols-1 gap-3 pt-2" role="radiogroup" aria-label="Багц">
                {(Object.keys(PLANS) as PlanId[]).map(key => {
                  const p = PLANS[key];
                  const save = planSavings(key);
                  return (
                    <Fragment key={key}>
                    <ChoiceCard
                      selected={formData.plan === key}
                      onSelect={() => setFormData({ ...formData, plan: key })}
                      title={p.short}
                      note={
                        <>
                          <span className="line-through">{save.separately.toLocaleString()}₮</span> · {save.percent}% хямд
                        </>
                      }
                      aside={`${p.price.toLocaleString()}₮`}
                      badge={key === 'yearly' ? 'Хамгийн хямд' : undefined}
                    />
                    </Fragment>
                  );
                })}
              </div>
              <p className="mt-2 text-xs text-stone-500">Сар бүр тусад нь авбал нэг дугаар {SINGLE_ISSUE_PRICE.toLocaleString()}₮. Захиалгын хугацаанд гарсан дугааруудаа цахимаар ч уншина.</p>
            </FormStep>

            <FormStep n={2} title="Таны мэдээлэл">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <Field label="Овог, нэр">
                  <input type="text" name="fullName" value={formData.fullName} onChange={handleChange} className={fieldClass} autoComplete="name" placeholder="Бат Болд" />
                </Field>
                <Field label="Утасны дугаар">
                  <input type="tel" name="phone" value={formData.phone} onChange={handleChange} className={fieldClass} autoComplete="tel" placeholder="9911 2233" />
                </Field>
                <Field label={<>И-мэйл <span className="font-normal text-stone-400">(заавал биш)</span></>} className="sm:col-span-2">
                  <input type="email" name="email" value={formData.email} onChange={handleChange} className={fieldClass} autoComplete="email" placeholder="name@company.mn" />
                </Field>
              </div>
            </FormStep>

            <FormStep n={3} title="Хүргэлтийн хаяг">
              <AddressFields value={formData.address} onChange={address => setFormData({ ...formData, address })} />
            </FormStep>

            <FormStep n={4} title="И-баримт">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3" role="radiogroup" aria-label="И-баримт">
                <ChoiceCard
                  selected={formData.ebarimtType === 'personal'}
                  onSelect={() => setFormData({ ...formData, ebarimtType: 'personal' })}
                  icon={<User className="w-5 h-5" />}
                  title="Хувь хүн"
                  note="Утасны дугаараар"
                />
                <ChoiceCard
                  selected={formData.ebarimtType === 'company'}
                  onSelect={() => setFormData({ ...formData, ebarimtType: 'company' })}
                  icon={<Building2 className="w-5 h-5" />}
                  title="Байгууллага"
                  note="Регистрийн дугаараар"
                />
              </div>
              {formData.ebarimtType === 'company' && (
                <div className="mt-4 grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <Field label="Байгууллагын нэр">
                    <input type="text" name="companyName" value={formData.companyName} onChange={handleChange} className={fieldClass} />
                  </Field>
                  <Field label="Регистрийн дугаар">
                    <input type="text" name="registerNumber" value={formData.registerNumber} onChange={handleChange} className={fieldClass} inputMode="numeric" />
                  </Field>
                </div>
              )}
            </FormStep>

            {/* What it comes to, and on to payment */}
            <div className="border-t-2 border-stone-950 pt-5 space-y-4">
              <OrderSummary
                lines={[
                  { label: `Барилга МН сэтгүүл — ${plan.name}`, value: `${plan.price.toLocaleString()}₮` },
                  { label: 'Хүргэлт (Улаанбаатар)', value: 'Үнэгүй' },
                ]}
                total={`${plan.price.toLocaleString()}₮`}
              />
              {formError && <p className="text-sm font-medium text-red-600" role="alert">{formError}</p>}
              <button
                type="submit"
                className="w-full inline-flex items-center justify-center gap-2 px-8 py-4 bg-amber-500 hover:bg-amber-400 text-stone-950 font-bold transition-colors"
              >
                Үргэлжлүүлэх <ChevronRight className="w-5 h-5" />
              </button>
              <p className="text-xs text-center text-stone-500">Дараагийн алхамд нэхэмжлэх үүсгэж, дансаар төлнө.</p>
            </div>
          </form>
        </section>
      )}

      {step === 2 && (
        <section className="bg-white rounded-2xl sm:rounded-3xl border border-stone-200 p-6 sm:p-10 shadow-sm space-y-6">
          <div>
            <h1 className="font-serif text-2xl sm:text-3xl font-bold tracking-tight text-stone-900">Төлбөр</h1>
            <p className="text-sm text-stone-500 mt-1">Нэхэмжлэх үүсгээд дансаар шилжүүлнэ. Төлбөр орсны дараа захиалга идэвхжинэ.</p>
          </div>

          <OrderSummary
            lines={[
              { label: `Барилга МН сэтгүүл — ${plan.name}`, value: `${plan.price.toLocaleString()}₮` },
              { label: 'Хүргэлт', value: 'Үнэгүй' },
            ]}
            total={`${plan.price.toLocaleString()}₮`}
          />

          <div className="bg-[#EDE8DF] p-5 sm:p-6 space-y-3">
            <p className="font-semibold text-stone-950">Шилжүүлэх данс</p>
            {!bank ? <Loader2 className="animate-spin h-5 w-5 text-stone-400" /> : <BankDetails bank={bank} reference={reference} />}
            <p className="text-sm text-stone-600">
              Лавлах: <a href={CONTACT_PHONE_TEL} className="font-semibold text-stone-950">{CONTACT_PHONE}</a>
            </p>
          </div>

          <div className="flex flex-col-reverse sm:flex-row gap-3">
            <button onClick={() => setStep(1)} className="sm:flex-1 py-4 border border-stone-300 text-stone-700 font-semibold hover:border-stone-950 transition-colors">
              Буцах
            </button>
            <button
              onClick={handleSubmit}
              disabled={loading}
              className="sm:flex-[2] py-4 bg-amber-500 hover:bg-amber-400 text-stone-950 font-bold inline-flex items-center justify-center gap-2 transition-colors disabled:opacity-60"
            >
              {loading ? <Loader2 className="animate-spin h-5 w-5" /> : <FileText className="h-5 w-5" />}
              {loading ? 'Илгээж байна…' : 'Нэхэмжлэх үүсгэх'}
            </button>
          </div>
          {formError && <p className="text-sm font-medium text-red-600 text-center" role="alert">{formError}</p>}
          {!user && (
            <p className="text-xs text-center text-stone-500">
              Нэвтрэхгүйгээр захиалж болно. Утасны дугаараараа{' '}
              <Link onClick={saveDraft} to={`/login?redirect=${encodeURIComponent(`/subscribe?plan=${formData.plan}`)}`} className="underline font-semibold text-stone-700">
                нэвтэрвэл
              </Link>{' '}
              мэдээлэл тань бөглөгдөж, захиалгаа «Миний хэвлэлүүд»-ээс хянана.
            </p>
          )}
        </section>
      )}

      {step === 3 && (
        <div className="space-y-6">
          <div className="text-center space-y-2 print:hidden">
            <CheckCircle className="h-12 w-12 text-emerald-600 mx-auto" />
            <h1 className="font-serif text-2xl sm:text-3xl font-bold text-stone-950">Захиалга хүлээн авлаа</h1>
            <p className="text-stone-600">Доорх нэхэмжлэхийн дагуу төлбөрөө шилжүүлнэ үү. Төлбөр орсны дараа захиалга идэвхжиж, бид тантай холбогдоно.</p>
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
            items={[{ label: `Барилга МН сэтгүүл — ${plan.name}`, amount: plan.price }]}
            reference={reference}
            note="Төлбөр орсныг шалгаад захиалгыг идэвхжүүлж, хүргэлтийн мэдээллийг утсаар мэдэгдэнэ."
          />

          <button
            onClick={() => navigate(user ? '/profile' : '/')}
            className="print:hidden w-full sm:w-auto px-8 py-3.5 bg-stone-950 text-white font-semibold hover:bg-stone-800 transition-colors"
          >
            {user ? 'Миний хэвлэлүүд рүү' : 'Нүүр хуудас руу'}
          </button>
        </div>
      )}
    </div>
  );
}
