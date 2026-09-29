import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { MOCK_MAGAZINES } from '../lib/data';
import { fetchHeyzineMagazines } from '../lib/heyzine';
import { db } from '../lib/firebase';
import { collection, getDocs, query, orderBy } from 'firebase/firestore';
import { 
  BookOpen, 
  ArrowRight, 
  Search, 
  Smartphone, 
  Check, 
  MapPin, 
  Phone, 
  Mail, 
  ShieldCheck, 
  Sparkles,
  Layers,
  FileCheck2,
  TrendingUp,
  Building2
} from 'lucide-react';

const PAGE_SIZE = 24;

export function Home() {
  const [magazines, setMagazines] = useState<any[]>([]);
  const [loaded, setLoaded] = useState(false);
  const [activeCategory, setActiveCategory] = useState<string>('all');
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [visibleCount, setVisibleCount] = useState(PAGE_SIZE);
  
  const categories = [
    { id: 'all', label: 'Бүх хэвлэл' },
    { id: 'magazine', label: 'Барилга МН сэтгүүл' },
    { id: 'book', label: 'Ном, товхимол' },
    { id: 'norm', label: 'Норм дүрэм /БНбД/' },
    { id: 'standard', label: 'Стандарт' },
    { id: 'research', label: 'Судалгаа' },
    { id: 'blueprint', label: 'Зураг төсөл' }
  ];

  useEffect(() => {
    const fetchMagazines = async () => {
      const [dbMags, heyzineMags] = await Promise.all([
        getDocs(query(collection(db, 'magazines'), orderBy('createdAt', 'desc')))
          .then(snap => snap.docs.map(doc => ({ id: doc.id, ...doc.data() })))
          .catch(err => {
            console.error('Failed to fetch magazines from Firestore:', err);
            return [];
          }),
        fetchHeyzineMagazines()
      ]);
      // Heyzine flipbooks and Firestore magazines replace the seed data once any exist
      const liveMags = [...heyzineMags, ...dbMags];
      setMagazines(liveMags.length > 0 ? liveMags : MOCK_MAGAZINES);
      setLoaded(true);
    };
    fetchMagazines();
  }, []);

  useEffect(() => {
    setVisibleCount(PAGE_SIZE);
  }, [activeCategory, searchQuery]);

  const leadIssue = magazines.find(mag => mag.category === 'magazine') || magazines[0];
  const leadDescription =
    leadIssue?.description && leadIssue.description.trim() !== leadIssue.title?.trim()
      ? leadIssue.description
      : 'Барилгын салбарын шинэ технологи, ногоон барилгын чиг хандлага, шинэчлэгдсэн БНбД норм ба материалын зах зээлийн үнэ ханшийн цогц судалгаа.';
  const leadYear = leadIssue?.publishedDate ? new Date(leadIssue.publishedDate).getFullYear() : new Date().getFullYear();

  const visibleCategories = categories.filter(
    cat => cat.id === 'all' || magazines.some(mag => mag.category === cat.id)
  );

  const filteredMagazines = magazines.filter(mag => {
    const matchesCategory = activeCategory === 'all' || mag.category === activeCategory;
    const matchesSearch = !searchQuery.trim() || 
      mag.title?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      mag.issueNumber?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      mag.description?.toLowerCase().includes(searchQuery.toLowerCase());
    return matchesCategory && matchesSearch;
  });

  return (
    <div className="space-y-12 sm:space-y-24">
      {/* 1. Lead issue */}
      <section className="relative bg-[#0C121E] text-white rounded-2xl sm:rounded-3xl overflow-hidden border border-stone-800 shadow-2xl">
        <div className="absolute inset-0 bg-[radial-gradient(#1E293B_1px,transparent_1px)] [background-size:24px_24px] opacity-25"></div>
        <div className="absolute top-0 right-0 w-96 h-96 bg-amber-600/10 rounded-full blur-3xl pointer-events-none"></div>

        {!leadIssue ? (
          <div className="relative z-10 p-6 sm:p-12 lg:p-16 grid grid-cols-1 lg:grid-cols-12 gap-8 lg:gap-12 items-center animate-pulse">
            <div className="order-first lg:order-last lg:col-span-5 flex justify-center">
              <div className="w-40 sm:w-64 lg:w-full lg:max-w-sm aspect-[3/4] rounded-xl bg-white/5"></div>
            </div>
            <div className="lg:col-span-7 space-y-4">
              <div className="h-4 w-40 rounded bg-white/10"></div>
              <div className="h-10 w-3/4 rounded bg-white/10"></div>
              <div className="h-4 w-full rounded bg-white/5"></div>
              <div className="h-4 w-2/3 rounded bg-white/5"></div>
            </div>
          </div>
        ) : (
        <div className="relative z-10 p-6 sm:p-12 lg:p-16 grid grid-cols-1 lg:grid-cols-12 gap-8 lg:gap-12 items-center">
          {/* Cover — first on phones so the issue is visible without scrolling */}
          <div className="order-first lg:order-last lg:col-span-5 flex justify-center">
            <Link
              to={`/magazine/${leadIssue.id}`}
              className="group relative block w-40 sm:w-64 lg:w-full lg:max-w-sm"
            >
              <div className="relative rounded-xl overflow-hidden shadow-2xl ring-1 ring-white/10 transition-transform duration-500 group-hover:-translate-y-1">
                <div className="aspect-[3/4] bg-stone-900 overflow-hidden relative">
                  <img
                    src={leadIssue.coverImage}
                    alt={leadIssue.title}
                    referrerPolicy="no-referrer"
                    className="w-full h-full object-cover"
                  />
                  <div className="absolute inset-y-0 left-0 w-3 bg-gradient-to-r from-black/40 via-white/15 to-transparent pointer-events-none"></div>
                </div>
              </div>
            </Link>
          </div>

          <div className="lg:col-span-7 space-y-5 sm:space-y-6 text-center lg:text-left">
            <div className="inline-flex items-center gap-2 text-xs sm:text-sm font-semibold text-amber-400">
              <span className="w-2 h-2 rounded-full bg-amber-400 animate-pulse"></span>
              <span>Шинэ дугаар · {leadYear} он</span>
            </div>

            <h1 className="font-serif text-3xl sm:text-4xl lg:text-5xl font-bold tracking-tight text-white leading-tight text-balance">
              {leadIssue.title}
            </h1>

            <p className="text-stone-300 text-base sm:text-lg leading-relaxed max-w-2xl mx-auto lg:mx-0">
              {leadDescription}
            </p>

            <div className="hidden sm:grid grid-cols-2 gap-3 py-4 border-y border-stone-800/80 text-sm text-stone-300 text-left">
              <div className="flex items-center gap-2">
                <Check className="w-4 h-4 text-amber-400 shrink-0" />
                <span>120+ нэр төрлийн материалын үнэ ханш</span>
              </div>
              <div className="flex items-center gap-2">
                <Check className="w-4 h-4 text-amber-400 shrink-0" />
                <span>Хот төлөвлөлт, архитектурын онцлох төслүүд</span>
              </div>
              <div className="flex items-center gap-2">
                <Check className="w-4 h-4 text-amber-400 shrink-0" />
                <span>БНбД норм, дүрмийн шинэчлэлтийн тойм</span>
              </div>
              <div className="flex items-center gap-2">
                <Check className="w-4 h-4 text-amber-400 shrink-0" />
                <span>Утас, компьютер дээр цахимаар унших</span>
              </div>
            </div>

            <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3 pt-1">
              {leadIssue.heyzineLink && (
                <Link
                  to={`/read/${leadIssue.id}`}
                  className="inline-flex items-center justify-center gap-2 px-7 py-3.5 rounded-xl bg-amber-500 hover:bg-amber-400 text-stone-950 font-bold text-sm transition-colors"
                >
                  <BookOpen className="w-4 h-4" />
                  <span>Цахимаар унших</span>
                </Link>
              )}
              <Link
                to={`/magazine/${leadIssue.id}`}
                className="inline-flex items-center justify-center gap-2 px-6 py-3.5 rounded-xl bg-white/10 hover:bg-white/15 text-white font-semibold text-sm transition-colors border border-stone-700/60"
              >
                <span>Хэвлэмэлээр захиалах</span>
                <ArrowRight className="w-4 h-4" />
              </Link>
            </div>

            <p className="text-sm text-stone-400">
              Цахим <span className="text-stone-100 font-semibold tabular-nums">{(leadIssue.priceDigital || 8000).toLocaleString()}₮</span>
              <span className="mx-2" aria-hidden="true">·</span>
              Хэвлэмэл <span className="text-stone-100 font-semibold tabular-nums">{(leadIssue.pricePrint || 15000).toLocaleString()}₮</span>
            </p>
          </div>
        </div>
        )}
      </section>

      {/* 2. At a glance */}
      <section className="bg-white rounded-2xl border border-stone-200/80 p-5 sm:p-6 shadow-sm">
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-5 sm:gap-6">
          {[
            { icon: Layers, title: loaded ? `${magazines.length}+ хэвлэл` : 'Цахим архив', sub: 'Бүрэн цахим архив' },
            { icon: FileCheck2, title: 'БНбД, стандарт', sub: 'Хүчин төгөлдөр дүрмүүд' },
            { icon: TrendingUp, title: 'Сар бүрийн судалгаа', sub: 'Үнэ ханшийн индекс' },
            { icon: Building2, title: 'Орон даяар', sub: 'Хүргэлтийн сүлжээ' },
          ].map(({ icon: Icon, title, sub }) => (
            <div key={sub} className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-amber-50 flex items-center justify-center shrink-0">
                <Icon className="w-5 h-5 text-amber-600" />
              </div>
              <div className="min-w-0">
                <p className="text-sm sm:text-base font-bold text-stone-900 tabular-nums leading-snug">{title}</p>
                <p className="text-xs text-stone-500 leading-snug">{sub}</p>
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* 3. Catalog & Digital Archive Filter */}
      <section id="magazines" className="space-y-8 scroll-mt-24">
        {/* Section Header with Clean Filter Controls */}
        <div className="space-y-6">
          <div className="flex flex-col md:flex-row md:items-end justify-between gap-4 pb-4 border-b border-stone-200">
            <div>
              <span className="text-xs text-amber-600 font-bold block mb-1">
                Каталог & цахим сан
              </span>
              <h2 className="font-serif text-2xl sm:text-3xl font-bold tracking-tight text-stone-900">
                Сэтгүүл, ном, норм дүрмийн сан
              </h2>
            </div>

            {/* Search Box */}
            <div className="relative w-full md:w-80">
              <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-stone-400" />
              <input
                type="search"
                placeholder="Гарчиг, дугаараар хайх..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-10 pr-4 py-3 bg-white border border-stone-300 rounded-xl text-base sm:text-sm text-stone-900 placeholder:text-stone-400 focus:outline-none focus:ring-2 focus:ring-stone-900 transition-all"
              />
            </div>
          </div>

          {/* Category Tabs: Segmented Control */}
          <div className="flex overflow-x-auto hide-scrollbar gap-2 -mx-4 px-4 sm:mx-0 sm:px-0">
            {visibleCategories.map((cat) => (
              <button
                key={cat.id}
                onClick={(e) => {
                  setActiveCategory(cat.id);
                  e.currentTarget.scrollIntoView({ behavior: 'smooth', block: 'nearest', inline: 'center' });
                }}
                className={`px-4 py-2 text-sm font-semibold rounded-full border transition-colors whitespace-nowrap shrink-0 ${
                  activeCategory === cat.id
                    ? 'bg-stone-900 border-stone-900 text-white'
                    : 'bg-white border-stone-300 text-stone-700 hover:border-stone-500'
                }`}
              >
                {cat.label}
                {loaded && (
                  <span className={`ml-1.5 tabular-nums ${activeCategory === cat.id ? 'text-stone-300' : 'text-stone-400'}`}>
                    {cat.id === 'all' ? magazines.length : magazines.filter(mag => mag.category === cat.id).length}
                  </span>
                )}
              </button>
            ))}
          </div>
        </div>

        {/* Magazines Grid */}
        {loaded && filteredMagazines.length === 0 ? (
          <div className="text-center py-20 bg-white rounded-2xl border border-stone-200 p-8 space-y-3">
            <BookOpen className="w-10 h-10 text-stone-300 mx-auto" />
            <h3 className="font-serif text-lg font-bold text-stone-800">Хайлт олдсонгүй</h3>
            <p className="text-xs text-stone-500 max-w-sm mx-auto">
              Таны хайсан түлхүүр үгэнд тохирох хэвлэл одоогоор олдсонгүй. Өөр үгээр хайх эсвэл ангиллаа өөрчлөөд үзнэ үү.
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-x-4 gap-y-8 sm:gap-x-6 sm:gap-y-10">
            {!loaded && Array.from({ length: 8 }).map((_, i) => (
              <div key={i} className="animate-pulse space-y-3">
                <div className="aspect-[3/4] rounded-xl bg-stone-200"></div>
                <div className="h-4 w-3/4 rounded bg-stone-200"></div>
                <div className="h-3 w-1/2 rounded bg-stone-100"></div>
              </div>
            ))}
            {filteredMagazines.slice(0, visibleCount).map((item) => (
              <article key={item.id} className="group flex flex-col">
                <Link
                  to={item.heyzineLink ? `/read/${item.id}` : `/magazine/${item.id}`}
                  className="relative aspect-[3/4] bg-stone-100 rounded-xl overflow-hidden block shadow-sm ring-1 ring-stone-200 group-hover:shadow-lg transition-shadow"
                >
                  <img
                    loading="lazy"
                    src={item.coverImage}
                    alt={item.title}
                    referrerPolicy="no-referrer"
                    className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-[1.03]"
                  />
                  <div className="absolute inset-y-0 left-0 w-2 bg-gradient-to-r from-black/25 to-transparent pointer-events-none"></div>
                  {item.heyzineLink && (
                    <span className="absolute bottom-2 left-2 inline-flex items-center gap-1 rounded-md bg-white/95 px-2 py-1 text-[11px] font-semibold text-stone-900 shadow-sm">
                      <BookOpen className="w-3 h-3" /> Унших
                    </span>
                  )}
                </Link>

                <div className="pt-3 flex flex-col flex-1">
                  <h3 className="text-sm sm:text-base font-semibold text-stone-900 leading-snug line-clamp-2 group-hover:text-amber-700 transition-colors">
                    <Link to={`/magazine/${item.id}`}>{item.title}</Link>
                  </h3>
                  <p className="mt-1 text-xs text-stone-500">
                    {item.publishedDate ? new Date(item.publishedDate).getFullYear() : ''}
                    {item.pages ? ` · ${item.pages} хуудас` : ''}
                  </p>
                  <div className="mt-auto pt-3 flex items-center justify-between gap-2">
                    <span className="text-sm font-bold text-stone-900 tabular-nums">
                      {(item.priceDigital || 8000).toLocaleString()}₮
                    </span>
                    <Link
                      to={`/magazine/${item.id}`}
                      className="text-xs sm:text-sm font-semibold text-stone-700 hover:text-stone-950 underline-offset-4 hover:underline"
                    >
                      Захиалах
                    </Link>
                  </div>
                </div>
              </article>
            ))}
          </div>
        )}

        {filteredMagazines.length > visibleCount && (
          <div className="text-center mt-10">
            <button
              type="button"
              onClick={() => setVisibleCount(c => c + PAGE_SIZE)}
              className="px-6 py-3 rounded-lg border border-stone-300 text-stone-800 hover:bg-stone-50 text-sm font-semibold transition-colors"
            >
              Цааш үзэх ({filteredMagazines.length - visibleCount})
            </button>
          </div>
        )}
      </section>

      {/* 4. Architectural Monograph Subscription Tiers */}
      <section id="subscriptions" className="bg-[#0C121E] text-white rounded-2xl sm:rounded-3xl px-5 py-10 sm:p-14 border border-stone-800 shadow-xl scroll-mt-24">
        <div className="max-w-3xl mx-auto text-center space-y-4 mb-10 sm:mb-14">
          <span className="text-xs text-amber-400 font-bold block">
            Бүтээн байгуулагчдад зориулсан багцууд
          </span>
          <h2 className="font-serif text-2xl sm:text-4xl font-bold tracking-tight text-white">
            Барилга.МН сэтгүүлийн албан ёсны захиалга
          </h2>
          <p className="text-stone-400 text-sm leading-relaxed max-w-xl mx-auto font-sans">
            Сар бүрийн шинэ хэвлэлтийг хамгийн түрүүнд хүлээн авч, цахим архивт бүтэн жилийн турш хязгааргүй нэвтрэх боломж.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-10 md:gap-8 items-stretch">
          {/* Tier 1: Quarterly */}
          <div className="bg-stone-900/80 rounded-2xl p-8 border border-stone-800 flex flex-col justify-between hover:border-stone-700 transition-all">
            <div className="space-y-4">
              <span className="text-xs font-mono uppercase tracking-wider text-stone-400 block">
                Улирлын багц
              </span>
              <h3 className="font-serif text-2xl font-bold text-white">3 Дугаар</h3>
              <p className="text-xs text-stone-400 leading-relaxed font-sans">
                Улирлын барилгын төсөл, судалгааны мэдээллүүдийг цаг алдалгүй авах хүсэлтэй мэргэжилтнүүдэд.
              </p>
              
              <div className="pt-4 border-t border-stone-800">
                <div className="font-mono text-3xl font-extrabold text-white tabular-nums">41,000₮</div>
                <div className="text-[11px] text-stone-400 mt-1">13,660₮ / нэг дугаар</div>
              </div>

              <ul className="space-y-2.5 text-xs text-stone-300 pt-4 font-sans">
                <li className="flex items-center gap-2">
                  <Check className="w-4 h-4 text-amber-400 shrink-0" />
                  <span>3 сарын хэвлэмэл сэтгүүл</span>
                </li>
                <li className="flex items-center gap-2">
                  <Check className="w-4 h-4 text-amber-400 shrink-0" />
                  <span>Улаанбаатар хот дотор хүргэлттэй</span>
                </li>
                <li className="flex items-center gap-2">
                  <Check className="w-4 h-4 text-amber-400 shrink-0" />
                  <span>Heyzine цахим унших эрх</span>
                </li>
              </ul>
            </div>

            <Link
              to="/subscribe?plan=quarterly"
              className="mt-8 w-full block text-center py-3 rounded-xl border border-stone-700 hover:bg-stone-800 text-stone-200 font-semibold text-xs transition-colors"
            >
              Улирлын багц сонгох
            </Link>
          </div>

          {/* Tier 2: Half-Year (Featured) */}
          <div className="bg-gradient-to-b from-stone-900 via-stone-900 to-stone-950 rounded-2xl p-8 border-2 border-amber-500 shadow-2xl relative flex flex-col justify-between transform md:-translate-y-2">
            <div className="absolute -top-3.5 left-1/2 -translate-x-1/2 bg-amber-500 text-stone-950 text-xs font-bold py-1 px-3.5 rounded-full shadow">
              Элбэг сонголт
            </div>

            <div className="space-y-4">
              <span className="text-xs font-mono uppercase tracking-wider text-amber-400 block">
                Хагас жилийн багц
              </span>
              <h3 className="font-serif text-2xl font-bold text-white">6 Дугаар</h3>
              <p className="text-xs text-stone-400 leading-relaxed font-sans">
                Барилгын бүтээн байгуулалтын идэвхтэй үеийн бүх сарын судалгаа, үнэ ханшийг багтаасан.
              </p>

              <div className="pt-4 border-t border-stone-800">
                <div className="font-mono text-3xl font-extrabold text-amber-400 tabular-nums">76,000₮</div>
                <div className="text-[11px] text-stone-400 mt-1">12,660₮ / нэг дугаар · 15% хэмнэлт</div>
              </div>

              <ul className="space-y-2.5 text-xs text-stone-200 pt-4 font-sans">
                <li className="flex items-center gap-2">
                  <Check className="w-4 h-4 text-amber-400 shrink-0" />
                  <span>6 сарын хэвлэмэл сэтгүүл</span>
                </li>
                <li className="flex items-center gap-2">
                  <Check className="w-4 h-4 text-amber-400 shrink-0" />
                  <span>Бүх дугаарын цахим архив</span>
                </li>
                <li className="flex items-center gap-2">
                  <Check className="w-4 h-4 text-amber-400 shrink-0" />
                  <span>Оффис / гэрийн хаягаар хүргэнэ</span>
                </li>
                <li className="flex items-center gap-2">
                  <Check className="w-4 h-4 text-amber-400 shrink-0" />
                  <span>НӨАТ-ын цахим баримт</span>
                </li>
              </ul>
            </div>

            <Link
              to="/subscribe?plan=half-year"
              className="mt-8 w-full block text-center py-3.5 rounded-xl bg-amber-500 hover:bg-amber-400 text-stone-950 font-bold text-xs transition-all shadow-md"
            >
              Хагас жилээр захиалах
            </Link>
          </div>

          {/* Tier 3: Yearly */}
          <div className="bg-stone-900/80 rounded-2xl p-8 border border-stone-800 flex flex-col justify-between hover:border-stone-700 transition-all">
            <div className="space-y-4">
              <span className="text-xs font-mono uppercase tracking-wider text-stone-400 block">
                Бүтэн жилийн багц
              </span>
              <h3 className="font-serif text-2xl font-bold text-white">12 Дугаар</h3>
              <p className="text-xs text-stone-400 leading-relaxed font-sans">
                Компани, төслийн оффис, архитектор, инженерүүдийн бүтэн жилийн мэргэжлийн ширээний ном.
              </p>

              <div className="pt-4 border-t border-stone-800">
                <div className="font-mono text-3xl font-extrabold text-white tabular-nums">149,000₮</div>
                <div className="text-[11px] text-stone-400 mt-1">12,410₮ / нэг дугаар · 25% хэмнэлт</div>
              </div>

              <ul className="space-y-2.5 text-xs text-stone-300 pt-4 font-sans">
                <li className="flex items-center gap-2">
                  <Check className="w-4 h-4 text-amber-400 shrink-0" />
                  <span>12 сарын бүх шинэ дугаар</span>
                </li>
                <li className="flex items-center gap-2">
                  <Check className="w-4 h-4 text-amber-400 shrink-0" />
                  <span>Барилгын үнэ ханшийн жилийн тойм</span>
                </li>
                <li className="flex items-center gap-2">
                  <Check className="w-4 h-4 text-amber-400 shrink-0" />
                  <span>Цахим номын сан бүтэн эрх</span>
                </li>
                <li className="flex items-center gap-2">
                  <Check className="w-4 h-4 text-amber-400 shrink-0" />
                  <span>Шуурхай шуудангийн хүргэлт</span>
                </li>
              </ul>
            </div>

            <Link
              to="/subscribe?plan=yearly"
              className="mt-8 w-full block text-center py-3 rounded-xl border border-stone-700 hover:bg-stone-800 text-stone-200 font-semibold text-xs transition-colors"
            >
              Жилийн захиалга хийх
            </Link>
          </div>
        </div>
      </section>

      {/* 5. About the magazine */}
      <section id="about" className="scroll-mt-24 grid grid-cols-1 lg:grid-cols-12 gap-8 lg:gap-12">
        <div className="lg:col-span-7 space-y-5">
          <span className="text-xs text-amber-600 font-bold block">Бидний тухай</span>
          <h2 className="font-serif text-2xl sm:text-3xl font-bold tracking-tight text-stone-900 text-balance">
            2010 оноос хойш барилгын салбарын тэргүүлэх хэвлэл
          </h2>
          <div className="space-y-4 text-base text-stone-600 leading-relaxed max-w-prose">
            <p>
              «Барилга МН» сэтгүүл 2010 оны 3 дугаар сараас олон нийтийн хүртээл болсон бөгөөд байнгын уншигчид,
              хамтран ажилладаг байгууллага, хэвлэлтийнхээ тоогоор салбартаа тэргүүлдэг.
            </p>
            <p>
              Салбарын төрийн бодлого, мөрдөгдөж буй хууль тогтоомж, норм нормативын мэдээлэл, бүтээн байгуулалтын
              цаг үеийн мэдээ, мэргэжилтнүүдийн нийтлэл, ярилцлагыг сар бүр хүргэдэг. Мөн салбарын аж ахуйн нэгжүүдийн
              шинэ бүтээгдэхүүн, техник технологи, бизнес саналыг олон нийтэд таниулж, төрийн болон төрийн бус
              байгууллага, сургалт судалгааны төвүүдтэй хамтран ажилладаг.
            </p>
          </div>
          <dl className="grid grid-cols-3 gap-4 pt-2">
            {[
              { value: '2010', label: 'оноос хойш' },
              { value: '2,500–3,000', label: 'хувь сар бүр' },
              { value: loaded ? `${magazines.length}+` : '190+', label: 'цахим хэвлэл' },
            ].map(stat => (
              <div key={stat.label} className="border-t-2 border-amber-500 pt-3">
                <dt className="sr-only">{stat.label}</dt>
                <dd className="text-lg sm:text-2xl font-bold text-stone-900 tabular-nums leading-tight">{stat.value}</dd>
                <dd className="text-xs sm:text-sm text-stone-500">{stat.label}</dd>
              </div>
            ))}
          </dl>
        </div>

        <div className="lg:col-span-5 bg-white rounded-2xl border border-stone-200 p-6 sm:p-8 shadow-sm">
          <h3 className="font-serif text-lg font-bold text-stone-900 mb-4">Бодлогын зөвлөл</h3>
          <ul className="divide-y divide-stone-100">
            {[
              { name: 'А.Энхтүвшин', role: 'БХБЯ-ны БТГ-ын мэргэжилтэн' },
              { name: 'Г.Мягмар', role: 'БХҮНТ-ийн УЗ-ийн дарга, гавьяат барилгачин, зөвлөх архитектор' },
              { name: 'О.Лхагвадорж', role: 'МБМҮХ-ны гүйцэтгэх захирал, зөвлөх инженер' },
              { name: 'Ж.Дэлгэрсайхан', role: 'СЭЗИС, Санхүүгийн тэнхимийн дэд профессор, эдийн засагч' },
              { name: 'Б.Мөнхбаяр', role: 'ШУТИС, Барилгын эрчим хүчний хэмнэлтийн төвийн захирал' },
              { name: 'Д.Сүнжидмаа', role: 'ШУТИС, БАС-ийн дэд профессор, зөвлөх инженер, доктор' },
              { name: 'Н.Цогтоо', role: 'Зөвлөх архитектор' },
              { name: 'Б.Батжав', role: '«Монголын ногоон барилгын хүрээлэн» ТББ-ын гүйцэтгэх захирал, архитектор' },
            ].map(member => (
              <li key={member.name} className="py-3 first:pt-0 last:pb-0">
                <p className="text-sm font-semibold text-stone-900">{member.name}</p>
                <p className="text-sm text-stone-500 leading-snug">{member.role}</p>
              </li>
            ))}
          </ul>
        </div>
      </section>

      {/* 6. Physical Distribution: Partner Bookstores Network */}
      <section id="points" className="space-y-8 scroll-mt-24">
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-end gap-4 pb-4 border-b border-stone-200">
          <div>
            <span className="text-xs text-amber-600 font-bold block mb-1">
              Борлуулалтын төлөөлөгчид
            </span>
            <h2 className="font-serif text-2xl sm:text-3xl font-bold tracking-tight text-stone-900">
              Худалдан авах боломжтой цэгүүд
            </h2>
          </div>
          <p className="text-xs text-stone-500 max-w-sm">
            Барилга.МН сэтгүүл болон ном товхимлууд Улаанбаатар хотын дараах томоохон сүлжээ дэлгүүрүүдэд худалдаалагдаж байна.
          </p>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {[
            { name: 'Интерном дэлгүүр', loc: 'УБ хот дахь бүх салбарууд', type: 'Албан ёсны сүлжээ' },
            { name: 'Азхур номын дэлгүүр', loc: 'Бүх салбар дэлгүүрүүд', type: 'Номын сүлжээ' },
            { name: 'Мишээл барилгын их дэлгүүр', loc: 'Хан-Уул дүүрэг, Мишээл экспо', type: 'Төв салбар' },
            { name: 'Мажестик номын дэлгүүр', loc: 'Их дэлгүүрийн 6 давхарт', type: 'Төв салбар' },
            { name: 'Барилга Мега Стор', loc: 'БГД, 3-р хороолол', type: 'Төлөөлөгч' },
            { name: 'Скай Их Дэлгүүр', loc: 'Сүхбаатар дүүрэг', type: 'Салбар' },
            { name: 'УИД номын тасаг', loc: 'Чингэлтэй дүүрэг, Энхтайваны өргөн чөлөө', type: 'Салбар' },
            { name: 'Барилга.МН төв оффис', loc: 'БЗД, 6-р хороо, 21-р сургуулийн баруун талд', type: 'Төв редакц' },
          ].map((point, index) => (
            <div
              key={index}
              className="bg-white p-5 rounded-xl border border-stone-200/90 shadow-sm hover:border-stone-400 transition-colors"
            >
              <div className="flex items-center justify-between text-[11px] text-stone-400 font-mono mb-2">
                <span>{point.type}</span>
                <MapPin className="w-3.5 h-3.5 text-amber-600" />
              </div>
              <h4 className="font-serif font-bold text-stone-900 text-sm mb-1">{point.name}</h4>
              <p className="text-xs text-stone-500 font-sans">{point.loc}</p>
            </div>
          ))}
        </div>
      </section>

      {/* 7. Editorial Colophon & Direct Inquiries */}
      <section className="bg-stone-100 rounded-2xl sm:rounded-3xl p-6 sm:p-12 border border-stone-200">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
          <div className="space-y-2">
            <span className="text-xs text-stone-400 block font-bold">
              Редакцийн мэдээлэл
            </span>
            <h3 className="font-serif text-xl font-bold text-stone-900">Нийтлэл & Зар сурталчилгаа</h3>
            <p className="text-xs text-stone-600 leading-relaxed font-sans">
              Сэтгүүлд нийтлэл өгөх, бүтээгдэхүүн сурталчлах болон албан байгууллагын бөөнөөр захиалах хүсэлтийг хүлээн авч байна.
            </p>
          </div>

          <div className="space-y-3">
            <span className="text-xs text-stone-400 block font-bold">
              Шууд холбогдох
            </span>
            <div className="flex items-center gap-3 text-sm text-stone-700">
              <Phone className="w-4 h-4 text-amber-600 shrink-0" />
              <span className="font-medium">
                <a href="tel:+97691000233" className="hover:text-stone-950">9100-0233</a>,{' '}
                <a href="tel:+97677113333" className="hover:text-stone-950">7711-3333</a>
              </span>
            </div>
            <div className="flex items-center gap-3 text-sm text-stone-700">
              <Mail className="w-4 h-4 text-amber-600 shrink-0" />
              <a href="mailto:magazine@barilga.mn" className="hover:text-stone-950">magazine@barilga.mn</a>
            </div>
            <div className="flex items-center gap-3 text-sm text-stone-700">
              <MapPin className="w-4 h-4 text-amber-600 shrink-0" />
              <a
                href="https://www.openstreetmap.org/?mlat=47.914181&mlon=106.930603#map=17/47.914181/106.930603"
                target="_blank"
                rel="noreferrer"
                className="hover:text-stone-950 underline-offset-2 hover:underline"
              >
                Баянзүрх дүүрэг, 6-р хороо, 21-р сургуулийн баруун талд
              </a>
            </div>
          </div>

          <div className="space-y-3 flex flex-col justify-between">
            <div>
              <span className="text-xs text-stone-400 block font-bold">
                Цахим төлбөр ба баримт
              </span>
              <p className="text-xs text-stone-600 leading-relaxed font-sans mt-1">
                QPay, Дансаар шилжүүлэх болон бүх төрлийн картаар төлөх боломжтой. Байгууллагын НӨАТ-ын цахим баримт олгоно.
              </p>
            </div>
            <Link
              to="/subscribe?plan=yearly"
              className="inline-flex items-center justify-center gap-2 py-2.5 px-4 rounded-lg bg-stone-900 text-white font-semibold text-xs hover:bg-stone-800 transition-colors"
            >
              <span>Жилийн эрх захиалах</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </Link>
          </div>
        </div>
      </section>
    </div>
  );
}
