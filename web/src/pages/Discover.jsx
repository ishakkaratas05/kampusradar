import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { Search, SlidersHorizontal, Loader2, Calendar as CalendarIcon } from "lucide-react";
import Navbar from "../components/Navbar";
import EventCard from "../components/EventCard";
import { useAuth } from "../context/AuthContext";
import { supabase } from "../lib/supabaseClient";

export default function Discover() {
  const navigate = useNavigate();
  const { user } = useAuth();
  
  const [events, setEvents] = useState([]);
  const [loadingEvents, setLoadingEvents] = useState(true);
  const [universities, setUniversities] = useState([]);
  const [savedEventIds, setSavedEventIds] = useState([]);

  // Arama & Filtre State
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedUniId, setSelectedUniId] = useState("");

  const isUUID = (id) => {
    return /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(String(id));
  };

  // Üniversiteleri Yükle
  useEffect(() => {
    async function loadUniversities() {
      try {
        const { data, error } = await supabase
          .from("universities")
          .select("id, name")
          .order("name", { ascending: true });
        if (error) throw error;
        setUniversities(data || []);
      } catch (err) {
        console.error("Üniversiteler yüklenirken hata:", err.message);
      }
    }
    loadUniversities();
  }, []);

  // Tüm Onaylı Etkinlikleri Yükle
  useEffect(() => {
    async function loadEvents() {
      try {
        setLoadingEvents(true);
        const { data, error } = await supabase
          .from("events")
          .select(`
            *,
            universities(name),
            profiles:organizer_id(full_name)
          `)
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
          universityId: ev.university_id,
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
    loadEvents();
  }, []);

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

  // Filtrelenmiş Etkinlikler listesi
  const filteredEvents = events.filter(event => {
    const matchesSearch = 
      event.title?.toLocaleLowerCase("tr-TR").includes(searchQuery.toLocaleLowerCase("tr-TR")) ||
      event.description?.toLocaleLowerCase("tr-TR").includes(searchQuery.toLocaleLowerCase("tr-TR")) ||
      event.location?.toLocaleLowerCase("tr-TR").includes(searchQuery.toLocaleLowerCase("tr-TR")) ||
      event.category?.toLocaleLowerCase("tr-TR").includes(searchQuery.toLocaleLowerCase("tr-TR"));

    const matchesUniversity = selectedUniId === "" || event.universityId === selectedUniId;

    return matchesSearch && matchesUniversity;
  });

  return (
    <div className="min-h-screen bg-gray-100">
      <Navbar />

      <main className="mx-auto max-w-2xl px-4 py-8">
        <div className="mb-6">
          <h2 className="text-2xl font-extrabold text-gray-900">Diğer Kampüsleri Keşfet</h2>
          <p className="text-sm text-gray-500 mt-1">Çevrendeki tüm üniversitelerin etkinliklerine göz at.</p>
        </div>

        {/* Arama ve Filtreler */}
        <div className="mb-6 flex flex-col gap-3 sm:flex-row">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-3 h-5 w-5 text-gray-400" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Etkinlik veya üniversite ara..."
              className="w-full rounded-xl border border-gray-200 bg-white py-2.5 pl-10 pr-4 text-sm shadow-sm focus:border-slate-500 focus:outline-none focus:ring-1 focus:ring-slate-500"
            />
          </div>
          
          <div className="flex gap-2">
            <select 
              value={selectedUniId}
              onChange={(e) => setSelectedUniId(e.target.value)}
              className="rounded-xl border border-gray-200 bg-white px-3 py-2 text-sm font-medium text-gray-600 shadow-sm focus:outline-none focus:ring-1 focus:ring-slate-500"
            >
              <option value="">Tüm Üniversiteler</option>
              {universities.map(uni => (
                <option key={uni.id} value={uni.id}>{uni.name}</option>
              ))}
            </select>
          </div>
        </div>

        {loadingEvents ? (
          <div className="flex flex-col items-center justify-center py-16 gap-3 text-gray-400 bg-white rounded-2xl border border-gray-150 shadow-sm">
            <Loader2 className="h-8 w-8 animate-spin text-slate-900" />
            <span className="text-sm font-medium">Keşif haritası yükleniyor...</span>
          </div>
        ) : filteredEvents.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-16 text-gray-400 bg-white rounded-2xl border border-gray-150 shadow-sm">
            <CalendarIcon className="h-10 w-10 mb-3 text-gray-300" />
            <p className="text-sm font-medium">Eşleşen aktif bir etkinlik bulunamadı.</p>
          </div>
        ) : (
          <div className="space-y-4">
            {filteredEvents.map((event) => (
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