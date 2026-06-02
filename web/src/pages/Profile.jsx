import { useState, useEffect, useRef } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import { supabase } from "../lib/supabaseClient";
import Navbar from "../components/Navbar";
import { 
  User, 
  Mail, 
  School, 
  Shield, 
  Bookmark, 
  Trash2, 
  Calendar, 
  MapPin, 
  ArrowRight,
  Loader2,
  CheckCircle,
  Clock,
  XCircle,
  UploadCloud,
  Pencil
} from "lucide-react";

export default function Profile() {
  const navigate = useNavigate();
  const { user, profile, signOut, fetchProfile } = useAuth();

  const [uniName, setUniName] = useState("");
  const [uniLogo, setUniLogo] = useState("");
  const [loadingProfile, setLoadingProfile] = useState(true);

  // Saved Events State
  const [savedEvents, setSavedEvents] = useState([]);
  const [loadingEvents, setLoadingEvents] = useState(true);

  // Joined Events State
  const [joinedEvents, setJoinedEvents] = useState([]);
  const [loadingJoinedEvents, setLoadingJoinedEvents] = useState(true);

  // Active Tab State ('joined' or 'saved')
  const [activeTab, setActiveTab] = useState("joined");

  const [logoUploading, setLogoUploading] = useState(false);
  const [localLogoPreview, setLocalLogoPreview] = useState(null);
  const [errorModal, setErrorModal] = useState({ isOpen: false, message: "" });
  const [deleteConfirmOpen, setDeleteConfirmOpen] = useState(false);
  const [editMenuOpen, setEditMenuOpen] = useState(false);
  const fileInputRef = useRef(null);
  const editMenuRef = useRef(null);

  const handleLogoUpload = async (e) => {
    const file = e.target.files[0];
    if (!file || !user) return;
    
    if (!file.type.startsWith('image/')) {
      setErrorModal({ isOpen: true, message: 'Lütfen geçerli bir görsel dosyası seçin.' });
      e.target.value = null;
      return;
    }

    try {
      setLogoUploading(true);
      const isStudent = profile?.role === "student";
      const folder = isStudent ? "avatars" : "logos";
      const prefix = isStudent ? "avatar" : "logo";
      const fileExt = file.name.split('.').pop() || 'jpg';
      const fileName = `${prefix}_${user.id}_${Date.now()}.${fileExt}`;
      const filePath = `${folder}/${fileName}`;

      const { error: uploadError } = await supabase.storage
        .from('public-assets')
        .upload(filePath, file, { contentType: file.type });

      if (uploadError) throw uploadError;

      const { data: publicUrlData } = supabase.storage
        .from('public-assets')
        .getPublicUrl(filePath);

      const publicUrl = publicUrlData.publicUrl;

      const { error: updateError } = await supabase
        .from('profiles')
        .update({ logo_url: publicUrl })
        .eq('id', user.id);

      if (updateError) throw updateError;

      setLocalLogoPreview(publicUrl);
      if (fetchProfile) fetchProfile();
    } catch (err) {
      console.error('Fotoğraf yükleme hatası:', err.message);
      setErrorModal({ isOpen: true, message: 'Fotoğraf yüklenirken bir hata oluştu: ' + err.message });
    } finally {
      setLogoUploading(false);
      e.target.value = null;
    }
  };

  const handleLogoDelete = () => {
    if (!user) return;
    const currentUrl = localLogoPreview || profile?.logo_url;
    if (!currentUrl) return;
    setDeleteConfirmOpen(true);
  };

  const executeLogoDelete = async () => {
    const currentUrl = localLogoPreview || profile?.logo_url;
    if (!currentUrl) return;

    try {
      setLogoUploading(true);

      // 1. Veritabanındaki logo_url alanını null olarak güncelle
      const { error: updateError } = await supabase
        .from('profiles')
        .update({ logo_url: null })
        .eq('id', user.id);

      if (updateError) throw updateError;

      // 2. Storage dosyasını silmeye çalış
      try {
        if (currentUrl.includes('/public-assets/')) {
          const filePath = currentUrl.split('/public-assets/').pop();
          if (filePath) {
            await supabase.storage
              .from('public-assets')
              .remove([filePath]);
          }
        }
      } catch (storageErr) {
        console.warn("Storage silme hatası (yoksayıldı):", storageErr.message);
      }

      setLocalLogoPreview(null);
      if (fetchProfile) fetchProfile();
    } catch (err) {
      console.error('Fotoğraf silme hatası:', err.message);
      setErrorModal({ isOpen: true, message: 'Fotoğraf silinirken bir hata oluştu: ' + err.message });
    } finally {
      setLogoUploading(false);
    }
  };

  // Sayfa açıldığında giriş kontrolü
  useEffect(() => {
    if (!user) {
      navigate("/login");
    }
  }, [user, navigate]);

  // Kalem menüsü dışına tıklanınca menüyü kapat
  useEffect(() => {
    const handleClickOutside = (e) => {
      if (editMenuRef.current && !editMenuRef.current.contains(e.target)) {
        setEditMenuOpen(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  // Profil hazır olduğunda Üniversite bilgisini çek
  useEffect(() => {
    async function loadUniversity() {
      if (!profile?.university_id) {
        setLoadingProfile(false);
        return;
      }
      try {
        const { data, error } = await supabase
          .from("universities")
          .select("name, logo_url")
          .eq("id", profile.university_id)
          .single();

        if (error) throw error;
        setUniName(data?.name || "Belirtilmemiş");
        setUniLogo(data?.logo_url || "");
      } catch (err) {
        console.error("Üniversite bilgisi çekme hatası:", err.message);
      } finally {
        setLoadingProfile(false);
      }
    }
    loadUniversity();
  }, [profile]);

  // Favori Etkinlikleri Çek (Events ve Universities Join)
  const fetchSavedEvents = async () => {
    if (!user) return;
    try {
      const { data, error } = await supabase
        .from("saved_events")
        .select(`
          id,
          event_id,
          events (
            id,
            title,
            description,
            category,
            date,
            location,
            status,
            universities (
              name
            )
          )
        `)
        .eq("student_id", user.id);

      if (error) throw error;

      // Düzgün listelemek için veriyi biçimlendirelim (silinen etkinlikleri filtreleyerek)
      const formatted = (data || [])
        .filter(item => item.events) 
        .map(item => ({
          savedId: item.id,
          id: item.events.id,
          title: item.events.title,
          description: item.events.description,
          category: item.events.category,
          date: item.events.date ? new Date(item.events.date).toLocaleString('tr-TR', { day: 'numeric', month: 'long', year: 'numeric', hour: '2-digit', minute: '2-digit' }) : "",
          location: item.events.location,
          university: item.events.universities?.name || "Belirtilmemiş"
        }));

      setSavedEvents(formatted);
    } catch (err) {
      console.error("Favoriler çekilirken hata oluştu:", err.message);
    } finally {
      setLoadingEvents(false);
    }
  };

  // Katıldığım Etkinlikleri Çek
  const fetchJoinedEvents = async () => {
    if (!user) return;
    try {
      const { data, error } = await supabase
        .from("event_participants")
        .select(`
          id,
          status,
          event_id,
          events (
            id,
            title,
            description,
            category,
            date,
            location,
            status,
            universities (
              name
            )
          )
        `)
        .eq("student_id", user.id);

      if (error) throw error;

      const formatted = (data || [])
        .filter(item => item.events) 
        .map(item => ({
          participantId: item.id,
          status: item.status,
          id: item.events.id,
          title: item.events.title,
          description: item.events.description,
          category: item.events.category,
          date: item.events.date ? new Date(item.events.date).toLocaleString('tr-TR', { day: 'numeric', month: 'long', year: 'numeric', hour: '2-digit', minute: '2-digit' }) : "",
          location: item.events.location,
          university: item.events.universities?.name || "Belirtilmemiş"
        }));

      setJoinedEvents(formatted);
    } catch (err) {
      console.error("Katılınan etkinlikler çekilirken hata:", err.message);
    } finally {
      setLoadingJoinedEvents(false);
    }
  };

  useEffect(() => {
    fetchSavedEvents();
    fetchJoinedEvents();
  }, [user]);

  // Favoriden Çıkar
  const handleRemoveSave = async (e, savedId) => {
    e.stopPropagation(); // Kart tıklamasını önle
    try {
      const { error } = await supabase
        .from("saved_events")
        .delete()
        .eq("id", savedId);

      if (error) throw error;
      setSavedEvents(prev => prev.filter(item => item.savedId !== savedId));
    } catch (err) {
      console.error("Favori silme hatası:", err.message);
    }
  };

  // Katılımı İptal Et / Başvuruyu Geri Çek
  const handleCancelParticipation = async (e, participantId) => {
    e.stopPropagation(); // Kart tıklamasını önle
    try {
      const { error } = await supabase
        .from("event_participants")
        .delete()
        .eq("id", participantId);

      if (error) throw error;
      setJoinedEvents(prev => prev.filter(item => item.participantId !== participantId));
    } catch (err) {
      console.error("Katılım iptal etme hatası:", err.message);
    }
  };

  const handleSignOut = async () => {
    try {
      await signOut();
      navigate("/");
    } catch (err) {
      console.error("Çıkış hatası:", err.message);
    }
  };

  // Rollerin Türkçe Karşılıkları
  const getRoleLabel = (role) => {
    switch (role) {
      case "student": return "Öğrenci";
      case "organizer": return "Organizatör";
      case "sks": return "SKS Yetkilisi";
      case "admin": return "Sistem Yöneticisi";
      default: return "Kullanıcı";
    }
  };

  if (!user) return null;

  return (
    <div className="min-h-screen bg-slate-100 pb-12">
      <Navbar />

      <main className="mx-auto max-w-6xl px-4 py-8">
        <div className={`grid grid-cols-1 gap-8 ${profile?.role === "student" ? "lg:grid-cols-3" : "max-w-md mx-auto"}`}>
          
          {/* Sol Kolon: Profil Kartı */}
          <div className={profile?.role === "student" ? "lg:col-span-1" : ""}>
            <div className="rounded-2xl bg-slate-900 p-6 text-white border border-slate-800 shadow-xl flex flex-col items-center">
              
              {/* Profil Resmi/Avatar Dairesi ve Yükleme Alanı */}
              <div className="relative group mb-4" ref={editMenuRef}>
                <div className="flex h-24 w-24 items-center justify-center rounded-full bg-white text-slate-900 text-3xl font-extrabold shadow-md uppercase overflow-hidden relative">
                  {profile?.role === "sks" && uniLogo ? (
                    <img src={uniLogo} alt="Üniversite Logosu" className="h-full w-full object-cover" />
                  ) : localLogoPreview || profile?.logo_url ? (
                    <img src={localLogoPreview || profile.logo_url} alt="Profil Logosu" className="h-full w-full object-cover" />
                  ) : (
                    profile?.full_name 
                      ? profile.full_name.split(" ").filter(Boolean).map(n => n[0]).join("").substring(0, 2)
                      : user.email[0]
                  )}
                  {logoUploading && (
                    <div className="absolute inset-0 bg-white/70 flex items-center justify-center">
                      <Loader2 className="h-6 w-6 animate-spin text-indigo-600" />
                    </div>
                  )}
                </div>
                
                {/* Düzenleme Kalem Butonu */}
                {!logoUploading && profile?.role !== "sks" && (
                  <button
                    type="button"
                    onClick={() => setEditMenuOpen((prev) => !prev)}
                    className="absolute bottom-0 right-0 h-8 w-8 bg-indigo-600 hover:bg-indigo-700 text-white rounded-full flex items-center justify-center shadow-lg cursor-pointer transition-transform hover:scale-110 z-10 border-2 border-slate-900"
                    title={profile?.role === "student" ? "Profil Fotoğrafını Düzenle" : "Topluluk Logosunu Düzenle"}
                  >
                    <Pencil className="h-4 w-4" />
                  </button>
                )}

                {/* Gizli Dosya Seçici Input */}
                <input
                  type="file"
                  ref={fileInputRef}
                  accept="image/*"
                  className="hidden"
                  onChange={handleLogoUpload}
                  disabled={logoUploading}
                />

                {/* Kalemin altına açılan küçük floating menü */}
                {editMenuOpen && (
                  <div className="absolute right-0 top-full mt-2 w-48 rounded-xl bg-slate-800 border border-slate-700 shadow-2xl py-1 z-20 animate-in fade-in slide-in-from-top-2 duration-150">
                    <button
                      type="button"
                      onClick={() => {
                        setEditMenuOpen(false);
                        fileInputRef.current.click();
                      }}
                      className="flex w-full items-center gap-2 px-4 py-2 text-xs font-bold text-slate-200 hover:bg-slate-700 hover:text-white transition cursor-pointer text-left"
                    >
                      <UploadCloud className="h-3.5 w-3.5 text-indigo-400" />
                      Yeni Fotoğraf Yükle
                    </button>
                    
                    {(localLogoPreview || profile?.logo_url) && (
                      <button
                        type="button"
                        onClick={() => {
                          setEditMenuOpen(false);
                          setDeleteConfirmOpen(true);
                        }}
                        className="flex w-full items-center gap-2 px-4 py-2 text-xs font-bold text-red-400 hover:bg-red-500/10 hover:text-red-300 transition cursor-pointer text-left"
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                        Mevcut Fotoğrafı Sil
                      </button>
                    )}
                  </div>
                )}
              </div>

              {/* Kullanıcı Adı ve Rolü */}
              <h2 className="text-xl font-bold text-center mb-1">
                {profile?.full_name || "Yükleniyor..."}
              </h2>
              <span className="rounded-lg bg-blue-600/25 px-2.5 py-0.5 text-xs font-bold text-blue-400 border border-blue-500/20 mb-6">
                {profile ? getRoleLabel(profile.role) : "Öğrenci"}
              </span>

              {/* Bilgi Listesi */}
              <div className="w-full space-y-4 border-t border-slate-800 pt-6 text-sm text-slate-300">
                <div className="flex items-center gap-3">
                  <User className="h-5 w-5 text-slate-500 shrink-0" />
                  <div>
                    <p className="text-xs text-slate-500 font-medium">Ad Soyad</p>
                    <p className="font-semibold text-white">{profile?.full_name || "-"}</p>
                  </div>
                </div>

                <div className="flex items-center gap-3">
                  <Mail className="h-5 w-5 text-slate-500 shrink-0" />
                  <div>
                    <p className="text-xs text-slate-500 font-medium">E-posta</p>
                    <p className="font-semibold text-white break-all">{user.email}</p>
                  </div>
                </div>

                <div className="flex items-center gap-3">
                  <School className="h-5 w-5 text-slate-500 shrink-0" />
                  <div>
                    <p className="text-xs text-slate-500 font-medium">Üniversite</p>
                    <p className="font-semibold text-white">{uniName || "Yükleniyor..."}</p>
                  </div>
                </div>

                <div className="flex items-center gap-3">
                  <Shield className="h-5 w-5 text-slate-500 shrink-0" />
                  <div>
                    <p className="text-xs text-slate-500 font-medium">Hesap Türü</p>
                    <p className="font-semibold text-white">{profile ? getRoleLabel(profile.role) : "-"}</p>
                  </div>
                </div>
              </div>

              {/* Çıkış Yap Butonu */}
              <button 
                onClick={handleSignOut}
                className="mt-8 w-full rounded-xl bg-red-600/10 border border-red-500/20 py-2.5 text-center text-sm font-bold text-red-400 transition hover:bg-red-600 hover:text-white cursor-pointer"
              >
                Çıkış Yap
              </button>

            </div>
          </div>

          {/* Sağ Kolon: Kaydedilen ve Katıldığım Etkinlikler Sekmeli Görünüm (Sadece Öğrenciler İçin) */}
          {profile?.role === "student" && (
            <div className="lg:col-span-2">
              <div className="rounded-2xl bg-white p-6 shadow-sm border border-gray-200 min-h-[400px] flex flex-col">
                
                {/* Sekme Butonları */}
                <div className="mb-6 flex border-b border-gray-150">
                  <div className="flex gap-6">
                    <button
                      onClick={() => setActiveTab("joined")}
                      className={`pb-3 text-base font-bold transition-all relative cursor-pointer ${
                        activeTab === "joined" 
                          ? "text-slate-900 border-b-2 border-slate-900" 
                          : "text-gray-400 hover:text-gray-600"
                      }`}
                    >
                      <span className="flex items-center gap-2">
                        <CheckCircle className={`h-5 w-5 ${activeTab === "joined" ? "text-slate-900" : "text-gray-405"}`} />
                        Katıldığım Etkinlikler
                        <span className={`rounded-full px-2 py-0.5 text-xs font-bold transition-colors ${
                          activeTab === "joined" ? "bg-slate-900 text-white" : "bg-slate-100 text-slate-600"
                        }`}>
                          {joinedEvents.length}
                        </span>
                      </span>
                    </button>
                    
                    <button
                      onClick={() => setActiveTab("saved")}
                      className={`pb-3 text-base font-bold transition-all relative cursor-pointer ${
                        activeTab === "saved" 
                          ? "text-slate-900 border-b-2 border-slate-900" 
                          : "text-gray-400 hover:text-gray-600"
                      }`}
                    >
                      <span className="flex items-center gap-2">
                        <Bookmark className={`h-5 w-5 ${activeTab === "saved" ? "fill-slate-900 text-slate-900" : "text-gray-405"}`} />
                        Kaydettiğim Etkinlikler
                        <span className={`rounded-full px-2 py-0.5 text-xs font-bold transition-colors ${
                          activeTab === "saved" ? "bg-slate-900 text-white" : "bg-slate-100 text-slate-600"
                        }`}>
                          {savedEvents.length}
                        </span>
                      </span>
                    </button>
                  </div>
                </div>

                {/* Sekme İçerikleri */}
                {activeTab === "joined" ? (
                  <div className="flex-1 flex flex-col">
                    {loadingJoinedEvents ? (
                      <div className="flex flex-1 items-center justify-center py-12">
                        <Loader2 className="h-8 w-8 text-slate-900 animate-spin" />
                      </div>
                    ) : joinedEvents.length === 0 ? (
                      <div className="flex flex-1 flex-col items-center justify-center text-center py-12 px-4">
                        <Calendar className="h-12 w-12 text-gray-300 mb-3" />
                        <h4 className="text-base font-bold text-gray-800 mb-1">Henüz Katıldığınız Etkinlik Yok</h4>
                        <p className="text-sm text-gray-500 max-w-sm mb-6">
                          Kampüsünüzdeki etkinlikleri inceleyip dilediğinize katılım talebi gönderebilirsiniz.
                        </p>
                        <button 
                          onClick={() => navigate("/home")}
                          className="flex items-center gap-1.5 rounded-xl bg-slate-900 px-5 py-2.5 text-sm font-bold text-white transition hover:bg-slate-800 cursor-pointer shadow-md shadow-slate-900/10"
                        >
                          Etkinlikleri Keşfet
                          <ArrowRight className="h-4 w-4" />
                        </button>
                      </div>
                    ) : (
                      <div className="space-y-4">
                        {joinedEvents.map((item) => (
                          <div 
                            key={item.participantId}
                            onClick={() => navigate(`/event/${item.id}`)}
                            className="group relative flex flex-col sm:flex-row justify-between items-start sm:items-center rounded-xl border border-gray-100 bg-white p-4 gap-4 shadow-sm transition hover:shadow-md hover:border-gray-200 cursor-pointer"
                          >
                            <div className="flex-1 min-w-0">
                              <div className="flex flex-wrap items-center gap-2 mb-2">
                                <span className="inline-block rounded-md bg-slate-100 px-2 py-0.5 text-[10px] font-bold text-slate-800 uppercase tracking-wider">
                                  {item.category}
                                </span>
                                {item.status === "approved" ? (
                                  <span className="inline-flex items-center gap-1 rounded-md bg-green-50 border border-green-200 px-2 py-0.5 text-[10px] font-bold text-green-700">
                                    <CheckCircle className="h-3 w-3" /> Kabul Edildi
                                  </span>
                                ) : item.status === "pending" ? (
                                  <span className="inline-flex items-center gap-1 rounded-md bg-amber-50 border border-amber-200 px-2 py-0.5 text-[10px] font-bold text-amber-700">
                                    <Clock className="h-3 w-3" /> Onay Bekliyor
                                  </span>
                                ) : (
                                  <span className="inline-flex items-center gap-1 rounded-md bg-red-50 border border-red-200 px-2 py-0.5 text-[10px] font-bold text-red-700">
                                    <XCircle className="h-3 w-3" /> Reddedildi
                                  </span>
                                )}
                              </div>
                              <h4 className="text-base font-bold text-gray-900 truncate group-hover:text-blue-600 transition">
                                {item.title}
                              </h4>
                              
                              <div className="mt-2 flex flex-wrap gap-x-4 gap-y-1 text-xs text-gray-500 font-medium">
                                <span className="flex items-center gap-1">
                                  <School className="h-3.5 w-3.5 text-blue-500" />
                                  {item.university}
                                </span>
                                <span className="flex items-center gap-1">
                                  <Calendar className="h-3.5 w-3.5" />
                                  {item.date}
                                </span>
                                <span className="flex items-center gap-1">
                                  <MapPin className="h-3.5 w-3.5 text-red-500" />
                                  {item.location}
                                </span>
                              </div>
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                ) : (
                  <div className="flex-1 flex flex-col">
                    {loadingEvents ? (
                      <div className="flex flex-1 items-center justify-center py-12">
                        <Loader2 className="h-8 w-8 text-slate-900 animate-spin" />
                      </div>
                    ) : savedEvents.length === 0 ? (
                      <div className="flex flex-1 flex-col items-center justify-center text-center py-12 px-4">
                        <Bookmark className="h-12 w-12 text-gray-300 mb-3" />
                        <h4 className="text-base font-bold text-gray-800 mb-1">Henüz Kaydedilen Etkinlik Yok</h4>
                        <p className="text-sm text-gray-500 max-w-sm mb-6">
                          Kampüsünüzdeki etkinlikleri inceleyip dilediklerinizi favorilerinize ekleyebilirsiniz.
                        </p>
                        <button 
                          onClick={() => navigate("/home")}
                          className="flex items-center gap-1.5 rounded-xl bg-slate-900 px-5 py-2.5 text-sm font-bold text-white transition hover:bg-slate-800 cursor-pointer shadow-md shadow-slate-900/10"
                        >
                          Etkinlikleri Keşfet
                          <ArrowRight className="h-4 w-4" />
                        </button>
                      </div>
                    ) : (
                      <div className="space-y-4">
                        {savedEvents.map((item) => (
                          <div 
                            key={item.savedId}
                            onClick={() => navigate(`/event/${item.id}`)}
                            className="group relative flex flex-col sm:flex-row justify-between items-start sm:items-center rounded-xl border border-gray-100 bg-white p-4 gap-4 shadow-sm transition hover:shadow-md hover:border-gray-200 cursor-pointer"
                          >
                            <div className="flex-1 min-w-0">
                              <span className="inline-block rounded-md bg-slate-100 px-2 py-0.5 text-[10px] font-bold text-slate-800 uppercase tracking-wider mb-2">
                                {item.category}
                              </span>
                              <h4 className="text-base font-bold text-gray-900 truncate group-hover:text-blue-600 transition">
                                {item.title}
                              </h4>
                              
                              <div className="mt-2 flex flex-wrap gap-x-4 gap-y-1 text-xs text-gray-500 font-medium">
                                <span className="flex items-center gap-1">
                                  <School className="h-3.5 w-3.5 text-blue-500" />
                                  {item.university}
                                </span>
                                <span className="flex items-center gap-1">
                                  <Calendar className="h-3.5 w-3.5" />
                                  {item.date}
                                </span>
                                <span className="flex items-center gap-1">
                                  <MapPin className="h-3.5 w-3.5 text-red-500" />
                                  {item.location}
                                </span>
                              </div>
                            </div>

                            <button
                              onClick={(e) => handleRemoveSave(e, item.savedId)}
                              className="text-gray-400 hover:text-red-500 transition cursor-pointer p-2 rounded-lg hover:bg-red-50 shrink-0 self-end sm:self-center"
                              title="Favorilerden Kaldır"
                            >
                              <Trash2 className="h-5 w-5" />
                            </button>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                )}

              </div>
            </div>
          )}

        </div>
      </main>

      {/* Profil Fotoğrafı / Logo Silme Onay Modalı */}
      {deleteConfirmOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-sm p-4 overflow-hidden animate-in fade-in duration-200">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-sm p-6 border border-gray-150 transform transition-all animate-in zoom-in-95 duration-200">
            <h3 className="text-lg font-bold text-gray-900 mb-2">Fotoğrafı Kaldır</h3>
            <p className="text-sm text-gray-500 mb-6">
              {profile?.role === "student" 
                ? "Profil fotoğrafınızı kaldırmak istediğinize emin misiniz?" 
                : "Topluluk logosunu kaldırmak istediğinize emin misiniz?"}
            </p>
            <div className="flex gap-3 justify-end">
              <button
                type="button"
                onClick={() => setDeleteConfirmOpen(false)}
                className="px-4 py-2 text-sm font-semibold bg-gray-100 hover:bg-gray-200 text-gray-700 rounded-xl transition cursor-pointer"
              >
                Vazgeç
              </button>
              <button
                type="button"
                onClick={() => {
                  setDeleteConfirmOpen(false);
                  executeLogoDelete();
                }}
                className="px-4 py-2 text-sm font-semibold bg-red-600 hover:bg-red-700 text-white rounded-xl transition cursor-pointer"
              >
                Evet, Kaldır
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Hata Bildirim Modalı */}
      {errorModal.isOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-sm p-4 overflow-hidden animate-in fade-in duration-200">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-sm p-6 border border-gray-150 transform transition-all animate-in zoom-in-95 duration-200">
            <h3 className="text-lg font-bold text-red-600 mb-2">Hata</h3>
            <p className="text-sm text-gray-500 mb-6">{errorModal.message}</p>
            <div className="flex justify-end">
              <button
                type="button"
                onClick={() => setErrorModal({ isOpen: false, message: "" })}
                className="px-5 py-2.5 text-sm font-bold bg-slate-900 text-white rounded-xl hover:bg-slate-800 transition cursor-pointer"
              >
                Tamam
              </button>
            </div>
          </div>
        </div>
      )}


    </div>
  );
}
