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
}

// Singleton instance
let instance: StashGraphQLService | null = null;

export function getStashService(): StashGraphQLService {
  if (!instance) {
    instance = new StashGraphQLService();
  }
  return instance;
}
