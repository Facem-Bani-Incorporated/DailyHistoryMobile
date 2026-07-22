// components/StreakRestoreModal.tsx
// Shown the first time the user opens the app after a streak broke. Offers the
// streak back for coins or a rewarded clip — both user-initiated, per the ads
// policy. The offer is same-day only (see restoreStreak in the store).
import { LinearGradient } from 'expo-linear-gradient';
import { Flame, X } from 'lucide-react-native';
import React, { useState } from 'react';
import {
  ActivityIndicator, Modal, Platform, StyleSheet, Text, TouchableOpacity, View,
} from 'react-native';
import { COIN_COST_STREAK_RESTORE, COIN_GOLD, COIN_GOLD_DEEP } from '../config/coins';
import { useLanguage } from '../context/LanguageContext';
import { useTheme } from '../context/ThemeContext';
import { useRewardedUnlock } from '../hooks/useRewardedUnlock';
import { useCoins, useCoinStore } from '../store/useCoinStore';
import { useGamificationStore } from '../store/useGamificationStore';
import { haptic } from '../utils/haptics';
import CoinIcon from './CoinIcon';

const SERIF = Platform.OS === 'ios' ? 'Georgia' : 'serif';

const L: Record<string, Record<string, string>> = {
  en: {
    title: 'Your streak ended', sub: 'You had a {n}-day streak going. Bring it back?',
    withCoins: 'Restore for {c}', watchClip: 'Watch a clip instead',
    loading: 'Loading clip…', notEnough: 'Not enough coins', dismiss: 'Start over',
    restored: 'Streak restored!',
  },
  ro: {
    title: 'Ți s-a încheiat seria', sub: 'Aveai o serie de {n} zile. O aduci înapoi?',
    withCoins: 'Restaurează cu {c}', watchClip: 'Vezi un clip în schimb',
    loading: 'Se încarcă clipul…', notEnough: 'Nu ai destule monede', dismiss: 'O iau de la capăt',
    restored: 'Serie restaurată!',
  },
  fr: {
    title: 'Votre série est terminée', sub: 'Vous aviez {n} jours d\'affilée. La récupérer ?',
    withCoins: 'Restaurer pour {c}', watchClip: 'Regarder une pub à la place',
    loading: 'Chargement…', notEnough: 'Pas assez de pièces', dismiss: 'Recommencer',
    restored: 'Série restaurée !',
  },
  de: {
    title: 'Deine Serie ist vorbei', sub: 'Du hattest {n} Tage in Folge. Zurückholen?',
    withCoins: 'Für {c} wiederherstellen', watchClip: 'Stattdessen Clip ansehen',
    loading: 'Clip lädt…', notEnough: 'Nicht genug Münzen', dismiss: 'Neu anfangen',
    restored: 'Serie wiederhergestellt!',
  },
  es: {
    title: 'Tu racha terminó', sub: 'Tenías una racha de {n} días. ¿La recuperas?',
    withCoins: 'Restaurar por {c}', watchClip: 'Ver un clip en su lugar',
    loading: 'Cargando…', notEnough: 'No tienes monedas suficientes', dismiss: 'Empezar de nuevo',
    restored: '¡Racha restaurada!',
  },
};

