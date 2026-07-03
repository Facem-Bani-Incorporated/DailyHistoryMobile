// components/TimelineQuizModal.tsx — Daily history quiz, 5 questions from real events
import { X, Zap } from 'lucide-react-native';
import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  Animated,
  Easing,
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
import { useTheme } from '../context/ThemeContext';
import { haptic } from '../utils/haptics';
import { useRevenueCat } from '../context/RevenueCatContext';
import { useGamificationStore } from '../store/useGamificationStore';
import { maybeRequestReview } from '../utils/review';

const SERIF = Platform.OS === 'ios' ? 'Georgia' : 'serif';
const QUESTIONS_PER_QUIZ = 5;
const XP_CORRECT = 15;
const FEEDBACK_MS = 900;

// ── Translations ────────────────────────────────────────────────────────────────
const T: Record<string, Record<string, string>> = {
  en: {
    title: 'Daily Quiz', subtitle: 'Test your history knowledge',
    q_year: 'In which year did this happen?',
    q_where: 'Where did this event take place?',
    q_category: 'What type of event was this?',
    q_which: 'Which event happened in the year {year}?',
    correct: 'Correct!', wrong: 'Wrong!', question: 'Question', of: 'of',
    score: 'Your Score', xp_earned: 'XP Earned', accuracy: 'Accuracy',
    great: 'Outstanding!', good: 'Well done!', keep: 'Keep learning!',
    done: 'Continue',
    already_done: 'Quiz Completed Today!',
    already_done_sub: 'You\'ve already taken today\'s quiz. Come back tomorrow for new questions!',
    war: 'War & Conflict', tech: 'Technology', sci: 'Science',
    pol: 'Politics', art: 'Culture & Arts', nat: 'Natural Disaster',
    exp: 'Exploration', rel: 'Religion', his: 'History',
  },
  ro: {
    title: 'Quiz Zilnic', subtitle: 'Testează-ți cunoștințele de istorie',
    q_year: 'În ce an s-a întâmplat?',
    q_where: 'Unde a avut loc acest eveniment?',
    q_category: 'Ce tip de eveniment a fost acesta?',
    q_which: 'Ce eveniment s-a întâmplat în anul {year}?',
    correct: 'Corect!', wrong: 'Greșit!', question: 'Întrebarea', of: 'din',
    score: 'Scorul Tău', xp_earned: 'XP Câștigat', accuracy: 'Precizie',
    great: 'Extraordinar!', good: 'Bine făcut!', keep: 'Continuă să înveți!',
    done: 'Continuă',
    already_done: 'Quiz Completat Azi!',
    already_done_sub: 'Ai completat deja quiz-ul de azi. Revino mâine pentru întrebări noi!',
    war: 'Război', tech: 'Tehnologie', sci: 'Știință',
    pol: 'Politică', art: 'Cultură', nat: 'Dezastre Naturale',
    exp: 'Explorare', rel: 'Religie', his: 'Istorie',
  },
  fr: {
    title: 'Quiz Quotidien', subtitle: 'Testez vos connaissances historiques',
    q_year: 'En quelle année cela s\'est-il passé ?',
    q_where: 'Où cet événement a-t-il eu lieu ?',
    q_category: 'Quel type d\'événement était-ce ?',
    q_which: 'Quel événement s\'est produit en {year} ?',
    correct: 'Correct !', wrong: 'Faux !', question: 'Question', of: 'sur',
    score: 'Votre Score', xp_earned: 'XP Gagné', accuracy: 'Précision',
    great: 'Exceptionnel !', good: 'Bien joué !', keep: 'Continuez !',
    done: 'Continuer',
    already_done: 'Quiz Complété Aujourd\'hui !',
    already_done_sub: 'Vous avez déjà fait le quiz. Revenez demain pour de nouvelles questions !',
    war: 'Guerre', tech: 'Technologie', sci: 'Science',
    pol: 'Politique', art: 'Culture', nat: 'Catastrophe', exp: 'Exploration',
    rel: 'Religion', his: 'Histoire',
  },
  de: {
    title: 'Tägliches Quiz', subtitle: 'Teste dein Geschichtswissen',
    q_year: 'In welchem Jahr geschah dies?',
    q_where: 'Wo fand dieses Ereignis statt?',
    q_category: 'Welche Art von Ereignis war dies?',
    q_which: 'Welches Ereignis geschah im Jahr {year}?',
    correct: 'Richtig!', wrong: 'Falsch!', question: 'Frage', of: 'von',
    score: 'Dein Ergebnis', xp_earned: 'XP Verdient', accuracy: 'Genauigkeit',
    great: 'Ausgezeichnet!', good: 'Gut gemacht!', keep: 'Lerne weiter!',
    done: 'Weiter',
    already_done: 'Quiz Heute Abgeschlossen!',
    already_done_sub: 'Du hast das Quiz bereits gemacht. Komm morgen für neue Fragen wieder!',
    war: 'Krieg', tech: 'Technologie', sci: 'Wissenschaft',
    pol: 'Politik', art: 'Kultur', nat: 'Naturkatastrophe',
    exp: 'Erkundung', rel: 'Religion', his: 'Geschichte',
  },
  es: {
    title: 'Quiz Diario', subtitle: 'Pon a prueba tus conocimientos',
    q_year: '¿En qué año ocurrió esto?',
    q_where: '¿Dónde tuvo lugar este evento?',
    q_category: '¿Qué tipo de evento fue este?',
    q_which: '¿Qué evento ocurrió en el año {year}?',
    correct: '¡Correcto!', wrong: '¡Incorrecto!', question: 'Pregunta', of: 'de',
    score: 'Tu Puntuación', xp_earned: 'XP Ganado', accuracy: 'Precisión',
    great: '¡Sobresaliente!', good: '¡Bien hecho!', keep: '¡Sigue aprendiendo!',
    done: 'Continuar',
    already_done: '¡Quiz Completado Hoy!',
    already_done_sub: 'Ya has hecho el quiz de hoy. ¡Vuelve mañana para nuevas preguntas!',
    war: 'Guerra', tech: 'Tecnología', sci: 'Ciencia',
    pol: 'Política', art: 'Cultura', nat: 'Desastre',
    exp: 'Exploración', rel: 'Religión', his: 'Historia',
  },
};
const tx = (lang: string, k: string) => (T[lang] ?? T.en)[k] ?? T.en[k] ?? k;

