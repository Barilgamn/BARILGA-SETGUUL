import re

with open("src/pages/Admin.tsx", "r") as f:
    content = f.read()

# Add `magazines` to the union type
content = content.replace("useState<'orders' | 'add_magazine' | 'manual_sub'>('orders')", "useState<'orders' | 'add_magazine' | 'manual_sub' | 'magazines'>('orders')")

# Add the navigation button for `magazines`
nav_magazines = """              <button
                onClick={() => setActiveTab('magazines')}
                className={`w-full flex items-center px-4 py-3 rounded-xl font-bold transition-all ${
                  activeTab === 'magazines' ? 'bg-[#0F172A] text-white shadow-sm' : 'text-slate-600 hover:bg-slate-50'
                }`}
              >
                <BookOpen className="h-5 w-5 mr-3" /> Сэтгүүлүүд
              </button>
              <button
                onClick={() => setActiveTab('add_magazine')}"""
content = content.replace("              <button\n                onClick={() => setActiveTab('add_magazine')}", nav_magazines)

# Add the content area
content_area = """          {activeTab === 'orders' && <AdminOrders />}
          {activeTab === 'magazines' && <AdminMagazines />}
          {activeTab === 'add_magazine' && <AdminAddMagazine />}
          {activeTab === 'manual_sub' && <AdminManualSubscription />}"""
content = content.replace("          {activeTab === 'orders' && <AdminOrders />}\n          {activeTab === 'add_magazine' && <AdminAddMagazine />}\n          {activeTab === 'manual_sub' && <AdminManualSubscription />}", content_area)

# Let's add imports if needed - lucide icons: Trash2, Edit
import_lucide = "import { BookOpen, Link as LinkIcon, Plus, FileText, Users, ShoppingBag, Search, Filter, Calendar, Edit, Trash2, X } from 'lucide-react';"
content = re.sub(r"import { BookOpen.*?from 'lucide-react';", import_lucide, content)

