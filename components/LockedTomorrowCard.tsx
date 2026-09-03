// components/LockedTomorrowCard.tsx
import { Ionicons } from '@expo/vector-icons';
import React, { useEffect, useRef } from 'react';
import {
  Animated,
  Platform,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { COIN_GOLD, COIN_GOLD_DEEP } from '../config/coins';
import { useLanguage } from '../context/LanguageContext';
import { useTheme } from '../context/ThemeContext';

const T: Record<string, Record<string, string>> = {
  en: {
    locked: "Tomorrow's Story",
    lockedSub: 'Watch a short clip to unlock',
    unlocking: 'Loading ad...',
    discover: "Tomorrow's Events",
    discoverSub: 'Watch a short clip to explore',
    cta: 'Watch & Unlock',
    ctaDisabled: 'Loading...',
    tomorrow: 'TOMORROW',
    inTwoDays: 'IN 2 DAYS',
    preview: 'A new story awaits',
    or: 'OR',
    getPro: 'Get PRO — Unlimited Access',
    duration: '~15-30s',
    coinSub: 'Spend a coin to unlock — or go PRO',
    coinCta: 'Unlock',
  },
  ro: {
    locked: 'Povestea de Mâine',
    lockedSub: 'Vizionează un clip scurt pentru a debloca',
    unlocking: 'Se încarcă...',
    discover: 'Evenimentele de Mâine',
    discoverSub: 'Vizionează un clip scurt pentru a explora',
    cta: 'Vizionează & Deblochează',
    ctaDisabled: 'Se încarcă...',
    tomorrow: 'MÂINE',
    inTwoDays: 'POIMÂINE',
    preview: 'O nouă poveste te așteaptă',
    or: 'SAU',
    getPro: 'Obține PRO — Acces Nelimitat',
    duration: '~15-30s',
    coinSub: 'Folosește o monedă ca să deblochezi — sau ia PRO',
    coinCta: 'Deblochează',
  },
  fr: {
    locked: "L'Histoire de Demain",
    lockedSub: 'Regardez une courte pub pour débloquer',
    unlocking: 'Chargement...',
    discover: 'Les Événements de Demain',
    discoverSub: 'Regardez une courte pub pour explorer',
    cta: 'Regarder & Débloquer',
    ctaDisabled: 'Chargement...',
    tomorrow: 'DEMAIN',
    inTwoDays: 'DANS 2 JOURS',
    preview: 'Une nouvelle histoire vous attend',
    or: 'OU',
    getPro: 'Obtenir PRO — Accès illimité',
    duration: '~15-30s',
    coinSub: 'Dépense une pièce pour débloquer — ou passe PRO',
    coinCta: 'Débloquer',
  },
  de: {
    locked: 'Die Geschichte von Morgen',
    lockedSub: 'Sieh dir eine kurze Werbung an',
    unlocking: 'Laden...',
    discover: 'Die Ereignisse von Morgen',
    discoverSub: 'Sieh dir eine kurze Werbung an',
    cta: 'Ansehen & Freischalten',
    ctaDisabled: 'Laden...',
    tomorrow: 'MORGEN',
    inTwoDays: 'IN 2 TAGEN',
    preview: 'Eine neue Geschichte wartet',
    or: 'ODER',
    getPro: 'PRO holen — Unbegrenzter Zugang',
    duration: '~15-30s',
    coinSub: 'Mit einer Münze freischalten — oder PRO holen',
    coinCta: 'Freischalten',
  },
  es: {
    locked: 'La Historia de Mañana',
    lockedSub: 'Mira un anuncio corto para desbloquear',
    unlocking: 'Cargando...',
    discover: 'Los Eventos de Mañana',
    discoverSub: 'Mira un anuncio corto para explorar',
    cta: 'Ver & Desbloquear',
    ctaDisabled: 'Cargando...',
    tomorrow: 'MAÑANA',
    inTwoDays: 'EN 2 DÍAS',
    preview: 'Una nueva historia te espera',
    or: 'O',
    getPro: 'Obtener PRO — Acceso ilimitado',
    duration: '~15-30s',
    coinSub: 'Usa una moneda para desbloquear — u obtén PRO',
    coinCta: 'Desbloquear',
  },
};
const tx = (lang: string, k: string) => (T[lang] ?? T.en)[k] ?? T.en[k] ?? k;

// First ~40% of words visible, rest replaced with block chars
function peekTitle(title: string): { visible: string; hidden: string } {
  const words = title.trim().split(/\s+/);
  const cutoff = Math.max(1, Math.ceil(words.length * 0.4));
  const visible = words.slice(0, cutoff).join(' ');
  const hidden = words.length > cutoff
    ? ' ' + words.slice(cutoff).map(w => '█'.repeat(w.length)).join(' ')
    : '';
  return { visible, hidden };
}

interface LockedTomorrowCardProps {
  variant: 'main' | 'discover';
  onUnlock: () => void;
  isReady: boolean;
  dayOffset?: number;
  hintEvent?: any;
  bottomPad?: number;
  onPaywall?: () => void;
}

export default function LockedTomorrowCard({
  variant,
  onUnlock,
  isReady,
  dayOffset = 1,
  hintEvent,
  bottomPad = 0,
  onPaywall,
}: LockedTomorrowCardProps) {
  const { theme, isDark } = useTheme();
  const { language } = useLanguage();

  // One fade on mount and nothing else. What was here — a pulsing gold button, a
  // bouncing padlock and two shimmering divider rules — was three separate loops
  // running under a card whose whole job is to be read once and acted on.
  const fadeIn = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    Animated.timing(fadeIn, { toValue: 1, duration: 420, useNativeDriver: true }).start();
  }, [fadeIn]);

  const gold = isDark ? COIN_GOLD : COIN_GOLD_DEEP;
  const isMain = variant === 'main';

  // Back to clip-only. One clip opens both future days on both surfaces for 24h —
  // the coin path went with the economy that made ads a substitute for the subscription.
  const dayLabel = dayOffset === 1 ? tx(language, 'tomorrow') : tx(language, 'inTwoDays');
  const subtitle = tx(language, isMain ? 'lockedSub' : 'discoverSub');
  const ctaText = isReady ? tx(language, 'cta') : tx(language, 'ctaDisabled');

  // Event teaser data
  const eventTitle: string =
    hintEvent?.titleTranslations?.[language] ??
    hintEvent?.titleTranslations?.en ??
    '';
  const eventCategory: string = (hintEvent?.category ?? '').replace(/_/g, ' ');
  const rawDate: string = hintEvent?.eventDate ?? hintEvent?.event_date ?? '';
  const eventYear: string = rawDate ? String(rawDate).slice(0, 4) : '';
  const hasHint = !!eventTitle;
  const { visible: titleVisible, hidden: titleHidden } = hasHint
    ? peekTitle(eventTitle)
    : { visible: '', hidden: '' };

  return (
    <Animated.View style={[styles.card, { opacity: fadeIn }]}>
      <View style={[styles.inner, { backgroundColor: theme.card, paddingBottom: 20 + bottomPad }]}>
        <Text style={[styles.day, { color: theme.subtext }]}>{dayLabel.toUpperCase()}</Text>

        {hasHint ? (
          <View style={styles.teaser}>
            <View style={styles.meta}>
              {!!eventCategory && (
                <Text style={[styles.metaText, { color: gold }]}>
                  {eventCategory.toUpperCase()}
                </Text>
              )}
              {!!eventCategory && !!eventYear && (
                <Text style={[styles.metaText, { color: theme.subtext }]}>·</Text>
              )}
              {!!eventYear && (
                <Text style={[styles.metaText, { color: theme.subtext }]}>{eventYear}</Text>
              )}
            </View>

            {/* The tease is the sentence stopping, so it does not need a frosted pane
                and a padlock on top of it saying the same thing a third time. */}
            <Text style={styles.title} numberOfLines={3}>
              <Text style={{ color: theme.text }}>{titleVisible}</Text>
              {!!titleHidden && <Text style={{ color: theme.subtext + '40' }}>{titleHidden}</Text>}
            </Text>
          </View>
        ) : (
          <View style={styles.teaser}>
            <Ionicons name="lock-closed-outline" size={22} color={theme.subtext} />
          </View>
        )}

        <Text style={[styles.subtitle, { color: theme.subtext }]}>{subtitle}</Text>

        <TouchableOpacity
          onPress={onUnlock}
          disabled={!isReady}
          activeOpacity={0.8}
          style={[
            styles.cta,
            {
              backgroundColor: isReady ? gold : 'transparent',
              borderColor: isReady ? gold : theme.border,
              opacity: isReady ? 1 : 0.55,
            },
          ]}
        >
          <Ionicons
            name={isReady ? 'play' : 'hourglass-outline'}
            size={15}
            color={isReady ? '#1A1408' : theme.subtext}
          />
          <Text style={[styles.ctaText, { color: isReady ? '#1A1408' : theme.subtext }]}>
            {ctaText}
          </Text>
        </TouchableOpacity>

        {!!onPaywall && (
          <TouchableOpacity onPress={onPaywall} activeOpacity={0.7} style={styles.proLink} hitSlop={10}>
            <Text style={[styles.proText, { color: theme.subtext }]}>{tx(language, 'getPro')}</Text>
          </TouchableOpacity>
        )}
      </View>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  card: { width: '100%', height: '100%', borderRadius: 18, overflow: 'hidden' },
  inner: {
    flex: 1,
    paddingHorizontal: 24,
    paddingTop: 28,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 14,
  },

  day: { fontSize: 10, fontWeight: '800', letterSpacing: 1.8 },

  teaser: { alignItems: 'center', gap: 8, paddingHorizontal: 8 },
  meta: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  metaText: { fontSize: 10.5, fontWeight: '700', letterSpacing: 1 },
  title: { fontSize: 20, fontWeight: '700', lineHeight: 27, letterSpacing: -0.3, textAlign: 'center' },

  subtitle: { fontSize: 13.5, lineHeight: 20, textAlign: 'center', maxWidth: 300 },

  cta: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    borderWidth: 1,
    borderRadius: 12,
    paddingVertical: 13,
    paddingHorizontal: 26,
    minWidth: 210,
    marginTop: 4,
  },
  ctaText: { fontSize: 14.5, fontWeight: '700', letterSpacing: 0.1 },

  proLink: { paddingVertical: 6, paddingHorizontal: 12 },
  proText: { fontSize: 12.5, fontWeight: '600', textDecorationLine: 'underline' },
});
