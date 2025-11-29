/**
 * DownloadService - Handles file downloads
 *
 * Priority order:
 * 1. Server-side download via Stash plugin task (no CORS, requires yt-dlp on server)
 * 2. Direct URL download (if videoUrl/imageUrl provided by scraper)
 * 3. yt-dlp via CORS proxy (test-app or fallback)
 * 4. Direct fetch with CORS proxy
 */

import type { IDownloadProgress } from '@/types';
import { fetchWithTimeout, getStorageItem } from '@/utils';
import { getStashService } from '@/services/stash/StashGraphQLService';
import { PLUGIN_ID, STORAGE_KEYS, DEFAULT_SETTINGS } from '@/constants';
import type { IPluginSettings } from '@/types';

export interface IDownloadOptions {
  onProgress?: (progress: IDownloadProgress) => void;
  signal?: AbortSignal;
  outputDir?: string;
  filename?: string;
  quality?: 'best' | '1080p' | '720p' | '480p';
}

export interface IServerDownloadResult {
  success: boolean;
  file_path?: string;
  file_size?: number;
  error?: string;
}

export class DownloadService {
  /**
   * Check if we're running in Stash environment (vs test-app)
   */
  isStashEnvironment(): boolean {
    try {
      const stashService = getStashService();
      return stashService.isStashEnvironment();
    } catch {
      return false;
    }
  }

  /**
   * Check if CORS proxy is enabled (for test environment)
   */
  private isCorsProxyEnabled(): boolean {
    if (typeof window === 'undefined') return false;
    return localStorage.getItem('corsProxyEnabled') === 'true';
  }

  /**
   * Get CORS proxy URL from settings
   */
  private getCorsProxyUrl(): string {
    if (typeof window === 'undefined') return 'http://localhost:8080';
    return localStorage.getItem('corsProxyUrl') || 'http://localhost:8080';
  }

  /**
   * Wrap URL with CORS proxy if enabled
   */
  private wrapWithProxy(url: string): string {
    if (!this.isCorsProxyEnabled()) return url;
    const proxyUrl = this.getCorsProxyUrl();
    return `${proxyUrl}/${url}`;
  }

