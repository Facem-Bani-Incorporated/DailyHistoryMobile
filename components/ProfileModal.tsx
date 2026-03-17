// components/ProfileModal.tsx
import { Ionicons } from '@expo/vector-icons';
import { GoogleSignin } from '@react-native-google-signin/google-signin';
import * as Application from 'expo-application';
import * as Linking from 'expo-linking';
import { useRouter } from 'expo-router';
import React, { useState } from 'react';
import {
  Image,
  Modal,
  Platform,
  ScrollView,
  StatusBar,
  StyleSheet,
  Switch,
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
  desc: string;
}[] = [
  { label: 'Light',  value: 'light',  icon: 'sunny',             desc: 'Always light' },
  { label: 'System', value: 'system', icon: 'phone-portrait',    desc: 'Match device' },
  { label: 'Dark',   value: 'dark',   icon: 'moon',              desc: 'Always dark' },
];

const LANGUAGES: { code: Language; label: string; native: string; flag: string }[] = [
  { code: 'en', label: 'English',   native: 'English',   flag: '🇬🇧' },
  { code: 'ro', label: 'Romanian',  native: 'Română',    flag: '🇷🇴' },
  { code: 'fr', label: 'French',    native: 'Français',  flag: '🇫🇷' },
  { code: 'de', label: 'German',    native: 'Deutsch',   flag: '🇩🇪' },
  { code: 'es', label: 'Spanish',   native: 'Español',   flag: '🇪🇸' },
];

