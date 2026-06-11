import { useState, useEffect, useRef } from "react";
import { useNavigate } from "react-router-dom";
import { Plus, ArrowLeft, Calendar, MapPin, X, FileText, CheckCircle, Clock, XCircle, Sparkles, Loader2, UploadCloud, AlertTriangle, Check, RefreshCw, Trash2, Users, School, BadgeCheck, Edit, GraduationCap, Music, Palette, Trophy, Cpu, Leaf } from "lucide-react";
import { useAuth } from "../context/AuthContext";
import { supabase } from "../lib/supabaseClient";
import ProfileDropdown from "../components/ProfileDropdown";
import { jsPDF } from "jspdf";
import autoTable from "jspdf-autotable";
import { addOpenSansFont } from "../lib/OpenSans-Regular-normal.js";

export default function OrganizerDashboard() {
  const navigate = useNavigate();
  const { user, profile, loading: authLoading, signOut } = useAuth();

  const formatEventDate = (dateStr, endTimeStr) => {
    if (!dateStr) return "";
    try {
      const d = new Date(dateStr);
      const datePart = d.toLocaleString('tr-TR', { day: 'numeric', month: 'long', year: 'numeric' });
      const timePart = d.toLocaleString('tr-TR', { hour: '2-digit', minute: '2-digit' });
      if (endTimeStr) {
        return `${datePart} ${timePart} – ${endTimeStr}`;
      }
      return `${datePart} ${timePart}`;
    } catch (e) {
      return dateStr;
    }
  };

  const [myEvents, setMyEvents] = useState([]);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [isGenerating, setIsGenerating] = useState(false);
  const [isUploading, setIsUploading] = useState(false);

  const [aiPreview, setAiPreview] = useState({ isOpen: false, url: "", blob: null, isLoading: false, hasError: false });
  const [errorModal, setErrorModal] = useState({ isOpen: false, message: "" });
  const [aiInfoModalOpen, setAiInfoModalOpen] = useState(false);
  const [aiKeywords, setAiKeywords] = useState("");
  const [aiTone, setAiTone] = useState("friendly");
  const [aiLoading, setAiLoading] = useState(false);
  const [aiResult, setAiResult] = useState("");
  const [aiError, setAiError] = useState(""); // inline error inside the modal
  const [aiErrorType, setAiErrorType] = useState(""); // "busy" | "error" | ""
  const [isWizardOpen, setIsWizardOpen] = useState(false);
  const [posterTemplate, setPosterTemplate] = useState("classic"); // "classic" | "centered" | "minimal"
  const [posterPaletteIndex, setPosterPaletteIndex] = useState(0);
  const [posterBgType, setPosterBgType] = useState("preset_gradient"); // "preset_gradient" | "custom_gradient" | "image"
  const [posterBgQuery, setPosterBgQuery] = useState("concert");
  const [posterBgImageSig, setPosterBgImageSig] = useState(Math.random().toString());
  const [posterBgImageLoading, setPosterBgImageLoading] = useState(false);
  const [customColors, setCustomColors] = useState(["#6366f1", "#a855f7", "#3b82f6"]);
  const [posterPattern, setPosterPattern] = useState("circles_lines"); // "circles_lines" | "grid" | "triangles" | "stripes" | "none"
  const [posterImageOverlay, setPosterImageOverlay] = useState("dark"); // "dark" | "light"

  const [deleteModal, setDeleteModal] = useState({ isOpen: false, eventId: null });
  const [viewEvent, setViewEvent] = useState(null);
  const [manageEvent, setManageEvent] = useState(null);
  const [participants, setParticipants] = useState([]);
  const [loadingParticipants, setLoadingParticipants] = useState(false);
  const [activeTab, setActiveTab] = useState("active"); // "active" | "past"
  const [selectedYear, setSelectedYear] = useState("all");
  const [eventDate, setEventDate] = useState("");
  const [eventTime, setEventTime] = useState("12:00");
  const [eventEndTime, setEventEndTime] = useState("");

  const isValidTime = (timeStr) => {
    const regex = /^([01]?[0-9]|2[0-3]):[0-5][0-9]$/;
    return regex.test(timeStr);
  };
  const handleOpenWizard = () => {
    let defaultQuery = "concert";
    const cat = newEvent.category;
    if (cat === "Seminer / Konferans") defaultQuery = "seminar,conference";
    else if (cat === "Eğitim / Atölye") defaultQuery = "workshop,education";
    else if (cat === "Konser / Müzik") defaultQuery = "concert,music";
    else if (cat === "Sergi / Sanat") defaultQuery = "art,exhibition";
    else if (cat === "Spor / Turnuva") defaultQuery = "sports,stadium";
    else if (cat === "Tiyatro / Gösteri") defaultQuery = "theater,show";
    else if (cat === "Sosyal Sorumluluk") defaultQuery = "charity,community";
    else if (cat === "Yarışma") defaultQuery = "competition,contest";
    else if (cat) defaultQuery = cat.toLowerCase();

    setPosterBgQuery(defaultQuery);
    setPosterBgImageSig(Math.random().toString());
    setPosterBgImageLoading(false);
    setIsWizardOpen(true);
  };


  const handleTimeChange = (e, setter) => {
    let val = e.target.value.replace(/[^0-9]/g, "");
    if (val.length > 4) val = val.slice(0, 4);
    
    if (val.length > 2) {
      val = val.slice(0, 2) + ":" + val.slice(2);
    }
    setter(val);
  };

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
  const [editingEventId, setEditingEventId] = useState(null);
  const [newEvent, setNewEvent] = useState({ title: "", category: "", date: "", location: "", description: "", capacity: "", image_url: "", fileToUpload: null, requires_approval: false });
  const [customCategory, setCustomCategory] = useState("");
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

  const aiAbortControllerRef = useRef(null);

  const generateDescriptionWithGemini = async () => {
    if (aiAbortControllerRef.current) {
      aiAbortControllerRef.current.abort();
    }
    const controller = new AbortController();
    aiAbortControllerRef.current = controller;

    setAiLoading(true);
    setAiError("");
    setAiErrorType("");
    
    const apiKey = import.meta.env.VITE_GEMINI_API_KEY;
    if (!apiKey) {
      setAiLoading(false);
      setAiError("API anahtarı bulunamadı.");
      setAiErrorType("error");
      return;
    }

    let toneDirectives = "";
    if (aiTone === "friendly") {
      toneDirectives = "öğrenci dostu, samimi, dinamik ve üniversite gençliğine hitap eden bir dil kullan.";
    } else if (aiTone === "academic") {
      toneDirectives = "resmi, ciddi, kurumsal, akademik kurallara uygun ve saygın bir dil kullan.";
    } else if (aiTone === "exciting") {
      toneDirectives = "heyecan uyandıran, davetkar, coşkulu, katılımı teşvik eden enerjik bir dil kullan.";
    }

    const prompt = `
      Sen bir üniversite etkinlik organizatör yardımcısısın.
      Aşağıdaki detaylara sahip bir üniversite etkinliği için yaratıcı, ilgi çekici, bilgilendirici ve Türkçe kurallarına uygun bir açıklama yazısı oluştur.
      
      Etkinlik Başlığı: "${newEvent.title || 'Belirtilmedi'}"
      Etkinlik Kategorisi: "${newEvent.category || 'Genel'}"
      Ek Bilgiler/Detaylar: "${aiKeywords || 'Herhangi bir detay belirtilmedi.'}"
      
      Dil Kuralları ve Tarz:
      - ${toneDirectives}
      - KESİNLİKLE HİÇBİR EMOJİ KULLANMA. Metinde tek bir emoji (🎉, 🚀 vb.) dahi olmamalı, tamamen harflerden oluşmalı.
      - Afişteki açıklama alanını en verimli şekilde kullanabilmemiz için metni ortalama 400-450 karakter (yaklaşık 60-70 kelime) uzunluğunda oluştur.
      - Yazıda tarih, saat veya konum bilgisi için yer tutucular ekleme; sadece açıklama içeriğine odaklan.
      - Metin paragraf düzeninde olsun ve gerekiyorsa çok kısa maddeler içerebilsin.
      - Sadece etkinlik açıklamasını döndür, başında veya sonunda 'İşte açıklamanız:' gibi ekstra açıklamalar ekleme.
    `;

    try {
      const response = await fetch(
        `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${apiKey}`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ contents: [{ parts: [{ text: prompt }] }] }),
          signal: controller.signal
        }
      );

      // HTTP düzeyi hata tespiti
      if (!response.ok) {
        const errJson = await response.json().catch(() => ({}));
        const status = response.status;
        const apiMsg = (errJson.error?.message || "").toLowerCase();
        if (status === 429 || status === 503 || apiMsg.includes("high demand") || apiMsg.includes("quota") || apiMsg.includes("overloaded") || apiMsg.includes("resource_exhausted")) {
          throw Object.assign(new Error("busy"), { errorType: "busy" });
        }
        throw Object.assign(new Error(errJson.error?.message || `HTTP ${status}`), { errorType: "error" });
      }

      const data = await response.json();
      const text = data.candidates?.[0]?.content?.parts?.[0]?.text;
      if (text) {
        setAiResult(text.trim());
      } else {
        const bodyMsg = (data.error?.message || "").toLowerCase();
        if (bodyMsg.includes("high demand") || bodyMsg.includes("quota") || bodyMsg.includes("overloaded") || bodyMsg.includes("resource_exhausted")) {
          throw Object.assign(new Error("busy"), { errorType: "busy" });
        }
        throw Object.assign(new Error(data.error?.message || "Geçersiz yanıt"), { errorType: "error" });
      }
    } catch (err) {
      if (err.name === "AbortError") {
        // Kullanıcı iptal etti, sessizce çık
      } else if (err.errorType === "busy") {
        setAiErrorType("busy");
        setAiError("Şu an yapay zeka sihirbazımızda yoğunluk var.");
      } else {
        setAiErrorType("error");
        setAiError("Açıklama üretilirken bir sorun oluştu. Lütfen tekrar deneyin.");
        console.error("Gemini API Error:", err.message);
      }
    } finally {
      if (aiAbortControllerRef.current === controller) {
        setAiLoading(false);
        aiAbortControllerRef.current = null;
      }
    }
  };

  const handleCancelAiGeneration = () => {
    if (aiAbortControllerRef.current) {
      aiAbortControllerRef.current.abort();
      aiAbortControllerRef.current = null;
    }
    setAiLoading(false);
  };

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

  const handleOpenAddModal = () => {
    setEditingEventId(null);
    setNewEvent({ title: "", category: "", date: "", location: "", description: "", capacity: "", image_url: "", fileToUpload: null, requires_approval: false });
    setCustomCategory("");
    setEventDate("");
    setEventTime("12:00");
    setEventEndTime("");
    setIsAddModalOpen(true);
  };

  const handleOpenEditModal = (ev) => {
    setEditingEventId(ev.id);
    
    // Bitiş saatini ve temiz açıklamayı ayır (Öncelikli olarak end_time sütunundan oku, yoksa açıklamadan parse et)
    let extractedEndTime = ev.end_time || "";
    let cleanDescription = ev.description || "";
    if (!extractedEndTime && ev.description && ev.description.startsWith("Bitiş Saati: ")) {
      const match = ev.description.match(/^Bitiş Saati: (\d{2}:\d{2})\n\n([\s\S]*)$/);
      if (match) {
        extractedEndTime = match[1];
        cleanDescription = match[2];
      }
    }

    // Tarih ve saati ayır (Yerel saat dilimine göre)
    let extractedDate = "";
    let extractedTime = "12:00";
    if (ev.date) {
      const dateObj = new Date(ev.date);
      if (!isNaN(dateObj.getTime())) {
        const year = dateObj.getFullYear();
        const month = String(dateObj.getMonth() + 1).padStart(2, "0");
        const day = String(dateObj.getDate()).padStart(2, "0");
        extractedDate = `${year}-${month}-${day}`;
        
        const hours = String(dateObj.getHours()).padStart(2, "0");
        const minutes = String(dateObj.getMinutes()).padStart(2, "0");
        extractedTime = `${hours}:${minutes}`;
      }
    }

    // Kategori kontrolü
    const isStandardCategory = ["Eğlence", "Kültür / Sanat", "Spor", "Eğitim / Kariyer", "Teknoloji", "Sosyal Sorumluluk"].includes(ev.category);
    if (!isStandardCategory && ev.category) {
      setNewEvent({
        title: ev.title || "",
        category: "Diğer",
        date: ev.date || "",
        location: ev.location || "",
        description: cleanDescription,
        capacity: ev.capacity ? String(ev.capacity) : "",
        image_url: ev.image_url || "",
        fileToUpload: null,
        requires_approval: ev.requires_approval || false
      });
      setCustomCategory(ev.category);
    } else {
      setNewEvent({
        title: ev.title || "",
        category: ev.category || "",
        date: ev.date || "",
        location: ev.location || "",
        description: cleanDescription,
        capacity: ev.capacity ? String(ev.capacity) : "",
        image_url: ev.image_url || "",
        fileToUpload: null,
        requires_approval: ev.requires_approval || false
      });
      setCustomCategory("");
    }

    setEventDate(extractedDate);
    setEventTime(extractedTime);
    setEventEndTime(extractedEndTime);
    setIsAddModalOpen(true);
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

      if (!isValidTime(eventTime)) {
        setErrorModal({ isOpen: true, message: "Lütfen geçerli bir saat girin (Örn: 14:30)." });
        setSubmitting(false);
        return;
      }
      if (eventEndTime && !isValidTime(eventEndTime)) {
        setErrorModal({ isOpen: true, message: "Lütfen geçerli bir bitiş saati girin (Örn: 16:00)." });
        setSubmitting(false);
        return;
      }

      // Eğer kategori "Diğer" ise ve özel kategori girilmişse onu kullan
      let finalCategory = newEvent.category;
      if (newEvent.category === "Diğer") {
        if (!customCategory.trim()) {
          setErrorModal({ isOpen: true, message: "Lütfen özel kategori adını girin." });
          setSubmitting(false);
          return;
        }
        finalCategory = customCategory.trim();
      }

      // Bitiş saatini artık açıklamaya eklemiyoruz, doğrudan end_time sütununda saklayacağız.
      const finalDescription = newEvent.description;

      // 2. Etkinlik verisini veritabanına kaydet veya güncelle (Türkiye Saati: UTC+3)
      const combinedDate = `${eventDate}T${eventTime}:00+03:00`;
      let queryResult;

      if (editingEventId) {
        queryResult = await supabase
          .from("events")
          .update({
            title: newEvent.title,
            category: finalCategory,
            date: combinedDate,
            location: newEvent.location,
            description: finalDescription,
            capacity: newEvent.capacity ? parseInt(newEvent.capacity, 10) : null,
            image_url: finalImageUrl || null,
            end_time: eventEndTime || null,
            status: "pending", // Güncellendiğinde tekrar onaya düşer
            requires_approval: newEvent.requires_approval
          })
          .eq("id", editingEventId)
          .select(`
            *,
            event_participants(status)
          `);
      } else {
        queryResult = await supabase
          .from("events")
          .insert([{
            title: newEvent.title,
            category: finalCategory,
            date: combinedDate,
            location: newEvent.location,
            description: finalDescription,
            capacity: newEvent.capacity ? parseInt(newEvent.capacity, 10) : null,
            image_url: finalImageUrl || null,
            university_id: profile.university_id,
            organizer_id: user.id,
            end_time: eventEndTime || null,
            status: "pending",
            requires_approval: newEvent.requires_approval
          }])
          .select(`
            *,
            event_participants(status)
          `);
      }

      const { data, error } = queryResult;
      if (error) throw error;

      if (editingEventId) {
        setMyEvents(prev => prev.map(ev => ev.id === editingEventId ? data[0] : ev));
      } else {
        setMyEvents(prev => [data[0], ...prev]);
      }
      setIsAddModalOpen(false);
      setEditingEventId(null);
      
      if (newEvent.image_url && newEvent.image_url.startsWith('blob:')) {
        URL.revokeObjectURL(newEvent.image_url);
      }
      setNewEvent({ title: "", category: "", date: "", location: "", description: "", capacity: "", image_url: "", fileToUpload: null, requires_approval: false });
      setCustomCategory("");
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

    // Dosya boyutu sınırı kontrolü (5 MB)
    const MAX_SIZE = 5 * 1024 * 1024;
    if (file.size > MAX_SIZE) {
      setErrorModal({ 
        isOpen: true, 
        message: "Seçtiğiniz dosya çok büyük. Afiş görseli maksimum 5 MB boyutunda olmalıdır." 
      });
      e.target.value = null;
      return;
    }

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
    // --- Karanlık Temalar ---
    { name: "Galaksi Moru", bg: ['#6366f1','#8b5cf6','#a855f7'], text: '#ffffff', accent: 'rgba(255,255,255,0.12)', badge: '#4f46e5', isLight: false },
    { name: "Gece Mavisi", bg: ['#0f172a','#1e293b','#334155'], text: '#f1f5f9', accent: 'rgba(99,102,241,0.18)', badge: '#6366f1', isLight: false },
    { name: "Gün Batımı", bg: ['#dc2626','#f97316','#fbbf24'], text: '#ffffff', accent: 'rgba(255,255,255,0.10)', badge: '#b91c1c', isLight: false },
    { name: "Zümrüt Yeşili", bg: ['#059669','#10b981','#34d399'], text: '#ffffff', accent: 'rgba(255,255,255,0.12)', badge: '#047857', isLight: false },
    { name: "Okyanus Mavi", bg: ['#2563eb','#3b82f6','#60a5fa'], text: '#ffffff', accent: 'rgba(255,255,255,0.10)', badge: '#1d4ed8', isLight: false },
    { name: "Neon Pembe", bg: ['#7c3aed','#a855f7','#d946ef'], text: '#ffffff', accent: 'rgba(255,255,255,0.12)', badge: '#6d28d9', isLight: false },
    { name: "Kozmik Siyah", bg: ['#0f172a','#581c87','#7c3aed'], text: '#f1f5f9', accent: 'rgba(167,139,250,0.15)', badge: '#7c3aed', isLight: false },
    { name: "Açık Gökyüzü", bg: ['#0c4a6e','#0284c7','#38bdf8'], text: '#ffffff', accent: 'rgba(255,255,255,0.10)', badge: '#0369a1', isLight: false },

    // --- Aydınlık Temalar ---
    { name: "İnci Beyazı", bg: ['#f8fafc', '#e2e8f0', '#cbd5e1'], text: '#0f172a', accent: 'rgba(15,23,42,0.06)', badge: '#0f172a', isLight: true },
    { name: "Krem Esintisi", bg: ['#fafaf9', '#f5f5f4', '#d6d3d1'], text: '#1c1917', accent: 'rgba(28,25,23,0.06)', badge: '#78716c', isLight: true },
    { name: "Limon Sorbe", bg: ['#fffbeb', '#fef3c7', '#fde68a'], text: '#78350f', accent: 'rgba(120,53,15,0.05)', badge: '#d97706', isLight: true },
    { name: "Taze Bahar", bg: ['#f0fdf4', '#dcfce7', '#bbf7d0'], text: '#14532d', accent: 'rgba(20,83,45,0.05)', badge: '#16a34a', isLight: true },
    { name: "Bulut Pembe", bg: ['#fff1f2', '#ffe4e6', '#fecdd3'], text: '#881337', accent: 'rgba(136,19,55,0.05)', badge: '#e11d48', isLight: true },
    { name: "Hafif Deniz", bg: ['#f0f9ff', '#e0f2fe', '#bae6fd'], text: '#0c4a6e', accent: 'rgba(12,74,110,0.05)', badge: '#0284c7', isLight: true },
    { name: "Nane Ferahlığı", bg: ['#f0fdfa', '#ccfbf1', '#99f6e4'], text: '#0f766e', accent: 'rgba(15,118,110,0.05)', badge: '#0d9488', isLight: true },
    { name: "Zarif Lavanta", bg: ['#faf5ff', '#f3e8ff', '#e9d5ff'], text: '#6b21a8', accent: 'rgba(107,33,168,0.05)', badge: '#9333ea', isLight: true },
  ];

  const POPULAR_DARK_GRADIENTS = [
    { name: "Gece Yarısı", colors: ["#0f172a", "#1e293b", "#3b82f6"] },
    { name: "Kızıl Batan Güneş", colors: ["#dc2626", "#ea580c", "#eab308"] },
    { name: "Mor Yağmur", colors: ["#4c1d95", "#7c3aed", "#c084fc"] },
    { name: "Zümrüt", colors: ["#064e3b", "#059669", "#34d399"] },
    { name: "Derin Okyanus", colors: ["#1e3a8a", "#3b82f6", "#60a5fa"] },
    { name: "Neon Gece", colors: ["#311042", "#701a75", "#f43f5e"] },
    { name: "Kömür Gri", colors: ["#18181b", "#27272a", "#52525b"] },
    { name: "Orman Gölgesi", colors: ["#022c22", "#065f46", "#10b981"] }
  ];

  const POPULAR_LIGHT_GRADIENTS = [
    { name: "Pamuk Şeker", colors: ["#ffd6e8", "#ffecd2", "#c1e3ff"] },
    { name: "Kuzey Işıkları", colors: ["#e0f2fe", "#e0e7ff", "#fae8ff"] },
    { name: "Lavanta Rüzgarı", colors: ["#faf5ff", "#f3e8ff", "#e9d5ff"] },
    { name: "Limon Nane", colors: ["#fef9c3", "#f0fdf4", "#ccfbf1"] },
    { name: "Şeftali Yumuşaklığı", colors: ["#fff7ed", "#ffedd5", "#fed7aa"] },
    { name: "Berrak Deniz", colors: ["#ecfeff", "#e0f7fa", "#b2ebf2"] },
    { name: "Tatlı Gül", colors: ["#fff1f2", "#ffe4e6", "#fecdd3"] },
    { name: "Sıcak Kum", colors: ["#fafaf9", "#f5f5f4", "#e7e5e4"] }
  ];

  const wrapText = (ctx, text, maxWidth) => {
    const paragraphs = text.split('\n');
    const lines = [];
    for (const para of paragraphs) {
      if (!para.trim()) {
        lines.push("");
        continue;
      }
      const words = para.split(' ');
      let currentLine = '';
      for (const word of words) {
        if (ctx.measureText(word).width > maxWidth) {
          if (currentLine) {
            lines.push(currentLine);
            currentLine = '';
          }
          let tempWord = '';
          for (let i = 0; i < word.length; i++) {
            const char = word[i];
            const testWord = tempWord + char;
            if (ctx.measureText(testWord).width > maxWidth) {
              lines.push(tempWord);
              tempWord = char;
            } else {
              tempWord = testWord;
            }
          }
          currentLine = tempWord;
        } else {
          const testLine = currentLine ? currentLine + ' ' + word : word;
          if (ctx.measureText(testLine).width > maxWidth && currentLine) {
            lines.push(currentLine);
            currentLine = word;
          } else {
            currentLine = testLine;
          }
        }
      }
      if (currentLine) lines.push(currentLine);
    }
    return lines;
  };

  const generateCanvasPoster = async (
    title, category, date, endTime, location, description, uniName, clubName, uniLogoUrl, clubLogoUrl,
    templateStyle = "classic", paletteIdx = 0, bgType = "preset_gradient", bgImageUrl = "",
    customColors = ["#6366f1", "#a855f7", "#3b82f6"], pattern = "circles_lines", imageOverlay = "dark"
  ) => {
    const W = 1080, H = 1350;
    const M = 80;
    const canvas = document.createElement('canvas');
    canvas.width = W;
    canvas.height = H;
    const ctx = canvas.getContext('2d');

    const loadImage = (src) => {
      return new Promise((resolve) => {
        if (!src) {
          resolve(null);
          return;
        }
        const img = new Image();
        img.crossOrigin = "anonymous";
        img.onload = () => resolve(img);
        img.onerror = () => resolve(null);
        img.src = src;
      });
    };

    const [uniLogoImg, clubLogoImg, bgImg] = await Promise.all([
      loadImage(uniLogoUrl),
      loadImage(clubLogoUrl),
      bgType === "image" && bgImageUrl ? loadImage(bgImageUrl) : Promise.resolve(null)
    ]);

    // Helper to calculate color luminance to distinguish light vs dark backgrounds
    const getLuminance = (hex) => {
      if (!hex || hex.charAt(0) !== '#') return 0;
      const r = parseInt(hex.substring(1, 3), 16) || 0;
      const g = parseInt(hex.substring(3, 5), 16) || 0;
      const b = parseInt(hex.substring(5, 7), 16) || 0;
      return 0.299 * r + 0.587 * g + 0.114 * b;
    };

    let isCustomGradientLight = false;
    if (bgType === "custom_gradient") {
      const activeColors = customColors.filter(Boolean);
      if (activeColors.length > 0) {
        const avgLuminance = activeColors.reduce((sum, color) => sum + getLuminance(color), 0) / activeColors.length;
        isCustomGradientLight = avgLuminance > 128;
      }
    }

    const palette = POSTER_PALETTES[paletteIdx] || POSTER_PALETTES[0];
    const activeIsLight = bgType === "image" 
      ? (imageOverlay === "light") 
      : (bgType === "custom_gradient" ? isCustomGradientLight : palette.isLight);

    const activeText = bgType === "preset_gradient" ? palette.text : (activeIsLight ? '#0f172a' : '#ffffff');
    // Boost accent opacity to ensure shapes are visible on both light and dark themes
    const activeAccent = activeIsLight ? 'rgba(15, 23, 42, 0.15)' : 'rgba(255, 255, 255, 0.18)';

    // 1. Arka plan çizimi
    if (bgType === "image") {
      if (bgImg) {
        // Draw image in cover mode (aspect ratio preserving)
        const imgRatio = bgImg.width / bgImg.height;
        const canvasRatio = W / H;
        let drawWidth, drawHeight, drawX, drawY;

        if (imgRatio > canvasRatio) {
          drawHeight = H;
          drawWidth = H * imgRatio;
          drawX = (W - drawWidth) / 2;
          drawY = 0;
        } else {
          drawWidth = W;
          drawHeight = W / imgRatio;
          drawX = 0;
          drawY = (H - drawHeight) / 2;
        }
        ctx.drawImage(bgImg, drawX, drawY, drawWidth, drawHeight);
      } else {
        ctx.fillStyle = '#0f172a';
        ctx.fillRect(0, 0, W, H);
      }
      // Textlerin okunabilmesi için görselin üstüne yarı saydam katman çiz
      ctx.fillStyle = imageOverlay === "light" ? 'rgba(255, 255, 255, 0.72)' : 'rgba(15, 23, 42, 0.72)';
      ctx.fillRect(0, 0, W, H);
    } else if (bgType === "custom_gradient") {
      const grad = ctx.createLinearGradient(0, 0, W * 0.3, H);
      const activeColors = customColors.filter(Boolean);
      if (activeColors.length > 0) {
        activeColors.forEach((c, i) => grad.addColorStop(i / (activeColors.length - 1), c));
      } else {
        grad.addColorStop(0, '#6366f1');
        grad.addColorStop(1, '#a855f7');
      }
      ctx.fillStyle = grad;
      ctx.fillRect(0, 0, W, H);
    } else {
      const grad = ctx.createLinearGradient(0, 0, W * 0.3, H);
      palette.bg.forEach((c, i) => grad.addColorStop(i / (palette.bg.length - 1), c));
      ctx.fillStyle = grad;
      ctx.fillRect(0, 0, W, H);
    }

    // 2 & 3. Desen Katmanı Çizimi
    if (pattern === "circles_lines") {
      // Dekoratif daireler
      for (let i = 0; i < 5; i++) {
        ctx.beginPath();
        const r = 100 + Math.random() * 250;
        ctx.arc(Math.random() * W, Math.random() * H, r, 0, Math.PI * 2);
        ctx.fillStyle = activeAccent;
        ctx.fill();
      }
      // Dekoratif çizgiler
      ctx.strokeStyle = activeAccent;
      ctx.lineWidth = 2;
      for (let i = 0; i < 8; i++) {
        ctx.beginPath();
        ctx.moveTo(Math.random() * W, Math.random() * H);
        ctx.lineTo(Math.random() * W, Math.random() * H);
        ctx.stroke();
      }
    } else if (pattern === "grid") {
      // Kareli Desen
      ctx.strokeStyle = activeIsLight ? 'rgba(15, 23, 42, 0.05)' : 'rgba(255, 255, 255, 0.08)';
      ctx.lineWidth = 1.5;
      const gridSize = 45;
      for (let x = 0; x < W; x += gridSize) {
        ctx.beginPath();
        ctx.moveTo(x, 0);
        ctx.lineTo(x, H);
        ctx.stroke();
      }
      for (let y = 0; y < H; y += gridSize) {
        ctx.beginPath();
        ctx.moveTo(0, y);
        ctx.lineTo(W, y);
        ctx.stroke();
      }
    } else if (pattern === "triangles") {
      // Üçgenli Desen
      ctx.fillStyle = activeAccent;
      for (let i = 0; i < 8; i++) {
        ctx.beginPath();
        const x = Math.random() * W, y = Math.random() * H;
        const size = 120 + Math.random() * 180;
        ctx.moveTo(x, y);
        ctx.lineTo(x + size, y + size / 2);
        ctx.lineTo(x - size / 2, y + size);
        ctx.closePath();
        ctx.fill();
      }
    } else if (pattern === "stripes") {
      // Çizgili Desen
      ctx.strokeStyle = activeAccent;
      ctx.lineWidth = 14;
      for (let i = -H; i < W; i += 140) {
        ctx.beginPath();
        ctx.moveTo(i, 0);
        ctx.lineTo(i + H, H);
        ctx.stroke();
      }
    } else if (pattern === "dots") {
      // Noktalı Desen
      ctx.fillStyle = activeAccent;
      const spacing = 45;
      const radius = 3;
      for (let x = spacing / 2; x < W; x += spacing) {
        for (let y = spacing / 2; y < H; y += spacing) {
          ctx.beginPath();
          ctx.arc(x, y, radius, 0, Math.PI * 2);
          ctx.fill();
        }
      }
    } else if (pattern === "waves") {
      // Dalgalı Desen
      ctx.strokeStyle = activeAccent;
      ctx.lineWidth = 2.5;
      const spacing = 60;
      for (let y = -50; y < H + 50; y += spacing) {
        ctx.beginPath();
        for (let x = 0; x <= W; x += 15) {
          const waveY = y + Math.sin(x * 0.015) * 15;
          if (x === 0) ctx.moveTo(x, waveY);
          else ctx.lineTo(x, waveY);
        }
        ctx.stroke();
      }
    } else if (pattern === "diamonds") {
      // Baklava Deseni (Eğik Çizgiler)
      ctx.strokeStyle = activeAccent;
      ctx.lineWidth = 1.5;
      const spacing = 60;
      for (let i = -H; i < W + H; i += spacing) {
        ctx.beginPath();
        ctx.moveTo(i, 0);
        ctx.lineTo(i + H, H);
        ctx.stroke();

        ctx.beginPath();
        ctx.moveTo(i, 0);
        ctx.lineTo(i - H, H);
        ctx.stroke();
      }
    } else if (pattern === "hexagons") {
      // Altıgen (6-gen) Desen
      ctx.fillStyle = activeAccent;
      for (let i = 0; i < 6; i++) {
        ctx.beginPath();
        const cx = Math.random() * W;
        const cy = Math.random() * H;
        const r = 80 + Math.random() * 120;
        for (let j = 0; j < 6; j++) {
          const angle = (j * Math.PI) / 3;
          const x = cx + r * Math.cos(angle);
          const y = cy + r * Math.sin(angle);
          if (j === 0) ctx.moveTo(x, y);
          else ctx.lineTo(x, y);
        }
        ctx.closePath();
        ctx.fill();
      }
    }

    // Helper function to draw circular images with white border
    const drawCircularImage = (img, cx, cy, r) => {
      if (!img) return;
      ctx.save();
      ctx.beginPath();
      ctx.arc(cx, cy, r, 0, Math.PI * 2);
      ctx.clip();
      ctx.drawImage(img, cx - r, cy - r, r * 2, r * 2);
      ctx.restore();

      // Border
      ctx.save();
      ctx.beginPath();
      ctx.arc(cx, cy, r, 0, Math.PI * 2);
      ctx.strokeStyle = '#ffffff';
      ctx.lineWidth = 4;
      ctx.stroke();
      ctx.restore();
    };

    if (templateStyle === "centered") {
      // 2. Dengeli Merkez Şablonu: Başlıklar ortada, logolar yanlarda
      ctx.save();
      ctx.textAlign = 'center';
      ctx.fillStyle = activeText;
      
      const uniText = uniName ? (uniName.startsWith("T.C.") ? uniName : `T.C. ${uniName}`) : 'T.C. Üniversite';
      const clubText = clubName || 'Öğrenci Topluluğu';
      
      let uniFontSize = 30;
      ctx.font = `bold ${uniFontSize}px "Segoe UI", Arial, sans-serif`;
      let w1 = ctx.measureText(uniText).width;
      while (w1 > 500 && uniFontSize > 18) {
        uniFontSize -= 1;
        ctx.font = `bold ${uniFontSize}px "Segoe UI", Arial, sans-serif`;
        w1 = ctx.measureText(uniText).width;
      }
      ctx.globalAlpha = 0.9;
      ctx.fillText(uniText, W / 2, 125);
      
      let clubFontSize = 22;
      ctx.font = `600 ${clubFontSize}px "Segoe UI", Arial, sans-serif`;
      let w2 = ctx.measureText(clubText).width;
      while (w2 > 500 && clubFontSize > 14) {
        clubFontSize -= 1;
        ctx.font = `600 ${clubFontSize}px "Segoe UI", Arial, sans-serif`;
        w2 = ctx.measureText(clubText).width;
      }
      ctx.globalAlpha = 0.7;
      ctx.fillText(clubText, W / 2, 165);
      ctx.restore();

      const textWidth = Math.max(w1, w2);
      const spacing = (textWidth / 2) + 70;
      drawCircularImage(uniLogoImg, (W / 2) - spacing, 135, 45);
      drawCircularImage(clubLogoImg, (W / 2) + spacing, 135, 45);
    } else if (templateStyle === "minimal") {
      // 3. Minimal Elit Şablonu: Logolar ortada yan yana, text altında
      drawCircularImage(uniLogoImg, (W / 2) - 45, 120, 48);
      drawCircularImage(clubLogoImg, (W / 2) + 45, 120, 48);

      ctx.save();
      ctx.textAlign = 'center';
      ctx.fillStyle = activeText;
      ctx.font = 'bold 22px "Segoe UI", Arial, sans-serif';
      ctx.globalAlpha = 0.8;
      ctx.fillText(`${uniName || 'Üniversite'} • ${clubName || 'Topluluğu'}`, W / 2, 210);
      ctx.restore();

      // İnce şık sınır çerçevesi
      ctx.strokeStyle = activeIsLight ? 'rgba(0,0,0,0.08)' : 'rgba(255,255,255,0.15)';
      ctx.lineWidth = 12;
      ctx.strokeRect(30, 30, W - 60, H - 60);
    } else {
      // 1. Klasik Modern Şablonu (Default)
      // 4. Üst dekoratif çizgi
      ctx.fillStyle = activeText;
      ctx.globalAlpha = 0.3;
      ctx.fillRect(M, 80, 150, 6);
      ctx.globalAlpha = 1;

      // 5. Üniversite ve Topluluk Adı (Genişliğe göre otomatik ölçekleme)
      const uniText = uniName ? (uniName.startsWith("T.C.") ? uniName : `T.C. ${uniName}`) : 'T.C. Üniversite';
      const clubText = clubName || 'Öğrenci Topluluğu';
      
      let uniFontSize = 30;
      const maxTextWidth = W - M - 260 - M; // Logo alanına taşmaması için
      ctx.font = `bold ${uniFontSize}px "Segoe UI", Arial, sans-serif`;
      let w1 = ctx.measureText(uniText).width;
      while (w1 > maxTextWidth && uniFontSize > 18) {
        uniFontSize -= 1;
        ctx.font = `bold ${uniFontSize}px "Segoe UI", Arial, sans-serif`;
        w1 = ctx.measureText(uniText).width;
      }
      ctx.fillStyle = activeText;
      ctx.globalAlpha = 0.9;
      ctx.fillText(uniText, M, 125);
      
      let clubFontSize = 22;
      ctx.font = `600 ${clubFontSize}px "Segoe UI", Arial, sans-serif`;
      let w2 = ctx.measureText(clubText).width;
      while (w2 > maxTextWidth && clubFontSize > 14) {
        clubFontSize -= 1;
        ctx.font = `600 ${clubFontSize}px "Segoe UI", Arial, sans-serif`;
        w2 = ctx.measureText(clubText).width;
      }
      ctx.globalAlpha = 0.7;
      ctx.fillText(clubText, M, 165);
      ctx.globalAlpha = 1;

      drawCircularImage(uniLogoImg, W - M - 170, 125, 50);
      drawCircularImage(clubLogoImg, W - M - 50, 125, 50);
    }

    // Text wrapping and layout height calculation (Dinamik dikey/yatay sığdırma ve taşma önleme)
    let titleFontSize = 80;
    let titleLineHeight = 96;
    let descFontSize = 32;
    let descLineHeight = 46;

    ctx.font = `bold ${titleFontSize}px "Segoe UI", Arial, sans-serif`;
    let titleLines = wrapText(ctx, title, W - (M * 2));
    ctx.font = `normal ${descFontSize}px "Segoe UI", Arial, sans-serif`;
    let descLines = description ? wrapText(ctx, description, W - 160) : [];
    let actualDescLinesCount = Math.min(descLines.length, 8);

    let titleHeight = titleLines.length * titleLineHeight;
    let gap = description ? 40 : 0;
    let descHeight = actualDescLinesCount * descLineHeight;
    let totalHeight = titleHeight + gap + descHeight;

    // Eğer dikey sığma alanı olan 740px'i aşıyorsa font boyutlarını kademeli olarak küçült
    while (totalHeight > 740 && (titleFontSize > 44 || descFontSize > 22)) {
      if (titleFontSize > 44) {
        titleFontSize -= 4;
        titleLineHeight = Math.round(titleFontSize * 1.2);
        ctx.font = `bold ${titleFontSize}px "Segoe UI", Arial, sans-serif`;
        titleLines = wrapText(ctx, title, W - (M * 2));
      }
      if (descFontSize > 22 && totalHeight > 740) {
        descFontSize -= 2;
        descLineHeight = Math.round(descFontSize * 1.4);
        ctx.font = `normal ${descFontSize}px "Segoe UI", Arial, sans-serif`;
        descLines = description ? wrapText(ctx, description, W - 160) : [];
      }
      actualDescLinesCount = Math.min(descLines.length, 8);
      titleHeight = titleLines.length * titleLineHeight;
      descHeight = actualDescLinesCount * descLineHeight;
      totalHeight = titleHeight + gap + descHeight;
    }

    // Dikeyde başlık ve açıklama bloğunu ortalamak için başlangıç y konumu
    const titleY = 200 + (860 - totalHeight) / 2;

    // 7. Ana başlık (büyük, kalın, word-wrap, ORTALANMIŞ)
    ctx.save();
    ctx.font = `bold ${titleFontSize}px "Segoe UI", Arial, sans-serif`;
    ctx.fillStyle = activeText;
    ctx.textAlign = 'center';
    titleLines.forEach((line, i) => {
      ctx.fillText(line, W / 2, titleY + i * titleLineHeight);
    });
    ctx.restore();

    let currentY = titleY + titleHeight + gap;

    // 7.5 Açıklama Metni (Detaylı Bilgi - ORTALANMIŞ)
    if (description) {
      ctx.save();
      ctx.font = `normal ${descFontSize}px "Segoe UI", Arial, sans-serif`;
      ctx.fillStyle = activeText;
      ctx.textAlign = 'center';
      ctx.globalAlpha = 0.85;
      
      for (let i = 0; i < actualDescLinesCount; i++) {
        let text = descLines[i];
        if (i === 7 && descLines.length > 8) {
           text += '...';
        }
        ctx.fillText(text, W / 2, currentY + i * descLineHeight);
      }
      ctx.restore();
    }

    // 8. Alt bölge — sadece info card'ın arkasına odaklı, tam alan değil
    // (arka plan rengi burada çizilmeyecek, doğrudan info card çizilecek)

    // 9. Tarih, Saat ve Konum — Yan yana kompakt info-card
    let validCols = [];
    if (date) {
      try {
        const d = new Date(date);
        const dateStr = d.toLocaleDateString('tr-TR', { day: 'numeric', month: 'long', year: 'numeric' });
        const timeStr = d.toLocaleTimeString('tr-TR', { hour: '2-digit', minute: '2-digit' });
        validCols.push({ type: 'calendar', label: 'TARİH', text: dateStr });
        validCols.push({ type: 'clock',    label: 'SAAT',  text: endTime ? `${timeStr} – ${endTime}` : timeStr });
      } catch(e) {}
    }
    if (location) {
      validCols.push({ type: 'map-pin', label: 'KONUM', text: location });
    }

    if (validCols.length > 0) {
      const cardH = 170;
      const cardPadX = 60;
      const cardY = H - cardH - 110;
      const cardW = W - cardPadX * 2;
      const cardX = cardPadX;
      const radius = 24;

      // Glassmorphism card arka planı
      ctx.save();
      ctx.beginPath();
      ctx.moveTo(cardX + radius, cardY);
      ctx.lineTo(cardX + cardW - radius, cardY);
      ctx.quadraticCurveTo(cardX + cardW, cardY, cardX + cardW, cardY + radius);
      ctx.lineTo(cardX + cardW, cardY + cardH - radius);
      ctx.quadraticCurveTo(cardX + cardW, cardY + cardH, cardX + cardW - radius, cardY + cardH);
      ctx.lineTo(cardX + radius, cardY + cardH);
      ctx.quadraticCurveTo(cardX, cardY + cardH, cardX, cardY + cardH - radius);
      ctx.lineTo(cardX, cardY + radius);
      ctx.quadraticCurveTo(cardX, cardY, cardX + radius, cardY);
      ctx.closePath();

      // Arka plan rengi (koyu temada siyah, açık temada beyaz, her ikisi de yarı saydam)
      ctx.fillStyle = activeIsLight ? 'rgba(255,255,255,0.80)' : 'rgba(0,0,0,0.55)';
      ctx.shadowColor = 'rgba(0,0,0,0.35)';
      ctx.shadowBlur = 40;
      ctx.fill();
      ctx.shadowBlur = 0;

      // İnce kenarlık
      ctx.strokeStyle = activeIsLight ? 'rgba(0,0,0,0.08)' : 'rgba(255,255,255,0.12)';
      ctx.lineWidth = 2;
      ctx.stroke();
      ctx.restore();

      // Her kolonu eşit genişlikte çiz
      const colW = cardW / validCols.length;

      validCols.forEach((col, idx) => {
        const cx = cardX + colW * idx + colW / 2;
        const iconSize = 36;
        const ix = cx - iconSize / 2;
        const iy = cardY + 24;

        // Sütunlar arası dikey ayırıcı
        if (idx > 0) {
          ctx.save();
          ctx.strokeStyle = activeIsLight ? 'rgba(0,0,0,0.10)' : 'rgba(255,255,255,0.15)';
          ctx.lineWidth = 1.5;
          ctx.beginPath();
          ctx.moveTo(cardX + colW * idx, cardY + 20);
          ctx.lineTo(cardX + colW * idx, cardY + cardH - 20);
          ctx.stroke();
          ctx.restore();
        }

        // -- İkon --
        ctx.save();
        ctx.strokeStyle = activeText;
        ctx.fillStyle = activeText;
        ctx.lineWidth = 3;
        ctx.lineJoin = 'round';
        ctx.lineCap = 'round';
        ctx.globalAlpha = 0.9;

        if (col.type === 'calendar') {
          ctx.strokeRect(ix, iy + 3, iconSize, iconSize - 3);
          ctx.fillRect(ix, iy + 3, iconSize, 4);
          ctx.fillRect(ix + 5, iy, 3, 5);
          ctx.fillRect(ix + iconSize - 8, iy, 3, 5);
        } else if (col.type === 'clock') {
          ctx.beginPath();
          ctx.arc(ix + iconSize/2, iy + iconSize/2, iconSize/2, 0, Math.PI * 2);
          ctx.stroke();
          ctx.beginPath();
          ctx.moveTo(ix + iconSize/2, iy + iconSize/2);
          ctx.lineTo(ix + iconSize/2, iy + 9);
          ctx.moveTo(ix + iconSize/2, iy + iconSize/2);
          ctx.lineTo(ix + iconSize/2 + 7, iy + iconSize/2);
          ctx.stroke();
        } else if (col.type === 'map-pin') {
          const px = ix + iconSize/2;
          const py = iy + iconSize/3 + 2;
          const pr = iconSize/3.5;
          ctx.beginPath();
          ctx.arc(px, py, pr, 0.75*Math.PI, 0.25*Math.PI);
          ctx.lineTo(px, iy + iconSize - 2);
          ctx.closePath();
          ctx.stroke();
          ctx.beginPath();
          ctx.arc(px, py, 3.5, 0, Math.PI * 2);
          ctx.fill();
        }
        ctx.restore();

        // -- Küçük etiket (TARİH / SAAT / KONUM) --
        ctx.save();
        ctx.font = `600 18px "Segoe UI", Arial, sans-serif`;
        ctx.textAlign = 'center';
        ctx.fillStyle = activeText;
        ctx.globalAlpha = 0.45;
        ctx.letterSpacing = '2px';
        ctx.fillText(col.label, cx, iy + iconSize + 26);
        ctx.restore();

        // -- Ana metin --
        ctx.save();
        ctx.textAlign = 'center';
        ctx.fillStyle = activeText;
        ctx.globalAlpha = 0.95;
        let fs = 26;
        ctx.font = `bold ${fs}px "Segoe UI", Arial, sans-serif`;
        // Taşarsa küçült
        while (ctx.measureText(col.text).width > colW - 30 && fs > 17) {
          fs -= 1;
          ctx.font = `bold ${fs}px "Segoe UI", Arial, sans-serif`;
        }
        ctx.fillText(col.text, cx, iy + iconSize + 58);
        ctx.restore();
      });
    }

    ctx.globalAlpha = 1;

    // 11. KampüsRadar marka yazısı — alt kısım
    ctx.save();
    ctx.font = 'bold 26px "Segoe UI", Arial, sans-serif';
    ctx.fillStyle = activeText;
    ctx.globalAlpha = 0.40;
    ctx.textAlign = 'center';
    ctx.fillText('kampüsradar', W / 2, H - 38);
    ctx.restore();
    ctx.globalAlpha = 1;

    return canvas;
  };

  const handleAIImageGenerate = async () => {
    if (!newEvent.title) {
      setErrorModal({ isOpen: true, message: "Lütfen önce bir etkinlik başlığı girin. Yapay zeka başlığa uygun bir afiş tasarlayacaktır." });
      return;
    }
    if (eventTime && !isValidTime(eventTime)) {
      setErrorModal({ isOpen: true, message: "Lütfen geçerli bir saat girin (Örn: 14:30)." });
      return;
    }
    if (eventEndTime && !isValidTime(eventEndTime)) {
      setErrorModal({ isOpen: true, message: "Lütfen geçerli bir bitiş saati girin (Örn: 16:00)." });
      return;
    }

    setIsGenerating(true);

    try {
      const combinedDate = eventDate ? `${eventDate}T${eventTime}:00+03:00` : "";
      
      const enhancedQuery = `abstract,${posterBgQuery || 'texture'}`;
      const bgImageUrl = posterBgType === "image"
        ? `https://loremflickr.com/1080/1350/${encodeURIComponent(enhancedQuery)}?lock=${Math.floor(Number(posterBgImageSig) * 100000)}`
        : "";

      // Canvas ile afiş üret
      const canvas = await generateCanvasPoster(
        newEvent.title,
        newEvent.category,
        combinedDate,
        eventEndTime,
        newEvent.location,
        newEvent.description,
        universityName,
        profile?.full_name,
        universityLogo,
        profile?.logo_url,
        posterTemplate,
        posterPaletteIndex,
        posterBgType,
        bgImageUrl,
        customColors,
        posterPattern,
        posterImageOverlay
      );
      const blob = await new Promise((resolve) => canvas.toBlob(resolve, 'image/jpeg', 0.82));
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
    setIsWizardOpen(true);
  };

  const now = new Date();
  const pastEvents = myEvents.filter(ev => ev.date && new Date(ev.date) < now);
  const activeEvents = myEvents.filter(ev => !ev.date || new Date(ev.date) >= now);

  const pastYears = Array.from(
    new Set(
      pastEvents
        .map(ev => {
          if (!ev.date) return null;
          try {
            return new Date(ev.date).getFullYear().toString();
          } catch (e) {
            return null;
          }
        })
        .filter(Boolean)
    )
  ).sort((a, b) => b - a);

  const filteredPastEvents = selectedYear === "all"
    ? pastEvents
    : pastEvents.filter(ev => {
        try {
          return ev.date && new Date(ev.date).getFullYear().toString() === selectedYear;
        } catch (e) {
          return false;
        }
      });

  if (authLoading || !profile) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center gap-3 text-gray-500">
        <Loader2 className="h-8 w-8 animate-spin text-slate-900" />
        <span className="text-sm font-medium">Yükleniyor...</span>
      </div>
    );
  }

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
        {profile?.is_approved === false ? (
          <div className="bg-white rounded-3xl border border-gray-100 p-8 sm:p-12 shadow-sm text-center max-w-2xl mx-auto my-12 flex flex-col items-center gap-6">
            {profile?.rejection_reason ? (
              <>
                <div className="h-24 w-24 bg-red-50 rounded-full flex items-center justify-center border border-red-100 text-red-500 shadow-inner">
                  <XCircle className="h-12 w-12 animate-bounce" />
                </div>
                <div>
                  <h2 className="text-2xl font-black text-gray-900 leading-tight">Hesabınız Askıya Alındı / Onaylanmadı</h2>
                  <p className="text-gray-550 mt-4 leading-relaxed text-sm">
                    Hesabınız bağlı olduğunuz üniversitenin Sağlık Kültür ve Spor Daire Başkanlığı (SKS) birimi tarafından askıya alınmış veya onaylanmamış olabilir.
                  </p>
                  <div className="mt-4 p-4 bg-red-50 border border-red-100 rounded-xl text-left">
                    <p className="text-xs font-bold text-red-650 uppercase">Gerekçe / Açıklama:</p>
                    <p className="text-sm text-red-900 mt-1 font-medium">{profile.rejection_reason}</p>
                  </div>
                </div>
              </>
            ) : (
              <>
                <div className="h-24 w-24 bg-amber-50 rounded-full flex items-center justify-center border border-amber-100 text-amber-500 shadow-inner">
                  <AlertTriangle className="h-12 w-12 animate-pulse" />
                </div>
                <div>
                  <h2 className="text-2xl font-black text-gray-900 leading-tight">SKS Onayı Bekleniyor</h2>
                  <p className="text-gray-500 mt-4 leading-relaxed text-sm">
                    Hesabınız bağlı olduğunuz üniversitenin Sağlık Kültür ve Spor Daire Başkanlığı (SKS) birimi tarafından incelenmektedir. 
                    Onaylanmanız durumunda sistemde aktif olacak ve etkinlik başvurusu yapabileceksiniz.
                  </p>
                </div>
              </>
            )}
            <div className="w-full h-px bg-gray-100 my-2"></div>
            <div className="flex flex-col sm:flex-row gap-4 w-full justify-center">
              <button 
                onClick={async () => {
                  try {
                    await signOut();
                    navigate("/");
                  } catch (err) {
                    console.error("Çıkış hatası:", err);
                  }
                }} 
                className="rounded-xl border border-gray-200 bg-white px-6 py-3 text-sm font-bold text-gray-600 shadow-sm transition hover:bg-gray-50 cursor-pointer"
              >
                Çıkış Yap ve Geri Dön
              </button>
            </div>
          </div>
        ) : (
          <>
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

        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center mb-6 gap-4">
          <div>
            <h2 className="text-2xl font-bold text-gray-900">Etkinlik Taleplerimiz</h2>
            <p className="text-sm text-gray-500 mt-1">SKS'ye gönderilen başvurular ve onay durumları.</p>
          </div>
          <button 
            onClick={handleOpenAddModal}
            className="flex items-center gap-2 bg-slate-900 text-white px-5 py-2.5 rounded-xl font-bold shadow-md hover:bg-slate-800 transition cursor-pointer"
          >
            <Plus className="h-5 w-5" />
            Yeni Etkinlik Başvurusu
          </button>
        </div>

        {/* Sekmeler */}
        <div className="flex border-b border-gray-200 mb-6">
          <button
            onClick={() => setActiveTab("active")}
            className={`py-3 px-4 sm:px-6 font-bold text-sm border-b-2 transition-all cursor-pointer ${
              activeTab === "active"
                ? "border-slate-900 text-slate-900 font-extrabold"
                : "border-transparent text-gray-500 hover:text-gray-700"
            }`}
          >
            Aktif Etkinlikler ({activeEvents.length})
          </button>
          <button
            onClick={() => {
              setActiveTab("past");
              setSelectedYear("all");
            }}
            className={`py-3 px-4 sm:px-6 font-bold text-sm border-b-2 transition-all cursor-pointer ${
              activeTab === "past"
                ? "border-slate-900 text-slate-900 font-extrabold"
                : "border-transparent text-gray-500 hover:text-gray-700"
            }`}
          >
            Geçmiş Etkinlikler ({pastEvents.length})
          </button>
        </div>

        {activeTab === "past" && pastEvents.length > 0 && (
          <div className="flex flex-col sm:flex-row sm:items-center gap-3 mb-6 bg-white p-4 rounded-2xl border border-gray-150 shadow-sm">
            <span className="text-sm font-bold text-slate-700">Yıl Filtresi:</span>
            <div className="flex flex-wrap gap-1.5">
              <button
                onClick={() => setSelectedYear("all")}
                className={`px-3.5 py-1.5 rounded-xl text-xs font-bold transition cursor-pointer border ${
                  selectedYear === "all"
                    ? "bg-slate-900 text-white border-slate-900 shadow-sm"
                    : "bg-slate-50 text-slate-600 border-slate-200 hover:bg-slate-100"
                }`}
              >
                Tümü
              </button>
              {pastYears.map(year => (
                <button
                  key={year}
                  onClick={() => setSelectedYear(year)}
                  className={`px-3.5 py-1.5 rounded-xl text-xs font-bold transition cursor-pointer border ${
                    selectedYear === year
                      ? "bg-slate-900 text-white border-slate-900 shadow-sm"
                      : "bg-slate-50 text-slate-600 border-slate-200 hover:bg-slate-100"
                  }`}
                >
                  {year}
                </button>
              ))}
            </div>
          </div>
        )}

        {loading ? (
          <div className="flex flex-col items-center justify-center py-16 gap-3 text-gray-400 bg-white rounded-2xl border border-gray-250 shadow-sm">
            <Loader2 className="h-8 w-8 animate-spin text-slate-900" />
            <span className="text-sm font-medium">Talepler yükleniyor...</span>
          </div>
        ) : activeTab === "active" && activeEvents.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-16 text-gray-400 bg-white rounded-2xl border border-gray-250 shadow-sm">
            <FileText className="h-10 w-10 mb-3 text-gray-300" />
            <p className="text-sm font-medium">Henüz aktif bir etkinlik başvurunuz bulunmuyor.</p>
          </div>
        ) : activeTab === "past" && pastEvents.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-16 text-gray-400 bg-white rounded-2xl border border-gray-250 shadow-sm">
            <Calendar className="h-10 w-10 mb-3 text-gray-300" />
            <p className="text-sm font-medium">Henüz geçmişte düzenlediğiniz bir etkinlik bulunmuyor.</p>
          </div>
        ) : activeTab === "past" && filteredPastEvents.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-16 text-gray-400 bg-white rounded-2xl border border-gray-250 shadow-sm">
            <Calendar className="h-10 w-10 mb-3 text-gray-300" />
            <p className="text-sm font-medium">{selectedYear} yılında düzenlenmiş bir geçmiş etkinlik bulunmuyor.</p>
          </div>
        ) : (
          <div className="space-y-4">
            {(activeTab === "active" ? activeEvents : filteredPastEvents).map((ev) => (
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
                    <span className="flex items-center gap-1"><Calendar className="h-3.5 w-3.5" /> {formatEventDate(ev.date, ev.end_time)}</span>
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

                <div className="shrink-0 flex flex-wrap items-center gap-2.5">
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
                    className="flex items-center gap-1.5 bg-indigo-50 text-indigo-700 hover:bg-indigo-100 px-3.5 py-2 rounded-xl text-xs font-bold border border-indigo-200 transition cursor-pointer"
                    title="Katılımcıları Yönet"
                  >
                    <Users className="h-4 w-4 text-indigo-500" /> Yönet
                  </button>
                  <button 
                    onClick={(e) => { e.stopPropagation(); handleOpenEditModal(ev); }}
                    className="flex items-center gap-1.5 bg-slate-50 text-slate-700 hover:bg-slate-100 px-3.5 py-2 rounded-xl text-xs font-bold border border-slate-200 transition cursor-pointer"
                    title="Başvuruyu Düzenle"
                  >
                    <Edit className="h-4 w-4 text-slate-500" /> Düzenle
                  </button>
                  <button 
                    onClick={(e) => { e.stopPropagation(); setDeleteModal({ isOpen: true, eventId: ev.id }); }}
                    className="flex items-center gap-1.5 bg-red-50 text-red-700 hover:bg-red-100 px-3.5 py-2 rounded-xl text-xs font-bold border border-red-200 transition cursor-pointer"
                    title="Başvuruyu Sil / Geri Çek"
                  >
                    <Trash2 className="h-4 w-4 text-red-500" /> Sil
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
          </>
        )}
      </main>

      {/* YENİ ETKİNLİK BAŞVURU FORMU POP-UP MODALI */}
      {isAddModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-sm p-4 sm:p-8 overflow-hidden">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-4xl flex flex-col max-h-[90vh]">
            <div className="px-6 py-4 border-b border-gray-100 flex items-center justify-between bg-slate-50 shrink-0">
              <h3 className="text-lg font-bold text-slate-900 flex items-center gap-2">
                <FileText className="h-5 w-5 text-slate-500" /> {editingEventId ? "Etkinlik İzin Talebini Düzenle" : "Yeni Etkinlik İzin Talebi"}
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
                        onChange={(e) => {
                          setNewEvent({...newEvent, category: e.target.value});
                          if (e.target.value !== "Diğer") {
                            setCustomCategory("");
                          }
                        }}
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
                        <option value="Yarışma">Yarışma</option>
                        <option value="Diğer">Diğer (Elle Yaz)</option>
                      </select>
                      {newEvent.category === "Diğer" && (
                        <div className="mt-2">
                          <input 
                            required
                            type="text" 
                            placeholder="Kategori adını yazınız..."
                            value={customCategory} 
                            onChange={(e) => setCustomCategory(e.target.value)}
                            className="w-full px-4 py-2 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-slate-900 text-sm"
                          />
                        </div>
                      )}
                    </div>
                    <div>
                      <label className="block text-sm font-semibold text-gray-700 mb-1">Tarih / Saat</label>
                      {/* Tarih + Saat — tek satır, hizalı */}
                      <div className="flex items-center gap-1.5 sm:gap-2">
                        {/* Tarih Seçici */}
                        <input
                          required
                          type="date"
                          value={eventDate}
                          onChange={(e) => setEventDate(e.target.value)}
                          className="flex-1 min-w-[130px] px-2 sm:px-3 py-2 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-slate-900 text-sm bg-white shadow-sm transition-all"
                        />
                        {/* Birleşik Saat Kutusu */}
                        <div className="shrink-0 flex items-center gap-0.5 bg-white border border-gray-200 rounded-xl px-2 py-2 focus-within:ring-2 focus-within:ring-slate-900 focus-within:border-transparent shadow-sm transition-all">
                          <input
                            required
                            type="text"
                            placeholder="SS:DD"
                            maxLength={5}
                            value={eventTime}
                            onChange={(e) => handleTimeChange(e, setEventTime)}
                            className="w-10 sm:w-11 bg-transparent outline-none text-sm text-center font-bold text-gray-900 placeholder-gray-400 tabular-nums"
                            title="Başlangıç Saati"
                          />
                          <span className="text-gray-300 font-bold select-none px-0.5">–</span>
                          <input
                            type="text"
                            placeholder="SS:DD"
                            maxLength={5}
                            value={eventEndTime}
                            onChange={(e) => handleTimeChange(e, setEventEndTime)}
                            className="w-10 sm:w-11 bg-transparent outline-none text-sm text-center font-bold text-gray-900 placeholder-gray-400 tabular-nums focus:placeholder-gray-300"
                            title="Bitiş Saati (Opsiyonel)"
                          />
                        </div>
                      </div>
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
                    <div className="flex items-center justify-between mb-1">
                      <label className="block text-sm font-semibold text-gray-700">Detaylı Açıklama</label>
                      <button
                        type="button"
                        className="flex items-center gap-1.5 text-xs font-bold transition px-2.5 py-1 rounded-lg border shadow-sm cursor-pointer hover:bg-slate-50"
                        style={{ color: '#1a3050', borderColor: '#1a3050' }}
                        onClick={() => {
                          setAiInfoModalOpen(true);
                        }}
                        title="Yapay Zeka ile Açıklama Oluştur"
                      >
                        <Sparkles className="h-3.5 w-3.5" style={{ color: '#1a3050' }} />
                        AI ile Oluştur
                      </button>
                    </div>
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
                      onClick={() => {
                        if (!newEvent.title) {
                          setErrorModal({ isOpen: true, message: "Lütfen önce bir etkinlik başlığı girin. Yapay zeka başlığa uygun bir afiş tasarlayacaktır." });
                          return;
                        }
                        handleOpenWizard();
                      }}
                      disabled={isGenerating || isUploading}
                      className="flex items-center justify-center gap-2 rounded-xl px-4 py-3 transition shadow-sm group cursor-pointer disabled:opacity-50 text-white font-extrabold tracking-tight"
                      style={{ backgroundColor: '#1a3050' }}
                    >
                      {isGenerating ? <Loader2 className="h-5 w-5 animate-spin text-white" /> : <Sparkles className="h-5 w-5 group-hover:scale-110 transition-transform text-white" />}
                      <span>{isGenerating ? "Üretiliyor..." : "Afiş Üret"}</span>
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
                    {editingEventId ? "Başvuruyu Güncelle" : "Talebi SKS'ye Gönder"}
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
                      {viewEvent.date ? formatEventDate(viewEvent.date, viewEvent.end_time) : "-"}
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
              <div className="relative rounded-xl overflow-hidden shadow-lg border border-slate-200 w-full max-w-[320px] aspect-[4/5] bg-white">
                {aiPreview.url && (
                  <img 
                    src={aiPreview.url} 
                    alt="Üretilen Afiş Önizlemesi" 
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

      {/* Yapay Zeka Açıklama Sihirbazı */}
      {aiInfoModalOpen && (
        <div className="fixed inset-0 z-[70] flex items-center justify-center bg-slate-900/60 backdrop-blur-sm p-4 overflow-y-auto">
          <div className="bg-white rounded-3xl shadow-2xl w-full max-w-lg p-6 transform transition-all border border-gray-100 flex flex-col relative">

            {/* ─── LOADING OVERLAY ─── */}
            {aiLoading && (
              <div className="absolute inset-0 bg-[#0b1329]/98 rounded-3xl z-[80] flex flex-col items-center justify-center p-6 text-white overflow-hidden select-none">
                <style>{`
                  @keyframes float-particle-loading {
                    0%, 100% { transform: translateY(0) scale(0.8); opacity: 0.3; }
                    50% { transform: translateY(-15px) scale(1.2); opacity: 0.8; }
                  }
                  @keyframes pulse-ring {
                    0% { transform: scale(0.95); opacity: 0.5; }
                    50% { transform: scale(1.05); opacity: 0.8; }
                    100% { transform: scale(0.95); opacity: 0.5; }
                  }
                  @keyframes star-spin {
                    0% { transform: rotate(0deg) scale(1); }
                    50% { transform: rotate(180deg) scale(1.1); }
                    100% { transform: rotate(360deg) scale(1); }
                  }
                  @keyframes text-shine {
                    0%, 100% { opacity: 0.6; }
                    50% { opacity: 1; }
                  }
                `}</style>
                <button
                  onClick={handleCancelAiGeneration}
                  className="absolute top-4 right-4 text-slate-400 hover:text-white transition-all cursor-pointer bg-slate-800/80 hover:bg-slate-700 rounded-full p-2 border border-slate-700/50 hover:scale-105 active:scale-95"
                  title="Yazmayı Durdur"
                >
                  <X className="h-4 w-4" />
                </button>
                <div className="relative flex items-center justify-center w-32 h-32 mb-8">
                  {/* Glowing background rings */}
                  <div className="absolute inset-0 bg-blue-500/10 rounded-full animate-ping" style={{ animationDuration: '3s' }}></div>
                  <div className="absolute w-24 h-24 bg-indigo-500/20 rounded-full" style={{ animation: 'pulse-ring 2s infinite ease-in-out' }}></div>
                  <div className="absolute w-20 h-20 rounded-full border border-dashed border-slate-700 animate-spin" style={{ animationDuration: '12s' }}></div>
                  
                  {/* Floating multi-colored particles */}
                  <div className="absolute top-2 left-4 w-2 h-2 bg-yellow-300 rounded-full" style={{ animation: 'float-particle-loading 2.2s infinite ease-in-out' }}></div>
                  <div className="absolute bottom-4 right-6 w-2.5 h-2.5 bg-blue-400 rounded-full" style={{ animation: 'float-particle-loading 1.8s infinite ease-in-out', animationDelay: '0.4s' }}></div>
                  <div className="absolute top-8 right-2 w-1.5 h-1.5 bg-purple-400 rounded-full" style={{ animation: 'float-particle-loading 2.5s infinite ease-in-out', animationDelay: '0.9s' }}></div>
                  <div className="absolute bottom-6 left-8 w-2 h-2 bg-pink-400 rounded-full" style={{ animation: 'float-particle-loading 2s infinite ease-in-out', animationDelay: '1.3s' }}></div>

                  {/* Central Star Card */}
                  <div className="relative h-16 w-16 bg-gradient-to-tr from-[#1a3050] to-indigo-950 rounded-2xl flex items-center justify-center shadow-2xl border border-indigo-500/30 hover:shadow-indigo-500/20 transition-all duration-300">
                    <Sparkles 
                      className="h-8 w-8 text-yellow-300" 
                      style={{ animation: 'star-spin 4s infinite linear' }}
                    />
                  </div>
                </div>
                <div className="space-y-2 text-center max-w-[300px]">
                  <h4 className="text-base font-extrabold tracking-wide text-transparent bg-clip-text bg-gradient-to-r from-blue-300 via-indigo-200 to-purple-300" style={{ animation: 'text-shine 2s infinite ease-in-out' }}>
                    Yapay Zeka Sihirbazı Yazıyor
                  </h4>
                  <p className="text-xs text-slate-400">Etkinliğinize özel açıklama metni hazırlanıyor...</p>
                </div>
                <button
                  onClick={handleCancelAiGeneration}
                  className="mt-8 px-6 py-2.5 text-xs font-bold text-slate-300 hover:text-white border border-slate-700 hover:border-slate-600 bg-slate-900/90 hover:bg-slate-800 rounded-xl transition-all hover:scale-105 active:scale-95 shadow-lg flex items-center gap-2"
                >
                  <X className="h-3 w-3" />
                  Yazmayı İptal Et
                </button>
              </div>
            )}

            {/* ─── BUSY (YOĞUNLUK) ERROR OVERLAY ─── */}
            {!aiLoading && aiErrorType === 'busy' && (
              <div className="absolute inset-0 bg-[#1c130c]/98 rounded-3xl z-[80] flex flex-col items-center justify-center p-6 text-white overflow-hidden select-none">
                <style>{`
                  @keyframes clock-hand-spin {
                    0% { transform: rotate(0deg); }
                    100% { transform: rotate(360deg); }
                  }
                  @keyframes ripple-amber-effect {
                    0% { transform: scale(0.95); opacity: 0.8; }
                    50% { transform: scale(1.1); opacity: 0.3; }
                    100% { transform: scale(1.25); opacity: 0; }
                  }
                  @keyframes float-particle-amber {
                    0%, 100% { transform: translateY(0) scale(0.8); opacity: 0.2; }
                    50% { transform: translateY(-12px) scale(1.1); opacity: 0.7; }
                  }
                `}</style>
                <button
                  onClick={() => { setAiErrorType(''); setAiError(''); }}
                  className="absolute top-4 right-4 text-amber-400 hover:text-white transition-all cursor-pointer bg-amber-900/80 hover:bg-amber-800 rounded-full p-2 border border-amber-700/50 hover:scale-105 active:scale-95"
                >
                  <X className="h-4 w-4" />
                </button>
                <div className="relative w-28 h-28 flex items-center justify-center mb-6">
                  {/* Glowing background waves */}
                  <div className="absolute inset-0 bg-amber-500/10 rounded-full animate-pulse"></div>
                  <div className="absolute w-20 h-20 rounded-full border-2 border-amber-500/20" style={{ animation: 'ripple-amber-effect 2.5s infinite ease-out' }}></div>
                  <div className="absolute w-20 h-20 rounded-full border border-amber-500/30" style={{ animation: 'ripple-amber-effect 2.5s infinite ease-out', animationDelay: '1.25s' }}></div>
                  
                  {/* Floating amber particles */}
                  <div className="absolute top-4 left-6 w-2 h-2 bg-amber-400 rounded-full" style={{ animation: 'float-particle-amber 2s infinite ease-in-out' }}></div>
                  <div className="absolute bottom-4 right-6 w-1.5 h-1.5 bg-orange-400 rounded-full" style={{ animation: 'float-particle-amber 2.4s infinite ease-in-out', animationDelay: '0.6s' }}></div>
                  <div className="absolute top-10 right-4 w-2.5 h-2.5 bg-yellow-500 rounded-full" style={{ animation: 'float-particle-amber 1.8s infinite ease-in-out', animationDelay: '1.2s' }}></div>

                  {/* Central Animated Clock Container */}
                  <div className="relative w-16 h-16 bg-gradient-to-tr from-amber-950 to-orange-950 rounded-2xl flex items-center justify-center border border-amber-500/30 shadow-2xl hover:scale-105 transition-transform duration-300">
                    <Clock className="h-8 w-8 text-amber-400 animate-pulse" />
                    {/* Simulated spinning hands */}
                    <div className="absolute inset-0 flex items-center justify-center">
                      <div className="w-1 h-3 bg-amber-300 rounded-full origin-bottom -translate-y-1.5" style={{ animation: 'clock-hand-spin 4s infinite linear' }}></div>
                      <div className="w-1.5 h-2 bg-amber-400 rounded-full origin-bottom -translate-y-1" style={{ animation: 'clock-hand-spin 24s infinite linear' }}></div>
                    </div>
                  </div>
                </div>
                <h4 className="text-base font-extrabold text-amber-200 mb-2 text-center tracking-wide">Şu An Biraz Yoğunuz</h4>
                <p className="text-xs text-amber-300/80 text-center max-w-[280px] leading-relaxed mb-2">
                  Yapay zeka sihirbazımıza şu an çok fazla istek geliyor. Birkaç saniye bekleyip tekrar deneyebilirsiniz.
                </p>
                <button
                  onClick={() => { setAiErrorType(''); setAiError(''); generateDescriptionWithGemini(); }}
                  className="mt-6 px-6 py-2.5 text-sm font-bold text-amber-950 bg-gradient-to-r from-amber-400 to-amber-300 hover:from-amber-300 hover:to-amber-200 rounded-xl transition-all hover:scale-105 active:scale-95 shadow-[0_0_15px_rgba(245,158,11,0.25)] hover:shadow-[0_0_20px_rgba(245,158,11,0.4)] cursor-pointer"
                >
                  Tekrar Dene
                </button>
              </div>
            )}

            {/* ─── GENERIC ERROR OVERLAY ─── */}
            {!aiLoading && aiErrorType === 'error' && (
              <div className="absolute inset-0 bg-[#210c0e]/98 rounded-3xl z-[80] flex flex-col items-center justify-center p-6 text-white overflow-hidden select-none">
                <style>{`
                  @keyframes error-shake {
                    0%, 100% { transform: rotate(0deg) scale(1); }
                    20%, 60% { transform: rotate(-5deg) scale(1.05); }
                    40%, 80% { transform: rotate(5deg) scale(1.05); }
                  }
                  @keyframes ripple-rose-effect {
                    0% { transform: scale(0.95); opacity: 0.8; }
                    50% { transform: scale(1.1); opacity: 0.3; }
                    100% { transform: scale(1.25); opacity: 0; }
                  }
                  @keyframes float-particle-rose {
                    0%, 100% { transform: translateY(0) scale(0.8); opacity: 0.2; }
                    50% { transform: translateY(-12px) scale(1.1); opacity: 0.7; }
                  }
                `}</style>
                <button
                  onClick={() => { setAiErrorType(''); setAiError(''); }}
                  className="absolute top-4 right-4 text-rose-400 hover:text-white transition-all cursor-pointer bg-rose-900/80 hover:bg-rose-800 rounded-full p-2 border border-rose-700/50 hover:scale-105 active:scale-95"
                >
                  <X className="h-4 w-4" />
                </button>
                <div className="relative w-28 h-28 flex items-center justify-center mb-6">
                  {/* Glowing background waves */}
                  <div className="absolute inset-0 bg-rose-500/10 rounded-full animate-pulse"></div>
                  <div className="absolute w-20 h-20 rounded-full border-2 border-rose-500/20" style={{ animation: 'ripple-rose-effect 2.5s infinite ease-out' }}></div>
                  <div className="absolute w-20 h-20 rounded-full border border-rose-500/30" style={{ animation: 'ripple-rose-effect 2.5s infinite ease-out', animationDelay: '1.25s' }}></div>
                  
                  {/* Floating rose particles */}
                  <div className="absolute top-4 left-6 w-2 h-2 bg-rose-400 rounded-full" style={{ animation: 'float-particle-rose 2s infinite ease-in-out' }}></div>
                  <div className="absolute bottom-4 right-6 w-1.5 h-1.5 bg-red-400 rounded-full" style={{ animation: 'float-particle-rose 2.4s infinite ease-in-out', animationDelay: '0.6s' }}></div>
                  <div className="absolute top-10 right-4 w-2.5 h-2.5 bg-pink-500 rounded-full" style={{ animation: 'float-particle-rose 1.8s infinite ease-in-out', animationDelay: '1.2s' }}></div>

                  {/* Central Animated Alert Container */}
                  <div 
                    className="relative w-16 h-16 bg-gradient-to-tr from-rose-950 to-red-950 rounded-2xl flex items-center justify-center border border-rose-500/30 shadow-2xl cursor-pointer"
                    style={{ animation: 'error-shake 3s infinite ease-in-out' }}
                  >
                    <AlertTriangle className="h-8 w-8 text-rose-400 animate-pulse" />
                  </div>
                </div>
                <h4 className="text-base font-extrabold text-rose-200 mb-2 text-center tracking-wide">Küçük Bir Sorun Oluştu</h4>
                <p className="text-xs text-rose-300/80 text-center max-w-[280px] leading-relaxed mb-2">
                  Açıklama oluşturulurken beklenmedik bir sorun yaşandı. Lütfen tekrar deneyin.
                </p>
                <button
                  onClick={() => { setAiErrorType(''); setAiError(''); generateDescriptionWithGemini(); }}
                  className="mt-6 px-6 py-2.5 text-sm font-bold text-white bg-gradient-to-r from-rose-600 to-rose-500 hover:from-rose-500 hover:to-rose-400 rounded-xl transition-all hover:scale-105 active:scale-95 shadow-[0_0_15px_rgba(225,29,72,0.25)] hover:shadow-[0_0_20px_rgba(225,29,72,0.4)] cursor-pointer"
                >
                  Tekrar Dene
                </button>
              </div>
            )}

            <button 
              onClick={() => { setAiInfoModalOpen(false); setAiResult(""); setAiError(""); setAiErrorType(""); }}
              className="absolute top-4 right-4 text-gray-400 hover:text-gray-600 transition cursor-pointer bg-slate-100 rounded-full p-1.5 hover:bg-slate-200 z-10"
            >
              <X className="h-4 w-4" />
            </button>
            
            <div className="flex items-center gap-3 mb-6">
              <div className="h-10 w-10 rounded-xl flex items-center justify-center" style={{ backgroundColor: '#f0f4f8', color: '#1a3050' }}>
                <Sparkles className="h-5 w-5" />
              </div>
              <div>
                <h3 className="text-lg font-bold text-slate-900">AI Açıklama Sihirbazı</h3>
                <p className="text-xs text-slate-500">Etkinlik detaylarınızı yapay zeka ile canlandırın</p>
              </div>
            </div>

            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-3">
                <div className="bg-slate-50 p-3 rounded-xl border border-slate-100">
                  <span className="block text-[10px] font-bold text-slate-400 uppercase mb-1">Etkinlik Başlığı</span>
                  <span className="text-sm font-semibold text-slate-700 truncate block">{newEvent.title || 'Belirtilmedi'}</span>
                </div>
                <div className="bg-slate-50 p-3 rounded-xl border border-slate-100">
                  <span className="block text-[10px] font-bold text-slate-400 uppercase mb-1">Kategori</span>
                  <span className="text-sm font-semibold text-slate-700 truncate block">{newEvent.category || 'Belirtilmedi'}</span>
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1.5">Eklemek İstediğiniz Detaylar (Opsiyonel)</label>
                <textarea 
                  value={aiKeywords} onChange={(e) => setAiKeywords(e.target.value)}
                  placeholder="Örn: Pizza ikramı var, katılım belgesi verilecek, kontenjan sınırlı..."
                  className="w-full text-sm px-3 py-2 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-slate-400 resize-none h-20"
                ></textarea>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1.5">Yazım Dili / Tonlama</label>
                <div className="grid grid-cols-3 gap-2">
                  <button onClick={() => setAiTone('friendly')} className={`py-2 text-xs font-semibold rounded-lg border transition cursor-pointer ${aiTone === 'friendly' ? 'text-white border-transparent shadow-sm' : 'bg-white border-slate-200 text-slate-600 hover:bg-slate-50'}`} style={aiTone === 'friendly' ? { backgroundColor: '#1a3050' } : {}}>Eğlenceli</button>
                  <button onClick={() => setAiTone('academic')} className={`py-2 text-xs font-semibold rounded-lg border transition cursor-pointer ${aiTone === 'academic' ? 'text-white border-transparent shadow-sm' : 'bg-white border-slate-200 text-slate-600 hover:bg-slate-50'}`} style={aiTone === 'academic' ? { backgroundColor: '#1a3050' } : {}}>Akademik</button>
                  <button onClick={() => setAiTone('exciting')} className={`py-2 text-xs font-semibold rounded-lg border transition cursor-pointer ${aiTone === 'exciting' ? 'text-white border-transparent shadow-sm' : 'bg-white border-slate-200 text-slate-600 hover:bg-slate-50'}`} style={aiTone === 'exciting' ? { backgroundColor: '#1a3050' } : {}}>Heyecanlı</button>
                </div>
              </div>

              {aiResult ? (
                <div className="mt-2 flex flex-col gap-3">
                  <div className="p-4 bg-slate-50 border border-slate-200 rounded-xl max-h-48 overflow-y-auto text-sm text-slate-800 whitespace-pre-wrap leading-relaxed">
                    {aiResult}
                  </div>
                  <div className="flex gap-2">
                    <button onClick={generateDescriptionWithGemini} disabled={aiLoading} className="flex-1 py-2.5 border border-slate-200 bg-white text-slate-700 text-sm font-bold rounded-xl hover:bg-slate-50 transition disabled:opacity-50 cursor-pointer">
                      Yeniden Üret
                    </button>
                    <button onClick={() => { setNewEvent({...newEvent, description: aiResult}); setAiInfoModalOpen(false); setAiResult(""); }} className="flex-1 py-2.5 text-white text-sm font-bold rounded-xl transition shadow-md cursor-pointer hover:opacity-90" style={{ backgroundColor: '#1a3050' }}>
                      Açıklamayı Kullan
                    </button>
                  </div>
                </div>
              ) : (
                <button
                  onClick={generateDescriptionWithGemini}
                  disabled={aiLoading}
                  className="w-full mt-2 py-3 bg-navy-800 hover:bg-navy-700 text-white font-bold rounded-xl transition shadow-lg flex items-center justify-center gap-2 cursor-pointer disabled:opacity-60" style={{backgroundColor: aiLoading ? '#1e3a5f' : '#1a3050'}}
                >
                  {aiLoading ? (
                    <>
                      <Loader2 className="h-4 w-4 animate-spin" /> Üretiliyor...
                    </>
                  ) : (
                    <>
                      <Sparkles className="h-4 w-4" /> Açıklama Üret
                    </>
                  )}
                </button>
              )}
            </div>
          </div>
        </div>
      )}

      {/* AFİŞ TASARIM SİHİRBAZI MODALI */}
      {isWizardOpen && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center bg-slate-900/60 backdrop-blur-sm p-4 overflow-y-auto">
          <div className="bg-white rounded-3xl shadow-2xl w-full max-w-xl overflow-hidden flex flex-col transform transition-all border border-gray-100 my-8">
            {/* Header */}
            <div className="px-6 py-4 border-b border-gray-150 flex items-center justify-between bg-slate-50 shrink-0">
              <h3 className="text-lg font-bold text-slate-950 flex items-center gap-2">
                <Sparkles className="h-5 w-5 animate-pulse" style={{ color: '#1a3050' }} />
                Afiş Tasarım Sihirbazı
              </h3>
              <button 
                onClick={() => setIsWizardOpen(false)}
                className="text-gray-400 hover:text-gray-600 transition cursor-pointer bg-white rounded-full p-1 hover:bg-gray-200"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            <div className="p-6 overflow-y-auto max-h-[70vh] flex flex-col gap-6">
              
              {/* Adım 1: Şablon Yerleşimi */}
              <div>
                <label className="block text-xs font-black text-slate-400 uppercase tracking-widest mb-3">ADIM 1: ŞABLON DÜZENİ SEÇİN</label>
                <div className="grid grid-cols-3 gap-3">
                  
                  {/* Klasik Modern */}
                  <button
                    type="button"
                    onClick={() => setPosterTemplate("classic")}
                    className={`flex flex-col items-center p-3 rounded-2xl border-2 transition text-left cursor-pointer group hover:border-slate-400 ${
                      posterTemplate === "classic" ? "border-slate-900 bg-slate-50/50 shadow-sm" : "border-slate-200 bg-white"
                    }`}
                  >
                    {/* Mock Layout Preview */}
                    <div className="w-full aspect-[4/5] rounded-xl bg-slate-950 p-2.5 flex flex-col justify-between mb-2 shadow-inner border border-slate-800 relative overflow-hidden">
                      {/* Top Header */}
                      <div className="flex justify-between items-start">
                        {/* Text lines left */}
                        <div className="space-y-1 w-1/2">
                          <div className="h-1.5 bg-slate-800 rounded w-full"></div>
                          <div className="h-1 bg-slate-900 rounded w-3/4"></div>
                        </div>
                        {/* Logos right */}
                        <div className="flex gap-0.5">
                          <div className="w-4 h-4 rounded-full border border-dashed border-slate-700 bg-slate-900"></div>
                          <div className="w-4 h-4 rounded-full border border-dashed border-slate-700 bg-slate-900"></div>
                        </div>
                      </div>
                      
                      {/* Main Title Center */}
                      <div className="space-y-1.5 my-auto">
                        <div className="h-3 bg-slate-805 rounded w-4/5 mx-auto"></div>
                        <div className="h-2 bg-slate-805 rounded w-11/12 mx-auto"></div>
                      </div>

                      {/* Footer Info */}
                      <div className="space-y-1 mt-auto">
                        <div className="h-1 bg-slate-800 rounded w-1/2"></div>
                        <div className="h-1 bg-slate-800 rounded w-2/3"></div>
                      </div>
                    </div>
                    <span className="text-[11px] font-extrabold text-slate-800 leading-tight">Klasik Modern</span>
                    <span className="text-[9px] text-slate-450 mt-0.5">Logolar sağ üst köşede</span>
                  </button>

                  {/* Dengeli Merkez */}
                  <button
                    type="button"
                    onClick={() => setPosterTemplate("centered")}
                    className={`flex flex-col items-center p-3 rounded-2xl border-2 transition text-left cursor-pointer group hover:border-slate-400 ${
                      posterTemplate === "centered" ? "border-slate-900 bg-slate-50/50 shadow-sm" : "border-slate-200 bg-white"
                    }`}
                  >
                    {/* Mock Layout Preview */}
                    <div className="w-full aspect-[4/5] rounded-xl bg-slate-950 p-2.5 flex flex-col justify-between mb-2 shadow-inner border border-slate-800 relative overflow-hidden">
                      {/* Top Header */}
                      <div className="flex items-center justify-center gap-1.5 mt-1">
                        <div className="w-3.5 h-3.5 rounded-full border border-dashed border-slate-700 bg-slate-900"></div>
                        <div className="h-2 bg-slate-850 rounded w-16"></div>
                        <div className="w-3.5 h-3.5 rounded-full border border-dashed border-slate-700 bg-slate-900"></div>
                      </div>
                      
                      {/* Main Title Center */}
                      <div className="space-y-1.5 my-auto">
                        <div className="h-3 bg-slate-800 rounded w-4/5 mx-auto"></div>
                        <div className="h-2 bg-slate-800 rounded w-11/12 mx-auto"></div>
                      </div>

                      {/* Footer Info */}
                      <div className="space-y-1 mt-auto">
                        <div className="h-1 bg-slate-800 rounded w-1/2"></div>
                        <div className="h-1 bg-slate-800 rounded w-2/3"></div>
                      </div>
                    </div>
                    <span className="text-[11px] font-extrabold text-slate-800 leading-tight">Dengeli Merkez</span>
                    <span className="text-[9px] text-slate-450 mt-0.5">Logolar başlıklara hizalı</span>
                  </button>

                  {/* Minimal Elit */}
                  <button
                    type="button"
                    onClick={() => setPosterTemplate("minimal")}
                    className={`flex flex-col items-center p-3 rounded-2xl border-2 transition text-left cursor-pointer group hover:border-slate-400 ${
                      posterTemplate === "minimal" ? "border-slate-900 bg-slate-50/50 shadow-sm" : "border-slate-200 bg-white"
                    }`}
                  >
                    {/* Mock Layout Preview */}
                    <div className="w-full aspect-[4/5] rounded-xl bg-slate-950 p-2.5 flex flex-col justify-between mb-2 shadow-inner border border-slate-800 relative overflow-hidden">
                      {/* Outer Border Frame */}
                      <div className="absolute inset-1 border border-dashed border-slate-700/60 rounded-lg pointer-events-none"></div>
                      
                      {/* Top Header Logos Overlapping */}
                      <div className="flex justify-center -space-x-1 mt-2.5">
                        <div className="w-4 h-4 rounded-full border border-dashed border-slate-700 bg-slate-900"></div>
                        <div className="w-4 h-4 rounded-full border border-dashed border-slate-700 bg-slate-900"></div>
                      </div>
                      
                      {/* Main Title Center */}
                      <div className="space-y-1.5 my-auto">
                        <div className="h-3 bg-slate-850 rounded w-3/4 mx-auto"></div>
                        <div className="h-2 bg-slate-850 rounded w-2/3 mx-auto"></div>
                      </div>

                      {/* Footer Info */}
                      <div className="space-y-1 mt-auto">
                        <div className="h-1 bg-slate-850 rounded w-1/2 mx-auto"></div>
                      </div>
                    </div>
                    <span className="text-[11px] font-extrabold text-slate-800 leading-tight">Minimal Elit</span>
                    <span className="text-[9px] text-slate-450 mt-0.5">Üst üste binen logolar & çerçeve</span>
                  </button>

                </div>
              </div>

              {/* Adım 2: Arka Plan Tipi Seçimi */}
              <div>
                <label className="block text-xs font-black text-slate-400 uppercase tracking-widest mb-3">ADIM 2: ARKA PLAN TÜRÜ</label>
                <div className="grid grid-cols-3 gap-2">
                  {[
                    { id: "preset_gradient", label: "Hazır Renkler" },
                    { id: "custom_gradient", label: "Özel Renk Tasarla" },
                    { id: "image", label: "Görsel Arka Plan" }
                  ].map((t) => (
                    <button
                      key={t.id}
                      type="button"
                      onClick={() => setPosterBgType(t.id)}
                      className={`py-2 px-3 text-xs font-bold rounded-xl border-2 transition text-center cursor-pointer ${
                        posterBgType === t.id 
                          ? "bg-slate-950 border-slate-950 text-white shadow-sm"
                          : "bg-white border-slate-200 text-slate-650 hover:bg-slate-50"
                      }`}
                    >
                      {t.label}
                    </button>
                  ))}
                </div>
              </div>

              {/* Adım 3: Arka Plan Detayları */}
              <div>
                {posterBgType === "preset_gradient" && (
                  <div>
                    <label className="block text-xs font-black text-slate-400 uppercase tracking-widest mb-3">ADIM 3: HAZIR RENK TEMASI SEÇİN</label>
                    <div className="space-y-4">
                      {/* Karanlık Temalar */}
                      <div>
                        <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block mb-2">Karanlık Temalar</span>
                        <div className="grid grid-cols-4 sm:grid-cols-8 gap-2.5">
                          {POSTER_PALETTES.map((pal, idx) => {
                            if (pal.isLight) return null;
                            return (
                              <button
                                key={idx}
                                type="button"
                                title={pal.name}
                                onClick={() => setPosterPaletteIndex(idx)}
                                className={`aspect-square rounded-2xl border-2 transition relative flex items-center justify-center cursor-pointer hover:scale-105 active:scale-95 shadow-sm ${
                                  posterPaletteIndex === idx ? "border-slate-950 scale-105 ring-2 ring-slate-900/25 shadow-md" : "border-slate-100"
                                }`}
                                style={{
                                  background: `linear-gradient(135deg, ${pal.bg[0]} 0%, ${pal.bg[pal.bg.length - 1]} 100%)`
                                }}
                              >
                                {posterPaletteIndex === idx && (
                                  <Check className="h-5 w-5 text-white" />
                                )}
                              </button>
                            );
                          })}
                        </div>
                      </div>

                      {/* Aydınlık Temalar */}
                      <div>
                        <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block mb-2">Aydınlık Temalar</span>
                        <div className="grid grid-cols-4 sm:grid-cols-8 gap-2.5">
                          {POSTER_PALETTES.map((pal, idx) => {
                            if (!pal.isLight) return null;
                            return (
                              <button
                                key={idx}
                                type="button"
                                title={pal.name}
                                onClick={() => setPosterPaletteIndex(idx)}
                                className={`aspect-square rounded-2xl border-2 transition relative flex items-center justify-center cursor-pointer hover:scale-105 active:scale-95 shadow-sm ${
                                  posterPaletteIndex === idx ? "border-slate-950 scale-105 ring-2 ring-slate-900/25 shadow-md" : "border-slate-100"
                                }`}
                                style={{
                                  background: `linear-gradient(135deg, ${pal.bg[0]} 0%, ${pal.bg[pal.bg.length - 1]} 100%)`
                                }}
                              >
                                {posterPaletteIndex === idx && (
                                  <Check className="h-5 w-5" style={{ color: pal.text }} />
                                )}
                              </button>
                            );
                          })}
                        </div>
                      </div>
                    </div>
                  </div>
                )}

                {posterBgType === "custom_gradient" && (
                  <div>
                    <label className="block text-xs font-black text-slate-400 uppercase tracking-widest mb-3">ADIM 3: ÖZEL RENK DÜZENİNİ TASARLAYIN</label>
                    <div className="flex gap-4 items-center bg-slate-50 p-4 rounded-2xl border border-slate-150">
                      <div className="flex-1 flex flex-col items-center gap-1.5">
                        <span className="text-[10px] font-bold text-slate-500">Giriş Rengi</span>
                        <input 
                          type="color" 
                          value={customColors[0] || "#6366f1"} 
                          onChange={(e) => {
                            const next = [...customColors];
                            next[0] = e.target.value;
                            setCustomColors(next);
                          }}
                          className="w-12 h-10 rounded-xl border border-slate-200 cursor-pointer p-0 bg-transparent"
                        />
                      </div>
                      <div className="flex-1 flex flex-col items-center gap-1.5">
                        <span className="text-[10px] font-bold text-slate-500">Geçiş Rengi</span>
                        <input 
                          type="color" 
                          value={customColors[1] || "#a855f7"} 
                          onChange={(e) => {
                            const next = [...customColors];
                            next[1] = e.target.value;
                            setCustomColors(next);
                          }}
                          className="w-12 h-10 rounded-xl border border-slate-200 cursor-pointer p-0 bg-transparent"
                        />
                      </div>
                      <div className="flex-1 flex flex-col items-center gap-1.5">
                        <span className="text-[10px] font-bold text-slate-500">Çıkış Rengi</span>
                        <input 
                          type="color" 
                          value={customColors[2] || "#3b82f6"} 
                          onChange={(e) => {
                            const next = [...customColors];
                            next[2] = e.target.value;
                            setCustomColors(next);
                          }}
                          className="w-12 h-10 rounded-xl border border-slate-200 cursor-pointer p-0 bg-transparent"
                        />
                      </div>
                      <div className="w-16 h-16 rounded-2xl border border-slate-200 shadow-md shrink-0 transition"
                        style={{
                          background: `linear-gradient(135deg, ${customColors[0]} 0%, ${customColors[1]} 50%, ${customColors[2]} 100%)`
                        }}
                      />
                    </div>

                    <div className="mt-4 space-y-3">
                      {/* Popüler Karanlık Gradyanlar */}
                      <div>
                        <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block mb-2">Popüler Karanlık Gradyanlar (8 Adet)</span>
                        <div className="grid grid-cols-8 gap-2">
                          {POPULAR_DARK_GRADIENTS.map((grad, idx) => (
                            <button
                              key={idx}
                              type="button"
                              title={grad.name}
                              onClick={() => setCustomColors(grad.colors)}
                              className="aspect-square rounded-xl border border-slate-200 transition hover:scale-105 active:scale-95 shadow-sm flex items-center justify-center cursor-pointer"
                              style={{
                                background: `linear-gradient(135deg, ${grad.colors[0]} 0%, ${grad.colors[1]} 50%, ${grad.colors[2]} 100%)`
                              }}
                            />
                          ))}
                        </div>
                      </div>

                      {/* Popüler Aydınlık Gradyanlar */}
                      <div>
                        <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block mb-2">Popüler Aydınlık Gradyanlar (8 Adet)</span>
                        <div className="grid grid-cols-8 gap-2">
                          {POPULAR_LIGHT_GRADIENTS.map((grad, idx) => (
                            <button
                              key={idx}
                              type="button"
                              title={grad.name}
                              onClick={() => setCustomColors(grad.colors)}
                              className="aspect-square rounded-xl border border-slate-200 transition hover:scale-105 active:scale-95 shadow-sm flex items-center justify-center cursor-pointer"
                              style={{
                                background: `linear-gradient(135deg, ${grad.colors[0]} 0%, ${grad.colors[1]} 50%, ${grad.colors[2]} 100%)`
                              }}
                            />
                          ))}
                        </div>
                      </div>
                    </div>
                  </div>
                )}

                {posterBgType === "image" && (
                  <div className="space-y-4">
                    <label className="block text-xs font-black text-slate-400 uppercase tracking-widest">ADIM 3: GÖRSEL ARKA PLAN ARAMA</label>
                    
                    {/* Arama Çubuğu */}
                    <div className="flex gap-2">
                      <div className="relative flex-1">
                        <input
                          type="text"
                          value={posterBgQuery}
                          onChange={(e) => setPosterBgQuery(e.target.value)}
                          placeholder="Aranacak görsel anahtar kelimeleri (Örn: satranç, kütüphane)..."
                          className="w-full pl-4 pr-10 py-2.5 text-sm border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-slate-900 focus:border-transparent"
                          onKeyDown={(e) => {
                            if (e.key === 'Enter') {
                              e.preventDefault();
                              setPosterBgImageSig(Math.random().toString());
                              setPosterBgImageLoading(true);
                            }
                          }}
                        />
                        {posterBgQuery && (
                          <button
                            type="button"
                            onClick={() => setPosterBgQuery("")}
                            className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-655 text-xs font-bold"
                          >
                            Temizle
                          </button>
                        )}
                      </div>
                      <button
                        type="button"
                        onClick={() => {
                          setPosterBgImageSig(Math.random().toString());
                          setPosterBgImageLoading(true);
                        }}
                        className="flex items-center gap-1.5 px-4 py-2.5 bg-slate-900 text-white rounded-xl text-xs font-bold hover:bg-slate-800 transition shadow-sm cursor-pointer shrink-0"
                      >
                        <RefreshCw className={`h-3.5 w-3.5 ${posterBgImageLoading ? 'animate-spin' : ''}`} />
                        Ara / Yenile
                      </button>
                    </div>

                    {/* Hızlı Öneriler */}
                    <div>
                      <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block mb-2">Hızlı Öneri Kategorileri</span>
                      <div className="grid grid-cols-6 gap-1 w-full">
                        {[
                          { label: "Seminer", query: "seminar,conference", icon: GraduationCap },
                          { label: "Konser", query: "concert,music", icon: Music },
                          { label: "Sergi", query: "art,exhibition", icon: Palette },
                          { label: "Spor", query: "sports,stadium", icon: Trophy },
                          { label: "Teknoloji", query: "technology,digital", icon: Cpu },
                          { label: "Doğa", query: "nature,landscape", icon: Leaf }
                        ].map((tag) => {
                          const IconComponent = tag.icon;
                          return (
                            <button
                              key={tag.query}
                              type="button"
                              onClick={() => {
                                setPosterBgQuery(tag.query);
                                setPosterBgImageSig(Math.random().toString());
                                setPosterBgImageLoading(true);
                              }}
                              className={`flex items-center justify-center gap-1 px-1.5 py-1.5 rounded-lg text-[10px] sm:text-[11px] font-bold border transition cursor-pointer truncate ${
                                posterBgQuery === tag.query
                                  ? "text-white border-transparent shadow-sm"
                                  : "bg-white border-slate-200 text-slate-600 hover:bg-slate-50"
                              }`}
                              style={posterBgQuery === tag.query ? { backgroundColor: '#1a3050' } : {}}
                            >
                              <IconComponent className="h-3 w-3 shrink-0" />
                              <span className="truncate">{tag.label}</span>
                            </button>
                          );
                        })}
                      </div>
                    </div>

                    {/* Görsel Katman Filtresi (Açık/Koyu) */}
                    <div>
                      <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block mb-2">Görsel Katman Filtresi (Overlay)</span>
                      <div className="flex gap-2.5">
                        {[
                          { id: "dark", label: "Koyu Katman (Beyaz Yazı)" },
                          { id: "light", label: "Açık Katman (Siyah Yazı)" }
                        ].map((o) => (
                          <button
                            key={o.id}
                            type="button"
                            onClick={() => setPosterImageOverlay(o.id)}
                            className={`flex-1 py-2 px-3 text-xs font-bold rounded-xl border-2 transition text-center cursor-pointer ${
                              posterImageOverlay === o.id
                                ? "bg-slate-950 border-slate-950 text-white shadow-sm"
                                : "bg-white border-slate-200 text-slate-655 hover:bg-slate-50"
                            }`}
                          >
                            {o.label}
                          </button>
                        ))}
                      </div>
                    </div>

                    {/* Canlı Görsel Önizleme */}
                    <div className="bg-slate-50 border border-slate-150 rounded-2xl p-3 flex flex-col items-center justify-center gap-2">
                      <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider self-start">Görsel Önizleme</span>
                      <div className="w-full max-w-[200px] aspect-[4/5] bg-white border border-slate-200 rounded-xl overflow-hidden relative shadow-inner">
                        {posterBgImageLoading && (
                          <div className="absolute inset-0 bg-slate-900/10 backdrop-blur-[2px] flex items-center justify-center z-10">
                            <div className="flex flex-col items-center gap-1.5">
                              <Loader2 className="h-6 w-6 animate-spin text-slate-800" />
                              <span className="text-[10px] font-bold text-slate-600">Görsel Yükleniyor...</span>
                            </div>
                          </div>
                        )}
                        <img
                          src={`https://loremflickr.com/1080/1350/${encodeURIComponent('abstract,' + (posterBgQuery || 'texture'))}?lock=${Math.floor(Number(posterBgImageSig) * 100000)}`}
                          alt="Arka Plan Önizlemesi"
                          className="w-full h-full object-cover"
                          onLoad={() => setPosterBgImageLoading(false)}
                          onError={() => setPosterBgImageLoading(false)}
                          crossOrigin="anonymous"
                        />
                      </div>
                      <span className="text-[10px] font-medium text-slate-500 text-center">
                        Görsel: Fotoğraf / {posterBgQuery || "Rastgele"} (1080x1350)
                      </span>
                    </div>
                  </div>
                )}
              </div>

              {/* Adım 4: Desen Seçimi */}
              <div>
                <label className="block text-xs font-black text-slate-400 uppercase tracking-widest mb-3">ADIM 4: ARKA PLAN GEOMETRİK DESENİ SEÇİN</label>
                <div className="grid grid-cols-9 gap-1 w-full">
                  {[
                    { id: "circles_lines", name: "Daire" },
                    { id: "grid", name: "Izgara" },
                    { id: "triangles", name: "Üçgen" },
                    { id: "stripes", name: "Çizgi" },
                    { id: "dots", name: "Nokta" },
                    { id: "waves", name: "Dalga" },
                    { id: "diamonds", name: "Baklava" },
                    { id: "hexagons", name: "Altıgen" },
                    { id: "none", name: "Sade" }
                  ].map((p) => (
                    <button
                      key={p.id}
                      type="button"
                      onClick={() => setPosterPattern(p.id)}
                      className={`w-full flex items-center justify-center py-2 px-0.5 text-[9px] sm:text-[10px] font-bold rounded-lg border transition text-center truncate ${
                        posterPattern === p.id 
                          ? "bg-slate-950 border-slate-950 text-white shadow-sm"
                          : "bg-white border-slate-200 text-slate-650 hover:bg-slate-50"
                      }`}
                    >
                      <span className="truncate">{p.name}</span>
                    </button>
                  ))}
                </div>
              </div>

            </div>

            {/* Footer Buttons */}
            <div className="px-6 py-4 bg-slate-50 border-t border-gray-150 flex justify-end gap-3 shrink-0">
              <button 
                type="button"
                onClick={() => setIsWizardOpen(false)}
                className="px-5 py-2.5 text-sm font-bold text-slate-600 hover:bg-slate-200 rounded-xl transition cursor-pointer"
              >
                İptal
              </button>
              <button 
                type="button"
                onClick={() => {
                  setIsWizardOpen(false);
                  handleAIImageGenerate();
                }}
                disabled={isGenerating || isUploading}
                className="px-6 py-2.5 text-sm font-extrabold bg-slate-950 text-white rounded-xl hover:bg-slate-800 transition shadow-md flex items-center gap-2 cursor-pointer disabled:opacity-50"
              >
                {isGenerating ? <Loader2 className="h-4 w-4 animate-spin" /> : <Sparkles className="h-4 w-4 text-slate-200" />}
                Tasarımı Oluştur
              </button>
            </div>

          </div>
        </div>
      )}

    </div>
  );
}