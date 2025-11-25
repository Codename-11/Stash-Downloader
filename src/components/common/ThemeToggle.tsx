/**
 * ThemeToggle - Button to toggle between light and dark mode
 */

import React from 'react';
import { useThemeMode } from '@/theme/ThemeProvider';

export const ThemeToggle: React.FC = () => {
  const { mode, toggleMode } = useThemeMode();

  return (
    <button
      type="button"
      className="btn btn-sm btn-link p-1"
      onClick={toggleMode}
      title={`Switch to ${mode === 'light' ? 'dark' : 'light'} mode`}
      aria-label={`Switch to ${mode === 'light' ? 'dark' : 'light'} mode`}
    >
      {mode === 'light' ? (
        <span style={{ fontSize: '1.2rem' }}>🌙</span>
      ) : (
        <span style={{ fontSize: '1.2rem' }}>☀️</span>
      )}
    </button>
  );
};

