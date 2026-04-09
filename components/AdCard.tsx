// components/AdCard.tsx
import React, { useState } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { BannerAd, BannerAdSize } from 'react-native-google-mobile-ads';
import { AD_UNIT_IDS } from '../config/ads';
import { useLanguage } from '../context/LanguageContext';
import { useTheme } from '../context/ThemeContext';

const T: Record<string, string> = {
  en: 'Sponsored',
  ro: 'Sponsorizat',
  fr: 'Sponsorisé',
  de: 'Gesponsert',
  es: 'Patrocinado',
};

export default function AdCard() {
  const { theme, isDark } = useTheme();
  const { language } = useLanguage();
  const [loaded, setLoaded] = useState(false);
  const [error, setError] = useState(false);

  if (error) return null;

  return (
    <View style={[styles.card, { shadowColor: isDark ? '#000' : '#444' }]}>
      <View style={[styles.inner, { backgroundColor: isDark ? '#0D0B09' : '#F8F6F2' }]}>
        {/* Top label */}
        <View style={styles.labelRow}>
          <View style={styles.labelBadge}>
            <Text style={styles.labelText}>{T[language] ?? T.en}</Text>
          </View>
        </View>

        {/* Ad container — centered */}
        <View style={[styles.adWrap, !loaded && styles.adLoading]}>
          <BannerAd
            unitId={AD_UNIT_IDS.BANNER}
            size={BannerAdSize.MEDIUM_RECTANGLE}
            requestOptions={{ requestNonPersonalizedAdsOnly: true }}
            onAdLoaded={() => setLoaded(true)}
            onAdFailedToLoad={() => setError(true)}
          />
        </View>

        {/* Bottom accent */}
        <View style={styles.bottomRow}>
          <View style={styles.accentDot} />
          <Text style={[styles.brandText, { color: theme.subtext }]}>Daily History</Text>
          <View style={styles.accentDot} />
        </View>
      </View>
    </View>
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
    borderColor: 'rgba(255,255,255,0.08)',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 24,
    paddingHorizontal: 16,
  },
  labelRow: {
    width: '100%',
    flexDirection: 'row',
    justifyContent: 'flex-start',
  },
  labelBadge: {
    backgroundColor: 'rgba(255,215,0,0.15)',
    paddingHorizontal: 12,
    paddingVertical: 5,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: 'rgba(255,215,0,0.3)',
  },
  labelText: {
    color: '#ffd700',
    fontWeight: '800',
    fontSize: 9,
    letterSpacing: 2,
    textTransform: 'uppercase',
  },
  adWrap: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    width: '100%',
    borderRadius: 16,
    overflow: 'hidden',
  },
  adLoading: {
    opacity: 0,
  },
  bottomRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  accentDot: {
    width: 4,
    height: 4,
    borderRadius: 2,
    backgroundColor: 'rgba(255,215,0,0.5)',
  },
  brandText: {
    fontSize: 9,
    fontWeight: '800',
    letterSpacing: 2.5,
    opacity: 0.45,
    textTransform: 'uppercase',
  },
});