import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { MOCK_MAGAZINES } from '../lib/data';
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

export function Home() {
  const [magazines, setMagazines] = useState<any[]>(MOCK_MAGAZINES);
  const [activeCategory, setActiveCategory] = useState<string>('all');
  const [searchQuery, setSearchQuery] = useState<string>('');
  
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
      try {
        const q = query(collection(db, 'magazines'), orderBy('createdAt', 'desc'));
        const snap = await getDocs(q);
        if (!snap.empty) {
          const dbMags = snap.docs.map(doc => ({ id: doc.id, ...doc.data() }));
          // Prioritize fresh database magazines, then seed data
          setMagazines([...dbMags, ...MOCK_MAGAZINES]);
        }
      } catch (err) {
        console.error('Failed to fetch magazines from Firestore:', err);
      }
    };
    fetchMagazines();
  }, []);

  const leadIssue = magazines[0] || MOCK_MAGAZINES[0];

  const filteredMagazines = magazines.filter(mag => {
    const matchesCategory = activeCategory === 'all' || mag.category === activeCategory;
    const matchesSearch = !searchQuery.trim() || 
      mag.title?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      mag.issueNumber?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      mag.description?.toLowerCase().includes(searchQuery.toLowerCase());
    return matchesCategory && matchesSearch;
  });

  return (
    <div className="space-y-24">
      {/* 1. Lead Exhibition Marquee: Current Lead Issue Feature */}
      <section className="relative bg-[#0C121E] text-white rounded-3xl overflow-hidden border border-stone-800 shadow-2xl">
        {/* Subtle architectural grid backdrop */}
        <div className="absolute inset-0 bg-[radial-gradient(#1E293B_1px,transparent_1px)] [background-size:24px_24px] opacity-25"></div>
        <div className="absolute top-0 right-0 w-96 h-96 bg-amber-600/10 rounded-full blur-3xl pointer-events-none"></div>

        <div className="relative z-10 p-8 sm:p-12 lg:p-16 grid grid-cols-1 lg:grid-cols-12 gap-12 items-center">
          {/* Left Column: Lead Issue Editorial Info */}
          <div className="lg:col-span-7 space-y-6">
            <div className="flex items-center gap-3 text-xs tracking-widest uppercase font-mono text-amber-400">
              <span className="w-2 h-2 rounded-full bg-amber-400 animate-pulse"></span>
              <span>ШИНЭ ХЭВЛЭЛТ · 2024 ОН</span>
              <span aria-hidden="true">·</span>
              <span>{leadIssue.issueNumber || '№ 156'}</span>
            </div>

            <h1 className="font-serif text-3xl sm:text-4xl lg:text-5xl font-bold tracking-tight text-white leading-[1.15] text-balance">
              {leadIssue.title}
            </h1>

            <p className="text-stone-300 text-base sm:text-lg leading-relaxed max-w-2xl font-sans">
              {leadIssue.description || 'Барилгын салбарын шинэ дэвшилтэт технологи, ногоон барилгын чиг хандлага, шинэчлэгдсэн БНбД норм ба материалын зах зээлийн үнэ ханшийн цогц судалгаа.'}
            </p>

            {/* Editorial highlights list */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 py-3 border-y border-stone-800/80 text-xs text-stone-300 font-sans">
              <div className="flex items-center gap-2">
                <Check className="w-4 h-4 text-amber-400 shrink-0" />
                <span>120+ нэр төрлийн материалын үнэ ханш</span>
              </div>
              <div className="flex items-center gap-2">
                <Check className="w-4 h-4 text-amber-400 shrink-0" />
                <span>Хот төлөвлөлт ба архитектурын онцлох төслүүд</span>
              </div>
              <div className="flex items-center gap-2">
                <Check className="w-4 h-4 text-amber-400 shrink-0" />
                <span>БНбД норм, дүрмийн шинэчлэлтийн тойм</span>
              </div>
              <div className="flex items-center gap-2">
                <Check className="w-4 h-4 text-amber-400 shrink-0" />
                <span>Heyzine интерактив цахим хувилбар</span>
              </div>
            </div>

            {/* Pricing & CTA Controls */}
            <div className="flex flex-col sm:flex-row items-start sm:items-center gap-4 pt-2">
              <Link
                to={`/magazine/${leadIssue.id}`}
                className="w-full sm:w-auto inline-flex items-center justify-center gap-2 px-7 py-3.5 rounded-xl bg-amber-500 hover:bg-amber-400 text-stone-950 font-bold text-sm transition-all shadow-lg shadow-amber-500/10"
              >
                <span>Энэ дугаарыг захиалах</span>
                <ArrowRight className="w-4 h-4" />
              </Link>

              {leadIssue.heyzineLink && (
                <Link
                  to={`/reader/${leadIssue.id}`}
                  className="w-full sm:w-auto inline-flex items-center justify-center gap-2 px-6 py-3.5 rounded-xl bg-white/10 hover:bg-white/15 text-stone-200 font-semibold text-sm transition-all backdrop-blur-sm border border-stone-700/60"
                >
                  <Smartphone className="w-4 h-4 text-amber-400" />
                  <span>Шууд цахимаар унших</span>
                </Link>
              )}

              <div className="text-xs text-stone-400 font-mono sm:ml-2">
                <div>Цахим: <span className="text-stone-200 font-bold tabular-nums">{(leadIssue.priceDigital || 8000).toLocaleString()}₮</span></div>
                <div>Хэвлэмэл: <span className="text-stone-200 font-bold tabular-nums">{(leadIssue.pricePrint || 15000).toLocaleString()}₮</span></div>
              </div>
            </div>
          </div>

          {/* Right Column: 3D Monograph Presentation */}
          <div className="lg:col-span-5 flex justify-center items-center">
            <Link 
              to={`/magazine/${leadIssue.id}`}
              className="group relative block max-w-xs sm:max-w-sm w-full perspective-1000"
            >
              {/* Monograph Spine & Hardcover Mockup */}
              <div className="relative rounded-2xl overflow-hidden shadow-2xl ring-1 ring-white/10 transition-transform duration-500 group-hover:scale-102 group-hover:-translate-y-1">
                <div className="aspect-[3/4] bg-stone-900 overflow-hidden relative">
                  <img
                    src={leadIssue.coverImage}
                    alt={leadIssue.title}
                    referrerPolicy="no-referrer"
                    className="w-full h-full object-cover"
                  />
                  {/* Spine highlight overlay */}
                  <div className="absolute inset-y-0 left-0 w-4 bg-gradient-to-r from-black/40 via-white/15 to-transparent pointer-events-none"></div>
                  {/* Subtle vignette scrim */}
                  <div className="absolute inset-0 bg-gradient-to-t from-stone-950/70 via-transparent to-black/20 pointer-events-none"></div>

                  <div className="absolute bottom-4 left-4 right-4 text-left">
                    <span className="text-[10px] uppercase font-mono tracking-widest text-amber-300 font-bold block mb-1">
                      ОНЦЛОХ ДУГААР
                    </span>
                    <h3 className="font-serif text-lg font-bold text-white line-clamp-1">
                      {leadIssue.title}
                    </h3>
                  </div>
                </div>
              </div>
            </Link>
          </div>
        </div>
      </section>

      {/* 2. Operational Utility Ribbon: Architectural Authority Metrics */}
      <section className="bg-white rounded-2xl border border-stone-200/80 p-6 shadow-sm">
        <div className="grid grid-cols-2 md:grid-cols-4 gap-6 divide-y md:divide-y-0 md:divide-x divide-stone-100">
          <div className="flex items-center gap-3.5 pt-4 md:pt-0">
            <div className="w-10 h-10 rounded-xl bg-stone-100 text-stone-900 flex items-center justify-center shrink-0">
              <Layers className="w-5 h-5 text-amber-600" />
            </div>
            <div>
              <p className="text-lg font-bold text-stone-900 tabular-nums">150+ Дугаар</p>
              <p className="text-xs text-stone-500">Бүрэн дижитал архив</p>
            </div>
          </div>

          <div className="flex items-center gap-3.5 pt-4 md:pt-0 md:pl-6">
            <div className="w-10 h-10 rounded-xl bg-stone-100 text-stone-900 flex items-center justify-center shrink-0">
              <FileCheck2 className="w-5 h-5 text-amber-600" />
            </div>
            <div>
              <p className="text-lg font-bold text-stone-900">БНбД & Стандарт</p>
              <p className="text-xs text-stone-500">Хүчин төгөлдөр дүрмүүд</p>
            </div>
          </div>

          <div className="flex items-center gap-3.5 pt-4 md:pt-0 md:pl-6">
            <div className="w-10 h-10 rounded-xl bg-stone-100 text-stone-900 flex items-center justify-center shrink-0">
              <TrendingUp className="w-5 h-5 text-amber-600" />
            </div>
            <div>
              <p className="text-lg font-bold text-stone-900">Сар тутмын судалгаа</p>
              <p className="text-xs text-stone-500">Барилгын үнэ ханшийн индекс</p>
            </div>
          </div>

          <div className="flex items-center gap-3.5 pt-4 md:pt-0 md:pl-6">
            <div className="w-10 h-10 rounded-xl bg-stone-100 text-stone-900 flex items-center justify-center shrink-0">
              <Building2 className="w-5 h-5 text-amber-600" />
            </div>
            <div>
              <p className="text-lg font-bold text-stone-900">Орон даяар</p>
              <p className="text-xs text-stone-500">Шуудан ба хүргэлтийн сүлжээ</p>
            </div>
          </div>
        </div>
      </section>

      {/* 3. Catalog & Digital Archive Filter */}
      <section id="magazines" className="space-y-8 scroll-mt-24">
        {/* Section Header with Clean Filter Controls */}
        <div className="space-y-6">
          <div className="flex flex-col md:flex-row md:items-end justify-between gap-4 pb-4 border-b border-stone-200">
            <div>
              <span className="text-xs uppercase tracking-widest font-mono text-amber-600 font-bold block mb-1">
                КАТАЛОГ & ЦАХИМ САН
              </span>
              <h2 className="font-serif text-3xl font-bold tracking-tight text-stone-900">
                Сэтгүүл, Ном, Норм дүрмийн сан
              </h2>
            </div>

            {/* Search Box */}
            <div className="relative w-full md:w-80">
              <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-stone-400" />
              <input
                type="text"
                placeholder="Гарчиг, дугаар, сэдвээр хайх..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-10 pr-4 py-2.5 bg-white border border-stone-300 rounded-xl text-xs font-medium text-stone-900 placeholder:text-stone-400 focus:outline-none focus:ring-2 focus:ring-stone-900 transition-all"
              />
            </div>
          </div>

          {/* Category Tabs: Segmented Control */}
          <div className="flex overflow-x-auto hide-scrollbar gap-2 p-1.5 bg-stone-100/80 rounded-xl">
            {categories.map((cat) => (
              <button
                key={cat.id}
                onClick={() => setActiveCategory(cat.id)}
                className={`px-4 py-2 text-xs font-semibold rounded-lg transition-all whitespace-nowrap shrink-0 ${
                  activeCategory === cat.id
                    ? 'bg-white text-stone-950 shadow-sm'
                    : 'text-stone-600 hover:text-stone-950 hover:bg-white/50'
                }`}
              >
                {cat.label}
              </button>
            ))}
          </div>
        </div>

        {/* Magazines Grid */}
        {filteredMagazines.length === 0 ? (
          <div className="text-center py-20 bg-white rounded-2xl border border-stone-200 p-8 space-y-3">
            <BookOpen className="w-10 h-10 text-stone-300 mx-auto" />
            <h3 className="font-serif text-lg font-bold text-stone-800">Хайлт олдсонгүй</h3>
            <p className="text-xs text-stone-500 max-w-sm mx-auto">
              Таны хайсан түлхүүр үгэнд тохирох хэвлэл одоогоор олдсонгүй. Өөр үгээр хайх эсвэл ангиллаа өөрчлөөд үзнэ үү.
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-8">
            {filteredMagazines.map((item) => (
              <article
                key={item.id}
                className="group bg-white rounded-2xl border border-stone-200/90 overflow-hidden shadow-sm hover:shadow-md transition-all duration-300 flex flex-col"
              >
                {/* Book Cover Container with Realistic 3D Monograph look */}
                <Link 
                  to={`/magazine/${item.id}`}
                  className="relative aspect-[3/4] bg-stone-100 overflow-hidden block"
                >
                  <img
                    src={item.coverImage}
                    alt={item.title}
                    referrerPolicy="no-referrer"
                    className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-103"
                  />
                  {/* Subtle Spine shadow on left */}
                  <div className="absolute inset-y-0 left-0 w-3 bg-gradient-to-r from-black/25 via-white/10 to-transparent pointer-events-none"></div>
                  
                  {/* Issue Number Tag */}
                  <div className="absolute top-4 left-4 bg-[#0C121E]/90 backdrop-blur-sm text-white text-[11px] font-mono font-bold px-2.5 py-1 rounded">
                    {item.issueNumber || '№ 156'}
                  </div>

                  {item.category && item.category !== 'magazine' && (
                    <div className="absolute top-4 right-4 bg-white/95 backdrop-blur-sm text-stone-800 text-[10px] font-bold px-2.5 py-1 rounded shadow-sm uppercase tracking-wider">
                      {categories.find(c => c.id === item.category)?.label || item.category}
                    </div>
                  )}
                </Link>

                {/* Content Section */}
                <div className="p-6 flex flex-col flex-1">
                  {/* Metadata line without pills */}
                  <div className="flex items-center gap-2 text-xs text-stone-500 font-sans mb-2">
                    <span>{item.issueNumber || 'Хэвлэл'}</span>
                    <span aria-hidden="true">·</span>
                    <span>{item.publishedDate ? new Date(item.publishedDate).toLocaleDateString('mn-MN', { year: 'numeric', month: 'short' }) : '2024'}</span>
                    <span aria-hidden="true">·</span>
                    <span>128 хуудас</span>
                  </div>

                  <h3 className="font-serif text-lg font-bold text-stone-900 group-hover:text-amber-700 transition-colors leading-snug mb-2">
                    <Link to={`/magazine/${item.id}`}>
                      {item.title}
                    </Link>
                  </h3>

                  <p className="text-xs text-stone-600 line-clamp-2 leading-relaxed mb-6 flex-1 font-sans">
                    {item.description}
                  </p>

                  {/* Pricing and Action Strip */}
                  <div className="pt-4 border-t border-stone-100 flex items-center justify-between">
                    <div>
                      <div className="text-[11px] text-stone-500">Цахим / Хэвлэмэл</div>
                      <div className="text-sm font-bold text-stone-900 tabular-nums font-mono">
                        {(item.priceDigital || 8000).toLocaleString()}₮ / {(item.pricePrint || 15000).toLocaleString()}₮
                      </div>
                    </div>

                    <div className="flex items-center gap-2">
                      {item.heyzineLink && (
                        <Link
                          to={`/reader/${item.id}`}
                          title="Цахимаар унших"
                          className="p-2.5 rounded-lg border border-stone-300 text-stone-700 hover:text-stone-950 hover:bg-stone-50 transition-colors"
                        >
                          <BookOpen className="w-4 h-4" />
                        </Link>
                      )}
                      <Link
                        to={`/magazine/${item.id}`}
                        className="px-3.5 py-2 rounded-lg bg-stone-900 hover:bg-stone-800 text-white text-xs font-semibold transition-colors"
                      >
                        Захиалах
                      </Link>
                    </div>
                  </div>
                </div>
              </article>
            ))}
          </div>
        )}
      </section>

      {/* 4. Architectural Monograph Subscription Tiers */}
      <section id="subscriptions" className="bg-[#0C121E] text-white rounded-3xl p-8 sm:p-14 border border-stone-800 shadow-xl scroll-mt-24">
        <div className="max-w-3xl mx-auto text-center space-y-4 mb-14">
          <span className="text-xs uppercase tracking-widest font-mono text-amber-400 font-bold block">
            БҮТЭЭН БАЙГУУЛАГЧДАД ЗОРИУЛСАН БАГЦУУД
          </span>
          <h2 className="font-serif text-3xl sm:text-4xl font-bold tracking-tight text-white">
            Барилга.МН сэтгүүлийн албан ёсны захиалга
          </h2>
          <p className="text-stone-400 text-sm leading-relaxed max-w-xl mx-auto font-sans">
            Сар бүрийн шинэ хэвлэлтийг хамгийн түрүүнд хүлээн авч, цахим архивт бүтэн жилийн турш хязгааргүй нэвтрэх боломж.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-8 items-stretch">
          {/* Tier 1: Quarterly */}
          <div className="bg-stone-900/80 rounded-2xl p-8 border border-stone-800 flex flex-col justify-between hover:border-stone-700 transition-all">
            <div className="space-y-4">
              <span className="text-xs font-mono uppercase tracking-wider text-stone-400 block">
                УЛИРЛЫН БАГЦ
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
            <div className="absolute -top-3.5 left-1/2 -translate-x-1/2 bg-amber-500 text-stone-950 text-[10px] uppercase font-bold tracking-widest py-1 px-3.5 rounded-full shadow">
              ЭЛБЭГ СОНГОЛТ
            </div>

            <div className="space-y-4">
              <span className="text-xs font-mono uppercase tracking-wider text-amber-400 block">
                ХАГАС ЖИЛИЙН БАГЦ
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
                БҮТЭН ЖИЛИЙН БАГЦ
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

      {/* 5. Physical Distribution: Partner Bookstores Network */}
      <section id="points" className="space-y-8 scroll-mt-24">
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-end gap-4 pb-4 border-b border-stone-200">
          <div>
            <span className="text-xs uppercase tracking-widest font-mono text-amber-600 font-bold block mb-1">
              БОРЛУУЛАЛТЫН ТӨЛӨӨЛӨГЧИД
            </span>
            <h2 className="font-serif text-3xl font-bold tracking-tight text-stone-900">
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
            { name: 'Барилга.МН төв оффис', loc: 'ХУД, 3-р хороо, Төв байр', type: 'Төв редакц' },
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

      {/* 6. Editorial Colophon & Direct Inquiries */}
      <section className="bg-stone-100 rounded-3xl p-8 sm:p-12 border border-stone-200">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
          <div className="space-y-2">
            <span className="text-[11px] font-mono uppercase tracking-widest text-stone-400 block font-bold">
              РЕДАКЦИЙН МЭДЭЭЛЭЛ
            </span>
            <h3 className="font-serif text-xl font-bold text-stone-900">Нийтлэл & Зар сурталчилгаа</h3>
            <p className="text-xs text-stone-600 leading-relaxed font-sans">
              Сэтгүүлд нийтлэл өгөх, бүтээгдэхүүн сурталчлах болон албан байгууллагын бөөнөөр захиалах хүсэлтийг хүлээн авч байна.
            </p>
          </div>

          <div className="space-y-3">
            <span className="text-[11px] font-mono uppercase tracking-widest text-stone-400 block font-bold">
              ШУУД ХОЛБОГДОХ
            </span>
            <div className="flex items-center gap-3 text-xs text-stone-700">
              <Phone className="w-4 h-4 text-amber-600 shrink-0" />
              <span className="font-mono font-medium">9100-0233, 7711-3333</span>
            </div>
            <div className="flex items-center gap-3 text-xs text-stone-700">
              <Mail className="w-4 h-4 text-amber-600 shrink-0" />
              <span className="font-mono">magazine@barilga.mn</span>
            </div>
            <div className="flex items-center gap-3 text-xs text-stone-700">
              <MapPin className="w-4 h-4 text-amber-600 shrink-0" />
              <span>Хан-Уул дүүрэг, 3-р хороо, Барилга.МН төв байр</span>
            </div>
          </div>

          <div className="space-y-3 flex flex-col justify-between">
            <div>
              <span className="text-[11px] font-mono uppercase tracking-widest text-stone-400 block font-bold">
                ЦАХИМ ТӨЛБӨР БА БАРИМТ
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
