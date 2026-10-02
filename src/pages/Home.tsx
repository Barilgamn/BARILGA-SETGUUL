import { Fragment, useState, useEffect, useRef, ReactNode } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { CATALOG_COVER } from './HouseCatalog';
import { CATEGORIES, displayTitle, issueNo, readHref, useLibrary } from '../lib/library';
import { Cover, LibraryCard } from '../components/LibraryCard';
import { SaveButton } from '../components/SaveButton';
import { PagePreview, previewPdfUrl } from '../components/PagePreview';
import { ArrowRight, ArrowUpRight, Search, Check } from 'lucide-react';
import { PLAN_PRICES, planSavings, SINGLE_ISSUE_PRICE } from '../lib/plans';

const PLANS = [
  {
    id: 'quarterly',
    name: 'Улирлын багц',
    ...PLAN_PRICES.quarterly,
    blurb: 'Улирлын барилгын төсөл, судалгааны мэдээллийг цаг алдалгүй авах хүсэлтэй мэргэжилтнүүдэд.',
    features: ['3 сарын хэвлэмэл сэтгүүл', 'Улаанбаатар хот дотор хүргэлттэй', 'Цахимаар унших эрх'],
    cta: 'Улирлын багц сонгох',
    featured: false,
  },
  {
    id: 'half-year',
    name: 'Хагас жилийн багц',
    ...PLAN_PRICES['half-year'],
    blurb: 'Барилгын бүтээн байгуулалтын идэвхтэй үеийн бүх сарын судалгаа, үнэ ханшийг багтаасан.',
    features: ['6 сарын хэвлэмэл сэтгүүл', 'Бүх дугаарын цахим архив', 'Оффис, гэрийн хаягаар хүргэнэ', 'НӨАТ-ын цахим баримт'],
    cta: 'Хагас жилээр захиалах',
    featured: false,
  },
  {
    id: 'yearly',
    name: 'Бүтэн жилийн багц',
    ...PLAN_PRICES.yearly,
    blurb: 'Компани, төслийн оффис, архитектор, инженерүүдийн бүтэн жилийн мэргэжлийн ширээний ном.',
    features: ['12 сарын бүх шинэ дугаар', 'Барилгын үнэ ханшийн жилийн тойм', 'Цахим номын сан бүтэн эрх', 'Шуурхай шуудангийн хүргэлт'],
    cta: 'Жилийн захиалга хийх',
    featured: true,
  },
] as const;

const YEARLY = planSavings('yearly');

const BOARD = [
  { name: 'А.Энхтүвшин', role: 'БХБЯ-ны БТГ-ын мэргэжилтэн' },
  { name: 'Г.Мягмар', role: 'БХҮНТ-ийн УЗ-ийн дарга, гавьяат барилгачин, зөвлөх архитектор' },
  { name: 'О.Лхагвадорж', role: 'МБМҮХ-ны гүйцэтгэх захирал, зөвлөх инженер' },
  { name: 'Ж.Дэлгэрсайхан', role: 'СЭЗИС, Санхүүгийн тэнхимийн дэд профессор, эдийн засагч' },
  { name: 'Б.Мөнхбаяр', role: 'ШУТИС, Барилгын эрчим хүчний хэмнэлтийн төвийн захирал' },
  { name: 'Д.Сүнжидмаа', role: 'ШУТИС, БАС-ийн дэд профессор, зөвлөх инженер, доктор' },
  { name: 'Н.Цогтоо', role: 'Зөвлөх архитектор' },
  { name: 'Б.Батжав', role: '«Монголын ногоон барилгын хүрээлэн» ТББ-ын гүйцэтгэх захирал, архитектор' },
];

