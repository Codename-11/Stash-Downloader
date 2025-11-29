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
    _result: IStashScene | IStashImage
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
    // Try to get extension from multiple sources
    let ext = this.getExtensionFromMimeType(blob.type);

    // If MIME type detection failed (.bin), try to detect from URL or content type
    if (ext === '.bin') {
      console.log('[BrowserDownload] MIME type detection failed, blob.type:', blob.type);

      // Try to get extension from URL
      const urlExt = this.getExtensionFromUrl(item.url);
      if (urlExt && urlExt !== '.bin') {
        ext = urlExt;
        console.log('[BrowserDownload] Using extension from URL:', ext);
      } else {
        // Fallback based on content type metadata
        const contentType = item.metadata?.contentType || 'video';
        ext = contentType === 'image' ? '.jpg' : '.mp4';
        console.log('[BrowserDownload] Using fallback extension:', ext);
      }
    }

    // Prefer title over URL-based filename
    let baseName: string;

    if (item.editedMetadata?.title || item.metadata?.title) {
      // Use title if available
      baseName = item.editedMetadata?.title || item.metadata?.title || 'download';

      // Remove quality prefix like "[1080p] " from title if present
      // (we'll add it as a suffix instead)
      baseName = baseName.replace(/^\[(\d+p)\]\s*/, '');
    } else {
      // Try to extract meaningful name from URL
      baseName = this.getBaseNameFromUrl(item.url);
    }

    // Extract quality suffix
    let qualitySuffix = '';
    if (item.metadata?.quality) {
      qualitySuffix = `_${item.metadata.quality}`;
      console.log('[BrowserDownload] Adding quality suffix:', qualitySuffix);
    }

    // Sanitize and combine: basename_quality.ext
    const sanitizedName = this.sanitizeFilename(baseName);
    return sanitizedName + qualitySuffix + ext;
  }

  /**
   * Extract base filename from URL (without extension)
   */
  private getBaseNameFromUrl(url: string): string {
    try {
      const urlObj = new URL(url);
      const pathname = urlObj.pathname;
      const segments = pathname.split('/').filter(s => s.length > 0);

      if (segments.length === 0) return 'download';

      const lastSegmentRaw = segments[segments.length - 1];
      if (!lastSegmentRaw) return 'download';

      let lastSegment = decodeURIComponent(lastSegmentRaw);

      // Remove extension if it's not a valid media extension
      const invalidExtensions = ['.php', '.asp', '.aspx', '.jsp', '.cgi', '.html', '.htm'];
      for (const invalidExt of invalidExtensions) {
        if (lastSegment.toLowerCase().endsWith(invalidExt)) {
          lastSegment = lastSegment.substring(0, lastSegment.length - invalidExt.length);
          break;
        }
      }

      // If segment is now empty or too short, use domain name
      if (lastSegment.length < 3) {
        return urlObj.hostname.replace(/^www\./, '').split('.')[0] || 'download';
      }

      return lastSegment;
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
   * Try to get valid media extension from URL
   */
  private getExtensionFromUrl(url: string): string | null {
    try {
      const urlObj = new URL(url);
      const pathname = urlObj.pathname.toLowerCase();

      // Valid video extensions
      const videoExts = ['.mp4', '.webm', '.mkv', '.avi', '.mov', '.flv', '.wmv', '.m4v', '.mpg', '.mpeg'];
      // Valid image extensions
      const imageExts = ['.jpg', '.jpeg', '.png', '.gif', '.webp', '.bmp', '.svg'];

      const allValidExts = [...videoExts, ...imageExts];

      // Check if URL ends with a valid media extension
      for (const ext of allValidExts) {
        if (pathname.endsWith(ext)) {
          return ext;
        }
      }

      return null;
    } catch {
      return null;
    }
  }

  /**
   * Get file extension from MIME type
   */
  private getExtensionFromMimeType(mimeType: string): string {
    if (!mimeType) return '.bin';

    const mimeToExt: Record<string, string> = {
      // Video MIME types
      'video/mp4': '.mp4',
      'video/webm': '.webm',
      'video/quicktime': '.mov',
      'video/x-msvideo': '.avi',
      'video/x-matroska': '.mkv',
      'video/x-flv': '.flv',
      'video/x-ms-wmv': '.wmv',
      'video/mpeg': '.mpg',

      // Image MIME types
      'image/jpeg': '.jpg',
      'image/png': '.png',
      'image/gif': '.gif',
      'image/webp': '.webp',
      'image/bmp': '.bmp',
      'image/svg+xml': '.svg',

      // Sometimes MIME type has charset, handle that
      'video/mp4; codecs="avc1.42E01E, mp4a.40.2"': '.mp4',
    };

    // Handle MIME types with parameters (e.g., "video/mp4; codecs=...")
    const baseType = mimeType.split(';')[0]?.trim();

    return (baseType && mimeToExt[baseType]) || mimeToExt[mimeType] || '.bin';
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
}

// Singleton instance
let instance: BrowserDownloadService | null = null;

export function getBrowserDownloadService(): BrowserDownloadService {
  if (!instance) {
    instance = new BrowserDownloadService();
  }
  return instance;
}