  /**
   * Download using server-side plugin task (no CORS issues)
   * This uses Stash's runPluginTask to execute the Python backend
   * 
   * NOTE: Server-side downloads save files to the server's filesystem.
   * The file_path returned is on the server, not accessible via HTTP.
   * For browser downloads, use the regular download() method which returns Blobs.
   * Server-side downloads are better suited for direct Stash import (future enhancement).
   */
  async downloadServerSide(
    url: string,
    options: IDownloadOptions = {}
  ): Promise<IServerDownloadResult> {
    console.log('[DownloadService] Attempting server-side download via plugin task');

    try {
      const stashService = getStashService();

      if (!stashService.isStashEnvironment()) {
        return { success: false, error: 'Not in Stash environment' };
      }

      // Generate result_id for async result retrieval
      const resultId = `download-${Date.now()}-${Math.random().toString(36).substring(2, 9)}`;

      // Get server download path and proxy from settings
      const settings = getStorageItem<IPluginSettings>(STORAGE_KEYS.SETTINGS, DEFAULT_SETTINGS);
      const serverDownloadPath = options.outputDir || settings.serverDownloadPath || DEFAULT_SETTINGS.serverDownloadPath;
      const httpProxy = settings.httpProxy; // Optional proxy (e.g., http://proxy.example.com:8080)
      
      // Log proxy configuration for troubleshooting
      if (httpProxy) {
        console.log(`[DownloadService] Using HTTP proxy for server-side download: ${httpProxy}`);
      } else {
        console.log('[DownloadService] No HTTP proxy configured - using direct connection');
      }

      // Run the download task and wait for completion
      const taskResult = await stashService.runPluginTaskAndWait(
        PLUGIN_ID,
        'Download Video',
        {
          mode: 'download',
          url: url,
          output_dir: serverDownloadPath,
          filename: options.filename,
          quality: options.quality || 'best',
          result_id: resultId,
          proxy: httpProxy, // Pass proxy to Python script (optional)
        },
        {
          maxWaitMs: 600000, // 10 minutes for large downloads
          onProgress: (progress) => {
            if (options.onProgress) {
              // Convert job progress (0-100) to download progress
              options.onProgress({
                bytesDownloaded: 0,
                totalBytes: 0,
                percentage: progress,
                speed: 0,
                timeRemaining: undefined,
              });
            }
          },
        }
      );

      if (!taskResult.success) {
        return { success: false, error: taskResult.error || 'Download task failed' };
      }

      console.log('[DownloadService] Server-side download task completed, reading result...');

      // Read the result to get file_path
      // Stash extracts the 'output' field from PluginOutput and returns it directly
      const result = await stashService.runPluginOperation(PLUGIN_ID, {
        mode: 'read_result',
        result_id: resultId,
      }) as any; // Result is the data directly, not wrapped in IPluginTaskResult

      if (!result) {
        return { success: false, error: 'Failed to read download result' };
      }

      // Check for error in result (from PluginOutput.error)
      if (result.error) {
        return { success: false, error: result.error };
      }

      // Extract file_path from result (result is already the data object)
      const filePath = result.file_path;
      const fileSize = result.file_size;

      if (!filePath) {
        return { success: false, error: 'Download completed but no file_path in result' };
      }

      console.log('[DownloadService] Server-side download succeeded:', filePath);

      // Cleanup result file
      stashService.runPluginTask(PLUGIN_ID, 'Cleanup Result', {
        mode: 'cleanup_result',
        result_id: resultId,
      }).catch((err) => {
        console.warn('[DownloadService] Cleanup error (ignored):', err);
      });

      return {
        success: true,
        file_path: filePath,
        file_size: fileSize,
      };
    } catch (error) {
      const errorMsg = error instanceof Error ? error.message : String(error);
      console.error('[DownloadService] Server-side download failed:', errorMsg);
      return { success: false, error: errorMsg };
    }
  }

  /**
   * Check if yt-dlp is available on the server
   */
  async checkServerYtDlp(): Promise<boolean> {
    try {
      const stashService = getStashService();

      if (!stashService.isStashEnvironment()) {
        return false;
      }

      const result = await stashService.runPluginOperation(PLUGIN_ID, {
        mode: 'check_ytdlp',
      }) as any; // Result is the data directly, not wrapped in IPluginTaskResult

      // Stash extracts the 'output' field from PluginOutput and returns it directly
      // So result is already {available: bool, success: bool}
      return result?.available === true;
    } catch {
      return false;
    }
  }

  /**
   * Check if URL is from a domain that requires yt-dlp (domain-based check only)
   * This is used for server-side downloads in Stash (doesn't check CORS proxy)
   */
  private requiresYtDlpDomain(url: string): boolean {
    // Never use yt-dlp for direct image URLs
    const imageExtensions = ['.jpg', '.jpeg', '.png', '.gif', '.webp', '.bmp', '.svg'];
    const urlLower = url.toLowerCase();
    if (imageExtensions.some(ext => urlLower.includes(ext) && (urlLower.endsWith(ext) || urlLower.includes(ext + '?')))) {
      return false;
    }

    // Use yt-dlp for known problematic domains
    const ytDlpDomains = [
      'youporn.com',
      'pornhub.com',
      'xvideos.com',
      'xhamster.com',
      'redtube.com',
      'tube8.com',
      'spankwire.com',
      'youjizz.com',
      'keezmovies.com',
      'extremetube.com',
    ];

    try {
      const urlObj = new URL(url);
      const hostname = urlObj.hostname.toLowerCase();
      return ytDlpDomains.some(domain => hostname.includes(domain));
    } catch {
      return false;
    }
  }

