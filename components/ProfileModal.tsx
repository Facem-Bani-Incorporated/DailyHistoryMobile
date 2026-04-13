// components/ProfileModal.tsx
import { Ionicons } from '@expo/vector-icons';
import { GoogleSignin } from '@react-native-google-signin/google-signin';
import * as Application from 'expo-application';
import { LinearGradient } from 'expo-linear-gradient';
import * as Linking from 'expo-linking';
import { useRouter } from 'expo-router';
import React, { useEffect, useRef, useState } from 'react';
import {
  ActivityIndicator,
  Animated,
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
import { useNotifications } from '../hooks/usenotifications';
import { useAuthStore } from '../store/useAuthStore';
import {
  LEVEL_NAMES,
  useGamificationStore,
} from '../store/useGamificationStore';
import ReadingHeatmap from './ReadingHeatmap';
import SupportModal from './SupportModal';

interface Props {
  visible: boolean;
  onClose: () => void;
}

const THEME_OPTIONS: {
  label: string;
  value: ThemeMode;
  icon: keyof typeof Ionicons.glyphMap;
  premium?: boolean;
}[] = [
  { label: 'Light',   value: 'light',   icon: 'sunny-outline' },
  { label: 'System',  value: 'system',  icon: 'phone-portrait-outline' },
  { label: 'Dark',    value: 'dark',    icon: 'moon-outline' },
  { label: 'Royal',   value: 'premium', icon: 'diamond-outline', premium: true },
];

const LANGUAGES: { code: Language; label: string; native: string; flag: string }[] = [
  { code: 'en', label: 'English',   native: 'English',   flag: '🇬🇧' },
  { code: 'ro', label: 'Romanian',  native: 'Română',    flag: '🇷🇴' },
  { code: 'fr', label: 'French',    native: 'Français',  flag: '🇫🇷' },
  { code: 'de', label: 'German',    native: 'Deutsch',   flag: '🇩🇪' },
  { code: 'es', label: 'Spanish',   native: 'Español',   flag: '🇪🇸' },
];

const SERIF = Platform.OS === 'ios' ? 'Georgia' : 'serif';

/* ═══════════════ SUB-COMPONENTS ═══════════════ */

const SectionTitle = ({ label, theme }: { label: string; theme: any }) => (
  <View style={_sec.row}>
    <View style={[_sec.line, { backgroundColor: theme.border }]} />
    <Text style={[_sec.text, { color: theme.subtext }]}>{label}</Text>
    <View style={[_sec.line, { backgroundColor: theme.border }]} />
  </View>
);
const _sec = StyleSheet.create({
  row: { flexDirection: 'row', alignItems: 'center', gap: 12, marginBottom: 14, marginTop: 6, paddingHorizontal: 4 },
  line: { flex: 1, height: StyleSheet.hairlineWidth },
  text: { fontSize: 10, fontWeight: '700', letterSpacing: 2.5, textTransform: 'uppercase', opacity: 0.4 },
});

const StatCard = ({ icon, iconColor, iconBg, value, label, theme, isDark }: {
  icon: keyof typeof Ionicons.glyphMap; iconColor: string; iconBg: string;
  value: string | number; label: string; theme: any; isDark: boolean;
}) => (
  <View style={[_stat.card, { backgroundColor: isDark ? '#141210' : '#FAFAF8', borderColor: theme.border }]}>
    <View style={[_stat.iconWrap, { backgroundColor: iconBg }]}>
      <Ionicons name={icon} size={15} color={iconColor} />
    </View>
    <Text style={[_stat.value, { color: theme.text }]}>{value}</Text>
    <Text style={[_stat.label, { color: theme.subtext }]}>{label}</Text>
  </View>
);
const _stat = StyleSheet.create({
  card: { flex: 1, alignItems: 'center', paddingVertical: 14, paddingHorizontal: 4, borderRadius: 16, borderWidth: 1, gap: 5 },
  iconWrap: { width: 32, height: 32, borderRadius: 10, alignItems: 'center', justifyContent: 'center' },
  value: { fontSize: 19, fontWeight: '800', letterSpacing: -0.5 },
  label: { fontSize: 8.5, fontWeight: '600', letterSpacing: 0.8, opacity: 0.45, textAlign: 'center', textTransform: 'uppercase' },
});

const SettingRow = ({ icon, iconColor, iconBg, title, subtitle, theme, onPress, right }: {
  icon: keyof typeof Ionicons.glyphMap; iconColor: string; iconBg: string;
  title: string; subtitle?: string; theme: any; onPress?: () => void;
  right?: React.ReactNode;
}) => {
  const inner = (
    <View style={_sr.row}>
      <View style={[_sr.icon, { backgroundColor: iconBg }]}>
        <Ionicons name={icon} size={16} color={iconColor} />
      </View>
      <View style={_sr.content}>
        <Text style={[_sr.title, { color: theme.text }]}>{title}</Text>
        {subtitle ? <Text style={[_sr.sub, { color: theme.subtext }]}>{subtitle}</Text> : null}
      </View>
      {right !== undefined ? right : <Ionicons name="chevron-forward" size={14} color={theme.border} />}
    </View>
  );
  return onPress ? <TouchableOpacity activeOpacity={0.6} onPress={onPress}>{inner}</TouchableOpacity> : inner;
};
const _sr = StyleSheet.create({
  row: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 16, paddingVertical: 13, gap: 13 },
  icon: { width: 33, height: 33, borderRadius: 10, alignItems: 'center', justifyContent: 'center' },
  content: { flex: 1, gap: 1 },
  title: { fontSize: 14.5, fontWeight: '600', letterSpacing: 0.05 },
  sub: { fontSize: 11.5, fontWeight: '400', opacity: 0.5 },
});

