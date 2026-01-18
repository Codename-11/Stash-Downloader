/**
 * useRedditMetadataScan - Hook to scan files for embedded Reddit metadata
 * 
 * Checks if files have Reddit metadata embedded by redditdownloader or
 * stash-downloader, and extracts performer/studio/tag information.
 */

import { useState, useCallback } from 'react';
import { stashService } from '@/services/StashService';
import { getExifReaderService } from '@/services';

export interface RedditMetadataMatch {
  performer: string | null;  // u/username
  studio: string | null;     // r/subreddit
  tags: string[];            // Reddit, r/subreddit, subreddit
  title: string | null;
  url: string | null;
}

interface ScanResult {
  found: boolean;
  metadata?: RedditMetadataMatch;
  error?: string;
}

export function useRedditMetadataScan() {
  const [scanning, setScanning] = useState(false);
  const exifReader = getExifReaderService();

  /**
   * Scan a scene file for embedded Reddit metadata
   */
  const scanScene = useCallback(async (sceneId: string): Promise<ScanResult> => {
    setScanning(true);
    console.log(`[useRedditMetadataScan] Scanning scene ${sceneId}...`);
    
    try {
      // Get scene details to find file path
      const scene = await stashService.findScene(sceneId);
      console.log(`[useRedditMetadataScan] Scene found:`, scene);
      
      if (!scene?.files || scene.files.length === 0) {
        console.warn(`[useRedditMetadataScan] No files found for scene ${sceneId}`);
        return { found: false, error: 'No files found for scene' };
      }

      // Check first file (primary)
      const filePath = scene.files[0]?.path;
      console.log(`[useRedditMetadataScan] Checking file: ${filePath}`);
      if (!filePath) {
        console.warn(`[useRedditMetadataScan] No file path found`);
        return { found: false, error: 'No file path found' };
      }

      // Check if file type supports metadata
      if (!exifReader.canReadMetadata(filePath)) {
        return { found: false };
      }

      // Try to read metadata via stash-downloader plugin
      // This requires the stash-downloader plugin to be installed
      try {
        const result = await stashService.runPluginTask('stash-downloader', {
          mode: 'check',
          filepath: filePath,
        });

        const output = result?.output as { success?: boolean; has_metadata?: boolean; metadata?: Record<string, unknown> } | undefined;
        
        if (!output?.success || !output?.has_metadata) {
          return { found: false };
        }

        // Parse the metadata
        const redditMeta = exifReader.parseMetadata(output.metadata || {});
        
        if (!redditMeta.author && !redditMeta.subreddit) {
          return { found: false };
        }

        // Convert to match format
        const match: RedditMetadataMatch = {
          performer: exifReader.getPerformerName(redditMeta),
          studio: exifReader.getStudioName(redditMeta),
          tags: exifReader.getTags(redditMeta),
          title: redditMeta.title || null,
          url: redditMeta.url || null,
        };

        return { found: true, metadata: match };
      } catch (error) {
        // stash-downloader plugin not available or error reading metadata
        console.debug('Reddit metadata scan failed:', error);
        return { found: false, error: 'stash-downloader plugin not available' };
      }
    } catch (error) {
      console.error('Error scanning scene for Reddit metadata:', error);
      return { found: false, error: String(error) };
    } finally {
      setScanning(false);
    }
  }, [exifReader]);

  /**
   * Scan a gallery for embedded Reddit metadata
   */
  const scanGallery = useCallback(async (galleryId: string): Promise<ScanResult> => {
    setScanning(true);
    console.log(`[useRedditMetadataScan] Scanning gallery ${galleryId}...`);
    
    try {
      // Get gallery details
      const gallery = await stashService.findGallery(galleryId);
      console.log(`[useRedditMetadataScan] Gallery found:`, gallery);
      
      if (!gallery?.files || gallery.files.length === 0) {
        console.warn(`[useRedditMetadataScan] No files found for gallery ${galleryId}`);
        return { found: false, error: 'No files found for gallery' };
      }

      // Check first file
      const filePath = gallery.files[0]?.path;
      console.log(`[useRedditMetadataScan] Checking file: ${filePath}`);
      if (!filePath) {
        console.warn(`[useRedditMetadataScan] No file path found`);
        return { found: false, error: 'No file path found' };
      }

      // Check if file type supports metadata
      if (!exifReader.canReadMetadata(filePath)) {
        return { found: false };
      }

      // Try to read metadata via stash-downloader plugin
      try {
        const result = await stashService.runPluginTask('stash-downloader', {
          mode: 'check',
          filepath: filePath,
        });

        const output = result?.output as { success?: boolean; has_metadata?: boolean; metadata?: Record<string, unknown> } | undefined;
        
        if (!output?.success || !output?.has_metadata) {
          return { found: false };
        }

        // Parse the metadata
        const redditMeta = exifReader.parseMetadata(output.metadata || {});
        
        if (!redditMeta.author && !redditMeta.subreddit) {
          return { found: false };
        }

        // Convert to match format
        const match: RedditMetadataMatch = {
          performer: exifReader.getPerformerName(redditMeta),
          studio: exifReader.getStudioName(redditMeta),
          tags: exifReader.getTags(redditMeta),
          title: redditMeta.title || null,
          url: redditMeta.url || null,
        };

        return { found: true, metadata: match };
      } catch (error) {
        // stash-downloader plugin not available or error reading metadata
        console.debug('Reddit metadata scan failed:', error);
        return { found: false, error: 'stash-downloader plugin not available' };
      }
    } catch (error) {
      console.error('Error scanning gallery for Reddit metadata:', error);
      return { found: false, error: String(error) };
    } finally {
      setScanning(false);
    }
  }, [exifReader]);

  return {
    scanning,
    scanScene,
    scanGallery,
  };
}
