/**
 * Service for querying local Stash GraphQL API
 */

import type {
  StashBoxInstance,
  LocalStudio,
  LocalPerformer,
  LocalTag,
  StudioUpdateInput,
  PerformerUpdateInput,
  TagUpdateInput,
  StudioCreateInput,
  StashID,
} from '@/types';
import type { PluginSettings } from '@/types/matching';
import { PLUGIN_ID } from '@/constants';

interface GraphQLResponse<T> {
  data?: T;
  errors?: Array<{ message: string }>;
}

/**
 * StashService - Query and mutate local Stash data
 */
class StashService {
  private apiEndpoint: string;

  constructor() {
    this.apiEndpoint = '/graphql';
  }

  /**
   * Get headers for GraphQL requests
   */
  private getHeaders(): HeadersInit {
    const headers: HeadersInit = {
      'Content-Type': 'application/json',
    };

    const apiKey = localStorage.getItem('apiKey');
    if (apiKey) {
      headers['Authorization'] = `Bearer ${apiKey}`;
    }

    return headers;
  }

  /**
   * Execute a GraphQL request
   */
  private async gqlRequest<T>(
    query: string,
    variables?: Record<string, unknown>
  ): Promise<GraphQLResponse<T>> {
    const response = await fetch(this.apiEndpoint, {
      method: 'POST',
      headers: this.getHeaders(),
      body: JSON.stringify({ query, variables }),
    });

    if (!response.ok) {
      throw new Error(`GraphQL request failed: ${response.statusText}`);
    }

    return response.json();
  }

  /**
   * Get configured StashBox instances from Stash
   */
  async getStashBoxInstances(): Promise<StashBoxInstance[]> {
    const query = `
      query GetStashBoxes {
        configuration {
          general {
            stashBoxes {
              endpoint
              api_key
              name
            }
          }
        }
      }
    `;

    const result = await this.gqlRequest<{
      configuration?: {
        general?: {
          stashBoxes?: StashBoxInstance[];
        };
      };
    }>(query);

    return result.data?.configuration?.general?.stashBoxes ?? [];
  }

  /**
   * Get plugin settings
   */
  async getPluginSettings(): Promise<PluginSettings> {
    const query = `
      query GetPluginSettings($include: [ID!]) {
        configuration {
          plugins(include: $include)
        }
      }
    `;

    const result = await this.gqlRequest<{
      configuration?: {
        plugins?: Record<string, PluginSettings>;
      };
    }>(query, { include: [PLUGIN_ID] });

    return result.data?.configuration?.plugins?.[PLUGIN_ID] ?? {};
  }

  /**
   * Get unmatched studios (no stash_ids)
   */
  async getUnmatchedStudios(
    endpoint: string,
    limit = 100,
    page = 1
  ): Promise<{ studios: LocalStudio[]; count: number }> {
    const query = `
      query FindStudios($filter: FindFilterType) {
        findStudios(filter: $filter) {
          count
          studios {
            id
            name
            url
            image_path
            aliases
            stash_ids {
              endpoint
              stash_id
            }
            parent_studio {
              id
              name
            }
            scene_count
          }
        }
      }
    `;

    const result = await this.gqlRequest<{
      findStudios?: {
        count: number;
        studios: LocalStudio[];
      };
    }>(query, {
      filter: {
        per_page: limit,
        page,
      },
    });

    const studios = result.data?.findStudios?.studios ?? [];

    // Filter to only unmatched (no stash_id for this endpoint)
    const unmatched = studios.filter(
      (s) => !s.stash_ids?.some((id) => id.endpoint === endpoint)
    );

    return {
      studios: unmatched,
      count: result.data?.findStudios?.count ?? 0,
    };
  }

  /**
   * Get unmatched performers (no stash_ids)
   */
  async getUnmatchedPerformers(
    endpoint: string,
    limit = 100,
    page = 1
  ): Promise<{ performers: LocalPerformer[]; count: number }> {
    const query = `
      query FindPerformers($filter: FindFilterType) {
        findPerformers(filter: $filter) {
          count
          performers {
            id
            name
            disambiguation
            aliases
            gender
            birthdate
            country
            ethnicity
            eye_color
            hair_color
            height_cm
            weight
            measurements
            fake_tits
            tattoos
            piercings
            image_path
            stash_ids {
              endpoint
              stash_id
            }
            scene_count
          }
        }
      }
    `;

    const result = await this.gqlRequest<{
      findPerformers?: {
        count: number;
        performers: LocalPerformer[];
      };
    }>(query, {
      filter: {
        per_page: limit,
        page,
      },
    });

    const performers = result.data?.findPerformers?.performers ?? [];

    // Filter to only unmatched
    const unmatched = performers.filter(
      (p) => !p.stash_ids?.some((id) => id.endpoint === endpoint)
    );

    return {
      performers: unmatched,
      count: result.data?.findPerformers?.count ?? 0,
    };
  }