const Hairline = ({ theme, inset }: { theme: any; inset?: boolean }) => (
  <View style={{ height: StyleSheet.hairlineWidth, backgroundColor: theme.border, marginLeft: inset ? 62 : 0 }} />
);

/* ═══════════════ PREMIUM THEME BUTTON ═══════════════ */
const PremiumThemeButton = ({ active, gold, isDark, theme, onPress }: {
  active: boolean; gold: string; isDark: boolean; theme: any; onPress: () => void;
}) => {
  const shimmer = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    Animated.loop(
      Animated.timing(shimmer, {
        toValue: 1, duration: 2500,
        useNativeDriver: true,
      }),
    ).start();
  }, []);

  const shimmerOpacity = shimmer.interpolate({
    inputRange: [0, 0.5, 1],
    outputRange: [0.3, 0.7, 0.3],
  });

  return (
    <TouchableOpacity onPress={onPress} activeOpacity={0.6}
      style={[_pm.btn, {
        backgroundColor: active ? '#0A0815' : 'transparent',
        borderColor: active ? '#D4A84360' : theme.border,
        borderWidth: active ? 1.5 : 1.5,
      }]}>
      {active && (
        <LinearGradient
          colors={['#14101E', '#0A0815', '#12100A']}
          style={StyleSheet.absoluteFill}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
        />
      )}
      {active && (
        <Animated.View style={[StyleSheet.absoluteFill, {
          backgroundColor: '#D4A843',
          opacity: shimmerOpacity,
          borderRadius: 14,
        }]} />
      )}
      <View style={[_pm.circle, {
        backgroundColor: active ? '#D4A843' : isDark ? '#1C1A16' : '#F0ECE4',
      }]}>
        <Ionicons name="diamond" size={17} color={active ? '#05040A' : theme.subtext} />
      </View>
      <Text style={[_pm.label, {
        color: active ? '#D4A843' : theme.text,
        fontWeight: active ? '800' : '500',
      }]}>Royal</Text>
      {!active && (
        <View style={_pm.badge}>
          <Text style={_pm.badgeText}>NEW</Text>
        </View>
      )}
    </TouchableOpacity>
  );
};
const _pm = StyleSheet.create({
  btn: {
    flex: 1, alignItems: 'center', paddingVertical: 16, paddingHorizontal: 6,
    borderRadius: 14, gap: 9, overflow: 'hidden', position: 'relative',
  },
  circle: { width: 36, height: 36, borderRadius: 18, alignItems: 'center', justifyContent: 'center' },
  label: { fontSize: 11.5, letterSpacing: 0.3 },
  badge: {
    position: 'absolute', top: 6, right: 6,
    backgroundColor: '#D4A843', paddingHorizontal: 5, paddingVertical: 1.5, borderRadius: 4,
  },
  badgeText: { fontSize: 6.5, fontWeight: '900', color: '#05040A', letterSpacing: 0.8 },
});

