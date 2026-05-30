import { useParams, useNavigate } from "react-router-dom";
import { MapPin, Users, Calendar, ArrowLeft, Image as ImageIcon, Bookmark, Loader2, AlertCircle } from "lucide-react";
import { useState, useEffect } from "react";
import { useAuth } from "../context/AuthContext";
import { supabase } from "../lib/supabaseClient";

export default function EventDetail() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { user } = useAuth();

  const [event, setEvent] = useState(null);
  const [loadingEvent, setLoadingEvent] = useState(true);
  const [isSaved, setIsSaved] = useState(false);
  const [checkingSave, setCheckingSave] = useState(true);

  // Etkinlik Detaylarını Yükle
  useEffect(() => {
    async function fetchEventDetails() {
      try {
        setLoadingEvent(true);
        const { data, error } = await supabase
          .from("events")
          .select(`
            *,
            universities(name),
            profiles:organizer_id(full_name)
          `)
          .eq("id", id)
          .single();

        if (error) throw error;

        setEvent({
          id: data.id,
          title: data.title,
          description: data.description,
          category: data.category,
          date: data.date ? new Date(data.date).toLocaleString('tr-TR', { day: 'numeric', month: 'long', year: 'numeric', hour: '2-digit', minute: '2-digit' }) : "",
          location: data.location,
          university: data.universities?.name || "Bilinmeyen Üniversite",
          organizer: data.profiles?.full_name || "Bilinmeyen Topluluk",
          posterUrl: data.image_url
        });
      } catch (err) {
        console.error("Etkinlik detayları yüklenirken hata:", err.message);
      } finally {
        setLoadingEvent(false);
      }
    }
    fetchEventDetails();
  }, [id]);

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
          disabled={checkingSave || loadingEvent}
          className="flex items-center gap-1.5 text-sm font-bold text-slate-800 hover:text-slate-950 cursor-pointer disabled:opacity-50"
        >
          <Bookmark className={`h-5 w-5 ${isSaved ? "fill-slate-900 text-slate-900" : ""}`} />
          {isSaved ? "Kaydedildi" : "Kaydet"}
        </button>
      </div>

      <main className="mx-auto max-w-2xl bg-white shadow-sm sm:mt-6 sm:overflow-hidden sm:rounded-2xl">
        {loadingEvent ? (
          <div className="flex flex-col items-center justify-center py-32 gap-3 text-gray-400">
            <Loader2 className="h-10 w-10 animate-spin text-slate-900" />
            <span className="text-sm font-semibold">Etkinlik detayları yükleniyor...</span>
          </div>
        ) : !event ? (
          <div className="flex flex-col items-center justify-center py-32 gap-3 text-red-500">
            <AlertCircle className="h-12 w-12" />
            <span className="text-sm font-semibold">Etkinlik bulunamadı veya silinmiş.</span>
          </div>
        ) : (
          <>
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
          </>
        )}
      </main>
    </div>
  );
}