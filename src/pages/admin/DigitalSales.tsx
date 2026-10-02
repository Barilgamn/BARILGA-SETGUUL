import { useEffect, useMemo, useState } from 'react';
import { Check, Loader2, Search } from 'lucide-react';
import { BankSettings, Magazine, Purchase, PurchaseStatus } from '../../types';
import { fetchHeyzineMagazines } from '../../lib/heyzine';
import { formatCode } from '../../lib/catalogOrders';
import {
  adminSetPurchaseStatus,
  getBankSettings,
  getIssuePrices,
  PURCHASE_STATUS_LABELS,
  setBankSettings,
  setIssuePrice,
  watchAllPurchases,
} from '../../lib/purchases';

type Section = 'purchases' | 'prices' | 'bank';

export function AdminDigitalSales({ initialFilter = '' }: { initialFilter?: string }) {
  const [section, setSection] = useState<Section>('purchases');

  return (
    <div className="space-y-5">
      <div>
        <h1 className="font-serif text-2xl font-bold text-stone-900">Цахим борлуулалт</h1>
        <p className="text-sm text-stone-500">Төлбөртэй цахим дугаарууд, худалдан авалт, дансны мэдээлэл</p>
      </div>

      <div className="flex gap-2 overflow-x-auto hide-scrollbar -mx-4 px-4 sm:mx-0 sm:px-0">
        {([
          ['purchases', 'Худалдан авалт'],
          ['prices', 'Үнэ тохируулах'],
          ['bank', 'Банкны данс'],
        ] as const).map(([id, label]) => (
          <button
            key={id}
            onClick={() => setSection(id)}
            className={`shrink-0 px-4 py-2 rounded-full border text-sm font-semibold ${
              section === id ? 'bg-stone-900 border-stone-900 text-white' : 'bg-white border-stone-300 text-stone-700'
            }`}
          >
            {label}
          </button>
        ))}
      </div>

      {section === 'purchases' && <PurchasesSection initialFilter={initialFilter} />}
      {section === 'prices' && <PricesSection />}
      {section === 'bank' && <BankSection />}
    </div>
  );
}

