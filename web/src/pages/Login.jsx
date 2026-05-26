import { useNavigate } from "react-router-dom";
import { ArrowLeft } from "lucide-react";

export default function Login() {
  const navigate = useNavigate();

  return (
    <div className="flex min-h-screen items-center justify-center bg-slate-100 px-4 relative">
      
      {/* Sol Üst Geri Dönüş Butonu */}
      <button
        onClick={() => navigate("/")}
        className="absolute left-6 top-6 flex items-center gap-2 rounded-xl border border-gray-200 bg-white px-4 py-2 text-sm font-semibold text-gray-600 shadow-sm transition hover:bg-gray-50 hover:text-gray-900"
      >
        <ArrowLeft className="h-4 w-4" />
        Ana Sayfaya Dön
      </button>

      {/* Koyu Asil Giriş Kartı */}
      <div className="w-full max-w-md rounded-2xl bg-slate-900 p-8 shadow-2xl text-white border border-slate-800">
        
        {/* LOGO ve Başlık Alanı */}
        <div className="mb-8 text-center flex flex-col items-center">
          <img 
            src="/logo.svg" 
            alt="KampusRadar Logo" 
            className="h-20 w-20 object-contain mb-4"
          />
          <h1 className="text-3xl font-extrabold text-white tracking-tight">KampusRadar</h1>
          <p className="mt-2 text-slate-400 text-sm">Kampüsündeki etkinlikleri kaçırma!</p>
        </div>

        {/* Form Alanı */}
        <form className="space-y-4">
          <div>
            <label className="mb-1 block text-sm font-medium text-slate-300">Öğrenci E-posta</label>
            <input 
              type="email" 
              placeholder="ornek@ogrenci.edu.tr" 
              className="w-full rounded-lg border border-slate-700 bg-slate-800 px-4 py-2 text-white placeholder-slate-500 focus:border-blue-400 focus:outline-none focus:ring-1 focus:ring-blue-400"
            />
          </div>

          <div>
            <label className="mb-1 block text-sm font-medium text-slate-300">Şifre</label>
            <input 
              type="password" 
              placeholder="••••••••" 
              className="w-full rounded-lg border border-slate-700 bg-slate-800 px-4 py-2 text-white placeholder-slate-500 focus:border-blue-400 focus:outline-none focus:ring-1 focus:ring-blue-400"
            />
          </div>

          <button 
            type="button"
            onClick={() => navigate('/home')}
            className="mt-6 w-full rounded-xl bg-white px-4 py-2.5 text-slate-900 font-bold transition hover:bg-slate-100 shadow-md"
          >
            Giriş Yap
          </button>
        </form>

        <p className="mt-6 text-center text-sm text-slate-400">
          Hesabın yok mu? <a href="#" className="font-bold text-white underline hover:text-slate-200">Hemen Kayıt Ol</a>
        </p>
        
      </div>
    </div>
  );
}