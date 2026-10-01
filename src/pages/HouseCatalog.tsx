import { FormEvent, useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { ArrowRight, Check, CheckCircle2, Loader2, MapPin, Minus, Phone, Plus } from 'lucide-react';
import { CatalogOrder } from '../types';
import { CatalogPricing, createCatalogOrder, DISTRICTS, formatCode, getCatalogPricing, orderTotal } from '../lib/catalogOrders';
import { Invoice, transferReference } from '../components/Invoice';

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

function OrderForm() {
  const [pricing, setPricing] = useState<CatalogPricing>({ price: null, deliveryFee: 0 });
  const price = pricing.price;
  const [quantity, setQuantity] = useState(1);
  const [form, setForm] = useState({
    fullName: '',
    phone: '',
    deliveryMethod: 'delivery' as 'delivery' | 'pickup',
    district: '',
    address: '',
    note: '',
  });
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
    if (needsAddress && (!form.district || form.address.trim().length < 5)) {
      return setError('Хүргэлтийн дүүрэг болон хаягаа дэлгэрэнгүй оруулна уу.');
    }

    setSubmitting(true);
    try {
      const order = await createCatalogOrder({
        productId: CATALOG_PRODUCT_ID,
        productTitle: '«Амины орон сууц» каталог',
        quantity,
        fullName: form.fullName.trim(),
        phone: phoneDigits,
        deliveryMethod: form.deliveryMethod,
        district: needsAddress ? form.district : '',
        address: needsAddress ? form.address.trim() : '',
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
    'w-full px-4 py-3 rounded-xl border border-stone-300 bg-white text-base text-stone-900 placeholder:text-stone-400 focus:outline-none focus:ring-2 focus:ring-stone-900';

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

      <form onSubmit={handleSubmit} className="grid grid-cols-1 sm:grid-cols-2 gap-4" noValidate>
        <label className="block space-y-1.5">
          <span className="text-sm font-semibold text-stone-800">Нэр</span>
          <input className={inputClass} value={form.fullName} onChange={set('fullName')} autoComplete="name" placeholder="Овог нэр" />
        </label>
        <label className="block space-y-1.5">
          <span className="text-sm font-semibold text-stone-800">Утасны дугаар</span>
          <input className={inputClass} value={form.phone} onChange={set('phone')} type="tel" inputMode="numeric" autoComplete="tel" placeholder="9911 2233" />
        </label>

        <div className="space-y-1.5">
          <span className="text-sm font-semibold text-stone-800 block">Тоо ширхэг</span>
          <div className="inline-flex items-center rounded-xl border border-stone-300 bg-white">
            <button type="button" aria-label="Хасах" onClick={() => setQuantity(q => Math.max(1, q - 1))} className="p-3.5 text-stone-600 hover:text-stone-900 disabled:opacity-40" disabled={quantity <= 1}>
              <Minus className="w-4 h-4" />
            </button>
            <span className="w-10 text-center text-base font-semibold tabular-nums">{quantity}</span>
            <button type="button" aria-label="Нэмэх" onClick={() => setQuantity(q => Math.min(50, q + 1))} className="p-3.5 text-stone-600 hover:text-stone-900">
              <Plus className="w-4 h-4" />
            </button>
          </div>
        </div>

        <div className="space-y-1.5">
          <span className="text-sm font-semibold text-stone-800 block">Хүлээн авах</span>
          <div className="grid grid-cols-2 gap-2">
            {([
              ['delivery', pricing.deliveryFee ? `Хүргүүлэх (+${pricing.deliveryFee.toLocaleString()}₮)` : 'Хүргүүлэх'],
              ['pickup', 'Очиж авах'],
            ] as const).map(([value, label]) => (
              <button
                key={value}
                type="button"
                onClick={() => setForm(f => ({ ...f, deliveryMethod: value }))}
                className={`py-3 rounded-xl border text-sm font-semibold transition-colors ${
                  form.deliveryMethod === value ? 'bg-stone-900 border-stone-900 text-white' : 'bg-white border-stone-300 text-stone-700 hover:border-stone-500'
                }`}
              >
                {label}
              </button>
            ))}
          </div>
        </div>

        {needsAddress ? (
          <>
            <label className="block space-y-1.5">
              <span className="text-sm font-semibold text-stone-800">Дүүрэг</span>
              <select className={inputClass} value={form.district} onChange={set('district')}>
                <option value="">Сонгох</option>
                {DISTRICTS.map(d => <option key={d} value={d}>{d}</option>)}
              </select>
            </label>
            <label className="block space-y-1.5">
              <span className="text-sm font-semibold text-stone-800">Хаяг</span>
              <input className={inputClass} value={form.address} onChange={set('address')} autoComplete="street-address" placeholder="Хороо, байр, орц, тоот" />
            </label>
          </>
        ) : (
          <p className="sm:col-span-2 text-sm text-stone-600 bg-stone-50 rounded-xl p-4">
            Редакцаас очиж авна: Баянзүрх дүүрэг, 6-р хороо, 21-р сургуулийн баруун талд.
          </p>
        )}

        <label className="block space-y-1.5 sm:col-span-2">
          <span className="text-sm font-semibold text-stone-800">Нэмэлт тайлбар <span className="font-normal text-stone-400">(заавал биш)</span></span>
          <textarea className={inputClass} rows={2} value={form.note} onChange={set('note')} placeholder="Байгууллагын нэр, хүргэлтийн цаг г.м" />
        </label>

        {error && <p className="sm:col-span-2 text-sm font-medium text-red-600" role="alert">{error}</p>}

        <div className="sm:col-span-2 flex flex-col sm:flex-row sm:items-center justify-between gap-4 pt-2 border-t border-stone-100">
          <p className="text-sm text-stone-500">
            {price != null ? (
              <>
                Нийт <span className="text-lg font-bold text-stone-900 tabular-nums">{(price * quantity + deliveryFee).toLocaleString()}₮</span>
                {deliveryFee > 0 && <> ({(price * quantity).toLocaleString()}₮ + хүргэлт {deliveryFee.toLocaleString()}₮)</>}
              </>
            ) : (
              <>Үнэ, хүргэлтийн төлбөрийг баталгаажуулах үед мэдэгдэнэ</>
            )}
          </p>
          <button
            type="submit"
            disabled={submitting}
            className="inline-flex items-center justify-center gap-2 px-8 py-3.5 rounded-xl bg-amber-500 hover:bg-amber-400 disabled:opacity-60 text-stone-950 font-bold text-sm transition-colors"
          >
            {submitting && <Loader2 className="w-4 h-4 animate-spin" />}
            <span>Захиалга илгээх</span>
          </button>
        </div>
      </form>
    </section>
  );
}
