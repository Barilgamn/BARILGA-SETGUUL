import { useState, useEffect, FormEvent } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { supabase } from '../lib/supabase';
import { Smartphone, ShieldCheck, ArrowRight } from 'lucide-react';
import { Turnstile, TURNSTILE_SITE_KEY } from '../components/Turnstile';

// Mongolian numbers are 8 digits; accept them with or without +976
function toE164(input: string): string | null {
  const digits = input.replace(/\D/g, '');
  if (/^\d{8}$/.test(digits)) return `+976${digits}`;
  if (/^976\d{8}$/.test(digits)) return `+${digits}`;
  return null;
}

// One code a minute per number. The server enforces it (and hourly/daily
// caps); the page just shows the wait instead of letting people hammer it.
const RESEND_SECONDS = 60;
const LAST_SENT_KEY = 'otp-last-sent';

function lastSent(): { phone: string; at: number } | null {
  try {
    return JSON.parse(localStorage.getItem(LAST_SENT_KEY) || 'null');
  } catch {
    return null;
  }
}

const waitText = (seconds: number) =>
  seconds >= 3600 ? `${Math.ceil(seconds / 3600)} цаг` : seconds >= 60 ? `${Math.ceil(seconds / 60)} минут` : `${seconds} секунд`;

// Turns a send error into words, and how long to wait if there is a limit
function sendError(message: string): { text: string; wait?: number } {
  // Our SMS hook: "SMS_LIMIT:<reason>:<seconds>"
  const ours = message.match(/SMS_LIMIT:([a-z-]+):(\d+)/);
  if (ours) {
    const wait = Number(ours[2]) || RESEND_SECONDS;
    switch (ours[1]) {
      case 'not-mongolian':
        return { text: 'Зөвхөн Монголын гар утасны дугаараар нэвтэрнэ.' };
      case 'too-soon':
        return { text: `Код саяхан илгээсэн. ${waitText(wait)}-ын дараа дахин оролдоно уу.`, wait };
      case 'hourly':
      case 'daily':
        return { text: `Энэ дугаар руу хэт олон код илгээсэн байна. ${waitText(wait)}-ын дараа дахин оролдоно уу.`, wait };
      default:
        return { text: 'Түр ачаалал ихтэй байна. Хэсэг хугацааны дараа дахин оролдоно уу.', wait };
    }
  }
  // Supabase's own limit: "...you can only request this after 45 seconds."
  const supa = message.match(/after (\d+) seconds/i);
  if (supa) return { text: `${waitText(Number(supa[1]))}-ын дараа дахин код авна уу.`, wait: Number(supa[1]) };
  if (/captcha/i.test(message)) return { text: 'Хүн эсэхийг баталгаажуулах шалгалтыг дахин хийнэ үү.' };
  if (/rate limit|too many/i.test(message)) return { text: 'Хэт олон оролдлого хийлээ. Хэсэг хугацааны дараа дахин оролдоно уу.', wait: RESEND_SECONDS };
  return { text: 'Код илгээхэд алдаа гарлаа. Дахин оролдоно уу.' };
}

