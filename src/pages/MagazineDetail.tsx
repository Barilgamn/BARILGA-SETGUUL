import { useParams, Link, useNavigate } from 'react-router-dom';
import { MOCK_MAGAZINES } from '../lib/data';
import { Smartphone, BookOpen, ChevronLeft, Check, Sparkles, ShieldCheck, Truck } from 'lucide-react';
import { useState, useEffect } from 'react';
import { db } from '../lib/firebase';
import { doc, getDoc } from 'firebase/firestore';

export function MagazineDetail() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  
  const [magazine, setMagazine] = useState<any>(MOCK_MAGAZINES.find(m => m.id === id) || null);
  const [loading, setLoading] = useState(!magazine);
  const [selectedFormat, setSelectedFormat] = useState<'digital' | 'print' | 'both'>('digital');

  useEffect(() => {
    if (!magazine && id) {
      const fetchMag = async () => {
        try {
          const docRef = doc(db, 'magazines', id);
          const snap = await getDoc(docRef);
          if (snap.exists()) {
            setMagazine({ id: snap.id, ...snap.data() });
          }
        } catch (e) {
          console.error('Failed to fetch magazine:', e);
        } finally {
          setLoading(false);
        }
      };
      fetchMag();
    }
  }, [id, magazine]);

  if (loading) {
    return (
      <div className="text-center py-28 text-stone-500 font-sans space-y-2">
        <div className="w-8 h-8 border-2 border-stone-900 border-t-transparent rounded-full animate-spin mx-auto"></div>
        <p className="text-xs">Сэтгүүлийг ачаалж байна...</p>
      </div>
    );
  }

  if (!magazine) {
    return (
      <div className="text-center py-28 space-y-4">
        <p className="font-serif text-xl font-bold text-stone-900">Сэтгүүл олдсонгүй</p>
        <Link to="/" className="text-xs font-semibold text-amber-700 underline">
          Нүүр хуудас руу буцах
        </Link>
      </div>
    );
  }

  const handleCheckout = () => {
    navigate(`/checkout/${id}?format=${selectedFormat}`);
  };

  const getPrice = () => {
    if (selectedFormat === 'digital') return magazine.priceDigital || 8000;
    if (selectedFormat === 'print') return magazine.pricePrint || 15000;
    return (magazine.priceDigital || 8000) + (magazine.pricePrint || 15000);
  };

  return (
    <div className="max-w-5xl mx-auto space-y-8">
      {/* Back button */}
      <Link 
        to="/" 
        className="inline-flex items-center text-xs font-semibold text-stone-500 hover:text-stone-900 transition-colors gap-1.5"
      >
        <ChevronLeft className="h-4 w-4" />
        <span>Бүх сэтгүүлүүд рүү буцах</span>
      </Link>
      
      <div className="bg-white rounded-3xl border border-stone-200/90 shadow-sm overflow-hidden">
        <div className="grid grid-cols-1 md:grid-cols-12">
          {/* Left Column: Monograph Cover Presentation */}
          <div className="md:col-span-5 bg-stone-100/90 p-8 sm:p-12 flex flex-col items-center justify-center border-b md:border-b-0 md:border-r border-stone-200">
            <div className="relative max-w-xs w-full shadow-2xl rounded-2xl overflow-hidden group">
              <img 
                src={magazine.coverImage} 
                alt={magazine.title}
                referrerPolicy="no-referrer"
                className="w-full aspect-[3/4] object-cover rounded-2xl"
              />
              {/* Realistic spine shading */}
              <div className="absolute inset-y-0 left-0 w-3 bg-gradient-to-r from-black/30 via-white/10 to-transparent pointer-events-none"></div>
              
              <div className="absolute top-4 left-4 bg-[#0C121E]/90 backdrop-blur-sm text-white text-[11px] font-mono font-bold px-2.5 py-1 rounded">
                {magazine.issueNumber || '№ 156'}
              </div>
            </div>

            {magazine.heyzineLink && (
              <Link
                to={`/reader/${magazine.id}`}
                className="mt-6 inline-flex items-center gap-2 text-xs font-semibold text-stone-700 hover:text-stone-950 py-2 px-4 rounded-xl border border-stone-300 bg-white/90 hover:bg-white shadow-sm transition-all"
              >
                <Smartphone className="w-4 h-4 text-amber-600" />
                <span>Цахим хувилбарыг шууд дэлгэх</span>
              </Link>
            )}
          </div>
          
          {/* Right Column: Editorial Details & Purchasing Options */}
          <div className="md:col-span-7 p-8 sm:p-12 flex flex-col justify-between space-y-8">
            <div className="space-y-4">
              {/* Metadata without pills */}
              <div className="flex items-center gap-2 text-xs font-mono text-stone-500 uppercase tracking-wider">
                <span>{magazine.issueNumber || 'Хэвлэл'}</span>
                <span aria-hidden="true">·</span>
                <span>2024 ОН</span>
                <span aria-hidden="true">·</span>
                <span>128 ХУУДАС</span>
              </div>

              <h1 className="font-serif text-2xl sm:text-3xl lg:text-4xl font-bold text-stone-900 tracking-tight leading-tight">
                {magazine.title}
              </h1>

              <p className="text-stone-600 text-sm leading-relaxed font-sans pt-1">
                {magazine.description}
              </p>

              {/* Publication features */}
              <div className="pt-4 border-t border-stone-100 space-y-2 text-xs text-stone-600 font-sans">
                <div className="flex items-center gap-2">
                  <Check className="w-4 h-4 text-amber-600 shrink-0" />
                  <span>Монгол улсын барилгын зах зээлийн нэгдсэн судалгаа</span>
                </div>
                <div className="flex items-center gap-2">
                  <Check className="w-4 h-4 text-amber-600 shrink-0" />
                  <span>БНбД ба шинээр батлагдсан норм дүрмийн хавсралт</span>
                </div>
                <div className="flex items-center gap-2">
                  <Check className="w-4 h-4 text-amber-600 shrink-0" />
                  <span>Heyzine интерактив хувилбар болон өндөр чанартай хэвлэл</span>
                </div>
              </div>
            </div>
            
            {/* Format Selection & Purchase */}
            <div className="space-y-6 pt-6 border-t border-stone-200">
              <div>
                <span className="text-xs font-bold uppercase tracking-wider text-stone-500 font-mono block mb-3">
                  Хувилбар сонгох
                </span>
                
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  {/* Digital */}
                  <button
                    type="button"
                    onClick={() => setSelectedFormat('digital')}
                    className={`p-4 rounded-xl border text-left transition-all ${
                      selectedFormat === 'digital'
                        ? 'border-stone-900 bg-stone-900 text-white shadow-sm'
                        : 'border-stone-200 hover:border-stone-300 bg-stone-50 text-stone-900'
                    }`}
                  >
                    <div className="flex items-center justify-between mb-2">
                      <Smartphone className={`w-5 h-5 ${selectedFormat === 'digital' ? 'text-amber-400' : 'text-stone-500'}`} />
                      <span className={`text-[11px] font-mono ${selectedFormat === 'digital' ? 'text-stone-300' : 'text-stone-500'}`}>
                        Шууд нээх
                      </span>
                    </div>
                    <div className="font-bold text-sm">Цахим сэтгүүл</div>
                    <div className={`text-xs mt-0.5 ${selectedFormat === 'digital' ? 'text-stone-300' : 'text-stone-500'}`}>
                      Утас, компьютер дээр унших
                    </div>
                    <div className="font-mono font-bold text-base mt-3 tabular-nums">
                      {(magazine.priceDigital || 8000).toLocaleString()}₮
                    </div>
                  </button>
                  
                  {/* Print */}
                  <button
                    type="button"
                    onClick={() => setSelectedFormat('print')}
                    className={`p-4 rounded-xl border text-left transition-all ${
                      selectedFormat === 'print'
                        ? 'border-stone-900 bg-stone-900 text-white shadow-sm'
                        : 'border-stone-200 hover:border-stone-300 bg-stone-50 text-stone-900'
                    }`}
                  >
                    <div className="flex items-center justify-between mb-2">
                      <BookOpen className={`w-5 h-5 ${selectedFormat === 'print' ? 'text-amber-400' : 'text-stone-500'}`} />
                      <span className={`text-[11px] font-mono ${selectedFormat === 'print' ? 'text-stone-300' : 'text-stone-500'}`}>
                        Хүргэлттэй
                      </span>
                    </div>
                    <div className="font-bold text-sm">Хэвлэмэл сэтгүүл</div>
                    <div className={`text-xs mt-0.5 ${selectedFormat === 'print' ? 'text-stone-300' : 'text-stone-500'}`}>
                      Хаягаар хүргүүлэх
                    </div>
                    <div className="font-mono font-bold text-base mt-3 tabular-nums">
                      {(magazine.pricePrint || 15000).toLocaleString()}₮
                    </div>
                  </button>
                </div>
              </div>
              
              {/* Total & Action */}
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pt-4 border-t border-stone-100">
                <div>
                  <span className="text-[11px] text-stone-500 font-sans block">Төлөх дүн:</span>
                  <span className="font-serif text-3xl font-extrabold text-stone-900 tabular-nums">
                    {getPrice().toLocaleString()}₮
                  </span>
                </div>
                
                <button 
                  onClick={handleCheckout}
                  className="px-8 py-3.5 rounded-xl bg-[#0C121E] hover:bg-stone-800 text-white font-bold text-sm transition-colors shadow-sm text-center"
                >
                  Захиалга үргэлжлүүлэх
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
