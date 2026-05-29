import { useNavigate, useLocation } from "react-router-dom";
import { Compass, Home as HomeIcon, LogOut } from "lucide-react";
import { useAuth } from "../context/AuthContext";

export default function Navbar() {
  const navigate = useNavigate();
  const location = useLocation();
  const { user, profile, signOut } = useAuth();

  const isActive = (path) => location.pathname === path;

  const handleSignOut = async () => {
    try {
      await signOut();
      navigate("/");
    } catch (err) {
      console.error("Çıkış yaparken hata:", err.message);
    }
  };

  return (
    <nav className="sticky top-0 z-50 border-b border-slate-800 bg-slate-900/95 px-6 py-3 shadow-sm backdrop-blur-md flex items-center justify-between text-white">
      
      {/* Sol Taraf: Beyaz SVG Logo ve Başlık */}
      <div 
        onClick={() => navigate("/home")} 
        className="cursor-pointer flex items-center gap-3 hover:opacity-90 transition"
      >
        <img 
          src="/logo.svg" 
          alt="Logo" 
          className="h-14 w-14 object-contain drop-shadow-lg"
        />
        <span className="text-xl font-extrabold tracking-tight text-white drop-shadow-sm">
          KampüsRadar
        </span>
      </div>

      {/* Orta Kısım: Sayfa Sekmeleri */}
      <div className="flex items-center gap-2">
        <button
          onClick={() => navigate("/home")}
          className={`flex items-center gap-1.5 rounded-xl px-4 py-2 text-sm font-semibold transition ${
            isActive("/home")
              ? "bg-white/10 text-white"
              : "text-slate-300 hover:bg-white/5 hover:text-white"
          }`}
        >
          <HomeIcon className="h-4 w-4" />
          Kampüsüm
        </button>

        <button
          onClick={() => navigate("/discover")}
          className={`flex items-center gap-1.5 rounded-xl px-4 py-2 text-sm font-semibold transition ${
            isActive("/discover")
              ? "bg-white/10 text-white"
              : "text-slate-300 hover:bg-white/5 hover:text-white"
          }`}
        >
          <Compass className="h-4 w-4" />
          Keşfet
        </button>

        {/* Yetkiye Özel Dashboard Linkleri */}
        {profile?.role === "admin" && (
          <button
            onClick={() => navigate("/admin")}
            className={`flex items-center gap-1.5 rounded-xl px-4 py-2 text-sm font-bold transition text-amber-400 hover:bg-amber-400/10 ${isActive("/admin") ? "bg-amber-400/20" : ""}`}
          >
            Admin Paneli
          </button>
        )}
        {profile?.role === "sks" && (
          <button
            onClick={() => navigate("/sks")}
            className={`flex items-center gap-1.5 rounded-xl px-4 py-2 text-sm font-bold transition text-blue-400 hover:bg-blue-400/10 ${isActive("/sks") ? "bg-blue-400/20" : ""}`}
          >
            SKS Paneli
          </button>
        )}
        {profile?.role === "organizer" && (
          <button
            onClick={() => navigate("/organizer")}
            className={`flex items-center gap-1.5 rounded-xl px-4 py-2 text-sm font-bold transition text-emerald-400 hover:bg-emerald-400/10 ${isActive("/organizer") ? "bg-emerald-400/20" : ""}`}
          >
            Organizatör Paneli
          </button>
        )}
      </div>

      {/* Sağ Taraf: Profil ve Çıkış */}
      <div className="flex items-center gap-4">
        {user ? (
          <>
            <div 
              onClick={() => navigate("/profile")}
              className="flex items-center gap-2.5 cursor-pointer hover:opacity-90 transition"
              title="Hesabım"
            >
              <span className="hidden md:inline text-sm font-bold text-slate-200">
                {profile?.full_name || user.email}
              </span>
              <div className="flex h-9 w-9 items-center justify-center rounded-full bg-white text-slate-900 font-bold shadow-sm uppercase">
                {profile?.full_name 
                  ? profile.full_name.split(" ").filter(Boolean).map(n => n[0]).join("").substring(0, 2)
                  : user.email[0]}
              </div>
            </div>
            <button 
              onClick={handleSignOut}
              className="rounded-lg p-2 text-slate-400 hover:bg-white/5 hover:text-white transition cursor-pointer"
              title="Çıkış Yap"
            >
              <LogOut className="h-5 w-5" />
            </button>
          </>
        ) : (
          <button
            onClick={() => navigate("/login")}
            className="rounded-xl bg-white px-4 py-2 text-sm font-bold text-slate-900 shadow-md transition hover:bg-slate-100 cursor-pointer"
          >
            Giriş Yap
          </button>
        )}
      </div>

    </nav>
  );
}