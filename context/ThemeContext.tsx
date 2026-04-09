// context/ThemeContext.tsx
import AsyncStorage from '@react-native-async-storage/async-storage';
import React, { createContext, useContext, useEffect, useState } from 'react';
import { useColorScheme } from 'react-native';

export const Colors = {
  dark: {
    background: '#0e1117',
    card: '#1a1c23',
    text: '#ffffff',
    subtext: '#bdc3c7',
    border: '#2c2f36',
    gold: '#ffd700',
    icon: '#ffd700',
  },
  light: {
    background: '#f5f6fa',
    card: '#ffffff',
    text: '#2d3436',
    subtext: '#636e72',
    border: '#dcdde1',
    gold: '#b8860b',
    icon: '#b8860b',
  },
  // ═══════════════════════════════════════════════════════════
  //  PREMIUM — Royal Gold & Deep Black
  //  Ultra-dark base with warm gold accents, ivory text,
  //  and rich amber highlights. Everything feels expensive.
  // ═══════════════════════════════════════════════════════════
  premium: {
    background: '#05040A',       // near-black with purple undertone
    card: '#0F0D14',             // elevated surface — subtle warmth
    text: '#F5ECD7',             // warm ivory — softer than pure white
    subtext: '#8A7E6B',          // muted warm gray
    border: '#1E1A25',           // subtle purple-tinted border
    gold: '#D4A843',             // rich antique gold — not neon yellow
    icon: '#D4A843',
    // ── Premium-exclusive tokens ──
    accent2: '#C17B2A',          // deep amber for secondary accents
    accent3: '#7B5EA7',          // subtle purple for premium badges
    glow: '#D4A84320',           // gold glow overlay
    cardBorder: '#2A2230',       // card border — slight purple
    shimmer: '#F5ECD710',        // shimmer effect on surfaces
    gradientStart: '#0A0815',    // gradient backgrounds
    gradientEnd: '#12100A',
    badgeBg: '#1A1525',          // achievement/badge background
    badgeBorder: '#2E2640',      // badge border
    progressTrack: '#1A1520',    // XP bar track
    progressFill: '#D4A843',     // XP bar fill
    streakFire: '#E8922A',       // streak icon color
    toastBg: '#14101E',          // toast/notification background
    toastBorder: '#2E2640',
    navActive: '#D4A84330',      // active nav item background
    inputBg: '#0C0A12',          // input fields
    danger: '#D44343',
    success: '#43A854',
  },
};

export type ThemeMode = 'dark' | 'light' | 'system' | 'premium';

// Helper: is a specific mode visually dark?
export function isModeVisuallyDark(mode: ThemeMode, systemScheme: string | null | undefined): boolean {
  if (mode === 'premium' || mode === 'dark') return true;
  if (mode === 'light') return false;
  return systemScheme === 'dark';
}

const ThemeContext = createContext({
  isDark: true,
  isPremium: false,
  mode: 'system' as ThemeMode,
  setMode: (_mode: ThemeMode) => {},
  theme: Colors.dark as typeof Colors.dark & Partial<typeof Colors.premium>,
});

export const ThemeProvider = ({ children }: { children: React.ReactNode }) => {
  const systemScheme = useColorScheme();
  const [mode, setModeState] = useState<ThemeMode>('system');

  useEffect(() => {
    AsyncStorage.getItem('theme_pref').then((val) => {
      if (val === 'dark' || val === 'light' || val === 'system' || val === 'premium') {
        setModeState(val);
      }
    });
  }, []);

  const setMode = (newMode: ThemeMode) => {
    setModeState(newMode);
    AsyncStorage.setItem('theme_pref', newMode);
  };

  const isPremium = mode === 'premium';
  const isDark = isModeVisuallyDark(mode, systemScheme);

  const theme = isPremium
    ? Colors.premium
    : isDark
      ? Colors.dark
      : Colors.light;

  return (
    <ThemeContext.Provider value={{ isDark, isPremium, mode, setMode, theme: theme as any }}>
      {children}
    </ThemeContext.Provider>
  );
};

export const useTheme = () => useContext(ThemeContext);