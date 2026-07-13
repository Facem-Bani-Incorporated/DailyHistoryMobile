// components/CoinRewardModal.tsx
// "Watch a clip, earn a coin" pop-up. Self-contained: reads visibility from
// useCoinPopupStore, so it can be mounted once at the app root and triggered from
// anywhere (after a quiz, leaving the map, the daily quiz, opening >6 events, or a
// failed 0-coin unlock, plus the "Get a coin" button in the profile).
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { Coins, X } from 'lucide-react-native';
import React, { useEffect, useRef, useState } from 'react';
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
import { COINS_PER_REWARDED_AD } from '../config/coins';
import { useLanguage } from '../context/LanguageContext';
import { useTheme } from '../context/ThemeContext';
import { useRewardedUnlock } from '../hooks/useRewardedUnlock';
import { useCoinPopupStore } from '../store/useCoinPopupStore';
import { useCoins, useCoinStore } from '../store/useCoinStore';
import { haptic } from '../utils/haptics';

const SERIF = Platform.OS === 'ios' ? 'Georgia' : 'serif';

// Vibrant gold — used for every gold surface in this modal so it pops on both
// light and dark themes (the old flat amber looked muddy/brown on light mode).
const GOLD_LIGHT = '#F7D774';
const GOLD = '#E8B84D';
const GOLD_DEEP = '#D4A017';
const INK = '#3A2A05';

const L: Record<string, Record<string, string>> = {
  en: {
    title: 'Earn a coin', sub: 'Watch a short clip and get a coin to unlock any PRO story or map.',
    balance: 'Your coins', watch: 'Watch & earn +1', loading: 'Loading clip…',
    earned: 'Nice! +1 coin', earnedSub: 'Spend it on any PRO story or map layer.',
    later: 'Maybe later', done: 'Done', coins: 'coins', duration: '~15–30s', reward: '+1 🪙 per clip',
  },
  ro: {
    title: 'Câștigă o monedă', sub: 'Vizionează un clip scurt și primești o monedă ca să deblochezi orice poveste sau hartă PRO.',
    balance: 'Monedele tale', watch: 'Vizionează & +1', loading: 'Se încarcă clipul…',
    earned: 'Super! +1 monedă', earnedSub: 'Folosește-o pe orice poveste sau strat de hartă PRO.',
    later: 'Mai târziu', done: 'Gata', coins: 'monede', duration: '~15–30s', reward: '+1 🪙 / clip',
  },
  fr: {
    title: 'Gagne une pièce', sub: 'Regarde une courte pub et obtiens une pièce pour débloquer une histoire ou carte PRO.',
    balance: 'Tes pièces', watch: 'Regarder & +1', loading: 'Chargement…',
    earned: 'Super ! +1 pièce', earnedSub: 'Utilise-la sur une histoire ou couche de carte PRO.',
    later: 'Plus tard', done: 'OK', coins: 'pièces', duration: '~15–30s', reward: '+1 🪙 / pub',
  },
  de: {
    title: 'Münze verdienen', sub: 'Sieh dir einen kurzen Clip an und erhalte eine Münze für jede PRO-Geschichte oder Karte.',
    balance: 'Deine Münzen', watch: 'Ansehen & +1', loading: 'Clip lädt…',
    earned: 'Super! +1 Münze', earnedSub: 'Nutze sie für eine PRO-Geschichte oder Kartenebene.',
    later: 'Später', done: 'Fertig', coins: 'Münzen', duration: '~15–30s', reward: '+1 🪙 / Clip',
  },
  es: {
    title: 'Gana una moneda', sub: 'Mira un clip corto y consigue una moneda para desbloquear cualquier historia o mapa PRO.',
    balance: 'Tus monedas', watch: 'Ver y +1', loading: 'Cargando…',
    earned: '¡Genial! +1 moneda', earnedSub: 'Úsala en cualquier historia o capa de mapa PRO.',
    later: 'Más tarde', done: 'Listo', coins: 'monedas', duration: '~15–30s', reward: '+1 🪙 / clip',
  },
};

