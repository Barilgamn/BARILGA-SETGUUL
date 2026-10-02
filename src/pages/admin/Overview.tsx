import { Fragment, ReactNode, useEffect, useState } from 'react';
import { ArrowRight, BookOpen, CreditCard, Eye, Loader2, LogIn, Package, RefreshCw, ShoppingBag, UserPlus } from 'lucide-react';
import type { AdminTab } from '../Admin';
import { api } from '../../lib/purchases';

// «Тойм»: the admin's first screen. Who signed in, today's orders, what's
// paid and what's waiting, revenue and reader opens, with 14-day bars.
// Every figure opens the place where it can be acted on.

type Go = (tab: AdminTab, filter?: string) => void;

// Each kind of order: its admin tab and the filters for «waiting» and «paid»
const KINDS = [
  { key: 'purchases', label: 'Цахим дугаар', tab: 'digital_sales', waiting: 'pending', paid: 'paid' },
  { key: 'subscriptions', label: 'Сэтгүүлийн багц', tab: 'orders', waiting: 'unpaid', paid: '' },
  { key: 'catalog', label: '«Амины орон сууц» каталог', tab: 'catalog_orders', waiting: 'new', paid: '' },
  { key: 'prints', label: 'Хэвлэмэл дугаар', tab: 'magazine_orders', waiting: '', paid: '' },
] as const;

const scrollToId = (id: string) => document.getElementById(id)?.scrollIntoView({ behavior: 'smooth', block: 'start' });

interface Counts {
  purchases: number;
  subscriptions: number;
  catalog: number;
  prints: number;
}
interface Stats {
  generatedAt: number;
  users: {
    total: number;
    signedInToday: number;
    signedInWeek: number;
    newToday: number;
    newWeek: number;
    recent: { phone: string; email: string; name: string; at: number; isNew: boolean }[];
  };
  orders: { today: Counts; week: Counts; waiting: Counts; paid: Counts };
  revenue: { today: number; week: number; month: number };
  views: { today: number; week: number; month: number; topIssues: { title: string; count: number }[] } | null;
  days: { day: number; orders: number; views: number; signIns: number }[];
  recentPurchases: { id: string; title: string; amount: number; status: string; method: string; at: number; phone: string }[];
}

const sum = (c: Counts) => c.purchases + c.subscriptions + c.catalog + c.prints;
const money = (n: number) => `${n.toLocaleString()}₮`;
const day = (t: number) => new Date(t).toLocaleDateString('mn-MN', { month: 'numeric', day: 'numeric' });

function ago(ms: number): string {
  const minutes = Math.round((Date.now() - ms) / 60000);
  if (minutes < 1) return 'Дөнгөж сая';
  if (minutes < 60) return `${minutes} мин`;
  const hours = Math.round(minutes / 60);
  if (hours < 24) return `${hours} цаг`;
  return `${Math.round(hours / 24)} өдөр`;
}

function Tile({
  icon,
  label,
  value,
  sub,
  tone = 'ink',
  onClick,
  children,
}: {
  icon: ReactNode;
  label: string;
  value: ReactNode;
  sub?: ReactNode;
  tone?: 'ink' | 'amber';
  onClick?: () => void;
  children?: ReactNode;
}) {
  return (
    <div className="relative">
      <button
        type="button"
        onClick={onClick}
        className="group w-full h-full text-left bg-white rounded-2xl border border-stone-200 p-4 sm:p-5 hover:border-stone-900 hover:shadow-sm transition-colors"
      >
        <div className="flex items-center gap-2 text-sm text-stone-500">
          <span className={tone === 'amber' ? 'text-amber-600' : 'text-stone-400'}>{icon}</span>
          <span className="flex-1">{label}</span>
          <ArrowRight className="w-4 h-4 text-stone-300 group-hover:text-stone-900 transition-colors" />
        </div>
        <div className="mt-2 font-serif text-3xl font-bold text-stone-950 tabular-nums">{value}</div>
        {sub && <div className="mt-1 text-xs text-stone-500">{sub}</div>}
      </button>
      {children}
    </div>
  );
}