  /**
   * Check if we should use yt-dlp for download (client-side check, requires CORS proxy)
   * Use yt-dlp for sites that typically require it (adult sites, streaming sites)
   * Never use yt-dlp for direct image URLs
   */
  private shouldUseYtDlp(url: string): boolean {
    if (typeof window === 'undefined') return false;
    
    const corsEnabled = this.isCorsProxyEnabled();
    if (!corsEnabled) return false;

    // Use domain-based check
    return this.requiresYtDlpDomain(url);
  }

  /**
   * Validate and normalize URL for yt-dlp
   */
  private validateUrl(url: string): string {
    console.log('[DownloadService] validateUrl called:', {
      url: url,
      type: typeof url,
      length: url?.length,
      isString: typeof url === 'string',
      isEmpty: !url || url.trim() === '',
    });

    if (!url || typeof url !== 'string') {
      const error = `Invalid URL: URL is empty or not a string. Received: ${JSON.stringify(url)} (type: ${typeof url})`;
      console.error('[DownloadService] URL validation failed:', error);
      throw new Error(error);
    }

    // Trim whitespace
    const trimmedUrl = url.trim();
    if (trimmedUrl === '') {
      const error = 'Invalid URL: URL is empty after trimming';
      console.error('[DownloadService] URL validation failed:', error);
      throw new Error(error);
    }

    // If it's already a valid absolute URL, return it
    try {
      const urlObj = new URL(trimmedUrl);
      const normalized = urlObj.href;
      console.log('[DownloadService] URL validated and normalized:', {
        original: url,
        trimmed: trimmedUrl,
        normalized: normalized,
        protocol: urlObj.protocol,
        hostname: urlObj.hostname,
      });
      return normalized;
    } catch (error) {
      // If it's not a valid URL, it might be relative or malformed
      const errorMsg = error instanceof Error ? error.message : 'Unknown error';
      const fullError = `Invalid URL format: ${trimmedUrl}. yt-dlp requires a complete URL (e.g., https://example.com/video). Error: ${errorMsg}`;
      console.error('[DownloadService] URL validation failed:', {
        url: trimmedUrl,
        error: errorMsg,
        fullError: fullError,
      });
      throw new Error(fullError);
    }
  }

