/**
 * GelbooruAdapter - Adapter for gelbooru.com
 *
 * Gelbooru is one of the largest booru sites and uses a standardized API.
 * Post URL: https://gelbooru.com/index.php?page=post&s=view&id=XXXXX
 * API URL: https://gelbooru.com/index.php?page=dapi&s=post&q=index&json=1&id=XXXXX
 *
 * Also works for SafeBooru (safebooru.org) which uses the same API format.
 */

import type { IBooruAdapter, INormalizedBooruPost, IBooruTag } from './types';

export class GelbooruAdapter implements IBooruAdapter {
  name = 'Gelbooru';
  domains = ['gelbooru.com', 'www.gelbooru.com', 'safebooru.org', 'www.safebooru.org'];

  parsePostId(url: string): string | null {
    try {
      const urlObj = new URL(url);
      // URL format: index.php?page=post&s=view&id=XXXXX
      const id = urlObj.searchParams.get('id');
      const page = urlObj.searchParams.get('page');
      const s = urlObj.searchParams.get('s');

      if (page === 'post' && s === 'view' && id) {
        return id;
      }
      return null;
    } catch {
      return null;
    }
  }

  buildApiUrl(postId: string): string {
    // Gelbooru API returns JSON when json=1 is specified
    // Note: For cross-site requests, we'll need to use the original site's domain
    return `https://gelbooru.com/index.php?page=dapi&s=post&q=index&json=1&id=${postId}`;
  }

  parseResponse(data: unknown): INormalizedBooruPost {
    // Gelbooru API can return different formats:
    // 1. { post: [...] } - newer format
    // 2. { "@attributes": {...}, "post": [...] } - XML-like format
    // 3. [...] - direct array (some endpoints)
    let posts: Array<Record<string, unknown>>;

    if (Array.isArray(data)) {
      posts = data;
    } else if (typeof data === 'object' && data !== null) {
      const obj = data as Record<string, unknown>;
      if (Array.isArray(obj.post)) {
        posts = obj.post;
      } else if (obj.post && typeof obj.post === 'object') {
        posts = [obj.post as Record<string, unknown>];
      } else {
        throw new Error('Unexpected Gelbooru response format');
      }
    } else {
      throw new Error('Invalid Gelbooru response');
    }

    if (posts.length === 0) {
      throw new Error('No post found in Gelbooru response');
    }

    const post = posts[0]!;

    // Parse tags - Gelbooru provides tags as a space-separated string
    const tagString = String(post['tags'] ?? '');
    const tags: IBooruTag[] = tagString
      .split(' ')
      .filter((t: string) => t.trim())
      .map((t: string) => ({
        name: t.trim(),
        type: 'general' as const, // Gelbooru API doesn't provide tag types in basic response
      }));

    // Determine file extension from URL
    const fileUrl = String(post['file_url'] ?? '');
    const fileExt = fileUrl.split('.').pop()?.toLowerCase() ?? 'jpg';

    return {
      id: String(post['id']),
      fileUrl: fileUrl,
      previewUrl: String(post['preview_url'] ?? ''),
      sampleUrl: String(post['sample_url'] ?? ''),
      tags,
      rating: this.normalizeRating(String(post['rating'] ?? 'e')),
      score: typeof post['score'] === 'number' ? post['score'] : parseInt(String(post['score'])) || 0,
      source: String(post['source'] ?? ''),
      width: typeof post['width'] === 'number' ? post['width'] : parseInt(String(post['width'])) || undefined,
      height: typeof post['height'] === 'number' ? post['height'] : parseInt(String(post['height'])) || undefined,
      createdAt: String(post['created_at'] ?? ''),
      fileExt,
    };
  }

  /**
   * Normalize rating to human-readable format
   * Gelbooru uses: general, safe, sensitive, questionable, explicit
   */
  private normalizeRating(rating: string): string {
    const r = rating.toLowerCase();
    switch (r) {
      case 's':
      case 'safe':
        return 'safe';
      case 'g':
      case 'general':
        return 'safe';
      case 'sensitive':
        return 'questionable';
      case 'q':
      case 'questionable':
        return 'questionable';
      case 'e':
      case 'explicit':
        return 'explicit';
      default:
        return rating;
    }
  }

  // Pool support
  parsePoolId(url: string): string | null {
    try {
      const urlObj = new URL(url);
      // Pool URL: index.php?page=pool&s=show&id=XXXXX
      const id = urlObj.searchParams.get('id');
      const page = urlObj.searchParams.get('page');
      const s = urlObj.searchParams.get('s');

      if (page === 'pool' && s === 'show' && id) {
        return id;
      }
      return null;
    } catch {
      return null;
    }
  }
}
