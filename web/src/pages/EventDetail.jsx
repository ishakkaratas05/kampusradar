import { useParams, useNavigate } from "react-router-dom";
import { MapPin, Users, Calendar, ArrowLeft, Image as ImageIcon, Bookmark } from "lucide-react";
import { useState, useEffect } from "react";
import { useAuth } from "../context/AuthContext";
import { supabase } from "../lib/supabaseClient";

export default function EventDetail() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { user } = useAuth();

  const [isSaved, setIsSaved] = useState(false);
  const [checkingSave, setCheckingSave] = useState(true);

  // Favori Durumunu Kontrol Et
  useEffect(() => {
    async function checkIsSaved() {
      if (!user) {
        setCheckingSave(false);
        return;
      }
      try {
        const { data, error } = await supabase
          .from("saved_events")
          .select("id")
          .eq("student_id", user.id)
          .eq("event_id", id)
          .maybeSingle();

        if (error) throw error;
        setIsSaved(!!data);
      } catch (err) {
        console.error("Favori durumu kontrol hatası:", err.message);
      } finally {
        setCheckingSave(false);
      }
    }
    checkIsSaved();
  }, [user, id]);

  const handleToggleSave = async () => {
    if (!user) {
      navigate("/login");
      return;
    }

    try {
      if (isSaved) {
        const { error } = await supabase
          .from("saved_events")
          .delete()
          .eq("student_id", user.id)
          .eq("event_id", id);
        
        if (error) throw error;
        setIsSaved(false);
      } else {
        const { error } = await supabase
          .from("saved_events")
          .insert({
            student_id: user.id,
            event_id: id
          });
        
        if (error) throw error;
        setIsSaved(true);
      }
    } catch (err) {
      console.error("Favori islemi hatasi:", err.message);
    }
  };

  const event = {
    id: id,
    title: "Yapay Zeka ve Geleceğin Meslekleri",
    university: "Gazi Üniversitesi",
    organizer: "Yapay Zeka Öğrenci Topluluğu",
    category: "Seminer",
    date: "28 Mayıs 2026 - 14:00",
    location: "Mühendislik Fakültesi Konferans Salonu",
    description: "Sektörden uzmanların katılımıyla yapay zekanın iş dünyasına etkileri konuşulacak. Etkinlikte ayrıca sürpriz çekilişler ve network şansı sizleri bekliyor. Kontenjan sınırlıdır, lütfen yerinizi önceden ayırtın.",
    posterUrl: "https://images.unsplash.com/photo-1591115765373-5207764f72e7?q=80&w=2070&auto=format&fit=crop" 
  };

  return (
    <div className="min-h-screen bg-gray-50 pb-10">
      
      {/* Üst Bar */}
      <div className="sticky top-0 z-10 bg-white px-4 py-4 shadow-sm flex items-center justify-between">
        <button
          onClick={() => navigate(-1)}
          className="flex items-center gap-2 text-sm font-medium text-gray-600 hover:text-gray-900 cursor-pointer"
        >
          <ArrowLeft className="h-5 w-5" />
          Geri Dön
        </button>
        <button
          type="button"
          onClick={handleToggleSave}
          disabled={checkingSave}
          className="flex items-center gap-1.5 text-sm font-bold text-slate-800 hover:text-slate-950 cursor-pointer disabled:opacity-50"
        >
          <Bookmark className={`h-5 w-5 ${isSaved ? "fill-slate-900 text-slate-900" : ""}`} />
          {isSaved ? "Kaydedildi" : "Kaydet"}
        </button>
      </div>

      <main className="mx-auto max-w-2xl bg-white shadow-sm sm:mt-6 sm:overflow-hidden sm:rounded-2xl">
        
        {/* Afiş Alanı (Koyu etiketli) */}
        <div className="relative h-64 w-full bg-gray-200 sm:h-80">
          {event.posterUrl ? (
            <img src={event.posterUrl} alt={event.title} className="h-full w-full object-cover" />
          ) : (
            <div className="flex h-full w-full items-center justify-center text-gray-400">
              <ImageIcon className="h-12 w-12" />
              <span className="ml-2">Afiş Bulunamadı</span>
            </div>
          )}
          <div className="absolute left-4 top-4 rounded-lg bg-slate-900 px-3 py-1 text-xs font-bold text-white uppercase tracking-wider shadow-md">
            {event.category}
          </div>
        </div>

        {/* Detay İçeriği */}
        <div className="p-6 sm:p-8">
          <h1 className="text-2xl font-extrabold text-gray-900 sm:text-3xl">{event.title}</h1>

          {/* İkonlu Detay Kutuları */}
          <div className="mt-6 flex flex-col gap-4 rounded-xl border border-gray-100 bg-gray-50 p-4">
            <div className="flex items-center gap-3 text-gray-700">
              <div className="rounded-full bg-slate-200 p-2 text-slate-900">
                <Users className="h-5 w-5" />
              </div>
              <div>
                <p className="text-xs text-gray-500">Düzenleyen</p>
                <p className="font-semibold">{event.organizer} ({event.university})</p>
              </div>
            </div>

            <div className="flex items-center gap-3 text-gray-700">
              <div className="rounded-full bg-slate-200 p-2 text-slate-900">
                <Calendar className="h-5 w-5" />
              </div>
              <div>
                <p className="text-xs text-gray-500">Tarih ve Saat</p>
                <p className="font-semibold">{event.date}</p>
              </div>
            </div>

            <div className="flex items-center gap-3 text-gray-700">
              <div className="rounded-full bg-red-100 p-2 text-red-600">
                <MapPin className="h-5 w-5" />
              </div>
              <div>
                <p className="text-xs text-gray-500">Konum</p>
                <p className="font-semibold">{event.location}</p>
              </div>
            </div>
          </div>

          <div className="mt-8">
            <h2 className="mb-2 text-lg font-bold text-gray-900">Etkinlik Hakkında</h2>
            <p className="leading-relaxed text-gray-600">{event.description}</p>
          </div>

          {/* Koyu Lacivert Katıl Butonu */}
          <div className="mt-8">
            <button className="w-full rounded-xl bg-slate-900 py-3 text-center text-lg font-bold text-white shadow-lg transition hover:bg-slate-800 shadow-slate-900/10">
              Etkinliğe Katıl
            </button>
          </div>
          
        </div>
      </main>
    </div>
  );
}