import { MapPin, Users, School, Bookmark } from "lucide-react"; 
import { useNavigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";

export default function EventCard({ event, isSaved = false, onToggleSave = null }) {
  const navigate = useNavigate();
  const { user } = useAuth();

  const handleSaveClick = (e) => {
    e.stopPropagation();
    if (!user) {
      navigate("/login");
      return;
    }
    if (onToggleSave) {
      onToggleSave(event.id);
    }
  };

  return (
    <div className="rounded-xl border border-gray-200 bg-white p-5 shadow-sm transition hover:shadow-md relative">
      
      {/* Kategori ve Tarih */}
      <div className="mb-3 flex items-start justify-between">
        <span className="rounded-lg bg-slate-100 px-2.5 py-1 text-xs font-bold text-slate-800 uppercase tracking-wider">
          {event.category}
        </span>
        <div className="flex items-center gap-2">
          <span className="text-sm font-medium text-gray-500">{event.date}</span>
          <button 
            type="button"
            onClick={handleSaveClick}
            className="text-gray-400 hover:text-slate-950 transition cursor-pointer p-1 rounded-full hover:bg-slate-50 flex items-center justify-center"
            title={isSaved ? "Kaydedilenlerden Çıkar" : "Etkinliği Kaydet"}
          >
            <Bookmark className={`h-5 w-5 ${isSaved ? "fill-slate-900 text-slate-900" : ""}`} />
          </button>
        </div>
      </div>
      
      {/* Başlık */}
      <h3 className="text-lg font-bold text-gray-900">{event.title}</h3>
      
      {/* Üniversite ve Düzenleyici Alanı */}
      <div className="mt-1.5 mb-3 flex flex-wrap items-center gap-x-4 gap-y-1 text-sm font-medium text-gray-600">
        <div className="flex items-center gap-1.5">
          <School className="h-4 w-4 text-blue-500" />
          <span className="text-gray-800">{event.university}</span>
        </div>
        <div className="flex items-center gap-1.5">
          <Users className="h-4 w-4 text-gray-400" />
          <span>{event.organizer}</span>
        </div>
      </div>
      
      {/* Açıklama */}
      <p className="mb-3 text-sm text-gray-600 line-clamp-2">{event.description}</p>
      
      {/* Konum ve Detay Butonu */}
      <div className="mt-2 flex items-center justify-between border-t border-gray-100 pt-3">
        <span className="flex items-center gap-1 text-sm font-medium text-gray-500">
          <MapPin className="h-4 w-4 text-red-500" />
          {event.location}
        </span>
        <button 
          onClick={() => navigate(`/event/${event.id}`)}
          className="text-sm font-bold text-slate-900 hover:text-slate-700 transition"
        >
          İncele &rarr;
        </button>
      </div>

    </div>
  );
}