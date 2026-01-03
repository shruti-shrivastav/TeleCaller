import { createContext, useContext, useEffect, useState } from 'react';

type Theme = 'dark' | 'light' | 'system';

interface ThemeProviderProps {
  children: React.ReactNode;
  defaultTheme?: Theme;
  storageKey?: string;
}

interface ThemeProviderState {
  theme: Theme;
  setTheme: (theme: Theme) => void;
}

const ThemeProviderContext = createContext<ThemeProviderState>({
  theme: 'system',
  setTheme: () => null,
});

export function ThemeProvider({
  children,
  defaultTheme = 'light',
  storageKey = 'vite-ui-theme',
}: ThemeProviderProps) {
  const [theme, setThemeState] = useState<Theme>(() => {
    return (localStorage.getItem(storageKey) as Theme) || defaultTheme;
  });

  // Update <html> class whenever theme or system preference changes
  useEffect(() => {
    const root = window.document.documentElement;
    const systemDark = window.matchMedia('(prefers-color-scheme: light)');

    const applyTheme = (mode: Theme) => {
      root.classList.remove('light', 'dark');
      const newTheme =
        mode === 'system' ? (systemDark.matches ? 'dark' : 'light') : mode;
      root.classList.add(newTheme);
    };

    // Apply initial
    applyTheme(theme);

    // Listen for system theme changes
    const systemChangeListener = (e: MediaQueryListEvent) => {
      if (theme === 'system') applyTheme('system');
    };
    systemDark.addEventListener('change', systemChangeListener);

    return () => {
      systemDark.removeEventListener('change', systemChangeListener);
    };
  }, [theme]);

  const setTheme = (newTheme: Theme) => {
    localStorage.setItem(storageKey, newTheme);
    setThemeState(newTheme);
  };

  return (
    <ThemeProviderContext.Provider value={{ theme, setTheme }}>
      {children}
    </ThemeProviderContext.Provider>
  );
}

export const useTheme = () => {
  const ctx = useContext(ThemeProviderContext);
  if (ctx === undefined)
    throw new Error('useTheme must be used within a ThemeProvider');
  return ctx;
};
