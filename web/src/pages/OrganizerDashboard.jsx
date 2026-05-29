import { useState } from "react";
import { useNavigate } from "react-router-dom";
// YENİ: UploadCloud (Yükleme) ve Sparkles (Yapay Zeka) ikonlarını ekledik
import { Plus, ArrowLeft, Calendar, MapPin, X, FileText, CheckCircle, Clock, XCircle, UploadCloud, Sparkles } from "lucide-react";

export default function OrganizerDashboard() {
  const navigate = useNavigate();

  const [currentRole, setCurrentRole] = useState("Öğrenci Topluluğu"); 
  const [organizerName, setOrganizerName] = useState("Yapay Zeka Öğrenci Topluluğu");

  const [myEvents, setMyEvents] = useState([
    { id: 101, title: "Veri Bilimi Maratonu", category: "Yarışma", date: "2026-06-15T10:00", location: "Teknokent", status: "Onaylandı" },
    { id: 102, title: "Python Sıfırdan İleri Seviye", category: "Kurs", date: "2026-06-18T14:00", location: "Laboratuvar 3", status: "Beklemede" }
  ]);

  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [newEvent, setNewEvent] = useState({ title: "", category: "", date: "", location: "", description: "", poster: null });

  const formatTitleCase = (text) => {
    if (!text) return "";
    return text.split(" ").map(word => {
      if (word.length === 0) return "";
      return word.charAt(0).toLocaleUpperCase("tr-TR") + word.slice(1).toLocaleLowerCase("tr-TR");
    }).join(" ");
  };

  const handleFormSubmit = (e) => {
    e.preventDefault();
    const newId = myEvents.length ? Math.max(...myEvents.map(e => e.id)) + 1 : 101;
    // Takvimden gelen veriyi ekranda düzgün göstermek için ufak bir düzenleme (İleride veritabanına ham haliyle gidecek)
    const formattedDate = newEvent.date.replace("T", " - ");
    setMyEvents([...myEvents, { ...newEvent, date: formattedDate, id: newId, status: "Beklemede" }]);
    setIsAddModalOpen(false);
    setNewEvent({ title: "", category: "", date: "", location: "", description: "", poster: null });
  };

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col relative">
      
      <header className="bg-slate-900 px-6 py-4 shadow-md flex items-center justify-between text-white sticky top-0 z-40">
        <div className="flex items-center gap-4">
          <button onClick={() => navigate("/")} className="p-2 bg-slate-800 rounded-lg hover:bg-slate-700 transition">
            <ArrowLeft className="h-5 w-5 text-slate-300" />
          </button>
          <div>
            <h1 className="text-xl font-extrabold tracking-tight">{organizerName}</h1>
            <p className="text-xs text-slate-400 font-medium">Gazi Üniversitesi Etkinlik Düzenleme Paneli</p>
          </div>
        </div>
        <span className="text-sm font-bold bg-white text-slate-900 px-3 py-1.5 rounded-lg shadow-sm">
          {currentRole}
        </span>
      </header>

      <main className="flex-1 max-w-4xl w-full mx-auto px-4 py-8">
        
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center mb-8 gap-4">
          <div>
            <h2 className="text-2xl font-bold text-gray-900">Etkinlik Taleplerimiz</h2>
            <p className="text-sm text-gray-500 mt-1">SKS'ye gönderilen başvurular ve onay durumları.</p>
          </div>
          <button 
            onClick={() => setIsAddModalOpen(true)}
            className="flex items-center gap-2 bg-slate-900 text-white px-5 py-2.5 rounded-xl font-bold shadow-md hover:bg-slate-800 transition"
          >
            <Plus className="h-5 w-5" />
            Yeni Etkinlik Başvurusu
          </button>
        </div>

        <div className="mb-6 p-3 bg-slate-200 border border-slate-300 rounded-xl text-xs font-semibold text-slate-700 flex items-center gap-3">
          <span>⚙️ Rol Değiştirme Testi:</span>
          <button onClick={() => { setCurrentRole("Öğrenci Topluluğu"); setOrganizerName("Yapay Zeka Öğrenci Topluluğu"); }} className="bg-white px-2 py-1 rounded shadow-sm hover:bg-gray-100">Kulüp Yap</button>
          <button onClick={() => { setCurrentRole("Teknoloji Fakültesi Dekanlığı"); setOrganizerName("Teknoloji Fakültesi Dekanlığı"); }} className="bg-white px-2 py-1 rounded shadow-sm hover:bg-gray-100">Dekanlık Yap</button>
          <button onClick={() => { setCurrentRole("Rektörlük"); setOrganizerName("Gazi Rektörlüğü"); }} className="bg-white px-2 py-1 rounded shadow-sm hover:bg-gray-100">Rektörlük Yap</button>
        </div>

        <div className="space-y-4">
          {myEvents.map((ev) => (
            <div key={ev.id} className="bg-white p-5 rounded-2xl border border-gray-100 shadow-sm flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
              <div>
                <span className="text-[10px] bg-slate-100 border border-slate-200 text-slate-700 font-black tracking-widest uppercase px-2 py-0.5 rounded-md">{ev.category}</span>
                <h3 className="text-lg font-bold text-gray-900 mt-1.5">{ev.title}</h3>
                <div className="mt-2 flex items-center gap-4 text-xs font-medium text-gray-400">
                  <span className="flex items-center gap-1"><Calendar className="h-3.5 w-3.5" /> {ev.date}</span>
                  <span className="flex items-center gap-1"><MapPin className="h-3.5 w-3.5" /> {ev.location}</span>
                </div>
              </div>

              <div className="shrink-0">
                {ev.status === "Onaylandı" && (
                  <span className="flex items-center gap-1.5 bg-green-50 text-green-700 px-3 py-1.5 rounded-xl text-xs font-bold border border-green-100">
                    <CheckCircle className="h-4 w-4" /> Yayınlandı (SKS Onaylı)
                  </span>
                )}
                {ev.status === "Beklemede" && (
                  <span className="flex items-center gap-1.5 bg-amber-50 text-amber-700 px-3 py-1.5 rounded-xl text-xs font-bold border border-amber-100">
                    <Clock className="h-4 w-4" /> SKS Onayı Bekliyor
                  </span>
                )}
                {ev.status === "Reddedildi" && (
                  <span className="flex items-center gap-1.5 bg-red-50 text-red-700 px-3 py-1.5 rounded-xl text-xs font-bold border border-red-100">
                    <XCircle className="h-4 w-4" /> Reddedildi
                  </span>
                )}
              </div>
            </div>
          ))}
        </div>
      </main>

      {/* YENİ ETKİNLİK BAŞVURU FORMU POP-UP MODALI */}
      {isAddModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-sm p-4 overflow-y-auto">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-2xl overflow-hidden flex flex-col my-8">
            <div className="px-6 py-4 border-b border-gray-100 flex items-center justify-between bg-slate-50 sticky top-0 z-10">
              <h3 className="text-lg font-bold text-slate-900 flex items-center gap-2">
                <FileText className="h-5 w-5 text-slate-500" /> Yeni Etkinlik İzin Talebi
              </h3>
              <button onClick={() => setIsAddModalOpen(false)} className="text-gray-400 hover:text-gray-600"><X className="h-5 w-5" /></button>
            </div>
            
            <form onSubmit={handleFormSubmit} className="p-6 flex flex-col gap-5">
              
              {/* YENİ: Afiş Yükleme ve Yapay Zeka Alanı */}
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-2">Etkinlik Afişi</label>
                <div className="flex flex-col sm:flex-row gap-4">
                  {/* Dosya Yükleme Kutusu */}
                  <div className="flex-1 border-2 border-dashed border-slate-300 rounded-xl flex flex-col items-center justify-center p-6 text-center hover:bg-slate-50 transition cursor-pointer group">
                    <UploadCloud className="h-8 w-8 text-slate-400 mb-2 group-hover:text-slate-600 transition" />
                    <span className="text-sm font-bold text-slate-700">Tıkla veya Sürükle Bırak</span>
                    <span className="text-xs text-slate-500 mt-1 font-medium">Önerilen boyut: 1920x1080 px (16:9)</span>
                  </div>
                  
                  {/* AI ile Oluştur Butonu */}
                  <button 
                    type="button" 
                    className="sm:w-1/3 flex flex-col items-center justify-center gap-2 border border-purple-200 bg-purple-50 text-purple-700 rounded-xl p-4 hover:bg-purple-100 transition shadow-sm group"
                  >
                    <Sparkles className="h-7 w-7 text-purple-500 group-hover:scale-110 transition-transform" />
                    <div className="flex flex-col items-center">
                      <span className="text-sm font-extrabold tracking-tight">AI ile Oluştur</span>
                      <span className="text-[10px] font-medium opacity-80 mt-0.5">Saniyeler içinde üret</span>
                    </div>
                  </button>
                </div>
              </div>

              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-1">Etkinlik Başlığı</label>
                <input 
                  required type="text" placeholder="Örn: Blokzincir Teknolojileri Zirvesi"
                  value={newEvent.title} 
                  onChange={(e) => setNewEvent({...newEvent, title: formatTitleCase(e.target.value)})}
                  className="w-full px-4 py-2 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-slate-900"
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-1">Kategori</label>
                  <input 
                    required type="text" placeholder="Örn: Seminer"
                    value={newEvent.category} 
                    onChange={(e) => setNewEvent({...newEvent, category: formatTitleCase(e.target.value)})}
                    className="w-full px-4 py-2 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-slate-900"
                  />
                </div>
                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-1">Tarih / Saat</label>
                  {/* DEĞİŞİKLİK: type="text" yerine type="datetime-local" kullanıldı */}
                  <input 
                    required type="datetime-local" 
                    value={newEvent.date} 
                    onChange={(e) => setNewEvent({...newEvent, date: e.target.value})}
                    className="w-full px-4 py-2 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-slate-900 text-sm"
                  />
                </div>
                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-1">Konum / Salon</label>
                  <input 
                    required type="text" placeholder="Örn: Rektörlük Salonu"
                    value={newEvent.location} 
                    onChange={(e) => setNewEvent({...newEvent, location: formatTitleCase(e.target.value)})}
                    className="w-full px-4 py-2 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-slate-900"
                  />
                </div>
              </div>

              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-1">Detaylı Açıklama</label>
                <textarea 
                  required rows="3" placeholder="SKS onay heyetinin görmesi için etkinlik detayları..."
                  value={newEvent.description} onChange={(e) => setNewEvent({...newEvent, description: e.target.value})}
                  className="w-full px-4 py-2 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-slate-900 resize-none"
                ></textarea>
              </div>
              
              <div className="mt-2 flex justify-end gap-3 pt-4 border-t border-gray-100">
                <button type="button" onClick={() => setIsAddModalOpen(false)} className="px-5 py-2.5 text-sm font-bold text-gray-600 hover:bg-gray-100 rounded-xl transition">İptal</button>
                <button type="submit" className="px-5 py-2.5 text-sm font-bold bg-slate-900 text-white rounded-xl hover:bg-slate-800 transition">Talebi SKS'ye Gönder</button>
              </div>
            </form>
          </div>
        </div>
      )}

    </div>
  );
}