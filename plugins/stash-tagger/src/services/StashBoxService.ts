/**
 * Service for querying StashBox via Stash's proxy API
 *
 * Uses Stash's scrapeSingle* queries to proxy requests through the server,
 * avoiding browser CSP restrictions on external requests.
 */

import type {
  StashBoxInstance,
  StashBoxStudio,
  StashBoxPerformer,
  StashBoxTag,
} from '@/types';

interface GraphQLResponse<T> {
  data?: T;
  errors?: Array<{ message: string }>;
}

/**
 * Scraped types from Stash's API (different from direct StashBox types)
 */
interface ScrapedStudio {
  stored_id?: string;
  name: string;
  url?: string;
  urls?: string[];
  parent?: ScrapedStudio;
  image?: string;
  details?: string;
  aliases?: string;
  remote_site_id?: string;
}

interface ScrapedPerformer {
  stored_id?: string;
  name?: string;
  disambiguation?: string;
  gender?: string;
  url?: string;
  urls?: Array<{ url: string; type?: string }>;
  twitter?: string;
  instagram?: string;
  birthdate?: string;
  ethnicity?: string;
  country?: string;
  eye_color?: string;
  hair_color?: string;
  height?: string;
  weight?: string;
  measurements?: string;
  fake_tits?: string;
  career_length?: string;
  tattoos?: string;
  piercings?: string;
  aliases?: string;
  tags?: Array<{ stored_id?: string; name: string }>;
  images?: string[];
  details?: string;
  death_date?: string;
  remote_site_id?: string;
}

interface ScrapedTag {
  stored_id?: string;
  name: string;
  remote_site_id?: string;
}

/**
 * StashBoxService - Query StashBox instances via Stash's proxy API
 */
class StashBoxService {
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
   * Execute a GraphQL request to the local Stash server
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
   * Convert scraped studio to StashBoxStudio format
   */
  private mapScrapedStudio(scraped: ScrapedStudio): StashBoxStudio {
    return {
      id: scraped.remote_site_id ?? '',
      name: scraped.name,
      aliases: scraped.aliases?.split(',').map((a) => a.trim()).filter(Boolean) ?? [],
      urls: scraped.urls?.map((url) => ({ url })) ?? (scraped.url ? [{ url: scraped.url }] : []),
      images: scraped.image ? [{ url: scraped.image }] : [],
      parent: scraped.parent ? this.mapScrapedStudio(scraped.parent) : undefined,
      child_studios: [],
    };
  }

  /**
   * Convert scraped performer to StashBoxPerformer format
   */
  private mapScrapedPerformer(scraped: ScrapedPerformer): StashBoxPerformer {
    return {
      id: scraped.remote_site_id ?? '',
      name: scraped.name ?? '',
      disambiguation: scraped.disambiguation,
      aliases: scraped.aliases?.split(',').map((a) => a.trim()).filter(Boolean) ?? [],
      gender: scraped.gender,
      birth_date: scraped.birthdate,
      death_date: scraped.death_date,
      country: scraped.country,
      ethnicity: scraped.ethnicity,
      eye_color: scraped.eye_color,
      hair_color: scraped.hair_color,
      height: scraped.height ? parseInt(scraped.height, 10) : undefined,
      weight: scraped.weight ? parseInt(scraped.weight, 10) : undefined,
      tattoos: scraped.tattoos ? [scraped.tattoos] : undefined,
      piercings: scraped.piercings ? [scraped.piercings] : undefined,
      images: scraped.images?.map((url) => ({ url })) ?? [],
      urls: scraped.urls ?? [],
    };
  }

  /**
   * Convert scraped tag to StashBoxTag format
   */
  private mapScrapedTag(scraped: ScrapedTag): StashBoxTag {
    return {
      id: scraped.remote_site_id ?? '',
      name: scraped.name,
      aliases: [],
    };
  }

  /**
   * Search for studios in StashBox via Stash proxy
   */
  async searchStudios(
    instance: StashBoxInstance,
    term: string,
    _limit = 10
  ): Promise<StashBoxStudio[]> {
    const query = `
      query ScrapeSingleStudio($source: ScraperSourceInput!, $input: ScrapeSingleStudioInput!) {
        scrapeSingleStudio(source: $source, input: $input) {
          stored_id
          name
          url
          urls
          image
          details
          aliases
          remote_site_id
          parent {
            stored_id
            name
            url
            urls
            image
            remote_site_id
          }
        }
      }
    `;

    const result = await this.gqlRequest<{
      scrapeSingleStudio: ScrapedStudio[];
    }>(query, {
      source: { stash_box_endpoint: instance.endpoint },
      input: { query: term },
    });

    if (result.errors?.length) {
      throw new Error(result.errors[0]?.message ?? 'Failed to search studios');
    }

    return (result.data?.scrapeSingleStudio ?? []).map((s) => this.mapScrapedStudio(s));
  }

