// components/DailyChallengeModal.tsx — noon bonus quiz built from TODAY's FREE events.
// Perfect run → 1000 XP; otherwise 100 XP per correct answer. Once per day.
import { Trophy, X, Zap } from 'lucide-react-native';
import React, { useCallback, useEffect, useRef, useState } from 'react';
import {
  Animated,
  Modal,
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useLanguage } from '../context/LanguageContext';
import { useRevenueCat } from '../context/RevenueCatContext';
import { useTheme } from '../context/ThemeContext';
import { useCoinPopupStore } from '../store/useCoinPopupStore';
import { useGamificationStore } from '../store/useGamificationStore';
import {
  isDailyChallengeDone,
  markDailyChallengeDone,
  PARTIAL_PER,
  PERFECT_XP,
  todayIso,
} from '../utils/dailyChallenge';
import { haptic } from '../utils/haptics';
import { maybeRequestReview } from '../utils/review';
import { generateQuestions, type Question } from './TimelineQuizModal';

const SERIF = Platform.OS === 'ios' ? 'Georgia' : 'serif';
const FEEDBACK_MS = 900;
const MAX_QUESTIONS = 8;

// ── Translations ──────────────────────────────────────────────────────────────
const T: Record<string, Record<string, string>> = {
  en: {
    title: 'Daily Challenge', subtitle: 'Perfect score = 1000 XP',
    question: 'Question', of: 'of', score: 'Your Score', xp_earned: 'XP Earned',
    accuracy: 'Accuracy', perfect: 'Flawless! +1000 XP', great: 'So close!',
    good: 'Nice run!', keep: 'Keep learning!', done: 'Continue',
    already_done: 'Challenge Completed Today!',
    already_done_sub: 'You\'ve already taken today\'s challenge. Come back tomorrow for 1000 XP!',
    unavailable: 'Not enough events for today\'s challenge. Check back later!',
  },
  ro: {
    title: 'Provocarea Zilei', subtitle: 'Scor perfect = 1000 XP',
    question: 'Întrebarea', of: 'din', score: 'Scorul Tău', xp_earned: 'XP Câștigat',
    accuracy: 'Precizie', perfect: 'Impecabil! +1000 XP', great: 'Aproape!',
    good: 'Bravo!', keep: 'Continuă să înveți!', done: 'Continuă',
    already_done: 'Provocare Completată Azi!',
    already_done_sub: 'Ai făcut deja provocarea de azi. Revino mâine pentru 1000 XP!',
    unavailable: 'Nu sunt destule evenimente pentru provocarea de azi. Revino mai târziu!',
  },
  fr: {
    title: 'Défi du Jour', subtitle: 'Score parfait = 1000 XP',
    question: 'Question', of: 'sur', score: 'Votre Score', xp_earned: 'XP Gagné',
    accuracy: 'Précision', perfect: 'Sans-faute ! +1000 XP', great: 'Si près !',
    good: 'Bien joué !', keep: 'Continuez !', done: 'Continuer',
    already_done: 'Défi Complété Aujourd\'hui !',
    already_done_sub: 'Vous avez déjà fait le défi. Revenez demain pour 1000 XP !',
    unavailable: 'Pas assez d\'événements pour le défi du jour. Revenez plus tard !',
  },
  de: {
    title: 'Tagesherausforderung', subtitle: 'Perfekt = 1000 XP',
    question: 'Frage', of: 'von', score: 'Dein Ergebnis', xp_earned: 'XP Verdient',
    accuracy: 'Genauigkeit', perfect: 'Fehlerfrei! +1000 XP', great: 'Knapp!',
    good: 'Gut gemacht!', keep: 'Lerne weiter!', done: 'Weiter',
    already_done: 'Herausforderung Heute Abgeschlossen!',
    already_done_sub: 'Du hast die Herausforderung schon gemacht. Komm morgen für 1000 XP wieder!',
    unavailable: 'Nicht genug Ereignisse für die heutige Herausforderung. Schau später vorbei!',
  },
  es: {
    title: 'Reto Diario', subtitle: 'Puntuación perfecta = 1000 XP',
    question: 'Pregunta', of: 'de', score: 'Tu Puntuación', xp_earned: 'XP Ganado',
    accuracy: 'Precisión', perfect: '¡Impecable! +1000 XP', great: '¡Casi!',
    good: '¡Bien hecho!', keep: '¡Sigue aprendiendo!', done: 'Continuar',
    already_done: '¡Reto Completado Hoy!',
    already_done_sub: 'Ya has hecho el reto de hoy. ¡Vuelve mañana por 1000 XP!',
    unavailable: 'No hay suficientes eventos para el reto de hoy. ¡Vuelve más tarde!',
  },
};
const tx = (lang: string, k: string) => (T[lang] ?? T.en)[k] ?? T.en[k] ?? k;