function PurchasesSection({ initialFilter = '' }: { initialFilter?: string }) {
  const [purchases, setPurchases] = useState<Purchase[] | null>(null);
  const [error, setError] = useState('');
  const [filter, setFilter] = useState<PurchaseStatus | 'all'>(
    ['pending', 'paid', 'cancelled', 'all'].includes(initialFilter) ? (initialFilter as PurchaseStatus | 'all') : 'pending'
  );
  const [search, setSearch] = useState('');
  const [busyId, setBusyId] = useState<string | null>(null);

  useEffect(
    () =>
      watchAllPurchases(setPurchases, err => {
        console.error('Failed to load purchases:', err);
        setError('Худалдан авалтуудыг ачаалж чадсангүй.');
      }),
    []
  );

  const paidTotal = useMemo(
    () => (purchases || []).filter(p => p.status === 'paid').reduce((sum, p) => sum + p.amount, 0),
    [purchases]
  );

  const visible = useMemo(() => {
    const q = search.trim().toUpperCase();
    const qDigits = q.replace(/\D/g, '');
    return (purchases || []).filter(p => {
      if (filter !== 'all' && p.status !== filter) return false;
      if (!q) return true;
      return (
        p.id.includes(q.replace(/[^A-Z0-9]/g, '')) ||
        (qDigits.length >= 3 && p.phone.includes(qDigits)) ||
        p.issueTitle.toUpperCase().includes(q)
      );
    });
  }, [purchases, filter, search]);

  const setStatus = async (p: Purchase, status: 'paid' | 'cancelled' | 'pending') => {
    const question =
      status === 'paid'
        ? `${formatCode(p.id)} — ${p.amount.toLocaleString()}₮ төлбөр дансанд орсныг шалгасан уу? Баталгаажуулмагц уншигчид нээгдэнэ.`
        : status === 'cancelled'
          ? `${formatCode(p.id)} худалдан авалтыг цуцлах уу?`
          : `${formatCode(p.id)}-г дахин «хүлээгдэж буй» болгох уу? Уншигчийн эрх хаагдана.`;
    if (!window.confirm(question)) return;
    setBusyId(p.id);
    try {
      await adminSetPurchaseStatus(p.id, status);
    } catch (err) {
      console.error('Failed to update purchase:', err);
      alert('Хадгалж чадсангүй.');
    } finally {
      setBusyId(null);
    }
  };

  const counts = (s: PurchaseStatus | 'all') => (purchases || []).filter(p => s === 'all' || p.status === s).length;

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-2 gap-3">
        <div className="bg-white rounded-xl border border-stone-200 p-4">
          <p className="text-sm text-stone-500">Нийт орлого</p>
          <p className="text-xl font-bold text-stone-900 tabular-nums">{paidTotal.toLocaleString()}₮</p>
        </div>
        <div className="bg-white rounded-xl border border-stone-200 p-4">
          <p className="text-sm text-stone-500">Баталгаажуулах</p>
          <p className="text-xl font-bold text-amber-700 tabular-nums">{counts('pending')}</p>
        </div>
      </div>

      <div className="flex gap-2 overflow-x-auto hide-scrollbar -mx-4 px-4 sm:mx-0 sm:px-0">
        {(['pending', 'paid', 'cancelled', 'all'] as const).map(s => (
          <button
            key={s}
            onClick={() => setFilter(s)}
            className={`shrink-0 px-3.5 py-2 rounded-full border text-sm font-semibold ${
              filter === s ? 'bg-stone-900 border-stone-900 text-white' : 'bg-white border-stone-300 text-stone-700'
            }`}
          >
            {s === 'all' ? 'Бүгд' : PURCHASE_STATUS_LABELS[s]}
            <span className={`ml-1.5 tabular-nums ${filter === s ? 'text-stone-300' : 'text-stone-400'}`}>{counts(s)}</span>
          </button>
        ))}
      </div>

      <div className="relative">
        <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-stone-400" />
        <input
          type="search"
          value={search}
          onChange={e => setSearch(e.target.value)}
          placeholder="Нэхэмжлэхийн дугаар, утас, дугаарын нэр"
          className="w-full pl-10 pr-4 py-2.5 bg-white border border-stone-300 rounded-xl text-base sm:text-sm focus:outline-none focus:ring-2 focus:ring-stone-900"
        />
      </div>

      {error && <p className="text-sm text-red-600 bg-red-50 rounded-xl p-4">{error}</p>}
      {!purchases && !error && <div className="flex justify-center py-12"><Loader2 className="w-6 h-6 animate-spin text-stone-400" /></div>}
      {purchases && visible.length === 0 && (
        <p className="text-center text-stone-500 py-12 bg-white rounded-2xl border border-stone-200">Худалдан авалт алга.</p>
      )}

      <ul className="space-y-3">
        {visible.map(p => (
          <li key={p.id} className="bg-white rounded-2xl border border-stone-200 p-4 flex gap-3">
            <img src={p.coverImage} alt="" referrerPolicy="no-referrer" className="w-12 aspect-[3/4] object-cover rounded shrink-0 ring-1 ring-stone-200" />
            <div className="flex-1 min-w-0 space-y-1">
              <div className="flex flex-wrap items-center gap-2">
                <span className="font-mono text-sm font-bold text-stone-900">{p.id}</span>
                <span
                  className={`px-2 py-0.5 rounded-full text-xs font-semibold ${
                    p.status === 'paid' ? 'bg-emerald-100 text-emerald-800' : p.status === 'pending' ? 'bg-amber-100 text-amber-800' : 'bg-stone-200 text-stone-600'
                  }`}
                >
                  {PURCHASE_STATUS_LABELS[p.status]}
                </span>
                <span className="text-xs text-stone-500">{p.method === 'qpay' ? 'QPay' : 'Дансаар'}</span>
              </div>
              <p className="text-sm font-semibold text-stone-900 truncate">{p.issueTitle}</p>
              <p className="text-sm text-stone-500">
                <span className="tabular-nums font-semibold text-stone-900">{p.amount.toLocaleString()}₮</span>
                {' · '}
                <a href={`tel:${p.phone}`} className="hover:underline">{p.phone || '—'}</a>
                {' · '}
                {new Date(p.createdAt).toLocaleString('mn-MN')}
              </p>
              <div className="flex flex-wrap gap-2 pt-1">
                {p.status === 'pending' && (
                  <>
                    <button
                      disabled={busyId === p.id}
                      onClick={() => setStatus(p, 'paid')}
                      className="inline-flex items-center gap-1.5 px-3 py-2 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white text-sm font-semibold disabled:opacity-50"
                    >
                      <Check className="w-4 h-4" /> Төлбөр орсон
                    </button>
                    <button
                      disabled={busyId === p.id}
                      onClick={() => setStatus(p, 'cancelled')}
                      className="px-3 py-2 rounded-lg border border-stone-300 text-sm font-semibold text-stone-700 disabled:opacity-50"
                    >
                      Цуцлах
                    </button>
                  </>
                )}
                {p.status !== 'pending' && (
                  <button
                    disabled={busyId === p.id}
                    onClick={() => setStatus(p, 'pending')}
                    className="px-3 py-2 rounded-lg border border-stone-300 text-sm font-semibold text-stone-600 disabled:opacity-50"
                  >
                    Хүлээгдэж буй болгох
                  </button>
                )}
              </div>
            </div>
          </li>
        ))}
      </ul>
    </div>
  );
}

