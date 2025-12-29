/**
 * Booru Service
 * Handles communication with the Python CORS proxy backend via Stash's plugin system.
 */

import { PLUGIN_ID, SOURCES, type SourceType } from '@/constants';
import type { IBooruPost, ISearchResult } from '@/types';

// GraphQL response types
interface GqlResponse<T> {
  data?: T;
  errors?: Array<{ message: string }>;
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type RawPost = Record<string, any>;

interface PluginOperationResult {
  error?: string;
  source?: string;
  tags?: string | TagSuggestion[];  // string for search, TagSuggestion[] for autocomplete
  query?: string;
  page?: number;
  limit?: number;
  count?: number;
  posts?: RawPost[];
  post?: RawPost;
}

// Helper to safely get tags as string
function getTagsAsString(result: PluginOperationResult, fallback: string): string {
  if (typeof result.tags === 'string') return result.tags;
  return fallback;
}

// Tag autocomplete result
export interface TagSuggestion {
  name: string;
  count: number;
  category: number;
}

// Plugin settings
interface PluginSettings {
  rule34ApiKey?: string;
  rule34UserId?: string;
  gelbooruApiKey?: string;
  gelbooruUserId?: string;
  httpProxy?: string;
}

// Cached settings
let cachedSettings: PluginSettings | null = null;

/**
 * Fetch plugin settings from Stash
 */
async function getPluginSettings(): Promise<PluginSettings> {
  if (cachedSettings) {
    return cachedSettings;
  }

  const query = `
    query GetPluginSettings($include: [ID!]) {
      configuration {
        plugins(include: $include)
      }
    }
  `;

  try {
    const result = await gqlRequest<{ configuration: { plugins: Record<string, PluginSettings> } }>(
      query,
      { include: [PLUGIN_ID] }
    );

    const settings = result.data?.configuration?.plugins?.[PLUGIN_ID] || {};
    cachedSettings = settings;
    return settings;
  } catch (error) {
    console.warn('[BooruService] Failed to fetch settings:', error);
    return {};
  }
}

/**
 * Get API credentials for a source
 */
function getCredentialsForSource(settings: PluginSettings, source: SourceType): { api_key?: string; user_id?: string } {
  switch (source) {
    case SOURCES.RULE34:
      return {
        api_key: settings.rule34ApiKey,
        user_id: settings.rule34UserId,
      };
    case SOURCES.GELBOORU:
      return {
        api_key: settings.gelbooruApiKey,
        user_id: settings.gelbooruUserId,
      };
    default:
      return {};
  }
}

/**
 * Make a GraphQL request to Stash
 */
async function gqlRequest<T>(
  query: string,
  variables?: Record<string, unknown>
): Promise<GqlResponse<T>> {
  // Get API key from localStorage if available
  const apiKey = localStorage.getItem('apiKey');

  const response = await fetch('/graphql', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      ...(apiKey ? { Authorization: `Bearer ${apiKey}` } : {}),
    },
    body: JSON.stringify({ query, variables }),
  });

  if (!response.ok) {
    throw new Error(`GraphQL request failed: ${response.status} ${response.statusText}`);
  }

  return response.json();
}

/**
 * Run a plugin operation (calls Python backend)
 */
async function runPluginOperation(
  args: Record<string, unknown>
): Promise<PluginOperationResult | null> {
  const mutation = `
    mutation RunPluginOperation($plugin_id: ID!, $args: Map) {
      runPluginOperation(plugin_id: $plugin_id, args: $args)
    }
  `;

  try {
    console.log(`[BooruService] Calling runPluginOperation for plugin: ${PLUGIN_ID}`, args);

    const result = await gqlRequest<{ runPluginOperation: PluginOperationResult }>(mutation, {
      plugin_id: PLUGIN_ID,
      args,
    });

    console.log('[BooruService] Raw GraphQL response:', JSON.stringify(result));

    if (result.errors && result.errors.length > 0) {
      console.error('[BooruService] GraphQL errors:', result.errors);
      const firstError = result.errors[0];
      throw new Error(firstError?.message || 'Unknown GraphQL error');
    }

    const opResult = result.data?.runPluginOperation;
    console.log('[BooruService] Operation result:', opResult);

    return opResult || null;
  } catch (error) {
    console.error('[BooruService] runPluginOperation failed:', error);
    throw error;
  }
}

/**
 * Search for posts on a booru source
 */
export async function searchPosts(
  source: SourceType,
  tags: string,
  page: number = 0,
  limit: number = 40
): Promise<ISearchResult> {
  console.log(`[BooruService] Searching ${source} for "${tags}" (page ${page})`);

  // Fetch settings and get credentials for this source
  const settings = await getPluginSettings();
  const credentials = getCredentialsForSource(settings, source);

  console.log(`[BooruService] Using credentials for ${source}:`, {
    hasApiKey: !!credentials.api_key,
    hasUserId: !!credentials.user_id,
    hasProxy: !!settings.httpProxy,
  });

  const result = await runPluginOperation({
    mode: 'search',
    source,
    tags,
    page,
    limit,
    ...credentials, // api_key and user_id (if available)
    ...(settings.httpProxy ? { proxy: settings.httpProxy } : {}),
  });

  if (!result) {
    throw new Error('No response from plugin');
  }

  if (result.error) {
    throw new Error(result.error);
  }

  const posts = normalizePostsForSource(result.posts || [], source);

  return {
    source,
    tags: getTagsAsString(result, tags),
    page: result.page ?? page,
    limit: result.limit ?? limit,
    count: result.count ?? 0,
    posts,
    hasMore: posts.length === limit,
  };
}

/**
 * Get a single post by ID
 */
