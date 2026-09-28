import { useState, useEffect, FormEvent } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { RecaptchaVerifier, signInWithPhoneNumber, ConfirmationResult } from 'firebase/auth';
import { auth } from '../lib/firebase';
import { Smartphone, ShieldCheck, ArrowRight } from 'lucide-react';

export function Login() {
  const [phoneNumber, setPhoneNumber] = useState('+976');
  const [verificationCode, setVerificationCode] = useState('');
  const [confirmationResult, setConfirmationResult] = useState<ConfirmationResult | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  
  const navigate = useNavigate();
  const location = useLocation();
  const returnTo = location.state?.returnTo || '/profile';

  useEffect(() => {
    if (!window.recaptchaVerifier) {
      window.recaptchaVerifier = new RecaptchaVerifier(auth, 'recaptcha-container', {
        size: 'invisible',
      });
    }
  }, []);

  const handleSendCode = async (e: FormEvent) => {
    e.preventDefault();
    if (phoneNumber.length < 12) {
      setError('Утасны дугаараа зөв оруулна уу (+976...)');
      return;
    }
    
    setLoading(true);
    setError('');
    
    try {
      const appVerifier = window.recaptchaVerifier;
      const confirmation = await signInWithPhoneNumber(auth, phoneNumber, appVerifier);
      setConfirmationResult(confirmation);
    } catch (err: any) {
      console.error(err);
      setError('Код илгээхэд алдаа гарлаа. Дахин оролдоно уу.');
    } finally {
      setLoading(false);
    }
  };

  const handleVerifyCode = async (e: FormEvent) => {
    e.preventDefault();
    if (!confirmationResult || verificationCode.length < 6) return;
    
    setLoading(true);
    setError('');
    
    try {
      await confirmationResult.confirm(verificationCode);
      navigate(returnTo);
    } catch (err: any) {
      console.error(err);
      setError('Баталгаажуулах код буруу байна.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="max-w-md mx-auto mt-12">
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

        {!confirmationResult ? (
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
                placeholder="+976 99001234"
                disabled={loading}
              />
            </div>
            
            <div id="recaptcha-container"></div>
            
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
                disabled={loading}
              />
              <p className="text-xs text-slate-500 mt-2 text-center">
                {phoneNumber} дугаарт илгээсэн 6 оронтой кодыг оруулна уу
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
                onClick={() => setConfirmationResult(null)}
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
