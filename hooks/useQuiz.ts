// hooks/useQuiz.ts
import { useCallback, useEffect, useRef, useState } from 'react';
import api from '../api';
import { ENDPOINTS } from '../config/api';

export interface QuizOption {
  id: string;
  text: string;
}

export interface QuizQuestion {
  id: string;
  question: string;
  options: QuizOption[];
}

export interface QuizData {
  quizId: string;
  questions: QuizQuestion[];
}

export type AnswerMap = Record<string, string>; // questionId → optionId

export interface SubmitResult {
  correct: number;
  total: number;
  xpEarned: number;
  answers: Record<string, { correct: boolean; correctOptionId: string }>;
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
    if (!eventId || fetchedRef.current === eventId) return;
    fetchedRef.current = eventId;

    let cancelled = false;
    setPhase('loading');
    setQuiz(null);
    setAnswers({});
    setResult(null);

    (async () => {
      try {
        // Step 1: Fetch questions — 404 here means no quiz for this event
        const quizRes = await api.get(base(eventId), { params: { lang: language } });
        if (cancelled) return;

        const data = quizRes.data;
        if (!data || !Array.isArray(data.questions) || data.questions.length === 0) {
          setPhase('unavailable');
          return;
        }

        const quizData: QuizData = {
          quizId: data.id ?? data.quizId ?? eventId,
          questions: data.questions,
        };
        setQuiz(quizData);

        // Step 2: Check if this user already submitted
        try {
          const statusRes = await api.get(`${base(eventId)}/status`);
          if (cancelled) return;

          const s = statusRes.data;
          // Backend may use: { completed, attempted, result, score, ... }
          const completed = s?.completed ?? s?.attempted ?? false;
          if (completed) {
            // Normalise result across possible response shapes
            const r = s?.result ?? s?.score ?? s ?? null;
            setResult(r && typeof r === 'object' && 'total' in r ? r : null);
            setPhase('done');
            return;
          }
        } catch {
          // Status endpoint failed (e.g. user never attempted) — show the quiz
        }

        if (!cancelled) setPhase('ready');
      } catch (e: any) {
        if (cancelled) return;
        // 404 → no quiz; any other error → hide quiz silently
        setPhase('unavailable');
      }
    })();

    return () => { cancelled = true; };
  }, [eventId, language]);

  const selectAnswer = useCallback((questionId: string, optionId: string) => {
    setAnswers(prev => ({ ...prev, [questionId]: optionId }));
  }, []);

  const submit = useCallback(async (): Promise<SubmitResult | null> => {
    if (!eventId || !quiz || phase !== 'ready') return null;
    setPhase('submitting');
    try {
      const payload = {
        answers: Object.entries(answers).map(([questionId, optionId]) => ({ questionId, optionId })),
      };
      const res = await api.post(`${base(eventId)}/submit`, payload);
      const submitResult: SubmitResult = res.data;
      setResult(submitResult);
      setPhase('done');
      return submitResult;
    } catch (e: any) {
      if (e?.response?.status === 409) {
        // Already submitted — mark done without result details
        setPhase('done');
      } else {
        setPhase('ready');
      }
      return null;
    }
  }, [eventId, quiz, phase, answers]);

  const allAnswered = phase === 'ready' && !!quiz && quiz.questions.every(q => answers[q.id]);

  return { phase, quiz, answers, result, allAnswered, selectAnswer, submit };
}
