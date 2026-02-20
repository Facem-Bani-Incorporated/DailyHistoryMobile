import { Ionicons } from '@expo/vector-icons';
import { GoogleSignin } from '@react-native-google-signin/google-signin';
import { LinearGradient } from 'expo-linear-gradient';
import { useRouter } from 'expo-router';
import React from 'react';
import { Image, Modal, SafeAreaView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { useAuthStore } from '../store/useAuthStore';

interface Props {
  visible: boolean;
  onClose: () => void;
}

export default function ProfileModal({ visible, onClose }: Props) {
  const user = useAuthStore((state) => state.user);
  const logout = useAuthStore((state) => state.logout);
  const router = useRouter();
  
  // LOGICĂ DETECTARE REPARATĂ
  const isGoogleUser = !!user?.picture || 
                       (typeof user?.id === 'string' && user.id.length > 15);

  const displayName = isGoogleUser 
    ? user?.email 
    : ((user as any)?.username || user?.email || 'Explorator');

  // LOGICĂ IMAGINE PRIORITARĂ
  const getProfileImage = () => {
    // 1. Verificăm Cloudinary (avatar_url din DB)
    if ((user as any)?.avatar_url) return (user as any).avatar_url;
    
    // 2. Verificăm poza de la Google
    if (user?.picture) return user.picture;

    // 3. Fallback la UI Avatars
    return `https://ui-avatars.com/api/?name=${encodeURIComponent(displayName || 'U')}&background=ffd700&color=000`;
  };

  const imageUrl = getProfileImage();

  const handleLogout = async () => {
    try {
      await GoogleSignin.signOut();
    } catch (e) {
      console.log('Sesiune Google terminată.');
    } finally {
      onClose();
      logout(); // Resetăm Zustand
      router.replace('/(auth)/welcome');
    }
  };

  return (
    <Modal visible={visible} animationType="slide" transparent={false}>
      <View style={styles.container}>
        <SafeAreaView style={styles.safeArea}>
          <View style={styles.header}>
            <TouchableOpacity onPress={onClose} style={styles.closeButton}>
              <Ionicons name="close" size={32} color="#ffd700" />
            </TouchableOpacity>
            <Text style={styles.headerTitle}>PROFILUL TĂU</Text>
            <View style={{ width: 32 }} /> 
          </View>

          <View style={styles.content}>
            <View style={styles.imageContainer}>
               <Image 
                  source={{ uri: imageUrl }} 
                  style={styles.bigAvatar} 
                  key={imageUrl} 
               />
               <LinearGradient colors={['transparent', '#0e1117']} style={styles.fade} />
            </View>

            <View style={styles.infoCard}>
              <Text style={styles.mainName}>{displayName}</Text>
              
              <View style={styles.badgeContainer}>
                {/* Badge-ul se schimbă acum corect în funcție de isGoogleUser */}
                <View style={[styles.methodBadge, { backgroundColor: isGoogleUser ? '#4285F4' : '#ffd700' }]}>
                  <Ionicons 
                      name={isGoogleUser ? "logo-google" : "mail-outline"} 
                      size={16} 
                      color={isGoogleUser ? "white" : "black"} 
                  />
                  <Text style={[styles.methodText, { color: isGoogleUser ? "white" : "black" }]}>
                    {isGoogleUser ? 'Google Account' : 'Standard User'}
                  </Text>
                </View>
              </View>

              <View style={styles.statsRow}>
                <View style={styles.stat}>
                  <Text style={styles.statLabel}>Status</Text>
                  <Text style={styles.statValue}>Activ</Text>
                </View>
                <View style={[styles.stat, styles.borderLeft]}>
                  <Text style={styles.statLabel}>Rol</Text>
                  <Text style={styles.statValue}>{(user as any)?.roles?.[0] || 'USER'}</Text>
                </View>
              </View>

              <TouchableOpacity style={styles.logoutBtn} onPress={handleLogout}>
                <Ionicons name="log-out-outline" size={22} color="#ff4444" />
                <Text style={styles.logoutText}>Deconectare</Text>
              </TouchableOpacity>
            </View>
          </View>
        </SafeAreaView>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#0e1117' },
  safeArea: { flex: 1 },
  header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', padding: 20 },
  headerTitle: { color: 'white', fontSize: 16, fontWeight: '900', letterSpacing: 3 },
  closeButton: { padding: 5 },
  content: { flex: 1, alignItems: 'center', paddingTop: 20 },
  imageContainer: { width: 160, height: 160, marginBottom: 20 },
  bigAvatar: { width: '100%', height: '100%', borderRadius: 80, borderWidth: 3, borderColor: '#ffd700' },
  infoCard: { width: '90%', backgroundColor: '#1a1c23', borderRadius: 25, padding: 25, alignItems: 'center' },
  mainName: { color: 'white', fontSize: 20, fontWeight: 'bold', marginBottom: 15, textAlign: 'center' },
  badgeContainer: { marginBottom: 25 },
  methodBadge: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 16, paddingVertical: 8, borderRadius: 20, gap: 8 },
  methodText: { fontWeight: 'bold', fontSize: 12 },
  statsRow: { flexDirection: 'row', width: '100%', borderTopWidth: 1, borderTopColor: '#2a2d35', paddingTop: 20 },
  stat: { flex: 1, alignItems: 'center' },
  statLabel: { color: '#888', fontSize: 11, marginBottom: 4 },
  statValue: { color: '#ffd700', fontWeight: 'bold', fontSize: 15 },
  borderLeft: { borderLeftWidth: 1, borderLeftColor: '#2a2d35' },
  fade: { position: 'absolute', bottom: 0, left: 0, right: 0, height: 40 },
  logoutBtn: { flexDirection: 'row', alignItems: 'center', marginTop: 25, gap: 8, padding: 12 },
  logoutText: { color: '#ff4444', fontWeight: 'bold' }
});