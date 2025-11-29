import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import {
  formatBytes,
  formatDuration,
  generateId,
  debounce,
  isValidUrl,
  extractDomain,
  sanitizeFilename,
  parseFilenameTemplate,
  sleep,
  retryWithBackoff,
  withTimeout,
  formatDownloadError,
} from '@/utils/helpers';

describe('helpers', () => {
  describe('formatBytes', () => {
    it('should return "0 B" for zero bytes', () => {
      expect(formatBytes(0)).toBe('0 B');
    });

    it('should format bytes correctly', () => {
      expect(formatBytes(500)).toBe('500 B');
      expect(formatBytes(1024)).toBe('1 KB');
      expect(formatBytes(1536)).toBe('1.5 KB');
      expect(formatBytes(1048576)).toBe('1 MB');
      expect(formatBytes(1073741824)).toBe('1 GB');
    });

    it('should respect decimal places', () => {
      expect(formatBytes(1536, 0)).toBe('2 KB');
      expect(formatBytes(1536, 1)).toBe('1.5 KB');
      expect(formatBytes(1536, 3)).toBe('1.5 KB');
    });

    it('should handle negative decimals as zero', () => {
      expect(formatBytes(1536, -1)).toBe('2 KB');
    });
  });

  describe('formatDuration', () => {
    it('should format seconds under a minute', () => {
      expect(formatDuration(0)).toBe('0s');
      expect(formatDuration(30)).toBe('30s');
      expect(formatDuration(59)).toBe('59s');
    });

    it('should format minutes and seconds', () => {
      expect(formatDuration(60)).toBe('1m 0s');
      expect(formatDuration(90)).toBe('1m 30s');
      expect(formatDuration(3599)).toBe('59m 59s');
    });

    it('should format hours and minutes', () => {
      expect(formatDuration(3600)).toBe('1h 0m');
      expect(formatDuration(3660)).toBe('1h 1m');
      expect(formatDuration(7200)).toBe('2h 0m');
      expect(formatDuration(7380)).toBe('2h 3m');
    });

    it('should round fractional seconds', () => {
      expect(formatDuration(30.4)).toBe('30s');
      expect(formatDuration(30.6)).toBe('31s');
    });
  });

  describe('generateId', () => {
    it('should generate unique IDs', () => {
      const id1 = generateId();
      const id2 = generateId();
      expect(id1).not.toBe(id2);
    });

    it('should contain timestamp and random part', () => {
      const id = generateId();
      expect(id).toMatch(/^\d+-[a-z0-9]+$/);
    });
  });

  describe('debounce', () => {
    beforeEach(() => {
      vi.useFakeTimers();
    });

    afterEach(() => {
      vi.useRealTimers();
    });

    it('should debounce function calls', () => {
      const fn = vi.fn();
      const debounced = debounce(fn, 100);

      debounced();
      debounced();
      debounced();

      expect(fn).not.toHaveBeenCalled();

      vi.advanceTimersByTime(100);

      expect(fn).toHaveBeenCalledTimes(1);
    });

    it('should pass arguments to debounced function', () => {
      const fn = vi.fn();
      const debounced = debounce(fn, 100);

      debounced('arg1', 'arg2');
      vi.advanceTimersByTime(100);

      expect(fn).toHaveBeenCalledWith('arg1', 'arg2');
    });

    it('should reset timer on subsequent calls', () => {
      const fn = vi.fn();
      const debounced = debounce(fn, 100);

      debounced();
      vi.advanceTimersByTime(50);
      debounced();
      vi.advanceTimersByTime(50);

      expect(fn).not.toHaveBeenCalled();

      vi.advanceTimersByTime(50);
      expect(fn).toHaveBeenCalledTimes(1);
    });
  });

  describe('isValidUrl', () => {
    it('should return true for valid URLs', () => {
      expect(isValidUrl('https://example.com')).toBe(true);
      expect(isValidUrl('http://example.com')).toBe(true);
      expect(isValidUrl('https://example.com/path?query=1')).toBe(true);
      expect(isValidUrl('ftp://files.example.com')).toBe(true);
    });

    it('should return false for invalid URLs', () => {
      expect(isValidUrl('not-a-url')).toBe(false);
      expect(isValidUrl('example.com')).toBe(false);
      expect(isValidUrl('')).toBe(false);
      expect(isValidUrl('://missing-protocol')).toBe(false);
    });
  });

  describe('extractDomain', () => {
    it('should extract domain from valid URLs', () => {
      expect(extractDomain('https://example.com')).toBe('example.com');
      expect(extractDomain('https://www.example.com/path')).toBe('www.example.com');
      expect(extractDomain('https://sub.domain.example.com')).toBe('sub.domain.example.com');
    });

    it('should return null for invalid URLs', () => {
      expect(extractDomain('not-a-url')).toBeNull();
      expect(extractDomain('')).toBeNull();
    });
  });

  describe('sanitizeFilename', () => {
    it('should remove invalid characters', () => {
      expect(sanitizeFilename('file<>:"/\\|?*.mp4')).toBe('file.mp4');
    });

    it('should collapse multiple spaces', () => {
      expect(sanitizeFilename('file   name.mp4')).toBe('file name.mp4');
    });

    it('should trim whitespace', () => {
      expect(sanitizeFilename('  file.mp4  ')).toBe('file.mp4');
    });

    it('should truncate to 255 characters', () => {
      const longName = 'a'.repeat(300) + '.mp4';
      const result = sanitizeFilename(longName);
      expect(result.length).toBe(255);
    });

    it('should handle normal filenames unchanged', () => {
      expect(sanitizeFilename('normal-file_name.mp4')).toBe('normal-file_name.mp4');
    });
  });

  describe('parseFilenameTemplate', () => {
    it('should replace all placeholders', () => {
      const result = parseFilenameTemplate('{title} - {performers} ({studio}) {date}', {
        title: 'My Video',
        performers: ['Actor1', 'Actor2'],
        studio: 'Studio Name',
        date: '2024-01-01',
      });
      expect(result).toBe('My Video - Actor1, Actor2 (Studio Name) 2024-01-01');
    });

    it('should use defaults for missing data', () => {
      const result = parseFilenameTemplate('{title} - {studio}', {});
      expect(result).toBe('untitled -');
    });

    it('should sanitize the result', () => {
      const result = parseFilenameTemplate('{title}', {
        title: 'File: With <Invalid> Chars?',
      });
      expect(result).toBe('File With Invalid Chars');
    });
  });

  describe('sleep', () => {
    beforeEach(() => {
      vi.useFakeTimers();
    });

    afterEach(() => {
      vi.useRealTimers();
    });

    it('should resolve after specified time', async () => {
      const promise = sleep(100);
      vi.advanceTimersByTime(100);
      await expect(promise).resolves.toBeUndefined();
    });
  });

  describe('retryWithBackoff', () => {
    beforeEach(() => {
      vi.useFakeTimers();
    });

    afterEach(() => {
      vi.useRealTimers();
    });

    it('should return result on first success', async () => {
      const fn = vi.fn().mockResolvedValue('success');
      const promise = retryWithBackoff(fn, 3, 100);

      await vi.runAllTimersAsync();
      const result = await promise;

      expect(result).toBe('success');
      expect(fn).toHaveBeenCalledTimes(1);
    });

    it('should retry on failure', async () => {
      const fn = vi.fn()
        .mockRejectedValueOnce(new Error('fail'))
        .mockResolvedValueOnce('success');

      const promise = retryWithBackoff(fn, 3, 100);
      await vi.runAllTimersAsync();
      const result = await promise;

      expect(result).toBe('success');
      expect(fn).toHaveBeenCalledTimes(2);
    });

    it('should throw after max retries', async () => {
      const error = new Error('always fails');
      const fn = vi.fn().mockRejectedValue(error);

      const promise = retryWithBackoff(fn, 3, 100);

      // Catch the rejection to prevent unhandled rejection warning
      // while still allowing the assertion to work
      promise.catch(() => {});

      await vi.runAllTimersAsync();

      await expect(promise).rejects.toThrow('always fails');
      expect(fn).toHaveBeenCalledTimes(3);
    });
  });

  describe('withTimeout', () => {
    beforeEach(() => {
      vi.useFakeTimers();
    });

    afterEach(() => {
      vi.useRealTimers();
    });

    it('should return result if promise resolves before timeout', async () => {
      const promise = Promise.resolve('success');
      const result = await withTimeout(promise, 1000);
      expect(result).toBe('success');
    });

    it('should reject if timeout expires', async () => {
      const slowPromise = new Promise(() => {}); // Never resolves
      const promise = withTimeout(slowPromise, 100);

      vi.advanceTimersByTime(100);

      await expect(promise).rejects.toThrow('Operation timed out after 100ms');
    });

    it('should use custom error message', async () => {
      const slowPromise = new Promise(() => {});
      const promise = withTimeout(slowPromise, 100, 'Custom timeout message');

      vi.advanceTimersByTime(100);

      await expect(promise).rejects.toThrow('Custom timeout message');
    });
  });

  describe('formatDownloadError', () => {
    it('should format generic errors', () => {
      const result = formatDownloadError(new Error('Something went wrong'));
      expect(result).toBe('Something went wrong');
    });

    it('should include URL when provided', () => {
      const result = formatDownloadError(new Error('Failed'), 'https://example.com');
      expect(result).toContain('https://example.com');
    });

    it('should detect timeout errors', () => {
      const result = formatDownloadError(new Error('Request timeout'));
      expect(result).toContain('Download Timeout');
      expect(result).toContain('Slow network');
    });

    it('should detect invalid URL errors', () => {
      const result = formatDownloadError(new Error('Invalid URL format'));
      expect(result).toContain('Invalid URL');
    });

    it('should handle non-Error objects', () => {
      const result = formatDownloadError('string error');
      expect(result).toBe('string error');
    });
  });
});
