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
};

export type ThemeMode = 'dark' | 'light' | 'system';

const ThemeContext = createContext({
  isDark: true,
  mode: 'system' as ThemeMode,
  setMode: (_mode: ThemeMode) => {},
  theme: Colors.dark,
});

export const ThemeProvider = ({ children }: { children: React.ReactNode }) => {
  const systemScheme = useColorScheme(); // 'dark' | 'light' | null
  const [mode, setModeState] = useState<ThemeMode>('system');

  useEffect(() => {
    AsyncStorage.getItem('theme_pref').then((val) => {
      if (val === 'dark' || val === 'light' || val === 'system') {
        setModeState(val);
      }
    });
  }, []);

  const setMode = (newMode: ThemeMode) => {
    setModeState(newMode);
    AsyncStorage.setItem('theme_pref', newMode);
  };

  const isDark =
    mode === 'system' ? systemScheme === 'dark' : mode === 'dark';

  const theme = isDark ? Colors.dark : Colors.light;

  return (
    <ThemeContext.Provider value={{ isDark, mode, setMode, theme }}>
      {children}
    </ThemeContext.Provider>
  );
};

export const useTheme = () => useContext(ThemeContext);