/**
 * YouPornScraper - Specialized scraper for YouPorn
 *
 * Extracts metadata specific to YouPorn including:
 * - Title
 * - Performers (pornstars)
 * - Tags/categories
 * - Description
 * - Duration
 * - Upload date
 * - Thumbnail
 * - Video URL (actual video file)
 */

import type { IMetadataScraper, IScrapedMetadata, ContentType } from '@/types';

export class YouPornScraper implements IMetadataScraper {
  name = 'YouPorn';
  supportedDomains = ['youporn.com', 'www.youporn.com'];

  canHandle(url: string): boolean {
    try {
      const urlObj = new URL(url);
      return this.supportedDomains.includes(urlObj.hostname.toLowerCase());
    } catch {
      return false;
    }
  }

  async scrape(url: string): Promise<IScrapedMetadata> {
    console.log('[YouPornScraper] Fetching page:', url);

    try {
      const html = await this.fetchHTML(url);
      const metadata = this.parseHTML(html, url);

      console.log('[YouPornScraper] Extracted metadata:', metadata);
      return metadata;
    } catch (error) {
      console.error('[YouPornScraper] Failed to scrape:', error);

      return {
        url,
        title: 'YouPorn Video',
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
   * Parse HTML and extract YouPorn-specific metadata
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

    // Video URL (actual video file) - THIS IS CRITICAL
    metadata.videoUrl = this.extractVideoUrl(html, doc);

    return metadata;
  }

  /**
   * Extract actual video URL from page
   * This is the most critical method to get the actual MP4 file
   */
  private extractVideoUrl(html: string, doc: Document): string | undefined {
    try {
      console.log('[YouPornScraper] Attempting to extract video URL...');

      // YouPorn typically embeds video data in window.videoData or similar JavaScript variables

      // Method 1: Look for window.videoData or similar objects
      console.log('[YouPornScraper] Trying method 1: window.videoData...');
      const videoDataMatch = html.match(/window\.videoData\s*=\s*(\{[\s\S]*?\});/);
      if (videoDataMatch) {
        console.log('[YouPornScraper] Found window.videoData, parsing...');
        try {
          const videoData = JSON.parse(videoDataMatch[1]);
          console.log('[YouPornScraper] videoData keys:', Object.keys(videoData));

          // Look for media sources
          if (videoData.sources) {
            console.log('[YouPornScraper] Found sources:', videoData.sources);

            // Find highest quality MP4
            const videos = Object.values(videoData.sources)
              .filter((source: any) => source && typeof source === 'object' && source.url)
              .sort((a: any, b: any) => {
                const qualityA = parseInt(a.quality) || 0;
                const qualityB = parseInt(b.quality) || 0;
                return qualityB - qualityA;
              });

            if (videos.length > 0) {
              const bestVideo = videos[0] as any;
              console.log(`[YouPornScraper] ✓ Found ${videos.length} video URLs, using highest quality:`, bestVideo.quality);
              console.log('[YouPornScraper] Video URL:', bestVideo.url);
              return bestVideo.url;
            }
          }
        } catch (e) {
          console.error('[YouPornScraper] Failed to parse window.videoData:', e);
        }
      }

      // Method 2: Look for "video":"..." pattern with escaped JSON URLs
      console.log('[YouPornScraper] Trying method 2: JSON-escaped video URLs...');
      const escapedVideoMatch = html.match(/"video"\s*:\s*"(https?:\\\/\\\/[^"]+\.mp4[^"]*)"/i);
      if (escapedVideoMatch) {
        console.log('[YouPornScraper] Found escaped video URL, unescaping...');
        // Unescape the JSON string (replace \/ with /)
        const unescapedUrl = escapedVideoMatch[1].replace(/\\\//g, '/');
        console.log('[YouPornScraper] ✓ Found and unescaped video URL:', unescapedUrl);
        return unescapedUrl;
      }

      // Method 3: Look for data-video-urls or similar data attributes
      console.log('[YouPornScraper] Trying method 3: data-video-urls attribute...');
      const videoElement = doc.querySelector('[data-video-urls]');
      if (videoElement) {
        const videoUrlsAttr = videoElement.getAttribute('data-video-urls');
        if (videoUrlsAttr) {
          console.log('[YouPornScraper] Found data-video-urls, parsing...');
          try {
            const videoUrls = JSON.parse(videoUrlsAttr);
            console.log('[YouPornScraper] video URLs:', videoUrls);

            // Find highest quality
            const qualities = Object.keys(videoUrls).sort((a, b) => {
              return parseInt(b) - parseInt(a);
            });

            if (qualities.length > 0) {
              const bestQuality = qualities[0];
              console.log(`[YouPornScraper] ✓ Found video URL with quality ${bestQuality}`);
              console.log('[YouPornScraper] Video URL:', videoUrls[bestQuality]);
              return videoUrls[bestQuality];
            }
          } catch (e) {
            console.error('[YouPornScraper] Failed to parse data-video-urls:', e);
          }
        }
      }

      // Method 4: Look for JSON-LD structured data
      console.log('[YouPornScraper] Trying method 4: JSON-LD structured data...');
      const jsonLdScripts = doc.querySelectorAll('script[type="application/ld+json"]');
      for (const script of Array.from(jsonLdScripts)) {
        try {
          const data = JSON.parse(script.textContent || '');
          if (data['@type'] === 'VideoObject' && data.contentUrl) {
            console.log('[YouPornScraper] ✓ Found video URL from JSON-LD:', data.contentUrl);
            return data.contentUrl;
          }
        } catch (e) {
          // Continue to next script
        }
      }

      // Method 5: Look for media definitions in various JavaScript patterns
      console.log('[YouPornScraper] Trying method 5: various JavaScript patterns...');

      // Pattern: mediaDefinitions = [...]
      const mediaDefMatch = html.match(/mediaDefinitions\s*=\s*(\[[\s\S]*?\]);/);
      if (mediaDefMatch) {
        console.log('[YouPornScraper] Found mediaDefinitions, parsing...');
        try {
          const mediaDef = JSON.parse(mediaDefMatch[1]);
          const videos = mediaDef
            .filter((def: any) => def.videoUrl && def.format === 'mp4')
            .sort((a: any, b: any) => {
              const qualityA = parseInt(a.quality) || 0;
              const qualityB = parseInt(b.quality) || 0;
              return qualityB - qualityA;
            });

          if (videos.length > 0) {
            console.log(`[YouPornScraper] ✓ Found ${videos.length} video URLs from mediaDefinitions, using highest quality:`, videos[0].quality);
            console.log('[YouPornScraper] Video URL:', videos[0].videoUrl);
            return videos[0].videoUrl;
          }
        } catch (e) {
          console.error('[YouPornScraper] Failed to parse mediaDefinitions:', e);
        }
      }

      // Method 6: Look for <video> element with source (backup)
      console.log('[YouPornScraper] Trying method 6: <video> element...');
      const videoTag = doc.querySelector('video source');
      if (videoTag) {
        const src = videoTag.getAttribute('src');
        if (src) {
          console.log('[YouPornScraper] ✓ Found video URL from video element:', src);
          return src;
        }
      }

      // Method 7: Look for any large JSON object in scripts that might contain video data
      console.log('[YouPornScraper] Trying method 7: searching all script tags for video URLs...');
      const allScripts = doc.querySelectorAll('script:not([src])');
      for (const script of Array.from(allScripts)) {
        const scriptContent = script.textContent || '';

        // Look for URLs ending in .mp4
        const mp4Matches = scriptContent.match(/(https?:\/\/[^\s"']+\.mp4[^\s"']*)/gi);
        if (mp4Matches && mp4Matches.length > 0) {
          console.log(`[YouPornScraper] ✓ Found ${mp4Matches.length} .mp4 URLs in scripts, using first one`);
          console.log('[YouPornScraper] Video URL:', mp4Matches[0]);
          return mp4Matches[0];
        }
      }

      console.warn('[YouPornScraper] ⚠️ Could not find video URL in page using any method');
      console.log('[YouPornScraper] HTML sample (first 1000 chars):', html.substring(0, 1000));
      console.log('[YouPornScraper] HTML sample (search for "mp4"):', html.substring(html.indexOf('mp4') - 200, html.indexOf('mp4') + 200));
      return undefined;
    } catch (error) {
      console.error('[YouPornScraper] Error extracting video URL:', error);
      return undefined;
    }
  }

  /**
   * Extract video title
   */
  private extractTitle(doc: Document): string {
    const selectors = [
      'h1.video-title',
      'h1[class*="title"]',
      'meta[property="og:title"]',
      'title',
    ];

    for (const selector of selectors) {
      const element = doc.querySelector(selector);
      if (element) {
        const content = selector.includes('meta')
          ? element.getAttribute('content')
          : element.textContent;

        if (content) {
          return content.trim()
            .replace(' - YouPorn.com', '')
            .replace(' | YouPorn.com', '');
        }
      }
    }

    return 'YouPorn Video';
  }

  /**
   * Extract performers/pornstars
   */
  private extractPerformers(doc: Document): string[] {
    const performers: string[] = [];

    const selectors = [
      'a[class*="pornstar"]',
      'a[href*="/pornstar/"]',
      'div[class*="pornstar"] a',
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

    const selectors = [
      'a[href*="/category/"]',
      'a[class*="tag"]',
      'div[class*="tags"] a',
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
      'meta[name="description"]',
      'div[class*="description"]',
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
    const durationSelectors = [
      '.duration',
      '[class*="duration"]',
      '.video-duration',
    ];

    for (const selector of durationSelectors) {
      const durationText = doc.querySelector(selector)?.textContent?.trim();
      if (durationText) {
        const parts = durationText.split(':').map(p => parseInt(p, 10));
        if (parts.length === 2 && !parts.some(isNaN)) {
          return parts[0] * 60 + parts[1]; // MM:SS
        } else if (parts.length === 3 && !parts.some(isNaN)) {
          return parts[0] * 3600 + parts[1] * 60 + parts[2]; // HH:MM:SS
        }
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
    const dateSelectors = [
      '.video-upload-date',
      '[class*="upload-date"]',
      'meta[property="uploadDate"]',
      'time[datetime]',
    ];

    for (const selector of dateSelectors) {
      const element = doc.querySelector(selector);
      if (element) {
        let dateText: string | null = null;

        if (selector.includes('meta')) {
          dateText = element.getAttribute('content');
        } else if (selector.includes('time')) {
          dateText = element.getAttribute('datetime');
        } else {
          dateText = element.textContent;
        }

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
