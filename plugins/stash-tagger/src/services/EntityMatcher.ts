/**
 * Entity matching service
 * Handles matching local entities to StashBox entities
 *
 * Auto-scan searches ALL configured StashBox endpoints and returns best matches.
 * Manual search uses the user-selected endpoint only.
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
import { createLogger } from '@/utils';

const log = createLogger('EntityMatcher');

/**
 * Extended match candidate that includes source information
 */
interface MatchCandidateWithSource<TRemote> extends MatchCandidate<TRemote> {
  source: StashBoxInstance;
}

/**
 * Create a match candidate from a remote entity
 */
function createCandidate<TRemote>(
  remote: TRemote,
  score: number,
  source: StashBoxInstance
): MatchCandidateWithSource<TRemote> {
  return {
    remote,
    score,
    confidenceLevel: getConfidenceLevel(score),
    source,
  };
}

/**
 * StudioMatcher - Match local studios to StashBox studios
 * Searches ALL configured endpoints and returns best matches from any source
 */
export class StudioMatcher {
  constructor(private instances: StashBoxInstance[]) {}

  /**
   * Find matches for a single studio across all instances
   */
  async findMatchesForStudio(
    studio: LocalStudio
  ): Promise<EntityMatch<LocalStudio, StashBoxStudio>> {
    try {
      log.info(`Searching for studio: ${studio.name}`, { instances: this.instances.length });

      // Search all instances in parallel
      const searchPromises = this.instances.map(async (instance) => {
        try {
          const results = await stashBoxService.searchStudios(instance, studio.name, 10);
          return { instance, results };
        } catch (err) {
          log.warn(`Search failed for ${instance.name}: ${err instanceof Error ? err.message : 'Unknown error'}`);
          return { instance, results: [] };
        }
      });

      const allResults = await Promise.all(searchPromises);

      // Collect and score all candidates from all sources
      const candidates: MatchCandidateWithSource<StashBoxStudio>[] = [];

      for (const { instance, results } of allResults) {
        for (const remote of results) {
          const score = matchWithAliases(
            studio.name,
            remote.name,
            remote.aliases ?? []
          );
          candidates.push(createCandidate(remote, score, instance));
        }
      }

      // Sort by score (best matches first)
      const sortedCandidates = sortByScore(candidates);

      log.info(`Found ${sortedCandidates.length} candidates for ${studio.name}`);

      return {
        local: studio,
        candidates: sortedCandidates,
        status: 'pending',
      };
    } catch (error) {
      log.error(`Error matching studio ${studio.name}`, error);
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
 * Searches ALL configured endpoints and returns best matches from any source
 */
export class PerformerMatcher {
  constructor(private instances: StashBoxInstance[]) {}

  /**
   * Find matches for a single performer across all instances
   */
  async findMatchesForPerformer(
    performer: LocalPerformer
  ): Promise<EntityMatch<LocalPerformer, StashBoxPerformer>> {
    try {
      log.info(`Searching for performer: ${performer.name}`, { instances: this.instances.length });

      // Search all instances in parallel
      const searchPromises = this.instances.map(async (instance) => {
        try {
          const results = await stashBoxService.searchPerformers(instance, performer.name, 10);
          return { instance, results };
        } catch (err) {
          log.warn(`Search failed for ${instance.name}: ${err instanceof Error ? err.message : 'Unknown error'}`);
          return { instance, results: [] };
        }
      });

      const allResults = await Promise.all(searchPromises);

      // Collect and score all candidates from all sources
      const candidates: MatchCandidateWithSource<StashBoxPerformer>[] = [];
      const localAliases = performer.aliases?.split(',').map((a) => a.trim()) ?? [];

      for (const { instance, results } of allResults) {
        for (const remote of results) {
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

          candidates.push(createCandidate(remote, score, instance));
        }
      }

      // Sort by score (best matches first)
      const sortedCandidates = sortByScore(candidates);

      log.info(`Found ${sortedCandidates.length} candidates for ${performer.name}`);

      return {
        local: performer,
        candidates: sortedCandidates,
        status: 'pending',
      };
    } catch (error) {
      log.error(`Error matching performer ${performer.name}`, error);
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
 * Searches ALL configured endpoints and returns best matches from any source
 */
export class TagMatcher {
  constructor(private instances: StashBoxInstance[]) {}

  /**
   * Find matches for a single tag across all instances
   */
  async findMatchesForTag(
    tag: LocalTag
  ): Promise<EntityMatch<LocalTag, StashBoxTag>> {
    try {
      log.info(`Searching for tag: ${tag.name}`, { instances: this.instances.length });

      // Search all instances in parallel
      const searchPromises = this.instances.map(async (instance) => {
        try {
          const results = await stashBoxService.searchTags(instance, tag.name, 10);
          return { instance, results };
        } catch (err) {
          log.warn(`Search failed for ${instance.name}: ${err instanceof Error ? err.message : 'Unknown error'}`);
          return { instance, results: [] };
        }
      });

      const allResults = await Promise.all(searchPromises);

      // Collect and score all candidates from all sources
      const candidates: MatchCandidateWithSource<StashBoxTag>[] = [];

      for (const { instance, results } of allResults) {
        for (const remote of results) {
          const score = matchWithAliases(
            tag.name,
            remote.name,
            remote.aliases ?? []
          );
          candidates.push(createCandidate(remote, score, instance));
        }
      }

      // Sort by score (best matches first)
      const sortedCandidates = sortByScore(candidates);

      log.info(`Found ${sortedCandidates.length} candidates for ${tag.name}`);

      return {
        local: tag,
        candidates: sortedCandidates,
        status: 'pending',
      };
    } catch (error) {
      log.error(`Error matching tag ${tag.name}`, error);
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
