// components/QuizSection.tsx
import { CheckCircle2, ChevronDown, XCircle, Zap } from 'lucide-react-native';
import React, { useCallback, useEffect, useRef, useState } from 'react';
import {
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
import { useGamificationStore } from '../store/useGamificationStore';
import { useQuiz } from '../hooks/useQuiz';

if (Platform.OS === 'android' && UIManager.setLayoutAnimationEnabledExperimental) {
  UIManager.setLayoutAnimationEnabledExperimental(true);
}

const SANS = Platform.OS === 'ios' ? 'System' : 'sans-serif';

const L: Record<string, Record<string, string>> = {
  en: { cta: 'TEST YOUR KNOWLEDGE', questions: 'questions', submit: 'SUBMIT ANSWERS', correct: 'CORRECT', xpLabel: 'XP EARNED', done: 'QUIZ COMPLETED', allRequired: 'Answer all questions to submit' },
  ro: { cta: 'TESTEAZĂ-ȚI CUNOȘTINȚELE', questions: 'întrebări', submit: 'TRIMITE RĂSPUNSURILE', correct: 'CORECTE', xpLabel: 'XP CÂȘTIGAT', done: 'QUIZ COMPLETAT', allRequired: 'Răspunde la toate întrebările' },
  fr: { cta: 'TESTEZ VOS CONNAISSANCES', questions: 'questions', submit: 'SOUMETTRE', correct: 'CORRECTES', xpLabel: 'XP GAGNÉ', done: 'QUIZ TERMINÉ', allRequired: 'Répondez à toutes les questions' },
  de: { cta: 'TESTE DEIN WISSEN', questions: 'Fragen', submit: 'ANTWORTEN SENDEN', correct: 'RICHTIG', xpLabel: 'XP VERDIENT', done: 'QUIZ ABGESCHLOSSEN', allRequired: 'Beantworte alle Fragen' },
  es: { cta: 'PON A PRUEBA TU CONOCIMIENTO', questions: 'preguntas', submit: 'ENVIAR RESPUESTAS', correct: 'CORRECTAS', xpLabel: 'XP GANADO', done: 'QUIZ COMPLETADO', allRequired: 'Responde todas las preguntas' },
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
  const expandAnim = useRef(new Animated.Value(0)).current;
  const arrowAnim  = useRef(new Animated.Value(0)).current;

  const gold     = theme.gold ?? '#D4A843';
  const textMain = theme.text    ?? (isDark ? '#fff' : '#111');
  const textSub  = theme.subtext ?? (isDark ? 'rgba(255,255,255,0.5)' : 'rgba(0,0,0,0.4)');
  const surfDark = isDark ? 'rgba(255,255,255,0.04)' : 'rgba(0,0,0,0.03)';
  const borderDim = isDark ? 'rgba(255,255,255,0.09)' : 'rgba(0,0,0,0.08)';

  // Smooth height change when questions → results
  useEffect(() => {
    if (expanded && phase === 'done') {
      LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
    }
  }, [phase]);

  if (phase === 'loading' || phase === 'unavailable') return null;

  // ── Measure inner content ──
  const onContentLayout = useCallback((e: LayoutChangeEvent) => {
    const h = e.nativeEvent.layout.height;
    if (h > 0 && h !== contentH) setContentH(h);
  }, [contentH]);

  // ── Toggle accordion ──
  const toggle = () => {
    const next = !expanded;
    setExpanded(next);
    Animated.spring(expandAnim, {
      toValue: next ? 1 : 0,
      tension: 65, friction: 11,
      useNativeDriver: false,
    }).start();
    Animated.spring(arrowAnim, {
      toValue: next ? 1 : 0,
      tension: 80, friction: 12,
      useNativeDriver: true,
    }).start();
  };

  // ── Submit ──
  const handleSubmit = async () => {
    const res = await submit();
    if (res && res.xpEarned > 0) addQuizXP(res.xpEarned);
  };

  const isDone   = phase === 'done';
  const qCount   = quiz?.questions?.length ?? 0;
  const arrowRot = arrowAnim.interpolate({ inputRange: [0, 1], outputRange: ['0deg', '180deg'] });
  const animH    = contentH > 0
    ? expandAnim.interpolate({ inputRange: [0, 1], outputRange: [0, contentH] })
    : expandAnim.interpolate({ inputRange: [0, 1], outputRange: [0, 0] });

  return (
    <View style={[st.wrap, { borderColor: isDone ? gold + '55' : borderDim }]}>

      {/* ══ Trigger button ══ */}
      <TouchableOpacity
        onPress={toggle}
        activeOpacity={0.82}
        style={[
          st.trigger,
          {
            backgroundColor: isDone ? gold + '12' : surfDark,
            borderBottomColor: expanded ? (isDone ? gold + '30' : borderDim) : 'transparent',
            borderBottomWidth: expanded ? StyleSheet.hairlineWidth : 0,
          },
        ]}
      >
        {/* Icon */}
        <View style={[st.iconBox, { backgroundColor: isDone ? '#4ade8020' : gold + '18' }]}>
          {isDone
            ? <CheckCircle2 size={16} color="#4ade80" strokeWidth={2.2} />
            : <Zap size={16} color={gold} strokeWidth={2} fill={gold + '30'} />}
        </View>

        {/* Text */}
        <View style={{ flex: 1 }}>
          <Text style={[st.triggerTitle, { color: isDone ? gold : textMain }]}>
            {isDone ? lbl.done : lbl.cta}
          </Text>
          {isDone && result ? (
            <Text style={[st.triggerSub, { color: textSub }]}>
              {result.correct}/{result.total} {lbl.correct}
              {'  ·  '}
              +{result.xpEarned} XP
            </Text>
          ) : qCount > 0 ? (
            <Text style={[st.triggerSub, { color: textSub }]}>
              {qCount} {lbl.questions}
            </Text>
          ) : null}
        </View>

        {/* Arrow */}
        <Animated.View style={{ transform: [{ rotate: arrowRot }] }}>
          <ChevronDown size={18} color={isDone ? gold : textSub} strokeWidth={2} />
        </Animated.View>
      </TouchableOpacity>

      {/* ══ Animated container ══ */}
      <Animated.View style={{ height: animH, overflow: 'hidden' }}>
        {/* Inner view — onLayout measures its natural height */}
        <View onLayout={onContentLayout} style={st.inner}>

          {/* ── Questions ── */}
          {(phase === 'ready' || phase === 'submitting') && quiz && (
            <View style={st.questionsWrap}>
              {quiz.questions.map((q, qi) => (
                <View key={q.id} style={st.qRow}>
                  <Text style={[st.qNum, { color: gold }]}>{qi + 1}</Text>
                  <View style={{ flex: 1 }}>
                    <Text style={[st.qText, { color: textMain }]}>{q.question}</Text>
                    <View style={st.optList}>
                      {q.options.map(opt => {
                        const sel = answers[q.id] === opt.id;
                        return (
                          <TouchableOpacity
                            key={opt.id}
                            onPress={() => selectAnswer(q.id, opt.id)}
                            activeOpacity={0.75}
                            style={[
                              st.opt,
                              {
                                backgroundColor: sel
                                  ? gold + '1E'
                                  : isDark ? 'rgba(255,255,255,0.04)' : 'rgba(0,0,0,0.03)',
                                borderColor: sel
                                  ? gold
                                  : isDark ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.09)',
                              },
                            ]}
                          >
                            <View style={[st.radio, {
                              borderColor: sel ? gold : (isDark ? 'rgba(255,255,255,0.3)' : 'rgba(0,0,0,0.22)'),
                              backgroundColor: sel ? gold : 'transparent',
                            }]}>
                              {sel && <View style={st.radioDot} />}
                            </View>
                            <Text style={[st.optText, { color: sel ? gold : textMain }]}>{opt.text}</Text>
                          </TouchableOpacity>
                        );
                      })}
                    </View>
                  </View>
                </View>
              ))}

              {!allAnswered && (
                <Text style={[st.hint, { color: textSub }]}>{lbl.allRequired}</Text>
              )}

              <TouchableOpacity
                onPress={handleSubmit}
                disabled={!allAnswered || phase === 'submitting'}
                activeOpacity={allAnswered ? 0.82 : 1}
                style={[
                  st.submitBtn,
                  {
                    backgroundColor: allAnswered ? gold : (isDark ? 'rgba(255,255,255,0.07)' : 'rgba(0,0,0,0.05)'),
                    opacity: phase === 'submitting' ? 0.55 : 1,
                  },
                ]}
              >
                <Text style={[st.submitText, { color: allAnswered ? '#1a1208' : textSub }]}>
                  {phase === 'submitting' ? '···' : lbl.submit}
                </Text>
              </TouchableOpacity>
            </View>
          )}

          {/* ── Results ── */}
          {phase === 'done' && result && quiz && (
            <View style={st.resultsWrap}>
              {/* Score banner */}
              <View style={[st.scoreBanner, { backgroundColor: gold + '12', borderColor: gold + '38' }]}>
                <Text style={[st.scoreNum, { color: gold }]}>
                  {result.correct}/{result.total}
                </Text>
                <View style={st.scoreMeta}>
                  <Text style={[st.scoreLabel, { color: gold }]}>{lbl.correct}</Text>
                  {result.xpEarned > 0 && (
                    <View style={[st.xpPill, { backgroundColor: '#4ade8018', borderColor: '#4ade8045' }]}>
                      <Text style={[st.xpPillText, { color: '#4ade80' }]}>+{result.xpEarned} XP</Text>
                    </View>
                  )}
                </View>
              </View>

              {/* Per-question breakdown */}
              {quiz.questions.map((q, qi) => {
                const info = result.answers?.[q.id];
                const isCorrect  = info?.correct ?? false;
                const myOptId    = answers[q.id];
                const rightOptId = info?.correctOptionId;
                return (
                  <View key={q.id} style={[st.resultCard, {
                    backgroundColor: isCorrect ? '#4ade8009' : '#f8717109',
                    borderColor:     isCorrect ? '#4ade8030' : '#f8717130',
                  }]}>
                    <View style={st.resultHead}>
                      {isCorrect
                        ? <CheckCircle2 size={14} color="#4ade80" strokeWidth={2} />
                        : <XCircle     size={14} color="#f87171" strokeWidth={2} />}
                      <Text style={[st.resultQ, { color: textMain }]} numberOfLines={2}>
                        {qi + 1}. {q.question}
                      </Text>
                    </View>
                    {q.options.map(opt => {
                      const isMine  = opt.id === myOptId;
                      const isRight = opt.id === rightOptId;
                      if (!isMine && !isRight) return null;
                      return (
                        <View key={opt.id} style={[st.resultOpt, {
                          backgroundColor: isRight ? '#4ade8018' : '#f8717118',
                          borderColor:     isRight ? '#4ade8050' : '#f8717150',
                        }]}>
                          <Text style={{ fontSize: 10 }}>{isRight ? '✓' : '✗'}</Text>
                          <Text style={[st.resultOptText, { color: isRight ? '#4ade80' : '#f87171' }]}>
                            {opt.text}
                          </Text>
                        </View>
                      );
                    })}
                  </View>
                );
              })}
            </View>
          )}

          {/* ── Done, no detail ── */}
          {phase === 'done' && !result && (
            <View style={st.doneEmpty}>
              <CheckCircle2 size={24} color="#4ade80" strokeWidth={2} />
              <Text style={[st.doneEmptyText, { color: textSub }]}>Quiz already completed</Text>
            </View>
          )}

        </View>
      </Animated.View>
    </View>
  );
}

