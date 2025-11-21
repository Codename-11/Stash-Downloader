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
  async importToStash(item: IDownloadItem): Promise<IStashScene | IStashImage> {
    if (!item.editedMetadata) {
      throw new Error('Item must have edited metadata before import');
    }

    console.log('[StashImport] Starting import for:', item.url);

    // Determine which URL to download from
    // If scraper found a direct video URL, use that instead of the page URL
    const downloadUrl = item.metadata?.videoUrl || item.url;

    if (item.metadata?.videoUrl) {
      console.log('[StashImport] Using direct video URL:', downloadUrl);
    } else {
      console.log('[StashImport] Using page URL (no direct video URL found):', downloadUrl);
    }

    // Download the file
    console.log('[StashImport] Downloading file...');
    const blob = await this.downloadService.download(downloadUrl, {
      onProgress: (progress) => {
        console.log('[StashImport] Download progress:',
          `${progress.percentage.toFixed(1)}% - ${progress.bytesDownloaded}/${progress.totalBytes} bytes`
        );
      },
    });

    console.log('[StashImport] Download complete, file size:', blob.size, 'bytes');

    // Convert to base64 for uploading
    const base64Data = await this.blobToBase64(blob);

    // Get or create performers, tags, studio
    const performerIds = await this.resolvePerformers(
      item.editedMetadata.performerIds || []
    );
    const tagIds = await this.resolveTags(item.editedMetadata.tagIds || []);
    const studioId = item.editedMetadata.studioId
      ? await this.resolveStudio(item.editedMetadata.studioId)
      : undefined;

    // Create scene or image based on content type
    const contentType = item.metadata?.contentType || ContentType.Video;

    let result: IStashScene | IStashImage;

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

    // In test mode, save file to user's computer with metadata
    if (this.isTestMode()) {
      console.log('[StashImport] Test mode: Downloading file with metadata to your computer...');
      await this.browserDownloadService.downloadWithMetadata(item, blob, result);
      console.log('[StashImport] File saved to Downloads folder!');
    }

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
    fileData?: string
  ): Promise<IStashScene> {
    // Note: Actual file upload may require different approach
    // This is a simplified implementation
    return await this.stashService.createScene(input);
  }

  /**
   * Create image in Stash
   */
  private async createImage(input: any, fileData?: string): Promise<IStashImage> {
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
  async resolveTemporaryEntities(item: IDownloadItem): Promise<{
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
