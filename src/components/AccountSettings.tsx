import { FormEvent, ReactNode, useEffect, useState } from 'react';
import { AlertCircle, Bell, Check, ChevronDown, Loader2, Mail, MapPin, Pencil, Phone, Plus, User, X } from 'lucide-react';
import { displayPhone, useAuth } from '../contexts/AuthContext';
import { fullName, getMyProfile, MyProfile, saveMyProfile, sendEmailVerification, startPhoneChange, verifyPhoneChange } from '../lib/account';
import { AddressFields } from './AddressFields';
import { AddressSummary } from './AddressSummary';
import { addressColumns, addressComplete, emptyAddress } from '../lib/places';

// «Миний мэдээлэл» on the profile page, folded until opened: name, contact
// email, the login phone (changed with an SMS code), a saved delivery address
// and whether to get an email when a new issue is out.

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

// Verified, or not yet with a button that emails the link
function EmailStatus({ verified, onSent }: { verified: boolean; onSent: (email: string) => void }) {
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState('');
  if (verified) {
    return (
      <span className="inline-flex items-center gap-1 text-xs font-semibold text-emerald-700">
        <Check className="w-3.5 h-3.5" /> Баталгаажсан
      </span>
    );
  }
  const send = async () => {
    setBusy(true);
    setMessage('');
    const { status, body } = await sendEmailVerification();
    setBusy(false);
    if (status === 200) {
      setMessage(`Линк илгээлээ — ${body.email} хаягаа шалгана уу.`);
      onSent(body.email);
    } else if (body.error === 'wait') setMessage(`${body.retryIn} секундын дараа дахин илгээнэ үү.`);
    else setMessage('Линк илгээж чадсангүй.');
  };
  return (
    <span className="block space-y-1">
      <span className="inline-flex flex-wrap items-center gap-x-2 gap-y-1 text-xs">
        <span className="inline-flex items-center gap-1 font-semibold text-amber-700">
          <AlertCircle className="w-3.5 h-3.5" /> Баталгаажаагүй
        </span>
        <button type="button" onClick={send} disabled={busy} className="font-semibold text-stone-950 underline underline-offset-2 disabled:opacity-50">
          {busy ? 'Илгээж байна…' : 'Баталгаажуулах линк илгээх'}
        </button>
      </span>
      {message && <span className="block text-xs text-stone-600">{message}</span>}
    </span>
  );
}

