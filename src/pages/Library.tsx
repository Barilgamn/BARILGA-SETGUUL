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

// What the empty search box suggests, one after another
const TYPED_EXAMPLES = [
  'Барилга МН сэтгүүл',
  'Ном, товхимол',
  'БНбД норм дүрэм',
  'Стандарт, ерөнхий шаардлага',
  'Зах зээлийн судалгаа',
  'Зураг төсөл',
  'Эрчим хүчний хэмнэлттэй сууц',
];

// Types each phrase out, holds it, erases it and moves on. With reduced
// motion the phrases simply take turns.
function useTypewriter(phrases: string[], active: boolean) {
  const [text, setText] = useState('');
  useEffect(() => {
    if (!active) return;
    const reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    let phrase = 0;
    let length = 0;
    let deleting = false;
    let timer: ReturnType<typeof setTimeout>;
    const tick = () => {
      const current = phrases[phrase];
      if (reduced) {
        setText(current);
        phrase = (phrase + 1) % phrases.length;
        timer = setTimeout(tick, 2500);
        return;
      }
      length += deleting ? -1 : 1;
      setText(current.slice(0, length));
      if (!deleting && length === current.length) {
        deleting = true;
        timer = setTimeout(tick, 1600);
      } else if (deleting && length === 0) {
        deleting = false;
        phrase = (phrase + 1) % phrases.length;
        timer = setTimeout(tick, 350);
      } else {
        timer = setTimeout(tick, deleting ? 30 : 65);
      }
    };
    timer = setTimeout(tick, 400);
    return () => clearTimeout(timer);
  }, [phrases, active]);
  return active ? text : '';
}

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

  // Latest magazine issue, for the «№…» suggestion and the cover stack
  const latestIssue = useMemo(
    () =>
      magazines
        .filter(m => m.category === 'magazine' && issueNo(m))
        .sort((a, b) => (issueNo(b) ?? 0) - (issueNo(a) ?? 0))[0],
    [magazines]
  );
  const suggestions = [
    ...(latestIssue ? [`№${issueNo(latestIssue)}`] : []),
    'БНбД',
    'Эрчим хүчний хэмнэлт',
    'Газар хөдлөлт',
    'Жишиг үнэ',
    'Барилгын материал',
    'Дулаалга',
  ];
  const heroCovers = useMemo(() => {
    const firstOf = (cat: string) => magazines.find(m => m.category === cat && m.coverImage);
    return [firstOf('norm'), latestIssue, firstOf('book')].filter(Boolean) as any[];
  }, [magazines, latestIssue]);
  const typed = useTypewriter(TYPED_EXAMPLES, !query);

  const activeLabel = CATEGORIES.find(c => c.id === category)?.label || 'Бүгд';

  return (
    <div className="space-y-8 sm:space-y-10">
      {/* Title and search */}
      <header className="-mx-4 sm:-mx-6 lg:-mx-8 -mt-6 sm:-mt-10 bg-stone-950 text-white relative overflow-hidden">
        {/* faint ruled paper behind the title */}
        <div
          aria-hidden="true"
          className="absolute inset-0 opacity-[0.07] pointer-events-none"
          style={{ backgroundImage: 'repeating-linear-gradient(0deg, #fff 0 1px, transparent 1px 44px)' }}
        />
        <div className="relative px-4 sm:px-6 lg:px-8 py-12 sm:py-16 lg:py-20 grid grid-cols-1 lg:grid-cols-12 gap-10 items-center">
          <div className="lg:col-span-7 xl:col-span-7">
            <p className="text-sm font-semibold text-amber-400">Барилга.МН цахим номын сан</p>
            <h1 className="font-serif text-[2.75rem] sm:text-6xl lg:text-7xl font-bold tracking-tight leading-[1.02] mt-3">
              Цахим номууд
            </h1>
            <p className="mt-5 max-w-xl text-base sm:text-lg text-stone-300 leading-relaxed">
              2010 оноос хойших сэтгүүл, ном товхимол, норм дүрэм, стандарт, судалгаа, зураг төсөл — бүгд нэг дор.
            </p>

            <form
              role="search"
              onSubmit={e => {
                e.preventDefault();
                (document.activeElement as HTMLElement | null)?.blur();
                document.getElementById('library-results')?.scrollIntoView({ behavior: 'smooth' });
              }}
              className="mt-8 relative max-w-2xl"
            >
              <label htmlFor="library-search" className="sr-only">Цахим номын сангаас хайх</label>
              <Search className="absolute left-5 top-1/2 -translate-y-1/2 w-5 h-5 text-stone-500 pointer-events-none" />
              <input
                id="library-search"
                type="search"
                value={query}
                onChange={e => update('q', e.target.value, '')}
                placeholder={typed ? '' : 'Нэр, дугаар, түлхүүр үгээр хайх'}
                autoComplete="off"
                className="w-full pl-14 pr-32 sm:pr-36 py-5 bg-white text-stone-950 text-base sm:text-lg placeholder:text-stone-400 border-0 focus:outline-none focus:ring-4 focus:ring-amber-400/40"
              />
              {/* Example searches type themselves out while the box is empty */}
              {!query && typed && (
                <span aria-hidden="true" className="absolute left-14 top-1/2 -translate-y-1/2 text-base sm:text-lg text-stone-400 pointer-events-none whitespace-nowrap overflow-hidden max-w-[calc(100%-11rem)]">
                  {typed}
                  <span className="inline-block w-px h-5 align-middle bg-stone-400 ml-0.5 animate-pulse" />
                </span>
              )}
              {query && (
                <button
                  type="button"
                  onClick={() => update('q', '', '')}
                  aria-label="Хайлт цэвэрлэх"
                  className="absolute right-[6.5rem] sm:right-[7.5rem] top-1/2 -translate-y-1/2 p-2 text-stone-400 hover:text-stone-950"
                >
                  <X className="w-4 h-4" />
                </button>
              )}
              <button
                type="submit"
                className="absolute right-2 top-1/2 -translate-y-1/2 px-5 sm:px-7 py-3 bg-amber-400 hover:bg-amber-300 text-stone-950 text-sm sm:text-base font-semibold"
              >
                Хайх
              </button>
            </form>

            <div className="mt-5 -mx-4 px-4 sm:mx-0 sm:px-0 flex sm:flex-wrap items-center gap-2 overflow-x-auto hide-scrollbar">
              <span className="shrink-0 text-sm text-stone-400 mr-1">Түгээмэл:</span>
              {suggestions.map(term => (
                <button
                  key={term}
                  type="button"
                  onClick={() => {
                    update('q', term, '');
                    document.getElementById('library-results')?.scrollIntoView({ behavior: 'smooth' });
                  }}
                  className={`shrink-0 whitespace-nowrap px-3 py-1.5 rounded-full border text-sm transition-colors ${
                    query === term
                      ? 'bg-white text-stone-950 border-white'
                      : 'border-white/25 text-stone-200 hover:border-white hover:text-white'
                  }`}
                >
                  {term}
                </button>
              ))}
            </div>
          </div>

          {/* A fanned stack of covers from the library, with its size */}
          <div className="hidden lg:block lg:col-span-5">
            <div className="relative h-[22rem] xl:h-[24rem]">
              {heroCovers.map((item, i) => (
                <img
                  key={item.id}
                  src={item.coverImage}
                  alt=""
                  referrerPolicy="no-referrer"
                  className="absolute top-1/2 left-1/2 w-44 xl:w-48 aspect-[3/4] object-cover shadow-[0_30px_60px_-20px_rgba(0,0,0,0.8)] ring-1 ring-white/10"
                  style={{
                    transform: `translate(-50%, -50%) translateX(${(i - 1) * 7.5}rem) rotate(${(i - 1) * 7}deg) scale(${i === 1 ? 1.06 : 0.94})`,
                    zIndex: i === 1 ? 2 : 1,
                  }}
                />
              ))}
            </div>
            {loaded && (
              <dl className="mt-6 grid grid-cols-3 border-t border-white/15 pt-5 text-center">
                {[
                  { value: magazines.length, label: 'хэвлэл' },
                  { value: counts.get('magazine') || 0, label: 'сэтгүүл' },
                  { value: counts.get('norm') || 0, label: 'норм дүрэм' },
                ].map(stat => (
                  <div key={stat.label}>
                    <dt className="sr-only">{stat.label}</dt>
                    <dd className="font-serif text-3xl font-bold tabular-nums">{stat.value.toLocaleString()}</dd>
                    <dd className="text-xs text-stone-400 mt-1">{stat.label}</dd>
                  </div>
                ))}
              </dl>
            )}
          </div>
        </div>
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
      <div id="library-results" className="scroll-mt-40 flex items-center justify-between gap-4 text-sm">
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
