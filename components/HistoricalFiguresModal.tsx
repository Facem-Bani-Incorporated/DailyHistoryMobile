// components/HistoricalFiguresModal.tsx
import { LinearGradient } from 'expo-linear-gradient';
import {
  ArrowLeft,
  Calendar,
  Crown,
  FlaskConical,
  Globe2,
  Scroll,
  Shield,
  Star,
  Sword,
  Users,
  X,
  Zap,
} from 'lucide-react-native';
import React, { useCallback, useMemo, useRef, useState } from 'react';
import {
  Animated,
  Dimensions,
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
import { HISTORICAL_FIGURES, HistoricalFigure } from '../data/historicalFigures';

const { width: W, height: H } = Dimensions.get('window');
const SERIF = Platform.OS === 'ios' ? 'Georgia' : 'serif';

// ── i18n ──────────────────────────────────────────────────────────────────────
type TKey =
  | 'title' | 'close' | 'life_events' | 'world_events' | 'no_world_events'
  | 'born' | 'died' | 'age' | 'years_ago' | 'legacy' | 'followers'
  | 'explorer' | 'philosopher' | 'scientist' | 'ruler' | 'conqueror'
  | 'artist' | 'religious' | 'revolutionary' | 'bc' | 'ad';

const T: Record<string, Record<TKey, string>> = {
  en: {
    title: 'Historical Figures',
    close: 'Close',
    life_events: 'Their Life',
    world_events: 'World Events',
    no_world_events: 'No recorded world events during this period.',
    born: 'Born',
    died: 'Died',
    age: 'Age',
    years_ago: 'years ago',
    legacy: 'Legacy',
    followers: 'followers',
    explorer: 'Explorer',
    philosopher: 'Philosopher',
    scientist: 'Scientist',
    ruler: 'Ruler',
    conqueror: 'Conqueror',
    artist: 'Artist',
    religious: 'Religious Leader',
    revolutionary: 'Revolutionary',
    bc: 'BC',
    ad: 'AD',
  },
  ro: {
    title: 'Figuri Istorice',
    close: 'Închide',
    life_events: 'Viața Lor',
    world_events: 'Evenimente Mondiale',
    no_world_events: 'Niciun eveniment înregistrat în această perioadă.',
    born: 'Născut',
    died: 'Decedat',
    age: 'Vârstă',
    years_ago: 'ani în urmă',
    legacy: 'Moștenire',
    followers: 'urmași',
    explorer: 'Explorator',
    philosopher: 'Filosof',
    scientist: 'Savant',
    ruler: 'Conducător',
    conqueror: 'Cuceritor',
    artist: 'Artist',
    religious: 'Lider Religios',
    revolutionary: 'Revoluționar',
    bc: 'î.Hr.',
    ad: 'd.Hr.',
  },
  fr: {
    title: 'Figures Historiques',
    close: 'Fermer',
    life_events: 'Leur Vie',
    world_events: 'Événements Mondiaux',
    no_world_events: 'Aucun événement enregistré durant cette période.',
    born: 'Né(e)',
    died: 'Décédé(e)',
    age: 'Âge',
    years_ago: 'ans passés',
    legacy: 'Héritage',
    followers: 'adeptes',
    explorer: 'Explorateur',
    philosopher: 'Philosophe',
    scientist: 'Scientifique',
    ruler: 'Souverain',
    conqueror: 'Conquérant',
    artist: 'Artiste',
    religious: 'Chef Religieux',
    revolutionary: 'Révolutionnaire',
    bc: 'av. J.-C.',
    ad: 'apr. J.-C.',
  },
  de: {
    title: 'Historische Persönlichkeiten',
    close: 'Schließen',
    life_events: 'Ihr Leben',
    world_events: 'Weltereignisse',
    no_world_events: 'Keine aufgezeichneten Ereignisse in dieser Periode.',
    born: 'Geboren',
    died: 'Gestorben',
    age: 'Alter',
    years_ago: 'Jahre vergangen',
    legacy: 'Vermächtnis',
    followers: 'Anhänger',
    explorer: 'Entdecker',
    philosopher: 'Philosoph',
    scientist: 'Wissenschaftler',
    ruler: 'Herrscher',
    conqueror: 'Eroberer',
    artist: 'Künstler',
    religious: 'Religiöser Führer',
    revolutionary: 'Revolutionär',
    bc: 'v. Chr.',
    ad: 'n. Chr.',
  },
  es: {
    title: 'Figuras Históricas',
    close: 'Cerrar',
    life_events: 'Su Vida',
    world_events: 'Eventos Mundiales',
    no_world_events: 'No hay eventos registrados durante este período.',
    born: 'Nacido',
    died: 'Fallecido',
    age: 'Edad',
    years_ago: 'años atrás',
    legacy: 'Legado',
    followers: 'seguidores',
    explorer: 'Explorador',
    philosopher: 'Filósofo',
    scientist: 'Científico',
    ruler: 'Gobernante',
    conqueror: 'Conquistador',
    artist: 'Artista',
    religious: 'Líder Religioso',
    revolutionary: 'Revolucionario',
    bc: 'a.C.',
    ad: 'd.C.',
  },
};

const tx = (lang: string, k: TKey) => (T[lang] ?? T.en)[k] ?? T.en[k];

const formatYear = (y: number, lang: string): string => {
  if (y < 0) return `${Math.abs(y)} ${tx(lang, 'bc')}`;
  return `${y} ${tx(lang, 'ad')}`;
};

const extractYear = (ev: any): number => {
  const r = String(ev?.eventDate ?? ev?.event_date ?? ev?.year ?? '').trim();
  if (/^-?\d{1,4}$/.test(r)) return parseInt(r);
  if (r.includes('-') && r.split('-')[0].length === 4) return parseInt(r.split('-')[0]);
  const m = r.match(/-?\d{1,4}/);
  return m ? parseInt(m[0]) : 0;
};

const CATEGORY_ICONS: Record<string, React.ComponentType<any>> = {
  ruler: Crown,
  philosopher: Scroll,
  scientist: FlaskConical,
  explorer: Globe2,
  conqueror: Sword,
  artist: Star,
  religious: Zap,
  revolutionary: Shield,
};

// ── Figure Card (list view) ────────────────────────────────────────────────────
const FigureCard = React.memo(({
  figure, theme, isDark, language, onPress,
}: {
  figure: HistoricalFigure;
  theme: any;
  isDark: boolean;
  language: string;
  onPress: () => void;
}) => {
  const Icon = CATEGORY_ICONS[figure.category] ?? Star;
  const cardBg = isDark ? '#1A1714' : '#FFFFFF';
  const borderCol = isDark ? '#2A2520' : '#EBEBEB';
  const catLabel = tx(language, figure.category as TKey);
  const born = formatYear(figure.born, language);
  const died = formatYear(figure.died, language);

  return (
    <TouchableOpacity
      onPress={onPress}
      activeOpacity={0.78}
      style={[fc.card, { backgroundColor: cardBg, borderColor: borderCol }]}
    >
      <LinearGradient
        colors={[figure.color + '14', 'transparent']}
        style={StyleSheet.absoluteFill}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
      />
      <View style={[fc.iconBox, { backgroundColor: figure.color + '20', borderColor: figure.color + '35' }]}>
        <Text style={fc.emoji}>{figure.emoji}</Text>
      </View>
      <View style={fc.info}>
        <View style={fc.nameRow}>
          <Text style={[fc.name, { color: theme.text }]} numberOfLines={1}>{figure.name}</Text>
          <View style={[fc.catBadge, { backgroundColor: figure.color + '15' }]}>
            <Icon size={10} color={figure.color} strokeWidth={2} />
            <Text style={[fc.catText, { color: figure.color }]}>{catLabel}</Text>
          </View>
        </View>
        <Text style={[fc.title, { color: theme.subtext }]} numberOfLines={1}>{figure.title}</Text>
        <Text style={[fc.years, { color: figure.color }]}>{born} — {died}</Text>
      </View>
    </TouchableOpacity>
  );
});

const fc = StyleSheet.create({
  card: {
    flexDirection: 'row', alignItems: 'center', gap: 12,
    borderRadius: 16, borderWidth: 1, padding: 14, marginBottom: 10,
    overflow: 'hidden',
    shadowColor: '#000', shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.06, shadowRadius: 8, elevation: 3,
  },
  iconBox: {
    width: 56, height: 56, borderRadius: 16, borderWidth: 1,
    alignItems: 'center', justifyContent: 'center', flexShrink: 0,
  },
  emoji: { fontSize: 26 },
  info: { flex: 1, gap: 3 },
  nameRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  name: { fontSize: 15, fontWeight: '800', fontFamily: SERIF, flex: 1 },
  catBadge: {
    flexDirection: 'row', alignItems: 'center', gap: 4,
    paddingHorizontal: 7, paddingVertical: 3, borderRadius: 8,
  },
  catText: { fontSize: 10, fontWeight: '700' },
  title: { fontSize: 11.5, fontWeight: '500', opacity: 0.8 },
  years: { fontSize: 12, fontWeight: '700', fontFamily: SERIF },
});

// ── Life Event Row ─────────────────────────────────────────────────────────────
const EVENT_TYPE_COLORS: Record<string, string> = {
  birth: '#10B981',
  death: '#6B7280',
  achievement: '#F59E0B',
  war: '#DC2626',
  political: '#3B82F6',
  discovery: '#8B5CF6',
  personal: '#EC4899',
};

const LifeEventRow = ({ event, isLast, color, isDark, theme }: {
  event: any;
  isLast: boolean;
  color: string;
  isDark: boolean;
  theme: any;
}) => {
  const dotColor = EVENT_TYPE_COLORS[event.type] ?? color;
  return (
    <View style={le.row}>
      <View style={le.spineCol}>
        <View style={[le.dot, { backgroundColor: dotColor, borderColor: isDark ? '#1A1714' : '#FFF' }]} />
        {!isLast && <View style={[le.line, { backgroundColor: isDark ? '#2A2520' : '#E5E5E5' }]} />}
      </View>
      <View style={[le.content, { marginBottom: isLast ? 0 : 20 }]}>
        <Text style={[le.yearLabel, { color: dotColor }]}>{event.yearLabel}</Text>
        <Text style={[le.eventTitle, { color: theme.text }]}>{event.title}</Text>
        <Text style={[le.eventDesc, { color: theme.subtext }]}>{event.description}</Text>
      </View>
    </View>
  );
};

const le = StyleSheet.create({
  row: { flexDirection: 'row', gap: 14 },
  spineCol: { alignItems: 'center', width: 16 },
  dot: { width: 14, height: 14, borderRadius: 7, borderWidth: 2, zIndex: 1 },
  line: { width: 1.5, flex: 1, marginTop: 4 },
  content: { flex: 1 },
  yearLabel: { fontSize: 11, fontWeight: '800', letterSpacing: 0.5, marginBottom: 2, fontFamily: SERIF },
  eventTitle: { fontSize: 14, fontWeight: '700', marginBottom: 6 },
  eventDesc: { fontSize: 13, lineHeight: 19, opacity: 0.8 },
});

// ── World Event Row (from allEvents) ──────────────────────────────────────────
const WorldEventRow = ({ event, isDark, theme, language }: {
  event: any;
  isDark: boolean;
  theme: any;
  language: string;
}) => {
  const year = extractYear(event);
  const yearLabel = year < 0 ? `${Math.abs(year)} BC` : `${year} AD`;
  const title = event.titleTranslations?.[language] ?? event.titleTranslations?.en ?? '';
  const cat = (event.category ?? '').toLowerCase();
  const CAT_COLORS: Record<string, string> = {
    war_conflict: '#DC2626', tech_innovation: '#2563EB',
    science_discovery: '#7C3AED', politics_state: '#D97706',
    culture_arts: '#059669', natural_disaster: '#EA580C',
    exploration: '#0891B2', religion_phil: '#92400E',
  };
  const color = CAT_COLORS[cat] ?? '#6B7280';

  return (
    <View style={[we.row, { borderLeftColor: color + '60', backgroundColor: isDark ? '#1A1714' : '#FAFAF8' }]}>
      <Text style={[we.year, { color }]}>{yearLabel}</Text>
      <Text style={[we.title, { color: theme.text }]} numberOfLines={2}>{title}</Text>
    </View>
  );
};

const we = StyleSheet.create({
  row: {
    borderLeftWidth: 3, borderRadius: 10, paddingHorizontal: 12, paddingVertical: 10,
    marginBottom: 8,
  },
  year: { fontSize: 11, fontWeight: '800', marginBottom: 2, fontFamily: SERIF },
  title: { fontSize: 13, fontWeight: '600', lineHeight: 18 },
});

// ── Detail View ────────────────────────────────────────────────────────────────
const FigureDetail = ({
  figure, allEvents, theme, isDark, language, gold, onBack,
}: {
  figure: HistoricalFigure;
  allEvents: any[];
  theme: any;
  isDark: boolean;
  language: string;
  gold: string;
  onBack: () => void;
}) => {
  const insets = useSafeAreaInsets();
  const [activeTab, setActiveTab] = useState<'life' | 'world'>('life');
  const Icon = CATEGORY_ICONS[figure.category] ?? Star;
  const cardBg = isDark ? '#1A1714' : '#FFFFFF';
  const borderCol = isDark ? '#2A2520' : '#EBEBEB';

  const worldEvents = useMemo(() => {
    return allEvents
      .filter(ev => {
        const y = extractYear(ev);
        return y >= figure.born && y <= figure.died;
      })
      .sort((a, b) => extractYear(a) - extractYear(b));
  }, [allEvents, figure.born, figure.died]);

  const born = formatYear(figure.born, language);
  const died = formatYear(figure.died, language);
  const lifespan = Math.abs(figure.died - figure.born);

  return (
    <View style={{ flex: 1 }}>
      {/* Header */}
      <View style={[det.header, { borderBottomColor: borderCol, paddingTop: insets.top + 12 }]}>
        <TouchableOpacity onPress={onBack} style={[det.backBtn, { backgroundColor: isDark ? '#2A2520' : '#F5F5F0' }]}>
          <ArrowLeft size={18} color={theme.text} strokeWidth={2} />
        </TouchableOpacity>
        <View style={det.headerTitle}>
          <Text style={[det.headerName, { color: theme.text }]} numberOfLines={1}>{figure.name}</Text>
          <Text style={[det.headerSub, { color: theme.subtext }]} numberOfLines={1}>{figure.title}</Text>
        </View>
        <View style={[det.catIcon, { backgroundColor: figure.color + '20' }]}>
          <Icon size={16} color={figure.color} strokeWidth={2} />
        </View>
      </View>

      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingBottom: insets.bottom + 24 }}>
        {/* Hero section */}
        <View style={[det.hero, { backgroundColor: isDark ? '#0F0D0B' : '#FAFAF8' }]}>
          <LinearGradient
            colors={[figure.color + '22', 'transparent']}
            style={StyleSheet.absoluteFill}
          />
          <Text style={det.heroEmoji}>{figure.emoji}</Text>
          <View style={det.heroMeta}>
            <View style={[det.metaPill, { backgroundColor: isDark ? '#2A2520' : '#FFFFFF', borderColor: borderCol }]}>
              <Calendar size={12} color={figure.color} strokeWidth={2} />
              <Text style={[det.metaText, { color: theme.text }]}>{born}</Text>
            </View>
            <View style={[det.metaSep, { backgroundColor: figure.color }]} />
            <View style={[det.metaPill, { backgroundColor: isDark ? '#2A2520' : '#FFFFFF', borderColor: borderCol }]}>
              <Calendar size={12} color={theme.subtext} strokeWidth={2} />
              <Text style={[det.metaText, { color: theme.subtext }]}>{died}</Text>
            </View>
          </View>
          <View style={[det.lifespanBar, { backgroundColor: isDark ? '#2A2520' : '#EBEBEB' }]}>
            <View style={[det.lifespanFill, { backgroundColor: figure.color, width: `${Math.min(100, lifespan * 1.2)}%` as any }]} />
          </View>
          <Text style={[det.lifespanText, { color: theme.subtext }]}>
            {lifespan} {tx(language, 'years_ago').replace('years ago', 'years lived')}
          </Text>
        </View>

        {/* Bio */}
        <View style={{ paddingHorizontal: 16, paddingTop: 16, gap: 12 }}>
          <Text style={[det.bioText, { color: theme.text }]}>{figure.bio}</Text>

          {/* Legacy card */}
          <View style={[det.legacyCard, { backgroundColor: figure.color + '10', borderColor: figure.color + '25' }]}>
            <View style={det.legacyHeader}>
              <Zap size={14} color={figure.color} strokeWidth={2} fill={figure.color} />
              <Text style={[det.legacyTitle, { color: figure.color }]}>{tx(language, 'legacy')}</Text>
            </View>
            <Text style={[det.legacyText, { color: theme.text }]}>{figure.legacy}</Text>
          </View>

          {/* Tabs */}
          <View style={[det.tabs, { backgroundColor: isDark ? '#1A1714' : '#F5F5F0', borderColor: borderCol }]}>
            {(['life', 'world'] as const).map(tab => (
              <TouchableOpacity
                key={tab}
                onPress={() => { haptic('selection'); setActiveTab(tab); }}
                style={[det.tab, activeTab === tab && { backgroundColor: figure.color }]}
                activeOpacity={0.75}
              >
                <Text style={[det.tabText, { color: activeTab === tab ? '#FFF' : theme.subtext }]}>
                  {tab === 'life' ? tx(language, 'life_events') : `${tx(language, 'world_events')} (${worldEvents.length})`}
                </Text>
              </TouchableOpacity>
            ))}
          </View>

          {/* Tab content */}
          {activeTab === 'life' ? (
            <View style={det.tabContent}>
              {figure.lifeEvents.map((ev, i) => (
                <LifeEventRow
                  key={i}
                  event={ev}
                  isLast={i === figure.lifeEvents.length - 1}
                  color={figure.color}
                  isDark={isDark}
                  theme={theme}
                />
              ))}
            </View>
          ) : (
            <View style={det.tabContent}>
              {worldEvents.length === 0 ? (
                <Text style={[det.emptyText, { color: theme.subtext }]}>{tx(language, 'no_world_events')}</Text>
              ) : (
                worldEvents.map((ev, i) => (
                  <WorldEventRow key={i} event={ev} isDark={isDark} theme={theme} language={language} />
                ))
              )}
            </View>
          )}
        </View>
      </ScrollView>
    </View>
  );
};

