// components/ReviewPromptModal.tsx — the in-app "enjoying this?" ask.
//
// Fires after a story is read to the end (see StoryModal), gated by the
// cooldown/cap logic in utils/review.ts. Tapping Rate opens the store's review
// page; Later just closes and lets the cooldown run.
//
// No sentiment gate on purpose: we don't ask "do you like it?" and route only
// the happy answers to the store. Both Apple and Google treat that as a
// rejectable rating gate, and it's the pattern that gets apps pulled.
import { LinearGradient } from 'expo-linear-gradient';
import { Star } from 'lucide-react-native';
import React, { useEffect, useRef } from 'react';
import {
  Animated,
  Easing,
  Modal,
  Platform,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { useLanguage } from '../context/LanguageContext';
import { useTheme } from '../context/ThemeContext';
import { haptic } from '../utils/haptics';
import { noteReviewPromptShown, openReviewFlow } from '../utils/review';

const SERIF = Platform.OS === 'ios' ? 'Georgia' : 'serif';
const SANS = Platform.OS === 'ios' ? 'System' : 'sans-serif';

// Same gold ramp the quiz and coin modals use.
const GOLD_LIGHT = '#F7D774';
const GOLD = '#E8B84D';
const GOLD_DEEP = '#D4A017';
const INK = '#3A2A05';

// ── Translations ──────────────────────────────────────────────────────────────
const T: Record<string, Record<string, string>> = {
  en: {
    title: 'Enjoying Daily History?',
    body: 'You just finished another story. A quick rating helps other curious people find us.',
    rate: 'Rate us',
    later: 'Maybe later',
  },
  ro: {
    title: 'Îți place Daily History?',
    body: 'Tocmai ai terminat încă o poveste. O recenzie scurtă îi ajută pe alți curioși să ne găsească.',
    rate: 'Lasă o recenzie',
    later: 'Mai târziu',
  },
  fr: {
    title: 'Vous aimez Daily History ?',
    body: 'Vous venez de finir une histoire de plus. Une note rapide aide les curieux à nous trouver.',
    rate: 'Donner un avis',
    later: 'Plus tard',
  },
  de: {
    title: 'Gefällt dir Daily History?',
    body: 'Du hast gerade noch eine Geschichte beendet. Eine kurze Bewertung hilft anderen Neugierigen, uns zu finden.',
    rate: 'Bewerten',
    later: 'Später',
  },
  es: {
    title: '¿Te gusta Daily History?',
    body: 'Acabas de terminar otra historia. Una valoración rápida ayuda a otros curiosos a encontrarnos.',
    rate: 'Danos tu opinión',
    later: 'Más tarde',
  },
};

const tx = (lang: string, k: string) => (T[lang] ?? T.en)[k] ?? T.en[k] ?? k;

interface Props {
  visible: boolean;
  onClose: () => void;
}

export default function ReviewPromptModal({ visible, onClose }: Props) {
  const { theme: colors } = useTheme();
  const { language } = useLanguage();

  const fade = useRef(new Animated.Value(0)).current;
  const scale = useRef(new Animated.Value(0.9)).current;

  useEffect(() => {
    if (!visible) {
      fade.setValue(0);
      scale.setValue(0.9);
      return;
    }
    // Start the cooldown the moment it's actually on screen, not when the
    // caller decided to show it — a modal that never rendered shouldn't count.
    noteReviewPromptShown();
    Animated.parallel([
      Animated.timing(fade, { toValue: 1, duration: 220, useNativeDriver: true }),
      Animated.timing(scale, {
        toValue: 1,
        duration: 280,
        easing: Easing.out(Easing.back(1.4)),
        useNativeDriver: true,
      }),
    ]).start();
  }, [visible]);

  const handleRate = () => {
    haptic('medium');
    openReviewFlow().catch(() => {});
    onClose();
  };

  const handleLater = () => {
    haptic('light');
    onClose();
  };

  return (
    <Modal visible={visible} transparent animationType="none" onRequestClose={handleLater}>
      <Animated.View style={[styles.backdrop, { opacity: fade }]}>
        <Animated.View
          style={[
            styles.card,
            {
              backgroundColor: colors.card,
              borderColor: colors.border,
              transform: [{ scale }],
            },
          ]}
        >
          <LinearGradient
            colors={[GOLD_LIGHT, GOLD, GOLD_DEEP]}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
            style={styles.badge}
          >
            <Star size={30} color={INK} fill={INK} strokeWidth={1.5} />
          </LinearGradient>

          <Text style={[styles.title, { color: colors.text }]}>
            {tx(language, 'title')}
          </Text>
          <Text style={[styles.body, { color: colors.subtext }]}>
            {tx(language, 'body')}
          </Text>

          <TouchableOpacity activeOpacity={0.85} onPress={handleRate} style={styles.rateWrap}>
            <LinearGradient
              colors={[GOLD_LIGHT, GOLD, GOLD_DEEP]}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 1 }}
              style={styles.rateBtn}
            >
              <Text style={styles.rateText}>{tx(language, 'rate')}</Text>
            </LinearGradient>
          </TouchableOpacity>

          <TouchableOpacity activeOpacity={0.7} onPress={handleLater} style={styles.laterBtn}>
            <Text style={[styles.laterText, { color: colors.subtext }]}>
              {tx(language, 'later')}
            </Text>
          </TouchableOpacity>
        </Animated.View>
      </Animated.View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  backdrop: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.72)',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 28,
  },
  card: {
    width: '100%',
    maxWidth: 380,
    borderRadius: 24,
    borderWidth: 1,
    paddingHorizontal: 24,
    paddingTop: 28,
    paddingBottom: 18,
    alignItems: 'center',
  },
  badge: {
    width: 62,
    height: 62,
    borderRadius: 31,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 18,
  },
  title: {
    fontFamily: SERIF,
    fontSize: 22,
    textAlign: 'center',
    marginBottom: 10,
  },
  body: {
    fontFamily: SANS,
    fontSize: 14.5,
    lineHeight: 21,
    textAlign: 'center',
    marginBottom: 24,
  },
  rateWrap: { width: '100%' },
  rateBtn: {
    borderRadius: 14,
    paddingVertical: 15,
    alignItems: 'center',
  },
  rateText: {
    fontFamily: SANS,
    fontSize: 16,
    fontWeight: '700',
    color: INK,
  },
  laterBtn: {
    paddingVertical: 14,
    paddingHorizontal: 20,
    marginTop: 4,
  },
  laterText: {
    fontFamily: SANS,
    fontSize: 14.5,
    fontWeight: '500',
  },
});
