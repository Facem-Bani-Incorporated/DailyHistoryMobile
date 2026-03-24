// components/StreakIcon.tsx
import { Ionicons } from '@expo/vector-icons';
import LottieView from 'lottie-react-native';
import { X } from 'lucide-react-native';
import { useEffect, useRef, useState } from 'react';
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
import Svg, { Circle, Defs, LinearGradient, Stop } from 'react-native-svg';
import { useLanguage } from '../context/LanguageContext';
import { useTheme } from '../context/ThemeContext';
import { useGamificationStore } from '../store/useGamificationStore';

const SERIF = Platform.OS === 'ios' ? 'Georgia' : 'serif';
const GOAL = 5;
const LOTTIE_URI = 'https://lottie.host/605591b9-00ac-4d2e-8fb8-fa339587ef8c/UuLbWlRAAw.lottie';

// ─── i18n ────────────────────────────────────────────────────────────────
const L: Record<string, Record<string, string>> = {
  en: {
    title: 'Streak', day: 'day streak', days: 'days streak',
    best: 'Best', total: 'Read', goal: 'Daily goal',
    done: 'Complete', left: 'to go',
    doneMsg: 'Daily goal reached. Come back tomorrow!',
    goMsg: 'Keep reading to hit your goal.',
    recent: 'Read today', tip: 'Read every day to keep your streak alive.',
    more: 'Show all', less: 'Show less',
  },
  ro: {
    title: 'Streak', day: 'zi consecutivă', days: 'zile consecutive',
    best: 'Record', total: 'Citite', goal: 'Obiectiv zilnic',
    done: 'Complet', left: 'rămase',
    doneMsg: 'Obiectiv atins. Revino mâine!',
    goMsg: 'Citește pentru a atinge obiectivul.',
    recent: 'Citite azi', tip: 'Citește zilnic pentru a-ți menține streak-ul.',
    more: 'Toate', less: 'Mai puține',
  },
  fr: {
    title: 'Série', day: 'jour consécutif', days: 'jours consécutifs',
    best: 'Record', total: 'Lus', goal: 'Objectif du jour',
    done: 'Terminé', left: 'restantes',
    doneMsg: 'Objectif atteint. Revenez demain !',
    goMsg: 'Continuez pour atteindre votre objectif.',
    recent: "Lus aujourd'hui", tip: 'Lisez chaque jour pour maintenir votre série.',
    more: 'Tout voir', less: 'Moins',
  },
  de: {
    title: 'Streak', day: 'Tag in Folge', days: 'Tage in Folge',
    best: 'Rekord', total: 'Gelesen', goal: 'Tagesziel',
    done: 'Fertig', left: 'übrig',
    doneMsg: 'Tagesziel erreicht. Komm morgen wieder!',
    goMsg: 'Weiterlesen um dein Ziel zu erreichen.',
    recent: 'Heute gelesen', tip: 'Lies täglich um deinen Streak zu halten.',
    more: 'Alle zeigen', less: 'Weniger',
  },
  es: {
    title: 'Racha', day: 'día consecutivo', days: 'días consecutivos',
    best: 'Récord', total: 'Leídos', goal: 'Meta diaria',
    done: 'Completo', left: 'restantes',
    doneMsg: 'Meta alcanzada. ¡Vuelve mañana!',
    goMsg: 'Sigue leyendo para alcanzar tu meta.',
    recent: 'Leídos hoy', tip: 'Lee cada día para mantener tu racha.',
    more: 'Ver todo', less: 'Menos',
  },
};
const tx = (lang: string, k: string) => (L[lang] ?? L.en)[k] ?? L.en[k] ?? k;

// ─── Clean event name ────────────────────────────────────────────────────
const cleanName = (id: string) => {
  const dm = id.match(/^(\d{4}-\d{2}-\d{2})/);
  const parts = id.split('_');
  if (dm) {
    const n = parts.slice(1).join(' ').replace(/-/g, ' ').trim();
    return { name: n || id.replace(/_/g, ' '), date: dm[1] };
  }
  return { name: id.replace(/_/g, ' ').replace(/-/g, ' '), date: '' };
};

