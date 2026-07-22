// components/XpBoostOffer.tsx
// Post-quiz rewarded offer: "double the XP you just earned".
//
// Why this instead of an interstitial at the same moment: a rewarded impression
// earns 3-6x an interstitial one, and this is opt-in, so it satisfies the rule
// that every ad carries a benefit the user asked for. The reward is anchored to
// what the player just did, which converts far better than a generic
// "watch a clip for a coin" prompt.
//
// Shown only while there is rewarded budget left for the day.
import { LinearGradient } from 'expo-linear-gradient';
import { Zap } from 'lucide-react-native';
import React, { useState } from 'react';
import { ActivityIndicator, Platform, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { COIN_GOLD, COIN_GOLD_DEEP } from '../config/coins';
import { useLanguage } from '../context/LanguageContext';
import { useRevenueCat } from '../context/RevenueCatContext';
import { useTheme } from '../context/ThemeContext';
import { useRewardedUnlock } from '../hooks/useRewardedUnlock';
import { useCoinStore } from '../store/useCoinStore';
import { useGamificationStore } from '../store/useGamificationStore';
import { haptic } from '../utils/haptics';

const SERIF = Platform.OS === 'ios' ? 'Georgia' : 'serif';

const L: Record<string, Record<string, string>> = {
  en: { cta: 'Double it — watch a clip', loading: 'Loading clip…', done: 'XP doubled!', sub: 'You earned {n} XP' },
  ro: { cta: 'Dublează — vezi un clip', loading: 'Se încarcă clipul…', done: 'XP dublat!', sub: 'Ai câștigat {n} XP' },
  fr: { cta: 'Doubler — voir une pub', loading: 'Chargement…', done: 'XP doublés !', sub: 'Vous avez gagné {n} XP' },
  de: { cta: 'Verdoppeln — Clip ansehen', loading: 'Clip lädt…', done: 'XP verdoppelt!', sub: 'Du hast {n} XP verdient' },
  es: { cta: 'Duplicar — ver un clip', loading: 'Cargando…', done: '¡XP duplicado!', sub: 'Ganaste {n} XP' },
};

export default function XpBoostOffer({ xpEarned, placement }: { xpEarned: number; placement: string }) {
  const { theme, isDark } = useTheme();
  const { language } = useLanguage();
  const { isPro } = useRevenueCat();
  const tx = (k: string) => (L[language] ?? L.en)[k] ?? L.en[k] ?? k;

  const addQuizXP = useGamificationStore(s => s.addQuizXP);
  const { showForUnlock } = useRewardedUnlock();
  const [state, setState] = useState<'offer' | 'watching' | 'done'>('offer');

  // Nothing to double, PRO users (who bought the ad-free experience), or the
  // daily rewarded budget is spent.
  if (xpEarned <= 0 || isPro) return null;
  if (state === 'offer' && !useCoinStore.getState().canWatchRewarded()) return null;

  const gold = isDark ? COIN_GOLD : COIN_GOLD_DEEP;

  const onWatch = () => {
    haptic('medium');
    setState('watching');
    showForUnlock(() => {
      addQuizXP(xpEarned, isPro);
      useCoinStore.getState().registerRewardedWatch();
      haptic('success');
      setState('done');
    }, placement);
  };

  if (state === 'done') {
    return (
      <View style={[s.doneWrap, { borderColor: '#10B98140', backgroundColor: '#10B98112' }]}>
        <Zap size={15} color="#10B981" fill="#10B981" />
        <Text style={[s.doneText, { color: '#10B981' }]}>
          {tx('done')} +{xpEarned} XP
        </Text>
      </View>
    );
  }

  return (
    <TouchableOpacity
      onPress={onWatch}
      disabled={state === 'watching'}
      activeOpacity={0.85}
      style={[s.wrap, { opacity: state === 'watching' ? 0.75 : 1 }]}
    >
      <LinearGradient
        colors={[COIN_GOLD, COIN_GOLD_DEEP]}
        start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }}
        style={s.btn}
      >
        {state === 'watching' ? (
          <>
            <ActivityIndicator size="small" color="#3A2A05" />
            <Text style={s.btnText}>{tx('loading')}</Text>
          </>
        ) : (
          <>
            <Zap size={16} color="#3A2A05" fill="#3A2A05" />
            <Text style={s.btnText}>{tx('cta')}</Text>
            <View style={s.pill}>
              <Text style={s.pillText}>+{xpEarned}</Text>
            </View>
          </>
        )}
      </LinearGradient>
    </TouchableOpacity>
  );
}

const s = StyleSheet.create({
  wrap: { alignSelf: 'stretch', borderRadius: 14, overflow: 'hidden', marginBottom: 10 },
  btn: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, paddingVertical: 14 },
  btnText: { fontSize: 14.5, fontWeight: '900', color: '#3A2A05', letterSpacing: 0.2 },
  pill: { backgroundColor: 'rgba(0,0,0,0.16)', paddingHorizontal: 8, paddingVertical: 2, borderRadius: 999 },
  pillText: { fontSize: 12, fontWeight: '900', color: '#3A2A05' },
  doneWrap: {
    alignSelf: 'stretch', flexDirection: 'row', alignItems: 'center', justifyContent: 'center',
    gap: 7, paddingVertical: 13, borderRadius: 14, borderWidth: 1, marginBottom: 10,
  },
  doneText: { fontSize: 14, fontWeight: '800' },
});
