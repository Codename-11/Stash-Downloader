/**
 * Entity matching service
 * Handles matching local entities to StashBox entities
 */

import type {
  StashBoxInstance,
  StashBoxStudio,
  StashBoxPerformer,
  StashBoxTag,
  LocalStudio,
  LocalPerformer,
  LocalTag,
} from '@/types';
import type {
  EntityMatch,
  MatchCandidate,
  CategorizedMatches,
  MatchStats,
} from '@/types/matching';
import { CONFIDENCE_THRESHOLDS } from '@/constants';
import { matchWithAliases, getConfidenceLevel, sortByScore } from '@/utils/similarity';
import { stashBoxService } from './StashBoxService';

/**
 * Create a match candidate from a remote entity
 */
function createCandidate<TRemote>(
  remote: TRemote,
  score: number
): MatchCandidate<TRemote> {
  return {
    remote,
    score,
    confidenceLevel: getConfidenceLevel(score),
  };
}

/**
 * StudioMatcher - Match local studios to StashBox studios
 */
export class StudioMatcher {
  constructor(private instance: StashBoxInstance) {}

  /**
   * Find matches for a single studio
   */
  async findMatchesForStudio(
    studio: LocalStudio
  ): Promise<EntityMatch<LocalStudio, StashBoxStudio>> {
    try {
      // Search StashBox for this studio name
      const results = await stashBoxService.searchStudios(
        this.instance,
        studio.name,
        10
      );

      // Score each result
      const candidates: MatchCandidate<StashBoxStudio>[] = results.map((remote) => {
        const score = matchWithAliases(
          studio.name,
          remote.name,
          remote.aliases ?? []
        );
        return createCandidate(remote, score);
      });

      // Sort by score
      const sortedCandidates = sortByScore(candidates);

      return {
        local: studio,
        candidates: sortedCandidates,
        status: sortedCandidates.length > 0 ? 'pending' : 'pending',
      };
    } catch (error) {
      return {
        local: studio,
        candidates: [],
        status: 'error',
        error: error instanceof Error ? error.message : 'Unknown error',
      };
    }
  }

  /**
   * Find matches for multiple studios
   */
  async findMatches(
    studios: LocalStudio[]
  ): Promise<EntityMatch<LocalStudio, StashBoxStudio>[]> {
    const matches: EntityMatch<LocalStudio, StashBoxStudio>[] = [];

    for (const studio of studios) {
      const match = await this.findMatchesForStudio(studio);
      matches.push(match);
    }

    return matches;
  }

  /**
   * Categorize matches by confidence level
   */
  categorizeMatches(
    matches: EntityMatch<LocalStudio, StashBoxStudio>[],
    threshold: number = CONFIDENCE_THRESHOLDS.HIGH
  ): CategorizedMatches<LocalStudio, StashBoxStudio> {
    const result: CategorizedMatches<LocalStudio, StashBoxStudio> = {
      auto: [],
      review: [],
      noMatch: [],
      skipped: [],
    };

    for (const match of matches) {
      if (match.status === 'skipped') {
        result.skipped.push(match);
      } else if (match.candidates.length === 0) {
        result.noMatch.push(match);
      } else {
        const topScore = match.candidates[0]?.score ?? 0;
        if (topScore >= threshold) {
          result.auto.push(match);
        } else {
          result.review.push(match);
        }
      }
    }

    return result;
  }
}

/**
 * PerformerMatcher - Match local performers to StashBox performers
 */
export class PerformerMatcher {
  constructor(private instance: StashBoxInstance) {}

  /**
   * Find matches for a single performer
   */
  async findMatchesForPerformer(
    performer: LocalPerformer
  ): Promise<EntityMatch<LocalPerformer, StashBoxPerformer>> {
    try {
      // Search StashBox for this performer name
      const results = await stashBoxService.searchPerformers(
        this.instance,
        performer.name,
        10
      );

      // Score each result
      const candidates: MatchCandidate<StashBoxPerformer>[] = results.map((remote) => {
        // Parse local aliases (comma-separated string)
        const localAliases = performer.aliases?.split(',').map((a) => a.trim()) ?? [];

        // Calculate base score from name
        let score = matchWithAliases(
          performer.name,
          remote.name,
          remote.aliases ?? []
        );

        // Boost score if local aliases match remote aliases
        for (const localAlias of localAliases) {
          const aliasScore = matchWithAliases(
            localAlias,
            remote.name,
            remote.aliases ?? []
          );
          if (aliasScore > score) {
            score = aliasScore;
          }
        }

        return createCandidate(remote, score);
      });

      // Sort by score
      const sortedCandidates = sortByScore(candidates);

      return {
        local: performer,
        candidates: sortedCandidates,
        status: 'pending',
      };
    } catch (error) {
      return {
        local: performer,
        candidates: [],
        status: 'error',
        error: error instanceof Error ? error.message : 'Unknown error',
      };
    }
  }

