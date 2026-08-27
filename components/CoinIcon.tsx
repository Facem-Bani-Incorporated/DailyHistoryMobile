// components/CoinIcon.tsx — the one coin glyph for the whole app.
//
// Every coin surface renders this, so the currency looks the same in the header
// pill, the unlock CTAs, the reward pop-up and the map. Sourced from
// assets/coin.png: a circular alpha cut of the original photo (the .jpg it came
// from had a transparency checkerboard baked into its pixels).
//
// The coin economy is retired (see config/coins.ts). Rather than tear the glyph out of
// fifteen call sites across Discover, the map, the recap and the friends sheet, it
// renders nothing while COINS_ENABLED is false. One switch, no layout surgery, and
// trivially reversible — the surrounding rows all lay out with flex `gap`, so a
// missing icon closes up cleanly instead of leaving a hole.
import { Image } from 'expo-image';
import React from 'react';
import { StyleProp, ImageStyle } from 'react-native';
import { COINS_ENABLED } from '../config/coins';

const SRC = require('../assets/coin.png');

/**
 * `size` is the rendered edge in points. The asset is 128px, so it stays crisp
 * up to ~42pt at @3x — past that it will soften.
 */
export default function CoinIcon({
  size = 14,
  style,
}: {
  size?: number;
  style?: StyleProp<ImageStyle>;
}) {
  if (!COINS_ENABLED) return null;
  return (
    <Image
      source={SRC}
      style={[{ width: size, height: size }, style]}
      contentFit="contain"
      // A tiny gold disc — nothing to announce, and it always sits next to its count.
      accessible={false}
    />
  );
}
