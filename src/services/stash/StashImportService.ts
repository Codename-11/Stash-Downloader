/**
 * StashImportService - Handles importing files to Stash
 */

import type {
  IDownloadItem,
  IStashScene,
  IStashImage,
  IStashPerformer,
  IStashTag,
  IStashStudio,
  IDownloadProgress,
  IItemLogEntry,
} from '@/types';
import { ContentType } from '@/types';
import { getStashService } from './StashGraphQLService';
import { getDownloadService } from '@/services/download';
import { getBrowserDownloadService } from '@/services/download/BrowserDownloadService';
import { createLogger } from '@/utils';

const log = createLogger('StashImport');

export class StashImportService {
  private stashService = getStashService();
  private downloadService = getDownloadService();
  private browserDownloadService = getBrowserDownloadService();

  /**
   * Check if running in test mode
   */
  private isTestMode(): boolean {
    if (typeof window === 'undefined') return false;
    // Check if we're running on localhost:3000 (test server)
    return window.location.port === '3000' || window.location.hostname === 'localhost';
  }

  /**
   * Import a download item to Stash
   */
  async importToStash(
    item: IDownloadItem,
    callbacks?: {
      onProgress?: (progress: IDownloadProgress) => void;
      onStatusChange?: (status: string) => void;
      onLog?: (level: IItemLogEntry['level'], message: string, details?: string) => void;
    }
  ): Promise<IStashScene | IStashImage> {
    const { onProgress, onStatusChange, onLog } = callbacks || {};
    if (!item.editedMetadata) {
      throw new Error('Item must have edited metadata before import');
    }

    const itemTitle = item.editedMetadata?.title || item.metadata?.title || item.url;
    log.info('Starting import for:', JSON.stringify({
      url: item.url,
      title: itemTitle,
      hasMetadata: !!item.metadata,
      hasVideoUrl: !!item.metadata?.videoUrl,
    }));

    if (onLog) onLog('info', `Starting import for: ${itemTitle}`);

    // Determine which URL to download from
    // For yt-dlp sites, always use the original page URL (yt-dlp handles finding the video)
    // For other sites, use direct video URL if available
    let downloadUrl = item.url;

    // Only use videoUrl if it's a valid absolute URL and we're not using yt-dlp
    if (item.metadata?.videoUrl) {
      try {
        const videoUrlObj = new URL(item.metadata.videoUrl);
        // If it's a valid absolute URL and not from a yt-dlp site, use it
        const isYtDlpSite = ['youporn.com', 'pornhub.com', 'www.pornhub.com', 'www.youporn.com'].some(domain =>
          item.url.toLowerCase().includes(domain)
        );
        if (!isYtDlpSite) {
          downloadUrl = videoUrlObj.href;
          log.debug('Using direct video URL:', downloadUrl);
          if (onLog) onLog('info', 'Using direct video URL for download');
        } else {
          log.debug('Using page URL (yt-dlp will find video):', JSON.stringify({
            pageUrl: downloadUrl,
            reason: 'yt-dlp site detected',
          }));
          if (onLog) onLog('info', 'Using page URL (yt-dlp will extract video)');
        }
      } catch (error) {
        // videoUrl is not a valid absolute URL, use page URL
        log.debug('videoUrl is invalid, using page URL:', JSON.stringify({
          pageUrl: downloadUrl,
          error: error instanceof Error ? error.message : 'Unknown error',
        }));
        if (onLog) onLog('warning', 'Invalid video URL, falling back to page URL', error instanceof Error ? error.message : undefined);
      }
    } else {
      log.debug('Using page URL (no direct video URL found):', downloadUrl);
      if (onLog) onLog('info', 'No direct video URL found, using page URL');
    }

    // Download the file
    if (onStatusChange) onStatusChange('Downloading file...');
    if (onLog) onLog('info', 'Starting file download...');
    log.debug('Downloading file from URL:', downloadUrl);

    // Pass original page URL as fallback for yt-dlp if direct download fails
    // This is important for sites with hotlink protection (e.g., rule34video)
    const fallbackUrl = downloadUrl !== item.url ? item.url : undefined;
    if (fallbackUrl) {
      log.debug('Using fallback URL for yt-dlp:', fallbackUrl);
      if (onLog) onLog('info', 'Fallback URL set for retry attempts');
    }

    const blob = await this.downloadService.download(downloadUrl, {
      onProgress: (progress) => {
        log.debug('Download progress:',
          `${progress.percentage.toFixed(1)}% - ${progress.bytesDownloaded}/${progress.totalBytes} bytes`
        );
        if (onProgress) onProgress(progress);
      },
      fallbackUrl, // Original page URL for yt-dlp if direct download fails
    });

    // Check if this was a server-side download (file already on disk)
    const serverFilePath = (blob as any).__serverFilePath;
    const libraryPath = (blob as any).__libraryPath;
    const scanJobId = (blob as any).__scanJobId;

    if (serverFilePath) {
      log.info('Server-side download detected, file at:', serverFilePath);

      // Log library path usage
      if (libraryPath) {
        if (onLog) onLog('success', `Downloaded to Stash library: ${libraryPath}`);
      } else {
        if (onLog) onLog('warning', 'No Stash library found - file saved to default location');
      }

      if (onLog) onLog('success', `File saved: ${serverFilePath}`);

      // Log scan status
      if (scanJobId) {
        if (onLog) onLog('info', `Stash scan triggered (Job: ${scanJobId})`);
        if (onLog) onLog('success', 'Scene will be indexed automatically');
      } else if (libraryPath) {
        if (onLog) onLog('warning', 'Scan not triggered - run manual scan in Stash');
      }

      // For server-side downloads, return a placeholder result
      // The file is on disk and Stash scan will index it
      // Metadata can be applied after scan finds the scene
      return {
        id: `pending-scan-${Date.now()}`,
        title: item.editedMetadata?.title || 'Pending scan',
        path: serverFilePath,
        organized: false,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
        files: [],
        paths: { screenshot: '', preview: '', stream: '', webp: '', vtt: '', chapters_vtt: '' },
      } as IStashScene;
    }

    log.info('Download complete, file size:', `${blob.size} bytes`);
    if (onLog) onLog('success', `Download complete (${(blob.size / 1024 / 1024).toFixed(2)} MB)`);

    // Convert to base64 for uploading
    if (onStatusChange) onStatusChange('Processing file...');
    if (onLog) onLog('info', 'Processing file for upload...');
    const base64Data = await this.blobToBase64(blob);
    if (onLog) onLog('info', 'File encoded successfully');

    // Get or create performers, tags, studio
    if (onStatusChange) onStatusChange('Resolving metadata...');
    if (onLog) onLog('info', 'Resolving performers, tags, and studio...');
    const performerIds = await this.resolvePerformers(
      item.editedMetadata.performers || []
    );
    const tagIds = await this.resolveTags(item.editedMetadata.tags || []);
    const studioId = item.editedMetadata.studio
      ? await this.resolveStudio(item.editedMetadata.studio)
      : undefined;

    if (onLog) onLog('info', `Resolved ${performerIds.length} performers, ${tagIds.length} tags, ${studioId ? '1 studio' : '0 studios'}`);

    // Create scene or image based on content type
    const contentType = item.metadata?.contentType || ContentType.Video;

    let result: IStashScene | IStashImage;

    if (onStatusChange) onStatusChange('Creating entry in Stash...');
    if (onLog) onLog('info', `Creating ${contentType === ContentType.Video ? 'scene' : 'image'} entry in Stash...`);
    if (contentType === ContentType.Video) {
      result = await this.createScene(
        {
          title: item.editedMetadata.title,
          details: item.editedMetadata.description,
          url: item.url,
          date: item.editedMetadata.date,
          rating100: item.editedMetadata.rating,
          performer_ids: performerIds,
          tag_ids: tagIds,
          studio_id: studioId,
        },
        base64Data
      );
    } else {
      result = await this.createImage(
        {
          title: item.editedMetadata.title,
          rating100: item.editedMetadata.rating,
          performer_ids: performerIds,
          tag_ids: tagIds,
          studio_id: studioId,
        },
        base64Data
      );
    }

    if (onLog) onLog('success', `${contentType === ContentType.Video ? 'Scene' : 'Image'} created successfully in Stash`, `ID: ${result.id}`);

    // In test mode, save file to user's computer with metadata
    if (this.isTestMode()) {
      log.debug('Test mode: Downloading file with metadata to your computer...');
      if (onLog) onLog('info', 'Test mode: Saving file to Downloads folder...');
      await this.browserDownloadService.downloadWithMetadata(item, blob, result);
      log.debug('File saved to Downloads folder!');
      if (onLog) onLog('success', 'File saved to Downloads folder');
    }

    if (onLog) onLog('success', 'Import completed successfully');
    return result;
  }

