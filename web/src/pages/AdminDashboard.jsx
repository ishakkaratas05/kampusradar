import { useState, useEffect, useRef } from "react";
import { useNavigate } from "react-router-dom";
import { Plus, Trash2, Search, ArrowLeft, School, MapPin, X, AlertCircle, Calendar, Loader2, CheckCircle2, XCircle, ChevronDown, LogOut, LayoutDashboard, UploadCloud, Pencil } from "lucide-react"; 
import { supabase } from "../lib/supabaseClient";
import { useAuth } from "../context/AuthContext";
import ImageCropModal from "../components/ImageCropModal";
import ProfileDropdown from "../components/ProfileDropdown";



export default function AdminDashboard() {
  const navigate = useNavigate();
  const { user, profile, signOut, loading: authLoading } = useAuth();



  const [universities, setUniversities] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [saving, setSaving] = useState(false);

  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
  const [uniToDelete, setUniToDelete] = useState(null);

  const [newUni, setNewUni] = useState({ name: "", abbreviation: "", city: "", founded: "", history: "", logo_url: "" });
  const [logoFile, setLogoFile] = useState(null);
  const [logoPreview, setLogoPreview] = useState("");
  const [uploadingLogo, setUploadingLogo] = useState(false);
  const [cropImageSrc, setCropImageSrc] = useState(null);
  const [isCropModalOpen, setIsCropModalOpen] = useState(false);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [editingUni, setEditingUni] = useState(null);
  const fileInputRef = useRef(null);

  // Bildirim Modalı State'i (Başarı veya Hata için)
  const [notification, setNotification] = useState({
    isOpen: false,
    type: "success", // "success" | "error"
    title: "",
    message: ""
  });

  // --- Veritabanından üniversiteleri çek ---
  const fetchUniversities = async () => {
    try {
      setLoading(true);
      const { data, error } = await supabase
        .from("universities")
        .select("*")
        .order("name", { ascending: true });

      if (error) throw error;
      setUniversities(data || []);
    } catch (err) {
      console.error("Üniversiteler yüklenirken hata:", err.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    // Sadece admin yetkisi olanlar için üniversiteleri yükle
    if (user && profile?.role === "admin") {
      fetchUniversities();
    }
  }, [user, profile]);

  // --- Yardımcı Bildirim Açma Fonksiyonları ---
  const showSuccess = (title, message) => {
    setNotification({
      isOpen: true,
      type: "success",
      title,
      message
    });
  };

  const showError = (title, message) => {
    setNotification({
      isOpen: true,
      type: "error",
      title,
      message
    });
  };

  // --- TÜRKÇE KARAKTER UYUMLU OTOMATİK DÜZELTME FONKSİYONLARI ---
  
  // 1. Her kelimenin baş harfini büyük, gerisini küçük yapar (Örn: fIrat ÜNİversitesi -> Fırat Üniversitesi)
  const formatTitleCase = (text) => {
    if (!text) return "";
    return text.split(" ").map(word => {
      if (word.length === 0) return "";
      return word.charAt(0).toLocaleUpperCase("tr-TR") + word.slice(1).toLocaleLowerCase("tr-TR");
    }).join(" ");
  };

  // 2. Tamamını büyük harf yapar (Kısaltmalar için)
  const formatUpperCase = (text) => {
    if (!text) return "";
    return text.toLocaleUpperCase("tr-TR");
  };

  // ------------------------------------------------------------------

  const openDeleteModal = (uni) => {
    setUniToDelete(uni);
    setIsDeleteModalOpen(true);
  };

  const confirmDelete = async () => {
    try {
      setSaving(true);
      const { error } = await supabase
        .from("universities")
        .delete()
        .eq("id", uniToDelete.id);

      if (error) throw error;

      setUniversities(universities.filter(u => u.id !== uniToDelete.id));
      setIsDeleteModalOpen(false);
      const deletedName = uniToDelete.name;
      setUniToDelete(null);
      
      // Başarı modalını tetikle
      showSuccess("Kayıt Silindi", `${deletedName} başarıyla sistemden kaldırıldı.`);
    } catch (err) {
      console.error("Silme hatası:", err.message);
      setIsDeleteModalOpen(false);
      showError(
        "İşlem Başarısız", 
        `Üniversite silinirken bir hata oluştu:\n${err.message}\n\nLütfen veritabanı RLS izinlerini ve yetkilerinizi kontrol edin.`
      );
    } finally {
      setSaving(false);
    }
  };

  const handleOpenAddModal = () => {
    setNewUni({ name: "", abbreviation: "", city: "", founded: "", history: "", logo_url: "" });
    setLogoFile(null);
    setLogoPreview("");
    if (fileInputRef.current) {
      fileInputRef.current.value = "";
    }
    setIsAddModalOpen(true);
  };

  const handleCropConfirm = (croppedBlob) => {
    setIsCropModalOpen(false);
    if (croppedBlob) {
      // Create a file-like object or directly use blob
      croppedBlob.name = "university_logo.png";
      setLogoFile(croppedBlob);
      setLogoPreview(URL.createObjectURL(croppedBlob));
    }
  };
  const handleOpenEditModal = (uni) => {
    setEditingUni({ ...uni });
    setLogoPreview(uni.logo_url || "");
    setLogoFile(null);
    if (fileInputRef.current) {
      fileInputRef.current.value = "";
    }
    setIsEditModalOpen(true);
  };

  const handleEditSubmit = async (e) => {
    e.preventDefault();
    try {
      setSaving(true);

      const foundedYear = parseInt(editingUni.founded, 10);
      if (isNaN(foundedYear)) {
        throw new Error("Kuruluş yılı geçerli bir sayı olmalıdır.");
      }

      let finalLogoUrl = editingUni.logo_url;

      // Eğer logo dosyası seçildiyse Supabase Storage'a yükle
      if (logoFile) {
        setUploadingLogo(true);
        const fileExt = logoFile.name ? logoFile.name.split('.').pop() : 'png';
        const fileName = `uni_${Math.random().toString(36).substring(2, 10)}_${Date.now()}.${fileExt}`;
        const filePath = `universities/${fileName}`;

        const { error: uploadError } = await supabase.storage
          .from('public-assets')
          .upload(filePath, logoFile, { 
            contentType: logoFile.type || 'image/png' 
          });

        if (uploadError) throw uploadError;

        const { data: publicUrlData } = supabase.storage
          .from('public-assets')
          .getPublicUrl(filePath);

        finalLogoUrl = publicUrlData.publicUrl;
      }

      const { data, error } = await supabase
        .from("universities")
        .update({
          name: editingUni.name,
          abbreviation: editingUni.abbreviation,
          city: editingUni.city,
          founded: foundedYear,
          history: editingUni.history,
          logo_url: finalLogoUrl,
        })
        .eq("id", editingUni.id)
        .select();

      if (error) throw error;

      setUniversities(universities.map(u => u.id === editingUni.id ? data[0] : u));
      setIsEditModalOpen(false);
      const updatedName = editingUni.name;
      setEditingUni(null);
      setLogoFile(null);
      setLogoPreview("");
      
      showSuccess("Kayıt Güncellendi", `${updatedName} başarıyla güncellendi.`);
    } catch (err) {
      console.error("Güncelleme hatası:", err.message);
      setIsEditModalOpen(false);
      showError(
        "Güncelleme Başarısız", 
        `Üniversite güncellenirken bir hata oluştu:\n${err.message}`
      );
    } finally {
      setSaving(false);
      setUploadingLogo(false);
    }
  };
  const handleAddSubmit = async (e) => {
    e.preventDefault();
    try {
      setSaving(true);

      // Kuruluş yılını sayıya dönüştür
      const foundedYear = parseInt(newUni.founded, 10);
      if (isNaN(foundedYear)) {
        throw new Error("Kuruluş yılı geçerli bir sayı olmalıdır.");
      }

      let finalLogoUrl = null;

      // Eğer logo dosyası seçildiyse Supabase Storage'a yükle
      if (logoFile) {
        setUploadingLogo(true);
        const fileExt = logoFile.name ? logoFile.name.split('.').pop() : 'png';
        const fileName = `uni_${Math.random().toString(36).substring(2, 10)}_${Date.now()}.${fileExt}`;
        const filePath = `universities/${fileName}`;

        const { error: uploadError } = await supabase.storage
          .from('public-assets')
          .upload(filePath, logoFile, { 
            contentType: logoFile.type || 'image/png' 
          });

        if (uploadError) throw uploadError;

        const { data: publicUrlData } = supabase.storage
          .from('public-assets')
          .getPublicUrl(filePath);

        finalLogoUrl = publicUrlData.publicUrl;
      }

      const { data, error } = await supabase
        .from("universities")
        .insert([{
          name: newUni.name,
          abbreviation: newUni.abbreviation,
          city: newUni.city,
          founded: foundedYear, // Sayı olarak gönderiyoruz
          history: newUni.history,
          logo_url: finalLogoUrl || null,
        }])
        .select();

      if (error) throw error;

      setUniversities([...universities, ...(data || [])]);
      setIsAddModalOpen(false);
      const addedName = newUni.name;
      setNewUni({ name: "", abbreviation: "", city: "", founded: "", history: "", logo_url: "" }); 
      setLogoFile(null);
      setLogoPreview("");
      
      // Başarı modalını tetikle
      showSuccess("Kayıt Başarılı", `${addedName} başarıyla sisteme eklendi.`);
    } catch (err) {
      console.error("Ekleme hatası:", err.message);
      setIsAddModalOpen(false);
      showError(
        "Kayıt Başarısız", 
        `Üniversite eklenirken bir hata oluştu:\n${err.message}\n\nLütfen veritabanı RLS izinlerini ve yetkilerinizi kontrol edin.`
      );
    } finally {
      setSaving(false);
      setUploadingLogo(false);
    }
  };

  // --- Arama filtresi ---
  const filteredUniversities = universities.filter(uni =>
    uni.name?.toLocaleLowerCase("tr-TR").includes(searchQuery.toLocaleLowerCase("tr-TR")) ||
    uni.abbreviation?.toLocaleLowerCase("tr-TR").includes(searchQuery.toLocaleLowerCase("tr-TR")) ||
    uni.city?.toLocaleLowerCase("tr-TR").includes(searchQuery.toLocaleLowerCase("tr-TR"))
  );

  // --- YÜKLEME EKRANI ---
  if (authLoading) {
    return (
      <div className="min-h-screen bg-slate-900 flex items-center justify-center text-white">
        <div className="flex flex-col items-center gap-3">
          <Loader2 className="h-10 w-10 animate-spin text-white" />
          <p className="text-sm font-medium">Yetkiler Kontrol Ediliyor...</p>
        </div>
      </div>
    );
  }

  // --- YETKİSİZ ERİŞİM ENGELİ ---
  if (!user || profile?.role !== "admin") {
    return (
      <div className="min-h-screen bg-slate-950 flex items-center justify-center p-4">
        <div className="bg-slate-900 border border-slate-800 rounded-2xl shadow-2xl p-8 max-w-md w-full text-center">
          <div className="mx-auto flex items-center justify-center h-16 w-16 rounded-full bg-red-950/30 text-red-500 mb-6 border border-red-500/20">
            <AlertCircle className="h-10 w-10 animate-pulse" />
          </div>
          <h2 className="text-2xl font-extrabold text-white tracking-tight mb-3">Yetkisiz Erişim</h2>
          <p className="text-sm text-slate-400 leading-relaxed mb-8">
            Bu panele erişim yetkiniz bulunmamaktadır. Lütfen yönetici hesabınızla giriş yaptığınızdan emin olun.
          </p>
          <div className="flex flex-col gap-3">
            <button
              onClick={() => navigate("/login")}
              className="w-full bg-white hover:bg-slate-100 text-slate-950 font-bold py-3 rounded-xl transition shadow-md shadow-white/5 cursor-pointer"
            >
              Giriş Yap
            </button>
            <button
              onClick={() => navigate("/")}
              className="w-full bg-slate-800 hover:bg-slate-700 text-white font-bold py-3 rounded-xl transition border border-slate-700 cursor-pointer"
            >
              Ana Sayfaya Dön
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col relative">
      
      <header className="bg-slate-900 px-6 py-4 shadow-md flex items-center justify-between text-white sticky top-0 z-40">
        <div className="flex items-center gap-4">
          <button onClick={() => navigate("/")} className="p-2 bg-slate-800 rounded-lg hover:bg-slate-700 transition cursor-pointer">
            <ArrowLeft className="h-5 w-5 text-slate-300" />
          </button>
          <div>
            <h1 className="text-xl font-extrabold tracking-tight">KampüsRadar Yönetim</h1>
            <p className="text-xs text-slate-400 font-medium">Sistem Yöneticisi Paneli</p>
          </div>
        </div>
        <ProfileDropdown />
      </header>

      <main className="flex-1 max-w-6xl w-full mx-auto px-4 py-8">
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center mb-8 gap-4">
          <div>
            <h2 className="text-2xl font-bold text-gray-900">Sistemdeki Üniversiteler</h2>
            <p className="text-sm text-gray-500 mt-1">
              Platforma kayıtlı tüm üniversiteleri yönet. 
              <span className="font-semibold text-slate-700 ml-1">({universities.length} kayıt)</span>
            </p>
          </div>
          <button 
            onClick={handleOpenAddModal}
            className="flex items-center gap-2 bg-slate-900 text-white px-5 py-2.5 rounded-xl font-bold shadow-md hover:bg-slate-800 transition cursor-pointer"
          >
            <Plus className="h-5 w-5" />
            Yeni Üniversite Ekle
          </button>
        </div>

        <div className="bg-white rounded-2xl shadow-sm border border-gray-200 overflow-hidden">
          <div className="p-4 border-b border-gray-100 bg-gray-50/50 flex items-center">
            <div className="relative w-full max-w-md">
              <Search className="absolute left-3 top-2.5 h-4 w-4 text-gray-400" />
              <input 
                type="text" 
                placeholder="Üniversite ara..." 
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-10 pr-4 py-2 rounded-lg border border-gray-200 text-sm focus:outline-none focus:border-slate-400 focus:ring-1 focus:ring-slate-400"
              />
            </div>
          </div>

          {loading ? (
            <div className="flex items-center justify-center py-16 gap-3 text-gray-400">
              <Loader2 className="h-6 w-6 animate-spin" />
              <span className="text-sm font-medium">Üniversiteler yükleniyor...</span>
            </div>
          ) : filteredUniversities.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-16 text-gray-400">
              <School className="h-10 w-10 mb-3 text-gray-300" />
              <p className="text-sm font-medium">
                {searchQuery ? "Aramanızla eşleşen üniversite bulunamadı." : "Henüz kayıtlı üniversite bulunmuyor."}
              </p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left text-sm text-gray-600">
                <thead className="bg-gray-50 text-gray-900 font-bold border-b border-gray-200">
                  <tr>
                    <th className="px-6 py-4">Üniversite</th>
                    <th className="px-6 py-4">Kısaltma</th>
                    <th className="px-6 py-4">Şehir</th>
                    <th className="px-6 py-4">Kuruluş</th>
                    <th className="px-6 py-4">Durum</th>
                    <th className="px-6 py-4 text-right">İşlemler</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {filteredUniversities.map((uni) => (
                    <tr key={uni.id} className="hover:bg-gray-50 transition-colors group">
                      <td className="px-6 py-4">
                        <div className="flex items-center gap-3">
                          {uni.logo_url ? (
                            <div className="w-10 h-10 rounded-lg overflow-hidden border border-gray-200 shrink-0 bg-white">
                              <img 
                                src={uni.logo_url} 
                                alt={`${uni.name} Logo`} 
                                className="w-full h-full object-cover"
                                onError={(e) => {
                                  e.target.style.display = 'none';
                                  e.target.parentNode.classList.add('flex', 'items-center', 'justify-center');
                                  const fallback = document.createElement('div');
                                  fallback.innerHTML = `<svg class="h-5 w-5 text-slate-400" xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="m4 6 8-4 8 4"/><path d="m18 10 4 2v8a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2v-8l4-2"/><path d="M14 22v-4a2 2 0 0 0-2-2v0a2 2 0 0 0-2 2v4"/><path d="M18 5v17"/><path d="M6 5v17"/><line x1="2" x2="22" y1="10" y2="10"/></svg>`;
                                  e.target.parentNode.appendChild(fallback);
                                }}
                              />
                            </div>
                          ) : (
                            <div className="w-10 h-10 rounded-lg bg-slate-100 flex items-center justify-center text-slate-900 shrink-0">
                              <School className="h-5 w-5" />
                            </div>
                          )}
                          <div>
                            <span className="font-bold text-gray-900 block">{uni.name}</span>
                          </div>
                        </div>
                      </td>
                      <td className="px-6 py-4 font-semibold text-slate-700">{uni.abbreviation}</td>
                      <td className="px-6 py-4">
                        <span className="flex items-center gap-1.5">
                          <MapPin className="h-4 w-4 text-gray-400" /> {uni.city}
                        </span>
                      </td>
                      <td className="px-6 py-4">
                        <span className="flex items-center gap-1.5">
                          <Calendar className="h-4 w-4 text-gray-400" /> {uni.founded}
                        </span>
                      </td>
                      <td className="px-6 py-4">
                        <span className="bg-green-100 text-green-700 px-3 py-1 rounded-full text-xs font-bold">
                          Aktif
                        </span>
                      </td>
                      <td className="px-6 py-4 text-right flex items-center justify-end gap-2">
                        <button 
                          onClick={() => handleOpenEditModal(uni)}
                          className="p-2 text-gray-400 hover:text-indigo-600 hover:bg-indigo-50 rounded-lg transition-colors cursor-pointer"
                          title="Üniversiteyi Düzenle"
                        >
                          <Pencil className="h-5 w-5" />
                        </button>
                        <button 
                          onClick={() => openDeleteModal(uni)}
                          className="p-2 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors cursor-pointer"
                          title="Üniversiteyi Sil"
                        >
                          <Trash2 className="h-5 w-5" />
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </main>

      {/* ÜNİVERSİTE EKLEME MODALI */}
      {isAddModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-sm p-4">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-xl overflow-hidden flex flex-col">
            <div className="px-6 py-4 border-b border-gray-100 flex items-center justify-between bg-slate-50">
              <h3 className="text-lg font-bold text-slate-900">Yeni Üniversite Ekle</h3>
              <button onClick={() => setIsAddModalOpen(false)} className="text-gray-400 hover:text-gray-600 cursor-pointer">
                <X className="h-5 w-5" />
              </button>
            </div>
            
            <form onSubmit={handleAddSubmit} className="p-6 flex flex-col gap-4">
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-1">Üniversite Tam Adı</label>
                <input 
                  required type="text" placeholder="Örn: Hacettepe Üniversitesi"
                  value={newUni.name} 
                  /* DEĞİŞİKLİK: Anında Title Case formatına çeviriyoruz */
                  onChange={(e) => setNewUni({...newUni, name: formatTitleCase(e.target.value)})}
                  className="w-full px-4 py-2 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-slate-900 text-sm"
                />
              </div>
              
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-1">Kısaltma</label>
                  <input 
                    required type="text" placeholder="Örn: HÜ"
                    value={newUni.abbreviation} 
                    /* DEĞİŞİKLİK: Anında tamamen BÜYÜK harfe çeviriyoruz */
                    onChange={(e) => setNewUni({...newUni, abbreviation: formatUpperCase(e.target.value)})}
                    className="w-full px-4 py-2 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-slate-900 text-sm"
                  />
                </div>
                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-1">Şehir</label>
                  <input 
                    required type="text" placeholder="Örn: Ankara"
                    value={newUni.city} 
                    /* DEĞİŞİKLİK: Anında Title Case formatına çeviriyoruz */
                    onChange={(e) => setNewUni({...newUni, city: formatTitleCase(e.target.value)})}
                    className="w-full px-4 py-2 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-slate-900 text-sm"
                  />
                </div>
                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-1">Kuruluş Yılı</label>
                  <input 
                    required type="number" placeholder="Örn: 1967"
                    value={newUni.founded} onChange={(e) => setNewUni({...newUni, founded: e.target.value})}
                    className="w-full px-4 py-2 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-slate-900 text-sm"
                  />
                </div>
              </div>



              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-1">Tarihçe / Açıklama</label>
                <textarea 
                  required rows="3" placeholder="Üniversite hakkında kısa bilgi..."
                  value={newUni.history} onChange={(e) => setNewUni({...newUni, history: e.target.value})}
                  className="w-full px-4 py-2 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-slate-900 resize-none text-sm"
                ></textarea>
              </div>

              {/* Logo Yükleme Alanı */}
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-1">Üniversite Logosu (Opsiyonel)</label>
                <div 
                  onClick={() => fileInputRef.current.click()}
                  className="border-2 border-dashed border-gray-200 hover:border-slate-400 rounded-xl p-5 flex flex-col items-center justify-center gap-2 cursor-pointer transition bg-slate-50/50 hover:bg-slate-50"
                >

                  {logoPreview ? (
                    <div className="flex flex-col items-center gap-2">
                      <div className="h-16 w-16 bg-white border border-gray-200 rounded-lg overflow-hidden flex items-center justify-center p-1 shadow-sm">
                        <img src={logoPreview} alt="Logo Önizleme" className="h-full w-full object-contain" />
                      </div>
                      <span className="text-xs text-gray-500 font-semibold truncate max-w-[200px]">{logoFile?.name}</span>
                    </div>
                  ) : (
                    <>
                      <UploadCloud className="h-8 w-8 text-gray-400" />
                      <div className="text-center">
                        <p className="text-sm font-bold text-gray-700">Logo Yüklemek İçin Tıklayın</p>
                        <p className="text-[11px] text-gray-400 font-medium mt-0.5">Önerilen boyut: 512x512 px (PNG/JPG)</p>
                      </div>
                    </>
                  )}
                </div>
              </div>
              
              <div className="mt-4 flex justify-end gap-3">
                <button type="button" onClick={() => setIsAddModalOpen(false)} className="px-5 py-2.5 text-sm font-bold text-gray-600 hover:bg-gray-100 rounded-xl transition cursor-pointer">
                  İptal
                </button>
                <button 
                  type="submit" 
                  disabled={saving}
                  className="px-5 py-2.5 text-sm font-bold bg-slate-900 text-white rounded-xl hover:bg-slate-800 transition disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2 cursor-pointer"
                >
                  {saving && <Loader2 className="h-4 w-4 animate-spin" />}
                  Üniversiteyi Kaydet
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* SİLME ONAY MODALI */}
      {isDeleteModalOpen && uniToDelete && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-sm p-4">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-sm overflow-hidden p-6 text-center">
            <div className="mx-auto flex items-center justify-center h-12 w-12 rounded-full bg-red-100 mb-4">
              <AlertCircle className="h-6 w-6 text-red-600" />
            </div>
            <h3 className="text-lg font-bold text-gray-900 mb-2">Üniversiteyi Sil</h3>
            <p className="text-sm text-gray-500 mb-6">
              <strong className="text-gray-800">{uniToDelete.name}</strong> sistemden kalıcı olarak silinecek. Bu işlem geri alınamaz. Onaylıyor musunuz?
            </p>
            <div className="flex justify-center gap-3">
              <button onClick={() => setIsDeleteModalOpen(false)} className="flex-1 px-4 py-2.5 bg-gray-100 text-gray-700 font-bold rounded-xl hover:bg-gray-200 transition cursor-pointer">
                İptal
              </button>
              <button 
                onClick={confirmDelete} 
                disabled={saving}
                className="flex-1 px-4 py-2.5 bg-red-600 text-white font-bold rounded-xl hover:bg-red-700 transition shadow-md shadow-red-600/20 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2 cursor-pointer"
              >
                {saving && <Loader2 className="h-4 w-4 animate-spin" />}
                Evet, Sil
              </button>
            </div>
          </div>
        </div>
      )}

      {/* BİLDİRİM (BAŞARI / HATA) MODALI */}
      {notification.isOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-sm p-4 animate-fade-in">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-sm overflow-hidden p-6 text-center border border-gray-100 flex flex-col items-center">
            <div className="mx-auto flex items-center justify-center h-14 w-14 rounded-full mb-4">
              {notification.type === "success" ? (
                <div className="bg-green-150 p-2.5 rounded-full text-green-600">
                  <CheckCircle2 className="h-10 w-10 text-emerald-500" />
                </div>
              ) : (
                <div className="bg-red-150 p-2.5 rounded-full text-red-600">
                  <XCircle className="h-10 w-10 text-rose-500 animate-pulse" />
                </div>
              )}
            </div>
            
            <h3 className={`text-lg font-extrabold mb-2 ${notification.type === "success" ? "text-slate-900" : "text-rose-900"}`}>
              {notification.title}
            </h3>
            
            <p className="text-sm text-slate-500 mb-6 whitespace-pre-line leading-relaxed">
              {notification.message}
            </p>
            
            <button 
              onClick={() => setNotification({ ...notification, isOpen: false })} 
              className={`w-full py-2.5 font-bold rounded-xl transition shadow-md text-sm cursor-pointer ${
                notification.type === "success" 
                  ? "bg-slate-900 hover:bg-slate-800 text-white shadow-slate-900/20" 
                  : "bg-red-600 hover:bg-red-700 text-white shadow-red-600/20"
              }`}
            >
              Kapat
            </button>
          </div>
        </div>
      )}

      {/* ÜNİVERSİTE DÜZENLEME MODALI */}
      {isEditModalOpen && editingUni && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-sm p-4 animate-fade-in">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-xl overflow-hidden flex flex-col">
            <div className="px-6 py-4 border-b border-gray-100 flex items-center justify-between bg-slate-50">
              <h3 className="text-lg font-bold text-slate-900">Üniversiteyi Düzenle</h3>
              <button onClick={() => setIsEditModalOpen(false)} className="text-gray-400 hover:text-gray-600 cursor-pointer">
                <X className="h-5 w-5" />
              </button>
            </div>
            
            <form onSubmit={handleEditSubmit} className="p-6 flex flex-col gap-4">
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-1">Üniversite Tam Adı</label>
                <input 
                  required type="text" placeholder="Örn: Hacettepe Üniversitesi"
                  value={editingUni.name} 
                  onChange={(e) => setEditingUni({...editingUni, name: formatTitleCase(e.target.value)})}
                  className="w-full px-4 py-2 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-slate-900 text-sm"
                />
              </div>
              
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-1">Kısaltma</label>
                  <input 
                    required type="text" placeholder="Örn: HÜ"
                    value={editingUni.abbreviation} 
                    onChange={(e) => setEditingUni({...editingUni, abbreviation: formatUpperCase(e.target.value)})}
                    className="w-full px-4 py-2 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-slate-900 text-sm"
                  />
                </div>
                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-1">Şehir</label>
                  <input 
                    required type="text" placeholder="Örn: Ankara"
                    value={editingUni.city} 
                    onChange={(e) => setEditingUni({...editingUni, city: formatTitleCase(e.target.value)})}
                    className="w-full px-4 py-2 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-slate-900 text-sm"
                  />
                </div>
                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-1">Kuruluş Yılı</label>
                  <input 
                    required type="number" placeholder="Örn: 1967"
                    value={editingUni.founded} onChange={(e) => setEditingUni({...editingUni, founded: e.target.value})}
                    className="w-full px-4 py-2 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-slate-900 text-sm"
                  />
                </div>
              </div>

              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-1">Tarihçe / Açıklama</label>
                <textarea 
                  required rows="3" placeholder="Üniversite hakkında kısa bilgi..."
                  value={editingUni.history || ""} onChange={(e) => setEditingUni({...editingUni, history: e.target.value})}
                  className="w-full px-4 py-2 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-slate-900 resize-none text-sm"
                ></textarea>
              </div>

              {/* Logo Yükleme Alanı */}
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-1">Üniversite Logosu (Opsiyonel)</label>
                <div 
                  onClick={() => fileInputRef.current.click()}
                  className="border-2 border-dashed border-gray-200 hover:border-slate-400 rounded-xl p-5 flex flex-col items-center justify-center gap-2 cursor-pointer transition bg-slate-50/50 hover:bg-slate-50"
                >
                  {logoPreview ? (
                    <div className="flex flex-col items-center gap-2">
                      <div className="h-16 w-16 bg-white border border-gray-200 rounded-lg overflow-hidden flex items-center justify-center p-1 shadow-sm">
                        <img src={logoPreview} alt="Logo Önizleme" className="h-full w-full object-contain" />
                      </div>
                      <span className="text-xs text-gray-500 font-semibold truncate max-w-[200px]">{logoFile ? logoFile.name : "Mevcut Logo"}</span>
                    </div>
                  ) : (
                    <>
                      <UploadCloud className="h-8 w-8 text-gray-400" />
                      <div className="text-center">
                        <p className="text-sm font-bold text-gray-700">Logo Yüklemek İçin Tıklayın</p>
                        <p className="text-[11px] text-gray-400 font-medium mt-0.5">Önerilen boyut: 512x512 px (PNG/JPG)</p>
                      </div>
                    </>
                  )}
                </div>
              </div>
              
              <div className="mt-4 flex justify-end gap-3">
                <button type="button" onClick={() => setIsEditModalOpen(false)} className="px-5 py-2.5 text-sm font-bold text-gray-600 hover:bg-gray-100 rounded-xl transition cursor-pointer">
                  İptal
                </button>
                <button 
                  type="submit" 
                  disabled={saving}
                  className="px-5 py-2.5 text-sm font-bold bg-slate-900 text-white rounded-xl hover:bg-slate-800 transition disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2 cursor-pointer"
                >
                  {saving && <Loader2 className="h-4 w-4 animate-spin" />}
                  Değişiklikleri Kaydet
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Ortak Gizli Dosya Seçici */}
      <input 
        type="file" 
        ref={fileInputRef} 
        accept="image/*" 
        className="hidden" 
        onChange={(e) => {
          const file = e.target.files[0];
          if (file) {
            const reader = new FileReader();
            reader.onload = () => {
              setCropImageSrc(reader.result);
              setIsCropModalOpen(true);
            };
            reader.readAsDataURL(file);
          }
          e.target.value = "";
        }}
      />

      {/* Resim Kırpma / Yakınlaştırma Modalı */}
      <ImageCropModal
        isOpen={isCropModalOpen}
        imageSrc={cropImageSrc}
        onClose={() => setIsCropModalOpen(false)}
        onConfirm={handleCropConfirm}
        circular={false}
        title="Üniversite Logosunu Düzenle"
      />

    </div>
  );
}