import React, { useState, useEffect } from 'react';
import { StyleSheet, View, ActivityIndicator, TouchableOpacity, Modal, Image, Platform } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { User, Mail, School, BadgeCheck, Camera, Image as ImageIcon, Trash2, AlertCircle, CheckCircle, XCircle, Sun, Moon, Monitor, ChevronDown, LogOut, Edit3 } from 'lucide-react-native';

import { ThemedText } from '@/components/themed-text';
import { useAuth } from '@/context/AuthContext';
import { supabase } from '@/lib/supabaseClient';
import { Colors, Spacing } from '@/constants/theme';
import { useColorScheme } from '@/hooks/use-color-scheme';
import * as ImagePicker from 'expo-image-picker';
import { decode } from 'base64-arraybuffer';
import { useThemeContext } from '@/context/ThemeContext';

export default function OrganizerProfileScreen() {
  const { user, profile, signOut, fetchProfile } = useAuth();
  const scheme = useColorScheme();
  const colors = Colors[scheme === 'dark' ? 'dark' : 'light'];
  const { themeMode, setThemeMode } = useThemeContext();

  const [uniName, setUniName] = useState<string>('');
  
  const [uploadingLogo, setUploadingLogo] = useState(false);
  const [photoMenuVisible, setPhotoMenuVisible] = useState(false);
  const [themeMenuVisible, setThemeMenuVisible] = useState(false);
  const [alertModal, setAlertModal] = useState({ visible: false, title: '', message: '', type: 'success' });
  const [confirmModal, setConfirmModal] = useState({
    visible: false, title: '', message: '', confirmText: 'Onayla', cancelText: 'Vazgeç', type: 'danger', onConfirm: () => {}
  });

  useEffect(() => {
    async function loadUniversity() {
      if (!profile?.university_id) return;
      try {
        const { data } = await supabase.from('universities').select('name').eq('id', profile.university_id).single();
        if (data) setUniName(data.name);
      } catch (err) {
        console.error(err);
      }
    }
    loadUniversity();
  }, [profile]);

  const openImagePicker = async (source: 'camera' | 'gallery') => {
    setPhotoMenuVisible(false);
    let result;
    if (source === 'camera') {
      const permissionResult = await ImagePicker.requestCameraPermissionsAsync();
      if (!permissionResult.granted) {
        setAlertModal({ visible: true, title: "Erişim Reddedildi", message: "Fotoğraf çekmek için kamera erişimine izin vermelisiniz.", type: "error" });
        return;
      }
      result = await ImagePicker.launchCameraAsync({ allowsEditing: true, aspect: [1, 1], quality: 0.5, base64: true });
    } else {
      const permissionResult = await ImagePicker.requestMediaLibraryPermissionsAsync();
      if (!permissionResult.granted) {
        setAlertModal({ visible: true, title: "Erişim Reddedildi", message: "Fotoğraf yüklemek için galeri erişimine izin vermelisiniz.", type: "error" });
        return;
      }
      result = await ImagePicker.launchImageLibraryAsync({ mediaTypes: ['images'], allowsEditing: true, aspect: [1, 1], quality: 0.5, base64: true });
    }

    if (!result.canceled && result.assets[0].base64) {
      uploadProfilePhoto(result.assets[0].base64, result.assets[0].uri);
    }
  };

  const uploadProfilePhoto = async (base64String: string, uri: string) => {
    if (!user) return;
    try {
      setUploadingLogo(true);
      const fileExt = uri.split('.').pop() || 'jpg';
      const fileName = `logo_${user.id}_${Date.now()}.${fileExt}`;
      const filePath = `logos/${fileName}`;

      const { error: uploadError } = await supabase.storage.from('public-assets').upload(filePath, decode(base64String), { contentType: `image/${fileExt}` });
      if (uploadError) throw uploadError;

      const { data: publicUrlData } = supabase.storage.from('public-assets').getPublicUrl(filePath);
      const newUrl = `${publicUrlData.publicUrl}?t=${Date.now()}`;
      await supabase.from('profiles').update({ logo_url: newUrl }).eq('id', user.id);
      
      setAlertModal({ visible: true, title: 'Başarılı', message: 'Profil fotoğrafınız güncellendi.', type: 'success' });
      fetchProfile();
    } catch (err: any) {
      setAlertModal({ visible: true, title: 'Hata', message: 'Fotoğraf yüklenirken bir hata oluştu: ' + err.message, type: 'error' });
    } finally {
      setUploadingLogo(false);
    }
  };

  const handleRemoveProfilePhoto = () => {
    setPhotoMenuVisible(false);
    setConfirmModal({
      visible: true, title: "Fotoğrafı Kaldır", message: "Profil fotoğrafınızı kaldırmak istediğinize emin misiniz?",
      confirmText: "Kaldır", cancelText: "Vazgeç", type: "danger",
      onConfirm: async () => {
        try {
          setUploadingLogo(true);
          await supabase.from('profiles').update({ logo_url: null }).eq('id', user?.id);
          setAlertModal({ visible: true, title: "Başarılı", message: "Fotoğraf kaldırıldı.", type: "success" });
          fetchProfile();
        } catch (e) {
          setAlertModal({ visible: true, title: "Hata", message: "Silinemedi.", type: "error" });
        } finally {
          setUploadingLogo(false);
        }
      }
    });
  };

  return (
    <SafeAreaView style={[styles.safeArea, { backgroundColor: colors.background }]}>
      <View style={{ padding: Spacing.four }}>
        <View style={[styles.profileHeaderContainer, { backgroundColor: colors.backgroundElement, borderColor: colors.backgroundSelected }]}>
          <TouchableOpacity 
            style={styles.avatarContainer} 
            onPress={() => setPhotoMenuVisible(true)}
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
            <ThemedText style={styles.roleBadgeText}>Organizatör</ThemedText>
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
      </View>

      {/* Custom Alert Modal */}
      <Modal visible={alertModal.visible} transparent animationType="fade">
        <View style={styles.alertOverlay}>
          <View style={styles.alertBox}>
            <View style={[styles.alertIconContainer, { backgroundColor: alertModal.type === 'success' ? '#dcfce7' : '#fee2e2' }]}>
              {alertModal.type === 'success' ? <CheckCircle size={32} color="#22c55e" /> : <XCircle size={32} color="#ef4444" />}
            </View>
            <ThemedText style={styles.alertTitle}>{alertModal.title}</ThemedText>
            <ThemedText style={styles.alertMessage}>{alertModal.message}</ThemedText>
            <TouchableOpacity style={styles.alertButton} onPress={() => setAlertModal({ ...alertModal, visible: false })}>
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
              {confirmModal.type === 'danger' ? <Trash2 size={32} color="#ef4444" /> : <AlertCircle size={32} color="#f59e0b" />}
            </View>
            <ThemedText style={styles.alertTitle}>{confirmModal.title}</ThemedText>
            <ThemedText style={styles.alertMessage}>{confirmModal.message}</ThemedText>
            
            <View style={{ flexDirection: 'row', gap: 12, width: '100%' }}>
              <TouchableOpacity style={[styles.confirmButton, { backgroundColor: '#f1f5f9' }]} onPress={() => setConfirmModal({ ...confirmModal, visible: false })}>
                <ThemedText style={[styles.confirmButtonText, { color: '#64748b' }]}>{confirmModal.cancelText}</ThemedText>
              </TouchableOpacity>
              
              <TouchableOpacity style={[styles.confirmButton, { backgroundColor: confirmModal.type === 'danger' ? '#ef4444' : '#0284c7' }]} onPress={() => { setConfirmModal({ ...confirmModal, visible: false }); confirmModal.onConfirm(); }}>
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
              <ThemedText style={[styles.bottomSheetTitle, { color: colors.text }]}>Profil Fotoğrafı</ThemedText>
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

              {profile?.logo_url && (
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
              <TouchableOpacity style={[styles.bottomSheetOption, { borderBottomColor: colors.backgroundSelected, backgroundColor: themeMode === 'light' ? 'rgba(2, 132, 199, 0.05)' : 'transparent' }]} onPress={() => { setThemeMode('light'); setThemeMenuVisible(false); }}>
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12 }}>
                  <View style={[styles.optionIconBox, { backgroundColor: themeMode === 'light' ? '#0284c7' : colors.backgroundSelected }]}><Sun size={20} color={themeMode === 'light' ? '#ffffff' : colors.textSecondary} /></View>
                  <ThemedText style={[styles.optionText, { color: themeMode === 'light' ? '#0284c7' : colors.text }]}>Açık Tema</ThemedText>
                </View>
                {themeMode === 'light' && <CheckCircle size={20} color="#0284c7" />}
              </TouchableOpacity>

              <TouchableOpacity style={[styles.bottomSheetOption, { borderBottomColor: colors.backgroundSelected, backgroundColor: themeMode === 'dark' ? 'rgba(2, 132, 199, 0.05)' : 'transparent' }]} onPress={() => { setThemeMode('dark'); setThemeMenuVisible(false); }}>
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12 }}>
                  <View style={[styles.optionIconBox, { backgroundColor: themeMode === 'dark' ? '#0284c7' : colors.backgroundSelected }]}><Moon size={20} color={themeMode === 'dark' ? '#ffffff' : colors.textSecondary} /></View>
                  <ThemedText style={[styles.optionText, { color: themeMode === 'dark' ? '#0284c7' : colors.text }]}>Koyu Tema</ThemedText>
                </View>
                {themeMode === 'dark' && <CheckCircle size={20} color="#0284c7" />}
              </TouchableOpacity>

              <TouchableOpacity style={[styles.bottomSheetOption, { borderBottomWidth: 0, backgroundColor: themeMode === 'system' ? 'rgba(2, 132, 199, 0.05)' : 'transparent' }]} onPress={() => { setThemeMode('system'); setThemeMenuVisible(false); }}>
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12 }}>
                  <View style={[styles.optionIconBox, { backgroundColor: themeMode === 'system' ? '#0284c7' : colors.backgroundSelected }]}><Monitor size={20} color={themeMode === 'system' ? '#ffffff' : colors.textSecondary} /></View>
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
  safeArea: { flex: 1 },
  profileHeaderContainer: { backgroundColor: '#ffffff', borderRadius: Spacing.four, padding: Spacing.five, alignItems: 'center', borderWidth: 1, elevation: 2, shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.05, shadowRadius: 4 },
  avatarContainer: { width: 88, height: 88, borderRadius: 44, backgroundColor: '#38bdf8', justifyContent: 'center', alignItems: 'center', marginBottom: Spacing.three, position: 'relative' },
  avatarImage: { width: 88, height: 88, borderRadius: 44 },
  avatarText: { fontSize: 32, fontWeight: '900', color: '#ffffff' },
  editIconBadge: { position: 'absolute', bottom: 0, right: -4, backgroundColor: '#0284c7', padding: 6, borderRadius: 16, borderWidth: 2, borderColor: '#ffffff' },
  userName: { fontSize: 22, fontWeight: '700', marginBottom: 4 },
  roleBadge: { flexDirection: 'row', alignItems: 'center', gap: 6, backgroundColor: '#f0f9ff', borderWidth: 1, borderColor: '#e0f2fe', paddingHorizontal: 12, paddingVertical: 4, borderRadius: 12, marginBottom: Spacing.four },
  roleBadgeText: { color: '#0284c7', fontSize: 13, fontWeight: '700', textTransform: 'uppercase' },
  infoList: { width: '100%', gap: Spacing.three, borderTopWidth: 1, borderTopColor: '#f1f5f9', paddingTop: Spacing.four, marginBottom: Spacing.four },
  infoRow: { flexDirection: 'row', alignItems: 'center', gap: Spacing.three },
  infoText: { fontSize: 14, fontWeight: '500', flex: 1, color: '#64748b' },
  settingsSection: { width: '100%', marginTop: Spacing.four },
  settingRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', padding: 12, borderRadius: 16 },
  settingRowLeft: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  settingIconBox: { width: 36, height: 36, borderRadius: 18, alignItems: 'center', justifyContent: 'center' },
  settingLabel: { fontSize: 15, fontWeight: '700' },
  settingRowRight: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  settingValue: { fontSize: 14, fontWeight: '600' },
  logoutButton: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', padding: Spacing.three, borderRadius: 16, marginTop: Spacing.three, width: '100%' },
  logoutButtonText: { color: '#ef4444', fontWeight: '800', marginLeft: Spacing.two },
  alertOverlay: { flex: 1, backgroundColor: 'rgba(15, 23, 42, 0.4)', justifyContent: 'center', alignItems: 'center', padding: Spacing.four },
  alertBox: { backgroundColor: '#ffffff', width: '100%', borderRadius: Spacing.four, padding: Spacing.five, alignItems: 'center', borderWidth: 1, borderColor: '#e2e8f0' },
  alertIconContainer: { width: 64, height: 64, borderRadius: 32, alignItems: 'center', justifyContent: 'center', marginBottom: Spacing.four },
  alertTitle: { fontSize: 20, fontWeight: '800', color: '#0f172a', marginBottom: Spacing.two },
  alertMessage: { fontSize: 14, color: '#475569', textAlign: 'center', marginBottom: Spacing.five },
  alertButton: { backgroundColor: '#0284c7', paddingVertical: Spacing.three, paddingHorizontal: Spacing.six, borderRadius: Spacing.three, width: '100%', alignItems: 'center' },
  alertButtonText: { color: '#ffffff', fontWeight: '800', fontSize: 16 },
  confirmButton: { flex: 1, paddingVertical: Spacing.three, borderRadius: Spacing.three, alignItems: 'center' },
  confirmButtonText: { fontWeight: '800', fontSize: 15 },
  bottomSheetOverlay: { flex: 1, backgroundColor: 'rgba(15, 23, 42, 0.4)', justifyContent: 'flex-end' },
  bottomSheetContainer: { borderTopLeftRadius: 24, borderTopRightRadius: 24, padding: Spacing.five, paddingBottom: Platform.OS === 'ios' ? 40 : Spacing.five },
  bottomSheetHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: Spacing.four, paddingBottom: Spacing.three, borderBottomWidth: 1 },
  bottomSheetTitle: { fontSize: 18, fontWeight: '800' },
  bottomSheetOptions: { gap: Spacing.two },
  bottomSheetOption: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingVertical: Spacing.three, paddingHorizontal: Spacing.two, borderBottomWidth: 1 },
  optionIconBox: { width: 40, height: 40, borderRadius: 20, alignItems: 'center', justifyContent: 'center', marginRight: Spacing.three },
  optionText: { fontSize: 16, fontWeight: '600' },
});
