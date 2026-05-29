import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { Plus, Trash2, Search, ArrowLeft, School, MapPin, X, AlertCircle, Calendar } from "lucide-react"; 

export default function AdminDashboard() {
  const navigate = useNavigate();

  const [universities, setUniversities] = useState([
    { id: 1, name: "Gazi Üniversitesi", abbreviation: "GAZİ", city: "Ankara", founded: "1926", history: "Cumhuriyetin ilk üniversitelerinden.", status: "Aktif" },
    { id: 2, name: "Orta Doğu Teknik Üniversitesi", abbreviation: "ODTÜ", city: "Ankara", founded: "1956", history: "Teknik eğitim üssü.", status: "Aktif" },
    { id: 3, name: "İstanbul Teknik Üniversitesi", abbreviation: "İTÜ", city: "İstanbul", founded: "1773", history: "Köklü mühendislik eğitimi.", status: "Aktif" }
  ]);

  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
  const [uniToDelete, setUniToDelete] = useState(null);

  const [newUni, setNewUni] = useState({ name: "", abbreviation: "", city: "", founded: "", history: "" });

  // --- YENİ: TÜRKÇE KARAKTER UYUMLU OTOMATİK DÜZELTME FONKSİYONLARI ---
  
  // 1. Her kelimenin baş harfini büyük, gerisini küçük yapar (Örn: fIrat ÜNİversitesi -> Fırat Üniversitesi)
  const formatTitleCase = (text) => {
    if (!text) return "";
    return text.split(" ").map(word => {
      if (word.length === 0) return "";
      return word.charAt(0).toLocaleUpperCase("tr-TR") + word.slice(1).toLocaleLowerCase("tr-TR");
    }).join(" ");
  };

  // 2. Tamamını büyük harf yapar (Kısaltmalar için)
  const formatUpperCase = (text) => {
    if (!text) return "";
    return text.toLocaleUpperCase("tr-TR");
  };

  // ------------------------------------------------------------------

  const openDeleteModal = (uni) => {
    setUniToDelete(uni);
    setIsDeleteModalOpen(true);
  };

  const confirmDelete = () => {
    setUniversities(universities.filter(u => u.id !== uniToDelete.id));
    setIsDeleteModalOpen(false);
    setUniToDelete(null);
  };

  const handleAddSubmit = (e) => {
    e.preventDefault();
    const newId = universities.length ? Math.max(...universities.map(u => u.id)) + 1 : 1;
    setUniversities([...universities, { ...newUni, id: newId, status: "Aktif" }]);
    setIsAddModalOpen(false);
    setNewUni({ name: "", abbreviation: "", city: "", founded: "", history: "" }); 
  };

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col relative">
      
      <header className="bg-slate-900 px-6 py-4 shadow-md flex items-center justify-between text-white sticky top-0 z-40">
        <div className="flex items-center gap-4">
          <button onClick={() => navigate("/")} className="p-2 bg-slate-800 rounded-lg hover:bg-slate-700 transition">
            <ArrowLeft className="h-5 w-5 text-slate-300" />
          </button>
          <div>
            <h1 className="text-xl font-extrabold tracking-tight">KampusRadar Yönetim</h1>
            <p className="text-xs text-slate-400 font-medium">Sistem Yöneticisi Paneli</p>
          </div>
        </div>
        <div className="flex items-center gap-3">
          <span className="text-sm font-bold bg-white text-slate-900 px-3 py-1.5 rounded-lg shadow-sm">Admin</span>
        </div>
      </header>

      <main className="flex-1 max-w-6xl w-full mx-auto px-4 py-8">
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center mb-8 gap-4">
          <div>
            <h2 className="text-2xl font-bold text-gray-900">Sistemdeki Üniversiteler</h2>
            <p className="text-sm text-gray-500 mt-1">Platforma kayıtlı tüm üniversiteleri yönet.</p>
          </div>
          <button 
            onClick={() => setIsAddModalOpen(true)}
            className="flex items-center gap-2 bg-slate-900 text-white px-5 py-2.5 rounded-xl font-bold shadow-md hover:bg-slate-800 transition"
          >
            <Plus className="h-5 w-5" />
            Yeni Üniversite Ekle
          </button>
        </div>

        <div className="bg-white rounded-2xl shadow-sm border border-gray-200 overflow-hidden">
          <div className="p-4 border-b border-gray-100 bg-gray-50/50 flex items-center">
            <div className="relative w-full max-w-md">
              <Search className="absolute left-3 top-2.5 h-4 w-4 text-gray-400" />
              <input 
                type="text" 
                placeholder="Üniversite ara..." 
                className="w-full pl-10 pr-4 py-2 rounded-lg border border-gray-200 text-sm focus:outline-none focus:border-slate-400 focus:ring-1 focus:ring-slate-400"
              />
            </div>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm text-gray-600">
              <thead className="bg-gray-50 text-gray-900 font-bold border-b border-gray-200">
                <tr>
                  <th className="px-6 py-4">Üniversite Adı</th>
                  <th className="px-6 py-4">Kısaltma</th>
                  <th className="px-6 py-4">Şehir</th>
                  <th className="px-6 py-4">Kuruluş</th>
                  <th className="px-6 py-4">Durum</th>
                  <th className="px-6 py-4 text-right">İşlemler</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {universities.map((uni) => (
                  <tr key={uni.id} className="hover:bg-gray-50 transition-colors group">
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-3">
                        <div className="p-2 bg-slate-100 rounded-lg text-slate-900">
                          <School className="h-5 w-5" />
                        </div>
                        <span className="font-bold text-gray-900">{uni.name}</span>
                      </div>
                    </td>
                    <td className="px-6 py-4 font-semibold text-slate-700">{uni.abbreviation}</td>
                    <td className="px-6 py-4">
                      <span className="flex items-center gap-1.5">
                        <MapPin className="h-4 w-4 text-gray-400" /> {uni.city}
                      </span>
                    </td>
                    <td className="px-6 py-4">
                      <span className="flex items-center gap-1.5">
                        <Calendar className="h-4 w-4 text-gray-400" /> {uni.founded}
                      </span>
                    </td>
                    <td className="px-6 py-4">
                      <span className="bg-green-100 text-green-700 px-3 py-1 rounded-full text-xs font-bold">
                        {uni.status}
                      </span>
                    </td>
                    <td className="px-6 py-4 text-right">
                      <button 
                        onClick={() => openDeleteModal(uni)}
                        className="p-2 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                        title="Üniversiteyi Sil"
                      >
                        <Trash2 className="h-5 w-5" />
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </main>

      {/* ÜNİVERSİTE EKLEME MODALI */}
      {isAddModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-sm p-4">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-xl overflow-hidden flex flex-col">
            <div className="px-6 py-4 border-b border-gray-100 flex items-center justify-between bg-slate-50">
              <h3 className="text-lg font-bold text-slate-900">Yeni Üniversite Ekle</h3>
              <button onClick={() => setIsAddModalOpen(false)} className="text-gray-400 hover:text-gray-600">
                <X className="h-5 w-5" />
              </button>
            </div>
            
            <form onSubmit={handleAddSubmit} className="p-6 flex flex-col gap-4">
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-1">Üniversite Tam Adı</label>
                <input 
                  required type="text" placeholder="Örn: Hacettepe Üniversitesi"
                  value={newUni.name} 
                  /* DEĞİŞİKLİK: Anında Title Case formatına çeviriyoruz */
                  onChange={(e) => setNewUni({...newUni, name: formatTitleCase(e.target.value)})}
                  className="w-full px-4 py-2 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-slate-900"
                />
              </div>
              
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-1">Kısaltma</label>
                  <input 
                    required type="text" placeholder="Örn: HÜ"
                    value={newUni.abbreviation} 
                    /* DEĞİŞİKLİK: Anında tamamen BÜYÜK harfe çeviriyoruz */
                    onChange={(e) => setNewUni({...newUni, abbreviation: formatUpperCase(e.target.value)})}
                    className="w-full px-4 py-2 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-slate-900"
                  />
                </div>
                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-1">Şehir</label>
                  <input 
                    required type="text" placeholder="Örn: Ankara"
                    value={newUni.city} 
                    /* DEĞİŞİKLİK: Anında Title Case formatına çeviriyoruz */
                    onChange={(e) => setNewUni({...newUni, city: formatTitleCase(e.target.value)})}
                    className="w-full px-4 py-2 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-slate-900"
                  />
                </div>
                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-1">Kuruluş Yılı</label>
                  <input 
                    required type="text" placeholder="Örn: 1967"
                    value={newUni.founded} onChange={(e) => setNewUni({...newUni, founded: e.target.value})}
                    className="w-full px-4 py-2 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-slate-900"
                  />
                </div>
              </div>

              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-1">Tarihçe / Açıklama</label>
                <textarea 
                  required rows="3" placeholder="Üniversite hakkında kısa bilgi..."
                  value={newUni.history} onChange={(e) => setNewUni({...newUni, history: e.target.value})}
                  className="w-full px-4 py-2 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-slate-900 resize-none"
                ></textarea>
              </div>
              
              <div className="mt-4 flex justify-end gap-3">
                <button type="button" onClick={() => setIsAddModalOpen(false)} className="px-5 py-2.5 text-sm font-bold text-gray-600 hover:bg-gray-100 rounded-xl transition">
                  İptal
                </button>
                <button type="submit" className="px-5 py-2.5 text-sm font-bold bg-slate-900 text-white rounded-xl hover:bg-slate-800 transition">
                  Üniversiteyi Kaydet
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* SİLME ONAY MODALI */}
      {isDeleteModalOpen && uniToDelete && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-sm p-4">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-sm overflow-hidden p-6 text-center">
            <div className="mx-auto flex items-center justify-center h-12 w-12 rounded-full bg-red-100 mb-4">
              <AlertCircle className="h-6 w-6 text-red-600" />
            </div>
            <h3 className="text-lg font-bold text-gray-900 mb-2">Üniversiteyi Sil</h3>
            <p className="text-sm text-gray-500 mb-6">
              <strong className="text-gray-800">{uniToDelete.name}</strong> sistemden kalıcı olarak silinecek. Bu işlem geri alınamaz. Onaylıyor musunuz?
            </p>
            <div className="flex justify-center gap-3">
              <button onClick={() => setIsDeleteModalOpen(false)} className="flex-1 px-4 py-2.5 bg-gray-100 text-gray-700 font-bold rounded-xl hover:bg-gray-200 transition">
                İptal
              </button>
              <button onClick={confirmDelete} className="flex-1 px-4 py-2.5 bg-red-600 text-white font-bold rounded-xl hover:bg-red-700 transition shadow-md shadow-red-600/20">
                Evet, Sil
              </button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
}