/**
 * Booru types - shared across plugins
 * Common types for booru site interactions (Rule34, Gelbooru, Danbooru, etc.)
 */

/**
 * Booru tag with type information
 */
export interface IBooruTag {
  name: string;
  type: 'general' | 'artist' | 'character' | 'copyright' | 'meta';
}

/**
 * Normalized booru post data (common format across all booru sites)
 */
export interface INormalizedBooruPost {
  id: string;
  fileUrl: string;
  previewUrl?: string;
  sampleUrl?: string;
  tags: IBooruTag[];
  rating: string;
  score?: number;
  source?: string;
  width?: number;
  height?: number;
  createdAt?: string;
  fileExt?: string;
}

/**
 * Booru adapter interface
 * Each booru site implements this interface
 */
export interface IBooruAdapter {
  name: string;
  domains: string[];
  parsePostId(url: string): string | null;
  buildApiUrl(postId: string): string;
  parseResponse(data: unknown): INormalizedBooruPost;
  parsePoolId?(url: string): string | null;
  buildPoolApiUrl?(poolId: string): string;
  parsePoolResponse?(data: unknown): string[];
}

/**
 * Rule34-specific post format (from API response)
 */
export interface IRule34Post {
  id: number;
  tags: string;
  file_url: string;
  preview_url: string;
  sample_url: string;
  width: number;
  height: number;
  score: number;
  rating: 's' | 'q' | 'e';
  source: string;
  owner: string;
  created_at: string;
  change: number;
}
