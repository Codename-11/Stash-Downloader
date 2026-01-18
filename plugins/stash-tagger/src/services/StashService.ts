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

    const result: GraphQLResponse<T> = await response.json();

    // Check for GraphQL errors
    if (result.errors && result.errors.length > 0) {
      const errorMessages = result.errors.map(e => e.message).join(', ');
      console.error('[StashService] GraphQL errors:', result.errors);
      throw new Error(`GraphQL errors: ${errorMessages}`);
    }

    return result;
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
   * Get studios with optional filter mode
   * @param limit - Number of results per page
   * @param page - Page number
   * @param unmatchedOnly - If true, only return studios without stash_ids
   */
  async getStudios(
    limit = 100,
    page = 1,
    unmatchedOnly = true
  ): Promise<{ studios: LocalStudio[]; count: number }> {
    const query = `
      query FindStudios($filter: FindFilterType, $studioFilter: StudioFilterType) {
        findStudios(filter: $filter, studio_filter: $studioFilter) {
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

    const variables: Record<string, unknown> = {
      filter: {
        per_page: limit,
        page,
      },
    };

    // Only add is_missing filter when getting unmatched studios
    if (unmatchedOnly) {
      variables.studioFilter = {
        is_missing: 'stash_id',
      };
    }

    const result = await this.gqlRequest<{
      findStudios?: {
        count: number;
        studios: LocalStudio[];
      };
    }>(query, variables);

    return {
      studios: result.data?.findStudios?.studios ?? [],
      count: result.data?.findStudios?.count ?? 0,
    };
  }

  /**
   * Get unmatched studios (no stash_ids from ANY endpoint)
   * @deprecated Use getStudios(limit, page, true) instead
   */
  async getUnmatchedStudios(
    limit = 100,
    page = 1
  ): Promise<{ studios: LocalStudio[]; count: number }> {
    return this.getStudios(limit, page, true);
  }

  /**
   * Get performers with optional filter mode
   * @param limit - Number of results per page
   * @param page - Page number
   * @param unmatchedOnly - If true, only return performers without stash_ids
   */
  async getPerformers(
    limit = 100,
    page = 1,
    unmatchedOnly = true
  ): Promise<{ performers: LocalPerformer[]; count: number }> {
    const query = `
      query FindPerformers($filter: FindFilterType, $performerFilter: PerformerFilterType) {
        findPerformers(filter: $filter, performer_filter: $performerFilter) {
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

    const variables: Record<string, unknown> = {
      filter: {
        per_page: limit,
        page,
      },
    };

    // Only add is_missing filter when getting unmatched performers
    if (unmatchedOnly) {
      variables.performerFilter = {
        is_missing: 'stash_id',
      };
    }

    const result = await this.gqlRequest<{
      findPerformers?: {
        count: number;
        performers: LocalPerformer[];
      };
    }>(query, variables);

    return {
      performers: result.data?.findPerformers?.performers ?? [],
      count: result.data?.findPerformers?.count ?? 0,
    };
  }

  /**
   * Get unmatched performers (no stash_ids from ANY endpoint)
   * @deprecated Use getPerformers(limit, page, true) instead
   */
  async getUnmatchedPerformers(
    limit = 100,
    page = 1
  ): Promise<{ performers: LocalPerformer[]; count: number }> {
    return this.getPerformers(limit, page, true);
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

  /**
   * Find a scene by ID
   */
  async findScene(id: string): Promise<{ id: string; files: Array<{ path: string }> } | null> {
    const query = `
      query FindScene($id: ID!) {
        findScene(id: $id) {
          id
          files {
            path
          }
        }
      }
    `;

    const result = await this.gqlRequest<{ findScene: { id: string; files: Array<{ path: string }> } | null }>(
      query,
      { id }
    );

    return result.data?.findScene || null;
  }

  /**
   * Get all scenes with pagination
   */
  async getScenes(
    limit = 100,
    page = 1
  ): Promise<{ scenes: Array<{ id: string; title?: string; path?: string }>; count: number }> {
    const query = `
      query FindScenes($filter: FindFilterType) {
        findScenes(filter: $filter) {
          count
          scenes {
            id
            title
            files {
              path
            }
          }
        }
      }
    `;

    const result = await this.gqlRequest<{
      findScenes: {
        count: number;
        scenes: Array<{ id: string; title?: string; files: Array<{ path: string }> }>;
      };
    }>(query, {
      filter: {
        per_page: limit,
        page: page,
        sort: 'created_at',
        direction: 'DESC',
      },
    });

    const scenes = result.data?.findScenes.scenes.map(s => ({
      id: s.id,
      title: s.title,
      path: s.files[0]?.path,
    })) || [];

    return {
      scenes,
      count: result.data?.findScenes.count || 0,
    };
  }

  /**
   * Find a gallery by ID
   * Note: Stash galleries use 'folder' for folder-based, 'files' for zip-based
   */
  async findGallery(id: string): Promise<{ id: string; files: Array<{ path: string }> } | null> {
    const query = `
      query FindGallery($id: ID!) {
        findGallery(id: $id) {
          id
          path
          folder {
            path
          }
          files {
            path
          }
        }
      }
    `;

    const result = await this.gqlRequest<{ 
      findGallery: { 
        id: string;
        path?: string;
        folder?: { path: string } | null;
        files: Array<{ path: string }>;
      } | null 
    }>(
      query,
      { id }
    );

    if (!result.data?.findGallery) {
      return null;
    }

    const gallery = result.data.findGallery;
    
    // Build files array from available sources
    const allFiles: Array<{ path: string }> = [];
    
    // Folder-based gallery - use folder.path as the directory
    if (gallery.folder?.path) {
      allFiles.push({ path: gallery.folder.path });
    }
    
    // Zip-based gallery - use files array
    if (gallery.files && gallery.files.length > 0) {
      allFiles.push(...gallery.files);
    }
    
    // Fallback to gallery path itself
    if (allFiles.length === 0 && gallery.path) {
      allFiles.push({ path: gallery.path });
    }

    return {
      id: gallery.id,
      files: allFiles
    };
  }

  /**
   * Get all galleries with pagination
   * Note: Stash galleries use 'folder' for folder-based, 'files' for zip-based
   */
  async getGalleries(
    limit = 100,
    page = 1
  ): Promise<{ galleries: Array<{ id: string; title?: string; path?: string }>; count: number }> {
    const query = `
      query FindGalleries($filter: FindFilterType) {
        findGalleries(filter: $filter) {
          count
          galleries {
            id
            title
            path
            folder {
              path
            }
            files {
              path
            }
          }
        }
      }
    `;

    const result = await this.gqlRequest<{
      findGalleries: {
        count: number;
        galleries: Array<{ 
          id: string; 
          title?: string;
          path?: string;
          folder?: { path: string } | null;
          files: Array<{ path: string }>;
        }>;
      };
    }>(query, {
      filter: {
        per_page: limit,
        page: page,
        sort: 'created_at',
        direction: 'DESC',
      },
    });

    const galleries = result.data?.findGalleries.galleries.map(g => {
      // Get first file path from folder, files, or path
      let firstPath: string | undefined;
      
      if (g.folder?.path) {
        firstPath = g.folder.path;
      } else if (g.files?.[0]?.path) {
        firstPath = g.files[0].path;
      } else {
        firstPath = g.path;
      }
      
      return {
        id: g.id,
        title: g.title,
        path: firstPath,
      };
    }) || [];

    return {
      galleries,
      count: result.data?.findGalleries.count || 0,
    };
  }

  /**
   * Run a plugin task
   */
  async runPluginTask(
    pluginId: string,
    args: Record<string, unknown>
  ): Promise<{ output: unknown } | null> {
    const query = `
      mutation RunPluginTask($plugin_id: ID!, $args: Map!) {
        runPluginTask(plugin_id: $plugin_id, args: $args) {
          ... on PluginTaskSuccess {
            output
          }
        }
      }
    `;

    const result = await this.gqlRequest<{ runPluginTask: { output: unknown } | null }>(
      query,
      { plugin_id: pluginId, args }
    );

    return result.data?.runPluginTask || null;
  }
}

// Export singleton instance
export const stashService = new StashService();
