/**
 * GenericScraper - Basic metadata scraper
 * This is a placeholder that attempts basic metadata extraction
 * Can be extended with site-specific scrapers
 */

import type { IMetadataScraper, IScrapedMetadata, ContentType } from '@/types';
import { extractDomain } from '@/utils';

export class GenericScraper implements IMetadataScraper {
  name = 'Generic';
  supportedDomains = ['*']; // Fallback for all domains

  canHandle(url: string): boolean {
    return true; // Generic scraper handles everything as fallback
  }

  async scrape(url: string): Promise<IScrapedMetadata> {
    // Basic metadata with URL
    const metadata: IScrapedMetadata = {
      url,
      contentType: await this.detectContentType(url),
    };

    // Try to extract title from URL
    try {
      const urlObj = new URL(url);
      const pathname = urlObj.pathname;
      const filename = pathname.split('/').pop() || '';
      const titleWithoutExt = filename.replace(/\.[^.]+$/, '');
      metadata.title = decodeURIComponent(titleWithoutExt).replace(/[-_]/g, ' ');
    } catch {
      metadata.title = 'Downloaded Content';
    }

    return metadata;
  }

  private async detectContentType(url: string): Promise<ContentType> {
    const extension = url.split('.').pop()?.toLowerCase();

    const videoExtensions = ['mp4', 'mkv', 'avi', 'mov', 'wmv', 'flv', 'webm', 'm4v'];
    const imageExtensions = ['jpg', 'jpeg', 'png', 'gif', 'webp', 'bmp'];

    if (extension && videoExtensions.includes(extension)) {
      return 'video' as ContentType;
    } else if (extension && imageExtensions.includes(extension)) {
      return 'image' as ContentType;
    }

    // Default to video
    return 'video' as ContentType;
  }
}