// ── Option button ─────────────────────────────────────────────────────────────
const OptionBtn = ({
  text, index, state, theme, isDark, onPress,
}: {
  text: string; index: number; state: 'idle' | 'correct' | 'wrong' | 'missed';
  theme: any; isDark: boolean; onPress: () => void;
}) => {
  const bg =
    state === 'correct' ? '#10B981' + '22' :
    state === 'wrong'   ? '#EF4444' + '22' :
    state === 'missed'  ? '#10B981' + '12' :
    isDark ? '#1C1915' : '#F7F5F0';
  const border =
    state === 'correct' ? '#10B981' :
    state === 'wrong'   ? '#EF4444' :
    state === 'missed'  ? '#10B981' + '60' :
    isDark ? '#2A2420' : '#E5E0D5';
  const textColor =
    state === 'correct' ? '#10B981' :
    state === 'wrong'   ? '#EF4444' :
    state === 'missed'  ? '#10B981' : theme.text;
  const labels = ['A', 'B', 'C', 'D'];

  return (
    <TouchableOpacity onPress={onPress} activeOpacity={state === 'idle' ? 0.7 : 1} disabled={state !== 'idle'}>
      <View style={[opt.row, { backgroundColor: bg, borderColor: border }]}>
        <View style={[opt.label, { backgroundColor: border + (state === 'idle' ? '30' : '40') }]}>
          <Text style={[opt.labelText, { color: state === 'idle' ? theme.subtext : textColor }]}>{labels[index]}</Text>
        </View>
        <Text style={[opt.text, { color: textColor }]} numberOfLines={3}>{text}</Text>
      </View>
    </TouchableOpacity>
  );
};
const opt = StyleSheet.create({
  row: { flexDirection: 'row', alignItems: 'center', gap: 12, padding: 14, borderRadius: 14, borderWidth: 1.5, marginBottom: 10 },
  label: { width: 28, height: 28, borderRadius: 8, alignItems: 'center', justifyContent: 'center' },
  labelText: { fontSize: 11, fontWeight: '900', letterSpacing: 0.5 },
  text: { flex: 1, fontSize: 14, fontWeight: '600', lineHeight: 20 },
});

