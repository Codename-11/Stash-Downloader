/**
 * Hook for loading entities from Stash with optional filter mode
 */

import { useState, useEffect, useCallback } from 'react';
import type { LocalStudio, LocalPerformer, LocalTag } from '@/types';
import type { EntityType } from '@/constants';
import { stashService } from '@/services';
import { STORAGE_KEYS } from '@/constants';

/** Filter mode for entity loading */
export type EntityFilterMode = 'all' | 'unmatched';

interface UseEntitiesReturn<T> {
  entities: T[];
  totalCount: number;
  loading: boolean;
  error: string | null;
  page: number;
  hasMore: boolean;
  filterMode: EntityFilterMode;
  setFilterMode: (mode: EntityFilterMode) => void;
  loadMore: () => Promise<void>;
  refresh: () => Promise<void>;
  isSkipped: (id: string) => boolean;
  toggleSkipped: (id: string) => void;
  clearSkipped: () => void;
}

/** @deprecated Use UseEntitiesReturn instead */
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
  loadFn: (limit: number, page: number) => Promise<{ entities: T[]; count: number }>,
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
    setLoading(true);
    setError(null);

    try {
      const result = await loadFn(pageSize, pageNum);

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
  }, [loadFn]);

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

  // Load entities on mount
  useEffect(() => {
    void loadEntities(1, false);
  }, [loadEntities]);

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
 * Hook for loading studios with filter mode support
 */
export function useStudios(initialFilterMode: EntityFilterMode = 'unmatched'): UseEntitiesReturn<LocalStudio> {
  const [filterMode, setFilterModeState] = useState<EntityFilterMode>(initialFilterMode);
  const [entities, setEntities] = useState<LocalStudio[]>([]);
  const [totalCount, setTotalCount] = useState(0);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [page, setPage] = useState(1);
  const [skippedIds, setSkippedIds] = useState<Set<string>>(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEYS.SKIPPED_STUDIOS);
      return saved ? new Set(JSON.parse(saved)) : new Set();
    } catch {
      return new Set();
    }
  });

  const pageSize = 50;

  const loadEntities = useCallback(async (pageNum: number, append = false, mode: EntityFilterMode = filterMode) => {
    setLoading(true);
    setError(null);

    try {
      const result = await stashService.getStudios(pageSize, pageNum, mode === 'unmatched');

      if (append) {
        setEntities((prev) => [...prev, ...result.studios]);
      } else {
        setEntities(result.studios);
      }
      setTotalCount(result.count);
      setPage(pageNum);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load studios');
    } finally {
      setLoading(false);
    }
  }, [filterMode]);

  const loadMore = useCallback(async () => {
    await loadEntities(page + 1, true);
  }, [loadEntities, page]);

  const refresh = useCallback(async () => {
    setPage(1);
    await loadEntities(1, false);
  }, [loadEntities]);

  const setFilterMode = useCallback((mode: EntityFilterMode) => {
    setFilterModeState(mode);
    setPage(1);
    setEntities([]);
    void loadEntities(1, false, mode);
  }, [loadEntities]);

  const isSkipped = useCallback((id: string) => skippedIds.has(id), [skippedIds]);

  const toggleSkipped = useCallback((id: string) => {
    setSkippedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) {
        next.delete(id);
      } else {
        next.add(id);
      }
      localStorage.setItem(STORAGE_KEYS.SKIPPED_STUDIOS, JSON.stringify([...next]));
      return next;
    });
  }, []);

  const clearSkipped = useCallback(() => {
    setSkippedIds(new Set());
    localStorage.removeItem(STORAGE_KEYS.SKIPPED_STUDIOS);
  }, []);

  useEffect(() => {
    void loadEntities(1, false);
  }, []);

  const hasMore = entities.length < totalCount;

  return {
    entities,
    totalCount,
    loading,
    error,
    page,
    hasMore,
    filterMode,
    setFilterMode,
    loadMore,
    refresh,
    isSkipped,
    toggleSkipped,
    clearSkipped,
  };
}

/**
 * Hook for loading performers with filter mode support
 */