const SALE_POINTS = [
  { name: 'Интерном дэлгүүр', loc: 'УБ хот дахь бүх салбарууд', type: 'Албан ёсны сүлжээ' },
  { name: 'Азхур номын дэлгүүр', loc: 'Бүх салбар дэлгүүрүүд', type: 'Номын сүлжээ' },
  { name: 'Мишээл барилгын их дэлгүүр', loc: 'Хан-Уул дүүрэг, Мишээл экспо', type: 'Төв салбар' },
  { name: 'Мажестик номын дэлгүүр', loc: 'Их дэлгүүрийн 6 давхарт', type: 'Төв салбар' },
  { name: 'Барилга Мега Стор', loc: 'БГД, 3-р хороолол', type: 'Төлөөлөгч' },
  { name: 'Скай Их Дэлгүүр', loc: 'Сүхбаатар дүүрэг', type: 'Салбар' },
  { name: 'УИД номын тасаг', loc: 'Чингэлтэй дүүрэг, Энхтайваны өргөн чөлөө', type: 'Салбар' },
  { name: 'Барилга.МН төв оффис', loc: 'БЗД, 6-р хороо, 21-р сургуулийн баруун талд', type: 'Төв редакц' },
];

// The home page's library shelf: newest titles, fewer on phones
const HOME_SHELF = 16;
const HOME_SHELF_PHONE = 8;

// Editorial section opener: a full-width ink rule, a small kicker and a serif title
function SectionHead({ kicker, title, action }: { kicker: string; title: string; action?: ReactNode }) {
  return (
    <header className="border-t border-stone-900 pt-4 sm:pt-5 mb-8 sm:mb-10 flex flex-col sm:flex-row sm:items-end justify-between gap-3">
      <div>
        <p className="text-sm font-semibold text-amber-700">{kicker}</p>
        <h2 className="font-serif text-3xl sm:text-4xl lg:text-[2.75rem] font-bold tracking-tight text-stone-950 leading-[1.1] mt-1 text-balance">
          {title}
        </h2>
      </div>
      {action}
    </header>
  );
}