/* ═══════════════════════════════════════════════════════════
   STYLES
   ═══════════════════════════════════════════════════════════ */
const st = StyleSheet.create({
  wrap: {
    marginTop: 28,
    borderRadius: 18,
    borderWidth: 1,
    overflow: 'hidden',
  },

  /* ── Trigger ── */
  trigger: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 13,
    paddingHorizontal: 18,
    paddingVertical: 15,
  },
  iconBox: {
    width: 36, height: 36,
    borderRadius: 11,
    alignItems: 'center',
    justifyContent: 'center',
  },
  triggerTitle: {
    fontSize: 11,
    fontWeight: '800',
    letterSpacing: 1.6,
    fontFamily: SANS,
  },
  triggerSub: {
    fontSize: 11,
    marginTop: 3,
    letterSpacing: 0.2,
  },

  /* ── Inner content ── */
  inner: {
    paddingHorizontal: 18,
    paddingTop: 16,
    paddingBottom: 18,
  },

  /* ── Questions ── */
  questionsWrap: { gap: 20 },
  qRow: { flexDirection: 'row', gap: 10 },
  qNum: {
    fontSize: 13,
    fontWeight: '900',
    width: 18,
    paddingTop: 1,
    fontFamily: SANS,
  },
  qText: {
    fontSize: 14,
    fontWeight: '700',
    lineHeight: 20,
    marginBottom: 10,
    fontFamily: SANS,
  },
  optList: { gap: 7 },
  opt: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    paddingHorizontal: 13,
    paddingVertical: 10,
    borderRadius: 12,
    borderWidth: 1,
  },
  radio: {
    width: 17, height: 17,
    borderRadius: 9,
    borderWidth: 1.5,
    alignItems: 'center',
    justifyContent: 'center',
  },
  radioDot: {
    width: 7, height: 7,
    borderRadius: 4,
    backgroundColor: '#1a1208',
  },
  optText: { fontSize: 13, flex: 1, lineHeight: 18 },
  hint: {
    fontSize: 11,
    textAlign: 'center',
    paddingVertical: 2,
    letterSpacing: 0.2,
  },
  submitBtn: {
    marginTop: 6,
    paddingVertical: 13,
    borderRadius: 14,
    alignItems: 'center',
  },
  submitText: {
    fontSize: 12,
    fontWeight: '900',
    letterSpacing: 2,
    fontFamily: SANS,
  },

  /* ── Results ── */
  resultsWrap: { gap: 10 },
  scoreBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 18,
    paddingHorizontal: 20,
    paddingVertical: 14,
    borderRadius: 14,
    borderWidth: 1,
    marginBottom: 6,
  },
  scoreNum: {
    fontSize: 34,
    fontWeight: '900',
    letterSpacing: -0.5,
    fontFamily: SANS,
  },
  scoreMeta: { flex: 1, gap: 6 },
  scoreLabel: {
    fontSize: 10,
    fontWeight: '800',
    letterSpacing: 2,
  },
  xpPill: {
    alignSelf: 'flex-start',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 20,
    borderWidth: 1,
  },
  xpPillText: {
    fontSize: 12,
    fontWeight: '800',
    letterSpacing: 0.5,
  },
  resultCard: {
    borderRadius: 12,
    borderWidth: 1,
    padding: 11,
    gap: 7,
  },
  resultHead: {
    flexDirection: 'row',
    gap: 8,
    alignItems: 'flex-start',
  },
  resultQ: {
    flex: 1,
    fontSize: 12,
    fontWeight: '600',
    lineHeight: 17,
  },
  resultOpt: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 7,
    paddingHorizontal: 10,
    paddingVertical: 7,
    borderRadius: 8,
    borderWidth: 1,
    marginLeft: 22,
  },
  resultOptText: {
    flex: 1,
    fontSize: 12,
    fontWeight: '600',
  },

  /* ── Done placeholder ── */
  doneEmpty: {
    alignItems: 'center',
    gap: 8,
    paddingVertical: 16,
  },
  doneEmptyText: { fontSize: 13 },
});
