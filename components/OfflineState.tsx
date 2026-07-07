// components/OfflineState.tsx
// Branded "can't reach the server" state with a retry, shown when the daily
// content fetch fails and there's no cache to fall back on. Keeps the editorial
// tone instead of a blank screen or an infinite spinner.
import { Ionicons } from '@expo/vector-icons';
import React, { useEffect, useRef } from 'react';
import { Animated, Easing, Platform, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { COIN_GOLD, COIN_GOLD_DEEP } from '../config/coins';
import { useLanguage } from '../context/LanguageContext';
import { useTheme } from '../context/ThemeContext';

const SERIF = Platform.OS === 'ios' ? 'Georgia' : 'serif';

const L: Record<string, { title: string; sub: string; retry: string }> = {
  en: { title: 'No connection', sub: "We couldn't reach the archive. Check your connection and try again.", retry: 'Try again' },
  ro: { title: 'Fără conexiune', sub: 'Nu am putut ajunge la arhivă. Verifică conexiunea și încearcă din nou.', retry: 'Încearcă din nou' },
  fr: { title: 'Pas de connexion', sub: "Impossible d'atteindre les archives. Vérifie ta connexion et réessaie.", retry: 'Réessayer' },
  de: { title: 'Keine Verbindung', sub: 'Das Archiv war nicht erreichbar. Prüfe deine Verbindung und versuche es erneut.', retry: 'Erneut versuchen' },
  es: { title: 'Sin conexión', sub: 'No pudimos acceder al archivo. Revisa tu conexión e inténtalo de nuevo.', retry: 'Reintentar' },
};

export default function OfflineState({ onRetry }: { onRetry: () => void }) {
  const { theme, isDark } = useTheme();
  const { language } = useLanguage();
  const tx = L[language] ?? L.en;
  const gold = isDark ? COIN_GOLD : COIN_GOLD_DEEP;

  const pulse = useRef(new Animated.Value(0)).current;
  useEffect(() => {
    const loop = Animated.loop(
      Animated.sequence([
        Animated.timing(pulse, { toValue: 1, duration: 1300, easing: Easing.inOut(Easing.sin), useNativeDriver: true }),
        Animated.timing(pulse, { toValue: 0, duration: 1300, easing: Easing.inOut(Easing.sin), useNativeDriver: true }),
      ]),
    );
    loop.start();
    return () => loop.stop();
  }, []);
  const ringScale = pulse.interpolate({ inputRange: [0, 1], outputRange: [1, 1.15] });
  const ringOp = pulse.interpolate({ inputRange: [0, 1], outputRange: [0.25, 0] });

  return (
    <View style={s.wrap}>
      <View style={s.iconWrap}>
        <Animated.View style={[s.ring, { borderColor: gold, opacity: ringOp, transform: [{ scale: ringScale }] }]} />
        <View style={[s.iconCircle, { backgroundColor: gold + '14', borderColor: gold + '44' }]}>
          <Ionicons name="cloud-offline-outline" size={34} color={gold} />
        </View>
      </View>

      <Text style={[s.title, { color: theme.text }]}>{tx.title}</Text>
      <Text style={[s.sub, { color: theme.subtext }]}>{tx.sub}</Text>

      <TouchableOpacity
        onPress={onRetry}
        activeOpacity={0.85}
        style={[s.cta, { backgroundColor: gold }]}
        accessibilityRole="button"
        accessibilityLabel={tx.retry}
      >
        <Ionicons name="refresh" size={17} color="#1a1208" />
        <Text style={s.ctaText}>{tx.retry}</Text>
      </TouchableOpacity>
    </View>
  );
}

const s = StyleSheet.create({
  wrap: { flex: 1, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 36 },
  iconWrap: { width: 96, height: 96, alignItems: 'center', justifyContent: 'center', marginBottom: 22 },
  ring: { position: 'absolute', width: 76, height: 76, borderRadius: 38, borderWidth: 1.5 },
  iconCircle: { width: 76, height: 76, borderRadius: 38, borderWidth: 1.5, alignItems: 'center', justifyContent: 'center' },
  title: { fontSize: 21, fontWeight: '800', letterSpacing: -0.3, fontFamily: SERIF, textAlign: 'center' },
  sub: { fontSize: 13.5, fontWeight: '500', textAlign: 'center', marginTop: 10, lineHeight: 20, opacity: 0.9, maxWidth: 300 },
  cta: { flexDirection: 'row', alignItems: 'center', gap: 8, paddingHorizontal: 26, paddingVertical: 13, borderRadius: 14, marginTop: 24 },
  ctaText: { color: '#1a1208', fontWeight: '900', fontSize: 15, letterSpacing: 0.2 },
});
