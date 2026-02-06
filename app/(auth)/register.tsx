import { LinearGradient } from 'expo-linear-gradient';
import { useRouter } from 'expo-router';
import {
    Apple,
    ArrowLeft, Eye, EyeOff,
    Chrome as Google,
    Lock,
    Mail,
    User
} from 'lucide-react-native';
import React, { useState } from 'react';
import {
    Alert,
    KeyboardAvoidingView,
    Platform,
    ScrollView,
    StyleSheet,
    Text,
    TextInput,
    TouchableOpacity,
    View
} from 'react-native';

export default function RegisterScreen() {
  const router = useRouter();
  const [showPassword, setShowPassword] = useState(false);
  const [form, setForm] = useState({
    username: '',
    email: '',
    password: '',
    confirmPassword: ''
  });

  const handleRegister = async () => {
    if (!form.username || !form.email || !form.password) {
      Alert.alert("Error", "Please fill in all fields.");
      return;
    }
    // Logică viitoare Axios...
    console.log("Registering with:", form);
  };

  return (
    <KeyboardAvoidingView 
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      style={styles.container}
    >
      <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
        {/* Back Button */}
        <TouchableOpacity style={styles.backButton} onPress={() => router.back()}>
          <ArrowLeft color="#ffd700" size={28} />
        </TouchableOpacity>

        <View style={styles.header}>
          <Text style={styles.title}>Create <Text style={styles.gold}>Account</Text></Text>
          <Text style={styles.subtitle}>Join the elite circle of history explorers.</Text>
        </View>

        <View style={styles.form}>
          {/* Inputs */}
          <View style={styles.inputWrapper}>
            <User color="#666" size={20} style={styles.inputIcon} />
            <TextInput 
              style={styles.input}
              placeholder="Username"
              placeholderTextColor="#666"
              value={form.username}
              onChangeText={(text) => setForm({...form, username: text})}
            />
          </View>

          <View style={styles.inputWrapper}>
            <Mail color="#666" size={20} style={styles.inputIcon} />
            <TextInput 
              style={styles.input}
              placeholder="Email Address"
              placeholderTextColor="#666"
              keyboardType="email-address"
              autoCapitalize="none"
              value={form.email}
              onChangeText={(text) => setForm({...form, email: text})}
            />
          </View>

          <View style={styles.inputWrapper}>
            <Lock color="#666" size={20} style={styles.inputIcon} />
            <TextInput 
              style={styles.input}
              placeholder="Password"
              placeholderTextColor="#666"
              secureTextEntry={!showPassword}
              value={form.password}
              onChangeText={(text) => setForm({...form, password: text})}
            />
            <TouchableOpacity onPress={() => setShowPassword(!showPassword)}>
              {showPassword ? <EyeOff color="#ffd700" size={20} /> : <Eye color="#666" size={20} />}
            </TouchableOpacity>
          </View>

          {/* Register Button */}
          <TouchableOpacity style={styles.registerButton} onPress={handleRegister}>
            <LinearGradient colors={['#ffd700', '#b8860b']} style={styles.gradientButton}>
              <Text style={styles.registerButtonText}>BECOME A MEMBER</Text>
            </LinearGradient>
          </TouchableOpacity>

          {/* --- SOCIAL AUTH SECTION --- */}
          <View style={styles.dividerContainer}>
            <View style={styles.dividerLine} />
            <Text style={styles.dividerText}>OR CONTINUE WITH</Text>
            <View style={styles.dividerLine} />
          </View>

          <View style={styles.socialContainer}>
            <TouchableOpacity style={styles.socialButton}>
              <Google color="#fff" size={24} />
              <Text style={styles.socialButtonText}>Google</Text>
            </TouchableOpacity>

            {Platform.OS === 'ios' && (
              <TouchableOpacity style={styles.socialButton}>
                <Apple color="#fff" size={24} />
                <Text style={styles.socialButtonText}>Apple</Text>
              </TouchableOpacity>
            )}
          </View>

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
  scrollContent: { padding: 25, paddingTop: 60, paddingBottom: 40 },
  backButton: { marginBottom: 30 },
  header: { marginBottom: 35 },
  title: { fontSize: 32, fontWeight: '800', color: '#fff' },
  gold: { color: '#ffd700' },
  subtitle: { color: '#aaa', fontSize: 16, marginTop: 10 },
  form: { gap: 18 },
  inputWrapper: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#1a1c23',
    borderRadius: 15,
    paddingHorizontal: 15,
    height: 60,
    borderWidth: 1,
    borderColor: '#333'
  },
  inputIcon: { marginRight: 12 },
  input: { flex: 1, color: '#fff', fontSize: 16 },
  registerButton: { marginTop: 10, borderRadius: 15, overflow: 'hidden' },
  gradientButton: { paddingVertical: 18, alignItems: 'center' },
  registerButtonText: { color: '#000', fontWeight: '900', fontSize: 16, letterSpacing: 1 },
  
  // Social Styles
  dividerContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginVertical: 20,
  },
  dividerLine: {
    flex: 1,
    height: 1,
    backgroundColor: '#333',
  },
  dividerText: {
    color: '#666',
    marginHorizontal: 15,
    fontSize: 12,
    fontWeight: '700',
  },
  socialContainer: {
    flexDirection: 'row',
    gap: 15,
  },
  socialButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#1a1c23',
    borderRadius: 15,
    height: 55,
    borderWidth: 1,
    borderColor: '#333',
    gap: 10
  },
  socialButtonText: {
    color: '#fff',
    fontWeight: '600',
    fontSize: 15,
  },
  loginLink: { alignItems: 'center', marginTop: 10 },
  loginLinkText: { color: '#aaa', fontSize: 15 }
});