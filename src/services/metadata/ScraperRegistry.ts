/**
 * ScraperRegistry - Manages metadata scrapers
 *
 * Priority order:
 * - YtDlpScraper (primary) - Server-side yt-dlp via Python backend
 * - BooruScraper - Image/gallery scraper for booru sites
 * - StashScraper (fallback) - Uses Stash's built-in scraper API
 * - GenericScraper (last resort) - URL parsing only
 */

import type { IMetadataScraper, IScrapedMetadata } from '@/types';
import { ContentType } from '@/types';
import { GenericScraper } from './GenericScraper';
import { YtDlpScraper } from './YtDlpScraper';
import { StashScraper } from './StashScraper';
import { BooruScraper } from './BooruScraper';
import { withTimeout, createLogger } from '@/utils';
import { getStashService } from '@/services/stash/StashGraphQLService';
import { PLUGIN_ID } from '@/constants';

const log = createLogger('ScraperRegistry');

export class ScraperRegistry {
  private scrapers: IMetadataScraper[] = [];
  private fallbackScraper: IMetadataScraper;
  private readonly overallTimeoutMs = 90000; // 90 seconds overall timeout
  private ytdlpVersionChecked = false;

  constructor() {
    this.fallbackScraper = new GenericScraper();

    // Register scrapers in priority order
    // All scrapers use server-side extraction (no CORS issues)
    this.register(new YtDlpScraper());   // Primary for video
    this.register(new BooruScraper());   // Primary for images/galleries
    this.register(new StashScraper());   // Fallback (uses Stash's scraper API)

    log.info('Scrapers registered: YtDlpScraper, BooruScraper, StashScraper, GenericScraper (fallback)');

    // Check yt-dlp version asynchronously (fire and forget)
    this.checkYtDlpVersion();
  }

  /**
   * Check yt-dlp availability and version, log result
   */
  private async checkYtDlpVersion(): Promise<void> {
    if (this.ytdlpVersionChecked) return;
    this.ytdlpVersionChecked = true;

    try {
      const stashService = getStashService();
      if (!stashService.isStashEnvironment()) {
        log.debug('Not in Stash environment, skipping yt-dlp check');
        return;
      }

      const result = await stashService.runPluginOperation(PLUGIN_ID, {
        mode: 'check_ytdlp',
      }) as { available?: boolean; version?: string; status_message?: string } | null;

      if (result?.available && result?.version) {
        log.info(`yt-dlp installed: v${result.version}`);
      } else if (result?.available === false) {
        log.warn(`yt-dlp not available: ${result.status_message || 'not installed'}`);
      } else {
        log.warn('yt-dlp status unknown - server-side scraping may not work');
      }
    } catch (error) {
      log.debug(`yt-dlp check failed: ${error instanceof Error ? error.message : String(error)}`);
    }
  }

  /**
   * Register a new scraper
   */
  register(scraper: IMetadataScraper): void {
    this.scrapers.push(scraper);
  }

  /**
   * Find appropriate scraper for URL with optional content type filter
   */
  findScraper(url: string, preferredContentType?: ContentType): IMetadataScraper {
    for (const scraper of this.scrapers) {
      if (!scraper.canHandle(url)) {
        continue;
      }

      // If content type preference specified, check if scraper supports it
      if (preferredContentType && !scraper.contentTypes.includes(preferredContentType)) {
        log.debug(`${scraper.name} skipped: doesn't support content type ${preferredContentType}`);
        continue;
      }

      log.debug(`Using ${scraper.name} for ${url}`);
      return scraper;
    }

    log.debug(`Using fallback scraper for ${url}`);
    return this.fallbackScraper;
  }

  /**
   * Get all scrapers that support a specific content type
   */
  getScrapersForContentType(contentType: ContentType): IMetadataScraper[] {
    return this.scrapers.filter(s => s.contentTypes.includes(contentType));
  }

  /**
   * Scrape metadata from URL
   */
  async scrape(url: string, preferredContentType?: ContentType): Promise<IScrapedMetadata> {
    return withTimeout(
      this._scrape(url, preferredContentType),
      this.overallTimeoutMs,
      `Metadata scraping timed out after ${this.overallTimeoutMs}ms`
    );
  }

  /**
   * Scrape with metadata enhancement fallback
   */
  async scrapeWithEnhancement(url: string, preferredContentType?: ContentType): Promise<IScrapedMetadata> {
    return withTimeout(
      this._scrapeWithEnhancement(url, preferredContentType),
      this.overallTimeoutMs,
      `Metadata scraping timed out after ${this.overallTimeoutMs}ms`
    );
  }

