import { Ionicons } from '@expo/vector-icons';
import React, { useEffect, useState } from 'react';
import {
  ActivityIndicator,
  Image,
  Platform,
  SafeAreaView,
  ScrollView,
  StatusBar,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import ProfileAvatar from '../../components/ProfileAvatar';
import { useTheme } from '../../context/ThemeContext';
import { useAuthStore } from '../../store/useAuthStore';

const MOCK_DATA = {
  main_event: {
    year: 1453,
    impact_score: 95,
    title_translations: { ro: 'Căderea Constantinopolului' },
    narrative_translations: {
      ro: 'O zi care a schimbat cursul istoriei europene, marcând sfârșitul Imperiului Bizantin și ascensiunea puterii Otomane sub Mehmed al II-lea.',
    },
    gallery: ['https://images.unsplash.com/photo-1543165796-5426273ea458?q=80&w=1000'],
  },
};

export default function HomeScreen() {
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const user = useAuthStore((state) => state.user);
  const { theme } = useTheme();

  useEffect(() => {
    const timer = setTimeout(() => {
      setData(MOCK_DATA);
      setLoading(false);
    }, 800);
    return () => clearTimeout(timer);
  }, []);

  if (loading) {
    return (
      <View style={[styles(theme).container, { justifyContent: 'center' }]}>
        <ActivityIndicator size="large" color={theme.gold} />
      </View>
    );
  }

  const main = data?.main_event;
  const s = styles(theme);

  return (
    <View style={s.container}>
      <StatusBar barStyle={theme.background === '#0e1117' ? 'light-content' : 'dark-content'} />

      <SafeAreaView style={s.header}>
        <View style={s.headerContent}>
          <View>
            <Text style={s.headerTitle}>
              HISTORY<Text style={s.goldTextInline}>GOLD</Text>
            </Text>
            <Text style={s.userEmail}>{user?.email}</Text>
          </View>

          <ProfileAvatar />
        </View>
      </SafeAreaView>

      <ScrollView contentContainerStyle={{ paddingBottom: 40 }}>
        {main?.gallery?.length > 0 && (
          <Image source={{ uri: main.gallery[0] }} style={s.heroImage} />
        )}
        <View style={s.content}>
          <Text style={s.goldText}>
            ANUL {main?.year} • IMPACT: {main?.impact_score}%
          </Text>
          <Text style={s.title}>{main?.title_translations?.ro}</Text>
          <Text style={s.narrative}>{main?.narrative_translations?.ro}</Text>

          <View style={s.infoBox}>
            <Ionicons name="information-circle-outline" size={20} color={theme.gold} />
            <Text style={s.infoText}>
              Apasă pe cercul auriu din dreapta sus pentru a vedea detaliile profilului tău.
            </Text>
          </View>
        </View>
      </ScrollView>
    </View>
  );
}

const styles = (theme: ReturnType<typeof import('../../context/ThemeContext').useTheme>['theme']) =>
  StyleSheet.create({
    container: {
      flex: 1,
      backgroundColor: theme.background,
    },
    header: {
      backgroundColor: theme.card,
      borderBottomWidth: 1,
      borderBottomColor: theme.border,
      paddingTop: Platform.OS === 'android' ? StatusBar.currentHeight : 0,
    },
    headerContent: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
      paddingHorizontal: 20,
      paddingVertical: 15,
    },
    headerTitle: { color: theme.text, fontWeight: '900', fontSize: 18, letterSpacing: 1 },
    goldTextInline: { color: theme.gold },
    userEmail: { color: theme.subtext, fontSize: 11, marginTop: 2 },
    heroImage: {
      width: '100%',
      height: 350,
      borderBottomLeftRadius: 30,
      borderBottomRightRadius: 30,
    },
    content: { padding: 25 },
    goldText: {
      color: theme.gold,
      fontWeight: 'bold',
      fontSize: 14,
      letterSpacing: 1.2,
      marginBottom: 10,
    },
    title: { color: theme.text, fontSize: 32, fontWeight: '900', marginBottom: 15 },
    narrative: { color: theme.subtext, fontSize: 17, lineHeight: 28 },
    infoBox: {
      flexDirection: 'row',
      backgroundColor: theme.card,
      padding: 15,
      borderRadius: 12,
      marginTop: 30,
      alignItems: 'center',
    },
    infoText: { color: theme.gold, marginLeft: 10, fontSize: 13, flex: 1 },
  });