/**
 * DownloadService - Handles file downloads
 *
 * In Stash environment:
 * 1. Server-side download via Stash plugin task (uses yt-dlp on server)
 * 2. Direct URL download (if videoUrl/imageUrl provided by scraper)
 */

import type { IDownloadProgress, IGalleryProgress } from '@/types';
import { ContentType } from '@/types';
import { fetchWithTimeout, getStorageItem, createLogger } from '@/utils';
import { getStashService } from '@/services/stash/StashGraphQLService';
import { PLUGIN_ID, STORAGE_KEYS, DEFAULT_SETTINGS } from '@/constants';
import type { IPluginSettings } from '@/types';

const log = createLogger('DownloadService');

export interface IDownloadOptions {
  onProgress?: (progress: IDownloadProgress) => void;
  signal?: AbortSignal;
  outputDir?: string;
  filename?: string;
  quality?: 'best' | '1080p' | '720p' | '480p';
  /** Fallback URL for yt-dlp if direct download fails (e.g., original page URL) */
  fallbackUrl?: string;
}

export interface IServerDownloadResult {
  success: boolean;
  file_path?: string;
  file_size?: number;
  error?: string;
}

export interface IGalleryDownloadResult {
  success: boolean;
  filePaths: string[];
  totalImages: number;
  error?: string;
}

