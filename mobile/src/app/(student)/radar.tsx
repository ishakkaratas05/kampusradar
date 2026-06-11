import React, { useState, useEffect, useCallback } from 'react';
import { StyleSheet, View, FlatList, ActivityIndicator, Image, TouchableOpacity, Dimensions, Platform } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Calendar, MapPin, ExternalLink, RefreshCw, ChevronRight } from 'lucide-react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { useRouter } from 'expo-router';

import { ThemedText } from '@/components/themed-text';
import { supabase } from '@/lib/supabaseClient';
import { useBottomTabBarHeight } from '@react-navigation/bottom-tabs';
import { useTheme } from '@/hooks/use-theme';

const { height: WINDOW_HEIGHT, width: WINDOW_WIDTH } = Dimensions.get('window');

export default function RadarScreen() {
  const theme = useTheme();
  const router = useRouter();
  const [events, setEvents] = useState<any[]>([]);
  const [allEventsPool, setAllEventsPool] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  // Array shuffle utility
  const shuffleArray = (array: any[]) => {
    let shuffled = [...array];
    for (let i = shuffled.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
    }
    return shuffled;
  };
  
  // Attempt to get bottom tab bar height to accurately size pages. Fallback to 80 if not available.
  let tabBarHeight = 80;
  try {
    tabBarHeight = useBottomTabBarHeight();
  } catch (e) {
    // If hook fails because it's rendering before layout, use estimate
  }
  
  // Height of each reel page is window height minus tab bar
  // On Android, window height might not include status bar, we'll just use flex to fill.
  // Actually, for pagingEnabled to work perfectly, we need a fixed height.
  // We can calculate it using onLayout of the container.
  const [containerHeight, setContainerHeight] = useState(WINDOW_HEIGHT - tabBarHeight);

  const loadReelEvents = async () => {
    try {
      setLoading(true);
      const { data, error } = await supabase
        .from('events')
        .select(`
          id, title, date, location, image_url, category, end_time,
          universities(name, logo_url),
          profiles:organizer_id(full_name, logo_url)
        `)
        .eq('status', 'approved')
        .not('image_url', 'is', null)
        .limit(100); // Fetch up to 100 active events for the pool

      if (error) throw error;
      
      // Filter out empty image strings just in case
      const validEvents = (data || []).filter(ev => ev.image_url && ev.image_url.trim() !== '');
      
      setAllEventsPool(validEvents);
      // Initialize the first random batch
      setEvents(shuffleArray(validEvents));
    } catch (err) {
      console.error('Radar etkinlikleri yüklenirken hata:', err);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  const loadMoreEvents = () => {
    // Infinite loop: When reaching the end, append a newly shuffled batch of the pool
    if (allEventsPool.length > 0) {
      setEvents(prev => [...prev, ...shuffleArray(allEventsPool)]);
    }
  };

  useEffect(() => {
    loadReelEvents();
  }, []);

  const onRefresh = () => {
    setRefreshing(true);
    loadReelEvents();
  };

  const renderItem = ({ item }: { item: any }) => {
    const baseDate = item.date ? new Date(item.date).toLocaleDateString('tr-TR', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' }) : '';
    const eventDate = item.end_time ? `${baseDate} – ${item.end_time}` : baseDate;
    
    // Floating card dimensions (inset 20px on each side)
    const cardWidth = WINDOW_WIDTH - 40;
    const cardHeight = cardWidth * (5 / 4);

    return (
      <View style={[styles.reelContainer, { height: containerHeight, backgroundColor: theme.background }]}>
        
        <View style={styles.contentWrapper}>
          {/* Poster Section (Floating Card) */}
          <View style={[styles.imageContainer, { width: cardWidth, height: cardHeight, backgroundColor: theme.backgroundElement }]}>
            <Image 
              source={{ uri: item.image_url }} 
              style={styles.backgroundImage}
              resizeMode="cover"
            />
          </View>

          {/* Details Section */}
          <View style={[styles.detailsContainer, { width: cardWidth }]}>
            <View style={styles.organizerRow}>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10, flex: 1 }}>
                {item.profiles?.logo_url ? (
                  <Image source={{ uri: item.profiles.logo_url }} style={styles.organizerLogo} />
                ) : (
                  <View style={[styles.organizerLogo, { backgroundColor: theme.backgroundSelected, justifyContent: 'center', alignItems: 'center' }]}>
                    <ThemedText style={{fontSize: 10}}>Logo</ThemedText>
                  </View>
                )}
                <ThemedText style={[styles.organizerName, { color: theme.textSecondary }]} numberOfLines={1}>{item.profiles?.full_name || 'Bilinmeyen Topluluk'}</ThemedText>
              </View>
              
              <View style={[styles.categoryBadgeInline, { backgroundColor: theme.backgroundSelected }]}>
                <ThemedText style={[styles.categoryTextInline, { color: theme.textSecondary }]}>{item.category || 'DİĞER'}</ThemedText>
              </View>
            </View>

            <ThemedText style={[styles.title, { color: theme.text }]} numberOfLines={2}>{item.title}</ThemedText>
            
            <View style={styles.bottomRow}>
              <View style={styles.infoCol}>
                <View style={styles.infoItem}>
                  <Calendar size={14} color={theme.textSecondary} />
                  <ThemedText style={[styles.infoText, { color: theme.textSecondary }]}>{eventDate}</ThemedText>
                </View>
                <View style={styles.infoItem}>
                  <MapPin size={14} color={theme.textSecondary} />
                  <ThemedText style={[styles.infoText, { color: theme.textSecondary }]} numberOfLines={1}>{item.location}</ThemedText>
                </View>
              </View>

              <TouchableOpacity 
                style={[styles.subtleButton, { backgroundColor: theme.backgroundSelected }]}
                onPress={() => router.push(`/event/${item.id}`)}
                activeOpacity={0.7}
              >
                <ThemedText style={[styles.subtleButtonText, { color: theme.text }]}>İncele</ThemedText>
                <ChevronRight size={16} color={theme.text} />
              </TouchableOpacity>
            </View>
          </View>
        </View>

      </View>
    );
  };

  if (loading && !refreshing) {
    return (
      <View style={[styles.centerContainer, { backgroundColor: theme.background }]}>
        <ActivityIndicator size="large" color="#38bdf8" />
      </View>
    );
  }

  return (
    <View 
      style={[styles.container, { backgroundColor: theme.background }]} 
      onLayout={(e) => setContainerHeight(e.nativeEvent.layout.height)}
    >
      {events.length === 0 ? (
        <View style={styles.emptyContainer}>
          <RefreshCw size={48} color={theme.textSecondary} style={{ marginBottom: 16 }} />
          <ThemedText style={[styles.emptyText, { color: theme.textSecondary }]}>Şu an afişi olan aktif etkinlik bulunmuyor.</ThemedText>
          <TouchableOpacity style={[styles.refreshBtn, { backgroundColor: theme.backgroundElement }]} onPress={onRefresh}>
            <ThemedText style={styles.refreshBtnText}>Yenile</ThemedText>
          </TouchableOpacity>
        </View>
      ) : (
        <FlatList
          data={events}
          keyExtractor={(item, index) => `${item.id}-${index}`}
          renderItem={renderItem}
          pagingEnabled
          showsVerticalScrollIndicator={false}
          bounces={false}
          decelerationRate="fast"
          snapToInterval={containerHeight}
          snapToAlignment="start"
          disableIntervalMomentum={true}
          onRefresh={onRefresh}
          refreshing={refreshing}
          onEndReached={loadMoreEvents}
          onEndReachedThreshold={0.5}
          getItemLayout={(data, index) => ({
            length: containerHeight,
            offset: containerHeight * index,
            index,
          })}
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  centerContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  reelContainer: {
    width: WINDOW_WIDTH,
    justifyContent: 'center',
    alignItems: 'center',
  },
  contentWrapper: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  imageContainer: {
    position: 'relative',
    borderRadius: 24,
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.15,
    shadowRadius: 20,
    elevation: 5,
  },
  backgroundImage: {
    width: '100%',
    height: '100%',
  },
  organizerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 16,
  },
  categoryBadgeInline: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
    marginLeft: 10,
  },
  categoryTextInline: {
    fontSize: 10,
    fontWeight: '700',
    letterSpacing: 0.5,
  },
  detailsContainer: {
    paddingTop: 24,
    paddingHorizontal: 4,
  },
  organizerLogo: {
    width: 28,
    height: 28,
    borderRadius: 8,
    overflow: 'hidden',
  },
  organizerName: {
    fontSize: 14,
    fontWeight: '600',
  },
  title: {
    fontSize: 22,
    fontWeight: '800',
    lineHeight: 28,
    marginBottom: 16,
  },
  bottomRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-end',
  },
  infoCol: {
    gap: 8,
    flex: 1,
    paddingRight: 16,
  },
  infoItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  infoText: {
    fontSize: 13,
    fontWeight: '500',
  },
  subtleButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 20,
    gap: 4,
  },
  subtleButtonText: {
    fontSize: 13,
    fontWeight: '700',
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  emptyText: {
    fontSize: 16,
    textAlign: 'center',
    marginBottom: 20,
  },
  refreshBtn: {
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 12,
  },
  refreshBtnText: {
    fontWeight: '700',
  }
});
