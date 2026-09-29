import { useState, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import { doc, getDoc } from 'firebase/firestore';
import { db } from '../lib/firebase';
import { ChevronLeft, Loader2 } from 'lucide-react';
import { MOCK_MAGAZINES } from '../lib/data';
import { findHeyzineMagazine } from '../lib/heyzine';

export function Reader() {
  const { id } = useParams<{ id: string }>();
  const [magazine, setMagazine] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [frameLoaded, setFrameLoaded] = useState(false);

  useEffect(() => {
    const fetchMagazine = async () => {
      if (!id) return;
      
      try {
        // Эхлээд Mock data-аас шалгах
        const mockMag = MOCK_MAGAZINES.find(m => m.id === id);
        if (mockMag) {
          setMagazine(mockMag);
          setLoading(false);
          return;
        }

        // Heyzine аккаунтаас шалгах
        const heyzineMag = await findHeyzineMagazine(id);
        if (heyzineMag) {
          setMagazine(heyzineMag);
          return;
        }

        // Firestore-оос шалгах
        const docRef = doc(db, 'magazines', id);
        const snap = await getDoc(docRef);
        if (snap.exists()) {
          setMagazine({ id: snap.id, ...snap.data() });
        } else {
          setError('Сэтгүүл олдсонгүй.');
        }
      } catch (err) {
        console.error(err);
        setError('Сэтгүүл уншихад алдаа гарлаа.');
      } finally {
        setLoading(false);
      }
    };

    fetchMagazine();
  }, [id]);

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh]">
        <Loader2 className="h-8 w-8 text-[#F59E0B] animate-spin mb-4" />
        <p className="text-slate-500 font-medium">Сэтгүүлийг ачаалж байна...</p>
      </div>
    );
  }

  if (error || !magazine) {
    return (
      <div className="text-center py-20">
        <p className="text-red-500 font-bold mb-4">{error || 'Сэтгүүл олдсонгүй'}</p>
        <Link to="/" className="text-[#0F172A] hover:underline font-medium">
          Нүүр хуудас руу буцах
        </Link>
      </div>
    );
  }

  if (!magazine.heyzineLink) {
    return (
      <div className="text-center py-20">
        <p className="text-slate-500 font-bold mb-4">Энэ сэтгүүлийн цахим хувилбар байхгүй байна.</p>
        <Link to="/" className="text-[#0F172A] hover:underline font-medium">
          Нүүр хуудас руу буцах
        </Link>
      </div>
    );
  }

  return (
    <div className="fixed inset-0 z-[60] flex flex-col bg-slate-100">
      {/* Header for Reader */}
      <div className="bg-white border-b border-slate-200 px-2 sm:px-4 py-2 pt-[max(0.5rem,env(safe-area-inset-top))] flex items-center justify-between z-10 shrink-0">
        <div className="flex items-center">
          <button 
            onClick={() => (window.history.length > 1 ? window.history.back() : (window.location.href = '/'))}
            aria-label="Буцах"
            className="mr-2 p-2.5 text-slate-500 hover:text-[#0F172A] hover:bg-slate-100 rounded-full transition-colors"
          >
            <ChevronLeft className="h-5 w-5" />
          </button>
          <div>
            <h1 className="font-bold text-[#0F172A] text-sm sm:text-base leading-tight truncate max-w-[70vw] sm:max-w-md">
              {magazine.title}
            </h1>
            {magazine.issueNumber && magazine.issueNumber.trim() !== magazine.title?.trim() && (
              <p className="text-xs text-slate-500">{magazine.issueNumber}</p>
            )}
          </div>
        </div>
      </div>

      {/* Embedded Reader */}
      <div className="flex-1 relative w-full">
        {!frameLoaded && (
          <div className="absolute inset-0 z-10 bg-slate-100 flex flex-col items-center justify-center gap-3 text-slate-500">
            <Loader2 className="h-8 w-8 text-[#F59E0B] animate-spin" />
            <p className="text-sm font-medium">Сэтгүүлийг нээж байна...</p>
          </div>
        )}
        <iframe
          onLoad={() => setFrameLoaded(true)}
          src={magazine.heyzineLink} 
          className="absolute top-0 left-0 w-full h-full border-none"
          allowFullScreen
          allow="clipboard-write; clipboard-read;"
          title={magazine.title}
        ></iframe>
      </div>
    </div>
  );
}
