import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { ArrowLeft, Loader2, CheckCircle } from "lucide-react";
import { useAuth } from "../context/AuthContext";
import { supabase } from "../lib/supabaseClient";

export default function Register() {
  const navigate = useNavigate();
  const { signUp } = useAuth();

  // Form State
  const [fullName, setFullName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [role, setRole] = useState("student"); // 'student' veya 'organizer'
  const [universityId, setUniversityId] = useState("");
  
  // Öğrenci Akademik Bilgileri State'leri
  const [faculty, setFaculty] = useState("");
  const [department, setDepartment] = useState("");
  const [classLevel, setClassLevel] = useState("");
  const [studentNumber, setStudentNumber] = useState("");
  
  // UI State
  const [universities, setUniversities] = useState([]);
  const [loadingUnis, setLoadingUnis] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState("");
  const [showSuccessModal, setShowSuccessModal] = useState(false);

  // Üniversiteleri Yükle
  useEffect(() => {
    async function fetchUniversities() {
      try {
        const { data, error } = await supabase
          .from("universities")
          .select("id, name")
          .order("name", { ascending: true });
        
        if (error) throw error;
        setUniversities(data || []);
      } catch (err) {
        console.error("Üniversiteler çekilirken hata:", err.message);
      } finally {
        setLoadingUnis(false);
      }
    }
    fetchUniversities();
  }, []);

  // Form Gönderimi
  const handleSubmit = async (e) => {
    e.preventDefault();
    setErrorMessage("");

    // Validasyonlar
    if (!fullName.trim()) return setErrorMessage("Lütfen adınızı ve soyadınızı girin.");
    if (!email.trim()) return setErrorMessage("Lütfen e-posta adresinizi girin.");
    if (!password) return setErrorMessage("Lütfen şifrenizi girin.");
    if (password.length < 6) return setErrorMessage("Şifreniz en az 6 karakter olmalıdır.");
    if (!universityId) return setErrorMessage("Lütfen bağlı olduğunuz üniversiteyi seçin.");

    // Öğrenci Validasyonları
    if (role === "student") {
      if (!faculty.trim()) return setErrorMessage("Lütfen fakültenizi girin.");
      if (!department.trim()) return setErrorMessage("Lütfen bölümünüzü girin.");
      if (!classLevel) return setErrorMessage("Lütfen sınıfınızı seçin.");
      if (!studentNumber) return setErrorMessage("Lütfen okul numaranızı girin.");
      if (studentNumber.length !== 9) return setErrorMessage("Okul numarası 9 haneli olmalıdır.");
    }

    setIsSubmitting(true);

    try {
      await signUp(
        email, 
        password, 
        fullName, 
        role, 
        universityId, 
        role === "student" ? faculty : null, 
        role === "student" ? department : null, 
        role === "student" ? classLevel : null, 
        role === "student" ? studentNumber : null
      );
      
      // Başarı modalını aç
      setShowSuccessModal(true);
      
      // 2.5 saniye sonra Giriş sayfasına yönlendir
      setTimeout(() => {
        navigate("/login", { state: { success: "Kaydınız başarıyla tamamlandı! Bilgilerinizle giriş yapabilirsiniz." } });
      }, 2500);
    } catch (err) {
      console.error("Kayıt hatası:", err);
      let msg = err.message || "Kayıt olurken beklenmedik bir hata oluştu.";
      if (msg.includes("User already registered")) {
        msg = "Bu e-posta adresiyle kayıtlı bir kullanıcı zaten mevcut.";
      }
      setErrorMessage(msg);
    } finally {
      setIsSubmitting(false);
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

      {/* Koyu Asil Kayıt Kartı */}
      <div className="w-full max-w-md rounded-2xl bg-slate-900 p-6 shadow-2xl text-white border border-slate-800">
        
        {/* LOGO ve Başlık Alanı */}
        <div className="mb-5 text-center flex flex-col items-center">
          <img 
            src="/logo.svg" 
            alt="KampüsRadar Logo" 
            className="h-14 w-14 object-contain mb-2"
          />
          <h1 className="text-2xl font-extrabold text-white tracking-tight">KampüsRadar</h1>
          <p className="mt-1 text-slate-400 text-xs">Üniversitenin nabzını tutmaya hemen başla!</p>
        </div>

        {/* Hata Mesajı */}
        {errorMessage && (
          <div className="mb-4 flex items-start gap-3 rounded-lg border border-red-500/20 bg-red-500/10 p-2.5 text-xs text-red-400 animate-shake">
            <span>{errorMessage}</span>
          </div>
        )}

          <form onSubmit={handleSubmit} className="space-y-3">
            
            {/* Rol Seçimi (Öğrenci veya Organizatör) */}
            <div>
              <label className="mb-1.5 block text-xs font-medium text-slate-350">Hesap Türü</label>
              <div className="grid grid-cols-2 gap-2">
                <button
                  type="button"
                  onClick={() => setRole("student")}
                  className={`px-3 py-1.5 text-xs font-bold rounded-lg border transition cursor-pointer ${
                    role === "student"
                      ? "bg-white border-white text-slate-900 shadow-sm"
                      : "bg-slate-800 border-slate-700 text-slate-400 hover:text-white"
                  }`}
                >
                  Öğrenci
                </button>
                <button
                  type="button"
                  onClick={() => setRole("organizer")}
                  className={`px-3 py-1.5 text-xs font-bold rounded-lg border transition cursor-pointer ${
                    role === "organizer"
                      ? "bg-white border-white text-slate-900 shadow-sm"
                      : "bg-slate-800 border-slate-700 text-slate-400 hover:text-white"
                  }`}
                >
                  Organizatör
                </button>
              </div>
            </div>

            {/* Ad Soyad / Topluluk Adı Girişi */}
            <div>
              <label className="mb-0.5 block text-xs font-medium text-slate-300">
                {role === "student" ? "Ad Soyad" : "Topluluk Adı"}
              </label>
              <input 
                type="text" 
                value={fullName}
                onChange={(e) => setFullName(e.target.value)}
                placeholder={role === "student" ? "Ahmet Yılmaz" : "Müzik Kulübü"} 
                className="w-full rounded-lg border border-slate-700 bg-slate-800 px-3 py-1.5 text-xs text-white placeholder-slate-500 focus:border-blue-400 focus:outline-none focus:ring-1 focus:ring-blue-400 transition"
                required
              />
            </div>

            {/* E-posta Girişi */}
            <div>
              <label className="mb-0.5 block text-xs font-medium text-slate-300">E-posta Adresi</label>
              <input 
                type="email" 
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder={role === "student" ? "ahmet.yilmaz@ogrenci.edu.tr" : "topluluk@universite.edu.tr"} 
                className="w-full rounded-lg border border-slate-700 bg-slate-800 px-3 py-1.5 text-xs text-white placeholder-slate-500 focus:border-blue-400 focus:outline-none focus:ring-1 focus:ring-blue-400 transition"
                required
              />
            </div>

            {/* Şifre Girişi */}
            <div>
              <label className="mb-0.5 block text-xs font-medium text-slate-300">Şifre</label>
              <input 
                type="password" 
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••" 
                className="w-full rounded-lg border border-slate-700 bg-slate-800 px-3 py-1.5 text-xs text-white placeholder-slate-500 focus:border-blue-400 focus:outline-none focus:ring-1 focus:ring-blue-400 transition"
                required
              />
            </div>

            {/* Üniversite Seçimi */}
            <div>
              <label className="mb-0.5 block text-xs font-medium text-slate-300">Üniversite</label>
              <div className="relative">
                <select
                  value={universityId}
                  onChange={(e) => setUniversityId(e.target.value)}
                  disabled={loadingUnis}
                  className="w-full rounded-lg border border-slate-700 bg-slate-800 pl-3 pr-8 py-1.5 text-xs text-white focus:border-blue-400 focus:outline-none focus:ring-1 focus:ring-blue-400 transition appearance-none cursor-pointer disabled:opacity-50"
                  required
                >
                  <option value="" disabled className="bg-slate-900 text-slate-500">
                    {loadingUnis ? "Yükleniyor..." : "Üniversitenizi Seçin"}
                  </option>
                  {universities.map((uni) => (
                    <option key={uni.id} value={uni.id} className="bg-slate-900 text-white">
                      {uni.name}
                    </option>
                  ))}
                </select>
                <div className="absolute inset-y-0 right-0 flex items-center pr-2.5 pointer-events-none text-slate-400">
                  {loadingUnis ? (
                    <Loader2 className="w-3.5 h-3.5 animate-spin" />
                  ) : (
                    <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 9l-7 7-7-7" />
                    </svg>
                  )}
                </div>
              </div>
            </div>

            {/* Öğrenci Akademik Bilgileri */}
            {role === "student" && (
              <>
                <div>
                  <label className="mb-0.5 block text-xs font-medium text-slate-300">Fakülte</label>
                  <input 
                    type="text" 
                    value={faculty}
                    onChange={(e) => setFaculty(e.target.value)}
                    placeholder="Mühendislik Fakültesi" 
                    className="w-full rounded-lg border border-slate-700 bg-slate-800 px-3 py-1.5 text-xs text-white placeholder-slate-500 focus:border-blue-400 focus:outline-none focus:ring-1 focus:ring-blue-400 transition"
                    required
                  />
                </div>

                <div>
                  <label className="mb-0.5 block text-xs font-medium text-slate-300">Bölüm</label>
                  <input 
                    type="text" 
                    value={department}
                    onChange={(e) => setDepartment(e.target.value)}
                    placeholder="Bilgisayar Mühendisliği" 
                    className="w-full rounded-lg border border-slate-700 bg-slate-800 px-3 py-1.5 text-xs text-white placeholder-slate-500 focus:border-blue-400 focus:outline-none focus:ring-1 focus:ring-blue-400 transition"
                    required
                  />
                </div>

                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <label className="mb-0.5 block text-xs font-medium text-slate-300">Sınıf</label>
                    <select
                      value={classLevel}
                      onChange={(e) => setClassLevel(e.target.value)}
                      className="w-full rounded-lg border border-slate-700 bg-slate-800 px-3 py-1.5 text-xs text-white focus:border-blue-400 focus:outline-none focus:ring-1 focus:ring-blue-400 transition cursor-pointer"
                      required
                    >
                      <option value="" disabled className="bg-slate-900 text-slate-500">Seçin</option>
                      <option value="Hazırlık" className="bg-slate-900 text-white">Hazırlık</option>
                      <option value="1. Sınıf" className="bg-slate-900 text-white">1. Sınıf</option>
                      <option value="2. Sınıf" className="bg-slate-900 text-white">2. Sınıf</option>
                      <option value="3. Sınıf" className="bg-slate-900 text-white">3. Sınıf</option>
                      <option value="4. Sınıf" className="bg-slate-900 text-white">4. Sınıf</option>
                      <option value="Lisansüstü" className="bg-slate-900 text-white">Lisansüstü</option>
                    </select>
                  </div>
                  <div>
                    <label className="mb-0.5 block text-xs font-medium text-slate-300">Okul Numarası</label>
                    <input 
                      type="text" 
                      maxLength={9}
                      value={studentNumber}
                      onChange={(e) => setStudentNumber(e.target.value.replace(/\D/g, ""))}
                      placeholder="230101045" 
                      className="w-full rounded-lg border border-slate-700 bg-slate-800 px-3 py-1.5 text-xs text-white placeholder-slate-500 focus:border-blue-400 focus:outline-none focus:ring-1 focus:ring-blue-400 transition"
                      required
                    />
                  </div>
                </div>
              </>
            )}

            {/* Kayıt Ol Butonu */}
            <button 
              type="submit"
              disabled={isSubmitting}
              className="mt-4 w-full rounded-xl bg-white px-3 py-2 text-xs font-bold text-slate-900 transition hover:bg-slate-100 shadow-md cursor-pointer disabled:opacity-50 flex items-center justify-center gap-2"
            >
              {isSubmitting ? (
                <>
                  <Loader2 className="h-3.5 h-3.5 animate-spin" />
                  Kayıt Yapılıyor...
                </>
              ) : (
                "Kayıt Ol"
              )}
            </button>
          </form>

        {/* Giriş Yap Sayfasına Yönlendirme */}
        <p className="mt-4 text-center text-xs text-slate-400">
          Zaten hesabın var mı?{" "}
          <button 
            type="button" 
            onClick={() => navigate("/login")} 
            className="font-bold text-white underline hover:text-slate-200 cursor-pointer bg-transparent border-none p-0 inline"
          >
            Giriş Yap
          </button>
        </p>
        
      </div>

      {/* Başarı Modalı */}
      {showSuccessModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
          <div className="w-full max-w-sm rounded-2xl bg-slate-900 border border-slate-800 p-6 text-center text-white shadow-2xl animate-in fade-in zoom-in-95 duration-200">
            <div className="mb-4 flex justify-center">
              <div className="rounded-full bg-emerald-500/10 p-3 text-emerald-400">
                <CheckCircle className="h-14 w-14" />
              </div>
            </div>
            <h3 className="text-xl font-bold text-white mb-2">Kayıt Başarılı!</h3>
            <p className="text-slate-400 text-sm mb-6 leading-relaxed">
              Hesabınız başarıyla oluşturulmuştur.<br />Giriş sayfasına yönlendiriliyorsunuz...
            </p>
            <button
              onClick={() => navigate("/login", { state: { success: "Kaydınız başarıyla tamamlandı! Bilgilerinizle giriş yapabilirsiniz." } })}
              className="w-full rounded-xl bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-bold py-2.5 transition cursor-pointer"
            >
              Hemen Giriş Yap
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
