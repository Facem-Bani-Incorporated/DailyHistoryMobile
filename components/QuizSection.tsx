// components/QuizSection.tsx
import { LinearGradient } from 'expo-linear-gradient';
import {
  Check,
  CheckCircle2,
  ChevronDown,
  Sparkles,
  Trophy,
  X as XIcon,
  Zap,
} from 'lucide-react-native';
import React, { useCallback, useEffect, useRef, useState } from 'react';
import {
  ActivityIndicator,
  Animated,
  Easing,
  LayoutAnimation,
  LayoutChangeEvent,
  Platform,
  StyleSheet,
  Text,
  TouchableOpacity,
  UIManager,
  View,
} from 'react-native';
import { useQuiz } from '../hooks/useQuiz';
import { useGamificationStore } from '../store/useGamificationStore';

if (Platform.OS === 'android' && UIManager.setLayoutAnimationEnabledExperimental) {
  UIManager.setLayoutAnimationEnabledExperimental(true);
}

const SANS = Platform.OS === 'ios' ? 'System' : 'sans-serif';
const SERIF = Platform.OS === 'ios' ? 'Georgia' : 'serif';

// XP awarded client-side: a perfect run is worth 500, otherwise 100.
const XP_PERFECT = 500;
const XP_PARTIAL = 100;

const L: Record<string, Record<string, string>> = {
  en: { cta: 'Test Your Knowledge', tap: 'Tap to begin', questions: 'questions', question: 'question', submit: 'Submit Answers', correct: 'correct', done: 'Quiz Completed', allRequired: 'Answer every question to continue', perfect: 'Flawless Victory', great: 'Well Played', review: 'Review', answered: 'answered', xp: 'XP' },
  ro: { cta: 'Testează-ți Cunoștințele', tap: 'Apasă pentru a începe', questions: 'întrebări', question: 'întrebare', submit: 'Trimite Răspunsurile', correct: 'corecte', done: 'Quiz Finalizat', allRequired: 'Răspunde la toate întrebările pentru a continua', perfect: 'Victorie Perfectă', great: 'Bine Jucat', review: 'Recapitulare', answered: 'răspunse', xp: 'XP' },
  fr: { cta: 'Testez vos Connaissances', tap: 'Touchez pour commencer', questions: 'questions', question: 'question', submit: 'Soumettre', correct: 'correctes', done: 'Quiz Terminé', allRequired: 'Répondez à toutes les questions pour continuer', perfect: 'Victoire Parfaite', great: 'Bien Joué', review: 'Révision', answered: 'répondues', xp: 'XP' },
  de: { cta: 'Teste Dein Wissen', tap: 'Tippen zum Starten', questions: 'Fragen', question: 'Frage', submit: 'Antworten Senden', correct: 'richtig', done: 'Quiz Abgeschlossen', allRequired: 'Beantworte alle Fragen, um fortzufahren', perfect: 'Perfekter Sieg', great: 'Gut Gespielt', review: 'Überblick', answered: 'beantwortet', xp: 'XP' },
  es: { cta: 'Pon a Prueba tu Conocimiento', tap: 'Toca para empezar', questions: 'preguntas', question: 'pregunta', submit: 'Enviar Respuestas', correct: 'correctas', done: 'Quiz Completado', allRequired: 'Responde todas las preguntas para continuar', perfect: 'Victoria Perfecta', great: 'Bien Jugado', review: 'Repaso', answered: 'respondidas', xp: 'XP' },
};

interface Props {
  eventId: string | null;
  language?: string;
  theme: any;
  isDark: boolean;
}

