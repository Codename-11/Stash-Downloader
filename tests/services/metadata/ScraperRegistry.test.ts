import { describe, it, expect, vi, beforeEach } from 'vitest';
import { ScraperRegistry } from '@/services/metadata/ScraperRegistry';
import { ContentType } from '@/types';
import type { IMetadataScraper, IScrapedMetadata } from '@/types';

// Mock scraper factory for testing
function createMockScraper(
  name: string,
  domains: string[],
  contentTypes: ContentType[],
  scrapeResult?: Partial<IScrapedMetadata>,
  shouldFail = false
): IMetadataScraper {
  return {
    name,
    supportedDomains: domains,
    contentTypes,
    canHandle: (url: string) => {
      try {
        const urlObj = new URL(url);
        return domains.some(d => urlObj.hostname.includes(d));
      } catch {
        return false;
      }
    },
    scrape: vi.fn().mockImplementation(async (url: string) => {
      if (shouldFail) {
        throw new Error(`${name} scraper failed`);
      }
      return {
        url,
        title: `${name} Title`,
        contentType: contentTypes[0] || ContentType.Video,
        ...scrapeResult,
      };
    }),
  };
}

describe('ScraperRegistry', () => {
  describe('findScraper', () => {
    it('should return a scraper for booru URLs', () => {
      const registry = new ScraperRegistry();

      // YtDlpScraper is registered first and handles all URLs
      // But when requesting Image content type, BooruScraper should be used
      const scraper = registry.findScraper(
        'https://rule34.xxx/index.php?page=post&s=view&id=123',
        ContentType.Image
      );
      expect(scraper.name).toBe('Booru');
    });

    it('should return fallback scraper for unknown URLs', () => {
      const registry = new ScraperRegistry();

      const scraper = registry.findScraper('https://unknown-site.com/video');
      // YtDlpScraper handles all URLs, so it should be returned
      expect(scraper).toBeDefined();
      expect(scraper.name).toBeDefined();
    });

    it('should filter by content type preference for Image', () => {
      const registry = new ScraperRegistry();

      // Request image content type - YtDlp doesn't support Image, so BooruScraper is used
      const scraper = registry.findScraper(
        'https://rule34.xxx/index.php?page=post&s=view&id=123',
        ContentType.Image
      );
      expect(scraper.contentTypes).toContain(ContentType.Image);
      expect(scraper.name).toBe('Booru');
    });

    it('should use first matching scraper when no content type specified', () => {
      const registry = new ScraperRegistry();

      // Without content type, YtDlpScraper (first registered, handles all) wins
      const scraper = registry.findScraper('https://rule34.xxx/index.php?page=post&s=view&id=123');
      expect(scraper).toBeDefined();
      // YtDlpScraper is first and handles all URLs
      expect(scraper.name).toBe('yt-dlp');
    });
  });

  describe('getScrapersForContentType', () => {
    it('should return scrapers supporting Image content type', () => {
      const registry = new ScraperRegistry();
      const imageScrapers = registry.getScrapersForContentType(ContentType.Image);

      expect(imageScrapers.length).toBeGreaterThan(0);
      expect(imageScrapers.every(s => s.contentTypes.includes(ContentType.Image))).toBe(true);

      // BooruScraper should be in the list
      expect(imageScrapers.some(s => s.name === 'Booru')).toBe(true);
    });

    it('should return scrapers supporting Video content type', () => {
      const registry = new ScraperRegistry();
      const videoScrapers = registry.getScrapersForContentType(ContentType.Video);

      expect(videoScrapers.length).toBeGreaterThan(0);
      expect(videoScrapers.every(s => s.contentTypes.includes(ContentType.Video))).toBe(true);
    });

    it('should return scrapers supporting Gallery content type', () => {
      const registry = new ScraperRegistry();
      const galleryScrapers = registry.getScrapersForContentType(ContentType.Gallery);

      expect(galleryScrapers.length).toBeGreaterThan(0);
      expect(galleryScrapers.every(s => s.contentTypes.includes(ContentType.Gallery))).toBe(true);
    });
  });

  describe('register', () => {
    it('should add custom scraper to registry', () => {
      const registry = new ScraperRegistry();
      const customScraper = createMockScraper(
        'CustomScraper',
        ['custom-site.com'],
        [ContentType.Video]
      );

      registry.register(customScraper);

      const scrapers = registry.getScrapers();
      expect(scrapers.some(s => s.name === 'CustomScraper')).toBe(true);
    });
  });

  describe('getScrapers', () => {
    it('should return all registered scrapers including fallback', () => {
      const registry = new ScraperRegistry();
      const scrapers = registry.getScrapers();

      expect(scrapers.length).toBeGreaterThan(0);
      // Should include GenericScraper as fallback
      expect(scrapers.some(s => s.name === 'Generic')).toBe(true);
    });

    it('should include BooruScraper in registered scrapers', () => {
      const registry = new ScraperRegistry();
      const scrapers = registry.getScrapers();

      expect(scrapers.some(s => s.name === 'Booru')).toBe(true);
    });
  });

  describe('content type filtering', () => {
    it('should skip YtDlpScraper for Image content type (it only supports Video)', () => {
      const registry = new ScraperRegistry();

      // For booru URL with Image content type,
      // YtDlpScraper should be skipped (Video only), BooruScraper should be used
      const scraper = registry.findScraper(
        'https://rule34.xxx/index.php?page=post&s=view&id=123',
        ContentType.Image
      );

      expect(scraper.name).toBe('Booru');
      expect(scraper.contentTypes).toContain(ContentType.Image);
    });

    it('should skip BooruScraper for Video content type', () => {
      const registry = new ScraperRegistry();

      // For booru URL with Video content type,
      // BooruScraper should be skipped (Image/Gallery only)
      const scraper = registry.findScraper(
        'https://rule34.xxx/index.php?page=post&s=view&id=123',
        ContentType.Video
      );

      // Should NOT be BooruScraper
      expect(scraper.name).not.toBe('Booru');
      expect(scraper.contentTypes).toContain(ContentType.Video);
    });
  });
});