// ── Category display names ───────────────────────────────────────────────────
const CAT_KEY: Record<string, string> = {
  war_conflict: 'war', tech_innovation: 'tech', science_discovery: 'sci',
  politics_state: 'pol', culture_arts: 'art', natural_disaster: 'nat',
  exploration: 'exp', religion_phil: 'rel',
};
const ALL_CATS = Object.keys(CAT_KEY);

// ── Types ────────────────────────────────────────────────────────────────────
type QType = 'year' | 'where' | 'category' | 'which_title';

export interface Question {
  type: QType;
  event: any;
  questionText: string;
  options: string[];
  correctIndex: number;
}

// ── Helpers ──────────────────────────────────────────────────────────────────
const extractYear = (e: any): number => {
  const r = String(e?.eventDate ?? e?.event_date ?? e?.year ?? '').trim();
  if (/^-?\d{1,4}$/.test(r)) return parseInt(r);
  if (r.includes('-') && r.split('-')[0].length === 4) return parseInt(r.split('-')[0]);
  return 0;
};

const shuffle = <T,>(arr: T[]): T[] => {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
};

const getLocation = (e: any): string => {
  const loc = e?.location ?? '';
  if (!loc) return '';
  return loc.split(',').slice(-1)[0].trim() || loc;
};

// `events` are the subject events (questions are ABOUT these).
// opts.distractorPool provides wrong-answer material (defaults to the subject set).
// opts.count caps how many questions to generate (defaults to QUESTIONS_PER_QUIZ).
export const generateQuestions = (
  events: any[],
  lang: string,
  opts?: { count?: number; distractorPool?: any[] },
): Question[] => {
  const isUsable = (e: any) => {
    const y = extractYear(e);
    const title = e?.titleTranslations?.en ?? '';
    return y !== 0 && y > 0 && title.length > 0;
  };
  const usable = events.filter(isUsable);
  if (usable.length === 0) return [];

  const count = opts?.count ?? QUESTIONS_PER_QUIZ;
  const distractorSource = (opts?.distractorPool ?? usable).filter(isUsable);
  const pool = shuffle(distractorSource).slice(0, Math.min(80, distractorSource.length));
  const selected = shuffle(usable).slice(0, Math.min(count, usable.length));
  const questions: Question[] = [];

  const types: QType[] = shuffle(['year', 'where', 'category', 'which_title', 'year'] as QType[]);

  selected.forEach((event, i) => {
    const type = types[i % types.length];
    const title = event.titleTranslations?.[lang] ?? event.titleTranslations?.en ?? '';
    const year = extractYear(event);
    const location = getLocation(event);
    const cat = (event.category ?? '').toLowerCase();
    const catKey = CAT_KEY[cat] ?? 'his';

    if (type === 'year') {
      const correct = String(year);
      const offsets = shuffle([-7, -15, -23, -41, -55, -80, -112, 7, 15, 23, 41, 55, 80, 112]);
      const wrongs = new Set<string>();
      for (const off of offsets) {
        const w = String(year + off);
        if (w !== correct && w !== '0') { wrongs.add(w); if (wrongs.size === 3) break; }
      }
      const opts = shuffle([correct, ...Array.from(wrongs)]);
      questions.push({
        type, event,
        questionText: `${tx(lang, 'q_year')}\n"${title}"`,
        options: opts,
        correctIndex: opts.indexOf(correct),
      });
    } else if (type === 'where' && location) {
      const correct = location;
      const otherLocs = shuffle(pool.filter(e => getLocation(e) && getLocation(e) !== location)).slice(0, 3).map(e => getLocation(e));
      if (otherLocs.length < 3) {
        // fallback to year question
        const correct2 = String(year);
        const offsets2 = shuffle([-7, -23, -55, 7, 23, 55]);
        const wrongs2 = new Set<string>();
        for (const off of offsets2) { const w = String(year + off); if (w !== correct2) { wrongs2.add(w); if (wrongs2.size === 3) break; } }
        const opts2 = shuffle([correct2, ...Array.from(wrongs2)]);
        questions.push({ type: 'year', event, questionText: `${tx(lang, 'q_year')}\n"${title}"`, options: opts2, correctIndex: opts2.indexOf(correct2) });
        return;
      }
      const opts = shuffle([correct, ...otherLocs]);
      questions.push({
        type, event,
        questionText: `${tx(lang, 'q_where')}\n"${title}"`,
        options: opts,
        correctIndex: opts.indexOf(correct),
      });
    } else if (type === 'category') {
      const correct = tx(lang, catKey);
      const otherCats = shuffle(ALL_CATS.filter(c => CAT_KEY[c] !== catKey)).slice(0, 3).map(c => tx(lang, CAT_KEY[c]));
      const opts = shuffle([correct, ...otherCats]);
      questions.push({
        type, event,
        questionText: `${tx(lang, 'q_category')}\n"${title}"`,
        options: opts,
        correctIndex: opts.indexOf(correct),
      });
    } else {
      // which_title: given year, pick correct event
      const correct = title;
      const otherTitles = shuffle(pool.filter(e => extractYear(e) !== year && (e?.titleTranslations?.en ?? '') !== title))
        .slice(0, 3).map(e => e.titleTranslations?.[lang] ?? e.titleTranslations?.en ?? '');
      if (otherTitles.length < 3) {
        const correct2 = String(year);
        const offsets2 = shuffle([-13, -27, -51, 13, 27, 51]);
        const wrongs2 = new Set<string>();
        for (const off of offsets2) { const w = String(year + off); if (w !== correct2) { wrongs2.add(w); if (wrongs2.size === 3) break; } }
        const opts2 = shuffle([correct2, ...Array.from(wrongs2)]);
        questions.push({ type: 'year', event, questionText: `${tx(lang, 'q_year')}\n"${title}"`, options: opts2, correctIndex: opts2.indexOf(correct2) });
        return;
      }
      const opts = shuffle([correct, ...otherTitles]);
      questions.push({
        type, event,
        questionText: tx(lang, 'q_which').replace('{year}', String(year)),
        options: opts,
        correctIndex: opts.indexOf(correct),
      });
    }
  });

  return questions;
};

