import React, { createContext, useContext, useEffect, useState } from 'react';
import { useColorScheme as useNativeColorScheme } from 'react-native';
import * as SecureStore from 'expo-secure-store';

export type ThemeType = 'light' | 'dark' | 'system';

interface ThemeContextType {
  themeMode: ThemeType;
  setThemeMode: (mode: ThemeType) => void;
  isDark: boolean;
}

const ThemeContext = createContext<ThemeContextType>({
  themeMode: 'system',
  setThemeMode: () => {},
  isDark: false,
});

export const useThemeContext = () => useContext(ThemeContext);

const THEME_KEY = 'kampusradar_theme';

export const ThemeProvider = ({ children }: { children: React.ReactNode }) => {
  const [themeMode, setThemeState] = useState<ThemeType>('system');
  const systemColorScheme = useNativeColorScheme();

  useEffect(() => {
    // Load theme from storage
    const loadTheme = async () => {
      try {
        const storedTheme = await SecureStore.getItemAsync(THEME_KEY);
        if (storedTheme === 'light' || storedTheme === 'dark' || storedTheme === 'system') {
          setThemeState(storedTheme as ThemeType);
        }
      } catch (e) {
        console.log('Tema yüklenemedi:', e);
      }
    };
    loadTheme();
  }, []);

  const setThemeMode = async (mode: ThemeType) => {
    setThemeState(mode);
    try {
      await SecureStore.setItemAsync(THEME_KEY, mode);
    } catch (e) {
      console.log('Tema kaydedilemedi:', e);
    }
  };

  const isDark = themeMode === 'system' ? systemColorScheme === 'dark' : themeMode === 'dark';

  return (
    <ThemeContext.Provider value={{ themeMode, setThemeMode, isDark }}>
      {children}
    </ThemeContext.Provider>
  );
};
