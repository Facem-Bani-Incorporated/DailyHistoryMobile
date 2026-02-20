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
  View
} from 'react-native';
// Importăm componenta de profil
import ProfileAvatar from '../../components/ProfileAvatar';
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

  useEffect(() => {
    const timer = setTimeout(() => {
      setData(MOCK_DATA);
      setLoading(false);
    }, 800);
    return () => clearTimeout(timer);
  }, []);

  if (loading) {
    return (
      <View style={[styles.container, { justifyContent: 'center' }]}>
        <ActivityIndicator size="large" color="#ffd700" />
      </View>
    );
  }

  const main = data?.main_event;

  return (
    <View style={styles.container}>
      {/* StatusBar ne asigură că pictogramele de sus (baterie, wifi) rămân albe */}
      <StatusBar barStyle="light-content" />
      
      <SafeAreaView style={styles.header}>
        <View style={styles.headerContent}>
          <View>
            <Text style={styles.headerTitle}>
              HISTORY<Text style={styles.goldTextInline}>GOLD</Text>
            </Text>
            <Text style={styles.userEmail}>{user?.email}</Text>
          </View>
          
          {/* Noul tău Profil care conține și Modalul și Logout-ul */}
          <ProfileAvatar />
        </View>
      </SafeAreaView>

      <ScrollView contentContainerStyle={{ paddingBottom: 40 }}>
        {main?.gallery?.length > 0 && (
          <Image source={{ uri: main.gallery[0] }} style={styles.heroImage} />
        )}
        <View style={styles.content}>
          <Text style={styles.goldText}>
            ANUL {main?.year} • IMPACT: {main?.impact_score}%
          </Text>
          <Text style={styles.title}>{main?.title_translations?.ro}</Text>
          <Text style={styles.narrative}>{main?.narrative_translations?.ro}</Text>
          
          <View style={styles.infoBox}>
            <Ionicons name="information-circle-outline" size={20} color="#ffd700" />
            <Text style={styles.infoText}>
              Apasă pe cercul auriu din dreapta sus pentru a vedea detaliile profilului tău.
            </Text>
          </View>
        </View>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { 
    flex: 1, 
    backgroundColor: '#0e1117' 
  },
  header: {
    backgroundColor: '#1a1c23',
    borderBottomWidth: 1,
    borderBottomColor: '#2c2f36',
    // Rezolvă suprapunerea cu bara de notificări pe Android
    paddingTop: Platform.OS === 'android' ? StatusBar.currentHeight : 0,
  },
  headerContent: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 15,
  },
  headerTitle: { color: 'white', fontWeight: '900', fontSize: 18, letterSpacing: 1 },
  goldTextInline: { color: '#ffd700' },
  userEmail: { color: '#666', fontSize: 11, marginTop: 2 },
  heroImage: { width: '100%', height: 350, borderBottomLeftRadius: 30, borderBottomRightRadius: 30 },
  content: { padding: 25 },
  goldText: { color: '#ffd700', fontWeight: 'bold', fontSize: 14, letterSpacing: 1.2, marginBottom: 10 },
  title: { color: 'white', fontSize: 32, fontWeight: '900', marginBottom: 15 },
  narrative: { color: '#bdc3c7', fontSize: 17, lineHeight: 28 },
  infoBox: { 
    flexDirection: 'row', 
    backgroundColor: '#1a1c23', 
    padding: 15, 
    borderRadius: 12, 
    marginTop: 30, 
    alignItems: 'center' 
  },
  infoText: { color: '#ffd700', marginLeft: 10, fontSize: 13, flex: 1 }
});