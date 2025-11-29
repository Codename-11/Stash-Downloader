/**
 * HTMLScraper - Fetches HTML and extracts metadata from meta tags
 *
 * This scraper works by:
 * 1. Fetching the HTML page (via CORS proxy if enabled)
 * 2. Parsing Open Graph tags (og:title, og:description, etc.)
 * 3. Parsing other common meta tags
 * 4. Extracting structured data from the page
 */

import type { IMetadataScraper, IScrapedMetadata, ContentType } from '@/types';
import { fetchWithTimeout } from '@/utils';

export class HTMLScraper implements IMetadataScraper {
  name = 'HTML Meta Tags';
  supportedDomains = ['*']; // Works for any site with meta tags
  private readonly timeoutMs = 30000; // 30 seconds for HTML fetch

  canHandle(url: string): boolean {
    // This scraper can try any HTTP/HTTPS URL
    return url.startsWith('http://') || url.startsWith('https://');
  }

  async scrape(url: string): Promise<IScrapedMetadata> {
    console.log('[HTMLScraper] Fetching page:', url);

    try {
      // Fetch the HTML page (will use CORS proxy if enabled)
      const html = await this.fetchHTML(url);

      // Parse metadata from HTML
      const metadata = this.parseHTML(html, url);

      console.log('[HTMLScraper] Extracted metadata:', metadata);
      return metadata;
    } catch (error) {
      console.error('[HTMLScraper] Failed to scrape:', error);

      // Return minimal metadata on error
      return {
        url,
        title: this.getTitleFromUrl(url),
        contentType: 'video' as ContentType,
      };
    }
  }

  /**
   * Fetch HTML from URL (uses CORS proxy if enabled)
   */
  private async fetchHTML(url: string): Promise<string> {
    const fetchUrl = this.wrapWithProxyIfEnabled(url);

    const response = await fetchWithTimeout(
      fetchUrl,
      {
        headers: {
          'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
        },
      },
      this.timeoutMs
    );

    if (!response.ok) {
      throw new Error(`Failed to fetch: ${response.statusText}`);
    }

    return await response.text();
  }