/* ── Coin burst — gold particles flying outward from the coin on earn ── */
const CoinBurst = ({ trigger }: { trigger: number }) => {
  const parts = useRef(
    Array.from({ length: 14 }).map((_, i) => {
      const angle = (Math.PI * 2 * i) / 14 + Math.random() * 0.5;
      const dist = 46 + Math.random() * 46;
      return { anim: new Animated.Value(0), dx: Math.cos(angle) * dist, dy: Math.sin(angle) * dist, size: 4 + Math.random() * 5 };
    }),
  ).current;

  useEffect(() => {
    if (!trigger) return;
    parts.forEach(p => p.anim.setValue(0));
    Animated.stagger(16, parts.map(p =>
      Animated.timing(p.anim, { toValue: 1, duration: 850, easing: Easing.out(Easing.cubic), useNativeDriver: true }),
    )).start();
  }, [trigger]);

  return (
    <View style={StyleSheet.absoluteFill} pointerEvents="none">
      {parts.map((p, i) => (
        <Animated.View
          key={i}
          style={{
            position: 'absolute', left: '50%', top: '50%', marginLeft: -p.size / 2, marginTop: -p.size / 2,
            width: p.size, height: p.size, borderRadius: p.size / 2, backgroundColor: i % 2 ? GOLD_LIGHT : GOLD,
            opacity: p.anim.interpolate({ inputRange: [0, 0.7, 1], outputRange: [1, 1, 0] }),
            transform: [
              { translateX: p.anim.interpolate({ inputRange: [0, 1], outputRange: [0, p.dx] }) },
              { translateY: p.anim.interpolate({ inputRange: [0, 1], outputRange: [0, p.dy] }) },
              { scale: p.anim.interpolate({ inputRange: [0, 0.5, 1], outputRange: [0.3, 1.1, 0.4] }) },
            ],
          }}
        />
      ))}
    </View>
  );
};