// One measure over 14 days: thin bars on a shared baseline, hover for the value
function DailyBars({ title, data, total, onOpen }: { title: string; data: { day: number; value: number }[]; total: string; onOpen: () => void }) {
  const [hover, setHover] = useState<number | null>(null);
  const max = Math.max(1, ...data.map(d => d.value));
  const shown = hover != null ? data[hover] : data[data.length - 1];
  return (
    <div className="bg-white rounded-2xl border border-stone-200 p-4 sm:p-5">
      <div className="flex items-baseline justify-between gap-2">
        <button type="button" onClick={onOpen} className="inline-flex items-center gap-1 text-sm font-semibold text-stone-800 hover:text-amber-700">
          {title} <ArrowRight className="w-3.5 h-3.5" />
        </button>
        <p className="text-xs text-stone-500">{total}</p>
      </div>
      <p className="mt-1 text-xs text-stone-500 h-4">
        {hover != null ? day(shown.day) : 'Өнөөдөр'}: <span className="font-semibold text-stone-900 tabular-nums">{shown.value}</span>
      </p>
      <div className="mt-3 h-24 flex items-end gap-[2px]" onMouseLeave={() => setHover(null)} role="img" aria-label={`${title}, сүүлийн 14 хоног`}>
        {data.map((d, i) => (
          <div
            key={d.day}
            onMouseEnter={() => setHover(i)}
            className="flex-1 h-full flex items-end cursor-default"
            title={`${day(d.day)}: ${d.value}`}
          >
            <div
              className={`w-full rounded-t-[4px] transition-colors ${hover === i ? 'bg-amber-500' : 'bg-stone-800'}`}
              style={{ height: d.value ? `${Math.max(4, (d.value / max) * 100)}%` : '2px', opacity: d.value ? 1 : 0.25 }}
            />
          </div>
        ))}
      </div>
      <div className="mt-1.5 flex justify-between text-[11px] text-stone-400">
        <span>{day(data[0].day)}</span>
        <span>{day(data[data.length - 1].day)}</span>
      </div>
    </div>
  );
}

function CountRow({ label, today, waiting, paid, open, openWaiting, openPaid }: {
  label: string;
  today: number;
  waiting: number;
  paid: number;
  open: () => void;
  openWaiting: () => void;
  openPaid: () => void;
}) {
  const cell = 'w-full text-right tabular-nums hover:underline underline-offset-4';
  return (
    <tr className="border-b border-stone-100 last:border-0">
      <td className="py-2.5 pr-3">
        <button type="button" onClick={open} className="text-left text-stone-800 hover:text-amber-700 hover:underline underline-offset-4">
          {label}
        </button>
      </td>
      <td className="py-2.5 px-3">
        <button type="button" onClick={open} className={`${cell} font-semibold text-stone-950`}>{today || '—'}</button>
      </td>
      <td className="py-2.5 px-3">
        <button type="button" onClick={openWaiting} className={`${cell} ${waiting ? 'font-semibold text-amber-700' : 'text-stone-400'}`}>
          {waiting || '—'}
        </button>
      </td>
      <td className="py-2.5 pl-3">
        <button type="button" onClick={openPaid} className={`${cell} text-stone-700`}>{paid || '—'}</button>
      </td>
    </tr>
  );
}

