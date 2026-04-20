// store/useGamificationStore.ts
import AsyncStorage from '@react-native-async-storage/async-storage';
import { create } from 'zustand';
import { createJSONStorage, persist } from 'zustand/middleware';

const todayISO = () => new Date().toISOString().split('T')[0];
const yesterdayISO = () => { const d = new Date(); d.setDate(d.getDate() - 1); return d.toISOString().split('T')[0]; };
const getWeekKey = (date?: Date) => { const d = date ?? new Date(); const jan1 = new Date(d.getFullYear(), 0, 1); const days = Math.floor((d.getTime() - jan1.getTime()) / 86400000); const week = Math.ceil((days + jan1.getDay() + 1) / 7); return `${d.getFullYear()}-W${String(week).padStart(2, '0')}`; };
const getMonday = (date?: Date) => { const d = date ? new Date(date) : new Date(); const day = d.getDay(); const diff = d.getDate() - day + (day === 0 ? -6 : 1); d.setDate(diff); d.setHours(0, 0, 0, 0); return d; };

function _safeSetSize(val: any): number { if (val instanceof Set) return val.size; if (Array.isArray(val)) return val.length; if (val && typeof val === 'object') return Object.keys(val).length; return 0; }
function _ensureSet(val: any): Set<string> { if (val instanceof Set) return val; if (Array.isArray(val)) return new Set(val); return new Set(); }

// ═══════════════════════════════════════════════════════════
//  XP CONSTANTS
// ═══════════════════════════════════════════════════════════
const XP_PER_STORY = 25;
const XP_STREAK_MULTIPLIER_BASE = 0.1;
const XP_STREAK_MULTIPLIER_CAP = 3.0;
const XP_DAILY_GOAL_BONUS = 50;
const XP_ACHIEVEMENT_BONUS = 100;

// ═══════════════════════════════════════════════════════════
//  100-LEVEL SYSTEM
//  Formula: each level costs level * 100 XP
//  Lv2 = 200 XP gap, Lv10 = 1000 XP gap, Lv50 = 5000 XP gap
//  Total to Lv100 = 502,500 XP
// ═══════════════════════════════════════════════════════════
export interface LevelDef {
  level: number;
  xpRequired: number;
  nameKey: string;
  icon: string;
}

// Milestone tiers — special titles every 10 levels
const MILESTONE_ICONS: Record<number, string> = {
  1: '📜', 2: '📖', 3: '🔍', 4: '📚', 5: '🎓',
  10: '🔥', 20: '⚡', 30: '💎', 40: '🏛️', 50: '👑',
  60: '🌟', 70: '🔮', 80: '🌌', 90: '⚜️', 100: '🏆',
};

// Generate all 100 levels
function _generateLevels(): LevelDef[] {
  const levels: LevelDef[] = [];
  let cumXP = 0;
  for (let i = 1; i <= 100; i++) {
    levels.push({
      level: i,
      xpRequired: cumXP,
      nameKey: `level_${i}`,
      icon: MILESTONE_ICONS[i] ?? _iconForLevel(i),
    });
    cumXP += i * 100;
  }
  return levels;
}

function _iconForLevel(lv: number): string {
  if (lv <= 5) return ['📜', '📖', '🔍', '📚', '🎓'][lv - 1];
  if (lv <= 10) return '🔥';
  if (lv <= 20) return '⚡';
  if (lv <= 30) return '💎';
  if (lv <= 40) return '🏛️';
  if (lv <= 50) return '👑';
  if (lv <= 60) return '🌟';
  if (lv <= 70) return '🔮';
  if (lv <= 80) return '🌌';
  if (lv <= 90) return '⚜️';
  return '🏆';
}

export const LEVELS: LevelDef[] = _generateLevels();

// ═══════════════════════════════════════════════════════════
//  LEVEL NAMES — milestone titles + tier names
// ═══════════════════════════════════════════════════════════
const _tierNames: Record<string, string[]> = {
  en: ['Novice', 'Reader', 'Curious', 'Learner', 'Explorer', 'Apprentice', 'Journeyman', 'Expert', 'Master', 'Grandmaster', 'Legend', 'Mythic', 'Celestial', 'Transcendent', 'Eternal'],
  ro: ['Novice', 'Cititor', 'Curios', 'Învățăcel', 'Explorator', 'Ucenic', 'Călător', 'Expert', 'Maestru', 'Mare Maestru', 'Legendă', 'Mitic', 'Celest', 'Transcendent', 'Etern'],
  fr: ['Novice', 'Lecteur', 'Curieux', 'Apprenti', 'Explorateur', 'Compagnon', 'Voyageur', 'Expert', 'Maître', 'Grand Maître', 'Légende', 'Mythique', 'Céleste', 'Transcendant', 'Éternel'],
  de: ['Neuling', 'Leser', 'Neugieriger', 'Lernender', 'Entdecker', 'Lehrling', 'Geselle', 'Experte', 'Meister', 'Großmeister', 'Legende', 'Mythisch', 'Himmlisch', 'Transzendent', 'Ewig'],
  es: ['Novato', 'Lector', 'Curioso', 'Aprendiz', 'Explorador', 'Iniciado', 'Viajero', 'Experto', 'Maestro', 'Gran Maestro', 'Leyenda', 'Mítico', 'Celestial', 'Trascendente', 'Eterno'],
};

