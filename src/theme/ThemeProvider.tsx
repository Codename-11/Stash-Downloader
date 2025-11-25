/**
 * Simple Theme Provider (Bootstrap-compatible)
 * Provides theme mode context without Material UI dependency
 * Stash handles actual theming, this is just for test-app
 */

import React, { createContext, useContext, useState, useMemo, useEffect } from 'react';

type ThemeMode = 'light' | 'dark';

interface ThemeContextValue {
  mode: ThemeMode;
  toggleMode: () => void;
  setMode: (mode: ThemeMode) => void;
}

const ThemeContext = createContext<ThemeContextValue | undefined>(undefined);

/**
 * Hook to access theme context
 */
export const useThemeMode = (): ThemeContextValue => {
  const context = useContext(ThemeContext);
  if (!context) {
    throw new Error('useThemeMode must be used within ThemeProvider');
  }
  return context;
};

interface ThemeProviderProps {
  children: React.ReactNode;
  defaultMode?: ThemeMode;
}

/**
 * Theme Provider component for test-app
 * Note: In actual Stash plugin, Stash controls theming
 */
export const ThemeProvider: React.FC<ThemeProviderProps> = ({
  children,
  defaultMode = 'light',
}) => {
  // Load theme mode from localStorage or use default
  const [mode, setModeState] = useState<ThemeMode>(() => {
    if (typeof window !== 'undefined') {
      const saved = localStorage.getItem('stash-downloader-theme-mode') as ThemeMode | null;
      return saved || defaultMode;
    }
    return defaultMode;
  });

  // Save theme mode to localStorage when it changes
  useEffect(() => {
    if (typeof window !== 'undefined') {
      localStorage.setItem('stash-downloader-theme-mode', mode);
      // Apply Bootstrap theme class to body
      document.body.setAttribute('data-bs-theme', mode);
    }
  }, [mode]);

  const toggleMode = () => {
    setModeState((prev) => (prev === 'light' ? 'dark' : 'light'));
  };

  const setMode = (newMode: ThemeMode) => {
    setModeState(newMode);
  };

  const contextValue = useMemo(
    () => ({
      mode,
      toggleMode,
      setMode,
    }),
    [mode]
  );

  return (
    <ThemeContext.Provider value={contextValue}>
      {children}
    </ThemeContext.Provider>
  );
};