export function usePerformers(initialFilterMode: EntityFilterMode = 'unmatched'): UseEntitiesReturn<LocalPerformer> {
  const [filterMode, setFilterModeState] = useState<EntityFilterMode>(initialFilterMode);
  const [entities, setEntities] = useState<LocalPerformer[]>([]);
  const [totalCount, setTotalCount] = useState(0);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [page, setPage] = useState(1);
  const [skippedIds, setSkippedIds] = useState<Set<string>>(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEYS.SKIPPED_PERFORMERS);
      return saved ? new Set(JSON.parse(saved)) : new Set();
    } catch {
      return new Set();
    }
  });

  const pageSize = 50;

  const loadEntities = useCallback(async (pageNum: number, append = false, mode: EntityFilterMode = filterMode) => {
    setLoading(true);
    setError(null);

    try {
      const result = await stashService.getPerformers(pageSize, pageNum, mode === 'unmatched');

      if (append) {
        setEntities((prev) => [...prev, ...result.performers]);
      } else {
        setEntities(result.performers);
      }
      setTotalCount(result.count);
      setPage(pageNum);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load performers');
    } finally {
      setLoading(false);
    }
  }, [filterMode]);

  const loadMore = useCallback(async () => {
    await loadEntities(page + 1, true);
  }, [loadEntities, page]);

  const refresh = useCallback(async () => {
    setPage(1);
    await loadEntities(1, false);
  }, [loadEntities]);

  const setFilterMode = useCallback((mode: EntityFilterMode) => {
    setFilterModeState(mode);
    setPage(1);
    setEntities([]);
    void loadEntities(1, false, mode);
  }, [loadEntities]);

  const isSkipped = useCallback((id: string) => skippedIds.has(id), [skippedIds]);

  const toggleSkipped = useCallback((id: string) => {
    setSkippedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) {
        next.delete(id);
      } else {
        next.add(id);
      }
      localStorage.setItem(STORAGE_KEYS.SKIPPED_PERFORMERS, JSON.stringify([...next]));
      return next;
    });
  }, []);

  const clearSkipped = useCallback(() => {
    setSkippedIds(new Set());
    localStorage.removeItem(STORAGE_KEYS.SKIPPED_PERFORMERS);
  }, []);

  useEffect(() => {
    void loadEntities(1, false);
  }, []);

  const hasMore = entities.length < totalCount;

  return {
    entities,
    totalCount,
    loading,
    error,
    page,
    hasMore,
    filterMode,
    setFilterMode,
    loadMore,
    refresh,
    isSkipped,
    toggleSkipped,
    clearSkipped,
  };
}

/**
 * Hook for loading unmatched studios (no stash_ids from ANY endpoint)
 * @deprecated Use useStudios('unmatched') instead
 */
export function useUnmatchedStudios(): UseUnmatchedEntitiesReturn<LocalStudio> {
  const loadFn = useCallback(async (limit: number, page: number) => {
    const result = await stashService.getUnmatchedStudios(limit, page);
    return { entities: result.studios, count: result.count };
  }, []);

  return useUnmatchedEntitiesBase(
    'studio',
    loadFn,
    STORAGE_KEYS.SKIPPED_STUDIOS
  );
}

/**
 * Hook for loading unmatched performers (no stash_ids from ANY endpoint)
 * @deprecated Use usePerformers('unmatched') instead
 */
export function useUnmatchedPerformers(): UseUnmatchedEntitiesReturn<LocalPerformer> {
  const loadFn = useCallback(async (limit: number, page: number) => {
    const result = await stashService.getUnmatchedPerformers(limit, page);
    return { entities: result.performers, count: result.count };
  }, []);

  return useUnmatchedEntitiesBase(
    'performer',
    loadFn,
    STORAGE_KEYS.SKIPPED_PERFORMERS
  );
}

/**
 * Hook for loading tags
 */
export function useTags(): UseUnmatchedEntitiesReturn<LocalTag> {
  const loadFn = useCallback(async (limit: number, page: number) => {
    const result = await stashService.getTags(limit, page);
    return { entities: result.tags, count: result.count };
  }, []);

  return useUnmatchedEntitiesBase(
    'tag',
    loadFn,
    STORAGE_KEYS.SKIPPED_TAGS
  );
}
