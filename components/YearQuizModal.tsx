// components/YearQuizModal.tsx — daily "Guess the Year" quiz.
// One mystery story per day (image + title only), 3 tries to guess the year,
// 500 XP on success. Hot/cold hints after each miss. Once per day, per user.
import { CalendarClock, Share2, X } from 'lucide-react-native';
import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  Animated,
  KeyboardAvoidingView,
  Modal,
  Platform,
  ScrollView,
  Share,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { getStoreUrl } from '../config/urls';
import { useLanguage } from '../context/LanguageContext';
import { useRevenueCat } from '../context/RevenueCatContext';
import { useTheme } from '../context/ThemeContext';
import { useGamificationStore } from '../store/useGamificationStore';
import { haptic } from '../utils/haptics';
import { maybeRequestReview } from '../utils/review';
import {
  buildShareGrid,
  extractYear,
  isYearQuizDone,
  markYearQuizDone,
  maskYearInTitle,
  pickDailyEvent,
  todayIso,
  YEAR_QUIZ_TRIES,
  YEAR_QUIZ_XP,
} from '../utils/yearQuiz';
import EventImage from './EventImage';

const SERIF = Platform.OS === 'ios' ? 'Georgia' : 'serif';

// ── Translations ──────────────────────────────────────────────────────────────
const T: Record<string, Record<string, string>> = {
  en: {
    title: 'Guess the Year', subtitle: 'One mystery story a day · 500 XP',
    prompt: 'In which year did this happen?', placeholder: 'e.g. 1969',
    submit: 'Guess', tries: '{n} of 3 tries',
    hintEarlier: 'Earlier — try a smaller year', hintLater: 'Later — try a bigger year',
    win: 'Nailed it! +500 XP', winSub: 'It happened in {year}.',
    lose: 'Out of tries!', loseSub: 'It happened in {year}. Come back tomorrow!',
    done: 'Continue', share: 'Share result',
    shareTitle: 'Daily History · Guess the Year',
    already: 'Quiz completed today!', alreadySub: 'Come back tomorrow for a new mystery story and 500 XP!',
    unavailable: 'No story available today. Check back later!',
  },
  ro: {
    title: 'Ghicește Anul', subtitle: 'O poveste misterioasă pe zi · 500 XP',
    prompt: 'În ce an s-a întâmplat?', placeholder: 'ex. 1969',
    submit: 'Ghicește', tries: '{n} din 3 încercări',
    hintEarlier: 'Mai devreme — încearcă un an mai mic', hintLater: 'Mai târziu — încearcă un an mai mare',
    win: 'Bravo! +500 XP', winSub: 'S-a întâmplat în {year}.',
    lose: 'Ai epuizat încercările!', loseSub: 'S-a întâmplat în {year}. Revino mâine!',
    done: 'Continuă', share: 'Distribuie rezultatul',
    shareTitle: 'Daily History · Ghicește Anul',
    already: 'Quiz completat azi!', alreadySub: 'Revino mâine pentru o nouă poveste misterioasă și 500 XP!',
    unavailable: 'Nicio poveste disponibilă azi. Revino mai târziu!',
  },
  fr: {
    title: "Devinez l'Année", subtitle: 'Une histoire mystère par jour · 500 XP',
    prompt: 'En quelle année cela s\'est-il passé ?', placeholder: 'ex. 1969',
    submit: 'Deviner', tries: '{n} sur 3 essais',
    hintEarlier: 'Plus tôt — essayez une année plus petite', hintLater: 'Plus tard — essayez une année plus grande',
    win: 'Bravo ! +500 XP', winSub: "C'était en {year}.",
    lose: "Plus d'essais !", loseSub: "C'était en {year}. Revenez demain !",
    done: 'Continuer', share: 'Partager le résultat',
    shareTitle: "Daily History · Devinez l'Année",
    already: "Quiz complété aujourd'hui !", alreadySub: 'Revenez demain pour une nouvelle histoire mystère et 500 XP !',
    unavailable: "Pas d'histoire disponible aujourd'hui. Revenez plus tard !",
  },
  de: {
    title: 'Errate das Jahr', subtitle: 'Eine Mysterygeschichte pro Tag · 500 XP',
    prompt: 'In welchem Jahr geschah dies?', placeholder: 'z. B. 1969',
    submit: 'Raten', tries: '{n} von 3 Versuchen',
    hintEarlier: 'Früher — versuche ein kleineres Jahr', hintLater: 'Später — versuche ein größeres Jahr',
    win: 'Getroffen! +500 XP', winSub: 'Es geschah im Jahr {year}.',
    lose: 'Keine Versuche mehr!', loseSub: 'Es geschah im Jahr {year}. Komm morgen wieder!',
    done: 'Weiter', share: 'Ergebnis teilen',
    shareTitle: 'Daily History · Errate das Jahr',
    already: 'Quiz heute abgeschlossen!', alreadySub: 'Komm morgen für eine neue Mysterygeschichte und 500 XP wieder!',
    unavailable: 'Heute keine Geschichte verfügbar. Schau später vorbei!',
  },
  es: {
    title: 'Adivina el Año', subtitle: 'Una historia misteriosa al día · 500 XP',
    prompt: '¿En qué año ocurrió esto?', placeholder: 'ej. 1969',
    submit: 'Adivinar', tries: '{n} de 3 intentos',
    hintEarlier: 'Antes — prueba un año menor', hintLater: 'Después — prueba un año mayor',
    win: '¡Acertaste! +500 XP', winSub: 'Ocurrió en {year}.',
    lose: '¡Sin intentos!', loseSub: 'Ocurrió en {year}. ¡Vuelve mañana!',
    done: 'Continuar', share: 'Compartir resultado',
    shareTitle: 'Daily History · Adivina el Año',
    already: '¡Quiz completado hoy!', alreadySub: '¡Vuelve mañana por una nueva historia misteriosa y 500 XP!',
    unavailable: '¡No hay historia disponible hoy. Vuelve más tarde!',
  },
};
const tx = (lang: string, k: string) => (T[lang] ?? T.en)[k] ?? T.en[k] ?? k;

