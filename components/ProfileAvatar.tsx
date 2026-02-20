import React, { useState } from 'react';
import { Image, StyleSheet, TouchableOpacity, View } from 'react-native';
import { useAuthStore } from '../store/useAuthStore';
import ProfileModal from './ProfileModal';

export default function ProfileAvatar() {
  const [modalVisible, setModalVisible] = useState(false);
  const user = useAuthStore((state) => state.user);

  if (!user) return null;

  const getProfileImage = () => {
    // 🔥 FIX: Verificăm avatarUrl (Java) prima dată, apoi restul
    const uri = user.avatar_url || user.avatarUrl || user.picture;
    
    if (uri) return uri;

    const identifier = user.username || user.email || 'User';

    return `https://ui-avatars.com/api/?name=${encodeURIComponent(
      identifier
    )}&background=ffd700&color=000`;
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
          key={imageUrl}
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
    backgroundColor: '#1a1c23',
  },
  avatar: {
    width: '100%',
    height: '100%',
    borderRadius: 20,
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
    borderColor: '#0e1117',
  },
});