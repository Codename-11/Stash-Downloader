/**
 * Service for querying StashBox GraphQL API
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
 * StashBoxService - Query StashBox instances
 */
class StashBoxService {
  /**
   * Execute a GraphQL request against a StashBox instance
   */
  private async gqlRequest<T>(
    instance: StashBoxInstance,
    query: string,
    variables?: Record<string, unknown>
  ): Promise<GraphQLResponse<T>> {
    // Ensure endpoint ends with /graphql
    let endpoint = instance.endpoint;
    if (!endpoint.endsWith('/graphql')) {
      endpoint = endpoint.replace(/\/$/, '') + '/graphql';
    }

    const response = await fetch(endpoint, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'ApiKey': instance.api_key,
      },
      body: JSON.stringify({ query, variables }),
    });

    if (!response.ok) {
      throw new Error(`StashBox request failed: ${response.statusText}`);
    }

    return response.json();
  }

  /**
   * Search for studios in StashBox
   */
  async searchStudios(
    instance: StashBoxInstance,
    term: string,
    limit = 10
  ): Promise<StashBoxStudio[]> {
    const query = `
      query SearchStudio($term: String!, $limit: Int) {
        searchStudio(term: $term, limit: $limit) {
          id
          name
          aliases
          urls {
            url
          }
          images {
            url
          }
          parent {
            id
            name
            aliases
            urls {
              url
            }
            images {
              url
            }
          }
          child_studios {
            id
            name
          }
        }
      }
    `;

    const result = await this.gqlRequest<{
      searchStudio: StashBoxStudio[];
    }>(instance, query, { term, limit });

    if (result.errors?.length) {
      throw new Error(result.errors[0]?.message ?? 'Failed to search studios');
    }

    return result.data?.searchStudio ?? [];
  }

  /**
   * Search for performers in StashBox
   */
  async searchPerformers(
    instance: StashBoxInstance,
    term: string,
    limit = 10
  ): Promise<StashBoxPerformer[]> {
    const query = `
      query SearchPerformer($term: String!, $limit: Int) {
        searchPerformer(term: $term, limit: $limit) {
          id
          name
          disambiguation
          aliases
          gender
          birth_date
          death_date
          country
          ethnicity
          eye_color
          hair_color
          height
          weight
          measurements {
            band_size
            cup_size
            waist
            hip
          }
          breast_type
          career_start_year
          career_end_year
          tattoos
          piercings
          images {
            url
          }
          urls {
            url
            type
          }
        }
      }
    `;

    const result = await this.gqlRequest<{
      searchPerformer: StashBoxPerformer[];
    }>(instance, query, { term, limit });

    if (result.errors?.length) {
      throw new Error(result.errors[0]?.message ?? 'Failed to search performers');
    }

    return result.data?.searchPerformer ?? [];
  }

  /**
   * Search for tags in StashBox
   */
  async searchTags(
    instance: StashBoxInstance,
    term: string,
    limit = 10
  ): Promise<StashBoxTag[]> {
    const query = `
      query SearchTag($term: String!, $limit: Int) {
        searchTag(term: $term, limit: $limit) {
          id
          name
          description
          aliases
          category {
            id
            name
          }
        }
      }
    `;

    const result = await this.gqlRequest<{
      searchTag: StashBoxTag[];
    }>(instance, query, { term, limit });

    if (result.errors?.length) {
      throw new Error(result.errors[0]?.message ?? 'Failed to search tags');
    }

    return result.data?.searchTag ?? [];
  }

  /**
   * Get a single studio by ID
   */
  async getStudio(
    instance: StashBoxInstance,
    id: string
  ): Promise<StashBoxStudio | null> {
    const query = `
      query FindStudio($id: ID!) {
        findStudio(id: $id) {
          id
          name
          aliases
          urls {
            url
          }
          images {
            url
          }
          parent {
            id
            name
            aliases
            urls {
              url
            }
            images {
              url
            }
          }
          child_studios {
            id
            name
          }
        }
      }
    `;

    const result = await this.gqlRequest<{
      findStudio: StashBoxStudio | null;
    }>(instance, query, { id });

    return result.data?.findStudio ?? null;
  }

  /**
   * Get a single performer by ID
   */
  async getPerformer(
    instance: StashBoxInstance,
    id: string
  ): Promise<StashBoxPerformer | null> {
    const query = `
      query FindPerformer($id: ID!) {
        findPerformer(id: $id) {
          id
          name
          disambiguation
          aliases
          gender
          birth_date
          death_date
          country
          ethnicity
          eye_color
          hair_color
          height
          weight
          measurements {
            band_size
            cup_size
            waist
            hip
          }
          breast_type
          career_start_year
          career_end_year
          tattoos
          piercings
          images {
            url
          }
          urls {
            url
            type
          }
        }
      }
    `;

    const result = await this.gqlRequest<{
      findPerformer: StashBoxPerformer | null;
    }>(instance, query, { id });

    return result.data?.findPerformer ?? null;
  }

  /**
   * Get a single tag by ID
   */
  async getTag(
    instance: StashBoxInstance,
    id: string
  ): Promise<StashBoxTag | null> {
    const query = `
      query FindTag($id: ID!) {
        findTag(id: $id) {
          id
          name
          description
          aliases
          category {
            id
            name
          }
        }
      }
    `;

    const result = await this.gqlRequest<{
      findTag: StashBoxTag | null;
    }>(instance, query, { id });

    return result.data?.findTag ?? null;
  }

  /**
   * Test connection to a StashBox instance
   */
  async testConnection(instance: StashBoxInstance): Promise<boolean> {
    try {
      const query = `
        query TestConnection {
          version {
            version
          }
        }
      `;

      const result = await this.gqlRequest<{
        version: { version: string };
      }>(instance, query);

      return !!result.data?.version?.version;
    } catch {
      return false;
    }
  }
}

// Export singleton instance
export const stashBoxService = new StashBoxService();
