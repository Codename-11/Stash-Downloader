/**
 * ScraperRegistry - Manages metadata scrapers
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

    // Register built-in scrapers
    // Order matters:
    // 1. Stash built-in (server-side, no CORS) - highest priority in Stash environment
    // 2. yt-dlp (if available) - best for getting actual video URLs
    // 3. Specific site scrapers
    // 4. Generic HTML scraper
    this.register(new StashScraper());  // Try Stash first (server-side, no CORS)
    this.register(new YtDlpScraper());  // Then yt-dlp for video URLs
    this.register(new PornhubScraper());
    this.register(new YouPornScraper());
    this.register(new HTMLScraper());
  }

  /**
   * Register a new scraper
   */
  register(scraper: IMetadataScraper): void {
    this.scrapers.push(scraper);
  }

  /**
   * Find appropriate scraper for URL
   */
  findScraper(url: string): IMetadataScraper {
    // Priority order:
    // 1. Stash Built-in (server-side, no CORS) - if in Stash environment
    // 2. yt-dlp (for video URL extraction)
    // 3. Site-specific scrapers
    // 4. Generic HTML scraper
    // 5. Fallback

    // Try Stash built-in first (server-side, no CORS issues)
    const stashScraper = this.scrapers.find((s) => s.name === 'Stash Built-in');
    if (stashScraper && stashScraper.canHandle(url)) {
      console.log(`[ScraperRegistry] Using ${stashScraper.name} for ${url} (server-side, no CORS)`);
      return stashScraper;
    }

    // Try yt-dlp next as it usually gets the best quality video URLs
    const ytDlpScraper = this.scrapers.find((s) => s.name === 'yt-dlp');
    if (ytDlpScraper && ytDlpScraper.canHandle(url)) {
      console.log(`[ScraperRegistry] Using ${ytDlpScraper.name} for ${url} (priority scraper for best quality)`);
      return ytDlpScraper;
    }

    // Use canHandle method for more accurate matching
    // Prioritize specific scrapers over wildcard scrapers
    const specificScraper = this.scrapers.find(
      (s) => s.name !== 'yt-dlp' && s.name !== 'Stash Built-in' && !s.supportedDomains.includes('*') && s.canHandle(url)
    );

    if (specificScraper) {
      console.log(`[ScraperRegistry] Using ${specificScraper.name} for ${url}`);
      return specificScraper;
    }

    // Fall back to wildcard scrapers (excluding already-tried scrapers)
    const wildcardScraper = this.scrapers.find(
      (s) => s.name !== 'yt-dlp' && s.name !== 'Stash Built-in' && s.supportedDomains.includes('*') && s.canHandle(url)
    );

    if (wildcardScraper) {
      console.log(`[ScraperRegistry] Using ${wildcardScraper.name} for ${url}`);
      return wildcardScraper;
    }

    console.log(`[ScraperRegistry] Using fallback scraper for ${url}`);
    return this.fallbackScraper;
  }

  /**
   * Scrape metadata from URL
   * Tries yt-dlp first, falls back to HTML scrapers if it fails
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
   * Priority: Stash Built-in -> yt-dlp -> Site-specific -> HTML -> Generic
   */
  private async _scrape(url: string): Promise<IScrapedMetadata> {
    const scraper = this.findScraper(url);
    console.log(`[ScraperRegistry] ========================================`);
    console.log(`[ScraperRegistry] Starting scrape for: ${url}`);
    console.log(`[ScraperRegistry] Selected scraper: ${scraper.name}`);
    console.log(`[ScraperRegistry] Available scrapers:`, this.scrapers.map(s => s.name).join(', '));
    console.log(`[ScraperRegistry] ========================================`);

    const triedScrapers = new Set<string>();
    let lastErrorMsg = 'Unknown error';

    // Helper to try a scraper
    const tryScraper = async (s: IMetadataScraper): Promise<IScrapedMetadata | null> => {
      if (triedScrapers.has(s.name)) return null;
      triedScrapers.add(s.name);

      try {
        console.log(`[ScraperRegistry] Attempting ${s.name} extraction...`);
        const result = await s.scrape(url);
        console.log(`[ScraperRegistry] ${s.name} extraction successful`);
        return result;
      } catch (error) {
        const errorMsg = error instanceof Error ? error.message : String(error);
        lastErrorMsg = errorMsg;
        console.warn(`[ScraperRegistry] ${s.name} failed: ${errorMsg}`);
        return null;
      }
    };

    // Try selected scraper first
    let result = await tryScraper(scraper);
    if (result) return result;

    // If Stash scraper failed or wasn't selected, try yt-dlp
    const ytDlpScraper = this.scrapers.find((s) => s.name === 'yt-dlp');
    if (ytDlpScraper && ytDlpScraper.canHandle(url)) {
      result = await tryScraper(ytDlpScraper);
      if (result) return result;
    }

    // Try site-specific scrapers
    for (const s of this.scrapers) {
      if (s.name !== 'yt-dlp' && s.name !== 'Stash Built-in' && !s.supportedDomains.includes('*') && s.canHandle(url)) {
        result = await tryScraper(s);
        if (result) return result;
      }
    }

    // Try wildcard scrapers (HTML Meta Tags, etc.)
    for (const s of this.scrapers) {
      if (s.supportedDomains.includes('*') && s.name !== 'Stash Built-in' && s.canHandle(url)) {
        result = await tryScraper(s);
        if (result) return result;
      }
    }

    // Last resort: use generic scraper
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
