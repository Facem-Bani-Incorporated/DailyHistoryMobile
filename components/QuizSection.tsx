// components/QuizSection.tsx
import { CheckCircle2, HelpCircle, XCircle } from 'lucide-react-native';
import { Platform, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { useGamificationStore } from '../store/useGamificationStore';
import { useQuiz } from '../hooks/useQuiz';

const SERIF = Platform.OS === 'ios' ? 'Georgia' : 'serif';
const SANS  = Platform.OS === 'ios' ? 'System' : 'sans-serif';

const LABELS: Record<string, Record<string, string>> = {
  en: { title: 'Quick Quiz', subtitle: 'Test your knowledge', submit: 'Submit Answers', score: 'You scored', correct: 'correct', xpEarned: 'XP earned', retry: 'Already completed' },
  ro: { title: 'Quiz Rapid', subtitle: 'Testează-ți cunoștințele', submit: 'Trimite Răspunsurile', score: 'Ai obținut', correct: 'corecte', xpEarned: 'XP câștigat', retry: 'Deja completat' },
  fr: { title: 'Quiz Rapide', subtitle: 'Testez vos connaissances', submit: 'Soumettre', score: 'Vous avez obtenu', correct: 'correct(s)', xpEarned: 'XP gagné', retry: 'Déjà complété' },
  de: { title: 'Schnell-Quiz', subtitle: 'Teste dein Wissen', submit: 'Antworten senden', score: 'Du hast', correct: 'richtig', xpEarned: 'XP verdient', retry: 'Bereits abgeschlossen' },
  es: { title: 'Quiz Rápido', subtitle: 'Pon a prueba tu conocimiento', submit: 'Enviar respuestas', score: 'Obtuviste', correct: 'correctas', xpEarned: 'XP ganado', retry: 'Ya completado' },
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
  const lbl = LABELS[language] ?? LABELS.en;
  const gold = theme.gold ?? '#D4A843';
  const surface = isDark ? 'rgba(255,255,255,0.04)' : 'rgba(0,0,0,0.03)';
  const border  = isDark ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.07)';
  const textPrimary   = theme.text   ?? (isDark ? '#fff' : '#111');
  const textSecondary = theme.subtext ?? (isDark ? 'rgba(255,255,255,0.55)' : 'rgba(0,0,0,0.45)');

  if (phase === 'loading' || phase === 'unavailable') return null;

  const handleSubmit = async () => {
    const res = await submit();
    if (res && res.xpEarned > 0) {
      addQuizXP(res.xpEarned);
    }
  };

  return (
    <View style={[st.container, { backgroundColor: surface, borderColor: border }]}>
      {/* Header */}
      <View style={st.header}>
        <View style={[st.iconWrap, { backgroundColor: gold + '18' }]}>
          <HelpCircle size={18} color={gold} strokeWidth={2} />
        </View>
        <View style={{ flex: 1 }}>
          <Text style={[st.title, { color: textPrimary }]}>{lbl.title}</Text>
          {phase !== 'done' && (
            <Text style={[st.subtitle, { color: textSecondary }]}>{lbl.subtitle}</Text>
          )}
        </View>
        {phase === 'done' && result && (
          <View style={[st.scorePill, { backgroundColor: gold + '22', borderColor: gold + '55' }]}>
            <Text style={[st.scoreText, { color: gold }]}>
              {result.correct}/{result.total}
            </Text>
          </View>
        )}
      </View>

      {/* Separator */}
      <View style={[st.sep, { backgroundColor: gold + '30' }]} />

      {/* Questions */}
      {quiz && (phase === 'ready' || phase === 'submitting') && (
        <View style={st.questions}>
          {quiz.questions.map((q, qi) => (
            <View key={q.id} style={st.question}>
              <Text style={[st.questionText, { color: textPrimary }]}>
                {qi + 1}. {q.question}
              </Text>
              <View style={st.options}>
                {q.options.map(opt => {
                  const selected = answers[q.id] === opt.id;
                  return (
                    <TouchableOpacity
                      key={opt.id}
                      onPress={() => selectAnswer(q.id, opt.id)}
                      activeOpacity={0.75}
                      style={[
                        st.option,
                        {
                          backgroundColor: selected
                            ? gold + '22'
                            : isDark ? 'rgba(255,255,255,0.05)' : 'rgba(0,0,0,0.04)',
                          borderColor: selected ? gold : (isDark ? 'rgba(255,255,255,0.12)' : 'rgba(0,0,0,0.1)'),
                        },
                      ]}
                    >
                      <View style={[st.optionDot, {
                        backgroundColor: selected ? gold : 'transparent',
                        borderColor: selected ? gold : (isDark ? 'rgba(255,255,255,0.3)' : 'rgba(0,0,0,0.25)'),
                      }]} />
                      <Text style={[st.optionText, { color: selected ? gold : textPrimary }]}>
                        {opt.text}
                      </Text>
                    </TouchableOpacity>
                  );
                })}
              </View>
            </View>
          ))}

          <TouchableOpacity
            onPress={handleSubmit}
            activeOpacity={allAnswered ? 0.8 : 1}
            disabled={!allAnswered || phase === 'submitting'}
            style={[
              st.submitBtn,
              {
                backgroundColor: allAnswered ? gold : (isDark ? 'rgba(255,255,255,0.07)' : 'rgba(0,0,0,0.06)'),
                opacity: phase === 'submitting' ? 0.6 : 1,
              },
            ]}
          >
            <Text style={[st.submitText, { color: allAnswered ? '#1a1208' : textSecondary }]}>
              {phase === 'submitting' ? '...' : lbl.submit}
            </Text>
          </TouchableOpacity>
        </View>
      )}

      {/* Results */}
      {phase === 'done' && result && quiz && (
        <View style={st.results}>
          {quiz.questions.map((q, qi) => {
            const answerInfo = result.answers?.[q.id];
            const isCorrect = answerInfo?.correct ?? false;
            const myAnswer  = answers[q.id];
            const correctId = answerInfo?.correctOptionId;

            return (
              <View key={q.id} style={st.resultQuestion}>
                <View style={st.resultQHeader}>
                  {isCorrect
                    ? <CheckCircle2 size={15} color="#4ade80" strokeWidth={2} />
                    : <XCircle size={15} color="#f87171" strokeWidth={2} />}
                  <Text style={[st.resultQText, { color: textPrimary }]} numberOfLines={2}>
                    {qi + 1}. {q.question}
                  </Text>
                </View>
                {q.options.map(opt => {
                  const isMyPick  = opt.id === myAnswer;
                  const isCorrectOpt = opt.id === correctId;
                  if (!isMyPick && !isCorrectOpt) return null;
                  return (
                    <View key={opt.id} style={[
                      st.resultOption,
                      {
                        backgroundColor: isCorrectOpt
                          ? 'rgba(74,222,128,0.12)'
                          : 'rgba(248,113,113,0.10)',
                        borderColor: isCorrectOpt ? '#4ade8055' : '#f8717155',
                      },
                    ]}>
                      <Text style={[st.resultOptText, {
                        color: isCorrectOpt ? '#4ade80' : '#f87171',
                      }]}>
                        {opt.text}
                      </Text>
                    </View>
                  );
                })}
              </View>
            );
          })}

          {/* XP row */}
          {result.xpEarned > 0 && (
            <View style={[st.xpRow, { backgroundColor: gold + '18', borderColor: gold + '44' }]}>
              <Text style={[st.xpText, { color: gold }]}>+{result.xpEarned} {lbl.xpEarned}</Text>
            </View>
          )}
        </View>
      )}

      {/* Already done with no result details */}
      {phase === 'done' && !result && (
        <Text style={[st.alreadyDone, { color: textSecondary }]}>{lbl.retry}</Text>
      )}
    </View>
  );
}

