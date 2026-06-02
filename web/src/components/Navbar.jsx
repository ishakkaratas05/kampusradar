import { useNavigate, useLocation } from "react-router-dom";
import { Compass, Home as HomeIcon } from "lucide-react";
import ProfileDropdown from "./ProfileDropdown";
import { useAuth } from "../context/AuthContext";

export default function Navbar() {
  const navigate = useNavigate();
  const location = useLocation();
  const { user, profile, signOut } = useAuth();

  const isActive = (path) => location.pathname === path;

  return (
    <nav className="sticky top-0 z-50 border-b border-slate-800 bg-slate-900/95 px-6 py-3 shadow-sm backdrop-blur-md flex items-center justify-between text-white">
      
      {/* Sol Taraf: Beyaz SVG Logo ve Başlık */}
      <div 
        onClick={() => navigate("/")} 
        className="cursor-pointer flex items-center gap-3 hover:opacity-90 transition"
        title="Tanıtım Sayfasına Git"
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
        {(!profile || profile.role === "student") && (
          <>
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
          </>
        )}

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
          <ProfileDropdown />
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