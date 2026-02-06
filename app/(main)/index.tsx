import { Ionicons } from '@expo/vector-icons'; // Importă iconițele pentru un look profi
import React, { useEffect, useState } from 'react';
import { ActivityIndicator, Image, SafeAreaView, ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import api from '../../api';
import { useAuthStore } from '../../store/useAuthStore';

interface HistoryEvent {
  year: number;
  impact_score: number;
  title_translations: { ro: string };
  narrative_translations: { ro: string };
  gallery: string[];
}

export default function HomeScreen() {
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  
  // Extragem logout din store
  const logout = useAuthStore((state) => state.logout);

  useEffect(() => {
    const fetchHistory = async () => {
      try {
        const response = await api.get('/daily-history');
        setData(response.data);
      } catch (e) {
        console.log("Backend offline, incarcam date Mock...");
        setData({
          main_event: {
            year: 1453,
            impact_score: 95,
            title_translations: { ro: "Căderea Constantinopolului" },
            narrative_translations: { ro: "O zi care a schimbat cursul istoriei europene, marcând sfârșitul Imperiului Bizantin și ascensiunea puterii Otomane sub Mehmed al II-lea." },
            gallery: ["https://images.unsplash.com/photo-1543165796-5426273ea458?q=80&w=1000"]
          }
        });
      } finally {
        setLoading(false);
      }
    };
    fetchHistory();
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
      {/* HEADER PERSONALIZAT CU LOGOUT */}
      <SafeAreaView style={styles.header}>
        <Text style={styles.headerTitle}>HISTORY<Text style={styles.goldTextInline}>GOLD</Text></Text>
        <TouchableOpacity onPress={() => logout()} style={styles.logoutButton}>
          <Ionicons name="log-out-outline" size={24} color="#ffd700" />
        </TouchableOpacity>
      </SafeAreaView>

      <ScrollView contentContainerStyle={{ paddingBottom: 40 }}>
        {main?.gallery?.length > 0 && (
          <Image source={{ uri: main.gallery[0] }} style={styles.heroImage} />
        )}
        
        <View style={styles.content}>
          <Text style={styles.goldText}>ANUL {main?.year} • IMPACT: {main?.impact_score}%</Text>
          <Text style={styles.title}>{main?.title_translations?.ro}</Text>
          <Text style={styles.narrative}>{main?.narrative_translations?.ro}</Text>
        </View>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#0e1117' },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 10,
    backgroundColor: '#1a1c23',
    zIndex: 10,
  },
  headerTitle: { color: 'white', fontWeight: '900', fontSize: 18, letterSpacing: 1 },
  goldTextInline: { color: '#ffd700' },
  logoutButton: { padding: 5 },
  heroImage: { 
    width: '100%', 
    height: 350, 
    borderBottomLeftRadius: 30, 
    borderBottomRightRadius: 30 
  },
  content: { padding: 25 },
  goldText: { 
    color: '#ffd700', 
    fontWeight: 'bold', 
    fontSize: 14, 
    letterSpacing: 1.2, 
    marginBottom: 10 
  },
  title: { color: 'white', fontSize: 32, fontWeight: '900', marginBottom: 15 },
  narrative: { 
    color: '#bdc3c7', 
    fontSize: 17, 
    lineHeight: 28, 
    textAlign: 'left' 
  }
});