export function AdminOverview({ onNavigate }: { onNavigate: Go }) {
  const [waitingMenu, setWaitingMenu] = useState(false);
  const [stats, setStats] = useState<Stats | null>(null);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const load = async () => {
    setLoading(true);
    setError('');
    const { status, body } = await api('/api/admin/stats');
    setLoading(false);
    if (status === 200) setStats(body);
    else setError('Статистикийг авч чадсангүй.');
  };

  useEffect(() => {
    load();
  }, []);

  if (!stats) {
    return error ? (
      <p className="text-sm text-red-700">{error}</p>
    ) : (
      <div className="flex justify-center py-16">
        <Loader2 className="w-6 h-6 animate-spin text-stone-400" />
      </div>
    );
  }

  const { users, orders, revenue, views, days } = stats;
  const waitingTotal = sum(orders.waiting);
  const waitingKinds = KINDS.filter(k => orders.waiting[k.key] > 0);
  // One kind waiting: go straight there; several: let the admin pick
  const openWaiting = () => {
    if (waitingKinds.length === 1) onNavigate(waitingKinds[0].tab, waitingKinds[0].waiting);
    else if (waitingKinds.length > 1) setWaitingMenu(m => !m);
    else scrollToId('orders-by-kind');
  };

  return (
    <div className="space-y-6">
      <div className="flex items-end justify-between gap-3">
        <div>
          <h2 className="text-xl font-bold text-stone-900">Тойм</h2>
          <p className="text-sm text-stone-500 mt-1">
            {new Date(stats.generatedAt).toLocaleString('mn-MN')} байдлаар · «өнөөдөр» нь Улаанбаатарын цагаар
          </p>
        </div>
        <button type="button" onClick={load} disabled={loading} aria-label="Шинэчлэх" className="p-2.5 border border-stone-300 rounded-xl hover:bg-stone-50 disabled:opacity-50">
          <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
        </button>
      </div>

      {/* Headline numbers */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
        <Tile icon={<ShoppingBag className="w-4 h-4" />} label="Өнөөдрийн захиалга" value={sum(orders.today)} sub={`7 хоногт ${sum(orders.week)}`} onClick={() => scrollToId('orders-by-kind')} />
        <Tile
          icon={<CreditCard className="w-4 h-4" />}
          label="Хүлээгдэж буй"
          value={waitingTotal}
          sub="Төлбөр эсвэл баталгаажуулалт хүлээж буй"
          tone={waitingTotal ? 'amber' : 'ink'}
          onClick={openWaiting}
        >
          {waitingMenu && (
            <div className="absolute left-0 right-0 top-full mt-1 z-20 bg-white border border-stone-300 rounded-xl shadow-lg py-1">
              {waitingKinds.map(k => (
                <button
                  key={k.key}
                  type="button"
                  onClick={() => onNavigate(k.tab, k.waiting)}
                  className="w-full flex items-center justify-between gap-3 px-4 py-2.5 text-sm text-stone-800 hover:bg-stone-100"
                >
                  <span>{k.label}</span>
                  <span className="inline-flex items-center gap-1 font-semibold text-amber-700 tabular-nums">
                    {orders.waiting[k.key]} <ArrowRight className="w-3.5 h-3.5" />
                  </span>
                </button>
              ))}
            </div>
          )}
        </Tile>
        <Tile icon={<CreditCard className="w-4 h-4" />} label="Өнөөдрийн орлого" value={money(revenue.today)} sub={`7 хоног ${money(revenue.week)} · 30 хоног ${money(revenue.month)}`} onClick={() => scrollToId('orders-by-kind')} />
        <Tile
          icon={<Eye className="w-4 h-4" />}
          label="Өнөөдрийн үзэлт"
          value={views ? views.today : '—'}
          sub={views ? `7 хоногт ${views.week} · 30 хоногт ${views.month}` : 'Migration 0009 ажиллуулсны дараа тоолж эхэлнэ'}
          onClick={() => scrollToId('top-read')}
        />
        <Tile icon={<LogIn className="w-4 h-4" />} label="Өнөөдөр нэвтэрсэн" value={users.signedInToday} sub={`7 хоногт ${users.signedInWeek}`} onClick={() => onNavigate('users')} />
        <Tile icon={<UserPlus className="w-4 h-4" />} label="Шинэ хэрэглэгч" value={users.newToday} sub={`7 хоногт ${users.newWeek} · нийт ${users.total}`} onClick={() => onNavigate('users')} />
        <Tile icon={<BookOpen className="w-4 h-4" />} label="Худалдсан цахим дугаар" value={orders.paid.purchases} sub={`${orders.waiting.purchases} төлбөр хүлээж буй`} onClick={() => onNavigate('digital_sales', 'paid')} />
        <Tile icon={<Package className="w-4 h-4" />} label="Каталог (төлсөн)" value={orders.paid.catalog} sub={`${orders.waiting.catalog} шийдвэрлэх`} onClick={() => onNavigate('catalog_orders')} />
      </div>

      {/* 14 days, one chart per measure (different scales never share an axis) */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-3 sm:gap-4">
        <DailyBars title="Захиалга" data={days.map(d => ({ day: d.day, value: d.orders }))} total={`14 хоногт ${days.reduce((n, d) => n + d.orders, 0)}`} onOpen={() => scrollToId('orders-by-kind')} />
        <DailyBars title="Цахим ном үзэлт" data={days.map(d => ({ day: d.day, value: d.views }))} total={`14 хоногт ${days.reduce((n, d) => n + d.views, 0)}`} onOpen={() => scrollToId('top-read')} />
        <DailyBars title="Нэвтэрсэн хэрэглэгч" data={days.map(d => ({ day: d.day, value: d.signIns }))} total="өдөр бүрийн сүүлчийн нэвтрэлт" onOpen={() => onNavigate('users')} />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {/* Orders by kind */}
        <div id="orders-by-kind" className="scroll-mt-6 bg-white rounded-2xl border border-stone-200 p-4 sm:p-5">
          <p className="text-sm font-semibold text-stone-800 mb-2">Захиалга төрлөөр</p>
          <table className="w-full text-sm">
            <thead>
              <tr className="text-stone-500 border-b border-stone-200">
                <th className="py-2 pr-3 text-left font-medium">Төрөл</th>
                <th className="py-2 px-3 text-right font-medium">Өнөөдөр</th>
                <th className="py-2 px-3 text-right font-medium">Хүлээгдэж буй</th>
                <th className="py-2 pl-3 text-right font-medium">Төлсөн (нийт)</th>
              </tr>
            </thead>
            <tbody>
              {KINDS.map(k => (
                <Fragment key={k.key}>
                <CountRow
                  label={k.label}
                  today={orders.today[k.key]}
                  waiting={orders.waiting[k.key]}
                  paid={orders.paid[k.key]}
                  open={() => onNavigate(k.tab)}
                  openWaiting={() => onNavigate(k.tab, k.waiting)}
                  openPaid={() => onNavigate(k.tab, k.paid)}
                />
                </Fragment>
              ))}
            </tbody>
          </table>
        </div>

        {/* Most-read issues */}
        <div id="top-read" className="scroll-mt-6 bg-white rounded-2xl border border-stone-200 p-4 sm:p-5">
          <p className="text-sm font-semibold text-stone-800 mb-2">Их уншсан (30 хоног)</p>
          {!views ? (
            <p className="text-sm text-stone-500 py-4">Migration 0009 ажиллуулсны дараа үзэлт тоолж эхэлнэ.</p>
          ) : views.topIssues.length === 0 ? (
            <p className="text-sm text-stone-500 py-4">Одоогоор үзэлт бүртгэгдээгүй байна.</p>
          ) : (
            <ol className="space-y-2">
              {views.topIssues.map((t, i) => (
                <li key={t.title + i} className="flex items-center gap-3 text-sm">
                  <span className="w-5 text-right text-stone-400 tabular-nums">{i + 1}</span>
                  <span className="flex-1 min-w-0">
                    <span className="block truncate text-stone-900">{t.title}</span>
                    <span className="block h-1 mt-1 rounded-full bg-stone-100">
                      <span className="block h-1 rounded-full bg-stone-800" style={{ width: `${(t.count / views.topIssues[0].count) * 100}%` }} />
                    </span>
                  </span>
                  <span className="tabular-nums font-semibold text-stone-950">{t.count}</span>
                </li>
              ))}
            </ol>
          )}
        </div>

        {/* Recent sign-ins */}
        <div className="bg-white rounded-2xl border border-stone-200 p-4 sm:p-5">
          <div className="flex items-center justify-between mb-2">
            <p className="text-sm font-semibold text-stone-800">Сүүлд нэвтэрсэн</p>
            <button type="button" onClick={() => onNavigate('users')} className="inline-flex items-center gap-1 text-xs font-semibold text-stone-600 hover:text-amber-700">
              Бүх хэрэглэгч <ArrowRight className="w-3.5 h-3.5" />
            </button>
          </div>
          <ul className="divide-y divide-stone-100">
            {users.recent.map((u, i) => (
              <li key={i} className="py-2.5 flex items-center justify-between gap-3 text-sm">
                <span className="min-w-0">
                  <span className="block font-mono text-stone-900">{u.phone || u.email}</span>
                  {u.name && <span className="block text-xs text-stone-500 truncate">{u.name}</span>}
                </span>
                <span className="shrink-0 text-right">
                  {u.isNew && <span className="mr-2 text-[11px] font-semibold text-emerald-700">шинэ</span>}
                  <span className="text-xs text-stone-500">{ago(u.at)} өмнө</span>
                </span>
              </li>
            ))}
          </ul>
        </div>

        {/* Recent digital purchases */}
        <div className="bg-white rounded-2xl border border-stone-200 p-4 sm:p-5">
          <div className="flex items-center justify-between mb-2">
            <p className="text-sm font-semibold text-stone-800">Сүүлийн цахим худалдан авалт</p>
            <button type="button" onClick={() => onNavigate('digital_sales', 'all')} className="inline-flex items-center gap-1 text-xs font-semibold text-stone-600 hover:text-amber-700">
              Бүгд <ArrowRight className="w-3.5 h-3.5" />
            </button>
          </div>
          {stats.recentPurchases.length === 0 ? (
            <p className="text-sm text-stone-500 py-4">Одоогоор худалдан авалт алга.</p>
          ) : (
            <ul className="divide-y divide-stone-100">
              {stats.recentPurchases.map(p => (
                <li key={p.id} className="py-2.5 flex items-center justify-between gap-3 text-sm">
                  <span className="min-w-0">
                    <span className="block text-stone-900 truncate">{p.title}</span>
                    <span className="block text-xs text-stone-500 font-mono">
                      {p.phone || '—'} · {p.method === 'qpay' ? 'QPay' : 'Шилжүүлэг'} · {ago(p.at)} өмнө
                    </span>
                  </span>
                  <span className="shrink-0 text-right">
                    <span className="block tabular-nums font-semibold text-stone-950">{money(p.amount)}</span>
                    <span className={`block text-xs ${p.status === 'paid' ? 'text-emerald-700' : p.status === 'pending' ? 'text-amber-700' : 'text-stone-400'}`}>
                      {p.status === 'paid' ? '✓ Төлсөн' : p.status === 'pending' ? 'Хүлээгдэж буй' : 'Цуцалсан'}
                    </span>
                  </span>
                </li>
              ))}
            </ul>
          )}
        </div>
      </div>
    </div>
  );
}
