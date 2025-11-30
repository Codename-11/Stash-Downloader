/**
 * StashScraper - Uses Stash's built-in scraping via GraphQL
 *
 * This scraper delegates to Stash's server-side scraping, which:
 * - Bypasses CORS restrictions (requests made from server)
 * - Leverages community scrapers already installed in Stash
 * - Provides consistent metadata format
 *
 * NOTE: Currently DISABLED - kept in code but not used.
 * We prioritize yt-dlp for video URL extraction instead.
 * To re-enable, change canHandle() to return true in Stash environment.
 */

import type { IMetadataScraper, IScrapedMetadata, IStashScrapedScene } from '@/types';
import { ContentType } from '@/types';
import { getStashService } from '@/services/stash/StashGraphQLService';
import { createLogger } from '@/utils';

const log = createLogger('StashScraper');

export class StashScraper implements IMetadataScraper {
  name = 'Stash Built-in';
  supportedDomains = ['*']; // Can potentially handle any URL if Stash has a scraper
  contentTypes = [ContentType.Video, ContentType.Image, ContentType.Gallery]; // Stash can handle all types

  /**
   * Check if this scraper can handle the URL
   * Currently DISABLED - returns false to prevent usage
   * Kept in code for potential future use
   */
  canHandle(_url: string): boolean {
    // DISABLED: We prioritize yt-dlp for video URL extraction
    // To re-enable, uncomment the code below:
    // try {
    //   const stashService = getStashService();
    //   return stashService.isStashEnvironment();
    // } catch {
    //   return false;
    // }
    return false;
  }

  /**
   * Scrape metadata using Stash's built-in scrapers
   */
  async scrape(url: string): Promise<IScrapedMetadata> {
    log.info(`Attempting Stash built-in scrape for: ${url}`);

    try {
      const stashService = getStashService();

      // Check if we're in Stash environment
      if (!stashService.isStashEnvironment()) {
        log.debug('Not in Stash environment, skipping');
        throw new Error('Stash scraping only available in Stash environment');
      }

      // Try scene scraping first (most common use case)
      const scrapedScene = await stashService.scrapeSceneURL(url);

      if (scrapedScene && this.hasUsefulData(scrapedScene)) {
        log.info('Successfully scraped via Stash:', scrapedScene.title || 'untitled');
        return this.mapSceneToMetadata(scrapedScene, url);
      }

      // If no scene data, try gallery scraping
      const scrapedGallery = await stashService.scrapeGalleryURL(url);

      if (scrapedGallery && scrapedGallery.title) {
        log.info('Successfully scraped gallery via Stash:', scrapedGallery.title);
        return {
          title: scrapedGallery.title,
          description: scrapedGallery.details,
          date: scrapedGallery.date,
          url: scrapedGallery.url || url,
          performers: scrapedGallery.performers?.map((p) => p.name) || [],
          tags: scrapedGallery.tags?.map((t) => t.name) || [],
          studio: scrapedGallery.studio?.name,
          contentType: ContentType.Gallery,
        };
      }

      // No data from Stash scrapers
      log.debug('No data returned from Stash scrapers');
      throw new Error('Stash scrapers returned no data for this URL');
    } catch (error) {
      const errorMsg = error instanceof Error ? error.message : String(error);
      log.warn(`Stash scraping failed: ${errorMsg}`);
      throw error; // Re-throw to let ScraperRegistry try next scraper
    }
  }

  /**
   * Check if scraped data has useful information
   */
  private hasUsefulData(scene: IStashScrapedScene): boolean {
    return !!(
      scene.title ||
      scene.details ||
      scene.date ||
      (scene.performers && scene.performers.length > 0) ||
      (scene.tags && scene.tags.length > 0) ||
      scene.studio
    );
  }

  /**
   * Map Stash's ScrapedScene to our IScrapedMetadata format
   */
  private mapSceneToMetadata(scene: IStashScrapedScene, originalUrl: string): IScrapedMetadata {
    // Determine quality from file info if available
    let quality: string | undefined;
    if (scene.file?.height) {
      if (scene.file.height >= 2160) quality = '4K';
      else if (scene.file.height >= 1080) quality = '1080p';
      else if (scene.file.height >= 720) quality = '720p';
      else if (scene.file.height >= 480) quality = '480p';
      else quality = `${scene.file.height}p`;
    }

    return {
      title: scene.title || undefined,
      description: scene.details || undefined,
      date: scene.date || undefined,
      url: scene.url || originalUrl,
      // Note: Stash scrapers typically don't return the actual video URL
      // That would need to come from yt-dlp or the Python backend
      videoUrl: undefined,
      imageUrl: undefined,
      thumbnailUrl: scene.image || undefined,
      performers: scene.performers?.map((p) => p.name) || [],
      tags: scene.tags?.map((t) => t.name) || [],
      studio: scene.studio?.name,
      duration: scene.duration || scene.file?.duration,
      quality,
      contentType: ContentType.Video,
    };
  }
}
