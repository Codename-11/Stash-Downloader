/**
 * RedditService - Search and browse Reddit posts
 * Uses public Reddit JSON API (no authentication required)
 */

import type { IBooruPost } from '@/types';

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

interface RedditPost {
  id: string;
  title: string;
  author: string;
  subreddit: string;
  url: string;
  permalink: string;
  thumbnail: string;
  preview?: {
    images?: Array<{
      source?: { url?: string };
      resolutions?: Array<{ url?: string; width?: number; height?: number }>;
    }>;
  };
  is_video: boolean;
  is_gallery: boolean;
  post_hint?: string;
  score: number;
  num_comments: number;
  created_utc: number;
  over_18: boolean;
  domain: string;
}

interface RedditResponse {
  data: {
    after: string | null;
    children: Array<{
      data: RedditPost;
    }>;
  };
}

/**
 * Search Reddit posts using public JSON API
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

    let url: string;

    if (query) {
      // Search across Reddit or within subreddit
      const searchBase = subreddit
        ? `https://www.reddit.com/r/${subreddit}/search.json`
        : 'https://www.reddit.com/search.json';
      
      const searchParams = new URLSearchParams({
        q: query,
        sort: sort === 'top' || sort === 'new' ? sort : 'relevance',
        t: time,
        limit: String(limit),
        restrict_sr: subreddit ? 'true' : 'false',
      });

      if (after) searchParams.append('after', after);
      url = `${searchBase}?${searchParams}`;
    } else if (subreddit) {
      // Browse subreddit
      url = `https://www.reddit.com/r/${subreddit}/${sort}.json?limit=${limit}${time && sort === 'top' ? `&t=${time}` : ''}${after ? `&after=${after}` : ''}`;
    } else {
      // Browse r/all or front page
      url = `https://www.reddit.com/${sort}.json?limit=${limit}${time && sort === 'top' ? `&t=${time}` : ''}${after ? `&after=${after}` : ''}`;
    }

    log.debug('Fetching Reddit:', url);

    const response = await fetch(url, {
      headers: {
        'User-Agent': 'Stash-Browser/1.0',
      },
    });

    if (!response.ok) {
      throw new Error(`Reddit API returned ${response.status}`);
    }

    const data: RedditResponse = await response.json();

    // Convert Reddit posts to IBooruPost format
    const posts: IBooruPost[] = data.data.children
      .map(child => child.data)
      .filter(post => {
        // Filter out text posts and non-media content
        return post.post_hint === 'image' || 
               post.is_video || 
               post.is_gallery ||
               (post.url && (
                 post.url.match(/\.(jpg|jpeg|png|gif|webp)$/i) ||
                 post.url.includes('i.redd.it') ||
                 post.url.includes('v.redd.it')
               ));
      })
      .map(post => convertToIBooruPost(post));

    log.info(`Found ${posts.length} posts`);

    return {
      posts,
      after: data.data.after,
    };
  } catch (error) {
    log.error('Failed to search Reddit:', error instanceof Error ? error.message : String(error));
    throw error;
  }
}

/**
 * Convert Reddit post to IBooruPost format
 */
function convertToIBooruPost(post: RedditPost): IBooruPost {
  // Get best preview image
  let previewUrl = post.thumbnail && post.thumbnail.startsWith('http') ? post.thumbnail : '';
  let sampleUrl = post.url;
  let fileUrl = post.url;

  if (post.preview?.images?.[0]) {
    const preview = post.preview.images[0];
    
    // Get high quality preview (largest resolution)
    if (preview.resolutions && preview.resolutions.length > 0) {
      const largest = preview.resolutions[preview.resolutions.length - 1];
      if (largest && largest.url) {
        sampleUrl = decodeHTMLEntities(largest.url);
        if (!previewUrl) previewUrl = sampleUrl;
      }
    }
    
    // Get source image
    if (preview.source?.url) {
      fileUrl = decodeHTMLEntities(preview.source.url);
    }
  }

  // Determine file type
  let fileType: 'image' | 'video' | 'gif' = 'image';
  if (post.is_video) {
    fileType = 'video';
  } else if (post.url.match(/\.gif$/i)) {
    fileType = 'gif';
  }

  return {
    id: hashCode(post.id),
    source: 'reddit' as const,
    // Normalized fields
    previewUrl: previewUrl || '/placeholder.png',
    sampleUrl: sampleUrl,
    fileUrl: fileUrl,
    sourceUrl: `https://reddit.com${post.permalink}`,
    rating: post.over_18 ? 'explicit' as const : 'safe' as const,
    tags: [post.subreddit, `u/${post.author}`],
    score: post.score,
    width: 0,
    height: 0,
    fileType: fileType,
    createdAt: new Date(post.created_utc * 1000).toISOString(),
    // Reddit-specific fields
    title: post.title,
    author: post.author,
    subreddit: post.subreddit,
    is_video: post.is_video,
    is_gallery: post.is_gallery,
  };
}

/**
 * Decode HTML entities in Reddit URLs
 */
function decodeHTMLEntities(text: string): string {
  return text.replace(/&amp;/g, '&')
             .replace(/&lt;/g, '<')
             .replace(/&gt;/g, '>')
             .replace(/&quot;/g, '"')
             .replace(/&#x27;/g, "'");
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
 * Get direct link to Reddit post
 */
export function getRedditPostUrl(post: IBooruPost): string {
  return post.source || `https://reddit.com`;
}
