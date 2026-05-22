// components/QuizSection.tsx
import * as Haptics from 'expo-haptics';
import { LinearGradient } from 'expo-linear-gradient';
import { Check, ChevronDown, Sparkles, Trophy, X as XIcon } from 'lucide-react-native';
import React, { useCallback, useEffect, useRef, useState } from 'react';
import {
  ActivityIndicator,
  Animated,
  Easing,
  LayoutChangeEvent,
  Platform,
  Pressable,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { useTheme } from '../context/ThemeContext';
import { useQuiz } from '../hooks/useQuiz';
import { useGamificationStore } from '../store/useGamificationStore';

const SERIF = Platform.OS === 'ios' ? 'Georgia' : 'serif';

const L: Record<string, Record<string, string>> = {
  en: { kicker: 'Knowledge Check', cta: 'Test your knowledge', tap: 'Tap to begin', q: 'question', qs: 'questions', submit: 'Submit', done: 'Completed', answered: 'answered', correct: 'correct', perfect: 'Perfect', great: 'Nicely done', review: 'Your result', xp: 'XP', need: 'Answer all questions' },
  ro: { kicker: 'Test de Cunoștințe', cta: 'Testează-ți cunoștințele', tap: 'Apasă pentru a începe', q: 'întrebare', qs: 'întrebări', submit: 'Trimite', done: 'Finalizat', answered: 'răspunse', correct: 'corecte', perfect: 'Perfect', great: 'Bravo', review: 'Rezultatul tău', xp: 'XP', need: 'Răspunde la toate' },
  fr: { kicker: 'Quiz', cta: 'Testez vos connaissances', tap: 'Touchez pour commencer', q: 'question', qs: 'questions', submit: 'Valider', done: 'Terminé', answered: 'répondues', correct: 'correctes', perfect: 'Parfait', great: 'Bien joué', review: 'Votre résultat', xp: 'XP', need: 'Répondez à tout' },
  de: { kicker: 'Wissens-Check', cta: 'Teste dein Wissen', tap: 'Zum Starten tippen', q: 'Frage', qs: 'Fragen', submit: 'Senden', done: 'Fertig', answered: 'beantwortet', correct: 'richtig', perfect: 'Perfekt', great: 'Gut gemacht', review: 'Dein Ergebnis', xp: 'XP', need: 'Alle beantworten' },
  es: { kicker: 'Test', cta: 'Pon a prueba tu saber', tap: 'Toca para empezar', q: 'pregunta', qs: 'preguntas', submit: 'Enviar', done: 'Completado', answered: 'resp.', correct: 'correctas', perfect: 'Perfecto', great: 'Bien hecho', review: 'Tu resultado', xp: 'XP', need: 'Responde todo' },
};

interface Props {
  eventId: string | null;
  language?: string;
  theme?: any;
  isDark?: boolean;
}

export function QuizSection({ eventId, language = 'en' }: Props) {
  const { theme, isDark } = useTheme();
  const { phase, quiz, answers, result, allAnswered, selectAnswer, submit } = useQuiz(eventId, language);
  const addQuizXP = useGamificationStore(s => s.addQuizXP);
  const recordQuizDone = useGamificationStore(s => s.recordQuizDone);
  const lbl = L[language] ?? L.en;

  const gold = theme.gold ?? '#D4A843';
  const green = '#2ECC88';
  const red = '#FF5C5C';

  // Card colors — fully opaque, no blur
  const cardBg = isDark ? '#1A1509' : '#FAF7EE';
  const ink = isDark ? '#F0E6CC' : '#1C1506';
  const sub = isDark ? 'rgba(240,230,204,0.5)' : 'rgba(28,21,6,0.45)';
  const divider = isDark ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.08)';
  const optBg = isDark ? 'rgba(255,255,255,0.05)' : 'rgba(0,0,0,0.035)';
  const optBorder = isDark ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.1)';

  const [expanded, setExpanded] = useState(false);
  const [contentH, setContentH] = useState(0);
  const [shownXP, setShownXP] = useState(0);

  const expandAnim = useRef(new Animated.Value(0)).current;
  const arrow = useRef(new Animated.Value(0)).current;
  const scorePop = useRef(new Animated.Value(0.7)).current;
  const xpCount = useRef(new Animated.Value(0)).current;
  const shimmer = useRef(new Animated.Value(0)).current;
  const awarded = useRef(false);

  const isPerfect = !!result?.perfectScore;
  const accent = phase === 'done' ? (isPerfect ? gold : green) : gold;

  useEffect(() => {
    if (phase === 'done' && result) {
      scorePop.setValue(0.7);
      xpCount.setValue(0);
      Animated.spring(scorePop, { toValue: 1, tension: 160, friction: 8, useNativeDriver: true }).start();
      Animated.timing(xpCount, { toValue: result.xpEarned, duration: 1100, easing: Easing.out(Easing.cubic), useNativeDriver: false }).start();
      const id = xpCount.addListener(({ value }) => setShownXP(Math.round(value)));
      if (isPerfect) {
        Animated.loop(
          Animated.timing(shimmer, { toValue: 1, duration: 2200, easing: Easing.inOut(Easing.sin), useNativeDriver: true }),
        ).start();
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success).catch(() => {});
      } else {
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning).catch(() => {});
      }
      return () => xpCount.removeListener(id);
    }
  }, [phase]);

  const onContentLayout = useCallback((e: LayoutChangeEvent) => {
    const h = e.nativeEvent.layout.height;
    if (h > 0 && h !== contentH) setContentH(h);
  }, [contentH]);

  if (phase === 'unavailable') return null;

  const toggle = () => {
    if (phase === 'loading') return;
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light).catch(() => {});
    const next = !expanded;
    setExpanded(next);
    Animated.spring(expandAnim, { toValue: next ? 1 : 0, tension: 55, friction: 12, useNativeDriver: false }).start();
    Animated.spring(arrow, { toValue: next ? 1 : 0, tension: 70, friction: 12, useNativeDriver: true }).start();
  };

  const pick = (qk: string, oid: string) => {
    Haptics.selectionAsync().catch(() => {});
    selectAnswer(qk, oid);
  };

  const onSubmit = async () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium).catch(() => {});
    const res = await submit();
    if (res && !awarded.current) {
      awarded.current = true;
      addQuizXP(res.xpEarned);
      recordQuizDone();
    }
  };

  const isDone = phase === 'done';
  const isLoading = phase === 'loading';
  const qCount = quiz?.questions?.length ?? 0;
  const answeredCount = quiz ? quiz.questions.filter(q => answers[q.questionKey]).length : 0;
  const progress = qCount > 0 ? answeredCount / qCount : 0;

  const rot = arrow.interpolate({ inputRange: [0, 1], outputRange: ['0deg', '180deg'] });
  const animH = contentH > 0 ? expandAnim.interpolate({ inputRange: [0, 1], outputRange: [0, contentH] }) : 0;
  const shimmerX = shimmer.interpolate({ inputRange: [0, 1], outputRange: [-240, 240] });

  return (
    <View style={s.outer}>
      <View style={[
        s.card,
        { backgroundColor: cardBg, shadowColor: accent },
        isDone && { borderColor: accent + '55' },
        !isDone && { borderColor: divider },
      ]}>
        {/* Left accent bar */}
        <View style={[s.accentBar, { backgroundColor: accent }]} />

        {/* ═══ TRIGGER ═══ */}
        <Pressable onPress={toggle} style={({ pressed }) => [s.trigger, pressed && { opacity: 0.85 }]}>
          <View style={[s.iconBox, { backgroundColor: accent + '1A', borderColor: accent + '44' }]}>
            {isLoading
              ? <ActivityIndicator size="small" color={accent} />
              : isDone
                ? (isPerfect
                  ? <Trophy size={19} color={accent} strokeWidth={2} />
                  : <Check size={19} color={accent} strokeWidth={2.8} />)
                : <Sparkles size={19} color={accent} strokeWidth={2} />}
          </View>

          <View style={{ flex: 1 }}>
            <Text style={[s.kicker, { color: accent }]}>
              {(isDone ? lbl.review : lbl.kicker).toUpperCase()}
            </Text>
            <Text style={[s.title, { color: ink }]} numberOfLines={1}>
              {isDone ? lbl.done : lbl.cta}
            </Text>
            <Text style={[s.subText, { color: sub }]} numberOfLines={1}>
              {isDone && result
                ? `${result.correctAnswers}/${result.totalQuestions} ${lbl.correct}  ·  +${result.xpEarned} ${lbl.xp}`
                : isLoading
                  ? lbl.tap
                  : `${qCount} ${qCount === 1 ? lbl.q : lbl.qs}  ·  ${lbl.tap}`}
            </Text>
          </View>

          <Animated.View style={{ transform: [{ rotate: rot }] }}>
            <View style={[s.chevBox, { borderColor: divider }]}>
              <ChevronDown size={15} color={sub} strokeWidth={2.5} />
            </View>
          </Animated.View>
        </Pressable>

        {/* ═══ BODY ═══ */}
        <Animated.View style={{ height: animH, overflow: 'hidden' }}>
          <View onLayout={onContentLayout} style={s.body}>
            <View style={[s.divider, { backgroundColor: divider }]} />

            {/* QUESTIONS */}
            {(phase === 'ready' || phase === 'submitting') && quiz && (
              <View style={{ gap: 20 }}>
                {/* progress bar */}
                <View style={s.progressRow}>
                  <View style={[s.progressTrack, { backgroundColor: isDark ? 'rgba(255,255,255,0.07)' : 'rgba(0,0,0,0.07)' }]}>
                    <Animated.View style={[s.progressFill, { width: `${progress * 100}%`, backgroundColor: accent }]} />
                  </View>
                  <Text style={[s.progressTxt, { color: accent }]}>{answeredCount}/{qCount}</Text>
                </View>

                {quiz.questions.map((q, qi) => (
                  <View key={q.questionKey} style={{ gap: 10 }}>
                    <View style={s.qHead}>
                      <View style={[s.qNum, { backgroundColor: accent + '22', borderColor: accent + '44' }]}>
                        <Text style={[s.qNumTxt, { color: accent }]}>{qi + 1}</Text>
                      </View>
                      <Text style={[s.qText, { color: ink }]}>{q.question}</Text>
                    </View>
                    <View style={{ gap: 8, paddingLeft: 2 }}>
                      {q.options.map((opt, oi) => {
                        const sel = answers[q.questionKey] === opt.optionId;
                        return (
                          <Pressable
                            key={opt.optionId}
                            onPress={() => pick(q.questionKey, opt.optionId)}
                            style={({ pressed }) => [
                              s.opt,
                              sel
                                ? { backgroundColor: accent + '18', borderColor: accent + 'BB' }
                                : { backgroundColor: optBg, borderColor: optBorder },
                              pressed && { transform: [{ scale: 0.985 }] },
                            ]}
                          >
                            <View style={[
                              s.letter,
                              sel
                                ? { backgroundColor: accent, borderColor: accent }
                                : { backgroundColor: 'transparent', borderColor: optBorder },
                            ]}>
                              {sel
                                ? <Check size={12} color={isDark ? '#1A1208' : '#fff'} strokeWidth={3.5} />
                                : <Text style={[s.letterTxt, { color: sub }]}>{String.fromCharCode(65 + oi)}</Text>}
                            </View>
                            <Text style={[
                              s.optTxt,
                              { color: sel ? ink : (isDark ? 'rgba(240,230,204,0.82)' : 'rgba(28,21,6,0.8)'), fontWeight: sel ? '700' : '500' },
                            ]}>
                              {opt.text}
                            </Text>
                          </Pressable>
                        );
                      })}
                    </View>
                  </View>
                ))}

                {/* submit button */}
                <Pressable
                  onPress={onSubmit}
                  disabled={!allAnswered || phase === 'submitting'}
                  style={({ pressed }) => [s.submitWrap, pressed && { opacity: 0.88 }]}
                >
                  {allAnswered ? (
                    <LinearGradient
                      colors={[gold, isDark ? '#B07E1E' : '#9A6E18']}
                      start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }}
                      style={s.submitBtn}
                    >
                      {phase === 'submitting'
                        ? <ActivityIndicator size="small" color={isDark ? '#1A1208' : '#fff'} />
                        : <>
                          <Text style={[s.submitTxt, { color: '#1A1208' }]}>{lbl.submit}</Text>
                          <Sparkles size={14} color="#1A1208" strokeWidth={2.5} />
                        </>}
                    </LinearGradient>
                  ) : (
                    <View style={[s.submitBtn, { backgroundColor: optBg, borderWidth: 1, borderColor: optBorder }]}>
                      <Text style={[s.submitTxt, { color: sub }]}>{lbl.need}</Text>
                    </View>
                  )}
                </Pressable>
              </View>
            )}

            {/* RESULTS */}
            {phase === 'done' && result && quiz && (
              <View style={{ gap: 10 }}>
                {/* Score card */}
                <Animated.View style={[s.scoreCard, { backgroundColor: accent + '12', borderColor: accent + '44' }, { transform: [{ scale: scorePop }] }]}>
                  {isPerfect && (
                    <Animated.View
                      pointerEvents="none"
                      style={[StyleSheet.absoluteFill, { transform: [{ translateX: shimmerX }, { rotate: '15deg' }], borderRadius: 16, overflow: 'hidden' }]}
                    >
                      <LinearGradient
                        colors={['transparent', accent + '2A', 'transparent']}
                        start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }}
                        style={{ flex: 1, width: 100 }}
                      />
                    </Animated.View>
                  )}
                  <View style={[s.scoreBadge, { backgroundColor: accent + '22', borderColor: accent + '55' }]}>
                    {isPerfect
                      ? <Trophy size={24} color={accent} strokeWidth={1.9} />
                      : <Check size={24} color={accent} strokeWidth={2.6} />}
                  </View>
                  <Text style={[s.scoreLabel, { color: accent }]}>
                    {isPerfect ? lbl.perfect : lbl.great}
                  </Text>
                  <View style={s.scoreRow}>
                    <Text style={[s.scoreBig, { color: ink }]}>{result.correctAnswers}</Text>
                    <Text style={[s.scoreSmall, { color: sub }]}>/ {result.totalQuestions}</Text>
                  </View>
                  <View style={[s.xpPill, { backgroundColor: accent }]}>
                    <Sparkles size={12} color="#1A1208" strokeWidth={2.5} />
                    <Text style={s.xpPillTxt}>+{shownXP} {lbl.xp}</Text>
                  </View>
                </Animated.View>

                {/* Per-question review */}
                {result.answerResults.length > 0 && quiz.questions.map((q, qi) => {
                  const info = result.answerResults.find(r => r.questionKey === q.questionKey);
                  const ok = info?.isCorrect ?? false;
                  const myOpt = answers[q.questionKey];
                  const rightOpt = info?.correctOptionId;
                  const c = ok ? green : red;
                  return (
                    <View key={q.questionKey} style={[s.resCard, { backgroundColor: c + '0D', borderColor: c + '30' }]}>
                      <View style={s.resHead}>
                        <View style={[s.resDot, { backgroundColor: c + '22' }]}>
                          {ok
                            ? <Check size={12} color={c} strokeWidth={3.2} />
                            : <XIcon size={12} color={c} strokeWidth={3.2} />}
                        </View>
                        <Text style={[s.resQ, { color: ink }]}>{qi + 1}. {q.question}</Text>
                      </View>
                      <View style={{ gap: 6, marginLeft: 32 }}>
                        {q.options.map(opt => {
                          const mine = opt.optionId === myOpt;
                          const right = opt.optionId === rightOpt;
                          if (!mine && !right) return null;
                          const oc = right ? green : red;
                          return (
                            <View key={opt.optionId} style={[s.resOpt, { backgroundColor: oc + '12', borderColor: oc + '33' }]}>
                              {right
                                ? <Check size={11} color={green} strokeWidth={3.2} />
                                : <XIcon size={11} color={red} strokeWidth={3.2} />}
                              <Text style={[s.resOptTxt, { color: oc }]}>{opt.text}</Text>
                            </View>
                          );
                        })}
                      </View>
                      {q.explanation ? (
                        <Text style={[s.expl, { color: sub }]}>{q.explanation}</Text>
                      ) : null}
                    </View>
                  );
                })}
              </View>
            )}

            {phase === 'done' && !result && (
              <View style={s.doneEmpty}>
                <Check size={22} color={green} strokeWidth={2.4} />
                <Text style={[s.doneEmptyTxt, { color: sub }]}>{lbl.done}</Text>
              </View>
            )}
          </View>
        </Animated.View>
      </View>
    </View>
  );
}

