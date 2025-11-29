/**
 * useSettings - Hook for managing plugin settings
 */

import { useState, useEffect } from 'react';
import type { IPluginSettings } from '@/types';
import { DEFAULT_SETTINGS, STORAGE_KEYS } from '@/constants';
import { getStorageItem, setStorageItem } from '@/utils';

export function useSettings() {
  const [settings, setSettings] = useState<IPluginSettings>(() => {
    // Merge stored settings with defaults to ensure new properties have values
    const stored = getStorageItem<Partial<IPluginSettings>>(STORAGE_KEYS.SETTINGS, {});
    return { ...DEFAULT_SETTINGS, ...stored };
  });

  // Persist settings to localStorage
  useEffect(() => {
    setStorageItem(STORAGE_KEYS.SETTINGS, settings);
  }, [settings]);

  const updateSettings = (partial: Partial<IPluginSettings>) => {
    setSettings((prev) => {
      const updated = { ...prev, ...partial };
      
      // Log settings changes to console
      const changedKeys = Object.keys(partial).filter(key => {
        const oldValue = prev[key as keyof IPluginSettings];
        const newValue = updated[key as keyof IPluginSettings];
        return oldValue !== newValue;
      });
      
      if (changedKeys.length > 0) {
        console.log('[Settings] Settings updated:', changedKeys);
        changedKeys.forEach(key => {
          const oldValue = prev[key as keyof IPluginSettings];
          const newValue = updated[key as keyof IPluginSettings];
          console.log(`[Settings]   ${key}:`, oldValue, '→', newValue);
          
          // Special logging for proxy changes
          if (key === 'httpProxy') {
            if (newValue) {
              const masked = String(newValue).replace(/:[^:@]*@/, ':****@');
              console.log(`[Settings] ✓ HTTP/SOCKS proxy configured: ${masked}`);
            } else {
              console.log('[Settings] ⚠ HTTP/SOCKS proxy removed');
            }
          }
        });
      }
      
      return updated;
    });
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