export default function ProfileModal({ visible, onClose }: Props) {
  const user = useAuthStore((s) => s.user);
  const logout = useAuthStore((s) => s.logout);
  const router = useRouter();
  const { mode, setMode, theme, isDark } = useTheme();
  const { t, language, setLanguage } = useLanguage();
  const insets = useSafeAreaInsets();
  const [notificationsOn, setNotificationsOn] = useState(true);
  const [langExpanded, setLangExpanded] = useState(false);

  if (!user) return null;

  const isGoogleUser = user.provider === 'google';
  const displayName = user.username || user.email?.split('@')[0] || 'Explorer';
  const displayEmail = user.email || '';
  const appVersion = Application.nativeApplicationVersion ?? '1.0.0';
  const buildNumber = Application.nativeBuildVersion ?? '1';

  const getProfileImage = () => {
    const uri = user.avatar_url || user.avatarUrl || user.picture;
    if (uri) return uri;
    return `https://ui-avatars.com/api/?name=${encodeURIComponent(displayName)}&background=ffd700&color=000&size=256&bold=true`;
  };

  const handleLogout = async () => {
    try {
      if (isGoogleUser) await GoogleSignin.signOut();
    } catch {} finally {
      onClose();
      logout();
      router.replace('/(auth)/welcome');
    }
  };

  const handleRateApp = () => {
    const storeUrl = Platform.OS === 'ios'
      ? 'https://apps.apple.com/app/id000000000' // Replace with real ID
      : 'https://play.google.com/store/apps/details?id=com.dailyhistory'; // Replace
    Linking.openURL(storeUrl).catch(() => {});
  };

  const currentLang = LANGUAGES.find(l => l.code === language) ?? LANGUAGES[0];
  const s = makeStyles(theme, isDark);

  return (
    <Modal visible={visible} animationType="slide" transparent={false} statusBarTranslucent>
      <StatusBar barStyle={isDark ? 'light-content' : 'dark-content'} translucent backgroundColor="transparent" />
      <View style={[s.root, { paddingTop: insets.top }]}>

        {/* ── HEADER ── */}
        <View style={s.header}>
          <TouchableOpacity onPress={onClose} style={s.headerBtn}
            hitSlop={{ top: 14, bottom: 14, left: 14, right: 14 }}>
            <Ionicons name="chevron-down" size={24} color={theme.text} />
          </TouchableOpacity>
          <Text style={[s.headerTitle, { color: theme.text }]}>{t('profile_title')}</Text>
          <View style={s.headerBtn} />
        </View>

        <ScrollView
          contentContainerStyle={[s.scroll, { paddingBottom: insets.bottom + 50 }]}
          showsVerticalScrollIndicator={false}
          keyboardShouldPersistTaps="handled"
        >
          {/* ── PROFILE CARD ── */}
          <View style={[s.profileCard, { backgroundColor: theme.card, borderColor: theme.border }]}>
            <View style={s.profileRow}>
              <View style={s.avatarWrap}>
                <Image source={{ uri: getProfileImage() }} style={s.avatar} />
                {isGoogleUser && (
                  <View style={[s.providerBadge, { borderColor: theme.card }]}>
                    <Ionicons name="logo-google" size={11} color="#fff" />
                  </View>
                )}
              </View>
              <View style={s.profileInfo}>
                <Text style={[s.displayName, { color: theme.text }]} numberOfLines={1}>
                  {displayName}
                </Text>
                {displayEmail !== '' && (
                  <Text style={[s.email, { color: theme.subtext }]} numberOfLines={1}>
                    {displayEmail}
                  </Text>
                )}
                <View style={s.metaRow}>
                  {user.roles?.[0] && (
                    <View style={[s.roleChip, { backgroundColor: theme.gold + '15' }]}>
                      <Text style={[s.roleText, { color: theme.gold }]}>
                        {user.roles[0].replace('ROLE_', '')}
                      </Text>
                    </View>
                  )}
                  <View style={[s.statusDot, { backgroundColor: '#34C759' }]} />
                  <Text style={[s.statusLabel, { color: theme.subtext }]}>{t('active')}</Text>
                </View>
              </View>
            </View>
          </View>

          {/* ── PREFERENCES ── */}
          <Text style={[s.sectionLabel, { color: theme.subtext }]}>
            {(t('preferences') || 'PREFERENCES').toUpperCase()}
          </Text>

          <View style={[s.card, { backgroundColor: theme.card, borderColor: theme.border }]}>
            {/* Language selector */}
            <TouchableOpacity
              onPress={() => setLangExpanded(v => !v)}
              activeOpacity={0.7}
              style={s.settingRow}
            >
              <View style={[s.settingIcon, { backgroundColor: '#5856D6' + '18' }]}>
                <Ionicons name="language" size={18} color="#5856D6" />
              </View>
              <View style={s.settingContent}>
                <Text style={[s.settingTitle, { color: theme.text }]}>{t('language')}</Text>
                <Text style={[s.settingValue, { color: theme.subtext }]}>{currentLang.native}</Text>
              </View>
              <Ionicons
                name={langExpanded ? 'chevron-up' : 'chevron-down'}
                size={18}
                color={theme.subtext}
              />
            </TouchableOpacity>

            {/* Language options (expandable) */}
            {langExpanded && (
              <View style={s.langGrid}>
                {LANGUAGES.map(lang => {
                  const active = language === lang.code;
                  return (
                    <TouchableOpacity
                      key={lang.code}
                      onPress={() => { setLanguage(lang.code); setLangExpanded(false); }}
                      activeOpacity={0.65}
                      style={[
                        s.langOption,
                        {
                          backgroundColor: active ? theme.gold : theme.background,
                          borderColor: active ? theme.gold : theme.border,
                        },
                      ]}
                    >
                      <Text style={s.langFlag}>{lang.flag}</Text>
                      <View style={{ flex: 1 }}>
                        <Text style={[s.langNative, { color: active ? '#000' : theme.text }]}>
                          {lang.native}
                        </Text>
                        <Text style={[s.langEnglish, { color: active ? '#00000088' : theme.subtext }]}>
                          {lang.label}
                        </Text>
                      </View>
                      {active && (
                        <Ionicons name="checkmark-circle" size={20} color="#000" />
                      )}
                    </TouchableOpacity>
                  );
                })}
              </View>
            )}

            <View style={[s.divider, { backgroundColor: theme.border }]} />

            {/* Notifications */}
            <View style={s.settingRow}>
              <View style={[s.settingIcon, { backgroundColor: '#FF9500' + '18' }]}>
                <Ionicons name="notifications" size={18} color="#FF9500" />
              </View>
              <View style={s.settingContent}>
                <Text style={[s.settingTitle, { color: theme.text }]}>
                  {t('notifications') || 'Notifications'}
                </Text>
                <Text style={[s.settingValue, { color: theme.subtext }]}>
                  {notificationsOn ? (t('on') || 'On') : (t('off') || 'Off')}
                </Text>
              </View>
              <Switch
                value={notificationsOn}
                onValueChange={setNotificationsOn}
                trackColor={{ false: theme.border, true: theme.gold + '60' }}
                thumbColor={notificationsOn ? theme.gold : theme.subtext}
                ios_backgroundColor={theme.border}
              />
            </View>
          </View>

          {/* ── APPEARANCE ── */}
          <Text style={[s.sectionLabel, { color: theme.subtext }]}>
            {t('appearance').toUpperCase()}
          </Text>

          <View style={[s.card, { backgroundColor: theme.card, borderColor: theme.border }]}>
            <View style={s.themeRow}>
              {THEME_OPTIONS.map(opt => {
                const active = mode === opt.value;
                return (
                  <TouchableOpacity
                    key={opt.value}
                    onPress={() => setMode(opt.value)}
                    activeOpacity={0.7}
                    style={[
                      s.themeCard,
                      {
                        backgroundColor: active ? theme.gold + '15' : theme.background,
                        borderColor: active ? theme.gold : theme.border,
                      },
                    ]}
                  >
                    <View style={[s.themeIconWrap, {
                      backgroundColor: active ? theme.gold : theme.border + '80',
                    }]}>
                      <Ionicons
                        name={opt.icon}
                        size={20}
                        color={active ? (isDark ? '#000' : '#000') : theme.subtext}
                      />
                    </View>
                    <Text style={[s.themeLabel, {
                      color: active ? theme.gold : theme.text,
                      fontWeight: active ? '700' : '500',
                    }]}>{opt.label}</Text>
                    <Text style={[s.themeDesc, { color: theme.subtext }]}>{opt.desc}</Text>
                  </TouchableOpacity>
                );
              })}
            </View>
          </View>

          {/* ── ACCOUNT ── */}
          <Text style={[s.sectionLabel, { color: theme.subtext }]}>
            {t('account').toUpperCase()}
          </Text>

          <View style={[s.card, { backgroundColor: theme.card, borderColor: theme.border }]}>
            {/* Sign-in method */}
            <View style={s.settingRow}>
              <View style={[s.settingIcon, { backgroundColor: '#007AFF' + '18' }]}>
                <Ionicons name={isGoogleUser ? 'logo-google' : 'mail'} size={18} color="#007AFF" />
              </View>
              <View style={s.settingContent}>
                <Text style={[s.settingTitle, { color: theme.text }]}>{t('sign_in_method')}</Text>
                <Text style={[s.settingValue, { color: theme.subtext }]}>
                  {isGoogleUser ? 'Google Account' : 'Email & Password'}
                </Text>
              </View>
            </View>

            <View style={[s.divider, { backgroundColor: theme.border }]} />

            {/* Rate app */}
            <TouchableOpacity onPress={handleRateApp} activeOpacity={0.7} style={s.settingRow}>
              <View style={[s.settingIcon, { backgroundColor: '#FF2D55' + '18' }]}>
                <Ionicons name="heart" size={18} color="#FF2D55" />
              </View>
              <View style={s.settingContent}>
                <Text style={[s.settingTitle, { color: theme.text }]}>
                  {t('rate_app') || 'Rate Daily History'}
                </Text>
                <Text style={[s.settingValue, { color: theme.subtext }]}>
                  {t('rate_app_desc') || 'Help us grow with a review'}
                </Text>
              </View>
              <Ionicons name="chevron-forward" size={16} color={theme.subtext} />
            </TouchableOpacity>

            <View style={[s.divider, { backgroundColor: theme.border }]} />

            {/* Share app */}
            <TouchableOpacity
              onPress={() => {
                const msg = 'Check out Daily History — learn history every day! https://dailyhistory.app';
                if (Platform.OS === 'ios' || Platform.OS === 'android') {
                  const { Share } = require('react-native');
                  Share.share({ message: msg }).catch(() => {});
                }
              }}
              activeOpacity={0.7}
              style={s.settingRow}
            >
              <View style={[s.settingIcon, { backgroundColor: '#34C759' + '18' }]}>
                <Ionicons name="share-social" size={18} color="#34C759" />
              </View>
              <View style={s.settingContent}>
                <Text style={[s.settingTitle, { color: theme.text }]}>
                  {t('share_app') || 'Share with friends'}
                </Text>
                <Text style={[s.settingValue, { color: theme.subtext }]}>
                  {t('share_app_desc') || 'Spread the love of history'}
                </Text>
              </View>
              <Ionicons name="chevron-forward" size={16} color={theme.subtext} />
            </TouchableOpacity>
          </View>

          {/* ── SIGN OUT ── */}
          <TouchableOpacity style={s.logoutBtn} onPress={handleLogout} activeOpacity={0.7}>
            <Ionicons name="log-out-outline" size={18} color="#FF3B30" />
            <Text style={s.logoutText}>{t('sign_out')}</Text>
          </TouchableOpacity>

          {/* ── FOOTER ── */}
          <View style={s.footer}>
            <Text style={[s.footerBrand, { color: theme.subtext }]}>Daily History</Text>
            <Text style={[s.footerVersion, { color: theme.subtext }]}>
              v{appVersion} ({buildNumber})
            </Text>
            <Text style={[s.footerCopy, { color: theme.subtext }]}>
              Made with care for history lovers
            </Text>
          </View>
        </ScrollView>
      </View>
    </Modal>
  );
}

