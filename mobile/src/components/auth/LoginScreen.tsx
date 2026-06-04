import React, { useState, useRef } from 'react';
import {
  StyleSheet,
  View,
  TextInput,
  TouchableOpacity,
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  useColorScheme,
  Image,
  StatusBar,
  Animated,
  Dimensions,
  Text,
} from 'react-native';
import { Mail, Lock, Eye, EyeOff, ArrowLeft } from 'lucide-react-native';
import { useAuth } from '../../context/AuthContext';
import { supabase } from '../../lib/supabaseClient';

interface LoginScreenProps {
  onNavigateToRegister: () => void;
  onBack?: () => void;
}

const { width } = Dimensions.get('window');

export function LoginScreen({ onNavigateToRegister, onBack }: LoginScreenProps) {
  const { signIn, signOut } = useAuth();
  const scheme = useColorScheme();

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');
  const [showPassword, setShowPassword] = useState(false);

  // Focus animasyonları (if needed later)
  const emailFocusAnim = useRef(new Animated.Value(0)).current;
  const passwordFocusAnim = useRef(new Animated.Value(0)).current;

  // Hata animasyonu
  const shakeAnim = useRef(new Animated.Value(0)).current;

  const triggerErrorShake = () => {
    Animated.sequence([
      Animated.timing(shakeAnim, { toValue: 10, duration: 100, useNativeDriver: true }),
      Animated.timing(shakeAnim, { toValue: -10, duration: 100, useNativeDriver: true }),
      Animated.timing(shakeAnim, { toValue: 10, duration: 100, useNativeDriver: true }),
      Animated.timing(shakeAnim, { toValue: 0, duration: 100, useNativeDriver: true })
    ]).start();
  };

  const handleLogin = async () => {
    if (!email.trim() || !password.trim()) {
      setErrorMessage('Lütfen e-posta ve şifrenizi girin.');
      triggerErrorShake();
      return;
    }

    setErrorMessage('');
    setLoading(true);

    try {
      const data = await signIn(email.trim(), password);
      
      const userId = data?.user?.id;
      if (userId) {
        // Query profile from Supabase directly to determine role immediately
        const { data: profileData, error: profileError } = await supabase
          .from('profiles')
          .select('role')
          .eq('id', userId)
          .single();

        if (!profileError && profileData) {
          const role = profileData.role;
          if (role === 'admin' || role === 'sks') {
            setErrorMessage('Admin ve SKS işlemleri sadece web panelinde desteklenmektedir.');
            triggerErrorShake();
            await signOut();
          }
        }
      }
    } catch (err: any) {
      console.error('Giriş hatası:', err);
      
      let msg = 'Giriş yapılırken bir hata oluştu.';
      const errString = String(err?.message || err).toLowerCase();

      if (errString.includes('invalid login credentials') || errString.includes('invalid_credentials')) {
        msg = 'E-posta veya şifre hatalı. Lütfen bilgilerinizi kontrol edin.';
      } else if (errString.includes('email not confirmed')) {
        msg = 'E-posta adresiniz henüz doğrulanmamış. Lütfen gelen kutunuzu kontrol edin.';
      } else if (errString.includes('network') || errString.includes('fetch')) {
        msg = 'Bağlantı hatası. Lütfen internetinizi kontrol edip tekrar deneyin.';
      }
      
      setErrorMessage(msg);
      triggerErrorShake();
    } finally {
      setLoading(false);
    }
  };

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
        <Animated.View style={[styles.cardContainer, { transform: [{ translateX: shakeAnim }] }]}>
          
          {/* Logo & Header */}
          <View style={styles.headerContainer}>
            <Image 
              source={{ uri: 'https://vwtzkppabmkncbsthgdw.supabase.co/storage/v1/object/public/public-assets/applogo/logo_kampusradar.png' }}
              style={styles.logoImage}
              resizeMode="contain"
            />
            <Text style={styles.title}>KampüsRadar</Text>
            <Text style={styles.subtitle}>Kampüsündeki etkinlikleri kaçırma!</Text>
          </View>

          {/* Hata Mesajı */}
          {errorMessage ? (
            <View style={styles.errorContainer}>
              <Text style={styles.errorText}>{errorMessage}</Text>
            </View>
          ) : null}

          {/* Form */}
          <View style={styles.formContainer}>
            
            {/* Email Input */}
            <View style={styles.inputGroup}>
              <Text style={styles.inputLabel}>E-posta Adresi</Text>
              <View style={styles.inputWrapper}>
                <Mail color="#64748b" size={20} style={styles.inputIcon} />
                <TextInput
                  style={styles.input}
                  placeholder="ornek@ogrenci.edu.tr"
                  placeholderTextColor="#64748b"
                  keyboardType="email-address"
                  autoCapitalize="none"
                  autoCorrect={false}
                  value={email}
                  onChangeText={setEmail}
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
                  secureTextEntry={!showPassword}
                  autoCapitalize="none"
                  autoCorrect={false}
                  value={password}
                  onChangeText={setPassword}
                />
                <TouchableOpacity
                  style={styles.eyeIcon}
                  onPress={() => setShowPassword(!showPassword)}
                >
                  {showPassword ? (
                    <EyeOff color="#64748b" size={20} />
                  ) : (
                    <Eye color="#64748b" size={20} />
                  )}
                </TouchableOpacity>
              </View>
            </View>

            {/* Submit Button */}
            <TouchableOpacity 
              style={styles.submitButton} 
              onPress={handleLogin}
              disabled={loading}
              activeOpacity={0.8}
            >
              {loading ? (
                <ActivityIndicator color="#0f172a" />
              ) : (
                <Text style={styles.submitButtonText}>Giriş Yap</Text>
              )}
            </TouchableOpacity>
          </View>

          {/* Navigate to Register */}
          <View style={styles.footerContainer}>
            <Text style={styles.footerText}>Hesabın yok mu? </Text>
            <TouchableOpacity onPress={onNavigateToRegister} activeOpacity={0.6}>
              <Text style={styles.footerLink}>Hemen Kayıt Ol</Text>
            </TouchableOpacity>
          </View>

        </Animated.View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f1f5f9', // Web'deki bg-slate-100 ile uyumlu
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
  },
  cardContainer: {
    backgroundColor: '#0f172a', // Web'deki bg-slate-900 (Koyu kart)
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
    marginBottom: 32,
  },
  logoImage: {
    width: 80,
    height: 80,
    marginBottom: 16,
  },
  title: {
    fontSize: 28,
    fontWeight: '800',
    color: '#ffffff',
    marginBottom: 6,
    letterSpacing: -0.5,
  },
  subtitle: {
    fontSize: 14,
    color: '#94a3b8',
    textAlign: 'center',
  },
  errorContainer: {
    backgroundColor: 'rgba(239, 68, 68, 0.1)',
    borderColor: 'rgba(239, 68, 68, 0.2)',
    borderWidth: 1,
    borderRadius: 12,
    padding: 14,
    marginBottom: 24,
  },
  errorText: {
    color: '#f87171',
    fontSize: 13,
    fontWeight: '500',
    textAlign: 'center',
  },
  formContainer: {
    gap: 20,
  },
  inputGroup: {
    gap: 8,
  },
  inputLabel: {
    fontSize: 13,
    fontWeight: '600',
    color: '#cbd5e1', // slate-300
    marginLeft: 4,
  },
  inputWrapper: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#1e293b', // slate-800
    borderWidth: 1,
    borderColor: '#334155', // slate-700
    borderRadius: 14,
    height: 56,
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
  eyeIcon: {
    paddingHorizontal: 16,
    height: '100%',
    justifyContent: 'center',
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
    marginTop: 32,
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
});