function _buildLevelNames(lang: string): Record<string, string> {
  const tiers = _tierNames[lang] ?? _tierNames.en;
  const names: Record<string, string> = {};
  for (let i = 1; i <= 100; i++) {
    const tierIdx = Math.min(Math.floor((i - 1) / 7), tiers.length - 1);
    const tierName = tiers[tierIdx];
    if (i % 10 === 0) {
      // Milestone levels get special names
      const milestoneIdx = Math.floor(i / 10) + 4;
      names[`level_${i}`] = tiers[Math.min(milestoneIdx, tiers.length - 1)];
    } else {
      names[`level_${i}`] = `${tierName} ${i}`;
    }
  }
  return names;
}

export const LEVEL_NAMES: Record<string, Record<string, string>> = {
  en: _buildLevelNames('en'),
  ro: _buildLevelNames('ro'),
  fr: _buildLevelNames('fr'),
  de: _buildLevelNames('de'),
  es: _buildLevelNames('es'),
};

export function getLevelForXP(xp: number): LevelDef {
  let c = LEVELS[0];
  for (const l of LEVELS) { if (xp >= l.xpRequired) c = l; else break; }
  return c;
}

export function getXPProgress(xp: number) {
  const lvl = getLevelForXP(xp);
  const ni = LEVELS.findIndex(l => l.level === lvl.level) + 1;
  if (ni >= LEVELS.length) return { current: 0, needed: 0, percent: 1 };
  const next = LEVELS[ni];
  const c = xp - lvl.xpRequired;
  const n = next.xpRequired - lvl.xpRequired;
  return { current: c, needed: n, percent: n > 0 ? c / n : 1 };
}

export function getStreakMultiplier(streak: number) {
  return Math.min(1 + streak * XP_STREAK_MULTIPLIER_BASE, XP_STREAK_MULTIPLIER_CAP);
}

// ═══════════════════════════════════════════════════════════
//  ACHIEVEMENTS — expanded for 100-level system
// ═══════════════════════════════════════════════════════════
export interface AchievementDef {
  id: string;
  icon: string;
  category: 'reading' | 'streak' | 'explorer' | 'dedication' | 'milestone';
  condition: (state: GamificationState) => boolean;
}

function _uniqueCategories(s: GamificationState): number {
  const fromCount = Object.keys(s.categoryCount ?? {}).length;
  if (fromCount > 0) return fromCount;
  return _safeSetSize(s.categoriesRead);
}

export const ACHIEVEMENTS: AchievementDef[] = [
  // Reading
  { id: 'first_story', icon: '📖', category: 'reading', condition: (s) => s.totalEventsRead >= 1 },
  { id: 'bookworm_10', icon: '📚', category: 'reading', condition: (s) => s.totalEventsRead >= 10 },
  { id: 'scholar_50', icon: '🎓', category: 'reading', condition: (s) => s.totalEventsRead >= 50 },
  { id: 'historian_100', icon: '🏛️', category: 'reading', condition: (s) => s.totalEventsRead >= 100 },
  { id: 'master_500', icon: '👑', category: 'reading', condition: (s) => s.totalEventsRead >= 500 },
  { id: 'legend_1000', icon: '🌟', category: 'reading', condition: (s) => s.totalEventsRead >= 1000 },

  // Streaks
  { id: 'streak_3', icon: '🔥', category: 'streak', condition: (s) => s.longestStreak >= 3 },
  { id: 'streak_7', icon: '⚡', category: 'streak', condition: (s) => s.longestStreak >= 7 },
  { id: 'streak_14', icon: '💎', category: 'streak', condition: (s) => s.longestStreak >= 14 },
  { id: 'streak_30', icon: '🌟', category: 'streak', condition: (s) => s.longestStreak >= 30 },
  { id: 'streak_100', icon: '🏆', category: 'streak', condition: (s) => s.longestStreak >= 100 },
  { id: 'streak_365', icon: '💫', category: 'streak', condition: (s) => s.longestStreak >= 365 },

  // Explorer
  { id: 'explorer_3', icon: '🧭', category: 'explorer', condition: (s) => _uniqueCategories(s) >= 3 },
  { id: 'explorer_all', icon: '🌍', category: 'explorer', condition: (s) => _uniqueCategories(s) >= 7 },

  // Dedication
  { id: 'daily_goal_1', icon: '✅', category: 'dedication', condition: (s) => s.dailyGoalsCompleted >= 1 },
  { id: 'daily_goal_7', icon: '🎯', category: 'dedication', condition: (s) => s.dailyGoalsCompleted >= 7 },
  { id: 'daily_goal_30', icon: '💪', category: 'dedication', condition: (s) => s.dailyGoalsCompleted >= 30 },
  { id: 'daily_goal_100', icon: '🔱', category: 'dedication', condition: (s) => s.dailyGoalsCompleted >= 100 },
  { id: 'daily_goal_365', icon: '⭐', category: 'dedication', condition: (s) => s.dailyGoalsCompleted >= 365 },

  // XP milestones
  { id: 'xp_500', icon: '⭐', category: 'milestone', condition: (s) => s.totalXP >= 500 },
  { id: 'xp_2500', icon: '🌠', category: 'milestone', condition: (s) => s.totalXP >= 2500 },
  { id: 'xp_10000', icon: '💫', category: 'milestone', condition: (s) => s.totalXP >= 10000 },
  { id: 'xp_50000', icon: '🌌', category: 'milestone', condition: (s) => s.totalXP >= 50000 },
  { id: 'xp_100000', icon: '✨', category: 'milestone', condition: (s) => s.totalXP >= 100000 },

  // Level milestones
  { id: 'level_10', icon: '🔥', category: 'milestone', condition: (s) => getLevelForXP(s.totalXP).level >= 10 },
  { id: 'level_25', icon: '⚡', category: 'milestone', condition: (s) => getLevelForXP(s.totalXP).level >= 25 },
  { id: 'level_50', icon: '👑', category: 'milestone', condition: (s) => getLevelForXP(s.totalXP).level >= 50 },
  { id: 'level_75', icon: '🔮', category: 'milestone', condition: (s) => getLevelForXP(s.totalXP).level >= 75 },
  { id: 'level_100', icon: '🏆', category: 'milestone', condition: (s) => getLevelForXP(s.totalXP).level >= 100 },
];

