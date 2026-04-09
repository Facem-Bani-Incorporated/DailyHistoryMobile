// hooks/useTTS.ts
import * as Speech from 'expo-speech';
import { useCallback, useEffect, useState } from 'react';

const LANG_MAP: Record<string, string> = {
  en: 'en-US', ro: 'ro-RO', fr: 'fr-FR', de: 'de-DE', es: 'es-ES',
};

/**
 * Text-to-Speech hook for story narration.
 * 
 * Usage:
 *   const { speak, stop, isPlaying } = useTTS();
 *   speak(narrative, language);
 */
export function useTTS() {
  const [isPlaying, setIsPlaying] = useState(false);

  // Stop on unmount
  useEffect(() => {
    return () => { Speech.stop(); };
  }, []);

  const speak = useCallback((text: string, lang: string = 'en') => {
    if (isPlaying) {
      Speech.stop();
      setIsPlaying(false);
      return;
    }

    const language = LANG_MAP[lang] ?? 'en-US';

    Speech.speak(text, {
      language,
      rate: 0.9,
      pitch: 1.0,
      onStart: () => setIsPlaying(true),
      onDone: () => setIsPlaying(false),
      onStopped: () => setIsPlaying(false),
      onError: () => setIsPlaying(false),
    });
  }, [isPlaying]);

  const stop = useCallback(() => {
    Speech.stop();
    setIsPlaying(false);
  }, []);

  return { speak, stop, isPlaying };
}