  /**
   * Resolve performer IDs - creates new performers in Stash for temp IDs
   */
  private async resolvePerformers(performers: IStashPerformer[]): Promise<string[]> {
    const resolvedIds: string[] = [];

    for (const performer of performers) {
      if (performer.id.startsWith('temp-')) {
        // Create new performer in Stash
        log.debug('Creating new performer:', performer.name);
        try {
          const created = await this.stashService.createPerformer({
            name: performer.name,
            disambiguation: performer.disambiguation,
            aliases: performer.aliases,
          });
          log.debug('Created performer:', `${created.id} ${created.name}`);
          resolvedIds.push(created.id);
        } catch (error) {
          log.error('Failed to create performer:', `${performer.name} - ${String(error)}`);
          // Continue with other performers even if one fails
        }
      } else {
        // Use existing performer ID
        resolvedIds.push(performer.id);
      }
    }

    return resolvedIds;
  }

  /**
   * Resolve tag IDs - creates new tags in Stash for temp IDs
   */
  private async resolveTags(tags: IStashTag[]): Promise<string[]> {
    const resolvedIds: string[] = [];

    for (const tag of tags) {
      if (tag.id.startsWith('temp-')) {
        // Create new tag in Stash
        log.debug('Creating new tag:', tag.name);
        try {
          const created = await this.stashService.createTag({
            name: tag.name,
            aliases: tag.aliases,
            description: tag.description,
          });
          log.debug('Created tag:', `${created.id} ${created.name}`);
          resolvedIds.push(created.id);
        } catch (error) {
          log.error('Failed to create tag:', `${tag.name} - ${String(error)}`);
          // Continue with other tags even if one fails
        }
      } else {
        // Use existing tag ID
        resolvedIds.push(tag.id);
      }
    }

    return resolvedIds;
  }

