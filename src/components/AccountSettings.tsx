import { FormEvent, ReactNode, useEffect, useState } from 'react';
import { Bell, Check, Loader2, Mail, Pencil, Phone, User } from 'lucide-react';
import { displayPhone, useAuth } from '../contexts/AuthContext';
import { fullName, getMyProfile, MyProfile, saveMyProfile, startPhoneChange, verifyPhoneChange } from '../lib/account';

// «Миний мэдээлэл» on the profile page: name, contact email, the login phone
// (changed with an SMS code) and whether to get an SMS when a new issue is out.

const input =
  'w-full px-4 py-3 bg-white border border-stone-300 text-base text-stone-950 placeholder:text-stone-400 focus:outline-none focus:border-stone-950 focus:ring-2 focus:ring-stone-950/10';

function Field({ label, children }: { label: string; children: ReactNode }) {
  return (
    <label className="block space-y-1.5">
      <span className="text-sm font-semibold text-stone-800">{label}</span>
      {children}
    </label>
  );
}

const PHONE_ERRORS: Record<string, string> = {
  'bad-phone': '8 оронтой гар утасны дугаар оруулна уу.',
  'same-phone': 'Энэ нь таны одоогийн дугаар байна.',
  wait: 'Түр хүлээгээд дахин илгээнэ үү.',
  'wrong-code': 'Код буруу байна.',
  expired: 'Кодын хугацаа дууссан. Дахин илгээнэ үү.',
  'too-many': 'Олон удаа буруу оруулсан. Дахин код илгээнэ үү.',
  'phone-taken': 'Энэ дугаараар өөр хэрэглэгч бүртгэлтэй байна.',
};

function PhoneChange({ onDone }: { onDone: () => void }) {
  const [phone, setPhone] = useState('');
  const [code, setCode] = useState('');
  const [sent, setSent] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');

  const send = async () => {
    setBusy(true);
    setError('');
    const { status, body } = await startPhoneChange(phone);
    setBusy(false);
    if (status === 200) setSent(true);
    else setError(body.error === 'wait' ? `${body.retryIn} секундын дараа дахин илгээнэ үү.` : PHONE_ERRORS[body.error] || 'Код илгээж чадсангүй.');
  };

  const verify = async () => {
    setBusy(true);
    setError('');
    const { status, body } = await verifyPhoneChange(code);
    setBusy(false);
    if (status === 200) onDone();
    else setError(PHONE_ERRORS[body.error] || 'Баталгаажуулж чадсангүй.');
  };

  return (
    <div className="border border-stone-300 bg-stone-50 p-4 space-y-3">
      {!sent ? (
        <>
          <Field label="Шинэ утасны дугаар">
            <input className={input} type="tel" inputMode="numeric" value={phone} onChange={e => setPhone(e.target.value)} placeholder="99112233" />
          </Field>
          <button type="button" onClick={send} disabled={busy || phone.replace(/\D/g, '').length < 8} className="px-5 py-2.5 bg-stone-950 text-white text-sm font-semibold disabled:opacity-50 inline-flex items-center gap-2">
            {busy && <Loader2 className="w-4 h-4 animate-spin" />} Код илгээх
          </button>
        </>
      ) : (
        <>
          <p className="text-sm text-stone-700">{phone} дугаар руу 6 оронтой код илгээлээ.</p>
          <Field label="Баталгаажуулах код">
            <input className={`${input} tracking-[0.4em] font-mono`} inputMode="numeric" maxLength={6} value={code} onChange={e => setCode(e.target.value.replace(/\D/g, ''))} placeholder="••••••" />
          </Field>
          <div className="flex flex-wrap gap-2">
            <button type="button" onClick={verify} disabled={busy || code.length !== 6} className="px-5 py-2.5 bg-stone-950 text-white text-sm font-semibold disabled:opacity-50 inline-flex items-center gap-2">
              {busy && <Loader2 className="w-4 h-4 animate-spin" />} Баталгаажуулах
            </button>
            <button type="button" onClick={send} disabled={busy} className="px-4 py-2.5 border border-stone-300 text-sm font-semibold text-stone-700 hover:border-stone-950">
              Дахин илгээх
            </button>
          </div>
        </>
      )}
      {error && <p className="text-sm text-red-700">{error}</p>}
    </div>
  );
}

