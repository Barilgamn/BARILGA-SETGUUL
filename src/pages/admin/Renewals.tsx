import { useEffect, useState } from 'react';
import { BellRing, Check, Loader2, Mail, MessageSquare, X } from 'lucide-react';
import { api } from '../../lib/purchases';

// On «Багц захиалга»: renewal reminders due now (they also go out every
// morning on their own), a send-now button, and what was sent lately.

interface Due {
  subscriptionId: string;
  stage: 'soon' | 'last' | 'ended';
  name: string;
  plan: string;
  endDate: number;
  daysLeft: number;
  phone: string;
  email: string;
}
interface Sent {
  subscription_id: string;
  stage: Due['stage'];
  sent_at: number;
  sms: boolean;
  email: boolean;
}

const STAGES: Record<Due['stage'], string> = { soon: '14 хоног үлдсэн', last: '3 хоног үлдсэн', ended: 'Дууссан' };

export function RenewalReminders() {
  const [data, setData] = useState<{ due: Due[]; recent: Sent[]; cron: boolean; email: boolean } | null>(null);
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);
  const [open, setOpen] = useState(false);

  const load = async () => {
    const { status, body } = await api('/api/admin/renewals');
    if (status === 200) setData(body);
    else setError('Сунгалтын сануулгын мэдээллийг авч чадсангүй.');
  };
  useEffect(() => {
    load();
  }, []);

  const sendNow = async () => {
    if (!data?.due.length) return;
    if (!window.confirm(`${data.due.length} захиалагчид сунгах сануулга SMS болон и-мэйлээр илгээх үү?`)) return;
    setBusy(true);
    const { status, body } = await api('/api/admin/renewals', { method: 'POST' });
    setBusy(false);
    if (status === 200) alert(`${body.sent} захиалагчид илгээлээ.`);
    else alert('Илгээж чадсангүй.');
    load();
  };

  if (error) return <p className="text-sm text-red-700">{error}</p>;
  if (!data) return null;

  return (
    <div className="bg-white rounded-2xl border border-stone-200 p-4 sm:p-5 space-y-3">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-2">
          <BellRing className="w-5 h-5 text-amber-600" />
          <div>
            <p className="font-semibold text-stone-900">Сунгалтын сануулга</p>
            <p className="text-xs text-stone-500">
              Дуусахаас 14 ба 3 хоногийн өмнө, дууссан өдөр SMS болон и-мэйлээр.{' '}
              {data.cron ? 'Өдөр бүр 09:00-д автоматаар явна.' : 'Автомат илгээлт идэвхгүй (CRON_SECRET тохируулаагүй).'}
              {!data.email && ' И-мэйл тохиргоо хийгдээгүй.'}
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          {data.recent.length > 0 && (
            <button type="button" onClick={() => setOpen(o => !o)} className="text-xs font-semibold text-stone-600 hover:text-stone-950">
              {open ? 'Түүх нуух' : `Илгээсэн (${data.recent.length})`}
            </button>
          )}
          <button
            type="button"
            onClick={sendNow}
            disabled={busy || !data.due.length}
            className="inline-flex items-center gap-1.5 px-3 py-2 rounded-lg bg-stone-900 text-white text-xs font-semibold disabled:opacity-40"
          >
            {busy && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
            {data.due.length ? `Одоо илгээх · ${data.due.length}` : 'Илгээх сануулга алга'}
          </button>
        </div>
      </div>

      {data.due.length > 0 && (
        <ul className="divide-y divide-stone-100 text-sm">
          {data.due.map(d => (
            <li key={d.subscriptionId + d.stage} className="py-2 flex flex-wrap items-center justify-between gap-2">
              <span>
                <span className="font-semibold text-stone-900">{d.name || 'Нэргүй'}</span>
                <span className="text-stone-500"> · {d.phone || '—'}{d.email ? ` · ${d.email}` : ''}</span>
              </span>
              <span className={`text-xs font-semibold ${d.stage === 'ended' ? 'text-red-700' : 'text-amber-700'}`}>
                {STAGES[d.stage]} · {new Date(d.endDate).toLocaleDateString('mn-MN')}
              </span>
            </li>
          ))}
        </ul>
      )}

      {open && (
        <ul className="divide-y divide-stone-100 text-xs border-t border-stone-100 pt-2">
          {data.recent.map(r => (
            <li key={r.subscription_id + r.stage} className="py-1.5 flex items-center justify-between gap-2 text-stone-600">
              <span>
                {new Date(Number(r.sent_at)).toLocaleString('mn-MN')} · {STAGES[r.stage]}
              </span>
              <span className="flex items-center gap-3">
                <span className="inline-flex items-center gap-1">
                  <MessageSquare className="w-3.5 h-3.5" /> {r.sms ? <Check className="w-3.5 h-3.5 text-emerald-600" /> : <X className="w-3.5 h-3.5 text-stone-400" />}
                </span>
                <span className="inline-flex items-center gap-1">
                  <Mail className="w-3.5 h-3.5" /> {r.email ? <Check className="w-3.5 h-3.5 text-emerald-600" /> : <X className="w-3.5 h-3.5 text-stone-400" />}
                </span>
              </span>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
