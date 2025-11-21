/**
 * PornhubScraper - Specialized scraper for Pornhub
 *
 * Extracts metadata specific to Pornhub including:
 * - Title
 * - Performers (pornstars)
 * - Tags/categories
 * - Description
 * - Duration
 * - Upload date
 * - Thumbnail
 */

import type { IMetadataScraper, IScrapedMetadata, ContentType } from '@/types';

export class PornhubScraper implements IMetadataScraper {
  name = 'Pornhub';
  supportedDomains = ['pornhub.com', 'www.pornhub.com'];

  canHandle(url: string): boolean {
    try {
      const urlObj = new URL(url);
      return this.supportedDomains.includes(urlObj.hostname.toLowerCase());
    } catch {
      return false;
    }
  }

  async scrape(url: string): Promise<IScrapedMetadata> {
    console.log('[PornhubScraper] Fetching page:', url);

    try {
      const html = await this.fetchHTML(url);
      const metadata = this.parseHTML(html, url);

      console.log('[PornhubScraper] Extracted metadata:', metadata);
      return metadata;
    } catch (error) {
      console.error('[PornhubScraper] Failed to scrape:', error);

      return {
        url,
        title: 'Pornhub Video',
        contentType: 'video' as ContentType,
      };
    }
  }

  /**
   * Fetch HTML from URL (uses CORS proxy if enabled)
   */
  private async fetchHTML(url: string): Promise<string> {
    const fetchUrl = this.wrapWithProxyIfEnabled(url);

    const response = await fetch(fetchUrl, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
      },
    });

    if (!response.ok) {
      throw new Error(`Failed to fetch: ${response.statusText}`);
    }

    return await response.text();
  }

  /**
   * Wrap URL with CORS proxy if enabled
   */
  private wrapWithProxyIfEnabled(url: string): string {
    if (typeof window === 'undefined') return url;

    const corsEnabled = localStorage.getItem('corsProxyEnabled') === 'true';
    if (!corsEnabled) return url;

    const proxyUrl = localStorage.getItem('corsProxyUrl') || 'http://localhost:8080';
    return `${proxyUrl}/${url}`;
  }

  /**
   * Parse HTML and extract Pornhub-specific metadata
   */
  private parseHTML(html: string, url: string): IScrapedMetadata {
    const parser = new DOMParser();
    const doc = parser.parseFromString(html, 'text/html');

    const metadata: IScrapedMetadata = {
      url,
      contentType: 'video' as ContentType,
    };

    // Title
    metadata.title = this.extractTitle(doc);

    // Performers (pornstars)
    metadata.performers = this.extractPerformers(doc);

    // Tags
    metadata.tags = this.extractTags(doc);

    // Description
    metadata.description = this.extractDescription(doc);

    // Duration
    metadata.duration = this.extractDuration(doc);

    // Thumbnail
    metadata.thumbnailUrl = this.extractThumbnail(doc);

    // Upload date
    metadata.date = this.extractDate(doc);

    // Video URL (actual video file)
    metadata.videoUrl = this.extractVideoUrl(html, doc);

    return metadata;
  }

  /**
   * Extract actual video URL from page
   */
  private extractVideoUrl(html: string, doc: Document): string | undefined {
    try {
      // Pornhub embeds video URLs in JavaScript variables
      // Look for mediaDefinitions or flashvars

      // Method 1: Look for mediaDefinitions in script tags
      const scriptMatch = html.match(/var\s+mediaDefinitions\s*=\s*(\[.*?\]);/s);
      if (scriptMatch) {
        const mediaDefinitions = JSON.parse(scriptMatch[1]);

        // Find highest quality video
        const videos = mediaDefinitions
          .filter((def: any) => def.format === 'mp4')
          .sort((a: any, b: any) => {
            const qualityA = parseInt(a.quality) || 0;
            const qualityB = parseInt(b.quality) || 0;
            return qualityB - qualityA;
          });

        if (videos.length > 0 && videos[0].videoUrl) {
          console.log('[PornhubScraper] Found video URL:', videos[0].videoUrl);
          return videos[0].videoUrl;
        }
      }

      // Method 2: Look for flashvars
      const flashvarsMatch = html.match(/var\s+flashvars[^=]*=\s*(\{.*?\});/s);
      if (flashvarsMatch) {
        const flashvars = JSON.parse(flashvarsMatch[1]);

        if (flashvars.mediaDefinitions) {
          const defs = typeof flashvars.mediaDefinitions === 'string'
            ? JSON.parse(flashvars.mediaDefinitions)
            : flashvars.mediaDefinitions;

          const videos = defs
            .filter((def: any) => def.format === 'mp4')
            .sort((a: any, b: any) => {
              const qualityA = parseInt(a.quality) || 0;
              const qualityB = parseInt(b.quality) || 0;
              return qualityB - qualityA;
            });

          if (videos.length > 0 && videos[0].videoUrl) {
            console.log('[PornhubScraper] Found video URL from flashvars:', videos[0].videoUrl);
            return videos[0].videoUrl;
          }
        }
      }

      // Method 3: Look for video tags (backup)
      const videoElement = doc.querySelector('video source');
      if (videoElement) {
        const src = videoElement.getAttribute('src');
        if (src) {
          console.log('[PornhubScraper] Found video URL from video element:', src);
          return src;
        }
      }

      console.warn('[PornhubScraper] Could not find video URL in page');
      return undefined;
    } catch (error) {
      console.error('[PornhubScraper] Error extracting video URL:', error);
      return undefined;
    }
  }

  /**
   * Extract video title
   */
  private extractTitle(doc: Document): string {
    // Try multiple selectors
    const selectors = [
      'h1.title > span',
      'h1.title',
      'div.video-wrapper h1',
      'meta[property="og:title"]',
    ];

    for (const selector of selectors) {
      const element = doc.querySelector(selector);
      if (element) {
        const content = selector.includes('meta')
          ? element.getAttribute('content')
          : element.textContent;

        if (content) {
          return content.trim().replace(' - Pornhub.com', '');
        }
      }
    }

    return 'Pornhub Video';
  }

  /**
   * Extract performers/pornstars
   */
  private extractPerformers(doc: Document): string[] {
    const performers: string[] = [];

    // Try multiple selectors
    const selectors = [
      '.pornstarsWrapper a.pstar-list-btn',
      'div.pornstarsWrapper a',
      'a[data-mxptype="Pornstar"]',
    ];

    for (const selector of selectors) {
      const elements = doc.querySelectorAll(selector);
      elements.forEach(el => {
        const name = el.textContent?.trim();
        if (name && !performers.includes(name)) {
          performers.push(name);
        }
      });
    }

    return performers;
  }

  /**
   * Extract tags/categories
   */
  private extractTags(doc: Document): string[] {
    const tags: string[] = [];

    // Try multiple selectors
    const selectors = [
      'div.categoriesWrapper a',
      'div.video-info-row a[data-mxptype="Category"]',
      '.tagsWrapper a.item',
    ];

    for (const selector of selectors) {
      const elements = doc.querySelectorAll(selector);
      elements.forEach(el => {
        const tag = el.textContent?.trim();
        if (tag && !tags.includes(tag)) {
          tags.push(tag);
        }
      });
    }

    return tags;
  }

  /**
   * Extract description
   */
  private extractDescription(doc: Document): string | undefined {
    const selectors = [
      'meta[property="og:description"]',
      'div.video-detailed-info',
      'span.description',
    ];

    for (const selector of selectors) {
      const element = doc.querySelector(selector);
      if (element) {
        const content = selector.includes('meta')
          ? element.getAttribute('content')
          : element.textContent;

        if (content) {
          return content.trim();
        }
      }
    }

    return undefined;
  }

  /**
   * Extract duration in seconds
   */
  private extractDuration(doc: Document): number | undefined {
    // Try meta tag
    const durationMeta = doc.querySelector('meta[property="video:duration"]');
    if (durationMeta) {
      const seconds = parseInt(durationMeta.getAttribute('content') || '', 10);
      if (!isNaN(seconds)) return seconds;
    }

    // Try duration display (e.g., "12:34")
    const durationText = doc.querySelector('.duration')?.textContent?.trim();
    if (durationText) {
      const parts = durationText.split(':').map(p => parseInt(p, 10));
      if (parts.length === 2) {
        return parts[0] * 60 + parts[1]; // MM:SS
      } else if (parts.length === 3) {
        return parts[0] * 3600 + parts[1] * 60 + parts[2]; // HH:MM:SS
      }
    }

    return undefined;
  }

  /**
   * Extract thumbnail URL
   */
  private extractThumbnail(doc: Document): string | undefined {
    const selectors = [
      'meta[property="og:image"]',
      'meta[name="twitter:image"]',
      'link[rel="image_src"]',
    ];

    for (const selector of selectors) {
      const element = doc.querySelector(selector);
      if (element) {
        const content = element.getAttribute('content') || element.getAttribute('href');
        if (content) return content;
      }
    }

    return undefined;
  }

  /**
   * Extract upload date
   */
  private extractDate(doc: Document): string | undefined {
    // Try various date selectors
    const dateSelectors = [
      '.video-upload-date',
      '.date',
      'meta[property="uploadDate"]',
    ];

    for (const selector of dateSelectors) {
      const element = doc.querySelector(selector);
      if (element) {
        const dateText = selector.includes('meta')
          ? element.getAttribute('content')
          : element.textContent;

        if (dateText) {
          try {
            // Parse and format as YYYY-MM-DD
            const date = new Date(dateText.trim());
            if (!isNaN(date.getTime())) {
              return date.toISOString().split('T')[0];
            }
          } catch {
            // Ignore parse errors
          }
        }
      }
    }

    return undefined;
  }
}
