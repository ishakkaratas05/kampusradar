import React, { useEffect, useState, useRef } from 'react';
import { 
  View, Text, StyleSheet, Image, TouchableOpacity, Dimensions, 
  ScrollView, ActivityIndicator, Animated, Easing, Modal, SafeAreaView
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { ArrowRight, School, MapPin, Calendar, Info, Users, ArrowLeft } from 'lucide-react-native';
import { supabase } from '../../lib/supabaseClient';

interface WelcomeScreenProps {
  onNavigateToLogin: () => void;
  onNavigateToRegister: () => void;
}

interface University {
  id: string;
  name: string;
  city: string;
  founded: string;
  history: string;
  logo_url: string;
  abbreviation: string;
}

interface Club {
  id: string;
  full_name: string;
  email: string;
  logo_url: string;
}

const { width, height } = Dimensions.get('window');

export function WelcomeScreen({ onNavigateToLogin, onNavigateToRegister }: WelcomeScreenProps) {
  const [universities, setUniversities] = useState<University[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Modal & Clubs state
  const [selectedUni, setSelectedUni] = useState<University | null>(null);
  const [uniClubs, setUniClubs] = useState<Club[]>([]);
  const [loadingClubs, setLoadingClubs] = useState(false);

  useEffect(() => {
    async function fetchUniversities() {
      try {
        setLoading(true);
        const { data, error } = await supabase
          .from('universities')
          .select('*')
          .order('name', { ascending: true });

        if (error) throw error;
        setUniversities(data || []);
      } catch (err: any) {
        console.error('Üniversiteler yüklenirken hata:', err.message);
        setError(err.message);
      } finally {
        setLoading(false);
      }
    }
    fetchUniversities();
  }, []);

  const handleUniversityClick = async (uni: University) => {
    setSelectedUni(uni);
    setLoadingClubs(true);
    setUniClubs([]); // reset
    try {
      const { data, error } = await supabase
        .from('profiles')
        .select('id, full_name, email, logo_url')
        .eq('role', 'organizer')
        .eq('university_id', uni.id)
        .order('full_name', { ascending: true });

      if (error) throw error;
      setUniClubs(data || []);
    } catch (err: any) {
      console.error('Topluluklar yüklenirken hata:', err.message);
    } finally {
      setLoadingClubs(false);
    }
  };

  return (
    <>
      <ScrollView style={styles.container} showsVerticalScrollIndicator={false} bounces={false}>
        <LinearGradient 
          colors={['#0f172a', '#1e293b']} 
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={styles.heroSection}
        >
          <View style={styles.logoContainer}>
            <Image 
              source={{ uri: 'https://vwtzkppabmkncbsthgdw.supabase.co/storage/v1/object/public/public-assets/applogo/logo_kampusradar.png' }}
              style={styles.heroLogoImage}
              resizeMode="contain"
            />
            <Text style={styles.brandName}>KampüsRadar</Text>
          </View>

          <View style={styles.textContainer}>
            <Text style={styles.title}>
              Üniversitendeki Tüm Etkinlikler Tek Bir Radarda!
            </Text>
            <Text style={styles.subtitle}>
              KampüsRadar, öğrencilerin kendi kampüslerindeki şenlik, konferans, turnuva ve seminerlerden anında haberdar olmasını sağlayan ortak bir platformdur.
            </Text>
          </View>

          <View style={styles.buttonContainer}>
            <TouchableOpacity 
              style={styles.primaryButton}
              onPress={onNavigateToLogin}
              activeOpacity={0.8}
            >
              <Text style={styles.primaryButtonText}>Keşfetmeye Başla</Text>
              <ArrowRight color="#0f172a" size={20} />
            </TouchableOpacity>
          </View>
        </LinearGradient>

        <View style={styles.universitiesSection}>
          <View style={styles.sectionHeader}>
            <Text style={styles.sectionTitle}>Sistemdeki Üniversiteler</Text>
            <Text style={styles.sectionSubtitle}>KampüsRadar ağına katılmış aktif kampüsler</Text>
          </View>

          {loading ? (
            <ActivityIndicator size="large" color="#0f172a" style={{ marginTop: 20 }} />
          ) : error ? (
            <View style={styles.errorContainer}>
              <Text style={styles.errorText}>Üniversiteler yüklenemedi: {error}</Text>
            </View>
          ) : universities.length === 0 ? (
            <View style={styles.emptyContainer}>
              <Text style={styles.emptyText}>Henüz kayıtlı üniversite bulunmuyor.</Text>
            </View>
          ) : (
            <View style={styles.cardsContainer}>
              {universities.map((uni) => (
                <TouchableOpacity 
                  key={uni.id} 
                  style={styles.uniCard}
                  activeOpacity={0.7}
                  onPress={() => handleUniversityClick(uni)}
                >
                  <View style={styles.uniCardHeader}>
                    <View style={styles.uniLogoContainer}>
                      {uni.logo_url ? (
                        <Image source={{ uri: uni.logo_url }} style={styles.uniLogo} resizeMode="contain" />
                      ) : (
                        <School color="#94a3b8" size={32} />
                      )}
                    </View>
                    <View style={styles.uniInfo}>
                      <Text style={styles.uniName}>{uni.name}</Text>
                      <View style={styles.badgesContainer}>
                        <View style={styles.badgeRed}>
                          <MapPin color="#b91c1c" size={10} />
                          <Text style={styles.badgeTextRed}>{uni.city}</Text>
                        </View>
                        <View style={styles.badgeBlue}>
                          <Calendar color="#1d4ed8" size={10} />
                          <Text style={styles.badgeTextBlue}>Kuruluş: {uni.founded}</Text>
                        </View>
                      </View>
                    </View>
                  </View>
                  {uni.history ? (
                    <View style={styles.historyContainer}>
                      <Info color="#94a3b8" size={14} style={{ marginTop: 2, marginRight: 6 }} />
                      <Text style={styles.historyText} numberOfLines={3}>{uni.history}</Text>
                    </View>
                  ) : null}
                </TouchableOpacity>
              ))}
            </View>
          )}
        </View>
        
        {!loading && universities.length > 0 && (
          <View style={styles.marqueeSection}>
            <View style={styles.marqueeHeader}>
              <Text style={styles.marqueeHeaderText}>KAMPÜSRADAR AĞINA KATILAN ÜNİVERSİTELER</Text>
            </View>
            <Marquee universities={universities} />
          </View>
        )}

        <View style={styles.footer}>
          <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 12 }}>
            <Image 
              source={{ uri: 'https://vwtzkppabmkncbsthgdw.supabase.co/storage/v1/object/public/public-assets/applogo/logo_kampusradar.png' }}
              style={{ width: 24, height: 24, marginRight: 8, tintColor: '#94a3b8' }}
              resizeMode="contain"
            />
            <Text style={{ fontSize: 16, fontWeight: '800', color: '#94a3b8' }}>KampüsRadar</Text>
          </View>
          <Text style={styles.footerText}>© 2026 KampüsRadar. Tüm hakları saklıdır.</Text>
          <Text style={styles.footerSubText}>Türkiye'nin En Büyük Kampüs Etkinlik Ağı</Text>
        </View>
      </ScrollView>

      <Modal
        visible={!!selectedUni}
        animationType="slide"
        presentationStyle="fullScreen"
        onRequestClose={() => setSelectedUni(null)}
      >
        <SafeAreaView style={styles.modalContainer}>
          <View style={styles.modalHeader}>
            <TouchableOpacity onPress={() => setSelectedUni(null)} style={styles.closeButton}>
              <ArrowLeft color="#64748b" size={24} />
            </TouchableOpacity>
            <Text style={styles.modalHeaderTitle} numberOfLines={1}>
              {selectedUni?.name}
            </Text>
            <View style={{ width: 40 }} />
          </View>

          <ScrollView style={styles.modalScroll} showsVerticalScrollIndicator={false}>
            {selectedUni && (
              <View style={styles.modalUniCard}>
                <View style={styles.modalUniLogoWrapper}>
                  {selectedUni.logo_url ? (
                    <Image source={{ uri: selectedUni.logo_url }} style={styles.modalUniLogo} resizeMode="contain" />
                  ) : (
                    <School color="#94a3b8" size={48} />
                  )}
                </View>
                <Text style={styles.modalUniName}>{selectedUni.name}</Text>
                
                <View style={[styles.badgesContainer, { justifyContent: 'center', marginTop: 12 }]}>
                  <View style={styles.badgeRed}>
                    <MapPin color="#b91c1c" size={12} />
                    <Text style={[styles.badgeTextRed, { fontSize: 12 }]}>{selectedUni.city}</Text>
                  </View>
                  <View style={styles.badgeBlue}>
                    <Calendar color="#1d4ed8" size={12} />
                    <Text style={[styles.badgeTextBlue, { fontSize: 12 }]}>Kuruluş: {selectedUni.founded}</Text>
                  </View>
                </View>
                
                <Text style={styles.modalUniHistory}>{selectedUni.history}</Text>
              </View>
            )}

            <View style={styles.clubsSection}>
              <Text style={styles.clubsSectionTitle}>Öğrenci Toplulukları / Kulüpler</Text>
              <Text style={styles.clubsSectionSubtitle}>
                Bu üniversite bünyesinde etkinlik düzenleyen aktif topluluklar.
              </Text>

              {loadingClubs ? (
                <View style={styles.modalEmptyContainer}>
                  <ActivityIndicator size="large" color="#0f172a" />
                  <Text style={styles.modalEmptyText}>Topluluklar yükleniyor...</Text>
                </View>
              ) : uniClubs.length === 0 ? (
                <View style={styles.modalEmptyContainer}>
                  <School color="#cbd5e1" size={48} style={{ marginBottom: 12 }} />
                  <Text style={styles.modalEmptyText}>
                    Bu üniversitede henüz kayıtlı bir öğrenci topluluğu bulunmuyor.
                  </Text>
                </View>
              ) : (
                <View style={styles.clubsList}>
                  {uniClubs.map((club) => (
                    <View key={club.id} style={styles.clubCard}>
                      <View style={styles.clubLogoWrapper}>
                        {club.logo_url ? (
                          <Image source={{ uri: club.logo_url }} style={styles.clubLogo} resizeMode="cover" />
                        ) : (
                          <Users color="#cbd5e1" size={24} />
                        )}
                      </View>
                      <View style={styles.clubInfo}>
                        <Text style={styles.clubName} numberOfLines={2}>{club.full_name}</Text>
                        <Text style={styles.clubEmail} numberOfLines={1}>{club.email}</Text>
                        <View style={styles.activeBadge}>
                          <Text style={styles.activeBadgeText}>AKTİF TOPLULUK</Text>
                        </View>
                      </View>
                    </View>
                  ))}
                </View>
              )}
            </View>
          </ScrollView>
        </SafeAreaView>
      </Modal>
    </>
  );
}

