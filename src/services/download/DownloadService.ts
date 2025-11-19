/**
 * DownloadService - Handles file downloads
 */

import type { IDownloadProgress } from '@/types';

export interface IDownloadOptions {
  onProgress?: (progress: IDownloadProgress) => void;
  signal?: AbortSignal;
}

export class DownloadService {
  /**
   * Check if CORS proxy is enabled (for test environment)
   */
  private isCorsProxyEnabled(): boolean {
    if (typeof window === 'undefined') return false;
    return localStorage.getItem('corsProxyEnabled') === 'true';
  }

  /**
   * Get CORS proxy URL from settings
   */
  private getCorsProxyUrl(): string {
    if (typeof window === 'undefined') return 'http://localhost:8080';
    return localStorage.getItem('corsProxyUrl') || 'http://localhost:8080';
  }

  /**
   * Wrap URL with CORS proxy if enabled
   */
  private wrapWithProxy(url: string): string {
    if (!this.isCorsProxyEnabled()) return url;
    const proxyUrl = this.getCorsProxyUrl();
    return `${proxyUrl}/${url}`;
  }

  /**
   * Download file from URL
   */
  async download(
    url: string,
    options: IDownloadOptions = {}
  ): Promise<Blob> {
    const { onProgress, signal } = options;
    const fetchUrl = this.wrapWithProxy(url);

    const response = await fetch(fetchUrl, { signal });

    if (!response.ok) {
      throw new Error(`Download failed: ${response.statusText}`);
    }

    const contentLength = response.headers.get('content-length');
    const totalBytes = contentLength ? parseInt(contentLength, 10) : 0;

    if (!response.body) {
      throw new Error('Response body is null');
    }

    const reader = response.body.getReader();
    const chunks: Uint8Array[] = [];
    let bytesDownloaded = 0;
    let startTime = Date.now();

    while (true) {
      const { done, value } = await reader.read();

      if (done) break;

      chunks.push(value);
      bytesDownloaded += value.length;

      if (onProgress) {
        const elapsedTime = (Date.now() - startTime) / 1000; // seconds
        const speed = bytesDownloaded / elapsedTime;
        const percentage = totalBytes > 0 ? (bytesDownloaded / totalBytes) * 100 : 0;
        const timeRemaining = totalBytes > 0 ? (totalBytes - bytesDownloaded) / speed : undefined;

        onProgress({
          bytesDownloaded,
          totalBytes,
          percentage,
          speed,
          timeRemaining,
        });
      }
    }

    return new Blob(chunks);
  }

  /**
   * Download file and convert to data URL
   */
  async downloadAsDataUrl(url: string): Promise<string> {
    const blob = await this.download(url);
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onloadend = () => resolve(reader.result as string);
      reader.onerror = reject;
      reader.readAsDataURL(blob);
    });
  }

  /**
   * Get file extension from URL
   */
  getFileExtension(url: string): string {
    try {
      const pathname = new URL(url).pathname;
      const match = pathname.match(/\.([^.]+)$/);
      return match ? match[1]!.toLowerCase() : '';
    } catch {
      return '';
    }
  }

  /**
   * Detect content type from URL
   */
  async detectContentType(url: string): Promise<string | null> {
    try {
      const fetchUrl = this.wrapWithProxy(url);
      const response = await fetch(fetchUrl, { method: 'HEAD' });
      return response.headers.get('content-type');
    } catch {
      return null;
    }
  }
}

// Singleton instance
let instance: DownloadService | null = null;

export function getDownloadService(): DownloadService {
  if (!instance) {
    instance = new DownloadService();
  }
  return instance;
}
