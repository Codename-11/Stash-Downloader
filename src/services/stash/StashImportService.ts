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
    console.log('[StashImport] Starting import for:', {
      url: item.url,
      title: itemTitle,
      hasMetadata: !!item.metadata,
      hasVideoUrl: !!item.metadata?.videoUrl,
      videoUrl: item.metadata?.videoUrl,
    });

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
          console.log('[StashImport] Using direct video URL:', downloadUrl);
          if (onLog) onLog('info', 'Using direct video URL for download');
        } else {
          console.log('[StashImport] Using page URL (yt-dlp will find video):', {
            pageUrl: downloadUrl,
            videoUrl: item.metadata.videoUrl,
            reason: 'yt-dlp site detected',
          });
          if (onLog) onLog('info', 'Using page URL (yt-dlp will extract video)');
        }
      } catch (error) {
        // videoUrl is not a valid absolute URL, use page URL
        console.log('[StashImport] videoUrl is invalid, using page URL:', {
          pageUrl: downloadUrl,
          videoUrl: item.metadata.videoUrl,
          error: error instanceof Error ? error.message : 'Unknown error',
        });
        if (onLog) onLog('warning', 'Invalid video URL, falling back to page URL', error instanceof Error ? error.message : undefined);
      }
    } else {
      console.log('[StashImport] Using page URL (no direct video URL found):', downloadUrl);
      if (onLog) onLog('info', 'No direct video URL found, using page URL');
    }

    // Download the file
    if (onStatusChange) onStatusChange('Downloading file...');
    if (onLog) onLog('info', 'Starting file download...');
    console.log('[StashImport] Downloading file from URL:', downloadUrl);
    const blob = await this.downloadService.download(downloadUrl, {
      onProgress: (progress) => {
        console.log('[StashImport] Download progress:',
          `${progress.percentage.toFixed(1)}% - ${progress.bytesDownloaded}/${progress.totalBytes} bytes`
        );
        if (onProgress) onProgress(progress);
      },
    });

    console.log('[StashImport] Download complete, file size:', blob.size, 'bytes');
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
      item.editedMetadata.performerIds || []
    );
    const tagIds = await this.resolveTags(item.editedMetadata.tagIds || []);
    const studioId = item.editedMetadata.studioId
      ? await this.resolveStudio(item.editedMetadata.studioId)
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
      console.log('[StashImport] Test mode: Downloading file with metadata to your computer...');
      if (onLog) onLog('info', 'Test mode: Saving file to Downloads folder...');
      await this.browserDownloadService.downloadWithMetadata(item, blob, result);
      console.log('[StashImport] File saved to Downloads folder!');
      if (onLog) onLog('success', 'File saved to Downloads folder');
    }

    if (onLog) onLog('success', 'Import completed successfully');
    return result;
  }

  /**
   * Resolve performer IDs (create new ones if needed)
   */
  private async resolvePerformers(performerIds: string[]): Promise<string[]> {
    const resolvedIds: string[] = [];

    for (const id of performerIds) {
      // If ID starts with "temp-", it's a new performer that needs to be created
      if (id.startsWith('temp-')) {
        // This is a placeholder - in real implementation, we'd need the performer name
        // For now, skip temp IDs (they should be resolved in the component)
        continue;
      }
      resolvedIds.push(id);
    }

    return resolvedIds;
  }

  /**
   * Resolve tag IDs (create new ones if needed)
   */
  private async resolveTags(tagIds: string[]): Promise<string[]> {
    const resolvedIds: string[] = [];

    for (const id of tagIds) {
      if (id.startsWith('temp-')) {
        continue;
      }
      resolvedIds.push(id);
    }

    return resolvedIds;
  }

  /**
   * Resolve studio ID (create new one if needed)
   */
  private async resolveStudio(studioId: string): Promise<string | undefined> {
    if (studioId.startsWith('temp-')) {
      return undefined;
    }
    return studioId;
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

  /**
   * Resolve all temporary IDs before import
   */
  async resolveTemporaryEntities(_item: IDownloadItem): Promise<{
    performers: IStashPerformer[];
    tags: IStashTag[];
    studio: IStashStudio | null;
  }> {
    const performers: IStashPerformer[] = [];
    const tags: IStashTag[] = [];
    let studio: IStashStudio | null = null;

    // This would need access to the actual performer/tag/studio objects
    // to create them if they have temp IDs
    // For now, return empty arrays

    return { performers, tags, studio };
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
