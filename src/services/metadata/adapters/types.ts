/**
 * Booru Adapter Types
 *
 * These types define the interface for booru site adapters.
 * Each adapter handles parsing URLs, building API requests, and normalizing responses.
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
  fileUrl: string; // Full-size image/video URL
  previewUrl?: string; // Small thumbnail
  sampleUrl?: string; // Medium-sized preview
  tags: IBooruTag[];
  rating: string; // safe, questionable, explicit (or s, q, e)
  score?: number;
  source?: string; // Original source URL
  width?: number;
  height?: number;
  createdAt?: string;
  fileExt?: string; // File extension (jpg, png, webm, mp4)
}

/**
 * Booru adapter interface
 * Each booru site implements this interface
 */
export interface IBooruAdapter {
  /** Display name for the adapter */
  name: string;

  /** Domains this adapter handles */
  domains: string[];

  /**
   * Parse post ID from URL
   * @returns Post ID or null if URL doesn't match
   */
  parsePostId(url: string): string | null;

  /**
   * Build API URL for fetching post data
   * @param postId Post ID to fetch
   * @returns Full API URL
   */
  buildApiUrl(postId: string): string;

  /**
   * Parse API response into normalized format
   * @param data Raw API response
   * @returns Normalized post data
   */
  parseResponse(data: unknown): INormalizedBooruPost;

  /**
   * Optional: Check if URL is a pool/gallery URL
   * @returns Pool ID or null if not a pool URL
   */
  parsePoolId?(url: string): string | null;

  /**
   * Optional: Build API URL for fetching pool data
   * @param poolId Pool ID to fetch
   * @returns Full API URL
   */
  buildPoolApiUrl?(poolId: string): string;

  /**
   * Optional: Parse pool API response
   * @param data Raw API response
   * @returns Array of post IDs in the pool
   */
  parsePoolResponse?(data: unknown): string[];
}