  /**
   * Download file using yt-dlp (for sites that require it)
   */
  private async downloadWithYtDlp(
    url: string,
    options: IDownloadOptions = {}
  ): Promise<Blob> {
    console.log('[DownloadService] downloadWithYtDlp called with URL:', url);
    console.log('[DownloadService] URL type:', typeof url);
    console.log('[DownloadService] URL length:', url?.length);
    
    // Validate and normalize the URL
    let validatedUrl: string;
    try {
      validatedUrl = this.validateUrl(url);
      console.log('[DownloadService] URL validated successfully:', validatedUrl);
    } catch (error) {
      const errorMsg = error instanceof Error ? error.message : 'Unknown validation error';
      console.error('[DownloadService] URL validation failed:', {
        originalUrl: url,
        error: errorMsg,
        urlType: typeof url,
        urlLength: url?.length,
      });
      throw new Error(`Invalid URL for yt-dlp: ${errorMsg}. Original URL: ${url}`);
    }
    
    const { onProgress, signal } = options;
    const proxyUrl = this.getCorsProxyUrl();
    const downloadUrl = `${proxyUrl}/api/download?url=${encodeURIComponent(validatedUrl)}&format=best`;

    console.log('[DownloadService] Using yt-dlp to download:', {
      originalUrl: url,
      validatedUrl: validatedUrl,
      proxyUrl: proxyUrl,
      downloadEndpoint: downloadUrl,
    });

    let response: Response;
    try {
      // Use fetchWithTimeout with a longer timeout for downloads (5 minutes)
      // Downloads can take a while, but we still want to prevent infinite hangs
      response = await fetchWithTimeout(
        downloadUrl,
        { signal },
        300000 // 5 minutes timeout for downloads
      );
      console.log('[DownloadService] Fetch response status:', response.status, response.statusText);
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown network error';
      const errorStack = error instanceof Error ? error.stack : undefined;
      console.error('[DownloadService] Fetch error:', {
        error: errorMessage,
        stack: errorStack,
        downloadUrl: downloadUrl,
        validatedUrl: validatedUrl,
      });
      throw new Error(
        `yt-dlp download failed: ${errorMessage}. ` +
        `URL: ${validatedUrl}. ` +
        'Make sure yt-dlp is installed and CORS proxy is running.'
      );
    }

    if (!response.ok) {
      let errorData;
      try {
        const responseText = await response.text();
        try {
          errorData = JSON.parse(responseText);
        } catch {
          // If not JSON, use the text as error message
          errorData = { error: responseText || response.statusText };
        }
      } catch {
        errorData = { error: response.statusText };
      }
      
      console.error('[DownloadService] yt-dlp API error response:', {
        status: response.status,
        statusText: response.statusText,
        error: errorData,
        validatedUrl: validatedUrl,
        originalUrl: url,
        downloadEndpoint: downloadUrl,
      });
      
      // Provide more detailed error message with full stderr
      const errorMessage = errorData.error || response.statusText;
      const stderr = errorData.stderr ? `\n\nyt-dlp stderr:\n${errorData.stderr}` : '';
      const exitCode = errorData.exitCode ? ` (exit code: ${errorData.exitCode})` : '';
      const hint = errorData.message ? `\nHint: ${errorData.message}` : '';
      
      // Log full error details to console for debugging
      console.error('[DownloadService] Full yt-dlp error details:', {
        errorMessage,
        stderr: errorData.stderr,
        exitCode: errorData.exitCode,
        status: response.status,
        statusText: response.statusText,
        errorData,
        validatedUrl,
        originalUrl: url,
      });
      
      const fullError = new Error(
        `yt-dlp download failed${exitCode}: ${errorMessage}\n` +
        `URL: ${validatedUrl}${stderr}${hint}`
      );
      
      // Attach error data for fallback logic
      (fullError as any).errorData = errorData;
      (fullError as any).originalUrl = url;
      
      throw fullError;
    }

    const contentLength = response.headers.get('content-length');
    const totalBytes = contentLength ? parseInt(contentLength, 10) : 0;

    if (!response.body) {
      throw new Error('Response body is null');
    }

    const reader = response.body.getReader();
    const chunks: Uint8Array[] = [];
    let bytesDownloaded = 0;
    let startTime = Date.now();

    while (true) {
      const { done, value } = await reader.read();

      if (done) break;

      chunks.push(value);
      bytesDownloaded += value.length;

      if (onProgress) {
        const elapsedTime = (Date.now() - startTime) / 1000; // seconds
        const speed = bytesDownloaded / elapsedTime;
        const percentage = totalBytes > 0 ? (bytesDownloaded / totalBytes) * 100 : 0;
        const timeRemaining = totalBytes > 0 ? (totalBytes - bytesDownloaded) / speed : undefined;

        onProgress({
          bytesDownloaded,
          totalBytes,
          percentage,
          speed,
          timeRemaining,
        });
      }
    }

    return new Blob(chunks as BlobPart[]);
  }