export const ACHIEVEMENT_NAMES: Record<string, Record<string, string>> = {
  en: {
    first_story: 'First Steps', bookworm_10: 'Bookworm', scholar_50: 'Scholar', historian_100: 'Historian', master_500: 'Grand Master', legend_1000: 'Living Legend',
    streak_3: 'On Fire', streak_7: 'Week Warrior', streak_14: 'Unstoppable', streak_30: 'Monthly Legend', streak_100: 'Century Streak', streak_365: 'Year of History',
    explorer_3: 'Explorer', explorer_all: 'World Traveler',
    daily_goal_1: 'Goal Getter', daily_goal_7: 'Consistent', daily_goal_30: 'Dedicated', daily_goal_100: 'Relentless', daily_goal_365: 'Unstoppable Force',
    xp_500: 'Rising Star', xp_2500: 'Superstar', xp_10000: 'XP Legend', xp_50000: 'XP Titan', xp_100000: 'XP Immortal',
    level_10: 'Apprentice', level_25: 'Journeyman', level_50: 'Grandmaster', level_75: 'Mythic Scholar', level_100: 'The Eternal',
  },
  ro: {
    first_story: 'Primii Pași', bookworm_10: 'Cititor Pasionat', scholar_50: 'Cercetător', historian_100: 'Istoric', master_500: 'Mare Maestru', legend_1000: 'Legendă Vie',
    streak_3: 'Pe Foc', streak_7: 'Războinic Săptămânal', streak_14: 'De Neoprit', streak_30: 'Legendă Lunară', streak_100: 'Streak de Secol', streak_365: 'Anul Istoriei',
    explorer_3: 'Explorator', explorer_all: 'Călător Global',
    daily_goal_1: 'Obiectiv Atins', daily_goal_7: 'Consistent', daily_goal_30: 'Dedicat', daily_goal_100: 'Neobosit', daily_goal_365: 'Forță Imparabilă',
    xp_500: 'Stea în Ascensiune', xp_2500: 'Superstar', xp_10000: 'Legendă XP', xp_50000: 'Titan XP', xp_100000: 'Nemuritor XP',
    level_10: 'Ucenic', level_25: 'Călător', level_50: 'Mare Maestru', level_75: 'Erudit Mitic', level_100: 'Eternul',
  },
  fr: {
    first_story: 'Premiers Pas', bookworm_10: 'Rat de Bibliothèque', scholar_50: 'Érudit', historian_100: 'Historien', master_500: 'Grand Maître', legend_1000: 'Légende Vivante',
    streak_3: 'En Feu', streak_7: 'Guerrier Hebdo', streak_14: 'Inarrêtable', streak_30: 'Légende Mensuelle', streak_100: 'Série Centenaire', streak_365: "L'Année de l'Histoire",
    explorer_3: 'Explorateur', explorer_all: 'Globe-trotter',
    daily_goal_1: 'Objectif Atteint', daily_goal_7: 'Régulier', daily_goal_30: 'Dévoué', daily_goal_100: 'Implacable', daily_goal_365: 'Force Inarrêtable',
    xp_500: 'Étoile Montante', xp_2500: 'Superstar', xp_10000: 'Légende XP', xp_50000: 'Titan XP', xp_100000: 'Immortel XP',
    level_10: 'Apprenti', level_25: 'Compagnon', level_50: 'Grand Maître', level_75: 'Érudit Mythique', level_100: "L'Éternel",
  },
  de: {
    first_story: 'Erste Schritte', bookworm_10: 'Bücherwurm', scholar_50: 'Gelehrter', historian_100: 'Historiker', master_500: 'Großmeister', legend_1000: 'Lebende Legende',
    streak_3: 'In Flammen', streak_7: 'Wochenkrieger', streak_14: 'Unaufhaltsam', streak_30: 'Monatslegende', streak_100: 'Jahrhundert-Streak', streak_365: 'Jahr der Geschichte',
    explorer_3: 'Entdecker', explorer_all: 'Weltreisender',
    daily_goal_1: 'Ziel Erreicht', daily_goal_7: 'Beständig', daily_goal_30: 'Engagiert', daily_goal_100: 'Unermüdlich', daily_goal_365: 'Unaufhaltsame Kraft',
    xp_500: 'Aufsteigender Stern', xp_2500: 'Superstar', xp_10000: 'XP-Legende', xp_50000: 'XP-Titan', xp_100000: 'XP-Unsterblich',
    level_10: 'Lehrling', level_25: 'Geselle', level_50: 'Großmeister', level_75: 'Mythischer Gelehrter', level_100: 'Der Ewige',
  },
  es: {
    first_story: 'Primeros Pasos', bookworm_10: 'Ratón de Biblioteca', scholar_50: 'Erudito', historian_100: 'Historiador', master_500: 'Gran Maestro', legend_1000: 'Leyenda Viviente',
    streak_3: 'En Llamas', streak_7: 'Guerrero Semanal', streak_14: 'Imparable', streak_30: 'Leyenda Mensual', streak_100: 'Racha del Siglo', streak_365: 'Año de la Historia',
    explorer_3: 'Explorador', explorer_all: 'Trotamundos',
    daily_goal_1: 'Objetivo Logrado', daily_goal_7: 'Constante', daily_goal_30: 'Dedicado', daily_goal_100: 'Implacable', daily_goal_365: 'Fuerza Imparable',
    xp_500: 'Estrella Naciente', xp_2500: 'Superestrella', xp_10000: 'Leyenda XP', xp_50000: 'Titán XP', xp_100000: 'Inmortal XP',
    level_10: 'Iniciado', level_25: 'Viajero', level_50: 'Gran Maestro', level_75: 'Erudito Mítico', level_100: 'El Eterno',
  },
};