export function QuizSection({ eventId, language = 'en', theme, isDark }: Props) {
  const { phase, quiz, answers, result, allAnswered, selectAnswer, submit } = useQuiz(eventId, language);
  const addQuizXP = useGamificationStore(s => s.addQuizXP);
  const lbl = L[language] ?? L.en;

  const [expanded, setExpanded] = useState(false);
  const [contentH, setContentH] = useState(0);
  const [displayXP, setDisplayXP] = useState(0);

  const expandAnim = useRef(new Animated.Value(0)).current;
  const arrowAnim = useRef(new Animated.Value(0)).current;
  const pulse = useRef(new Animated.Value(0)).current;
  const xpAnim = useRef(new Animated.Value(0)).current;
  const scoreScale = useRef(new Animated.Value(0.7)).current;
  const awardedRef = useRef(false);

  // ── Palette ──
  const gold = theme.gold ?? '#D4A843';
  const textMain = theme.text ?? (isDark ? '#F5F1E8' : '#1A1208');
  const textSub = theme.subtext ?? (isDark ? 'rgba(245,241,232,0.5)' : 'rgba(26,18,8,0.45)');
  const surf = isDark ? 'rgba(255,255,255,0.035)' : 'rgba(0,0,0,0.025)';
  const surfRaised = isDark ? 'rgba(255,255,255,0.06)' : 'rgba(0,0,0,0.04)';
  const border = isDark ? 'rgba(255,255,255,0.09)' : 'rgba(0,0,0,0.08)';
  const green = '#4ade80';
  const red = '#f87171';

  const isPerfect = !!result?.perfectScore;
  const earnedXP = result ? (isPerfect ? XP_PERFECT : XP_PARTIAL) : 0;

  // ── Idle glow pulse on the trigger ──
  useEffect(() => {
    if (phase === 'ready' || phase === 'loading') {
      Animated.loop(
        Animated.sequence([
          Animated.timing(pulse, { toValue: 1, duration: 1800, easing: Easing.inOut(Easing.sin), useNativeDriver: true }),
          Animated.timing(pulse, { toValue: 0, duration: 1800, easing: Easing.inOut(Easing.sin), useNativeDriver: true }),
        ]),
      ).start();
    }
  }, [phase]);

  // ── Animate the results reveal (score pop + XP count-up) ──
  useEffect(() => {
    if (phase === 'done' && result) {
      scoreScale.setValue(0.7);
      xpAnim.setValue(0);
      Animated.spring(scoreScale, { toValue: 1, tension: 120, friction: 9, useNativeDriver: true }).start();
      Animated.timing(xpAnim, { toValue: earnedXP, duration: 1100, easing: Easing.out(Easing.cubic), useNativeDriver: false }).start();
      const id = xpAnim.addListener(({ value }) => setDisplayXP(Math.round(value)));
      if (expanded) LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
      return () => xpAnim.removeListener(id);
    }
  }, [phase]);

  // ── Unavailable: render nothing in production; a hint in dev so we can see WHY ──
  if (phase === 'unavailable') {
    if (__DEV__) {
      return (
        <View style={[st.devNote, { borderColor: border }]}>
          <Text style={[st.devNoteText, { color: textSub }]}>
            [quiz] no quiz for event {String(eventId)} (404 / empty)
          </Text>
        </View>
      );
    }
    return null;
  }

  const onContentLayout = useCallback((e: LayoutChangeEvent) => {
    const h = e.nativeEvent.layout.height;
    if (h > 0 && h !== contentH) setContentH(h);
  }, [contentH]);

  const toggle = () => {
    if (phase === 'loading') return;
    const next = !expanded;
    setExpanded(next);
    Animated.spring(expandAnim, { toValue: next ? 1 : 0, tension: 60, friction: 12, useNativeDriver: false }).start();
    Animated.spring(arrowAnim, { toValue: next ? 1 : 0, tension: 80, friction: 12, useNativeDriver: true }).start();
  };

  const handleSubmit = async () => {
    const res = await submit();
    if (res && !awardedRef.current) {
      awardedRef.current = true;
      addQuizXP(res.perfectScore ? XP_PERFECT : XP_PARTIAL);
    }
  };

  const isDone = phase === 'done';
  const isLoading = phase === 'loading';
  const qCount = quiz?.questions?.length ?? 0;
  const answeredCount = quiz ? quiz.questions.filter(q => answers[q.questionKey]).length : 0;
  const progress = qCount > 0 ? answeredCount / qCount : 0;

  const arrowRot = arrowAnim.interpolate({ inputRange: [0, 1], outputRange: ['0deg', '180deg'] });
  const animH = contentH > 0
    ? expandAnim.interpolate({ inputRange: [0, 1], outputRange: [0, contentH] })
    : 0;
  const glowOpacity = pulse.interpolate({ inputRange: [0, 1], outputRange: [0.18, 0.5] });

  const accent = isDone ? (isPerfect ? gold : green) : gold;

  return (
    <View style={[st.wrap, { borderColor: isDone ? accent + '50' : border, backgroundColor: isDark ? '#0E0C09' : '#FFFDF8' }]}>
      {/* Animated accent glow on the edge */}
      {(phase === 'ready' || isLoading) && (
        <Animated.View
          pointerEvents="none"
          style={[StyleSheet.absoluteFill, { borderRadius: 20, borderWidth: 1, borderColor: gold, opacity: glowOpacity }]}
        />
      )}

      {/* ═══ TRIGGER ═══ */}
      <TouchableOpacity onPress={toggle} activeOpacity={0.85} style={st.trigger}>
        <LinearGradient
          colors={isDone
            ? [accent + '22', accent + '08', 'transparent']
            : [gold + '1C', gold + '06', 'transparent']}
          start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }}
          style={StyleSheet.absoluteFill}
        />

        <View style={[st.iconOrb, { backgroundColor: accent + '1A', borderColor: accent + '38' }]}>
          {isLoading
            ? <ActivityIndicator size="small" color={gold} />
            : isDone
              ? (isPerfect
                  ? <Trophy size={19} color={accent} strokeWidth={2} fill={accent + '40'} />
                  : <CheckCircle2 size={19} color={accent} strokeWidth={2.2} />)
              : <Zap size={19} color={gold} strokeWidth={2} fill={gold + '35'} />}
        </View>

        <View style={{ flex: 1 }}>
          <Text style={[st.triggerKicker, { color: accent }]}>
            {isDone ? lbl.review.toUpperCase() : 'QUIZ'}
          </Text>
          <Text style={[st.triggerTitle, { color: textMain }]} numberOfLines={1}>
            {isDone ? lbl.done : lbl.cta}
          </Text>
          {isDone && result ? (
            <Text style={[st.triggerSub, { color: textSub }]}>
              {result.correctAnswers}/{result.totalQuestions} {lbl.correct}  ·  +{earnedXP} {lbl.xp}
            </Text>
          ) : (
            <Text style={[st.triggerSub, { color: textSub }]}>
              {isLoading ? lbl.tap : `${qCount} ${qCount === 1 ? lbl.question : lbl.questions}  ·  ${lbl.tap}`}
            </Text>
          )}
        </View>

        <Animated.View style={{ transform: [{ rotate: arrowRot }] }}>
          <ChevronDown size={20} color={accent} strokeWidth={2.4} />
        </Animated.View>
      </TouchableOpacity>

      {/* ═══ EXPANDING BODY ═══ */}
      <Animated.View style={{ height: animH, overflow: 'hidden' }}>
        <View onLayout={onContentLayout} style={st.inner}>
          <View style={[st.divider, { backgroundColor: border }]} />

          {/* ─── QUESTIONS ─── */}
          {(phase === 'ready' || phase === 'submitting') && quiz && (
            <View style={{ gap: 22 }}>
              {/* Progress header */}
              <View style={st.progressRow}>
                <Text style={[st.progressLabel, { color: textSub }]}>
                  {answeredCount}/{qCount} {lbl.answered}
                </Text>
                <View style={[st.progressTrack, { backgroundColor: surfRaised }]}>
                  <View style={[st.progressFill, { width: `${progress * 100}%`, backgroundColor: gold }]} />
                </View>
              </View>

              {quiz.questions.map((q, qi) => (
                <View key={q.questionKey} style={st.qBlock}>
                  <View style={st.qHeader}>
                    <View style={[st.qNumBadge, { backgroundColor: gold + '18', borderColor: gold + '38' }]}>
                      <Text style={[st.qNum, { color: gold }]}>{qi + 1}</Text>
                    </View>
                    <Text style={[st.qText, { color: textMain }]}>{q.question}</Text>
                  </View>

                  <View style={{ gap: 8 }}>
                    {q.options.map((opt, oi) => {
                      const sel = answers[q.questionKey] === opt.optionId;
                      return (
                        <TouchableOpacity
                          key={opt.optionId}
                          onPress={() => selectAnswer(q.questionKey, opt.optionId)}
                          activeOpacity={0.7}
                          style={[st.opt, {
                            backgroundColor: sel ? gold + '18' : surf,
                            borderColor: sel ? gold : border,
                          }]}
                        >
                          <View style={[st.optLetter, {
                            backgroundColor: sel ? gold : 'transparent',
                            borderColor: sel ? gold : (isDark ? 'rgba(255,255,255,0.2)' : 'rgba(0,0,0,0.18)'),
                          }]}>
                            <Text style={[st.optLetterText, { color: sel ? '#1A1208' : textSub }]}>
                              {String.fromCharCode(65 + oi)}
                            </Text>
                          </View>
                          <Text style={[st.optText, { color: sel ? textMain : textMain, fontWeight: sel ? '700' : '500' }]}>
                            {opt.text}
                          </Text>
                          {sel && <Check size={15} color={gold} strokeWidth={3} />}
                        </TouchableOpacity>
                      );
                    })}
                  </View>
                </View>
              ))}

              {/* Submit */}
              <TouchableOpacity
                onPress={handleSubmit}
                disabled={!allAnswered || phase === 'submitting'}
                activeOpacity={0.85}
                style={st.submitWrap}
              >
                <LinearGradient
                  colors={allAnswered ? [gold, '#C8923A'] : [surfRaised, surfRaised]}
                  start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }}
                  style={st.submitBtn}
                >
                  {phase === 'submitting'
                    ? <ActivityIndicator size="small" color="#1A1208" />
                    : (
                      <>
                        <Text style={[st.submitText, { color: allAnswered ? '#1A1208' : textSub }]}>
                          {lbl.submit}
                        </Text>
                        {allAnswered && <Sparkles size={16} color="#1A1208" strokeWidth={2.4} />}
                      </>
                    )}
                </LinearGradient>
              </TouchableOpacity>

              {!allAnswered && (
                <Text style={[st.hint, { color: textSub }]}>{lbl.allRequired}</Text>
              )}
            </View>
          )}

          {/* ─── RESULTS ─── */}
          {phase === 'done' && result && quiz && (
            <View style={{ gap: 14 }}>
              {/* Hero score banner */}
              <Animated.View style={{ transform: [{ scale: scoreScale }] }}>
                <LinearGradient
                  colors={isPerfect
                    ? [gold + '26', gold + '0E', 'transparent']
                    : [green + '1E', green + '08', 'transparent']}
                  start={{ x: 0, y: 0 }} end={{ x: 0, y: 1 }}
                  style={[st.scoreBanner, { borderColor: accent + '40' }]}
                >
                  <View style={[st.scoreBadge, { backgroundColor: accent + '18', borderColor: accent + '45' }]}>
                    {isPerfect
                      ? <Trophy size={26} color={accent} strokeWidth={1.8} fill={accent + '35'} />
                      : <CheckCircle2 size={26} color={accent} strokeWidth={2} />}
                  </View>

                  <Text style={[st.scoreTitle, { color: accent }]}>
                    {isPerfect ? lbl.perfect : lbl.great}
                  </Text>

                  <View style={st.scoreNumRow}>
                    <Text style={[st.scoreNum, { color: textMain }]}>{result.correctAnswers}</Text>
                    <Text style={[st.scoreDenom, { color: textSub }]}>/ {result.totalQuestions}</Text>
                  </View>
                  <Text style={[st.scoreCorrect, { color: textSub }]}>{lbl.correct}</Text>

                  {/* Animated XP pill */}
                  <View style={[st.xpPill, { backgroundColor: accent, shadowColor: accent }]}>
                    <Zap size={15} color="#1A1208" strokeWidth={2.5} fill="#1A1208" />
                    <Text style={st.xpPillText}>+{displayXP} {lbl.xp}</Text>
                  </View>
                </LinearGradient>
              </Animated.View>

              {/* Per-question breakdown */}
              {result.answerResults.length > 0 && quiz.questions.map((q, qi) => {
                const info = result.answerResults.find(r => r.questionKey === q.questionKey);
                const ok = info?.isCorrect ?? false;
                const myOpt = answers[q.questionKey];
                const rightOpt = info?.correctOptionId;
                const c = ok ? green : red;
                return (
                  <View key={q.questionKey} style={[st.resCard, { backgroundColor: c + '0C', borderColor: c + '2E' }]}>
                    <View style={st.resHead}>
                      <View style={[st.resIcon, { backgroundColor: c + '20' }]}>
                        {ok
                          ? <Check size={13} color={c} strokeWidth={3} />
                          : <XIcon size={13} color={c} strokeWidth={3} />}
                      </View>
                      <Text style={[st.resQ, { color: textMain }]}>{qi + 1}. {q.question}</Text>
                    </View>

                    <View style={{ gap: 6, marginLeft: 34 }}>
                      {q.options.map(opt => {
                        const mine = opt.optionId === myOpt;
                        const right = opt.optionId === rightOpt;
                        if (!mine && !right) return null;
                        const oc = right ? green : red;
                        return (
                          <View key={opt.optionId} style={[st.resOpt, { backgroundColor: oc + '16', borderColor: oc + '40' }]}>
                            {right
                              ? <Check size={12} color={green} strokeWidth={3} />
                              : <XIcon size={12} color={red} strokeWidth={3} />}
                            <Text style={[st.resOptText, { color: oc }]}>{opt.text}</Text>
                          </View>
                        );
                      })}
                    </View>

                    {q.explanation ? (
                      <Text style={[st.explanation, { color: textSub }]}>{q.explanation}</Text>
                    ) : null}
                  </View>
                );
              })}
            </View>
          )}

          {/* ─── Done, no detail (reloaded) ─── */}
          {phase === 'done' && !result && (
            <View style={st.doneEmpty}>
              <CheckCircle2 size={26} color={green} strokeWidth={2} />
              <Text style={[st.doneEmptyText, { color: textSub }]}>{lbl.done}</Text>
            </View>
          )}
        </View>
      </Animated.View>
    </View>
  );
}