// ═══════════════════════════════════════════════════════════════════════════
//  PROGRESS RING
// ═══════════════════════════════════════════════════════════════════════════
const RS = 68, RW = 3.5, RR = (RS - RW) / 2, RC = 2 * Math.PI * RR;

const ProgressRing = ({ read, total, theme, isDark }: {
  read: number; total: number; theme: any; isDark: boolean;
}) => {
  const p = total > 0 ? Math.min(read / total, 1) : 0;
  const ok = p >= 1;
  return (
    <View style={{ width: RS, height: RS, alignItems: 'center', justifyContent: 'center' }}>
      <Svg width={RS} height={RS}>
        <Defs>
          <LinearGradient id="rg" x1="0" y1="0" x2="1" y2="1">
            <Stop offset="0" stopColor={ok ? '#34D399' : '#FF8F00'} />
            <Stop offset="1" stopColor={ok ? '#10B981' : '#FFC107'} />
          </LinearGradient>
        </Defs>
        <Circle cx={RS / 2} cy={RS / 2} r={RR}
          stroke={isDark ? '#1E1812' : '#EDEAD5'} strokeWidth={RW} fill="none" />
        <Circle cx={RS / 2} cy={RS / 2} r={RR}
          stroke="url(#rg)" strokeWidth={RW} fill="none"
          strokeDasharray={RC} strokeDashoffset={RC * (1 - p)}
          strokeLinecap="round" rotation="-90" origin={`${RS / 2}, ${RS / 2}`} />
      </Svg>
      <View style={{ position: 'absolute', alignItems: 'center' }}>
        <Text style={{ fontSize: 15, fontWeight: '900', color: ok ? '#34D399' : theme.text, letterSpacing: -0.5 }}>
          {ok ? '✓' : `${read}`}
        </Text>
        <Text style={{ fontSize: 7, fontWeight: '700', color: theme.subtext, opacity: 0.35, letterSpacing: 0.5, marginTop: 1 }}>
          /{total}
        </Text>
      </View>
    </View>
  );
};

