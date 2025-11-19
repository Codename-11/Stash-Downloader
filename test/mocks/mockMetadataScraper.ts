/**
 * Mock Metadata Scraper for testing
 * Returns mock metadata for known test URLs
 */

import type { IMetadataScraper, IScrapedMetadata } from '@/types';
import { mockScrapedMetadata } from '../fixtures/mockData';

export class MockMetadataScraper implements IMetadataScraper {
  name = 'Mock Scraper';
  supportedDomains = ['example.com', 'test.com'];

  canHandle(url: string): boolean {
    return url.includes('example.com') || url.includes('test.com');
  }

  async scrape(url: string): Promise<IScrapedMetadata> {
    console.log('[Mock Scraper] Scraping:', url);

    // Simulate network delay
    await new Promise((resolve) => setTimeout(resolve, 500));

    // Return mock data if we have it
    if (url in mockScrapedMetadata) {
      return mockScrapedMetadata[url as keyof typeof mockScrapedMetadata];
    }

    // Otherwise return generic metadata
    const urlObj = new URL(url);
    const filename = urlObj.pathname.split('/').pop() || '';
    const ext = filename.split('.').pop()?.toLowerCase() || '';

    const videoExtensions = ['mp4', 'mkv', 'avi', 'mov', 'wmv', 'flv', 'webm', 'm4v'];
    const contentType = videoExtensions.includes(ext) ? 'video' : 'image';

    return {
      url,
      title: filename.replace(/\.[^.]+$/, '').replace(/[-_]/g, ' '),
      description: `Mock description for ${filename}`,
      date: new Date().toISOString().split('T')[0],
      performers: ['Test Performer'],
      tags: ['Test Tag'],
      studio: 'Test Studio',
      thumbnailUrl: 'https://via.placeholder.com/640x360',
      contentType: contentType as any,
    };
  }
}
