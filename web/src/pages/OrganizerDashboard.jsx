import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { Plus, ArrowLeft, Calendar, MapPin, X, FileText, CheckCircle, Clock, XCircle, Sparkles, Loader2, UploadCloud, AlertTriangle, Check, RefreshCw } from "lucide-react";
import { useAuth } from "../context/AuthContext";
import { supabase } from "../lib/supabaseClient";

export default function OrganizerDashboard() {
  const navigate = useNavigate();
  const { user, profile } = useAuth();

  const [myEvents, setMyEvents] = useState([]);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [isGenerating, setIsGenerating] = useState(false);
  const [isUploading, setIsUploading] = useState(false);

  const [aiPreview, setAiPreview] = useState({ isOpen: false, url: "", blob: null, isLoading: false, hasError: false });
  const [errorModal, setErrorModal] = useState({ isOpen: false, message: "" });

  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [newEvent, setNewEvent] = useState({ title: "", category: "", date: "", location: "", description: "", capacity: "", image_url: "", fileToUpload: null });

  // Etkinlikleri Yükle
  useEffect(() => {
    async function fetchMyEvents() {
      if (!user) return;
      try {
        setLoading(true);
        const { data, error } = await supabase
          .from("events")
          .select("*")
          .eq("organizer_id", user.id)
          .order("created_at", { ascending: false });

        if (error) throw error;
        setMyEvents(data || []);
      } catch (err) {
        console.error("Etkinlikler yüklenirken hata:", err.message);
      } finally {
        setLoading(false);
      }
    }
    fetchMyEvents();
  }, [user]);

  const formatTitleCase = (text) => {
    if (!text) return "";
    return text.split(" ").map(word => {
      if (word.length === 0) return "";
      return word.charAt(0).toLocaleUpperCase("tr-TR") + word.slice(1).toLocaleLowerCase("tr-TR");
    }).join(" ");
  };

  const handleFormSubmit = async (e) => {
    e.preventDefault();
    if (!user || !profile) return;

    try {
      setSubmitting(true);
      let finalImageUrl = newEvent.image_url;

      // 1. Önce görseli Supabase'e yükle (eğer yeni bir dosya seçilmişse veya AI üretmişse)
      if (newEvent.fileToUpload) {
        const fileExt = newEvent.fileToUpload.name ? newEvent.fileToUpload.name.split('.').pop() : 'jpg';
        const fileName = `poster_${Math.random().toString(36).substring(2, 10)}_${Date.now()}.${fileExt}`;
        const filePath = `posters/${fileName}`;

        const { error: uploadError } = await supabase.storage
          .from('public-assets')
          .upload(filePath, newEvent.fileToUpload, { 
            contentType: newEvent.fileToUpload.type || 'image/jpeg' 
          });

        if (uploadError) throw uploadError;

        const { data: publicUrlData } = supabase.storage
          .from('public-assets')
          .getPublicUrl(filePath);

        finalImageUrl = publicUrlData.publicUrl;
      } else if (finalImageUrl && finalImageUrl.startsWith('blob:')) {
        // Eğer fileToUpload yok ama URL blob ise (beklenmeyen durum), DB'ye blob kaydetme
        finalImageUrl = null;
      }

      // 2. Etkinlik verisini veritabanına kaydet
      const { data, error } = await supabase
        .from("events")
        .insert([{
          title: newEvent.title,
          category: newEvent.category,
          date: newEvent.date,
          location: newEvent.location,
          description: newEvent.description,
          capacity: newEvent.capacity ? parseInt(newEvent.capacity, 10) : null,
          image_url: finalImageUrl || null,
          university_id: profile.university_id,
          organizer_id: user.id,
          status: "pending"
        }])
        .select();

      if (error) throw error;

      setMyEvents(prev => [data[0], ...prev]);
      setIsAddModalOpen(false);
      
      if (newEvent.image_url && newEvent.image_url.startsWith('blob:')) {
        URL.revokeObjectURL(newEvent.image_url);
      }
      setNewEvent({ title: "", category: "", date: "", location: "", description: "", capacity: "", image_url: "", fileToUpload: null });
    } catch (err) {
      console.error("Etkinlik oluşturma hatası:", err.message);
      alert("Etkinlik başvurusu gönderilirken hata oluştu: " + err.message);
    } finally {
      setSubmitting(false);
    }
  };

  const handleFileUpload = (e) => {
    const file = e.target.files[0];
    if (!file) return;

    // Önceki blob URL'i varsa temizle (bellek sızıntısını önler)
    if (newEvent.image_url && newEvent.image_url.startsWith('blob:')) {
      URL.revokeObjectURL(newEvent.image_url);
    }

    // Yükleme işlemini SKS'ye Gönder anına erteliyoruz
    setNewEvent(prev => ({ 
      ...prev, 
      image_url: URL.createObjectURL(file), // Sadece önizleme için yerel URL
      fileToUpload: file // Gönderirken Supabase'e yüklenecek asıl dosya
    }));
    
    // Inputu sıfırla ki aynı dosyayı tekrar seçebilsin
    e.target.value = null;
  };

  // ========== CANVAS AFİŞ ÜRETİCİ ==========
  const POSTER_PALETTES = [
    { bg: ['#6366f1','#8b5cf6','#a855f7'], text: '#ffffff', accent: 'rgba(255,255,255,0.12)', badge: '#4f46e5' },
    { bg: ['#0f172a','#1e293b','#334155'], text: '#f1f5f9', accent: 'rgba(99,102,241,0.18)', badge: '#6366f1' },
    { bg: ['#dc2626','#f97316','#fbbf24'], text: '#ffffff', accent: 'rgba(255,255,255,0.10)', badge: '#b91c1c' },
    { bg: ['#059669','#10b981','#34d399'], text: '#ffffff', accent: 'rgba(255,255,255,0.12)', badge: '#047857' },
    { bg: ['#2563eb','#3b82f6','#60a5fa'], text: '#ffffff', accent: 'rgba(255,255,255,0.10)', badge: '#1d4ed8' },
    { bg: ['#7c3aed','#a855f7','#d946ef'], text: '#ffffff', accent: 'rgba(255,255,255,0.12)', badge: '#6d28d9' },
    { bg: ['#0f172a','#581c87','#7c3aed'], text: '#f1f5f9', accent: 'rgba(167,139,250,0.15)', badge: '#7c3aed' },
    { bg: ['#0c4a6e','#0284c7','#38bdf8'], text: '#ffffff', accent: 'rgba(255,255,255,0.10)', badge: '#0369a1' },
  ];

  const wrapText = (ctx, text, maxWidth) => {
    const words = text.split(' ');
    const lines = [];
    let currentLine = '';
    for (const word of words) {
      const testLine = currentLine ? currentLine + ' ' + word : word;
      if (ctx.measureText(testLine).width > maxWidth && currentLine) {
        lines.push(currentLine);
        currentLine = word;
      } else {
        currentLine = testLine;
      }
    }
    if (currentLine) lines.push(currentLine);
    return lines;
  };

  const generateCanvasPoster = (title, category, date, location, description) => {
    const W = 768, H = 1024;
    const canvas = document.createElement('canvas');
    canvas.width = W;
    canvas.height = H;
    const ctx = canvas.getContext('2d');

    const palette = POSTER_PALETTES[Math.floor(Math.random() * POSTER_PALETTES.length)];

    // 1. Gradient arka plan
    const grad = ctx.createLinearGradient(0, 0, W * 0.3, H);
    palette.bg.forEach((c, i) => grad.addColorStop(i / (palette.bg.length - 1), c));
    ctx.fillStyle = grad;
    ctx.fillRect(0, 0, W, H);

    // 2. Dekoratif daireler
    for (let i = 0; i < 5; i++) {
      ctx.beginPath();
      const r = 80 + Math.random() * 200;
      ctx.arc(Math.random() * W, Math.random() * H, r, 0, Math.PI * 2);
      ctx.fillStyle = palette.accent;
      ctx.fill();
    }

    // 3. Dekoratif çizgiler
    ctx.strokeStyle = palette.accent;
    ctx.lineWidth = 1.5;
    for (let i = 0; i < 8; i++) {
      ctx.beginPath();
      ctx.moveTo(Math.random() * W, Math.random() * H);
      ctx.lineTo(Math.random() * W, Math.random() * H);
      ctx.stroke();
    }

    // 4. Üst dekoratif çizgi
    ctx.fillStyle = palette.text;
    ctx.globalAlpha = 0.3;
    ctx.fillRect(60, 80, 100, 4);
    ctx.globalAlpha = 1;

    // 5. "KampüsRadar" marka yazısı
    ctx.font = 'bold 18px "Segoe UI", Arial, sans-serif';
    ctx.fillStyle = palette.text;
    ctx.globalAlpha = 0.6;
    ctx.fillText('KampüsRadar', 60, 120);
    ctx.globalAlpha = 1;

    // 6. Kategori badge
    if (category) {
      const badgeText = category.toUpperCase();
      ctx.font = 'bold 16px "Segoe UI", Arial, sans-serif';
      const badgeW = ctx.measureText(badgeText).width + 32;
      ctx.fillStyle = palette.badge;
      ctx.globalAlpha = 0.9;
      const roundRect = (x, y, w, h, r) => {
        ctx.beginPath();
        ctx.moveTo(x + r, y);
        ctx.lineTo(x + w - r, y);
        ctx.quadraticCurveTo(x + w, y, x + w, y + r);
        ctx.lineTo(x + w, y + h - r);
        ctx.quadraticCurveTo(x + w, y + h, x + w - r, y + h);
        ctx.lineTo(x + r, y + h);
        ctx.quadraticCurveTo(x, y + h, x, y + h - r);
        ctx.lineTo(x, y + r);
        ctx.quadraticCurveTo(x, y, x + r, y);
        ctx.closePath();
        ctx.fill();
      };
      roundRect(60, 180, badgeW, 36, 8);
      ctx.globalAlpha = 1;
      ctx.fillStyle = '#ffffff';
      ctx.fillText(badgeText, 76, 204);
    }

    // 7. Ana başlık (büyük, kalın, word-wrap)
    ctx.font = 'bold 56px "Segoe UI", Arial, sans-serif';
    ctx.fillStyle = palette.text;
    const titleLines = wrapText(ctx, title, W - 120);
    const titleY = category ? 280 : 240;
    titleLines.forEach((line, i) => {
      ctx.fillText(line, 60, titleY + i * 68);
    });

    let currentY = titleY + (titleLines.length * 68) + 10;

    // 7.5 Açıklama Metni (Detaylı Bilgi)
    if (description) {
      ctx.font = 'normal 24px "Segoe UI", Arial, sans-serif';
      ctx.fillStyle = palette.text;
      ctx.globalAlpha = 0.85;
      
      const descLines = wrapText(ctx, description, W - 120);
      const maxDescLines = 5; // En fazla 5 satır açıklama sığdır
      for (let i = 0; i < Math.min(descLines.length, maxDescLines); i++) {
        let text = descLines[i];
        if (i === maxDescLines - 1 && descLines.length > maxDescLines) {
           text += '...';
        }
        ctx.fillText(text, 60, currentY + i * 36);
      }
      ctx.globalAlpha = 1;
    }

    // 8. Alt bilgi bölgesi — yarı-saydam bar
    ctx.fillStyle = 'rgba(0,0,0,0.25)';
    ctx.fillRect(0, H - 220, W, 220);

    // 9. Tarih bilgisi
    let infoY = H - 170;
    ctx.font = '600 20px "Segoe UI", Arial, sans-serif';
    ctx.fillStyle = palette.text;
    ctx.globalAlpha = 0.7;
    if (date) {
      try {
        const d = new Date(date);
        const formatted = d.toLocaleString('tr-TR', { day: 'numeric', month: 'long', year: 'numeric', hour: '2-digit', minute: '2-digit' });
        ctx.fillText('📅  ' + formatted, 60, infoY);
        infoY += 40;
      } catch(e) {}
    }

    // 10. Konum bilgisi
    if (location) {
      ctx.fillText('📍  ' + location, 60, infoY);
      infoY += 40;
    }
    ctx.globalAlpha = 1;

    // 11. Alt çizgi dekorasyon
    ctx.fillStyle = palette.text;
    ctx.globalAlpha = 0.15;
    ctx.fillRect(60, H - 50, W - 120, 2);
    ctx.globalAlpha = 0.4;
    ctx.font = '14px "Segoe UI", Arial, sans-serif';
    ctx.fillText('kampusradar.com', 60, H - 25);
    ctx.globalAlpha = 1;

    return canvas;
  };

  const handleAIImageGenerate = async () => {
    if (!newEvent.title) {
      setErrorModal({ isOpen: true, message: "Lütfen önce bir etkinlik başlığı girin. Yapay zeka başlığa uygun bir afiş tasarlayacaktır." });
      return;
    }

    setIsGenerating(true);

    try {
      // Canvas ile afiş üret
      const canvas = generateCanvasPoster(
        newEvent.title,
        newEvent.category,
        newEvent.date,
        newEvent.location,
        newEvent.description
      );

      // Canvas'ı blob'a çevir
      const blob = await new Promise((resolve) => canvas.toBlob(resolve, 'image/jpeg', 0.92));
      const previewUrl = URL.createObjectURL(blob);

      setAiPreview({ isOpen: true, url: previewUrl, blob, isLoading: false, hasError: false });
    } catch (err) {
      console.error("Afiş üretim hatası:", err);
      setErrorModal({ isOpen: true, message: "Afiş oluşturulurken beklenmeyen bir hata oluştu." });
    } finally {
      setIsGenerating(false);
    }
  };

  const handleConfirmAIPreview = () => {
    // Önceki blob URL'i varsa temizle
    if (newEvent.image_url && newEvent.image_url.startsWith('blob:')) {
      URL.revokeObjectURL(newEvent.image_url);
    }

    // Supabase yüklemesini SKS'ye Gönder anına erteliyoruz
    setNewEvent(prev => ({ 
      ...prev, 
      image_url: aiPreview.url, // Zaten bir blob URL (Canvas'tan gelen)
      fileToUpload: aiPreview.blob // Gönderilirken yüklenecek blob veri
    }));
    
    setAiPreview({ isOpen: false, url: "", blob: null, isLoading: false, hasError: false });
  };

  const handleRetryAIPreview = () => {
    if (aiPreview.url) URL.revokeObjectURL(aiPreview.url);
    setAiPreview({ isOpen: false, url: "", blob: null, isLoading: false, hasError: false });
    handleAIImageGenerate();
  };

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col relative">
      
      <header className="bg-slate-900 px-6 py-4 shadow-md flex items-center justify-between text-white sticky top-0 z-40">
        <div className="flex items-center gap-4">
          <button onClick={() => navigate("/")} className="p-2 bg-slate-800 rounded-lg hover:bg-slate-700 transition cursor-pointer">
            <ArrowLeft className="h-5 w-5 text-slate-300" />
          </button>
          <div>
            <h1 className="text-xl font-extrabold tracking-tight">{profile?.full_name || "Organizatör"}</h1>
            <p className="text-xs text-slate-400 font-medium">Etkinlik Düzenleme Paneli</p>
          </div>
        </div>
        <span className="text-sm font-bold bg-white text-slate-900 px-3 py-1.5 rounded-lg shadow-sm">
          Organizatör
        </span>
      </header>

      <main className="flex-1 max-w-4xl w-full mx-auto px-4 py-8">
        
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center mb-8 gap-4">
          <div>
            <h2 className="text-2xl font-bold text-gray-900">Etkinlik Taleplerimiz</h2>
            <p className="text-sm text-gray-500 mt-1">SKS'ye gönderilen başvurular ve onay durumları.</p>
          </div>
          <button 
            onClick={() => setIsAddModalOpen(true)}
            className="flex items-center gap-2 bg-slate-900 text-white px-5 py-2.5 rounded-xl font-bold shadow-md hover:bg-slate-800 transition cursor-pointer"
          >
            <Plus className="h-5 w-5" />
            Yeni Etkinlik Başvurusu
          </button>
        </div>

        {loading ? (
          <div className="flex flex-col items-center justify-center py-16 gap-3 text-gray-400 bg-white rounded-2xl border border-gray-250 shadow-sm">
            <Loader2 className="h-8 w-8 animate-spin text-slate-900" />
            <span className="text-sm font-medium">Talepler yükleniyor...</span>
          </div>
        ) : myEvents.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-16 text-gray-400 bg-white rounded-2xl border border-gray-250 shadow-sm">
            <FileText className="h-10 w-10 mb-3 text-gray-300" />
            <p className="text-sm font-medium">Henüz oluşturduğunuz bir etkinlik başvurusu bulunmuyor.</p>
          </div>
        ) : (
          <div className="space-y-4">
            {myEvents.map((ev) => (
              <div key={ev.id} className="bg-white p-5 rounded-2xl border border-gray-100 shadow-sm flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
                <div>
                  <span className="text-[10px] bg-slate-100 border border-slate-200 text-slate-700 font-black tracking-widest uppercase px-2 py-0.5 rounded-md">{ev.category}</span>
                  <h3 className="text-lg font-bold text-gray-900 mt-1.5">{ev.title}</h3>
                  <div className="mt-2 flex items-center gap-4 text-xs font-medium text-gray-400">
                    <span className="flex items-center gap-1"><Calendar className="h-3.5 w-3.5" /> {ev.date ? new Date(ev.date).toLocaleString('tr-TR', { day: 'numeric', month: 'long', year: 'numeric', hour: '2-digit', minute: '2-digit' }) : ""}</span>
                    <span className="flex items-center gap-1"><MapPin className="h-3.5 w-3.5" /> {ev.location}</span>
                  </div>
                </div>

                <div className="shrink-0">
                  {ev.status === "approved" && (
                    <span className="flex items-center gap-1.5 bg-green-50 text-green-700 px-3 py-1.5 rounded-xl text-xs font-bold border border-green-100">
                      <CheckCircle className="h-4 w-4" /> Yayınlandı (SKS Onaylı)
                    </span>
                  )}
                  {ev.status === "pending" && (
                    <span className="flex items-center gap-1.5 bg-amber-50 text-amber-700 px-3 py-1.5 rounded-xl text-xs font-bold border border-amber-100">
                      <Clock className="h-4 w-4" /> SKS Onayı Bekliyor
                    </span>
                  )}
                  {ev.status === "rejected" && (
                    <div className="flex flex-col items-end gap-1">
                      <span className="flex items-center gap-1.5 bg-red-50 text-red-700 px-3 py-1.5 rounded-xl text-xs font-bold border border-red-100">
                        <XCircle className="h-4 w-4" /> Reddedildi
                      </span>
                      {ev.rejection_reason && (
                        <span className="text-[11px] text-red-600 font-medium">
                          Sebep: {ev.rejection_reason}
                        </span>
                      )}
                    </div>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </main>

      {/* YENİ ETKİNLİK BAŞVURU FORMU POP-UP MODALI */}
      {isAddModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-sm p-4 sm:p-8 overflow-hidden">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-4xl flex flex-col max-h-[90vh]">
            <div className="px-6 py-4 border-b border-gray-100 flex items-center justify-between bg-slate-50 shrink-0">
              <h3 className="text-lg font-bold text-slate-900 flex items-center gap-2">
                <FileText className="h-5 w-5 text-slate-500" /> Yeni Etkinlik İzin Talebi
              </h3>
              <button onClick={() => setIsAddModalOpen(false)} className="text-gray-400 hover:text-gray-600"><X className="h-5 w-5" /></button>
            </div>
            
            <div className="overflow-y-auto p-6">
              <form onSubmit={handleFormSubmit} className="flex flex-col">
                <div className="flex flex-col md:flex-row gap-8">
                
                {/* SOL SÜTUN: FORM ALANLARI */}
                <div className="flex-1 flex flex-col gap-5">
                  <div>
                    <label className="block text-sm font-semibold text-gray-700 mb-1">Etkinlik Başlığı</label>
                    <input 
                      required type="text" placeholder="Örn: Blokzincir Teknolojileri Zirvesi"
                      value={newEvent.title} 
                      onChange={(e) => setNewEvent({...newEvent, title: formatTitleCase(e.target.value)})}
                      className="w-full px-4 py-2 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-slate-900"
                    />
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-semibold text-gray-700 mb-1">Kategori</label>
                      <input 
                        required type="text" placeholder="Örn: Seminer"
                        value={newEvent.category} 
                        onChange={(e) => setNewEvent({...newEvent, category: formatTitleCase(e.target.value)})}
                        className="w-full px-4 py-2 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-slate-900"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-semibold text-gray-700 mb-1">Tarih / Saat</label>
                      <input 
                        required type="datetime-local" 
                        value={newEvent.date} 
                        onChange={(e) => setNewEvent({...newEvent, date: e.target.value})}
                        className="w-full px-4 py-2 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-slate-900 text-sm"
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-semibold text-gray-700 mb-1">Konum / Salon</label>
                      <input 
                        required type="text" placeholder="Örn: Rektörlük Salonu"
                        value={newEvent.location} 
                        onChange={(e) => setNewEvent({...newEvent, location: formatTitleCase(e.target.value)})}
                        className="w-full px-4 py-2 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-slate-900"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-semibold text-gray-700 mb-1">Kapasite (Kişi Sayısı - Opsiyonel)</label>
                      <input 
                        type="number" placeholder="Örn: 150"
                        value={newEvent.capacity} 
                        onChange={(e) => setNewEvent({...newEvent, capacity: e.target.value})}
                        className="w-full px-4 py-2 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-slate-900"
                      />
                    </div>
                  </div>

                  <div className="flex-1 flex flex-col">
                    <label className="block text-sm font-semibold text-gray-700 mb-1">Detaylı Açıklama</label>
                    <textarea 
                      required placeholder="SKS onay heyetinin görmesi için etkinlik detayları..."
                      value={newEvent.description} onChange={(e) => setNewEvent({...newEvent, description: e.target.value})}
                      className="flex-1 w-full px-4 py-2 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-slate-900 resize-none"
                      style={{ minHeight: '120px' }}
                    ></textarea>
                  </div>
                </div>

                {/* SAĞ SÜTUN: AFİŞ ALANI */}
                <div className="w-full md:w-[280px] shrink-0 flex flex-col gap-4">
                  <div>
                    <label className="block text-sm font-semibold text-gray-700 mb-1">Etkinlik Afişi</label>
                    <p className="text-[11px] text-gray-500 mb-3">1080x1350 boyutlarında (4:5 oranında) görsel önerilir.</p>
                    
                    <div className="w-full aspect-[4/5] bg-slate-50 border-2 border-dashed border-slate-300 rounded-2xl overflow-hidden relative flex flex-col items-center justify-center group transition hover:border-slate-400 shadow-inner">
                      {newEvent.image_url ? (
                        <>
                          <img src={newEvent.image_url} alt="Afiş Önizleme" className="w-full h-full object-cover" />
                          <button 
                            type="button" 
                            onClick={() => {
                              if (newEvent.image_url && newEvent.image_url.startsWith('blob:')) {
                                URL.revokeObjectURL(newEvent.image_url);
                              }
                              setNewEvent(prev => ({ ...prev, image_url: "", fileToUpload: null }));
                            }}
                            className="absolute top-3 right-3 bg-red-500/90 hover:bg-red-600 text-white p-2 rounded-full shadow-lg transition backdrop-blur-sm cursor-pointer"
                          >
                            <X className="h-4 w-4" />
                          </button>
                        </>
                      ) : (
                        <div className="flex flex-col items-center gap-3 text-slate-400 p-6 text-center">
                          <FileText className="h-12 w-12 opacity-50" />
                          <div>
                            <p className="text-sm font-bold text-slate-500">Afiş Görseli Yok</p>
                            <p className="text-xs mt-1">Lütfen bir görsel yükleyin veya AI ile saniyeler içinde yeni bir afiş tasarlayın.</p>
                          </div>
                        </div>
                      )}
                    </div>
                  </div>

                  <div className="flex flex-col gap-3 mt-auto">
                    <div className="relative">
                      <input 
                        type="file" 
                        accept="image/*"
                        onChange={handleFileUpload}
                        className="hidden" 
                        id="file-upload"
                      />
                      <label 
                        htmlFor="file-upload" 
                        className="flex items-center justify-center gap-2 w-full px-4 py-3 border border-slate-300 bg-white rounded-xl hover:bg-slate-50 transition cursor-pointer text-sm font-bold text-slate-700 shadow-sm"
                      >
                        {isUploading ? <Loader2 className="h-5 w-5 animate-spin text-slate-400" /> : <UploadCloud className="h-5 w-5 text-slate-500" />}
                        {isUploading ? "Yükleniyor..." : "Cihazdan Görsel Seç"}
                      </label>
                    </div>
                    
                    <button 
                      type="button" 
                      onClick={handleAIImageGenerate}
                      disabled={isGenerating || isUploading}
                      className="flex items-center justify-center gap-2 border border-purple-200 bg-purple-50 text-purple-700 rounded-xl px-4 py-3 hover:bg-purple-100 transition shadow-sm group cursor-pointer disabled:opacity-50"
                    >
                      {isGenerating ? <Loader2 className="h-5 w-5 animate-spin text-purple-500" /> : <Sparkles className="h-5 w-5 text-purple-500 group-hover:scale-110 transition-transform" />}
                      <span className="text-sm font-extrabold tracking-tight">{isGenerating ? "Üretiliyor..." : "Canvas ile Afiş Üret"}</span>
                    </button>
                  </div>
                </div>
              </div>
              
                {/* ALT GÖNDER BUTONLARI */}
                <div className="mt-8 flex justify-end gap-3 pt-5 border-t border-gray-100">
                  <button type="button" onClick={() => setIsAddModalOpen(false)} className="px-6 py-2.5 text-sm font-bold text-gray-600 hover:bg-gray-100 rounded-xl transition cursor-pointer">İptal</button>
                  <button 
                    type="submit" 
                    disabled={submitting}
                    className="px-6 py-2.5 text-sm font-bold bg-slate-900 text-white rounded-xl hover:bg-slate-800 transition shadow-md flex items-center gap-2 cursor-pointer disabled:opacity-50"
                  >
                    {submitting && <Loader2 className="h-4 w-4 animate-spin" />}
                    Talebi SKS'ye Gönder
                  </button>
                </div>
              </form>
            </div>
          </div>
        </div>
      )}

      {/* HATA MODALI */}
      {errorModal.isOpen && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center bg-slate-900/60 backdrop-blur-sm p-4">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-sm overflow-hidden flex flex-col transform transition-all">
            <div className="p-6 flex flex-col items-center text-center">
              <div className="w-16 h-16 bg-red-100 rounded-full flex items-center justify-center mb-4">
                <AlertTriangle className="h-8 w-8 text-red-500" />
              </div>
              <h3 className="text-xl font-extrabold text-slate-900 mb-2">Hata Oluştu</h3>
              <p className="text-slate-500 text-sm">{errorModal.message}</p>
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

      {/* AI ÖNİZLEME VE ONAY MODALI */}
      {aiPreview.isOpen && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center bg-slate-900/80 backdrop-blur-md p-4 overflow-y-auto">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md overflow-hidden flex flex-col my-8">
            <div className="px-6 py-4 border-b border-gray-100 flex items-center justify-between bg-slate-50">
              <h3 className="text-lg font-bold text-slate-900 flex items-center gap-2">
                <Sparkles className="h-5 w-5 text-purple-500" /> AI Afişiniz Hazır!
              </h3>
              <button 
                onClick={() => setAiPreview({ isOpen: false, url: "", blob: null })} 
                className="text-gray-400 hover:text-gray-600 bg-gray-100 rounded-full p-1 transition cursor-pointer"
              >
                <X className="h-5 w-5" />
              </button>
            </div>
            
            <div className="p-6 bg-slate-100 flex flex-col items-center justify-center">
              <div className="relative rounded-xl overflow-hidden shadow-lg border border-slate-200 w-full max-w-[320px] aspect-[3/4] bg-white">
                {aiPreview.url && (
                  <img 
                    src={aiPreview.url} 
                    alt="AI Generated Poster" 
                    className="w-full h-full object-cover"
                  />
                )}
              </div>
              <p className="text-sm text-slate-500 mt-4 text-center font-medium">
                Bu görseli etkinliğinizin resmi afişi olarak kullanmak ister misiniz?
              </p>
            </div>
            
            <div className="p-4 bg-white border-t border-gray-100 flex flex-col gap-3">
              <button 
                onClick={handleConfirmAIPreview}
                disabled={isUploading}
                className="w-full flex items-center justify-center gap-2 px-5 py-3 text-sm font-bold bg-green-500 text-white rounded-xl hover:bg-green-600 transition shadow-md cursor-pointer disabled:opacity-50"
              >
                {isUploading ? <Loader2 className="h-5 w-5 animate-spin" /> : <Check className="h-5 w-5" />}
                {isUploading ? "Kaydediliyor..." : "Beğendim, Afişi Kullan"}
              </button>
              
              <button 
                onClick={handleRetryAIPreview}
                disabled={isUploading}
                className="w-full flex items-center justify-center gap-2 px-5 py-3 text-sm font-bold text-slate-700 bg-slate-100 hover:bg-slate-200 border border-slate-200 rounded-xl transition cursor-pointer disabled:opacity-50"
              >
                <RefreshCw className="h-4 w-4" />
                Beğenmedim, Yeniden Üret
              </button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
}