export const ACHIEVEMENT_DESCS: Record<string, Record<string, string>> = {
  en: {
    first_story: 'Read your first story', bookworm_10: 'Read 10 stories', scholar_50: 'Read 50 stories', historian_100: 'Read 100 stories', master_500: 'Read 500 stories', legend_1000: 'Read 1,000 stories',
    streak_3: '3-day streak', streak_7: '7-day streak', streak_14: '14-day streak', streak_30: '30-day streak', streak_100: '100-day streak', streak_365: '365-day streak',
    explorer_3: 'Explore 3 categories', explorer_all: 'Explore all categories',
    daily_goal_1: 'Complete daily goal once', daily_goal_7: 'Complete daily goal 7 times', daily_goal_30: 'Complete daily goal 30 times', daily_goal_100: 'Complete daily goal 100 times', daily_goal_365: 'Complete daily goal 365 times',
    xp_500: 'Earn 500 XP', xp_2500: 'Earn 2,500 XP', xp_10000: 'Earn 10,000 XP', xp_50000: 'Earn 50,000 XP', xp_100000: 'Earn 100,000 XP',
    level_10: 'Reach level 10', level_25: 'Reach level 25', level_50: 'Reach level 50', level_75: 'Reach level 75', level_100: 'Reach level 100',
  },
  ro: {
    first_story: 'Citește prima poveste', bookworm_10: 'Citește 10 povești', scholar_50: 'Citește 50 de povești', historian_100: 'Citește 100 de povești', master_500: 'Citește 500 de povești', legend_1000: 'Citește 1.000 de povești',
    streak_3: 'Streak de 3 zile', streak_7: 'Streak de 7 zile', streak_14: 'Streak de 14 zile', streak_30: 'Streak de 30 zile', streak_100: 'Streak de 100 de zile', streak_365: 'Streak de 365 de zile',
    explorer_3: 'Explorează 3 categorii', explorer_all: 'Explorează toate categoriile',
    daily_goal_1: 'Completează obiectivul zilnic', daily_goal_7: 'Completează obiectivul zilnic de 7 ori', daily_goal_30: 'Completează obiectivul zilnic de 30 de ori', daily_goal_100: 'Completează obiectivul zilnic de 100 de ori', daily_goal_365: 'Completează obiectivul zilnic de 365 de ori',
    xp_500: 'Câștigă 500 XP', xp_2500: 'Câștigă 2.500 XP', xp_10000: 'Câștigă 10.000 XP', xp_50000: 'Câștigă 50.000 XP', xp_100000: 'Câștigă 100.000 XP',
    level_10: 'Atinge nivelul 10', level_25: 'Atinge nivelul 25', level_50: 'Atinge nivelul 50', level_75: 'Atinge nivelul 75', level_100: 'Atinge nivelul 100',
  },
  fr: {
    first_story: 'Lire la première histoire', bookworm_10: 'Lire 10 histoires', scholar_50: 'Lire 50 histoires', historian_100: 'Lire 100 histoires', master_500: 'Lire 500 histoires', legend_1000: 'Lire 1 000 histoires',
    streak_3: 'Série de 3 jours', streak_7: 'Série de 7 jours', streak_14: 'Série de 14 jours', streak_30: 'Série de 30 jours', streak_100: 'Série de 100 jours', streak_365: 'Série de 365 jours',
    explorer_3: 'Explorer 3 catégories', explorer_all: 'Explorer toutes les catégories',
    daily_goal_1: "Terminer l'objectif quotidien", daily_goal_7: "Terminer l'objectif 7 fois", daily_goal_30: "Terminer l'objectif 30 fois", daily_goal_100: "Terminer l'objectif 100 fois", daily_goal_365: "Terminer l'objectif 365 fois",
    xp_500: 'Gagner 500 XP', xp_2500: 'Gagner 2 500 XP', xp_10000: 'Gagner 10 000 XP', xp_50000: 'Gagner 50 000 XP', xp_100000: 'Gagner 100 000 XP',
    level_10: 'Atteindre le niveau 10', level_25: 'Atteindre le niveau 25', level_50: 'Atteindre le niveau 50', level_75: 'Atteindre le niveau 75', level_100: 'Atteindre le niveau 100',
  },
  de: {
    first_story: 'Erste Geschichte lesen', bookworm_10: '10 Geschichten lesen', scholar_50: '50 Geschichten lesen', historian_100: '100 Geschichten lesen', master_500: '500 Geschichten lesen', legend_1000: '1.000 Geschichten lesen',
    streak_3: '3-Tage-Streak', streak_7: '7-Tage-Streak', streak_14: '14-Tage-Streak', streak_30: '30-Tage-Streak', streak_100: '100-Tage-Streak', streak_365: '365-Tage-Streak',
    explorer_3: '3 Kategorien erkunden', explorer_all: 'Alle Kategorien erkunden',
    daily_goal_1: 'Tagesziel erreichen', daily_goal_7: 'Tagesziel 7 Mal erreichen', daily_goal_30: 'Tagesziel 30 Mal erreichen', daily_goal_100: 'Tagesziel 100 Mal erreichen', daily_goal_365: 'Tagesziel 365 Mal erreichen',
    xp_500: '500 XP verdienen', xp_2500: '2.500 XP verdienen', xp_10000: '10.000 XP verdienen', xp_50000: '50.000 XP verdienen', xp_100000: '100.000 XP verdienen',
    level_10: 'Level 10 erreichen', level_25: 'Level 25 erreichen', level_50: 'Level 50 erreichen', level_75: 'Level 75 erreichen', level_100: 'Level 100 erreichen',
  },
  es: {
    first_story: 'Lee tu primera historia', bookworm_10: 'Lee 10 historias', scholar_50: 'Lee 50 historias', historian_100: 'Lee 100 historias', master_500: 'Lee 500 historias', legend_1000: 'Lee 1.000 historias',
    streak_3: 'Racha de 3 días', streak_7: 'Racha de 7 días', streak_14: 'Racha de 14 días', streak_30: 'Racha de 30 días', streak_100: 'Racha de 100 días', streak_365: 'Racha de 365 días',
    explorer_3: 'Explorar 3 categorías', explorer_all: 'Explorar todas las categorías',
    daily_goal_1: 'Completar el objetivo diario', daily_goal_7: 'Completar el objetivo 7 veces', daily_goal_30: 'Completar el objetivo 30 veces', daily_goal_100: 'Completar el objetivo 100 veces', daily_goal_365: 'Completar el objetivo 365 veces',
    xp_500: 'Ganar 500 XP', xp_2500: 'Ganar 2.500 XP', xp_10000: 'Ganar 10.000 XP', xp_50000: 'Ganar 50.000 XP', xp_100000: 'Ganar 100.000 XP',
    level_10: 'Alcanzar el nivel 10', level_25: 'Alcanzar el nivel 25', level_50: 'Alcanzar el nivel 50', level_75: 'Alcanzar el nivel 75', level_100: 'Alcanzar el nivel 100',
  },
};

