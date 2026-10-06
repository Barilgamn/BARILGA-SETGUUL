import { FormEvent, ReactNode, useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { ArrowRight, Check, CheckCircle2, Loader2, MapPin, Minus, Phone, Plus, Store, Truck } from 'lucide-react';
import { CatalogOrder } from '../types';
import { CatalogPricing, createCatalogOrder, formatCode, getCatalogPricing, orderTotal } from '../lib/catalogOrders';
import { AddressFields } from '../components/AddressFields';
import { addressColumns, addressComplete, DeliveryAddress, emptyAddress } from '../lib/places';
import { Invoice, transferReference } from '../components/Invoice';
import { displayPhone, useAuth } from '../contexts/AuthContext';
import { fullName, getMyProfile } from '../lib/account';

// The 8th edition is print-only (not on Heyzine), so its cover ships with the site
export const CATALOG_COVER = '/images/amini-oron-suuts-8.jpg';
const CATALOG_PRODUCT_ID = 'amini-oron-suuts-8';

export const ORDER_PHONE = '9100-0233';
const ORDER_PHONE_TEL = 'tel:+97691000233';

const CONTENTS = [
  'Эрчим хүчний «A, B» ангиллын гэрчилгээтэй, Монгол орны цаг уурт зохицсон 45–540м² хүртэлх ногоон загварууд',
  'Ногоон зээл болон ипотекийн зээлд хэрхэн хамрагдах дэлгэрэнгүй заавар',
  '80м² амины орон сууцны загвар дээр бодож харуулсан төсвийн нарийвчилсан аргачлал',
  'Эрчим хүчний хэмнэлттэй халаалт, сэргээгдэх эрчим хүчний шийдлүүд',
  'Ажил гүйцэтгэлийн гэрээг зөв байгуулах талаарх хуульчийн зөвлөгөө',
  'Эдэлбэр газар, гадна тохижилтын шийдлүүд — сүүдрэвч, сагсны талбай г.м',
];

const SALE_POINTS = [
  { name: 'Номин', where: 'Седар яармаг, Хорооллын эцэс, УИД Мажестик' },
  { name: 'Оргил', where: 'Шилтгээн, Энканто' },
  { name: 'Интерном', where: 'Бүх салбар' },
  { name: 'Аз хур', where: 'Бүх салбар' },
];

export function HouseCatalog() {
  return (
    <div className="max-w-5xl mx-auto space-y-10 sm:space-y-16">
      {/* Intro */}
      <section className="grid grid-cols-1 md:grid-cols-12 gap-8 md:gap-12 items-center">
        <div className="md:col-span-5 flex justify-center order-first md:order-last">
          <a href="#order" className="group block w-48 sm:w-72">
            <div className="relative aspect-[961/1368] overflow-hidden shadow-2xl ring-1 ring-stone-200 transition-transform duration-500 group-hover:-translate-y-1">
              <img src={CATALOG_COVER} alt="«Амины орон сууц» каталог — 8 дахь цуврал" className="w-full h-full object-cover" />
              <div className="absolute inset-y-0 left-0 w-3 bg-gradient-to-r from-black/30 to-transparent pointer-events-none"></div>
            </div>
          </a>
        </div>

        <div className="md:col-span-7 space-y-5 text-center md:text-left">
          <div className="flex flex-wrap items-center justify-center md:justify-start gap-x-3 gap-y-2">
            <span className="inline-flex items-center gap-2 text-sm font-semibold text-amber-700">
              <span className="w-2 h-2 rounded-full bg-amber-500"></span>
              8 дахь цуврал худалдаанд гарлаа
            </span>
            <span className="text-xs font-semibold text-stone-700 border border-stone-400 px-2 py-0.5">
              Нэг удаагийн хэвлэл
            </span>
          </div>
          <h1 className="font-serif text-3xl sm:text-5xl font-bold tracking-tight text-stone-900 leading-tight text-balance">
            «Амины орон сууц» каталог
          </h1>
          <p className="text-base sm:text-lg text-stone-600 leading-relaxed max-w-prose mx-auto md:mx-0">
            Байшингийн суурь хөрснөөс эхлээд барьж дуусах хүртэлх бүх мэдээллийг нэг дор. Каталогт орсон стандарт зураг
            төслийн дагуу барьснаар <strong className="text-stone-900">ногоон зээл</strong> болон{' '}
            <strong className="text-stone-900">ипотекийн зээлд</strong> хамрагдах бүрэн боломжтой.
          </p>

          <div className="flex flex-col sm:flex-row gap-3 pt-2 justify-center md:justify-start">
            <a
              href="#order"
              className="inline-flex items-center justify-center gap-2 px-7 py-3.5 rounded-xl bg-amber-500 hover:bg-amber-400 text-stone-950 font-bold text-sm transition-colors"
            >
              <span>Худалдаж авах</span>
              <ArrowRight className="w-4 h-4" />
            </a>
          </div>

          <p className="text-sm text-stone-500">
            Хүргэлт, дэлгэрэнгүй мэдээлэл:{' '}
            <a href={ORDER_PHONE_TEL} className="font-semibold text-stone-900 hover:underline">
              {ORDER_PHONE}
            </a>
          </p>
        </div>
      </section>

      {/* Contents */}
      <section className="bg-white rounded-2xl sm:rounded-3xl border border-stone-200 p-6 sm:p-10 shadow-sm">
        <h2 className="font-serif text-2xl sm:text-3xl font-bold tracking-tight text-stone-900 mb-6">
          Каталогт юу багтсан бэ?
        </h2>
        <ul className="grid grid-cols-1 sm:grid-cols-2 gap-x-8 gap-y-4">
          {CONTENTS.map(item => (
            <li key={item} className="flex gap-3 text-base text-stone-700 leading-relaxed">
              <Check className="w-5 h-5 text-amber-600 shrink-0 mt-0.5" />
              <span>{item}</span>
            </li>
          ))}
        </ul>
      </section>

      <OrderForm />

      {/* Where to buy */}
      <section className="grid grid-cols-1 md:grid-cols-2 gap-8">
        <div className="space-y-4">
          <h2 className="font-serif text-2xl font-bold tracking-tight text-stone-900">Худалдаалах цэгүүд</h2>
          <ul className="divide-y divide-stone-200 border-y border-stone-200">
            {SALE_POINTS.map(point => (
              <li key={point.name} className="flex items-start gap-3 py-3.5">
                <MapPin className="w-4 h-4 text-amber-600 shrink-0 mt-1" />
                <div>
                  <p className="text-base font-semibold text-stone-900">{point.name}</p>
                  <p className="text-sm text-stone-500">{point.where}</p>
                </div>
              </li>
            ))}
          </ul>
        </div>

        <div className="space-y-4">
          <h2 className="font-serif text-2xl font-bold tracking-tight text-stone-900">Утсаар захиалах</h2>
          <p className="text-stone-600 leading-relaxed">
            Асуух зүйл байвал эсвэл утсаар захиалах бол бидэнтэй холбогдоорой.
          </p>
          <a
            href={ORDER_PHONE_TEL}
            className="inline-flex items-center justify-center gap-2 w-full sm:w-auto px-6 py-3.5 rounded-xl border border-stone-300 bg-white hover:bg-stone-50 text-stone-900 font-semibold text-sm transition-colors"
          >
            <Phone className="w-4 h-4" />
            <span>{ORDER_PHONE} руу залгах</span>
          </a>
        </div>
      </section>
    </div>
  );
}

// One numbered part of the order form: the number on the left, its title
// and fields beside it
function Step({ n, title, optional = false, children }: { n: number; title: string; optional?: boolean; children: ReactNode }) {
  return (
    <div role="group" aria-label={title} className="flex gap-3 sm:gap-4">
      <span className="w-8 h-8 shrink-0 flex items-center justify-center bg-stone-950 text-white text-sm font-bold tabular-nums">{n}</span>
      <div className="flex-1 min-w-0">
        <p className="font-semibold text-stone-950 mb-3 leading-8">
          {title} {optional && <span className="font-normal text-stone-400">(заавал биш)</span>}
        </p>
        {children}
      </div>
    </div>
  );
}

function OrderForm() {
  const [pricing, setPricing] = useState<CatalogPricing>({ price: null, deliveryFee: 0 });
  const price = pricing.price;
  const [quantity, setQuantity] = useState(1);
  const [form, setForm] = useState({
    fullName: '',
    phone: '',
    deliveryMethod: 'delivery' as 'delivery' | 'pickup',
    note: '',
  });
  const [address, setAddress] = useState<DeliveryAddress>(emptyAddress);
  const { user } = useAuth();

  // Signed in: start from the details saved under «Миний мэдээлэл»
  useEffect(() => {
    if (!user) return;
    getMyProfile(user.id)
      .then(p => {
        setForm(f => ({
          ...f,
          fullName: f.fullName || fullName(p),
          phone: f.phone || displayPhone(user).replace(/^\+976/, ''),
        }));
        if (p.address) setAddress(a => (a.district ? a : p.address!));
      })
      .catch(() => undefined);
  }, [user]);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');
  const [placed, setPlaced] = useState<CatalogOrder | null>(null);

  useEffect(() => {
    getCatalogPricing().then(setPricing).catch(() => undefined);
  }, []);

  const set = (field: keyof typeof form) => (e: { target: { value: string } }) =>
    setForm(f => ({ ...f, [field]: e.target.value }));

  const phoneDigits = form.phone.replace(/\D/g, '');
  const needsAddress = form.deliveryMethod === 'delivery';
  const deliveryFee = needsAddress ? pricing.deliveryFee : 0;

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setError('');
    if (form.fullName.trim().length < 2) return setError('Нэрээ оруулна уу.');
    if (phoneDigits.length < 8) return setError('Утасны дугаараа зөв оруулна уу (8 оронтой).');
    if (needsAddress && !addressComplete(address)) {
      return setError(
        address.region === 'ub'
          ? 'Хүргэлтийн дүүрэг, хороо болон дэлгэрэнгүй хаягаа оруулна уу.'
          : 'Хүргэлтийн аймаг, сум болон дэлгэрэнгүй хаягаа оруулна уу.'
      );
    }
    const where = addressColumns(address);

    setSubmitting(true);
    try {
      const order = await createCatalogOrder({
        productId: CATALOG_PRODUCT_ID,
        productTitle: '«Амины орон сууц» каталог',
        quantity,
        fullName: form.fullName.trim(),
        phone: phoneDigits,
        deliveryMethod: form.deliveryMethod,
        ...(needsAddress
          ? {
              city: where.city,
              district: where.district,
              khoroo: where.khoroo,
              address: where.detail,
              placeType: where.placeType,
              lat: where.lat,
              lng: where.lng,
            }
          : { district: '', address: '' }),
        note: form.note.trim(),
      });
      setPlaced(order);
      document.getElementById('order')?.scrollIntoView({ behavior: 'smooth', block: 'start' });
    } catch (err) {
      console.error('Failed to place catalog order:', err);
      setError('Захиалга илгээхэд алдаа гарлаа. Дахин оролдох эсвэл ' + ORDER_PHONE + ' руу залгана уу.');
    } finally {
      setSubmitting(false);
    }
  };

  const inputClass =
    'w-full px-4 py-3 border border-stone-300 bg-white text-base text-stone-900 placeholder:text-stone-400 focus:outline-none focus:border-stone-950 focus:ring-2 focus:ring-stone-950/10';

  if (placed) {
    const total = orderTotal(placed);
    return (
      <section id="order" className="scroll-mt-24 bg-emerald-50 border border-emerald-200 rounded-2xl sm:rounded-3xl p-6 sm:p-10 text-center space-y-5">
        <CheckCircle2 className="w-12 h-12 text-emerald-600 mx-auto" />
        <div className="space-y-2">
          <h2 className="font-serif text-2xl sm:text-3xl font-bold text-stone-900">Захиалга хүлээн авлаа</h2>
          <p className="text-stone-600">Манай ажилтан {placed.phone} дугаар руу залгаж баталгаажуулна.</p>
        </div>
        <div className="inline-block bg-white rounded-2xl border border-emerald-200 px-8 py-5">
          <p className="text-sm text-stone-500">Захиалгын код</p>
          <p className="font-mono text-3xl font-bold tracking-wider text-stone-900 select-all">{formatCode(placed.code)}</p>
          {total != null && (
            <p className="text-sm text-stone-600 mt-1">
              {placed.quantity} ш · <span className="font-semibold tabular-nums">{total.toLocaleString()}₮</span>
            </p>
          )}
        </div>
        <p className="text-sm text-stone-600 max-w-md mx-auto">
          Энэ кодоор захиалгынхаа явцыг шалгана. Кодоо хадгалж аваарай — зөвхөн код мэдэх хүн захиалгыг харах боломжтой.
        </p>
        <Link
          to={`/track?code=${placed.code}`}
          className="inline-flex items-center justify-center gap-2 px-6 py-3 rounded-xl bg-stone-900 hover:bg-stone-800 text-white font-semibold text-sm transition-colors"
        >
          <span>Захиалгын явц харах</span>
          <ArrowRight className="w-4 h-4" />
        </Link>

        {total != null && (
          <div className="text-left pt-4">
            <Invoice
              number={formatCode(placed.code)}
              date={placed.createdAt}
              buyer={{ name: placed.fullName, phone: placed.phone }}
              items={[
                { label: '«Амины орон сууц» каталог', quantity: placed.quantity, amount: total - placed.deliveryFee },
                ...(placed.deliveryFee ? [{ label: 'Хүргэлт', amount: placed.deliveryFee }] : []),
              ]}
              reference={`${transferReference(placed.fullName, placed.phone)} ${placed.code}`}
              note="Төлбөр орсны дараа каталогийг хүргэж эсвэл редакцаас олгоно."
            />
          </div>
        )}
      </section>
    );
  }

  return (
    <section id="order" className="scroll-mt-24 bg-white rounded-2xl sm:rounded-3xl border border-stone-200 p-6 sm:p-10 shadow-sm">
      <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-2 mb-6">
        <div>
          <h2 className="font-serif text-2xl sm:text-3xl font-bold tracking-tight text-stone-900">Худалдаж авах</h2>
          <p className="text-sm text-stone-500 mt-1">Нэг удаагийн хэвлэл — сар, жилийн захиалга шаардахгүй.</p>
        </div>
        {price != null && (
          <p className="text-stone-600">
            Үнэ <span className="text-xl font-bold text-stone-900 tabular-nums">{price.toLocaleString()}₮</span>
          </p>
        )}
      </div>

      <form onSubmit={handleSubmit} className="space-y-8" noValidate>
        <Step n={1} title="Таны мэдээлэл">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <label className="block space-y-1.5">
              <span className="text-sm font-semibold text-stone-800">Овог, нэр</span>
              <input className={inputClass} value={form.fullName} onChange={set('fullName')} autoComplete="name" placeholder="Бат Болд" />
            </label>
            <label className="block space-y-1.5">
              <span className="text-sm font-semibold text-stone-800">Утасны дугаар</span>
              <input className={inputClass} value={form.phone} onChange={set('phone')} type="tel" inputMode="numeric" autoComplete="tel" placeholder="9911 2233" />
            </label>
          </div>
        </Step>

        <Step n={2} title="Тоо ширхэг">
          <div className="flex flex-wrap items-center gap-4">
            <div className="inline-flex items-center border border-stone-300 bg-white">
              <button type="button" aria-label="Хасах" onClick={() => setQuantity(q => Math.max(1, q - 1))} className="p-3.5 text-stone-600 hover:text-stone-900 disabled:opacity-40" disabled={quantity <= 1}>
                <Minus className="w-4 h-4" />
              </button>
              <span className="w-10 text-center text-base font-semibold tabular-nums">{quantity}</span>
              <button type="button" aria-label="Нэмэх" onClick={() => setQuantity(q => Math.min(50, q + 1))} className="p-3.5 text-stone-600 hover:text-stone-900">
                <Plus className="w-4 h-4" />
              </button>
            </div>
            {price != null && (
              <p className="text-sm text-stone-500 tabular-nums">
                {price.toLocaleString()}₮ × {quantity} = <span className="font-semibold text-stone-900">{(price * quantity).toLocaleString()}₮</span>
              </p>
            )}
          </div>
        </Step>

        <Step n={3} title="Хүлээн авах">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3" role="radiogroup" aria-label="Хүлээн авах арга">
            {([
              { value: 'delivery', icon: <Truck className="w-5 h-5" />, title: 'Хүргүүлэх', note: 'Гэр, оффис руу', price: pricing.deliveryFee ? `+${pricing.deliveryFee.toLocaleString()}₮` : 'Үнэгүй' },
              { value: 'pickup', icon: <Store className="w-5 h-5" />, title: 'Очиж авах', note: 'Редакцаас', price: 'Үнэгүй' },
            ] as const).map(opt => {
              const active = form.deliveryMethod === opt.value;
              return (
                <button
                  key={opt.value}
                  type="button"
                  role="radio"
                  aria-checked={active}
                  onClick={() => setForm(f => ({ ...f, deliveryMethod: opt.value }))}
                  className={`flex items-center gap-3 p-4 border text-left transition-colors ${
                    active ? 'border-stone-950 bg-stone-950 text-white' : 'border-stone-300 bg-white text-stone-900 hover:border-stone-950'
                  }`}
                >
                  <span className={active ? 'text-amber-400' : 'text-stone-500'}>{opt.icon}</span>
                  <span className="flex-1">
                    <span className="block font-semibold">{opt.title}</span>
                    <span className={`block text-xs ${active ? 'text-stone-300' : 'text-stone-500'}`}>{opt.note}</span>
                  </span>
                  <span className={`text-sm font-semibold tabular-nums ${active ? 'text-amber-400' : 'text-stone-700'}`}>{opt.price}</span>
                </button>
              );
            })}
          </div>

          <div className="mt-5">
            {needsAddress ? (
              <AddressFields value={address} onChange={setAddress} />
            ) : (
              <div className="flex gap-3 border border-stone-300 bg-stone-50 p-4 text-sm text-stone-700">
                <MapPin className="w-5 h-5 text-amber-700 shrink-0" />
                <p>
                  <span className="block font-semibold text-stone-950">Редакц</span>
                  Баянзүрх дүүрэг, 6-р хороо, 21-р сургуулийн баруун талд. Ажлын өдрүүдэд. Лавлах: {ORDER_PHONE}
                </p>
              </div>
            )}
          </div>
        </Step>

        <Step n={4} title="Нэмэлт тайлбар" optional>
          <textarea className={inputClass} rows={2} value={form.note} onChange={set('note')} placeholder="Байгууллагын нэр, хүргэлтийн тохиромжтой цаг г.м" />
        </Step>

        {/* What it comes to, and send */}
        <div className="border-t-2 border-stone-950 pt-5 space-y-4">
          {price != null ? (
            <dl className="space-y-1.5 text-sm">
              <div className="flex justify-between text-stone-600">
                <dt>«Амины орон сууц» каталог × {quantity}</dt>
                <dd className="tabular-nums">{(price * quantity).toLocaleString()}₮</dd>
              </div>
              <div className="flex justify-between text-stone-600">
                <dt>Хүргэлт</dt>
                <dd className="tabular-nums">{deliveryFee ? `${deliveryFee.toLocaleString()}₮` : 'Үнэгүй'}</dd>
              </div>
              <div className="flex justify-between items-baseline pt-2 border-t border-stone-200">
                <dt className="font-semibold text-stone-950">Нийт төлөх</dt>
                <dd className="font-serif text-2xl font-bold text-stone-950 tabular-nums">{(price * quantity + deliveryFee).toLocaleString()}₮</dd>
              </div>
            </dl>
          ) : (
            <p className="text-sm text-stone-500">Үнэ, хүргэлтийн төлбөрийг баталгаажуулах үед мэдэгдэнэ</p>
          )}

          {error && <p className="text-sm font-medium text-red-600" role="alert">{error}</p>}

          <button
            type="submit"
            disabled={submitting}
            className="w-full inline-flex items-center justify-center gap-2 px-8 py-4 bg-amber-500 hover:bg-amber-400 disabled:opacity-60 text-stone-950 font-bold transition-colors"
          >
            {submitting && <Loader2 className="w-4 h-4 animate-spin" />}
            <span>Захиалга илгээх</span>
          </button>
          <p className="text-xs text-center text-stone-500">Илгээсний дараа нэхэмжлэх гарч ирнэ. Дансаар төлбөрөө шилжүүлнэ.</p>
        </div>
      </form>
    </section>
  );
}