// ── Option Button ────────────────────────────────────────────────────────────
const OptionBtn = ({
  text, index, state, theme, isDark, gold, onPress,
}: {
  text: string; index: number; state: 'idle' | 'correct' | 'wrong' | 'missed';
  theme: any; isDark: boolean; gold: string; onPress: () => void;
}) => {
  const scale = useRef(new Animated.Value(1)).current;

  useEffect(() => {
    if (state === 'correct') {
      Animated.sequence([
        Animated.spring(scale, { toValue: 1.04, tension: 300, friction: 8, useNativeDriver: true }),
        Animated.spring(scale, { toValue: 1, tension: 300, friction: 8, useNativeDriver: true }),
      ]).start();
    }
  }, [state]);

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
    state === 'missed'  ? '#10B981' :
    theme.text;

  const labels = ['A', 'B', 'C', 'D'];

  return (
    <TouchableOpacity onPress={onPress} activeOpacity={state === 'idle' ? 0.7 : 1} disabled={state !== 'idle'}>
      <Animated.View style={[opt.row, { backgroundColor: bg, borderColor: border, transform: [{ scale }] }]}>
        <View style={[opt.label, { backgroundColor: border + (state === 'idle' ? '30' : '40') }]}>
          <Text style={[opt.labelText, { color: state === 'idle' ? theme.subtext : textColor }]}>{labels[index]}</Text>
        </View>
        <Text style={[opt.text, { color: textColor }]} numberOfLines={3}>{text}</Text>
      </Animated.View>
    </TouchableOpacity>
  );
};
const opt = StyleSheet.create({
  row: { flexDirection: 'row', alignItems: 'center', gap: 12, padding: 14, borderRadius: 14, borderWidth: 1.5, marginBottom: 10 },
  label: { width: 28, height: 28, borderRadius: 8, alignItems: 'center', justifyContent: 'center' },
  labelText: { fontSize: 11, fontWeight: '900', letterSpacing: 0.5 },
  text: { flex: 1, fontSize: 14, fontWeight: '600', lineHeight: 20 },
});