  /**
   * Search for performers in StashBox via Stash proxy
   */
  async searchPerformers(
    instance: StashBoxInstance,
    term: string,
    _limit = 10
  ): Promise<StashBoxPerformer[]> {
    const query = `
      query ScrapeSinglePerformer($source: ScraperSourceInput!, $input: ScrapeSinglePerformerInput!) {
        scrapeSinglePerformer(source: $source, input: $input) {
          stored_id
          name
          disambiguation
          gender
          url
          urls {
            url
            type
          }
          birthdate
          death_date
          ethnicity
          country
          eye_color
          hair_color
          height
          weight
          measurements
          fake_tits
          career_length
          tattoos
          piercings
          aliases
          images
          details
          remote_site_id
        }
      }
    `;

    const result = await this.gqlRequest<{
      scrapeSinglePerformer: ScrapedPerformer[];
    }>(query, {
      source: { stash_box_endpoint: instance.endpoint },
      input: { query: term },
    });

    if (result.errors?.length) {
      throw new Error(result.errors[0]?.message ?? 'Failed to search performers');
    }

    return (result.data?.scrapeSinglePerformer ?? []).map((p) => this.mapScrapedPerformer(p));
  }

  /**
   * Search for tags in StashBox via Stash proxy
   */
  async searchTags(
    instance: StashBoxInstance,
    term: string,
    _limit = 10
  ): Promise<StashBoxTag[]> {
    const query = `
      query ScrapeSingleTag($source: ScraperSourceInput!, $input: ScrapeSingleTagInput!) {
        scrapeSingleTag(source: $source, input: $input) {
          stored_id
          name
          remote_site_id
        }
      }
    `;

    const result = await this.gqlRequest<{
      scrapeSingleTag: ScrapedTag[];
    }>(query, {
      source: { stash_box_endpoint: instance.endpoint },
      input: { query: term },
    });

    if (result.errors?.length) {
      throw new Error(result.errors[0]?.message ?? 'Failed to search tags');
    }

    return (result.data?.scrapeSingleTag ?? []).map((t) => this.mapScrapedTag(t));
  }

  /**
   * Get a single studio by ID
   * Note: Uses search with the stash_id as query
   */
  async getStudio(
    instance: StashBoxInstance,
    id: string
  ): Promise<StashBoxStudio | null> {
    const results = await this.searchStudios(instance, id, 1);
    return results.find((s) => s.id === id) ?? results[0] ?? null;
  }

  /**
   * Get a single performer by ID
   * Note: Uses search with the stash_id as query
   */
  async getPerformer(
    instance: StashBoxInstance,
    id: string
  ): Promise<StashBoxPerformer | null> {
    const results = await this.searchPerformers(instance, id, 1);
    return results.find((p) => p.id === id) ?? results[0] ?? null;
  }

  /**
   * Get a single tag by ID
   * Note: Uses search with the stash_id as query
   */
  async getTag(
    instance: StashBoxInstance,
    id: string
  ): Promise<StashBoxTag | null> {
    const results = await this.searchTags(instance, id, 1);
    return results.find((t) => t.id === id) ?? results[0] ?? null;
  }

  /**
   * Test connection to a StashBox instance
   */
  async testConnection(instance: StashBoxInstance): Promise<boolean> {
    try {
      const query = `
        query ValidateStashBoxCredentials($input: StashBoxInput!) {
          validateStashBoxCredentials(input: $input) {
            valid
            status
          }
        }
      `;

      const result = await this.gqlRequest<{
        validateStashBoxCredentials: { valid: boolean; status: string };
      }>(query, {
        input: {
          endpoint: instance.endpoint,
          api_key: instance.api_key,
          name: instance.name,
        },
      });

      return result.data?.validateStashBoxCredentials?.valid ?? false;
    } catch {
      return false;
    }
  }
}

// Export singleton instance
export const stashBoxService = new StashBoxService();