// ═══════════════════════════════════════════════════════════════════════════
//  STREAK MODAL
// ═══════════════════════════════════════════════════════════════════════════
const StreakModal = ({ visible, onClose }: { visible: boolean; onClose: () => void }) => {
  const { theme, isDark } = useTheme();
  const { language } = useLanguage();
  const ins = useSafeAreaInsets();
  const { getStreakStatus, getTodayProgress, totalEventsRead, readEventsToday } = useGamificationStore();
  const { streak, longest } = getStreakStatus();
  const { read: rawRead } = getTodayProgress();
  const read = Math.min(rawRead, GOAL);
  const [showAll, setShowAll] = useState(false);
  const items = showAll ? readEventsToday : readEventsToday.slice(0, 4);

  // Fade-in animations
  const fadeHero = useRef(new Animated.Value(0)).current;
  const fadeStats = useRef(new Animated.Value(0)).current;
  const fadeGoal = useRef(new Animated.Value(0)).current;
  const fadeList = useRef(new Animated.Value(0)).current;
  const slideHero = useRef(new Animated.Value(20)).current;
  const slideStats = useRef(new Animated.Value(20)).current;
  const slideGoal = useRef(new Animated.Value(20)).current;
  const slideList = useRef(new Animated.Value(20)).current;

  useEffect(() => {
    if (visible) {
      setShowAll(false);
      fadeHero.setValue(0); fadeStats.setValue(0); fadeGoal.setValue(0); fadeList.setValue(0);
      slideHero.setValue(20); slideStats.setValue(20); slideGoal.setValue(20); slideList.setValue(20);

      const anim = (fade: Animated.Value, slide: Animated.Value, delay: number) =>
        Animated.parallel([
          Animated.timing(fade, { toValue: 1, duration: 400, delay, useNativeDriver: true }),
          Animated.spring(slide, { toValue: 0, tension: 70, friction: 12, delay, useNativeDriver: true }),
        ]);

      Animated.stagger(100, [
        anim(fadeHero, slideHero, 100),
        anim(fadeStats, slideStats, 0),
        anim(fadeGoal, slideGoal, 0),
        anim(fadeList, slideList, 0),
      ]).start();
    }
  }, [visible]);

  // Colors
  const bg = isDark ? '#090807' : '#FDFBF7';
  const card = isDark ? '#121010' : '#FFFFFF';
  const brd = isDark ? '#1E1A15' : '#EDE7DC';
  const accent = isDark ? '#E0A840' : '#C47D08';
  const sub = isDark ? 'rgba(255,255,255,0.32)' : 'rgba(0,0,0,0.32)';
  const dimBg = isDark ? '#0E0C0A' : '#FAF7F2';

  return (
    <Modal visible={visible} animationType="slide" transparent={false} statusBarTranslucent>
      <View style={[ms.root, { backgroundColor: bg, paddingTop: ins.top }]}>
        {/* ── Header ── */}
        <View style={ms.hdr}>
          <View style={{ width: 36 }} />
          <Text style={[ms.hdrTitle, { color: theme.text }]}>{tx(language, 'title')}</Text>
          <TouchableOpacity onPress={onClose} hitSlop={{ top: 16, bottom: 16, left: 16, right: 16 }}
            style={[ms.closeBtn, { backgroundColor: isDark ? '#181412' : '#F5F0E8', borderColor: brd }]}>
            <X size={15} color={theme.subtext} strokeWidth={2.5} />
          </TouchableOpacity>
        </View>

        <ScrollView contentContainerStyle={[ms.scroll, { paddingBottom: ins.bottom + 40 }]}
          showsVerticalScrollIndicator={false}>

          {/* ═══ HERO — Lottie Fire + Streak Number ═══ */}
          <Animated.View style={[ms.heroCard, {
            backgroundColor: '#0A0806', borderColor: brd,
            opacity: fadeHero, transform: [{ translateY: slideHero }],
          }]}>
            {/* Lottie fire — big, centered */}
            <View style={ms.lottieWrap}>
              {streak > 0 ? (
                <LottieView
                  source={{ uri: LOTTIE_URI }}
                  autoPlay
                  loop
                  speed={0.8}
                  style={ms.lottieBig}
                />
              ) : (
                <View style={ms.deadEmber}>
                  <View style={[ms.emberDot, { backgroundColor: isDark ? '#2A1F14' : '#3E2A18' }]} />
                </View>
              )}
            </View>

            {/* Streak number overlay */}
            <View style={ms.heroTextWrap}>
              <Text style={ms.heroNumber}>{streak}</Text>
              <Text style={[ms.heroLabel, { color: accent }]}>
                {streak === 1 ? tx(language, 'day') : tx(language, 'days')}
              </Text>
            </View>

            {/* Subtle divider */}
            <View style={[ms.heroDivider, { backgroundColor: brd }]} />

            {/* Inline stats under the fire */}
            <View style={ms.heroStatsRow}>
              <View style={ms.heroStat}>
                <Ionicons name="trophy" size={13} color="#FFB300" />
                <Text style={[ms.heroStatVal, { color: '#fff' }]}>{longest}</Text>
                <Text style={ms.heroStatLbl}>{tx(language, 'best')}</Text>
              </View>
              <View style={[ms.heroStatDivider, { backgroundColor: 'rgba(255,255,255,0.08)' }]} />
              <View style={ms.heroStat}>
                <Ionicons name="book" size={13} color="#7C6BC4" />
                <Text style={[ms.heroStatVal, { color: '#fff' }]}>{totalEventsRead}</Text>
                <Text style={ms.heroStatLbl}>{tx(language, 'total')}</Text>
              </View>
            </View>
          </Animated.View>

          {/* ═══ TODAY'S GOAL ═══ */}
          <Animated.View style={[ms.goalCard, {
            backgroundColor: card, borderColor: brd,
            opacity: fadeGoal, transform: [{ translateY: slideGoal }],
          }]}>
            <View style={ms.goalHeader}>
              <Text style={[ms.goalTitle, { color: theme.text }]}>{tx(language, 'goal')}</Text>
              <View style={[ms.goalBadge, {
                backgroundColor: read >= GOAL ? '#34D39915' : (accent + '15'),
              }]}>
                <Text style={[ms.goalBadgeT, {
                  color: read >= GOAL ? '#34D399' : accent,
                }]}>
                  {read >= GOAL ? tx(language, 'done') : `${GOAL - read} ${tx(language, 'left')}`}
                </Text>
              </View>
            </View>

            <View style={ms.goalBody}>
              <ProgressRing read={read} total={GOAL} theme={theme} isDark={isDark} />
              <View style={{ flex: 1, gap: 8 }}>
                <Text style={[ms.goalMsg, { color: sub }]}>
                  {read >= GOAL ? tx(language, 'doneMsg') : tx(language, 'goMsg')}
                </Text>
                {/* Progress bar segments */}
                <View style={ms.barRow}>
                  {Array.from({ length: GOAL }).map((_, i) => (
                    <View key={i} style={[ms.barSeg, {
                      backgroundColor: i < read
                        ? (read >= GOAL ? '#34D399' : accent)
                        : (isDark ? '#1A1510' : '#F0EBE3'),
                    }]} />
                  ))}
                </View>
              </View>
            </View>
          </Animated.View>

          {/* ═══ RECENTLY READ ═══ */}
          {readEventsToday.length > 0 && (
            <Animated.View style={[ms.listCard, {
              backgroundColor: card, borderColor: brd,
              opacity: fadeList, transform: [{ translateY: slideList }],
            }]}>
              <View style={ms.listHeader}>
                <Text style={[ms.listTitle, { color: theme.text }]}>{tx(language, 'recent')}</Text>
                <View style={[ms.listCount, { backgroundColor: dimBg }]}>
                  <Text style={[ms.listCountT, { color: accent }]}>{readEventsToday.length}</Text>
                </View>
              </View>

              {items.map((eid, i) => {
                const { name, date } = cleanName(eid);
                return (
                  <View key={eid}>
                    {i > 0 && <View style={[ms.listDiv, { backgroundColor: brd }]} />}
                    <View style={ms.listItem}>
                      <View style={[ms.listCheck, { backgroundColor: accent + '12' }]}>
                        <Ionicons name="checkmark" size={12} color={accent} />
                      </View>
                      <View style={{ flex: 1 }}>
                        <Text style={[ms.listName, { color: theme.text }]} numberOfLines={2}>{name}</Text>
                        {date !== '' && <Text style={[ms.listDate, { color: sub }]}>{date}</Text>}
                      </View>
                    </View>
                  </View>
                );
              })}

              {readEventsToday.length > 4 && (
                <>
                  <View style={[ms.listDiv, { backgroundColor: brd }]} />
                  <TouchableOpacity onPress={() => setShowAll(v => !v)} activeOpacity={0.6} style={ms.moreBtn}>
                    <Text style={[ms.moreTxt, { color: accent }]}>
                      {showAll ? tx(language, 'less') : `${tx(language, 'more')} (${readEventsToday.length - 4})`}
                    </Text>
                    <Ionicons name={showAll ? 'chevron-up' : 'chevron-down'} size={13} color={accent} />
                  </TouchableOpacity>
                </>
              )}
            </Animated.View>
          )}

          {/* ═══ TIP ═══ */}
          <View style={[ms.tipCard, { borderColor: brd }]}>
            <Ionicons name="sparkles" size={13} color={accent} style={{ marginTop: 1 }} />
            <Text style={[ms.tipText, { color: sub }]}>{tx(language, 'tip')}</Text>
          </View>

        </ScrollView>
      </View>
    </Modal>
  );
};

