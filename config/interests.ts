// config/interests.ts
//
// Shared definition of the interest categories used by the onboarding
// interest step and the home-screen interest quiz. Icons come from
// lucide-react-native (no emojis). Category keys must match `event.category`
// (lowercased, spaces → underscore).
import {
  Compass,
  Landmark,
  Lightbulb,
  Microscope,
  Palette,
  ScrollText,
  Swords,
  Tornado,
} from 'lucide-react-native';
import type { ComponentType } from 'react';

type IconProps = { color?: string; size?: number; strokeWidth?: number };

export interface InterestCategory {
  key: string;
  color: string;
  Icon: ComponentType<IconProps>;
}

export const INTEREST_CATEGORIES: InterestCategory[] = [
  { key: 'war_conflict', color: '#E84545', Icon: Swords },
  { key: 'tech_innovation', color: '#3E7BFA', Icon: Lightbulb },
  { key: 'science_discovery', color: '#A855F7', Icon: Microscope },
  { key: 'politics_state', color: '#F59E0B', Icon: Landmark },
  { key: 'culture_arts', color: '#10B981', Icon: Palette },
  { key: 'natural_disaster', color: '#F97316', Icon: Tornado },
  { key: 'exploration', color: '#06B6D4', Icon: Compass },
  { key: 'religion_phil', color: '#C2965A', Icon: ScrollText },
];

export type InterestLang = 'en' | 'ro' | 'fr' | 'de' | 'es';

export const INTEREST_LABELS: Record<InterestLang, Record<string, string>> = {
  en: {
    war_conflict: 'War & Conflict', tech_innovation: 'Technology', science_discovery: 'Science',
    politics_state: 'Politics', culture_arts: 'Arts & Culture', natural_disaster: 'Disasters',
    exploration: 'Exploration', religion_phil: 'Philosophy',
  },
  ro: {
    war_conflict: 'Război & Conflict', tech_innovation: 'Tehnologie', science_discovery: 'Știință',
    politics_state: 'Politică', culture_arts: 'Artă & Cultură', natural_disaster: 'Dezastre',
    exploration: 'Explorare', religion_phil: 'Filosofie',
  },
  fr: {
    war_conflict: 'Guerre & Conflit', tech_innovation: 'Technologie', science_discovery: 'Science',
    politics_state: 'Politique', culture_arts: 'Arts & Culture', natural_disaster: 'Catastrophes',
    exploration: 'Exploration', religion_phil: 'Philosophie',
  },
  de: {
    war_conflict: 'Krieg & Konflikt', tech_innovation: 'Technologie', science_discovery: 'Wissenschaft',
    politics_state: 'Politik', culture_arts: 'Kunst & Kultur', natural_disaster: 'Katastrophen',
    exploration: 'Erkundung', religion_phil: 'Philosophie',
  },
  es: {
    war_conflict: 'Guerra y Conflicto', tech_innovation: 'Tecnología', science_discovery: 'Ciencia',
    politics_state: 'Política', culture_arts: 'Arte y Cultura', natural_disaster: 'Desastres',
    exploration: 'Exploración', religion_phil: 'Filosofía',
  },
};

// Onboarding/quiz UI copy per language.
export const INTEREST_UI: Record<InterestLang, { title: string; subtitle: string; cta: string; skip: string }> = {
  en: { title: 'What are you into?', subtitle: "Pick the topics you love. We'll surface today's stories that match first.", cta: 'Continue', skip: 'Skip' },
  ro: { title: 'Ce te pasionează?', subtitle: 'Alege subiectele care îți plac. Îți scoatem în față poveștile de azi care se potrivesc.', cta: 'Continuă', skip: 'Sari peste' },
  fr: { title: 'Qu’est-ce qui vous passionne ?', subtitle: 'Choisissez les thèmes que vous aimez. Nous mettrons en avant les récits du jour qui correspondent.', cta: 'Continuer', skip: 'Passer' },
  de: { title: 'Wofür interessierst du dich?', subtitle: 'Wähle die Themen, die du magst. Wir heben passende Geschichten von heute zuerst hervor.', cta: 'Weiter', skip: 'Überspringen' },
  es: { title: '¿Qué te apasiona?', subtitle: 'Elige los temas que te gusten. Destacaremos primero las historias de hoy que coincidan.', cta: 'Continuar', skip: 'Omitir' },
};

export const normalizeInterestLang = (lang: string): InterestLang =>
  (['en', 'ro', 'fr', 'de', 'es'].includes(lang) ? lang : 'en') as InterestLang;
