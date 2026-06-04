import React, { useState, useEffect } from 'react';
import { StyleSheet, View, FlatList, ActivityIndicator, RefreshControl, ScrollView, TextInput } from 'react-native';
import { Calendar, Search, ChevronDown, Check } from 'lucide-react-native';
import { Modal, TouchableOpacity } from 'react-native';

import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { EventCard, EventType } from '@/components/ui/EventCard';
import { useAuth } from '@/context/AuthContext';
import { supabase } from '@/lib/supabaseClient';
import { Colors, Spacing } from '@/constants/theme';
import { useColorScheme } from '@/hooks/use-color-scheme';

export default function ExploreScreen() {
  const { user } = useAuth();
  const scheme = useColorScheme();
  const colors = Colors[scheme === 'dark' ? 'dark' : 'light'];

  const [events, setEvents] = useState<EventType[]>([]);
  const [loadingEvents, setLoadingEvents] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [savedEventIds, setSavedEventIds] = useState<string[]>([]);
  
  const [universities, setUniversities] = useState<any[]>([]);
  const [selectedUniId, setSelectedUniId] = useState<string>('');
  const [uniModalVisible, setUniModalVisible] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');

  const loadUniversities = async () => {
    try {
      const { data, error } = await supabase
        .from('universities')
        .select('id, name')
        .order('name', { ascending: true });
      if (error) throw error;
      setUniversities(data || []);
    } catch (err) {
      console.error('Üniversiteler yüklenirken hata:', err);
    }
  };

  const loadEvents = async () => {
    try {
      setLoadingEvents(true);
      const { data, error } = await supabase
        .from('events')
        .select(`
          *,
          universities(name, logo_url),
          profiles:organizer_id(full_name, logo_url)
        `)
        .eq('status', 'approved')
        .order('date', { ascending: true });

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
        universityId: ev.university_id,
        organizer: ev.profiles?.full_name || 'Bilinmeyen Topluluk',
        organizerLogo: ev.profiles?.logo_url,
      }));

      setEvents(formatted);
    } catch (err) {
      console.error('Etkinlikler yüklenirken hata:', err);
    } finally {
      setLoadingEvents(false);
      setRefreshing(false);
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
    loadUniversities();
    loadEvents();
  }, []);

  useEffect(() => {
    if (user) {
      loadSavedEvents();
    }
  }, [user]);

  const onRefresh = () => {
    setRefreshing(true);
    loadUniversities();
    loadEvents();
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

  const filteredEvents = events.filter((event: any) => {
    const query = searchQuery.toLocaleLowerCase('tr-TR');
    const matchesSearch = 
      (event.title || '').toLocaleLowerCase('tr-TR').includes(query) ||
      (event.description || '').toLocaleLowerCase('tr-TR').includes(query) ||
      (event.location || '').toLocaleLowerCase('tr-TR').includes(query) ||
      (event.category || '').toLocaleLowerCase('tr-TR').includes(query) ||
      (event.university || '').toLocaleLowerCase('tr-TR').includes(query);

    const matchesUniversity = selectedUniId === '' || event.universityId === selectedUniId;

    return matchesSearch && matchesUniversity;
  });

  const renderHeader = () => (
    <View style={styles.header}>
      <ThemedText type="title" style={[styles.headerTitle, { color: colors.text }]}>Diğer Kampüsleri Keşfet</ThemedText>
      
      {/* Search Input */}
      <View style={[styles.searchContainer, { backgroundColor: colors.backgroundElement, borderColor: colors.backgroundSelected }]}>
        <Search size={20} color={colors.textSecondary} style={styles.searchIcon} />
        <TextInput
          style={[styles.searchInput, { color: colors.text }]}
          placeholder="Etkinlik veya üniversite ara..."
          placeholderTextColor={colors.textSecondary}
          value={searchQuery}
          onChangeText={setSearchQuery}
        />
      </View>

      {/* University Dropdown Trigger */}
      <TouchableOpacity 
        style={[styles.communitySelectorBtn, { backgroundColor: colors.backgroundSelected }]}
        onPress={() => setUniModalVisible(true)}
        activeOpacity={0.7}
      >
        <ThemedText style={[styles.communitySelectorText, { color: colors.text }]}>
          {selectedUniId === '' ? 'Tüm Üniversiteler' : universities.find(u => u.id === selectedUniId)?.name || 'Tüm Üniversiteler'}
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
          Eşleşen aktif bir etkinlik bulunamadı.
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

      {/* University Selection Modal */}
      <Modal visible={uniModalVisible} animationType="slide" transparent={true}>
        <TouchableOpacity style={styles.modalOverlay} activeOpacity={1} onPress={() => setUniModalVisible(false)}>
          <TouchableOpacity activeOpacity={1} style={[styles.modalContent, { backgroundColor: colors.backgroundElement }]}>
            <View style={[styles.dragHandle, { backgroundColor: colors.backgroundSelected }]} />
            <ThemedText style={[styles.modalTitle, { color: colors.text }]}>Üniversite Seçin</ThemedText>
            
            <ScrollView style={styles.modalScroll} showsVerticalScrollIndicator={false}>
              <TouchableOpacity 
                style={[styles.modalOption, { backgroundColor: colors.background, borderColor: colors.background }, selectedUniId === '' && { backgroundColor: colors.backgroundSelected, borderColor: colors.backgroundSelected }]}
                onPress={() => { setSelectedUniId(''); setUniModalVisible(false); }}
              >
                <ThemedText style={[styles.modalOptionText, { color: colors.textSecondary }, selectedUniId === '' && { color: colors.text, fontWeight: '800' }]}>Tüm Üniversiteler</ThemedText>
                {selectedUniId === '' && <Check size={20} color={colors.text} />}
              </TouchableOpacity>
              {universities.map(u => (
                <TouchableOpacity 
                  key={u.id}
                  style={[styles.modalOption, { backgroundColor: colors.background, borderColor: colors.background }, selectedUniId === u.id && { backgroundColor: colors.backgroundSelected, borderColor: colors.backgroundSelected }]}
                  onPress={() => { setSelectedUniId(u.id); setUniModalVisible(false); }}
                >
                  <ThemedText style={[styles.modalOptionText, { color: colors.textSecondary }, selectedUniId === u.id && { color: colors.text, fontWeight: '800' }]}>{u.name}</ThemedText>
                  {selectedUniId === u.id && <Check size={20} color={colors.text} />}
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
  headerTitle: {
    fontSize: 22,
    marginBottom: Spacing.four,
    color: '#0f172a',
  },
  searchContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#ffffff',
    borderRadius: Spacing.two,
    borderWidth: 1,
    borderColor: '#e2e8f0',
    marginBottom: Spacing.three,
    paddingHorizontal: Spacing.three,
  },
  searchIcon: {
    marginRight: Spacing.two,
  },
  searchInput: {
    flex: 1,
    height: 44,
    color: '#0f172a',
    fontSize: 14,
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