  /**
   * Download file from URL and return as Blob (for browser downloads)
   * 
   * NOTE: This method returns Blobs for browser downloads.
   * For server-side downloads (which save to server filesystem), use downloadServerSide().
   * Server-side downloads are better suited for direct Stash import (future enhancement).
   * 
   * @param videoUrl Optional direct video URL from scraper (preferred over yt-dlp)
   * @param imageUrl Optional direct image URL from scraper (for image downloads)
   */
  async download(
    url: string,
    options: IDownloadOptions = {},
    videoUrl?: string,
    imageUrl?: string
  ): Promise<Blob> {
    // PRIORITY 1: If we have a direct imageUrl from scraper, use it (never use yt-dlp for images)
    if (imageUrl && imageUrl !== url && (imageUrl.startsWith('http://') || imageUrl.startsWith('https://'))) {
      console.log('[DownloadService] Using direct imageUrl from scraper');
      console.log('[DownloadService] Original URL:', url);
      console.log('[DownloadService] Direct imageUrl:', imageUrl);
      
      try {
        return await this.downloadDirect(imageUrl, options);
      } catch (error) {
        const errorMessage = error instanceof Error ? error.message : String(error);
        console.warn('[DownloadService] Direct imageUrl download failed:', errorMessage);
        throw error; // Don't fall back to yt-dlp for images
      }
    }

    // PRIORITY 2: If we have a direct videoUrl from scraper, use it first (like stacher7)
    // This is more reliable than yt-dlp for Pornhub
    if (videoUrl && videoUrl !== url && (videoUrl.startsWith('http://') || videoUrl.startsWith('https://'))) {
      console.log('[DownloadService] Using direct videoUrl from scraper (stacher7 approach)');
      console.log('[DownloadService] Original URL:', url);
      console.log('[DownloadService] Direct videoUrl:', videoUrl);
      
      try {
        return await this.downloadDirect(videoUrl, options);
      } catch (error) {
        const errorMessage = error instanceof Error ? error.message : String(error);
        console.warn('[DownloadService] Direct videoUrl download failed, trying yt-dlp as fallback:', errorMessage);
        // Fall through to yt-dlp as backup
      }
    }

    // PRIORITY 3: In Stash environment, use server-side download for videos that need yt-dlp
    // This bypasses CORS issues and uses server's yt-dlp
    // Use requiresYtDlpDomain (not shouldUseYtDlp) because server-side doesn't need CORS proxy
    if (this.isStashEnvironment() && this.requiresYtDlpDomain(url)) {
      console.log('[DownloadService] Stash environment: using server-side download for yt-dlp');
      try {
        // Try to get Stash library path for automatic indexing
        const stashService = getStashService();
        let libraryPath = await stashService.getVideoLibraryPath();

        if (libraryPath) {
          console.log('[DownloadService] Using Stash library path:', libraryPath);
          options.outputDir = libraryPath;
        } else {
          console.log('[DownloadService] No library path found, using default download path');
        }

        const serverResult = await this.downloadServerSide(url, options);
        if (serverResult.success && serverResult.file_path) {
          console.log('[DownloadService] Server-side download complete:', serverResult.file_path);

          // Trigger Stash scan for the downloaded file
          let scanJobId: string | null = null;
          if (libraryPath) {
            console.log('[DownloadService] Triggering Stash scan for:', serverResult.file_path);
            scanJobId = await stashService.triggerScanForFile(serverResult.file_path);
            if (scanJobId) {
              console.log('[DownloadService] Scan job started:', scanJobId);
            }
          }

          // Return empty blob with metadata - caller should use file_path for Stash import
          // This is a workaround since we can't return the actual file data from server
          const emptyBlob = new Blob([], { type: 'application/octet-stream' });
          (emptyBlob as any).__serverFilePath = serverResult.file_path;
          (emptyBlob as any).__libraryPath = libraryPath;
          (emptyBlob as any).__scanJobId = scanJobId;
          return emptyBlob;
        } else {
          throw new Error(serverResult.error || 'Server-side download failed');
        }
      } catch (error) {
        const errorMessage = error instanceof Error ? error.message : String(error);
        console.error('[DownloadService] Server-side download failed:', errorMessage);
        // Fall through to client-side yt-dlp as last resort (will fail with CORS, but at least we tried)
        console.warn('[DownloadService] Falling back to client-side yt-dlp (may fail with CORS)');
      }
    }

    // PRIORITY 4: Use client-side yt-dlp for sites that require it (test-app or fallback)
    // Never use yt-dlp for direct image URLs (checked in shouldUseYtDlp)
    if (this.shouldUseYtDlp(url)) {
      try {
        return await this.downloadWithYtDlp(url, options);
      } catch (error) {
        const errorMessage = error instanceof Error ? error.message : String(error);
        console.error('[DownloadService] Client-side yt-dlp also failed:', errorMessage);
        throw error;
      }
    }

    // Otherwise use regular fetch (with CORS proxy if enabled)
    return this.downloadDirect(url, options);
  }

