import { Navigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import { Loader2 } from "lucide-react";

export default function ProtectedRoute({ children, requiredRole }) {
  const { user, profile, loading } = useAuth();

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-900 flex items-center justify-center text-white">
        <div className="flex flex-col items-center gap-3">
          <Loader2 className="h-10 w-10 animate-spin text-white" />
          <p className="text-sm font-medium">Lütfen bekleyin...</p>
        </div>
      </div>
    );
  }

  // Giriş yapılmamışsa giriş sayfasına yönlendir
  if (!user) {
    return <Navigate to="/login" replace />;
  }

  // Profil yüklendiyse ve rol uyuşmuyorsa yetkisiz erişim/ana sayfa yönlendirmesi
  if (requiredRole && profile && profile.role !== requiredRole) {
    // Rolüne uygun varsayılan sayfaya gönder
    const roleRoutes = {
      admin: "/admin",
      sks: "/sks",
      organizer: "/organizer",
      student: "/home",
    };
    const defaultRoute = roleRoutes[profile.role] || "/home";
    return <Navigate to={defaultRoute} replace />;
  }

  return children;
}