describe('ScraperRegistry scraper registration', () => {
  // Test the registration and retrieval mechanisms
  // Note: Built-in scrapers (YtDlp, HTMLScraper, etc.) handle many URLs,
  // so we test registration behavior rather than priority with custom scrapers

  describe('custom scraper registration', () => {
    it('should add custom scrapers to getScrapers() result', () => {
      const registry = new ScraperRegistry();
      const initialCount = registry.getScrapers().length;

      const customScraper = createMockScraper(
        'CustomScraper',
        ['custom.example'],
        [ContentType.Video]
      );
      registry.register(customScraper);

      expect(registry.getScrapers().length).toBe(initialCount + 1);
      expect(registry.getScrapers().some(s => s.name === 'CustomScraper')).toBe(true);
    });

    it('should allow multiple custom scrapers', () => {
      const registry = new ScraperRegistry();

      const scraper1 = createMockScraper('Custom1', ['a.example'], [ContentType.Video]);
      const scraper2 = createMockScraper('Custom2', ['b.example'], [ContentType.Image]);

      registry.register(scraper1);
      registry.register(scraper2);

      const scrapers = registry.getScrapers();
      expect(scrapers.some(s => s.name === 'Custom1')).toBe(true);
      expect(scrapers.some(s => s.name === 'Custom2')).toBe(true);
    });
  });

  describe('content type filtering with getScrapersForContentType', () => {
    it('should only return scrapers that support the requested content type', () => {
      const registry = new ScraperRegistry();

      // Add video-only scraper
      const videoScraper = createMockScraper(
        'VideoOnlyScraper',
        ['video.example'],
        [ContentType.Video]
      );
      registry.register(videoScraper);

      // Video scrapers should include our new one
      const videoScrapers = registry.getScrapersForContentType(ContentType.Video);
      expect(videoScrapers.some(s => s.name === 'VideoOnlyScraper')).toBe(true);

      // Image scrapers should NOT include our video-only scraper
      const imageScrapers = registry.getScrapersForContentType(ContentType.Image);
      expect(imageScrapers.some(s => s.name === 'VideoOnlyScraper')).toBe(false);
    });

    it('should return scrapers supporting multiple content types in both lists', () => {
      const registry = new ScraperRegistry();

      // Add multi-type scraper
      const multiScraper = createMockScraper(
        'MultiTypeScraper',
        ['multi.example'],
        [ContentType.Video, ContentType.Image]
      );
      registry.register(multiScraper);

      expect(registry.getScrapersForContentType(ContentType.Video).some(s => s.name === 'MultiTypeScraper')).toBe(true);
      expect(registry.getScrapersForContentType(ContentType.Image).some(s => s.name === 'MultiTypeScraper')).toBe(true);
    });
  });
});
