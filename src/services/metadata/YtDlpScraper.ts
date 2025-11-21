/**
 * YtDlpScraper - Uses yt-dlp for video URL extraction
 *
 * This scraper delegates to yt-dlp running in the CORS proxy backend,
 * avoiding the need to reimplement scraping logic for every site.
 *
 * Requires:
 * - CORS proxy running with yt-dlp installed
 * - Endpoint: http://localhost:8080/api/extract?url=<video_url>
 */

import type { IMetadataScraper, IScrapedMetadata, ContentType } from '@/types';

export class YtDlpScraper implements IMetadataScraper {
  name = 'yt-dlp';
  supportedDomains = ['*']; // Supports all domains

  canHandle(url: string): boolean {
    // Can handle any URL if yt-dlp is available
    try {
      new URL(url);
      return true;
    } catch {
      return false;
    }
  }

  async scrape(url: string): Promise<IScrapedMetadata> {
    console.log('[YtDlpScraper] Using yt-dlp to extract:', url);

    try {
      const proxyUrl = this.getProxyUrl();
      const extractUrl = `${proxyUrl}/api/extract?url=${encodeURIComponent(url)}`;

      console.log('[YtDlpScraper] Calling yt-dlp API:', extractUrl);

      const response = await fetch(extractUrl);

      if (!response.ok) {
        const error = await response.json();
        console.warn('[YtDlpScraper] yt-dlp failed:', error);
        throw new Error(`yt-dlp extraction failed: ${error.error || response.statusText}`);
      }

      const data = await response.json();
      console.log('[YtDlpScraper] ✓ Got metadata from yt-dlp:', data.title);

      // Convert yt-dlp format to our metadata format
      const metadata = this.convertYtDlpToMetadata(data, url);

      console.log('[YtDlpScraper] Converted metadata:', metadata);
      return metadata;
    } catch (error) {
      console.error('[YtDlpScraper] Error:', error);
      throw error;
    }
  }

  /**
   * Get CORS proxy URL from settings
   */
  private getProxyUrl(): string {
    if (typeof window === 'undefined') {
      return 'http://localhost:8080';
    }

    const corsEnabled = localStorage.getItem('corsProxyEnabled') === 'true';
    if (!corsEnabled) {
      throw new Error('CORS proxy is not enabled. Enable it in settings to use yt-dlp.');
    }

    return localStorage.getItem('corsProxyUrl') || 'http://localhost:8080';
  }

  /**
   * Convert yt-dlp JSON output to our metadata format
   */
  private convertYtDlpToMetadata(ytdlp: any, originalUrl: string): IScrapedMetadata {
    // Find the best video format
    const videoUrl = this.selectBestVideoFormat(ytdlp);

    return {
      url: originalUrl,
      videoUrl: videoUrl,
      title: ytdlp.title || undefined,
      description: ytdlp.description || undefined,
      date: ytdlp.upload_date ? this.formatDate(ytdlp.upload_date) : undefined,
      duration: ytdlp.duration || undefined,
      thumbnailUrl: ytdlp.thumbnail || undefined,
      performers: ytdlp.artist ? [ytdlp.artist] : ytdlp.uploader ? [ytdlp.uploader] : [],
      tags: ytdlp.tags || ytdlp.categories || [],
      studio: ytdlp.uploader || ytdlp.channel || undefined,
      contentType: 'video' as ContentType,
    };
  }

  /**
   * Select the best video format from yt-dlp formats list
   */
  private selectBestVideoFormat(ytdlp: any): string | undefined {
    // If there's a direct URL field, use it
    if (ytdlp.url) {
      console.log('[YtDlpScraper] Using direct URL from yt-dlp');
      return ytdlp.url;
    }

    // Otherwise, look through formats for best video
    if (ytdlp.formats && Array.isArray(ytdlp.formats)) {
      console.log(`[YtDlpScraper] Found ${ytdlp.formats.length} formats, selecting best...`);

      // Filter for video formats (not audio-only)
      const videoFormats = ytdlp.formats.filter((f: any) =>
        f.vcodec && f.vcodec !== 'none' && f.url
      );

      if (videoFormats.length === 0) {
        console.warn('[YtDlpScraper] No video formats found');
        return ytdlp.webpage_url || ytdlp.original_url;
      }

      // Sort by quality (height * width, or just height if width not available)
      videoFormats.sort((a: any, b: any) => {
        const qualityA = (a.height || 0) * (a.width || a.height || 0);
        const qualityB = (b.height || 0) * (b.width || b.height || 0);
        return qualityB - qualityA;
      });

      const best = videoFormats[0];
      console.log(`[YtDlpScraper] Selected format: ${best.height}p (${best.format_id})`);
      console.log(`[YtDlpScraper] Video URL: ${best.url.substring(0, 100)}...`);

      return best.url;
    }

    // Fallback to page URL
    console.warn('[YtDlpScraper] No formats available, using page URL');
    return ytdlp.webpage_url || ytdlp.original_url;
  }

  /**
   * Format yt-dlp date (YYYYMMDD) to YYYY-MM-DD
   */
  private formatDate(dateStr: string): string {
    if (dateStr.length === 8) {
      return `${dateStr.substring(0, 4)}-${dateStr.substring(4, 6)}-${dateStr.substring(6, 8)}`;
    }
    return dateStr;
  }
}
