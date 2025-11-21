import { describe, it, expect } from 'vitest';
import { GenericScraper } from '@/services/metadata/GenericScraper';

describe('GenericScraper', () => {
  const scraper = new GenericScraper();

  describe('canHandle', () => {
    it('should handle any URL (fallback scraper)', () => {
      expect(scraper.canHandle('https://example.com/video.mp4')).toBe(true);
      expect(scraper.canHandle('https://pornhub.com/view_video.php?viewkey=123')).toBe(true);
      expect(scraper.canHandle('invalid-url')).toBe(true);
    });
  });

  describe('scrape', () => {
    it('should extract title from URL filename', async () => {
      const metadata = await scraper.scrape('https://example.com/my-video-title.mp4');

      expect(metadata.title).toBe('my video title');
      expect(metadata.url).toBe('https://example.com/my-video-title.mp4');
      expect(metadata.contentType).toBe('video');
    });

    it('should detect video content type from extension', async () => {
      const mp4 = await scraper.scrape('https://example.com/video.mp4');
      const webm = await scraper.scrape('https://example.com/video.webm');
      const mkv = await scraper.scrape('https://example.com/video.mkv');

      expect(mp4.contentType).toBe('video');
      expect(webm.contentType).toBe('video');
      expect(mkv.contentType).toBe('video');
    });

    it('should detect image content type from extension', async () => {
      const jpg = await scraper.scrape('https://example.com/image.jpg');
      const png = await scraper.scrape('https://example.com/image.png');
      const gif = await scraper.scrape('https://example.com/image.gif');

      expect(jpg.contentType).toBe('image');
      expect(png.contentType).toBe('image');
      expect(gif.contentType).toBe('image');
    });

    it('should default to video for unknown extensions', async () => {
      const metadata = await scraper.scrape('https://example.com/unknown.xyz');

      expect(metadata.contentType).toBe('video');
    });

    it('should decode URL-encoded filenames', async () => {
      const metadata = await scraper.scrape('https://example.com/My%20Video%20Title.mp4');

      expect(metadata.title).toBe('My Video Title');
    });

    it('should replace hyphens and underscores with spaces', async () => {
      const metadata = await scraper.scrape('https://example.com/my-video_title.mp4');

      expect(metadata.title).toBe('my video title');
    });

    it('should handle URLs without file extension', async () => {
      const metadata = await scraper.scrape('https://example.com/video');

      expect(metadata.title).toBeDefined();
      expect(metadata.contentType).toBe('video'); // Default
    });

    it('should handle malformed URLs gracefully', async () => {
      const metadata = await scraper.scrape('not-a-url');

      expect(metadata.title).toBe('Downloaded Content');
      expect(metadata.contentType).toBe('video');
    });
  });
});