const ms = StyleSheet.create({
  root: { flex: 1 },

  // Header
  hdr: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 20, height: 54 },
  hdrTitle: { fontSize: 16, fontWeight: '800', letterSpacing: 0.3 },
  closeBtn: { width: 36, height: 36, borderRadius: 12, alignItems: 'center', justifyContent: 'center', borderWidth: 1 },

  scroll: { paddingHorizontal: 20, paddingTop: 4 },

  // Hero card
  heroCard: { borderRadius: 24, borderWidth: 1, overflow: 'hidden', marginBottom: 12 },
  lottieWrap: { width: '100%', height: 180, alignItems: 'center', justifyContent: 'center' },
  lottieBig: { width: 200, height: 200 },
  deadEmber: { width: 60, height: 40, alignItems: 'center', justifyContent: 'center' },
  emberDot: { width: 20, height: 12, borderRadius: 6, opacity: 0.3 },
  heroTextWrap: { alignItems: 'center', paddingBottom: 16, marginTop: -16 },
  heroNumber: { fontSize: 50, fontWeight: '900', color: '#FFFFFF', letterSpacing: -3, fontFamily: SERIF },
  heroLabel: { fontSize: 11, fontWeight: '800', letterSpacing: 2, textTransform: 'uppercase', marginTop: -2 },
  heroDivider: { height: StyleSheet.hairlineWidth, marginHorizontal: 20 },
  heroStatsRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', paddingVertical: 16 },
  heroStat: { flexDirection: 'row', alignItems: 'center', gap: 6, paddingHorizontal: 20 },
  heroStatVal: { fontSize: 18, fontWeight: '900', letterSpacing: -0.5 },
  heroStatLbl: { fontSize: 9, fontWeight: '700', color: 'rgba(255,255,255,0.3)', letterSpacing: 0.5, textTransform: 'uppercase' },
  heroStatDivider: { width: 1, height: 20 },

  // Goal card
  goalCard: { borderRadius: 20, borderWidth: 1, padding: 18, marginBottom: 12 },
  goalHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 16 },
  goalTitle: { fontSize: 14, fontWeight: '800', letterSpacing: -0.2 },
  goalBadge: { paddingHorizontal: 10, paddingVertical: 4, borderRadius: 10 },
  goalBadgeT: { fontSize: 10, fontWeight: '800', letterSpacing: 0.3 },
  goalBody: { flexDirection: 'row', alignItems: 'center', gap: 16 },
  goalMsg: { fontSize: 12.5, lineHeight: 18 },
  barRow: { flexDirection: 'row', gap: 4 },
  barSeg: { flex: 1, height: 4, borderRadius: 2 },

  // List card
  listCard: { borderRadius: 20, borderWidth: 1, overflow: 'hidden', marginBottom: 12 },
  listHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 18, paddingTop: 16, paddingBottom: 12 },
  listTitle: { fontSize: 14, fontWeight: '800', letterSpacing: -0.2 },
  listCount: { width: 24, height: 24, borderRadius: 12, alignItems: 'center', justifyContent: 'center' },
  listCountT: { fontSize: 11, fontWeight: '800' },
  listItem: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 18, paddingVertical: 12, gap: 12 },
  listCheck: { width: 24, height: 24, borderRadius: 12, alignItems: 'center', justifyContent: 'center' },
  listName: { fontSize: 13, fontWeight: '600', lineHeight: 18 },
  listDate: { fontSize: 10, marginTop: 2 },
  listDiv: { height: StyleSheet.hairlineWidth, marginLeft: 54 },
  moreBtn: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 4, paddingVertical: 12 },
  moreTxt: { fontSize: 12, fontWeight: '700' },

  // Tip
  tipCard: { flexDirection: 'row', gap: 10, paddingVertical: 14, paddingHorizontal: 16, borderRadius: 14, borderWidth: 1 },
  tipText: { flex: 1, fontSize: 12, lineHeight: 18 },
});