// ── Results Screen ───────────────────────────────────────────────────────────
const ResultsScreen = ({
  correct, total, xpEarned, lang, gold, theme, isDark, onDone,
}: {
  correct: number; total: number; xpEarned: number; lang: string;
  gold: string; theme: any; isDark: boolean; onDone: () => void;
}) => {
  const accuracy = Math.round((correct / total) * 100);
  const message = accuracy >= 80 ? tx(lang, 'great') : accuracy >= 50 ? tx(lang, 'good') : tx(lang, 'keep');
  const scale = useRef(new Animated.Value(0.7)).current;
  const fade = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    Animated.parallel([
      Animated.spring(scale, { toValue: 1, tension: 80, friction: 8, useNativeDriver: true }),
      Animated.timing(fade, { toValue: 1, duration: 500, useNativeDriver: true }),
    ]).start();
    haptic('success');
  }, []);

  return (
    <Animated.View style={[res.wrap, { opacity: fade, transform: [{ scale }] }]}>
      <Text style={[res.message, { color: gold }]}>{message}</Text>

      <View style={[res.scoreCircle, { borderColor: gold + '40', backgroundColor: gold + '10' }]}>
        <Text style={[res.scoreNum, { color: gold }]}>{correct}/{total}</Text>
        <Text style={[res.scoreLbl, { color: theme.subtext }]}>{tx(lang, 'score')}</Text>
      </View>

      <View style={res.statsRow}>
        <View style={[res.stat, { backgroundColor: '#10B98112', borderColor: '#10B98130' }]}>
          <Text style={[res.statVal, { color: '#10B981' }]}>{accuracy}%</Text>
          <Text style={[res.statLbl, { color: theme.subtext }]}>{tx(lang, 'accuracy')}</Text>
        </View>
        <View style={[res.stat, { backgroundColor: gold + '12', borderColor: gold + '30' }]}>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4 }}>
            <Zap size={16} color={gold} fill={gold} />
            <Text style={[res.statVal, { color: gold }]}>+{xpEarned}</Text>
          </View>
          <Text style={[res.statLbl, { color: theme.subtext }]}>{tx(lang, 'xp_earned')}</Text>
        </View>
      </View>

      <TouchableOpacity onPress={() => { haptic('medium'); onDone(); }} style={[res.primaryBtn, { backgroundColor: gold }]}>
        <Text style={res.primaryBtnText}>{tx(lang, 'done')}</Text>
      </TouchableOpacity>
    </Animated.View>
  );
};
const res = StyleSheet.create({
  wrap: { alignItems: 'center', paddingTop: 20 },
  message: { fontSize: 22, fontWeight: '900', letterSpacing: -0.5, fontFamily: SERIF, marginBottom: 28 },
  scoreCircle: {
    width: 130, height: 130, borderRadius: 65, borderWidth: 2,
    alignItems: 'center', justifyContent: 'center', marginBottom: 28,
  },
  scoreNum: { fontSize: 36, fontWeight: '900', letterSpacing: -1 },
  scoreLbl: { fontSize: 10, fontWeight: '700', letterSpacing: 1, textTransform: 'uppercase', marginTop: 2, opacity: 0.5 },
  statsRow: { flexDirection: 'row', gap: 12, marginBottom: 32 },
  stat: { flex: 1, alignItems: 'center', padding: 16, borderRadius: 14, borderWidth: 1, gap: 4 },
  statVal: { fontSize: 22, fontWeight: '900', letterSpacing: -0.5 },
  statLbl: { fontSize: 9, fontWeight: '700', letterSpacing: 1, textTransform: 'uppercase', opacity: 0.5 },
  btn: { alignSelf: 'stretch', paddingVertical: 14, borderRadius: 14, borderWidth: 1, alignItems: 'center', marginBottom: 10 },
  btnText: { fontSize: 14, fontWeight: '700' },
  primaryBtn: { alignSelf: 'stretch', paddingVertical: 14, borderRadius: 14, alignItems: 'center' },
  primaryBtnText: { fontSize: 15, fontWeight: '800', color: '#000', letterSpacing: 0.2 },
});

