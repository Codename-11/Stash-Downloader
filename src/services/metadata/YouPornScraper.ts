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
import { fetchWithTimeout } from '@/utils';

export class YouPornScraper implements IMetadataScraper {
  name = 'YouPorn';
  supportedDomains = ['youporn.com', 'www.youporn.com'];
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
    console.log('[YouPornScraper] Fetching page:', url);

    try {
      const html = await this.fetchHTML(url);
      console.log('[YouPornScraper] HTML fetched, length:', html.length);
      
      const metadata = this.parseHTML(html, url);

      console.log('[YouPornScraper] Extracted metadata:', {
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
      console.error('[YouPornScraper] Failed to scrape:', errorMsg);
      console.error('[YouPornScraper] Error stack:', errorStack);
      console.error('[YouPornScraper] Full error object:', error);

      // Re-throw the error instead of returning minimal metadata
      // This allows the ScraperRegistry to try fallback scrapers
      throw new Error(`YouPorn scraper failed: ${errorMsg}`);
    }
  }

  /**
   * Fetch HTML from URL (uses CORS proxy if enabled)
   */
  private async fetchHTML(url: string): Promise<string> {
    const fetchUrl = this.wrapWithProxyIfEnabled(url);
    console.log('[YouPornScraper] Fetching from URL:', fetchUrl);

    const response = await fetchWithTimeout(
      fetchUrl,
      {
        method: 'GET',
        mode: 'cors', // Explicitly set CORS mode
        headers: {
          'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
          'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8',
          'Accept-Language': 'en-US,en;q=0.9',
          'Accept-Encoding': 'gzip, deflate, br',
          'Referer': 'https://www.youporn.com/',
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
      console.log('[YouPornScraper] window is undefined, skipping proxy');
      return url;
    }

    const corsEnabled = localStorage.getItem('corsProxyEnabled') === 'true';
    const corsProxyUrl = localStorage.getItem('corsProxyUrl') || 'http://localhost:8080';
    
    console.log('[YouPornScraper] CORS proxy check:', {
      corsEnabled,
      corsProxyUrl,
      originalUrl: url,
    });

    if (!corsEnabled) {
      console.warn('[YouPornScraper] ⚠️ CORS proxy is NOT enabled! Enable it in test app settings.');
      return url;
    }

    // Use query parameter instead of path to avoid URL encoding issues
    const proxiedUrl = `${corsProxyUrl}/?url=${encodeURIComponent(url)}`;
    console.log('[YouPornScraper] ✓ Using CORS proxy:', proxiedUrl);
    return proxiedUrl;
  }

  /**
   * Parse HTML and extract YouPorn-specific metadata
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

    // Default to video for YouPorn
    return 'video' as ContentType;
  }

  /**
   * Extract actual image URL from page
   */
  private extractImageUrl(html: string, doc: Document): string | undefined {
    try {
      console.log('[YouPornScraper] Attempting to extract image URL...');

      // Method 1: Look for og:image meta tag
      const ogImage = doc.querySelector('meta[property="og:image"]')?.getAttribute('content');
      if (ogImage && (ogImage.includes('.jpg') || ogImage.includes('.png') || ogImage.includes('.webp'))) {
        console.log('[YouPornScraper] ✓ Found image URL from og:image:', ogImage);
        return ogImage;
      }

      // Method 2: Look for large image elements
      const largeImage = doc.querySelector('img[src*="youporn"], img[data-src*="youporn"]');
      if (largeImage) {
        const src = largeImage.getAttribute('src') || largeImage.getAttribute('data-src');
        if (src && (src.includes('.jpg') || src.includes('.png') || src.includes('.webp'))) {
          console.log('[YouPornScraper] ✓ Found image URL from img element:', src);
          return src.startsWith('http') ? src : new URL(src, 'https://www.youporn.com').href;
        }
      }

      // Method 3: Look for image URLs in JavaScript variables
      const imageUrlMatch = html.match(/"imageUrl"\s*:\s*"([^"]+)"/i) || 
                           html.match(/"image_url"\s*:\s*"([^"]+)"/i) ||
                           html.match(/var\s+imageUrl\s*=\s*"([^"]+)"/i);
      if (imageUrlMatch && imageUrlMatch[1]) {
        const imageUrl = imageUrlMatch[1].replace(/\\\//g, '/');
        console.log('[YouPornScraper] ✓ Found image URL from JavaScript:', imageUrl);
        return imageUrl.startsWith('http') ? imageUrl : new URL(imageUrl, 'https://www.youporn.com').href;
      }

      console.warn('[YouPornScraper] ⚠️ Could not find image URL in page');
      return undefined;
    } catch (error) {
      console.error('[YouPornScraper] Error extracting image URL:', error);
      return undefined;
    }
  }

  /**
   * Extract actual video URL from page
   * This is the most critical method to get the actual MP4 file
   */
  private extractVideoUrl(html: string, doc: Document): string | undefined {
    try {
      console.log('[YouPornScraper] Attempting to extract video URL...');

      // YouPorn embeds video data in page_params.video_player_setup object
      // This is the method used by yt-dlp (from PR #8827)

      // Method 1: Look for page_params.video_player_setup (yt-dlp method)
      console.log('[YouPornScraper] Trying method 1: page_params.video_player_setup (yt-dlp method)...');
      const playerSetupMatch = html.match(/page_params\.video_player_setup\s*=\s*(\{[\s\S]*?\});/);
      if (playerSetupMatch && playerSetupMatch[1]) {
        console.log('[YouPornScraper] Found page_params.video_player_setup, parsing...');
        try {
          const playerSetup = JSON.parse(playerSetupMatch[1]);
          console.log('[YouPornScraper] playerSetup keys:', Object.keys(playerSetup));

          if (playerSetup.mediaDefinitions) {
            const mediaDefs = Array.isArray(playerSetup.mediaDefinitions)
              ? playerSetup.mediaDefinitions
              : JSON.parse(playerSetup.mediaDefinitions);

            console.log(`[YouPornScraper] Found ${mediaDefs.length} media definitions`);

            // Filter for MP4 videos and sort by quality
            const videos = mediaDefs
              .filter((def: any) => def.format === 'mp4' && def.videoUrl)
              .map((def: any) => ({
                url: def.videoUrl,
                quality: parseInt(def.quality) || 0,
                format: def.format,
              }))
              .sort((a: any, b: any) => b.quality - a.quality);

            console.log('[YouPornScraper] Available qualities from page_params:');
            videos.forEach((v: any) => {
              console.log(`  - ${v.quality}p: ${v.url.substring(0, 100)}...`);
            });

            if (videos.length > 0 && videos[0]) {
              console.log(`[YouPornScraper] ✓ Found ${videos.length} video URLs, selecting highest quality: ${videos[0].quality}p`);
              console.log('[YouPornScraper] Video URL:', videos[0].url);
              return videos[0].url;
            }
          }
        } catch (e) {
          console.error('[YouPornScraper] Failed to parse page_params.video_player_setup:', e);
        }
      }

      // Method 2: Look for window.videoData or similar objects
      console.log('[YouPornScraper] Trying method 2: window.videoData...');
      const videoDataMatch = html.match(/window\.videoData\s*=\s*(\{[\s\S]*?\});/);
      if (videoDataMatch && videoDataMatch[1]) {
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

      // Method 3: Look for "video":"..." pattern with escaped JSON URLs
      // Find ALL video URLs and select the highest quality DIRECT MP4
      console.log('[YouPornScraper] Trying method 3: JSON-escaped video URLs...');
      const escapedVideoMatches = html.match(/"video"\s*:\s*"(https?:\\\/\\\/[^"]+\.mp4[^"]*)"/gi);
      if (escapedVideoMatches && escapedVideoMatches.length > 0) {
        console.log(`[YouPornScraper] Found ${escapedVideoMatches.length} video URLs with escaped slashes`);

        // Extract and parse all URLs with their quality info
        const videos = escapedVideoMatches.map(match => {
          const urlMatch = match.match(/"video"\s*:\s*"(https?:\\\/\\\/[^"]+\.mp4[^"]*)"/i);
          if (!urlMatch || !urlMatch[1]) return null;

          const escapedUrl = urlMatch[1];
          const unescapedUrl = escapedUrl.replace(/\\\//g, '/');

          // Filter out HLS/DASH URLs
          if (!this.isDirectMp4Url(unescapedUrl)) {
            console.log(`[YouPornScraper] Skipping non-direct MP4: ${unescapedUrl.substring(0, 100)}...`);
            return null;
          }

          // Extract quality from URL (e.g., "360P_360K" or "1080P_2000K")
          const qualityMatch = unescapedUrl.match(/\/(\d+)P_(\d+)K_/);
          const quality = qualityMatch && qualityMatch[1] ? parseInt(qualityMatch[1]) : 0;
          const bitrate = qualityMatch && qualityMatch[2] ? parseInt(qualityMatch[2]) : 0;

          return { url: unescapedUrl, quality, bitrate };
        }).filter(v => v !== null) as Array<{url: string, quality: number, bitrate: number}>;

        // DEBUG: Log all found URLs with their qualities
        console.log('[YouPornScraper] Direct MP4 URLs found:');
        videos.forEach(v => {
          console.log(`  - ${v.quality}p @ ${v.bitrate}k: ${v.url}`);
        });

        if (videos.length > 0) {
          // Sort by quality (highest first), then by bitrate
          videos.sort((a, b) => {
            if (b.quality !== a.quality) return b.quality - a.quality;
            return b.bitrate - a.bitrate;
          });

          const bestVideo = videos[0];
          if (bestVideo) {
            console.log(`[YouPornScraper] ✓ Selecting highest quality direct MP4: ${bestVideo.quality}p @ ${bestVideo.bitrate}k`);
            console.log('[YouPornScraper] Video URL:', bestVideo.url);
            return bestVideo.url;
          }
        }
      }

      // Method 3b: Look for ALL .mp4 URLs in the page (broader search)
      console.log('[YouPornScraper] Trying method 3b: searching for ALL .mp4 URLs in page...');
      const allMp4Matches = html.match(/https?:\\\/\\\/[^"']+\.mp4[^"']*/gi);
      if (allMp4Matches && allMp4Matches.length > 0) {
        console.log(`[YouPornScraper] Found ${allMp4Matches.length} total .mp4 URLs in HTML (escaped)`);

        const allVideos = allMp4Matches.map(escapedUrl => {
          const unescapedUrl = escapedUrl.replace(/\\\//g, '/');

          // Filter out HLS/DASH URLs
          if (!this.isDirectMp4Url(unescapedUrl)) {
            return null;
          }

          const qualityMatch = unescapedUrl.match(/\/(\d+)P_(\d+)K_/);
          const quality = qualityMatch && qualityMatch[1] ? parseInt(qualityMatch[1]) : 0;
          const bitrate = qualityMatch && qualityMatch[2] ? parseInt(qualityMatch[2]) : 0;
          return { url: unescapedUrl, quality, bitrate };
        }).filter(v => v !== null && v.quality > 0); // Only keep direct MP4 URLs with identifiable quality

        // Remove duplicates
        const uniqueVideos = allVideos.filter((v, i, arr) =>
          arr.findIndex(x => x!.url === v!.url) === i
        ) as Array<{url: string, quality: number, bitrate: number}>;

        if (uniqueVideos.length > 0) {
          console.log('[YouPornScraper] All unique .mp4 URLs with quality info:');
          uniqueVideos.forEach(v => {
            console.log(`  - ${v.quality}p @ ${v.bitrate}k`);
          });

          // Sort and select highest
          uniqueVideos.sort((a, b) => {
            if (b.quality !== a.quality) return b.quality - a.quality;
            return b.bitrate - a.bitrate;
          });

          const bestVideo = uniqueVideos[0];
          if (bestVideo) {
            console.log(`[YouPornScraper] ✓ Selecting highest quality from all .mp4 URLs: ${bestVideo.quality}p @ ${bestVideo.bitrate}k`);
            console.log('[YouPornScraper] Video URL:', bestVideo.url);
            return bestVideo.url;
          }
        }
      }

      // Method 4: Look for data-video-urls or similar data attributes
      console.log('[YouPornScraper] Trying method 4: data-video-urls attribute...');
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

            if (qualities.length > 0 && qualities[0]) {
              const bestQuality = qualities[0];
              if (videoUrls[bestQuality]) {
                console.log(`[YouPornScraper] ✓ Found video URL with quality ${bestQuality}`);
                console.log('[YouPornScraper] Video URL:', videoUrls[bestQuality]);
                return videoUrls[bestQuality];
              }
            }
          } catch (e) {
            console.error('[YouPornScraper] Failed to parse data-video-urls:', e);
          }
        }
      }

      // Method 5: Look for JSON-LD structured data
      console.log('[YouPornScraper] Trying method 5: JSON-LD structured data...');
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

      // Method 6: Look for media definitions in various JavaScript patterns
      console.log('[YouPornScraper] Trying method 6: various JavaScript patterns...');

      // Pattern: mediaDefinitions = [...]
      const mediaDefMatch = html.match(/mediaDefinitions\s*=\s*(\[[\s\S]*?\]);/);
      if (mediaDefMatch && mediaDefMatch[1]) {
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

      // Method 7: Look for <video> element with source (backup)
      console.log('[YouPornScraper] Trying method 7: <video> element...');
      const videoTag = doc.querySelector('video source');
      if (videoTag) {
        const src = videoTag.getAttribute('src');
        if (src) {
          console.log('[YouPornScraper] ✓ Found video URL from video element:', src);
          return src;
        }
      }

      // Method 8: Look for any large JSON object in scripts that might contain video data
      console.log('[YouPornScraper] Trying method 8: searching all script tags for video URLs...');
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
        if (parts.length === 2 && !parts.some(isNaN) && parts[0] !== undefined && parts[1] !== undefined) {
          return parts[0] * 60 + parts[1]; // MM:SS
        } else if (parts.length === 3 && !parts.some(isNaN) && parts[0] !== undefined && parts[1] !== undefined && parts[2] !== undefined) {
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

  /**
   * Extract quality from video URL
   * YouPorn URLs contain quality info like "360P_360K" or "1080P_2000K"
   */
  private extractQualityFromUrl(url: string): string | undefined {
    try {
      // Match pattern like "360P_360K" or "1080P_2000K"
      const qualityMatch = url.match(/\/(\d+)P_\d+K_/i);
      if (qualityMatch && qualityMatch[1]) {
        const qualityNum = parseInt(qualityMatch[1]);
        // Format as "1080p", "720p", etc.
        return `${qualityNum}p`;
      }

      // Fallback: try to find any quality indicator
      const altMatch = url.match(/(\d{3,4})p/i);
      if (altMatch && altMatch[1]) {
        return altMatch[1] + 'p';
      }

      return undefined;
    } catch (error) {
      console.error('[YouPornScraper] Error extracting quality from URL:', error);
      return undefined;
    }
  }

  /**
   * Check if URL is a direct MP4 download (not HLS/DASH streaming)
   */
  private isDirectMp4Url(url: string): boolean {
    try {
      const urlLower = url.toLowerCase();

      // Exclude HLS playlists
      if (urlLower.includes('.m3u8') || urlLower.includes('/hls/')) {
        return false;
      }

      // Exclude DASH manifests
      if (urlLower.includes('.mpd') || urlLower.includes('/dash/')) {
        return false;
      }

      // Must end with .mp4 (not .mp4/ or .mp4?)
      if (urlLower.endsWith('.mp4')) {
        return true;
      }

      // Allow .mp4 with query parameters
      if (urlLower.match(/\.mp4(\?[^/]*)?$/)) {
        return true;
      }

      return false;
    } catch (error) {
      return false;
    }
  }
}
