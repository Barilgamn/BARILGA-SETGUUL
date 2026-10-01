import { Link, Outlet, useLocation } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { User, Menu, X, Compass } from 'lucide-react';
import { useState, useEffect } from 'react';
import { ErrorBoundary } from './ErrorBoundary';
import { planSavings } from '../lib/plans';

export function Layout() {
  const { user } = useAuth();
  const location = useLocation();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  useEffect(() => {
    setMobileMenuOpen(false);
  }, [location.pathname, location.hash]);

  // A new page starts at its top (or at its #section), not at the old scroll
  useEffect(() => {
    if (!location.hash) {
      window.scrollTo(0, 0);
      return;
    }
    // The section may render only once its data arrives
    const timer = setTimeout(() => document.getElementById(location.hash.slice(1))?.scrollIntoView({ behavior: 'smooth' }), 300);
    return () => clearTimeout(timer);
  }, [location.pathname, location.hash]);

  // The logo also works on the home page itself: back to the top
  const goHome = () => {
    setMobileMenuOpen(false);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const navLinks = [
    { label: 'Цахим сэтгүүл', path: '/#magazines' },
    { label: 'Сэтгүүл захиалга', path: '/#subscriptions' },
    { label: 'Амины орон сууц каталоги', path: '/amini-oron-suuts' },
    { label: 'Холбоо барих', path: '/#contact' },
  ];

  const isLinkActive = (path: string) => {
    const [pathname, hash] = path.split('#');
    return location.pathname === pathname && (!hash || location.hash === `#${hash}`);
  };

  return (
    <div className="min-h-screen bg-[#FAF8F4] flex flex-col font-sans text-stone-900 selection:bg-stone-900 selection:text-white">
      {/* Top Bar - Strict One-Row Three-Zone Contract */}
      <header className="bg-[#FAF8F4]/95 backdrop-blur-md border-b border-stone-900 sticky top-0 z-50 print:hidden">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16 lg:h-20">
            {/* Zone 1: Brand — the Барилга.МН logo and what this site is */}
            <Link to="/" onClick={goHome} className="flex items-center gap-2.5 sm:gap-3 group" aria-label="Барилга.МН цахим номын сан — нүүр хуудас">
              <img src="/images/barilga-mn-logo.svg" alt="Барилга.МН" className="h-7 sm:h-8 lg:h-9 w-auto group-hover:opacity-80 transition-opacity" />
              <span className="border-l border-stone-300 pl-2.5 sm:pl-3 text-[11px] sm:text-xs font-semibold uppercase tracking-[0.14em] leading-tight text-stone-600">
                Цахим<br className="sm:hidden" /> номын сан
              </span>
            </Link>

            {/* Zone 2: 4-6 Clean text navigation links with subtle underline */}
            <nav className="hidden xl:flex items-center gap-8">
              {navLinks.map((link) => {
                const isActive = isLinkActive(link.path);
                return (
                  <a
                    key={link.label}
                    href={link.path}
                    className={`text-sm font-semibold transition-colors py-1.5 border-b-2 whitespace-nowrap ${
                      isActive
                        ? 'text-stone-950 border-stone-950'
                        : 'text-stone-600 border-transparent hover:text-stone-950 hover:border-stone-950'
                    }`}
                  >
                    {link.label}
                  </a>
                );
              })}
            </nav>

            {/* Zone 3: account */}
            <div className="hidden xl:flex items-center gap-3">
              {user ? (
                <Link
                  to="/profile"
                  aria-label="Миний хэвлэлүүд"
                  title="Миний хэвлэлүүд"
                  className="inline-flex items-center justify-center w-10 h-10 rounded-full text-stone-700 hover:text-amber-700 hover:bg-stone-100 transition-colors"
                >
                  <User className="h-5 w-5" />
                </Link>
              ) : (
                <Link
                  to="/login"
                  className="inline-flex items-center gap-2 px-4 py-2.5 text-stone-950 text-sm font-semibold hover:text-amber-700 transition-colors whitespace-nowrap"
                >
                  <span>Нэвтрэх</span>
                </Link>
              )}
            </div>

            {/* Mobile Menu Toggle */}
            <div className="flex items-center xl:hidden gap-2">
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
          <div className="xl:hidden border-t border-stone-200 bg-[#FAF8F4] px-4 pt-2 pb-5 shadow-lg">
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
              className="mt-4 flex items-center justify-center gap-2 w-full py-3 border border-stone-950 text-stone-950 font-semibold text-sm"
            >
              <User className="h-4 w-4 text-stone-600" />
              {user ? 'Миний хэвлэлүүд' : 'Нэвтрэх'}
            </Link>
          </div>
        )}
      </header>

      {/* Main Content Area */}
      <main className="flex-1 w-full max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6 sm:py-10">
        <ErrorBoundary resetKey={location.pathname}>
          <Outlet />
        </ErrorBoundary>
      </main>

      {/* Museum/Editorial Publication Footer */}
      <footer className="bg-stone-950 text-stone-400 border-t border-stone-800 mt-16 sm:mt-24 print:hidden">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12 sm:py-16">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-x-6 gap-y-10 pb-12 border-b border-stone-800">
            {/* Column 1: Brand & Colophon */}
            <div className="space-y-4 col-span-2 md:col-span-1">
              <Link to="/" onClick={goHome} className="inline-flex items-center gap-3" aria-label="Барилга.МН цахим номын сан">
                <img src="/images/barilga-mn-logo-light.svg" alt="Барилга.МН" className="h-8 w-auto" />
                <span className="border-l border-stone-700 pl-3 text-[11px] font-semibold uppercase tracking-[0.12em] whitespace-nowrap text-stone-400">Цахим номын сан</span>
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
                <li><a href="/?category=magazine#magazines" className="hover:text-stone-200 transition-colors">Барилга МН сэтгүүл</a></li>
                <li><Link to="/amini-oron-suuts" className="hover:text-stone-200 transition-colors">«Амины орон сууц» каталог</Link></li>
                <li><a href="/?category=norm#magazines" className="hover:text-stone-200 transition-colors">Норм дүрэм /БНбД/</a></li>
                <li><a href="/?category=research#magazines" className="hover:text-stone-200 transition-colors">Барилгын үнэ ханшийн судалгаа</a></li>
                <li><a href="/?category=book#magazines" className="hover:text-stone-200 transition-colors">Ном, гарын авлага, товхимол</a></li>
              </ul>
            </div>

            {/* Column 3: Subscription & Order */}
            <div className="space-y-3">
              <h4 className="text-xs font-bold text-stone-200">Захиалга & Үйлчилгээ</h4>
              <ul className="space-y-2 text-xs">
                <li><Link to="/subscribe?plan=quarterly" className="hover:text-stone-200 transition-colors">Улирлын багц захиалга</Link></li>
                <li><Link to="/subscribe?plan=half-year" className="hover:text-stone-200 transition-colors">Хагас жилийн багц</Link></li>
                <li><Link to="/subscribe?plan=yearly" className="hover:text-stone-200 transition-colors">Жилийн захиалга (−{planSavings('yearly').percent}%)</Link></li>
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
              <Link to="/admin" className="text-stone-600 hover:text-stone-400">Админ</Link>
            </div>
          </div>
        </div>
      </footer>
    </div>
  );
}
