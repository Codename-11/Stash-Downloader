/**
 * ScraperRegistry - Manages metadata scrapers
 */

import type { IMetadataScraper, IScrapedMetadata } from '@/types';
import { GenericScraper } from './GenericScraper';
import { extractDomain } from '@/utils';

export class ScraperRegistry {
  private scrapers: IMetadataScraper[] = [];
  private fallbackScraper: IMetadataScraper;

  constructor() {
    this.fallbackScraper = new GenericScraper();
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
    const domain = extractDomain(url);

    if (!domain) {
      return this.fallbackScraper;
    }

    // Find first scraper that can handle this URL
    const scraper = this.scrapers.find((s) => {
      if (s.supportedDomains.includes('*')) return true;
      return s.supportedDomains.some(
        (d) => domain === d || domain.endsWith(`.${d}`)
      );
    });

    return scraper ?? this.fallbackScraper;
  }

  /**
   * Scrape metadata from URL
   */
  async scrape(url: string): Promise<IScrapedMetadata> {
    const scraper = this.findScraper(url);
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
