import { Fragment, useEffect, useMemo, useState } from 'react';
import { ChevronDown, Download, Loader2, Phone, Search } from 'lucide-react';
import { CatalogOrder, CatalogOrderStatus } from '../../types';
import {
  formatCode,
  getCatalogPricing,
  orderTotal,
  PAYMENT_LABELS,
  setCatalogPricing,
  STATUS_LABELS,
  STATUS_STYLES,
  updateCatalogOrder,
  watchCatalogOrders,
} from '../../lib/catalogOrders';

const STATUSES = Object.keys(STATUS_LABELS) as CatalogOrderStatus[];

export function AdminCatalogOrders() {
  const [orders, setOrders] = useState<CatalogOrder[] | null>(null);
  const [error, setError] = useState('');
  const [filter, setFilter] = useState<CatalogOrderStatus | 'all'>('all');
  const [search, setSearch] = useState('');
  const [openCode, setOpenCode] = useState<string | null>(null);

  useEffect(
    () =>
      watchCatalogOrders(setOrders, err => {
        console.error('Failed to load catalog orders:', err);
        setError('Захиалгуудыг ачаалж чадсангүй. Админ эрхээр нэвтэрсэн эсэхээ шалгана уу.');
      }),
    []
  );

  const counts = useMemo(() => {
    const c = { all: 0 } as Record<CatalogOrderStatus | 'all', number>;
    STATUSES.forEach(s => (c[s] = 0));
    orders?.forEach(o => {
      c.all++;
      c[o.status]++;
    });
    return c;
  }, [orders]);

  const visible = useMemo(() => {
    const q = search.trim().toLowerCase();
    const qDigits = q.replace(/\D/g, '');
    const qCode = q.toUpperCase().replace(/[^A-Z0-9]/g, '');
    return (orders || []).filter(o => {
      if (filter !== 'all' && o.status !== filter) return false;
      if (!q) return true;
      return (
        o.fullName.toLowerCase().includes(q) ||
        (qDigits.length >= 3 && o.phone.includes(qDigits)) ||
        (qCode.length >= 3 && o.code.includes(qCode))
      );
    });
  }, [orders, filter, search]);

  const exportCsv = () => {
    const header = ['Код', 'Огноо', 'Нэр', 'Утас', 'Тоо', 'Нэгж үнэ', 'Хүргэлт', 'Нийт', 'Хүлээн авах', 'Дүүрэг', 'Хаяг', 'Тайлбар', 'Төлөв', 'Төлбөр', 'Админ тэмдэглэл'];
    const rows = visible.map(o => [
      formatCode(o.code),
      new Date(o.createdAt).toLocaleString('mn-MN'),
      o.fullName,
      o.phone,
      o.quantity,
      o.unitPrice ?? '',
      o.deliveryFee,
      orderTotal(o) ?? '',
      o.deliveryMethod === 'pickup' ? 'Очиж авна' : 'Хүргэлт',
      o.district,
      o.address,
      o.note,
      STATUS_LABELS[o.status],
      PAYMENT_LABELS[o.paymentStatus],
      o.adminNote || '',
    ]);
    const csv = [header, ...rows]
      .map(r => r.map(v => `"${String(v).replace(/"/g, '""')}"`).join(','))
      .join('\n');
    // BOM so Excel opens Cyrillic as UTF-8
    const blob = new Blob(['﻿' + csv], { type: 'text/csv;charset=utf-8' });
    const a = document.createElement('a');
    a.href = URL.createObjectURL(blob);
    a.download = `katalog-zahialga-${new Date().toISOString().slice(0, 10)}.csv`;
    a.click();
    URL.revokeObjectURL(a.href);
  };

  return (
    <div className="space-y-5">
      <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-3">
        <div>
          <h1 className="font-serif text-2xl font-bold text-stone-900">Каталогийн захиалга</h1>
          <p className="text-sm text-stone-500">«Амины орон сууц» каталог · бодит цагаар шинэчлэгдэнэ</p>
        </div>
        <PriceSetting />
      </div>

      <div className="flex overflow-x-auto hide-scrollbar gap-2 -mx-4 px-4 sm:mx-0 sm:px-0">
        {(['all', ...STATUSES] as const).map(s => (
          <button
            key={s}
            onClick={() => setFilter(s)}
            className={`shrink-0 whitespace-nowrap px-3.5 py-2 rounded-full border text-sm font-semibold transition-colors ${
              filter === s ? 'bg-stone-900 border-stone-900 text-white' : 'bg-white border-stone-300 text-stone-700 hover:border-stone-500'
            }`}
          >
            {s === 'all' ? 'Бүгд' : STATUS_LABELS[s]}
            <span className={`ml-1.5 tabular-nums ${filter === s ? 'text-stone-300' : 'text-stone-400'}`}>{counts[s]}</span>
          </button>
        ))}
      </div>

      <div className="flex gap-2">
        <div className="relative flex-1">
          <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-stone-400" />
          <input
            type="search"
            value={search}
            onChange={e => setSearch(e.target.value)}
            placeholder="Нэр, утас, кодоор хайх"
            className="w-full pl-10 pr-4 py-2.5 bg-white border border-stone-300 rounded-xl text-base sm:text-sm focus:outline-none focus:ring-2 focus:ring-stone-900"
          />
        </div>
        <button
          onClick={exportCsv}
          disabled={!visible.length}
          className="inline-flex items-center gap-2 px-4 rounded-xl border border-stone-300 bg-white text-sm font-semibold text-stone-800 hover:bg-stone-50 disabled:opacity-40"
        >
          <Download className="w-4 h-4" />
          <span className="hidden sm:inline">Excel</span>
        </button>
      </div>

      {error && <p className="text-sm font-medium text-red-600 bg-red-50 rounded-xl p-4">{error}</p>}

      {!orders && !error && (
        <div className="flex justify-center py-16">
          <Loader2 className="w-6 h-6 animate-spin text-stone-400" />
        </div>
      )}

      {orders && visible.length === 0 && (
        <p className="text-center text-stone-500 py-16 bg-white rounded-2xl border border-stone-200">
          {orders.length === 0 ? 'Одоогоор захиалга ирээгүй байна.' : 'Шүүлтэд тохирох захиалга алга.'}
        </p>
      )}

      <ul className="space-y-3">
        {visible.map(order => (
          <Fragment key={order.code}>
            <OrderRow
              order={order}
              open={openCode === order.code}
              onToggle={() => setOpenCode(c => (c === order.code ? null : order.code))}
            />
          </Fragment>
        ))}
      </ul>
    </div>
  );
}

