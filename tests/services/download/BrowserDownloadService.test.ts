import { describe, it, expect, beforeEach, vi } from 'vitest';
import { BrowserDownloadService } from '@/services/download/BrowserDownloadService';
import type { IDownloadItem } from '@/types';

describe('BrowserDownloadService', () => {
  let service: BrowserDownloadService;

  beforeEach(() => {
    service = new BrowserDownloadService();
  });

  describe('generateFilename', () => {
    it('should use title from metadata if available', async () => {
      const item: Partial<IDownloadItem> = {
        url: 'https://example.com/video.php',
        metadata: {
          title: 'My Video Title',
          url: 'https://example.com/video.php',
          contentType: 'video' as const,
        },
      };

      const blob = new Blob(['test'], { type: 'video/mp4' });

      // Access private method through a workaround
      const filename = (service as any).generateFilename(item, blob);

      expect(filename).toBe('My Video Title.mp4');
    });

    it('should use editedMetadata title over regular metadata', async () => {
      const item: Partial<IDownloadItem> = {
        url: 'https://example.com/video.php',
        metadata: {
          title: 'Original Title',
          url: 'https://example.com/video.php',
          contentType: 'video' as const,
        },
        editedMetadata: {
          title: 'Edited Title',
        },
      };

      const blob = new Blob(['test'], { type: 'video/mp4' });
      const filename = (service as any).generateFilename(item, blob);

      expect(filename).toBe('Edited Title.mp4');
    });

    it('should detect extension from MIME type', () => {
      const item: Partial<IDownloadItem> = {
        url: 'https://example.com/video.php',
      };

      const mp4Blob = new Blob(['test'], { type: 'video/mp4' });
      const webmBlob = new Blob(['test'], { type: 'video/webm' });
      const jpgBlob = new Blob(['test'], { type: 'image/jpeg' });

      expect((service as any).generateFilename(item, mp4Blob)).toMatch(/\.mp4$/);
      expect((service as any).generateFilename(item, webmBlob)).toMatch(/\.webm$/);
      expect((service as any).generateFilename(item, jpgBlob)).toMatch(/\.jpg$/);
    });

    it('should fall back to URL extension when MIME type fails', () => {
      const item: Partial<IDownloadItem> = {
        url: 'https://example.com/video.mp4',
      };

      const blob = new Blob(['test'], { type: '' }); // Empty MIME type
      const filename = (service as any).generateFilename(item, blob);

      expect(filename).toMatch(/\.mp4$/);
    });

    it('should use fallback extension for unknown types', () => {
      const item: Partial<IDownloadItem> = {
        url: 'https://example.com/video.php',
        metadata: {
          url: 'https://example.com/video.php',
          contentType: 'video' as const,
        },
      };

      const blob = new Blob(['test'], { type: '' });
      const filename = (service as any).generateFilename(item, blob);

      expect(filename).toMatch(/\.mp4$/); // Default for video
    });

    it('should sanitize invalid characters from filename', () => {
      const item: Partial<IDownloadItem> = {
        url: 'https://example.com/video.php',
        metadata: {
          title: 'My/Video:Title*With<Invalid>Chars',
          url: 'https://example.com/video.php',
          contentType: 'video' as const,
        },
      };

      const blob = new Blob(['test'], { type: 'video/mp4' });
      const filename = (service as any).generateFilename(item, blob);

      // Invalid chars are replaced with underscores
      expect(filename).toBe('My_Video_Title_With_Invalid_Chars.mp4');
    });

    it('should strip invalid extensions like .php', () => {
      const item: Partial<IDownloadItem> = {
        url: 'https://example.com/view_video.php',
      };

      const blob = new Blob(['test'], { type: 'video/mp4' });
      const filename = (service as any).generateFilename(item, blob);

      expect(filename).not.toMatch(/\.php/);
      expect(filename).toMatch(/\.mp4$/);
    });
  });

  describe('getExtensionFromMimeType', () => {
    it('should map common video MIME types', () => {
      expect((service as any).getExtensionFromMimeType('video/mp4')).toBe('.mp4');
      expect((service as any).getExtensionFromMimeType('video/webm')).toBe('.webm');
      expect((service as any).getExtensionFromMimeType('video/quicktime')).toBe('.mov');
      expect((service as any).getExtensionFromMimeType('video/x-matroska')).toBe('.mkv');
    });

    it('should map common image MIME types', () => {
      expect((service as any).getExtensionFromMimeType('image/jpeg')).toBe('.jpg');
      expect((service as any).getExtensionFromMimeType('image/png')).toBe('.png');
      expect((service as any).getExtensionFromMimeType('image/gif')).toBe('.gif');
      expect((service as any).getExtensionFromMimeType('image/webp')).toBe('.webp');
    });

    it('should handle MIME types with parameters', () => {
      expect((service as any).getExtensionFromMimeType('video/mp4; codecs="avc1"')).toBe('.mp4');
      expect((service as any).getExtensionFromMimeType('image/jpeg; charset=utf-8')).toBe('.jpg');
    });

    it('should return .bin for unknown MIME types', () => {
      expect((service as any).getExtensionFromMimeType('application/octet-stream')).toBe('.bin');
      expect((service as any).getExtensionFromMimeType('unknown/type')).toBe('.bin');
      expect((service as any).getExtensionFromMimeType('')).toBe('.bin');
    });
  });

  describe('getExtensionFromUrl', () => {
    it('should extract valid video extensions from URL', () => {
      expect((service as any).getExtensionFromUrl('https://example.com/video.mp4')).toBe('.mp4');
      expect((service as any).getExtensionFromUrl('https://example.com/video.webm')).toBe('.webm');
      expect((service as any).getExtensionFromUrl('https://example.com/video.mkv')).toBe('.mkv');
    });

    it('should extract valid image extensions from URL', () => {
      expect((service as any).getExtensionFromUrl('https://example.com/image.jpg')).toBe('.jpg');
      expect((service as any).getExtensionFromUrl('https://example.com/image.png')).toBe('.png');
      expect((service as any).getExtensionFromUrl('https://example.com/image.gif')).toBe('.gif');
    });

    it('should return null for invalid extensions', () => {
      expect((service as any).getExtensionFromUrl('https://example.com/video.php')).toBeNull();
      expect((service as any).getExtensionFromUrl('https://example.com/page.html')).toBeNull();
      expect((service as any).getExtensionFromUrl('https://example.com/script.js')).toBeNull();
    });

    it('should return null for URLs without extension', () => {
      expect((service as any).getExtensionFromUrl('https://example.com/video')).toBeNull();
      expect((service as any).getExtensionFromUrl('https://example.com/')).toBeNull();
    });

    it('should handle malformed URLs gracefully', () => {
      expect((service as any).getExtensionFromUrl('not-a-url')).toBeNull();
      expect((service as any).getExtensionFromUrl('')).toBeNull();
    });
  });

  describe('sanitizeFilename', () => {
    it('should replace invalid filesystem characters with underscores', () => {
      const tests = [
        ['file<name', 'file_name'],
        ['file>name', 'file_name'],
        ['file:name', 'file_name'],
        ['file"name', 'file_name'],
        ['file/name', 'file_name'],
        ['file\\name', 'file_name'],
        ['file|name', 'file_name'],
        ['file?name', 'file_name'],
        ['file*name', 'file_name'],
      ];

      for (const [input, expected] of tests) {
        expect((service as any).sanitizeFilename(input)).toBe(expected);
      }
    });

    it('should trim leading/trailing spaces and dots', () => {
      expect((service as any).sanitizeFilename('  filename  ')).toBe('filename');
      expect((service as any).sanitizeFilename('.filename')).toBe('filename');
      expect((service as any).sanitizeFilename('...filename')).toBe('filename');
    });

    it('should limit filename length to 200 characters', () => {
      const longName = 'a'.repeat(250) + '.mp4';
      const result = (service as any).sanitizeFilename(longName);

      expect(result.length).toBeLessThanOrEqual(204); // 200 + .mp4
    });

    it('should return "download" for empty strings', () => {
      expect((service as any).sanitizeFilename('')).toBe('download');
      expect((service as any).sanitizeFilename('   ')).toBe('download');
    });
  });
});
