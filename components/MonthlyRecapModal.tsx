// components/MonthlyRecapModal.tsx
// ═══════════════════════════════════════════════════════════════════════════════
//  MONTHLY RECAP — Animated summary of the past month's reading activity
// ═══════════════════════════════════════════════════════════════════════════════

import { BookOpen, Flame, Star, Target, TrendingUp, X, Zap } from 'lucide-react-native';
import { GameIcon } from '../utils/GameIcon';
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
import { haptic } from '../utils/haptics';
import { LEVEL_NAMES, getLevelForXP, useGamificationStore } from '../store/useGamificationStore';

const SERIF = Platform.OS === 'ios' ? 'Georgia' : 'serif';

const MONTH_NAMES: Record<string, string[]> = {
  en: ['January','February','March','April','May','June','July','August','September','October','November','December'],
  ro: ['Ianuarie','Februarie','Martie','Aprilie','Mai','Iunie','Iulie','August','Septembrie','Octombrie','Noiembrie','Decembrie'],
  fr: ['Janvier','Février','Mars','Avril','Mai','Juin','Juillet','Août','Septembre','Octobre','Novembre','Décembre'],
  de: ['Januar','Februar','März','April','Mai','Juni','Juli','August','September','Oktober','November','Dezember'],
  es: ['Enero','Febrero','Marzo','Abril','Mayo','Junio','Julio','Agosto','Septiembre','Octubre','Noviembre','Diciembre'],
};

const T: Record<string, Record<string, string>> = {
  en: {
    title: 'Monthly Recap', subtitle: 'Your month in review',
    stories: 'Stories', xp: 'XP Earned', activeDays: 'Active Days',
    topCategory: 'Top Category', categories: 'categories', missions: 'Missions', quizzes: 'Quizzes',
    level: 'Level Reached', great: 'Legendary month!', good: 'Solid month!', keep: 'Keep going!',
    dismiss: 'Continue', noData: 'No activity last month',
  },
  ro: {
    title: 'Rezumat Lunar', subtitle: 'Luna ta în rezumat',
    stories: 'Povești', xp: 'XP Câștigat', activeDays: 'Zile Active',
    topCategory: 'Top Categorie', categories: 'categorii', missions: 'Misiuni', quizzes: 'Quiz-uri',
    level: 'Nivel Atins', great: 'Lună legendară!', good: 'Lună solidă!', keep: 'Continuă!',
    dismiss: 'Continuă', noData: 'Nicio activitate luna trecută',
  },
  fr: {
    title: 'Bilan Mensuel', subtitle: 'Votre mois en résumé',
    stories: 'Histoires', xp: 'XP Gagnés', activeDays: 'Jours Actifs',
    topCategory: 'Catégorie Favorite', categories: 'catégories', missions: 'Missions', quizzes: 'Quiz',
    level: 'Niveau Atteint', great: 'Mois légendaire !', good: 'Bon mois !', keep: 'Continuez !',
    dismiss: 'Continuer', noData: "Pas d'activité le mois dernier",
  },
  de: {
    title: 'Monatsrückblick', subtitle: 'Dein Monat im Überblick',
    stories: 'Geschichten', xp: 'XP Verdient', activeDays: 'Aktive Tage',
    topCategory: 'Top Kategorie', categories: 'Kategorien', missions: 'Missionen', quizzes: 'Quiz',
    level: 'Level Erreicht', great: 'Legendärer Monat!', good: 'Solider Monat!', keep: 'Weiter so!',
    dismiss: 'Weiter', noData: 'Keine Aktivität letzten Monat',
  },
  es: {
    title: 'Resumen Mensual', subtitle: 'Tu mes en resumen',
    stories: 'Historias', xp: 'XP Ganado', activeDays: 'Días Activos',
    topCategory: 'Categoría Favorita', categories: 'categorías', missions: 'Misiones', quizzes: 'Quizzes',
    level: 'Nivel Alcanzado', great: '¡Mes legendario!', good: '¡Buen mes!', keep: '¡Sigue así!',
    dismiss: 'Continuar', noData: 'Sin actividad el mes pasado',
  },
};
const tx = (lang: string, key: string) => (T[lang] ?? T.en)[key] ?? T.en[key] ?? key;

const StatCard = ({ icon, value, label, delay, isDark, theme, accent }: {
  icon: React.ReactNode; value: string | number; label: string; delay: number;
  isDark: boolean; theme: any; accent?: string;
}) => {
  const slide = useRef(new Animated.Value(40)).current;
  const fade = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    Animated.parallel([
      Animated.timing(slide, { toValue: 0, duration: 600, delay, easing: Easing.out(Easing.back(1.2)), useNativeDriver: true }),
      Animated.timing(fade, { toValue: 1, duration: 500, delay, useNativeDriver: true }),
    ]).start();
  }, []);

  return (
    <Animated.View style={[sc.card, { backgroundColor: isDark ? '#141210' : '#FFFFFF', borderColor: isDark ? '#251E16' : '#EDE5D8', opacity: fade, transform: [{ translateY: slide }] }]}>
      <View style={[sc.icon, { backgroundColor: (accent ?? '#FFB300') + '15' }]}>{icon}</View>
      <Text style={[sc.value, { color: accent ?? theme.text }]}>{value}</Text>
      <Text style={[sc.label, { color: theme.subtext }]}>{label}</Text>
    </Animated.View>
  );
};

