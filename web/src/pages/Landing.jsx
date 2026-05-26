import { useNavigate } from "react-router-dom";
import { ArrowRight } from "lucide-react";
import UniversityCard from "../components/UniversityCard";

export default function Landing() {
  const navigate = useNavigate();

  const universities = [
    { 
      id: 1, 
      name: "Gazi Üniversitesi", 
      abbreviation: "GAZİ",
      city: "Ankara", 
      founded: "1926", 
      history: "Gazi Mustafa Kemal Atatürk'ün talimatıyla 'Orta Muallim Mektebi' olarak kurulmuştur. Cumhuriyetin en köklü eğitim kurumlarından biridir." 
    },
    { 
      id: 2, 
      name: "Orta Doğu Teknik Üniversitesi", 
      abbreviation: "ODTÜ",
      city: "Ankara", 
      founded: "1956", 
      history: "Türkiye ve Orta Doğu ülkelerinin kalkınmalarına katkıda bulunmak, özellikle fen ve sosyal bilimler alanlarında eleman yetiştirmek amacıyla kurulmuştur." 
    },
    { 
      id: 3, 
      name: "İstanbul Teknik Üniversitesi", 
      abbreviation: "İTÜ",
      city: "İstanbul", 
      founded: "1773", 
      history: "Mühendishane-i Bahr-i Hümayun adıyla kurulan İTÜ, dünyanın en eski teknik üniversitelerinden biridir ve mühendislik eğitiminin beşiğidir." 
    }
  ];

  return (
    <div className="min-h-screen bg-gray-50">
      
      {/* Koyu Üst Bar */}
      <header className="bg-slate-900 border-b border-slate-800 px-6 py-4 shadow-sm flex items-center justify-between sticky top-0 z-50 text-white">
        <div className="flex items-center gap-2">
          <img src="/logo.svg" alt="Logo" className="h-8 w-8 object-contain" />
          <span className="text-2xl font-extrabold tracking-tight">KampusRadar</span>
        </div>
        <button
          onClick={() => navigate("/login")}
          className="rounded-xl bg-white px-5 py-2 text-sm font-bold text-slate-900 shadow-md transition hover:bg-slate-100"
        >
          Giriş Yap
        </button>
      </header>

      {/* Video Arka Planlı Hero Alanı */}
      <section className="relative flex items-center justify-center py-32 px-4 text-center overflow-hidden">
        
        {/* Arka Planda Dönen Video */}
        <video 
          autoPlay 
          loop 
          muted 
          playsInline
          className="absolute inset-0 w-full h-full object-cover z-0"
        >
          <source src="/video.mp4" type="video/mp4" />
          Tarayıcınız video etiketini desteklemiyor.
        </video>

        {/* Karartma Perdesi */}
        <div className="absolute inset-0 bg-slate-900/75 z-10"></div>

        {/* İçerik */}
        <div className="relative z-20 max-w-3xl mx-auto text-white">
          <h1 className="text-4xl sm:text-5xl md:text-6xl font-extrabold tracking-tight leading-tight">
            Üniversitendeki Tüm Etkinlikler Tek Bir Radarda!
          </h1>
          <p className="mt-6 text-lg md:text-xl text-slate-300 max-w-2xl mx-auto">
            KampusRadar, öğrencilerin kendi kampüslerindeki şenlik, konferans, turnuva ve seminerlerden anında haberdar olmasını sağlayan ortak bir platformdur.
          </p>
          <div className="mt-10 flex justify-center gap-4">
            <button 
              onClick={() => navigate("/login")}
              className="flex items-center gap-2 rounded-xl bg-white px-8 py-4 text-lg font-bold text-slate-900 shadow-2xl transition hover:bg-slate-100 hover:scale-105"
            >
              Keşfetmeye Başla
              <ArrowRight className="h-6 w-6 text-slate-900" />
            </button>
          </div>
        </div>
      </section>

      {/* Üniversiteler Listesi (Genişletilmiş ve 2 Sütunlu Grid Yapısı) */}
      <section className="max-w-6xl mx-auto px-4 py-20">
        <div className="text-center mb-16">
          <h2 className="text-3xl font-extrabold text-gray-900">Sistemdeki Üniversiteler</h2>
          <p className="text-gray-500 mt-2 text-lg">KampusRadar ağına katılmış aktif kampüsler ve kısa tarihçeleri</p>
        </div>

        {/* DEĞİŞİKLİK: Büyük ekranlarda yan yana 2 kart sığacak şekilde grid-cols-2 yaptık */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {universities.map((uni) => (
            <UniversityCard key={uni.id} uni={uni} />
          ))}
        </div>
      </section>

    </div>
  );
}