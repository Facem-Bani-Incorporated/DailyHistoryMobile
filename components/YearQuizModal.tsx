// components/YearQuizModal.tsx — daily "Guess the Year" quiz.
// One mystery story per day (image + title only), 3 tries to guess the year,
// 500 XP on success. Hot/cold hints after each miss. Once per day, per user.
//
// Visual language matches CoinRewardModal: the vibrant gold ramp on theme
// surfaces, Georgia for display text, and system sans with tabular figures for
// anything numeric (years must never be ambiguous to read).
import { LinearGradient } from 'expo-linear-gradient';
import { Check, Clock, Share2, X } from 'lucide-react-native';
import React, { useCallback, useEffect, useRef, useState } from 'react';
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
  closenessOf,
  extractYear,
  isYearQuizDone,
  markYearQuizDone,
  maskYearInTitle,
  pickDailyEvent,
  shareScore,
  todayIso,
  YEAR_QUIZ_TRIES,
  YEAR_QUIZ_XP,
} from '../utils/yearQuiz';
import EventImage from './EventImage';
import XpBoostOffer from './XpBoostOffer';

const SERIF = Platform.OS === 'ios' ? 'Georgia' : 'serif';
const SANS = Platform.OS === 'ios' ? 'System' : 'sans-serif';
// Digits carry the whole game — tabular figures keep them fixed-width and
// unmistakable at any size.
const NUM: any = { fontFamily: SANS, fontVariant: ['tabular-nums'] };

// Same vibrant ramp as CoinRewardModal so gold reads identically across themes.
const GOLD_LIGHT = '#F7D774';
const GOLD = '#E8B84D';
const GOLD_DEEP = '#D4A017';
const INK = '#3A2A05';