// ── Main modal ────────────────────────────────────────────────────────────────
export default function DailyChallengeModal({
  visible, onClose, freeEvents, allEvents,
}: {
  visible: boolean; onClose: () => void; freeEvents: any[]; allEvents: any[];
}) {
  const { theme, isDark } = useTheme();
  const { language } = useLanguage();
  const insets = useSafeAreaInsets();
  const { isPro } = useRevenueCat();
  const addQuizXP = useGamificationStore(s => s.addQuizXP);
  const recordQuizDone = useGamificationStore(s => s.recordQuizDone);

  const gold = isDark ? '#E8B84D' : '#C77E08';

  const [questions, setQuestions] = useState<Question[]>([]);
  const [qIndex, setQIndex] = useState(0);
  const [answered, setAnswered] = useState<(number | null)[]>([]);
  const [showResults, setShowResults] = useState(false);
  const [xpEarned, setXpEarned] = useState(0);
  const [alreadyDone, setAlreadyDone] = useState(false);
  const feedbackTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const finalized = useRef(false);

  const fadeIn = useRef(new Animated.Value(0)).current;
  const slideIn = useRef(new Animated.Value(40)).current;

  useEffect(() => {
    if (!visible) return;
    let cancelled = false;
    finalized.current = false;
    fadeIn.setValue(0);
    slideIn.setValue(40);
    Animated.parallel([
      Animated.spring(slideIn, { toValue: 0, tension: 80, friction: 12, useNativeDriver: true }),
      Animated.timing(fadeIn, { toValue: 1, duration: 300, useNativeDriver: true }),
    ]).start();

    (async () => {
      const done = await isDailyChallengeDone(todayIso());
      if (cancelled) return;
      setAlreadyDone(done);
      if (done) return;
      // Questions are ABOUT today's free events; distractors come from all history.
      const count = Math.min(MAX_QUESTIONS, freeEvents.length);
      const qs = generateQuestions(freeEvents, language, { count, distractorPool: allEvents });
      setQuestions(qs);
      setQIndex(0);
      setAnswered(Array(qs.length).fill(null));
      setShowResults(false);
      setXpEarned(0);
    })();

    return () => {
      cancelled = true;
      if (feedbackTimer.current) clearTimeout(feedbackTimer.current);
    };
  }, [visible]);

  const finalize = useCallback((finalAnswered: (number | null)[], qs: Question[]) => {
    if (finalized.current) return;
    finalized.current = true;
    const correct = finalAnswered.filter((a, i) => a !== null && qs[i] && a === qs[i].correctIndex).length;
    const perfect = correct === qs.length && qs.length > 0;
    const xp = perfect ? PERFECT_XP : correct * PARTIAL_PER;
    setXpEarned(xp);
    if (xp > 0) addQuizXP(xp, isPro);
    recordQuizDone();
    markDailyChallengeDone(todayIso());
    setShowResults(true);
    haptic('success');
    // Opportunistic "watch a clip for a coin" pop-up after the daily quiz.
    try { useCoinPopupStore.getState().maybeShow('daily_quiz'); } catch {}
    // High-intent moment — ask for a review once ever.
    maybeRequestReview();
  }, [addQuizXP, recordQuizDone, isPro]);

  const onAnswer = useCallback((optIndex: number) => {
    if (answered[qIndex] !== null || questions.length === 0) return;
    haptic('selection');
    const q = questions[qIndex];
    const newAnswered = [...answered];
    newAnswered[qIndex] = optIndex;
    setAnswered(newAnswered);
    haptic(optIndex === q.correctIndex ? 'success' : 'error');

    feedbackTimer.current = setTimeout(() => {
      if (qIndex < questions.length - 1) {
        setQIndex(prev => prev + 1);
        slideIn.setValue(40); fadeIn.setValue(0);
        Animated.parallel([
          Animated.spring(slideIn, { toValue: 0, tension: 100, friction: 13, useNativeDriver: true }),
          Animated.timing(fadeIn, { toValue: 1, duration: 250, useNativeDriver: true }),
        ]).start();
      } else {
        finalize(newAnswered, questions);
      }
    }, FEEDBACK_MS);
  }, [answered, qIndex, questions, finalize]);

  if (!visible) return null;

  const q = questions[qIndex];
  const correctCount = answered.filter((a, i) => a !== null && questions[i] && a === questions[i].correctIndex).length;
  const bg = isDark ? '#0D0A07' : '#FAF8F3';
  const total = questions.length;
  const accuracy = total > 0 ? Math.round((correctCount / total) * 100) : 0;
  const resultMsg =
    accuracy === 100 ? tx(language, 'perfect') :
    accuracy >= 60 ? tx(language, 'good') :
    accuracy >= 40 ? tx(language, 'great') : tx(language, 'keep');

  return (
    <Modal visible={visible} animationType="fade" transparent statusBarTranslucent>
      <View style={[ms.overlay, { backgroundColor: isDark ? 'rgba(0,0,0,0.8)' : 'rgba(0,0,0,0.5)' }]}>
        <View style={[ms.sheet, { backgroundColor: bg, paddingTop: insets.top + 8, paddingBottom: insets.bottom + 16 }]}>
          {/* Header */}
          <View style={ms.header}>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10, flex: 1 }}>
              <Trophy size={22} color={gold} />
              <View>
                <Text style={[ms.title, { color: theme.text }]}>{tx(language, 'title')}</Text>
                {!showResults && !alreadyDone && total > 0 && (
                  <Text style={[ms.subtitle, { color: theme.subtext }]}>
                    {tx(language, 'question')} {qIndex + 1} {tx(language, 'of')} {total}
                  </Text>
                )}
                {(showResults || alreadyDone || total === 0) && (
                  <Text style={[ms.subtitle, { color: gold }]}>{tx(language, 'subtitle')}</Text>
                )}
              </View>
            </View>
            <TouchableOpacity onPress={() => { haptic('light'); onClose(); }} style={[ms.closeBtn, { borderColor: isDark ? '#2A2420' : '#E5E0D5' }]}>
              <X size={16} color={theme.subtext} strokeWidth={2.5} />
            </TouchableOpacity>
          </View>

          {/* Progress dots */}
          {!showResults && !alreadyDone && total > 0 && (
            <View style={ms.dots}>
              {questions.map((_, i) => {
                const ans = answered[i];
                const done = ans !== null;
                const isCorrect = done && ans === questions[i].correctIndex;
                return (
                  <View key={i} style={[ms.dot, {
                    backgroundColor: i === qIndex ? gold : done ? (isCorrect ? '#10B981' : '#EF4444') : isDark ? '#2A2420' : '#E5E0D5',
                    width: i === qIndex ? 22 : 8,
                  }]} />
                );
              })}
            </View>
          )}

          <ScrollView contentContainerStyle={ms.scroll} showsVerticalScrollIndicator={false}>
            {alreadyDone ? (
              <View style={{ alignItems: 'center', paddingTop: 32, paddingBottom: 16 }}>
                <View style={[ms.bigIcon, { backgroundColor: gold + '15', borderColor: gold + '40' }]}>
                  <Trophy size={36} color={gold} />
                </View>
                <Text style={[ms.doneTitle, { color: gold }]}>{tx(language, 'already_done')}</Text>
                <Text style={[ms.doneSub, { color: theme.subtext }]}>{tx(language, 'already_done_sub')}</Text>
                <TouchableOpacity onPress={() => { haptic('medium'); onClose(); }} style={[ms.primaryBtn, { backgroundColor: gold, alignSelf: 'stretch' }]}>
                  <Text style={ms.primaryBtnText}>{tx(language, 'done')}</Text>
                </TouchableOpacity>
              </View>
            ) : total === 0 ? (
              <View style={{ alignItems: 'center', paddingTop: 40, paddingBottom: 16 }}>
                <Text style={[ms.doneSub, { color: theme.subtext, marginBottom: 28 }]}>{tx(language, 'unavailable')}</Text>
                <TouchableOpacity onPress={() => { haptic('medium'); onClose(); }} style={[ms.primaryBtn, { backgroundColor: gold, alignSelf: 'stretch' }]}>
                  <Text style={ms.primaryBtnText}>{tx(language, 'done')}</Text>
                </TouchableOpacity>
              </View>
            ) : showResults ? (
              <View style={{ alignItems: 'center', paddingTop: 20 }}>
                <Text style={[ms.resultMsg, { color: gold }]}>{resultMsg}</Text>
                <View style={[ms.scoreCircle, { borderColor: gold + '40', backgroundColor: gold + '10' }]}>
                  <Text style={[ms.scoreNum, { color: gold }]}>{correctCount}/{total}</Text>
                  <Text style={[ms.scoreLbl, { color: theme.subtext }]}>{tx(language, 'score')}</Text>
                </View>
                <View style={ms.statsRow}>
                  <View style={[ms.stat, { backgroundColor: '#10B98112', borderColor: '#10B98130' }]}>
                    <Text style={[ms.statVal, { color: '#10B981' }]}>{accuracy}%</Text>
                    <Text style={[ms.statLbl, { color: theme.subtext }]}>{tx(language, 'accuracy')}</Text>
                  </View>
                  <View style={[ms.stat, { backgroundColor: gold + '12', borderColor: gold + '30' }]}>
                    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4 }}>
                      <Zap size={16} color={gold} fill={gold} />
                      <Text style={[ms.statVal, { color: gold }]}>+{xpEarned}</Text>
                    </View>
                    <Text style={[ms.statLbl, { color: theme.subtext }]}>{tx(language, 'xp_earned')}</Text>
                  </View>
                </View>
                <TouchableOpacity onPress={() => { haptic('medium'); onClose(); }} style={[ms.primaryBtn, { backgroundColor: gold, alignSelf: 'stretch' }]}>
                  <Text style={ms.primaryBtnText}>{tx(language, 'done')}</Text>
                </TouchableOpacity>
              </View>
            ) : q ? (
              <Animated.View style={{ opacity: fadeIn, transform: [{ translateY: slideIn }] }}>
                <View style={[ms.qCard, { backgroundColor: isDark ? '#141007' : '#FFFFFF', borderColor: gold + '25' }]}>
                  <View style={[ms.qAccent, { backgroundColor: gold }]} />
                  <Text style={[ms.qText, { color: theme.text }]}>{q.questionText}</Text>
                </View>
                <View>
                  {q.options.map((o, i) => {
                    const userAnswer = answered[qIndex];
                    let state: 'idle' | 'correct' | 'wrong' | 'missed' = 'idle';
                    if (userAnswer !== null) {
                      if (i === q.correctIndex) state = 'missed';
                      if (i === userAnswer && userAnswer === q.correctIndex) state = 'correct';
                      if (i === userAnswer && userAnswer !== q.correctIndex) state = 'wrong';
                    }
                    return (
                      <OptionBtn key={i} text={o} index={i} state={state} theme={theme} isDark={isDark} onPress={() => onAnswer(i)} />
                    );
                  })}
                </View>
              </Animated.View>
            ) : null}
          </ScrollView>
        </View>
      </View>
    </Modal>
  );
}

