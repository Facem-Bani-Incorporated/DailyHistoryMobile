// components/LockedTomorrowCard.tsx
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import React, { useEffect, useRef } from 'react';
import {
  Animated,
  Easing,
  Platform,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { COIN_GOLD, COIN_GOLD_DEEP } from '../config/coins';
import { useLanguage } from '../context/LanguageContext';
import { useTheme } from '../context/ThemeContext';

const SERIF = Platform.OS === 'ios' ? 'Georgia' : 'serif';

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
  /** When set, the card unlocks by spending this many coins instead of a clip. */
  coinCost?: number;
  coins?: number;
}

export default function LockedTomorrowCard({
  variant,
  onUnlock,
  isReady,
  dayOffset = 1,
  hintEvent,
  bottomPad = 0,
  onPaywall,
  coinCost,
  coins = 0,
}: LockedTomorrowCardProps) {
  const { theme, isDark } = useTheme();
  const { language } = useLanguage();

  const pulse = useRef(new Animated.Value(0)).current;
  const lockBounce = useRef(new Animated.Value(0.8)).current;
  const fadeIn = useRef(new Animated.Value(0)).current;
  const shimmer = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    Animated.timing(fadeIn, { toValue: 1, duration: 600, useNativeDriver: true }).start();
    Animated.spring(lockBounce, { toValue: 1, tension: 80, friction: 6, useNativeDriver: true }).start();
    Animated.loop(
      Animated.timing(shimmer, { toValue: 1, duration: 2800, easing: Easing.inOut(Easing.sin), useNativeDriver: true }),
    ).start();
    if (isReady) {
      Animated.loop(
        Animated.sequence([
          Animated.timing(pulse, { toValue: 1, duration: 1100, easing: Easing.inOut(Easing.sin), useNativeDriver: true }),
          Animated.timing(pulse, { toValue: 0, duration: 1300, easing: Easing.inOut(Easing.sin), useNativeDriver: true }),
        ]),
      ).start();
    }
  }, [isReady]);

  const gold = isDark ? COIN_GOLD : COIN_GOLD_DEEP;
  const isMain = variant === 'main';

  const coinMode = typeof coinCost === 'number';
  const dayLabel = dayOffset === 1 ? tx(language, 'tomorrow') : tx(language, 'inTwoDays');
  const subtitle = coinMode
    ? tx(language, 'coinSub')
    : tx(language, isMain ? 'lockedSub' : 'discoverSub');
  const ctaText = coinMode
    ? `${tx(language, 'coinCta')} · ${coinCost} 🪙`
    : (isReady ? tx(language, 'cta') : tx(language, 'ctaDisabled'));

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

  const pulseScale = pulse.interpolate({ inputRange: [0, 1], outputRange: [1, 1.04] });
  const pulseGlow = pulse.interpolate({ inputRange: [0, 1], outputRange: [0.65, 1] });
  const shimmerOp = shimmer.interpolate({ inputRange: [0, 0.5, 1], outputRange: [0.12, 0.4, 0.12] });

  return (
    <Animated.View style={[styles.card, { shadowColor: isDark ? '#000' : '#444', opacity: fadeIn }]}>
      <View style={[styles.inner, { paddingBottom: 20 + bottomPad }]}>
        {/* Background gradient */}
        <LinearGradient
          colors={isDark
            ? ['#0D0A07', '#1A1408', '#0D0A07']
            : ['#FFF9EF', '#FFFBF5', '#FFF9EF']}
          style={StyleSheet.absoluteFill}
        />

        {/* Top badge */}
        <View style={styles.top}>
          <View style={[styles.dayBadge, { borderColor: gold + '40', backgroundColor: gold + '15' }]}>
            <Ionicons name="time-outline" size={9} color={gold} />
            <Text style={[styles.dayText, { color: gold }]}>{dayLabel}</Text>
          </View>
        </View>

        {/* Event hint teaser */}
        {hasHint ? (
          <View style={[styles.hintCard, {
            borderColor: gold + '22',
            backgroundColor: isDark ? 'rgba(255,215,0,0.035)' : 'rgba(199,126,8,0.04)',
          }]}>
            {/* Shimmer top accent */}
            <Animated.View style={[styles.hintAccent, { backgroundColor: gold, opacity: shimmerOp }]} />

            {/* Category + year */}
            <View style={styles.hintMeta}>
              {!!eventCategory && (
                <View style={[styles.catPill, { borderColor: gold + '35', backgroundColor: gold + '10' }]}>
                  <Text style={[styles.catText, { color: gold }]}>{eventCategory.toUpperCase()}</Text>
                </View>
              )}
              {!!eventYear && (
                <Text style={[styles.yearText, { color: theme.subtext }]}>{eventYear}</Text>
              )}
            </View>

            {/* Partially revealed title */}
            <Text style={styles.hintTitle} numberOfLines={2}>
              <Text style={{ color: theme.text, fontFamily: SERIF }}>{titleVisible}</Text>
              {!!titleHidden && (
                <Text style={{ color: gold + '2A', fontFamily: SERIF }}>{titleHidden}</Text>
              )}
            </Text>

            {/* Frosted overlay with lock */}
            <View style={[styles.hintOverlay, {
              backgroundColor: isDark ? 'rgba(13,10,7,0.48)' : 'rgba(255,249,239,0.55)',
            }]}>
              <Animated.View style={[styles.lockCircleSmall, {
                backgroundColor: gold + '15',
                borderColor: gold + '35',
                transform: [{ scale: lockBounce }],
              }]}>
                <Ionicons name="lock-closed" size={20} color={gold} />
              </Animated.View>
            </View>
          </View>
        ) : (
          /* Fallback: no hint yet */
          <View style={styles.center}>
            <Animated.View style={[styles.lockCircle, {
              backgroundColor: gold + '12',
              borderColor: gold + '30',
              transform: [{ scale: lockBounce }],
            }]}>
              <Ionicons name="lock-closed" size={32} color={gold} />
            </Animated.View>
          </View>
        )}

        {/* Subtitle */}
        <Text style={[styles.subtitle, { color: theme.subtext }]}>{subtitle}</Text>

        {/* CTA section */}
        <View style={styles.bottom}>
          {/* Rewarded video button */}
          <TouchableOpacity
            onPress={onUnlock}
            disabled={!isReady}
            activeOpacity={0.75}
            style={styles.ctaWrap}
          >
            <Animated.View style={[
              styles.ctaBtn,
              {
                backgroundColor: isReady ? gold : (isDark ? '#1A1610' : '#EDE5D8'),
                transform: [{ scale: isReady ? pulseScale : 1 }],
                opacity: isReady ? pulseGlow : 0.5,
              },
            ]}>
              <Ionicons
                name={coinMode ? 'lock-open' : (isReady ? 'play-circle' : 'hourglass-outline')}
                size={18}
                color={isReady ? '#000' : theme.subtext}
              />
              <Text style={[styles.ctaText, { color: isReady ? '#000' : theme.subtext }]}>
                {ctaText}
              </Text>
              {coinMode ? (
                <View style={styles.durationBadge}>
                  <Text style={styles.durationText}>{coins} 🪙</Text>
                </View>
              ) : isReady ? (
                <View style={styles.durationBadge}>
                  <Text style={styles.durationText}>{tx(language, 'duration')}</Text>
                </View>
              ) : null}
            </Animated.View>
          </TouchableOpacity>

          {/* OR + PRO upgrade */}
          {!!onPaywall && (
            <>
              <View style={styles.orRow}>
                <Animated.View style={[styles.orLine, { backgroundColor: gold, opacity: shimmerOp }]} />
                <Text style={[styles.orText, { color: theme.subtext }]}>{tx(language, 'or')}</Text>
                <Animated.View style={[styles.orLine, { backgroundColor: gold, opacity: shimmerOp }]} />
              </View>

              <TouchableOpacity
                onPress={onPaywall}
                activeOpacity={0.7}
                style={[styles.proBtn, { borderColor: gold + '40' }]}
              >
                <Ionicons name="star" size={13} color={gold} />
                <Text style={[styles.proBtnText, { color: gold }]}>{tx(language, 'getPro')}</Text>
              </TouchableOpacity>
            </>
          )}
        </View>
      </View>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  card: {
    width: '100%',
    height: '100%',
    borderRadius: 30,
    elevation: 15,
    shadowOpacity: 0.5,
    shadowRadius: 15,
    shadowOffset: { width: 0, height: 10 },
  },
  inner: {
    flex: 1,
    borderRadius: 30,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: 'rgba(255,215,0,0.12)',
    justifyContent: 'space-between',
    paddingTop: 22,
    paddingHorizontal: 20,
    gap: 10,
  },
  top: {
    flexDirection: 'row',
    justifyContent: 'flex-start',
  },
  dayBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    paddingHorizontal: 12,
    paddingVertical: 5,
    borderRadius: 12,
    borderWidth: 1,
  },
  dayText: {
    fontWeight: '800',
    fontSize: 9,
    letterSpacing: 2.5,
  },

  // Event hint block
  hintCard: {
    borderRadius: 18,
    borderWidth: 1,
    padding: 16,
    gap: 8,
    overflow: 'hidden',
    flex: 1,
  },
  hintAccent: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    height: 2,
  },
  hintMeta: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  catPill: {
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
    borderWidth: 1,
  },
  catText: {
    fontSize: 8,
    fontWeight: '900',
    letterSpacing: 1.5,
  },
  yearText: {
    fontSize: 11,
    fontWeight: '600',
    opacity: 0.6,
  },
  hintTitle: {
    fontSize: 18,
    fontWeight: '800',
    letterSpacing: -0.3,
    lineHeight: 24,
  },
  hintOverlay: {
    ...StyleSheet.absoluteFillObject,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
  },
  lockCircleSmall: {
    width: 50,
    height: 50,
    borderRadius: 25,
    borderWidth: 1.5,
    alignItems: 'center',
    justifyContent: 'center',
  },

  // Fallback (no hint)
  center: {
    alignItems: 'center',
    justifyContent: 'center',
    flex: 1,
  },
  lockCircle: {
    width: 72,
    height: 72,
    borderRadius: 36,
    borderWidth: 1.5,
    alignItems: 'center',
    justifyContent: 'center',
  },

  subtitle: {
    fontSize: 12,
    fontWeight: '500',
    opacity: 0.55,
    textAlign: 'center',
    lineHeight: 18,
  },

  // Buttons
  bottom: {
    gap: 10,
  },
  ctaWrap: {
    width: '100%',
  },
  ctaBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    paddingVertical: 15,
    borderRadius: 16,
  },
  ctaText: {
    fontSize: 15,
    fontWeight: '800',
    letterSpacing: 0.3,
  },
  durationBadge: {
    backgroundColor: 'rgba(0,0,0,0.18)',
    borderRadius: 6,
    paddingHorizontal: 6,
    paddingVertical: 2,
  },
  durationText: {
    fontSize: 9,
    fontWeight: '700',
    color: 'rgba(0,0,0,0.65)',
    letterSpacing: 0.3,
  },

  orRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  orLine: {
    flex: 1,
    height: 1,
    borderRadius: 0.5,
  },
  orText: {
    fontSize: 10,
    fontWeight: '700',
    letterSpacing: 1.5,
    opacity: 0.4,
  },

  proBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 7,
    paddingVertical: 12,
    borderRadius: 14,
    borderWidth: 1,
  },
  proBtnText: {
    fontSize: 13,
    fontWeight: '800',
    letterSpacing: 0.2,
  },
});
