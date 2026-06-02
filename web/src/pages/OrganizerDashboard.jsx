import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { Plus, ArrowLeft, Calendar, MapPin, X, FileText, CheckCircle, Clock, XCircle, Sparkles, Loader2, UploadCloud, AlertTriangle, Check, RefreshCw, Trash2, Users, School, BadgeCheck } from "lucide-react";
import { useAuth } from "../context/AuthContext";
import { supabase } from "../lib/supabaseClient";
import ProfileDropdown from "../components/ProfileDropdown";
import { jsPDF } from "jspdf";
import autoTable from "jspdf-autotable";
import { addOpenSansFont } from "../lib/OpenSans-Regular-normal.js";

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
  const [deleteModal, setDeleteModal] = useState({ isOpen: false, eventId: null });
  const [viewEvent, setViewEvent] = useState(null);
  const [manageEvent, setManageEvent] = useState(null);
  const [participants, setParticipants] = useState([]);
  const [loadingParticipants, setLoadingParticipants] = useState(false);

  // Katılımcıları Çek
  useEffect(() => {
    async function fetchParticipants() {
      if (!manageEvent) {
        setParticipants([]);
        return;
      }
      try {
        setLoadingParticipants(true);
        const { data, error } = await supabase
          .from("event_participants")
          .select(`
            id,
            status,
            joined_at,
            profiles:student_id(id, full_name)
          `)
          .eq("event_id", manageEvent.id)
          .order("joined_at", { ascending: false });

        if (error) throw error;
        setParticipants(data || []);
      } catch (err) {
        console.error("Katılımcılar yüklenirken hata:", err.message);
      } finally {
        setLoadingParticipants(false);
      }
    }
    fetchParticipants();
  }, [manageEvent]);

  // Katılımcı Durumunu Güncelle (Onayla/Reddet)
  const handleUpdateParticipantStatus = async (participantId, newStatus) => {
    try {
      const { error } = await supabase
        .from("event_participants")
        .update({ status: newStatus })
        .eq("id", participantId);

      if (error) throw error;

      setParticipants(prev => {
        const updated = prev.map(p => p.id === participantId ? { ...p, status: newStatus } : p);
        
        // Ana listedeki katılımcı sayılarını gerçek zamanlı güncelle
        setMyEvents(prevEvents => 
          prevEvents.map(ev => {
            if (manageEvent && ev.id === manageEvent.id) {
              return {
                ...ev,
                event_participants: updated.map(u => ({ status: u.status }))
              };
            }
            return ev;
          })
        );
        
        return updated;
      });
    } catch (err) {
      console.error("Katılımcı durumu güncellenirken hata:", err.message);
      alert("Durum güncellenirken bir hata oluştu: " + err.message);
    }
  };

  const generatePDF = () => {
    if (!manageEvent) return;
    
    // Yüklediğimiz tam karakter setine sahip özel fontu jsPDF'e kaydediyoruz
    addOpenSansFont();
    
    const doc = new jsPDF();
    doc.setFont('OpenSans', 'normal'); // Türkçe karakter destekleyen yeni OpenSans fontunu aktifleştir
    
    // Header
    doc.setFontSize(18);
    doc.text("KAMPÜSRADAR - ETKİNLİK KATILIMCI RAPORU", 14, 22);
    
    doc.setFontSize(11);
    doc.text(`Etkinlik: ${manageEvent.title}`, 14, 32);
    doc.text(`Tarih: ${manageEvent.date ? new Date(manageEvent.date).toLocaleDateString('tr-TR') : "-"}`, 14, 38);
    doc.text(`Kategori: ${manageEvent.category}`, 14, 44);
    doc.text(`Üniversite: ${universityName || profile?.universities?.name || 'Bilinmiyor'}`, 14, 50);
    
    // Only approved participants
    const approvedParticipants = participants.filter(p => p.status === 'approved');
    
    const tableColumn = ["#", "Öğrenci Adı Soyadı", "Katılım Durumu", "Katılım Tarihi"];
    const tableRows = [];

    approvedParticipants.forEach((p, index) => {
      const rowData = [
        index + 1,
        p.profiles?.full_name || 'Bilinmeyen Öğrenci',
        "Kabul Edildi",
        p.joined_at ? new Date(p.joined_at).toLocaleDateString('tr-TR') : "-"
      ];
      tableRows.push(rowData);
    });

    autoTable(doc, {
      head: [tableColumn],
      body: tableRows,
      startY: 56,
      styles: { font: 'OpenSans', fontSize: 10, cellPadding: 3 },
      headStyles: { font: 'OpenSans', fontStyle: 'normal', fillColor: [15, 23, 42] } // slate-900
    });

    // Önizleme (yeni sekmede açma)
    const pdfBlobUrl = doc.output('bloburl');
    window.open(pdfBlobUrl, '_blank');
  };

  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [newEvent, setNewEvent] = useState({ title: "", category: "", date: "", location: "", description: "", capacity: "", image_url: "", fileToUpload: null, requires_approval: false });
  const [universityName, setUniversityName] = useState("");
  const [universityLogo, setUniversityLogo] = useState("");


  // Etkinlikleri Yükle
  useEffect(() => {
    async function fetchMyEvents() {
      if (!user) return;
      try {
        setLoading(true);
        const { data, error } = await supabase
          .from("events")
          .select(`
            *,
            event_participants(status)
          `)
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

  useEffect(() => {
    async function fetchUni() {
      if (profile?.university_id) {
        const { data } = await supabase.from("universities").select("name, logo_url").eq("id", profile.university_id).single();
        if (data) {
          setUniversityName(data.name);
          setUniversityLogo(data.logo_url);
        }
      }
    }
    fetchUni();
  }, [profile]);

  const handleDeleteConfirm = async () => {
    if (!deleteModal.eventId) return;
    
    try {
      const { data, error } = await supabase
        .from("events")
        .delete()
        .eq("id", deleteModal.eventId)
        .select();
        
      if (error) throw error;
      
      if (!data || data.length === 0) {
        throw new Error("Veritabanından silinemedi (Güvenlik/RLS yetkisi eksik olabilir).");
      }
      
      setMyEvents(prev => prev.filter(ev => ev.id !== deleteModal.eventId));
      setDeleteModal({ isOpen: false, eventId: null });
    } catch (err) {
      console.error("Etkinlik silinirken hata:", err.message);
      setErrorModal({ isOpen: true, message: "Etkinlik silinirken bir hata oluştu: " + err.message });
      setDeleteModal({ isOpen: false, eventId: null });
    }
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
          status: "pending",
          requires_approval: newEvent.requires_approval
        }])
        .select();

      if (error) throw error;

      setMyEvents(prev => [data[0], ...prev]);
      setIsAddModalOpen(false);
      
      if (newEvent.image_url && newEvent.image_url.startsWith('blob:')) {
        URL.revokeObjectURL(newEvent.image_url);
      }
      setNewEvent({ title: "", category: "", date: "", location: "", description: "", capacity: "", image_url: "", fileToUpload: null, requires_approval: false });
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

  const generateCanvasPoster = (title, category, date, location, description, uniName, clubName) => {
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
    ctx.fillRect(60, 60, 100, 4);
    ctx.globalAlpha = 1;

    // 5. Üniversite ve Topluluk Adı
    ctx.font = 'bold 22px "Segoe UI", Arial, sans-serif';
    ctx.fillStyle = palette.text;
    ctx.globalAlpha = 0.9;
    ctx.fillText(`T.C. ${uniName || 'Üniversite'}`, 60, 95);
    
    ctx.font = '600 16px "Segoe UI", Arial, sans-serif';
    ctx.globalAlpha = 0.7;
    ctx.fillText(clubName || 'Öğrenci Topluluğu', 60, 125);
    ctx.globalAlpha = 1;

    // 6. Kategori badge
    if (category) {
      const badgeText = category.toLocaleUpperCase('tr-TR');
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
      roundRect(60, 160, badgeW, 36, 8);
      ctx.globalAlpha = 1;
      ctx.fillStyle = '#ffffff';
      ctx.fillText(badgeText, 76, 184);
    }

    // 7. Ana başlık (büyük, kalın, word-wrap)
    ctx.font = 'bold 56px "Segoe UI", Arial, sans-serif';
    ctx.fillStyle = palette.text;
    const titleLines = wrapText(ctx, title, W - 120);
    const titleY = category ? 260 : 220;
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

    // 9. Tarih, Saat ve Konum bilgisi (Emoji yerine vektörel ikonlar)
    const drawIcon = (type, x, y, size) => {
      ctx.save();
      ctx.strokeStyle = palette.text;
      ctx.fillStyle = palette.text;
      ctx.lineWidth = 2.5;
      ctx.lineJoin = 'round';
      ctx.lineCap = 'round';

      if (type === 'calendar') {
        // Takvim gövdesi
        ctx.strokeRect(x, y + 3, size, size - 3);
        // Üst şerit
        ctx.fillRect(x, y + 3, size, 4);
        // Halkalar
        ctx.fillRect(x + 4, y, 2.5, 5);
        ctx.fillRect(x + size - 6.5, y, 2.5, 5);
        // Izgara noktaları
        ctx.fillRect(x + 4, y + 10, 2, 2);
        ctx.fillRect(x + 10, y + 10, 2, 2);
        ctx.fillRect(x + 16, y + 10, 2, 2);
        ctx.fillRect(x + 4, y + 15, 2, 2);
        ctx.fillRect(x + 10, y + 15, 2, 2);
        ctx.fillRect(x + 16, y + 15, 2, 2);
      } else if (type === 'clock') {
        // Saat dairesi
        ctx.beginPath();
        ctx.arc(x + size/2, y + size/2, size/2, 0, Math.PI * 2);
        ctx.stroke();
        // Akrep ve yelkovan
        ctx.beginPath();
        ctx.moveTo(x + size/2, y + size/2);
        ctx.lineTo(x + size/2, y + 6); // yelkovan
        ctx.moveTo(x + size/2, y + size/2);
        ctx.lineTo(x + size/2 + 5, y + size/2); // akrep
        ctx.stroke();
      } else if (type === 'map-pin') {
        const cx = x + size/2;
        const cy = y + size/3 + 2;
        const r = size/3.8;
        
        ctx.beginPath();
        // Symmetrical teardrop shape using arc and lines
        ctx.arc(cx, cy, r, 0.75 * Math.PI, 0.25 * Math.PI);
        ctx.lineTo(cx, y + size - 1);
        ctx.closePath();
        ctx.stroke();
        
        // Inner circle dot
        ctx.beginPath();
        ctx.arc(cx, cy, 2.5, 0, Math.PI * 2);
        ctx.fill();
      }
      ctx.restore();
    };

    let infoY = H - 165;
    ctx.font = '600 20px "Segoe UI", Arial, sans-serif';
    ctx.fillStyle = palette.text;
    ctx.globalAlpha = 0.85;

    if (date) {
      try {
        const d = new Date(date);
        const dateStr = d.toLocaleDateString('tr-TR', { day: 'numeric', month: 'long', year: 'numeric' });
        const timeStr = d.toLocaleTimeString('tr-TR', { hour: '2-digit', minute: '2-digit' });
        
        // Tarih Satırı
        drawIcon('calendar', 60, infoY - 18, 22);
        ctx.fillText(`Tarih: ${dateStr}`, 94, infoY);
        infoY += 38;

        // Saat Satırı
        drawIcon('clock', 60, infoY - 18, 22);
        ctx.fillText(`Saat: ${timeStr}`, 94, infoY);
        infoY += 38;
      } catch(e) {}
    }

    // 10. Konum bilgisi
    if (location) {
      drawIcon('map-pin', 60, infoY - 18, 22);
      ctx.fillText(`Konum: ${location}`, 94, infoY);
      infoY += 38;
    }
    ctx.globalAlpha = 1;

    // 11. Alt çizgi dekorasyon ve KampüsRadar
    ctx.fillStyle = palette.text;
    ctx.globalAlpha = 0.15;
    ctx.fillRect(60, H - 50, W - 120, 2);
    ctx.globalAlpha = 0.5;
    ctx.font = 'bold 18px "Segoe UI", Arial, sans-serif';
    const krText = 'KampüsRadar';
    const krW = ctx.measureText(krText).width;
    ctx.fillText(krText, W - 60 - krW, H - 20); // Alt sağ köşe
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
        newEvent.description,
        universityName,
        profile?.full_name
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
        <div className="flex items-center gap-4 flex-1 min-w-0">
          <button onClick={() => navigate("/")} className="p-2 bg-slate-800 rounded-lg hover:bg-slate-700 transition cursor-pointer shrink-0">
            <ArrowLeft className="h-5 w-5 text-slate-300" />
          </button>
          <div className="truncate">
            <h1 className="text-xl font-extrabold tracking-tight truncate">{profile?.full_name || "Organizatör"}</h1>
            <p className="text-xs text-slate-400 font-medium truncate">Etkinlik Düzenleme Paneli</p>
          </div>
        </div>
        
        {universityName && (
          <div className="flex flex-col items-center justify-center text-center px-4 shrink-0">
            {universityLogo ? (
              <img src={universityLogo} alt={universityName} className="h-8 w-8 object-contain bg-white rounded-lg p-0.5 shadow-sm" />
            ) : (
              <School className="h-8 w-8 text-slate-300" />
            )}
            <span className="text-[10px] font-bold text-slate-300 mt-1 max-w-[120px] sm:max-w-[200px] truncate leading-tight">
              {universityName}
            </span>
          </div>
        )}

        <div className="flex items-center justify-end flex-1 min-w-0">
          <ProfileDropdown />
        </div>
      </header>

      <main className="flex-1 max-w-4xl w-full mx-auto px-4 py-8">
        
        {/* Topluluk Profili Alanı */}
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5 mb-8 flex items-center gap-5">
          <div className="h-16 w-16 sm:h-20 sm:w-20 rounded-full border-4 border-slate-50 bg-slate-100 overflow-hidden shadow-inner flex items-center justify-center shrink-0">
            {profile?.logo_url ? (
              <img src={profile.logo_url} alt="Topluluk Logosu" className="h-full w-full object-cover" />
            ) : (
              <Users className="h-8 w-8 text-slate-300" />
            )}
          </div>
          <div>
            <h2 className="text-xl sm:text-2xl font-bold text-gray-900">{profile?.full_name || "Organizatör Topluluğu"}</h2>
            <span className="inline-flex items-center gap-1 mt-1 px-2.5 py-0.5 bg-indigo-50 text-indigo-700 text-[11px] font-bold tracking-widest uppercase rounded-md border border-indigo-100">
              <BadgeCheck className="h-3.5 w-3.5 text-indigo-600" />
              Organizatör
            </span>
          </div>
        </div>

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
              <div 
                key={ev.id} 
                className="bg-white p-5 rounded-2xl border border-gray-100 shadow-sm flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 hover:border-slate-300 hover:shadow-md transition cursor-pointer"
                onClick={() => setViewEvent(ev)}
              >
                <div>
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="text-[10px] bg-slate-100 border border-slate-200 text-slate-700 font-black tracking-widest uppercase px-2 py-0.5 rounded-md">{ev.category}</span>
                    {ev.requires_approval && (
                      <span className="text-[10px] bg-indigo-50 border border-indigo-200 text-indigo-700 font-black tracking-widest uppercase px-2 py-0.5 rounded-md">Onay Sistemi Aktif</span>
                    )}
                  </div>
                  <h3 className="text-lg font-bold text-gray-900 mt-1.5">{ev.title}</h3>
                  <div className="mt-2 flex items-center gap-4 text-xs font-medium text-gray-400">
                    <span className="flex items-center gap-1"><Calendar className="h-3.5 w-3.5" /> {ev.date ? new Date(ev.date).toLocaleString('tr-TR', { day: 'numeric', month: 'long', year: 'numeric', hour: '2-digit', minute: '2-digit' }) : ""}</span>
                    <span className="flex items-center gap-1"><MapPin className="h-3.5 w-3.5" /> {ev.location}</span>
                  </div>
                  
                  <div className="mt-3 flex flex-wrap items-center gap-3 text-[11px] font-bold text-slate-600">
                    <span className="bg-slate-150/70 px-2.5 py-1 rounded-lg border border-slate-200">
                      Katılımcı: {ev.event_participants?.filter(p => p.status === "approved").length || 0}
                      {ev.capacity ? ` / ${ev.capacity}` : ""}
                    </span>
                    {ev.requires_approval && (
                      <span className="bg-amber-50 text-amber-700 px-2.5 py-1 rounded-lg border border-amber-100 flex items-center gap-1">
                        Onay Bekleyen: {ev.event_participants?.filter(p => p.status === "pending").length || 0}
                      </span>
                    )}
                  </div>
                </div>

                <div className="shrink-0 flex items-center gap-3">
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
                  <button 
                    onClick={(e) => { e.stopPropagation(); setManageEvent(ev); }}
                    className="flex items-center gap-1.5 bg-indigo-50 text-indigo-700 hover:bg-indigo-100 px-3 py-1.5 rounded-xl text-xs font-bold border border-indigo-200 transition"
                    title="Katılımcıları Yönet"
                  >
                    <Users className="h-4 w-4" /> Yönet
                  </button>
                  <button 
                    onClick={(e) => { e.stopPropagation(); setDeleteModal({ isOpen: true, eventId: ev.id }); }}
                    className="p-1.5 text-red-500 hover:bg-red-50 rounded-lg transition"
                    title="Başvuruyu Sil / Geri Çek"
                  >
                    <Trash2 className="h-4 w-4" />
                  </button>
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
                      onChange={(e) => setNewEvent({...newEvent, title: e.target.value})}
                      className="w-full px-4 py-2 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-slate-900"
                    />
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-semibold text-gray-700 mb-1">Kategori</label>
                      <select 
                        required
                        value={newEvent.category} 
                        onChange={(e) => setNewEvent({...newEvent, category: e.target.value})}
                        className="w-full px-4 py-2 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-slate-900 bg-white appearance-none"
                      >
                        <option value="" disabled>Seçiniz</option>
                        <option value="Seminer / Konferans">Seminer / Konferans</option>
                        <option value="Eğitim / Atölye">Eğitim / Atölye</option>
                        <option value="Konser / Müzik">Konser / Müzik</option>
                        <option value="Sergi / Sanat">Sergi / Sanat</option>
                        <option value="Spor / Turnuva">Spor / Turnuva</option>
                        <option value="Tiyatro / Gösteri">Tiyatro / Gösteri</option>
                        <option value="Sosyal Sorumluluk">Sosyal Sorumluluk</option>
                        <option value="Diğer">Diğer</option>
                      </select>
                    </div>
                    <div>
                      <label className="block text-sm font-semibold text-gray-700 mb-1">Tarih / Saat</label>
                      <input 
                        required type="datetime-local" 
                        step="900"
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
                        onChange={(e) => setNewEvent({...newEvent, location: e.target.value})}
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

                  <div className="flex items-center gap-2 bg-slate-50 p-3.5 rounded-xl border border-slate-100">
                    <input 
                      type="checkbox" 
                      id="requires_approval"
                      checked={newEvent.requires_approval} 
                      onChange={(e) => setNewEvent({...newEvent, requires_approval: e.target.checked})}
                      className="w-4 h-4 text-slate-900 border-gray-300 rounded focus:ring-slate-900 cursor-pointer"
                    />
                    <label htmlFor="requires_approval" className="text-xs sm:text-sm font-bold text-gray-700 cursor-pointer select-none">
                      Katılım Başvuruları Onay Gerektirsin (Kabul Sistemi Aktif)
                    </label>
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

      {/* SİLME ONAY MODALI */}
      {deleteModal.isOpen && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center bg-slate-900/60 backdrop-blur-sm p-4">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-sm overflow-hidden flex flex-col transform transition-all">
            <div className="p-6 flex flex-col items-center text-center">
              <div className="w-16 h-16 bg-red-100 rounded-full flex items-center justify-center mb-4">
                <Trash2 className="h-8 w-8 text-red-500" />
              </div>
              <h3 className="text-xl font-extrabold text-slate-900 mb-2">Başvuruyu Sil</h3>
              <p className="text-slate-500 text-sm">Bu etkinlik başvurusunu silmek / geri çekmek istediğinize emin misiniz? Bu işlem geri alınamaz.</p>
            </div>
            <div className="px-6 py-4 bg-slate-50 border-t border-gray-100 flex gap-3">
              <button 
                onClick={() => setDeleteModal({ isOpen: false, eventId: null })}
                className="flex-1 px-4 py-2.5 text-sm font-bold text-gray-700 bg-white border border-gray-200 rounded-xl hover:bg-gray-50 transition shadow-sm cursor-pointer"
              >
                İptal
              </button>
              <button 
                onClick={handleDeleteConfirm}
                className="flex-1 px-4 py-2.5 text-sm font-bold bg-red-500 text-white rounded-xl hover:bg-red-600 transition shadow-sm cursor-pointer"
              >
                Evet, Sil
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ETKİNLİK DETAY İNCELEME MODALI */}
      {viewEvent && (
        <div className="fixed inset-0 z-[55] flex items-center justify-center bg-slate-900/60 backdrop-blur-sm p-4 overflow-hidden">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-3xl flex flex-col max-h-[90vh] transform transition-all">
            <div className="px-6 py-4 border-b border-gray-100 flex items-center justify-between bg-slate-50 shrink-0">
              <h3 className="text-lg font-bold text-slate-900 flex items-center gap-2">
                <FileText className="h-5 w-5 text-slate-500" /> Etkinlik Detayları
              </h3>
              <button onClick={() => setViewEvent(null)} className="text-gray-400 hover:text-gray-600 transition cursor-pointer bg-white rounded-full p-1 hover:bg-gray-200"><X className="h-5 w-5" /></button>
            </div>
            
            <div className="overflow-y-auto p-6 flex flex-col md:flex-row gap-8">
              <div className="flex-1 space-y-5">
                <div>
                  <h4 className="text-xs font-bold text-gray-400 uppercase tracking-wider mb-1">Etkinlik Başlığı</h4>
                  <p className="text-lg font-bold text-slate-900">{viewEvent.title}</p>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-5 bg-slate-50 p-4 rounded-xl border border-gray-100">
                  <div>
                    <h4 className="text-xs font-bold text-gray-400 uppercase tracking-wider mb-1">Kategori</h4>
                    <p className="font-semibold text-slate-800">{viewEvent.category}</p>
                  </div>
                  <div>
                    <h4 className="text-xs font-bold text-gray-400 uppercase tracking-wider mb-1">Tarih / Saat</h4>
                    <p className="font-semibold text-slate-800">
                      {viewEvent.date ? new Date(viewEvent.date).toLocaleString('tr-TR', { day: 'numeric', month: 'long', year: 'numeric', hour: '2-digit', minute: '2-digit' }) : "-"}
                    </p>
                  </div>
                  <div>
                    <h4 className="text-xs font-bold text-gray-400 uppercase tracking-wider mb-1">Konum / Salon</h4>
                    <p className="font-semibold text-slate-800">{viewEvent.location}</p>
                  </div>
                  <div>
                    <h4 className="text-xs font-bold text-gray-400 uppercase tracking-wider mb-1">Kapasite</h4>
                    <p className="font-semibold text-slate-800">{viewEvent.capacity || "Belirtilmedi"}</p>
                  </div>
                </div>
                <div>
                  <h4 className="text-xs font-bold text-gray-400 uppercase tracking-wider mb-1">Detaylı Açıklama</h4>
                  <div className="bg-slate-50 p-4 rounded-xl border border-gray-100">
                    <p className="text-slate-700 whitespace-pre-wrap leading-relaxed text-sm">{viewEvent.description}</p>
                  </div>
                </div>

              </div>

              {viewEvent.image_url && (
                <div className="w-full md:w-[260px] shrink-0 flex flex-col gap-2">
                  <h4 className="text-xs font-bold text-gray-400 uppercase tracking-wider">Afiş Görseli</h4>
                  <div className="rounded-xl overflow-hidden shadow-md border border-gray-200">
                    <img src={viewEvent.image_url} alt="Etkinlik Afişi" className="w-full h-auto object-cover" />
                  </div>
                </div>
              )}
            </div>
            
            <div className="px-6 py-4 bg-slate-50 border-t border-gray-100 flex justify-end shrink-0">
              <button 
                onClick={() => setViewEvent(null)}
                className="px-6 py-2.5 text-sm font-bold bg-slate-900 text-white rounded-xl hover:bg-slate-800 transition shadow-sm cursor-pointer"
              >
                Kapat
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
                <Sparkles className="h-5 w-5 text-purple-500" /> Canvas afişiniz hazır!
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

      {/* KATILIMCI YÖNETİM PANELİ (YENİ) */}
      {manageEvent && (
        <div className="fixed inset-0 z-[70] flex items-center justify-center bg-slate-900/70 backdrop-blur-md p-4 sm:p-6 overflow-hidden">
          <div className="bg-white rounded-3xl shadow-2xl w-full max-w-5xl flex flex-col h-[90vh] sm:h-[85vh] transform transition-all border border-slate-200">
            {/* Header */}
            <div className="px-6 py-5 border-b border-gray-100 flex items-center justify-between bg-slate-900 text-white rounded-t-3xl shrink-0">
              <div>
                <h3 className="text-xl font-extrabold flex items-center gap-2">
                  <Users className="h-6 w-6 text-indigo-400" />
                  Katılımcı Yönetimi
                </h3>
                <p className="text-slate-400 text-sm mt-1 font-medium truncate max-w-md">{manageEvent.title}</p>
              </div>
              <div className="flex items-center gap-3">
                <button
                  onClick={generatePDF}
                  className="flex items-center gap-2 bg-white hover:bg-slate-50 text-slate-700 border border-slate-200 px-4 py-2 rounded-xl text-sm font-bold shadow-sm transition"
                >
                  <FileText className="h-4 w-4" /> PDF Önizle
                </button>
                <button 
                  onClick={() => setManageEvent(null)} 
                  className="text-slate-400 hover:text-white bg-slate-800 rounded-full p-2 transition cursor-pointer"
                >
                  <X className="h-5 w-5" />
                </button>
              </div>
            </div>
            
            <div className="flex-1 overflow-y-auto p-6 bg-slate-50/50">
              {loadingParticipants ? (
                <div className="flex flex-col items-center justify-center h-full gap-3 text-slate-400">
                  <Loader2 className="h-10 w-10 animate-spin text-indigo-500" />
                  <span className="text-sm font-semibold">Katılımcı listesi yükleniyor...</span>
                </div>
              ) : (
                <div className="space-y-8">
                  
                  {/* Onay Bekleyenler (Eğer Kabul Sistemi Aktifse) */}
                  {manageEvent.requires_approval && (
                    <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
                      <div className="bg-amber-50 border-b border-slate-100 px-6 py-4 flex items-center justify-between">
                        <h4 className="text-sm font-extrabold text-amber-700 flex items-center gap-2">
                          <Clock className="h-5 w-5" /> Onay Bekleyen Başvurular
                        </h4>
                        <span className="bg-amber-200 text-amber-800 text-xs font-black px-2.5 py-1 rounded-lg">
                          {participants.filter(p => p.status === 'pending').length}
                        </span>
                      </div>
                      
                      {participants.filter(p => p.status === 'pending').length === 0 ? (
                        <div className="p-8 text-center text-slate-400 text-sm font-semibold italic">
                          Şu anda bekleyen başvuru bulunmuyor.
                        </div>
                      ) : (
                        <div className="divide-y divide-slate-100">
                          {participants.filter(p => p.status === 'pending').map(p => (
                            <div key={p.id} className="flex items-center justify-between p-4 hover:bg-slate-50 transition">
                              <div>
                                <span className="text-sm font-bold text-slate-800 block">{p.profiles?.full_name || 'Bilinmeyen Öğrenci'}</span>
                                <span className="text-xs text-slate-500 mt-0.5 block">
                                  Başvuru: {p.joined_at ? new Date(p.joined_at).toLocaleString('tr-TR', { day: 'numeric', month: 'long', hour: '2-digit', minute: '2-digit' }) : '-'}
                                </span>
                              </div>
                              <div className="flex items-center gap-2">
                                <button
                                  onClick={() => handleUpdateParticipantStatus(p.id, 'approved')}
                                  className="flex items-center gap-1.5 px-4 py-2 bg-green-500 hover:bg-green-600 text-white rounded-xl text-xs font-bold transition shadow-sm"
                                >
                                  <CheckCircle className="h-4 w-4" /> Onayla
                                </button>
                                <button
                                  onClick={() => handleUpdateParticipantStatus(p.id, 'rejected')}
                                  className="flex items-center gap-1.5 px-4 py-2 bg-red-500 hover:bg-red-600 text-white rounded-xl text-xs font-bold transition shadow-sm"
                                >
                                  <XCircle className="h-4 w-4" /> Reddet
                                </button>
                              </div>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  )}

                  {/* Kabul Edilenler */}
                  <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
                    <div className="bg-green-50 border-b border-slate-100 px-6 py-4 flex items-center justify-between">
                      <h4 className="text-sm font-extrabold text-green-700 flex items-center gap-2">
                        <CheckCircle className="h-5 w-5" /> Katılan (Kabul Edilen) Öğrenciler
                      </h4>
                      <span className="bg-green-200 text-green-800 text-xs font-black px-2.5 py-1 rounded-lg">
                        {participants.filter(p => p.status === 'approved').length}
                      </span>
                    </div>
                    
                    {participants.filter(p => p.status === 'approved').length === 0 ? (
                      <div className="p-8 text-center text-slate-400 text-sm font-semibold italic">
                        Henüz katılan öğrenci bulunmuyor.
                      </div>
                    ) : (
                      <div className="divide-y divide-slate-100">
                        {participants.filter(p => p.status === 'approved').map((p, idx) => (
                          <div key={p.id} className="flex items-center justify-between p-4 hover:bg-slate-50 transition">
                            <div className="flex items-center gap-3">
                              <span className="text-xs font-bold text-slate-400 w-6">{idx + 1}.</span>
                              <div>
                                <span className="text-sm font-bold text-slate-800 block">{p.profiles?.full_name || 'Bilinmeyen Öğrenci'}</span>
                                <span className="text-xs text-slate-500 mt-0.5 block">
                                  Kayıt: {p.joined_at ? new Date(p.joined_at).toLocaleString('tr-TR', { day: 'numeric', month: 'long' }) : '-'}
                                </span>
                              </div>
                            </div>
                            {manageEvent.requires_approval && (
                              <button
                                onClick={() => handleUpdateParticipantStatus(p.id, 'rejected')}
                                className="flex items-center gap-1 text-xs text-red-500 hover:text-red-700 hover:bg-red-50 px-3 py-1.5 rounded-lg border border-transparent hover:border-red-200 transition font-bold"
                              >
                                <Trash2 className="h-3.5 w-3.5" /> Listeden Çıkar
                              </button>
                            )}
                          </div>
                        ))}
                      </div>
                    )}
                  </div>

                  {/* Reddedilenler (Eğer Kabul Sistemi Aktifse) */}
                  {manageEvent.requires_approval && participants.filter(p => p.status === 'rejected').length > 0 && (
                    <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden opacity-75">
                      <div className="bg-slate-100 border-b border-slate-200 px-6 py-4 flex items-center justify-between">
                        <h4 className="text-sm font-extrabold text-slate-600 flex items-center gap-2">
                          <XCircle className="h-5 w-5" /> Reddedilen Başvurular
                        </h4>
                        <span className="bg-slate-300 text-slate-700 text-xs font-black px-2.5 py-1 rounded-lg">
                          {participants.filter(p => p.status === 'rejected').length}
                        </span>
                      </div>
                      <div className="divide-y divide-slate-100">
                        {participants.filter(p => p.status === 'rejected').map(p => (
                          <div key={p.id} className="flex items-center justify-between p-4 bg-slate-50">
                            <span className="text-sm font-bold text-slate-600 strike-through">{p.profiles?.full_name || 'Bilinmeyen Öğrenci'}</span>
                            <button
                              onClick={() => handleUpdateParticipantStatus(p.id, 'approved')}
                              className="text-xs text-indigo-600 hover:bg-indigo-50 px-3 py-1.5 rounded-lg border border-indigo-200 transition font-bold"
                            >
                              Geri Al (Onayla)
                            </button>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                </div>
              )}
            </div>
            
            {/* Footer */}
            <div className="px-6 py-4 bg-white border-t border-gray-100 flex justify-end shrink-0 rounded-b-3xl">
              <button 
                onClick={() => setManageEvent(null)}
                className="px-6 py-2.5 text-sm font-bold bg-slate-100 text-slate-700 rounded-xl hover:bg-slate-200 transition shadow-sm"
              >
                Kapat
              </button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
}