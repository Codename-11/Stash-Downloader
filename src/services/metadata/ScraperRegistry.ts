/**
 * ScraperRegistry - Manages metadata scrapers
 */

import type { IMetadataScraper, IScrapedMetadata } from '@/types';
import { GenericScraper } from './GenericScraper';
import { HTMLScraper } from './HTMLScraper';
import { PornhubScraper } from './PornhubScraper';
import { YouPornScraper } from './YouPornScraper';
import { YtDlpScraper } from './YtDlpScraper';
import { withTimeout } from '@/utils';

export class ScraperRegistry {
  private scrapers: IMetadataScraper[] = [];
  private fallbackScraper: IMetadataScraper;
  private readonly overallTimeoutMs = 90000; // 90 seconds overall timeout for entire scraping operation

  constructor() {
    this.fallbackScraper = new GenericScraper();

    // Register built-in scrapers
    // Order matters: yt-dlp first (if available), then specific scrapers, then generic
    this.register(new YtDlpScraper());  // Try yt-dlp first for all URLs
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
    // ALWAYS try yt-dlp first as it usually gets the best quality
    // yt-dlp is designed to extract the highest quality streams available
    const ytDlpScraper = this.scrapers.find((s) => s.name === 'yt-dlp');
    if (ytDlpScraper && ytDlpScraper.canHandle(url)) {
      console.log(`[ScraperRegistry] Using ${ytDlpScraper.name} for ${url} (priority scraper for best quality)`);
      return ytDlpScraper;
    }

    // Use canHandle method for more accurate matching
    // Prioritize specific scrapers over wildcard scrapers
    const specificScraper = this.scrapers.find(
      (s) => s.name !== 'yt-dlp' && !s.supportedDomains.includes('*') && s.canHandle(url)
    );

    if (specificScraper) {
      console.log(`[ScraperRegistry] Using ${specificScraper.name} for ${url}`);
      return specificScraper;
    }

    // Fall back to wildcard scrapers (excluding yt-dlp which was already tried)
    const wildcardScraper = this.scrapers.find(
      (s) => s.name !== 'yt-dlp' && s.supportedDomains.includes('*') && s.canHandle(url)
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
   */
  private async _scrape(url: string): Promise<IScrapedMetadata> {
    const scraper = this.findScraper(url);
    console.log(`[ScraperRegistry] ========================================`);
    console.log(`[ScraperRegistry] Starting scrape for: ${url}`);
    console.log(`[ScraperRegistry] Selected scraper: ${scraper.name}`);
    console.log(`[ScraperRegistry] Available scrapers:`, this.scrapers.map(s => s.name).join(', '));
    console.log(`[ScraperRegistry] ========================================`);

    // If using yt-dlp, try it but fall back to other scrapers if it fails
    if (scraper.name === 'yt-dlp') {
      try {
        console.log('[ScraperRegistry] Attempting yt-dlp extraction...');
        const result = await scraper.scrape(url);
        console.log('[ScraperRegistry] yt-dlp extraction successful');
        return result;
      } catch (error) {
        const errorMsg = error instanceof Error ? error.message : String(error);
        console.warn('[ScraperRegistry] yt-dlp failed, falling back to HTML scrapers:', errorMsg);
        console.warn('[ScraperRegistry] yt-dlp error details:', error);

        // Find the next best scraper (skip yt-dlp)
        const fallbackScraper = this.scrapers.find(
          (s) => s.name !== 'yt-dlp' && !s.supportedDomains.includes('*') && s.canHandle(url)
        );

        if (fallbackScraper) {
          console.log(`[ScraperRegistry] Trying fallback scraper: ${fallbackScraper.name}`);
          try {
            const result = await fallbackScraper.scrape(url);
            console.log(`[ScraperRegistry] Fallback scraper ${fallbackScraper.name} succeeded`);
            return result;
          } catch (fallbackError) {
            console.error(`[ScraperRegistry] Fallback scraper ${fallbackScraper.name} also failed:`, fallbackError);
            // Continue to next fallback
          }
        }

        // Try wildcard scrapers
        const wildcardScraper = this.scrapers.find(
          (s) => s.name !== 'yt-dlp' && s.supportedDomains.includes('*') && s.canHandle(url)
        );

        if (wildcardScraper) {
          console.log(`[ScraperRegistry] Trying wildcard fallback: ${wildcardScraper.name}`);
          try {
            const result = await wildcardScraper.scrape(url);
            console.log(`[ScraperRegistry] Wildcard scraper ${wildcardScraper.name} succeeded`);
            return result;
          } catch (wildcardError) {
            console.error(`[ScraperRegistry] Wildcard scraper ${wildcardScraper.name} also failed:`, wildcardError);
            // Continue to final fallback
          }
        }

        // Last resort: use generic scraper
        console.log('[ScraperRegistry] Using final fallback: GenericScraper');
        return await this.fallbackScraper.scrape(url);
      }
    }

    // For non-yt-dlp scrapers, try them directly
    let lastError: Error | null = null;

    try {
      console.log(`[ScraperRegistry] Attempting ${scraper.name} extraction...`);
      const result = await scraper.scrape(url);
      console.log(`[ScraperRegistry] ${scraper.name} extraction successful`);
      return result;
    } catch (error) {
      const errorMsg = error instanceof Error ? error.message : String(error);
      lastError = error instanceof Error ? error : new Error(errorMsg);
      console.error(`[ScraperRegistry] ${scraper.name} failed:`, errorMsg);
      console.error('[ScraperRegistry] Full error:', error);

      // If specific scraper fails, try HTML scraper as fallback
      const htmlScraper = this.scrapers.find(s => s.name === 'HTML Meta Tags');
      if (htmlScraper && htmlScraper !== scraper) {
        console.log('[ScraperRegistry] Trying HTML scraper as fallback...');
        try {
          return await htmlScraper.scrape(url);
        } catch (htmlError) {
          console.error('[ScraperRegistry] HTML scraper also failed:', htmlError);
          lastError = htmlError instanceof Error ? htmlError : new Error(String(htmlError));
        }
      }

      // All scrapers failed - throw the last error instead of using fallback
      console.error('[ScraperRegistry] All scrapers failed, throwing error');
      throw new Error(`All scrapers failed for ${url}. Last error: ${lastError.message}`);
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
