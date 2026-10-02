import { FormEvent, useEffect, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { Check, Loader2, Search } from 'lucide-react';
import { CatalogOrder } from '../types';
import { AddressSummary } from './AddressSummary';
import {
  formatCode,
  getCatalogOrder,
  normalizeCode,
  orderTotal,
  PAYMENT_LABELS,
  STATUS_FLOW,
  STATUS_LABELS,
  STATUS_STYLES,
} from '../lib/catalogOrders';

export function CatalogOrderLookup() {
  const [searchParams, setSearchParams] = useSearchParams();
  const [code, setCode] = useState(searchParams.get('code') || '');
  const [order, setOrder] = useState<CatalogOrder | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const lookup = async (raw: string) => {
    const normalized = normalizeCode(raw);
    if (normalized.length !== 8) {
      setError('Захиалгын код 8 тэмдэгттэй (жишээ нь K7Q2-9XMA).');
      return;
    }
    setLoading(true);
    setError('');
    setOrder(null);
    try {
      const found = await getCatalogOrder(normalized);
      if (!found) setError('Ийм кодтой захиалга олдсонгүй. Кодоо шалгаад дахин оролдоно уу.');
      setOrder(found);
      setSearchParams({ code: normalized }, { replace: true });
    } catch (err) {
      console.error('Catalog order lookup failed:', err);
      setError('Алдаа гарлаа. Дахин оролдоно уу.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (searchParams.get('code')) lookup(searchParams.get('code')!);
    // Only on first load: later searches go through the form
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const handleSubmit = (e: FormEvent) => {
    e.preventDefault();
    lookup(code);
  };

  const cancelled = order?.status === 'cancelled';
  const stepIndex = order ? STATUS_FLOW.indexOf(order.status) : -1;
  const total = order ? orderTotal(order) : null;

  return (
    <div className="bg-white p-6 sm:p-10 rounded-2xl sm:rounded-3xl shadow-sm border border-stone-200/90 space-y-6">
      <div className="text-center space-y-2">
        <h2 className="font-serif text-2xl sm:text-3xl font-bold text-stone-900 tracking-tight">Каталогийн захиалга шалгах</h2>
        <p className="text-stone-500 text-sm max-w-sm mx-auto">
          Захиалга өгөхөд олгосон 8 тэмдэгт бүхий кодоо оруулна уу.
        </p>
      </div>

      <form onSubmit={handleSubmit} className="flex flex-col sm:flex-row gap-3 max-w-md mx-auto">
        <input
          value={code}
          onChange={e => setCode(e.target.value.toUpperCase())}
          className="flex-1 px-4 py-3 rounded-xl border border-stone-300 text-base font-mono tracking-wider uppercase focus:outline-none focus:ring-2 focus:ring-stone-900"
          placeholder="XXXX-XXXX"
          autoCapitalize="characters"
          autoComplete="off"
          spellCheck={false}
          disabled={loading}
        />
        <button
          type="submit"
          disabled={loading}
          className="inline-flex items-center justify-center gap-2 bg-stone-900 text-white hover:bg-stone-800 px-6 py-3 rounded-xl font-semibold text-sm transition-colors disabled:opacity-70"
        >
          {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Search className="w-4 h-4" />}
          <span>Шалгах</span>
        </button>
      </form>
      {error && <p className="text-red-600 text-sm font-medium text-center" role="alert">{error}</p>}

      {order && (
        <div className="border-t border-stone-100 pt-6 space-y-6">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <p className="text-sm text-stone-500">Захиалга {formatCode(order.code)}</p>
              <p className="font-semibold text-stone-900">
                {order.productTitle} · {order.quantity} ш
                {total != null && <span className="tabular-nums"> · {total.toLocaleString()}₮</span>}
              </p>
            </div>
            <span className={`px-3 py-1 rounded-full text-sm font-semibold ${STATUS_STYLES[order.status]}`}>
              {STATUS_LABELS[order.status]}
            </span>
          </div>

          {!cancelled && (
            <ol className="grid grid-cols-2 sm:grid-cols-4 gap-x-3 gap-y-4">
              {STATUS_FLOW.map((status, i) => {
                const done = i <= stepIndex;
                return (
                  <li key={status} className="space-y-2">
                    <div className={`h-1.5 rounded-full ${done ? 'bg-amber-500' : 'bg-stone-200'}`}></div>
                    <p className={`text-xs sm:text-sm leading-tight ${done ? 'text-stone-900 font-semibold' : 'text-stone-400'}`}>
                      {done && i === stepIndex && <Check className="inline w-3.5 h-3.5 mr-0.5 -mt-0.5" />}
                      {status === 'delivered' && order.deliveryMethod === 'pickup' ? 'Хүлээн авсан' : STATUS_LABELS[status]}
                    </p>
                  </li>
                );
              })}
            </ol>
          )}

          <dl className="grid grid-cols-1 sm:grid-cols-2 gap-x-6 gap-y-3 text-sm">
            <div>
              <dt className="text-stone-500">Захиалсан</dt>
              <dd className="text-stone-900">{new Date(order.createdAt).toLocaleString('mn-MN')}</dd>
            </div>
            <div>
              <dt className="text-stone-500">Төлбөр</dt>
              <dd className="text-stone-900">{PAYMENT_LABELS[order.paymentStatus]}</dd>
            </div>
            <div className="sm:col-span-2">
              <dt className="text-stone-500">Хүлээн авах</dt>
              <dd className="text-stone-900">
                {order.deliveryMethod === 'pickup' ? 'Редакцаас очиж авна' : (
                  <AddressSummary city={order.city} district={order.district} khoroo={order.khoroo} detail={order.address} placeType={order.placeType} lat={order.lat} lng={order.lng} />
                )}
              </dd>
            </div>
          </dl>
        </div>
      )}
    </div>
  );
}
