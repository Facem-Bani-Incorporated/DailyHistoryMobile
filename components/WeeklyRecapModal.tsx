// components/WeeklyRecapModal.tsx
// ═══════════════════════════════════════════════════════════════════════════════
//  WEEKLY RECAP — Animated summary of the past week's reading activity
// ═══════════════════════════════════════════════════════════════════════════════

import { Flame, Sparkles, Target, TrendingUp, X } from 'lucide-react-native';
import React, { useEffect, useRef } from 'react';
import {
    Animated,
    Easing,
    Modal,
    Platform,
    ScrollView,
    StyleSheet,
    Text,
    TouchableOpacity,
    View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useLanguage } from '../context/LanguageContext';
import { useTheme } from '../context/ThemeContext';
import {
    LEVEL_NAMES,
    getLevelForXP,
    useGamificationStore
} from '../store/useGamificationStore';

// ── i18n ──
const T: Record<string, Record<string, string>> = {
  en: {
    title: 'Weekly Recap', subtitle: 'Your week in review',
    stories: 'Stories Read', xp: 'XP Earned', activeDays: 'Active Days',
    topCategory: 'Top Category', categories: 'Categories', goals: 'Daily Goals Hit',
    level: 'Current Level', great: 'Great week!', keep: 'Keep it up!',
    dismiss: 'Continue', noData: 'No activity last week',
  },
  ro: {
    title: 'Rezumat Săptămânal', subtitle: 'Săptămâna ta în rezumat',
    stories: 'Povești Citite', xp: 'XP Câștigat', activeDays: 'Zile Active',
    topCategory: 'Top Categorie', categories: 'Categorii', goals: 'Obiective Zilnice',
    level: 'Nivel Curent', great: 'Săptămână excelentă!', keep: 'Continuă tot așa!',
    dismiss: 'Continuă', noData: 'Nicio activitate săptămâna trecută',
  },
  fr: {
    title: 'Bilan Hebdo', subtitle: 'Votre semaine en résumé',
    stories: 'Histoires Lues', xp: 'XP Gagnés', activeDays: 'Jours Actifs',
    topCategory: 'Catégorie Favorite', categories: 'Catégories', goals: 'Objectifs Atteints',
    level: 'Niveau Actuel', great: 'Super semaine !', keep: 'Continuez !',
    dismiss: 'Continuer', noData: "Pas d'activité la semaine dernière",
  },
  de: {
    title: 'Wochenrückblick', subtitle: 'Deine Woche im Überblick',
    stories: 'Geschichten Gelesen', xp: 'XP Verdient', activeDays: 'Aktive Tage',
    topCategory: 'Top Kategorie', categories: 'Kategorien', goals: 'Tagesziele Erreicht',
    level: 'Aktuelles Level', great: 'Tolle Woche!', keep: 'Weiter so!',
    dismiss: 'Weiter', noData: 'Keine Aktivität letzte Woche',
  },
  es: {
    title: 'Resumen Semanal', subtitle: 'Tu semana en resumen',
    stories: 'Historias Leídas', xp: 'XP Ganado', activeDays: 'Días Activos',
    topCategory: 'Categoría Favorita', categories: 'Categorías', goals: 'Objetivos Diarios',
    level: 'Nivel Actual', great: '¡Gran semana!', keep: '¡Sigue así!',
    dismiss: 'Continuar', noData: 'Sin actividad la semana pasada',
  },
};
const tx = (lang: string, key: string) => (T[lang] ?? T.en)[key] ?? T.en[key] ?? key;

// ── Stat card with staggered animation ──
const RecapStat = ({
  icon,
  value,
  label,
  delay,
  isDark,
  theme,
  accent,
}: {
  icon: React.ReactNode;
  value: string | number;
  label: string;
  delay: number;
  isDark: boolean;
  theme: any;
  accent?: string;
}) => {
  const slide = useRef(new Animated.Value(40)).current;
  const fade = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    Animated.parallel([
      Animated.timing(slide, {
        toValue: 0, duration: 600, delay,
        easing: Easing.out(Easing.back(1.2)),
        useNativeDriver: true,
      }),
      Animated.timing(fade, {
        toValue: 1, duration: 500, delay,
        useNativeDriver: true,
      }),
    ]).start();
  }, []);

  return (
    <Animated.View style={[
      ss.statCard,
      {
        backgroundColor: isDark ? '#141210' : '#FFFFFF',
        borderColor: isDark ? '#251E16' : '#EDE5D8',
        opacity: fade,
        transform: [{ translateY: slide }],
      },
    ]}>
      <View style={[ss.statIcon, { backgroundColor: (accent ?? '#FFB300') + '15' }]}>
        {icon}
      </View>
      <Text style={[ss.statValue, { color: accent ?? theme.text }]}>{value}</Text>
      <Text style={[ss.statLabel, { color: theme.subtext }]}>{label}</Text>
    </Animated.View>
  );
};

