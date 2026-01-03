/**
 * Matching types for the tagger
 */

import type { EntityType } from '@/constants';
import type { LocalStudio, LocalPerformer, LocalTag } from './entities';
import type { StashBoxStudio, StashBoxPerformer, StashBoxTag } from './stashbox';

/**
 * Match status for an entity
 */
export type MatchStatus = 'pending' | 'matched' | 'skipped' | 'error';

/**
 * Confidence level based on score
 */
export type ConfidenceLevel = 'high' | 'medium' | 'low';

/**
 * A single match candidate from StashBox
 */
export interface MatchCandidate<TRemote> {
  remote: TRemote;
  score: number;
  confidenceLevel: ConfidenceLevel;
}

/**
 * Match result for a local entity
 */
export interface EntityMatch<TLocal, TRemote> {
  local: TLocal;
  candidates: MatchCandidate<TRemote>[];
  status: MatchStatus;
  selectedMatch?: TRemote;
  error?: string;
}

/**
 * Specific match types for each entity
 */
export type StudioMatch = EntityMatch<LocalStudio, StashBoxStudio>;
export type PerformerMatch = EntityMatch<LocalPerformer, StashBoxPerformer>;
export type TagMatch = EntityMatch<LocalTag, StashBoxTag>;

/**
 * Generic match (union type)
 */
export type AnyMatch = StudioMatch | PerformerMatch | TagMatch;

/**
 * Match statistics for UI display
 */
export interface MatchStats {
  total: number;
  matched: number;
  unmatched: number;
  skipped: number;
  autoMatchEligible: number;
}

/**
 * Categorized matches for bulk operations
 */
export interface CategorizedMatches<TLocal, TRemote> {
  auto: EntityMatch<TLocal, TRemote>[];      // High confidence, can auto-apply
  review: EntityMatch<TLocal, TRemote>[];    // Medium confidence, needs review
  noMatch: EntityMatch<TLocal, TRemote>[];   // No candidates found
  skipped: EntityMatch<TLocal, TRemote>[];   // User skipped
}

/**
 * Apply options when matching an entity
 */
export interface ApplyOptions {
  includeImage: boolean;
  includeParent: boolean;
  includeAliases: boolean;
}

/**
 * Tagger state for each entity type
 */
export interface TaggerState<TLocal, TRemote> {
  entityType: EntityType;
  entities: TLocal[];
  matches: EntityMatch<TLocal, TRemote>[];
  stats: MatchStats;
  loading: boolean;
  error: string | null;
  searchTerm: string;
  showMatched: boolean;
  showSkipped: boolean;
}

/**
 * Plugin settings (from Stash configuration)
 */
export interface PluginSettings {
  defaultStashBox?: string;
  autoMatchThreshold?: number;
  includeImages?: boolean;
  includeParentStudios?: boolean;
  batchSize?: number;
}
