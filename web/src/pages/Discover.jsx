import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { Search, SlidersHorizontal } from "lucide-react";
import Navbar from "../components/Navbar";
import EventCard from "../components/EventCard";
import { useAuth } from "../context/AuthContext";
import { supabase } from "../lib/supabaseClient";

export default function Discover() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [savedEventIds, setSavedEventIds] = useState([]);

  const discoverEvents = [
    {
      id: 4,
      title: "Uluslararası Girişimcilik Zirvesi '26",
      university: "ODTÜ",
      organizer: "Girişimcilik Kulübü",
      category: "Konferans",
      date: "10 Haziran 2026 - 10:00",
      location: "ODTÜ Kültür ve Kongre Merkezi",
      description: "Dünyanın dört bir yanından gelen başarılı girişimciler hikayelerini ve tecrübelerini paylaşıyor."
    },
    {
      id: 5,
      title: "Robot Günleri Yarışması",
      university: "İTÜ",
      organizer: "Robotik Topluluğu",
      category: "Yarışma",
      date: "15 Haziran 2026 - 09:00",
      location: "İTÜ Ayazağa Kampüsü SDKM",
      description: "Çizgi izleyen, mini sumo ve insansız hava araçları kategorilerinde yüzlerce robot yarışıyor!"
    },
    {
      id: 6,
      title: "Açık Hava Sinema Gecesi",
      university: "Yıldız Teknik Üniversitesi",
      organizer: "Sinema Topluluğu",
      category: "Sosyal",
      date: "18 Haziran 2026 - 21:00",
      location: "Yıldız Teknik Üniversitesi Davutpaşa Kampüsü",
      description: "Yıldızların altında, çimlerin üzerinde patlamış mısır eşliğinde ödüllü bir film keyfi."
    }
  ];

  const isUUID = (id) => {
    return /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(String(id));
  };

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
              placeholder="Etkinlik veya üniversite ara..."
              className="w-full rounded-xl border border-gray-200 bg-white py-2.5 pl-10 pr-4 text-sm shadow-sm focus:border-slate-500 focus:outline-none focus:ring-1 focus:ring-slate-500"
            />
          </div>
          
          <div className="flex gap-2">
            <select className="rounded-xl border border-gray-200 bg-white px-3 py-2 text-sm font-medium text-gray-600 shadow-sm focus:outline-none focus:ring-1 focus:ring-slate-500">
              <option value="">Tüm Üniversiteler</option>
              <option value="odtü">ODTÜ</option>
              <option value="itü">İTÜ</option>
              <option value="ytü">YTÜ</option>
            </select>

            <button className="flex items-center gap-1.5 rounded-xl border border-gray-200 bg-white px-3 py-2 text-sm font-medium text-gray-600 shadow-sm hover:bg-gray-50">
              <SlidersHorizontal className="h-4 w-4" />
              Filtrele
            </button>
          </div>
        </div>

        <div className="space-y-4">
          {discoverEvents.map((event) => (
            <EventCard 
              key={event.id} 
              event={event} 
              isSaved={savedEventIds.includes(event.id)}
              onToggleSave={handleToggleSave}
            />
          ))}
        </div>
      </main>
    </div>
  );
}