  /**
   * Get all tags (tags don't have stash_ids, so we get all and filter by description)
   */
  async getTags(
    limit = 100,
    page = 1
  ): Promise<{ tags: LocalTag[]; count: number }> {
    const query = `
      query FindTags($filter: FindFilterType) {
        findTags(filter: $filter) {
          count
          tags {
            id
            name
            description
            aliases
            image_path
            scene_count
          }
        }
      }
    `;

    const result = await this.gqlRequest<{
      findTags?: {
        count: number;
        tags: LocalTag[];
      };
    }>(query, {
      filter: {
        per_page: limit,
        page,
      },
    });

    return {
      tags: result.data?.findTags?.tags ?? [],
      count: result.data?.findTags?.count ?? 0,
    };
  }

  /**
   * Update a studio with StashBox data
   */
  async updateStudio(input: StudioUpdateInput): Promise<LocalStudio> {
    const mutation = `
      mutation StudioUpdate($input: StudioUpdateInput!) {
        studioUpdate(input: $input) {
          id
          name
          url
          image_path
          aliases
          stash_ids {
            endpoint
            stash_id
          }
          parent_studio {
            id
            name
          }
        }
      }
    `;

    const result = await this.gqlRequest<{
      studioUpdate: LocalStudio;
    }>(mutation, { input });

    if (result.errors?.length) {
      throw new Error(result.errors[0]?.message ?? 'Failed to update studio');
    }

    return result.data!.studioUpdate;
  }

  /**
   * Update a performer with StashBox data
   */
  async updatePerformer(input: PerformerUpdateInput): Promise<LocalPerformer> {
    const mutation = `
      mutation PerformerUpdate($input: PerformerUpdateInput!) {
        performerUpdate(input: $input) {
          id
          name
          disambiguation
          aliases
          stash_ids {
            endpoint
            stash_id
          }
        }
      }
    `;

    const result = await this.gqlRequest<{
      performerUpdate: LocalPerformer;
    }>(mutation, { input });

    if (result.errors?.length) {
      throw new Error(result.errors[0]?.message ?? 'Failed to update performer');
    }

    return result.data!.performerUpdate;
  }

  /**
   * Update a tag with StashBox data
   */
  async updateTag(input: TagUpdateInput): Promise<LocalTag> {
    const mutation = `
      mutation TagUpdate($input: TagUpdateInput!) {
        tagUpdate(input: $input) {
          id
          name
          description
          aliases
        }
      }
    `;

    const result = await this.gqlRequest<{
      tagUpdate: LocalTag;
    }>(mutation, { input });

    if (result.errors?.length) {
      throw new Error(result.errors[0]?.message ?? 'Failed to update tag');
    }

    return result.data!.tagUpdate;
  }

  /**
   * Create a new studio (e.g., for parent studios)
   */
  async createStudio(input: StudioCreateInput): Promise<LocalStudio> {
    const mutation = `
      mutation StudioCreate($input: StudioCreateInput!) {
        studioCreate(input: $input) {
          id
          name
          url
          image_path
          aliases
          stash_ids {
            endpoint
            stash_id
          }
          parent_studio {
            id
            name
          }
        }
      }
    `;

    const result = await this.gqlRequest<{
      studioCreate: LocalStudio;
    }>(mutation, { input });

    if (result.errors?.length) {
      throw new Error(result.errors[0]?.message ?? 'Failed to create studio');
    }

    return result.data!.studioCreate;
  }

  /**
   * Find studio by name (for checking if parent exists)
   */
  async findStudioByName(name: string): Promise<LocalStudio | null> {
    const query = `
      query FindStudioByName($name: String!) {
        findStudios(
          studio_filter: { name: { value: $name, modifier: EQUALS } }
          filter: { per_page: 1 }
        ) {
          studios {
            id
            name
            stash_ids {
              endpoint
              stash_id
            }
          }
        }
      }
    `;

    const result = await this.gqlRequest<{
      findStudios?: {
        studios: LocalStudio[];
      };
    }>(query, { name });

    return result.data?.findStudios?.studios[0] ?? null;
  }

  /**
   * Get or create studio by name with StashBox ID
   */
  async getOrCreateStudio(
    name: string,
    endpoint: string,
    stashBoxId: string,
    imageUrl?: string
  ): Promise<LocalStudio> {
    // Check if studio exists
    const existing = await this.findStudioByName(name);

    if (existing) {
      // Update with stash_id if not already linked
      if (!existing.stash_ids?.some((id) => id.endpoint === endpoint)) {
        const stashIds: StashID[] = [
          ...(existing.stash_ids ?? []),
          { endpoint, stash_id: stashBoxId },
        ];
        return this.updateStudio({
          id: existing.id,
          stash_ids: stashIds,
        });
      }
      return existing;
    }

    // Create new studio
    return this.createStudio({
      name,
      stash_ids: [{ endpoint, stash_id: stashBoxId }],
      image: imageUrl,
    });
  }
}

// Export singleton instance
export const stashService = new StashService();