/* ═══════════════════════════════════════════════════════════ */
const st = StyleSheet.create({
  wrap: { marginTop: 28, borderRadius: 20, borderWidth: 1, overflow: 'hidden' },

  // Trigger
  trigger: { flexDirection: 'row', alignItems: 'center', gap: 14, paddingHorizontal: 16, paddingVertical: 16 },
  iconOrb: { width: 44, height: 44, borderRadius: 14, alignItems: 'center', justifyContent: 'center', borderWidth: 1 },
  triggerKicker: { fontSize: 9, fontWeight: '900', letterSpacing: 2.4, marginBottom: 3 },
  triggerTitle: { fontSize: 17, fontWeight: '800', letterSpacing: -0.4, fontFamily: SERIF },
  triggerSub: { fontSize: 11.5, marginTop: 3, letterSpacing: 0.1, fontWeight: '500' },

  // Body
  inner: { paddingHorizontal: 16, paddingBottom: 18 },
  divider: { height: StyleSheet.hairlineWidth, marginBottom: 18 },

  // Progress
  progressRow: { gap: 7 },
  progressLabel: { fontSize: 10, fontWeight: '700', letterSpacing: 1, textTransform: 'uppercase' },
  progressTrack: { height: 4, borderRadius: 2, overflow: 'hidden' },
  progressFill: { height: 4, borderRadius: 2 },

  // Question
  qBlock: { gap: 12 },
  qHeader: { flexDirection: 'row', gap: 11, alignItems: 'flex-start' },
  qNumBadge: { width: 26, height: 26, borderRadius: 9, borderWidth: 1, alignItems: 'center', justifyContent: 'center' },
  qNum: { fontSize: 13, fontWeight: '900', fontFamily: SANS },
  qText: { flex: 1, fontSize: 15, fontWeight: '700', lineHeight: 21, paddingTop: 2, fontFamily: SERIF },

  // Options
  opt: { flexDirection: 'row', alignItems: 'center', gap: 12, paddingHorizontal: 13, paddingVertical: 13, borderRadius: 13, borderWidth: 1 },
  optLetter: { width: 24, height: 24, borderRadius: 8, borderWidth: 1.5, alignItems: 'center', justifyContent: 'center' },
  optLetterText: { fontSize: 11, fontWeight: '900' },
  optText: { flex: 1, fontSize: 13.5, lineHeight: 18 },

  // Submit
  submitWrap: { borderRadius: 15, overflow: 'hidden', marginTop: 2 },
  submitBtn: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 9, paddingVertical: 15 },
  submitText: { fontSize: 13, fontWeight: '900', letterSpacing: 1.4, textTransform: 'uppercase' },
  hint: { fontSize: 11, textAlign: 'center', letterSpacing: 0.2, marginTop: -8, fontStyle: 'italic' },

  // Results
  scoreBanner: { alignItems: 'center', paddingVertical: 24, paddingHorizontal: 20, borderRadius: 18, borderWidth: 1, gap: 5 },
  scoreBadge: { width: 56, height: 56, borderRadius: 18, alignItems: 'center', justifyContent: 'center', borderWidth: 1, marginBottom: 6 },
  scoreTitle: { fontSize: 16, fontWeight: '900', letterSpacing: 0.5, fontFamily: SERIF },
  scoreNumRow: { flexDirection: 'row', alignItems: 'baseline', gap: 4, marginTop: 6 },
  scoreNum: { fontSize: 48, fontWeight: '900', letterSpacing: -2, fontFamily: SERIF, lineHeight: 52 },
  scoreDenom: { fontSize: 20, fontWeight: '700' },
  scoreCorrect: { fontSize: 10, fontWeight: '800', letterSpacing: 2, textTransform: 'uppercase' },
  xpPill: { flexDirection: 'row', alignItems: 'center', gap: 6, paddingHorizontal: 16, paddingVertical: 8, borderRadius: 22, marginTop: 14, shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.35, shadowRadius: 10, elevation: 5 },
  xpPillText: { fontSize: 14, fontWeight: '900', color: '#1A1208', letterSpacing: 0.3 },

  resCard: { borderRadius: 13, borderWidth: 1, padding: 12, gap: 8 },
  resHead: { flexDirection: 'row', gap: 9, alignItems: 'flex-start' },
  resIcon: { width: 25, height: 25, borderRadius: 8, alignItems: 'center', justifyContent: 'center' },
  resQ: { flex: 1, fontSize: 13, fontWeight: '700', lineHeight: 18, paddingTop: 3 },
  resOpt: { flexDirection: 'row', alignItems: 'center', gap: 8, paddingHorizontal: 11, paddingVertical: 8, borderRadius: 9, borderWidth: 1 },
  resOptText: { flex: 1, fontSize: 12.5, fontWeight: '600' },
  explanation: { fontSize: 11.5, lineHeight: 17, marginLeft: 34, marginTop: 2, fontStyle: 'italic', opacity: 0.8 },

  doneEmpty: { alignItems: 'center', gap: 10, paddingVertical: 18 },
  doneEmptyText: { fontSize: 13, fontWeight: '600' },

  // Dev diagnostic
  devNote: { marginTop: 28, borderRadius: 12, borderWidth: 1, borderStyle: 'dashed', padding: 12 },
  devNoteText: { fontSize: 11, fontFamily: SANS, textAlign: 'center' },
});
