import React, { useState, useEffect } from 'react';
import { StyleSheet, View, FlatList, ActivityIndicator, TouchableOpacity, RefreshControl, Modal, TextInput, Alert, Image, ScrollView, Platform } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { User, Mail, School, Shield, Bookmark, CheckCircle, Clock, XCircle, LogOut, MapPin, Calendar as CalendarIcon, Edit3, Trash2, Plus, ArrowLeft, UploadCloud, Users, BadgeCheck, Camera, Image as ImageIcon, AlertCircle, Sun, Moon, Monitor, ChevronDown } from 'lucide-react-native';

import { ThemedText } from '@/components/themed-text';
import { EventCard } from '@/components/ui/EventCard';
import { useAuth } from '@/context/AuthContext';
import { supabase } from '@/lib/supabaseClient';
import { Colors, Spacing } from '@/constants/theme';
import { useColorScheme } from '@/hooks/use-color-scheme';
import { useRouter } from 'expo-router';
import * as ImagePicker from 'expo-image-picker';
import { decode } from 'base64-arraybuffer';
import { LinearGradient } from 'expo-linear-gradient';
import { useThemeContext } from '@/context/ThemeContext';

export default function ProfileScreen() {
  const { user, profile, signOut, fetchProfile } = useAuth();
  const scheme = useColorScheme();
  const colors = Colors[scheme === 'dark' ? 'dark' : 'light'];
  const router = useRouter();
  const { themeMode, setThemeMode } = useThemeContext();

  const [uniName, setUniName] = useState<string>('');
  
  // Student States
  const [activeTab, setActiveTab] = useState<'joined' | 'saved'>('joined');
  const [savedEvents, setSavedEvents] = useState<any[]>([]);
  const [loadingSaved, setLoadingSaved] = useState(false);
  const [joinedEvents, setJoinedEvents] = useState<any[]>([]);
  const [loadingJoined, setLoadingJoined] = useState(false);

  // Organizer States
  const [orgEvents, setOrgEvents] = useState<any[]>([]);
  const [orgTab, setOrgTab] = useState<'active' | 'past'>('active');
  const [loadingOrg, setLoadingOrg] = useState(false);
  
  // Modals
  const [createEventModal, setCreateEventModal] = useState(false);
  const [manageEventModal, setManageEventModal] = useState<any>(null);
  const [participants, setParticipants] = useState<any[]>([]);
  const [loadingParticipants, setLoadingParticipants] = useState(false);

  // Form State
  const [newEvent, setNewEvent] = useState({
    title: '', category: '', date: '', time: '12:00', location: '', description: '', capacity: '', image_url: '', base64Image: ''
  });
  const [submittingEvent, setSubmittingEvent] = useState(false);

  const [refreshing, setRefreshing] = useState(false);
  const [uploadingLogo, setUploadingLogo] = useState(false);
  const [photoMenuVisible, setPhotoMenuVisible] = useState(false);
  const [photoMenuType, setPhotoMenuType] = useState<'profile' | 'event'>('profile');
  const [themeMenuVisible, setThemeMenuVisible] = useState(false);
  const [alertModal, setAlertModal] = useState({ visible: false, title: '', message: '', type: 'success' });
  const [confirmModal, setConfirmModal] = useState({
    visible: false,
    title: '',
    message: '',
    confirmText: 'Onayla',
    cancelText: 'Vazgeç',
    type: 'danger',
    onConfirm: () => {}
  });

  useEffect(() => {
    async function loadUniversity() {
      if (!profile?.university_id) return;
      try {
        const { data } = await supabase
          .from('universities')
          .select('name')
          .eq('id', profile.university_id)
          .single();
        if (data) setUniName(data.name);
      } catch (err) {
        console.error(err);
      }
    }
    loadUniversity();
  }, [profile]);

  const loadStudentEvents = async () => {
    if (!user || profile?.role !== 'student') return;
    try {
      setLoadingSaved(true);
      setLoadingJoined(true);
      
      const [saved, joined] = await Promise.all([
        supabase.from('saved_events').select(`id, event_id, events (id, title, category, date, location, description, status, universities(name, logo_url), profiles:organizer_id(full_name, logo_url))`).eq('student_id', user.id),
        supabase.from('event_participants').select(`id, status, event_id, events (id, title, category, date, location, description, status, universities(name, logo_url), profiles:organizer_id(full_name, logo_url))`).eq('student_id', user.id)
      ]);

      const formatEvent = (i: any, isJoined: boolean) => ({
        id: i.events.id, 
        title: i.events.title, 
        category: i.events.category || 'DİĞER',
        date: i.events.date ? new Date(i.events.date).toLocaleDateString('tr-TR', { day: 'numeric', month: 'short' }) : '',
        location: i.events.location, 
        description: i.events.description || '',
        university: i.events.universities?.name || 'Belirtilmemiş',
        universityLogo: i.events.universities?.logo_url,
        organizer: i.events.profiles?.full_name || 'Bilinmeyen Organizatör',
        organizerLogo: i.events.profiles?.logo_url,
        status: isJoined ? i.status : i.events.status,
        participantId: isJoined ? i.id : null,
        savedId: !isJoined ? i.id : null
      });

      const formattedSaved = (saved.data || []).filter((i: any) => i.events).map((i: any) => formatEvent(i, false));
      const formattedJoined = (joined.data || []).filter((i: any) => i.events).map((i: any) => formatEvent(i, true));

      setSavedEvents(formattedSaved);
      setJoinedEvents(formattedJoined);
    } finally {
      setLoadingSaved(false);
      setLoadingJoined(false);
    }
  };

  const loadOrganizerEvents = async () => {
    if (!user || profile?.role !== 'organizer') return;
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
    if (profile?.role === 'student') loadStudentEvents();
    if (profile?.role === 'organizer') loadOrganizerEvents();
  }, [user, profile]);

  const onRefresh = async () => {
    setRefreshing(true);
    if (profile?.role === 'student') await loadStudentEvents();
    if (profile?.role === 'organizer') await loadOrganizerEvents();
    setRefreshing(false);
  };

  const handleToggleSaveProfile = async (eventId: string | number) => {
    if (!user) return;
    try {
      const isCurrentlySaved = savedEvents.some(e => e.id === eventId);
      if (isCurrentlySaved) {
        await supabase.from('saved_events').delete().eq('student_id', user.id).eq('event_id', eventId);
        setSavedEvents(prev => prev.filter(e => e.id !== eventId));
      } else {
        await supabase.from('saved_events').insert({ student_id: user.id, event_id: eventId });
        loadStudentEvents(); // reload to get full event details if needed
      }
    } catch (e) {
      console.error("Toggle save error:", e);
    }
  };

  const handlePickImage = (type: 'profile' | 'event') => {
    setPhotoMenuType(type);
    setPhotoMenuVisible(true);
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
      result = await ImagePicker.launchCameraAsync({
        allowsEditing: true,
        aspect: photoMenuType === 'profile' ? [1, 1] : undefined,
        quality: 0.5,
        base64: true,
      });
    } else {
      const permissionResult = await ImagePicker.requestMediaLibraryPermissionsAsync();
      if (!permissionResult.granted) {
        setAlertModal({ visible: true, title: "Erişim Reddedildi", message: "Fotoğraf yüklemek için galeri erişimine izin vermelisiniz.", type: "error" });
        return;
      }
      result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ['images'],
        allowsEditing: true,
        aspect: photoMenuType === 'profile' ? [1, 1] : undefined,
        quality: 0.5,
        base64: true,
      });
    }

    if (!result.canceled && result.assets[0].base64) {
      if (photoMenuType === 'profile') {
        uploadProfilePhoto(result.assets[0].base64, result.assets[0].uri);
      } else {
        setNewEvent(prev => ({ ...prev, image_url: result.assets[0].uri, base64Image: result.assets[0].base64 || '' }));
      }
    }
  };

  const uploadProfilePhoto = async (base64String: string, uri: string) => {
    if (!user) return;
    try {
      setUploadingLogo(true);
      const isStudent = profile?.role === 'student';
      const folder = isStudent ? 'avatars' : 'logos';
      const fileExt = uri.split('.').pop() || 'jpg';
      const fileName = `${isStudent ? 'avatar' : 'logo'}_${user.id}_${Date.now()}.${fileExt}`;
      const filePath = `${folder}/${fileName}`;

      const { error: uploadError } = await supabase.storage
        .from('public-assets')
        .upload(filePath, decode(base64String), { contentType: `image/${fileExt}` });

      if (uploadError) throw uploadError;

      const { data: publicUrlData } = supabase.storage.from('public-assets').getPublicUrl(filePath);

      // Force cache bust by appending timestamp
      const newUrl = `${publicUrlData.publicUrl}?t=${Date.now()}`;
      await supabase.from('profiles').update({ logo_url: newUrl }).eq('id', user.id);
      
      setAlertModal({ visible: true, title: 'Başarılı', message: 'Profil fotoğrafınız güncellendi.', type: 'success' });
      fetchProfile();
      onRefresh(); // Refresh everything
    } catch (err: any) {
      setAlertModal({ visible: true, title: 'Hata', message: 'Fotoğraf yüklenirken bir hata oluştu: ' + err.message, type: 'error' });
    } finally {
      setUploadingLogo(false);
    }
  };

  const handleRemoveProfilePhoto = () => {
    setPhotoMenuVisible(false);
    setConfirmModal({
      visible: true,
      title: "Fotoğrafı Kaldır",
      message: "Profil fotoğrafınızı kaldırmak istediğinize emin misiniz?",
      confirmText: "Kaldır",
      cancelText: "Vazgeç",
      type: "danger",
      onConfirm: async () => {
        try {
          setUploadingLogo(true);
          await supabase.from('profiles').update({ logo_url: null }).eq('id', user?.id);
          setAlertModal({ visible: true, title: "Başarılı", message: "Fotoğraf kaldırıldı.", type: "success" });
          fetchProfile();
          onRefresh();
        } catch (e) {
          setAlertModal({ visible: true, title: "Hata", message: "Silinemedi.", type: "error" });
        } finally {
          setUploadingLogo(false);
        }
      }
    });
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

        const { error: uploadError } = await supabase.storage
          .from('public-assets')
          .upload(filePath, decode(newEvent.base64Image), { contentType: `image/${fileExt}` });

        if (uploadError) throw uploadError;
        const { data: publicUrlData } = supabase.storage.from('public-assets').getPublicUrl(filePath);
        finalImageUrl = publicUrlData.publicUrl;
      }

      const combinedDate = `${newEvent.date}T${newEvent.time}:00`;
      
      const { error } = await supabase.from('events').insert([{
        title: newEvent.title,
        category: newEvent.category || 'Diğer',
        date: combinedDate,
        location: newEvent.location,
        description: newEvent.description,
        capacity: newEvent.capacity ? parseInt(newEvent.capacity, 10) : null,
        image_url: finalImageUrl,
        university_id: profile?.university_id,
        organizer_id: user?.id,
        status: 'pending'
      }]);

      if (error) throw error;
      
      setAlertModal({ visible: true, title: 'Başarılı', message: 'Etkinlik başarıyla oluşturuldu ve SKS onayına gönderildi.', type: 'success' });
      setCreateEventModal(false);
      setNewEvent({ title: '', category: '', date: '', time: '12:00', location: '', description: '', capacity: '', image_url: '', base64Image: '' });
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
      const { data, error } = await supabase
        .from('event_participants')
        .select(`id, status, joined_at, profiles:student_id(full_name, email)`)
        .eq('event_id', eventId)
        .order('joined_at', { ascending: false });
        
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

  const getRoleLabel = (role: string) => {
    switch (role) {
      case 'student': return 'Öğrenci';
      case 'organizer': return 'Organizatör';
      case 'sks': return 'SKS Yetkilisi';
      default: return 'Kullanıcı';
    }
  };

  // ===================== UI COMPONENTS =====================

  const renderProfileHeader = () => (
    <View style={[styles.profileHeaderContainer, { backgroundColor: colors.backgroundElement, borderColor: colors.backgroundSelected }]}>
      <TouchableOpacity 
        style={styles.avatarContainer} 
        onPress={() => handlePickImage('profile')}
        onLongPress={handleRemoveProfilePhoto}
        disabled={uploadingLogo}
      >
        {uploadingLogo ? (
          <ActivityIndicator color="#0f172a" />
        ) : profile?.logo_url ? (
          <Image source={{ uri: profile.logo_url }} style={styles.avatarImage} />
        ) : (
          <ThemedText style={styles.avatarText}>
            {profile?.full_name 
              ? profile.full_name.split(' ').filter(Boolean).map((n: string) => n[0]).join('').substring(0, 2).toUpperCase()
              : user?.email?.[0].toUpperCase()}
          </ThemedText>
        )}
        <View style={styles.editIconBadge}>
          <Edit3 size={14} color="#fff" />
        </View>
      </TouchableOpacity>

      <ThemedText style={[styles.userName, { color: colors.text }]}>{profile?.full_name || 'Yükleniyor...'}</ThemedText>
      
      <View style={styles.roleBadge}>
        <BadgeCheck size={14} color="#38bdf8" />
        <ThemedText style={styles.roleBadgeText}>{getRoleLabel(profile?.role || '')}</ThemedText>
      </View>

      <View style={styles.infoList}>
        <View style={styles.infoRow}>
          <Mail size={16} color="#94a3b8" />
          <ThemedText style={styles.infoText}>{user?.email}</ThemedText>
        </View>
        <View style={styles.infoRow}>
          <School size={16} color="#94a3b8" />
          <ThemedText style={styles.infoText}>{uniName || 'Yükleniyor...'}</ThemedText>
        </View>
      </View>

      <View style={styles.settingsSection}>
        <TouchableOpacity 
          style={[styles.settingRow, { backgroundColor: scheme === 'dark' ? 'rgba(255,255,255,0.05)' : '#f8fafc' }]} 
          onPress={() => setThemeMenuVisible(true)}
        >
          <View style={styles.settingRowLeft}>
            <View style={[styles.settingIconBox, { backgroundColor: scheme === 'dark' ? 'rgba(255,255,255,0.1)' : '#e2e8f0' }]}>
              {themeMode === 'light' ? <Sun size={18} color={colors.text} /> : themeMode === 'dark' ? <Moon size={18} color={colors.text} /> : <Monitor size={18} color={colors.text} />}
            </View>
            <ThemedText style={[styles.settingLabel, { color: colors.text }]}>Görünüm Ayarları</ThemedText>
          </View>
          <View style={styles.settingRowRight}>
            <ThemedText style={[styles.settingValue, { color: colors.textSecondary }]}>
              {themeMode === 'light' ? 'Açık' : themeMode === 'dark' ? 'Koyu' : 'Sistem'}
            </ThemedText>
            <ChevronDown size={18} color={colors.textSecondary} style={{ transform: [{ rotate: '-90deg' }] }} />
          </View>
        </TouchableOpacity>
      </View>

      <TouchableOpacity style={[styles.logoutButton, { backgroundColor: scheme === 'dark' ? 'rgba(239, 68, 68, 0.1)' : '#fef2f2' }]} onPress={signOut}>
        <LogOut size={16} color="#ef4444" />
        <ThemedText style={styles.logoutButtonText}>Çıkış Yap</ThemedText>
      </TouchableOpacity>
    </View>
  );

  const renderStudentTabs = () => (
    <View style={[styles.tabsContainer, { backgroundColor: colors.background, borderColor: colors.backgroundSelected }]}>
      <TouchableOpacity 
        style={[styles.tabButton, activeTab === 'joined' && { backgroundColor: colors.backgroundElement, elevation: 1 }]}
        onPress={() => setActiveTab('joined')}
      >
        <CheckCircle size={18} color={activeTab === 'joined' ? '#0284c7' : colors.textSecondary} />
        <ThemedText style={[styles.tabButtonText, { color: colors.textSecondary }, activeTab === 'joined' && { color: colors.text }]}>
          Katıldıklarım ({joinedEvents.length})
        </ThemedText>
      </TouchableOpacity>
      
      <TouchableOpacity 
        style={[styles.tabButton, activeTab === 'saved' && { backgroundColor: colors.backgroundElement, elevation: 1 }]}
        onPress={() => setActiveTab('saved')}
      >
        <Bookmark size={18} color={activeTab === 'saved' ? '#0284c7' : colors.textSecondary} />
        <ThemedText style={[styles.tabButtonText, { color: colors.textSecondary }, activeTab === 'saved' && { color: colors.text }]}>
          Kaydettiklerim ({savedEvents.length})
        </ThemedText>
      </TouchableOpacity>
    </View>
  );

  const renderOrganizerTabs = () => (
    <View style={styles.tabsContainer}>
      <TouchableOpacity 
        style={[styles.tabButton, orgTab === 'active' && styles.tabButtonActive]}
        onPress={() => setOrgTab('active')}
      >
        <CheckCircle size={18} color={orgTab === 'active' ? '#0284c7' : '#94a3b8'} />
        <ThemedText style={[styles.tabButtonText, orgTab === 'active' && styles.tabButtonTextActive]}>
          Aktif 
        </ThemedText>
      </TouchableOpacity>
      <TouchableOpacity 
        style={[styles.tabButton, orgTab === 'past' && styles.tabButtonActive]}
        onPress={() => setOrgTab('past')}
      >
        <Clock size={18} color={orgTab === 'past' ? '#0284c7' : '#94a3b8'} />
        <ThemedText style={[styles.tabButtonText, orgTab === 'past' && styles.tabButtonTextActive]}>
          Geçmiş 
        </ThemedText>
      </TouchableOpacity>
    </View>
  );

  const renderEventItem = ({ item }: { item: any }) => {
    if (profile?.role === 'student') {
      const isSaved = savedEvents.some(se => se.id === item.id);
      return (
        <View style={{ marginBottom: Spacing.three }}>
          <EventCard 
            event={item}
            isSaved={isSaved}
            onToggleSave={handleToggleSaveProfile}
            hideSave={activeTab === 'joined'}
            showStatus={activeTab === 'joined'}
          />
        </View>
      );
    }

    return (
      <TouchableOpacity 
        style={styles.eventItem} 
        onPress={() => router.push(`/event/${item.id}`)}
        activeOpacity={0.7}
      >
        <View style={styles.eventItemHeader}>
          <View style={styles.eventCategoryBadge}>
            <ThemedText style={styles.eventCategoryText}>{item.category || 'DİĞER'}</ThemedText>
          </View>
          {item.status === 'approved' && (
            <View style={[styles.statusBadge, { backgroundColor: 'rgba(34, 197, 94, 0.1)' }]}>
              <CheckCircle size={12} color="#22c55e" />
              <ThemedText style={[styles.statusBadgeText, { color: '#22c55e' }]}>Onaylı</ThemedText>
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
        <ThemedText style={styles.eventTitle} numberOfLines={1}>{item.title}</ThemedText>
        <View style={styles.eventMetaRow}>
          <View style={styles.eventMetaItem}>
            <School size={12} color="#38bdf8" />
            <ThemedText style={styles.eventMetaText} numberOfLines={1}>{item.university || profile?.full_name}</ThemedText>
          </View>
        </View>
        
        {profile?.role === 'organizer' && (
          <TouchableOpacity 
            style={styles.manageButton}
            onPress={() => {
              setManageEventModal(item);
              loadParticipants(item.id);
            }}
          >
            <Users size={14} color="#0284c7" />
            <ThemedText style={styles.manageButtonText}>Katılımcıları Yönet</ThemedText>
          </TouchableOpacity>
        )}
      </TouchableOpacity>
    );
  };

  return (
    <SafeAreaView style={[styles.safeArea, { backgroundColor: colors.background }]}>
      <FlatList
        data={profile?.role === 'student' ? (activeTab === 'joined' ? joinedEvents : savedEvents) : orgEvents.filter(e => orgTab === 'active' ? new Date(e.date) >= new Date() : new Date(e.date) < new Date())}
        keyExtractor={item => item.id}
        renderItem={renderEventItem}
        contentContainerStyle={styles.listContent}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor="#38bdf8" />}
        ListHeaderComponent={
          <>
            {renderProfileHeader()}
            
            {profile?.role === 'organizer' && (
              <View style={styles.organizerActions}>
                <TouchableOpacity style={[styles.createEventButton, { backgroundColor: colors.backgroundSelected }]} onPress={() => setCreateEventModal(true)}>
                  <Plus size={20} color={colors.text} />
                  <ThemedText style={[styles.createEventButtonText, { color: colors.text }]}>Yeni Etkinlik Başvurusu</ThemedText>
                </TouchableOpacity>
                {renderOrganizerTabs()}
              </View>
            )}

            {profile?.role === 'student' && renderStudentTabs()}
          </>
        }
        ListEmptyComponent={
          <View style={styles.emptyContainer}>
            <ActivityIndicator size="large" color="#38bdf8" animating={loadingJoined || loadingSaved || loadingOrg} />
            {!(loadingJoined || loadingSaved || loadingOrg) && (
              <ThemedText style={{ color: '#64748b', marginTop: Spacing.four }}>Listelenecek etkinlik bulunamadı.</ThemedText>
            )}
          </View>
        }
      />

      {/* Organizer Create Event Modal */}
      <Modal visible={createEventModal} animationType="slide" presentationStyle="pageSheet">
        <SafeAreaView style={styles.modalArea}>
          <View style={[styles.modalHeader, { backgroundColor: colors.backgroundElement }]}>
            <TouchableOpacity onPress={() => setCreateEventModal(false)}><ArrowLeft color={colors.text} size={24} /></TouchableOpacity>
            <ThemedText style={[styles.modalTitle, { color: colors.text }]}>Yeni Etkinlik</ThemedText>
            <View style={{ width: 24 }} />
          </View>
          <ScrollView style={[styles.modalScroll, { backgroundColor: colors.background }]}>
            <View style={styles.inputGroup}>
              <ThemedText style={[styles.label, { color: colors.textSecondary }]}>Etkinlik Başlığı</ThemedText>
              <TextInput style={[styles.input, { backgroundColor: colors.backgroundSelected, color: colors.text }]} placeholder="Örn: Yapay Zeka Zirvesi" placeholderTextColor={colors.textSecondary} value={newEvent.title} onChangeText={t => setNewEvent({...newEvent, title: t})} />
            </View>
            <View style={styles.inputGroup}>
              <ThemedText style={[styles.label, { color: colors.textSecondary }]}>Tarih (YYYY-AA-GG)</ThemedText>
              <TextInput style={[styles.input, { backgroundColor: colors.backgroundSelected, color: colors.text }]} placeholder="2024-10-15" placeholderTextColor={colors.textSecondary} value={newEvent.date} onChangeText={t => setNewEvent({...newEvent, date: t})} />
            </View>
            <View style={styles.inputGroup}>
              <ThemedText style={[styles.label, { color: colors.textSecondary }]}>Saat (SS:DD)</ThemedText>
              <TextInput style={[styles.input, { backgroundColor: colors.backgroundSelected, color: colors.text }]} placeholder="14:30" placeholderTextColor={colors.textSecondary} value={newEvent.time} onChangeText={t => setNewEvent({...newEvent, time: t})} />
            </View>
            <View style={styles.inputGroup}>
              <ThemedText style={[styles.label, { color: colors.textSecondary }]}>Konum</ThemedText>
              <TextInput style={[styles.input, { backgroundColor: colors.backgroundSelected, color: colors.text }]} placeholder="Örn: Konferans Salonu 1" placeholderTextColor={colors.textSecondary} value={newEvent.location} onChangeText={t => setNewEvent({...newEvent, location: t})} />
            </View>
            <View style={styles.inputGroup}>
              <ThemedText style={[styles.label, { color: colors.textSecondary }]}>Kontenjan</ThemedText>
              <TextInput style={[styles.input, { backgroundColor: colors.backgroundSelected, color: colors.text }]} placeholder="Boş bırakırsanız sınırsız" placeholderTextColor={colors.textSecondary} keyboardType="numeric" value={newEvent.capacity} onChangeText={t => setNewEvent({...newEvent, capacity: t})} />
            </View>
            
            <TouchableOpacity style={[styles.uploadPosterBtn, { borderColor: colors.backgroundSelected }]} onPress={() => handlePickImage('event')}>
              {newEvent.image_url ? (
                <Image source={{ uri: newEvent.image_url }} style={styles.posterPreview} />
              ) : (
                <>
                  <UploadCloud size={32} color="#0284c7" />
                  <ThemedText style={[styles.uploadPosterText, { color: colors.textSecondary }]}>Afiş Seç / Yükle</ThemedText>
                </>
              )}
            </TouchableOpacity>

            <TouchableOpacity style={styles.submitBtn} onPress={handleCreateEvent} disabled={submittingEvent}>
              {submittingEvent ? <ActivityIndicator color="#ffffff" /> : <ThemedText style={styles.submitBtnText}>SKS Onayına Gönder</ThemedText>}
            </TouchableOpacity>
          </ScrollView>
        </SafeAreaView>
      </Modal>

      {/* Organizer Manage Event Participants Modal */}
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
                renderItem={({ item }) => (
                  <View style={styles.participantItem}>
                    <View style={{ flex: 1 }}>
                      <ThemedText style={styles.participantName}>{item.profiles?.full_name}</ThemedText>
                      <ThemedText style={styles.participantEmail}>{item.profiles?.email}</ThemedText>
                    </View>
                    <View style={styles.actionButtons}>
                      {item.status !== 'approved' && (
                        <TouchableOpacity style={[styles.actionBtn, { backgroundColor: '#22c55e' }]} onPress={() => updateParticipantStatus(item.id, 'approved')}>
                          <CheckCircle size={16} color="#fff" />
                        </TouchableOpacity>
                      )}
                      {item.status !== 'rejected' && (
                        <TouchableOpacity style={[styles.actionBtn, { backgroundColor: '#ef4444' }]} onPress={() => updateParticipantStatus(item.id, 'rejected')}>
                          <XCircle size={16} color="#fff" />
                        </TouchableOpacity>
                      )}
                    </View>
                  </View>
                )}
                ListEmptyComponent={<ThemedText style={{ color: '#94a3b8', textAlign: 'center' }}>Katılımcı bulunamadı.</ThemedText>}
              />
            )}
          </View>
        </SafeAreaView>
      </Modal>

      {/* Custom Alert Modal */}
      <Modal visible={alertModal.visible} transparent animationType="fade">
        <View style={styles.alertOverlay}>
          <View style={styles.alertBox}>
            <View style={[styles.alertIconContainer, { backgroundColor: alertModal.type === 'success' ? '#dcfce7' : '#fee2e2' }]}>
              {alertModal.type === 'success' ? (
                <CheckCircle size={32} color="#22c55e" />
              ) : (
                <XCircle size={32} color="#ef4444" />
              )}
            </View>
            <ThemedText style={styles.alertTitle}>{alertModal.title}</ThemedText>
            <ThemedText style={styles.alertMessage}>{alertModal.message}</ThemedText>
            <TouchableOpacity 
              style={styles.alertButton} 
              onPress={() => setAlertModal({ ...alertModal, visible: false })}
            >
              <ThemedText style={styles.alertButtonText}>Tamam</ThemedText>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>

      {/* Custom Confirm Modal */}
      <Modal visible={confirmModal.visible} transparent animationType="fade">
        <View style={styles.alertOverlay}>
          <View style={styles.alertBox}>
            <View style={[styles.alertIconContainer, { backgroundColor: confirmModal.type === 'danger' ? '#fef2f2' : '#fffbeb' }]}>
              {confirmModal.type === 'danger' ? (
                <Trash2 size={32} color="#ef4444" />
              ) : (
                <AlertCircle size={32} color="#f59e0b" />
              )}
            </View>
            <ThemedText style={styles.alertTitle}>{confirmModal.title}</ThemedText>
            <ThemedText style={styles.alertMessage}>{confirmModal.message}</ThemedText>
            
            <View style={{ flexDirection: 'row', gap: 12, width: '100%' }}>
              <TouchableOpacity 
                style={[styles.confirmButton, { backgroundColor: '#f1f5f9' }]} 
                onPress={() => setConfirmModal({ ...confirmModal, visible: false })}
              >
                <ThemedText style={[styles.confirmButtonText, { color: '#64748b' }]}>{confirmModal.cancelText}</ThemedText>
              </TouchableOpacity>
              
              <TouchableOpacity 
                style={[styles.confirmButton, { backgroundColor: confirmModal.type === 'danger' ? '#ef4444' : '#0284c7' }]} 
                onPress={() => {
                  setConfirmModal({ ...confirmModal, visible: false });
                  confirmModal.onConfirm();
                }}
              >
                <ThemedText style={[styles.confirmButtonText, { color: '#ffffff' }]}>{confirmModal.confirmText}</ThemedText>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      {/* Photo Actions Bottom Sheet */}
      <Modal visible={photoMenuVisible} transparent animationType="fade">
        <TouchableOpacity style={styles.bottomSheetOverlay} activeOpacity={1} onPress={() => setPhotoMenuVisible(false)}>
          <TouchableOpacity activeOpacity={1} style={[styles.bottomSheetContainer, { backgroundColor: colors.backgroundElement }]}>
            <View style={[styles.bottomSheetHeader, { borderBottomColor: colors.backgroundSelected }]}>
              <ThemedText style={[styles.bottomSheetTitle, { color: colors.text }]}>
                {photoMenuType === 'profile' ? 'Profil Fotoğrafı' : 'Afiş Görseli'}
              </ThemedText>
              <TouchableOpacity onPress={() => setPhotoMenuVisible(false)}>
                <XCircle size={24} color={colors.textSecondary} />
              </TouchableOpacity>
            </View>

            <View style={styles.bottomSheetOptions}>
              <TouchableOpacity style={[styles.bottomSheetOption, { borderBottomColor: colors.backgroundSelected }]} onPress={() => openImagePicker('camera')}>
                <View style={[styles.optionIconBox, { backgroundColor: 'rgba(2, 132, 199, 0.1)' }]}>
                  <Camera size={24} color="#0284c7" />
                </View>
                <ThemedText style={[styles.optionText, { color: colors.text }]}>Kameradan Çek</ThemedText>
              </TouchableOpacity>

              <TouchableOpacity style={[styles.bottomSheetOption, { borderBottomColor: colors.backgroundSelected }]} onPress={() => openImagePicker('gallery')}>
                <View style={[styles.optionIconBox, { backgroundColor: 'rgba(2, 132, 199, 0.1)' }]}>
                  <ImageIcon size={24} color="#0284c7" />
                </View>
                <ThemedText style={[styles.optionText, { color: colors.text }]}>Galeriden Seç</ThemedText>
              </TouchableOpacity>

              {photoMenuType === 'profile' && profile?.logo_url && (
                <TouchableOpacity style={[styles.bottomSheetOption, { borderBottomWidth: 0 }]} onPress={handleRemoveProfilePhoto}>
                  <View style={[styles.optionIconBox, { backgroundColor: 'rgba(239, 68, 68, 0.1)' }]}>
                    <Trash2 size={24} color="#ef4444" />
                  </View>
                  <ThemedText style={[styles.optionText, { color: '#ef4444' }]}>Mevcut Fotoğrafı Kaldır</ThemedText>
                </TouchableOpacity>
              )}
            </View>
          </TouchableOpacity>
        </TouchableOpacity>
      </Modal>
      {/* Theme Selection Bottom Sheet */}
      <Modal visible={themeMenuVisible} transparent animationType="fade">
        <TouchableOpacity style={styles.bottomSheetOverlay} activeOpacity={1} onPress={() => setThemeMenuVisible(false)}>
          <TouchableOpacity activeOpacity={1} style={[styles.bottomSheetContainer, { backgroundColor: colors.backgroundElement }]}>
            <View style={[styles.bottomSheetHeader, { borderBottomColor: colors.backgroundSelected }]}>
              <ThemedText style={[styles.bottomSheetTitle, { color: colors.text }]}>Tema Seçimi</ThemedText>
              <TouchableOpacity onPress={() => setThemeMenuVisible(false)}>
                <XCircle size={24} color={colors.textSecondary} />
              </TouchableOpacity>
            </View>

            <View style={styles.bottomSheetOptions}>
              <TouchableOpacity 
                style={[styles.bottomSheetOption, { borderBottomColor: colors.backgroundSelected, backgroundColor: themeMode === 'light' ? 'rgba(2, 132, 199, 0.05)' : 'transparent' }]} 
                onPress={() => { setThemeMode('light'); setThemeMenuVisible(false); }}
              >
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12 }}>
                  <View style={[styles.optionIconBox, { backgroundColor: themeMode === 'light' ? '#0284c7' : colors.backgroundSelected }]}>
                    <Sun size={20} color={themeMode === 'light' ? '#ffffff' : colors.textSecondary} />
                  </View>
                  <ThemedText style={[styles.optionText, { color: themeMode === 'light' ? '#0284c7' : colors.text }]}>Açık Tema</ThemedText>
                </View>
                {themeMode === 'light' && <CheckCircle size={20} color="#0284c7" />}
              </TouchableOpacity>

              <TouchableOpacity 
                style={[styles.bottomSheetOption, { borderBottomColor: colors.backgroundSelected, backgroundColor: themeMode === 'dark' ? 'rgba(2, 132, 199, 0.05)' : 'transparent' }]} 
                onPress={() => { setThemeMode('dark'); setThemeMenuVisible(false); }}
              >
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12 }}>
                  <View style={[styles.optionIconBox, { backgroundColor: themeMode === 'dark' ? '#0284c7' : colors.backgroundSelected }]}>
                    <Moon size={20} color={themeMode === 'dark' ? '#ffffff' : colors.textSecondary} />
                  </View>
                  <ThemedText style={[styles.optionText, { color: themeMode === 'dark' ? '#0284c7' : colors.text }]}>Koyu Tema</ThemedText>
                </View>
                {themeMode === 'dark' && <CheckCircle size={20} color="#0284c7" />}
              </TouchableOpacity>

              <TouchableOpacity 
                style={[styles.bottomSheetOption, { borderBottomWidth: 0, backgroundColor: themeMode === 'system' ? 'rgba(2, 132, 199, 0.05)' : 'transparent' }]} 
                onPress={() => { setThemeMode('system'); setThemeMenuVisible(false); }}
              >
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12 }}>
                  <View style={[styles.optionIconBox, { backgroundColor: themeMode === 'system' ? '#0284c7' : colors.backgroundSelected }]}>
                    <Monitor size={20} color={themeMode === 'system' ? '#ffffff' : colors.textSecondary} />
                  </View>
                  <ThemedText style={[styles.optionText, { color: themeMode === 'system' ? '#0284c7' : colors.text }]}>Sistem Varsayılanı</ThemedText>
                </View>
                {themeMode === 'system' && <CheckCircle size={20} color="#0284c7" />}
              </TouchableOpacity>
            </View>
          </TouchableOpacity>
        </TouchableOpacity>
      </Modal>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: { flex: 1, backgroundColor: '#f8fafc' },
  listContent: { padding: Spacing.four, flexGrow: 1 },
  
  // Profile Header
  profileHeaderContainer: {
    backgroundColor: '#ffffff', borderRadius: Spacing.four, padding: Spacing.five, alignItems: 'center',
    marginBottom: Spacing.four, borderWidth: 1, borderColor: '#e2e8f0', elevation: 2,
    shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.05, shadowRadius: 4,
  },
  avatarContainer: {
    width: 88, height: 88, borderRadius: 44, backgroundColor: '#38bdf8',
    justifyContent: 'center', alignItems: 'center', marginBottom: Spacing.three,
    position: 'relative', overflow: 'visible'
  },
  avatarImage: { width: 88, height: 88, borderRadius: 44 },
  avatarText: { fontSize: 32, fontWeight: '900', color: '#ffffff' },
  editIconBadge: {
    position: 'absolute', bottom: 0, right: -4, backgroundColor: '#0284c7',
    padding: 6, borderRadius: 16, borderWidth: 2, borderColor: '#ffffff'
  },
  userName: { fontSize: 22, fontWeight: '700', color: '#0f172a', marginBottom: 4 },
  roleBadge: {
    flexDirection: 'row', alignItems: 'center', gap: 6, backgroundColor: '#f0f9ff',
    borderWidth: 1, borderColor: '#e0f2fe', paddingHorizontal: 12, paddingVertical: 4,
    borderRadius: 12, marginBottom: Spacing.four,
  },
  roleBadgeText: { color: '#0284c7', fontSize: 13, fontWeight: '700', textTransform: 'uppercase' },
  
  infoList: { width: '100%', gap: Spacing.three, borderTopWidth: 1, borderTopColor: '#f1f5f9', paddingTop: Spacing.four, marginBottom: Spacing.four },
  infoRow: { flexDirection: 'row', alignItems: 'center', gap: Spacing.three },
  infoText: { fontSize: 14, fontWeight: '500', color: '#64748b', flex: 1 },
  settingsSection: { width: '100%', marginTop: Spacing.four },
  settingRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', padding: 12, borderRadius: 16 },
  settingRowLeft: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  settingIconBox: { width: 36, height: 36, borderRadius: 18, alignItems: 'center', justifyContent: 'center' },
  settingLabel: { fontSize: 15, fontWeight: '700' },
  settingRowRight: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  settingValue: { fontSize: 14, fontWeight: '600' },
  
  logoutButton: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', padding: Spacing.three, borderRadius: 16, marginTop: Spacing.three, width: '100%' },
  logoutButtonText: { color: '#ef4444', fontWeight: '800', marginLeft: Spacing.two },

  // Tabs
  tabsContainer: {
    flexDirection: 'row', backgroundColor: '#f1f5f9', borderRadius: Spacing.two, padding: 4,
    marginBottom: Spacing.four, borderWidth: 1, borderColor: '#e2e8f0',
  },
  tabButton: { flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: Spacing.two, paddingVertical: Spacing.three, borderRadius: Spacing.two - 2 },
  tabButtonActive: { backgroundColor: '#ffffff', shadowColor: '#000', shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.05, shadowRadius: 2, elevation: 1 },
  tabButtonText: { fontSize: 13, fontWeight: '600', color: '#64748b' },
  tabButtonTextActive: { color: '#0f172a' },

  // Organizer specific
  organizerActions: { marginBottom: Spacing.two },
  createEventButton: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: Spacing.two,
    backgroundColor: '#0284c7', paddingVertical: Spacing.three, borderRadius: Spacing.three, marginBottom: Spacing.four
  },
  createEventButtonText: { color: '#ffffff', fontWeight: '800', fontSize: 15 },

  // Event Item
  eventItem: {
    backgroundColor: '#ffffff', borderRadius: Spacing.three, padding: Spacing.four,
    marginBottom: Spacing.three, borderWidth: 1, borderColor: '#e2e8f0',
    shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.05, shadowRadius: 4, elevation: 2,
  },
  eventItemHeader: { flexDirection: 'row', alignItems: 'center', gap: Spacing.two, marginBottom: Spacing.two },
  eventCategoryBadge: { backgroundColor: '#f1f5f9', paddingHorizontal: 8, paddingVertical: 4, borderRadius: 6 },
  eventCategoryText: { fontSize: 10, fontWeight: '800', color: '#475569' },
  statusBadge: { flexDirection: 'row', alignItems: 'center', gap: 4, paddingHorizontal: 6, paddingVertical: 2, borderRadius: 4 },
  statusBadgeText: { fontSize: 10, fontWeight: '700' },
  eventTitle: { fontSize: 16, fontWeight: '700', marginBottom: Spacing.two, color: '#0f172a' },
  eventMetaRow: { flexDirection: 'row', flexWrap: 'wrap', gap: Spacing.three },
  eventMetaItem: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  eventMetaText: { fontSize: 12, fontWeight: '600', color: '#64748b' },
  manageButton: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: Spacing.two,
    backgroundColor: '#f0f9ff', marginTop: Spacing.three, paddingVertical: Spacing.two,
    borderRadius: Spacing.two, borderWidth: 1, borderColor: '#e0f2fe'
  },
  manageButtonText: { color: '#0284c7', fontWeight: '700', fontSize: 13 },

  emptyContainer: { paddingVertical: 40, alignItems: 'center', justifyContent: 'center' },

  // Modals
  modalArea: { flex: 1, backgroundColor: '#f8fafc' },
  modalHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', padding: Spacing.four, borderBottomWidth: 1, borderBottomColor: '#e2e8f0', backgroundColor: '#ffffff' },
  modalTitle: { fontSize: 18, fontWeight: '700', color: '#0f172a', flex: 1, textAlign: 'center' },
  modalScroll: { flex: 1, padding: Spacing.four },
  
  inputGroup: { marginBottom: Spacing.four },
  label: { color: '#475569', fontSize: 13, fontWeight: '600', marginBottom: Spacing.two },
  input: {
    backgroundColor: '#ffffff', color: '#0f172a', padding: Spacing.four, borderRadius: Spacing.two,
    borderWidth: 1, borderColor: '#e2e8f0', fontSize: 15
  },
  
  uploadPosterBtn: {
    height: 160, backgroundColor: '#f8fafc', borderRadius: Spacing.two, borderWidth: 2, borderColor: '#cbd5e1',
    borderStyle: 'dashed', alignItems: 'center', justifyContent: 'center', marginBottom: Spacing.five, overflow: 'hidden'
  },
  posterPreview: { width: '100%', height: '100%' },
  uploadPosterText: { color: '#0284c7', fontWeight: '700', marginTop: Spacing.two },
  
  submitBtn: { backgroundColor: '#0284c7', padding: Spacing.four, borderRadius: Spacing.three, alignItems: 'center', marginBottom: 40 },
  submitBtnText: { color: '#ffffff', fontWeight: '800', fontSize: 16 },

  // Participants
  participantItem: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    backgroundColor: '#ffffff', padding: Spacing.three, borderRadius: Spacing.two, marginBottom: Spacing.two,
    borderWidth: 1, borderColor: '#e2e8f0'
  },
  participantName: { color: '#0f172a', fontWeight: '700', fontSize: 14 },
  participantEmail: { color: '#64748b', fontSize: 12, marginTop: 2 },
  actionButtons: { flexDirection: 'row', gap: Spacing.two },
  actionBtn: { width: 32, height: 32, borderRadius: 16, alignItems: 'center', justifyContent: 'center' },

  // Alert Modal
  alertOverlay: { flex: 1, backgroundColor: 'rgba(15, 23, 42, 0.4)', justifyContent: 'center', alignItems: 'center', padding: Spacing.four },
  alertBox: { backgroundColor: '#ffffff', width: '100%', borderRadius: Spacing.four, padding: Spacing.five, alignItems: 'center', borderWidth: 1, borderColor: '#e2e8f0' },
  alertIconContainer: { width: 64, height: 64, borderRadius: 32, alignItems: 'center', justifyContent: 'center', marginBottom: Spacing.four },
  alertTitle: { fontSize: 20, fontWeight: '800', color: '#0f172a', marginBottom: Spacing.two },
  alertMessage: { fontSize: 14, color: '#475569', textAlign: 'center', marginBottom: Spacing.five },
  alertButton: { backgroundColor: '#0284c7', paddingVertical: Spacing.three, paddingHorizontal: Spacing.six, borderRadius: Spacing.three, width: '100%', alignItems: 'center' },
  alertButtonText: { color: '#ffffff', fontWeight: '800', fontSize: 16 },
  confirmButton: { paddingVertical: 12, paddingHorizontal: 16, borderRadius: Spacing.two, alignItems: 'center', flex: 1 },
  confirmButtonText: { fontWeight: '700', fontSize: 14 },

  // Bottom Sheet
  bottomSheetOverlay: { flex: 1, backgroundColor: 'rgba(15, 23, 42, 0.5)', justifyContent: 'flex-end' },
  bottomSheetContainer: { backgroundColor: '#ffffff', borderTopLeftRadius: 24, borderTopRightRadius: 24, padding: Spacing.five, paddingBottom: Platform.OS === 'ios' ? 40 : Spacing.five },
  bottomSheetHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: Spacing.four, paddingBottom: Spacing.three, borderBottomWidth: 1, borderBottomColor: '#f1f5f9' },
  bottomSheetTitle: { fontSize: 18, fontWeight: '800', color: '#0f172a' },
  bottomSheetOptions: { gap: Spacing.three },
  bottomSheetOption: { flexDirection: 'row', alignItems: 'center', gap: Spacing.three, paddingVertical: Spacing.two },
  optionIconBox: { width: 48, height: 48, borderRadius: 24, alignItems: 'center', justifyContent: 'center' },
  optionText: { fontSize: 16, fontWeight: '600', color: '#0f172a' }
});
