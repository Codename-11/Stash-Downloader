/**
 * YtDlpScraper - Server-side yt-dlp video extraction via Python backend
 *
 * Flow:
 * 1. Generate unique result_id
 * 2. Call runPluginTask for extract_metadata (saves to temp file)
 * 3. Poll for job completion
 * 4. Call runPluginOperation for read_result (reads temp file)
 * 5. Cleanup temp file
 */

import type { IMetadataScraper, IScrapedMetadata } from '@/types';
import { ContentType } from '@/types';
import { getStashService } from '@/services/stash/StashGraphQLService';

// Plugin ID for runPluginTask/runPluginOperation calls
const PLUGIN_ID = 'stash-downloader';

export class YtDlpScraper implements IMetadataScraper {
  name = 'yt-dlp';
  supportedDomains = ['*']; // Supports all domains
  contentTypes = [ContentType.Video]; // Primarily for video extraction
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
    console.log('[YtDlpScraper] Using server-side yt-dlp to extract:', url);
    return this.scrapeServerSide(url);
  }

  /**
   * Generate a unique result ID for tracking async results
   */
  private generateResultId(): string {
    return `ytdlp-${Date.now()}-${Math.random().toString(36).substring(2, 9)}`;
  }

  /**
   * Server-side extraction using Python backend
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

      // Get proxy setting from localStorage if available
      let proxy: string | undefined;
      if (typeof window !== 'undefined') {
        const settings = localStorage.getItem('stash-downloader:settings');
        if (settings) {
          try {
            const parsed = JSON.parse(settings);
            proxy = parsed.httpProxy;
          } catch {
            // Ignore parse errors
          }
        }
      }

      // Log proxy configuration for troubleshooting
      if (proxy) {
        console.log(`[YtDlpScraper] Using HTTP proxy for metadata extraction: ${proxy}`);
      } else {
        console.log('[YtDlpScraper] No HTTP proxy configured - using direct connection');
      }

      taskResult = await stashService.runPluginTaskAndWait(
        PLUGIN_ID,
        'Extract Metadata',
        {
          mode: 'extract_metadata',
          url: url,
          result_id: resultId,
          proxy: proxy, // Pass proxy if configured
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

      console.log('[YtDlpScraper] Successfully extracted readResult:', JSON.stringify(readResult, null, 2));
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

    // Check for error in result
    if (readResult.result_error || readResult.error) {
      throw new Error(`yt-dlp extraction failed: ${readResult.result_error || readResult.error}`);
    }

    // Check success flag
    if (readResult.success === false || (readResult.success === undefined && !readResult.title)) {
      console.error('[YtDlpScraper] Result missing success flag or failed:', readResult);
      throw new Error(`yt-dlp extraction did not succeed: ${readResult.result_error || readResult.error || 'Unknown error'}`);
    }

    console.log('[YtDlpScraper] Got metadata from server-side yt-dlp:', readResult.title);

    // Extract video URL from the result
    let videoUrl: string | undefined;
    let quality: string | undefined;

    if (readResult.formats && Array.isArray(readResult.formats) && readResult.formats.length > 0) {
      // Sort by height descending to get best quality first
      const sortedFormats = [...readResult.formats].sort((a: any, b: any) => (b.height || 0) - (a.height || 0));
      for (const format of sortedFormats) {
        if (format.url || format.manifest_url) {
          videoUrl = format.url || format.manifest_url;
          quality = format.height ? `${format.height}p` : undefined;
          console.log(`[YtDlpScraper] Selected format: ${quality || 'unknown'} from ${sortedFormats.length} formats`);
          break;
        }
      }
    }

    // Fall back to top-level URL if no format URL found
    if (!videoUrl && readResult.url) {
      videoUrl = readResult.url;
      quality = readResult.height ? `${readResult.height}p` : undefined;
      console.log('[YtDlpScraper] Using top-level URL');
    }

    if (videoUrl) {
      console.log(`[YtDlpScraper] Video URL extracted: ${videoUrl.substring(0, 100)}...`);
    } else {
      console.log('[YtDlpScraper] No video URL found in result');
    }

    // Convert to our metadata format
    const tags = readResult.tags || readResult.categories || [];
    const performers = this.extractPerformers(readResult);

    return {
      url: url,
      videoUrl: videoUrl,
      title: readResult.title || undefined,
      description: readResult.description || undefined,
      date: readResult.upload_date ? this.formatDate(readResult.upload_date) : undefined,
      duration: readResult.duration || undefined,
      thumbnailUrl: readResult.thumbnail || undefined,
      performers: performers,
      tags: tags,
      studio: readResult.uploader || readResult.channel || undefined,
      quality: quality,
      contentType: 'video' as ContentType,
    };
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

  /**
   * Extract performers from yt-dlp metadata
   */
  private extractPerformers(ytdlp: any): string[] {
    const performers: string[] = [];

    // Try cast first (common for adult sites like Pornhub)
    if (ytdlp.cast && Array.isArray(ytdlp.cast)) {
      performers.push(...ytdlp.cast);
    }

    // Try creators
    if (ytdlp.creators && Array.isArray(ytdlp.creators)) {
      performers.push(...ytdlp.creators);
    }

    // Try actors
    if (ytdlp.actors && Array.isArray(ytdlp.actors)) {
      performers.push(...ytdlp.actors);
    }

    // Try artist (music videos)
    if (ytdlp.artist && typeof ytdlp.artist === 'string') {
      performers.push(ytdlp.artist);
    }

    // Fallback to uploader if no performers found
    if (performers.length === 0 && ytdlp.uploader) {
      performers.push(ytdlp.uploader);
    }

    // Deduplicate
    return [...new Set(performers)];
  }
}