type Phase = 'playing' | 'won' | 'lost' | 'already' | 'unavailable';

export default function YearQuizModal({
  visible, onClose, events,
}: {
  visible: boolean; onClose: () => void; events: any[];
}) {
  const { theme, isDark } = useTheme();
  const { language } = useLanguage();
  const insets = useSafeAreaInsets();
  const { isPro } = useRevenueCat();
  const addQuizXP = useGamificationStore(s => s.addQuizXP);
  const recordQuizDone = useGamificationStore(s => s.recordQuizDone);

  const gold = isDark ? '#E8B84D' : '#C77E08';
  const bg = isDark ? '#0D0A07' : '#FAF8F3';
  const cardBorder = isDark ? '#2A2420' : '#E5E0D5';

  const [phase, setPhase] = useState<Phase>('playing');
  const [event, setEvent] = useState<any | null>(null);
  const [guess, setGuess] = useState('');
  const [wrongGuesses, setWrongGuesses] = useState<number[]>([]);
  const finalized = useRef(false);

  const fadeIn = useRef(new Animated.Value(0)).current;
  const shake = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    if (!visible) return;
    let cancelled = false;
    finalized.current = false;
    setGuess('');
    setWrongGuesses([]);
    fadeIn.setValue(0);
    Animated.timing(fadeIn, { toValue: 1, duration: 300, useNativeDriver: true }).start();

    (async () => {
      const done = await isYearQuizDone(todayIso());
      if (cancelled) return;
      if (done) { setPhase('already'); return; }
      const picked = pickDailyEvent(events, todayIso());
      setEvent(picked);
      setPhase(picked ? 'playing' : 'unavailable');
    })();

    return () => { cancelled = true; };
  }, [visible, events]);

  const answerYear = event ? extractYear(event) : 0;

  const finalize = useCallback((won: boolean) => {
    if (finalized.current) return;
    finalized.current = true;
    if (won) addQuizXP(YEAR_QUIZ_XP, isPro);
    recordQuizDone();
    markYearQuizDone(todayIso());
    setPhase(won ? 'won' : 'lost');
    haptic(won ? 'success' : 'error');
    if (won) maybeRequestReview();
  }, [addQuizXP, recordQuizDone, isPro]);

  const onGuess = useCallback(() => {
    const y = parseInt(guess.trim(), 10);
    if (!Number.isFinite(y) || guess.trim().length === 0) return;
    haptic('selection');
    if (y === answerYear) { finalize(true); return; }

    haptic('error');
    Animated.sequence([
      Animated.timing(shake, { toValue: 8, duration: 55, useNativeDriver: true }),
      Animated.timing(shake, { toValue: -8, duration: 55, useNativeDriver: true }),
      Animated.timing(shake, { toValue: 5, duration: 55, useNativeDriver: true }),
      Animated.timing(shake, { toValue: 0, duration: 55, useNativeDriver: true }),
    ]).start();

    const next = [...wrongGuesses, y];
    setWrongGuesses(next);
    setGuess('');
    if (next.length >= YEAR_QUIZ_TRIES) finalize(false);
  }, [guess, answerYear, wrongGuesses, finalize, shake]);

  const rawTitle = event?.titleTranslations?.[language] ?? event?.titleTranslations?.en ?? '';
  // While playing, a title that spells out the year would hand over the answer.
  const title = phase === 'playing' ? maskYearInTitle(rawTitle, answerYear) : rawTitle;

  const onShare = useCallback(() => {
    haptic('medium');
    const grid = buildShareGrid(wrongGuesses, answerYear, phase === 'won');
    Share.share({
      message: `${tx(language, 'shareTitle')} · ${todayIso()}\n${grid}\n${getStoreUrl()}`,
    }).catch(() => {});
  }, [wrongGuesses, answerYear, phase, language]);

  if (!visible) return null;

  const lastWrong = wrongGuesses[wrongGuesses.length - 1];
  const hint = lastWrong !== undefined
    ? (lastWrong > answerYear ? tx(language, 'hintEarlier') : tx(language, 'hintLater'))
    : null;
  const triesUsed = wrongGuesses.length;

  return (
    <Modal visible={visible} animationType="fade" transparent statusBarTranslucent>
      <View style={[st.overlay, { backgroundColor: isDark ? 'rgba(0,0,0,0.8)' : 'rgba(0,0,0,0.5)' }]}>
        <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined} style={{ flex: 1 }}>
          <View style={[st.sheet, { backgroundColor: bg, paddingTop: insets.top + 8, paddingBottom: insets.bottom + 16 }]}>

            {/* Header */}
            <View style={st.header}>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10, flex: 1 }}>
                <CalendarClock size={22} color={gold} />
                <View>
                  <Text style={[st.title, { color: theme.text }]}>{tx(language, 'title')}</Text>
                  <Text style={[st.subtitle, { color: gold }]}>{tx(language, 'subtitle')}</Text>
                </View>
              </View>
              <TouchableOpacity onPress={() => { haptic('light'); onClose(); }} style={[st.closeBtn, { borderColor: cardBorder }]}>
                <X size={16} color={theme.subtext} strokeWidth={2.5} />
              </TouchableOpacity>
            </View>

            <ScrollView
              contentContainerStyle={{ paddingHorizontal: 20, paddingBottom: 24, flexGrow: 1 }}
              keyboardShouldPersistTaps="handled"
              showsVerticalScrollIndicator={false}
            >
              {(phase === 'already' || phase === 'unavailable') ? (
                <View style={st.stateWrap}>
                  <View style={[st.stateIcon, { backgroundColor: gold + '18' }]}>
                    <CalendarClock size={30} color={gold} strokeWidth={1.8} />
                  </View>
                  <Text style={[st.stateTitle, { color: theme.text }]}>
                    {tx(language, phase === 'already' ? 'already' : 'unavailable')}
                  </Text>
                  {phase === 'already' && (
                    <Text style={[st.stateSub, { color: theme.subtext }]}>{tx(language, 'alreadySub')}</Text>
                  )}
                  <TouchableOpacity onPress={() => { haptic('light'); onClose(); }} activeOpacity={0.85}
                    style={[st.cta, { backgroundColor: gold }]}>
                    <Text style={st.ctaText}>{tx(language, 'done')}</Text>
                  </TouchableOpacity>
                </View>
              ) : (phase === 'won' || phase === 'lost') ? (
                <Animated.View style={[st.stateWrap, { opacity: fadeIn }]}>
                  <Text style={{ fontSize: 52, marginBottom: 4 }}>{phase === 'won' ? '🎉' : '⏳'}</Text>
                  <Text style={[st.stateTitle, { color: phase === 'won' ? gold : theme.text }]}>
                    {tx(language, phase === 'won' ? 'win' : 'lose')}
                  </Text>
                  <Text style={[st.stateSub, { color: theme.subtext }]}>
                    {tx(language, phase === 'won' ? 'winSub' : 'loseSub').replace('{year}', String(answerYear))}
                  </Text>
                  {!!event && (
                    <View style={[st.imageWrap, { borderColor: cardBorder, marginTop: 16 }]}>
                      <EventImage event={event} style={st.image} />
                    </View>
                  )}
                  {!!title && <Text style={[st.storyTitle, { color: theme.text, marginTop: 12 }]}>{title}</Text>}

                  {/* Result grid — closeness only, never direction, so a shared
                      grid can't hand the next player a bisection of the answer. */}
                  <Text style={st.grid}>{buildShareGrid(wrongGuesses, answerYear, phase === 'won')}</Text>

                  <View style={st.resultBtns}>
                    <TouchableOpacity onPress={onShare} activeOpacity={0.85}
                      style={[st.shareBtn, { borderColor: gold }]}>
                      <Share2 size={15} color={gold} strokeWidth={2.4} />
                      <Text style={[st.shareBtnText, { color: gold }]}>{tx(language, 'share')}</Text>
                    </TouchableOpacity>
                    <TouchableOpacity onPress={() => { haptic('light'); onClose(); }} activeOpacity={0.85}
                      style={[st.cta, { backgroundColor: gold, marginTop: 0 }]}>
                      <Text style={st.ctaText}>{tx(language, 'done')}</Text>
                    </TouchableOpacity>
                  </View>
                </Animated.View>
              ) : (
                <Animated.View style={{ opacity: fadeIn }}>
                  {/* Mystery story: image + title only — no text that could leak the year */}
                  <View style={[st.imageWrap, { borderColor: cardBorder }]}>
                    <EventImage event={event ?? {}} style={st.image} />
                  </View>
                  <Text style={[st.storyTitle, { color: theme.text }]}>{title}</Text>

                  <Text style={[st.prompt, { color: theme.subtext }]}>{tx(language, 'prompt')}</Text>

                  {/* Attempt dots */}
                  <View style={st.dotsRow}>
                    {Array.from({ length: YEAR_QUIZ_TRIES }).map((_, i) => (
                      <View key={i} style={[st.dot, {
                        backgroundColor: i < triesUsed ? '#EF4444' : (isDark ? '#2A2420' : '#E5E0D5'),
                      }]} />
                    ))}
                    <Text style={[st.triesText, { color: theme.subtext }]}>
                      {tx(language, 'tries').replace('{n}', String(Math.min(triesUsed + 1, YEAR_QUIZ_TRIES)))}
                    </Text>
                  </View>

                  {/* Hint after a miss */}
                  {hint && (
                    <View style={[st.hintChip, {
                      backgroundColor: gold + '15', borderColor: gold + '45',
                    }]}>
                      <Text style={[st.hintText, { color: gold }]}>
                        {lastWrong} → {hint}
                      </Text>
                    </View>
                  )}

                  {/* Year input + guess button */}
                  <Animated.View style={[st.inputRow, {
                    backgroundColor: isDark ? '#1C1915' : '#FFFFFF',
                    borderColor: cardBorder,
                    transform: [{ translateX: shake }],
                  }]}>
                    <TextInput
                      value={guess}
                      onChangeText={(v) => setGuess(v.replace(/[^0-9]/g, ''))}
                      placeholder={tx(language, 'placeholder')}
                      placeholderTextColor={theme.subtext + '80'}
                      keyboardType="number-pad"
                      maxLength={4}
                      returnKeyType="done"
                      onSubmitEditing={onGuess}
                      style={[st.input, { color: theme.text }]}
                    />
                    <TouchableOpacity
                      onPress={onGuess}
                      disabled={guess.trim().length === 0}
                      activeOpacity={0.85}
                      style={[st.guessBtn, { backgroundColor: gold, opacity: guess.trim().length === 0 ? 0.45 : 1 }]}
                    >
                      <Text style={st.guessBtnText}>{tx(language, 'submit')}</Text>
                    </TouchableOpacity>
                  </Animated.View>
                </Animated.View>
              )}
            </ScrollView>
          </View>
        </KeyboardAvoidingView>
      </View>
    </Modal>
  );
}

