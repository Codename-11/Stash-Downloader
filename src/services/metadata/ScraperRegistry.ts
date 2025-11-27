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
import { GenericScraper } from './GenericScraper';
import { HTMLScraper } from './HTMLScraper';
import { PornhubScraper } from './PornhubScraper';
import { YouPornScraper } from './YouPornScraper';
import { YtDlpScraper } from './YtDlpScraper';
import { StashScraper } from './StashScraper';
import { withTimeout } from '@/utils';

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

    this.register(new YtDlpScraper());
    this.register(new StashScraper());

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
   * Find appropriate scraper for URL
   * Returns the first registered scraper that can handle the URL
   */
  findScraper(url: string): IMetadataScraper {
    for (const scraper of this.scrapers) {
      if (scraper.canHandle(url)) {
        console.log(`[ScraperRegistry] Using ${scraper.name} for ${url}`);
        return scraper;
      }
    }

    console.log(`[ScraperRegistry] Using fallback scraper for ${url}`);
    return this.fallbackScraper;
  }

  /**
   * Scrape metadata from URL
   * Tries registered scrapers in order, falls back to GenericScraper
   * Wrapped with overall timeout to prevent hanging
   */
  async scrape(url: string): Promise<IScrapedMetadata> {
    return withTimeout(
      this._scrape(url),
      this.overallTimeoutMs,
      `Metadata scraping timed out after ${this.overallTimeoutMs}ms`
    );
  }

  /**
   * Internal scrape method (without timeout wrapper)
   * Tries registered scrapers in order, falls back to GenericScraper
   */
  private async _scrape(url: string): Promise<IScrapedMetadata> {
    console.log(`[ScraperRegistry] ========================================`);
    console.log(`[ScraperRegistry] Starting scrape for: ${url}`);
    console.log(`[ScraperRegistry] Available scrapers:`, this.scrapers.map(s => s.name).join(', ') || 'none');
    console.log(`[ScraperRegistry] Environment: ${this.isStashEnvironment() ? 'Stash (server-side only)' : 'test-app'}`);
    console.log(`[ScraperRegistry] ========================================`);

    let lastErrorMsg = 'Unknown error';

    // Try each registered scraper in order
    for (const scraper of this.scrapers) {
      if (!scraper.canHandle(url)) {
        console.log(`[ScraperRegistry] ${scraper.name} cannot handle this URL, skipping`);
        continue;
      }

      try {
        console.log(`[ScraperRegistry] Attempting ${scraper.name} extraction...`);
        const result = await scraper.scrape(url);
        console.log(`[ScraperRegistry] ${scraper.name} extraction successful`);
        return result;
      } catch (error) {
        const errorMsg = error instanceof Error ? error.message : String(error);
        lastErrorMsg = errorMsg;
        console.warn(`[ScraperRegistry] ${scraper.name} failed: ${errorMsg}`);
        // Continue to next scraper
      }
    }

    // Last resort: use generic scraper (URL parsing only)
    console.log('[ScraperRegistry] All scrapers failed, using GenericScraper as last resort');
    try {
      return await this.fallbackScraper.scrape(url);
    } catch (fallbackError) {
      console.error('[ScraperRegistry] Even GenericScraper failed:', fallbackError);
      throw new Error(`All scrapers failed for ${url}. Last error: ${lastErrorMsg}`);
    }
  }

  /**
   * Get all registered scrapers
   */
  getScrapers(): IMetadataScraper[] {
    return [...this.scrapers, this.fallbackScraper];
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
