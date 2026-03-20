// components/DiscoverSection.tsx
import { Image } from 'expo-image';
import { LinearGradient } from 'expo-linear-gradient';
import { useState } from 'react';
import {
  Dimensions,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';

import { useLanguage } from '../context/LanguageContext';
import { StoryModal } from './StoryModal';

const { width: W, height: H } = Dimensions.get('window');
const H_PAD = 0; // parent already has paddingHorizontal
const GAP = 8;

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

// ── Featured Card (top, takes ~45% of space) ──
const FeaturedCard = ({ event, lang, theme, onPress, height }: { event: any; lang: string; theme: any; onPress: () => void; height: number }) => {
  const title = event.titleTranslations?.[lang] ?? event.titleTranslations?.en ?? '';
  const narrative = event.narrativeTranslations?.[lang] ?? event.narrativeTranslations?.en ?? '';
  const category = (event.category ?? 'HISTORY').replace(/_/g, ' ').toUpperCase();
  const year = extractYear(event);
  const img = event.gallery?.[0];

  return (
    <TouchableOpacity activeOpacity={0.92} onPress={onPress} style={[s.featured, { height }]}>
      {img ? <Image source={{ uri: img }} style={StyleSheet.absoluteFill} contentFit="cover" transition={500} />
        : <View style={[StyleSheet.absoluteFill, { backgroundColor: theme.card }]} />}
      <LinearGradient colors={['rgba(0,0,0,0)', 'rgba(0,0,0,0.25)', 'rgba(0,0,0,0.85)']} locations={[0, 0.4, 1]} style={StyleSheet.absoluteFill} />
      <View style={s.featTop}>
        <View style={s.pill}><Text style={s.pillT}>{category}</Text></View>
      </View>
      <View style={s.featBot}>
        {year !== '' && <Text style={s.featYear}>{year}</Text>}
        <Text style={s.featTitle} numberOfLines={2}>{title}</Text>
        {narrative !== '' && <Text style={s.featNarr} numberOfLines={1}>{narrative}</Text>}
      </View>
    </TouchableOpacity>
  );
};

// ── Small Card (grid items) ──
const SmallCard = ({ event, lang, theme, onPress, width, height }: { event: any; lang: string; theme: any; onPress: () => void; width: number; height: number }) => {
  const title = event.titleTranslations?.[lang] ?? event.titleTranslations?.en ?? '';
  const category = (event.category ?? 'HISTORY').replace(/_/g, ' ').toUpperCase();
  const year = extractYear(event);
  const img = event.gallery?.[0];

  return (
    <TouchableOpacity activeOpacity={0.92} onPress={onPress} style={[s.small, { width, height }]}>
      {img ? <Image source={{ uri: img }} style={StyleSheet.absoluteFill} contentFit="cover" transition={400} />
        : <View style={[StyleSheet.absoluteFill, { backgroundColor: theme.card }]} />}
      <LinearGradient colors={['transparent', 'rgba(0,0,0,0.8)']} locations={[0.25, 1]} style={StyleSheet.absoluteFill} />
      <View style={s.smallContent}>
        <Text style={s.smallCat}>{category}</Text>
        <Text style={s.smallTitle} numberOfLines={2}>{title}</Text>
        {year !== '' && <Text style={s.smallYear}>{year}</Text>}
      </View>
    </TouchableOpacity>
  );
};

// ── Section Label ──
const Label = ({ label, theme }: { label: string; theme: any }) => (
  <View style={s.labelRow}>
    <View style={[s.labelDot, { backgroundColor: theme.gold }]} />
    <Text style={[s.labelText, { color: theme.subtext }]}>{label.toUpperCase()}</Text>
  </View>
);

export const DiscoverSection = ({ events, theme, t }: DiscoverSectionProps) => {
  const { language } = useLanguage();
  const [selected, setSelected] = useState<any>(null);

  if (events.length === 0) {
    return (
      <View style={s.empty}>
        <Text style={{ fontSize: 28, color: theme.gold, opacity: 0.45 }}>✦</Text>
        <Text style={{ fontSize: 16, fontWeight: '700', color: theme.text, marginTop: 10, letterSpacing: 0.3 }}>
          {t('only_one_today')}
        </Text>
      </View>
    );
  }

  const [featured, ...rest] = events;
  // Calculate sizes to fill the screen without scrolling
  const availH = H * 0.72; // approximate available height after chrome
  const featuredH = rest.length > 0 ? availH * 0.48 : availH * 0.85;
  const gridH = availH - featuredH - 50; // 50 for labels + gaps
  const cardW = (W - 32 - GAP) / 2; // 32 = parent padding
  const rows = [];
  for (let i = 0; i < rest.length; i += 2) rows.push(rest.slice(i, i + 2));
  const rowH = rows.length > 0 ? Math.min((gridH - (rows.length - 1) * GAP) / rows.length, cardW * 1.15) : 0;

  return (
    <View style={{ flex: 1 }}>
      <Label label={t('featured')} theme={theme} />
      <FeaturedCard event={featured} lang={language} theme={theme} onPress={() => setSelected(featured)} height={featuredH} />

      {rows.length > 0 && (
        <>
          <Label label={t('more_today')} theme={theme} />
          {rows.map((row, ri) => (
            <View key={ri} style={[s.row, { marginBottom: ri < rows.length - 1 ? GAP : 0 }]}>
              {row.map((ev, ci) => (
                <SmallCard key={ci} event={ev} lang={language} theme={theme} onPress={() => setSelected(ev)} width={cardW} height={rowH} />
              ))}
              {row.length === 1 && <View style={{ width: cardW }} />}
            </View>
          ))}
        </>
      )}

      <StoryModal visible={!!selected} event={selected} onClose={() => setSelected(null)} theme={theme} />
    </View>
  );
};

const s = StyleSheet.create({
  empty: { alignItems: 'center', justifyContent: 'center', paddingTop: 70, paddingHorizontal: 30, gap: 6 },
  labelRow: { flexDirection: 'row', alignItems: 'center', gap: 7, marginTop: 12, marginBottom: 8 },
  labelDot: { width: 4, height: 4, borderRadius: 2 },
  labelText: { fontSize: 9, fontWeight: '700', letterSpacing: 2.5 },
  featured: { width: '100%', borderRadius: 20, overflow: 'hidden', backgroundColor: '#111' },
  featTop: { position: 'absolute', top: 12, left: 12, right: 12, flexDirection: 'row' },
  pill: { backgroundColor: 'rgba(0,0,0,0.55)', paddingHorizontal: 9, paddingVertical: 4, borderRadius: 16, borderWidth: StyleSheet.hairlineWidth, borderColor: 'rgba(255,215,0,0.35)' },
  pillT: { color: '#ffd700', fontSize: 8, fontWeight: '800', letterSpacing: 2 },
  featBot: { position: 'absolute', bottom: 0, left: 0, right: 0, padding: 14, paddingBottom: 16 },
  featYear: { color: 'rgba(255,255,255,0.4)', fontSize: 10, fontWeight: '700', letterSpacing: 2, marginBottom: 4 },
  featTitle: { color: '#fff', fontSize: 20, fontWeight: '800', lineHeight: 25, letterSpacing: 0.1 },
  featNarr: { color: 'rgba(255,255,255,0.55)', fontSize: 11, lineHeight: 15, marginTop: 4 },
  row: { flexDirection: 'row', gap: GAP },
  small: { borderRadius: 14, overflow: 'hidden', backgroundColor: '#111' },
  smallContent: { position: 'absolute', bottom: 0, left: 0, right: 0, padding: 10, paddingBottom: 12 },
  smallCat: { color: '#ffd700', fontSize: 7, fontWeight: '800', letterSpacing: 2, marginBottom: 4, opacity: 0.85 },
  smallTitle: { color: '#fff', fontSize: 12, fontWeight: '700', lineHeight: 16 },
  smallYear: { color: 'rgba(255,255,255,0.35)', fontSize: 8, fontWeight: '600', letterSpacing: 1, marginTop: 3 },
});