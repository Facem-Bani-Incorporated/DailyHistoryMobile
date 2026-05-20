// hooks/useQuiz.ts
import { useCallback, useEffect, useRef, useState } from 'react';
import api from '../api';
import { ENDPOINTS } from '../config/api';

export interface QuizOption {
  optionId: string;
  text: string;
}

export interface QuizQuestion {
  questionKey: string;
  question: string;
  explanation?: string;
  options: QuizOption[];
}

export interface QuizData {
  eventId: number;
  language: string;
  questions: QuizQuestion[];
}

export type AnswerMap = Record<string, string>; // questionKey → selectedOptionId

export interface AnswerResult {
  questionKey: string;
  selectedOptionId: string;
  correctOptionId: string;
  isCorrect: boolean;
}

export interface SubmitResult {
  correctAnswers: number;
  totalQuestions: number;
  xpEarned: number;
  perfectScore: boolean;
  answerResults: AnswerResult[];
}

type Phase = 'loading' | 'unavailable' | 'ready' | 'submitting' | 'done';

const base = (eventId: string) => `${ENDPOINTS.QUIZ_EVENT}/${eventId}`;

export function useQuiz(eventId: string | null, language = 'en') {
  const [phase, setPhase] = useState<Phase>('loading');
  const [quiz, setQuiz] = useState<QuizData | null>(null);
  const [answers, setAnswers] = useState<AnswerMap>({});
  const [result, setResult] = useState<SubmitResult | null>(null);
  const fetchedRef = useRef<string | null>(null);

  useEffect(() => {
    const id = eventId;
    const key = id ? `${id}:${language}` : null;
    console.log('[useQuiz] effect', { eventId: id, language, fetched: fetchedRef.current });
    if (!id || !key || fetchedRef.current === key) return;
    fetchedRef.current = key;

    let cancelled = false;
    setPhase('loading');
    setQuiz(null);
    setAnswers({});
    setResult(null);

    (async () => {
      try {
        // Step 1: Fetch questions — 404 means no quiz for this event
        const quizRes = await api.get(base(id), { params: { lang: language } });
        if (cancelled) return;

        const data = quizRes.data;
        if (!data || !Array.isArray(data.questions) || data.questions.length === 0) {
          console.log('[useQuiz] no questions in response for', eventId, data);
          setPhase('unavailable');
          return;
        }

        const quizData: QuizData = {
          eventId: data.eventId,
          language: data.language ?? language,
          questions: data.questions,
        };
        setQuiz(quizData);

        // Step 2: Check if already submitted
        try {
          const statusRes = await api.get(`${base(id)}/status`);
          if (cancelled) return;

          const s = statusRes.data;
          if (s?.attempted) {
            setResult({
              correctAnswers: s.correctAnswers ?? 0,
              totalQuestions: s.totalQuestions ?? 0,
              xpEarned: s.xpEarned ?? 0,
              perfectScore: (s.correctAnswers ?? 0) === (s.totalQuestions ?? 0) && (s.totalQuestions ?? 0) > 0,
              answerResults: [],
            });
            setPhase('done');
            return;
          }
        } catch {
          // Status endpoint failed — user never attempted, show the quiz
        }

        if (!cancelled) setPhase('ready');
      } catch (e: any) {
        if (cancelled) return;
        const status = e?.response?.status;
        console.log('[useQuiz] fetch failed for', eventId, 'status:', status, e?.message);
        setPhase('unavailable');
      }
    })();

    return () => { cancelled = true; };
  }, [eventId, language]);

  const selectAnswer = useCallback((questionKey: string, selectedOptionId: string) => {
    setAnswers(prev => ({ ...prev, [questionKey]: selectedOptionId }));
  }, []);

  const submit = useCallback(async (): Promise<SubmitResult | null> => {
    if (!eventId || !quiz || phase !== 'ready') return null;
    setPhase('submitting');
    try {
      const payload = {
        language,
        answers: Object.entries(answers).map(([questionKey, selectedOptionId]) => ({
          questionKey,
          selectedOptionId,
        })),
      };
      const res = await api.post(`${base(eventId)}/submit`, payload);
      const submitResult: SubmitResult = res.data;
      setResult(submitResult);
      setPhase('done');
      return submitResult;
    } catch (e: any) {
      if (e?.response?.status === 409) {
        setPhase('done');
      } else {
        setPhase('ready');
      }
      return null;
    }
  }, [eventId, quiz, phase, answers, language]);

  const allAnswered = phase === 'ready' && !!quiz && quiz.questions.every(q => answers[q.questionKey]);

  return { phase, quiz, answers, result, allAnswered, selectAnswer, submit };
}
