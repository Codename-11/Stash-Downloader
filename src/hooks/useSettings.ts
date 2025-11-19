/**
 * useSettings - Hook for managing plugin settings
 */

import { useState, useEffect } from 'react';
import type { IPluginSettings } from '@/types';
import { DEFAULT_SETTINGS, STORAGE_KEYS } from '@/constants';
import { getStorageItem, setStorageItem } from '@/utils';

export function useSettings() {
  const [settings, setSettings] = useState<IPluginSettings>(() =>
    getStorageItem(STORAGE_KEYS.SETTINGS, DEFAULT_SETTINGS)
  );

  // Persist settings to localStorage
  useEffect(() => {
    setStorageItem(STORAGE_KEYS.SETTINGS, settings);
  }, [settings]);

  const updateSettings = (partial: Partial<IPluginSettings>) => {
    setSettings((prev) => ({ ...prev, ...partial }));
  };

  const resetToDefaults = () => {
    setSettings(DEFAULT_SETTINGS);
  };

  return {
    settings,
    updateSettings,
    resetToDefaults,
  };
}
