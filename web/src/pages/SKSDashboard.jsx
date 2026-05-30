import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { ArrowLeft, Check, X, Clock, Eye, Calendar, MapPin, School, Users, Loader2 } from "lucide-react";
import { useAuth } from "../context/AuthContext";
import { supabase } from "../lib/supabaseClient";

export default function SKSDashboard() {
  const navigate = useNavigate();
  const { user, profile } = useAuth();

  const [requests, setRequests] = useState([]);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);

  const [selectedEvent, setSelectedEvent] = useState(null);
  const [isReviewModalOpen, setIsReviewModalOpen] = useState(false);
  const [rejectionInput, setRejectionInput] = useState("");
  const [showRejectionForm, setShowRejectionForm] = useState(false);

  // Üniversiteye ait tüm etkinlik isteklerini çek
  useEffect(() => {
    async function loadRequests() {
      if (!profile?.university_id) return;
      try {
        setLoading(true);
        const { data, error } = await supabase
          .from("events")
          .select(`
            *,
            profiles:organizer_id(full_name, role)
          `)
          .eq("university_id", profile.university_id)
          .order("created_at", { ascending: false });

        if (error) throw error;
        setRequests(data || []);
      } catch (err) {
        console.error("Etkinlik istekleri yüklenirken hata:", err.message);
      } finally {
        setLoading(false);
      }
    }
    if (profile) {
      loadRequests();
    }
  }, [profile]);

  // Onaylama veya Reddetme Fonksiyonu
  const handleStatusChange = async (id, newStatus, rejectionReason = "") => {
    try {
      setSubmitting(true);
      const { error } = await supabase
        .from("events")
        .update({ 
          status: newStatus,
          rejection_reason: newStatus === "rejected" ? rejectionReason : null
        })
        .eq("id", id);

      if (error) throw error;

      setRequests(prev => prev.map(req => req.id === id ? { ...req, status: newStatus, rejection_reason: rejectionReason } : req));
      setIsReviewModalOpen(false);
      setShowRejectionForm(false);
      setRejectionInput("");
      setSelectedEvent(null);
    } catch (err) {
      console.error("İşlem hatası:", err.message);
      alert("Durum güncellenirken bir hata oluştu: " + err.message);
    } finally {
      setSubmitting(false);
    }
  };

  const getRoleLabel = (role) => {
    switch (role) {
      case "organizer": return "Organizatör";
      case "admin": return "Yönetici";
      case "student": return "Öğrenci";
      default: return "Kulüp / Topluluk";
    }
  };

  const getStatusLabel = (status) => {
    switch (status) {
      case "pending": return "Beklemede";
      case "approved": return "Onaylandı";
      case "rejected": return "Reddedildi";
      default: return status;
    }
  };

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col relative">
      
      {/* SKS Üst Bar */}
      <header className="bg-slate-900 px-6 py-4 shadow-md flex items-center justify-between text-white sticky top-0 z-40">
        <div className="flex items-center gap-4">
          <button onClick={() => navigate("/")} className="p-2 bg-slate-800 rounded-lg hover:bg-slate-700 transition cursor-pointer">
            <ArrowLeft className="h-5 w-5 text-slate-300" />
          </button>
          <div>
            <h1 className="text-xl font-extrabold tracking-tight">SKS Etkinlik Onay Merkezi</h1>
            <p className="text-xs text-slate-400 font-medium">Daire Başkanlığı Yönetim Paneli</p>
          </div>
        </div>
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
              <h3 className="text-2xl font-black text-amber-600 mt-1">{requests.filter(r => r.status === "pending").length}</h3>
            </div>
            <div className="p-3 bg-amber-50 rounded-xl text-amber-600"><Clock className="h-6 w-6" /></div>
          </div>
          <div className="bg-white p-5 rounded-2xl border border-gray-200 shadow-sm flex items-center justify-between">
            <div>
              <p className="text-xs font-bold text-gray-400 uppercase tracking-wider">Onaylananlar</p>
              <h3 className="text-2xl font-black text-green-600 mt-1">{requests.filter(r => r.status === "approved").length}</h3>
            </div>
            <div className="p-3 bg-green-50 rounded-xl text-green-600"><Check className="h-6 w-6" /></div>
          </div>
          <div className="bg-white p-5 rounded-2xl border border-gray-200 shadow-sm flex items-center justify-between">
            <div>
              <p className="text-xs font-bold text-gray-400 uppercase tracking-wider">Reddedilenler</p>
              <h3 className="text-2xl font-black text-red-600 mt-1">{requests.filter(r => r.status === "rejected").length}</h3>
            </div>
            <div className="p-3 bg-red-50 rounded-xl text-red-600"><X className="h-6 w-6" /></div>
          </div>
        </div>

        {/* Talep Listesi Tablosu */}
        <div className="bg-white rounded-2xl shadow-sm border border-gray-200 overflow-hidden">
          <div className="px-6 py-4 border-b border-gray-100 font-bold text-gray-900 bg-gray-50/50">
            Gelen Etkinlik Başvuruları
          </div>
          
          {loading ? (
            <div className="flex items-center justify-center py-16 gap-3 text-gray-400">
              <Loader2 className="h-8 w-8 animate-spin" />
              <span className="text-sm font-medium">Talepler yükleniyor...</span>
            </div>
          ) : requests.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-16 text-gray-400">
              <School className="h-10 w-10 mb-3 text-gray-300" />
              <p className="text-sm font-medium">Herhangi bir etkinlik başvurusu bulunmamaktadır.</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left text-sm text-gray-600">
                <thead className="bg-gray-50 text-gray-900 font-bold border-b border-gray-200">
                  <tr>
                    <th className="px-6 py-4">Etkinlik Başlığı</th>
                    <th className="px-6 py-4">Düzenleyen Kurum</th>
                    <th className="px-6 py-4">Tarih / Konum</th>
                    <th className="px-6 py-4">Kapasite</th>
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
                          <span className="font-semibold text-gray-800">{req.profiles?.full_name || "Bilinmeyen Topluluk"}</span>
                          <span className="text-xs text-gray-400 font-medium">{getRoleLabel(req.profiles?.role)}</span>
                        </div>
                      </td>
                      <td className="px-6 py-4">
                        <div className="text-xs flex flex-col gap-0.5 text-gray-500">
                          <span className="flex items-center gap-1">
                            <Calendar className="h-3 w-3" /> 
                            {req.date ? new Date(req.date).toLocaleString('tr-TR', { day: 'numeric', month: 'long', year: 'numeric', hour: '2-digit', minute: '2-digit' }) : "-"}
                          </span>
                          <span className="flex items-center gap-1"><MapPin className="h-3 w-3" /> {req.location}</span>
                        </div>
                      </td>
                      <td className="px-6 py-4 font-semibold text-gray-700">{req.capacity || "Sınırsız"}</td>
                      <td className="px-6 py-4">
                        <span className={`px-3 py-1 rounded-full text-xs font-bold ${
                          req.status === "pending" ? "bg-amber-100 text-amber-700" :
                          req.status === "approved" ? "bg-green-100 text-green-700" : "bg-red-100 text-red-700"
                        }`}>
                          {getStatusLabel(req.status)}
                        </span>
                      </td>
                      <td className="px-6 py-4 text-right">
                        <button 
                          onClick={() => { setSelectedEvent(req); setIsReviewModalOpen(true); setShowRejectionForm(false); setRejectionInput(""); }}
                          className="p-2 text-slate-700 hover:bg-slate-100 rounded-lg transition-colors cursor-pointer"
                        >
                          <Eye className="h-5 w-5" />
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </main>

      {/* DETAYLI İNCELEME VE ONAY POP-UP MODALI */}
      {isReviewModalOpen && selectedEvent && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-sm p-4">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md overflow-hidden p-6 max-h-[90vh] overflow-y-auto">
            <div className="flex items-start gap-3 mb-4">
              <div className="p-2.5 bg-slate-100 rounded-xl text-slate-900"><School className="h-6 w-6" /></div>
              <div>
                <h3 className="text-xl font-bold text-gray-900">{selectedEvent.title}</h3>
                <p className="text-sm text-slate-600 font-medium mt-0.5">{selectedEvent.profiles?.full_name}</p>
              </div>
            </div>

            <div className="bg-slate-50 rounded-xl p-4 border border-gray-100 my-5 flex flex-col gap-2.5 text-sm text-gray-700">
              <div className="flex items-center gap-2"><Users className="h-4 w-4 text-gray-400" /> <span className="font-medium text-gray-500">Düzenleyici Rolü:</span> <span className="font-bold text-slate-900">{getRoleLabel(selectedEvent.profiles?.role)}</span></div>
              <div className="flex items-center gap-2"><Calendar className="h-4 w-4 text-gray-400" /> <span className="font-medium text-gray-500">Tarih:</span> <span className="font-semibold">{selectedEvent.date ? new Date(selectedEvent.date).toLocaleString('tr-TR') : ""}</span></div>
              <div className="flex items-center gap-2"><MapPin className="h-4 w-4 text-gray-400" /> <span className="font-medium text-gray-500">Konum:</span> <span className="font-semibold">{selectedEvent.location}</span></div>
            </div>

            <div className="mb-4">
              <h4 className="text-sm font-bold text-gray-900 mb-1">Açıklama</h4>
              <p className="text-xs text-gray-600 leading-relaxed bg-gray-50 rounded-lg p-3 border border-gray-100 max-h-24 overflow-y-auto">{selectedEvent.description}</p>
            </div>

            {selectedEvent.status === "pending" ? (
              <>
                {showRejectionForm ? (
                  <div className="mt-4 flex flex-col gap-2 border-t border-gray-100 pt-4">
                    <label className="block text-xs font-bold text-red-700">Red Gerekçesi</label>
                    <textarea
                      required
                      rows="2"
                      value={rejectionInput}
                      onChange={(e) => setRejectionInput(e.target.value)}
                      placeholder="Lütfen organizatöre iletilecek ret sebebini yazın..."
                      className="w-full p-2 border border-gray-200 rounded-xl text-xs focus:outline-none focus:ring-1 focus:ring-red-500"
                    ></textarea>
                    
                    <div className="flex gap-2 mt-2">
                      <button 
                        type="button" 
                        onClick={() => setShowRejectionForm(false)}
                        className="flex-1 px-3 py-2 bg-gray-100 text-gray-700 font-bold rounded-lg text-xs hover:bg-gray-200"
                      >
                        Vazgeç
                      </button>
                      <button 
                        type="button" 
                        disabled={submitting || !rejectionInput.trim()}
                        onClick={() => handleStatusChange(selectedEvent.id, "rejected", rejectionInput)}
                        className="flex-1 px-3 py-2 bg-red-600 text-white font-bold rounded-lg text-xs hover:bg-red-700 disabled:opacity-50"
                      >
                        Reddi Onayla
                      </button>
                    </div>
                  </div>
                ) : (
                  <div className="flex gap-3 mt-6">
                    <button 
                      onClick={() => setShowRejectionForm(true)}
                      className="flex-1 flex items-center justify-center gap-1.5 px-4 py-2.5 bg-red-600 text-white font-bold rounded-xl hover:bg-red-700 transition shadow-sm cursor-pointer"
                    >
                      <X className="h-4 w-4" /> Reddet
                    </button>
                    <button 
                      disabled={submitting}
                      onClick={() => handleStatusChange(selectedEvent.id, "approved")}
                      className="flex-1 flex items-center justify-center gap-1.5 px-4 py-2.5 bg-slate-900 text-white font-bold rounded-xl hover:bg-slate-800 transition shadow-sm cursor-pointer disabled:opacity-50"
                    >
                      {submitting ? <Loader2 className="h-4 w-4 animate-spin" /> : <Check className="h-4 w-4" />} Onayla
                    </button>
                  </div>
                )}
              </>
            ) : (
              <div className="mt-6 flex flex-col gap-3">
                {selectedEvent.status === "rejected" && selectedEvent.rejection_reason && (
                  <div className="p-3 bg-red-50 border border-red-100 rounded-xl text-xs text-red-800 font-semibold mb-2">
                    Ret Nedeni: {selectedEvent.rejection_reason}
                  </div>
                )}
                <button onClick={() => setIsReviewModalOpen(false)} className="w-full px-4 py-2.5 bg-gray-100 text-gray-700 font-bold rounded-xl hover:bg-gray-200 transition cursor-pointer">
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