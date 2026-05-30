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

  const isUUID = (id) => {
    return /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(String(id));
  };

  // Üniversite Etkinliklerini Yükle
  useEffect(() => {
    async function loadEvents() {
      if (!profile?.university_id) return;
      try {
        setLoadingEvents(true);
        const { data, error } = await supabase
          .from("events")
          .select(`
            *,
            universities(name),
            profiles:organizer_id(full_name)
          `)
          .eq("university_id", profile.university_id)
          .eq("status", "approved")
          .order("date", { ascending: true });

        if (error) throw error;

        const formatted = (data || []).map(ev => ({
          id: ev.id,
          title: ev.title,
          description: ev.description,
          category: ev.category,
          date: ev.date ? new Date(ev.date).toLocaleString('tr-TR', { day: 'numeric', month: 'long', year: 'numeric', hour: '2-digit', minute: '2-digit' }) : "",
          location: ev.location,
          university: ev.universities?.name || "Bilinmeyen Üniversite",
          organizer: ev.profiles?.full_name || "Bilinmeyen Topluluk",
          imageUrl: ev.image_url
        }));

        setEvents(formatted);
      } catch (err) {
        console.error("Etkinlikler yüklenirken hata:", err.message);
      } finally {
        setLoadingEvents(false);
      }
    }
    if (profile) {
      loadEvents();
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
        <div className="mb-6 flex items-center justify-between">
          <h2 className="text-xl font-bold text-gray-800">Kampüsündeki Etkinlikler</h2>
          <button className="text-sm font-medium text-slate-900 hover:underline" onClick={() => navigate("/discover")}>Tümünü Gör</button>
        </div>

        {loadingEvents ? (
          <div className="flex flex-col items-center justify-center py-16 gap-3 text-gray-400 bg-white rounded-2xl border border-gray-150 shadow-sm">
            <Loader2 className="h-8 w-8 animate-spin text-slate-900" />
            <span className="text-sm font-medium">Etkinlikler yükleniyor...</span>
          </div>
        ) : events.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-16 text-gray-400 bg-white rounded-2xl border border-gray-150 shadow-sm">
            <Calendar className="h-10 w-10 mb-3 text-gray-300" />
            <p className="text-sm font-medium">Henüz kampüsünüzde onaylanmış bir etkinlik bulunmuyor.</p>
          </div>
        ) : (
          <div className="space-y-4">
            {events.map((event) => (
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