function PricesSection() {
  const [issues, setIssues] = useState<Magazine[] | null>(null);
  const [prices, setPrices] = useState<Map<string, number>>(new Map());
  const [drafts, setDrafts] = useState<Record<string, string>>({});
  const [savingId, setSavingId] = useState<string | null>(null);
  const [search, setSearch] = useState('');
  const [limit, setLimit] = useState(30);
  const [bulk, setBulk] = useState({ count: '6', price: '' });
  const [bulkBusy, setBulkBusy] = useState(false);

  const reloadPrices = () => getIssuePrices().then(setPrices);

  useEffect(() => {
    fetchHeyzineMagazines().then(items =>
      setIssues(items.filter(i => i.category === 'magazine').sort((a, b) => b.publishedDate - a.publishedDate))
    );
    reloadPrices();
  }, []);

  const visible = useMemo(() => {
    const q = search.trim().toLowerCase();
    return (issues || []).filter(i => !q || i.title.toLowerCase().includes(q));
  }, [issues, search]);

  const save = async (issue: Magazine, raw: string) => {
    const price = raw.trim() === '' ? null : Number(raw.replace(/\D/g, ''));
    setSavingId(issue.id);
    try {
      await setIssuePrice(issue, price);
      await reloadPrices();
      setDrafts(d => {
        const { [issue.id]: _, ...rest } = d;
        return rest;
      });
    } catch (err) {
      console.error('Failed to save price:', err);
      alert('Үнэ хадгалж чадсангүй.');
    } finally {
      setSavingId(null);
    }
  };

  const applyBulk = async () => {
    const count = Number(bulk.count);
    const price = Number(bulk.price.replace(/\D/g, ''));
    if (!issues || !count || !price) return;
    const targets = issues.slice(0, count);
    if (!window.confirm(`Сүүлийн ${targets.length} дугаарт ${price.toLocaleString()}₮ үнэ тавих уу?`)) return;
    setBulkBusy(true);
    try {
      await Promise.all(targets.map(issue => setIssuePrice(issue, price)));
      await reloadPrices();
    } catch (err) {
      console.error('Bulk price update failed:', err);
      alert('Зарим үнийг хадгалж чадсангүй.');
    } finally {
      setBulkBusy(false);
    }
  };

  const inputClass =
    'px-3 py-2 rounded-lg border border-stone-300 text-base sm:text-sm tabular-nums focus:outline-none focus:ring-2 focus:ring-stone-900';

  return (
    <div className="space-y-4">
      <div className="bg-amber-50 border border-amber-200 rounded-2xl p-4 space-y-3">
        <p className="text-sm font-semibold text-stone-900">Сүүлийн дугааруудад нэг дор үнэ тавих</p>
        <div className="flex flex-wrap items-center gap-2 text-sm text-stone-700">
          <span>Сүүлийн</span>
          <input
            inputMode="numeric"
            value={bulk.count}
            onChange={e => setBulk(b => ({ ...b, count: e.target.value.replace(/\D/g, '') }))}
            className={`${inputClass} w-16`}
            aria-label="Дугаарын тоо"
          />
          <span>дугаарт</span>
          <input
            inputMode="numeric"
            value={bulk.price}
            onChange={e => setBulk(b => ({ ...b, price: e.target.value.replace(/\D/g, '') }))}
            placeholder="Үнэ"
            className={`${inputClass} w-28`}
            aria-label="Үнэ"
          />
          <span>₮</span>
          <button
            onClick={applyBulk}
            disabled={bulkBusy || !bulk.price || !bulk.count}
            className="px-4 py-2 rounded-lg bg-stone-900 text-white text-sm font-semibold disabled:opacity-50"
          >
            {bulkBusy ? 'Хадгалж байна…' : 'Хэрэгжүүлэх'}
          </button>
        </div>
        <p className="text-xs text-stone-600">Үнийг хоосон болгосон дугаар үнэгүй уншигдана. Өөрчлөлт сайтад 30 секундын дотор хүрнэ.</p>
      </div>

      <div className="relative">
        <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-stone-400" />
        <input
          type="search"
          value={search}
          onChange={e => setSearch(e.target.value)}
          placeholder="Дугаар хайх (жишээ нь №185)"
          className="w-full pl-10 pr-4 py-2.5 bg-white border border-stone-300 rounded-xl text-base sm:text-sm focus:outline-none focus:ring-2 focus:ring-stone-900"
        />
      </div>

      {!issues ? (
        <div className="flex justify-center py-12"><Loader2 className="w-6 h-6 animate-spin text-stone-400" /></div>
      ) : (
        <ul className="bg-white rounded-2xl border border-stone-200 divide-y divide-stone-100">
          {visible.slice(0, limit).map(issue => {
            const current = prices.get(issue.id);
            const draft = drafts[issue.id];
            const value = draft ?? (current ? String(current) : '');
            const dirty = draft !== undefined && draft !== (current ? String(current) : '');
            return (
                <li key={issue.id} className="flex items-center gap-3 p-3">
                  <img src={issue.coverImage} alt="" loading="lazy" referrerPolicy="no-referrer" className="w-10 aspect-[3/4] object-cover rounded ring-1 ring-stone-200 shrink-0" />
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-semibold text-stone-900 truncate">{issue.title}</p>
                    <p className="text-xs text-stone-500">{current ? `${current.toLocaleString()}₮ · төлбөртэй` : 'Үнэгүй'}</p>
                  </div>
                  <input
                    inputMode="numeric"
                    value={value}
                    onChange={e => setDrafts(d => ({ ...d, [issue.id]: e.target.value.replace(/\D/g, '') }))}
                    placeholder="Үнэгүй"
                    aria-label={`${issue.title} үнэ`}
                    className={`${inputClass} w-24 sm:w-28`}
                  />
                  <button
                    onClick={() => save(issue, value)}
                    disabled={!dirty || savingId === issue.id}
                    className="px-3 py-2 rounded-lg bg-stone-900 text-white text-sm font-semibold disabled:opacity-30"
                  >
                    {savingId === issue.id ? '…' : 'Хадгалах'}
                  </button>
                </li>
            );
          })}
        </ul>
      )}
      {issues && visible.length > limit && (
        <button onClick={() => setLimit(l => l + 30)} className="w-full py-3 rounded-xl border border-stone-300 bg-white text-sm font-semibold text-stone-700">
          Цааш үзэх ({visible.length - limit})
        </button>
      )}
    </div>
  );
}