  /**
   * Download file directly from URL (without yt-dlp)
   */
  private async downloadDirect(
    url: string,
    options: IDownloadOptions = {}
  ): Promise<Blob> {
    const { onProgress, signal } = options;
    const fetchUrl = this.wrapWithProxy(url);

    let response: Response;
    try {
      response = await fetchWithTimeout(fetchUrl, { signal }, 300000); // 5 minute timeout
    } catch (error) {
      // Handle network errors (CORS, connection issues, etc.)
      const errorMessage = error instanceof Error ? error.message : 'Unknown network error';

      if (errorMessage.includes('NetworkError') || errorMessage.includes('Failed to fetch')) {
        const corsEnabled = this.isCorsProxyEnabled();
        if (!corsEnabled) {
          throw new Error(
            'CORS Error: This site blocks direct browser requests. ' +
            'Please enable CORS proxy in settings to download from this site.'
          );
        } else {
          throw new Error(
            'Network Error: Failed to fetch resource. ' +
            'The CORS proxy may not be running or the site may be blocking the request. ' +
            `Proxy URL: ${this.getCorsProxyUrl()}`
          );
        }
      }
      throw error;
    }

    if (!response.ok) {
      throw new Error(`Download failed: ${response.statusText} (${response.status})`);
    }

    const contentLength = response.headers.get('content-length');
    const contentType = response.headers.get('content-type') || 'video/mp4'; // Default to video/mp4
    const totalBytes = contentLength ? parseInt(contentLength, 10) : 0;

    console.log('[DownloadService] Download starting:', {
      url: fetchUrl,
      contentType,
      contentLength: totalBytes,
      hasContentLength: !!contentLength,
    });

    if (!response.body) {
      throw new Error('Response body is null');
    }

    const reader = response.body.getReader();
    const chunks: Uint8Array[] = [];
    let bytesDownloaded = 0;
    let startTime = Date.now();

    while (true) {
      const { done, value } = await reader.read();

      if (done) break;

      chunks.push(value);
      bytesDownloaded += value.length;

      if (onProgress) {
        const elapsedTime = (Date.now() - startTime) / 1000; // seconds
        const speed = bytesDownloaded / elapsedTime;
        const percentage = totalBytes > 0 ? (bytesDownloaded / totalBytes) * 100 : 0;
        const timeRemaining = totalBytes > 0 ? (totalBytes - bytesDownloaded) / speed : undefined;

        onProgress({
          bytesDownloaded,
          totalBytes,
          percentage,
          speed,
          timeRemaining,
        });
      }
    }

    // Create blob with proper MIME type from response headers
    return new Blob(chunks as BlobPart[], { type: contentType });
  }

  /**
   * Download file and convert to data URL
   */
  async downloadAsDataUrl(url: string): Promise<string> {
    const blob = await this.download(url);
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onloadend = () => resolve(reader.result as string);
      reader.onerror = reject;
      reader.readAsDataURL(blob);
    });
  }

  /**
   * Get file extension from URL
   */
  getFileExtension(url: string): string {
    try {
      const pathname = new URL(url).pathname;
      const match = pathname.match(/\.([^.]+)$/);
      return match ? match[1]!.toLowerCase() : '';
    } catch {
      return '';
    }
  }

  /**
   * Detect content type from URL
   */
  async detectContentType(url: string): Promise<string | null> {
    try {
      const fetchUrl = this.wrapWithProxy(url);
      const response = await fetch(fetchUrl, { method: 'HEAD' });
      return response.headers.get('content-type');
    } catch {
      return null;
    }
  }
}

// Singleton instance
let instance: DownloadService | null = null;

export function getDownloadService(): DownloadService {
  if (!instance) {
    instance = new DownloadService();
  }
  return instance;
}
