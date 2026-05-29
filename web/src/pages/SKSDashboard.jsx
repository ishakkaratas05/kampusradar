import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { ArrowLeft, Check, X, Clock, Eye, AlertCircle, Calendar, MapPin, School, Users } from "lucide-react";

export default function SKSDashboard() {
  const navigate = useNavigate();

  // SKS'nin önüne düşen sahte etkinlik talepleri listesi
  const [requests, setRequests] = useState([
    { id: 1, title: "Siber Güvenlik Kampı '26", university: "Gazi Üniversitesi", organizer: "Yazılım Topluluğu", role: "Öğrenci Topluluğu", category: "Atölye", date: "10 Haziran 2026", location: "Müh. Fak. M2 Amfisi", status: "Beklemede" },
    { id: 2, title: "Yapay Zeka ve Hukuk Paneli", university: "Gazi Üniversitesi", organizer: "Hukuk Fakültesi Dekanlığı", role: "Teknoloji Fakültesi Dekanlığı", category: "Panel", date: "12 Haziran 2026", location: "Mavi Salon", status: "Beklemede" },
    { id: 3, title: "Mezuniyet Balosu Sanatçı Seçimi", university: "Gazi Üniversitesi", organizer: "Rektörlük", role: "Rektörlük", category: "Sosyal", date: "20 Haziran 2026", location: "Stadyum", status: "Onaylandı" }
  ]);

  const [selectedEvent, setSelectedEvent] = useState(null);
  const [isReviewModalOpen, setIsReviewModalOpen] = useState(false);

  // Onaylama veya Reddetme Fonksiyonu
  const handleStatusChange = (id, newStatus) => {
    setRequests(requests.map(req => req.id === id ? { ...req, status: newStatus } : req));
    setIsReviewModalOpen(false);
  };

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col relative">
      
      {/* SKS Üst Bar */}
      <header className="bg-slate-900 px-6 py-4 shadow-md flex items-center justify-between text-white sticky top-0 z-40">
        <div className="flex items-center gap-4">
          <button onClick={() => navigate("/")} className="p-2 bg-slate-800 rounded-lg hover:bg-slate-700 transition">
            <ArrowLeft className="h-5 w-5 text-slate-300" />
          </button>
          <div>
            <h1 className="text-xl font-extrabold tracking-tight">SKS Etkinlik Onay Merkezi</h1>
            <p className="text-xs text-slate-400 font-medium">Gazi Üniversitesi Daire Başkanlığı</p>
          </div>
        </div>
        {/* Sağ Üst Köşe: Rol Belirteci */}
        <span className="text-sm font-bold bg-white text-slate-900 px-3 py-1.5 rounded-lg shadow-sm">
          SKS Yetkilisi
        </span>
      </header>

      {/* Ana İçerik */}
      <main className="flex-1 max-w-6xl w-full mx-auto px-4 py-8">
        
        {/* İstatistik Kartları */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-8">
          <div className="bg-white p-5 rounded-2xl border border-gray-200 shadow-sm flex items-center justify-between">
            <div>
              <p className="text-xs font-bold text-gray-400 uppercase tracking-wider">Bekleyen Talepler</p>
              <h3 className="text-2xl font-black text-amber-600 mt-1">{requests.filter(r => r.status === "Beklemede").length}</h3>
            </div>
            <div className="p-3 bg-amber-50 rounded-xl text-amber-600"><Clock className="h-6 w-6" /></div>
          </div>
          <div className="bg-white p-5 rounded-2xl border border-gray-200 shadow-sm flex items-center justify-between">
            <div>
              <p className="text-xs font-bold text-gray-400 uppercase tracking-wider">Onaylananlar</p>
              <h3 className="text-2xl font-black text-green-600 mt-1">{requests.filter(r => r.status === "Onaylandı").length}</h3>
            </div>
            <div className="p-3 bg-green-50 rounded-xl text-green-600"><Check className="h-6 w-6" /></div>
          </div>
          <div className="bg-white p-5 rounded-2xl border border-gray-200 shadow-sm flex items-center justify-between">
            <div>
              <p className="text-xs font-bold text-gray-400 uppercase tracking-wider">Reddedilenler</p>
              <h3 className="text-2xl font-black text-red-600 mt-1">{requests.filter(r => r.status === "Reddedildi").length}</h3>
            </div>
            <div className="p-3 bg-red-50 rounded-xl text-red-600"><X className="h-6 w-6" /></div>
          </div>
        </div>

        {/* Talep Listesi Tablosu */}
        <div className="bg-white rounded-2xl shadow-sm border border-gray-200 overflow-hidden">
          <div className="px-6 py-4 border-b border-gray-100 font-bold text-gray-900 bg-gray-50/50">
            Gelen Etkinlik Başvuruları
          </div>
          
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm text-gray-600">
              <thead className="bg-gray-50 text-gray-900 font-bold border-b border-gray-200">
                <tr>
                  <th className="px-6 py-4">Etkinlik Başlığı</th>
                  <th className="px-6 py-4">Düzenleyen Kurum</th>
                  <th className="px-6 py-4">Tarih / Konum</th>
                  <th className="px-6 py-4">Durum</th>
                  <th className="px-6 py-4 text-right">İncele</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {requests.map((req) => (
                  <tr key={req.id} className="hover:bg-gray-50 transition-colors">
                    <td className="px-6 py-4 font-bold text-gray-900">{req.title}</td>
                    <td className="px-6 py-4">
                      <div className="flex flex-col">
                        <span className="font-semibold text-gray-800">{req.organizer}</span>
                        <span className="text-xs text-gray-400 font-medium">{req.role}</span>
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <div className="text-xs flex flex-col gap-0.5 text-gray-500">
                        <span className="flex items-center gap-1"><Calendar className="h-3 w-3" /> {req.date}</span>
                        <span className="flex items-center gap-1"><MapPin className="h-3 w-3" /> {req.location}</span>
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <span className={`px-3 py-1 rounded-full text-xs font-bold ${
                        req.status === "Beklemede" ? "bg-amber-100 text-amber-700" :
                        req.status === "Onaylandı" ? "bg-green-100 text-green-700" : "bg-red-100 text-red-700"
                      }`}>
                        {req.status}
                      </span>
                    </td>
                    <td className="px-6 py-4 text-right">
                      <button 
                        onClick={() => { setSelectedEvent(req); setIsReviewModalOpen(true); }}
                        className="p-2 text-slate-700 hover:bg-slate-100 rounded-lg transition-colors"
                      >
                        <Eye className="h-5 w-5" />
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </main>

      {/* DETAYLI İNCELEME VE ONAY POP-UP MODALI */}
      {isReviewModalOpen && selectedEvent && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-sm p-4">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md overflow-hidden p-6">
            <div className="flex items-start gap-3 mb-4">
              <div className="p-2.5 bg-slate-100 rounded-xl text-slate-900"><School className="h-6 w-6" /></div>
              <div>
                <h3 className="text-xl font-bold text-gray-900">{selectedEvent.title}</h3>
                <p className="text-sm text-slate-600 font-medium mt-0.5">{selectedEvent.organizer}</p>
              </div>
            </div>

            <div className="bg-slate-50 rounded-xl p-4 border border-gray-100 my-5 flex flex-col gap-2.5 text-sm text-gray-700">
              <div className="flex items-center gap-2"><Users className="h-4 w-4 text-gray-400" /> <span className="font-medium text-gray-500">Düzenleyici Rolü:</span> <span className="font-bold text-slate-900">{selectedEvent.role}</span></div>
              <div className="flex items-center gap-2"><Calendar className="h-4 w-4 text-gray-400" /> <span className="font-medium text-gray-500">Tarih:</span> <span className="font-semibold">{selectedEvent.date}</span></div>
              <div className="flex items-center gap-2"><MapPin className="h-4 w-4 text-gray-400" /> <span className="font-medium text-gray-500">Konum:</span> <span className="font-semibold">{selectedEvent.location}</span></div>
            </div>

            {selectedEvent.status === "Beklemede" ? (
              <div className="flex gap-3 mt-6">
                <button 
                  onClick={() => handleStatusChange(selectedEvent.id, "Reddedildi")}
                  className="flex-1 flex items-center justify-center gap-1.5 px-4 py-2.5 bg-red-600 text-white font-bold rounded-xl hover:bg-red-700 transition shadow-sm"
                >
                  <X className="h-4 w-4" /> Reddet
                </button>
                <button 
                  onClick={() => handleStatusChange(selectedEvent.id, "Onaylandı")}
                  className="flex-1 flex items-center justify-center gap-1.5 px-4 py-2.5 bg-slate-900 text-white font-bold rounded-xl hover:bg-slate-800 transition shadow-sm"
                >
                  <Check className="h-4 w-4" /> Onayla
                </button>
              </div>
            ) : (
              <div className="mt-6 flex justify-end">
                <button onClick={() => setIsReviewModalOpen(false)} className="w-full px-4 py-2.5 bg-gray-100 text-gray-700 font-bold rounded-xl hover:bg-gray-200 transition">
                  Kapat
                </button>
              </div>
            )}
          </div>
        </div>
      )}

    </div>
  );
}