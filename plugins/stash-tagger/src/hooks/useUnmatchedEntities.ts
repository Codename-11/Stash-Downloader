/**
 * Hook for loading unmatched entities from Stash
 */

import { useState, useEffect, useCallback } from 'react';
import type { StashBoxInstance, LocalStudio, LocalPerformer, LocalTag } from '@/types';
import type { EntityType } from '@/constants';
import { stashService } from '@/services';
import { STORAGE_KEYS } from '@/constants';

interface UseUnmatchedEntitiesReturn<T> {
  entities: T[];
  totalCount: number;
  loading: boolean;
  error: string | null;
  page: number;
  hasMore: boolean;
  loadMore: () => Promise<void>;
  refresh: () => Promise<void>;
  isSkipped: (id: string) => boolean;
  toggleSkipped: (id: string) => void;
  clearSkipped: () => void;
}

/**
 * Generic hook for loading unmatched entities
 */
function useUnmatchedEntitiesBase<T extends { id: string }>(
  _entityType: EntityType,
  instance: StashBoxInstance | null,
  loadFn: (endpoint: string, limit: number, page: number) => Promise<{ entities: T[]; count: number }>,
  storageKey: string
): UseUnmatchedEntitiesReturn<T> {
  const [entities, setEntities] = useState<T[]>([]);
  const [totalCount, setTotalCount] = useState(0);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [page, setPage] = useState(1);
  const [skippedIds, setSkippedIds] = useState<Set<string>>(() => {
    try {
      const saved = localStorage.getItem(storageKey);
      return saved ? new Set(JSON.parse(saved)) : new Set();
    } catch {
      return new Set();
    }
  });

  const pageSize = 50;

  /**
   * Load entities from Stash
   */
  const loadEntities = useCallback(async (pageNum: number, append = false) => {
    if (!instance) return;

    setLoading(true);
    setError(null);

    try {
      const result = await loadFn(instance.endpoint, pageSize, pageNum);

      if (append) {
        setEntities((prev) => [...prev, ...result.entities]);
      } else {
        setEntities(result.entities);
      }
      setTotalCount(result.count);
      setPage(pageNum);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load entities');
    } finally {
      setLoading(false);
    }
  }, [instance, loadFn]);

  /**
   * Load more entities (pagination)
   */
  const loadMore = useCallback(async () => {
    await loadEntities(page + 1, true);
  }, [loadEntities, page]);

  /**
   * Refresh entities
   */
  const refresh = useCallback(async () => {
    setPage(1);
    await loadEntities(1, false);
  }, [loadEntities]);

  /**
   * Check if an entity is skipped
   */
  const isSkipped = useCallback((id: string) => {
    return skippedIds.has(id);
  }, [skippedIds]);

  /**
   * Toggle skipped status for an entity
   */
  const toggleSkipped = useCallback((id: string) => {
    setSkippedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) {
        next.delete(id);
      } else {
        next.add(id);
      }
      localStorage.setItem(storageKey, JSON.stringify([...next]));
      return next;
    });
  }, [storageKey]);

  /**
   * Clear all skipped entities
   */
  const clearSkipped = useCallback(() => {
    setSkippedIds(new Set());
    localStorage.removeItem(storageKey);
  }, [storageKey]);

  // Load entities when instance changes
  useEffect(() => {
    if (instance) {
      void loadEntities(1, false);
    }
  }, [instance, loadEntities]);

  const hasMore = entities.length < totalCount;

  return {
    entities,
    totalCount,
    loading,
    error,
    page,
    hasMore,
    loadMore,
    refresh,
    isSkipped,
    toggleSkipped,
    clearSkipped,
  };
}

/**
 * Hook for loading unmatched studios
 */
export function useUnmatchedStudios(
  instance: StashBoxInstance | null
): UseUnmatchedEntitiesReturn<LocalStudio> {
  const loadFn = useCallback(async (endpoint: string, limit: number, page: number) => {
    const result = await stashService.getUnmatchedStudios(endpoint, limit, page);
    return { entities: result.studios, count: result.count };
  }, []);

  return useUnmatchedEntitiesBase(
    'studio',
    instance,
    loadFn,
    STORAGE_KEYS.SKIPPED_STUDIOS
  );
}

/**
 * Hook for loading unmatched performers
 */
export function useUnmatchedPerformers(
  instance: StashBoxInstance | null
): UseUnmatchedEntitiesReturn<LocalPerformer> {
  const loadFn = useCallback(async (endpoint: string, limit: number, page: number) => {
    const result = await stashService.getUnmatchedPerformers(endpoint, limit, page);
    return { entities: result.performers, count: result.count };
  }, []);

  return useUnmatchedEntitiesBase(
    'performer',
    instance,
    loadFn,
    STORAGE_KEYS.SKIPPED_PERFORMERS
  );
}

/**
 * Hook for loading tags
 */
export function useTags(
  _instance: StashBoxInstance | null
): UseUnmatchedEntitiesReturn<LocalTag> {
  const loadFn = useCallback(async (_endpoint: string, limit: number, page: number) => {
    const result = await stashService.getTags(limit, page);
    return { entities: result.tags, count: result.count };
  }, []);

  return useUnmatchedEntitiesBase(
    'tag',
    _instance,
    loadFn,
    STORAGE_KEYS.SKIPPED_TAGS
  );
}