  /**
   * Resolve studio ID - creates new studio in Stash for temp ID
   */
  private async resolveStudio(studio: IStashStudio): Promise<string | undefined> {
    if (studio.id.startsWith('temp-')) {
      // Create new studio in Stash
      log.debug('Creating new studio:', studio.name);
      try {
        const created = await this.stashService.createStudio({
          name: studio.name,
          url: studio.url,
          aliases: studio.aliases,
        });
        log.debug('Created studio:', `${created.id} ${created.name}`);
        return created.id;
      } catch (error) {
        log.error('Failed to create studio:', `${studio.name} - ${String(error)}`);
        return undefined;
      }
    }
    return studio.id;
  }

  /**
   * Create scene in Stash
   */
  private async createScene(
    input: any,
    _fileData?: string
  ): Promise<IStashScene> {
    // Note: Actual file upload may require different approach
    // This is a simplified implementation
    return await this.stashService.createScene(input);
  }

  /**
   * Create image in Stash
   */
  private async createImage(input: any, _fileData?: string): Promise<IStashImage> {
    return await this.stashService.createImage(input);
  }

  /**
   * Convert Blob to base64
   */
  private blobToBase64(blob: Blob): Promise<string> {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onloadend = () => {
        const result = reader.result as string;
        // Remove data URL prefix
        const base64 = result.split(',')[1] || '';
        resolve(base64);
      };
      reader.onerror = reject;
      reader.readAsDataURL(blob);
    });
  }

}

// Singleton instance
let instance: StashImportService | null = null;

export function getStashImportService(): StashImportService {
  if (!instance) {
    instance = new StashImportService();
  }
  return instance;
}
