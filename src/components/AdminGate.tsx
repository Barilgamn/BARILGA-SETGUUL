import { FormEvent, ReactNode, useEffect, useState } from 'react';
import { Loader2, LockKeyhole } from 'lucide-react';
import { supabase } from '../lib/supabase';
import { useAuth } from '../contexts/AuthContext';

// UI gate only — row level security (public.is_admin()) is what actually
// keeps non-admins out of the data. We ask the database rather than keep a
// second copy of the admin list here.
export function AdminGate({ children }: { children: ReactNode }) {
  const { user, loading, signOut } = useAuth();
  const [isAdmin, setIsAdmin] = useState<boolean | null>(null);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    if (!user) {
      setIsAdmin(null);
      return;
    }
    setIsAdmin(null);
    supabase.rpc('is_admin').then(({ data, error }) => {
      if (error) console.error('is_admin check failed:', error.message);
      setIsAdmin(data === true);
    });
  }, [user]);

  if (loading || (user && isAdmin === null)) {
    return (
      <div className="flex justify-center py-24">
        <Loader2 className="w-6 h-6 animate-spin text-stone-400" />
      </div>
    );
  }

  if (user && isAdmin) return <>{children}</>;

  const handleLogin = async (e: FormEvent) => {
    e.preventDefault();
    setBusy(true);
    setError('');
    const { error } = await supabase.auth.signInWithPassword({ email: email.trim().toLowerCase(), password });
    setBusy(false);
    if (error) {
      setError(
        /confirm/i.test(error.message)
          ? 'Имэйл хаяг баталгаажаагүй байна. Ирсэн имэйл дэх холбоос дээр дарна уу.'
          : 'Имэйл эсвэл нууц үг буруу байна.'
      );
    }
  };

  return (
    <div className="max-w-sm mx-auto mt-6 sm:mt-16 bg-white rounded-2xl border border-stone-200 shadow-sm p-6 sm:p-8 space-y-6">
      <div className="text-center space-y-2">
        <LockKeyhole className="w-8 h-8 text-amber-600 mx-auto" />
        <h1 className="font-serif text-2xl font-bold text-stone-900">Админ нэвтрэх</h1>
      </div>

      {user ? (
        <div className="space-y-4 text-sm text-stone-600">
          <p>
            Та {user.email || (user.phone ? `+${user.phone}` : 'өөр эрхээр')} нэвтэрсэн байна. Энэ эрх админ хэсэгт хандах
            боломжгүй.
          </p>
          <button onClick={signOut} className="w-full py-3 rounded-xl bg-stone-900 text-white font-semibold">
            Гараад админаар нэвтрэх
          </button>
        </div>
      ) : (
        <form onSubmit={handleLogin} className="space-y-4">
          <label className="block space-y-1.5">
            <span className="text-sm font-semibold text-stone-800">Имэйл</span>
            <input
              type="email"
              value={email}
              onChange={e => setEmail(e.target.value)}
              autoComplete="username"
              className="w-full px-4 py-3 rounded-xl border border-stone-300 text-base focus:outline-none focus:ring-2 focus:ring-stone-900"
            />
          </label>
          <label className="block space-y-1.5">
            <span className="text-sm font-semibold text-stone-800">Нууц үг</span>
            <input
              type="password"
              value={password}
              onChange={e => setPassword(e.target.value)}
              autoComplete="current-password"
              className="w-full px-4 py-3 rounded-xl border border-stone-300 text-base focus:outline-none focus:ring-2 focus:ring-stone-900"
            />
          </label>
          {error && <p className="text-sm font-medium text-red-600" role="alert">{error}</p>}
          <button
            type="submit"
            disabled={busy}
            className="w-full inline-flex justify-center items-center gap-2 py-3 rounded-xl bg-stone-900 hover:bg-stone-800 text-white font-semibold disabled:opacity-60"
          >
            {busy && <Loader2 className="w-4 h-4 animate-spin" />}
            Нэвтрэх
          </button>
        </form>
      )}
    </div>
  );
}
