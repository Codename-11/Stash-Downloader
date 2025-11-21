/**
 * Test utility functions
 */

import { getMockData, setMockData } from '../mocks/mockPluginApi';

/**
 * Reset mock data to initial state
 */
export function resetMockData() {
  setMockData({
    performers: [],
    tags: [],
    studios: [],
    scenes: [],
    images: [],
  });
}

/**
 * Wait for async operations
 */
export function wait(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

/**
 * Generate random test URL
 */
export function generateTestUrl(type: 'video' | 'image' = 'video'): string {
  const id = Math.random().toString(36).substring(7);
  const ext = type === 'video' ? 'mp4' : 'jpg';
  return `https://example.com/test-${id}.${ext}`;
}

/**
 * Create test performer
 */
export function createTestPerformer(name: string) {
  const performer = {
    id: `test-performer-${Date.now()}`,
    name,
    disambiguation: null,
    aliases: [],
    image_path: 'https://via.placeholder.com/150',
  };

  const data = getMockData();
  setMockData({
    ...data,
    performers: [...data.performers, performer],
  });

  return performer;
}

/**
 * Create test tag
 */
export function createTestTag(name: string) {
  const tag = {
    id: `test-tag-${Date.now()}`,
    name,
    description: `Test tag: ${name}`,
    aliases: [],
  };

  const data = getMockData();
  setMockData({
    ...data,
    tags: [...data.tags, tag],
  });

  return tag;
}

/**
 * Create test studio
 */
export function createTestStudio(name: string) {
  const studio = {
    id: `test-studio-${Date.now()}`,
    name,
    url: `https://${name.toLowerCase().replace(/\s/g, '')}.example.com`,
    image_path: 'https://via.placeholder.com/200',
    aliases: [],
  };

  const data = getMockData();
  setMockData({
    ...data,
    studios: [...data.studios, studio],
  });

  return studio;
}

/**
 * Log current mock data state
 */
export function logMockDataState() {
  const data = getMockData();
  console.group('Mock Data State');
  console.log('Performers:', data.performers.length, data.performers);
  console.log('Tags:', data.tags.length, data.tags);
  console.log('Studios:', data.studios.length, data.studios);
  console.log('Scenes:', data.scenes.length, data.scenes);
  console.log('Images:', data.images.length, data.images);
  console.groupEnd();
}

/**
 * Simulate clipboard write (for testing batch import)
 */
export async function setClipboard(text: string) {
  if (navigator.clipboard && navigator.clipboard.writeText) {
    await navigator.clipboard.writeText(text);
    console.log('[Test] Clipboard set:', text);
  } else {
    console.warn('[Test] Clipboard API not available');
  }
}

/**
 * Helper to test batch import URLs
 */
export function getBatchImportTestUrls(): string {
  return `https://example.com/video1.mp4
https://example.com/video2.mp4
https://example.com/image1.jpg
https://example.com/image2.png`;
}
