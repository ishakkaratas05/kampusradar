import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { ArrowLeft, Check, X, Clock, Eye, Calendar, MapPin, School, Users, Loader2 } from "lucide-react";
import { useAuth } from "../context/AuthContext";
import { supabase } from "../lib/supabaseClient";
import ProfileDropdown from "../components/ProfileDropdown";

export default function SKSDashboard() {
  const navigate = useNavigate();
  const { user, profile } = useAuth();

  const [requests, setRequests] = useState([]);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [filterStatus, setFilterStatus] = useState("all");

  const [selectedEvent, setSelectedEvent] = useState(null);
  const [isReviewModalOpen, setIsReviewModalOpen] = useState(false);
  const [rejectionInput, setRejectionInput] = useState("");
  const [showRejectionForm, setShowRejectionForm] = useState(false);
  const [universityName, setUniversityName] = useState("");
  const [universityLogo, setUniversityLogo] = useState("");

  // Organizatör onay akışı state ve fonksiyonları
  const [activeTab, setActiveTab] = useState("events"); // "events" | "organizers"
  const [organizers, setOrganizers] = useState([]);
  const [loadingOrganizers, setLoadingOrganizers] = useState(false);
  const [selectedOrg, setSelectedOrg] = useState(null);
  const [isOrgReviewModalOpen, setIsOrgReviewModalOpen] = useState(false);
  const [orgRejectionInput, setOrgRejectionInput] = useState("");

  const loadOrganizers = async () => {
    if (!profile?.university_id) return;
    try {
      setLoadingOrganizers(true);
      const { data, error } = await supabase
        .from("profiles")
        .select("*")
        .eq("role", "organizer")
        .eq("university_id", profile.university_id)
        .eq("is_approved", false)
        .order("created_at", { ascending: false });

      if (error) throw error;
      setOrganizers(data || []);
    } catch (err) {
      console.error("Organizatörler yüklenirken hata:", err.message);
    } finally {
      setLoadingOrganizers(false);
    }
  };

  useEffect(() => {
    if (profile) {
      loadOrganizers();
    }
  }, [profile, activeTab]);

  const handleApproveOrganizer = async (orgId) => {
    try {
      setSubmitting(true);
      const { error } = await supabase
        .from("profiles")
        .update({ is_approved: true, rejection_reason: null })
        .eq("id", orgId);

      if (error) throw error;

      // State güncelle
      setOrganizers(prev => prev.filter(org => org.id !== orgId));
    } catch (err) {
      console.error("Organizatör onaylanırken hata:", err.message);
      alert("Organizatör onaylanırken hata oluştu: " + err.message);
    } finally {
      setSubmitting(false);
    }
  };

  const handleRejectOrganizer = async (orgId, reason) => {
    try {
      setSubmitting(true);
      const { error } = await supabase
        .from("profiles")
        .update({ 
          is_approved: false, 
          rejection_reason: reason 
        })
        .eq("id", orgId);

      if (error) throw error;

      // State güncelle
      setOrganizers(prev => prev.map(org => org.id === orgId ? { ...org, is_approved: false, rejection_reason: reason } : org));
      setIsOrgReviewModalOpen(false);
      setOrgRejectionInput("");
      setSelectedOrg(null);
    } catch (err) {
      console.error("Organizatör reddedilirken hata:", err.message);
      alert("Organizatör reddedilirken hata oluştu: " + err.message);
    } finally {
      setSubmitting(false);
    }
  };

  // Üniversite bilgilerini çek
  useEffect(() => {
    async function fetchUni() {
      if (profile?.university_id) {
        const { data } = await supabase.from("universities").select("name, logo_url").eq("id", profile.university_id).single();
        if (data) {
          setUniversityName(data.name);
          setUniversityLogo(data.logo_url);
        }
      }
    }
    fetchUni();
  }, [profile]);

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
      const { data, error } = await supabase
        .from("events")
        .update({ 
          status: newStatus,
          rejection_reason: newStatus === "rejected" ? rejectionReason : null
        })
        .eq("id", id)
        .select();

      if (error) throw error;

      if (!data || data.length === 0) {
        throw new Error("Bu işlemi gerçekleştirmek için yetkiniz bulunmuyor (Veritabanı RLS Politikası engeli).");
      }

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

  const filteredRequests = filterStatus === "all" 
    ? requests 
    : requests.filter(req => req.status === filterStatus);

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col relative">
      
      {/* SKS Üst Bar */}
      <header className="bg-slate-900 px-6 py-4 shadow-md flex items-center justify-between text-white sticky top-0 z-40">
        <div className="flex items-center gap-4 flex-1 min-w-0">
          <button onClick={() => navigate("/")} className="p-2 bg-slate-800 rounded-lg hover:bg-slate-700 transition cursor-pointer shrink-0">
            <ArrowLeft className="h-5 w-5 text-slate-300" />
          </button>
          <div className="truncate">
            <h1 className="text-xl font-extrabold tracking-tight truncate">SKS Etkinlik Onay Merkezi</h1>
            <p className="text-xs text-slate-400 font-medium truncate">Daire Başkanlığı Yönetim Paneli</p>
          </div>
        </div>

        {universityName && (
          <div className="flex flex-col items-center justify-center text-center px-4 shrink-0">
            {universityLogo ? (
              <img src={universityLogo} alt={universityName} className="h-8 w-8 object-contain bg-white rounded-lg p-0.5 shadow-sm" />
            ) : (
              <School className="h-8 w-8 text-slate-300" />
            )}
            <span className="text-[10px] font-bold text-slate-300 mt-1 max-w-[120px] sm:max-w-[200px] truncate leading-tight">
              {universityName}
            </span>
          </div>
        )}

        <div className="flex items-center justify-end flex-1 min-w-0">
          <ProfileDropdown />
        </div>
      </header>

      <main className="flex-1 max-w-6xl w-full mx-auto px-4 py-8">
        
        {/* Sekmeler: Etkinlik Talepleri & Organizatör Onayları */}
        <div className="flex border-b border-gray-200 mb-8 shrink-0">
          <button
            onClick={() => setActiveTab("events")}
            className={`py-3 px-6 font-bold text-sm border-b-2 transition-all cursor-pointer ${
              activeTab === "events"
                ? "border-slate-900 text-slate-900 font-extrabold"
                : "border-transparent text-gray-500 hover:text-gray-700"
            }`}
          >
            Etkinlik Talepleri
          </button>
          <button
            onClick={() => setActiveTab("organizers")}
            className={`py-3 px-6 font-bold text-sm border-b-2 transition-all cursor-pointer ${
              activeTab === "organizers"
                ? "border-slate-900 text-slate-900 font-extrabold"
                : "border-transparent text-gray-500 hover:text-gray-700"
            }`}
          >
            Topluluk Kayıt Talepleri ({organizers.length})
          </button>
        </div>

        {activeTab === "events" ? (
          <>
            {/* İstatistik Kartları */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-8">
          <div 
            onClick={() => setFilterStatus(prev => prev === "pending" ? "all" : "pending")}
            className={`p-5 rounded-2xl border shadow-sm flex items-center justify-between cursor-pointer transition-all ${
              filterStatus === "pending" ? "bg-amber-50 border-amber-300 ring-2 ring-amber-200" : "bg-white border-gray-200 hover:border-amber-200 hover:bg-amber-50/50"
            }`}
          >
            <div>
              <p className="text-xs font-bold text-gray-400 uppercase tracking-wider">Bekleyen Talepler</p>
              <h3 className="text-2xl font-black text-amber-600 mt-1">{requests.filter(r => r.status === "pending").length}</h3>
            </div>
            <div className="p-3 bg-amber-50 rounded-xl text-amber-600"><Clock className="h-6 w-6" /></div>
          </div>
          
          <div 
            onClick={() => setFilterStatus(prev => prev === "approved" ? "all" : "approved")}
            className={`p-5 rounded-2xl border shadow-sm flex items-center justify-between cursor-pointer transition-all ${
              filterStatus === "approved" ? "bg-green-50 border-green-300 ring-2 ring-green-200" : "bg-white border-gray-200 hover:border-green-200 hover:bg-green-50/50"
            }`}
          >
            <div>
              <p className="text-xs font-bold text-gray-400 uppercase tracking-wider">Onaylananlar</p>
              <h3 className="text-2xl font-black text-green-600 mt-1">{requests.filter(r => r.status === "approved").length}</h3>
            </div>
            <div className="p-3 bg-green-50 rounded-xl text-green-600"><Check className="h-6 w-6" /></div>
          </div>
          
          <div 
            onClick={() => setFilterStatus(prev => prev === "rejected" ? "all" : "rejected")}
            className={`p-5 rounded-2xl border shadow-sm flex items-center justify-between cursor-pointer transition-all ${
              filterStatus === "rejected" ? "bg-red-50 border-red-300 ring-2 ring-red-200" : "bg-white border-gray-200 hover:border-red-200 hover:bg-red-50/50"
            }`}
          >
            <div>
              <p className="text-xs font-bold text-gray-400 uppercase tracking-wider">Reddedilenler</p>
              <h3 className="text-2xl font-black text-red-600 mt-1">{requests.filter(r => r.status === "rejected").length}</h3>
            </div>
            <div className="p-3 bg-red-50 rounded-xl text-red-600"><X className="h-6 w-6" /></div>
          </div>
        </div>

        {filterStatus !== "all" && (
          <div className="flex justify-end mb-3">
            <button 
              onClick={() => setFilterStatus("all")} 
              className="flex items-center gap-1.5 px-4 py-2 bg-slate-200 text-slate-700 text-sm font-bold rounded-xl hover:bg-slate-300 transition cursor-pointer"
            >
              <X className="h-4 w-4" /> Filtreyi Temizle
            </button>
          </div>
        )}

        {/* Talep Listesi Tablosu */}
        <div className="bg-white rounded-2xl shadow-sm border border-gray-200 overflow-hidden">
          <div className="px-6 py-2.5 font-bold text-white bg-slate-900 text-center uppercase tracking-wider text-sm">
            Gelen Etkinlik Başvuruları
          </div>
          
          {loading ? (
            <div className="flex items-center justify-center py-16 gap-3 text-gray-400">
              <Loader2 className="h-8 w-8 animate-spin" />
              <span className="text-sm font-medium">Talepler yükleniyor...</span>
            </div>
          ) : filteredRequests.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-16 text-gray-400">
              <School className="h-10 w-10 mb-3 text-gray-300" />
              <p className="text-sm font-medium">
                {filterStatus === "all" ? "Şu an için sistemde herhangi bir etkinlik başvurusu bulunmuyor." :
                 filterStatus === "pending" ? "Şu an onayınızı bekleyen yeni bir etkinlik talebi bulunmuyor." :
                 filterStatus === "approved" ? "Sistemde daha önce onaylanmış bir etkinlik bulunmuyor." :
                 "Sistemde daha önce reddedilmiş bir etkinlik bulunmuyor."}
              </p>
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
                  {filteredRequests.map((req) => (
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
          </>
        ) : (
          /* Organizatör Onay Tablosu */
          <div className="bg-white rounded-2xl shadow-sm border border-gray-200 overflow-hidden animate-in fade-in duration-200">
            <div className="px-6 py-2.5 font-bold text-white bg-slate-900 text-center uppercase tracking-wider text-sm">
              Bekleyen Topluluk Kayıt Başvuruları
            </div>

            {loadingOrganizers ? (
              <div className="flex items-center justify-center py-16 gap-3 text-gray-400">
                <Loader2 className="h-8 w-8 animate-spin" />
                <span className="text-sm font-medium">Başvurular yükleniyor...</span>
              </div>
            ) : organizers.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-16 text-gray-400">
                <Users className="h-10 w-10 mb-3 text-gray-300" />
                <p className="text-sm font-medium">Onay bekleyen yeni bir organizatör başvurusu bulunmuyor.</p>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-left text-sm text-gray-600">
                  <thead className="bg-gray-50 text-gray-900 font-bold border-b border-gray-200">
                    <tr>
                      <th className="px-6 py-4">Topluluk Adı</th>
                      <th className="px-6 py-4">E-posta</th>
                      <th className="px-6 py-4">Kayıt Tarihi</th>
                      <th className="px-6 py-4">Durum</th>
                      <th className="px-6 py-4 text-right">İşlem</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100">
                    {organizers.map((org) => (
                      <tr key={org.id} className="hover:bg-gray-50 transition-colors">
                        <td className="px-6 py-4 font-bold text-gray-900 flex items-center gap-3">
                          <div className="h-8 w-8 rounded-full bg-slate-100 flex items-center justify-center shrink-0 border border-gray-200 overflow-hidden">
                            {org.logo_url ? (
                              <img src={org.logo_url} alt="" className="h-full w-full object-cover" />
                            ) : (
                              <Users className="h-4 w-4 text-slate-400" />
                            )}
                          </div>
                          {org.full_name}
                        </td>
                        <td className="px-6 py-4">{org.email}</td>
                        <td className="px-6 py-4">
                          {org.created_at ? new Date(org.created_at).toLocaleDateString('tr-TR', { day: 'numeric', month: 'long', year: 'numeric' }) : "-"}
                        </td>
                        <td className="px-6 py-4">
                          {org.rejection_reason ? (
                            <div className="flex flex-col items-start max-w-[200px]" title={org.rejection_reason}>
                              <span className="px-2 py-0.5 rounded-md text-xs font-bold bg-red-100 text-red-700">Reddedildi</span>
                              <span className="text-[10px] text-red-650 font-medium truncate w-full mt-1">Neden: {org.rejection_reason}</span>
                            </div>
                          ) : (
                            <span className="px-2 py-0.5 rounded-md text-xs font-bold bg-amber-100 text-amber-700">
                              Onay Bekliyor
                            </span>
                          )}
                        </td>
                        <td className="px-6 py-4 text-right">
                          <div className="flex items-center justify-end gap-2">
                            <button
                              disabled={submitting}
                              onClick={() => handleApproveOrganizer(org.id)}
                              className="inline-flex items-center gap-1 px-2.5 py-1.5 bg-green-600 text-white text-xs font-bold rounded-lg hover:bg-green-700 transition cursor-pointer disabled:opacity-50"
                            >
                              <Check className="h-3.5 w-3.5" /> Onayla
                            </button>
                            {!org.rejection_reason && (
                              <button
                                disabled={submitting}
                                onClick={() => { setSelectedOrg(org); setIsOrgReviewModalOpen(true); setOrgRejectionInput(""); }}
                                className="inline-flex items-center gap-1 px-2.5 py-1.5 bg-red-600 text-white text-xs font-bold rounded-lg hover:bg-red-700 transition cursor-pointer disabled:opacity-50"
                              >
                                <X className="h-3.5 w-3.5" /> Reddet
                              </button>
                            )}
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        )}
      </main>

      {/* DETAYLI İNCELEME VE ONAY POP-UP MODALI */}
      {isReviewModalOpen && selectedEvent && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-sm p-4">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-5xl overflow-hidden flex flex-col h-[85vh]">
            
            {/* Modal Üst Bar */}
            <div className="px-6 py-4 border-b border-gray-100 flex items-center justify-between bg-white z-10 shrink-0">
              <h2 className="text-lg font-bold text-gray-900">Etkinlik İnceleme</h2>
              <button 
                onClick={() => setIsReviewModalOpen(false)} 
                className="p-2 text-gray-400 hover:bg-gray-100 hover:text-gray-900 rounded-xl transition-colors cursor-pointer"
                title="Kapat"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            {/* Modal İçerik (Sabit Yükseklik) */}
            <div className="p-6 flex-1 overflow-hidden">
              <div className="grid grid-cols-1 md:grid-cols-12 gap-8 h-full">
                
                {/* Sol Taraf: Bilgiler ve Butonlar (7 Kolon) */}
                <div className="md:col-span-7 flex flex-col h-full">
                  
                  {/* Başlık ve Profil */}
                  <div className="flex items-start gap-4 mb-5 shrink-0">
                    <div className="p-2.5 bg-slate-100 rounded-2xl text-slate-900 shrink-0 shadow-sm flex items-center justify-center overflow-hidden">
                      {universityLogo ? (
                        <img src={universityLogo} alt={universityName} className="h-12 w-12 object-contain mix-blend-multiply" />
                      ) : (
                        <School className="h-10 w-10" />
                      )}
                    </div>
                    <div className="py-1">
                      <h3 className="text-xl sm:text-2xl font-bold text-gray-900 leading-tight">{selectedEvent.title}</h3>
                      <p className="text-sm text-slate-600 font-medium mt-1">{selectedEvent.profiles?.full_name}</p>
                    </div>
                  </div>

                  {/* Özet Bilgiler */}
                  <div className="bg-slate-50 rounded-xl p-4 sm:p-5 border border-gray-100 flex flex-col gap-3 text-sm text-gray-700 shrink-0 mb-5">
                    <div className="flex items-center gap-2"><Users className="h-4 w-4 text-gray-400 shrink-0" /> <span className="font-medium text-gray-500 w-24">Düzenleyici:</span> <span className="font-bold text-slate-900">{selectedEvent.profiles?.full_name || "Bilinmiyor"}</span></div>
                    <div className="flex items-center gap-2"><Calendar className="h-4 w-4 text-gray-400 shrink-0" /> <span className="font-medium text-gray-500 w-24">Tarih:</span> <span className="font-semibold">{selectedEvent.date ? new Date(selectedEvent.date).toLocaleString('tr-TR', { day: 'numeric', month: 'long', year: 'numeric', hour: '2-digit', minute: '2-digit' }) : "-"}</span></div>
                    <div className="flex items-center gap-2"><MapPin className="h-4 w-4 text-gray-400 shrink-0" /> <span className="font-medium text-gray-500 w-24">Konum:</span> <span className="font-semibold">{selectedEvent.location}</span></div>
                    <div className="flex items-center gap-2"><Users className="h-4 w-4 text-gray-400 shrink-0" /> <span className="font-medium text-gray-500 w-24">Kapasite:</span> <span className="font-semibold">{selectedEvent.capacity || "Sınırsız"}</span></div>
                  </div>

                  {/* Açıklama (Sadece burası kaydırılabilir) */}
                  <div className="flex-1 flex flex-col overflow-hidden min-h-0 mb-5">
                    <h4 className="text-sm font-bold text-gray-900 mb-2 shrink-0">Açıklama</h4>
                    <div className="text-sm text-gray-600 leading-relaxed bg-gray-50/50 rounded-xl p-4 border border-gray-100 whitespace-pre-wrap overflow-y-auto flex-1">
                      {selectedEvent.description}
                    </div>
                  </div>

                  {/* Alt Kısım: Aksiyonlar */}
                  <div className="shrink-0 pt-5 border-t border-gray-100 mt-auto">
                    {selectedEvent.status === "pending" ? (
                      <>
                        {showRejectionForm ? (
                          <div className="flex flex-col gap-3">
                            <label className="block text-sm font-bold text-red-700">Red Gerekçesi (Zorunlu)</label>
                            <textarea
                              required
                              rows="2"
                              value={rejectionInput}
                              onChange={(e) => setRejectionInput(e.target.value)}
                              placeholder="Lütfen organizatöre iletilecek ret sebebini yazın..."
                              className="w-full p-3 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-red-500 focus:border-transparent bg-white resize-none"
                            ></textarea>
                            
                            <div className="flex gap-3 mt-1">
                              <button 
                                type="button" 
                                onClick={() => setShowRejectionForm(false)}
                                className="flex-1 px-4 py-2.5 bg-gray-100 text-gray-700 font-bold rounded-xl text-sm hover:bg-gray-200 transition cursor-pointer"
                              >
                                Vazgeç
                              </button>
                              <button 
                                type="button" 
                                disabled={submitting || !rejectionInput.trim()}
                                onClick={() => handleStatusChange(selectedEvent.id, "rejected", rejectionInput)}
                                className="flex-1 px-4 py-2.5 bg-red-600 text-white font-bold rounded-xl text-sm hover:bg-red-700 disabled:opacity-50 transition cursor-pointer"
                              >
                                {submitting ? "İşleniyor..." : "Reddi Onayla"}
                              </button>
                            </div>
                          </div>
                        ) : (
                          <div className="flex gap-4">
                            <button 
                              onClick={() => setShowRejectionForm(true)}
                              className="flex-1 flex items-center justify-center gap-2 px-4 py-3.5 bg-red-50 text-red-700 border border-red-200 font-bold rounded-xl hover:bg-red-100 hover:border-red-300 transition cursor-pointer"
                            >
                              <X className="h-5 w-5" /> Reddet
                            </button>
                            <button 
                              disabled={submitting}
                              onClick={() => handleStatusChange(selectedEvent.id, "approved")}
                              className="flex-1 flex items-center justify-center gap-2 px-4 py-3.5 bg-slate-900 text-white font-bold rounded-xl hover:bg-slate-800 transition shadow-md cursor-pointer disabled:opacity-50"
                            >
                              {submitting ? <Loader2 className="h-5 w-5 animate-spin" /> : <Check className="h-5 w-5" />} Onayla
                            </button>
                          </div>
                        )}
                      </>
                    ) : (
                      <div className="flex flex-col gap-3">
                        {selectedEvent.status === "rejected" && selectedEvent.rejection_reason && (
                          <div className="p-3 bg-red-50 border border-red-100 rounded-xl text-sm text-red-800 font-semibold flex flex-col gap-1">
                            <span className="text-xs uppercase tracking-wider text-red-600 font-bold">Ret Nedeni</span>
                            {selectedEvent.rejection_reason}
                          </div>
                        )}
                        {selectedEvent.status === "approved" && (
                          <div className="p-3 bg-green-50 border border-green-100 rounded-xl text-sm text-green-800 font-semibold flex items-center gap-2">
                            <Check className="h-5 w-5 text-green-600" />
                            Bu etkinlik onaylanmıştır.
                          </div>
                        )}
                      </div>
                    )}
                  </div>

                </div>

                {/* Sağ Taraf: Afiş (5 Kolon) */}
                <div className="md:col-span-5 h-full rounded-2xl overflow-hidden relative bg-slate-950 shadow-inner">
                  {selectedEvent.image_url ? (
                    <img 
                      src={selectedEvent.image_url} 
                      alt="Afiş" 
                      className="w-full h-full object-cover" 
                    />
                  ) : (
                    <div className="flex flex-col h-full items-center justify-center text-gray-400 p-8 text-center">
                      <School className="h-12 w-12 mb-3 opacity-30" />
                      <span className="text-sm font-medium">Afiş Eklenmemiş</span>
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ORGANİZATÖR REDDETME MODALI */}
      {isOrgReviewModalOpen && selectedOrg && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-sm p-4">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md overflow-hidden flex flex-col">
            <div className="px-6 py-4 border-b border-gray-150 flex items-center justify-between bg-white z-10 shrink-0">
              <h2 className="text-lg font-bold text-gray-900">Topluluk Başvurusunu Reddet</h2>
              <button 
                onClick={() => setIsOrgReviewModalOpen(false)} 
                className="p-2 text-gray-400 hover:bg-gray-100 hover:text-gray-900 rounded-xl transition-colors cursor-pointer"
              >
                <X className="h-5 w-5" />
              </button>
            </div>
            
            <div className="p-6 flex flex-col gap-4">
              <div className="text-sm">
                <p className="font-semibold text-gray-700">Topluluk Adı: <span className="font-bold text-gray-900">{selectedOrg.full_name}</span></p>
                <p className="font-semibold text-gray-700 mt-1">E-posta: <span className="font-medium text-gray-600">{selectedOrg.email}</span></p>
              </div>

              <div className="flex flex-col gap-2">
                <label className="block text-sm font-bold text-red-700">Red Gerekçesi (Zorunlu)</label>
                <textarea
                  required
                  rows="3"
                  value={orgRejectionInput}
                  onChange={(e) => setOrgRejectionInput(e.target.value)}
                  placeholder="Lütfen topluluğa iletilecek ret sebebini yazın..."
                  className="w-full p-3 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-red-500 focus:border-transparent bg-white resize-none"
                ></textarea>
              </div>
            </div>

            <div className="px-6 py-4 bg-gray-50 border-t border-gray-150 flex gap-3 justify-end">
              <button 
                type="button" 
                onClick={() => setIsOrgReviewModalOpen(false)}
                className="px-4 py-2 bg-gray-200 text-gray-700 font-bold rounded-xl text-sm hover:bg-gray-300 transition cursor-pointer"
              >
                İptal
              </button>
              <button 
                type="button" 
                disabled={submitting || !orgRejectionInput.trim()}
                onClick={() => handleRejectOrganizer(selectedOrg.id, orgRejectionInput)}
                className="px-4 py-2 bg-red-650 text-white font-bold rounded-xl text-sm hover:bg-red-750 disabled:opacity-50 transition cursor-pointer"
              >
                {submitting ? "İşleniyor..." : "Reddi Onayla"}
              </button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
}