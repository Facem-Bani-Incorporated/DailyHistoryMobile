// components/SupportModal.tsx
import { Ionicons } from '@expo/vector-icons';
import React, { useCallback, useEffect, useRef, useState } from 'react';
import {
    ActivityIndicator,
    Animated,
    Keyboard,
    KeyboardAvoidingView,
    Modal,
    Platform,
    ScrollView,
    StatusBar,
    StyleSheet,
    Text,
    TextInput,
    TouchableOpacity,
    View
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import api from '../api';
import { useLanguage } from '../context/LanguageContext';
import { useTheme } from '../context/ThemeContext';

const SERIF = Platform.OS === 'ios' ? 'Georgia' : 'serif';

interface Props { visible: boolean; onClose: () => void }
type Cat = 'BUG' | 'COMPLAINT' | 'QUESTION' | 'SUGGESTION' | 'OTHER';

const CATS: { value: Cat; icon: keyof typeof Ionicons.glyphMap; color: string }[] = [
  { value: 'BUG',        icon: 'bug-outline',              color: '#FF3B30' },
  { value: 'QUESTION',   icon: 'help-circle-outline',      color: '#007AFF' },
  { value: 'SUGGESTION', icon: 'bulb-outline',             color: '#FF9F0A' },
  { value: 'COMPLAINT',  icon: 'alert-circle-outline',     color: '#FF6D00' },
  { value: 'OTHER',      icon: 'chatbox-ellipses-outline', color: '#8E8E93' },
];

const T: Record<string, Record<string, string>> = {
  en: { title:'Get in Touch', subtitle:'How can we help?', cat:'Choose a topic', BUG:'Bug Report', QUESTION:'Question', SUGGESTION:'Suggestion', COMPLAINT:'Complaint', OTHER:'Other', subject:'Subject', subjectPh:'What\'s this about?', message:'Your Message', messagePh:'Describe in detail...', send:'Send Message', sending:'Sending...', okTitle:'Sent Successfully', okDesc:'Thank you! We\'ll get back to you as soon as possible.', errTitle:'Couldn\'t Send', errDesc:'Something went wrong. Please try again or reach us by email.', done:'Close', retry:'Try Again', req:'Please fill in all fields', chars:'characters' },
  ro: { title:'Contactează-ne', subtitle:'Cum te putem ajuta?', cat:'Alege un subiect', BUG:'Raport de Bug', QUESTION:'Întrebare', SUGGESTION:'Sugestie', COMPLAINT:'Reclamație', OTHER:'Altceva', subject:'Subiect', subjectPh:'Despre ce e vorba?', message:'Mesajul Tău', messagePh:'Descrie în detaliu...', send:'Trimite Mesajul', sending:'Se trimite...', okTitle:'Trimis cu Succes', okDesc:'Mulțumim! Vom reveni cu un răspuns cât mai curând.', errTitle:'Nu s-a putut trimite', errDesc:'Ceva nu a funcționat. Încearcă din nou sau scrie-ne pe email.', done:'Închide', retry:'Încearcă din nou', req:'Completează toate câmpurile', chars:'caractere' },
  fr: { title:'Contactez-nous', subtitle:'Comment pouvons-nous aider ?', cat:'Choisissez un sujet', BUG:'Rapport de Bug', QUESTION:'Question', SUGGESTION:'Suggestion', COMPLAINT:'Réclamation', OTHER:'Autre', subject:'Sujet', subjectPh:'De quoi s\'agit-il ?', message:'Votre Message', messagePh:'Décrivez en détail...', send:'Envoyer', sending:'Envoi...', okTitle:'Envoyé', okDesc:'Merci ! Nous vous répondrons dès que possible.', errTitle:'Erreur d\'envoi', errDesc:'Quelque chose n\'a pas fonctionné. Réessayez ou contactez-nous par email.', done:'Fermer', retry:'Réessayer', req:'Veuillez remplir tous les champs', chars:'caractères' },
  de: { title:'Kontaktiere uns', subtitle:'Wie können wir helfen?', cat:'Wähle ein Thema', BUG:'Fehlerbericht', QUESTION:'Frage', SUGGESTION:'Vorschlag', COMPLAINT:'Beschwerde', OTHER:'Sonstiges', subject:'Betreff', subjectPh:'Worum geht es?', message:'Deine Nachricht', messagePh:'Beschreibe im Detail...', send:'Senden', sending:'Wird gesendet...', okTitle:'Gesendet', okDesc:'Danke! Wir melden uns so schnell wie möglich.', errTitle:'Senden fehlgeschlagen', errDesc:'Etwas ist schiefgelaufen. Versuche es erneut oder schreib uns per Email.', done:'Schließen', retry:'Erneut versuchen', req:'Bitte fülle alle Felder aus', chars:'Zeichen' },
  es: { title:'Contáctanos', subtitle:'¿Cómo podemos ayudar?', cat:'Elige un tema', BUG:'Reporte de Error', QUESTION:'Pregunta', SUGGESTION:'Sugerencia', COMPLAINT:'Queja', OTHER:'Otro', subject:'Asunto', subjectPh:'¿De qué se trata?', message:'Tu Mensaje', messagePh:'Describe en detalle...', send:'Enviar', sending:'Enviando...', okTitle:'Enviado', okDesc:'¡Gracias! Te responderemos lo antes posible.', errTitle:'Error al enviar', errDesc:'Algo salió mal. Intenta de nuevo o escríbenos por email.', done:'Cerrar', retry:'Intentar de nuevo', req:'Completa todos los campos', chars:'caracteres' },
};
const tx = (l: string, k: string) => (T[l] ?? T.en)[k] ?? T.en[k] ?? k;

type Screen = 'form' | 'sending' | 'success' | 'error';

export default function SupportModal({ visible, onClose }: Props) {
  const { theme, isDark } = useTheme();
  const { language } = useLanguage();
  const insets = useSafeAreaInsets();
  const gold = isDark ? '#E8B84D' : '#C77E08';

  const [screen, setScreen] = useState<Screen>('form');
  const [cat, setCat] = useState<Cat | null>(null);
  const [subj, setSubj] = useState('');
  const [msg, setMsg] = useState('');
  const [err, setErr] = useState(false);

  const subjRef = useRef<TextInput>(null);
  const msgRef = useRef<TextInput>(null);

  // Animations
  const fadeIn = useRef(new Animated.Value(0)).current;
  const slideUp = useRef(new Animated.Value(40)).current;
  const resultScale = useRef(new Animated.Value(0.7)).current;
  const resultFade = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    if (visible) {
      setScreen('form'); setCat(null); setSubj(''); setMsg(''); setErr(false);
      fadeIn.setValue(0); slideUp.setValue(40);
      Animated.parallel([
        Animated.timing(fadeIn, { toValue: 1, duration: 400, useNativeDriver: true }),
        Animated.spring(slideUp, { toValue: 0, tension: 80, friction: 12, useNativeDriver: true }),
      ]).start();
    }
  }, [visible]);

  const animateResult = useCallback(() => {
    resultScale.setValue(0.7); resultFade.setValue(0);
    Animated.parallel([
      Animated.spring(resultScale, { toValue: 1, tension: 60, friction: 8, useNativeDriver: true }),
      Animated.timing(resultFade, { toValue: 1, duration: 350, useNativeDriver: true }),
    ]).start();
  }, [resultScale, resultFade]);

  const handleSend = useCallback(async () => {
    Keyboard.dismiss();
    if (!cat || subj.trim().length === 0 || msg.trim().length === 0) { setErr(true); return; }
    setErr(false); setScreen('sending');
    try {
      await api.post('/support', { category: cat, subject: subj.trim(), message: msg.trim() });
      setScreen('success'); animateResult();
    } catch { setScreen('error'); animateResult(); }
  }, [cat, subj, msg, animateResult]);

  const close = useCallback(() => { Keyboard.dismiss(); onClose(); }, [onClose]);

  // ── SENDING ──
  if (screen === 'sending') {
    return (
      <Modal visible={visible} animationType="slide" transparent={false} statusBarTranslucent>
        <StatusBar barStyle={isDark ? 'light-content' : 'dark-content'} translucent backgroundColor="transparent" />
        <View style={[st.root, st.center, { backgroundColor: theme.background, paddingTop: insets.top }]}>
          <View style={[st.sendingRing, { borderColor: `${gold}30` }]}>
            <ActivityIndicator size="large" color={gold} />
          </View>
          <Text style={[st.sendingText, { color: theme.subtext }]}>{tx(language, 'sending')}</Text>
        </View>
      </Modal>
    );
  }

  // ── RESULT ──
  if (screen === 'success' || screen === 'error') {
    const ok = screen === 'success';
    const accent = ok ? '#34C759' : '#FF3B30';
    return (
      <Modal visible={visible} animationType="slide" transparent={false} statusBarTranslucent>
        <StatusBar barStyle={isDark ? 'light-content' : 'dark-content'} translucent backgroundColor="transparent" />
        <View style={[st.root, st.center, { backgroundColor: theme.background, paddingTop: insets.top }]}>
          <Animated.View style={{ alignItems: 'center', opacity: resultFade, transform: [{ scale: resultScale }] }}>
            {/* Icon circle */}
            <View style={[st.resCircle, { backgroundColor: `${accent}10`, borderColor: `${accent}20` }]}>
              <View style={[st.resInner, { backgroundColor: `${accent}15` }]}>
                <Ionicons name={ok ? 'checkmark' : 'close'} size={36} color={accent} />
              </View>
            </View>

            <Text style={[st.resTitle, { color: theme.text }]}>{tx(language, ok ? 'okTitle' : 'errTitle')}</Text>
            <Text style={[st.resDesc, { color: theme.subtext }]}>{tx(language, ok ? 'okDesc' : 'errDesc')}</Text>

            <TouchableOpacity onPress={ok ? close : () => { setScreen('form'); animateResult(); }} activeOpacity={0.65}
              style={[st.resBtn, { backgroundColor: `${accent}10`, borderColor: `${accent}25` }]}>
              <Ionicons name={ok ? 'checkmark-done' : 'refresh'} size={16} color={accent} />
              <Text style={[st.resBtnT, { color: accent }]}>{tx(language, ok ? 'done' : 'retry')}</Text>
            </TouchableOpacity>
          </Animated.View>
        </View>
      </Modal>
    );
  }

  // ── FORM ──
  return (
    <Modal visible={visible} animationType="slide" transparent={false} statusBarTranslucent>
      <StatusBar barStyle={isDark ? 'light-content' : 'dark-content'} translucent backgroundColor="transparent" />
      <KeyboardAvoidingView style={[st.root, { backgroundColor: theme.background, paddingTop: insets.top }]} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>

        {/* Header */}
        <View style={st.hdr}>
          <TouchableOpacity onPress={close} style={st.hdrBtn} hitSlop={{ top: 14, bottom: 14, left: 14, right: 14 }}>
            <Ionicons name="chevron-down" size={22} color={theme.text} />
          </TouchableOpacity>
          <Text style={[st.hdrTitle, { color: theme.text }]}>{tx(language, 'title')}</Text>
          <View style={st.hdrBtn} />
        </View>

        <ScrollView contentContainerStyle={[st.scroll, { paddingBottom: insets.bottom + 40 }]} showsVerticalScrollIndicator={false} keyboardShouldPersistTaps="handled">
          <Animated.View style={{ opacity: fadeIn, transform: [{ translateY: slideUp }] }}>

            {/* Subtitle */}
            <Text style={[st.sub, { color: theme.subtext }]}>{tx(language, 'subtitle')}</Text>

            {/* Decorative line */}
            <View style={st.decoRow}>
              <View style={[st.decoLine, { backgroundColor: theme.border }]} />
              <View style={[st.decoDot, { backgroundColor: gold }]} />
              <View style={[st.decoLine, { backgroundColor: theme.border }]} />
            </View>

            {/* Category */}
            <Text style={[st.label, { color: theme.text }]}>{tx(language, 'cat')}</Text>
            <View style={st.catWrap}>
              {CATS.map((c, i) => {
                const on = cat === c.value;
                return (
                  <TouchableOpacity key={c.value} onPress={() => { setCat(c.value); setErr(false); }} activeOpacity={0.6}
                    style={[st.catCard, {
                      backgroundColor: on ? `${c.color}0D` : isDark ? '#131110' : '#FAFAF8',
                      borderColor: on ? `${c.color}45` : theme.border,
                      borderWidth: on ? 1.5 : 1,
                    }]}>
                    <View style={[st.catIconWrap, { backgroundColor: `${c.color}${on ? '18' : '0A'}` }]}>
                      <Ionicons name={c.icon} size={18} color={c.color} />
                    </View>
                    <Text style={[st.catText, { color: on ? c.color : theme.text }]}>{tx(language, c.value)}</Text>
                    {on && (
                      <View style={[st.catCheck, { backgroundColor: `${c.color}18` }]}>
                        <Ionicons name="checkmark" size={12} color={c.color} />
                      </View>
                    )}
                  </TouchableOpacity>
                );
              })}
            </View>

            {/* Subject */}
            <View style={st.fieldWrap}>
              <Text style={[st.label, { color: theme.text }]}>{tx(language, 'subject')}</Text>
              <View style={[st.inputWrap, { backgroundColor: isDark ? '#131110' : '#FAFAF8', borderColor: err && subj.trim().length === 0 ? '#FF3B30' + '60' : theme.border }]}>
                <Ionicons name="text-outline" size={16} color={theme.subtext + '50'} style={{ marginTop: 1 }} />
                <TextInput ref={subjRef} value={subj} onChangeText={t => { setSubj(t); setErr(false); }}
                  placeholder={tx(language, 'subjectPh')} placeholderTextColor={theme.subtext + '40'}
                  style={[st.input, { color: theme.text }]} returnKeyType="next"
                  onSubmitEditing={() => msgRef.current?.focus()} maxLength={120} />
              </View>
              <Text style={[st.charCount, { color: theme.subtext }]}>{subj.length}/120</Text>
            </View>

            {/* Message */}
            <View style={st.fieldWrap}>
              <Text style={[st.label, { color: theme.text }]}>{tx(language, 'message')}</Text>
              <View style={[st.inputWrap, st.inputWrapBig, { backgroundColor: isDark ? '#131110' : '#FAFAF8', borderColor: err && msg.trim().length === 0 ? '#FF3B30' + '60' : theme.border }]}>
                <TextInput ref={msgRef} value={msg} onChangeText={t => { setMsg(t); setErr(false); }}
                  placeholder={tx(language, 'messagePh')} placeholderTextColor={theme.subtext + '40'}
                  style={[st.input, st.inputBig, { color: theme.text }]} multiline textAlignVertical="top" maxLength={2000} />
              </View>
              <Text style={[st.charCount, { color: theme.subtext }]}>{msg.length}/2000</Text>
            </View>

            {/* Error */}
            {err && (
              <View style={st.errRow}>
                <View style={[st.errDot, { backgroundColor: '#FF3B30' }]} />
                <Text style={st.errText}>{tx(language, 'req')}</Text>
              </View>
            )}

            {/* Send */}
            <TouchableOpacity onPress={handleSend} activeOpacity={0.7}
              style={[st.sendBtn, { backgroundColor: gold }]}>
              <Ionicons name="paper-plane" size={15} color="#000" />
              <Text style={st.sendText}>{tx(language, 'send')}</Text>
            </TouchableOpacity>

          </Animated.View>
        </ScrollView>
      </KeyboardAvoidingView>
    </Modal>
  );
}

