import { describe, it, expect, beforeEach } from 'vitest';
import { YouPornScraper } from '@/services/metadata/YouPornScraper';

describe('YouPornScraper', () => {
  let scraper: YouPornScraper;

  beforeEach(() => {
    scraper = new YouPornScraper();
  });

  describe('canHandle', () => {
    it('should handle youporn.com URLs', () => {
      expect(scraper.canHandle('https://www.youporn.com/watch/16710604/')).toBe(true);
      expect(scraper.canHandle('https://youporn.com/watch/12345/video-title/')).toBe(true);
    });

    it('should not handle non-youporn URLs', () => {
      expect(scraper.canHandle('https://www.pornhub.com/view_video.php?viewkey=abc')).toBe(false);
      expect(scraper.canHandle('https://example.com/video.mp4')).toBe(false);
    });

    it('should handle invalid URLs gracefully', () => {
      expect(scraper.canHandle('not a url')).toBe(false);
      expect(scraper.canHandle('')).toBe(false);
    });
  });

  describe('name and supportedDomains', () => {
    it('should have correct name', () => {
      expect(scraper.name).toBe('YouPorn');
    });

    it('should have correct supported domains', () => {
      expect(scraper.supportedDomains).toContain('youporn.com');
      expect(scraper.supportedDomains).toContain('www.youporn.com');
    });
  });

  describe('extractTitle', () => {
    it('should extract title from h1.video-title', () => {
      const html = '<h1 class="video-title">Test Video Title</h1>';
      const doc = new DOMParser().parseFromString(html, 'text/html');
      const title = (scraper as any).extractTitle(doc);
      expect(title).toBe('Test Video Title');
    });

    it('should extract title from og:title meta tag', () => {
      const html = '<meta property="og:title" content="Test Video - YouPorn.com" />';
      const doc = new DOMParser().parseFromString(html, 'text/html');
      const title = (scraper as any).extractTitle(doc);
      expect(title).toBe('Test Video');
    });

    it('should remove YouPorn.com suffix', () => {
      const html = '<meta property="og:title" content="Test Video | YouPorn.com" />';
      const doc = new DOMParser().parseFromString(html, 'text/html');
      const title = (scraper as any).extractTitle(doc);
      expect(title).toBe('Test Video');
    });

    it('should return default title if none found', () => {
      const html = '<div>No title here</div>';
      const doc = new DOMParser().parseFromString(html, 'text/html');
      const title = (scraper as any).extractTitle(doc);
      expect(title).toBe('YouPorn Video');
    });
  });

  describe('extractDuration', () => {
    it('should extract duration from meta tag', () => {
      const html = '<meta property="video:duration" content="600" />';
      const doc = new DOMParser().parseFromString(html, 'text/html');
      const duration = (scraper as any).extractDuration(doc);
      expect(duration).toBe(600);
    });

    it('should parse MM:SS format', () => {
      const html = '<div class="duration">12:34</div>';
      const doc = new DOMParser().parseFromString(html, 'text/html');
      const duration = (scraper as any).extractDuration(doc);
      expect(duration).toBe(12 * 60 + 34);
    });

    it('should parse HH:MM:SS format', () => {
      const html = '<div class="duration">1:23:45</div>';
      const doc = new DOMParser().parseFromString(html, 'text/html');
      const duration = (scraper as any).extractDuration(doc);
      expect(duration).toBe(1 * 3600 + 23 * 60 + 45);
    });

    it('should return undefined if no duration found', () => {
      const html = '<div>No duration</div>';
      const doc = new DOMParser().parseFromString(html, 'text/html');
      const duration = (scraper as any).extractDuration(doc);
      expect(duration).toBeUndefined();
    });
  });

  describe('extractThumbnail', () => {
    it('should extract thumbnail from og:image', () => {
      const html = '<meta property="og:image" content="https://example.com/thumb.jpg" />';
      const doc = new DOMParser().parseFromString(html, 'text/html');
      const thumbnail = (scraper as any).extractThumbnail(doc);
      expect(thumbnail).toBe('https://example.com/thumb.jpg');
    });

    it('should return undefined if no thumbnail found', () => {
      const html = '<div>No thumbnail</div>';
      const doc = new DOMParser().parseFromString(html, 'text/html');
      const thumbnail = (scraper as any).extractThumbnail(doc);
      expect(thumbnail).toBeUndefined();
    });
  });

  describe('extractPerformers', () => {
    it('should extract performers from pornstar links', () => {
      const html = `
        <a href="/pornstar/performer-one/">Performer One</a>
        <a href="/pornstar/performer-two/">Performer Two</a>
      `;
      const doc = new DOMParser().parseFromString(html, 'text/html');
      const performers = (scraper as any).extractPerformers(doc);
      expect(performers).toContain('Performer One');
      expect(performers).toContain('Performer Two');
    });

    it('should deduplicate performers', () => {
      const html = `
        <a href="/pornstar/performer-one/">Performer One</a>
        <a href="/pornstar/performer-one/">Performer One</a>
      `;
      const doc = new DOMParser().parseFromString(html, 'text/html');
      const performers = (scraper as any).extractPerformers(doc);
      expect(performers).toEqual(['Performer One']);
    });
  });

  describe('extractTags', () => {
    it('should extract tags from category links', () => {
      const html = `
        <a href="/category/amateur/">Amateur</a>
        <a href="/category/hd/">HD</a>
      `;
      const doc = new DOMParser().parseFromString(html, 'text/html');
      const tags = (scraper as any).extractTags(doc);
      expect(tags).toContain('Amateur');
      expect(tags).toContain('HD');
    });
  });

  describe('extractVideoUrl', () => {
    it('should extract video URL from window.videoData', () => {
      const html = `
        <script>
          window.videoData = {
            "sources": {
              "720": {"url": "https://example.com/video-720.mp4", "quality": "720"},
              "1080": {"url": "https://example.com/video-1080.mp4", "quality": "1080"}
            }
          };
        </script>
      `;
      const doc = new DOMParser().parseFromString(html, 'text/html');
      const videoUrl = (scraper as any).extractVideoUrl(html, doc);
      expect(videoUrl).toBe('https://example.com/video-1080.mp4');
    });

    it('should extract and unescape JSON-escaped video URLs', () => {
      const html = `
        <script>
          var settings = {"video":"https:\\/\\/ev-ph.ypncdn.com\\/videos\\/202205\\/11\\/407902931\\/360P_360K_407902931_fb.mp4?validfrom=123"};
        </script>
      `;
      const doc = new DOMParser().parseFromString(html, 'text/html');
      const videoUrl = (scraper as any).extractVideoUrl(html, doc);
      expect(videoUrl).toBe('https://ev-ph.ypncdn.com/videos/202205/11/407902931/360P_360K_407902931_fb.mp4?validfrom=123');
    });

    it('should extract video URL from JSON-LD', () => {
      const html = `
        <script type="application/ld+json">
        {
          "@type": "VideoObject",
          "contentUrl": "https://example.com/video.mp4"
        }
        </script>
      `;
      const doc = new DOMParser().parseFromString(html, 'text/html');
      const videoUrl = (scraper as any).extractVideoUrl(html, doc);
      expect(videoUrl).toBe('https://example.com/video.mp4');
    });

    it('should find mp4 URLs in scripts as fallback', () => {
      const html = `
        <script>
          var videoSrc = "https://example.com/myvideo.mp4?token=abc123";
        </script>
      `;
      const doc = new DOMParser().parseFromString(html, 'text/html');
      const videoUrl = (scraper as any).extractVideoUrl(html, doc);
      expect(videoUrl).toContain('.mp4');
      expect(videoUrl).toContain('example.com');
    });

    it('should return undefined if no video URL found', () => {
      const html = '<div>No video here</div>';
      const doc = new DOMParser().parseFromString(html, 'text/html');
      const videoUrl = (scraper as any).extractVideoUrl(html, doc);
      expect(videoUrl).toBeUndefined();
    });
  });
});
