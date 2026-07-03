// components/InterestQuiz.tsx
//
// Home-screen fallback interest quiz for existing users (new accounts pick
// their interests during onboarding instead). Bottom-sheet modal; picks are
// stored in usePreferencesStore and used by the home screen to rank each day's
// events so matching categories surface first.
import { useEffect, useState } from 'react';
import { Modal, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import {
  INTEREST_CATEGORIES,
  INTEREST_LABELS,
  INTEREST_UI,
  normalizeInterestLang,
} from '../config/interests';
import { useLanguage } from '../context/LanguageContext';
import { useTheme } from '../context/ThemeContext';

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
  const lang = normalizeInterestLang(language);
  const ui = INTEREST_UI[lang];
  const labels = INTEREST_LABELS[lang];

  const [selected, setSelected] = useState<string[]>(initial ?? []);
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

          <ScrollView style={{ maxHeight: 340 }} contentContainerStyle={styles.chips} showsVerticalScrollIndicator={false}>
            {INTEREST_CATEGORIES.map(({ key, color, Icon }) => {
              const on = selected.includes(key);
              return (
                <Pressable
                  key={key}
                  onPress={() => toggle(key)}
                  style={[
                    styles.chip,
                    { backgroundColor: on ? color + '22' : chipBg, borderColor: on ? color : theme.border },
                  ]}
                >
                  <Icon color={on ? color : theme.subtext} size={17} strokeWidth={2.2} />
                  <Text style={[styles.chipLabel, { color: on ? color : theme.text }]} numberOfLines={1}>
                    {labels[key] ?? key}
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
  chipLabel: { fontSize: 14, fontWeight: '700' },
  cta: { marginTop: 20, borderRadius: 16, paddingVertical: 16, alignItems: 'center' },
  ctaText: { color: '#1a1200', fontSize: 16, fontWeight: '800' },
  skip: { marginTop: 12, alignItems: 'center' },
  skipText: { fontSize: 14, fontWeight: '600' },
});
