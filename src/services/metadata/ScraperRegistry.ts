/**
 * ScraperRegistry - Manages metadata scrapers
 */

import type { IMetadataScraper, IScrapedMetadata } from '@/types';
import { GenericScraper } from './GenericScraper';
import { HTMLScraper } from './HTMLScraper';
import { PornhubScraper } from './PornhubScraper';
import { YouPornScraper } from './YouPornScraper';
import { YtDlpScraper } from './YtDlpScraper';
import { extractDomain } from '@/utils';

export class ScraperRegistry {
  private scrapers: IMetadataScraper[] = [];
  private fallbackScraper: IMetadataScraper;

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
    // Use canHandle method for more accurate matching
    // Prioritize specific scrapers over wildcard scrapers
    const specificScraper = this.scrapers.find(
      (s) => !s.supportedDomains.includes('*') && s.canHandle(url)
    );

    if (specificScraper) {
      console.log(`[ScraperRegistry] Using ${specificScraper.name} for ${url}`);
      return specificScraper;
    }

    // Fall back to wildcard scrapers
    const wildcardScraper = this.scrapers.find(
      (s) => s.supportedDomains.includes('*') && s.canHandle(url)
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
   */
  async scrape(url: string): Promise<IScrapedMetadata> {
    const scraper = this.findScraper(url);

    // If using yt-dlp, try it but fall back to other scrapers if it fails
    if (scraper.name === 'yt-dlp') {
      try {
        return await scraper.scrape(url);
      } catch (error) {
        console.warn('[ScraperRegistry] yt-dlp failed, falling back to HTML scrapers:', error);

        // Find the next best scraper (skip yt-dlp)
        const fallbackScraper = this.scrapers.find(
          (s) => s.name !== 'yt-dlp' && !s.supportedDomains.includes('*') && s.canHandle(url)
        );

        if (fallbackScraper) {
          console.log(`[ScraperRegistry] Using fallback scraper: ${fallbackScraper.name}`);
          return await fallbackScraper.scrape(url);
        }

        // Try wildcard scrapers
        const wildcardScraper = this.scrapers.find(
          (s) => s.name !== 'yt-dlp' && s.supportedDomains.includes('*') && s.canHandle(url)
        );

        if (wildcardScraper) {
          console.log(`[ScraperRegistry] Using wildcard fallback: ${wildcardScraper.name}`);
          return await wildcardScraper.scrape(url);
        }

        // Last resort: use generic scraper
        console.log('[ScraperRegistry] Using final fallback: GenericScraper');
        return await this.fallbackScraper.scrape(url);
      }
    }

    return await scraper.scrape(url);
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
