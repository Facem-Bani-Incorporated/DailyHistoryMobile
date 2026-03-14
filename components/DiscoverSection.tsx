import { Image } from 'expo-image';
import { LinearGradient } from 'expo-linear-gradient';
import React, { useState } from 'react';
import { Dimensions, ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { useLanguage } from '../context/LanguageContext';
import { StoryModal } from './StoryModal';

const { width: W } = Dimensions.get('window');

interface DiscoverSectionProps {
  events: any[];
  theme: any;
  t: (key: string) => string;
}

export const DiscoverSection = ({ events, theme, t }: DiscoverSectionProps) => {
  const { language } = useLanguage();
  const [selectedEvent, setSelectedEvent] = useState<any>(null);

  if (events.length === 0) {
    return (
      <View style={styles.discoverEmpty}>
        <Text style={{ fontSize: 30, color: theme.gold, opacity: 0.6 }}>✦</Text>
        <Text style={{ fontSize: 17, fontWeight: '900', color: theme.text, marginTop: 8 }}>
          {t('only_one_today')}
        </Text>
      </View>
    );
  }

  return (
    <View style={{ flex: 1 }}>
      <ScrollView 
        contentContainerStyle={styles.discoverList} 
        showsVerticalScrollIndicator={false}
      >
        {events.map((ev, i) => (
          <TouchableOpacity 
            key={i} 
            activeOpacity={0.9} 
            onPress={() => setSelectedEvent(ev)}
          >
            <DiscoverCard event={ev} theme={theme} lang={language} />
          </TouchableOpacity>
        ))}
        {/* Spațiu extra la final pentru scroll */}
        <View style={{ height: 20 }} />
      </ScrollView>

      {/* Modalul comun pentru secțiunea Discover */}
      <StoryModal 
        visible={!!selectedEvent}
        event={selectedEvent}
        onClose={() => setSelectedEvent(null)}
        theme={theme}
      />
    </View>
  );
};

// Sub-componenta pentru cardul mic (DiscoverCard) mutată aici
const DiscoverCard = ({ event, theme, lang }: { event: any; theme: any; lang: string }) => {
  const title = event.titleTranslations?.[lang] || event.titleTranslations?.en || event.title || '';
  const category = event.categoryTranslations?.[lang] || event.category || 'HISTORY';
  const imageUri = event.gallery?.[0];
  const raw = event?.eventDate ?? event?.event_date ?? event?.year;
  const year = raw ? (/^\d{4}$/.test(String(raw)) ? String(raw) : String(new Date(raw).getFullYear())) : '';

  return (
    <View style={styles.card}>
      {imageUri ? (
        <Image source={{ uri: imageUri }} style={StyleSheet.absoluteFill} contentFit="cover" transition={400} />
      ) : (
        <View style={[StyleSheet.absoluteFill, { backgroundColor: theme.card }]} />
      )}
      <LinearGradient colors={['transparent', 'rgba(0,0,0,0.88)']} locations={[0.25, 1]} style={StyleSheet.absoluteFill} />
      <View style={styles.content}>
        <View style={styles.topRow}>
          <Text style={styles.category}>{category.toUpperCase()}</Text>
          {year !== '' && <Text style={styles.year}>{year}</Text>}
        </View>
        <Text style={styles.title} numberOfLines={2}>{title}</Text>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  discoverList: { paddingBottom: 16 },
  discoverEmpty: { alignItems: 'center', justifyContent: 'center', paddingTop: 60, paddingHorizontal: 30 },
  card: { height: 140, borderRadius: 18, overflow: 'hidden', marginBottom: 12, backgroundColor: '#1a1c23', elevation: 5, shadowColor: '#000', shadowOpacity: 0.35, shadowRadius: 8, shadowOffset: { width: 0, height: 4 } },
  content: { position: 'absolute', bottom: 0, left: 0, right: 0, padding: 14 },
  topRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 5 },
  category: { color: '#ffd700', fontSize: 9, fontWeight: '800', letterSpacing: 2 },
  year: { color: 'rgba(255,255,255,0.45)', fontSize: 9, fontWeight: '700', letterSpacing: 1 },
  title: { color: '#fff', fontSize: 15, fontWeight: '800', lineHeight: 20 },
});