// ═══════════════════════════════════════════════════════════
//  INTERFACES & STATE
// ═══════════════════════════════════════════════════════════
export interface WeeklyRecap { weekKey: string; storiesRead: number; xpEarned: number; streakDays: number; topCategory: string; categoriesExplored: number; dailyGoalsHit: number; centuriesExplored: string[]; levelReached: number; seen: boolean; }
interface DayLog { eventIds: string[]; categories?: string[]; xpEarned?: number; }

interface GamificationState {
  currentStreak: number; longestStreak: number; lastActiveDate: string | null;
  readEventsToday: string[]; readDate: string | null; totalEventsRead: number;
  totalXP: number; todayXP: number; xpDate: string | null;
  unlockedAchievements: string[]; achievementDates: Record<string, string>; newAchievements: string[];
  categoriesRead: Set<string>; categoryCount: Record<string, number>;
  dailyGoalsCompleted: number; dailyGoalDates: string[];
  weeklyRecaps: Record<string, WeeklyRecap>; currentWeekKey: string | null;
  calendarLog: Record<string, DayLog>; _userId: string | null;
  restoreStreak: () => void;
  recordDailyVisit: () => void;
  markEventRead: (eventId: string, category?: string, year?: string) => void;
  resetDailyProgress: () => void;
  getStreakStatus: () => { streak: number; longest: number; isActiveToday: boolean };
  getTodayProgress: () => { read: number; total: number };
  getCalendarLog: () => Record<string, DayLog>;
  getXPInfo: () => { totalXP: number; todayXP: number; level: LevelDef; progress: { current: number; needed: number; percent: number }; multiplier: number };
  checkAchievements: () => string[];
  markAchievementsSeen: () => void;
  getAchievements: () => { unlocked: AchievementDef[]; locked: AchievementDef[]; newIds: string[] };
  generateWeeklyRecap: () => WeeklyRecap | null;
  getLatestRecap: () => WeeklyRecap | null;
  getUnseenRecap: () => WeeklyRecap | null;
  markRecapSeen: (weekKey: string) => void;
  switchUser: (userId: string) => Promise<void>;
  clearUserData: () => void;
}