const det = StyleSheet.create({
  header: {
    flexDirection: 'row', alignItems: 'center', gap: 12,
    paddingHorizontal: 16, paddingBottom: 12, borderBottomWidth: StyleSheet.hairlineWidth,
  },
  backBtn: { width: 38, height: 38, borderRadius: 12, alignItems: 'center', justifyContent: 'center' },
  headerTitle: { flex: 1 },
  headerName: { fontSize: 16, fontWeight: '800', fontFamily: SERIF },
  headerSub: { fontSize: 11, fontWeight: '500', opacity: 0.7 },
  catIcon: { width: 34, height: 34, borderRadius: 10, alignItems: 'center', justifyContent: 'center' },
  hero: { alignItems: 'center', paddingVertical: 28, paddingHorizontal: 20, overflow: 'hidden' },
  heroEmoji: { fontSize: 64, marginBottom: 16 },
  heroMeta: { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 16 },
  metaPill: {
    flexDirection: 'row', alignItems: 'center', gap: 5,
    paddingHorizontal: 10, paddingVertical: 6, borderRadius: 10, borderWidth: 1,
  },
  metaText: { fontSize: 12, fontWeight: '700', fontFamily: SERIF },
  metaSep: { width: 24, height: 2, borderRadius: 1 },
  lifespanBar: { width: '80%', height: 4, borderRadius: 2, overflow: 'hidden', marginBottom: 6 },
  lifespanFill: { height: '100%', borderRadius: 2 },
  lifespanText: { fontSize: 11, fontWeight: '500', opacity: 0.7 },
  bioText: { fontSize: 14, lineHeight: 22, fontWeight: '400' },
  legacyCard: { borderWidth: 1, borderRadius: 14, padding: 14, gap: 6 },
  legacyHeader: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  legacyTitle: { fontSize: 12, fontWeight: '800', letterSpacing: 0.5 },
  legacyText: { fontSize: 13, lineHeight: 19, fontWeight: '400' },
  tabs: {
    flexDirection: 'row', borderRadius: 12, padding: 3, borderWidth: StyleSheet.hairlineWidth,
  },
  tab: { flex: 1, paddingVertical: 8, borderRadius: 10, alignItems: 'center' },
  tabText: { fontSize: 12, fontWeight: '700' },
  tabContent: { paddingTop: 4 },
  emptyText: { fontSize: 13, textAlign: 'center', padding: 20, opacity: 0.6 },
});

