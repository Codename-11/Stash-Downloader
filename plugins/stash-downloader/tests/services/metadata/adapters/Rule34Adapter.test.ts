import { describe, it, expect } from 'vitest';
import { Rule34Adapter } from '@/services/metadata/adapters/Rule34Adapter';

describe('Rule34Adapter', () => {
  const adapter = new Rule34Adapter();

  describe('parsePostId', () => {
    it('should parse post ID from standard URL', () => {
      const url = 'https://rule34.xxx/index.php?page=post&s=view&id=12345';
      expect(adapter.parsePostId(url)).toBe('12345');
    });

    it('should parse post ID with www prefix', () => {
      const url = 'https://www.rule34.xxx/index.php?page=post&s=view&id=67890';
      expect(adapter.parsePostId(url)).toBe('67890');
    });

    it('should return null for non-post URLs', () => {
      const url = 'https://rule34.xxx/index.php?page=tags&s=list';
      expect(adapter.parsePostId(url)).toBeNull();
    });

    it('should return null for pool URLs', () => {
      const url = 'https://rule34.xxx/index.php?page=pool&s=show&id=123';
      expect(adapter.parsePostId(url)).toBeNull();
    });

    it('should return null for invalid URLs', () => {
      expect(adapter.parsePostId('not-a-url')).toBeNull();
    });
  });

  describe('buildApiUrl', () => {
    it('should build correct API URL', () => {
      const apiUrl = adapter.buildApiUrl('12345');
      // Rule34 uses the main domain, not api subdomain
      expect(apiUrl).toBe('https://rule34.xxx/index.php?page=dapi&s=post&q=index&json=1&id=12345');
    });
  });

  describe('parseResponse', () => {
    it('should parse array response correctly', () => {
      const response = [{
        id: 12345,
        file_url: 'https://rule34.xxx/images/full.jpg',
        preview_url: 'https://rule34.xxx/thumbnails/preview.jpg',
        sample_url: 'https://rule34.xxx/samples/sample.jpg',
        tags: 'tag1 tag2 test_tag',
        rating: 'explicit',
        score: 100,
        source: 'https://source.com',
        width: 1920,
        height: 1080,
        created_at: '2024-01-01 12:00:00',
      }];

      const post = adapter.parseResponse(response);

      expect(post.id).toBe('12345');
      expect(post.fileUrl).toBe('https://rule34.xxx/images/full.jpg');
      expect(post.previewUrl).toBe('https://rule34.xxx/thumbnails/preview.jpg');
      expect(post.rating).toBe('explicit');
      expect(post.score).toBe(100);
      expect(post.width).toBe(1920);
      expect(post.height).toBe(1080);
    });

    it('should parse all tags as general type (Rule34 API does not provide tag types)', () => {
      const response = [{
        id: 1,
        file_url: 'https://example.com/img.jpg',
        tags: 'tag1 tag2 artist:john_doe character:mario',
        rating: 's',
        score: 0,
      }];

      const post = adapter.parseResponse(response);

      // Rule34 API doesn't parse tag types, they're all general
      expect(post.tags.every(t => t.type === 'general')).toBe(true);
      expect(post.tags).toHaveLength(4);
      // Tag names include the prefix as-is since Rule34 doesn't parse them
      expect(post.tags.map(t => t.name)).toContain('artist:john_doe');
      expect(post.tags.map(t => t.name)).toContain('character:mario');
    });

    it('should throw on empty response', () => {
      expect(() => adapter.parseResponse([])).toThrow('No post found');
    });

    it('should throw on non-array response', () => {
      expect(() => adapter.parseResponse(null)).toThrow('No post found');
      expect(() => adapter.parseResponse({})).toThrow('No post found');
    });

    it('should normalize ratings correctly', () => {
      const createResponse = (rating: string) => [{
        id: 1,
        file_url: 'https://example.com/img.jpg',
        tags: '',
        rating,
        score: 0,
      }];

      expect(adapter.parseResponse(createResponse('s')).rating).toBe('safe');
      expect(adapter.parseResponse(createResponse('q')).rating).toBe('questionable');
      expect(adapter.parseResponse(createResponse('e')).rating).toBe('explicit');
    });

    it('should determine file extension from URL', () => {
      const response = [{
        id: 1,
        file_url: 'https://example.com/img.png',
        tags: '',
        rating: 's',
        score: 0,
      }];

      const post = adapter.parseResponse(response);
      expect(post.fileExt).toBe('png');
    });
  });

  describe('parsePoolId', () => {
    it('should parse pool ID from URL', () => {
      const url = 'https://rule34.xxx/index.php?page=pool&s=show&id=456';
      expect(adapter.parsePoolId(url)).toBe('456');
    });

    it('should return null for post URLs', () => {
      const url = 'https://rule34.xxx/index.php?page=post&s=view&id=12345';
      expect(adapter.parsePoolId(url)).toBeNull();
    });
  });

  describe('domains', () => {
    it('should include rule34.xxx domain', () => {
      expect(adapter.domains).toContain('rule34.xxx');
    });
  });
});
