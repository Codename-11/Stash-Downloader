/**
 * ScraperRegistry - Manages metadata scrapers
 */

import type { IMetadataScraper, IScrapedMetadata } from '@/types';
import { GenericScraper } from './GenericScraper';
import { HTMLScraper } from './HTMLScraper';
import { PornhubScraper } from './PornhubScraper';
import { extractDomain } from '@/utils';

export class ScraperRegistry {
  private scrapers: IMetadataScraper[] = [];
  private fallbackScraper: IMetadataScraper;

  constructor() {
    this.fallbackScraper = new GenericScraper();

    // Register built-in scrapers
    // Order matters: more specific scrapers first, generic ones last
    this.register(new PornhubScraper());
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
