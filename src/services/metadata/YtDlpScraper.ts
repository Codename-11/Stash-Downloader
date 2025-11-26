/**
 * YtDlpScraper - Uses yt-dlp for video URL extraction
 *
 * Supports two modes:
 * 1. Server-side (Stash): Uses Python backend via runPluginTask (NO CORS)
 * 2. Client-side (test-app): Uses CORS proxy
 *
 * Server-side mode is preferred as it bypasses CORS restrictions entirely.
 *
 * Server-side flow:
 * 1. Generate unique result_id
 * 2. Call runPluginTask for extract_metadata (saves to temp file)
 * 3. Poll for job completion
 * 4. Call runPluginOperation for read_result (reads temp file)
 * 5. Cleanup temp file
 */

import type { IMetadataScraper, IScrapedMetadata, ContentType } from '@/types';
import { fetchWithTimeout } from '@/utils';
import { getStashService } from '@/services/stash/StashGraphQLService';

// Plugin ID for runPluginTask/runPluginOperation calls
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
   * Generate a unique result ID for tracking async results
   */
  private generateResultId(): string {
    return `ytdlp-${Date.now()}-${Math.random().toString(36).substring(2, 9)}`;
  }

  /**
   * Server-side extraction using Python backend (NO CORS)
   * Uses file-based result passing:
   * 1. runPluginTask extracts metadata and saves to temp file
   * 2. runPluginOperation reads the result from temp file
   */
  private async scrapeServerSide(url: string): Promise<IScrapedMetadata> {
    const stashService = getStashService();
    const resultId = this.generateResultId();

    console.log('[YtDlpScraper] Starting server-side extraction with result_id:', resultId);

    let taskResult: { success: boolean; error?: string; jobId?: string };

    // Step 1: Run extract_metadata task (saves result to temp file)
    try {
      console.log('[YtDlpScraper] Calling runPluginTaskAndWait...');
      taskResult = await stashService.runPluginTaskAndWait(
        PLUGIN_ID,
        'Extract Metadata',
        {
          mode: 'extract_metadata',
          url: url,
          result_id: resultId,
        },
        {
          maxWaitMs: this.timeoutMs,
          onProgress: (progress) => {
            console.log(`[YtDlpScraper] Extraction progress: ${progress}%`);
          },
        }
      );
      console.log('[YtDlpScraper] runPluginTaskAndWait returned:', JSON.stringify(taskResult));
    } catch (taskError) {
      console.error('[YtDlpScraper] runPluginTaskAndWait threw error:', taskError);
      throw taskError;
    }

    if (!taskResult.success) {
      throw new Error(`yt-dlp extraction task failed: ${taskResult.error || 'Unknown error'}`);
    }

    // Step 2: Read the result from temp file
    console.log('[YtDlpScraper] Task succeeded, reading result...');
    let readResult: any;
    try {
      const operationResult = await stashService.runPluginOperation(PLUGIN_ID, {
        mode: 'read_result',
        result_id: resultId,
      });
      console.log('[YtDlpScraper] runPluginOperation returned:', JSON.stringify(operationResult, null, 2));

      // runPluginOperation returns the actual data directly
      // Stash extracts the 'output' field from PluginOutput and returns it as the result
      // So operationResult is already our data (title, description, etc.)
      if (!operationResult) {
        throw new Error('runPluginOperation returned null - check Stash server logs');
      }

      // Check if operationResult has an 'error' field (from PluginOutput.error)
      if (operationResult.error) {
        console.error('[YtDlpScraper] Python script returned error:', operationResult.error);
        throw new Error(`Python script error: ${operationResult.error}`);
      }
      
      // The result is already the extracted data from PluginOutput.output
      readResult = operationResult;
      
      // Validate we got valid data
      if (!readResult.title && readResult.success === false) {
        throw new Error('Invalid result data from Python script - missing title and success is false');
      }
      
      console.log('[YtDlpScraper] ✓ Successfully extracted readResult:', JSON.stringify(readResult, null, 2));
    } catch (readError) {
      console.error('[YtDlpScraper] Read result error:', readError);
      throw readError;
    }

    // Step 3: Cleanup (fire and forget)
    stashService.runPluginTask(PLUGIN_ID, 'Cleanup Result', {
      mode: 'cleanup_result',
      result_id: resultId,
    }).catch((cleanupErr) => {
      console.warn('[YtDlpScraper] Cleanup error (ignored):', cleanupErr);
    });

    console.log('[YtDlpScraper] Parsing result data...');
    console.log('[YtDlpScraper] Result structure:', JSON.stringify(readResult));

    // Check for error in result (should already be caught above, but check as fallback)
    // Note: result_error is now in pluginOutput.error, but check readResult just in case
    if (readResult.result_error) {
      throw new Error(`yt-dlp extraction failed: ${readResult.result_error}`);
    }

    // Also check legacy 'error' field for backwards compatibility
    if (readResult.error) {
      throw new Error(`yt-dlp extraction failed: ${readResult.error}`);
    }

    // Check success flag
    if (readResult.success === false || (readResult.success === undefined && !readResult.title)) {
      console.error('[YtDlpScraper] Result missing success flag or failed:', readResult);
      const errorMsg = readResult.result_error || readResult.error || 'Unknown error';
      throw new Error(`yt-dlp extraction did not succeed: ${errorMsg}`);
    }

    console.log('[YtDlpScraper] ✓ Got metadata from server-side yt-dlp:', readResult.title);

    // Convert to our metadata format
    return {
      url: url,
      title: readResult.title || undefined,
      description: readResult.description || undefined,
      date: readResult.upload_date ? this.formatDate(readResult.upload_date) : undefined,
      duration: readResult.duration || undefined,
      thumbnailUrl: readResult.thumbnail || undefined,
      performers: readResult.uploader ? [readResult.uploader] : [],
      tags: [],
      studio: readResult.uploader || undefined,
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
