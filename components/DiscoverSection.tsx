// components/DiscoverSection.tsx
import { Image } from 'expo-image';
import { LinearGradient } from 'expo-linear-gradient';
import React, { useState } from 'react';
import {
  Dimensions,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';

import { useLanguage } from '../context/LanguageContext';
import { StoryModal } from './StoryModal';

const { width: W } = Dimensions.get('window');
const H_PADDING = 16;
const GAP = 10;
const CARD_W = (W - H_PADDING * 2 - GAP) / 2;
const FEATURED_H = W * 0.52;
const SMALL_H = CARD_W * 1.18;

interface DiscoverSectionProps {
  events: any[];
  theme: any;
  t: (key: string) => string;
}

const extractYear = (event: any): string => {
  const raw = event?.eventDate ?? event?.event_date ?? event?.year;
  if (!raw) return '';
  const s = String(raw).trim();
  if (/^\d{4}$/.test(s)) return s;
  const y = new Date(s).getFullYear();
  return isNaN(y) ? '' : String(y);
};

const FeaturedCard = ({ event, lang, theme, onPress }: { event: any; lang: string; theme: any; onPress: () => void }) => {
  const title = event.titleTranslations?.[lang] ?? event.titleTranslations?.en ?? '';
  const narrative = event.narrativeTranslations?.[lang] ?? event.narrativeTranslations?.en ?? '';
  const category = (event.category ?? 'HISTORY').toUpperCase();
  const year = extractYear(event);
  const imageUri = event.gallery?.[0];
  const impact = event.impactScore ?? 0;

  return (
    <TouchableOpacity activeOpacity={0.92} onPress={onPress} style={[styles.featuredCard, { height: FEATURED_H }]}>
      {imageUri
        ? <Image source={{ uri: imageUri }} style={StyleSheet.absoluteFill} contentFit="cover" transition={500} />
        : <View style={[StyleSheet.absoluteFill, { backgroundColor: theme.card }]} />
      }
      <LinearGradient colors={['rgba(0,0,0,0.0)', 'rgba(0,0,0,0.3)', 'rgba(0,0,0,0.82)']} locations={[0, 0.45, 1]} style={StyleSheet.absoluteFill} />
      <View style={styles.featuredTop}>
        <View style={styles.categoryPill}>
          <Text style={styles.categoryPillText}>{category}</Text>
        </View>
        {impact > 0 && (
          <View style={styles.impactPill}>
            <Text style={styles.impactPillText}>{impact}%</Text>
          </View>
        )}
      </View>
      <View style={styles.featuredBottom}>
        {year !== '' && <Text style={styles.featuredYear}>{year}</Text>}
        <Text style={styles.featuredTitle} numberOfLines={2}>{title}</Text>
        {narrative !== '' && <Text style={styles.featuredNarrative} numberOfLines={2}>{narrative}</Text>}
        <View style={styles.readMore}>
          <Text style={styles.readMoreText}>Read story</Text>
          <View style={styles.readMoreLine} />
        </View>
      </View>
    </TouchableOpacity>
  );
};

const SmallCard = ({ event, lang, theme, onPress }: { event: any; lang: string; theme: any; onPress: () => void }) => {
  const title = event.titleTranslations?.[lang] ?? event.titleTranslations?.en ?? '';
  const category = (event.category ?? 'HISTORY').toUpperCase();
  const year = extractYear(event);
  const imageUri = event.gallery?.[0];

  return (
    <TouchableOpacity activeOpacity={0.92} onPress={onPress} style={[styles.smallCard, { width: CARD_W, height: SMALL_H }]}>
      {imageUri
        ? <Image source={{ uri: imageUri }} style={StyleSheet.absoluteFill} contentFit="cover" transition={400} />
        : <View style={[StyleSheet.absoluteFill, { backgroundColor: theme.card }]} />
      }
      <LinearGradient colors={['transparent', 'rgba(0,0,0,0.78)']} locations={[0.3, 1]} style={StyleSheet.absoluteFill} />
      <View style={styles.smallContent}>
        <Text style={styles.smallCategory}>{category}</Text>
        <Text style={styles.smallTitle} numberOfLines={3}>{title}</Text>
        {year !== '' && <Text style={styles.smallYear}>{year}</Text>}
      </View>
    </TouchableOpacity>
  );
};

const SectionLabel = ({ label, theme }: { label: string; theme: any }) => (
  <View style={styles.sectionLabelRow}>
    <View style={[styles.sectionLabelDot, { backgroundColor: theme.gold }]} />
    <Text style={[styles.sectionLabelText, { color: theme.subtext }]}>{label.toUpperCase()}</Text>
  </View>
);

export const DiscoverSection = ({ events, theme, t }: DiscoverSectionProps) => {
  const { language } = useLanguage();
  const [selectedEvent, setSelectedEvent] = useState<any>(null);

  if (events.length === 0) {
    return (
      <View style={styles.empty}>
        <Text style={{ fontSize: 28, color: theme.gold, opacity: 0.45 }}>✦</Text>
        <Text style={{ fontSize: 16, fontWeight: '700', color: theme.text, marginTop: 10, letterSpacing: 0.3 }}>
          {t('only_one_today')}
        </Text>
      </View>
    );
  }

  const [featured, ...rest] = events;
  const rows: any[][] = [];
  for (let i = 0; i < rest.length; i += 2) rows.push(rest.slice(i, i + 2));

  return (
    <View style={{ flex: 1 }}>
      <ScrollView contentContainerStyle={styles.scroll} showsVerticalScrollIndicator={false} overScrollMode="never">
        <SectionLabel label={t('featured') || 'Featured'} theme={theme} />
        <FeaturedCard event={featured} lang={language} theme={theme} onPress={() => setSelectedEvent(featured)} />

        {rows.length > 0 && (
          <>
            <SectionLabel label={t('more_today') || 'More from today'} theme={theme} />
            {rows.map((row, ri) => (
              <View key={ri} style={styles.row}>
                {row.map((ev, ci) => (
                  <SmallCard key={ci} event={ev} lang={language} theme={theme} onPress={() => setSelectedEvent(ev)} />
                ))}
                {row.length === 1 && <View style={{ width: CARD_W }} />}
              </View>
            ))}
          </>
        )}
        <View style={{ height: 28 }} />
      </ScrollView>

      <StoryModal
        visible={!!selectedEvent}
        event={selectedEvent}
        onClose={() => setSelectedEvent(null)}
        theme={theme}
      />
    </View>
  );
};

const styles = StyleSheet.create({
  scroll: { paddingBottom: 8 },
  empty: { alignItems: 'center', justifyContent: 'center', paddingTop: 70, paddingHorizontal: 30, gap: 6 },
  sectionLabelRow: { flexDirection: 'row', alignItems: 'center', gap: 7, marginTop: 14, marginBottom: 10 },
  sectionLabelDot: { width: 4, height: 4, borderRadius: 2 },
  sectionLabelText: { fontSize: 9, fontWeight: '700', letterSpacing: 2.5 },
  featuredCard: { width: '100%', borderRadius: 20, overflow: 'hidden', backgroundColor: '#111', shadowColor: '#000', shadowOffset: { width: 0, height: 6 }, shadowOpacity: 0.28, shadowRadius: 16, elevation: 10 },
  featuredTop: { position: 'absolute', top: 14, left: 14, right: 14, flexDirection: 'row', alignItems: 'center', gap: 8 },
  categoryPill: { backgroundColor: 'rgba(0,0,0,0.55)', paddingHorizontal: 10, paddingVertical: 5, borderRadius: 20, borderWidth: StyleSheet.hairlineWidth, borderColor: 'rgba(255,215,0,0.35)' },
  categoryPillText: { color: '#ffd700', fontSize: 9, fontWeight: '800', letterSpacing: 2 },
  impactPill: { backgroundColor: 'rgba(255,215,0,0.18)', paddingHorizontal: 9, paddingVertical: 5, borderRadius: 20 },
  impactPillText: { color: '#ffd700', fontSize: 9, fontWeight: '700', letterSpacing: 1 },
  featuredBottom: { position: 'absolute', bottom: 0, left: 0, right: 0, padding: 16, paddingBottom: 18 },
  featuredYear: { color: 'rgba(255,255,255,0.45)', fontSize: 11, fontWeight: '700', letterSpacing: 2, marginBottom: 5 },
  featuredTitle: { color: '#fff', fontSize: 22, fontWeight: '800', lineHeight: 27, letterSpacing: 0.1 },
  featuredNarrative: { color: 'rgba(255,255,255,0.62)', fontSize: 12, lineHeight: 17, marginTop: 6, fontWeight: '400' },
  readMore: { flexDirection: 'row', alignItems: 'center', gap: 8, marginTop: 12 },
  readMoreText: { color: '#fff', fontSize: 10, fontWeight: '700', letterSpacing: 1.5 },
  readMoreLine: { flex: 1, height: StyleSheet.hairlineWidth, backgroundColor: 'rgba(255,255,255,0.3)' },
  row: { flexDirection: 'row', gap: GAP, marginBottom: GAP },
  smallCard: { borderRadius: 16, overflow: 'hidden', backgroundColor: '#111', shadowColor: '#000', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.22, shadowRadius: 10, elevation: 6 },
  smallContent: { position: 'absolute', bottom: 0, left: 0, right: 0, padding: 12, paddingBottom: 14 },
  smallCategory: { color: '#ffd700', fontSize: 8, fontWeight: '800', letterSpacing: 2, marginBottom: 5, opacity: 0.9 },
  smallTitle: { color: '#fff', fontSize: 13, fontWeight: '700', lineHeight: 17, letterSpacing: 0.1 },
  smallYear: { color: 'rgba(255,255,255,0.4)', fontSize: 9, fontWeight: '600', letterSpacing: 1, marginTop: 5 },
});