export function AccountSettings() {
  const { user } = useAuth();
  const [saved, setSaved] = useState<MyProfile | null>(null);
  const [form, setForm] = useState<MyProfile | null>(null);
  const [editing, setEditing] = useState(false);
  const [changingPhone, setChangingPhone] = useState(false);
  const [saving, setSaving] = useState(false);
  const [notice, setNotice] = useState('');
  const [error, setError] = useState('');

  useEffect(() => {
    if (!user) return;
    getMyProfile(user.id)
      .then(p => {
        setSaved(p);
        setForm(p);
        // A new account starts with its details open
        if (!fullName(p)) setEditing(true);
      })
      .catch(err => {
        console.error('Could not load profile:', err);
        const blank = { lastName: '', firstName: '', email: '', notifyNewIssue: false };
        setSaved(blank);
        setForm(blank);
      });
  }, [user]);

  if (!user || !form || !saved) {
    return (
      <section className="bg-white border border-stone-200 p-6 flex justify-center">
        <Loader2 className="w-5 h-5 animate-spin text-stone-400" />
      </section>
    );
  }

  const phone = displayPhone(user);
  const set = (patch: Partial<MyProfile>) => setForm(f => ({ ...f!, ...patch }));

  const save = async (e?: FormEvent, next: MyProfile = form) => {
    e?.preventDefault();
    if (next.email && !/^\S+@\S+\.\S+$/.test(next.email.trim())) return setError('И-мэйл хаяг буруу байна.');
    setSaving(true);
    setError('');
    try {
      await saveMyProfile(user.id, next);
      setSaved(next);
      setForm(next);
      setEditing(false);
      setNotice('Хадгаллаа');
      setTimeout(() => setNotice(''), 2500);
    } catch (err) {
      console.error('Could not save profile:', err);
      setError('Хадгалж чадсангүй. Дахин оролдоно уу.');
    } finally {
      setSaving(false);
    }
  };

  return (
    <section className="bg-white border border-stone-200 shadow-sm">
      <header className="flex items-center justify-between gap-3 px-5 sm:px-6 py-4 border-b border-stone-200">
        <h2 className="font-serif text-xl font-bold text-stone-950">Миний мэдээлэл</h2>
        <div className="flex items-center gap-3">
          {notice && (
            <span className="text-sm text-emerald-700 font-semibold inline-flex items-center gap-1">
              <Check className="w-4 h-4" /> {notice}
            </span>
          )}
          {!editing && (
            <button type="button" onClick={() => setEditing(true)} className="inline-flex items-center gap-1.5 px-3 py-2 border border-stone-300 text-sm font-semibold text-stone-800 hover:border-stone-950">
              <Pencil className="w-4 h-4" /> Засах
            </button>
          )}
        </div>
      </header>

      {!editing ? (
        <dl className="grid grid-cols-1 sm:grid-cols-2 gap-x-6 gap-y-4 px-5 sm:px-6 py-5 text-sm">
          <div className="flex gap-3">
            <User className="w-4 h-4 text-stone-400 mt-0.5 shrink-0" />
            <div>
              <dt className="text-stone-500">Овог, нэр</dt>
              <dd className="font-semibold text-stone-950">{fullName(saved) || '—'}</dd>
            </div>
          </div>
          <div className="flex gap-3">
            <Phone className="w-4 h-4 text-stone-400 mt-0.5 shrink-0" />
            <div>
              <dt className="text-stone-500">Утас (нэвтрэх дугаар)</dt>
              <dd className="font-semibold text-stone-950 font-mono">{phone || '—'}</dd>
            </div>
          </div>
          <div className="flex gap-3">
            <Mail className="w-4 h-4 text-stone-400 mt-0.5 shrink-0" />
            <div>
              <dt className="text-stone-500">И-мэйл</dt>
              <dd className="font-semibold text-stone-950 break-all">{saved.email || user.email || '—'}</dd>
            </div>
          </div>
          <div className="flex gap-3">
            <Bell className="w-4 h-4 text-stone-400 mt-0.5 shrink-0" />
            <div>
              <dt className="text-stone-500">Шинэ дугаарын мэдэгдэл</dt>
              <dd className="flex items-center gap-3">
                <span className="font-semibold text-stone-950">{saved.notifyNewIssue ? 'SMS-ээр авна' : 'Авахгүй'}</span>
                <button
                  type="button"
                  disabled={saving}
                  onClick={() => save(undefined, { ...saved, notifyNewIssue: !saved.notifyNewIssue })}
                  className="text-xs font-semibold text-amber-700 hover:underline disabled:opacity-50"
                >
                  {saved.notifyNewIssue ? 'Унтраах' : 'Асаах'}
                </button>
              </dd>
            </div>
          </div>
        </dl>
      ) : (
        <form onSubmit={save} className="px-5 sm:px-6 py-5 space-y-5">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <Field label="Овог">
              <input className={input} value={form.lastName} onChange={e => set({ lastName: e.target.value })} maxLength={60} autoComplete="family-name" placeholder="Бат" />
            </Field>
            <Field label="Нэр">
              <input className={input} value={form.firstName} onChange={e => set({ firstName: e.target.value })} maxLength={60} autoComplete="given-name" placeholder="Болд" />
            </Field>
            <Field label="И-мэйл">
              <input className={input} type="email" value={form.email} onChange={e => set({ email: e.target.value })} maxLength={120} autoComplete="email" placeholder="name@company.mn" />
            </Field>
            <div className="space-y-1.5">
              <span className="text-sm font-semibold text-stone-800 block">Утас (нэвтрэх дугаар)</span>
              <div className="flex items-center gap-2">
                <p className={`${input} font-mono bg-stone-50`}>{phone || '—'}</p>
                {!changingPhone && (
                  <button type="button" onClick={() => setChangingPhone(true)} className="shrink-0 px-4 py-3 border border-stone-300 text-sm font-semibold text-stone-800 hover:border-stone-950">
                    Солих
                  </button>
                )}
              </div>
            </div>
          </div>

          {changingPhone && (
            <PhoneChange
              onDone={() => {
                setChangingPhone(false);
                setNotice('Утасны дугаар солигдлоо');
                setTimeout(() => setNotice(''), 3000);
              }}
            />
          )}

          <label className="flex items-start gap-3 border border-stone-300 p-4 cursor-pointer has-[:checked]:border-stone-950 has-[:checked]:bg-stone-50">
            <input
              type="checkbox"
              checked={form.notifyNewIssue}
              onChange={e => set({ notifyNewIssue: e.target.checked })}
              className="mt-0.5 h-5 w-5 accent-stone-950"
            />
            <span>
              <span className="block text-sm font-semibold text-stone-950">Шинэ дугаар гармагц SMS-ээр мэдэгдэх</span>
              <span className="block text-xs text-stone-500 mt-0.5">Барилга МН сэтгүүлийн шинэ дугаар гарах бүрт нэг SMS. Хүссэн үедээ унтраана.</span>
            </span>
          </label>

          {error && <p className="text-sm text-red-700">{error}</p>}
          <div className="flex flex-wrap gap-2">
            <button type="submit" disabled={saving} className="px-6 py-3 bg-stone-950 text-white text-sm font-semibold disabled:opacity-50 inline-flex items-center gap-2">
              {saving && <Loader2 className="w-4 h-4 animate-spin" />} Хадгалах
            </button>
            {fullName(saved) && (
              <button
                type="button"
                onClick={() => {
                  setForm(saved);
                  setEditing(false);
                  setChangingPhone(false);
                  setError('');
                }}
                className="px-5 py-3 border border-stone-300 text-sm font-semibold text-stone-700 hover:border-stone-950"
              >
                Болих
              </button>
            )}
          </div>
        </form>
      )}
    </section>
  );
}
