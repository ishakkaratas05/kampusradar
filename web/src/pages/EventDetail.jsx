import { useParams, useNavigate } from "react-router-dom";
import { MapPin, Users, Calendar, ArrowLeft, Image as ImageIcon, Bookmark, Loader2, AlertCircle, School, CheckCircle, Clock, XCircle, AlertTriangle } from "lucide-react";
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

  // Katılım Durumu
  const [participation, setParticipation] = useState(null); // null, 'pending', 'approved', 'rejected'
  const [checkingParticipation, setCheckingParticipation] = useState(true);
  const [errorModal, setErrorModal] = useState({ isOpen: false, message: "" });

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
            profiles:organizer_id(full_name, logo_url)
          `)
          .eq("id", id)
          .single();

        if (error) throw error;

        setEvent({
          id: data.id,
          title: data.title,
          description: data.description,
          category: data.category,
          date: data.date 
            ? (() => {
                const d = new Date(data.date);
                const datePart = d.toLocaleString('tr-TR', { day: 'numeric', month: 'long', year: 'numeric' });
                const timePart = d.toLocaleString('tr-TR', { hour: '2-digit', minute: '2-digit' });
                return data.end_time ? `${datePart} ${timePart} – ${data.end_time}` : `${datePart} ${timePart}`;
              })()
            : "",
          location: data.location,
          university: data.universities?.name || "Bilinmeyen Üniversite",
          universityLogo: data.universities?.logo_url,
          organizer: data.profiles?.full_name || "Bilinmeyen Topluluk",
          organizerLogo: data.profiles?.logo_url,
          posterUrl: data.image_url,
          requiresApproval: data.requires_approval
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

  // Katılım Durumunu Kontrol Et
  useEffect(() => {
    async function checkParticipation() {
      if (!user) {
        setCheckingParticipation(false);
        return;
      }
      try {
        const { data, error } = await supabase
          .from("event_participants")
          .select("status")
          .eq("student_id", user.id)
          .eq("event_id", id)
          .maybeSingle();

        if (error) throw error;
        if (data) {
          setParticipation(data.status);
        } else {
          setParticipation(null);
        }
      } catch (err) {
        console.error("Katılım durumu kontrol hatası:", err.message);
      } finally {
        setCheckingParticipation(false);
      }
    }
    checkParticipation();
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

  const handleToggleJoin = async () => {
    if (!user) {
      navigate("/login");
      return;
    }

    try {
      setCheckingParticipation(true);
      if (participation) {
        // Katılımı iptal et
        const { error } = await supabase
          .from("event_participants")
          .delete()
          .eq("student_id", user.id)
          .eq("event_id", id);

        if (error) throw error;
        setParticipation(null);
      } else {
        // Katıl
        // Garanti olması için anlık olarak etkinlik onay gerektiriyor mu DB'den teyit edelim
        const { data: currentEvent } = await supabase
          .from("events")
          .select("requires_approval")
          .eq("id", id)
          .maybeSingle();
          
        const isApprovalRequired = currentEvent ? currentEvent.requires_approval : (event?.requiresApproval || event?.requires_approval);
        const initialStatus = isApprovalRequired ? "pending" : "approved";

        const { data: insertedData, error } = await supabase
          .from("event_participants")
          .insert({
            student_id: user.id,
            event_id: id,
            status: initialStatus
          })
          .select()
          .single();

        if (error) throw error;
        // Veritabanının kaydettiği kesin sonucu state'e ata
        setParticipation(insertedData.status);
      }
    } catch (err) {
      console.error("Katılım işlemi hatası:", err.message);
      setErrorModal({ isOpen: true, message: err.message });
    } finally {
      setCheckingParticipation(false);
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
                    {event.organizerLogo ? (
                      <div className="h-10 w-10 rounded-xl overflow-hidden shadow-sm shrink-0">
                        <img src={event.organizerLogo} alt={event.organizer} className="h-full w-full object-cover" />
                      </div>
                    ) : (
                      <div className="rounded-xl bg-slate-200/70 p-2.5 text-slate-900 shrink-0">
                        <Users className="h-5 w-5" />
                      </div>
                    )}
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
                {checkingParticipation ? (
                  <button disabled className="w-full rounded-2xl bg-slate-100 py-3.5 text-center text-sm font-extrabold text-gray-400 flex items-center justify-center gap-2 border border-gray-200">
                    <Loader2 className="h-4 w-4 animate-spin text-gray-400" />
                    Kontrol ediliyor...
                  </button>
                ) : participation === "approved" ? (
                  <div className="space-y-3">
                    <div className="flex items-center gap-2 bg-green-50 text-green-700 px-4 py-3 rounded-xl text-sm font-bold border border-green-200 justify-center">
                      <CheckCircle className="h-5 w-5 text-green-600" />
                      Katılımcısınız (Kabul Edildi)
                    </div>
                    <button 
                      onClick={handleToggleJoin}
                      className="w-full rounded-2xl border border-red-200 bg-red-50 py-3.5 text-center text-sm font-extrabold text-red-600 hover:bg-red-100 transition-all duration-300 cursor-pointer shadow-sm"
                    >
                      Katılımı İptal Et
                    </button>
                  </div>
                ) : participation === "pending" ? (
                  <div className="space-y-3">
                    <div className="flex items-center gap-2 bg-amber-50 text-amber-700 px-4 py-3 rounded-xl text-sm font-bold border border-amber-200 justify-center">
                      <Clock className="h-5 w-5 text-amber-600" />
                      Başvurunuz Onay Bekliyor
                    </div>
                    <button 
                      onClick={handleToggleJoin}
                      className="w-full rounded-2xl border border-gray-200 bg-slate-50 py-3.5 text-center text-sm font-extrabold text-gray-600 hover:bg-slate-100 transition-all duration-300 cursor-pointer shadow-sm"
                    >
                      Başvuruyu Geri Çek
                    </button>
                  </div>
                ) : participation === "rejected" ? (
                  <div className="flex items-center gap-2 bg-red-50 text-red-700 px-4 py-3 rounded-xl text-sm font-bold border border-red-200 justify-center">
                    <XCircle className="h-5 w-5 text-red-600" />
                    Katılım Başvurunuz Reddedildi
                  </div>
                ) : (
                  <button 
                    onClick={handleToggleJoin}
                    className="w-full rounded-2xl bg-slate-900 py-3.5 text-center text-sm font-extrabold text-white shadow-xl hover:bg-slate-800 transition-all duration-300 shadow-slate-900/10 cursor-pointer"
                  >
                    Etkinliğe Katıl
                  </button>
                )}
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

      {/* HATA MODALI */}
      {errorModal.isOpen && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center bg-slate-900/60 backdrop-blur-sm p-4">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-sm overflow-hidden flex flex-col transform transition-all">
            <div className="p-6 flex flex-col items-center text-center">
              <div className="w-16 h-16 bg-red-100 rounded-full flex items-center justify-center mb-4">
                <AlertTriangle className="h-8 w-8 text-red-500" />
              </div>
              <h3 className="text-xl font-extrabold text-slate-900 mb-2">Hata Oluştu</h3>
              <p className="text-slate-500 text-sm">
                {(() => {
                  const msg = errorModal.message || "";
                  if (msg.includes("schema cache") || msg.includes("column")) {
                    return "Sistem şu anda güncelleniyor. Lütfen birkaç saniye sonra tekrar deneyiniz.";
                  }
                  if (msg.includes("unique_event_student") || msg.includes("already exists")) {
                    return "Bu etkinliğe zaten katıldınız veya başvurdunuz.";
                  }
                  if (msg.includes("JWT") || msg.includes("token") || msg.includes("auth")) {
                    return "Oturumunuz geçersiz veya süresi dolmuş. Lütfen çıkış yapıp tekrar giriş yapın.";
                  }
                  return msg || "Beklenmeyen bir hata oluştu. Lütfen tekrar deneyin.";
                })()}
              </p>
            </div>
            <div className="px-6 py-4 bg-slate-50 border-t border-gray-100">
              <button 
                onClick={() => setErrorModal({ isOpen: false, message: "" })}
                className="w-full px-5 py-3 text-sm font-bold bg-slate-900 text-white rounded-xl hover:bg-slate-800 transition shadow-sm cursor-pointer"
              >
                Tamam, Anladım
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}