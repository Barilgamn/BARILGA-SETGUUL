import { useEffect, useMemo, useState } from 'react';
import { Bell, Loader2, RefreshCw, Search } from 'lucide-react';
import { api } from '../../lib/purchases';

// Everyone with an account, most recently signed in first, with what the
// admin needs to recognise them: name, phone, email, purchases, alerts.

interface UserRow {
  id: string;
  phone: string;
  email: string;
  name: string;
  notify: boolean;
  purchases: number;
  createdAt: number | null;
  lastSignInAt: number | null;
}

function ago(ms: number | null): string {
  if (!ms) return '—';
  const minutes = Math.round((Date.now() - ms) / 60000);
  if (minutes < 1) return 'Дөнгөж сая';
  if (minutes < 60) return `${minutes} минутын өмнө`;
  const hours = Math.round(minutes / 60);
  if (hours < 24) return `${hours} цагийн өмнө`;
  const days = Math.round(hours / 24);
  if (days < 30) return `${days} өдрийн өмнө`;
  return new Date(ms).toLocaleDateString('mn-MN');
}

export function AdminUsers() {
  const [users, setUsers] = useState<UserRow[] | null>(null);
  const [error, setError] = useState('');
  const [query, setQuery] = useState('');

  const load = async () => {
    setError('');
    const { status, body } = await api('/api/admin/users');
    if (status === 200) setUsers(body);
    else setError('Хэрэглэгчдийн жагсаалтыг авч чадсангүй.');
  };

  useEffect(() => {
    load();
  }, []);

  const visible = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!users) return [];
    return q ? users.filter(u => [u.name, u.phone, u.email].some(v => v.toLowerCase().includes(q))) : users;
  }, [users, query]);

  const activeWeek = users?.filter(u => u.lastSignInAt && Date.now() - u.lastSignInAt < 7 * 864e5).length ?? 0;
  const subscribed = users?.filter(u => u.notify).length ?? 0;

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h2 className="text-xl font-bold text-stone-900">Хэрэглэгчид</h2>
          {users && (
            <p className="text-sm text-stone-500 mt-1">
              Нийт {users.length} · сүүлийн 7 хоногт {activeWeek} нэвтэрсэн · {subscribed} нь шинэ дугаарын и-мэйл авна
            </p>
          )}
        </div>
        <div className="flex items-center gap-2">
          <label className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-stone-400" />
            <input
              value={query}
              onChange={e => setQuery(e.target.value)}
              placeholder="Нэр, утас, и-мэйл"
              className="pl-9 pr-3 py-2.5 border border-stone-300 rounded-xl text-sm w-56 focus:outline-none focus:ring-2 focus:ring-stone-900"
            />
          </label>
          <button type="button" onClick={load} aria-label="Шинэчлэх" className="p-2.5 border border-stone-300 rounded-xl hover:bg-stone-50">
            <RefreshCw className="w-4 h-4" />
          </button>
        </div>
      </div>

      {error && <p className="text-sm text-red-700">{error}</p>}
      {!users && !error && (
        <div className="flex justify-center py-12">
          <Loader2 className="w-6 h-6 animate-spin text-stone-400" />
        </div>
      )}

      {users && (
        <div className="bg-white rounded-2xl border border-stone-200 overflow-x-auto">
          <table className="w-full text-sm min-w-[720px]">
            <thead>
              <tr className="text-left text-stone-500 border-b border-stone-200 bg-stone-50">
                <th className="px-4 py-3 font-medium">Хэрэглэгч</th>
                <th className="px-4 py-3 font-medium">Утас</th>
                <th className="px-4 py-3 font-medium">И-мэйл</th>
                <th className="px-4 py-3 font-medium">Сүүлд нэвтэрсэн</th>
                <th className="px-4 py-3 font-medium">Бүртгүүлсэн</th>
                <th className="px-4 py-3 font-medium text-right">Худалдан авалт</th>
              </tr>
            </thead>
            <tbody>
              {visible.length === 0 ? (
                <tr>
                  <td colSpan={6} className="text-center py-10 text-stone-500">Хэрэглэгч олдсонгүй</td>
                </tr>
              ) : (
                visible.map(u => (
                  <tr key={u.id} className="border-b border-stone-100 last:border-0">
                    <td className="px-4 py-3">
                      <span className="font-semibold text-stone-900">{u.name || <span className="text-stone-400 font-normal">Нэргүй</span>}</span>
                      {u.notify && (
                        <span title="Шинэ дугаарын и-мэйл авна" className="ml-2 inline-flex align-middle text-amber-600">
                          <Bell className="w-3.5 h-3.5" />
                        </span>
                      )}
                    </td>
                    <td className="px-4 py-3 font-mono text-stone-800">{u.phone || '—'}</td>
                    <td className="px-4 py-3 text-stone-700 break-all">{u.email || '—'}</td>
                    <td className="px-4 py-3 text-stone-800" title={u.lastSignInAt ? new Date(u.lastSignInAt).toLocaleString('mn-MN') : ''}>
                      {ago(u.lastSignInAt)}
                    </td>
                    <td className="px-4 py-3 text-stone-500">{u.createdAt ? new Date(u.createdAt).toLocaleDateString('mn-MN') : '—'}</td>
                    <td className="px-4 py-3 text-right tabular-nums font-semibold text-stone-900">{u.purchases || '—'}</td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