function OrderRow({ order, open, onToggle }: { order: CatalogOrder; open: boolean; onToggle: () => void }) {
  const [saving, setSaving] = useState(false);
  const [note, setNote] = useState(order.adminNote || '');
  const total = orderTotal(order);

  useEffect(() => setNote(order.adminNote || ''), [order.adminNote]);

  const save = async (changes: Parameters<typeof updateCatalogOrder>[1]) => {
    setSaving(true);
    try {
      await updateCatalogOrder(order.code, changes);
    } catch (err) {
      console.error('Failed to update order:', err);
      alert('Хадгалж чадсангүй.');
    } finally {
      setSaving(false);
    }
  };

  return (
    <li className={`bg-white rounded-2xl border shadow-sm ${order.status === 'new' ? 'border-amber-300' : 'border-stone-200'}`}>
      <button onClick={onToggle} className="w-full text-left p-4 sm:p-5 flex items-start gap-3" aria-expanded={open}>
        <div className="flex-1 min-w-0 space-y-1">
          <div className="flex flex-wrap items-center gap-2">
            <span className="font-mono text-sm font-bold text-stone-900">{formatCode(order.code)}</span>
            <span className={`px-2 py-0.5 rounded-full text-xs font-semibold ${STATUS_STYLES[order.status]}`}>
              {STATUS_LABELS[order.status]}
            </span>
            <span
              className={`px-2 py-0.5 rounded-full text-xs font-semibold ${
                order.paymentStatus === 'paid' ? 'bg-emerald-50 text-emerald-700' : 'bg-red-50 text-red-700'
              }`}
            >
              {PAYMENT_LABELS[order.paymentStatus]}
            </span>
          </div>
          <p className="font-semibold text-stone-900 truncate">{order.fullName}</p>
          <p className="text-sm text-stone-500">
            {order.quantity} ш{total != null && <span className="tabular-nums"> · {total.toLocaleString()}₮</span>}
            {' · '}
            {order.deliveryMethod === 'pickup' ? 'Очиж авна' : `${order.district}${order.deliveryFee ? ` · хүргэлт ${order.deliveryFee.toLocaleString()}₮` : ''}`}
            {' · '}
            {new Date(order.createdAt).toLocaleDateString('mn-MN')}
          </p>
        </div>
        <ChevronDown className={`w-5 h-5 text-stone-400 shrink-0 mt-1 transition-transform ${open ? 'rotate-180' : ''}`} />
      </button>

      {open && (
        <div className="border-t border-stone-100 p-4 sm:p-5 space-y-5">
          <dl className="grid grid-cols-1 sm:grid-cols-2 gap-x-6 gap-y-3 text-sm">
            <div>
              <dt className="text-stone-500">Утас</dt>
              <dd>
                <a href={`tel:${order.phone}`} className="inline-flex items-center gap-1.5 font-semibold text-stone-900 hover:underline">
                  <Phone className="w-3.5 h-3.5" />
                  {order.phone}
                </a>
              </dd>
            </div>
            <div>
              <dt className="text-stone-500">Захиалсан</dt>
              <dd className="text-stone-900">{new Date(order.createdAt).toLocaleString('mn-MN')}</dd>
            </div>
            <div className="sm:col-span-2">
              <dt className="text-stone-500">Хүлээн авах</dt>
              <dd className="text-stone-900">
                {order.deliveryMethod === 'pickup' ? 'Редакцаас очиж авна' : `${order.district} дүүрэг, ${order.address}`}
              </dd>
            </div>
            {order.note && (
              <div className="sm:col-span-2">
                <dt className="text-stone-500">Захиалагчийн тайлбар</dt>
                <dd className="text-stone-900 whitespace-pre-wrap">{order.note}</dd>
              </div>
            )}
          </dl>

          <div className="space-y-2">
            <p className="text-sm font-semibold text-stone-800">Төлөв</p>
            <div className="flex flex-wrap gap-2">
              {STATUSES.map(s => (
                <button
                  key={s}
                  disabled={saving || order.status === s}
                  onClick={() => save({ status: s })}
                  className={`px-3 py-2 rounded-lg text-sm font-semibold border transition-colors ${
                    order.status === s ? 'bg-stone-900 border-stone-900 text-white' : 'bg-white border-stone-300 text-stone-700 hover:border-stone-500 disabled:opacity-50'
                  }`}
                >
                  {STATUS_LABELS[s]}
                </button>
              ))}
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-3">
            <p className="text-sm font-semibold text-stone-800">Төлбөр</p>
            <button
              disabled={saving}
              onClick={() => save({ paymentStatus: order.paymentStatus === 'paid' ? 'unpaid' : 'paid' })}
              className={`px-3 py-2 rounded-lg text-sm font-semibold border disabled:opacity-50 ${
                order.paymentStatus === 'paid' ? 'bg-emerald-600 border-emerald-600 text-white' : 'bg-white border-stone-300 text-stone-700'
              }`}
            >
              {order.paymentStatus === 'paid' ? 'Төлсөн ✓' : 'Төлсөн гэж тэмдэглэх'}
            </button>
          </div>

          <div className="space-y-2">
            <label htmlFor={`note-${order.code}`} className="text-sm font-semibold text-stone-800 block">
              Дотоод тэмдэглэл <span className="font-normal text-stone-400">(захиалагч харахгүй)</span>
            </label>
            <textarea
              id={`note-${order.code}`}
              rows={2}
              value={note}
              onChange={e => setNote(e.target.value)}
              className="w-full px-3 py-2 rounded-xl border border-stone-300 text-base sm:text-sm focus:outline-none focus:ring-2 focus:ring-stone-900"
            />
            {note !== (order.adminNote || '') && (
              <button
                disabled={saving}
                onClick={() => save({ adminNote: note.trim() })}
                className="px-4 py-2 rounded-lg bg-stone-900 text-white text-sm font-semibold disabled:opacity-50"
              >
                Тэмдэглэл хадгалах
              </button>
            )}
          </div>
        </div>
      )}
    </li>
  );
}

