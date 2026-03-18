// components/ShareCard.tsx
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
  return new Date()
    .toLocaleDateString('en-US', { month: 'long', day: 'numeric' })
    .toUpperCase();
};

// ── Helpers ──────────────────────────────────────────────
const yearsAgo = (year: string): string => {
  if (!year) return '';
  const diff = new Date().getFullYear() - parseInt(year, 10);
  if (diff <= 0) return '';
  return `${diff} YEARS AGO`;
};

export const ShareCard = ({ event, language, cardRef }: ShareCardProps) => {
  if (!event) return null;

  const year = extractYear(event);
  const title =
    event.titleTranslations?.[language] ?? event.titleTranslations?.en ?? '';
  const narrative =
    event.narrativeTranslations?.[language] ??
    event.narrativeTranslations?.en ??
    '';
  const category = (event.category ?? 'HISTORY')
    .toUpperCase()
    .replace(/_/g, ' ');
  const impact = Math.round(event.impactScore ?? 0);
  const imageUri = event.gallery?.[0];
  const shortNarrative =
    narrative.length > 140 ? narrative.slice(0, 137) + '…' : narrative;
  const ago = yearsAgo(year);

  return (
    <View
      ref={cardRef}
      collapsable={false}
      style={s.card}
    >
      {/* ── BACKGROUND IMAGE ── */}
      {imageUri ? (
        <Image
          source={{ uri: imageUri }}
          style={StyleSheet.absoluteFillObject}
          contentFit="cover"
        />
      ) : (
        <View style={[StyleSheet.absoluteFillObject, { backgroundColor: '#080808' }]} />
      )}

      {/* ── CINEMATIC OVERLAY — deep bottom fade ── */}
      <LinearGradient
        colors={[
          'rgba(0,0,0,0.0)',
          'rgba(0,0,0,0.05)',
          'rgba(0,0,0,0.35)',
          'rgba(0,0,0,0.78)',
          'rgba(0,0,0,0.94)',
          'rgba(0,0,0,0.99)',
        ]}
        locations={[0, 0.15, 0.38, 0.6, 0.78, 1]}
        style={StyleSheet.absoluteFillObject}
      />

      {/* ── SIDE VIGNETTE ── */}
      <LinearGradient
        colors={['rgba(0,0,0,0.30)', 'transparent', 'rgba(0,0,0,0.30)']}
        start={{ x: 0, y: 0.5 }}
        end={{ x: 1, y: 0.5 }}
        style={StyleSheet.absoluteFillObject}
      />

      {/* ── TOP EDGE — warm amber bleed ── */}
      <LinearGradient
        colors={['rgba(255,180,50,0.06)', 'transparent']}
        locations={[0, 0.35]}
        style={StyleSheet.absoluteFillObject}
      />

      {/* ── CONTENT ── */}
      <View style={s.inner}>

        {/* ╭─── TOP BAR ───╮ */}
        <View style={s.topRow}>
          {/* Brand cluster */}
          <View style={s.brandRow}>
            <View style={s.logoOuter}>
              <View style={s.logoRing}>
                <View style={s.logoDot} />
              </View>
            </View>
            <View>
              <Text style={s.brandSub}>DAILY</Text>
              <Text style={s.brandMain}>HISTORY</Text>
            </View>
          </View>

          {/* Category pill */}
          <View style={s.categoryBadge}>
            <View style={s.categoryDot} />
            <Text style={s.categoryText}>{category}</Text>
          </View>
        </View>

        {/* ╭─── BOTTOM CONTENT ───╮ */}
        <View>

          {/* Years-ago tag */}
          {ago ? (
            <View style={s.agoRow}>
              <View style={s.agoLine} />
              <Text style={s.agoText}>{ago}</Text>
            </View>
          ) : null}

          {/* Year — big, bold, cinematic */}
          <View style={s.yearRow}>
            <Text style={s.year}>{year}</Text>
            <View style={s.yearAccent} />
          </View>

          {/* Title */}
          <Text style={s.title} numberOfLines={3}>
            {title}
          </Text>

          {/* Gold accent bar */}
          <View style={s.accentBarRow}>
            <View style={s.accentBar} />
            <View style={s.accentBarGlow} />
          </View>

          {/* Narrative */}
          <Text style={s.narrative} numberOfLines={4}>
            {shortNarrative}
          </Text>

          {/* Impact score — visual bar */}
          <View style={s.impactRow}>
            <View style={s.impactBarTrack}>
              <View style={[s.impactBarFill, { width: `${Math.min(impact, 100)}%` }]} />
            </View>
            <Text style={s.impactLabel}>
              IMPACT {impact}%
            </Text>
          </View>

          {/* Thin separator */}
          <View style={s.divider} />

          {/* Footer */}
          <View style={s.footer}>
            {/* Left — date */}
            <View>
              <Text style={s.footerLabel}>TODAY IN HISTORY</Text>
              <Text style={s.footerDate}>{formatDate()}</Text>
            </View>

            {/* Right — app CTA */}
            <View style={s.ctaBadge}>
              <View style={s.ctaIconWrap}>
                <View style={s.ctaIconDot} />
              </View>
              <Text style={s.ctaText}>dailyhistory.app</Text>
            </View>
          </View>
        </View>
      </View>
    </View>
  );
};

// ── PALETTE ──────────────────────────────────────────────
const GOLD = '#F5C518';               // rich IMDB-style gold
const GOLD_WARM = '#FFDA44';          // warm highlight
const GOLD_DIM = 'rgba(245,197,24,0.10)';
const GOLD_BORDER = 'rgba(245,197,24,0.28)';
const GOLD_GLOW = 'rgba(245,197,24,0.35)';

