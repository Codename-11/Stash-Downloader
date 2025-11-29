/**
 * Rule34Adapter - Adapter for rule34.xxx
 *
 * Rule34 uses a Gelbooru-style API.
 * Post URL: https://rule34.xxx/index.php?page=post&s=view&id=XXXXX
 * API URL: https://rule34.xxx/index.php?page=dapi&s=post&q=index&json=1&id=XXXXX
 */

import type { IBooruAdapter, INormalizedBooruPost, IBooruTag } from './types';

export class Rule34Adapter implements IBooruAdapter {
  name = 'Rule34';
  domains = ['rule34.xxx', 'www.rule34.xxx'];

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
    // Rule34 API returns JSON when json=1 is specified
    return `https://rule34.xxx/index.php?page=dapi&s=post&q=index&json=1&id=${postId}`;
  }

  parseResponse(data: unknown): INormalizedBooruPost {
    // Rule34 API returns an array of posts
    // Format: [{ id, file_url, preview_url, sample_url, tags, rating, score, ... }]
    const posts = data as Array<Record<string, unknown>>;
    if (!Array.isArray(posts) || posts.length === 0) {
      throw new Error('No post found in Rule34 response');
    }

    const post = posts[0]!;

    // Parse tags - Rule34 provides tags as a space-separated string
    // Unfortunately, Rule34 doesn't provide tag types in the basic API
    const tagString = String(post['tags'] ?? '');
    const tags: IBooruTag[] = tagString
      .split(' ')
      .filter((t: string) => t.trim())
      .map((t: string) => ({
        name: t.trim(),
        type: 'general' as const, // Rule34 API doesn't provide tag types
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
      fileExt,
    };
  }

  /**
   * Normalize rating to human-readable format
   * Rule34 uses: s (safe), q (questionable), e (explicit)
   */
  private normalizeRating(rating: string): string {
    switch (rating.toLowerCase()) {
      case 's':
        return 'safe';
      case 'q':
        return 'questionable';
      case 'e':
        return 'explicit';
      default:
        return rating;
    }
  }

  // Pool support (Rule34 has pools but API is limited)
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
