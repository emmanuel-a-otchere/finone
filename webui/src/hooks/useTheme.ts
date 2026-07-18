import { useState, useEffect, useCallback } from 'react';

const THEME_KEY = 'systemone-theme';
type Theme = 'dark' | 'light';

export function useTheme() {
  const [theme, setTheme] = useState<Theme>(() => {
    if (typeof window === 'undefined') return 'dark';
    return (localStorage.getItem(THEME_KEY) as Theme) ?? 'dark';
  });

  // Apply theme class on mount and whenever theme changes
  useEffect(() => {
    const root = document.documentElement;
    if (theme === 'light') {
      root.classList.add('theme-light');
    } else {
      root.classList.remove('theme-light');
    }
    root.setAttribute('data-theme', theme);
  }, [theme]);

  const toggleTheme = useCallback(() => {
    const next: Theme = theme === 'dark' ? 'light' : 'dark';
    const root = document.documentElement;
    root.classList.add('theme-transitioning');
    setTheme(next);
    localStorage.setItem(THEME_KEY, next);
    setTimeout(() => root.classList.remove('theme-transitioning'), 350);
  }, [theme]);

  return { theme, toggleTheme, isDark: theme === 'dark' };
}
