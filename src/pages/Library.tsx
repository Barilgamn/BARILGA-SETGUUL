import { useEffect, useMemo, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { Search, X } from 'lucide-react';
import { CATEGORIES, displayTitle, issueNo, useLibrary } from '../lib/library';
import { LibraryCard } from '../components/LibraryCard';

// «Цахим номууд»: the whole library on its own page, with categories and
// search kept in the address (?category=norm&q=…) so links and the back
// button land on the same view.

const pageSize = () => (typeof window !== 'undefined' && window.matchMedia('(min-width: 768px)').matches ? 24 : 12);

type Sort = 'newest' | 'title';

export function Library() {
  const { magazines, loaded } = useLibrary();
  const [params, setParams] = useSearchParams();
  const category = params.get('category') || 'all';
  const query = params.get('q') || '';
  const sort: Sort = params.get('sort') === 'title' ? 'title' : 'newest';
  const [visibleCount, setVisibleCount] = useState(pageSize);

  const update = (key: string, value: string, fallback: string) => {
    const next = new URLSearchParams(params);
    if (value && value !== fallback) next.set(key, value);
    else next.delete(key);
    setParams(next, { replace: true });
  };

  useEffect(() => {
    setVisibleCount(pageSize());
  }, [category, query, sort]);

  const counts = useMemo(() => {
    const byCategory = new Map<string, number>();
    magazines.forEach(m => byCategory.set(m.category, (byCategory.get(m.category) || 0) + 1));
    return byCategory;
  }, [magazines]);
  const categories = CATEGORIES.filter(cat => cat.id === 'all' || counts.get(cat.id));

  const matchesQuery = useMemo(() => {
    const q = query.trim().toLowerCase();
    return (m: any) => !q || [displayTitle(m), m.issueNumber, m.description].some(text => String(text || '').toLowerCase().includes(q));
  }, [query]);
  // How many hits the search has outside the chosen category, to point there
  const allMatches = useMemo(() => magazines.filter(matchesQuery).length, [magazines, matchesQuery]);

  const results = useMemo(() => {
    const matches = magazines.filter(m => (category === 'all' || m.category === category) && matchesQuery(m));
    if (sort === 'title') return [...matches].sort((a, b) => String(a.title).localeCompare(String(b.title), 'mn'));
    // Magazine issues follow their numbers; everything else its upload date
    return [...matches].sort((a, b) => {
      const na = a.category === 'magazine' ? issueNo(a) : null;
      const nb = b.category === 'magazine' ? issueNo(b) : null;
      if (na && nb && na !== nb) return nb - na;
      return (b.publishedDate || 0) - (a.publishedDate || 0);
    });
  }, [magazines, category, matchesQuery, sort]);

  const activeLabel = CATEGORIES.find(c => c.id === category)?.label || 'Бүгд';

  return (
    <div className="space-y-8 sm:space-y-10">
      {/* Title and search */}
      <header className="pt-2 sm:pt-6 space-y-6">
        <div>
          <p className="text-sm font-semibold text-amber-700">Барилга.МН цахим номын сан</p>
          <h1 className="font-serif text-4xl sm:text-5xl lg:text-6xl font-bold tracking-tight text-stone-950 leading-[1.05] mt-2">
            Цахим номууд
          </h1>
          <p className="mt-4 max-w-2xl text-base sm:text-lg text-stone-600 leading-relaxed">
            Барилга МН сэтгүүл, ном товхимол, норм дүрэм, стандарт, судалгаа, зураг төсөл
            {loaded ? ` — ${magazines.length.toLocaleString()} хэвлэл нэг дор.` : ' нэг дор.'}
          </p>
        </div>

        <label className="relative block max-w-2xl">
          <span className="sr-only">Хайх</span>
          <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-stone-500" />
          <input
            type="search"
            value={query}
            onChange={e => update('q', e.target.value, '')}
            placeholder="Нэр, дугаар, түлхүүр үгээр хайх"
            className="w-full pl-12 pr-12 py-4 bg-white border border-stone-300 focus:border-stone-950 focus:ring-0 text-base text-stone-950 placeholder:text-stone-400 focus:outline-none shadow-sm"
          />
          {query && (
            <button
              type="button"
              onClick={() => update('q', '', '')}
              aria-label="Хайлт цэвэрлэх"
              className="absolute right-3 top-1/2 -translate-y-1/2 p-1.5 text-stone-500 hover:text-stone-950"
            >
              <X className="w-4 h-4" />
            </button>
          )}
        </label>
      </header>

      {/* Categories stay in reach while scrolling the grid */}
      <div className="sticky top-16 lg:top-20 z-30 -mx-4 sm:-mx-6 lg:-mx-8 px-4 sm:px-6 lg:px-8 bg-[#FAF8F4]/95 backdrop-blur-md border-b border-stone-200">
        <nav className="flex overflow-x-auto hide-scrollbar gap-2 py-3" aria-label="Ангилал">
          {categories.map(cat => {
            const active = category === cat.id;
            return (
              <button
                key={cat.id}
                type="button"
                onClick={e => {
                  update('category', cat.id, 'all');
                  e.currentTarget.scrollIntoView({ behavior: 'smooth', block: 'nearest', inline: 'center' });
                }}
                aria-pressed={active}
                className={`shrink-0 whitespace-nowrap px-4 py-2 rounded-full border text-sm font-semibold transition-colors ${
                  active
                    ? 'bg-stone-950 border-stone-950 text-white'
                    : 'bg-white border-stone-300 text-stone-700 hover:border-stone-950 hover:text-stone-950'
                }`}
              >
                {cat.label}
                {loaded && (
                  <span className={`ml-1.5 font-normal tabular-nums ${active ? 'text-stone-300' : 'text-stone-400'}`}>
                    {(cat.id === 'all' ? magazines.length : counts.get(cat.id) || 0).toLocaleString()}
                  </span>
                )}
              </button>
            );
          })}
        </nav>
      </div>

      {/* Result count and order */}
      <div className="flex items-center justify-between gap-4 text-sm">
        <p className="text-stone-600">
          {loaded ? (
            <>
              <span className="font-semibold text-stone-950 tabular-nums">{results.length.toLocaleString()}</span> хэвлэл
              {category !== 'all' && <> · {activeLabel}</>}
              {query.trim() && <> · «{query.trim()}»</>}
            </>
          ) : (
            'Ачаалж байна…'
          )}
        </p>
        <label className="flex items-center gap-2 text-stone-600">
          <span className="hidden sm:inline">Эрэмбэ:</span>
          <select
            value={sort}
            onChange={e => update('sort', e.target.value, 'newest')}
            className="bg-transparent border-0 border-b border-stone-400 py-1 pr-6 text-sm font-semibold text-stone-950 focus:ring-0 focus:border-stone-950"
          >
            <option value="newest">Шинэ нь эхэндээ</option>
            <option value="title">Нэрээр (А–Я)</option>
          </select>
        </label>
      </div>

      {loaded && results.length === 0 ? (
        <div className="text-center py-20 space-y-3">
          <p className="font-serif text-2xl font-bold text-stone-950">Хайлт олдсонгүй</p>
          <p className="text-stone-500">Өөр үгээр хайх эсвэл ангиллаа өөрчлөөд үзнэ үү.</p>
          {category !== 'all' && query.trim() && allMatches > 0 ? (
            <button
              type="button"
              onClick={() => update('category', 'all', 'all')}
              className="mt-2 inline-flex items-center px-5 py-2.5 bg-stone-950 hover:bg-stone-800 text-white text-sm font-semibold"
            >
              Бүх ангиллаас {allMatches.toLocaleString()} олдлоо — харах
            </button>
          ) : (query || category !== 'all') && (
            <button
              type="button"
              onClick={() => setParams(new URLSearchParams(), { replace: true })}
              className="mt-2 text-sm font-semibold text-stone-950 underline underline-offset-4"
            >
              Бүх хэвлэлийг харах
            </button>
          )}
        </div>
      ) : (
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-x-5 gap-y-12 sm:gap-x-8 sm:gap-y-14">
          {!loaded &&
            Array.from({ length: 10 }).map((_, i) => (
              <div key={i} className="animate-pulse space-y-3">
                <div className="aspect-[3/4] bg-stone-200" />
                <div className="h-4 w-3/4 bg-stone-200" />
                <div className="h-3 w-1/2 bg-stone-100" />
              </div>
            ))}
          {results.slice(0, visibleCount).map(item => (
            <div key={item.id} className="contents">
              <LibraryCard item={item} />
            </div>
          ))}
        </div>
      )}

      {results.length > visibleCount && (
        <div className="text-center pt-4">
          <button
            type="button"
            onClick={() => setVisibleCount(c => c + pageSize())}
            className="inline-flex items-center justify-center gap-2 px-7 py-3.5 border border-stone-950 text-stone-950 hover:bg-stone-950 hover:text-white text-sm font-semibold transition-colors"
          >
            Цааш үзэх <span className="font-normal opacity-70">({(results.length - visibleCount).toLocaleString()})</span>
          </button>
        </div>
      )}
    </div>
  );
}
