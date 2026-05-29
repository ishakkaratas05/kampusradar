import { useNavigate } from "react-router-dom";
import { ArrowRight, School, MapPin, Calendar, Info, ChevronDown, LogOut, LayoutDashboard } from "lucide-react";
import { useEffect, useState, useRef } from "react";
import { useAuth } from "../context/AuthContext";

const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL;
const SUPABASE_KEY = import.meta.env.VITE_SUPABASE_ANON_KEY;

const roleRoutes = {
  admin: "/admin",
  sks: "/sks",
  organizer: "/organizer",
  student: "/home",
};

const roleLabels = {
  admin: "Admin",
  sks: "SKS Yetkilisi",
  organizer: "Organizatör",
  student: "Öğrenci",
};

// Kullanıcı adının baş harflerini döndürür (avatar için)
function getInitials(name, email) {
  if (name) {
    return name.split(" ").filter(Boolean).map((n) => n[0]).join("").substring(0, 2).toUpperCase();
  }
  return email?.[0]?.toUpperCase() || "?";
}

export default function Landing() {
  const navigate = useNavigate();
  const { user, profile, signOut } = useAuth();

  const [universities, setUniversities] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [dropdownOpen, setDropdownOpen] = useState(false);
  const dropdownRef = useRef(null);

  // Dışarı tıklanınca dropdown'u kapat
  useEffect(() => {
    const handleClickOutside = (e) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target)) {
        setDropdownOpen(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  // Üniversiteleri çek (AuthContext'ten bağımsız raw fetch)
  useEffect(() => {
    async function fetchUniversities() {
      try {
        setLoading(true);
        setError(null);
        const res = await fetch(
          `${SUPABASE_URL}/rest/v1/universities?select=*&order=name.asc`,
          {
            headers: {
              apikey: SUPABASE_KEY,
              Authorization: `Bearer ${SUPABASE_KEY}`,
              "Content-Type": "application/json",
            },
          }
        );
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        const data = await res.json();
        setUniversities(data || []);
      } catch (err) {
        console.error("Üniversiteler yüklenirken hata:", err.message);
        setError(err.message);
      } finally {
        setLoading(false);
      }
    }
    fetchUniversities();
  }, []);

  const handleSignOut = async () => {
    setDropdownOpen(false);
    await signOut();
  };

  const handleDashboard = () => {
    setDropdownOpen(false);
    const route = roleRoutes[profile?.role] || "/home";
    navigate(route);
  };

  const dashboardLabel = roleLabels[profile?.role] || "Panele Git";

  return (
    <div className="min-h-screen bg-gray-50">

      {/* ── HEADER ── */}
      <header className="bg-slate-900 border-b border-slate-800 px-6 py-4 shadow-sm flex items-center justify-between sticky top-0 z-50 text-white">
        
        {/* Logo */}
        <div className="flex items-center gap-3 cursor-pointer" onClick={() => navigate("/")}>
          <img src="/logo.svg" alt="Logo" className="h-14 w-14 object-contain drop-shadow-lg" />
          <span className="text-xl font-extrabold tracking-tight drop-shadow-sm">KampüsRadar</span>
        </div>

        {/* Sağ Taraf: Giriş yapmadıysa buton, yapmışsa profil */}
        {user ? (
          /* ── Giriş yapılmış: Profil Dropdown ── */
          <div className="relative" ref={dropdownRef}>
            <button
              onClick={() => setDropdownOpen((prev) => !prev)}
              className="flex items-center gap-2.5 rounded-xl px-3 py-2 transition hover:bg-white/10 cursor-pointer"
            >
              {/* Avatar */}
              <div className="flex h-9 w-9 items-center justify-center rounded-full bg-white text-slate-900 font-bold text-sm shadow-sm uppercase shrink-0">
                {getInitials(profile?.full_name, user.email)}
              </div>
              {/* İsim ve Rol */}
              <div className="hidden sm:flex flex-col items-start leading-tight">
                <span className="text-sm font-bold text-white truncate max-w-[140px]">
                  {profile?.full_name || user.email}
                </span>
                <span className="text-[11px] text-slate-400 font-medium">
                  {roleLabels[profile?.role] || "Kullanıcı"}
                </span>
              </div>
              <ChevronDown className={`h-4 w-4 text-slate-400 transition-transform duration-200 ${dropdownOpen ? "rotate-180" : ""}`} />
            </button>

            {/* Dropdown Menü */}
            {dropdownOpen && (
              <div className="absolute right-0 top-full mt-2 w-56 rounded-2xl bg-slate-800 border border-slate-700 shadow-2xl overflow-hidden animate-in">
                {/* Üst bilgi alanı */}
                <div className="px-4 py-3 border-b border-slate-700">
                  <p className="text-xs text-slate-400 font-medium">Giriş yapıldı</p>
                  <p className="text-sm font-bold text-white truncate mt-0.5">{user.email}</p>
                </div>
                {/* Menü öğeleri */}
                <div className="py-1">
                  <button
                    onClick={handleDashboard}
                    className="flex w-full items-center gap-3 px-4 py-2.5 text-sm text-slate-200 hover:bg-slate-700 hover:text-white transition cursor-pointer"
                  >
                    <LayoutDashboard className="h-4 w-4 text-blue-400" />
                    {dashboardLabel} Paneli
                  </button>
                  <hr className="border-slate-700 my-1" />
                  <button
                    onClick={handleSignOut}
                    className="flex w-full items-center gap-3 px-4 py-2.5 text-sm text-red-400 hover:bg-red-500/10 hover:text-red-300 transition cursor-pointer"
                  >
                    <LogOut className="h-4 w-4" />
                    Çıkış Yap
                  </button>
                </div>
              </div>
            )}
          </div>
        ) : (
          /* ── Giriş yapılmamış: Giriş Yap butonu ── */
          <button
            onClick={() => navigate("/login")}
            className="rounded-xl bg-white px-5 py-2 text-sm font-bold text-slate-900 shadow-md transition hover:bg-slate-100"
          >
            Giriş Yap
          </button>
        )}
      </header>

      {/* ── HERO ── */}
      <section className="relative flex items-center justify-center py-32 px-4 text-center overflow-hidden">
        <video autoPlay loop muted playsInline className="absolute inset-0 w-full h-full object-cover z-0">
          <source src="/video.mp4" type="video/mp4" />
        </video>
        <div className="absolute inset-0 bg-slate-900/75 z-10"></div>
        <div className="relative z-20 max-w-3xl mx-auto text-white">
          <h1 className="text-4xl sm:text-5xl md:text-6xl font-extrabold tracking-tight leading-tight">
            Üniversitendeki Tüm Etkinlikler Tek Bir Radarda!
          </h1>
          <p className="mt-6 text-lg md:text-xl text-slate-300 max-w-2xl mx-auto">
            KampüsRadar, öğrencilerin kendi kampüslerindeki şenlik, konferans, turnuva ve seminerlerden anında haberdar olmasını sağlayan ortak bir platformdur.
          </p>
          <div className="mt-10 flex justify-center gap-4">
            {user ? (
              <button
                onClick={handleDashboard}
                className="flex items-center gap-2 rounded-xl bg-white px-8 py-4 text-lg font-bold text-slate-900 shadow-2xl transition hover:bg-slate-100 hover:scale-105"
              >
                Paneline Git
                <ArrowRight className="h-6 w-6" />
              </button>
            ) : (
              <button
                onClick={() => navigate("/login")}
                className="flex items-center gap-2 rounded-xl bg-white px-8 py-4 text-lg font-bold text-slate-900 shadow-2xl transition hover:bg-slate-100 hover:scale-105"
              >
                Keşfetmeye Başla
                <ArrowRight className="h-6 w-6" />
              </button>
            )}
          </div>
        </div>
      </section>

      {/* ── ÜNİVERSİTELER ── */}
      <section className="max-w-6xl mx-auto px-4 py-20">
        <div className="text-center mb-16">
          <h2 className="text-3xl font-extrabold text-gray-900">Sistemdeki Üniversiteler</h2>
          <p className="text-gray-500 mt-2 text-lg">KampüsRadar ağına katılmış aktif kampüsler</p>
        </div>

        {loading ? (
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {[1, 2, 3, 4].map((n) => (
              <div key={n} className="flex flex-col sm:flex-row bg-white rounded-2xl border border-gray-100 p-5 gap-5 items-center sm:items-start w-full animate-pulse">
                <div className="w-24 h-24 sm:w-28 sm:h-28 bg-gray-200 rounded-xl shrink-0"></div>
                <div className="flex-1 w-full space-y-3">
                  <div className="h-6 bg-gray-200 rounded w-3/4 mx-auto sm:mx-0"></div>
                  <div className="flex gap-2 justify-center sm:justify-start">
                    <div className="h-5 bg-gray-200 rounded w-20"></div>
                    <div className="h-5 bg-gray-200 rounded w-28"></div>
                  </div>
                  <div className="space-y-2">
                    <div className="h-3 bg-gray-200 rounded w-full"></div>
                    <div className="h-3 bg-gray-200 rounded w-5/6"></div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        ) : error ? (
          <div className="text-center py-10 bg-red-50 rounded-2xl border border-red-100">
            <p className="text-red-500 font-medium">Üniversiteler yüklenemedi: {error}</p>
          </div>
        ) : universities.length === 0 ? (
          <div className="text-center py-10 bg-white rounded-2xl border border-gray-100 shadow-sm">
            <p className="text-gray-500 font-medium">Henüz kayıtlı üniversite bulunmuyor.</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {universities.map((uni) => (
              <div key={uni.id} className="group flex flex-col sm:flex-row bg-white rounded-2xl border border-gray-100 p-5 shadow-sm transition-all hover:shadow-xl hover:-translate-y-1 duration-300 gap-5 items-center sm:items-start w-full">
                {/* Logo */}
                <div className="flex flex-col items-center justify-center w-24 h-24 sm:w-28 sm:h-28 shrink-0 bg-slate-50 rounded-xl border border-slate-100 overflow-hidden">
                  {uni.logo_url ? (
                    <img src={uni.logo_url} alt={`${uni.name} Logo`} className="w-full h-full object-cover" onError={(e) => { e.target.style.display = "none"; }} />
                  ) : (
                    <div className="flex flex-col items-center justify-center w-full h-full">
                      <School className="h-8 w-8 text-slate-400 mb-1" />
                      <span className="text-xs font-bold text-slate-600">{uni.abbreviation}</span>
                    </div>
                  )}
                </div>
                {/* Bilgiler */}
                <div className="flex-1 text-center sm:text-left flex flex-col justify-center">
                  <h3 className="text-xl font-bold text-gray-900 leading-snug">{uni.name}</h3>
                  <div className="mt-2.5 flex flex-wrap items-center justify-center sm:justify-start gap-2 text-[11px] font-bold uppercase tracking-wider">
                    <span className="flex items-center gap-1 bg-red-50 text-red-700 px-2.5 py-1 rounded-md border border-red-100">
                      <MapPin className="h-3.5 w-3.5" /> {uni.city}
                    </span>
                    <span className="flex items-center gap-1 bg-blue-50 text-blue-700 px-2.5 py-1 rounded-md border border-blue-100">
                      <Calendar className="h-3.5 w-3.5" /> Kuruluş: {uni.founded}
                    </span>
                  </div>
                  <p className="mt-3 text-xs text-gray-600 leading-relaxed flex items-start gap-1.5 text-left line-clamp-3">
                    <Info className="h-4 w-4 text-gray-400 shrink-0 mt-0.5 hidden sm:block" />
                    {uni.history}
                  </p>
                </div>
              </div>
            ))}
          </div>
        )}
      </section>

      {/* ── ÜNİVERSİTE LOGOLARI MARQUEE ── */}
      {!loading && universities.length > 0 && (
        <section className="bg-white py-16 border-t border-b border-gray-100 overflow-hidden">
          <div className="max-w-6xl mx-auto px-4 mb-10 text-center">
            <h3 className="text-xs font-extrabold tracking-widest text-slate-400">
              KAMPÜSRADAR AĞINA KATILAN ÜNİVERSİTELER
            </h3>
          </div>
          <div className="relative w-full overflow-hidden flex items-center">
            {/* Sol ve sağ tarafa gölge efekti (fade) */}
            <div className="absolute left-0 top-0 bottom-0 w-20 bg-gradient-to-r from-white to-transparent z-10 pointer-events-none"></div>
            <div className="absolute right-0 top-0 bottom-0 w-20 bg-gradient-to-l from-white to-transparent z-10 pointer-events-none"></div>
            
            <div className="animate-marquee flex items-center gap-10 py-2">
              {/* İlk set */}
              {universities.map((uni) => (
                <div key={`logo-1-${uni.id}`} className="flex flex-col items-center justify-center shrink-0 w-24 h-24 bg-slate-50 border border-slate-100 rounded-2xl p-4 shadow-sm hover:shadow-md hover:border-slate-200 transition-all duration-300">
                  {uni.logo_url ? (
                    <img
                      src={uni.logo_url}
                      alt={uni.name}
                      className="max-h-full max-w-full object-contain filter grayscale hover:grayscale-0 transition-all duration-300"
                    />
                  ) : (
                    <span className="text-sm font-bold text-slate-500">{uni.abbreviation}</span>
                  )}
                </div>
              ))}
              {/* İkinci set (seamless loop için) */}
              {universities.map((uni) => (
                <div key={`logo-2-${uni.id}`} className="flex flex-col items-center justify-center shrink-0 w-24 h-24 bg-slate-50 border border-slate-100 rounded-2xl p-4 shadow-sm hover:shadow-md hover:border-slate-200 transition-all duration-300">
                  {uni.logo_url ? (
                    <img
                      src={uni.logo_url}
                      alt={uni.name}
                      className="max-h-full max-w-full object-contain filter grayscale hover:grayscale-0 transition-all duration-300"
                    />
                  ) : (
                    <span className="text-sm font-bold text-slate-500">{uni.abbreviation}</span>
                  )}
                </div>
              ))}
            </div>
          </div>
        </section>
      )}

      {/* ── FOOTER ── */}
      <footer className="bg-slate-900 text-slate-400 py-12 border-t border-slate-800">
        <div className="max-w-6xl mx-auto px-4">
          <div className="flex flex-col md:flex-row items-center justify-between gap-6 pb-8 border-b border-slate-800">
            <div className="flex items-center gap-3">
              <img src="/logo.svg" alt="Logo" className="h-10 w-10 object-contain" />
              <span className="text-lg font-extrabold text-white tracking-tight">KampüsRadar</span>
            </div>
            <div className="flex flex-wrap justify-center gap-6 text-sm">
              <a href="#" className="hover:text-white transition">Hakkımızda</a>
              <a href="#" className="hover:text-white transition">Kullanım Koşulları</a>
              <a href="#" className="hover:text-white transition">Gizlilik Politikası</a>
              <a href="#" className="hover:text-white transition">İletişim</a>
            </div>
          </div>
          <div className="flex flex-col sm:flex-row items-center justify-between gap-4 pt-8 text-xs text-slate-500">
            <p>© 2026 KampüsRadar. Tüm hakları saklıdır.</p>
            <p>Türkiye'nin En Büyük Kampüs Etkinlik Ağı</p>
          </div>
        </div>
      </footer>

    </div>
  );
}