function BankSection() {
  const [form, setForm] = useState<BankSettings>({ bankName: '', accountNumber: '', accountName: '', iban: '' });
  const [loaded, setLoaded] = useState(false);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);

  useEffect(() => {
    getBankSettings().then(b => {
      if (b) setForm(b);
      setLoaded(true);
    });
  }, []);

  const handleSave = async () => {
    setSaving(true);
    setSaved(false);
    try {
      await setBankSettings({
        bankName: form.bankName.trim(),
        accountNumber: form.accountNumber.trim(),
        accountName: form.accountName.trim(),
        iban: (form.iban || '').replace(/\s+/g, '').toUpperCase(),
      });
      setSaved(true);
    } catch (err) {
      console.error('Failed to save bank settings:', err);
      alert('Хадгалж чадсангүй.');
    } finally {
      setSaving(false);
    }
  };

  if (!loaded) return <div className="flex justify-center py-12"><Loader2 className="w-6 h-6 animate-spin text-stone-400" /></div>;

  const field = (key: keyof BankSettings, label: string, placeholder: string) => (
    <label className="block space-y-1.5">
      <span className="text-sm font-semibold text-stone-800">{label}</span>
      <input
        value={form[key] || ''}
        onChange={e => {
          setSaved(false);
          setForm(f => ({ ...f, [key]: e.target.value }));
        }}
        placeholder={placeholder}
        className="w-full px-4 py-3 rounded-xl border border-stone-300 text-base focus:outline-none focus:ring-2 focus:ring-stone-900"
      />
    </label>
  );

  return (
    <div className="bg-white rounded-2xl border border-stone-200 p-5 sm:p-6 space-y-4 max-w-lg">
      <p className="text-sm text-stone-600">Нэхэмжлэх дээр харагдах данс. Худалдан авагч гүйлгээний утгад нэхэмжлэхийн дугаараа бичнэ.</p>
      {field('bankName', 'Банк', 'Хаан банк')}
      {field('accountNumber', 'Дансны дугаар', '5000 0000 00')}
      {field('iban', 'IBAN', 'MN91000500 5175009575')}
      {field('accountName', 'Хүлээн авагч', 'Барилга МН ХХК')}
      <div className="flex items-center gap-3">
        <button onClick={handleSave} disabled={saving} className="px-6 py-3 rounded-xl bg-stone-900 text-white text-sm font-semibold disabled:opacity-50">
          {saving ? 'Хадгалж байна…' : 'Хадгалах'}
        </button>
        {saved && <span className="text-sm text-emerald-700 font-medium">Хадгаллаа</span>}
      </div>
    </div>
  );
}
