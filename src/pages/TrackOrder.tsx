import { Link } from 'react-router-dom';
import { Package, ArrowRight } from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';
import { CatalogOrderLookup } from '../components/CatalogOrderLookup';

export function TrackOrder() {
  const { user } = useAuth();

  return (
    <div className="max-w-3xl mx-auto sm:mt-6 space-y-8">
      <CatalogOrderLookup />

      {/* Magazine and subscription orders belong to an account, so they're
          shown to their owner after login rather than looked up by phone. */}
      <div className="bg-white p-6 sm:p-10 rounded-2xl sm:rounded-3xl shadow-sm border border-stone-200/90 text-center space-y-4">
        <Package className="w-10 h-10 text-amber-600 mx-auto" />
        <h2 className="font-serif text-2xl sm:text-3xl font-bold text-stone-900 tracking-tight">
          Сэтгүүл, багц захиалгаа шалгах
        </h2>
        <p className="text-stone-500 text-sm max-w-sm mx-auto">
          Сэтгүүлийн болон багц захиалгын явц, хүргэлтийн төлөв таны «Миний хэвлэлүүд» хуудсанд харагдана.
        </p>
        <Link
          to={user ? '/profile' : '/login'}
          state={user ? undefined : { returnTo: '/profile' }}
          className="inline-flex items-center justify-center gap-2 w-full sm:w-auto px-8 py-3.5 rounded-xl bg-stone-900 hover:bg-stone-800 text-white font-semibold text-sm"
        >
          {user ? 'Миний хэвлэлүүд рүү очих' : 'Утсаараа нэвтэрч харах'}
          <ArrowRight className="w-4 h-4" />
        </Link>
      </div>
    </div>
  );
}
