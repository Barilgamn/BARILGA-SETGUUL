import { ReactNode, useEffect, useRef, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { BookOpen, CheckCircle2, CreditCard, FileText, Loader2, QrCode, RefreshCw } from 'lucide-react';
import { displayPhone, useAuth } from '../contexts/AuthContext';
import { findHeyzineMagazine } from '../lib/heyzine';
import {
  checkQPay,
  createPurchase,
  findMyPurchase,
  QPayStart,
  startQPay,
  switchPurchaseMethod,
  watchPurchase,
} from '../lib/purchases';
import { formatCode } from '../lib/catalogOrders';
import { Invoice, transferReference } from '../components/Invoice';
import { Magazine, Purchase, PurchaseMethod } from '../types';

const POLL_MS = 5000;
const POLL_FOR_MS = 15 * 60 * 1000;

export function Buy() {
  const { id = '' } = useParams<{ id: string }>();
  const { user, loading: authLoading } = useAuth();
  const navigate = useNavigate();

  const [issue, setIssue] = useState<Magazine | null | undefined>(undefined);
  const [purchase, setPurchase] = useState<Purchase | null | undefined>(undefined);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    findHeyzineMagazine(id).then(found => setIssue(found || null));
  }, [id]);

  // Free issues have nothing to buy
  useEffect(() => {
    if (issue && !issue.locked) navigate(`/read/${issue.id}`, { replace: true });
  }, [issue, navigate]);

  useEffect(() => {
    if (!user || !issue?.locked) return;
    findMyPurchase(user.id, issue.id)
      .then(setPurchase)
      .catch(err => {
        console.error('Could not load purchase:', err);
        setPurchase(null);
      });
  }, [user, issue]);

  // Live updates: the page flips to "paid" the moment QPay or an admin confirms
  useEffect(() => {
    if (!purchase?.id) return;
    return watchPurchase(purchase.id, p => p && setPurchase(p));
  }, [purchase?.id]);

  if (issue === undefined || authLoading) return <Centered><Loader2 className="w-6 h-6 animate-spin text-stone-400" /></Centered>;
  if (issue === null) {
    return (
      <Centered>
        <p className="font-semibold text-stone-900">Хэвлэл олдсонгүй</p>
        <Link to="/" className="text-sm text-amber-700 underline">Нүүр хуудас руу буцах</Link>
      </Centered>
    );
  }

  // Free issue: the effect above is already redirecting to the reader
  if (!issue.locked || !issue.price) {
    return <Centered><Loader2 className="w-6 h-6 animate-spin text-stone-400" /></Centered>;
  }

  const choose = async (method: PurchaseMethod) => {
    if (!user) return;
    setBusy(true);
    setError('');
    try {
      if (!purchase) {
        setPurchase(await createPurchase(issue, method, { uid: user.id, phone: displayPhone(user) }));
      } else if (purchase.method !== method) {
        await switchPurchaseMethod(purchase.id, method);
        setPurchase({ ...purchase, method });
      }
    } catch (err) {
      console.error('Could not start purchase:', err);
      setError('Худалдан авалт эхлүүлэхэд алдаа гарлаа. Хуудсаа шинэчлээд дахин оролдоно уу.');
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="max-w-3xl mx-auto space-y-6">
      {/* Issue summary */}
      <div className="flex gap-4 sm:gap-6 items-center bg-white rounded-2xl border border-stone-200 p-4 sm:p-6 shadow-sm print:hidden">
        <img
          src={issue.coverImage}
          alt={issue.title}
          referrerPolicy="no-referrer"
          className="w-20 sm:w-28 aspect-[3/4] object-cover rounded-lg shadow ring-1 ring-stone-200 shrink-0"
        />
        <div className="min-w-0 space-y-1">
          <p className="text-sm text-stone-500">Цахим хувилбар</p>
          <h1 className="font-serif text-xl sm:text-2xl font-bold text-stone-900 leading-tight">{issue.title}</h1>
          <p className="text-2xl font-bold text-stone-900 tabular-nums">{issue.price!.toLocaleString()}₮</p>
        </div>
      </div>

      {!user ? (
        <div className="bg-white rounded-2xl border border-stone-200 p-6 sm:p-8 text-center space-y-4">
          <p className="text-stone-700">Худалдаж авахын тулд утасны дугаараараа нэвтэрнэ үү. Дараа нь хаанаас ч нэвтэрч уншина.</p>
          <button
            onClick={() => navigate('/login', { state: { returnTo: `/buy/${issue.id}` } })}
            className="w-full sm:w-auto px-8 py-3.5 rounded-xl bg-stone-900 hover:bg-stone-800 text-white font-semibold text-sm"
          >
            Нэвтрэх
          </button>
        </div>
      ) : purchase === undefined ? (
        <Centered><Loader2 className="w-6 h-6 animate-spin text-stone-400" /></Centered>
      ) : purchase?.status === 'paid' ? (
        <div className="bg-emerald-50 border border-emerald-200 rounded-2xl p-6 sm:p-10 text-center space-y-4">
          <CheckCircle2 className="w-12 h-12 text-emerald-600 mx-auto" />
          <h2 className="font-serif text-2xl font-bold text-stone-900">Төлбөр төлөгдлөө</h2>
          <p className="text-stone-600">Энэ дугаар «Миний сан»-д нэмэгдсэн. Хүссэн үедээ нэвтэрч уншаарай.</p>
          <Link
            to={`/read/${issue.id}`}
            className="inline-flex items-center justify-center gap-2 px-8 py-3.5 rounded-xl bg-amber-500 hover:bg-amber-400 text-stone-950 font-bold text-sm"
          >
            <BookOpen className="w-4 h-4" /> Одоо унших
          </Link>
        </div>
      ) : (
        <>
          <div className="print:hidden space-y-3">
            <h2 className="font-semibold text-stone-900">Төлбөрийн хэлбэр</h2>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <MethodButton
                active={purchase?.method === 'qpay'}
                disabled={busy}
                onClick={() => choose('qpay')}
                icon={<QrCode className="w-5 h-5" />}
                title="QPay · банкны апп · карт"
                subtitle="Төлмөгц шууд уншина"
              />
              <MethodButton
                active={purchase?.method === 'transfer'}
                disabled={busy}
                onClick={() => choose('transfer')}
                icon={<FileText className="w-5 h-5" />}
                title="Нэхэмжлэхээр, дансаар"
                subtitle="Байгууллагад тохиромжтой · баталгаажмагц нээгдэнэ"
              />
            </div>
            {error && <p className="text-sm font-medium text-red-600" role="alert">{error}</p>}
          </div>

          {purchase?.method === 'qpay' && <QPayPanel purchase={purchase} />}
          {purchase?.method === 'transfer' && <InvoicePanel purchase={purchase} />}
        </>
      )}
    </div>
  );
}

