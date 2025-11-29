/**
 * BooruScraper - Scraper for image booru sites
 *
 * Supports multiple booru sites using an adapter pattern:
 * - Rule34.xxx (priority)
 * - Gelbooru.com
 * - SafeBooru.org
 * - Danbooru.donmai.us
 *
 * Features:
 * - Extracts full-size image URLs
 * - Maps booru tags to Stash entities (artist→performer, copyright→studio)
 * - Handles post IDs for deduplication
 * - Supports pools/galleries (Danbooru)
 */

import type { IMetadataScraper, IScrapedMetadata, IScraperCapabilities, IGalleryImage } from '@/types';
import { ContentType } from '@/types';
import { fetchWithTimeout, createLogger } from '@/utils';
import {
  type IBooruAdapter,
  type INormalizedBooruPost,
  Rule34Adapter,
  GelbooruAdapter,
  DanbooruAdapter,
} from './adapters';

const log = createLogger('BooruScraper');

export class BooruScraper implements IMetadataScraper {
  name = 'Booru';
  supportedDomains = [
    'rule34.xxx',
    'www.rule34.xxx',
    'gelbooru.com',
    'www.gelbooru.com',
    'safebooru.org',
    'www.safebooru.org',
    'danbooru.donmai.us',
    'www.danbooru.donmai.us',
  ];
  contentTypes = [ContentType.Image, ContentType.Gallery];

  private adapters: IBooruAdapter[] = [
    new Rule34Adapter(), // Priority: Rule34 first
    new GelbooruAdapter(),
    new DanbooruAdapter(),
  ];

  private readonly timeoutMs = 30000; // 30 seconds

  /**
   * Check if this scraper can handle the URL
   */
  canHandle(url: string): boolean {
    return this.findAdapter(url) !== null;
  }

  /**
   * Find the appropriate adapter for a URL
   */
  private findAdapter(url: string): IBooruAdapter | null {
    try {
      const urlObj = new URL(url);
      const hostname = urlObj.hostname.toLowerCase();

      for (const adapter of this.adapters) {
        if (adapter.domains.some(domain => hostname === domain || hostname === `www.${domain}`)) {
          return adapter;
        }
      }
      return null;
    } catch {
      return null;
    }
  }

  /**
   * Scrape metadata from a booru URL
   */
  async scrape(url: string): Promise<IScrapedMetadata> {
    const adapter = this.findAdapter(url);
    if (!adapter) {
      throw new Error(`No adapter found for URL: ${url}`);
    }

    log.info(`[Scraper] Using ${adapter.name} adapter for ${url}`);

    // Check if this is a pool/gallery URL
    if (adapter.parsePoolId && adapter.buildPoolApiUrl && adapter.parsePoolResponse) {
      const poolId = adapter.parsePoolId(url);
      if (poolId) {
        return this.scrapePool(adapter, url, poolId);
      }
    }

    // Single post
    const postId = adapter.parsePostId(url);
    if (!postId) {
      throw new Error(`Could not parse post ID from URL: ${url}`);
    }

    return this.scrapePost(adapter, url, postId);
  }

  /**
   * Scrape a single post
   */
  private async scrapePost(
    adapter: IBooruAdapter,
    url: string,
    postId: string
  ): Promise<IScrapedMetadata> {
    const apiUrl = adapter.buildApiUrl(postId);
    log.info(`[Scraper] Fetching post ${postId} from ${adapter.name}: ${apiUrl}`);

    const response = await this.fetchJson(apiUrl);
    const post = adapter.parseResponse(response);

    return this.convertToMetadata(post, url, adapter.name);
  }

  /**
   * Scrape a pool/gallery
   */
  private async scrapePool(
    adapter: IBooruAdapter,
    url: string,
    poolId: string
  ): Promise<IScrapedMetadata> {
    if (!adapter.buildPoolApiUrl || !adapter.parsePoolResponse) {
      throw new Error(`${adapter.name} adapter does not support pools`);
    }

    const poolApiUrl = adapter.buildPoolApiUrl(poolId);
    log.info(`[Scraper] Fetching pool ${poolId} from ${adapter.name}: ${poolApiUrl}`);

    const poolResponse = await this.fetchJson(poolApiUrl);
    const postIds = adapter.parsePoolResponse(poolResponse);

    if (postIds.length === 0) {
      throw new Error(`Pool ${poolId} is empty or not found`);
    }

    log.info(`[Scraper] Pool ${poolId} contains ${postIds.length} posts`);

    // Fetch first post for main metadata
    const firstPostId = postIds[0]!;
    const firstPost = await this.fetchPost(adapter, firstPostId);

    // Fetch all posts for gallery images
    const galleryImages: IGalleryImage[] = [];
    for (let i = 0; i < postIds.length; i++) {
      const postId = postIds[i]!;
      try {
        const post = i === 0 ? firstPost : await this.fetchPost(adapter, postId);
        galleryImages.push({
          url: post.fileUrl,
          thumbnailUrl: post.previewUrl || post.sampleUrl,
          filename: `${adapter.name.toLowerCase()}_${post.id}.${post.fileExt ?? 'jpg'}`,
          width: post.width,
          height: post.height,
          order: i,
        });
      } catch (error) {
        log.warn(`[Scraper] Failed to fetch pool post ${postId}: ${error}`);
      }
    }

    const metadata = this.convertToMetadata(firstPost, url, adapter.name);
    metadata.contentType = ContentType.Gallery;
    metadata.galleryImages = galleryImages;
    metadata.title = `${adapter.name} Pool #${poolId}`;

    return metadata;
  }