// ═══════════════════════════════════════
// STYLES
// ═══════════════════════════════════════
const makeStyles = (theme: any, isDark: boolean) => StyleSheet.create({
  root: { flex: 1, backgroundColor: theme.background },

  // Header
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingVertical: 12,
  },
  headerBtn: {
    width: 36, height: 36, borderRadius: 18,
    alignItems: 'center', justifyContent: 'center',
  },
  headerTitle: {
    fontSize: 16,
    fontWeight: '700',
    letterSpacing: 0.2,
  },

  scroll: { paddingHorizontal: 20, paddingTop: 4 },

  // Profile card
  profileCard: {
    borderRadius: 20,
    borderWidth: StyleSheet.hairlineWidth,
    padding: 20,
    marginBottom: 28,
  },
  profileRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 16,
  },
  avatarWrap: { position: 'relative' },
  avatar: {
    width: 68,
    height: 68,
    borderRadius: 34,
    backgroundColor: theme.border,
  },
  providerBadge: {
    position: 'absolute', bottom: -2, right: -2,
    width: 24, height: 24, borderRadius: 12,
    backgroundColor: '#4285F4',
    alignItems: 'center', justifyContent: 'center',
    borderWidth: 2.5,
  },
  profileInfo: { flex: 1, gap: 3 },
  displayName: {
    fontSize: 20,
    fontWeight: '800',
    letterSpacing: 0.1,
  },
  email: {
    fontSize: 13,
    letterSpacing: 0.1,
    opacity: 0.7,
  },
  metaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginTop: 6,
  },
  roleChip: {
    paddingHorizontal: 10,
    paddingVertical: 3,
    borderRadius: 12,
  },
  roleText: {
    fontSize: 9,
    fontWeight: '800',
    letterSpacing: 1.5,
  },
  statusDot: {
    width: 7,
    height: 7,
    borderRadius: 4,
  },
  statusLabel: {
    fontSize: 12,
    fontWeight: '500',
  },

  // Sections
  sectionLabel: {
    fontSize: 11,
    fontWeight: '700',
    letterSpacing: 1.5,
    marginBottom: 10,
    marginLeft: 4,
  },
  card: {
    borderRadius: 18,
    borderWidth: StyleSheet.hairlineWidth,
    overflow: 'hidden',
    marginBottom: 24,
  },

  // Setting row (reusable)
  settingRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 14,
    gap: 14,
  },
  settingIcon: {
    width: 36,
    height: 36,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
  },
  settingContent: { flex: 1, gap: 1 },
  settingTitle: {
    fontSize: 15,
    fontWeight: '600',
    letterSpacing: 0.1,
  },
  settingValue: {
    fontSize: 12,
    fontWeight: '400',
    opacity: 0.7,
  },

  divider: {
    height: StyleSheet.hairlineWidth,
    marginLeft: 66,
  },

  // Language grid
  langGrid: {
    paddingHorizontal: 12,
    paddingBottom: 14,
    gap: 6,
  },
  langOption: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    paddingHorizontal: 14,
    paddingVertical: 12,
    borderRadius: 14,
    borderWidth: 1.5,
  },
  langFlag: { fontSize: 22 },
  langNative: {
    fontSize: 14,
    fontWeight: '600',
  },
  langEnglish: {
    fontSize: 11,
    fontWeight: '400',
    marginTop: 1,
  },

  // Theme cards
  themeRow: {
    flexDirection: 'row',
    gap: 8,
    padding: 12,
  },
  themeCard: {
    flex: 1,
    alignItems: 'center',
    paddingVertical: 16,
    paddingHorizontal: 8,
    borderRadius: 14,
    borderWidth: 1.5,
    gap: 8,
  },
  themeIconWrap: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
  },
  themeLabel: {
    fontSize: 13,
    letterSpacing: 0.2,
  },
  themeDesc: {
    fontSize: 10,
    fontWeight: '400',
    opacity: 0.6,
    textAlign: 'center',
  },

  // Logout
  logoutBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 16,
    borderRadius: 16,
    backgroundColor: '#FF3B30' + '0C',
    borderWidth: 1,
    borderColor: '#FF3B30' + '20',
    gap: 8,
    marginBottom: 32,
  },
  logoutText: {
    color: '#FF3B30',
    fontSize: 15,
    fontWeight: '700',
  },

  // Footer
  footer: {
    alignItems: 'center',
    gap: 4,
    paddingBottom: 10,
  },
  footerBrand: {
    fontSize: 13,
    fontWeight: '700',
    letterSpacing: 2,
    opacity: 0.3,
    fontFamily: Platform.OS === 'ios' ? 'Georgia' : 'serif',
  },
  footerVersion: {
    fontSize: 11,
    fontWeight: '500',
    opacity: 0.25,
  },
  footerCopy: {
    fontSize: 11,
    fontWeight: '400',
    opacity: 0.2,
    marginTop: 2,
  },
});