import { GoogleSignin, statusCodes } from '@react-native-google-signin/google-signin';
import { LinearGradient } from 'expo-linear-gradient';
import { useRouter } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import {
  ArrowLeft,
  Eye,
  EyeOff,
  Chrome as Google,
  Lock,
  Mail,
  User as UserIcon
} from 'lucide-react-native';
import React, { useEffect, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';

import api from '../../api';
import { useAuthStore } from '../../store/useAuthStore';
import { authService } from '../services/authService';

export default function RegisterScreen() {
  const router = useRouter();
  const setAuth = useAuthStore((state) => state.setAuth);

  const [isLoading, setIsLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [form, setForm] = useState({
    username: '',
    email: '',
    password: '',
  });

  // CONFIGURARE INITIALA (Exact ca in Login)
  useEffect(() => {
    GoogleSignin.configure({
      webClientId: '49902921378-4k5mjec67t0pnu0jrfti1bejpi1e5u3h.apps.googleusercontent.com',
      offlineAccess: true,
    });
  }, []);

  const handleGoogleSignIn = async () => {
    setIsLoading(true);
    try {
      await GoogleSignin.hasPlayServices();
      const response = await GoogleSignin.signIn();
      
      const idToken = response.data?.idToken;

      if (idToken) {
        handleBackendGoogleLogin(idToken);
      } else {
        Alert.alert('Eroare', 'Nu s-a putut obține jetonul de la Google.');
        setIsLoading(false);
      }
    } catch (error: any) {
      setIsLoading(false);
      if (error.code === statusCodes.SIGN_IN_CANCELLED) {
        console.log('Utilizatorul a anulat înregistrarea');
      } else {
        console.error('Google Sign-In Error:', error);
        Alert.alert('Eroare Google', 'Asigură-te că rulezi pe un dispozitiv cu Google Play Services.');
      }
    }
  };

  const handleBackendGoogleLogin = async (googleIdToken: string) => {
    try {
      setIsLoading(true);

      // Forțăm signOut pentru a curăța cache-ul (Selectorul de conturi)
      try {
        await GoogleSignin.signOut();
      } catch (e) {
        console.log('Nicio sesiune anterioară de curățat.');
      }

      console.log('Trimit ID Token la Railway (din Register)...'); 
      // Folosim authService care se ocupă de salvarea corectă în Zustand
      await authService.loginWithGoogle(googleIdToken);
      
      router.replace('/(main)');
      
    } catch (error: any) {
      console.error('Detalii eroare Railway Register:', error.response?.data); 
      Alert.alert(
        'Eroare Server', 
        error.response?.data?.message || 'Validarea Google a eșuat.'
      );
    } finally {
      setIsLoading(false);
    }
  };

  const handleRegister = async () => {
    if (!form.username || !form.email || !form.password) {
      Alert.alert("Eroare", "Toate câmpurile sunt obligatorii.");
      return;
    }

    setIsLoading(true);
    try {
      await api.post('/auth/register', {
        username: form.username,
        email: form.email,
        password: form.password,
        role: ["user"]
      });

      Alert.alert("Succes", "Cont creat! Acum te poți loga.");
      router.replace('/(auth)/login');
    } catch (e: any) {
      Alert.alert("Eroare", e.response?.data?.message || "Nu s-a putut crea contul.");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <KeyboardAvoidingView 
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'} 
      style={styles.container}
    >
      <StatusBar style="light" />
      <ScrollView contentContainerStyle={styles.scrollContent} keyboardShouldPersistTaps="handled">
        
        <TouchableOpacity style={styles.backButton} onPress={() => router.back()}>
          <ArrowLeft color="#ffd700" size={28} />
        </TouchableOpacity>

        <View style={styles.header}>
          <Text style={styles.title}>Create <Text style={styles.gold}>Account</Text></Text>
          <Text style={styles.subtitle}>Join the elite circle of history explorers.</Text>
        </View>

        <View style={styles.form}>
          {/* Username Input */}
          <View style={styles.inputWrapper}>
            <UserIcon color="#666" size={20} style={styles.inputIcon} />
            <TextInput
              style={styles.input}
              placeholder="Username"
              placeholderTextColor="#666"
              value={form.username}
              onChangeText={(text) => setForm({ ...form, username: text })}
            />
          </View>

          {/* Email Input */}
          <View style={styles.inputWrapper}>
            <Mail color="#666" size={20} style={styles.inputIcon} />
            <TextInput
              style={styles.input}
              placeholder="Email"
              placeholderTextColor="#666"
              value={form.email}
              onChangeText={(text) => setForm({ ...form, email: text })}
              autoCapitalize="none"
              keyboardType="email-address"
            />
          </View>

          {/* Password Input */}
          <View style={styles.inputWrapper}>
            <Lock color="#666" size={20} style={styles.inputIcon} />
            <TextInput
              style={styles.input}
              placeholder="Password"
              placeholderTextColor="#666"
              secureTextEntry={!showPassword}
              value={form.password}
              onChangeText={(text) => setForm({ ...form, password: text })}
            />
            <TouchableOpacity onPress={() => setShowPassword(!showPassword)}>
              {showPassword ? <EyeOff color="#ffd700" size={20} /> : <Eye color="#666" size={20} />}
            </TouchableOpacity>
          </View>

          <TouchableOpacity 
            style={styles.registerButton} 
            onPress={handleRegister} 
            disabled={isLoading}
          >
            <LinearGradient colors={['#ffd700', '#b8860b']} style={styles.gradientButton}>
              {isLoading ? (
                <ActivityIndicator color="#000" />
              ) : (
                <Text style={styles.registerButtonText}>BECOME A MEMBER</Text>
              )}
            </LinearGradient>
          </TouchableOpacity>

          <View style={styles.dividerContainer}>
            <View style={styles.dividerLine} />
            <Text style={styles.dividerText}>OR</Text>
            <View style={styles.dividerLine} />
          </View>

          <TouchableOpacity
            style={styles.socialButton}
            onPress={handleGoogleSignIn}
            disabled={isLoading}
          >
            {isLoading ? <ActivityIndicator color="#fff" /> : (
              <>
                <Google color="#fff" size={22} />
                <Text style={styles.socialButtonText}>Continue with Google</Text>
              </>
            )}
          </TouchableOpacity>

          <TouchableOpacity 
            style={styles.loginLink} 
            onPress={() => router.push('/(auth)/login')}
          >
            <Text style={styles.loginLinkText}>
              Already have an account? <Text style={styles.gold}>Sign In</Text>
            </Text>
          </TouchableOpacity>
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#0e1117' },
  scrollContent: { padding: 25, paddingTop: 50 },
  backButton: { marginBottom: 20 },
  header: { marginBottom: 35 },
  title: { fontSize: 32, fontWeight: '800', color: '#fff' },
  gold: { color: '#ffd700' },
  subtitle: { color: '#aaa', fontSize: 16, marginTop: 10 },
  form: { gap: 18 },
  inputWrapper: {
    flexDirection: 'row', alignItems: 'center', backgroundColor: '#1a1c23',
    borderRadius: 16, paddingHorizontal: 16, height: 60, borderWidth: 1, borderColor: '#333',
  },
  inputIcon: { marginRight: 12 },
  input: { flex: 1, color: '#fff', fontSize: 16 },
  registerButton: { marginTop: 10, borderRadius: 16, overflow: 'hidden' },
  gradientButton: { height: 60, justifyContent: 'center', alignItems: 'center' },
  registerButtonText: { color: '#000', fontWeight: '900', fontSize: 16, letterSpacing: 1 },
  dividerContainer: { flexDirection: 'row', alignItems: 'center', marginVertical: 20 },
  dividerLine: { flex: 1, height: 1, backgroundColor: '#333' },
  dividerText: { color: '#666', marginHorizontal: 15, fontSize: 11, fontWeight: '800' },
  socialButton: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center',
    backgroundColor: '#1a1c23', borderRadius: 16, height: 58, borderWidth: 1, borderColor: '#333', gap: 10,
  },
  socialButtonText: { color: '#fff', fontWeight: '600', fontSize: 15 },
  loginLink: { alignItems: 'center', marginTop: 15 },
  loginLinkText: { color: '#aaa', fontSize: 15 },
});