import { FormEvent, useEffect, useState } from 'react';
import { Link, useNavigate, useParams, useSearchParams } from 'react-router-dom';
import { CheckCircle2, Loader2 } from 'lucide-react';
import { displayPhone, useAuth } from '../contexts/AuthContext';
import { createOrder, getMagazine, isRateLimited, isUuid } from '../lib/records';
import { AddressFields } from '../components/AddressFields';
import { Field, fieldClass, FormStep, OrderSummary } from '../components/OrderForm';
import { addressColumns, addressComplete, DeliveryAddress, emptyAddress } from '../lib/places';
import { fullName, getMyProfile } from '../lib/account';
import { displayTitle } from '../lib/library';
import { CONTACT_PHONE, CONTACT_PHONE_TEL } from '../lib/bank';

// A single printed issue, delivered. Anyone can order (no account needed);
// signed-in readers find their name, phone and saved address filled in.
// Digital copies are bought on /buy instead.

export function Checkout() {
  const { id = '' } = useParams<{ id: string }>();
  const [params] = useSearchParams();
  const navigate = useNavigate();
  const { user } = useAuth();
  const format = params.get('format') || 'print';

  const [magazine, setMagazine] = useState<any>(undefined);
  const [name, setName] = useState('');
  const [phone, setPhone] = useState('');
  const [address, setAddress] = useState<DeliveryAddress>(emptyAddress);
  const [sending, setSending] = useState(false);
  const [error, setError] = useState('');
  const [placedId, setPlacedId] = useState('');

  useEffect(() => {
    getMagazine(id)
      .then(found => setMagazine(found || null))
      .catch(() => setMagazine(null));
  }, [id]);

  // Only print is ordered here; digital goes to buying or reading
  useEffect(() => {
    if (magazine && format !== 'print') navigate(magazine.locked ? `/buy/${magazine.id}` : `/read/${magazine.id}`, { replace: true });
  }, [magazine, format, navigate]);

  // Signed in: start from the details saved under «Миний мэдээлэл»
  useEffect(() => {
    if (!user) return;
    setPhone(p => p || displayPhone(user).replace(/^\+976/, ''));
    getMyProfile(user.id)
      .then(p => {
        setName(n => n || fullName(p));
        if (p.address) setAddress(a => (a.district ? a : p.address!));
      })
      .catch(() => undefined);
  }, [user]);

  if (magazine === undefined) {
    return (
      <div className="flex justify-center py-20">
        <Loader2 className="w-6 h-6 animate-spin text-stone-400" />
      </div>
    );
  }
  if (!magazine || !isUuid(magazine.id)) {
    return (
      <div className="max-w-md mx-auto text-center py-16 space-y-3">
        <p className="font-semibold text-stone-950">Энэ дугаарыг дангаар нь хэвлэмэлээр захиалах боломжгүй.</p>
        <Link to="/subscribe" className="inline-flex px-6 py-3 bg-stone-950 text-white text-sm font-semibold">
          Сэтгүүл захиалах
        </Link>
      </div>
    );
  }

  const title = displayTitle(magazine);
  const price = Number(magazine.pricePrint) || 0;

  const submit = async (e: FormEvent) => {
    e.preventDefault();
    setError('');
    if (name.trim().length < 2 || phone.replace(/\D/g, '').length < 8) return setError('Овог нэр, утасны дугаараа бөглөнө үү.');
    if (!addressComplete(address)) {
      return setError(
        address.region === 'ub'
          ? 'Хүргэлтийн дүүрэг, хороо болон дэлгэрэнгүй хаягаа бөглөнө үү.'
          : 'Хүргэлтийн аймаг, сум болон дэлгэрэнгүй хаягаа бөглөнө үү.'
      );
    }
    const where = addressColumns(address);
    setSending(true);
    try {
      // Price and statuses are set by the database; the office confirms payment
      const { id: orderId } = await createOrder({
        magazineId: magazine.id,
        format: 'print',
        phone: phone.trim(),
        shippingAddress: {
          fullName: name.trim(),
          city: where.city,
          district: where.district,
          khoroo: where.khoroo,
          addressLine: where.detail,
          placeType: where.placeType,
          lat: where.lat,
          lng: where.lng,
          phone: phone.trim(),
        },
      });
      setPlacedId(orderId);
      window.scrollTo({ top: 0, behavior: 'smooth' });
    } catch (err) {
      console.error('Print order failed:', err);
      setError(
        isRateLimited(err)
          ? `Энэ дугаараас саяхан хэд хэдэн захиалга ирсэн байна. Түр хүлээгээд дахин оролдох эсвэл ${CONTACT_PHONE} руу залгана уу.`
          : 'Захиалга илгээхэд алдаа гарлаа. Дахин оролдоно уу.'
      );
    } finally {
      setSending(false);
    }
  };

  if (placedId) {
    return (
      <section className="max-w-xl mx-auto bg-emerald-50 border border-emerald-200 rounded-2xl sm:rounded-3xl p-6 sm:p-10 text-center space-y-4">
        <CheckCircle2 className="w-12 h-12 text-emerald-600 mx-auto" />
        <h1 className="font-serif text-2xl sm:text-3xl font-bold text-stone-950">Захиалга хүлээн авлаа</h1>
        <p className="text-stone-700">
          «{title}» хэвлэмэл дугаарын захиалга № <span className="font-mono font-semibold">{placedId.slice(0, 8).toUpperCase()}</span>. Манай ажилтан{' '}
          {phone} дугаарт холбогдож төлбөр, хүргэлтийг баталгаажуулна.
        </p>
        <p className="text-sm text-stone-600">
          Лавлах:{' '}
          <a href={CONTACT_PHONE_TEL} className="font-semibold text-stone-950">
            {CONTACT_PHONE}
          </a>
          . Төлбөр баталгаажсаны дараа энэ дугаарыг цахимаар ч уншина.
        </p>
        <Link to={user ? '/profile' : '/'} className="inline-flex px-6 py-3 bg-stone-950 text-white text-sm font-semibold hover:bg-stone-800">
          {user ? 'Миний хэвлэлүүд рүү' : 'Нүүр хуудас руу'}
        </Link>
      </section>
    );
  }

  return (
    <section className="max-w-3xl mx-auto bg-white rounded-2xl sm:rounded-3xl border border-stone-200 p-6 sm:p-10 shadow-sm">
      <div className="flex gap-4 sm:gap-6 mb-8">
        {magazine.coverImage && (
          <img src={magazine.coverImage} alt="" referrerPolicy="no-referrer" className="w-20 sm:w-24 aspect-[3/4] object-cover bg-stone-200 shadow-md shrink-0" />
        )}
        <div>
          <p className="text-sm font-semibold text-amber-700">Хэвлэмэл дугаар захиалах</p>
          <h1 className="font-serif text-2xl sm:text-3xl font-bold tracking-tight text-stone-900 mt-1">{title}</h1>
          <p className="text-sm text-stone-500 mt-1">Хаягаар тань хүргэнэ. Төлбөр баталгаажсаны дараа цахимаар ч уншина.</p>
        </div>
      </div>

      {!user && (
        <p className="mb-8 text-sm text-stone-600 bg-stone-50 border border-stone-200 px-4 py-3">
          Нэвтрэхгүйгээр захиалж болно.{' '}
          <Link to={`/login?redirect=${encodeURIComponent(`/checkout/${magazine.id}?format=print`)}`} className="font-semibold text-stone-950 underline underline-offset-2">
            Нэвтэрвэл
          </Link>{' '}
          нэр, утас, хаяг тань автоматаар бөглөгдөнө.
        </p>
      )}

      <form onSubmit={submit} className="space-y-8" noValidate>
        <FormStep n={1} title="Таны мэдээлэл">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <Field label="Овог, нэр">
              <input className={fieldClass} value={name} onChange={e => setName(e.target.value)} autoComplete="name" placeholder="Бат Болд" />
            </Field>
            <Field label="Утасны дугаар">
              <input className={fieldClass} value={phone} onChange={e => setPhone(e.target.value)} type="tel" inputMode="numeric" autoComplete="tel" placeholder="9911 2233" />
            </Field>
          </div>
        </FormStep>

        <FormStep n={2} title="Хүргэлтийн хаяг">
          <AddressFields value={address} onChange={setAddress} />
        </FormStep>

        <div className="border-t-2 border-stone-950 pt-5 space-y-4">
          <OrderSummary
            lines={[
              { label: `${title} — хэвлэмэл`, value: price ? `${price.toLocaleString()}₮` : 'Үнийг мэдэгдэнэ' },
              { label: 'Хүргэлт (Улаанбаатар)', value: 'Үнэгүй' },
            ]}
            total={price ? `${price.toLocaleString()}₮` : '—'}
          />
          {error && (
            <p className="text-sm font-medium text-red-600" role="alert">
              {error}
            </p>
          )}
          <button
            type="submit"
            disabled={sending}
            className="w-full inline-flex items-center justify-center gap-2 px-8 py-4 bg-amber-500 hover:bg-amber-400 disabled:opacity-60 text-stone-950 font-bold transition-colors"
          >
            {sending && <Loader2 className="w-4 h-4 animate-spin" />}
            Захиалга илгээх
          </button>
          <p className="text-xs text-center text-stone-500">Илгээсний дараа манай ажилтан холбогдож төлбөрийн мэдээллийг өгнө.</p>
        </div>
      </form>
    </section>
  );
}
