import React, { useState, useEffect } from 'react';
import { 
  StyleSheet, View, Text, FlatList, ActivityIndicator, TouchableOpacity, 
  RefreshControl, Modal, TextInput, Image, ScrollView, Alert, KeyboardAvoidingView, Platform, SafeAreaView
} from 'react-native';
import { 
  Plus, Calendar, MapPin, Users, CheckCircle, Clock, XCircle, 
  ArrowLeft, UploadCloud, ChevronRight, School, BadgeCheck, X, FileText, Trash2, Edit, AlertTriangle, Sparkles, RefreshCw, Check
} from 'lucide-react-native';
import { useRouter } from 'expo-router';

import { useAuth } from '@/context/AuthContext';
import { supabase } from '@/lib/supabaseClient';
import * as ImagePicker from 'expo-image-picker';
import { decode } from 'base64-arraybuffer';
import * as Print from 'expo-print';
import * as Sharing from 'expo-sharing';

// Utility format date
const formatEventDate = (dateStr: string | null, endTimeStr: string | null) => {
  if (!dateStr) return "-";
  try {
    const d = new Date(dateStr);
    const dateText = d.toLocaleDateString('tr-TR', { day: 'numeric', month: 'long', year: 'numeric' });
    const timeText = d.toLocaleTimeString('tr-TR', { hour: '2-digit', minute: '2-digit' });
    return endTimeStr ? `${dateText} • ${timeText} - ${endTimeStr}` : `${dateText} • ${timeText}`;
  } catch (e) {
    return dateStr;
  }
};

