// components/Sharecard.tsx
import { Image } from 'expo-image';
import { LinearGradient } from 'expo-linear-gradient';
import React from 'react';
import { Dimensions, StyleSheet, Text, View } from 'react-native';

const { width: W } = Dimensions.get('window');

// Card dimensions — 4:5 ratio, optimizat pentru Instagram feed + Stories
export const SHARE_CARD_WIDTH = W - 32;
export const SHARE_CARD_HEIGHT = SHARE_CARD_WIDTH * 1.25;

interface ShareCardProps {
  event: any;
  language: string;
  // REPARAT: Permitem null pentru a fi compatibil cu useRef(null) din parinte
  cardRef: React.RefObject<View | null>; 
}

const extractYear = (event: any): string => {
  const rawDate = event?.eventDate ?? event?.event_date ?? event?.year ?? '';
  const s = String(rawDate).trim();
  if (/^\d{4}$/.test(s)) return s;
  if (s.includes('-') && s.split('-')[0].length === 4) return s.split('-')[0];
  return '';
};

const formatDate = (): string => {
  return new Date().toLocaleDateString('en-US', { month: 'long', day: 'numeric' }).toUpperCase();
};

export const ShareCard = ({ event, language, cardRef }: ShareCardProps) => {
  if (!event) return null;

  const year       = extractYear(event);
  const title      = event.titleTranslations?.[language] ?? event.titleTranslations?.en ?? '';
  const narrative  = event.narrativeTranslations?.[language] ?? event.narrativeTranslations?.en ?? '';
  const category   = (event.category ?? 'HISTORY').toUpperCase().replace(/_/g, ' ');
  const impact     = Math.round(event.impactScore ?? 0);
  const imageUri   = event.gallery?.[0];
  const shortNarrative = narrative.length > 160 ? narrative.slice(0, 157) + '...' : narrative;

  return (
    <View
      ref={cardRef}
      collapsable={false} // CRITIC: Previne optimizarea UI-ului pe Android pentru captura foto
      style={s.card}
    >
      {/* Background image */}
      {imageUri ? (
        <Image
          source={{ uri: imageUri }}
          style={StyleSheet.absoluteFillObject}
          contentFit="cover"
        />
      ) : (
        <View style={[StyleSheet.absoluteFillObject, { backgroundColor: '#0d0d0d' }]} />
      )}

      {/* Cinematic gradient overlay — 4 stops */}
      <LinearGradient
        colors={[
          'rgba(0,0,0,0.08)',
          'rgba(0,0,0,0.25)',
          'rgba(0,0,0,0.82)',
          'rgba(0,0,0,0.97)',
        ]}
        locations={[0, 0.3, 0.65, 1]}
        style={StyleSheet.absoluteFillObject}
      />

      {/* Subtle vignette on sides */}
      <LinearGradient
        colors={['rgba(0,0,0,0.35)', 'transparent', 'rgba(0,0,0,0.35)']}
        start={{ x: 0, y: 0.5 }}
        end={{ x: 1, y: 0.5 }}
        style={StyleSheet.absoluteFillObject}
      />

      {/* ── CONTENT ── */}
      <View style={s.inner}>

        {/* TOP — branding + category */}
        <View style={s.topRow}>
          <View style={s.brandRow}>
            <View style={s.logoCircle}>
              <View style={s.logoInner} />
            </View>
            <View>
              <Text style={s.brandSub}>DAILY</Text>
              <Text style={s.brandMain}>HISTORY</Text>
            </View>
          </View>
          <View style={s.categoryBadge}>
            <Text style={s.categoryText}>{category}</Text>
          </View>
        </View>

        {/* BOTTOM — event content */}
        <View>
          {/* Year with decorative lines */}
          <View style={s.yearRow}>
            <View style={s.yearLineLeft} />
            <Text style={s.year}>{year}</Text>
            <View style={s.yearLineRight} />
          </View>

          {/* Title */}
          <Text style={s.title} numberOfLines={3}>{title}</Text>

          {/* Gold accent bar */}
          <View style={s.accentBar} />

          {/* Narrative */}
          <Text style={s.narrative} numberOfLines={4}>{shortNarrative}</Text>

          {/* Impact score */}
          <View style={s.impactRow}>
            <View style={s.impactDot} />
            <Text style={s.impactText}>IMPACT SCORE {impact}%</Text>
          </View>

          {/* Divider */}
          <View style={s.divider} />

          {/* Footer — date + app link */}
          <View style={s.footer}>
            <View>
              <Text style={s.footerLabel}>TODAY IN HISTORY</Text>
              <Text style={s.footerDate}>{formatDate()}</Text>
            </View>
            <View style={s.appLinkBadge}>
              <Text style={s.appLinkText}>dailyhistory.app</Text>
            </View>
          </View>
        </View>

      </View>
    </View>
  );
};