/* ═══════════════ MAIN COMPONENT ═══════════════ */

export default function ProfileModal({ visible, onClose }: Props) {
  const user = useAuthStore(s => s.user);
  const logout = useAuthStore(s => s.logout);
  const router = useRouter();
  const { mode, setMode, theme, isDark, isPremium } = useTheme();
  const { t, language, setLanguage } = useLanguage();
  const insets = useSafeAreaInsets();
  const [langExpanded, setLangExpanded] = useState(false);
  const [supportVisible, setSupportVisible] = useState(false);

  // ── Notifications hook ──
  const {
    enabled: notificationsOn,
    toggle: toggleNotifications,
    isDevAccount,
    sendTestNotification,
    testLoading,
  } = useNotifications();

  const { getStreakStatus, totalEventsRead, getXPInfo, getAchievements } = useGamificationStore();
  const { streak, longest } = getStreakStatus();
  const xpInfo = getXPInfo();
  const { unlocked: unlockedAchievements } = getAchievements();
  const levelName = (LEVEL_NAMES[language] ?? LEVEL_NAMES.en)[xpInfo.level.nameKey] ?? '';

  const fade = useRef(new Animated.Value(0)).current;
  const slide = useRef(new Animated.Value(24)).current;
  useEffect(() => {
    if (visible) {
      fade.setValue(0); slide.setValue(24);
      Animated.parallel([
        Animated.timing(fade, { toValue: 1, duration: 380, useNativeDriver: true }),
        Animated.spring(slide, { toValue: 0, tension: 90, friction: 13, useNativeDriver: true }),
      ]).start();
    }
  }, [visible]);

  if (!user) return null;

  const isGoogleUser = user.provider === 'google';
  const displayName = user.username || user.email?.split('@')[0] || 'Explorer';
  const displayEmail = user.email || '';
  const appVersion = Application.nativeApplicationVersion ?? '1.0.0';
  const buildNumber = Application.nativeBuildVersion ?? '1';
  const gold = isPremium ? '#D4A843' : isDark ? '#E8B84D' : '#C77E08';

  const getProfileImage = () => {
    const uri = user.avatar_url || user.avatarUrl || user.picture;
    if (uri) return uri;
    return `https://ui-avatars.com/api/?name=${encodeURIComponent(displayName)}&background=ffd700&color=000&size=256&bold=true`;
  };

  const handleLogout = async () => {
    try { if (isGoogleUser) await GoogleSignin.signOut(); } catch {} finally {
      onClose(); logout(); router.replace('/(auth)/welcome');
    }
  };

  const handleRateApp = () => {
    Linking.openURL(
      Platform.OS === 'ios'
        ? 'https://apps.apple.com/app/id000000000'
        : 'https://play.google.com/store/apps/details?id=com.dailyhistory'
    ).catch(() => {});
  };

  const handleShareApp = () => {
    const { Share } = require('react-native');
    Share.share({ message: `${t('share_message')}https://dailyhistory.app` }).catch(() => {});
  };

  const currentLang = LANGUAGES.find(l => l.code === language) ?? LANGUAGES[0];
  const s = makeStyles(theme, isDark, gold, isPremium);

  return (
    <>
      <Modal visible={visible} animationType="slide" transparent={false} statusBarTranslucent>
        <StatusBar barStyle={isDark ? 'light-content' : 'dark-content'} translucent backgroundColor="transparent" />
        <View style={[s.root, { paddingTop: insets.top }]}>
          {isPremium && (
            <LinearGradient
              colors={['#05040A', '#0A0815', '#05040A']}
              style={StyleSheet.absoluteFill}
            />
          )}

          <View style={s.header}>
            <TouchableOpacity onPress={onClose} style={s.closeBtn} hitSlop={{ top: 14, bottom: 14, left: 14, right: 14 }}>
              <Ionicons name="chevron-down" size={22} color={theme.text} />
            </TouchableOpacity>
            <Text style={[s.headerTitle, { color: theme.text }]}>{t('profile_title')}</Text>
            <View style={s.closeBtn} />
          </View>

          <ScrollView
            contentContainerStyle={[s.scroll, { paddingBottom: insets.bottom + 60 }]}
            showsVerticalScrollIndicator={false}
            keyboardShouldPersistTaps="handled"
          >
            <Animated.View style={{ opacity: fade, transform: [{ translateY: slide }] }}>

              {/* ══ PROFILE HERO ══ */}
              <View style={[s.heroCard, {
                backgroundColor: isPremium ? '#0F0D14' : theme.card,
                borderColor: isPremium ? '#2A2230' : theme.border,
              }]}>
                <View style={s.heroIdentity}>
                  <View style={s.avatarWrap}>
                    <Image source={{ uri: getProfileImage() }} style={s.avatar} />
                    <View style={[s.avatarGlow, { borderColor: isPremium ? '#D4A84340' : `${gold}35` }]} />
                    {isGoogleUser && (
                      <View style={[s.providerBadge, { borderColor: isPremium ? '#0F0D14' : theme.card }]}>
                        <Ionicons name="logo-google" size={10} color="#fff" />
                      </View>
                    )}
                  </View>
                  <View style={s.heroText}>
                    <Text style={[s.heroName, { color: theme.text }]} numberOfLines={1}>{displayName}</Text>
                    {displayEmail !== '' && (
                      <Text style={[s.heroEmail, { color: theme.subtext }]} numberOfLines={1}>{displayEmail}</Text>
                    )}
                  </View>
                </View>

                <View style={[s.levelBar, {
                  backgroundColor: isPremium ? '#1A1525' : isDark ? '#1A1610' : '#FFFBF2',
                  borderColor: isPremium ? '#2E2640' : isDark ? '#2A2015' : '#F0E4D0',
                }]}>
                  <Text style={s.levelEmoji}>{xpInfo.level.icon}</Text>
                  <View style={{ flex: 1 }}>
                    <View style={s.levelTopRow}>
                      <Text style={[s.levelName, { color: theme.text }]}>{levelName}</Text>
                      <Text style={[s.levelNum, { color: gold }]}>Lv.{xpInfo.level.level}</Text>
                    </View>
                    <View style={s.xpRow}>
                      <View style={[s.xpTrack, { backgroundColor: isPremium ? '#1A1520' : isDark ? '#1C1410' : '#EDE5D8' }]}>
                        <View style={[s.xpFill, { backgroundColor: gold, width: `${Math.round(xpInfo.progress.percent * 100)}%` as any }]} />
                      </View>
                      <Text style={[s.xpNums, { color: theme.subtext }]}>{xpInfo.progress.current}/{xpInfo.progress.needed}</Text>
                    </View>
                  </View>
                  <View style={s.xpTotal}>
                    <Text style={[s.xpTotalVal, { color: gold }]}>{xpInfo.totalXP.toLocaleString()}</Text>
                    <Text style={[s.xpTotalUnit, { color: theme.subtext }]}>XP</Text>
                  </View>
                </View>
              </View>

              {/* ══ STATS ══ */}
              <SectionTitle label={t('your_stats')} theme={theme} />
              <View style={s.statsGrid}>
                <StatCard icon="flame-outline" iconColor="#FF6D00" iconBg={'#FF6D0012'} value={streak} label={t('current_streak')} theme={theme} isDark={isDark} />
                <StatCard icon="trophy-outline" iconColor="#FFB300" iconBg={'#FFB30012'} value={longest} label={t('best_streak')} theme={theme} isDark={isDark} />
                <StatCard icon="book-outline" iconColor="#5856D6" iconBg={'#5856D612'} value={totalEventsRead} label={t('stories_read')} theme={theme} isDark={isDark} />
                <StatCard icon="ribbon-outline" iconColor="#34C759" iconBg={'#34C75912'} value={unlockedAchievements.length} label={t('achievements')} theme={theme} isDark={isDark} />
              </View>

              <View style={s.xpChips}>
                {xpInfo.multiplier > 1 && (
                  <View style={[s.chip, { backgroundColor: '#FF6D0010', borderColor: '#FF6D0025' }]}>
                    <Ionicons name="flash" size={11} color="#FF6D00" />
                    <Text style={[s.chipText, { color: '#FF6D00' }]}>×{xpInfo.multiplier.toFixed(1)} {t('streak_bonus')}</Text>
                  </View>
                )}
                <View style={[s.chip, { backgroundColor: `${gold}10`, borderColor: `${gold}25` }]}>
                  <Ionicons name="trending-up" size={11} color={gold} />
                  <Text style={[s.chipText, { color: gold }]}>+{xpInfo.todayXP} {t('xp_today')}</Text>
                </View>
              </View>

              <ReadingHeatmap />

              {/* ══ PREFERENCES ══ */}
              <SectionTitle label={t('preferences')} theme={theme} />
              <View style={[s.card, { backgroundColor: isPremium ? '#0F0D14' : theme.card, borderColor: isPremium ? '#2A2230' : theme.border }]}>
                <SettingRow icon="globe-outline" iconColor="#5856D6" iconBg={'#5856D610'} title={t('language')} subtitle={currentLang.native} theme={theme} onPress={() => setLangExpanded(v => !v)} right={<Ionicons name={langExpanded ? 'chevron-up' : 'chevron-down'} size={15} color={theme.subtext} />} />
                {langExpanded && (
                  <View style={s.langList}>
                    {LANGUAGES.map(lang => {
                      const active = language === lang.code;
                      return (
                        <TouchableOpacity key={lang.code} onPress={() => { setLanguage(lang.code); setLangExpanded(false); }} activeOpacity={0.6}
                          style={[s.langItem, { backgroundColor: active ? `${gold}12` : 'transparent', borderColor: active ? `${gold}35` : theme.border }]}>
                          <Text style={s.langFlag}>{lang.flag}</Text>
                          <View style={{ flex: 1 }}>
                            <Text style={[s.langNative, { color: active ? gold : theme.text }]}>{lang.native}</Text>
                            <Text style={[s.langEnglish, { color: theme.subtext }]}>{lang.label}</Text>
                          </View>
                          {active && <Ionicons name="checkmark-circle" size={17} color={gold} />}
                        </TouchableOpacity>
                      );
                    })}
                  </View>
                )}
                <Hairline theme={theme} inset />

                {/* ── Notifications toggle ── */}
                <SettingRow
                  icon="notifications-outline"
                  iconColor="#FF9500"
                  iconBg={'#FF950010'}
                  title={t('notifications')}
                  subtitle={notificationsOn ? t('on') : t('off')}
                  theme={theme}
                  right={
                    <Switch
                      value={notificationsOn}
                      onValueChange={toggleNotifications}
                      trackColor={{ false: theme.border, true: `${gold}55` }}
                      thumbColor={notificationsOn ? gold : isDark ? '#555' : '#ccc'}
                      ios_backgroundColor={theme.border}
                      style={{ transform: [{ scale: 0.82 }] }}
                    />
                  }
                />

                {/* ── Dev-only: Test Notification button ── */}
                {isDevAccount && (
                  <>
                    <Hairline theme={theme} inset />
                    <SettingRow
                      icon="bug-outline"
                      iconColor="#FF2D55"
                      iconBg={'#FF2D5510'}
                      title="Test Notification"
                      subtitle={`Fires in 3s · ${language.toUpperCase()} · real events`}
                      theme={theme}
                      onPress={testLoading ? undefined : sendTestNotification}
                      right={
                        testLoading ? (
                          <ActivityIndicator size="small" color="#FF2D55" />
                        ) : (
                          <View style={{
                            backgroundColor: '#FF2D5512',
                            paddingHorizontal: 8,
                            paddingVertical: 3,
                            borderRadius: 6,
                            borderWidth: 1,
                            borderColor: '#FF2D5525',
                          }}>
                            <Text style={{
                              color: '#FF2D55',
                              fontSize: 9,
                              fontWeight: '800',
                              letterSpacing: 1,
                            }}>
                              DEV
                            </Text>
                          </View>
                        )
                      }
                    />
                  </>
                )}
              </View>

              {/* ══ APPEARANCE ══ */}
              <SectionTitle label={t('appearance')} theme={theme} />
              <View style={[s.card, { backgroundColor: isPremium ? '#0F0D14' : theme.card, borderColor: isPremium ? '#2A2230' : theme.border }]}>
                <View style={s.themeRow}>
                  {THEME_OPTIONS.filter(o => !o.premium).map(opt => {
                    const active = mode === opt.value;
                    return (
                      <TouchableOpacity key={opt.value} onPress={() => setMode(opt.value)} activeOpacity={0.6}
                        style={[s.themeBtn, { backgroundColor: active ? `${gold}10` : 'transparent', borderColor: active ? `${gold}40` : theme.border }]}>
                        <View style={[s.themeCircle, { backgroundColor: active ? gold : isDark ? '#1C1A16' : '#F0ECE4' }]}>
                          <Ionicons name={opt.icon} size={17} color={active ? '#000' : theme.subtext} />
                        </View>
                        <Text style={[s.themeLabel, { color: active ? gold : theme.text, fontWeight: active ? '700' : '500' }]}>{opt.label}</Text>
                      </TouchableOpacity>
                    );
                  })}
                  <PremiumThemeButton
                    active={mode === 'premium'}
                    gold={gold}
                    isDark={isDark}
                    theme={theme}
                    onPress={() => setMode('premium')}
                  />
                </View>
              </View>

              {/* ══ ACCOUNT ══ */}
              <SectionTitle label={t('account')} theme={theme} />
              <View style={[s.card, { backgroundColor: isPremium ? '#0F0D14' : theme.card, borderColor: isPremium ? '#2A2230' : theme.border }]}>
                <SettingRow icon={isGoogleUser ? 'logo-google' : 'mail-outline'} iconColor="#007AFF" iconBg={'#007AFF10'} title={t('sign_in_method')} subtitle={isGoogleUser ? 'Google' : 'Email'} theme={theme} right={<View />} />
                <Hairline theme={theme} inset />
                <SettingRow icon="chatbubbles-outline" iconColor="#5856D6" iconBg={'#5856D610'} title={t('contact_support')} subtitle={t('contact_support_desc')} theme={theme} onPress={() => setSupportVisible(true)} />
                <Hairline theme={theme} inset />
                <SettingRow icon="heart-outline" iconColor="#FF2D55" iconBg={'#FF2D5510'} title={t('rate_app')} subtitle={t('rate_app_desc')} theme={theme} onPress={handleRateApp} />
                <Hairline theme={theme} inset />
                <SettingRow icon="paper-plane-outline" iconColor="#34C759" iconBg={'#34C75910'} title={t('share_app')} subtitle={t('share_app_desc')} theme={theme} onPress={handleShareApp} />
              </View>

              {/* ══ SIGN OUT ══ */}
              <TouchableOpacity style={s.logoutBtn} onPress={handleLogout} activeOpacity={0.6}>
                <Ionicons name="log-out-outline" size={15} color="#FF3B30" />
                <Text style={s.logoutText}>{t('sign_out')}</Text>
              </TouchableOpacity>

              <View style={s.footer}>
                <View style={[s.footerDot, { backgroundColor: gold }]} />
                <Text style={[s.footerBrand, { color: theme.subtext }]}>Daily History</Text>
                <Text style={[s.footerVer, { color: theme.subtext }]}>v{appVersion} ({buildNumber})</Text>
              </View>

            </Animated.View>
          </ScrollView>
        </View>
      </Modal>

      <SupportModal visible={supportVisible} onClose={() => setSupportVisible(false)} />
    </>
  );
}