// ═══════════════════════════════════════════════════════════════════════════
//  HEADER ICON — Lottie micro fire + badge
// ═══════════════════════════════════════════════════════════════════════════
export default function StreakIcon() {
  const { theme, isDark } = useTheme();
  const { getStreakStatus, getTodayProgress } = useGamificationStore();
  const [show, setShow] = useState(false);
  const { streak } = getStreakStatus();
  const { read } = getTodayProgress();
  const active = streak > 0 && read > 0;

  const pulse = useRef(new Animated.Value(0)).current;
  const tap = useRef(new Animated.Value(1)).current;

  useEffect(() => {
    if (active) {
      Animated.loop(Animated.sequence([
        Animated.timing(pulse, { toValue: 1, duration: 1500, easing: Easing.inOut(Easing.sin), useNativeDriver: true }),
        Animated.timing(pulse, { toValue: 0, duration: 1800, easing: Easing.inOut(Easing.sin), useNativeDriver: true }),
      ])).start();
    } else { pulse.setValue(0); }
  }, [active]);

  const onPress = () => {
    Animated.sequence([
      Animated.timing(tap, { toValue: 0.85, duration: 60, useNativeDriver: true }),
      Animated.spring(tap, { toValue: 1, tension: 300, friction: 10, useNativeDriver: true }),
    ]).start();
    setShow(true);
  };

  return (
    <>
      <TouchableOpacity onPress={onPress} activeOpacity={0.8}
        style={[ic.wrap, {
          backgroundColor: active ? (isDark ? '#1A1208' : '#FFFAF0') : (isDark ? '#141110' : '#F8F5EF'),
          borderColor: active ? (isDark ? '#3A2810' : '#EDD8A8') : (isDark ? '#1E1A15' : '#EDE7DC'),
        }]}>
        {/* Glow ring */}
        {active && (
          <Animated.View style={{
            ...StyleSheet.absoluteFillObject, borderRadius: 13,
            borderWidth: 1.5, borderColor: '#FF8F00',
            opacity: pulse.interpolate({ inputRange: [0, 1], outputRange: [0, 0.3] }),
            transform: [{ scale: pulse.interpolate({ inputRange: [0, 1], outputRange: [1, 1.12] }) }],
          }} />
        )}
        <Animated.View style={{ transform: [{ scale: tap }] }}>
          {active ? (
            <LottieView
              source={{ uri: LOTTIE_URI }}
              autoPlay
              loop
              speed={0.7}
              style={{ width: 26, height: 26 }}
            />
          ) : (
            <View style={{ width: 18, height: 18, alignItems: 'center', justifyContent: 'flex-end' }}>
              <View style={{ width: 7, height: 9, borderRadius: 3.5, backgroundColor: isDark ? '#3A3025' : '#C8BFB0', opacity: 0.4 }} />
            </View>
          )}
        </Animated.View>
        {streak > 0 && (
          <View style={[ic.badge, { backgroundColor: active ? '#E8850A' : (isDark ? '#3A3530' : '#C0B8A8') }]}>
            <Text style={ic.badgeT}>{streak}</Text>
          </View>
        )}
      </TouchableOpacity>
      <StreakModal visible={show} onClose={() => setShow(false)} />
    </>
  );
}

const ic = StyleSheet.create({
  wrap: { width: 40, height: 40, borderRadius: 13, alignItems: 'center', justifyContent: 'center', borderWidth: 1 },
  badge: {
    position: 'absolute', top: -5, right: -5, minWidth: 18, height: 18, borderRadius: 9,
    alignItems: 'center', justifyContent: 'center', paddingHorizontal: 4,
    shadowColor: '#000', shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.15, shadowRadius: 3, elevation: 3,
  },
  badgeT: { fontSize: 9, fontWeight: '900', color: '#FFF', letterSpacing: -0.3 },
});