// ── Main Modal ───────────────────────────────────────────────────────────────
export default function TimelineQuizModal({
  visible, onClose, allEvents,
}: {
  visible: boolean; onClose: () => void; allEvents: any[];
}) {
  const { theme, isDark } = useTheme();
  const { language } = useLanguage();
  const insets = useSafeAreaInsets();
  const { isPro } = useRevenueCat();
  const addQuizXP = useGamificationStore(s => s.addQuizXP);
  const recordQuizDone = useGamificationStore(s => s.recordQuizDone);
  const quizDate = useGamificationStore(s => s.quizDate);
  const today = new Date().toISOString().split('T')[0];

  const gold = isDark ? '#E8B84D' : '#C77E08';

  const [questions, setQuestions] = useState<Question[]>([]);
  const [qIndex, setQIndex] = useState(0);
  const [answered, setAnswered] = useState<(number | null)[]>(Array(QUESTIONS_PER_QUIZ).fill(null));
  const [showResults, setShowResults] = useState(false);
  const [xpEarned, setXpEarned] = useState(0);
  const [feedbackTimer, setFeedbackTimer] = useState<ReturnType<typeof setTimeout> | null>(null);
  const [alreadyDone, setAlreadyDone] = useState(false);

  const slideIn = useRef(new Animated.Value(40)).current;
  const fadeIn = useRef(new Animated.Value(0)).current;

  const initQuiz = useCallback(() => {
    const qs = generateQuestions(allEvents, language);
    setQuestions(qs);
    setQIndex(0);
    setAnswered(Array(QUESTIONS_PER_QUIZ).fill(null));
    setShowResults(false);
    setXpEarned(0);
  }, [allEvents, language]);

  useEffect(() => {
    if (visible) {
      const done = quizDate === today;
      setAlreadyDone(done);
      if (!done) {
        initQuiz();
      }
      slideIn.setValue(40);
      fadeIn.setValue(0);
      Animated.parallel([
        Animated.spring(slideIn, { toValue: 0, tension: 80, friction: 12, useNativeDriver: true }),
        Animated.timing(fadeIn, { toValue: 1, duration: 300, useNativeDriver: true }),
      ]).start();
    }
    return () => { if (feedbackTimer) clearTimeout(feedbackTimer); };
  }, [visible]);

  useEffect(() => {
    if (qIndex > 0 && !showResults) {
      slideIn.setValue(40);
      fadeIn.setValue(0);
      Animated.parallel([
        Animated.spring(slideIn, { toValue: 0, tension: 100, friction: 13, useNativeDriver: true }),
        Animated.timing(fadeIn, { toValue: 1, duration: 250, useNativeDriver: true }),
      ]).start();
    }
  }, [qIndex]);

  const onAnswer = useCallback((optIndex: number) => {
    if (answered[qIndex] !== null || questions.length === 0) return;
    haptic('selection');

    const q = questions[qIndex];
    const isCorrect = optIndex === q.correctIndex;
    const newAnswered = [...answered];
    newAnswered[qIndex] = optIndex;
    setAnswered(newAnswered);

    if (isCorrect) {
      haptic('success');
      addQuizXP(XP_CORRECT, isPro);
      setXpEarned(prev => prev + XP_CORRECT);
    } else {
      haptic('error');
    }

    const t = setTimeout(() => {
      if (qIndex < questions.length - 1) {
        setQIndex(prev => prev + 1);
      } else {
        recordQuizDone();
        setShowResults(true);
        // Finishing the quiz is a high-intent moment — ask for a review (once ever).
        maybeRequestReview();
      }
    }, FEEDBACK_MS);
    setFeedbackTimer(t);
  }, [answered, qIndex, questions, isPro, addQuizXP, recordQuizDone]);

  if (!visible) return null;

  const q = questions[qIndex];
  const correctCount = answered.filter((a, i) => a !== null && questions[i] && a === questions[i].correctIndex).length;
  const bg = isDark ? '#0D0A07' : '#FAF8F3';

  return (
    <Modal visible={visible} animationType="fade" transparent statusBarTranslucent>
      <View style={[ms.overlay, { backgroundColor: isDark ? 'rgba(0,0,0,0.8)' : 'rgba(0,0,0,0.5)' }]}>
        <View style={[ms.sheet, { backgroundColor: bg, paddingTop: insets.top + 8, paddingBottom: insets.bottom + 16 }]}>

          {/* ── Header ── */}
          <View style={ms.header}>
            <View>
              <Text style={[ms.title, { color: theme.text }]}>{tx(language, 'title')}</Text>
              {!showResults && questions.length > 0 && (
                <Text style={[ms.subtitle, { color: theme.subtext }]}>
                  {tx(language, 'question')} {qIndex + 1} {tx(language, 'of')} {questions.length}
                </Text>
              )}
            </View>
            <TouchableOpacity onPress={() => { haptic('light'); onClose(); }} style={[ms.closeBtn, { borderColor: isDark ? '#2A2420' : '#E5E0D5' }]}>
              <X size={16} color={theme.subtext} strokeWidth={2.5} />
            </TouchableOpacity>
          </View>

          {/* ── Progress dots ── */}
          {!showResults && !alreadyDone && (
            <View style={ms.dots}>
              {Array.from({ length: QUESTIONS_PER_QUIZ }).map((_, i) => {
                const ans = answered[i];
                const done = ans !== null;
                const isCorrect = done && questions[i] && ans === questions[i].correctIndex;
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
              <Animated.View style={[{ opacity: fadeIn, transform: [{ translateY: slideIn }] }, { alignItems: 'center', paddingTop: 32, paddingBottom: 16 }]}>
                <View style={[{ width: 80, height: 80, borderRadius: 40, alignItems: 'center', justifyContent: 'center', marginBottom: 20 }, { backgroundColor: gold + '15', borderWidth: 2, borderColor: gold + '40' }]}>
                  <Zap size={36} color={gold} fill={gold} />
                </View>
                <Text style={{ fontSize: 20, fontWeight: '900', color: gold, fontFamily: SERIF, letterSpacing: -0.4, marginBottom: 12 }}>
                  {tx(language, 'already_done')}
                </Text>
                <Text style={{ fontSize: 14, color: theme.subtext, textAlign: 'center', lineHeight: 22, paddingHorizontal: 8, opacity: 0.7, marginBottom: 32 }}>
                  {tx(language, 'already_done_sub')}
                </Text>
                <TouchableOpacity onPress={() => { haptic('medium'); onClose(); }}
                  style={[res.primaryBtn, { backgroundColor: gold, alignSelf: 'stretch' }]}>
                  <Text style={res.primaryBtnText}>{tx(language, 'done')}</Text>
                </TouchableOpacity>
              </Animated.View>
            ) : questions.length === 0 ? (
              <View style={{ alignItems: 'center', paddingVertical: 60 }}>
                <Text style={{ color: theme.subtext, fontSize: 14 }}>Loading questions...</Text>
              </View>
            ) : showResults ? (
              <ResultsScreen
                correct={correctCount}
                total={questions.length}
                xpEarned={xpEarned}
                lang={language}
                gold={gold}
                theme={theme}
                isDark={isDark}
                onDone={() => { haptic('medium'); onClose(); }}
              />
            ) : q ? (
              <Animated.View style={{ opacity: fadeIn, transform: [{ translateY: slideIn }] }}>
                {/* Question card */}
                <View style={[ms.qCard, { backgroundColor: isDark ? '#141007' : '#FFFFFF', borderColor: gold + '25' }]}>
                  <View style={[ms.qAccent, { backgroundColor: gold }]} />
                  <Text style={[ms.qText, { color: theme.text }]}>{q.questionText}</Text>
                </View>

                {/* Options */}
                <View style={ms.options}>
                  {q.options.map((opt, i) => {
                    const userAnswer = answered[qIndex];
                    let state: 'idle' | 'correct' | 'wrong' | 'missed' = 'idle';
                    if (userAnswer !== null) {
                      if (i === q.correctIndex) state = 'missed';
                      if (i === userAnswer && userAnswer === q.correctIndex) state = 'correct';
                      if (i === userAnswer && userAnswer !== q.correctIndex) state = 'wrong';
                    }
                    return (
                      <OptionBtn
                        key={i}
                        text={opt}
                        index={i}
                        state={state}
                        theme={theme}
                        isDark={isDark}
                        gold={gold}
                        onPress={() => onAnswer(i)}
                      />
                    );
                  })}
                </View>

                {/* XP earned so far */}
                {xpEarned > 0 && (
                  <View style={[ms.xpBar, { backgroundColor: gold + '12', borderColor: gold + '25' }]}>
                    <Zap size={12} color={gold} fill={gold} />
                    <Text style={[ms.xpText, { color: gold }]}>+{xpEarned} XP {tx(language, 'xp_earned')}</Text>
                  </View>
                )}
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
  subtitle: { fontSize: 12, fontWeight: '500', marginTop: 3, opacity: 0.5 },
  closeBtn: { width: 34, height: 34, borderRadius: 11, borderWidth: 1, alignItems: 'center', justifyContent: 'center' },
  dots: { flexDirection: 'row', alignItems: 'center', gap: 5, paddingHorizontal: 22, paddingBottom: 14 },
  dot: { height: 6, borderRadius: 3 },
  scroll: { paddingHorizontal: 22, paddingTop: 4, paddingBottom: 16 },
  qCard: {
    borderRadius: 18, borderWidth: 1, padding: 18, marginBottom: 20,
    overflow: 'hidden',
  },
  qAccent: { position: 'absolute', left: 0, top: 0, bottom: 0, width: 4 },
  qText: { fontSize: 16, fontWeight: '700', lineHeight: 24, fontFamily: SERIF, paddingLeft: 8 },
  options: { gap: 0 },
  xpBar: { flexDirection: 'row', alignItems: 'center', gap: 6, padding: 10, borderRadius: 12, borderWidth: 1, marginTop: 6, justifyContent: 'center' },
  xpText: { fontSize: 12, fontWeight: '800' },
});