# Add AdminMagazines component
admin_magazines = """
// ==========================================
// 4. MAGAZINES LIST & EDIT
// ==========================================
import { deleteDoc } from 'firebase/firestore';

function AdminMagazines() {
  const [magazines, setMagazines] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [editingId, setEditingId] = useState<string | null>(null);
  
  // Edit Form State
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [issueNumber, setIssueNumber] = useState('');
  const [category, setCategory] = useState('magazine');
  const [coverImage, setCoverImage] = useState('');
  const [priceDigital, setPriceDigital] = useState(5000);
  const [pricePrint, setPricePrint] = useState(15000);
  const [heyzineLink, setHeyzineLink] = useState('');
  const [pdfUrl, setPdfUrl] = useState('');
  
  useEffect(() => {
    fetchMagazines();
  }, []);

  const fetchMagazines = async () => {
    setLoading(true);
    try {
      const q = query(collection(db, 'magazines'), orderBy('createdAt', 'desc'));
      const snapshot = await getDocs(q);
      const data = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
      setMagazines(data);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const handleEditClick = (mag: any) => {
    setEditingId(mag.id);
    setTitle(mag.title || '');
    setDescription(mag.description || '');
    setIssueNumber(mag.issueNumber || '');
    setCategory(mag.category || 'magazine');
    setCoverImage(mag.coverImage || '');
    setPriceDigital(mag.priceDigital || 0);
    setPricePrint(mag.pricePrint || 0);
    setHeyzineLink(mag.heyzineLink || '');
    setPdfUrl(mag.pdfUrl || '');
  };

  const handleCancelEdit = () => {
    setEditingId(null);
  };

  const handleUpdate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingId) return;
    
    try {
      await updateDoc(doc(db, 'magazines', editingId), {
        title, description, issueNumber, category, coverImage, 
        priceDigital, pricePrint, heyzineLink, pdfUrl
      });
      alert('Амжилттай шинэчиллээ');
      setEditingId(null);
      fetchMagazines();
    } catch (err) {
      console.error(err);
      alert('Алдаа гарлаа');
    }
  };

  const handleDelete = async (id: string) => {
    if (window.confirm('Үнэхээр устгах уу? Устгасан өгөгдлийг сэргээх боломжгүй.')) {
      try {
        await deleteDoc(doc(db, 'magazines', id));
        fetchMagazines();
      } catch (err) {
        console.error(err);
        alert('Алдаа гарлаа');
      }
    }
  };

  if (loading) return <div className="p-10 text-center">Уншиж байна...</div>;

  return (
    <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-200">
      <h2 className="text-2xl font-extrabold text-[#0F172A] mb-6">Сэтгүүлүүд</h2>
      
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {magazines.map((mag) => (
          <div key={mag.id} className="border border-slate-200 rounded-xl overflow-hidden flex flex-col group hover:border-slate-300 transition-colors">
            {editingId === mag.id ? (
              <form onSubmit={handleUpdate} className="p-4 space-y-4 bg-slate-50">
                <div className="flex justify-between items-center mb-2">
                  <h3 className="font-bold">Засах</h3>
                  <button type="button" onClick={handleCancelEdit} className="text-slate-500 hover:text-slate-800"><X className="w-5 h-5"/></button>
                </div>
                
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="text-xs font-bold text-slate-700">Гарчиг</label>
                    <input type="text" value={title} onChange={e=>setTitle(e.target.value)} className="w-full px-2 py-1 text-sm border rounded" required />
                  </div>
                  <div>
                    <label className="text-xs font-bold text-slate-700">Дугаар</label>
                    <input type="text" value={issueNumber} onChange={e=>setIssueNumber(e.target.value)} className="w-full px-2 py-1 text-sm border rounded" required />
                  </div>
                </div>
                
                <div>
                  <label className="text-xs font-bold text-slate-700">Ангилал</label>
                  <select value={category} onChange={e=>setCategory(e.target.value)} className="w-full px-2 py-1 text-sm border rounded">
                    <option value="magazine">Барилга МН Сэтгүүл</option>
                    <option value="book">Ном, товхимол</option>
                    <option value="norm">Норм дүрэм /БНбД/</option>
                    <option value="standard">Стандарт</option>
                    <option value="research">Судалгаа</option>
                    <option value="blueprint">Зураг төсөл</option>
                  </select>
                </div>
                
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="text-xs font-bold text-slate-700">Heyzine Link</label>
                    <input type="url" value={heyzineLink} onChange={e=>setHeyzineLink(e.target.value)} className="w-full px-2 py-1 text-sm border rounded" />
                  </div>
                  <div>
                    <label className="text-xs font-bold text-slate-700">PDF URL</label>
                    <input type="url" value={pdfUrl} onChange={e=>setPdfUrl(e.target.value)} className="w-full px-2 py-1 text-sm border rounded" />
                  </div>
                </div>

                <div>
                  <label className="text-xs font-bold text-slate-700">Зураг (URL)</label>
                  <input type="url" value={coverImage} onChange={e=>setCoverImage(e.target.value)} className="w-full px-2 py-1 text-sm border rounded" required />
                </div>
                
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="text-xs font-bold text-slate-700">Цахим үнэ</label>
                    <input type="number" value={priceDigital} onChange={e=>setPriceDigital(Number(e.target.value))} className="w-full px-2 py-1 text-sm border rounded" />
                  </div>
                  <div>
                    <label className="text-xs font-bold text-slate-700">Хэвлэмэл үнэ</label>
                    <input type="number" value={pricePrint} onChange={e=>setPricePrint(Number(e.target.value))} className="w-full px-2 py-1 text-sm border rounded" />
                  </div>
                </div>
                
                <button type="submit" className="w-full bg-[#0F172A] text-white py-2 rounded font-bold text-sm">Хадгалах</button>
              </form>
            ) : (
              <>
                <div className="flex gap-4 p-4">
                  <img src={mag.coverImage} alt={mag.title} className="w-20 h-auto object-cover rounded border border-slate-100 shadow-sm" />
                  <div className="flex-1">
                    <h3 className="font-bold text-[#0F172A] leading-tight mb-1">{mag.title}</h3>
                    <p className="text-sm text-slate-500 mb-2">{mag.issueNumber}</p>
                    <span className="inline-block px-2 py-1 bg-slate-100 text-xs font-bold text-slate-600 rounded">
                      {mag.category === 'magazine' ? 'Сэтгүүл' : mag.category === 'book' ? 'Ном' : mag.category}
                    </span>
                  </div>
                </div>
                <div className="mt-auto border-t border-slate-100 bg-slate-50 flex">
                  <button onClick={() => handleEditClick(mag)} className="flex-1 py-3 text-sm font-bold text-slate-600 hover:text-[#0F172A] hover:bg-slate-100 flex items-center justify-center transition-colors">
                    <Edit className="w-4 h-4 mr-2" /> Засах
                  </button>
                  <div className="w-px bg-slate-200"></div>
                  <button onClick={() => handleDelete(mag.id)} className="flex-1 py-3 text-sm font-bold text-red-500 hover:text-red-700 hover:bg-red-50 flex items-center justify-center transition-colors">
                    <Trash2 className="w-4 h-4 mr-2" /> Устгах
                  </button>
                </div>
              </>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}
"""

content = content + "\n" + admin_magazines

with open("src/pages/Admin.tsx", "w") as f:
    f.write(content)