// Marquee Component
const Marquee = ({ universities }: { universities: University[] }) => {
  const scrollAnim = useRef(new Animated.Value(0)).current;
  const [contentWidth, setContentWidth] = useState(0);

  useEffect(() => {
    if (contentWidth > 0) {
      Animated.loop(
        Animated.timing(scrollAnim, {
          toValue: -contentWidth / 2, 
          duration: (contentWidth / 2) * 30, // Adjust speed (higher is slower)
          useNativeDriver: true,
          easing: Easing.linear,
        })
      ).start();
    }
  }, [contentWidth]);

  if (!universities || universities.length === 0) return null;

  // Duplicate for seamless loop
  const duplicatedData = [...universities, ...universities];

  return (
    <View style={styles.marqueeContainer}>
      <Animated.View 
        style={[styles.marqueeTrack, { transform: [{ translateX: scrollAnim }] }]}
        onLayout={(e) => setContentWidth(e.nativeEvent.layout.width)}
      >
        {duplicatedData.map((uni, index) => (
          <View key={`${uni.id}-${index}`} style={styles.marqueeItem}>
            {uni.logo_url ? (
              <Image source={{ uri: uni.logo_url }} style={styles.marqueeImage} resizeMode="contain" />
            ) : (
              <Text style={styles.marqueeFallbackText}>{uni.abbreviation}</Text>
            )}
          </View>
        ))}
      </Animated.View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f8fafc', 
  },
  heroSection: {
    paddingHorizontal: 24,
    minHeight: height,
    justifyContent: 'center',
    backgroundColor: '#0f172a', 
    shadowColor: '#0f172a',
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.1,
    shadowRadius: 20,
    elevation: 5,
    zIndex: 10,
  },
  logoContainer: {
    alignItems: 'center',
    marginBottom: 40,
  },
  heroLogoImage: {
    width: 120,
    height: 120,
    marginBottom: 20,
  },
  brandName: {
    fontSize: 28,
    fontWeight: '800',
    color: '#ffffff',
    letterSpacing: -0.5,
  },
  textContainer: {
    justifyContent: 'center',
    marginBottom: 40,
  },
  title: {
    fontSize: 32,
    fontWeight: '800',
    color: '#ffffff',
    textAlign: 'center',
    lineHeight: 40,
    marginBottom: 16,
  },
  subtitle: {
    fontSize: 16,
    color: '#94a3b8',
    textAlign: 'center',
    lineHeight: 24,
  },
  buttonContainer: {
    gap: 16,
  },
  primaryButton: {
    backgroundColor: '#ffffff',
    borderRadius: 16,
    paddingVertical: 18,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1,
    shadowRadius: 12,
    elevation: 4,
  },
  primaryButtonText: {
    color: '#0f172a',
    fontSize: 18,
    fontWeight: '700',
  },
  universitiesSection: {
    paddingHorizontal: 20,
    paddingTop: 48,
    paddingBottom: 24,
  },
  sectionHeader: {
    alignItems: 'center',
    marginBottom: 24,
  },
  sectionTitle: {
    fontSize: 24,
    fontWeight: '800',
    color: '#0f172a',
    textAlign: 'center',
  },
  sectionSubtitle: {
    fontSize: 14,
    color: '#64748b',
    marginTop: 6,
    textAlign: 'center',
  },
  cardsContainer: {
    gap: 16,
  },
  uniCard: {
    backgroundColor: '#ffffff',
    borderRadius: 16,
    padding: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.05,
    shadowRadius: 12,
    elevation: 2,
    borderWidth: 1,
    borderColor: '#e2e8f0',
  },
  uniCardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  uniLogoContainer: {
    width: 80,
    height: 80,
    borderRadius: 16,
    backgroundColor: '#f8fafc',
    borderWidth: 1,
    borderColor: '#f1f5f9',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 16,
    overflow: 'hidden',
  },
  uniLogo: {
    width: '100%',
    height: '100%',
  },
  uniInfo: {
    flex: 1,
  },
  uniName: {
    fontSize: 18,
    fontWeight: '800',
    color: '#0f172a',
    marginBottom: 10,
    letterSpacing: -0.3,
  },
  badgesContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 6,
  },
  badgeRed: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#fef2f2',
    borderWidth: 1,
    borderColor: '#fee2e2',
    paddingHorizontal: 6,
    paddingVertical: 3,
    borderRadius: 6,
    gap: 4,
  },
  badgeTextRed: {
    fontSize: 10,
    fontWeight: '700',
    color: '#b91c1c',
  },
  badgeBlue: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#eff6ff',
    borderWidth: 1,
    borderColor: '#dbeafe',
    paddingHorizontal: 6,
    paddingVertical: 3,
    borderRadius: 6,
    gap: 4,
  },
  badgeTextBlue: {
    fontSize: 10,
    fontWeight: '700',
    color: '#1d4ed8',
  },
  historyContainer: {
    flexDirection: 'row',
    marginTop: 16,
    paddingTop: 16,
    borderTopWidth: 1,
    borderTopColor: '#f1f5f9',
  },
  historyText: {
    flex: 1,
    fontSize: 13,
    color: '#64748b',
    lineHeight: 18,
  },
  errorContainer: {
    padding: 16,
    backgroundColor: '#fef2f2',
    borderRadius: 12,
  },
  errorText: {
    color: '#ef4444',
    textAlign: 'center',
  },
  emptyContainer: {
    padding: 24,
    alignItems: 'center',
    backgroundColor: '#ffffff',
    borderRadius: 16,
  },
  emptyText: {
    color: '#64748b',
  },
  // Marquee Styles
  marqueeSection: {
    backgroundColor: '#ffffff',
    paddingVertical: 30,
    borderTopWidth: 1,
    borderBottomWidth: 1,
    borderColor: '#f1f5f9',
    marginTop: 20,
    overflow: 'hidden',
  },
  marqueeHeader: {
    alignItems: 'center',
    marginBottom: 20,
  },
  marqueeHeaderText: {
    fontSize: 11,
    fontWeight: '800',
    color: '#94a3b8',
    letterSpacing: 2,
  },
  marqueeContainer: {
    flexDirection: 'row',
  },
  marqueeTrack: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  marqueeItem: {
    width: 80,
    height: 80,
    backgroundColor: '#f8fafc',
    borderWidth: 1,
    borderColor: '#f1f5f9',
    borderRadius: 16,
    marginHorizontal: 12,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 1,
  },
  marqueeImage: {
    width: '100%',
    height: '100%',
    opacity: 0.8,
  },
  marqueeFallbackText: {
    fontSize: 14,
    fontWeight: '800',
    color: '#94a3b8',
  },
  footer: {
    padding: 30,
    alignItems: 'center',
    backgroundColor: '#f8fafc',
  },
  footerText: {
    fontSize: 12,
    color: '#64748b',
    fontWeight: '600',
  },
  footerSubText: {
    fontSize: 10,
    color: '#94a3b8',
    marginTop: 6,
  },
  // Modal Styles
  modalContainer: {
    flex: 1,
    backgroundColor: '#f8fafc',
  },
  modalHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 12,
    backgroundColor: '#ffffff',
    borderBottomWidth: 1,
    borderBottomColor: '#f1f5f9',
  },
  closeButton: {
    padding: 8,
  },
  modalHeaderTitle: {
    flex: 1,
    textAlign: 'center',
    fontSize: 18,
    fontWeight: '800',
    color: '#0f172a',
  },
  modalScroll: {
    flex: 1,
  },
  modalUniCard: {
    backgroundColor: '#ffffff',
    margin: 16,
    padding: 24,
    borderRadius: 24,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.05,
    shadowRadius: 12,
    elevation: 2,
    borderWidth: 1,
    borderColor: '#f1f5f9',
  },
  modalUniLogoWrapper: {
    width: 100,
    height: 100,
    backgroundColor: '#f8fafc',
    borderRadius: 24,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 16,
    borderWidth: 1,
    borderColor: '#e2e8f0',
  },
  modalUniLogo: {
    width: 70,
    height: 70,
  },
  modalUniName: {
    fontSize: 24,
    fontWeight: '800',
    color: '#0f172a',
    textAlign: 'center',
  },
  modalUniHistory: {
    fontSize: 14,
    color: '#64748b',
    lineHeight: 22,
    textAlign: 'center',
    marginTop: 20,
  },
  clubsSection: {
    paddingHorizontal: 16,
    paddingBottom: 40,
  },
  clubsSectionTitle: {
    fontSize: 20,
    fontWeight: '800',
    color: '#0f172a',
    marginBottom: 4,
  },
  clubsSectionSubtitle: {
    fontSize: 14,
    color: '#64748b',
    marginBottom: 20,
  },
  modalEmptyContainer: {
    backgroundColor: '#ffffff',
    borderRadius: 16,
    padding: 32,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: '#f1f5f9',
  },
  modalEmptyText: {
    color: '#94a3b8',
    textAlign: 'center',
    fontWeight: '600',
  },
  clubsList: {
    gap: 12,
  },
  clubCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#ffffff',
    borderRadius: 16,
    padding: 16,
    borderWidth: 1,
    borderColor: '#f1f5f9',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.03,
    shadowRadius: 8,
    elevation: 1,
  },
  clubLogoWrapper: {
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: '#f8fafc',
    borderWidth: 1,
    borderColor: '#e2e8f0',
    justifyContent: 'center',
    alignItems: 'center',
    overflow: 'hidden',
    marginRight: 16,
  },
  clubLogo: {
    width: '100%',
    height: '100%',
  },
  clubInfo: {
    flex: 1,
  },
  clubName: {
    fontSize: 16,
    fontWeight: '800',
    color: '#0f172a',
    marginBottom: 4,
  },
  clubEmail: {
    fontSize: 12,
    color: '#64748b',
    fontWeight: '500',
    marginBottom: 8,
  },
  activeBadge: {
    alignSelf: 'flex-start',
    backgroundColor: '#eef2ff',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 4,
    borderWidth: 1,
    borderColor: '#e0e7ff',
  },
  activeBadgeText: {
    fontSize: 9,
    fontWeight: '800',
    color: '#4f46e5',
    letterSpacing: 0.5,
  },
});
