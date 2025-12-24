/**
 * StashGraphQLService - Wrapper for Stash GraphQL API
 *
 * Uses direct fetch to /graphql endpoint (community plugin pattern)
 * PluginApi.GQL is a low-level interface without .query()/.mutate() methods
 */

import type {
  IStashPerformer,
  IStashTag,
  IStashStudio,
  IStashScene,
  IStashImage,
  IStashGallery,
  ISceneCreateInput,
  IImageCreateInput,
  IGalleryCreateInput,
  IPerformerCreateInput,
  ITagCreateInput,
  IStudioCreateInput,
  IStashScrapedScene,
  IStashScrapedGallery,
  IStashScrapedImage,
  IStashScraper,
  IPluginTaskResult,
  ScrapeContentType,
} from '@/types';
import { createLogger } from '@/utils';

const log = createLogger('StashGraphQL');

// GraphQL response type
interface GQLResponse<T = unknown> {
  data?: T;
  errors?: Array<{ message: string }>;
}

export class StashGraphQLService {
  private endpoint: string;

  constructor() {
    // Use apiEndpoint from localStorage if available, otherwise default to /graphql
    this.endpoint = localStorage.getItem('apiEndpoint') || '/graphql';
  }

  /**
   * Get headers for GraphQL requests
   * Includes API key authentication if available
   */
  private getHeaders(): HeadersInit {
    const headers: HeadersInit = {
      'Content-Type': 'application/json',
    };

    // Add API key if available (from Stash settings)
    const apiKey = localStorage.getItem('apiKey');
    if (apiKey) {
      headers['Authorization'] = `Bearer ${apiKey}`;
    }

    return headers;
  }

