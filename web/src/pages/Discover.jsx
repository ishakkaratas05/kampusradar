import { Search, SlidersHorizontal } from "lucide-react";
import Navbar from "../components/Navbar";
import EventCard from "../components/EventCard";

export default function Discover() {
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
            <EventCard key={event.id} event={event} />
          ))}
        </div>
      </main>
    </div>
  );
}