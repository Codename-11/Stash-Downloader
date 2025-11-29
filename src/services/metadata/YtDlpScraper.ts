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

    // Extract video URL from the result
    // Try formats first (contains actual downloadable URLs), then fall back to top-level url
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
      console.log(`[YtDlpScraper] ✓ Video URL extracted: ${videoUrl.substring(0, 100)}...`);
    } else {
      console.log('[YtDlpScraper] ⚠ No video URL found in result');
    }

    // Convert to our metadata format
    // yt-dlp provides: tags (array), categories (array), and sometimes cast/actors
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
   * Client-side extraction using CORS proxy
   */
  private async scrapeClientSide(url: string): Promise<IScrapedMetadata> {
    try {
      const proxyUrl = this.getProxyUrl();
      
      // Get HTTP proxy setting if enabled (for routing yt-dlp through HTTP/SOCKS proxy)
      let httpProxyUrl: string | undefined;
      if (typeof window !== 'undefined') {
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
      }
      
      // Build extract URL with optional proxy parameter
      let extractUrl = `${proxyUrl}/api/extract?url=${encodeURIComponent(url)}`;
      if (httpProxyUrl) {
        extractUrl += `&proxy=${encodeURIComponent(httpProxyUrl)}`;
        console.log('[YtDlpScraper] yt-dlp will use HTTP proxy for extraction');
      }

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

    // Extract tags and performers from yt-dlp metadata
    const tags = ytdlp.tags || ytdlp.categories || [];
    const performers = this.extractPerformers(ytdlp);

    // Build base metadata
    const metadata: IScrapedMetadata = {
      url: originalUrl,
      videoUrl: videoUrl,
      title: ytdlp.title || undefined,
      description: ytdlp.description || undefined,
      date: ytdlp.upload_date ? this.formatDate(ytdlp.upload_date) : undefined,
      duration: ytdlp.duration || undefined,
      thumbnailUrl: ytdlp.thumbnail || undefined,
      performers: performers,
      tags: tags,
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
    // First, try to find best quality from formats array (preferred for HLS streams)
    if (ytdlp.formats && Array.isArray(ytdlp.formats) && ytdlp.formats.length > 0) {
      console.log(`[YtDlpScraper] Found ${ytdlp.formats.length} formats, selecting best quality...`);

      // Filter for video formats (not audio-only)
      // For HLS streams, formats may have url, manifest_url, or need to be constructed
      const videoFormats = ytdlp.formats.filter((f: any) => {
        const hasVideoCodec = f.vcodec && f.vcodec !== 'none';
        const hasUrl = f.url || f.manifest_url;  // Check both url and manifest_url
        const hasHeight = f.height;  // Has height = likely video
        const isVideoFormat = f.format_id && (
          f.format_id.toLowerCase().includes('hls') || 
          f.format_id.toLowerCase().includes('mp4') || 
          f.format_id.toLowerCase().includes('video') ||
          f.format_id.toLowerCase().includes('dash')
        );
        // Include if it has video codec OR (has URL/manifest and is video format) OR has height
        return (hasVideoCodec || (hasUrl && isVideoFormat) || (hasHeight && hasUrl));
      });

      if (videoFormats.length > 0) {
      // Sort by quality (height * width, or just height if width not available)
        // Higher quality first
      videoFormats.sort((a: any, b: any) => {
        const qualityA = (a.height || 0) * (a.width || a.height || 0);
        const qualityB = (b.height || 0) * (b.width || b.height || 0);
        return qualityB - qualityA;
      });

        // Try formats in order of quality
        for (const format of videoFormats) {
          const videoUrl = format.url || format.manifest_url;
          if (videoUrl) {
            const quality = format.height ? `${format.height}p` : undefined;
            console.log(`[YtDlpScraper] ✓ Selected format: ${quality || 'unknown'} (${format.format_id})`);
            console.log(`[YtDlpScraper] Video URL: ${videoUrl.substring(0, 100)}...`);
            return { videoUrl: videoUrl, quality };
          }
        }
        
        // If no format has URL, but we have formats, use top-level URL if available
        if (ytdlp.url) {
          const bestFormat = videoFormats[0];
          const quality = bestFormat.height ? `${bestFormat.height}p` : undefined;
          console.log(`[YtDlpScraper] Formats have no URLs, using top-level URL with best quality: ${quality || 'unknown'}`);
          return { videoUrl: ytdlp.url, quality };
        }
      }
    }

    // Fallback: If there's a direct URL field at top level, use it (for HLS, this is often the best quality manifest)
    if (ytdlp.url) {
      console.log('[YtDlpScraper] Using top-level URL from yt-dlp (no formats with URLs found)');
      // Try to extract quality from ytdlp data or find best quality from formats
      let quality: string | undefined;
      if (ytdlp.height) {
        quality = `${ytdlp.height}p`;
      } else if (ytdlp.formats && Array.isArray(ytdlp.formats)) {
        // Find highest quality format to determine quality
        const formatsWithHeight = ytdlp.formats.filter((f: any) => f.height).sort((a: any, b: any) => (b.height || 0) - (a.height || 0));
        if (formatsWithHeight.length > 0) {
          quality = `${formatsWithHeight[0].height}p`;
        }
      }
      return { videoUrl: ytdlp.url, quality };
    }

    // Last resort: use webpage URL
    console.warn('[YtDlpScraper] No video URL found, using page URL');
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

  /**
   * Extract performers from yt-dlp metadata
   * yt-dlp returns performers in different fields depending on the site:
   * - cast: array of cast members (Pornhub, some sites)
   * - actors: array of actors (some sites)
   * - artist: artist name (music videos)
   * - uploader: channel/uploader name (fallback)
   */
  private extractPerformers(ytdlp: any): string[] {
    const performers: string[] = [];

    // Try cast first (common for adult sites)
    if (ytdlp.cast && Array.isArray(ytdlp.cast)) {
      performers.push(...ytdlp.cast);
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