const ss = StyleSheet.create({
  statCard: {
    flex: 1,
    alignItems: 'center',
    padding: 14,
    borderRadius: 16,
    borderWidth: 1,
    gap: 6,
  },
  statIcon: {
    width: 36,
    height: 36,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  statValue: { fontSize: 22, fontWeight: '900', letterSpacing: -1 },
  statLabel: { fontSize: 9, fontWeight: '700', letterSpacing: 0.5, textTransform: 'uppercase', textAlign: 'center' },
});

// ── Main Modal ──
export default function WeeklyRecapModal({
  visible,
  onClose,
}: {
  visible: boolean;
  onClose: () => void;
}) {
  const { theme, isDark } = useTheme();
  const { language } = useLanguage();
  const insets = useSafeAreaInsets();
  const getUnseenRecap = useGamificationStore(s => s.getUnseenRecap);
  const getLatestRecap = useGamificationStore(s => s.getLatestRecap);
  const markRecapSeen = useGamificationStore(s => s.markRecapSeen);
  const totalXP = useGamificationStore(s => s.totalXP);

  const recap = getUnseenRecap() ?? getLatestRecap();

  const bg = isDark ? '#0D0A07' : '#FBF7F0';
  const cardBrd = isDark ? '#251E16' : '#EDE5D8';
  const gold = isDark ? '#E8B84D' : '#C77E08';

  // Entrance animations
  const titleScale = useRef(new Animated.Value(0.8)).current;
  const titleFade = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    if (visible) {
      titleScale.setValue(0.8);
      titleFade.setValue(0);
      Animated.parallel([
        Animated.spring(titleScale, { toValue: 1, tension: 80, friction: 8, useNativeDriver: true }),
        Animated.timing(titleFade, { toValue: 1, duration: 500, useNativeDriver: true }),
      ]).start();
    }
  }, [visible]);

  const handleDismiss = () => {
    if (recap) markRecapSeen(recap.weekKey);
    onClose();
  };

  const level = getLevelForXP(totalXP);
  const levelName = (LEVEL_NAMES[language] ?? LEVEL_NAMES.en)[level.nameKey] ?? '';

  const formatCategory = (cat: string) =>
    cat.replace(/_/g, ' ').replace(/\b\w/g, c => c.toUpperCase());

  return (
    <Modal visible={visible} animationType="fade" transparent statusBarTranslucent>
      <View style={[ms.overlay]}>
        <View style={[ms.container, { backgroundColor: bg, paddingTop: insets.top + 10 }]}>
          {/* Close button */}
          <TouchableOpacity onPress={handleDismiss} style={[ms.xBtn, { borderColor: cardBrd }]} hitSlop={{ top: 16, bottom: 16, left: 16, right: 16 }}>
            <X size={16} color={theme.subtext} strokeWidth={2.5} />
          </TouchableOpacity>

          <ScrollView contentContainerStyle={[ms.scroll, { paddingBottom: insets.bottom + 30 }]} showsVerticalScrollIndicator={false}>
            {/* Title */}
            <Animated.View style={[ms.titleWrap, { opacity: titleFade, transform: [{ scale: titleScale }] }]}>
              <Text style={ms.titleEmoji}>📊</Text>
              <Text style={[ms.title, { color: theme.text }]}>{tx(language, 'title')}</Text>
              <Text style={[ms.subtitle, { color: gold }]}>{tx(language, 'subtitle')}</Text>
            </Animated.View>

            {!recap ? (
              <View style={ms.emptyWrap}>
                <Text style={[ms.emptyText, { color: theme.subtext }]}>{tx(language, 'noData')}</Text>
              </View>
            ) : (
              <>
                {/* Stats grid — row 1 */}
                <View style={ms.row}>
                  <RecapStat
                    icon={<Sparkles size={18} color="#FFB300" strokeWidth={2} />}
                    value={recap.storiesRead}
                    label={tx(language, 'stories')}
                    delay={200}
                    isDark={isDark}
                    theme={theme}
                    accent="#FFB300"
                  />
                  <RecapStat
                    icon={<TrendingUp size={18} color="#10B981" strokeWidth={2} />}
                    value={`+${recap.xpEarned}`}
                    label={tx(language, 'xp')}
                    delay={300}
                    isDark={isDark}
                    theme={theme}
                    accent="#10B981"
                  />
                </View>

                {/* Stats grid — row 2 */}
                <View style={ms.row}>
                  <RecapStat
                    icon={<Flame size={18} color="#FF6D00" strokeWidth={2} />}
                    value={`${recap.streakDays}/7`}
                    label={tx(language, 'activeDays')}
                    delay={400}
                    isDark={isDark}
                    theme={theme}
                    accent="#FF6D00"
                  />
                  <RecapStat
                    icon={<Target size={18} color="#A855F7" strokeWidth={2} />}
                    value={recap.dailyGoalsHit}
                    label={tx(language, 'goals')}
                    delay={500}
                    isDark={isDark}
                    theme={theme}
                    accent="#A855F7"
                  />
                </View>

                {/* Top category */}
                {recap.topCategory && (
                  <View style={[ms.catCard, { backgroundColor: isDark ? '#141210' : '#FFFFFF', borderColor: cardBrd }]}>
                    <Text style={[ms.catLabel, { color: theme.subtext }]}>{tx(language, 'topCategory')}</Text>
                    <Text style={[ms.catValue, { color: theme.text }]}>{formatCategory(recap.topCategory)}</Text>
                    <Text style={[ms.catSub, { color: theme.subtext }]}>
                      {recap.categoriesExplored} {tx(language, 'categories').toLowerCase()}
                    </Text>
                  </View>
                )}

                {/* Level card */}
                <View style={[ms.levelCard, { backgroundColor: gold + '10', borderColor: gold + '30' }]}>
                  <Text style={ms.levelIcon}>{level.icon}</Text>
                  <View style={{ flex: 1, gap: 2 }}>
                    <Text style={[ms.levelName, { color: theme.text }]}>{levelName}</Text>
                    <Text style={[ms.levelLabel, { color: gold }]}>{tx(language, 'level')} {level.level}</Text>
                  </View>
                  <Text style={[ms.levelXP, { color: gold }]}>{totalXP.toLocaleString()} XP</Text>
                </View>

                {/* Motivation */}
                <Text style={[ms.motivation, { color: theme.subtext }]}>
                  {recap.storiesRead >= 20 ? tx(language, 'great') : tx(language, 'keep')}
                </Text>
              </>
            )}

            {/* Dismiss button */}
            <TouchableOpacity onPress={handleDismiss} style={[ms.dismissBtn, { backgroundColor: gold }]} activeOpacity={0.8}>
              <Text style={ms.dismissText}>{tx(language, 'dismiss')}</Text>
            </TouchableOpacity>
          </ScrollView>
        </View>
      </View>
    </Modal>
  );
}

