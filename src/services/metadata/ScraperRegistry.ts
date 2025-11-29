/**
 * ScraperRegistry - Manages metadata scrapers
 *
 * Priority order (yt-dlp first for video URL extraction):
 * - YtDlpScraper (primary) - Always extracts video URLs via yt-dlp
 * - StashScraper (fallback) - Kept in code but only used if yt-dlp fails
 * - GenericScraper (last resort) - URL parsing only
 *
 * In Stash environment:
 * - YtDlpScraper uses server-side extraction (no CORS)
 * - StashScraper available as fallback (server-side, no CORS)
 * - Skips client-side scrapers that fail due to CORS/CSP
 *
 * In test-app environment:
 * - YtDlpScraper uses CORS proxy
 * - All scrapers available including CORS proxy-based ones
 */

import type { IMetadataScraper, IScrapedMetadata } from '@/types';
import { ContentType } from '@/types';
import { GenericScraper } from './GenericScraper';
import { HTMLScraper } from './HTMLScraper';
import { PornhubScraper } from './PornhubScraper';
import { YouPornScraper } from './YouPornScraper';
import { YtDlpScraper } from './YtDlpScraper';
import { StashScraper } from './StashScraper';
import { BooruScraper } from './BooruScraper';
import { withTimeout, createLogger } from '@/utils';

const log = createLogger('ScraperRegistry');

export class ScraperRegistry {
  private scrapers: IMetadataScraper[] = [];
  private fallbackScraper: IMetadataScraper;
  private readonly overallTimeoutMs = 90000; // 90 seconds overall timeout for entire scraping operation

  constructor() {
    this.fallbackScraper = new GenericScraper();

    const isStashEnv = this.isStashEnvironment();

    // Register built-in scrapers based on environment
    // Priority: yt-dlp first (always extracts video URLs), StashScraper as fallback
    // In Stash environment:
    // - YtDlpScraper uses server-side extraction (no CORS)
    // - StashScraper available as fallback (server-side, no CORS)
    // - Skip client-side scrapers that fail due to CSP
    // In test-app:
    // - YtDlpScraper uses CORS proxy
    // - All scrapers available (CORS proxy required)

    // Video scrapers (yt-dlp primary)
    this.register(new YtDlpScraper());
    this.register(new StashScraper());

    // Image scrapers (booru sites)
    this.register(new BooruScraper());

    if (!isStashEnv) {
      // Client-side scrapers only work in test-app with CORS proxy
      console.log('[ScraperRegistry] Test-app mode: enabling client-side scrapers');
      this.register(new PornhubScraper());
      this.register(new YouPornScraper());
      this.register(new HTMLScraper());
    } else {
      console.log('[ScraperRegistry] Stash mode: using YtDlpScraper (primary) and StashScraper (fallback) - server-side');
    }
  }

  /**
   * Check if running in Stash environment
   */
  private isStashEnvironment(): boolean {
    return !!(
      typeof window !== 'undefined' &&
      window.PluginApi &&
      !(window as any).__TEST_APP__
    );
  }

  /**
   * Register a new scraper
   */
  register(scraper: IMetadataScraper): void {
    this.scrapers.push(scraper);
  }

  /**
   * Find appropriate scraper for URL with optional content type filter
   * @param url URL to scrape
   * @param preferredContentType Optional content type to filter scrapers
   * @returns The first registered scraper that can handle the URL and content type
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
   * Tries registered scrapers in order, falls back to GenericScraper
   * Wrapped with overall timeout to prevent hanging
   * @param url URL to scrape
   * @param preferredContentType Optional content type preference
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
   * When primary scraper fails to extract metadata, tries other scrapers for metadata-only enhancement
   * @param url URL to scrape
   * @param preferredContentType Optional content type preference
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
   * Tries registered scrapers in order, falls back to GenericScraper
   */
  private async _scrape(url: string, preferredContentType?: ContentType): Promise<IScrapedMetadata> {
    log.info(`========================================`);
    log.info(`Starting scrape for: ${url}`);
    log.info(`Available scrapers: ${this.scrapers.map(s => s.name).join(', ') || 'none'}`);
    log.info(`Environment: ${this.isStashEnvironment() ? 'Stash (server-side only)' : 'test-app'}`);
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
   * Returns array of {name, canHandle} for UI display
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
      console.warn(`[ScraperRegistry] Scraper "${scraperName}" cannot handle URL: ${url}, but will try anyway`);
    }

    console.log(`[ScraperRegistry] Manually scraping with "${scraperName}" for: ${url}`);
    const metadata = await scraper.scrape(url);
    console.log(`[ScraperRegistry] [Scraper] ${scraperName} succeeded - extracted:`,
      Object.entries(metadata)
        .filter(([_, v]) => v !== undefined && v !== null && v !== '')
        .map(([k, v]) => Array.isArray(v) ? `${v.length} ${k}` : k)
        .join(', ')
    );
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
