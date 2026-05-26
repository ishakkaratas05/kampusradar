import EventCard from "../components/EventCard";
import Navbar from "../components/Navbar";

export default function Home() {
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
            <EventCard key={event.id} event={event} />
          ))}
        </div>
      </main>
    </div>
  );
}