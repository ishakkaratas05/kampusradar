import { useState, useEffect } from "react";
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
  Loader2 
} from "lucide-react";

export default function Profile() {
  const navigate = useNavigate();
  const { user, signOut } = useAuth();

  // Profile ve Üniversite State
  const [profileData, setProfileData] = useState(null);
  const [uniName, setUniName] = useState("");
  const [loadingProfile, setLoadingProfile] = useState(true);

  // Saved Events State
  const [savedEvents, setSavedEvents] = useState([]);
  const [loadingEvents, setLoadingEvents] = useState(true);

  // Sayfa açıldığında giriş kontrolü
  useEffect(() => {
    if (!user) {
      navigate("/login");
    }
  }, [user, navigate]);

  // Profil Bilgilerini Çek (Üniversiteyle birlikte Join)
  useEffect(() => {
    async function loadProfile() {
      if (!user) return;
      try {
        const { data, error } = await supabase
          .from("profiles")
          .select("*, universities(name)")
          .eq("id", user.id)
          .single();

        if (error) throw error;
        setProfileData(data);
        setUniName(data?.universities?.name || "Belirtilmemiş");
      } catch (err) {
        console.error("Profil çekme hatası:", err.message);
      } finally {
        setLoadingProfile(false);
      }
    }
    loadProfile();
  }, [user]);

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
          date: item.events.date,
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

  useEffect(() => {
    fetchSavedEvents();
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
        <div className="grid grid-cols-1 gap-8 lg:grid-cols-3">
          
          {/* Sol Kolon: Profil Kartı */}
          <div className="lg:col-span-1">
            <div className="rounded-2xl bg-slate-900 p-6 text-white border border-slate-800 shadow-xl flex flex-col items-center">
              
              {/* Profil Resmi/Avatar Dairesi */}
              <div className="flex h-24 w-24 items-center justify-center rounded-full bg-white text-slate-900 text-3xl font-extrabold shadow-md mb-4 uppercase">
                {profileData?.full_name 
                  ? profileData.full_name.split(" ").filter(Boolean).map(n => n[0]).join("").substring(0, 2)
                  : user.email[0]}
              </div>

              {/* Kullanıcı Adı ve Rolü */}
              <h2 className="text-xl font-bold text-center mb-1">
                {profileData?.full_name || "Yükleniyor..."}
              </h2>
              <span className="rounded-lg bg-blue-600/25 px-2.5 py-0.5 text-xs font-bold text-blue-400 border border-blue-500/20 mb-6">
                {profileData ? getRoleLabel(profileData.role) : "Öğrenci"}
              </span>

              {/* Bilgi Listesi */}
              <div className="w-full space-y-4 border-t border-slate-800 pt-6 text-sm text-slate-300">
                <div className="flex items-center gap-3">
                  <User className="h-5 w-5 text-slate-500 shrink-0" />
                  <div>
                    <p className="text-xs text-slate-500 font-medium">Ad Soyad</p>
                    <p className="font-semibold text-white">{profileData?.full_name || "-"}</p>
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
                    <p className="font-semibold text-white">{profileData ? getRoleLabel(profileData.role) : "-"}</p>
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

          {/* Sağ Kolon: Kaydedilen Etkinlikler */}
          <div className="lg:col-span-2">
            <div className="rounded-2xl bg-white p-6 shadow-sm border border-gray-200 min-h-[400px] flex flex-col">
              
              <div className="mb-6 flex items-center justify-between border-b border-gray-100 pb-4">
                <div className="flex items-center gap-2 text-slate-900">
                  <Bookmark className="h-5 w-5 fill-slate-900 text-slate-900" />
                  <h3 className="text-lg font-bold">Kaydettiğim Etkinlikler</h3>
                </div>
                <span className="rounded-full bg-slate-100 px-3 py-1 text-xs font-bold text-slate-600">
                  {savedEvents.length} Etkinlik
                </span>
              </div>

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
          </div>

        </div>
      </main>
    </div>
  );
}
