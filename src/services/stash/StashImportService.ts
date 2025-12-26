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
  PostImportAction,
} from '@/types';
import { ContentType } from '@/types';
import { getStashService } from './StashGraphQLService';
import { getDownloadService } from '@/services/download';
import { getBrowserDownloadService } from '@/services/download/BrowserDownloadService';
import { createLogger } from '@/utils';
import { PLUGIN_ID } from '@/constants';

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
      /** Called when the Stash job starts, with the jobId for potential cancellation */
      onJobStart?: (jobId: string) => void;
    }
  ): Promise<IStashScene | IStashImage> {
    const { onProgress, onStatusChange, onLog, onJobStart } = callbacks || {};
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

    // Pass the title as filename so yt-dlp uses it instead of extracting from page
    // (some sites don't have proper title metadata, resulting in names like "2160p.av1.mp4")
    const downloadFilename = item.editedMetadata?.title || item.metadata?.title;
    if (downloadFilename) {
      log.debug('Using custom filename for download:', downloadFilename);
    }

    const blob = await this.downloadService.download(downloadUrl, {
      onProgress: (progress) => {
        log.debug('Download progress:',
          `${progress.percentage.toFixed(1)}% - ${progress.bytesDownloaded}/${progress.totalBytes} bytes`
        );
        if (onProgress) onProgress(progress);
      },
      onJobStart: (jobId) => {
        log.debug('Download job started:', jobId);
        if (onJobStart) onJobStart(jobId);
      },
      fallbackUrl, // Original page URL for yt-dlp if direct download fails
      filename: downloadFilename, // Use scraped title as filename
    });

    // Check if this was a server-side download (file already on disk)
    // eslint-disable-next-line @typescript-eslint/no-explicit-any -- Custom properties added to Blob for server download info
    const serverFilePath = (blob as any).__serverFilePath;
    // eslint-disable-next-line @typescript-eslint/no-explicit-any -- Custom properties added to Blob for server download info
    const libraryPath = (blob as any).__libraryPath;
    // eslint-disable-next-line @typescript-eslint/no-explicit-any -- Custom properties added to Blob for server download info
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

      // Wait for scan to complete if we have a job ID
      if (scanJobId) {
        if (onLog) onLog('info', `Waiting for Stash scan to complete (Job: ${scanJobId})...`);
        if (onStatusChange) onStatusChange('Waiting for scan...');

        const scanResult = await this.stashService.waitForJob(scanJobId, {
          pollIntervalMs: 1000,
          maxWaitMs: 60000, // 1 minute max for scan
        });

        if (!scanResult.success) {
          log.warn('Scan job did not complete successfully:', scanResult.error);
          if (onLog) onLog('warning', `Scan may not have completed: ${scanResult.error}`);
        } else {
          if (onLog) onLog('success', 'Scan completed');
        }
      }

      // Find the scene by file path
      if (onStatusChange) onStatusChange('Finding scene in Stash...');
      if (onLog) onLog('info', 'Looking for scene in Stash...');

      // Try a few times with delay (scan might take a moment to index)
      let scene: IStashScene | null = null;
      for (let attempt = 0; attempt < 5; attempt++) {
        scene = await this.stashService.findSceneByPath(serverFilePath);
        if (scene) break;

        // Wait a bit before retrying
        await new Promise(resolve => setTimeout(resolve, 2000));
        log.debug(`Retry ${attempt + 1}/5 finding scene by path`);
      }

      if (!scene) {
        log.warn('Could not find scene by path after scan');
        if (onLog) onLog('warning', 'Scene not found in Stash - metadata will not be applied');
        if (onLog) onLog('info', 'You may need to run a manual scan and apply metadata');

        // Return placeholder since we couldn't find the scene
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

      if (onLog) onLog('success', `Found scene in Stash (ID: ${scene.id})`);
      log.info('Found scene after scan:', scene.id);

      // Apply edited metadata (performers, tags, studio)
      // Use edited values if available, otherwise fall back to scraped metadata
      if (onStatusChange) onStatusChange('Applying metadata...');
      if (onLog) onLog('info', 'Applying metadata (performers, tags, studio)...');

      const editedMeta = item.editedMetadata;
      const scrapedMeta = item.metadata;
      const updateInput: Record<string, unknown> = {
        title: editedMeta?.title || scrapedMeta?.title,
        details: editedMeta?.description || scrapedMeta?.description,
        url: item.url,
        date: editedMeta?.date || scrapedMeta?.date,
      };

      // Use edited performer names if available, otherwise use scraped
      const performerNames = editedMeta?.performerNames || scrapedMeta?.performers || [];
      if (performerNames.length > 0) {
        if (onLog) onLog('info', `Resolving ${performerNames.length} performer(s)...`);
        const performerIds: string[] = [];
        for (const name of performerNames) {
          try {
            const performer = await this.stashService.getOrCreatePerformer(name);
            performerIds.push(performer.id);
            log.debug(`Resolved performer: ${name} -> ${performer.id}`);
          } catch (err) {
            log.warn(`Failed to resolve performer "${name}": ${String(err)}`);
          }
        }
        if (performerIds.length > 0) {
          updateInput.performer_ids = performerIds;
          if (onLog) onLog('success', `Linked ${performerIds.length} performer(s)`);
        }
      }

      // Use edited tag names if available, otherwise use scraped
      const tagNames = editedMeta?.tagNames || scrapedMeta?.tags || [];
      if (tagNames.length > 0) {
        if (onLog) onLog('info', `Resolving ${tagNames.length} tag(s)...`);
        const tagIds: string[] = [];
        for (const name of tagNames) {
          try {
            const tag = await this.stashService.getOrCreateTag(name);
            tagIds.push(tag.id);
            log.debug(`Resolved tag: ${name} -> ${tag.id}`);
          } catch (err) {
            log.warn(`Failed to resolve tag "${name}": ${String(err)}`);
          }
        }
        if (tagIds.length > 0) {
          updateInput.tag_ids = tagIds;
          if (onLog) onLog('success', `Linked ${tagIds.length} tag(s)`);
        }
      }

      // Use edited studio name if available, otherwise use scraped
      const studioName = editedMeta?.studioName || scrapedMeta?.studio;
      if (studioName) {
        if (onLog) onLog('info', `Resolving studio: ${studioName}...`);
        try {
          const studio = await this.stashService.getOrCreateStudio(studioName);
          updateInput.studio_id = studio.id;
          log.debug(`Resolved studio: ${studioName} -> ${studio.id}`);
          if (onLog) onLog('success', `Linked studio: ${studio.name}`);
        } catch (err) {
          log.warn(`Failed to resolve studio "${studioName}": ${String(err)}`);
        }
      }

      // Set cover image from thumbnail if available
      if (scrapedMeta?.thumbnailUrl) {
        if (onLog) onLog('info', 'Fetching cover image...');
        try {
          const coverBase64 = await this.fetchImageAsBase64(scrapedMeta.thumbnailUrl);
          if (coverBase64) {
            updateInput.cover_image = coverBase64;
            log.debug('Cover image fetched successfully');
            if (onLog) onLog('success', 'Cover image set');
          }
        } catch (err) {
          log.warn(`Failed to fetch cover image: ${String(err)}`);
          if (onLog) onLog('warning', 'Could not set cover image');
        }
      }

      // eslint-disable-next-line @typescript-eslint/no-explicit-any -- updateInput built dynamically from optional fields
      let updatedScene = await this.stashService.updateScene(scene.id, updateInput as any);

      if (onLog) onLog('success', 'Metadata applied');

      // Execute post-import action (optional additional processing)
      const postImportAction: PostImportAction = item.postImportAction || 'none';

      if (postImportAction === 'identify') {
        // Trigger Stash's Identify (StashDB + scrapers)
        if (onStatusChange) onStatusChange('Running Identify...');
        if (onLog) onLog('info', 'Triggering Stash Identify (StashDB + scrapers)...');

        const identifyJobId = await this.stashService.identifyScenes([scene.id]);
        if (identifyJobId) {
          if (onLog) onLog('info', `Identify job started (ID: ${identifyJobId})`);

          // Wait for identify to complete
          const identifyResult = await this.stashService.waitForJob(identifyJobId, {
            pollIntervalMs: 1000,
            maxWaitMs: 120000, // 2 minutes for identify
          });

          if (identifyResult.success) {
            if (onLog) onLog('success', 'Identify completed - metadata matched from StashDB/scrapers');
          } else {
            if (onLog) onLog('warning', `Identify may not have found matches: ${identifyResult.error}`);
          }
        } else {
          if (onLog) onLog('warning', 'Could not start Identify job');
        }
      } else if (postImportAction === 'scrape_url') {
        // Scrape using the source URL
        if (onStatusChange) onStatusChange('Scraping URL...');
        if (onLog) onLog('info', `Scraping metadata from URL: ${item.url}`);

        const scraped = await this.stashService.scrapeSingleSceneByURL(scene.id, item.url);
        if (scraped) {
          if (onLog) onLog('info', 'Applying scraped metadata (performers, tags, studio)...');
          updatedScene = await this.stashService.applyScrapedMetadata(scene.id, scraped);
          if (onLog) onLog('success', 'Scraped metadata applied successfully');
        } else {
          if (onLog) onLog('warning', 'No scraper found for this URL - metadata not applied');
        }
      } else {
        if (onLog) onLog('info', 'Post-import action: None - edit metadata in Stash if needed');
      }

      if (onLog) onLog('success', 'Import completed successfully!');
      log.info('Scene import complete:', updatedScene.id);

      return updatedScene;
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
    // eslint-disable-next-line @typescript-eslint/no-explicit-any -- Input type varies by caller
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
  // eslint-disable-next-line @typescript-eslint/no-explicit-any -- Input type varies by caller
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
   * Fetch an image URL and convert to base64 via server-side
   * Used for setting cover images from thumbnails (bypasses browser CSP)
   */
  private async fetchImageAsBase64(imageUrl: string): Promise<string | null> {
    try {
      // Use server-side fetch via Python backend to bypass CSP restrictions

      // Get proxy settings
      const settings = await this.stashService.getPluginSettings(PLUGIN_ID);
      const proxy = settings?.httpProxy || undefined;

      log.debug('Fetching cover image via server-side...');

      interface FetchImageResult {
        success?: boolean;
        image_base64?: string;
        result_error?: string;
      }

      const result = await this.stashService.runPluginOperation(PLUGIN_ID, {
        mode: 'fetch_image',
        url: imageUrl,
        proxy,
      }) as FetchImageResult | null;

      if (result?.success && result?.image_base64) {
        log.debug('Cover image fetched successfully via server');
        return result.image_base64;
      }

      const errorMsg = result?.result_error || 'Unknown error';
      log.warn(`Server-side image fetch failed: ${errorMsg}`);
      return null;
    } catch (err) {
      log.warn(`Error fetching image: ${String(err)}`);
      return null;
    }
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
