import { useNavigate, useLocation } from "react-router-dom";
import { Compass, Home as HomeIcon, LogOut } from "lucide-react";

export default function Navbar() {
  const navigate = useNavigate();
  const location = useLocation();

  const isActive = (path) => location.pathname === path;

  return (
    <nav className="sticky top-0 z-50 border-b border-slate-800 bg-slate-900/95 px-6 py-3 shadow-sm backdrop-blur-md flex items-center justify-between text-white">
      
      {/* Sol Taraf: Beyaz SVG Logo ve Başlık */}
      <div 
        onClick={() => navigate("/home")} 
        className="cursor-pointer flex items-center gap-2.5 hover:opacity-90 transition"
      >
        <img 
          src="/logo.svg" 
          alt="Logo" 
          className="h-8 w-8 object-contain"
        />
        <span className="text-2xl font-extrabold tracking-tight text-white">
          KampusRadar
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
      </div>

      {/* Sağ Taraf: Profil ve Çıkış */}
      <div className="flex items-center gap-4">
        <div className="flex h-9 w-9 items-center justify-center rounded-full bg-white text-slate-900 font-bold shadow-sm">
          Ö
        </div>
        <button 
          onClick={() => navigate("/")}
          className="rounded-lg p-2 text-slate-400 hover:bg-white/5 hover:text-white transition"
          title="Çıkış Yap"
        >
          <LogOut className="h-5 w-5" />
        </button>
      </div>

    </nav>
  );
}