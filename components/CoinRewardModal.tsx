// components/CoinRewardModal.tsx
// "Watch a clip, earn a coin" pop-up. Self-contained: reads visibility from
// useCoinPopupStore, so it can be mounted once at the app root and triggered from
// anywhere (after a quiz, leaving the map, the daily quiz, opening >6 events, or a
// failed 0-coin unlock, plus the "Get a coin" button in the profile).
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { Coins, X } from 'lucide-react-native';
import React, { useEffect, useState } from 'react';
import {
  ActivityIndicator,
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
const GOLD = '#FFB300';

const L: Record<string, Record<string, string>> = {
  en: {
    title: 'Earn a coin', sub: 'Watch a short clip and get a coin to unlock any PRO story or map.',
    balance: 'Your coins', watch: 'Watch & earn +1', loading: 'Loading clip…',
    earned: 'Nice! +1 coin', earnedSub: 'Spend it on any PRO story or map layer.',
    later: 'Maybe later', done: 'Done', coins: 'coins',
  },
  ro: {
    title: 'Câștigă o monedă', sub: 'Vizionează un clip scurt și primești o monedă ca să deblochezi orice poveste sau hartă PRO.',
    balance: 'Monedele tale', watch: 'Vizionează & +1', loading: 'Se încarcă clipul…',
    earned: 'Super! +1 monedă', earnedSub: 'Folosește-o pe orice poveste sau strat de hartă PRO.',
    later: 'Mai târziu', done: 'Gata', coins: 'monede',
  },
  fr: {
    title: 'Gagne une pièce', sub: 'Regarde une courte pub et obtiens une pièce pour débloquer une histoire ou carte PRO.',
    balance: 'Tes pièces', watch: 'Regarder & +1', loading: 'Chargement…',
    earned: 'Super ! +1 pièce', earnedSub: 'Utilise-la sur une histoire ou couche de carte PRO.',
    later: 'Plus tard', done: 'OK', coins: 'pièces',
  },
  de: {
    title: 'Münze verdienen', sub: 'Sieh dir einen kurzen Clip an und erhalte eine Münze für jede PRO-Geschichte oder Karte.',
    balance: 'Deine Münzen', watch: 'Ansehen & +1', loading: 'Clip lädt…',
    earned: 'Super! +1 Münze', earnedSub: 'Nutze sie für eine PRO-Geschichte oder Kartenebene.',
    later: 'Später', done: 'Fertig', coins: 'Münzen',
  },
  es: {
    title: 'Gana una moneda', sub: 'Mira un clip corto y consigue una moneda para desbloquear cualquier historia o mapa PRO.',
    balance: 'Tus monedas', watch: 'Ver y +1', loading: 'Cargando…',
    earned: '¡Genial! +1 moneda', earnedSub: 'Úsala en cualquier historia o capa de mapa PRO.',
    later: 'Más tarde', done: 'Listo', coins: 'monedas',
  },
};

export default function CoinRewardModal() {
  const { theme, isDark } = useTheme();
  const { language } = useLanguage();
  const tx = (k: string) => (L[language] ?? L.en)[k] ?? L.en[k] ?? k;

  const visible = useCoinPopupStore(s => s.visible);
  const hide = useCoinPopupStore(s => s.hide);
  const coins = useCoins();
  const { showForUnlock, isUnlockReady } = useRewardedUnlock();

  const [phase, setPhase] = useState<'offer' | 'watching' | 'earned'>('offer');

  useEffect(() => {
    if (visible) setPhase('offer');
  }, [visible]);

  const onWatch = () => {
    haptic('medium');
    setPhase('watching');
    showForUnlock(() => {
      useCoinStore.getState().addCoins(COINS_PER_REWARDED_AD);
      haptic('success');
      setPhase('earned');
    });
  };

  const bg = isDark ? '#141017' : '#FFFFFF';
  const border = isDark ? '#2A2230' : '#ECE6DC';

  return (
    <Modal visible={visible} transparent animationType="fade" statusBarTranslucent onRequestClose={hide}>
      <View style={s.backdrop}>
        <View style={[s.card, { backgroundColor: bg, borderColor: border }]}>
          <LinearGradient
            colors={[GOLD + '22', 'transparent']}
            start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }}
            style={StyleSheet.absoluteFill} pointerEvents="none"
          />

          <TouchableOpacity onPress={() => { haptic('light'); hide(); }} style={s.close} activeOpacity={0.7}>
            <X size={18} color={theme.subtext} strokeWidth={2.4} />
          </TouchableOpacity>

          <View style={[s.coinCircle, { backgroundColor: GOLD + '1A', borderColor: GOLD + '44' }]}>
            <Coins size={34} color={GOLD} strokeWidth={2} />
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

          <View style={[s.balance, { borderColor: border }]}>
            <Coins size={15} color={GOLD} strokeWidth={2.4} />
            <Text style={[s.balanceText, { color: theme.text }]}>
              {coins} <Text style={{ color: theme.subtext, fontWeight: '600' }}>{tx('coins')}</Text>
            </Text>
          </View>

          {phase === 'earned' ? (
            <TouchableOpacity onPress={() => { haptic('light'); hide(); }} activeOpacity={0.85} style={[s.cta, { backgroundColor: GOLD }]}>
              <Text style={s.ctaText}>{tx('done')}</Text>
            </TouchableOpacity>
          ) : (
            <TouchableOpacity
              onPress={onWatch}
              disabled={phase === 'watching'}
              activeOpacity={0.85}
              style={[s.cta, { backgroundColor: GOLD, opacity: phase === 'watching' ? 0.7 : 1 }]}
            >
              {phase === 'watching' ? (
                <>
                  <ActivityIndicator size="small" color="#1a1208" />
                  <Text style={s.ctaText}>{tx('loading')}</Text>
                </>
              ) : (
                <>
                  <Ionicons name="play-circle" size={18} color="#1a1208" />
                  <Text style={s.ctaText}>{tx('watch')}</Text>
                </>
              )}
            </TouchableOpacity>
          )}

          {phase !== 'earned' && (
            <TouchableOpacity onPress={() => { haptic('light'); hide(); }} activeOpacity={0.6} style={s.later}>
              <Text style={[s.laterText, { color: theme.subtext }]}>{tx('later')}</Text>
            </TouchableOpacity>
          )}
        </View>
      </View>
    </Modal>
  );
}

