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

const log = createLogger('ScraperRegistry');

export class ScraperRegistry {
  private scrapers: IMetadataScraper[] = [];
  private fallbackScraper: IMetadataScraper;
  private readonly overallTimeoutMs = 90000; // 90 seconds overall timeout

  constructor() {
    this.fallbackScraper = new GenericScraper();

    // Register scrapers in priority order
    // All scrapers use server-side extraction (no CORS issues)
    this.register(new YtDlpScraper());   // Primary for video
    this.register(new BooruScraper());   // Primary for images/galleries
    this.register(new StashScraper());   // Fallback (uses Stash's scraper API)

    log.info('Scrapers registered: YtDlpScraper, BooruScraper, StashScraper, GenericScraper (fallback)');
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

      log.info(`Using ${scraper.name} for ${url}`);
      return scraper;
    }

    log.info(`Using fallback scraper for ${url}`);
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
      log.info(`[Scraper] Trying primary: ${primaryScraper.name} for ${url}`);
      const metadata = await primaryScraper.scrape(url);
      this.logExtractedMetadata(primaryScraper.name, metadata);
      return metadata;
    } catch (primaryError) {
      const errorMsg = primaryError instanceof Error ? primaryError.message : String(primaryError);
      log.warn(`[Scraper] Primary ${primaryScraper.name} failed: ${errorMsg}, trying enhancement scrapers`);

      // Try other scrapers for metadata enhancement
      for (const scraper of this.scrapers) {
        if (scraper === primaryScraper) continue;
        if (!scraper.canHandle(url)) continue;
        if (preferredContentType && !scraper.contentTypes.includes(preferredContentType)) continue;

        try {
          log.info(`[Scraper] Trying enhancement: ${scraper.name}`);
          const enhanced = await scraper.scrape(url);
          this.logExtractedMetadata(scraper.name, enhanced);
          return enhanced;
        } catch {
          log.debug(`[Scraper] Enhancement ${scraper.name} failed`);
        }
      }

      // Last resort: fallback scraper
      log.info(`[Scraper] All scrapers failed, using fallback: ${this.fallbackScraper.name}`);
      return await this.fallbackScraper.scrape(url);
    }
  }

  /**
   * Log extracted metadata details
   */
  private logExtractedMetadata(scraperName: string, metadata: IScrapedMetadata): void {
    const extracted: string[] = [];
    if (metadata.title) extracted.push('title');
    if (metadata.description) extracted.push('description');
    if (metadata.thumbnailUrl) extracted.push('thumbnail');
    if (metadata.videoUrl) extracted.push('videoUrl');
    if (metadata.imageUrl) extracted.push('imageUrl');
    if (metadata.performers?.length) extracted.push(`${metadata.performers.length} performers`);
    if (metadata.tags?.length) extracted.push(`${metadata.tags.length} tags`);
    if (metadata.studio) extracted.push('studio');
    if (metadata.duration) extracted.push('duration');
    if (metadata.date) extracted.push('date');

    log.info(`[Scraper] ${scraperName} succeeded - extracted: ${extracted.join(', ') || 'minimal data'}`);
  }

  /**
   * Internal scrape method (without timeout wrapper)
   */
  private async _scrape(url: string, preferredContentType?: ContentType): Promise<IScrapedMetadata> {
    log.info(`========================================`);
    log.info(`Starting scrape for: ${url}`);
    log.info(`Available scrapers: ${this.scrapers.map(s => s.name).join(', ') || 'none'}`);
    if (preferredContentType) {
      log.info(`Preferred content type: ${preferredContentType}`);
    }
    log.info(`========================================`);

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
        log.info(`[Scraper] Trying ${scraper.name}...`);
        const result = await scraper.scrape(url);
        this.logExtractedMetadata(scraper.name, result);
        return result;
      } catch (error) {
        const errorMsg = error instanceof Error ? error.message : String(error);
        lastErrorMsg = errorMsg;
        log.warn(`[Scraper] ${scraper.name} failed: ${errorMsg}`);
        // Continue to next scraper
      }
    }

    // Last resort: use generic scraper (URL parsing only)
    log.info('[Scraper] All scrapers failed, using GenericScraper as last resort');
    try {
      return await this.fallbackScraper.scrape(url);
    } catch (fallbackError) {
      log.error(`Even GenericScraper failed: ${fallbackError}`);
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
      log.warn(`Scraper "${scraperName}" cannot handle URL: ${url}, but will try anyway`);
    }

    log.info(`Manually scraping with "${scraperName}" for: ${url}`);
    const metadata = await scraper.scrape(url);
    const extracted = Object.entries(metadata)
      .filter(([_, v]) => v !== undefined && v !== null && v !== '')
      .map(([k, v]) => Array.isArray(v) ? `${v.length} ${k}` : k)
      .join(', ');
    log.info(`[Scraper] ${scraperName} succeeded - extracted: ${extracted}`);
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