function PriceSetting() {
  const [price, setPrice] = useState('');
  const [fee, setFee] = useState('');
  const [saved, setSaved] = useState<{ price: string; fee: string } | null>(null);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    getCatalogPricing().then(p => {
      const initial = { price: p.price == null ? '' : String(p.price), fee: String(p.deliveryFee || '') };
      setSaved(initial);
      setPrice(initial.price);
      setFee(initial.fee);
    });
  }, []);

  const dirty = saved !== null && (price !== saved.price || fee !== saved.fee);

  const handleSave = async () => {
    setBusy(true);
    try {
      await setCatalogPricing({ price: price === '' ? null : Number(price), deliveryFee: Number(fee || 0) });
      setSaved({ price, fee });
    } catch (err) {
      console.error('Failed to save price:', err);
      alert('Үнэ хадгалж чадсангүй.');
    } finally {
      setBusy(false);
    }
  };

  const field = (id: string, label: string, value: string, set: (v: string) => void, placeholder: string) => (
    <label htmlFor={id} className="flex items-center gap-2">
      <span className="text-sm text-stone-600 whitespace-nowrap">{label}</span>
      <span className="relative">
        <input
          id={id}
          inputMode="numeric"
          value={value}
          onChange={e => set(e.target.value.replace(/\D/g, ''))}
          placeholder={placeholder}
          className="w-28 pl-3 pr-7 py-2 rounded-lg border border-stone-300 text-base sm:text-sm tabular-nums focus:outline-none focus:ring-2 focus:ring-stone-900"
        />
        <span className="absolute right-3 top-1/2 -translate-y-1/2 text-sm text-stone-400">₮</span>
      </span>
    </label>
  );

  return (
    <div className="flex flex-wrap items-center gap-3">
      {field('catalog-price', 'Каталогийн үнэ', price, setPrice, 'Тохируулаагүй')}
      {field('catalog-delivery-fee', 'Хүргэлт', fee, setFee, '0')}
      {dirty && (
        <button onClick={handleSave} disabled={busy} className="px-3 py-2 rounded-lg bg-stone-900 text-white text-sm font-semibold disabled:opacity-50">
          Хадгалах
        </button>
      )}
    </div>
  );
}