const s = StyleSheet.create({
  backdrop: { flex: 1, backgroundColor: 'rgba(0,0,0,0.55)', alignItems: 'center', justifyContent: 'center', padding: 28 },
  card: {
    width: '100%', maxWidth: 360, borderRadius: 26, borderWidth: 1, padding: 24, alignItems: 'center', overflow: 'hidden',
    shadowColor: '#000', shadowOffset: { width: 0, height: 12 }, shadowOpacity: 0.3, shadowRadius: 24, elevation: 10,
  },
  close: { position: 'absolute', top: 14, right: 14, padding: 4, zIndex: 2 },
  coinCircle: { width: 76, height: 76, borderRadius: 38, borderWidth: 1.5, alignItems: 'center', justifyContent: 'center', marginBottom: 16, marginTop: 6 },
  title: { fontSize: 20, fontWeight: '800', letterSpacing: -0.3, fontFamily: SERIF, textAlign: 'center' },
  sub: { fontSize: 13, fontWeight: '500', textAlign: 'center', marginTop: 8, lineHeight: 19, opacity: 0.85, paddingHorizontal: 4 },
  balance: { flexDirection: 'row', alignItems: 'center', gap: 7, borderWidth: 1, borderRadius: 12, paddingHorizontal: 14, paddingVertical: 9, marginTop: 18 },
  balanceText: { fontSize: 15, fontWeight: '900', letterSpacing: -0.2 },
  cta: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, alignSelf: 'stretch', paddingVertical: 15, borderRadius: 15, marginTop: 18 },
  ctaText: { color: '#1a1208', fontWeight: '900', fontSize: 15, letterSpacing: 0.2 },
  later: { paddingVertical: 12, marginTop: 4 },
  laterText: { fontSize: 13, fontWeight: '700', opacity: 0.7 },
});
