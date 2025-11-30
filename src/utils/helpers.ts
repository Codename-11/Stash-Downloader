/**
 * Utility helper functions
 */

import { FILE_SIZE_UNITS } from '@/constants';

/**
 * Format bytes to human-readable string
 */
export function formatBytes(bytes: number, decimals = 2): string {
  if (bytes === 0) return '0 B';

  const k = 1024;
  const dm = decimals < 0 ? 0 : decimals;

  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return `${parseFloat((bytes / Math.pow(k, i)).toFixed(dm))} ${FILE_SIZE_UNITS[i] ?? 'B'}`;
}

/**
 * Format seconds to human-readable duration
 */
export function formatDuration(seconds: number): string {
  if (seconds < 60) return `${Math.round(seconds)}s`;

  const hours = Math.floor(seconds / 3600);
  const minutes = Math.floor((seconds % 3600) / 60);
  const secs = Math.floor(seconds % 60);

  if (hours > 0) {
    return `${hours}h ${minutes}m`;
  }
  return `${minutes}m ${secs}s`;
}

/**
 * Generate a unique ID
 */
export function generateId(): string {
  return `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
}

/**
 * Debounce function
 */
export function debounce<T extends (...args: any[]) => any>(
  func: T,
  wait: number
): (...args: Parameters<T>) => void {
  let timeout: NodeJS.Timeout | null = null;

  return function (...args: Parameters<T>) {
    if (timeout) clearTimeout(timeout);
    timeout = setTimeout(() => func(...args), wait);
  };
}

/**
 * Validate URL format
 */
export function isValidUrl(url: string): boolean {
  try {
    new URL(url);
    return true;
  } catch {
    return false;
  }
}

/**
 * Extract domain from URL
 */
export function extractDomain(url: string): string | null {
  try {
    const urlObj = new URL(url);
    return urlObj.hostname;
  } catch {
    return null;
  }
}

/**
 * Sanitize filename
 */
export function sanitizeFilename(filename: string): string {
  return filename
    .replace(/[<>:"/\\|?*]/g, '') // Remove invalid chars
    .replace(/\s+/g, ' ') // Collapse multiple spaces
    .trim()
    .substring(0, 255); // Max filename length
}

/**
 * Parse filename template
 */
export function parseFilenameTemplate(
  template: string,
  data: {
    title?: string;
    date?: string;
    performers?: string[];
    studio?: string;
  }
): string {
  let result = template;

  result = result.replace('{title}', data.title ?? 'untitled');
  result = result.replace('{date}', data.date ?? '');
  result = result.replace(
    '{performers}',
    data.performers?.join(', ') ?? ''
  );
  result = result.replace('{studio}', data.studio ?? '');

  return sanitizeFilename(result);
}

/**
 * Sleep utility
 */
export function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

/**
 * Retry with exponential backoff
 */
export async function retryWithBackoff<T>(
  fn: () => Promise<T>,
  maxRetries = 3,
  initialDelay = 1000
): Promise<T> {
  let lastError: Error | undefined;

  for (let i = 0; i < maxRetries; i++) {
    try {
      return await fn();
    } catch (error) {
      lastError = error as Error;
      if (i < maxRetries - 1) {
        const delay = initialDelay * Math.pow(2, i);
        await sleep(delay);
      }
    }
  }

  throw lastError;
}

/**
 * Fetch with timeout
 * Wraps fetch with a timeout to prevent hanging requests
 */
export async function fetchWithTimeout(
  url: string,
  options: RequestInit = {},
  timeoutMs: number = 30000
): Promise<Response> {
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), timeoutMs);

  try {
    const response = await fetch(url, {
      ...options,
      signal: controller.signal,
    });
    clearTimeout(timeoutId);
    return response;
  } catch (error) {
    clearTimeout(timeoutId);
    if (error instanceof Error && error.name === 'AbortError') {
      throw new Error(`Request timeout after ${timeoutMs}ms`);
    }
    throw error;
  }
}

/**
 * Promise with timeout wrapper
 * Wraps any promise with a timeout to prevent hanging
 */
export async function withTimeout<T>(
  promise: Promise<T>,
  timeoutMs: number = 30000,
  errorMessage?: string
): Promise<T> {
  const timeoutPromise = new Promise<never>((_, reject) => {
    setTimeout(() => {
      reject(new Error(errorMessage || `Operation timed out after ${timeoutMs}ms`));
    }, timeoutMs);
  });

  return Promise.race([promise, timeoutPromise]);
}

/**
 * Format download error messages with helpful context
 */
export function formatDownloadError(error: unknown, url?: string): string {
  const errorMsg = error instanceof Error ? error.message : String(error);

  // Check for network errors
  if (errorMsg.includes('NetworkError') ||
      errorMsg.includes('Failed to fetch') ||
      errorMsg.includes('CORS')) {
    // Server-side download error
    if (errorMsg.includes('Server-side download') || errorMsg.includes('file_path')) {
      return errorMsg;
    }
    return `Network Error: ${errorMsg}\n\n` +
      `Check Stash server logs for details.`;
  }

  // Check for server-side download errors
  if (errorMsg.includes('Server-side download')) {
    return errorMsg;
  }

  // Check for yt-dlp errors
  if (errorMsg.includes('yt-dlp') || errorMsg.includes('yt_dlp')) {
    return `yt-dlp Error: ${errorMsg}\n\n` +
      `This is a server-side error. Check Stash server logs for details.\n` +
      `Ensure yt-dlp is installed on the Stash server.`;
  }
  
  // Check for timeout errors
  if (errorMsg.includes('timeout') || errorMsg.includes('Timeout')) {
    return `Download Timeout: ${errorMsg}\n\n` +
      `The download took too long to complete. This may be due to:\n` +
      `• Slow network connection\n` +
      `• Large file size\n` +
      `• Site rate limiting\n\n` +
      `Try again or check your network connection.`;
  }
  
  // Check for invalid URL errors
  if (errorMsg.includes('Invalid URL') || errorMsg.includes('invalid')) {
    return `Invalid URL: ${errorMsg}${url ? `\n\nURL: ${url}` : ''}\n\n` +
      `Please check that the URL is correct and accessible.`;
  }
  
  // Generic error - add context if URL is provided
  if (url) {
    return `${errorMsg}\n\nURL: ${url}`;
  }
  
  return errorMsg;
}