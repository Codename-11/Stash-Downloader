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
import { fetchWithTimeout } from '@/utils';

export class PornhubScraper implements IMetadataScraper {
  name = 'Pornhub';
  supportedDomains = ['pornhub.com', 'www.pornhub.com'];
  private readonly timeoutMs = 30000; // 30 seconds for HTML fetch

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
      console.log('[PornhubScraper] HTML fetched, length:', html.length);
      
      const metadata = this.parseHTML(html, url);

      console.log('[PornhubScraper] Extracted metadata:', {
        title: metadata.title,
        hasDescription: !!metadata.description,
        hasThumbnail: !!metadata.thumbnailUrl,
        hasVideoUrl: !!metadata.videoUrl,
        performersCount: metadata.performers?.length || 0,
        tagsCount: metadata.tags?.length || 0,
      });
      return metadata;
    } catch (error) {
      const errorMsg = error instanceof Error ? error.message : String(error);
      const errorStack = error instanceof Error ? error.stack : undefined;
      console.error('[PornhubScraper] Failed to scrape:', errorMsg);
      console.error('[PornhubScraper] Error stack:', errorStack);
      console.error('[PornhubScraper] Full error object:', error);

      // Re-throw the error instead of returning minimal metadata
      // This allows the ScraperRegistry to try fallback scrapers
      throw new Error(`Pornhub scraper failed: ${errorMsg}`);
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
          'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
          'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8',
          'Accept-Language': 'en-US,en;q=0.9',
          'Accept-Encoding': 'gzip, deflate, br',
          'Referer': 'https://www.pornhub.com/',
          'Sec-Fetch-Dest': 'document',
          'Sec-Fetch-Mode': 'navigate',
          'Sec-Fetch-Site': 'same-origin',
          // Removed 'Upgrade-Insecure-Requests' - not needed and causes CORS issues
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
      console.log('[PornhubScraper] window is undefined, skipping proxy');
      return url;
    }

    const corsEnabled = localStorage.getItem('corsProxyEnabled') === 'true';
    const corsProxyUrl = localStorage.getItem('corsProxyUrl') || 'http://localhost:8080';
    
    console.log('[PornhubScraper] CORS proxy check:', {
      corsEnabled,
      corsProxyUrl,
      originalUrl: url,
    });

    if (!corsEnabled) {
      console.warn('[PornhubScraper] ⚠️ CORS proxy is NOT enabled! Enable it in test app settings.');
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
      console.log('[PornhubScraper] ✓ CORS proxy will route through HTTP proxy');
    }
    
    console.log('[PornhubScraper] ✓ Using CORS proxy:', proxiedUrl);
    return proxiedUrl;
  }

  /**
   * Parse HTML and extract Pornhub-specific metadata
   */
  private parseHTML(html: string, url: string): IScrapedMetadata {
    const parser = new DOMParser();
    const doc = parser.parseFromString(html, 'text/html');

    // Detect content type (video or image)
    const contentType = this.detectContentType(doc, url);

    const metadata: IScrapedMetadata = {
      url,
      contentType,
    };

    // Title
    metadata.title = this.extractTitle(doc);

    // Performers (pornstars)
    metadata.performers = this.extractPerformers(doc);

    // Tags
    metadata.tags = this.extractTags(doc);

    // Description
    metadata.description = this.extractDescription(doc);

    // Duration (only for videos)
    if (contentType === 'video') {
      metadata.duration = this.extractDuration(doc);
    }

    // Thumbnail
    metadata.thumbnailUrl = this.extractThumbnail(doc);

    // Upload date
    metadata.date = this.extractDate(doc);

    // Video URL (actual video file) - only for videos
    if (contentType === 'video') {
      metadata.videoUrl = this.extractVideoUrl(html, doc);

      // Extract quality from video URL if available
      if (metadata.videoUrl) {
        metadata.quality = this.extractQualityFromUrl(metadata.videoUrl);

        // Add quality to title if available
        if (metadata.quality && metadata.title) {
          metadata.title = `[${metadata.quality}] ${metadata.title}`;
        }
      }
    } else if (contentType === 'image') {
      // Image URL (actual image file) - for images
      metadata.imageUrl = this.extractImageUrl(html, doc);
    }

    return metadata;
  }

  /**
   * Detect content type from page
   */
  private detectContentType(doc: Document, url: string): ContentType {
    // Check og:type meta tag
    const ogType = doc.querySelector('meta[property="og:type"]')?.getAttribute('content')?.toLowerCase();
    if (ogType?.includes('image')) return 'image' as ContentType;
    if (ogType?.includes('video')) return 'video' as ContentType;

    // Check URL path for image indicators
    const urlLower = url.toLowerCase();
    if (urlLower.includes('/photo/') || urlLower.includes('/image/') || urlLower.includes('/picture/')) {
      return 'image' as ContentType;
    }

    // Check for image extensions in URL
    const imageExtensions = ['.jpg', '.jpeg', '.png', '.gif', '.webp', '.bmp'];
    if (imageExtensions.some(ext => urlLower.includes(ext))) {
      return 'image' as ContentType;
    }

    // Default to video for Pornhub
    return 'video' as ContentType;
  }

  /**
   * Extract actual image URL from page
   */
  private extractImageUrl(html: string, doc: Document): string | undefined {
    try {
      console.log('[PornhubScraper] Attempting to extract image URL...');

      // Method 1: Look for og:image meta tag
      const ogImage = doc.querySelector('meta[property="og:image"]')?.getAttribute('content');
      if (ogImage && (ogImage.includes('.jpg') || ogImage.includes('.png') || ogImage.includes('.webp'))) {
        console.log('[PornhubScraper] ✓ Found image URL from og:image:', ogImage);
        return ogImage;
      }

      // Method 2: Look for large image elements
      const largeImage = doc.querySelector('img[src*="pornhub"], img[data-src*="pornhub"]');
      if (largeImage) {
        const src = largeImage.getAttribute('src') || largeImage.getAttribute('data-src');
        if (src && (src.includes('.jpg') || src.includes('.png') || src.includes('.webp'))) {
          console.log('[PornhubScraper] ✓ Found image URL from img element:', src);
          return src.startsWith('http') ? src : new URL(src, 'https://www.pornhub.com').href;
        }
      }

      // Method 3: Look for image URLs in JavaScript variables
      const imageUrlMatch = html.match(/"imageUrl"\s*:\s*"([^"]+)"/i) || 
                           html.match(/"image_url"\s*:\s*"([^"]+)"/i) ||
                           html.match(/var\s+imageUrl\s*=\s*"([^"]+)"/i);
      if (imageUrlMatch && imageUrlMatch[1]) {
        const imageUrl = imageUrlMatch[1].replace(/\\\//g, '/');
        console.log('[PornhubScraper] ✓ Found image URL from JavaScript:', imageUrl);
        return imageUrl.startsWith('http') ? imageUrl : new URL(imageUrl, 'https://www.pornhub.com').href;
      }

      console.warn('[PornhubScraper] ⚠️ Could not find image URL in page');
      return undefined;
    } catch (error) {
      console.error('[PornhubScraper] Error extracting image URL:', error);
      return undefined;
    }
  }

  /**
   * Extract actual video URL from page
   * Uses multiple methods similar to stacher7's approach
   */
  private extractVideoUrl(html: string, doc: Document): string | undefined {
    try {
      console.log('[PornhubScraper] Attempting to extract video URL...');

      // Method 1: Look for mediaDefinitions in script tags (various formats)
      console.log('[PornhubScraper] Trying method 1: mediaDefinitions variable...');
      const mediaDefPatterns = [
        /var\s+mediaDefinitions\s*=\s*(\[.*?\]);/s,
        /mediaDefinitions\s*[:=]\s*(\[.*?\])/s,
        /"mediaDefinitions"\s*:\s*(\[.*?\])/s,
        /mediaDefinitions\s*=\s*(\[.*?\]);/s,
      ];

      for (const pattern of mediaDefPatterns) {
        const match = html.match(pattern);
        if (match && match[1]) {
          console.log('[PornhubScraper] Found mediaDefinitions with pattern, parsing...');
          try {
            const mediaDefinitions = JSON.parse(match[1]);
            console.log('[PornhubScraper] mediaDefinitions:', mediaDefinitions);

            const videos = this.findBestVideoFromDefinitions(mediaDefinitions);
            if (videos.length > 0 && videos[0]) {
              console.log(`[PornhubScraper] ✓ Found ${videos.length} video URLs, using highest quality:`, videos[0].quality);
              console.log('[PornhubScraper] Video URL:', videos[0].videoUrl);
              return videos[0].videoUrl;
            }
          } catch (e) {
            console.error('[PornhubScraper] Failed to parse mediaDefinitions:', e);
          }
        }
      }

      // Method 2: Look for flashvars (various formats)
      console.log('[PornhubScraper] Trying method 2: flashvars variable...');
      const flashvarsPatterns = [
        /var\s+flashvars[^=]*=\s*(\{.*?\});/s,
        /flashvars\s*[:=]\s*(\{.*?\})/s,
        /"flashvars"\s*:\s*(\{.*?\})/s,
      ];

      for (const pattern of flashvarsPatterns) {
        const match = html.match(pattern);
        if (match && match[1]) {
          console.log('[PornhubScraper] Found flashvars, parsing...');
          try {
            const flashvars = JSON.parse(match[1]);
            console.log('[PornhubScraper] flashvars keys:', Object.keys(flashvars));

            if (flashvars.mediaDefinitions) {
              const defs = typeof flashvars.mediaDefinitions === 'string'
                ? JSON.parse(flashvars.mediaDefinitions)
                : flashvars.mediaDefinitions;

              console.log('[PornhubScraper] mediaDefinitions from flashvars:', defs);
              const videos = this.findBestVideoFromDefinitions(defs);
              if (videos.length > 0 && videos[0]) {
                console.log(`[PornhubScraper] ✓ Found ${videos.length} video URLs from flashvars, using highest quality:`, videos[0].quality);
                console.log('[PornhubScraper] Video URL:', videos[0].videoUrl);
                return videos[0].videoUrl;
              }
            }
          } catch (e) {
            console.error('[PornhubScraper] Failed to parse flashvars:', e);
          }
        }
      }

      // Method 3: Look for direct CDN URLs in HTML (stacher7 approach)
      console.log('[PornhubScraper] Trying method 3: Direct CDN URL search...');
      const cdnPatterns = [
        /https?:\/\/[^"'\s]+\.phncdn\.com\/[^"'\s]+\.mp4[^"'\s]*/gi,
        /https?:\/\/[^"'\s]+\.ph-cdn\.com\/[^"'\s]+\.mp4[^"'\s]*/gi,
        /https?:\/\/[^"'\s]+cdn[^"'\s]*pornhub[^"'\s]+\.mp4[^"'\s]*/gi,
      ];

      for (const pattern of cdnPatterns) {
        const matches = html.match(pattern);
        if (matches && matches.length > 0) {
          // Find highest quality URL (usually contains quality indicator)
          const sorted = matches
            .map(url => {
              const qualityMatch = url.match(/(\d+)p/i) || url.match(/(\d+)P/i);
              return {
                url,
                quality: qualityMatch && qualityMatch[1] ? parseInt(qualityMatch[1]) : 0,
              };
            })
            .sort((a, b) => b.quality - a.quality);

          if (sorted.length > 0 && sorted[0]) {
            console.log(`[PornhubScraper] ✓ Found ${sorted.length} CDN URLs, using:`, sorted[0].url);
            return sorted[0].url;
          }
        }
      }

      // Method 4: Look for escaped URLs (common in JavaScript)
      console.log('[PornhubScraper] Trying method 4: Escaped URL search...');
      const escapedPatterns = [
        /https?:\\\/\\\/[^"']+\.mp4[^"']*/gi,
        /"videoUrl"\s*:\s*"([^"]+)"/gi,
        /"video_url"\s*:\s*"([^"]+)"/gi,
        /"url"\s*:\s*"([^"]+\.mp4[^"]*)"/gi,
      ];

      for (const pattern of escapedPatterns) {
        const matches = html.match(pattern);
        if (matches && matches.length > 0) {
          for (const match of matches) {
            // Unescape the URL
            const unescaped = match.replace(/\\\//g, '/').replace(/\\u([0-9a-f]{4})/gi, (_, hex) => String.fromCharCode(parseInt(hex, 16)));
            // Extract URL from match if it's in a JSON structure
            const urlMatch = unescaped.match(/https?:\/\/[^\s"']+\.mp4[^\s"']*/i);
            if (urlMatch && urlMatch[0] && (urlMatch[0].includes('pornhub') || urlMatch[0].includes('phncdn') || urlMatch[0].includes('ph-cdn'))) {
              console.log('[PornhubScraper] ✓ Found escaped video URL:', urlMatch[0]);
              return urlMatch[0];
            }
          }
        }
      }

      // Method 5: Look for video tags (backup)
      console.log('[PornhubScraper] Trying method 5: <video> element...');
      const videoElement = doc.querySelector('video source');
      if (videoElement) {
        const src = videoElement.getAttribute('src') || videoElement.getAttribute('data-src');
        if (src) {
          console.log('[PornhubScraper] ✓ Found video URL from video element:', src);
          return src;
        }
      }

      // Method 6: Look in data attributes
      console.log('[PornhubScraper] Trying method 6: Data attributes...');
      const dataVideo = doc.querySelector('[data-video-url], [data-video], [data-src]');
      if (dataVideo) {
        const url = dataVideo.getAttribute('data-video-url') || 
                   dataVideo.getAttribute('data-video') || 
                   dataVideo.getAttribute('data-src');
        if (url && url.includes('.mp4')) {
          console.log('[PornhubScraper] ✓ Found video URL from data attribute:', url);
          return url;
        }
      }

      console.warn('[PornhubScraper] ⚠️ Could not find video URL in page using any method');
      console.log('[PornhubScraper] HTML sample (first 2000 chars):', html.substring(0, 2000));
      return undefined;
    } catch (error) {
      console.error('[PornhubScraper] Error extracting video URL:', error);
      return undefined;
    }
  }

  /**
   * Find best video from mediaDefinitions array
   */
  private findBestVideoFromDefinitions(definitions: any[]): Array<{videoUrl: string, quality: number}> {
    if (!Array.isArray(definitions)) {
      return [];
    }

    const videos = definitions
      .filter((def: any) => {
        // Accept mp4 format or any format with videoUrl
        return (def.format === 'mp4' || def.format === 'hls' || !def.format) && def.videoUrl;
      })
      .map((def: any) => {
        // Extract quality from various possible fields
        const quality = parseInt(def.quality) || 
                       parseInt(def.qualityLabel?.replace('p', '')) ||
                       parseInt(def.height) ||
                       0;
        return {
          videoUrl: def.videoUrl,
          quality,
        };
      })
      .sort((a, b) => b.quality - a.quality);

    return videos;
  }

  /**
   * Extract video title
   */
  private extractTitle(doc: Document): string {
    // Try multiple selectors (updated for current Pornhub structure)
    const selectors = [
      'h1.title > span',
      'h1.title',
      'h1[class*="title"]',
      'div.video-wrapper h1',
      'meta[property="og:title"]',
      'meta[name="twitter:title"]',
      'title',
    ];

    for (const selector of selectors) {
      const element = doc.querySelector(selector);
      if (element) {
        let content: string | null = null;
        if (selector.includes('meta')) {
          content = element.getAttribute('content');
        } else if (selector === 'title') {
          content = element.textContent;
        } else {
          content = element.textContent;
        }

        if (content) {
          // Clean up title - remove site name suffixes
          const cleaned = content.trim()
            .replace(/\s*-\s*Pornhub\.com\s*$/i, '')
            .replace(/\s*\|\s*Pornhub\s*$/i, '')
            .replace(/\s*on\s+Pornhub\s*$/i, '');
          if (cleaned) return cleaned;
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

    // Try multiple selectors (updated for current Pornhub structure)
    const selectors = [
      '.pornstarsWrapper a.pstar-list-btn',
      'div.pornstarsWrapper a',
      'a[data-mxptype="Pornstar"]',
      'div[class*="pornstar"] a',
      'a[href*="/pornstar/"]',
      'div[class*="performers"] a',
      'a[class*="pornstar"]',
    ];

    for (const selector of selectors) {
      const elements = doc.querySelectorAll(selector);
      elements.forEach(el => {
        const name = el.textContent?.trim();
        if (name && name.length > 0 && !performers.includes(name)) {
          // Filter out common non-performer text
          if (!['View All', 'More', 'Show More', 'Less'].includes(name)) {
            performers.push(name);
          }
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

    // Try multiple selectors (updated for current Pornhub structure)
    const selectors = [
      'div.categoriesWrapper a',
      'div.video-info-row a[data-mxptype="Category"]',
      '.tagsWrapper a.item',
      'div[class*="categories"] a',
      'div[class*="tags"] a',
      'a[data-mxptype="Category"]',
      'a[href*="/categories/"]',
      'a[href*="/tags/"]',
    ];

    for (const selector of selectors) {
      const elements = doc.querySelectorAll(selector);
      elements.forEach(el => {
        const tag = el.textContent?.trim();
        if (tag && tag.length > 0 && !tags.includes(tag)) {
          // Filter out common non-tag text
          if (!['View All', 'More', 'Show More', 'Less', 'Categories', 'Tags'].includes(tag)) {
            tags.push(tag);
          }
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
      if (parts.length === 2 && parts[0] !== undefined && parts[1] !== undefined) {
        return parts[0] * 60 + parts[1]; // MM:SS
      } else if (parts.length === 3 && parts[0] !== undefined && parts[1] !== undefined && parts[2] !== undefined) {
        return parts[0] * 3600 + parts[1] * 60 + parts[2]; // HH:MM:SS
      }
    }

    return undefined;
  }

  /**
   * Extract thumbnail URL
   */
  private extractThumbnail(doc: Document): string | undefined {
    // Try multiple selectors (updated for current Pornhub structure)
    const selectors = [
      'meta[property="og:image"]',
      'meta[name="twitter:image"]',
      'link[rel="image_src"]',
      'img[class*="thumbnail"]',
      'img[class*="preview"]',
      'div[class*="thumbnail"] img',
      'div[class*="preview"] img',
    ];

    for (const selector of selectors) {
      const element = doc.querySelector(selector);
      if (element) {
        let content: string | null = null;
        if (selector.includes('meta') || selector.includes('link')) {
          content = element.getAttribute('content') || element.getAttribute('href');
        } else if (selector.includes('img')) {
          content = element.getAttribute('src') || element.getAttribute('data-src');
        }
        
        if (content) {
          // Ensure it's a full URL
          if (content.startsWith('http://') || content.startsWith('https://')) {
            return content;
          } else if (content.startsWith('//')) {
            return `https:${content}`;
          } else if (content.startsWith('/')) {
            return `https://www.pornhub.com${content}`;
          }
        }
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

  /**
   * Extract quality from video URL
   * Pornhub URLs may contain quality info like "720p" or "1080p"
   */
  private extractQualityFromUrl(url: string): string | undefined {
    try {
      // Match common quality patterns in URLs
      // Pattern 1: Direct quality indicator like "_720p" or "_1080p"
      const qualityMatch = url.match(/[_\-](\d{3,4})p/i);
      if (qualityMatch) {
        return `${qualityMatch[1]}p`;
      }

      // Pattern 2: Quality in query parameters like "quality=720"
      const urlObj = new URL(url);
      const qualityParam = urlObj.searchParams.get('quality');
      if (qualityParam && /^\d{3,4}$/.test(qualityParam)) {
        return `${qualityParam}p`;
      }

      // Pattern 3: Look for quality in path segments
      const pathMatch = url.match(/\/(\d{3,4})p\//i);
      if (pathMatch) {
        return `${pathMatch[1]}p`;
      }

      return undefined;
    } catch (error) {
      console.error('[PornhubScraper] Error extracting quality from URL:', error);
      return undefined;
    }
  }
}
