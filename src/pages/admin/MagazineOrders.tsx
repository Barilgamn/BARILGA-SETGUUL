import { useEffect, useState } from 'react';
import { Loader2, Phone } from 'lucide-react';
import { Order } from '../../types';
import { listAllOrders, updateOrder } from '../../lib/records';
import { AddressSummary } from '../../components/AddressSummary';

const DELIVERY: Record<Order['deliveryStatus'], string> = {
  pending: 'Хүлээгдэж буй',
  processing: 'Бэлтгэж буй',
  shipped: 'Хүргэлтэд гарсан',
  delivered: 'Хүргэгдсэн',
  cancelled: 'Цуцлагдсан',
};
const FORMAT: Record<Order['format'], string> = { digital: 'Цахим', print: 'Хэвлэмэл', both: 'Цахим + хэвлэмэл' };

type Row = Order & { magazineTitle: string };

// Single-issue orders placed from /checkout on hand-added magazines
export function AdminMagazineOrders() {
  const [orders, setOrders] = useState<Row[] | null>(null);
  const [error, setError] = useState('');
  const [busyId, setBusyId] = useState<string | null>(null);

  const load = () =>
    listAllOrders()
      .then(setOrders)
      .catch(err => {
        console.error('Failed to load orders:', err);
        setError('Захиалгуудыг ачаалж чадсангүй.');
      });

  useEffect(() => {
    load();
  }, []);

  const change = async (id: string, changes: Parameters<typeof updateOrder>[1]) => {
    setBusyId(id);
    try {
      await updateOrder(id, changes);
      await load();
    } catch (err) {
      console.error('Failed to update order:', err);
      alert('Хадгалж чадсангүй.');
    } finally {
      setBusyId(null);
    }
  };

  return (
    <div className="space-y-5">
      <div>
        <h1 className="font-serif text-2xl font-bold text-stone-900">Сэтгүүлийн захиалга</h1>
        <p className="text-sm text-stone-500">Ганц дугаарын хэвлэмэл, цахим захиалга</p>
      </div>

      {error && <p className="text-sm text-red-600 bg-red-50 rounded-xl p-4">{error}</p>}
      {!orders && !error && <div className="flex justify-center py-12"><Loader2 className="w-6 h-6 animate-spin text-stone-400" /></div>}
      {orders && orders.length === 0 && (
        <p className="text-center text-stone-500 py-12 bg-white rounded-2xl border border-stone-200">Захиалга алга.</p>
      )}

      <ul className="space-y-3">
        {(orders || []).map(o => (
          <li key={o.id} className="bg-white rounded-2xl border border-stone-200 p-4 sm:p-5 space-y-3">
            <div className="flex flex-wrap items-center gap-2">
              <span className="font-semibold text-stone-900">{o.magazineTitle}</span>
              <span className="text-xs text-stone-500">{FORMAT[o.format]}</span>
              <span className={`px-2 py-0.5 rounded-full text-xs font-semibold ${o.paymentStatus === 'paid' ? 'bg-emerald-100 text-emerald-800' : 'bg-red-50 text-red-700'}`}>
                {o.paymentStatus === 'paid' ? 'Төлсөн' : 'Төлөөгүй'}
              </span>
            </div>
            <p className="text-sm text-stone-500">
              <span className="font-semibold text-stone-900 tabular-nums">{o.totalPrice.toLocaleString()}₮</span>
              {o.shippingAddress?.fullName && <> · <span className="font-semibold text-stone-900">{o.shippingAddress.fullName}</span></>}
              {!o.userId && <span className="ml-1.5 text-xs text-stone-400">(зочин)</span>}
              {' · '}
              <a href={`tel:${o.phoneNumber}`} className="inline-flex items-center gap-1 hover:underline">
                <Phone className="w-3.5 h-3.5" /> {o.phoneNumber || '—'}
              </a>
              {' · '}
              {new Date(o.createdAt).toLocaleString('mn-MN')}
            </p>
            {o.shippingAddress && (
              <p className="text-sm text-stone-600">
                <AddressSummary {...o.shippingAddress} detail={o.shippingAddress.addressLine} />
              </p>
            )}
            <div className="flex flex-wrap items-center gap-2">
              <select
                value={o.deliveryStatus}
                disabled={busyId === o.id}
                onChange={e => change(o.id, { deliveryStatus: e.target.value as Order['deliveryStatus'] })}
                className="px-3 py-2 rounded-lg border border-stone-300 text-base sm:text-sm"
                aria-label="Хүргэлтийн төлөв"
              >
                {Object.entries(DELIVERY).map(([value, label]) => <option key={value} value={value}>{label}</option>)}
              </select>
              <button
                disabled={busyId === o.id}
                onClick={() => change(o.id, { paymentStatus: o.paymentStatus === 'paid' ? 'pending' : 'paid' })}
                className={`px-3 py-2 rounded-lg text-sm font-semibold border disabled:opacity-50 ${
                  o.paymentStatus === 'paid' ? 'bg-emerald-600 border-emerald-600 text-white' : 'bg-white border-stone-300 text-stone-700'
                }`}
              >
                {o.paymentStatus === 'paid' ? 'Төлсөн ✓' : 'Төлсөн гэж тэмдэглэх'}
              </button>
            </div>
          </li>
        ))}
      </ul>
    </div>
  );
}
