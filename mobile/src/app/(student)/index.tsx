import React, { useState, useEffect } from 'react';
import { StyleSheet, View, FlatList, ActivityIndicator, RefreshControl, ScrollView, Image } from 'react-native';
import { Calendar, ChevronDown, Check } from 'lucide-react-native';
import { Modal, TouchableOpacity } from 'react-native';

import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { EventCard, EventType } from '@/components/ui/EventCard';
import { useAuth } from '@/context/AuthContext';
import { supabase } from '@/lib/supabaseClient';
import { Colors, Spacing } from '@/constants/theme';
import { useColorScheme } from '@/hooks/use-color-scheme';

export default function HomeScreen() {
  const { user, profile } = useAuth();
  const scheme = useColorScheme();
  const colors = Colors[scheme === 'dark' ? 'dark' : 'light'];

  const [events, setEvents] = useState<EventType[]>([]);
  const [loadingEvents, setLoadingEvents] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [savedEventIds, setSavedEventIds] = useState<string[]>([]);
  
  const [communities, setCommunities] = useState<any[]>([]);
  const [selectedCommunityId, setSelectedCommunityId] = useState<string>('');
  const [communityModalVisible, setCommunityModalVisible] = useState(false);
  const [universityDetails, setUniversityDetails] = useState<{name: string, logo_url: string} | null>(null);

  const loadUniversity = async () => {
    if (!profile?.university_id) return;
    try {
      const { data, error } = await supabase
        .from('universities')
        .select('name, logo_url')
        .eq('id', profile.university_id)
        .single();
      
      if (!error && data) {
        setUniversityDetails(data);
      }
    } catch (err) {
      console.error('Üniversite bilgisi yüklenirken hata:', err);
    }
  };

  const loadEvents = async () => {
    if (!profile) return;
    try {
      setLoadingEvents(true);
      let query = supabase
        .from('events')
        .select(`
          *,
          universities(name, logo_url),
          profiles:organizer_id(full_name, logo_url)
        `)
        .eq('status', 'approved')
        .order('date', { ascending: true });

      if (profile?.role === 'student' && profile?.university_id) {
        query = query.eq('university_id', profile.university_id);
      } else if (profile?.role === 'organizer') {
        // Organizer sees their own events or events from their university
        query = query.eq('university_id', profile.university_id);
      }

      const { data, error } = await query;
      if (error) throw error;

      const formatted: EventType[] = (data || []).map((ev: any) => ({
        id: ev.id,
        title: ev.title,
        description: ev.description,
        category: ev.category,
        date: ev.date ? new Date(ev.date).toLocaleDateString('tr-TR', { day: 'numeric', month: 'short', year: 'numeric' }) : '',
        location: ev.location,
        university: ev.universities?.name || 'Bilinmeyen Üniversite',
        universityLogo: ev.universities?.logo_url,
        organizer: ev.profiles?.full_name || 'Bilinmeyen Topluluk',
        organizerLogo: ev.profiles?.logo_url,
        organizerId: ev.organizer_id,
      }));

      setEvents(formatted);
    } catch (err) {
      console.error('Etkinlikler yüklenirken hata:', err);
    } finally {
      setLoadingEvents(false);
      setRefreshing(false);
    }
  };

  const loadCommunities = async () => {
    if (!profile?.university_id) return;
    try {
      const { data, error } = await supabase
        .from('profiles')
        .select('id, full_name')
        .eq('role', 'organizer')
        .eq('university_id', profile.university_id)
        .order('full_name', { ascending: true });

      if (error) throw error;
      setCommunities(data || []);
    } catch (err) {
      console.error('Topluluklar yüklenirken hata:', err);
    }
  };

  const loadSavedEvents = async () => {
    if (!user) return;
    try {
      const { data, error } = await supabase
        .from('saved_events')
        .select('event_id')
        .eq('student_id', user.id);

      if (error) throw error;
      const dbIds = (data || []).map((item: any) => item.event_id);
      setSavedEventIds(dbIds);
    } catch (err) {
      console.error('Favoriler yüklenirken hata:', err);
    }
  };

  useEffect(() => {
    if (profile) {
      loadUniversity();
      loadEvents();
      loadCommunities();
    }
  }, [profile]);

  useEffect(() => {
    if (user) {
      loadSavedEvents();
    }
  }, [user]);

  const onRefresh = () => {
    setRefreshing(true);
    loadEvents();
    loadCommunities();
    loadSavedEvents();
  };

  const handleToggleSave = async (eventId: string | number) => {
    if (!user) return;

    const eventIdStr = String(eventId);
    const isCurrentlySaved = savedEventIds.includes(eventIdStr);

    try {
      if (isCurrentlySaved) {
        const { error } = await supabase
          .from('saved_events')
          .delete()
          .eq('student_id', user.id)
          .eq('event_id', eventIdStr);
        if (error) throw error;
        setSavedEventIds(prev => prev.filter(id => id !== eventIdStr));
      } else {
        const { error } = await supabase
          .from('saved_events')
          .insert({
            student_id: user.id,
            event_id: eventIdStr
          });
        if (error) throw error;
        setSavedEventIds(prev => [...prev, eventIdStr]);
      }
    } catch (err) {
      console.error('Favori işlemi hatası:', err);
    }
  };

  const filteredEvents = selectedCommunityId === '' 
    ? events 
    : events.filter(e => (e as any).organizerId === selectedCommunityId);

  const renderHeader = () => (
    <View style={styles.header}>
      {universityDetails ? (
        <View style={[styles.universityHeaderInfo, { backgroundColor: colors.backgroundElement, borderColor: colors.backgroundSelected }]}>
          {universityDetails.logo_url && (
            <View style={[styles.universityLogoWrapper, { backgroundColor: colors.backgroundElement }]}>
              <Image 
                source={{ uri: universityDetails.logo_url }} 
                style={styles.universityLogo} 
                resizeMode="contain" 
              />
            </View>
          )}
          <View style={styles.headerTextContainer}>
            <ThemedText style={[styles.universityName, { color: colors.textSecondary }]}>{universityDetails.name}</ThemedText>
            <ThemedText type="title" style={[styles.headerTitle, { color: colors.text }]}>Kampüsündeki Etkinlikler</ThemedText>
          </View>
        </View>
      ) : (
        <ThemedText type="title" style={[styles.headerTitle, { color: colors.text }]}>Kampüsündeki Etkinlikler</ThemedText>
      )}
      
      {/* Community Dropdown Trigger */}
      <TouchableOpacity 
        style={[styles.communitySelectorBtn, { backgroundColor: colors.backgroundSelected }]}
        onPress={() => setCommunityModalVisible(true)}
        activeOpacity={0.7}
      >
        <ThemedText style={[styles.communitySelectorText, { color: colors.text }]}>
          {selectedCommunityId === '' ? 'Tüm Topluluklar' : communities.find(c => c.id === selectedCommunityId)?.full_name || 'Tüm Topluluklar'}
        </ThemedText>
        <ChevronDown size={20} color={colors.text} />
      </TouchableOpacity>
    </View>
  );

  const renderEmpty = () => {
    if (loadingEvents) {
      return (
        <View style={styles.centerContainer}>
          <ActivityIndicator size="large" color="#38bdf8" />
        </View>
      );
    }

    return (
      <View style={[styles.emptyContainer, { backgroundColor: colors.backgroundElement, borderColor: colors.backgroundSelected }]}>
        <Calendar size={48} color={colors.textSecondary} style={{ marginBottom: Spacing.three }} />
        <ThemedText style={{ textAlign: 'center', color: colors.textSecondary }}>
          {selectedCommunityId === '' 
            ? "Kampüsünüzde henüz onaylanmış bir etkinlik bulunmuyor." 
            : "Bu topluluğa ait aktif bir etkinlik bulunamadı."}
        </ThemedText>
      </View>
    );
  };

  return (
    <View style={[styles.safeArea, { backgroundColor: colors.background }]}>
      <ThemedView style={[styles.container, { backgroundColor: colors.background }]}>
        <FlatList
          data={filteredEvents}
          keyExtractor={item => String(item.id)}
          renderItem={({ item }) => (
            <EventCard 
              event={item} 
              isSaved={savedEventIds.includes(String(item.id))}
              onToggleSave={handleToggleSave}
            />
          )}
          ListHeaderComponent={renderHeader}
          ListEmptyComponent={renderEmpty}
          contentContainerStyle={styles.listContent}
          refreshControl={
            <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor="#38bdf8" />
          }
        />
      </ThemedView>

      {/* Community Selection Modal */}
      <Modal visible={communityModalVisible} animationType="slide" transparent={true}>
        <TouchableOpacity style={styles.modalOverlay} activeOpacity={1} onPress={() => setCommunityModalVisible(false)}>
          <TouchableOpacity activeOpacity={1} style={[styles.modalContent, { backgroundColor: colors.backgroundElement }]}>
            <View style={[styles.dragHandle, { backgroundColor: colors.backgroundSelected }]} />
            <ThemedText style={[styles.modalTitle, { color: colors.text }]}>Topluluk Seçin</ThemedText>
            
            <ScrollView style={styles.modalScroll} showsVerticalScrollIndicator={false}>
              <TouchableOpacity 
                style={[styles.modalOption, { backgroundColor: colors.background, borderColor: colors.background }, selectedCommunityId === '' && { backgroundColor: colors.backgroundSelected, borderColor: colors.backgroundSelected }]}
                onPress={() => { setSelectedCommunityId(''); setCommunityModalVisible(false); }}
              >
                <ThemedText style={[styles.modalOptionText, { color: colors.textSecondary }, selectedCommunityId === '' && { color: colors.text, fontWeight: '800' }]}>Tüm Topluluklar</ThemedText>
                {selectedCommunityId === '' && <Check size={20} color={colors.text} />}
              </TouchableOpacity>
              {communities.map(c => (
                <TouchableOpacity 
                  key={c.id}
                  style={[styles.modalOption, { backgroundColor: colors.background, borderColor: colors.background }, selectedCommunityId === c.id && { backgroundColor: colors.backgroundSelected, borderColor: colors.backgroundSelected }]}
                  onPress={() => { setSelectedCommunityId(c.id); setCommunityModalVisible(false); }}
                >
                  <ThemedText style={[styles.modalOptionText, { color: colors.textSecondary }, selectedCommunityId === c.id && { color: colors.text, fontWeight: '800' }]}>{c.full_name}</ThemedText>
                  {selectedCommunityId === c.id && <Check size={20} color={colors.text} />}
                </TouchableOpacity>
              ))}
            </ScrollView>
          </TouchableOpacity>
        </TouchableOpacity>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: '#f8fafc',
  },
  container: {
    flex: 1,
    backgroundColor: '#f8fafc',
  },
  listContent: {
    padding: Spacing.four,
    flexGrow: 1,
  },
  header: {
    marginBottom: Spacing.four,
  },
  universityHeaderInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: Spacing.four,
    backgroundColor: '#ffffff',
    padding: 16,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: '#e2e8f0',
  },
  universityLogoWrapper: {
    width: 48,
    height: 48,
    backgroundColor: '#ffffff',
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 16,
    overflow: 'hidden',
  },
  universityLogo: {
    width: '80%',
    height: '80%',
  },
  headerTextContainer: {
    flex: 1,
  },
  universityName: {
    fontSize: 13,
    color: '#94a3b8',
    fontWeight: '600',
    marginBottom: 2,
  },
  headerTitle: {
    fontSize: 18,
    lineHeight: 24,
    color: '#0f172a',
  },
  communitySelectorBtn: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    backgroundColor: '#f1f5f9', paddingHorizontal: Spacing.four, paddingVertical: 14,
    borderRadius: 16,
  },
  communitySelectorText: { fontSize: 15, fontWeight: '700', color: '#0f172a' },
  modalOverlay: { flex: 1, backgroundColor: 'rgba(15, 23, 42, 0.4)', justifyContent: 'flex-end' },
  modalContent: { backgroundColor: '#ffffff', borderTopLeftRadius: 24, borderTopRightRadius: 24, paddingHorizontal: Spacing.five, paddingTop: Spacing.three, paddingBottom: Spacing.five, maxHeight: '80%' },
  dragHandle: { width: 40, height: 5, backgroundColor: '#cbd5e1', borderRadius: 3, alignSelf: 'center', marginBottom: Spacing.four },
  modalTitle: { fontSize: 18, fontWeight: '800', color: '#0f172a', textAlign: 'center', marginBottom: Spacing.five },
  modalScroll: { paddingBottom: 40 },
  modalOption: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingVertical: 14, paddingHorizontal: 16, borderRadius: 12, marginBottom: 8, backgroundColor: '#f8fafc', borderWidth: 1, borderColor: '#f1f5f9' },
  modalOptionActive: { backgroundColor: '#f1f5f9', borderColor: '#e2e8f0' },
  modalOptionText: { fontSize: 15, fontWeight: '600', color: '#64748b' },
  modalOptionTextActive: { color: '#0f172a', fontWeight: '800' },
  centerContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: 40,
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: 60,
    backgroundColor: '#ffffff',
    borderRadius: Spacing.three,
    borderWidth: 1,
    borderColor: '#e2e8f0',
    marginTop: Spacing.two,
  },
});
