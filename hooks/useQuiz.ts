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
  correctOptionId?: string;
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
        // Check if already completed
        const statusRes = await api.get(`${ENDPOINTS.QUIZ_STATUS}/${eventId}`);
        if (cancelled) return;
        if (statusRes.data?.completed) {
          setPhase('done');
          setResult(statusRes.data.result ?? null);
          return;
        }

        // Fetch questions
        const quizRes = await api.get(`${ENDPOINTS.QUIZ_BY_EVENT}/${eventId}`, {
          params: { language },
        });
        if (cancelled) return;

        const data = quizRes.data;
        if (!data || !Array.isArray(data.questions) || data.questions.length === 0) {
          setPhase('unavailable');
          return;
        }

        setQuiz({ quizId: data.id ?? data.quizId ?? eventId, questions: data.questions });
        setPhase('ready');
      } catch (e: any) {
        if (cancelled) return;
        // 404 → no quiz for this event; any other error → hide quiz silently
        setPhase('unavailable');
      }
    })();

    return () => { cancelled = true; };
  }, [eventId, language]);

  const selectAnswer = useCallback((questionId: string, optionId: string) => {
    setAnswers(prev => ({ ...prev, [questionId]: optionId }));
  }, []);

  const submit = useCallback(async (): Promise<SubmitResult | null> => {
    if (!quiz || phase !== 'ready') return null;
    setPhase('submitting');
    try {
      const payload = {
        quizId: quiz.quizId,
        eventId,
        answers: Object.entries(answers).map(([questionId, optionId]) => ({ questionId, optionId })),
      };
      const res = await api.post(ENDPOINTS.QUIZ_SUBMIT, payload);
      const submitResult: SubmitResult = res.data;
      setResult(submitResult);
      setPhase('done');
      return submitResult;
    } catch {
      setPhase('ready');
      return null;
    }
  }, [quiz, phase, answers, eventId]);

  const allAnswered = quiz ? quiz.questions.every(q => answers[q.id]) : false;

  return { phase, quiz, answers, result, allAnswered, selectAnswer, submit };
}