// ── Translations ──────────────────────────────────────────────────────────────
const T: Record<string, Record<string, string>> = {
  en: {
    kicker: 'DAILY PUZZLE', title: 'Guess the Year', subtitle: 'One mystery story a day · 500 XP',
    prompt: 'In which year did this happen?', placeholder: '····',
    submit: 'Guess', triesLeft: '{n} left',
    hintEarlier: 'Earlier — try a smaller year', hintLater: 'Later — try a bigger year',
    win: 'Nailed it!', lose: 'Out of tries',
    theYear: 'The year was', comeBack: 'Come back tomorrow for a new story.',
    done: 'Continue', share: 'Share',
    shareTitle: 'Daily History · Guess the Year',
    already: 'Solved for today', alreadySub: 'Come back tomorrow for a new mystery story and 500 XP.',
    unavailable: 'No story available today', unavailableSub: 'Check back a little later.',
  },
  ro: {
    kicker: 'PUZZLE-UL ZILEI', title: 'Ghicește Anul', subtitle: 'O poveste misterioasă pe zi · 500 XP',
    prompt: 'În ce an s-a întâmplat?', placeholder: '····',
    submit: 'Ghicește', triesLeft: '{n} rămase',
    hintEarlier: 'Mai devreme — încearcă un an mai mic', hintLater: 'Mai târziu — încearcă un an mai mare',
    win: 'Bravo!', lose: 'Fără încercări',
    theYear: 'Anul a fost', comeBack: 'Revino mâine pentru o poveste nouă.',
    done: 'Continuă', share: 'Distribuie',
    shareTitle: 'Daily History · Ghicește Anul',
    already: 'Rezolvat pentru azi', alreadySub: 'Revino mâine pentru o nouă poveste misterioasă și 500 XP.',
    unavailable: 'Nicio poveste azi', unavailableSub: 'Revino puțin mai târziu.',
  },
  fr: {
    kicker: 'ÉNIGME DU JOUR', title: "Devinez l'Année", subtitle: 'Une histoire mystère par jour · 500 XP',
    prompt: "En quelle année cela s'est-il passé ?", placeholder: '····',
    submit: 'Deviner', triesLeft: '{n} restants',
    hintEarlier: 'Plus tôt — essayez une année plus petite', hintLater: 'Plus tard — essayez une année plus grande',
    win: 'Bravo !', lose: "Plus d'essais",
    theYear: "C'était en", comeBack: 'Revenez demain pour une nouvelle histoire.',
    done: 'Continuer', share: 'Partager',
    shareTitle: "Daily History · Devinez l'Année",
    already: "Résolu pour aujourd'hui", alreadySub: 'Revenez demain pour une nouvelle histoire mystère et 500 XP.',
    unavailable: "Pas d'histoire aujourd'hui", unavailableSub: 'Revenez un peu plus tard.',
  },
  de: {
    kicker: 'TAGESRÄTSEL', title: 'Errate das Jahr', subtitle: 'Eine Mysterygeschichte pro Tag · 500 XP',
    prompt: 'In welchem Jahr geschah dies?', placeholder: '····',
    submit: 'Raten', triesLeft: 'noch {n}',
    hintEarlier: 'Früher — versuche ein kleineres Jahr', hintLater: 'Später — versuche ein größeres Jahr',
    win: 'Getroffen!', lose: 'Keine Versuche',
    theYear: 'Das Jahr war', comeBack: 'Komm morgen für eine neue Geschichte wieder.',
    done: 'Weiter', share: 'Teilen',
    shareTitle: 'Daily History · Errate das Jahr',
    already: 'Heute gelöst', alreadySub: 'Komm morgen für eine neue Mysterygeschichte und 500 XP wieder.',
    unavailable: 'Heute keine Geschichte', unavailableSub: 'Schau etwas später vorbei.',
  },
  es: {
    kicker: 'PUZLE DIARIO', title: 'Adivina el Año', subtitle: 'Una historia misteriosa al día · 500 XP',
    prompt: '¿En qué año ocurrió esto?', placeholder: '····',
    submit: 'Adivinar', triesLeft: '{n} restantes',
    hintEarlier: 'Antes — prueba un año menor', hintLater: 'Después — prueba un año mayor',
    win: '¡Acertaste!', lose: 'Sin intentos',
    theYear: 'El año fue', comeBack: 'Vuelve mañana por una nueva historia.',
    done: 'Continuar', share: 'Compartir',
    shareTitle: 'Daily History · Adivina el Año',
    already: 'Resuelto por hoy', alreadySub: 'Vuelve mañana por una nueva historia misteriosa y 500 XP.',
    unavailable: 'No hay historia hoy', unavailableSub: 'Vuelve un poco más tarde.',
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

  // Premium ships extra tokens; dark/light don't — fall back to the base palette.
  const surface = (theme as any).card ?? theme.background;
  const line = (theme as any).cardBorder ?? theme.border;
  const inputBg = (theme as any).inputBg ?? (isDark ? '#00000040' : '#FFFFFF');

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
    Animated.timing(fadeIn, { toValue: 1, duration: 280, useNativeDriver: true }).start();

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
      Animated.timing(shake, { toValue: 7, duration: 55, useNativeDriver: true }),
      Animated.timing(shake, { toValue: -7, duration: 55, useNativeDriver: true }),
      Animated.timing(shake, { toValue: 4, duration: 55, useNativeDriver: true }),
      Animated.timing(shake, { toValue: 0, duration: 55, useNativeDriver: true }),
    ]).start();

    const next = [...wrongGuesses, y];
    setWrongGuesses(next);
    setGuess('');
    if (next.length >= YEAR_QUIZ_TRIES) finalize(false);
  }, [guess, answerYear, wrongGuesses, finalize, shake]);

  const onShare = useCallback(() => {
    haptic('medium');
    Share.share({
      message: `${tx(language, 'shareTitle')} · ${todayIso()}\n${shareScore(wrongGuesses, phase === 'won')}\n${getStoreUrl()}`,
    }).catch(() => {});
  }, [wrongGuesses, phase, language]);

  if (!visible) return null;

  const rawTitle = event?.titleTranslations?.[language] ?? event?.titleTranslations?.en ?? '';
  // While playing, a title that spells out the year would hand over the answer.
  const title = phase === 'playing' ? maskYearInTitle(rawTitle, answerYear) : rawTitle;

  const lastWrong = wrongGuesses[wrongGuesses.length - 1];
  const hint = lastWrong !== undefined
    ? (lastWrong > answerYear ? tx(language, 'hintEarlier') : tx(language, 'hintLater'))
    : null;
  const isResult = phase === 'won' || phase === 'lost';
  const isState = phase === 'already' || phase === 'unavailable';

  // Attempt chips: a filled slot per guess (coloured by closeness), empty slots
  // for what's left. No direction is encoded — that stays in the live hint only.
  const chipColors = (i: number) => {
    const g = wrongGuesses[i];
    if (g === undefined) return { bg: 'transparent', border: line, text: theme.subtext };
    const c = closenessOf(g, answerYear);
    if (c === 'close') return { bg: GOLD + '1F', border: GOLD + '80', text: isDark ? GOLD_LIGHT : GOLD_DEEP };
    return { bg: 'transparent', border: line, text: theme.subtext };
  };

  return (
    <Modal visible={visible} animationType="slide" transparent={false} statusBarTranslucent>
      <View style={[s.root, { backgroundColor: theme.background }]}>
        <LinearGradient
          colors={[GOLD + (isDark ? '14' : '10'), 'transparent']}
          style={s.topGlow}
          pointerEvents="none"
        />

        <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined} style={{ flex: 1 }}>
          {/* Header */}
          <View style={[s.header, { paddingTop: insets.top + 10 }]}>
            <View style={{ flex: 1 }}>
              <Text style={[s.kicker, { color: isDark ? GOLD : GOLD_DEEP }]}>{tx(language, 'kicker')}</Text>
              <Text style={[s.title, { color: theme.text }]}>{tx(language, 'title')}</Text>
              <Text style={[s.subtitle, { color: theme.subtext }]}>{tx(language, 'subtitle')}</Text>
            </View>
            <TouchableOpacity
              onPress={() => { haptic('light'); onClose(); }}
              style={[s.closeBtn, { backgroundColor: surface, borderColor: line }]}
              activeOpacity={0.75}
              hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
            >
              <X size={17} color={theme.subtext} strokeWidth={2.4} />
            </TouchableOpacity>
          </View>

          <ScrollView
            contentContainerStyle={{ paddingHorizontal: 20, paddingBottom: insets.bottom + 28, flexGrow: 1 }}
            keyboardShouldPersistTaps="handled"
            showsVerticalScrollIndicator={false}
          >
            {isState ? (
              <View style={s.stateWrap}>
                <View style={[s.stateIcon, { backgroundColor: GOLD + '18', borderColor: GOLD + '40' }]}>
                  <Clock size={28} color={isDark ? GOLD : GOLD_DEEP} strokeWidth={1.9} />
                </View>
                <Text style={[s.stateTitle, { color: theme.text }]}>
                  {tx(language, phase === 'already' ? 'already' : 'unavailable')}
                </Text>
                <Text style={[s.stateSub, { color: theme.subtext }]}>
                  {tx(language, phase === 'already' ? 'alreadySub' : 'unavailableSub')}
                </Text>
                <TouchableOpacity onPress={() => { haptic('light'); onClose(); }} activeOpacity={0.9} style={s.ctaWrap}>
                  <LinearGradient colors={[GOLD_LIGHT, GOLD_DEEP]} start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }} style={s.cta}>
                    <Text style={s.ctaText}>{tx(language, 'done')}</Text>
                  </LinearGradient>
                </TouchableOpacity>
              </View>
            ) : isResult ? (
              <Animated.View style={[{ opacity: fadeIn }, s.resultWrap]}>
                <View style={[
                  s.resultIcon,
                  phase === 'won'
                    ? { backgroundColor: GOLD, borderColor: GOLD_LIGHT }
                    : { backgroundColor: surface, borderColor: line },
                ]}>
                  {phase === 'won'
                    ? <Check size={30} color={INK} strokeWidth={3} />
                    : <Clock size={28} color={theme.subtext} strokeWidth={2} />}
                </View>

                <Text style={[s.resultTitle, { color: theme.text }]}>
                  {tx(language, phase === 'won' ? 'win' : 'lose')}
                </Text>

                {phase === 'won' && (
                  <View style={[s.xpBadge, { backgroundColor: GOLD + '1F', borderColor: GOLD + '55' }]}>
                    <Text style={[s.xpBadgeText, { color: isDark ? GOLD_LIGHT : GOLD_DEEP }]}>
                      +{YEAR_QUIZ_XP} XP
                    </Text>
                  </View>
                )}

                {/* The answer — the one number that matters, given room to breathe */}
                <Text style={[s.answerLabel, { color: theme.subtext }]}>{tx(language, 'theYear')}</Text>
                <Text style={[s.answerYear, NUM, { color: isDark ? GOLD_LIGHT : GOLD_DEEP }]}>{answerYear}</Text>

                {!!event && (
                  <View style={[s.thumbRow, { backgroundColor: surface, borderColor: line }]}>
                    <View style={s.thumb}><EventImage event={event} style={s.thumbImg} showLoader={false} /></View>
                    <Text style={[s.thumbTitle, { color: theme.text }]} numberOfLines={3}>{title}</Text>
                  </View>
                )}

                {phase === 'lost' && (
                  <Text style={[s.stateSub, { color: theme.subtext, marginTop: 14 }]}>{tx(language, 'comeBack')}</Text>
                )}

                {/* Opt-in rewarded offer. Placed above Share so it never sits
                    between the player and the share action, which is the growth
                    mechanic here. */}
                {phase === 'won' && (
                  <View style={{ alignSelf: 'stretch', marginTop: 18 }}>
                    <XpBoostOffer xpEarned={YEAR_QUIZ_XP} placement="year_quiz_result" />
                  </View>
                )}

                <View style={s.resultBtns}>
                  <TouchableOpacity onPress={onShare} activeOpacity={0.8}
                    style={[s.shareBtn, { borderColor: line, backgroundColor: surface }]}>
                    <Share2 size={15} color={theme.subtext} strokeWidth={2.3} />
                    <Text style={[s.shareBtnText, { color: theme.subtext }]}>{tx(language, 'share')}</Text>
                  </TouchableOpacity>
                  <TouchableOpacity onPress={() => { haptic('light'); onClose(); }} activeOpacity={0.9} style={{ flex: 1 }}>
                    <LinearGradient colors={[GOLD_LIGHT, GOLD_DEEP]} start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }} style={s.cta}>
                      <Text style={s.ctaText}>{tx(language, 'done')}</Text>
                    </LinearGradient>
                  </TouchableOpacity>
                </View>
              </Animated.View>
            ) : (
              <Animated.View style={{ opacity: fadeIn }}>
                {/* Mystery story — image + title only, nothing that leaks the year */}
                <View style={[s.imageWrap, { borderColor: line }]}>
                  <EventImage event={event ?? {}} style={s.image} />
                  <LinearGradient
                    colors={['transparent', 'rgba(0,0,0,0.55)']}
                    style={s.imageScrim}
                    pointerEvents="none"
                  />
                </View>

                <Text style={[s.storyTitle, { color: theme.text }]}>{title}</Text>
                <Text style={[s.prompt, { color: theme.subtext }]}>{tx(language, 'prompt')}</Text>

                {/* Attempt slots */}
                <View style={s.chipsRow}>
                  {Array.from({ length: YEAR_QUIZ_TRIES }).map((_, i) => {
                    const c = chipColors(i);
                    const g = wrongGuesses[i];
                    return (
                      <View key={i} style={[s.chip, { backgroundColor: c.bg, borderColor: c.border }]}>
                        <Text style={[s.chipText, NUM, { color: c.text }]}>
                          {g !== undefined ? g : '–'}
                        </Text>
                      </View>
                    );
                  })}
                </View>

                {hint && (
                  <Text style={[s.hint, { color: isDark ? GOLD_LIGHT : GOLD_DEEP }]}>{hint}</Text>
                )}

                {/* Year input */}
                <Animated.View style={[
                  s.inputRow,
                  { backgroundColor: inputBg, borderColor: guess ? GOLD + '90' : line, transform: [{ translateX: shake }] },
                ]}>
                  <TextInput
                    value={guess}
                    onChangeText={(v) => setGuess(v.replace(/[^0-9]/g, ''))}
                    placeholder={tx(language, 'placeholder')}
                    placeholderTextColor={theme.subtext + '60'}
                    keyboardType="number-pad"
                    maxLength={4}
                    returnKeyType="done"
                    onSubmitEditing={onGuess}
                    style={[s.input, NUM, { color: theme.text }]}
                  />
                  <Text style={[s.triesLeft, { color: theme.subtext }]}>
                    {tx(language, 'triesLeft').replace('{n}', String(YEAR_QUIZ_TRIES - wrongGuesses.length))}
                  </Text>
                </Animated.View>

                <TouchableOpacity
                  onPress={onGuess}
                  disabled={guess.trim().length === 0}
                  activeOpacity={0.9}
                  style={[s.ctaWrap, { opacity: guess.trim().length === 0 ? 0.4 : 1 }]}
                >
                  <LinearGradient colors={[GOLD_LIGHT, GOLD_DEEP]} start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }} style={s.cta}>
                    <Text style={s.ctaText}>{tx(language, 'submit')}</Text>
                  </LinearGradient>
                </TouchableOpacity>
              </Animated.View>
            )}
          </ScrollView>
        </KeyboardAvoidingView>
      </View>
    </Modal>
  );
}