const makeStyles = (theme: any, isDark: boolean, gold: string, isPremium: boolean) => StyleSheet.create({
  root: { flex: 1, backgroundColor: theme.background },
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 20, paddingVertical: 10 },
  closeBtn: { width: 36, height: 36, borderRadius: 18, alignItems: 'center', justifyContent: 'center' },
  headerTitle: { fontSize: 15, fontWeight: '600', letterSpacing: 0.3 },
  scroll: { paddingHorizontal: 20, paddingTop: 8 },
  heroCard: { borderRadius: 22, borderWidth: 1, padding: 18, marginBottom: 20, gap: 14 },
  heroIdentity: { flexDirection: 'row', alignItems: 'center', gap: 15 },
  avatarWrap: { position: 'relative' },
  avatar: { width: 58, height: 58, borderRadius: 29, backgroundColor: theme.border },
  avatarGlow: { position: 'absolute', top: -3, left: -3, width: 64, height: 64, borderRadius: 32, borderWidth: 2 },
  providerBadge: { position: 'absolute', bottom: -2, right: -2, width: 21, height: 21, borderRadius: 10.5, backgroundColor: '#4285F4', alignItems: 'center', justifyContent: 'center', borderWidth: 2.5 },
  heroText: { flex: 1, gap: 2 },
  heroName: { fontSize: 19, fontWeight: '800', letterSpacing: -0.2, fontFamily: SERIF },
  heroEmail: { fontSize: 12, fontWeight: '400', opacity: 0.45, letterSpacing: 0.1 },
  levelBar: { flexDirection: 'row', alignItems: 'center', gap: 11, paddingHorizontal: 13, paddingVertical: 11, borderRadius: 14, borderWidth: 1 },
  levelEmoji: { fontSize: 24 },
  levelTopRow: { flexDirection: 'row', alignItems: 'baseline', gap: 7, marginBottom: 5 },
  levelName: { fontSize: 13.5, fontWeight: '700', letterSpacing: -0.1 },
  levelNum: { fontSize: 9.5, fontWeight: '800', letterSpacing: 1 },
  xpRow: { flexDirection: 'row', alignItems: 'center', gap: 7 },
  xpTrack: { flex: 1, height: 4.5, borderRadius: 3, overflow: 'hidden' },
  xpFill: { height: 4.5, borderRadius: 3 },
  xpNums: { fontSize: 8.5, fontWeight: '600', opacity: 0.35, letterSpacing: 0.3, minWidth: 44 },
  xpTotal: { alignItems: 'flex-end', paddingLeft: 6 },
  xpTotalVal: { fontSize: 17, fontWeight: '900', letterSpacing: -0.8 },
  xpTotalUnit: { fontSize: 7.5, fontWeight: '700', letterSpacing: 1.5, opacity: 0.35, textTransform: 'uppercase' },
  statsGrid: { flexDirection: 'row', gap: 7, marginBottom: 10 },
  xpChips: { flexDirection: 'row', gap: 7, marginBottom: 22, paddingHorizontal: 2, flexWrap: 'wrap' },
  chip: { flexDirection: 'row', alignItems: 'center', gap: 5, paddingHorizontal: 10, paddingVertical: 6, borderRadius: 10, borderWidth: 1 },
  chipText: { fontSize: 11, fontWeight: '700', letterSpacing: 0.2 },
  card: { borderRadius: 18, borderWidth: 1, overflow: 'hidden', marginBottom: 20 },
  langList: { paddingHorizontal: 12, paddingBottom: 12, gap: 5 },
  langItem: { flexDirection: 'row', alignItems: 'center', gap: 10, paddingHorizontal: 12, paddingVertical: 10, borderRadius: 12, borderWidth: 1.5 },
  langFlag: { fontSize: 19 },
  langNative: { fontSize: 13, fontWeight: '600' },
  langEnglish: { fontSize: 10.5, fontWeight: '400', opacity: 0.45, marginTop: 1 },
  themeRow: { flexDirection: 'row', gap: 7, padding: 11 },
  themeBtn: { flex: 1, alignItems: 'center', paddingVertical: 16, paddingHorizontal: 6, borderRadius: 14, borderWidth: 1.5, gap: 9 },
  themeCircle: { width: 36, height: 36, borderRadius: 18, alignItems: 'center', justifyContent: 'center' },
  themeLabel: { fontSize: 11.5, letterSpacing: 0.3 },
  logoutBtn: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', paddingVertical: 14, borderRadius: 14, backgroundColor: '#FF3B3008', borderWidth: 1, borderColor: '#FF3B3018', gap: 7, marginTop: 4, marginBottom: 34 },
  logoutText: { color: '#FF3B30', fontSize: 13.5, fontWeight: '600', letterSpacing: 0.2 },
  footer: { alignItems: 'center', gap: 5, paddingBottom: 10 },
  footerDot: { width: 4, height: 4, borderRadius: 2, opacity: 0.3, marginBottom: 6 },
  footerBrand: { fontSize: 11, fontWeight: '700', letterSpacing: 3.5, opacity: 0.18, fontFamily: SERIF },
  footerVer: { fontSize: 9.5, fontWeight: '500', opacity: 0.12 },
});