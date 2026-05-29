import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { ArrowLeft, Loader2, AlertCircle } from "lucide-react";
import { useAuth } from "../context/AuthContext";

const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL;
const SUPABASE_KEY = import.meta.env.VITE_SUPABASE_ANON_KEY;

// Role göre yönlendirme tablosu
const roleRoutes = {
  admin: "/admin",
  sks: "/sks",
  organizer: "/organizer",
  student: "/home",
};

export default function Login() {
  const navigate = useNavigate();
  const { signIn, user, profile } = useAuth();

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState("");

  // Zaten giriş yapmışsa doğrudan yönlendir (geri tuşuyla gelirse)
  useEffect(() => {
    if (user && profile) {
      const route = roleRoutes[profile.role] || "/home";
      navigate(route, { replace: true });
    } else if (user && !profile) {
      // Profil henüz yüklenmedi, bekle
    }
  }, [user, profile, navigate]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setErrorMessage("");
    setLoading(true);

    try {
      const { user: loggedInUser } = await signIn(email, password);

      // Profili doğrudan fetch ile çekip role göre yönlendir
      // (AuthContext'teki async yüklenmeyi beklemeden anında yönlendirme)
      let targetRoute = "/home";

      if (loggedInUser) {
        try {
          const res = await fetch(
            `${SUPABASE_URL}/rest/v1/profiles?id=eq.${loggedInUser.id}&select=role&limit=1`,
            {
              headers: {
                apikey: SUPABASE_KEY,
                Authorization: `Bearer ${SUPABASE_KEY}`,
              },
            }
          );
          if (res.ok) {
            const data = await res.json();
            const role = data?.[0]?.role;
            targetRoute = roleRoutes[role] || "/home";
          }
        } catch {
          // Profil okunamazsa student route'a git
          targetRoute = "/home";
        }
      }

      // replace:true — login sayfası geçmişten silinir, geri tuşu landing'e gider
      navigate(targetRoute, { replace: true });
    } catch (err) {
      console.error("Giriş hatası:", err);
      let msg = err.message || "Giriş yapılırken bir hata oluştu.";
      if (msg.includes("Invalid login credentials")) {
        msg = "E-posta veya şifre hatalı. Lütfen bilgilerinizi kontrol edin.";
      } else if (msg.includes("Email not confirmed")) {
        msg = "E-posta adresiniz henüz doğrulanmamış. Lütfen gelen kutunuzu kontrol edin.";
      }
      setErrorMessage(msg);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex min-h-screen items-center justify-center bg-slate-100 px-4 relative">

      {/* Sol Üst Geri Dönüş Butonu */}
      <button
        onClick={() => navigate("/")}
        className="absolute left-6 top-6 flex items-center gap-2 rounded-xl border border-gray-200 bg-white px-4 py-2 text-sm font-semibold text-gray-600 shadow-sm transition hover:bg-gray-50 hover:text-gray-900 cursor-pointer"
      >
        <ArrowLeft className="h-4 w-4" />
        Ana Sayfaya Dön
      </button>

      {/* Giriş Kartı */}
      <div className="w-full max-w-md rounded-2xl bg-slate-900 p-8 shadow-2xl text-white border border-slate-800">

        {/* LOGO ve Başlık */}
        <div className="mb-6 text-center flex flex-col items-center">
          <img
            src="/logo.svg"
            alt="KampüsRadar Logo"
            className="h-20 w-20 object-contain mb-4"
          />
          <h1 className="text-3xl font-extrabold text-white tracking-tight">KampüsRadar</h1>
          <p className="mt-2 text-slate-400 text-sm">Kampüsündeki etkinlikleri kaçırma!</p>
        </div>

        {/* Hata Mesajı */}
        {errorMessage && (
          <div className="mb-4 flex items-start gap-3 rounded-lg border border-red-500/20 bg-red-500/10 p-3 text-xs text-red-400">
            <AlertCircle className="h-4 w-4 shrink-0 text-red-400" />
            <span>{errorMessage}</span>
          </div>
        )}

        {/* Form */}
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="mb-1 block text-sm font-medium text-slate-300">E-posta Adresi</label>
            <input
              type="email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="ornek@ogrenci.edu.tr"
              className="w-full rounded-lg border border-slate-700 bg-slate-800 px-4 py-2 text-white placeholder-slate-500 focus:border-blue-400 focus:outline-none focus:ring-1 focus:ring-blue-400 text-sm"
            />
          </div>

          <div>
            <label className="mb-1 block text-sm font-medium text-slate-300">Şifre</label>
            <input
              type="password"
              required
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="••••••••"
              className="w-full rounded-lg border border-slate-700 bg-slate-800 px-4 py-2 text-white placeholder-slate-500 focus:border-blue-400 focus:outline-none focus:ring-1 focus:ring-blue-400 text-sm"
            />
          </div>

          <button
            type="submit"
            disabled={loading}
            className="mt-6 w-full rounded-xl bg-white px-4 py-2.5 text-slate-900 font-bold transition hover:bg-slate-100 shadow-md flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50"
          >
            {loading ? (
              <>
                <Loader2 className="h-5 w-5 animate-spin" />
                Giriş Yapılıyor...
              </>
            ) : (
              "Giriş Yap"
            )}
          </button>
        </form>

        <p className="mt-6 text-center text-sm text-slate-400">
          Hesabın yok mu?{" "}
          <button
            type="button"
            onClick={() => navigate("/register")}
            className="font-bold text-white underline hover:text-slate-200 cursor-pointer bg-transparent border-none p-0 inline"
          >
            Hemen Kayıt Ol
          </button>
        </p>

      </div>
    </div>
  );
}