  /**
   * Fetch a single post by ID
   */
  private async fetchPost(adapter: IBooruAdapter, postId: string): Promise<INormalizedBooruPost> {
    const apiUrl = adapter.buildApiUrl(postId);
    const response = await this.fetchJson(apiUrl);
    return adapter.parseResponse(response);
  }

  /**
   * Fetch JSON from API URL (with CORS proxy if needed)
   */
  private async fetchJson(apiUrl: string): Promise<unknown> {
    const fetchUrl = this.wrapWithProxy(apiUrl);

    const response = await fetchWithTimeout(
      fetchUrl,
      {
        headers: {
          Accept: 'application/json',
          'User-Agent': 'StashDownloader/1.0',
        },
      },
      this.timeoutMs
    );

    if (!response.ok) {
      throw new Error(`API request failed: ${response.status} ${response.statusText}`);
    }

    return response.json();
  }

  /**
   * Wrap URL with CORS proxy if enabled
   */
  private wrapWithProxy(url: string): string {
    if (typeof window === 'undefined') return url;

    const corsEnabled = localStorage.getItem('corsProxyEnabled') === 'true';
    if (!corsEnabled) return url;

    const proxyUrl = localStorage.getItem('corsProxyUrl') || 'http://localhost:8080';
    return `${proxyUrl}/${url}`;
  }

  /**
   * Convert normalized booru post to IScrapedMetadata
   */
  private convertToMetadata(
    post: INormalizedBooruPost,
    url: string,
    source: string
  ): IScrapedMetadata {
    // Extract artist tags as performers
    const artists = post.tags.filter(t => t.type === 'artist').map(t => this.formatTag(t.name));

    // Extract character tags
    const characters = post.tags.filter(t => t.type === 'character').map(t => this.formatTag(t.name));

    // Extract general tags
    const generalTags = post.tags.filter(t => t.type === 'general').map(t => this.formatTag(t.name));

    // Extract copyright tags (first one becomes studio)
    const copyrights = post.tags.filter(t => t.type === 'copyright').map(t => this.formatTag(t.name));

    // Combine tags (general + character)
    const tags = [...generalTags, ...characters];

    // Generate title from post metadata
    const title = this.generateTitle(post, source, artists, characters);

    // Build capabilities based on what we extracted
    const capabilities: IScraperCapabilities = {
      hasPerformers: artists.length > 0,
      hasTags: tags.length > 0,
      hasStudio: copyrights.length > 0,
      hasRating: true,
    };

    log.info(`[Scraper] Extracted: ${artists.length} artists, ${tags.length} tags, ${copyrights.length} copyrights`);

    return {
      url,
      imageUrl: post.fileUrl,
      thumbnailUrl: post.previewUrl || post.sampleUrl,
      title,
      performers: artists.length > 0 ? artists : undefined,
      tags: tags.length > 0 ? tags : undefined,
      studio: copyrights.length > 0 ? copyrights[0] : undefined,
      contentType: ContentType.Image,
      sourceId: post.id,
      sourceRating: post.rating,
      sourceScore: post.score,
      artist: artists[0],
      capabilities,
    };
  }

  /**
   * Format booru tag for display
   * Converts underscore-separated tags to readable format
   */
  private formatTag(tag: string): string {
    return tag
      .replace(/_/g, ' ')
      .replace(/\(.*?\)/g, '') // Remove parenthetical notes
      .trim();
  }

  /**
   * Generate a meaningful title from post metadata
   */
  private generateTitle(
    post: INormalizedBooruPost,
    source: string,
    artists: string[],
    characters: string[]
  ): string {
    const parts: string[] = [];

    // Add characters (max 2)
    if (characters.length > 0) {
      parts.push(characters.slice(0, 2).join(', '));
    }

    // Add artist attribution
    if (artists.length > 0) {
      const artistPart = artists.length > 1 ? `${artists[0]} et al.` : artists[0];
      parts.push(`by ${artistPart}`);
    }

    // If we have parts, join them
    if (parts.length > 0) {
      return parts.join(' ');
    }

    // Fallback: source + post ID
    return `${source} #${post.id}`;
  }
}