export function Home() {
  const { magazines, loaded } = useLibrary();
  const navigate = useNavigate();
  const [librarySearch, setLibrarySearch] = useState('');
  const plansRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const row = plansRef.current;
    const featured = row?.querySelector<HTMLElement>('[data-featured]');
    if (row && featured && row.scrollWidth > row.clientWidth) {
      row.scrollLeft = featured.offsetLeft - (row.clientWidth - featured.clientWidth) / 2;
    }
  }, []);

  const [showAllBoard, setShowAllBoard] = useState(false);

  // The lead and «Өмнөх дугаарууд» follow issue numbers, not upload dates
  const issues = magazines
    .filter(mag => mag.category === 'magazine')
    .sort((a, b) => (issueNo(b) ?? 0) - (issueNo(a) ?? 0) || (b.publishedDate || 0) - (a.publishedDate || 0));
  const leadIssue = issues[0] || magazines[0];
  const recentIssues = issues.slice(1, 7);
  const leadDescription =
    leadIssue?.description && leadIssue.description.trim() !== leadIssue.title?.trim()
      ? leadIssue.description
      : 'Барилгын салбарын шинэ технологи, ногоон барилгын чиг хандлага, шинэчлэгдсэн БНбД норм ба материалын зах зээлийн үнэ ханшийн цогц судалгаа.';
  const leadYear = leadIssue?.publishedDate ? new Date(leadIssue.publishedDate).getFullYear() : new Date().getFullYear();
  const leadNumber = leadIssue && issueNo(leadIssue) ? `№${issueNo(leadIssue)}` : undefined;
  // The magazine has come out monthly since 2010, so its latest issue number
  // is how many issues have been published (titles read "…№191" or "…сэтгүүл 177")
  const issuesPublished = issues.reduce((max, mag) => Math.max(max, issueNo(mag) ?? 0), 0);

  const btnInk =
    'inline-flex items-center justify-center gap-2 px-7 py-3.5 bg-stone-950 hover:bg-stone-800 text-white text-sm font-semibold transition-colors';
  const btnLine =
    'inline-flex items-center justify-center gap-2 px-7 py-3.5 border border-stone-950 text-stone-950 hover:bg-stone-950 hover:text-white text-sm font-semibold transition-colors';

  return (
    <div className="space-y-20 sm:space-y-28">
      {/* ─────────────── Lead issue */}
      <section className="pt-2 sm:pt-6">
        {!leadIssue ? (
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-10 lg:gap-16 items-center animate-pulse">
            <div className="order-first lg:order-last lg:col-span-5 flex justify-center">
              <div className="w-56 sm:w-72 lg:w-full lg:max-w-md aspect-[3/4] bg-stone-200" />
            </div>
            <div className="lg:col-span-7 space-y-5">
              <div className="h-4 w-48 bg-stone-200" />
              <div className="h-14 w-4/5 bg-stone-200" />
              <div className="h-4 w-full bg-stone-100" />
              <div className="h-4 w-2/3 bg-stone-100" />
            </div>
          </div>
        ) : (
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-10 lg:gap-16 items-center">
            {/* Cover — first on phones so the issue is visible without scrolling */}
            <div className="order-first lg:order-last lg:col-span-5 flex justify-center lg:justify-end">
              {/* Cover doubles as a viewer for the first pages */}
              <Fragment key={leadIssue.id}>
                <PagePreview
                  coverImage={leadIssue.coverImage}
                  title={displayTitle(leadIssue)}
                  pdfUrl={previewPdfUrl(leadIssue)}
                  readHref={readHref(leadIssue)}
                  ctaLabel={leadIssue.locked ? `Худалдаж авах · ${leadIssue.price.toLocaleString()}₮` : undefined}
                  className="w-64 sm:w-72 lg:w-full lg:max-w-md"
                />
              </Fragment>
            </div>

            <div className="lg:col-span-7 text-center lg:text-left">
              <p className="inline-flex items-center gap-2.5 text-sm font-semibold text-stone-600">
                <span className="w-2 h-2 rounded-full bg-amber-500" />
                Шинэ дугаар{leadNumber ? ` · ${leadNumber}` : ''} · {leadYear} он
              </p>

              <h1 className="font-serif font-bold tracking-tight text-stone-950 leading-[1.02] text-balance mt-5 text-[2.6rem] sm:text-6xl xl:text-7xl">
                {displayTitle(leadIssue)}
              </h1>

              <p className="mt-6 text-lg sm:text-xl text-stone-600 leading-relaxed max-w-xl mx-auto lg:mx-0">
                {leadDescription}
              </p>

              <div className="mt-9 flex flex-col sm:flex-row gap-3 justify-center lg:justify-start">
                {(leadIssue.locked || leadIssue.heyzineLink) && (
                  <Link to={readHref(leadIssue)} className={btnInk}>
                    {leadIssue.locked ? `Худалдаж аваад унших · ${leadIssue.price.toLocaleString()}₮` : 'Цахимаар унших'}
                    <ArrowRight className="w-4 h-4" />
                  </Link>
                )}
                <Link to="/subscribe" className={btnLine}>
                  Хэвлэмэлээр захиалах
                </Link>
                <SaveButton issue={leadIssue} className="py-3.5" />
              </div>

              <dl className="mt-12 grid grid-cols-3 border-t border-stone-300 text-left">
                {[
                  { value: '2010', label: 'оноос хойш' },
                  { value: '2,500+', label: 'хувь сар бүр' },
                  { value: issuesPublished ? `${issuesPublished}` : '190+', label: 'дугаар гарсан' },
                ].map((s, i) => (
                  <div key={s.label} className={`pt-4 ${i > 0 ? 'pl-4 sm:pl-6 border-l border-stone-300' : ''}`}>
                    <dd className="font-serif text-2xl sm:text-3xl font-bold text-stone-950 tabular-nums">{s.value}</dd>
                    <dt className="text-sm text-stone-500 mt-0.5">{s.label}</dt>
                  </div>
                ))}
              </dl>
            </div>
          </div>
        )}
      </section>

      {/* ─────────────── Recent issues */}
      {recentIssues.length > 0 && (
        <section id="barilga-mn" className="scroll-mt-24">
          <SectionHead
            kicker="Барилга МН сэтгүүл"
            title="Өмнөх дугаарууд"
            action={
              <Link
                to="/tsahim-nomuud?category=magazine"
                className="inline-flex items-center gap-1.5 text-sm font-semibold text-stone-950 hover:text-amber-700 py-2"
              >
                Бүх дугаар <ArrowRight className="w-4 h-4" />
              </Link>
            }
          />
          <div className="flex lg:grid lg:grid-cols-6 gap-5 sm:gap-6 overflow-x-auto snap-x scroll-px-4 sm:scroll-px-0 hide-scrollbar -mx-4 px-4 sm:mx-0 sm:px-0 pb-2">
            {recentIssues.map(item => (
              <Link key={item.id} to={readHref(item)} className="group snap-start shrink-0 w-40 sm:w-44 lg:w-auto">
                <div className="relative">
                  <Cover src={item.coverImage} alt={item.title} className="shadow-[0_18px_36px_-18px_rgba(28,25,23,0.5)]" />
                  <SaveButton issue={item} variant="overlay" className="absolute top-2 right-2" />
                </div>
                <p className="mt-3 font-serif text-lg font-bold text-stone-950 leading-tight">
                  {issueNo(item) ? `№${issueNo(item)}` : item.title}
                </p>
                <p className="text-sm text-stone-500">
                  {new Date(item.publishedDate).getFullYear()}
                  {item.locked && <span className="text-stone-950 font-semibold"> · {item.price.toLocaleString()}₮</span>}
                </p>
              </Link>
            ))}
          </div>
        </section>
      )}

      {/* ─────────────── House catalog feature */}
      <section className="-mx-4 sm:-mx-6 lg:-mx-8 bg-[#EDE8DF]">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-14 sm:py-20 grid grid-cols-1 md:grid-cols-12 gap-10 items-center">
          <Link to="/amini-oron-suuts" className="group md:col-span-5 flex justify-center">
            <img
              src={CATALOG_COVER}
              alt="«Амины орон сууц» каталог — 8 дахь цуврал"
              loading="lazy"
              className="w-52 sm:w-64 aspect-[961/1368] object-cover shadow-[0_30px_60px_-25px_rgba(28,25,23,0.6)] transition-transform duration-500 group-hover:-translate-y-1"
            />
          </Link>
          <div className="md:col-span-7 text-center md:text-left">
            <p className="text-sm font-semibold text-amber-800">Шинэ · 8 дахь цуврал · нэг удаагийн хэвлэл</p>
            <h2 className="font-serif text-4xl sm:text-5xl font-bold tracking-tight text-stone-950 leading-[1.05] mt-2 text-balance">
              «Амины орон сууц» каталог
            </h2>
            <p className="mt-5 text-lg text-stone-700 leading-relaxed max-w-xl mx-auto md:mx-0">
              45–540м² хүртэлх ногоон загварууд, ногоон болон ипотекийн зээлд хамрагдах заавар, төсвийн аргачлал —
              мөрөөдлийн байшингаа барих бүх мэдээлэл нэг дор.
            </p>
            <div className="mt-8 flex flex-col sm:flex-row gap-3 justify-center md:justify-start">
              <Link to="/amini-oron-suuts" className={btnInk}>
                Дэлгэрэнгүй, худалдаж авах <ArrowRight className="w-4 h-4" />
              </Link>
            </div>
          </div>
        </div>
      </section>

      {/* ─────────────── Library: the newest titles, and the way into «Цахим номууд» */}
      <section id="magazines" className="scroll-mt-24">
        <SectionHead
          kicker="Цахим номууд"
          title="Сэтгүүл, ном, норм дүрмийн архив"
          action={
            <Link to="/tsahim-nomuud" className="inline-flex items-center gap-1.5 text-sm font-semibold text-stone-950 hover:text-amber-700 py-2">
              Бүгдийг үзэх{loaded ? ` (${magazines.length.toLocaleString()})` : ''} <ArrowRight className="w-4 h-4" />
            </Link>
          }
        />
        <form
          role="search"
          onSubmit={e => {
            e.preventDefault();
            const q = librarySearch.trim();
            navigate(q ? `/tsahim-nomuud?q=${encodeURIComponent(q)}` : '/tsahim-nomuud');
          }}
          className="relative max-w-2xl mb-6"
        >
          <label className="sr-only" htmlFor="home-library-search">Цахим номын сангаас хайх</label>
          <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-stone-500" />
          <input
            id="home-library-search"
            type="search"
            value={librarySearch}
            onChange={e => setLibrarySearch(e.target.value)}
            placeholder="Нэр, дугаар, түлхүүр үгээр хайх"
            className="w-full pl-12 pr-28 py-4 bg-white border border-stone-300 focus:border-stone-950 text-base text-stone-950 placeholder:text-stone-400 focus:outline-none"
          />
          <button type="submit" className="absolute right-2 top-1/2 -translate-y-1/2 px-4 py-2.5 bg-stone-950 hover:bg-stone-800 text-white text-sm font-semibold">
            Хайх
          </button>
        </form>

        {/* Categories open the library on that shelf */}
        <nav aria-label="Ангилал" className="flex overflow-x-auto hide-scrollbar gap-2 -mx-4 px-4 sm:mx-0 sm:px-0 mb-10">
          {CATEGORIES.filter(cat => cat.id !== 'all').map(cat => (
            <Link
              key={cat.id}
              to={`/tsahim-nomuud?category=${cat.id}`}
              className="shrink-0 whitespace-nowrap px-4 py-2 rounded-full border border-stone-300 bg-white text-sm font-semibold text-stone-700 hover:border-stone-950 hover:text-stone-950"
            >
              {cat.label}
              {loaded && (
                <span className="ml-1.5 font-normal text-stone-400 tabular-nums">
                  {magazines.filter(m => m.category === cat.id).length.toLocaleString()}
                </span>
              )}
            </Link>
          ))}
        </nav>

        {/* 16 newest on wide screens, 8 on phones */}
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-x-5 gap-y-12 sm:gap-x-8 sm:gap-y-14">
          {!loaded
            ? Array.from({ length: 8 }).map((_, i) => (
                <div key={i} className="animate-pulse space-y-3">
                  <div className="aspect-[3/4] bg-stone-200" />
                  <div className="h-4 w-3/4 bg-stone-200" />
                  <div className="h-3 w-1/2 bg-stone-100" />
                </div>
              ))
            : magazines.slice(0, HOME_SHELF).map((item, i) => (
                <div key={item.id} className={i >= HOME_SHELF_PHONE ? 'hidden md:contents' : 'contents'}>
                  <LibraryCard item={item} />
                </div>
              ))}
        </div>

        {loaded && magazines.length > HOME_SHELF_PHONE && (
          <div className="text-center mt-14">
            <Link to="/tsahim-nomuud" className={btnLine}>
              Цааш үзэх <span className="font-normal opacity-70">({magazines.length.toLocaleString()} хэвлэл)</span>
              <ArrowRight className="w-4 h-4" />
            </Link>
          </div>
        )}
      </section>

      {/* ─────────────── Subscriptions */}
      <section id="subscriptions" className="scroll-mt-24">
        <SectionHead kicker="Захиалга" title="Сэтгүүлээ гэртээ, оффистоо хүлээн ав" />

        {/* Yearly vs buying every month separately */}
        <div className="mb-8 sm:mb-10 grid grid-cols-1 md:grid-cols-[1fr_auto_1fr] items-center gap-4 md:gap-8 bg-[#EDE8DF] px-6 py-6 sm:px-10 sm:py-8">
          <div>
            <p className="text-sm text-stone-600">Сар бүр тусад нь авбал</p>
            <p className="font-serif text-2xl sm:text-3xl font-bold text-stone-500 line-through decoration-2 tabular-nums">
              {YEARLY.separately.toLocaleString()}₮
            </p>
            <p className="text-sm text-stone-600">{SINGLE_ISSUE_PRICE.toLocaleString()}₮ × 12 дугаар</p>
          </div>
          <ArrowRight className="hidden md:block w-6 h-6 text-stone-500" />
          <div>
            <p className="text-sm text-stone-600">Жилийн захиалгаар</p>
            <p className="font-serif text-2xl sm:text-3xl font-bold text-stone-950 tabular-nums">
              {PLAN_PRICES.yearly.price.toLocaleString()}₮
            </p>
            <p className="text-sm font-semibold text-emerald-800">
              {YEARLY.saved.toLocaleString()}₮ хэмнэнэ — {YEARLY.percent}% хямд
            </p>
          </div>
        </div>

        {/* Phones: a swipeable row with the next plan peeking in; desktop: three ruled columns */}
        <div
          ref={plansRef}
          className="flex md:grid md:grid-cols-3 gap-4 md:gap-0 overflow-x-auto md:overflow-visible snap-x snap-mandatory hide-scrollbar -mx-4 px-4 sm:mx-0 sm:px-0 pb-2 md:border md:border-stone-900"
        >
          {PLANS.map((plan, i) => (
            <div
              key={plan.id}
              data-featured={plan.featured || undefined}
              className={`relative snap-center shrink-0 w-[82%] sm:w-[60%] md:w-auto p-7 sm:p-9 flex flex-col justify-between border md:border-0 ${
                i > 0 ? 'md:border-l md:border-stone-900' : ''
              } ${plan.featured ? 'bg-stone-950 text-white border-stone-950' : 'bg-white border-stone-900'}`}
            >
              <div>
                <div className="flex items-center justify-between gap-3">
                  <p className={`text-sm font-semibold ${plan.featured ? 'text-amber-400' : 'text-amber-700'}`}>{plan.name}</p>
                  {plan.featured && <span className="shrink-0 whitespace-nowrap text-xs font-semibold text-stone-950 bg-amber-400 px-2 py-0.5">Хамгийн хямд</span>}
                </div>
                <h3 className="font-serif text-3xl font-bold mt-2">{plan.issues} дугаар</h3>
                <p className={`mt-3 text-sm leading-relaxed ${plan.featured ? 'text-stone-300' : 'text-stone-600'}`}>{plan.blurb}</p>
                <div className={`mt-6 pt-6 border-t ${plan.featured ? 'border-stone-700' : 'border-stone-200'}`}>
                  <p className={`text-sm line-through tabular-nums ${plan.featured ? 'text-stone-500' : 'text-stone-400'}`}>
                    {planSavings(plan.id).separately.toLocaleString()}₮
                  </p>
                  <p className="font-serif text-4xl font-bold tabular-nums">{plan.price.toLocaleString()}₮</p>
                  <p className={`text-sm mt-1 ${plan.featured ? 'text-stone-400' : 'text-stone-500'}`}>
                    {planSavings(plan.id).perIssue.toLocaleString()}₮ / нэг дугаар
                  </p>
                  <p
                    className={`mt-3 inline-block text-sm font-semibold px-2 py-1 ${
                      plan.featured ? 'bg-amber-400 text-stone-950' : 'bg-emerald-50 text-emerald-800'
                    }`}
                  >
                    {planSavings(plan.id).saved.toLocaleString()}₮ хэмнэлт · {planSavings(plan.id).percent}%
                  </p>
                </div>
                <ul className={`mt-6 space-y-2.5 text-sm ${plan.featured ? 'text-stone-200' : 'text-stone-700'}`}>
                  {plan.features.map(feature => (
                    <li key={feature} className="flex items-start gap-2.5">
                      <Check className={`w-4 h-4 shrink-0 mt-0.5 ${plan.featured ? 'text-amber-400' : 'text-amber-700'}`} />
                      {feature}
                    </li>
                  ))}
                </ul>
              </div>
              <Link
                to={`/subscribe?plan=${plan.id}`}
                className={`mt-9 w-full block text-center py-3.5 text-sm font-semibold transition-colors ${
                  plan.featured
                    ? 'bg-amber-400 hover:bg-amber-300 text-stone-950'
                    : 'border border-stone-950 text-stone-950 hover:bg-stone-950 hover:text-white'
                }`}
              >
                {plan.cta}
              </Link>
            </div>
          ))}
        </div>
        <p className="md:hidden text-center text-sm text-stone-500 mt-4">← Гүйлгэж бусад багцыг харна уу →</p>
      </section>

      {/* ─────────────── About */}
      <section id="about" className="scroll-mt-24">
        <SectionHead kicker="Бидний тухай" title="2010 оноос хойш барилгын салбарын тэргүүлэх хэвлэл" />
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-12 lg:gap-16">
          <div className="lg:col-span-7 space-y-5 text-lg text-stone-700 leading-relaxed">
            <p className="first-letter:font-serif first-letter:text-6xl first-letter:font-bold first-letter:float-left first-letter:leading-[0.85] first-letter:mr-2 first-letter:mt-1 first-letter:text-stone-950">
              Барилга МН сэтгүүл 2010 оны 3 дугаар сараас олон нийтийн хүртээл болсон бөгөөд байнгын уншигчид,
              хамтран ажилладаг байгууллага, хэвлэлтийнхээ тоогоор салбартаа тэргүүлдэг.
            </p>
            <p>
              Салбарын төрийн бодлого, мөрдөгдөж буй хууль тогтоомж, норм нормативын мэдээлэл, бүтээн байгуулалтын цаг
              үеийн мэдээ, мэргэжилтнүүдийн нийтлэл, ярилцлагыг сар бүр хүргэдэг. Мөн салбарын аж ахуйн нэгжүүдийн шинэ
              бүтээгдэхүүн, техник технологи, бизнес саналыг олон нийтэд таниулж, төрийн болон төрийн бус байгууллага,
              сургалт судалгааны төвүүдтэй хамтран ажилладаг.
            </p>
          </div>

          <div className="lg:col-span-5">
            <h3 className="text-sm font-semibold text-amber-700 pb-3 border-b border-stone-900">Бодлогын зөвлөл</h3>
            <ul className="divide-y divide-stone-200">
              {BOARD.map((member, i) => (
                <li key={member.name} className={`py-3.5 ${i >= 3 && !showAllBoard ? 'hidden lg:block' : ''}`}>
                  <p className="font-serif text-lg font-bold text-stone-950">{member.name}</p>
                  <p className="text-sm text-stone-500 leading-snug">{member.role}</p>
                </li>
              ))}
            </ul>
            {!showAllBoard && (
              <button
                onClick={() => setShowAllBoard(true)}
                className="lg:hidden mt-2 w-full py-3 border border-stone-950 text-sm font-semibold text-stone-950"
              >
                Бүх 8 гишүүнийг харах
              </button>
            )}
          </div>
        </div>
      </section>

      {/* ─────────────── Where to buy */}
      <section id="points" className="scroll-mt-24">
        <SectionHead kicker="Борлуулалтын цэгүүд" title="Хаанаас худалдаж авах вэ" />
        <ul className="grid grid-cols-2 lg:grid-cols-4 border-t border-l border-stone-200">
          {SALE_POINTS.map(point => (
            <li key={point.name} className="border-r border-b border-stone-200 p-4 sm:p-6">
              <p className="text-xs sm:text-sm text-stone-500">{point.type}</p>
              <p className="font-serif text-base sm:text-lg font-bold text-stone-950 leading-snug mt-1">{point.name}</p>
              <p className="text-sm text-stone-600 leading-snug mt-1">{point.loc}</p>
            </li>
          ))}
        </ul>
      </section>

      {/* ─────────────── Contact */}
      <section id="contact" className="scroll-mt-24">
        <SectionHead kicker="Холбоо барих" title="Нийтлэл, зар сурталчилгаа, байгууллагын захиалга" />
        <div className="grid grid-cols-1 md:grid-cols-3 gap-10 md:gap-8">
          <div>
            <p className="text-sm text-stone-500">Утас</p>
            <p className="font-serif text-2xl font-bold text-stone-950 mt-1">
              <a href="tel:+97691000233" className="inline-block py-1 hover:text-amber-700">9100-0233</a>
              <br />
              <a href="tel:+97677113333" className="inline-block py-1 hover:text-amber-700">7711-3333</a>
            </p>
          </div>
          <div>
            <p className="text-sm text-stone-500">Имэйл</p>
            <p className="font-serif text-2xl font-bold text-stone-950 mt-1 break-all">
              <a href="mailto:magazine@barilga.mn" className="inline-block py-1 hover:text-amber-700">magazine@barilga.mn</a>
            </p>
          </div>
          <div>
            <p className="text-sm text-stone-500">Редакц</p>
            <a
              href="https://www.openstreetmap.org/?mlat=47.914181&mlon=106.930603#map=17/47.914181/106.930603"
              target="_blank"
              rel="noreferrer"
              className="group inline-flex items-start gap-1.5 text-lg text-stone-950 leading-snug mt-1 hover:text-amber-700"
            >
              Баянзүрх дүүрэг, 6-р хороо, 21-р сургуулийн баруун талд
              <ArrowUpRight className="w-4 h-4 mt-1 shrink-0" />
            </a>
          </div>
        </div>
      </section>
    </div>
  );
}
