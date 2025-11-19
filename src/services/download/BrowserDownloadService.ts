/**
 * BrowserDownloadService - Saves files to disk via browser download
 * with Stash-compatible metadata sidecar files
 */

import type { IDownloadItem, IStashScene, IStashImage } from '@/types';

export interface IStashMetadata {
  title?: string;
  details?: string;
  url?: string;
  date?: string;
  rating?: number;
  studio?: {
    id: string;
    name: string;
  };
  performers?: Array<{
    id: string;
    name: string;
  }>;
  tags?: Array<{
    id: string;
    name: string;
  }>;
  // Additional fields Stash can use
  organized?: boolean;
  o_counter?: number;
}

export class BrowserDownloadService {
  /**
   * Download file to user's computer with metadata sidecar
   */
  async downloadWithMetadata(
    item: IDownloadItem,
    blob: Blob,
    result: IStashScene | IStashImage
  ): Promise<void> {
    // Generate filename from URL or title
    const filename = this.generateFilename(item, blob);
    const metadataFilename = filename + '.json';

    // Create metadata object
    const metadata: IStashMetadata = {
      title: item.editedMetadata?.title || item.metadata?.title,
      details: item.editedMetadata?.description,
      url: item.url,
      date: item.editedMetadata?.date,
      rating: item.editedMetadata?.rating,
      organized: false,
    };

    // Download the file
    await this.downloadBlob(blob, filename);

    // Download the metadata sidecar
    await this.downloadMetadata(metadata, metadataFilename);

    console.log(`[Browser Download] Saved: ${filename} + ${metadataFilename}`);
  }

  /**
   * Generate appropriate filename from URL or metadata
   */
  private generateFilename(item: IDownloadItem, blob: Blob): string {
    // Try to get filename from URL
    let filename = this.getFilenameFromUrl(item.url);

    // If no extension, detect from blob type
    if (!filename.includes('.')) {
      const ext = this.getExtensionFromMimeType(blob.type);
      filename = filename + ext;
    }

    // Sanitize filename
    filename = this.sanitizeFilename(filename);

    // If we have a title, use it but keep the extension
    if (item.editedMetadata?.title || item.metadata?.title) {
      const title = item.editedMetadata?.title || item.metadata?.title || '';
      const ext = this.getExtension(filename);
      filename = this.sanitizeFilename(title) + ext;
    }

    return filename;
  }

  /**
   * Extract filename from URL
   */
  private getFilenameFromUrl(url: string): string {
    try {
      const urlObj = new URL(url);
      const pathname = urlObj.pathname;
      const segments = pathname.split('/');
      const lastSegment = segments[segments.length - 1] || 'download';
      return decodeURIComponent(lastSegment);
    } catch {
      return 'download';
    }
  }

  /**
   * Get file extension from filename
   */
  private getExtension(filename: string): string {
    const match = filename.match(/\.[^.]+$/);
    return match ? match[0] : '';
  }

  /**
   * Get file extension from MIME type
   */
  private getExtensionFromMimeType(mimeType: string): string {
    const mimeToExt: Record<string, string> = {
      'video/mp4': '.mp4',
      'video/webm': '.webm',
      'video/quicktime': '.mov',
      'video/x-msvideo': '.avi',
      'video/x-matroska': '.mkv',
      'image/jpeg': '.jpg',
      'image/png': '.png',
      'image/gif': '.gif',
      'image/webp': '.webp',
    };

    return mimeToExt[mimeType] || '.bin';
  }

  /**
   * Sanitize filename for filesystem
   */
  private sanitizeFilename(filename: string): string {
    // Remove invalid characters
    let sanitized = filename.replace(/[<>:"/\\|?*]/g, '_');

    // Remove leading/trailing spaces and dots
    sanitized = sanitized.trim().replace(/^\.+/, '');

    // Limit length (255 is typical max, leave room for extension)
    if (sanitized.length > 200) {
      const ext = this.getExtension(sanitized);
      const nameWithoutExt = sanitized.substring(0, sanitized.length - ext.length);
      sanitized = nameWithoutExt.substring(0, 200) + ext;
    }

    return sanitized || 'download';
  }

  /**
   * Trigger browser download of blob
   */
  private async downloadBlob(blob: Blob, filename: string): Promise<void> {
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    a.style.display = 'none';

    document.body.appendChild(a);
    a.click();

    // Cleanup
    setTimeout(() => {
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
    }, 100);
  }

  /**
   * Download metadata as JSON sidecar file
   */
  private async downloadMetadata(
    metadata: IStashMetadata,
    filename: string
  ): Promise<void> {
    const json = JSON.stringify(metadata, null, 2);
    const blob = new Blob([json], { type: 'application/json' });
    await this.downloadBlob(blob, filename);
  }

  /**
   * Download entire queue as ZIP (future enhancement)
   * This would require a zip library like JSZip
   */
  async downloadQueueAsZip(items: IDownloadItem[]): Promise<void> {
    // TODO: Implement batch download as ZIP
    throw new Error('Batch ZIP download not yet implemented');
  }
}

// Singleton instance
let instance: BrowserDownloadService | null = null;

export function getBrowserDownloadService(): BrowserDownloadService {
  if (!instance) {
    instance = new BrowserDownloadService();
  }
  return instance;
}
