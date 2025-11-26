/**
 * YtDlpScraper - Uses yt-dlp for video URL extraction
 *
 * Supports two modes:
 * 1. Server-side (Stash): Uses Python backend via runPluginTask (NO CORS)
 * 2. Client-side (test-app): Uses CORS proxy
 *
 * Server-side mode is preferred as it bypasses CORS restrictions entirely.
 */

import type { IMetadataScraper, IScrapedMetadata, ContentType } from '@/types';
import { fetchWithTimeout } from '@/utils';
import { getStashService } from '@/services/stash/StashGraphQLService';

// Plugin ID for runPluginTask calls
const PLUGIN_ID = 'stash-downloader';

export class YtDlpScraper implements IMetadataScraper {
  name = 'yt-dlp';
  supportedDomains = ['*']; // Supports all domains
  private readonly timeoutMs = 60000; // 60 seconds for yt-dlp (can be slow)

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

    const stashService = getStashService();

    // Use server-side extraction in Stash (bypasses CORS)
    if (stashService.isStashEnvironment()) {
      console.log('[YtDlpScraper] Using server-side extraction (no CORS)');
      return this.scrapeServerSide(url);
    }

    // Fall back to CORS proxy in test-app
    console.log('[YtDlpScraper] Using client-side extraction via CORS proxy');
    return this.scrapeClientSide(url);
  }

  /**
   * Server-side extraction using Python backend (NO CORS)
   * Uses runPluginOperation for synchronous execution with direct result
   */
  private async scrapeServerSide(url: string): Promise<IScrapedMetadata> {
    const stashService = getStashService();

    console.log('[YtDlpScraper] Calling runPluginOperation for metadata extraction...');

    // Use runPluginOperation for synchronous execution
    // This calls the Python script and returns the JSON result directly
    const result = await stashService.runPluginOperation(PLUGIN_ID, {
      task: 'extract_metadata',
      url: url,
    });

    console.log('[YtDlpScraper] runPluginOperation result:', result);

    // Check if result indicates success
    if (!result) {
      throw new Error('No response from yt-dlp extraction task');
    }

    // The result is parsed from Python script's JSON output
    const data = result as any;

    if (data.error) {
      throw new Error(`yt-dlp extraction failed: ${data.error}`);
    }

    if (!data.success) {
      throw new Error('yt-dlp extraction did not succeed');
    }

    console.log('[YtDlpScraper] ✓ Got metadata from server-side yt-dlp:', data.title);

    // Convert to our metadata format
    return {
      url: url,
      title: data.title || undefined,
      description: data.description || undefined,
      date: data.upload_date ? this.formatDate(data.upload_date) : undefined,
      duration: data.duration || undefined,
      thumbnailUrl: data.thumbnail || undefined,
      performers: data.uploader ? [data.uploader] : [],
      tags: [],
      studio: data.uploader || undefined,
      contentType: 'video' as ContentType,
    };
  }

  /**
   * Client-side extraction using CORS proxy
   */
  private async scrapeClientSide(url: string): Promise<IScrapedMetadata> {
    try {
      const proxyUrl = this.getProxyUrl();
      const extractUrl = `${proxyUrl}/api/extract?url=${encodeURIComponent(url)}`;

      console.log('[YtDlpScraper] Calling yt-dlp API:', extractUrl);

      const response = await fetchWithTimeout(extractUrl, {}, this.timeoutMs);

      if (!response.ok) {
        const error = await response.json().catch(() => ({ error: response.statusText }));
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
    // Find the best video format and quality
    const { videoUrl, quality } = this.selectBestVideoFormat(ytdlp);

    // Build base metadata
    const metadata: IScrapedMetadata = {
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
      quality: quality,
      contentType: 'video' as ContentType,
    };

    // Add quality to title if available
    if (quality && metadata.title) {
      metadata.title = `[${quality}] ${metadata.title}`;
    }

    return metadata;
  }

  /**
   * Select the best video format from yt-dlp formats list
   * Returns both the video URL and quality
   */
  private selectBestVideoFormat(ytdlp: any): { videoUrl: string | undefined; quality: string | undefined } {
    // If there's a direct URL field, use it
    if (ytdlp.url) {
      console.log('[YtDlpScraper] Using direct URL from yt-dlp');
      // Try to extract quality from ytdlp data
      const quality = ytdlp.height ? `${ytdlp.height}p` : undefined;
      return { videoUrl: ytdlp.url, quality };
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
        return { videoUrl: ytdlp.webpage_url || ytdlp.original_url, quality: undefined };
      }

      // Sort by quality (height * width, or just height if width not available)
      videoFormats.sort((a: any, b: any) => {
        const qualityA = (a.height || 0) * (a.width || a.height || 0);
        const qualityB = (b.height || 0) * (b.width || b.height || 0);
        return qualityB - qualityA;
      });

      const best = videoFormats[0];
      const quality = best.height ? `${best.height}p` : undefined;
      console.log(`[YtDlpScraper] Selected format: ${quality || 'unknown'} (${best.format_id})`);
      console.log(`[YtDlpScraper] Video URL: ${best.url.substring(0, 100)}...`);

      return { videoUrl: best.url, quality };
    }

    // Fallback to page URL
    console.warn('[YtDlpScraper] No formats available, using page URL');
    return { videoUrl: ytdlp.webpage_url || ytdlp.original_url, quality: undefined };
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