const s = StyleSheet.create({
  root: { flex: 1 },
  topGlow: { position: 'absolute', top: 0, left: 0, right: 0, height: 220 },

  header: {
    flexDirection: 'row', alignItems: 'flex-start', justifyContent: 'space-between',
    paddingHorizontal: 20, paddingBottom: 16,
  },
  kicker: { fontSize: 9.5, fontWeight: '900', letterSpacing: 2.2, fontFamily: SANS },
  title: { fontSize: 26, fontWeight: '800', letterSpacing: -0.5, fontFamily: SERIF, marginTop: 3 },
  subtitle: { fontSize: 12, fontWeight: '600', fontFamily: SANS, marginTop: 3, opacity: 0.8 },
  closeBtn: { width: 38, height: 38, borderRadius: 13, borderWidth: 1, alignItems: 'center', justifyContent: 'center' },

  imageWrap: { borderRadius: 20, borderWidth: 1, overflow: 'hidden' },
  image: { width: '100%', aspectRatio: 16 / 10 },
  imageScrim: { position: 'absolute', left: 0, right: 0, bottom: 0, height: '45%' },

  storyTitle: {
    fontSize: 21, fontWeight: '800', letterSpacing: -0.4, fontFamily: SERIF,
    lineHeight: 28, marginTop: 18, textAlign: 'center',
  },
  prompt: { fontSize: 13.5, fontWeight: '600', fontFamily: SANS, textAlign: 'center', marginTop: 10, opacity: 0.9 },

  chipsRow: { flexDirection: 'row', justifyContent: 'center', gap: 9, marginTop: 20 },
  chip: {
    minWidth: 76, height: 44, borderRadius: 13, borderWidth: 1.5,
    alignItems: 'center', justifyContent: 'center', paddingHorizontal: 10,
  },
  chipText: { fontSize: 16, fontWeight: '800', letterSpacing: 0.5 },

  hint: { fontSize: 13, fontWeight: '700', fontFamily: SANS, textAlign: 'center', marginTop: 14 },

  inputRow: {
    flexDirection: 'row', alignItems: 'center',
    borderRadius: 16, borderWidth: 1.5, paddingLeft: 20, paddingRight: 16,
    height: 64, marginTop: 18,
  },
  input: { flex: 1, fontSize: 30, fontWeight: '700', letterSpacing: 3, paddingVertical: 0 },
  triesLeft: { fontSize: 11.5, fontWeight: '700', fontFamily: SANS, opacity: 0.7 },

  ctaWrap: { alignSelf: 'stretch', borderRadius: 15, marginTop: 14, overflow: 'hidden' },
  cta: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, paddingVertical: 15, borderRadius: 15 },
  ctaText: { color: INK, fontWeight: '900', fontSize: 15, letterSpacing: 0.2, fontFamily: SANS },

  // ── Result ──
  resultWrap: { flex: 1, alignItems: 'center', justifyContent: 'center', paddingVertical: 20 },
  resultIcon: {
    width: 74, height: 74, borderRadius: 37, borderWidth: 1.5,
    alignItems: 'center', justifyContent: 'center',
    shadowColor: GOLD_DEEP, shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.35, shadowRadius: 12, elevation: 6,
  },
  resultTitle: { fontSize: 24, fontWeight: '800', letterSpacing: -0.4, fontFamily: SERIF, marginTop: 16 },
  xpBadge: { paddingHorizontal: 12, paddingVertical: 5, borderRadius: 9, borderWidth: 1, marginTop: 10 },
  xpBadgeText: { fontSize: 12.5, fontWeight: '900', letterSpacing: 0.4, fontFamily: SANS },

  answerLabel: {
    fontSize: 10, fontWeight: '800', letterSpacing: 1.8, fontFamily: SANS,
    textTransform: 'uppercase', marginTop: 22, opacity: 0.8,
  },
  answerYear: { fontSize: 56, fontWeight: '800', letterSpacing: 1, marginTop: 2 },

  thumbRow: {
    flexDirection: 'row', alignItems: 'center', gap: 12,
    borderRadius: 16, borderWidth: 1, padding: 10, marginTop: 20, alignSelf: 'stretch',
  },
  thumb: { width: 54, height: 54, borderRadius: 11, overflow: 'hidden' },
  thumbImg: { width: 54, height: 54 },
  thumbTitle: { flex: 1, fontSize: 14, fontWeight: '700', fontFamily: SERIF, lineHeight: 19 },

  resultBtns: { flexDirection: 'row', alignItems: 'center', gap: 10, marginTop: 26, alignSelf: 'stretch' },
  shareBtn: {
    flexDirection: 'row', alignItems: 'center', gap: 7,
    paddingHorizontal: 18, height: 49, borderRadius: 15, borderWidth: 1,
  },
  shareBtnText: { fontWeight: '800', fontSize: 14, letterSpacing: 0.2, fontFamily: SANS },

  // ── Empty states ──
  stateWrap: { flex: 1, alignItems: 'center', justifyContent: 'center', paddingVertical: 40 },
  stateIcon: {
    width: 72, height: 72, borderRadius: 26, borderWidth: 1,
    alignItems: 'center', justifyContent: 'center', marginBottom: 16,
  },
  stateTitle: { fontSize: 21, fontWeight: '800', letterSpacing: -0.4, fontFamily: SERIF, textAlign: 'center' },
  stateSub: {
    fontSize: 13.5, fontWeight: '500', fontFamily: SANS, textAlign: 'center',
    marginTop: 8, lineHeight: 19, opacity: 0.85, paddingHorizontal: 20,
  },
});
