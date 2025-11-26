/**
 * StashGraphQLService - Wrapper for Stash GraphQL API
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

export class StashGraphQLService {
  private gql: typeof window.PluginApi.GQL;

  constructor() {
    if (!window.PluginApi?.GQL) {
      throw new Error('PluginApi.GQL not available');
    }
    this.gql = window.PluginApi.GQL;
  }

  /**
   * Find performers by name
   */
  async findPerformersByName(name: string): Promise<IStashPerformer[]> {
    const query = `
      query FindPerformers($filter: String) {
        findPerformers(
          performer_filter: { name: { value: $filter, modifier: INCLUDES } }
        ) {
          performers {
            id
            name
            disambiguation
            aliases
            image_path
          }
        }
      }
    `;

    const result = await this.gql.query(query, { filter: name });
    return result.data.findPerformers.performers;
  }

  /**
   * Find tags by name
   */
  async findTagsByName(name: string): Promise<IStashTag[]> {
    const query = `
      query FindTags($filter: String) {
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

    const result = await this.gql.query(query, { filter: name });
    return result.data.findTags.tags;
  }

  /**
   * Find studio by name
   */
  async findStudioByName(name: string): Promise<IStashStudio | null> {
    const query = `
      query FindStudios($filter: String) {
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

    const result = await this.gql.query(query, { filter: name });
    const studios = result.data.findStudios.studios;
    return studios.length > 0 ? studios[0] : null;
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

    const result = await this.gql.mutate(mutation, { input });
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

    const result = await this.gql.mutate(mutation, { input });
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

    const result = await this.gql.mutate(mutation, { input });
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

    const result = await this.gql.mutate(mutation, { input });
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

    const result = await this.gql.mutate(mutation, { input });
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

    const result = await this.gql.mutate(mutation, { input });
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
      const result = await this.gql.query(query, { url });
      return result.data?.scrapeSceneURL || null;
    } catch (error) {
      console.error('[StashGraphQL] scrapeSceneURL failed:', error);
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
      const result = await this.gql.query(query, { url });
      return result.data?.scrapeGalleryURL || null;
    } catch (error) {
      console.error('[StashGraphQL] scrapeGalleryURL failed:', error);
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
      const result = await this.gql.query(query, { url });
      return result.data?.scrapeImageURL || null;
    } catch (error) {
      console.error('[StashGraphQL] scrapeImageURL failed:', error);
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
      const result = await this.gql.query(query, { types });
      return result.data?.listScrapers || [];
    } catch (error) {
      console.error('[StashGraphQL] listScrapers failed:', error);
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
      console.error('[StashGraphQL] canScrapeURL failed:', error);
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
      const result = await this.gql.mutate(mutation, {
        plugin_id: pluginId,
        task_name: taskName,
        args_map: args || {},
      });
      return result.data?.runPluginTask || null;
    } catch (error) {
      console.error('[StashGraphQL] runPluginTask failed:', error);
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
      const result = await this.gql.mutate(mutation, {
        plugin_id: pluginId,
        args: args || {},
      });
      return result.data?.runPluginOperation || null;
    } catch (error) {
      console.error('[StashGraphQL] runPluginOperation failed:', error);
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
      const result = await this.gql.mutate(mutation, { job_id: jobId });
      return result.data?.stopJob || false;
    } catch (error) {
      console.error('[StashGraphQL] stopJob failed:', error);
      return false;
    }
  }

  /**
   * Check if we're running in Stash (vs test-app)
   */
  isStashEnvironment(): boolean {
    return !!(window.PluginApi?.GQL && !(window as any).__TEST_APP__);
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