export function AccountSettings() {
  const { user } = useAuth();
  const [open, setOpen] = useState(false);
  const [saved, setSaved] = useState<MyProfile | null>(null);
  const [form, setForm] = useState<MyProfile | null>(null);
  const [editing, setEditing] = useState(false);
  const [changingPhone, setChangingPhone] = useState(false);
  const [saving, setSaving] = useState(false);
  const [notice, setNotice] = useState('');
  const [error, setError] = useState('');

  useEffect(() => {
    if (!user) return;
    const blank: MyProfile = { lastName: '', firstName: '', email: user.email || '', emailVerified: false, notifyNewIssue: false, address: null };
    getMyProfile(user.id)
      .then(p => {
        const withEmail = { ...p, email: p.email || user.email || '' };
        setSaved(withEmail);
        setForm(withEmail);
        // Nothing filled in yet: open straight into the form
        if (!fullName(p)) setEditing(true);
      })
      .catch(err => {
        console.error('Could not load profile:', err);
        setSaved(blank);
        setForm(blank);
        setEditing(true);
      });
  }, [user]);

  if (!user) return null;

  const phone = displayPhone(user);
  const set = (patch: Partial<MyProfile>) => setForm(f => ({ ...f!, ...patch }));
  const summary = saved ? [fullName(saved), saved.email].filter(Boolean).join(' · ') : '';

  const save = async (e?: FormEvent, next: MyProfile | null = form) => {
    e?.preventDefault();
    if (!next) return;
    const email = next.email.trim();
    if (email && !/^\S+@\S+\.\S+$/.test(email)) return setError('И-мэйл хаяг буруу байна.');
    if (next.notifyNewIssue && !email) return setError('Мэдэгдэл авахын тулд и-мэйл хаягаа оруулна уу.');
    // An address that was started must be finished (or removed)
    if (next.address && !addressComplete(next.address)) {
      return setError(
        next.address.region === 'ub'
          ? 'Хаягийн дүүрэг, хороо, дэлгэрэнгүй хаягийг бөглөнө үү — эсвэл «Хаяг устгах» дарна уу.'
          : 'Хаягийн аймаг, сум, дэлгэрэнгүй хаягийг бөглөнө үү — эсвэл «Хаяг устгах» дарна уу.'
      );
    }
    const address = next.address;
    const emailChanged = email !== (saved?.email || '').trim();
    // A new address starts unverified (the database clears it too)
    const toSave = { ...next, email, address, emailVerified: emailChanged ? false : next.emailVerified };
    setSaving(true);
    setError('');
    try {
      await saveMyProfile(user.id, toSave);
      setSaved(toSave);
      setForm(toSave);
      setEditing(false);
      setChangingPhone(false);
      setNotice('Хадгаллаа');
      setTimeout(() => setNotice(''), 2500);
      // A new address gets its verification link straight away
      if (emailChanged && email) {
        sendEmailVerification().then(({ status }) => {
          if (status === 200) {
            setNotice(`Баталгаажуулах линк ${email} руу илгээлээ`);
            setTimeout(() => setNotice(''), 6000);
          }
        });
      }
    } catch (err) {
      console.error('Could not save profile:', err);
      setError('Хадгалж чадсангүй. Дахин оролдоно уу.');
    } finally {
      setSaving(false);
    }
  };

  return (
    <section className="bg-white border border-stone-200 shadow-sm">
      <button
        type="button"
        onClick={() => setOpen(o => !o)}
        aria-expanded={open}
        className="w-full flex items-center gap-4 px-5 sm:px-6 py-4 text-left hover:bg-stone-50"
      >
        <span className="w-10 h-10 shrink-0 bg-stone-950 text-amber-400 flex items-center justify-center">
          <User className="w-5 h-5" />
        </span>
        <span className="flex-1 min-w-0">
          <span className="block font-serif text-lg font-bold text-stone-950">Миний мэдээлэл</span>
          <span className="block text-sm text-stone-500 truncate">
            {summary || 'Нэр, и-мэйл, хүргэлтийн хаяг, мэдэгдлээ тохируулах'}
          </span>
        </span>
        {notice && (
          <span className="hidden sm:inline-flex text-sm text-emerald-700 font-semibold items-center gap-1">
            <Check className="w-4 h-4" /> {notice}
          </span>
        )}
        <ChevronDown className={`w-5 h-5 text-stone-500 shrink-0 transition-transform ${open ? 'rotate-180' : ''}`} />
      </button>

      {open && (!form || !saved) && (
        <div className="border-t border-stone-200 p-6 flex justify-center">
          <Loader2 className="w-5 h-5 animate-spin text-stone-400" />
        </div>
      )}

      {open && form && saved && !editing && (
        <div className="border-t border-stone-200 px-5 sm:px-6 py-5 space-y-5">
          <dl className="grid grid-cols-1 sm:grid-cols-2 gap-x-6 gap-y-4 text-sm">
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
                <dd className="font-semibold text-stone-950 break-all">{saved.email || '—'}</dd>
                {saved.email && (
                  <dd className="mt-1">
                    <EmailStatus verified={saved.emailVerified} onSent={() => undefined} />
                  </dd>
                )}
              </div>
            </div>
            <div className="flex gap-3">
              <Bell className="w-4 h-4 text-stone-400 mt-0.5 shrink-0" />
              <div>
                <dt className="text-stone-500">Шинэ дугаарын мэдэгдэл</dt>
                <dd className="flex items-center gap-3">
                  <span className="font-semibold text-stone-950">
                    {saved.notifyNewIssue ? (saved.emailVerified ? 'И-мэйлээр авна' : 'И-мэйл баталгаажмагц ирнэ') : 'Авахгүй'}
                  </span>
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
            <div className="flex gap-3 sm:col-span-2">
              <MapPin className="w-4 h-4 text-stone-400 mt-0.5 shrink-0" />
              <div>
                <dt className="text-stone-500">Хүргэлтийн хаяг</dt>
                <dd className="text-stone-950">
                  {saved.address ? <AddressSummary {...addressColumns(saved.address)} /> : '—'}
                </dd>
              </div>
            </div>
          </dl>
          {error && <p className="text-sm text-red-700">{error}</p>}
          <button
            type="button"
            onClick={() => setEditing(true)}
            className="inline-flex items-center gap-1.5 px-4 py-2.5 border border-stone-300 text-sm font-semibold text-stone-800 hover:border-stone-950"
          >
            <Pencil className="w-4 h-4" /> Засах
          </button>
        </div>
      )}

      {open && form && saved && editing && (
        <form onSubmit={save} className="border-t border-stone-200 px-5 sm:px-6 py-5 space-y-5">
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

          {/* The address is optional: added on request, removable */}
          {form.address ? (
            <div className="space-y-3">
              <div className="flex items-start justify-between gap-3">
                <div>
                  <p className="text-sm font-semibold text-stone-800">Хүргэлтийн хаяг</p>
                  <p className="text-xs text-stone-500">Захиалга хийхэд энэ хаяг автоматаар бөглөгдөнө.</p>
                </div>
                <button
                  type="button"
                  onClick={() => set({ address: null })}
                  className="shrink-0 inline-flex items-center gap-1 text-xs font-semibold text-stone-500 hover:text-red-700"
                >
                  <X className="w-3.5 h-3.5" /> Хаяг устгах
                </button>
              </div>
              <AddressFields value={form.address} onChange={address => set({ address })} required={false} />
            </div>
          ) : (
            <button
              type="button"
              onClick={() => set({ address: emptyAddress() })}
              className="w-full flex items-center gap-3 border border-dashed border-stone-300 px-4 py-3.5 text-left hover:border-stone-950 hover:bg-stone-50"
            >
              <Plus className="w-5 h-5 text-amber-700 shrink-0" />
              <span>
                <span className="block text-sm font-semibold text-stone-950">Хүргэлтийн хаяг нэмэх</span>
                <span className="block text-xs text-stone-500">Заавал биш — нэмбэл захиалгын маягт автоматаар бөглөгдөнө</span>
              </span>
            </button>
          )}

          <label className="flex items-start gap-3 border border-stone-300 p-4 cursor-pointer has-[:checked]:border-stone-950 has-[:checked]:bg-stone-50">
            <input
              type="checkbox"
              checked={form.notifyNewIssue}
              onChange={e => set({ notifyNewIssue: e.target.checked })}
              className="mt-0.5 h-5 w-5 accent-stone-950"
            />
            <span>
              <span className="block text-sm font-semibold text-stone-950">Шинэ дугаар гармагц и-мэйлээр мэдэгдэх</span>
              <span className="block text-xs text-stone-500 mt-0.5">
                Барилга МН сэтгүүлийн шинэ дугаар гарах бүрт нэг и-мэйл. И-мэйл хаягаа баталгаажуулсны дараа ирж эхэлнэ. Хүссэн үедээ унтраана.
              </span>
            </span>
          </label>

          {error && <p className="text-sm text-red-700">{error}</p>}
          <div className="flex flex-wrap gap-2">
            <button type="submit" disabled={saving} className="px-6 py-3 bg-stone-950 text-white text-sm font-semibold disabled:opacity-50 inline-flex items-center gap-2">
              {saving && <Loader2 className="w-4 h-4 animate-spin" />} Хадгалах
            </button>
            <button
              type="button"
              onClick={() => {
                setForm(saved);
                setEditing(false);
                setChangingPhone(false);
                setError('');
                if (!fullName(saved)) setOpen(false);
              }}
              className="px-5 py-3 border border-stone-300 text-sm font-semibold text-stone-700 hover:border-stone-950"
            >
              Болих
            </button>
          </div>
        </form>
      )}
    </section>
  );
}
