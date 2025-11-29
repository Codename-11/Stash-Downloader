/**
 * DanbooruAdapter - Adapter for danbooru.donmai.us
 *
 * Danbooru has a clean REST API with typed tags.
 * Post URL: https://danbooru.donmai.us/posts/XXXXX
 * API URL: https://danbooru.donmai.us/posts/XXXXX.json
 *
 * Danbooru provides tag types in the API response, making it the best source for
 * accurate artist/character/copyright tag classification.
 */

import type { IBooruAdapter, INormalizedBooruPost, IBooruTag } from './types';

export class DanbooruAdapter implements IBooruAdapter {
  name = 'Danbooru';
  domains = ['danbooru.donmai.us', 'www.danbooru.donmai.us'];

  parsePostId(url: string): string | null {
    try {
      const urlObj = new URL(url);
      // URL format: /posts/XXXXX or /posts/XXXXX?...
      const match = urlObj.pathname.match(/\/posts\/(\d+)/);
      return match ? match[1]! : null;
    } catch {
      return null;
    }
  }

  buildApiUrl(postId: string): string {
    return `https://danbooru.donmai.us/posts/${postId}.json`;
  }

  parseResponse(data: unknown): INormalizedBooruPost {
    const post = data as Record<string, unknown>;

    if (!post || typeof post !== 'object') {
      throw new Error('Invalid Danbooru response');
    }

    if (post.success === false || post.error) {
      throw new Error(String(post.error) || 'Danbooru API error');
    }

    // Parse typed tags from Danbooru's tag_string_* fields
    const tags: IBooruTag[] = [
      ...this.parseTagString(String(post.tag_string_general || ''), 'general'),
      ...this.parseTagString(String(post.tag_string_artist || ''), 'artist'),
      ...this.parseTagString(String(post.tag_string_character || ''), 'character'),
      ...this.parseTagString(String(post.tag_string_copyright || ''), 'copyright'),
      ...this.parseTagString(String(post.tag_string_meta || ''), 'meta'),
    ];

    // Danbooru uses file_url for original, large_file_url for sample
    const fileUrl = String(post.file_url || post.large_file_url || '');
    const fileExt = String(post.file_ext || fileUrl.split('.').pop() || 'jpg');

    return {
      id: String(post.id),
      fileUrl: fileUrl,
      previewUrl: String(post.preview_file_url || ''),
      sampleUrl: String(post.large_file_url || ''),
      tags,
      rating: this.normalizeRating(String(post.rating || 'e')),
      score: typeof post.score === 'number' ? post.score : parseInt(String(post.score)) || 0,
      source: String(post.source || ''),
      width: typeof post.image_width === 'number' ? post.image_width : parseInt(String(post.image_width)) || undefined,
      height: typeof post.image_height === 'number' ? post.image_height : parseInt(String(post.image_height)) || undefined,
      createdAt: String(post.created_at || ''),
      fileExt,
    };
  }

  /**
   * Parse space-separated tag string into typed tags
   */
  private parseTagString(tagString: string, type: IBooruTag['type']): IBooruTag[] {
    return tagString
      .split(' ')
      .filter(t => t.trim())
      .map(t => ({ name: t.trim(), type }));
  }

  /**
   * Normalize rating to human-readable format
   * Danbooru uses: g (general), s (sensitive), q (questionable), e (explicit)
   */
  private normalizeRating(rating: string): string {
    switch (rating.toLowerCase()) {
      case 'g':
        return 'safe';
      case 's':
        return 'sensitive';
      case 'q':
        return 'questionable';
      case 'e':
        return 'explicit';
      default:
        return rating;
    }
  }

  // Pool support for Danbooru
  parsePoolId(url: string): string | null {
    try {
      const urlObj = new URL(url);
      // Pool URL: /pools/XXXXX
      const match = urlObj.pathname.match(/\/pools\/(\d+)/);
      return match ? match[1]! : null;
    } catch {
      return null;
    }
  }

  buildPoolApiUrl(poolId: string): string {
    return `https://danbooru.donmai.us/pools/${poolId}.json`;
  }

  parsePoolResponse(data: unknown): string[] {
    const pool = data as Record<string, unknown>;
    if (!pool || typeof pool !== 'object') {
      return [];
    }
    // Pool contains post_ids array
    const postIds = pool.post_ids;
    if (Array.isArray(postIds)) {
      return postIds.map(id => String(id));
    }
    return [];
  }
}
