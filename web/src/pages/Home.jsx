import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import EventCard from "../components/EventCard";
import Navbar from "../components/Navbar";
import { useAuth } from "../context/AuthContext";
import { supabase } from "../lib/supabaseClient";
import { Loader2, Calendar } from "lucide-react";

export default function Home() {
  const navigate = useNavigate();
  const { user, profile } = useAuth();
  const [events, setEvents] = useState([]);
  const [loadingEvents, setLoadingEvents] = useState(true);
  const [savedEventIds, setSavedEventIds] = useState([]);
  const [universityInfo, setUniversityInfo] = useState(null);
  const [communities, setCommunities] = useState([]);
  const [selectedCommunityId, setSelectedCommunityId] = useState("");

  const isUUID = (id) => {
    return /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(String(id));
  };

  // Tüm Onaylanmış Etkinlikleri Yükle
  useEffect(() => {
    async function loadEvents() {
      try {
        setLoadingEvents(true);
        let query = supabase
          .from("events")
          .select(`
            *,
            universities(name, logo_url),
            profiles:organizer_id(full_name, logo_url)
          `)
          .eq("status", "approved")
          .order("date", { ascending: true });

        // Eğer kullanıcı öğrenciyse ve profil yüklendiyse, sadece kendi üniversitesindeki etkinlikleri filtrele
        if (profile?.role === "student" && profile?.university_id) {
          query = query.eq("university_id", profile.university_id);

          // Kullanıcının üniversite bilgilerini logoyu gösterebilmek için ayrıca çekelim
          const { data: uniData } = await supabase
            .from("universities")
            .select("name, logo_url")
            .eq("id", profile.university_id)
            .single();
            
          if (uniData) setUniversityInfo(uniData);
        }

        const { data, error } = await query;

        if (error) throw error;

        const formatted = (data || []).map(ev => ({
          id: ev.id,
          title: ev.title,
          description: ev.description,
          category: ev.category,
          date: ev.date 
            ? (() => {
                const d = new Date(ev.date);
                const datePart = d.toLocaleString('tr-TR', { day: 'numeric', month: 'long', year: 'numeric' });
                const timePart = d.toLocaleString('tr-TR', { hour: '2-digit', minute: '2-digit' });
                return ev.end_time ? `${datePart} ${timePart} – ${ev.end_time}` : `${datePart} ${timePart}`;
              })()
            : "",
          location: ev.location,
          university: ev.universities?.name || "Bilinmeyen Üniversite",
          universityLogo: ev.universities?.logo_url,
          organizer: ev.profiles?.full_name || "Bilinmeyen Topluluk",
          organizerLogo: ev.profiles?.logo_url,
          organizerId: ev.organizer_id,
          imageUrl: ev.image_url
        }));

        setEvents(formatted);
      } catch (err) {
        console.error("Etkinlikler yüklenirken hata:", err.message);
      } finally {
        setLoadingEvents(false);
      }
    }
    // Profil hazır olana kadar bekle, böylece doğru üniversiteye göre filtreleyebiliriz
    if (profile !== undefined) {
      loadEvents();
    }
  }, [profile]);

  // Üniversiteye ait toplulukları çek
  useEffect(() => {
    async function loadCommunities() {
      if (!profile?.university_id) return;
      try {
        const { data, error } = await supabase
          .from("profiles")
          .select("id, full_name")
          .eq("role", "organizer")
          .eq("university_id", profile.university_id)
          .order("full_name", { ascending: true });

        if (error) throw error;
        setCommunities(data || []);
      } catch (err) {
        console.error("Topluluklar yüklenirken hata:", err.message);
      }
    }
    if (profile !== undefined) {
      loadCommunities();
    }
  }, [profile]);

  // Kaydedilen Etkinlik ID'lerini Yükle
  useEffect(() => {
    async function loadSavedEvents() {
      if (!user) {
        setSavedEventIds([]);
        return;
      }

      const localMockKey = `saved_mock_events_${user.id}`;
      const localMockData = JSON.parse(localStorage.getItem(localMockKey) || "[]");

      try {
        const { data, error } = await supabase
          .from("saved_events")
          .select("event_id")
          .eq("student_id", user.id);

        if (error) throw error;
        const dbIds = (data || []).map(item => item.event_id);
        setSavedEventIds([...dbIds, ...localMockData]);
      } catch (err) {
        console.error("Favoriler yüklenirken hata:", err.message);
        setSavedEventIds(localMockData);
      }
    }
    loadSavedEvents();
  }, [user]);

  // Favoriye Ekleme / Kaldırma İşlemi
  const handleToggleSave = async (eventId) => {
    if (!user) {
      navigate("/login");
      return;
    }

    const isCurrentlySaved = savedEventIds.includes(eventId);

    if (isUUID(eventId)) {
      // Veritabanı Kaydı (Gerçek UUID Etkinlikler için)
      try {
        if (isCurrentlySaved) {
          const { error } = await supabase
            .from("saved_events")
            .delete()
            .eq("student_id", user.id)
            .eq("event_id", eventId);
          if (error) throw error;
          setSavedEventIds(prev => prev.filter(id => id !== eventId));
        } else {
          const { error } = await supabase
            .from("saved_events")
            .insert({
              student_id: user.id,
              event_id: eventId
            });
          if (error) throw error;
          setSavedEventIds(prev => [...prev, eventId]);
        }
      } catch (err) {
        console.error("Supabase favori işlemi hatası:", err.message);
      }
    } else {
      // Local Storage Kaydı (Mock Sayısal ID Etkinlikler için)
      const localMockKey = `saved_mock_events_${user.id}`;
      let localMockData = JSON.parse(localStorage.getItem(localMockKey) || "[]");

      if (isCurrentlySaved) {
        localMockData = localMockData.filter(id => id !== eventId);
        setSavedEventIds(prev => prev.filter(id => id !== eventId));
      } else {
        localMockData.push(eventId);
        setSavedEventIds(prev => [...prev, eventId]);
      }
      localStorage.setItem(localMockKey, JSON.stringify(localMockData));
    }
  };

  return (
    <div className="min-h-screen bg-gray-100">
      <Navbar />

      <main className="mx-auto max-w-2xl px-4 py-8">
        <div className="mb-6 flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-gray-200 pb-5">
          <div className="flex items-center gap-3">
            {universityInfo?.logo_url && (
              <div className="h-12 w-12 bg-white rounded-xl border border-gray-200 p-1.5 flex items-center justify-center shadow-sm shrink-0">
                <img src={universityInfo.logo_url} alt={universityInfo.name} className="h-full w-full object-contain" />
              </div>
            )}
            <div>
              <h2 className="text-xl font-bold text-gray-800">Kampüsündeki Etkinlikler</h2>
              {universityInfo?.name && (
                <p className="text-sm font-semibold text-slate-500">{universityInfo.name}</p>
              )}
            </div>
          </div>

          {/* Topluluk Filtresi */}
          <div className="shrink-0">
            <select
              value={selectedCommunityId}
              onChange={(e) => setSelectedCommunityId(e.target.value)}
              className="w-full sm:w-56 rounded-xl border border-gray-200 bg-white px-3 py-2 text-sm font-semibold text-gray-600 shadow-sm focus:outline-none focus:ring-1 focus:ring-slate-500"
            >
              <option value="">Tüm Topluluklar</option>
              {communities.map((club) => (
                <option key={club.id} value={club.id}>
                  {club.full_name}
                </option>
              ))}
            </select>
          </div>
        </div>

        {loadingEvents ? (
          <div className="flex flex-col items-center justify-center py-16 gap-3 text-gray-400 bg-white rounded-2xl border border-gray-150 shadow-sm">
            <Loader2 className="h-8 w-8 animate-spin text-slate-900" />
            <span className="text-sm font-medium">Etkinlikler yükleniyor...</span>
          </div>
        ) : (selectedCommunityId === "" ? events : events.filter(e => e.organizerId === selectedCommunityId)).length === 0 ? (
          <div className="flex flex-col items-center justify-center py-16 text-gray-400 bg-white rounded-2xl border border-gray-150 shadow-sm">
            <Calendar className="h-10 w-10 mb-3 text-gray-300" />
            <p className="text-sm font-medium">
              {selectedCommunityId === "" 
                ? "Henüz kampüsünüzde onaylanmış bir etkinlik bulunmuyor." 
                : "Bu topluluğa ait aktif bir etkinlik bulunamadı."}
            </p>
          </div>
        ) : (
          <div className="space-y-4">
            {(selectedCommunityId === "" ? events : events.filter(e => e.organizerId === selectedCommunityId)).map((event) => (
              <EventCard 
                key={event.id} 
                event={event} 
                isSaved={savedEventIds.includes(event.id)}
                onToggleSave={handleToggleSave}
              />
            ))}
          </div>
        )}
      </main>
    </div>
  );
}