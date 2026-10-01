import { useState, FormEvent } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { supabase } from '../lib/supabase';
import { Smartphone, ShieldCheck, ArrowRight } from 'lucide-react';

// Mongolian numbers are 8 digits; accept them with or without +976
function toE164(input: string): string | null {
  const digits = input.replace(/\D/g, '');
  if (/^\d{8}$/.test(digits)) return `+976${digits}`;
  if (/^976\d{8}$/.test(digits)) return `+${digits}`;
  return null;
}

export function Login() {
  const [phoneNumber, setPhoneNumber] = useState('+976');
  const [verificationCode, setVerificationCode] = useState('');
  const [sentTo, setSentTo] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const navigate = useNavigate();
  const location = useLocation();
  // Callers pass the way back either as router state or as ?redirect=
  const redirectParam = new URLSearchParams(location.search).get('redirect');
  const returnTo =
    location.state?.returnTo || (redirectParam && redirectParam.startsWith('/') ? redirectParam : '/profile');

  const handleSendCode = async (e: FormEvent) => {
    e.preventDefault();
    const phone = toE164(phoneNumber);
    if (!phone) {
      setError('Утасны дугаараа зөв оруулна уу (8 оронтой).');
      return;
    }

    setLoading(true);
    setError('');
    const { error } = await supabase.auth.signInWithOtp({ phone });
    setLoading(false);
    if (error) {
      console.error('OTP send failed:', error.message);
      setError('Код илгээхэд алдаа гарлаа. Дахин оролдоно уу.');
      return;
    }
    setSentTo(phone);
  };

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
            
            <button
              type="submit"
              disabled={loading}
              className="w-full flex items-center justify-center bg-[#0F172A] text-white hover:bg-slate-800 px-4 py-3 rounded-xl font-bold transition-colors disabled:opacity-70 shadow-sm"
            >
              {loading ? 'Уншиж байна...' : 'Код авах'}
              {!loading && <ArrowRight className="ml-2 h-5 w-5" />}
            </button>
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
            
            <div className="text-center mt-4">
              <button
                type="button"
                onClick={() => { setSentTo(null); setVerificationCode(''); }}
                className="text-sm text-[#F59E0B] hover:text-[#D97706] font-bold"
              >
                Дугаар өөрчлөх
              </button>
            </div>
          </form>
        )}
      </div>
    </div>
  );
}
