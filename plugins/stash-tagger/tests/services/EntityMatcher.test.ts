/**
 * Tests for EntityMatcher service
 */

import { describe, it, expect } from 'vitest';
import { levenshteinDistance, stringSimilarity, normalizeString } from '../../src/utils/similarity';

describe('Similarity Utils', () => {
  describe('normalizeString', () => {
    it('should convert to lowercase', () => {
      expect(normalizeString('HELLO WORLD')).toBe('hello world');
    });

    it('should trim whitespace', () => {
      expect(normalizeString('  hello  ')).toBe('hello');
    });

    it('should handle empty strings', () => {
      expect(normalizeString('')).toBe('');
    });
  });

  describe('levenshteinDistance', () => {
    it('should return 0 for identical strings', () => {
      expect(levenshteinDistance('hello', 'hello')).toBe(0);
    });

    it('should return the length difference for completely different strings', () => {
      expect(levenshteinDistance('', 'hello')).toBe(5);
      expect(levenshteinDistance('hello', '')).toBe(5);
    });

    it('should calculate single character difference', () => {
      expect(levenshteinDistance('hello', 'hallo')).toBe(1);
    });

    it('should calculate multiple character differences', () => {
      expect(levenshteinDistance('kitten', 'sitting')).toBe(3);
    });

    it('should be case-sensitive', () => {
      expect(levenshteinDistance('Hello', 'hello')).toBe(1);
    });
  });

  describe('stringSimilarity', () => {
    it('should return 100 for identical strings', () => {
      expect(stringSimilarity('StashDB', 'StashDB')).toBe(100);
    });

    it('should return 100 for identical strings after normalization', () => {
      expect(stringSimilarity('StashDB', 'stashdb')).toBe(100);
    });

    it('should return high score for similar strings', () => {
      const score = stringSimilarity('Brazzers', 'Brazzer');
      expect(score).toBeGreaterThan(80);
    });

    it('should return low score for very different strings', () => {
      const score = stringSimilarity('ABC', 'XYZ');
      expect(score).toBeLessThan(50);
    });

    it('should handle empty strings', () => {
      expect(stringSimilarity('', '')).toBe(0); // Both empty = 0 (not 100 based on implementation)
      expect(stringSimilarity('hello', '')).toBe(0);
      expect(stringSimilarity('', 'hello')).toBe(0);
    });

    it('should handle strings with extra whitespace', () => {
      expect(stringSimilarity('  Hello World  ', 'hello world')).toBe(100);
    });
  });
});

describe('Match Confidence Thresholds', () => {
  it('should identify high confidence matches (>= 95%)', () => {
    // Exact match
    expect(stringSimilarity('Vixen', 'Vixen')).toBeGreaterThanOrEqual(95);

    // Case difference only
    expect(stringSimilarity('VIXEN', 'vixen')).toBeGreaterThanOrEqual(95);
  });

  it('should identify medium confidence matches (70-94%)', () => {
    // Minor typo
    const score = stringSimilarity('Brazzers', 'Brazzerz');
    expect(score).toBeGreaterThanOrEqual(70);
    expect(score).toBeLessThan(95);
  });

  it('should identify low confidence matches (< 70%)', () => {
    // Different strings
    const score = stringSimilarity('Brazzers', 'Reality Kings');
    expect(score).toBeLessThan(70);
  });
});
