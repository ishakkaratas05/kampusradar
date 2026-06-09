import React, { useState, useEffect } from 'react';
import {
  StyleSheet,
  View,
  Text,
  TextInput,
  TouchableOpacity,
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  Modal,
  FlatList,
  Image,
  StatusBar,
} from 'react-native';
import { ArrowLeft, User, Mail, Lock, Building, Search, ChevronDown, CheckCircle2 } from 'lucide-react-native';
import { useAuth } from '../../context/AuthContext';
import { supabase } from '../../lib/supabaseClient';

interface RegisterScreenProps {
  onNavigateToLogin: () => void;
  onBack?: () => void;
}

interface University {
  id: string;
  name: string;
}

export function RegisterScreen({ onNavigateToLogin, onBack }: RegisterScreenProps) {
  const { signUp } = useAuth();

  // Form states
  const [fullName, setFullName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [role, setRole] = useState<'student' | 'organizer'>('student');
  const [selectedUniversity, setSelectedUniversity] = useState<University | null>(null);

  // UI/Flow states
  const [universities, setUniversities] = useState<University[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [isModalVisible, setIsModalVisible] = useState(false);
  const [loadingUnis, setLoadingUnis] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');
  const [successMessage, setSuccessMessage] = useState('');

  // Load Universities
  useEffect(() => {
    async function fetchUniversities() {
      try {
        const { data, error } = await supabase
          .from('universities')
          .select('id, name')
          .order('name', { ascending: true });
        
        if (error) throw error;
        setUniversities(data || []);
      } catch (err: any) {
        console.error('Üniversiteler yüklenemedi:', err.message);
      } finally {
        setLoadingUnis(false);
      }
    }
    fetchUniversities();
  }, []);

  const handleRegister = async () => {
    setErrorMessage('');
    setSuccessMessage('');

    // Validations
    if (!fullName.trim()) return setErrorMessage('Lütfen adınızı ve soyadınızı girin.');
    if (!email.trim()) return setErrorMessage('Lütfen e-posta adresinizi girin.');
    if (!password) return setErrorMessage('Lütfen şifrenizi girin.');
    if (password.length < 6) return setErrorMessage('Şifreniz en az 6 karakter olmalıdır.');
    if (!selectedUniversity) return setErrorMessage('Lütfen bağlı olduğunuz üniversiteyi seçin.');

    setIsSubmitting(true);

    try {
      await signUp(
        email.trim(),
        password,
        fullName.trim(),
        role,
        selectedUniversity.id
      );
      
      setSuccessMessage(
        'Kayıt işleminiz başarıyla gerçekleştirildi! Hesabınızı etkinleştirmek için e-posta adresinize gönderilen doğrulama linkine tıklayın.'
      );
      
      // Clear inputs
      setFullName('');
      setEmail('');
      setPassword('');
      setSelectedUniversity(null);
    } catch (err: any) {
      console.error('Kayıt hatası:', err);
      let msg = err.message || 'Kayıt olurken beklenmedik bir hata oluştu.';
      if (msg.includes('User already registered')) {
        msg = 'Bu e-posta adresiyle kayıtlı bir kullanıcı zaten mevcut.';
      }
      setErrorMessage(msg);
    } finally {
      setIsSubmitting(false);
    }
  };

  const filteredUniversities = universities.filter((uni) =>
    uni.name.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <KeyboardAvoidingView
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      style={styles.container}
    >
      <StatusBar barStyle="dark-content" />

      {/* Geri Dön Butonu - Ekranın tepesinde yüzen (floating) */}
      {onBack && (
        <TouchableOpacity onPress={onBack} style={styles.floatingBackButton}>
          <ArrowLeft color="#475569" size={20} />
          <Text style={styles.floatingBackText}>Geri Dön</Text>
        </TouchableOpacity>
      )}

      <ScrollView contentContainerStyle={styles.scrollContainer} keyboardShouldPersistTaps="handled">
        <View style={styles.cardContainer}>
          
          {/* Logo & Header */}
          <View style={styles.headerContainer}>
            <Image 
              source={{ uri: 'https://vwtzkppabmkncbsthgdw.supabase.co/storage/v1/object/public/public-assets/applogo/logo_kampusradar.png' }}
              style={styles.logoImage}
              resizeMode="contain"
            />
            <Text style={styles.title}>Kayıt Ol</Text>
            <Text style={styles.subtitle}>KampüsRadar'a katıl ve etkinlikleri kaçırma!</Text>
          </View>

          {/* Success Message UI */}
          {successMessage ? (
            <View style={styles.successContainer}>
              <CheckCircle2 color="#34d399" size={48} style={{ marginBottom: 16 }} />
              <Text style={styles.successTitle}>Kayıt Başarılı!</Text>
              <Text style={styles.successText}>{successMessage}</Text>
              <TouchableOpacity
                style={styles.successButton}
                onPress={onNavigateToLogin}
              >
                <Text style={styles.successButtonText}>Giriş Sayfasına Git</Text>
              </TouchableOpacity>
            </View>
          ) : (
            <>
              {/* Error Message */}
              {errorMessage ? (
                <View style={styles.errorContainer}>
                  <Text style={styles.errorText}>{errorMessage}</Text>
                </View>
              ) : null}

              {/* Form */}
              <View style={styles.formContainer}>
                
                {/* Role Switcher */}
                <View style={styles.inputGroup}>
                  <Text style={styles.inputLabel}>Hesap Türü</Text>
                  <View style={styles.roleContainer}>
                    <TouchableOpacity
                      style={[
                        styles.roleButton,
                        role === 'student' ? styles.roleActiveButton : styles.roleInactiveButton,
                      ]}
                      onPress={() => setRole('student')}
                      activeOpacity={0.8}
                    >
                      <Text
                        style={[
                          role === 'student' ? styles.roleActiveText : styles.roleInactiveText,
                        ]}
                      >
                        Öğrenci
                      </Text>
                    </TouchableOpacity>
                    <TouchableOpacity
                      style={[
                        styles.roleButton,
                        role === 'organizer' ? styles.roleActiveButton : styles.roleInactiveButton,
                      ]}
                      onPress={() => setRole('organizer')}
                      activeOpacity={0.8}
                    >
                      <Text
                        style={[
                          role === 'organizer' ? styles.roleActiveText : styles.roleInactiveText,
                        ]}
                      >
                        Organizatör
                      </Text>
                    </TouchableOpacity>
                  </View>
                </View>

                {/* Name Input */}
                <View style={styles.inputGroup}>
                  <Text style={styles.inputLabel}>Ad Soyad / Topluluk Adı</Text>
                  <View style={styles.inputWrapper}>
                    <User color="#64748b" size={20} style={styles.inputIcon} />
                    <TextInput
                      style={styles.input}
                      placeholder={role === 'student' ? 'Ahmet Yılmaz' : 'Müzik Kulübü'}
                      placeholderTextColor="#64748b"
                      value={fullName}
                      onChangeText={setFullName}
                      autoCapitalize="words"
                      autoCorrect={false}
                    />
                  </View>
                </View>

                {/* Email Input */}
                <View style={styles.inputGroup}>
                  <Text style={styles.inputLabel}>E-posta Adresi</Text>
                  <View style={styles.inputWrapper}>
                    <Mail color="#64748b" size={20} style={styles.inputIcon} />
                    <TextInput
                      style={styles.input}
                      placeholder={role === 'student' ? 'ahmet.yilmaz@ogrenci.edu.tr' : 'topluluk@universite.edu.tr'}
                      placeholderTextColor="#64748b"
                      value={email}
                      onChangeText={setEmail}
                      keyboardType="email-address"
                      autoCapitalize="none"
                      autoCorrect={false}
                    />
                  </View>
                </View>

                {/* Password Input */}
                <View style={styles.inputGroup}>
                  <Text style={styles.inputLabel}>Şifre</Text>
                  <View style={styles.inputWrapper}>
                    <Lock color="#64748b" size={20} style={styles.inputIcon} />
                    <TextInput
                      style={styles.input}
                      placeholder="••••••••"
                      placeholderTextColor="#64748b"
                      secureTextEntry
                      value={password}
                      onChangeText={setPassword}
                      autoCapitalize="none"
                      autoCorrect={false}
                    />
                  </View>
                </View>

                {/* University Selection Dropdown Button */}
                <View style={styles.inputGroup}>
                  <Text style={styles.inputLabel}>Bağlı Olduğunuz Üniversite</Text>
                  <TouchableOpacity
                    style={styles.inputWrapper}
                    onPress={() => setIsModalVisible(true)}
                    disabled={loadingUnis}
                    activeOpacity={0.8}
                  >
                    <Building color="#64748b" size={20} style={styles.inputIcon} />
                    <Text style={[styles.selectorText, selectedUniversity ? { color: '#ffffff' } : { color: '#64748b' }]}>
                      {loadingUnis
                        ? 'Üniversiteler Yükleniyor...'
                        : selectedUniversity
                        ? selectedUniversity.name
                        : 'Üniversitenizi Seçin'}
                    </Text>
                    <ChevronDown color="#64748b" size={20} style={{ paddingHorizontal: 16 }} />
                  </TouchableOpacity>
                </View>

                {/* Register Button */}
                <TouchableOpacity
                  style={styles.submitButton}
                  onPress={handleRegister}
                  disabled={isSubmitting}
                  activeOpacity={0.8}
                >
                  {isSubmitting ? (
                    <ActivityIndicator color="#0f172a" />
                  ) : (
                    <Text style={styles.submitButtonText}>Kayıt Ol</Text>
                  )}
                </TouchableOpacity>
              </View>
            </>
          )}

          {/* Footer to Login */}
          {!successMessage && (
            <View style={styles.footerContainer}>
              <Text style={styles.footerText}>Zaten hesabın var mı? </Text>
              <TouchableOpacity onPress={onNavigateToLogin} activeOpacity={0.6}>
                <Text style={styles.footerLink}>Giriş Yap</Text>
              </TouchableOpacity>
            </View>
          )}

        </View>
      </ScrollView>

      {/* University Picker Search Modal */}
      <Modal
        animationType="fade"
        transparent={true}
        visible={isModalVisible}
        onRequestClose={() => setIsModalVisible(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Üniversite Seçimi</Text>
              <TouchableOpacity onPress={() => setIsModalVisible(false)}>
                <Text style={styles.modalCloseText}>İptal</Text>
              </TouchableOpacity>
            </View>

            <View style={styles.modalSearchWrapper}>
              <Search color="#94a3b8" size={18} style={styles.modalSearchIcon} />
              <TextInput
                style={styles.modalSearchInput}
                placeholder="Üniversite adı ile ara..."
                placeholderTextColor="#94a3b8"
                value={searchQuery}
                onChangeText={setSearchQuery}
                autoCorrect={false}
              />
            </View>

            <FlatList
              data={filteredUniversities}
              keyExtractor={(item) => item.id}
              keyboardShouldPersistTaps="handled"
              renderItem={({ item }) => (
                <TouchableOpacity
                  style={styles.universityItem}
                  onPress={() => {
                    setSelectedUniversity(item);
                    setIsModalVisible(false);
                    setSearchQuery('');
                  }}
                >
                  <Text style={styles.universityItemText}>{item.name}</Text>
                </TouchableOpacity>
              )}
              ListEmptyComponent={
                <View style={styles.emptyContainer}>
                  <Text style={styles.emptyText}>Sonuç bulunamadı.</Text>
                </View>
              }
            />
          </View>
        </View>
      </Modal>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f1f5f9',
  },
  floatingBackButton: {
    position: 'absolute',
    top: Platform.OS === 'ios' ? 60 : 40,
    left: 20,
    zIndex: 50,
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#ffffff',
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 8,
    elevation: 2,
    borderWidth: 1,
    borderColor: '#e2e8f0',
  },
  floatingBackText: {
    marginLeft: 6,
    fontSize: 14,
    fontWeight: '600',
    color: '#475569',
  },
  scrollContainer: {
    flexGrow: 1,
    justifyContent: 'center',
    padding: 20,
    paddingTop: Platform.OS === 'ios' ? 120 : 100, // Extra padding for the floating button
  },
  cardContainer: {
    backgroundColor: '#0f172a', 
    borderRadius: 24,
    padding: 32,
    width: '100%',
    maxWidth: 400,
    alignSelf: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 20 },
    shadowOpacity: 0.15,
    shadowRadius: 30,
    elevation: 10,
    borderWidth: 1,
    borderColor: '#1e293b',
  },
  headerContainer: {
    alignItems: 'center',
    marginBottom: 24,
  },
  logoImage: {
    width: 64,
    height: 64,
    marginBottom: 16,
  },
  title: {
    fontSize: 24,
    fontWeight: '800',
    color: '#ffffff',
    marginBottom: 6,
    letterSpacing: -0.5,
  },
  subtitle: {
    fontSize: 13,
    color: '#94a3b8',
    textAlign: 'center',
  },
  errorContainer: {
    backgroundColor: 'rgba(239, 68, 68, 0.1)',
    borderColor: 'rgba(239, 68, 68, 0.2)',
    borderWidth: 1,
    borderRadius: 12,
    padding: 14,
    marginBottom: 20,
  },
  errorText: {
    color: '#f87171',
    fontSize: 13,
    fontWeight: '500',
    textAlign: 'center',
  },
  successContainer: {
    backgroundColor: 'rgba(52, 211, 153, 0.1)',
    borderWidth: 1,
    borderColor: 'rgba(52, 211, 153, 0.2)',
    borderRadius: 16,
    padding: 24,
    alignItems: 'center',
    marginBottom: 16,
  },
  successTitle: {
    fontSize: 18,
    fontWeight: '800',
    color: '#34d399',
    marginBottom: 8,
  },
  successText: {
    fontSize: 13,
    color: '#94a3b8',
    textAlign: 'center',
    marginBottom: 24,
    lineHeight: 20,
  },
  successButton: {
    backgroundColor: '#ffffff',
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 12,
  },
  successButtonText: {
    color: '#0f172a',
    fontSize: 14,
    fontWeight: '700',
  },
  formContainer: {
    gap: 16,
  },
  inputGroup: {
    gap: 6,
  },
  inputLabel: {
    fontSize: 13,
    fontWeight: '600',
    color: '#cbd5e1', 
    marginLeft: 4,
  },
  inputWrapper: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#1e293b', 
    borderWidth: 1,
    borderColor: '#334155',
    borderRadius: 14,
    height: 52,
  },
  inputIcon: {
    paddingHorizontal: 16,
  },
  input: {
    flex: 1,
    height: '100%',
    color: '#ffffff',
    fontSize: 15,
    fontWeight: '500',
  },
  selectorText: {
    flex: 1,
    fontSize: 15,
    fontWeight: '500',
  },
  roleContainer: {
    flexDirection: 'row',
    backgroundColor: '#1e293b',
    borderRadius: 14,
    borderWidth: 1,
    borderColor: '#334155',
    padding: 4,
    height: 52,
  },
  roleButton: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    borderRadius: 10,
  },
  roleActiveButton: {
    backgroundColor: '#ffffff',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 2,
  },
  roleInactiveButton: {
    backgroundColor: 'transparent',
  },
  roleActiveText: {
    color: '#0f172a',
    fontWeight: '800',
    fontSize: 14,
  },
  roleInactiveText: {
    color: '#94a3b8',
    fontWeight: '600',
    fontSize: 14,
  },
  submitButton: {
    backgroundColor: '#ffffff',
    borderRadius: 14,
    height: 56,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 8,
    shadowColor: '#ffffff',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1,
    shadowRadius: 12,
    elevation: 4,
  },
  submitButtonText: {
    color: '#0f172a',
    fontSize: 16,
    fontWeight: '800',
  },
  footerContainer: {
    flexDirection: 'row',
    justifyContent: 'center',
    marginTop: 24,
  },
  footerText: {
    fontSize: 14,
    color: '#94a3b8',
  },
  footerLink: {
    fontSize: 14,
    fontWeight: '800',
    color: '#ffffff',
    textDecorationLine: 'underline',
  },
  
  // Modal Styles
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(15, 23, 42, 0.7)',
    justifyContent: 'flex-end',
  },
  modalContent: {
    backgroundColor: '#ffffff',
    borderTopLeftRadius: 32,
    borderTopRightRadius: 32,
    height: '75%',
    padding: 24,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: -10 },
    shadowOpacity: 0.1,
    shadowRadius: 20,
    elevation: 20,
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 20,
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: '800',
    color: '#0f172a',
  },
  modalCloseText: {
    fontSize: 15,
    fontWeight: '600',
    color: '#ef4444',
  },
  modalSearchWrapper: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#f1f5f9',
    borderRadius: 14,
    paddingHorizontal: 16,
    height: 50,
    marginBottom: 20,
    borderWidth: 1,
    borderColor: '#e2e8f0',
  },
  modalSearchIcon: {
    marginRight: 12,
  },
  modalSearchInput: {
    flex: 1,
    color: '#0f172a',
    fontSize: 15,
    height: '100%',
  },
  universityItem: {
    paddingVertical: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#f1f5f9',
  },
  universityItemText: {
    fontSize: 16,
    color: '#334155',
    fontWeight: '500',
  },
  emptyContainer: {
    padding: 32,
    alignItems: 'center',
  },
  emptyText: {
    color: '#94a3b8',
    fontSize: 15,
  },
});