export async function getPost(source: SourceType, postId: number): Promise<IBooruPost> {
  console.log(`[BooruService] Getting post ${postId} from ${source}`);

  const result = await runPluginOperation({
    mode: 'post',
    source,
    id: postId,
  });

  if (!result) {
    throw new Error('No response from plugin');
  }

  if (result.error) {
    throw new Error(result.error);
  }

  if (!result.post) {
    throw new Error(`Post ${postId} not found`);
  }

  const normalizedPosts = normalizePostsForSource([result.post], source);
  const normalized = normalizedPosts[0];
  if (!normalized) {
    throw new Error(`Failed to normalize post ${postId}`);
  }
  return normalized;
}


/**
 * Get tag autocomplete suggestions
 * Note: Danbooru autocomplete may fail due to Cloudflare protection.
 * Configure an HTTP proxy in plugin settings to potentially bypass this.
 */
export async function autocompleteTags(
  source: SourceType,
  query: string,
  limit: number = 100
): Promise<TagSuggestion[]> {
  if (!query || query.length < 2) {
    return [];
  }

  console.log(`[BooruService] Autocomplete for "${query}" on ${source}`);

  try {
    // All sources use server-side (Python backend)
    // Danbooru may be blocked by Cloudflare - proxy may help
    const settings = await getPluginSettings();
    const credentials = getCredentialsForSource(settings, source);

    const result = await runPluginOperation({
      mode: 'autocomplete',
      source,
      query,
      limit,
      ...credentials, // api_key and user_id (if available)
      ...(settings.httpProxy ? { proxy: settings.httpProxy } : {}),
    });

    if (!result || result.error) {
      // Danbooru often fails due to Cloudflare - don't spam warnings
      if (source === 'danbooru') {
        console.log('[BooruService] Danbooru autocomplete unavailable (Cloudflare protection)');
      } else {
        console.warn('[BooruService] Autocomplete error:', result?.error);
      }
      return [];
    }

    // Tags come back as array
    const tags = result.tags as TagSuggestion[] | undefined;
    return tags || [];
  } catch (error) {
    console.warn('[BooruService] Autocomplete failed:', error);
    return [];
  }
}

/**
 * Normalize posts from different booru APIs to a common format
 */
function normalizePostsForSource(posts: RawPost[], source: SourceType): IBooruPost[] {
  return posts.map((post) => normalizePost(post, source));
}

/**
 * Normalize a single post to common format
 */
function normalizePost(post: RawPost, source: SourceType): IBooruPost {
  // Different boorus have different field names
  // Rule34/Gelbooru: file_url, sample_url, preview_url, tags (space-separated string)
  // Danbooru: file_url, large_file_url, preview_file_url, tag_string

  const fileUrl = post.file_url || post.large_file_url || '';
  const fileType = getFileType(fileUrl);

  const normalized: IBooruPost = {
    id: post.id,
    source,
    // URLs - use IBooruPost field names (camelCase)
    fileUrl,
    sampleUrl: post.sample_url || post.large_file_url || fileUrl,
    previewUrl: post.preview_url || post.preview_file_url || post.sample_url || '',
    // Dimensions
    width: post.width || post.image_width || 0,
    height: post.height || post.image_height || 0,
    // Tags - normalize to array
    tags: normalizeTagArray(post),
    // File type
    fileType,
    // Rating
    rating: normalizeRating(post.rating),
    // Score
    score: post.score ?? 0,
  };

  return normalized;
}

/**
 * Determine file type from URL
 */
function getFileType(url: string): 'image' | 'video' | 'gif' {
  const lower = url.toLowerCase();
  if (lower.endsWith('.mp4') || lower.endsWith('.webm')) {
    return 'video';
  }
  if (lower.endsWith('.gif')) {
    return 'gif';
  }
  return 'image';
}

/**
 * Extract tags as an array
 */
function normalizeTagArray(post: RawPost): string[] {
  // Danbooru uses tag_string (space-separated)
  if (typeof post.tag_string === 'string') {
    return post.tag_string.split(' ').filter(Boolean);
  }
  // Rule34/Gelbooru use tags (space-separated string)
  if (typeof post.tags === 'string') {
    return post.tags.split(' ').filter(Boolean);
  }
  // Some APIs return tags as array
  if (Array.isArray(post.tags)) {
    return post.tags;
  }
  return [];
}

/**
 * Normalize rating to consistent format
 */
function normalizeRating(rating: string | undefined): 'safe' | 'questionable' | 'explicit' {
  if (!rating) return 'explicit';

  const r = rating.toLowerCase();
  if (r === 's' || r === 'safe' || r === 'general' || r === 'g') {
    return 'safe';
  }
  if (r === 'q' || r === 'questionable' || r === 'sensitive') {
    return 'questionable';
  }
  return 'explicit';
}

/**
 * Get the display URL for a post (for opening in browser)
 */
export function getPostUrl(post: IBooruPost): string {
  const id = post.id;
  const source = post.source;

  switch (source) {
    case SOURCES.RULE34:
      return `https://rule34.xxx/index.php?page=post&s=view&id=${id}`;
    case SOURCES.GELBOORU:
      return `https://gelbooru.com/index.php?page=post&s=view&id=${id}`;
    case SOURCES.DANBOORU:
      return `https://danbooru.donmai.us/posts/${id}`;
    case SOURCES.AIBOORU:
      return `https://aibooru.online/posts/${id}`;
    default:
      return '';
  }
}

/**
 * Check if a post is a video
 */
export function isVideoPost(post: IBooruPost): boolean {
  return post.fileType === 'video';
}

/**
 * Get file extension from post
 */
export function getFileExtension(post: IBooruPost): string {
  const url = post.fileUrl || '';
  const match = url.match(/\.([a-zA-Z0-9]+)(?:\?|$)/);
  return match?.[1]?.toLowerCase() ?? '';
}
