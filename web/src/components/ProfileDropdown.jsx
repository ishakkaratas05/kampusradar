import { useState, useRef, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { ChevronDown, LogOut, LayoutDashboard, User } from "lucide-react";
import { useAuth } from "../context/AuthContext";

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

function getInitials(name, email) {
  if (name) {
    return name.split(" ").filter(Boolean).map((n) => n[0]).join("").substring(0, 2).toUpperCase();
  }
  return email?.[0]?.toUpperCase() || "?";
}

export default function ProfileDropdown() {
  const navigate = useNavigate();
  const { user, profile, signOut } = useAuth();
  
  const [dropdownOpen, setDropdownOpen] = useState(false);
  const dropdownRef = useRef(null);

  useEffect(() => {
    const handleClickOutside = (e) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target)) {
        setDropdownOpen(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const handleSignOut = async () => {
    setDropdownOpen(false);
    try {
      await signOut();
      navigate("/");
    } catch (err) {
      console.error("Çıkış hatası:", err.message);
    }
  };

  const handleDashboard = () => {
    setDropdownOpen(false);
    const route = roleRoutes[profile?.role] || "/home";
    navigate(route);
  };

  const handleProfile = () => {
    setDropdownOpen(false);
    navigate("/profile");
  };

  if (!user) return null;

  const dashboardLabel = roleLabels[profile?.role] || "Panel";

  return (
    <div className="relative" ref={dropdownRef}>
      <button
        onClick={() => setDropdownOpen((prev) => !prev)}
        className="flex items-center gap-2.5 rounded-xl px-2 py-1.5 transition hover:bg-white/10 cursor-pointer group"
        title="Hesap Menüsü"
      >
        <div className="hidden sm:flex flex-col items-end leading-tight text-right mr-1">
          <span className="text-sm font-bold text-slate-200 truncate max-w-[140px] group-hover:text-white transition">
            {profile?.full_name || user.email}
          </span>
          <span className="text-[11px] text-slate-400 font-medium">
            {roleLabels[profile?.role] || "Kullanıcı"}
          </span>
        </div>
        <div className="flex h-10 w-10 items-center justify-center rounded-full bg-white text-slate-900 font-bold text-sm shadow-sm uppercase shrink-0 overflow-hidden">
          {profile?.role === "sks" && profile?.university_logo_url ? (
            <img src={profile.university_logo_url} alt="Üniversite Logosu" className="h-full w-full object-cover" />
          ) : profile?.logo_url ? (
            <img src={profile.logo_url} alt="Profil Logosu" className="h-full w-full object-cover" />
          ) : (
            getInitials(profile?.full_name, user.email)
          )}
        </div>
        <ChevronDown className={`h-4 w-4 text-slate-400 transition-transform duration-200 ${dropdownOpen ? "rotate-180" : ""}`} />
      </button>

      {dropdownOpen && (
        <div className="absolute right-0 top-full mt-2 w-56 rounded-2xl bg-slate-800 border border-slate-700 shadow-2xl overflow-hidden animate-in fade-in slide-in-from-top-2 duration-200 z-50">
          <div className="px-4 py-3 border-b border-slate-700 bg-slate-800/50">
            <p className="text-xs text-slate-400 font-medium">Oturum açık</p>
            <p className="text-sm font-bold text-white truncate mt-0.5" title={user.email}>{user.email}</p>
          </div>
          <div className="py-1">
            <button
              onClick={handleProfile}
              className="flex w-full items-center gap-3 px-4 py-2.5 text-sm text-slate-200 hover:bg-slate-700 hover:text-white transition cursor-pointer"
            >
              <User className="h-4 w-4 text-emerald-400" />
              Profilim
            </button>
            <button
              onClick={handleDashboard}
              className="flex w-full items-center gap-3 px-4 py-2.5 text-sm text-slate-200 hover:bg-slate-700 hover:text-white transition cursor-pointer"
            >
              <LayoutDashboard className="h-4 w-4 text-blue-400" />
              {dashboardLabel} Paneli
            </button>
            <hr className="border-slate-700 my-1 mx-2" />
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
  );
}
