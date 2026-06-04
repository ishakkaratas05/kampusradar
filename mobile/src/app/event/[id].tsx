import React, { useState, useEffect } from 'react';
import { View, StyleSheet, ScrollView, ActivityIndicator, TouchableOpacity, Image, Alert, Dimensions, Modal } from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { ArrowLeft, Bookmark, School, Calendar, MapPin, CheckCircle, Clock, XCircle, AlertCircle } from 'lucide-react-native';

import { ThemedText } from '@/components/themed-text';
import { useAuth } from '@/context/AuthContext';
import { supabase } from '@/lib/supabaseClient';
import { Colors, Spacing } from '@/constants/theme';
import { useColorScheme } from '@/hooks/use-color-scheme';

const { width: SCREEN_WIDTH } = Dimensions.get('window');

export default function EventDetailScreen() {
  const { id } = useLocalSearchParams();
  const router = useRouter();
  const { user } = useAuth();
  const insets = useSafeAreaInsets();
  const scheme = useColorScheme();
  const colors = Colors[scheme === 'dark' ? 'dark' : 'light'];

  const [event, setEvent] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  
  const [isSaved, setIsSaved] = useState(false);
  const [participation, setParticipation] = useState<string | null>(null);
  const [actionLoading, setActionLoading] = useState(false);
  const [alertModal, setAlertModal] = useState({ visible: false, title: '', message: '', type: 'success' });

  useEffect(() => {
    async function fetchEventDetails() {
      try {
        setLoading(true);
        const { data, error } = await supabase
          .from('events')
          .select(`*, universities(name, logo_url), profiles:organizer_id(full_name, logo_url)`)
          .eq('id', id)
          .single();

        if (error) throw error;
        
        setEvent({
          id: data.id,
          title: data.title,
          description: data.description,
          category: data.category,
          date: data.date ? new Date(data.date).toLocaleString('tr-TR', { day: 'numeric', month: 'long', year: 'numeric', hour: '2-digit', minute: '2-digit' }) : '',
          location: data.location,
          university: data.universities?.name || 'Bilinmeyen Üniversite',
          universityLogo: data.universities?.logo_url,
          organizer: data.profiles?.full_name || 'Bilinmeyen Topluluk',
          organizerLogo: data.profiles?.logo_url,
          posterUrl: data.image_url,
          requiresApproval: data.requires_approval
        });
      } catch (err) {
        console.error(err);
      } finally {
        setLoading(false);
      }
    }
    fetchEventDetails();
  }, [id]);

  useEffect(() => {
    async function checkUserStatus() {
      if (!user || !id) return;
      try {
        const [savedRes, partRes] = await Promise.all([
          supabase.from('saved_events').select('id').eq('student_id', user.id).eq('event_id', id).maybeSingle(),
          supabase.from('event_participants').select('status').eq('student_id', user.id).eq('event_id', id).maybeSingle()
        ]);
        if (savedRes.data) setIsSaved(true);
        if (partRes.data) setParticipation(partRes.data.status);
      } catch (e) {
        console.error(e);
      }
    }
    checkUserStatus();
  }, [user, id]);

  const handleToggleSave = async () => {
    if (!user) {
      setAlertModal({ visible: true, title: "Giriş Yapın", message: "Bu işlem için giriş yapmalısınız.", type: "warning" });
      return;
    }
    try {
      setActionLoading(true);
      if (isSaved) {
        await supabase.from('saved_events').delete().eq('student_id', user.id).eq('event_id', id);
        setIsSaved(false);
      } else {
        await supabase.from('saved_events').insert({ student_id: user.id, event_id: id });
        setIsSaved(true);
      }
    } catch (e) {
      console.error(e);
    } finally {
      setActionLoading(false);
    }
  };

  const handleToggleJoin = async () => {
    if (!user) {
      setAlertModal({ visible: true, title: "Giriş Yapın", message: "Bu işlem için giriş yapmalısınız.", type: "warning" });
      return;
    }
    try {
      setActionLoading(true);
      if (participation) {
        await supabase.from('event_participants').delete().eq('student_id', user.id).eq('event_id', id);
        setParticipation(null);
      } else {
        const initialStatus = event.requiresApproval ? 'pending' : 'approved';
        const { data, error } = await supabase.from('event_participants').insert({
          student_id: user.id,
          event_id: id,
          status: initialStatus
        }).select().single();
        if (error) throw error;
        setParticipation(data.status);
      }
    } catch (e: any) {
      setAlertModal({ visible: true, title: "Hata", message: e.message, type: "error" });
    } finally {
      setActionLoading(false);
    }
  };

  if (loading) {
    return (
      <View style={[styles.container, { justifyContent: 'center', alignItems: 'center', backgroundColor: colors.background }]}>
        <ActivityIndicator size="large" color="#0284c7" />
        <ThemedText style={{ marginTop: Spacing.four, color: colors.textSecondary }}>Etkinlik yükleniyor...</ThemedText>
      </View>
    );
  }

  if (!event) {
    return (
      <View style={[styles.container, { justifyContent: 'center', alignItems: 'center', backgroundColor: colors.background }]}>
        <AlertCircle size={48} color="#ef4444" />
        <ThemedText style={{ marginTop: Spacing.four, color: colors.text, fontSize: 18, fontWeight: '700' }}>Etkinlik Bulunamadı</ThemedText>
        <TouchableOpacity style={styles.backButton} onPress={() => router.back()}>
          <ThemedText style={{ color: '#ffffff', fontWeight: '700' }}>Geri Dön</ThemedText>
        </TouchableOpacity>
      </View>
    );
  }

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      {/* Header (Instagram post style top header) */}
      <View style={[styles.header, { paddingTop: insets.top + Spacing.two, backgroundColor: colors.backgroundElement, borderBottomColor: colors.backgroundSelected }]}>
        <TouchableOpacity onPress={() => router.back()} style={styles.headerBtn}>
          <ArrowLeft size={24} color={colors.text} />
        </TouchableOpacity>
        
        <View style={styles.headerTitleContainer}>
          {event.organizerLogo ? (
            <Image source={{ uri: event.organizerLogo }} style={[styles.headerOrgLogo, { borderColor: colors.backgroundSelected }]} />
          ) : (
            <View style={styles.headerOrgLogoPlaceholder}>
              <ThemedText style={{ fontSize: 12, fontWeight: '800', color: '#ffffff' }}>{event.organizer[0].toUpperCase()}</ThemedText>
            </View>
          )}
          <View style={{ flex: 1, paddingRight: 8 }}>
            <ThemedText style={[styles.headerOrgName, { color: colors.text }]} numberOfLines={1}>{event.organizer}</ThemedText>
            <ThemedText style={[styles.headerUniName, { color: colors.textSecondary }]} numberOfLines={1}>{event.university}</ThemedText>
          </View>
        </View>

        <TouchableOpacity onPress={handleToggleSave} style={styles.headerBtn} disabled={actionLoading}>
          <Bookmark size={24} color={isSaved ? colors.text : colors.textSecondary} fill={isSaved ? colors.text : 'transparent'} />
        </TouchableOpacity>
      </View>

      <ScrollView contentContainerStyle={[styles.scrollContent, { paddingBottom: Math.max(insets.bottom + Spacing.four, Spacing.six) }]} bounces={false}>
        {/* Poster - 4:5 Aspect Ratio directly attached to top header */}
        <View style={styles.posterWrapper}>
          {event.posterUrl ? (
            <Image 
              source={{ uri: event.posterUrl }} 
              style={styles.poster} 
              resizeMode="contain" 
            />
          ) : (
            <View style={[styles.poster, styles.noPoster, { backgroundColor: colors.backgroundSelected }]}>
              <Image source={require('@/assets/images/react-logo.png')} style={{ opacity: 0.2, width: 100, height: 100 }} />
            </View>
          )}
        </View>

        {/* Details Section */}
        <View style={[styles.detailsContainer, { backgroundColor: colors.background }]}>
          {/* Action / Badges Row */}
          <View style={styles.badgesRow}>
            <View style={[styles.catBadge, { backgroundColor: colors.backgroundSelected }]}>
              <ThemedText style={[styles.catBadgeText, { color: colors.textSecondary }]}>{event.category}</ThemedText>
            </View>
            
            {event.universityLogo && (
              <View style={[styles.uniBadgeSmall, { backgroundColor: colors.background, borderColor: colors.backgroundSelected }]}>
                <Image source={{ uri: event.universityLogo }} style={{ width: 14, height: 14, borderRadius: 4 }} />
                <ThemedText style={[styles.uniBadgeSmallText, { color: colors.textSecondary }]}>{event.university}</ThemedText>
              </View>
            )}
          </View>

          <ThemedText style={[styles.title, { color: colors.text }]}>{event.title}</ThemedText>

          {/* Core Info (Date & Location) */}
          <View style={styles.coreInfoRow}>
            <View style={[styles.coreInfoItem, { backgroundColor: scheme === 'dark' ? 'rgba(2, 132, 199, 0.1)' : '#f0f9ff', borderColor: scheme === 'dark' ? 'rgba(2, 132, 199, 0.2)' : '#e0f2fe' }]}>
              <View style={[styles.iconBox, { backgroundColor: scheme === 'dark' ? 'rgba(2, 132, 199, 0.2)' : '#bae6fd' }]}>
                <Calendar size={16} color="#38bdf8" />
              </View>
              <ThemedText style={[styles.coreInfoText, { color: scheme === 'dark' ? '#bae6fd' : '#0369a1' }]}>{event.date}</ThemedText>
            </View>
            <View style={[styles.coreInfoItem, { backgroundColor: scheme === 'dark' ? 'rgba(245, 158, 11, 0.1)' : '#fffbeb', borderColor: scheme === 'dark' ? 'rgba(245, 158, 11, 0.2)' : '#fef3c7' }]}>
              <View style={[styles.iconBox, { backgroundColor: scheme === 'dark' ? 'rgba(245, 158, 11, 0.2)' : '#fde68a' }]}>
                <MapPin size={16} color="#fbbf24" />
              </View>
              <ThemedText style={[styles.coreInfoText, { color: scheme === 'dark' ? '#fde68a' : '#b45309' }]}>{event.location}</ThemedText>
            </View>
          </View>

          {/* Description */}
          <ThemedText style={[styles.description, { color: colors.textSecondary }]}>
            <ThemedText style={{ fontWeight: '800', color: colors.text }}>{event.organizer} </ThemedText>
            {event.description}
          </ThemedText>
        </View>

        {/* Action Footer (Now inline at the bottom of the scroll view) */}
        <View style={[styles.footer, { backgroundColor: colors.background }]}>
          {participation === 'approved' ? (
            <View style={styles.statusWrap}>
              <View style={styles.statusBox}>
                <CheckCircle size={16} color="#22c55e" />
                <ThemedText style={{ color: '#22c55e', fontWeight: '700', fontSize: 13 }}>Katılıyorsun</ThemedText>
              </View>
              <TouchableOpacity style={styles.cancelBtn} onPress={handleToggleJoin} disabled={actionLoading}>
                <ThemedText style={styles.cancelBtnText}>İptal Et</ThemedText>
              </TouchableOpacity>
            </View>
          ) : participation === 'pending' ? (
            <View style={styles.statusWrap}>
              <View style={[styles.statusBox, { backgroundColor: 'rgba(245, 158, 11, 0.1)', borderColor: 'rgba(245, 158, 11, 0.2)' }]}>
                <Clock size={16} color="#f59e0b" />
                <ThemedText style={{ color: '#f59e0b', fontWeight: '700', fontSize: 13 }}>Onay Bekliyor</ThemedText>
              </View>
              <TouchableOpacity style={styles.cancelBtn} onPress={handleToggleJoin} disabled={actionLoading}>
                <ThemedText style={styles.cancelBtnText}>Geri Çek</ThemedText>
              </TouchableOpacity>
            </View>
          ) : participation === 'rejected' ? (
            <View style={[styles.statusBox, { backgroundColor: 'rgba(239, 68, 68, 0.1)', borderColor: 'rgba(239, 68, 68, 0.2)', paddingVertical: 14 }]}>
              <XCircle size={18} color="#ef4444" />
              <ThemedText style={{ color: '#ef4444', fontWeight: '700', fontSize: 14 }}>Başvuru Reddedildi</ThemedText>
            </View>
          ) : (
            <TouchableOpacity 
              style={[styles.joinBtnSlate, { backgroundColor: colors.text }]} 
              onPress={handleToggleJoin} 
              disabled={actionLoading}
              activeOpacity={0.8}
            >
              <ThemedText style={[styles.joinBtnSlateText, { color: colors.background }]}>Etkinliğe Katıl</ThemedText>
            </TouchableOpacity>
          )}
        </View>
      </ScrollView>

      {/* Custom Alert Modal */}
      <Modal visible={alertModal.visible} transparent animationType="fade">
        <View style={styles.alertOverlay}>
          <View style={styles.alertBox}>
            <View style={[styles.alertIconContainer, { backgroundColor: alertModal.type === 'success' ? '#dcfce7' : alertModal.type === 'error' ? '#fee2e2' : '#fef3c7' }]}>
              {alertModal.type === 'success' ? (
                <CheckCircle size={32} color="#22c55e" />
              ) : alertModal.type === 'error' ? (
                <XCircle size={32} color="#ef4444" />
              ) : (
                <AlertCircle size={32} color="#f59e0b" />
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
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f8fafc' },
  
  header: { 
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', 
    paddingHorizontal: Spacing.two, paddingVertical: Spacing.three, backgroundColor: '#ffffff',
    borderBottomWidth: 1, borderBottomColor: '#e2e8f0', zIndex: 10
  },
  headerBtn: { padding: Spacing.two },
  headerTitleContainer: { 
    flex: 1, flexDirection: 'row', alignItems: 'center', gap: 10, paddingHorizontal: 4 
  },
  headerOrgLogo: { width: 32, height: 32, borderRadius: 16, borderWidth: 1, borderColor: '#e2e8f0' },
  headerOrgLogoPlaceholder: { width: 32, height: 32, borderRadius: 16, backgroundColor: '#0284c7', alignItems: 'center', justifyContent: 'center' },
  headerOrgName: { fontSize: 13, fontWeight: '800', color: '#0f172a', lineHeight: 18 },
  headerUniName: { fontSize: 11, fontWeight: '500', color: '#64748b', lineHeight: 16 },
  
  scrollContent: { paddingBottom: Spacing.six },
  
  // Instagram 4:5 Poster Container
  posterWrapper: { 
    width: SCREEN_WIDTH, 
    height: SCREEN_WIDTH * 1.25, // 4:5 Aspect Ratio
    backgroundColor: '#000' 
  },
  poster: { width: '100%', height: '100%' },
  noPoster: { backgroundColor: '#f1f5f9', justifyContent: 'center', alignItems: 'center' },
  
  // Details below poster
  detailsContainer: { padding: Spacing.four, backgroundColor: '#ffffff', zIndex: 2 },
  
  badgesRow: { flexDirection: 'row', flexWrap: 'wrap', gap: Spacing.two, marginBottom: Spacing.three },
  catBadge: { backgroundColor: '#f1f5f9', paddingHorizontal: 12, paddingVertical: 6, borderRadius: 12 },
  catBadgeText: { fontSize: 11, fontWeight: '800', color: '#475569', textTransform: 'uppercase' },
  
  uniBadgeSmall: { flexDirection: 'row', alignItems: 'center', gap: 6, backgroundColor: '#f8fafc', paddingHorizontal: 10, paddingVertical: 6, borderRadius: 12, borderWidth: 1, borderColor: '#e2e8f0' },
  uniBadgeSmallText: { fontSize: 10, fontWeight: '700', color: '#475569' },

  title: { fontSize: 24, fontWeight: '900', color: '#0f172a', marginBottom: Spacing.four, lineHeight: 28 },
  
  coreInfoRow: { flexDirection: 'column', gap: Spacing.three, marginBottom: Spacing.five },
  coreInfoItem: { flexDirection: 'row', alignItems: 'center', gap: 12, paddingVertical: 10, paddingHorizontal: 12, borderRadius: 12, borderWidth: 1 },
  iconBox: { width: 32, height: 32, borderRadius: 16, alignItems: 'center', justifyContent: 'center' },
  coreInfoText: { fontSize: 14, fontWeight: '700', flex: 1 },
  
  description: { fontSize: 14, color: '#334155', lineHeight: 22 },
  
  // Inline Footer
  footer: { 
    paddingHorizontal: Spacing.four,
    paddingBottom: Spacing.five,
    backgroundColor: '#ffffff',
    marginTop: Spacing.two
  },
  
  joinBtnSlate: {
    backgroundColor: '#0f172a', paddingVertical: 16, borderRadius: Spacing.three, 
    alignItems: 'center', justifyContent: 'center', shadowColor: '#000', shadowOpacity: 0.1, shadowRadius: 10
  },
  joinBtnSlateText: { color: '#ffffff', fontSize: 16, fontWeight: '900' },
  
  statusWrap: { gap: Spacing.three },
  statusBox: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: Spacing.two, backgroundColor: '#dcfce7', paddingVertical: 12, borderRadius: Spacing.three, borderWidth: 1, borderColor: '#bbf7d0' },
  cancelBtn: { backgroundColor: '#fee2e2', paddingVertical: 14, borderRadius: Spacing.three, alignItems: 'center', borderWidth: 1, borderColor: '#fecaca' },
  cancelBtnText: { color: '#ef4444', fontWeight: '800', fontSize: 14 },
  
  backButton: { backgroundColor: '#0284c7', paddingHorizontal: 24, paddingVertical: 12, borderRadius: 12, marginTop: 24 },

  // Alert Modal
  alertOverlay: { flex: 1, backgroundColor: 'rgba(15, 23, 42, 0.4)', justifyContent: 'center', alignItems: 'center', padding: Spacing.four },
  alertBox: { backgroundColor: '#ffffff', width: '100%', borderRadius: Spacing.four, padding: Spacing.five, alignItems: 'center', borderWidth: 1, borderColor: '#e2e8f0' },
  alertIconContainer: { width: 64, height: 64, borderRadius: 32, alignItems: 'center', justifyContent: 'center', marginBottom: Spacing.four },
  alertTitle: { fontSize: 20, fontWeight: '800', color: '#0f172a', marginBottom: Spacing.two },
  alertMessage: { fontSize: 14, color: '#475569', textAlign: 'center', marginBottom: Spacing.five },
  alertButton: { backgroundColor: '#0284c7', paddingVertical: Spacing.three, paddingHorizontal: Spacing.six, borderRadius: Spacing.three, width: '100%', alignItems: 'center' },
  alertButtonText: { color: '#ffffff', fontWeight: '800', fontSize: 16 }
});
