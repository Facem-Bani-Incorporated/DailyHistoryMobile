import AsyncStorage from '@react-native-async-storage/async-storage';
import * as Device from 'expo-device';
import { LinearGradient } from 'expo-linear-gradient';
import * as Notifications from 'expo-notifications';
import { useRouter } from 'expo-router';
import { Bell, ShieldCheck, X, Zap } from 'lucide-react-native';
import React from 'react';
import {
  Dimensions,
  Platform,
  StyleSheet,
  Text,
  TouchableOpacity,
  View
} from 'react-native';

const { width } = Dimensions.get('window');

export default function NotificationPrompt() {
  const router = useRouter();

  // ------------------ REQUEST PERMISSIONS ------------------
  const requestPushPermissions = async () => {
    if (!Device.isDevice) {
      console.log('Must use physical device for Push Notifications');
      return;
    }

    const { status: existingStatus } = await Notifications.getPermissionsAsync();
    let finalStatus = existingStatus;

    if (existingStatus !== 'granted') {
      const { status } = await Notifications.requestPermissionsAsync();
      finalStatus = status;
    }

    if (finalStatus !== 'granted') {
      console.log('Permission denied');
      return;
    }

    // Optional: get push token
    const token = (await Notifications.getExpoPushTokenAsync()).data;
    console.log('Push token:', token);

    // Android channel setup
    if (Platform.OS === 'android') {
      await Notifications.setNotificationChannelAsync('default', {
        name: 'default',
        importance: Notifications.AndroidImportance.MAX,
      });
    }
  };
  // ----------------------------------------------------------

  const handleEnable = async () => {
    try {
      // Marcam prompt-ul ca văzut
      await AsyncStorage.setItem('notif_prompt_seen', 'true');

      // Cerem permisiunea
      await requestPushPermissions();

      // Navigăm mai departe
      router.replace('/(auth)/login');
    } catch (e) {
      console.error("Failed to save notification status", e);
    }
  };

  const handleSkip = async () => {
    try {
      await AsyncStorage.setItem('notif_prompt_seen', 'true');
      router.replace('/(auth)/login');
    } catch (e) {
      console.error(e);
    }
  };

  return (
    <View style={styles.container}>
      {/* Butonul X pentru închidere rapidă */}
      <TouchableOpacity style={styles.closeButton} onPress={handleSkip}>
        <X color="#666" size={28} />
      </TouchableOpacity>

      <View style={styles.content}>
        <View style={styles.iconContainer}>
          <LinearGradient
            colors={['#ffd700', '#b8860b']}
            style={styles.iconCircle}
          >
            <Bell color="#000" size={40} strokeWidth={2.5} />
          </LinearGradient>
        </View>

        <Text style={styles.title}>Don't Miss <Text style={styles.gold}>History</Text></Text>
        <Text style={styles.subtitle}>
          The most important events happen once. Get notified the moment we unearth a new golden nugget of wisdom.
        </Text>

        <View style={styles.features}>
          <View style={styles.featureItem}>
            <Zap color="#ffd700" size={20} />
            <Text style={styles.featureText}>Daily historical insights</Text>
          </View>
          <View style={styles.featureItem}>
            <ShieldCheck color="#ffd700" size={20} />
            <Text style={styles.featureText}>Premium experience & rare facts</Text>
          </View>
        </View>

        <TouchableOpacity style={styles.mainButton} onPress={handleEnable}>
          <LinearGradient
            colors={['#ffd700', '#b8860b']}
            style={styles.gradientButton}
          >
            <Text style={styles.buttonText}>NOTIFY ME</Text>
          </LinearGradient>
        </TouchableOpacity>

        <TouchableOpacity style={styles.maybeLater} onPress={handleSkip}>
          <Text style={styles.maybeLaterText}>Maybe later, I'll check manually</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: 'rgba(14,17,23,0.85)',
    justifyContent: 'center',
    padding: 30,
  },
  closeButton: {
    position: 'absolute',
    top: 60,
    right: 25,
    zIndex: 10,
  },
  content: {
    alignItems: 'center',
  },
  iconContainer: {
    marginBottom: 40,
  },
  iconCircle: {
    width: 100,
    height: 100,
    borderRadius: 50,
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#ffd700',
    shadowOpacity: 0.3,
    shadowRadius: 20,
    elevation: 10,
  },
  title: {
    fontSize: 32,
    fontWeight: '900',
    color: '#fff',
    textAlign: 'center',
    marginBottom: 15,
  },
  gold: {
    color: '#ffd700',
  },
  subtitle: {
    color: '#aaa',
    fontSize: 16,
    textAlign: 'center',
    lineHeight: 24,
    marginBottom: 40,
  },
  features: {
    width: '100%',
    gap: 15,
    marginBottom: 50,
  },
  featureItem: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#1a1c23',
    padding: 15,
    borderRadius: 15,
    gap: 12,
    borderWidth: 1,
    borderColor: '#333',
  },
  featureText: {
    color: '#fff',
    fontWeight: '600',
    fontSize: 14,
  },
  mainButton: {
    width: '100%',
    borderRadius: 15,
    overflow: 'hidden',
    marginBottom: 20,
  },
  gradientButton: {
    paddingVertical: 18,
    alignItems: 'center',
  },
  buttonText: {
    color: '#000',
    fontWeight: '900',
    fontSize: 16,
    letterSpacing: 2,
  },
  maybeLater: {
    padding: 10,
  },
  maybeLaterText: {
    color: '#666',
    fontSize: 14,
    fontWeight: '600',
  },
});
