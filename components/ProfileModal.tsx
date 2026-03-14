// components/ProfileModal.tsx
import { Ionicons } from '@expo/vector-icons';
import { GoogleSignin } from '@react-native-google-signin/google-signin';
import { useRouter } from 'expo-router';
import React from 'react';
import {
    Image,
    Modal,
    Platform,
    ScrollView,
    StatusBar,
    StyleSheet,
    Text,
    TouchableOpacity,
    View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { Language, useLanguage } from '../context/LanguageContext';
import { ThemeMode, useTheme } from '../context/ThemeContext';
import { useAuthStore } from '../store/useAuthStore';

interface Props {
  visible: boolean;
  onClose: () => void;
}

const THEME_OPTIONS: {
  label: string;
  value: ThemeMode;
  icon: keyof typeof Ionicons.glyphMap;
}[] = [
  { label: 'Light',  value: 'light',  icon: 'sunny-outline' },
  { label: 'System', value: 'system', icon: 'phone-portrait-outline' },
  { label: 'Dark',   value: 'dark',   icon: 'moon-outline' },
];

const LANGUAGES: { code: Language; label: string }[] = [
  { code: 'en', label: 'English' },
  { code: 'ro', label: 'Română' },
  { code: 'fr', label: 'Français' },
  { code: 'de', label: 'Deutsch' },
  { code: 'es', label: 'Español' },
];

export default function ProfileModal({ visible, onClose }: Props) {
  const user = useAuthStore((state) => state.user);
  const logout = useAuthStore((state) => state.logout);
  const router = useRouter();
  const { mode, setMode, theme } = useTheme();
  const { t, language, setLanguage } = useLanguage();
  const insets = useSafeAreaInsets();

  if (!user) return null;

  const isGoogleUser = user.provider === 'google';
  const displayName = user.username || user.email?.split('@')[0] || 'Explorer';
  const displayEmail = user.email || '';

  const getProfileImage = () => {
    const uri = user.avatar_url || user.avatarUrl || user.picture;
    if (uri) return uri;
    return `https://ui-avatars.com/api/?name=${encodeURIComponent(displayName)}&background=ffd700&color=000&size=256&bold=true`;
  };

  const handleLogout = async () => {
    try {
      if (isGoogleUser) await GoogleSignin.signOut();
    } catch {}
    finally {
      onClose();
      logout();
      router.replace('/(auth)/welcome');
    }
  };

  const s = makeStyles(theme);

  return (
    <Modal visible={visible} animationType="slide" transparent={false} statusBarTranslucent>
      <StatusBar
        barStyle={Platform.OS === 'ios' ? 'dark-content' : 'light-content'}
        translucent
        backgroundColor="transparent"
      />
      <View style={[s.root, { paddingTop: insets.top }]}>

        {/* ── HEADER ──────────────────────────────────────────────────── */}
        <View style={s.header}>
          <TouchableOpacity
            onPress={onClose}
            style={s.headerBtn}
            hitSlop={{ top: 14, bottom: 14, left: 14, right: 14 }}
          >
            <Ionicons name="close" size={22} color={theme.text} />
          </TouchableOpacity>
          <Text style={[s.headerTitle, { color: theme.text }]}>{t('profile_title')}</Text>
          <View style={s.headerBtn} />
        </View>

        <ScrollView
          contentContainerStyle={[s.scroll, { paddingBottom: insets.bottom + 40 }]}
          showsVerticalScrollIndicator={false}
          keyboardShouldPersistTaps="handled"
        >
          {/* ── AVATAR ────────────────────────────────────────────────── */}
          <View style={s.profileTop}>
            <View style={s.avatarWrap}>
              <Image source={{ uri: getProfileImage() }} style={s.avatar} />
              {isGoogleUser && (
                <View style={[s.googleBadge, { borderColor: theme.background }]}>
                  <Ionicons name="logo-google" size={12} color="#fff" />
                </View>
              )}
            </View>
            <Text style={[s.displayName, { color: theme.text }]}>{displayName}</Text>
            {displayEmail !== '' && (
              <Text style={[s.email, { color: theme.subtext }]}>{displayEmail}</Text>
            )}
            {user.roles?.[0] && (
              <View style={[s.roleChip, { backgroundColor: theme.gold + '1A' }]}>
                <Text style={[s.roleText, { color: theme.gold }]}>
                  {user.roles[0].replace('ROLE_', '')}
                </Text>
              </View>
            )}
          </View>

          {/* ── LANGUAGE ──────────────────────────────────────────────── */}
          <Text style={[s.sectionLabel, { color: theme.subtext }]}>
            {t('language').toUpperCase()}
          </Text>

          {/* Language chips rendered outside ScrollView nesting — plain View */}
          <View style={[s.card, { backgroundColor: theme.card, borderColor: theme.border }]}>
            <View style={s.langRow}>
              {LANGUAGES.map((lang) => {
                const isActive = language === lang.code;
                return (
                  <TouchableOpacity
                    key={lang.code}
                    onPress={() => setLanguage(lang.code)}
                    activeOpacity={0.6}
                    style={[
                      s.langChip,
                      {
                        backgroundColor: isActive ? theme.gold : theme.background,
                        borderColor: isActive ? theme.gold : theme.border,
                      },
                    ]}
                  >
                    <Text style={[
                      s.langChipCode,
                      { color: isActive ? theme.background : theme.subtext },
                    ]}>
                      {lang.code.toUpperCase()}
                    </Text>
                    <Text style={[
                      s.langChipLabel,
                      { color: isActive ? theme.background : theme.subtext },
                    ]}>
                      {lang.label}
                    </Text>
                  </TouchableOpacity>
                );
              })}
            </View>
          </View>

          {/* ── APPEARANCE ────────────────────────────────────────────── */}
          <Text style={[s.sectionLabel, { color: theme.subtext }]}>
            {t('appearance').toUpperCase()}
          </Text>

          <View style={[s.card, { backgroundColor: theme.card, borderColor: theme.border }]}>
            <View style={[s.themeToggle, { backgroundColor: theme.background }]}>
              {THEME_OPTIONS.map((opt) => {
                const active = mode === opt.value;
                return (
                  <TouchableOpacity
                    key={opt.value}
                    onPress={() => setMode(opt.value)}
                    activeOpacity={0.7}
                    style={[s.themeOpt, active && { backgroundColor: theme.text }]}
                  >
                    <Ionicons
                      name={opt.icon}
                      size={16}
                      color={active ? theme.background : theme.subtext}
                    />
                    <Text style={[
                      s.themeOptLabel,
                      { color: active ? theme.background : theme.subtext },
                    ]}>
                      {opt.label}
                    </Text>
                  </TouchableOpacity>
                );
              })}
            </View>
          </View>

          {/* ── ACCOUNT ───────────────────────────────────────────────── */}
          <Text style={[s.sectionLabel, { color: theme.subtext }]}>
            {t('account').toUpperCase()}
          </Text>

          <View style={[s.card, { backgroundColor: theme.card, borderColor: theme.border }]}>
            <View style={s.row}>
              <View style={s.rowLeft}>
                <Ionicons name="shield-checkmark-outline" size={18} color={theme.subtext} />
                <Text style={[s.rowText, { color: theme.text }]}>{t('status')}</Text>
              </View>
              <Text style={s.statusValue}>{t('active')}</Text>
            </View>

            <View style={[s.divider, { backgroundColor: theme.border }]} />

            <View style={s.row}>
              <View style={s.rowLeft}>
                <Ionicons name="log-in-outline" size={18} color={theme.subtext} />
                <Text style={[s.rowText, { color: theme.text }]}>{t('sign_in_method')}</Text>
              </View>
              <Text style={[s.rowValue, { color: theme.subtext }]}>
                {isGoogleUser ? 'Google' : 'Email'}
              </Text>
            </View>
          </View>

          {/* ── SIGN OUT ──────────────────────────────────────────────── */}
          <TouchableOpacity
            style={s.logoutBtn}
            onPress={handleLogout}
            activeOpacity={0.75}
          >
            <Ionicons name="log-out-outline" size={18} color="#ff4444" />
            <Text style={s.logoutText}>{t('sign_out')}</Text>
          </TouchableOpacity>
        </ScrollView>
      </View>
    </Modal>
  );
}

const makeStyles = (theme: any) => StyleSheet.create({
  root: { flex: 1, backgroundColor: theme.background },

  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingVertical: 14,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: theme.border,
  },
  headerBtn: { width: 36, height: 36, alignItems: 'center', justifyContent: 'center' },
  headerTitle: { fontSize: 15, fontWeight: '700', letterSpacing: 0.3 },

  scroll: { paddingHorizontal: 20, paddingTop: 8 },

  profileTop: {
    alignItems: 'center',
    paddingTop: 24,
    paddingBottom: 28,
  },
  avatarWrap: { position: 'relative', marginBottom: 14 },
  avatar: { width: 88, height: 88, borderRadius: 44, backgroundColor: theme.card },
  googleBadge: {
    position: 'absolute', bottom: 0, right: 0,
    width: 26, height: 26, borderRadius: 13,
    backgroundColor: '#4285F4',
    alignItems: 'center', justifyContent: 'center',
    borderWidth: 2,
  },
  displayName: { fontSize: 22, fontWeight: '700', letterSpacing: 0.2, marginBottom: 4 },
  email: { fontSize: 13, marginBottom: 12, letterSpacing: 0.1 },
  roleChip: { paddingHorizontal: 14, paddingVertical: 5, borderRadius: 20 },
  roleText: { fontSize: 11, fontWeight: '800', letterSpacing: 1.5 },

  sectionLabel: {
    fontSize: 11, fontWeight: '700', letterSpacing: 1.5,
    marginBottom: 8, marginLeft: 2,
  },

  card: {
    borderRadius: 18,
    borderWidth: StyleSheet.hairlineWidth,
    padding: 14,
    marginBottom: 22,
  },

  // Language
  langRow: {
    flexDirection: 'column',
    gap: 8,
  },
  langChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderRadius: 12,
    borderWidth: StyleSheet.hairlineWidth,
  },
  langChipCode: {
    fontSize: 12,
    fontWeight: '800',
    letterSpacing: 2,
    width: 28,
  },
  langChipLabel: {
    fontSize: 14,
    fontWeight: '500',
  },

  // Theme
  themeToggle: {
    flexDirection: 'row',
    borderRadius: 12,
    padding: 3,
  },
  themeOpt: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 10,
    borderRadius: 10,
    gap: 6,
  },
  themeOptLabel: { fontSize: 12, fontWeight: '600' },

  // Account
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 10,
  },
  rowLeft: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  rowText: { fontSize: 15, fontWeight: '500' },
  rowValue: { fontSize: 14 },
  statusValue: { color: '#34C759', fontSize: 14, fontWeight: '600' },
  divider: { height: StyleSheet.hairlineWidth, marginVertical: 2 },

  // Logout
  logoutBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 15,
    borderRadius: 16,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: '#ff444430',
    backgroundColor: '#ff444410',
    gap: 8,
  },
  logoutText: { color: '#ff4444', fontSize: 15, fontWeight: '700' },
});