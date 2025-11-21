/**
 * Test fixtures - mock data for testing
 */

export const mockPerformers = [
  {
    id: 'performer-1',
    name: 'Jane Doe',
    disambiguation: 'Performer',
    aliases: ['JD'],
    image_path: 'https://via.placeholder.com/150',
  },
  {
    id: 'performer-2',
    name: 'John Smith',
    disambiguation: null,
    aliases: [],
    image_path: 'https://via.placeholder.com/150',
  },
  {
    id: 'performer-3',
    name: 'Sarah Connor',
    disambiguation: 'T2',
    aliases: ['SC'],
    image_path: 'https://via.placeholder.com/150',
  },
];

export const mockTags = [
  {
    id: 'tag-1',
    name: 'Amateur',
    description: 'Amateur content',
    aliases: [],
  },
  {
    id: 'tag-2',
    name: 'Professional',
    description: 'Professional production',
    aliases: ['Pro'],
  },
  {
    id: 'tag-3',
    name: 'Outdoor',
    description: 'Outdoor scenes',
    aliases: [],
  },
  {
    id: 'tag-4',
    name: 'Indoor',
    description: 'Indoor scenes',
    aliases: [],
  },
];

export const mockStudios = [
  {
    id: 'studio-1',
    name: 'Test Studio A',
    url: 'https://studioa.example.com',
    image_path: 'https://via.placeholder.com/200',
    aliases: ['TSA'],
  },
  {
    id: 'studio-2',
    name: 'Test Studio B',
    url: 'https://studiob.example.com',
    image_path: 'https://via.placeholder.com/200',
    aliases: [],
  },
];

export const mockScenes = [
  {
    id: 'scene-1',
    title: 'Test Scene 1',
    details: 'This is a test scene',
    url: 'https://example.com/scene1',
    date: '2025-01-01',
    rating100: 80,
    organized: true,
    created_at: '2025-01-01T00:00:00Z',
    updated_at: '2025-01-01T00:00:00Z',
    files: [],
    paths: {},
    performers: [mockPerformers[0]],
    tags: [mockTags[0]],
    studio: mockStudios[0],
  },
];

export const mockImages = [
  {
    id: 'image-1',
    title: 'Test Image 1',
    rating100: 75,
    organized: true,
    created_at: '2025-01-01T00:00:00Z',
    updated_at: '2025-01-01T00:00:00Z',
    files: [],
    paths: {},
    performers: [mockPerformers[1]],
    tags: [mockTags[1]],
    studio: mockStudios[1],
  },
];

// Sample URLs for testing
export const mockDownloadUrls = [
  'https://example.com/video1.mp4',
  'https://example.com/video2.mp4',
  'https://example.com/image1.jpg',
  'https://example.com/image2.png',
];

// Mock scraped metadata
export const mockScrapedMetadata = {
  'https://example.com/video1.mp4': {
    title: 'Sample Video 1',
    description: 'This is a sample video for testing',
    date: '2025-01-15',
    url: 'https://example.com/video1.mp4',
    performers: ['Jane Doe', 'John Smith'],
    tags: ['Amateur', 'Outdoor'],
    studio: 'Test Studio A',
    thumbnailUrl: 'https://via.placeholder.com/640x360',
    duration: 600,
    contentType: 'video' as const,
  },
  'https://example.com/video2.mp4': {
    title: 'Sample Video 2',
    description: 'Another sample video',
    date: '2025-01-16',
    url: 'https://example.com/video2.mp4',
    performers: ['Sarah Connor'],
    tags: ['Professional', 'Indoor'],
    studio: 'Test Studio B',
    thumbnailUrl: 'https://via.placeholder.com/640x360',
    duration: 1200,
    contentType: 'video' as const,
  },
  'https://example.com/image1.jpg': {
    title: 'Sample Image 1',
    description: 'A sample image',
    date: '2025-01-17',
    url: 'https://example.com/image1.jpg',
    performers: ['Jane Doe'],
    tags: ['Amateur'],
    studio: 'Test Studio A',
    thumbnailUrl: 'https://via.placeholder.com/800x600',
    contentType: 'image' as const,
  },
  'https://example.com/image2.png': {
    title: 'Sample Image 2',
    description: 'Another sample image',
    date: '2025-01-18',
    url: 'https://example.com/image2.png',
    performers: ['John Smith', 'Sarah Connor'],
    tags: ['Professional'],
    studio: 'Test Studio B',
    thumbnailUrl: 'https://via.placeholder.com/800x600',
    contentType: 'image' as const,
  },
};
