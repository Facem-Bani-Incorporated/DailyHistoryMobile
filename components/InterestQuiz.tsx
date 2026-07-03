// components/InterestQuiz.tsx
//
// One-time onboarding quiz: the user picks the history topics they care about.
// The picks are stored in usePreferencesStore and used by the home screen to
// rank each day's events so matching categories surface first.
//
// Self-contained i18n (en/ro/fr/de/es) + category metadata so it doesn't depend
// on the global translation table.
import { useEffect, useState } from 'react';
import {
  Modal,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { useLanguage } from '../context/LanguageContext';
import { useTheme } from '../context/ThemeContext';

// Category keys must match `event.category` (lowercased, spaces → underscore).
const CATEGORIES: { key: string; color: string; emoji: string }[] = [
  { key: 'war_conflict', color: '#E84545', emoji: '⚔️' },
  { key: 'tech_innovation', color: '#3E7BFA', emoji: '💡' },
  { key: 'science_discovery', color: '#A855F7', emoji: '🔬' },
  { key: 'politics_state', color: '#F59E0B', emoji: '🏛️' },
  { key: 'culture_arts', color: '#10B981', emoji: '🎭' },
  { key: 'natural_disaster', color: '#F97316', emoji: '🌋' },
  { key: 'exploration', color: '#06B6D4', emoji: '🧭' },
  { key: 'religion_phil', color: '#C2965A', emoji: '📜' },
];

type Lang = 'en' | 'ro' | 'fr' | 'de' | 'es';

const UI: Record<Lang, { title: string; subtitle: string; cta: string; skip: string }> = {
  en: {
    title: 'What are you into?',
    subtitle: "Pick the topics you love. We'll surface today's stories that match first.",
    cta: 'Show my history',
    skip: 'Skip',
  },
  ro: {
    title: 'Ce te pasionează?',
    subtitle: 'Alege subiectele care îți plac. Îți scoatem în față poveștile de azi care se potrivesc.',
    cta: 'Arată-mi istoria',
    skip: 'Sari peste',
  },
  fr: {
    title: 'Qu’est-ce qui vous passionne ?',
    subtitle: 'Choisissez les thèmes que vous aimez. Nous mettrons en avant les récits du jour qui correspondent.',
    cta: 'Voir mon histoire',
    skip: 'Passer',
  },
  de: {
    title: 'Wofür interessierst du dich?',
    subtitle: 'Wähle die Themen, die du magst. Wir heben passende Geschichten von heute zuerst hervor.',
    cta: 'Meine Geschichte zeigen',
    skip: 'Überspringen',
  },
  es: {
    title: '¿Qué te apasiona?',
    subtitle: 'Elige los temas que te gusten. Destacaremos primero las historias de hoy que coincidan.',
    cta: 'Ver mi historia',
    skip: 'Omitir',
  },
};

const LABELS: Record<Lang, Record<string, string>> = {
  en: {
    war_conflict: 'War & Conflict', tech_innovation: 'Technology', science_discovery: 'Science',
    politics_state: 'Politics', culture_arts: 'Arts & Culture', natural_disaster: 'Disasters',
    exploration: 'Exploration', religion_phil: 'Philosophy',
  },
  ro: {
    war_conflict: 'Război & Conflict', tech_innovation: 'Tehnologie', science_discovery: 'Știință',
    politics_state: 'Politică', culture_arts: 'Artă & Cultură', natural_disaster: 'Dezastre',
    exploration: 'Explorare', religion_phil: 'Filosofie',
  },
  fr: {
    war_conflict: 'Guerre & Conflit', tech_innovation: 'Technologie', science_discovery: 'Science',
    politics_state: 'Politique', culture_arts: 'Arts & Culture', natural_disaster: 'Catastrophes',
    exploration: 'Exploration', religion_phil: 'Philosophie',
  },
  de: {
    war_conflict: 'Krieg & Konflikt', tech_innovation: 'Technologie', science_discovery: 'Wissenschaft',
    politics_state: 'Politik', culture_arts: 'Kunst & Kultur', natural_disaster: 'Katastrophen',
    exploration: 'Erkundung', religion_phil: 'Philosophie',
  },
  es: {
    war_conflict: 'Guerra y Conflicto', tech_innovation: 'Tecnología', science_discovery: 'Ciencia',
    politics_state: 'Política', culture_arts: 'Arte y Cultura', natural_disaster: 'Desastres',
    exploration: 'Exploración', religion_phil: 'Filosofía',
  },
};

interface Props {
  visible: boolean;
  /** Pre-select these keys (used when re-taking the quiz). */
  initial?: string[];
  /** Called with the chosen category keys (may be empty if skipped). */
  onSubmit: (interests: string[]) => void;
}

export default function InterestQuiz({ visible, initial, onSubmit }: Props) {
  const { theme } = useTheme();
  const { language } = useLanguage();
  const lang: Lang = (['en', 'ro', 'fr', 'de', 'es'].includes(language) ? language : 'en') as Lang;
  const ui = UI[lang];
  const labels = LABELS[lang];

  const [selected, setSelected] = useState<string[]>(initial ?? []);

  // Reset selection each time the quiz is (re)opened.
  useEffect(() => {
    if (visible) setSelected(initial ?? []);
  }, [visible]);

  const accent = (theme as any).accent ?? (theme as any).gold ?? '#C9A227';
  const cardBg = theme.card ?? '#15131b';
  const chipBg = (theme as any).background ?? '#0e1117';

  const toggle = (key: string) =>
    setSelected((prev) => (prev.includes(key) ? prev.filter((k) => k !== key) : [...prev, key]));

  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={() => onSubmit(selected)}>
      <View style={styles.backdrop}>
        <View style={[styles.sheet, { backgroundColor: cardBg, borderColor: theme.border }]}>
          <View style={[styles.grip, { backgroundColor: theme.border }]} />

          <Text style={[styles.title, { color: theme.text }]}>{ui.title}</Text>
          <Text style={[styles.subtitle, { color: theme.subtext }]}>{ui.subtitle}</Text>

          <ScrollView
            style={{ maxHeight: 320 }}
            contentContainerStyle={styles.chips}
            showsVerticalScrollIndicator={false}
          >
            {CATEGORIES.map((c) => {
              const on = selected.includes(c.key);
              return (
                <Pressable
                  key={c.key}
                  onPress={() => toggle(c.key)}
                  style={[
                    styles.chip,
                    { backgroundColor: on ? c.color + '22' : chipBg, borderColor: on ? c.color : theme.border },
                  ]}
                >
                  <Text style={styles.chipEmoji}>{c.emoji}</Text>
                  <Text style={[styles.chipLabel, { color: on ? c.color : theme.text }]} numberOfLines={1}>
                    {labels[c.key] ?? c.key}
                  </Text>
                </Pressable>
              );
            })}
          </ScrollView>

          <Pressable
            onPress={() => onSubmit(selected)}
            style={[styles.cta, { backgroundColor: accent, opacity: selected.length === 0 ? 0.5 : 1 }]}
            disabled={selected.length === 0}
          >
            <Text style={styles.ctaText}>{ui.cta}</Text>
          </Pressable>

          <Pressable onPress={() => onSubmit([])} style={styles.skip} hitSlop={8}>
            <Text style={[styles.skipText, { color: theme.subtext }]}>{ui.skip}</Text>
          </Pressable>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  backdrop: { flex: 1, backgroundColor: 'rgba(0,0,0,0.55)', justifyContent: 'flex-end' },
  sheet: {
    borderTopLeftRadius: 24, borderTopRightRadius: 24, borderWidth: StyleSheet.hairlineWidth,
    paddingHorizontal: 22, paddingTop: 12, paddingBottom: 34,
  },
  grip: { width: 40, height: 4, borderRadius: 2, alignSelf: 'center', marginBottom: 16, opacity: 0.6 },
  title: { fontSize: 24, fontWeight: '800', textAlign: 'center' },
  subtitle: { fontSize: 14, lineHeight: 20, textAlign: 'center', marginTop: 8, marginBottom: 18 },
  chips: { flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'center', gap: 10, paddingBottom: 4 },
  chip: {
    flexDirection: 'row', alignItems: 'center', gap: 8,
    paddingVertical: 11, paddingHorizontal: 14, borderRadius: 14, borderWidth: 1.5,
  },
  chipEmoji: { fontSize: 16 },
  chipLabel: { fontSize: 14, fontWeight: '700' },
  cta: { marginTop: 20, borderRadius: 16, paddingVertical: 16, alignItems: 'center' },
  ctaText: { color: '#1a1200', fontSize: 16, fontWeight: '800' },
  skip: { marginTop: 12, alignItems: 'center' },
  skipText: { fontSize: 14, fontWeight: '600' },
});
