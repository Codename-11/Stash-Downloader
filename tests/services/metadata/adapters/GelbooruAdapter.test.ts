import { describe, it, expect } from 'vitest';
import { GelbooruAdapter } from '@/services/metadata/adapters/GelbooruAdapter';

describe('GelbooruAdapter', () => {
  const adapter = new GelbooruAdapter();

  describe('parsePostId', () => {
    it('should parse post ID from standard URL', () => {
      const url = 'https://gelbooru.com/index.php?page=post&s=view&id=12345';
      expect(adapter.parsePostId(url)).toBe('12345');
    });

    it('should parse post ID with www prefix', () => {
      const url = 'https://www.gelbooru.com/index.php?page=post&s=view&id=67890';
      expect(adapter.parsePostId(url)).toBe('67890');
    });

    it('should return null for pool URLs', () => {
      const url = 'https://gelbooru.com/index.php?page=pool&s=show&id=123';
      expect(adapter.parsePostId(url)).toBeNull();
    });

    it('should return null for tag listing pages', () => {
      const url = 'https://gelbooru.com/index.php?page=tags&s=list';
      expect(adapter.parsePostId(url)).toBeNull();
    });

    it('should return null for invalid URLs', () => {
      expect(adapter.parsePostId('not-a-url')).toBeNull();
    });
  });

  describe('parsePoolId', () => {
    it('should parse pool ID from URL', () => {
      const url = 'https://gelbooru.com/index.php?page=pool&s=show&id=456';
      expect(adapter.parsePoolId(url)).toBe('456');
    });

    it('should return null for post URLs', () => {
      const url = 'https://gelbooru.com/index.php?page=post&s=view&id=12345';
      expect(adapter.parsePoolId(url)).toBeNull();
    });
  });

  describe('buildApiUrl', () => {
    it('should build correct API URL', () => {
      const apiUrl = adapter.buildApiUrl('12345');
      expect(apiUrl).toBe('https://gelbooru.com/index.php?page=dapi&s=post&q=index&json=1&id=12345');
    });
  });

  describe('parseResponse', () => {
    it('should parse nested post response', () => {
      const response = {
        post: [{
          id: 12345,
          file_url: 'https://gelbooru.com/images/full.jpg',
          preview_url: 'https://gelbooru.com/thumbnails/preview.jpg',
          sample_url: 'https://gelbooru.com/samples/sample.jpg',
          tags: 'tag1 tag2 artist:test',
          rating: 'explicit',
          score: 75,
          source: 'https://source.com',
          width: 1920,
          height: 1080,
          created_at: '2024-01-01 12:00:00',
        }],
      };

      const post = adapter.parseResponse(response);

      expect(post.id).toBe('12345');
      expect(post.fileUrl).toBe('https://gelbooru.com/images/full.jpg');
      expect(post.previewUrl).toBe('https://gelbooru.com/thumbnails/preview.jpg');
      expect(post.sampleUrl).toBe('https://gelbooru.com/samples/sample.jpg');
      expect(post.rating).toBe('explicit');
      expect(post.score).toBe(75);
    });

    it('should parse array response', () => {
      const response = [{
        id: 12345,
        file_url: 'https://gelbooru.com/images/full.jpg',
        tags: 'tag1 tag2',
        rating: 's',
        score: 10,
      }];

      const post = adapter.parseResponse(response);
      expect(post.id).toBe('12345');
    });

    it('should parse tags as general type (Gelbooru lacks tag types in basic API)', () => {
      const response = [{
        id: 1,
        file_url: 'https://example.com/img.jpg',
        tags: 'tag1 tag2 tag3',
        rating: 's',
        score: 0,
      }];

      const post = adapter.parseResponse(response);

      // All tags should be general since Gelbooru doesn't provide types
      expect(post.tags.every(t => t.type === 'general')).toBe(true);
      expect(post.tags).toHaveLength(3);
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
      expect(adapter.parseResponse(createResponse('safe')).rating).toBe('safe');
      expect(adapter.parseResponse(createResponse('g')).rating).toBe('safe');
      expect(adapter.parseResponse(createResponse('general')).rating).toBe('safe');
      expect(adapter.parseResponse(createResponse('sensitive')).rating).toBe('questionable');
      expect(adapter.parseResponse(createResponse('q')).rating).toBe('questionable');
      expect(adapter.parseResponse(createResponse('e')).rating).toBe('explicit');
      expect(adapter.parseResponse(createResponse('explicit')).rating).toBe('explicit');
    });

    it('should throw on empty post array', () => {
      expect(() => adapter.parseResponse({ post: [] })).toThrow('No post found');
    });

    it('should throw on invalid response', () => {
      expect(() => adapter.parseResponse('invalid')).toThrow('Invalid Gelbooru response');
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

  describe('domains', () => {
    it('should include gelbooru.com domain', () => {
      expect(adapter.domains).toContain('gelbooru.com');
    });

    it('should include safebooru.org domain', () => {
      expect(adapter.domains).toContain('safebooru.org');
    });
  });
});