const WHITE_90 = 'rgba(255,255,255,0.92)';
const WHITE_70 = 'rgba(255,255,255,0.70)';
const WHITE_40 = 'rgba(255,255,255,0.40)';
const WHITE_15 = 'rgba(255,255,255,0.15)';
const WHITE_08 = 'rgba(255,255,255,0.08)';

// ── STYLES ───────────────────────────────────────────────
const s = StyleSheet.create({
  /* ── Card shell ── */
  card: {
    width: SHARE_CARD_WIDTH,
    height: SHARE_CARD_HEIGHT,
    borderRadius: 28,
    overflow: 'hidden',
    backgroundColor: '#080808',
  },
  inner: {
    flex: 1,
    padding: 26,
    justifyContent: 'space-between',
  },

  /* ── Top row ── */
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
  logoOuter: {
    width: 34,
    height: 34,
    borderRadius: 17,
    backgroundColor: GOLD,
    alignItems: 'center',
    justifyContent: 'center',
    // subtle warm shadow
    shadowColor: GOLD,
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.5,
    shadowRadius: 10,
    elevation: 8,
  },
  logoRing: {
    width: 22,
    height: 22,
    borderRadius: 11,
    backgroundColor: '#080808',
    alignItems: 'center',
    justifyContent: 'center',
  },
  logoDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: GOLD,
  },
  brandSub: {
    color: GOLD,
    fontSize: 7,
    fontWeight: '800',
    letterSpacing: 4,
  },
  brandMain: {
    color: '#fff',
    fontSize: 13,
    fontWeight: '900',
    letterSpacing: 3,
    marginTop: -1,
  },

  /* ── Category badge ── */
  categoryBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: GOLD_DIM,
    borderWidth: 1,
    borderColor: GOLD_BORDER,
    borderRadius: 20,
    paddingHorizontal: 12,
    paddingVertical: 5,
  },
  categoryDot: {
    width: 5,
    height: 5,
    borderRadius: 2.5,
    backgroundColor: GOLD,
  },
  categoryText: {
    color: GOLD,
    fontSize: 8,
    fontWeight: '800',
    letterSpacing: 2,
  },

  /* ── Years ago ── */
  agoRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 6,
  },
  agoLine: {
    width: 20,
    height: 1,
    backgroundColor: WHITE_40,
  },
  agoText: {
    color: WHITE_40,
    fontSize: 9,
    fontWeight: '700',
    letterSpacing: 3,
  },

  /* ── Year ── */
  yearRow: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    gap: 12,
    marginBottom: 10,
  },
  year: {
    color: GOLD,
    fontSize: 52,
    fontWeight: '900',
    letterSpacing: -2,
    lineHeight: 54,
    // dramatic text shadow
    textShadowColor: 'rgba(245,197,24,0.25)',
    textShadowOffset: { width: 0, height: 0 },
    textShadowRadius: 20,
  },
  yearAccent: {
    flex: 1,
    height: 1,
    backgroundColor: GOLD_BORDER,
    marginBottom: 12,
  },

  /* ── Title ── */
  title: {
    color: WHITE_90,
    fontSize: 27,
    fontWeight: '900',
    lineHeight: 33,
    letterSpacing: -0.5,
    textShadowColor: 'rgba(0,0,0,0.95)',
    textShadowOffset: { width: 0, height: 3 },
    textShadowRadius: 16,
    marginBottom: 12,
  },

  /* ── Accent bar ── */
  accentBarRow: {
    marginBottom: 12,
    height: 3,
  },
  accentBar: {
    width: 40,
    height: 3,
    borderRadius: 2,
    backgroundColor: GOLD,
  },
  accentBarGlow: {
    position: 'absolute',
    left: 0,
    top: -2,
    width: 40,
    height: 7,
    borderRadius: 4,
    backgroundColor: GOLD_GLOW,
    opacity: 0.5,
  },

  /* ── Narrative ── */
  narrative: {
    color: WHITE_70,
    fontSize: 13,
    lineHeight: 20,
    fontWeight: '400',
    marginBottom: 16,
  },

  /* ── Impact ── */
  impactRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    marginBottom: 16,
  },
  impactBarTrack: {
    flex: 1,
    height: 3,
    borderRadius: 2,
    backgroundColor: WHITE_08,
    overflow: 'hidden',
  },
  impactBarFill: {
    height: 3,
    borderRadius: 2,
    backgroundColor: GOLD,
  },
  impactLabel: {
    color: GOLD,
    fontSize: 9,
    fontWeight: '800',
    letterSpacing: 2,
  },

  /* ── Divider ── */
  divider: {
    height: StyleSheet.hairlineWidth,
    backgroundColor: WHITE_15,
    marginBottom: 16,
  },

  /* ── Footer ── */
  footer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  footerLabel: {
    color: WHITE_40,
    fontSize: 8,
    letterSpacing: 2,
    fontWeight: '600',
  },
  footerDate: {
    color: 'rgba(255,255,255,0.55)',
    fontSize: 11,
    fontWeight: '700',
    letterSpacing: 1,
    marginTop: 2,
  },

  /* ── CTA badge (app link) ── */
  ctaBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: GOLD_DIM,
    borderWidth: 1,
    borderColor: GOLD_BORDER,
    borderRadius: 10,
    paddingHorizontal: 14,
    paddingVertical: 8,
    // gold glow
    shadowColor: GOLD,
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.15,
    shadowRadius: 8,
    elevation: 4,
  },
  ctaIconWrap: {
    width: 16,
    height: 16,
    borderRadius: 8,
    backgroundColor: GOLD,
    alignItems: 'center',
    justifyContent: 'center',
  },
  ctaIconDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: '#080808',
  },
  ctaText: {
    color: GOLD_WARM,
    fontSize: 10,
    fontWeight: '800',
    letterSpacing: 1.5,
  },
});