  /**
   * Find matches for multiple performers
   */
  async findMatches(
    performers: LocalPerformer[]
  ): Promise<EntityMatch<LocalPerformer, StashBoxPerformer>[]> {
    const matches: EntityMatch<LocalPerformer, StashBoxPerformer>[] = [];

    for (const performer of performers) {
      const match = await this.findMatchesForPerformer(performer);
      matches.push(match);
    }

    return matches;
  }

  /**
   * Categorize matches by confidence level
   */
  categorizeMatches(
    matches: EntityMatch<LocalPerformer, StashBoxPerformer>[],
    threshold: number = CONFIDENCE_THRESHOLDS.HIGH
  ): CategorizedMatches<LocalPerformer, StashBoxPerformer> {
    const result: CategorizedMatches<LocalPerformer, StashBoxPerformer> = {
      auto: [],
      review: [],
      noMatch: [],
      skipped: [],
    };

    for (const match of matches) {
      if (match.status === 'skipped') {
        result.skipped.push(match);
      } else if (match.candidates.length === 0) {
        result.noMatch.push(match);
      } else {
        const topScore = match.candidates[0]?.score ?? 0;
        if (topScore >= threshold) {
          result.auto.push(match);
        } else {
          result.review.push(match);
        }
      }
    }

    return result;
  }
}

/**
 * TagMatcher - Match local tags to StashBox tags
 */
export class TagMatcher {
  constructor(private instance: StashBoxInstance) {}

  /**
   * Find matches for a single tag
   */
  async findMatchesForTag(
    tag: LocalTag
  ): Promise<EntityMatch<LocalTag, StashBoxTag>> {
    try {
      // Search StashBox for this tag name
      const results = await stashBoxService.searchTags(
        this.instance,
        tag.name,
        10
      );

      // Score each result
      const candidates: MatchCandidate<StashBoxTag>[] = results.map((remote) => {
        const score = matchWithAliases(
          tag.name,
          remote.name,
          remote.aliases ?? []
        );
        return createCandidate(remote, score);
      });

      // Sort by score
      const sortedCandidates = sortByScore(candidates);

      return {
        local: tag,
        candidates: sortedCandidates,
        status: 'pending',
      };
    } catch (error) {
      return {
        local: tag,
        candidates: [],
        status: 'error',
        error: error instanceof Error ? error.message : 'Unknown error',
      };
    }
  }

  /**
   * Find matches for multiple tags
   */
  async findMatches(
    tags: LocalTag[]
  ): Promise<EntityMatch<LocalTag, StashBoxTag>[]> {
    const matches: EntityMatch<LocalTag, StashBoxTag>[] = [];

    for (const tag of tags) {
      const match = await this.findMatchesForTag(tag);
      matches.push(match);
    }

    return matches;
  }

  /**
   * Categorize matches by confidence level
   */
  categorizeMatches(
    matches: EntityMatch<LocalTag, StashBoxTag>[],
    threshold: number = CONFIDENCE_THRESHOLDS.HIGH
  ): CategorizedMatches<LocalTag, StashBoxTag> {
    const result: CategorizedMatches<LocalTag, StashBoxTag> = {
      auto: [],
      review: [],
      noMatch: [],
      skipped: [],
    };

    for (const match of matches) {
      if (match.status === 'skipped') {
        result.skipped.push(match);
      } else if (match.candidates.length === 0) {
        result.noMatch.push(match);
      } else {
        const topScore = match.candidates[0]?.score ?? 0;
        if (topScore >= threshold) {
          result.auto.push(match);
        } else {
          result.review.push(match);
        }
      }
    }

    return result;
  }
}

/**
 * Calculate match statistics
 */
export function calculateMatchStats<TLocal, TRemote>(
  matches: EntityMatch<TLocal, TRemote>[],
  threshold: number = CONFIDENCE_THRESHOLDS.HIGH
): MatchStats {
  let matched = 0;
  let unmatched = 0;
  let skipped = 0;
  let autoMatchEligible = 0;

  for (const match of matches) {
    if (match.status === 'matched') {
      matched++;
    } else if (match.status === 'skipped') {
      skipped++;
    } else {
      unmatched++;

      // Check if auto-match eligible
      const topScore = match.candidates[0]?.score ?? 0;
      if (topScore >= threshold) {
        autoMatchEligible++;
      }
    }
  }

  return {
    total: matches.length,
    matched,
    unmatched,
    skipped,
    autoMatchEligible,
  };
}