function MethodButton(props: {
  active: boolean;
  disabled: boolean;
  onClick: () => void;
  icon: ReactNode;
  title: string;
  subtitle: string;
}) {
  return (
    <button
      type="button"
      onClick={props.onClick}
      disabled={props.disabled}
      className={`text-left p-4 rounded-xl border transition-colors disabled:opacity-60 ${
        props.active ? 'bg-stone-900 border-stone-900 text-white' : 'bg-white border-stone-300 text-stone-900 hover:border-stone-500'
      }`}
    >
      <div className="flex items-center gap-2 font-semibold">
        <span className={props.active ? 'text-amber-400' : 'text-amber-600'}>{props.icon}</span>
        {props.title}
      </div>
      <p className={`text-sm mt-1 ${props.active ? 'text-stone-300' : 'text-stone-500'}`}>{props.subtitle}</p>
    </button>
  );
}

function QPayPanel({ purchase }: { purchase: Purchase }) {
  const [state, setState] = useState<QPayStart | null>(null);
  const [checking, setChecking] = useState(false);
  const [notPaidYet, setNotPaidYet] = useState(false);
  const startedAt = useRef(Date.now());

  useEffect(() => {
    let cancelled = false;
    startQPay(purchase.id).then(result => !cancelled && setState(result));
    return () => {
      cancelled = true;
    };
  }, [purchase.id]);

  // Ask QPay periodically too, in case its callback can't reach this server
  useEffect(() => {
    if (state?.kind !== 'ok') return;
    const timer = setInterval(() => {
      if (document.visibilityState !== 'visible') return;
      if (Date.now() - startedAt.current > POLL_FOR_MS) return clearInterval(timer);
      checkQPay(purchase.id);
    }, POLL_MS);
    return () => clearInterval(timer);
  }, [state, purchase.id]);

  const checkNow = async () => {
    setChecking(true);
    setNotPaidYet(false);
    const result = await checkQPay(purchase.id);
    setNotPaidYet(result === 'pending');
    setChecking(false);
  };

  if (!state) return <Centered><Loader2 className="w-6 h-6 animate-spin text-stone-400" /></Centered>;
  if (state.kind !== 'ok') {
    return (
      <p className="text-sm text-red-700 bg-red-50 rounded-xl p-4">
        {state.kind === 'unavailable'
          ? 'QPay-ээр төлөх боломж түр хаалттай байна. «Нэхэмжлэхээр, дансаар» сонгоно уу.'
          : 'QPay нэхэмжлэх үүсгэж чадсангүй. Хэсэг хүлээгээд дахин оролдоно уу.'}
      </p>
    );
  }

  const { invoice, sandbox } = state;
  return (
    <div className="bg-white rounded-2xl border border-stone-200 p-5 sm:p-8 shadow-sm space-y-6">
      {sandbox && (
        <p className="text-xs font-semibold text-amber-800 bg-amber-100 rounded-lg px-3 py-2">
          Туршилтын горим (QPay sandbox) — бодит мөнгө шилжихгүй.
        </p>
      )}

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-6 items-center">
        <div className="text-center space-y-2">
          <img
            src={`data:image/png;base64,${invoice.qrImage}`}
            alt="QPay QR код"
            className="w-56 h-56 mx-auto rounded-xl ring-1 ring-stone-200"
          />
          <p className="text-sm text-stone-500">Банкны аппаараа QR уншуулна уу</p>
        </div>
        <div className="space-y-3">
          <p className="text-stone-700">
            Төлөх дүн <span className="text-xl font-bold text-stone-900 tabular-nums">{purchase.amount.toLocaleString()}₮</span>
          </p>
          <p className="text-sm text-stone-500">Төлбөр орсон даруйд энэ хуудас автоматаар нээгдэнэ.</p>
          {invoice.shortUrl && (
            <a
              href={invoice.shortUrl}
              target="_blank"
              rel="noreferrer"
              className="flex items-center justify-center gap-2 w-full py-3 rounded-xl border border-stone-300 bg-white hover:bg-stone-50 text-sm font-semibold text-stone-900"
            >
              <CreditCard className="w-4 h-4" /> Картаар / QPay вэбээр төлөх
            </a>
          )}
          <button
            onClick={checkNow}
            disabled={checking}
            className="flex items-center justify-center gap-2 w-full py-3 rounded-xl bg-stone-900 hover:bg-stone-800 text-white text-sm font-semibold disabled:opacity-60"
          >
            {checking ? <Loader2 className="w-4 h-4 animate-spin" /> : <RefreshCw className="w-4 h-4" />}
            Төлбөр шалгах
          </button>
          {notPaidYet && <p className="text-sm text-stone-600">Төлбөр хараахан ороогүй байна.</p>}
        </div>
      </div>

      {/* On phones the bank apps open straight from these links */}
      {invoice.urls.length > 0 && (
        <div className="space-y-3 sm:hidden">
          <p className="text-sm font-semibold text-stone-900">Банкны апп сонгох</p>
          <div className="grid grid-cols-4 gap-3">
            {invoice.urls.map(u => (
              <a key={u.name} href={u.link} className="flex flex-col items-center gap-1 text-center">
                {u.logo ? (
                  <img src={u.logo} alt="" className="w-12 h-12 rounded-xl ring-1 ring-stone-200 object-contain bg-white" />
                ) : (
                  <span className="w-12 h-12 rounded-xl bg-stone-100" />
                )}
                <span className="text-[11px] leading-tight text-stone-600 line-clamp-2">{u.description || u.name}</span>
              </a>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

function InvoicePanel({ purchase }: { purchase: Purchase }) {
  const phone = transferReference(undefined, purchase.phone);
  return (
    <Invoice
      number={formatCode(purchase.id)}
      date={purchase.createdAt}
      buyer={{ phone: purchase.phone }}
      items={[{ label: `${purchase.issueTitle} — цахим хувилбар`, amount: purchase.amount }]}
      // The invoice number lets the admin find this purchase from the bank statement
      reference={`${purchase.id} ${phone}`}
      note="Төлбөр баталгаажмагц энэ дугаар «Миний сан»-д нээгдэж, энэ хуудас өөрөө шинэчлэгдэнэ."
    />
  );
}

function Centered({ children }: { children: ReactNode }) {
  return <div className="flex flex-col items-center justify-center gap-3 py-16 text-center">{children}</div>;
}