export class DownloadService {
  /**
   * Check if we're running in Stash environment
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
   * Download using server-side plugin task (no CORS issues)
   * This uses Stash's runPluginTask to execute the Python backend
   */
  async downloadServerSide(
    url: string,
    options: IDownloadOptions = {}
  ): Promise<IServerDownloadResult> {
    log.info('Attempting server-side download via plugin task');
    log.debug('Download URL:', url);
    if (options.fallbackUrl) {
      log.info('Fallback URL (for yt-dlp retry):', options.fallbackUrl);
    }

    try {
      const stashService = getStashService();

      if (!stashService.isStashEnvironment()) {
        return { success: false, error: 'Not in Stash environment' };
      }

      // Generate IDs for result and progress tracking
      const uniqueId = `${Date.now()}-${Math.random().toString(36).substring(2, 9)}`;
      const resultId = `download-${uniqueId}`;
      const progressId = uniqueId; // Progress file will be "progress-{uniqueId}"
      log.debug('Result ID:', resultId);
      log.debug('Progress ID:', progressId);

      // Get server download path and proxy from settings
      // Priority: plugin setting > Stash library > default
      const settings = getStorageItem<IPluginSettings>(STORAGE_KEYS.SETTINGS, DEFAULT_SETTINGS);
      const serverDownloadPath = settings.serverDownloadPath || options.outputDir || DEFAULT_SETTINGS.serverDownloadPath;
      const httpProxy = settings.httpProxy;

      // Log which path was determined and why (debug only - visible in UI)
      if (settings.serverDownloadPath) {
        log.debug('Download path (from plugin settings):', serverDownloadPath);
      } else if (options.outputDir) {
        log.debug('Download path (from Stash library):', serverDownloadPath);
      } else {
        log.debug('Download path (default fallback):', serverDownloadPath);
      }

      if (httpProxy) {
        log.debug(`Using HTTP proxy: ${httpProxy}`);
      }

      // Run the download task and wait for completion
      log.info('Starting download task with parameters:', JSON.stringify({
        url: url.substring(0, 80) + (url.length > 80 ? '...' : ''),
        fallback_url: options.fallbackUrl ? options.fallbackUrl.substring(0, 80) : undefined,
        output_dir: serverDownloadPath,
        quality: options.quality || 'best',
        has_proxy: !!httpProxy,
      }));

      // Start progress polling in background
      let progressPollInterval: ReturnType<typeof setInterval> | null = null;
      if (options.onProgress) {
        progressPollInterval = setInterval(async () => {
          try {
            const progressResult = await stashService.runPluginOperation(PLUGIN_ID, {
              mode: 'read_result',
              result_id: `progress-${progressId}`,
            }) as any;

            if (progressResult?.retrieved && progressResult.status === 'downloading') {
              options.onProgress!({
                bytesDownloaded: progressResult.downloaded_bytes || 0,
                totalBytes: progressResult.total_bytes || 0,
                percentage: progressResult.percentage || 0,
                speed: progressResult.speed || 0,
                timeRemaining: progressResult.eta,
              });
            }
          } catch {
            // Ignore progress polling errors - file might not exist yet
          }
        }, 1000); // Poll every second
      }

      const taskResult = await stashService.runPluginTaskAndWait(
        PLUGIN_ID,
        'Download Video',
        {
          mode: 'download',
          url: url,
          fallback_url: options.fallbackUrl, // Original page URL for yt-dlp fallback
          output_dir: serverDownloadPath,
          filename: options.filename,
          quality: options.quality || 'best',
          result_id: resultId,
          progress_id: progressId, // For real-time progress updates
          proxy: httpProxy,
        },
        {
          maxWaitMs: 600000, // 10 minutes for large downloads
          onProgress: (_stashJobProgress) => {
            // This is Stash job progress (usually stays at 0), not download progress
            // Real progress comes from progress polling above
          },
        }
      );

      // Stop progress polling
      if (progressPollInterval) {
        clearInterval(progressPollInterval);
      }

      // Cleanup progress file
      stashService.runPluginOperation(PLUGIN_ID, {
        mode: 'cleanup_result',
        result_id: `progress-${progressId}`,
      }).catch(() => { /* ignore cleanup errors */ });

      log.debug('Task result:', JSON.stringify(taskResult));

      if (!taskResult.success) {
        log.error('Download task failed:', taskResult.error || 'Unknown error');
        return { success: false, error: taskResult.error || 'Download task failed' };
      }

      log.info('Server-side download task completed, reading result...');

      // Read the result to get file_path
      const result = await stashService.runPluginOperation(PLUGIN_ID, {
        mode: 'read_result',
        result_id: resultId,
      }) as any;

      log.debug('Read result response:', JSON.stringify(result));

      if (!result) {
        log.error('Failed to read download result - got null/undefined');
        return { success: false, error: 'Failed to read download result' };
      }

      // Check for task_error (renamed from result_error/error to avoid GraphQL error interpretation)
      if (result.task_error) {
        log.error('Download task error:', result.task_error);
        return { success: false, error: result.task_error };
      }

      // Legacy check for error field (shouldn't happen with updated Python script)
      if (result.error) {
        log.error('Download error:', result.error);
        return { success: false, error: result.error };
      }

      const filePath = result.file_path;
      const fileSize = result.file_size;

      if (!filePath) {
        log.error('Download completed but no file_path in result');
        return { success: false, error: 'Download completed but no file_path in result' };
      }

      log.success('Server-side download succeeded', filePath);

      // Cleanup result file
      stashService.runPluginTask(PLUGIN_ID, 'Cleanup Result', {
        mode: 'cleanup_result',
        result_id: resultId,
      }).catch((err) => {
        log.warn('Cleanup error (ignored)', String(err));
      });

      return {
        success: true,
        file_path: filePath,
        file_size: fileSize,
      };
    } catch (error) {
      const errorMsg = error instanceof Error ? error.message : String(error);
      log.error(`Server-side download failed: ${errorMsg}`);
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
      }) as any;

