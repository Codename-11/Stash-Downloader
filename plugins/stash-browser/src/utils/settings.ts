/**
 * Settings utilities
 */

import { STORAGE_KEYS, DEFAULT_SETTINGS, type SourceType } from '@/constants';

export interface BrowserSettings {
  defaultSource: SourceType;
  resultsPerPage: number;
  safeMode: boolean;
  showThumbnails: boolean;
}

export function loadSettings(): BrowserSettings {
  try {
    const saved = localStorage.getItem(STORAGE_KEYS.SETTINGS);
    if (saved) {
      return { ...DEFAULT_SETTINGS, ...JSON.parse(saved) };
    }
  } catch (e) {
    console.warn('Failed to load settings:', e);
  }
  return { ...DEFAULT_SETTINGS } as BrowserSettings;
}

export function saveSettings(settings: BrowserSettings): void {
  try {
    localStorage.setItem(STORAGE_KEYS.SETTINGS, JSON.stringify(settings));
  } catch (e) {
    console.warn('Failed to save settings:', e);
  }
}
