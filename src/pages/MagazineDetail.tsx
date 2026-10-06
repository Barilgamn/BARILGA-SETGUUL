import { useParams, Link, useNavigate } from 'react-router-dom';
import { MOCK_MAGAZINES } from '../lib/data';
import { findHeyzineMagazine } from '../lib/heyzine';
import { Smartphone, BookOpen, ChevronLeft, Check, Sparkles, ShieldCheck, Truck } from 'lucide-react';
import { useState, useEffect } from 'react';
import { getMagazine } from '../lib/records';
import { SaveButton } from '../components/SaveButton';

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
          const heyzineMag = await findHeyzineMagazine(id);
          if (heyzineMag) {
            setMagazine(heyzineMag);
            return;
          }
          const found = await getMagazine(id);
          if (found) setMagazine(found);
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
    <div className="max-w-5xl mx-auto space-y-4 sm:space-y-8">
      {/* Back button */}
      <Link 
        to="/" 
        className="inline-flex items-center py-2 text-sm font-medium text-stone-500 hover:text-stone-900 transition-colors gap-1.5"
      >
        <ChevronLeft className="h-4 w-4" />
        <span>Бүх сэтгүүлүүд рүү буцах</span>
      </Link>
      
      <div className="bg-white rounded-2xl sm:rounded-3xl border border-stone-200/90 shadow-sm overflow-hidden">
        <div className="grid grid-cols-1 md:grid-cols-12">
          {/* Left Column: Monograph Cover Presentation */}
          <div className="md:col-span-5 bg-stone-100/90 p-6 sm:p-12 flex flex-col items-center justify-center border-b md:border-b-0 md:border-r border-stone-200">
            <div className="relative w-48 sm:w-full sm:max-w-xs shadow-2xl rounded-xl overflow-hidden group">
              <img 
                src={magazine.coverImage} 
                alt={magazine.title}
                referrerPolicy="no-referrer"
                className="w-full aspect-[3/4] object-cover"
              />
              {/* Realistic spine shading */}
              <div className="absolute inset-y-0 left-0 w-3 bg-gradient-to-r from-black/30 via-white/10 to-transparent pointer-events-none"></div>

            </div>

            <div className="mt-6 w-full sm:w-auto flex flex-col sm:flex-row gap-2">
              {(magazine.heyzineLink || magazine.locked) && (
                <Link
                  to={magazine.locked ? `/buy/${magazine.id}` : `/read/${magazine.id}`}
                  className="inline-flex items-center justify-center gap-2 text-sm font-bold text-stone-950 py-3 px-6 rounded-xl bg-amber-500 hover:bg-amber-400 transition-colors"
                >
                  <BookOpen className="w-4 h-4" />
                  <span>{magazine.locked ? `Худалдаж аваад унших · ${magazine.price.toLocaleString()}₮` : 'Цахимаар унших'}</span>
                </Link>
              )}
              <SaveButton issue={magazine} className="rounded-xl bg-white" />
            </div>
          </div>
          
          {/* Right Column: Editorial Details & Purchasing Options */}
          <div className="md:col-span-7 p-6 sm:p-12 flex flex-col justify-between space-y-8">
            <div className="space-y-4">
              {/* Metadata without pills */}
              <div className="flex flex-wrap items-center gap-x-2 gap-y-1 text-sm text-stone-500">
                {magazine.issueNumber && (
                  <>
                    <span>{magazine.issueNumber}</span>
                    <span aria-hidden="true">·</span>
                  </>
                )}
                <span>{magazine.publishedDate ? new Date(magazine.publishedDate).getFullYear() : new Date().getFullYear()} он</span>
                {magazine.pages && (
                  <>
                    <span aria-hidden="true">·</span>
                    <span>{magazine.pages} хуудас</span>
                  </>
                )}
              </div>

              <h1 className="font-serif text-2xl sm:text-3xl lg:text-4xl font-bold text-stone-900 tracking-tight leading-tight">
                {magazine.title}
              </h1>

              {magazine.description && magazine.description.trim() !== magazine.title?.trim() && (
                <p className="text-stone-600 text-base leading-relaxed pt-1 max-w-prose">
                  {magazine.description}
                </p>
              )}

              {/* Publication features */}
              <div className="pt-4 border-t border-stone-100 space-y-2 text-sm text-stone-600">
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
                  <span>Цахим хувилбар болон өндөр чанартай хэвлэл</span>
                </div>
              </div>
            </div>
            
            {magazine.source === 'heyzine' || magazine.locked ? (
              <div className="space-y-4 pt-6 border-t border-stone-200">
                {magazine.locked ? (
                  <>
                    <div>
                      <span className="text-sm text-stone-500 block">Цахим хувилбар</span>
                      <span className="text-3xl font-bold text-stone-900 tabular-nums">{magazine.price.toLocaleString()}₮</span>
                    </div>
                    <p className="text-sm text-stone-600">QPay, банкны апп, картаар төлмөгц шууд уншина. Байгууллага нэхэмжлэхээр дансаар төлж болно.</p>
                    <Link
                      to={`/buy/${magazine.id}`}
                      className="block w-full sm:w-auto sm:inline-block text-center px-8 py-3.5 rounded-xl bg-[#0C121E] hover:bg-stone-800 text-white font-bold text-sm transition-colors"
                    >
                      Худалдаж авах
                    </Link>
                    {magazine.source !== 'heyzine' && magazine.pricePrint > 0 && (
                      <Link
                        to={`/checkout/${magazine.id}?format=print`}
                        className="block text-sm font-semibold text-stone-700 underline underline-offset-4 hover:text-stone-950"
                      >
                        Хэвлэмэл хувилбар захиалах · {magazine.pricePrint.toLocaleString()}₮
                      </Link>
                    )}
                    {magazine.source !== 'heyzine' && magazine.pricePrint > 0 && (
                      <p className="text-xs text-stone-500">Хэвлэмэлээр захиалсан бол төлбөр баталгаажмагц цахимаар ч уншина.</p>
                    )}
                  </>
                ) : (
                  <p className="text-sm text-stone-600">Энэ хэвлэлийг цахимаар үнэгүй уншина.</p>
                )}
              </div>
            ) : (
            // Format Selection & Purchase
            <div className="space-y-6 pt-6 border-t border-stone-200">
              <div>
                <span className="text-sm font-semibold text-stone-900 block mb-3">
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
                      <span className={`text-xs ${selectedFormat === 'digital' ? 'text-stone-300' : 'text-stone-500'}`}>
                        Шууд нээх
                      </span>
                    </div>
                    <div className="font-bold text-sm">Цахим сэтгүүл</div>
                    <div className={`text-xs mt-0.5 ${selectedFormat === 'digital' ? 'text-stone-300' : 'text-stone-500'}`}>
                      Утас, компьютер дээр унших
                    </div>
                    <div className="font-bold text-lg mt-3 tabular-nums">
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
                      <span className={`text-xs ${selectedFormat === 'print' ? 'text-stone-300' : 'text-stone-500'}`}>
                        Хүргэлттэй
                      </span>
                    </div>
                    <div className="font-bold text-sm">Хэвлэмэл сэтгүүл</div>
                    <div className={`text-xs mt-0.5 ${selectedFormat === 'print' ? 'text-stone-300' : 'text-stone-500'}`}>
                      Хаягаар хүргүүлэх
                    </div>
                    <div className="font-bold text-lg mt-3 tabular-nums">
                      {(magazine.pricePrint || 15000).toLocaleString()}₮
                    </div>
                  </button>
                </div>
              </div>
              
              {/* Total & Action */}
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pt-4 border-t border-stone-100">
                <div>
                  <span className="text-sm text-stone-500 block">Төлөх дүн</span>
                  <span className="text-3xl font-bold text-stone-900 tabular-nums">
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
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
