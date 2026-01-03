/**
 * Hook for entity matching workflow
 */

import { useState, useCallback } from 'react';
import type {
  StashBoxInstance,
  StashBoxStudio,
  StashBoxPerformer,
  StashBoxTag,
  LocalStudio,
  LocalPerformer,
  LocalTag,
  StudioUpdateInput,
  PerformerUpdateInput,
  TagUpdateInput,
} from '@/types';
import type {
  EntityMatch,
  MatchStats,
  CategorizedMatches,
  ApplyOptions,
} from '@/types/matching';
import {
  StudioMatcher,
  PerformerMatcher,
  TagMatcher,
  calculateMatchStats,
  stashService,
} from '@/services';
import { CONFIDENCE_THRESHOLDS } from '@/constants';

interface UseEntityMatcherReturn<TLocal, TRemote> {
  matches: EntityMatch<TLocal, TRemote>[];
  stats: MatchStats;
  categorized: CategorizedMatches<TLocal, TRemote>;
  loading: boolean;
  error: string | null;
  findMatches: (entities: TLocal[]) => Promise<void>;
  applyMatch: (
    match: EntityMatch<TLocal, TRemote>,
    selectedRemote: TRemote,
    options?: ApplyOptions
  ) => Promise<void>;
  applyAllAutoMatches: (options?: ApplyOptions) => Promise<number>;
  skipMatch: (match: EntityMatch<TLocal, TRemote>) => void;
  clearMatches: () => void;
}

/**
 * Default apply options
 */
const defaultApplyOptions: ApplyOptions = {
  includeImage: true,
  includeParent: true,
  includeAliases: true,
};

/**
 * Hook for studio matching
 */