export default function StreakRestoreModal() {
  const { theme, isDark } = useTheme();
  const { language } = useLanguage();
  const tx = (k: string) => (L[language] ?? L.en)[k] ?? L.en[k] ?? k;

  const lostStreak = useGamificationStore(s => s.lostStreak);
  const lostStreakDate = useGamificationStore(s => s.lostStreakDate);
  const restoreStreak = useGamificationStore(s => s.restoreStreak);
  const restoreStreakFree = useGamificationStore(s => s.restoreStreakFree);
  const dismissStreakLoss = useGamificationStore(s => s.dismissStreakLoss);
  const coins = useCoins();
  const { showForUnlock } = useRewardedUnlock();

  const [watching, setWatching] = useState(false);
  const today = new Date().toISOString().split('T')[0];
  const visible = lostStreak > 0 && lostStreakDate === today;

  if (!visible) return null;

  const gold = isDark ? COIN_GOLD : COIN_GOLD_DEEP;
  const bg = isDark ? '#0D0A07' : '#FAF8F3';
  const canAfford = coins >= COIN_COST_STREAK_RESTORE;

  const onCoins = () => {
    haptic('medium');
    if (restoreStreak()) haptic('success');
  };

  const onWatch = () => {
    haptic('medium');
    setWatching(true);
    showForUnlock(() => {
      useCoinStore.getState().registerRewardedWatch();
      restoreStreakFree();
      haptic('success');
      setWatching(false);
    }, 'streak_restore');
  };

  return (
    <Modal visible transparent animationType="fade" statusBarTranslucent>
      <View style={[s.overlay, { backgroundColor: isDark ? 'rgba(0,0,0,0.82)' : 'rgba(0,0,0,0.55)' }]}>
        <View style={[s.card, { backgroundColor: bg, borderColor: gold + '30' }]}>
          <TouchableOpacity
            onPress={() => { haptic('light'); dismissStreakLoss(); }}
            style={[s.close, { borderColor: isDark ? '#2A2420' : '#E5E0D5' }]}
            hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}
          >
            <X size={15} color={theme.subtext} strokeWidth={2.5} />
          </TouchableOpacity>

          <View style={[s.icon, { backgroundColor: '#EF444414', borderColor: '#EF444440' }]}>
            <Flame size={34} color="#EF4444" />
          </View>

          <Text style={[s.title, { color: theme.text }]}>{tx('title')}</Text>
          <Text style={[s.sub, { color: theme.subtext }]}>
            {tx('sub').replace('{n}', String(lostStreak))}
          </Text>

          <TouchableOpacity
            onPress={onCoins}
            disabled={!canAfford || watching}
            activeOpacity={0.85}
            style={[s.ctaWrap, { opacity: canAfford && !watching ? 1 : 0.45 }]}
          >
            <LinearGradient
              colors={[COIN_GOLD, COIN_GOLD_DEEP]}
              start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }}
              style={s.cta}
            >
              <CoinIcon size={16} />
              <Text style={s.ctaText}>
                {tx('withCoins').replace('{c}', String(COIN_COST_STREAK_RESTORE))}
              </Text>
            </LinearGradient>
          </TouchableOpacity>

          {!canAfford && (
            <Text style={[s.hint, { color: theme.subtext }]}>
              {tx('notEnough')} · {coins}/{COIN_COST_STREAK_RESTORE}
            </Text>
          )}

          <TouchableOpacity
            onPress={onWatch}
            disabled={watching}
            activeOpacity={0.7}
            style={[s.secondary, { borderColor: isDark ? '#2A2420' : '#E5E0D5' }]}
          >
            {watching ? (
              <>
                <ActivityIndicator size="small" color={theme.subtext} />
                <Text style={[s.secondaryText, { color: theme.subtext }]}>{tx('loading')}</Text>
              </>
            ) : (
              <Text style={[s.secondaryText, { color: theme.text }]}>{tx('watchClip')}</Text>
            )}
          </TouchableOpacity>

          <TouchableOpacity onPress={() => { haptic('light'); dismissStreakLoss(); }} style={s.later}>
            <Text style={[s.laterText, { color: theme.subtext }]}>{tx('dismiss')}</Text>
          </TouchableOpacity>
        </View>
      </View>
    </Modal>
  );
}

const s = StyleSheet.create({
  overlay: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: 28 },
  card: { width: '100%', maxWidth: 380, borderRadius: 26, borderWidth: 1, padding: 24, alignItems: 'center' },
  close: { position: 'absolute', top: 14, right: 14, width: 30, height: 30, borderRadius: 10, borderWidth: 1, alignItems: 'center', justifyContent: 'center' },
  icon: { width: 74, height: 74, borderRadius: 37, borderWidth: 2, alignItems: 'center', justifyContent: 'center', marginTop: 6, marginBottom: 16 },
  title: { fontSize: 21, fontWeight: '900', fontFamily: SERIF, letterSpacing: -0.4, textAlign: 'center' },
  sub: { fontSize: 14, lineHeight: 21, textAlign: 'center', marginTop: 8, marginBottom: 22, paddingHorizontal: 6 },
  ctaWrap: { alignSelf: 'stretch', borderRadius: 15, overflow: 'hidden' },
  cta: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, paddingVertical: 15 },
  ctaText: { fontSize: 15, fontWeight: '900', color: '#3A2A05', letterSpacing: 0.2 },
  hint: { fontSize: 11, fontWeight: '700', marginTop: 8 },
  secondary: { alignSelf: 'stretch', flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, paddingVertical: 13, borderRadius: 15, borderWidth: 1, marginTop: 10 },
  secondaryText: { fontSize: 14, fontWeight: '700' },
  later: { paddingVertical: 12, marginTop: 4 },
  laterText: { fontSize: 12.5, fontWeight: '600' },
});
