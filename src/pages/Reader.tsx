import { useState, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import { doc, getDoc } from 'firebase/firestore';
import { db } from '../lib/firebase';
import { ChevronLeft, Loader2 } from 'lucide-react';
import { MOCK_MAGAZINES } from '../lib/data';

export function Reader() {
  const { id } = useParams<{ id: string }>();
  const [magazine, setMagazine] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

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
    <div className="flex flex-col h-[calc(100vh-80px)] -mt-8 -mx-4 sm:-mx-6 lg:-mx-8">
      {/* Header for Reader */}
      <div className="bg-white border-b border-slate-200 px-4 py-3 flex items-center justify-between z-10 shrink-0">
        <div className="flex items-center">
          <button 
            onClick={() => window.history.back()} 
            className="mr-4 p-2 text-slate-500 hover:text-[#0F172A] hover:bg-slate-100 rounded-full transition-colors"
          >
            <ChevronLeft className="h-5 w-5" />
          </button>
          <div>
            <h1 className="font-bold text-[#0F172A] text-sm sm:text-base leading-tight truncate max-w-[200px] sm:max-w-md">
              {magazine.title}
            </h1>
            <p className="text-xs text-slate-500">{magazine.issueNumber}</p>
          </div>
        </div>
      </div>

      {/* Embedded Reader */}
      <div className="flex-1 bg-slate-100 relative w-full h-full">
        <iframe 
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