const s = StyleSheet.create({
  outer: { marginTop: 24 },

  card: {
    borderRadius: 20,
    borderWidth: 1,
    overflow: 'hidden',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.18,
    shadowRadius: 18,
    elevation: 8,
  },

  accentBar: { position: 'absolute', left: 0, top: 0, bottom: 0, width: 3 },

  // Trigger
  trigger: { flexDirection: 'row', alignItems: 'center', gap: 13, paddingLeft: 18, paddingRight: 14, paddingVertical: 16 },
  iconBox: { width: 42, height: 42, borderRadius: 13, borderWidth: 1, alignItems: 'center', justifyContent: 'center' },
  kicker: { fontSize: 9, fontWeight: '800', letterSpacing: 2.5, marginBottom: 2 },
  title: { fontSize: 16, fontWeight: '700', letterSpacing: -0.3, fontFamily: SERIF },
  subText: { fontSize: 11.5, marginTop: 2, fontWeight: '500' },
  chevBox: { width: 28, height: 28, borderRadius: 14, borderWidth: 1, alignItems: 'center', justifyContent: 'center' },

  // Body
  body: { paddingLeft: 18, paddingRight: 14, paddingBottom: 18 },
  divider: { height: StyleSheet.hairlineWidth, marginBottom: 18 },

  progressRow: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  progressTrack: { flex: 1, height: 4, borderRadius: 2, overflow: 'hidden' },
  progressFill: { height: 4, borderRadius: 2 },
  progressTxt: { fontSize: 10, fontWeight: '800', letterSpacing: 0.5, minWidth: 28, textAlign: 'right' },

  qHead: { flexDirection: 'row', gap: 10, alignItems: 'flex-start' },
  qNum: { width: 24, height: 24, borderRadius: 8, borderWidth: 1, alignItems: 'center', justifyContent: 'center', marginTop: 1 },
  qNumTxt: { fontSize: 11, fontWeight: '900' },
  qText: { flex: 1, fontSize: 15, fontWeight: '600', lineHeight: 22, fontFamily: SERIF },

  opt: { flexDirection: 'row', alignItems: 'center', gap: 11, paddingHorizontal: 13, paddingVertical: 12, borderRadius: 13, borderWidth: 1 },
  letter: { width: 24, height: 24, borderRadius: 7, borderWidth: 1.5, alignItems: 'center', justifyContent: 'center' },
  letterTxt: { fontSize: 11, fontWeight: '900' },
  optTxt: { flex: 1, fontSize: 14, lineHeight: 20 },

  submitWrap: { borderRadius: 14, overflow: 'hidden', marginTop: 2 },
  submitBtn: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, paddingVertical: 15, borderRadius: 14 },
  submitTxt: { fontSize: 12, fontWeight: '900', letterSpacing: 1.8, textTransform: 'uppercase' },

  // Results — score card
  scoreCard: { borderRadius: 16, borderWidth: 1, alignItems: 'center', paddingVertical: 24, paddingHorizontal: 18, gap: 4, overflow: 'hidden' },
  scoreBadge: { width: 54, height: 54, borderRadius: 18, borderWidth: 1, alignItems: 'center', justifyContent: 'center', marginBottom: 8 },
  scoreLabel: { fontSize: 14, fontWeight: '800', letterSpacing: 0.4, fontFamily: SERIF },
  scoreRow: { flexDirection: 'row', alignItems: 'baseline', gap: 4, marginTop: 6 },
  scoreBig: { fontSize: 52, fontWeight: '900', letterSpacing: -2, lineHeight: 56, fontFamily: SERIF },
  scoreSmall: { fontSize: 20, fontWeight: '600' },
  xpPill: { flexDirection: 'row', alignItems: 'center', gap: 6, paddingHorizontal: 14, paddingVertical: 8, borderRadius: 22, marginTop: 14 },
  xpPillTxt: { fontSize: 13, fontWeight: '900', color: '#1A1208', letterSpacing: 0.3 },

  resCard: { borderRadius: 14, borderWidth: 1, padding: 12, gap: 8 },
  resHead: { flexDirection: 'row', gap: 10, alignItems: 'flex-start' },
  resDot: { width: 22, height: 22, borderRadius: 7, alignItems: 'center', justifyContent: 'center' },
  resQ: { flex: 1, fontSize: 13, fontWeight: '600', lineHeight: 18, paddingTop: 2 },
  resOpt: { flexDirection: 'row', alignItems: 'center', gap: 8, paddingHorizontal: 10, paddingVertical: 8, borderRadius: 10, borderWidth: 1 },
  resOptTxt: { flex: 1, fontSize: 12.5, fontWeight: '600' },
  expl: { fontSize: 11.5, lineHeight: 17, marginLeft: 32, fontStyle: 'italic', opacity: 0.8 },

  doneEmpty: { alignItems: 'center', gap: 10, paddingVertical: 16 },
  doneEmptyTxt: { fontSize: 13, fontWeight: '600' },
});
