// app/(main)/saved.tsx
import { Image } from 'expo-image';
import { LinearGradient } from 'expo-linear-gradient';
import { Trash2 } from 'lucide-react-native';
import React, { useState } from 'react';
import {
    Dimensions,
    ScrollView,
    StyleSheet,
    Text,
    TouchableOpacity,
    View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { StoryModal } from '../../components/StoryModal';
import { useLanguage } from '../../context/LanguageContext';
import { useTheme } from '../../context/ThemeContext';
import { useSavedStore } from '../../store/useSavedStore';

const { width: W } = Dimensions.get('window');
const CARD_H = 140;

const extractYear = (event: any): string => {
  const raw = event?.eventDate ?? event?.event_date ?? event?.year ?? '';
  const s = String(raw).trim();
  if (/^\d{4}$/.test(s)) return s;
  if (s.includes('-') && s.split('-')[0].length === 4) return s.split('-')[0];
  return '';
};

export default function SavedScreen() {
  const { theme, isDark } = useTheme();
  const { language, t } = useLanguage();
  const { savedEvents, removeEvent } = useSavedStore();
  const insets = useSafeAreaInsets();
  const [selectedEvent, setSelectedEvent] = useState<any>(null);

  const s = makeStyles(theme);

  return (
    <View style={[s.root, { paddingTop: insets.top }]}>
      {/* ── HEADER ── */}
      <View style={s.header}>
        <Text style={s.headerTitle}>✦ {t('saved') || 'Saved'}</Text>
        <Text style={[s.headerCount, { color: theme.subtext }]}>
          {savedEvents.length} {savedEvents.length === 1 ? 'event' : 'events'}
        </Text>
      </View>

      <View style={[s.divider, { backgroundColor: theme.border }]} />

      {savedEvents.length === 0 ? (
        // ── EMPTY STATE ──
        <View style={s.empty}>
          <Text style={[s.emptyIcon, { color: theme.gold }]}>◌</Text>
          <Text style={[s.emptyTitle, { color: theme.text }]}>
            {t('nothing_saved') || 'Nothing saved yet'}
          </Text>
          <Text style={[s.emptyDesc, { color: theme.subtext }]}>
            {t('save_hint') || 'Tap the bookmark icon in any story to save it here.'}
          </Text>
        </View>
      ) : (
        <ScrollView
          contentContainerStyle={s.list}
          showsVerticalScrollIndicator={false}
        >
          {savedEvents.map((event) => {
            const title = event.titleTranslations?.[language] ?? event.titleTranslations?.en ?? '';
            const narrative = event.narrativeTranslations?.[language] ?? event.narrativeTranslations?.en ?? '';
            const year = extractYear(event);
            const category = (event.category ?? 'HISTORY').toUpperCase();
            const imageUri = event.gallery?.[0];

            return (
              <TouchableOpacity
                key={event.id}
                activeOpacity={0.88}
                onPress={() => setSelectedEvent(event)}
                style={[s.card, { backgroundColor: theme.card }]}
              >
                {/* Image */}
                <View style={s.cardImageWrap}>
                  {imageUri ? (
                    <Image
                      source={{ uri: imageUri }}
                      style={StyleSheet.absoluteFill}
                      contentFit="cover"
                      transition={400}
                    />
                  ) : (
                    <View style={[StyleSheet.absoluteFill, { backgroundColor: '#111' }]} />
                  )}
                  <LinearGradient
                    colors={['transparent', 'rgba(0,0,0,0.55)']}
                    style={StyleSheet.absoluteFill}
                  />
                  <View style={s.cardImageLabel}>
                    <Text style={s.cardCategory}>{category}</Text>
                  </View>
                </View>

                {/* Content */}
                <View style={s.cardContent}>
                  {year !== '' && (
                    <Text style={[s.cardYear, { color: theme.gold }]}>{year}</Text>
                  )}
                  <Text style={[s.cardTitle, { color: theme.text }]} numberOfLines={2}>
                    {title}
                  </Text>
                  <Text style={[s.cardNarrative, { color: theme.subtext }]} numberOfLines={2}>
                    {narrative}
                  </Text>
                </View>

                {/* Delete button */}
                <TouchableOpacity
                  onPress={() => removeEvent(event.id)}
                  style={s.deleteBtn}
                  hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
                >
                  <Trash2 size={16} color={theme.subtext} strokeWidth={2} />
                </TouchableOpacity>
              </TouchableOpacity>
            );
          })}

          <View style={{ height: insets.bottom + 20 }} />
        </ScrollView>
      )}

      <StoryModal
        visible={!!selectedEvent}
        event={selectedEvent}
        onClose={() => setSelectedEvent(null)}
        theme={theme}
      />
    </View>
  );
}

const makeStyles = (theme: any) => StyleSheet.create({
  root: { flex: 1, backgroundColor: theme.background },

  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingVertical: 16,
  },
  headerTitle: {
    fontSize: 20, fontWeight: '900',
    letterSpacing: 0.5, color: theme.text,
  },
  headerCount: { fontSize: 12, fontWeight: '600', letterSpacing: 0.5 },
  divider: { height: StyleSheet.hairlineWidth, marginBottom: 12 },

  empty: {
    flex: 1, alignItems: 'center', justifyContent: 'center',
    paddingHorizontal: 36, gap: 10,
  },
  emptyIcon: { fontSize: 36, opacity: 0.45, marginBottom: 6 },
  emptyTitle: { fontSize: 19, fontWeight: '800', letterSpacing: 0.3 },
  emptyDesc: { fontSize: 13, textAlign: 'center', lineHeight: 20 },

  list: { paddingHorizontal: 16, paddingTop: 4, gap: 12 },

  card: {
    flexDirection: 'row',
    borderRadius: 18,
    overflow: 'hidden',
    height: CARD_H,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.15,
    shadowRadius: 8,
    elevation: 4,
  },

  cardImageWrap: {
    width: 110,
    height: CARD_H,
  },
  cardImageLabel: {
    position: 'absolute',
    bottom: 8, left: 8,
  },
  cardCategory: {
    color: '#ffd700', fontSize: 7,
    fontWeight: '800', letterSpacing: 1.5,
  },

  cardContent: {
    flex: 1,
    paddingHorizontal: 14,
    paddingVertical: 14,
    justifyContent: 'center',
    gap: 4,
  },
  cardYear: {
    fontSize: 10, fontWeight: '800', letterSpacing: 2,
  },
  cardTitle: {
    fontSize: 15, fontWeight: '800', lineHeight: 20,
  },
  cardNarrative: {
    fontSize: 11, lineHeight: 16, marginTop: 2,
  },

  deleteBtn: {
    paddingHorizontal: 14,
    alignItems: 'center',
    justifyContent: 'center',
  },
});