export function Login() {
  const [phoneNumber, setPhoneNumber] = useState('+976');
  const [verificationCode, setVerificationCode] = useState('');
  const [sentTo, setSentTo] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [captchaToken, setCaptchaToken] = useState('');
  const [captchaReset, setCaptchaReset] = useState(0);
  // When this number may get another code (ms), and a clock to count down
  const [waitUntil, setWaitUntil] = useState<{ phone: string; at: number } | null>(() => {
    const last = lastSent();
    return last && Date.now() - last.at < RESEND_SECONDS * 1000 ? { phone: last.phone, at: last.at + RESEND_SECONDS * 1000 } : null;
  });
  const [now, setNow] = useState(Date.now());
  useEffect(() => {
    if (!waitUntil || waitUntil.at <= now) return;
    const t = setTimeout(() => setNow(Date.now()), 1000);
    return () => clearTimeout(t);
  }, [waitUntil, now]);
  const secondsLeft = (phone: string | null) =>
    phone && waitUntil && waitUntil.phone === phone ? Math.max(0, Math.ceil((waitUntil.at - now) / 1000)) : 0;

  const navigate = useNavigate();
  const location = useLocation();
  // Callers pass the way back either as router state or as ?redirect=
  const redirectParam = new URLSearchParams(location.search).get('redirect');
  const returnTo =
    location.state?.returnTo || (redirectParam && /^\/(?![\/\\])/.test(redirectParam) ? redirectParam : '/profile');

  const sendCode = async (phone: string) => {
    if (secondsLeft(phone) > 0) return;
    if (TURNSTILE_SITE_KEY && !captchaToken) {
      setError('Доорх «хүн эсэхийг» шалгах хэсгийг баталгаажуулна уу.');
      return;
    }
    setLoading(true);
    setError('');
    const { error } = await supabase.auth.signInWithOtp({
      phone,
      options: TURNSTILE_SITE_KEY ? { captchaToken } : undefined,
    });
    setLoading(false);
    // A captcha token works once
    if (TURNSTILE_SITE_KEY) setCaptchaReset(n => n + 1);
    if (error) {
      console.error('OTP send failed:', error.message);
      const { text, wait } = sendError(error.message);
      setError(text);
      if (wait) {
        setWaitUntil({ phone, at: Date.now() + wait * 1000 });
        setNow(Date.now());
      }
      return;
    }
    const at = Date.now();
    try {
      localStorage.setItem(LAST_SENT_KEY, JSON.stringify({ phone, at }));
    } catch {
      /* storage unavailable: the server still enforces the limit */
    }
    setWaitUntil({ phone, at: at + RESEND_SECONDS * 1000 });
    setNow(at);
    setSentTo(phone);
  };

  const handleSendCode = async (e: FormEvent) => {
    e.preventDefault();
    const phone = toE164(phoneNumber);
    if (!phone) {
      setError('Утасны дугаараа зөв оруулна уу (8 оронтой).');
      return;
    }
    await sendCode(phone);
  };

  const typedPhone = toE164(phoneNumber);
  const formWait = secondsLeft(typedPhone);
  const resendWait = secondsLeft(sentTo);

  const handleVerifyCode = async (e: FormEvent) => {
    e.preventDefault();
    if (!sentTo || verificationCode.length < 6) return;

    setLoading(true);
    setError('');
    const { error } = await supabase.auth.verifyOtp({ phone: sentTo, token: verificationCode, type: 'sms' });
    setLoading(false);
    if (error) {
      console.error('OTP verify failed:', error.message);
      setError('Баталгаажуулах код буруу эсвэл хугацаа нь дууссан байна.');
      return;
    }
    navigate(returnTo, { replace: true });
  };

  return (
    <div className="max-w-md mx-auto sm:mt-12">
      <div className="bg-white p-8 rounded-2xl shadow-sm border border-slate-100">
        <div className="text-center mb-8">
          <div className="h-16 w-16 bg-[#0F172A] text-white rounded-xl flex items-center justify-center mx-auto mb-4 shadow-md">
            <Smartphone className="h-8 w-8" />
          </div>
          <h2 className="text-2xl font-extrabold text-[#0F172A] tracking-tight">Нэвтрэх</h2>
          <p className="text-slate-500 mt-2">Утасны дугаараараа нэвтэрч орно уу</p>
        </div>

        {error && (
          <div className="mb-6 p-4 bg-red-50 text-red-700 rounded-xl text-sm font-medium border border-red-100">
            {error}
          </div>
        )}

        {!sentTo ? (
          <form onSubmit={handleSendCode} className="space-y-6">
            <div>
              <label htmlFor="phone" className="block text-sm font-bold text-slate-700 mb-2">
                Утасны дугаар
              </label>
              <input
                id="phone"
                type="tel"
                value={phoneNumber}
                onChange={(e) => setPhoneNumber(e.target.value)}
                className="w-full px-4 py-3 rounded-xl border border-slate-200 focus:ring-2 focus:ring-[#0F172A] focus:border-[#0F172A] transition-colors"
                placeholder="9900 1234"
                inputMode="tel"
                autoComplete="tel"
                disabled={loading}
              />
            </div>
            
            <Turnstile onToken={setCaptchaToken} resetKey={captchaReset} />

            <button
              type="submit"
              disabled={loading || formWait > 0 || (!!TURNSTILE_SITE_KEY && !captchaToken)}
              className="w-full flex items-center justify-center bg-[#0F172A] text-white hover:bg-slate-800 px-4 py-3 rounded-xl font-bold transition-colors disabled:opacity-70 shadow-sm"
            >
              {loading ? 'Уншиж байна...' : formWait > 0 ? `Дахин код авах (${formWait})` : 'Код авах'}
              {!loading && formWait === 0 && <ArrowRight className="ml-2 h-5 w-5" />}
            </button>
            {formWait > 0 && typedPhone && (
              <button
                type="button"
                onClick={() => setSentTo(typedPhone)}
                className="w-full text-sm text-[#F59E0B] hover:text-[#D97706] font-bold"
              >
                Илгээсэн кодоо оруулах
              </button>
            )}
          </form>
        ) : (
          <form onSubmit={handleVerifyCode} className="space-y-6">
            <div>
              <label htmlFor="code" className="block text-sm font-bold text-slate-700 mb-2">
                Баталгаажуулах код
              </label>
              <input
                id="code"
                type="text"
                value={verificationCode}
                onChange={(e) => setVerificationCode(e.target.value.replace(/\D/g, '').slice(0, 6))}
                className="w-full px-4 py-3 rounded-xl border border-slate-200 focus:ring-2 focus:ring-[#0F172A] focus:border-[#0F172A] transition-colors text-center text-2xl tracking-widest font-mono"
                placeholder="000000"
                inputMode="numeric"
                autoComplete="one-time-code"
                disabled={loading}
              />
              <p className="text-xs text-slate-500 mt-2 text-center">
                {sentTo} дугаарт илгээсэн 6 оронтой кодыг оруулна уу
              </p>
            </div>
            
            <button
              type="submit"
              disabled={loading || verificationCode.length !== 6}
              className="w-full flex items-center justify-center bg-[#0F172A] text-white hover:bg-slate-800 px-4 py-3 rounded-xl font-bold transition-colors disabled:opacity-70 shadow-sm"
            >
              {loading ? 'Уншиж байна...' : 'Баталгаажуулах'}
              {!loading && <ShieldCheck className="ml-2 h-5 w-5" />}
            </button>
            
            {resendWait === 0 && <Turnstile onToken={setCaptchaToken} resetKey={captchaReset} />}

            <div className="flex items-center justify-between mt-4 text-sm">
              <button
                type="button"
                onClick={() => { setSentTo(null); setVerificationCode(''); setError(''); }}
                className="text-[#F59E0B] hover:text-[#D97706] font-bold"
              >
                Дугаар өөрчлөх
              </button>
              <button
                type="button"
                onClick={() => sentTo && sendCode(sentTo)}
                disabled={loading || resendWait > 0 || (!!TURNSTILE_SITE_KEY && !captchaToken)}
                className="font-bold text-slate-700 hover:text-[#0F172A] disabled:text-slate-400 disabled:cursor-not-allowed"
              >
                {resendWait > 0 ? `Дахин илгээх (${resendWait})` : 'Код дахин илгээх'}
              </button>
            </div>
          </form>
        )}
      </div>
    </div>
  );
}
