// components/ShareCard.tsx
import { Image } from 'expo-image';
import { LinearGradient } from 'expo-linear-gradient';
import React from 'react';
import { Dimensions, Platform, StyleSheet, Text, View } from 'react-native';

const { width: W } = Dimensions.get('window');
const SERIF = Platform.OS === 'ios' ? 'Georgia' : 'serif';

// Card dimensions — 4:5 ratio for Instagram
export const SHARE_CARD_WIDTH = W - 32;
export const SHARE_CARD_HEIGHT = SHARE_CARD_WIDTH * 1.25;

interface ShareCardProps {
  event: any;
  language: string;
  cardRef: React.RefObject<View | null>;
  imageIndex?: number;
}

const extractYear = (event: any): string => {
  const rawDate = event?.eventDate ?? event?.event_date ?? event?.year ?? '';
  const s = String(rawDate).trim();
  if (/^\d{4}$/.test(s)) return s;
  if (s.includes('-') && s.split('-')[0].length === 4) return s.split('-')[0];
  return '';
};

const yearsAgo = (year: string): string => {
  if (!year) return '';
  const diff = new Date().getFullYear() - parseInt(year, 10);
  if (diff <= 0) return '';
  return `${diff} years ago`;
};

const formatDate = (): string => {
  return new Date().toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' });
};

export const ShareCard = ({ event, language, cardRef, imageIndex = 0 }: ShareCardProps) => {
  if (!event) return null;

  const year = extractYear(event);
  const title = event.titleTranslations?.[language] ?? event.titleTranslations?.en ?? '';
  const category = (event.category ?? 'HISTORY').replace(/_/g, ' ').toUpperCase();
  const gallery: string[] = event.gallery ?? [];
  const imageUri = gallery[imageIndex] ?? gallery[0];
  const ago = yearsAgo(year);

  return (
    <View ref={cardRef} collapsable={false} style={s.card}>
      {/* ── Full bleed image ── */}
      {imageUri ? (
        <Image source={{ uri: imageUri }} style={StyleSheet.absoluteFillObject} contentFit="cover" />
      ) : (
        <View style={[StyleSheet.absoluteFillObject, { backgroundColor: '#111' }]} />
      )}

      {/* ── Bottom gradient — clean, not heavy ── */}
      <LinearGradient
        colors={['transparent', 'rgba(0,0,0,0.03)', 'rgba(0,0,0,0.45)', 'rgba(0,0,0,0.88)']}
        locations={[0, 0.4, 0.65, 1]}
        style={StyleSheet.absoluteFillObject}
      />

      {/* ── Content ── */}
      <View style={s.inner}>
        {/* Top — brand pill */}
        <View style={s.topRow}>
          <View style={s.brandPill}>
            <View style={s.brandDot} />
            <Text style={s.brandText}>Daily History</Text>
          </View>
        </View>

        {/* Bottom — all text content */}
        <View style={s.bottom}>
          {/* Category + year row */}
          <View style={s.metaRow}>
            <Text style={s.category}>{category}</Text>
            <View style={s.metaDot} />
            <Text style={s.yearSmall}>{year}</Text>
            {ago !== '' && (
              <>
                <View style={s.metaDot} />
                <Text style={s.ago}>{ago}</Text>
              </>
            )}
          </View>

          {/* Title — the hook, big and clean */}
          <Text style={s.title} numberOfLines={3}>{title}</Text>

          {/* Thin gold line */}
          <View style={s.accentLine} />

          {/* Footer row */}
          <View style={s.footerRow}>
            <Text style={s.date}>{formatDate()}</Text>
            <View style={s.appBadge}>
              <Text style={s.appText}>dailyhistory.app</Text>
            </View>
          </View>
        </View>
      </View>
    </View>
  );
};

const s = StyleSheet.create({
  card: {
    width: SHARE_CARD_WIDTH,
    height: SHARE_CARD_HEIGHT,
    borderRadius: 20,
    overflow: 'hidden',
    backgroundColor: '#111',
  },
  inner: {
    flex: 1,
    justifyContent: 'space-between',
    padding: 22,
  },

  // ── Top ──
  topRow: {
    flexDirection: 'row',
    justifyContent: 'flex-start',
  },
  brandPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 7,
    backgroundColor: 'rgba(0,0,0,0.45)',
    backdropFilter: 'blur(10)',
    paddingHorizontal: 14,
    paddingVertical: 7,
    borderRadius: 20,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: 'rgba(255,255,255,0.12)',
  },
  brandDot: {
    width: 7,
    height: 7,
    borderRadius: 3.5,
    backgroundColor: '#E8B84D',
  },
  brandText: {
    color: 'rgba(255,255,255,0.85)',
    fontSize: 12,
    fontWeight: '600',
    letterSpacing: 0.8,
  },

  // ── Bottom ──
  bottom: {
    gap: 10,
  },
  metaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  category: {
    color: '#E8B84D',
    fontSize: 10,
    fontWeight: '700',
    letterSpacing: 1.8,
  },
  metaDot: {
    width: 3,
    height: 3,
    borderRadius: 1.5,
    backgroundColor: 'rgba(255,255,255,0.3)',
  },
  yearSmall: {
    color: 'rgba(255,255,255,0.6)',
    fontSize: 10,
    fontWeight: '700',
    letterSpacing: 1,
  },
  ago: {
    color: 'rgba(255,255,255,0.4)',
    fontSize: 10,
    fontWeight: '500',
    letterSpacing: 0.5,
  },
  title: {
    color: '#fff',
    fontSize: 26,
    fontWeight: '800',
    lineHeight: 32,
    letterSpacing: -0.3,
    fontFamily: SERIF,
  },
  accentLine: {
    width: 32,
    height: 2.5,
    borderRadius: 2,
    backgroundColor: '#E8B84D',
  },
  footerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginTop: 2,
  },
  date: {
    color: 'rgba(255,255,255,0.35)',
    fontSize: 11,
    fontWeight: '500',
    letterSpacing: 0.3,
  },
  appBadge: {
    backgroundColor: 'rgba(232,184,77,0.12)',
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: 'rgba(232,184,77,0.3)',
    paddingHorizontal: 12,
    paddingVertical: 5,
    borderRadius: 8,
  },
  appText: {
    color: '#E8B84D',
    fontSize: 10,
    fontWeight: '700',
    letterSpacing: 0.8,
  },
});