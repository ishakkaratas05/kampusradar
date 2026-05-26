import { School, Calendar, MapPin, Info } from "lucide-react";

export default function UniversityCard({ uni }) {
  return (
    // DEĞİŞİKLİK: bg-white karanlıkta bg-slate-900 olacak, border-gray-100 karanlıkta border-slate-800 olacak
    <div className="group flex flex-col sm:flex-row bg-white dark:bg-slate-900 rounded-2xl border border-gray-100 dark:border-slate-800 p-5 shadow-sm transition-all hover:shadow-xl hover:-translate-y-1 duration-300 gap-5 items-center sm:items-start w-full">
      
      {/* SOL KISIM: Rozet */}
      <div className="flex flex-col items-center justify-center w-24 h-24 sm:w-28 sm:h-28 shrink-0 bg-slate-50 dark:bg-slate-950 rounded-xl border border-slate-100 dark:border-slate-800 transition-colors group-hover:bg-slate-900 dark:group-hover:bg-blue-600">
        <School className="h-8 w-8 text-slate-900 dark:text-slate-300 transition-colors group-hover:text-white mb-1" />
        <span className="text-lg font-extrabold text-slate-900 dark:text-white tracking-tight transition-colors group-hover:text-white">
          {uni.abbreviation}
        </span>
      </div>

      {/* SAĞ KISIM */}
      <div className="flex-1 text-center sm:text-left flex flex-col justify-center h-full">
        {/* Yazılar karanlıkta beyaz olacak (dark:text-white) */}
        <h3 className="text-xl font-bold text-gray-900 dark:text-white leading-snug">{uni.name}</h3>
        
        <div className="mt-2.5 flex flex-wrap items-center justify-center sm:justify-start gap-2 text-[11px] font-bold uppercase tracking-wider">
          <span className="flex items-center gap-1 bg-red-50 dark:bg-red-900/30 text-red-700 dark:text-red-400 px-2.5 py-1 rounded-md border border-red-100 dark:border-red-900/50">
            <MapPin className="h-3.5 w-3.5" /> {uni.city}
          </span>
          <span className="flex items-center gap-1 bg-blue-50 dark:bg-blue-900/30 text-blue-700 dark:text-blue-400 px-2.5 py-1 rounded-md border border-blue-100 dark:border-blue-900/50">
            <Calendar className="h-3.5 w-3.5" /> Kuruluş: {uni.founded}
          </span>
        </div>

        <p className="mt-3 text-xs text-gray-600 dark:text-slate-400 leading-relaxed flex items-start gap-1.5 text-left line-clamp-3">
          <Info className="h-4 w-4 text-gray-400 shrink-0 mt-0.5 hidden sm:block" />
          {uni.history}
        </p>
      </div>
    </div>
  );
}