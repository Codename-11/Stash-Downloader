/**
 * Mock Download Service for testing
 * Simulates file downloads without actually downloading
 */

import type { IDownloadProgress } from '@/types';
import type { IDownloadOptions } from '@/services/download/DownloadService';

export class MockDownloadService {
  /**
   * Simulate download with progress updates
   */
  async download(url: string, options: IDownloadOptions = {}): Promise<Blob> {
    const { onProgress, signal } = options;

    console.log('[Mock Download] Starting download:', url);

    // Simulate file size
    const totalBytes = Math.floor(Math.random() * 50000000) + 10000000; // 10-60 MB
    let bytesDownloaded = 0;
    const startTime = Date.now();

    // Simulate download in chunks
    const chunkSize = totalBytes / 20; // 20 chunks
    const chunkDelay = 200; // 200ms per chunk

    while (bytesDownloaded < totalBytes) {
      // Check for abort
      if (signal?.aborted) {
        throw new Error('Download aborted');
      }

      await new Promise((resolve) => setTimeout(resolve, chunkDelay));

      bytesDownloaded = Math.min(bytesDownloaded + chunkSize, totalBytes);
      const elapsedTime = (Date.now() - startTime) / 1000;
      const speed = bytesDownloaded / elapsedTime;
      const percentage = (bytesDownloaded / totalBytes) * 100;
      const timeRemaining = (totalBytes - bytesDownloaded) / speed;

      if (onProgress) {
        onProgress({
          bytesDownloaded: Math.floor(bytesDownloaded),
          totalBytes,
          percentage,
          speed,
          timeRemaining,
        });
      }
    }

    console.log('[Mock Download] Complete:', url);

    // Return a mock blob
    const mockContent = `Mock file content for ${url}`;
    return new Blob([mockContent], { type: 'application/octet-stream' });
  }

  /**
   * Mock download as data URL
   */
  async downloadAsDataUrl(url: string): Promise<string> {
    console.log('[Mock Download] Download as data URL:', url);

    // Return a placeholder image data URL
    return 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==';
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
   * Mock detect content type
   */
  async detectContentType(url: string): Promise<string | null> {
    console.log('[Mock Download] Detect content type:', url);

    const ext = this.getFileExtension(url);
    const videoExtensions = ['mp4', 'mkv', 'avi', 'mov', 'wmv', 'flv', 'webm', 'm4v'];
    const imageExtensions = ['jpg', 'jpeg', 'png', 'gif', 'webp', 'bmp'];

    if (videoExtensions.includes(ext)) {
      return 'video/mp4';
    } else if (imageExtensions.includes(ext)) {
      return 'image/jpeg';
    }

    return 'application/octet-stream';
  }
}

// Singleton instance
let instance: MockDownloadService | null = null;

export function getMockDownloadService(): MockDownloadService {
  if (!instance) {
    instance = new MockDownloadService();
  }
  return instance;
}