const GOLD = '#ffd700';
const GOLD_DIM = 'rgba(255,215,0,0.15)';
const GOLD_BORDER = 'rgba(255,215,0,0.35)';
const WHITE_DIM = 'rgba(255,255,255,0.7)';
const WHITE_FAINT = 'rgba(255,255,255,0.12)';
const WHITE_HINT = 'rgba(255,255,255,0.35)';

const s = StyleSheet.create({
  card: {
    width: SHARE_CARD_WIDTH,
    height: SHARE_CARD_HEIGHT,
    borderRadius: 24,
    overflow: 'hidden',
    backgroundColor: '#0d0d0d',
  },
  inner: {
    flex: 1,
    padding: 28,
    justifyContent: 'space-between',
  },
  topRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
  },
  brandRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  logoCircle: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: GOLD,
    alignItems: 'center',
    justifyContent: 'center',
  },
  logoInner: {
    width: 13,
    height: 13,
    borderRadius: 6.5,
    backgroundColor: '#000',
  },
  brandSub: {
    color: GOLD,
    fontSize: 7,
    fontWeight: '800',
    letterSpacing: 4,
  },
  brandMain: {
    color: '#fff',
    fontSize: 12,
    fontWeight: '900',
    letterSpacing: 2,
    marginTop: -1,
  },
  categoryBadge: {
    backgroundColor: GOLD_DIM,
    borderWidth: 1,
    borderColor: GOLD_BORDER,
    borderRadius: 20,
    paddingHorizontal: 12,
    paddingVertical: 5,
  },
  categoryText: {
    color: GOLD,
    fontSize: 8,
    fontWeight: '800',
    letterSpacing: 2,
  },
  yearRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    marginBottom: 14,
  },
  yearLineLeft: {
    width: 28,
    height: 1,
    backgroundColor: GOLD,
    opacity: 0.6,
  },
  year: {
    color: GOLD,
    fontSize: 44,
    fontWeight: '900',
    letterSpacing: -1,
    lineHeight: 48,
  },
  yearLineRight: {
    flex: 1,
    height: 1,
    backgroundColor: GOLD_BORDER,
  },
  title: {
    color: '#fff',
    fontSize: 26,
    fontWeight: '900',
    lineHeight: 31,
    letterSpacing: -0.4,
    textShadowColor: 'rgba(0,0,0,0.9)',
    textShadowOffset: { width: 0, height: 2 },
    textShadowRadius: 12,
    marginBottom: 14,
  },
  accentBar: {
    width: 36,
    height: 2.5,
    backgroundColor: GOLD,
    borderRadius: 2,
    marginBottom: 14,
  },
  narrative: {
    color: WHITE_DIM,
    fontSize: 12.5,
    lineHeight: 19,
    fontWeight: '400',
    marginBottom: 18,
  },
  impactRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 7,
    marginBottom: 18,
  },
  impactDot: {
    width: 7,
    height: 7,
    borderRadius: 3.5,
    backgroundColor: GOLD,
  },
  impactText: {
    color: GOLD,
    fontSize: 10,
    fontWeight: '800',
    letterSpacing: 1.5,
  },
  divider: {
    height: 1,
    backgroundColor: WHITE_FAINT,
    marginBottom: 18,
  },
  footer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  footerLabel: {
    color: WHITE_HINT,
    fontSize: 8,
    letterSpacing: 2,
    fontWeight: '600',
  },
  footerDate: {
    color: 'rgba(255,255,255,0.55)',
    fontSize: 10,
    fontWeight: '700',
    letterSpacing: 1,
    marginTop: 2,
  },
  appLinkBadge: {
    backgroundColor: GOLD_DIM,
    borderWidth: 1,
    borderColor: GOLD_BORDER,
    borderRadius: 8,
    paddingHorizontal: 14,
    paddingVertical: 8,
  },
  appLinkText: {
    color: GOLD,
    fontSize: 9,
    fontWeight: '800',
    letterSpacing: 1.5,
  },
});