export default function CoinRewardModal() {
  const { theme, isDark } = useTheme();
  const { language } = useLanguage();
  const tx = (k: string) => (L[language] ?? L.en)[k] ?? L.en[k] ?? k;

  const visible = useCoinPopupStore(s => s.visible);
  const hide = useCoinPopupStore(s => s.hide);
  const coins = useCoins();
  const { showForUnlock } = useRewardedUnlock();

  const [phase, setPhase] = useState<'offer' | 'watching' | 'earned'>('offer');

  // Entrance (spring in), idle pulse + bob, and the earn burst.
  const cardScale = useRef(new Animated.Value(0.85)).current;
  const cardOpacity = useRef(new Animated.Value(0)).current;
  const pulse = useRef(new Animated.Value(0)).current;
  const bob = useRef(new Animated.Value(0)).current;
  const coinPop = useRef(new Animated.Value(1)).current;
  const [burst, setBurst] = useState(0);

  useEffect(() => {
    if (!visible) return;
    setPhase('offer');
    cardScale.setValue(0.85); cardOpacity.setValue(0); coinPop.setValue(1);
    Animated.parallel([
      Animated.spring(cardScale, { toValue: 1, tension: 130, friction: 8, useNativeDriver: true }),
      Animated.timing(cardOpacity, { toValue: 1, duration: 200, useNativeDriver: true }),
    ]).start();
  }, [visible]);

  useEffect(() => {
    const loop = Animated.loop(Animated.sequence([
      Animated.timing(pulse, { toValue: 1, duration: 1400, easing: Easing.inOut(Easing.quad), useNativeDriver: true }),
      Animated.timing(pulse, { toValue: 0, duration: 1400, easing: Easing.inOut(Easing.quad), useNativeDriver: true }),
    ]));
    const bobLoop = Animated.loop(Animated.sequence([
      Animated.timing(bob, { toValue: 1, duration: 1700, easing: Easing.inOut(Easing.sin), useNativeDriver: true }),
      Animated.timing(bob, { toValue: 0, duration: 1700, easing: Easing.inOut(Easing.sin), useNativeDriver: true }),
    ]));
    if (visible && phase !== 'watching') { loop.start(); bobLoop.start(); }
    return () => { loop.stop(); bobLoop.stop(); };
  }, [visible, phase]);

  const coinScale = pulse.interpolate({ inputRange: [0, 1], outputRange: [1, 1.05] });
  const bobY = bob.interpolate({ inputRange: [0, 1], outputRange: [-3, 3] });
  const ringOp = pulse.interpolate({ inputRange: [0, 1], outputRange: [0.12, 0.4] });
  const ringScale = pulse.interpolate({ inputRange: [0, 1], outputRange: [1.12, 1.34] });

  const onWatch = () => {
    haptic('medium');
    setPhase('watching');
    showForUnlock(() => {
      useCoinStore.getState().addCoins(COINS_PER_REWARDED_AD);
      haptic('success');
      setPhase('earned');
      setBurst(b => b + 1);
      coinPop.setValue(0.55);
      Animated.spring(coinPop, { toValue: 1, tension: 150, friction: 5, useNativeDriver: true }).start();
    });
  };

  const bg = isDark ? '#141017' : '#FFFDF6';
  const border = isDark ? '#2A2230' : GOLD + '44';

  return (
    <Modal visible={visible} transparent animationType="fade" statusBarTranslucent onRequestClose={hide}>
      <View style={s.backdrop}>
        <Animated.View style={[s.card, { backgroundColor: bg, borderColor: border, opacity: cardOpacity, transform: [{ scale: cardScale }] }]}>
          <LinearGradient
            colors={[GOLD + '26', 'transparent']}
            start={{ x: 0.5, y: 0 }} end={{ x: 0.5, y: 0.9 }}
            style={StyleSheet.absoluteFill} pointerEvents="none"
          />

          <TouchableOpacity onPress={() => { haptic('light'); hide(); }} style={s.close} activeOpacity={0.7}>
            <X size={18} color={theme.subtext} strokeWidth={2.4} />
          </TouchableOpacity>

          <View style={s.coinWrap}>
            <Animated.View style={[s.coinRing, { borderColor: GOLD, opacity: ringOp, transform: [{ scale: ringScale }] }]} pointerEvents="none" />
            <CoinBurst trigger={burst} />
            <Animated.View style={{ transform: [{ translateY: bobY }, { scale: coinScale }, { scale: coinPop }] }}>
              <LinearGradient
                colors={[GOLD_LIGHT, GOLD, GOLD_DEEP]}
                start={{ x: 0.2, y: 0 }} end={{ x: 0.8, y: 1 }}
                style={s.coinCircle}
              >
                <Coins size={36} color={INK} strokeWidth={2.2} />
              </LinearGradient>
            </Animated.View>
            {phase !== 'earned' && (
              <View style={[s.rewardBadge, { backgroundColor: GOLD_DEEP }]}>
                <Text style={s.rewardBadgeText}>{tx('reward')}</Text>
              </View>
            )}
          </View>

          {phase === 'earned' ? (
            <>
              <Text style={[s.title, { color: theme.text }]}>{tx('earned')}</Text>
              <Text style={[s.sub, { color: theme.subtext }]}>{tx('earnedSub')}</Text>
            </>
          ) : (
            <>
              <Text style={[s.title, { color: theme.text }]}>{tx('title')}</Text>
              <Text style={[s.sub, { color: theme.subtext }]}>{tx('sub')}</Text>
            </>
          )}

          <View style={[s.balance, { borderColor: border, backgroundColor: GOLD + '12' }]}>
            <Coins size={15} color={GOLD_DEEP} strokeWidth={2.4} />
            <Text style={[s.balanceText, { color: theme.text }]}>
              {coins} <Text style={{ color: theme.subtext, fontWeight: '600' }}>{tx('coins')}</Text>
            </Text>
          </View>

          {phase === 'earned' ? (
            <TouchableOpacity onPress={() => { haptic('light'); hide(); }} activeOpacity={0.85} style={s.ctaWrap}>
              <LinearGradient colors={[GOLD_LIGHT, GOLD_DEEP]} start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }} style={s.cta}>
                <Text style={s.ctaText}>{tx('done')}</Text>
              </LinearGradient>
            </TouchableOpacity>
          ) : (
            <TouchableOpacity
              onPress={onWatch}
              disabled={phase === 'watching'}
              activeOpacity={0.85}
              style={[s.ctaWrap, { opacity: phase === 'watching' ? 0.75 : 1 }]}
            >
              <LinearGradient colors={[GOLD_LIGHT, GOLD_DEEP]} start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }} style={s.cta}>
                {phase === 'watching' ? (
                  <>
                    <ActivityIndicator size="small" color={INK} />
                    <Text style={s.ctaText}>{tx('loading')}</Text>
                  </>
                ) : (
                  <>
                    <Ionicons name="play-circle" size={18} color={INK} />
                    <Text style={s.ctaText}>{tx('watch')}</Text>
                    <View style={s.durationBadge}>
                      <Text style={s.durationText}>{tx('duration')}</Text>
                    </View>
                  </>
                )}
              </LinearGradient>
            </TouchableOpacity>
          )}

          {phase !== 'earned' && (
            <TouchableOpacity onPress={() => { haptic('light'); hide(); }} activeOpacity={0.6} style={s.later}>
              <Text style={[s.laterText, { color: theme.subtext }]}>{tx('later')}</Text>
            </TouchableOpacity>
          )}
        </Animated.View>
      </View>
    </Modal>
  );
}

