import { useEffect, useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { CheckCircle2, Loader2, XCircle } from 'lucide-react';
import { confirmEmail } from '../lib/account';

// Where the verification email's button lands
const PROBLEMS: Record<string, string> = {
  expired: 'Линкийн хугацаа (24 цаг) дууссан байна.',
  'not-found': 'Линк хүчингүй эсвэл аль хэдийн ашиглагдсан байна.',
  'email-changed': 'Энэ линк илгээснээс хойш та и-мэйл хаягаа өөрчилсөн байна.',
  'bad-token': 'Линк буруу байна.',
};

export function VerifyEmail() {
  const [params] = useSearchParams();
  const [state, setState] = useState<{ status: 'working' } | { status: 'ok'; email: string } | { status: 'error'; message: string }>({ status: 'working' });

  useEffect(() => {
    const token = params.get('token') || '';
    confirmEmail(token).then(({ status, body }) => {
      if (status === 200) setState({ status: 'ok', email: body.email });
      else setState({ status: 'error', message: PROBLEMS[body.error] || 'Баталгаажуулж чадсангүй. Дахин оролдоно уу.' });
    });
  }, [params]);

  return (
    <div className="max-w-md mx-auto py-16 text-center space-y-5">
      {state.status === 'working' && (
        <>
          <Loader2 className="w-10 h-10 mx-auto animate-spin text-stone-400" />
          <p className="text-stone-600">И-мэйл хаягийг баталгаажуулж байна…</p>
        </>
      )}
      {state.status === 'ok' && (
        <>
          <CheckCircle2 className="w-14 h-14 mx-auto text-emerald-600" />
          <h1 className="font-serif text-3xl font-bold text-stone-950">И-мэйл баталгаажлаа</h1>
          <p className="text-stone-600">
            <span className="font-semibold text-stone-950">{state.email}</span> хаяг руу Барилга МН сэтгүүлийн шинэ дугаарын мэдэгдэл
            очно.
          </p>
          <Link to="/profile" className="inline-flex px-6 py-3 bg-stone-950 text-white text-sm font-semibold hover:bg-stone-800">
            Миний хэвлэлүүд рүү
          </Link>
        </>
      )}
      {state.status === 'error' && (
        <>
          <XCircle className="w-14 h-14 mx-auto text-red-600" />
          <h1 className="font-serif text-3xl font-bold text-stone-950">Баталгаажсангүй</h1>
          <p className="text-stone-600">{state.message}</p>
          <p className="text-sm text-stone-500">«Миний мэдээлэл» хэсгээс шинэ линк илгээж болно.</p>
          <Link to="/profile" className="inline-flex px-6 py-3 bg-stone-950 text-white text-sm font-semibold hover:bg-stone-800">
            Миний мэдээлэл рүү
          </Link>
        </>
      )}
    </div>
  );
}
