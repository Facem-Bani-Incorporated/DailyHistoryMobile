// components/UnlockStoryModal.tsx
// Per-event "Unlock this story" sheet. Triggered from any locked PRO card
// (Today's ProCardSection + every Discover PRO card) via useUnlockStore.open(event).
// Mounted once at the app root.
//
// Design goals:
//  • Look premium — the event image is the hero, gold editorial accents.
//  • Maximise rewarded-ad views — "Watch a clip" is always front-and-centre. When
//    the user has 0 coins, watching a single clip earns a coin AND instantly
//    unlocks the story (one satisfying tap), which converts far better than the
//    paywall. When they do have coins, the clip is still offered as a "stock up"
//    secondary so we keep surfacing the ad.
//  • After unlocking, we open the full StoryModal reader right here so the flow is
//    identical from Today and from Discover.
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import React, { useEffect, useState } from 'react';
import {
  ActivityIndicator,
  Animated,
  Easing,
  Modal,
  Platform,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { COIN_COST_EVENT, COIN_GOLD, COIN_GOLD_DEEP, COINS_PER_REWARDED_AD } from '../config/coins';
import { useLanguage } from '../context/LanguageContext';
import { useRevenueCat } from '../context/RevenueCatContext';
import { useTheme } from '../context/ThemeContext';
import { useRewardedUnlock } from '../hooks/useRewardedUnlock';
import { useCoins, useCoinStore } from '../store/useCoinStore';
import { getEventId } from '../store/useSavedStore';
import { useUnlockStore } from '../store/useUnlockStore';
import { haptic } from '../utils/haptics';
import EventImage from './EventImage';
import { StoryModal } from './StoryModal';

const SERIF = Platform.OS === 'ios' ? 'Georgia' : 'serif';
const GOLD = COIN_GOLD; // gold used on dark chips / gold-filled buttons (dark text on top)

const L: Record<string, Record<string, string>> = {
  en: {
    kicker: 'PRO STORY', unlockNow: 'Unlock now', watchUnlock: 'Watch a clip & unlock free',
    watchEarn: 'Watch a clip', earnPlus: '+1', loading: 'Loading clip…', reading: 'Opening…',
    balance: 'Your coins', or: 'OR', goPro: 'Get PRO — unlimited access',
    freeHint: 'No coins? Watch one short clip and read it free.',
    haveHint: 'Spend a coin, or stock up by watching a clip.', read: 'Read the story',
  },
  ro: {
    kicker: 'POVESTE PRO', unlockNow: 'Deblochează acum', watchUnlock: 'Vezi un clip & deblochează gratis',
    watchEarn: 'Vezi un clip', earnPlus: '+1', loading: 'Se încarcă…', reading: 'Se deschide…',
    balance: 'Monedele tale', or: 'SAU', goPro: 'Ia PRO — acces nelimitat',
    freeHint: 'Fără monede? Vezi un clip scurt și citește gratis.',
    haveHint: 'Folosește o monedă sau strânge mai multe văzând un clip.', read: 'Citește povestea',
  },
  fr: {
    kicker: 'HISTOIRE PRO', unlockNow: 'Débloquer', watchUnlock: 'Regarder une pub & débloquer',
    watchEarn: 'Regarder une pub', earnPlus: '+1', loading: 'Chargement…', reading: 'Ouverture…',
    balance: 'Tes pièces', or: 'OU', goPro: 'Passer PRO — accès illimité',
    freeHint: 'Pas de pièces ? Regarde une courte pub et lis gratuitement.',
    haveHint: 'Dépense une pièce ou fais le plein en regardant une pub.', read: "Lire l'histoire",
  },
  de: {
    kicker: 'PRO-GESCHICHTE', unlockNow: 'Freischalten', watchUnlock: 'Clip ansehen & gratis freischalten',
    watchEarn: 'Clip ansehen', earnPlus: '+1', loading: 'Lädt…', reading: 'Öffnet…',
    balance: 'Deine Münzen', or: 'ODER', goPro: 'PRO holen — unbegrenzt',
    freeHint: 'Keine Münzen? Sieh einen kurzen Clip und lies gratis.',
    haveHint: 'Gib eine Münze aus oder sammle welche mit einem Clip.', read: 'Geschichte lesen',
  },
  es: {
    kicker: 'HISTORIA PRO', unlockNow: 'Desbloquear', watchUnlock: 'Ver un clip y desbloquear gratis',
    watchEarn: 'Ver un clip', earnPlus: '+1', loading: 'Cargando…', reading: 'Abriendo…',
    balance: 'Tus monedas', or: 'O', goPro: 'Obtener PRO — acceso ilimitado',
    freeHint: '¿Sin monedas? Mira un clip corto y lee gratis.',
    haveHint: 'Gasta una moneda o consigue más viendo un clip.', read: 'Leer la historia',
  },
};

export default function UnlockStoryModal() {
  const { theme, isDark } = useTheme();
  const { language } = useLanguage();
  const { presentPaywall } = useRevenueCat();
  const tx = (k: string) => (L[language] ?? L.en)[k] ?? L.en[k] ?? k;
  // Gold text-on-card must stay readable on the light theme's white card.
  const goldText = isDark ? COIN_GOLD : COIN_GOLD_DEEP;

  const visible = useUnlockStore(s => s.visible);
  const event = useUnlockStore(s => s.event);
  const hide = useUnlockStore(s => s.hide);
  const coins = useCoins();
  const { showForUnlock } = useRewardedUnlock();

  const [phase, setPhase] = useState<'offer' | 'watching'>('offer');
  const [reading, setReading] = useState(false);
  const glow = React.useRef(new Animated.Value(0)).current;

  useEffect(() => {
    if (visible) { setPhase('offer'); setReading(false); }
  }, [visible, event]);

  useEffect(() => {
    const loop = Animated.loop(
      Animated.sequence([
        Animated.timing(glow, { toValue: 1, duration: 1500, easing: Easing.inOut(Easing.quad), useNativeDriver: true }),
        Animated.timing(glow, { toValue: 0, duration: 1500, easing: Easing.inOut(Easing.quad), useNativeDriver: true }),
      ]),
    );
    if (visible) loop.start();
    return () => loop.stop();
  }, [visible]);

  const eventId = event ? getEventId(event) : '';
  const title =
    event?.titleTranslations?.[language] ?? event?.titleTranslations?.en ?? '';
  const category = (event?.category ?? 'HISTORY').replace(/_/g, ' ');
  const rawDate = event?.eventDate ?? event?.event_date ?? '';
  const year = rawDate ? String(rawDate).slice(0, 4) : '';

  const hasCoins = coins >= COIN_COST_EVENT;

  const doUnlock = () => {
    if (eventId) useCoinStore.getState().unlockEvent(eventId);
    haptic('success');
    setReading(true);
  };

  const onSpend = () => {
    haptic('medium');
    if (useCoinStore.getState().spendCoins(COIN_COST_EVENT)) {
      doUnlock();
    } else {
      onWatch();
    }
  };

  const onWatch = () => {
    haptic('medium');
    setPhase('watching');
    showForUnlock(() => {
      useCoinStore.getState().addCoins(COINS_PER_REWARDED_AD);
      // The clip earned a coin — immediately spend it on this very story.
      useCoinStore.getState().spendCoins(COIN_COST_EVENT);
      doUnlock();
    });
  };

  const onGoPro = () => { haptic('light'); hide(); presentPaywall(); };

  const scale = glow.interpolate({ inputRange: [0, 1], outputRange: [1, 1.03] });
  const glowOp = glow.interpolate({ inputRange: [0, 1], outputRange: [0.25, 0.6] });

  const bg = isDark ? '#141017' : '#FFFFFF';
  const border = isDark ? '#2A2230' : '#ECE6DC';
  const watching = phase === 'watching';

  // Once unlocked, hand straight over to the full reader.
  if (reading && event) {
    return (
      <StoryModal
        visible
        event={event}
        theme={theme}
        onClose={() => { setReading(false); hide(); }}
      />
    );
  }

  return (
    <Modal visible={visible && !!event} transparent animationType="fade" statusBarTranslucent onRequestClose={hide}>
      <View style={s.backdrop}>
        <View style={[s.card, { backgroundColor: bg, borderColor: border }]}>
          {/* Hero image strip */}
          <View style={s.hero}>
            {event ? <EventImage event={event} style={StyleSheet.absoluteFill} showLoader={false} /> : null}
            <LinearGradient
              colors={['rgba(5,4,10,0.15)', 'rgba(5,4,10,0.35)', bg]}
              locations={[0, 0.55, 1]}
              style={StyleSheet.absoluteFill}
            />
            <TouchableOpacity onPress={() => { haptic('light'); hide(); }} style={s.close} activeOpacity={0.7}>
              <View style={s.closeBg}>
                <Ionicons name="close" size={17} color="#fff" />
              </View>
            </TouchableOpacity>

            <View style={s.kickerRow}>
              <View style={[s.kickerPill, { borderColor: GOLD + '66', backgroundColor: 'rgba(0,0,0,0.45)' }]}>
                <Ionicons name="star" size={9} color={GOLD} />
                <Text style={[s.kickerText, { color: GOLD }]}>{tx('kicker')}</Text>
              </View>
            </View>
          </View>

          {/* Body */}
          <View style={s.body}>
            <Text style={[s.meta, { color: goldText }]}>
              {category}{year ? `  ·  ${year}` : ''}
            </Text>
            <Text style={[s.title, { color: theme.text }]} numberOfLines={3}>{title}</Text>

            <Text style={[s.hint, { color: theme.subtext }]}>
              {hasCoins ? tx('haveHint') : tx('freeHint')}
            </Text>

            {/* Balance chip */}
            <View style={[s.balance, { borderColor: border }]}>
              <Text style={s.coinEmoji}>🪙</Text>
              <Text style={[s.balanceText, { color: theme.text }]}>
                {coins} <Text style={{ color: theme.subtext, fontWeight: '700' }}>{tx('balance').toLowerCase()}</Text>
              </Text>
            </View>

            {/* Primary CTA */}
            {hasCoins ? (
              <>
                {/* Spend a coin → unlock */}
                <TouchableOpacity onPress={onSpend} disabled={watching} activeOpacity={0.9} style={[s.cta, { backgroundColor: GOLD, opacity: watching ? 0.6 : 1 }]}>
                  <Ionicons name="lock-open" size={17} color="#1a1208" />
                  <Text style={s.ctaText}>{tx('unlockNow')} · {COIN_COST_EVENT} 🪙</Text>
                </TouchableOpacity>

                {/* Secondary — keep surfacing the ad even when they have coins */}
                <TouchableOpacity onPress={onWatch} disabled={watching} activeOpacity={0.85} style={[s.ctaGhost, { borderColor: goldText + '55' }]}>
                  {watching ? (
                    <>
                      <ActivityIndicator size="small" color={goldText} />
                      <Text style={[s.ctaGhostText, { color: goldText }]}>{tx('loading')}</Text>
                    </>
                  ) : (
                    <>
                      <Ionicons name="play-circle" size={16} color={goldText} />
                      <Text style={[s.ctaGhostText, { color: goldText }]}>{tx('watchEarn')}</Text>
                      <View style={[s.plusPill, { backgroundColor: goldText + '22' }]}>
                        <Text style={[s.plusText, { color: goldText }]}>+1 🪙</Text>
                      </View>
                    </>
                  )}
                </TouchableOpacity>
              </>
            ) : (
              /* No coins — one clip unlocks the story for free. This is the star. */
              <Animated.View style={{ transform: [{ scale: watching ? 1 : scale }], alignSelf: 'stretch' }}>
                <TouchableOpacity onPress={onWatch} disabled={watching} activeOpacity={0.9} style={[s.cta, { backgroundColor: GOLD, opacity: watching ? 0.7 : 1 }]}>
                  {watching ? (
                    <>
                      <ActivityIndicator size="small" color="#1a1208" />
                      <Text style={s.ctaText}>{tx('loading')}</Text>
                    </>
                  ) : (
                    <>
                      <Ionicons name="play-circle" size={18} color="#1a1208" />
                      <Text style={s.ctaText}>{tx('watchUnlock')}</Text>
                    </>
                  )}
                </TouchableOpacity>
                <Animated.View style={[s.ctaGlow, { backgroundColor: GOLD, opacity: watching ? 0 : glowOp }]} pointerEvents="none" />
              </Animated.View>
            )}

            {/* Go PRO */}
            <TouchableOpacity onPress={onGoPro} activeOpacity={0.7} style={s.goPro}>
              <Ionicons name="star" size={11} color={goldText} />
              <Text style={[s.goProText, { color: goldText }]}>{tx('goPro')}</Text>
            </TouchableOpacity>
          </View>
        </View>
      </View>
    </Modal>
  );
}

const s = StyleSheet.create({
  backdrop: { flex: 1, backgroundColor: 'rgba(0,0,0,0.6)', alignItems: 'center', justifyContent: 'center', padding: 24 },
  card: {
    width: '100%', maxWidth: 380, borderRadius: 26, borderWidth: 1, overflow: 'hidden',
    shadowColor: '#000', shadowOffset: { width: 0, height: 14 }, shadowOpacity: 0.35, shadowRadius: 28, elevation: 12,
  },
  hero: { height: 150, width: '100%', backgroundColor: '#0d0d0d' },
  close: { position: 'absolute', top: 12, right: 12, zIndex: 3 },
  closeBg: { width: 30, height: 30, borderRadius: 15, backgroundColor: 'rgba(0,0,0,0.45)', alignItems: 'center', justifyContent: 'center' },
  kickerRow: { position: 'absolute', top: 14, left: 14, zIndex: 2, flexDirection: 'row' },
  kickerPill: { flexDirection: 'row', alignItems: 'center', gap: 5, paddingHorizontal: 9, paddingVertical: 5, borderRadius: 7, borderWidth: 1 },
  kickerText: { fontSize: 9, fontWeight: '900', letterSpacing: 1.8 },

  body: { paddingHorizontal: 22, paddingBottom: 22, marginTop: -6 },
  meta: { color: GOLD, fontSize: 10, fontWeight: '800', letterSpacing: 1.8, textTransform: 'uppercase', marginBottom: 7 },
  title: { fontSize: 21, fontWeight: '800', letterSpacing: -0.4, lineHeight: 26, fontFamily: SERIF },
  hint: { fontSize: 12.5, fontWeight: '500', lineHeight: 18, marginTop: 10, opacity: 0.9 },

  balance: { alignSelf: 'flex-start', flexDirection: 'row', alignItems: 'center', gap: 6, borderWidth: 1, borderRadius: 11, paddingHorizontal: 12, paddingVertical: 7, marginTop: 14 },
  coinEmoji: { fontSize: 13 },
  balanceText: { fontSize: 14, fontWeight: '900', letterSpacing: -0.2 },

  cta: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, alignSelf: 'stretch', paddingVertical: 15, borderRadius: 15, marginTop: 16 },
  ctaText: { color: '#1a1208', fontWeight: '900', fontSize: 14.5, letterSpacing: 0.2 },
  ctaGlow: { position: 'absolute', left: 20, right: 20, bottom: -6, height: 22, borderRadius: 20 },

  ctaGhost: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, alignSelf: 'stretch', paddingVertical: 13, borderRadius: 15, borderWidth: 1.5, marginTop: 10 },
  ctaGhostText: { fontWeight: '800', fontSize: 13.5, letterSpacing: 0.2 },
  plusPill: { paddingHorizontal: 8, paddingVertical: 3, borderRadius: 8 },
  plusText: { fontSize: 11, fontWeight: '900' },

  goPro: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6, paddingVertical: 14, marginTop: 4 },
  goProText: { fontSize: 12.5, fontWeight: '800', letterSpacing: 0.2 },
});