export default function OrganizerDashboard() {
  const { user, profile, signOut } = useAuth();
  const router = useRouter();

  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  
  const [myEvents, setMyEvents] = useState<any[]>([]);
  const [universityName, setUniversityName] = useState("");
  const [universityLogo, setUniversityLogo] = useState("");

  const [activeTab, setActiveTab] = useState<'active' | 'past'>('active');
  const [selectedYear, setSelectedYear] = useState<string>('all');

  // Modals
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [editingEventId, setEditingEventId] = useState<string | null>(null);
  
  const [manageEvent, setManageEvent] = useState<any>(null);
  const [participants, setParticipants] = useState<any[]>([]);
  const [loadingParticipants, setLoadingParticipants] = useState(false);
  
  const [viewEvent, setViewEvent] = useState<any>(null);
  const [deleteModal, setDeleteModal] = useState({ isOpen: false, eventId: null as string | null });

  // Form State
  const [newEvent, setNewEvent] = useState({
    title: '', category: '', location: '', description: '', capacity: '', requires_approval: false,
    image_url: '', base64Image: ''
  });
  const [customCategory, setCustomCategory] = useState('');
  const [eventDate, setEventDate] = useState('');
  const [eventTime, setEventTime] = useState('');
  const [eventEndTime, setEventEndTime] = useState('');
  const [submitting, setSubmitting] = useState(false);

  // AI Description Generator State
  const [aiLoading, setAiLoading] = useState(false);
  
  const loadData = async () => {
    if (!user || !profile) return;
    try {
      setLoading(true);
      
      // Fetch Events
      const { data, error } = await supabase
        .from('events')
        .select(`*, event_participants(status)`)
        .eq('organizer_id', user.id)
        .order('date', { ascending: false });

      if (data) setMyEvents(data);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, [user, profile]);

  const onRefresh = async () => {
    setRefreshing(true);
    await loadData();
    setRefreshing(false);
  };

  // Form Management
  const handleOpenAddModal = () => {
    setEditingEventId(null);
    setNewEvent({ title: '', category: '', location: '', description: '', capacity: '', requires_approval: false, image_url: '', base64Image: '' });
    setCustomCategory('');
    setEventDate('');
    setEventTime('');
    setEventEndTime('');
    setIsAddModalOpen(true);
  };

  const handleOpenEditModal = (ev: any) => {
    setEditingEventId(ev.id);
    let cat = ev.category || "";
    let isCustom = !["Seminer / Konferans", "Eğitim / Atölye", "Konser / Müzik", "Sergi / Sanat", "Spor / Turnuva", "Tiyatro / Gösteri", "Sosyal Sorumluluk", "Yarışma"].includes(cat);
    
    setNewEvent({
      title: ev.title || "",
      category: isCustom ? "Diğer" : cat,
      location: ev.location || "",
      description: ev.description || "",
      capacity: ev.capacity ? String(ev.capacity) : "",
      requires_approval: ev.requires_approval || false,
      image_url: ev.image_url || "",
      base64Image: ''
    });
    setCustomCategory(isCustom ? cat : "");
    
    if (ev.date) {
      const d = new Date(ev.date);
      setEventDate(d.toISOString().split('T')[0]);
      setEventTime(d.toLocaleTimeString('tr-TR', { hour: '2-digit', minute: '2-digit' }));
    } else {
      setEventDate('');
      setEventTime('');
    }
    setEventEndTime(ev.end_time || "");
    setIsAddModalOpen(true);
  };

  const handleTimeChange = (text: string, setter: (val: string) => void) => {
    let cleanText = text.replace(/[^0-9]/g, '');
    if (cleanText.length > 2) {
      cleanText = cleanText.substring(0, 2) + ':' + cleanText.substring(2, 4);
    }
    setter(cleanText);
  };

  const handleFileUpload = async () => {
    const permissionResult = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (!permissionResult.granted) {
      Alert.alert('İzin Gerekli', 'Fotoğraf yüklemek için galeri erişimine izin vermelisiniz.');
      return;
    }
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ['images'],
      allowsEditing: true,
      quality: 0.6,
      base64: true,
    });

    if (!result.canceled && result.assets[0].base64) {
      setNewEvent(prev => ({
        ...prev,
        image_url: result.assets[0].uri,
        base64Image: result.assets[0].base64 || ''
      }));
    }
  };

  const handleFormSubmit = async () => {
    if (!newEvent.title || !newEvent.category || !eventDate || !eventTime || !newEvent.location || !newEvent.description) {
      Alert.alert('Hata', 'Lütfen tüm zorunlu alanları doldurun.');
      return;
    }
    if (newEvent.category === "Diğer" && !customCategory) {
      Alert.alert('Hata', 'Lütfen özel kategorinizi yazın.');
      return;
    }

    try {
      setSubmitting(true);
      let finalImageUrl = newEvent.image_url;

      if (newEvent.base64Image) {
        const fileExt = newEvent.image_url.split('.').pop() || 'jpg';
        const fileName = `poster_${user?.id}_${Date.now()}.${fileExt}`;
        const filePath = `posters/${fileName}`;

        const { error: uploadError } = await supabase.storage
          .from('public-assets')
          .upload(filePath, decode(newEvent.base64Image), { contentType: `image/${fileExt}` });

        if (uploadError) throw uploadError;
        const { data: publicUrlData } = supabase.storage.from('public-assets').getPublicUrl(filePath);
        finalImageUrl = publicUrlData.publicUrl;
      }

      const finalCategory = newEvent.category === "Diğer" ? customCategory : newEvent.category;
      let combinedDate = null;
      if (eventDate && eventTime) {
        combinedDate = `${eventDate}T${eventTime}:00`;
      }

      const payload = {
        title: newEvent.title,
        category: finalCategory,
        date: combinedDate,
        end_time: eventEndTime || null,
        location: newEvent.location,
        description: newEvent.description,
        capacity: newEvent.capacity ? parseInt(newEvent.capacity, 10) : null,
        requires_approval: newEvent.requires_approval,
        image_url: finalImageUrl,
        university_id: profile?.university_id,
        organizer_id: user?.id,
        status: editingEventId ? 'pending' : 'pending' // Re-evaluates on edit
      };

      if (editingEventId) {
        const { error } = await supabase.from('events').update(payload).eq('id', editingEventId);
        if (error) throw error;
        Alert.alert('Başarılı', 'Etkinlik güncellendi ve yeniden SKS onayına gönderildi.');
      } else {
        const { error } = await supabase.from('events').insert([payload]);
        if (error) throw error;
        Alert.alert('Başarılı', 'Etkinlik talebi oluşturuldu ve SKS onayına gönderildi.');
      }

      setIsAddModalOpen(false);
      loadData();
    } catch (err: any) {
      Alert.alert('Hata', err.message);
    } finally {
      setSubmitting(false);
    }
  };

  const handleDeleteConfirm = async () => {
    if (!deleteModal.eventId) return;
    try {
      const { error } = await supabase.from('events').delete().eq('id', deleteModal.eventId);
      if (error) throw error;
      Alert.alert('Başarılı', 'Etkinlik silindi.');
      setDeleteModal({ isOpen: false, eventId: null });
      loadData();
    } catch (e: any) {
      Alert.alert('Hata', e.message);
    }
  };

  const generateDescriptionWithGemini = async () => {
    if (!newEvent.title || !eventDate || !newEvent.category) {
      Alert.alert('Eksik Bilgi', 'AI ile açıklama üretmek için lütfen Etkinlik Başlığı, Kategori ve Tarih alanlarını doldurun.');
      return;
    }

    setAiLoading(true);
    try {
      const apiKey = process.env.EXPO_PUBLIC_GEMINI_API_KEY;
      if (!apiKey) throw new Error("API Key bulunamadı.");

      const prompt = `
        Sen üniversite öğrencilerine yönelik heyecan verici ve profesyonel metinler hazırlayan bir içerik üreticisisin.
        Aşağıdaki etkinlik bilgileriyle, öğrencilerin ilgisini çekecek, akıcı, net ve motive edici bir etkinlik tanıtım/açıklama metni yaz.
        
        Bilgiler:
        - Etkinlik Adı: ${newEvent.title}
        - Kategori: ${newEvent.category === "Diğer" ? customCategory : newEvent.category}
        - Üniversite: ${universityName || 'Üniversite'}
        - Düzenleyen Topluluk: ${profile?.full_name || 'Öğrenci Topluluğu'}
        
        Kurallar:
        - KESİNLİKLE HİÇBİR EMOJİ KULLANMA. Metinde tek bir emoji dahi olmamalı.
        - Açıklama 400-500 karakter (yaklaşık 60-70 kelime) uzunluğunda olmalı.
        - Tarih, saat veya konum bilgisi için yer tutucular ekleme, sadece açıklamaya odaklan.
        - Paragraf düzeninde olsun ve gerekiyorsa çok kısa maddeler içerebilsin.
        - Başında veya sonunda "İşte metniniz" gibi gereksiz cümleler kurma.
      `;

      const response = await fetch(
        `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${apiKey}`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ contents: [{ parts: [{ text: prompt }] }] }),
        }
      );

      if (!response.ok) throw new Error("Gemini API hatası oluştu.");
      const data = await response.json();
      let generatedText = data.candidates?.[0]?.content?.parts?.[0]?.text;
      
      if (generatedText) {
        // Strip emojis just in case
        generatedText = generatedText.replace(/[\u{1F600}-\u{1F64F}\u{1F300}-\u{1F5FF}\u{1F680}-\u{1F6FF}\u{1F700}-\u{1F77F}\u{1F780}-\u{1F7FF}\u{1F800}-\u{1F8FF}\u{1F900}-\u{1F9FF}\u{1FA00}-\u{1FA6F}\u{1FA70}-\u{1FAFF}\u{2600}-\u{26FF}\u{2700}-\u{27BF}]/gu, '');
        setNewEvent(prev => ({ ...prev, description: generatedText.trim() }));
      }
    } catch (error) {
      Alert.alert('AI Hatası', 'Açıklama üretilemedi. Lütfen tekrar deneyin.');
    } finally {
      setAiLoading(false);
    }
  };

  const fetchParticipants = async (eventId: string) => {
    try {
      setLoadingParticipants(true);
      const { data, error } = await supabase
        .from('event_participants')
        .select(`id, status, joined_at, profiles:student_id(full_name, email)`)
        .eq('event_id', eventId)
        .order('joined_at', { ascending: false });

      if (data) setParticipants(data);
    } catch (e) {
      console.error(e);
    } finally {
      setLoadingParticipants(false);
    }
  };

  const handleManageEvent = (ev: any) => {
    setManageEvent(ev);
    fetchParticipants(ev.id);
  };

  const handleUpdateParticipantStatus = async (participantId: string, status: string) => {
    try {
      const { error } = await supabase.from('event_participants').update({ status }).eq('id', participantId);
      if (error) throw error;
      setParticipants(prev => prev.map(p => p.id === participantId ? { ...p, status } : p));
      loadData();
    } catch (e: any) {
      Alert.alert('Hata', e.message);
    }
  };

  const generatePDF = async () => {
    if (!manageEvent) return;
    try {
      const html = `
        <html>
          <head>
            <style>
              body { font-family: 'Helvetica', 'Arial', sans-serif; padding: 20px; color: #1e293b; }
              h1 { color: #0f172a; text-align: center; margin-bottom: 5px; }
              h3 { color: #64748b; text-align: center; margin-top: 0; margin-bottom: 30px; font-weight: normal; }
              table { width: 100%; border-collapse: collapse; margin-top: 20px; font-size: 14px; }
              th, td { border: 1px solid #e2e8f0; padding: 12px; text-align: left; }
              th { background-color: #f8fafc; font-weight: bold; color: #475569; }
              .status-approved { color: #16a34a; font-weight: bold; }
              .status-pending { color: #d97706; font-weight: bold; }
              .status-rejected { color: #dc2626; font-weight: bold; strike-through: true; }
            </style>
          </head>
          <body>
            <h1>${manageEvent.title}</h1>
            <h3>Katılımcı Listesi • ${new Date().toLocaleDateString('tr-TR')}</h3>
            <table>
              <tr>
                <th>Öğrenci Adı</th>
                <th>E-posta</th>
                <th>Durum</th>
                <th>Kayıt Tarihi</th>
              </tr>
              ${participants.map(p => `
                <tr>
                  <td>${p.profiles?.full_name || 'Bilinmeyen'}</td>
                  <td>${p.profiles?.email || '-'}</td>
                  <td class="status-${p.status}">
                    ${p.status === 'approved' ? 'Kabul Edildi' : p.status === 'rejected' ? 'Reddedildi' : 'Bekliyor'}
                  </td>
                  <td>${new Date(p.joined_at).toLocaleString('tr-TR', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit'})}</td>
                </tr>
              `).join('')}
            </table>
          </body>
        </html>
      `;
      const { uri } = await Print.printToFileAsync({ html, base64: false });
      await Sharing.shareAsync(uri, { dialogTitle: 'Katılımcı Listesi PDF' });
    } catch (err) {
      Alert.alert('Hata', 'PDF oluşturulamadı.');
    }
  };

  const now = new Date();
  const pastEvents = myEvents.filter(ev => ev.date && new Date(ev.date) < now);
  const activeEvents = myEvents.filter(ev => !ev.date || new Date(ev.date) >= now);

  const pastYears = Array.from(
    new Set(
      pastEvents
        .map(ev => {
          if (!ev.date) return null;
          try { return new Date(ev.date).getFullYear().toString(); } catch (e) { return null; }
        })
        .filter(Boolean)
    )
  ).sort((a, b) => (Number(b) - Number(a)));

  const filteredPastEvents = selectedYear === "all"
    ? pastEvents
    : pastEvents.filter(ev => {
        try { return ev.date && new Date(ev.date).getFullYear().toString() === selectedYear; } catch (e) { return false; }
      });

  if (loading && myEvents.length === 0) {
    return (
      <View style={[styles.centerContent, { backgroundColor: '#f8fafc' }]}>
        <ActivityIndicator size="large" color="#0f172a" />
        <Text style={{ marginTop: 12, color: '#64748b', fontWeight: '500' }}>Yükleniyor...</Text>
      </View>
    );
  }

  if (profile?.is_approved === false) {
    return (
      <SafeAreaView style={{ flex: 1, backgroundColor: '#f8fafc' }}>
        <View style={styles.suspendedContainer}>
          {profile?.rejection_reason ? (
            <>
              <View style={[styles.iconCircle, { backgroundColor: '#fef2f2', borderColor: '#fee2e2' }]}>
                <XCircle color="#ef4444" size={48} />
              </View>
              <Text style={styles.suspendedTitle}>Hesabınız Onaylanmadı</Text>
              <Text style={styles.suspendedDesc}>
                Hesabınız bağlı olduğunuz üniversitenin SKS birimi tarafından reddedilmiş veya askıya alınmış.
              </Text>
              <View style={styles.reasonBox}>
                <Text style={styles.reasonLabel}>GEREKÇE / AÇIKLAMA:</Text>
                <Text style={styles.reasonText}>{profile.rejection_reason}</Text>
              </View>
            </>
          ) : (
            <>
              <View style={[styles.iconCircle, { backgroundColor: '#fffbeb', borderColor: '#fef3c7' }]}>
                <AlertTriangle color="#f59e0b" size={48} />
              </View>
              <Text style={styles.suspendedTitle}>SKS Onayı Bekleniyor</Text>
              <Text style={styles.suspendedDesc}>
                Hesabınız bağlı olduğunuz üniversitenin SKS birimi tarafından incelenmektedir. Onaylandığınızda etkinlik oluşturabileceksiniz.
              </Text>
            </>
          )}
          <TouchableOpacity style={styles.logoutBtn} onPress={() => { signOut(); router.replace("/"); }}>
            <Text style={styles.logoutBtnText}>Çıkış Yap ve Geri Dön</Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    );
  }

  const renderEventCard = ({ item }: { item: any }) => {
    const approvedCount = item.event_participants?.filter((p: any) => p.status === 'approved').length || 0;
    const pendingCount = item.event_participants?.filter((p: any) => p.status === 'pending').length || 0;

    return (
      <TouchableOpacity 
        style={styles.eventCard}
        onPress={() => setViewEvent(item)}
        activeOpacity={0.8}
      >
        <View style={styles.cardTop}>
          <View style={{ flex: 1 }}>
            <View style={styles.badgeRow}>
              <View style={styles.categoryBadge}>
                <Text style={styles.categoryBadgeText}>{item.category}</Text>
              </View>
              {item.requires_approval && (
                <View style={styles.approvalBadge}>
                  <Text style={styles.approvalBadgeText}>ONAY SİSTEMİ</Text>
                </View>
              )}
            </View>
            <Text style={styles.eventTitle}>{item.title}</Text>
            <View style={styles.metaRowInfo}>
              <Calendar size={12} color="#94a3b8" />
              <Text style={styles.metaText}>{formatEventDate(item.date, item.end_time)}</Text>
            </View>
            <View style={styles.metaRowInfo}>
              <MapPin size={12} color="#94a3b8" />
              <Text style={styles.metaText}>{item.location}</Text>
            </View>

            <View style={styles.statsRow}>
              <View style={styles.statChip}>
                <Text style={styles.statChipText}>Katılımcı: {approvedCount}{item.capacity ? ` / ${item.capacity}` : ''}</Text>
              </View>
              {item.requires_approval && pendingCount > 0 && (
                <View style={[styles.statChip, { backgroundColor: '#fffbeb', borderColor: '#fef3c7' }]}>
                  <Text style={[styles.statChipText, { color: '#b45309' }]}>Bekleyen: {pendingCount}</Text>
                </View>
              )}
            </View>
          </View>
        </View>

        <View style={styles.cardActions}>
          <View style={{ flex: 1, marginRight: 8 }}>
            {item.status === 'approved' && (
              <View style={styles.statusBadgeApproved}>
                <CheckCircle size={14} color="#16a34a" />
                <Text style={styles.statusBadgeApprovedText}>Yayınlandı</Text>
              </View>
            )}
            {item.status === 'pending' && (
              <View style={styles.statusBadgePending}>
                <Clock size={14} color="#d97706" />
                <Text style={styles.statusBadgePendingText}>Onay Bekliyor</Text>
              </View>
            )}
            {item.status === 'rejected' && (
              <View>
                <View style={styles.statusBadgeRejected}>
                  <XCircle size={14} color="#dc2626" />
                  <Text style={styles.statusBadgeRejectedText}>Reddedildi</Text>
                </View>
                {item.rejection_reason && (
                  <Text style={styles.rejectionReasonText} numberOfLines={1}>Sebep: {item.rejection_reason}</Text>
                )}
              </View>
            )}
          </View>

          <View style={styles.actionButtons}>
            <TouchableOpacity style={styles.manageBtn} onPress={(e) => { e.stopPropagation(); handleManageEvent(item); }}>
              <Users size={14} color="#4f46e5" />
              <Text style={styles.manageBtnText}>Yönet</Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.editBtn} onPress={(e) => { e.stopPropagation(); handleOpenEditModal(item); }}>
              <Edit size={14} color="#475569" />
            </TouchableOpacity>
            <TouchableOpacity style={styles.deleteBtn} onPress={(e) => { e.stopPropagation(); setDeleteModal({ isOpen: true, eventId: item.id }); }}>
              <Trash2 size={14} color="#ef4444" />
            </TouchableOpacity>
          </View>
        </View>
      </TouchableOpacity>
    );
  };

  const currentList = activeTab === 'active' ? activeEvents : filteredPastEvents;

  return (
    <SafeAreaView style={styles.container}>
      <FlatList
        data={currentList}
        keyExtractor={item => item.id}
        renderItem={renderEventCard}
        contentContainerStyle={styles.listContent}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor="#0f172a" />}
        ListHeaderComponent={
          <>
            <View style={styles.profileCard}>
              <View style={styles.profileLogoContainer}>
                {profile?.logo_url ? (
                  <Image source={{ uri: profile.logo_url }} style={styles.profileLogo} />
                ) : (
                  <Users size={32} color="#cbd5e1" />
                )}
              </View>
              <View style={{ flex: 1, marginLeft: 16 }}>
                <Text style={styles.profileName} numberOfLines={2}>{profile?.full_name || "Organizatör Topluluğu"}</Text>
                <View style={styles.orgBadge}>
                  <BadgeCheck size={12} color="#4f46e5" />
                  <Text style={styles.orgBadgeText}>ORGANİZATÖR</Text>
                </View>
              </View>
            </View>

            <View style={styles.titleRow}>
              <View style={{ flex: 1 }}>
                <Text style={styles.pageTitle}>Etkinlik Taleplerimiz</Text>
                <Text style={styles.pageSubtitle}>SKS başvuruları ve durumları.</Text>
              </View>
              <TouchableOpacity style={styles.createBtn} onPress={handleOpenAddModal}>
                <Plus size={16} color="#fff" />
                <Text style={styles.createBtnText}>Yeni Başvuru</Text>
              </TouchableOpacity>
            </View>

            <View style={styles.tabsRow}>
              <TouchableOpacity style={[styles.tab, activeTab === 'active' && styles.tabActive]} onPress={() => setActiveTab('active')}>
                <Text style={[styles.tabText, activeTab === 'active' && styles.tabTextActive]}>Aktif ({activeEvents.length})</Text>
              </TouchableOpacity>
              <TouchableOpacity style={[styles.tab, activeTab === 'past' && styles.tabActive]} onPress={() => { setActiveTab('past'); setSelectedYear('all'); }}>
                <Text style={[styles.tabText, activeTab === 'past' && styles.tabTextActive]}>Geçmiş ({pastEvents.length})</Text>
              </TouchableOpacity>
            </View>

            {activeTab === 'past' && pastEvents.length > 0 && (
              <View style={styles.yearFilterContainer}>
                <Text style={styles.yearFilterLabel}>Yıl:</Text>
                <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 8 }}>
                  <TouchableOpacity style={[styles.yearBtn, selectedYear === 'all' && styles.yearBtnActive]} onPress={() => setSelectedYear('all')}>
                    <Text style={[styles.yearBtnText, selectedYear === 'all' && styles.yearBtnTextActive]}>Tümü</Text>
                  </TouchableOpacity>
                  {pastYears.map(yr => (
                    <TouchableOpacity key={yr as string} style={[styles.yearBtn, selectedYear === yr && styles.yearBtnActive]} onPress={() => setSelectedYear(yr as string)}>
                      <Text style={[styles.yearBtnText, selectedYear === yr && styles.yearBtnTextActive]}>{yr as string}</Text>
                    </TouchableOpacity>
                  ))}
                </ScrollView>
              </View>
            )}
          </>
        }
        ListEmptyComponent={
          <View style={styles.emptyState}>
            <FileText size={48} color="#e2e8f0" />
            <Text style={styles.emptyStateText}>
              {activeTab === 'active' ? "Aktif etkinlik başvurunuz yok." : "Geçmiş etkinlik bulunmuyor."}
            </Text>
          </View>
        }
      />

      {/* CREATE / EDIT MODAL */}
      <Modal visible={isAddModalOpen} animationType="slide" presentationStyle="pageSheet">
        <KeyboardAvoidingView style={{ flex: 1, backgroundColor: '#f8fafc' }} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
          <View style={styles.modalHeader}>
            <Text style={styles.modalTitle}>{editingEventId ? "Başvuruyu Düzenle" : "Yeni Etkinlik Talebi"}</Text>
            <TouchableOpacity onPress={() => setIsAddModalOpen(false)} style={styles.modalCloseBtn}>
              <X size={20} color="#64748b" />
            </TouchableOpacity>
          </View>
          <ScrollView style={styles.modalScroll} contentContainerStyle={{ padding: 20 }}>
            
            <View style={styles.formGroup}>
              <Text style={styles.formLabel}>Etkinlik Başlığı</Text>
              <TextInput style={styles.input} placeholder="Örn: Blokzincir Zirvesi" value={newEvent.title} onChangeText={t => setNewEvent({...newEvent, title: t})} />
            </View>

            <View style={styles.formGroup}>
              <Text style={styles.formLabel}>Kategori</Text>
              <View style={styles.categoryWrapper}>
                {["Seminer / Konferans", "Eğitim / Atölye", "Konser / Müzik", "Sergi / Sanat", "Spor / Turnuva", "Tiyatro / Gösteri", "Sosyal Sorumluluk", "Yarışma", "Diğer"].map(cat => (
                  <TouchableOpacity 
                    key={cat} 
                    style={[styles.categoryChip, newEvent.category === cat && styles.categoryChipActive]}
                    onPress={() => {
                      setNewEvent({...newEvent, category: cat});
                      if(cat !== "Diğer") setCustomCategory("");
                    }}
                  >
                    <Text style={[styles.categoryChipText, newEvent.category === cat && styles.categoryChipTextActive]}>{cat}</Text>
                  </TouchableOpacity>
                ))}
              </View>
              {newEvent.category === "Diğer" && (
                <TextInput style={[styles.input, { marginTop: 10 }]} placeholder="Kategori adı..." value={customCategory} onChangeText={setCustomCategory} />
              )}
            </View>

            <View style={{ flexDirection: 'row', gap: 12 }}>
              <View style={[styles.formGroup, { flex: 1 }]}>
                <Text style={styles.formLabel}>Tarih (YYYY-AA-GG)</Text>
                <TextInput style={styles.input} placeholder="2026-06-30" value={eventDate} onChangeText={setEventDate} />
              </View>
              <View style={[styles.formGroup, { flex: 1 }]}>
                <Text style={styles.formLabel}>Saat (SS:DD)</Text>
                <TextInput style={styles.input} placeholder="14:00" value={eventTime} onChangeText={(t) => handleTimeChange(t, setEventTime)} keyboardType="numeric" />
              </View>
            </View>

            <View style={{ flexDirection: 'row', gap: 12 }}>
              <View style={[styles.formGroup, { flex: 1 }]}>
                <Text style={styles.formLabel}>Bitiş (Opsiyonel)</Text>
                <TextInput style={styles.input} placeholder="16:00" value={eventEndTime} onChangeText={(t) => handleTimeChange(t, setEventEndTime)} keyboardType="numeric" />
              </View>
              <View style={[styles.formGroup, { flex: 1 }]}>
                <Text style={styles.formLabel}>Kapasite</Text>
                <TextInput style={styles.input} placeholder="Örn: 150" value={newEvent.capacity} onChangeText={t => setNewEvent({...newEvent, capacity: t})} keyboardType="numeric" />
              </View>
            </View>

            <View style={styles.formGroup}>
              <Text style={styles.formLabel}>Konum / Salon</Text>
              <TextInput style={styles.input} placeholder="Örn: Rektörlük Salonu" value={newEvent.location} onChangeText={t => setNewEvent({...newEvent, location: t})} />
            </View>

            <TouchableOpacity 
              style={styles.checkboxRow} 
              activeOpacity={0.7} 
              onPress={() => setNewEvent({...newEvent, requires_approval: !newEvent.requires_approval})}
            >
              <View style={[styles.checkbox, newEvent.requires_approval && styles.checkboxChecked]}>
                {newEvent.requires_approval && <Check size={14} color="#fff" />}
              </View>
              <Text style={styles.checkboxLabel}>Katılım Başvuruları Onay Gerektirsin</Text>
            </TouchableOpacity>

            <View style={styles.formGroup}>
              <View style={styles.aiHeaderRow}>
                <Text style={styles.formLabel}>Detaylı Açıklama</Text>
                <TouchableOpacity style={styles.aiBtn} onPress={generateDescriptionWithGemini} disabled={aiLoading}>
                  {aiLoading ? <ActivityIndicator size="small" color="#4f46e5" /> : <Sparkles size={14} color="#4f46e5" />}
                  <Text style={styles.aiBtnText}>{aiLoading ? "Üretiliyor..." : "AI ile Yazdır"}</Text>
                </TouchableOpacity>
              </View>
              <TextInput 
                style={[styles.input, styles.textArea]} 
                placeholder="Etkinlik detayları..." 
                value={newEvent.description} 
                onChangeText={t => setNewEvent({...newEvent, description: t})} 
                multiline 
                textAlignVertical="top" 
              />
            </View>

            <View style={styles.formGroup}>
              <Text style={styles.formLabel}>Etkinlik Afişi</Text>
              <TouchableOpacity style={styles.imagePickerBtn} onPress={handleFileUpload}>
                {newEvent.image_url ? (
                  <Image source={{ uri: newEvent.image_url }} style={styles.imagePreview} />
                ) : (
                  <>
                    <UploadCloud size={32} color="#94a3b8" />
                    <Text style={styles.imagePickerText}>Cihazdan Görsel Seç</Text>
                  </>
                )}
              </TouchableOpacity>
            </View>

            <View style={{ height: 40 }} />
          </ScrollView>
          <View style={styles.modalFooter}>
            <TouchableOpacity style={styles.cancelBtn} onPress={() => setIsAddModalOpen(false)}>
              <Text style={styles.cancelBtnText}>İptal</Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.submitFormBtn} onPress={handleFormSubmit} disabled={submitting}>
              {submitting ? <ActivityIndicator color="#fff" /> : <Text style={styles.submitFormBtnText}>{editingEventId ? "Güncelle" : "SKS'ye Gönder"}</Text>}
            </TouchableOpacity>
          </View>
        </KeyboardAvoidingView>
      </Modal>

      {/* MANAGE PARTICIPANTS MODAL */}
      <Modal visible={!!manageEvent} animationType="slide">
        <SafeAreaView style={{ flex: 1, backgroundColor: '#f8fafc' }}>
          <View style={styles.manageHeader}>
            <View style={{ flex: 1 }}>
              <Text style={styles.manageHeaderTitle}>Katılımcı Yönetimi</Text>
              <Text style={styles.manageHeaderSub} numberOfLines={1}>{manageEvent?.title}</Text>
            </View>
            <TouchableOpacity style={styles.pdfBtn} onPress={generatePDF}>
              <FileText size={16} color="#334155" />
              <Text style={styles.pdfBtnText}>PDF Al</Text>
            </TouchableOpacity>
            <TouchableOpacity onPress={() => setManageEvent(null)} style={styles.modalCloseBtnDark}>
              <X size={20} color="#fff" />
            </TouchableOpacity>
          </View>

          <ScrollView style={{ flex: 1, padding: 16 }}>
            {loadingParticipants ? (
              <ActivityIndicator size="large" color="#4f46e5" style={{ marginTop: 40 }} />
            ) : (
              <>
                {/* Pending */}
                {manageEvent?.requires_approval && (
                  <View style={styles.participantSection}>
                    <View style={[styles.participantSectionHeader, { backgroundColor: '#fef3c7', borderBottomColor: '#fde68a' }]}>
                      <Clock size={18} color="#b45309" />
                      <Text style={[styles.participantSectionTitle, { color: '#b45309' }]}>Onay Bekleyenler</Text>
                      <View style={[styles.countBadge, { backgroundColor: '#fde68a' }]}><Text style={[styles.countBadgeText, { color: '#92400e' }]}>{participants.filter(p => p.status === 'pending').length}</Text></View>
                    </View>
                    {participants.filter(p => p.status === 'pending').map(p => (
                      <View key={p.id} style={styles.participantRow}>
                        <View style={{ flex: 1 }}>
                          <Text style={styles.participantName}>{p.profiles?.full_name || 'Bilinmeyen'}</Text>
                          <Text style={styles.participantDate}>{new Date(p.joined_at).toLocaleString('tr-TR')}</Text>
                        </View>
                        <View style={styles.participantActions}>
                          <TouchableOpacity style={styles.approveBtn} onPress={() => handleUpdateParticipantStatus(p.id, 'approved')}>
                            <CheckCircle size={14} color="#fff" />
                            <Text style={styles.approveBtnText}>Onayla</Text>
                          </TouchableOpacity>
                          <TouchableOpacity style={styles.rejectBtn} onPress={() => handleUpdateParticipantStatus(p.id, 'rejected')}>
                            <XCircle size={14} color="#fff" />
                          </TouchableOpacity>
                        </View>
                      </View>
                    ))}
                    {participants.filter(p => p.status === 'pending').length === 0 && (
                      <Text style={styles.emptySectionText}>Bekleyen başvuru yok.</Text>
                    )}
                  </View>
                )}

                {/* Approved */}
                <View style={styles.participantSection}>
                  <View style={[styles.participantSectionHeader, { backgroundColor: '#dcfce7', borderBottomColor: '#bbf7d0' }]}>
                    <CheckCircle size={18} color="#15803d" />
                    <Text style={[styles.participantSectionTitle, { color: '#15803d' }]}>Kabul Edilenler</Text>
                    <View style={[styles.countBadge, { backgroundColor: '#bbf7d0' }]}><Text style={[styles.countBadgeText, { color: '#166534' }]}>{participants.filter(p => p.status === 'approved').length}</Text></View>
                  </View>
                  {participants.filter(p => p.status === 'approved').map(p => (
                    <View key={p.id} style={styles.participantRow}>
                      <View style={{ flex: 1 }}>
                        <Text style={styles.participantName}>{p.profiles?.full_name || 'Bilinmeyen'}</Text>
                        <Text style={styles.participantDate}>{new Date(p.joined_at).toLocaleString('tr-TR', { day: 'numeric', month: 'long' })}</Text>
                      </View>
                      {manageEvent?.requires_approval && (
                        <TouchableOpacity style={styles.removeBtn} onPress={() => handleUpdateParticipantStatus(p.id, 'rejected')}>
                          <Text style={styles.removeBtnText}>Çıkar</Text>
                        </TouchableOpacity>
                      )}
                    </View>
                  ))}
                  {participants.filter(p => p.status === 'approved').length === 0 && (
                    <Text style={styles.emptySectionText}>Henüz kabul edilen yok.</Text>
                  )}
                </View>
                
                {/* Rejected */}
                {manageEvent?.requires_approval && participants.filter(p => p.status === 'rejected').length > 0 && (
                  <View style={[styles.participantSection, { opacity: 0.7 }]}>
                    <View style={[styles.participantSectionHeader, { backgroundColor: '#f1f5f9', borderBottomColor: '#e2e8f0' }]}>
                      <XCircle size={18} color="#475569" />
                      <Text style={[styles.participantSectionTitle, { color: '#475569' }]}>Reddedilenler</Text>
                      <View style={[styles.countBadge, { backgroundColor: '#e2e8f0' }]}><Text style={[styles.countBadgeText, { color: '#334155' }]}>{participants.filter(p => p.status === 'rejected').length}</Text></View>
                    </View>
                    {participants.filter(p => p.status === 'rejected').map(p => (
                      <View key={p.id} style={styles.participantRow}>
                        <Text style={[styles.participantName, { textDecorationLine: 'line-through', flex: 1 }]}>{p.profiles?.full_name || 'Bilinmeyen'}</Text>
                        <TouchableOpacity style={styles.undoBtn} onPress={() => handleUpdateParticipantStatus(p.id, 'approved')}>
                          <Text style={styles.undoBtnText}>Geri Al</Text>
                        </TouchableOpacity>
                      </View>
                    ))}
                  </View>
                )}
                
                <View style={{ height: 40 }} />
              </>
            )}
          </ScrollView>
        </SafeAreaView>
      </Modal>

      {/* VIEW EVENT MODAL */}
      <Modal visible={!!viewEvent} animationType="slide" presentationStyle="pageSheet">
        <View style={{ flex: 1, backgroundColor: '#f8fafc' }}>
          <View style={styles.modalHeader}>
            <Text style={styles.modalTitle}>Etkinlik Detayları</Text>
            <TouchableOpacity onPress={() => setViewEvent(null)} style={styles.modalCloseBtn}>
              <X size={20} color="#64748b" />
            </TouchableOpacity>
          </View>
          <ScrollView style={{ padding: 20 }}>
            <Text style={styles.viewTitle}>{viewEvent?.title}</Text>
            
            <View style={styles.viewGrid}>
              <View style={styles.viewGridItem}>
                <Text style={styles.viewLabel}>Kategori</Text>
                <Text style={styles.viewValue}>{viewEvent?.category}</Text>
              </View>
              <View style={styles.viewGridItem}>
                <Text style={styles.viewLabel}>Tarih / Saat</Text>
                <Text style={styles.viewValue}>{formatEventDate(viewEvent?.date, viewEvent?.end_time)}</Text>
              </View>
              <View style={styles.viewGridItem}>
                <Text style={styles.viewLabel}>Konum / Salon</Text>
                <Text style={styles.viewValue}>{viewEvent?.location}</Text>
              </View>
              <View style={styles.viewGridItem}>
                <Text style={styles.viewLabel}>Kapasite</Text>
                <Text style={styles.viewValue}>{viewEvent?.capacity || "Belirtilmedi"}</Text>
              </View>
            </View>

            <Text style={styles.viewLabel}>Detaylı Açıklama</Text>
            <View style={styles.viewDescBox}>
              <Text style={styles.viewDesc}>{viewEvent?.description}</Text>
            </View>

            {viewEvent?.image_url && (
              <View style={{ marginTop: 20 }}>
                <Text style={styles.viewLabel}>Afiş Görseli</Text>
                <Image source={{ uri: viewEvent.image_url }} style={styles.viewImage} />
              </View>
            )}
            
            <View style={{ height: 40 }} />
          </ScrollView>
        </View>
      </Modal>

      {/* DELETE CONFIRM MODAL */}
      <Modal visible={deleteModal.isOpen} transparent animationType="fade">
        <View style={styles.overlay}>
          <View style={styles.alertBox}>
            <View style={styles.alertIconBox}>
              <Trash2 size={32} color="#ef4444" />
            </View>
            <Text style={styles.alertTitle}>Başvuruyu Sil</Text>
            <Text style={styles.alertDesc}>Bu etkinlik başvurusunu silmek / geri çekmek istediğinize emin misiniz? Bu işlem geri alınamaz.</Text>
            <View style={styles.alertActions}>
              <TouchableOpacity style={styles.alertCancelBtn} onPress={() => setDeleteModal({ isOpen: false, eventId: null })}>
                <Text style={styles.alertCancelText}>İptal</Text>
              </TouchableOpacity>
              <TouchableOpacity style={styles.alertConfirmBtn} onPress={handleDeleteConfirm}>
                <Text style={styles.alertConfirmText}>Evet, Sil</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f8fafc' },
  centerContent: { flex: 1, alignItems: 'center', justifyContent: 'center' },

  // Suspended
  suspendedContainer: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: 24 },
  iconCircle: { width: 80, height: 80, borderRadius: 40, borderWidth: 1, alignItems: 'center', justifyContent: 'center', marginBottom: 20 },
  suspendedTitle: { fontSize: 24, fontWeight: '900', color: '#0f172a', textAlign: 'center' },
  suspendedDesc: { fontSize: 14, color: '#64748b', textAlign: 'center', marginTop: 12, lineHeight: 22 },
  reasonBox: { backgroundColor: '#fef2f2', borderWidth: 1, borderColor: '#fee2e2', borderRadius: 12, padding: 16, marginTop: 24, width: '100%' },
  reasonLabel: { fontSize: 11, fontWeight: '800', color: '#b91c1c', marginBottom: 4 },
  reasonText: { fontSize: 14, color: '#7f1d1d', fontWeight: '500' },
  logoutBtn: { marginTop: 32, paddingVertical: 14, paddingHorizontal: 24, backgroundColor: '#fff', borderWidth: 1, borderColor: '#e2e8f0', borderRadius: 12 },
  logoutBtnText: { color: '#475569', fontWeight: '700', fontSize: 14 },

  // List Headers
  listContent: { padding: 16, paddingBottom: 100 },
  profileCard: { backgroundColor: '#fff', padding: 16, borderRadius: 16, borderWidth: 1, borderColor: '#f1f5f9', flexDirection: 'row', alignItems: 'center', marginBottom: 24 },
  profileLogoContainer: { width: 64, height: 64, borderRadius: 32, backgroundColor: '#f8fafc', borderWidth: 3, borderColor: '#f1f5f9', overflow: 'hidden', alignItems: 'center', justifyContent: 'center' },
  profileLogo: { width: '100%', height: '100%' },
  profileName: { fontSize: 20, fontWeight: '800', color: '#0f172a' },
  orgBadge: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#eef2ff', alignSelf: 'flex-start', paddingHorizontal: 8, paddingVertical: 4, borderRadius: 6, borderWidth: 1, borderColor: '#e0e7ff', marginTop: 6, gap: 4 },
  orgBadgeText: { fontSize: 10, fontWeight: '800', color: '#4f46e5' },

  titleRow: { flexDirection: 'row', alignItems: 'center', marginBottom: 20 },
  pageTitle: { fontSize: 22, fontWeight: '800', color: '#0f172a' },
  pageSubtitle: { fontSize: 13, color: '#64748b', marginTop: 2 },
  createBtn: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#0f172a', paddingHorizontal: 16, paddingVertical: 10, borderRadius: 12, gap: 6 },
  createBtnText: { color: '#fff', fontWeight: '700', fontSize: 13 },

  tabsRow: { flexDirection: 'row', borderBottomWidth: 1, borderBottomColor: '#e2e8f0', marginBottom: 20 },
  tab: { paddingVertical: 12, paddingHorizontal: 16, borderBottomWidth: 2, borderBottomColor: 'transparent' },
  tabActive: { borderBottomColor: '#0f172a' },
  tabText: { fontSize: 14, fontWeight: '700', color: '#64748b' },
  tabTextActive: { color: '#0f172a', fontWeight: '900' },

  yearFilterContainer: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#fff', padding: 12, borderRadius: 16, borderWidth: 1, borderColor: '#f1f5f9', marginBottom: 20 },
  yearFilterLabel: { fontSize: 13, fontWeight: '800', color: '#475569', marginRight: 12 },
  yearBtn: { paddingHorizontal: 14, paddingVertical: 6, borderRadius: 10, borderWidth: 1, borderColor: '#e2e8f0', backgroundColor: '#f8fafc' },
  yearBtnActive: { backgroundColor: '#0f172a', borderColor: '#0f172a' },
  yearBtnText: { fontSize: 12, fontWeight: '700', color: '#475569' },
  yearBtnTextActive: { color: '#fff' },

  emptyState: { alignItems: 'center', justifyContent: 'center', padding: 40, backgroundColor: '#fff', borderRadius: 20, borderWidth: 1, borderColor: '#f1f5f9' },
  emptyStateText: { marginTop: 16, fontSize: 14, fontWeight: '600', color: '#94a3b8' },

  // Event Cards
  eventCard: { backgroundColor: '#fff', borderRadius: 20, borderWidth: 1, borderColor: '#f1f5f9', padding: 16, marginBottom: 16 },
  cardTop: { flexDirection: 'row' },
  badgeRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 6, marginBottom: 8 },
  categoryBadge: { backgroundColor: '#f1f5f9', borderWidth: 1, borderColor: '#e2e8f0', paddingHorizontal: 8, paddingVertical: 4, borderRadius: 6 },
  categoryBadgeText: { fontSize: 9, fontWeight: '900', color: '#334155', textTransform: 'uppercase' },
  approvalBadge: { backgroundColor: '#eef2ff', borderWidth: 1, borderColor: '#e0e7ff', paddingHorizontal: 8, paddingVertical: 4, borderRadius: 6 },
  approvalBadgeText: { fontSize: 9, fontWeight: '900', color: '#4338ca', textTransform: 'uppercase' },
  eventTitle: { fontSize: 16, fontWeight: '800', color: '#0f172a', marginBottom: 8 },
  metaRowInfo: { flexDirection: 'row', alignItems: 'center', gap: 6, marginBottom: 4 },
  metaText: { fontSize: 11, fontWeight: '600', color: '#64748b' },
  statsRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginTop: 12 },
  statChip: { backgroundColor: '#f8fafc', borderWidth: 1, borderColor: '#e2e8f0', paddingHorizontal: 10, paddingVertical: 6, borderRadius: 8 },
  statChipText: { fontSize: 10, fontWeight: '800', color: '#475569' },
  
  cardActions: { flexDirection: 'row', alignItems: 'flex-end', justifyContent: 'space-between', marginTop: 16, paddingTop: 16, borderTopWidth: 1, borderTopColor: '#f1f5f9' },
  statusBadgeApproved: { flexDirection: 'row', alignItems: 'center', gap: 4, backgroundColor: '#f0fdf4', paddingHorizontal: 10, paddingVertical: 6, borderRadius: 10, borderWidth: 1, borderColor: '#dcfce7', alignSelf: 'flex-start' },
  statusBadgeApprovedText: { fontSize: 11, fontWeight: '800', color: '#16a34a' },
  statusBadgePending: { flexDirection: 'row', alignItems: 'center', gap: 4, backgroundColor: '#fffbeb', paddingHorizontal: 10, paddingVertical: 6, borderRadius: 10, borderWidth: 1, borderColor: '#fef3c7', alignSelf: 'flex-start' },
  statusBadgePendingText: { fontSize: 11, fontWeight: '800', color: '#d97706' },
  statusBadgeRejected: { flexDirection: 'row', alignItems: 'center', gap: 4, backgroundColor: '#fef2f2', paddingHorizontal: 10, paddingVertical: 6, borderRadius: 10, borderWidth: 1, borderColor: '#fee2e2', alignSelf: 'flex-start' },
  statusBadgeRejectedText: { fontSize: 11, fontWeight: '800', color: '#dc2626' },
  rejectionReasonText: { fontSize: 10, fontWeight: '600', color: '#b91c1c', marginTop: 4, maxWidth: 180 },
  
  actionButtons: { flexDirection: 'row', gap: 6 },
  manageBtn: { flexDirection: 'row', alignItems: 'center', gap: 4, backgroundColor: '#eef2ff', paddingHorizontal: 12, paddingVertical: 8, borderRadius: 10, borderWidth: 1, borderColor: '#e0e7ff' },
  manageBtnText: { fontSize: 11, fontWeight: '800', color: '#4f46e5' },
  editBtn: { backgroundColor: '#f8fafc', padding: 8, borderRadius: 10, borderWidth: 1, borderColor: '#e2e8f0' },
  deleteBtn: { backgroundColor: '#fef2f2', padding: 8, borderRadius: 10, borderWidth: 1, borderColor: '#fee2e2' },

  // Modal Structure
  modalHeader: { padding: 20, borderBottomWidth: 1, borderBottomColor: '#f1f5f9', backgroundColor: '#fff', flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  modalTitle: { fontSize: 18, fontWeight: '800', color: '#0f172a' },
  modalCloseBtn: { padding: 4 },
  modalScroll: { flex: 1 },
  modalFooter: { padding: 20, backgroundColor: '#fff', borderTopWidth: 1, borderTopColor: '#f1f5f9', flexDirection: 'row', gap: 12 },
  cancelBtn: { flex: 1, paddingVertical: 14, alignItems: 'center', borderRadius: 12, backgroundColor: '#f1f5f9' },
  cancelBtnText: { fontSize: 14, fontWeight: '700', color: '#475569' },
  submitFormBtn: { flex: 2, paddingVertical: 14, alignItems: 'center', borderRadius: 12, backgroundColor: '#0f172a' },
  submitFormBtnText: { fontSize: 14, fontWeight: '800', color: '#fff' },

  // Forms
  formGroup: { marginBottom: 20 },
  formLabel: { fontSize: 13, fontWeight: '700', color: '#334155', marginBottom: 8 },
  input: { backgroundColor: '#fff', borderWidth: 1, borderColor: '#e2e8f0', borderRadius: 12, paddingHorizontal: 16, paddingVertical: 12, fontSize: 14, color: '#0f172a' },
  textArea: { minHeight: 100 },
  categoryWrapper: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  categoryChip: { paddingHorizontal: 12, paddingVertical: 8, borderRadius: 10, borderWidth: 1, borderColor: '#e2e8f0', backgroundColor: '#fff' },
  categoryChipActive: { backgroundColor: '#0f172a', borderColor: '#0f172a' },
  categoryChipText: { fontSize: 12, fontWeight: '600', color: '#475569' },
  categoryChipTextActive: { color: '#fff' },

  checkboxRow: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#f8fafc', padding: 12, borderRadius: 12, borderWidth: 1, borderColor: '#f1f5f9', marginBottom: 20 },
  checkbox: { width: 20, height: 20, borderRadius: 6, borderWidth: 1, borderColor: '#cbd5e1', backgroundColor: '#fff', alignItems: 'center', justifyContent: 'center', marginRight: 10 },
  checkboxChecked: { backgroundColor: '#0f172a', borderColor: '#0f172a' },
  checkboxLabel: { fontSize: 12, fontWeight: '700', color: '#334155' },

  aiHeaderRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 8 },
  aiBtn: { flexDirection: 'row', alignItems: 'center', gap: 4, backgroundColor: '#eef2ff', paddingHorizontal: 10, paddingVertical: 6, borderRadius: 8, borderWidth: 1, borderColor: '#e0e7ff' },
  aiBtnText: { fontSize: 11, fontWeight: '800', color: '#4f46e5' },

  imagePickerBtn: { width: '100%', aspectRatio: 4/5, backgroundColor: '#f8fafc', borderWidth: 2, borderColor: '#e2e8f0', borderStyle: 'dashed', borderRadius: 20, alignItems: 'center', justifyContent: 'center', overflow: 'hidden' },
  imagePreview: { width: '100%', height: '100%' },
  imagePickerText: { fontSize: 13, fontWeight: '700', color: '#64748b', marginTop: 12 },

  // Delete Alert
  overlay: { flex: 1, backgroundColor: 'rgba(15, 23, 42, 0.6)', justifyContent: 'center', alignItems: 'center', padding: 20 },
  alertBox: { backgroundColor: '#fff', borderRadius: 24, padding: 24, width: '100%', maxWidth: 340, alignItems: 'center' },
  alertIconBox: { width: 64, height: 64, borderRadius: 32, backgroundColor: '#fef2f2', alignItems: 'center', justifyContent: 'center', marginBottom: 16 },
  alertTitle: { fontSize: 20, fontWeight: '900', color: '#0f172a', marginBottom: 8 },
  alertDesc: { fontSize: 13, color: '#64748b', textAlign: 'center', marginBottom: 24, lineHeight: 20 },
  alertActions: { flexDirection: 'row', gap: 12, width: '100%' },
  alertCancelBtn: { flex: 1, paddingVertical: 12, borderRadius: 12, borderWidth: 1, borderColor: '#e2e8f0', alignItems: 'center' },
  alertCancelText: { fontSize: 14, fontWeight: '700', color: '#475569' },
  alertConfirmBtn: { flex: 1, paddingVertical: 12, borderRadius: 12, backgroundColor: '#ef4444', alignItems: 'center' },
  alertConfirmText: { fontSize: 14, fontWeight: '800', color: '#fff' },

  // Manage Modal
  manageHeader: { backgroundColor: '#0f172a', paddingHorizontal: 20, paddingVertical: 16, flexDirection: 'row', alignItems: 'center' },
  manageHeaderTitle: { color: '#fff', fontSize: 18, fontWeight: '800' },
  manageHeaderSub: { color: '#94a3b8', fontSize: 12, fontWeight: '500', marginTop: 2 },
  modalCloseBtnDark: { padding: 8, backgroundColor: '#1e293b', borderRadius: 20, marginLeft: 12 },
  pdfBtn: { flexDirection: 'row', alignItems: 'center', gap: 6, backgroundColor: '#fff', paddingHorizontal: 12, paddingVertical: 8, borderRadius: 10 },
  pdfBtnText: { fontSize: 12, fontWeight: '800', color: '#334155' },

  participantSection: { backgroundColor: '#fff', borderRadius: 16, borderWidth: 1, borderColor: '#f1f5f9', marginBottom: 20, overflow: 'hidden' },
  participantSectionHeader: { flexDirection: 'row', alignItems: 'center', padding: 16, borderBottomWidth: 1 },
  participantSectionTitle: { fontSize: 14, fontWeight: '800', marginLeft: 8, flex: 1 },
  countBadge: { paddingHorizontal: 8, paddingVertical: 2, borderRadius: 8 },
  countBadgeText: { fontSize: 11, fontWeight: '900' },
  emptySectionText: { padding: 24, textAlign: 'center', fontSize: 13, color: '#94a3b8', fontStyle: 'italic', fontWeight: '500' },
  participantRow: { flexDirection: 'row', alignItems: 'center', padding: 16, borderBottomWidth: 1, borderBottomColor: '#f8fafc' },
  participantName: { fontSize: 14, fontWeight: '700', color: '#0f172a' },
  participantDate: { fontSize: 11, color: '#64748b', marginTop: 4 },
  participantActions: { flexDirection: 'row', gap: 8 },
  approveBtn: { flexDirection: 'row', alignItems: 'center', gap: 4, backgroundColor: '#22c55e', paddingHorizontal: 12, paddingVertical: 8, borderRadius: 10 },
  approveBtnText: { color: '#fff', fontSize: 11, fontWeight: '800' },
  rejectBtn: { backgroundColor: '#ef4444', padding: 8, borderRadius: 10, alignItems: 'center', justifyContent: 'center' },
  removeBtn: { paddingHorizontal: 12, paddingVertical: 6, backgroundColor: '#fef2f2', borderRadius: 8, borderWidth: 1, borderColor: '#fee2e2' },
  removeBtnText: { color: '#ef4444', fontSize: 11, fontWeight: '700' },
  undoBtn: { paddingHorizontal: 12, paddingVertical: 6, backgroundColor: '#eef2ff', borderRadius: 8, borderWidth: 1, borderColor: '#e0e7ff' },
  undoBtnText: { color: '#4f46e5', fontSize: 11, fontWeight: '700' },

  // View Modal
  viewTitle: { fontSize: 24, fontWeight: '900', color: '#0f172a', marginBottom: 24 },
  viewGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 16, backgroundColor: '#fff', padding: 16, borderRadius: 16, borderWidth: 1, borderColor: '#f1f5f9', marginBottom: 24 },
  viewGridItem: { width: '45%', marginBottom: 12 },
  viewLabel: { fontSize: 11, fontWeight: '800', color: '#94a3b8', textTransform: 'uppercase', marginBottom: 4 },
  viewValue: { fontSize: 14, fontWeight: '700', color: '#334155' },
  viewDescBox: { backgroundColor: '#fff', padding: 16, borderRadius: 16, borderWidth: 1, borderColor: '#f1f5f9', marginTop: 8 },
  viewDesc: { fontSize: 14, color: '#475569', lineHeight: 22 },
  viewImage: { width: '100%', aspectRatio: 4/5, borderRadius: 20, marginTop: 8 }
});
