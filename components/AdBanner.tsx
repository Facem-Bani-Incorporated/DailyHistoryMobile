// components/AdBanner.tsx
import React, { useState } from 'react';
import { StyleSheet, View } from 'react-native';
import { BannerAd, BannerAdSize } from 'react-native-google-mobile-ads';
import { AD_UNIT_IDS } from '../config/ads';

interface AdBannerProps {
  size?: BannerAdSize;
  style?: any;
}

export default function AdBanner({ size = BannerAdSize.ANCHORED_ADAPTIVE_BANNER, style }: AdBannerProps) {
  const [loaded, setLoaded] = useState(false);
  const [error, setError] = useState(false);

  if (error) return null;

  return (
    <View style={[styles.container, !loaded && styles.hidden, style]}>
      <BannerAd
        unitId={AD_UNIT_IDS.BANNER}
        size={size}
        requestOptions={{
          requestNonPersonalizedAdsOnly: true,
        }}
        onAdLoaded={() => {
          setLoaded(true);
          console.log('[Ads] Banner loaded');
        }}
        onAdFailedToLoad={(err) => {
          setError(true);
          console.warn('[Ads] Banner failed:', err);
        }}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    alignItems: 'center',
    width: '100%',
  },
  hidden: {
    opacity: 0,
    height: 0,
  },
});