const initialState = {
  currentStreak: 0, longestStreak: 0, lastActiveDate: null as string | null,
  readEventsToday: [] as string[], readDate: null as string | null, totalEventsRead: 0,
  totalXP: 0, todayXP: 0, xpDate: null as string | null,
  unlockedAchievements: [] as string[], achievementDates: {} as Record<string, string>, newAchievements: [] as string[],
  categoriesRead: new Set<string>(), categoryCount: {} as Record<string, number>,
  dailyGoalsCompleted: 0, dailyGoalDates: [] as string[],
  weeklyRecaps: {} as Record<string, WeeklyRecap>, currentWeekKey: null as string | null,
  calendarLog: {} as Record<string, DayLog>, _userId: null as string | null,
};

let _activeUserId: string | null = null;
function _storageKey(fallback: string) { return _activeUserId ? `gamification-storage-${_activeUserId}` : fallback; }
let _checkingAchievements = false;

// ═══════════════════════════════════════════════════════════
//  STORE
// ═══════════════════════════════════════════════════════════
export const useGamificationStore = create<GamificationState>()(
  persist(
    (set, get) => ({
      ...initialState,

      recordDailyVisit: () => {
        const today = todayISO(); const yesterday = yesterdayISO();
        const { lastActiveDate, currentStreak, longestStreak, readDate, xpDate } = get();
        if (lastActiveDate === today) return;
        let newStreak = lastActiveDate === yesterday ? currentStreak + 1 : 1;
        const newLongest = Math.max(longestStreak, newStreak);
        const updates: Partial<GamificationState> = { currentStreak: newStreak, longestStreak: newLongest, lastActiveDate: today, currentWeekKey: getWeekKey() };
        if (readDate !== today) { updates.readEventsToday = []; updates.readDate = today; }
        if (xpDate !== today) { updates.todayXP = 0; updates.xpDate = today; }
        set(updates);
        setTimeout(() => { try { get().checkAchievements(); } catch {} }, 50);
      },
restoreStreak: () => set((state) => ({
  currentStreak: state.longestStreak,
  lastActiveDate: todayISO(),
})),
      markEventRead: (eventId: string, category?: string, _year?: string) => {
        const today = todayISO();
        const { readEventsToday, readDate, totalEventsRead, calendarLog, totalXP, todayXP, xpDate, currentStreak, categoriesRead, categoryCount, dailyGoalsCompleted, dailyGoalDates } = get();
        const isNewDay = readDate !== today;
        const currentDayEvents = isNewDay ? [] : readEventsToday;
        const currentDayXP = (isNewDay || xpDate !== today) ? 0 : todayXP;
        if (currentDayEvents.includes(eventId)) return;

        const multiplier = getStreakMultiplier(currentStreak);
        let xpGained = Math.round(XP_PER_STORY * multiplier);
        const updatedDayEvents = [...currentDayEvents, eventId];

        let newDailyGoals = dailyGoalsCompleted;
        let newDailyGoalDates = dailyGoalDates;
        if (updatedDayEvents.length === 5 && !dailyGoalDates.includes(today)) {
          xpGained += XP_DAILY_GOAL_BONUS;
          newDailyGoals = dailyGoalsCompleted + 1;
          newDailyGoalDates = [...dailyGoalDates, today];
        }

        const safeCats = _ensureSet(categoriesRead);
        const newCategoriesRead = new Set(safeCats);
        const newCategoryCount = { ...categoryCount };
        const normalizedCat = category ? category.toLowerCase().trim() : null;
        if (normalizedCat && normalizedCat !== '') {
          newCategoriesRead.add(normalizedCat);
          newCategoryCount[normalizedCat] = (newCategoryCount[normalizedCat] ?? 0) + 1;
        }

        const newLog = { ...calendarLog };
        const existingDay = newLog[today] ?? { eventIds: [], categories: [], xpEarned: 0 };
        newLog[today] = {
          eventIds: updatedDayEvents,
          categories: [...(existingDay.categories ?? []), ...(normalizedCat ? [normalizedCat] : [])],
          xpEarned: (existingDay.xpEarned ?? 0) + xpGained,
        };

        set({
          readEventsToday: updatedDayEvents, readDate: today,
          totalEventsRead: totalEventsRead + 1,
          totalXP: totalXP + xpGained, todayXP: currentDayXP + xpGained, xpDate: today,
          calendarLog: newLog, categoriesRead: newCategoriesRead, categoryCount: newCategoryCount,
          dailyGoalsCompleted: newDailyGoals, dailyGoalDates: newDailyGoalDates,
        });
        setTimeout(() => { try { get().checkAchievements(); } catch {} }, 50);
      },

      resetDailyProgress: () => { const today = todayISO(); if (get().readDate !== today) set({ readEventsToday: [], readDate: today, todayXP: 0, xpDate: today }); },

      getStreakStatus: () => {
        const { currentStreak, longestStreak, lastActiveDate } = get();
        const today = todayISO(); const yesterday = yesterdayISO();
        const isActiveToday = lastActiveDate === today;
        const effectiveStreak = (lastActiveDate === today || lastActiveDate === yesterday) ? currentStreak : 0;
        return { streak: effectiveStreak, longest: longestStreak, isActiveToday };
      },

      getTodayProgress: () => { const today = todayISO(); const { readEventsToday, readDate } = get(); if (readDate !== today) return { read: 0, total: 5 }; return { read: readEventsToday.length, total: 5 }; },
      getCalendarLog: () => get().calendarLog,

      getXPInfo: () => { const { totalXP, todayXP, currentStreak } = get(); return { totalXP, todayXP, level: getLevelForXP(totalXP), progress: getXPProgress(totalXP), multiplier: getStreakMultiplier(currentStreak) }; },

      checkAchievements: () => {
        if (_checkingAchievements) return [];
        _checkingAchievements = true;
        try {
          const state = get();
          const { unlockedAchievements, newAchievements, totalXP, todayXP, xpDate } = state;
          const newlyUnlocked: string[] = [];
          for (const ach of ACHIEVEMENTS) {
            if (unlockedAchievements.includes(ach.id)) continue;
            try { if (ach.condition(state)) newlyUnlocked.push(ach.id); } catch {}
          }
          if (newlyUnlocked.length > 0) {
            const today = todayISO();
            const newDates = { ...state.achievementDates };
            for (const id of newlyUnlocked) newDates[id] = today;
            const achievementXP = newlyUnlocked.length * XP_ACHIEVEMENT_BONUS;
            const isToday = xpDate === today;
            set({
              unlockedAchievements: [...unlockedAchievements, ...newlyUnlocked],
              achievementDates: newDates,
              newAchievements: [...newAchievements, ...newlyUnlocked],
              totalXP: totalXP + achievementXP,
              todayXP: (isToday ? todayXP : 0) + achievementXP,
              xpDate: today,
            });
            const s2 = get();
            const extra: string[] = [];
            for (const ach of ACHIEVEMENTS) {
              if (s2.unlockedAchievements.includes(ach.id)) continue;
              try { if (ach.condition(s2)) extra.push(ach.id); } catch {}
            }
            if (extra.length > 0) {
              const extraDates = { ...s2.achievementDates };
              for (const id of extra) extraDates[id] = today;
              const extraXP = extra.length * XP_ACHIEVEMENT_BONUS;
              set({
                unlockedAchievements: [...s2.unlockedAchievements, ...extra],
                achievementDates: extraDates,
                newAchievements: [...s2.newAchievements, ...extra],
                totalXP: s2.totalXP + extraXP, todayXP: s2.todayXP + extraXP,
              });
            }
            return [...newlyUnlocked, ...extra];
          }
          return [];
        } finally { _checkingAchievements = false; }
      },

      markAchievementsSeen: () => set({ newAchievements: [] }),

      getAchievements: () => {
        const { unlockedAchievements, newAchievements } = get();
        return { unlocked: ACHIEVEMENTS.filter(a => unlockedAchievements.includes(a.id)), locked: ACHIEVEMENTS.filter(a => !unlockedAchievements.includes(a.id)), newIds: [...newAchievements] };
      },

      generateWeeklyRecap: () => {
        const { calendarLog, weeklyRecaps, totalXP } = get();
        const lastWeek = new Date(); lastWeek.setDate(lastWeek.getDate() - 7);
        const weekKey = getWeekKey(lastWeek);
        if (weeklyRecaps[weekKey]) return weeklyRecaps[weekKey];
        const monday = getMonday(lastWeek);
        const days: string[] = [];
        for (let i = 0; i < 7; i++) { const d = new Date(monday); d.setDate(d.getDate() + i); days.push(d.toISOString().split('T')[0]); }
        let storiesRead = 0, xpEarned = 0, streakDays = 0, dailyGoalsHit = 0;
        const catCounts: Record<string, number> = {};
        for (const day of days) {
          const log = calendarLog[day]; if (!log) continue;
          const count = log.eventIds?.length ?? 0;
          storiesRead += count; xpEarned += log.xpEarned ?? 0;
          if (count > 0) streakDays++; if (count >= 5) dailyGoalsHit++;
          for (const cat of (log.categories ?? [])) catCounts[cat] = (catCounts[cat] ?? 0) + 1;
        }
        if (storiesRead === 0) return null;
        let topCategory = '', maxCat = 0;
        for (const [cat, count] of Object.entries(catCounts)) { if (count > maxCat) { topCategory = cat; maxCat = count; } }
        const recap: WeeklyRecap = { weekKey, storiesRead, xpEarned, streakDays, topCategory, categoriesExplored: Object.keys(catCounts).length, dailyGoalsHit, centuriesExplored: [], levelReached: getLevelForXP(totalXP).level, seen: false };
        set({ weeklyRecaps: { ...weeklyRecaps, [weekKey]: recap } });
        return recap;
      },

      getLatestRecap: () => { const { weeklyRecaps } = get(); const keys = Object.keys(weeklyRecaps).sort().reverse(); return keys.length > 0 ? weeklyRecaps[keys[0]] : null; },
      getUnseenRecap: () => { const { weeklyRecaps } = get(); for (const key of Object.keys(weeklyRecaps).sort().reverse()) { if (!weeklyRecaps[key].seen) return weeklyRecaps[key]; } return null; },
      markRecapSeen: (weekKey: string) => { const { weeklyRecaps } = get(); if (weeklyRecaps[weekKey]) set({ weeklyRecaps: { ...weeklyRecaps, [weekKey]: { ...weeklyRecaps[weekKey], seen: true } } }); },

      switchUser: async (userId: string) => {
        if (get()._userId === userId) return;
        _activeUserId = userId;
        try {
          const raw = await AsyncStorage.getItem(`gamification-storage-${userId}`);
          if (raw) {
            const parsed = JSON.parse(raw); const s = parsed?.state ?? parsed;
            set({ currentStreak: s.currentStreak ?? 0, longestStreak: s.longestStreak ?? 0, lastActiveDate: s.lastActiveDate ?? null, readEventsToday: s.readEventsToday ?? [], readDate: s.readDate ?? null, totalEventsRead: s.totalEventsRead ?? 0, totalXP: s.totalXP ?? 0, todayXP: s.todayXP ?? 0, xpDate: s.xpDate ?? null, unlockedAchievements: s.unlockedAchievements ?? [], achievementDates: s.achievementDates ?? {}, newAchievements: s.newAchievements ?? [], categoriesRead: new Set(s.categoriesRead ?? []), categoryCount: s.categoryCount ?? {}, dailyGoalsCompleted: s.dailyGoalsCompleted ?? 0, dailyGoalDates: s.dailyGoalDates ?? [], weeklyRecaps: s.weeklyRecaps ?? {}, currentWeekKey: s.currentWeekKey ?? null, calendarLog: s.calendarLog ?? {}, _userId: userId });
          } else { set({ ...initialState, _userId: userId }); }
        } catch { set({ ...initialState, _userId: userId }); }
        await _saveCurrentState(userId);
      },

      clearUserData: () => { _activeUserId = null; set({ ...initialState }); },
    }),
    {
      name: 'gamification-storage',
      storage: createJSONStorage(() => ({
        getItem: async (name: string) => AsyncStorage.getItem(_storageKey(name)),
        setItem: async (name: string, value: string) => { await AsyncStorage.setItem(_storageKey(name), value); },
        removeItem: async (name: string) => { await AsyncStorage.removeItem(_storageKey(name)); },
      })),
      partialize: (state) => ({
        currentStreak: state.currentStreak, longestStreak: state.longestStreak, lastActiveDate: state.lastActiveDate,
        readEventsToday: state.readEventsToday, readDate: state.readDate, totalEventsRead: state.totalEventsRead,
        totalXP: state.totalXP, todayXP: state.todayXP, xpDate: state.xpDate,
        unlockedAchievements: state.unlockedAchievements, achievementDates: state.achievementDates, newAchievements: state.newAchievements,
        categoriesRead: Array.from(_ensureSet(state.categoriesRead)), categoryCount: state.categoryCount,
        dailyGoalsCompleted: state.dailyGoalsCompleted, dailyGoalDates: state.dailyGoalDates,
        weeklyRecaps: state.weeklyRecaps, currentWeekKey: state.currentWeekKey,
        calendarLog: state.calendarLog, _userId: state._userId,
      }),
      onRehydrateStorage: () => (state, error) => {
        if (error || !state) return;
        state.categoriesRead = _ensureSet(state.categoriesRead);
      },
    },
  ),
);

async function _saveCurrentState(userId: string) {
  try {
    const state = useGamificationStore.getState();
    await AsyncStorage.setItem(`gamification-storage-${userId}`, JSON.stringify({
      state: {
        currentStreak: state.currentStreak, longestStreak: state.longestStreak, lastActiveDate: state.lastActiveDate,
        readEventsToday: state.readEventsToday, readDate: state.readDate, totalEventsRead: state.totalEventsRead,
        totalXP: state.totalXP, todayXP: state.todayXP, xpDate: state.xpDate,
        unlockedAchievements: state.unlockedAchievements, achievementDates: state.achievementDates, newAchievements: state.newAchievements,
        categoriesRead: Array.from(_ensureSet(state.categoriesRead)), categoryCount: state.categoryCount,
        dailyGoalsCompleted: state.dailyGoalsCompleted, dailyGoalDates: state.dailyGoalDates,
        weeklyRecaps: state.weeklyRecaps, currentWeekKey: state.currentWeekKey,
        calendarLog: state.calendarLog, _userId: userId,
      }, version: 2,
    }));
  } catch (e) { console.warn('[Gamification] Failed to save state:', e); }
}