const ms = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.6)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  container: {
    width: '100%',
    maxHeight: '90%',
    borderRadius: 28,
    overflow: 'hidden',
  },
  xBtn: {
    position: 'absolute',
    top: Platform.OS === 'ios' ? 56 : 16,
    right: 16,
    width: 36,
    height: 36,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    zIndex: 10,
    backgroundColor: 'rgba(0,0,0,0.05)',
  },
  scroll: { paddingHorizontal: 24 },
  titleWrap: { alignItems: 'center', marginBottom: 24, marginTop: 8 },
  titleEmoji: { fontSize: 40, marginBottom: 8 },
  title: {
    fontSize: 24,
    fontWeight: '900',
    letterSpacing: -0.5,
    fontFamily: Platform.OS === 'ios' ? 'Georgia' : 'serif',
  },
  subtitle: { fontSize: 12, fontWeight: '700', letterSpacing: 1, marginTop: 4, textTransform: 'uppercase' },
  row: { flexDirection: 'row', gap: 10, marginBottom: 10 },
  catCard: {
    alignItems: 'center',
    padding: 16,
    borderRadius: 16,
    borderWidth: 1,
    marginBottom: 10,
    gap: 4,
  },
  catLabel: { fontSize: 9, fontWeight: '700', letterSpacing: 0.8, textTransform: 'uppercase', opacity: 0.5 },
  catValue: { fontSize: 18, fontWeight: '800', letterSpacing: -0.3 },
  catSub: { fontSize: 11, fontWeight: '500', opacity: 0.4 },
  levelCard: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 14,
    borderRadius: 16,
    borderWidth: 1,
    gap: 12,
    marginBottom: 16,
  },
  levelIcon: { fontSize: 28 },
  levelName: { fontSize: 15, fontWeight: '700' },
  levelLabel: { fontSize: 10, fontWeight: '700', letterSpacing: 0.5, textTransform: 'uppercase' },
  levelXP: { fontSize: 14, fontWeight: '800' },
  motivation: {
    textAlign: 'center',
    fontSize: 14,
    fontWeight: '600',
    marginBottom: 20,
    opacity: 0.4,
  },
  emptyWrap: { alignItems: 'center', paddingVertical: 40 },
  emptyText: { fontSize: 14, fontWeight: '500', opacity: 0.4 },
  dismissBtn: {
    alignSelf: 'center',
    paddingHorizontal: 40,
    paddingVertical: 14,
    borderRadius: 16,
    marginBottom: 10,
  },
  dismissText: { color: '#FFF', fontSize: 15, fontWeight: '800', letterSpacing: 0.3 },
});