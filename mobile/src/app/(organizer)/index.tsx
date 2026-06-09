import React, { useState, useEffect } from 'react';
import { StyleSheet, View, FlatList, ActivityIndicator, TouchableOpacity, RefreshControl, Modal, TextInput, Image, ScrollView, Platform } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { CheckCircle, Clock, XCircle, Users, ArrowLeft, UploadCloud, Camera, Image as ImageIcon, Plus, BadgeCheck, Download, FileText, Sparkles, Check, ChevronDown } from 'lucide-react-native';

import { ThemedText } from '@/components/themed-text';
import { useAuth } from '@/context/AuthContext';
import { supabase } from '@/lib/supabaseClient';
import { Colors, Spacing } from '@/constants/theme';
import { useColorScheme } from '@/hooks/use-color-scheme';
import { useRouter } from 'expo-router';
import * as ImagePicker from 'expo-image-picker';
import { decode } from 'base64-arraybuffer';
import * as Print from 'expo-print';
import * as Sharing from 'expo-sharing';

export default function OrganizerDashboard() {
  const { user, profile, loading, signOut } = useAuth();
  const scheme = useColorScheme();
  const colors = Colors[scheme === 'dark' ? 'dark' : 'light'];
  const router = useRouter();

  const [orgEvents, setOrgEvents] = useState<any[]>([]);
  const [orgTab, setOrgTab] = useState<'active' | 'past'>('active');
  const [loadingOrg, setLoadingOrg] = useState(false);
  const [refreshing, setRefreshing] = useState(false);

  // Modals
  const [createEventModal, setCreateEventModal] = useState(false);
  const [manageEventModal, setManageEventModal] = useState<any>(null);
  const [participants, setParticipants] = useState<any[]>([]);
  const [loadingParticipants, setLoadingParticipants] = useState(false);
  const [photoMenuVisible, setPhotoMenuVisible] = useState(false);
  const [categoryMenuVisible, setCategoryMenuVisible] = useState(false);
  const [alertModal, setAlertModal] = useState({ visible: false, title: '', message: '', type: 'success' });

  // Form State
  const EVENT_CATEGORIES = ['Seminer / Konferans', 'Eğitim / Atölye', 'Konser / Müzik', 'Sergi / Sanat', 'Spor / Turnuva', 'Tiyatro / Gösteri', 'Sosyal Sorumluluk', 'Yarışma', 'Diğer'];
  const [newEvent, setNewEvent] = useState({
    title: '', category: 'Seminer / Konferans', date: '', time: '12:00', location: '', description: '', capacity: '', image_url: '', base64Image: '', requires_approval: false
  });
  const [submittingEvent, setSubmittingEvent] = useState(false);

  const loadOrganizerEvents = async () => {
    if (!user) return;
    try {
      setLoadingOrg(true);
      const { data, error } = await supabase
        .from('events')
        .select('*')
        .eq('organizer_id', user.id)
        .order('created_at', { ascending: false });

      if (!error && data) {
        setOrgEvents(data);
      }
    } finally {
      setLoadingOrg(false);
    }
  };

  useEffect(() => {
    loadOrganizerEvents();
  }, [user]);

  const onRefresh = async () => {
    setRefreshing(true);
    await loadOrganizerEvents();
    setRefreshing(false);
  };

  const openImagePicker = async (source: 'camera' | 'gallery') => {
    setPhotoMenuVisible(false);
    let result;
    if (source === 'camera') {
      const permissionResult = await ImagePicker.requestCameraPermissionsAsync();
      if (!permissionResult.granted) {
        setAlertModal({ visible: true, title: "Erişim Reddedildi", message: "Fotoğraf çekmek için kamera erişimine izin vermelisiniz.", type: "error" });
        return;
      }
      result = await ImagePicker.launchCameraAsync({ allowsEditing: true, quality: 0.5, base64: true });
    } else {
      const permissionResult = await ImagePicker.requestMediaLibraryPermissionsAsync();
      if (!permissionResult.granted) {
        setAlertModal({ visible: true, title: "Erişim Reddedildi", message: "Fotoğraf yüklemek için galeri erişimine izin vermelisiniz.", type: "error" });
        return;
      }
      result = await ImagePicker.launchImageLibraryAsync({ mediaTypes: ['images'], allowsEditing: true, quality: 0.5, base64: true });
    }

    if (!result.canceled && result.assets[0].base64) {
      setNewEvent(prev => ({ ...prev, image_url: result.assets[0].uri, base64Image: result.assets[0].base64 || '' }));
    }
  };

  const handleCreateEvent = async () => {
    if (!newEvent.title || !newEvent.date || !newEvent.location) {
      setAlertModal({ visible: true, title: "Hata", message: "Lütfen zorunlu alanları (Başlık, Tarih, Konum) doldurun.", type: "error" });
      return;
    }
    
    try {
      setSubmittingEvent(true);
      let finalImageUrl = null;

      if (newEvent.base64Image) {
        const fileExt = newEvent.image_url.split('.').pop() || 'jpg';
        const fileName = `poster_${user?.id}_${Date.now()}.${fileExt}`;
        const filePath = `posters/${fileName}`;

        const { error: uploadError } = await supabase.storage.from('public-assets').upload(filePath, decode(newEvent.base64Image), { contentType: `image/${fileExt}` });
        if (uploadError) throw uploadError;
        const { data: publicUrlData } = supabase.storage.from('public-assets').getPublicUrl(filePath);
        finalImageUrl = publicUrlData.publicUrl;
      }

      const combinedDate = `${newEvent.date}T${newEvent.time}:00`;
      
      const { error } = await supabase.from('events').insert([{
        title: newEvent.title, category: newEvent.category || 'Diğer', date: combinedDate,
        location: newEvent.location, description: newEvent.description,
        capacity: newEvent.capacity ? parseInt(newEvent.capacity, 10) : null,
        image_url: finalImageUrl, university_id: profile?.university_id,
        organizer_id: user?.id, status: 'pending', requires_approval: newEvent.requires_approval
      }]);

      if (error) throw error;
      
      setAlertModal({ visible: true, title: 'Başarılı', message: 'Etkinlik başarıyla oluşturuldu ve SKS onayına gönderildi.', type: 'success' });
      setCreateEventModal(false);
      setNewEvent({ title: '', category: 'Seminer / Konferans', date: '', time: '12:00', location: '', description: '', capacity: '', image_url: '', base64Image: '', requires_approval: false });
      loadOrganizerEvents();
    } catch (err: any) {
      setAlertModal({ visible: true, title: 'Hata', message: err.message, type: 'error' });
    } finally {
      setSubmittingEvent(false);
    }
  };

  const loadParticipants = async (eventId: string) => {
    try {
      setLoadingParticipants(true);
      const { data } = await supabase.from('event_participants').select(`id, status, joined_at, profiles:student_id(full_name, email)`).eq('event_id', eventId).order('joined_at', { ascending: false });
      if (data) setParticipants(data);
    } finally {
      setLoadingParticipants(false);
    }
  };

  const updateParticipantStatus = async (participantId: string, status: 'approved' | 'rejected') => {
    try {
      await supabase.from('event_participants').update({ status }).eq('id', participantId);
      setParticipants(prev => prev.map(p => p.id === participantId ? { ...p, status } : p));
    } catch (e: any) {
      setAlertModal({ visible: true, title: "Hata", message: e.message, type: "error" });
    }
  };

  const handleDownloadPDF = async () => {
    if (!manageEventModal || participants.length === 0) {
      setAlertModal({ visible: true, title: 'Hata', message: 'İndirilecek katılımcı bulunamadı.', type: 'error' });
      return;
    }

    try {
      const approvedParticipants = participants.filter(p => p.status === 'approved');
      const pendingParticipants = participants.filter(p => p.status === 'pending');
      const rejectedParticipants = participants.filter(p => p.status === 'rejected');
      
      const htmlContent = `
        <html>
          <head>
            <meta charset="utf-8">
            <style>
              body { font-family: 'Helvetica Neue', Helvetica, Arial, sans-serif; padding: 40px; color: #0f172a; }
              h1 { color: #0f172a; border-bottom: 2px solid #e2e8f0; padding-bottom: 10px; margin-bottom: 20px; }
              .info-grid { display: flex; flex-wrap: wrap; gap: 20px; margin-bottom: 30px; background: #f8fafc; padding: 20px; border-radius: 12px; }
              .info-item { flex: 1; min-width: 200px; }
              .info-label { font-size: 12px; color: #64748b; font-weight: bold; text-transform: uppercase; margin-bottom: 4px; }
              .info-value { font-size: 16px; color: #0f172a; font-weight: bold; }
              
              .stats-grid { display: flex; gap: 15px; margin-bottom: 30px; }
              .stat-box { flex: 1; padding: 15px; border-radius: 12px; border: 1px solid #e2e8f0; text-align: center; }
              .stat-number { font-size: 24px; font-weight: bold; margin-bottom: 4px; }
              .stat-label { font-size: 12px; color: #64748b; font-weight: bold; }
              
              h2 { font-size: 18px; color: #0f172a; margin-top: 30px; margin-bottom: 15px; }
              table { width: 100%; border-collapse: collapse; margin-bottom: 30px; }
              th { background-color: #f1f5f9; color: #475569; font-weight: bold; text-align: left; padding: 12px; border-bottom: 2px solid #cbd5e1; font-size: 14px; }
              td { padding: 12px; border-bottom: 1px solid #e2e8f0; color: #334155; font-size: 14px; }
              .badge { display: inline-block; padding: 4px 8px; border-radius: 6px; font-size: 12px; font-weight: bold; }
              .badge-approved { background-color: #dcfce7; color: #166534; }
              .badge-pending { background-color: #fef3c7; color: #92400e; }
              .badge-rejected { background-color: #fee2e2; color: #991b1b; }
            </style>
          </head>
          <body>
            <h1>Etkinlik Katılımcı Raporu</h1>
            
            <div class="info-grid">
              <div class="info-item">
                <div class="info-label">Etkinlik Başlığı</div>
                <div class="info-value">${manageEventModal.title}</div>
              </div>
              <div class="info-item">
                <div class="info-label">Tarih / Saat</div>
                <div class="info-value">${new Date(manageEventModal.date).toLocaleDateString('tr-TR')} - ${new Date(manageEventModal.date).toLocaleTimeString('tr-TR', {hour: '2-digit', minute: '2-digit'})}</div>
              </div>
              <div class="info-item">
                <div class="info-label">Konum</div>
                <div class="info-value">${manageEventModal.location}</div>
              </div>
              <div class="info-item">
                <div class="info-label">Kategori</div>
                <div class="info-value">${manageEventModal.category || '-'}</div>
              </div>
            </div>
            
            <div class="stats-grid">
              <div class="stat-box">
                <div class="stat-number" style="color: #0f172a;">${participants.length}</div>
                <div class="stat-label">TOPLAM BAŞVURU</div>
              </div>
              <div class="stat-box">
                <div class="stat-number" style="color: #22c55e;">${approvedParticipants.length}</div>
                <div class="stat-label">ONAYLI</div>
              </div>
              <div class="stat-box">
                <div class="stat-number" style="color: #f59e0b;">${pendingParticipants.length}</div>
                <div class="stat-label">BEKLEYEN</div>
              </div>
              <div class="stat-box">
                <div class="stat-number" style="color: #ef4444;">${rejectedParticipants.length}</div>
                <div class="stat-label">REDDEDİLEN</div>
              </div>
            </div>
            
            <h2>Tüm Katılımcılar Listesi</h2>
            <table>
              <tr>
                <th width="5%">#</th>
                <th width="35%">Ad Soyad</th>
                <th width="40%">E-posta</th>
                <th width="20%">Durum</th>
              </tr>
              ${participants.map((p, index) => {
                let statusBadge = '';
                if(p.status === 'approved') statusBadge = '<span class="badge badge-approved">Onaylı</span>';
                else if(p.status === 'pending') statusBadge = '<span class="badge badge-pending">Bekliyor</span>';
                else statusBadge = '<span class="badge badge-rejected">Reddedildi</span>';
                
                return "<tr>" +
                  "<td>" + (index + 1) + "</td>" +
                  "<td><strong>" + (p.profiles?.full_name || 'Bilinmeyen Kullanıcı') + "</strong></td>" +
                  "<td>" + (p.profiles?.email || '-') + "</td>" +
                  "<td>" + statusBadge + "</td>" +
                "</tr>";
              }).join('')}
            </table>
            
            <p style="text-align: center; font-size: 12px; color: #94a3b8; margin-top: 50px;">
              Bu belge KampüsRadar sistemi tarafından otomatik oluşturulmuştur. <br/>
              Oluşturulma Tarihi: ${new Date().toLocaleString('tr-TR')}
            </p>
          </body>
        </html>
      `;

      const { uri } = await Print.printToFileAsync({ html: htmlContent });
      await Sharing.shareAsync(uri, { UTI: '.pdf', mimeType: 'application/pdf', dialogTitle: 'Katılımcı Listesini İndir' });
    } catch (error) {
      setAlertModal({ visible: true, title: 'Hata', message: 'PDF oluşturulurken bir sorun oluştu.', type: 'error' });
    }
  };

  const renderOrganizerTabs = () => (
    <View style={{ flexDirection: 'row', borderBottomWidth: 1, borderBottomColor: colors.backgroundSelected, marginBottom: Spacing.six }}>
      <TouchableOpacity 
        style={[styles.webTabButton, orgTab === 'active' && [styles.webTabButtonActive, { borderBottomColor: colors.text }]]} 
        onPress={() => setOrgTab('active')}
      >
        <ThemedText style={[styles.webTabButtonText, { color: orgTab === 'active' ? colors.text : colors.textSecondary }]}>
          Aktif Etkinlikler ({orgEvents.filter(e => new Date(e.date) >= new Date()).length})
        </ThemedText>
      </TouchableOpacity>
      <TouchableOpacity 
        style={[styles.webTabButton, orgTab === 'past' && [styles.webTabButtonActive, { borderBottomColor: colors.text }]]} 
        onPress={() => setOrgTab('past')}
      >
        <ThemedText style={[styles.webTabButtonText, { color: orgTab === 'past' ? colors.text : colors.textSecondary }]}>
          Geçmiş Etkinlikler ({orgEvents.filter(e => new Date(e.date) < new Date()).length})
        </ThemedText>
      </TouchableOpacity>
    </View>
  );

  const renderEventItem = ({ item }: { item: any }) => {
    return (
      <TouchableOpacity style={[styles.eventItem, { backgroundColor: colors.backgroundElement, borderColor: colors.backgroundSelected }]} onPress={() => router.push(`/event/${item.id}`)} activeOpacity={0.7}>
        <View style={styles.eventItemHeader}>
          <View style={styles.eventCategoryBadge}>
            <ThemedText style={styles.eventCategoryText}>{item.category || 'DİĞER'}</ThemedText>
          </View>
          {item.status === 'approved' && (
            <View style={[styles.statusBadge, { backgroundColor: 'rgba(34, 197, 94, 0.1)' }]}>
              <CheckCircle size={12} color="#22c55e" />
              <ThemedText style={[styles.statusBadgeText, { color: '#22c55e' }]}>SKS Onaylı</ThemedText>
            </View>
          )}
          {item.status === 'pending' && (
            <View style={[styles.statusBadge, { backgroundColor: 'rgba(245, 158, 11, 0.1)' }]}>
              <Clock size={12} color="#f59e0b" />
              <ThemedText style={[styles.statusBadgeText, { color: '#f59e0b' }]}>Bekliyor</ThemedText>
            </View>
          )}
          {item.status === 'rejected' && (
            <View style={[styles.statusBadge, { backgroundColor: 'rgba(239, 68, 68, 0.1)' }]}>
              <XCircle size={12} color="#ef4444" />
              <ThemedText style={[styles.statusBadgeText, { color: '#ef4444' }]}>Red</ThemedText>
            </View>
          )}
        </View>
        <ThemedText style={[styles.eventTitle, { color: colors.text }]} numberOfLines={1}>{item.title}</ThemedText>
        <ThemedText style={[styles.eventMetaText, { color: colors.textSecondary }]} numberOfLines={1}>{item.location} • {new Date(item.date).toLocaleDateString('tr-TR')}</ThemedText>
        
        <TouchableOpacity style={[styles.manageButton, { backgroundColor: 'rgba(2, 132, 199, 0.1)' }]} onPress={() => { setManageEventModal(item); loadParticipants(item.id); }}>
          <Users size={14} color="#0284c7" />
          <ThemedText style={styles.manageButtonText}>Katılımcıları Yönet</ThemedText>
        </TouchableOpacity>
      </TouchableOpacity>
    );
  };
  if (loading || !profile) {
    return (
      <SafeAreaView style={[styles.safeArea, { backgroundColor: colors.background, justifyContent: 'center', alignItems: 'center' }]}>
        <ActivityIndicator size="large" color="#0284c7" />
      </SafeAreaView>
    );
  }

  const filteredEvents = orgEvents.filter(e => orgTab === 'active' ? new Date(e.date) >= new Date() : new Date(e.date) < new Date());

  if (profile?.is_approved === false) {
    return (
      <SafeAreaView style={[styles.safeArea, { backgroundColor: colors.background, justifyContent: 'center', alignItems: 'center', padding: 24 }]} edges={['top']}>
        <View style={{
          backgroundColor: colors.backgroundElement,
          borderWidth: 1,
          borderColor: colors.backgroundSelected,
          borderRadius: 24,
          padding: 24,
          alignItems: 'center',
          width: '100%',
          shadowColor: '#000',
          shadowOffset: { width: 0, height: 10 },
          shadowOpacity: 0.05,
          shadowRadius: 20,
          elevation: 2,
        }}>
          {profile?.rejection_reason ? (
            <>
              <View style={{
                width: 72,
                height: 72,
                borderRadius: 36,
                backgroundColor: 'rgba(239, 68, 68, 0.1)',
                borderWidth: 1,
                borderColor: 'rgba(239, 68, 68, 0.2)',
                justifyContent: 'center',
                alignItems: 'center',
                marginBottom: 16,
              }}>
                <XCircle size={36} color="#ef4444" />
              </View>
              <ThemedText style={{ fontSize: 22, fontWeight: '800', color: colors.text, textAlign: 'center', marginBottom: 12 }}>
                Başvurunuz Reddedildi
              </ThemedText>
              <ThemedText style={{ fontSize: 14, color: colors.textSecondary, textAlign: 'center', lineHeight: 20, marginBottom: 16 }}>
                Hesabınız bağlı olduğunuz üniversitenin Sağlık Kültür ve Spor Daire Başkanlığı (SKS) birimi tarafından incelenmiş ve reddedilmiştir.
              </ThemedText>
              <View style={{
                width: '100%',
                backgroundColor: scheme === 'dark' ? 'rgba(239, 68, 68, 0.1)' : '#fef2f2',
                borderWidth: 1,
                borderColor: scheme === 'dark' ? 'rgba(239, 68, 68, 0.2)' : '#fee2e2',
                borderRadius: 16,
                padding: 16,
                marginBottom: 24,
                alignItems: 'flex-start',
              }}>
                <ThemedText style={{ fontSize: 12, fontWeight: '800', color: '#ef4444', textTransform: 'uppercase', marginBottom: 4 }}>
                  Red Gerekçesi:
                </ThemedText>
                <ThemedText style={{ fontSize: 14, fontWeight: '600', color: scheme === 'dark' ? '#fca5a5' : '#991b1b', lineHeight: 20 }}>
                  {profile.rejection_reason}
                </ThemedText>
              </View>
            </>
          ) : (
            <>
              <View style={{
                width: 72,
                height: 72,
                borderRadius: 36,
                backgroundColor: scheme === 'dark' ? 'rgba(245, 158, 11, 0.1)' : '#fffbeb',
                borderWidth: 1,
                borderColor: scheme === 'dark' ? 'rgba(245, 158, 11, 0.2)' : '#fef3c7',
                justifyContent: 'center',
                alignItems: 'center',
                marginBottom: 16,
              }}>
                <Clock size={36} color="#f59e0b" />
              </View>
              <ThemedText style={{ fontSize: 22, fontWeight: '800', color: colors.text, textAlign: 'center', marginBottom: 12 }}>
                SKS Onayı Bekleniyor
              </ThemedText>
              <ThemedText style={{ fontSize: 14, color: colors.textSecondary, textAlign: 'center', lineHeight: 20, marginBottom: 24 }}>
                Hesabınız bağlı olduğunuz üniversitenin Sağlık Kültür ve Spor Daire Başkanlığı (SKS) birimi tarafından incelenmektedir.
                {"\n\n"}
                Onaylanmanız durumunda sistemde aktif olacak ve etkinlik başvurusu yapabileceksiniz.
              </ThemedText>
            </>
          )}
          <TouchableOpacity 
            style={{ 
              backgroundColor: colors.text, 
              paddingVertical: 14, 
              paddingHorizontal: 24, 
              borderRadius: 12,
              width: '100%',
              alignItems: 'center',
            }}
            onPress={async () => {
              try {
                await signOut();
                router.replace('/');
              } catch (err) {
                console.error("Çıkış hatası:", err);
              }
            }}
          >
            <ThemedText style={{ color: colors.background, fontWeight: '700', fontSize: 15 }}>
              Çıkış Yap ve Geri Dön
            </ThemedText>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={[styles.safeArea, { backgroundColor: colors.background }]} edges={['top']}>
      <FlatList
        data={filteredEvents}
        keyExtractor={item => item.id}
        renderItem={renderEventItem}
        contentContainerStyle={styles.listContent}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor="#0284c7" />}
        ListHeaderComponent={
          <View style={styles.headerContainer}>
            {/* Topluluk Profili Alanı */}
            <View style={[styles.profileCard, { backgroundColor: colors.backgroundElement, borderColor: colors.backgroundSelected }]}>
              <View style={[styles.profileLogoBox, { borderColor: colors.background }]}>
                {profile?.logo_url ? (
                  <Image source={{ uri: profile.logo_url }} style={styles.profileLogo} />
                ) : (
                  <Users size={32} color={colors.textSecondary} />
                )}
              </View>
              <View style={styles.profileInfo}>
                <ThemedText style={[styles.profileName, { color: colors.text }]}>{profile?.full_name || "Organizatör Topluluğu"}</ThemedText>
                <View style={styles.roleBadge}>
                  <BadgeCheck size={14} color="#4f46e5" />
                  <ThemedText style={styles.roleBadgeText}>ORGANİZATÖR</ThemedText>
                </View>
              </View>
            </View>

            <View style={styles.headerSectionRow}>
              <View>
                <ThemedText style={[styles.headerSectionTitle, { color: colors.text }]}>Etkinlik Taleplerimiz</ThemedText>
                <ThemedText style={[styles.headerSectionSubtitle, { color: colors.textSecondary }]}>SKS'ye gönderilen başvurular ve onay durumları.</ThemedText>
              </View>
              
              <TouchableOpacity style={[styles.webCreateButton, { backgroundColor: colors.text }]} onPress={() => setCreateEventModal(true)}>
                <Plus size={20} color={colors.background} />
                <ThemedText style={[styles.webCreateButtonText, { color: colors.background }]}>Yeni Etkinlik Başvurusu</ThemedText>
              </TouchableOpacity>
            </View>

            {renderOrganizerTabs()}
          </View>
        }
        ListEmptyComponent={
          <View style={styles.emptyContainer}>
            <ActivityIndicator size="large" color="#0284c7" animating={loadingOrg} />
            {!loadingOrg && <ThemedText style={{ color: colors.textSecondary, marginTop: Spacing.four }}>Bu kategoride etkinlik bulunamadı.</ThemedText>}
          </View>
        }
      />

      {/* Create Event Modal */}
      <Modal visible={createEventModal} animationType="slide" presentationStyle="pageSheet">
        <SafeAreaView style={styles.modalArea}>
          <View style={[styles.modalHeader, { backgroundColor: colors.backgroundElement }]}>
            <TouchableOpacity onPress={() => setCreateEventModal(false)}><ArrowLeft color={colors.text} size={24} /></TouchableOpacity>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
              <FileText size={20} color={colors.textSecondary} />
              <ThemedText style={[styles.modalTitle, { color: colors.text }]}>Yeni Etkinlik İzin Talebi</ThemedText>
            </View>
            <View style={{ width: 24 }} />
          </View>
          <ScrollView style={[styles.modalScroll, { backgroundColor: colors.background }]} contentContainerStyle={{ paddingBottom: Spacing.eight }}>
            <View style={styles.inputGroup}>
              <ThemedText style={[styles.label, { color: colors.textSecondary }]}>Etkinlik Başlığı</ThemedText>
              <TextInput style={[styles.input, { backgroundColor: colors.backgroundSelected, color: colors.text }]} placeholder="Örn: Blokzincir Teknolojileri Zirvesi" placeholderTextColor={colors.textSecondary} value={newEvent.title} onChangeText={t => setNewEvent({...newEvent, title: t})} />
            </View>
            <View style={styles.inputGroup}>
              <ThemedText style={[styles.label, { color: colors.textSecondary }]}>Kategori</ThemedText>
              <TouchableOpacity 
                style={[styles.input, { backgroundColor: colors.backgroundSelected, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }]} 
                onPress={() => setCategoryMenuVisible(true)}
              >
                <ThemedText style={{ color: colors.text, flex: 1 }}>{newEvent.category || "Kategori Seçiniz"}</ThemedText>
                <ChevronDown size={20} color={colors.textSecondary} />
              </TouchableOpacity>
            </View>
            <View style={[styles.inputGroup, { flexDirection: 'row', gap: Spacing.four }]}>
              <View style={{ flex: 1 }}>
                <ThemedText style={[styles.label, { color: colors.textSecondary }]}>Tarih (YYYY-AA-GG)</ThemedText>
                <TextInput style={[styles.input, { backgroundColor: colors.backgroundSelected, color: colors.text }]} placeholder="2024-10-15" placeholderTextColor={colors.textSecondary} value={newEvent.date} onChangeText={t => setNewEvent({...newEvent, date: t})} />
              </View>
              <View style={{ flex: 1 }}>
                <ThemedText style={[styles.label, { color: colors.textSecondary }]}>Saat (SS:DD)</ThemedText>
                <TextInput style={[styles.input, { backgroundColor: colors.backgroundSelected, color: colors.text }]} placeholder="14:30" placeholderTextColor={colors.textSecondary} value={newEvent.time} onChangeText={t => setNewEvent({...newEvent, time: t})} />
              </View>
            </View>
            <View style={[styles.inputGroup, { flexDirection: 'row', gap: Spacing.four }]}>
              <View style={{ flex: 1.2 }}>
                <ThemedText style={[styles.label, { color: colors.textSecondary }]}>Konum / Salon</ThemedText>
                <TextInput style={[styles.input, { backgroundColor: colors.backgroundSelected, color: colors.text }]} placeholder="Örn: Amfi 1" placeholderTextColor={colors.textSecondary} value={newEvent.location} onChangeText={t => setNewEvent({...newEvent, location: t})} />
              </View>
              <View style={{ flex: 1 }}>
                <ThemedText style={[styles.label, { color: colors.textSecondary }]}>Kapasite (Opsiyonel)</ThemedText>
                <TextInput style={[styles.input, { backgroundColor: colors.backgroundSelected, color: colors.text }]} placeholder="Örn: 150" placeholderTextColor={colors.textSecondary} keyboardType="numeric" value={newEvent.capacity} onChangeText={t => setNewEvent({...newEvent, capacity: t})} />
              </View>
            </View>
            
            <TouchableOpacity 
              style={{ flexDirection: 'row', alignItems: 'center', gap: Spacing.three, marginHorizontal: Spacing.four, marginTop: Spacing.five, padding: Spacing.four, backgroundColor: colors.backgroundElement, borderRadius: Spacing.three, borderWidth: 1, borderColor: colors.backgroundSelected }}
              onPress={() => setNewEvent({...newEvent, requires_approval: !newEvent.requires_approval})}
              activeOpacity={0.8}
            >
              <View style={{ width: 24, height: 24, borderRadius: 6, borderWidth: 2, borderColor: newEvent.requires_approval ? '#0f172a' : colors.textSecondary, backgroundColor: newEvent.requires_approval ? '#0f172a' : 'transparent', alignItems: 'center', justifyContent: 'center' }}>
                {newEvent.requires_approval && <Check size={16} color="#ffffff" />}
              </View>
              <ThemedText style={{ flex: 1, fontSize: 13, fontWeight: '700', color: colors.text }}>
                Katılım Başvuruları Onay Gerektirsin (Kabul Sistemi Aktif)
              </ThemedText>
            </TouchableOpacity>

            <View style={styles.inputGroup}>
              <ThemedText style={[styles.label, { color: colors.textSecondary }]}>Detaylı Açıklama</ThemedText>
              <TextInput style={[styles.input, { backgroundColor: colors.backgroundSelected, color: colors.text, height: 120, textAlignVertical: 'top' }]} placeholder="SKS onay heyetinin görmesi için etkinlik detayları..." placeholderTextColor={colors.textSecondary} multiline value={newEvent.description} onChangeText={t => setNewEvent({...newEvent, description: t})} />
            </View>
            <View style={{ marginHorizontal: Spacing.four, marginTop: Spacing.four }}>
              <ThemedText style={[styles.label, { color: colors.textSecondary }]}>Etkinlik Afişi</ThemedText>
              <ThemedText style={{ fontSize: 11, color: colors.textSecondary, marginBottom: Spacing.two }}>1080x1350 boyutlarında (4:5 oranında) görsel önerilir.</ThemedText>
            </View>
            <TouchableOpacity 
              style={[styles.uploadPosterBtn, { borderColor: colors.backgroundSelected }, newEvent.image_url ? { borderWidth: 0, height: 350, backgroundColor: '#f1f5f9' } : {}]} 
              onPress={() => !newEvent.image_url && setPhotoMenuVisible(true)}
              activeOpacity={newEvent.image_url ? 1 : 0.7}
            >
              {newEvent.image_url ? (
                <View style={{ width: '100%', height: '100%', position: 'relative' }}>
                  <Image source={{ uri: newEvent.image_url }} style={{ width: '100%', height: '100%', resizeMode: 'cover', borderRadius: Spacing.three }} />
                  <TouchableOpacity 
                    style={styles.removePosterBtn} 
                    onPress={() => setNewEvent({...newEvent, image_url: '', base64Image: ''})}
                  >
                    <XCircle size={20} color="#ffffff" />
                  </TouchableOpacity>
                </View>
              ) : (
                <View style={{ alignItems: 'center', gap: 12 }}>
                  <FileText size={48} color={colors.textSecondary} style={{ opacity: 0.5 }} />
                  <ThemedText style={[styles.uploadPosterText, { color: colors.textSecondary }]}>Afiş Görseli Yok</ThemedText>
                  <ThemedText style={{ fontSize: 12, textAlign: 'center', color: colors.textSecondary, paddingHorizontal: 20 }}>Lütfen bir görsel yükleyin veya AI ile saniyeler içinde yeni bir afiş tasarlayın.</ThemedText>
                </View>
              )}
            </TouchableOpacity>

            {!newEvent.image_url && (
              <View style={{ marginHorizontal: Spacing.four, gap: Spacing.three, marginTop: Spacing.two }}>
                <TouchableOpacity style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, paddingVertical: 12, borderWidth: 1, borderColor: '#cbd5e1', borderRadius: 12, backgroundColor: '#ffffff' }} onPress={() => setPhotoMenuVisible(true)}>
                  <UploadCloud size={18} color="#64748b" />
                  <ThemedText style={{ fontSize: 14, fontWeight: '700', color: '#475569' }}>Cihazdan Görsel Seç</ThemedText>
                </TouchableOpacity>
              </View>
            )}

            <View style={{ flexDirection: 'row', gap: Spacing.three, marginHorizontal: Spacing.four, marginTop: Spacing.four, borderTopWidth: 1, borderTopColor: colors.backgroundSelected, paddingTop: Spacing.four }}>
              <TouchableOpacity style={{ flex: 1, height: 50, borderRadius: 12, alignItems: 'center', justifyContent: 'center', backgroundColor: colors.backgroundSelected }} onPress={() => setCreateEventModal(false)}>
                <ThemedText style={{ color: colors.text, fontWeight: '700', fontSize: 15 }}>İptal</ThemedText>
              </TouchableOpacity>
              <TouchableOpacity style={{ flex: 1, height: 50, borderRadius: 12, alignItems: 'center', backgroundColor: '#0f172a', flexDirection: 'row', justifyContent: 'center', gap: 6 }} onPress={handleCreateEvent} disabled={submittingEvent}>
                {submittingEvent && <ActivityIndicator color="#ffffff" size="small" />}
                <ThemedText style={{ color: '#ffffff', fontWeight: '800', fontSize: 13, textAlign: 'center' }}>Talebi SKS'ye Gönder</ThemedText>
              </TouchableOpacity>
            </View>
          </ScrollView>
        </SafeAreaView>
      </Modal>

      {/* Photo Actions Bottom Sheet for Event Poster */}
      <Modal visible={photoMenuVisible} transparent animationType="fade">
        <TouchableOpacity style={styles.bottomSheetOverlay} activeOpacity={1} onPress={() => setPhotoMenuVisible(false)}>
          <TouchableOpacity activeOpacity={1} style={[styles.bottomSheetContainer, { backgroundColor: colors.backgroundElement }]}>
            <View style={[styles.bottomSheetHeader, { borderBottomColor: colors.backgroundSelected }]}>
              <ThemedText style={[styles.bottomSheetTitle, { color: colors.text }]}>Afiş Görseli</ThemedText>
              <TouchableOpacity onPress={() => setPhotoMenuVisible(false)}><XCircle size={24} color={colors.textSecondary} /></TouchableOpacity>
            </View>
            <View style={styles.bottomSheetOptions}>
              <TouchableOpacity style={[styles.bottomSheetOption, { borderBottomColor: colors.backgroundSelected }]} onPress={() => openImagePicker('camera')}>
                <View style={[styles.optionIconBox, { backgroundColor: 'rgba(2, 132, 199, 0.1)' }]}><Camera size={24} color="#0284c7" /></View>
                <ThemedText style={[styles.optionText, { color: colors.text }]}>Kameradan Çek</ThemedText>
              </TouchableOpacity>
              <TouchableOpacity style={[styles.bottomSheetOption, { borderBottomWidth: 0 }]} onPress={() => openImagePicker('gallery')}>
                <View style={[styles.optionIconBox, { backgroundColor: 'rgba(2, 132, 199, 0.1)' }]}><ImageIcon size={24} color="#0284c7" /></View>
                <ThemedText style={[styles.optionText, { color: colors.text }]}>Galeriden Seç</ThemedText>
              </TouchableOpacity>
            </View>
          </TouchableOpacity>
        </TouchableOpacity>
      </Modal>

      {/* Category Selection Bottom Sheet */}
      <Modal visible={categoryMenuVisible} transparent animationType="fade">
        <TouchableOpacity style={styles.bottomSheetOverlay} activeOpacity={1} onPress={() => setCategoryMenuVisible(false)}>
          <TouchableOpacity activeOpacity={1} style={[styles.bottomSheetContainer, { backgroundColor: colors.backgroundElement }]}>
            <View style={[styles.bottomSheetHeader, { borderBottomColor: colors.backgroundSelected }]}>
              <ThemedText style={[styles.bottomSheetTitle, { color: colors.text }]}>Kategori Seçin</ThemedText>
              <TouchableOpacity onPress={() => setCategoryMenuVisible(false)}><XCircle size={24} color={colors.textSecondary} /></TouchableOpacity>
            </View>
            <ScrollView style={{ maxHeight: 300 }}>
              {EVENT_CATEGORIES.map(cat => (
                <TouchableOpacity 
                  key={cat}
                  style={[styles.bottomSheetOption, { borderBottomColor: colors.backgroundSelected, paddingVertical: 16 }]} 
                  onPress={() => {
                    setNewEvent({...newEvent, category: cat});
                    setCategoryMenuVisible(false);
                  }}
                >
                  <ThemedText style={[styles.optionText, { color: colors.text, fontWeight: newEvent.category === cat ? '800' : '600' }]}>{cat}</ThemedText>
                  {newEvent.category === cat && <CheckCircle size={20} color="#0f172a" />}
                </TouchableOpacity>
              ))}
            </ScrollView>
          </TouchableOpacity>
        </TouchableOpacity>
      </Modal>

      {/* Manage Event Participants Modal */}
      <Modal visible={!!manageEventModal} animationType="slide">
        <SafeAreaView style={styles.modalArea}>
          <View style={[styles.modalHeader, { backgroundColor: colors.backgroundElement }]}>
            <TouchableOpacity onPress={() => setManageEventModal(null)}><ArrowLeft color={colors.text} size={24} /></TouchableOpacity>
            <ThemedText style={[styles.modalTitle, { color: colors.text }]} numberOfLines={1}>{manageEventModal?.title}</ThemedText>
            <View style={{ width: 24 }} />
          </View>
          <View style={[styles.modalScroll, { backgroundColor: colors.background }]}>
            {loadingParticipants ? <ActivityIndicator color="#38bdf8" style={{ marginTop: 40 }} /> : (
              <FlatList
                data={participants}
                keyExtractor={p => p.id}
                contentContainerStyle={{ padding: 20 }}
                ListHeaderComponent={
                  <View style={styles.manageEventHeader}>
                    <View style={styles.statsRow}>
                      <View style={styles.statBox}>
                        <ThemedText style={styles.statNumber}>{participants.length}</ThemedText>
                        <ThemedText style={styles.statLabel}>Toplam</ThemedText>
                      </View>
                      <View style={styles.statBox}>
                        <ThemedText style={[styles.statNumber, { color: '#22c55e' }]}>{participants.filter(p => p.status === 'approved').length}</ThemedText>
                        <ThemedText style={styles.statLabel}>Onaylı</ThemedText>
                      </View>
                      <View style={styles.statBox}>
                        <ThemedText style={[styles.statNumber, { color: '#f59e0b' }]}>{participants.filter(p => p.status === 'pending').length}</ThemedText>
                        <ThemedText style={styles.statLabel}>Bekleyen</ThemedText>
                      </View>
                    </View>
                    <TouchableOpacity style={styles.downloadPdfBtn} onPress={handleDownloadPDF}>
                      <Download size={20} color="#ffffff" />
                      <ThemedText style={styles.downloadPdfBtnText}>Katılımcı Listesini İndir (PDF)</ThemedText>
                    </TouchableOpacity>
                  </View>
                }
                renderItem={({ item }) => (
                  <View style={[styles.participantItem, { backgroundColor: colors.backgroundElement, borderColor: colors.backgroundSelected }]}>
                    <View style={{ flex: 1 }}>
                      <ThemedText style={[styles.participantName, { color: colors.text }]}>{item.profiles?.full_name}</ThemedText>
                      <ThemedText style={[styles.participantEmail, { color: colors.textSecondary }]}>{item.profiles?.email}</ThemedText>
                    </View>
                    <View style={styles.actionButtons}>
                      {item.status !== 'approved' && (
                        <TouchableOpacity style={[styles.actionBtn, { backgroundColor: '#22c55e' }]} onPress={() => updateParticipantStatus(item.id, 'approved')}><CheckCircle size={16} color="#fff" /></TouchableOpacity>
                      )}
                      {item.status !== 'rejected' && (
                        <TouchableOpacity style={[styles.actionBtn, { backgroundColor: '#ef4444' }]} onPress={() => updateParticipantStatus(item.id, 'rejected')}><XCircle size={16} color="#fff" /></TouchableOpacity>
                      )}
                    </View>
                  </View>
                )}
                ListEmptyComponent={<ThemedText style={{ color: colors.textSecondary, textAlign: 'center' }}>Katılımcı bulunamadı.</ThemedText>}
              />
            )}
          </View>
        </SafeAreaView>
      </Modal>

      {/* Alert Modal */}
      <Modal visible={alertModal.visible} transparent animationType="fade">
        <View style={styles.alertOverlay}>
          <View style={styles.alertBox}>
            <View style={[styles.alertIconContainer, { backgroundColor: alertModal.type === 'success' ? '#dcfce7' : '#fee2e2' }]}>
              {alertModal.type === 'success' ? <CheckCircle size={32} color="#22c55e" /> : <XCircle size={32} color="#ef4444" />}
            </View>
            <ThemedText style={styles.alertTitle}>{alertModal.title}</ThemedText>
            <ThemedText style={styles.alertMessage}>{alertModal.message}</ThemedText>
            <TouchableOpacity style={styles.alertButton} onPress={() => setAlertModal({ ...alertModal, visible: false })}><ThemedText style={styles.alertButtonText}>Tamam</ThemedText></TouchableOpacity>
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: { flex: 1 },
  listContent: { paddingHorizontal: Spacing.four, paddingBottom: Spacing.four, flexGrow: 1 },
  headerContainer: { paddingTop: Spacing.four },
  
  // Web-like Topluluk Profili Alanı
  profileCard: { flexDirection: 'row', alignItems: 'center', padding: Spacing.five, borderRadius: 24, borderWidth: 1, marginBottom: Spacing.six, shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.05, shadowRadius: 8, elevation: 2 },
  profileLogoBox: { width: 72, height: 72, borderRadius: 36, borderWidth: 4, overflow: 'hidden', alignItems: 'center', justifyContent: 'center', backgroundColor: '#f1f5f9', marginRight: Spacing.five },
  profileLogo: { width: '100%', height: '100%', resizeMode: 'cover' },
  profileInfo: { flex: 1 },
  profileName: { fontSize: 20, fontWeight: '800', marginBottom: 6 },
  roleBadge: { alignSelf: 'flex-start', flexDirection: 'row', alignItems: 'center', gap: 4, backgroundColor: '#eef2ff', paddingHorizontal: 10, paddingVertical: 4, borderRadius: 6, borderWidth: 1, borderColor: '#e0e7ff' },
  roleBadgeText: { color: '#4f46e5', fontSize: 11, fontWeight: '800', letterSpacing: 0.5 },
  
  // Web-like Header Row
  headerSectionRow: { flexDirection: 'column', marginBottom: Spacing.six, gap: Spacing.four },
  headerSectionTitle: { fontSize: 24, fontWeight: '800', marginBottom: 4 },
  headerSectionSubtitle: { fontSize: 14 },
  webCreateButton: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, paddingVertical: 14, paddingHorizontal: 20, borderRadius: 16, alignSelf: 'stretch', shadowColor: '#000', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.1, shadowRadius: 8, elevation: 3 },
  webCreateButtonText: { fontWeight: '800', fontSize: 15 },
  
  // Web-like Tabs
  webTabButton: { paddingVertical: 12, paddingHorizontal: 16, borderBottomWidth: 2, borderBottomColor: 'transparent', marginRight: Spacing.two },
  webTabButtonActive: { borderBottomWidth: 2 },
  webTabButtonText: { fontSize: 14, fontWeight: '700' },

  eventItem: { borderRadius: 24, padding: Spacing.five, marginBottom: Spacing.four, borderWidth: 1, shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.03, shadowRadius: 4, elevation: 1 },
  eventItemHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: Spacing.two },
  eventCategoryBadge: { backgroundColor: '#f1f5f9', paddingHorizontal: 8, paddingVertical: 4, borderRadius: 12 },
  eventCategoryText: { fontSize: 10, fontWeight: '800', color: '#64748b' },
  statusBadge: { flexDirection: 'row', alignItems: 'center', gap: 4, paddingHorizontal: 8, paddingVertical: 4, borderRadius: 12 },
  statusBadgeText: { fontSize: 10, fontWeight: '800' },
  eventTitle: { fontSize: 16, fontWeight: '700', marginBottom: 4 },
  eventMetaText: { fontSize: 13, marginBottom: Spacing.three },
  manageButton: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6, paddingVertical: 8, borderRadius: 8, marginTop: Spacing.two },
  manageButtonText: { color: '#0284c7', fontSize: 13, fontWeight: '700' },
  emptyContainer: { flex: 1, alignItems: 'center', justifyContent: 'center', paddingTop: Spacing.six },
  modalArea: { flex: 1 },
  modalHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', padding: Spacing.four, borderBottomWidth: 1, borderBottomColor: '#e2e8f0' },
  modalTitle: { fontSize: 18, fontWeight: '800' },
  modalScroll: { flex: 1 },
  inputGroup: { paddingHorizontal: Spacing.four, paddingTop: Spacing.four },
  label: { fontSize: 14, fontWeight: '700', marginBottom: Spacing.two },
  input: { borderWidth: 1, borderColor: '#e2e8f0', borderRadius: Spacing.two, padding: Spacing.three, fontSize: 15 },
  uploadPosterBtn: { margin: Spacing.four, height: 160, borderWidth: 2, borderStyle: 'dashed', borderRadius: Spacing.three, alignItems: 'center', justifyContent: 'center' },
  uploadPosterText: { marginTop: Spacing.two, fontWeight: '600' },
  posterPreview: { width: '100%', height: '100%', borderRadius: Spacing.three },
  removePosterBtn: { position: 'absolute', top: 12, right: 12, backgroundColor: 'rgba(15, 23, 42, 0.7)', width: 36, height: 36, borderRadius: 18, alignItems: 'center', justifyContent: 'center' },
  submitBtn: { backgroundColor: '#0f172a', margin: Spacing.four, padding: Spacing.four, borderRadius: Spacing.three, alignItems: 'center' },
  submitBtnText: { color: '#ffffff', fontWeight: '800', fontSize: 16 },
  categoryPill: { paddingHorizontal: 16, paddingVertical: 10, borderRadius: 20, borderWidth: 1, borderColor: '#cbd5e1', backgroundColor: '#f8fafc' },
  categoryPillText: { fontSize: 14, fontWeight: '700', color: '#64748b' },
  manageEventHeader: { marginBottom: Spacing.six },
  statsRow: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: Spacing.four },
  statBox: { flex: 1, backgroundColor: '#ffffff', padding: Spacing.four, borderRadius: 16, alignItems: 'center', borderWidth: 1, borderColor: '#e2e8f0', marginHorizontal: 4, shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.03, shadowRadius: 4, elevation: 1 },
  statNumber: { fontSize: 24, fontWeight: '800', color: '#0f172a' },
  statLabel: { fontSize: 11, fontWeight: '800', color: '#64748b', marginTop: 4, letterSpacing: 0.5 },
  downloadPdfBtn: { flexDirection: 'row', justifyContent: 'center', alignItems: 'center', gap: 10, backgroundColor: '#0f172a', paddingVertical: 16, borderRadius: 16, marginHorizontal: 4, shadowColor: '#000', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.1, shadowRadius: 8, elevation: 3 },
  downloadPdfBtnText: { color: '#ffffff', fontWeight: '800', fontSize: 15 },
  participantItem: { padding: Spacing.four, borderRadius: Spacing.three, marginBottom: Spacing.three, flexDirection: 'row', alignItems: 'center', borderWidth: 1 },
  participantName: { fontSize: 16, fontWeight: '700', marginBottom: 2 },
  participantEmail: { fontSize: 13 },
  actionButtons: { flexDirection: 'row', gap: Spacing.two },
  actionBtn: { width: 36, height: 36, borderRadius: 18, alignItems: 'center', justifyContent: 'center' },
  alertOverlay: { flex: 1, backgroundColor: 'rgba(15, 23, 42, 0.4)', justifyContent: 'center', alignItems: 'center', padding: Spacing.four },
  alertBox: { backgroundColor: '#ffffff', width: '100%', borderRadius: Spacing.four, padding: Spacing.five, alignItems: 'center', borderWidth: 1, borderColor: '#e2e8f0' },
  alertIconContainer: { width: 64, height: 64, borderRadius: 32, alignItems: 'center', justifyContent: 'center', marginBottom: Spacing.four },
  alertTitle: { fontSize: 20, fontWeight: '800', color: '#0f172a', marginBottom: Spacing.two },
  alertMessage: { fontSize: 14, color: '#475569', textAlign: 'center', marginBottom: Spacing.five },
  alertButton: { backgroundColor: '#0284c7', paddingVertical: Spacing.three, paddingHorizontal: Spacing.six, borderRadius: Spacing.three, width: '100%', alignItems: 'center' },
  alertButtonText: { color: '#ffffff', fontWeight: '800', fontSize: 16 },
  bottomSheetOverlay: { flex: 1, backgroundColor: 'rgba(15, 23, 42, 0.4)', justifyContent: 'flex-end' },
  bottomSheetContainer: { borderTopLeftRadius: 24, borderTopRightRadius: 24, padding: Spacing.five, paddingBottom: Platform.OS === 'ios' ? 40 : Spacing.five },
  bottomSheetHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: Spacing.four, paddingBottom: Spacing.three, borderBottomWidth: 1 },
  bottomSheetTitle: { fontSize: 18, fontWeight: '800' },
  bottomSheetOptions: { gap: Spacing.two },
  bottomSheetOption: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingVertical: Spacing.three, paddingHorizontal: Spacing.two, borderBottomWidth: 1 },
  optionIconBox: { width: 40, height: 40, borderRadius: 20, alignItems: 'center', justifyContent: 'center', marginRight: Spacing.three },
  optionText: { fontSize: 16, fontWeight: '600' },
});
