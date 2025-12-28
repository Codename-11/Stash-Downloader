import { describe, it, expect } from 'vitest';
import { BooruScraper } from '@/services/metadata/BooruScraper';
import { ContentType } from '@/types';

describe('BooruScraper', () => {
  const scraper = new BooruScraper();

  describe('canHandle', () => {
    it('should handle rule34.xxx URLs', () => {
      expect(scraper.canHandle('https://rule34.xxx/index.php?page=post&s=view&id=123')).toBe(true);
      expect(scraper.canHandle('https://www.rule34.xxx/index.php?page=post&s=view&id=123')).toBe(true);
    });

    it('should handle gelbooru.com URLs', () => {
      expect(scraper.canHandle('https://gelbooru.com/index.php?page=post&s=view&id=456')).toBe(true);
      expect(scraper.canHandle('https://www.gelbooru.com/index.php?page=post&s=view&id=456')).toBe(true);
    });

    it('should handle safebooru.org URLs', () => {
      expect(scraper.canHandle('https://safebooru.org/index.php?page=post&s=view&id=789')).toBe(true);
    });

    it('should handle danbooru.donmai.us URLs', () => {
      expect(scraper.canHandle('https://danbooru.donmai.us/posts/12345')).toBe(true);
      expect(scraper.canHandle('https://danbooru.donmai.us/pools/678')).toBe(true);
    });

    it('should not handle unsupported URLs', () => {
      expect(scraper.canHandle('https://example.com/video.mp4')).toBe(false);
      expect(scraper.canHandle('https://pornhub.com/view')).toBe(false);
      expect(scraper.canHandle('not-a-url')).toBe(false);
    });
  });

  describe('contentTypes', () => {
    it('should support Image and Gallery content types', () => {
      expect(scraper.contentTypes).toContain(ContentType.Image);
      expect(scraper.contentTypes).toContain(ContentType.Gallery);
    });

    it('should not support Video content type', () => {
      expect(scraper.contentTypes).not.toContain(ContentType.Video);
    });
  });

  describe('supportedDomains', () => {
    it('should list all supported domains', () => {
      expect(scraper.supportedDomains).toContain('rule34.xxx');
      expect(scraper.supportedDomains).toContain('gelbooru.com');
      expect(scraper.supportedDomains).toContain('safebooru.org');
      expect(scraper.supportedDomains).toContain('danbooru.donmai.us');
    });
  });

  describe('name', () => {
    it('should have name "Booru"', () => {
      expect(scraper.name).toBe('Booru');
    });
  });

  // Note: Integration tests for scrape() would require mocking fetch
  // or actual network calls, which are better suited for E2E tests
});
