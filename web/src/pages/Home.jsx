import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import EventCard from "../components/EventCard";
import Navbar from "../components/Navbar";
import { useAuth } from "../context/AuthContext";
import { supabase } from "../lib/supabaseClient";

export default function Home() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [savedEventIds, setSavedEventIds] = useState([]);

  const mockEvents = [
    {
      id: 1,
      title: "Yapay Zeka ve Geleceğin Meslekleri",
      university: "Gazi Üniversitesi",
      organizer: "Yapay Zeka Öğrenci Topluluğu",
      category: "Seminer",
      date: "28 Mayıs 2026 - 14:00",
      location: "Mühendislik Fakültesi Konferans Salonu",
      description: "Sektörden uzmanların katılımıyla yapay zekanın iş dünyasına etkileri konuşulacak."
    },
    {
      id: 2,
      title: "Bahar Şenliği Açılış Konseri",
      university: "Gazi Üniversitesi",
      organizer: "Rektörlük",
      category: "Şenlik",
      date: "1 Haziran 2026 - 20:00",
      location: "Kampüs Ana Meydan",
      description: "Bahar şenlikleri harika bir konser ve sürpriz etkinliklerle başlıyor!"
    },
    {
      id: 3,
      title: "Girişimcilik Hackathonu",
      university: "Gazi Üniversitesi",
      organizer: "Fen Fakültesi Dekanlığı",
      category: "Yarışma",
      date: "5 Haziran 2026 - 09:00",
      location: "Teknokent Kuluçka Merkezi",
      description: "Fikrini koda dök, 48 saat sürecek maratonda büyük ödülü kazanma şansı yakala."
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
        <div className="mb-6 flex items-center justify-between">
          <h2 className="text-xl font-bold text-gray-800">Kampüsündeki Etkinlikler</h2>
          <button className="text-sm font-medium text-slate-900 hover:underline">Tümünü Gör</button>
        </div>

        <div className="space-y-4">
          {mockEvents.map((event) => (
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