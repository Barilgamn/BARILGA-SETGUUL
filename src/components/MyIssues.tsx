import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { BookOpen, FileText } from 'lucide-react';
import { Purchase } from '../types';
import { PURCHASE_STATUS_LABELS, watchMyPurchases } from '../lib/purchases';

export function MyIssues({ uid }: { uid: string }) {
  const [purchases, setPurchases] = useState<Purchase[] | null>(null);

  useEffect(() => watchMyPurchases(uid, setPurchases), [uid]);

  const visible = (purchases || []).filter(p => p.status !== 'cancelled');
  if (!purchases || visible.length === 0) return null;

  return (
    <section className="space-y-4">
      <h2 className="font-serif text-xl sm:text-2xl font-bold text-stone-900">Худалдаж авсан цахим дугаарууд</h2>
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-x-4 gap-y-6">
        {visible.map(p => (
          <article key={p.id} className="flex flex-col">
            <Link
              to={p.status === 'paid' ? `/read/${p.issueId}` : `/buy/${p.issueId}`}
              className="relative aspect-[3/4] rounded-xl overflow-hidden ring-1 ring-stone-200 shadow-sm bg-stone-100"
            >
              <img src={p.coverImage} alt={p.issueTitle} loading="lazy" referrerPolicy="no-referrer" className="w-full h-full object-cover" />
              {p.status !== 'paid' && (
                <span className="absolute inset-x-2 bottom-2 rounded-md bg-amber-100 text-amber-900 text-[11px] font-semibold px-2 py-1 text-center">
                  {PURCHASE_STATUS_LABELS[p.status]}
                </span>
              )}
            </Link>
            <h3 className="mt-2 text-sm font-semibold text-stone-900 leading-snug line-clamp-2">{p.issueTitle}</h3>
            <Link
              to={p.status === 'paid' ? `/read/${p.issueId}` : `/buy/${p.issueId}`}
              className="mt-2 inline-flex items-center justify-center gap-1.5 py-2 rounded-lg text-sm font-semibold bg-stone-900 text-white hover:bg-stone-800"
            >
              {p.status === 'paid' ? <BookOpen className="w-4 h-4" /> : <FileText className="w-4 h-4" />}
              {p.status === 'paid' ? 'Унших' : 'Төлбөр төлөх'}
            </Link>
          </article>
        ))}
      </div>
    </section>
  );
}