  /**
   * Execute a GraphQL query or mutation
   * Uses direct fetch to /graphql endpoint (community plugin pattern)
   */
  private async gqlRequest<T = unknown>(
    query: string,
    variables?: Record<string, unknown>
  ): Promise<GQLResponse<T>> {
    const response = await fetch(this.endpoint, {
      method: 'POST',
      headers: this.getHeaders(),
      body: JSON.stringify({ query, variables }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      log.error('HTTP error response:', errorText);
      throw new Error(`GraphQL request failed: ${response.status} ${response.statusText}`);
    }

    const result = await response.json();

    // Check for GraphQL errors and log detailed information
    if (result.errors && result.errors.length > 0) {
      const errorMessages = result.errors.map((e: any) => e.message || JSON.stringify(e));
      log.error('GraphQL errors:', JSON.stringify(errorMessages));

      // Log full error details for debugging
      result.errors.forEach((error: any, index: number) => {
        log.error(`Error ${index + 1}:`, JSON.stringify({
          message: error.message,
          path: error.path,
          extensions: error.extensions,
          locations: error.locations,
        }));
      });

      // Log the query that failed for debugging
      log.error('Failed query:', query.substring(0, 500));
      if (variables) {
        log.error('Query variables:', JSON.stringify(variables, null, 2));
      }
    }

    return result;
  }

  /**
   * Find performers by name
   */
  async findPerformersByName(name: string): Promise<IStashPerformer[]> {
    const query = `
      query FindPerformers($filter: String!) {
        findPerformers(
          performer_filter: { name: { value: $filter, modifier: INCLUDES } }
        ) {
          performers {
            id
            name
            disambiguation
            alias_list
            image_path
          }
        }
      }
    `;

    log.debug(`findPerformersByName: searching for "${name}"`);
    const result = await this.gqlRequest<{ findPerformers: { performers: IStashPerformer[] } }>(
      query,
      { filter: name }
    );
    const performers = result.data?.findPerformers?.performers || [];
    log.debug(`findPerformersByName: found ${performers.length} results for "${name}"`,
      performers.length > 0 ? JSON.stringify(performers.map(p => ({ id: p.id, name: p.name, aliases: p.alias_list }))) : '(none)');
    return performers;
  }

  /**
   * Find tags by name
   */
  async findTagsByName(name: string): Promise<IStashTag[]> {
    const query = `
      query FindTags($filter: String!) {
        findTags(
          tag_filter: { name: { value: $filter, modifier: INCLUDES } }
        ) {
          tags {
            id
            name
            aliases
            description
          }
        }
      }
    `;

    log.debug(`findTagsByName: searching for "${name}"`);
    const result = await this.gqlRequest<{ findTags: { tags: IStashTag[] } }>(
      query,
      { filter: name }
    );
    const tags = result.data?.findTags?.tags || [];
    log.debug(`findTagsByName: found ${tags.length} results for "${name}"`,
      tags.length > 0 ? JSON.stringify(tags.map(t => ({ id: t.id, name: t.name, aliases: t.aliases }))) : '(none)');
    return tags;
  }

  /**
   * Find studio by name
   */
  async findStudioByName(name: string): Promise<IStashStudio | null> {
    const query = `
      query FindStudios($filter: String!) {
        findStudios(
          studio_filter: { name: { value: $filter, modifier: EQUALS } }
        ) {
          studios {
            id
            name
            url
            image_path
            aliases
          }
        }
      }
    `;

    log.debug(`findStudioByName: searching for "${name}"`);
    const result = await this.gqlRequest<{ findStudios: { studios: IStashStudio[] } }>(
      query,
      { filter: name }
    );
    const studios = result.data?.findStudios?.studios || [];
    log.debug(`findStudioByName: found ${studios.length} results for "${name}"`,
      studios.length > 0 ? JSON.stringify(studios.map(s => ({ id: s.id, name: s.name, aliases: s.aliases }))) : '(none)');
    return studios.length > 0 ? studios[0]! : null;
  }

  /**
   * Find a scene by URL - used for duplicate detection
   */
  async findSceneByURL(url: string): Promise<IStashScene | null> {
    const query = `
      query FindSceneByURL($url: String!) {
        findScenes(
          scene_filter: { url: { value: $url, modifier: EQUALS } }
          filter: { per_page: 1 }
        ) {
          scenes {
            id
            title
            url
            date
            created_at
          }
        }
      }
    `;

    const result = await this.gqlRequest<{ findScenes: { scenes: IStashScene[] } }>(
      query,
      { url }
    );
    const scenes = result.data?.findScenes?.scenes || [];
    return scenes.length > 0 ? scenes[0]! : null;
  }

  /**
   * Create a new scene
   */
  async createScene(input: ISceneCreateInput): Promise<IStashScene> {
    const mutation = `
      mutation SceneCreate($input: SceneCreateInput!) {
        sceneCreate(input: $input) {
          id
          title
          details
          url
          date
          rating100
          organized
          created_at
          updated_at
        }
      }
    `;

    const result = await this.gqlRequest<{ sceneCreate: IStashScene }>(mutation, { input });
    if (!result.data?.sceneCreate) {
      throw new Error('Failed to create scene');
    }
    return result.data.sceneCreate;
  }

  /**
   * Create a new image
   */
  async createImage(input: IImageCreateInput): Promise<IStashImage> {
    const mutation = `
      mutation ImageCreate($input: ImageCreateInput!) {
        imageCreate(input: $input) {
          id
          title
          rating100
          organized
          created_at
          updated_at
        }
      }
    `;

    const result = await this.gqlRequest<{ imageCreate: IStashImage }>(mutation, { input });
    if (!result.data?.imageCreate) {
      throw new Error('Failed to create image');
    }
    return result.data.imageCreate;
  }

  /**
   * Create a new gallery
   */
  async createGallery(input: IGalleryCreateInput): Promise<IStashGallery> {
    const mutation = `
      mutation GalleryCreate($input: GalleryCreateInput!) {
        galleryCreate(input: $input) {
          id
          title
          details
          url
          date
          rating100
          organized
          created_at
          updated_at
        }
      }
    `;

    const result = await this.gqlRequest<{ galleryCreate: IStashGallery }>(mutation, { input });
    if (!result.data?.galleryCreate) {
      throw new Error('Failed to create gallery');
    }
    return result.data.galleryCreate;
  }

  /**
   * Create a new performer
   */
  async createPerformer(input: IPerformerCreateInput): Promise<IStashPerformer> {
    const mutation = `
      mutation PerformerCreate($input: PerformerCreateInput!) {
        performerCreate(input: $input) {
          id
          name
          disambiguation
          aliases
          image_path
        }
      }
    `;

    const result = await this.gqlRequest<{ performerCreate: IStashPerformer }>(mutation, { input });
    if (!result.data?.performerCreate) {
      throw new Error('Failed to create performer');
    }
    return result.data.performerCreate;
  }

  /**
   * Create a new tag
   */
  async createTag(input: ITagCreateInput): Promise<IStashTag> {
    const mutation = `
      mutation TagCreate($input: TagCreateInput!) {
        tagCreate(input: $input) {
          id
          name
          aliases
          description
        }
      }
    `;

    const result = await this.gqlRequest<{ tagCreate: IStashTag }>(mutation, { input });
    if (!result.data?.tagCreate) {
      throw new Error('Failed to create tag');
    }
    return result.data.tagCreate;
  }

  /**
   * Create a new studio
   */
  async createStudio(input: IStudioCreateInput): Promise<IStashStudio> {
    const mutation = `
      mutation StudioCreate($input: StudioCreateInput!) {
        studioCreate(input: $input) {
          id
          name
          url
          image_path
          aliases
        }
      }
    `;

    const result = await this.gqlRequest<{ studioCreate: IStashStudio }>(mutation, { input });
    if (!result.data?.studioCreate) {
      throw new Error('Failed to create studio');
    }
    return result.data.studioCreate;
  }

  /**
   * Get or create performer by name
   */
  async getOrCreatePerformer(name: string): Promise<IStashPerformer> {
    const existing = await this.findPerformersByName(name);
    if (existing.length > 0) {
      return existing[0]!;
    }

    return await this.createPerformer({ name });
  }

  /**
   * Get or create tag by name
   */
  async getOrCreateTag(name: string): Promise<IStashTag> {
    const existing = await this.findTagsByName(name);
    if (existing.length > 0) {
      return existing[0]!;
    }

    return await this.createTag({ name });
  }

  /**
   * Get or create studio by name
   */
  async getOrCreateStudio(name: string): Promise<IStashStudio> {
    const existing = await this.findStudioByName(name);
    if (existing) {
      return existing;
    }

    return await this.createStudio({ name });
  }

  // ============================================
  // Scraping Methods (Server-side, no CORS)
  // ============================================

  /**
   * Scrape a scene from URL using Stash's built-in scrapers
   * This runs server-side, bypassing CORS restrictions
   */
  async scrapeSceneURL(url: string): Promise<IStashScrapedScene | null> {
    const query = `
      query ScrapeSceneURL($url: String!) {
        scrapeSceneURL(url: $url) {
          title
          code
          details
          director
          url
          urls
          date
          image
          studio {
            stored_id
            name
            url
            image
            remote_site_id
          }
          tags {
            stored_id
            name
          }
          performers {
            stored_id
            name
            disambiguation
            gender
            url
            images
            details
            remote_site_id
          }
          duration
          fingerprints {
            algorithm
            hash
            duration
          }
        }
      }
    `;

    try {
      const result = await this.gqlRequest<{ scrapeSceneURL: IStashScrapedScene }>(
        query,
        { url }
      );
      return result.data?.scrapeSceneURL || null;
    } catch (error) {
      log.error(`scrapeSceneURL failed: ${String(error)}`);
      return null;
    }
  }

  /**
   * Scrape a gallery from URL using Stash's built-in scrapers
   */
  async scrapeGalleryURL(url: string): Promise<IStashScrapedGallery | null> {
    const query = `
      query ScrapeGalleryURL($url: String!) {
        scrapeGalleryURL(url: $url) {
          title
          code
          details
          photographer
          url
          urls
          date
          studio {
            stored_id
            name
            url
            image
          }
          tags {
            stored_id
            name
          }
          performers {
            stored_id
            name
            gender
            url
            images
          }
        }
      }
    `;

    try {
      const result = await this.gqlRequest<{ scrapeGalleryURL: IStashScrapedGallery }>(
        query,
        { url }
      );
      return result.data?.scrapeGalleryURL || null;
    } catch (error) {
      log.error(`scrapeGalleryURL failed: ${String(error)}`);
      return null;
    }
  }

  /**
   * Scrape an image from URL using Stash's built-in scrapers
   */
  async scrapeImageURL(url: string): Promise<IStashScrapedImage | null> {
    const query = `
      query ScrapeImageURL($url: String!) {
        scrapeImageURL(url: $url) {
          title
          code
          details
          photographer
          url
          urls
          date
          studio {
            stored_id
            name
            url
            image
          }
          tags {
            stored_id
            name
          }
          performers {
            stored_id
            name
            gender
            url
            images
          }
        }
      }
    `;

    try {
      const result = await this.gqlRequest<{ scrapeImageURL: IStashScrapedImage }>(
        query,
        { url }
      );
      return result.data?.scrapeImageURL || null;
    } catch (error) {
      log.error(`scrapeImageURL failed: ${String(error)}`);
      return null;
    }
  }

  /**
   * List available scrapers for a content type
   */
  async listScrapers(types: ScrapeContentType[]): Promise<IStashScraper[]> {
    const query = `
      query ListScrapers($types: [ScrapeContentType!]!) {
        listScrapers(types: $types) {
          id
          name
          scene {
            urls
            supported_scrapes
          }
          gallery {
            urls
            supported_scrapes
          }
          performer {
            urls
            supported_scrapes
          }
        }
      }
    `;

    try {
      const result = await this.gqlRequest<{ listScrapers: IStashScraper[] }>(
        query,
        { types }
      );
      return result.data?.listScrapers || [];
    } catch (error) {
      log.error(`listScrapers failed: ${String(error)}`);
      return [];
    }
  }

  /**
   * Check if Stash has a scraper that can handle a URL
   */
  async canScrapeURL(url: string, contentType: ScrapeContentType = 'SCENE'): Promise<boolean> {
    try {
      const scrapers = await this.listScrapers([contentType]);
      const urlHost = new URL(url).hostname.replace('www.', '');

      for (const scraper of scrapers) {
        const spec = contentType === 'SCENE' ? scraper.scene :
                     contentType === 'GALLERY' ? scraper.gallery :
                     scraper.performer;

        if (spec?.urls) {
          for (const scraperUrl of spec.urls) {
            // Check if scraper URL pattern matches
            if (scraperUrl.includes(urlHost) || urlHost.includes(scraperUrl.replace('www.', ''))) {
              return true;
            }
          }
        }
      }

      return false;
    } catch (error) {
      log.error(`canScrapeURL failed: ${String(error)}`);
      return false;
    }
  }

  // ============================================
  // Plugin Task Methods
  // ============================================

  /**
   * Run a plugin task (queued execution)
   * Returns job ID for tracking
   */
  async runPluginTask(
    pluginId: string,
    taskName: string,
    args?: Record<string, unknown>
  ): Promise<string | null> {
    const mutation = `
      mutation RunPluginTask($plugin_id: ID!, $task_name: String, $args_map: Map) {
        runPluginTask(plugin_id: $plugin_id, task_name: $task_name, args_map: $args_map)
      }
    `;

    try {
      const result = await this.gqlRequest<{ runPluginTask: string }>(mutation, {
        plugin_id: pluginId,
        task_name: taskName,
        args_map: args || {},
      });
      return result.data?.runPluginTask || null;
    } catch (error) {
      log.error(`runPluginTask failed: ${String(error)}`);
      return null;
    }
  }

  /**
   * Run a plugin operation (immediate execution, no queue)
   * Returns the result directly
   */
  async runPluginOperation(
    pluginId: string,
    args?: Record<string, unknown>
  ): Promise<IPluginTaskResult | null> {
    const mutation = `
      mutation RunPluginOperation($plugin_id: ID!, $args: Map) {
        runPluginOperation(plugin_id: $plugin_id, args: $args)
      }
    `;

    try {
      const result = await this.gqlRequest<{ runPluginOperation: IPluginTaskResult }>(mutation, {
        plugin_id: pluginId,
        args: args || {},
      });

      // Log the full response for debugging
      log.debug('runPluginOperation full response:', JSON.stringify(result));

      // If there are GraphQL errors, the data might be null/undefined
      if (result.errors && result.errors.length > 0) {
        log.error('runPluginOperation has GraphQL errors, data may be null');
        // Still try to return data if it exists
        if (result.data?.runPluginOperation) {
          return result.data.runPluginOperation;
        }
        return null;
      }

      return result.data?.runPluginOperation || null;
    } catch (error) {
      log.error(`runPluginOperation exception: ${String(error)}`);
      return null;
    }
  }

  /**
   * Stop a running job
   */
  async stopJob(jobId: string): Promise<boolean> {
    const mutation = `
      mutation StopJob($job_id: ID!) {
        stopJob(job_id: $job_id)
      }
    `;

    try {
      const result = await this.gqlRequest<{ stopJob: boolean }>(mutation, { job_id: jobId });
      return result.data?.stopJob || false;
    } catch (error) {
      log.error(`stopJob failed: ${String(error)}`);
      return false;
    }
  }

  /**
   * Get plugin settings from Stash
   * Plugin settings are stored server-side and accessed via GraphQL
   *
   * In Stash's GraphQL schema:
   * - configuration.plugins returns a PluginConfigMap scalar (pluginId -> settings map)
   * - This is a JSON object like {"stash-downloader": {"httpProxy": "...", ...}}
   * - The plugins field accepts an optional include parameter to filter by plugin ID
   */
  async getPluginSettings(pluginId: string): Promise<Record<string, any> | null> {
    // Query configuration.plugins - this returns a PluginConfigMap scalar
    // PluginConfigMap is defined as "A plugin ID -> Map (String -> Any map) map"
    // It's a scalar type, so we don't select subfields
    const query = `
      query GetPluginSettings($include: [ID!]) {
        configuration {
          plugins(include: $include)
        }
      }
    `;

    try {
      const result = await this.gqlRequest<{
        configuration?: {
          plugins?: Record<string, Record<string, any>>;
        };
      }>(query, {
        include: [pluginId],
      });

      if (result.data?.configuration?.plugins) {
        const allPluginSettings = result.data.configuration.plugins;
        const pluginSettings = allPluginSettings[pluginId];

        if (pluginSettings && Object.keys(pluginSettings).length > 0) {
          log.debug('Found settings via configuration.plugins:', JSON.stringify(pluginSettings));
          return pluginSettings;
        }

        // Plugin exists but has no settings configured
        log.debug('Plugin found but no settings configured');
        return {};
      }
    } catch (error: any) {
      const errorMsg = error?.message || String(error);
      log.warn(`configuration.plugins query failed: ${errorMsg}`);
    }

    // Fallback: try without the include filter (older Stash versions may not support it)
    const fallbackQuery = `
      query GetAllPluginSettings {
        configuration {
          plugins
        }
      }
    `;

    try {
      const result = await this.gqlRequest<{
        configuration?: {
          plugins?: Record<string, Record<string, any>>;
        };
      }>(fallbackQuery);

      if (result.data?.configuration?.plugins) {
        const allPluginSettings = result.data.configuration.plugins;
        const pluginSettings = allPluginSettings[pluginId];

        if (pluginSettings && Object.keys(pluginSettings).length > 0) {
          log.debug('Found settings via configuration.plugins (fallback):', JSON.stringify(pluginSettings));
          return pluginSettings;
        }

        log.debug('Plugin found but no settings configured (fallback)');
        return {};
      }
    } catch (error: any) {
      const errorMsg = error?.message || String(error);
      log.warn(`configuration.plugins fallback query failed: ${errorMsg}`);
    }

    log.warn('Could not retrieve plugin settings from Stash');
    return null;
  }

  /**
   * Find a job by ID to check its status
   */
  async findJob(jobId: string): Promise<{
    id: string;
    status: 'READY' | 'RUNNING' | 'FINISHED' | 'STOPPING' | 'CANCELLED' | 'FAILED';
    progress?: number;
    error?: string;
    description: string;
  } | null> {
    const query = `
      query FindJob($input: FindJobInput!) {
        findJob(input: $input) {
          id
          status
          progress
          error
          description
        }
      }
    `;

    try {
      const result = await this.gqlRequest<{ findJob: any }>(query, { input: { id: jobId } });
      return result.data?.findJob || null;
    } catch (error) {
      log.error(`findJob failed: ${String(error)}`);
      return null;
    }
  }

  /**
   * Poll for job completion and return result
   * Uses runPluginTask and polls findJob until complete
   */
  async runPluginTaskAndWait(
    pluginId: string,
    taskName: string,
    args?: Record<string, unknown>,
    options?: {
      pollIntervalMs?: number;
      maxWaitMs?: number;
      onProgress?: (progress: number) => void;
    }
  ): Promise<{ success: boolean; error?: string; jobId?: string }> {
    const pollInterval = options?.pollIntervalMs || 500;
    const maxWait = options?.maxWaitMs || 120000; // 2 minutes default

    log.debug(`Starting plugin task: ${pluginId}/${taskName}`);

    // Start the task
    const jobId = await this.runPluginTask(pluginId, taskName, args);
    if (!jobId) {
      return { success: false, error: 'Failed to start plugin task' };
    }

    log.debug(`Task started with job ID: ${jobId}`);

    // Poll for completion
    const startTime = Date.now();
    while (Date.now() - startTime < maxWait) {
      await new Promise((resolve) => setTimeout(resolve, pollInterval));

      const job = await this.findJob(jobId);
      if (!job) {
        log.warn(`Job ${jobId} not found, may have completed quickly`);
        return { success: true, jobId };
      }

      log.debug(`Job ${jobId} status: ${job.status}, progress: ${job.progress || 0}`);

      if (options?.onProgress && job.progress !== undefined) {
        options.onProgress(job.progress);
      }

      switch (job.status) {
        case 'FINISHED':
          log.debug(`Stash job ${jobId} finished successfully`);
          return { success: true, jobId };

        case 'FAILED':
          log.error(`Stash job failed`, `Job ID: ${jobId}\nError: ${job.error || 'Unknown error'}`);
          return { success: false, error: job.error || 'Job failed', jobId };

        case 'CANCELLED':
        case 'STOPPING':
          log.warn(`Stash job was cancelled`, `Job ID: ${jobId}`);
          return { success: false, error: 'Job was cancelled', jobId };

        case 'READY':
        case 'RUNNING':
          // Continue polling
          break;
      }
    }

    // Timeout - try to stop the job
    log.warn(`Job ${jobId} timed out after ${maxWait}ms`);
    await this.stopJob(jobId);
    return { success: false, error: 'Job timed out', jobId };
  }

  /**
   * Check if we're running in Stash (vs test-app)
   */
  isStashEnvironment(): boolean {
    return !!(window.PluginApi && !(window as any).__TEST_APP__);
  }

  /**
   * Get Stash library paths (watched folders)
   * These are the directories Stash scans for content
   */
  async getLibraryPaths(): Promise<{ path: string; excludeVideo: boolean; excludeImage: boolean }[]> {
    const query = `
      query GetConfiguration {
        configuration {
          general {
            stashes {
              path
              excludeVideo
              excludeImage
            }
          }
        }
      }
    `;

    try {
      const result = await this.gqlRequest<{
        configuration: {
          general: {
            stashes: { path: string; excludeVideo: boolean; excludeImage: boolean }[];
          };
        };
      }>(query);

      const stashes = result.data?.configuration?.general?.stashes || [];
      log.debug('Library paths:', JSON.stringify(stashes));
      return stashes;
    } catch (error) {
      log.error(`Failed to get library paths: ${String(error)}`);
      return [];
    }
  }

  /**
   * Get the first video-enabled library path (for downloading videos)
   */
  async getVideoLibraryPath(): Promise<string | null> {
    const stashes = await this.getLibraryPaths();
    const videoPath = stashes.find(s => !s.excludeVideo);
    return videoPath?.path || null;
  }

  /**
   * Get the first image-enabled library path (for downloading images)
   */
  async getImageLibraryPath(): Promise<string | null> {
    const stashes = await this.getLibraryPaths();
    const imagePath = stashes.find(s => !s.excludeImage);
    return imagePath?.path || null;
  }

  /**
   * Trigger a metadata scan for specific paths
   * If no paths provided, scans all library paths
   */
  async triggerScan(paths?: string[]): Promise<string | null> {
    const mutation = `
      mutation MetadataScan($input: ScanMetadataInput!) {
        metadataScan(input: $input)
      }
    `;

    try {
      const input: { paths?: string[] } = {};
      if (paths && paths.length > 0) {
        input.paths = paths;
      }

      const result = await this.gqlRequest<{ metadataScan: string }>(mutation, { input });
      const jobId = result.data?.metadataScan;
      log.info(`Scan triggered, job ID: ${jobId || 'unknown'}`);
      return jobId || null;
    } catch (error) {
      log.error(`Failed to trigger scan: ${String(error)}`);
      return null;
    }
  }

  /**
   * Trigger a scan for a specific file path (parent directory)
   */
  async triggerScanForFile(filePath: string): Promise<string | null> {
    // Get parent directory of the file
    const lastSlash = Math.max(filePath.lastIndexOf('/'), filePath.lastIndexOf('\\'));
    const directory = lastSlash > 0 ? filePath.substring(0, lastSlash) : filePath;
    log.debug('Triggering scan for directory:', directory);
    return this.triggerScan([directory]);
  }
}

// Singleton instance
let instance: StashGraphQLService | null = null;

export function getStashService(): StashGraphQLService {
  if (!instance) {
    instance = new StashGraphQLService();
  }
  return instance;
}
