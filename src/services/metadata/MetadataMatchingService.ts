/**
 * MetadataMatchingService - Matches scraped metadata names against Stash database
 */

import type { IScrapedMetadata, IStashPerformer, IStashTag, IStashStudio } from '@/types';
import { getStashService } from '@/services/stash/StashGraphQLService';

/**
 * Result of matching scraped metadata against Stash database
 */
export interface IMatchResult {
  matchedPerformers: IStashPerformer[];
  matchedTags: IStashTag[];
  matchedStudio?: IStashStudio;
  unmatchedPerformers: string[];
  unmatchedTags: string[];
  unmatchedStudio?: string;
}

/**
 * Normalize name for matching - removes spaces, lowercases, and trims
 */
function normalizeForMatch(name: string): string {
  return name.toLowerCase().replace(/\s+/g, '').trim();
}

/**
 * Check if a name matches any in a list (including aliases)
 */
function findMatchingPerformer(
  searchName: string,
  performers: IStashPerformer[]
): IStashPerformer | undefined {
  const normalizedSearch = normalizeForMatch(searchName);

  for (const performer of performers) {
    // Check main name
    if (normalizeForMatch(performer.name) === normalizedSearch) {
      return performer;
    }
    // Check aliases (internal) and alias_list (from Stash API)
    const allAliases = [...(performer.aliases || []), ...(performer.alias_list || [])];
    for (const alias of allAliases) {
      if (normalizeForMatch(alias) === normalizedSearch) {
        return performer;
      }
    }
  }
  return undefined;
}

/**
 * Check if a name matches any tag (including aliases)
 */
function findMatchingTag(
  searchName: string,
  tags: IStashTag[]
): IStashTag | undefined {
  const normalizedSearch = normalizeForMatch(searchName);

  for (const tag of tags) {
    // Check main name
    if (normalizeForMatch(tag.name) === normalizedSearch) {
      return tag;
    }
    // Check aliases
    if (tag.aliases) {
      for (const alias of tag.aliases) {
        if (normalizeForMatch(alias) === normalizedSearch) {
          return tag;
        }
      }
    }
  }
  return undefined;
}

export class MetadataMatchingService {
  private stashService = getStashService();

  /**
   * Match scraped metadata names against Stash database
   */
  async matchMetadataToStash(metadata: IScrapedMetadata): Promise<IMatchResult> {
    const result: IMatchResult = {
      matchedPerformers: [],
      matchedTags: [],
      matchedStudio: undefined,
      unmatchedPerformers: [],
      unmatchedTags: [],
      unmatchedStudio: undefined,
    };

    // Match performers
    if (metadata.performers && metadata.performers.length > 0) {
      console.log('[MetadataMatching] Matching performers:', metadata.performers);
      for (const performerName of metadata.performers) {
        const matched = await this.findPerformerByName(performerName);
        if (matched) {
          console.log('[MetadataMatching] Matched performer:', performerName, '→', matched.name);
          result.matchedPerformers.push(matched);
        } else {
          console.log('[MetadataMatching] Unmatched performer:', performerName);
          result.unmatchedPerformers.push(performerName);
        }
      }
    }

    // Match tags
    if (metadata.tags && metadata.tags.length > 0) {
      console.log('[MetadataMatching] Matching tags:', metadata.tags);
      for (const tagName of metadata.tags) {
        const matched = await this.findTagByName(tagName);
        if (matched) {
          console.log('[MetadataMatching] Matched tag:', tagName, '→', matched.name);
          result.matchedTags.push(matched);
        } else {
          console.log('[MetadataMatching] Unmatched tag:', tagName);
          result.unmatchedTags.push(tagName);
        }
      }
    }

    // Match studio
    if (metadata.studio) {
      console.log('[MetadataMatching] Matching studio:', metadata.studio);
      const matched = await this.findStudioByName(metadata.studio);
      if (matched) {
        console.log('[MetadataMatching] Matched studio:', metadata.studio, '→', matched.name);
        result.matchedStudio = matched;
      } else {
        console.log('[MetadataMatching] Unmatched studio:', metadata.studio);
        result.unmatchedStudio = metadata.studio;
      }
    }

    console.log('[MetadataMatching] Match results:', {
      matchedPerformers: result.matchedPerformers.length,
      matchedTags: result.matchedTags.length,
      matchedStudio: result.matchedStudio?.name,
      unmatchedPerformers: result.unmatchedPerformers.length,
      unmatchedTags: result.unmatchedTags.length,
      unmatchedStudio: result.unmatchedStudio,
    });

    return result;
  }

  /**
   * Find a performer by name with fuzzy matching
   */
  private async findPerformerByName(name: string): Promise<IStashPerformer | undefined> {
    try {
      // Search Stash for performers matching this name
      const performers = await this.stashService.findPerformersByName(name);
      if (performers.length === 0) {
        return undefined;
      }

      // Find exact or normalized match
      const match = findMatchingPerformer(name, performers);
      return match;
    } catch (error) {
      console.error('[MetadataMatching] Error finding performer:', name, error);
      return undefined;
    }
  }

  /**
   * Find a tag by name with fuzzy matching
   */
  private async findTagByName(name: string): Promise<IStashTag | undefined> {
    try {
      // Search Stash for tags matching this name
      const tags = await this.stashService.findTagsByName(name);
      if (tags.length === 0) {
        return undefined;
      }

      // Find exact or normalized match
      const match = findMatchingTag(name, tags);
      return match;
    } catch (error) {
      console.error('[MetadataMatching] Error finding tag:', name, error);
      return undefined;
    }
  }

  /**
   * Find a studio by name with fuzzy matching
   */
  private async findStudioByName(name: string): Promise<IStashStudio | undefined> {
    try {
      // First try exact match
      const exactMatch = await this.stashService.findStudioByName(name);
      if (exactMatch) {
        return exactMatch;
      }

      // Try with normalized name (remove spaces, etc.)
      // This is a workaround since findStudioByName uses EQUALS modifier
      // We could enhance StashGraphQLService to support fuzzy studio matching
      return undefined;
    } catch (error) {
      console.error('[MetadataMatching] Error finding studio:', name, error);
      return undefined;
    }
  }

  /**
   * Create temporary performer objects for unmatched names
   * These can be used in the UI to let users create new performers
   */
  createTempPerformers(names: string[]): IStashPerformer[] {
    return names.map((name, index) => ({
      id: `temp-performer-${Date.now()}-${index}`,
      name,
    }));
  }

  /**
   * Create temporary tag objects for unmatched names
   */
  createTempTags(names: string[]): IStashTag[] {
    return names.map((name, index) => ({
      id: `temp-tag-${Date.now()}-${index}`,
      name,
    }));
  }

  /**
   * Create a temporary studio object for an unmatched name
   */
  createTempStudio(name: string): IStashStudio {
    return {
      id: `temp-studio-${Date.now()}`,
      name,
    };
  }
}

// Singleton instance
let instance: MetadataMatchingService | null = null;

export function getMetadataMatchingService(): MetadataMatchingService {
  if (!instance) {
    instance = new MetadataMatchingService();
  }
  return instance;
}