  /**
   * Internal scrape with enhancement method
   */
  private async _scrapeWithEnhancement(url: string, preferredContentType?: ContentType): Promise<IScrapedMetadata> {
    const primaryScraper = this.findScraper(url, preferredContentType);

    try {
      log.info(`Trying ${primaryScraper.name} scraper`);
      const metadata = await primaryScraper.scrape(url);
      this.logExtractedMetadata(primaryScraper.name, metadata, url);
      return metadata;
    } catch (primaryError) {
      const errorMsg = primaryError instanceof Error ? primaryError.message : String(primaryError);
      log.warn(`${primaryScraper.name} failed, trying alternatives`, `Error: ${errorMsg}\nURL: ${url}`);

      // Try other scrapers for metadata enhancement
      for (const scraper of this.scrapers) {
        if (scraper === primaryScraper) continue;
        if (!scraper.canHandle(url)) continue;
        if (preferredContentType && !scraper.contentTypes.includes(preferredContentType)) continue;

        try {
          log.info(`Trying ${scraper.name} scraper`);
          const enhanced = await scraper.scrape(url);
          this.logExtractedMetadata(scraper.name, enhanced, url);
          return enhanced;
        } catch {
          log.debug(`${scraper.name} failed`);
        }
      }

      // Last resort: fallback scraper
      log.info('All scrapers failed, using generic fallback');
      return await this.fallbackScraper.scrape(url);
    }
  }

  /**
   * Log extracted metadata details
   */
  private logExtractedMetadata(scraperName: string, metadata: IScrapedMetadata, url?: string): void {
    const extracted: string[] = [];
    if (metadata.title) extracted.push('title');
    if (metadata.description) extracted.push('description');
    if (metadata.thumbnailUrl) extracted.push('thumbnail');
    if (metadata.videoUrl) extracted.push('video URL');
    if (metadata.imageUrl) extracted.push('image URL');
    if (metadata.performers?.length) extracted.push(`${metadata.performers.length} performers`);
    if (metadata.tags?.length) extracted.push(`${metadata.tags.length} tags`);
    if (metadata.studio) extracted.push('studio');
    if (metadata.duration) extracted.push('duration');
    if (metadata.date) extracted.push('date');

    const title = metadata.title || 'Untitled';
    const summary = extracted.length > 0 ? extracted.join(', ') : 'minimal data';
    const details = url ? `URL: ${url}\nExtracted: ${summary}` : `Extracted: ${summary}`;

    log.success(`${scraperName} extracted: ${title}`, details);
  }

  /**
   * Internal scrape method (without timeout wrapper)
   */
  private async _scrape(url: string, preferredContentType?: ContentType): Promise<IScrapedMetadata> {
    log.debug(`Starting scrape for: ${url}`);
    if (preferredContentType) {
      log.debug(`Preferred content type: ${preferredContentType}`);
    }

    let lastErrorMsg = 'Unknown error';

    // Try each registered scraper in order
    for (const scraper of this.scrapers) {
      if (!scraper.canHandle(url)) {
        log.debug(`${scraper.name} cannot handle this URL, skipping`);
        continue;
      }

      // Check content type preference
      if (preferredContentType && !scraper.contentTypes.includes(preferredContentType)) {
        log.debug(`${scraper.name} skipped: doesn't support ${preferredContentType}`);
        continue;
      }

      try {
        log.info(`Trying ${scraper.name} scraper`);
        const result = await scraper.scrape(url);
        this.logExtractedMetadata(scraper.name, result, url);
        return result;
      } catch (error) {
        const errorMsg = error instanceof Error ? error.message : String(error);
        lastErrorMsg = errorMsg;
        log.warn(`${scraper.name} failed`, `Error: ${errorMsg}\nURL: ${url}`);
        // Continue to next scraper
      }
    }

    // Last resort: use generic scraper (URL parsing only)
    log.info('All scrapers failed, using generic fallback');
    try {
      return await this.fallbackScraper.scrape(url);
    } catch (fallbackError) {
      log.error('All scrapers failed', `URL: ${url}\nLast error: ${lastErrorMsg}`);
      throw new Error(`All scrapers failed for ${url}. Last error: ${lastErrorMsg}`);
    }
  }

  /**
   * Get all registered scrapers
   */
  getScrapers(): IMetadataScraper[] {
    return [...this.scrapers, this.fallbackScraper];
  }

  /**
   * Get scrapers that can handle a specific URL
   */
  getAvailableScrapersForUrl(url: string, contentType?: ContentType): Array<{ name: string; canHandle: boolean; supportsContentType: boolean }> {
    const allScrapers = this.getScrapers();
    return allScrapers.map(scraper => ({
      name: scraper.name,
      canHandle: scraper.canHandle(url),
      supportsContentType: contentType ? scraper.contentTypes.includes(contentType) : true,
    }));
  }

  /**
   * Scrape using a specific scraper by name
   */
  async scrapeWithScraper(url: string, scraperName: string): Promise<IScrapedMetadata> {
    const allScrapers = this.getScrapers();
    const scraper = allScrapers.find(s => s.name === scraperName);

    if (!scraper) {
      throw new Error(`Scraper not found: ${scraperName}`);
    }

    if (!scraper.canHandle(url)) {
      log.warn(`${scraperName} may not support this URL`, `URL: ${url}`);
    }

    log.info(`Re-scraping with ${scraperName}`);
    const metadata = await scraper.scrape(url);
    this.logExtractedMetadata(scraperName, metadata, url);
    return metadata;
  }
}

// Singleton instance
let instance: ScraperRegistry | null = null;

export function getScraperRegistry(): ScraperRegistry {
  if (!instance) {
    instance = new ScraperRegistry();
  }
  return instance;
}