const st = StyleSheet.create({
  container: {
    marginTop: 28,
    borderRadius: 18,
    borderWidth: 1,
    overflow: 'hidden',
    paddingHorizontal: 20,
    paddingVertical: 18,
  },
  header: { flexDirection: 'row', alignItems: 'center', gap: 12, marginBottom: 12 },
  iconWrap: { width: 36, height: 36, borderRadius: 10, alignItems: 'center', justifyContent: 'center' },
  title: { fontSize: 15, fontWeight: '800', letterSpacing: 0.5, fontFamily: SANS },
  subtitle: { fontSize: 12, marginTop: 2, letterSpacing: 0.2 },
  scorePill: { paddingHorizontal: 12, paddingVertical: 5, borderRadius: 20, borderWidth: 1 },
  scoreText: { fontSize: 13, fontWeight: '800', letterSpacing: 0.5 },
  sep: { height: 1, marginBottom: 16 },

  questions: { gap: 20 },
  question: { gap: 10 },
  questionText: { fontSize: 14, fontWeight: '700', lineHeight: 20, fontFamily: SANS },
  options: { gap: 8 },
  option: {
    flexDirection: 'row', alignItems: 'center', gap: 12,
    paddingHorizontal: 14, paddingVertical: 11,
    borderRadius: 12, borderWidth: 1,
  },
  optionDot: { width: 16, height: 16, borderRadius: 8, borderWidth: 1.5 },
  optionText: { fontSize: 13, lineHeight: 18, flex: 1 },

  submitBtn: {
    marginTop: 8, paddingVertical: 13,
    borderRadius: 14, alignItems: 'center',
  },
  submitText: { fontSize: 13, fontWeight: '800', letterSpacing: 1.5, fontFamily: SANS },

  results: { gap: 16 },
  resultQuestion: { gap: 6 },
  resultQHeader: { flexDirection: 'row', gap: 8, alignItems: 'flex-start' },
  resultQText: { flex: 1, fontSize: 13, fontWeight: '600', lineHeight: 19 },
  resultOption: {
    paddingHorizontal: 12, paddingVertical: 8,
    borderRadius: 10, borderWidth: 1,
    marginLeft: 23,
  },
  resultOptText: { fontSize: 13, fontWeight: '600' },
  xpRow: {
    alignSelf: 'center', marginTop: 4,
    paddingHorizontal: 20, paddingVertical: 10,
    borderRadius: 20, borderWidth: 1,
  },
  xpText: { fontSize: 14, fontWeight: '800', letterSpacing: 0.5 },
  alreadyDone: { fontSize: 13, textAlign: 'center', paddingVertical: 6 },
});
