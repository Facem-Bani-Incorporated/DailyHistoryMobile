import React, { useState } from 'react';
import { Image, StyleSheet, TouchableOpacity, View } from 'react-native';
import { useAuthStore } from '../store/useAuthStore';
import ProfileModal from './ProfileModal';

export default function ProfileAvatar() {
  const [modalVisible, setModalVisible] = useState(false);
  const user = useAuthStore((state) => state.user);

  // 1. Detectăm dacă este utilizator Google
  const isGoogleUser = !!user?.picture || (user?.id ? user.id.toString().length > 15 : false);

  const getProfileImage = () => {
    // 2. Extragem poza din Cloudinary folosind cheia exactă din DB: avatar_url
    // Folosim (user as any) pentru a accesa cheia care nu e în interfața TS de bază
    if ((user as any)?.avatar_url) return (user as any).avatar_url;
    
    // Fallback pentru Google Auth standard
    if (user?.picture) return user.picture;

    // 3. Dacă nu există poză, generăm placeholder-ul
    // Google -> Email | JWT -> Username
    const identifier = isGoogleUser 
      ? user?.email 
      : ((user as any)?.username || user?.email || 'User');

    return `https://ui-avatars.com/api/?name=${encodeURIComponent(identifier)}&background=ffd700&color=000`;
  };

  const imageUrl = getProfileImage();

  return (
    <>
      <TouchableOpacity 
        onPress={() => setModalVisible(true)} 
        style={styles.container}
        activeOpacity={0.7}
      >
        <Image 
          source={{ uri: imageUrl }} 
          style={styles.avatar} 
          key={imageUrl} // Important pentru refresh vizual
        />
        <View style={styles.onlineBadge} />
      </TouchableOpacity>

      <ProfileModal 
        visible={modalVisible} 
        onClose={() => setModalVisible(false)} 
      />
    </>
  );
}

const styles = StyleSheet.create({
  container: { 
    width: 45, 
    height: 45, 
    borderRadius: 22.5, 
    borderWidth: 2, 
    borderColor: '#ffd700', 
    padding: 2,
    backgroundColor: '#1a1c23'
  },
  avatar: { 
    width: '100%', 
    height: '100%', 
    borderRadius: 20 
  },
  onlineBadge: {
    position: 'absolute', 
    bottom: 1, 
    right: 1,
    width: 12, 
    height: 12, 
    borderRadius: 6,
    backgroundColor: '#4CAF50', 
    borderWidth: 2, 
    borderColor: '#0e1117'
  }
});