export function useStudioMatcher(
  instance: StashBoxInstance | null,
  threshold: number = CONFIDENCE_THRESHOLDS.HIGH
): UseEntityMatcherReturn<LocalStudio, StashBoxStudio> {
  const [matches, setMatches] = useState<EntityMatch<LocalStudio, StashBoxStudio>[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const stats = calculateMatchStats(matches, threshold);
  const matcher = instance ? new StudioMatcher(instance) : null;
  const categorized = matcher
    ? matcher.categorizeMatches(matches, threshold)
    : { auto: [], review: [], noMatch: [], skipped: [] };

  /**
   * Find matches for studios
   */
  const findMatches = useCallback(async (studios: LocalStudio[]) => {
    if (!matcher) {
      setError('No StashBox instance selected');
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const results = await matcher.findMatches(studios);
      setMatches(results);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to find matches');
    } finally {
      setLoading(false);
    }
  }, [matcher]);

  /**
   * Apply a match to a studio
   */
  const applyMatch = useCallback(async (
    match: EntityMatch<LocalStudio, StashBoxStudio>,
    selectedRemote: StashBoxStudio,
    options: ApplyOptions = defaultApplyOptions
  ) => {
    if (!instance) throw new Error('No StashBox instance selected');

    const input: StudioUpdateInput = {
      id: match.local.id,
      stash_ids: [
        ...(match.local.stash_ids ?? []),
        { endpoint: instance.endpoint, stash_id: selectedRemote.id },
      ],
    };

    // Include image if option enabled and available
    if (options.includeImage && selectedRemote.images?.[0]?.url) {
      input.image = selectedRemote.images[0].url;
    }

    // Include aliases if option enabled
    if (options.includeAliases && selectedRemote.aliases?.length) {
      input.aliases = [
        ...(match.local.aliases ?? []),
        ...selectedRemote.aliases.filter((a) => !match.local.aliases?.includes(a)),
      ];
    }

    // Include URL if available
    if (selectedRemote.urls?.[0]?.url) {
      input.url = selectedRemote.urls[0].url;
    }

    // Handle parent studio if option enabled
    if (options.includeParent && selectedRemote.parent) {
      const parentStudio = await stashService.getOrCreateStudio(
        selectedRemote.parent.name,
        instance.endpoint,
        selectedRemote.parent.id,
        selectedRemote.parent.images?.[0]?.url
      );
      input.parent_id = parentStudio.id;
    }

    await stashService.updateStudio(input);

    // Update local state
    setMatches((prev) =>
      prev.map((m) =>
        m.local.id === match.local.id
          ? { ...m, status: 'matched' as const, selectedMatch: selectedRemote }
          : m
      )
    );
  }, [instance]);

  /**
   * Apply all auto-matches
   */
  const applyAllAutoMatches = useCallback(async (
    options: ApplyOptions = defaultApplyOptions
  ): Promise<number> => {
    let applied = 0;

    for (const match of categorized.auto) {
      const topCandidate = match.candidates[0];
      if (topCandidate) {
        try {
          await applyMatch(match, topCandidate.remote, options);
          applied++;
        } catch (err) {
          console.error('Failed to apply match:', err);
        }
      }
    }

    return applied;
  }, [categorized.auto, applyMatch]);

  /**
   * Skip a match
   */
  const skipMatch = useCallback((match: EntityMatch<LocalStudio, StashBoxStudio>) => {
    setMatches((prev) =>
      prev.map((m) =>
        m.local.id === match.local.id ? { ...m, status: 'skipped' as const } : m
      )
    );
  }, []);

  /**
   * Clear all matches
   */
  const clearMatches = useCallback(() => {
    setMatches([]);
  }, []);

  return {
    matches,
    stats,
    categorized,
    loading,
    error,
    findMatches,
    applyMatch,
    applyAllAutoMatches,
    skipMatch,
    clearMatches,
  };
}

/**
 * Hook for performer matching
 */
export function usePerformerMatcher(
  instance: StashBoxInstance | null,
  threshold: number = CONFIDENCE_THRESHOLDS.HIGH
): UseEntityMatcherReturn<LocalPerformer, StashBoxPerformer> {
  const [matches, setMatches] = useState<EntityMatch<LocalPerformer, StashBoxPerformer>[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const stats = calculateMatchStats(matches, threshold);
  const matcher = instance ? new PerformerMatcher(instance) : null;
  const categorized = matcher
    ? matcher.categorizeMatches(matches, threshold)
    : { auto: [], review: [], noMatch: [], skipped: [] };

  const findMatches = useCallback(async (performers: LocalPerformer[]) => {
    if (!matcher) {
      setError('No StashBox instance selected');
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const results = await matcher.findMatches(performers);
      setMatches(results);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to find matches');
    } finally {
      setLoading(false);
    }
  }, [matcher]);

  const applyMatch = useCallback(async (
    match: EntityMatch<LocalPerformer, StashBoxPerformer>,
    selectedRemote: StashBoxPerformer,
    options: ApplyOptions = defaultApplyOptions
  ) => {
    if (!instance) throw new Error('No StashBox instance selected');

    const input: PerformerUpdateInput = {
      id: match.local.id,
      stash_ids: [
        ...(match.local.stash_ids ?? []),
        { endpoint: instance.endpoint, stash_id: selectedRemote.id },
      ],
    };

    // Include image if option enabled
    if (options.includeImage && selectedRemote.images?.[0]?.url) {
      input.image = selectedRemote.images[0].url;
    }

    // Include aliases
    if (options.includeAliases && selectedRemote.aliases?.length) {
      const existingAliases = match.local.aliases?.split(',').map((a) => a.trim()) ?? [];
      const newAliases = selectedRemote.aliases.filter((a) => !existingAliases.includes(a));
      if (newAliases.length > 0) {
        input.aliases = [...existingAliases, ...newAliases].join(', ');
      }
    }

    // Include other fields from StashBox
    if (selectedRemote.gender) input.gender = selectedRemote.gender;
    if (selectedRemote.birth_date) input.birthdate = selectedRemote.birth_date;
    if (selectedRemote.country) input.country = selectedRemote.country;
    if (selectedRemote.ethnicity) input.ethnicity = selectedRemote.ethnicity;
    if (selectedRemote.height) input.height_cm = selectedRemote.height;

    await stashService.updatePerformer(input);

    setMatches((prev) =>
      prev.map((m) =>
        m.local.id === match.local.id
          ? { ...m, status: 'matched' as const, selectedMatch: selectedRemote }
          : m
      )
    );
  }, [instance]);

  const applyAllAutoMatches = useCallback(async (
    options: ApplyOptions = defaultApplyOptions
  ): Promise<number> => {
    let applied = 0;

    for (const match of categorized.auto) {
      const topCandidate = match.candidates[0];
      if (topCandidate) {
        try {
          await applyMatch(match, topCandidate.remote, options);
          applied++;
        } catch (err) {
          console.error('Failed to apply match:', err);
        }
      }
    }

    return applied;
  }, [categorized.auto, applyMatch]);

  const skipMatch = useCallback((match: EntityMatch<LocalPerformer, StashBoxPerformer>) => {
    setMatches((prev) =>
      prev.map((m) =>
        m.local.id === match.local.id ? { ...m, status: 'skipped' as const } : m
      )
    );
  }, []);

  const clearMatches = useCallback(() => {
    setMatches([]);
  }, []);

  return {
    matches,
    stats,
    categorized,
    loading,
    error,
    findMatches,
    applyMatch,
    applyAllAutoMatches,
    skipMatch,
    clearMatches,
  };
}

/**
 * Hook for tag matching
 */
export function useTagMatcher(
  instance: StashBoxInstance | null,
  threshold: number = CONFIDENCE_THRESHOLDS.HIGH
): UseEntityMatcherReturn<LocalTag, StashBoxTag> {
  const [matches, setMatches] = useState<EntityMatch<LocalTag, StashBoxTag>[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const stats = calculateMatchStats(matches, threshold);
  const matcher = instance ? new TagMatcher(instance) : null;
  const categorized = matcher
    ? matcher.categorizeMatches(matches, threshold)
    : { auto: [], review: [], noMatch: [], skipped: [] };

  const findMatches = useCallback(async (tags: LocalTag[]) => {
    if (!matcher) {
      setError('No StashBox instance selected');
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const results = await matcher.findMatches(tags);
      setMatches(results);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to find matches');
    } finally {
      setLoading(false);
    }
  }, [matcher]);

  const applyMatch = useCallback(async (
    match: EntityMatch<LocalTag, StashBoxTag>,
    selectedRemote: StashBoxTag,
    options: ApplyOptions = defaultApplyOptions
  ) => {
    const input: TagUpdateInput = {
      id: match.local.id,
    };

    // Include description
    if (selectedRemote.description) {
      input.description = selectedRemote.description;
    }

    // Include aliases
    if (options.includeAliases && selectedRemote.aliases?.length) {
      input.aliases = [
        ...(match.local.aliases ?? []),
        ...selectedRemote.aliases.filter((a) => !match.local.aliases?.includes(a)),
      ];
    }

    await stashService.updateTag(input);

    setMatches((prev) =>
      prev.map((m) =>
        m.local.id === match.local.id
          ? { ...m, status: 'matched' as const, selectedMatch: selectedRemote }
          : m
      )
    );
  }, []);

  const applyAllAutoMatches = useCallback(async (
    options: ApplyOptions = defaultApplyOptions
  ): Promise<number> => {
    let applied = 0;

    for (const match of categorized.auto) {
      const topCandidate = match.candidates[0];
      if (topCandidate) {
        try {
          await applyMatch(match, topCandidate.remote, options);
          applied++;
        } catch (err) {
          console.error('Failed to apply match:', err);
        }
      }
    }

    return applied;
  }, [categorized.auto, applyMatch]);

  const skipMatch = useCallback((match: EntityMatch<LocalTag, StashBoxTag>) => {
    setMatches((prev) =>
      prev.map((m) =>
        m.local.id === match.local.id ? { ...m, status: 'skipped' as const } : m
      )
    );
  }, []);

  const clearMatches = useCallback(() => {
    setMatches([]);
  }, []);

  return {
    matches,
    stats,
    categorized,
    loading,
    error,
    findMatches,
    applyMatch,
    applyAllAutoMatches,
    skipMatch,
    clearMatches,
  };
}
