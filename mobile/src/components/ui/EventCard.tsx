import React from 'react';
import { StyleSheet, View, TouchableOpacity, Image } from 'react-native';
import { useColorScheme } from '@/hooks/use-color-scheme';
import { ThemedText } from '../themed-text';
import { ThemedView } from '../themed-view';
import { MapPin, Users, School, Bookmark, CheckCircle, Clock, XCircle } from 'lucide-react-native';
import { Colors, Spacing } from '@/constants/theme';
import { useRouter } from 'expo-router';
import { useAuth } from '@/context/AuthContext';

export interface EventType {
  id: string | number;
  title: string;
  category: string;
  date: string;
  university: string;
  universityLogo?: string;
  organizer: string;
  organizerLogo?: string;
  description: string;
  location: string;
  status?: string;
}

interface EventCardProps {
  event: EventType;
  isSaved?: boolean;
  onToggleSave?: (id: string | number) => void;
  onPress?: () => void;
  hideSave?: boolean;
  showStatus?: boolean;
}

export function EventCard({ event, isSaved = false, onToggleSave, onPress, hideSave = false, showStatus = false }: EventCardProps) {
  const scheme = useColorScheme();
  const colors = Colors[scheme === 'dark' ? 'dark' : 'light'];
  const router = useRouter();
  const { user, setGuestMode } = useAuth();

  const handleSaveClick = () => {
    if (!user) {
      setGuestMode?.(false);
      return;
    }
    if (onToggleSave) {
      onToggleSave(event.id);
    }
  };

  const handlePress = () => {
    if (!user) {
      setGuestMode?.(false);
      return;
    }
    if (onPress) {
      onPress();
    } else {
      // Default navigation if not overridden
      router.push(`/event/${event.id}`);
    }
  };

  return (
    <TouchableOpacity activeOpacity={0.8} onPress={handlePress}>
      <ThemedView style={[styles.card, { backgroundColor: colors.backgroundElement, borderColor: colors.backgroundSelected }]}>
        
        {/* Kategori ve Tarih */}
        <View style={styles.headerRow}>
          <View style={styles.categoryBadge}>
            <ThemedText style={styles.categoryText}>{event.category}</ThemedText>
          </View>
          <View style={styles.dateAndSave}>
            <ThemedText style={[styles.dateText, { color: colors.textSecondary }]}>{event.date}</ThemedText>
            
            {showStatus && event.status ? (
              <View style={[styles.inlineStatusBadge, { backgroundColor: event.status === 'approved' ? 'rgba(34, 197, 94, 0.1)' : event.status === 'pending' ? 'rgba(245, 158, 11, 0.1)' : 'rgba(239, 68, 68, 0.1)' }]}>
                {event.status === 'approved' ? <CheckCircle size={12} color="#22c55e" /> : event.status === 'pending' ? <Clock size={12} color="#f59e0b" /> : <XCircle size={12} color="#ef4444" />}
                <ThemedText style={[styles.inlineStatusBadgeText, { color: event.status === 'approved' ? '#22c55e' : event.status === 'pending' ? '#f59e0b' : '#ef4444' }]}>
                  {event.status === 'approved' ? 'Onaylandı' : event.status === 'pending' ? 'Bekliyor' : 'Reddedildi'}
                </ThemedText>
              </View>
            ) : !hideSave ? (
              <TouchableOpacity 
                onPress={handleSaveClick}
                hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
                style={styles.saveButton}
              >
                <Bookmark 
                  size={20} 
                  color={isSaved ? colors.text : colors.textSecondary} 
                  fill={isSaved ? colors.text : 'transparent'} 
                />
              </TouchableOpacity>
            ) : null}
          </View>
        </View>

        {/* Başlık */}
        <ThemedText style={[styles.title, { color: colors.text }]} numberOfLines={2}>
          {event.title}
        </ThemedText>

        {/* Üniversite ve Düzenleyici */}
        <View style={styles.metaRow}>
          <View style={styles.metaItem}>
            {event.universityLogo ? (
              <Image source={{ uri: event.universityLogo }} style={styles.metaLogoSquare} />
            ) : (
              <School size={14} color="#3b82f6" />
            )}
            <ThemedText style={[styles.metaText, { color: colors.textSecondary }]} numberOfLines={1}>{event.university}</ThemedText>
          </View>

          <View style={styles.metaItem}>
            {event.organizerLogo ? (
              <Image source={{ uri: event.organizerLogo }} style={styles.metaLogoCircle} />
            ) : (
              <Users size={14} color={colors.textSecondary} />
            )}
            <ThemedText style={[styles.metaText, { color: colors.textSecondary }]} numberOfLines={1}>{event.organizer}</ThemedText>
          </View>
        </View>

        {/* Açıklama */}
        <ThemedText style={[styles.description, { color: colors.textSecondary }]} numberOfLines={2}>
          {event.description}
        </ThemedText>

        {/* Konum ve Detay */}
        <View style={[styles.footer, { borderTopColor: colors.backgroundSelected }]}>
          <View style={styles.locationContainer}>
            <MapPin size={14} color="#ef4444" />
            <ThemedText style={[styles.locationText, { color: colors.textSecondary }]} numberOfLines={1}>
              {event.location}
            </ThemedText>
          </View>
          <ThemedText style={styles.detailText} type="link">
            İncele &rarr;
          </ThemedText>
        </View>

      </ThemedView>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  card: {
    borderRadius: Spacing.three,
    padding: Spacing.four,
    marginBottom: Spacing.three,
    borderWidth: 1,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 2,
  },
  headerRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: Spacing.three,
  },
  categoryBadge: {
    backgroundColor: 'rgba(56, 189, 248, 0.1)', // Light blue tint
    paddingHorizontal: Spacing.two,
    paddingVertical: 4,
    borderRadius: Spacing.one,
  },
  categoryText: {
    fontSize: 10,
    fontWeight: '700',
    color: '#38bdf8', // Blue text for category
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  dateAndSave: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.two,
  },
  dateText: {
    fontSize: 12,
    fontWeight: '500',
  },
  saveButton: {
    padding: 2,
  },
  inlineStatusBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
  },
  inlineStatusBadgeText: {
    fontSize: 10,
    fontWeight: '700',
  },
  title: {
    fontSize: 16,
    fontWeight: '700',
    marginBottom: Spacing.two,
  },
  metaRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: Spacing.three,
    marginBottom: Spacing.three,
  },
  metaItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  metaLogoSquare: {
    width: 14,
    height: 14,
    borderRadius: 2,
    resizeMode: 'contain',
  },
  metaLogoCircle: {
    width: 14,
    height: 14,
    borderRadius: 7,
  },
  metaText: {
    fontSize: 12,
    fontWeight: '500',
  },
  description: {
    fontSize: 13,
    lineHeight: 18,
    marginBottom: Spacing.three,
  },
  footer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingTop: Spacing.three,
    borderTopWidth: StyleSheet.hairlineWidth,
  },
  locationContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    flex: 1,
    paddingRight: Spacing.two,
  },
  locationText: {
    fontSize: 12,
    fontWeight: '500',
  },
  detailText: {
    fontSize: 13,
    fontWeight: '700',
  },
});
