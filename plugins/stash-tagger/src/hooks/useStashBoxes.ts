/**
 * Hook for managing StashBox instances
 */

import { useState, useEffect, useCallback } from 'react';
import type { StashBoxInstance } from '@/types';
import type { PluginSettings } from '@/types/matching';
import { stashService } from '@/services';
import { STORAGE_KEYS, DEFAULT_SETTINGS } from '@/constants';

interface UseStashBoxesReturn {
  instances: StashBoxInstance[];
  selectedInstance: StashBoxInstance | null;
  settings: PluginSettings;
  loading: boolean;
  error: string | null;
  selectInstance: (instance: StashBoxInstance) => void;
  refresh: () => Promise<void>;
}

/**
 * Hook to manage StashBox instances and selection
 */
export function useStashBoxes(): UseStashBoxesReturn {
  const [instances, setInstances] = useState<StashBoxInstance[]>([]);
  const [selectedInstance, setSelectedInstance] = useState<StashBoxInstance | null>(null);
  const [settings, setSettings] = useState<PluginSettings>(DEFAULT_SETTINGS);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  /**
   * Load StashBox instances and settings from Stash
   */
  const loadData = useCallback(async () => {
    setLoading(true);
    setError(null);

    try {
      // Load instances and settings in parallel
      const [loadedInstances, loadedSettings] = await Promise.all([
        stashService.getStashBoxInstances(),
        stashService.getPluginSettings(),
      ]);

      setInstances(loadedInstances);
      setSettings({ ...DEFAULT_SETTINGS, ...loadedSettings });

      // Try to restore selected instance from localStorage
      const savedEndpoint = localStorage.getItem(STORAGE_KEYS.SELECTED_STASHBOX);

      if (savedEndpoint) {
        const saved = loadedInstances.find((i) => i.endpoint === savedEndpoint);
        if (saved) {
          setSelectedInstance(saved);
          return;
        }
      }

      // Fall back to default from settings
      const defaultBox = loadedSettings.defaultStashBox;
      if (defaultBox) {
        const defaultInstance = loadedInstances.find(
          (i) => i.name === defaultBox ||
                 i.endpoint.includes(defaultBox)
        );
        if (defaultInstance) {
          setSelectedInstance(defaultInstance);
          return;
        }
      }

      // Fall back to first instance
      if (loadedInstances.length > 0) {
        setSelectedInstance(loadedInstances[0] ?? null);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load StashBox instances');
    } finally {
      setLoading(false);
    }
  }, []);

  /**
   * Select a StashBox instance
   */
  const selectInstance = useCallback((instance: StashBoxInstance) => {
    setSelectedInstance(instance);
    localStorage.setItem(STORAGE_KEYS.SELECTED_STASHBOX, instance.endpoint);
  }, []);

  /**
   * Refresh data
   */
  const refresh = useCallback(async () => {
    await loadData();
  }, [loadData]);

  // Load data on mount
  useEffect(() => {
    void loadData();
  }, [loadData]);

  return {
    instances,
    selectedInstance,
    settings,
    loading,
    error,
    selectInstance,
    refresh,
  };
}
