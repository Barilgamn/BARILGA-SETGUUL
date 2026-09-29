import { Link, Outlet, useLocation } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { User, Menu, X, ArrowUpRight, Compass } from 'lucide-react';
import { useState, useEffect } from 'react';

export function Layout() {
  const { user } = useAuth();
  const location = useLocation();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  useEffect(() => {
    setMobileMenuOpen(false);
  }, [location.pathname, location.hash]);

  const navLinks = [
    { label: 'Сэтгүүлүүд', path: '/#magazines' },
    { label: 'Багц захиалга', path: '/#subscriptions' },
    { label: 'Бидний тухай', path: '/#about' },
    { label: 'Борлуулалтын цэгүүд', path: '/#points' },
    { label: 'Захиалга шалгах', path: '/track' },
  ];

  return (
    <div className="min-h-screen bg-[#FBFBFB] flex flex-col font-sans text-stone-900 selection:bg-stone-900 selection:text-white">
      {/* Editorial Announcement Bar */}
      <div className="bg-[#0C121E] text-stone-300 text-xs py-2 px-4">
        <div className="max-w-7xl mx-auto flex items-center justify-between gap-4">
          <a href="/#magazines" className="flex items-center gap-2 min-w-0 hover:text-white transition-colors">
            <span className="w-1.5 h-1.5 rounded-full bg-amber-400 shrink-0"></span>
            <span className="font-medium text-stone-200 truncate">Шинэ дугаар гарлаа</span>
            <span className="text-stone-400 hidden md:inline truncate">— цахимаар шууд уншаарай</span>
          </a>
          <Link
            to="/subscribe?plan=yearly"
            className="text-amber-400 hover:text-amber-300 font-semibold inline-flex items-center gap-1 shrink-0 transition-colors"
          >
            <span className="sm:hidden">Жилийн захиалга −25%</span>
            <span className="hidden sm:inline">Жилийн захиалга 25% хэмнэлт</span>
            <ArrowUpRight className="w-3 h-3" />
          </Link>
        </div>
      </div>

      {/* Top Bar - Strict One-Row Three-Zone Contract */}
      <header className="bg-white/95 backdrop-blur-md border-b border-stone-200/80 sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16 lg:h-20">
            {/* Zone 1: Single text element Brand Wordmark in display face */}
            <Link to="/" className="flex items-baseline gap-2 group">
              <span className="font-serif text-xl sm:text-2xl font-bold tracking-tight text-stone-900 group-hover:text-stone-700 transition-colors">
                BARILGA<span className="text-amber-600">.</span>MN
              </span>
              <span className="text-[11px] font-semibold tracking-widest text-stone-400 uppercase font-sans hidden sm:inline">
                EDITORIAL
              </span>
            </Link>

            {/* Zone 2: 4-6 Clean text navigation links with subtle underline */}
            <nav className="hidden xl:flex items-center gap-8">
              {navLinks.map((link) => {
                const isActive = location.pathname === link.path;
                return (
                  <a
                    key={link.label}
                    href={link.path}
                    className={`text-sm font-medium transition-colors py-1 relative whitespace-nowrap ${
                      isActive
                        ? 'text-stone-950 font-semibold'
                        : 'text-stone-600 hover:text-stone-950'
                    }`}
                  >
                    {link.label}
                  </a>
                );
              })}
            </nav>

            {/* Zone 3: 1-2 Primary actions */}
            <div className="hidden xl:flex items-center gap-3">
              {user ? (
                <Link
                  to="/profile"
                  className="inline-flex items-center gap-2 px-4 py-2.5 rounded-lg border border-stone-300 text-stone-900 text-sm font-semibold hover:bg-stone-50 transition-colors whitespace-nowrap"
                >
                  <User className="h-4 w-4 text-stone-600" />
                  <span>Миний сан</span>
                </Link>
              ) : (
                <Link
                  to="/login"
                  className="inline-flex items-center gap-2 px-4 py-2.5 rounded-lg border border-stone-300 text-stone-900 text-sm font-semibold hover:bg-stone-50 transition-colors whitespace-nowrap"
                >
                  <span>Нэвтрэх</span>
                </Link>
              )}

              <Link
                to="/subscribe"
                className="inline-flex items-center px-5 py-2.5 rounded-lg bg-[#0C121E] text-white text-sm font-semibold hover:bg-stone-800 transition-colors shadow-sm whitespace-nowrap"
              >
                Захиалах
              </Link>
            </div>

            {/* Mobile Menu Toggle */}
            <div className="flex items-center xl:hidden gap-2">
              <Link
                to="/subscribe"
                className="px-4 py-2 rounded-lg bg-[#0C121E] text-white text-sm font-semibold"
              >
                Захиалах
              </Link>
              <button
                onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
                className="p-2.5 -mr-2 rounded-lg text-stone-700 hover:text-stone-900 hover:bg-stone-100"
                aria-label={mobileMenuOpen ? 'Цэс хаах' : 'Цэс нээх'}
                aria-expanded={mobileMenuOpen}
              >
                {mobileMenuOpen ? <X className="h-6 w-6" /> : <Menu className="h-6 w-6" />}
              </button>
            </div>
          </div>
        </div>

        {/* Mobile Navigation Drawer */}
        {mobileMenuOpen && (
          <div className="xl:hidden border-t border-stone-200 bg-white px-4 pt-2 pb-5 shadow-lg">
            <nav className="flex flex-col">
              {navLinks.map((link) => (
                <a
                  key={link.label}
                  href={link.path}
                  onClick={() => setMobileMenuOpen(false)}
                  className="py-3.5 text-base font-medium text-stone-800 hover:text-stone-950 border-b border-stone-100"
                >
                  {link.label}
                </a>
              ))}
            </nav>
            <Link
              to={user ? '/profile' : '/login'}
              className="mt-4 flex items-center justify-center gap-2 w-full py-3 rounded-lg border border-stone-300 text-stone-900 font-semibold text-sm"
            >
              <User className="h-4 w-4 text-stone-600" />
              {user ? 'Миний сан' : 'Нэвтрэх'}
            </Link>
          </div>
        )}
      </header>

      {/* Main Content Area */}
      <main className="flex-1 w-full max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6 sm:py-10">
        <Outlet />
      </main>

      {/* Museum/Editorial Publication Footer */}
      <footer className="bg-[#0C121E] text-stone-400 border-t border-stone-800 mt-16 sm:mt-24">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12 sm:py-16">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-x-6 gap-y-10 pb-12 border-b border-stone-800">
            {/* Column 1: Brand & Colophon */}
            <div className="space-y-4 col-span-2 md:col-span-1">
              <Link to="/" className="font-serif text-2xl font-bold tracking-tight text-white inline-block">
                BARILGA<span className="text-amber-500">.</span>MN
              </Link>
              <p className="text-xs text-stone-400 leading-relaxed font-sans">
                Монголын барилга, архитектур, хот төлөвлөлтийн салбарын цогц мэдээлэл, мэргэжлийн хэвлэл ба цахим номын сан.
              </p>
              <div className="text-[11px] text-stone-500 uppercase tracking-widest font-mono">
                EST. 2010 · ULAANBAATAR
              </div>
            </div>

            {/* Column 2: Sections */}
            <div className="space-y-3">
              <h4 className="text-xs font-bold text-stone-200">Хэвлэлүүд</h4>
              <ul className="space-y-2 text-xs">
                <li><a href="/#magazines" className="hover:text-stone-200 transition-colors">Барилга МН сэтгүүл</a></li>
                <li><a href="/#magazines" className="hover:text-stone-200 transition-colors">Норм дүрэм /БНбД/</a></li>
                <li><a href="/#magazines" className="hover:text-stone-200 transition-colors">Барилгын үнэ ханшийн судалгаа</a></li>
                <li><a href="/#magazines" className="hover:text-stone-200 transition-colors">Ном, гарын авлага, товхимол</a></li>
              </ul>
            </div>

            {/* Column 3: Subscription & Order */}
            <div className="space-y-3">
              <h4 className="text-xs font-bold text-stone-200">Захиалга & Үйлчилгээ</h4>
              <ul className="space-y-2 text-xs">
                <li><Link to="/subscribe?plan=quarterly" className="hover:text-stone-200 transition-colors">Улирлын багц захиалга</Link></li>
                <li><Link to="/subscribe?plan=half-year" className="hover:text-stone-200 transition-colors">Хагас жилийн багц</Link></li>
                <li><Link to="/subscribe?plan=yearly" className="hover:text-stone-200 transition-colors">Жилийн захиалга (Хямдралтай)</Link></li>
                <li><Link to="/track" className="hover:text-stone-200 transition-colors">Хүргэлтийн явц шалгах</Link></li>
              </ul>
            </div>

            {/* Column 4: Contact & Office */}
            <div className="space-y-3 col-span-2 md:col-span-1">
              <h4 className="text-xs font-bold text-stone-200">Холбоо барих</h4>
              <p className="text-xs leading-relaxed text-stone-400">
                Улаанбаатар хот, Баянзүрх дүүрэг, 6-р хороо, 21-р сургуулийн баруун талд
              </p>
              <p className="text-xs text-stone-300">
                Утас: <a href="tel:+97691000233" className="hover:text-white">9100-0233</a>, <a href="tel:+97677113333" className="hover:text-white">7711-3333</a>
              </p>
              <p className="text-xs text-stone-300">
                Имэйл: <a href="mailto:magazine@barilga.mn" className="hover:text-white">magazine@barilga.mn</a>
              </p>
            </div>
          </div>

          <div className="pt-8 flex flex-col sm:flex-row items-center justify-between text-xs text-stone-500 gap-4">
            <p>&copy; {new Date().getFullYear()} Барилга.МН. Бүх эрх хуулиар хамгаалагдсан.</p>
            <div className="flex items-center gap-6">
              <span className="hover:text-stone-300 cursor-pointer">Үйлчилгээний нөхцөл</span>
              <span className="hover:text-stone-300 cursor-pointer">Нууцлалын бодлого</span>
              <Link to="/admin" className="text-stone-600 hover:text-stone-400">Админ</Link>
            </div>
          </div>
        </div>
      </footer>
    </div>
  );
}