const sc = StyleSheet.create({
  card: { flex: 1, alignItems: 'center', padding: 14, borderRadius: 16, borderWidth: 1, gap: 6 },
  icon: { width: 36, height: 36, borderRadius: 12, alignItems: 'center', justifyContent: 'center' },
  value: { fontSize: 22, fontWeight: '900', letterSpacing: -1 },
  label: { fontSize: 9, fontWeight: '700', letterSpacing: 0.5, textTransform: 'uppercase', textAlign: 'center' },
});

function getMonthLabel(monthKey: string, lang: string): string {
  const [year, month] = monthKey.split('-').map(Number);
  const names = MONTH_NAMES[lang] ?? MONTH_NAMES.en;
  return `${names[month - 1]} ${year}`;
}

function getMotivation(storiesRead: number, missionsCompleted: number, lang: string): string {
  if (storiesRead >= 50 || missionsCompleted >= 20) return tx(lang, 'great');
  if (storiesRead >= 20 || missionsCompleted >= 10) return tx(lang, 'good');
  return tx(lang, 'keep');
}

export default function MonthlyRecapModal({ visible, onClose }: { visible: boolean; onClose: () => void }) {
  const { theme, isDark } = useTheme();
  const { language } = useLanguage();
  const insets = useSafeAreaInsets();
  const getUnseenMonthlyRecap = useGamificationStore(s => s.getUnseenMonthlyRecap);
  const markMonthlyRecapSeen = useGamificationStore(s => s.markMonthlyRecapSeen);
  const totalXP = useGamificationStore(s => s.totalXP);

  const recap = getUnseenMonthlyRecap();

  const bg = isDark ? '#0D0A07' : '#FBF7F0';
  const gold = isDark ? '#E8B84D' : '#C77E08';

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
      haptic('success');
    }
  }, [visible]);

  const handleDismiss = () => {
    haptic('medium');
    if (recap) markMonthlyRecapSeen(recap.monthKey);
    onClose();
  };

  const level = getLevelForXP(totalXP);
  const levelName = (LEVEL_NAMES[language] ?? LEVEL_NAMES.en)[level.nameKey] ?? '';
  const formatCategory = (cat: string) => cat.replace(/_/g, ' ').replace(/\b\w/g, c => c.toUpperCase());

  return (
    <Modal visible={visible} animationType="fade" transparent statusBarTranslucent>
      <View style={ms.overlay}>
        <View style={[ms.container, { backgroundColor: bg, paddingTop: insets.top + 10 }]}>
          <TouchableOpacity onPress={handleDismiss} style={[ms.xBtn, { borderColor: isDark ? '#251E16' : '#EDE5D8' }]} hitSlop={{ top: 16, bottom: 16, left: 16, right: 16 }}>
            <X size={16} color={theme.subtext} strokeWidth={2.5} />
          </TouchableOpacity>

          <ScrollView contentContainerStyle={[ms.scroll, { paddingBottom: insets.bottom + 30 }]} showsVerticalScrollIndicator={false}>
            <Animated.View style={[ms.titleWrap, { opacity: titleFade, transform: [{ scale: titleScale }] }]}>
              <GameIcon iconKey="chart" size={40} color={gold} />
              <Text style={[ms.title, { color: theme.text }]}>{tx(language, 'title')}</Text>
              {recap && (
                <Text style={[ms.monthLabel, { color: gold }]}>
                  {getMonthLabel(recap.monthKey, language).toUpperCase()}
                </Text>
              )}
              <Text style={[ms.subtitle, { color: theme.subtext }]}>{tx(language, 'subtitle')}</Text>
            </Animated.View>

            {!recap ? (
              <View style={ms.emptyWrap}>
                <Text style={[ms.emptyText, { color: theme.subtext }]}>{tx(language, 'noData')}</Text>
              </View>
            ) : (
              <>
                {/* Row 1 */}
                <View style={ms.row}>
                  <StatCard icon={<BookOpen size={18} color="#FFB300" strokeWidth={2} />} value={recap.storiesRead} label={tx(language, 'stories')} delay={150} isDark={isDark} theme={theme} accent="#FFB300" />
                  <StatCard icon={<TrendingUp size={18} color="#10B981" strokeWidth={2} />} value={`+${recap.xpEarned.toLocaleString()}`} label={tx(language, 'xp')} delay={250} isDark={isDark} theme={theme} accent="#10B981" />
                </View>

                {/* Row 2 */}
                <View style={ms.row}>
                  <StatCard icon={<Flame size={18} color="#FF6D00" strokeWidth={2} />} value={recap.activeDays} label={tx(language, 'activeDays')} delay={350} isDark={isDark} theme={theme} accent="#FF6D00" />
                  <StatCard icon={<Target size={18} color="#A855F7" strokeWidth={2} />} value={recap.missionsCompleted} label={tx(language, 'missions')} delay={450} isDark={isDark} theme={theme} accent="#A855F7" />
                </View>

                {/* Row 3 */}
                <View style={ms.row}>
                  <StatCard icon={<Zap size={18} color="#3B82F6" strokeWidth={2} />} value={recap.quizzesCompleted} label={tx(language, 'quizzes')} delay={550} isDark={isDark} theme={theme} accent="#3B82F6" />
                  <StatCard icon={<Star size={18} color={gold} strokeWidth={2} />} value={recap.categoriesExplored} label={tx(language, 'categories')} delay={650} isDark={isDark} theme={theme} accent={gold} />
                </View>

                {/* Top category */}
                {recap.topCategory ? (
                  <View style={[ms.catCard, { backgroundColor: isDark ? '#141210' : '#FFFFFF', borderColor: isDark ? '#251E16' : '#EDE5D8' }]}>
                    <Text style={[ms.catLabel, { color: theme.subtext }]}>{tx(language, 'topCategory').toUpperCase()}</Text>
                    <Text style={[ms.catValue, { color: theme.text }]}>{formatCategory(recap.topCategory)}</Text>
                    <Text style={[ms.catSub, { color: theme.subtext }]}>
                      {recap.categoriesExplored} {tx(language, 'categories')}
                    </Text>
                  </View>
                ) : null}

                {/* Level card */}
                <View style={[ms.levelCard, { backgroundColor: gold + '10', borderColor: gold + '30' }]}>
                  <GameIcon iconKey={level.icon} size={28} color={gold} />
                  <View style={{ flex: 1, gap: 2 }}>
                    <Text style={[ms.levelName, { color: theme.text }]}>{levelName}</Text>
                    <Text style={[ms.levelLabel, { color: gold }]}>{tx(language, 'level')} {level.level}</Text>
                  </View>
                  <Text style={[ms.levelXP, { color: gold }]}>{totalXP.toLocaleString()} XP</Text>
                </View>

                <Text style={[ms.motivation, { color: theme.subtext }]}>
                  {getMotivation(recap.storiesRead, recap.missionsCompleted, language)}
                </Text>
              </>
            )}

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
  overlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.65)', justifyContent: 'center', alignItems: 'center', padding: 20 },
  container: { width: '100%', maxHeight: '92%', borderRadius: 28, overflow: 'hidden' },
  xBtn: {
    position: 'absolute', top: Platform.OS === 'ios' ? 56 : 16, right: 16,
    width: 36, height: 36, borderRadius: 12, alignItems: 'center', justifyContent: 'center',
    borderWidth: 1, zIndex: 10, backgroundColor: 'rgba(0,0,0,0.05)',
  },
  scroll: { paddingHorizontal: 24 },
  titleWrap: { alignItems: 'center', marginBottom: 24, marginTop: 8 },
  title: { fontSize: 24, fontWeight: '900', letterSpacing: -0.5, fontFamily: SERIF, marginTop: 10 },
  monthLabel: { fontSize: 11, fontWeight: '900', letterSpacing: 2, marginTop: 6 },
  subtitle: { fontSize: 12, fontWeight: '600', marginTop: 4, opacity: 0.5 },
  row: { flexDirection: 'row', gap: 10, marginBottom: 10 },
  catCard: { alignItems: 'center', padding: 16, borderRadius: 16, borderWidth: 1, marginBottom: 10, gap: 4 },
  catLabel: { fontSize: 9, fontWeight: '700', letterSpacing: 0.8, textTransform: 'uppercase', opacity: 0.5 },
  catValue: { fontSize: 18, fontWeight: '800', letterSpacing: -0.3 },
  catSub: { fontSize: 11, fontWeight: '500', opacity: 0.4 },
  levelCard: { flexDirection: 'row', alignItems: 'center', padding: 14, borderRadius: 16, borderWidth: 1, gap: 12, marginBottom: 16 },
  levelName: { fontSize: 15, fontWeight: '700' },
  levelLabel: { fontSize: 10, fontWeight: '700', letterSpacing: 0.5, textTransform: 'uppercase' },
  levelXP: { fontSize: 14, fontWeight: '800' },
  motivation: { textAlign: 'center', fontSize: 14, fontWeight: '600', marginBottom: 20, opacity: 0.4 },
  emptyWrap: { alignItems: 'center', paddingVertical: 40 },
  emptyText: { fontSize: 14, fontWeight: '500', opacity: 0.4 },
  dismissBtn: { alignSelf: 'center', paddingHorizontal: 40, paddingVertical: 14, borderRadius: 16, marginBottom: 10 },
  dismissText: { color: '#FFF', fontSize: 15, fontWeight: '800', letterSpacing: 0.3 },
});
