/**
 * RedditImportService - Fetches saved/upvoted posts from Reddit
 * 
 * Uses Python PRAW library via backend to access Reddit API.
 * Requires Reddit API credentials to be configured in settings.
 */

import { getStashService } from '@/services/stash/StashGraphQLService';
import { createLogger } from '@/utils';
import { PLUGIN_ID } from '@/constants';

const log = createLogger('RedditImportService');

interface PrawCheckResponse {
  available: boolean;
  success: boolean;
}

interface RedditFetchResponse {
  success: boolean;
  posts: RedditPost[];
  count: number;
  post_type: string;
  error?: string;
}

export interface RedditPost {
  id: string;
  title: string;
  url: string;
  permalink: string;
  subreddit: string;
  author: string;
  created_utc: number;
  score: number;
  is_video: boolean;
  is_gallery: boolean;
  selftext?: string;
  post_hint?: string | null;
  domain: string;
  num_comments: number;
  over_18: boolean;
  preview_image?: string;
  thumbnail?: string;
}

export interface RedditImportResult {
  success: boolean;
  posts: RedditPost[];
  count: number;
  post_type: string;
  error?: string;
}

export interface RedditCredentials {
  clientId: string;
  clientSecret: string;
  username: string;
  password: string;
}

export class RedditImportService {
  private prawAvailable: boolean | null = null;

  /**
   * Check if PRAW is installed on the system
   */
  async checkPrawAvailable(): Promise<boolean> {
    if (this.prawAvailable !== null) {
      return this.prawAvailable;
    }

    try {
      const stashService = getStashService();
      const result = await stashService.runPluginOperation(PLUGIN_ID, {
        mode: 'check_praw',
      });

      this.prawAvailable = (result?.data as PrawCheckResponse | undefined)?.available === true;
      return this.prawAvailable;
    } catch (error) {
      log.error('Failed to check PRAW availability:', error instanceof Error ? error.message : String(error));
      this.prawAvailable = false;
      return false;
    }
  }

  /**
   * Fetch saved or upvoted posts from Reddit
   */
  async fetchPosts(
    credentials: RedditCredentials,
    postType: 'saved' | 'upvoted',
    limit: number = 100
  ): Promise<RedditImportResult> {
    try {
      // Check if PRAW is available
      const prawAvailable = await this.checkPrawAvailable();
      if (!prawAvailable) {
        return {
          success: false,
          posts: [],
          count: 0,
          post_type: postType,
          error: 'PRAW is not installed. Please install it with: pip install praw',
        };
      }

      // Validate credentials
      if (!credentials.clientId || !credentials.clientSecret || 
          !credentials.username || !credentials.password) {
        return {
          success: false,
          posts: [],
          count: 0,
          post_type: postType,
          error: 'Reddit API credentials are incomplete. Please configure them in settings.',
        };
      }

      log.info(`Fetching ${postType} posts for u/${credentials.username}...`);

      const stashService = getStashService();
      const taskResult = await stashService.runPluginOperation(PLUGIN_ID, {
        mode: 'fetch_posts',
        client_id: credentials.clientId,
        client_secret: credentials.clientSecret,
        username: credentials.username,
        password: credentials.password,
        post_type: postType,
        limit: limit,
      });

      const result = taskResult?.data as RedditFetchResponse | undefined;

      if (!result || result.success === false) {
        const error = result?.error || 'Unknown error fetching Reddit posts';
        log.error('Reddit fetch failed:', error);
        return {
          success: false,
          posts: [],
          count: 0,
          post_type: postType,
          error: error,
        };
      }

      log.info(`Successfully fetched ${result.count || 0} ${postType} posts`);

      return {
        success: true,
        posts: result.posts || [],
        count: result.count || 0,
        post_type: postType,
      };
    } catch (error) {
      const errorMsg = error instanceof Error ? error.message : String(error);
      log.error('Failed to fetch Reddit posts:', errorMsg);
      return {
        success: false,
        posts: [],
        count: 0,
        post_type: postType,
        error: errorMsg,
      };
    }
  }

  /**
   * Get Reddit post URLs from the fetched posts
   */
  getPostUrls(posts: RedditPost[]): string[] {
    return posts.map(post => post.permalink);
  }

  /**
   * Filter posts by content type
   */
  filterPostsByType(posts: RedditPost[], contentType: 'video' | 'image' | 'gallery' | 'all'): RedditPost[] {
    if (contentType === 'all') {
      return posts;
    }

    return posts.filter(post => {
      if (contentType === 'video') {
        return post.is_video;
      } else if (contentType === 'gallery') {
        return post.is_gallery;
      } else if (contentType === 'image') {
        // Images are posts that aren't videos or galleries
        return !post.is_video && !post.is_gallery && 
               (post.post_hint === 'image' || post.url.match(/\.(jpg|jpeg|png|gif|webp)$/i));
      }
      return false;
    });
  }
}

// Singleton instance
let instance: RedditImportService | null = null;

export function getRedditImportService(): RedditImportService {
  if (!instance) {
    instance = new RedditImportService();
  }
  return instance;
}