  /**
   * Wrap URL with CORS proxy if enabled
   */
  private wrapWithProxyIfEnabled(url: string): string {
    if (typeof window === 'undefined') {
      console.log('[HTMLScraper] window is undefined, skipping proxy');
      return url;
    }

    const corsEnabled = localStorage.getItem('corsProxyEnabled') === 'true';
    const corsProxyUrl = localStorage.getItem('corsProxyUrl') || 'http://localhost:8080';
    
    console.log('[HTMLScraper] CORS proxy check:', {
      corsEnabled,
      corsProxyUrl,
      originalUrl: url,
    });

    if (!corsEnabled) {
      console.warn('[HTMLScraper] ⚠️ CORS proxy is NOT enabled! Enable it in test app settings.');
      return url;
    }

    // Get HTTP proxy setting if enabled (for routing CORS proxy through HTTP/SOCKS proxy)
    let httpProxyUrl: string | undefined;
    try {
      const settings = localStorage.getItem('stash-downloader:settings');
      if (settings) {
        const parsed = JSON.parse(settings);
        httpProxyUrl = parsed.httpProxy;
        // Sanitize proxy URL: remove quotes, trim whitespace
        if (httpProxyUrl) {
          httpProxyUrl = httpProxyUrl.trim().replace(/^["']|["']$/g, '').trim();
          // Remove empty strings
          if (!httpProxyUrl) {
            httpProxyUrl = undefined;
          }
        }
      }
    } catch {
      // Ignore parse errors
    }

    // Use query parameter instead of path to avoid URL encoding issues
    let proxiedUrl = `${corsProxyUrl}/?url=${encodeURIComponent(url)}`;
    
    // Add HTTP proxy parameter if configured (CORS proxy will route through it)
    if (httpProxyUrl) {
      proxiedUrl += `&proxy=${encodeURIComponent(httpProxyUrl)}`;
      console.log('[HTMLScraper] ✓ CORS proxy will route through HTTP proxy');
    }
    
    console.log('[HTMLScraper] ✓ Using CORS proxy:', proxiedUrl);
    return proxiedUrl;
  }

  /**
   * Parse HTML and extract metadata
   */
  private parseHTML(html: string, url: string): IScrapedMetadata {
    // Create a DOM parser
    const parser = new DOMParser();
    const doc = parser.parseFromString(html, 'text/html');

    // Extract metadata from various sources
    const metadata: IScrapedMetadata = {
      url,
      contentType: this.detectContentType(doc, url),
    };

    // Title (try multiple sources in order of preference)
    metadata.title =
      this.getMetaProperty(doc, 'og:title') ||
      this.getMetaProperty(doc, 'twitter:title') ||
      this.getMetaName(doc, 'title') ||
      doc.querySelector('title')?.textContent ||
      this.getTitleFromUrl(url);

    // Description
    metadata.description =
      this.getMetaProperty(doc, 'og:description') ||
      this.getMetaProperty(doc, 'twitter:description') ||
      this.getMetaName(doc, 'description') ||
      undefined;

    // Thumbnail
    metadata.thumbnailUrl =
      this.getMetaProperty(doc, 'og:image') ||
      this.getMetaProperty(doc, 'twitter:image') ||
      this.getMetaName(doc, 'thumbnail') ||
      undefined;

    // Image URL (for image content type - use og:image or direct image URLs)
    if (metadata.contentType === 'image') {
      // Try to find the actual image URL
      metadata.imageUrl =
        this.getMetaProperty(doc, 'og:image') ||
        this.getMetaProperty(doc, 'twitter:image') ||
        doc.querySelector('img[src]')?.getAttribute('src') ||
        undefined;
      
      // If imageUrl is relative, make it absolute
      if (metadata.imageUrl && !metadata.imageUrl.startsWith('http')) {
        try {
          metadata.imageUrl = new URL(metadata.imageUrl, url).href;
        } catch {
          // Keep relative URL if URL construction fails
        }
      }
    }

    // Video URL (for video content type)
    if (metadata.contentType === 'video') {
      metadata.videoUrl =
        this.getMetaProperty(doc, 'og:video') ||
        this.getMetaProperty(doc, 'og:video:url') ||
        doc.querySelector('video source')?.getAttribute('src') ||
        undefined;

      // If videoUrl is relative, make it absolute
      if (metadata.videoUrl && !metadata.videoUrl.startsWith('http')) {
        try {
          metadata.videoUrl = new URL(metadata.videoUrl, url).href;
        } catch {
          // Keep relative URL if URL construction fails
        }
      }

      // Try to extract quality from video URL
      if (metadata.videoUrl) {
        metadata.quality = this.extractQualityFromUrl(metadata.videoUrl);

        // Add quality to title if available
        if (metadata.quality && metadata.title) {
          metadata.title = `[${metadata.quality}] ${metadata.title}`;
        }
      }
    }

    // Duration (for videos)
    const duration = this.getMetaProperty(doc, 'video:duration') ||
      this.getMetaProperty(doc, 'og:video:duration');
    if (duration) {
      metadata.duration = parseInt(duration, 10);
    }

    // Date
    metadata.date =
      this.getMetaProperty(doc, 'article:published_time') ||
      this.getMetaName(doc, 'publish_date') ||
      undefined;

    // Tags (try to extract from keywords)
    const keywords = this.getMetaName(doc, 'keywords');
    if (keywords) {
      metadata.tags = keywords.split(',').map(tag => tag.trim()).filter(tag => tag.length > 0);
    }

    // Performers (will be site-specific, leave for specialized scrapers)
    metadata.performers = [];

    // Clean up title (remove site name suffix)
    if (metadata.title) {
      metadata.title = this.cleanTitle(metadata.title);
    }

    return metadata;
  }

  /**
   * Get meta tag by property (og:*, twitter:*, etc.)
   */
  private getMetaProperty(doc: Document, property: string): string | null {
    const element = doc.querySelector(`meta[property="${property}"]`);
    return element?.getAttribute('content') || null;
  }

  /**
   * Get meta tag by name
   */
  private getMetaName(doc: Document, name: string): string | null {
    const element = doc.querySelector(`meta[name="${name}"]`);
    return element?.getAttribute('content') || null;
  }

  /**
   * Detect content type from meta tags
   */
  private detectContentType(doc: Document, url: string): ContentType {
    const ogType = this.getMetaProperty(doc, 'og:type');

    if (ogType?.includes('video')) return 'video' as ContentType;
    if (ogType?.includes('image')) return 'image' as ContentType;

    // Check URL extension as fallback
    const extension = url.split('.').pop()?.toLowerCase();
    const imageExtensions = ['jpg', 'jpeg', 'png', 'gif', 'webp', 'bmp'];

    if (extension && imageExtensions.includes(extension)) {
      return 'image' as ContentType;
    }

    return 'video' as ContentType; // Default
  }

  /**
   * Clean title by removing site name and other noise
   */
  private cleanTitle(title: string): string {
    // Remove common suffixes like " - PornHub.com"
    const suffixes = [
      / - \w+\.\w+$/i,  // " - SiteName.com"
      / \| \w+$/i,      // " | SiteName"
      / on \w+$/i,      // " on SiteName"
    ];

    let cleaned = title;
    for (const suffix of suffixes) {
      cleaned = cleaned.replace(suffix, '');
    }

    return cleaned.trim();
  }

  /**
   * Fallback: get title from URL
   */
  private getTitleFromUrl(url: string): string {
    try {
      const urlObj = new URL(url);
      const pathname = urlObj.pathname;
      const filename = pathname.split('/').pop() || '';
      const titleWithoutExt = filename.replace(/\.[^.]+$/, '');
      return decodeURIComponent(titleWithoutExt).replace(/[-_]/g, ' ');
    } catch {
      return 'Downloaded Content';
    }
  }

  /**
   * Extract quality from video URL
   * Tries to find common quality patterns like "1080p", "720p", etc.
   */
  private extractQualityFromUrl(url: string): string | undefined {
    try {
      // Match common quality patterns
      // Pattern 1: "_1080p" or "-720p"
      const qualityMatch = url.match(/[_-](\d{3,4})p/i);
      if (qualityMatch) {
        return `${qualityMatch[1]}p`;
      }

      // Pattern 2: "/1080p/" or "/720p/"
      const pathMatch = url.match(/\/(\d{3,4})p\//i);
      if (pathMatch) {
        return `${pathMatch[1]}p`;
      }

      // Pattern 3: In query parameters like "?quality=1080p"
      const urlObj = new URL(url);
      const qualityParam = urlObj.searchParams.get('quality') ||
                           urlObj.searchParams.get('res') ||
                           urlObj.searchParams.get('resolution');
      if (qualityParam) {
        const qualityNum = qualityParam.match(/(\d{3,4})/);
        if (qualityNum) {
          return `${qualityNum[1]}p`;
        }
      }

      return undefined;
    } catch (error) {
      console.error('[HTMLScraper] Error extracting quality from URL:', error);
      return undefined;
    }
  }
}
