import { useEffect, useMemo, useRef, useState } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import { ArrowRight, Search, X } from 'lucide-react';
import { CATEGORIES, displayTitle, issueNo, readHref, useLibrary } from '../lib/library';
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
  const typed = useTypewriter(TYPED_EXAMPLES, !query);

  // Live matches under the search box, so results show while typing even
  // when the full grid is below the fold (or behind a phone keyboard)
  const [focused, setFocused] = useState(false);
  const [highlight, setHighlight] = useState(-1);
  const blurTimer = useRef<ReturnType<typeof setTimeout>>();
  const navigate = useNavigate();
  const showResults = () => {
    setFocused(false);
    (document.activeElement as HTMLElement | null)?.blur();
    document.getElementById('library-results')?.scrollIntoView({ behavior: 'smooth' });
  };

  const live = results.slice(0, 6);
  const dropdownOpen = focused && query.trim().length > 0 && loaded;

  const activeLabel = CATEGORIES.find(c => c.id === category)?.label || 'Бүгд';

  return (
    <div className="space-y-8 sm:space-y-10">
      {/* Title and search: a slim band so results stay in view */}
      <header className="-mx-4 sm:-mx-6 lg:-mx-8 -mt-6 sm:-mt-10 bg-stone-950 text-white relative z-40">
        <div
          aria-hidden="true"
          className="absolute inset-0 opacity-[0.07] pointer-events-none"
          style={{ backgroundImage: 'repeating-linear-gradient(0deg, #fff 0 1px, transparent 1px 36px)' }}
        />
        <div className="relative px-4 sm:px-6 lg:px-8 py-6 sm:py-8 grid grid-cols-1 lg:grid-cols-12 gap-5 lg:gap-10 items-center">
          <div className="lg:col-span-4">
            <p className="text-xs sm:text-sm font-semibold text-amber-400">Барилга.МН цахим номын сан</p>
            <h1 className="font-serif text-3xl sm:text-4xl font-bold tracking-tight leading-tight mt-1">Цахим номууд</h1>
            {loaded && (
              <p className="mt-1.5 text-sm text-stone-400 tabular-nums">
                {magazines.length.toLocaleString()} хэвлэл · {(counts.get('magazine') || 0).toLocaleString()} сэтгүүл ·{' '}
                {(counts.get('norm') || 0).toLocaleString()} норм дүрэм
              </p>
            )}
          </div>

          <div className="lg:col-span-8">
            <form
              role="search"
              onSubmit={e => {
                e.preventDefault();
                if (highlight >= 0 && live[highlight]) navigate(readHref(live[highlight]));
                else showResults();
              }}
              className="relative"
            >
              <label htmlFor="library-search" className="sr-only">Цахим номын сангаас хайх</label>
              <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-stone-500 pointer-events-none" />
              <input
                id="library-search"
                type="search"
                value={query}
                onChange={e => {
                  update('q', e.target.value, '');
                  setHighlight(-1);
                }}
                onFocus={() => {
                  clearTimeout(blurTimer.current);
                  setFocused(true);
                }}
                onBlur={() => (blurTimer.current = setTimeout(() => setFocused(false), 150))}
                onKeyDown={e => {
                  if (e.key === 'Escape') (e.target as HTMLInputElement).blur();
                  if (e.key === 'ArrowDown') {
                    e.preventDefault();
                    setHighlight(h => Math.min(h + 1, live.length - 1));
                  }
                  if (e.key === 'ArrowUp') {
                    e.preventDefault();
                    setHighlight(h => Math.max(h - 1, -1));
                  }
                }}
                placeholder={typed ? '' : 'Нэр, дугаар, түлхүүр үгээр хайх'}
                autoComplete="off"
                role="combobox"
                aria-expanded={dropdownOpen}
                aria-controls="library-live"
                className="w-full pl-12 pr-28 sm:pr-32 py-3.5 [&::-webkit-search-cancel-button]:hidden bg-white text-stone-950 text-base placeholder:text-stone-400 border-0 focus:outline-none focus:ring-4 focus:ring-amber-400/40"
              />
              {/* Example searches type themselves out while the box is empty */}
              {!query && typed && (
                <span aria-hidden="true" className="absolute left-12 top-1/2 -translate-y-1/2 text-base text-stone-400 pointer-events-none whitespace-nowrap overflow-hidden max-w-[calc(100%-10rem)]">
                  {typed}
                  <span className="inline-block w-px h-5 align-middle bg-stone-400 ml-0.5 animate-pulse" />
                </span>
              )}
              {query && (
                <button
                  type="button"
                  onClick={() => update('q', '', '')}
                  aria-label="Хайлт цэвэрлэх"
                  className="absolute right-[5.75rem] sm:right-[6.75rem] top-1/2 -translate-y-1/2 p-2 text-stone-400 hover:text-stone-950"
                >
                  <X className="w-4 h-4" />
                </button>
              )}
              <button
                type="submit"
                className="absolute right-1.5 top-1/2 -translate-y-1/2 px-5 sm:px-6 py-2.5 bg-amber-400 hover:bg-amber-300 text-stone-950 text-sm font-semibold"
              >
                Хайх
              </button>

              {dropdownOpen && (
                <div
                  id="library-live"
                  role="listbox"
                  className="absolute left-0 right-0 top-full mt-1 bg-white text-stone-950 shadow-[0_24px_48px_-12px_rgba(0,0,0,0.45)] border border-stone-200"
                >
                  {live.length === 0 ? (
                    <p className="px-4 py-5 text-sm text-stone-500">«{query.trim()}» — илэрц олдсонгүй.</p>
                  ) : (
                    <>
                      <ul className="max-h-[60vh] overflow-y-auto divide-y divide-stone-100">
                        {live.map((item, i) => (
                          <li key={item.id} role="option" aria-selected={i === highlight}>
                            <Link
                              to={readHref(item)}
                              onMouseEnter={() => setHighlight(i)}
                              className={`flex items-center gap-3 px-3 py-2.5 ${i === highlight ? 'bg-stone-100' : 'hover:bg-stone-50'}`}
                            >
                              <img src={item.coverImage} alt="" referrerPolicy="no-referrer" className="w-9 aspect-[3/4] object-cover bg-stone-200 shrink-0" />
                              <span className="min-w-0 flex-1">
                                <span className="text-sm font-semibold leading-snug line-clamp-2">{displayTitle(item)}</span>
                                <span className="block text-xs text-stone-500 mt-0.5">
                                  {CATEGORIES.find(c => c.id === item.category)?.label}
                                  {item.publishedDate ? ` · ${new Date(item.publishedDate).getFullYear()}` : ''}
                                  {item.locked ? ` · ${item.price.toLocaleString()}₮` : ''}
                                </span>
                              </span>
                            </Link>
                          </li>
                        ))}
                      </ul>
                      <button
                        type="button"
                        onMouseDown={e => e.preventDefault()}
                        onClick={showResults}
                        className="w-full flex items-center justify-between px-4 py-3 border-t border-stone-200 text-sm font-semibold hover:bg-stone-50"
                      >
                        Бүх {results.length.toLocaleString()} илэрцийг харах <ArrowRight className="w-4 h-4" />
                      </button>
                    </>
                  )}
                </div>
              )}
            </form>

            <div className="mt-3 -mx-4 px-4 sm:mx-0 sm:px-0 flex items-center gap-2 overflow-x-auto hide-scrollbar">
              <span className="shrink-0 text-xs sm:text-sm text-stone-400 mr-0.5">Түгээмэл:</span>
              {suggestions.map(term => (
                <button
                  key={term}
                  type="button"
                  onClick={() => {
                    update('q', term, '');
                    showResults();
                  }}
                  className={`shrink-0 whitespace-nowrap px-3 py-1 rounded-full border text-xs sm:text-sm transition-colors ${
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
