import { useThemeContext } from '@/context/ThemeContext';

export function useColorScheme() {
  const { isDark } = useThemeContext();
  return isDark ? 'dark' : 'light';
}