// ══════════════════════════════════════════════════════════════════════════════
// Main Modal
// ══════════════════════════════════════════════════════════════════════════════
interface Props {
  visible: boolean;
  onClose: () => void;
  allEvents: any[];
}

export default function HistoricalFiguresModal({ visible, onClose, allEvents }: Props) {
  const { theme, isDark } = useTheme();
  const { language } = useLanguage();
  const insets = useSafeAreaInsets();

  const slideAnim = useRef(new Animated.Value(H)).current;
  const fadeAnim = useRef(new Animated.Value(0)).current;

  const [selectedFigure, setSelectedFigure] = useState<HistoricalFigure | null>(null);
  const [hasOpened, setHasOpened] = useState(false);

  React.useEffect(() => {
    if (visible) {
      setHasOpened(true);
      setSelectedFigure(null);
      Animated.parallel([
        Animated.spring(slideAnim, { toValue: 0, tension: 280, friction: 26, useNativeDriver: true }),
        Animated.timing(fadeAnim, { toValue: 1, duration: 200, useNativeDriver: true }),
      ]).start();
    } else {
      Animated.parallel([
        Animated.timing(slideAnim, { toValue: H, duration: 280, useNativeDriver: true }),
        Animated.timing(fadeAnim, { toValue: 0, duration: 200, useNativeDriver: true }),
      ]).start();
    }
  }, [visible]);

  const handleClose = useCallback(() => {
    haptic('light');
    onClose();
  }, [onClose]);

  const handleSelectFigure = useCallback((fig: HistoricalFigure) => {
    haptic('medium');
    setSelectedFigure(fig);
  }, []);

  const handleBack = useCallback(() => {
    haptic('light');
    setSelectedFigure(null);
  }, []);

  const gold = isDark ? '#F59E0B' : '#2563EB';
  const cardBg = isDark ? '#0F0D0B' : '#FAFAF8';
  const borderCol = isDark ? '#2A2520' : '#E5E5E5';

  if (!hasOpened) return null;

  return (
    <Modal visible={visible} transparent animationType="none" onRequestClose={handleClose}>
      <Animated.View style={[m.backdrop, { opacity: fadeAnim }]} />
      <Animated.View
        style={[
          m.sheet,
          {
            backgroundColor: cardBg,
            transform: [{ translateY: slideAnim }],
            paddingBottom: insets.bottom,
          },
        ]}
      >
        {selectedFigure ? (
          <FigureDetail
            figure={selectedFigure}
            allEvents={allEvents}
            theme={theme}
            isDark={isDark}
            language={language}
            gold={gold}
            onBack={handleBack}
          />
        ) : (
          <>
            {/* Header */}
            <View style={[m.header, { paddingTop: insets.top + 16, borderBottomColor: borderCol }]}>
              <View style={m.headerLeft}>
                <View style={[m.headerIcon, { backgroundColor: gold + '20' }]}>
                  <Users size={18} color={gold} strokeWidth={2} />
                </View>
                <View>
                  <Text style={[m.headerTitle, { color: theme.text }]}>{tx(language, 'title')}</Text>
                  <Text style={[m.headerSub, { color: theme.subtext }]}>
                    {HISTORICAL_FIGURES.length} figures
                  </Text>
                </View>
              </View>
              <TouchableOpacity
                onPress={handleClose}
                style={[m.closeBtn, { backgroundColor: isDark ? '#2A2520' : '#F0EEE8' }]}
              >
                <X size={18} color={theme.subtext} strokeWidth={2} />
              </TouchableOpacity>
            </View>

            {/* List */}
            <ScrollView
              showsVerticalScrollIndicator={false}
              contentContainerStyle={{ padding: 16, paddingBottom: 32 }}
            >
              {HISTORICAL_FIGURES.map(fig => (
                <FigureCard
                  key={fig.id}
                  figure={fig}
                  theme={theme}
                  isDark={isDark}
                  language={language}
                  onPress={() => handleSelectFigure(fig)}
                />
              ))}
            </ScrollView>
          </>
        )}
      </Animated.View>
    </Modal>
  );
}

const m = StyleSheet.create({
  backdrop: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(0,0,0,0.5)',
  },
  sheet: {
    position: 'absolute',
    left: 0,
    right: 0,
    top: 0,
    bottom: 0,
  },
  header: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    paddingHorizontal: 16, paddingBottom: 14, borderBottomWidth: StyleSheet.hairlineWidth,
  },
  headerLeft: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  headerIcon: { width: 38, height: 38, borderRadius: 12, alignItems: 'center', justifyContent: 'center' },
  headerTitle: { fontSize: 18, fontWeight: '900', fontFamily: SERIF },
  headerSub: { fontSize: 12, fontWeight: '500', opacity: 0.6 },
  closeBtn: { width: 36, height: 36, borderRadius: 10, alignItems: 'center', justifyContent: 'center' },
});