const s = StyleSheet.create({
  backdrop: { flex: 1, backgroundColor: 'rgba(0,0,0,0.6)', alignItems: 'center', justifyContent: 'center', padding: 28 },
  card: {
    width: '100%', maxWidth: 360, borderRadius: 28, borderWidth: 1, padding: 24, alignItems: 'center', overflow: 'hidden',
    shadowColor: '#000', shadowOffset: { width: 0, height: 14 }, shadowOpacity: 0.32, shadowRadius: 26, elevation: 12,
  },
  close: { position: 'absolute', top: 14, right: 14, padding: 4, zIndex: 2 },
  coinWrap: { alignItems: 'center', justifyContent: 'center', marginBottom: 16, marginTop: 12, width: 104, height: 104 },
  coinRing: { position: 'absolute', width: 80, height: 80, borderRadius: 40, borderWidth: 1.5 },
  coinCircle: {
    width: 80, height: 80, borderRadius: 40, alignItems: 'center', justifyContent: 'center',
    shadowColor: GOLD_DEEP, shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.5, shadowRadius: 12, elevation: 6,
  },
  rewardBadge: { position: 'absolute', bottom: -4, alignSelf: 'center', paddingHorizontal: 10, paddingVertical: 4, borderRadius: 10 },
  rewardBadgeText: { fontSize: 10, fontWeight: '900', color: INK, letterSpacing: 0.2 },
  durationBadge: { backgroundColor: 'rgba(0,0,0,0.18)', borderRadius: 6, paddingHorizontal: 6, paddingVertical: 2 },
  durationText: { fontSize: 9, fontWeight: '800', color: 'rgba(0,0,0,0.6)', letterSpacing: 0.3 },
  title: { fontSize: 20, fontWeight: '800', letterSpacing: -0.3, fontFamily: SERIF, textAlign: 'center' },
  sub: { fontSize: 13, fontWeight: '500', textAlign: 'center', marginTop: 8, lineHeight: 19, opacity: 0.85, paddingHorizontal: 4 },
  balance: { flexDirection: 'row', alignItems: 'center', gap: 7, borderWidth: 1, borderRadius: 12, paddingHorizontal: 14, paddingVertical: 9, marginTop: 18 },
  balanceText: { fontSize: 15, fontWeight: '900', letterSpacing: -0.2 },
  ctaWrap: { alignSelf: 'stretch', borderRadius: 15, marginTop: 18, overflow: 'hidden' },
  cta: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, paddingVertical: 15 },
  ctaText: { color: INK, fontWeight: '900', fontSize: 15, letterSpacing: 0.2 },
  later: { paddingVertical: 12, marginTop: 4 },
  laterText: { fontSize: 13, fontWeight: '700', opacity: 0.7 },
});