const st = StyleSheet.create({
  root: { flex: 1 },
  center: { alignItems: 'center', justifyContent: 'center', paddingHorizontal: 36 },

  // Header
  hdr: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 20, paddingVertical: 10 },
  hdrBtn: { width: 36, height: 36, borderRadius: 18, alignItems: 'center', justifyContent: 'center' },
  hdrTitle: { fontSize: 15, fontWeight: '600', letterSpacing: 0.3 },

  scroll: { paddingHorizontal: 20, paddingTop: 4 },
  sub: { fontSize: 14, fontWeight: '500', textAlign: 'center', opacity: 0.4, marginBottom: 16, fontFamily: SERIF, fontStyle: 'italic' },

  // Deco
  decoRow: { flexDirection: 'row', alignItems: 'center', gap: 10, marginBottom: 22 },
  decoLine: { flex: 1, height: StyleSheet.hairlineWidth },
  decoDot: { width: 5, height: 5, borderRadius: 2.5, opacity: 0.5 },

  // Categories
  label: { fontSize: 13, fontWeight: '700', letterSpacing: 0.2, marginBottom: 10, marginLeft: 2 },
  catWrap: { gap: 6, marginBottom: 26 },
  catCard: {
    flexDirection: 'row', alignItems: 'center', gap: 12,
    paddingHorizontal: 14, paddingVertical: 13, borderRadius: 14,
  },
  catIconWrap: { width: 36, height: 36, borderRadius: 11, alignItems: 'center', justifyContent: 'center' },
  catText: { fontSize: 14, fontWeight: '600', letterSpacing: 0.1, flex: 1 },
  catCheck: { width: 22, height: 22, borderRadius: 11, alignItems: 'center', justifyContent: 'center' },

  // Fields
  fieldWrap: { marginBottom: 20 },
  inputWrap: {
    flexDirection: 'row', alignItems: 'flex-start', gap: 10,
    borderRadius: 14, borderWidth: 1, paddingHorizontal: 14, paddingVertical: 12,
  },
  inputWrapBig: { minHeight: 130 },
  input: { flex: 1, fontSize: 14.5, fontWeight: '500', padding: 0, margin: 0 },
  inputBig: { minHeight: 106, textAlignVertical: 'top' },
  charCount: { fontSize: 10, fontWeight: '500', opacity: 0.3, textAlign: 'right', marginTop: 5, marginRight: 4 },

  // Error
  errRow: { flexDirection: 'row', alignItems: 'center', gap: 7, marginBottom: 18, paddingLeft: 4 },
  errDot: { width: 6, height: 6, borderRadius: 3 },
  errText: { color: '#FF3B30', fontSize: 12.5, fontWeight: '600' },

  // Send
  sendBtn: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 9,
    paddingVertical: 16, borderRadius: 14, marginTop: 4,
    shadowColor: '#000', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.15, shadowRadius: 12, elevation: 6,
  },
  sendText: { color: '#000', fontSize: 15, fontWeight: '700', letterSpacing: 0.3 },

  // Sending
  sendingRing: { width: 80, height: 80, borderRadius: 40, borderWidth: 2, alignItems: 'center', justifyContent: 'center', marginBottom: 16 },
  sendingText: { fontSize: 14, fontWeight: '600', opacity: 0.5 },

  // Result
  resCircle: { width: 100, height: 100, borderRadius: 50, borderWidth: 1.5, alignItems: 'center', justifyContent: 'center', marginBottom: 24 },
  resInner: { width: 70, height: 70, borderRadius: 35, alignItems: 'center', justifyContent: 'center' },
  resTitle: { fontSize: 22, fontWeight: '800', letterSpacing: -0.3, marginBottom: 8, fontFamily: SERIF },
  resDesc: { fontSize: 14, lineHeight: 21, opacity: 0.5, textAlign: 'center', marginBottom: 32, paddingHorizontal: 10 },
  resBtn: {
    flexDirection: 'row', alignItems: 'center', gap: 8,
    paddingHorizontal: 28, paddingVertical: 14, borderRadius: 14, borderWidth: 1,
  },
  resBtnT: { fontSize: 14.5, fontWeight: '700', letterSpacing: 0.2 },
});