const ms = StyleSheet.create({
  overlay: { flex: 1, justifyContent: 'flex-end' },
  sheet: { borderTopLeftRadius: 28, borderTopRightRadius: 28, minHeight: '75%', maxHeight: '95%' },
  header: { flexDirection: 'row', alignItems: 'flex-start', justifyContent: 'space-between', paddingHorizontal: 22, paddingBottom: 8 },
  title: { fontSize: 22, fontWeight: '900', letterSpacing: -0.5, fontFamily: SERIF },
  subtitle: { fontSize: 12, fontWeight: '600', marginTop: 3, opacity: 0.7 },
  closeBtn: { width: 34, height: 34, borderRadius: 11, borderWidth: 1, alignItems: 'center', justifyContent: 'center' },
  dots: { flexDirection: 'row', alignItems: 'center', gap: 5, paddingHorizontal: 22, paddingBottom: 14, flexWrap: 'wrap' },
  dot: { height: 6, borderRadius: 3 },
  scroll: { paddingHorizontal: 22, paddingTop: 4, paddingBottom: 16 },
  qCard: { borderRadius: 18, borderWidth: 1, padding: 18, marginBottom: 20, overflow: 'hidden' },
  qAccent: { position: 'absolute', left: 0, top: 0, bottom: 0, width: 4 },
  qText: { fontSize: 16, fontWeight: '700', lineHeight: 24, fontFamily: SERIF, paddingLeft: 8 },
  bigIcon: { width: 80, height: 80, borderRadius: 40, alignItems: 'center', justifyContent: 'center', marginBottom: 20, borderWidth: 2 },
  doneTitle: { fontSize: 20, fontWeight: '900', fontFamily: SERIF, letterSpacing: -0.4, marginBottom: 12, textAlign: 'center' },
  doneSub: { fontSize: 14, textAlign: 'center', lineHeight: 22, paddingHorizontal: 8, opacity: 0.75, marginBottom: 32 },
  resultMsg: { fontSize: 22, fontWeight: '900', letterSpacing: -0.5, fontFamily: SERIF, marginBottom: 24, textAlign: 'center' },
  scoreCircle: { width: 130, height: 130, borderRadius: 65, borderWidth: 2, alignItems: 'center', justifyContent: 'center', marginBottom: 24 },
  scoreNum: { fontSize: 34, fontWeight: '900', letterSpacing: -1 },
  scoreLbl: { fontSize: 10, fontWeight: '700', letterSpacing: 1, textTransform: 'uppercase', marginTop: 2, opacity: 0.5 },
  statsRow: { flexDirection: 'row', gap: 12, marginBottom: 28, alignSelf: 'stretch' },
  stat: { flex: 1, alignItems: 'center', padding: 16, borderRadius: 14, borderWidth: 1, gap: 4 },
  statVal: { fontSize: 22, fontWeight: '900', letterSpacing: -0.5 },
  statLbl: { fontSize: 9, fontWeight: '700', letterSpacing: 1, textTransform: 'uppercase', opacity: 0.5 },
  primaryBtn: { paddingVertical: 14, borderRadius: 14, alignItems: 'center' },
  primaryBtnText: { fontSize: 15, fontWeight: '800', color: '#000', letterSpacing: 0.2 },
});
