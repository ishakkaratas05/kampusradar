import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { ArrowLeft, Check, X, Clock, Eye, Calendar, MapPin, School, Users, Loader2, AlertTriangle, Trash2, Play } from "lucide-react";
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
  const [activeTab, setActiveTab] = useState("events"); // "events" | "organizers" | "approved_organizers"
  const [organizers, setOrganizers] = useState([]);
  const [loadingOrganizers, setLoadingOrganizers] = useState(false);
  const [approvedOrganizers, setApprovedOrganizers] = useState([]);
  const [loadingApprovedOrganizers, setLoadingApprovedOrganizers] = useState(false);
  const [suspendedOrganizers, setSuspendedOrganizers] = useState([]);
  const [loadingSuspendedOrganizers, setLoadingSuspendedOrganizers] = useState(false);
  const [selectedOrg, setSelectedOrg] = useState(null);
  const [isOrgReviewModalOpen, setIsOrgReviewModalOpen] = useState(false);
  const [orgRejectionInput, setOrgRejectionInput] = useState("");
  
  // Silme onay modali state'leri
  const [isDeleteConfirmModalOpen, setIsDeleteConfirmModalOpen] = useState(false);
  const [orgToDelete, setOrgToDelete] = useState(null);

  // Askıya alınma gerekçesi detay modalı state'leri
  const [isReasonModalOpen, setIsReasonModalOpen] = useState(false);
  const [reasonModalContent, setReasonModalContent] = useState("");

  // Aktifleştirme onay modalı state'leri
  const [isReactivateConfirmModalOpen, setIsReactivateConfirmModalOpen] = useState(false);
  const [orgToReactivate, setOrgToReactivate] = useState(null);

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
        .eq("is_suspended", false)
        .order("created_at", { ascending: false });

      if (error) throw error;
      setOrganizers(data || []);
    } catch (err) {
      console.error("Organizatörler yüklenirken hata:", err.message);
    } finally {
      setLoadingOrganizers(false);
    }
  };

  const loadApprovedOrganizers = async () => {
    if (!profile?.university_id) return;
    try {
      setLoadingApprovedOrganizers(true);
      const { data, error } = await supabase
        .from("profiles")
        .select("*")
        .eq("role", "organizer")
        .eq("university_id", profile.university_id)
        .eq("is_approved", true)
        .eq("is_suspended", false)
        .order("full_name", { ascending: true });

      if (error) throw error;
      setApprovedOrganizers(data || []);
    } catch (err) {
      console.error("Onaylı topluluklar yüklenirken hata:", err.message);
    } finally {
      setLoadingApprovedOrganizers(false);
    }
  };

  const loadSuspendedOrganizers = async () => {
    if (!profile?.university_id) return;
    try {
      setLoadingSuspendedOrganizers(true);
      const { data, error } = await supabase
        .from("profiles")
        .select("*")
        .eq("role", "organizer")
        .eq("university_id", profile.university_id)
        .eq("is_suspended", true)
        .order("full_name", { ascending: true });

      if (error) throw error;
      setSuspendedOrganizers(data || []);
    } catch (err) {
      console.error("Askıdaki topluluklar yüklenirken hata:", err.message);
    } finally {
      setLoadingSuspendedOrganizers(false);
    }
  };

  useEffect(() => {
    if (profile) {
      loadOrganizers();
      loadApprovedOrganizers();
      loadSuspendedOrganizers();
    }
  }, [profile, activeTab]);

  const handleApproveOrganizer = async (orgId) => {
    try {
      setSubmitting(true);
      const { error } = await supabase
        .from("profiles")
        .update({ is_approved: true, rejection_reason: null, is_suspended: false })
        .eq("id", orgId);

      if (error) throw error;

      // State güncelle
      const approvedOrg = organizers.find(org => org.id === orgId) || suspendedOrganizers.find(org => org.id === orgId);
      setOrganizers(prev => prev.filter(org => org.id !== orgId));
      setSuspendedOrganizers(prev => prev.filter(org => org.id !== orgId));
      if (approvedOrg) {
        setApprovedOrganizers(prev => [...prev, { ...approvedOrg, is_approved: true, rejection_reason: null, is_suspended: false }].sort((a, b) => a.full_name.localeCompare(b.full_name)));
      } else {
        loadApprovedOrganizers();
      }
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
          is_suspended: selectedOrg.is_approved ? true : false,
          rejection_reason: reason 
        })
        .eq("id", orgId);

      if (error) throw error;

      // State güncelle
      if (selectedOrg.is_approved) {
        // Aktiften askıya alındı
        const suspendedOrg = approvedOrganizers.find(org => org.id === orgId);
        setApprovedOrganizers(prev => prev.filter(org => org.id !== orgId));
        if (suspendedOrg) {
          setSuspendedOrganizers(prev => [...prev, { ...suspendedOrg, is_approved: false, is_suspended: true, rejection_reason: reason }].sort((a, b) => a.full_name.localeCompare(b.full_name)));
        } else {
          loadSuspendedOrganizers();
        }
      } else {
        // Zaten onaysızdı, reddedildi
        setOrganizers(prev => prev.map(org => org.id === orgId ? { ...org, is_approved: false, rejection_reason: reason } : org));
      }

      setIsOrgReviewModalOpen(false);
      setOrgRejectionInput("");
      setSelectedOrg(null);
    } catch (err) {
      console.error("Organizatör reddedilirken/askıya alınırken hata:", err.message);
      alert("İşlem gerçekleştirilirken hata oluştu: " + err.message);
    } finally {
      setSubmitting(false);
    }
  };

  const handleReactivateOrganizer = async () => {
    if (!orgToReactivate) return;
    try {
      setSubmitting(true);
      const { error } = await supabase
        .from("profiles")
        .update({ 
          is_approved: true, 
          is_suspended: false,
          rejection_reason: null 
        })
        .eq("id", orgToReactivate.id);

      if (error) throw error;

      // State güncelle
      const reactivatedOrg = suspendedOrganizers.find(org => org.id === orgToReactivate.id);
      setSuspendedOrganizers(prev => prev.filter(org => org.id !== orgToReactivate.id));
      if (reactivatedOrg) {
        setApprovedOrganizers(prev => [...prev, { ...reactivatedOrg, is_approved: true, is_suspended: false, rejection_reason: null }].sort((a, b) => a.full_name.localeCompare(b.full_name)));
      } else {
        loadApprovedOrganizers();
      }
      setIsReactivateConfirmModalOpen(false);
      setOrgToReactivate(null);
    } catch (err) {
      console.error("Topluluk aktifleştirilirken hata:", err.message);
      alert("Topluluk aktifleştirilirken hata oluştu: " + err.message);
    } finally {
      setSubmitting(false);
    }
  };

  const handleDeleteOrganizer = async () => {
    if (!orgToDelete) return;
    try {
      setSubmitting(true);
      
      // Önce bu organizatöre ait etkinlikleri silelim (foreign key kısıtını aşmak için)
      const { error: eventsError } = await supabase
        .from("events")
        .delete()
        .eq("organizer_id", orgToDelete.id);

      if (eventsError) throw eventsError;

      // Sonra profili silelim
      const { error } = await supabase
        .from("profiles")
        .delete()
        .eq("id", orgToDelete.id);

      if (error) throw error;

      // State güncelle
      setSuspendedOrganizers(prev => prev.filter(org => org.id !== orgToDelete.id));
      setIsDeleteConfirmModalOpen(false);
      setOrgToDelete(null);
    } catch (err) {
      console.error("Topluluk sistemden silinirken hata:", err.message);
      alert("Topluluk silinirken hata oluştu: " + err.message);
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
          <button
            onClick={() => setActiveTab("approved_organizers")}
            className={`py-3 px-6 font-bold text-sm border-b-2 transition-all cursor-pointer ${
              activeTab === "approved_organizers"
                ? "border-slate-900 text-slate-900 font-extrabold"
                : "border-transparent text-gray-500 hover:text-gray-700"
            }`}
          >
            Bünyemizdeki Topluluklar ({approvedOrganizers.length})
          </button>
        </div>

        {activeTab === "events" && (
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
                                {req.date 
                                  ? (() => {
                                      const d = new Date(req.date);
                                      const datePart = d.toLocaleString('tr-TR', { day: 'numeric', month: 'long', year: 'numeric' });
                                      const timePart = d.toLocaleString('tr-TR', { hour: '2-digit', minute: '2-digit' });
                                      return req.end_time ? `${datePart} ${timePart} – ${req.end_time}` : `${datePart} ${timePart}`;
                                    })()
                                  : "-"}
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
        )}

        {activeTab === "organizers" && (
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
                              <span className="text-[10px] text-red-655 font-medium truncate w-full mt-1">Neden: {org.rejection_reason}</span>
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

        {activeTab === "approved_organizers" && (
          <div className="flex flex-col gap-8 animate-in fade-in duration-200">
            {/* Bünyemizdeki Aktif Topluluklar Tablosu */}
            <div className="bg-white rounded-2xl shadow-sm border border-gray-200 overflow-hidden">
              <div className="px-6 py-2.5 font-bold text-white bg-slate-900 text-center uppercase tracking-wider text-sm">
                Bünyemizde Bulunan Aktif Topluluklar
              </div>

              {loadingApprovedOrganizers ? (
                <div className="flex items-center justify-center py-16 gap-3 text-gray-400">
                  <Loader2 className="h-8 w-8 animate-spin" />
                  <span className="text-sm font-medium">Topluluklar yükleniyor...</span>
                </div>
              ) : approvedOrganizers.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-16 text-gray-400">
                  <Users className="h-10 w-10 mb-3 text-gray-300" />
                  <p className="text-sm font-medium">Bünyenizde henüz onaylanmış aktif bir topluluk bulunmuyor.</p>
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
                      {approvedOrganizers.map((org) => (
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
                            <span className="px-2 py-0.5 rounded-md text-xs font-bold bg-green-100 text-green-700">
                              Aktif / Onaylı
                            </span>
                          </td>
                          <td className="px-6 py-4 text-right">
                            <button
                              disabled={submitting}
                              onClick={() => { setSelectedOrg(org); setIsOrgReviewModalOpen(true); setOrgRejectionInput(""); }}
                              className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-red-600 text-white text-xs font-bold rounded-lg hover:bg-red-700 transition cursor-pointer disabled:opacity-50"
                            >
                              <X className="h-3.5 w-3.5" /> Askıya Al
                            </button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>

            {/* Askıya Alınan Topluluklar Tablosu */}
            <div className="bg-white rounded-2xl shadow-sm border border-gray-200 overflow-hidden">
              <div className="px-6 py-2.5 font-bold text-white bg-slate-900 text-center uppercase tracking-wider text-sm">
                Askıya Alınan Topluluklar
              </div>

              {loadingSuspendedOrganizers ? (
                <div className="flex items-center justify-center py-16 gap-3 text-gray-400">
                  <Loader2 className="h-8 w-8 animate-spin" />
                  <span className="text-sm font-medium">Yükleniyor...</span>
                </div>
              ) : suspendedOrganizers.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-16 text-gray-400">
                  <Users className="h-10 w-10 mb-3 text-gray-300" />
                  <p className="text-sm font-medium">Şu anda askıya alınmış herhangi bir topluluk bulunmamaktadır.</p>
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full text-left text-sm text-gray-600">
                    <thead className="bg-gray-50 text-gray-900 font-bold border-b border-gray-200">
                      <tr>
                        <th className="px-6 py-4">Topluluk Adı</th>
                        <th className="px-6 py-4">E-posta</th>
                        <th className="px-6 py-4">Askıya Alınma Gerekçesi</th>
                        <th className="px-6 py-4">Durum</th>
                        <th className="px-6 py-4 text-right">İşlemler</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-100">
                      {suspendedOrganizers.map((org) => (
                        <tr key={org.id} className="hover:bg-gray-50 transition-colors">
                          <td className="px-6 py-4 font-bold text-gray-900 flex items-center gap-3">
                            <div className="h-8 w-8 rounded-full bg-slate-100 flex items-center justify-center shrink-0 border border-gray-200 overflow-hidden opacity-70">
                              {org.logo_url ? (
                                <img src={org.logo_url} alt="" className="h-full w-full object-cover grayscale" />
                              ) : (
                                <Users className="h-4 w-4 text-slate-400" />
                              )}
                            </div>
                            <span className="text-gray-500 line-through">{org.full_name}</span>
                          </td>
                          <td className="px-6 py-4">{org.email}</td>
                          <td 
                            onClick={() => {
                              if (org.rejection_reason) {
                                setReasonModalContent(org.rejection_reason);
                                setIsReasonModalOpen(true);
                              }
                            }}
                            className={`px-6 py-4 max-w-xs truncate font-medium text-slate-550 ${org.rejection_reason ? "cursor-pointer hover:text-slate-900 hover:underline" : ""}`}
                            title={org.rejection_reason ? "Tam ekran gör" : "Gerekçe belirtilmemiş"}
                          >
                            {org.rejection_reason || "Gerekçe belirtilmemiş"}
                          </td>
                          <td className="px-6 py-4">
                            <span className="px-2 py-0.5 rounded-md text-xs font-bold bg-amber-100 text-amber-700">
                              Askıda
                            </span>
                          </td>
                          <td className="px-6 py-4 text-right">
                            <div className="flex items-center justify-end gap-2">
                              <button
                                disabled={submitting}
                                onClick={() => {
                                  setOrgToReactivate(org);
                                  setIsReactivateConfirmModalOpen(true);
                                }}
                                className="inline-flex items-center justify-center p-2 bg-green-50 hover:bg-green-100 text-green-650 rounded-lg transition-colors cursor-pointer disabled:opacity-50"
                                title="Topluluğu Aktifleştir"
                              >
                                <Play className="h-4 w-4 fill-green-600 text-green-600" />
                              </button>
                              <button
                                disabled={submitting}
                                onClick={() => { setOrgToDelete(org); setIsDeleteConfirmModalOpen(true); }}
                                className="inline-flex items-center justify-center p-2 bg-red-50 hover:bg-red-100 text-red-650 rounded-lg transition-colors cursor-pointer disabled:opacity-50"
                                title="Sistemden Sil"
                              >
                                <Trash2 className="h-4 w-4" />
                              </button>
                            </div>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          </div>
        )}

      {/* SİSTEMDEN SİL EMİN MİSİNİZ ONAY MODALİ */}
      {isDeleteConfirmModalOpen && orgToDelete && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-sm p-4 animate-in fade-in duration-200">
          <div className="bg-white rounded-3xl shadow-2xl w-full max-w-md overflow-hidden flex flex-col border border-slate-100 transform transition-all duration-300 scale-95 md:scale-100">
            
            {/* Modal Header */}
            <div className="px-6 py-5 border-b border-slate-100 flex items-center justify-between bg-white shrink-0">
              <div className="flex items-center gap-3">
                <div className="h-10 w-10 rounded-xl bg-rose-50 border border-rose-100 flex items-center justify-center text-rose-500 shadow-sm shrink-0">
                  <AlertTriangle className="h-5 w-5 animate-pulse" />
                </div>
                <div>
                  <h2 className="text-base font-extrabold text-slate-950 leading-tight">
                    Topluluğu Sistemden Sil
                  </h2>
                  <p className="text-[10px] text-rose-600 font-bold uppercase tracking-wider mt-0.5">Kalıcı Değişiklik İşlemi</p>
                </div>
              </div>
              <button 
                onClick={() => { setIsDeleteConfirmModalOpen(false); setOrgToDelete(null); }} 
                className="p-1.5 text-slate-400 hover:bg-slate-100 hover:text-slate-950 rounded-xl transition-all cursor-pointer"
              >
                <X className="h-5 w-5" />
              </button>
            </div>
            
            {/* Modal Body */}
            <div className="p-6 flex flex-col gap-5">
              <div className="text-sm text-slate-650 leading-relaxed font-medium">
                <p>
                  <strong className="text-slate-900 font-bold">{orgToDelete.full_name}</strong> topluluğunu sistemden tamamen silmek istediğinize emin misiniz?
                </p>
                <p className="mt-3 text-rose-600 bg-rose-50/50 border border-rose-100/50 p-3 rounded-xl text-xs font-semibold">
                  Bu işlem geri alınamaz! Topluluğa ait tüm profil bilgileri ve bu topluluğun oluşturduğu bütün etkinlikler veri tabanından kalıcı olarak silinecektir.
                </p>
              </div>

              {/* Action Buttons */}
              <div className="flex gap-3 mt-1">
                <button 
                  type="button" 
                  onClick={() => { setIsDeleteConfirmModalOpen(false); setOrgToDelete(null); }}
                  className="flex-1 py-3 bg-slate-100 text-slate-700 font-extrabold rounded-xl text-xs hover:bg-slate-200 transition cursor-pointer"
                >
                  İptal Et
                </button>
                <button 
                  type="button" 
                  disabled={submitting}
                  onClick={handleDeleteOrganizer}
                  className="flex-1 py-3 bg-rose-600 text-white font-extrabold rounded-xl text-xs hover:bg-rose-700 transition cursor-pointer flex items-center justify-center gap-1.5"
                >
                  {submitting ? (
                    <>
                      <Loader2 className="h-4 w-4 animate-spin" />
                      <span>Siliniyor...</span>
                    </>
                  ) : (
                    <span>Evet, Eminim Sil</span>
                  )}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ASKIYA ALINMA GEREKÇESİ DETAY MODALİ */}
      {isReasonModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-sm p-4 animate-in fade-in duration-200">
          <div className="bg-white rounded-3xl shadow-2xl w-full max-w-xl overflow-hidden flex flex-col border border-slate-100 transform transition-all duration-300 scale-95 md:scale-100">
            
            {/* Modal Header */}
            <div className="px-6 py-5 border-b border-slate-100 flex items-center justify-between bg-white shrink-0">
              <div className="flex items-center gap-3">
                <div className="h-10 w-10 rounded-xl bg-amber-50 border border-amber-100 flex items-center justify-center text-amber-600 shadow-sm shrink-0">
                  <AlertTriangle className="h-5 w-5" />
                </div>
                <div>
                  <h2 className="text-base font-extrabold text-slate-950 leading-tight">
                    Askıya Alınma Gerekçesi Detayı
                  </h2>
                  <p className="text-[10px] text-amber-600 font-bold uppercase tracking-wider mt-0.5">SKS Karar Bilgilendirmesi</p>
                </div>
              </div>
              <button 
                onClick={() => { setIsReasonModalOpen(false); setReasonModalContent(""); }} 
                className="p-1.5 text-slate-400 hover:bg-slate-100 hover:text-slate-950 rounded-xl transition-all cursor-pointer"
              >
                <X className="h-5 w-5" />
              </button>
            </div>
            
            {/* Modal Body */}
            <div className="p-6 flex flex-col gap-4">
              <div className="bg-slate-50 border border-slate-100 rounded-2xl p-5 max-h-[60vh] overflow-y-auto shadow-inner">
                <p className="text-sm text-slate-800 font-semibold leading-relaxed whitespace-pre-wrap">
                  {reasonModalContent}
                </p>
              </div>

              {/* Action Buttons */}
              <div className="flex justify-end mt-2">
                <button 
                  type="button" 
                  onClick={() => { setIsReasonModalOpen(false); setReasonModalContent(""); }}
                  className="px-6 py-3 bg-slate-950 text-white font-extrabold rounded-xl text-xs hover:bg-slate-900 transition cursor-pointer shadow-md"
                >
                  Kapat
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* TOPLULUĞU TEKRAR AKTİFLEŞTİRME ONAY MODALİ */}
      {isReactivateConfirmModalOpen && orgToReactivate && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-sm p-4 animate-in fade-in duration-200">
          <div className="bg-white rounded-3xl shadow-2xl w-full max-w-md overflow-hidden flex flex-col border border-slate-100 transform transition-all duration-300 scale-95 md:scale-100">
            
            {/* Modal Header */}
            <div className="px-6 py-5 border-b border-slate-100 flex items-center justify-between bg-white shrink-0">
              <div className="flex items-center gap-3">
                <div className="h-10 w-10 rounded-xl bg-green-50 border border-green-100 flex items-center justify-center text-green-600 shadow-sm shrink-0">
                  <Check className="h-5 w-5" />
                </div>
                <div>
                  <h2 className="text-base font-extrabold text-slate-950 leading-tight">
                    Topluluğu Aktifleştir
                  </h2>
                  <p className="text-[10px] text-green-600 font-bold uppercase tracking-wider mt-0.5">SKS Onay Sistemi</p>
                </div>
              </div>
              <button 
                onClick={() => { setIsReactivateConfirmModalOpen(false); setOrgToReactivate(null); }} 
                className="p-1.5 text-slate-400 hover:bg-slate-100 hover:text-slate-955 rounded-xl transition-all cursor-pointer"
              >
                <X className="h-5 w-5" />
              </button>
            </div>
            
            {/* Modal Body */}
            <div className="p-6 flex flex-col gap-5">
              <div className="text-sm text-slate-650 leading-relaxed font-medium">
                <p>
                  <strong className="text-slate-900 font-bold">{orgToReactivate.full_name}</strong> topluluğunu tekrar aktifleştirmek istediğinize emin misiniz?
                </p>
                <p className="mt-2 text-slate-500 text-xs">
                  Topluluk aktifleştirildiğinde, sistemdeki diğer kullanıcılar topluluk etkinliklerini görebilecek ve topluluk yöneticileri panellerine erişebilecektir.
                </p>
              </div>

              {/* Action Buttons */}
              <div className="flex gap-3 mt-1">
                <button 
                  type="button" 
                  onClick={() => { setIsReactivateConfirmModalOpen(false); setOrgToReactivate(null); }}
                  className="flex-1 py-3 bg-slate-100 text-slate-700 font-extrabold rounded-xl text-xs hover:bg-slate-200 transition cursor-pointer"
                >
                  Vazgeç
                </button>
                <button 
                  type="button" 
                  disabled={submitting}
                  onClick={handleReactivateOrganizer}
                  className="flex-1 py-3 bg-green-600 text-white font-extrabold rounded-xl text-xs hover:bg-green-700 transition cursor-pointer flex items-center justify-center gap-1.5"
                >
                  {submitting ? (
                    <>
                      <Loader2 className="h-4 w-4 animate-spin" />
                      <span>Aktifleştiriliyor...</span>
                    </>
                  ) : (
                    <span>Evet, Aktifleştir</span>
                  )}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* DETAYLI İNCELEME VE ONAY POP-UP MODALI */}
      {isReviewModalOpen && selectedEvent && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-sm p-4">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-5xl overflow-y-auto md:overflow-hidden flex flex-col h-auto md:h-[85vh] max-h-[95vh] md:max-h-none">
            
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

            {/* Modal İçerik */}
            <div className="p-6 flex-1 overflow-y-auto md:overflow-hidden min-h-0">
              <div className="grid grid-cols-1 md:grid-cols-12 gap-8 h-auto md:h-full min-h-0">
                
                {/* Sol Taraf: Bilgiler ve Butonlar (7 Kolon) */}
                <div className="md:col-span-7 flex flex-col h-auto md:h-full min-h-0">
                  
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
                    <div className="flex items-center gap-2"><Calendar className="h-4 w-4 text-gray-400 shrink-0" /> <span className="font-medium text-gray-500 w-24">Tarih:</span> <span className="font-semibold">{selectedEvent.date ? (() => { const d = new Date(selectedEvent.date); const datePart = d.toLocaleString('tr-TR', { day: 'numeric', month: 'long', year: 'numeric' }); const timePart = d.toLocaleString('tr-TR', { hour: '2-digit', minute: '2-digit' }); return selectedEvent.end_time ? `${datePart} ${timePart} – ${selectedEvent.end_time}` : `${datePart} ${timePart}`; })() : "-"}</span></div>
                    <div className="flex items-center gap-2"><MapPin className="h-4 w-4 text-gray-400 shrink-0" /> <span className="font-medium text-gray-500 w-24">Konum:</span> <span className="font-semibold">{selectedEvent.location}</span></div>
                    <div className="flex items-center gap-2"><Users className="h-4 w-4 text-gray-400 shrink-0" /> <span className="font-medium text-gray-500 w-24">Kapasite:</span> <span className="font-semibold">{selectedEvent.capacity || "Sınırsız"}</span></div>
                  </div>

                  {/* Açıklama (Sadece burası kaydırılabilir) */}
                  <div className="flex-1 flex flex-col overflow-y-auto md:overflow-hidden min-h-[120px] md:min-h-0 mb-5">
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
                <div className="md:col-span-5 h-64 md:h-full rounded-2xl overflow-hidden relative bg-slate-950 shadow-inner shrink-0">
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
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-sm p-4 animate-in fade-in duration-200">
          <div className="bg-white rounded-3xl shadow-2xl w-full max-w-md overflow-hidden flex flex-col border border-slate-100 transform transition-all duration-300 scale-95 md:scale-100">
            
            {/* Modal Header */}
            <div className="px-6 py-5 border-b border-slate-100 flex items-center justify-between bg-white shrink-0">
              <div className="flex items-center gap-3">
                <div className="h-10 w-10 rounded-xl bg-red-50 border border-red-100 flex items-center justify-center text-red-500 shadow-sm shrink-0">
                  <AlertTriangle className="h-5 w-5" />
                </div>
                <div>
                  <h2 className="text-base font-extrabold text-slate-950 leading-tight">
                    {selectedOrg.is_approved ? "Topluluğu Askıya Al" : "Topluluk Başvurusunu Reddet"}
                  </h2>
                  <p className="text-[10px] text-slate-400 font-bold uppercase tracking-wider mt-0.5">SKS Güvenlik ve Onay Sistemi</p>
                </div>
              </div>
              <button 
                onClick={() => setIsOrgReviewModalOpen(false)} 
                className="p-1.5 text-slate-400 hover:bg-slate-100 hover:text-slate-900 rounded-xl transition-all cursor-pointer"
              >
                <X className="h-5 w-5" />
              </button>
            </div>
            
            {/* Modal Body */}
            <div className="p-6 flex flex-col gap-5">
              
              {/* Community Detail Card */}
              <div className="bg-slate-50/80 rounded-2xl p-4 border border-slate-100 flex items-center gap-3 shadow-inner">
                <div className="h-12 w-12 rounded-full bg-white flex items-center justify-center border border-slate-200 overflow-hidden shadow-sm shrink-0">
                  {selectedOrg.logo_url ? (
                    <img src={selectedOrg.logo_url} alt="" className="h-full w-full object-cover" />
                  ) : (
                    <Users className="h-5 w-5 text-slate-400" />
                  )}
                </div>
                <div className="min-w-0 flex-1">
                  <h3 className="font-extrabold text-sm text-slate-900 truncate leading-snug">{selectedOrg.full_name}</h3>
                  <p className="text-xs text-slate-500 truncate mt-0.5 font-medium">{selectedOrg.email}</p>
                </div>
              </div>

              {/* Predefined Reasons Section */}
              <div className="flex flex-col gap-2">
                <span className="text-[10px] font-extrabold text-slate-400 uppercase tracking-wider">Hızlı Şablon Gerekçeleri</span>
                <div className="flex flex-col gap-1.5">
                  {[
                    "Topluluk tüzüğü veya evrakları eksik / güncel değil.",
                    "Topluluk ismi veya faaliyetleri üniversite kurallarına aykırı bulundu.",
                    "Uzun süredir aktif etkinlik düzenlenmediği tespit edildi."
                  ].map((reasonText, idx) => {
                    const isSelected = orgRejectionInput === reasonText;
                    return (
                      <button
                        key={idx}
                        type="button"
                        onClick={() => setOrgRejectionInput(reasonText)}
                        className={`text-left text-xs px-4 py-3 rounded-xl border transition-all cursor-pointer font-bold leading-relaxed shadow-sm ${
                          isSelected 
                            ? "bg-slate-950 text-white border-slate-950" 
                            : "bg-white hover:bg-slate-50 text-slate-700 border-slate-200 hover:border-slate-300"
                        }`}
                      >
                        {reasonText}
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Textarea Section */}
              <div className="flex flex-col gap-2">
                <label className="text-[10px] font-extrabold text-slate-400 uppercase tracking-wider">
                  {selectedOrg.is_approved ? "Askıya Alma Gerekçesi" : "Red Gerekçesi"} (Zorunlu)
                </label>
                <textarea
                  required
                  rows="3"
                  value={orgRejectionInput}
                  onChange={(e) => setOrgRejectionInput(e.target.value)}
                  placeholder={selectedOrg.is_approved ? "Lütfen topluluğa iletilecek askıya alma sebebini detaylandırın..." : "Lütfen topluluğa iletilecek ret sebebini detaylandırın..."}
                  className="w-full p-3.5 border border-slate-250 rounded-2xl text-sm focus:outline-none focus:ring-2 focus:ring-red-500 focus:border-transparent bg-white resize-none shadow-inner placeholder:text-gray-300 font-medium leading-relaxed"
                ></textarea>
              </div>

              {/* Action Button */}
              <button 
                type="button" 
                disabled={submitting || !orgRejectionInput.trim()}
                onClick={() => handleRejectOrganizer(selectedOrg.id, orgRejectionInput)}
                className={`w-full py-4 text-white font-black rounded-2xl text-sm transition-all active:scale-[0.98] cursor-pointer text-center flex items-center justify-center gap-2 disabled:opacity-40 disabled:pointer-events-none bg-gradient-to-r shadow-lg ${
                  selectedOrg.is_approved 
                    ? "from-rose-500 to-red-600 hover:from-rose-600 hover:to-red-700 shadow-rose-200" 
                    : "from-amber-500 to-orange-600 hover:from-amber-600 hover:to-orange-700 shadow-amber-200"
                }`}
              >
                {submitting ? (
                  <>
                    <Loader2 className="h-5 w-5 animate-spin" />
                    <span>İşlem Yapılıyor...</span>
                  </>
                ) : (
                  <>
                    {selectedOrg.is_approved ? <X className="h-5 w-5" /> : <Check className="h-5 w-5" />}
                    <span>{selectedOrg.is_approved ? "Topluluğu Askıya Al" : "Başvuruyu Reddet"}</span>
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}

    </main>
    </div>
  );
}