      return result?.available === true;
    } catch {
      return false;
    }
  }

  /**
   * Check if URL is external (not same-origin)
   * In Stash environment, external URLs must use server-side download to avoid CSP issues
   */
  private isExternalUrl(url: string): boolean {
    try {
      const urlObj = new URL(url);
      const currentOrigin = window.location.origin;
      return urlObj.origin !== currentOrigin;
    } catch {
      // If URL parsing fails, assume it's external
      return true;
    }
  }


  /**
   * Download an image file directly
   */
  async downloadImage(
    imageUrl: string,
    options: IDownloadOptions = {}
  ): Promise<Blob> {
    const { onProgress, signal } = options;

    log.info(`Downloading image: ${imageUrl}`);

    let response: Response;
    try {
      response = await fetchWithTimeout(imageUrl, { signal }, 60000);
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown network error';
      throw new Error(`Image download failed: ${errorMessage}`);
    }

    if (!response.ok) {
      throw new Error(`Image download failed: ${response.statusText} (${response.status})`);
    }

    const contentType = response.headers.get('content-type') || 'image/jpeg';
    const contentLength = response.headers.get('content-length');
    const totalBytes = contentLength ? parseInt(contentLength, 10) : 0;

    if (!response.body) {
      throw new Error('Response body is null');
    }

    const reader = response.body.getReader();
    const chunks: Uint8Array[] = [];
    let bytesDownloaded = 0;
    const startTime = Date.now();

    while (true) {
      const { done, value } = await reader.read();
      if (done) break;

      chunks.push(value);
      bytesDownloaded += value.length;

      if (onProgress) {
        const elapsedTime = (Date.now() - startTime) / 1000;
        const speed = bytesDownloaded / elapsedTime;

        onProgress({
          bytesDownloaded,
          totalBytes,
          percentage: totalBytes > 0 ? (bytesDownloaded / totalBytes) * 100 : 0,
          speed,
          timeRemaining: totalBytes > 0 ? (totalBytes - bytesDownloaded) / speed : undefined,
        });
      }
    }

    log.success(`Image download complete: ${bytesDownloaded} bytes`);
    return new Blob(chunks as BlobPart[], { type: contentType });
  }

  /**
   * Download a gallery (multiple images from one URL)
   */
  async downloadGallery(
    images: Array<{ url: string; filename?: string }>,
    options: IDownloadOptions = {},
    onGalleryProgress?: (progress: IGalleryProgress) => void
  ): Promise<{ blobs: Blob[]; filePaths: string[] }> {
    const downloadedBlobs: Blob[] = [];
    const filePaths: string[] = [];

    log.info(`Starting gallery download: ${images.length} images`);

    for (let i = 0; i < images.length; i++) {
      const image = images[i]!;

      if (onGalleryProgress) {
        onGalleryProgress({
          totalImages: images.length,
          downloadedImages: i,
          currentImageUrl: image.url,
        });
      }

      try {
        log.info(`Downloading gallery image ${i + 1}/${images.length}: ${image.url}`);
        const blob = await this.downloadImage(image.url, options);
        downloadedBlobs.push(blob);

        const filename = image.filename ?? this.getFilenameFromUrl(image.url, i);
        filePaths.push(filename);
      } catch (error) {
        const errorMsg = error instanceof Error ? error.message : String(error);
        log.error(`Failed to download gallery image ${i + 1}: ${errorMsg}`);
      }
    }

    if (onGalleryProgress) {
      onGalleryProgress({
        totalImages: images.length,
        downloadedImages: images.length,
        currentImageUrl: undefined,
      });
    }

    log.success(`Gallery download complete: ${downloadedBlobs.length}/${images.length} images`);
    return { blobs: downloadedBlobs, filePaths };
  }

  /**
   * Get filename from URL for gallery images
   */
  private getFilenameFromUrl(url: string, index: number): string {
    try {
      const urlObj = new URL(url);
      const pathname = urlObj.pathname;
      const filename = pathname.split('/').pop();
      if (filename && filename.includes('.')) {
        return filename;
      }
    } catch {
      // Ignore URL parsing errors
    }
    const ext = this.getFileExtension(url) || 'jpg';
    return `image_${index + 1}.${ext}`;
  }

  /**
   * Download file from URL and return as Blob
   */
  async download(
    url: string,
    options: IDownloadOptions = {},
    videoUrl?: string,
    imageUrl?: string,
    contentType?: ContentType
  ): Promise<Blob> {
    // Route image downloads through simpler path
    if (contentType === ContentType.Image) {
      const targetUrl = imageUrl || url;
      log.info('Routing to image download path');
      return this.downloadImage(targetUrl, options);
    }

    // PRIORITY 1: If we have a direct imageUrl from scraper, use it
    if (imageUrl && imageUrl !== url && (imageUrl.startsWith('http://') || imageUrl.startsWith('https://'))) {
      log.debug('Using direct imageUrl from scraper');
      try {
        return await this.downloadDirect(imageUrl, options);
      } catch (error) {
        const errorMessage = error instanceof Error ? error.message : String(error);
        log.warn(`Direct imageUrl download failed: ${errorMessage}`);
        throw error;
      }
    }

    // PRIORITY 2: If we have a direct videoUrl from scraper
    if (videoUrl && videoUrl !== url && (videoUrl.startsWith('http://') || videoUrl.startsWith('https://'))) {
      log.debug('Using direct videoUrl from scraper');
      
      // In Stash environment, use server-side download for external URLs to avoid CSP issues
      if (this.isStashEnvironment() && this.isExternalUrl(videoUrl)) {
        log.debug('Using server-side download for external videoUrl (CSP bypass)');
        try {
          const stashService = getStashService();
          const libraryPath = await stashService.getVideoLibraryPath();

          if (libraryPath) {
            log.debug('Using Stash library path:', libraryPath);
            options.outputDir = libraryPath;
          }

          // Pass original page URL as fallback for yt-dlp if direct download fails
          const serverResult = await this.downloadServerSide(videoUrl, { ...options, fallbackUrl: url });
          if (serverResult.success && serverResult.file_path) {
            log.debug('Server-side download complete:', serverResult.file_path);

            let scanJobId: string | null = null;
            if (libraryPath) {
              log.debug('Triggering Stash scan for:', serverResult.file_path);
              scanJobId = await stashService.triggerScanForFile(serverResult.file_path);
              if (scanJobId) {
                log.debug('Scan job started:', scanJobId);
              }
            }

            // Return empty blob with metadata
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
          log.error(`Server-side download failed: ${errorMessage}`);
          throw error;
        }
      }

      // Fallback to direct download (for same-origin URLs or non-Stash environments)
      try {
        return await this.downloadDirect(videoUrl, options);
      } catch (error) {
        const errorMessage = error instanceof Error ? error.message : String(error);
        log.warn(`Direct videoUrl download failed: ${errorMessage}`);
        // Fall through to server-side download
      }
    }

    // PRIORITY 3: Use server-side download for external URLs in Stash environment
    // This handles both yt-dlp domains and any other external URLs (CSP bypass)
    if (this.isStashEnvironment() && this.isExternalUrl(url)) {
      log.debug('Using server-side download for external URL (CSP bypass)');
      if (options.fallbackUrl) {
        log.debug('Fallback URL available for yt-dlp retry:', options.fallbackUrl);
      }
      try {
        const stashService = getStashService();
        const libraryPath = await stashService.getVideoLibraryPath();

        if (libraryPath) {
          log.debug('Using Stash library path:', libraryPath);
          options.outputDir = libraryPath;
        }

        // Pass fallbackUrl for yt-dlp if direct download fails
        const serverResult = await this.downloadServerSide(url, options);
        if (serverResult.success && serverResult.file_path) {
          log.debug('Server-side download complete:', serverResult.file_path);

          let scanJobId: string | null = null;
          if (libraryPath) {
            log.debug('Triggering Stash scan for:', serverResult.file_path);
            scanJobId = await stashService.triggerScanForFile(serverResult.file_path);
            if (scanJobId) {
              log.debug('Scan job started:', scanJobId);
            }
          }

          // Return empty blob with metadata
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
        log.error(`Server-side download failed: ${errorMessage}`);
        throw error;
      }
    }

    // Otherwise use regular fetch (for same-origin URLs or non-Stash environments)
    return this.downloadDirect(url, options);
  }

  /**
   * Download file directly from URL
   */
  private async downloadDirect(
    url: string,
    options: IDownloadOptions = {}
  ): Promise<Blob> {
    const { onProgress, signal } = options;

    let response: Response;
    try {
      response = await fetchWithTimeout(url, { signal }, 300000);
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown network error';
      throw new Error(`Download failed: ${errorMessage}`);
    }

    if (!response.ok) {
      throw new Error(`Download failed: ${response.statusText} (${response.status})`);
    }

    const contentLength = response.headers.get('content-length');
    const contentType = response.headers.get('content-type') || 'video/mp4';
    const totalBytes = contentLength ? parseInt(contentLength, 10) : 0;

    if (!response.body) {
      throw new Error('Response body is null');
    }

    const reader = response.body.getReader();
    const chunks: Uint8Array[] = [];
    let bytesDownloaded = 0;
    const startTime = Date.now();

    while (true) {
      const { done, value } = await reader.read();

      if (done) break;

      chunks.push(value);
      bytesDownloaded += value.length;

      if (onProgress) {
        const elapsedTime = (Date.now() - startTime) / 1000;
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
      const response = await fetch(url, { method: 'HEAD' });
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
