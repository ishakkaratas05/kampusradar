import { useParams, useNavigate } from "react-router-dom";
import { MapPin, Users, Calendar, ArrowLeft, Image as ImageIcon, Bookmark, Loader2, AlertCircle, School } from "lucide-react";
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
            universities(name, logo_url),
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
          universityLogo: data.universities?.logo_url,
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
      <div className="sticky top-0 z-10 bg-white px-6 py-4 shadow-sm flex items-center justify-between">
        <button
          onClick={() => navigate(-1)}
          className="flex items-center gap-2 text-sm font-semibold text-gray-600 hover:text-gray-900 cursor-pointer"
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

      <div className="mx-auto max-w-5xl sm:mt-6 px-4">
        {loadingEvent ? (
          <div className="flex flex-col items-center justify-center py-32 gap-3 text-gray-400 bg-white rounded-2xl border border-gray-100 shadow-sm">
            <Loader2 className="h-10 w-10 animate-spin text-slate-900" />
            <span className="text-sm font-semibold">Etkinlik detayları yükleniyor...</span>
          </div>
        ) : !event ? (
          <div className="flex flex-col items-center justify-center py-32 gap-3 text-red-500 bg-white rounded-2xl border border-gray-100 shadow-sm">
            <AlertCircle className="h-12 w-12" />
            <span className="text-sm font-semibold">Etkinlik bulunamadı veya silinmiş.</span>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-12 gap-5 items-stretch">
            {/* Sol Bölüm: Detaylar (Bağımsız Kart) */}
            <div className="md:col-span-6 bg-white rounded-2xl border border-gray-100 shadow-sm p-6 sm:p-8 flex flex-col justify-between min-h-[450px]">
              <div>
                {/* Üniversite Logo + Adı ve Kategori Rozetleri */}
                <div className="flex flex-wrap items-center gap-2 mb-4">
                  {event.universityLogo ? (
                    <div className="h-7 w-7 bg-white rounded-lg border border-gray-200 p-0.5 flex items-center justify-center shrink-0 shadow-sm">
                      <img src={event.universityLogo} alt={event.university} className="h-full w-full object-contain" />
                    </div>
                  ) : (
                    <div className="h-7 w-7 bg-slate-100 rounded-lg border border-gray-200 p-1 flex items-center justify-center shrink-0">
                      <School className="h-4 w-4 text-slate-400" />
                    </div>
                  )}
                  <span className="text-[10px] bg-slate-100 text-slate-700 font-extrabold tracking-widest uppercase px-2.5 py-1.5 rounded-md border border-slate-200">
                    {event.university}
                  </span>
                  <span className="text-[10px] bg-indigo-50 text-indigo-700 font-extrabold tracking-widest uppercase px-2.5 py-1.5 rounded-md border border-indigo-100">
                    {event.category}
                  </span>
                </div>
                
                <h1 className="text-2xl font-black text-gray-900 sm:text-3xl mt-2 leading-tight">
                  {event.title}
                </h1>

                {/* İkonlu Detay Kutuları */}
                <div className="mt-6 flex flex-col gap-4 rounded-2xl border border-gray-100 bg-slate-50/50 p-5">
                  <div className="flex items-center gap-3.5 text-gray-700">
                    <div className="rounded-xl bg-slate-200/70 p-2.5 text-slate-900">
                      <Users className="h-5 w-5" />
                    </div>
                    <div>
                      <p className="text-xs font-semibold text-gray-400">Düzenleyen</p>
                      <p className="font-bold text-gray-900 text-sm mt-0.5">{event.organizer}</p>
                    </div>
                  </div>

                  <div className="flex items-center gap-3.5 text-gray-700">
                    <div className="rounded-xl bg-slate-200/70 p-2.5 text-slate-900">
                      <Calendar className="h-5 w-5" />
                    </div>
                    <div>
                      <p className="text-xs font-semibold text-gray-400">Tarih ve Saat</p>
                      <p className="font-bold text-gray-900 text-sm mt-0.5">{event.date}</p>
                    </div>
                  </div>

                  <div className="flex items-center gap-3.5 text-gray-700">
                    <div className="rounded-xl bg-red-100/70 p-2.5 text-red-600">
                      <MapPin className="h-5 w-5" />
                    </div>
                    <div>
                      <p className="text-xs font-semibold text-gray-400">Konum</p>
                      <p className="font-bold text-gray-900 text-sm mt-0.5">{event.location}</p>
                    </div>
                  </div>
                </div>

                <div className="mt-8">
                  <h2 className="text-lg font-extrabold text-gray-900 border-b border-gray-100 pb-2 mb-3">
                    Etkinlik Hakkında
                  </h2>
                  <p className="leading-relaxed text-gray-600 text-sm whitespace-pre-wrap">
                    {event.description}
                  </p>
                </div>
              </div>

              {/* Katıl Butonu */}
              <div className="mt-8">
                <button className="w-full rounded-2xl bg-slate-900 py-3.5 text-center text-sm font-extrabold text-white shadow-xl hover:bg-slate-800 transition-all duration-300 shadow-slate-900/10">
                  Etkinliğe Katıl
                </button>
              </div>
            </div>

            {/* Sağ Bölüm: Afiş (Bağımsız Kart) */}
            <div className="md:col-span-6 bg-white rounded-2xl border border-gray-100 shadow-sm flex flex-col h-full overflow-hidden items-center justify-center">
              {event.posterUrl ? (
                <img 
                  src={event.posterUrl} 
                  alt={event.title} 
                  className="w-full h-full object-cover" 
                />
              ) : (
                <div className="flex flex-col items-center justify-center text-slate-400 gap-3 p-10">
                  <ImageIcon className="h-14 w-14 opacity-50" />
                  <span className="text-sm font-semibold">Afiş Bulunamadı</span>
                </div>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}