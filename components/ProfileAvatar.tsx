import React from 'react';
import { Image, StyleSheet, TouchableOpacity, View } from 'react-native';
import { buildAvatarUrl } from '../config/urls';
import { useAuthStore } from '../store/useAuthStore';
import { useUserAvatar } from '../store/usePreferencesStore';
import { useUiStore } from '../store/useUiStore';
import ProfileModal from './ProfileModal';

export default function ProfileAvatar() {
  // Visibility lives in useUiStore so reward pop-ups (e.g. a level-up) can open
  // the profile too, not just a tap on the avatar.
  const modalVisible = useUiStore((s) => s.open.profile);
  const showProfile = useUiStore((s) => s.show);
  const hideProfile = useUiStore((s) => s.hide);
  const user = useAuthStore((state) => state.user);
  const chosenAvatar = useUserAvatar();

  if (!user) return null;

  const getProfileImage = () => {
    // A locally chosen avatar wins over the backend/default one.
    if (chosenAvatar) return chosenAvatar;
    // FIX: Verificăm avatarUrl (Java) prima dată, apoi restul
    const uri = user.avatar_url || user.avatarUrl || user.picture;

    if (uri) return uri;

    const identifier = user.username || user.email || 'User';
    return buildAvatarUrl(identifier, { bold: false });
  };

  const imageUrl = getProfileImage();

  return (
    <>
      <TouchableOpacity
        onPress={() => showProfile('profile')}
        style={styles.container}
        activeOpacity={0.7}
        accessibilityRole="button"
        accessibilityLabel="Profile"
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
        onClose={() => hideProfile('profile')}
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