/**
 * RedditService - Search and browse Reddit posts
 * Uses Python backend to bypass CSP restrictions
 */

import type { IBooruPost } from '@/types';
import { PLUGIN_ID } from '@/constants';

const log = {
  debug: (msg: string, ...args: unknown[]) => console.log(`[RedditService] ${msg}`, ...args),
  info: (msg: string, ...args: unknown[]) => console.info(`[RedditService] ${msg}`, ...args),
  error: (msg: string, ...args: unknown[]) => console.error(`[RedditService] ${msg}`, ...args),
};

export interface RedditSearchParams {
  subreddit?: string;      // r/pics, r/videos, etc.
  query?: string;          // Search query
  sort?: 'hot' | 'new' | 'top' | 'rising';
  time?: 'hour' | 'day' | 'week' | 'month' | 'year' | 'all';
  limit?: number;
  after?: string;          // Pagination cursor
}

interface PluginOperationResult {
  success?: boolean;
  error?: string;
  posts?: unknown[];
  after?: string | null;
  suggestions?: string[];
  [key: string]: unknown;
}

/**
 * Helper to call plugin operations
 */
async function runPluginOperation(args: Record<string, unknown>): Promise<PluginOperationResult | null> {
  const mutation = `
    mutation RunPluginOperation($plugin_id: ID!, $args: Map) {
      runPluginOperation(plugin_id: $plugin_id, args: $args)
    }
  `;

  const apiKey = localStorage.getItem('apiKey');

  const response = await fetch('/graphql', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      ...(apiKey ? { Authorization: `Bearer ${apiKey}` } : {}),
    },
    body: JSON.stringify({
      query: mutation,
      variables: {
        plugin_id: PLUGIN_ID,
        args,
      },
    }),
  });

  if (!response.ok) {
    throw new Error(`GraphQL request failed: ${response.status}`);
  }

  const result = await response.json();

  if (result.errors && result.errors.length > 0) {
    throw new Error(result.errors[0].message);
  }

  return result.data?.runPluginOperation || null;
}

/**
 * Search Reddit posts via Python backend (bypasses CSP)
 */
export async function searchReddit(params: RedditSearchParams): Promise<{
  posts: IBooruPost[];
  after: string | null;
}> {
  try {
    const {
      subreddit,
      query,
      sort = 'hot',
      time = 'all',
      limit = 40,
      after,
    } = params;

    // Build search query
    let searchQuery = '';
    if (subreddit) {
      searchQuery = subreddit.startsWith('r/') ? subreddit : `r/${subreddit}`;
    } else if (query) {
      searchQuery = query;
    }

    log.debug('Searching Reddit via backend:', { searchQuery, sort, time, limit });

    // Use Python backend to bypass CSP
    const result = await runPluginOperation({
      mode: 'search',
      source: 'reddit',
      tags: searchQuery,
      sort,
      time,
      limit,
      after,
    });

    if (!result || !result.success) {
      throw new Error(result?.error || 'Reddit search failed');
    }

    // Convert backend response to IBooruPost format
    const backendPosts = (result.posts || []) as Array<Record<string, unknown>>;
    const posts: IBooruPost[] = backendPosts.map((post) => ({
      id: hashCode(String(post.id || '')),
      source: 'reddit' as const,
      previewUrl: String(post.preview_image || post.thumbnail || '/placeholder.png'),
      sampleUrl: String(post.url || ''),
      fileUrl: String(post.url || ''),
      sourceUrl: String(post.permalink || ''),
      rating: post.over_18 ? 'explicit' as const : 'safe' as const,
      tags: [String(post.subreddit || ''), `u/${post.author || ''}`],
      score: Number(post.score || 0),
      width: 0,
      height: 0,
      fileType: post.is_video ? 'video' as const : 'image' as const,
      createdAt: new Date(Number(post.created_utc || 0) * 1000).toISOString(),
      title: String(post.title || ''),
      author: String(post.author || ''),
      subreddit: String(post.subreddit || ''),
    }));

    log.info(`Found ${posts.length} Reddit posts`);

    return {
      posts,
      after: result.after || null,
    };
  } catch (error) {
    log.error('Failed to search Reddit:', error instanceof Error ? error.message : String(error));
    throw error;
  }
}

/**
 * Convert string to hash code (for ID)
 */
function hashCode(str: string): number {
  let hash = 0;
  for (let i = 0; i < str.length; i++) {
    const char = str.charCodeAt(i);
    hash = ((hash << 5) - hash) + char;
    hash = hash & hash; // Convert to 32bit integer
  }
  return Math.abs(hash);
}

/**
 * Search subreddit names for autocomplete
 */
export async function searchSubreddits(query: string): Promise<string[]> {
  try {
    // Use Reddit's subreddit search API via Python backend
    const result = await runPluginOperation({
      mode: 'autocomplete_subreddits',
      source: 'reddit',
      query,
      limit: 10,
    });

    if (!result || !result.success) {
      return [];
    }

    return result.suggestions || [];
  } catch (error) {
    log.error('Subreddit autocomplete failed:', error);
    return [];
  }
}

/**
 * Get direct link to Reddit post
 */
export function getRedditPostUrl(post: IBooruPost): string {
  return post.sourceUrl || `https://reddit.com`;
}
