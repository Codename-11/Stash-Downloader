import { describe, it, expect } from 'vitest';
import { DanbooruAdapter } from '@/services/metadata/adapters/DanbooruAdapter';

describe('DanbooruAdapter', () => {
  const adapter = new DanbooruAdapter();

  describe('parsePostId', () => {
    it('should parse post ID from standard URL', () => {
      const url = 'https://danbooru.donmai.us/posts/12345';
      expect(adapter.parsePostId(url)).toBe('12345');
    });

    it('should parse post ID with query params', () => {
      const url = 'https://danbooru.donmai.us/posts/67890?q=test';
      expect(adapter.parsePostId(url)).toBe('67890');
    });

    it('should return null for pool URLs', () => {
      const url = 'https://danbooru.donmai.us/pools/123';
      expect(adapter.parsePostId(url)).toBeNull();
    });

    it('should return null for invalid URLs', () => {
      expect(adapter.parsePostId('not-a-url')).toBeNull();
    });
  });

  describe('parsePoolId', () => {
    it('should parse pool ID from URL', () => {
      const url = 'https://danbooru.donmai.us/pools/456';
      expect(adapter.parsePoolId(url)).toBe('456');
    });

    it('should return null for post URLs', () => {
      const url = 'https://danbooru.donmai.us/posts/12345';
      expect(adapter.parsePoolId(url)).toBeNull();
    });
  });

  describe('buildApiUrl', () => {
    it('should build correct post API URL', () => {
      expect(adapter.buildApiUrl('12345')).toBe('https://danbooru.donmai.us/posts/12345.json');
    });
  });

  describe('buildPoolApiUrl', () => {
    it('should build correct pool API URL', () => {
      expect(adapter.buildPoolApiUrl('456')).toBe('https://danbooru.donmai.us/pools/456.json');
    });
  });

  describe('parseResponse', () => {
    it('should parse Danbooru response with typed tags', () => {
      const response = {
        id: 12345,
        file_url: 'https://danbooru.donmai.us/data/full.jpg',
        preview_file_url: 'https://danbooru.donmai.us/data/preview.jpg',
        large_file_url: 'https://danbooru.donmai.us/data/sample.jpg',
        tag_string_general: 'blue_eyes long_hair',
        tag_string_artist: 'famous_artist',
        tag_string_character: 'some_character',
        tag_string_copyright: 'some_series',
        tag_string_meta: 'highres',
        rating: 'e',
        score: 50,
        source: 'https://source.com',
        image_width: 1920,
        image_height: 1080,
        file_ext: 'png',
        created_at: '2024-01-01T12:00:00Z',
      };

      const post = adapter.parseResponse(response);

      expect(post.id).toBe('12345');
      expect(post.fileUrl).toBe('https://danbooru.donmai.us/data/full.jpg');
      expect(post.previewUrl).toBe('https://danbooru.donmai.us/data/preview.jpg');
      expect(post.sampleUrl).toBe('https://danbooru.donmai.us/data/sample.jpg');
      expect(post.rating).toBe('explicit');
      expect(post.score).toBe(50);
      expect(post.width).toBe(1920);
      expect(post.height).toBe(1080);
      expect(post.fileExt).toBe('png');
    });

    it('should parse typed tags correctly', () => {
      const response = {
        id: 1,
        file_url: 'https://example.com/img.jpg',
        tag_string_general: 'tag1 tag2',
        tag_string_artist: 'artist1',
        tag_string_character: 'char1 char2',
        tag_string_copyright: 'series1',
        tag_string_meta: '',
        rating: 'g',
        score: 0,
      };

      const post = adapter.parseResponse(response);

      // Check tag types
      const artistTags = post.tags.filter(t => t.type === 'artist');
      const charTags = post.tags.filter(t => t.type === 'character');
      const copyrightTags = post.tags.filter(t => t.type === 'copyright');
      const generalTags = post.tags.filter(t => t.type === 'general');

      expect(artistTags).toHaveLength(1);
      expect(artistTags[0]?.name).toBe('artist1');

      expect(charTags).toHaveLength(2);
      expect(charTags.map(t => t.name)).toContain('char1');
      expect(charTags.map(t => t.name)).toContain('char2');

      expect(copyrightTags).toHaveLength(1);
      expect(copyrightTags[0]?.name).toBe('series1');

      expect(generalTags).toHaveLength(2);
    });

    it('should normalize ratings correctly', () => {
      const createResponse = (rating: string) => ({
        id: 1,
        file_url: 'https://example.com/img.jpg',
        rating,
        score: 0,
      });

      expect(adapter.parseResponse(createResponse('g')).rating).toBe('safe');
      expect(adapter.parseResponse(createResponse('s')).rating).toBe('sensitive');
      expect(adapter.parseResponse(createResponse('q')).rating).toBe('questionable');
      expect(adapter.parseResponse(createResponse('e')).rating).toBe('explicit');
    });

    it('should handle API errors', () => {
      const errorResponse = {
        success: false,
        error: 'Post not found',
      };

      expect(() => adapter.parseResponse(errorResponse)).toThrow('Post not found');
    });
  });

  describe('parsePoolResponse', () => {
    it('should extract post IDs from pool', () => {
      const poolResponse = {
        id: 123,
        name: 'Test Pool',
        post_ids: [111, 222, 333],
      };

      const postIds = adapter.parsePoolResponse(poolResponse);

      expect(postIds).toEqual(['111', '222', '333']);
    });

    it('should return empty array for invalid response', () => {
      expect(adapter.parsePoolResponse(null)).toEqual([]);
      expect(adapter.parsePoolResponse({})).toEqual([]);
      expect(adapter.parsePoolResponse({ post_ids: 'not-array' })).toEqual([]);
    });
  });

  describe('domains', () => {
    it('should include danbooru domain', () => {
      expect(adapter.domains).toContain('danbooru.donmai.us');
    });
  });
});
