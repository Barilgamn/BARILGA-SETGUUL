import { Link } from 'react-router-dom';
import { ArrowUpRight, Lock } from 'lucide-react';
import { SaveButton } from './SaveButton';
import { displayTitle, readHref } from '../lib/library';

export function Cover({ src, alt, className = '', eager = false }: { src: string; alt: string; className?: string; eager?: boolean }) {
  return (
    <div className={`relative aspect-[3/4] bg-stone-200 overflow-hidden ${className}`}>
      <img
        src={src}
        alt={alt}
        loading={eager ? 'eager' : 'lazy'}
        referrerPolicy="no-referrer"
        className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-[1.03]"
      />
      {/* spine */}
      <div className="absolute inset-y-0 left-0 w-2.5 bg-gradient-to-r from-black/25 via-white/10 to-transparent pointer-events-none" />
    </div>
  );
}

// One title in the library grid: cover, name, year/pages and what a click does
export function LibraryCard({ item }: { item: any }) {
  return (
    <article className="group flex flex-col">
      <div className="relative">
        <Link to={readHref(item)} className="block">
          <Cover
            src={item.coverImage}
            alt={item.title}
            className="shadow-[0_14px_30px_-16px_rgba(28,25,23,0.45)] transition-shadow group-hover:shadow-[0_24px_40px_-18px_rgba(28,25,23,0.55)]"
          />
        </Link>
        <SaveButton issue={item} variant="overlay" className="absolute top-2 right-2" />
      </div>
      <div className="pt-4 flex flex-col flex-1">
        <h3 className="font-serif text-base sm:text-lg font-bold text-stone-950 leading-snug line-clamp-2">
          <Link to={readHref(item)} className="hover:underline underline-offset-4 decoration-1">
            {displayTitle(item)}
          </Link>
        </h3>
        <p className="mt-1.5 text-sm text-stone-500">
          {item.publishedDate ? new Date(item.publishedDate).getFullYear() : ''}
          {item.pages ? ` · ${item.pages} х.` : ''}
        </p>
        <p className="mt-auto pt-3 text-sm font-semibold text-stone-950 flex items-center gap-1.5">
          {item.locked ? (
            <>
              <Lock className="w-3.5 h-3.5 text-amber-700" /> {item.price.toLocaleString()}₮
            </>
          ) : item.heyzineLink ? (
            <>
              Унших <ArrowUpRight className="w-3.5 h-3.5" />
            </>
          ) : (
            <>Захиалах</>
          )}
        </p>
      </div>
    </article>
  );
}