const st = StyleSheet.create({
  overlay: { flex: 1 },
  sheet: { flex: 1 },
  header: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    paddingHorizontal: 20, paddingVertical: 14,
  },
  title: { fontSize: 20, fontWeight: '800', letterSpacing: -0.4, fontFamily: SERIF },
  subtitle: { fontSize: 12, fontWeight: '700', marginTop: 2 },
  closeBtn: { width: 36, height: 36, borderRadius: 12, borderWidth: 1, alignItems: 'center', justifyContent: 'center' },

  imageWrap: { borderRadius: 18, borderWidth: 1, overflow: 'hidden' },
  image: { width: '100%', aspectRatio: 16 / 10 },
  storyTitle: {
    fontSize: 19, fontWeight: '800', letterSpacing: -0.3, fontFamily: SERIF,
    lineHeight: 26, marginTop: 14, textAlign: 'center',
  },
  prompt: { fontSize: 13.5, fontWeight: '600', textAlign: 'center', marginTop: 10 },

  dotsRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 7, marginTop: 14 },
  dot: { width: 10, height: 10, borderRadius: 5 },
  triesText: { fontSize: 11.5, fontWeight: '700', marginLeft: 6 },

  hintChip: {
    alignSelf: 'center', paddingHorizontal: 14, paddingVertical: 8,
    borderRadius: 12, borderWidth: 1, marginTop: 12,
  },
  hintText: { fontSize: 13, fontWeight: '800', letterSpacing: 0.2 },

  inputRow: {
    flexDirection: 'row', alignItems: 'center', gap: 8,
    borderRadius: 16, borderWidth: 1.5, paddingLeft: 18, paddingRight: 8,
    height: 58, marginTop: 16,
  },
  input: { flex: 1, fontSize: 22, fontWeight: '800', letterSpacing: 2, fontFamily: SERIF, paddingVertical: 0 },
  guessBtn: { paddingHorizontal: 20, height: 42, borderRadius: 12, alignItems: 'center', justifyContent: 'center' },
  guessBtnText: { color: '#1a1208', fontWeight: '900', fontSize: 14, letterSpacing: 0.3 },

  stateWrap: { flex: 1, alignItems: 'center', justifyContent: 'center', paddingVertical: 32 },
  stateIcon: { width: 76, height: 76, borderRadius: 26, alignItems: 'center', justifyContent: 'center', marginBottom: 14 },
  stateTitle: { fontSize: 21, fontWeight: '800', letterSpacing: -0.4, fontFamily: SERIF, textAlign: 'center' },
  stateSub: { fontSize: 13.5, fontWeight: '600', textAlign: 'center', marginTop: 8, lineHeight: 19, paddingHorizontal: 12 },
  cta: { paddingHorizontal: 32, height: 48, borderRadius: 14, alignItems: 'center', justifyContent: 'center', marginTop: 22 },
  ctaText: { color: '#1a1208', fontWeight: '900', fontSize: 15, letterSpacing: 0.3 },

  grid: { fontSize: 26, letterSpacing: 4, marginTop: 16, textAlign: 'center' },
  resultBtns: { flexDirection: 'row', alignItems: 'center', gap: 10, marginTop: 22 },
  shareBtn: {
    flexDirection: 'row', alignItems: 'center', gap: 7,
    paddingHorizontal: 18, height: 48, borderRadius: 14, borderWidth: 1.5,
  },
  shareBtnText: { fontWeight: '900', fontSize: 14, letterSpacing: 0.3 },
});
